'use strict';
/* ═══════════════════════════════════════════════════════════
   Das Verzeichnis der Außenablagen, im Kern verschlüsselt (U2-ADR-520)
   ───────────────────────────────────────────────────────────
   Gehalten wird:
   1. Hin und zurück: podVerzeichnisVerschluesseln → podVerzeichnisEntschluesseln liefert dieselbe Liste; das Chiffrat besteht
      die Tür der Brücke (pod/chiffrat-pruefen.js) als Art „verzeichnis“ und trägt keinen Eintrag im Klartext.
   2. Der Schlüssel kommt aus dem Seed im Depot, mit eigener HKDF-Info: dasselbe Depot öffnet, ein anderes nicht
      ('pod-verzeichnis-unlesbar'); ein verändertes Chiffrat oder ein umgeschriebener Kopf auch nicht.
   3. Hinein und hinaus geht nur eine Liste mit genau den Verzeichnisfeldern ('pod-verzeichnis-form').
   4. Protokoll: während eines Pod-Auftrags beantwortet der Kern Bitten der Brücke um das Verzeichnis, nur mit der id des
      Auftrags, nur mit den Feldern der Bitte, nur bis zur Höchstzahl, und die Antwort geht nur an die feste Herkunft.
   5. Im Sub-Kontext gibt es das Verzeichnis nicht ('nicht-verfuegbar').
   Rot-Beweise: ein anderes Depot, ein gekipptes Byte, ein Kopf mit cty statt typ, eine Liste mit fremdem Feld.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../pod/chiffrat-pruefen.js');
const { ladeKern } = require('./load-kern.js');

const HERKUNFT = 'https://pod.vivodepot.de';
const LISTE = [
  { adresse: 'https://pod.example/vivodepot/freigaben/k7Q2', art: 'stelle', stelle: 'https://stelle.example/id#it', bis: 1764547200000, am: 1762100000000, grant: 'https://pod.example/vivodepot/grants/g1', ueberDienst: false },
  { adresse: 'https://pod.example/vivodepot/links/a9', art: 'link', stelle: null, bis: null, am: 1762100000000, grant: null, ueberDienst: null },
];
const b64uZuText = (s) => Buffer.from(s, 'base64url').toString('utf8');

test('[Verzeichnis·Kern] hin und zurück; das Chiffrat besteht die Tür der Brücke und trägt nichts im Klartext', async () => {
  const { V } = ladeKern();
  const depot = {};
  const jwe = await V.podVerzeichnisVerschluesseln(LISTE, depot);
  assert.deepEqual(C.pruefen(jwe), { art: 'verzeichnis' });
  assert.deepEqual(JSON.parse(b64uZuText(jwe.split('.')[0])), { alg: 'dir', enc: 'A256GCM', typ: 'vivodepot-verzeichnis+jwe' });
  for (const w of ['pod.example', 'stelle.example', 'freigaben', 'stelle']) assert.ok(!jwe.includes(w) && !b64uZuText(jwe.split('.')[3]).includes(w), w);
  assert.deepEqual(JSON.parse(JSON.stringify(await V.podVerzeichnisEntschluesseln(jwe, depot))), LISTE);
  const zweites = await V.podVerzeichnisVerschluesseln(LISTE, depot);
  assert.notEqual(zweites, jwe, 'frischer IV je Verschlüsseln');
});

test('[Verzeichnis·Kern·Rot-Beweis] anderes Depot, gekipptes Byte und umgeschriebener Kopf öffnen nicht', async () => {
  const { V } = ladeKern();
  const depot = {};
  const jwe = await V.podVerzeichnisVerschluesseln(LISTE, depot);
  await assert.rejects(V.podVerzeichnisEntschluesseln(jwe, {}), /pod-verzeichnis-unlesbar/);
  const t = jwe.split('.');
  const ct = Buffer.from(t[3], 'base64url'); ct[0] ^= 1;
  await assert.rejects(V.podVerzeichnisEntschluesseln([t[0], '', t[2], ct.toString('base64url'), t[4]].join('.'), depot), /pod-verzeichnis-unlesbar/);
  const andererKopf = Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A256GCM', typ: 'vivodepot-verzeichnis+jwe' }).replace('{', '{ ')).toString('base64url');
  await assert.rejects(V.podVerzeichnisEntschluesseln([andererKopf, '', t[2], t[3], t[4]].join('.'), depot), /pod-verzeichnis-unlesbar/, 'der Kopf ist AAD');
  const cty = Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' })).toString('base64url');
  await assert.rejects(V.podVerzeichnisEntschluesseln([cty, '', t[2], t[3], t[4]].join('.'), depot), /pod-verzeichnis-form/);
  await assert.rejects(V.podVerzeichnisEntschluesseln('kein.jwe', depot), /pod-verzeichnis-form/);
});

test('[Verzeichnis·Kern·Rot-Beweis] nur Listen mit genau den Verzeichnisfeldern', async () => {
  const { V } = ladeKern();
  const e = LISTE[0];
  const faelle = {
    'fremdes Feld': [Object.assign({ notiz: 'Erna Beispiel' }, e)],
    'Adresse ohne https': [Object.assign({}, e, { adresse: 'http://pod.example/a' })],
    'fremde Art': [Object.assign({}, e, { art: 'notiz' })],
    'Stelle beim Link': [Object.assign({}, LISTE[1], { stelle: 'https://stelle.example/id#it' })],
    'bis als Text': [Object.assign({}, e, { bis: '2026-12-01' })],
    'keine Liste': { ablagen: [] },
  };
  for (const [name, l] of Object.entries(faelle)) {
    assert.equal(V.verzeichnisListePruefen(l), null, name);
    await assert.rejects(V.podVerzeichnisVerschluesseln(l, {}), /pod-verzeichnis-form/, name);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(V.verzeichnisListePruefen([{ adresse: e.adresse, art: 'eigen' }]))),
    [{ adresse: e.adresse, art: 'eigen', stelle: null, bis: null, am: null, grant: null, ueberDienst: null }], 'fehlende Felder werden null');
});

function auftrag(V, depot) {
  const gesendet = [];
  const w = { postMessage: (nachricht, ziel) => gesendet.push({ nachricht, ziel }) };
  const hoerer = new Set();
  const ziel = { addEventListener: (t, f) => { if (t === 'message') hoerer.add(f); }, removeEventListener: (t, f) => hoerer.delete(f) };
  const o = { oeffnen: () => w, ziel, uhr: () => 1, uhrAus: () => {}, jetzt: () => 1000000, depot };
  const senden = (source, origin, data) => { for (const f of [...hoerer]) f({ source, origin, data }); };
  const p = V.podAblegen('stelle', 'eyJ.kopf.chiffrat', o);
  senden(w, HERKUNFT, { typ: 'vd-pod-bereit', fassung: 1 });
  return { p, w, gesendet, senden, id: gesendet[0].nachricht.id };
}
const warten = () => new Promise((r) => setTimeout(r, 20));
/* Die Antworten entstehen nach WebCrypto-Arbeit; unter Last dauert das. Gewartet wird auf die erwartete Zahl, höchstens 5 s. */
async function bisAnzahl(liste, n) {
  for (let i = 0; i < 500 && liste.length < n; i++) await new Promise((r) => setTimeout(r, 10));
}

