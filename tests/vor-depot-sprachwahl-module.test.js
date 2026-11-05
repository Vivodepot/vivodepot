'use strict';
/* ═════════════════════════════════════════════════════════════════
   Sprachwahl vor dem Depot aus den vorliegenden Modulen (29.10.2026, Entscheid 21.10.2026 „Französisch als signiertes
   Sprachmodul“, nicht app-eigen).
   Bis hierher kippte der Kern vor dem Depot fest zwischen Deutsch und Englisch, und die Lese-App bot vor dem Entschlüsseln
   nur diese beiden an. Jetzt bietet der Kern jede Sprache an, deren Modul vorliegt (Region AB_WERK_SPRACHANGEBOT_QUELLEN, vom
   Rezept gefüllt); die Lese-App bleibt vor dem Entschlüsseln bei Deutsch und Englisch (Proben unten).
     · ohne französisches Modul: Deutsch und Englisch, wie bisher;
     · mit französischem Modul: Französisch ist wählbar, und der Schirm spricht es.
   Dazu die Anführungszeichen je Sprache (« … » für Französisch).
   Das Modul hier ist erfunden, mit Text aus dem englischen Angebot plus Vorsatz: eine Übersetzung liegt noch nicht vor.
   ROT-BEWEIS (29.10.2026, Kanon cf1af8e88 ohne diesen Wagen): vorDepotSprachenAngebot, vorDepotSprachKnopfHTML,
   und anfuehrungszeichen fehlen dort, jede Probe unten fällt; der Kern zeigt mit französischem
   Modul führt der Knopf nur zu Englisch.
   ROT-BEWEIS Regeln (29.10.2026, vor dem Fix): beide Proben „[Regeln·…]“ fallen an tausendertrenner = " ".
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
const { ladeLesen } = require('./load-lesen.js');
const { SPRACHANGEBOT_EN_PFAD } = require('../tools/lib/vier-produkte.js');

const EN_ANGEBOT = JSON.parse(fs.readFileSync(SPRACHANGEBOT_EN_PFAD, 'utf8'));
const VORSATZ = '[fr] ';
const FR_ANGEBOT = Object.freeze(Object.assign({}, EN_ANGEBOT, {
  sprache: 'fr',
  texte: Object.fromEntries(Object.entries(EN_ANGEBOT.texte).map(([k, v]) => [k, VORSATZ + v])),
  regeln: Object.assign({}, EN_ANGEBOT.regeln || {}, { sprachkennung: 'fr-FR' }),
}));

function kernMitFranzoesisch() { return kernMitAngebot(FR_ANGEBOT); }

// Ein Kern mit einem zusätzlichen Angebot; `umbau` ändert den Kern davor (Rot-Beweis der Maskierung).
function kernMitAngebot(angebot, umbau = (h) => h) {
  const roh = umbau(fs.readFileSync(produktHtml('privat-de'), 'utf8'));
  const html = roh.replace(/(\/\* AB_WERK_SPRACHANGEBOT_QUELLEN:BEGIN \*\/\s*const AB_WERK_SPRACHANGEBOT_QUELLEN = (?:Object\.freeze\()?\[)/,
    (_, a) => a + JSON.stringify(angebot) + ',');
  assert.notEqual(html, roh, 'Vorbedingung: das französische Angebot steht in der Region');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vor-depot-fr-'));
  try {
    const pfad = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(pfad, html);
    return kernAus(pfad);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
}

test('[Vor-Depot·Kern] ohne französisches Modul: nur Englisch neben Deutsch, der Knopf wie bisher', () => {
  const { V } = kernAus(produktHtml('privat-de'));
  assert.deepEqual([...V.vorDepotSprachenAngebot()], ['en']);
  const html = V.vorDepotSprachKnopfHTML();
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.match(html, /id="vor-depot-sprache" data-sprache="en">[\s\S]*English/);
  V.vorDepotSpracheUmschalten();
  assert.equal(V.vorDepotSprachkennung(), 'en');
  assert.match(V.vorDepotSprachKnopfHTML(), /data-sprache="de">[\s\S]*Deutsch/, 'von Englisch führt der Knopf zurück');
  V.vorDepotSpracheUmschalten();
  assert.equal(V.vorDepotSprachkennung(), 'de');
});

test('[Vor-Depot·Kern] mit französischem Modul: der Knopf führt über Englisch zu Französisch, der Schirm spricht es, und zurück', () => {
  const { V } = kernMitFranzoesisch();
  assert.deepEqual([...V.vorDepotSprachenAngebot()], ['en', 'fr']);
  assert.match(V.vorDepotSprachKnopfHTML(), /data-sprache="en">[\s\S]*English/);
  V.vorDepotSpracheUmschalten();
  assert.equal(V.vorDepotSprachkennung(), 'en');
  assert.match(V.vorDepotSprachKnopfHTML(), /data-sprache="fr">[\s\S]*Français/);
  V.vorDepotSpracheUmschalten();
  assert.equal(V.vorDepotSprachkennung(), 'fr');
  assert.equal(V.vorDepotText('appTagline'), FR_ANGEBOT.texte['strings:appTagline.text']);
  assert.match(V.vorDepotSprachKnopfHTML(), /data-sprache="de">[\s\S]*Deutsch/, 'von Französisch führt der Knopf zurück zu Deutsch');
  V.vorDepotSpracheUmschalten();
  assert.equal(V.vorDepotSprachkennung(), 'de');
  V.vorDepotSpracheUmschalten('fr');
  assert.equal(V.vorDepotSprachkennung(), 'fr', 'gezielt gewählt');
  V.vorDepotSpracheUmschalten('xx');
  assert.equal(V.vorDepotSprachkennung(), 'de', 'eine Sprache ohne Modul wird nicht gewählt');
});

/* HTML-Senke renderWelcome/renderCryptoOverlay (tools/html-senken-grundlinie.json): der Knopf setzt Sprachcode und Namen
   aus dem Angebot ein. Beide laufen über escapeAttr/escapeHTML; ein Code mit Markup erscheint nur maskiert.
   Rot-Beweis: ohne die Maskierung steht das Markup roh im Knopf. */
