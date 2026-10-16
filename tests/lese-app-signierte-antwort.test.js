'use strict';
/* U2-ADR-501 (Abschnitt A und C, Punkt 12) — die Lese-App liest eine SIGNIERTE Antwort: einen JWS Compact im JWE (`cty` `JWT`).
   Die Lese-App kommt zuerst (Punkt 13); der Kern signiert erst eine Fassung später. Darum baut diese Probe die signierte Antwort
   selbst, zur Laufzeit, mit node:crypto (Ed25519) — kein privater Schlüssel liegt im Repo.

   Was gehalten wird:
     · eine gültige signierte Antwort öffnet sich, und ihr Inhalt ist derselbe wie auf dem Weg ohne Signatur;
     · ein gekipptes Byte, ein fremdes `aud`, eine andere Anfrage, `alg` ES256/none/HS256, ein falsches `typ`: abgewiesen, mit Satz;
     · eine Antwort ohne Signatur öffnet sich wie bisher, mit dem Sachsatz „nicht signiert (ältere Fassung)“, ohne Warnstil;
     · kein Text des Signaturstands sagt „geprüft“, „verifiziert“ oder „echt“; „neuer Schlüssel“ ist neutral; eine fehlende PID ist
       kein Mangel (sie wird nicht genannt).
   Rot-Beweis zum fremden `aud` (Auflage der Krypto-Gegenlesung): eine Lese-App ohne den Abgleich nähme die Antwort an.
   Nacharbeit 15.10.2026 (Entscheid der Gegenlesung): `aud` wird NUR gegen die Kennung der entschlüsselnden Stelle gehalten (die
   Anbieter-Kennung im JWK der Schlüsseldatei), nie gegen den JWE-Kopf derselben Nachricht. Rote Probe: Stelle A entschlüsselt und
   verschlüsselt mit unverändertem Kopf neu an Stelle B; B weist ab. Gegenprobe: B's eigene Antwort geht durch. Ohne Kennung
   (Einmalpasswort, Schlüsseldatei ohne Kennung) kein Abgleich, nur „Signiert für ‹aud›“. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const nodeCrypto = require('node:crypto');
const { webcrypto } = nodeCrypto;
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');

const STELLE = 'heim/sonnenhof';
const VORGANG = 'AUF-2026-1015';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const json = (o) => JSON.parse(JSON.stringify(o));

function datensatz(extra) {
  return Object.assign({
    erstelltAm: '2026-10-15T09:00:00.000Z',
    anfrage: { von: 'Pflegeheim Sonnenhof', anbieterId: STELLE, zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG, gueltigBis: '2099-12-31' },
    felder: [
      { kennung: 'identity.givenName', label: 'Vorname', wert: 'Hedwig', zweck: 'Anrede' },
      { kennung: 'identity.familyName', label: 'Nachname', wert: 'Brandt', zweck: 'Anrede' },
    ],
    fehlend: [], unbekannt: [], vollstaendig: true,
    absender: { name: 'Hedwig Brandt', rolle: 'selbst' },
  }, extra || {});
}

/* ── Der Signierschlüssel der Person für diese Stelle (zur Laufzeit) ── */
function edPaar() {
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ed25519');
  const jwk = publicKey.export({ format: 'jwk' });
  return { privateKey, jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x } };
}
function thumbprint(jwk) {
  return b64u(nodeCrypto.createHash('sha256').update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x })).digest());
}
function signiere(nutzlast, paar, kopfAenderung) {
  const kopf = Object.assign({ alg: 'Ed25519', typ: 'vivodepot-antwort+jwt', kid: thumbprint(paar.jwk), jwk: paar.jwk }, kopfAenderung || {});
  const eingabe = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(nutzlast));
  return eingabe + '.' + b64u(nodeCrypto.sign(null, Buffer.from(eingabe), paar.privateKey));
}
// Die Kennung der Stelle nach dem STELLENKENNUNG-BLOCK, hier unabhängig nachgebaut (Domäne signiert:, Art anbieter).
function audVon(id) { return 'signiert:anbieter:' + String(Buffer.byteLength(id)).padStart(4, '0') + ':' + id; }
function nutzlast(ds, aenderung) {
  return Object.assign({}, ds, { iat: 1760518800, aud: audVon(STELLE) }, aenderung || {});
}

