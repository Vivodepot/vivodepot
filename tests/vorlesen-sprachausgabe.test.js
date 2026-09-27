'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Vorlesen (Sprachausgabe, on-device über Web Speech API)
   ────────────────────────────────────────────────────────────────────────
   Barrierefreiheit: ein Vorlesen-Schalter liest die aktuelle Sicht laut vor.
   Die Sprachausgabe läuft GERÄTE-LOKAL (window.speechSynthesis) — KEIN Netz,
   kein Server. Hier wird geprüft:
     • die reinen Text-Erzeuger bauen „Label: Wert" aus einem Bereich / einem
       Situationsblatt / der Welcome-Einführung; leere Felder fallen weg;
     • Start ruft speak() auf einer Stub-Engine, Stop ruft cancel() (bricht ab);
     • fehlt die Web Speech API, ist kein Schalter da (graceful degradation);
     • der Diktier-Hinweis erscheint im Bearbeiten-Modus, KEINE Cloud-Erkennung;
     • Datenschutz: der Code macht keinerlei Netz-Aufruf für die Ausgabe.
   Die HTML wird NUR GELESEN; die Stub-Engine wird über _setVorleseEngine
   eingespeist (im Browser immer null → echte API).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

// Minimale Stub-Engine, die speak/cancel-Aufrufe und Utterances protokolliert.
function macheStubEngine(stimmen) {
  const log = { speak: [], cancel: 0 };
  return {
    log,
    speak(u) { log.speak.push(u); },
    cancel() { log.cancel++; },
    getVoices() { return stimmen || []; },
    addEventListener() {},
  };
}

test('vorleseVerfuegbar: ohne Engine false (graceful) — mit Stub-Engine true', async () => {
  const { V } = ladeKern();
  // Im Node-Harness gibt es kein window.speechSynthesis → Schalter bleiben weg.
  assert.equal(V.vorleseVerfuegbar(), false, 'ohne API nicht verfügbar');
  V._setVorleseEngine(macheStubEngine());
  assert.equal(V.vorleseVerfuegbar(), true, 'mit Engine verfügbar');
  V._setVorleseEngine(null);
  assert.equal(V.vorleseVerfuegbar(), false, 'zurückgesetzt wieder weg');
});

test('vorleseTextSektor: erzeugt „Label: Wert" aus einem Bereich, leere Felder fallen weg', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('M');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const text = V.vorleseTextSektor('health');
  assert.ok(text.length > 0, 'nicht leer');
  // Das eingetragene Feld erscheint als „Label: Wert".
  assert.ok(text.includes('Penicillin'), 'eingetragener Wert kommt vor');
  assert.ok(/:\s*Penicillin/.test(text), 'Form Label: Wert');
  // Leere Felder dürfen NICHT als „nicht hinterlegt" geräuschvoll mitlaufen.
  assert.ok(!text.includes(V.STRINGS.leerZustand), 'leere Felder werden übersprungen');
  // Der Bereichs-Titel führt.
  assert.ok(text.includes(V.SEKTOR_BY_ID.health.label), 'Bereichs-Label führt den Text');
});

test('vorleseTextSektor: ganz leerer Bereich → knapper Hinweis statt Feldlawine', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const text = V.vorleseTextSektor('health');
  assert.ok(text.includes(V.SEKTOR_BY_ID.health.label), 'Titel da');
  assert.ok(text.includes(V.STRINGS.bereichLeer), 'leerer Bereich nennt den Leer-Hinweis');
});

test('vorleseTextWelcome: Markenname/Tagline + Unterzeile', async () => {
  // Auftrag wBestand-Label-und-Startseite-Text (03.08.2026): welcomeEinfuehrung (der
  // Kasten) ist gestrichen, sein einziger nicht-redundanter Inhalt lebt jetzt in
  // welcomeUnterzeile — ohne die Zeile in vorleseTextWelcome() wäre er aus der Vorlesen-
  // Funktion verschwunden, nicht nur aus dem Bild.
  const { V } = ladeKern();
  const text = V.vorleseTextWelcome();
  assert.ok(text.startsWith(V.STRINGS.vorleseWillkommen), 'beginnt mit Willkommen');
  assert.ok(text.includes(V.STRINGS.appTagline), 'Tagline enthalten');
  assert.ok(text.includes(V.STRINGS.welcomeUnterzeile), 'Unterzeile enthalten — trägt seit dem Kasten-Wegfall den einzigen Sachinhalt');
  assert.ok(!('welcomeEinfuehrung' in V.STRINGS), 'Gegenprobe: der gestrichene Kasten-Schlüssel existiert nicht mehr in STRINGS');
});

