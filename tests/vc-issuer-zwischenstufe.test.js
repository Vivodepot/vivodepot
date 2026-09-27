'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Zertifikatsbetrieb ohne Terminal (23.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Posten 2: Kundenzertifikat über die Zwischenstufe (U2-ADR-172) im
   Zertifikator selbst, ohne Konsole. Posten 3: Zweck-im-Dateinamen-Wächter.
   Posten "Beleg": Browser-Weg und tools/kundenzertifikat-ausstellen.js
   müssen bei gleichem Material zeichengleiche certJws liefern — driften sie,
   gibt es zwei Wahrheiten.

   Wegwerf-Sentinel-Anker, Wegwerf-Ausgabe-/Kunden-Schlüssel. KEY tabu.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');
const { lauf: kundenzertifikatAusstellen } = require('../tools/kundenzertifikat-ausstellen.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});

function mitTmpVerzeichnis(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-issuer-zwischenstufe-'));
  return Promise.resolve(fn(tmp)).finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
}

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

async function ausstellerZertifikatBauen(ISSUER, ausgabePubJwk) {
  const signKey = await ISSUER._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const vc = ISSUER.baueProviderVC({
    issuer: 'did:web:vivodepot.de', anbieterId: 'vivodepot/ausgabestelle-test', anbieterName: 'Test-Ausgabestelle',
    anbieterTyp: ISSUER.AUSGABESTELLE_ANBIETERTYP, publicKeyJwk: ausgabePubJwk,
    issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
  });
  return ISSUER.stelleProviderCredentialAus(vc, signKey);
}

// ── Posten 3: Zweck-im-Dateinamen-Wächter ──────────────────────────────────

test('[Zweck-Wächter] _zweckSlug normalisiert und lehnt Leeres ab', () => {
  const { V } = ladeIssuer();
  assert.equal(V._zweckSlug('Treuhand Schlüssel!!'), 'treuhand-schlussel');
  assert.equal(V._zweckSlug('  ausgabestelle  '), 'ausgabestelle');
  assert.equal(V._zweckSlug(''), '');
  assert.equal(V._zweckSlug('   '), '');
  assert.equal(V._zweckSlug('---'), '');
});

test('[Zweck-Wächter] onSchluesselErzeugen bricht ohne Zweck ab, BEVOR ein Schlüssel entsteht', async () => {
  const { V, document } = ladeIssuer();
  document.getElementById('keygenZweck').value = '';
  document.getElementById('keygenPw1').value = 'wegwerf-passphrase-123';
  document.getElementById('keygenPw2').value = 'wegwerf-passphrase-123';
  await V.onSchluesselErzeugen();
  assert.match(document.getElementById('keygenStatus').textContent, /Zweck fehlt/);
  // Beleg, dass wirklich VOR der Erzeugung abgebrochen wurde: die Passphrase-Felder sind
  // unverändert — onSchluesselErzeugen leert sie erst NACH einer erfolgreichen Erzeugung.
  assert.equal(document.getElementById('keygenPw1').value, 'wegwerf-passphrase-123');
});

// ── Posten 2: Kundenzertifikat über die Zwischenstufe, ohne Konsole ────────

test('[Zwischenstufe im Zertifikator] onAusstellen mit Ausstellerzertifikat → Kundenzertifikat-Bündel, zeichengleich zu tools/kundenzertifikat-ausstellen.js', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { V, document } = ladeIssuer();
    const ausgabe = await wegwerfKeypair();
    const kunde = await wegwerfKeypair();
    const ausstellerZertifikatJws = await ausstellerZertifikatBauen(V, ausgabe.pubJwk);

    // Ausgabe-Schlüssel "laden" — über die Funktion, nicht über einen simulierten Datei-Dialog
    // (Posten "Beleg": über die Funktionen, nicht die UI).
    const res = await V._importGeprueftenPrivateJwk(Object.assign({}, ausgabe.privJwk));
    V._uebernehmeGeladenenSchluessel(res);

    document.getElementById('anbieterId').value = 'institution/test-kunde';
    document.getElementById('anbieterName').value = 'Test-Kunde GmbH';
    document.getElementById('anbieterTyp').value = 'institution/test';
    document.getElementById('pubKeyText').value = JSON.stringify(kunde.pubJwk);
    document.getElementById('ausstellerZertifikatText').value = JSON.stringify({ certJws: ausstellerZertifikatJws });

    await V.onAusstellen();

    const bundle = V._letztesKundenBundleLesen();
    assert.ok(bundle, 'ein Kundenzertifikat-Bündel wurde erzeugt');
    assert.equal(bundle.anbieterId, 'institution/test-kunde');
    assert.equal(bundle.ausstellerZertifikatJws, ausstellerZertifikatJws);
    assert.ok(!JSON.stringify(bundle).includes('"d"'), 'kein Schlüsselmaterial im Bündel');

    // ── DER BELEG: derselbe Vorgang über tools/kundenzertifikat-ausstellen.js, bei gleichem
    // issuanceDate/expirationDate — driften die beiden Wege, gibt es zwei Wahrheiten.
    const vdkeyPfad = path.join(tmp, 'ausgabe.vdkey.json');
    fs.writeFileSync(vdkeyPfad, JSON.stringify(await V.schuetzeSchluesselJwk(ausgabe.privJwk, 'wegwerf-passphrase')), 'utf8');
    const ausstellerPfad = path.join(tmp, 'ausstellerzertifikat.json');
    fs.writeFileSync(ausstellerPfad, JSON.stringify({ certJws: ausstellerZertifikatJws }), 'utf8');
    const subjektPfad = path.join(tmp, 'kunde-public.jwk.json');
    fs.writeFileSync(subjektPfad, JSON.stringify(kunde.pubJwk), 'utf8');
    const ausgabeDateiPfad = path.join(tmp, 'kundenzertifikat.json');

    const ok = await kundenzertifikatAusstellen({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabeDateiPfad,
      issuanceDate: bundle.issuanceDate, gueltigkeitMonate: (new Date(bundle.expirationDate).getUTCFullYear() - new Date(bundle.issuanceDate).getUTCFullYear()) * 12
        + (new Date(bundle.expirationDate).getUTCMonth() - new Date(bundle.issuanceDate).getUTCMonth()),
    });
    assert.equal(ok, true, 'tools/kundenzertifikat-ausstellen.js läuft mit demselben Material durch');
    const cliErgebnis = JSON.parse(fs.readFileSync(ausgabeDateiPfad, 'utf8'));

    assert.equal(cliErgebnis.expirationDate, bundle.expirationDate, 'Vorbedingung: beide Wege rechnen dasselbe Ablaufdatum — sonst vergleicht certJws Äpfel mit Birnen');
    assert.equal(cliErgebnis.certJws, bundle.certJws, 'Browser-Weg und Konsolen-Werkzeug liefern bei gleichem Material zeichengleiche certJws');
  });
});

