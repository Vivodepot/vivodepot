'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Autosave-Allowlist ⊇ Lese-Menge — die statische Konsistenz-Prüfung
   ────────────────────────────────────────────────────────────────────────
   Warum es diesen Test gibt (Auftrag 22.07.2026, aus der Erhebung
   `_autoSaveWennFeld`/`bearbeitungSpeichern`):

   Drei Fehler in einer Woche waren DIESELBE Mengen-Ungleichheit —
   `bearbeitungSpeichern` LIEST ein Attribut aus dem DOM, auf das
   `_autoSaveWennFeld` nicht REAGIERT. Folge: Die Änderung erreicht die
   Persistenz erst bei einem zufälligen fremden Speicher-Aufruf, oder gar nicht
   (Persistenz-Lücke 20.07., `data-refm`).

   Der Clou: Das ist KEIN Verhaltens-Test. Er prüft nicht, ob ein Event feuert,
   sondern ob zwei Attribut-Listen im Quelltext zueinander passen. Damit liegt er
   AUSSERHALB der Event-Blindzone (`document.addEventListener` ist im Stub ein
   No-Op) und läuft in Node — genau dort, wo die drei bisherigen Fehler
   strukturell unsichtbar waren. Er hätte den 20.07.-Fehler vor dem Bürger-Befund
   gefunden.

   INVARIANTE: Jedes Attribut, das der Speicherpfad aus dem DOM liest, muss
   entweder in der Autosave-Allowlist stehen ODER unten als begründete Ausnahme
   geführt sein.

   Zur Ausnahmeliste — die Trennung, die sie scharf hält: Sie führt AUSSCHLIESSLICH
   Attribute, die durch einen ANDEREN Mechanismus nachweislich gedeckt sind
   (strukturelle Träger ohne Eingabe-Charakter; Felder, deren Mutationen über das
   synthetische `melden()`-Event auf der `[data-refm]`-Box gemeldet werden). Sie
   ist ausdrücklich KEIN Ablageort für bekannte Lücken — eine bekannte Lücke als
   „Ausnahme" zu führen hieße, den Test sein eigenes Warnsignal abstumpfen zu
   lassen. Wer hier etwas einträgt, muss den deckenden Mechanismus benennen.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { HTML_PATH } = require('./load-kern.js');

const src = fs.readFileSync(HTML_PATH, 'utf8');

/* Rumpf einer Funktion/eines Arrow-Ausdrucks ab `startMarker` bis zur ersten
   Zeile, die `endeRegex` trifft. Bewusst zeilenbasiert statt Klammer-Zählung:
   die Ziele sind Top-Level-Funktionen (schließende Klammer in Spalte 0) bzw. ein
   Arrow in EINER bekannten Einrückung — das ist robuster als ein Klammer-Zähler,
   der über Strings und Regex-Literale stolpern kann. */
function rumpf(startMarker, endeRegex) {
  const zeilen = src.split('\n');
  const start = zeilen.findIndex(z => z.includes(startMarker));
  assert.notEqual(start, -1, 'Startmarke nicht gefunden — umbenannt? ' + startMarker);
  for (let i = start + 1; i < zeilen.length; i++) {
    if (endeRegex.test(zeilen[i])) return zeilen.slice(start, i + 1).join('\n');
  }
  assert.fail('Ende des Rumpfes nicht gefunden für: ' + startMarker);
}

