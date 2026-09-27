'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Institutions-Arten von aussen erweiterbar (U2-ADR-142) — „Die Empfängerseite", Zug 0 (nachgeholter Zug 4 vom 17.08.2026).
   ────────────────────────────────────────────────────────────────────────────
   DREI ROT-BELEGE, wie beauftragt — nicht einer:
     · ein Modul mit einer neuen Art erscheint in der Auswahlmaske,
     · eines, das eine reservierte Kennung beansprucht, wird abgelehnt,
     · ein Depot mit unbekannter Art verhält sich so, wie Zug 0a es gemessen hat.

   DER DRITTE IST DER WICHTIGSTE, und er sichert eine MESSUNG, keine Absicht:
   vor dem Bau wurde geprüft, was heute mit `art: 'notaire'` ohne Modul geschieht
   — durchgereicht, nicht abgelehnt, nicht geleert. Genau dieses Verhalten darf
   der neue Andockweg nicht ändern; ein Bestandsdepot kennt seine Module nicht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'institutions-arten-pw';

async function mitDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  return V;
}

const artOptionen = (V) => V._institutionFelder().unterFelder.find((f) => f.id === 'art').optionen;

/* ── Rot-Beleg 1 · eine neue Art erscheint in der Maske ───────────────────── */

test('[InstArt] ohne Modul bietet die Maske genau die zwölf eingebauten Arten', async () => {
  const V = await mitDepot();
  const o = artOptionen(V);
  assert.equal(o.length, 12);
  assert.equal(o.length, V.INSTITUTION_ART_EINGEBAUT.length, 'die Maske zeigt den eingebauten Satz');
  assert.ok(o.every((x) => typeof x.label === 'string' && x.label.trim()), 'jede Art trägt ihre Beschriftung');
});

test('[InstArt·Rot 1] ein angedocktes Modul erscheint in der Auswahlmaske', async () => {
  const V = await mitDepot();
  V.getData().institutionsArten = [{ herkunft: 'fr-modul', moduleVersion: 1, sprache: 'de', arten: { notaire: 'Notariat' } }];
  assert.equal(V._institutionsArtenAusDepotAnmelden(V.getData()), 1);
  const o = artOptionen(V);
  assert.equal(o.length, 13, 'die dreizehnte Art steht in der Maske');
  assert.deepEqual(o[o.length - 1], { wert: 'notaire', label: 'Notariat' });
});

/* ── Rot-Beleg 2 · eine reservierte Kennung wird abgelehnt ────────────────── */

test('[InstArt·Rot 2] ein Modul, das eine der zwölf beansprucht, wird VERWORFEN — namentlich', async () => {
  const V = await mitDepot();
  V.getData().institutionsArten = [{
    herkunft: 'kaper-modul', moduleVersion: 1, sprache: 'de',
    arten: { bank: 'Banque', notaire: 'Notariat' },
  }];
  V._institutionsArtenAusDepotAnmelden(V.getData());
  assert.deepEqual(V.INSTITUTION_ART_VERWORFEN, [{ kennung: 'bank', grund: 'reserviert' }],
    'die reservierte Kennung wird benannt, nicht still übergangen');
  assert.equal(V.institutionsArtLabel('bank'), 'Bank', 'der eingebaute Text bleibt unangetastet');
  assert.equal(V.institutionsArtLabel('notaire'), 'Notariat', 'der Rest des Moduls gilt weiter');
});

test('[InstArt·Rot 2] ein verworfener Eintrag verwirft nicht das Modul', () => {
  const { V } = ladeKern();
  const r = V.institutionsArtModulPruefen({ moduleVersion: 1, sprache: 'de', arten: { bank: 'Banque', notaire: 'Notariat', leer: '' } });
  assert.equal(r.gueltig, true);
  assert.deepEqual(Object.keys(r.arten), ['notaire']);
  assert.deepEqual(r.verworfene.map((v) => v.grund).sort(), ['kein-label', 'reserviert']);
});

test('[InstArt] moduleVersion muss eine ganze Zahl ab 1 sein', () => {
  const { V } = ladeKern();
  for (const v of [0, -1, 1.5, '2', null, undefined]) {
    const r = V.institutionsArtModulPruefen({ moduleVersion: v, arten: {} });
    assert.equal(r.gueltig, false, 'moduleVersion ' + String(v));
    assert.equal(r.grund, 'moduleVersion');
  }
});

test('[InstArt] Aktualisieren-statt-Einfrieren: nur eine höhere moduleVersion ersetzt', () => {
  const { V } = ladeKern();
  const alt = { herkunft: 'fr', moduleVersion: 2, sprache: 'de', arten: {} };
  assert.equal(V.institutionsArtModulEinbetten([alt], { herkunft: 'fr', moduleVersion: 2, sprache: 'de', arten: { a: 'b' } })[0].moduleVersion, 2);
  assert.equal(V.institutionsArtModulEinbetten([alt], { herkunft: 'fr', moduleVersion: 3, sprache: 'de', arten: { a: 'b' } })[0].moduleVersion, 3);
  assert.equal(V.institutionsArtModulEinbetten([alt], { herkunft: 'it', moduleVersion: 1, sprache: 'de', arten: {} }).length, 2);
});

/* ── Rot-Beleg 3 · das Bestandsdepot mit unbekannter Art ──────────────────── */

test('[InstArt·Rot 3] eine unbekannte Art wird DURCHGEREICHT, nicht abgelehnt oder geleert', async () => {
  // Das ist die Messung aus Zug 0a, als Zusicherung festgehalten. Ein Bestandsdepot
  // kennt seine Module nicht — und darf durch den neuen Weg nichts verlieren.
  const V = await mitDepot();
  V.getData().institutionen.push({ id: 'i1', name: 'Étude Dupont', art: 'notaire' });

  assert.deepEqual(V.institutionenVorschlag('notaire'), [{ id: 'i1', name: 'Étude Dupont' }],
    'der Vorschlag findet den Eintrag über die unbekannte Art');
  assert.deepEqual(V.verweisExportFelder('geschaeftlich', 'institution', V.getData().institutionen[0]),
    { name: 'Étude Dupont', art: 'notaire' },
    'der Export gibt die Kennung wörtlich heraus — kein Wertebereich davor');
  assert.equal(V.institutionsArtLabel('notaire'), null,
    'ohne Modul gibt es kein Label — null statt eines erfundenen Textes');
});

/* ── Die Beschriftungen liegen im Textsatz ────────────────────────────────── */

test('[InstArt] die zwölf Beschriftungen kommen aus dem Textsatz, nicht aus einem zweiten Objekt', () => {
  const { V } = ladeKern();
  // Vor dem 17.08. war `INSTITUTION_ART_LABEL` ein eigenes `Object.freeze` — beim
  // Umbau der Nacht durchgerutscht, weil das Werkzeug den `SEKTOREN`-Baum abläuft
  // und dieses Objekt dort nicht liegt. Jetzt wird es AUS dem Satz gebaut.
  for (const k of V.INSTITUTION_ART_EINGEBAUT) {
    assert.equal(V.textLesen('institutionsArt:' + k + '.label'), V.INSTITUTION_ART_LABEL[k], k);
    assert.notEqual(V.INSTITUTION_ART_LABEL[k], k, k + ': die Kennung ist keine Beschriftung');
  }
  assert.equal(V.INSTITUTION_ART_LABEL.meldebehoerde, 'Meldebehörde');
});
