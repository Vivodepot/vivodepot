'use strict';
/* ═══════════════════════════════════════════════════════════
   Generator: alte Bereichs-Beschriftungen führen auf HEUTIGE Bereichs-IDs (15.09.2026)
   ───────────────────────────────────────────────────────────
   `normBereich` im Template-Generator liest eine alte Einreichung oder ein CSV, das den Bereich
   noch als deutsche Beschriftung trägt. Zuerst gegen die heutige Beschriftung, dann gegen das
   Archiv `BEREICH_ALT_LABEL` (erzeugt aus tools/build-bereiche.js). Nach dem Kennungs-Umbau zeigte
   das Archiv noch auf die deutschen IDs: jede Beschriftung, die es nur dort gibt („Menschen",
   „Identität", „Vorsorge" …), landete auf einem Bereich, den der Generator nicht kennt.
   Der Kern (`_BEREICH_ALT_LABEL`) war schon englisch — beide müssen dasselbe liefern.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function generatorLaden(pfad) {
  const vorher = process.env.GENERATOR_HTML_PATH;
  if (pfad) process.env.GENERATOR_HTML_PATH = pfad; else delete process.env.GENERATOR_HTML_PATH;
  const lader = require.resolve('./load-generator.js');
  delete require.cache[lader];
  try { return require(lader).ladeGenerator().V; } finally {
    if (vorher === undefined) delete process.env.GENERATOR_HTML_PATH; else process.env.GENERATOR_HTML_PATH = vorher;
    delete require.cache[lader];
  }
}

function nurImArchiv(G) {
  const heutige = new Set(G.BEREICHE.map((id) => String(G.bereichLabel(id)).toLowerCase()));
  return Object.keys(G.BEREICH_ALT_LABEL).filter((l) => !heutige.has(l.toLowerCase()));
}

test('[Generator·Alt-Label] jede alte Beschriftung führt auf einen Bereich, den der Generator kennt — gleich wie der Kern', () => {
  const G = generatorLaden(null);
  const archivOnly = nurImArchiv(G);
  assert.ok(archivOnly.length >= 5, 'die Probe braucht Beschriftungen, die nur im Archiv stehen — gefunden: ' + archivOnly.join(', '));
  for (const label of Object.keys(G.BEREICH_ALT_LABEL)) {
    const id = G.normBereich(label);
    assert.ok(G.BEREICHE.includes(id), '„' + label + '" → „' + id + '" ist kein Bereich des Generators');
  }
  assert.equal(G.normBereich('Menschen'), 'people');
  assert.equal(G.normBereich('Vorsorge'), 'advanceCare');

  // Der Kern führt dieselbe Tabelle als `_BEREICH_ALT_LABEL` — gelesen aus dem Quelltext, nicht nachgebaut.
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const block = /const _BEREICH_ALT_LABEL = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(kern);
  assert.ok(block, '_BEREICH_ALT_LABEL im Kern nicht gefunden — Anker verfehlt');
  const kernTabelle = Object.fromEntries([...block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
  for (const label of Object.keys(G.BEREICH_ALT_LABEL)) {
    assert.equal(G.BEREICH_ALT_LABEL[label], kernTabelle[label], '„' + label + '": Generator und Kern führen auf verschiedene Bereiche');
  }
});

test('[Generator·Alt-Label·Rot-Beweis] mit dem Archiv auf den deutschen IDs fällt die Probe', () => {
  const echt = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
  const deutsch = { people: 'meine-menschen', identity: 'identitaet', advanceCare: 'vorsorge', administration: 'verwaltung' };
  const beginn = echt.indexOf('const BEREICH_ALT_LABEL = Object.freeze({');
  const ende = echt.indexOf('});', beginn);
  assert.ok(beginn > 0 && ende > beginn, 'BEREICH_ALT_LABEL im Generator nicht gefunden — Anker verfehlt');
  let region = echt.slice(beginn, ende);
  for (const [neu, alt] of Object.entries(deutsch)) region = region.replace('"' + neu + '"', '"' + alt + '"');
  const o = fs.mkdtempSync(path.join(os.tmpdir(), 'generator-alt-label-'));
  try {
    const kopie = path.join(o, 'generator.html');
    fs.writeFileSync(kopie, echt.slice(0, beginn) + region + echt.slice(ende));
    const G = generatorLaden(kopie);
    assert.equal(G.normBereich('Menschen'), 'meine-menschen', 'Testaufbau: die Mutation muss greifen');
    assert.ok(!G.BEREICHE.includes(G.normBereich('Menschen')), 'der alte Wert darf kein Bereich sein — sonst beweist die Probe oben nichts');
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});
