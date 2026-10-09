'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Template-Generator (Klasse-A) — vivodepot-studio.html
   ────────────────────────────────────────────────────────────────────────
   Prüft das Institutions-Self-Service-Werkzeug (Komponente 4) End-to-End über
   seine DOM-freien Kernfunktionen plus den verbatim eingebetteten VdCrypto-/
   JWS-Block. Geprüft (Spec §Tests):

     T-A-01 Schlüsselpaar-Roundtrip — Ed25519 erzeugen, Public-JWK „exportieren“
            (Submission-Form), in leerer Session reimportieren → Key-Material
            identisch; Sign/Verify mit dem Paar gültig.
     T-A-02 Pfad-A-Template → Schema — drei Felder (Text, Datum, codiert),
            Submission-Paket validiert sich gegen submission-schema.json.
     T-A-03 Pfad-B-CSV-Import — Test-CSV (vier Felder) korrekt geparst,
            nachbearbeitbar, Submission entsteht korrekt.
     T-A-04 Konformitäts-Blockierung — Submission ohne Pflichtfeld-Definition
            blockiert mit Klartext; nach Korrektur frei.
     T-A-05 Submission-Format — erzeugtes JSON validiert gegen das eingebettete
            Schema UND gegen die Datei docs/template-generator/submission-schema.json.
     T-A-06 Import-Symmetrie — erzeugtes Paket wird vom VC-Issuer (Komponente 3)
            verlustfrei importiert (validiereSubmission == 0; Anbieter-Daten +
            publicKeyJwk übernommen; VC ausstellbar & verifizierbar).
     T-A-07 Sorge-Markierung — „Sub-tauglich“ erscheint korrekt im Paket.
     T-A-08 Block-Integrität — VdCrypto-Block-Hash == Kern (4cd539cd…);
            JWS-Block byte-identisch zum Kern.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator, kryptoBlock, sha256, BLOCK_HASH_ERWARTET, GEN_PATH } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');

// bevor mit assert.deepEqual gegen native Arrays verglichen wird.
function rein(x) { return JSON.parse(JSON.stringify(x)); }

function gueltigeStammdaten() {
  return {
    anbieterName: 'Seniorenresidenz Musterstadt',
    rechtsform: 'GmbH',
    ustId: 'DE123456789',
    strasse: 'Lindenallee 12',
    plz: '12345',
    ort: 'Musterstadt',
    land: 'Deutschland',
    kontaktName: 'Petra Beispiel',
    kontaktFunktion: 'Pflegedienstleitung',
    kontaktEmail: 'p.beispiel@seniorenresidenz-musterstadt.example.de',
    kontaktTelefon: '+49 30 1234567',
    bereich: 'health',
    useCase: 'Aufnahmebogen fuer neue Bewohnerinnen und Bewohner: Erfassung von Stammdaten, Pflegegrad und Notfallkontakten zur Uebergabe an das Pflegeteam.',
  };
}

function pfadAFelder(V) {
  return [
    { feldname: 'Vollständiger Name', feldtyp: 'text', pflicht: true, bereich: 'identity' },
    { feldname: 'Aufnahmedatum', feldtyp: 'datum', pflicht: true, bereich: 'health' },
    {
      feldname: 'Pflegegrad', feldtyp: 'auswahl', pflicht: true, bereich: 'health',
      codeSystem: 'vivodepot/pflegegrad-de',
      codeWerte: [
        { code: '1', anzeige: 'Pflegegrad 1' }, { code: '2', anzeige: 'Pflegegrad 2' },
        { code: '3', anzeige: 'Pflegegrad 3' },
      ],
    },
  ];
}

/* ── T-A-01 Schlüsselpaar-Roundtrip ──────────────────────────────────────── */
test('[Klasse-A] T-A-01 Schlüsselpaar-Roundtrip: Public-Key reimportierbar, Sign/Verify gültig', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  assert.equal(paar.publicJwk.kty, 'OKP');
  assert.equal(paar.publicJwk.crv, 'Ed25519');
  assert.ok(paar.publicJwk.x, 'Public-JWK braucht x');
  assert.ok(paar.privateJwk.d, 'Private-JWK braucht d');

  // Submission-Public-Form darf NIE 'd' enthalten.
  const pub = V.publicJwkFuerSubmission(paar.publicJwk);
  assert.ok(!('d' in pub), 'Submission-Public-Key darf kein d enthalten');
  assert.equal(pub.x, paar.publicJwk.x);

  // Reimport in einer FRISCHEN, leeren Generator-Session → Key-Material identisch.
  const { V: V2 } = ladeGenerator();
  const verifyKey = await V2._jwsImportVerifyKey(pub);
  const signKey = await V2._jwsImportSignKey(paar.privateJwk);
  const jws = await V2._signJWS({ hallo: 'welt' }, signKey, {});
  const res = await V2._verifyJWS(jws, verifyKey, {});
  assert.equal(res.gueltig, true, 'Roundtrip-Signatur muss gültig sein: ' + res.grund);
});

/* ── T-A-02 Pfad-A-Template → Schema ─────────────────────────────────────── */
test('[Klasse-A] T-A-02 Pfad-A-Template (Text/Datum/codiert) → Submission validiert', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const anbieter = V.baueAnbieter(gueltigeStammdaten());
  const paket = V.baueSubmission({
    anbieter, publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
    ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false,
  });
  const fehler = rein(V.validiereSubmission(paket));
  assert.deepEqual(fehler, [], 'Pfad-A-Paket muss schema-konform sein: ' + JSON.stringify(fehler));
  assert.equal(paket.templates[0].felder.length, 3);
  assert.equal(paket.templates[0].felder[2].feldtyp, 'auswahl');
  assert.equal(paket.templates[0].felder[2].codeWerte.length, 3);
});

/* ── T-A-03 Pfad-B-CSV-Import ────────────────────────────────────────────── */
test('[Klasse-A] T-A-03 CSV-Import: vier Felder geparst, nachbearbeitbar, Submission korrekt', async () => {
  const { V } = ladeGenerator();
  const csv = [
    'feldname,feldtyp,pflicht,bereich,code_system,code_werte',
    'Vollständiger Name,Text,ja,identity,,',
    'Geburtsdatum,Datum,ja,identity,,',
    'Körpergewicht,Zahl,nein,Gesundheit,http://loinc.org,29463-7:Körpergewicht',
    '"Vorerkrankungen, codiert",Mehrfach-Auswahl,nein,Gesundheit,http://hl7.org/fhir/sid/icd-10-gm,E11.9:Diabetes;I10.90:Hypertonie',
  ].join('\n');
  const felder = V.csvZuFelder(csv);
  assert.equal(felder.length, 4, 'vier Felder erwartet');
  assert.equal(felder[0].feldtyp, 'text');
  assert.equal(felder[1].feldtyp, 'datum');
  assert.equal(felder[2].codeSystem, 'http://loinc.org');
  assert.equal(felder[3].feldtyp, 'mehrfachauswahl');
  assert.equal(felder[3].feldname, 'Vorerkrankungen, codiert', 'CSV-Quoting (Komma im Feld) muss erhalten bleiben');
  assert.equal(felder[3].codeWerte.length, 2);

  // Nachbearbeitung (Pfad A): ein Feld zur Pflicht machen.
  felder[2].pflicht = true;
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder,
  });
  assert.deepEqual(rein(V.validiereSubmission(paket)), []);
});

/* ── T-A-04 Konformitäts-Blockierung ─────────────────────────────────────── */
test('[Klasse-A] T-A-04 Konformität: unvollständiges Feld blockiert, Korrektur löst', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const anbieter = V.baueAnbieter(gueltigeStammdaten());

  // Feld ohne gültigen Bereich + Auswahl ohne Code-Werte → Blocker.
  const kaputt = V.pruefeKonformitaet({
    anbieter, publicKeyJwk: paar.publicJwk,
    felder: [{ feldname: 'Status', feldtyp: 'auswahl', pflicht: true, bereich: 'NichtExistent', codeWerte: [] }],
  });
  assert.ok(kaputt.blocker.length > 0, 'unvollständiges Feld muss blockieren');
  assert.ok(kaputt.blocker.some((b) => /Bereich/.test(b)), 'Bereich-Fehler in Klartext');
  assert.ok(kaputt.blocker.some((b) => /Code-Werte/.test(b)), 'Code-Werte-Fehler in Klartext');

  // Leeres Template blockiert ebenfalls.
  const leer = V.pruefeKonformitaet({ anbieter, publicKeyJwk: paar.publicJwk, felder: [] });
  assert.ok(leer.blocker.some((b) => /kein Feld/.test(b)));

  // Korrektur → keine Blocker mehr.
  const ok = V.pruefeKonformitaet({
    anbieter, publicKeyJwk: paar.publicJwk,
    felder: [{ feldname: 'Status', feldtyp: 'auswahl', pflicht: true, bereich: 'health', codeSystem: 'vivodepot/x', codeWerte: [{ code: 'a', anzeige: 'A' }] }],
  });
  assert.deepEqual(rein(ok.blocker), [], 'nach Korrektur keine Blocker: ' + JSON.stringify(rein(ok.blocker)));
});

/* ── T-A-05 Submission-Format gegen Datei-Schema ─────────────────────────── */
test('[Klasse-A] T-A-05 Submission-Format: gegen docs/.../submission-schema.json valide', async () => {
  const { V } = ladeGenerator();
  const dateiSchema = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/submission-schema.json'), 'utf8'));
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
  });
  // submissionId muss UUID-v4-Muster erfüllen.
  assert.match(paket.submissionId, /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/);
  // Gegen das eingebettete Schema.
  assert.deepEqual(rein(V.validiereSubmission(paket)), []);
  // Gegen die Datei (über den geteilten Validator).
  assert.deepEqual(rein(V._validateSchema(dateiSchema, paket)), [], 'muss auch gegen das Datei-Schema validieren');
});

