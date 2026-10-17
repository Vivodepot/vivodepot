'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Proben für tools/ausgaenge-fremdparser-pruefen.js (18.09.2026)
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { pruefeVcf, pruefeIcs } = require('../../tools/ausgaenge-fremdparser-pruefen.js');

function datei(inhalt, endung) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fremdparser-probe-'));
  const p = path.join(dir, 'probe.' + endung);
  fs.writeFileSync(p, inhalt);
  return { p, aufraeumen: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('[Fremdparser·vCard] eine echte, vollständige Karte geht grün durch die fremde Bibliothek', () => {
  const inhalt = 'BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Maria Mustermann\r\nN:Mustermann;Maria;;;\r\nTEL;TYPE=voice:0151 12345678\r\nEMAIL:maria@example.de\r\nEND:VCARD\r\n';
  const { p, aufraeumen } = datei(inhalt, 'vcf');
  try {
    const r = pruefeVcf(p);
    assert.equal(r.erfolg, true, `Unerwartet rot — ${JSON.stringify(r)}`);
    assert.equal(r.anzahlKarten, 1);
    assert.equal(r.befunde[0].fn, 'Maria Mustermann');
  } finally { aufraeumen(); }
});

test('[Fremdparser·vCard·Rot-Beweis] eine Karte ohne FN wird von der fremden Bibliothek als unvollständig erkannt', () => {
  const inhalt = 'BEGIN:VCARD\r\nVERSION:4.0\r\nTEL;TYPE=voice:0151 12345678\r\nEND:VCARD\r\n';
  const { p, aufraeumen } = datei(inhalt, 'vcf');
  try {
    const r = pruefeVcf(p);
    assert.equal(r.erfolg, false, 'eine Karte ohne FN muss rot sein');
    assert.equal(r.befunde[0].fnVorhanden, false);
  } finally { aufraeumen(); }
});

test('[Fremdparser·vCard] mehrere Karten in einer Datei (vcard-menschen) werden EINZELN geprüft', () => {
  const inhalt = 'BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Anna Schmidt\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:4.0\r\nFN:Ben Berg\r\nEND:VCARD\r\n';
  const { p, aufraeumen } = datei(inhalt, 'vcf');
  try {
    const r = pruefeVcf(p);
    assert.equal(r.erfolg, true);
    assert.equal(r.anzahlKarten, 2);
  } finally { aufraeumen(); }
});

test('[Fremdparser·ICS] ein echtes VEVENT mit UID/DTSTAMP/DTSTART geht grün durch ical.js', () => {
  const inhalt = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vivodepot//Termine//DE\r\nCALSCALE:GREGORIAN\r\nBEGIN:VEVENT\r\nUID:probe-1@vivodepot.de\r\nDTSTAMP:20260918T184919Z\r\nDTSTART;VALUE=DATE:20270918\r\nSUMMARY:Probe\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  const { p, aufraeumen } = datei(inhalt, 'ics');
  try {
    const r = pruefeIcs(p);
    assert.equal(r.erfolg, true, `Unerwartet rot — ${JSON.stringify(r)}`);
    assert.equal(r.anzahlVevents, 1);
    assert.equal(r.befunde[0].uidVorhanden, true);
    assert.equal(r.befunde[0].dtstampVorhanden, true);
    assert.equal(r.befunde[0].dtstartVorhanden, true);
  } finally { aufraeumen(); }
});

test('[Fremdparser·ICS·Rot-Beweis] ein VEVENT ohne DTSTAMP wird von ical.js als unvollständig erkannt', () => {
  // RFC 5545 §3.6.1: UID und DTSTAMP MÜSSEN vorhanden sein — DTSTAMP hier bewusst weggelassen.
  const inhalt = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vivodepot//Termine//DE\r\nBEGIN:VEVENT\r\nUID:probe-2@vivodepot.de\r\nDTSTART;VALUE=DATE:20270918\r\nSUMMARY:Probe ohne Stempel\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  const { p, aufraeumen } = datei(inhalt, 'ics');
  try {
    const r = pruefeIcs(p);
    assert.equal(r.erfolg, false, 'ein VEVENT ohne DTSTAMP muss rot sein');
    assert.equal(r.befunde[0].dtstampVorhanden, false);
  } finally { aufraeumen(); }
});

test('[Fremdparser·ICS·Gegenprobe] ein leerer Kalender (keine VEVENTs) ist kein Fehler', () => {
  // Legitimer Fall (Testament ohne Intervall, eine strukturelle Probe der Formate hält ihn fest) — ein
  // ICS ohne Termine ist eine gültige, leere Kalenderdatei, kein Rot-Fund.
  const inhalt = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vivodepot//Termine//DE\r\nEND:VCALENDAR\r\n';
  const { p, aufraeumen } = datei(inhalt, 'ics');
  try {
    const r = pruefeIcs(p);
    assert.equal(r.erfolg, true, `ein leerer Kalender darf nicht rot sein — ${JSON.stringify(r)}`);
    assert.equal(r.anzahlVevents, 0);
  } finally { aufraeumen(); }
});

test('[Fremdparser·ICS·Rot-Beweis] eine strukturell kaputte Datei wird von ical.js selbst abgelehnt', () => {
  const inhalt = 'DAS IST KEIN ICS\r\n';
  const { p, aufraeumen } = datei(inhalt, 'ics');
  try {
    const r = pruefeIcs(p);
    assert.equal(r.erfolg, false, 'eine kaputte Datei muss rot sein');
  } finally { aufraeumen(); }
});

/* DIE AUSGABE DES PRODUKTS SELBST durch die fremden Parser (19.09.2026). Bis hierher stand an dieser
   Stelle eine Probe gegen Dateien unter /tmp/vd-ausgaenge-messung, die bei jedem anderen Rechner
   fehlten — die Probe kehrte dann still zurück und war grün, ohne etwas geprüft zu haben. Jetzt
   erzeugt der Kern die Dateien selbst (kernAPI.exportiere, derselbe Weg wie die strukturelle Probe der Formate),
   und ein leeres Ergebnis ist rot. */
const { ladeKern } = require('../load-kern.js');
async function depotMitAngaben() {
  const { V } = ladeKern();
  await V.depotAnlegen('fremdparser-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'telephone', '0151 12345678');
  V.sektorFeldSetzen('identity', 'email', 'maria@example.de');
  V.personHinzufuegen({ name: 'Anna Schmidt', tel: '0151 1', beziehung: 'Schwester' });
  V.personHinzufuegen({ name: 'Ben Berg', email: 'ben@x.example.de' });
  V.instrumentDokumentNachtragen({ instrument: 'living-will', dateOfLastChange: '2022-03-04' }, new Date());
  return V;
}

test('[Fremdparser·Produkt] die vCard der Identität, vom Kern erzeugt, besteht vcard-parser', async () => {
  const V = await depotMitAngaben();
  const vcf = V.kernAPI.exportiere('vcard-identitaet');
  assert.ok(typeof vcf === 'string' && vcf.includes('BEGIN:VCARD'), 'Vorbedingung: der Kern hat eine Karte erzeugt');
  const { p, aufraeumen } = datei(vcf, 'vcf');
  try {
    const r = pruefeVcf(p);
    assert.equal(r.erfolg, true, 'vom Kern erzeugt und trotzdem rot — ' + JSON.stringify(r));
    assert.equal(r.anzahlKarten, 1);
    assert.equal(r.befunde[0].fn, 'Maria Mustermann');
  } finally { aufraeumen(); }
});

test('[Fremdparser·Produkt] die vCards „Meine Menschen", vom Kern erzeugt, bestehen vcard-parser einzeln', async () => {
  const V = await depotMitAngaben();
  const vcf = V.kernAPI.exportiere('vcard-menschen');
  const { p, aufraeumen } = datei(vcf, 'vcf');
  try {
    const r = pruefeVcf(p);
    assert.equal(r.erfolg, true, 'vom Kern erzeugt und trotzdem rot — ' + JSON.stringify(r));
    assert.equal(r.anzahlKarten, 2);
    assert.deepEqual(r.befunde.map((b) => b.fn).sort(), ['Anna Schmidt', 'Ben Berg']);
  } finally { aufraeumen(); }
});

test('[Fremdparser·Produkt] der Prüftermin-Kalender, vom Kern erzeugt, besteht ical.js', async () => {
  const V = await depotMitAngaben();
  assert.ok(V.icsHatTermine(), 'Vorbedingung: das Depot hat einen Prüftermin');
  const ics = V.kernAPI.exportiere('ics-vorsorge');
  const { p, aufraeumen } = datei(ics, 'ics');
  try {
    const r = pruefeIcs(p);
    assert.equal(r.erfolg, true, 'vom Kern erzeugt und trotzdem rot — ' + JSON.stringify(r));
    assert.ok(r.anzahlVevents >= 1, 'mindestens ein VEVENT, sonst prüft die Probe nichts');
    assert.equal(r.befunde.every((b) => b.uidVorhanden && b.dtstampVorhanden && b.dtstartVorhanden), true);
  } finally { aufraeumen(); }
});
