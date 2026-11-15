'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Jede Ansicht steht im Verlauf des Browsers (11.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Zurück im Browser führt eine Ansicht zurück und nicht aus dem offenen Depot
   (Probe im Browser: tests/e2e/browser-zurueck-bleibt-im-depot.spec.js).
   Dieser Wächter hält die Klasse: Kommt eine Ansicht dazu, steht sie in genau einer der beiden Listen im Kern,
   `VERLAUF_ANSICHTEN` (bekommt einen Eintrag) oder `VERLAUF_OHNE_EINTRAG` (bewusst ohne). Eine Ansicht in
   keiner Liste wäre über Zurück nicht erreichbar, ohne dass es jemand entschieden hat.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function liste(quelle, name) {
  const m = quelle.match(new RegExp('const ' + name + ' = \\[([^\\]]*)\\];'));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
}
function ansichtenImKern(quelle) {
  return [...new Set([...quelle.matchAll(/(?<![=!'`])\baktiveAnsicht = '([a-z-]+)'/g)].map((x) => x[1]))].sort();
}
function befund(quelle) {
  const mit = liste(quelle, 'VERLAUF_ANSICHTEN'), ohne = liste(quelle, 'VERLAUF_OHNE_EINTRAG');
  if (!mit || !ohne) return ['Listen fehlen'];
  const fehler = [];
  for (const a of ansichtenImKern(quelle)) {
    const n = (mit.includes(a) ? 1 : 0) + (ohne.includes(a) ? 1 : 0);
    if (n !== 1) fehler.push(a + ' steht in ' + n + ' Listen');
  }
  if (!/function renderContent\(springeNachOben\) \{[\s\S]{0,700}?renderContentInner\(\);[\s\S]{0,300}?try \{ ansichtImVerlaufVermerken\(\); \}/.test(quelle)) fehler.push('renderContent vermerkt die Ansicht nicht');
  if (!/addEventListener\('popstate', \(e\) => \{ try \{ ansichtAusVerlaufOeffnen\(/.test(quelle)) fehler.push('popstate ist nicht verdrahtet');
  return fehler;
}

test('[Verlauf·Ansicht] jede Ansicht des Kerns steht in genau einer Liste, Vermerk und Zurück sind verdrahtet', () => {
  assert.ok(ansichtenImKern(KERN).length >= 10, 'Vorbedingung: die Suche findet die Ansichten des Kerns');
  assert.deepEqual(befund(KERN), []);
});

test('[Verlauf·Ansicht] der Eintrag trägt nur Kennungen und ändert die Adresse nicht', () => {
  const aufrufe = [...KERN.matchAll(/history\.(?:pushState|replaceState)\(([^;]*)\);/g)].map((x) => x[1]);
  assert.ok(aufrufe.length >= 2, 'Vorbedingung: es gibt Einträge im Verlauf');
  for (const a of aufrufe) {
    assert.match(a, /^\{ (?:vdBoden: true|vdAnsicht: (?:bild|_verlaufBild\(\))) \}, ''$/, 'Eintrag ohne Adresse und nur mit Kennungen: ' + a);
  }
  const bild = (KERN.match(/function _verlaufBild\(\) \{([\s\S]*?)\n\}/) || [])[1] || '';
  assert.doesNotMatch(bild, /\bdata\b|akteur|name|wert/i, 'das Bild der Ansicht liest keine Angabe');
});

test('[Verlauf·Ansicht·Rot-Beweis] eine neue Ansicht ohne Listenplatz und ein entfernter Vermerk werden rot', () => {
  const neu = KERN.replace("aktiveAnsicht = 'mappe';", "aktiveAnsicht = 'mappe'; if (0) aktiveAnsicht = 'probe-neu';");
  assert.notEqual(neu, KERN, 'Vorbedingung: die Stelle zum Verändern existiert');
  assert.deepEqual(befund(neu), ['probe-neu steht in 0 Listen']);
  const ohneVermerk = KERN.replace('try { ansichtImVerlaufVermerken(); } catch (_) {}', '');
  assert.deepEqual(befund(ohneVermerk), ['renderContent vermerkt die Ansicht nicht']);
});
