'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sub-Depot-Partner-Palette (Marke-Achse-Plan §5/§6 Schritt 6, 14.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung „Option A": acht Partner-Töne als eigenes
   Konfektionierungsfeld, vom Partner kuratiert — keine Ableitung aus nur zwei
   Markenfarben. Läuft durch dieselbe AA-Kontrastprüfung, die die acht
   Haus-Töne implizit erfüllen (gemessen: roh ≥1.5:1 gegen Weiß UND Papier —
   `hafer` liegt als niedrigster Haus-Ton bei 1.64/1.58). Reißt EIN Ton diesen
   Boden, wird die GANZE Partner-Palette verworfen — „reject, nicht darken",
   dieselbe Regel wie U2-ADR-408 (16-Rollen-Palette) und U2-ADR-297 (Topbar).

   `_SUBDEPOT_PALETTE_HEX` (die Haus-Palette) bleibt unverändert — der
   Rangfolge-Vorbau `_subdepotPaletteAktiv()` liegt DAVOR, genau wie
   `_AB_WERK_BRANDING`/`AB_WERK_BRANDING_PRODUKT`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Acht echte, unterscheidbare Töne, alle ≥1.5:1 gegen Weiß/Papier (per Konstruktion kräftiger
// als die pastellenen Haus-Töne, damit die Probe nicht zufällig knapp an der Schwelle hängt).
const GUELTIGE_PARTNER_PALETTE = Object.freeze({
  hafer: '#8a6d3a', ton: '#a0522d', flieder: '#6a5acd', altrose: '#b0567a',
  nebel: '#4682b4', kiesel: '#8b7355', schilf: '#556b2f', malve: '#9932cc',
});

test('[Schritt 6·Nativ] _subdepotPaletteAktiv() liefert null ohne gesetzte Produkt-Region — kein Verhaltensunterschied ohne Partner-Palette', () => {
  const { V } = ladeKern();
  assert.equal(V.AB_WERK_SUBDEPOT_PALETTE_PRODUKT, null, 'Vorbedingung: die native Region ist leer');
  assert.equal(V._subdepotPaletteAktiv(), null);
});

test('[Schritt 6·Gültigkeitsprüfung] eine vollständige, kontraststarke Partner-Palette besteht die Prüfung', () => {
  const { V } = ladeKern();
  assert.equal(V._subdepotPartnerPaletteGueltig(GUELTIGE_PARTNER_PALETTE), true);
});

test('[Schritt 6·Gültigkeitsprüfung·Rot-Beweis] ein fehlender Token macht die GANZE Palette ungültig', () => {
  const { V } = ladeKern();
  const luecke = { ...GUELTIGE_PARTNER_PALETTE };
  delete luecke.malve;
  assert.equal(V._subdepotPartnerPaletteGueltig(luecke), false);
});

test('[Schritt 6·Gültigkeitsprüfung·Rot-Beweis] ein ungültiges Hex-Format macht die GANZE Palette ungültig', () => {
  const { V } = ladeKern();
  const kaputt = { ...GUELTIGE_PARTNER_PALETTE, ton: 'javascript:alert(1)' };
  assert.equal(V._subdepotPartnerPaletteGueltig(kaputt), false);
});

test('[Schritt 6·Gültigkeitsprüfung·Rot-Beweis] EIN Ton unter dem Kontrast-Boden verwirft die GANZE Palette, nicht nur den einen Ton', () => {
  const { V } = ladeKern();
  // #fefefe liegt praktisch auf Weiß — Kontrast gegen #ffffff/#fdfbf7 weit unter 1.5:1.
  const einTonZuBlass = { ...GUELTIGE_PARTNER_PALETTE, kiesel: '#fefefe' };
  assert.equal(V._subdepotPartnerPaletteGueltig(einTonZuBlass), false,
    'sieben gültige Töne dürfen den einen ungültigen nicht "ausgleichen" — die ganze Palette fällt');
});

test('[Schritt 6·Indirektion] _subDepotAkzentAlsHexOderNull liefert null für ein natives Token ohne aktive Partner-Palette', () => {
  const { V } = ladeKern();
  assert.equal(V._subDepotAkzentAlsHexOderNull('hafer'), null, 'var(--hafer) muss weiterhin gewinnen');
});

test('[Schritt 6·Indirektion] _subDepotAkzentAlsHexOderNull gibt weiterhin einen freien Hex unverändert zurück (White-Label-Pfad bleibt unberührt)', () => {
  const { V } = ladeKern();
  assert.equal(V._subDepotAkzentAlsHexOderNull('#334477'), '#334477');
});

/* ── Integrationsprobe: eine aktive Partner-Palette über eine Scratch-Kopie des echten Kerns ──
   AB_WERK_SUBDEPOT_PALETTE_PRODUKT ist eine reine Konfektionierungs-Region (wie
   AB_WERK_BRANDING_PRODUKT) — am saubersten über KERN_HTML_PATH gegen eine geschriebene
   Kopie geprüft, nicht durch Mutation des lebenden Sandbox-Objekts (das Modul liest die
   Konstante beim Laden, nicht zur Laufzeit). */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

function kernMitSubdepotPaletteLaden(palette) {
  const scratch = path.join(os.tmpdir(), 'vd-subdepot-partner-palette-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  const REPO = path.join(__dirname, '..');
  let html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  html = html.replace(
    /const AB_WERK_SUBDEPOT_PALETTE_PRODUKT = null;/,
    'const AB_WERK_SUBDEPOT_PALETTE_PRODUKT = ' + JSON.stringify(palette) + ';',
  );
  fs.writeFileSync(scratch, html, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = scratch;
  delete require.cache[require.resolve('./load-kern.js')];
  try {
    const { ladeKern: ladeKernFrisch } = require('./load-kern.js');
    return { ...ladeKernFrisch(), scratch, wiederherstellen: () => {
      if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
      delete require.cache[require.resolve('./load-kern.js')];
      fs.unlinkSync(scratch);
    } };
  } catch (e) {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    fs.unlinkSync(scratch);
    throw e;
  }
}

test('[Schritt 6·Ende-zu-Ende] eine gültige, gebackene Partner-Palette wird aktiv und färbt alle fünf Leser um', () => {
  const { V, wiederherstellen } = kernMitSubdepotPaletteLaden(GUELTIGE_PARTNER_PALETTE);
  try {
    assert.deepEqual(V._subdepotPaletteAktiv(), GUELTIGE_PARTNER_PALETTE);
    assert.equal(V.subDepotAkzentFarbe('hafer'), GUELTIGE_PARTNER_PALETTE.hafer, 'Fläche/Rand: literaler Hex statt var(--hafer)');
    assert.doesNotMatch(V.subDepotAkzentFarbe('hafer'), /var\(/);
    assert.match(V.subDepotTextFarbe('hafer'), /^#[0-9a-f]{6}$/i, 'Text auf Akzent: zur Laufzeit gerechnet, keine var(--hafer-text)');
    assert.doesNotMatch(V.subDepotTextFarbe('hafer'), /var\(/);
    assert.match(V.subDepotAkzentStark('hafer'), /^#[0-9a-f]{6}$/i, 'Text ALS Akzent: verdunkelt bis AA, kein color-mix(var(--hafer)…)');
    assert.match(V.subDepotAkzentLinie('hafer'), /^#[0-9a-f]{6}$/i, 'Randlinie: verdunkelt bis AA, keine var(--hafer-linie)');
    assert.match(V.subDepotAkzentPapierLinie('hafer'), /^#[0-9a-f]{6}$/i, 'Papier-Randlinie: verdunkelt bis AA, keine var(--hafer-papier-linie)');
    assert.equal(V._subDepotAkzentHexAufgeloest('hafer'), GUELTIGE_PARTNER_PALETTE.hafer, 'PDF-Pfad muss denselben Partner-Hex liefern, nicht den Haus-Ton');
  } finally { wiederherstellen(); }
});

test('[Schritt 6·Ende-zu-Ende·Rot-Beweis] eine UNGÜLTIGE gebackene Palette bleibt inaktiv — derselbe native Zustand wie ohne Region', () => {
  const kaputt = { ...GUELTIGE_PARTNER_PALETTE, malve: '#fefefe' };
  const { V, wiederherstellen } = kernMitSubdepotPaletteLaden(kaputt);
  try {
    assert.equal(V._subdepotPaletteAktiv(), null, 'eine ungültige Palette darf nie aktiv werden');
    assert.equal(V.subDepotAkzentFarbe('hafer'), 'var(--hafer)', 'Rückfall auf die Haus-Palette, unverändert');
    assert.equal(V._subDepotAkzentHexAufgeloest('hafer'), V._SUBDEPOT_PALETTE_HEX.hafer, 'PDF-Pfad fällt ebenso auf den Haus-Ton zurück');
  } finally { wiederherstellen(); }
});

/* ── produkt-konfektionieren.js — dieselbe Verdrahtung wie beim Partner-Font (Schritt 5) ── */
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');

function tmpOrdner(praefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), praefix + '-'));
}

test('[Schritt 6·Konfektionierung] konfektionieren() mit subdepotPalette schreibt die Region — ohne bleibt sie null (alle vier heutigen Produkte unverändert)', () => {
  const zielOhne = tmpOrdner('produkt-konfektionieren-subdepot-ohne');
  const zielMit = tmpOrdner('produkt-konfektionieren-subdepot-mit');
  try {
    const rOhne = konfektionieren({ ziel: zielOhne, slug: 'privat-de', modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n' });
    assert.equal(rOhne.subdepotPalette, false);
    const ohneText = fs.readFileSync(path.join(rOhne.ordner, 'vivodepot.html'), 'utf8');
    assert.match(ohneText, /const AB_WERK_SUBDEPOT_PALETTE_PRODUKT = null;/);

    const rMit = konfektionieren({ ziel: zielMit, slug: 'privat-de', modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n', subdepotPalette: GUELTIGE_PARTNER_PALETTE });
    assert.equal(rMit.subdepotPalette, true);
    const mitText = fs.readFileSync(path.join(rMit.ordner, 'vivodepot.html'), 'utf8');
    assert.match(mitText, /const AB_WERK_SUBDEPOT_PALETTE_PRODUKT = \{"hafer":"#8a6d3a"/);
  } finally {
    fs.rmSync(zielOhne, { recursive: true, force: true });
    fs.rmSync(zielMit, { recursive: true, force: true });
  }
});
