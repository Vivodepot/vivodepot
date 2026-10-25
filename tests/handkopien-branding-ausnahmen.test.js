'use strict';
/* Die Ausnahmen der Handkopie BRANDING_MODUL_SCHLUESSEL im Studio (U2-ADR-473 W2): genau `erscheinung` und `poweredByAus`, je mit einem
   Grund im Eintrag der Registry (tools/handkopien-gegen-original-pruefen.js). Sonst ist die Kopie byte-gleich mit dem Kern: der Text der
   Kern-Deklaration ohne die zwei Namen ist der Text der Studio-Deklaration, Zeichen für Zeichen. Privat wie das Studio selbst. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REGISTRY } = require('../tools/handkopien-gegen-original-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const STUDIO = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
const AUSNAHMEN = ['erscheinung', 'poweredByAus'];
const KOPF = 'const BRANDING_MODUL_SCHLUESSEL = Object.freeze([';

// Die Deklaration bis `]);`. Im Studio die Handkopie, also die erste vor dem erzeugten Bereich EINLASS-REGELN.
function deklaration(text, bis) {
  const a = text.indexOf(KOPF);
  if (a < 0 || (bis >= 0 && a > bis)) return null;
  return text.slice(a, text.indexOf(']);', a) + 3);
}
function abweichung(kern, studio) {
  const k = deklaration(kern, -1);
  const s = deklaration(studio, studio.indexOf('/* EINLASS-REGELN:BEGIN'));
  if (!k || !s) return 'Deklaration fehlt';
  const ohne = k.replace(AUSNAHMEN.map((n) => " '" + n + "',").join(''), '');
  if (ohne === k) return 'die Ausnahmen stehen im Kern nicht an ihrer Stelle';
  return Buffer.compare(Buffer.from(ohne, 'utf8'), Buffer.from(s, 'utf8')) === 0 ? null : 'Handkopie weicht ab';
}
function eintragVerstoesse(e) {
  const v = [];
  if (!e) return ['kein Eintrag'];
  if (JSON.stringify(e.ausnahmen) !== JSON.stringify(AUSNAHMEN)) v.push('Ausnahmen sind nicht genau ' + AUSNAHMEN.join(', '));
  const g = e.ausnahmeGruende || {};
  if (JSON.stringify(Object.keys(g)) !== JSON.stringify(e.ausnahmen || [])) v.push('nicht je Ausnahme genau ein Grund');
  for (const n of e.ausnahmen || []) if (!(typeof g[n] === 'string' && g[n].length > 40)) v.push('Grund fehlt: ' + n);
  return v;
}
const eintrag = () => REGISTRY.find((e) => e.label === 'BRANDING_MODUL_SCHLUESSEL');

test('[Handkopie·Branding] genau zwei Ausnahmen, je mit Grund; sonst ist die Kopie byte-gleich mit dem Kern', () => {
  assert.deepEqual(eintragVerstoesse(eintrag()), []);
  assert.equal(abweichung(KERN, STUDIO), null);
});

test('[Handkopie·Branding·Rot-Beweis] ein fehlender oder zusätzlicher Schlüssel, eine dritte Ausnahme, ein fehlender Grund schlagen an', () => {
  const s = deklaration(STUDIO, STUDIO.indexOf('/* EINLASS-REGELN:BEGIN'));
  assert.equal(abweichung(KERN, STUDIO.replace(s, s.replace("'logo', ", ''))), 'Handkopie weicht ab', 'fehlender Schlüssel');
  assert.equal(abweichung(KERN, STUDIO.replace(s, s.replace("'logo', ", "'logo', 'fremd', "))), 'Handkopie weicht ab', 'zusätzlicher Schlüssel');
  assert.equal(abweichung(KERN, STUDIO.replace(s, s.replace("'logo', ", "'logo',  "))), 'Handkopie weicht ab', 'andere Bytes');
  const e = eintrag();
  assert.deepEqual(eintragVerstoesse(Object.assign({}, e, { ausnahmen: AUSNAHMEN.concat(['logo']) })),
    ['Ausnahmen sind nicht genau erscheinung, poweredByAus', 'nicht je Ausnahme genau ein Grund', 'Grund fehlt: logo']);
  assert.deepEqual(eintragVerstoesse(Object.assign({}, e, { ausnahmeGruende: { erscheinung: e.ausnahmeGruende.erscheinung } })),
    ['nicht je Ausnahme genau ein Grund', 'Grund fehlt: poweredByAus']);
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Der Wächter prüft daneben `abweichung` (Byte-Gleichheit). */
module.exports = {
  PROBEN: [
    { fuer: '[Handkopie·Branding] genau zwei Ausnahmen, je mit Grund; sonst ist die Kopie byte-gleich mit dem Kern', diskriminante: eintragVerstoesse },
  ],
};
