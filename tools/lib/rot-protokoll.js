'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   rot-protokoll.js — ein roter Zugkopf nennt seine roten Dateien und behält sein Protokoll (28.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Befund LANDUNG-ROT-OHNE-DATEI (MITTEL): ein roter Zugkopf meldete nur „Exit 1 bei npm test“. Die Zeilenauswahl suchte nach
   dem Wort „rot“ und zeigte 30 grüne Testnamen mit „Rot-Beweis“; danach löschte die Landungsvorbereitung den Laufordner mit
   allen Protokollen. Welche Datei und welcher Wagen rot waren, ließ sich nur mit einem zweiten Volllauf klären.

   ROTE DATEIEN, ohne Wortsuche, in dieser Rangfolge:
     1. die Datei des frühen Rots (VD_ERSTES_ROT, je roter Blatt-Test „datei<TAB>test[<TAB>meldung]“, geschrieben vom Reporter
        aus den test:fail-Ereignissen);
     2. die Marken des spec-Reporters: der Block „failing tests:“ mit „test at <datei>:<zeile>:<spalte>“, sonst Zeilen, die mit
        ✖ beginnen; dazu „ℹ fail <n>“.
   Steht in keiner Quelle ein roter Test, sagt die Meldung das ausdrücklich: die Ursache liegt außerhalb der Tests (Hülle,
   Absturz, Zeitgrenze), und die letzten Zeilen des Protokolls zeigen sie.

   PROTOKOLL BEHALTEN: alle Seitenprotokolle und die Datei des frühen Rots nach <ort>/vd-zugkopf-protokolle/<baum12>-<name>.log;
   die jüngsten PROTOKOLLE_BEHALTEN bleiben. Ein Fehler beim Behalten wirft — der Aufrufer meldet ihn laut und lässt den
   Laufordner stehen.
   Probe: tests/rot-protokoll.test.js.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const PROTOKOLL_ORDNER = 'vd-zugkopf-protokolle';
const PROTOKOLLE_BEHALTEN = 20;
const LETZTE_ZEILEN = 15;

