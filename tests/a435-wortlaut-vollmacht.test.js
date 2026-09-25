'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A435 (21.08.2026) — der Wortlaut an der Ereignis-Zeile.
   ────────────────────────────────────────────────────────────────────────
   ENTSCHIEDEN: die LANGE Fassung wird ausgeliefert, mit dem
   dritten Satz „Eine Vollmacht endet nicht automatisch mit einer Trennung oder
   Scheidung — sie gilt, bis sie widerrufen wird."

   DER UNTERSCHIED IST EIN HALBSATZ UND NICHT KLEIN: „sie gilt, bis sie
   widerrufen wird" ist der Hinweis auf die HANDLUNG, nicht die blosse
   Feststellung der Rechtslage.

   ER HÄNGT AM INSTRUMENT, NICHT AM ANLASS, und der Grund ist gemessen:
   `familienstand` markiert auch Testament-, Sorgerechts- und Betreuungs-Zeilen.
   Ein Satz über Vollmachten stünde dort als falsche Aussage — genau das, was
   U2-ADR-025 verbietet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-08-21T12:00:00.000Z');

function depotMitInstrument(V, typ) {
  const d = V.leeresDepot();
  V.setData(d);
  d.menschen.push({ id: 'p-1', vorname: 'Mara', nachname: 'Bevoll' });
  d.sektoren.advanceCare = { provisionInstruments: [{ id: 'z-1', instrument: typ, authorizedPersons: { ref: 'p-1' } }] };
  V.ereignisMarkieren('familienstand', 'p-1', JETZT);
  const doc = d.dokumente.find((x) => (x.felder || []).some((f) => f.zeilenId === 'z-1'));
  return V._ereignisAnlaesseFuerZeile(doc);
}

test('[A435] an einer VOLLMACHT steht der dritte Satz', () => {
  const { V } = ladeKern();
  const anlaesse = depotMitInstrument(V, 'enduring-power-of-attorney');
  assert.equal(anlaesse.length, 1);
  assert.match(anlaesse[0].text, /Familienstand geändert/, 'der ausgelieferte zweite Satz bleibt');
  /* Wortlaut seit 22.09.2026 geändert (Auftrag „Paragraphen raus", X1b, bestätigt):
     „sie gilt, bis sie widerrufen wird" war eine unbelegte Rechtsaussage und ist raus; der dritte
     Satz besteht jetzt aus einer Aussage plus einer Handlungsaufforderung. Die Probe hier bleibt
     bei ihrem eigentlichen Zweck (A435: ein dritter Satz existiert, hängt am Instrument). */
  assert.match(anlaesse[0].text, /kann auch nach einer Trennung oder Scheidung fortgelten/,
    'ROT VOR A435: die knappe Fassung war ausgeliefert, der dritte Satz fehlte');
  assert.match(anlaesse[0].text, /prüfen Sie, ob Sie sie ändern möchten/, 'der Halbsatz zur HANDLUNG');
});

test('[A435·Rot-Beweis] an einem TESTAMENT steht er NICHT — dort wäre er falsch', () => {
  /* `familienstand` markiert auch Testament-Zeilen (`testament_bedachte` steht dafür in
     EREIGNIS_ACHSE_FELDER). Hinge der Satz am Anlass statt am Instrument, stünde an einer
     Testament-Zeile eine Aussage über Vollmachten. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  d.menschen.push({ id: 'p-1', vorname: 'Mara', nachname: 'Bedacht' });
  d.sektoren.advanceCare = { provisionInstruments: [{ id: 'z-1', instrument: 'will', personsNamedInTheWill: [{ ref: 'p-1' }] }] };
  V.ereignisMarkieren('familienstand', 'p-1', JETZT);
  const doc = d.dokumente.find((x) => (x.felder || []).some((f) => f.zeilenId === 'z-1'));
  const anlaesse = V._ereignisAnlaesseFuerZeile(doc);
  assert.equal(anlaesse.length, 1, 'Vorbedingung: die Testament-Zeile IST markiert');
  assert.match(anlaesse[0].text, /Familienstand geändert/);
  assert.doesNotMatch(anlaesse[0].text, /Vollmacht/,
    'an einem Testament ist ein Satz über Vollmachten eine falsche Aussage (U2-ADR-025)');
});

test('[A435] die sechs übrigen Instrumente tragen ihn ebenfalls nicht', () => {
  const { V } = ladeKern();
  for (const typ of ['living-will', 'will', 'custodianship-declaration',
                     'guardian-nomination', 'ki-verfuegung', 'custodian-appointment']) {
    const anlaesse = depotMitInstrument(V, typ);
    assert.equal(anlaesse.length, 1, typ + ': Vorbedingung, die Zeile ist markiert');
    assert.doesNotMatch(anlaesse[0].text, /Vollmacht/, typ + ' ist keine Vollmacht');
  }
});

test('[A435] die Liste der Vollmacht-Typen ist geschlossen und nennt genau einen', () => {
  /* Sechs der sieben Instrument-Typen sind Verfügungen oder ein Gerichtsbeschluss. Wächst die
     Liste, ist das eine Entscheidung — und diese Probe zwingt, sie zu treffen. */
  const { V } = ladeKern();
  assert.deepEqual([...V.EREIGNIS_VOLLMACHT_TYPEN], ['enduring-power-of-attorney']);
  const typFeld = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap((s) => s.felder || [])
    .find((f) => f.id === 'provisionInstruments').unterFelder.find((u) => u.id === 'instrument');
  assert.equal(typFeld.optionen.length, 7, 'sieben Instrument-Typen — sechs davon keine Vollmacht');
  for (const t of V.EREIGNIS_VOLLMACHT_TYPEN) {
    assert.ok(typFeld.optionen.some((o) => o.wert === t), t + ' steht nicht in der Typenliste');
  }
});

test('[A435] die anderen zwei Anlässe bleiben unberührt', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  d.menschen.push({ id: 'p-1', vorname: 'Mara', nachname: 'Bevoll' });
  d.sektoren.advanceCare = { provisionInstruments: [{ id: 'z-1', instrument: 'enduring-power-of-attorney', authorizedPersons: { ref: 'p-1' } }] };
  V.ereignisMarkieren('tod', 'p-1', JETZT);
  const doc = d.dokumente.find((x) => (x.felder || []).some((f) => f.zeilenId === 'z-1'));
  const anlaesse = V._ereignisAnlaesseFuerZeile(doc);
  assert.equal(anlaesse[0].typ, 'tod');
  assert.equal(anlaesse[0].text, V.STRINGS.ereignisAnlassTod, 'der Tod-Wortlaut ist unverändert');
});
