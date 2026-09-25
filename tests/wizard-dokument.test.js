'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wizard → Dokument-Registrierung (U2-ADR-014, Stufe 2 · Einheit 4)
   ────────────────────────────────────────────────────────────────────────
   Genau VIER Wizards registrieren beim Abschluss je GENAU EINEN Standard-
   Dokument-Datensatz. U2-ADR-096: NUR NOCH pvwiz → living-will und
   kiwiz → ki-verfuegung — die vier feld-spiegelnden Wizards sind entfernt. Die
   anderen (gebwiz/srwiz/anamwiz/pflwiz/heirwiz/umzwiz) registrieren NICHTS.
   gueltigAb kommt seit U2-ADR-096 aus dem `datum` der NEUESTEN Instrument-Zeile
   des jeweiligen Typs (Selektor, keine eigene Regel). Undatiert → leer: ein
   Dokument mit erfundenem Gueltigkeitsdatum ist schlechter als eines ohne.
   Dedup BY TYP über
   alle Herkünfte (dokumentFuerTyp) → kein zweiter bei erneutem Lauf oder
   vorhandenem migration/panel-Datensatz; idempotent. Fallback: fehlende
   vorverknüpfte Felder brechen die Registrierung nicht (Konsequenz 8).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-06-04T10:00:00Z');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

const DOKUMENT_WIZARDS = [
  { id: 'pvwiz', typ: 'living-will' },
  { id: 'kiwiz', typ: 'ki-verfuegung' },
];
const NICHT_DOKUMENT_WIZARDS = ['gebwiz', 'anamwiz', 'pflwiz', 'heirwiz', 'umzwiz'];

// Legt eine Instrument-Zeile des Typs an (der Ort, an dem `datum` seit U2-ADR-096 lebt).
function instrumentZeile(V, typ, datum) {
  const d = V.getData();
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  const l = d.sektoren.advanceCare.provisionInstruments || (d.sektoren.advanceCare.provisionInstruments = []);
  l.push(datum ? { id: 'r' + l.length, instrument: typ, dateOfLastChange: datum } : { id: 'r' + l.length, instrument: typ });
}

/* ── Dedup-Guard-Helfer ─────────────────────────────────────────────────── */
test('[WizDok] dokumentFuerTyp/dokumentTypExistiert: by-typ über alle Herkünfte', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.dokumentFuerTyp('will'), null);
  assert.equal(V.dokumentTypExistiert('will'), false);
  V.dokumentAnlegen({ typ: 'will', name: 'Migr', quelle: 'migration' }, JETZT);
  assert.ok(V.dokumentFuerTyp('will'));
  assert.equal(V.dokumentTypExistiert('will'), true);
  assert.equal(V.dokumentFuerTyp(''), null);
  assert.equal(V.dokumentFuerTyp(undefined), null);
});

test('[WizDok] WIZARD_DOKUMENT_MAP: jeder Eintrag kann auch wirklich registrieren', async () => {
  const { V } = await frischMitDepot();
  assert.deepEqual(Object.keys(V.WIZARD_DOKUMENT_MAP).sort(), ['kiwiz', 'pvwiz']);
  // Jeder MAP-Eintrag muss auch wirklich einen Datensatz erzeugen koennen — sonst steht dort ein
  // Versprechen, das dokumentAusStandard nicht einloest (genau der kiwiz-Fall).
  for (const [wid, e] of Object.entries(V.WIZARD_DOKUMENT_MAP)) {
    const sd = (V.SEKTOR_BY_ID[e.sektorId] || {}).standardDokumente || [];
    assert.ok(sd.some(d => d.typ === e.typ),
      wid + ': typ „' + e.typ + '" fehlt in ' + e.sektorId + '.standardDokumente — die Registrierung liefe ins Leere');
  }
});

test('[WizDok] registriert je GENAU EINEN Datensatz korrekten Typs', async () => {
  for (const w of DOKUMENT_WIZARDS) {
    const { V } = await frischMitDepot();
    const doc = V.wizardDokumentRegistrieren(w.id, JETZT);
    assert.ok(doc, w.id + ': Datensatz angelegt');
    assert.equal(doc.typ, w.typ, w.id + ': korrekter Typ');
    assert.equal(V.getData().dokumente.filter(d => d.typ === w.typ).length, 1, w.id + ': genau einer');
  }
});

