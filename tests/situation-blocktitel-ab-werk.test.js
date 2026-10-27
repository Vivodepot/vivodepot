'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Jeder Block jeder Situation ab Werk zeigt seine Überschrift — gerendert, in allen vier Produkten (25.10.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund PRO-ANLASS-BLOCKTITEL-LEER: der Kern legte beim Einlesen eines Bündels `titel` und `hint` jedes Blocks ab,
   weil sie Textsatz-Eigentum sind. Für Situationen, die nur im eigenen Modul stehen (die Pro-Anlässe), führt der
   Textsatz keinen Slot — jede Block-Überschrift stand leer da, Block-Hinweise fehlten.
   Gemessen wird am Renderweg (renderSituation), nicht an der Datenstruktur: je Block eine Überschrift, keine leer; trägt
   ein Block einen Hinweis, steht er genau einmal als `sektion-hint` da. Rot-Beweis an erfundenem Markup.
   ═════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const P = require('./produkt-html-erzeugen.js');

const PW = 'NURPROBE-' + 'blocktitel'.repeat(2);
const PRODUKTE = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];

// Überschriften und Hinweise aus gerendertem Markup: flache Sektion (h3) und klappbarer Block (summary-Titel).
function lesen(html) {
  const titel = [...html.matchAll(/<h3 class="sektion-titel">([^<]*)<\/h3>|<span class="feldgruppen-karte-titel">([^<]*)<\/span>/g)]
    .map((m) => (m[1] !== undefined ? m[1] : m[2]).trim());
  const hinweise = [...html.matchAll(/<p class="sektion-hint">([^<]*)<\/p>/g)].map((m) => m[1].trim());
  return { titel, hinweise };
}
function abweichungen(sit, html) {
  const { titel, hinweise } = lesen(html);
  const funde = [];
  if (titel.length < sit.bloecke.length) funde.push(sit.id + ': ' + titel.length + ' Überschriften für ' + sit.bloecke.length + ' Blöcke');
  if (titel.some((t) => !t)) funde.push(sit.id + ': leere Überschrift');
  const mitHinweis = sit.bloecke.filter((b) => typeof b.hint === 'string' && b.hint.trim()).length;
  if (hinweise.length !== mitHinweis) funde.push(sit.id + ': ' + hinweise.length + ' Hinweise für ' + mitHinweis + ' Blöcke mit Hinweis');
  return funde;
}

for (const slug of PRODUKTE) {
  test('[Blocktitel] ' + slug + ': jeder Block jeder Situation ab Werk zeigt seine Überschrift', async () => {
    const { V, document } = P.kernAus(P.produktHtml(slug));
    await V.depotAnlegen(PW);
    const alle = V.situationenAlle();
    assert.ok(alle.length > 0, 'Vorbedingung: Situationen ab Werk');
    const funde = [];
    let bloecke = 0;
    for (const s of alle) {
      V.renderSituation(s.id);
      funde.push(...abweichungen(s, document.getElementById('content').innerHTML));
      bloecke += s.bloecke.length;
    }
    assert.ok(bloecke > 0, 'Vorbedingung: Blöcke gerendert');
    assert.deepEqual(funde, []);
  });
}

test('[Blocktitel] pro-de und pro-en: die Pro-Anlässe tragen ihre Block-Überschriften aus dem Modul', async () => {
  for (const slug of ['pro-de', 'pro-en']) {
    const { V } = P.kernAus(P.produktHtml(slug));
    await V.depotAnlegen(PW);
    const pro = V.situationenAlle().filter((s) => s.id.startsWith('pro-'));
    assert.ok(pro.length >= 4, slug + ': Vorbedingung: die Pro-Anlässe');
    assert.deepEqual(pro.flatMap((s) => s.bloecke.filter((b) => typeof b.titel !== 'string' || !b.titel.trim()).map((b) => s.id + '#' + b.id)), [], slug);
  }
});

test('[Blocktitel·Rot-Beweis] leere Überschrift, fehlende Überschrift, fehlender Hinweis', () => {
  const sit = { id: 'x', bloecke: [{ id: 'a', hint: 'Wer?' }, { id: 'b' }] };
  assert.deepEqual(abweichungen(sit, '<h3 class="sektion-titel">A</h3><p class="sektion-hint">Wer?</p><h3 class="sektion-titel">B</h3>'), []);
  assert.ok(abweichungen(sit, '<h3 class="sektion-titel"></h3><p class="sektion-hint">Wer?</p><h3 class="sektion-titel">B</h3>').includes('x: leere Überschrift'));
  assert.equal(abweichungen(sit, '<h3 class="sektion-titel">A</h3><p class="sektion-hint">Wer?</p>').length, 1);
  assert.equal(abweichungen(sit, '<h3 class="sektion-titel">A</h3><span class="feldgruppen-karte-titel">B</span>').length, 1);
});
