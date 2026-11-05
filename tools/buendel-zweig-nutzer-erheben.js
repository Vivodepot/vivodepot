#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   Erhebung: hat der Ladeweg über das eingebettete Bündel noch einen lebenden Nutzer?
   ─────────────────────────────────────────────────────────────────
   Seit dem 17.09.2026 steht im Kern `const BUERGERMODUL_BUENDEL = null;`. Damit ist das Gate
   `buendel === BUERGERMODUL_BUENDEL` in `buergermodulBuendelAnwenden` nie wahr, und der Zweig für
   `bereichsErsatz` läuft nie (U2-ADR-348, Status „überholt“). Bevor der Zweig fällt, misst dieses
   Werkzeug, ob ihn noch etwas am Leben hält:

     1. der Kern trägt ein Bündel, das nicht `null` ist;
     2. eine Datei unter tests/ oder tools/ bindet die Varianten-Fixture
        `tests/fixtures/buergermodul-buendel-varianten.js` per require ein (sie baut Quelltext-Varianten mit einem
        gefüllten Bündel; ihre Marke `JSON.parse('` gibt es im Kern nicht mehr).

   Dateien, die die Fixture nur nennen (Kommentar, Register-Text), sind keine Nutzer; sie stehen als
   „erwähnt“ in der Ausgabe. Gelesen werden die Dateien selbst, nicht über die Shell.

   Aufruf:
     node tools/buendel-zweig-nutzer-erheben.js                  → gegen die Fixture tests/fixtures/buendel-zweig-erhebung/tot
     node tools/buendel-zweig-nutzer-erheben.js --baum <pfad>    → gegen einen Baum (z. B. den Checkout)
     … --json                                                    → maschinenlesbar
   Exit 1, sobald ein lebender Nutzer gefunden ist; sonst 0.
   Probe: tests/buendel-zweig-nutzer-erheben.test.js
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE_NAME = 'buergermodul-buendel-varianten';
const AUSGENOMMEN = [path.join('tests', 'fixtures', 'buendel-zweig-erhebung'), 'node_modules', '.git'];

function dateien(wurzel, rel) {
  const voll = path.join(wurzel, rel);
  if (!fs.existsSync(voll)) return [];
  const aus = [];
  for (const e of fs.readdirSync(voll, { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (AUSGENOMMEN.some((a) => r === a || r.startsWith(a + path.sep))) continue;
    if (e.isDirectory()) aus.push(...dateien(wurzel, r));
    else if (/\.(js|cjs|mjs)$/.test(e.name)) aus.push(r);
  }
  return aus;
}

function kernBuendel(text) {
  const m = /^const BUERGERMODUL_BUENDEL = (.*)$/m.exec(text);
  if (!m) return { gefunden: false, leer: false };
  return { gefunden: true, leer: m[1].trim() === 'null;' };
}

function erheben(wurzel) {
  const kernDatei = path.join(wurzel, 'vivodepot.html');
  const kern = fs.existsSync(kernDatei) ? kernBuendel(fs.readFileSync(kernDatei, 'utf8')) : { gefunden: false, leer: false };
  const einbindend = new RegExp("require\\(\\s*['\"][^'\"]*" + FIXTURE_NAME + "(\\.js)?['\"]\\s*\\)");
  const nutzer = [];
  const erwaehnt = [];
  for (const rel of [...dateien(wurzel, 'tests'), ...dateien(wurzel, 'tools')]) {
    if (path.basename(rel, '.js') === FIXTURE_NAME) continue;
    if (/^buendel-zweig-nutzer-erheben(\.test)?\.js$/.test(path.basename(rel))) continue;   // dieses Werkzeug und seine Probe
    const text = fs.readFileSync(path.join(wurzel, rel), 'utf8');
    if (!text.includes(FIXTURE_NAME)) continue;
    (einbindend.test(text) ? nutzer : erwaehnt).push(rel.split(path.sep).join('/'));
  }
  const lebend = [];
  if (kern.gefunden && !kern.leer) lebend.push({ ort: 'vivodepot.html', grund: 'BUERGERMODUL_BUENDEL ist nicht null' });
  if (!kern.gefunden) lebend.push({ ort: 'vivodepot.html', grund: 'Zeile const BUERGERMODUL_BUENDEL nicht gefunden' });
  for (const n of nutzer) lebend.push({ ort: n, grund: 'bindet ' + FIXTURE_NAME + ' ein' });
  return { kern, nutzer: nutzer.sort(), erwaehnt: erwaehnt.sort(), lebend };
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--baum');
  const wurzel = i >= 0 ? path.resolve(a[i + 1]) : path.join(__dirname, '..', 'tests', 'fixtures', 'buendel-zweig-erhebung', 'tot');
  const e = erheben(wurzel);
  if (a.includes('--json')) process.stdout.write(JSON.stringify(e, null, 2) + '\n');
  else {
    console.log('Baum: ' + wurzel);
    console.log('Kern: BUERGERMODUL_BUENDEL ' + (!e.kern.gefunden ? 'nicht gefunden' : e.kern.leer ? 'ist null' : 'ist gefüllt'));
    console.log('Einbindend (' + e.nutzer.length + '): ' + (e.nutzer.join(', ') || '—'));
    console.log('Nur erwähnt (' + e.erwaehnt.length + '): ' + (e.erwaehnt.join(', ') || '—'));
    console.log(e.lebend.length ? 'LEBEND: ' + e.lebend.map((l) => l.ort + ' (' + l.grund + ')').join('; ') : 'kein lebender Nutzer');
  }
  process.exit(e.lebend.length ? 1 : 0);
}

module.exports = { erheben, kernBuendel };
