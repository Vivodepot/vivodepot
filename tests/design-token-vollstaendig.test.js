'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Design-Tokens vollständig setzbar — U2-ADR-473, Wagen v894.
   ────────────────────────────────────────────────────────────────────────────
   Der Befund, aus dem diese Wache kommt (02.10.2026): `DESIGN_TOKEN_KATEGORIE`
   führte 69 von 124 `:root`-Tokens. Die Tabelle war am 06.09. vollständig; was
   danach in `:root` kam (die Schriftstufen `--fs-sm/-base/-lg`, die Rollen
   `--fs-role-*`, die Sub-Depot-Palette jenseits von hafer/schilf), kam ohne
   Eintrag. Ein Profil konnte die Schriftstufen darum gar nicht setzen — ohne
   dass irgendetwas rot wurde. Ein neues Token in `:root` braucht jetzt einen
   Eintrag: Kategorie, reserviert oder ausdrücklich fest.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const { kernMitHeute } = require('./helfer/kern-mit-erscheinungsbild.js');   // v894: Werte kommen mit dem Erscheinungsbild
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN_TEXT = kernMitHeute(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
const SCHEMA = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'design-modul', 'design-modul-schema.json'), 'utf8'));

/* Ausdrücklich FEST — kein Profil setzt sie. Jede Zeile mit Grund. */
const FEST = {
  '--notiz-papier': 'Vorführungszettel: „Papier bleibt Papier", auch im dunklen Modus',
  '--notiz-tinte': 'Vorführungszettel', '--notiz-leise': 'Vorführungszettel',
  '--notiz-fs': 'Vorführungszettel', '--notiz-fs-mehr': 'Vorführungszettel', '--notiz-fs-schmal': 'Vorführungszettel',
  '--notiz-radius': 'Vorführungszettel', '--notiz-schatten': 'Vorführungszettel',
  '--notiz-nadel-schatten': 'Vorführungszettel',
};

