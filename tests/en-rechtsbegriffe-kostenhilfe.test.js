'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EN-Rechtsbegriffe der Kostenhilfe: Beratungshilfe ist „advice assistance“, „legal aid“ ist Prozess- bzw.
   Verfahrenskostenhilfe (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die beiden Hilfen haben verschiedene Voraussetzungen und verschiedene Antragswege. Ein englischer Satz, der für die
   Beratungshilfe „legal aid“ sagt, schickt die Person zum falschen Antrag. Die Probe vergleicht je Kennung den deutschen
   und den englischen Text des eigenen Textsatzes: nennt der deutsche die Beratungshilfe, nennt der englische
   „advice assistance“; sagt der englische „legal aid“, nennt der deutsche Prozess- oder Verfahrenskostenhilfe.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const lies = (datei) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8')).texte;

function kostenhilfeFunde(de, en) {
  const funde = [];
  for (const k of Object.keys(de)) {
    const d = de[k];
    const e = en[k];
    if (typeof d !== 'string' || typeof e !== 'string') continue;
    const beratung = /Beratungshilfe/.test(d);
    const prozess = /Prozesskostenhilfe|Verfahrenskostenhilfe/.test(d);
    if (beratung && !/advice assistance/i.test(e)) funde.push(k + ': Beratungshilfe ohne „advice assistance“');
    if (/legal aid/i.test(e) && !prozess) funde.push(k + ': „legal aid“ ohne Prozess- oder Verfahrenskostenhilfe im Deutschen');
  }
  return funde;
}

test('[EN-Kostenhilfe] Beratungshilfe heißt „advice assistance“, „legal aid“ steht nur für Prozess- oder Verfahrenskostenhilfe', () => {
  const de = lies('textsatz-de-modul.json');
  const en = lies('textsatz-en-modul.json');
  assert.ok(Object.keys(de).filter((k) => /Beratungshilfe/.test(de[k])).length > 0, 'die Probe hat Gegenstand');
  assert.deepEqual(kostenhilfeFunde(de, en), []);
});

test('[EN-Kostenhilfe·Rot-Beweis] „legal aid“ für die Beratungshilfe ist ein Fund, beide Hilfen in einem Satz nicht', () => {
  const de = {
    a: 'Den Antrag auf Beratungshilfe stellen Sie beim Amtsgericht.',
    b: 'Beratungshilfe oder Prozesskostenhilfe beantragen',
  };
  assert.deepEqual(kostenhilfeFunde(de, { a: 'You apply for legal aid at the local court.', b: 'Applying for advice assistance or legal aid' }),
    ['a: Beratungshilfe ohne „advice assistance“', 'a: „legal aid“ ohne Prozess- oder Verfahrenskostenhilfe im Deutschen']);
  assert.deepEqual(kostenhilfeFunde(de, { a: 'You apply for advice assistance at the local court.', b: 'Applying for advice assistance or legal aid' }), []);
});
