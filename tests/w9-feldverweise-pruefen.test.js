'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-9 (Auftrag N1, 08.08.2026, Zug 1): kein Verweis ins Leere
   ────────────────────────────────────────────────────────────────────────
   Gemessen gegen die ECHTEN Produkt-Resolver (`feldDefFuer`,
   `crossRefFeldUndRoh`), nicht gegen eine Nachbildung — s. Kopf von
   `tools/w9-feldverweise-pruefen.js`. Grundlinie ist LEER: alle heute
   deklarierten Zeiger (10 NOTFALL_KERN_FELDER, 144 Cross-Sektor-Verweise in
   SITUATIONEN/_ANG_SITUATIONEN) lösen real auf. Die drei im Auftrag
   genannten Gate-Felder existieren im heutigen Code nicht mehr (Regel 23,
   Abweichung von der SP-Lesung — s. Bericht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { alleFunde, gateBewerten, ermittleFunde } = require('../tools/w9-feldverweise-pruefen.js');

const GRUNDLINIE = require('../tools/w9-feldverweise-grundlinie.json');

test('[W-9] echter Kern: kein Verweis ins Leere gegen die Grundlinie', async () => {
  const funde = await ermittleFunde();
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE);
  assert.deepEqual(neu, [], 'kein neuer Verweis ins Leere gegen die Grundlinie');
  assert.equal(rot, false);
});

test('[W-9] die Grundlinie ist heute leer — 10 NOTFALL_KERN_FELDER + 144 Cross-Sektor-Verweise lösen real auf', () => {
  assert.deepEqual(GRUNDLINIE, []);
});

test('[W-9·Rotmachbarkeit] Positivkontrolle: ein gepflanzter Zeiger auf ein nicht existierendes Feld wird gefunden', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('w9-test-pw');
  // Gepflanzt wie im echten Schema (SITUATIONEN-Form), ohne das Produkt zu berühren.
  const gepflanzt = [{ id: 'w9-test-situation', bloecke: [{ eintraege: [
    { quelle: 'identity', feld: '_test_gibt_es_nicht' },
  ] }] }];
  const funde = require('../tools/w9-feldverweise-pruefen.js').pruefeSituationsQuellen(V, gepflanzt, 'SITUATIONEN');
  assert.deepEqual(funde, [{ klasse: 'SITUATIONEN', zeiger: 'w9-test-situation: identity._test_gibt_es_nicht',
    grund: "crossRefFeldUndRoh('identity', '_test_gibt_es_nicht') liefert kein Feld" }]);
  const { rot } = gateBewerten(funde, GRUNDLINIE);
  assert.equal(rot, true, 'ein neuer Verweis ins Leere muss das Gate rot machen');
});

test('[W-9·Rotmachbarkeit] Negativkontrolle: derselbe Zeiger auf ein echtes Feld bleibt grün', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('w9-test-pw');
  const echt = [{ id: 'w9-test-situation', bloecke: [{ eintraege: [
    { quelle: 'identity', feld: 'givenName' },
  ] }] }];
  const funde = require('../tools/w9-feldverweise-pruefen.js').pruefeSituationsQuellen(V, echt, 'SITUATIONEN');
  assert.deepEqual(funde, []);
});

test('[W-9] NOTFALL_KERN_FELDER: liste:-Selektor wird über feldDefFuer aufgelöst (Positiv- und Negativfall)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('w9-test-pw');
  const { pruefeNotfallKernFelder } = require('../tools/w9-feldverweise-pruefen.js');
  const gepflanztOhne = [{ sektor: 'vorsorge', feld: 'liste:vorsorge_instrumente:living-will:_test_kein_unterfeld' }];
  assert.equal(pruefeNotfallKernFelder(Object.assign({}, V, { NOTFALL_KERN_FELDER: gepflanztOhne })).length, 1);
  const echtes = [{ sektor: 'advanceCare', feld: 'liste:provisionInstruments:living-will:organDonation' }];
  assert.equal(pruefeNotfallKernFelder(Object.assign({}, V, { NOTFALL_KERN_FELDER: echtes })).length, 0);
});
