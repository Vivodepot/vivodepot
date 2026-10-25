'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-test-zertifikate.js — Test-Zertifikate zur Laufzeit, für tests/x509-leser.test.js
   ────────────────────────────────────────────────────────────────────────────
   Auflage 15.10.2026: Test-CA-Schlüssel entstehen beim Testlauf, nicht im Repo. Node kann X.509 lesen, aber nicht ausstellen;
   darum baut dieser kleine Kodierer das TBSCertificate selbst (DER, minimal) und lässt node:crypto es mit ECDSA signieren.
   Die privaten Schlüssel leben nur im Speicher des Testlaufs. Gebraucht wird er für Fälle, die openssl nicht oder nur
   umständlich erzeugt: ein Aussteller-Name, der nur nach RFC 5280 gleich ist (anderer Stringtyp, andere Schreibung), ein Blatt
   ohne keyUsage, mit nonRepudiation allein, mit fremder EKU, mit organizationIdentifier, nameConstraints, policyConstraints,
   ohne certificatePolicies, eine CA mit leerem Namen oder fremder EKU.
   Unabhängig vom Leser bleibt die Probe durch die openssl-Fixtures (tests/fixtures/oid4vp/) und x509-limbo — dieser Kodierer
   schreibt nur, was die Fälle hier brauchen, und ist selbst kein Maßstab für DER.
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');

function tlv(tag, inhalt) {
  const b = Buffer.from(inhalt);
  const n = b.length;
  const kopf = n < 0x80 ? [tag, n] : n < 0x100 ? [tag, 0x81, n] : [tag, 0x82, n >> 8, n & 0xff];
  return Buffer.concat([Buffer.from(kopf), b]);
}
const folge = (...teile) => tlv(0x30, Buffer.concat(teile));
function oid(text) {
  const z = text.split('.').map(Number);
  const out = [40 * z[0] + z[1]];
  for (const w of z.slice(2)) {
    const g = [];
    let v = w;
    do { g.unshift(v & 0x7f); v = Math.floor(v / 128); } while (v > 0);
    for (let i = 0; i < g.length - 1; i++) g[i] |= 0x80;
    out.push(...g);
  }
  return tlv(0x06, out);
}
function zeit(iso) {
  const d = new Date(iso);
  const p = (x, n = 2) => String(x).padStart(n, '0');
  const rest = p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  const j = d.getUTCFullYear();
  return j < 2050 ? tlv(0x17, Buffer.from(p(j % 100) + rest)) : tlv(0x18, Buffer.from(p(j, 4) + rest));
}
const SIG_OID = { sha256: '1.2.840.10045.4.3.2', sha384: '1.2.840.10045.4.3.3', sha512: '1.2.840.10045.4.3.4' };
const KURVE_NODE = { 'P-256': 'prime256v1', 'P-384': 'secp384r1', 'P-521': 'secp521r1' };

/* Ein Name aus Attributen, jedes in eigenem RDN: [{ oid, wert, typ }] mit typ 'utf8' (Vorgabe), 'printable' oder 'bmp'
   (BMPString, UTF-16BE — für Proben einer Kodierung, die der Leser nicht annimmt). */
function name(...attribute) {
  const wert = (a) => (a.typ === 'bmp' ? tlv(0x1e, Buffer.from(a.wert, 'utf16le').swap16()) : tlv(a.typ === 'printable' ? 0x13 : 0x0c, Buffer.from(a.wert, 'utf8')));
  return folge(...attribute.map((a) => tlv(0x31, folge(oid(a.oid), wert(a)))));
}
const cn = (wert, typ) => ({ oid: '2.5.4.3', wert, typ });
const orgKennung = (wert, typ) => ({ oid: '2.5.4.97', wert, typ });
const org = (wert, typ) => ({ oid: '2.5.4.10', wert, typ });

// Erweiterungen: { oid, kritisch, wert (DER des Inhalts) }.
const KU_BITS = { digitalSignature: 0, nonRepudiation: 1, keyEncipherment: 2, keyAgreement: 4, keyCertSign: 5, cRLSign: 6 };
const erw = {
  basis: (ca, pfad) => ({ oid: '2.5.29.19', kritisch: true, wert: folge(...(ca ? [tlv(0x01, [0xff])] : []), ...(pfad === undefined ? [] : [tlv(0x02, [pfad])])) }),
  ku: (...namen) => {
    let b = 0;
    for (const n of namen) b |= 0x80 >> KU_BITS[n];
    let frei = 0;
    while (frei < 7 && !(b & (1 << frei))) frei++;
    return { oid: '2.5.29.15', kritisch: true, wert: tlv(0x03, [frei, b]) };
  },
  san: (...dns) => ({ oid: '2.5.29.17', kritisch: false, wert: folge(...dns.map((d) => tlv(0x82, Buffer.from(d)))) }),
  eku: (...oids) => ({ oid: '2.5.29.37', kritisch: false, wert: folge(...oids.map(oid)) }),
  // certificatePolicies: je OID eine PolicyInformation ohne Qualifier; nicht kritisch (kritisch weist der Leser ab).
  richtlinien: (...oids) => ({ oid: '2.5.29.32', kritisch: false, wert: folge(...oids.map((o) => folge(oid(o)))) }),
  // nameConstraints: permittedSubtrees mit einem dNSName — nicht kritisch, damit allein die Art zählt.
  namensbeschraenkung: () => ({ oid: '2.5.29.30', kritisch: false, wert: folge(tlv(0xa0, folge(tlv(0x82, Buffer.from('test.invalid'))))) }),
  // policyConstraints: requireExplicitPolicy 0.
  richtlinie: () => ({ oid: '2.5.29.36', kritisch: false, wert: folge(tlv(0x80, [0x00])) }),
  roh: (o, kritisch, wert) => ({ oid: o, kritisch, wert }),
};
function erweiterungen(liste) {
  return tlv(0xa3, folge(...liste.map((e) => folge(oid(e.oid), ...(e.kritisch ? [tlv(0x01, [0xff])] : []), tlv(0x04, e.wert)))));
}

