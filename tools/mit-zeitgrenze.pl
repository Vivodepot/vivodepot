#!/usr/bin/perl
# Führt einen Befehl mit Zeitgrenze aus und beendet bei Ablauf die GANZE PROZESSGRUPPE.
#
# WARUM ES DIESE DATEI GIBT (U2-ADR-273, 04.09.2026):
# Die Hooks riefen bis hierher `perl -e 'alarm N; exec @ARGV or exit 127'`. Das ist an einer
# Stelle falsch, die man nicht sieht: `alarm()` überlebt `exec` (POSIX räumt einen anstehenden
# Wecker bei `exec` nicht ab — nur `fork` löscht ihn im Kind). Der Wecker feuerte also IM
# ausgeführten Befehl, und dessen Vorgabe-Verhalten bei SIGALRM ist „beenden".
#
# Damit starb der ELTERNPROZESS — aber nicht seine Kinder. `npm test` startet rund vierzehn
# `node --test`-Arbeiter; das Beenden des Elternprozesses nimmt die Prozeßgruppe nicht mit. Sie
# liefen verwaist weiter. In der Nacht zum 04.09.2026 hinterließ so jeder gescheiterte
# Commit-Versuch einen vollständigen Testlauf: 172 verwaiste Prozesse, Swap zu 87 % belegt, acht
# fertig gebaute Zweige kamen nicht durch — nicht wegen eines Fehlers im Code, sondern weil der
# Wächter den Zustand erzeugte, gegen den er schützen sollte.
#
# `timeout` gäbe es dafür, aber macOS bringt es nicht mit (gemessen: Exit 127). Deshalb weiter
# perl — nur richtig herum: der Wecker bleibt im ELTERNTEIL, das Kind bekommt eine eigene
# Prozeßgruppe, und bei Ablauf wird die GRUPPE beendet, erst sanft, dann hart.
#
# DER VERTRAG, den die Hooks lesen (hooks/pre-commit prüft `_rc = 142`):
#   Zeitgrenze erreicht  → Exit 142     (128 + 14, wie ein SIGALRM-Tod; die Hooks verlassen sich
#                                        darauf, hier NICHT wegoptimieren)
#   Befehl nicht startbar → Exit 127
#   sonst                 → Exit des Befehls (bzw. 128 + Signalnummer)
#
# Aufruf:  perl tools/mit-zeitgrenze.pl <sekunden> -- <befehl> [argumente…]
#
# L3-NACHTRAG (19.09.2026): dieselbe Gruppen-Toetung greift jetzt auch, wenn DIESER
# Prozess selbst ein externes SIGTERM/SIGINT bekommt (z. B. weil der aufrufende Hook beim
# Abbruch seinerseits die eigene PID hier gezielt beendet, s. hooks/pre-push/pre-commit) — vorher
# reagierte nur der eigene Wecker (SIGALRM) auf einen Ablauf, ein externes Signal beendete NUR
# dieses Perl-Skript und liess das Kind (mitsamt seiner Prozessgruppe) verwaist zurueck. Anlass:
# ein verwaister `npm test` (PPID 1) nach einem abgebrochenen pre-push-Hook, 19.09.2026.

use strict;
use warnings;
use POSIX ();

my $grenze = shift @ARGV;
defined $grenze && $grenze =~ /^\d+$/
  or die "mit-zeitgrenze: erstes Argument muss die Sekundenzahl sein\n";
shift @ARGV if @ARGV && $ARGV[0] eq '--';
@ARGV or die "mit-zeitgrenze: kein Befehl angegeben\n";

my $kind = fork();
defined $kind or die "mit-zeitgrenze: fork fehlgeschlagen: $!\n";

if ($kind == 0) {
  # Eigene Prozeßgruppe: erst dadurch trifft ein Signal an -PID später ALLE Nachkommen.
  POSIX::setpgid(0, 0);
  exec { $ARGV[0] } @ARGV;
  exit 127;   # exec kam nicht zustande — Befehl nicht startbar
}
# Auch im Elternteil setzen: welcher von beiden zuerst dran ist, hängt am Zufall des
# Zeitscheibens. Schlägt es fehl, weil das Kind schon exec'd hat, ist es bereits gesetzt.
eval { POSIX::setpgid($kind, $kind); 1 };

# DIE GEFÄHRLICHSTE ZEILE DES GANZEN WERKZEUGS: an ein Signal auf -PGID hängt alles, was in
# dieser Gruppe lebt. Wäre die Gruppe falsch bestimmt, nähme sie git mit, das auf den Hook
# wartet — und ein Fehler hier wird nicht rot, er richtet Schaden an. Deshalb wird VOR jedem
# Signal geprüft, dass die Zielgruppe wirklich die des Kindes ist UND nicht die eigene.
# `getpgrp(PID)` ist ein perl-EINGEBAUTER Aufruf. POSIX::getpgid gibt es NICHT — der Versuch
# stirbt mit „getpgid is not a valid POSIX macro" (beim Bau gemessen, 04.09.2026: die erste
# Fassung dieser Härtung brach genau daran und ließ die Kinder am Leben).
my $eigene_gruppe = getpgrp(0);
my $gruppe_sicher = sub {
  my $ziel = eval { getpgrp($kind) };        # 0/undef, wenn das Kind schon weg ist
  return 0 unless defined $ziel && $ziel > 0;
  return 0 if $ziel != $kind;                # Kind sitzt nicht in SEINER eigenen Gruppe
  return 0 if $ziel == $eigene_gruppe;       # niemals die eigene Gruppe
  return 1;
};

my $abgelaufen = 0;
my $extern_beendet = 0;   # 0=kein externes Signal, sonst die Signalnummer (fuer den Exit-Code)

sub gruppe_beenden {
  if ($gruppe_sicher->()) {
    kill('TERM', -$kind);                    # die GRUPPE, nicht den einzelnen Prozeß
    select(undef, undef, undef, 2);          # Gnadenfrist für ein sauberes Ende
    kill('KILL', -$kind) if $gruppe_sicher->();
  } else {
    # Konnte die eigene Gruppe nicht sicher ausgeschlossen werden: NUR den Elternprozeß
    # beenden. Das ist das alte, unvollständige Verhalten — aber es ist harmlos, und
    # Halbheit ist hier besser als ein Signal an die falsche Gruppe.
    kill('TERM', $kind);
    select(undef, undef, undef, 2);
    kill('KILL', $kind);
  }
}

$SIG{ALRM} = sub { $abgelaufen = 1; gruppe_beenden(); };
# TERM/INT von aussen: dieselbe Gruppen-Toetung, dann den eigenen Zustand vermerken, statt
# einfach zu sterben und das Kind zurueckzulassen. `waitpid` unten faengt das reaped-Kind danach
# regulaer ab (durch das Signal unterbrochen, EINTR, dann erneut versucht).
for my $sig (qw(TERM INT)) {
  $SIG{$sig} = sub { $extern_beendet = $sig eq 'TERM' ? 15 : 2; gruppe_beenden(); };
}
alarm($grenze);

# waitpid kann vom Signal unterbrochen werden — dann weiterwarten, nicht aufgeben.
my $weg;
do { $weg = waitpid($kind, 0); } while ($weg == -1 && $!{EINTR});
my $status = $?;
alarm(0);

exit 142 if $abgelaufen;
exit(128 + $extern_beendet) if $extern_beendet;
exit($status >> 8)        if ($status & 127) == 0;
exit(128 + ($status & 127));