/* ── Die JWE darum: ECDH-ES auf P-256, wie U2-ADR-449 (Concat KDF aus der Lese-App selbst) ── */
/* Der private Teil trägt die Anbieter-Kennung der Stelle als zusätzliches JWK-Mitglied (RFC 7517 §4); `null` = Schlüsseldatei ohne Kennung. */
async function empfangsPaar(anbieterId) {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  if (anbieterId !== null) priv.anbieterId = anbieterId === undefined ? STELLE : anbieterId;
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv };
}
async function verschluessele(L, klartext, empfaengerPub, kopfExtra) {
  const empf = await webcrypto.subtle.importKey('jwk', empfaengerPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const fl = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const e = await webcrypto.subtle.exportKey('jwk', fl.publicKey);
  const kopf = Object.assign({ alg: 'ECDH-ES', typ: 'vivodepot-antwort+jwe', enc: 'A256GCM', vorgang: VORGANG, anbieter: STELLE }, kopfExtra || {});
  kopf.epk = { kty: e.kty, crv: e.crv, x: e.x, y: e.y };
  kopf.apv = b64u(Buffer.from(kopf.vorgang));
  const z = new Uint8Array(await webcrypto.subtle.deriveBits({ name: 'ECDH', public: empf }, fl.privateKey, 256));
  const cek = await L._jweConcatKdf(z, 'A256GCM', new Uint8Array(0), new Uint8Array(Buffer.from(kopf.vorgang)), 256);
  const key = await webcrypto.subtle.importKey('raw', new Uint8Array(cek), { name: 'AES-GCM' }, false, ['encrypt']);
  const k = b64u(JSON.stringify(kopf));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from(k), tagLength: 128 }, key, Buffer.from(klartext)));
  return [k, '', b64u(iv), b64u(ct.subarray(0, ct.length - 16)), b64u(ct.subarray(ct.length - 16))].join('.');
}
async function oeffne(L, jwe, priv) {
  return L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), { privateJwk: priv });
}
async function abgewiesen(L, jwe, priv, textSchluessel) {
  let fehler = null;
  try { await oeffne(L, jwe, priv); } catch (e) { fehler = e; }
  assert.ok(fehler, 'die Antwort wurde angenommen, erwartet war die Abweisung „' + textSchluessel + '“');
  assert.equal(fehler.antwortTextSchluessel, textSchluessel);
  const satz = L.antwortOeffnenFehlerText(fehler);
  assert.equal(satz, L.STRINGS[textSchluessel], 'die Person liest den Satz aus dem Textsatz');
  assert.ok(!/antwort-signatur-|jws|jwe|\baud\b|\balg\b/i.test(satz), 'kein Code im Satz: ' + satz);
}

test('[Signierte Antwort] eine gültige signierte Antwort öffnet sich, ihr Inhalt ist derselbe wie ohne Signatur', async () => {
  const L = ladeLesen().V;
  const paar = edPaar(), empf = await empfangsPaar();
  const ds = datensatz();
  const signiert = await oeffne(L, await verschluessele(L, signiere(nutzlast(ds), paar), empf.pub, { cty: 'JWT' }), empf.priv);
  const ohne = await oeffne(L, await verschluessele(L, JSON.stringify(ds), empf.pub, { cty: 'json' }), empf.priv);
  assert.equal(signiert.signatur.zustand, 'signatur');
  assert.equal(ohne.signatur.zustand, 'ohne');
  assert.deepEqual(json(signiert.datensatz), json(ohne.datensatz), 'derselbe Datensatz, ohne iat und aud');
  assert.deepEqual(json(L.antwortAnzeigeModell(signiert.datensatz, {})), json(L.antwortAnzeigeModell(ohne.datensatz, {})), 'dasselbe Blatt');
  assert.equal(signiert.signatur.stelle, STELLE, 'angezeigt wird der lesbare Teil der Kennung');
  assert.equal(signiert.signatur.aud, audVon(STELLE));
  assert.equal(signiert.signatur.abgeglichen, false, 'eine Kennung in der Schlüsseldatei ist bis zur Bindung (V3b) ungebunden: kein Abgleich');
  assert.equal(signiert.signatur.abdruck, thumbprint(paar.jwk), 'Abdruck nach RFC 7638');
  assert.equal(signiert.signatur.abdruckKurz, b64u(Buffer.from(thumbprint(paar.jwk), 'base64url').subarray(0, 8)), 'kurz: die ersten 8 Byte');
});

