'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/kundenzertifikat-ausstellen.js („Zertifikatsbetrieb", 23.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Wegwerf-Ausgabe-Schlüssel (als .vdkey), Wegwerf-Ausstellerzertifikat
   (mit dem Test-Sentinel als „Anker" signiert), Wegwerf-Kundenschlüssel.
   KEY tabu.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeIssuer } = require('./load-issuer.js');
const { lauf } = require('../tools/kundenzertifikat-ausstellen.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

// Anbieter-Angaben/Anbieterprüfung (19.09.2026, Ziel L4) — seit diesem Auftrag Pflicht vor jeder
// Ausstellung, hier eine gültige Wegwerf-Fixture.
const ANBIETER_ANGABEN_FIXTURE = Object.freeze({
  rechtsform: 'GmbH',
  adresse: { strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt', land: 'Deutschland' },
  kontakt: { name: 'Maria Mustermann', funktion: 'Geschäftsführung', email: 'maria@beispiel.test', telefon: '+49 30 1234567' },
});
const ANBIETERPRUEFUNG_FIXTURE = Object.freeze({
  methode: 'registerauszug', geprueftAm: '2026-09-19', geprueftVon: 'Test-Prüferin',
  belegHash: 'a'.repeat(64),
});

function mitTmpVerzeichnis(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kundenzertifikat-ausstellen-test-'));
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

async function aufbauen(tmp) {
  const ISSUER = ladeIssuer().V;
  const ausgabe = await wegwerfKeypair();
  const vdkeyWrapper = await ISSUER.schuetzeSchluesselJwk(ausgabe.privJwk, 'wegwerf-ausgabe-passphrase');
  const vdkeyPfad = path.join(tmp, 'ausgabe.vdkey.json');
  fs.writeFileSync(vdkeyPfad, JSON.stringify(vdkeyWrapper), 'utf8');

  const ausstellerZertifikatJws = await ausstellerZertifikatBauen(ISSUER, ausgabe.pubJwk);
  const ausstellerPfad = path.join(tmp, 'ausstellerzertifikat.json');
  fs.writeFileSync(ausstellerPfad, JSON.stringify({ certJws: ausstellerZertifikatJws }), 'utf8');

  const kunde = await wegwerfKeypair();
  const subjektPfad = path.join(tmp, 'kunde-public.jwk.json');
  fs.writeFileSync(subjektPfad, JSON.stringify(kunde.pubJwk), 'utf8');

  return { ausgabe, vdkeyPfad, ausstellerPfad, kunde, subjektPfad };
}

test('[kundenzertifikat-ausstellen] Regelfall: Kundenzertifikat verifiziert über die Zwischenstufe gegen den Anker', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, kunde, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterAngaben: ANBIETER_ANGABEN_FIXTURE, anbieterPruefung: ANBIETERPRUEFUNG_FIXTURE,
    });

    assert.equal(ok, true, 'Werkzeug meldet Erfolg');
    const ergebnis = JSON.parse(fs.readFileSync(ausgabePfad, 'utf8'));
    assert.ok(!/"d"\s*:/.test(fs.readFileSync(ausgabePfad, 'utf8')), 'keine Ausgabedatei enthält Schlüsselmaterial');

    const { V } = ladeKern();
    const res = await V.verifiziereProviderCredential(ergebnis.certJws, {
      ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-06-01T00:00:00Z', ausstellerZertifikatJws: ergebnis.ausstellerZertifikatJws,
    });
    assert.equal(res.gueltig, true, 'Kundenzertifikat verifiziert über die volle Kette: ' + (res.grund || ''));
    assert.equal(res.nutzlast.credentialSubject.anbieterId, 'institution/test-kunde');
    assert.equal(res.nutzlast.credentialSubject.rechtsform, 'GmbH');
    assert.deepEqual(res.nutzlast.credentialSubject.anbieterPruefung, ANBIETERPRUEFUNG_FIXTURE);
  });
});

