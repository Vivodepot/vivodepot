'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   GEN1 — Die Felder, die der Generator anbietet, sind die des Kerns: alle Bereiche, Deutsch und Englisch
   ──────────────────────────────────────────────────────────────────────────
   Der Feldkatalog des Generators ist ERZEUGT (tools/build-feldkatalog.js) aus dem Kern (`SEKTOREN`); die englische
   Beschriftung je Kennung ist die des Kerns (tools/textsatz-en-modul.json, `<kennung>.label`). Gehalten wird:

     1 · der Katalog im Generator ist wortgleich der, den der Kern heute erzeugt (Kennung, Bereich, deutsche und
         englische Beschriftung, Reihenfolge) — nach jedem Schnitt im Kern ist er neu zu erzeugen, sonst ist das hier rot;
     2 · die Palette bietet je Bereich genau die obersten Felder des Kerns an — alle dreizehn Bereiche und jeder
         Pro-Bereich, den der Kern kennt; kein Bereich fehlt, keiner hat ein Feld weniger oder mehr;
     3 · jedes Feld hat eine englische Beschriftung des Kerns; in der englischen Oberfläche heißt jedes Feld so, in der
         deutschen so, wie der Kern es deutsch nennt; kein Rückfall auf eine aus der Kennung gelesene Fassung.

   ROT-BEWEIS: dieselbe Messung gegen absichtlich verschlechterte Fassungen (ein Feld weniger im Katalog, eine falsche
   englische Beschriftung, ein versteckter Bereich in der Palette, ein Feld im Kern, das der Generator nicht kennt).
   ══════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { ladeGenerator } = require('./load-generator.js');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
/* Die Quelle der Wahrheit ist das Erzeugungswerkzeug selbst, nicht eine Nachbildung: `--check` fährt es und vergleicht
   Transport UND Generator-Region mit dem, was der Kern heute ergibt (nach dem Schnitt: der konfektionierte Kern samt Bereichs-
   Templates). Die Felder, gegen die hier die Palette gemessen wird, kommen aus dem Transport, den dieser Lauf bestätigt. */
const KERN = JSON.parse(fs.readFileSync(path.join(REPO, 'bereiche', 'feldkatalog.json'), 'utf8')).felder;
const EN = require('../tools/textsatz-en-modul.json').texte;
function werkzeug(args) { return spawnSync(process.execPath, [path.join(REPO, 'tools', 'build-feldkatalog.js'), ...args], { cwd: REPO, encoding: 'utf8', timeout: 240000 }); }
function driftGegen(html) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'feldkatalog-drift-')), 'generator.html');
  fs.writeFileSync(tmp, html);
  return werkzeug(['--generator', tmp]).status;
}
const ober = (k) => k.kennung.indexOf('/') < 0 && k.kennung.indexOf('[') < 0;

/* Die Messung. Liefert die Kennungen der Abweichungen. */
function abweichungen(html, kern) {
  const f = [];
  const { V } = ladeGenerator({ html });
  // 1 · Katalog = Kern
  const gen = Array.from(V.FELDKATALOG);
  const soll = kern.map((k) => [k.kennung, k.bereich, k.label, EN[k.kennung + '.label'] || '']);
  const ist = gen.map((k) => [k.kennung, k.bereich, k.label, k.labelEn]);
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    const sk = new Set(ist.map((z) => z[0])), kk = new Set(soll.map((z) => z[0]));
    if ([...kk].some((k) => !sk.has(k))) f.push('katalog-kennt-ein-kernfeld-nicht');
    if ([...sk].some((k) => !kk.has(k))) f.push('katalog-hat-ein-feld-das-der-kern-nicht-kennt');
    if (ist.some((z, i) => soll[i] && z[0] === soll[i][0] && z[3] !== soll[i][3])) f.push('katalog-englische-beschriftung-weicht-ab');
    if (ist.some((z, i) => soll[i] && z[0] === soll[i][0] && z[2] !== soll[i][2])) f.push('katalog-deutsche-beschriftung-weicht-ab');
    if (!f.length) f.push('katalog-reihenfolge-oder-bereich-weicht-ab');
  }
  // 2 · Palette = oberste Felder des Kerns, je Bereich
  const palette = V.paletteEintraege();
  const sollBereiche = {}; kern.filter(ober).forEach((k) => { (sollBereiche[k.bereich] = sollBereiche[k.bereich] || []).push(k.kennung); });
  const istBereiche = {}; palette.forEach((e) => { (istBereiche[e.bereich] = istBereiche[e.bereich] || []).push(e.kennung); });
  for (const b of V.BEREICHE) if (!(istBereiche[b] && istBereiche[b].length)) f.push('palette-ohne-bereich:' + b);
  for (const b of Object.keys(sollBereiche)) {
    const a = (istBereiche[b] || []).slice().sort().join('|'), c = sollBereiche[b].slice().sort().join('|');
    if (a !== c) f.push('palette-weicht-ab:' + b);
  }
  for (const b of Object.keys(istBereiche)) if (!sollBereiche[b]) f.push('palette-hat-bereich-den-der-kern-nicht-kennt:' + b);
  // 3 · beide Sprachen
  for (const k of gen) if (!k.labelEn) { f.push('feld-ohne-englische-beschriftung'); break; }
  V.spracheFuerProbeSetzen('en');
  for (const k of gen) { const l = V.katalogLabel(k); if (!EN[k.kennung + '.label'] || l !== EN[k.kennung + '.label']) { f.push('englisch-nicht-die-des-kerns'); break; } }
  V.spracheFuerProbeSetzen('de');
  for (const k of gen) { if (V.katalogLabel(k) !== k.label) { f.push('deutsch-nicht-die-des-kerns'); break; } }
  return [...new Set(f)];
}

