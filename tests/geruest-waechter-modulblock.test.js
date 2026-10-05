'use strict';
/* Gerüst-Wächter und Modul-Skriptblöcke (U2-ADR-457, Nachtrag v865: die eingebettete noble-ed25519 ist ein ES-Modul).
   Für die Übersetzungsprobe fallen nur die export-Schlüsselwörter weg; ein Syntaxfehler im Modul bleibt ein Fund. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { modulAlsSkript, literaleMessen } = require('../tools/geruest-waechter-pruefen.js');

test('[Gerüst·Modulblock] export-Anweisungen hindern die Übersetzung nicht; ein echter Syntaxfehler fällt weiter', () => {
  const modul = "export { A };\nexport async function f() { return 1; }\nexport const b = 2;\nconst A = 3;\n";
  assert.throws(() => new vm.Script(modul));
  assert.doesNotThrow(() => new vm.Script(modulAlsSkript(modul)));
  // Rot-Beweis: ein Modul mit Syntaxfehler bleibt unübersetzbar.
  assert.throws(() => new vm.Script(modulAlsSkript('export const x = ;\n')));
});

test('[Gerüst·Modulblock] der Wächter meldet einen Modulblock nur, wenn er wirklich kaputt ist', () => {
  const html = (inhalt) => '<html><script type="module" id="m">\n' + inhalt + '</script></html>';
  const gut = literaleMessen(html("export async function f() { return 'a'; }\n"), {});
  assert.deepEqual(gut.probleme.filter((p) => /nicht übersetzbar/.test(p)), []);
  const kaputt = literaleMessen(html("export async function f() { return 'a' ; \n"), {});
  assert.equal(kaputt.probleme.filter((p) => /nicht übersetzbar/.test(p)).length, 1);
});