test('[kundenzertifikat-ausstellen] ohne Anbieter-Angaben — Abbruch, keine Ausgabedatei', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');
    const vorherExitCode = process.exitCode;
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterPruefung: ANBIETERPRUEFUNG_FIXTURE,
    });
    process.exitCode = vorherExitCode;
    assert.equal(ok, false);
    assert.ok(!fs.existsSync(ausgabePfad), 'ohne anbieter keine Signatur — keine Ausgabedatei');
  });
});

test('[kundenzertifikat-ausstellen] ohne Anbieterprüfung (und ohne Abschaltung) — Abbruch', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');
    const vorherExitCode = process.exitCode;
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterAngaben: ANBIETER_ANGABEN_FIXTURE,
    });
    process.exitCode = vorherExitCode;
    assert.equal(ok, false);
    assert.ok(!fs.existsSync(ausgabePfad), 'Vorgabe AN — ohne Anbieterprüfung und ohne ausdrückliche Abschaltung keine Signatur');
  });
});

test('[kundenzertifikat-ausstellen] --ohne-anbieterpruefung schaltet ab, wird im Zertifikat vermerkt', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterAngaben: ANBIETER_ANGABEN_FIXTURE, ohneAnbieterpruefung: true,
    });
    assert.equal(ok, true);
    const ergebnis = JSON.parse(fs.readFileSync(ausgabePfad, 'utf8'));
    assert.equal(ergebnis.anbieterPruefungAbgeschaltet, true);
    assert.equal(ergebnis.anbieterPruefung, undefined);
    const { V } = ladeKern();
    const res = await V.verifiziereProviderCredential(ergebnis.certJws, {
      ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-06-01T00:00:00Z', ausstellerZertifikatJws: ergebnis.ausstellerZertifikatJws,
    });
    assert.equal(res.nutzlast.credentialSubject.anbieterPruefungAbgeschaltet, true, 'die Abschaltung selbst steht im Zertifikat, nicht nur in der Ausgabedatei');
  });
});

test('[kundenzertifikat-ausstellen·Gegenprobe] falsches Ausstellerzertifikat (anderer Ausgabe-Schlüssel) → Abbruch vor jeder Signatur', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, subjektPfad } = await aufbauen(tmp);
    const ISSUER = ladeIssuer().V;
    const einAndererAusgabeSchluessel = await wegwerfKeypair();
    const falschesAusstellerZertifikatJws = await ausstellerZertifikatBauen(ISSUER, einAndererAusgabeSchluessel.pubJwk);
    const falscherAusstellerPfad = path.join(tmp, 'falsches-ausstellerzertifikat.json');
    fs.writeFileSync(falscherAusstellerPfad, JSON.stringify({ certJws: falschesAusstellerZertifikatJws }), 'utf8');
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    const vorherExitCode = process.exitCode;
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: falscherAusstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterAngaben: ANBIETER_ANGABEN_FIXTURE, anbieterPruefung: ANBIETERPRUEFUNG_FIXTURE,
    });
    process.exitCode = vorherExitCode;

    assert.equal(ok, false, 'Werkzeug meldet Abbruch, wenn Ausstellerzertifikat nicht zum geladenen Ausgabe-Schlüssel passt');
    assert.ok(!fs.existsSync(ausgabePfad), 'keine Ausgabedatei bei Abbruch');
  });
});

test('[kundenzertifikat-ausstellen] falsche Passphrase → Abbruch, kein Leck', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    let geloggt = '';
    const origError = console.error;
    console.error = (...args) => { geloggt += args.join(' ') + '\n'; };
    const vorherExitCode = process.exitCode;
    let ok;
    try {
      ok = await lauf({
        anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
        subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'falsche-passphrase',
        ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
        anbieterAngaben: ANBIETER_ANGABEN_FIXTURE, anbieterPruefung: ANBIETERPRUEFUNG_FIXTURE,
      });
    } finally {
      console.error = origError;
      process.exitCode = vorherExitCode;
    }

    assert.equal(ok, false, 'Werkzeug meldet Abbruch bei falscher Passphrase');
    assert.ok(!fs.existsSync(ausgabePfad), 'keine Ausgabedatei bei Abbruch');
    assert.ok(!geloggt.includes('falsche-passphrase'), 'die Passphrase erscheint in keiner Fehlermeldung');
  });
});

