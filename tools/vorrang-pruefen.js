#!/usr/bin/env node
'use strict';
require('./lib/schalter-pruefen.js').schalterPruefen(module);   // --help und unbekannte Schalter halten an, bevor etwas läuft
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   vorrang-pruefen.js — ein Zug ohne den fertigen Vorrang-Kopf landet nicht (31.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
   ANLASS: ein Vorrang stand nur in Nachrichten; ein Sammelzug fuhr ohne den Wagen, der Vorrang hatte, und niemand hielt
   ihn auf. Die eine Quelle ist jetzt eine Vorrang-Datei außerhalb des
   Repos; dieses Werkzeug liest sie und prüft den Zugkopf dagegen.
   DATEI: eine Zeile je Vorrang, Spalten mit Tab: seit · rolle · ziel · kopf · stand. Zeilen mit # und leere Zeilen zählen
     nicht. Ein Vorrang ist FERTIG, wenn die Spalte kopf mit einer SHA beginnt (7 bis 40 Hex-Zeichen); sonst ist er offen und
     hält nichts auf. Eine Zeile mit weniger als vier Spalten ist unlesbar und rot: eine Quelle, die nicht lesbar ist, gibt
     keinen Freibrief.
   REGEL: für jeden fertigen Vorrang muss der Kopf ein Vorfahr des Zugkopfs sein (git merge-base --is-ancestor). Sonst rot.
     Kein Schalter und keine Umgebungsvariable hebt das auf; nur das Löschen der Zeile in der Datei.
   Aufruf:  node tools/vorrang-pruefen.js [--datei <pfad>] [--kopf <rev>] [--repo <pfad>]
            ohne --datei: die Beispieldatei im Repo (tests/fixtures/vorrang/vorrang.txt), damit die Suite das Werkzeug fährt.
   Exit 0 grün, 1 rot, 3 ungemessen (Datei fehlt). Probe: die Vorrang-Probe der Suite (mit Rot-Beweis).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const BEISPIEL = path.join(REPO, 'tests', 'fixtures', 'vorrang', 'vorrang.txt');
const AUSGANG_UNGEMESSEN = 3;
const SHA = /^([0-9a-f]{7,40})\b/;

/* Rein: die Zeilen der Datei als { zeile, rolle, ziel, kopf } (kopf null = offen) oder { zeile, unlesbar }. */
function eintraegeLesen(text) {
  const aus = [];
  String(text).split('\n').forEach((roh, i) => {
    const z = roh.replace(/\r$/, '');
    if (!z.trim() || z.trimStart().startsWith('#')) return;
    const sp = z.split('\t');
    if (sp.length < 4) { aus.push({ zeile: i + 1, unlesbar: true, text: z }); return; }
    const m = sp[3].trim().match(SHA);
    aus.push({ zeile: i + 1, rolle: sp[1].trim(), ziel: sp[2].trim(), kopf: m ? m[1] : null });
  });
  return aus;
}

function istVorfahr(repo, vorfahr, kopf) {
  const r = spawnSync('git', ['merge-base', '--is-ancestor', vorfahr, kopf], { cwd: repo, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 1 << 20 });
  return r.status === 0;
}

/* { ok, rot: [Zeilen-Text], offen: Zahl } — rot ist jede unlesbare Zeile und jeder fertige Kopf, den der Zugkopf nicht trägt. */
function pruefen({ text, kopf, repo = REPO, vorfahr = istVorfahr }) {
  const rot = [];
  let offen = 0;
  for (const e of eintraegeLesen(text)) {
    if (e.unlesbar) { rot.push('Zeile ' + e.zeile + ' ist unlesbar (weniger als vier Spalten mit Tab): ' + e.text); continue; }
    if (!e.kopf) { offen++; continue; }
    if (!vorfahr(repo, e.kopf, kopf)) {
      rot.push('Vorrang ' + e.rolle + ' (' + e.ziel + '): Kopf ' + e.kopf + ' ist fertig, der Zugkopf ' + String(kopf).slice(0, 9)
        + ' enthält ihn nicht. Erst den Vorrang-Wagen aufnehmen; aufheben kann das nur das Löschen der Zeile in der Vorrang-Datei.');
    }
  }
  return { ok: rot.length === 0, rot, offen };
}

function main(argv = process.argv.slice(2), { schreiben = (t) => process.stdout.write(t), fehlerSchreiben = (t) => process.stderr.write(t) } = {}) {
  const wert = (s) => { const i = argv.indexOf(s); return i >= 0 ? argv[i + 1] : null; };
  const datei = wert('--datei') || BEISPIEL;
  const repo = wert('--repo') || REPO;
  let kopf = wert('--kopf') || 'HEAD';
  const rp = spawnSync('git', ['rev-parse', '--verify', kopf + '^{commit}'], { cwd: repo, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 1 << 20 });
  if (rp.status !== 0) { fehlerSchreiben('[vorrang] Zugkopf „' + kopf + '“ nicht auflösbar — rot\n'); return 1; }
  kopf = rp.stdout.trim();
  let text;
  try { text = fs.readFileSync(datei, 'utf8'); } catch (_) {
    fehlerSchreiben('[vorrang] UNGEMESSEN — Vorrang-Datei nicht lesbar: ' + datei + '\n');
    return AUSGANG_UNGEMESSEN;
  }
  const r = pruefen({ text, kopf, repo });
  if (!r.ok) {
    fehlerSchreiben('[vorrang] ROT — der Zugkopf ' + kopf.slice(0, 9) + ' fährt ohne fertigen Vorrang:\n' + r.rot.map((z) => '  ✗ ' + z).join('\n') + '\n');
    return 1;
  }
  schreiben('[vorrang] grün — jeder fertige Vorrang-Kopf ist im Zugkopf ' + kopf.slice(0, 9) + (r.offen ? ' (' + r.offen + ' offen, ohne Kopf)' : '') + '\n');
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { eintraegeLesen, pruefen, main, BEISPIEL, AUSGANG_UNGEMESSEN };
