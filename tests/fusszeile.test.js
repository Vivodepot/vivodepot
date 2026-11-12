'use strict';
/* ═════════════════════════════════════════════════════════════════════
   Test — Seite „Über und Hinweise“ (vormals App-Fußzeile; Bruch A, F2-Umbau 30.07.2026, Umzug 1.11.2026)
   ─────────────────────────────────────────────────────────────────────
   Die feste Fußzeile ist entfallen; ihr Inhalt steht auf der Seite „Über und Hinweise“ (Eintrag am Fuß der Seitenleiste).
   F2 (30.07.2026): die Seite trägt eine AUFFINDBARE, vorlesbare Support-Kennung — „Oma Erna muss es finden". Klartext:
       Version v1.0-rc.74 · Stand 30.07.2026
   Die Werkstatt-Labels (Schale / SW-Cache / SHA) sind WEG. Die Build-Nr ist SCHALEN_STAND in Klartext (pinnt den geladenen
   Build, verrät einen alten Cache). Der SHA-256 steht nicht in der Datei (sie kann ihren eigenen Hash nicht tragen), sondern
   je Fassung in SECURITY.md; die Seite nennt den Ort (Befund BUILD-SHA256-LEERVERSPRECHEN).
   ═════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

const seite = async () => {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.betreteApp();   // Anker-Modus
  k.V.oeffneUeberHinweise();
  return { ...k, html: k.document.getElementById('content').innerHTML };
};

test('Seite „Über und Hinweise“ (Anker): zeigt Lizenz, Version, Kontakt (mailto), Quellcode — die Firma nur am Herkunftsort', async () => {
  const { V, html } = await seite();
  // Auftrag „White Label bis ins PDF" (10.09.2026, Entscheidung „EIN Ort trägt die Herkunft"): `ff-firma`/STRINGS.fussFirma ist
  // entfallen — der Markenname steht NUR am Herkunftsort, der jetzt auf dieser Seite steht (die Herkunftsort-Probe).
  // `fussLizenz` ("Open Source · EUPL-1.2") nennt keinen Markennamen.
  assert.ok(!html.includes('ff-firma'), 'ff-firma-Span ist entfallen');
  assert.ok(html.includes(V.STRINGS.fussLizenz), 'Lizenz EUPL-1.2');
  assert.ok(html.includes(V.BUILD_VERSION), 'Version');
  assert.ok(html.includes('mailto:' + V.STRINGS.fussKontakt), 'Kontakt als mailto');
  assert.ok(html.includes(V.STRINGS.fussQuellcode), 'Quellcode-Link');
  assert.ok(html.includes('data-herkunftsort="1"'), 'der Herkunftsort steht auf der Seite');
});

test('[F2] die vorlesbare Support-Kennung: Version (mit eingefalteter Build-Nr) · Stand', async () => {
  const { V, html } = await seite();
  // NACHBESSERUNG (30.07.): die Build-Nr (SCHALEN_STAND ohne „v") ist in die Versionsnummer GEFALTET — „Version v1.0-rc.74",
  // KEIN eigenes „Build"-Label.
  assert.ok(/^v\d+$/.test(V.SCHALEN_STAND), 'SCHALEN_STAND im Format vNN');
  const buildNr = V.SCHALEN_STAND.replace(/^v/, '');
  assert.ok(html.includes(V.STRINGS.fussVersionLabel) && html.includes('<span class="ueber-version">' + V.BUILD_VERSION + '.' + buildNr + '</span>'),
    'Version-Label + Versionsnummer mit angehängter Build-Nr (v1.0-rc.' + buildNr + '), Klartext');
  assert.ok(!html.includes('Build ' + buildNr), 'kein separates „Build"-Label mehr');
  // Stand <voller Jahrgang>
  assert.match(html, new RegExp('<span class="ueber-stand">\\d{2}\\.\\d{2}\\.\\d{4}</span>'),
    'Stand-Datum mit vollem Jahrgang (vorlesbar, nicht zweistellig)');
});

test('[F2] die Werkstatt-Labels sind WEG — kein Schale/SW-Cache, kein SHA in der Zeile', async () => {
  const { html } = await seite();
  assert.ok(!/Schale/.test(html), 'kein „Schale"-Label auf der Seite');
  assert.ok(!/SW-Cache/.test(html), 'kein „SW-Cache"-Label auf der Seite');
  assert.ok(!html.includes('id="ff-sw"'), 'kein SW-Cache-Span mehr');
});

test('Kein Fußbereich mehr im Notfall (Vollbild-Modus): das Band „veraltete Fassung“ ist weg', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const el = document.getElementById('stale-band');
  V.Modus._setzeIntern('notfall');
  await V.staleBandAktualisieren();
  assert.equal(el.hidden, true, 'Notfall: Band weg');
  V.Modus._setzeIntern('anker');
});

test('Gerüst: die feste Fußzeile ist entfallen — kein app-fuss-Element, keine dritte Grid-Zeile', () => {
  const { html } = ladeKern();
  assert.ok(!html.includes('id="app-fuss"'), 'kein Fußzeilen-Element');
  assert.ok(!html.includes('class="app-fuss"'), 'keine Fußzeilen-Klasse');
  assert.ok(!/\.app-fuss\b/.test(html), 'keine Fußzeilen-Regel im Gerüst');
  assert.ok(/id="stale-band"/.test(html), 'das Band „veraltete Fassung“ hat seinen eigenen Ort');
});

test('Build-Konstanten vorhanden (Version gesetzt; kein eingebetteter Selbst-Hash)', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.BUILD_VERSION, 'string');
  assert.ok(V.BUILD_VERSION.length > 0, 'Version gesetzt');
  // Befund BUILD-SHA256-LEERVERSPRECHEN (10.10.2026): die Datei trägt keine Konstante für ihren eigenen Hash mehr;
  // die Seite „Über und Hinweise“ nennt den Ort, an dem die Prüfsumme je Fassung veröffentlicht ist.
  assert.equal(V.BUILD_SHA256, undefined, 'keine Konstante für einen eingebetteten Selbst-Hash');
  assert.match(String(V.STRINGS.fussPruefsummeOrt), /SECURITY\.md/, 'die Seite „Über und Hinweise“ nennt den Ort der Prüfsumme');
});
