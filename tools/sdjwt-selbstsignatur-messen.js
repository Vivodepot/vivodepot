#!/usr/bin/env node
'use strict';
/* Messwerkzeug zu U2-ADR-457: die kompakte SD-JWT-Ausgabe, selbst signiert mit Ed25519. Geprüft werden die Normvektoren
   (RFC 8037 Anhang A.3/A.4, RFC 9901 §5.1), die Ausgabe des Kerns gegen den jwk im eigenen Kopf und — nur mit
   `--jose <pfad>` — gegen die unabhängige Bibliothek `jose` in beide Richtungen.
   `jose` kommt NICHT ins Repo (U2-ADR-434): der Pfad zeigt auf ein Paket außerhalb (etwa ein `npm i jose` im Scratchpad).
   Ohne Pfad läuft nur, was ohne Fremdmodul geht; so prüft es die Suite (tests/sdjwt-selbstsignatur-messen.test.js).

   Ein SD-JWT-VC-Prüfer nach draft-ietf-oauth-sd-jwt-vc lehnt die Ausgabe trotzdem ab, weil der Schlüssel keiner Stelle
   zugeordnet ist (weder https-iss noch x5c). Das Werkzeug meldet das als erwartet, nicht als Fehler.

   Aufruf:
     node tools/sdjwt-selbstsignatur-messen.js                    Vektoren und Ausgabe, Ergebnis als JSON
     node tools/sdjwt-selbstsignatur-messen.js --jose <pfad>      dazu die Gegenprobe mit jose (Paketordner) */
const path = require('node:path');
// Die Ableitung des öffentlichen Schlüssels, wie der Kern sie hineinreicht (eingebettete noble-ed25519, U2-ADR-457 Nachtrag v865).
const OEFFENTLICH_AUS_SEED = (seed) => require('../tests/helfer/noble-ed25519.js').harnessBibliothek().getPublicKey(seed);
const { ladeKern, webcrypto } = require('../tests/load-kern.js');

const RFC8037 = {
  x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
  thumbprint: 'kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k',
  jws: 'eyJhbGciOiJFZERTQSJ9.RXhhbXBsZSBvZiBFZDI1NTE5IHNpZ25pbmc.hgyY0il_MGCjP0JzlnLWG1PPOt7-09PGcvMg3AIbQR6dWbhijcNR4ki4iylGjg5BhVsPt9g7sVvpAr_MuM0KAg',
};
const RFC9901 = { disclosure: 'WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd', digest: 'jsu9yVulwQQlhFlM_3JlzMaSFzglhQG0DpfayQwLUK4' };

function argumente(argv) {
  const a = { jose: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--jose' && argv[i + 1]) a.jose = argv[++i];
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  return a;
}

async function messen(opt) {
  const V = ladeKern().V;
  const s = webcrypto.subtle;
  const raus = {};
  raus.thumbprintVektor = (await V.jwkThumbprintOkp({ kty: 'OKP', crv: 'Ed25519', x: RFC8037.x })) === RFC8037.thumbprint;
  const [vh, vp, vs] = RFC8037.jws.split('.');
  const vk = await s.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: RFC8037.x }, { name: 'Ed25519' }, false, ['verify']);
  raus.signaturVektor = await s.verify({ name: 'Ed25519' }, vk, Buffer.from(vs, 'base64url'), new TextEncoder().encode(vh + '.' + vp));
  raus.digestVektor = (await V._eudiwDigest(RFC9901.disclosure)) === RFC9901.digest;

  // Eine Ausgabe des Kerns mit einem Probe-Schlüssel (keine Sitzung nötig).
  const master = await V.importMasterHkdfKey(new Uint8Array(32).fill(5).buffer);
  const sig = await V.deriveHalterSignaturV4(master, new Uint8Array(32).fill(6), 'messung', OEFFENTLICH_AUS_SEED);
  const vc = { vct: 'urn:vivodepot:identitaet', iss: 'urn:vivodepot:selbstauskunft', iat: 1767225600, claims: { given_name: 'Erika', family_name: 'Beispiel' } };
  const res = await V.eudiwSdJwtVcSerialisieren(vc, { signatur: async () => sig });
  raus.kernPrueftSelbst = (await V.sdJwtSelbstSignaturPruefen(res.serialisierung)).gueltig;
  raus.ausstellerVertrauen = 'nicht gegeben (selbst ausgestellt, weder https-iss noch x5c) — erwartet';

  if (opt.jose) {
    // eslint-disable-next-line import/no-dynamic-require
    const jose = require(path.join(path.resolve(opt.jose), 'node_modules', 'jose'));
    const jwt = res.serialisierung.split('~')[0];
    const kopf = jose.decodeProtectedHeader(jwt);
    const pruef = await jose.compactVerify(jwt, await jose.importJWK(kopf.jwk, 'Ed25519'), { algorithms: ['Ed25519'] });
    const nutzlast = JSON.parse(new TextDecoder().decode(pruef.payload));
    // Und andersherum: ein von jose signiertes SD-JWT in unserer Form liest der Kern als gültige Selbst-Signatur.
    const { publicKey, privateKey } = await jose.generateKeyPair('Ed25519', { extractable: true });
    const pubJwk = await jose.exportJWK(publicKey);
    const fremdNutzlast = { vct: vc.vct, iss: vc.iss, iat: vc.iat, _sd: [RFC9901.digest], _sd_alg: 'sha-256', cnf: { jwk: pubJwk } };
    const vonJose = await new jose.CompactSign(new TextEncoder().encode(JSON.stringify(fremdNutzlast)))
      .setProtectedHeader({ alg: 'Ed25519', typ: 'dc+sd-jwt', jwk: pubJwk }).sign(privateKey);
    raus.jose = {
      version: (() => { try { return require(path.join(path.resolve(opt.jose), 'node_modules', 'jose', 'package.json')).version; } catch (e) { return null; } })(),
      liestUnsereSignatur: pruef.protectedHeader.alg === 'Ed25519',
      cnfGleichKopf: JSON.stringify(nutzlast.cnf.jwk) === JSON.stringify(kopf.jwk),
      wirLesenJose: (await V.sdJwtSelbstSignaturPruefen(vonJose + '~' + RFC9901.disclosure + '~')).gueltig,
    };
  }
  return raus;
}

async function main(argv) {
  const r = await messen(argumente(argv));
  process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  const ok = r.thumbprintVektor && r.signaturVektor && r.digestVektor && r.kernPrueftSelbst
    && (!r.jose || (r.jose.liestUnsereSignatur && r.jose.cnfGleichKopf && r.jose.wirLesenJose));
  return ok ? 0 : 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(String(e && e.message || e) + '\n'); process.exitCode = 2; });
}
module.exports = { messen, argumente, main };
