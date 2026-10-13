'use strict';
/* Befund E2E-TOAST-RELATIV-GEZAEHLT (08.10.2026): Eine E2E-Probe zählte Toasts relativ — `toHaveCount(vorher + 1)`. Toasts
   sind flüchtig: sie laufen nach 3200 ms von selbst ab. Dauert der Schritt dazwischen länger (ein falsches Passwort wird
   per PBKDF2 langsam abgeleitet), sind die alten Toasts fort, bevor der neue erscheint, und „vorher + 1“ wird nie erreicht —
   rot je nach Last, nicht je nach Code (gemessen im Air-Lauf 37821342635).
   Die Klasse: eine Zählung, die sich auf einen vorher gelesenen Bestand flüchtiger Elemente bezieht. Gesucht wird ein
   Element an seinem Inhalt (`{ hasText }`), nicht an einer Differenz.
   Dieser Wächter liest alle E2E-Ordner und verbietet (1) `toHaveCount(<Name> ± <Zahl>)` und (2) eine Zählung der
   Toast-Liste (`.toast…count()`). Rot-Beweis und Gegenprobe stehen unten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname);
// Jeder E2E-Ordner unter tests/, gefunden statt aufgezählt: ein neuer Ordner ist ohne Nachtrag gedeckt, und ein Ordner,
// der im öffentlichen Zuschnitt fehlt, fehlt hier einfach mit.
const ORDNER = fs.readdirSync(WURZEL, { withFileTypes: true }).filter((e) => e.isDirectory() && /^e2e/.test(e.name)).map((e) => e.name);
const RELATIV = /toHaveCount\(\s*[A-Za-z_$][\w$]*\s*[+-]\s*\d/;
const TOAST_ZAEHLUNG = /toast[^\n;]{0,80}\.count\(\)/;

function specDateien(ordner) {
  const dir = path.join(WURZEL, ordner);
  if (!fs.existsSync(dir)) return [];
  const raus = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) raus.push(...specDateien(path.join(ordner, e.name)));
    else if (/\.(spec|test)\.[cm]?js$/.test(e.name)) raus.push(p);
  }
  return raus;
}
function funde(text, datei) {
  const raus = [];
  text.split('\n').forEach((z, i) => {
    if (/^\s*(\/\/|\*)/.test(z)) return;   // Kommentare erzählen vom Befund, sie zählen nicht
    if (RELATIV.test(z)) raus.push(datei + ':' + (i + 1) + ' relative Zählung');
    if (TOAST_ZAEHLUNG.test(z)) raus.push(datei + ':' + (i + 1) + ' Toast-Zählung');
  });
  return raus;
}

test('[E2E·Zählung] keine Probe zählt flüchtige Elemente relativ zu einem vorher gelesenen Bestand', () => {
  const alle = [];
  for (const o of ORDNER) for (const d of specDateien(o)) alle.push(...funde(fs.readFileSync(d, 'utf8'), path.relative(WURZEL, d)));
  assert.deepEqual(alle, [], 'am Inhalt suchen ({ hasText }), nicht an einer Differenz');
});

test('[E2E·Zählung] die Ordner gibt es und sie tragen Proben — sonst bestünde der Wächter leer', () => {
  assert.ok(specDateien('e2e').length > 10, 'tests/e2e trägt Proben');
});

test('[E2E·Zählung·Rot-Beweis] die Form des Befunds fällt, die Gegenprobe mit hasText nicht', () => {
  const befund = [
    "  const toastsVorher = await page.locator('#toast-host .toast').count();",
    "  await expect(page.locator('#toast-host .toast')).toHaveCount(toastsVorher + 1, { timeout: 5000 });",
  ].join('\n');
  assert.equal(funde(befund, 'x').length, 2, 'beide Zeilen der alten Probe würden gefunden');
  const gegen = "  await expect(page.locator('#toast-host .toast', { hasText: 'Passwort stimmt nicht' })).toHaveCount(1, { timeout: 15000 });";
  assert.deepEqual(funde(gegen, 'x'), [], 'die Suche am Inhalt ist erlaubt');
  assert.deepEqual(funde('  // früher: toHaveCount(toastsVorher + 1)', 'x'), [], 'ein Kommentar ist kein Fund');
});
