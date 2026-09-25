'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — VC-Issuer (Klasse-A) — vivodepot-vc-issuer.html (Komponente 3)
   ────────────────────────────────────────────────────────────────────────
   Prüft das Trust-Authority-Werkzeug End-to-End über seine DOM-freien
   Kernfunktionen plus den verbatim eingebetteten JWS-Block. Geprüft:

     T-A-01 Roundtrip   — VC mit Test-Sentinel-Private-Key ausstellen →
                          mit _verifyJWS verifizieren = gültig.
     T-A-02 Tampering   — Payload manipulieren → Verify schlägt fehl.
     T-A-03 Ablauf      — expirationDate in der Vergangenheit → Verify lehnt ab.
     T-A-03b Vorgültig. — VC vor validFrom/nbf (Beginn) → Verify lehnt ab.
     T-A-04 Sentinel    — istTestSentinelKey erkennt den Sentinel (rote Markierung).
     T-A-05 Submission  — beispiel-submission.json importieren → Anbieter-Daten
                          korrekt übernommen, VC ausstellbar & verifizierbar.
     T-A-06 Integrität  — VdCrypto-Block-Hash des Issuers == Kern (732ff4b0…);
                          JWS-Block byte-identisch zum Kern.

   Der zum eingebetteten Test-Sentinel-PUBLIC-Key gehörende PRIVATE-Key liegt
   AUSSCHLIESSLICH hier (TEST-Material), identisch zur jws-fundament-Suite.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeIssuer, kryptoBlock, sha256, webcrypto, BLOCK_HASH_ERWARTET } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten TEST_SENTINEL_PUBLIC_JWK.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});

function anbieterFixture() {
  return {
    issuer: 'did:web:vivodepot.de',
    anbieterId: 'institution/sparkasse-musterstadt-de',
    anbieterName: 'Sparkasse Musterstadt',
    anbieterTyp: 'institution/sparkasse-de',
    publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60' },
    issuanceDate: '2026-05-31T12:00:00Z',
    expirationDate: '2027-11-30T12:00:00Z',
  };
}