/* ── T-A-06 Import-Symmetrie via VC-Issuer ───────────────────────────────── */
test('[Klasse-A] T-A-06 Import-Symmetrie: VC-Issuer importiert Generator-Paket verlustfrei', async () => {
  const { V } = ladeGenerator();
  const { V: ISS } = ladeIssuer();

  const paar = await V.erzeugeSchluesselpaarRoh();
  const anbieter = V.baueAnbieter(gueltigeStammdaten());
  const paket = V.baueSubmission({
    anbieter, publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
    ankerTauglich: true, subTauglich: true, sorgerechtTauglich: false,
  });

  const paketJson = JSON.parse(JSON.stringify(paket));

  // 1) VC-Issuer validiert das Paket gegen SEIN eingebettetes Schema → 0 Fehler.
  assert.deepEqual(rein(ISS.validiereSubmission(paketJson)), [], 'VC-Issuer muss das Paket akzeptieren');

  // 2) VC-Issuer übernimmt Anbieter-Daten + publicKeyJwk verlustfrei.
  const daten = ISS.submissionZuAnbieterDaten(paketJson);
  assert.equal(daten.anbieterId, paket.anbieter.anbieterId);
  assert.equal(daten.anbieterName, paket.anbieter.anbieterName);
  assert.equal(daten.anbieterTyp, paket.anbieter.anbieterTyp);
  assert.equal(daten.submissionId, paket.submissionId);
  assert.equal(daten.publicKeyJwk.x, paket.publicKeyJwk.x);
  assert.equal(daten.publicKeyJwk.kty, 'OKP');

  // 3) Public-Key-Validierung des Issuers akzeptiert den Generator-Key.
  const pk = ISS.validiereAnbieterPublicKey(JSON.parse(JSON.stringify(paket.publicKeyJwk)));
  assert.equal(pk.ok, true, 'Issuer-Public-Key-Validierung muss bestehen: ' + JSON.stringify(pk.fehler));

  // 4) VC bauen aus den übernommenen Daten → mit dem Generator-Private-Key signieren → verifizieren.
  const vc = ISS.baueProviderVC({
    anbieterId: daten.anbieterId, anbieterName: daten.anbieterName,
    anbieterTyp: daten.anbieterTyp, publicKeyJwk: daten.publicKeyJwk,
    issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
  });
  const signKey = await ISS._jwsImportSignKey(JSON.parse(JSON.stringify(paar.privateJwk)));
  const verifyKey = await ISS._jwsImportVerifyKey(JSON.parse(JSON.stringify(paket.publicKeyJwk)));
  const jws = await ISS.stelleProviderCredentialAus(vc, signKey);
  const res = await ISS._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'mit Generator-Schlüssel signiertes VC muss gegen Generator-Public-Key verifizieren: ' + res.grund);
});

/* ── T-A-07 Sorge-Markierung — UMGEDREHT AM 20.08.2026 ───────────────────────
   Die drei Tauglichkeits-Flags sind entfallen (Produktentscheidung). Diese Probe
   hielt fest, dass sie ins Paket kommen; sie hält ab jetzt fest, dass sie es NICHT mehr
   tun — und dass ein bereits signiertes Bündel mit ihnen trotzdem gültig bleibt. Der
   zweite Teil ist der eigentliche Prüfpunkt des Postens: eine Streichung, die alte
   Bündel ungültig machte, wäre ein Bruch der Signatur-Kette. */
test('[Klasse-A] T-A-07 Sorge-Markierung: die drei Flags kommen NICHT mehr ins Paket', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
  });
  for (const k of ['ankerTauglich', 'subTauglich', 'sorgerechtTauglich']) {
    assert.equal(Object.prototype.hasOwnProperty.call(paket.templates[0], k), false,
      k + ' wird nicht mehr geschrieben');
  }
  assert.deepEqual(rein(V.validiereSubmission(paket)), [], 'und ein Paket ohne sie ist gültig');
});

test('[Klasse-A · Rot-Beweis] ein ALTES, signiertes Paket MIT den drei Flags bleibt gültig', async () => {
  /* Die Auflage des Postens, wörtlich: „Jede Lese-Seite duldet die drei Felder in bereits
     signierten Bündeln und ignoriert sie." Geprüft wird gegen das Einreich-Schema selbst —
     es steht auf `additionalProperties: false`, und genau darum bleiben die drei unter
     `properties` stehen, obwohl sie nicht mehr unter `required` stehen. */
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const alt = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
  });
  alt.templates[0].ankerTauglich = true;
  alt.templates[0].subTauglich = false;
  alt.templates[0].sorgerechtTauglich = false;
  assert.deepEqual(rein(V.validiereSubmission(alt)), [],
    'ein ausgeliefertes Bündel trägt die Felder — es darf daran nicht scheitern');
});

test('[Klasse-A · Gegenprobe] ein ERFUNDENES Feld im template wird weiter abgewiesen', async () => {
  /* Die Duldung gilt genau diesen dreien, nicht allem: `additionalProperties: false` bleibt
     scharf. Ohne diese Gegenprobe hiesse „geduldet" womöglich „alles geht durch". */
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
  });
  paket.templates[0].irgendwasNeues = true;
  assert.notDeepEqual(rein(V.validiereSubmission(paket)), [], 'ein unbekanntes Feld bleibt ein Fehler');
});

/* „Prüfung: ist validiereSubmission wirklich im Abgabefluss verdrahtet?" (25.08.2026):
   der 22./23.08.-Befund „unbekannte/zusätzliche Felder werden nicht abgelehnt" bezog sich auf ein
   fertiges EINREICH-Paket, nicht auf den CSV/Formular-Bauschritt (dort gilt seit A507/U2-ADR-170
   bewusst Normalisierung-mit-Hinweis statt Blockade, ein enger, dokumentierter Sonderfall). Die
   vorhandene Gegenprobe oben deckte nur die TEMPLATE-Ebene und nur den Generator-Validator ab —
   diese Probe schließt die Lücke: TOP-LEVEL-Zusatzfeld an einem fertigen Paket, BEIDE Validatoren
   (Generator UND VC-Issuer — dieselbe Schema-Kopie, s. T-CROSS-08, aber ein eigener Aufruf pro
   Komponente, damit ein künftiges Auseinanderlaufen der beiden Kopien hier ebenfalls auffiele). */
test('[Klasse-A · Gegenprobe] ein Zusatzfeld auf PAKET-Ebene (nicht nur im template) wird von BEIDEN Validatoren abgewiesen', async () => {
  const { V: GEN } = ladeGenerator();
  const paar = await GEN.erzeugeSchluesselpaarRoh();
  const paket = GEN.baueSubmission({
    anbieter: GEN.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(GEN),
  });
  assert.deepEqual(rein(GEN.validiereSubmission(paket)), [], 'Vorbedingung: das unveränderte Paket ist gültig');

  paket.hackerFeld = 'sollte abgelehnt werden';
  const genFehler = rein(GEN.validiereSubmission(paket));
  assert.notDeepEqual(genFehler, [], 'Generator: ein Top-Level-Zusatzfeld bleibt ein Fehler');
  assert.ok(genFehler.some((f) => /hackerFeld/.test(f)), 'der Fehler benennt das unbekannte Feld: ' + genFehler.join(', '));

  const { V: ISS } = ladeIssuer();
  const issFehler = rein(ISS.validiereSubmission(paket));
  assert.notDeepEqual(issFehler, [], 'VC-Issuer: derselbe Fall wird ebenfalls abgewiesen, nicht nur der Generator');
  assert.ok(issFehler.some((f) => /hackerFeld/.test(f)), 'der Fehler benennt das unbekannte Feld: ' + issFehler.join(', '));
});

/* ── T-A-08 Block-Integrität ─────────────────────────────────────────────── */
test('[Klasse-A] T-A-08 Block-Integrität: VdCrypto-Hash == Kern; JWS byte-identisch', () => {
  const { script1, script2 } = ladeGenerator();
  // VdCrypto-Block-Hash byte-identisch zur Bürger-App / zum Issuer.
  assert.equal(sha256(kryptoBlock(script1)), BLOCK_HASH_ERWARTET, 'VdCrypto-Block-Hash muss 4cd539cd… sein');

  // JWS-Block byte-identisch zum Kern.
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const B = '// >>> VIVODEPOT-JWS-BLOCK BEGIN', E = '// >>> VIVODEPOT-JWS-BLOCK END <<<';
  const kernJws = kern.slice(kern.indexOf(B), kern.indexOf(E) + E.length);
  const genJws = script2.slice(script2.indexOf(B), script2.indexOf(E) + E.length);
  assert.ok(kernJws.length > 0 && genJws.length > 0, 'JWS-Block in beiden gefunden');
  assert.equal(genJws, kernJws, 'JWS-Block muss byte-identisch zum Kern sein');
});

/* ── K9 („K9 — fremde Vorlagen, Weg C", 10.08.2026), Zug 3 ─────────
   Der Generator bekommt sein Wortlaut-Eingabefeld — bisher trug NUR der
   `?intern=basistemplate`-Sonderweg wortlaut+wortlautQuelle. baueSubmission
   liest sie jetzt additiv aus dem regulären State (leer bleibt der Regelfall,
   reine Formularfelder wie bisher). ────────────────────────────────────────*/
