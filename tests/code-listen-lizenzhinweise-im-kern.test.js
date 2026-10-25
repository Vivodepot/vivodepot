'use strict';
/* Probe für den dauerhaften Sollwert der Marker-Region CODE-LISTEN (tools/geruest-waechter-grundlinie.json,
   regionen.dauerhaft): die Region trägt satzförmigen Text, und das ist Absicht. Es sind die Lizenz- und
   Urheberhinweise der eingebetteten Codelisten (z. B. der WIdO-Hinweis zur ATC-GM), die wir führen MÜSSEN;
   sie wegzulassen wäre eine Rechtsverletzung, kein Aufräumen. Diese Probe sichert das VORHANDENSEIN, nicht
   das Weglassen: jede Codeliste mit Daten hat ihren Wortlaut unverändert in der Region — oder, wo der Lizenzgeber
   den Wortlaut im weitergegebenen Exemplar verlangt (`lizenzWortlaut`), den Verweis in der Region und den Wortlaut
   byte-gleich in der Region LIZENZ-WORTLAUT (tests/lizenz-wortlaut-im-kern.test.js). Eine Liste ohne Daten trägt
   keine Hinweispflicht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const anfang = KERN.indexOf('CODE-LISTEN:BEGIN');
const ende = KERN.indexOf('CODE-LISTEN:END');
const REGION = KERN.slice(anfang, ende);
const WORTLAUT_REGION = KERN.slice(KERN.indexOf('LIZENZ-WORTLAUT:BEGIN'), KERN.indexOf('LIZENZ-WORTLAUT:END'));
const LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((f) => f.endsWith('.json'));

test('[CODE-LISTEN·Lizenz] die Region CODE-LISTEN ist da und trägt Codelisten', () => {
  assert.ok(anfang >= 0 && ende > anfang, 'Vorbedingung: die Marker-Region CODE-LISTEN steht im Kern');
  assert.ok(LISTEN.length >= 5, 'Vorbedingung: es gibt Codelisten unter code-listen/ (' + LISTEN.length + ')');
});

// Welche Codelisten haben ihren Lizenzhinweis NICHT wörtlich in der Region? Leer heißt: alle sind da.
function fehlendeHinweise(region, wortlautRegion = WORTLAUT_REGION) {
  const fehlend = [];
  let geprueft = 0;
  for (const datei of LISTEN) {
    const liste = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', datei), 'utf8'));
    if (typeof liste.lizenz !== 'string' || !liste.lizenz.trim() || !(liste.daten || []).length) continue;
    // hinweispflicht: false — der Lizenzgeber verlangt keinen Hinweis im Exemplar (benannte Ausnahme, s. Probe unten).
    if (liste.hinweispflicht === false) continue;
    geprueft += 1;
    const da = liste.lizenzWortlaut
      ? region.includes('lizenzWortlaut: ' + JSON.stringify(liste.systemId) + ',') && wortlautRegion.includes(JSON.stringify(liste.lizenz).slice(1, -1))
      : region.includes(JSON.stringify(liste.lizenz).slice(1, -1));
    if (!da) fehlend.push(datei);
  }
  return { fehlend, geprueft };
}

test('[CODE-LISTEN·Lizenz] jeder Lizenz- und Urheberhinweis einer Codeliste steht wörtlich in der Region', () => {
  const { fehlend, geprueft } = fehlendeHinweise(REGION);
  assert.deepEqual(fehlend, [], 'der Lizenzhinweis fehlt in der Region CODE-LISTEN — er ist Pflicht, nicht Beiwerk');
  assert.ok(geprueft >= 4, 'die Probe prüft etwas: ' + geprueft + ' Hinweise');
});

test('[CODE-LISTEN·Lizenz·Rot-Beweis] wird ein Hinweis weggeschnitten, schlägt die Probe an und nennt die Codeliste', () => {
  // Seit 04.10.2026 trägt auch die SNOMED-Liste ihren Wortlaut über LIZENZ-WORTLAUT (Verweis in der Region) — weggeschnitten
  // wird er dort, wie bei ATC unten.
  const ohneSnomed = WORTLAUT_REGION.replace(/\n {2}snomedAllergen: .*/, '');
  assert.notEqual(ohneSnomed, WORTLAUT_REGION, 'Vorbedingung: der SNOMED-Hinweis stand in LIZENZ-WORTLAUT');
  assert.deepEqual(fehlendeHinweise(REGION, ohneSnomed).fehlend, ['snomedAllergen.json']);
  // Der Verweis allein genügt nicht: fehlt der Wortlaut in LIZENZ-WORTLAUT, ist die Liste rot.
  assert.deepEqual(fehlendeHinweise(REGION, WORTLAUT_REGION.replace(/\n {2}atc: .*/, '')).fehlend, ['atc.json']);
  assert.deepEqual(fehlendeHinweise(REGION.replace('lizenzWortlaut: "loinc",', ''), WORTLAUT_REGION).fehlend, ['loinc.json']);
  assert.deepEqual(fehlendeHinweise('', '').fehlend.length >= 4, true, 'ohne Region fehlen alle');
});

test('[CODE-LISTEN·Lizenz] der WIdO-Urheberhinweis zur ATC-GM steht im Kern (Region LIZENZ-WORTLAUT)', () => {
  assert.ok(WORTLAUT_REGION.includes('Das Wissenschaftliche Institut der AOK (WIdO) ist Urheber der ATC-GM'), 'WIdO-Hinweis fehlt');
});

/* Ausnahme ohne Hinweis im Kern (U2-ADR-480, Gegenlesung 04.10.2026, Befund WAEHRUNG-FEST-EUR, Option iii): nur iso4217 — SIX
   verlangt keinen Hinweis im weitergegebenen Exemplar, die Quellenangabe steht in NOTICE.md und THIRD_PARTY_LICENSES. Jede
   weitere Liste mit `hinweispflicht: false` braucht ein eigenes Wort; darum eine Positivliste. */
test('[CODE-LISTEN·Lizenz] hinweispflicht: false trägt nur die benannte Liste, und ihre Quellenangabe steht in NOTICE und THIRD_PARTY_LICENSES', () => {
  const ohne = LISTEN.filter((d) => JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', d), 'utf8')).hinweispflicht === false);
  assert.deepEqual(ohne, ['iso4217.json']);
  const iso = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', 'iso4217.json'), 'utf8'));
  for (const datei of ['NOTICE.md', 'THIRD_PARTY_LICENSES']) {
    const text = fs.readFileSync(path.join(REPO, datei), 'utf8').replace(/\s+/g, ' ');
    assert.ok(text.includes(iso.lizenz), 'die Quellenangabe von iso4217 steht in ' + datei);
  }
  assert.ok(!REGION.includes(iso.lizenz), 'die Lizenzzeile steht nicht in der Region');
});