// Attribut-Selektoren `[data-…]` in einem Code-Abschnitt (auch dynamisch zusammengesetzte
// wie '[data-edit-override="' + fid + '"]' — der Präfix genügt zur Identifikation).
function geleseneAttribute(code) {
  return new Set((code.match(/\[data-[a-z-]+/g) || []).map(s => s.slice(1)));
}
// Attribute, auf die der Autosave-Listener reagiert: hasAttribute('data-…').
function allowlistAttribute(code) {
  return new Set((code.match(/hasAttribute\('(data-[a-z-]+)'\)/g) || [])
    .map(s => s.replace(/^hasAttribute\('/, '').replace(/'\)$/, '')));
}

/* Begründete Ausnahmen: gelesen, aber NICHT in der Allowlist — weil ein anderer
   Mechanismus die Meldung übernimmt. Jeder Eintrag nennt diesen Mechanismus. */
const AUSNAHMEN = {
  'data-chip': 'Struktur, kein Eingabe-Element: Träger der BESTÄTIGTEN Chip-Daten (<span class="chip">) '
    + 'innerhalb von [data-chip-liste]. Wird nie fokussiert oder verlassen; der Auslöser ist der '
    + 'Container [data-chip-liste] bzw. das Eingabefeld [data-chip-eingabe], beide in der Allowlist.',
  'data-refm-zeile': 'Struktur, kein Eingabe-Element: Zeilen-Container innerhalb der [data-refm]-Box. '
    + 'Gemeldet wird auf der Box (s. data-edit-refm-override).',
  'data-edit-refm': 'Indirekt gedeckt: verborgenes Ref-Feld einer refMehrfach-Zeile. Es wird nie von Hand '
    + 'bearbeitet, sondern ausschließlich programmatisch in waehle() gesetzt — und waehle() ruft melden().',
  'data-edit-refm-override': 'Indirekt gedeckt: sichtbares Freitext-Feld einer refMehrfach-Zeile. JEDER '
    + 'Mutationsweg (oninput, onblur, waehle, bestaetige, Weg/Hoch/Runter, Add) ruft melden(), das ein '
    + 'synthetisches `change` auf der [data-refm]-BOX dispatcht — die Box trägt data-refm und steht in der '
    + 'Allowlist. ACHTUNG: Der Listener prüft nur ev.target und läuft NICHT zu den Vorfahren hoch; die '
    + 'Deckung hängt also daran, dass jede künftige Zeilen-Mechanik melden() mitruft.',
};

test('Autosave-Allowlist deckt jedes Attribut, das der Speicherpfad liest', () => {
  const listener = rumpf('const _autoSaveWennFeld = (ev) => {', /^\s{4}\};\s*$/);
  const speichern = rumpf('function bearbeitungSpeichern() {', /^\}\s*$/);
  // A68 (30.07.2026): die DOM-Lese-Schleifen des Speicherpfads liegen seit U2-ADR-117 in
  // `_faltContainer` (aus `bearbeitungSpeichern` herausgelöst, damit das Lage-Blatt sie je Bereich
  // aufruft). Beide Rümpfe werden gescannt — die Invariante gilt dem Speicherpfad, nicht der Zeile.
  const falten = rumpf('function _faltContainer(c, vorherDaten, schreib, stempelNs) {', /^\}\s*$/);
  // Der Speicherpfad delegiert das Lesen der refMehrfach-Zeilen an _refmSammeln —
  // dessen Attribute gehören zur Lese-Menge, sonst prüft der Test zu wenig.
  const refmSammeln = rumpf('function _refmSammeln(container, fid) {', /^\}\s*$/);

  const allowlist = allowlistAttribute(listener);
  const gelesen = new Set([...geleseneAttribute(speichern), ...geleseneAttribute(falten), ...geleseneAttribute(refmSammeln)]);

  // Selbstschutz: Wird eine der Funktionen umbenannt/umgebaut, soll der Test LAUT scheitern
  // und nicht still leer durchlaufen (ein Test, der nichts findet, prüft nichts).
  assert.ok(allowlist.size >= 5, 'Allowlist zu klein extrahiert (' + allowlist.size + ') — Listener umgebaut?');
  assert.ok(gelesen.size >= 5, 'Lese-Menge zu klein extrahiert (' + gelesen.size + ') — Speicherpfad umgebaut?');
  assert.ok(allowlist.has('data-edit'), 'Anker data-edit fehlt in der Allowlist — Extraktion kaputt?');
  assert.ok(gelesen.has('data-edit'), 'Anker data-edit fehlt in der Lese-Menge — Extraktion kaputt?');

  const ungedeckt = [...gelesen].filter(a => !allowlist.has(a) && !AUSNAHMEN[a]).sort();
  assert.deepEqual(ungedeckt, [],
    'Diese Attribute werden von bearbeitungSpeichern gelesen, lösen aber KEIN Autosave aus und sind '
    + 'nicht als begründete Ausnahme geführt: ' + JSON.stringify(ungedeckt) + '. '
    + 'Das ist die Bauform der Persistenz-Lücke vom 20.07.2026: Die Änderung bliebe bis zu einem '
    + 'zufälligen fremden bearbeitungSpeichern()-Aufruf ungesichert. Entweder das Attribut in die '
    + 'Allowlist in _autoSaveWennFeld aufnehmen — oder, falls ein anderer Mechanismus die Meldung '
    + 'übernimmt, in AUSNAHMEN eintragen UND diesen Mechanismus dort benennen.');
});

test('Die Ausnahmeliste verrottet nicht: jede Ausnahme wird noch gelesen und ist noch nötig', () => {
  const listener = rumpf('const _autoSaveWennFeld = (ev) => {', /^\s{4}\};\s*$/);
  const speichern = rumpf('function bearbeitungSpeichern() {', /^\}\s*$/);
  const falten = rumpf('function _faltContainer(c, vorherDaten, schreib, stempelNs) {', /^\}\s*$/);   // A68/U2-ADR-117 — s. o.
  const refmSammeln = rumpf('function _refmSammeln(container, fid) {', /^\}\s*$/);
  const allowlist = allowlistAttribute(listener);
  const gelesen = new Set([...geleseneAttribute(speichern), ...geleseneAttribute(falten), ...geleseneAttribute(refmSammeln)]);

  for (const attr of Object.keys(AUSNAHMEN)) {
    assert.ok(gelesen.has(attr),
      'Ausnahme "' + attr + '" wird gar nicht mehr gelesen — veraltet, aus AUSNAHMEN entfernen.');
    assert.ok(!allowlist.has(attr),
      'Ausnahme "' + attr + '" steht inzwischen SELBST in der Allowlist — die Ausnahme ist überflüssig '
      + 'und verschleiert nur; aus AUSNAHMEN entfernen.');
    assert.ok(String(AUSNAHMEN[attr]).length > 40,
      'Ausnahme "' + attr + '" ohne tragfähige Begründung — der deckende Mechanismus muss benannt sein.');
  }
});
