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

   Die Haus-Palette kommt seit 09.10.2026 aus dem Erscheinungsbild-Modul
   (`_subDepotModulHex`, Entscheidung 05.10.2026; vorher `_SUBDEPOT_PALETTE_HEX`
   im Kern) — der Rangfolge-Vorbau `_subdepotPaletteAktiv()` liegt DAVOR, genau
   wie `_AB_WERK_BRANDING`/`AB_WERK_BRANDING_PRODUKT`. Die Schlüssel einer
   Partner-Palette sind die acht Namen der Palette 05.10.2026.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Acht echte, unterscheidbare Töne, alle ≥1.5:1 gegen Weiß/Papier (per Konstruktion kräftiger
// als die pastellenen Haus-Töne, damit die Probe nicht zufällig knapp an der Schwelle hängt).
// Schlüssel seit 09.10.2026: die acht Namen der Palette 05.10.2026 (SUBDEPOT_PALETTE).
const GUELTIGE_PARTNER_PALETTE = Object.freeze({
  ton: '#a0522d', altrose: '#b0567a', nebel: '#4682b4', kiesel: '#8b7355',
  malve: '#9932cc', pfirsich: '#8a6d3a', hellblau: '#6a5acd', rose: '#556b2f',
});

test('[Schritt 6·Nativ] _subdepotPaletteAktiv() liefert null ohne gesetzte Produkt-Region — kein Verhaltensunterschied ohne Partner-Palette', () => {
  const { V } = ladeKern();
  assert.equal(V.AB_WERK_SUBDEPOT_PALETTE_PRODUKT, null, 'Vorbedingung: die native Region ist leer');
  assert.equal(V._subdepotPaletteAktiv(), null);
});

test('[Schritt 6·Gültigkeitsprüfung] eine vollständige, kontraststarke Partner-Palette besteht die Prüfung', () => {
  const { V } = ladeKern();
  assert.deepEqual(Object.keys(GUELTIGE_PARTNER_PALETTE), [...V.SUBDEPOT_PALETTE], 'Vorbedingung: die Probe-Palette deckt genau die Palettennamen');
  assert.equal(V._subdepotPartnerPaletteGueltig(GUELTIGE_PARTNER_PALETTE), true);
});

test('[Schritt 6·Gültigkeitsprüfung·Rot-Beweis] eine Partner-Palette mit den alten Namen (hafer/schilf/flieder statt pfirsich/hellblau/rose) ist ungültig', () => {
  const { V } = ladeKern();
  const alteNamen = { ton: '#a0522d', altrose: '#b0567a', nebel: '#4682b4', kiesel: '#8b7355', malve: '#9932cc',
    hafer: '#8a6d3a', schilf: '#556b2f', flieder: '#6a5acd' };
  assert.equal(V._subdepotPartnerPaletteGueltig(alteNamen), false);
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
  assert.equal(V._subDepotAkzentAlsHexOderNull('pfirsich'), null, 'var(--pfirsich) muss weiterhin gewinnen');
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
    assert.equal(V.subDepotAkzentFarbe('pfirsich'), GUELTIGE_PARTNER_PALETTE.pfirsich, 'Fläche/Rand: literaler Hex statt var(--pfirsich)');
    assert.doesNotMatch(V.subDepotAkzentFarbe('pfirsich'), /var\(/);
    assert.match(V.subDepotTextFarbe('pfirsich'), /^#[0-9a-f]{6}$/i, 'Text auf Akzent: zur Laufzeit gerechnet, keine var(--pfirsich-text)');
    assert.doesNotMatch(V.subDepotTextFarbe('pfirsich'), /var\(/);
    assert.match(V.subDepotAkzentStark('pfirsich'), /^#[0-9a-f]{6}$/i, 'Text ALS Akzent: verdunkelt bis AA, kein color-mix(var(--pfirsich)…)');
    assert.match(V.subDepotAkzentLinie('pfirsich'), /^#[0-9a-f]{6}$/i, 'Randlinie: verdunkelt bis AA, keine var(--pfirsich-linie)');
    assert.match(V.subDepotAkzentPapierLinie('pfirsich'), /^#[0-9a-f]{6}$/i, 'Papier-Randlinie: verdunkelt bis AA, keine var(--pfirsich-papier-linie)');
    assert.equal(V._subDepotAkzentHexAufgeloest('pfirsich'), GUELTIGE_PARTNER_PALETTE.pfirsich, 'PDF-Pfad muss denselben Partner-Hex liefern, nicht den Haus-Ton');
    // Ein Bestandsdepot mit altem Namen (hafer → pfirsich in der Anzeige) bekommt denselben Partner-Ton.
    assert.equal(V.subDepotAkzentFarbe('hafer'), GUELTIGE_PARTNER_PALETTE.pfirsich, 'hafer wird als pfirsich angezeigt, auch mit Partner-Palette');
  } finally { wiederherstellen(); }
});

test('[Schritt 6·Ende-zu-Ende·Rot-Beweis] eine UNGÜLTIGE gebackene Palette bleibt inaktiv — derselbe native Zustand wie ohne Region', () => {
  const kaputt = { ...GUELTIGE_PARTNER_PALETTE, malve: '#fefefe' };
  const { V, wiederherstellen } = kernMitSubdepotPaletteLaden(kaputt);
  try {
    assert.equal(V._subdepotPaletteAktiv(), null, 'eine ungültige Palette darf nie aktiv werden');
    assert.equal(V.subDepotAkzentFarbe('pfirsich'), 'var(--pfirsich)', 'Rückfall auf die Haus-Palette, unverändert');
    // Seit 09.10.2026 kommt der Haus-Ton aus dem Erscheinungsbild-Modul (_subDepotModulHex), nicht mehr aus _SUBDEPOT_PALETTE_HEX.
    // Dieser Kern ist ungebacken (KERN_HTML_PATH), darum ist der Modul-Wert hier null — entscheidend ist: nicht der Partner-Hex.
    assert.equal(V._subDepotAkzentHexAufgeloest('pfirsich'), V._subDepotModulHex('pfirsich'), 'PDF-Pfad fällt ebenso auf den Haus-Ton zurück');
    assert.notEqual(V._subDepotAkzentHexAufgeloest('pfirsich'), kaputt.pfirsich, 'nie der Hex der verworfenen Partner-Palette');
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
    assert.match(mitText, /const AB_WERK_SUBDEPOT_PALETTE_PRODUKT = \{"ton":"#a0522d"/);
  } finally {
    fs.rmSync(zielOhne, { recursive: true, force: true });
    fs.rmSync(zielMit, { recursive: true, force: true });
  }
});

/* Seit 09.10.2026: Boden 1,15 (statt 1,5) gegen Weiß und Papier, dazu ΔE2000 ≥ 12 zur Salbei-Leiste #e2eada (der Ton ist Fläche; die
   Fläche hebt sich über den Farbton vom eigenen Depot ab). Gegenprobe mit den acht Haus-Tönen aus dem Modul, Rot-Beweise fast weiß und
   blasses Grün. */
test('[Partner-Palette·Kriterien] die acht Haus-Töne erfüllen Boden und Farbabstand; fast weiß und blasses Grün werden verworfen', () => {
  const { V } = ladeKern();
  const modul = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json'), 'utf8')).basis;
  const haus = Object.fromEntries(V.SUBDEPOT_PALETTE.map((t) => [t, modul['--' + t]]));
  assert.equal(V._subdepotPartnerPaletteGueltig(haus), true, 'die Haus-Palette selbst ginge als Partner-Palette durch');
  // Bezugswert der Pastell-Tabelle vom 05.10.2026: Pfirsich zur Salbei-Leiste 12,1.
  assert.ok(Math.abs(V._farbAbstandDE2000('#F6E6DA', '#e2eada') - 12.1) < 0.1, 'ΔE2000 trifft den Tabellenwert');
  for (const t of V.SUBDEPOT_PALETTE) assert.ok(V._farbAbstandDE2000(haus[t], '#e2eada') >= 12, t + ' ΔE ≥ 12 zur Salbei-Leiste');
  // Rot-Beweis (a): fast weiß reißt den Boden.
  assert.equal(V._subdepotPartnerPaletteGueltig(Object.assign({}, haus, { rose: '#fbfbfb' })), false, '#fbfbfb wird verworfen');
  // Rot-Beweis (b): ein blasses Grün mit genug Kontrast (1,29:1) liegt zu nah an der Salbei-Leiste (ΔE 1,5).
  assert.ok(V._farbAbstandDE2000('#dce6d4', '#e2eada') < 12, 'Voraussetzung: das Grün liegt nah an Salbei');
  assert.equal(V._subdepotPartnerPaletteGueltig(Object.assign({}, haus, { rose: '#dce6d4' })), false, '#dce6d4 wird verworfen');
});
