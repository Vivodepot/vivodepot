'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Link senden“ für jeden Auszug, Kern-Teil (W1, 16.10.2026; RbB vom 14.10.2026, U2-ADR-047/183 verallgemeinert)
   ────────────────────────────────────────────────────────────────────────
   auszugLinkTeile verschlüsselt genau die Bytes einer ausgegebenen Datei, mit einem frischen Schlüssel je Link. Ein
   SMART Health Link trägt FHIR: der lesbare Kopf nennt immer application/fhir+json. Ein FHIR-Auszug geht mit seinen
   Bytes hinein, jeder andere als FHIR-Ressource Binary (contentType aus einer geschlossenen Liste, data in base64).
   Geprüft wird mit einer unabhängigen Entschlüsselung (Node, RFC 7516): heraus kommen dieselben Bytes, auch bei einer
   Datei, die kein Text ist (PDF).

   Der Schalter LINK_SENDEN_FUER_AUSZUEGE bleibt aus, bis die Oberfläche nach dem Blick auf die Vorschau gebaut ist; die
   Probe hält das fest, damit er nicht still angeht.
   Rot-Beweis: ein Weg, der die Datei als Text liest und wieder kodiert, veränderte eine PDF — die Gleichheitsprobe fiele.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const b64uToBuf = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** JWE compact (alg:dir, enc:A256GCM) unabhängig entschlüsseln → { kopf, bytes }. Wirft bei falschem Schlüssel. */
function jweEntschluesseln(jwe, keyB64u) {
  const [protHdr, , ivB, ctB, tagB] = String(jwe).split('.');
  const d = nodeCrypto.createDecipheriv('aes-256-gcm', b64uToBuf(keyB64u), b64uToBuf(ivB));
  d.setAAD(Buffer.from(protHdr, 'ascii'));
  d.setAuthTag(b64uToBuf(tagB));
  const bytes = Buffer.concat([d.update(b64uToBuf(ctB)), d.final()]);
  return { kopf: JSON.parse(b64uToBuf(protHdr).toString('utf8')), bytes };
}

// Bytes, die als UTF-8 nicht gültig sind (wie in einer PDF): ein Text-Umweg veränderte sie.
const PDF_AEHNLICH = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, 0xff, 0xfe, 0x00, 0x80]);

