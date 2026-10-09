'use strict';
/* Der Integratoren-Leitfaden (EN: docs/INTEGRATION.md + DATA-MODEL.md + REQUESTS-AND-RESPONSES.md, DE: docs/integrieren.md)
   behauptet Pfade, Befehle, Kernstellen und Feldkennungen. Diese Probe hält jede Behauptung gegen das Repo:
     · jeder relative Link und jeder genannte Repo-Pfad existiert;
     · jedes `grep -n "<muster>" vivodepot.html` trifft, jedes `node tools/<x>.js` gibt es;
     · jede genannte Feldkennung steht im Feldkatalog;
     · DE folgt der EN-Gliederung (Abschnitte von INTEGRATION.md, dann die zwei Zusatzkapitel);
     · keine festen Zählungen (die veralten), kein Store-Satz.
   Jede Prüfung hat einen Rot-Beweis an einem mutierten Text. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const DOCS = path.join(WURZEL, 'docs');
const EN = ['INTEGRATION.md', 'DATA-MODEL.md', 'REQUESTS-AND-RESPONSES.md'];
const DE = 'integrieren.md';
const lies = (d) => fs.readFileSync(path.join(DOCS, d), 'utf8');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const KENNUNGEN = new Set(JSON.parse(fs.readFileSync(path.join(WURZEL, 'bereiche', 'feldkatalog.json'), 'utf8')).felder.map((f) => f.kennung));
const BEREICHE = new Set([...KENNUNGEN].map((k) => k.split('.')[0]));

function fehlendeLinks(text, ordner) {
  const raus = [];
  for (const m of text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(m[1])) continue;
    if (!fs.existsSync(path.join(ordner, m[1]))) raus.push(m[1]);
  }
  return raus;
}
function fehlendePfade(text) {
  const raus = [];
  for (const m of text.matchAll(/`((?:docs|tools|bereiche|examples|tests)\/[^`\s<>…]+|[A-Za-z-]+\.(?:html|md))`/g)) {
    if (!fs.existsSync(path.join(WURZEL, m[1])) && !fs.existsSync(path.join(DOCS, m[1]))) raus.push(m[1]);
  }
  return raus;
}
function fehlendeBefehle(text) {
  const raus = [];
  for (const m of text.matchAll(/grep -n "([^"]+)"(?: -A\d+)? vivodepot\.html/g)) if (!KERN.includes(m[1])) raus.push('grep ' + m[1]);
  for (const m of text.matchAll(/node (tools\/[\w./-]+\.js)/g)) if (!fs.existsSync(path.join(WURZEL, m[1]))) raus.push(m[1]);
  return raus;
}
function unbekannteKennungen(text) {
  return [...text.matchAll(/`([a-z][A-Za-z]+\.[a-z][A-Za-z0-9]+)`/g)].map((m) => m[1])
    .filter((k) => BEREICHE.has(k.split('.')[0]) && !KENNUNGEN.has(k));
}
const FESTE_ZAHL = /\b\d{2,}\s+(?:module types|Modultypen|field IDs|Feldkennungen|Kennungen|built-in areas|eingebaute Bereiche|areas|Bereiche)\b/i;
const STORE = /\b(?:App[ -]?Store|Play[ -]?Store|Google Play)\b/i;
const abschnitte = (text) => [...text.matchAll(/^## (\d+) · /gm)].map((m) => Number(m[1]));

for (const datei of [...EN, DE]) {
  test('[Leitfaden] ' + datei + ': Links, Pfade, Befehle, Kennungen stimmen; keine feste Zahl, kein Store-Satz', () => {
    const t = lies(datei);
    assert.deepEqual(fehlendeLinks(t, DOCS), [], 'Links');
    assert.deepEqual(fehlendePfade(t), [], 'Pfade');
    assert.deepEqual(fehlendeBefehle(t), [], 'Befehle');
    assert.deepEqual(unbekannteKennungen(t), [], 'Feldkennungen');
    assert.doesNotMatch(t, FESTE_ZAHL);
    assert.doesNotMatch(t, STORE);
  });
}

test('[Leitfaden] DE folgt der EN-Gliederung: Abschnitte von INTEGRATION.md, dann Datenmodell und Anfrage/Antwort', () => {
  const en = abschnitte(lies('INTEGRATION.md'));
  const de = abschnitte(lies(DE));
  assert.ok(en.length >= 5);
  assert.deepEqual(de, [...en, en.length + 1, en.length + 2]);
  for (const d of EN) assert.ok(lies(DE).includes('(' + d + ')'), 'DE verweist auf ' + d);
  for (const d of EN.slice(1)) assert.ok(lies(d).includes('(integrieren.md)'), d + ' verweist auf DE');
});

test('[Leitfaden] Rot-Beweise: jede Prüfung schlägt am mutierten Text an', () => {
  assert.deepEqual(fehlendeLinks('[x](gibt-es-nicht.md)', DOCS), ['gibt-es-nicht.md']);
  assert.deepEqual(fehlendePfade('`tools/gibt-es-nicht.js`'), ['tools/gibt-es-nicht.js']);
  assert.deepEqual(fehlendeBefehle('grep -n "GIBT_ES_NICHT_' + 'IM_KERN" vivodepot.html'), ['grep GIBT_ES_NICHT_IM_KERN']);
  assert.deepEqual(fehlendeBefehle('node tools/gibt-es-nicht.js'), ['tools/gibt-es-nicht.js']);
  assert.deepEqual(unbekannteKennungen('`identity.gibtEsNicht`'), ['identity.gibtEsNicht']);
  assert.deepEqual(unbekannteKennungen('`identity.givenName`'), []);
  assert.match('The core knows 16 module types.', FESTE_ZAHL);
  assert.match('Laden Sie die App im App Store.', STORE);
  assert.deepEqual(abschnitte('## 1 · a\n## 2 · b\n'), [1, 2]);
});
