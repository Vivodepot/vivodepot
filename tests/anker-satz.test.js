'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Anker-Satz mit kid und Laufzeit (U2-ADR-486 Punkt 2, 07.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Statt des einen eingebauten Ankers prüfen Kern und Lese-App ein Zertifikat gegen den Anker, den sein
   kid nennt. Diese Probe hält jede Regel mit einem Rot-Beweis fest, in Kern UND Lese-App:
     - zwei Anker zugleich gültig, je nach kid;
     - unbekannter kid abgelehnt, ohne Rückfall;
     - ohne kid gilt nur der eine eingefrorene v2-Anker: ein kid-loses Zertifikat mit der Signatur
       eines anderen Ankers fällt;
     - widerrufener Anker abgelehnt, auch vor jedem Ablauf;
     - nach nurPruefenBis abgelehnt;
     - nach gueltigBis ausgestellt abgelehnt, bis dahin gültig;
     - der Algorithmus kommt aus dem Anker: ein abweichender Header fällt;
     - Altbestand: die eingebauten Basiszertifikate gehen unter dem Standard-Satz unverändert auf.
   Wegwerf-Schlüssel je Lauf; der echte Anker wird nur geprüft, nie zum Signieren gebraucht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');
const V2 = 'vivodepot-trust-authority-v2-22082026';
const JETZT = '2026-10-07T12:00:00Z';

async function wegwerfAnker() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: pub.kty, crv: pub.crv, x: pub.x, alg: 'EdDSA' }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function vc(issuanceDate) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate, expirationDate: '2030-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'probe-anbieter', anbieterTyp: 'institution', anbieterName: 'Probe' },
  };
}
async function signieren(K, priv, kid, issuanceDate) {
  const key = await K._jwsImportSignKey(priv);
  return K._signJWS(vc(issuanceDate || '2026-09-01T00:00:00Z'), key, kid ? { kid } : {});
}

let A, B;
async function anker() { if (!A) { A = await wegwerfAnker(); B = await wegwerfAnker(); } return { A, B }; }
function satz(a, b, zusatz) {
  return Object.freeze([
    Object.freeze({ kid: V2, alg: 'EdDSA', jwk: a.pub, gueltigAb: '2026-08-23', gueltigBis: null, nurPruefenBis: null }),
    Object.freeze(Object.assign({ kid: 'probe-anker-v3', alg: 'EdDSA', jwk: b.pub, gueltigAb: '2026-10-01', gueltigBis: null, nurPruefenBis: null }, zusatz || {})),
  ]);
}

