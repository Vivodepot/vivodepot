'use strict';
/* ═══════════════════════════════════════════════════════════
   Außenablage: was hinaus darf (pod/aussenablage.js, U2-ADR-520)
   ───────────────────────────────────────────────────────────
   Gehalten wird:
   1. Chiffrat in den Formen von chiffrat-pruefen.js geht hinaus, auch das Verzeichnis-JWE des Kerns (typ
      vivodepot-verzeichnis+jwe).
   2. Klartext nur in vier Formen, jede mit festem Schema: Container ohne Körper, die drei ACL-Regeln der Brücke, der Grant
      aus lws.grantBauen, die Ablaufliste { fassung: 1, ablagen: [{ adresse, bis }] }.
   3. Abgewiesen wird, bevor `senden` aufgerufen wird: fremde Methode, Adresse ohne https, jeder andere Körper.
   Rot-Beweise: das bisherige Klartext-Verzeichnis (intern/verzeichnis.json), eine Ablaufliste mit Stelle, ein Grant mit
   fremdem Feld, eine ACL mit fremder Zeile, ein Verzeichnis-JWE mit fremdem typ.
   ═══════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../pod/aussenablage.js');
const C = require('../pod/chiffrat-pruefen.js');
const L = require('../pod/lws.js');

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const jwe = (kopf) => [b64u(kopf), '', b64u('iv-iv-iv-iv-'), b64u('chiffrat'), b64u('tag-tag-tag-tag-')].join('.');
const VERZEICHNIS_KOPF = { alg: 'dir', enc: 'A256GCM', typ: 'vivodepot-verzeichnis+jwe' };
const PRAEFIX = '@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n';
const ADR = 'https://pod.example/vivodepot/freigaben/k7Q2';
const eigen = (vererbung) => '<#eigen> a acl:Authorization; acl:agent <https://erna.example/profile#me>; acl:accessTo <' + ADR + '>;' +
  (vererbung ? ' acl:default <' + ADR + '>;' : '') + ' acl:mode acl:Read, acl:Write, acl:Control.\n';

function aufnahme() {
  const gesendet = [];
  return { gesendet, senden: (adresse, o) => { gesendet.push({ adresse, o }); return { ok: true }; } };
}

test('[Außenablage] Chiffrat geht hinaus, auch das Verzeichnis-JWE', async () => {
  assert.deepEqual(C.pruefen(jwe(VERZEICHNIS_KOPF)), { art: 'verzeichnis' });
  assert.equal(C.VERZEICHNIS_TYP, 'vivodepot-verzeichnis+jwe');
  for (const k of [VERZEICHNIS_KOPF, { alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }]) assert.equal(A.pruefen('chiffrat', jwe(k)), null);
  const a = aufnahme();
  await A.schreiben(a.senden, 'PUT', ADR, 'chiffrat', jwe(VERZEICHNIS_KOPF), { 'Content-Type': 'application/jose' });
  assert.equal(a.gesendet.length, 1);
  assert.deepEqual(a.gesendet[0].o, { method: 'PUT', headers: { 'Content-Type': 'application/jose' }, body: jwe(VERZEICHNIS_KOPF) });
});

test('[Außenablage] die vier Klartexte in ihrer Form', async () => {
  assert.equal(A.pruefen('container', undefined), null);
  assert.equal(A.pruefen('acl', PRAEFIX + eigen(true)), null);
  assert.equal(A.pruefen('acl', PRAEFIX + eigen(false) + '<#link> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo <' + ADR + '>; acl:mode acl:Read.\n'), null);
  assert.equal(A.pruefen('acl', PRAEFIX + eigen(false) + '<#stelle> a acl:Authorization; acl:agent <https://stelle.example/id#it>; acl:accessTo <' + ADR + '>; acl:mode acl:Read.\n'), null);
  const g = L.grantBauen({ stelle: 'https://stelle.example/id#it', adresse: ADR, storage: 'https://pod.example/', inbox: 'https://stelle.example/inbox/',
    zweck: 'https://stelle.example/zweck/pflegeantrag', bis: Date.UTC(2026, 11, 1) });
  assert.equal(A.pruefen('grant', JSON.stringify(g)), null, 'der Grant der Brücke geht durch');
  assert.equal(A.pruefen('ablaufliste', JSON.stringify({ fassung: 1, ablagen: [{ adresse: ADR, bis: Date.UTC(2026, 11, 1) }] })), null);
  assert.equal(A.pruefen('ablaufliste', JSON.stringify({ fassung: 1, ablagen: [] })), null);
  const a = aufnahme();
  await A.schreiben(a.senden, 'PUT', 'https://pod.example/vivodepot/', 'container', undefined, { 'If-None-Match': '*' });
  assert.equal('body' in a.gesendet[0].o, false, 'Container ohne Körper');
});

test('[Außenablage·Rot-Beweis] Ablaufliste mit stelle, das Klartext-Verzeichnis und anderer Klartext werden abgewiesen', () => {
  const ablauf = (e) => JSON.stringify({ fassung: 1, ablagen: [e] });
  const faelle = {
    'Ablaufliste mit stelle': ['ablaufliste', ablauf({ adresse: ADR, bis: 1, stelle: 'https://stelle.example/id#it' })],
    'Ablaufliste mit art': ['ablaufliste', ablauf({ adresse: ADR, bis: 1, art: 'stelle' })],
    'Ablaufliste ohne bis': ['ablaufliste', ablauf({ adresse: ADR, bis: null })],
    'Ablaufliste mit http': ['ablaufliste', ablauf({ adresse: 'http://pod.example/a', bis: 1 })],
    'Ablaufliste fassung 2': ['ablaufliste', JSON.stringify({ fassung: 2, ablagen: [] })],
    'bisheriges Klartext-Verzeichnis': ['ablaufliste', JSON.stringify({ fassung: 1, ablagen: [{ adresse: ADR, art: 'stelle', stelle: 'https://stelle.example/id#it', bis: 1, am: 1, grant: null, ueberDienst: false }] })],
    'Klartext als Chiffrat': ['chiffrat', 'Name: Erna Beispiel'],
    'JSON als Chiffrat': ['chiffrat', JSON.stringify({ ablagen: [] })],
    'Verzeichnis-JWE mit fremdem typ': ['chiffrat', jwe({ alg: 'dir', enc: 'A256GCM', typ: 'text/plain' })],
    'Verzeichnis-JWE mit fremdem Feld': ['chiffrat', jwe(Object.assign({ notiz: 'Erna' }, VERZEICHNIS_KOPF))],
    'Container mit Körper': ['container', 'x'],
    'ACL mit fremder Zeile': ['acl', PRAEFIX + eigen(false) + '# Erna Beispiel, Pflegegrad 3\n'],
    'ACL mit öffentlichem Schreiben': ['acl', PRAEFIX + '<#link> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo <' + ADR + '>; acl:mode acl:Write.\n'],
    'Grant mit fremdem Feld': ['grant', JSON.stringify({ type: 'AccessGrant', storage: 'https://pod.example/', access: [{ type: 'AccessPolicy' }], notiz: 'Erna' })],
    'Grant mit Zweck als Text': ['grant', JSON.stringify({ type: 'AccessGrant', access: [{ type: 'AccessPolicy', constraint: [{ leftOperand: 'purpose', operator: 'eq', rightOperand: 'Pflegeantrag Erna' }] }] })],
    'unbekannte Form': ['notiz', 'x'],
  };
  for (const [name, [form, koerper]] of Object.entries(faelle)) assert.notEqual(A.pruefen(form, koerper), null, name);
});

test('[Außenablage·Rot-Beweis] abgewiesen wird, bevor etwas abgeht', async () => {
  const a = aufnahme();
  const nein = async (args, grund) => assert.rejects(A.schreiben(a.senden, ...args), new RegExp('^Error: aussenablage:' + grund));
  await nein(['PATCH', ADR, 'chiffrat', jwe(VERZEICHNIS_KOPF)], 'methode');
  await nein(['DELETE', ADR, 'container'], 'methode');
  await nein(['PUT', 'http://pod.example/a', 'chiffrat', jwe(VERZEICHNIS_KOPF)], 'adresse');
  await nein(['PUT', 'https://nutzer:pw@pod.example/a', 'chiffrat', jwe(VERZEICHNIS_KOPF)], 'adresse');
  await nein(['PUT', ADR, 'chiffrat', JSON.stringify({ fassung: 1, ablagen: [] })], 'chiffrat-');
  await nein(['PUT', ADR, 'ablaufliste', JSON.stringify({ fassung: 1, ablagen: [{ adresse: ADR, bis: 1, stelle: 'https://s.example/' }] })], 'ablaufliste-form');
  assert.equal(a.gesendet.length, 0);
});
