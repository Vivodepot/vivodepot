'use strict';
/* ════════════════════════════════════════════════════════════════════════
   § 1829 BGB im Studio: beide Gefahren, wie in den Textsätzen (01.10.2026, v850)
   ────────────────────────────────────────────────────────────────────────
   Gegenstück zu tests/beschriftung-1829-beide-gefahren.test.js für das Studio (den Vorlagen-Erzeuger), das nicht in den
   öffentlichen Zuschnitt ging (bis 05.10.2026). Darum eine eigene Datei; der Wächter daneben prüft die Textsätze DE/EN
   und die Lese-App.
   Gehalten wird: jede Zeichenkette im Studio, die § 1829 BGB nennt, nennt auch den schweren, länger dauernden
   Gesundheitsschaden, und die Beschriftung des Vollmachtsumfangs ist wörtlich die des deutschen Textsatzes.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STUDIO = path.join(REPO, 'vivodepot-studio.html');
const SCHLUESSEL = 'advanceCare.provisionInstruments/healthCareMedicalProcedures.label';

function funde(text) {
  const aus = [];
  const re = /"([^"\n]*§\s*1829[^"\n]*)"/g;
  let m;
  while ((m = re.exec(text))) if (!/Gesundheitsschaden|gesundheitlichen Schaden|harm to health/.test(m[1])) aus.push(m[1].slice(0, 120));
  return aus;
}

test('[§ 1829·Studio] das Studio nennt bei § 1829 BGB beide Gefahren, mit dem Wortlaut des Textsatzes', () => {
  const studio = fs.readFileSync(STUDIO, 'utf8');
  assert.ok((studio.match(/§\s*1829/g) || []).length >= 1, 'Vorbedingung: das Studio nennt § 1829');
  assert.deepEqual(funde(studio), []);
  const de = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8'));
  const satz = JSON.stringify(de).match(new RegExp('"' + SCHLUESSEL.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '":"([^"]+)"'));
  assert.ok(satz, 'Vorbedingung: der Textsatz führt die Beschriftung');
  assert.ok(studio.includes(satz[1]), 'das Studio trägt die Beschriftung wörtlich wie der Textsatz: ' + satz[1]);
});

test('[§ 1829·Studio·Rot-Beweis] eine Studio-Zeile nur mit Lebensgefahr fällt auf', () => {
  assert.equal(funde('["x","advanceCare","Gesundheitssorge — ärztliche Eingriffe, auch mit Lebensgefahr (§ 1829 BGB)"]').length, 1);
});
