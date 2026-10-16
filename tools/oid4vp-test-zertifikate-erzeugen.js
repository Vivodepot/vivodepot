#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   oid4vp-test-zertifikate-erzeugen.js — Test-Zertifikate für den OID4VP-Spike (O1, Wagen S1, 14.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Erzeugt mit `openssl` (3.4 oder neuer, wegen -not_before/-not_after) die Zertifikatsketten und zwei signierte
   Anfrage-JWS, gegen die tests/x509-leser.test.js den X.509-Leser des Produkts und tests/oid4vp-spike.test.js den JWS-Prüfer des Spikes
   fahren. NUR TEST: keines dieser Zertifikate ist je ein Vertrauensanker im Produkt (die Probe „nie im Produkt“ in
   tests/x509-leser.test.js hält, dass kein Bauweg den Ordner liest und keine Datei im Kern steht).

   Die privaten Schlüssel entstehen in einem Wegwerf-Verzeichnis und werden am Ende gelöscht — ins Ziel gehen nur
   Zertifikate (PEM) und die fertigen JWS. Die Schlüssel sind zufällig: ein zweiter Lauf erzeugt andere Bytes. Darum
   steht der Erzeuger nicht im Sammelbefehl; die Ausgabe ist eingefroren und eingecheckt.

   Was entsteht (jeder Name mit Vorsilbe „test-“; Gültigkeit fest datiert, die Probe prüft zum Zeitpunkt 2026-10-14T12:00:00Z):
     wurzel-p256.crt               Test-Wurzel, P-256, selbst signiert (ecdsa-with-SHA256), notAfter 2051 (GeneralizedTime)
     zwischen-p384.crt             Zwischen-CA, P-384, von der Wurzel (SHA-256), pathLen 0
     blatt-p256.crt                Blatt, P-256, von der Zwischen-CA (SHA-384), SAN dNSName verifier.test.invalid;
                                   jedes Blatt trägt certificatePolicies (Beispiel-OID 1.3.6.1.4.1.32473.3, dazu ETSI
                                   0.4.0.194118.1.2 zur Anzeige; seit 15.10.2026 Pflicht in _x509StellePruefen)
     wurzel-p521.crt / blatt-p521.crt   ES512-Kette wie das develop-Profil des Referenz-Verifiers (P-521, SHA-512)
     blatt-abgelaufen.crt          Blatt unter der Zwischen-CA, gültig 2025
     blatt-noch-nicht-gueltig.crt  Blatt unter der Zwischen-CA, gültig ab 2030
     ca-ohne-befugnis.crt          CA:TRUE, aber keyUsage ohne keyCertSign, von der Wurzel
     blatt-unter-ca-ohne-befugnis.crt
     fremd-wurzel-p256.crt / fremd-blatt-p256.crt   Kette unter einer Wurzel, die kein Anker ist
     blatt-kritisch-unbekannt.crt  Blatt mit einer unbekannten KRITISCHEN Erweiterung (OID unter der IANA-Beispiel-PEN 32473)
     ed25519-selbst.crt            selbst signiertes Ed25519-Zertifikat (nur Lesen; Prüfung von Ed25519-Kettensignaturen ist S3)
     anfrage-es256.jws             Anfrage-Objekt, signiert vom Blatt P-256, x5c = [Blatt, Zwischen-CA]
     anfrage-es512.jws             Anfrage-Objekt, signiert vom Blatt P-521, x5c = [Blatt]

   Aufruf: node tools/oid4vp-test-zertifikate-erzeugen.js [<zielverzeichnis>] [--openssl <pfad>]
           Vorgabe Ziel: tests/fixtures/oid4vp/   Vorgabe openssl: $OPENSSL, sonst `openssl` im PATH
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

function argumente(argv) {
  const a = { ziel: path.join(REPO, 'tests', 'fixtures', 'oid4vp'), openssl: process.env.OPENSSL || 'openssl' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--openssl') a.openssl = argv[++i];
    else a.ziel = path.resolve(argv[i]);
  }
  return a;
}

function ossl(bin, args, opts) {
  const r = spawnSync(bin, args, Object.assign({ encoding: 'buffer' }, opts || {}));
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('openssl ' + args.join(' ') + ' → Exit ' + r.status + ': ' + String(r.stderr));
  return r.stdout;
}

