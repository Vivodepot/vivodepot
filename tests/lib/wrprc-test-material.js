'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   wrprc-test-material.js — Registrierungszertifikate einer Stelle (WRPRC) zur Laufzeit, als Prüfstoff für U2-ADR-501 Punkt 18
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Baut, was die Auswertung von `verifier_info` braucht, ohne Schlüssel im Repo (Auflage 15.10.2026 wie
   tests/lib/x509-test-zertifikate.js):
   · registrar(): eine Test-Wurzel und darunter das Signierzertifikat eines Registrars; die Wurzel ist der Anker;
   · stelle(): Wurzel, Zwischen-CA und Zugangszertifikat einer Stelle mit organizationIdentifier, SAN und Richtlinie;
   · nutzlast(): die Nutzlast eines WRPRC in der Form nach ETSI TS 119 475 V1.2.1, Tabellen 7, 9 und 10, und so, wie ein
     öffentliches Sandbox-Register sie am 04.11.2026 ausgab (Messung: tools/wrprc-register-messen.js --register <url>);
   · wrprc(): das signierte JWT, Kopf { alg ES256, typ rc-wrp+jwt, x5c }, Signatur r‖s;
   · verifierInfo(), registrarDataset(): die Einträge für den Parameter `verifier_info` einer Anfrage (OpenID4VP 1.0 §5.1).
   Die privaten Schlüssel leben nur im Speicher des Laufs. Jeder Name trägt „Test“ oder „test.invalid“.
   FORMEN hält die gemessenen Formen eines `credentials`-Eintrags fest — von Hand nachgebaut, keine Bytes aus dem Register.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const Z = require('./x509-test-zertifikate.js');

const TYP = 'rc-wrp+jwt';
const FORMAT_VERIFIER_INFO = 'registration_cert';
const KENNUNG = 'NTRDE-TEST0001';
const STATUS_URI = 'https://registrar.test.invalid/status/wrprc';

const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const sekunden = (iso) => Math.floor(new Date(iso).getTime() / 1000);

/* Der Registrar: Wurzel (Anker) und Signierzertifikat (x5c[0]). Rückgabe { anker, x5c, schluessel, signierDer }. */
function registrar(o = {}) {
  const k = Z.kette({
    wurzelName: Z.name(Z.cn(o.wurzelName || 'Registrar Test-Wurzel')),
    blattInhaber: Z.name(Z.cn(o.name || 'Registrar Test-Signierung'), Z.org('Registrar nur Test')),
    blattErweiterungen: o.blattErweiterungen || [Z.erw.basis(false), Z.erw.ku('digitalSignature', 'nonRepudiation'), Z.erw.richtlinien(Z.BEISPIEL_RICHTLINIE)],
  });
  return { anker: k.anker, x5c: [k.x5c[0]], schluessel: k.blattSchluessel, signierDer: k.blatt };
}

/* Die Stelle: Zugangszertifikat mit organizationIdentifier `kennung`. Rückgabe wie Z.kette, dazu { kennung }. */
function stelle(o = {}) {
  const kennung = o.kennung || KENNUNG;
  const k = Z.kette({
    zwischen: {},
    blattInhaber: Z.name(Z.cn(o.cn || 'Stelle nur Test'), Z.org(o.org || 'Stelle nur Test'), Z.orgKennung(kennung)),
    blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid'), Z.erw.richtlinien(Z.BEISPIEL_RICHTLINIE)],
  });
  return Object.assign(k, { kennung });
}