/* Der :root-Block im <style id="design-system">, klammerbalanciert, ohne Kommentare. */
function rootTokens(text) {
  const s = text.indexOf(':root {', text.indexOf('<style id="design-system">'));
  let t = 0, j = text.indexOf('{', s);
  for (; j < text.length; j++) { if (text[j] === '{') t++; else if (text[j] === '}' && --t === 0) break; }
  const koerper = text.slice(s, j).replace(/\/\*[\s\S]*?\*\//g, '');
  return Object.fromEntries([...koerper.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function aufgeloest(wert, tokens, tiefe = 0) {
  if (tiefe > 10) return wert;
  return wert.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)/g, (_, n) => (n in tokens ? aufgeloest(tokens[n], tokens, tiefe + 1) : _));
}
const langHex = (w) => w.replace(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/, '#$1$1$2$2$3$3')
  .replace(/(\s)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/, '$1#$2$2$3$3$4$4');

test('[Token-Vollständigkeit] jedes :root-Token ist kategorisiert, reserviert oder ausdrücklich fest', () => {
  const V = ladeKern().V;
  const fehlend = Object.keys(rootTokens(KERN_TEXT)).filter((n) =>
    !Object.prototype.hasOwnProperty.call(V.DESIGN_TOKEN_KATEGORIE, n)
    && V.DESIGN_TOKEN_RESERVIERT.indexOf(n) < 0 && !Object.prototype.hasOwnProperty.call(FEST, n));
  assert.deepEqual(fehlend, [], 'ein neues :root-Token braucht einen Eintrag in DESIGN_TOKEN_KATEGORIE (oder FEST hier, mit Grund)');
});

test('[Token-Vollständigkeit] jedes kategorisierte Token steht in :root', () => {
  const V = ladeKern().V;
  const root = rootTokens(KERN_TEXT);
  const geister = Object.keys(V.DESIGN_TOKEN_KATEGORIE).filter((n) => !(n in root));
  assert.deepEqual(geister, [], 'ein Name, den kein :root führt, wird gesetzt und wirkt nirgends');
});

test('[Token-Vollständigkeit·Positivkontrolle] jeder Ab-Werk-Wert besteht die Prüfung seiner Kategorie', () => {
  // Sonst prüfte eine Kategorie eine engere Form, als der Kern selbst benutzt — ein Profil könnte
  // den heutigen Wert nicht einmal wiederherstellen.
  const V = ladeKern().V;
  const root = rootTokens(KERN_TEXT);
  const durchgefallen = [];
  for (const [n, kat] of Object.entries(V.DESIGN_TOKEN_KATEGORIE)) {
    if (kat === 'farbe' && /^#[0-9a-f]{3}$/i.test(root[n])) continue;   // Kurzform: s. Kern-Kommentar, Modul schreibt #rrggbb
    let w = aufgeloest(root[n], root);
    if (kat === 'rahmen' || kat === 'farbe') w = langHex(w);
    if (/^color-mix\(/.test(w)) continue;   // berechnete Fläche (--flaeche-hover): ein Modul setzt eine Farbe
    if (!V.designTokenWertGueltig(kat, w, n)) durchgefallen.push(`${n} (${kat}): ${w}`);
  }
  assert.deepEqual(durchgefallen, []);
});

test('[Token-Vollständigkeit] Kategorie wort nimmt nur die feste Auswahl an', () => {
  const V = ladeKern().V;
  assert.equal(V.designTokenWertGueltig('wort', 'none', '--label-schreibung'), true);
  assert.equal(V.designTokenWertGueltig('wort', 'uppercase', '--label-schreibung'), true);
  assert.equal(V.designTokenWertGueltig('wort', 'full-width', '--label-schreibung'), false, 'gültiges CSS, aber nicht in der Auswahl');
  assert.equal(V.designTokenWertGueltig('wort', 'none', '--frei'), false, 'ein Wort-Token ohne Auswahl nimmt nichts an');
  assert.equal(V.designTokenWertGueltig('wort', 'none'), false, 'ohne Namen keine Auswahl');
  for (const n of Object.keys(V.DESIGN_TOKEN_WORT)) assert.equal(V.DESIGN_TOKEN_KATEGORIE[n], 'wort', n);
  for (const [n, k] of Object.entries(V.DESIGN_TOKEN_KATEGORIE)) if (k === 'wort') assert.ok(V.DESIGN_TOKEN_WORT[n], n + ' ohne Auswahl');
});

test('[Token-Vollständigkeit] Rahmen, Schleier und Schatten mit Ausbreitung prüfen ihre Form', () => {
  const V = ladeKern().V;
  assert.equal(V.designTokenWertGueltig('rahmen', 'none'), true, 'ein randloses Profil');
  assert.equal(V.designTokenWertGueltig('rahmen', '1px solid #d8d2c4'), true);
  assert.equal(V.designTokenWertGueltig('rahmen', '1px solid red'), false);
  assert.equal(V.designTokenWertGueltig('rahmen', '1px solid var(--x)'), false);
  assert.equal(V.designTokenWertGueltig('schleier', 'rgba(0,0,0,0.04)'), true);
  assert.equal(V.designTokenWertGueltig('schleier', '#000000'), false, 'deckend ist „farbe"');
  assert.equal(V.designTokenWertGueltig('schatten', '0 0 0 3px rgba(0,0,0,0.04)'), true, 'Ausbreitung');
  assert.equal(V.designTokenWertGueltig('schatten', '0 1px 2px rgba(0,0,0,.1), 0 2px 4px rgba(0,0,0,.1)'), false, 'keine Liste');
  assert.equal(V.designTokenWertGueltig('zahl', '600'), true);
});

test('[Token-Vollständigkeit] das Schema führt genau die setzbaren Tokens, je mit ihrer Kategorie', () => {
  // Setzbar = kategorisiert und nicht reserviert. Ein reserviertes Token kann kategorisiert bleiben
  // (seine Form ist bekannt), ein Modul darf es trotzdem nicht setzen — also steht es nicht im Schema.
  const V = ladeKern().V;
  const props = SCHEMA.properties.tokens.properties;
  const setzbar = Object.keys(V.DESIGN_TOKEN_KATEGORIE).filter((n) => V.DESIGN_TOKEN_RESERVIERT.indexOf(n) < 0);
  assert.deepEqual(Object.keys(props).sort(), setzbar.sort());
  for (const n of setzbar) {
    const k = V.DESIGN_TOKEN_KATEGORIE[n];
    const ref = props[n].$ref || '';
    if (k === 'wort') assert.deepEqual(props[n].enum, [...V.DESIGN_TOKEN_WORT[n]], n);
    else assert.equal(ref, '#/$defs/' + k, n);
  }
});
