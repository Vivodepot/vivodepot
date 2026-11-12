#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   wrprc-test-register-erzeugen.js — die Fixtures für tools/wrprc-register-messen.js (Prüfstoff U2-ADR-501 Punkt 18)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Schreibt nach tests/fixtures/wrprc/ eine Antwort im Stil einer TS5-Lese-API (GET /wrp: ein vom Register signiertes JWS mit
   `data` = Liste der Stellen) und die Kette der Access-CA (PEM). Alles ist erfunden und trägt „Test“ oder „test.invalid“;
   die Formen folgen ETSI TS 119 475 V1.2.1 und dem, was ein öffentliches Sandbox-Register am 04.11.2026 ausgab — nachgebaut,
   keine Bytes übernommen. Die privaten Schlüssel leben nur im Speicher dieses Laufs (Auflage 15.10.2026); ein zweiter Lauf
   erzeugt andere Bytes. Darum steht der Erzeuger nicht im Sammelbefehl; die Ausgabe ist eingefroren und eingecheckt.

   Was entsteht (Zeitpunkt der Messung 2026-11-04T12:00:00Z, alle Zertifikate gültig 2026-01-01 bis 2028-01-01):
     Stelle 1  Zugangszertifikat gültig (organizationIdentifier NTRDE-TEST0001); drei WRPRC: dc+sd-jwt (claim), mso_mdoc,
               und eines mit fremder Signatur (x5c des Registrars, signiert von einem anderen Schlüssel)
     Stelle 2  Zugangszertifikat mit einem Rechnernamen im CN, der nicht im SAN steht (der Leser weist das ab); ein WRPRC
               dc+sd-jwt mit `claims` statt `claim` und einem falschen Abdruck in wrpac_binding
     Stelle 3  ohne Zugangszertifikat; ein WRPRC über eine Zwischenstelle (act.sub), ohne Statusliste

     node tools/wrprc-test-register-erzeugen.js [<zielverzeichnis>]      Vorgabe: tests/fixtures/wrprc/
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Z = require('../tests/lib/x509-test-zertifikate.js');
const W = require('../tests/lib/wrprc-test-material.js');

const REPO = path.join(__dirname, '..');
const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const pem = (der) => '-----BEGIN CERTIFICATE-----\n' + Buffer.from(der).toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';

function erzeugen(ziel) {
  // Access-CA (der Anker der Zugangszertifikate) und ihre Blätter, ohne Zwischen-CA wie in der gemessenen Sandbox.
  const sCa = Z.schluessel('P-256');
  const caName = Z.name(Z.cn('Access-CA nur Test'), Z.org('Register nur Test'));
  const ca = Z.zertifikat({ aussteller: caName, inhaber: caName, schluessel: sCa, signierer: sCa, bis: '2036-01-01T00:00:00Z',
    erweiterungen: [Z.erw.basis(true), Z.erw.ku('keyCertSign', 'cRLSign')] });
  const zugang = (cn, kennung) => Z.zertifikat({ aussteller: caName, inhaber: Z.name(Z.cn(cn), Z.org('Stelle nur Test'), Z.orgKennung(kennung)),
    schluessel: Z.schluessel('P-256'), signierer: sCa,
    erweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature', 'nonRepudiation'), Z.erw.san('verifier.test.invalid'), Z.erw.richtlinien(Z.BEISPIEL_RICHTLINIE)] });
  const reg = W.registrar();
  const fremd = Z.schluessel('P-256');
  const sha = (der) => crypto.createHash('sha256').update(der).digest('hex');

  const z1 = zugang('Stelle nur Test', 'NTRDE-TEST0001');
  const z2 = zugang('abweichend.test.invalid', 'NTRDE-TEST0002');
  const bindung = (der, kennung) => ({ wrpac_binding: { certificate_sha256: der ? sha(der) : '0'.repeat(64), wrp_identifier: kennung } });
  const rc = (n, o) => ({ format: 'application/jwt', transport: 'by-value', status: 'valid', jws: W.wrprc(reg, n, o) });

  const stellen = [
    { identifier: 'DE-TEST.0001', legalName: 'Stelle nur Test 1', accessCertificate: { pem: pem(z1) }, registrationCertificates: [
      rc(W.nutzlast(Object.assign({ sub: 'NTRDE-TEST0001' }, bindung(z1, 'NTRDE-TEST0001')))),
      rc(W.nutzlast(Object.assign({ sub: 'NTRDE-TEST0001', credentials: [JSON.parse(JSON.stringify(W.FORMEN.mdoc))], intended_use_id: 'test-nutzung-2' }, bindung(z1, 'NTRDE-TEST0001')))),
      rc(W.nutzlast(Object.assign({ sub: 'NTRDE-TEST0001', intended_use_id: 'test-nutzung-3' }, bindung(z1, 'NTRDE-TEST0001'))), { signierer: fremd }),
    ] },
    { identifier: 'DE-TEST.0002', legalName: 'Stelle nur Test 2', accessCertificate: { pem: pem(z2) }, registrationCertificates: [
      rc(W.nutzlast(Object.assign({ sub: 'NTRDE-TEST0002', credentials: [{ format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test:1'] }, claims: [{ path: ['birthdate'] }] }] }, bindung(null, 'NTRDE-TEST0002')))),
    ] },
    { identifier: 'DE-TEST.0003', legalName: 'Stelle nur Test 3', registrationCertificates: [
      rc(W.nutzlast({ sub: 'NTRDE-TEST0003', act: { sub: 'NTRDE-TEST0009' }, weg: ['status'] })),
    ] },
  ];
  const kopf = { alg: 'ES256', typ: 'JWT', x5c: reg.x5c.slice() };
  const nutzlast = { iss: 'https://registrar.test.invalid', iat: W.sekunden('2026-11-04T11:00:00Z'), data: stellen, pagination: { page: 1, pages: 1 } };
  const eingabe = b64u(kopf) + '.' + b64u(nutzlast);
  const sig = crypto.sign('sha256', Buffer.from(eingabe), { key: reg.schluessel.privat, dsaEncoding: 'ieee-p1363' });
  fs.mkdirSync(ziel, { recursive: true });
  fs.writeFileSync(path.join(ziel, 'test-register-wrp.jwt'), eingabe + '.' + Buffer.from(sig).toString('base64url') + '\n');
  fs.writeFileSync(path.join(ziel, 'test-register-kette.crt'), pem(ca));
}

if (require.main === module) {
  const ziel = process.argv[2] ? path.resolve(process.argv[2]) : path.join(REPO, 'tests', 'fixtures', 'wrprc');
  erzeugen(ziel);
  process.stdout.write('WRPRC-Fixtures geschrieben nach ' + path.relative(REPO, ziel) + '\n');
}
module.exports = { erzeugen };
