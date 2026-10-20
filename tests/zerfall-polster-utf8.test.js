'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Befund POLSTER-UTF8 (05.10.2026, MITTEL) — alle Geheimteile einer Datei sind gleich lang, in Bytes
   ────────────────────────────────────────────────────────────────────────────
   Der Geheimteil jedes Eintrags wird aufgefüllt, damit seine Länge nicht verrät, welcher Eintrag welche Angaben trägt
   (U2-ADR-156). Gemessen wurde bis hierher in UTF-16-Zeichen, verschlüsselt wird UTF-8: ein Kreisname mit Umlaut machte
   den Geheimteil seines Fachs länger. Die Proben: (1) mit Umlaut, Emoji (4 Byte) und einem 120 Zeichen langen
   Emoji-Namen sind alle Geheimteile und alle Umschläge einer Datei gleich lang; jedes Fach öffnet weiter; (2) eine
   Datei der Fassung vor dem Fix (Korpus a02) und eine vor dem Verzeichnis gelesene Altdatei öffnen weiter;
   (3) Rot-Beweis: die eingefrorene Datei vor dem Fix trägt verschieden lange Geheimteile, das Prüfprogramm meldet es.
   Wächter gegen die Klasse ohne Passwort: tools/format-pruefen.js, Code VDF-POLSTER.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const F = require('../tools/format-pruefen.js');

const REPO = path.join(__dirname, '..');
const KORPUS = path.join(REPO, 'docs', 'format', 'korpus');
// das Passwort der Korpusdateien steht im Manifest (die Testpasswörter bleiben im Format-Strang)
const PW = JSON.parse(fs.readFileSync(path.join(KORPUS, 'korpus.json'), 'utf8')).faelle.find((f) => f.datei === 'a01-attrappe-vor-fix.vivodepot').passwort;
const laengen = (u) => [...new Set(u.umschlagTabelle.map((e) => Buffer.from(e.geheim.ct, 'base64').length))];
const umschlagLaengen = (u) => [...new Set(u.umschlagTabelle.flatMap((e) => Object.values(e.umschlaege).map((v) => Buffer.from(v.ct, 'base64').length)))];

const NAMEN = ['Tante Bärbel', '\u{1F475} Oma', '\u{1F600}'.repeat(60), 'Beispielkreis'];

test('[Polster·UTF-8] Umlaut, Emoji und ein 120 Zeichen langer Emoji-Name: alle Geheimteile und Umschläge gleich lang, jedes Fach öffnet', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erika');
  V.sektorFeldSetzen('health', 'bloodType', '0+');
  for (let i = 0; i < NAMEN.length; i++) {
    await V.empfaengerkreisSetzen({ name: NAMEN[i], bausteine: ['notfall'] });
    await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[i], 'polster-probe-fach-' + i, 'Ort ' + i);
  }
  const u = await V.depotSerialisieren();
  assert.equal(u.umschlagTabelle.length, NAMEN.length + 1, 'Positivkontrolle: Anker und vier Fächer');
  assert.equal(laengen(u).length, 1, 'eine Geheimteil-Länge: ' + laengen(u).join(', '));
  assert.equal(umschlagLaengen(u).length, 1, 'eine Umschlaglänge');
  const r = await F.dateiPruefen('VIVODEPOT' + String.fromCharCode(1) + JSON.stringify(u));
  assert.deepEqual(r.befunde.filter((b) => b.code === 'VDF-POLSTER' || b.code === 'VDF-ATTRAPPE'), []);
  for (let i = 0; i < NAMEN.length; i++) {
    const inhalt = await ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), 'polster-probe-fach-' + i);
    assert.equal(inhalt.sektoren.health.bloodType, '0+', 'Fach ' + i + ' öffnet');
  }
});

test('[Polster·UTF-8] der Leseweg ist unverändert: Dateien der Fassung vor dem Fix öffnen weiter', async () => {
  for (const datei of ['a01-attrappe-vor-fix.vivodepot', 'a02-polster-vor-fix.vivodepot']) {
    const text = fs.readFileSync(path.join(KORPUS, datei), 'utf8');
    const { V } = ladeKern();
    const inhalt = await V.depotLaden(V.umschlagEntpacken(JSON.parse(V.magicStrippen(text).json)), PW);
    assert.equal(inhalt.sektoren.identity.givenName, 'Erika', datei + ' öffnet');
  }
});

test('[Polster·UTF-8·Rot-Beweis] die Datei der Fassung vor dem Fix trägt verschieden lange Geheimteile, und das Prüfprogramm meldet es', async () => {
  const text = fs.readFileSync(path.join(KORPUS, 'a02-polster-vor-fix.vivodepot'), 'utf8');
  const u = JSON.parse(text.slice(10));
  assert.equal(laengen(u).length, 2, 'Anker und Fach mit Umlaut-Namen sind verschieden lang');
  const r = await F.dateiPruefen(text);
  assert.ok(r.befunde.some((b) => b.code === 'VDF-POLSTER'));
});
