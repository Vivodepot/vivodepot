'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   wrprc-pruefstoff.test.js — Prüfstoff für die Auswertung des Registrierungszertifikats einer Stelle (U2-ADR-501 Punkt 18)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Gegenstand: tests/lib/wrprc-test-material.js (WRPRC zur Laufzeit), tools/wrprc-register-messen.js (misst ein Register) und
   die eingefrorenen Fixtures aus tools/wrprc-test-register-erzeugen.js (tests/fixtures/wrprc/). Der Kern selbst wertet
   `verifier_info` noch nicht aus; das ist der folgende Kern-Wagen. Hier gilt:
   · ein WRPRC aus der Bibliothek trägt den Kopf nach ETSI TS 119 475 V1.2.1 Tabelle 5 (typ rc-wrp+jwt, alg, x5c), die Felder
     aus Tabelle 9 (credentials mit `claim`, purpose, intended_use_id) und ist mit dem Schlüssel aus x5c[0] signiert; x5c[0] ist
     vom Anker des Registrars ausgestellt;
   · das Zugangszertifikat der Stelle trägt den organizationIdentifier, gegen den `sub` gebunden wird, und der X.509-Leser des
     Kerns nimmt seine Kette an;
   · das Messwerkzeug misst die Fixtures genau so, wie der Erzeuger sie gebaut hat (Kopf von tools/wrprc-test-register-erzeugen.js);
   · Rot-Beweise: ein verändertes Signaturbyte gibt „ungueltig“, ein fremder Schlüssel ebenso, und ein fremdes `sub` zählt als
     „ungleich“;
   · in den Fixtures liegt kein privater Schlüssel.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const W = require('./lib/wrprc-test-material.js');
const Z = require('./lib/x509-test-zertifikate.js');
const M = require('../tools/wrprc-register-messen.js');

const FIX = path.join(__dirname, 'fixtures', 'wrprc');
let _K = null;
const K = () => (_K = _K || ladeKern({ zusatzBindungen: ['_x509StellePruefen'] }).V.__zusatz);
const ohneAusgabe = () => {};

test('[WRPRC·Bibliothek] Kopf, Felder nach ETSI TS 119 475 und Signatur gegen x5c[0], x5c[0] vom Anker des Registrars', () => {
  const reg = W.registrar();
  const jwt = W.wrprc(reg, W.nutzlast());
  const j = M.jwsTeile(jwt);
  assert.deepEqual([j.kopf.typ, j.kopf.alg, j.kopf.x5c.length], ['rc-wrp+jwt', 'ES256', 1]);
  for (const f of ['sub', 'name', 'purpose', 'credentials', 'intended_use_id', 'privacy_policy', 'iat', 'exp', 'status']) assert.ok(f in j.nutzlast, f);
  assert.ok(Array.isArray(j.nutzlast.credentials[0].claim) && !('claims' in j.nutzlast.credentials[0]), 'ETSI schreibt claim in der Einzahl');
  assert.ok(j.nutzlast.exp - j.nutzlast.iat <= 366 * 86400, 'exp höchstens 12 Monate nach iat (GEN-5.2.4-08)');
  assert.equal(M.signaturGegenX5c(j), 'gueltig');
  const blatt = new crypto.X509Certificate(Buffer.from(reg.x5c[0], 'base64'));
  const anker = new crypto.X509Certificate(Buffer.from(reg.anker[0]));
  assert.ok(blatt.verify(anker.publicKey), 'x5c[0] ist vom Anker ausgestellt');
  // Befund PRUEFSTOFF-CREDENTIAL-IDS (NIEDRIG, 05.11.2026): ETSI TS 119 472-2 RO-14 verbietet credential_ids in diesem Element.
  assert.deepEqual(W.verifierInfo(jwt), { format: 'registration_cert', data: jwt });
  assert.equal(W.verifierInfo.length, 1, 'keine zweite Pflicht-Angabe: credential_ids ist nicht vorgesehen');
  assert.equal(Buffer.from(W.verifierInfo(jwt, { base64url: true }).data, 'base64url').toString(), jwt, 'RO-16: base64url über das JWS');
});

test('[WRPRC·Bibliothek] Stelle: organizationIdentifier für die Bindung, Kette vom X.509-Leser des Kerns angenommen', async () => {
  const s = W.stelle({ kennung: 'NTRDE-TEST0042' });
  assert.equal(M.orgKennung(s.blatt), 'NTRDE-TEST0042');
  const r = await K()._x509StellePruefen(s.x5c, s.anker, Date.parse('2026-11-04T12:00:00Z'));
  assert.equal(r.gueltig, true, JSON.stringify(r.grund));
});

