'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — zwei Funde aus dem Code-Review über den heutigen Diff (27./28.08.2026,
   8 Finder-Perspektiven + Verifikation), beide CONFIRMED, kein Blocker.

   1) baueInstitutionsArtSigniert/baueBereichSigniert/baueRechtsraumSigniert/
      baueFormatSigniert/baueBrandingSigniert (vivodepot-studio.html)
      duplizierten die sicherheitskritische Sign-dann-selbst-verifizieren-Sequenz
      fünfmal byte-identisch — ein künftiger Fix an der Verify-Logik hätte leicht
      eine Kopie vergessen können. Zentralisiert nach dem Vorbild
      `baueSammelSubmissionSigniert`/`templateJwsErzeugen`.
      Wächter: die Fehlermeldung der Selbst-Prüfung darf nur EINMAL im Quelltext
      stehen (im gemeinsamen Helfer), nicht fünfmal.

   2) `_pruefeNamensraumKollision` (vivodepot-vc-issuer.html) scannte den
      Fremdmodul-Feldkatalog linear PRO FELD PRO PAKET — O(N·F·K) im
      Stapel-Betrieb (`stapelPruefen`) statt einmal einen Index zu bauen
      (O(K) einmalig + O(N·F) Nachschlagen). Wächter: derselbe Katalog liefert
      bei zwei Aufrufen denselben (gecachten) Index — kein Neubau pro Aufruf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');

const GENERATOR_PATH = path.join(__dirname, '..', 'vivodepot-studio.html');

// ── Fund 1: zentralisierte Sign-dann-selbst-verifizieren-Sequenz ───────────

test('[Fund 1 · Wächter] die Selbst-Prüfungs-Fehlermeldung steht nur EINMAL im Quelltext, nicht fünfmal dupliziert', () => {
  const html = fs.readFileSync(GENERATOR_PATH, 'utf8');
  const treffer = html.split('passt nicht zum Public-Key dieses Moduls').length - 1;
  assert.equal(treffer, 1, 'die Sign-dann-selbst-verifizieren-Sequenz muss zentralisiert sein (ein Helfer, nicht fünf Kopien)');
});

test('[Fund 1] _modulJwsMitSelbstpruefung erzeugt eine gegen den Public-Key verifizierbare Signatur', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const modul = { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de', arten: { pflege: 'Pflegeeinrichtung' } };
  const jws = await V._modulJwsMitSelbstpruefung(modul, paar.privateJwk, paar.publicJwk);
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  const res = await V._verifyJWS(jws, verifyKey, {});
  assert.equal(res.gueltig, true, 'die zentrale Funktion liefert eine gültige Signatur: ' + res.grund);
  assert.equal(JSON.stringify(res.nutzlast), JSON.stringify(modul), 'signierte Nutzlast = das Modul selbst');
});

