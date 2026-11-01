'use strict';
/* Der Tag, gegen den eine Probe mit Frist oder Nachbarrepo-Stand misst (01.11.2026, öffentlicher Lauf v956).
   Proben, die gegen `new Date()` oder gegen den heutigen Stand eines Nachbarrepos messen, prüfen einen eingefrorenen Stand
   gegen heute. Am Quell-Stand v956 (28.10.) fielen so ein reiner CHANGELOG-Commit und der öffentliche Lauf am 01.11. —
   nicht am Inhalt, sondern am Kalender. Ein ausgelieferter Stand wird gegen den Tag seiner Auslieferung gemessen:

     öffentlich (ohne Befund-Ratsche)   → `releaseDate` aus publiccode.yml (setzt der Zuschnitt-Bau aus der Auslieferung)
     VD_QUELL_FASSUNG=v<n> im Umfeld   → das Datum der Zeile v<n> in der Stand-Doku der Auslieferungen, nur wenn der Kern die Schale
                                         v<n> trägt und der Kanon-Kopf (origin/u2-kanon) KEIN Vorfahr von HEAD ist
     sonst                              → heute

   Der Schalter verschiebt den Tag nie frei: er nennt eine ausgelieferte Fassung, deren Datum im Repo steht, und gilt nur für
   einen Stand neben dem Kanon. Auf dem Kanon und in jedem Wagen, der auf ihm steht, misst die Probe gegen heute; ein falscher
   Schalter hält an, statt still auf heute zu fallen. Probe: tests/bezugsdatum.test.js */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { istOeffentlich } = require('./nur-privat.js');

const REPO = path.join(__dirname, '..', '..');
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const STAND_DOKU = ['auslieferung', 'stand.md'].join('-');   // bleibt drinnen; öffentlich gilt releaseDate

function gitStandard(repo, args) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env });
  return { status: r.status, out: (r.stdout || '').trim() };
}

function releaseDateVon(repo) {
  const datei = path.join(repo, 'publiccode.yml');
  if (!fs.existsSync(datei)) return null;
  const m = fs.readFileSync(datei, 'utf8').match(/^releaseDate:\s*"?(\d{4}-\d{2}-\d{2})"?/m);
  return m ? m[1] : null;
}

function schaleVon(repo) {
  const m = fs.readFileSync(path.join(repo, 'vivodepot.html'), 'utf8').match(/SCHALEN_STAND = '(v\d+)'/);
  return m ? m[1] : null;
}

function auslieferungsdatum(repo, fassung) {
  const zeile = fs.readFileSync(path.join(repo, 'docs', STAND_DOKU), 'utf8')
    .split('\n').find((z) => z.startsWith('| ' + fassung + ' |'));
  const m = zeile && zeile.match(/\|\s*(\d{4}-\d{2}-\d{2})T/);
  return m ? m[1] : null;
}

/* → { datum, grund }. Wirft, wenn VD_QUELL_FASSUNG gesetzt ist und nicht trägt. */
function bezugsdatum({ repo = REPO, env = process.env, jetzt = new Date(), git = gitStandard } = {}) {
  const heute = jetzt.toISOString().slice(0, 10);
  if (istOeffentlich(repo)) {
    const d = releaseDateVon(repo);
    return d ? { datum: d, grund: 'öffentlicher Stand, releaseDate ' + d } : { datum: heute, grund: 'öffentlich ohne releaseDate, heute' };
  }
  const fassung = env.VD_QUELL_FASSUNG;
  if (!fassung) return { datum: heute, grund: 'heute' };
  if (!/^v\d+$/.test(fassung)) throw new Error('VD_QUELL_FASSUNG=' + fassung + ' ist keine Fassung der Form v<n>');
  const schale = schaleVon(repo);
  if (schale !== fassung) throw new Error('VD_QUELL_FASSUNG=' + fassung + ', der Kern trägt aber die Schale ' + schale);
  const kanon = git(repo, ['rev-parse', '--verify', '-q', 'origin/u2-kanon^{commit}']);
  if (kanon.status !== 0 || !kanon.out) throw new Error('VD_QUELL_FASSUNG gesetzt, aber origin/u2-kanon ist hier nicht auflösbar');
  if (git(repo, ['merge-base', '--is-ancestor', kanon.out, 'HEAD']).status === 0) {
    throw new Error('VD_QUELL_FASSUNG gilt nur neben dem Kanon; HEAD trägt den Kanon-Kopf ' + kanon.out.slice(0, 9));
  }
  const d = auslieferungsdatum(repo, fassung);
  if (!d || !DATUM.test(d)) throw new Error('VD_QUELL_FASSUNG=' + fassung + ' hat keine Zeile mit Datum in der Stand-Doku der Auslieferungen');
  return { datum: d, grund: 'Quell-Stand ' + fassung + ', ausgeliefert ' + d };
}

module.exports = { bezugsdatum, releaseDateVon, auslieferungsdatum, STAND_DOKU };
