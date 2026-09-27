'use strict';
/* Firefox-Proben, die mit FIXME-ID stillgelegt sind: jede test.fixme in tests/e2e-firefox/ hat einen Eintrag
   im Register (Ursache, Eigentümer, Rückkehr) und umgekehrt; die Zahl kann nur sinken. Anlass: die Proben
   wurden ins pre-push-Gate genommen (19.09.2026) und waren rot — sichtbar still legen statt das Gate sperren. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, 'e2e-firefox');
const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'e2e-firefox-fixme-register.json'), 'utf8'));

function fixmeStellen(dir = DIR) {
  const t = [];
  for (const d of fs.readdirSync(dir).filter((n) => n.endsWith('.spec.js'))) {
    const text = fs.readFileSync(path.join(dir, d), 'utf8');
    for (const m of text.matchAll(/^\s*test\.(?:fixme|skip)\(\s*'(?:\[(FF-\d+)\]\s*)?/gm)) t.push({ datei: 'tests/e2e-firefox/' + d, id: m[1] || null });
  }
  return t;
}

test('[Firefox-Fixme] jede stillgelegte Probe trägt eine FIXME-ID mit Registereintrag, und jeder Eintrag hat seine Probe', () => {
  const stellen = fixmeStellen();
  assert.deepEqual(stellen.filter((s) => !s.id).map((s) => s.datei), [], 'eine fixme/skip ohne FF-ID');
  const ids = stellen.map((s) => s.id).sort();
  assert.deepEqual(ids, REG.eintraege.map((e) => e.id).sort(), 'Register und Proben stimmen nicht überein — Eintrag streichen, sobald die Probe umgestellt ist');
  for (const e of REG.eintraege) {
    for (const f of ['ursache', 'eigentuemer', 'rueckkehr']) assert.ok(e[f] && e[f].length > 2, e.id + ': ' + f + ' fehlt');
    assert.ok(stellen.some((s) => s.id === e.id && s.datei === e.spec), e.id + ' steht nicht in ' + e.spec);
  }
});

test('[Firefox-Fixme·Rot-Beweis] eine fixme ohne ID und eine ID ohne Eintrag werden gemeldet', () => {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ffx-'));
  fs.writeFileSync(path.join(tmp, 'a.spec.js'), "test.fixme('ohne id', async () => {});\ntest.fixme('[FF-99] mit id', async () => {});\n");
  const s = fixmeStellen(tmp);
  assert.equal(s.filter((x) => !x.id).length, 1, 'die fixme ohne ID wird gefunden');
  assert.ok(!REG.eintraege.some((e) => e.id === s.find((x) => x.id).id), 'FF-99 hat keinen Eintrag');
});
