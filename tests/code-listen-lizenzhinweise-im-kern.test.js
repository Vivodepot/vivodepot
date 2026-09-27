'use strict';
/* Probe für den dauerhaften Sollwert der Marker-Region CODE-LISTEN (tools/geruest-waechter-grundlinie.json,
   regionen.dauerhaft): die Region trägt satzförmigen Text, und das ist Absicht. Es sind die Lizenz- und
   Urheberhinweise der eingebetteten Codelisten (z. B. der WIdO-Hinweis zur ATC-GM), die wir führen MÜSSEN;
   sie wegzulassen wäre eine Rechtsverletzung, kein Aufräumen. Diese Probe sichert das VORHANDENSEIN, nicht
   das Weglassen: jede Codeliste mit einem `lizenz`-Feld hat ihren Wortlaut unverändert in der Region. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const anfang = KERN.indexOf('CODE-LISTEN:BEGIN');
const ende = KERN.indexOf('CODE-LISTEN:END');
const REGION = KERN.slice(anfang, ende);
const LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((f) => f.endsWith('.json'));

test('[CODE-LISTEN·Lizenz] die Region CODE-LISTEN ist da und trägt Codelisten', () => {
  assert.ok(anfang >= 0 && ende > anfang, 'Vorbedingung: die Marker-Region CODE-LISTEN steht im Kern');
  assert.ok(LISTEN.length >= 5, 'Vorbedingung: es gibt Codelisten unter code-listen/ (' + LISTEN.length + ')');
});

// Welche Codelisten haben ihren Lizenzhinweis NICHT wörtlich in der Region? Leer heißt: alle sind da.
function fehlendeHinweise(region) {
  const fehlend = [];
  let geprueft = 0;
  for (const datei of LISTEN) {
    const liste = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', datei), 'utf8'));
    if (typeof liste.lizenz !== 'string' || !liste.lizenz.trim()) continue;
    geprueft += 1;
    if (!region.includes(JSON.stringify(liste.lizenz).slice(1, -1))) fehlend.push(datei);
  }
  return { fehlend, geprueft };
}

test('[CODE-LISTEN·Lizenz] jeder Lizenz- und Urheberhinweis einer Codeliste steht wörtlich in der Region', () => {
  const { fehlend, geprueft } = fehlendeHinweise(REGION);
  assert.deepEqual(fehlend, [], 'der Lizenzhinweis fehlt in der Region CODE-LISTEN — er ist Pflicht, nicht Beiwerk');
  assert.ok(geprueft >= 5, 'die Probe prüft etwas: ' + geprueft + ' Hinweise');
});

test('[CODE-LISTEN·Lizenz·Rot-Beweis] wird ein Hinweis weggeschnitten, schlägt die Probe an und nennt die Codeliste', () => {
  const atc = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', 'atc.json'), 'utf8'));
  const ohneAtc = REGION.split(JSON.stringify(atc.lizenz).slice(1, -1)).join('');
  assert.notEqual(ohneAtc, REGION, 'Vorbedingung: der ATC-Hinweis stand in der Region');
  assert.deepEqual(fehlendeHinweise(ohneAtc).fehlend, ['atc.json']);
  assert.deepEqual(fehlendeHinweise('').fehlend.length >= 5, true, 'ohne Region fehlen alle');
});

test('[CODE-LISTEN·Lizenz] der WIdO-Urheberhinweis zur ATC-GM steht in der Region', () => {
  assert.ok(REGION.includes('Das Wissenschaftliche Institut der AOK (WIdO) ist Urheber der ATC-GM'), 'WIdO-Hinweis fehlt');
});
