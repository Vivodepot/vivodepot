'use strict';
/* Probe zu tools/buendel-zweig-nutzer-erheben.js: Das Werkzeug unterscheidet Einbinden von Erwähnen und meldet einen
   lebenden Nutzer mit Exit 1. Gegen den Checkout: Der Bündel-Zweig hat keinen lebenden Nutzer (Vorbedingung dafür, dass
   der tote bereichsErsatz-Zweig in buergermodulBuendelAnwenden entfernt ist; Nachtrag zu U2-ADR-348, 29.10.2026). */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { erheben, kernBuendel } = require('../tools/buendel-zweig-nutzer-erheben.js');

const REPO = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures', 'buendel-zweig-erhebung');
const WERKZEUG = path.join(REPO, 'tools', 'buendel-zweig-nutzer-erheben.js');

test('[Bündel-Zweig] die Fixture „tot“: nur Erwähnungen, kein lebender Nutzer, Exit 0', () => {
  const e = erheben(path.join(FIX, 'tot'));
  assert.deepEqual(e.nutzer, []);
  assert.deepEqual(e.erwaehnt, ['tests/erwaehnt.js', 'tools/register.js']);
  assert.deepEqual(e.lebend, []);
  assert.equal(spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8' }).status, 0);
});

test('[Bündel-Zweig·Rot-Beweis] die Fixture „lebend“: ein require der Varianten-Fixture ist ein lebender Nutzer, Exit 1', () => {
  const e = erheben(path.join(FIX, 'lebend'));
  assert.deepEqual(e.nutzer, ['tools/einbindend.js']);
  assert.deepEqual(e.erwaehnt, ['tests/erwaehnt.js']);
  assert.equal(e.lebend.length, 1);
  const r = spawnSync(process.execPath, [WERKZEUG, '--baum', path.join(FIX, 'lebend')], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /LEBEND: tools\/einbindend\.js/);
});

test('[Bündel-Zweig] ein gefülltes Bündel im Kern ist lebend, ein Kommentar zählt nicht', () => {
  assert.deepEqual(kernBuendel('x\nconst BUERGERMODUL_BUENDEL = null;\n'), { gefunden: true, leer: true });
  assert.deepEqual(kernBuendel('const BUERGERMODUL_BUENDEL = {"schema":1};'), { gefunden: true, leer: false });
  assert.deepEqual(kernBuendel('// const BUERGERMODUL_BUENDEL = null;'), { gefunden: false, leer: false });
});

test('[Bündel-Zweig] der Checkout: kein lebender Nutzer des Bündel-Ladewegs', () => {
  const e = erheben(REPO);
  assert.equal(e.kern.leer, true, 'const BUERGERMODUL_BUENDEL = null; steht im Kern');
  assert.deepEqual(e.lebend, []);
});

test('[Bündel-Zweig] der Kern trägt den Zweig für bereichsErsatz nicht mehr', () => {
  const kern = require('node:fs').readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const a = kern.indexOf('function buergermodulBuendelAnwenden(');
  assert.ok(a > 0);
  const rumpf = kern.slice(a, kern.indexOf('\n}\n', a));
  for (const s of ['bereichsErsatzGeprueft', 'bereicheMitErsatz', 'neuSektorIds', 'bereichsErsatz: true']) {
    assert.equal(rumpf.includes(s), false, s + ' steht noch in buergermodulBuendelAnwenden');
  }
  assert.equal(/function _bereichsErsatzPruefen\(/.test(kern), false, '_bereichsErsatzPruefen ist entfernt');
});