test('[WizDok] Wizards OHNE Dokument registrieren nichts', async () => {
  const { V } = await frischMitDepot();
  for (const id of NICHT_DOKUMENT_WIZARDS) {
    assert.equal(V.wizardDokumentRegistrieren(id, JETZT), null, id + ' darf nichts anlegen');
  }
  assert.equal((V.getData().dokumente || []).length, 0);
});

test('[WizDok] erneuter Lauf desselben Wizards erzeugt KEINE Dublette (idempotent)', async () => {
  for (const w of DOKUMENT_WIZARDS) {
    const { V } = await frischMitDepot();
    V.wizardDokumentRegistrieren(w.id, JETZT);
    V.wizardDokumentRegistrieren(w.id, JETZT);
    assert.equal(V.getData().dokumente.filter(d => d.typ === w.typ).length, 1, w.id + ': keine Dublette');
  }
});

test('[WizDok] Dedup-by-typ: vorhandener migration/panel-Datensatz blockt zweiten', async () => {
  for (const w of DOKUMENT_WIZARDS) {
    const { V } = await frischMitDepot();
    V.dokumentAnlegen({ typ: w.typ, name: 'Vorab', quelle: 'migration' }, JETZT);
    V.wizardDokumentRegistrieren(w.id, JETZT);
    assert.equal(V.getData().dokumente.filter(d => d.typ === w.typ).length, 1, w.id + ': kein zweiter');
  }
});

/* ── gueltigAb aus der Instrument-Zeile (U2-ADR-096) ─────────────────────── */
test('[WizDok] gueltigAb kommt aus dem `datum` der neuesten Zeile des Typs', async () => {
  for (const w of DOKUMENT_WIZARDS) {
    const { V } = await frischMitDepot();
    instrumentZeile(V, w.typ, '2024-01-01');
    instrumentZeile(V, w.typ, '2026-02-02');          // die neuere gewinnt
    const doc = V.wizardDokumentRegistrieren(w.id, JETZT);
    assert.equal(doc.gueltigAb, '2026-02-02', w.id + ': gueltigAb aus der neuesten Zeile');
  }
});

test('[WizDok] undatiert: gueltigAb bleibt LEER — kein Ersatzdatum, kein Ausweichen', async () => {
  for (const w of DOKUMENT_WIZARDS) {
    const { V } = await frischMitDepot();
    instrumentZeile(V, w.typ, null);                  // Zeile ohne datum
    let doc;
    assert.doesNotThrow(() => { doc = V.wizardDokumentRegistrieren(w.id, JETZT); });
    assert.ok(!doc.gueltigAb, w.id + ': ein erfundenes Gueltigkeitsdatum waere schlechter als keins');
  }
});

test('[WizDok] gar keine Instrument-Zeile: gueltigAb leer, bricht nicht', async () => {
  const { V } = await frischMitDepot();
  let doc;
  assert.doesNotThrow(() => { doc = V.wizardDokumentRegistrieren('pvwiz', JETZT); });
  assert.ok(doc && !doc.gueltigAb);
});

test('[WizDok] vorhandenes gueltigAb wird NICHT überschrieben', async () => {
  const { V } = await frischMitDepot();
  V.dokumentAnlegen({ typ: 'living-will', name: 'Vorab', quelle: 'panel', gueltigAb: '2020-05-05' }, JETZT);
  instrumentZeile(V, 'living-will', '2026-02-02');
  V.wizardDokumentRegistrieren('pvwiz', JETZT);
  assert.equal(V.dokumentFuerTyp('living-will').gueltigAb, '2020-05-05');
});

test('[WizDok] wizardAbschluss feuert die Registrierung (voller Lauf via wizardLauf)', async () => {
  const { V } = await frischMitDepot();
  V.wizardLauf('pvwiz');
  V.wizardAbschluss();
  assert.ok(V.dokumentTypExistiert('living-will'), 'Abschluss registriert den Datensatz');
});