test('[Signierte Antwort] `cty` wird ohne Groß-/Kleinschreibung gelesen, `alg` EdDSA wird weiter angenommen', async () => {
  const L = ladeLesen().V;
  const paar = edPaar(), empf = await empfangsPaar();
  const r = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz()), paar, { alg: 'EdDSA' }), empf.pub, { cty: 'jwt' }), empf.priv);
  assert.equal(r.signatur.zustand, 'signatur');
});

test('[Signierte Antwort·Abweisung] ein gekipptes Byte in der Nutzlast: abgewiesen', async () => {
  const L = ladeLesen().V;
  const paar = edPaar(), empf = await empfangsPaar();
  const t = signiere(nutzlast(datensatz()), paar).split('.');
  const p = Buffer.from(t[1], 'base64url');
  const i = p.indexOf(Buffer.from('Hedwig'));
  assert.ok(i > 0, 'Vorbedingung: der Wert steht in der Nutzlast');
  p[i] ^= 0x01;
  t[1] = b64u(p);
  await abgewiesen(L, await verschluessele(L, t.join('.'), empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturUngueltig');
});

test('[Signierte Antwort·Abweisung·gebunden] mit einer GEBUNDENEN Kennung (Wagen V3b) weist die Prüfung ein fremdes aud ab', async () => {
  // Die Prüffunktion selbst; die gebundene Kennung reicht erst V3b herein (heute ruft der Öffnen-Weg sie ohne Kennung).
  const L = ladeLesen().V;
  const paar = edPaar();
  const jws = signiere(nutzlast(datensatz(), { aud: audVon('klinik/andere') }), paar);
  await assert.rejects(L.antwortSignaturPruefen(jws, { anbieterId: STELLE, vorgang: VORGANG }), (e) => e.antwortTextSchluessel === 'antwortSignaturFremdeStelle');
  // Der rohe Name ohne Domäne ist keine Kennung der Stelle.
  const jws2 = signiere(nutzlast(datensatz(), { aud: STELLE }), paar);
  await assert.rejects(L.antwortSignaturPruefen(jws2, { anbieterId: STELLE, vorgang: VORGANG }), (e) => e.antwortTextSchluessel === 'antwortSignaturFremdeStelle');
  assert.ok(/für eine andere Stelle signiert/.test(L.STRINGS.antwortSignaturFremdeStelle));
});

test('[Signierte Antwort·ungebunden·rot] A entschlüsselt und verschlüsselt mit unverändertem Kopf an B: B sagt nur „signiert für A“, nie „für diese Stelle“', async () => {
  const L = ladeLesen().V;
  const paar = edPaar();
  const a = await empfangsPaar('klinik/a'), b = await empfangsPaar('heim/b');
  const anA = await verschluessele(L, signiere(nutzlast(datensatz(), { aud: audVon('klinik/a') }), paar), a.pub, { cty: 'JWT', anbieter: 'klinik/a' });
  const offenA = await L.antwortJweOeffnen(anA, { privateJwk: a.priv });
  const kopfA = json(offenA.kopf);
  const umgeleitet = await verschluessele(L, offenA.klartext, b.pub, { cty: kopfA.cty, anbieter: kopfA.anbieter, vorgang: kopfA.vorgang });
  const r = await oeffne(L, umgeleitet, b.priv);
  assert.equal(r.signatur.zustand, 'signatur');
  assert.equal(r.signatur.abgeglichen, false, 'eine ungebundene Kennung in der Schlüsseldatei wird nicht ausgewertet');
  assert.equal(r.signatur.stelle, 'klinik/a', 'das Blatt nennt, für wen signiert wurde');
});
test('[Signierte Antwort·ungebunden] eine Schlüsseldatei mit anbieterId, aber ohne Bindung: kein Abgleich, nur die Sachangabe', async () => {
  const { V: L, document } = ladeLesen();
  const empf = await empfangsPaar(STELLE);
  const r = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz(), { aud: audVon('klinik/andere') }), edPaar()), empf.pub, { cty: 'JWT', anbieter: STELLE }), empf.priv);
  assert.equal(r.signatur.abgeglichen, false);
  L.renderAntwort(r.datensatz, {}, r.signatur);
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes(L.STRINGS.antwortSignaturSachsatz.replace('{stelle}', 'klinik/andere')));
  assert.ok(!html.includes(L.STRINGS.antwortSignaturFremdeStelle), 'kein „für eine andere Stelle“ ohne geprüfte Identität');
});
test('[Signierte Antwort·Gegenprobe] die eigene Antwort von B geht bei B durch', async () => {
  const L = ladeLesen().V;
  const b = await empfangsPaar('heim/b');
  const r = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz(), { aud: audVon('heim/b') }), edPaar()), b.pub, { cty: 'JWT', anbieter: 'heim/b' }), b.priv);
  assert.equal(r.signatur.zustand, 'signatur');
  assert.equal(r.signatur.abgeglichen, false);
  assert.equal(r.signatur.stelle, 'heim/b');
  // Auch in der Domäne unsigniert: (die Anfrage nannte die Kennung nur selbst) und in anderer Schreibweise der Kennung.
  const unsig = 'unsigniert:0006:heim/b';
  const r2 = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz(), { aud: unsig }), edPaar()), b.pub, { cty: 'JWT' }),
    Object.assign({}, b.priv, { anbieterId: ' Heim/B ' }));
  assert.equal(r2.signatur.abgeglichen, false);
});

