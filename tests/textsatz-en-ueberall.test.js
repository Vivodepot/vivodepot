'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Englisch im Produkt, nicht im Gerüst (S1, 20.09.2026) — ersetzt „Englisch überall"
   ────────────────────────────────────────────────────────────────────────
   Bis 19.09.2026 trug jeder Kern den vollen englischen Ab-Werk-Satz (U2-ADR-416, Entscheidung 5).
   Mit der Gerüst-Definition „Gerüst + Modul (+ Template) = Produkt" ist das Gerüst frei von einem
   vollen Sprachsatz: Englisch kommt als Sprachmodul über das Rezept (AB_WERK_SPRACHE_PRODUKT), und
   Deutsch bleibt bis S8 als AB_WERK_TEXTSATZ_DE eingebacken.

   ROT-BEWEIS, GEMESSEN (20.09.2026, Kern 6dd04b4e ohne S1): mit der englischen Saat im Gerüst sind rot —
   [EN·Gerüst] (Region und Konstante stehen) und je eine Probe „ohne Saat zeigt eine deutsche Umgebung Deutsch“ für
   Gerüst, privat-de und pro-de (dort erschien Englisch); grün bleiben die englischen Produkte und
   „ohne Datei bleibt ein deutsches Produkt deutsch“ — sie stützen sich nicht auf die Saat.

   Proben, am ERZEUGTEN PRODUKT (nicht an einem gestellten Zustand):
   · Gerüst und die deutschen Produkte tragen keine englische Ab-Werk-Saat (nur die Vor-Depot-Teilmenge
     für den „English“-Knopf); ohne Datei zeigt ein deutsches Produkt Deutsch.
   · Das englische Produkt zeigt englische Texte — aus dem Sprachmodul, nicht aus einer Saat — und
     seine Saat deckt jede Kennung des deutschen Satzes.
   · Folge, hier festgehalten und nicht versteckt: eine alte englische Modul-App-Datei, in einem
     deutschen Produkt geöffnet, zeigt für einen Text, den ihr Modul nicht trägt, DEUTSCH (der
     Rückfall Sprache → Englisch → Deutsch findet Englisch nirgends). Kein Text fehlt, die Sprache
     ist die falsche. Nach S8 (Deutsch als Modul) wird aus diesem Deutsch ein leerer Text; der
     Wechsel des Versagensmodus steht in der Nachfolge-ADR zu U2-ADR-416.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const LADER = path.join(__dirname, 'load-kern.js');
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const KENNUNG = 'identity.givenName.label';

function kernAus(html) {
  const vorher = process.env.KERN_HTML_PATH;
  if (html) process.env.KERN_HTML_PATH = html; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve(LADER)];
  try { return require(LADER).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LADER)];
  }
}
const produkte = new Map();
function produktHtml(slug) {
  if (!produkte.has(slug)) {
    const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
    const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
    const p = PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({ ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'en-ueberall-' + slug + '-')), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p) });
    produkte.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return produkte.get(slug);
}

// Eine Datei, wie sie eine englische Modul-App schrieb, bevor KENNUNG ins Modul kam.
let UMSCHLAG = null;
async function alteModulAppDatei() {
  if (!UMSCHLAG) {
    const Q = kernAus(null);
    await Q.depotAnlegen('en-ueberall-probe-2026');
    const d = Q.getData();
    const alt = JSON.parse(JSON.stringify(EN)); delete alt.texte[KENNUNG];
    d.textsatzModule = [alt];
    d.textsprache = 'en';
    UMSCHLAG = await Q.depotSerialisieren();
  }
  return JSON.parse(JSON.stringify(UMSCHLAG));
}
// Über den KATALOG: in Pro ruht `identity`, beschriftet wird der Bereich trotzdem (tests/pro-geweckter-bereich-beschriftet.test.js).
const feldLabel = (V) => V._sektorAusKatalog('identity').sektionen.flatMap((s) => s.felder).find((f) => f.id === 'givenName').label;

test('[EN·Gerüst] das Gerüst trägt keinen vollen englischen Satz — weder als Konstante noch als Region', () => {
  const roh = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(!roh.includes('AB_WERK_TEXTSATZ_EN:BEGIN'), 'die Region AB_WERK_TEXTSATZ_EN darf im Gerüst nicht stehen');
  assert.ok(!/^\s*const AB_WERK_TEXTSATZ_EN\s*=/m.test(roh), 'die Konstante AB_WERK_TEXTSATZ_EN darf im Gerüst nicht stehen');
  const V = kernAus(null);
  assert.equal(V._textsatzAbWerkRegistrySeed().en[''] && Object.keys(V._textsatzAbWerkRegistrySeed().en['']).length < 100, true,
    'die englische Saat des Gerüsts ist nur die Vor-Depot-Teilmenge');
});

for (const [name, html] of [['Gerüst', () => null], ['privat-de', () => produktHtml('privat-de')], ['pro-de', () => produktHtml('pro-de')]]) {
  test('[EN·' + name + '] ohne Saat zeigt eine deutsche Umgebung Deutsch — auch eine alte englische Modul-App-Datei fällt auf Deutsch, nie auf die Kennung', async () => {
    const V = kernAus(html());
    await V.depotLaden(await alteModulAppDatei(), 'en-ueberall-probe-2026');
    V.textsatzNeuAnwenden();
    assert.equal(V.getData().textsprache, 'en');
    assert.equal(feldLabel(V), V.TEXTSATZ_DE_QUELLE.texte[KENNUNG], name + ': weder Kennung noch (nicht mehr eingebautes) Englisch');
    assert.notEqual(feldLabel(V), KENNUNG);
  });
}

