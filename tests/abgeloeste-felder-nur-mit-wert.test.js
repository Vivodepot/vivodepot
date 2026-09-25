'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Auffangfelder einer Migration stehen nur mit Wert da (Abnahme 17.09.2026, G-6)
   ────────────────────────────────────────────────────────────────────────
   Die Liste `felderNurMitWert()` wird gegen die Beschriftungen im deutschen Textsatz gehalten, in beide
   Richtungen: ein neues „— frühere Angabe"- oder „(noch nicht übernommen)"-Feld ohne Eintrag wird rot, und
   ein Eintrag ohne solches Feld ebenso.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const MARKE = /frühere Angabe|noch nicht übernommen/;

function auffangfelderAusTextsatz(V) {
  const ids = new Set();
  for (const [k, t] of Object.entries(V.TEXTSATZ_DE_QUELLE.texte)) {
    const m = /^(?:situation:[^.]+|[a-zA-Z]+)\.([A-Za-z0-9_]+)\.label$/.exec(k);
    if (m && MARKE.test(String(t))) ids.add(m[1]);
  }
  return ids;
}

test('[G-6] die Liste deckt genau die Auffangfelder, die der Textsatz so beschriftet', () => {
  const { V } = ladeKern();
  const ausText = auffangfelderAusTextsatz(V);
  const liste = V.felderNurMitWert();
  assert.deepEqual([...ausText].filter((id) => !liste.has(id)).sort(), [], 'Auffangfeld ohne Eintrag in felderNurMitWert()');
  assert.deepEqual([...liste].filter((id) => !ausText.has(id)).sort(), [], 'Eintrag ohne Auffangfeld');
});

test('[G-6·Rot-Beweis] leer unsichtbar, mit Wert sichtbar — ein gewöhnliches Feld bleibt immer sichtbar', () => {
  const { V } = ladeKern();
  const f = { id: 'taxClassEarlierEntry', typ: 'text' };
  assert.equal(V.feldSichtbar(f, {}), false);
  assert.equal(V.feldSichtbar(f, { taxClassEarlierEntry: 'III' }), true);
  assert.equal(V.feldSichtbar({ id: 'taxClass', typ: 'text' }, {}), true);
});

test('[G-6] im leeren Depot steht kein Auffangfeld im gerenderten Bereich', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('auffang-probe-lang-genug-2026');
  for (const sektorId of ['identity', 'mobility', 'education', 'emergencyPreparedness', 'socialInsurance', 'administration', 'people']) {
    V.oeffneSektor(sektorId);
    const html = document.getElementById('content').innerHTML;
    assert.equal(/frühere Angabe|noch nicht übernommen/.test(html.replace(/<details[^>]*hidden[\s\S]*?<\/details>/g, '')), false, sektorId);
  }
});
