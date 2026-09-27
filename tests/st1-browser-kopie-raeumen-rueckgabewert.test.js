'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   st1-browser-kopie-raeumen-rueckgabewert.test.js — Rot-Beweis für ST1
   (Code-Review vom 16.09.2026, in der Befund-
   Ratsche 18./19.09.2026 nachgetragen).

   `browserKopieRaeumen()` liest nach dem Löschen zurück, ob die Kopie
   wirklich weg ist ("nachgelesen, nicht angenommen") — der Rückgabewert
   wurde an beiden Aufrufstellen (Primär-Schließen, Stick-Rückfrage) bis
   hierher verworfen. `strings:stickSchliessenHinweis` sagt der Bürgerin
   aber ausdrücklich zu, dass die Kopie gelöscht wird — ein Fehlschlag blieb
   unbemerkt.

   Jetzt: ein Fehlschlag (Rückgabewert `false`) löst `ui.toast(STRINGS.
   stickRaeumenFehlgeschlagenHinweis, 'info')` aus, über die neue Hilfs-
   funktion `_stickRaeumenFehlgeschlagenMelden`. Diese Probe hält (a) die
   Hilfsfunktion selbst fest und (b) per Quelltext-Prüfung, dass beide
   Aufrufstellen den Rückgabewert tatsächlich lesen, statt ihn zu ignorieren. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

test('[ST1·Rot-Beweis] _stickRaeumenFehlgeschlagenMelden meldet über ui.toast, mit dem neuen Hinweistext', async () => {
  const { V } = await ladeKern();
  const rufe = [];
  V.ui.toast = (text, art) => rufe.push({ text, art });
  V._stickRaeumenFehlgeschlagenMelden();
  assert.equal(rufe.length, 1);
  assert.equal(rufe[0].text, V.STRINGS.stickRaeumenFehlgeschlagenHinweis);
  assert.equal(rufe[0].art, 'info');
});

test('[ST1·Rot-Beweis] der Hinweistext unterscheidet sich DE/EN (kein Literal, kommt aus STRINGS)', async () => {
  // S1 (20.09.2026, U2-ADR-426): Deutsch kommt aus dem deutschen Produkt, Englisch aus dem Sprachmodul des
  // englischen — je ein Kern; die Assertion ist unverändert: der Hinweis kommt aus STRINGS, nicht als Literal.
  const { V: VDe } = await ladeKern();
  const de = VDe.STRINGS.stickRaeumenFehlgeschlagenHinweis;
  const { V } = await ladeKern({ produkt: 'privat-en' });
  await V.depotAnlegen('st1-guard-2026!');
  const dd = V.getData();
  dd.textsprache = 'en';
  V.setData(dd);
  const en = V.STRINGS.stickRaeumenFehlgeschlagenHinweis;
  assert.notEqual(de, en);
});

test('[ST1·Rot-Beweis] beide Aufrufstellen von browserKopieRaeumen() lesen jetzt den Rückgabewert', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const start = quelle.indexOf('const raeum = browserKopieRaeumenModell(weg);');
  assert.ok(start >= 0, 'Ankerstelle nicht gefunden — Funktion umbenannt/verschoben?');
  const rumpf = quelle.slice(start, start + 700);
  // Vorher stand hier `await browserKopieRaeumen();` — ein Ausdruck ohne jede Verwendung des
  // Ergebnisses. Jetzt muss der Rückgabewert in einer Bedingung oder einem Parameter landen.
  assert.ok(!/^\s*await browserKopieRaeumen\(\);\s*$/m.test(rumpf),
    'die erste Aufrufstelle liest den Rückgabewert immer noch nicht (Fire-and-forget)');
  assert.ok(rumpf.includes('_stickRaeumenFehlgeschlagenMelden'),
    'kein Aufruf der Melde-Funktion in der Nähe — der Rückgabewert wird vermutlich nicht ausgewertet');
  assert.ok(!/browserKopieRaeumen\(\)\.then\(weiterFn, weiterFn\)/.test(rumpf),
    'die Rückfrage-Aufrufstelle ruft weiterFn noch direkt als onFulfilled auf, ohne den Rückgabewert zu prüfen');
});
