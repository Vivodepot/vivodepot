'use strict';
/* ════════════════════════════════════════════════════════════════════════
   ableitungen-build.js — Orchestrierung geprüft mit injiziertem Ausführer
   („der vierte Träger", 07.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Prüft `ableitungenBauen` isoliert, mit einem gefälschten `ausfuehren` statt
   echten, teils langsamen Unterprozessen — die vier ECHTEN Schritte (SCHRITTE)
   gegen den realen Bestand zu fahren, ist Sache des Betriebs, nicht dieser Probe.
   Der wichtigste Fall, ausdrücklich vom Auftrag verlangt: der Sammelbefehl muss
   ROT werden, wenn ein Träger auch NACH seinem eigenen Bau-Schritt noch driftet —
   nicht nur, wenn der Bau-Aufruf selbst einen Fehler wirft.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ableitungenBauen, SCHRITTE } = require('../tools/ableitungen-build');

function fakeAusfuehrer(regeln) {
  const aufrufe = [];
  const ausfuehren = (cmd) => {
    aufrufe.push(cmd);
    const schluessel = cmd.join(' ');
    return regeln[schluessel] || { ok: true, ausgabe: '' };
  };
  ausfuehren.aufrufe = aufrufe;
  return ausfuehren;
}

test('[Positivkontrolle] alle Schritte grün, Bau UND Check — Ergebnis ok', () => {
  const schritte = [{ name: 'x', bau: ['echo', 'bau-x'], check: ['echo', 'check-x'] }];
  const erg = ableitungenBauen(schritte, fakeAusfuehrer({}));
  assert.equal(erg.ok, true);
  assert.deepEqual(erg.bauFehler, []);
  assert.deepEqual(erg.driftFehler, []);
});

test('[Rot-Beweis] ein Bau-Schritt scheitert — Ergebnis rot, benennt den Schritt', () => {
  const schritte = [{ name: 'x', bau: ['echo', 'bau-x'], check: ['echo', 'check-x'] }];
  const regeln = { 'echo bau-x': { ok: false, ausgabe: 'kaputt' } };
  const erg = ableitungenBauen(schritte, fakeAusfuehrer(regeln));
  assert.equal(erg.ok, false);
  assert.equal(erg.bauFehler.length, 1);
  assert.equal(erg.bauFehler[0].name, 'x');
  assert.equal(erg.bauFehler[0].phase, 'Bau');
});

test('[Rot-Beweis, der wichtigste] Bau lief fehlerfrei, aber der Träger driftet DANACH weiter — trotzdem rot', () => {
  // Genau der Fall aus dem Auftrag: der Bau-Aufruf selbst wirft keinen Fehler (schreibt z. B.
  // eine Datei, die von einem ANDEREN, noch nicht gelaufenen Schritt abhängt), aber der
  // anschließende Check zeigt: es driftet immer noch. Ein Sammelbefehl, der nur den Bau-Exit-Code
  // ansieht, würde das als grün melden — genau der stille Erfolg, den dieser Wächter verhindert.
  const schritte = [{ name: 'faktenbasis-erzeugen', bau: ['echo', 'bau-f'], check: ['echo', 'check-f'] }];
  const regeln = { 'echo check-f': { ok: false, ausgabe: 'weicht vom Kern ab' } };
  const erg = ableitungenBauen(schritte, fakeAusfuehrer(regeln));
  assert.equal(erg.ok, false);
  assert.deepEqual(erg.bauFehler, [], 'der Bau-Schritt selbst war fehlerfrei');
  assert.equal(erg.driftFehler.length, 1);
  assert.equal(erg.driftFehler[0].name, 'faktenbasis-erzeugen');
  assert.equal(erg.driftFehler[0].phase, 'Check nach Bau');
});

test('[Rot-Beweis] ein driftFehler-Eintrag trägt sein eigenes `check`-Kommando', () => {
  // main() meldet bei Drift „Abhilfe: <check-Kommando> zeigt die Einzelheit" — dafür braucht
  // der driftFehler-Eintrag das Kommando selbst, nicht nur Namen/Ausgabe. Fehlt das Feld, wirft
  // main() beim Formatieren (f.check.join ist dann undefined.join) — genau der Absturz, der am
  // 08.09.2026 beim ersten echten Drift-Fund auftrat (faktenbasis-erzeugen driftete nach dem
  // Bau, weil ein neues ADR noch nicht in docs/faktenbasis.md nachgezogen war).
  const schritte = [{ name: 'x', bau: ['echo', 'bau-x'], check: ['node', 'tools/x.js', '--check'] }];
  const regeln = { 'node tools/x.js --check': { ok: false, ausgabe: 'weicht ab' } };
  const erg = ableitungenBauen(schritte, fakeAusfuehrer(regeln));
  assert.deepEqual(erg.driftFehler[0].check, ['node', 'tools/x.js', '--check']);
});

test('[Ausbeute] JEDER Schritt wird nach dem Bau erneut geprüft, nicht nur die gescheiterten', () => {
  const schritte = [
    { name: 'a', bau: ['echo', 'bau-a'], check: ['echo', 'check-a'] },
    { name: 'b', bau: ['echo', 'bau-b'], check: ['echo', 'check-b'] },
  ];
  const ausfuehren = fakeAusfuehrer({});
  ableitungenBauen(schritte, ausfuehren);
  const checkAufrufe = ausfuehren.aufrufe.filter((c) => c.join(' ').startsWith('echo check-'));
  assert.equal(checkAufrufe.length, 2, 'beide Check-Schritte müssen laufen, auch wenn beide Bau-Schritte grün waren');
});

test('[Struktur] SCHRITTE nennt alle vier Träger, je mit Bau- und Check-Kommando', () => {
  assert.equal(SCHRITTE.length, 4);
  const namen = SCHRITTE.map((s) => s.name).sort();
  assert.deepEqual(namen, ['adr-readme-erzeugen', 'build-standzahlen', 'faktenbasis-erzeugen', 'sbom-pflegen']);
  for (const s of SCHRITTE) {
    assert.ok(Array.isArray(s.bau) && s.bau.length > 0, s.name + ': bau fehlt');
    assert.ok(Array.isArray(s.check) && s.check.length > 0, s.name + ': check fehlt');
  }
  const faktenbasis = SCHRITTE.find((s) => s.name === 'faktenbasis-erzeugen');
  assert.ok(faktenbasis.bau.includes('--ohne-suite'), 'faktenbasis-erzeugen muss im billigen Modus gebaut werden');
});
