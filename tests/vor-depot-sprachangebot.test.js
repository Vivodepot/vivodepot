'use strict';
/* ═════════════════════════════════════════════════════════════════
   vor-depot-sprachangebot.test.js — die Abnahme aus U2-ADR-428 (Abschnitt „Was S8 nicht auflöst“, 21.09.2026), wörtlich:
     (1) die Konstante steht in keinem Kern,
     (2) ein Produkt ohne zweite Sprache zeigt den Knopf nicht.
   Das Vor-Depot-Sprachangebot (die 26 englischen Texte des „English“-Knopfs) ist Sache des Rezepts: eine Moduldatei (`modulTyp: "sprachangebot"`),
   die das deutsche Produkt in die Region AB_WERK_SPRACHANGEBOT_QUELLEN gebacken bekommt. Der zweite Punkt ist der, den man vergisst.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE, SPRACHANGEBOT_EN_PFAD, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { sprachmodulUrteil } = require('../tools/vier-produkte-erzeugen.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const MODUL = JSON.parse(fs.readFileSync(SPRACHANGEBOT_EN_PFAD, 'utf8'));
const EIN_ENGLISCHER_SATZ = MODUL.texte['strings:appTagline.text'];

test('[Abnahme 1] die Konstante steht in keinem Kern — weder ihr Name noch ein englischer Satz aus dem Angebot, die Region ist leer', () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  assert.ok(EIN_ENGLISCHER_SATZ && EIN_ENGLISCHER_SATZ.length > 20, 'Vorbedingung: die Moduldatei trägt den Satz, nach dem gesucht wird');
  assert.equal(kern.includes('AB_WERK_TEXTSATZ_EN_VORDEPOT'), false, 'der Name der Konstante steht nirgends mehr');
  assert.equal(kern.includes(EIN_ENGLISCHER_SATZ), false, 'ein Satz des Angebots steht nicht als Literal im Gerüst');
  assert.match(kern, /\/\* AB_WERK_SPRACHANGEBOT_QUELLEN:BEGIN \*\/\s*const AB_WERK_SPRACHANGEBOT_QUELLEN = Object\.freeze\(\[\]\);\s*\/\* AB_WERK_SPRACHANGEBOT_QUELLEN:END \*\//,
    'die Region steht mit ihrem Leerwert da (das Loch, das das Rezept füllt)');
});

test('[Abnahme 2] das deutsche Produkt zeigt den Knopf und bietet Englisch aus dem Rezept an; die englischen Produkte und das nackte Gerüst zeigen ihn nicht', () => {
  const erwartet = { 'privat-de': true, 'pro-de': true, 'privat-en': false, 'pro-en': false };
  for (const [slug, zeigt] of Object.entries(erwartet)) {
    const { V, document } = ladeKern({ produkt: slug });
    assert.equal(V.vorDepotSprachangebotVorhanden(), zeigt, slug + ': Angebot vorhanden');
    V.renderWelcome();
    const html = document.getElementById('overlay-inhalt').innerHTML;
    assert.equal(/id="vor-depot-sprache"/.test(html), zeigt, slug + ': Knopf auf dem Willkommensschirm');
    V.renderCryptoOverlay();
    assert.equal(/id="vor-depot-sprache"/.test(document.getElementById('overlay-inhalt').innerHTML), zeigt, slug + ': Knopf auf dem Öffnen-Schirm');
  }
});

test('[Abnahme 2·Rot-Beweis] dasselbe Gerüst ohne das Angebot im Rezept (nackt) zeigt den Knopf nicht — die Probe oben fällt, sobald ein Produkt das Angebot verliert', () => {
  const nackt = ladeKern({ blank: true });
  assert.equal(nackt.V.vorDepotSprachangebotVorhanden(), false, 'das nackte Gerüst führt kein Englisch und bietet nichts an');
  assert.equal(nackt.V.AB_WERK_SPRACHANGEBOT_QUELLEN.length, 0);
});

test('[Abnahme 2·Wirkung] der Knopf schaltet im deutschen Produkt wirklich auf den Text aus dem Rezept um', () => {
  const { V, document } = ladeKern({ produkt: 'privat-de' });
  assert.equal(V.AB_WERK_SPRACHANGEBOT_QUELLEN.length, 1, 'das Rezept hat genau ein Angebot eingebacken');
  V.vorDepotSpracheUmschalten();
  V.renderWelcome();
  assert.match(document.getElementById('overlay-inhalt').innerHTML, new RegExp(EIN_ENGLISCHER_SATZ.replace(/[.*+?^${}()|[\]\\—]/g, '\\$&')));
});

test('[Rezept] genau die deutschen Produkte tragen die Moduldatei, in keinem englischen Produkt steht sie', () => {
  for (const p of PRODUKTE) {
    const traegt = modulDateienFuer(p).includes(SPRACHANGEBOT_EN_PFAD);
    assert.equal(traegt, p.sprache === 'de', p.slug + (traegt ? ': trägt das Angebot' : ': trägt es nicht'));
  }
  assert.equal(MODUL.modulTyp, 'sprachangebot');
  assert.equal(MODUL.sprache, 'en');
});

test('[Rezept·Gegenprobe] das Angebot ist kein Sprachmodul: der Wächter „je Produkt genau ein Sprachmodul“ bleibt bei den deutschen Produkten grün, eine zweite echte Sprachmodul-Datei schlägt an', () => {
  for (const p of PRODUKTE.filter((x) => x.sprache === 'de')) {
    const namen = modulDateienFuer(p).map((d) => path.basename(d));
    assert.ok(namen.includes(path.basename(SPRACHANGEBOT_EN_PFAD)), p.slug + ': Vorbedingung — das Angebot ist im Rezept');
    assert.equal(sprachmodulUrteil(p.slug, namen).ok, true, p.slug + ': genau ein Sprachmodul, das Angebot zählt nicht mit');
    assert.equal(sprachmodulUrteil(p.slug, namen.concat(['textsatz-fr-modul.json'])).ok, false, p.slug + ': Rot-Beweis — ein zweites Sprachmodul fällt auf');
  }
});
