'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Instrument-Zeile antwortet aus dem RECORD — das Gate ist Geschichte.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor dem Umbau geschrieben und rot.

   `instrumentZeileModell(typ)` beantwortet die Frage „gibt es dieses
   Vorsorge-Instrument?". Sie tat das bisher aus ZWEI Quellen: dem Record
   (Zeile in der Instrument-Liste) und, ersatzweise, dem alten Flachfeld-Gate
   — weil das Gate den Zustand „in Vorbereitung" tragen konnte, den ein
   Record nicht ausdrückt.

   Mit U2-ADR-096 sind die Gates entfallen und „in Vorbereitung" mit ihnen
   (E2, bewusst und dokumentiert). Der Gate-Zweig ist damit toter Code, der
   auf Felder zeigt, die es nicht mehr gibt — gemessen: alle vier
   Leitfeld-Gates lösen heute auf nichts auf.

   ZWEITER, SICHTBARER SCHADEN: Die Auswahl-OPTIONEN des Modells stammten
   aus der Gate-Definition. Ohne Gate sind sie leer — und ein auswahl-Feld
   ohne Optionen zeigt den Rohwert. Auf dem Situationsblatt stand deshalb
   „ja" statt eines Bürger-Textes. Das ist dieselbe Klasse wie die
   Optionscodes im Alt-Label-Register: Der Wert ist da, die Bedeutung fehlt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const MIT_TESTAMENT = () => ({
  sektoren: { advanceCare: { provisionInstruments: [{ id: 't1', instrument: 'will', storageLocation: 'beim Notar Dr. Sommer' }] } },
  menschen: [],
});
const OHNE = () => ({ sektoren: { advanceCare: {} }, menschen: [] });

test('[RecOnly] Record vorhanden → die Zeile sagt es, in Buerger-Sprache', () => {
  const { V } = ladeKern();
  V.setData(MIT_TESTAMENT());
  const m = V.instrumentZeileModell('will');
  const text = V.feldWertText(m.feld, m.roh);
  assert.ok(m.feld.optionen && m.feld.optionen.length,
    'Ohne Optionen zeigt ein auswahl-Feld seinen Rohwert. Auf dem Situationsblatt stand deshalb '
    + 'schlicht „ja" — technisch richtig, fuer eine Institution nichtssagend.');
  assert.notEqual(text, 'ja', 'der Rohwert darf nicht die Anzeige sein');
  assert.ok(/vorhanden|hinterlegt|liegt vor/i.test(text), 'lesbarer Text statt Code: ' + text);
});

test('[RecOnly] kein Record → die Zeile behauptet nichts', () => {
  const { V } = ladeKern();
  V.setData(OHNE());
  const m = V.instrumentZeileModell('will');
  assert.ok(!m.roh, 'ohne Record gibt es keine Aussage — „nicht hinterlegt" ist die Anzeige, '
    + 'nicht „nein". Die Buergerin hat nicht gesagt, dass es keines gibt.');
});

test('[RecOnly] KEIN Gate-Zweig mehr: ein Flachfeld-Rest aendert die Antwort NICHT', () => {
  const { V } = ladeKern();
  // Ein Alt-Depot, in dem das Gate noch steht, aber kein Record existiert. Frueher haette die
  // Zeile daraus „ja" gemacht. Das Gate ist entfallen — es darf nicht mehr durch die Hintertuer
  // wirken, sonst haengt die Anzeige an einem Feld, das niemand mehr pflegen kann.
  // living-will, NICHT testament: Testaments Leitfeld ist `instrument:testament` (die
  // abgeleitete Zeile selbst), also kein Flachfeld — der Test waere dort aus dem falschen Grund
  // gruen gewesen. Die PV hatte ein echtes Gate-Flachfeld, und genau das ist der Fall, der zaehlt.
  // Der Bereich ist der heutige (`advanceCare`) — unter dem alten Bereichsnamen sähe der Kern
  // den Rest gar nicht, und die Probe wäre aus dem falschen Grund grün. `patientenverf_vorhanden`
  // bleibt die alte Flachfeld-Kennung: genau das ist der Rest, um den es geht.
  V.setData({ sektoren: { advanceCare: { patientenverf_vorhanden: 'ja' } }, menschen: [] });
  const m = V.instrumentZeileModell('living-will');
  assert.ok(!m.roh,
    'Ein entfallenes Gate darf die Antwort nicht mehr bestimmen — sonst zeigt die App einen '
    + 'Zustand, den die Buergerin nirgends mehr aendern kann');
});

test('[RecOnly] jeder Instrument-Typ liefert ein vollstaendiges Modell', () => {
  const { V } = ladeKern();
  V.setData(MIT_TESTAMENT());
  const liste = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder)
    .find(f => f.id === 'provisionInstruments');
  const typen = ((liste.unterFelder || []).find(u => u.id === 'instrument').optionen || []).map(o => o.wert);
  const kaputt = typen.filter((t) => {
    const m = V.instrumentZeileModell(t);
    return !m || !m.feld || !m.feld.label || !Array.isArray(m.feld.optionen) || !m.feld.optionen.length;
  });
  assert.equal(kaputt.join(', '), '',
    'Diese Typen liefern kein anzeigbares Modell — typgetrieben geprueft, damit ein kuenftiger '
    + 'Instrument-Typ nicht stillschweigend ohne Optionen dasteht: ' + kaputt.join(', '));
});

test('[RecOnly] die Lese-App antwortet gleich (Paritaet)', () => {
  const K = ladeKern().V;
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  K.setData(MIT_TESTAMENT());
  L.setData(L._foldVollmachtenLesen(MIT_TESTAMENT()));
  const a = K.instrumentZeileModell('will');
  const b = L.instrumentZeileModellLesen('will');
  assert.equal(String(K.feldWertText(a.feld, a.roh)), String(L.feldWertText(b.feld, b.roh)),
    'Kern und Lese-App muessen dieselbe Aussage treffen — sonst sagt die Institution etwas '
    + 'anderes als die Buergerin sieht');
});