test('[K9] baueSubmission OHNE wortlaut: template trägt kein wortlaut-Feld (unverändertes Verhalten)', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
  });
  assert.equal('wortlaut' in paket.templates[0], false, 'kein wortlaut-Schlüssel, wenn keiner eingetragen wurde');
  assert.deepEqual(rein(V.validiereSubmission(paket)), []);
});

test('[K9] baueSubmission MIT wortlaut: template trägt wortlaut+wortlautQuelle, Paket bleibt schema-konform', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = V.baueSubmission({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
    wortlaut: 'Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest.',
    wortlautQuelle: { behoerde: 'Musterversicherung AG', titel: 'Vorsorge-Erklärung Muster', lizenz: 'mit Zustimmung der Musterversicherung AG' },
  });
  assert.equal(paket.templates[0].wortlaut, 'Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest.');
  assert.equal(paket.templates[0].wortlautQuelle.behoerde, 'Musterversicherung AG');
  const fehler = rein(V.validiereSubmission(paket));
  assert.deepEqual(fehler, [], 'ein Paket mit wortlaut muss weiterhin schema-konform sein: ' + JSON.stringify(fehler));
});

test('[K9] Zug 3 Parität: der REGULÄRE Weg kann denselben signierten Inhalt erzeugen wie der ?intern=basistemplate-Sonderweg', async () => {
  // Beweis, dass der Sonderweg entfallen darf (Auftragswortlaut: „aber erst, wenn der reguläre
  // Weg nachweislich dasselbe kann"). basistemplate-inhalte.json ist die Quelle, die der interne
  // Treuhand-Weg batch-signiert (basistemplateTreuhandSignieren); hier wird DASSELBE Element
  // (living-will) über den regulären State-Weg (baueSubmissionSigniert) nachgebaut und
  // der INHALTS-Hash (dieselbe Kanonisierung, die die Bürger-App zur Inhaltsbindung nutzt)
  // verglichen — nicht nur „es entsteht irgendein templateJws".
  const inhalte = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'template-generator', 'basistemplate-inhalte.json'), 'utf8'));
  const pv = inhalte.find((x) => x.id === 'patientenverfuegung');
  assert.ok(pv, 'Positivkontrolle: living-will steht in basistemplate-inhalte.json');

  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = await V.baueSubmissionSigniert({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk,
    felder: pv.felder.map((f) => ({
      feldname: f.feldname, feldtyp: f.feldtyp, pflicht: !!f.pflicht, bereich: f.bereich,
    })),
    wortlaut: pv.wortlaut,
    wortlautQuelle: pv.wortlautQuelle,
    wortlautQuelleBroschuere: pv.wortlautQuelleBroschuere,
  }, paar.privateJwk);

  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(paket.templatesJws[0], verifyKey, {});
  assert.equal(res.gueltig, true, 'templateJws muss verifizieren: ' + res.grund);
  // Derselbe Inhalts-Vergleich, den die Bürger-App für die Signatur-Bindung nutzt (_basisInhalt/
  // _kanonischJSON, s. vivodepot.html) — hier von Hand nachvollzogen, da diese Datei den Generator
  // testet, nicht den Kern. Nur die inhaltstragenden Schlüssel zählen (Metadaten wie generatorVersion
  // nicht).
  const inhaltsSchluessel = ['felder', 'wortlaut', 'wortlautQuelle', 'wortlautQuelleBroschuere'];
  const kanonisch = (x) => {
    const o = {}; for (const k of inhaltsSchluessel) if (x[k] !== undefined) o[k] = x[k];
    return JSON.stringify(o, Object.keys(o).sort());
  };
  assert.equal(kanonisch(res.nutzlast), kanonisch(pv),
    'der über den regulären Weg erzeugte Inhalt muss inhaltsgleich zum Treuhand-Weg-Inhalt sein');
});

test('[K9] baueSubmissionSigniert MIT wortlaut: templateJws trägt den wortlaut mitsigniert, verifiziert gegen sich selbst', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const paket = await V.baueSubmissionSigniert({
    anbieter: V.baueAnbieter(gueltigeStammdaten()), publicKeyJwk: paar.publicJwk, felder: pfadAFelder(V),
    wortlaut: 'Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest.',
    wortlautQuelle: { behoerde: 'Musterversicherung AG', titel: 'Vorsorge-Erklärung Muster', lizenz: 'mit Zustimmung der Musterversicherung AG' },
  }, paar.privateJwk);
  assert.ok(paket.templatesJws && paket.templatesJws[0], 'ein templateJws entsteht');
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(paket.templatesJws[0], verifyKey, {});
  assert.equal(res.gueltig, true, 'templateJws muss gegen den Public-Key verifizieren: ' + res.grund);
  assert.equal(res.nutzlast.wortlaut, 'Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest.', 'der wortlaut ist Teil der signierten Nutzlast');
});

