'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Wächter auf `PBKDF2_ITERATIONS` selbst (U2-ADR-230, 03.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Diese Konstante (`vivodepot.html:3555`, INNERHALB des gepinnten Krypto-Blocks
   `:3500–3907`) ändert sich nie an Ort und Stelle — nur über einen Sprung der
   `kryptoVersion` mit eigener Ableitung, nach dem Vorbild von U2-ADR-085-Nachtrag
   (18.08.2026, Zerfall in Feld-Einheiten). Die volle Begründung steht in
   U2-ADR-230, nicht hier: eine Vor-Ort-Änderung träfe nicht nur die Ableitung,
   sondern auch die in `_AAD_DEPOT_V2`/`_AAD_UEBERGABE_V2` eingefrorene AAD — eine
   bestehende Datei ginge selbst mit richtig abgeleitetem Schlüssel nicht mehr auf.

   WARUM DIESER KOMMENTAR NICHT NEBEN DER KONSTANTEN STEHT: genau das würde den
   gepinnten Block verändern und die Byte-Identität über alle sechs Träger
   brechen (derselbe Bruch, den dieser Zug selbst einmal ausgelöst und
   zurückgenommen hat, s. `tools/krypto-block-propagation-pruefen.js`). Der
   erklärende Text lebt darum hier, in der Probe, und in der ADR — nicht im Block.

   WAS DIESE PROBE NICHT PRÜFT: `tests/empfaengerkreise-fach-in-der-datei.test.js`
   („[Fach·Wächter]") prüft, ob die Empfängerkreise-Fächer der LIVEN Konstante
   treu bleiben — das bliebe grün, selbst wenn die Konstante selbst wandert, weil
   beide Seiten gemeinsam wandern würden. DIESE Probe pinnt den Wert selbst, fest,
   unabhängig von sich selbst — deshalb der harte Literal `600000` unten, nicht
   ein Vergleich der Konstante mit sich selbst. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[PBKDF2·Wächter] PBKDF2_ITERATIONS bleibt der eingefrorene v3-Wert', () => {
  const { V } = ladeKern();

  const pruefeWert = (wert) => assert.equal(wert, 600000,
    'PBKDF2_ITERATIONS hat sich an Ort und Stelle geändert — nach U2-ADR-230 ist das nicht '
    + 'erlaubt: eine stärkere Iterationszahl braucht einen Sprung der kryptoVersion mit eigener '
    + 'Ableitung und eigener AAD, keine Änderung dieser Konstante. Diese Probe rot zu machen, indem '
    + 'man den erwarteten Wert hier einfach mitzieht, unterläuft genau das, wogegen sie steht.');

  // ROT-BEWEIS, ERZWUNGEN: derselbe Vergleich, mit einem simulierten „geänderten" Wert, wirft
  // real eine AssertionError mit „700000 !== 600000" (strict, aus assert/strict) — die Probe
  // lebt also, statt nur zufällig zu passen, weil sich seit ihrer Niederschrift nichts bewegt hat.
  assert.throws(() => pruefeWert(700000), /AssertionError/,
    'ROT VOR DER PROBE-ABNAHME: ein abweichender Wert muss genau HIER anschlagen');

  // GRÜN: der echte, aus dem Kern geladene Wert.
  pruefeWert(V.PBKDF2_ITERATIONS);
});
