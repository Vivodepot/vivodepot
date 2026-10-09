'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   tools/lib/schluesselbund.js — der macOS-Schlüsselbund als Eingabequelle,
   EIN Ort statt mehrerer Kopien (Nachtrag, 07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Entstanden aus dem Herausgeber-Onboarding-Dienst (erster Schlüsselbund-
   Zugriff dieses Repos), hierher gezogen, weil tools/basistemplate-zeremonie-
   automat.js denselben Zugriff für ZWEI Geheimnisse braucht (Passphrase UND
   Schlüsseldatei-Pfad) — kein zweiter execFileSync('security', …)-Aufruf,
   keine zweite argv-Sperre.

   `schluesselbundLesen(service, account)` liest EINEN Wert (Passphrase, Pfad,
   oder jeden anderen kurzen String) über `security find-generic-password …
   -w` — execFileSync, nie eine Shell, service/account laufen nie durch eine
   Shell-Interpretation. Gibt `null` zurück (kein Wurf), wenn `security` fehlt
   (kein macOS) oder kein Eintrag gefunden wird — das ist kein Fehlerfall,
   der Aufrufer entscheidet über den Rückfall (stdin, ein weiterer
   Schlüsselbund-Eintrag, oder ein klarer Abbruch mit Anleitung).

   `pruefeKeinePassphraseInArgv(argv)` — aktive Sperre, kein unterlassener
   Pfad: erkennt ein `--passphrase`-Argument in jeder Schreibweise (mit/ohne
   Wert, ein/zwei Bindestriche, Groß-/Kleinschreibung). Eine Passphrase geht
   NIE über argv oder Umgebung (über `ps` für jeden Prozess sichtbar) — nur
   über stdin oder diesen Schlüsselbund-Weg.

   NACHTRAG (20.09.2026, „Zeremonie für die Rezepte"): dieselbe
   Vorrang-Regel wie im Automaten der Basistemplate-Zeremonie
   (`keyDateiAusArgvOderSchluesselbund`, dort noch lokal, nie exportiert) jetzt
   HIER als reine, injizierbare Funktion — `wertAusArgvOderSchluesselbund` —
   damit ein zweites Werkzeug sie benutzt statt nachzubauen. Vorrang IMMER:
   Argument > Schlüsselbund > (kein `trocken`) nichts. Ein ausdrücklich
   übergebenes Argument gewinnt NIE gegen den Schlüsselbund, unabhängig davon,
   ob dort ein Eintrag vorläge — bei Schlüsselmaterial wiegt die falsche
   Richtung doppelt.

   DIE AUSGABESTELLE — EIN SCHLÜSSEL, ZWEI WERKZEUGE (20.09.2026): der
   geschützte Ausgabe-Schlüssel (.vdkey) und sein Ausgabestellen-Zertifikat
   sind im Rezepte-Signierer UND in `tools/modul-erzeugen.js` (dort
   `--ausgabe-vdkey`/`--ausstellerzertifikat`) DIESELBEN — wortgleiche
   Kopfkommentare in beiden Werkzeugen bestätigen das. Darum EIN Satz
   Schlüsselbund-Namen hier, nicht in jedem Werkzeug neu benannt: wer signiert, legt
   die drei Einträge EINMAL an, beide Werkzeuge finden sie.

   DAS KONTO IST EIN WERT, KEINE KONSTANTE (Produktentscheidung, 20.09.2026, zur offenen
   Frage „eine zweite Möglichkeit für Vertretungen oder Mitarbeiter"): ob es
   künftig mehr als ein Konto gibt, ist eine offene Produktfrage — hier NICHT
   entschieden, NICHT gebaut (kein Vertretungsweg, keine Auswahl). Nur:
   `AUSGABESTELLE_SCHLUESSELBUND_KONTO` steht an EINER Stelle, per
   Umgebungsvariable überschreibbar, statt an drei Aufrufstellen als
   Literal `'ausgabestelle'` wiederholt — eine spätere zweite Kennung bräuchte
   dann keine Änderung an drei Stellen.

   NACHTRAG (20.09.2026, „Einrichtungslauf statt drei security-Zeilen"):
   `schluesselbundSchreiben(service, account, wert)` — das Gegenstück zu
   `schluesselbundLesen`, damit der Einrichtungslauf der Rezepte-Zeremonie die
   drei Ausgabestelle-Einträge UND die zwei HiDrive-Einträge SELBST anlegt,
   statt der Person am Rechner drei `security add-generic-password`-Zeilen mit Platzhaltern
   zum Ausfüllen zu geben. `-U` macht wiederholte Einrichtungsläufe
   idempotent (sonst bricht der zweite Lauf mit „already exists" ab).

   NACHTRAG (20.09.2026, echter Befund im echten Einsatz): `security … -w` gibt
   einen Wert als REINE HEX-KETTE zurück (kein `0x`-Präfix), sobald er ein
   Byte ≥ 0x80 enthält — GEMESSEN an einem echten Schlüsseldatei-Pfad, der ein
   kombinierendes Diakritikum trägt (NFD, Byte-Folge `41 cc 88` statt eines
   vorkomponierten Ä). `security` prüft offenbar jedes BYTE einzeln auf
   Druckbarkeit, nicht den dekodierten Codepunkt — jede UTF-8-Mehrbyte-Folge
   enthält Bytes ≥ 0x80 und kippt die Ausgabe darum in Hex, auch wenn der Wert
   selbst gültiges, lesbares UTF-8 ist. Ohne Gegenmaßnahme nimmt der Aufrufer
   die Hex-Kette als Pfad, `fs` wirft `ENAMETOOLONG`, und jede Fehlermeldung
   macht daraus ein unspezifisches „nicht lesbar" — dreimal derselbe Bug an
   drei Stellen (Passphrase, Pfad, HiDrive-Zugangsdaten), darum hier in der
   Bibliothek behoben, nicht in einem einzelnen Werkzeug.
   `_alsHexKodiertenWertDekodieren` erkennt das eng: NUR wenn (a) die Ausgabe
   eine reine Hex-Paar-Folge ist, UND (b) das Dekodierte gültiges UTF-8 ohne
   Ersatzzeichen ergibt, UND (c) mindestens ein Byte außerhalb des druckbaren
   ASCII-Bereichs enthält — GENAU der Grund, aus dem `security` überhaupt
   hex-kodiert hätte. Enthielte das Dekodierte nur druckbares ASCII, hätte
   `security` es literal ausgegeben, und ein Treffer wäre kein Hex-Fund,
   sondern zufällig ein echter Wert aus lauter Hex-Ziffern (z. B. eine
   Passphrase „cafe1234") — WÜRDE dann NICHT dekodiert.
   ════════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { menschNachweis } = require('./live-sperre.js');
// Der Ausführer des `security`-Aufrufs — Vorgabe für den optionalen Parameter unten, damit eine Probe ihn ersetzen kann,
// ohne `security` je echt zu starten. Der Aufruf selbst steht unverändert.
const STANDARD_AUSFUEHRER = execFileSync;

const ARGV_PASSPHRASE_MUSTER = /^--?passphrase(=.*)?$/i;
function pruefeKeinePassphraseInArgv(argv) {
  return (argv || []).some((a) => ARGV_PASSPHRASE_MUSTER.test(String(a)));
}

// Reine Funktion, s. Kopf-Kommentar (Nachtrag 20.09.2026) — kein execFileSync, darum ohne macOS
// prüfbar. Exportiert für den Rot-Beweis; von schluesselbundLesen auf jeden gelesenen Wert
// angewandt.
const HEX_PAAR_MUSTER = /^(?:[0-9a-f]{2})+$/i;
const HEX_MINDESTLAENGE = 8; // 4 Bytes — kürzer läßt sich von einem echten Kurzwert nicht sicher unterscheiden
function _alsHexKodiertenWertDekodieren(roh) {
  if (!HEX_PAAR_MUSTER.test(roh) || roh.length < HEX_MINDESTLAENGE) return null;
  const bytes = Buffer.from(roh, 'hex');
  const dekodiert = bytes.toString('utf8');
  if (dekodiert.includes('�')) return null; // keine gültige UTF-8-Folge
  const hatUnDruckbares = [...bytes].some((b) => b < 0x20 || b > 0x7e);
  if (!hatUnDruckbares) return null; // rein druckbares ASCII — security hätte es literal ausgegeben
  return dekodiert;
}

// FAIL-CLOSED (07.10.2026, Befund AGENTENSPERRE-FAIL-OPEN): offen nur mit dem Menschen-Nachweis aus tools/lib/live-sperre.js —
// ein eigenes Terminal (stdin und stdout TTY) und dort ein „ja“ oder VD_LIVE_MENSCH=1. Ohne Terminal (jede Agentensitzung, jeder
// Hintergrundlauf) und in jedem Testprozess samt seinen Kindern (VD_SCHLUESSELBUND_GESPERRT, gesetzt von
// tests/hook-sperre-testumgebung.js) gesperrt: dort wird der Leser injiziert, nie der echte Schlüsselbund befragt (23.09.2026).
// Bis 07.10.2026 hing die Sperre an einer Umgebungsvariable des Sitzungswerkzeugs; fehlte sie, war sie offen.
// Der Nachweis greift VOR jedem `security`-Aufruf und schreibt eine Zeile Spur ohne Werte (s. live-sperre.js).
function _schluesselbundGesperrt(env = process.env, terminal, logDatei) {
  const werkzeug = 'schluesselbund:' + (process.argv[1] ? path.basename(process.argv[1]) : '-');
  const grund = menschNachweis(env, terminal, { werkzeug, logDatei });
  return grund ? 'ohne Menschen-Nachweis (' + grund + ')' : null;
}
// Optionen nur für Proben: { execFileSync, env, terminal, logDatei } — Vorgaben sind der echte Aufruf, process.env und das echte Terminal.
function schluesselbundLesen(service, account, { execFileSync = STANDARD_AUSFUEHRER, env, terminal, logDatei } = {}) {
  if (_schluesselbundGesperrt(env, terminal, logDatei)) return null; // wie „kein Eintrag": der Aufrufer fällt zurück, `security` wird nie gestartet
  if (process.platform !== 'darwin') return null;
  try {
    const roh = execFileSync('security', ['find-generic-password', '-s', service, '-a', account, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const wert = roh.replace(/\r?\n$/, '');
    if (!wert) return null;
    const hexDekodiert = _alsHexKodiertenWertDekodieren(wert);
    return hexDekodiert !== null ? hexDekodiert : wert;
  } catch (e) {
    return null; // kein Eintrag, oder Schlüsselbund gesperrt — der Aufrufer entscheidet den Rückfall.
  }
}

// Welcher Wert gilt, und woher — REINE Funktion (kein Schlüsselbund-Zugriff außer über die
// injizierte `schluesselbundLesenFn`), s. Kopf-Kommentar. `flagName` z. B. '--ausgabe-vdkey'.
function wertAusArgvOderSchluesselbund(argv, flagName, { trocken = false, keinSchluesselbund = false, schluesselbundLesenFn } = {}) {
  const idx = (argv || []).indexOf(flagName);
  const ausArgv = idx >= 0 ? argv[idx + 1] : null;
  if (ausArgv) return { wert: ausArgv, quelle: 'argv' };
  if (!trocken && !keinSchluesselbund && schluesselbundLesenFn) {
    const ausSchluesselbund = schluesselbundLesenFn();
    if (ausSchluesselbund) return { wert: ausSchluesselbund, quelle: 'schluesselbund' };
  }
  return { wert: null, quelle: null };
}

// Schreibt EINEN Eintrag (20.09.2026, „Einrichtungslauf statt drei security-Zeilen" — wer
// einrichtet, soll nichts tippen/ersetzen, das Werkzeug legt die Einträge selbst an).
// `-U` (Update) macht wiederholte Läufe idempotent — ohne sie bricht ein zweiter Lauf mit
// „already exists" ab. execFileSync, nie eine Shell — dieselbe Auflage wie beim Lesen. Der Wert
// geht als Argument an den GETRENNTEN `security`-Prozess (die einzige Form, die das Werkzeug
// kennt — es hat kein stdin-Verfahren für `-w`), nie an eine Shell, nie in dieses Node-Prozess-
// argv, nie in eine von diesem Werkzeug selbst geschriebene Log-Zeile.
function schluesselbundSchreiben(service, account, wert, { execFileSync = STANDARD_AUSFUEHRER, env, terminal, logDatei } = {}) {
  const gesperrt = _schluesselbundGesperrt(env, terminal, logDatei);
  if (gesperrt) throw new Error('Schlüsselbund gesperrt ' + gesperrt + ' — kein Eintrag wird geschrieben.');
  if (process.platform !== 'darwin') throw new Error('Der Schlüsselbund ist nur unter macOS verfügbar.');
  execFileSync('security', ['add-generic-password', '-s', service, '-a', account, '-w', wert, '-U'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
}

// Die Ausgabestelle — EIN Schlüssel für den Rezepte-Signierer UND tools/modul-erzeugen.js
// (s. Kopf-Kommentar). Jeder Name per Umgebungsvariable überschreibbar, derselbe Vorgabewert wie
// bisher (kein bestehender Lauf ändert sich, solange niemand die Variable setzt).
const AUSGABESTELLE_SCHLUESSELBUND_KONTO = process.env.AUSGABESTELLE_SCHLUESSELBUND_KONTO || 'ausgabestelle';
const AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE = process.env.AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE || 'vivodepot-ausgabestelle-vdkey';
const AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE = process.env.AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE || 'vivodepot-ausgabestelle-zertifikat';
const AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE = process.env.AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE || 'vivodepot-ausgabestelle-passphrase';

// Die Eintragsnamen der Ablage-Zugangsdaten stehen in einer eigenen Datei, die nur die Werkzeuge des Bauwegs laden;
// kein öffentliches Werkzeug braucht sie.

module.exports = {
  schluesselbundLesen, schluesselbundSchreiben, _schluesselbundGesperrt, pruefeKeinePassphraseInArgv, wertAusArgvOderSchluesselbund,
  _alsHexKodiertenWertDekodieren,
  AUSGABESTELLE_SCHLUESSELBUND_KONTO, AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE,
  AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE,
};
