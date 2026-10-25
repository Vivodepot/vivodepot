'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: Access Request und Access Grant nach LWS (Working Draft 15.10.2026, Abschnitt 11)
   ────────────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     1. Eine Studio-Anfrage mit WebID wird zu einem Access Request: assignee, action read, purpose und dateTime als constraint,
        Felder als IRIs des Feldregisters, Pflicht und Rechtsgrundlage als Erweiterung (dpv:hasLegalBasis).
     2. Ohne WebID, ohne gültige Felder oder mit unlesbarer Frist: kein Request (Rot-Beweise).
     3. Ein Grant trägt die Pflichtfelder (context, type, storage, access mit AccessPolicy, action, assignee, target).
     4. Rot-Beweise: fehlender assignee, unbekannte action, fehlender target und jedes Feld, das wie ein Schlüssel heißt.
     5. Die Storage Description liefert den AccessGrantService oder nichts.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../pod/lws.js');

const ANFRAGE = {
  von: 'Stadtbibliothek Musterhausen', webid: 'https://stelle.example/profile/card#me', zweck: 'Ausleihe',
  zweckIri: 'https://w3id.org/dpv#ServiceProvision', grundlage: 'Vertrag', grundlageIri: 'https://w3id.org/dpv/legal/eu/gdpr#A6-1-b',
  gueltigBis: '2026-12-31', antwortAn: 'https://stelle.example/inbox/',
  felder: [{ kennung: 'identity.givenName', pflicht: true }, { kennung: 'identity.familyName' }, { kennung: '../boese' }]
};

test('[Pod·LWS·Request] die Studio-Anfrage wird ein Access Request mit Erweiterung', () => {
  const { request: r, fehler } = L.requestAusAnfrage(ANFRAGE);
  assert.equal(fehler, undefined);
  assert.deepEqual(L.pruefen(r, 'AccessRequest'), []);
  assert.equal(r.access[0].assignee, ANFRAGE.webid);
  assert.deepEqual(r.access[0].action, ['read']);
  assert.deepEqual(r.access[0].constraint, [
    { leftOperand: 'purpose', operator: 'eq', rightOperand: ANFRAGE.zweckIri },
    { leftOperand: 'dateTime', operator: 'lteq', rightOperand: '2026-12-31T00:00:00.000Z' }]);
  assert.deepEqual(r['vd:felder'], ['https://register.vivodepot.de/feld/identity.givenName', 'https://register.vivodepot.de/feld/identity.familyName']);
  assert.deepEqual(r['vd:pflicht'], ['https://register.vivodepot.de/feld/identity.givenName']);
  assert.equal(r['dpv:hasLegalBasis'], ANFRAGE.grundlageIri);
  assert.equal(r.inbox, ANFRAGE.antwortAn);
  assert.equal(r.access[0].target, undefined, 'gefragt wird nach Angaben, nicht nach Adressen im Pod');
});

test('[Pod·LWS·Request·Rot-Beweis] ohne WebID, ohne Felder oder mit unlesbarer Frist kein Request', () => {
  assert.equal(L.requestAusAnfrage(Object.assign({}, ANFRAGE, { webid: undefined })).fehler, 'keine-webid-der-stelle');
  assert.equal(L.requestAusAnfrage(Object.assign({}, ANFRAGE, { felder: [{ kennung: 'a b' }] })).fehler, 'keine-felder');
  assert.equal(L.requestAusAnfrage(Object.assign({}, ANFRAGE, { gueltigBis: 'bald' })).fehler, 'frist-unlesbar');
});

const GRANT = () => L.grantBauen({ storage: 'https://pod.example/person/', stelle: ANFRAGE.webid,
  adresse: 'https://pod.example/person/vivodepot/freigaben/abc', bis: Date.UTC(2026, 11, 31), zweck: ANFRAGE.zweckIri });

test('[Pod·LWS·Grant] ein Grant trägt die Pflichtfelder des Entwurfs', () => {
  const g = GRANT();
  assert.deepEqual(L.pruefen(g, 'AccessGrant'), []);
  assert.equal(g['@context'][0], 'https://www.w3.org/ns/lws/v1');
  assert.deepEqual(g.access[0].target, { type: 'DataResource', value: 'https://pod.example/person/vivodepot/freigaben/abc' });
});

test('[Pod·LWS·Grant·Rot-Beweis] fehlende Pflichtfelder und Schlüsselfelder fallen', () => {
  const ohne = (f) => { const g = GRANT(); f(g); return L.pruefen(g, 'AccessGrant'); };
  assert.ok(ohne((g) => { delete g.access[0].assignee; }).includes('access.0.assignee'));
  assert.ok(ohne((g) => { g.access[0].action = ['lesen']; }).includes('access.0.action'));
  assert.ok(ohne((g) => { delete g.access[0].target; }).includes('access.0.target'));
  assert.ok(ohne((g) => { delete g.storage; }).includes('storage'));
  assert.ok(ohne((g) => { g['@context'] = ['https://example/ctx']; }).includes('context'));
  for (const k of ['key', 'passwort', 'password', 'passcode', 'vd:schluessel', 'k', 'secret']) {
    assert.ok(ohne((g) => { g.access[0][k] = 'x'; }).some((x) => x.startsWith('schluesselfeld:')), k);
  }
});

test('[Pod·LWS·Dienst] die Storage Description liefert den AccessGrantService oder nichts', () => {
  assert.equal(L.grantDienst({ service: [{ type: 'AccessRequestService', id: 'https://pod.example/req/' },
    { type: 'AccessGrantService', id: 'https://pod.example/grants/' }] }), 'https://pod.example/grants/');
  assert.equal(L.grantDienst({ service: [{ type: 'AccessRequestService', id: 'https://pod.example/req/' }] }), null);
  assert.equal(L.grantDienst(null), null);
});