test('[Klasse-A] T-A-01 Roundtrip: Issuer stellt VC aus → _verifyJWS gültig', async () => {
  const { V } = ladeIssuer();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);

  const vc = V.baueProviderVC(anbieterFixture());
  assert.deepEqual(JSON.parse(JSON.stringify(vc['@context'])),
    ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1']);
  assert.deepEqual(JSON.parse(JSON.stringify(vc.type)),
    ['VerifiableCredential', 'VivodepotProviderCredential']);
  assert.equal(vc.issuer, 'did:web:vivodepot.de');
  assert.equal(vc.credentialSubject.anbieterId, 'institution/sparkasse-musterstadt-de');

  const jws = await V.stelleProviderCredentialAus(vc, signKey);
  const teile = jws.split('.');
  assert.equal(teile.length, 3, 'JWS Compact muss drei Teile haben');
  const header = JSON.parse(Buffer.from(teile[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.equal(header.typ, 'vc+jwt');
  assert.equal(header.alg, 'EdDSA');

  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'Roundtrip muss gültig sein: ' + res.grund);
  assert.equal(res.nutzlast.credentialSubject.anbieterName, 'Sparkasse Musterstadt');
});

test('[Klasse-A] Roundtrip ES256 (Fallback): Issuer signiert → verify gültig', async () => {
  const { V } = ladeIssuer();
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const signKey = await V._jwsImportSignKey(await webcrypto.subtle.exportKey('jwk', kp.privateKey));
  const verifyKey = await V._jwsImportVerifyKey(await webcrypto.subtle.exportKey('jwk', kp.publicKey));
  const jws = await V.stelleProviderCredentialAus(V.baueProviderVC(anbieterFixture()), signKey);
  const header = JSON.parse(Buffer.from(jws.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.equal(header.alg, 'ES256');
  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'ES256-Roundtrip muss gültig sein: ' + res.grund);
});

test('[Klasse-A] T-A-02 Tampering: manipulierter Payload → Verify schlägt fehl', async () => {
  const { V } = ladeIssuer();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const jws = await V.stelleProviderCredentialAus(V.baueProviderVC(anbieterFixture()), signKey);

  const teile = jws.split('.');
  const payload = JSON.parse(V._jwsB64uToString(teile[1]));
  payload.credentialSubject.anbieterId = 'institution/boeser-faelscher-de';
  teile[1] = V._jwsB64uFromString(JSON.stringify(payload));
  const manipuliert = teile.join('.');

  const res = await V._verifyJWS(manipuliert, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, false, 'manipulierter Payload darf NICHT gültig sein');
  assert.match(res.grund, /Signatur ungültig/);
});

test('[Klasse-A] T-A-03 Ablauf: abgelaufenes VC → Verify lehnt ab', async () => {
  const { V } = ladeIssuer();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const vc = V.baueProviderVC(Object.assign(anbieterFixture(), {
    issuanceDate: '2024-01-01T00:00:00Z', expirationDate: '2025-01-01T00:00:00Z',
  }));
  const jws = await V.stelleProviderCredentialAus(vc, signKey);
  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(res.gueltig, false, 'abgelaufenes VC darf NICHT gültig sein');
  assert.equal(res.abgelaufen, true);
  assert.match(res.grund, /abgelaufen/);
});

test('[Klasse-A] T-A-03b Vorgültigkeit: VC vor validFrom/nbf → Verify lehnt ab', async () => {
  const { V } = ladeIssuer();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);

  // validFrom (VC 2.0) in der Zukunft → noch nicht gültig.
  const vcFuture = V.baueProviderVC(anbieterFixture()); vcFuture.validFrom = '2027-01-01T00:00:00Z';
  const resF = await V._verifyJWS(await V.stelleProviderCredentialAus(vcFuture, signKey), verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(resF.gueltig, false, 'VC vor Gültigkeitsbeginn darf NICHT gültig sein');
  assert.equal(resF.vorGueltigkeit, true);
  assert.match(resF.grund, /noch nicht gültig/);

  // nbf (JWT, Sekunden) in der Zukunft → noch nicht gültig.
  const vcNbf = V.baueProviderVC(anbieterFixture()); vcNbf.nbf = Math.floor(new Date('2027-01-01T00:00:00Z').getTime() / 1000);
  const resN = await V._verifyJWS(await V.stelleProviderCredentialAus(vcNbf, signKey), verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(resN.gueltig, false, 'nbf in der Zukunft → nicht gültig');
  assert.equal(resN.vorGueltigkeit, true);

  // Positiv: validFrom in der Vergangenheit → gültig (innerhalb des Fensters).
  const vcPast = V.baueProviderVC(anbieterFixture()); vcPast.validFrom = '2026-01-01T00:00:00Z';
  const resP = await V._verifyJWS(await V.stelleProviderCredentialAus(vcPast, signKey), verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(resP.gueltig, true, 'validFrom in der Vergangenheit → gültig');
});

test('[Klasse-A] T-A-04 Sentinel-Erkennung: istTestSentinelKey markiert nur den Sentinel', async () => {
  const { V } = ladeIssuer();
  // Der importierte Public-Key entspricht dem Sentinel → rote Markierung.
  assert.equal(V.istTestSentinelKey(V.TEST_SENTINEL_PUBLIC_JWK), true);
  // Auch aus dem privaten JWK (enthält das öffentliche x) ableitbar.
  assert.equal(V.istTestSentinelKey(SENTINEL_PRIVATE_JWK), true);
  // Ein fremder Schlüssel wird NICHT als Sentinel markiert.
  const fremd = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  assert.equal(V.istTestSentinelKey(await webcrypto.subtle.exportKey('jwk', fremd.publicKey)), false);

  // Ein mit dem Sentinel ausgestelltes VC ist gegen den eingebetteten Sentinel verifizierbar.
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const jws = await V.stelleProviderCredentialAus(V.baueProviderVC(anbieterFixture()), signKey);
  const res = await V.verifiziereProviderCredentialGegenSentinel(jws, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'Sentinel-VC muss gültig sein: ' + res.grund);
  assert.equal(res.istTestSentinel, true);
});

test('[Klasse-A] T-A-05 Submission-Paket-Import: Daten übernommen, VC ausstellbar', async () => {
  const { V } = ladeIssuer();
  const beispiel = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/beispiel-submission.json'), 'utf8'));

  // 1) Schema-Validierung (gegen das im Issuer eingebettete Schema) — sauber.
  const fehler = V.validiereSubmission(beispiel);
  assert.equal(fehler.length, 0, 'Beispiel-Paket muss valide sein: ' + JSON.stringify(Array.from(fehler)));

  // 2) Anbieter-Daten korrekt übernommen.
  const d = V.submissionZuAnbieterDaten(beispiel);
  assert.equal(d.anbieterId, 'institution/pflegeheim-musterstadt-de');
  assert.equal(d.anbieterName, 'Seniorenresidenz Musterstadt');
  assert.equal(d.anbieterTyp, 'institution/pflegeheim-de');
  assert.equal(d.submissionId, '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  assert.equal(d.publicKeyJwk.x, 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60');
  // Anbieter-Public-Key valide.
  assert.equal(V.validiereAnbieterPublicKey(d.publicKeyJwk).ok, true);

  // 3) VC bauen (Default-Ablauf = Ausstellung + 18 Monate) und ausstellen.
  const issuance = '2026-05-31T12:00:00Z';
  const vc = V.baueProviderVC({
    issuer: V.ISSUER_DEFAULT,
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, issuanceDate: issuance,
  });
  assert.equal(vc.expirationDate, '2027-11-30T12:00:00Z', 'Default-Ablauf = +18 Monate');

  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const jws = await V.stelleProviderCredentialAus(vc, signKey);
  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'Aus Submission ausgestelltes VC muss gültig sein: ' + res.grund);
  assert.equal(res.nutzlast.credentialSubject.anbieterId, 'institution/pflegeheim-musterstadt-de');

  // Dateiname-Konvention.
  const name = V.vcDateiname(d.anbieterId, issuance);
  assert.match(name, /^vivodepot-provider-cert-institution_pflegeheim-musterstadt-de-2026-05-31T12-00-00Z\.json$/);

  // Defektes Paket wird abgelehnt (Selbsttest des eingebetteten Validators).
  const kaputt = JSON.parse(JSON.stringify(beispiel));
  delete kaputt.submissionId;
  kaputt.publicKeyJwk.d = 'geheim';
  kaputt.templates[0].felder = [];
  assert.ok(V.validiereSubmission(kaputt).length >= 3, 'kaputtes Paket muss mehrere Fehler liefern');
});

test('[Klasse-A] Schritt 3 (U2-ADR-039): Issuer bettet KEIN Plain-Template mehr in den Cert ein (templateJws-Durchreichen bleibt)', async () => {
  const { V } = ladeIssuer();
  const beispiel = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/beispiel-submission.json'), 'utf8'));
  const erwarteteFelder = beispiel.templates[0].felder.length;
  assert.ok(erwarteteFelder >= 1, 'Beispiel-Submission trägt Feld-Definitionen');

  // 1) submissionZuAnbieterDaten reicht das Template MIT durch (Stufe 1 — statt es zu verwerfen).
  const d = V.submissionZuAnbieterDaten(beispiel);
  assert.ok(d.templates[0] && Array.isArray(d.templates[0].felder), 'template durchgereicht');
  assert.equal(d.templates[0].felder.length, erwarteteFelder, 'alle Feld-Definitionen erhalten');

  // 2) Schritt 3 (U2-ADR-039): baueProviderVC bettet das Plain-Template NICHT mehr in den Cert ein —
  //    auch wenn eines übergeben wird. Anbieter-Identität (inkl. publicKeyJwk für die templateJws-
  //    Prüfung) bleibt unberührt.
  const vc = V.baueProviderVC({
    issuer: V.ISSUER_DEFAULT, anbieterId: d.anbieterId, anbieterName: d.anbieterName,
    anbieterTyp: d.anbieterTyp, publicKeyJwk: d.publicKeyJwk, issuanceDate: '2026-05-31T12:00:00Z',
    templates: d.templates,
  });
  assert.equal('template' in vc.credentialSubject, false, 'Schritt 3: kein Plain-Template im Cert (reist als templateJws-Bundle)');
  assert.equal(vc.credentialSubject.anbieterId, d.anbieterId, 'Anbieter-Daten unverändert');
  assert.ok(vc.credentialSubject.publicKeyJwk, 'Anbieter-Key (für die templateJws-Prüfung) bleibt im Cert');

  // 3) Signierter Round-Trip: Anbieter-Identität überlebt Signatur + Verifikation; der Cert trägt
  //    weiterhin KEIN eingebettetes Template.
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const jws = await V.stelleProviderCredentialAus(vc, signKey);
  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'signiert + gültig: ' + res.grund);
  assert.equal('template' in res.nutzlast.credentialSubject, false, 'auch nach Signatur kein eingebettetes Template');
  assert.ok(res.nutzlast.credentialSubject.publicKeyJwk, 'Anbieter-Key nach Signatur intakt');

  // 4) OHNE Template (manuelle Anbieter-Eingabe): credentialSubject trägt KEINEN template-Key —
  //    die reine Anbieter-Zertifizierung bleibt byte-gleich wie vor Stufe 1.
  const ohne = V.baueProviderVC(anbieterFixture());
  assert.equal('template' in ohne.credentialSubject, false, 'ohne Submission: credentialSubject ohne template');
});

test('[Klasse-A] T-A-06 Block-Integrität: VdCrypto-Hash == Kern; JWS-Block byte-identisch', () => {
  const { script1 } = ladeIssuer();
  const block = kryptoBlock(script1);
  assert.equal(sha256(block), BLOCK_HASH_ERWARTET, 'VdCrypto-Block des Issuers weicht vom erwarteten Hash ab');

  // PORT-VERBATIM.js gegenprüfen.
  const port = fs.readFileSync(path.join(REPO, 'vivodepot-krypto-kern-PORT-VERBATIM.js'), 'utf8');
  assert.equal(block, port, 'VdCrypto-Block des Issuers != PORT-VERBATIM.js');

  // JWS-Block byte-identisch zum Kern.
  const kernHtml = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const issuerHtml = fs.readFileSync(path.join(REPO, 'vivodepot-vc-issuer.html'), 'utf8');
  const jb = '// >>> VIVODEPOT-JWS-BLOCK BEGIN';
  const je = '// >>> VIVODEPOT-JWS-BLOCK END <<<';
  const kernJws = kernHtml.slice(kernHtml.indexOf(jb), kernHtml.indexOf(je) + je.length);
  const issuerJws = issuerHtml.slice(issuerHtml.indexOf(jb), issuerHtml.indexOf(je) + je.length);
  assert.equal(issuerJws, kernJws, 'JWS-Block des Issuers != JWS-Block des Kerns');
  assert.ok(kernJws.length > 1000, 'JWS-Block plausibel groß');
});

test('[Klasse-A] Issuer ist offline & ohne persistenten Speicher (statische Inspektion)', () => {
  const issuerHtml = fs.readFileSync(path.join(REPO, 'vivodepot-vc-issuer.html'), 'utf8');
  // Keine Persistenz-API-NUTZUNG (Erwähnung in Kommentaren/CSP ist erlaubt) — wir
  // prüfen auf tatsächliche Zugriffsmuster, nicht auf das blanke Wort.
  const verboteneNutzung = [
    /\blocalStorage\s*[.\[]/, /\bsessionStorage\s*[.\[]/,
    /\bindexedDB\s*[.\[]/, /\bopenDatabase\s*\(/, /document\s*\.\s*cookie\s*=/,
  ];
  for (const re of verboteneNutzung) {
    assert.ok(!re.test(issuerHtml), 'verbotene Persistenz-API-Nutzung gefunden: ' + re);
  }
  // CSP-Meta vorhanden, connect-src 'none'.
  assert.match(issuerHtml, /Content-Security-Policy/);
  assert.match(issuerHtml, /connect-src 'none'/);
  // Keine externen Ressourcen-Verweise.
  assert.equal(issuerHtml.indexOf('http://'), -1, 'kein http:// erwartet');
  assert.ok(issuerHtml.indexOf('src="http') === -1 && issuerHtml.indexOf('href="http') === -1,
    'keine externen src/href-Verweise');
});

// ── 1F (a): klassen-abhängige Cert-Laufzeit (U2-ADR-038-Nachtrag / U2-ADR-040) ──────────────
test('[Klasse-A] 1F (a): Behörden-Cert → lange Laufzeit, externe → 18-Monats-Default; opts übersteuert', () => {
  const { V } = ladeIssuer();
  const iso = '2026-06-29T00:00:00Z';
  const basis = (typ) => ({ issuer: 'did:web:vivodepot.de', anbieterId: 'x/y-de', anbieterName: 'X', anbieterTyp: typ,
    publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60' }, issuanceDate: iso });
  const behoerde = V.baueProviderVC(basis('behoerde'));
  const extern   = V.baueProviderVC(basis('institution/sparkasse-de'));
  assert.equal(behoerde.expirationDate, V.plusMonate(iso, V.ABLAUF_MONATE_BASIS), 'Behörde → lange Laufzeit');
  assert.equal(extern.expirationDate,   V.plusMonate(iso, V.ABLAUF_MONATE_DEFAULT), 'extern → 18 Monate');
  assert.equal(V.istBehoerde('behoerde/bmj'), true);
  assert.equal(V.istBehoerde('institution/x'), false);
  // Manuelle Übersteuerung schlägt den Klassen-Default (ADR-038 „pro Ausstellung übersteuerbar").
  const manuell = V.baueProviderVC(Object.assign(basis('behoerde'), { expirationDate: '2030-01-01T00:00:00Z' }));
  assert.equal(manuell.expirationDate, '2030-01-01T00:00:00Z', 'opts.expirationDate übersteuert den Klassen-Default');
});

test('[Klasse-A] 1F (a) UI: expirationFeldZuISO — Behörde bekommt den langen Default trotz generischem Boot-Wert', () => {
  const { V, document } = ladeIssuer();
  const iso = '2026-06-29T00:00:00Z';
  // leeres Feld → Klassen-Default (behoerde lang, extern 18 M)
  document.getElementById('expiration').value = '';
  assert.equal(V.expirationFeldZuISO(iso, 'behoerde'), V.plusMonate(iso, V.ABLAUF_MONATE_BASIS), 'leer + behoerde → lang');
  assert.equal(V.expirationFeldZuISO(iso, 'institution/x'), V.plusMonate(iso, V.ABLAUF_MONATE_DEFAULT), 'leer + extern → 18 M');
  // Feld trägt den generischen Boot-Wert (18 M), NICHT von Hand gesetzt (_expiryManuell=false):
  // bei Behörde gilt der lange Klassen-Default — genau der Bug, der den UI-Fluss vorher auf 18 M zog.
  document.getElementById('expiration').value = '2027-12-29T09:50';
  assert.equal(V.expirationFeldZuISO(iso, 'behoerde'), V.plusMonate(iso, V.ABLAUF_MONATE_BASIS), 'un-angefasster Boot-Wert + behoerde → lang');
  assert.notEqual(V.expirationFeldZuISO(iso, 'institution/x'), V.plusMonate(iso, V.ABLAUF_MONATE_BASIS), 'extern: kein langer Klassen-Override (Feldwert gilt)');
});

/* ════════════════════════════════════════════════════════════════════════
   Zug 4 des Auftrags „Der neue Anker" (17.08.2026) — Stapel-Ausstellung
   ────────────────────────────────────────────────────────────────────────
   Geprüft wird der DOM-FREIE Kern: stapelPruefen / stapelAusstellen /
   stapelBuendel. Die Verdrahtung der Knöpfe kann dieser Harnisch nicht
   prüfen (querySelector liefert immer ein Phantom) — sie gehört in eine
   Browser-Abnahme und ist im Bericht als solche benannt.
   ════════════════════════════════════════════════════════════════════════ */

function stapelPaket(nr, ueberschreiben) {
  const beispiel = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/beispiel-submission.json'), 'utf8'));
  // Das Schema verlangt eine UUID — eine sprechende Kennung wie „sub-stapel-1"
  // wird abgewiesen. Gemessen, nicht vermutet: `$.submissionId: pattern verletzt`.
  beispiel.submissionId = '3f2504e0-4f89-41d3-9a0c-03050000000' + (nr % 10);
  beispiel.anbieter.anbieterId = 'institution/stapel-' + nr + '-de';
  beispiel.anbieter.anbieterName = 'Stapel-Anbieter ' + nr;
  return Object.assign(beispiel, ueberschreiben || {});
}

test('[Stapel] geprüft wird vor der Ausstellung — jede Zeile trägt ihr eigenes Urteil', () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), { kaputt: true }, null, stapelPaket(4)]);
  assert.equal(zeilen.length, 4);
  assert.equal(zeilen[0].gueltig, true);
  assert.equal(zeilen[1].gueltig, false, 'ein schema-fremdes Paket muss auffallen');
  assert.match(zeilen[1].grund, /Schema-Validierung/);
  assert.equal(zeilen[2].gueltig, false);
  assert.match(zeilen[2].grund, /Kein JSON-Objekt/);
  assert.equal(zeilen[3].gueltig, true);
  // Nummern sind stabil und eins-basiert — sie sind das, was die Operatorin
  // in der Liste anklickt und im Ergebnisblatt wiederfindet.
  assert.deepEqual(zeilen.map((z) => z.nr), [1, 2, 3, 4]);
  // Und NICHTS ist vorbestätigt: die visuelle Prüfung ist eine Handlung.
  assert.equal(zeilen.some((z) => z.bestaetigt), false);
});

test('[Stapel] ohne Bestätigung wird nicht ausgestellt — F-7 wird nicht ersetzt', async () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), stapelPaket(2)]);
  zeilen[0].bestaetigt = true;            // nur der erste
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), {});
  assert.equal(lauf.ausgestellt, 1);
  assert.equal(lauf.uebersprungen, 1);
  assert.equal(lauf.zeilen[1].ausgestellt, false);
  assert.match(lauf.zeilen[1].grund, /Nicht bestätigt \(F-7\)/);
});

