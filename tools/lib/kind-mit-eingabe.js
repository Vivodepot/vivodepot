'use strict';
/* kind-mit-eingabe.js — ein Kindprozess mit Eingabe, der nicht auf stdin hängen bleibt.
   Über eine Pipe kam die Eingabe in einzelnen Läufen nie mit EOF an, der Prozess stand ohne Zeitgrenze. Darum: Die Eingabe liegt in
   einer Datei und ist der stdin des Kindes. Jeder Aufruf hat eine Zeitgrenze und endet dort mit SIGKILL.

   Ein Abbruch (Zeitgrenze, Signal, Startfehler) ist nie ein Ergebnis: Der Aufruf wirft, mit `werfen: false` kommt `status: null` und der
   Grund in `stderr` zurück. `werfenBeiFehler: true` wirft auch bei einem Ausgang ungleich 0, wie execFileSync.
   Probe: tests/kind-mit-eingabe.test.js. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VORGABE_ZEITGRENZE_MS = 5 * 60 * 1000;
const LANGE_ZEITGRENZE_MS = 30 * 60 * 1000;

function kindMitEingabe(befehl, args, opt = {}) {
  const { eingabe, zeitgrenzeMs = VORGABE_ZEITGRENZE_MS, werfen = true, werfenBeiFehler = false, ausgabe = 'pipe', ...rest } = opt;
  const name = befehl + ' ' + args.slice(0, 2).join(' ');
  let ordner = null;
  let fd = null;
  if (eingabe !== undefined && eingabe !== null) {
    ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kind-eingabe-'));
    const datei = path.join(ordner, 'eingabe');
    fs.writeFileSync(datei, eingabe, { mode: 0o600 });
    fd = fs.openSync(datei, 'r');
  }
  let r;
  try {
    r = spawnSync(befehl, args, { ...rest, stdio: [fd === null ? 'ignore' : fd, ausgabe, ausgabe], timeout: zeitgrenzeMs, killSignal: 'SIGKILL' });
  } finally {
    if (fd !== null) fs.closeSync(fd);
    if (ordner) fs.rmSync(ordner, { recursive: true, force: true });
  }
  if (r.error || r.signal) {
    const grund = r.error && r.error.code === 'ETIMEDOUT' ? 'Zeitgrenze ' + zeitgrenzeMs + ' ms überschritten' : (r.error ? r.error.message : 'Signal ' + r.signal);
    const text = name + ' abgebrochen (' + grund + ') — kein Ergebnis';
    if (werfen) throw new Error(text);
    return { ...r, status: null, stderr: text, abgebrochen: grund };
  }
  if (werfenBeiFehler && r.status !== 0) throw new Error(name + ': Ausgang ' + r.status + ': ' + String(r.stderr || '').trim());
  return r;
}

module.exports = { kindMitEingabe, VORGABE_ZEITGRENZE_MS, LANGE_ZEITGRENZE_MS };
