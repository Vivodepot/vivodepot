'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   node_modules gegen package-lock.json — EINE Prüffunktion (27.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund NODE-MODULES-LOCKFILE (MITTEL): mit ajv 8.20.0 (12ae91b70) kam eine neue
   devDependency. Jeder Arbeitsbaum, dessen node_modules per Symlink auf einen fremden Bestand
   zeigte, hatte kein ajv — seine Suite fiel an sechzehn Folgefehlern („Cannot find module
   'ajv/dist/2020'“), statt einmal zu sagen, was fehlt und wie man es behebt.

   Geprüft wird JEDES Paket aus package-lock.json (`packages`, lockfileVersion 3): Name und
   Version gegen das Installierte (`<pfad>/package.json`). Ein optionales Paket, das auf
   dieser Plattform nicht installiert ist (`optional: true`, z. B. fsevents), fehlt zu Recht.
   Ist node_modules ein Symlink, nennt das Ergebnis das Ziel — das ist der häufigste Grund.

   Nutzer: tools/lib/node-modules-preload.js (vor jedem `npm test`), tools/landung-vorbereiten.js,
   tools/arbeitsbaum-einsatzbereit-machen.js. Probe: tests/node-modules-lockfile.test.js. */
const fs = require('node:fs');
const path = require('node:path');

const ABHILFE = 'node tools/arbeitsbaum-einsatzbereit-machen.js (npm ci im eigenen Arbeitsbaum)';

function symlinkZiel(nodeModulesPfad) {
  try {
    if (!fs.lstatSync(nodeModulesPfad).isSymbolicLink()) return null;
    return fs.realpathSync(nodeModulesPfad);
  } catch (_) { return null; }
}

function pruefen(repo) {
  const nodeModulesPfad = path.join(repo, 'node_modules');
  const ziel = symlinkZiel(nodeModulesPfad);
  let lock;
  try { lock = JSON.parse(fs.readFileSync(path.join(repo, 'package-lock.json'), 'utf8')); } catch (e) {
    return { ok: false, symlinkZiel: ziel, fehlend: [], falscheVersion: [], grund: 'package-lock.json nicht lesbar: ' + e.message };
  }
  if (!fs.existsSync(nodeModulesPfad)) {
    return { ok: false, symlinkZiel: ziel, fehlend: [], falscheVersion: [], grund: 'node_modules fehlt unter ' + nodeModulesPfad };
  }
  const fehlend = [];
  const falscheVersion = [];
  let geprueft = 0;
  for (const [schluessel, eintrag] of Object.entries(lock.packages || {})) {
    if (!schluessel || !schluessel.startsWith('node_modules/') || eintrag.link) continue;
    const name = schluessel.slice(schluessel.lastIndexOf('node_modules/') + 'node_modules/'.length);
    let installiert = null;
    try { installiert = JSON.parse(fs.readFileSync(path.join(repo, schluessel, 'package.json'), 'utf8')).version; } catch (_) { installiert = null; }
    if (installiert == null) {
      if (!eintrag.optional) fehlend.push(name + '@' + eintrag.version);
      continue;
    }
    geprueft++;
    if (eintrag.version && installiert !== eintrag.version) falscheVersion.push(name + ' ' + installiert + ' statt ' + eintrag.version);
  }
  const ok = !fehlend.length && !falscheVersion.length;
  return { ok, geprueft, symlinkZiel: ziel, fehlend, falscheVersion, grund: ok ? null : meldung({ fehlend, falscheVersion, symlinkZiel: ziel }) };
}

function meldung({ fehlend, falscheVersion, symlinkZiel: ziel }) {
  const teile = [];
  if (fehlend.length) teile.push('fehlt ' + fehlend.join(', '));
  if (falscheVersion.length) teile.push('falsche Version: ' + falscheVersion.join(', '));
  return 'node_modules erfüllt package-lock.json nicht: ' + teile.join('; ') + '.'
    + (ziel ? ' node_modules ist ein Symlink auf ' + ziel + ' — ein fremder Bestand, der den Lockfile dieses Baums nicht kennt.' : '')
    + ' Abhilfe: ' + ABHILFE + '.';
}

module.exports = { pruefen, meldung, symlinkZiel, ABHILFE };