const relativ = (datei, wurzel) => {
  let d = String(datei).replace(/^file:\/\//, '');
  if (wurzel && path.isAbsolute(d)) { const r = path.relative(wurzel, d); if (!r.startsWith('..')) d = r; }
  return d;
};

/** Rote Dateien aus der Datei des frühen Rots und dem Protokoll. → { quelle, dateien: [{ datei, tests }], kreuze, fail } */
function roteDateien({ erstesRot = '', protokoll = '', wurzel = null } = {}) {
  const karte = new Map();
  const dazu = (datei, test) => {
    const d = relativ(datei, wurzel);
    if (!karte.has(d)) karte.set(d, []);
    if (test && !karte.get(d).includes(test)) karte.get(d).push(test);
  };
  for (const z of String(erstesRot).split('\n').filter(Boolean)) { const [d, t = ''] = z.split('\t'); if (d) dazu(d, t); }
  const zeilen = String(protokoll).split('\n');
  const kreuze = zeilen.filter((z) => /^\s*✖ /.test(z) && !/failing tests:/.test(z)).map((z) => z.replace(/^\s*✖ /, '').replace(/ \([\d.]+m?s\)\s*$/, '').trim());
  const failZeile = [...String(protokoll).matchAll(/^ℹ fail (\d+)/gm)].pop();
  const fail = failZeile ? Number(failZeile[1]) : null;
  let quelle = karte.size ? 'frühes Rot' : null;
  if (!karte.size) {
    const block = zeilen.findIndex((z) => /failing tests:/.test(z));
    if (block >= 0) {
      for (let i = block + 1; i < zeilen.length; i++) {
        const m = /^\s*test at (.+?):\d+:\d+\s*$/.exec(zeilen[i]);
        if (!m) continue;
        const name = (zeilen.slice(i + 1).find((x) => /^\s*✖ /.test(x)) || '').replace(/^\s*✖ /, '').replace(/ \([\d.]+m?s\)\s*$/, '').trim();
        dazu(m[1], name);
      }
    }
    if (karte.size) quelle = 'spec: failing tests';
  }
  return { quelle, dateien: [...karte].map(([datei, tests]) => ({ datei, tests })), kreuze, fail };
}

function letzteZeilen(text, n = LETZTE_ZEILEN) {
  return String(text || '').split('\n').map((z) => z.replace(/\s+$/, '')).filter((z) => z.trim()).slice(-n);
}

/** Die Meldung eines roten Zugkopfs. Bei der Node-Suite die roten Dateien; ohne roten Test ausdrücklich „kein Test rot“. → Text */
function rotMeldung({ seite, grund = '', erstesRot = '', protokoll = '', wurzel = null }) {
  const aus = [];
  const letzte = () => { const l = letzteZeilen(protokoll); if (l.length) aus.push('  letzte Zeilen der Seite:', ...l.map((z) => '    ' + z)); };
  if (seite !== 'node-suite') { letzte(); return aus.join('\n'); }
  const r = roteDateien({ erstesRot, protokoll, wurzel });
  if (r.dateien.length) {
    aus.push('  rote Dateien (' + r.quelle + '):');
    for (const d of r.dateien) aus.push('    ✖ ' + d.datei + (d.tests.length ? ' — ' + d.tests.slice(0, 3).join(' · ') + (d.tests.length > 3 ? ' · …' : '') : ''));
  } else if (r.kreuze.length || r.fail) {
    aus.push('  rote Tests ohne Datei (spec-Marken' + (r.fail ? ', ℹ fail ' + r.fail : '') + '):', ...r.kreuze.slice(0, 10).map((k) => '    ✖ ' + k));
    letzte();
  } else {
    aus.push('  Suite ' + (grund || 'rot') + ', kein Test rot — die Ursache liegt außerhalb der Tests (Hülle, Absturz, Zeitgrenze).');
    letzte();
  }
  return aus.join('\n');
}

/** Kopiert die Protokolle nach <ort>/vd-zugkopf-protokolle/. `dateien`: [{ name, pfad }]; fehlende Pfade zählen nicht.
    Wirft bei jedem Fehler (kein Ort, Kopieren schlägt fehl). → [Zielpfad, …] */
function protokolleBehalten({ ort, baum = '', dateien = [], behalten = PROTOKOLLE_BEHALTEN }) {
  if (!ort) throw new Error('kein Ort für die Protokolle');
  const ordner = path.join(ort, PROTOKOLL_ORDNER);
  fs.mkdirSync(ordner, { recursive: true });
  const ziele = [];
  for (const { name, pfad } of dateien) {
    if (!pfad || !fs.existsSync(pfad)) continue;
    const ziel = path.join(ordner, String(baum).slice(0, 12) + '-' + String(name).replace(/[^A-Za-z0-9._-]+/g, '-') + '.log');
    fs.copyFileSync(pfad, ziel);
    ziele.push(ziel);
  }
  // Ein zweiter Lauf kann gleichzeitig aufräumen: ein Eintrag, der zwischen readdir und stat verschwindet, zählt nicht (ENOENT).
  const alle = fs.readdirSync(ordner).filter((d) => d.endsWith('.log')).flatMap((d) => {
    try { return [{ d, t: fs.statSync(path.join(ordner, d)).mtimeMs }]; } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  }).sort((a, b) => b.t - a.t);
  for (const x of alle.slice(behalten)) if (!ziele.includes(path.join(ordner, x.d))) fs.rmSync(path.join(ordner, x.d), { force: true });
  return ziele;
}

module.exports = { roteDateien, rotMeldung, protokolleBehalten, letzteZeilen, PROTOKOLL_ORDNER, PROTOKOLLE_BEHALTEN, LETZTE_ZEILEN };