/* ── Zusatz: keine Persistenz-/Netzwerk-Aufrufe in der Quelle ─────────────── */
test('[Klasse-A] Sicherheit: kein Storage, kein Netzwerk in der Generator-Quelle', () => {
  const html = fs.readFileSync(GEN_PATH, 'utf8');
  // Ausführungs-Muster (nicht bloße Erwähnungen in Kommentaren/Doku):
  [/localStorage\s*[.\[]/, /sessionStorage\s*[.\[]/, /indexedDB\s*[.\[]/, /document\.cookie\s*=/,
   /new\s+XMLHttpRequest/, /(^|[^.\w])fetch\s*\(/, /new\s+WebSocket/, /new\s+EventSource/, /navigator\.sendBeacon\s*\(/]
    .forEach((re) => assert.equal(re.test(html), false, 'verbotenes Ausführungs-Muster gefunden: ' + re));
  // CSP-Meta vorhanden mit connect-src 'none'
  assert.ok(/Content-Security-Policy/.test(html), 'CSP-Meta muss vorhanden sein');
  assert.ok(/connect-src 'none'/.test(html), "CSP muss connect-src 'none' setzen");
  // Keine window.confirm/prompt.
  assert.equal(html.indexOf('confirm('), -1, 'kein window.confirm');
  assert.equal(html.indexOf('prompt('), -1, 'kein window.prompt');
});

/* ── EINLASS_REGISTER-Ausbau, institutionsArt (27.08.2026) ─────────────────────────────────
   Dritte Ausgabeart. Die Prüfung hier ist bewusst gegen den ECHTEN Kern-Einlassweg gestellt
   (nicht nur gegen den Mirror im Generator selbst) — sonst befragt sich der Erzeuger nur
   selbst, wie der Fund vom 20.08. es für die Feldarten schon einmal zeigte. */
test('[IA-01] eine gültige Institutions-Art wird gebaut und vom echten Kern-Einlassweg angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { institutionsArt: { moduleVersion: 1, sprache: 'de', herkunft: 'fr-kammer', arten: [{ kennung: 'notaire', label: 'Notariat' }] } };
  const modul = GEN.baueInstitutionsArtModul(state);
  assert.deepEqual(rein(modul), { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de', arten: { notaire: 'Notariat' }, herkunft: 'fr-kammer' });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'der echte Kern nimmt das erzeugte Modul an: ' + r.grund);
  assert.equal(r.kennung, 'fr-kammer');
  assert.deepEqual(rein(KERN.getData().institutionsArten[0].arten), { notaire: 'Notariat' });
});

test('[IA-02] eine reservierte Kennung wird verworfen, das Modul bleibt trotzdem gültig', () => {
  const { V } = ladeGenerator();
  const state = { institutionsArt: { moduleVersion: 1, sprache: 'de', herkunft: 'x', arten: [{ kennung: 'notaire', label: 'Notariat' }, { kennung: 'krankenkasse', label: 'x' }] } };
  const p = V.pruefeInstitutionsArt(state);
  assert.equal(p.blocker.length, 0);
  assert.deepEqual(rein(p.geprueft.arten), { notaire: 'Notariat' }, 'krankenkasse ist eine der zwölf eingebauten Arten');
  assert.equal(p.warnungen.length, 1);
  assert.match(p.warnungen[0], /krankenkasse/);
});

test('[IA-03·Rot-Beweis] ohne Sprache blockiert die Prüfung mit Klartext', () => {
  const { V } = ladeGenerator();
  const state = { institutionsArt: { moduleVersion: 1, sprache: '', herkunft: 'x', arten: [{ kennung: 'notaire', label: 'Notariat' }] } };
  const p = V.pruefeInstitutionsArt(state);
  assert.deepEqual(rein(p.blocker), ['Die Sprache fehlt.']);
});

test('[IA-04·Rot-Beweis] eine ungültige Sprachform (kein BCP-47-artiger Code) blockiert', () => {
  const { V } = ladeGenerator();
  const state = { institutionsArt: { moduleVersion: 1, sprache: 'Deutsch', herkunft: 'x', arten: [{ kennung: 'notaire', label: 'Notariat' }] } };
  const p = V.pruefeInstitutionsArt(state);
  assert.equal(p.blocker.length, 1);
  assert.match(p.blocker[0], /Sprachkennung/);
});

test('[IA-05] eine Zeile ohne Kennung wird beim Bauen still übergangen, keine leere Kennung im Modul', () => {
  const { V } = ladeGenerator();
  const modul = V.baueInstitutionsArtModul({ institutionsArt: { moduleVersion: 1, sprache: 'de', arten: [{ kennung: '', label: 'ohne Kennung' }, { kennung: 'notaire', label: 'Notariat' }] } });
  assert.deepEqual(Object.keys(modul.arten), ['notaire']);
});

test('[IA-06] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = { publicKeyJwk: paar.publicJwk, institutionsArt: { moduleVersion: 1, sprache: 'de', herkunft: 'x', arten: [{ kennung: 'notaire', label: 'Notariat' }] } };
  const umschlag = await V.baueInstitutionsArtSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws, 'eine Signatur entsteht');
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
  assert.deepEqual(rein(res.nutzlast.arten), { notaire: 'Notariat' });
});

test('[IA-07] ohne Private-Key entsteht additiv ein unsignierter Umschlag, kein Fehler', async () => {
  const { V } = ladeGenerator();
  const state = { institutionsArt: { moduleVersion: 1, sprache: 'de', herkunft: 'x', arten: [{ kennung: 'notaire', label: 'Notariat' }] } };
  const umschlag = await V.baueInstitutionsArtSigniert(state, null);
  assert.equal(umschlag.modulSignaturJws, undefined);
  assert.equal(umschlag.format, 'vivodepot-institutionsart@1');
});

test('[IA-08] institutionsArtModulPruefen im Generator ist wortgleich zum Kern-Prüfer (Gegenprobe je Grund)', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const faelle = [
    { modulTyp: 'institutionsArt', moduleVersion: 0, sprache: 'de', arten: {} },
    { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: '', arten: { a: 'A' } },
    { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de', arten: 'kein-objekt' },
    { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de', arten: { krankenkasse: 'x', notaire: 'Notariat' } },
    // Regressions-Fall (27.08.2026): leeres arten braucht KEINE Sprache — ein Modul ohne
    // Beschriftung hat nichts zu beschriften. Stand vor dem Fund: der Mirror verlangte hier
    // unbedingt Sprache und wich vom Kern ab.
    { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: '', arten: {} },
  ];
  for (const f of faelle) {
    const g = GEN.institutionsArtModulPruefen(f);
    const k = KERN.institutionsArtModulPruefen ? KERN.institutionsArtModulPruefen(f) : null;
    if (k) assert.deepEqual(rein(g), rein(k), 'Generator- und Kern-Prüfer müssen für denselben Fall dasselbe liefern: ' + JSON.stringify(f));
  }
});

/* ── EINLASS_REGISTER-Ausbau, bereich (27.08.2026) ─────────────────────────────────────────
   Nur id/label/icon (Maske), das ist bewusst eine ENGERE Teilmenge als der volle Kern-
   Prüfer (der auch merkmale/rollen kennt) — darum hier KEIN Wortgleich-Test wie bei IA-08,
   sondern GRUND-Parität je Ablehnungsfall (die tatsächlich prüfbare Übereinstimmung). */
test('[BM-01] ein gültiger Bereich wird gebaut und vom echten Kern-Einlassweg angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { bereich: { moduleVersion: 1, sprache: 'de', herkunft: 'fr-anbieter', bereiche: [{ id: 'pets', label: 'Haustiere', icon: 'paw' }] } };
  const modul = GEN.baueBereichModul(state);
  assert.deepEqual(rein(modul), { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fr-anbieter', sprache: 'de', bereiche: { pets: { label: 'Haustiere', icon: 'paw' } } });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'der echte Kern nimmt das erzeugte Modul an: ' + r.grund);
  assert.equal(r.kennung, 'fr-anbieter');
});

test('[BM-02] eine reservierte ID (bestehender Sektor) wird verworfen, das Modul bleibt gültig', () => {
  const { V } = ladeGenerator();
  const state = { bereich: { moduleVersion: 1, sprache: 'de', herkunft: 'x', bereiche: [{ id: 'pets', label: 'Haustiere' }, { id: 'health', label: 'x' }] } };
  const p = V.pruefeBereich(state);
  assert.equal(p.blocker.length, 0);
  assert.deepEqual(rein(p.geprueft.bereiche), { pets: { label: 'Haustiere', icon: 'folder' } });
  assert.equal(p.warnungen.length, 1);
  assert.match(p.warnungen[0], /health/);
});

test('[BM-03·Rot-Beweis] ohne Herkunft blockiert die Prüfung — anders als institutionsArt ist herkunft hier Pflicht', () => {
  const { V } = ladeGenerator();
  const state = { bereich: { moduleVersion: 1, sprache: 'de', herkunft: '', bereiche: [{ id: 'pets', label: 'Haustiere' }] } };
  const p = V.pruefeBereich(state);
  assert.deepEqual(rein(p.blocker), ['Die Herkunft (Ihre Anbieter-Kennung) fehlt.']);
});

test('[BM-04·Rot-Beweis] ohne einen einzigen gültigen Bereich blockiert die Prüfung mit „leer"', () => {
  const { V } = ladeGenerator();
  const state = { bereich: { moduleVersion: 1, sprache: 'de', herkunft: 'x', bereiche: [] } };
  const p = V.pruefeBereich(state);
  assert.deepEqual(rein(p.blocker), ['Es ist kein einziger gültiger Bereich eingetragen.']);
});

test('[BM-05] eine Zeile ohne ID wird beim Bauen still übergangen, kein leerer Schlüssel im Modul', () => {
  const { V } = ladeGenerator();
  const modul = V.baueBereichModul({ bereich: { moduleVersion: 1, sprache: 'de', herkunft: 'x', bereiche: [{ id: '', label: 'ohne ID' }, { id: 'pets', label: 'Haustiere' }] } });
  assert.deepEqual(Object.keys(modul.bereiche), ['pets']);
});

test('[BM-06] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = { publicKeyJwk: paar.publicJwk, bereich: { moduleVersion: 1, sprache: 'de', herkunft: 'x', bereiche: [{ id: 'pets', label: 'Haustiere' }] } };
  const umschlag = await V.baueBereichSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws, 'eine Signatur entsteht');
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
});

test('[BM-07] ohne Private-Key entsteht additiv ein unsignierter Umschlag, kein Fehler', async () => {
  const { V } = ladeGenerator();
  const state = { bereich: { moduleVersion: 1, sprache: 'de', herkunft: 'x', bereiche: [{ id: 'pets', label: 'Haustiere' }] } };
  const umschlag = await V.baueBereichSigniert(state, null);
  assert.equal(umschlag.modulSignaturJws, undefined);
  assert.equal(umschlag.format, 'vivodepot-bereich@1');
});

test('[BM-08] Grund-Parität mit dem echten Kern-Prüfer für jeden Ablehnungsfall der Maske', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const faelle = [
    { modulTyp: 'bereich', moduleVersion: 0, herkunft: 'x', sprache: 'de', bereiche: {} },
    { modulTyp: 'bereich', moduleVersion: 1, herkunft: '', sprache: 'de', bereiche: {} },
    { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'x', sprache: '', bereiche: { a: { label: 'A' } } },
    { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'x', sprache: 'de', bereiche: {} },
    { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'x', sprache: 'de', bereiche: { gesundheit: { label: 'x' } } },
    // Regressions-Fall (27.08.2026): leeres bereiche braucht KEINE Sprache — muss trotzdem an
    // „leer" scheitern (kein gültiger Bereich), nicht an „sprache". Fund beim rechtsraum-Ausbau:
    // der Mirror verlangte Sprache unbedingt, noch bevor „leer" je geprüft wurde.
    { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'x', sprache: '', bereiche: {} },
  ];
  for (const f of faelle) {
    const g = GEN.bereichsModulPruefen(f);
    const k = KERN.bereichsModulPruefen(f);
    assert.equal(g.gueltig, k.gueltig, 'gueltig muss übereinstimmen: ' + JSON.stringify(f));
    assert.equal(g.grund, k.grund, 'grund muss übereinstimmen: ' + JSON.stringify(f));
  }
});

/* ── Strang D (17.09.2026), sechste Ausgabeart, wizard ─────────────────────────────────────
   DERSELBE JWS-Weg wie bereich (baueBereichModul/pruefeBereich/baueBereichSigniert) — anders
   als bereich baut dieses Werkzeug aber keinen leeren Rahmen: ein Assistent ohne Schritte ist
   ungültig. Die Schritte selbst reisen als fertiger JSON-Text (`schritteJson`), dieses
   Werkzeug entwirft sie nicht (s. Kopf-Kommentar an wizardsModulPruefen im Generator). */
test('[WM-01] ein gültiger Assistent (Ziel: Bereich) wird gebaut und vom echten Kern-Einlassweg angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  // Ziel: BEREICH, nicht Situation — s. WM-01b und den Kopf-Kommentar an
  // wizardsModulPruefen im Generator: ein Ziel-Sektor bleibt beim echten Einlass immer offen
  // (Baukasten III), ein Wizard-eigenes Feld auf eine NATIVE Ziel-SITUATION nur, wenn die
  // Situation es bereits führt — genau die Prüfung, die diese Maske bewusst nicht kennt.
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'fr-anbieter', wizards: [
    { id: 'mein-wiz', titel: 'Mein Assistent', icon: 'star', zielTyp: 'sektor', zielWert: 'identity',
      schritteJson: JSON.stringify([{ feld: { id: 'freitext', typ: 'text' }, frage: 'Ihre Frage?' }]) },
  ] } };
  const modul = GEN.baueWizardModul(state);
  assert.deepEqual(rein(modul), {
    modulTyp: 'wizard', moduleVersion: 1, herkunft: 'fr-anbieter', sprache: 'de',
    wizards: { 'mein-wiz': { titel: 'Mein Assistent', icon: 'star', ziel: { sektor: 'identity' },
      schritte: [{ feld: { id: 'freitext', typ: 'text' }, frage: 'Ihre Frage?' }] } },
  });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'der echte Kern nimmt das erzeugte Modul an: ' + r.grund);
  assert.equal(r.kennung, 'fr-anbieter');
});