test('[Stapel] ein ungültiger Eintrag hält den Durchlauf NICHT an — er wird benannt übersprungen', async () => {
  const { V } = ladeIssuer();
  // Die Entscheidung, die der Auftrag im Bau verlangt: weiterlaufen, weil ein
  // Abbruch bei Eintrag 2 von 3 einen zweiten Schlüssel-Import erzwingen
  // würde — also genau das, wogegen dieser Zug gebaut ist.
  const zeilen = V.stapelPruefen([stapelPaket(1), { kaputt: true }, stapelPaket(3)]);
  for (const z of zeilen) if (z.gueltig) z.bestaetigt = true;
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), {});
  assert.equal(lauf.gesamt, 3);
  assert.equal(lauf.ausgestellt, 2, 'die gültigen Einträge NACH dem Fehler müssen ausgestellt sein');
  assert.equal(lauf.uebersprungen, 1);
  // Der übersprungene ist nicht still verloren — er hat eine eigene Zeile.
  assert.equal(lauf.zeilen[1].ausgestellt, false);
  assert.equal(lauf.zeilen[1].nr, 2);
  assert.ok(lauf.zeilen[1].grund.length > 0, 'ein übersprungener Eintrag ohne Grund wäre stiller Verlust');
});

test('[Stapel] jedes ausgestellte Zertifikat verifiziert wirklich gegen den Anker', async () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), stapelPaket(2), stapelPaket(3)]);
  for (const z of zeilen) z.bestaetigt = true;
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), {
    issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
  });
  assert.equal(lauf.ausgestellt, 3);
  const anker = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const namen = new Set();
  for (const z of lauf.zeilen) {
    const r = await V._verifyJWS(z.bundle.providerCredentialJws, anker, { jetzt: '2026-06-01T00:00:00Z' });
    assert.equal(r.gueltig, true, 'Zeile ' + z.nr + ' verifiziert nicht: ' + r.grund);
    assert.equal(r.nutzlast.credentialSubject.anbieterId, z.anbieterId);
    namen.add(z.dateiname);
  }
  // Drei Anbieter, drei Dateinamen — ein Stapel, der zweimal denselben Namen
  // erzeugt, überschreibt beim Speichern still eine Ausstellung.
  assert.equal(namen.size, 3, 'zwei Zeilen tragen denselben Dateinamen');
});