const K = ladeKern().V;
const L = ladeLesen().V;
// Zwei Eigenschaften sind in U2-ADR-486 an Testtitel gebunden; sie stehen darum unten mit festem Titel je Träger.
const pruefungen = { zweiAnker: {}, nurPruefenBis: {} };
for (const [name, V] of [['Kern', K], ['Lese-App', L]]) {
  pruefungen.zweiAnker[name] = async () => {
    const { A, B } = await anker();
    const s = satz(A, B);
    const altes = await signieren(K, A.priv, V2);
    const neues = await signieren(K, B.priv, 'probe-anker-v3');
    const r1 = await V.verifiziereProviderCredential(altes, { ankerSatz: s, jetzt: JETZT });
    const r2 = await V.verifiziereProviderCredential(neues, { ankerSatz: s, jetzt: JETZT });
    assert.equal(r1.gueltig, true, r1.grund); assert.equal(r1.ankerKid, V2);
    assert.equal(r2.gueltig, true, r2.grund); assert.equal(r2.ankerKid, 'probe-anker-v3');
  };

  test('[Anker-Satz·' + name + '·Rot-Beweis] unbekannter kid abgelehnt, ohne Rückfall', async () => {
    const { A, B } = await anker();
    const r = await V.verifiziereProviderCredential(await signieren(K, A.priv, 'probe-anker-fremd'), { ankerSatz: satz(A, B), jetzt: JETZT });
    assert.equal(r.gueltig, false); assert.equal(r.grund, 'anker-unbekannt');
  });

  test('[Anker-Satz·' + name + '·Rot-Beweis] ohne kid gilt nur v2: ein kid-loses Zertifikat mit v3-Signatur fällt', async () => {
    const { A, B } = await anker();
    const s = satz(A, B);
    const mitV2 = await V.verifiziereProviderCredential(await signieren(K, A.priv, null), { ankerSatz: s, jetzt: JETZT });
    assert.equal(mitV2.gueltig, true, mitV2.grund); assert.equal(mitV2.ankerKid, V2);
    const mitV3 = await V.verifiziereProviderCredential(await signieren(K, B.priv, null), { ankerSatz: s, jetzt: JETZT });
    assert.equal(mitV3.gueltig, false); assert.equal(mitV3.grund, 'JWS: Signatur ungültig');
    const ohneV2 = await V.verifiziereProviderCredential(await signieren(K, B.priv, null), { ankerSatz: [s[1]], jetzt: JETZT });
    assert.equal(ohneV2.gueltig, false); assert.equal(ohneV2.grund, 'anker-ohne-kid-fehlt');
  });

  test('[Anker-Satz·' + name + '·Rot-Beweis] ein widerrufener Anker fällt, auch vor jedem Ablauf', async () => {
    const { A, B } = await anker();
    const z = await signieren(K, B.priv, 'probe-anker-v3');
    const r = await V.verifiziereProviderCredential(z, { ankerSatz: satz(A, B), ankerWiderrufen: ['probe-anker-v3'], jetzt: JETZT });
    assert.equal(r.gueltig, false); assert.equal(r.widerrufen, true); assert.equal(r.grund, 'anker-widerrufen');
    const kidlos = await V.verifiziereProviderCredential(await signieren(K, A.priv, null), { ankerSatz: satz(A, B), ankerWiderrufen: [V2], jetzt: JETZT });
    assert.equal(kidlos.gueltig, false, 'wird v2 widerrufen, fallen die kid-losen Zertifikate'); assert.equal(kidlos.grund, 'anker-widerrufen');
  });

  pruefungen.nurPruefenBis[name] = async () => {
    const { A, B } = await anker();
    const s = satz(A, B, { nurPruefenBis: '2027-01-01T00:00:00Z' });
    const z = await signieren(K, B.priv, 'probe-anker-v3');
    assert.equal((await V.verifiziereProviderCredential(z, { ankerSatz: s, jetzt: JETZT })).gueltig, true);
    const spaet = await V.verifiziereProviderCredential(z, { ankerSatz: s, jetzt: '2027-01-02T00:00:00Z' });
    assert.equal(spaet.gueltig, false); assert.equal(spaet.ankerAbgelaufen, true); assert.equal(spaet.grund, 'anker-nur-pruefend-abgelaufen');
    assert.notEqual(spaet.abgelaufen, true, 'kein Zertifikats-Ablauf, also keine Schonfrist');
  };

  test('[Anker-Satz·' + name + '·Rot-Beweis] nach gueltigBis ausgestellt abgelehnt, bis dahin gültig', async () => {
    const { A, B } = await anker();
    const s = satz(A, B, { gueltigBis: '2026-10-05T00:00:00Z' });
    const frueh = await V.verifiziereProviderCredential(await signieren(K, B.priv, 'probe-anker-v3', '2026-10-04T00:00:00Z'), { ankerSatz: s, jetzt: JETZT });
    assert.equal(frueh.gueltig, true, frueh.grund);
    const spaet = await V.verifiziereProviderCredential(await signieren(K, B.priv, 'probe-anker-v3', '2026-10-06T00:00:00Z'), { ankerSatz: s, jetzt: JETZT });
    assert.equal(spaet.gueltig, false); assert.equal(spaet.grund, 'anker-nach-ende-ausgestellt');
  });

  test('[Anker-Satz·' + name + '·Rot-Beweis] der Algorithmus kommt aus dem Anker: ein abweichender Header fällt vor der Signaturprüfung', async () => {
    const { A, B } = await anker();
    const s = satz(A, B, { alg: 'ES256' });
    const r = await V.verifiziereProviderCredential(await signieren(K, B.priv, 'probe-anker-v3'), { ankerSatz: s, jetzt: JETZT });
    assert.equal(r.gueltig, false); assert.equal(r.grund, 'anker-alg');
  });

  test('[Anker-Satz·' + name + '] Altbestand: die eingebauten Basiszertifikate gehen unter dem Standard-Satz auf, gegen v2', async () => {
    const certs = K.STANDARD_VORLAGEN_CERTS || {};
    const namen = Object.keys(certs);
    assert.ok(namen.length >= 2, 'Ausbeute: die eingebauten Basiszertifikate werden gefunden');
    for (const n of namen) {
      const jws = typeof certs[n] === 'string' ? certs[n] : (certs[n].certJws || certs[n].jws || certs[n].zertifikat);
      assert.equal(typeof jws, 'string', 'Form des Eintrags ' + n);
      const r = await V.verifiziereProviderCredential(jws, { jetzt: JETZT });
      assert.equal(r.gueltig, true, n + ': ' + r.grund);
      assert.equal(r.ankerKid, V2, n);
    }
  });
}

test('[Anker-Satz·Kern] zwei Anker zugleich gültig, je nach kid', () => pruefungen.zweiAnker.Kern());
test('[Anker-Satz·Lese-App] zwei Anker zugleich gültig, je nach kid', () => pruefungen.zweiAnker['Lese-App']());
test('[Anker-Satz·Kern·Rot-Beweis] nach nurPruefenBis abgelehnt, davor gültig', () => pruefungen.nurPruefenBis.Kern());
test('[Anker-Satz·Lese-App·Rot-Beweis] nach nurPruefenBis abgelehnt, davor gültig', () => pruefungen.nurPruefenBis['Lese-App']());

