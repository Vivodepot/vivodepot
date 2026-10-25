'use strict';
/* AXE-SICHTEN-STILL-UNGEPRUEFT (22.10.2026): vier Dokumente nannten drei verschiedene Zahlen gescannter Sichten (35, 33, 15),
   gemessen waren 31 und 16, weil sieben Sichten der Hauptanwendung still aus dem axe-Lauf fielen. Die Zahl folgt jetzt aus
   der Sollliste tools/axe-sichten.json, die beide axe-Läufe verlangen. Diese Probe verlangt dieselbe Zahl an
   jeder Stelle, die sie nennt, und dort den Verweis auf die Sollliste als Weg zum Nachsehen. Schnell, ohne Browser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SOLL = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'axe-sichten.json'), 'utf8'));
const WEG = 'tools/axe-sichten.json';

/* Je Stelle ein Muster mit genau einer Zahl; `app` sagt, welche Liste sie zählt. Eine umformulierte Stelle ist rot, nicht
   still grün: jedes Muster muss genau einmal treffen. */
const STELLEN = [
  { datei: 'FAQ.md', app: 'hauptanwendung', muster: /axe-core über (\d+) Sichten der Hauptanwendung/g },
  { datei: 'FAQ.md', app: 'lese-app', muster: /Hauptanwendung und\s+(\d+) der Lese-App/g },
  { datei: 'INTEROPERABILITY.md', app: 'hauptanwendung', muster: /Barrierefreiheit, Haupt-App \| axe-core, WCAG 2\.2 AA \| (\d+) Sichten/g },
  { datei: 'INTEROPERABILITY.md', app: 'lese-app', muster: /Barrierefreiheit, Lese-App \| axe-core, WCAG 2\.2 AA \| (\d+) Sichten/g },
  { datei: 'docs/pruefebene.md', app: 'hauptanwendung', muster: /über alle (\d+) Sichten des Kerns/g },
  { datei: 'docs/pruefebene.md', app: 'lese-app', muster: /alle (\d+) Sichten der Lese-App/g },
  { datei: 'docs/konformitaet-quellen.md', app: 'hauptanwendung', muster: /\*\*(\d+) Sichten gescannt, 0 Violations\*\*/g },
  { datei: 'docs/konformitaet-quellen.md', app: 'hauptanwendung', muster: /jetzt \*\*(\d+) real aufgezählte/g },
];

function soll(app) { return SOLL[app].filter((n) => !(n in SOLL.ausnahmen)).length; }

function befunde(texte) {
  const b = [];
  for (const s of STELLEN) {
    const treffer = [...texte[s.datei].matchAll(s.muster)];
    if (treffer.length !== 1) { b.push(`${s.datei}: Muster ${s.muster} trifft ${treffer.length}-mal statt einmal`); continue; }
    const zahl = Number(treffer[0][1]);
    if (zahl !== soll(s.app)) b.push(`${s.datei}: ${zahl} Sichten (${s.app}), Sollliste sagt ${soll(s.app)}`);
  }
  for (const datei of new Set(STELLEN.map((s) => s.datei))) {
    if (!texte[datei].includes(WEG)) b.push(`${datei}: nennt ${WEG} nicht als Weg zum Nachsehen`);
  }
  return b;
}

function lesen() {
  const t = {};
  for (const datei of new Set(STELLEN.map((s) => s.datei))) t[datei] = fs.readFileSync(path.join(REPO, datei), 'utf8');
  return t;
}

test('[axe-Sichten·Zahl] jede Stelle nennt die Zahl der Sollliste und verweist auf sie', () => {
  assert.ok(soll('hauptanwendung') > 0 && soll('lese-app') > 0, 'die Sollliste ist nicht leer');
  assert.deepEqual(befunde(lesen()), []);
});

test('[axe-Sichten·Zahl·Rot-Beweis] die Zahlen bis 22.10.2026 (35, 33, 15) fallen', () => {
  const t = lesen();
  const alt = { ...t };
  alt['FAQ.md'] = t['FAQ.md'].replace(/über \d+ Sichten der Hauptanwendung/, 'über 35 Sichten der Hauptanwendung');
  alt['INTEROPERABILITY.md'] = t['INTEROPERABILITY.md'].replace(/(Lese-App \| axe-core, WCAG 2\.2 AA \| )\d+/, '$115');
  alt['docs/konformitaet-quellen.md'] = t['docs/konformitaet-quellen.md'].replace(/\*\*\d+ Sichten gescannt/, '**33 Sichten gescannt');
  const b = befunde(alt);
  assert.equal(b.length, 3, b.join('\n'));
  // Fehlt der Verweis, ist es ebenfalls rot.
  assert.equal(befunde({ ...t, 'docs/pruefebene.md': t['docs/pruefebene.md'].split(WEG).join('x') }).length, 1);
  // Ein umformulierter Satz ist rot, nicht still grün.
  assert.equal(befunde({ ...t, 'FAQ.md': t['FAQ.md'].replace('der Lese-App', 'des Lesers') }).length, 1);
});