test('[kundenzertifikat-ausstellen] Ausgabe-Schlüssel == Subjekt-Schlüssel → Abbruch', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { ausgabe, vdkeyPfad, ausstellerPfad } = await aufbauen(tmp);
    const subjektPfad = path.join(tmp, 'kunde-public.jwk.json');
    fs.writeFileSync(subjektPfad, JSON.stringify(ausgabe.pubJwk), 'utf8'); // derselbe Schlüssel als "Kunde"
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    const vorherExitCode = process.exitCode;
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterAngaben: ANBIETER_ANGABEN_FIXTURE, anbieterPruefung: ANBIETERPRUEFUNG_FIXTURE,
    });
    process.exitCode = vorherExitCode;

    assert.equal(ok, false, 'Werkzeug meldet Abbruch, wenn Ausgabe-Schlüssel und Subjekt gleich sind');
    assert.ok(!fs.existsSync(ausgabePfad), 'keine Ausgabedatei bei Abbruch');
  });
});

/* ── U2-ADR-495 (09.10.2026): Rechtsform frei, Rechtsraum im Zertifikat — abwärtsverträglich ──
   (1) Ein neues Zertifikat (freie Rechtsform, credentialSubject.rechtsraum) verifiziert im heutigen Kern UND im Kern vor
       U2-ADR-495: das ist derselbe Kern ohne die drei Änderungen (Schlüssellisten, Rechtsraum der Anfrage), also das
       Verhalten der ausgelieferten v922 für diesen Fall. Ebenso wird eine Anfrage mit `rechtsraum` dort weiter verarbeitet.
   (2) Die Rechtsform steht signiert im Zertifikat: Längengrenze und keine Steuerzeichen bei der Ausstellung; keine App
       schreibt sie über innerHTML. */
