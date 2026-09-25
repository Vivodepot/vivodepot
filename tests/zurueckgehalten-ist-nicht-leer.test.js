'use strict';
/* „Hinterlegt, nur mit Freigabe sichtbar" ist eine andere Aussage als „nicht hinterlegt" (19.09.2026).
   Ein sensibles Feld mit Inhalt fehlte ohne Freigabe im PDF und in der Lese-App spurlos; ein Bereich
   aus lauter zurückgehaltenen Feldern trug „nicht hinterlegt". Eine Angehörige liest daraus, es gebe
   keine Patientenverfügung. Jetzt: Feldname + eigener Satz, nie der Wert; leer bleibt „nicht hinterlegt". */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');

const WERT = 'GEHEIMWERTPOLICE4711';
const SEKTOR = 'mobility';
const FELD = 'policyNumber';   // schema-sensibles Textfeld
const LEER_SEKTOR = 'education';

function pdfText(bytes) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'zurueck-'));
  const p = path.join(t, 'a.pdf');
  fs.writeFileSync(p, bytes);
  try { return execFileSync('pdftotext', ['-layout', p, '-'], { encoding: 'utf8' }); } finally { fs.rmSync(t, { recursive: true, force: true }); }
}

test('[Kern·Vorbedingung] das Testfeld ist wirklich sensibel, der Satz ist ein anderer als der Leer-Satz', () => {
  const { V } = ladeKern();
  const feld = V.SEKTOR_BY_ID[SEKTOR].sektionen.flatMap((s) => s.felder).find((f) => f.id === FELD);
  assert.ok(feld && V.feldIstSensibel(feld, SEKTOR), FELD + ' muss sensibel sein');
  assert.notEqual(V.STRINGS.zurueckgehaltenVorhanden, V.STRINGS.leerZustand);
  assert.match(V.STRINGS.zurueckgehaltenVorhanden, /Freigabe/);
});

test('[Kern·Modell·Positivkontrolle mit Freigabe] zurückgehalten ≠ leer: Zeile mit Feldname und Satz ohne Wert; ein Bereich ohne Inhalt bleibt leer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('zurueck-modell-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen(SEKTOR, FELD, WERT);
  const m = V.bereichVollModell(SEKTOR, {});
  const zeilen = m.bereiche[0].sektionen.flatMap((s) => s.zeilen);
  assert.equal(m.bereiche[0].leer, false, 'ein Bereich mit zurückgehaltenem Inhalt ist nicht leer');
  const z = zeilen.find((r) => r.wert === V.STRINGS.zurueckgehaltenVorhanden);
  assert.ok(z && z.label, 'die zurückgehaltene Zeile trägt den Feldnamen');
  assert.ok(!JSON.stringify(m).includes(WERT), 'der Wert selbst darf nicht im Modell stehen');
  const mitFreigabe = V.bereichVollModell(SEKTOR, { sensibel: true });
  assert.ok(JSON.stringify(mitFreigabe).includes(WERT), 'mit Freigabe steht der Wert da');
  assert.equal(V.bereichVollModell(LEER_SEKTOR, {}).bereiche[0].leer, true, 'ohne jeden Inhalt bleibt der Bereich leer („nicht hinterlegt")');
});

test('[Kern·PDF] im echten PDF steht der neue Satz, nie der Wert; der leere Bereich trägt „nicht hinterlegt"', async () => {
  const k = ladeMitAusgabe();
  const { V } = k;
  await V.depotAnlegen('zurueck-pdf-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen(SEKTOR, FELD, WERT);
  V.flowBereichPdf(SEKTOR, {});
  V.flowBereichPdf(LEER_SEKTOR, {});
  assert.ok((await warteAufDateien(k, 2, 8000)) >= 2, 'beide PDFs müssen entstehen');
  const voll = pdfText(await k.bytes(0));
  const leer = pdfText(await k.bytes(1));
  assert.ok(voll.includes(V.STRINGS.zurueckgehaltenVorhanden), 'PDF ohne Freigabe: der eigene Satz fehlt');
  assert.ok(!voll.includes('nicht hinterlegt'), 'ein Bereich mit zurückgehaltenem Inhalt darf nicht „nicht hinterlegt" sagen');
  assert.ok(!voll.includes(WERT));
  assert.ok(leer.includes('nicht hinterlegt') && !leer.includes(V.STRINGS.zurueckgehaltenVorhanden), 'der leere Bereich sagt „nicht hinterlegt"');
});

test('[Lese-App] zurückgehalten zeigt Feldname + Satz, nie den Wert; leer zeigt „nicht hinterlegt"', () => {
  const { V: L } = ladeLesen();
  const K = ladeKern().V;
  const depot = K.leeresDepot();
  L.setData(depot);
  depot.sektoren = depot.sektoren || {};
  depot.sektoren[SEKTOR] = { [FELD]: WERT };
  L.setData(depot);
  const html = L.sektorHTML(SEKTOR);
  assert.ok(html.includes(L.STRINGS.zurueckgehaltenVorhanden), 'Lese-App: der Satz fehlt');
  assert.ok(html.includes('zurueckgehalten-marke'));
  assert.ok(!html.includes(WERT), 'der Wert darf nicht erscheinen');
  assert.ok(!html.includes('leer-bereich'), 'kein „nicht hinterlegt" für den ganzen Bereich');
  const leer = L.sektorHTML(LEER_SEKTOR);
  assert.ok(leer.includes('leer-bereich') && !leer.includes(L.STRINGS.zurueckgehaltenVorhanden));
});

test('[Lese-App·EN] der englische Satz unterscheidet sich vom Leer-Satz und steht unter Zusicherungsschutz', () => {
  const { V: L } = ladeLesen();
  assert.ok(L.ZUSICHERUNGS_SCHLUESSEL_LESEN.includes('zurueckgehaltenVorhanden'));
  assert.notEqual(L.ZUSICHERUNG_TEXTE_EN.zurueckgehaltenVorhanden, 'not stored');
  const { V } = ladeKern();
  assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_KERN.includes('zurueckgehaltenVorhanden'));
});

test('[Kern·Gegenprobe] ein NICHT sensibles Feld zeigt seinen Wert, nie den Zurückgehalten-Satz', async () => {
  const { V } = ladeKern();
  const NICHT_SENSIBEL = 'deutschlandticketPublic';
  const feld = V.SEKTOR_BY_ID[SEKTOR].sektionen.flatMap((s) => s.felder).find((f) => f.id === NICHT_SENSIBEL);
  assert.ok(feld && !V.feldIstSensibel(feld, SEKTOR), NICHT_SENSIBEL + ' muss ein nicht sensibles Feld sein');
  await V.depotAnlegen('zurueck-gegenprobe-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen(SEKTOR, NICHT_SENSIBEL, 'OEFFENTLICHWERT42');
  const zeilen = V.bereichVollModell(SEKTOR, {}).bereiche[0].sektionen.flatMap((s) => s.zeilen);
  assert.ok(zeilen.some((r) => String(r.wert).includes('OEFFENTLICHWERT42')), 'der Wert eines nicht sensiblen Feldes muss sichtbar sein');
  assert.ok(!zeilen.some((r) => r.wert === V.STRINGS.zurueckgehaltenVorhanden), 'ein nicht sensibles Feld darf nicht als zurückgehalten erscheinen');
});
