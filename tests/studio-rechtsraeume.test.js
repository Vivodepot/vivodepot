'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════
   U2-ADR-495 (M1/M2, 09.10.2026): Rechtsform, Land und Rechtsraum kommen aus dem Rechtsraum-Modul, nicht aus dem Studio.
   Abnahme:
   (1) Die Region STUDIO-RECHTSRAEUME gleicht den Modulen (tools/rechtsraum-*-modul.json); eine Handänderung ist rot.
   (2) Das Einreich-Schema kennt keine feste Rechtsform-Liste mehr; die Rechtsform ist freiwillig und freier Text, der
       Rechtsraum ein Kürzel. Die drei Kopien des Schemas (Studio, docs, VC-Issuer) sagen dasselbe.
   (3) Kein Land ist voreingestellt; fehlt es, nennt die Prüfung es. Das Kürzel der anbieterId kommt aus dem Rechtsraum.
   (4) Anfrage: `rechtsraum` ist freiwillig; Studio setzt es nur, wenn gewählt; der Kern übernimmt ein Kürzel und meldet
       alles andere, ohne die Anfrage abzulehnen.
   (5) Kern und Studio führen dieselbe Schlüsselliste für Rechtsraum-Module, mit `name` und `rechtsformen`.
   (6) Ausstellung: die Rechtsform bleibt Pflicht, aber freier Text; ein gesetzter Rechtsraum muss ein Kürzel sein.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeKern } = require('./load-kern.js');
const B = require('../tools/studio-rechtsraeume-backen.js');
const { anbieterAngabenPruefen } = require('../tools/lib/anbieter-angaben.js');

const WURZEL = path.join(__dirname, '..');
const lies = (rel) => fs.readFileSync(path.join(WURZEL, rel), 'utf8');
const STUDIO = lies('vivodepot-studio.html');
const nativ = (x) => JSON.parse(JSON.stringify(x));

/* ── (1) Region ─────────────────────────────────────────────────────────── */
test('[Rechtsräume] die Region STUDIO-RECHTSRAEUME steht genau einmal und gleicht den Rechtsraum-Modulen', () => {
  assert.equal(B.regionLesen(STUDIO), B.regionErzeugen(B.moduleLesen(B.MODUL_ORDNER)));
});
test('[Rechtsräume · Rot-Beweis] eine von Hand ergänzte Rechtsform in der Region fällt auf', () => {
  const kopie = STUDIO.replace('"kennung":"GmbH"', '"kennung":"GmbH & Co. KG"');
  assert.notEqual(kopie, STUDIO);
  assert.notEqual(B.regionLesen(kopie), B.regionErzeugen(B.moduleLesen(B.MODUL_ORDNER)));
});

/* ── (2) Schema ─────────────────────────────────────────────────────────── */
function anbieterSchema(text) {
  const a = text.indexOf('"verantwortlicheStelle"') >= 0 ? text.indexOf('"verantwortlicheStelle"') : text.indexOf('"anbieter": {');
  const r = text.indexOf('"rechtsform": {', a);
  const block = (von) => { const m = /\n(\s*)\}/.exec(text.slice(von)); return text.slice(von, von + m.index + m[0].length); };
  return { req: text.slice(text.lastIndexOf('"required": [', r), text.indexOf(']', text.lastIndexOf('"required": [', r)) + 1),
    rf: block(r), rr: block(text.indexOf('"rechtsraum": {', r)) };
}
test('[Rechtsräume · Schema] Rechtsform ohne Liste und freiwillig, Rechtsraum als Kürzel, in allen drei Kopien gleich', () => {
  const s = ['vivodepot-studio.html', 'docs/template-generator/submission-schema.json', 'vivodepot-vc-issuer.html'].map((f) => anbieterSchema(lies(f)));
  for (const x of s) {
    assert.doesNotMatch(x.rf, /"enum"/);
    assert.doesNotMatch(x.req, /"rechtsform"/);
    assert.match(x.rr, /"pattern": "\^\[A-Z\]\{2,8\}\$"/);
  }
  assert.deepEqual(s[1], s[0]); assert.deepEqual(s[2], s[0]);
});
const STAMM = { anbieterName: 'Bürgerservice Beispiel', strasse: 'Platz 1', plz: '1010', ort: 'Wien', land: 'Österreich',
  kontaktName: 'Erika Beispiel', kontaktEmail: 'buergerservice@beispiel.example' };
function paket(V, anbieter) {
  return V.baueSubmission({ anbieter, felder: [V.feldAusBasisBauen({ feldname: 'Vorname', feldtyp: 'text' }, [], 0).feld], publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } });
}
test('[Rechtsräume · Schema] eine Einrichtung ohne Rechtsform und eine mit fremder Rechtsform bestehen das Einreich-Schema', () => {
  const { V } = ladeGenerator();
  const ohne = V.baueAnbieter(STAMM);
  assert.equal(ohne.rechtsform, undefined);
  assert.deepEqual(nativ(V.validiereStammdaten(ohne)), []);
  assert.deepEqual(nativ(V.validiereSubmission(paket(V, ohne))), []);
  const fremd = V.baueAnbieter(Object.assign({ rechtsform: 'Körperschaft öffentlichen Rechts (AT)', rechtsraum: 'at' }, STAMM));
  assert.equal(fremd.rechtsraum, 'AT');
  assert.deepEqual(nativ(V.validiereSubmission(paket(V, fremd))), []);
});

