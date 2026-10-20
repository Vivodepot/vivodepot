'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rückweg einer ausgefüllten Vorlage an die Einrichtung (U2-ADR-366 Nachtrag, 08.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Rückweg ist die Antwort auf die Anfrage der Einrichtung: dieselbe Signatur, dieselbe JWE-Hülle (U2-ADR-449). Neu ist,
   dass die Anfrage Felder ihrer Vorlage nennen darf, als `bereich.<anbieterId>:tpl_…` oder intern `bereich.tpl_…`.

   Befund ANFRAGE-VORLAGENFELD-ANBIETERUEBERGREIFEND (08.10.2026, MITTEL): vorher löste jede Anfrage, auch eine unsignierte,
   die interne Form auf — Stelle A bekam den Wert aus der Vorlage von Stelle B, und das Fehlen in `unbekannt` verriet,
   dass die Person eine Vorlage von B hat. Gehalten wird (Krypto-Wort der Gegenlesung, 08.10.):
     P1  die eigene Vorlage wird beantwortet, in beiden Formen, mit dem Block `antwortAuf` (vier Zustände)
     P2  die Vorlage einer anderen Stelle bleibt `unbekannt`, in beiden Formen
     P8  eine unsignierte Anfrage, die sich als Eigentümerin ausgibt, löst nichts auf
     P9  ein Flag am gemerkten Eintrag zählt nicht — nur die Prüfung am Umschlag im selben Aufruf
     P10 eine Vorlage ohne Beleg (nicht über das Zertifikat geprüft importiert) löst nichts auf
     P13 der Beleg wird nachgerechnet, nicht gelesen: ein gefälschter Beleg und ein nachgetragenes Feld lösen nichts auf
     P14 ein abgelaufenes Anbieter-Zertifikat der Vorlage löst nichts auf (die Schonfrist der Kette zählt nicht)
     P15 ein widerrufenes Anbieter-Zertifikat der Vorlage löst nichts auf
     P11 kein Orakel: fremde Vorlage und keine Vorlage ergeben byte-gleiche `unbekannt`-Zeilen
     P4  der Block besteht den Wächter „genau diese Schlüssel“; ein eingeschmuggelter Schlüssel nicht
     P5  die Antwort geht als JWE hinaus und die Lese-App öffnet sie unverändert
   ROT-BEWEIS: am Kern ohne die Prüfung (`zusammenstellungDatensatz` mit der internen Kennung) geht der Wert hinaus.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

// Test-Anker der Suite (Sentinel), derselbe wie in tests/k9-fremde-vorlage-dokument.test.js — nie der Laufzeit-Anker.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const PRUEF = { ankerJwk: SENTINEL_PUBLIC_JWK };
const EINMAL = 'Einmal-Probe-Rueckweg-4hT8';
const A = 'klinik/musterklinik';
const B = 'praxis/andere';

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function stelle(V, anbieterId, name, ablauf) {
  const p = await paar();
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: ablauf || '2099-11-30T12:00:00Z',
    credentialSubject: { anbieterId, anbieterName: name, anbieterTyp: 'institution/klinik', publicKeyJwk: p.pub },
  };
  return { anbieterId, pub: p.pub, certJws: await V._signJWS(cert, await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK), {}), sign: await V._jwsImportSignKey(p.priv) };
}
async function vorlageImportieren(V, s, feldnamen) {
  const tpl = { felder: feldnamen.map((n) => ({ feldname: n, feldtyp: 'text', bereich: 'health' })), wortlaut: 'Aufnahmebogen.',
    wortlautQuelle: { behoerde: s.anbieterId, titel: 'Aufnahme', lizenz: 'Probe' } };
  const plan = await V.importPlanGeprueft('provider-credential', s.certJws, Object.assign({ templateJws: await V._signJWS(tpl, s.sign, {}) }, PRUEF));
  assert.equal(plan.ungueltig, false, 'Vorbedingung: Vorlage geprüft importierbar');
  V.importAnwenden(plan, {});
}
function anfrage(von, kennungen) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von, zweck: 'Aufnahme', grundlage: 'Behandlungsvertrag', vorgang: 'AUF-2026-1008',
    gestelltAm: '2026-10-08', gueltigBis: '2099-12-31', felder: kennungen.map((k) => ({ kennung: k, zweck: 'Aufnahme', pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'aufnahme@klinik.example' } };
}
async function umschlag(V, s, a) {
  return { format: 'vivodepot-anfrage@1', anfrage: a, zertifikat: s.certJws, anfrageJws: await V._signJWS(a, s.sign, {}) };
}
async function depotMitVorlage(eigentuemer) {
  const { V } = ladeKern();
  await V.depotAnlegen('Vorlagen-Rueckweg-Probe-2026!');
  V.akteurSelbstErklaeren('Anna Probe');
  const sA = await stelle(V, A, 'Musterklinik');
  const sB = await stelle(V, B, 'Andere Praxis');
  if (eigentuemer) await vorlageImportieren(V, eigentuemer === 'A' ? sA : sB, ['Hausarzt-Praxis', 'Allergie Kontrastmittel']);
  if (eigentuemer) {
    const d = V.getData();
    d.sektoren.health = d.sektoren.health || {};
    d.sektoren.health.tpl_hausarzt_praxis = 'Praxis Dr. Muster';
  }
  return { V, sA, sB };
}
const ANB = (id) => 'health.' + id + ':tpl_hausarzt_praxis';
const INT = 'health.tpl_hausarzt_praxis';
const LEER = 'health.' + A + ':tpl_allergie_kontrastmittel';

