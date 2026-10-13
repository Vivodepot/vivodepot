'use strict';
/* Klassenwächter Navicon (09.10.2026): jede öffentliche Seite trägt das Icon, und es kommt aus einer Quelle, dem Kopf des
   Kerns (tools/lib/navicon.js). Gefunden war: nur der Kern trug eines; Lese-App, Studio, Schlüssel teilen, VC-Issuer,
   Style Guide und alle Seiten des Registers zeigten das leere Blatt.
   Gehalten wird die ganze Klasse, nicht die eine Seite: jede HTML-Datei im Wurzelverzeichnis, jede Seite, die die
   Register-Erzeuger schreiben, und für jede die Inhaltssicherheitsrichtlinie gegen die Form ihres Icons. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const N = require('../tools/lib/navicon.js');
const E = require('../tools/navicon-einsetzen.js');

const REPO = path.join(__dirname, '..');
const { imOeffentlichenZuschnitt, IM_ZUSCHNITT_GRUND } = require('../tools/lib/wurzel-kopfzeile.js');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const PNG_1 = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
function wegwerfOrdner() { return fs.mkdtempSync(path.join(os.tmpdir(), 'navicon-alle-seiten-')); }

test('[Navicon] der Kern trägt genau ein rel="icon", und favicon.png ist dessen Bild, dekodiert', () => {
  const links = N.naviconLinksAusKern(KERN);
  assert.equal(links.filter((l) => /rel="icon"/.test(l)).length, 1);
  const png = N.faviconPngAusKern(KERN);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(links.join('\n').includes(png.toString('base64')));
});

test('[Navicon·Wurzel] jede HTML-Datei im Wurzelverzeichnis trägt den Bereich, byte-gleich mit dem Kern', (t) => {
  const seiten = E.seitenIn(REPO);
  // Die Zahl der Seiten gilt im Kanon; der öffentliche Zuschnitt hält Seiten zurück (tools/lib/wurzel-kopfzeile.js).
  if (imOeffentlichenZuschnitt(REPO)) t.diagnostic('Seitenzahl nicht geprüft — ' + IM_ZUSCHNITT_GRUND);
  else assert.ok(seiten.length >= 5, 'erwartet mindestens fünf eigenständige Seiten, gefunden: ' + seiten.join(', '));
  const rot = E.pruefen().filter((r) => !r.ok);
  assert.deepEqual(rot, [], 'Beheben: node tools/navicon-einsetzen.js --schreiben');
  for (const d of seiten) assert.ok(N.iconLinksIn(fs.readFileSync(path.join(REPO, d), 'utf8')).some((i) => i.rel === 'icon'), d);
});

test('[Negativprobe] Rot-Beweis: eine Seite ohne Icon und eine mit abweichendem Icon sind rot; --schreiben heilt beide', () => {
  const o = wegwerfOrdner();
  try {
    fs.copyFileSync(path.join(REPO, 'vivodepot.html'), path.join(o, 'vivodepot.html'));
    fs.writeFileSync(path.join(o, 'ohne.html'), '<!doctype html>\n<html><head>\n<title>ohne</title>\n</head><body></body></html>\n');
    const anders = N.seitenBereich('<link rel="icon" type="image/png" href="' + PNG_1 + '">');
    fs.writeFileSync(path.join(o, 'anders.html'), '<!doctype html>\n<html><head>\n<title>anders</title>\n' + anders + '\n</head></html>\n');
    const rot = E.pruefen({ wurzel: o });
    assert.deepEqual(rot.map((r) => [r.datei, r.grund]), [['anders.html', 'Bereich weicht vom Kern ab'], ['ohne.html', 'kein Bereich NAVICON']]);
    E.schreiben({ wurzel: o });
    assert.deepEqual(E.pruefen({ wurzel: o }).filter((r) => !r.ok), []);
    const nachher = fs.readFileSync(path.join(o, 'ohne.html'), 'utf8');
    assert.ok(nachher.indexOf(N.SEITE_BEGIN) > nachher.indexOf('</title>'), 'der Bereich steht nach </title>');
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Navicon·White Label] die Quelle ist der Kopf des jeweiligen Kerns: ein Bereich NAVICON dort gilt vor den Zeilen', () => {
  const partner = KERN.replace(/<link rel="icon"[^>]*>/, '<!-- NAVICON:BEGIN — Icon des Produkts, aus dem Markenmodul, Rückfall Vivodepot -->\n'
    + '<link rel="icon" type="image/png" href="' + PNG_1 + '">\n<!-- NAVICON:END -->');
  assert.deepEqual(N.naviconLinksAusKern(partner), ['<link rel="icon" type="image/png" href="' + PNG_1 + '">']);
  const o = wegwerfOrdner();
  try {
    fs.writeFileSync(path.join(o, 'vivodepot.html'), partner);
    fs.writeFileSync(path.join(o, 'lesen.html'), '<html><head>\n<title>x</title>\n</head></html>\n');
    E.schreiben({ wurzel: o });
    const seite = fs.readFileSync(path.join(o, 'lesen.html'), 'utf8');
    assert.ok(seite.includes(PNG_1), 'die Seite trägt das Icon des Partner-Kerns');
    assert.ok(!seite.includes(N.faviconPngAusKern(KERN).toString('base64')), 'und nicht das Vivodepot-Icon');
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Negativprobe] Rot-Beweis: ein Kern ohne Icon bricht ab, ein Bereich ohne rel="icon" auch — es gibt kein Ersatzbild', () => {
  assert.throws(() => N.naviconLinksAusKern('<html><head><title>x</title></head></html>'), /weder ein Bereich NAVICON/);
  assert.throws(() => N.naviconLinksAusKern('<head>\n<!-- NAVICON:BEGIN -->\n<!-- NAVICON:END -->\n</head>'), /trägt kein rel="icon"/);
  assert.throws(() => N.naviconLinksAusKern('<head>\n<!-- NAVICON:BEGIN -->\n<link rel="icon" href="x.png">\n</head>'), /ohne NAVICON:END/);
});

test('[Navicon·Partnermarke] das Partnerprodukt trägt das Icon aus seinem Markenmodul',
  { todo: 'Eigentümer: White Label ST18 (folge8): der Produktbau füllt NAVICON:BEGIN … END im Kern aus dem Markenmodul; ab dem Commit verlangt diese Probe den Bereich im Gerüst-Kern' },
  () => {
    assert.ok(/<!-- NAVICON:BEGIN\b/.test(KERN), 'der Gerüst-Kern trägt den Bereich NAVICON');
  });

test('[Navicon·Register] jede Seite, die die Register-Erzeuger schreiben, trägt rel="icon"', () => {
  const W = require('../tools/feldregister-bauen.js');
  const A = require('../tools/lib/feldregister-adressen.js');
  const B = require('../tools/bausteinregister-bauen.js');
  const feld = W.bauen({ datum: '2026-10-09' });
  // Die Weiterleitung generator.html prüft die Probe der Register-Auslieferung, die sie schreibt.
  const seiten = [['index.html', feld.html], ['bausteine.html', B.bauen({}).html]]
    .concat(feld.adressDateien.filter(([n]) => n.endsWith('.html')));
  assert.ok(seiten.length > 100, 'die Kennungsseiten sind dabei');
  for (const [name, html] of seiten) {
    const icons = N.iconLinksIn(String(html)).filter((i) => i.rel === 'icon');
    assert.equal(icons.length, 1, name);
    assert.notEqual(icons[0].form, 'fremd', name);
  }
  assert.ok(feld.adressDateien.some(([n, h]) => n === A.ORDNER + '/index.html' && h.includes(N.FAVICON_LINK)), 'die Seite des Schemas');
  // Die Kennungsseiten verweisen auf favicon.png in der Wurzel; der Erzeuger legt die Datei aus demselben Kern dorthin.
  assert.ok(feld.favicon.equals(N.faviconPngAusKern(KERN)));
});

test('[Navicon·CSP] die Richtlinie jeder Seite erlaubt die Form ihres Icons (data: oder eigener Pfad)', () => {
  for (const d of E.seitenIn(REPO).concat('vivodepot.html')) {
    const html = fs.readFileSync(path.join(REPO, d), 'utf8');
    for (const i of N.iconLinksIn(html)) assert.ok(N.cspErlaubtIcon(html, i), d + ': ' + i.rel + ' (' + i.form + ') ist durch die CSP gesperrt');
  }
});

test('[Negativprobe] Rot-Beweis CSP: ein data:-Icon unter img-src \'self\', ein eigener Pfad unter img-src data: und \'none\' sind rot', () => {
  const seite = (csp, href) => '<head><meta http-equiv="Content-Security-Policy" content="' + csp + '">\n<link rel="icon" href="' + href + '"></head>';
  const ein = (html) => N.iconLinksIn(html)[0];
  const f = (csp, href) => { const h = seite(csp, href); return N.cspErlaubtIcon(h, ein(h)); };
  assert.equal(f("default-src 'self'; img-src 'self'", PNG_1), false);
  assert.equal(f("img-src data:", '/favicon.png'), false);
  assert.equal(f("img-src 'none'", PNG_1), false);
  assert.equal(f("default-src 'none'", '/favicon.png'), false);
  // SVG als data-URI fällt unter dieselbe Regel (Schnittstelle White Label: das Markenmodul kann SVG liefern).
  assert.equal(f("img-src 'self'", 'data:image/svg+xml;base64,PHN2Zy8+'), false);
  assert.equal(f("img-src 'self' data:", 'data:image/svg+xml;base64,PHN2Zy8+'), true);
  assert.equal(f("default-src 'self'", '/favicon.png'), true);
  assert.equal(N.cspErlaubtIcon('<head><link rel="icon" href="/favicon.png"></head>', { form: 'self', href: '/favicon.png' }), true);
});