test('[Stapel] der Sentinel-Stolperdraht steht an JEDER Zeile, nicht nur an der ersten', async () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), stapelPaket(2), stapelPaket(3)]);
  for (const z of zeilen) z.bestaetigt = true;
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), { istTestSentinel: true });
  assert.equal(lauf.ausgestellt, 3);
  for (const z of lauf.zeilen) {
    assert.equal(z.istTestSentinel, true, 'Zeile ' + z.nr + ' trägt die Sentinel-Markierung nicht');
  }
  // Rot-Beleg-Gegenprobe: ohne Sentinel-Schlüssel trägt keine Zeile die Markierung.
  const zeilen2 = V.stapelPruefen([stapelPaket(9)]);
  zeilen2[0].bestaetigt = true;
  const ohne = await V.stapelAusstellen(zeilen2, (vc) => V.stelleProviderCredentialAus(vc, key), {});
  assert.equal(ohne.zeilen[0].istTestSentinel, false);
});

test('[Stapel] das Audit-Log bekommt einen Eintrag je Ausstellung — und keinen für die Übersprungenen', async () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), { kaputt: true }, stapelPaket(3)]);
  for (const z of zeilen) if (z.gueltig) z.bestaetigt = true;
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const gestempelt = [];
  await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), {
    stempelFn: (e) => gestempelt.push(e), alg: 'EdDSA',
  });
  assert.equal(gestempelt.length, 2);
  assert.equal(gestempelt.every((e) => e.stapel === true), true, 'ein Stapel-Eintrag muss als solcher erkennbar sein');
  assert.deepEqual(gestempelt.map((e) => e.anbieterId).sort(),
    ['institution/stapel-1-de', 'institution/stapel-3-de']);
});

