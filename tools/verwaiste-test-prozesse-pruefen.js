#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Waisen-Wächter für node --test-Prozesse (L3, 19.09.2026, Auftrag).
   Anlass: mehrere verwaiste `node --test`-Läufe (PPID 1) trieben den L2-Push über die
   Lastschranke — einer 11 Stunden alt, einer aus einem abgebrochenen pre-push-Hook, einer beim
   Bau dieses Werkzeugs selbst gefunden (über 37 Stunden alt, PID 3500, s. Bericht
   verwaiste-test-prozesse-zeitgrenze-plan-2026-09-19.md).

   NACH DEM MUSTER VON tools/worktree-belegung-pruefen.js: Prozesse werden an ihrem TATSÄCHLICHEN
   Zustand erkannt (Elternprozess, echte Kommandozeile, echtes Arbeitsverzeichnis über lsof) — nie
   an einem geratenen Namen oder Muster. Ein Fund gilt nur, wenn ALLE drei zutreffen:
     (a) Elternprozess-PID ist 1 (der eigentliche Elter ist weg, der Prozess wurde neu adoptiert),
     (b) die Kommandozeile enthält sowohl "node" als auch "--test",
     (c) das Arbeitsverzeichnis liegt unter einem BEKANNTEN Arbeitsbaum dieses Repos (git worktree
         list) — das schließt node --test-Prozesse völlig fremder Projekte auf derselben
         Maschine aus.

   ANZEIGE ist die Vorgabe (reine Diagnose). BEENDEN verlangt die exakte PID UND --bestaetigt UND
   prüft UNMITTELBAR VOR dem Signal alle drei Merkmale ERNEUT — sonst Abbruch, statt eine
   inzwischen wiederverwendete PID zu treffen. Erst SIGTERM, nach kurzer Frist SIGKILL, wie bei
   tools/mit-zeitgrenze.pl.

   BEENDET WIRD DIE PROZESSGRUPPE, NICHT NUR DIE EINE PID (Fund beim Bau, 19.09.2026): `node --test`
   startet unter --test-isolation=process (die Vorgabe) je Datei einen eigenen Worker-Kindprozess.
   Ein verwaister Orchestrator ist meist Sitzungs-/Gruppenleiter (detached-Spawns rufen setsid()),
   sein Worker teilt dieselbe Gruppe. Wird NUR die Orchestrator-PID beendet, bleibt der Worker als
   NEUER Waise zurück — beim Bau dieses Werkzeugs selbst zweimal beobachtet. Vor jedem Signal wird
   darum wie in tools/mit-zeitgrenze.pl geprüft, dass die Zielgruppe wirklich die des Prozesses ist
   UND nicht die eigene — erst dann `kill(-PID)`, nie ohne diese Prüfung.

   AUFRUF
     node tools/verwaiste-test-prozesse-pruefen.js [--anzeigen] [--aelter-als <minuten>]
     node tools/verwaiste-test-prozesse-pruefen.js --beenden <pid> [--bestaetigt]
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const VORGABE_MINUTEN = 30;

function git(args, cwd) {
  return execFileSync('git', args, { cwd: cwd || REPO, encoding: 'utf8', env: ohneGitUmgebung() }).trim();
}

function realOderResolve(p) {
  try { return fs.realpathSync(p); } catch (_) { return path.resolve(p); }
}

/* lsof gibt den symlink-aufgeloesten (realen) Pfad zurueck (macOS: /tmp -> /private/tmp,
   /var -> /private/var) — die Arbeitsbaum-Liste muss GENAUSO aufgeloest werden, sonst
   verfehlt der Vergleich einen Arbeitsbaum unter einem symlink-Pfad wortwoertlich, obwohl es
   derselbe Ort ist. Gemessen 19.09.2026 beim Bau: eine Wegwerf-Probe unter os.tmpdir() traf
   genau das. */
function bekannteArbeitsbaeume(repo) {
  const roh = git(['worktree', 'list', '--porcelain'], repo);
  const raus = [];
  for (const zeile of roh.split('\n')) if (zeile.startsWith('worktree ')) raus.push(realOderResolve(zeile.slice('worktree '.length)));
  return raus;
}

/* etime-Format von ps: [[TT-]SS:]MM:SS — in Minuten, robust gegen alle drei Formen. */
function etimeInMinuten(etime) {
  const m = etime.trim().match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
  if (!m) return 0;
  const [, tage, stunden, minuten, sekunden] = m;
  return (Number(tage || 0) * 24 * 60) + (Number(stunden || 0) * 60) + Number(minuten) + Number(sekunden) / 60;
}