test('[WM-01b·Rot-Beweis] Ziel: eine native Situation mit einem neuen, dort unbekannten Feld — die Maske meldet gültig, der echte Kern lehnt trotzdem ab (dokumentierte Grenze der Maske, „Lücke 2")', () => {
  // Beweist, dass die im Kopf-Kommentar an wizardsModulPruefen (Generator) behauptete
  // Auslassung real ist, nicht nur eine Behauptung: dieselbe Situation, wie sie WM-01
  // stattdessen umgeht. Ohne diese Probe wäre WM-01s Wahl von `zielTyp:'sektor'` ein
  // stiller Kompromiss statt einer belegten Entscheidung.
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'fr-anbieter', wizards: [
    { id: 'mein-wiz', titel: 'Mein Assistent', zielTyp: 'situation', zielWert: 'geburt',
      schritteJson: JSON.stringify([{ feld: { id: 'freitext', typ: 'text' }, frage: 'Ihre Frage?' }]) },
  ] } };
  const p = GEN.pruefeWizard(state);
  assert.equal(p.blocker.length, 0, 'die Maske selbst sieht keinen Grund zur Ablehnung — genau die Lücke');
  const modul = GEN.baueWizardModul(state);
  const echtesUrteil = KERN.wizardsModulPruefen(modul);
  assert.equal(echtesUrteil.gueltig, false, 'der echte Kern-Prüfer lehnt trotzdem ab');
  assert.equal(echtesUrteil.verworfene[0] && echtesUrteil.verworfene[0].grund, 'ziel-feld');
});

test('[WM-02] eine reservierte ID (nativer Assistent) wird verworfen, das Modul bleibt gültig, wenn ein anderer Assistent steht', () => {
  const { V } = ladeGenerator();
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'x', wizards: [
    { id: 'gebwiz', titel: 'x', zielTyp: 'situation', zielWert: 'geburt', schritteJson: JSON.stringify([{ feld: { id: 'f' }, frage: 'F?' }]) },
    { id: 'mein-wiz', titel: 'Mein Assistent', zielTyp: 'situation', zielWert: 'geburt', schritteJson: JSON.stringify([{ feld: { id: 'f' }, frage: 'F?' }]) },
  ] } };
  const p = V.pruefeWizard(state);
  assert.equal(p.blocker.length, 0, JSON.stringify(p.blocker));
  assert.deepEqual(Object.keys(rein(p.geprueft.wizards).reduce((o, w) => (o[w.id] = true, o), {})), ['mein-wiz']);
  assert.equal(p.warnungen.length, 1);
  assert.match(p.warnungen[0], /gebwiz/);
});

test('[WM-03·Rot-Beweis] ohne Herkunft blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: '', wizards: [
    { id: 'mein-wiz', titel: 'T', zielTyp: 'situation', zielWert: 'geburt', schritteJson: JSON.stringify([{ feld: { id: 'f' }, frage: 'F?' }]) },
  ] } };
  const p = V.pruefeWizard(state);
  assert.deepEqual(rein(p.blocker), ['Die Herkunft (Ihre Anbieter-Kennung) fehlt.']);
});

test('[WM-04·Rot-Beweis] ohne einen einzigen gültigen Assistenten blockiert die Prüfung mit „leer"', () => {
  const { V } = ladeGenerator();
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'x', wizards: [] } };
  const p = V.pruefeWizard(state);
  assert.deepEqual(rein(p.blocker), ['Es ist kein einziger gültiger Assistent eingetragen.']);
});

test('[WM-05·Rot-Beweis] Schritte als ungültiges JSON blockiert VOR dem Kern-Prüfer, mit eigenem Text', () => {
  const { V } = ladeGenerator();
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'x', wizards: [
    { id: 'mein-wiz', titel: 'T', zielTyp: 'situation', zielWert: 'geburt', schritteJson: '{kaputt' },
  ] } };
  const p = V.pruefeWizard(state);
  assert.equal(p.blocker.length, 2, 'JSON-Blocker UND der Kern-Blocker (leer, da kein gültiger Schritt entstand)');
  assert.match(p.blocker[0], /Schritte bei „mein-wiz“.*ungültiges JSON/);
});

test('[WM-06] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = { publicKeyJwk: paar.publicJwk, wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'x', wizards: [
    { id: 'mein-wiz', titel: 'T', zielTyp: 'situation', zielWert: 'geburt', schritteJson: JSON.stringify([{ feld: { id: 'f' }, frage: 'F?' }]) },
  ] } };
  const umschlag = await V.baueWizardSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws, 'eine Signatur entsteht');
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
});

test('[WM-07] ohne Private-Key entsteht additiv ein unsignierter Umschlag, kein Fehler', async () => {
  const { V } = ladeGenerator();
  const state = { wizard: { moduleVersion: 1, sprache: 'de', herkunft: 'x', wizards: [
    { id: 'mein-wiz', titel: 'T', zielTyp: 'situation', zielWert: 'geburt', schritteJson: JSON.stringify([{ feld: { id: 'f' }, frage: 'F?' }]) },
  ] } };
  const umschlag = await V.baueWizardSigniert(state, null);
  assert.equal(umschlag.modulSignaturJws, undefined);
  assert.equal(umschlag.format, 'vivodepot-wizard@1');
});

test('[WM-08] Grund-Parität mit dem echten Kern-Prüfer für jeden Ablehnungsfall der Maske', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const faelle = [
    { modulTyp: 'wizard', moduleVersion: 0, herkunft: 'x', wizards: {} },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: '', wizards: {} },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', wizards: {} },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'mein-wiz': { titel: '', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'mein-wiz': { titel: 'T', ziel: { situation: 'nicht-echt' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'mein-wiz': { titel: 'T', ziel: { situation: 'geburt' }, schritte: [] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'mein-wiz': { titel: 'T', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'f' } }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'mein-wiz': { titel: 'T', ziel: { sektor: 'identity' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'mein-wiz': { titel: 'T', ziel: { sektor: 'nicht-echt' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { 'Ungueltig ID': { titel: 'T', ziel: { sektor: 'identity' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de',
      wizards: { gebwiz: { titel: 'T', ziel: { sektor: 'identity' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
    { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'x', sprache: 'de', irgendwas: 'fremd',
      wizards: { 'mein-wiz': { titel: 'T', ziel: { sektor: 'identity' }, schritte: [{ feld: { id: 'f' }, frage: 'F?' }] } } },
  ];
  for (const f of faelle) {
    const g = GEN.wizardsModulPruefen(f);
    const k = KERN.wizardsModulPruefen(f);
    assert.equal(g.gueltig, k.gueltig, 'gueltig muss übereinstimmen: ' + JSON.stringify(f));
    assert.equal(g.grund, k.grund, 'grund muss übereinstimmen: ' + JSON.stringify(f));
    // rein() statt direktem Array-Vergleich: GEN/KERN kommen aus zwei verschiedenen
    // vm-Kontexten — Node hält zwei strukturgleiche, aber Realm-fremde Arrays für
    // NICHT deepStrictEqual („same structure but are not reference-equal"). rein() (s.
    // Kopf-Kommentar oben) räumt das über den JSON-Rundlauf weg, wie überall sonst in dieser
    // Datei, wo Generator- und Kern-Werte verglichen werden.
    assert.deepEqual(rein(g.verworfene.map((v) => v.grund).sort()), rein(k.verworfene.map((v) => v.grund).sort()),
      'verworfene-Gründe müssen übereinstimmen: ' + JSON.stringify(f));
  }
});

/* ── Strang D (17.09.2026), siebte Ausgabeart, logikModul ──────────────────────────────────
   DERSELBE JWS-Weg wie bereich/wizard — Datenschema/Abschnitte/Dokument-Ausgabe reisen als
   JSON-Freitext (wie rechtsraums Wortlaut/Formvorschriften), dieses Werkzeug entwirft sie
   nicht (s. Kopf-Kommentar an logikModulPruefen im Generator). */
function logikmodulState(patch) {
  return Object.assign({ logikmodul: Object.assign({
    id: 'mein-auszug', titel: 'Mein Auszug', sektor: 'identity', moduleVersion: 1, herkunft: 'fr-anbieter', sprache: '',
    datenSchemaJson: JSON.stringify({ vorname: { typ: 'feld', sektor: 'identity', feld: 'givenName' } }),
    abschnitteJson: JSON.stringify([{ titel: 'Teil A', bloecke: [
      { typ: 'frageAntwortOderLuecke', feldId: 'vorname', frage: 'Ihr Vorname?', luecke: '— nicht erfasst —' },
    ] }]),
    dokAusgabeJson: JSON.stringify({ h1: 'Mein Auszug' }),
  }, patch) });
}

test('[LM-01] ein gültiges Logikmodul wird gebaut und vom echten Kern-Einlassweg angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = logikmodulState();
  const modul = GEN.baueLogikmodulModul(state);
  assert.deepEqual(rein(modul), {
    modulTyp: 'logikModul', id: 'mein-auszug', titel: 'Mein Auszug', sektor: 'identity',
    moduleVersion: 1, herkunft: 'fr-anbieter',
    datenSchema: { vorname: { typ: 'feld', sektor: 'identity', feld: 'givenName' } },
    abschnitte: [{ titel: 'Teil A', bloecke: [
      { typ: 'frageAntwortOderLuecke', feldId: 'vorname', frage: 'Ihr Vorname?', luecke: '— nicht erfasst —' },
    ] }],
    dokAusgabe: { h1: 'Mein Auszug' },
  });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'der echte Kern nimmt das erzeugte Modul an: ' + r.grund);
  assert.equal(r.kennung, 'mein-auszug', 'Kennung ist die id, nicht die herkunft — anders als bereich/wizard');
});

