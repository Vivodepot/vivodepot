'use strict';
/* x509-limbo-voll-messen.test.js — das Werkzeug tools/x509-limbo-voll-messen.js ohne --limbo, gegen die gepinnte Auswahl im Repo
   (Positivkontrolle, 15.10.2026). Die volle limbo.json liegt nicht im Repo; ohne Argument fährt das Werkzeug jeden FAILURE-Fall der
   Auswahl (darin die bettertls-Stichprobe) und zählt. Bewertet wird hier nicht — das tut tests/x509-limbo.test.js —, sondern dass
   das Werkzeug läuft, jeden Fall zählt und eine fremde limbo.json abweist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/x509-limbo-voll-messen.js');
const L = require('./lib/x509-limbo-lauf.js');

test('[X509·limbo·voll] ohne --limbo fährt das Werkzeug jeden FAILURE-Fall der Auswahl und meldet Zahlen je Gruppe', async () => {
  const soll = ['umfang.json', 'ausserhalb.json'].map((d) => L.auswahlLesen(d).daten.faelle.filter((f) => f.erwartet === 'FAILURE').length)
    .reduce((x, y) => x + y, 0);
  const e = await W.main([]);
  assert.match(e.quelle, /Auswahl im Repo/);
  assert.equal(e.faelle, soll, 'jeder FAILURE-Fall der Auswahl gefahren');
  assert.equal(Object.values(e.jeGruppe).reduce((x, z) => x + z.failure, 0), soll);
  assert.ok(e.jeGruppe.bettertls && e.jeGruppe.bettertls.failure > 100, 'die bettertls-Stichprobe ist dabei');
  assert.equal(e.angenommen, e.angenommeneFaelle.length);
  assert.equal(Object.values(e.gruende).reduce((x, y) => x + y, 0) + e.angenommen, e.faelle, 'jeder Fall hat ein Ergebnis');
  assert.ok(e.sekunden >= 0);
});

test('[X509·limbo·voll·Rot-Beweis] eine limbo.json mit anderer Prüfsumme wird nicht gefahren', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x509-limbo-voll-'));
  try {
    const f = path.join(dir, 'limbo.json');
    fs.writeFileSync(f, JSON.stringify({ version: 1, testcases: [] }));
    assert.throws(() => W.ausLimbo(f), /gepinnt ist 611e337b/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