/* ── (3) Kein Land voreingestellt ───────────────────────────────────────── */
test('[Rechtsräume · Land] ohne Land kein „Deutschland“: die Prüfung nennt das fehlende Land', () => {
  const { V } = ladeGenerator();
  const a = V.baueAnbieter(Object.assign({}, STAMM, { land: '' }));
  assert.equal(a.adresse.land, '');
  assert.ok(V.validiereStammdaten(a).includes('Bitte geben Sie das Land an.'));
  assert.doesNotMatch(STUDIO, /id="sd-land" value=/);
});
test('[Rechtsräume · Land] das Kürzel der anbieterId kommt aus dem Rechtsraum, sonst aus dem Modul-Namen, nie aus einem festen Land', () => {
  const { V } = ladeGenerator();
  assert.equal(V.landKuerzel('Österreich', 'AT'), 'at');
  assert.equal(V.landKuerzel('Deutschland', ''), 'de', 'eine bestehende deutsche Einrichtung behält „-de“ (Name aus dem DE-Modul)');
  assert.equal(V.landKuerzel('France', ''), 'fr');
  assert.equal(V.landKuerzel('', ''), 'xx');
});

/* ── (4) Anfrage ────────────────────────────────────────────────────────── */
const anfrageState = (rechtsraum) => ({ anbieter: null, anfrage: { von: 'Bürgerservice Beispiel', zweck: 'Termin vereinbaren', grundlage: 'Ihre Einwilligung', rechtsraum,
  vorgang: 'A-1', gueltigBis: '2099-12-31', antwortArt: 'einmalpasswort', antwortAn: 'termine@beispiel.example',
  felder: [{ kennung: 'identity.familyName', zweck: 'Damit wir Ihren Termin finden', pflicht: true }] } });
test('[Rechtsräume · Anfrage] gewählt steht der Rechtsraum in der Anfrage, sonst nicht; der Kern übernimmt ihn', () => {
  const { V } = ladeGenerator();
  const mit = nativ(V.baueAnfrage(anfrageState('at'))), ohne = nativ(V.baueAnfrage(anfrageState('')));
  assert.equal(mit.rechtsraum, 'AT'); assert.equal('rechtsraum' in ohne, false);
  assert.deepEqual(nativ(V.validiereAnfrage(mit)), []);
  const K = ladeKern().V;
  const g = K.anfragePruefen(mit);
  assert.equal(g.gueltig, true); assert.equal(g.anfrage.rechtsraum, 'AT'); assert.equal(g.verworfene.length, 0);
  assert.equal('rechtsraum' in K.anfragePruefen(ohne).anfrage, false);
});
test('[Rechtsräume · Anfrage · Rot-Beweis] ein Rechtsraum, der kein Kürzel ist, wird gemeldet, die Anfrage bleibt gültig', () => {
  const K = ladeKern().V;
  const { V } = ladeGenerator();
  const a = Object.assign(nativ(V.baueAnfrage(anfrageState(''))), { rechtsraum: 'Deutschland' });
  const g = K.anfragePruefen(a);
  assert.equal(g.gueltig, true);
  assert.ok(g.verworfene.some((v) => v.schluessel === 'rechtsraum'));
  assert.equal('rechtsraum' in g.anfrage, false);
});

/* ── (5) Schlüsselliste ─────────────────────────────────────────────────── */
test('[Rechtsräume · Spiegel] Kern und Studio führen dieselbe Schlüsselliste für Rechtsraum-Module, mit name und rechtsformen', () => {
  const liste = (t) => [...t.matchAll(/const _RECHTSRAUM_MODUL_SCHLUESSEL = Object\.freeze\(\[([^\]]*)\]\)/g)].map((m) => m[1].replace(/\s+/g, ' '));
  const k = liste(lies('vivodepot.html')), s = liste(STUDIO);
  assert.equal(k.length, 1); assert.equal(s.length, 2);
  for (const x of s) assert.equal(x, k[0]);
  assert.match(k[0], /'name', 'rechtsformen'/);
});

/* ── (6) Ausstellung ────────────────────────────────────────────────────── */
const ANGABEN = { adresse: { strasse: 'Platz 1', plz: '1010', ort: 'Wien', land: 'Österreich' },
  kontakt: { name: 'Erika Beispiel', funktion: 'Leitung', email: 'e@beispiel.example', telefon: '+43 1 000' } };
test('[Rechtsräume · Ausstellung] jede Rechtsform als freier Text; ohne Rechtsform keine Ausstellung; Rechtsraum nur als Kürzel', () => {
  assert.doesNotThrow(() => anbieterAngabenPruefen(Object.assign({ rechtsform: 'Körperschaft öffentlichen Rechts (AT)', rechtsraum: 'AT' }, ANGABEN)));
  assert.doesNotThrow(() => anbieterAngabenPruefen(Object.assign({ rechtsform: 'natürliche Person' }, ANGABEN)));
  assert.throws(() => anbieterAngabenPruefen(Object.assign({}, ANGABEN)), /rechtsform fehlt/);
  assert.throws(() => anbieterAngabenPruefen(Object.assign({ rechtsform: 'GmbH', rechtsraum: 'Deutschland' }, ANGABEN)), /kein Kürzel/);
});
