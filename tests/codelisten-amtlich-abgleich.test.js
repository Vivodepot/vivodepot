'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Amtliche Codelisten als Prüfer: EQF/DQR, ISO 4217, ISO 13616 (tools/codelisten-amtlich-abgleich.js)
   ────────────────────────────────────────────────────────────────────────
   Die Suite fährt das Werkzeug gegen die EQF/DQR-Liste im Repo und gegen die erfundenen Fixtures für ISO 4217 und das
   IBAN-Register (die echten Listen dürfen nicht ins Repo; der echte Lauf ist ein Befehl mit --iso4217/--iban-register).
   Jede Prüfung hat einen Rot-Beweis: ein fremder Code, eine falsche Länge, eine abgelehnte Beispiel-IBAN, eine
   verschobene DQR-Zuordnung müssen auffallen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/codelisten-amtlich-abgleich.js');
const { ladeKern } = require('./load-kern.js');

const { V } = ladeKern();
const KERN = { IBAN_LAENGE: V.IBAN_LAENGE, ibanPlausibel: V._ibanPlausibel };
const LISTE = JSON.parse(fs.readFileSync(W.EQF_DQR, 'utf8'));

test('[Codelisten] der Abgleich stimmt gegen die Liste im Repo und die Fixtures', () => {
  const r = W.abgleich({ kern: KERN });
  assert.deepEqual([...r.eqfDqr.befunde, ...r.iso4217.befunde, ...r.iban.befunde], []);
  assert.ok(r.eqfDqr.gesehen > 0, 'Vorbedingung: die Europass-Fixtures tragen EQF-Kennungen');
});

test('[Codelisten·EQF/DQR] je acht Stufen, DQR n entspricht EQF n', () => {
  assert.equal(LISTE.eqf.length, 8);
  assert.equal(LISTE.dqr.length, 8);
  for (const d of LISTE.dqr) assert.equal(d.closeMatch, 'http://data.europa.eu/snb/eqf/' + d.stufe, d.de);
});

test('[Codelisten·EQF/DQR·Rot] eine erfundene EQF-Stufe und eine verschobene DQR-Zuordnung fallen auf', () => {
  const r = W.eqfDqrPruefen(LISTE, [['x.jsonld', '"http://data.europa.eu/snb/eqf/9"']]);
  assert.equal(r.befunde.length, 1, 'EQF-Stufe 9 gibt es nicht');
  const verschoben = { ...LISTE, dqr: LISTE.dqr.map((d, i) => (i === 0 ? { ...d, closeMatch: 'http://data.europa.eu/snb/eqf/2' } : d)) };
  assert.equal(W.eqfDqrPruefen(verschoben, []).befunde.length, 1);
});

test('[Codelisten·ISO 4217] das Produkt verwendet Währungscodes, und jeder steht in der Liste', () => {
  const verwendet = W.waehrungenImProdukt();
  assert.ok(verwendet.some((v) => /bereich-templates/.test(v.wo)), 'Vorbedingung: Währungsoptionen der Bereichsvorlagen gefunden');
  assert.ok(verwendet.some((v) => /camt/i.test(v.wo)), 'Vorbedingung: Ccy der CAMT-Fixtures gefunden');
});

test('[Codelisten·ISO 4217·Rot] ein Code außerhalb der Liste fällt auf', () => {
  const liste = W.iso4217Lesen(fs.readFileSync(path.join(W.FIXTURE, 'list-one.xml'), 'utf8'));
  assert.equal(W.iso4217Pruefen(liste, [{ wo: 'probe', code: 'EUR' }]).length, 0);
  assert.equal(W.iso4217Pruefen(liste, [{ wo: 'probe', code: 'XYZ' }]).length, 1);
  assert.throws(() => W.iso4217Lesen('<kein/>'), /Pblshd/, 'eine fremde Datei wird nicht still als leere Liste gelesen');
});

test('[Codelisten·ISO 13616·Rot] eine abweichende Länge und eine abgelehnte Beispiel-IBAN fallen auf', () => {
  const register = W.ibanRegisterLesen(fs.readFileSync(path.join(W.FIXTURE, 'iban-register.txt'), 'latin1'));
  assert.equal(register.get('DE').laenge, 22);
  const laenger = new Map(register); laenger.set('DE', { ...register.get('DE'), laenge: 23 });
  assert.deepEqual(W.ibanPruefen(laenger, KERN.IBAN_LAENGE, KERN.ibanPlausibel), ['IBAN_LAENGE.DE = 22, das Register nennt 23']);
  const falsch = new Map(register); falsch.set('DE', { ...register.get('DE'), beispiel: 'DE00' + register.get('DE').beispiel.slice(4) });
  assert.equal(W.ibanPruefen(falsch, KERN.IBAN_LAENGE, KERN.ibanPlausibel).length, 1, 'eine Beispiel-IBAN, die der Kern ablehnt');
});

test('[Codelisten·ISO 13616·Rot] ein Land der Kerntabelle, das im Register fehlt, fällt auf', () => {
  const register = W.ibanRegisterLesen(fs.readFileSync(path.join(W.FIXTURE, 'iban-register.txt'), 'latin1'));
  register.delete('SM');
  assert.deepEqual(W.ibanPruefen(register, KERN.IBAN_LAENGE, KERN.ibanPlausibel), ['IBAN_LAENGE.SM: Land steht nicht im IBAN-Register']);
  assert.throws(() => W.ibanRegisterLesen('irgendwas'), /IBAN-Register/);
});