test('[WRPRC·Messen] die Fixtures werden so gemessen, wie der Erzeuger sie gebaut hat', async () => {
  let text = '';
  const code = await M.main([], { schreiben: (t) => { text += t; }, kern: K() });
  assert.equal(code, 0);
  const m = JSON.parse(text);
  assert.deepEqual({
    aussenSignatur: m.aussenSignatur, stellen: m.stellen, mitZugangszertifikat: m.mitZugangszertifikat, wrprc: m.wrprc,
    kopfTyp: m.kopfTyp, signatur: m.signatur, formate: m.formate, sdJwtAngabenFeld: m.sdJwtAngabenFeld, mitStatusliste: m.mitStatusliste,
    mitZwischenstelle: m.mitZwischenstelle, bindungSub: m.bindungSub, bindungAbdruck: m.bindungAbdruck, zugang: m.zugang,
  }, {
    aussenSignatur: 'gueltig', stellen: 3, mitZugangszertifikat: 2, wrprc: 5,
    kopfTyp: { 'rc-wrp+jwt': 5 }, signatur: { gueltig: 4, ungueltig: 1 }, formate: { 'dc+sd-jwt': 4, mso_mdoc: 1 },
    sdJwtAngabenFeld: { claim: 3, claims: 1 }, mitStatusliste: 4, mitZwischenstelle: 1,
    bindungSub: { gleich: 4, 'ohne-zugangszertifikat': 1 }, bindungAbdruck: { gleich: 3, ungleich: 1, fehlt: 1 },
    zugang: { gueltig: 1, 'cn-hostname-nicht-im-san': 1 },
  });
});

test('[WRPRC·Messen·Rot-Beweis] verändertes Signaturbyte, fremder Schlüssel und fremdes sub werden gezählt, nicht übergangen', async () => {
  const reg = W.registrar();
  const jwt = W.wrprc(reg, W.nutzlast());
  const t = jwt.split('.');
  const sig = Buffer.from(t[2], 'base64url'); sig[5] ^= 0x01;
  assert.equal(M.signaturGegenX5c(M.jwsTeile(t[0] + '.' + t[1] + '.' + sig.toString('base64url'))), 'ungueltig');
  assert.equal(M.signaturGegenX5c(M.jwsTeile(W.wrprc(reg, W.nutzlast(), { signierer: Z.schluessel('P-256') }))), 'ungueltig');
  assert.equal(M.signaturGegenX5c(M.jwsTeile(W.wrprc(reg, W.nutzlast(), { kopf: { x5c: [] } }))), 'nicht-pruefbar');
  // Ein Register mit einer Stelle, deren WRPRC ein fremdes sub trägt.
  const s = W.stelle();
  const pem = '-----BEGIN CERTIFICATE-----\n' + Buffer.from(s.blatt).toString('base64') + '\n-----END CERTIFICATE-----\n';
  const aussen = (daten) => Buffer.from('{"alg":"none"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ data: daten })).toString('base64url') + '.';
  const m = await M.messen({ wrpText: aussen([{ accessCertificate: { pem }, registrationCertificates: [{ jws: W.wrprc(reg, W.nutzlast({ sub: 'NTRDE-FREMD' })) }] }]),
    ketteText: '', zeitpunkt: '2026-11-04T12:00:00Z', kern: K() });
  assert.deepEqual(m.bindungSub, { ungleich: 1 });
  assert.equal(m.aussenSignatur, 'nicht-pruefbar');
});

test('[WRPRC·Messen] unlesbare Eingabe gibt Exit 2, ohne zu werfen', async () => {
  assert.equal(await M.main(['--wrp', path.join(FIX, 'gibt-es-nicht.jwt'), '--kette', path.join(FIX, 'test-register-kette.crt')], { schreiben: ohneAusgabe, kern: {} }), 2);
});

test('[WRPRC·Fixtures] kein privater Schlüssel in tests/fixtures/wrprc/, jeder Name trägt „test“', () => {
  for (const f of fs.readdirSync(FIX)) {
    assert.match(f, /^test-/);
    const roh = fs.readFileSync(path.join(FIX, f), 'utf8');
    // Ein JWS wird entpackt, auch die inneren WRPRC: ein Schlüssel stünde sonst nur base64-kodiert darin.
    const texte = [roh];
    if (f.endsWith('.jwt')) {
      const j = M.jwsTeile(roh);
      texte.push(JSON.stringify(j.kopf), JSON.stringify(j.nutzlast));
      for (const s of j.nutzlast.data) for (const rc of s.registrationCertificates || []) { const i = M.jwsTeile(rc.jws); texte.push(JSON.stringify(i.kopf), JSON.stringify(i.nutzlast)); }
    }
    for (const t of texte) assert.doesNotMatch(t, /PRIVATE KEY|"d"\s*:|"privat"/);
  }
});
