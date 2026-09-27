'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Service-Worker-Update-Zustellung (Bauauftrag 16.07.2026)
   ────────────────────────────────────────────────────────────────────────
   Stufe 1 (registration.update() bei Fokus-Rückkehr) bleibt. Stufe 2 (Hinweis-
   Banner bei controllerchange) ist mit U2-ADR-190 (01.09.2026) ZURÜCKGEBAUT —
   Produktentscheidung: automatische Aktualisierung, kein ungefragter
   Hinweis über Versionen/Neuladen, auch nicht nachträglich. Die zweite Probe
   unten belegt den Rückbau (Rotmachbarkeit: würde die Verdrahtung wieder
   auftauchen, schlägt sie an). Stufe 3 (skipWaiting) bleibt NICHT pauschal AUS,
   sondern PRÄZISE an `_ungespeicherteAenderungen === 0` gebunden (U2-ADR-190:
   die Seite kennt den Zähler, der Worker nicht). Node kann echtes SW-Lebenszyklus-
   Verhalten nicht beweisen (kein Service-Worker-Kontext im Test-Harness) —
   diese Tests prüfen nur, dass die Handgriffe textlich vorhanden sind. Der
   Beweis ist die Mac-Abnahme (CC_Bauauftrag_Service_Worker_Update_2026-07-16.md).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

test('Stufe 1: registration.update() wird bei visibilitychange/focus aufgerufen', () => {
  assert.match(HTML, /document\.addEventListener\('visibilitychange'/, 'visibilitychange-Hörer vorhanden');
  assert.match(HTML, /registrierung\.update\(\)/, 'ruft registration.update() auf');
  assert.match(HTML, /window\.addEventListener\('focus', pruefen\)/, 'auch bei focus');
});

test('[Negativprobe] U2-ADR-190: Stufe 2 (ungefragter Versions-/Neuladen-Hinweis) bleibt zurückgebaut', () => {
  // Rotmachbarkeit dieser Rückbau-Probe: vor dem Rückbau (in dieser Sitzung geprüft) stand hier
  // `_swUpdateHinweisZeigen` und ein `controllerchange`-Hörer, der es rief — beide Muster hätten
  // dieselbe Probe ROT gemacht. Positivkontrolle liegt im Diff dieses Baus, nicht als Mutation
  // hier: eine Wegwerf-Mutation würde denselben Quelltext wiederherstellen, den U2-ADR-190 gerade
  // entfernt hat, und damit die eigene Entscheidung im Test wieder einführen.
  assert.doesNotMatch(HTML, /_swUpdateHinweisZeigen/, 'die Hinweis-Funktion ist entfernt, nicht nur unbenutzt');
  assert.doesNotMatch(HTML, /addEventListener\('controllerchange'/, 'kein controllerchange-Hörer mehr — nichts zeigt einen Hinweis bei der Übernahme');
  assert.doesNotMatch(HTML, /swUpdateVerfuegbar/, 'auch der Text dazu ist entfernt, kein toter String neben totem Code');
});

test('Stufe 2 zurückgebaut: das Banner-Markup bleibt inert stehen, kein Skript greift noch darauf zu', () => {
  // Das Markup selbst (#sw-update-banner) bleibt im DOM — Teil des banner-stapel-Systems mit
  // #basis-ablauf-banner/#wiedereinstieg-banner, ein Entfernen wäre eine eigene, hier nicht
  // verlangte Änderung an diesem geteilten Layout. Es trägt statisch `hidden` (Markup unten) und
  // KEIN Skript holt es sich noch per getElementById — ohne diesen einen Zugriffsweg kann keine
  // verbliebene Codestelle es je einblenden, unabhängig davon, wie ihr eigener Text lautet.
  assert.match(HTML, /id="sw-update-banner"[^>]*\bhidden\b/, 'Banner-Markup bleibt statisch versteckt');
  const zugriffe = HTML.match(/getElementById\('sw-update-banner'\)/g) || [];
  assert.deepEqual(zugriffe, [], 'kein getElementById(\'sw-update-banner\') mehr — der einzige Weg zum Element ist weg');
});

test('Stufe 3: skipWaiting bleibt AUS außer auf ausdrückliche Anweisung — nie automatisch (U2-ADR-190)', () => {
  // sw.js DARF im Kommentar erklären, warum es fehlt (self-dokumentierend). skipWaiting() darf
  // NUR innerhalb des message-Handlers stehen (U2-ADR-190: die Seite entscheidet, der Worker
  // gehorcht nur auf ausdrückliche Anweisung) — nie im install-Handler oder sonst automatisch.
  assert.doesNotMatch(SW, /install'[\s\S]{0,400}self\.skipWaiting\(\)/, 'install-Handler ruft skipWaiting nicht automatisch auf');
  assert.match(SW, /KEIN automatisches skipWaiting/, 'Begründungs-Kommentar bleibt stehen');
  assert.match(SW, /addEventListener\('message'/, 'message-Handler vorhanden — die Seite steuert die Aktivierung');
  const messageHandler = SW.match(/addEventListener\('message'[\s\S]{0,200}/);
  assert.ok(messageHandler, 'message-Handler ist verdrahtet');
  assert.match(messageHandler[0], /SKIP_WAITING/, 'reagiert auf die benannte Anweisung, nicht auf jede Nachricht');
  assert.match(messageHandler[0], /self\.skipWaiting\(\)/, 'ruft skipWaiting NUR innerhalb dieses Handlers auf');
});