/* Gemessene Formen eines `credentials`-Eintrags (ETSI TS 119 475 Tabelle 9: `claim` in der Einzahl, je `path`). */
const FORMEN = Object.freeze({
  // dc+sd-jwt mit vct_values und zwei Angaben, eine davon als Pfad mit zwei Gliedern.
  sdJwtAlter: Object.freeze({ format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test:1'] }, claim: [{ path: ['birthdate'] }, { path: ['age_equal_or_over', '18'] }] }),
  // ohne `claim`: „does not declare any specific attributes“ (B.2.9) — nach dem Zuschnitt vom 04.11.2026 ist dann nichts registriert.
  sdJwtOhneClaim: Object.freeze({ format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test:1'] } }),
  // ein null im Pfad (jedes Element) — gilt nach dem Zuschnitt nur für genau denselben deklarierten Pfad.
  sdJwtNullPfad: Object.freeze({ format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test:1'] }, claim: [{ path: ['nationalities', null] }] }),
  // mdoc: beantwortet Vivodepot nicht (U2-ADR-502 Punkt 8), kommt im Register aber am häufigsten vor.
  mdoc: Object.freeze({ format: 'mso_mdoc', meta: { doctype_value: 'org.beispiel.nur-test.1' }, claim: [{ path: ['org.beispiel.nur-test.1', 'family_name'] }] }),
});

/* Die Nutzlast eines WRPRC für einen Dienst; jedes Feld überschreibbar, `weg` streicht Felder. */
function nutzlast(o = {}) {
  const iat = o.iat === undefined ? sekunden('2026-10-01T00:00:00Z') : o.iat;
  const n = {
    sub: KENNUNG,
    name: 'Stelle nur Test',
    sub_ln: 'Stelle nur Test',
    country: 'DE',
    entitlements: ['https://uri.etsi.org/19475/Entitlement/Service_Provider'],
    privacy_policy: 'https://verifier.test.invalid/datenschutz',
    purpose: [{ lang: 'de', value: 'Nur Test: Alter prüfen' }],
    credentials: [JSON.parse(JSON.stringify(FORMEN.sdJwtAlter))],
    intended_use_id: 'test-nutzung-1',
    policy_id: ['0.4.0.19475.3.1'],
    iat,
    exp: o.exp === undefined ? iat + 180 * 86400 : o.exp,
    status: { status_list: { idx: 7, uri: STATUS_URI } },
  };
  for (const [k, v] of Object.entries(o)) if (k !== 'weg' && k !== 'iat' && k !== 'exp') n[k] = v;
  for (const k of o.weg || []) delete n[k];
  return n;
}

/* Das signierte WRPRC. `reg` aus registrar(); `kopf` ergänzt oder ersetzt Kopffelder; `signierer` statt reg.schluessel (Rot-Beweise). */
function wrprc(reg, n, o = {}) {
  const kopf = Object.assign({ alg: 'ES256', typ: TYP, x5c: reg.x5c.slice() }, o.kopf || {});
  const eingabe = b64u(kopf) + '.' + b64u(n);
  const sig = crypto.sign('sha256', Buffer.from(eingabe), { key: (o.signierer || reg.schluessel).privat, dsaEncoding: 'ieee-p1363' });
  return eingabe + '.' + Buffer.from(sig).toString('base64url');
}

/* Der Eintrag für `verifier_info` (OpenID4VP 1.0 §5.1; ETSI TS 119 472-2 V1.3.1 RO-14 bis RO-16): format „registration_cert“,
   kein credential_ids (RO-14). data ist das JWS selbst (so gibt es das gemessene Sandbox-Register aus) oder mit
   { base64url: true } base64url über das JWS (RO-16). */
function verifierInfo(jwt, o = {}) {
  return { format: FORMAT_VERIFIER_INFO, data: o.base64url ? Buffer.from(jwt).toString('base64url') : jwt };
}

/* Das Element `registrar_dataset` (ETSI TS 119 472-2 RO-01 bis RO-12), mit erfundenen Angaben. */
function registrarDataset(o = {}) {
  return { format: 'registrar_dataset', data: Object.assign({
    identifier: [{ type: 'http://data.europa.eu/eudi/id/EUID', identifier: KENNUNG }],
    srvDescription: [{ lang: 'de', content: 'Nur Test: Dienst der Stelle' }],
    registryURI: 'https://registrar.test.invalid/wrp',
    intendedUseIdentifier: 'test-nutzung-1',
    purpose: [{ lang: 'de', content: 'Nur Test: Alter prüfen' }],
    policyURI: 'https://verifier.test.invalid/datenschutz',
  }, o) };
}

module.exports = { TYP, FORMAT_VERIFIER_INFO, KENNUNG, STATUS_URI, FORMEN, registrar, stelle, nutzlast, wrprc, verifierInfo, registrarDataset, sekunden };
