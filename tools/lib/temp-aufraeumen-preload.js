'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Temp-Aufräumen im Testprozess (per --require; Befund TEMP-RESTE-FUELLEN-DIE-PLATTE, 28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Merkt sich jedes Verzeichnis, das dieser Prozess mit mkdtemp anlegt (fs.mkdtempSync, fs.mkdtemp,
   fs.promises.mkdtemp), und jede Datei oder jedes Verzeichnis, das er mit writeFileSync bzw. mkdirSync
   DIREKT in os.tmpdir() anlegt (ohne mkdtemp — der erste Lauf unter der neuen Wache fand solche Reste in
   mehreren Proben), und räumt beim Prozessende weg. Was schon vorher da war, bleibt unberührt. Eine Probe, die ihr finally vergisst oder
   abbricht, lässt damit nichts mehr liegen — ohne dass jede der Hunderte Proben einzeln nachgezogen
   werden muss. Das eigene finally/after() einer Probe bleibt richtig; dies ist das Netz darunter.

   NUR IM TESTPROZESS: geladen über `node --test --require …` (package.json). Werkzeuge, die ein Test
   als Kindprozess startet, bekommen es nicht — manche geben ihr Verzeichnis bewusst an den Aufrufer
   zurück, und das würde beim Ende des Kindes verschwinden.

   ESM: `import { mkdtempSync } from 'node:fs'` bindet beim Import; syncBuiltinESMExports() gleicht die
   benannten Exporte nach dem Austausch ab, damit auch .mjs-Proben erfasst sind.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');

const angelegt = new Set();
const merken = (p) => { if (typeof p === 'string') angelegt.add(p); return p; };
// Direkt in os.tmpdir() (nicht tiefer): nur was dieser Aufruf NEU anlegt.
const direktImTmp = (p) => {
  if (typeof p !== 'string' && !(p instanceof URL)) return null;
  const voll = path.resolve(String(p instanceof URL ? p.pathname : p));
  return path.dirname(voll) === path.resolve(os.tmpdir()) ? voll : null;
};

if (!fs.mkdtempSync.__vdTempAufraeumen) {
  const sync = fs.mkdtempSync;
  const cb = fs.mkdtemp;
  const prom = fs.promises.mkdtemp;
  fs.mkdtempSync = function mkdtempSync(...a) { return merken(sync.apply(this, a)); };
  fs.mkdtemp = function mkdtemp(...a) {
    const i = a.findIndex((x) => typeof x === 'function');
    if (i >= 0) { const f = a[i]; a[i] = (err, p) => { if (!err) merken(p); f(err, p); }; }
    return cb.apply(this, a);
  };
  fs.promises.mkdtemp = async function mkdtemp(...a) { return merken(await prom.apply(this, a)); };
  const wfs = fs.writeFileSync;
  fs.writeFileSync = function writeFileSync(ziel, ...a) {
    const d = direktImTmp(ziel);
    const neu = d && !fs.existsSync(d);
    const r = wfs.call(this, ziel, ...a);
    if (neu) angelegt.add(d);
    return r;
  };
  const mds = fs.mkdirSync;
  fs.mkdirSync = function mkdirSync(ziel, ...a) {
    // Bei recursive auch den obersten neuen Ordner direkt unter os.tmpdir() erfassen.
    const tmp = path.resolve(os.tmpdir());
    const voll = typeof ziel === 'string' ? path.resolve(ziel) : null;
    let oberster = null;
    if (voll && voll.startsWith(tmp + path.sep)) {
      const erster = path.join(tmp, voll.slice(tmp.length + 1).split(path.sep)[0]);
      if (!fs.existsSync(erster)) oberster = erster;
    }
    const r = mds.call(this, ziel, ...a);
    if (oberster && fs.existsSync(oberster)) angelegt.add(oberster);
    return r;
  };
  fs.mkdtempSync.__vdTempAufraeumen = true;
  syncBuiltinESMExports();

  process.on('exit', () => {
    for (const p of angelegt) { try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) { /* weg oder gesperrt */ } }
  });
}

module.exports = { angelegt };