test('[LM-02·Rot-Beweis] ungültiges JSON im Datenschema blockiert VOR dem Kern-Prüfer, mit eigenem Text je Feld', () => {
  const { V } = ladeGenerator();
  const state = logikmodulState({ datenSchemaJson: '{kaputt', abschnitteJson: '[nochkaputt' });
  const p = V.pruefeLogikmodul(state);
  assert.equal(p.blocker.length, 3, 'zwei JSON-Blocker + der Kern-Blocker (datenSchema fehlt, da kein gültiges JSON entstand)');
  assert.match(p.blocker[0], /Datenschema: ungültiges JSON/);
  assert.match(p.blocker[1], /Abschnitte: ungültiges JSON/);
});

test('[LM-03·Rot-Beweis] ohne Herkunft blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const p = V.pruefeLogikmodul(logikmodulState({ herkunft: '' }));
  assert.deepEqual(rein(p.blocker), ['Die Herkunft (Ihre Anbieter-Kennung) fehlt.']);
});

test('[LM-04·Rot-Beweis] ohne einen einzigen Abschnitt blockiert die Prüfung mit „abschnitte"', () => {
  const { V } = ladeGenerator();
  const p = V.pruefeLogikmodul(logikmodulState({ abschnitteJson: '[]' }));
  assert.deepEqual(rein(p.blocker), ['Es ist kein einziger Abschnitt eingetragen.']);
});

test('[LM-05·Rot-Beweis] ein unbekannter Sektor blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const p = V.pruefeLogikmodul(logikmodulState({ sektor: 'nicht-echt' }));
  assert.match(p.blocker[0], /Bereich \(Sektor\)/);
});

test('[LM-06] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = Object.assign({ publicKeyJwk: paar.publicJwk }, logikmodulState());
  const umschlag = await V.baueLogikmodulSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws, 'eine Signatur entsteht');
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
});

test('[LM-07] ohne Private-Key entsteht additiv ein unsignierter Umschlag, kein Fehler', async () => {
  const { V } = ladeGenerator();
  const umschlag = await V.baueLogikmodulSigniert(logikmodulState(), null);
  assert.equal(umschlag.modulSignaturJws, undefined);
  assert.equal(umschlag.format, 'vivodepot-logikmodul@1');
});

test('[LM-08] Grund-Parität mit dem echten Kern-Prüfer für jeden Ablehnungsfall der Maske', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const basis = { modulTyp: 'logikModul', id: 'mein-modul', titel: 'T', sektor: 'identity', herkunft: 'x', moduleVersion: 1,
    datenSchema: { a: { typ: 'feld', sektor: 'identity', feld: 'givenName' } },
    abschnitte: [{ titel: 'T', bloecke: [{ typ: 'immer', texte: ['x'] }] }],
    dokAusgabe: { h1: 'H' } };
  const klon = (patch) => Object.assign({}, JSON.parse(JSON.stringify(basis)), patch);
  const faelle = [
    basis,
    klon({ id: '' }),
    klon({ titel: '' }),
    klon({ sektor: 'nicht-echt' }),
    klon({ herkunft: '' }),
    klon({ datenSchema: {} }),
    klon({ datenSchema: { a: { typ: 'unbekannterTyp' } } }),
    klon({ datenSchema: { a: { typ: 'listenfeld', sektor: 'identity', feld: 'x' } } }),
    klon({ abschnitte: [] }),
    klon({ abschnitte: [{ titel: 'T' }] }),
    klon({ dokAusgabe: {} }),
    klon({ dokAusgabe: { h1: 'H', unterschrift: false } }),
    klon({ irgendwas: 'fremd' }),
  ];
  for (const f of faelle) {
    const g = GEN.logikModulPruefen(f);
    const k = KERN.logikModulPruefen(f);
    assert.equal(g.gueltig, k.gueltig, 'gueltig muss übereinstimmen: ' + JSON.stringify(f));
    assert.equal(g.grund, k.grund, 'grund muss übereinstimmen: ' + JSON.stringify(f));
    assert.deepEqual(rein(g.verworfene.map((v) => v.grund).sort()), rein(k.verworfene.map((v) => v.grund).sort()),
      'verworfene-Gründe müssen übereinstimmen: ' + JSON.stringify(f));
  }
});

/* ── [LM-09] Definition of Done (17.09.2026): ein über den GENERATOR gebautes und
   signiertes Logikmodul muss dieselbe Kette tragen, die die Kombinationsprobe bereits für den
   handgepflegten Fixture-Weg bewiesen hat (Bereich → Wizard → Logikmodul, echter Bürger-Weg).
   Kein synthetischer Inhalt: der Generator-State enthält HIER die echten datenSchema/
   abschnitte/dokAusgabe-Werte von `erbschein-vorbereitung` selbst (aus der Fixture gelesen,
   nicht neu erfunden) — die Probe zeigt, dass der GENERATOR dasselbe Modul reproduziert und
   dass das reproduzierte Modul denselben echten Datenfluss trägt wie das Original. */
test('[LM-09·Definition-of-Done] Generator-gebautes erbschein-vorbereitung-Modul trägt dieselbe Bereich→Wizard→Logikmodul-Kette wie das Original', async () => {
  const echt = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));
  const { V: GEN } = ladeGenerator();
  const state = { logikmodul: {
    id: echt.id, titel: echt.titel, sektor: echt.sektor, moduleVersion: echt.moduleVersion, herkunft: echt.herkunft, sprache: '',
    datenSchemaJson: JSON.stringify(echt.datenSchema),
    abschnitteJson: JSON.stringify(echt.abschnitte),
    dokAusgabeJson: JSON.stringify(echt.dokAusgabe),
  } };
  const pruefung = GEN.pruefeLogikmodul(state);
  assert.equal(pruefung.blocker.length, 0, 'die Maske muss das echte Modul ohne Blocker bauen: ' + JSON.stringify(pruefung.blocker));
  const modul = GEN.baueLogikmodulModul(state);
  assert.deepEqual(rein(modul), rein(Object.assign({ modulTyp: 'logikModul' }, echt)),
    'der Generator muss den echten Inhalt unverändert reproduzieren, kein Nebenprodukt');

  const { V: KERN } = require('./load-kern.js').ladeKern();
  await KERN.depotAnlegen('LM-09-Kombi-2026!');
  KERN.akteurSelbstErklaeren('Tester');
  KERN.getData().logikModule = [];   // Ab-Werk-Saat entfernen — echter Erst-Einlass des Generator-Bauwerks, s. U2-ADR-288
  const eingelassen = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(eingelassen.angenommen, true, 'das Generator-Modul muss der echte Kern annehmen: ' + eingelassen.grund);

  const vorher = KERN.dokumentHTML('erbschein-vorbereitung');
  assert.match(vorher, /Familienstand\? — nicht erfasst —/, 'Vorbedingung: ohne Eintrag zeigt der Auszug die Lücke');
  KERN.wizardSchrittSetzen('heirwiz', 0, 'verh');   // derselbe echte Bürger-Weg wie die Kombinationsprobe
  const nachher = KERN.dokumentHTML('erbschein-vorbereitung');
  assert.match(nachher, /Familienstand\? verheiratet/,
    'das über den Generator gebaute Modul muss denselben Wizard-Datenfluss zeigen wie das Original');
});

test('[LM-09·Gegenprobe] OHNE den Wizard-Schritt bleibt die Lücke im Generator-gebauten Modul stehen', async () => {
  const echt = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));
  const { V: GEN } = ladeGenerator();
  const modul = GEN.baueLogikmodulModul({ logikmodul: {
    id: echt.id, titel: echt.titel, sektor: echt.sektor, moduleVersion: echt.moduleVersion, herkunft: echt.herkunft, sprache: '',
    datenSchemaJson: JSON.stringify(echt.datenSchema),
    abschnitteJson: JSON.stringify(echt.abschnitte),
    dokAusgabeJson: JSON.stringify(echt.dokAusgabe),
  } });
  const { V: KERN } = require('./load-kern.js').ladeKern();
  await KERN.depotAnlegen('LM-09-Gegenprobe-2026!');
  KERN.akteurSelbstErklaeren('Tester');
  KERN.getData().logikModule = [];
  KERN.modulEinlassen(JSON.stringify(modul));
  const html = KERN.dokumentHTML('erbschein-vorbereitung');
  assert.match(html, /Familienstand\? — nicht erfasst —/,
    'ROT ERWARTET wäre hier GRÜN: bestünde die vorherige Probe auch ohne den Wizard-Schritt, bewiese sie die Kette nicht');
});

/* ── EINLASS_REGISTER-Ausbau, rechtsraum (27.08.2026) ──────────────────────────────────────
   Fünfte, letzte Ausgabeart. Der Kern-Prüfer sitzt INLINE in EINLASS_REGISTER (kein eigener
   Funktionsname) — der Zugriff dafür läuft über `KERN.EINLASS_REGISTER.find(...).pruefen`,
   wie in `tests/a476-alle-register-benennen-fremdschluessel.test.js` bereits vorgemacht. */
function kernRechtsraumPruefen(KERN, modul) {
  return KERN.EINLASS_REGISTER.find((r) => r.typ === 'rechtsraum').pruefen(modul);
}

