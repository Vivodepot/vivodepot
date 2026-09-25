'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-7/W-12 Zug 4 („W-7 und W-12", 09.08.2026): der Block
   „Rechtliche Einordnung" im Erbfall-Blatt drehte Regel und Ausnahme um —
   „gilt in der Regel nur zu Lebzeiten" behauptete das GEGENTEIL von § 672
   Satz 1 BGB (der Auftrag erlischt im Zweifel NICHT mit dem Tod, § 168 Satz 1
   BGB knüpft die Vollmacht daran). Fachaussage, keine Formulierung — Korrektur
   nach der Quelle, mit Paragraf; der alte, falsche Wortlaut ist hier als
   Negativkontrolle festgehalten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function rechtlicheEinordnungHint(V) {
  const sit = V.SITUATION_BY_ID['todesfall-uebernahme'];
  const blk = (sit.bloecke || []).find((b) => b.titel === 'Rechtliche Einordnung');
  return blk ? blk.hint : null;
}

test('[W7Zug4] die alte, falsche Aussage „gilt in der Regel nur zu Lebzeiten" steht nicht mehr als ausgeführter Wortlaut im Kern', () => {
  // NUR die Deklaration verboten — ein erklärender Kommentar, WARUM der Satz korrigiert wurde,
  // darf den alten Wortlaut nennen (steht genau da, s. Kommentar über dem hint-String).
  const { html } = ladeKern();
  assert.doesNotMatch(html, /hint: 'Eine Vollmacht gilt in der Regel nur zu Lebzeiten/,
    'die alte Formulierung drehte Regel/Ausnahme um (§ 672 S. 1 BGB) und darf nicht mehr als aktiver hint-String vorkommen');
});

test('[W7Zug4] die Rechtliche-Einordnung sagt weiterhin, dass die Vollmacht im Zweifel über den Tod hinaus gilt — die Paragraphenklammer ist seit 22.09.2026 raus (Auftrag „Paragraphen raus", Nr. 56, von Business bestätigt), die Fachaussage bleibt', () => {
  const { V } = ladeKern();
  const hint = rechtlicheEinordnungHint(V);
  assert.ok(hint, 'Block „Rechtliche Einordnung" mit hint gefunden');
  assert.match(hint, /über den Tod hinaus/i, 'die korrigierte Fachaussage (früher mit § 672 belegt) bleibt inhaltlich stehen');
  assert.doesNotMatch(hint, /nur zu Lebzeiten/i, 'die alte, falsche Formulierung ist wirklich weg, nicht nur ergänzt');
  assert.doesNotMatch(hint, /672|168/, 'der Paragraph ist bewusst raus — Nr. 56 im Auftrag „Paragraphen raus", die Fachaussage trägt jetzt ohne Zitat');
});

test('[W7Zug4] Bevollmächtigte/Erben-Abgrenzung bleibt erhalten (war schon richtig, nicht Gegenstand der Korrektur; Wortlaut seit 22.09.2026 „zwei verschiedene Rollen" statt „rechtlich unterschiedliche Rollen")', () => {
  const { V } = ladeKern();
  const hint = rechtlicheEinordnungHint(V);
  assert.match(hint, /Bevollmächtigte und Erben sind zwei verschiedene Rollen/);
  assert.match(hint, /anwaltlich klären/, 'der Verweis auf Beratung bleibt, statt einer Paragraphenklammer');
});
