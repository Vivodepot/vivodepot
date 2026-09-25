'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Guard für tools/dod-v1-feldregister-ausgeliefert-pruefen.js (Abnahme-Strang, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DAS HIER IST NICHT DIE ABNAHME — derselbe Schnitt wie bei
   `tests/dod-v1-rezepte-pruefen.test.js`/`tests/vier-produkte-vermessen.test.js`: geprüft wird,
   dass `vergleichen()` die drei Fälle (übereinstimmend/abweichend/nicht-veröffentlicht) korrekt
   unterscheidet — kein Netzzugriff hier, das bleibt allein `liveHashLesen()` vorbehalten
   (deshalb nicht importiert/aufgerufen).

   DIE ECHTE ROT-HEUTE-ZAHL, außerhalb dieser Datei: `node
   tools/dod-v1-feldregister-ausgeliefert-pruefen.js --live` — gemessen am 17.09.2026: HTTP 404
   unter `https://register.vivodepot.de/feldregister.json.sha256`, „noch nicht erschienen". ROT,
   nicht weil etwas kaputt ist, sondern weil es die Veröffentlichung selbst noch nicht gibt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { vergleichen, hashAusPruefsummenzeile } = require('../tools/dod-v1-feldregister-ausgeliefert-pruefen.js');

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

/* ── hashAusPruefsummenzeile() ─────────────────────────────────────────────── */

test('[hashAusPruefsummenzeile] liest das shasum-Format ("<hash>  <dateiname>")', () => {
  assert.equal(hashAusPruefsummenzeile(HASH_A + '  feldregister.json\n'), HASH_A);
});

test('[hashAusPruefsummenzeile] Großschreibung im Hash wird normalisiert (case-insensitiver Vergleich möglich)', () => {
  assert.equal(hashAusPruefsummenzeile(HASH_A.toUpperCase() + '  feldregister.json'), HASH_A);
});

test('[hashAusPruefsummenzeile] wirft benannt bei fremdem Format, statt undefined durchzureichen', () => {
  assert.throws(() => hashAusPruefsummenzeile('<!doctype html>'), /keine gültige sha256-Zeile/);
});

test('[hashAusPruefsummenzeile] wirft bei leerem/fehlendem Text', () => {
  assert.throws(() => hashAusPruefsummenzeile(''), /keine gültige sha256-Zeile/);
  assert.throws(() => hashAusPruefsummenzeile(undefined), /keine gültige sha256-Zeile/);
});

/* ── vergleichen() — die drei Fälle ─────────────────────────────────────────── */

test('[vergleichen] gleicher Hash: GRÜN', () => {
  const r = vergleichen(HASH_A, HASH_A + '  feldregister.json\n');
  assert.equal(r.gruen, true);
  assert.equal(r.grund, 'uebereinstimmend');
});

test('[vergleichen] unterschiedlicher Hash: ROT „abweichend" — der Fall, den ein still veraltetes Register erzeugt', () => {
  const r = vergleichen(HASH_A, HASH_B + '  feldregister.json\n');
  assert.equal(r.gruen, false);
  assert.equal(r.grund, 'abweichend');
  assert.equal(r.liveHash, HASH_B);
});

test('[vergleichen] liveText null (kein Zugriff/404): ROT „nicht-veroeffentlicht" — heutiger Stand', () => {
  const r = vergleichen(HASH_A, null);
  assert.equal(r.gruen, false);
  assert.equal(r.grund, 'nicht-veroeffentlicht');
  assert.equal(r.liveHash, null);
});

test('[vergleichen] liveText mit fremdem Format: ROT „unlesbar", nicht „abweichend" — die Ursache bleibt unterscheidbar', () => {
  const r = vergleichen(HASH_A, '<!doctype html>\n<title>Nicht gefunden</title>');
  assert.equal(r.gruen, false);
  assert.equal(r.grund, 'unlesbar');
  assert.ok(r.fehler);
});

test('[vergleichen] Rot-Beweis Normalisierung: Groß-/Kleinschreibung allein macht keinen Unterschied "abweichend" vor', () => {
  const r = vergleichen(HASH_A, HASH_A.toUpperCase() + '  feldregister.json\n');
  assert.equal(r.gruen, true, 'ROT ERWARTET, wenn die Normalisierung fehlt: Groß-/Kleinschreibung dürfte kein Vergleichsunterschied sein');
});
