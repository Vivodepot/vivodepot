'use strict';
/* NUR-HAUPT IM ARBEITSBAUM (27.10.2026). Der Zugkopf fährt den Browser-Hauptlauf selbst, wenn der eigene Prüfrechner kein
   Urteil bringt: `pruefe-e2e-bereich.js --arbeitsbaum` mit VD_E2E_TEIL=nur-haupt. Seit a33b102b4 wies main() genau diese
   Verbindung ab, und der Zugkopf endete rot, ohne dass ein Browser lief. Rot-Beweis: diese Datei gegen
   scripts/pruefe-e2e-bereich.js aus a33b102b4 (dort fehlt teilungLesen, und main() bricht ab). */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../scripts/pruefe-e2e-bereich.js');

test('[E2E·nur-haupt·Arbeitsbaum] --arbeitsbaum mit VD_E2E_TEIL=nur-haupt wird angenommen', () => {
  const t = E.teilungLesen(['node', 'skript', '--arbeitsbaum'], { VD_E2E_TEIL: 'nur-haupt' });
  assert.equal(t.fehler, undefined);
  assert.deepEqual(t, { ohneHaupt: false, nurHaupt: true, arbeitsbaum: true });
  assert.equal(E.teilungLesen(['node', 'skript', '--arbeitsbaum', '--nur-haupt'], {}).nurHaupt, true);
});

test('[E2E·nur-haupt·Arbeitsbaum·Rot-Beweis] Widersprüche und unbekannte Teilungen bleiben Abbruch', () => {
  assert.match(E.teilungLesen(['--arbeitsbaum', '--ohne-haupt'], { VD_E2E_TEIL: 'nur-haupt' }).fehler, /schließen einander aus/);
  assert.match(E.teilungLesen(['--arbeitsbaum'], { VD_E2E_TEIL: 'halb' }).fehler, /unbekannt/);
});

test('[E2E·nur-haupt·Lauf] mit nur-haupt fährt der Lauf genau den Hauptlauf, keine Cross-Reisen, kein Firefox', () => {
  const aufrufe = [];
  const spawn = (befehl, args) => { aufrufe.push([befehl, ...args].join(' ')); return { status: 0, stdout: '', stderr: '' }; };
  const rc = E.laeufeFahren({ ja: true, grund: 'Probe' }, { ja: true, grund: 'Probe' }, {
    nurHaupt: true, spawn, bereit: () => ({ ja: true }), last: () => [0, 0] });
  assert.equal(rc, 0);
  assert.deepEqual(aufrufe, ['npm run test:e2e']);
});

test('[E2E·nur-haupt·main] main() liest die Teilung nur über teilungLesen, ohne eigene Sperre für den Arbeitsbaum', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'scripts', 'pruefe-e2e-bereich.js'), 'utf8');
  const main = src.slice(src.indexOf('function main()'), src.indexOf('\n}\n', src.indexOf('function main()')));
  assert.match(main, /teilungLesen\(process\.argv, process\.env\)/);
  assert.doesNotMatch(main, /gilt nur im pre-push/);
  assert.match(main, /laeufeFahren\(e\.anlass, e\.firefox, \{[^}]*nurHaupt/);
});