test('[Vorlagen-Rückweg·P1] die eigene Vorlage wird beantwortet, in beiden Formen, mit antwortAuf', async () => {
  const { V, sA } = await depotMitVorlage('A');
  const ds = await V.anfrageAntwortDatensatzGeprueft(await umschlag(V, sA, anfrage('Musterklinik', [ANB(A), INT, LEER])), { sensibel: false, pruefOpts: PRUEF });
  const werte = Object.fromEntries(ds.felder.map((e) => [e.kennung, e.wert]));
  assert.equal(werte[ANB(A)], 'Praxis Dr. Muster', 'Anbieter-Form, Kennung der Einrichtung zurück');
  assert.equal(werte[INT], 'Praxis Dr. Muster', 'interne Form');
  assert.ok(ds.fehlend.some((e) => e.kennung === LEER), 'leeres Vorlagenfeld steht unter fehlend');
  assert.deepEqual(ds.unbekannt, []);
  assert.equal(ds.antwortAuf.length, 1);
  assert.equal(ds.antwortAuf[0].herkunft, A);
  assert.deepEqual(ds.antwortAuf[0].antworten[ANB(A)], { zustand: 'wert', wert: 'Praxis Dr. Muster' });
  assert.deepEqual(ds.antwortAuf[0].antworten[LEER], { zustand: 'leer' });
});