test('[Stapel] das Bündel trägt nur die ausgestellten — kein Platz ohne Inhalt', async () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), { kaputt: true }, stapelPaket(3)]);
  for (const z of zeilen) if (z.gueltig) z.bestaetigt = true;
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), {});
  const buendel = V.stapelBuendel(lauf);
  assert.equal(buendel.anzahl, 2);
  assert.equal(buendel.zertifikate.length, 2);
  assert.equal(buendel.zertifikate.every((z) => !!z.bundle.providerCredentialJws), true);
  assert.equal(buendel.werkzeug, V.ISSUER_WERKZEUG);
  // Ein leerer Lauf ergibt ein leeres Bündel, keine Ausnahme.
  assert.equal(V.stapelBuendel(null).anzahl, 0);
  assert.equal(V.stapelBuendel({ zeilen: [] }).anzahl, 0);
});

test('[Stapel] ein Signaturfehler trifft nur seine Zeile, nicht den Durchlauf', async () => {
  const { V } = ladeIssuer();
  const zeilen = V.stapelPruefen([stapelPaket(1), stapelPaket(2), stapelPaket(3)]);
  for (const z of zeilen) z.bestaetigt = true;
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  let n = 0;
  const lauf = await V.stapelAusstellen(zeilen, (vc) => {
    n++;
    if (n === 2) throw new Error('Wegwerf-Fehler zur Probe');
    return V.stelleProviderCredentialAus(vc, key);
  }, {});
  assert.equal(lauf.ausgestellt, 2);
  assert.equal(lauf.zeilen[1].ausgestellt, false);
  assert.match(lauf.zeilen[1].grund, /Signatur fehlgeschlagen: Wegwerf-Fehler zur Probe/);
});