test('[Signierte Antwort·ohne Kennung] Schlüsseldatei ohne Kennung: kein Abgleich, kein Rückgriff auf den JWE-Kopf, nur die Sachangabe', async () => {
  const { V: L, document } = ladeLesen();
  const empf = await empfangsPaar(null);
  // Der Kopf nennt STELLE, aud eine andere Stelle: ohne eigene Kennung zählt der Kopf nicht — die Antwort öffnet sich, ohne Abgleich.
  const jws = signiere(nutzlast(datensatz(), { aud: audVon('klinik/andere') }), edPaar());
  const r = await oeffne(L, await verschluessele(L, jws, empf.pub, { cty: 'JWT', anbieter: STELLE }), empf.priv);
  assert.equal(r.signatur.zustand, 'signatur');
  assert.equal(r.signatur.abgeglichen, false);
  L.renderAntwort(r.datensatz, {}, r.signatur);
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes(L.STRINGS.antwortSignaturSachsatz.replace('{stelle}', 'klinik/andere')), '„Signiert für ‹aud›“ steht da');
  assert.ok(html.includes('data-abgleich="ohne"'));
  assert.ok(!/geprüft|verifiziert/.test(/<p class="hint" id="antwort-signatur-sachsatz"[^>]*>([^<]*)</.exec(html)[1]));
});

