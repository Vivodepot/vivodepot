'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ohne gesetztes Intervall keine Fälligkeitsaussage.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor dem Bau geschrieben und rot.

   DER BEFUND: Eine Patientenverfügung gilt nach § 1827 BGB grundsätzlich
   lebenslang; eine gesetzliche Prüffrist gibt es nicht. Die zwölf Monate,
   mit denen die Ampel bisher OHNE gesetztes Intervall rechnete
   (`ERINNERUNG_STANDARD_INTERVALL_MONATE = 12`), sind damit keine Regel,
   die Vivodepot wiedergibt, sondern eine, die es AUFSTELLT — und noch dazu
   unsichtbar: aus einer Zahl im Code, die niemand eingestellt hat.

   Kein Intervall heisst KEINE Aussage. Nicht grau, nicht „unbekannt", nicht
   eine neutrale Zeile — gar keine Ampel und gar keine Zeile in der
   Prüftermin-Sicht. Dieselbe Haltung wie Record-only: Vivodepot behauptet
   nichts über Dinge, die die Bürgerin nicht gesagt hat.

   NICHT BETROFFEN: das harte `ablaufDatum` (Ausweise). Dort steht ein Datum
   auf dem Dokument selbst — das ist eine Tatsache, keine Annahme, und bleibt
   unverändert.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-07-24T12:00:00Z');

test('[KeinDefault] Dokument OHNE Intervall und OHNE Ablauf → keine Ampel', () => {
  const { V } = ladeKern();
  // Ein datiertes Dokument, aber ohne Rhythmus: früher rechnete die Ampel mit den 12 Monaten.
  const doc = { id: 'd1', typ: 'living-will', name: 'Patientenverfügung',
    sektorId: 'vorsorge', gueltigAb: '2024-01-01', aktualisiertAm: '2024-01-01' };
  const st = V.dokumentAmpelStatus(doc, JETZT);
  assert.equal(st, null,
    'Ohne gesetztes Intervall darf keine Ampel entstehen. Die 12-Monats-Annahme war eine '
    + 'Fälligkeitsaussage, die Vivodepot selbst aufstellt — genau das faellt hier weg.');
});

test('[KeinDefault] Dokument MIT Intervall → Ampel wie bisher', () => {
  const { V } = ladeKern();
  const doc = { id: 'd2', typ: 'living-will', name: 'PV', sektorId: 'vorsorge',
    gueltigAb: '2024-01-01', aktualisiertAm: '2024-01-01', pruefIntervallMonate: 12 };
  const st = V.dokumentAmpelStatus(doc, JETZT);
  assert.ok(st, 'mit gesetztem Intervall gibt es eine Ampel');
  assert.equal(st.stufe, 'rot', 'zweieinhalb Jahre bei 12-Monats-Rhythmus → überfällig');
});

test('[KeinDefault] das harte ablaufDatum bleibt unberührt — Tatsache, keine Annahme', () => {
  const { V } = ladeKern();
  // Kein Intervall, aber ein Ablaufdatum (Ausweis-Fall). Die Ampel muss trotzdem greifen.
  const doc = { id: 'd3', typ: 'severeDisabilityCards', name: 'Ausweis', sektorId: 'sozialversicherung',
    ablaufDatum: '2026-08-01' };
  const st = V.dokumentAmpelStatus(doc, JETZT);
  assert.ok(st, 'ein Ablaufdatum steht auf dem Dokument selbst und trägt weiterhin eine Ampel');
  assert.equal(st.stufe, 'gelb', 'in den nächsten 30 Tagen fällig → gelb');
});

test('[KeinDefault] renderPrueftermine LISTET ein Dokument ohne Intervall — ohne Ampelstatus', () => {
  // Umkehrung des frueheren Tests (Nachtrag 24.07.): Der Bereich ist das einzige Fenster, durch
  // das jemand von der Funktion erfaehrt. Ausblenden hiesse: sie laesst sich nicht kennenlernen.
  // Also erscheint das Dokument — aber OHNE Fälligkeitsaussage, denn niemand hat eine festgelegt.
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: {}, menschen: [], dokumente: [
    { id: 'ohne', typ: 'living-will', name: 'Ohne Rhythmus', sektorId: 'vorsorge',
      gueltigAb: '2024-01-01', aktualisiertAm: '2024-01-01' },
    { id: 'mit', typ: 'enduring-power-of-attorney', name: 'Mit Rhythmus', sektorId: 'vorsorge',
      gueltigAb: '2024-01-01', aktualisiertAm: '2024-01-01', pruefIntervallMonate: 12 },
  ] });
  const liste = V.prueftermineDokumente(JETZT);
  const ohne = liste.find(r => r.id === 'ohne');
  assert.ok(ohne, 'das Dokument ohne Intervall erscheint jetzt in der Sicht');
  assert.ok(ohne.ohneRhythmus === true, 'es traegt die Markierung „kein Rhythmus"');
  assert.ok(!ohne.stufe, 'aber KEINEN Ampelstatus — Vivodepot behauptet keine Fälligkeit');
  assert.ok(!ohne.faelligAm, 'und keine Fälligkeitsangabe');
  const mit = liste.find(r => r.id === 'mit');
  assert.ok(mit && mit.stufe, 'das datierte mit Intervall traegt weiterhin eine Ampel');
});

test('[KeinDefault] die ohne-Rhythmus-Zeilen stehen HINTER den bewerteten', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: {}, menschen: [], dokumente: [
    { id: 'ohne', typ: 'living-will', name: 'AAA Ohne', sektorId: 'vorsorge',
      gueltigAb: '2024-01-01', aktualisiertAm: '2024-01-01' },
    { id: 'rot', typ: 'enduring-power-of-attorney', name: 'ZZZ Rot', sektorId: 'vorsorge',
      gueltigAb: '2022-01-01', aktualisiertAm: '2022-01-01', pruefIntervallMonate: 12 },
  ] });
  const liste = V.prueftermineDokumente(JETZT);
  // Trotz alphabetisch fruehem Namen steht die bewertete Zeile vorn.
  assert.equal(liste[0].id, 'rot', 'die bewertete Zeile steht vorn');
  assert.equal(liste[liste.length - 1].id, 'ohne', 'die ohne-Rhythmus-Zeile steht dahinter');
});

test('[KeinDefault] der Bereich ist auch OHNE einen einzigen Rhythmus sichtbar', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: {}, menschen: [], dokumente: [
    { id: 'a', typ: 'living-will', name: 'PV', sektorId: 'vorsorge',
      gueltigAb: '2024-01-01', aktualisiertAm: '2024-01-01' },
  ] });
  const html = V.prueftermineSektionHTML();
  assert.ok(html.includes('ampel-sektion') || /ampel-liste|ampel-zeile/.test(html),
    'die Prüftermin-Sektion erscheint, obwohl kein Dokument einen Rhythmus hat');
  assert.ok(/Kein Rhythmus festgelegt/.test(html),
    'und benennt den Zustand ausdrücklich statt zu schweigen: „Kein Rhythmus festgelegt"');
  assert.ok(!/dot-red|dot-amber|dot-green/.test(html), 'kein Farbpunkt bei einer ohne-Rhythmus-Zeile');
});
