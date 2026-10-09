'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Notfallkarte für Namen in kyrillischer und griechischer Schrift (Befund PDF-NAMEN-NICHT-LATEIN, 23.09.2026; Abnahme 06.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Der Grundzuschnitt der Ab-Werk-Inter bleibt lateinisch (Entscheidung 23.09.2026: kein Kyrillisch, kein Griechisch im
   Grundzuschnitt). Eine Zusammenstellung, die eine kyrillische oder griechische Schrift braucht, bringt sie mit ihrem
   Erscheinungsbild mit (U2-ADR-473 W4: `schriften[]`, Rückfallkette Modul → Ab-Werk-Inter → kein PDF).
   Abnahme: Ein Modul bringt eine PDF-Schrift mit Kyrillisch und Griechisch mit. In einem Produkt mit diesem Modul entsteht die
   Notfallkarte für „Олена Коваленко“ und „Ελένη Παπαδοπούλου“, mit dieser Schrift eingebettet. Ohne das Modul hält der Torwächter
   sie mit Hinweis an, unverändert.
   Die Fixture `tests/fixtures/pdf-schrift/kyrillisch-griechisch.ttf` ist ein Zuschnitt aus Inter 4.1 (OFL-1.1, offizielles
   Release, Herkunft im README der Fixtures). Die Karte wird echt erzeugt (eingebettetes jsPDF) und mit poppler gelesen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');
const { testProduktText } = require('./produkt-test-backen.js');
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const KERN_HTML = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const HEUTE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json'), 'utf8'));
const INTER = HEUTE.schriften.find((s) => s.pdf && s.stil === 'normal' && Number(s.gewicht) < 600);
const INTER_FETT = HEUTE.schriften.find((s) => s.pdf && s.stil === 'normal' && Number(s.gewicht) >= 600);
const FX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', 'pdf-schrift', n)).toString('base64');
// Die Karte setzt normal und fett; das Profil bringt beide Schnitte mit (Zuschnitte aus Inter 4.1, README der Fixtures).
const MODUL = Object.freeze(Object.assign({}, HEUTE, { schriften: HEUTE.schriften.concat([
  Object.assign({}, INTER, { familie: 'Probeschrift', ttf: FX('kyrillisch-griechisch.ttf') }),
  Object.assign({}, INTER_FETT, { familie: 'Probeschrift', ttf: FX('kyrillisch-griechisch-bold.ttf') }),
]) }));
const NAMEN = Object.freeze([['Олена', 'Коваленко'], ['Ελένη', 'Παπαδοπούλου']]);
const REGION = /(\/\* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:BEGIN \*\/\n)([\s\S]*?)(\/\* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:END \*\/)/;
const ZUSATZ = ['_pdfSchriftWaehlen', 'pdfZeichenOhneDeckung', '_pdfSchriftlueckeWarnen'];

/* jsPDF des Produkts im eigenen Kontext, die PDF-Schriften aus dem Erscheinungsbild `modul` registriert (wie tests/ausgabe-fang.js,
   dort fest mit dem Ab-Werk-Erscheinungsbild). Im Browser teilen jsPDF und Kern ein Fenster; hier sind es zwei Kontexte. */