test('[Feldkatalog-Drift] der Generator bietet dieselben Felder wie der Kern: Katalog, Palette je Bereich, Deutsch und Englisch', () => {
  assert.ok(KERN.length > 400, 'Vorbedingung: der Kern-Katalog ist da');
  assert.deepEqual(abweichungen(HTML, KERN), []);
});

test('[Feldkatalog-Drift] alle dreizehn Bereiche stehen in der Palette, jeder mit Feldern', () => {
  const { V } = ladeGenerator();
  assert.equal(V.BEREICHE.length, 13);
  const je = {}; V.paletteEintraege().forEach((e) => { je[e.bereich] = (je[e.bereich] || 0) + 1; });
  for (const b of V.BEREICHE) assert.ok(je[b] > 0, 'kein Feld im Bereich ' + b);
});

test('[Feldkatalog-Drift] das Erzeugungswerkzeug findet keinen Drift: Transport und Region im Generator sind, was der Kern heute ergibt', () => {
  const r = werkzeug(['--check']);
  assert.equal(r.status, 0, 'Drift — Abhilfe: node tools/build-feldkatalog.js\n' + (r.stderr || '') + (r.stdout || ''));
  assert.equal(driftGegen(HTML), 0, 'der Generator allein: dieselbe Antwort');
});

test('[Feldkatalog-Drift·Rot-Beweis] ein fehlendes Feld, eine falsche englische Beschriftung, ein versteckter Bereich und ein unbekanntes Kernfeld werden gemeldet', () => {
  const zeile = /^  \["identity\.givenName",.*\],\n/m;
  const m1 = HTML.replace(zeile, '');
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  assert.ok(abweichungen(m1, KERN).includes('katalog-kennt-ein-kernfeld-nicht'));
  const m2 = HTML.replace(/^(  \["identity\.givenName","identity","[^"]*",")[^"]*("\],)$/m, '$1Forename$2');
  assert.notEqual(m2, HTML);
  const f2 = abweichungen(m2, KERN);
  assert.ok(f2.includes('katalog-englische-beschriftung-weicht-ab') && f2.includes('englisch-nicht-die-des-kerns'), f2.join());
  const m3 = HTML.replace("    .filter((e) => e.kennung.indexOf('/') < 0 && e.kennung.indexOf('[') < 0);", "    .filter((e) => e.kennung.indexOf('/') < 0 && e.kennung.indexOf('[') < 0 && e.bereich !== 'health');");
  assert.notEqual(m3, HTML);
  assert.ok(abweichungen(m3, KERN).includes('palette-ohne-bereich:health'));
  assert.equal(driftGegen(m1), 1, 'das Werkzeug selbst meldet das fehlende Feld');
  assert.equal(driftGegen(m2), 1, 'und die falsche englische Beschriftung');
  const kernPlus = KERN.concat([{ kennung: 'identity.nagelneuesFeld', bereich: 'identity', label: 'Nagelneu' }]);
  assert.ok(abweichungen(HTML, kernPlus).includes('katalog-kennt-ein-kernfeld-nicht'));
  const m4 = HTML.replace("  if (k.labelEn) return k.labelEn;\n", '');
  assert.notEqual(m4, HTML);
  assert.ok(abweichungen(m4, KERN).includes('englisch-nicht-die-des-kerns'));
});

test('[Feldkatalog-Drift] jedes Kernfeld hat eine englische Beschriftung im Kern-Textsatz', () => {
  const ohne = KERN.filter((k) => !EN[k.kennung + '.label']).map((k) => k.kennung);
  assert.deepEqual(ohne, [], 'ohne englische Beschriftung: ' + ohne.slice(0, 5).join(', '));
});