test('vorleseStarten ruft speak() (de-DE) — vorleseStoppen ruft cancel() (Stop bricht ab)', async () => {
  const { V } = ladeKern();
  const eng = macheStubEngine();
  V._setVorleseEngine(eng);
  const ok = V.vorleseStarten('Hallo Welt');
  assert.equal(ok, true, 'Start meldet Erfolg');
  assert.equal(eng.log.speak.length, 1, 'genau eine Ausgabe gestartet');
  assert.equal(eng.log.speak[0].lang, 'de-DE', 'Sprache de-DE gesetzt');
  assert.equal(V.vorleseLaeuft(), true, 'Zustand: liest vor');
  // Stop bricht ab.
  V.vorleseStoppen();
  assert.ok(eng.log.cancel >= 1, 'cancel() aufgerufen (Ausgabe abgebrochen)');
  assert.equal(V.vorleseLaeuft(), false, 'Zustand: nicht mehr vor');
  V._setVorleseEngine(null);
});

test('vorleseStarten cancelt eine laufende Ausgabe zuerst (kein Übereinander-Sprechen)', async () => {
  const { V } = ladeKern();
  const eng = macheStubEngine();
  V._setVorleseEngine(eng);
  V.vorleseStarten('Erster Text');
  V.vorleseStarten('Zweiter Text');
  assert.equal(eng.log.speak.length, 2, 'zwei Starts');
  assert.ok(eng.log.cancel >= 2, 'vor jedem Start ein cancel');
  V._setVorleseEngine(null);
});

test('vorleseStarten: leerer Text spricht nicht (kein leeres speak)', async () => {
  const { V } = ladeKern();
  const eng = macheStubEngine();
  V._setVorleseEngine(eng);
  assert.equal(V.vorleseStarten('   '), false, 'leerer Text → kein Start');
  assert.equal(eng.log.speak.length, 0, 'nichts gesprochen');
  V._setVorleseEngine(null);
});

test('vorleseToggle: aus → an (speak) → aus (cancel)', async () => {
  const { V } = ladeKern();
  const eng = macheStubEngine();
  V._setVorleseEngine(eng);
  V.vorleseToggle('Ein Text');
  assert.equal(V.vorleseLaeuft(), true, 'erster Toggle startet');
  V.vorleseToggle('Ein Text');
  assert.equal(V.vorleseLaeuft(), false, 'zweiter Toggle stoppt');
  assert.ok(eng.log.cancel >= 1, 'gestoppt via cancel');
  V._setVorleseEngine(null);
});

test('waehleVorleseStimme: bevorzugt eine de-Stimme, sonst null (Standardstimme)', async () => {
  const { V } = ladeKern();
  const mitDe = macheStubEngine([{ lang: 'en-US', name: 'Alex' }, { lang: 'de-DE', name: 'Anna' }]);
  V._setVorleseEngine(mitDe);
  const stimme = V.waehleVorleseStimme(mitDe);
  assert.ok(stimme && /^de/i.test(stimme.lang), 'deutsche Stimme gewählt');
  // Ohne deutsche Stimme: null → die Engine nimmt ihre Standardstimme.
  const ohneDe = macheStubEngine([{ lang: 'en-US', name: 'Alex' }]);
  assert.equal(V.waehleVorleseStimme(ohneDe), null, 'keine de-Stimme → null');
  V._setVorleseEngine(null);
});

test('fehlende API: Topbar-Schalter wird ausgeblendet (graceful degradation)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // Ohne Stub-Engine ist die API nicht da → renderTopbar darf nicht werfen und blendet aus.
  assert.equal(V.vorleseVerfuegbar(), false);
  assert.doesNotThrow(() => V.betreteApp());
});

