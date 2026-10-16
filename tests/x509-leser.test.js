'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-leser.test.js — der X.509-Leser des Produkts (Spanne X509-LESER in vivodepot.html, Entscheidung 15.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gegenstand: DER mit festen Grenzen, X.509 v3 (nur die nötige Teilmenge), die x5c-Kette gegen eine Ankerliste, die Bindung
   client_id ↔ Blatt, die eine ECDSA-Prüfstelle und die Kurvenfreigabe je Engine. Die Spanne wird NICHT geschnitten.
   Daneben: tests/x509-limbo.test.js (Fremdvektoren der Pfadprüfung), tests/oid4vp-spike.test.js (der Spike-Rest).

   WAS GILT, je mit eigenem Fall:
   · DER: unbestimmte Länge, Länge hinter dem Ende, nicht minimale Länge, Hochtag-Form, Restbytes, Länge über 16 KiB,
     Längenfeld über zwei Bytes, Verschachtelung über zehn Ebenen sind abgelehnt; gekürzte und tief verschachtelte Eingaben
     enden schnell (Zeit- und Tiefengrenze);
   · X.509: unbekannte kritische Erweiterung, nameConstraints, policyConstraints und kritische certificatePolicies sind
     „nicht-pruefbar";
   · Namen werden byteweise verkettet: ein Name, der nur nach RFC 5280 gleich ist, findet seinen Aussteller nicht;
   · Blatt: keyUsage Pflicht, mit digitalSignature oder nonRepudiation; eine EKU nur aus der erlaubten Menge (vorläufig);
   · eine kritische EKU ist „eku-kritisch“, eine Seriennummer über 20 Oktette „seriennummer-zu-lang“ (0 wird angenommen);
   · Anker und CA ohne keyCertSign stellen nichts aus; eine CA mit leerem Namen ist „name-leer", eine Zwischen-CA mit fremder EKU
     „eku-fremd", ein Anker mit irgendeiner EKU „anker-eku" (vorläufig);
   · der Eingang für die Stelle (_x509StellePruefen) verlangt am Blatt certificatePolicies („policy-fehlt");
   · client_id: x509_san_dns exakt gegen einen dNSName, x509_hash gegen SHA-256 des Blatts plus organizationIdentifier;
   · P-384/P-521 unter WebKit „kurve-nicht-gemessen";
   · genau eine WebCrypto-verify-Stelle in der Spanne; außerhalb ruft niemand _x509KettePruefen direkt; die Spanne übersteht den
     Schnitt; keine Test-Datei landet im Produkt.

   FIXTURES: tests/fixtures/oid4vp/ (openssl, eingefroren; tools/oid4vp-test-zertifikate-erzeugen.js) und Zertifikate, die
   tests/lib/x509-test-zertifikate.js zur Laufzeit ausstellt (Schlüssel nur im Speicher). Wycheproof: siehe Kopf von
   tests/fixtures/oid4vp/README.md.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { ladeKern } = require('./load-kern.js');
const { _entwicklerleisteSchneiden, ENTWICKLERLEISTE_MARKEN } = require('../tools/lib/produkt-text-erzeugen.js');
const Z = require('./lib/x509-test-zertifikate.js');
const LIMBO = require('./lib/x509-limbo-lauf.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const FIX = path.join(__dirname, 'fixtures', 'oid4vp');
const VEKTOREN = path.join(__dirname, 'konformitaet', 'vectors');
const JETZT = '2026-10-14T12:00:00Z';
const NAMEN = ['_derLesen', '_derGanz', '_derStrukturPruefen', '_x509Lesen', '_ecdsaDerZuRs', '_x509EcdsaPruefen', '_x509KettePruefen',
  '_x509ClientIdBinden', '_x509KurvePruefen', '_x509StellePruefen'];
// WebKit erkennt der Kern an einer Fähigkeit (_webkitEngine: CSS.supports('font', '-apple-system-body')), nicht am Namen.
const CSS_WEBKIT = { supports: (p, v) => p === 'font' && v === '-apple-system-body' };
const CSS_ANDERE = { supports: () => false };

let _K = null;
const K = () => (_K = _K || ladeKern({ zusatzBindungen: NAMEN }).V.__zusatz);

const pemB64 = (name) => fs.readFileSync(path.join(FIX, 'test-' + name + '.crt'), 'utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
const der = (name) => new Uint8Array(Buffer.from(pemB64(name), 'base64'));
const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const kette = (...namen) => namen.map(pemB64);
const anker = (...namen) => namen.map(der);
function tlv(tag, inhalt) {
  const n = inhalt.length;
  const kopf = n < 0x80 ? [tag, n] : n < 0x100 ? [tag, 0x81, n] : [tag, 0x82, n >> 8, n & 0xff];
  return new Uint8Array([...kopf, ...inhalt]);
}
const u8 = (...b) => new Uint8Array(b);
const nein = (grund, detail) => (detail ? { gueltig: false, grund, detail } : { gueltig: false, grund });

/* ── DER-Leser ──────────────────────────────────────────────────────────── */

test('[X509·DER·Gegenprobe] Kurz- und Langform werden gelesen, die Langform ab 128 Bytes', () => {
  const kurz = K()._derLesen(u8(0x04, 0x02, 0xaa, 0xbb), 0);
  assert.deepEqual({ ...kurz }, { tag: 0x04, kopfLaenge: 2, laenge: 2, inhaltStart: 2, ende: 4 });
  const lang = K()._derLesen(tlv(0x04, new Array(128).fill(1)), 0);
  assert.deepEqual({ ...lang }, { tag: 0x04, kopfLaenge: 3, laenge: 128, inhaltStart: 3, ende: 131 });
  assert.equal(K()._derGanz(tlv(0x30, [0x05, 0x00])).ende, 4);
});

test('[X509·DER·unbestimmte Länge] 0x80 als Länge ist abgelehnt', () => {
  assert.throws(() => K()._derLesen(u8(0x30, 0x80, 0x05, 0x00, 0x00, 0x00), 0), /der-unbestimmte-laenge/);
});

test('[X509·DER·Länge hinter dem Ende] Inhalt oder Längenbytes über das Pufferende hinaus sind abgelehnt', () => {
  assert.throws(() => K()._derLesen(u8(0x04, 0x05, 0x01, 0x02), 0), /der-laenge-hinter-ende/);
  assert.throws(() => K()._derLesen(u8(0x04, 0x82, 0x01), 0), /der-laenge-hinter-ende/);
  assert.throws(() => K()._derGanz(u8(0x30, 0x03, 0x04, 0x05, 0x01, 0x02, 0x03, 0x04)), /der-laenge-hinter-ende|der-restbytes/);
  assert.throws(() => K()._derLesen(u8(0x30, 0x03, 0x04, 0x05, 0x01, 0x02, 0x03, 0x04), 2, 5), /der-laenge-hinter-ende/);
});

test('[X509·DER·nicht minimale Länge] Langform für eine kurze Länge und führende 0x00 sind abgelehnt', () => {
  assert.throws(() => K()._derLesen(u8(0x04, 0x81, 0x05, 1, 2, 3, 4, 5), 0), /der-laenge-nicht-minimal/);
  assert.throws(() => K()._derLesen(new Uint8Array([0x04, 0x82, 0x00, 0x85, ...new Array(0x85).fill(0)]), 0), /der-laenge-nicht-minimal/);
});

test('[X509·DER·fremder Tag] die Hochtag-Form (Tag & 0x1f === 0x1f) ist abgelehnt', () => {
  assert.throws(() => K()._derLesen(u8(0x1f, 0x81, 0x01, 0x00), 0), /der-fremder-tag/);
  assert.throws(() => K()._derLesen(u8(0xbf, 0x20, 0x00), 0), /der-fremder-tag/);
});

test('[X509·DER·Restbytes] Bytes hinter dem obersten Element sind abgelehnt — auch hinter einem Zertifikat', () => {
  assert.throws(() => K()._derGanz(u8(0x05, 0x00, 0x00)), /der-restbytes/);
  assert.throws(() => K()._x509Lesen(new Uint8Array([...der('blatt-p256'), 0x00])), /der-restbytes/);
});

test('[X509·DER·Grenzen] Längenfeld über zwei Bytes, Länge über 16 KiB und Eingabe über 16 KiB sind abgelehnt', () => {
  assert.throws(() => K()._derLesen(u8(0x04, 0x83, 0x01, 0x00, 0x00), 0), /der-laenge-zu-gross/);
  const lang = new Uint8Array(16384); lang.set([0x04, 0x82, 0x40, 0x01]);   // Länge 16385
  assert.throws(() => K()._derLesen(lang, 0), /der-laenge-zu-gross/);
  assert.throws(() => K()._derLesen(new Uint8Array(16385), 0), /der-zu-gross/);
  assert.throws(() => K()._x509Lesen(new Uint8Array(1024 * 1024)), /der-zu-gross/);
});

function verschachtelt(tiefe) {
  let innen = Buffer.alloc(0);
  for (let i = 0; i < tiefe; i++) {
    const n = innen.length;
    const kopf = n < 0x80 ? [0x30, n] : n < 0x100 ? [0x30, 0x81, n] : [0x30, 0x82, n >> 8, n & 0xff];
    innen = Buffer.concat([Buffer.from(kopf), innen]);
  }
  return new Uint8Array(innen);
}

test('[X509·DER·Tiefe] zehn Ebenen werden gelesen, elf sind der-zu-tief', () => {
  assert.equal(K()._derStrukturPruefen(verschachtelt(10)).tag, 0x30);
  assert.throws(() => K()._derStrukturPruefen(verschachtelt(11)), /der-zu-tief/);
});

/* Auflage (e) zur Entscheidung 15.10.2026: nichts hängt. Jede gekürzte Fassung eines echten Zertifikats und eine Verschachtelung bis an die
   Größengrenze enden mit einem Grund-Code, je Satz in weniger als 200 ms. */
test('[X509·DER·nichts hängt] gekürzte und tief verschachtelte Eingaben enden schnell mit Grund-Code', () => {
  const z = der('blatt-p256');
  let t0 = performance.now();
  for (let n = 0; n < z.length; n++) assert.throws(() => K()._x509Lesen(z.subarray(0, n)), /^Error: (der|x509)-/, 'gekürzt auf ' + n);
  const gekuerzt = performance.now() - t0;
  assert.ok(gekuerzt < 200, 'alle ' + z.length + ' gekürzten Fassungen in ' + gekuerzt.toFixed(1) + ' ms');
  const tief = verschachtelt(4000);
  assert.ok(tief.length <= 16384, 'Vorbedingung: innerhalb der Größengrenze (' + tief.length + ')');
  t0 = performance.now();
  assert.throws(() => K()._x509Lesen(tief), /der-zu-tief/);
  assert.throws(() => K()._derStrukturPruefen(tief), /der-zu-tief/);
  for (let n = 1; n < 200; n++) assert.throws(() => K()._x509Lesen(tief.subarray(0, tief.length - n)));
  const zeit = performance.now() - t0;
  assert.ok(zeit < 200, 'tiefe Verschachtelung in ' + zeit.toFixed(1) + ' ms');
});

/* ── X.509-Leser ────────────────────────────────────────────────────────── */

test('[X509·Zertifikat·Gegenprobe] Blatt, Zwischen-CA und Wurzel tragen die erwarteten Felder', () => {
  const blatt = K()._x509Lesen(der('blatt-p256'));
  const zwischen = K()._x509Lesen(der('zwischen-p384'));
  const wurzel = K()._x509Lesen(der('wurzel-p256'));
  assert.equal(blatt.signaturAlgorithmus.name, 'ecdsa-with-SHA384');
  assert.equal(blatt.kurve, 'P-256');
  assert.deepEqual([...blatt.dnsNamen], ['verifier.test.invalid']);
  assert.equal(blatt.ca, false);
  assert.equal(blatt.keyCertSign, false);
  assert.equal(blatt.digitalSignature, true);
  assert.equal(blatt.eku, null);
  assert.deepEqual([...blatt.richtlinien], ['1.3.6.1.4.1.32473.3', '0.4.0.194118.1.2']);
  assert.deepEqual([...blatt.etsiRichtlinien], ['0.4.0.194118.1.2'], 'ETSI-Richtlinie erkannt, zur Anzeige');
  assert.deepEqual(Buffer.from(blatt.roh), Buffer.from(der('blatt-p256')), 'roh ist das ganze Zertifikat');
  assert.deepEqual(Buffer.from(blatt.aussteller), Buffer.from(zwischen.inhaber), 'Aussteller des Blatts = Inhaber der Zwischen-CA, byteweise');
  assert.equal(blatt.nichtVor, Date.UTC(2026, 0, 1));
  assert.equal(zwischen.kurve, 'P-384');
  assert.equal(zwischen.ca, true);
  assert.equal(zwischen.keyCertSign, true);
  assert.equal(zwischen.pfadLaenge, 0);
  assert.equal(wurzel.signaturAlgorithmus.name, 'ecdsa-with-SHA256');
  assert.equal(wurzel.nichtNach, Date.UTC(2051, 0, 1), 'notAfter 2051 steht als GeneralizedTime');
  assert.equal(wurzel.pfadLaenge, null);
  assert.equal(K()._x509Lesen(der('blatt-p521')).kurve, 'P-521');
});

test('[X509·Zertifikat·Ed25519] ein Ed25519-Zertifikat wird gelesen', () => {
  const z = K()._x509Lesen(der('ed25519-selbst'));
  assert.equal(z.signaturAlgorithmus.name, 'Ed25519');
  assert.equal(z.kurve, 'Ed25519');
  assert.equal(z.signaturWert.length, 64);
});

test('[X509·Zertifikat·kritisch unbekannt] eine unbekannte kritische Erweiterung ist abgelehnt, in der Kette nicht-pruefbar', async () => {
  assert.throws(() => K()._x509Lesen(der('blatt-kritisch-unbekannt')), /x509-kritisch-unbekannt/);
  const r = await K()._x509KettePruefen(kette('blatt-kritisch-unbekannt', 'zwischen-p384'), anker('wurzel-p256'), JETZT);
  assert.deepEqual({ ...r }, nein('nicht-pruefbar', 'x509-kritisch-unbekannt'));
});

test('[X509·Zertifikat·nicht prüfbar] nameConstraints, policyConstraints und kritische certificatePolicies sind abgewiesen — auch im Anker', async () => {
  const basis = [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid')];
  const faelle = [
    [Z.erw.namensbeschraenkung(), 'x509-namensbeschraenkung'],
    [Z.erw.richtlinie(), 'x509-richtlinie'],
    [Z.erw.roh('2.5.29.32', true, Z.folge(Z.folge(Z.oid('2.5.29.32.0')))), 'x509-richtlinie'],
  ];
  for (const [e, code] of faelle) {
    const k = Z.kette({ blattErweiterungen: [...basis, e] });
    assert.throws(() => K()._x509Lesen(k.blatt), new RegExp(code));
    assert.deepEqual({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) }, nein('nicht-pruefbar', code), code + ' am Blatt');
    const imAnker = Z.kette({ wurzelErweiterungen: [Z.erw.basis(true), Z.erw.ku('keyCertSign'), e] });
    assert.deepEqual({ ...(await K()._x509KettePruefen(imAnker.x5c, imAnker.anker, JETZT)) }, nein('nicht-pruefbar', code), code + ' im Anker');
  }
  // Gegenprobe: eine nicht kritische certificatePolicies ist nur Auskunft
  const auskunft = Z.kette({ blattErweiterungen: [...basis, Z.erw.roh('2.5.29.32', false, Z.folge(Z.folge(Z.oid('2.5.29.32.0'))))] });
  assert.equal((await K()._x509KettePruefen(auskunft.x5c, auskunft.anker, JETZT)).gueltig, true);
});

/* ── DER-ECDSA → r‖s ────────────────────────────────────────────────────── */

const zahl = (...b) => tlv(0x02, b);
const sig = (...teile) => tlv(0x30, teile.flatMap((t) => [...t]));

test('[X509·ECDSA·Gegenprobe] r mit Vorzeichen-Null und kurzes s werden auf 32 Bytes je Hälfte gebracht', () => {
  const r = [0x00, 0x80, ...new Array(31).fill(0x11)];
  const rs = K()._ecdsaDerZuRs(sig(zahl(...r), zahl(0x01)), 'P-256');
  assert.equal(rs.length, 64);
  assert.deepEqual([...rs.subarray(0, 32)], r.slice(1));
  assert.deepEqual([...rs.subarray(32)], [...new Array(31).fill(0), 0x01]);
  assert.equal(K()._ecdsaDerZuRs(sig(zahl(0x00, 0xff, ...new Array(65).fill(1)), zahl(0x02)), 'P-521').length, 132);
});

test('[X509·ECDSA·Form] Zahl der Elemente, Vorzeichen, Minimalität, Größe, Tag, Restbytes und Kurve', () => {
  const R = (s, k = 'P-256') => () => K()._ecdsaDerZuRs(s, k);
  assert.throws(R(sig(zahl(0x01))), /ecdsa-zwei-zahlen/);
  assert.throws(R(sig(zahl(0x01), zahl(0x02), zahl(0x03))), /ecdsa-zwei-zahlen/);
  assert.throws(R(sig(zahl(0x80, 0x01), zahl(0x01))), /ecdsa-zahl-negativ/);
  assert.throws(R(sig(zahl(0x00, 0x01), zahl(0x01))), /ecdsa-zahl-nicht-minimal/);
  assert.throws(R(sig(zahl(0x01, ...new Array(32).fill(0x11)), zahl(0x01))), /ecdsa-zahl-zu-gross/);
  assert.throws(R(sig(zahl(0x01), zahl(0x01, ...new Array(66).fill(0x11))), 'P-521'), /ecdsa-zahl-zu-gross/);
  assert.throws(R(sig(tlv(0x02, []), zahl(0x01))), /ecdsa-zahl-leer/);
  assert.throws(R(sig(zahl(0x01), tlv(0x04, [0x01]))), /ecdsa-keine-zahl/);
  assert.throws(R(tlv(0x31, [...zahl(0x01), ...zahl(0x01)])), /ecdsa-keine-folge/);
  assert.throws(R(new Uint8Array([...sig(zahl(0x01), zahl(0x01)), 0x00])), /der-restbytes/);
  assert.throws(R(sig(zahl(0x01), zahl(0x01)), 'secp256k1'), /ecdsa-kurve-unbekannt/);
});

/* Wycheproof: jeder Vektor, keine Auswahl. valid muss tragen, invalid muss fallen (Umwandlung ODER Prüfung).
   „acceptable" führen beide Dateien heute nicht; käme einer hinzu, ist die Probe rot, bis er hier einzeln entschieden ist. */
const WYCHEPROOF = [
  { datei: 'ecdsa_secp256r1_sha256_test.json', sha256: '182db4f3e230f6f9fa9f800d2a614dede30284b8e8438bbfe1171905402e9332', kurve: 'P-256', hash: 'SHA-256', valid: 174, invalid: 310 },
  { datei: 'ecdsa_secp521r1_sha512_test.json', sha256: '0fa3bb09a2319242253028b53d555fb8ec2081d891271321205cdaeabb3eef3e', kurve: 'P-521', hash: 'SHA-512', valid: 232, invalid: 310 },
];
for (const w of WYCHEPROOF) {
  test(`[X509·ECDSA·Wycheproof] ${w.datei}: jeder gültige Vektor trägt, jeder ungültige fällt`, async () => {
    const roh = fs.readFileSync(path.join(VEKTOREN, w.datei));
    assert.equal(crypto.createHash('sha256').update(roh).digest('hex'), w.sha256, 'Vektordatei unverändert');
    const d = JSON.parse(roh.toString('utf8'));
    const zaehler = { valid: 0, invalid: 0 };
    const falsch = [];
    for (const g of d.testGroups) {
      assert.equal(g.type, 'EcdsaVerify');
      assert.equal(g.sha, w.hash);
      const spki = new Uint8Array(Buffer.from(g.publicKeyDer, 'hex'));
      for (const t of g.tests) {
        assert.ok(t.result === 'valid' || t.result === 'invalid', 'tcId ' + t.tcId + ': Ergebnis „' + t.result + '" ist nicht entschieden');
        let ok = false;
        try {
          const rs = K()._ecdsaDerZuRs(new Uint8Array(Buffer.from(t.sig, 'hex')), w.kurve);
          ok = await K()._x509EcdsaPruefen(spki, w.kurve, w.hash, new Uint8Array(Buffer.from(t.msg, 'hex')), rs);
        } catch (_) { ok = false; }
        zaehler[t.result]++;
        if (ok !== (t.result === 'valid')) falsch.push(t.tcId + ' (' + t.result + ', ' + t.comment + ')');
      }
    }
    assert.deepEqual(falsch, []);
    assert.equal(zaehler.valid + zaehler.invalid, d.numberOfTests, 'alle Vektoren geprüft');
    assert.deepEqual(zaehler, { valid: w.valid, invalid: w.invalid });
  });
}

/* ── x5c-Kette ──────────────────────────────────────────────────────────── */

test('[X509·Kette·Gegenprobe] Blatt → Zwischen-CA → Anker trägt, ebenso die P-521-Kette; das Blatt kommt gelesen zurück', async () => {
  const r = await K()._x509KettePruefen(kette('blatt-p256', 'zwischen-p384'), anker('wurzel-p256'), JETZT);
  assert.equal(r.gueltig, true, r.grund);
  assert.deepEqual([...r.blatt.dnsNamen], ['verifier.test.invalid']);
  const r521 = await K()._x509KettePruefen(kette('blatt-p521'), anker('wurzel-p521'), JETZT);
  assert.equal(r521.gueltig, true, r521.grund);
  assert.equal(r521.blatt.kurve, 'P-521');
});

test('[X509·Kette·Anker in x5c] ein mitgeschickter Anker wird geduldet, begründet aber kein Vertrauen', async () => {
  const geduldet = await K()._x509KettePruefen(kette('blatt-p256', 'zwischen-p384', 'wurzel-p256'), anker('wurzel-p256'), JETZT);
  assert.equal(geduldet.gueltig, true, geduldet.grund);
  const nurAnwesend = await K()._x509KettePruefen(kette('blatt-p256', 'zwischen-p384', 'wurzel-p256'), anker('fremd-wurzel-p256'), JETZT);
  assert.deepEqual({ ...nurAnwesend }, nein('zertifikat-unbekannt'));
});

test('[X509·Kette·Grund-Codes] zertifikat-unbekannt, signatur-ungueltig, zertifikat-zeit, zertifikat-form, kette-zu-lang, ca-ohne-befugnis', async () => {
  const P = (x5c, a = anker('wurzel-p256'), zeit = JETZT) => K()._x509KettePruefen(x5c, a, zeit).then((r) => ({ ...r }));
  assert.deepEqual(await P(kette('fremd-blatt-p256', 'fremd-wurzel-p256')), nein('zertifikat-unbekannt'));
  const gekippt = der('blatt-p256'); gekippt[gekippt.length - 1] ^= 0x01;
  assert.deepEqual(await P([b64(gekippt), pemB64('zwischen-p384')]), nein('signatur-ungueltig'));
  for (const name of ['blatt-abgelaufen', 'blatt-noch-nicht-gueltig']) assert.deepEqual(await P(kette(name, 'zwischen-p384')), nein('zertifikat-zeit'), name);
  assert.deepEqual(await P(kette('blatt-p256', 'zwischen-p384'), anker('wurzel-p256'), '2029-01-01T00:00:00Z'), nein('zertifikat-zeit'));
  assert.equal((await P(['kein base64!', pemB64('zwischen-p384')])).grund, 'zertifikat-form');
  assert.deepEqual(await P([]), nein('zertifikat-form'));
  assert.deepEqual(await P(kette('blatt-p256', 'zwischen-p384', 'zwischen-p384', 'zwischen-p384')), nein('kette-zu-lang'));
  assert.deepEqual(await P(kette('blatt-p256', 'zwischen-p384', 'zwischen-p384', 'zwischen-p384', 'wurzel-p256')), nein('kette-zu-lang'));
  assert.deepEqual(await P(kette('blatt-unter-ca-ohne-befugnis', 'ca-ohne-befugnis')), nein('ca-ohne-befugnis'));
});

test('[X509·Kette·Anker ohne keyCertSign] ein Anker ohne keyCertSign oder ohne CA:TRUE stellt nichts aus — streng', async () => {
  const ohneKcs = Z.kette({ wurzelErweiterungen: [Z.erw.basis(true), Z.erw.ku('digitalSignature', 'cRLSign')] });
  assert.deepEqual({ ...(await K()._x509KettePruefen(ohneKcs.x5c, ohneKcs.anker, JETZT)) }, nein('ca-ohne-befugnis'));
  const ohneCa = Z.kette({ wurzelErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature', 'cRLSign')] });
  assert.deepEqual({ ...(await K()._x509KettePruefen(ohneCa.x5c, ohneCa.anker, JETZT)) }, nein('ca-ohne-befugnis'));
  const ohneKu = Z.kette({ wurzelErweiterungen: [Z.erw.basis(true)] });
  assert.deepEqual({ ...(await K()._x509KettePruefen(ohneKu.x5c, ohneKu.anker, JETZT)) }, nein('ca-ohne-befugnis'));
  const gegen = Z.kette();
  assert.equal((await K()._x509KettePruefen(gegen.x5c, gegen.anker, JETZT)).gueltig, true, 'Gegenprobe: mit keyCertSign trägt die Kette');
});

/* Byte-gleiche Namensverkettung, benannt: RFC 5280 §7.1 ließe die Namen unten als gleich gelten (anderer Stringtyp, andere
   Schreibung, anderer Leerraum). Der Leser vergleicht DER-Bytes — keiner davon findet seinen Aussteller. */
test('[X509·Kette·Namen] ein Name, der nur nach RFC 5280 gleich ist, findet seinen Aussteller nicht', async () => {
  const wurzelName = Z.name(Z.cn('X509 Test-Wurzel', 'printable'));
  for (const [was, aussteller] of [
    ['UTF8String statt PrintableString', Z.name(Z.cn('X509 Test-Wurzel', 'utf8'))],
    ['andere Groß/Kleinschreibung', Z.name(Z.cn('x509 test-wurzel', 'printable'))],
    ['doppelter Leerraum', Z.name(Z.cn('X509  Test-Wurzel', 'printable'))],
  ]) {
    const k = Z.kette({ wurzelName, blattAussteller: aussteller });
    assert.deepEqual({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) }, nein('zertifikat-unbekannt'), was);
  }
  const gleich = Z.kette({ wurzelName, blattAussteller: Z.name(Z.cn('X509 Test-Wurzel', 'printable')) });
  assert.equal((await K()._x509KettePruefen(gleich.x5c, gleich.anker, JETZT)).gueltig, true, 'Gegenprobe: byte-gleich trägt');
});

/* ── Blatt: keyUsage und EKU ────────────────────────────────────────────── */

test('[X509·Blatt·keyUsage] fehlt keyUsage oder trägt sie weder digitalSignature noch nonRepudiation, ist das Blatt abgewiesen', async () => {
  const mit = (...erw) => Z.kette({ blattErweiterungen: [Z.erw.basis(false), ...erw, Z.erw.san('verifier.test.invalid')] });
  const P = async (k) => ({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) });
  assert.deepEqual(await P(mit()), nein('blatt-zweck', 'keyusage-fehlt'));
  assert.deepEqual(await P(mit(Z.erw.ku('keyEncipherment', 'keyAgreement'))), nein('blatt-zweck', 'keyusage-ohne-signatur'));
  assert.equal((await P(mit(Z.erw.ku('nonRepudiation')))).gueltig, true, 'Gegenprobe: nonRepudiation allein trägt');
  assert.equal((await P(mit(Z.erw.ku('digitalSignature')))).gueltig, true, 'Gegenprobe: digitalSignature allein trägt');
});

test('[X509·Blatt·EKU] eine fremde EKU ist eku-fremd; keine EKU und jede erlaubte tragen (vorläufig, zur Entscheidung vorgelegt 15.10.)', async () => {
  const mit = (...erw) => Z.kette({ blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid'), ...erw] });
  const P = async (k) => ({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) });
  assert.deepEqual(await P(mit(Z.erw.eku('1.3.6.1.5.5.7.3.3'))), nein('eku-fremd'), 'codeSigning');
  assert.deepEqual(await P(mit(Z.erw.eku('1.3.6.1.5.5.7.3.4', '1.3.6.1.4.1.32473.2'))), nein('eku-fremd'), 'emailProtection und eine Beispiel-OID');
  assert.equal((await P(mit())).gueltig, true, 'Gegenprobe: ohne EKU trägt das Blatt');
  for (const o of ['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.2', '1.0.18013.5.1.6', '2.5.29.37.0']) {
    assert.equal((await P(mit(Z.erw.eku('1.3.6.1.5.5.7.3.3', o)))).gueltig, true, 'erlaubt: ' + o);
  }
});

test('[X509·CA·EKU] eine Zwischen-CA mit EKU ohne erlaubten Zweck ist eku-fremd; ohne EKU oder mit erlaubter trägt sie', async () => {
  const P = async (k) => ({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) });
  const mitEku = (...oids) => Z.kette({ zwischen: { erweiterungen: [Z.erw.basis(true, 0), Z.erw.ku('keyCertSign'), ...(oids.length ? [Z.erw.eku(...oids)] : [])] } });
  assert.deepEqual(await P(mitEku('1.3.6.1.5.5.7.3.3')), nein('eku-fremd'), 'codeSigning an der Zwischen-CA');
  assert.equal((await P(mitEku())).gueltig, true, 'Gegenprobe: Zwischen-CA ohne EKU');
  assert.equal((await P(mitEku('1.3.6.1.5.5.7.3.1'))).gueltig, true, 'Gegenprobe: Zwischen-CA mit serverAuth (erlaubte Menge)');
});

test('[X509·Anker·EKU] ein Anker mit irgendeiner EKU ist anker-eku (vorläufig abgewiesen, Lesung offen 15.10.)', async () => {
  const P = async (k) => ({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) });
  const mitEku = (...oids) => Z.kette({ wurzelErweiterungen: [Z.erw.basis(true), Z.erw.ku('keyCertSign'), ...(oids.length ? [Z.erw.eku(...oids)] : [])] });
  assert.deepEqual(await P(mitEku('1.3.6.1.5.5.7.3.1')), nein('anker-eku'), 'serverAuth am Anker');
  assert.deepEqual(await P(mitEku('1.3.6.1.5.5.7.3.3')), nein('anker-eku'), 'codeSigning am Anker');
  assert.deepEqual(await P(Z.kette({ zwischen: {}, wurzelErweiterungen: [Z.erw.basis(true), Z.erw.ku('keyCertSign'), Z.erw.eku('2.5.29.37.0')] })),
    nein('anker-eku'), 'anyEKU am Anker über einer Zwischen-CA');
  assert.equal((await P(mitEku())).gueltig, true, 'Gegenprobe: Anker ohne EKU');
});

test('[X509·CA·Name leer] eine CA mit leerem Inhaber-Namen stellt nichts aus — name-leer, auch wenn der Name des Blatts passt', async () => {
  const leer = Z.folge();
  // Ein leerer Inhaber verlangt einen kritischen SAN (sonst schon „san-bei-leerem-subject", Probe unten) — hier steht er.
  const k = Z.kette({ wurzelName: leer, blattAussteller: leer,
    wurzelErweiterungen: [Z.erw.basis(true), Z.erw.ku('keyCertSign'), Z.erw.roh('2.5.29.17', true, Z.folge(Z.tlv(0x82, Buffer.from('ca.test.invalid'))))] });
  assert.deepEqual({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) }, nein('name-leer'));
  const gegen = Z.kette();
  assert.equal((await K()._x509KettePruefen(gegen.x5c, gegen.anker, JETZT)).gueltig, true, 'Gegenprobe: mit Namen trägt die Kette');
});

test('[X509·Stelle·certificatePolicies] ohne Richtlinie am Blatt policy-fehlt; mit irgendeiner trägt es, ETSI-OIDs kommen zur Anzeige zurück', async () => {
  const basis = [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid')];
  const ohne = Z.kette({ blattErweiterungen: basis });
  assert.deepEqual({ ...(await K()._x509StellePruefen(ohne.x5c, ohne.anker, JETZT)) }, nein('policy-fehlt'));
  assert.equal((await K()._x509KettePruefen(ohne.x5c, ohne.anker, JETZT)).gueltig, true, 'die Pfadprüfung allein verlangt keine Richtlinie');
  const beispiel = Z.kette();
  const r = await K()._x509StellePruefen(beispiel.x5c, beispiel.anker, JETZT);
  assert.equal(r.gueltig, true, 'Gegenprobe: irgendeine Richtlinie genügt (' + r.grund + ')');
  assert.deepEqual([...r.blatt.etsiRichtlinien], []);
  const etsi = Z.kette({ blattErweiterungen: [...basis, Z.erw.richtlinien('0.4.0.194118.1.1', '0.4.0.194118.1.4')] });
  const re = await K()._x509StellePruefen(etsi.x5c, etsi.anker, JETZT);
  assert.equal(re.gueltig, true, re.grund);
  assert.deepEqual([...re.blatt.etsiRichtlinien], ['0.4.0.194118.1.1', '0.4.0.194118.1.4']);
  const kritisch = Z.kette({ blattErweiterungen: [...basis, Z.erw.roh('2.5.29.32', true, Z.folge(Z.folge(Z.oid('0.4.0.194118.1.1'))))] });
  assert.deepEqual({ ...(await K()._x509StellePruefen(kritisch.x5c, kritisch.anker, JETZT)) }, nein('nicht-pruefbar', 'x509-richtlinie'), 'kritisch bleibt abgewiesen');
  const fix = await K()._x509StellePruefen(kette('blatt-p256', 'zwischen-p384'), anker('wurzel-p256'), JETZT);
  assert.equal(fix.gueltig, true, 'die openssl-Fixture trägt eine Richtlinie: ' + fix.grund);
});

test('[X509·EKU kritisch] eine als kritisch markierte EKU ist eku-kritisch — am Blatt wie am Anker (EN 319 412-2 §4.3.10)', async () => {
  const basis = [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid')];
  const ekuKritisch = Z.erw.roh('2.5.29.37', true, Z.folge(Z.oid('1.3.6.1.5.5.7.3.1')));
  const blatt = Z.kette({ blattErweiterungen: [...basis, ekuKritisch] });
  assert.deepEqual({ ...(await K()._x509KettePruefen(blatt.x5c, blatt.anker, JETZT)) }, nein('eku-kritisch'));
  const amAnker = Z.kette({ wurzelErweiterungen: [Z.erw.basis(true), Z.erw.ku('keyCertSign'), ekuKritisch] });
  assert.deepEqual({ ...(await K()._x509KettePruefen(amAnker.x5c, amAnker.anker, JETZT)) }, nein('eku-kritisch'));
  const gegen = Z.kette({ blattErweiterungen: [...basis, Z.erw.eku('1.3.6.1.5.5.7.3.1')] });
  assert.equal((await K()._x509KettePruefen(gegen.x5c, gegen.anker, JETZT)).gueltig, true, 'Gegenprobe: dieselbe EKU nicht kritisch');
});

test('[X509·Seriennummer] mehr als 20 Oktette sind seriennummer-zu-lang; 20 Oktette mit Vorzeichenbyte und 0 tragen', async () => {
  const P = async (seriell) => { const k = Z.kette({ blattSeriell: seriell }); return { ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) }; };
  assert.deepEqual(await P([0x01, ...new Array(20).fill(0x11)]), nein('seriennummer-zu-lang'), '21 Oktette');
  assert.deepEqual(await P([0x00, 0x80, ...new Array(20).fill(0x11)]), nein('seriennummer-zu-lang'), '21 Oktette hinter dem Vorzeichenbyte');
  assert.equal((await P([0x00, 0x80, ...new Array(19).fill(0x11)])).gueltig, true, 'Gegenprobe: 20 Oktette, kodiert mit Vorzeichenbyte');
  assert.equal((await P([0x7f, ...new Array(19).fill(0x11)])).gueltig, true, 'Gegenprobe: 20 Oktette');
  assert.equal((await P([0x00])).gueltig, true, 'Seriennummer 0 wird angenommen (bewusst anders, tests/konformitaet/vectors/x509-limbo/bewusst-anders.json)');
});

/* ── Fix A nach dem gemessenen limbo-Lauf (15.10.2026) ─────────────────────
   Je Regel eine rote Probe aus dem limbo-Fall (Daten aus der gepinnten Auswahl, gefahren wie tests/x509-limbo.test.js) und eine
   kleine, zur Laufzeit ausgestellte. */
const limboUmfang = () => LIMBO.auswahlLesen('umfang.json').daten;
async function limboGrund(id) {
  const d = limboUmfang();
  const fall = d.faelle.find((f) => f.id === id);
  assert.ok(fall, 'Vorbedingung: ' + id + ' steht in umfang.json');
  return LIMBO.fallFahren(K(), d.zertifikate, fall);
}
const P = async (k) => ({ ...(await K()._x509KettePruefen(k.x5c, k.anker, JETZT)) });
const BLATT_BASIS = () => [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid')];

test('[X509·Fix A·leerer Subject] ohne kritischen SAN san-bei-leerem-subject (rfc5280::san::noncritical-with-empty-subject)', async () => {
  assert.deepEqual(await limboGrund('rfc5280::san::noncritical-with-empty-subject'), { angenommen: false, versuche: 1, grund: 'san-bei-leerem-subject' });
  const ohne = Z.kette({ blattInhaber: Z.folge() });
  assert.deepEqual(await P(ohne), nein('san-bei-leerem-subject'), 'SAN nicht kritisch');
  const keinSan = Z.kette({ blattInhaber: Z.folge(), blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature')] });
  assert.deepEqual(await P(keinSan), nein('san-bei-leerem-subject'), 'kein SAN');
  const kritisch = Z.kette({ blattInhaber: Z.folge(), blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'),
    Z.erw.roh('2.5.29.17', true, Z.folge(Z.tlv(0x82, Buffer.from('verifier.test.invalid'))))] });
  assert.equal((await P(kritisch)).gueltig, true, 'Gegenprobe: leerer Subject mit kritischem SAN');
});

test('[X509·Fix A·CA basicConstraints] eine CA mit nicht kritischem basicConstraints ist ca-bc-nicht-kritisch — Anker wie Zwischen-CA', async () => {
  assert.deepEqual(await limboGrund('rfc5280::root-non-critical-basic-constraints'), { angenommen: false, versuche: 1, grund: 'ca-bc-nicht-kritisch' });
  const bcLocker = Z.erw.roh('2.5.29.19', false, Z.folge(Z.tlv(0x01, [0xff])));
  assert.deepEqual(await P(Z.kette({ wurzelErweiterungen: [bcLocker, Z.erw.ku('keyCertSign')] })), nein('ca-bc-nicht-kritisch'), 'Anker');
  assert.deepEqual(await P(Z.kette({ zwischen: { erweiterungen: [bcLocker, Z.erw.ku('keyCertSign')] } })), nein('ca-bc-nicht-kritisch'), 'Zwischen-CA');
  assert.equal((await P(Z.kette({ zwischen: {} }))).gueltig, true, 'Gegenprobe: kritisch an Anker und Zwischen-CA');
});

test('[X509·Fix A·keyCertSign ohne CA] keyCertSign ohne cA=TRUE ist keycertsign-ohne-ca (rfc5280::leaf-ku-keycertsign)', async () => {
  assert.deepEqual(await limboGrund('rfc5280::leaf-ku-keycertsign'), { angenommen: false, versuche: 1, grund: 'keycertsign-ohne-ca' });
  const k = Z.kette({ blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature', 'keyCertSign'), Z.erw.san('verifier.test.invalid')] });
  assert.deepEqual(await P(k), nein('keycertsign-ohne-ca'));
  const ohneBc = Z.kette({ blattErweiterungen: [Z.erw.ku('digitalSignature', 'keyCertSign'), Z.erw.san('verifier.test.invalid')] });
  assert.deepEqual(await P(ohneBc), nein('keycertsign-ohne-ca'), 'ohne basicConstraints');
  assert.equal((await P(Z.kette())).gueltig, true, 'Gegenprobe: digitalSignature allein');
});

test('[X509·Fix A·Blatt ist CA] ein Blatt mit cA=TRUE ist blatt-ist-ca (webpki::ee-basicconstraints-ca)', async () => {
  assert.deepEqual(await limboGrund('webpki::ee-basicconstraints-ca'), { angenommen: false, versuche: 1, grund: 'blatt-ist-ca' });
  const k = Z.kette({ blattErweiterungen: [Z.erw.basis(true), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid')] });
  assert.deepEqual(await P(k), nein('blatt-ist-ca'));
  assert.equal((await P(Z.kette())).gueltig, true, 'Gegenprobe: cA=FALSE');
});

test('[X509·Fix A·extnValue] jeder extnValue ist striktes DER, sonst erweiterung-form (webpki::malformed-aia)', async () => {
  assert.deepEqual(await limboGrund('webpki::malformed-aia'), { angenommen: false, versuche: 1, grund: 'erweiterung-form' });
  const mit = (wert) => Z.kette({ blattErweiterungen: [...BLATT_BASIS(), Z.erw.roh('1.3.6.1.5.5.7.1.1', false, wert)] });
  assert.deepEqual(await P(mit(Buffer.from('malformed'))), nein('erweiterung-form'), 'Text statt DER');
  assert.deepEqual(await P(mit(Buffer.concat([Z.folge(), Buffer.from([0x00])]))), nein('erweiterung-form'), 'Restbytes');
  assert.deepEqual(await P(mit(Buffer.from([0x30, 0x80, 0x00, 0x00]))), nein('erweiterung-form'), 'unbestimmte Länge');
  assert.equal((await P(mit(Z.folge(Z.folge(Z.oid('1.3.6.1.5.5.7.48.1'), Z.tlv(0x86, Buffer.from('http://ocsp.test.invalid'))))))).gueltig, true,
    'Gegenprobe: eine wohlgeformte AIA');
});

test('[X509·Fix A·CN] ein Rechnername als CN muss im SAN stehen; zwei CN und fremde Kodierung fallen; Handelsnamen tragen', async () => {
  for (const id of ['webpki::cn::punycode-not-in-san', 'webpki::cn::utf8-vs-punycode-mismatch', 'webpki::cn::not-in-san', 'webpki::cn::case-mismatch']) {
    assert.deepEqual(await limboGrund(id), { angenommen: false, versuche: 1, grund: 'cn-hostname-nicht-im-san' }, id);
  }
  const mitCn = (inhaber, ...san) => Z.kette({ blattInhaber: inhaber,
    blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'), ...(san.length ? [Z.erw.san(...san)] : [])] });
  assert.deepEqual(await P(mitCn(Z.name(Z.cn('anderer.test.invalid')), 'verifier.test.invalid')), nein('cn-hostname-nicht-im-san'));
  assert.deepEqual(await P(mitCn(Z.name(Z.cn('Verifier.Test.Invalid')), 'verifier.test.invalid')), nein('cn-hostname-nicht-im-san'), 'andere Schreibung');
  assert.deepEqual(await P(mitCn(Z.name(Z.cn('verifier.test.invalid'), Z.cn('zweiter')), 'verifier.test.invalid')), nein('cn-mehrfach'));
  assert.deepEqual(await P(mitCn(Z.name(Z.cn('verifier', 'bmp')), 'verifier.test.invalid')), nein('cn-form'), 'BMPString');
  // Gegenproben: wie das Blatt des Referenz-Verifiers (CN=verifier, SAN localhost und verifier, SAN kritisch), ein Handelsname,
  // ein CN gleich einem SAN-Namen, kein CN.
  const referenz = Z.kette({ blattInhaber: Z.name(Z.cn('verifier')), blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'),
    Z.erw.roh('2.5.29.17', true, Z.folge(Z.tlv(0x82, Buffer.from('localhost')), Z.tlv(0x82, Buffer.from('verifier'))))] });
  assert.equal((await P(referenz)).gueltig, true, 'Referenz-Verifier: CN=verifier');
  assert.equal((await P(mitCn(Z.name(Z.cn('Stadt Musterstadt Bürgeramt')), 'buergeramt.test.invalid'))).gueltig, true, 'Handelsname');
  assert.equal((await P(mitCn(Z.name(Z.cn('verifier.test.invalid')), 'a.test.invalid', 'verifier.test.invalid'))).gueltig, true, 'CN steht im SAN');
  assert.equal((await P(mitCn(Z.name(Z.org('Stadt Musterstadt')), 'verifier.test.invalid'))).gueltig, true, 'kein CN');
});

/* Anzeige und Kennung der Stelle nie aus dem CN. ORG_ZEILE ist die Zeile, die der Rot-Beweis unten auf den CN umbiegt. */
const ORG_ZEILE = "const _X509_OID_ORGANISATION = '2.5.4.10';";
const stelleKette = (...attr) => Z.kette({ blattInhaber: Z.name(Z.cn('Abweichender Dienstname'), ...(attr.length ? attr : [Z.org('Stadt Musterstadt'), Z.orgKennung('VATDE-000000000')])) });
test('[X509·Stelle·Anzeige] Anzeige aus organizationName, Kennung aus organizationIdentifier — nie aus dem CN', async () => {
  const P2 = async (k) => (await K()._x509StellePruefen(k.x5c, k.anker, JETZT));
  const r = await P2(stelleKette());
  assert.equal(r.gueltig, true, r.grund);
  assert.deepEqual({ ...r.stelle }, { anzeige: 'Stadt Musterstadt', kennung: 'VATDE-000000000' });
  assert.notEqual(r.stelle.anzeige, 'Abweichender Dienstname');
  assert.notEqual(r.stelle.kennung, 'Abweichender Dienstname');
  assert.deepEqual({ ...(await P2(stelleKette(Z.orgKennung('VATDE-000000000')))).stelle }, { anzeige: 'VATDE-000000000', kennung: 'VATDE-000000000' },
    'ohne organizationName: Anzeige = organizationIdentifier');
  assert.deepEqual({ ...(await P2(stelleKette({ oid: '2.5.4.11', wert: 'Bürgeramt' }))).stelle }, { anzeige: null, kennung: null },
    'ohne beides: nichts, auch nicht der CN');
});

/* Rot-Beweis: ohne die Zeilen für Anker und keyUsage tragen die Fälle oben — die Proben messen also die Zeilen. Kopie im
   Speicher, gebacken aus einem Wegwerf-Verzeichnis (Muster tests/fach-tuer-trennung.test.js). */
const ROT_ZEILEN = ['  if (ankerGrund) return nein(ankerGrund);\n', "  if (!blatt.keyUsage) return nein('blatt-zweck', 'keyusage-fehlt');\n",
  "  if (!blatt.digitalSignature && !blatt.nonRepudiation) return nein('blatt-zweck', 'keyusage-ohne-signatur');\n"];
test('[X509·Kette·Rot-Beweis] ohne Anker-Abgleich trägt die fremde Kette, ohne die keyUsage-Zeilen das Blatt ohne keyUsage, mit CN-Anzeige fällt die Anzeige-Probe', async () => {
  let quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  for (const z of ROT_ZEILEN) {
    assert.equal(quelle.split(z).length - 1, 1, 'Vorbedingung: die Zeile steht genau einmal im Kern: ' + z.trim());
    quelle = quelle.replace(z, '');
  }
  // und eine Fassung, die die Anzeige aus dem CN läse
  assert.equal(quelle.split(ORG_ZEILE).length - 1, 1, 'Vorbedingung: ' + ORG_ZEILE);
  quelle = quelle.replace(ORG_ZEILE, "const _X509_OID_ORGANISATION = '2.5.4.3';");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x509-leser-rot-'));
  try {
    const datei = path.join(dir, 'kern.html');
    fs.writeFileSync(datei, quelle);
    const R = ladeKern({ htmlPfad: datei, backen: true, zusatzBindungen: NAMEN }).V.__zusatz;
    assert.equal((await R._x509KettePruefen(kette('fremd-blatt-p256', 'fremd-wurzel-p256'), anker('wurzel-p256'), JETZT)).gueltig, true);
    const k = Z.kette({ blattErweiterungen: [Z.erw.basis(false), Z.erw.san('verifier.test.invalid')] });
    assert.equal((await R._x509KettePruefen(k.x5c, k.anker, JETZT)).gueltig, true);
    const s = stelleKette();
    assert.equal((await R._x509StellePruefen(s.x5c, s.anker, JETZT)).stelle.anzeige, 'Abweichender Dienstname', 'mit CN als Anzeige fiele die Probe der Anzeige');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ── client_id ↔ Blatt ──────────────────────────────────────────────────── */

test('[X509·client_id·x509_san_dns] der genannte Name muss zeichengleich einem dNSName gleichen, ohne Platzhalter', async () => {
  const k = Z.kette({ blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('a.test.invalid', 'verifier.test.invalid', '*.test.invalid')] });
  const blatt = K()._x509Lesen(k.blatt);
  const B = async (id) => ({ ...(await K()._x509ClientIdBinden(id, blatt)) });
  assert.deepEqual(await B('x509_san_dns:verifier.test.invalid'), { gueltig: true, kennung: 'verifier.test.invalid' }, 'Gegenprobe: einer von mehreren SAN-Namen');
  assert.deepEqual(await B('x509_san_dns:b.test.invalid'), nein('san-passt-nicht'), 'nur über den Platzhalter *.test.invalid');
  assert.deepEqual(await B('x509_san_dns:Verifier.test.invalid'), nein('san-passt-nicht'), 'andere Schreibung');
  assert.deepEqual(await B('x509_san_dns:fremd.invalid'), nein('san-passt-nicht'));
  assert.deepEqual(await B('x509_san_dns:*.test.invalid'), nein('client-id-form'));
  assert.deepEqual(await B('x509_san_dns:'), nein('client-id-form'));
  assert.deepEqual(await B('redirect_uri:https://verifier.test.invalid'), nein('client-id-praefix-unbekannt'));
  assert.deepEqual(await B('verifier.test.invalid'), nein('client-id-form'));
  // nie eine IP-Adresse: ein iPAddress-Eintrag im SAN ist kein dNSName
  const ip = K()._x509Lesen(Z.kette({ blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'),
    Z.erw.roh('2.5.29.17', false, Z.folge(Z.tlv(0x82, Buffer.from('verifier.test.invalid')), Z.tlv(0x87, [192, 0, 2, 1])))] }).blatt);
  assert.deepEqual({ ...(await K()._x509ClientIdBinden('x509_san_dns:192.0.2.1', ip)) }, nein('san-passt-nicht'), 'IP im SAN trägt nicht');
});

test('[X509·client_id·x509_hash] SHA-256 des Blatts und genau ein organizationIdentifier; fehlt er, kennung-fehlt', async () => {
  const blattMit = (...attr) => K()._x509Lesen(Z.kette({ blattInhaber: Z.name(Z.cn('verifier.test.invalid'), ...attr) }).blatt);
  const hash = (b) => crypto.createHash('sha256').update(b.roh).digest('base64url');
  const B = async (id, b) => ({ ...(await K()._x509ClientIdBinden(id, b)) });
  const gut = blattMit(Z.orgKennung('VATDE-000000000'));
  assert.deepEqual(await B('x509_hash:' + hash(gut), gut), { gueltig: true, kennung: 'VATDE-000000000' }, 'Gegenprobe');
  const pr = blattMit(Z.orgKennung('LEIXG-0000000000000000', 'printable'));
  assert.deepEqual(await B('x509_hash:' + hash(pr), pr), { gueltig: true, kennung: 'LEIXG-0000000000000000' }, 'Gegenprobe PrintableString');
  const anderes = blattMit(Z.orgKennung('VATDE-000000001'));
  assert.deepEqual(await B('x509_hash:' + hash(anderes), gut), nein('hash-passt-nicht'), 'Hash eines anderen Blatts');
  const ohne = blattMit();
  assert.deepEqual(await B('x509_hash:' + hash(ohne), ohne), nein('kennung-fehlt'));
  const zwei = blattMit(Z.orgKennung('VATDE-000000000'), Z.orgKennung('VATDE-000000002'));
  assert.deepEqual(await B('x509_hash:' + hash(zwei), zwei), nein('kennung-mehrdeutig'));
  assert.deepEqual(await B('x509_hash:' + hash(gut) + '=', gut), nein('client-id-form'), 'mit Auffüllung');
  assert.deepEqual(await B('x509_hash:' + crypto.createHash('sha256').update(gut.roh).digest('base64'), gut).then((r) => r.grund), 'client-id-form', 'base64 statt base64url');
});

/* ── Kurven je Engine ───────────────────────────────────────────────────── */

test('[X509·Kurven·WebKit] unter WebKit (an der Fähigkeit erkannt) sind P-384 und P-521 kurve-nicht-gemessen, P-256 trägt; andere Engines und Node prüfen per Fähigkeit', async () => {
  const W = ladeKern({ zusatzBindungen: NAMEN, CSS: CSS_WEBKIT }).V.__zusatz;
  assert.equal(await W._x509KurvePruefen('P-384'), 'kurve-nicht-gemessen');
  assert.equal(await W._x509KurvePruefen('P-521'), 'kurve-nicht-gemessen');
  assert.equal(await W._x509KurvePruefen('P-256'), null);
  assert.deepEqual({ ...(await W._x509KettePruefen(kette('blatt-p256', 'zwischen-p384'), anker('wurzel-p256'), JETZT)) }, nein('kurve-nicht-gemessen'), 'Zwischen-CA P-384');
  assert.deepEqual({ ...(await W._x509KettePruefen(kette('blatt-p521'), anker('wurzel-p521'), JETZT)) }, nein('kurve-nicht-gemessen'), 'Wurzel P-521');
  const k = Z.kette();
  assert.equal((await W._x509KettePruefen(k.x5c, k.anker, JETZT)).gueltig, true, 'P-256 durchgehend trägt unter WebKit');
  const C = ladeKern({ zusatzBindungen: NAMEN, CSS: CSS_ANDERE }).V.__zusatz;
  assert.equal(await C._x509KurvePruefen('P-384'), null, 'andere Engine (CSS kennt -apple-system-body nicht): Fähigkeitsprobe');
  assert.equal(await K()._x509KurvePruefen('P-521'), null, 'Node: Fähigkeitsprobe');
  assert.equal(await K()._x509KurvePruefen('secp256k1'), 'kurve-nicht-unterstuetzt');
});

/* ── Spanne, Schnitt, Krypto-Stelle, nie im Produkt ─────────────────────── */

const [LESER_ANFANG, LESER_ENDE] = ['/* X509-LESER:BEGIN */', '/* X509-LESER:END */'];
function leserSpanne(text) {
  const a = text.indexOf(LESER_ANFANG), e = text.indexOf(LESER_ENDE);
  assert.ok(a > 0 && e > a, 'Vorbedingung: die Spanne X509-LESER steht genau einmal im Kern');
  assert.equal(text.indexOf(LESER_ANFANG, a + 1), -1);
  return { a, e, inhalt: text.slice(a, e + LESER_ENDE.length) };
}
const leserNamen = (inhalt) => [...new Set([...inhalt.matchAll(/function\s+([A-Za-z_$][\w$]*)/g), ...inhalt.matchAll(/const\s+(_X509_\w+|_DER_\w+)/g)].map((m) => m[1]))];

test('[X509·Spanne·verify] genau eine WebCrypto-verify-Stelle in der Spanne, in _x509EcdsaPruefen', () => {
  const { inhalt } = leserSpanne(fs.readFileSync(KERN_PFAD, 'utf8'));
  const zeilen = inhalt.split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z) && /\.verify\(/.test(z));
  assert.equal(zeilen.length, 1, zeilen.join('\n'));
  const fn = inhalt.slice(inhalt.indexOf('async function _x509EcdsaPruefen('));
  assert.ok(fn.slice(0, fn.indexOf('\n}\n')).includes(zeilen[0].trim()), 'die Stelle liegt in _x509EcdsaPruefen');
  assert.ok(!/\.(sign|exportKey|encrypt|decrypt|deriveBits|wrapKey|unwrapKey)\(/.test(inhalt), 'sonst keine Krypto-Operation');
  assert.ok(!/importKey\([^)]*true/.test(inhalt), 'kein herausholbarer Schlüssel');
});

test('[X509·Spanne·Schnitt] die Spanne übersteht den Schnitt der Entwicklerleiste — jeder Bezeichner bleibt im Produkt', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const namen = leserNamen(leserSpanne(text).inhalt);
  for (const n of ['_derLesen', '_x509Lesen', '_ecdsaDerZuRs', '_x509EcdsaPruefen', '_x509KettePruefen', '_x509ClientIdBinden', '_DER_HOECHSTENS_BYTES', '_X509_EKU_ERLAUBT']) {
    assert.ok(namen.includes(n), 'Positivkontrolle: ' + n + ' steht in der Spanne');
  }
  const geschnitten = _entwicklerleisteSchneiden(text, 'vivodepot.html');
  assert.deepEqual(namen.filter((n) => !new RegExp('function\\s+' + n + '\\b|const\\s+' + n + '\\b').test(geschnitten)), []);
  assert.ok(geschnitten.includes(LESER_ANFANG) && geschnitten.includes(LESER_ENDE));
});

test('[X509·Spanne·Schnitt·Rot-Beweis] in eine Entwicklerleisten-Spanne gelegt, fehlt der Leser im Produkt — die Probe sähe es', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const { a, e, inhalt } = leserSpanne(text);
  const [anf, end] = ENTWICKLERLEISTE_MARKEN[0];
  const verpackt = text.slice(0, a) + anf + '\n' + inhalt + '\n' + end + text.slice(e + LESER_ENDE.length);
  const geschnitten = _entwicklerleisteSchneiden(verpackt, 'vivodepot.html');
  assert.ok(!/function\s+_x509KettePruefen\b/.test(geschnitten));
});

/* Klassenprobe: kein Produktweg außerhalb der Spanne ruft _x509KettePruefen direkt. Die Pfadprüfung allein verlangt keine
   Richtlinie am Blatt; der Eingang für das Zertifikat einer Stelle ist _x509StellePruefen. Kommentarzeilen zählen nicht. */
function direkteKettenAufrufe(text) {
  const { a, e } = leserSpanne(text);
  const draussen = text.slice(0, a) + text.slice(e + LESER_ENDE.length);
  return draussen.split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z) && /\b_x509KettePruefen\s*\(/.test(z));
}
test('[X509·Spanne·Eingang] außerhalb der Spanne ruft niemand _x509KettePruefen direkt; _x509StellePruefen ruft sie innen', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  assert.deepEqual(direkteKettenAufrufe(text), []);
  const { inhalt } = leserSpanne(text);
  const stelle = inhalt.slice(inhalt.indexOf('async function _x509StellePruefen('));
  assert.match(stelle.slice(0, stelle.indexOf('\n}\n')), /await _x509KettePruefen\(/, 'Positivkontrolle: der Eingang ruft die Pfadprüfung');
});
test('[X509·Spanne·Eingang·Rot-Beweis] ein direkter Aufruf außerhalb der Spanne wird gefunden', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const eingespielt = text.replace('/* X509-LESER:END */', '/* X509-LESER:END */\nasync function _irgendeinWeg(x, a) { return _x509KettePruefen(x, a); }');
  assert.notEqual(eingespielt, text, 'Testvoraussetzung');
  assert.equal(direkteKettenAufrufe(eingespielt).length, 1);
});

/* Test-Dateien nie im Produkt (Auflage 15.10.2026): kein Bauweg eines Produkts nennt die Test-Ordner, und kein Stück eines
   Test-Zertifikats steht im Kern, aus dem jedes Produkt gebacken wird. Die Bauwege: jedes Werkzeug, das ausliefert, konfektioniert
   oder Produkte erzeugt (nach Namen gefunden, damit die Probe auch dort läuft, wo einzelne davon nicht mitkommen), der
   gemeinsame Backschritt, und alles, was sie im Repo per require laden. */
const BAUWEG_MUSTER = /(?:ausliefern|konfektionieren|produkte-erzeugen)\.js$/;
const BAUWEGE = [...fs.readdirSync(path.join(REPO, 'tools')).filter((n) => BAUWEG_MUSTER.test(n)).map((n) => 'tools/' + n), 'tools/lib/produkt-text-erzeugen.js'];
function bauwegDateien() {
  const gesehen = new Set();
  const offen = BAUWEGE.map((p) => path.join(REPO, p));
  while (offen.length) {
    const d = offen.pop();
    if (gesehen.has(d) || !fs.existsSync(d)) continue;
    gesehen.add(d);
    for (const m of fs.readFileSync(d, 'utf8').matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
      const z = path.resolve(path.dirname(d), m[1]);
      offen.push(fs.existsSync(z) ? z : z + '.js');
    }
  }
  return [...gesehen];
}
const TESTORTE = /fixtures[\\/]+oid4vp|x509-limbo|konformitaet[\\/]+vectors|x509-test-zertifikate/;
function stueckeImText(text) {
  const stuecke = fs.readdirSync(FIX).filter((f) => f.endsWith('.crt')).map((f) => { const s = pemB64(f.slice(5, -4)); return s.slice(80, 140); });
  return stuecke.filter((s) => text.includes(s));
}

test('[X509·nie im Produkt] kein Bauweg liest die Test-Ordner, kein Test-Zertifikat steht im Kern; jede Datei trägt „test" im Namen', () => {
  const dateien = bauwegDateien();
  assert.ok(BAUWEGE.length >= 2 && dateien.length >= BAUWEGE.length, 'Vorbedingung: die Bauwege sind da (' + BAUWEGE.join(', ') + ')');
  for (const d of dateien) assert.ok(!TESTORTE.test(fs.readFileSync(d, 'utf8')), path.relative(REPO, d) + ' nennt einen Test-Ordner');
  assert.deepEqual(stueckeImText(fs.readFileSync(KERN_PFAD, 'utf8')), []);
  for (const f of fs.readdirSync(FIX)) if (f !== 'README.md') assert.match(f, /test/, f);
});

test('[X509·nie im Produkt·Rot-Beweis] ein Stück eines Test-Zertifikats im Kern und ein Bauweg mit Test-Ordner werden gefunden', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const stueck = pemB64('wurzel-p256').slice(80, 140);
  assert.ok(stueckeImText(text + '\nconst X = "' + stueck + '";').includes(stueck));
  assert.ok(TESTORTE.test("const p = path.join(REPO, 'tests', 'fixtures/oid4vp');"));
});
