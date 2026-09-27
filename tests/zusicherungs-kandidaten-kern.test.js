'use strict';
/* ═══════════════════════════════════════════════════════
   Wächter „ein Zustands-Satzbauer im Kern, der nicht im Anker steht" (ZS2-Restrisiko, 19.09.2026)
   ───────────────────────────────────────────────────────
   Die Kern-Sperrliste (ZUSICHERUNGS_SCHLUESSEL_KERN) wird nur aus den Funktionen erhoben, die in
   ZUSTAND_FUNKTIONEN_KERN stehen. Ein Satzbauer, der dort fehlt, fällt sonst nirgends auf.
   Dieser Wächter findet jede Kern-Funktion, die einen Schlüssel mit Zustands-Vokabular liest und
   nicht im Anker steht (Heuristik, s. tools/lib/zusicherungs-kandidaten.js), und verlangt für sie
   eine Entscheidung in der Grundlinie: `kein-zusicherungssatz` mit Grund, oder `offen`.
   `offen` sind die Sätze, bei denen NOCH nicht entschieden ist, ob sie unter den Schutz gehören —
   die Zahl darf nur sinken. Ein NEUER Fund ist rot.
   ═══════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { kandidaten } = require('../tools/lib/zusicherungs-kandidaten.js');
const E = require('../tools/zusicherungs-schluessel-erheben.js');

const REPO = path.join(__dirname, '..');
const QUELLE = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const GRUND = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'zusicherungs-kandidaten-kern-grundlinie.json'), 'utf8'));
const GESPERRT = E.erhebenAusFunktionen(QUELLE, E.ZUSTAND_FUNKTIONEN_KERN, E.ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT).schluessel;

test('[Kandidaten·Ausbeute] die Suche findet überhaupt Funktionen, und die Sperrliste ist nicht leer', () => {
  assert.ok(GESPERRT.length >= 39, 'gesperrte Schlüssel: ' + GESPERRT.length);
  assert.ok(kandidaten(QUELLE, E.ZUSTAND_FUNKTIONEN_KERN, GESPERRT).filter((k) => k.lieferant.length).length >= 10, 'die Erhebung fand fast nichts — Vokabular oder Funktionsformat eingebrochen?');
});

test('[Kandidaten] jede Kern-Funktion mit Zustands-Vokabular außerhalb des Ankers ist entschieden (Grundlinie)', () => {
  const neu = kandidaten(QUELLE, E.ZUSTAND_FUNKTIONEN_KERN, GESPERRT).filter((k) => k.lieferant.length).filter((k) => !GRUND.funktionen[k.funktion]);
  assert.deepEqual(neu.map((k) => k.funktion + ' → ' + k.lieferant.join(', ')), [],
    'Neue Funktion mit Zustands-Vokabular, nicht im Anker (ZUSTAND_FUNKTIONEN_KERN in tools/zusicherungs-schluessel-erheben.js) '
    + 'und nicht in der Grundlinie. Sagt sie etwas über den Zustand der Anwendung oder einer Datei aus, das die Empfängerin '
    + 'nicht selbst prüfen kann: in den Anker. Sonst mit Grund als kein-zusicherungssatz in '
    + 'tools/zusicherungs-kandidaten-kern-grundlinie.json eintragen.');
});

test('[Kandidaten·Ratsche] die Grundlinie führt nur noch vorhandene Funktionen, jeder Eintrag hat einen Grund, `offen` hat einen Deckel', () => {
  const heute = new Set(kandidaten(QUELLE, E.ZUSTAND_FUNKTIONEN_KERN, GESPERRT).filter((k) => k.lieferant.length).map((k) => k.funktion));
  const veraltet = Object.keys(GRUND.funktionen).filter((f) => !heute.has(f));
  assert.deepEqual(veraltet, [], 'Aus der Grundlinie streichen (Funktion weg oder jetzt im Anker): ' + veraltet.join(', '));
  for (const [f, e] of Object.entries(GRUND.funktionen)) {
    assert.ok(['kein-zusicherungssatz', 'offen'].includes(e.entscheidung), f + ': Entscheidung „' + e.entscheidung + '“ unbekannt');
    assert.ok(typeof e.grund === 'string' && e.grund.length > 20, f + ': ohne Grund');
  }
  const offen = Object.values(GRUND.funktionen).filter((e) => e.entscheidung === 'offen').length;
  assert.ok(offen <= 0, 'Offene Entscheidungen dürfen nur sinken (Deckel 0): ' + offen);
});

test('[Kandidaten·Rot-Beweis] ein gepflanzter Satzbauer wird gefunden, ein Anker-Mitglied und ein Nicht-Zustands-Satz nicht', () => {
  const quelle = [
    'function neuerBauer(x) {', '  return STRINGS.dateiSignaturGeprueft + x;', '}',
    'function ankerBauer(x) {', '  return STRINGS.herkunftSatzKeine + x;', '}',
    'function mitleserFn(x) {', '  return STRINGS.klartextHinweis + x;', '}',
    'function harmlos(x) {', '  return STRINGS.speichernKnopf + x;', '}',
  ].join('\n') + '\n';
  const k = kandidaten(quelle, ['ankerBauer'], ['klartextHinweis']);
  const nach = Object.fromEntries(k.map((x) => [x.funktion, x]));
  assert.deepEqual(nach.neuerBauer.lieferant, ['dateiSignaturGeprueft'], 'ein neuer Zustands-Satzbauer wird gefunden');
  assert.deepEqual(nach.mitleserFn.mitleser, ['klartextHinweis'], 'ein zweiter Leser eines gesperrten Schlüssels wird gefunden');
  assert.ok(!nach.ankerBauer, 'eine Funktion im Anker ist kein Fund');
  assert.ok(!nach.harmlos, 'ein Satz ohne Zustands-Vokabular ist kein Fund');
});

test('[Kandidaten·Rot-Beweis·Kern] ein in den echten Kern gepflanzter Satzbauer macht die Suche rot', () => {
  const gepflanzt = QUELLE.replace('function vorlageZustandsSatz(eintrag) {',
    'function gepflanzterBauerProbe(eintrag) {\n  return STRINGS.probeSignaturGeprueft;\n}\nfunction vorlageZustandsSatz(eintrag) {');
  assert.notEqual(gepflanzt, QUELLE, 'Anker für die Pflanzung nicht gefunden');
  const neu = kandidaten(gepflanzt, E.ZUSTAND_FUNKTIONEN_KERN, GESPERRT).filter((k) => k.lieferant.length).filter((k) => !GRUND.funktionen[k.funktion]);
  assert.deepEqual(neu.map((k) => k.funktion), ['gepflanzterBauerProbe']);
});
