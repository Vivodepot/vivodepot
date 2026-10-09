'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Bildmarke hat genau zwei Formen (White Label ab Werk, U2-ADR-297-Nachtrag 05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   `_vdBildmarkeHTML` liefert HTML und steht darum gezählt in der Grundlinie des Textknoten-Wächters, nicht maskiert.
   Das trägt nur, solange die Ausgabe eng ist. Diese Probe hält drei Zusagen fest:
   (1) Die Ausgabe ist entweder das feste Vivodepot-SVG oder ein <img> mit einem data:image/(png|jpeg);base64-URL. Andere
       Attribute aus Werten gibt es nicht; die Klasse ist an jedem Aufrufort ein festes Literal.
   (2) Ein unzulässiges Logo der Bau-Region (Anführungszeichen mit onerror, javascript:-URL, data:image/svg+xml, über
       200 KB) wird abgewiesen, und es erscheint die Vivodepot-Form. Das gilt auch dann, wenn ein solches Logo am
       Modulprüfer vorbei direkt beim Setzen der Kopfzeile ankommt.
   (3) Die Quelle ist nur die Bau-Region: ein Logo aus Depot-Datei oder unsigniertem Einlass nimmt der Bauer nicht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const OPTS = Object.freeze({ jetzt: '2026-08-28T09:00:00Z' });
const SVG_FORM = /^<svg class="[a-z-]+" aria-hidden="true" focusable="false"><use href="#vd-logo"\/><\/svg>$/;
const IMG_FORM = /^<img class="[a-z-]+" src="data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*" alt="" aria-hidden="true">$/;
const KLASSEN = ['welcome-logo-mark', 'logo-svg'];

const BOESE = Object.freeze({
  'Anführungszeichen mit onerror': LOGO + '" onerror="alert(1)',
  'javascript:-URL': 'javascript:alert(1)',
  'data:image/svg+xml': 'data:image/svg+xml;base64,PHN2Zy8+',
  'über 200 KB': 'data:image/png;base64,' + 'A'.repeat(200 * 1024 * 4 / 3 + 8),
});

function region(logo) {
  return { modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-probe', name: 'Probebank Musterort', farbePrimaer: '#1b3a5c', logo, modell: 'white-label' };
}
function fakeRoot() {
  const logoMark = { _html: '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } };
  return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } },
    querySelector: (sel) => (sel === '.logo-mark' ? logoMark : null), _logoMark: logoMark };
}
function formFehler(html) {
  return (SVG_FORM.test(html) || IMG_FORM.test(html)) ? [] : ['unerlaubte Form: ' + html.slice(0, 120)];
}

test('[Bildmarke·Formen] jeder Aufrufort übergibt eine feste Klasse als Literal', () => {
  const aufrufe = KERN.match(/_vdBildmarkeHTML\(([^)]*)\)/g).filter((a) => !/_vdBildmarkeHTML\(klasse\)/.test(a));
  assert.ok(aufrufe.length >= 7, 'Aufruforte gefunden: ' + aufrufe.length);
  for (const a of aufrufe) assert.match(a, /^_vdBildmarkeHTML\('[a-z-]+'\)$/, a);
});

test('[Bildmarke·Formen] die Ausgabe ist das Vivodepot-SVG oder ein <img> mit PNG/JPEG-data:-URL, sonst nichts', async () => {
  const funde = [];
  for (const modul of [null, region(LOGO), { ...region(LOGO), modell: 'branding' }]) {
    const { V } = ladeKern(modul ? { produkt: 'privat-de', brandingProdukt: modul } : { produkt: 'privat-de' });
    await V.vorDepotKonfigurationAnwenden([], fakeRoot(), OPTS);
    for (const k of KLASSEN) funde.push(...formFehler(V._vdBildmarkeHTML(k)));
  }
  assert.deepEqual(funde, []);
});

