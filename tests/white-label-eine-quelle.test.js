'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter gegen die Klasse „ein sichtbares Fall-2-Merkmal kennt nur das signierte Bündel“
   (Befund WHITE-LABEL-AB-WERK-OHNE-LOGO-FARBE, U2-ADR-297-Nachtrag 05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Der Befund: Kopfzeilenfarbe, Logo und Palette nahmen nur `echtesBuendel`, Name und Domain dagegen
   schon die Ab-Werk-Saat. Ein Partnerprodukt aus der Bau-Region zeigte darum den Partnernamen auf
   Vivodepots Grün mit Vivodepots Bildmarke. Die Klasse: ein neues White-Label-Merkmal, das wieder nur
   eine der Quellen liest.

   Die Merkmale von Fall 2 und ihre eine Quelle (signiertes Vor-Depot-Bündel, sonst Partner-Branding der
   Bau-Region), am Kern erhoben:
     Kopfzeilenfarbe, Kopfzeilen-Logo  _brandingProduktTopbarAnwenden(faerbend, …)
     Palette                           _brandingPaletteAnwenden(faerbend, …)
     Bildmarke (Kopf, Willkommen, Dialoge)  _vdBildmarkeHTML / _brandingProduktIconAnwenden, Stand _fall2Marke
     Modell A/B                        _brandingModellAus(echtesBuendel || Region), ein Aufrufer
     Name, Titel, Rand-CSS             _letztesBrandingOderAbWerk(ziel.brandingModule) → Bündel, sonst _AB_WERK_BRANDING
     PDF-Kopf/-Fuß                     _pdfMarke → _letztesBrandingOderAbWerk(_brandingModulListeAktiv())
   Die letzten zwei fallen ohne Bündel auf `_AB_WERK_BRANDING` zurück, das für ein Partnerprodukt dasselbe
   geprüfte Branding ist, das `_abWerkPartnerBranding` liefert. Diese Probe hält beides fest: strukturell (jede
   Aufrufstelle nimmt `faerbend`, jede Bildmarke geht durch den einen Helfer) und im Verhalten (ein
   Partnerprodukt zeigt in JEDEM Merkmal den Partner).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Ausgeführter Code ohne Zeilenkommentare und Blockkommentare (grob, reicht für Aufrufstellen). */
function code(quelle) {
  return quelle.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((z) => z.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
}

/* Die Verstöße gegen „eine Quelle“ in einem Kern-Text. */
function eineQuelleVerstoesse(quelle) {
  const c = code(quelle);
  const v = [];
  const aufrufe = (name) => [...c.matchAll(new RegExp('(?<!function )\\b' + name + '\\(([^,)]*)', 'g'))].map((m) => m[1].trim());
  for (const name of ['_brandingProduktTopbarAnwenden', '_brandingPaletteAnwenden']) {
    const a = aufrufe(name);
    if (a.length !== 1) v.push(name + ': ' + a.length + ' Aufrufe statt genau einem (am Vor-Depot-Ort)');
    for (const arg of a) if (arg !== 'faerbend') v.push(name + '(' + arg + ', …) statt (faerbend, …)');
  }
  const icon = aufrufe('_brandingProduktIconAnwenden');
  if (icon.length !== 1) v.push('_brandingProduktIconAnwenden: ' + icon.length + ' Aufrufe statt einem (in der Kopfzeilen-Funktion)');
  const modell = aufrufe('_brandingModellAus');
  if (modell.length !== 1) v.push('_brandingModellAus: ' + modell.length + ' Aufrufe statt einem (am Vor-Depot-Ort)');
  if (!/const faerbend = echtesBuendel \|\| _abWerkPartnerBranding\(\);/.test(c)) v.push('faerbend ist nicht „echtesBuendel || _abWerkPartnerBranding()“');
  const stand = [...c.matchAll(/\b_fall2Marke\s*=(?!=)/g)].length;
  if (stand !== 2) v.push('_fall2Marke wird an ' + stand + ' Stellen gesetzt statt an zwei (Vorgabe und Kopfzeilen-Icon)');
  // Die Bildmarke steht wörtlich nur in der Symbol-Definition, der statischen Kopfzeile vor dem ersten Lauf und im einen Helfer.
  const bildmarke = (c.match(/href="#vd-logo"/g) || []).length;
  if (bildmarke !== 2) v.push('href="#vd-logo" steht ' + bildmarke + '-mal im Code statt zweimal (statische Kopfzeile, _VD_BILDMARKE_SVG) — jede weitere Bildmarke muss durch _vdBildmarkeHTML');
  // _abWerkPartnerBranding liest nur die Bau-Region.
  const m = c.match(/function _abWerkPartnerBranding\(\) \{([\s\S]*?)\n\}/);
  if (!m) v.push('_abWerkPartnerBranding fehlt');
  else if (/\bdata\b|brandingModule|_vorDepot/.test(m[1])) v.push('_abWerkPartnerBranding liest mehr als die Bau-Region');
  return v;
}

test('[White Label·eine Quelle] jedes sichtbare Fall-2-Merkmal nimmt dieselbe Quelle (faerbend), jede Bildmarke geht durch den einen Helfer', () => {
  assert.deepEqual(eineQuelleVerstoesse(KERN), []);
});

test('[White Label·eine Quelle·Rot-Beweis] die Palette wieder an echtesBuendel gebunden — der Wächter schlägt an', () => {
  const a = '    _brandingPaletteAnwenden(faerbend, root);';
  assert.equal(KERN.split(a).length, 2, 'Vorbedingung');
  const funde = eineQuelleVerstoesse(KERN.replace(a, '    _brandingPaletteAnwenden(echtesBuendel, root);'));
  assert.ok(funde.some((x) => x.startsWith('_brandingPaletteAnwenden(echtesBuendel')), funde.join(' · '));
});

test('[White Label·eine Quelle·Rot-Beweis] eine neue wörtliche Bildmarke an einem Dialog vorbei am Helfer — der Wächter schlägt an', () => {
  const a = "titelHTML: '<span class=\"modal-logo\">' + _vdBildmarkeHTML('logo-svg') + '</span>' +";
  assert.ok(KERN.includes(a), 'Vorbedingung');
  const funde = eineQuelleVerstoesse(KERN.replace(a, "titelHTML: '<span class=\"modal-logo\"><svg><use href=\"#vd-logo\"/></svg></span>' +"));
  assert.ok(funde.some((x) => x.includes('#vd-logo')), funde.join(' · '));
});

test('[White Label·eine Quelle·Rot-Beweis] _abWerkPartnerBranding, die das Depot mitliest — der Wächter schlägt an', () => {
  const a = '  if (!AB_WERK_BRANDING_PRODUKT || typeof AB_WERK_BRANDING_PRODUKT !== \'object\' || !_AB_WERK_BRANDING) return null;';
  assert.equal(KERN.split(a).length, 2, 'Vorbedingung');
  const funde = eineQuelleVerstoesse(KERN.replace(a, '  if (data && data.brandingModule) return data.brandingModule[0];\n' + a));
  assert.ok(funde.includes('_abWerkPartnerBranding liest mehr als die Bau-Region'), funde.join(' · '));
});

/* Im Verhalten: ein Partnerprodukt aus der Bau-Region zeigt in jedem Merkmal den Partner — auch Name, Titel und PDF. */
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const PARTNER = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-probe', name: 'Probebank Musterort', farbePrimaer: '#1b3a5c', farbeSekundaer: '#7a5c1e', logo: LOGO };

function merkmaleVerstoesse(V, root) {
  const v = [];
  const w = root.style._werte;
  if (w['--vd-branding-topbar-primaer'] !== PARTNER.farbePrimaer) v.push('Kopfzeilenfarbe');
  if (!w['--salbei-dunkel']) v.push('Palette');
  if (w['--vd-branding-primaer'] !== PARTNER.farbePrimaer) v.push('Rand-CSS');
  if (V._markeName() !== PARTNER.name) v.push('Name: ' + V._markeName());
  const pdf = V._pdfMarke();
  if (pdf.name !== PARTNER.name) v.push('PDF-Name: ' + pdf.name);
  if (pdf.standard) v.push('PDF hält das Partnerprodukt für die Standardmarke');
  return v;
}

test('[White Label·eine Quelle] ein Partnerprodukt aus der Bau-Region zeigt in jedem Fall-2-Merkmal den Partner', async () => {
  const { V } = ladeKern({ brandingProdukt: PARTNER });
  const root = { style: { _werte: {}, setProperty(k, x) { this._werte[k] = x; }, removeProperty(k) { delete this._werte[k]; } }, querySelector: () => null };
  await V.vorDepotKonfigurationAnwenden([], root, { jetzt: '2026-08-28T09:00:00Z' });
  assert.deepEqual(merkmaleVerstoesse(V, root), []);
});

/* Proben-Deklaration (U2-ADR-099 B-2). */
module.exports = {
  PROBEN: [
    { fuer: '[White Label·eine Quelle] jedes sichtbare Fall-2-Merkmal nimmt dieselbe Quelle (faerbend), jede Bildmarke geht durch den einen Helfer', diskriminante: eineQuelleVerstoesse },
    { fuer: '[White Label·eine Quelle] ein Partnerprodukt aus der Bau-Region zeigt in jedem Fall-2-Merkmal den Partner', diskriminante: merkmaleVerstoesse },
  ],
};