test('[RR-01] ein gültiges GB-Rechtsraum-Modul wird gebaut und vom echten Kern-Einlassweg angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { rechtsraum: { rechtsraum: 'GB', moduleVersion: 1, sprache: 'en', typen: [
    { typ: 'enduring-power-of-attorney', katalogVersion: 1, wortlaut: 'Lasting Power of Attorney', formvorschriften: '{"hinweis":"Office of the Public Guardian"}', fristenVorrang: '', zweck: '' },
  ] } };
  const modul = GEN.baueRechtsraumModul(state);
  assert.deepEqual(rein(modul), {
    modulTyp: 'rechtsraum', rechtsraum: 'GB', moduleVersion: 1, sprache: 'en',
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: 'Lasting Power of Attorney', formvorschriften: { hinweis: 'Office of the Public Guardian' } } },
  });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'der echte Kern nimmt das erzeugte Modul an: ' + r.grund);
  assert.equal(r.kennung, 'GB');
});

test('[RR-02] ein unbekannter Typ ohne tpl_-Präfix wird verworfen, ein bekannter bleibt gültig', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: 'de', typen: [
    { typ: 'enduring-power-of-attorney', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' },
    { typ: '__eigen__', typEigen: 'unbekannter-typ', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' },
  ] } };
  const p = V.pruefeRechtsraum(state);
  assert.equal(p.blocker.length, 0);
  assert.equal(p.geprueft.gueltig, true);
  assert.equal(p.warnungen.length, 1);
  assert.match(p.warnungen[0], /unbekannter-typ/);
});

test('[RR-02b] ein eigener Typ MIT tpl_-Präfix wird angenommen (Namensraum-Schutz erlaubt das)', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [
    { typ: '__eigen__', typEigen: 'tpl_eigener-typ', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' },
  ] } };
  const p = V.pruefeRechtsraum(state);
  assert.equal(p.blocker.length, 0);
  assert.deepEqual(Object.keys(p.geprueft.typen), ['tpl_eigener-typ']);
});

test('[RR-03·Rot-Beweis] ohne Rechtsraum blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: '', moduleVersion: 1, sprache: '', typen: [{ typ: 'will', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' }] } };
  const p = V.pruefeRechtsraum(state);
  assert.deepEqual(rein(p.blocker), ['Der Rechtsraum (z. B. ein Ländercode) fehlt.']);
});

test('[RR-04·Rot-Beweis] "DE" ist reserviert und blockiert', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'DE', moduleVersion: 1, sprache: '', typen: [{ typ: 'will', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' }] } };
  const p = V.pruefeRechtsraum(state);
  assert.match(p.blocker[0], /reserviert/);
});

test('[RR-05·Rot-Beweis] ohne einen einzigen gültigen Typ blockiert die Prüfung mit „typen"', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [] } };
  const p = V.pruefeRechtsraum(state);
  assert.deepEqual(rein(p.blocker), ['Es ist kein einziger gültiger Rechtsinstrument-Typ eingetragen.']);
});

test('[RR-06] ohne Wortlaut braucht KEIN Eintrag eine Sprache (nur Formvorschriften/Version)', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [
    { typ: 'will', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' },
  ] } };
  const p = V.pruefeRechtsraum(state);
  assert.deepEqual(rein(p.blocker), [], 'kein Wortlaut heißt keine Beschriftung heißt keine Sprachpflicht');
});

test('[RR-07·Rot-Beweis] MIT Wortlaut wird Sprache Pflicht', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [
    { typ: 'will', katalogVersion: 1, wortlaut: 'Ein Wortlaut', formvorschriften: '', fristenVorrang: '', zweck: '' },
  ] } };
  const p = V.pruefeRechtsraum(state);
  assert.deepEqual(rein(p.blocker), ['Die Sprache fehlt.']);
});

test('[RR-08·Rot-Beweis] ungültiges JSON in formvorschriften blockiert mit Klartext, statt still zu verschwinden', () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [
    { typ: 'will', katalogVersion: 1, wortlaut: '', formvorschriften: '{kaputt', fristenVorrang: '', zweck: '' },
  ] } };
  const p = V.pruefeRechtsraum(state);
  assert.equal(p.blocker.length, 1);
  assert.match(p.blocker[0], /Formvorschriften bei Eintrag 1/);
});

test('[RR-09] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = { publicKeyJwk: paar.publicJwk, rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [
    { typ: 'will', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' },
  ] } };
  const umschlag = await V.baueRechtsraumSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws);
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
});

test('[RR-10] ohne Private-Key entsteht additiv ein unsignierter Umschlag, kein Fehler', async () => {
  const { V } = ladeGenerator();
  const state = { rechtsraum: { rechtsraum: 'AT', moduleVersion: 1, sprache: '', typen: [
    { typ: 'will', katalogVersion: 1, wortlaut: '', formvorschriften: '', fristenVorrang: '', zweck: '' },
  ] } };
  const umschlag = await V.baueRechtsraumSigniert(state, null);
  assert.equal(umschlag.modulSignaturJws, undefined);
  assert.equal(umschlag.format, 'vivodepot-rechtsraum@1');
});

test('[RR-11] Grund-Parität mit dem echten (inline) Kern-Prüfer für jeden Ablehnungsfall der Maske', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const faelle = [
    { modulTyp: 'rechtsraum', rechtsraum: '', moduleVersion: 1, typen: { will: { katalogVersion: 1 } } },
    { modulTyp: 'rechtsraum', rechtsraum: 'DE', moduleVersion: 1, typen: { will: { katalogVersion: 1 } } },
    { modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 0, typen: { will: { katalogVersion: 1 } } },
    { modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1, typen: {} },
    { modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1, typen: { will: { katalogVersion: 1, wortlaut: 'x' } } },
    { modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1, sprache: 'de', typen: { will: { katalogVersion: 1, wortlaut: 'x' } } },
  ];
  for (const f of faelle) {
    const g = GEN.rechtsraumModulPruefen(f);
    const k = kernRechtsraumPruefen(KERN, f);
    assert.equal(g.gueltig, k.gueltig, 'gueltig muss übereinstimmen: ' + JSON.stringify(f));
    assert.equal(g.grund, k.grund, 'grund muss übereinstimmen: ' + JSON.stringify(f));
  }
});

/* ── EINLASS_REGISTER-Ausbau, format (27.08.2026) ──────────────────────────────────────────
   Die reservierte-Format-ID-Prüfung wird bewusst NICHT gespiegelt (Drift-Risiko einer
   dritten Kopie der ~25 eingebauten IDs, kein Wächter dafür) — darum bleibt dieser eine
   Fall aus der Grund-Paritäts-Liste (FM-11) ausgespart, s.
   Kommentar an `formatModulPruefen` im Erzeuger. */
test('[FM-01] ein gültiges Import-Format-Modul wird gebaut und vom echten Kern-Einlassweg angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { format: { format: 'meine-einrichtung-export', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'Export aus meiner Einrichtung', sprache: 'de', leser: 'json@1', akzeptiert: '', quelle: '',
    erkennen: [{ pfad: 'quelle', vergleich: 'gleich', gleichWert: 'meine-einrichtung' }],
    zuordnung: [{ feld: 'givenName', ziel: 'person.vorname', alsListe: false }] } };
  const modul = GEN.baueFormatModul(state);
  assert.deepEqual(rein(modul), {
    modulTyp: 'format', format: 'meine-einrichtung-export', moduleVersion: 1, richtung: 'import',
    sektor: 'identity', label: 'Export aus meiner Einrichtung', sprache: 'de', leser: 'json@1',
    erkennen: [{ pfad: 'quelle', gleich: 'meine-einrichtung' }],
    zuordnung: [{ feld: 'givenName', ziel: 'person.vorname' }],
  });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'der echte Kern nimmt das erzeugte Modul an: ' + r.grund);
  assert.equal(r.kennung, 'meine-einrichtung-export');
});

test('[FM-02] ein unbekanntes Feld wird verworfen, ein bekanntes bleibt in der Zuordnung', () => {
  const { V } = ladeGenerator();
  const state = { format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', akzeptiert: '', quelle: '', erkennen: [],
    zuordnung: [{ feld: 'givenName', ziel: 'a' }, { feld: 'gibt-es-nicht', ziel: 'b' }] } };
  const p = V.pruefeFormat(state);
  assert.equal(p.blocker.length, 0);
  assert.deepEqual(rein(p.geprueft.zuordnung), [{ feld: 'givenName', ziel: 'a', alsListe: false }]);
  assert.equal(p.warnungen.length, 1);
  assert.match(p.warnungen[0], /gibt-es-nicht/);
});

test('[FM-03·Rot-Beweis] ohne Format-Kennung blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const state = { format: { format: '', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [{ feld: 'givenName', ziel: 'a' }] } };
  const p = V.pruefeFormat(state);
  assert.deepEqual(rein(p.blocker), ['Die Format-Kennung fehlt.']);
});

test('[FM-04·Rot-Beweis] ein unbekannter Bereich blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const state = { format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'gibt-es-nicht',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [{ feld: 'givenName', ziel: 'a' }] } };
  const p = V.pruefeFormat(state);
  assert.deepEqual(rein(p.blocker), ['Der Bereich fehlt oder ist kein bekannter Vivodepot-Bereich.']);
});

test('[FM-05·Rot-Beweis] ohne eine einzige Zuordnung blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const state = { format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [] } };
  const p = V.pruefeFormat(state);
  assert.deepEqual(rein(p.blocker), ['Es ist keine einzige Zuordnung eingetragen.']);
});