test('[Vorlagen-Rückweg·P2] die Vorlage einer anderen Stelle bleibt unbekannt, in beiden Formen', async () => {
  const { V, sA } = await depotMitVorlage('B');
  const ds = await V.anfrageAntwortDatensatzGeprueft(await umschlag(V, sA, anfrage('Musterklinik', [ANB(B), INT])), { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds.felder, []);
  assert.deepEqual(ds.unbekannt, [{ kennung: ANB(B), grund: 'unbekannt' }, { kennung: INT, grund: 'unbekannt' }]);
  assert.equal(ds.antwortAuf, undefined);
  assert.doesNotMatch(JSON.stringify(ds), /Praxis Dr\. Muster/);
});

test('[Vorlagen-Rückweg·Rot-Beweis] ohne die Prüfung geht der Wert der fremden Vorlage hinaus', async () => {
  const { V } = await depotMitVorlage('B');
  const roh = V.zusammenstellungDatensatz([INT], { id: 'anfrage', titel: 'x' }, { sensibel: false });
  assert.equal(roh.felder[0].wert, 'Praxis Dr. Muster', 'der alte Weg (Kennung ohne Prüfung) löst die fremde Vorlage auf');
});

test('[Vorlagen-Rückweg·P8] eine unsignierte Anfrage, die sich als Eigentümerin ausgibt, löst nichts auf', async () => {
  const { V } = await depotMitVorlage('A');
  const a = Object.assign(anfrage('Musterklinik', [ANB(A), INT]), { anbieterId: A });
  const ds = await V.anfrageAntwortDatensatzGeprueft({ anfrage: a }, { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds.felder, []);
  assert.equal(ds.unbekannt.length, 2);
  // Gegenprobe: falsch signiert (Signatur einer anderen Stelle über denselben Inhalt) ebenso.
  const { sB } = await depotMitVorlage(null);
  const falsch = { anfrage: a, zertifikat: (await stelle(V, A, 'Musterklinik')).certJws, anfrageJws: await V._signJWS(a, sB.sign, {}) };
  const ds2 = await V.anfrageAntwortDatensatzGeprueft(falsch, { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds2.felder, []);
});

test('[Vorlagen-Rückweg·P9] ein Flag am Eintrag zählt nicht, nur die Prüfung am Umschlag', async () => {
  const { V } = await depotMitVorlage('A');
  const a = anfrage('Musterklinik', [ANB(A)]);
  const eintrag = { anfrage: a, geprueft: true, anbieterId: A, umschlag: null };
  const ds = await V.anfrageAntwortDatensatzGeprueft(V._anfrageUmschlagAusEintrag(eintrag), { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds.felder, [], 'geprueft:true ohne Umschlag öffnet nichts');
  assert.deepEqual(V.anfrageAntwortDatensatz(a, { sensibel: false }).felder, [], 'der Weg ohne Umschlag öffnet nie');
});

test('[Vorlagen-Rückweg·P10] eine Vorlage ohne Beleg löst nichts auf', async () => {
  const { V, sA } = await depotMitVorlage('A');
  for (const v of V.getData().importierteVorlagen) v.beleg = null;
  const ds = await V.anfrageAntwortDatensatzGeprueft(await umschlag(V, sA, anfrage('Musterklinik', [ANB(A)])), { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds.felder, []);
  assert.deepEqual(ds.unbekannt, [{ kennung: ANB(A), grund: 'unbekannt' }]);
});

test('[Vorlagen-Rückweg·P11] kein Orakel: fremde Vorlage und keine Vorlage ergeben byte-gleiche Zeilen', async () => {
  const mitB = await depotMitVorlage('B');
  const ohne = await depotMitVorlage(null);
  const frage = [ANB(B), INT, 'health.tpl_gibt_es_nicht'];
  const d1 = await mitB.V.anfrageAntwortDatensatzGeprueft(await umschlag(mitB.V, mitB.sA, anfrage('Musterklinik', frage)), { sensibel: false, pruefOpts: PRUEF });
  const d2 = await ohne.V.anfrageAntwortDatensatzGeprueft(await umschlag(ohne.V, ohne.sA, anfrage('Musterklinik', frage)), { sensibel: false, pruefOpts: PRUEF });
  assert.equal(JSON.stringify(d1.unbekannt), JSON.stringify(d2.unbekannt));
  assert.equal(JSON.stringify(d1.felder), JSON.stringify(d2.felder));
  assert.equal(JSON.stringify(d1.fehlend), JSON.stringify(d2.fehlend));
});

test('[Vorlagen-Rückweg·P4] der Block besteht „genau diese Schlüssel“, ein eingeschmuggelter nicht', async () => {
  const { V, sA } = await depotMitVorlage('A');
  const ds = await V.anfrageAntwortDatensatzGeprueft(await umschlag(V, sA, anfrage('Musterklinik', [ANB(A)])), { sensibel: false, pruefOpts: PRUEF });
  const lm = { datenSchema: { [ANB(A)]: { typ: 'feld', sektor: 'health', feld: 'tpl_hausarzt_praxis' } } };
  assert.equal(V.antwortPasstZuTemplate(ds.antwortAuf[0], lm).passt, true);
  const geschmuggelt = { antworten: Object.assign({ 'identity.givenName': { zustand: 'wert', wert: 'x' } }, ds.antwortAuf[0].antworten) };
  assert.deepEqual(V.antwortPasstZuTemplate(geschmuggelt, lm).zusaetzlich, ['identity.givenName']);
});

test('[Vorlagen-Rückweg·P5] die Antwort geht als JWE hinaus, die Lese-App öffnet sie unverändert', async () => {
  const { V, sA } = await depotMitVorlage('A');
  const a = anfrage('Musterklinik', [ANB(A)]);
  const ds = await V.anfrageAntwortDatensatzGeprueft(await umschlag(V, sA, a), { sensibel: false, pruefOpts: PRUEF });
  const jwe = await V.antwortVerschluesseln(ds, a, { passwort: EINMAL });
  const L = ladeLesen().V;
  const offen = await require('./helfer/antwort-datensatz.js').datensatzAusJwe(L, jwe, { passwort: EINMAL });
  assert.deepEqual(offen, JSON.parse(JSON.stringify(ds)));
  assert.equal(offen.antwortAuf[0].antworten[ANB(A)].wert, 'Praxis Dr. Muster');
});

test('[Vorlagen-Rückweg·P12] Abgleich und Einstieg gehen durch dieselbe Prüfung', async () => {
  const fremd = await depotMitVorlage('B');
  const a = anfrage('Musterklinik', [INT, ANB(B)]);
  const ab = fremd.V.anfrageAbgleich(a, undefined, null);
  assert.deepEqual(ab.vorhanden, [], 'Abgleich ohne Prüfung zeigt das fremde Vorlagenfeld nicht');
  const ein = fremd.V.anfrageEinstiegSchritte(a, null);
  assert.deepEqual(ein.schritte, [], 'Einstieg führt nicht in ein fremdes Vorlagenfeld');
  // Eigene Vorlage, geprüfte Anfrage: der Einstieg führt hin, der Abgleich zeigt den Wert unter der Kennung der Einrichtung.
  const eigen = await depotMitVorlage('A');
  const u = await umschlag(eigen.V, eigen.sA, anfrage('Musterklinik', [ANB(A)]));
  const pruef = await eigen.V.anfragePruefenMitVorlagen(u, PRUEF);
  assert.equal(pruef.geprueft, true);
  const ein2 = eigen.V.anfrageEinstiegSchritte(u.anfrage, pruef);
  assert.equal(ein2.schritte.length, 1);
  assert.equal(ein2.schritte[0].label, 'Hausarzt-Praxis');
  const ab2 = eigen.V.anfrageAbgleich(u.anfrage, undefined, pruef);
  assert.equal(ab2.vorhanden[0].kennung, ANB(A));
});

test('[Vorlagen-Rückweg·P13] der Beleg wird nachgerechnet: gefälschter Beleg und nachgetragenes Feld lösen nichts auf', async () => {
  // Gegenprobe zuerst: unverändert löst die eigene Vorlage auf.
  const ok = await depotMitVorlage('A');
  const dsOk = await ok.V.anfrageAntwortDatensatzGeprueft(await umschlag(ok.V, ok.sA, anfrage('Musterklinik', [ANB(A)])), { sensibel: false, pruefOpts: PRUEF });
  assert.equal(dsOk.felder.length, 1);
  // Ein Beleg, der nur die Form hat (Zeichenketten, keine gültige Signatur), zählt nicht.
  const form = await depotMitVorlage('A');
  for (const v of form.V.getData().importierteVorlagen) v.beleg = { providerCredentialJws: 'a.b.c', templateJws: 'a.b.c' };
  const ds1 = await form.V.anfrageAntwortDatensatzGeprueft(await umschlag(form.V, form.sA, anfrage('Musterklinik', [ANB(A)])), { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds1.felder, [], 'Beleg ohne gültige Kette');
  // Ein Feld, das die signierte Vorlage nicht führt, aber in feldIds und feldDefinitionen nachgetragen wurde, zählt nicht.
  const nach = await depotMitVorlage('A');
  const d = nach.V.getData();
  d.importierteVorlagen[0].feldIds.push('tpl_nachgetragen');
  d.feldDefinitionen.push(Object.assign({}, d.feldDefinitionen.find((x) => x.anbieterId === A), { feldId: 'tpl_nachgetragen' }));
  d.sektoren.health.tpl_nachgetragen = 'Nachgetragen-Wert';
  const ds2 = await nach.V.anfrageAntwortDatensatzGeprueft(await umschlag(nach.V, nach.sA, anfrage('Musterklinik', ['health.' + A + ':tpl_nachgetragen'])), { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds2.felder, [], 'Feld nicht in der signierten Vorlage');
  assert.doesNotMatch(JSON.stringify(ds2), /Nachgetragen-Wert/);
});

/* P13–P15 halten die Ausnahme von `_anfrageVorlagenBelegPruefen` in tools/stumme-zurueckweisung-grundlinie.json: eine nicht
   nachrechenbare Vorlage verliert nur ihr Feld in dieser Antwort, nichts im Depot.
   P14/P15: die Vorlage kommt über ein ZWEITES Zertifikat derselben Stelle (eigener Schlüssel), damit die Anfrage selbst geprüft
   bleibt und allein die Vorlage am Ablauf bzw. Widerruf scheitert. */
async function depotMitZweitzertifikat() {
  const { V } = ladeKern();
  await V.depotAnlegen('Vorlagen-Rueckweg-Probe-2026!');
  V.akteurSelbstErklaeren('Anna Probe');
  const sA = await stelle(V, A, 'Musterklinik');
  const sV = await stelle(V, A, 'Musterklinik', '2030-06-30T12:00:00Z');
  await vorlageImportieren(V, sV, ['Hausarzt-Praxis']);
  const d = V.getData();
  d.sektoren.health = d.sektoren.health || {};
  d.sektoren.health.tpl_hausarzt_praxis = 'Praxis Dr. Muster';
  return { V, sA, sV };
}

test('[Vorlagen-Rückweg·P14] ein abgelaufenes Anbieter-Zertifikat der Vorlage löst nichts auf', async () => {
  const { V, sA } = await depotMitZweitzertifikat();
  const u = await umschlag(V, sA, anfrage('Musterklinik', [ANB(A)]));
  const heute = await V.anfrageAntwortDatensatzGeprueft(u, { sensibel: false, pruefOpts: PRUEF });
  assert.equal(heute.felder.length, 1, 'Gegenprobe: vor dem Ablauf löst die Vorlage auf');
  const spaeter = Object.assign({}, PRUEF, { jetzt: '2031-01-01T00:00:00Z' });
  const p = await V.anfrageSignaturPruefen(u, spaeter);
  assert.equal(p.geprueft, true, 'Vorbedingung: die Anfrage selbst bleibt geprüft');
  const ds = await V.anfrageAntwortDatensatzGeprueft(u, { sensibel: false, pruefOpts: spaeter });
  assert.deepEqual(ds.felder, []);
  assert.deepEqual(ds.unbekannt, [{ kennung: ANB(A), grund: 'unbekannt' }]);
});

test('[Vorlagen-Rückweg·P15] ein widerrufenes Anbieter-Zertifikat der Vorlage löst nichts auf', async () => {
  const { V, sA, sV } = await depotMitZweitzertifikat();
  const u = await umschlag(V, sA, anfrage('Musterklinik', [ANB(A)]));
  const gesperrt = Object.assign({}, PRUEF, { widerrufsListe: [await V._jwkThumbprint(sV.pub)] });
  const p = await V.anfrageSignaturPruefen(u, gesperrt);
  assert.equal(p.geprueft, true, 'Vorbedingung: die Anfrage selbst bleibt geprüft');
  const ds = await V.anfrageAntwortDatensatzGeprueft(u, { sensibel: false, pruefOpts: gesperrt });
  assert.deepEqual(ds.felder, []);
  assert.deepEqual(ds.unbekannt, [{ kennung: ANB(A), grund: 'unbekannt' }]);
});

/* P16 (09.10.2026, Fund am Zugkopf, Fünferprobe Baukasten-Kombination rot): ein tpl_-Feld OHNE Stelle — eine
   eigene Felddefinition (U2-ADR-037) in einem angedockten Bereich — ist kein Vorlagenfeld. Eine Anfrage fragt es wie jedes andere
   Feld ab, auch unsigniert. Gesperrt bleibt nur, was einer Stelle gehört (`anbieterId` an der Felddefinition). */
test('[Vorlagen-Rückweg·P16] ein eigenes tpl_-Feld ohne Stelle wird beantwortet; mit Stelle bleibt es ohne Prüfung unbekannt', async () => {
  const { V } = await depotMitVorlage(null);
  const d = V.getData();
  d.feldDefinitionen = (d.feldDefinitionen || []).concat([{ sektorId: 'health', feldId: 'tpl_eigenes_feld', typ: 'text', label: 'Eigenes Feld' }]);
  d.sektoren.health = d.sektoren.health || {};
  d.sektoren.health.tpl_eigenes_feld = 'Eigener Wert';
  const ds = V.anfrageAntwortDatensatz(anfrage('Irgendwer', ['health.tpl_eigenes_feld']), { sensibel: false });
  assert.deepEqual(ds.unbekannt || [], [], 'ohne Stelle kein Vorlagenfeld');
  assert.equal((ds.felder.find((f) => f.kennung === 'health.tpl_eigenes_feld') || {}).wert, 'Eigener Wert');
  // Rot-Beweis: dieselbe Definition mit Stelle ist ein Vorlagenfeld und bleibt ohne geprüfte Anfrage unbekannt.
  d.feldDefinitionen.find((x) => x.feldId === 'tpl_eigenes_feld').anbieterId = A;
  const gesperrt = V.anfrageAntwortDatensatz(anfrage('Irgendwer', ['health.tpl_eigenes_feld']), { sensibel: false });
  assert.deepEqual(gesperrt.unbekannt, [{ kennung: 'health.tpl_eigenes_feld', grund: 'unbekannt' }]);
});

/* P17 (09.10.2026, Prüffrage der Gegenlesung): eine Felddefinition aus der Zeit vor `anbieterId` (vor dem 20.08.2026) ist trotzdem
   das Feld einer Vorlage, wenn eine importierte Vorlage es in `feldIds` führt — dann bleibt es ohne geprüfte Anfrage gesperrt. */
test('[Vorlagen-Rückweg·P17] ein Vorlagenfeld ohne anbieterId an der Definition bleibt gesperrt, wenn eine Vorlage es führt', async () => {
  const { V } = await depotMitVorlage(null);
  const d = V.getData();
  d.feldDefinitionen = (d.feldDefinitionen || []).concat([{ sektorId: 'health', feldId: 'tpl_altvorlage', typ: 'text', label: 'Altes Feld' }]);
  d.sektoren.health = d.sektoren.health || {};
  d.sektoren.health.tpl_altvorlage = 'Alter Wert';
  // Rot-Beweis zuerst: ohne Vorlagen-Eintrag ist es ein eigenes Feld und wird beantwortet (P16).
  const offen = V.anfrageAntwortDatensatz(anfrage('Irgendwer', ['health.tpl_altvorlage']), { sensibel: false });
  assert.equal((offen.felder.find((f) => f.kennung === 'health.tpl_altvorlage') || {}).wert, 'Alter Wert');
  d.importierteVorlagen = (d.importierteVorlagen || []).concat([{ id: 'alt-1', vorlageId: null, anbieterId: null, feldIds: ['tpl_altvorlage'], wortlaut: 'Alt.' }]);
  const zu = V.anfrageAntwortDatensatz(anfrage('Irgendwer', ['health.tpl_altvorlage']), { sensibel: false });
  assert.deepEqual(zu.unbekannt, [{ kennung: 'health.tpl_altvorlage', grund: 'unbekannt' }], 'mit Vorlagen-Eintrag gesperrt, byte-gleich mit unbekannt');
});
