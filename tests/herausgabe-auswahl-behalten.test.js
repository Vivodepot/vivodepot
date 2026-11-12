'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B23, Zug 3 (31.10.2026): die Auswahl eines Bereichs bekommt ein Gedächtnis.
   ────────────────────────────────────────────────────────────────────────
   `bereichsAuswahlBehalten(sektorId, name, kennungen)` legt die Auswahl als Zusammenstellung ab
   (`zusammenstellungSpeichern`, Kennungsform wie dort); `bereichsAuswahlVorschlaege(sektorId)`
   nennt die behaltenen Zusammenstellungen, deren Kennungen alle in diesem Bereich liegen.
   Eine gemerkte Auswahl füllt nur vor: `bereichsAuswahlAnwenden` gibt die Vorbelegung für die
   Übersicht zurück und endet in `flowExportUebersicht` — sie ruft nie selbst die Ausgabe.
   Die Oberfläche (Zeile „Behalten", Zeile „Wie beim letzten Mal") baut eine andere Stelle.
   Rot-Beweis: gegen den Stand vor B23 (vivodepot.html aus HEAD) fehlen `bereichsAuswahlBehalten`, `bereichsAuswahlVorschlaege` und `bereichsAuswahlAnwenden`; jede dieser Proben schlägt dort fehl.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZUSATZ = ['bereichsAuswahlBehalten', 'bereichsAuswahlVorschlaege', 'bereichsAuswahlAnwenden', 'SEKTOR_BY_ID'];
const PW = 'pw';

function felderIds(V, sektorId) {
  return (V.__zusatz.SEKTOR_BY_ID[sektorId].sektionen || []).flatMap((sek) => sek.felder || []).map((f) => f.id);
}

test('[B23·Z3] Behalten, Depot speichern und neu laden: der Vorschlag ist wieder da', async () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  const behalten = V.__zusatz.bereichsAuswahlBehalten;
  const vorschlaege = V.__zusatz.bereichsAuswahlVorschlaege;
  assert.equal(typeof behalten, 'function', 'ROT ERWARTET vor dem Fix: bereichsAuswahlBehalten fehlt');
  assert.equal(typeof vorschlaege, 'function', 'ROT ERWARTET vor dem Fix: bereichsAuswahlVorschlaege fehlt');
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const kennungen = ['identity.givenName', 'identity.familyName'];
  assert.deepEqual(vorschlaege('identity'), [], 'vorher nichts');
  const r = behalten('identity', 'Für Dr. Meyer', kennungen);
  assert.equal(r.ok, true);
  const gesamt = felderIds(V, 'identity').length;
  const vorher = vorschlaege('identity');
  assert.equal(vorher.length, 1);
  assert.equal(vorher[0].name, 'Für Dr. Meyer');
  assert.equal(vorher[0].anzahl, 2);
  assert.equal(vorher[0].gesamt, gesamt);
  assert.equal(typeof vorher[0].id, 'string');

  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const nachher = vorschlaege('identity');
  assert.equal(nachher.length, 1, 'die Auswahl überlebt Speichern und Laden');
  assert.deepEqual(nachher[0], vorher[0]);
});

test('[B23·Z3] ein Vorschlag erscheint nur in dem Bereich, in dem alle seine Kennungen liegen', async () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  // Eine Zusammenstellung über zwei Bereiche (über den Kern-Weg angelegt) gehört keinem einzelnen Bereich.
  V.zusammenstellungSpeichern('Quer', ['identity.givenName', 'health.insuranceNumber']);
  V.zusammenstellungSpeichern('Nur Identität', ['identity.givenName']);
  const v = V.__zusatz.bereichsAuswahlVorschlaege;
  assert.deepEqual(v('identity').map((x) => x.name), ['Nur Identität']);
  assert.deepEqual(v('health').map((x) => x.name), []);
});

test('[B23·Z3] behalten verlangt Name, Kennungen und einen einzigen Bereich', async () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const b = V.__zusatz.bereichsAuswahlBehalten;
  assert.equal(b('identity', '', ['identity.givenName']).ok, false, 'ohne Name');
  assert.equal(b('identity', 'X', []).ok, false, 'ohne Kennungen');
  const fremd = b('identity', 'X', ['identity.givenName', 'health.insuranceNumber']);
  assert.equal(fremd.ok, false, 'eine Kennung aus einem anderen Bereich');
  assert.equal(fremd.grund, 'bereich');
  assert.deepEqual(V.__zusatz.bereichsAuswahlVorschlaege('identity'), [], 'abgelehnt heißt: nichts abgelegt');
});

test('[B23·Z3] anwenden gibt die Vorbelegung für die Übersicht zurück und eröffnet nichts weiter', async () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.__zusatz.bereichsAuswahlBehalten('identity', 'Für Dr. Meyer', ['identity.givenName']);
  const id = V.__zusatz.bereichsAuswahlVorschlaege('identity')[0].id;
  const vb = V.__zusatz.bereichsAuswahlAnwenden('identity', id);
  assert.deepEqual(vb, { sektorId: 'identity', kennungen: ['identity.givenName'] });
  assert.equal(V.__zusatz.bereichsAuswahlAnwenden('identity', 'gibt-es-nicht'), null);
  assert.equal(V.__zusatz.bereichsAuswahlAnwenden('health', id), null, 'eine Auswahl gehört ihrem Bereich');
});

test('[B23·Z3·Klasse] die Anwenden-Funktion ruft keine Ausgabe, sie endet in flowExportUebersicht', () => {
  const a = KERN.indexOf('function bereichsAuswahlAnwenden(');
  assert.ok(a > -1, 'bereichsAuswahlAnwenden steht im Kern');
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(rumpf, /flowExportUebersicht\(/, 'sie endet in der Übersicht, der Kontrolle vor der Ausgabe');
  assert.doesNotMatch(rumpf, /flowSektorExport\(|flowFormatExport\(|flowBereichPdf\(|exportAuswahlEphemerAnwenden\(|flowEudiwUebergabe\(|kernAPI\.exportiere|exportiere\(/,
    'eine gemerkte Auswahl wird nie stillschweigend angewandt');
});
