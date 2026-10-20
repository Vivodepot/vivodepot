'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Befund ATTRAPPE-LAENGE (05.10.2026, HOCH) — die Attrappe ist byte-gleich lang wie ein echter Umschlag
   ────────────────────────────────────────────────────────────────────────────
   Jeder Eintrag der Umschlagstabelle trägt für jede Einheit einen Umschlag; wo ein Fach eine Einheit nicht öffnen darf,
   steht eine Attrappe (U2-ADR-156). Bis hierher rechnete `_zerfallAttrappe` die Länge aus der Zeichenzahl zurück und
   lag ein Byte daneben: echte Umschläge 62 Byte mit „=", Attrappen 63 Byte ohne. Ohne Passwort war je Fach sichtbar,
   welche und wie viele Einheiten es öffnet.
   Die Proben: (1) der Rückfall ist die Länge eines echten Umschlags; (2) die Attrappe trifft für jede Byte-Länge
   (alle N mod 3) genau das Vorbild in ct und iv, auch im Base64-Bild; (3) eine echte Datei mit Fach trägt nur noch
   EINE Umschlaglänge und eine Geheimteil-Länge; (4) Rot-Beweis: eine eingefrorene Datei der Fassung vor dem Fix (Korpus a01) trägt zwei Längen.
   Wächter gegen die Klasse ohne Passwort: tools/format-pruefen.js, Code VDF-ATTRAPPE.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const F = require('../tools/format-pruefen.js');

const REPO = path.join(__dirname, '..');
const PW = 'attrappe-probe-inhaberin';
const PW_FACH = 'attrappe-probe-fach';

async function depotMitFach(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erika');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('health', 'bloodType', '0+');
  await V.empfaengerkreisSetzen({ name: 'Beispielkreis', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, 'Ordner im Regal');
  return V.depotSerialisieren();
}
function umschlagLaengen(u) {
  const l = new Set();
  for (const e of u.umschlagTabelle) for (const v of Object.values(e.umschlaege)) l.add(Buffer.from(v.ct, 'base64').length);
  return [...l].sort((a, b) => a - b);
}

test('[Attrappe·Länge] der Rückfall ist die Länge eines echten Umschlags', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const anker = await V.VdCrypto.depotSchluessel(crypto.getRandomValues(new Uint8Array(32)), 'uuid-probe');
  const { roh } = await V.VdCrypto.einheitSchluessel();
  const echt = await V.VdCrypto.schluesselWickeln(roh, anker, V.VdCrypto.aadEinheit('uuid-probe', 'adresse'));
  assert.equal(Buffer.from(echt.ct, 'base64').length, 62, 'Positivkontrolle: ein echter Umschlag hat 62 Byte');
  const ohneVorbild = V._zerfallAttrappe(null);
  assert.equal(Buffer.from(ohneVorbild.ct, 'base64').length, Buffer.from(echt.ct, 'base64').length);
  assert.equal(Buffer.from(ohneVorbild.iv, 'base64').length, 12);
});

test('[Attrappe·Länge] die Attrappe trifft jedes Vorbild byte-gleich, für alle N mod 3', () => {
  const { V } = ladeKern();
  for (let n = 58; n <= 66; n++) {
    const vorbild = { iv: Buffer.alloc(12, 1).toString('base64'), ct: Buffer.alloc(n, 2).toString('base64') };
    const a = V._zerfallAttrappe(vorbild);
    assert.equal(Buffer.from(a.ct, 'base64').length, n, 'ct ' + n + ' Byte');
    assert.equal(a.ct.length, vorbild.ct.length, 'gleich viele Base64-Zeichen bei ' + n);
    assert.equal((a.ct.match(/=+$/) || [''])[0], (vorbild.ct.match(/=+$/) || [''])[0], 'gleiches Auffüllen bei ' + n);
    assert.equal(Buffer.from(a.iv, 'base64').length, 12);
    assert.deepEqual(Object.keys(a), Object.keys(vorbild), 'dieselbe JSON-Form');
  }
});