test('[Anker-Satz] der Standard-Satz trägt genau den v2-Anker, eingefroren; die Ausnahme ohne kid gilt nur ihm', () => {
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const t = fs.readFileSync(path.join(REPO, datei), 'utf8');
    assert.equal((t.match(/^const ANKER_OHNE_KID = 'vivodepot-trust-authority-v2-22082026';$/gm) || []).length, 1, datei + ': ANKER_OHNE_KID ist v2, einmal');
    const satzText = /^const ANKER_SATZ = Object\.freeze\(\[\n([\s\S]*?)\n\]\);$/m.exec(t);
    assert.ok(satzText, datei + ': ANKER_SATZ steht eingefroren');
    assert.equal((satzText[1].match(/kid: '/g) || []).length, 1, datei + ': heute genau ein Anker');
    assert.match(satzText[1], /jwk: TRUST_AUTHORITY_PUBLIC_JWK/);
    assert.match(t, /^const ANKER_WIDERRUFEN = Object\.freeze\(\[\]\);/m, datei + ': heute ist kein Anker widerrufen');
  }
});

/* Bedingung der Krypto-Gegenlesung (a): Ein Token mit unlesbarem Header geht an _ankerWaehlen vorbei in die Grundprüfung.
   Dieser Weg darf nie gueltig:true ergeben — gleich, wie die Nutzlast aussieht. */
test('[Anker-Satz·Rot-Beweis] ein unlesbarer Header oder ein Nicht-String ergibt nie gueltig:true', async () => {
  const b64u = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const nutzlast = b64u(JSON.stringify(vc('2026-09-01T00:00:00Z')));
  const faelle = [
    null, undefined, 42, {}, '', 'nur-ein-teil', 'a.b', '%%%.' + nutzlast + '.AAAA',
    b64u('{kein json') + '.' + nutzlast + '.AAAA', b64u('null') + '.' + nutzlast + '.AAAA', b64u('"text"') + '.' + nutzlast + '.AAAA',
    b64u('{}') + '.' + nutzlast + '.AAAA',
  ];
  for (const [name, V] of [['Kern', K], ['Lese-App', L]]) {
    for (const f of faelle) {
      const r = await V.verifiziereProviderCredential(f, { jetzt: JETZT }).catch(() => ({ gueltig: false, geworfen: true }));
      assert.notEqual(r.gueltig, true, name + ': ' + JSON.stringify(f));
    }
  }
});

/* Bedingung der Krypto-Gegenlesung (b): opts.ankerJwk, opts.ankerSatz und opts.ankerWiderrufen sind Test-Injektion und
   umgehen die Auswahl bzw. den eingebauten Satz. Im ausgelieferten Code setzt sie nur verifiziereProviderCredential selbst
   (beim Weiterreichen an die Ausstellerstufe); kein anderer Aufrufer nennt sie außerhalb von Kommentaren. */
const INJEKTION = /\b(ankerJwk|ankerSatz|ankerWiderrufen)\b/;
function codeZeilenMitInjektion(quelle) {
  let rest = quelle;
  for (const fn of ['verifiziereProviderCredential', '_ankerWaehlen']) {
    const m = new RegExp('^(async )?function ' + fn + '\\(', 'm').exec(rest);
    if (m) rest = rest.slice(0, m.index) + rest.slice(rest.indexOf('\n}\n', m.index) + 3);
  }
  let imBlock = false;
  const funde = [];
  for (const zeile of rest.split('\n')) {
    let z = zeile;
    if (imBlock) { const e = z.indexOf('*/'); if (e === -1) continue; z = z.slice(e + 2); imBlock = false; }
    z = z.replace(/\/\*.*?\*\//g, '');
    const a = z.indexOf('/*'); if (a !== -1) { imBlock = true; z = z.slice(0, a); }
    const k = z.indexOf('//'); if (k !== -1) z = z.slice(0, k);
    if (INJEKTION.test(z)) funde.push(zeile.trim());
  }
  return funde;
}
test('[Anker-Satz] kein Produktionsaufrufer setzt ankerJwk, ankerSatz oder ankerWiderrufen', () => {
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html']) {
    assert.deepEqual(codeZeilenMitInjektion(fs.readFileSync(path.join(REPO, datei), 'utf8')), [], datei);
  }
});
test('[Anker-Satz·Rot-Beweis] ein Aufrufer mit ankerJwk außerhalb der Prüffunktion wird gefunden, ein Kommentar nicht', () => {
  const rot = 'function x() {\n  return verifiziereProviderCredential(j, { ankerJwk: fremd });\n}\n// opts.ankerJwk im Kommentar\n/* ankerSatz im Block */\n';
  assert.equal(codeZeilenMitInjektion(rot).length, 1);
});
