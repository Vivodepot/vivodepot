'use strict';
/* Findet ein Schwester-Repo (z. B. vivodepot-download-gateway) neben dem Haupt-Repo — auch aus einem
   Arbeitsbaum heraus, dessen Elternordner das Schwester-Repo nicht enthält. Grundlage ist das
   gemeinsame Git-Verzeichnis, das alle Arbeitsbäume teilen: bei einem nackten Hub-Repo liegt es selbst
   im Elternordner, bei einem klassischen Checkout als `.git` im Haupt-Repo. */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..', '..');

function elternAusCommonDir(commonDir) {
  const d = path.resolve(commonDir);
  return path.basename(d) === '.git' ? path.dirname(path.dirname(d)) : path.dirname(d);
}

function _commonDir(repo) {
  return execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
    { encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function schwesterRepoPfad(name, { envName, env = process.env, repo = REPO } = {}) {
  if (envName && env[envName]) return path.resolve(env[envName]);
  let eltern;
  try { eltern = elternAusCommonDir(_commonDir(repo)); } catch (_) { eltern = path.dirname(path.resolve(repo)); }
  return path.join(eltern, name);
}

module.exports = { elternAusCommonDir, schwesterRepoPfad };
