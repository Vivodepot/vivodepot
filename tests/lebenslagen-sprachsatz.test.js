'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Lebenslagen laufen über den Sprachsatz (26.09.2026, Befund
   LEBENSLAGEN-EN-DEUTSCH-LECK)
   ────────────────────────────────────────────────────────────────────────
   Der Lebenslagen-Katalog (tools/lebenslagen-katalog-modul.json) ist deutsch.
   Die englische Ausgabe zeigte ihn deutsch, weil jede Lesestelle `name`,
   `unterlagen` und `hinweise` roh las. Jetzt liefern die Katalogeinträge im
   Kern diese Felder über Getter aus dem Sprachsatz (`lebenslage:<id>.label`,
   `.unterlagen`, `.hinweis.<n>`).
   Zwei Wächter:
     1 DECKUNG — jede Lage hat ihre Kennungen im deutschen UND im englischen
       Modul; der deutsche Wert ist wortgleich der Katalogtext.
     2 KLASSE — am rohen Katalog vorbei liest im Kern nur die eine Zeile, die
       BAUSTEINE baut; eine neue Lesestelle von LEBENSLAGEN_KATALOG fällt.
   Den sichtbaren Nachweis im Browser hält tests/e2e/lebenslagen-englisch.spec.js.
   ROT-BEWEIS: eine fehlende englische Kennung, und eine zweite Lesestelle.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const lies = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));
const KATALOG = lies('tools/lebenslagen-katalog-modul.json').bausteine;
const DE = lies('tools/textsatz-de-modul.json').texte;
const EN = lies('tools/textsatz-en-modul.json').texte;

function kennungen(b) {
  const k = [['lebenslage:' + b.id + '.label', b.name]];
  if (b.unterlagen) k.push(['lebenslage:' + b.id + '.unterlagen', b.unterlagen]);
  (b.hinweise || []).forEach((h, i) => k.push(['lebenslage:' + b.id + '.hinweis.' + i, h]));
  return k;
}

function deckungBefund(katalog, de, en) {
  const befund = [];
  for (const b of katalog) {
    for (const [k, text] of kennungen(b)) {
      if (de[k] !== text) befund.push(k + ': deutsch fehlt oder weicht vom Katalog ab');
      if (typeof en[k] !== 'string' || !en[k].trim()) befund.push(k + ': englisch fehlt');
      else if (en[k] === text) befund.push(k + ': englisch ist der deutsche Text');
    }
  }
  return befund;
}

function lesestellenBefund(kern) {
  const code = kern.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const treffer = [...code.matchAll(/\bLEBENSLAGEN_KATALOG\b/g)].length;
  // Erwartet: die Deklaration in der Region, die zwei Lesungen in der BAUSTEINE-Zeile und seit dem Kachel-Schnitt (02.10.2026)
  // drei in der ANLAESSE-Zeile — sie liest nur Kennung, Klasse, Symbol und Ziel; die Beschriftung kommt aus `anlass:<id>.label`.
  return treffer === 6 ? [] : ['LEBENSLAGEN_KATALOG kommt ' + treffer + '× im Code vor, erwartet 6 (Region + BAUSTEINE + ANLAESSE)'];
}

test('[Lebenslagen·Sprachsatz] jede Lage hat Name, Unterlagen und Hinweise deutsch (wortgleich) und englisch', () => {
  assert.ok(KATALOG.length > 20, 'Vorbedingung: der Katalog ist besetzt');
  assert.deepEqual(deckungBefund(KATALOG, DE, EN), []);
});

test('[Lebenslagen·Sprachsatz] am rohen Katalog vorbei liest im Kern nur die BAUSTEINE-Zeile', () => {
  assert.deepEqual(lesestellenBefund(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')), []);
});

test('[Lebenslagen·Sprachsatz·Rot-Beweis] eine fehlende englische Kennung und eine zweite Lesestelle fallen', () => {
  const ohne = { ...EN };
  delete ohne['lebenslage:trennung-scheidung.hinweis.0'];
  assert.deepEqual(deckungBefund(KATALOG, DE, ohne), ['lebenslage:trennung-scheidung.hinweis.0: englisch fehlt']);
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(lesestellenBefund(kern + '\nconst x = LEBENSLAGEN_KATALOG.bausteine[0].name;\n').length, 1);
});