const binaryAus = (bytes) => JSON.parse(bytes.toString('utf8'));
const FHIR_KOPF = { alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' };

test('[Link senden·Auszug] eine JSON-Datei: als Binary mit contentType, nach dem Entschlüsseln dieselben Bytes', async () => {
  const { V } = ladeKern();
  const inhalt = JSON.stringify({ dateiTyp: 'vivodepot-anlass', felder: { name: 'Klara Probe' } }, null, 2);
  const teile = await V.auszugLinkTeile(new Blob([inhalt], { type: 'application/json' }));
  const { kopf, bytes } = jweEntschluesseln(teile.jwe, teile.key);
  assert.deepEqual(kopf, FHIR_KOPF);
  const b = binaryAus(bytes);
  assert.equal(b.resourceType, 'Binary');
  assert.equal(b.contentType, 'application/json');
  assert.equal(Buffer.from(b.data, 'base64').toString('utf8'), inhalt);
});

test('[Link senden·Auszug] eine Datei, die kein Text ist (PDF): byteweise gleich im Binary', async () => {
  const { V } = ladeKern();
  const teile = await V.auszugLinkTeile(new Blob([PDF_AEHNLICH], { type: 'application/pdf' }), { label: 'Auszug' });
  const b = binaryAus(jweEntschluesseln(teile.jwe, teile.key).bytes);
  assert.equal(b.contentType, 'application/pdf');
  assert.deepEqual([...Buffer.from(b.data, 'base64')], [...PDF_AEHNLICH]);
  assert.equal(teile.label, 'Auszug');
});

test('[Link senden·Auszug] ein FHIR-Auszug geht mit seinen Bytes hinein, nicht eingepackt', async () => {
  const { V } = ladeKern();
  const fhir = JSON.stringify({ resourceType: 'Bundle', type: 'document', entry: [] });
  const teile = await V.auszugLinkTeile(new Blob([fhir], { type: 'application/fhir+json' }));
  const { kopf, bytes } = jweEntschluesseln(teile.jwe, teile.key);
  assert.deepEqual(kopf, FHIR_KOPF);
  assert.equal(bytes.toString('utf8'), fhir);
});

test('[Link senden·Auszug·Rot-Probe] ein beliebiger Typ der Datei erreicht weder den Kopf noch das Binary', async () => {
  const { V } = ladeKern();
  for (const fremd of ['evil/x', 'application/json; charset=utf-8\r\nX: y', '', 'text/html']) {
    const teile = await V.auszugLinkTeile(new Blob(['x'], { type: 'text/plain' }), { mime: fremd });
    const { kopf, bytes } = jweEntschluesseln(teile.jwe, teile.key);
    assert.deepEqual(kopf, FHIR_KOPF, fremd);
    const typ = binaryAus(bytes).contentType;
    assert.ok(V.AUSZUG_INHALTSTYPEN.includes(typ) || typ === 'application/octet-stream', fremd + ' → ' + typ);
  }
  assert.equal(V._auszugInhaltstyp('evil/x'), 'application/octet-stream');
  assert.equal(V._auszugInhaltstyp('Application/JSON; charset=utf-8'), 'application/json');
});

test('[Link senden·Auszug] jeder Link hat einen eigenen Schlüssel', async () => {
  const { V } = ladeKern();
  const a = await V.auszugLinkTeile(new Blob(['x'], { type: 'text/plain' }));
  const b = await V.auszugLinkTeile(new Blob(['x'], { type: 'text/plain' }));
  assert.notEqual(a.key, b.key);
  assert.throws(() => jweEntschluesseln(a.jwe, b.key));
});

test('[Link senden·Auszug] der Weg des importierten Originals bleibt: _jweCompactDir trägt application/fhir+json', async () => {
  const { V } = ladeKern();
  const schluessel = new Uint8Array(32).fill(7);
  const jwe = await V._jweCompactDir('{"resourceType":"Bundle"}', schluessel);
  const { kopf, bytes } = jweEntschluesseln(jwe, Buffer.from(schluessel).toString('base64url'));
  assert.deepEqual(kopf, FHIR_KOPF);
  assert.equal(bytes.toString('utf8'), '{"resourceType":"Bundle"}');
});

test('[Link senden·Auszug] der Schalter für die Oberfläche bleibt aus, bis sie nach der Vorschau gebaut ist', () => {
  const { V } = ladeKern();
  assert.equal(V.LINK_SENDEN_FUER_AUSZUEGE, false);
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.equal((kern.match(/auszugLinkTeile\(/g) || []).length, 1, 'auszugLinkTeile wird im Kern noch nirgends aufgerufen');
});

test('[Link senden·Auszug·Rot-Beweis] ein Text-Umweg veränderte eine PDF: die Gleichheitsprobe fiele', () => {
  const alsText = new TextDecoder().decode(PDF_AEHNLICH);   // was ein Weg täte, der die Datei als Text liest
  assert.notDeepEqual([...new TextEncoder().encode(alsText)], [...PDF_AEHNLICH], 'ohne den Byte-Weg kämen andere Bytes an');
});

/* SCHALTER NUR MIT VALIDATOR-BELEG (17.10.2026): LINK_SENDEN_FUER_AUSZUEGE darf erst auf true, wenn
   die Link-Inhalte gegen die offiziellen bzw. maßgeblichen Validatoren geprüft sind (SMART Health Links:
   smart-on-fhir/health-cards-dev-tools; FHIR Binary: HL7-Validator). Der Beleg liegt unter dem Pfad BELEG unten:
   je Validator Name, Fassung und Prüfsumme des geprüften Werkzeugs, dazu das Ergebnis. Ohne ihn ist der Schalter auf true rot. */
const BELEG = path.join(__dirname, '..', 'tools', 'link-senden-validator-beleg.json');
function schalterBefund(kernText, belegText) {
  const m = /const LINK_SENDEN_FUER_AUSZUEGE = (true|false);/.exec(kernText);
  if (!m) return ['der Schalter LINK_SENDEN_FUER_AUSZUEGE fehlt im Kern'];
  if (m[1] === 'false') return [];
  if (belegText === null) return ['Schalter auf true ohne Validator-Beleg (tools/link-senden-validator-beleg.json)'];
  let b;
  try { b = JSON.parse(belegText); } catch (_) { return ['Validator-Beleg ist kein JSON']; }
  const f = [];
  for (const art of ['shl', 'fhir-binary']) {
    const e = (b.validatoren || []).find((v) => v.art === art);
    if (!e) { f.push('Validator-Beleg ohne Eintrag ' + art); continue; }
    for (const k of ['name', 'fassung', 'pruefsumme', 'ergebnis']) if (!e[k]) f.push('Validator-Beleg ' + art + ' ohne ' + k);
    if (e.ergebnis && e.ergebnis !== 'gruen') f.push('Validator-Beleg ' + art + ' nicht grün: ' + e.ergebnis);
  }
  return f;
}
test('[Link senden·Schalter] auf true nur mit vollständigem, grünem Validator-Beleg', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.deepEqual(schalterBefund(kern, fs.existsSync(BELEG) ? fs.readFileSync(BELEG, 'utf8') : null), []);
});
test('[Link senden·Schalter·Rot-Beweis] true ohne Beleg, mit unvollständigem oder rotem Beleg fällt; false nie', () => {
  const an = 'const LINK_SENDEN_FUER_AUSZUEGE = true;';
  assert.deepEqual(schalterBefund(an, null), ['Schalter auf true ohne Validator-Beleg (tools/link-senden-validator-beleg.json)']);
  const voll = (ergebnis) => JSON.stringify({ validatoren: [
    { art: 'shl', name: 'health-cards-dev-tools', fassung: '1.0.0', pruefsumme: 'sha256:aa', ergebnis },
    { art: 'fhir-binary', name: 'validator_cli', fassung: '6.0.0', pruefsumme: 'sha256:bb', ergebnis: 'gruen' }] });
  assert.deepEqual(schalterBefund(an, voll('gruen')), []);
  assert.deepEqual(schalterBefund(an, voll('rot')), ['Validator-Beleg shl nicht grün: rot']);
  assert.deepEqual(schalterBefund(an, JSON.stringify({ validatoren: [] })), ['Validator-Beleg ohne Eintrag shl', 'Validator-Beleg ohne Eintrag fhir-binary']);
  assert.deepEqual(schalterBefund('const LINK_SENDEN_FUER_AUSZUEGE = false;', null), []);
});
