'use strict';
/* ════════════════════════════════════════════════════════════════════════
   § 1829 BGB in Beschriftungen: beide Gefahren, nicht nur die Lebensgefahr (01.10.2026, v850)
   ────────────────────────────────────────────────────────────────────────
   § 1829 Abs. 1 BGB nennt die begründete Gefahr, dass die betreute Person stirbt ODER einen schweren und länger dauernden
   gesundheitlichen Schaden erleidet. Die Beschriftung des Vollmachtsumfangs sagte nur „auch mit Lebensgefahr (§ 1829 BGB)“ —
   gefunden bei der Quellenprüfung der Demo „Klinikaufnahme“. Wer in der Lese-App „ja“ daneben sieht, las daraus weniger, als
   die Vollmacht umfasst.
   Wächter über die Klasse: jede Beschriftung in den Textsätzen (DE, EN) und in der Lese-App, die § 1829 BGB nennt,
   nennt auch den schweren, länger dauernden Gesundheitsschaden. Rot-Beweis an einer gepflanzten Zeile.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DATEIEN = ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json', 'vivodepot-lesen.html'];

// Jede Zeichenkette, die § 1829 nennt, muss beide Gefahren nennen (DE: „Gesundheitsschaden“ oder, im amtlichen BMJ-Wortlaut,
// „gesundheitlichen Schaden“; EN: „harm to health“).
function funde(text, datei) {
  const aus = [];
  const re = /"([^"\n]*§\s*1829[^"\n]*)"/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[1];
    if (!/Gesundheitsschaden|gesundheitlichen Schaden|harm to health/.test(s)) aus.push(datei + ': ' + s.slice(0, 120));
  }
  return aus;
}

test('[§ 1829·Beschriftung] jede Beschriftung, die § 1829 BGB nennt, nennt auch den schweren Gesundheitsschaden', () => {
  let gesehen = 0;
  const alle = [];
  for (const d of DATEIEN) {
    const text = fs.readFileSync(path.join(REPO, d), 'utf8');
    gesehen += (text.match(/§\s*1829/g) || []).length;
    alle.push(...funde(text, d));
  }
  assert.ok(gesehen >= 4, 'Vorbedingung: § 1829 kommt in den Dateien vor (' + gesehen + ')');
  assert.deepEqual(alle, []);
});

test('[§ 1829·Beschriftung·Rot-Beweis] eine Beschriftung nur mit Lebensgefahr fällt auf, die vollständige nicht', () => {
  assert.equal(funde('"x": "Gesundheitssorge — ärztliche Eingriffe, auch mit Lebensgefahr (§ 1829 BGB)"', 'probe').length, 1);
  assert.equal(funde('"x": "… mit Lebensgefahr oder Gefahr eines schweren, länger dauernden Gesundheitsschadens (§ 1829 BGB)"', 'probe').length, 0);
});