// ── Fund von VD Fix (30.08.2026): Browser-Weg und tools/kundenzertifikat-ausstellen.js
// rechneten bei gleichem issuanceDate/gueltigkeitMonate verschiedene Ablaufdaten, sobald die
// Laufzeit über einen Schaltjahr-Februar mit kürzerem Zielmonat läuft (setUTCMonth ohne
// Tages-Clamp rollt in den Folgemonat). Deterministisch, unabhängig vom Kalendertag des
// Testlaufs — anders als der Beleg-Test oben, der nur zufällig traf, weil "heute" der 30. war.
test('[Zwischenstufe im Zertifikator·Schaltjahr] issuanceDate am Monatsende + Laufzeit bis in einen kürzeren Schaltjahr-Monat: kein Rollover in den Folgemonat', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { V, document } = ladeIssuer();
    const ausgabe = await wegwerfKeypair();
    const kunde = await wegwerfKeypair();
    const ausstellerZertifikatJws = await ausstellerZertifikatBauen(V, ausgabe.pubJwk);

    const res = await V._importGeprueftenPrivateJwk(Object.assign({}, ausgabe.privJwk));
    V._uebernehmeGeladenenSchluessel(res);
    document.getElementById('anbieterId').value = 'institution/test-kunde';
    document.getElementById('anbieterName').value = 'Test-Kunde GmbH';
    document.getElementById('anbieterTyp').value = 'institution/test';
    document.getElementById('pubKeyText').value = JSON.stringify(kunde.pubJwk);
    document.getElementById('ausstellerZertifikatText').value = JSON.stringify({ certJws: ausstellerZertifikatJws });

    // 30.08.2026 + 18 Monate = Zielmonat Februar 2028 (Schaltjahr, 29 Tage) — Tag 30 existiert
    // dort nicht. Der Browser-Weg (V.plusMonate) klemmt korrekt auf den 29.02.2028.
    const issuanceDate = '2026-08-30T12:00:00Z';
    const erwartetesAblaufdatum = V.plusMonate(issuanceDate, 18);
    assert.equal(erwartetesAblaufdatum, '2028-02-29T12:00:00Z', 'Vorbedingung: der korrekt klemmende Weg landet auf dem 29.02.2028');

    const vdkeyPfad = path.join(tmp, 'ausgabe.vdkey.json');
    fs.writeFileSync(vdkeyPfad, JSON.stringify(await V.schuetzeSchluesselJwk(ausgabe.privJwk, 'wegwerf-passphrase')), 'utf8');
    const ausstellerPfad = path.join(tmp, 'ausstellerzertifikat.json');
    fs.writeFileSync(ausstellerPfad, JSON.stringify({ certJws: ausstellerZertifikatJws }), 'utf8');
    const subjektPfad = path.join(tmp, 'kunde-public.jwk.json');
    fs.writeFileSync(subjektPfad, JSON.stringify(kunde.pubJwk), 'utf8');
    const ausgabeDateiPfad = path.join(tmp, 'kundenzertifikat.json');

    const ok = await kundenzertifikatAusstellen({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabeDateiPfad,
      issuanceDate, gueltigkeitMonate: 18,
    });
    assert.equal(ok, true, 'tools/kundenzertifikat-ausstellen.js läuft durch');
    const cliErgebnis = JSON.parse(fs.readFileSync(ausgabeDateiPfad, 'utf8'));

    assert.equal(cliErgebnis.expirationDate, erwartetesAblaufdatum,
      'CLI-Weg muss denselben, korrekt geklemmten 29.02.2028 liefern — kein Rollover auf den 01.03.2028');
  });
});