test('[Fund 1] _modulJwsMitSelbstpruefung wirft, wenn der Private-Key nicht zum Public-Key passt', async () => {
  const { V } = ladeGenerator();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const einAnderer = await V.erzeugeSchluesselpaarRoh();
  const modul = { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de', arten: {} };
  await assert.rejects(
    () => V._modulJwsMitSelbstpruefung(modul, einAnderer.privateJwk, paar.publicJwk),
    /passt nicht zum Public-Key dieses Moduls/,
    'falscher Key wird gefangen, nicht erst beim Kern'
  );
});

// Regression je Register-Typ: nach der Zentralisierung muss jede der fünf
// bau*Signiert-Funktionen weiterhin korrekt signieren UND bei falschem Key werfen —
// genau das Verhalten, das vorher fünfmal separat implementiert war.
const REGISTER_TYPEN = [
  { fn: 'baueInstitutionsArtSigniert', staat: (pub) => ({ publicKeyJwk: pub, institutionsArt: { moduleVersion: 1, sprache: 'de', arten: [{ kennung: 'pflege', label: 'Pflegeeinrichtung' }] } }) },
  { fn: 'baueBereichSigniert', staat: (pub) => ({ publicKeyJwk: pub, bereich: { moduleVersion: 1, herkunft: 'x', sprache: 'de', bereiche: [{ id: 'freizeit', label: 'Freizeit' }] } }) },
  { fn: 'baueRechtsraumSigniert', staat: (pub) => ({ publicKeyJwk: pub, rechtsraum: { moduleVersion: 1, rechtsraum: 'AT', sprache: 'de', typen: [{ typ: 'vollmacht', katalogVersion: 1 }] } }) },
  { fn: 'baueFormatSigniert', staat: (pub) => ({ publicKeyJwk: pub, format: { moduleVersion: 1, format: 'x-test@1', richtung: 'import', sektor: 'wohnen', label: 'Test', leser: 'json', zuordnung: [{ feld: 'a', ziel: 'wohnen.a' }] } }) },
  { fn: 'baueBrandingSigniert', staat: (pub) => ({ publicKeyJwk: pub, branding: { moduleVersion: 1, name: 'Test-Institution' } }) },
];

for (const { fn, staat } of REGISTER_TYPEN) {
  test('[Fund 1 · Regression · ' + fn + '] signiert weiterhin korrekt und wirft weiterhin bei falschem Key', async () => {
    const { V } = ladeGenerator();
    const paar = await V.erzeugeSchluesselpaarRoh();
    const einAnderer = await V.erzeugeSchluesselpaarRoh();

    const umschlag = await V[fn](staat(paar.publicJwk), paar.privateJwk);
    assert.ok(umschlag.modulSignaturJws, fn + ': eine Signatur entsteht');
    const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
    const res = await V._verifyJWS(umschlag.modulSignaturJws, verifyKey, {});
    assert.equal(res.gueltig, true, fn + ': modulSignaturJws verifiziert gegen den Public-Key: ' + res.grund);

    await assert.rejects(
      () => V[fn](staat(paar.publicJwk), einAnderer.privateJwk),
      /passt nicht zum Public-Key dieses Moduls/,
      fn + ': falscher Key wird weiterhin gefangen'
    );
  });
}

// ── Fund 2: Katalog-Index einmal pro Katalog-Objekt, nicht pro Aufruf ──────

function beispielKatalog(n) {
  const felder = [];
  for (let i = 0; i < n; i++) felder.push({ feldSlug: 'feld_' + i, anbieterId: 'fremd/' + i, anbieterIdSlug: 'fremd_' + i });
  return { felder };
}

test('[Fund 2] Kollisionsprüfung findet weiterhin echte Namensraum-Kollisionen (Verhalten unverändert)', () => {
  const { V } = ladeIssuer();
  const katalog = beispielKatalog(50);
  const paket = { anbieter: { anbieterId: 'eigen' }, templates: [{ felder: [{ feldname: 'Feld 3' }] }] };
  // "Feld 3" slugt zu "feld_3" -- kollidiert mit dem Katalog-Eintrag feld_3/fremd_3.
  const fehler = V._pruefeNamensraumKollision(paket, katalog);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /fremd\/3/);
});

test('[Fund 2] ohne Katalog bleibt die Prüfung folgenlos (unverändert)', () => {
  const { V } = ladeIssuer();
  const paket = { anbieter: { anbieterId: 'eigen' }, templates: [{ felder: [{ feldname: 'Feld 3' }] }] };
  assert.equal(V._pruefeNamensraumKollision(paket, null).length, 0);
});

test('[Fund 2 · Wächter] derselbe Katalog liefert bei zwei Aufrufen denselben gecachten Index — kein Neubau pro Aufruf', () => {
  const { V } = ladeIssuer();
  const katalog = beispielKatalog(20);
  const paket = { anbieter: { anbieterId: 'eigen' }, templates: [] };
  V._pruefeNamensraumKollision(paket, katalog);
  const ersterIndex = V._namensraumIndex(katalog);
  V._pruefeNamensraumKollision(paket, katalog);
  const zweiterIndex = V._namensraumIndex(katalog);
  assert.equal(ersterIndex, zweiterIndex, 'derselbe Katalog -> derselbe (gecachte) Map-Instanz, kein linearer Neubau je Aufruf');
  assert.equal(ersterIndex.get('feld_5')[0].anbieterId, 'fremd/5', 'der Index ist tatsächlich nach feldSlug indiziert');
});

test('[Fund 2 · Gegenprobe] ein ANDERES Katalog-Objekt (z. B. neu geladen) bekommt einen eigenen Index', () => {
  const { V } = ladeIssuer();
  const katalogA = beispielKatalog(5);
  const katalogB = beispielKatalog(5);
  assert.notEqual(V._namensraumIndex(katalogA), V._namensraumIndex(katalogB), 'zwei verschiedene Katalog-Objekte teilen sich nicht denselben Index');
});