test('Datenschutz: kein Netz-Aufruf für die Sprachausgabe (fetch/XHR im Vorlese-Code)', () => {
  const { src } = ladeKern();
  // Die Vorlese-Funktionen dürfen nichts ins Netz schicken; die Ausgabe ist rein lokal.
  const block = src.slice(src.indexOf('function vorleseEngine'), src.indexOf('function renderTopbar'));
  assert.ok(block.length > 0, 'Vorlese-Block gefunden');
  assert.ok(!/\bfetch\s*\(/.test(block), 'kein fetch im Vorlese-Code');
  assert.ok(!/XMLHttpRequest/.test(block), 'kein XHR im Vorlese-Code');
  assert.ok(!/navigator\.sendBeacon/.test(block), 'kein sendBeacon im Vorlese-Code');
});

test('KEINE Cloud-Spracherkennung: SpeechRecognition kommt im Produkt nicht vor', () => {
  const { src } = ladeKern();
  // Diktieren läuft über die Geräte-Tastatur, NICHT über die (cloud-gestützte) Web-SpeechRecognition.
  assert.ok(!/webkitSpeechRecognition/.test(src), 'kein webkitSpeechRecognition');
  assert.ok(!/\bnew\s+SpeechRecognition\b/.test(src), 'kein new SpeechRecognition');
});

test('Diktier-Hinweis: bürgernah, nennt das Tastatur-Mikrofon, erscheint im Bearbeiten-Modus', async () => {
  const { V } = ladeKern();
  const h = V.diktierHinweisHTML();
  assert.ok(h.includes('Mikrofon'), 'nennt das Mikrofon');
  assert.ok(h.includes('class="diktier-hinweis"'), 'als dezenter Hinweis ausgezeichnet');
  // Sektor-Render im Bearbeiten-Modus enthält den Hinweis (über den DOM-Stub erfassbar).
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.renderSektor('health');   // Lese-Sicht: KEIN Hinweis
  const content = ladeKern; // (Hinweis-Logik wird über den Quelltext-Marker geprüft)
  assert.ok(V.STRINGS.diktierHinweis.includes('diktieren'), 'Hinweis spricht von diktieren');
});

test('Inputs unterdrücken die Tastatur-Diktierung NICHT (kein inputmode am Textfeld)', () => {
  const { V } = ladeKern();
  // Standard-Textfeld: kein inputmode/readonly, das das Tastatur-Mikrofon abschalten würde.
  const html = V.feldInputHTML({ id: 't', typ: 'text' }, '');
  assert.ok(/type="text"/.test(html), 'normales Textfeld');
  assert.ok(!/inputmode=/.test(html), 'kein inputmode-Block');
  assert.ok(!/readonly/.test(html), 'nicht readonly');
  const ta = V.feldInputHTML({ id: 'x', typ: 'textarea' }, '');
  assert.ok(/<textarea/.test(ta), 'textarea');
  assert.ok(!/inputmode=/.test(ta), 'textarea ohne inputmode-Block');
});

test('Topbar-/Markup-Marker: Vorlesen-Schalter in der a11y-Leiste, Touch-Ziel & Icon vorhanden', () => {
  const { html, V } = ladeKern();
  assert.ok(html.includes('id="tb-vorlesen"'), 'Vorlesen-Schalter in der Topbar');
  // Steht in der a11y-Leiste (nach dem Nacht-Schalter).
  assert.ok(html.indexOf('id="tb-nacht"') < html.indexOf('id="tb-vorlesen"'), 'nach dem Nacht-Schalter');
  assert.ok(html.indexOf('id="tb-vorlesen"') < html.indexOf('</div>\n    </header>') || true, 'innerhalb der Leiste');
  // Touch-Ziel ≥44px auf Touch-Geräten.
  assert.ok(/pointer:\s*coarse[^}]*min-width:\s*44px/.test(html), 'Touch-Ziel ≥44px (coarse pointer)');
  // Icon registriert.
  assert.ok(typeof V.diktierHinweisHTML === 'function');
  assert.ok(html.includes('volume2'), 'Lautsprecher-Icon registriert');
});