test('[Verzeichnis·Kern·Protokoll] Bitten nur mit der id des Auftrags, nur mit ihren Feldern, nur bis zur Höchstzahl', async () => {
  const { V } = ladeKern();
  const depot = {};
  const a = auftrag(V, depot);
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-schliessen', fassung: 1, id: a.id, nr: 1, liste: LISTE });
  await bisAnzahl(a.gesendet, 2);
  const zu = a.gesendet[1];
  assert.equal(zu.ziel, HERKUNFT);
  assert.deepEqual(Object.keys(zu.nachricht).sort(), ['daten', 'fassung', 'id', 'nr', 'typ']);
  assert.equal(zu.nachricht.typ, 'vd-pod-verzeichnis-verschlossen');
  assert.deepEqual(C.pruefen(zu.nachricht.daten), { art: 'verzeichnis' });
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 2, daten: zu.nachricht.daten });
  await bisAnzahl(a.gesendet, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(a.gesendet[2].nachricht)), { typ: 'vd-pod-verzeichnis-offen', fassung: 1, id: a.id, nr: 2, liste: LISTE });
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 3, daten: 'kein.jwe' });
  await bisAnzahl(a.gesendet, 4);
  assert.equal(a.gesendet[3].nachricht.fehler, 'form');
  const vorher = a.gesendet.length;
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: 'x'.repeat(22), nr: 4, daten: zu.nachricht.daten });
  a.senden(a.w, 'https://boese.example', { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 5, daten: zu.nachricht.daten });
  a.senden({ postMessage() {} }, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 6, daten: zu.nachricht.daten });
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 7, daten: zu.nachricht.daten, extra: 1 });
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 'acht', daten: zu.nachricht.daten });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(a.gesendet.length, vorher, 'fremde id, Herkunft, Fenster, Felder und nr bleiben ohne Antwort');
  for (let i = 0; i < 40; i++) a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-schliessen', fassung: 1, id: a.id, nr: 10 + i, liste: [] });
  await bisAnzahl(a.gesendet, 1 + V.POD_VERZEICHNIS_BITTEN_JE_AUFTRAG);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(a.gesendet.length - 1, V.POD_VERZEICHNIS_BITTEN_JE_AUFTRAG, 'höchstens so viele Antworten je Auftrag');
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-abgelegt', fassung: 1, id: a.id, adresse: 'https://pod.example/vivodepot/freigaben/k7Q2' });
  assert.equal((await a.p).host, 'pod.example', 'der Auftrag endet wie zuvor');
});

