'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — aussage-pruefung-abgleich-messen.js („Vier Zusicherungen,
   die mehr behaupteten als ihre Prüfung deckt", 01.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Fixtures, nicht der echte ADR-Bestand (Regel 18) — der echte Bestand läuft
   NIE gegen die Signal-Detektoren in einer permanenten Testzeile (er verändert
   sich täglich; ein Treffer heute wäre morgen ein falscher Fehlschlag). Die
   ROTMACHBARKEIT der Detektoren selbst gehört hierher.

   [Rot-Beweis-Marke: Positivkontrolle/Gegenprobe unten je Detektor.]
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const M = require('../tools/aussage-pruefung-abgleich-messen.js');

/* ── absoluteSprache ─────────────────────────────────────────────────────── */
test('[absoluteSprache] erkennt „genau"/„ersatzlos"/„nie" — die Wörter aus dem echten U2-ADR-002-Fund', () => {
  const treffer = M.absoluteSprache('die Allowlist ist genau [3], die Legacy-Ableitung ist ersatzlos entfernt, sie wird nie zurückgeholt.');
  assert.ok(treffer.some((t) => /genau/i.test(t)));
  assert.ok(treffer.some((t) => /ersatzlos/i.test(t)));
  assert.ok(treffer.some((t) => /nie/i.test(t)));
});

test('[absoluteSprache·Gegenprobe] ein Satz ohne absolute Wörter bleibt leer', () => {
  assert.deepEqual(M.absoluteSprache('Der Wizard zeigt in der Regel eine Rückfrage, wenn ein Feld fehlt.'), []);
});

/* ── benannteBegriffe / fehlendeBegriffe ──────────────────────────────────── */
test('[benannteBegriffe] Backtick-Code, Zahlen und Klammer-Listen werden erkannt', () => {
  const b = M.benannteBegriffe('Die Funktion `depotPersistieren` prüft 42 Felder und akzeptiert [3, 4].');
  assert.ok(b.includes('depotPersistieren'));
  assert.ok(b.includes('42'));
  assert.ok(b.includes('[3, 4]'));
});

test('[benannteBegriffe·BEFUND, jetzt gefiltert] die eigene ADR-Nummer der Aussage zählt NICHT als Begriff', () => {
  // Ohne diesen Filter waren 9 von 26 ersten Funden die eigene Beschriftung „U2-002:"/„U2-ADR-043" —
  // kein Begriff, den die Probe je nennen müsste. Gegenprobe: eine ECHTE Zahl daneben bleibt erhalten.
  const b = M.benannteBegriffe('U2-002: die Allowlist erlaubt 42 Versionen, siehe auch U2-ADR-016.');
  assert.ok(!b.includes('002'), 'die eigene Labelnummer wurde nicht herausgefiltert: ' + JSON.stringify(b));
  assert.ok(!b.includes('016'), 'die Querverweis-ADR-Nummer wurde nicht herausgefiltert: ' + JSON.stringify(b));
  assert.ok(b.includes('42'), 'eine echte Zahl ging beim Filtern mit verloren: ' + JSON.stringify(b));
});

test('[benannteBegriffe] ein Prosa-Platzhalter „[X]" zählt nicht als Werte-Liste', () => {
  assert.deepEqual(M.benannteBegriffe('Feld [X] steht stellvertretend für jedes Freitextfeld.'), []);
});

test('[fehlendeBegriffe] ein Begriff, der im Testkörper fehlt, wird gemeldet — der reale U2-ADR-002-Fund nachgebaut', () => {
  const aussage = 'die Versions-Allowlist ist genau [3]';
  const testkoerperOhneDenBegriff = "assert.deepEqual(werte, [3, 4], 'Allowlist stimmt nicht');";
  assert.deepEqual(M.fehlendeBegriffe(aussage, testkoerperOhneDenBegriff), ['[3]'],
    'Der Testkörper prüft [3, 4] als GANZES — die Teilzeichenkette „[3]" kommt darin vor, ABER nicht als eigenständiger Ausdruck.'
    + ' (Hinweis an künftige Leser: falls dieser Fall künftig als false positive auffällt, ist das der bekannte Rand des Werkzeugs, s. Kopfkommentar.)');
});