const ERWEITERUNGEN = `
[wurzel]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash

[zwischen]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid

[ohne_befugnis]
basicConstraints = critical,CA:TRUE
keyUsage = critical,digitalSignature
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid

[blatt]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
subjectAltName = DNS:verifier.test.invalid
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid
certificatePolicies = 1.3.6.1.4.1.32473.3, 0.4.0.194118.1.2

[blatt_kritisch_unbekannt]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
subjectAltName = DNS:verifier.test.invalid
certificatePolicies = 1.3.6.1.4.1.32473.3
1.3.6.1.4.1.32473.1 = critical,ASN1:NULL

[ed]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
`;

/* Ein DER-ECDSA-Sig-Value (SEQUENCE { r INTEGER, s INTEGER }) in r‖s fester Länge — für die JWS, die openssl nur als
   DER liefert. Bewusst klein: die Eingabe kommt aus openssl selbst, nicht von außen. */
function derZuRs(der, n) {
  let p = 0;
  const laenge = () => { let l = der[p++]; if (l & 0x80) { const k = l & 0x7f; l = 0; for (let i = 0; i < k; i++) l = l * 256 + der[p++]; } return l; };
  if (der[p++] !== 0x30) throw new Error('kein SEQUENCE');
  laenge();
  const out = Buffer.alloc(2 * n);
  for (let k = 0; k < 2; k++) {
    if (der[p++] !== 0x02) throw new Error('kein INTEGER');
    const l = laenge();
    let z = der.subarray(p, p + l); p += l;
    while (z.length > n && z[0] === 0) z = z.subarray(1);
    z.copy(out, k * n + n - z.length);
  }
  return out;
}
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const pemZuB64 = (pem) => pem.toString('utf8').replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');