function alleProzesse() {
  const roh = execFileSync('ps', ['-eo', 'pid,ppid,etime,command'], { encoding: 'utf8' });
  const zeilen = roh.split('\n').slice(1).filter((z) => z.trim());
  return zeilen.map((z) => {
    const m = z.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!m) return null;
    const [, pid, ppid, etime, kommando] = m;
    return { pid: Number(pid), ppid: Number(ppid), etime, minuten: etimeInMinuten(etime), kommando };
  }).filter(Boolean);
}

function cwdVon(pid) {
  try {
    const roh = execFileSync('lsof', ['-a', '-d', 'cwd', '-p', String(pid), '-Fn'], { encoding: 'utf8' });
    const zeile = roh.split('\n').find((z) => z.startsWith('n'));
    return zeile ? zeile.slice(1) : null;
  } catch (_) { return null; }
}

/* Reine Entscheidung, ohne Seiteneffekt — für die Probe. */
function istWaisenTestProzess(p, arbeitsbaeume, cwd) {
  if (p.ppid !== 1) return false;
  if (!/\bnode\b/.test(p.kommando) || !p.kommando.includes('--test')) return false;
  if (cwd === undefined) cwd = cwdVon(p.pid);
  if (!cwd) return false;
  return arbeitsbaeume.some((b) => cwd === b || cwd.startsWith(b + path.sep));
}

function moeglicherKandidat(p) {
  return p.ppid === 1 && /\bnode\b/.test(p.kommando) && p.kommando.includes('--test');
}

function findeWaisen(aelterAlsMinuten, repo) {
  const arbeitsbaeume = bekannteArbeitsbaeume(repo);
  const raus = [];
  // lsof je Kandidat ist teuer (ein eigener Prozessaufruf) — erst die BILLIGE Vorauswahl
  // (PPID, Kommandozeile, direkt aus derselben ps-Zeile) treffen, lsof nur fuer echte Kandidaten.
  for (const p of alleProzesse()) {
    if (p.minuten < aelterAlsMinuten) continue;
    if (!moeglicherKandidat(p)) continue;
    const cwd = cwdVon(p.pid);
    if (istWaisenTestProzess(p, arbeitsbaeume, cwd)) raus.push({ ...p, cwd });
  }
  return raus;
}

function eigenePgid() {
  try { return Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(process.pid)], { encoding: 'utf8' }).trim()); } catch (_) { return -1; }
}

function pgidVon(pid) {
  try { return Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(pid)], { encoding: 'utf8' }).trim()); } catch (_) { return -1; }
}

/* Befund HOCH (20.09.2026): der Rot-Beweis dieser Datei erzeugt einen ECHTEN Waisen
   (echtenWaisenErzeugen unten in der Testdatei) und muss ihn danach restlos wegräumen — auch
   wenn eine Zusicherung dazwischen durchfällt oder der Lauf abbricht. Ein blosses
   `process.kill(pid, 'SIGKILL')` trifft nur den Orchestrator; der Worker-Kindprozess
   (`--test-isolation=process`, Vorgabe) teilt dessen Prozessgruppe und bleibt als NEUER Waise
   zurück — GEMESSEN: elf solcher Waisen sammelten sich an, die älteste 9 Std. 53 Min. alt, und
   verdeckten die eigentliche Waisen-Messung (das Muster, nach dem ihr Taktlauf
   sucht, wurde durch die eigenen Testrückstände unbrauchbar).

   `gruppeSicherBeenden` ist die reine, unbedingte Aufräum-Variante für genau diesen Fall: KEINE
   erneute Prüfung, ob der Prozess noch alle Waisen-Merkmale trägt (das tut `beenden()`, hier
   unpassend — ein `finally`-Aufräumer will beenden, nicht nachfragen), aber dieselbe
   Sicherheitsbedingung wie dort: nur die GRUPPE signalisieren, wenn `pid` wirklich ihr Anführer
   ist (`pgid === pid`) und es nicht die eigene Gruppe des aufrufenden Prozesses ist — sonst nur
   die einzelne PID, nie geraten. */