test('[Stapel] die Oberfläche trägt F-8 und die Freigabe bleibt zwingend', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot-vc-issuer.html'), 'utf8');
  for (const id of ['stapelDatei', 'stapelListe', 'stapelStatus', 'stapelSentinel',
                    'stapelAusstellenBtn', 'stapelBuendelBtn', 'stapelErgebnis']) {
    assert.ok(quelle.includes('id="' + id + '"'), 'die Oberfläche kennt „' + id + '" nicht');
  }
  // Struktur-Beleg: der Stapel-Durchlauf endet mit derselben Zwangsfreigabe
  // wie der Einzelweg — eine je Durchlauf statt eine je Ausstellung.
  const stelle = quelle.indexOf('async function onStapelAusstellen');
  assert.ok(stelle > 0);
  const rumpf = quelle.slice(stelle, quelle.indexOf('\nfunction onStapelBuendel', stelle));
  assert.ok(rumpf.includes('gibSchluesselFrei()'), 'der Stapel gibt den Schlüssel nicht frei');
  // Und die Ausstellung selbst darf NICHT je Zeile freigeben — sonst wäre der
  // zweite Eintrag ohne Schlüssel.
  const kern = quelle.slice(quelle.indexOf('async function stapelAusstellen'),
                            quelle.indexOf('function stapelBuendel'));
  assert.equal(kern.includes('gibSchluesselFrei'), false,
    'der DOM-freie Kern darf den Schlüssel nicht anfassen');
});
