'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund ANLASS-KACHEL-TITEL-ROH: der Titel einer Situation ab Werk stand unmaskiert in der Anlass-Kachel
   ────────────────────────────────────────────────────────────────────────
   Eine Anlass-Kachel ohne eigene Beschriftung trägt den Titel ihrer Situation (`_anlassAusSituation`). `renderAnlassAuswahl`
   setzte ihn roh ins Markup, und für Situationen ab Werk prüft der Kern nur die Struktur, nie den Text. Eine Zutat mit Markup
   im Titel (der Weg, auf dem Partner-Inhalt in ein Produkt kommt) hätte es auf die Startseite gebracht.
   Zwei Stellen halten jetzt, jede mit eigenem Rot-Beweis:
   (1) der Bau: eine Situations- oder Assistenten-Zutat mit einer Zeichenkette, die kein reiner Text ist, wird nicht eingebacken;
   (2) die Senke: steht ein solcher Titel trotzdem in der Datei, zeigt die Kachel ihn als Text.
   Gemessen an einem echt konfektionierten Pro-Produkt, denn dort tragen die Kacheln den Titel ihrer Situation.
   Die Fälle am echt konfektionierten Pro-Produkt stehen in einer nicht öffentlichen Probe; hier die Regeln ohne Vorlage.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const RT = require('../tools/lib/zutat-reiner-text.js');

const REPO = path.join(__dirname, '..');

test('[Kachel·Bau] die Regel gilt für jede Zeichenkette von Situationen und Assistenten, und nur für diese Arten', () => {
  assert.deepEqual(RT.NUR_REINER_TEXT_MODULTYPEN.slice(), ['situation', 'wizard']);
  for (const modulTyp of RT.NUR_REINER_TEXT_MODULTYPEN) {
    for (const wert of ['<b>x</b>', 'a &amp; b', 'sagt "x"', '</span>']) {
      assert.throws(() => RT.zutatReinerTextPruefen({ modulTyp, tief: { liste: [{ text: wert }] } }, 'probe.json'), /Kein reiner Text in probe\.json .*tief\.liste\.0\.text/, modulTyp + ': ' + wert);
    }
    for (const wert of ['a < b', 'Müller & Söhne', 'Doctor’s appointment', "can't", '„Zitat“']) {
      assert.doesNotThrow(() => RT.zutatReinerTextPruefen({ modulTyp, text: wert }, 'probe.json'), modulTyp + ': ' + wert);
    }
  }
});

test('[Kachel·Bau] das Muster im Bau ist dasselbe wie im Kern', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const m = /const _TAG_ODER_REFERENZ = (\/.*\/);/.exec(kern);
  assert.ok(m, 'Testvoraussetzung: _TAG_ODER_REFERENZ steht im Kern');
  assert.equal(String(RT.TAG_ODER_REFERENZ), m[1]);
});

/* escapeTextknoten maskiert weniger als escapeHTML (kein Anführungszeichen, kein Apostroph). Das ist nur zwischen zwei Tags
   richtig. Darum: jede Verwendung steht unmittelbar zwischen einem Literal, das mit `>` endet, und einem, das mit `<` beginnt,
   und die Zahl der Aufrufer steht fest. Wer eine dritte Stelle braucht, hebt die Zahl hier bewusst an. */
const TEXTKNOTEN_AUFRUFER = Object.freeze({ 'vivodepot.html': 2 });
const TEXTKNOTEN_LAGE = /'[^'\n]*>' \+ escapeTextknoten\([^()\n]*\) \+ '<[^'\n]*'/g;
function textknotenVerwendungen(text) {
  const alle = (text.match(/\bescapeTextknoten\(/g) || []).length - (text.match(/function escapeTextknoten\(/g) || []).length;
  return { alle, inTextknotenLage: (text.match(TEXTKNOTEN_LAGE) || []).length };
}
test('[Kachel·Maskierung] escapeTextknoten steht nur zwischen zwei Tags, und nur an den gezählten Stellen', () => {
  const oberflaechen = require('../tools/marken-adressen-pruefen.js').OBERFLAECHEN;
  for (const d of oberflaechen) {
    const v = textknotenVerwendungen(fs.readFileSync(path.join(REPO, d), 'utf8'));
    assert.equal(v.alle, TEXTKNOTEN_AUFRUFER[d] || 0, d + ': Zahl der Aufrufer');
    assert.equal(v.inTextknotenLage, v.alle, d + ': jede Verwendung in Textknoten-Lage');
  }
});
test('[Kachel·Maskierung·Rot-Beweis] eine Verwendung in einem Attribut oder eine weitere Stelle wäre rot', () => {
  const imAttribut = "x = '<button title=\"' + escapeTextknoten(a.label) + '\">';";
  assert.deepEqual(textknotenVerwendungen(imAttribut), { alle: 1, inTextknotenLage: 0 });
  const imTag = "x = '<span ' + escapeTextknoten(a.label) + '>';";
  assert.deepEqual(textknotenVerwendungen(imTag), { alle: 1, inTextknotenLage: 0 });
  const richtig = "x = '<span>' + escapeTextknoten(a.label) + '</span>';";
  assert.deepEqual(textknotenVerwendungen(richtig), { alle: 1, inTextknotenLage: 1 });
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(textknotenVerwendungen(kern + "\ny = '<p>' + escapeTextknoten(z) + '</p>';").alle, TEXTKNOTEN_AUFRUFER['vivodepot.html'] + 1);
});