function gruppeSicherBeenden(pid, signal = 'SIGKILL') {
  if (!Number.isInteger(pid) || pid <= 1) return { ok: false, grund: 'keine gültige PID: ' + pid };
  const gruppe = pgidVon(pid);
  const eigene = eigenePgid();
  const zielGruppe = gruppe === pid && gruppe > 0 && gruppe !== eigene;
  try {
    process.kill(zielGruppe ? -pid : pid, signal);
    return { ok: true, pid, zielGruppe };
  } catch (e) {
    if (e.code === 'ESRCH') return { ok: true, pid, zielGruppe, grund: 'bereits beendet' };
    return { ok: false, grund: signal + ' an ' + pid + ' fehlgeschlagen: ' + e.message };
  }
}

function beenden(pid, aelterAlsMinuten, repo) {
  const arbeitsbaeume = bekannteArbeitsbaeume(repo);
  const alle = alleProzesse();
  const p = alle.find((x) => x.pid === pid);
  if (!p) return { ok: false, grund: 'Prozess ' + pid + ' existiert nicht (mehr) — nichts zu beenden' };
  const cwd = cwdVon(pid);
  if (!istWaisenTestProzess(p, arbeitsbaeume, cwd) || p.minuten < aelterAlsMinuten) {
    return { ok: false, grund: 'Prozess ' + pid + ' erfüllt bei der ERNEUTEN Prüfung nicht mehr alle Merkmale (verwaist, node --test, bekannter Arbeitsbaum, älter als ' + aelterAlsMinuten + ' Minuten) — vermutlich seit dem Anzeigen wiederverwendet oder beendet. Abbruch.' };
  }
  const gruppe = pgidVon(pid);
  const eigene = eigenePgid();
  // Nur die GRUPPE signalisieren, wenn der Prozess wirklich ihr Anführer ist (pgid === pid) UND
  // es nicht die eigene Gruppe dieses Werkzeugs ist — sonst NUR die einzelne PID, nie raten.
  const zielGruppe = gruppe === pid && gruppe > 0 && gruppe !== eigene;
  try { process.kill(zielGruppe ? -pid : pid, 'SIGTERM'); } catch (e) { return { ok: false, grund: 'SIGTERM an ' + pid + ' fehlgeschlagen: ' + e.message }; }
  return { ok: true, pid, phase: 'SIGTERM gesendet an ' + (zielGruppe ? 'die Prozessgruppe' : 'nur die einzelne PID (keine sicher bestimmbare eigene Gruppe)') };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
  const aelterAlsMinuten = Number(arg('aelter-als', String(VORGABE_MINUTEN)));
  const repo = arg('repo', REPO);

  if (argv.includes('--beenden')) {
    const pid = Number(arg('beenden'));
    if (!Number.isInteger(pid) || pid <= 1) { console.error('Aufruf: --beenden <pid> [--bestaetigt]'); process.exitCode = 2; return; }
    if (!argv.includes('--bestaetigt')) {
      console.log('OHNE --bestaetigt wird nichts beendet. Prozess ' + pid + ' — erst mit --anzeigen prüfen, dann mit --bestaetigt wiederholen.');
      return;
    }
    const r = beenden(pid, aelterAlsMinuten, repo);
    if (!r.ok) { console.error(r.grund); process.exitCode = 1; return; }
    console.log('PID ' + r.pid + ': ' + r.phase + '. Nach kurzer Frist von Hand prüfen (ps -p ' + r.pid + '); ein zweiter Aufruf mit --beenden schickt bei Bedarf SIGKILL nach.');
    return;
  }

  const waisen = findeWaisen(aelterAlsMinuten, repo);
  if (!waisen.length) { console.log('Keine verwaisten node --test-Prozesse über ' + aelterAlsMinuten + ' Minuten in bekannten Arbeitsbäumen.'); return; }
  console.log(waisen.length + ' verwaiste(r) node --test-Prozess(e) über ' + aelterAlsMinuten + ' Minuten:');
  for (const p of waisen) {
    console.log('  PID ' + p.pid + '  Laufzeit ' + p.etime + '  ' + p.cwd + '\n    ' + p.kommando.slice(0, 160));
  }
  console.log('\nBeenden je EXAKTER PID, nach Bestätigung: node tools/verwaiste-test-prozesse-pruefen.js --beenden <pid> --bestaetigt');
}

if (require.main === module) main();

module.exports = {
  etimeInMinuten, istWaisenTestProzess, moeglicherKandidat, alleProzesse, cwdVon,
  bekannteArbeitsbaeume, findeWaisen, beenden, gruppeSicherBeenden, pgidVon, eigenePgid,
};