test('[Attrappe·Länge] eine Datei mit Fach trägt nur eine Umschlaglänge, und das Prüfprogramm meldet nichts', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V);
  assert.equal(u.umschlagTabelle.length, 2, 'Positivkontrolle: Anker und ein Fach');
  assert.deepEqual(umschlagLaengen(u), [62]);
  const r = await F.dateiPruefen('VIVODEPOT' + String.fromCharCode(1) + JSON.stringify(u));
  assert.ok(!r.befunde.some((b) => b.code === 'VDF-ATTRAPPE'), 'kein VDF-ATTRAPPE');
  // und das Fach öffnet weiter, mit seinem Ausschnitt
  const inhalt = await ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), PW_FACH);
  assert.equal(inhalt.sektoren.health.bloodType, '0+');
});

test('[Attrappe·Länge·Rot-Beweis] eine Datei der Fassung vor dem Fix trägt zwei Umschlaglängen (14 echt, 38 Attrappen), und das Prüfprogramm meldet es', async () => {
  const text = fs.readFileSync(path.join(REPO, 'docs', 'format', 'korpus', 'a01-attrappe-vor-fix.vivodepot'), 'utf8');
  const u = JSON.parse(text.slice(10));
  assert.deepEqual(umschlagLaengen(u), [62, 63], 'die alte Fassung unterscheidet echt und Attrappe');
  const fach = u.umschlagTabelle[1].umschlaege;
  const n = (b) => Object.values(fach).filter((v) => Buffer.from(v.ct, 'base64').length === b).length;
  assert.deepEqual([n(62), n(63)], [14, 38]);
  const r = await F.dateiPruefen(text);
  assert.ok(r.befunde.some((b) => b.code === 'VDF-ATTRAPPE'), 'das Prüfprogramm meldet VDF-ATTRAPPE');
});

/* Bedingungen der Krypto-Prüfung zum Port (17.10.2026): (1) die Attrappe gleicht dem echten Umschlag in der Länge JEDES Feldes,
   das in der Datei steht, nicht nur bei ct; (2) der Rückfall greift nur ohne Vorbild — mit Vorbild gilt immer dessen Länge. */
test('[Attrappe·Länge·Felder] jedes Feld der Attrappe ist serialisiert so lang wie im Vorbild, für alle N mod 3', () => {
  const { V } = ladeKern();
  for (let n = 58; n <= 66; n++) {
    const vorbild = { iv: Buffer.alloc(12, 1).toString('base64'), ct: Buffer.alloc(n, 2).toString('base64') };
    const a = V._zerfallAttrappe(vorbild);
    for (const k of Object.keys(vorbild)) assert.equal(JSON.stringify(a[k]).length, JSON.stringify(vorbild[k]).length, k + ' bei ' + n);
    assert.equal(JSON.stringify(a).length, JSON.stringify(vorbild).length, 'der ganze Eintrag bei ' + n);
  }
});

test('[Attrappe·Länge·Felder] in einer echten Datei mit Fach hat jedes Feld aller Umschläge genau eine serialisierte Länge', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V);
  const je = {};
  for (const e of u.umschlagTabelle) for (const v of Object.values(e.umschlaege)) {
    for (const [k, w] of Object.entries(v)) (je[k] = je[k] || new Set()).add(JSON.stringify(w).length);
    (je['(ganz)'] = je['(ganz)'] || new Set()).add(JSON.stringify(v).length);
  }
  for (const [k, s] of Object.entries(je)) assert.equal(s.size, 1, 'Feld ' + k + ': ' + [...s].join(','));
});

test('[Attrappe·Länge·Rückfall] mit Vorbild gilt immer dessen Länge, auch weit weg vom Rückfall', () => {
  const { V } = ladeKern();
  for (const n of [16, 17, 100, 255]) {
    const a = V._zerfallAttrappe({ iv: Buffer.alloc(16, 1).toString('base64'), ct: Buffer.alloc(n, 2).toString('base64') });
    assert.equal(Buffer.from(a.ct, 'base64').length, n, 'ct ' + n);
    assert.equal(Buffer.from(a.iv, 'base64').length, 16, 'iv aus dem Vorbild, nicht 12');
  }
});

