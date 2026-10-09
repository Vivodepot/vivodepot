'use strict';
/* safari-luecke.test.js — auf WebKit im Tab liegt nichts still nur im Browserspeicher (06.10.2026, Befund SAFARI-TAB-SPEICHER-OHNE-DATEI)
   WebKit löscht allen Skript-Speicher einer Seite nach sieben Tagen ohne Besuch (webkit.org/tracking-prevention); vom
   iOS-Home-Bildschirm geöffnet gilt das nicht, und beim Hinzufügen wandert der Speicher des Tabs nicht mit (webkit.org/blog/14445).
   Die Erinnerung kam bisher erst nach 14 Tagen, und der iOS-Hinweis versprach, der Home-Bildschirm schütze das schon angelegte
   Depot. Proben je Restfall, mit simuliertem WebKit-Signal (navigator.standalone bzw. CSS.supports), und die Gegenprobe:
   Chromium und Gecko bleiben unverändert (U2-ADR-244). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'safari-luecke-pw-1';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const css = (webkit) => ({ supports: (eig, wert) => webkit && eig === 'font' && wert === '-apple-system-body' });

async function depot({ navigator, CSS }) {
  const m = createIdbMock();
  const k = ladeKern({ indexedDB: m, location: HOSTED, navigator, CSS });
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Maria');
  return { ...k, mock: m };
}

test('[Safari-Lücke·iOS-Tab] Änderungen nach der letzten Datei: die Erinnerung ist beim nächsten Besuch fällig, nicht erst nach 14 Tagen', async () => {
  const { V } = await depot({ navigator: { standalone: false, storage: { persist: async () => false } } });
  V.markiereAlsDateiGesichert();
  V.markiereUngespeichert(2);
  const m = V.exportErinnerungModell();
  assert.equal(m.webkitFrist, true);
  assert.equal(m.tageHer, 0, 'Voraussetzung: die Datei ist von heute — die 14-Tage-Regel allein wäre nicht fällig');
  assert.equal(m.faellig, true);
});

test('[Safari-Lücke·Schreibtisch-Safari] dieselbe Regel über die Engine-Erkennung (CSS.supports), ohne UA-Muster', async () => {
  const { V } = await depot({ navigator: { storage: { persist: async () => false } }, CSS: css(true) });
  assert.equal(V._webkitEngine(), true);
  V.markiereAlsDateiGesichert();
  V.markiereUngespeichert(1);
  assert.equal(V.exportErinnerungModell().faellig, true);
});

test('[Safari-Lücke·Gegenprobe] Chromium und Gecko: keine Einstufung, die 14-Tage-Regel bleibt (U2-ADR-244)', async () => {
  const { V } = await depot({ navigator: { storage: { persist: async () => false } }, CSS: css(false) });
  assert.equal(V.webkitTabMitFrist(), false);
  V.markiereAlsDateiGesichert();
  V.markiereUngespeichert(5);
  const m = V.exportErinnerungModell();
  assert.equal(m.webkitFrist, false);
  assert.equal(m.faellig, false, 'heute gesichert, fünf Änderungen: außerhalb von WebKit keine zusätzliche Erinnerung');
});

test('[Safari-Lücke·Gegenprobe] gewährter Dauerspeicher hebt die Einstufung auf', async () => {
  const { V } = await depot({ navigator: { standalone: false, storage: { persist: async () => true } }, CSS: css(true) });
  await V.depotInIdbSichern();   // fragt persist() an (U2-ADR-031)
  assert.equal(V.webkitTabMitFrist(), false);
});

test('[Safari-Lücke·Rot-Beweis] ohne den WebKit-Zweig wäre derselbe Zustand nicht fällig', async () => {
  const { V } = await depot({ navigator: { standalone: false, storage: { persist: async () => false } } });
  V.markiereAlsDateiGesichert();
  V.markiereUngespeichert(2);
  const m = V.exportErinnerungModell();
  const ohneZweig = !m.jeExportiert || (m.tageHer != null && m.tageHer >= m.schwelleTage);
  assert.equal(ohneZweig, false, 'die alte Regel allein meldet nichts — genau die Lücke');
  assert.equal(m.faellig, true);
});

test('[Safari-Lücke·Daten] die Datei aus dem Anlegen ist die verschlüsselte Sicherungskopie, kein eigener Export', () => {
  assert.match(KERN, /function _dateiNachAnlegenAnbieten\(weiter\) \{[\s\S]{0,900}sicherungskopieErstellen\(\)/);
  assert.match(KERN, /function sicherungskopieErstellen\(\) \{[\s\S]{0,600}depotInDateiSichern\(\)/);
});

test('[Safari-Lücke·Umzug] der Hinweis auf dem iOS-Tab räumt nichts: der Tab-Stand bleibt, bis die Person selbst umzieht', async () => {
  const { V } = await depot({ navigator: { standalone: false, storage: { persist: async () => false } } });
  await V.depotInIdbSichern();
  const vorher = (await V.VdStore.liste()).length;
  V.iosInstallHinweisVielleichtZeigen();
  assert.equal((await V.VdStore.liste()).length, vorher, 'kein Datensatz entfernt');
  assert.match(V.STRINGS.iosInstallHinweis, /Datei öffnen/, 'der Hinweis führt über die Datei in die App (der Speicher wandert nicht mit) — der alte Satz versprach Schutz durch den Home-Bildschirm');
});

test('[Safari-Lücke·iOS-Tab] „Depot anlegen“ bietet zuerst das Anlegen in der App an; im Tab weiter nur mit Datei-Schritt', () => {
  assert.match(KERN, /if \(!_anlegenImTabGewaehlt && iosNichtInstalliert\(\) && !_istDateiHerkunft\(\) && internerSpeicherModus\(\)\) \{ _appAnlegenAnbieten\(/);
  assert.match(KERN, /if \(webkitTabMitFrist\(\)\) _dateiNachAnlegenAnbieten\(fortsetzen\); else fortsetzen\(\);/);
});

test('[Safari-Lücke·Hülle] im Anlege-Fluss genau eine Aufrufstelle der Wiederherstellungs-Hülle, höchstens einmal je Anlegen', () => {
  const fluss = /function flowDepotAnlegen\(nach, grund\) \{[\s\S]*?\n\}\n/.exec(KERN)[0];
  assert.equal((fluss.match(/\bwiederherstellungAnbieten\(/g) || []).length, 1, 'eine Aufrufstelle (U2-ADR-430, kein-master-key G13)');
  assert.match(fluss, /const fortsetzen = \(\) => \{ if \(fortgesetzt\) return; fortgesetzt = true; const p = pw; pw = null; wiederherstellungAnbieten\(p, notfallblattAnbieten\); \};/, 'höchstens einmal, und die Fortsetzung hält das Passwort danach nicht mehr');
  assert.match(fluss, /let pw = pwFuerCode; pwFuerCode = null;/, 'pwFuerCode wird beim Übernehmen geleert');
});

test('[Safari-Lücke·Hülle·Rot-Beweis] ein zweiter Aufrufpfad im WebKit-Zweig zählt zwei Stellen', () => {
  const alt = KERN.replace('if (webkitTabMitFrist()) _dateiNachAnlegenAnbieten(fortsetzen); else fortsetzen();',
    'if (webkitTabMitFrist()) { _dateiNachAnlegenAnbieten(() => wiederherstellungAnbieten(pw, notfallblattAnbieten)); return; } fortsetzen();');
  assert.notEqual(alt, KERN, 'die Mutation greift');
  const fluss = /function flowDepotAnlegen\(nach, grund\) \{[\s\S]*?\n\}\n/.exec(alt)[0];
  assert.equal((fluss.match(/\bwiederherstellungAnbieten\(/g) || []).length, 2);
});