function main() {
  const { ziel, openssl } = argumente(process.argv.slice(2));
  const version = ossl(openssl, ['version']).toString('utf8').trim();
  const m = /^OpenSSL (\d+)\.(\d+)/.exec(version);
  if (!m || Number(m[1]) < 3 || (Number(m[1]) === 3 && Number(m[2]) < 4)) {
    throw new Error('OpenSSL 3.4 oder neuer nötig (-not_before/-not_after), gefunden: ' + version + ' — Pfad mit --openssl angeben');
  }
  fs.mkdirSync(ziel, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oid4vp-zert-'));
  try {
    const cnf = path.join(tmp, 'erw.cnf');
    fs.writeFileSync(cnf, ERWEITERUNGEN);
    const schluessel = (name, kurve) => {
      const k = path.join(tmp, name + '.key');
      if (kurve === 'Ed25519') ossl(openssl, ['genpkey', '-algorithm', 'ED25519', '-out', k]);
      else ossl(openssl, ['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:' + kurve, '-pkeyopt', 'ec_param_enc:named_curve', '-out', k]);
      const pub = path.join(tmp, name + '.pub');
      ossl(openssl, ['pkey', '-in', k, '-pubout', '-out', pub]);
      return { k, pub };
    };
    let serial = 0x0d1000;
    // Ein Zertifikat: selbst signiert (aus === null) oder von `aus` ausgestellt.
    const zert = (name, cn, s, aus, digest, von, bis, abschnitt) => {
      const out = path.join(ziel, 'test-' + name + '.crt');   // jeder Dateiname trägt „test“ (Auflage 15.10.2026)
      const args = ['x509', '-new', '-subj', '/CN=' + cn + '/O=nur Test', '-set_serial', String(++serial),
        '-not_before', von, '-not_after', bis, '-extfile', cnf, '-extensions', abschnitt, '-out', out];
      if (digest) args.push('-' + digest);
      if (aus) args.push('-force_pubkey', s.pub, '-CA', aus.pem, '-CAkey', aus.k);
      else args.push('-key', s.k);
      ossl(openssl, args);
      return { pem: out, k: s.k, pub: s.pub };
    };

    const sWurzel = schluessel('wurzel', 'P-256');
    const wurzel = zert('wurzel-p256', 'OID4VP Test-Wurzel P-256', sWurzel, null, 'sha256', '20260101000000Z', '20510101000000Z', 'wurzel');
    const zwischen = zert('zwischen-p384', 'OID4VP Test-Zwischen P-384', schluessel('zwischen', 'P-384'), wurzel, 'sha256', '20260101000000Z', '20360101000000Z', 'zwischen');
    const blatt = zert('blatt-p256', 'verifier.test.invalid', schluessel('blatt', 'P-256'), zwischen, 'sha384', '20260101000000Z', '20280101000000Z', 'blatt');
    const wurzel521 = zert('wurzel-p521', 'OID4VP Test-Wurzel P-521', schluessel('wurzel521', 'P-521'), null, 'sha512', '20260101000000Z', '20360101000000Z', 'wurzel');
    const blatt521 = zert('blatt-p521', 'verifier.test.invalid', schluessel('blatt521', 'P-521'), wurzel521, 'sha512', '20260101000000Z', '20280101000000Z', 'blatt');
    zert('blatt-abgelaufen', 'verifier.test.invalid', schluessel('abgelaufen', 'P-256'), zwischen, 'sha384', '20250101000000Z', '20260101000000Z', 'blatt');
    zert('blatt-noch-nicht-gueltig', 'verifier.test.invalid', schluessel('nochnicht', 'P-256'), zwischen, 'sha384', '20300101000000Z', '20320101000000Z', 'blatt');
    const ohne = zert('ca-ohne-befugnis', 'OID4VP Test-CA ohne keyCertSign', schluessel('ohne', 'P-256'), wurzel, 'sha256', '20260101000000Z', '20360101000000Z', 'ohne_befugnis');
    zert('blatt-unter-ca-ohne-befugnis', 'verifier.test.invalid', schluessel('unterohne', 'P-256'), ohne, 'sha256', '20260101000000Z', '20280101000000Z', 'blatt');
    const fremd = zert('fremd-wurzel-p256', 'OID4VP Fremde Wurzel P-256', schluessel('fremd', 'P-256'), null, 'sha256', '20260101000000Z', '20360101000000Z', 'wurzel');
    zert('fremd-blatt-p256', 'verifier.test.invalid', schluessel('fremdblatt', 'P-256'), fremd, 'sha256', '20260101000000Z', '20280101000000Z', 'blatt');
    zert('blatt-kritisch-unbekannt', 'verifier.test.invalid', schluessel('kritisch', 'P-256'), zwischen, 'sha384', '20260101000000Z', '20280101000000Z', 'blatt_kritisch_unbekannt');
    zert('ed25519-selbst', 'OID4VP Test Ed25519', schluessel('ed', 'Ed25519'), null, null, '20260101000000Z', '20280101000000Z', 'ed');

    // Die Anfrage-Objekte: OID4VP 1.0, client_id mit Präfix x509_san_dns, signiert vom Blatt.
    const jws = (name, alg, digest, n, s, x5c) => {
      const kopf = { alg, typ: 'oauth-authz-req+jwt', x5c: x5c.map((p) => pemZuB64(fs.readFileSync(p))) };
      const nutzlast = {
        client_id: 'x509_san_dns:verifier.test.invalid', response_type: 'vp_token', response_mode: 'direct_post',
        response_uri: 'https://verifier.test.invalid/antwort', nonce: 'n-0S6_WzA2Mj', state: 'nur-test',
        dcql_query: { credentials: [{ id: 'probe', format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test'] } }] },
      };
      const eingabe = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(nutzlast));
      const ein = path.join(tmp, name + '.ein'), sig = path.join(tmp, name + '.sig');
      fs.writeFileSync(ein, eingabe);
      ossl(openssl, ['dgst', '-' + digest, '-sign', s.k, '-out', sig, ein]);
      fs.writeFileSync(path.join(ziel, 'test-' + name + '.jws'), eingabe + '.' + b64u(derZuRs(fs.readFileSync(sig), n)) + '\n');
    };
    jws('anfrage-es256', 'ES256', 'sha256', 32, blatt, [blatt.pem, zwischen.pem]);
    jws('anfrage-es512', 'ES512', 'sha512', 66, blatt521, [blatt521.pem]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  process.stdout.write('OID4VP-Test-Zertifikate geschrieben nach ' + path.relative(REPO, ziel) + '\n');
}

if (require.main === module) main();
module.exports = { derZuRs };
