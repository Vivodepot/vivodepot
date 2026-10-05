'use strict';
/* ════════════════════════════════════════════════════════════════════════
   fremdquellen-hinweis-sichtbar.test.js — die Pflichthinweise fremder Codesysteme stehen sichtbar und wörtlich da (04.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund LOINC-PFLICHTHINWEIS-DOWNLOADSTELLEN: der LOINC-Hinweis stand im Kern nur als Konstante, sichtbar nirgends; die
   Lizenz verlangt ihn „on the same Internet page from which the product is available for download“ — und die Seite IST die
   App. SNOMED (GPS, CC BY-ND 4.0) verlangt die Namensnennung. Seitdem: Einstellungen → Anbieter (Herkunftsort) zeigt beide
   wörtlich, englisch; die README (Downloadseite des Repos) trägt beide; jede openCoDE-Release-Beschreibung trägt beide.
   Die Wortlaute kommen aus code-listen/wortlaut/ — einer Quelle, von dort byte-gleich in den Kern (build-code-listen).
   Rot-Beweise: ein geänderter Wortlaut und eine fehlende Zeile fallen auf; ein Hinweis nur als Konstante ist nicht sichtbar.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const R = require('../tools/opencode-release-vorbereiten.js');

const REPO = path.join(__dirname, '..');
const WORTLAUT = {
  loinc: fs.readFileSync(path.join(REPO, 'code-listen/wortlaut/LOINC_short_license.txt'), 'utf8'),
  snomedAllergen: fs.readFileSync(path.join(REPO, 'code-listen/wortlaut/snomed-gps-hinweis.txt'), 'utf8'),
};
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Die sichtbaren Hinweise einer gerenderten Ansicht: { quelle: text } aus den Absätzen mit data-fremdquelle. */
function hinweise(html) {
  const aus = {};
  for (const m of html.matchAll(/<p class="[^"]*\bherkunft-fremdquelle\b[^"]*" lang="en" data-fremdquelle="([A-Za-z]+)">([^<]*)<\/p>/g)) aus[m[1]] = m[2];
  return aus;
}
function befunde(html) {
  const h = hinweise(html);
  const b = [];
  for (const [k, w] of Object.entries(WORTLAUT)) {
    if (!(k in h)) b.push(k + ': nicht sichtbar');
    else if (h[k] !== esc(w)) b.push(k + ': Wortlaut weicht ab');
  }
  return b;
}

test('[Fremdquellen·sichtbar] Einstellungen → Anbieter zeigt LOINC und SNOMED wörtlich, englisch, am Herkunftsort', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  assert.deepEqual(befunde(html), []);
  const herkunft = html.slice(html.indexOf('data-herkunftsort="1"'));
  assert.ok(herkunft.indexOf('data-fremdquelle="loinc"') > 0 && herkunft.indexOf('data-fremdquelle="snomedAllergen"') > 0, 'im Herkunftsort, nicht anderswo');
});

test('[Fremdquellen·sichtbar·Rot-Beweis] ein geänderter Wortlaut, eine fehlende Zeile und ein Hinweis nur als Konstante fallen auf', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  assert.ok(befunde(html.replace('Regenstrief Institute, Inc. and', 'Regenstrief Institute and')).includes('loinc: Wortlaut weicht ab'));
  assert.ok(befunde(html.replace(/<p class="[^"]*herkunft-fremdquelle[^"]*" lang="en" data-fremdquelle="snomedAllergen">[^<]*<\/p>/, '')).includes('snomedAllergen: nicht sichtbar'));
  assert.deepEqual(befunde('<script>const LIZENZ_WORTLAUT = { loinc: ' + JSON.stringify(WORTLAUT.loinc) + ' };</script>'), ['loinc: nicht sichtbar', 'snomedAllergen: nicht sichtbar']);
});

test('[Fremdquellen·Wortlaut] Kern, README und Release-Beschreibung tragen dieselben Bytes wie code-listen/wortlaut/', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.ok(kern.includes('loinc: ' + JSON.stringify(WORTLAUT.loinc)), 'LIZENZ_WORTLAUT.loinc');
  assert.ok(kern.includes('snomedAllergen: ' + JSON.stringify(WORTLAUT.snomedAllergen)), 'LIZENZ_WORTLAUT.snomedAllergen');
  const readme = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8');
  assert.ok(readme.includes('## LOINC\n\n' + WORTLAUT.loinc + '\n'), 'README: LOINC');
  assert.ok(readme.includes('## SNOMED CT\n\n' + WORTLAUT.snomedAllergen + '\n'), 'README: SNOMED CT');
  const r = R.releaseVorbereiten({ quelle: R.FIXTURE, fassung: 'v1.0.1' });
  assert.deepEqual(r.fehler, []);
  assert.ok(r.release.description.includes('### LOINC\n\n' + WORTLAUT.loinc), 'Release: LOINC');
  assert.ok(r.release.description.includes('### SNOMED CT\n\n' + WORTLAUT.snomedAllergen), 'Release: SNOMED CT');
});

/* Die zwei https-Adressen aus dem SNOMED-Wortlaut stehen in der Positivliste (Wort der Gegenlesung, 04.10.2026) unter drei
   Bedingungen: nur in der Region LIZENZ-WORTLAUT (die Liste kennt keine Ortsbindung, darum diese Probe); kein Abruf (CSP,
   connect-src und jeder fetch-Pfad liegen außerhalb der Region); nicht klickbar ohne Kennzeichnung (heute gar nicht klickbar). */
const ADRESSEN = ['https://creativecommons.org/licenses/by-nd/4.0/', 'https://www.snomed.org/gps'];
function adressenBefunde(kern) {
  const b = kern.indexOf('/* LIZENZ-WORTLAUT:BEGIN');
  const e = kern.indexOf('/* LIZENZ-WORTLAUT:END');
  if (b < 0 || e < b) return ['Region LIZENZ-WORTLAUT nicht gefunden'];
  const aussen = kern.slice(0, b) + kern.slice(e);
  const befunde = [];
  for (const a of ADRESSEN) {
    const n = aussen.split(a).length - 1;
    if (n) befunde.push(a + ': ' + n + '× außerhalb der Region LIZENZ-WORTLAUT');
    if (!kern.slice(b, e).includes(a)) befunde.push(a + ': steht nicht in der Region');
  }
  return befunde;
}

test('[Fremdquellen·Adressen] die zwei Adressen des SNOMED-Wortlauts stehen nur in LIZENZ-WORTLAUT — kein Abruf, kein Link', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.deepEqual(adressenBefunde(kern), []);
  // Dass beide Adressen in der Positivliste der https-Adressen stehen, hält deren eigene Probe (drinnen).
});

test('[Fremdquellen·Adressen·Rot-Beweis] ein fetch, ein connect-src und ein Link auf eine der Adressen fallen auf', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const vorne = (zusatz) => zusatz + '\n' + kern;
  assert.match(adressenBefunde(vorne('// siehe https://creativecommons.org/licenses/by-nd/4.0/')).join(), /creativecommons.*1× außerhalb/);
  assert.match(adressenBefunde(vorne("fetch('https://www.snomed.org/gps');")).join(), /snomed\.org\/gps: 1× außerhalb/);
  assert.match(adressenBefunde(vorne('<meta http-equiv="Content-Security-Policy" content="connect-src https://creativecommons.org/licenses/by-nd/4.0/">')).join(), /creativecommons.*1× außerhalb/);
  assert.match(adressenBefunde(vorne('<a href="https://www.snomed.org/gps">GPS</a>')).join(), /snomed\.org\/gps: 1× außerhalb/);
});