function jsPdfMit(modul, slug) {
  const bloecke = [...KERN_HTML.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const lib = bloecke.find((b) => /jsPDF - PDF Document creation from JavaScript/.test(b.slice(0, 400)));
  const fenster = { atob, btoa, TextEncoder, TextDecoder, Blob, URL, setTimeout, clearTimeout, console, navigator: { userAgent: 'node' }, document: undefined };
  fenster.window = fenster; fenster.self = fenster; fenster.globalThis = fenster;
  vm.runInNewContext(lib, fenster);
  // Erst backen, dann die Region ersetzen — wie tests/load-kern.js (opts.erscheinungsbildModul); der Bau schreibt sonst das
  // Erscheinungsbild des Produkts in die Region.
  let produkt = testProduktText(KERN_HTML, { slug });
  if (modul) produkt = produkt.replace(REGION, (_, a, inhalt, e) => a + 'const AB_WERK_ERSCHEINUNGSBILD_PRODUKT = ' + JSON.stringify(modul) + ';' + '\n'.repeat((inhalt.match(/\n/g) || []).length) + e);
  const kopf = /<script id="erscheinungsbild">([\s\S]*?)<\/script>/.exec(produkt);
  const registrieren = /<script id="pdf-schriften-registrieren">([\s\S]*?)<\/script>/.exec(produkt);
  vm.runInContext(kopf[1], fenster);
  vm.runInContext(registrieren[1], fenster);
  const qr = bloecke.find((b) => /QR Code Generator/.test(b.slice(0, 300)));
  if (qr) vm.runInContext(qr, fenster);
  return { jspdf: fenster.jspdf, qrcode: fenster.qrcode };
}

async function notfallkarte(slug, modul, [vorname, nachname]) {
  const gefangen = [];
  const { jspdf, qrcode } = jsPdfMit(modul, slug);
  const opts = { produkt: slug, jspdf, qrcode, Blob, ausgabeErfassen: (x) => gefangen.push(x), zusatzBindungen: ZUSATZ };
  if (modul) opts.erscheinungsbildModul = modul;
  const { V } = ladeKern(opts);
  await V.depotAnlegen('pdf-namen-probe-2026!');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', vorname);
  V.sektorFeldSetzen('identity', 'familyName', nachname);
  V.sektorFeldSetzen('identity', 'birthDate', '1958-03-14');
  // jsPDF meldet eine nicht registrierte Familie nur auf der Konsole („Unable to look up font label“) und schreibt dann in einer
  // anderen Schrift weiter — diese Meldungen werden mitgeschnitten.
  const konsole = [];
  const alt = { warn: console.warn, error: console.error, log: console.log };
  for (const k of Object.keys(alt)) console[k] = (...a) => { konsole.push(a.join(' ')); };
  try {
    V.flowNotfallkartePdf();
    const ende = Date.now() + 5000;
    while (!gefangen.length && Date.now() < ende) await new Promise((r) => setTimeout(r, 25));
  } finally { Object.assign(console, alt); }
  return { V, gefangen, ohneFamilie: konsole.filter((z) => /Unable to look up font label/.test(z)) };
}

function poppler(werkzeug, bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-namen-'));
  const p = path.join(dir, 'a.pdf');
  fs.writeFileSync(p, bytes);
  try { return execFileSync(werkzeug, werkzeug === 'pdftotext' ? ['-layout', p, '-'] : [p], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[PDF-Namen·Abnahme] mit einem Erscheinungsbild, das Kyrillisch und Griechisch trägt, entsteht die Notfallkarte — in allen vier Produkten, mit dieser Schrift eingebettet', async () => {
  const funde = [];
  for (const { slug } of PRODUKTE) {
    for (const name of NAMEN) {
      const { gefangen, ohneFamilie } = await notfallkarte(slug, MODUL, name);
      if (ohneFamilie.length) funde.push(slug + ' ' + name.join(' ') + ': jsPDF kennt die Familie nicht (' + ohneFamilie[0] + ')');
      if (!gefangen.length) { funde.push(slug + ' ' + name.join(' ') + ': keine Karte'); continue; }
      const bytes = Buffer.from(await gefangen[0].blob.arrayBuffer());
      const text = poppler('pdftotext', bytes);
      for (const teil of name) if (!text.includes(teil)) funde.push(slug + ': „' + teil + '“ fehlt auf der Karte');
      if (!/^Probeschrift\s+CID TrueType\s+Identity-H\s+yes/m.test(poppler('pdffonts', bytes))) funde.push(slug + ' ' + name.join(' ') + ': die Modulschrift ist nicht eingebettet');
    }
  }
  assert.deepEqual(funde, []);
});

test('[PDF-Namen·Gegenprobe] ohne das Modul hält der Torwächter die Karte an und nennt die Zeichen — unverändert', async () => {
  for (const name of NAMEN) {
    const { V, gefangen } = await notfallkarte('privat-de', null, name);
    assert.equal(gefangen.length, 0, name.join(' ') + ': ohne Schrift darf keine Karte entstehen');
    assert.ok(V.__zusatz.pdfZeichenOhneDeckung(name.join(' ')).length > 0);
  }
});

test('[PDF-Namen·Grundzuschnitt] die Ab-Werk-Inter trägt weiter kein Kyrillisch und kein Griechisch (Entscheidung 23.09.2026)', () => {
  const Z = ladeKern({ zusatzBindungen: ZUSATZ }).V.__zusatz;
  assert.equal(Z._pdfSchriftWaehlen('Олена Коваленко'), 'Inter');
  assert.deepEqual(Z.pdfZeichenOhneDeckung('АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'), [...'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'].filter((c, i, a) => a.indexOf(c) === i));
  assert.deepEqual(Z.pdfZeichenOhneDeckung('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ').length, 24);
});

test('[PDF-Namen·Rot-Beweis] ein Erscheinungsbild, dessen Schrift kein Kyrillisch trägt, macht die Abnahme rot (es gilt Inter, keine Karte)', async () => {
  const ohne = Object.assign({}, HEUTE, { schriften: HEUTE.schriften.concat([Object.assign({}, INTER, { familie: 'Probeschrift' })]) });
  const { gefangen } = await notfallkarte('privat-de', ohne, NAMEN[0]);
  assert.equal(gefangen.length, 0);
});