test('[Signierte Antwort·Einmalpasswort] auf dem Passwortweg gibt es keinen Abgleich; die Signatur wird geprüft, aud nur angezeigt', async () => {
  const L = ladeLesen().V;
  const pw = 'Einmal-Probe-signiert-7fQ2';
  const p2s = webcrypto.getRandomValues(new Uint8Array(16));
  const alg = 'PBES2-HS512+A256KW';
  const basis = await webcrypto.subtle.importKey('raw', Buffer.from(pw), { name: 'PBKDF2' }, false, ['deriveKey']);
  const kw = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.concat([Buffer.from(alg), Buffer.from([0]), Buffer.from(p2s)]), iterations: L.ANTWORT_JWE_P2C, hash: 'SHA-512' },
    basis, { name: 'AES-KW', length: 256 }, false, ['wrapKey']);
  const cek = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const ek = new Uint8Array(await webcrypto.subtle.wrapKey('raw', cek, kw, { name: 'AES-KW' }));
  const kopf = { alg, typ: 'vivodepot-antwort+jwe', cty: 'JWT', enc: 'A256GCM', vorgang: VORGANG, anbieter: STELLE, p2s: b64u(p2s), p2c: L.ANTWORT_JWE_P2C };
  const k = b64u(JSON.stringify(kopf));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const jws = signiere(nutzlast(datensatz(), { aud: audVon('klinik/andere') }), edPaar());
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from(k), tagLength: 128 }, cek, Buffer.from(jws)));
  const jwe = [k, b64u(ek), b64u(iv), b64u(ct.subarray(0, ct.length - 16)), b64u(ct.subarray(ct.length - 16))].join('.');
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), { passwort: pw });
  assert.equal(r.signatur.zustand, 'signatur');
  assert.equal(r.signatur.abgeglichen, false);
  assert.equal(r.signatur.stelle, 'klinik/andere');
});

test('[Signierte Antwort·ungebunden·Rot-Beweis] ein Öffnen-Weg, der die ungebundene anbieterId auswertet, behauptete einen Abgleich', async () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const zeile = "    const erg = await antwortSignaturPruefen(offen.klartext, { anbieterId: '', vorgang: String(offen.kopf.vorgang || '') }, opts);";
  assert.equal(html.split(zeile).length, 2, 'Vorbedingung: der Öffnen-Weg ruft die Prüfung genau einmal ohne Kennung');
  const falsch = "    const erg = await antwortSignaturPruefen(offen.klartext, { anbieterId: (schluessel && schluessel.privateJwk && schluessel.privateJwk.anbieterId) || '', vorgang: String(offen.kopf.vorgang || '') }, opts);";
  const L = ladeLesen({ html: html.replace(zeile, falsch) }).V;
  const empf = await empfangsPaar(STELLE);
  const r = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz(), { aud: audVon(STELLE) }), edPaar()), empf.pub, { cty: 'JWT' }), empf.priv);
  assert.equal(r.signatur.abgeglichen, true, 'so sähe die ungebundene Kennung wie eine geprüfte aus — genau das hält die Probe oben fest');
});

