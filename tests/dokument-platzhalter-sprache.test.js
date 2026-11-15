'use strict';
/* Eingetragene Angaben erscheinen im Dokument, in jeder Anzeigesprache.

   Der Dokument-Erzeuger setzt bei einer gewählten Option den Wert der Person in einen Platzhalter
   der Option ein (`fuellByWert`, `refByWert` in `_DOK_BLOCK_RENDERER.auswahl`): `label.replace(
   platzhalter, wert)`. Der Platzhalter steht deutsch am Block („(Zeitangabe)", „(Namen)", „(Jahre)",
   „(Name)"), die Option kommt aber in der Anzeigesprache. In einer englischen Option findet das
   deutsche Suchwort nichts, und das Dokument trägt „(period of time)" statt der eingetragenen Frist.

   Gefunden über `node tools/sprachluecken-messen.js --wurzel . --mit-kern` (Teil C, Platzhalter in
   PV_MODUL und KI_MODUL), dann im Dokument nachgemessen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch(produkt) {
  const { V } = ladeKern({ produkt });
  await V.depotAnlegen('dokument-platzhalter-pw');
  V.akteurSelbstErklaeren('Prüfung');
  return V;
}

function zeilen(ab) { return ab.flatMap((a) => a.zeilen).join('\n'); }

const RESTE = /\((Zeitangabe|Namen|Name|Jahre|Zeitpunkt|period of time|names|name|years|point in time|date)\)/;

/* KLASSENWÄCHTER: jedes Dokument-Modul (über das Register VORSORGE_MODULE, nicht über eine Namensliste), jeder Block mit
   `fuellByWert`/`refByWert`, jede Option, in jedem der vier Produkte. Die Option muss den Platzhalter tragen oder genau eine
   Klammergruppe; nach dem Einsetzen steht der Wert drin und keine Klammergruppe mehr. */
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');

function fuellOptionen(V) {
  const raus = [];
  for (const eintrag of V.VORSORGE_MODULE) {
    const m = eintrag && eintrag.generator;
    if (!m || !Array.isArray(m.abschnitte) || typeof m.optLabel !== 'function') continue;
    for (const a of m.abschnitte) for (const b of (Array.isArray(a.bloecke) ? a.bloecke : [])) {
      for (const art of ['fuellByWert', 'refByWert']) {
        for (const [wert, f] of Object.entries(b[art] || {})) raus.push({ modul: m.id, feldId: b.feldId, wert, art, platzhalter: f.platzhalter, label: m.optLabel(b.feldId, wert) });
      }
    }
  }
  return raus;
}

function verstoesse(V, liste) {
  const aus = [];
  for (const o of liste) {
    const wo = o.modul + ' ' + o.feldId + '/' + o.wert + ' (' + o.art + ')';
    if (typeof o.label !== 'string' || !o.label) { aus.push(wo + ': keine Option'); continue; }
    const gruppen = o.label.match(/\([^()]*\)/g) || [];
    if (!o.label.includes(o.platzhalter) && gruppen.length !== 1) aus.push(wo + ': ' + gruppen.length + ' Klammergruppen in „' + o.label + '"');
    const gefuellt = V._dokPlatzhalterErsetzen(o.label, o.platzhalter, 'WERT-DER-PERSON');
    if (!gefuellt.includes('WERT-DER-PERSON')) aus.push(wo + ': Wert nicht eingesetzt');
    if (/\([^()]*\)/.test(gefuellt)) aus.push(wo + ': Klammer-Platzhalter bleibt stehen');
  }
  return aus;
}

for (const p of PRODUKTE) {
  test('[Dokument·Platzhalter·Klasse] ' + p.slug + ': jede Option mit Füllung wird in der Anzeigesprache vollständig gefüllt', async () => {
    const V = await frisch(p.slug);
    V.textsatzNeuAnwenden();
    const liste = fuellOptionen(V);
    if (p.slug.startsWith('privat')) assert.ok(liste.length >= 5, 'Vorbedingung: das Register liefert die Optionen mit Füllung (' + liste.length + ')');
    assert.deepEqual(verstoesse(V, liste), []);
  });
}

test('[Dokument·Platzhalter·Rot-Beweis] der Wächter meldet eine Option mit zwei Klammergruppen und ohne Platzhalter', async () => {
  const V = await frisch('privat-en');
  const aus = verstoesse(V, [{ modul: 'probe', feldId: 'f', wert: 'w', art: 'fuellByWert', platzhalter: '(Zeitangabe)', label: 'after (period) of (time)' }]);
  assert.equal(aus.length, 3, aus.join('\n'));
  const vorher = 'after (period of time) has elapsed';
  assert.equal(V._dokPlatzhalterErsetzen(vorher, '(Zeitangabe)', 'fünf Jahren'), 'after fünf Jahren has elapsed');
  assert.equal(vorher.replace('(Zeitangabe)', 'fünf Jahren'), vorher, 'der alte Weg ließ die englische Option ungefüllt');
});

for (const produkt of ['privat-de', 'privat-en']) {
  test('[Dokument·Platzhalter] ' + produkt + ': die Frist der Patientenverfügung steht im Dokument', async () => {
    const V = await frisch(produkt);
    const d = V.getData();
    d.sektoren.advanceCare = Object.assign(d.sektoren.advanceCare || {},
      { validityDuration: 'befristet', validityDurationDeadline: 'FRIST-XYZ' });
    V.textsatzNeuAnwenden();
    const txt = zeilen(V.pvDokumentAbschnitte());
    assert.match(txt, /FRIST-XYZ/, 'die eingetragene Frist fehlt im Dokument');
    assert.doesNotMatch(txt, RESTE, 'ungefüllter Platzhalter im Dokument');
  });

  test('[Dokument·Platzhalter] ' + produkt + ': Namen, Jahre und Verwalter der KI-Verfügung stehen im Dokument', async () => {
    const V = await frisch(produkt);
    const d = V.getData();
    d.sektoren.advanceCare = { provisionInstruments: [{
      id: 'ki-probe', instrument: 'ki-verfuegung', basicDecision: 'erlaubnis',
      authorizedParties: 'benannte', namedIndividuals: [{ override: 'NAME-ANNA' }],
      timeLimit: 'jahre', numberOfYears: 'JAHRE-XYZ',
      digitalEstateAdministration: 'benannt', digitalEstateAdministration2: [{ override: 'NAME-VERA' }],
    }] };
    V.textsatzNeuAnwenden();
    const txt = zeilen(V.kiDokumentAbschnitte());
    for (const w of ['NAME-ANNA', 'JAHRE-XYZ', 'NAME-VERA']) assert.match(txt, new RegExp(w), w + ' fehlt im Dokument');
    assert.doesNotMatch(txt, RESTE, 'ungefüllter Platzhalter im Dokument');

    d.sektoren.advanceCare.provisionInstruments[0].timeLimit = 'zeitpunkt';
    d.sektoren.advanceCare.provisionInstruments[0].date = 'DATUM-XYZ';
    const txt2 = zeilen(V.kiDokumentAbschnitte());
    assert.match(txt2, /DATUM-XYZ/, 'der eingetragene Zeitpunkt fehlt im Dokument');
  });
}
