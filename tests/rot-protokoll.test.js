'use strict';
/* LANDUNG-ROT-OHNE-DATEI (28.10.2026): ein roter Zugkopf nennt seine roten Dateien ohne Wortsuche und behält seine Protokolle
   (tools/lib/rot-protokoll.js). Der Rot-Beweis läuft gegen die alte Zeilenauswahl der Landungsvorbereitung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const RP = require('../tools/lib/rot-protokoll.js');

const GRUEN = Array.from({ length: 35 }, (_, i) => '✔ [Probe·Rot-Beweis] Fall ' + i + ' ist rot erkannt (1ms)').join('\n');
const PROTOKOLL = GRUEN + '\n✖ [B] rechnet (2ms)\nℹ fail 1\n\n✖ failing tests:\n\ntest at /repo/tests/b.test.js:3:1\n✖ [B] rechnet (2ms)\n  AssertionError: 1 !== 2\n';

test('[Rot-Protokoll·Rot-Beweis] die alte Zeilenauswahl zeigt hinter 35 grünen „Rot“-Namen keine Datei; die neue nennt sie', () => {
  const alt = PROTOKOLL.split('\n').filter((z) => /^✖|^ℹ (pass|fail)|ROT|rot|Error/.test(z)).slice(0, 30).join('\n');
  assert.doesNotMatch(alt, /b\.test\.js|^✖/m, 'Rot-Beweis: die alte Auswahl sieht die rote Datei nicht');
  const r = RP.roteDateien({ protokoll: PROTOKOLL, wurzel: '/repo' });
  assert.equal(r.quelle, 'spec: failing tests');
  assert.deepEqual(r.dateien, [{ datei: 'tests/b.test.js', tests: ['[B] rechnet'] }]);
  assert.equal(r.fail, 1);
  assert.match(RP.rotMeldung({ seite: 'node-suite', protokoll: PROTOKOLL, wurzel: '/repo' }), /✖ tests\/b\.test\.js — \[B\] rechnet/);
});

test('[Rot-Protokoll] das frühe Rot geht vor, je Datei einmal; file://-Pfade werden relativ', () => {
  const r = RP.roteDateien({ erstesRot: 'tests/c.test.js\t[C] eins\tmeldung\ntests/c.test.js\t[C] zwei\n', protokoll: PROTOKOLL });
  assert.equal(r.quelle, 'frühes Rot');
  assert.deepEqual(r.dateien, [{ datei: 'tests/c.test.js', tests: ['[C] eins', '[C] zwei'] }]);
  const f = RP.roteDateien({ protokoll: '✖ failing tests:\n\ntest at file:///repo/tools/x.test.js:1:1\n✖ x\n', wurzel: '/repo' });
  assert.deepEqual(f.dateien, [{ datei: 'tools/x.test.js', tests: ['x'] }]);
});

test('[Rot-Protokoll] Exit 1 ohne roten Test: ausdrücklich „kein Test rot“ mit den letzten Zeilen; ✖ ohne Datei nennt die Tests', () => {
  const m = RP.rotMeldung({ seite: 'node-suite', grund: 'Exit 1 bei npm test', protokoll: GRUEN + '\nℹ fail 0\nHülle: Abbruch\n' });
  assert.match(m, /Suite Exit 1 bei npm test, kein Test rot — die Ursache liegt außerhalb der Tests/);
  assert.match(m, /letzte Zeilen der Seite:[\s\S]*Hülle: Abbruch/);
  assert.match(RP.rotMeldung({ seite: 'node-suite', protokoll: '✖ [D] ohne Block (1ms)\nℹ fail 1\n' }), /rote Tests ohne Datei \(spec-Marken, ℹ fail 1\):\n {4}✖ \[D\] ohne Block/);
  assert.match(RP.rotMeldung({ seite: 'mac-seite', protokoll: 'a\nGate rot: x\n' }), /letzte Zeilen der Seite:\n {4}a\n {4}Gate rot: x/);
});

test('[Rot-Protokoll] Protokolle behalten: Kopie am Ort, die jüngsten bleiben; ohne Ort oder bei Schreibfehler wirft es', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rot-protokoll-'));
  try {
    const quelle = path.join(tmp, 'q.log');
    fs.writeFileSync(quelle, 'inhalt');
    const ziele = RP.protokolleBehalten({ ort: tmp, baum: 'abcdef1234567890', dateien: [{ name: 'node-suite', pfad: quelle }, { name: 'fehlt', pfad: path.join(tmp, 'nein') }] });
    assert.deepEqual(ziele, [path.join(tmp, RP.PROTOKOLL_ORDNER, 'abcdef123456-node-suite.log')]);
    assert.equal(fs.readFileSync(ziele[0], 'utf8'), 'inhalt');
    for (let i = 0; i < 4; i++) RP.protokolleBehalten({ ort: tmp, baum: 'baum' + i + 'xxxxxxxx', dateien: [{ name: 's', pfad: quelle }], behalten: 2 });
    assert.equal(fs.readdirSync(path.join(tmp, RP.PROTOKOLL_ORDNER)).length, 2, 'nur die jüngsten bleiben');
    assert.throws(() => RP.protokolleBehalten({ ort: null, dateien: [] }), /kein Ort/);
    const datei = path.join(tmp, 'eine-datei');
    fs.writeFileSync(datei, '');
    assert.throws(() => RP.protokolleBehalten({ ort: datei, dateien: [{ name: 's', pfad: quelle }] }));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
