'use strict';
/* Der Bezugstag für Proben mit Frist oder Nachbarrepo-Stand (tests/helfer/bezugsdatum.js, 01.11.2026). Rot-Beweis zum
   öffentlichen Lauf v956: am Quell-Stand v956 (ausgeliefert 28.10.) maß [Fristen·Bestand] am 01.11. gegen heute und fiel.
   Gegenproben: auf dem Kanon bleibt es heute; ein Schalter, der nicht trägt, hält an. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { bezugsdatum, STAND_DOKU } = require('./helfer/bezugsdatum.js');
const { MARKE } = require('./helfer/nur-privat.js');

const JETZT = new Date('2026-11-01T15:00:00Z');
const ANGELEGT = [];
after(() => { for (const d of ANGELEGT) fs.rmSync(d, { recursive: true, force: true }); });

function stand({ ratsche = true, schale = 'v956', release = '2026-10-28', zeile = '| v956 | 2026-10-28T13:16:18.796Z | abc |' } = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bezugsdatum-'));
  ANGELEGT.push(repo);
  fs.mkdirSync(path.join(repo, 'tools'));
  fs.mkdirSync(path.join(repo, 'docs'));
  if (ratsche) fs.writeFileSync(path.join(repo, MARKE), '{}');
  fs.writeFileSync(path.join(repo, 'vivodepot.html'), "const SCHALEN_STAND = '" + schale + "';\n");
  fs.writeFileSync(path.join(repo, 'publiccode.yml'), 'releaseDate: "' + release + '"\n');
  fs.writeFileSync(path.join(repo, 'docs', STAND_DOKU), '| Fassung | Zeit |\n' + zeile + '\n');
  return repo;
}
// git als Werkzeug: kanonVorfahr sagt, ob der Kanon-Kopf Vorfahr von HEAD ist.
const gitMit = (kanonVorfahr) => (repo, args) => (args[0] === 'rev-parse'
  ? { status: 0, out: 'a'.repeat(40) }
  : { status: kanonVorfahr ? 0 : 1, out: '' });

test('[Bezugsdatum·Rot-Beweis] Quell-Stand v956 neben dem Kanon misst gegen den Tag der Auslieferung, nicht gegen heute', () => {
  const r = bezugsdatum({ repo: stand(), env: { VD_QUELL_FASSUNG: 'v956' }, jetzt: JETZT, git: gitMit(false) });
  assert.equal(r.datum, '2026-10-28');
  assert.match(r.grund, /Quell-Stand v956/);
  // ohne Schalter derselbe Stand: heute — so fiel der CHANGELOG-Commit am 01.11.
  assert.equal(bezugsdatum({ repo: stand(), env: {}, jetzt: JETZT, git: gitMit(false) }).datum, '2026-11-01');
});

test('[Bezugsdatum·öffentlich] ein öffentlicher Stand misst gegen sein releaseDate', () => {
  assert.equal(bezugsdatum({ repo: stand({ ratsche: false }), env: {}, jetzt: JETZT }).datum, '2026-10-28');
  assert.equal(bezugsdatum({ repo: stand({ ratsche: false, release: 'x' }), env: {}, jetzt: JETZT }).datum, '2026-11-01',
    'ohne lesbares releaseDate: heute');
});

test('[Bezugsdatum·Gegenprobe] auf dem Kanon und mit falschem Schalter keine Verschiebung', () => {
  assert.throws(() => bezugsdatum({ repo: stand(), env: { VD_QUELL_FASSUNG: 'v956' }, jetzt: JETZT, git: gitMit(true) }),
    /nur neben dem Kanon/, 'HEAD trägt den Kanon-Kopf: der Schalter hält an');
  assert.throws(() => bezugsdatum({ repo: stand({ schale: 'v1007' }), env: { VD_QUELL_FASSUNG: 'v956' }, jetzt: JETZT, git: gitMit(false) }),
    /Schale v1007/);
  assert.throws(() => bezugsdatum({ repo: stand({ zeile: '| v955 | 2026-10-27T00:00:00Z |' }), env: { VD_QUELL_FASSUNG: 'v956' }, jetzt: JETZT, git: gitMit(false) }),
    /keine Zeile/);
  assert.throws(() => bezugsdatum({ repo: stand(), env: { VD_QUELL_FASSUNG: '2026-10-28' }, jetzt: JETZT, git: gitMit(false) }),
    /keine Fassung/, 'ein Datum statt einer Fassung wird nicht angenommen');
});

