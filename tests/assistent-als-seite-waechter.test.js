'use strict';
/* Wächter: der Assistent ist EINE Seite (U-AS, Entwurf A, 21.11.2026).
   Die Schrittansicht mit „Weiter“, „Zurück“ und „Schritt n von m“ ist entfallen. Dieser Wächter hält fest, dass sie nicht
   zurückkommt — weder im Kern (renderWizard) noch als Klick in einer Browser-Probe. Die Funktionen wizardWeiter/wizardZurueck
   bleiben als Schnittstelle der Node-Proben; gemeint ist hier das, was die Person sieht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');

function renderWizardQuelle(src) {
  const a = src.indexOf('function renderWizard() {');
  if (a < 0) return '';
  const b = src.indexOf('\n}\n', a);
  return src.slice(a, b + 2);
}
function schrittFormImKern(src) {
  const q = renderWizardQuelle(src);
  const funde = [];
  if (/id="wiz-weiter"/.test(q)) funde.push('Knopf „Weiter“');
  if (/id="wiz-zurueck"/.test(q)) funde.push('Knopf „Zurück“');
  if (/STRINGS\.wizSchritt\b/.test(q)) funde.push('„Schritt n von m“');
  if (!/data-wiz-idx/.test(src)) funde.push('keine Zeilen je Frage');
  return funde;
}
function klickAufWeiter(texte) {
  return Object.entries(texte).filter(([, t]) => /click\(\s*['"]#wiz-(weiter|zurueck)['"]\s*\)/.test(t)).map(([d]) => d);
}
function specTexte() {
  const dir = path.join(WURZEL, 'tests', 'e2e');
  const raus = {};
  for (const d of fs.readdirSync(dir)) if (d.endsWith('.js')) raus['tests/e2e/' + d] = fs.readFileSync(path.join(dir, d), 'utf8');
  return raus;
}

const KOPPLUNG = { PROBEN: [
  { fuer: '[Assistent·Seite] renderWizard baut Zeilen, keinen „Weiter“-Knopf und keine Schrittzählung', diskriminante: schrittFormImKern },
  { fuer: '[Assistent·Seite] keine Browser-Probe klickt „Weiter“ oder „Zurück“', diskriminante: klickAufWeiter },
] };
void KOPPLUNG;

test('[Assistent·Seite] renderWizard baut Zeilen, keinen „Weiter“-Knopf und keine Schrittzählung', () => {
  assert.ok(renderWizardQuelle(KERN).length > 200, 'renderWizard nicht gefunden');
  assert.deepEqual(schrittFormImKern(KERN), []);
});

test('[Assistent·Seite] keine Browser-Probe klickt „Weiter“ oder „Zurück“', () => {
  assert.deepEqual(klickAufWeiter(specTexte()), []);
});

test('[Assistent·Seite·Rot-Beweis] die alte Schrittform und ein alter Klick fallen auf', () => {
  const alt = 'function renderWizard() {\n  let html = escapeHTML(STRINGS.wizSchritt) + \'<button id="wiz-weiter">\';\n}\n';
  assert.deepEqual(schrittFormImKern(alt), ['Knopf „Weiter“', '„Schritt n von m“', 'keine Zeilen je Frage']);
  assert.deepEqual(klickAufWeiter({ 'a.spec.js': "await page.click('#wiz-weiter');", 'b.spec.js': 'await assistentWeiter(page);' }), ['a.spec.js']);
});
