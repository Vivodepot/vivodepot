#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ci-status-pruefen.js — hat der eigene Runner GENAU diesen Commit grün gemeldet? (Runner-Bau, 02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Vor einem Push auf u2-kanon fragt der pre-push, ob die
   Vorprüfung des eigenen Runners (Job `vorpruefung`, Workflow nur im privaten Repo) für genau die SHA, die landet, erfolgreich war.
   Nach einem Umsetzen ist das eine neue SHA und braucht einen neuen Lauf — gewollt: geprüft wird, was landet.

   ZUNÄCHST NUR MELDEND (--nur-melden): zwei Wochen Parallelbetrieb, die schweren Tore bleiben im pre-push. Das Werkzeug
   meldet dann je Push eine Zeile und endet immer mit 0. Erst wenn es ausdrücklich scharf geschaltet wird, ist es ein
   Tor (ohne --nur-melden: Exit 1, wenn nicht grün).

   Aufruf:
     node tools/ci-status-pruefen.js --nur-melden --refs <datei>        (die pre-push-Zeilen: lokaler Ref, SHA, entfernter Ref, SHA)
     node tools/ci-status-pruefen.js --sha <sha> [--antwort-datei <json>] (Probe: aufgezeichnete check-runs-Antwort)
   Quelle: `gh api repos/<repo>/commits/<sha>/check-runs`. Fehlt gh oder das Netz, ist das UNGEMESSEN, nie grün.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

// Das Repo aus der eigenen origin-Adresse (owner/name), nicht fest im Code: dieselbe Datei läuft in jedem Klon.
function repoAusOrigin() {
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  if (!m) throw new Error('origin ist keine GitHub-Adresse');
  return m[1];
}
const ZIEL_REF = 'refs/heads/u2-kanon';
const PFLICHT = Object.freeze(['vorpruefung']);

/* Das Urteil über eine check-runs-Antwort, ohne Netz. */
function urteil(antwort, sha, pflicht = PFLICHT) {
  const laeufe = (antwort && Array.isArray(antwort.check_runs)) ? antwort.check_runs : null;
  if (!laeufe) return { gruen: false, grund: 'unlesbar', fehlend: [...pflicht], rot: [], falscheSha: [] };
  const fehlend = [], rot = [], falscheSha = [], offen = [];
  for (const name of pflicht) {
    const zuName = laeufe.filter((l) => l.name === name);
    const passend = zuName.filter((l) => l.head_sha === sha);
    if (!passend.length) { (zuName.length ? falscheSha : fehlend).push(name); continue; }
    // Der jüngste Lauf zählt (ein Wiederholungslauf ersetzt einen roten).
    const l = passend.sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')))[0];
    if (l.status !== 'completed') offen.push(name);
    else if (l.conclusion !== 'success') rot.push(name + ' (' + l.conclusion + (l.html_url ? ', ' + l.html_url : '') + ')');
  }
  const gruen = !fehlend.length && !rot.length && !falscheSha.length && !offen.length;
  return { gruen, grund: gruen ? 'gruen' : 'nicht-gruen', fehlend, rot, falscheSha, offen };
}

function antwortHolen(sha, repo = repoAusOrigin()) {
  const text = execFileSync('gh', ['api', 'repos/' + repo + '/commits/' + sha + '/check-runs'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 });
  return JSON.parse(text);
}

function zeile(sha, u) {
  if (u.gruen) return '[ci-status] ' + sha.slice(0, 9) + ': Vorprüfung grün.';
  const teile = [];
  if (u.grund === 'unlesbar') teile.push('Antwort unlesbar');
  if (u.fehlend.length) teile.push('kein Lauf: ' + u.fehlend.join(', '));
  if (u.falscheSha.length) teile.push('nur für eine andere SHA gelaufen: ' + u.falscheSha.join(', '));
  if (u.offen && u.offen.length) teile.push('läuft noch: ' + u.offen.join(', '));
  if (u.rot.length) teile.push('rot: ' + u.rot.join(', '));
  return '[ci-status] ' + sha.slice(0, 9) + ': Vorprüfung NICHT grün — ' + teile.join('; ') + '.';
}

function main(argv = process.argv.slice(2), { holen = antwortHolen, schreiben = (t) => process.stdout.write(t), stdin = () => fs.readFileSync(0, 'utf8') } = {}) {
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const nurMelden = argv.includes('--nur-melden');
  const refsDatei = wert('--refs');
  let shas = [];
  if (wert('--sha')) shas = [wert('--sha')];
  else {
    const refsText = refsDatei ? fs.readFileSync(refsDatei, 'utf8') : stdin();
    for (const z of refsText.split('\n')) {
      const [, lokalSha, fernRef] = z.trim().split(/\s+/);
      if (fernRef === ZIEL_REF && /^[0-9a-f]{40}$/.test(lokalSha || '') && !/^0+$/.test(lokalSha)) shas.push(lokalSha);
    }
  }
  if (!shas.length) return 0;
  let allesGruen = true;
  for (const sha of shas) {
    let u;
    try {
      const antwort = wert('--antwort-datei') ? JSON.parse(fs.readFileSync(wert('--antwort-datei'), 'utf8')) : holen(sha);
      u = urteil(antwort, sha);
      schreiben(zeile(sha, u) + '\n');
    } catch (e) {
      u = { gruen: false };
      schreiben('[ci-status] ' + sha.slice(0, 9) + ': UNGEMESSEN — ' + String(e.message || e).split('\n')[0] + '\n');
    }
    if (!u.gruen) allesGruen = false;
  }
  if (nurMelden) return 0;
  return allesGruen ? 0 : 1;
}

if (require.main === module) process.exitCode = main();
module.exports = { urteil, main, PFLICHT, ZIEL_REF, repoAusOrigin };
