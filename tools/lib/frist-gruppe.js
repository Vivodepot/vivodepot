'use strict';
/* FRIST FÜR DIE GANZE GRUPPE (20.11.2026, Befund VORLAUF-ABBRUCH-HINTERLAESST-WAISEN).

   Der Deckel-Vorlauf am v1071-Kopf lief zweimal in die Zeitgrenze. Der Schrittläufer fuhr ihn mit spawnSync, `timeout` und
   `killSignal: 'SIGKILL'`. Das traf nur den gestarteten Prozess. Der Testläufer darunter lebte weiter, ohne Eltern, und
   belegte die Maschine, während sein TMPDIR schon weggeräumt war. Darum hier drei Teile:

   1. Als Hülle (`node tools/lib/frist-gruppe.js <frist-ms> <gnade-ms> -- <befehl> …`): Der Befehl startet in einer eigenen
      Prozessgruppe. Läuft die Frist ab, bekommt die ganze Gruppe SIGTERM, nach der Gnadenfrist SIGKILL. Auf SIGTERM schreibt
      der Testläufer noch, welche Dateien offen waren. Exit 124 und die Zeile FRIST_ZEILE auf stderr sagen: nach Zeit beendet.
   2. `offeneDateien(text)`: liest aus TAP- oder Spec-Ausgabe die Dateien, die beim Abbruch noch liefen.
   3. `laeuferImBaum(wurzel)`: die Testläufer, die noch auf Dateien dieses Baums laufen. Der Vorlauf startet nicht daneben.

   Proben: [Deckel-Vorlauf·Waise …] und [Zeitgrenze·Gruppe]. */

const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const FRIST_ZEILE = '[frist-gruppe] ZEITGRENZE — die ganze Prozessgruppe wurde beendet';
const FRIST_STATUS = 124;
const GNADE_MS = 10000;

/** Dateien, die beim Abbruch noch liefen. Quelle: die Zeile „Interrupted while running“ des Testläufers (TAP) und die
    Spec-Liste darunter („⚠ name (pfad:zeile:spalte)“). Ergebnis: Pfade ohne Zeile, ohne Doppelte, in der Reihenfolge. */
function offeneDateien(text) {
  const aus = [];
  const nimm = (p) => { const d = String(p).replace(/:\d+:\d+$/, ''); if (d && !aus.includes(d)) aus.push(d); };
  const zeilen = String(text || '').split('\n');
  let inListe = false;
  for (const z of zeilen) {
    const t = /Interrupted while running:\s*(.*?)\s+at\s+(\S+:\d+:\d+)\s*$/.exec(z);
    if (t) { nimm(t[2]); continue; }
    if (/Interrupted while running:\s*$/.test(z)) { inListe = true; continue; }
    if (inListe) {
      const s = /^\s*⚠\s+.*\((\S+:\d+:\d+)\)\s*$/.exec(z);
      if (s) { nimm(s[1]); continue; }
      if (z.trim()) inListe = false;
    }
  }
  return aus;
}

/** Alle Prozesse als { pid, befehl } (ps; auf macOS und Linux gleich). */
function prozesseLesen() {
  const r = spawnSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) return null;
  return String(r.stdout || '').split('\n').map((z) => /^\s*(\d+)\s+(.*)$/.exec(z)).filter(Boolean)
    .map((m) => ({ pid: Number(m[1]), befehl: m[2] }));
}

/** Testläufer auf Dateien unter `wurzel`: ein Befehl mit dem Wort `--test` und einem Argument unter `wurzel`.
    Der eigene Prozess zählt nicht. `null`, wenn die Prozessliste nicht lesbar ist. */
function laeuferImBaum(wurzel, { prozesse = prozesseLesen(), eigen = process.pid } = {}) {
  if (!prozesse) return null;
  const vorn = path.resolve(wurzel) + path.sep;
  return prozesse.filter((p) => {
    if (p.pid === eigen) return false;
    const w = String(p.befehl).split(/\s+/);
    return w.includes('--test') && w.some((a) => a.startsWith(vorn));
  });
}

/** Die Hülle als Befehl für spawnSync. */
function huelle(befehl, args, fristMs, gnadeMs = GNADE_MS) {
  return { befehl: process.execPath, args: [__filename, String(fristMs), String(gnadeMs), '--', befehl, ...args] };
}

function huelleFahren(argv) {
  const trenner = argv.indexOf('--');
  const fristMs = Number(argv[0]);
  const gnadeMs = Number(argv[1]);
  const befehl = argv.slice(trenner + 1);
  if (trenner < 2 || !befehl.length || !(fristMs > 0) || !(gnadeMs >= 0)) {
    process.stderr.write('Aufruf: node tools/lib/frist-gruppe.js <frist-ms> <gnade-ms> -- <befehl> …\n');
    process.exit(2);
  }
  const kind = spawn(befehl[0], befehl.slice(1), { stdio: 'inherit', detached: true });
  const gruppe = (sig) => { try { process.kill(-kind.pid, sig); } catch (_) { /* Gruppe schon leer */ } };
  let abgelaufen = false;
  const uhr = setTimeout(() => {
    abgelaufen = true;
    gruppe('SIGTERM');
    setTimeout(() => gruppe('SIGKILL'), gnadeMs).unref();
  }, fristMs);
  // Wird die Hülle selbst beendet, nimmt sie die Gruppe mit.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => { gruppe('SIGKILL'); process.exit(1); });
  kind.on('error', (e) => { clearTimeout(uhr); process.stderr.write('[frist-gruppe] ' + e.message + '\n'); process.exit(1); });
  kind.on('exit', (code) => {
    clearTimeout(uhr);
    // Ein Enkel, der den Elternprozess überlebt, endet hier mit der Gruppe.
    gruppe('SIGKILL');
    if (abgelaufen) { process.stderr.write('\n' + FRIST_ZEILE + '\n'); process.exit(FRIST_STATUS); }
    process.exit(code == null ? 1 : code);
  });
}

if (require.main === module) huelleFahren(process.argv.slice(2));

module.exports = { offeneDateien, laeuferImBaum, prozesseLesen, huelle, FRIST_ZEILE, FRIST_STATUS, GNADE_MS };
