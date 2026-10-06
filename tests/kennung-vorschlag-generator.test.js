'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Kennungs-Vorschlag im Template-Generator (U2-ADR-409, Punkt 3/5)
   ────────────────────────────────────────────────────────────────────────
   Prüft die DOM-freien Bau-Funktionen der neuen fünften Ausgabeart: eine
   fehlende Kennung vorschlagen, OHNE Vorlage drumherum. Geprüft:

     1. `baueKennungVorschlagPaket` erzeugt ein Paket, das gegen das (jetzt
        `anyOf`-erweiterte) Submission-Schema validiert — insbesondere OHNE
        `templates`, was vor U2-ADR-409 Punkt 3 abgelehnt worden wäre.
     2. Dasselbe Paket validiert auch beim VC-Issuer (T-CROSS-08-Symmetrie
        gilt für diesen neuen Fall genauso wie für Templates).
     3. `_kennungNameSlug` baut die Kennungsform (ASCII, lowerCamelCase) aus
        Freitext — Umlaute, Leerzeichen, Großschreibung.
     4. `kennungVorschlagMailtoText`/`-Link`: lesbarer Text nennt Kennung,
        Beschriftungen, Begründung; das JSON fällt bei Überlänge weg, die
        heruntergeladene Datei bleibt davon unberührt (das prüft dieser Test
        nicht — er prüft nur den Text, den `blobDownload` NICHT sieht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');

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

async function paketBauen(V) {
  const paar = await V.erzeugeSchluesselpaarRoh();
  const anbieter = V.baueAnbieter(gueltigeStammdaten());
  return V.baueKennungVorschlagPaket({
    anbieter,
    publicKeyJwk: paar.publicJwk,
    kennungVorschlaege: [{
      kennung: 'health.careLevelTarget',
      labelDe: 'Pflegegrad-Zielwert',
      labelEn: 'Target care level',
      begruendung: 'Im Aufnahmebogen wird neben dem aktuellen Pflegegrad auch der beantragte Zielwert erfasst.',
    }],
  });
}

test('[Kennung-Vorschlag·Generator] _kennungNameSlug: Umlaute, Leerzeichen, Großschreibung → ASCII lowerCamelCase', () => {
  const { V } = ladeGenerator();
  assert.equal(V._kennungNameSlug('Pflegegrad-Zielwert'), 'pflegegradZielwert');
  assert.equal(V._kennungNameSlug('Prüfüng ÄÖÜ'), 'pruefuengAeoeue');
});

test('[Kennung-Vorschlag·Generator] _kennungNameSlug: nur ASCII im Ergebnis, lowerCamelCase, keine Unterstriche', () => {
  const { V } = ladeGenerator();
  const s = V._kennungNameSlug('  Kontakt für Zweitmeinung!!  ');
  assert.match(s, /^[a-z][a-zA-Z0-9]*$/);
  assert.equal(s, 'kontaktFuerZweitmeinung');
});

test('[Kennung-Vorschlag·Generator] baueKennungVorschlagPaket: gültig gegen das Schema OHNE templates', async () => {
  const { V } = ladeGenerator();
  const paket = await paketBauen(V);
  assert.ok(!('templates' in paket), 'das Paket trägt bewusst kein templates');
  assert.deepEqual(rein(V.validiereSubmission(paket)), [],
    'ein Paket nur mit kennungVorschlaege muss seit dem anyOf-Zusatz gültig sein');
});

test('[Kennung-Vorschlag·Generator] baueKennungVorschlagPaket: auch der VC-Issuer akzeptiert es (Symmetrie wie T-CROSS-08)', async () => {
  const { V } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  const paket = await paketBauen(V);
  assert.deepEqual(rein(ISS.validiereSubmission(paket)), []);
});

test('[Kennung-Vorschlag·Generator·Gegenprobe] ohne templates UND ohne kennungVorschlaege ist das Paket ungültig', () => {
  const { V } = ladeGenerator();
  const paket = { submissionId: 'x', submissionTimestamp: 'y', generatorVersion: 'v1.0', anbieter: {}, publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
  const fehler = V.validiereSubmission(paket);
  assert.ok(fehler.length > 0, 'ein Paket ganz ohne Inhalt muss die anyOf-Bedingung verletzen');
});

test('[Kennung-Vorschlag·Generator] mailto-Text nennt Kennung, Beschriftungen, Begründung und die Submission-ID', async () => {
  const { V } = ladeGenerator();
  const paket = await paketBauen(V);
  const text = V.kennungVorschlagMailtoText(paket, true);
  assert.ok(text.includes('health.careLevelTarget'));
  assert.ok(text.includes('Pflegegrad-Zielwert'));
  assert.ok(text.includes('Target care level'));
  assert.ok(text.includes(paket.submissionId));
});

test('[Kennung-Vorschlag·Generator] mailto-Link: bei Überlänge fällt das JSON weg, der Rest bleibt', async () => {
  const { V } = ladeGenerator();
  const paket = await paketBauen(V);
  paket.kennungVorschlaege[0].begruendung = 'x'.repeat(900); // erzwingt Überlänge
  const link = V.kennungVorschlagMailtoLink(paket);
  assert.ok(link.startsWith('mailto:register@vivodepot.de'));
  const decodedBody = decodeURIComponent(link.split('&body=')[1]);
  assert.ok(!decodedBody.includes('"kennungVorschlaege"'),
    'das rohe JSON darf bei Überlänge nicht im mailto-Body stehen');
  assert.ok(decodedBody.includes('health.careLevelTarget'), 'die lesbare Zusammenfassung bleibt aber erhalten');
});

test('[Kennung-Vorschlag·Generator] kennungVorschlagDateiname: trägt Anbieter-Slug und Submission-Kürzel', async () => {
  const { V } = ladeGenerator();
  const paket = await paketBauen(V);
  const name = V.kennungVorschlagDateiname(paket.anbieter.anbieterId, paket.submissionId);
  assert.match(name, /^vivodepot-kennungsvorschlag-.*\.json$/);
  assert.ok(name.includes(paket.submissionId.slice(0, 8)));
});