test('[Signierte Antwort·Abweisung] die Antwort auf eine andere Anfrage: abgewiesen', async () => {
  const L = ladeLesen().V;
  const paar = edPaar(), empf = await empfangsPaar();
  const ds = datensatz({ anfrage: Object.assign({}, datensatz().anfrage, { vorgang: 'AUF-2026-0001' }) });
  await abgewiesen(L, await verschluessele(L, signiere(nutzlast(ds), paar), empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturFremderVorgang');
});

test('[Signierte Antwort·Abweisung] alg ES256, none und HS256: abgewiesen, bevor gerechnet wird', async () => {
  const L = ladeLesen().V;
  const empf = await empfangsPaar();
  const n = nutzlast(datensatz());
  // ES256 mit einem P-256-Schlüssel, korrekt signiert: trotzdem nein.
  const ec = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const ecJwk = ec.publicKey.export({ format: 'jwk' });
  const kopfEs = { alg: 'ES256', typ: 'vivodepot-antwort+jwt', jwk: { kty: 'EC', crv: 'P-256', x: ecJwk.x, y: ecJwk.y } };
  const einEs = b64u(JSON.stringify(kopfEs)) + '.' + b64u(JSON.stringify(n));
  const es = einEs + '.' + b64u(nodeCrypto.sign('sha256', Buffer.from(einEs), { key: ec.privateKey, dsaEncoding: 'ieee-p1363' }));
  await abgewiesen(L, await verschluessele(L, es, empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturVerfahren');
  const paar = edPaar();
  const none = b64u(JSON.stringify({ alg: 'none', typ: 'vivodepot-antwort+jwt', jwk: paar.jwk })) + '.' + b64u(JSON.stringify(n)) + '.';
  await abgewiesen(L, await verschluessele(L, none, empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturVerfahren');
  const kopfHs = { alg: 'HS256', typ: 'vivodepot-antwort+jwt', jwk: paar.jwk };
  const einHs = b64u(JSON.stringify(kopfHs)) + '.' + b64u(JSON.stringify(n));
  const hs = einHs + '.' + b64u(nodeCrypto.createHmac('sha256', Buffer.from(paar.jwk.x, 'base64url')).update(einHs).digest());
  await abgewiesen(L, await verschluessele(L, hs, empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturVerfahren');
  // Ed25519 im alg, aber ein EC-Schlüssel im Kopf: ebenso nein.
  const gemischt = signiere(n, paar, { jwk: { kty: 'EC', crv: 'P-256', x: ecJwk.x, y: ecJwk.y } });
  await abgewiesen(L, await verschluessele(L, gemischt, empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturVerfahren');
});

test('[Signierte Antwort·Abweisung] ein falsches typ: abgewiesen', async () => {
  const L = ladeLesen().V;
  const paar = edPaar(), empf = await empfangsPaar();
  for (const typ of ['vc+jwt', 'JWT', undefined]) {
    const jws = signiere(nutzlast(datensatz()), paar, { typ });
    await abgewiesen(L, await verschluessele(L, jws, empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturArt');
  }
});

test('[Signierte Antwort·Abweisung] ohne iat, ohne aud, mit fremdem kid: abgewiesen', async () => {
  const L = ladeLesen().V;
  const paar = edPaar(), empf = await empfangsPaar();
  const ohneIat = nutzlast(datensatz()); delete ohneIat.iat;
  await abgewiesen(L, await verschluessele(L, signiere(ohneIat, paar), empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturUnvollstaendig');
  const ohneAud = nutzlast(datensatz()); delete ohneAud.aud;
  await abgewiesen(L, await verschluessele(L, signiere(ohneAud, paar), empf.pub, { cty: 'JWT' }), empf.priv, 'antwortSignaturUnvollstaendig');
  await abgewiesen(L, await verschluessele(L, signiere(nutzlast(datensatz()), paar, { kid: thumbprint(edPaar().jwk) }), empf.pub, { cty: 'JWT' }),
    empf.priv, 'antwortSignaturUngueltig');
});

test('[Signierte Antwort·Übergang] eine Antwort ohne Signatur öffnet sich wie bisher, mit dem Sachsatz, ohne Warnstil', async () => {
  const { V: L, document } = ladeLesen();
  const empf = await empfangsPaar();
  const r = await oeffne(L, await verschluessele(L, JSON.stringify(datensatz()), empf.pub, { cty: 'json' }), empf.priv);
  assert.equal(r.signatur.zustand, 'ohne');
  L.renderAntwort(r.datensatz, {}, r.signatur);
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes(L.STRINGS.antwortOhneSignatur), 'der Sachsatz steht auf dem Blatt');
  const zeile = /<p class="([^"]*)" id="antwort-signatur"[^>]*>/.exec(html);
  assert.ok(zeile, 'die Zeile steht da');
  assert.equal(zeile[1], 'hint antwort-signatur', 'Sachangabe, kein Warnstil');
  assert.ok(html.includes('Hedwig'), 'der Inhalt steht da');
});

test('[Signierte Antwort·Übergang] eine Antwort des heutigen Kerns (ohne Signatur) öffnet sich über denselben Weg', async () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  await V.depotAnlegen('Signierte-Antwort-Probe-2026!');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const empf = await empfangsPaar();
  const a = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Heim', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG,
    gestelltAm: '2026-10-15', gueltigBis: '2099-12-31', felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }],
    antwort: { art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: empf.pub } };
  const ds = V.anfrageAntwortDatensatz(a, { sensibel: false });
  const jwe = await V.antwortVerschluesseln(ds, a, {});
  const L = ladeLesen().V;
  const r = await oeffne(L, jwe, empf.priv);
  assert.equal(r.signatur.zustand, 'ohne');
  assert.deepEqual(json(r.datensatz), json(ds));
});

test('[Signierte Antwort·Anzeige] neuer Schlüssel, dann „zuerst am“; nie „geprüft“, keine PID verlangt', async () => {
  const { V: L, document } = ladeLesen();
  const paar = edPaar(), empf = await empfangsPaar();
  const jwe = await verschluessele(L, signiere(nutzlast(datensatz()), paar), empf.pub, { cty: 'JWT' });
  const erst = await oeffne(L, jwe, empf.priv);
  assert.equal(erst.signatur.neu, true);
  L.renderAntwort(erst.datensatz, {}, erst.signatur);
  const html1 = document.getElementById('app').innerHTML;
  assert.ok(html1.includes('data-signatur="neuer-schluessel"'));
  assert.ok(html1.includes(L.STRINGS.antwortSignaturZeileNeu.replace('{abdruck}', erst.signatur.abdruckKurz)));
  assert.ok(html1.includes(L.STRINGS.antwortSignaturSachsatz.replace('{stelle}', STELLE)), 'für welche Stelle signiert, steht da');
  const zweit = await oeffne(L, jwe, empf.priv);
  assert.equal(zweit.signatur.neu, false);
  assert.equal(zweit.signatur.zuerstAm, erst.signatur.zuerstAm);
  L.renderAntwort(zweit.datensatz, {}, zweit.signatur);
  const html2 = document.getElementById('app').innerHTML;
  assert.ok(html2.includes('data-signatur="bekannter-schluessel"'));
  for (const html of [html1, html2]) {
    const z = /<p class="([^"]*)" id="antwort-signatur"[^>]*>([^<]*)<\/p>/.exec(html);
    assert.ok(z, 'Signaturzeile gefunden');
    assert.ok(!/warn/i.test(z[1]), 'kein Warnstil: ' + z[1]);
    assert.ok(!/geprüft|geprueft|verifiziert|\becht\b/i.test(z[2]), 'nie „geprüft“: ' + z[2]);
    assert.ok(!/\bPID\b|Wallet|Mangel/.test(html), 'eine fehlende PID wird nicht als Mangel genannt');
    assert.ok(html.includes(L.STRINGS.antwortHerkunftAlleEingetragen), 'die Herkunft der Angaben bleibt „von der Person angegeben“ (U2-ADR-437)');
  }
  // Ein anderer Schlüssel bei derselben Stelle ist wieder „neu“ — ohne Wertung des ersten.
  const anders = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz()), edPaar()), empf.pub, { cty: 'JWT' }), empf.priv);
  assert.equal(anders.signatur.neu, true);
});

/* ── Die Wortliste: jeder Text des Signaturstands, Deutsch und Englisch ── */
const ANZEIGE_SCHLUESSEL = ['antwortSignaturZeileBekannt', 'antwortSignaturZeileNeu', 'antwortSignaturSachsatz', 'antwortOhneSignatur'];
const GRUND_SCHLUESSEL = ['antwortSignaturUngueltig', 'antwortSignaturVerfahren', 'antwortSignaturArt', 'antwortSignaturUnlesbar',
  'antwortSignaturUnvollstaendig', 'antwortSignaturZeit', 'antwortSignaturFremdeStelle', 'antwortSignaturFremderVorgang'];
// Was die Signatur nicht leistet (Punkt 2) und was „neuer Schlüssel“ nie sein darf (Punkt 3): Urteil, Warnung, Mangel.
const NIE_ANZEIGE = /geprüft|geprueft|verifiziert|\becht\b|verified|genuine|authentic|checked|trusted|vertrau|richtig|correct|falsch|wrong|warn|achtung|vorsicht|caution|verdacht|suspicious|unbekannt|unknown|PID|Wallet|Mangel|fehlt|missing/i;
const NIE_GRUND = /geprüft|geprueft|verifiziert|\becht\b|verified|genuine|authentic/i;
function wortBefunde(V, nieAnzeige) {
  const f = [];
  for (const k of ANZEIGE_SCHLUESSEL.concat(GRUND_SCHLUESSEL)) {
    const muster = ANZEIGE_SCHLUESSEL.includes(k) ? nieAnzeige : NIE_GRUND;
    for (const [sprache, text] of [['de', V.STRINGS[k]], ['en', V.LESE_TEXTE_EN[k]]]) {
      if (typeof text !== 'string' || !text.trim()) { f.push(k + ' (' + sprache + '): fehlt'); continue; }
      if (muster.test(text)) f.push(k + ' (' + sprache + '): ' + text);
    }
  }
  return f;
}
test('[Signierte Antwort·Wortliste] kein Text des Signaturstands urteilt; „neuer Schlüssel“ ist neutral', () => {
  const V = ladeLesen().V;
  assert.deepEqual(wortBefunde(V, NIE_ANZEIGE), []);
  assert.ok(/neuer Schlüssel/.test(V.STRINGS.antwortSignaturZeileNeu) && /new key/.test(V.LESE_TEXTE_EN.antwortSignaturZeileNeu));
});
test('[Signierte Antwort·Wortliste·Rot-Beweis] ein „geprüft“ oder eine Warnung im Signaturstand wird gefunden', () => {
  const V = ladeLesen().V;
  const deutsch = Object.fromEntries(ANZEIGE_SCHLUESSEL.concat(GRUND_SCHLUESSEL).map((k) => [k, V.STRINGS[k]]));
  const gefaelscht = { LESE_TEXTE_EN: V.LESE_TEXTE_EN, STRINGS: Object.assign(deutsch,
    { antwortSignaturZeileNeu: 'Achtung: neuer Schlüssel · {abdruck}', antwortSignaturZeileBekannt: 'Signatur geprüft · {abdruck} · {datum}' }) };
  assert.deepEqual(wortBefunde(gefaelscht, NIE_ANZEIGE).map((z) => z.split(' ')[0]), ['antwortSignaturZeileBekannt', 'antwortSignaturZeileNeu']);
});

/* Der Sachsatz zur Domäne unsigniert: (Wortlaut der Gegenlesung, 15.10.2026), wörtlich gehalten. */
test('[Signierte Antwort·ohne Zertifikat] aud in der Domäne unsigniert: trägt den Sachsatz im genauen Wortlaut, signiert: nicht', async () => {
  const { V: L, document } = ladeLesen();
  assert.equal(L.STRINGS.antwortSignaturOhneZertifikat,
    'Die Anfrage trug kein Zertifikat; wer sie gestellt hat und wer die Antwort gelesen hat, ist nicht geprüft.');
  assert.equal(L.LESE_TEXTE_EN.antwortSignaturOhneZertifikat,
    'The request carried no certificate; who made it and who read the reply is not verified.');
  const empf = await empfangsPaar();
  const ohne = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz(), { aud: 'unsigniert:0014:' + STELLE }), edPaar()), empf.pub, { cty: 'JWT' }), empf.priv);
  assert.equal(ohne.signatur.ausZertifikat, false);
  L.renderAntwort(ohne.datensatz, {}, ohne.signatur);
  const html1 = document.getElementById('app').innerHTML;
  assert.ok(html1.includes('id="antwort-signatur-ohne-zertifikat">' + L.STRINGS.antwortSignaturOhneZertifikat + '<'));
  const mit = await oeffne(L, await verschluessele(L, signiere(nutzlast(datensatz()), edPaar()), empf.pub, { cty: 'JWT' }), empf.priv);
  assert.equal(mit.signatur.ausZertifikat, true);
  L.renderAntwort(mit.datensatz, {}, mit.signatur);
  assert.ok(!document.getElementById('app').innerHTML.includes('antwort-signatur-ohne-zertifikat'), 'bei signiert: steht der Satz nicht');
});