test('[Vor-Depot·Kern·Escape] Sprachcode und Name im Knopf sind maskiert, auch bei Markup im Angebot', () => {
  const BOESE = 'x"><b>b</b>';
  const angebot = Object.assign({}, EN_ANGEBOT, { sprache: BOESE });
  const { V } = kernMitAngebot(angebot);
  assert.ok([...V.vorDepotSprachenAngebot()].includes(BOESE), 'Vorbedingung: der Code erreicht das Angebot');
  V.vorDepotSpracheUmschalten();
  const html = V.vorDepotSprachKnopfHTML();
  assert.match(html, /data-sprache="x&quot;&gt;&lt;b&gt;/);
  assert.doesNotMatch(html, /<b>/);
  const roh = kernMitAngebot(angebot, (h) => h.replace("escapeAttr(ziel) + '\">' +", "ziel + '\">' +").replace("escapeHTML(name) + '</span></button>'", "name + '</span></button>'")).V;
  roh.vorDepotSpracheUmschalten();
  assert.match(roh.vorDepotSprachKnopfHTML(), /<b>b<\/b>/, 'Rot-Beweis: ohne Maskierung steht das Markup roh im Knopf');
});

/* Lese-App vor dem Entschlüsseln (Entscheid 29.10.2026): dort gibt es kein signaturgeprüftes Modul, und dieser Wagen öffnet
   keinen neuen Ladeweg. Angeboten werden nur die eigenen Sprachen Deutsch und Englisch; ein Modul, das ungeprüft in der Registry
   stünde, erscheint nicht. Französisch vor dem Entschlüsseln ist ein eigener Posten mit Signatur und Gegenlesung durch Krypto.
   Rot-Beweis (29.10.2026): gegen eine Fassung, die das Angebot aus der Registry las, erscheint das Testmodul — beide Proben fallen. */
const FR_UNSIGNIERT = Object.freeze({ 'strings:spracheUmschalter.text': 'Langue' });

test('[Vor-Entschlüsseln·Lese-App] ein unsigniertes Testmodul erscheint nicht im Angebot', () => {
  const { V } = ladeLesen({ ohneSaat: true });
  V._TEXTSATZ_MODUL_REGISTRY = Object.assign(Object.create(null), { fr: Object.assign(Object.create(null), FR_UNSIGNIERT) });
  const html = V.sprachUmschalterHTML();
  assert.match(html, /id="sprache-de"[^>]*>Deutsch</);
  assert.match(html, /id="sprache-en"[^>]*>English</);
  assert.doesNotMatch(html, /sprache-fr|Français/);
});

test('[Vor-Entschlüsseln·Lese-App] vor dem Entschlüsseln nur Deutsch und Englisch, auch wenn Französisch gewünscht ist', () => {
  const { V } = ladeLesen({ ohneSaat: true });
  V._TEXTSATZ_MODUL_REGISTRY = Object.assign(Object.create(null), { fr: Object.assign(Object.create(null), FR_UNSIGNIERT) });
  V.setVorSprache('fr');
  assert.ok(['de', 'en'].includes(V.vorSpracheAktiv()), 'gewählt bleibt eine eigene Sprache: ' + V.vorSpracheAktiv());
});

test('[Anführungszeichen] deutsch „…“, französisch « … » mit schmalem Leerzeichen, sonst “…”', () => {
  const { V } = kernAus(produktHtml('privat-de'));
  assert.deepEqual([...V.anfuehrungszeichen('de')], ['„', '“']);
  assert.deepEqual([...V.anfuehrungszeichen('fr')], ['«\u202F', '\u202F»']);
  assert.deepEqual([...V.anfuehrungszeichen('fr-CA')], ['«\u202F', '\u202F»']);
  assert.deepEqual([...V.anfuehrungszeichen('en')], ['“', '”']);
});

/* Tausendertrenner: das Leerzeichen (Französisch) und „ohne“ stehen in TEXTSATZ_REGELN_ERLAUBT, der Prüfer verwarf sie aber
   vorher als leeren Text (`!wert.trim()`). Die Probe gilt für jeden Wert der geschlossenen Listen, in Kern und Lese-App
   (dort steht eine zweite Fassung desselben Prüfers). */
for (const [produkt, laden] of [['Kern', () => kernAus(produktHtml('privat-de')).V], ['Lese-App', () => ladeLesen({ ohneSaat: true }).V]]) {
  test('[Regeln·' + produkt + '] jeder erlaubte Wert einer geschlossenen Liste wird angenommen, auch Leerzeichen und leer', () => {
    const V = laden();
    for (const [schluessel, werte] of Object.entries(V.TEXTSATZ_REGELN_ERLAUBT)) {
      if (!Array.isArray(werte)) continue;
      for (const wert of werte) {
        const verworfene = [];
        const raus = V._textsatzRegelnPruefen({ [schluessel]: wert }, verworfene);
        assert.deepEqual([...verworfene], [], schluessel + ' = ' + JSON.stringify(wert));
        assert.equal(raus[schluessel], wert, schluessel + ' = ' + JSON.stringify(wert));
      }
    }
    const verworfene = [];
    V._textsatzRegelnPruefen({ tausendertrenner: '  ', datumsformat: ' ' }, verworfene);
    assert.deepEqual(verworfene.map((v) => v.kennung).sort(), ['regeln.datumsformat', 'regeln.tausendertrenner']);
  });
}