const ADR495_KERN_AENDERUNGEN = [
  ["'typen', 'name', 'rechtsformen',", "'typen',"],
  ["'gueltigBis', 'felder', 'antwort', 'rechtsraum']);", "'gueltigBis', 'felder', 'antwort']);"],
  ["      ...(rechtsraum ? { rechtsraum } : {}),\n", ''],
];
function kernVorAdr495() {
  let html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  for (const [neu, alt] of ADR495_KERN_AENDERUNGEN) {
    assert.equal(html.split(neu).length - 1, 1, 'Vorbedingung: die Änderung steht genau einmal im Kern: ' + neu.trim().slice(0, 60));
    html = html.replace(neu, alt);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-vor-adr495-'));
  const datei = path.join(dir, 'kern.html');
  fs.writeFileSync(datei, html);
  try { return ladeKern({ htmlPfad: datei, backen: true }).V; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('[kundenzertifikat-ausstellen · U2-ADR-495] ein Zertifikat mit freier Rechtsform und Rechtsraum verifiziert im heutigen Kern und im Kern davor', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');
    const angaben = Object.assign({}, ANBIETER_ANGABEN_FIXTURE, { rechtsform: 'Körperschaft öffentlichen Rechts (AT)', rechtsraum: 'AT',
      adresse: { strasse: 'Platz 1', plz: '1010', ort: 'Wien', land: 'Österreich' } });
    const ok = await lauf({
      anbieterId: 'institution/test-kunde-at', anbieterName: 'Test-Kunde Wien', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      anbieterAngaben: angaben, anbieterPruefung: ANBIETERPRUEFUNG_FIXTURE,
    });
    assert.equal(ok, true);
    const ergebnis = JSON.parse(fs.readFileSync(ausgabePfad, 'utf8'));
    for (const [name, V] of [['heute', ladeKern().V], ['vor U2-ADR-495', kernVorAdr495()]]) {
      const res = await V.verifiziereProviderCredential(ergebnis.certJws, {
        ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-06-01T00:00:00Z', ausstellerZertifikatJws: ergebnis.ausstellerZertifikatJws,
      });
      assert.equal(res.gueltig, true, name + ': ' + (res.grund || ''));
      assert.equal(res.nutzlast.credentialSubject.rechtsraum, 'AT', name);
      assert.equal(res.nutzlast.credentialSubject.rechtsform, 'Körperschaft öffentlichen Rechts (AT)', name);
    }
  });
});
test('[kundenzertifikat-ausstellen · U2-ADR-495] eine Anfrage mit Rechtsraum verarbeitet auch der Kern davor: gültig, der Schlüssel nur gemeldet', () => {
  const V = kernVorAdr495();
  const g = V.anfragePruefen({ modulTyp: 'anfrage', anfrageVersion: 1, von: 'Bürgerservice Beispiel', zweck: 'Termin vereinbaren',
    grundlage: 'Ihre Einwilligung', vorgang: 'A-1', gueltigBis: '2099-12-31', rechtsraum: 'AT',
    felder: [{ kennung: 'identity.familyName', zweck: 'Damit wir Ihren Termin finden', pflicht: true }], antwort: { art: 'einmalpasswort' } });
  assert.equal(g.gueltig, true, String(g.grund));
  assert.ok(g.verworfene.some((v) => v.schluessel === 'rechtsraum' && v.grund === 'unbekannt'));
});
test('[kundenzertifikat-ausstellen · U2-ADR-495 · Rot-Beweis] eine zu lange Rechtsform oder eine mit Steuerzeichen wird nicht ausgestellt', () => {
  const { anbieterAngabenPruefen, RECHTSFORM_MAX } = require('../tools/lib/anbieter-angaben.js');
  assert.throws(() => anbieterAngabenPruefen(Object.assign({}, ANBIETER_ANGABEN_FIXTURE, { rechtsform: 'x'.repeat(RECHTSFORM_MAX + 1) })), /länger als/);
  assert.throws(() => anbieterAngabenPruefen(Object.assign({}, ANBIETER_ANGABEN_FIXTURE, { rechtsform: 'GmbH\u0007' })), /Steuerzeichen/);
  assert.throws(() => anbieterAngabenPruefen(Object.assign({}, ANBIETER_ANGABEN_FIXTURE, { rechtsform: 'GmbH\u009B' })), /Steuerzeichen/);
});
test('[kundenzertifikat-ausstellen · U2-ADR-495] keine App schreibt die Rechtsform über innerHTML', () => {
  for (const f of ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html']) {
    const zeilen = fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split('\n').filter((z) => /rechtsform/i.test(z) && /innerHTML|outerHTML|insertAdjacentHTML/.test(z));
    assert.deepEqual(zeilen, [], f);
  }
});
test('[kundenzertifikat-ausstellen · U2-ADR-495] ein Zertifikat von vor U2-ADR-495 (Rechtsform aus der alten Liste, ohne Rechtsraum) bleibt gültig', async () => {
  const alt = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'zertifikat-vor-u2-adr-495', 'anbieter-zertifikat-gmbh.json'), 'utf8'));
  assert.equal(Object.keys(alt.ankerPublicJwk).includes('d'), false, 'das Fixture trägt nur den öffentlichen Schlüssel');
  const { V } = ladeKern();
  const res = await V.verifiziereProviderCredential(alt.certJws, { ankerJwk: alt.ankerPublicJwk, jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, String(res.grund || ''));
  assert.equal(res.nutzlast.credentialSubject.rechtsform, 'GmbH');
  assert.equal('rechtsraum' in res.nutzlast.credentialSubject, false);
  const { anbieterAngabenPruefen } = require('../tools/lib/anbieter-angaben.js');
  assert.doesNotThrow(() => anbieterAngabenPruefen(Object.assign({}, ANBIETER_ANGABEN_FIXTURE, { rechtsform: res.nutzlast.credentialSubject.rechtsform })),
    'die alte Rechtsform ist weiter eine gültige Angabe');
});