function schluessel(kurve = 'P-256') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: KURVE_NODE[kurve] });
  return { privat: privateKey, spki: publicKey.export({ type: 'spki', format: 'der' }), kurve };
}

// Beispiel-OID unter der IANA-Beispiel-PEN 32473 — jedes gültige Laufzeit-Blatt trägt sie (Pflicht in _x509StellePruefen).
const BEISPIEL_RICHTLINIE = '1.3.6.1.4.1.32473.3';
let _seriell = 0x7e57000;
/* Ein Zertifikat. `signierer` = { privat } des Ausstellers; `hash` 'sha256' | 'sha384' | 'sha512'; `seriell` = Inhaltsbytes des
   INTEGER (Vorgabe: fortlaufend). Rückgabe DER (Buffer). */
function zertifikat({ aussteller, inhaber, schluessel: s, signierer, hash = 'sha256', von = '2026-01-01T00:00:00Z', bis = '2028-01-01T00:00:00Z', erweiterungen: liste = [], seriell }) {
  const alg = folge(oid(SIG_OID[hash]));
  const tbs = folge(
    tlv(0xa0, tlv(0x02, [0x02])),
    tlv(0x02, seriell ? Buffer.from(seriell) : Buffer.from((++_seriell).toString(16).padStart(8, '0'), 'hex')),
    alg, aussteller, folge(zeit(von), zeit(bis)), inhaber, Buffer.from(s.spki),
    ...(liste.length ? [erweiterungen(liste)] : []),
  );
  const sig = crypto.sign(hash, tbs, { key: signierer.privat, dsaEncoding: 'der' });
  return folge(tbs, alg, tlv(0x03, Buffer.concat([Buffer.from([0]), sig])));
}

/* Eine Wurzel und ein Blatt darunter, auf Wunsch mit einer Zwischen-CA dazwischen (o.zwischen = { name?, erweiterungen? });
   jede Angabe überschreibbar. Rückgabe { wurzel, zwischen?, blatt (DER), x5c (base64-Liste, Blatt zuerst), anker (Liste der DER),
   blattSchluessel ({ privat, spki, kurve } des Blatts, nur im Speicher; damit signiert tests/oid4vp-anfrage-pruefen.test.js
   ein Anfrage-Objekt) }. */
function kette(o = {}) {
  const sW = schluessel(o.wurzelKurve || 'P-256');
  const wurzelName = o.wurzelName || name(cn('X509 Test-Wurzel'));
  const wurzel = zertifikat({
    aussteller: wurzelName, inhaber: wurzelName, schluessel: sW, signierer: sW, von: '2026-01-01T00:00:00Z', bis: '2036-01-01T00:00:00Z',
    erweiterungen: o.wurzelErweiterungen || [erw.basis(true), erw.ku('keyCertSign', 'cRLSign')],
  });
  let ausstellerName = wurzelName, ausstellerSchluessel = sW, zwischen = null;
  if (o.zwischen) {
    const sZ = schluessel('P-256');
    const zName = o.zwischen.name || name(cn('X509 Test-Zwischen'));
    zwischen = zertifikat({
      aussteller: wurzelName, inhaber: zName, schluessel: sZ, signierer: sW, von: '2026-01-01T00:00:00Z', bis: '2034-01-01T00:00:00Z',
      erweiterungen: o.zwischen.erweiterungen || [erw.basis(true, 0), erw.ku('keyCertSign')],
    });
    ausstellerName = zName; ausstellerSchluessel = sZ;
  }
  const sB = schluessel(o.blattKurve || 'P-256');
  const blatt = zertifikat({
    aussteller: o.blattAussteller || ausstellerName, inhaber: o.blattInhaber || name(cn('verifier.test.invalid')), schluessel: sB,
    signierer: ausstellerSchluessel, seriell: o.blattSeriell,
    erweiterungen: o.blattErweiterungen || [erw.basis(false), erw.ku('digitalSignature'), erw.san('verifier.test.invalid'), erw.richtlinien(BEISPIEL_RICHTLINIE)],
  });
  const x5c = [blatt, ...(zwischen ? [zwischen] : [])].map((d) => d.toString('base64'));
  return { wurzel, zwischen, blatt, x5c, anker: [new Uint8Array(wurzel)], blattSchluessel: sB };
}

module.exports = { tlv, folge, oid, name, cn, org, orgKennung, erw, schluessel, zertifikat, kette, BEISPIEL_RICHTLINIE };