test('[FM-06] beim Export ist der Leser NICHT Pflicht', () => {
  const { V } = ladeGenerator();
  const state = { format: { format: 'x', moduleVersion: 1, richtung: 'export', sektor: 'identity',
    label: 'X', sprache: 'de', leser: '', zuordnung: [{ feld: 'givenName', ziel: 'a' }] } };
  const p = V.pruefeFormat(state);
  assert.deepEqual(rein(p.blocker), []);
  assert.equal(p.modul.leser, undefined);
});

test('[FM-07·Rot-Beweis] beim Import ist der Leser Pflicht', () => {
  const { V } = ladeGenerator();
  const state = { format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: '', zuordnung: [{ feld: 'givenName', ziel: 'a' }] } };
  const p = V.pruefeFormat(state);
  assert.deepEqual(rein(p.blocker), ['Der Leser fehlt oder ist unbekannt — beim Import-Kanal Pflicht.']);
});

test('[FM-08] die drei Erkenner-Vergleichsarten bauen die richtige Form (gleich/vorhanden/istObjekt)', () => {
  const { V } = ladeGenerator();
  const modul = V.baueFormatModul({ format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [{ feld: 'givenName', ziel: 'a' }],
    erkennen: [
      { pfad: 'a', vergleich: 'gleich', gleichWert: 'x' },
      { pfad: 'b', vergleich: 'vorhanden' },
      { pfad: 'c', vergleich: 'istObjekt' },
    ] } });
  assert.deepEqual(rein(modul.erkennen), [
    { pfad: 'a', gleich: 'x' },
    { pfad: 'b', vorhanden: true },
    { pfad: 'c', istObjekt: true },
  ]);
});

test('[FM-09] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = { publicKeyJwk: paar.publicJwk, format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [{ feld: 'givenName', ziel: 'a' }] } };
  const umschlag = await V.baueFormatSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws);
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
});

test('[FM-10] ohne Private-Key entsteht additiv ein unsignierter Umschlag, kein Fehler', async () => {
  const { V } = ladeGenerator();
  const state = { format: { format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [{ feld: 'givenName', ziel: 'a' }] } };
  const umschlag = await V.baueFormatSigniert(state, null);
  assert.equal(umschlag.modulSignaturJws, undefined);
  assert.equal(umschlag.format, 'vivodepot-format-modul@1');
});

test('[FM-11] Grund-Parität mit dem echten Kern-Prüfer für jeden Ablehnungsfall der Maske', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const basis = { modulTyp: 'format', format: 'x', moduleVersion: 1, richtung: 'import', sektor: 'identity',
    label: 'X', sprache: 'de', leser: 'json@1', zuordnung: [{ feld: 'givenName', ziel: 'a' }] };
  const faelle = [
    Object.assign({}, basis, { format: '' }),
    Object.assign({}, basis, { moduleVersion: 0 }),
    Object.assign({}, basis, { richtung: 'seitwaerts' }),
    Object.assign({}, basis, { sektor: 'gibt-es-nicht' }),
    Object.assign({}, basis, { label: '' }),
    Object.assign({}, basis, { sprache: '' }),
    Object.assign({}, basis, { leser: 'unbekannt@1' }),
    Object.assign({}, basis, { zuordnung: [] }),
    Object.assign({}, basis, { zuordnung: [{ feld: 'gibt-es-nicht', ziel: 'a' }] }),
    basis,
  ];
  for (const f of faelle) {
    const g = GEN.formatModulPruefen(f);
    const k = KERN.formatModulPruefen(f);
    assert.equal(g.gueltig, k.gueltig, 'gueltig muss übereinstimmen: ' + JSON.stringify(f));
    assert.equal(g.grund, k.grund, 'grund muss übereinstimmen: ' + JSON.stringify(f));
  }
});

/* ── EINLASS_REGISTER-Ausbau, branding (27.08.2026) ────────────────────────────────────────
   Letzter der sechs Register-Typen, nach der Whitelabel-Schema-Erweiterung (farbePrimaer/
   farbeSekundaer/schriftart/logo/name). Besonderheit: `nurGeprueft` — ein unsigniert
   eingelassenes branding-Modul wird vom echten Kern ABGELEHNT, nicht nur markiert (BD-02
   belegt genau das, als Gegenstück zu BD-01). */
test('[BD-01] ein gültiges Modul wird gebaut und vom echten Kern-Einlassweg NUR mit geprüfter Herkunft angenommen', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { branding: { moduleVersion: 1, herkunft: 'sparkasse-musterstadt',
    farbePrimaer: '#1f4068', farbeSekundaer: '#a1b2c3', schriftart: 'Source Sans Pro',
    logo: '', name: 'Sparkasse Musterstadt' } };
  const modul = GEN.baueBrandingModul(state);
  assert.deepEqual(rein(modul), {
    modulTyp: 'branding', moduleVersion: 1, farbePrimaer: '#1f4068', farbeSekundaer: '#a1b2c3',
    schriftart: 'Source Sans Pro', name: 'Sparkasse Musterstadt', herkunft: 'sparkasse-musterstadt',
  });

  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const rGeprueft = KERN.modulEinlassen(JSON.stringify(modul), undefined, 'geprüfte-sparkasse');
  assert.equal(rGeprueft.angenommen, true, 'mit geprüfter Herkunft nimmt der Kern das Modul an: ' + rGeprueft.grund);
});

test('[BD-02·Rot-Beweis] dasselbe Modul OHNE geprüfte Herkunft wird vom echten Kern abgelehnt — nurGeprueft', async () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const state = { branding: { moduleVersion: 1, herkunft: 'x', farbePrimaer: '#1f4068' } };
  const modul = GEN.baueBrandingModul(state);
  await KERN.depotAnlegen('test-pw-12345');
  KERN.akteurSelbstErklaeren('B');
  const r = KERN.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'nur-signiert-erlaubt');
});

test('[BD-03·Rot-Beweis] gar nichts gesetzt blockiert die Prüfung', () => {
  const { V } = ladeGenerator();
  const p = V.pruefeBranding({ branding: { moduleVersion: 1 } });
  assert.match(p.blocker[0], /mindestens eines/);
});

test('[BD-04] ein ungültiger Hex-Wert wird verworfen, der Name trägt das Modul weiter', () => {
  const { V } = ladeGenerator();
  const p = V.pruefeBranding({ branding: { moduleVersion: 1, farbePrimaer: 'blau', name: 'X' } });
  assert.equal(p.blocker.length, 0);
  assert.equal(p.geprueft.branding.farbePrimaer, null);
  assert.equal(p.geprueft.branding.name, 'X');
  assert.equal(p.warnungen.length, 1);
  assert.match(p.warnungen[0], /farbePrimaer/);
});

test('[BD-05] signierter Weg: modulSignaturJws verifiziert gegen den Public-Key desselben Schlüsselpaars', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const state = { publicKeyJwk: paar.publicJwk, branding: { moduleVersion: 1, name: 'X' } };
  const umschlag = await V.baueBrandingSigniert(state, paar.privateJwk);
  assert.ok(umschlag.modulSignaturJws);
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
  assert.equal(res.gueltig, true, 'modulSignaturJws muss gegen den Public-Key verifizieren: ' + res.grund);
});

test('[BD-06] Grund-Parität mit dem echten Kern-Prüfer für jeden Ablehnungsfall der Maske', () => {
  const { V: GEN } = ladeGenerator();
  const { V: KERN } = require('./load-kern.js').ladeKern();
  const faelle = [
    { modulTyp: 'branding', moduleVersion: 0, name: 'X' },
    { modulTyp: 'branding', moduleVersion: 1 },
    { modulTyp: 'branding', moduleVersion: 1, farbePrimaer: 'nichthex' },
    { modulTyp: 'branding', moduleVersion: 1, farbeSekundaer: 'nichthex' },
    { modulTyp: 'branding', moduleVersion: 1, schriftart: '   ' },
    { modulTyp: 'branding', moduleVersion: 1, name: 'X'.repeat(201) },
    { modulTyp: 'branding', moduleVersion: 1, farbePrimaer: '#111111', farbeSekundaer: '#222222', schriftart: 'Roboto', name: 'X' },
  ];
  for (const f of faelle) {
    const g = GEN.brandingModulPruefen(f);
    const k = KERN.brandingModulPruefen(f);
    assert.equal(g.gueltig, k.gueltig, 'gueltig muss übereinstimmen: ' + JSON.stringify(f));
    assert.equal(g.grund, k.grund, 'grund muss übereinstimmen: ' + JSON.stringify(f));
  }
});

// ── Einreichadresse (16.09.2026) ────────────────────────────────────────────
test('[Generator·Einreichen] nach dem Submission-Paket nennt der Generator die Einreichadresse — keine erfundene „in der Begrüßung genannte"', () => {
  const quelle = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
  assert.match(quelle, /const EINREICH_ADRESSE = 'register@vivodepot\.de';/);
  const erfolg = quelle.slice(quelle.indexOf('function fertigKarteZeigen('), quelle.indexOf('function fertigKarteZuruecksetzen('));
  assert.ok(erfolg.length > 0, 'Vorbedingung: der Erfolgs-Abschnitt ist gefunden');
  assert.ok(erfolg.includes('EINREICH_ADRESSE'), 'die Erfolgsmeldung nennt die Einreichadresse nicht');
  assert.ok(!/in der Begrüßung genannte/.test(quelle), 'der Verweis auf eine Adresse, die die Begrüßung nie nannte, ist zurück');
});
