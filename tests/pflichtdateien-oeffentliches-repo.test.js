'use strict';
/* ═════════════════════════════════════════════════════════════════
   Pflichtdateien des öffentlichen Repos (tools/lib/pflichtdateien-oeffentliches-repo.js) — dass sie DA sind.

   Die Liste diente bis zum 01.10.2026 nur der Einordnung im Zuschnitt; ob jede Pflichtdatei wirklich im Bestand steht und
   hinausgeht, prüfte nichts. Mit `.gitlab-ci.yml` (openCoDE-Badges: ohne die Datei läuft dort keine Pipeline) kam die
   Probe dazu:
     1 · jede Pflichtdatei steht im Wurzelverzeichnis (von LICENSE/LICENSE.md genügt eine),
     2 · jede geht beim Zuschnitt hinaus — das hält die Probe der Positivliste, die mit der Liste drinnen bleibt,
     3 · `.gitlab-ci.yml` prüft publiccode.yml mit DERSELBEN Parser-Fassung wie der GitHub-Workflow und fährt die Tests.
   Rot-Beweise: ein Bestand ohne `.gitlab-ci.yml`, ohne beide Lizenz-Schreibweisen, und eine abweichende Parser-Fassung.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { KONVENTION_PFLICHT, EINE_VON, pflichtdateienFehlend } = require('../tools/lib/pflichtdateien-oeffentliches-repo.js');

const REPO = path.join(__dirname, '..');
const wurzel = () => fs.readdirSync(REPO, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);

const parserFassung = (text) => {
  const m = /publiccode-parser-go\/v5\/publiccode-parser@(v[\d.]+)/.exec(text);
  return m ? m[1] : null;
};

test('[Pflichtdateien] jede steht im Wurzelverzeichnis', () => {
  assert.ok(KONVENTION_PFLICHT.includes('.gitlab-ci.yml'), 'Vorbedingung: die CI-Datei ist Pflicht');
  assert.deepEqual(pflichtdateienFehlend(wurzel()), []);
});

test('[Pflichtdateien·.gitlab-ci.yml] dieselbe Parser-Fassung wie auf GitHub, und die Tests laufen', () => {
  const gitlab = fs.readFileSync(path.join(REPO, '.gitlab-ci.yml'), 'utf8');
  const github = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'publiccode-pruefen.yml'), 'utf8');
  assert.ok(parserFassung(github), 'Vorbedingung: der GitHub-Workflow nennt eine Fassung');
  assert.equal(parserFassung(gitlab), parserFassung(github));
  assert.match(gitlab, /publiccode-parser publiccode\.yml/);
  assert.match(gitlab, /^\s*- npm ci$/m);
  assert.match(gitlab, /^\s*- npm test$/m);
});

const DEVGUARD = (text) => ({
  komponente: /component: \$CI_SERVER_FQDN\/l3montree\/devguard-ci-components\/software-composition-analysis@v\d+\.\d+\.\d+\b/.test(text),
  asset: /devguard_asset_name: "\$DEVGUARD_ASSET_NAME"/.test(text),
  token: /devguard_token: "\$DEVGUARD_TOKEN"/.test(text),
  api: /devguard_api_url: "\$DEVGUARD_API_URL"/.test(text),
});

test('[Pflichtdateien·.gitlab-ci.yml] DevGuard scannt mit fester Komponenten-Fassung, alle Zugangswerte kommen aus den Variablen des Auto-Setups', () => {
  const gitlab = fs.readFileSync(path.join(REPO, '.gitlab-ci.yml'), 'utf8');
  assert.deepEqual(DEVGUARD(gitlab), { komponente: true, asset: true, token: true, api: true });
  assert.equal(/devguard_(?:token|asset_name|api_url): "(?!\$)/.test(gitlab), false, 'kein eingetragener Wert');
});

test('[Pflichtdateien·Rot-Beweis] eine wandernde Fassung oder ein eingetragener Wert fällt auf', () => {
  const gitlab = fs.readFileSync(path.join(REPO, '.gitlab-ci.yml'), 'utf8');
  assert.equal(DEVGUARD(gitlab.replace(/software-composition-analysis@v[\d.]+/, 'software-composition-analysis@main')).komponente, false);
  assert.equal(DEVGUARD(gitlab.replace('"$DEVGUARD_TOKEN"', '"geheim"')).token, false);
  assert.equal(DEVGUARD(gitlab.replace('"$DEVGUARD_ASSET_NAME"', '"@opencode/projects/x/assets/y"')).asset, false);
});

test('[Pflichtdateien·Rot-Beweis] fehlt die CI-Datei oder jede Lizenz-Schreibweise, wird es gemeldet', () => {
  const ohneCi = wurzel().filter((f) => f !== '.gitlab-ci.yml');
  assert.deepEqual(pflichtdateienFehlend(ohneCi), ['.gitlab-ci.yml']);
  const ohneLizenz = wurzel().filter((f) => !EINE_VON[0].includes(f));
  assert.deepEqual(pflichtdateienFehlend(ohneLizenz), ['LICENSE | LICENSE.md']);
  assert.deepEqual(pflichtdateienFehlend(wurzel().filter((f) => f !== 'LICENSE.md')), [], 'eine Schreibweise genügt');
});

test('[Pflichtdateien·Rot-Beweis] eine abweichende Parser-Fassung fällt auf', () => {
  const gitlab = fs.readFileSync(path.join(REPO, '.gitlab-ci.yml'), 'utf8');
  const geaendert = gitlab.replace(/publiccode-parser@v[\d.]+/, 'publiccode-parser@v0.0.1');
  assert.notEqual(parserFassung(geaendert), parserFassung(fs.readFileSync(path.join(REPO, '.github', 'workflows', 'publiccode-pruefen.yml'), 'utf8')));
});
