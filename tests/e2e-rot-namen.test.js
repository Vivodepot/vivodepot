'use strict';
/* ════════════════════════════════════════════════════════════════════════
   e2e-rot-namen.test.js — ein roter E2E-Lauf nennt seine roten Reisen (17.10.2026)
   ────────────────────────────────────────────────────────────────────────
   scripts/pruefe-e2e-bereich.js brach mit „die Cross-Reisen sind rot“ ab, ohne zu sagen, welche Reise rot war. Geprüft:
   1. Aus dem JSON-Bericht von Playwright werden die roten Reisen als „<datei> › <titel>“ gelesen, auch verschachtelt.
   2. Der voreingestellte Start hängt den JSON-Reporter an (npx direkt, npm hinter „--“) und gibt den Bericht über
      PLAYWRIGHT_JSON_OUTPUT_NAME an einen echten Kindprozess weiter; unter CI bleibt die Befehlszeile unverändert.
   3. Jeder der fünf Abbrüche nennt die roten Reisen; Rot-Beweis: ohne Bericht steht keine Namenszeile da.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const E = require('../scripts/pruefe-e2e-bereich.js');

const BERICHT = { suites: [
  { file: 'a.spec.js', specs: [{ title: 'grün', ok: true }, { title: 'rot eins', ok: false }],
    suites: [{ specs: [{ title: 'rot verschachtelt', ok: false }] }] },
  { file: 'b.spec.js', specs: [{ title: 'rot zwei', ok: false, file: 'b.spec.js' }] },
] };

test('[E2E·Rot-Namen] die roten Reisen aus dem Bericht, verschachtelt und sortiert', () => {
  assert.deepEqual(E.roteReisenAus(BERICHT), ['a.spec.js › rot eins', 'a.spec.js › rot verschachtelt', 'b.spec.js › rot zwei']);
  assert.deepEqual(E.roteReisenAus(null), []);
});

test('[E2E·Rot-Namen·Start] der JSON-Reporter hängt an der richtigen Stelle; unter CI bleibt alles, wie es war', () => {
  assert.deepEqual(E.mitBericht('npx', ['playwright', 'test', 'x.spec.js', '--workers=1']), ['playwright', 'test', 'x.spec.js', '--workers=1', '--reporter=list,json']);
  assert.deepEqual(E.mitBericht('npm', ['run', 'test:e2e']), ['run', 'test:e2e', '--', '--reporter=list,json']);
  assert.deepEqual(E.mitBericht('npm', ['run', 'test:e2e:cross', '--', '--workers=1']), ['run', 'test:e2e:cross', '--', '--workers=1', '--reporter=list,json']);
  const gesehen = [];
  E.spawnMitBericht('npm', ['run', 'test:e2e'], {}, { env: { CI: 'true' }, innen: (b, a, o) => { gesehen.push([a, o.env]); return { status: 0 }; } });
  assert.deepEqual(gesehen, [[['run', 'test:e2e'], undefined]]);
});

test('[E2E·Rot-Namen·Start] ein echter Kindprozess bekommt die Berichtsdatei und liefert die roten Reisen zurück', () => {
  const kind = "require('fs').writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME, JSON.stringify(" + JSON.stringify(BERICHT) + ")); process.exit(1)";
  const vorher = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('vd-e2e-bericht-')).length;
  const r = E.spawnMitBericht(process.execPath, ['-e', kind], { stdio: 'ignore' }, { env: { ...process.env, CI: '' } });
  assert.equal(r.status, 1);
  assert.deepEqual(r.rot, E.roteReisenAus(BERICHT));
  assert.equal(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('vd-e2e-bericht-')).length, vorher, 'der Bericht-Ordner fällt wieder');
});

/* Alle fünf Läufe, je einmal rot: der Abbruch nennt die roten Reisen. */
function abbruch(roterLauf, rot) {
  const fehler = [];
  const alt = console.error;
  console.error = (t) => fehler.push(String(t));
  try {
    const rc = E.laeufeFahren({ ja: true, grund: 'Probe' }, { ja: true, grund: 'Probe' }, {
      lueckenSpecs: roterLauf === 'npx' ? ['tests/e2e/' + 'x.spec.js'] : [], ohneHaupt: roterLauf === 'npx',
      existiert: () => true, bereit: () => ({ ja: true }), last: () => [0],
      spawn: (c, a) => ((c === 'npx' ? 'npx' : a[1]) === roterLauf ? { status: 1, ...(rot ? { rot } : {}) } : { status: 0 }),
    });
    return { rc, text: fehler.join('\n') };
  } finally { console.error = alt; }
}

test('[E2E·Rot-Namen·Abbruch] jeder der fünf Abbrüche nennt die roten Reisen', () => {
  for (const lauf of ['npx', 'test:e2e', 'test:e2e:cross', 'test:e2e:firefox', 'test:e2e:drei-browser']) {
    const r = abbruch(lauf, ['T-CROSS-13-sub-anlegen.spec.js › legt ein Sub-Depot an']);
    assert.equal(r.rc, 1, lauf);
    assert.match(r.text, /rot: T-CROSS-13-sub-anlegen\.spec\.js › legt ein Sub-Depot an/, lauf + ': ' + r.text);
  }
});

test('[E2E·Rot-Namen·Abbruch·Rot-Beweis] ohne Bericht keine Namenszeile; mehr als die Höchstzahl wird gezählt, nicht verschwiegen', () => {
  assert.doesNotMatch(abbruch('test:e2e:cross', null).text, /rot: /);
  const viele = Array.from({ length: 20 }, (_, i) => 'r.spec.js › Fall ' + i);
  const t = abbruch('test:e2e:cross', viele).text;
  assert.equal((t.match(/rot: /g) || []).length, 15);
  assert.match(t, /… und 5 weitere/);
});