for (const slug of ['privat-en', 'pro-en']) {
  test('[EN·' + slug + '] das englische Produkt zeigt Englisch aus dem Sprachmodul — jede Kennung des deutschen Satzes ist englisch gedeckt', async () => {
    const V = kernAus(produktHtml(slug));
    const saat = V._textsatzAbWerkRegistrySeed();
    const soll = Object.keys(V.TEXTSATZ_DE_QUELLE.texte);
    const luecken = (texte) => soll.filter((k) => typeof texte[k] !== 'string');
    assert.ok(soll.length > 3000, 'Vorbedingung: der deutsche Satz trägt seine Kennungen');
    // Schutz im Test: eine gepflanzte Lücke wird gefunden — sonst hieße leer „nicht angesehen".
    const gepflanzt = Object.assign({}, saat.en['']); delete gepflanzt[KENNUNG];
    assert.deepEqual(luecken(gepflanzt), [KENNUNG], 'die Probe muss eine fehlende Kennung finden');
    assert.deepEqual(luecken(saat.en['']), [], slug + ': das eingebackene Sprachmodul lässt Kennungen aus');
    await V.depotAnlegen('en-produkt-2026');
    V.textsatzNeuAnwenden();
    assert.equal(feldLabel(V), EN.texte[KENNUNG], slug + ': englisches Produkt zeigt nicht Englisch');
  });
}

test('[EN·DE-Produkt] ohne Datei bleibt ein deutsches Produkt deutsch', async () => {
  for (const slug of ['privat-de', 'pro-de']) {
    const V = kernAus(produktHtml(slug));
    await V.depotAnlegen('de-produkt-2026');
    V.textsatzNeuAnwenden();
    assert.equal(feldLabel(V), V.TEXTSATZ_DE_QUELLE.texte[KENNUNG], slug + ': ein deutsches Depot bleibt deutsch');
  }
});

/* ── S1 (21.09.2026): auch die Lese-App trägt keinen vollen englischen Satz mehr ────────────
   Bis dahin (B3, 19.09.2026) säte die Region AB_WERK_TEXTSATZ_EN in vivodepot-lesen.html einen Auszug aus tools/textsatz-en-modul.json.
   Englisch kommt jetzt aus der Datei (abWerkMitschrift.sprache, textsatzModule). Die Region bleibt als Leerform (null) stehen, damit ein
   Produkt ihr Fach künftig wieder backen kann; der Erzeuger tools/build-textsatz-en-eingebaut.js ist entfernt. Wächter gegen die Klasse
   „ein voller Kern-Satz wandert in die Lese-App zurück": kein Wert des Kern-EN-Moduls steht wörtlich im Lese-App-Quelltext außerhalb der
   App-eigenen Tabellen (LESE_TEXTE_EN, ZUSICHERUNG_TEXTE_EN). Der Kern-Text der Zusicherungssätze und die 15 Oberflächentexte, die die
   Lese-App selbst trägt, sind die benannte, kleine Ausnahme (Obergrenze unten). */
const LESEN_QUELLE = () => fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
function ohneAppTabellen(html) {
  let s = html;
  for (const name of ['LESE_TEXTE_EN', 'ZUSICHERUNG_TEXTE_EN']) {
    const a = s.indexOf('const ' + name + ' = Object.freeze({');
    const e = s.indexOf('\n});', a);
    if (a >= 0 && e > a) s = s.slice(0, a) + s.slice(e);
  }
  return s;
}
function kernSaetzeImText(text, minLaenge) {
  const modul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  return Object.values(modul.texte).filter((w) => typeof w === 'string' && w.length >= minLaenge && text.includes(w));
}
test('[EN·Lese-App·Leerform] die Region AB_WERK_TEXTSATZ_EN in vivodepot-lesen.html ist leer (null)', () => {
  const html = LESEN_QUELLE();
  const a = html.indexOf('/* AB_WERK_TEXTSATZ_EN:BEGIN */');
  const e = html.indexOf('/* AB_WERK_TEXTSATZ_EN:END */');
  assert.ok(a >= 0 && e > a, 'Marker AB_WERK_TEXTSATZ_EN fehlen in der Lese-App');
  assert.equal(html.slice(a, e).trim(), '/* AB_WERK_TEXTSATZ_EN:BEGIN */\nconst AB_WERK_TEXTSATZ_EN = null;');
});
test('[EN·Lese-App·Klasse] kein langer Kern-EN-Satz steht im Lese-App-Quelltext außerhalb der App-eigenen Tabellen', () => {
  const treffer = kernSaetzeImText(ohneAppTabellen(LESEN_QUELLE()), 60);
  assert.deepEqual(treffer, [], 'ein Kern-EN-Satz steht wieder im Quelltext der Lese-App:\n' + treffer.slice(0, 5).join('\n'));
});
test('[EN·Lese-App·Klasse·Rot-Beweis] derselbe Satz, in den Quelltext gepflanzt, wird gefunden', () => {
  const modul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const satz = Object.values(modul.texte).find((w) => typeof w === 'string' && w.length >= 80);
  assert.ok(satz, 'Vorbedingung: das Kern-EN-Modul hat einen langen Satz');
  const gepflanzt = LESEN_QUELLE() + '\nconst PROBE = ' + JSON.stringify(satz) + ';';
  assert.ok(kernSaetzeImText(ohneAppTabellen(gepflanzt), 60).includes(satz));
});