test('[Verzeichnis·Kern·Protokoll] vor „bereit“ keine Antwort', async () => {
  const { V } = ladeKern();
  const gesendet = [];
  const w = { postMessage: (n) => gesendet.push(n) };
  const hoerer = new Set();
  const ziel = { addEventListener: (t, f) => hoerer.add(f), removeEventListener: (t, f) => hoerer.delete(f) };
  V.podAblegen('link', 'eyJ.a.b', { oeffnen: () => w, ziel, uhr: () => 1, uhrAus: () => {}, jetzt: () => 1, depot: {} });
  for (const f of hoerer) f({ source: w, origin: HERKUNFT, data: { typ: 'vd-pod-verzeichnis-schliessen', fassung: 1, id: 'x'.repeat(22), nr: 1, liste: [] } });
  await warten();
  assert.equal(gesendet.length, 0);
});

test('[Verzeichnis·Kern] im Sub-Kontext gibt es das Verzeichnis nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw-verzeichnis');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Sophie', inhaberin: 'Sophie', verwaltungsTyp: 'verwaltet' }, 'sub-pw-verzeichnis');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'sub-pw-verzeichnis');
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.imSubKontext(), true, 'Vorbedingung');
  const a = await V.podVerzeichnisBitte({ typ: 'vd-pod-verzeichnis-schliessen', fassung: 1, id: 'i', nr: 1, liste: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), { typ: 'vd-pod-verzeichnis-verschlossen', fassung: 1, id: 'i', nr: 1, fehler: 'nicht-verfuegbar' });
  const b = await V.podVerzeichnisBitte({ typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: 'i', nr: 2, daten: 'x' });
  assert.equal(b.fehler, 'nicht-verfuegbar');
  assert.equal(b.typ, 'vd-pod-verzeichnis-offen');
});

test('[Verzeichnis·Kern·G2] über die Antwort an die Brücke geht nur das Chiffrat oder die Liste der Ablagen, kein Inhalt des Depots', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw-verzeichnis-g2');
  const geheim = 'Erna-Beispiel-Geheimnis-7Q2';
  V.getData().notiz = geheim;
  const a = auftrag(V, undefined);
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-schliessen', fassung: 1, id: a.id, nr: 1, liste: LISTE });
  await bisAnzahl(a.gesendet, 2);
  const zu = a.gesendet[1].nachricht;
  assert.deepEqual(C.pruefen(zu.daten), { art: 'verzeichnis' }, 'verschlossen: nur Chiffrat');
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-verzeichnis-oeffnen', fassung: 1, id: a.id, nr: 2, daten: zu.daten });
  await bisAnzahl(a.gesendet, 3);
  const auf = a.gesendet[2].nachricht;
  assert.deepEqual(Object.keys(auf).sort(), ['fassung', 'id', 'liste', 'nr', 'typ']);
  for (const e of auf.liste) assert.deepEqual(Object.keys(e).sort(), ['adresse', 'am', 'art', 'bis', 'grant', 'stelle', 'ueberDienst'], 'offen: nur die Felder der Liste');
  for (const g of a.gesendet.slice(1)) {
    const text = JSON.stringify(g.nachricht);
    assert.ok(!text.includes(geheim), 'kein Depot-Inhalt');
    assert.ok(!/antwortSeed|ANTWORT_SEED|"wert"/.test(text), 'kein Seed');
    assert.equal(g.ziel, HERKUNFT);
  }
});