test('[Bildmarke·Rot-Beweis Bau-Region] ein unzulässiges Logo in der Bau-Region wird abgewiesen, es erscheint die Vivodepot-Form', async () => {
  const funde = [];
  for (const [name, logo] of Object.entries(BOESE)) {
    const { V } = ladeKern({ produkt: 'privat-de', brandingProdukt: region(logo) });
    const root = fakeRoot();
    await V.vorDepotKonfigurationAnwenden([], root, OPTS);
    const marke = V._vdBildmarkeHTML('welcome-logo-mark');
    if (!SVG_FORM.test(marke)) funde.push(name + ': Willkommen zeigt ' + marke.slice(0, 80));
    if (root._logoMark.innerHTML.includes('<img')) funde.push(name + ': Kopfzeile trägt ein <img>');
  }
  assert.deepEqual(funde, []);
});

test('[Bildmarke·Rot-Beweis zweite Linie] am Modulprüfer vorbei: ein unzulässiges Logo direkt beim Setzen der Kopfzeile ergibt die Vivodepot-Form', () => {
  const { V } = ladeKern({ produkt: 'privat-de' });
  const funde = [];
  for (const [name, logo] of Object.entries(BOESE)) {
    assert.equal(V._brandingLogoZulaessig(logo), false, name);
    const root = fakeRoot();
    V._brandingProduktIconAnwenden({ logo }, root, 'white-label');
    if (!SVG_FORM.test(V._vdBildmarkeHTML('logo-svg'))) funde.push(name + ': Bildmarke ' + V._vdBildmarkeHTML('logo-svg').slice(0, 80));
    if (root._logoMark.innerHTML.includes('<img')) funde.push(name + ': Kopfzeile trägt ein <img>');
    if (!root._logoMark.innerHTML.includes('#vd-logo')) funde.push(name + ': Vivodepot-Bildmarke fehlt in der Kopfzeile');
  }
  assert.deepEqual(funde, []);
});

test('[Bildmarke·Quelle] ein Logo aus Depot-Datei oder unsigniertem Einlass nimmt der Bauer nicht', async () => {
  const fremd = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-x', sprache: 'de', farbePrimaer: '#1b3a5c', logo: LOGO, modell: 'white-label' };
  const a = ladeKern({ produkt: 'privat-de' });
  a.V.setData({ ...a.V.getData(), brandingModule: [fremd] });
  await a.V.vorDepotKonfigurationAnwenden([], fakeRoot(), OPTS);
  const b = ladeKern({ produkt: 'privat-de' });
  await b.V.vorDepotKonfigurationAnwenden([fremd], fakeRoot(), OPTS);
  for (const V of [a.V, b.V]) for (const k of KLASSEN) assert.match(V._vdBildmarkeHTML(k), SVG_FORM);
});

/* Rot-Beweis am Kern: die Logo-Prüfung in der Bildmarke zurückgenommen, fällt die zweite Linie. */
test('[Bildmarke·Rot-Beweis Mutation] ohne die Logo-Prüfung in _vdBildmarkeHTML erscheint ein unzulässiges Logo', () => {
  const stelle = " || !_brandingLogoZulaessig(_fall2Marke.logo)) return _VD_BILDMARKE_SVG(klasse);";
  assert.equal(KERN.split(stelle).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bildmarke-'));
  const tmp = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(tmp, KERN.replace(stelle, ") return _VD_BILDMARKE_SVG(klasse);"));
  const { kernAus } = require('./produkt-html-erzeugen.js');
  try {
    const { V } = kernAus(tmp, { produkt: 'privat-de' });
    V._brandingProduktIconAnwenden({ logo: BOESE['javascript:-URL'] }, fakeRoot(), 'white-label');
    // Die Kopfzeile prüft selbst; die Bildmarke liest _fall2Marke.logo — ohne Prüfung bleibt null und damit leer.
    const roh = V._vdBildmarkeHTML('logo-svg');
    assert.ok(!SVG_FORM.test(roh), 'die Mutation muss die Vivodepot-Form verlieren');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
