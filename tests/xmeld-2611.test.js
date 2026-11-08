'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS)
/* ═════════════════════════════════════════════════════════════════
   Befund XMELD-2611-NICHT-GELESEN (06.11.2026, HOCH): `parseXMeld` war an einer erfundenen Form gebaut
   (`natuerlichePerson`, `vorname`, `familienname`) und las eine Meldebescheinigung der gültigen Fassung XMeld 26.11
   (Nachricht 1701, Namensraum http://www.osci.de/xmeld2611) nicht: Vorname, Nachname und Geburtsname blieben leer,
   die Erkennung am Inhalt griff nicht, und die Anschrift kam aus der ersten Wohnung, nicht aus der Hauptwohnung.
   Fixture: tests/fixtures/xmeld-2611-meldebescheinigung.example.xml — Aufbau 26.11, Werte erfunden, nichts kopiert.
   Zusicherungen:
     · die Datei wird als XMeld erkannt (Namensraum 26.11, Element `personendaten`);
     · Vorname, Nachname, Geburtsname, Geburtsdatum, Geburtsort, Staatsangehörigkeit und Familienstand der Person;
     · die Anschrift der Hauptwohnung (DSMeld-Blatt 1213: 0 alleinige Wohnung, 1 Hauptwohnung, 2 Nebenwohnung);
     · nichts vom Partner;
     · die bisherige Form liest weiter wie zuvor (tests/import-welle2.test.js).
   ROT-BEWEIS: der Leser vor dem Fix (Stand 5b9746cc1) liest die 26.11-Datei leer bzw. aus der Nebenwohnung — geführt
   vor dem Fix gegen diese Probe; die letzte Probe prüft dazu, dass ein Leser ohne Wohnungsstatus die Nebenwohnung nähme.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FX = path.join(__dirname, 'fixtures');
const XMELD_2611 = fs.readFileSync(path.join(FX, 'xmeld-2611-meldebescheinigung.example.xml'), 'utf8');
const XMELD_ALT = fs.readFileSync(path.join(FX, 'xmeld.example.xml'), 'utf8');
const FELDER = ['givenName', 'familyName', 'birthName', 'birthDate', 'birthPlace', 'street', 'houseNumber', 'postalCode', 'city', 'maritalStatus'];

async function frisch() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k.V;
}
function felder(V) {
  const sd = V.getData().sektoren.identity || {};
  return Object.fromEntries(FELDER.map((f) => [f, sd[f]]));
}

test('[XMeld 26.11] die Meldebescheinigung wird am Inhalt als XMeld erkannt', async () => {
  const V = await frisch();
  assert.equal(V.importFormatErkennen(XMELD_2611, 'identitaet'), 'xmeld');
});

test('[XMeld 26.11] Person und Hauptwohnung werden gelesen, nichts vom Partner', async () => {
  const V = await frisch();
  V.kernAPI.importiere('xmeld', XMELD_2611, { alleKonflikte: true });
  const ist = felder(V);
  assert.deepEqual(ist, {
    givenName: 'Lotte Marie', familyName: 'Beispielfrau', birthName: 'Probeherz', birthDate: '1979-03-08', birthPlace: 'Kleinstadt am See',
    street: 'Am Probeweg', houseNumber: '7a', postalCode: '99999', city: 'Musterhausen', maritalStatus: ist.maritalStatus,
  });
  assert.ok(ist.maritalStatus, 'Familienstand gelesen');
  const alles = JSON.stringify(V.getData().sektoren.identity);
  assert.doesNotMatch(alles, /Partnername|Paul|Partnerstraße|Nebengasse/, 'kein Wert vom Partner oder aus der Nebenwohnung');
});

test('[XMeld 26.11] Staatsangehörigkeit und Familienstand wie in der bisherigen Form', async () => {
  const V = await frisch();
  const p = V.parseXMeld(XMELD_2611);
  assert.deepEqual(p.nationalitaet, ['000']);
  assert.equal(p.familienstand, 'verheiratet');
});

test('[XMeld 26.11] die bisherige Form liest weiter wie zuvor', async () => {
  const V = await frisch();
  const p = V.parseXMeld(XMELD_ALT);
  assert.deepEqual([p.vorname, p.nachname, p.geburtsname, p.geburtsdatum, p.strasse, p.ort], ['Maria', 'Mustermann', 'Müller', '1980-05-15', 'Lindenweg', 'München']);
});

test('[XMeld 26.11·Rot-Beweis] ohne Wohnungsstatus käme die Anschrift aus der Nebenwohnung', async () => {
  const V = await frisch();
  const ohneStatus = XMELD_2611.replace(/<xmeld:statusderwohnung>[\s\S]*?<\/xmeld:statusderwohnung>/g, '');
  const p = V.parseXMeld(ohneStatus);
  assert.equal(p.strasse, 'Nebengasse', 'ohne Status bleibt nur die erste Wohnung — die Probe oben fiele');
  assert.notEqual(V.parseXMeld(XMELD_2611).strasse, p.strasse);
});

test('[XMeld 26.11·Werkzeug] tools/xmeld-echt-pruefen.js: am Fixture jedes Feld gelesen; ein leerer Leser fiele auf', async () => {
  const W = require('../tools/xmeld-echt-pruefen.js');
  const V = await frisch();
  const e = W.pruefen(XMELD_2611, V);
  assert.equal(e.erkannt, true);
  assert.deepEqual(e.zeilen.map((z) => z.stand), W.FELDER.map(() => 'gelesen'), JSON.stringify(e.zeilen));
  const leer = W.vergleichen(W.ausDatei(XMELD_2611), Object.fromEntries(W.FELDER.map((f) => [f, ''])));
  assert.ok(leer.every((z) => z.stand === 'nicht-gelesen'), 'Rot-Beweis: ein Leser, der nichts liefert, ist in jedem Feld nicht-gelesen');
  const { spawnSync } = require('node:child_process');
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'xmeld-echt-pruefen.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /erkannt ja, gelesen 7, nicht gelesen 0, fehlt 0 \(Fixture\)/);
  assert.equal(spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'xmeld-echt-pruefen.js'), '--unbekannt'], { encoding: 'utf8' }).status, 2);
});