test('[fehlendeBegriffe·Gegenprobe] ein tatsächlich genannter Begriff wird NICHT gemeldet', () => {
  const aussage = 'Die Funktion `depotPersistieren` schreibt den Zähler zurück.';
  const testkoerperMitDemBegriff = "test('x', () => { depotPersistieren(); assert.ok(true); });";
  assert.deepEqual(M.fehlendeBegriffe(aussage, testkoerperMitDemBegriff), [],
    'ein wirklich vorhandener Begriff darf nicht als fehlend gemeldet werden — sonst meldet das Werkzeug auch bei richtigen Proben');
});

/* ── hatRotBelegProxy ─────────────────────────────────────────────────────── */
function mitFixtureDatei(inhalt, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abgleich-messen-fixture-'));
  const datei = path.join(tmp, 'probe.test.js');
  fs.writeFileSync(datei, inhalt, 'utf8');
  const REPO = path.join(__dirname, '..');
  const relPfad = path.relative(REPO, datei);
  try { return fn(relPfad); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

test('[hatRotBelegProxy] eine Datei mit „[Negativprobe]"-Titel gilt als belegt', () => {
  mitFixtureDatei("test('[Negativprobe] etwas geht rot', () => {});", (rel) => {
    assert.equal(M.hatRotBelegProxy(rel), true);
  });
});

test('[hatRotBelegProxy] eine Datei mit „Positivkontrolle" im Kommentar gilt ebenfalls als belegt', () => {
  mitFixtureDatei("// Positivkontrolle: manuell rot gefahren, dann zurückgesetzt.\ntest('x', () => {});", (rel) => {
    assert.equal(M.hatRotBelegProxy(rel), true);
  });
});

test('[hatRotBelegProxy·Gegenprobe] eine Datei ganz ohne Rot-Beweis-Spur gilt als NICHT belegt', () => {
  mitFixtureDatei("test('x', () => { assert.ok(true); });", (rel) => {
    assert.equal(M.hatRotBelegProxy(rel), false);
  });
});

/* ── erhebe() gegen den echten Bestand — nur Struktur, keine gepinnte Zahl ──
   Bewusst KEIN gepinnter Fund-Zähler hier (anders als pruefstand-bindung.test.js):
   der Bestand ändert sich mit jedem ADR-Bau, eine Zahl hier würde bei jeder
   Erweiterung rot — und genau das ist nicht der Zweck dieser Datei (die prüft
   den DETEKTOR, nicht den heutigen Bestand; der heutige Bestand steht im
   Bericht, nicht in einer Testzeile). */
test('[erhebe] läuft gegen den echten ADR-Bestand durch, liefert für jeden Block eine Klassifikation', () => {
  const ergebnis = M.erhebe();
  assert.ok(ergebnis.length > 100, 'Grundmenge unerwartet klein — liest das Werkzeug wirklich docs/adr/?');
  for (const e of ergebnis) {
    assert.equal(typeof e.adr, 'string');
    assert.equal(typeof e.aussage, 'string');
    assert.ok(Array.isArray(e.signale));
  }
});

test('[erhebe] die U2-ADR-099-Selbstbeschreibung „`pruefung:`-Zeile" löst NICHT als eigene, kaputte Pruefung-Zeile auf', () => {
  // Rot-Beweis für den Zeilen-Anker-Fix: vor der Korrektur riss ein unverankerter Blockweit-Regex
  // die Erwähnung „`pruefung:`-Zeile" MITTEN in dieser Aussage als eigene pruefung:-Zeile heraus —
  // derselbe Fund, den pruefstand-bindung.js für sein eigenes Parsing schon einmal gemacht hat.
  const ergebnis = M.erhebe();
  const block = ergebnis.find((e) => e.aussage.includes('kein stilles Überspringen'));
  assert.ok(block, 'die U2-ADR-099-Klausel wurde nicht gefunden — Fixture-Text im Test veraltet?');
  assert.deepEqual(block.pruefungFehlt, [], 'die Selbstbeschreibung „`pruefung:`-Zeile" wurde fälschlich als eigene Pruefung-Zeile gelesen');
});
