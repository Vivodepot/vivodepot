/* Die Angehörigen-Blätter haben EINE Lese-Naht (`_angSituationen`/`_angSituationById`), und die
   Konstante `_ANG_SITUATIONEN` gibt es nicht mehr (ANG1, Abnahmepunkt 3): die Verbraucher (Cache,
   Empfängerkreise, Blatt-Vorschlag, Anlass-Export, Kennungsumbau, Ansicht, Suche) lesen über die
   Naht, deren Quelle die Vorlagen-Registry ist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

test('[Naht] liefert die fünf Blätter der ab-Werk-Vorlage, und jedes lässt sich über seine ID finden', () => {
  const { V } = ladeKern();
  const ids = V._angSituationen().map((s) => s.id).sort();
  assert.deepEqual(ids, ['beerdigung', 'behoerden_nachlass', 'krankenhausakut', 'meine_menschen', 'pflegeheimakut']);
  assert.deepEqual(ids, V.angehoerigenSituationenAlle().map((s) => s.id).sort());
  for (const id of ids) assert.equal(V._angSituationById(id).id, id);
  assert.equal(V._angSituationById('gibt-es-nicht'), undefined);
});

test('[Naht] ohne Vorlage liefert sie nichts — kein Rückfall auf hartkodierten Inhalt', () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual(V._angSituationen(), []);
  assert.equal(V._angSituationById('krankenhausakut'), undefined);
});

// Bezeichner im CODE (Kommentare zeilentreu geleert), als Liste "zeile: text".
function konstanteImCode(quelltext) {
  const src = quelltext
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((z) => (/^\s*\/\//.test(z) ? '' : z));
  const treffer = [];
  src.forEach((z, i) => { if (/\b_ANG_SITUATIONEN\b|\bANG_SITUATION_BY_ID\b/.test(z)) treffer.push((i + 1) + ': ' + z.trim().slice(0, 110)); });
  return treffer;
}

test('[Naht] die Konstante und ihr Index sind aus dem Kern entfernt — im Code und im Export', () => {
  const treffer = konstanteImCode(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
  assert.deepEqual(treffer, [], 'die Blätter sind Template, nicht Kern — kein Bezeichner mehr im Code:\n' + treffer.join('\n'));
  const { V } = ladeKern();
  assert.equal(V._ANG_SITUATIONEN, undefined);
  assert.equal(V.ANG_SITUATION_BY_ID, undefined);
});

test('[Naht · Rot-Beweis] eine wieder eingeführte Konstante wird gefunden — ein Kommentar darüber nicht', () => {
  const mit = 'function x() {}\nconst _ANG_SITUATIONEN = Object.freeze([{ id: "a" }]);\n';
  assert.equal(konstanteImCode(mit).length, 1);
  assert.equal(konstanteImCode('// _ANG_SITUATIONEN war einmal\n/* ANG_SITUATION_BY_ID */\n').length, 0);
  assert.equal(konstanteImCode('const y = ANG_SITUATION_BY_ID[id];').length, 1);
});