/* Zweite Sicht der Krypto-Prüfung (17.10.2026): (1) das Polster-Ziel hängt nicht an einer Anzahl — ein Fach mit vielen Einheiten
   ist so lang wie der Anker; (2) Schutz, fail closed: verschieden lange Einträge werden nie geschrieben. */
test('[Attrappe·Länge·Viele] ein Fach mit mindestens 10 Einheiten: alle Geheimteile und Umschläge gleich lang, das Fach öffnet', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erika');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  for (const [f, w] of [['bloodType', '0+'], ['allergies', 'Nüsse'], ['medications', 'keine'], ['conditions', 'keine'],
    ['organDonor', 'ja'], ['insuranceName', 'Beispielkasse'], ['insuranceNumber', 'A123'], ['doctorName', 'Dr. Beispiel'],
    ['doctorPhone', '0301234'], ['notes', 'Notiz']]) { try { V.sektorFeldSetzen('health', f, w); } catch (_) { /* nicht jedes Feld gibt es in jedem Bereich */ } }
  await V.empfaengerkreisSetzen({ name: 'Ein Kreis mit vielen Angaben', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, 'Regal');
  const u = await V.depotSerialisieren();
  const fachAdressen = Object.keys(u.umschlagTabelle[1].umschlaege).length;
  assert.ok(fachAdressen >= 10, 'Positivkontrolle: mindestens 10 Einheiten, gemessen ' + fachAdressen);
  assert.equal(new Set(u.umschlagTabelle.map((e) => Buffer.from(e.geheim.ct, 'base64').length)).size, 1, 'Geheimteile gleich lang');
  assert.deepEqual(umschlagLaengen(u), [62]);
  const offen = await ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), PW_FACH);
  assert.equal(offen.sektoren.health.bloodType, '0+');
});

test('[Attrappe·Länge·Schutz] gleich lange Einträge gehen durch', () => {
  const { V } = ladeKern();
  const b = (n) => Buffer.alloc(n, 3).toString('base64');
  V._zerfallLaengenPruefen([
    { geheim: { ct: b(208) }, umschlaege: { a: { iv: b(12), ct: b(62) }, b: { iv: b(12), ct: b(62) } } },
    { geheim: { ct: b(208) }, umschlaege: { a: { iv: b(12), ct: b(62) }, b: { iv: b(12), ct: b(62) } } },
  ]);
});

test('[Attrappe·Länge·Schutz·Rot-Beweis] ein längerer Geheimteil oder eine abweichende Attrappe wird nicht geschrieben', () => {
  const { V } = ladeKern();
  const b = (n) => Buffer.alloc(n, 3).toString('base64');
  const gleich = { a: { iv: b(12), ct: b(62) } };
  assert.throws(() => V._zerfallLaengenPruefen([{ geheim: { ct: b(208) }, umschlaege: gleich }, { geheim: { ct: b(224) }, umschlaege: gleich }]),
    (e) => e.code === 'zerfall-laenge' && /geheim=208\/224/.test(e.message), 'ein Kreisname über dem Ziel');
  assert.throws(() => V._zerfallLaengenPruefen([{ geheim: { ct: b(208) }, umschlaege: { a: { iv: b(12), ct: b(62) }, b: { iv: b(12), ct: b(63) } } }]),
    (e) => e.code === 'zerfall-laenge', 'eine Attrappe ein Byte länger (der Fall vor dem Fix)');
  assert.throws(() => V._zerfallLaengenPruefen([{ geheim: { ct: b(208) }, umschlaege: { a: { iv: b(12), ct: b(62) }, b: { iv: b(16), ct: b(62) } } }]),
    (e) => e.code === 'zerfall-laenge', 'ein abweichendes iv');
});
