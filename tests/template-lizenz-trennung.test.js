'use strict';
/* Die Lizenz der Anbieter-Templates ist entschieden (04.10.2026): LICENSING.md, Abschnitt „Signierte Inhaltsmodule
   Dritter“, trennt den Inhalt eines fremd signierten Moduls von der Lizenz des Kerns. Diese Probe hält den Abschnitt fest;
   fällt er weg oder sagt er etwas anderes, ist die Entscheidung wieder offen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const UEBERSCHRIFT = '## Signierte Inhaltsmodule Dritter';

function trennungMaengel(lizenzText) {
  const i = lizenzText.indexOf(UEBERSCHRIFT);
  if (i < 0) return ['LICENSING.md: Abschnitt „Signierte Inhaltsmodule Dritter“ fehlt'];
  const rest = lizenzText.slice(i + UEBERSCHRIFT.length);
  const ende = rest.search(/\n## /);
  const abschnitt = ende < 0 ? rest : rest.slice(0, ende);
  const m = [];
  if (!/lizenziert seinen Inhalt aber nicht/.test(abschnitt)) m.push('LICENSING.md: der Abschnitt sagt nicht mehr, dass der Inhalt nicht von uns lizenziert ist');
  if (!/bestimmt die Stelle, die es herausgibt/.test(abschnitt)) m.push('LICENSING.md: der Abschnitt sagt nicht mehr, wer die Bedingungen bestimmt');
  return m;
}

test('[Template-Lizenz] LICENSING.md trennt fremd signierte Inhaltsmodule von der Lizenz des Kerns', () => {
  assert.deepEqual(trennungMaengel(fs.readFileSync(path.join(REPO, 'LICENSING.md'), 'utf8')), []);
});

test('[Template-Lizenz·Rot-Beweis] ohne Abschnitt oder mit geändertem Satz fällt die Probe', () => {
  const gut = UEBERSCHRIFT + '\n\nVivodepot lädt und prüft es, lizenziert seinen Inhalt aber nicht;\nwelche Bedingungen dafür gelten, bestimmt die Stelle, die es herausgibt.\n\n## Weiter\nlizenziert seinen Inhalt aber nicht\n';
  assert.deepEqual(trennungMaengel(gut), [], 'Positivkontrolle');
  assert.equal(trennungMaengel('# nichts\n').length, 1, 'fehlender Abschnitt');
  assert.equal(trennungMaengel(gut.replace('lizenziert seinen Inhalt aber nicht;', 'lizenziert ihn unter EUPL;')).length, 1, 'geänderter Satz, auch wenn er nach dem Abschnitt noch steht');
  assert.equal(trennungMaengel(gut.replace('bestimmt die Stelle, die es herausgibt', 'bestimmen wir')).length, 1, 'andere Bedingungen');
});
