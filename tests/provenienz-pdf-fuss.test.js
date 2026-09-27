'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sub-Modus-Provenienz im PDF-Fuß (Teil 5, Schnitt 5.3)
   ────────────────────────────────────────────────────────────────────────
   Im Anker: „Erstellt von [Name]". Im Sub-Kontext mit echten Werten:
   „Erstellt von [Bevollmächtigte] unter Vollmacht für [Inhaber]". pdfFussText ist
   der reine, testbare Fuß-Erzeuger (kein jsPDF nötig).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const SUBPW = 'subpw';

async function imSubKontext(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Berta Bevollmächtigte');
  const e = await V.subDepotAnlegen(
    { bezeichnung: 'Depot von Anna', inhaberin: 'Anna Inhaber', verwaltungsTyp: 'verwaltet' }, SUBPW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUBPW);
  V.subKontextBetreten(e.depotUUID);
  return e;
}

test('1) pdfFussText im Anker: „Erstellt von [Name]", ohne Vollmacht-Zusatz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Berta');
  const meta = V.situationPdfMeta('geburt');
  const fuss = V.pdfFussText(meta);
  assert.ok(fuss.includes(V.STRINGS.pdfFussErstelltVon + ' Berta'));
  assert.ok(!fuss.includes(V.STRINGS.pdfFussUnterVollmachtFuer), 'kein Vollmacht-Zusatz im Anker');
});

test('2) situationPdfMeta im Sub-Kontext: unterVollmacht + echter Inhaber-Name', async () => {
  const { V } = ladeKern();
  await imSubKontext(V);
  const meta = V.situationPdfMeta('geburt');
  assert.equal(meta.unterVollmacht, true);
  assert.equal(meta.generierer, 'Berta Bevollmächtigte', 'handelnde Person = Bevollmächtigte');
  assert.equal(meta.inhaber, 'Anna Inhaber', 'Inhaber aus der Verwaltungsliste');
});

test('3) pdfFussText im Sub-Kontext: „Erstellt von [Bevollmächtigte] unter Vollmacht für [Inhaber]"', async () => {
  const { V } = ladeKern();
  await imSubKontext(V);
  const fuss = V.pdfFussText(V.situationPdfMeta('geburt'));
  assert.ok(fuss.includes('Erstellt von Berta Bevollmächtigte unter Vollmacht für Anna Inhaber'),
    'voller Provenienz-Satz mit echten Werten: ' + fuss);
});

test('4) keine Platzhalter — die Werte sind echt (nicht „[Inhaber]" o. ä.)', async () => {
  const { V } = ladeKern();
  await imSubKontext(V);
  const fuss = V.pdfFussText(V.situationPdfMeta('geburt'));
  assert.ok(!/\[|\]/.test(fuss), 'keine eckigen Klammern / Platzhalter');
});
