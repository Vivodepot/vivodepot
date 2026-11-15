'use strict';
/* Die Hilfetexte der Vollmacht-Schritte folgen der Anzeigesprache.

   Zwei Schritte des Vollmacht-Assistenten tragen einen Hilfetext unter dem Freitextfeld
   („Kann leer bleiben." und der Hinweis zu ausgeschlossenen Geschäften). Der Text ist ein
   Bedienhinweis von Vivodepot, kein amtlicher Wortlaut. Er stand bis hierher ohne Kennung im
   Bauplan und erschien darum in jeder Sprache deutsch. Gefunden mit
   `node tools/sprachluecken-messen.js --wurzel . --mit-kern` (Teil C, Wurzel VOLLMACHT_BMJ).

   Der Weg ist derselbe wie für `frage` und `sektion`: Kennung `vollmachtBmj#<feldId>.hilfetext`,
   gelaufen von `_textsatzAufSchrittsatzAnwenden`. Anders als die Frage steht der Hilfetext
   nicht in der Liste des amtlichen Wortlauts; er wird übersetzt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { deTexte } = require('../tools/lib/textsatz-de-quelle.js');
const { OFFEN_JURISTISCH } = require('../tools/textsatz-en-juristisch-offen.js');
const { TEXTSATZ_EN_TEXTE } = require('../tools/textsatz-en-daten.js');

const SCHRITTE = ['transactionsExpresslyExcluded', 'furtherProvisions'];

async function frisch(produkt) {
  const { V } = ladeKern({ produkt });
  await V.depotAnlegen('vollmacht-hilfetext-pw');
  V.akteurSelbstErklaeren('Prüfung');
  return V;
}

function hilfetexte(V) {
  const raus = {};
  for (const id of SCHRITTE) {
    const st = V.VOLLMACHT_BMJ.steps.find((s) => s.feld && s.feld.id === id);
    assert.ok(st, 'Vorbedingung: Schritt ' + id + ' steht im Vollmacht-Assistenten');
    raus[id] = st.hilfetext;
  }
  return raus;
}

function kennungsLuecken(de, offen) {
  const aus = [];
  for (const id of SCHRITTE) {
    const k = 'vollmachtBmj#' + id + '.hilfetext';
    if (typeof de[k] !== 'string') aus.push(k + ' fehlt im deutschen Satz');
    if (offen.includes(k)) aus.push(k + ' steht als amtlicher Wortlaut, ist aber Bedienhinweis');
  }
  return aus;
}

test('[Vollmacht·Hilfetext] jeder Hilfetext hat eine Kennung im deutschen Satz und ist kein amtlicher Wortlaut', () => {
  assert.deepEqual(kennungsLuecken(deTexte(), OFFEN_JURISTISCH), []);
});

test('[Vollmacht·Hilfetext·Rot-Beweis] fehlt die Kennung oder steht sie als amtlicher Wortlaut, meldet die Probe es', () => {
  const ohne = Object.assign({}, deTexte());
  delete ohne['vollmachtBmj#furtherProvisions.hilfetext'];
  assert.deepEqual(kennungsLuecken(ohne, OFFEN_JURISTISCH), ['vollmachtBmj#furtherProvisions.hilfetext fehlt im deutschen Satz']);
  assert.equal(kennungsLuecken(deTexte(), OFFEN_JURISTISCH.concat(['vollmachtBmj#furtherProvisions.hilfetext'])).length, 1);
});

test('[Vollmacht·Hilfetext] im englischen Produkt erscheint der Hilfetext englisch, im deutschen deutsch', async () => {
  const de = deTexte();
  const Ven = await frisch('privat-en');
  Ven.getData().textsprache = 'en';
  Ven.textsatzNeuAnwenden();
  const en = hilfetexte(Ven);
  for (const id of SCHRITTE) {
    const k = 'vollmachtBmj#' + id + '.hilfetext';
    assert.equal(typeof en[id], 'string', id + ': kein Hilfetext');
    assert.notEqual(en[id], de[k], id + ': Hilfetext bleibt im englischen Produkt deutsch');
    assert.equal(en[id], TEXTSATZ_EN_TEXTE[k], id + ': Hilfetext ist nicht der englische Text');
  }
  // Das englische Produkt trägt kein deutsches Modul; Deutsch prüft darum das deutsche Produkt.
  const Vde = await frisch('privat-de');
  const dt = hilfetexte(Vde);
  for (const id of SCHRITTE) assert.equal(dt[id], de['vollmachtBmj#' + id + '.hilfetext'], id + ': im deutschen Produkt deutsch');
});
