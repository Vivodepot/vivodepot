'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-8 Zug 5 („W-8 Doppelerfassung", 09.08.2026): der
   PWA-Installations-Hinweis bekommt einen zweiten, festen Platz in den
   Einstellungen — dieselbe Quelle (`_installBlockHTML()`), derselbe Knopf,
   dieselbe Verschwinde-Bedingung wie die Startseite. Die Startseite selbst
   bleibt unangetastet (Auftragswortlaut).
   ────────────────────────────────────────────────────────────────────────
   Zwei Container können jetzt gleichzeitig im DOM stehen (Startseite hinter
   `.weg` verborgen, aber nicht ausgehängt — `_eingangsschirmDomAufraeumen()`
   leert nur `#content`, nicht `#overlay-inhalt`). Eine feste id für den
   Knopf/Container hätte ab dem zweiten Ort ein Duplikat erzeugt, das
   `getElementById` nur einmal träfe — der genau in dieser Sitzung schon
   zweimal gefundenen Klasse „Node sieht es, ein echter Browser bricht"
   (Zug 5 des ersten Auftrags: onfocusout, Enter/Space). Deshalb die
   Verkabelung testweise auf Struktur/Zustand beschränkt — die echte
   Mehrfach-Container-Verkabelung ist Sache der Browser-Abnahme (Zug 8),
   nicht des Node-Kerns (querySelectorAll liefert im Node-DOM-Stub keine
   verbundenen Elemente, s. tests/load-kern.js-Kopf).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Zug5] einstellungenHTML() traegt einen eigenen Abschnitt fuer die Installation, eigener Container', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  assert.ok(html.includes(V.STRINGS.einstAbschnittPwa), 'eigene Ueberschrift');
  assert.ok(html.includes('id="einst-install-block"'), 'eigener Container, nicht dieselbe id wie die Startseite');
  assert.ok(!html.includes('id="vd-install-block"'), 'NICHT dieselbe id wie die Startseite (Duplikat-Gefahr)');
});

test('[Zug5] ohne gehaltenen Install-Prompt zeigt der Einstellungen-Block denselben passiven Hinweis wie die Startseite', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.webAppHinweis)), 'derselbe passive iOS-Hinweis, dieselbe Quelle (_installBlockHTML)');
});

test('[Zug5] mit gehaltenem Install-Prompt zeigt der Einstellungen-Block denselben aktiven Knopf wie die Startseite', () => {
  const { V } = ladeKern();
  V._setzeDeferredInstallPrompt({});
  const html = V.einstellungenHTML();
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.installKnopf)), 'derselbe aktive Knopf-Text');
  assert.ok(html.includes('webapp-install-knopf'), 'dieselbe Knopf-Klasse wie die Startseite (Wiring-Grundlage)');
});

test('[Zug5] nach der Installation verschwindet der GANZE Abschnitt (nicht nur der Knopf) — dieselbe Bedingung wie die Startseite', () => {
  const { V } = ladeKern();
  V._setzeAppWurdeInstalliert(true);
  const html = V.einstellungenHTML();
  assert.ok(!html.includes('id="einst-install-block"'), 'kein leerer Abschnitt mit Ueberschrift ohne Inhalt');
  assert.ok(!html.includes(V.STRINGS.einstAbschnittPwa), 'auch die Ueberschrift ist weg, nicht nur der Knopf');
});

test('[Zug5] istStandaloneWebApp() true laesst den Abschnitt ebenfalls verschwinden (zweite Bedingung derselben Quelle)', () => {
  const { V } = ladeKern();
  assert.equal(V._appWurdeInstalliertHalter(), false, 'Vorbedingung: sauberer Start');
  // _installBlockHTML() selbst prueft `_appWurdeInstalliert || istStandaloneWebApp()` — die zweite
  // Bedingung ist im Node-DOM-Stub nicht stellbar (kein echtes matchMedia), darum hier nur die
  // ERSTE Bedingung ueber denselben Codepfad gemessen (das Verschwinden IST bereits durch den Test
  // oben belegt) — dieser Test haelt lediglich fest, dass beide Bedingungen in EINER Quelle stehen.
  const quelle = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const funktionsStart = quelle.indexOf('function _installBlockHTML()');
  const funktionsBlock = quelle.slice(funktionsStart, funktionsStart + 400);
  assert.match(funktionsBlock, /_appWurdeInstalliert \|\| istStandaloneWebApp\(\)/, 'eine Quelle fuer beide Verschwinde-Bedingungen');
});

test('[Zug5] Startseite unveraendert: derselbe Container behaelt seine bisherige id, traegt zusaetzlich die geteilte Host-Klasse', () => {
  const { html } = ladeKern();
  assert.match(html, /<div class="vd-install-block-host" id="vd-install-block">/, 'Startseite bleibt an ihrer id erkennbar, zusaetzlich die Host-Klasse fuer die Mehrfach-Aktualisierung');
});

test('[Zug5] _installBlockAktualisieren() und _installKnopfVerdrahten() sind auf mehrere Container ausgelegt (Quelltext-Beleg, s. Kopf-Kommentar)', () => {
  const quelle = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const aktStart = quelle.indexOf('function _installBlockAktualisieren()');
  const aktBlock = quelle.slice(aktStart, aktStart + 1200);
  assert.match(aktBlock, /querySelectorAll\(['"]\.vd-install-block-host['"]\)/, '_installBlockAktualisieren aktualisiert JEDEN Host, nicht nur den ersten per id');
  assert.match(aktBlock, /closest\(['"]\.einst-abschnitt['"]\)/, '_installBlockAktualisieren versteckt den umschliessenden Abschnitt live mit (Rotmachbarkeit s. e2e-Spec)');
  const verdrahtStart = quelle.indexOf('function _installKnopfVerdrahten()');
  const verdrahtBlock = quelle.slice(verdrahtStart, verdrahtStart + 400);
  assert.match(verdrahtBlock, /querySelectorAll\(['"]\.webapp-install-knopf['"]\)/, '_installKnopfVerdrahten verdrahtet JEDEN Knopf, nicht nur den ersten per id');
});