test('[Zwischenstufe im Zertifikator·Gegenprobe] ein Ausstellerzertifikat eines ANDEREN Ausgabe-Schlüssels wird vor der Signatur abgelehnt', async () => {
  const { V, document } = ladeIssuer();
  const ausgabe = await wegwerfKeypair();
  const einAnderer = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const falschesAusstellerZertifikatJws = await ausstellerZertifikatBauen(V, einAnderer.pubJwk);

  const res = await V._importGeprueftenPrivateJwk(Object.assign({}, ausgabe.privJwk));
  V._uebernehmeGeladenenSchluessel(res);

  document.getElementById('anbieterId').value = 'institution/test-kunde';
  document.getElementById('anbieterName').value = 'Test-Kunde GmbH';
  document.getElementById('anbieterTyp').value = 'institution/test';
  document.getElementById('pubKeyText').value = JSON.stringify(kunde.pubJwk);
  document.getElementById('ausstellerZertifikatText').value = JSON.stringify({ certJws: falschesAusstellerZertifikatJws });

  await V.onAusstellen();

  assert.match(document.getElementById('issueStatus').textContent, /gehört nicht zum geladenen Schlüssel/);
  assert.equal(V._letztesKundenBundleLesen(), null, 'kein Bündel entsteht, wenn Ausstellerzertifikat und Ausgabe-Schlüssel nicht zusammenpassen');
});

test('[Zwischenstufe im Zertifikator] leeres Ausstellerzertifikat-Feld → unveränderter direkter Weg', async () => {
  const { V, document } = ladeIssuer();
  const behoerde = await wegwerfKeypair();
  const res = await V._importGeprueftenPrivateJwk(Object.assign({}, SENTINEL_PRIVATE_JWK));
  V._uebernehmeGeladenenSchluessel(res);

  document.getElementById('anbieterId').value = 'behoerde/test';
  document.getElementById('anbieterName').value = 'Test-Behörde';
  document.getElementById('anbieterTyp').value = 'behoerde';
  document.getElementById('pubKeyText').value = JSON.stringify(behoerde.pubJwk);
  document.getElementById('ausstellerZertifikatText').value = '';

  await V.onAusstellen();

  assert.equal(V._letztesKundenBundleLesen(), null, 'ohne Ausstellerzertifikat entsteht kein Kundenzertifikat-Bündel — der direkte Weg bleibt unverändert');
  assert.match(document.getElementById('jwsOut').textContent, /^[\w-]+\.[\w-]+\.[\w-]+$/, 'das direkt ausgestellte Zertifikat steht weiterhin wie bisher in jwsOut');
});
