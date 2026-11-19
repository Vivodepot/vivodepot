'use strict';
/* Findet Test- und Werkzeugdateien, die ein EXTERNES Modul (vcard-parser, ical.js, playwright, …)
   laden, und prüft zwei Dinge: das Modul ist DEKLARIERT und INSTALLIERT — und keine Datei
   ÜBERSPRINGT sich, wenn es fehlt. Ein Test, dem sein Fremdparser fehlt, ist ROT, nie grün und nie
   „übersprungen": ein übersprungener Test sieht in der Zusammenfassung aus wie ein bestandener. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');
const { builtinModules } = require('node:module');

const PAKETNAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const EINGEBAUT = new Set(builtinModules.concat(builtinModules.map((m) => 'node:' + m)));

function paketName(spezifizierer) {
  if (spezifizierer.startsWith('@')) return spezifizierer.split('/').slice(0, 2).join('/');
  return spezifizierer.split('/')[0];
}

/* Literale require('x') und import … from 'x' / import('x'); berechnete Argumente sieht die Suche nicht. */
function externeModule(quelltext) {
  const namen = new Set();
  const muster = [/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, /\bfrom\s+['"]([^'"]+)['"]/g, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g];
  for (const re of muster) {
    for (const m of quelltext.matchAll(re)) {
      const s = m[1];
      if (s.startsWith('.') || s.startsWith('/') || EINGEBAUT.has(s)) continue;
      const n = paketName(s);
      if (PAKETNAME.test(n)) namen.add(n);
    }
  }
  return [...namen].sort();
}

/* true, wenn die Datei sich bei fehlendem Modul entzieht: MODULE_NOT_FOUND-Behandlung, das Modul im
   try-Block geladen, oder ein require.resolve, das ein skip steuert. (Ein bedingtes skip in einem
   E2E-Spec ist etwas anderes: es fragt nach einer Umgebung, nicht nach einem Paket.) */
function entziehtSichBeiFehlendemModul(quelltext) {
  const externe = externeModule(quelltext);
  if (!externe.length) return false;
  if (/MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/.test(quelltext)) return true;
  for (const n of externe) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('try\\s*\\{[^}]*require\\(\\s*[\'"]' + esc).test(quelltext)) return true;
  }
  return /skip[\s\S]{0,300}require\.resolve|require\.resolve[\s\S]{0,300}skip/.test(quelltext);
}

function dateien(wurzeln) {
  const aus = [];
  const gehe = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'fixtures') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) gehe(p);
      else if (/\.(js|mjs|cjs)$/.test(e.name)) aus.push(p);
    }
  };
  wurzeln.forEach(gehe);
  return aus;
}

/* DATEIEN IM INDEX (17.11.2026, Wackler-Befund Folge: [Fremdmodul] „keine Datei entzieht sich“ war in der Wagenstufe zweimal rot,
   allein grün). Die Wanderung oben liest den ganzen Arbeitsbaum — auch Zwischendateien, die parallel laufende Proben unter tests/
   oder tools/ kurz anlegen und wieder löschen: verschwindet eine zwischen Auflisten und Lesen, wirft readFileSync, und eine
   Zwischendatei mit eigenem try/require wäre ein Fund, der nie landet. Geprüft wird, was landet: die Dateien im Git-Index
   (`git ls-files -c`, also auch gestagte neue), unter denselben Regeln (node_modules, fixtures, .js/.mjs/.cjs). Ungestagte neue
   Dateien zählen erst mit `git add`, wie in jeder Wagenstufe. Ohne Git (kein Repo) gilt die Wanderung oben.
   Probe: tests/mit-modul/fremdparser-fehlt-wird-rot.test.js [Fremdmodul·Index]. */
function dateienImIndex(repo, wurzeln) {
  let liste;
  try {
    liste = execFileSync('git', ['-C', repo, 'ls-files', '-c', '-z', '--', ...wurzeln.map((w) => path.relative(repo, w) || '.')],
      { encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch (_) { return dateien(wurzeln); }
  return liste.split('\0').filter(Boolean)
    .filter((rel) => /\.(js|mjs|cjs)$/.test(rel) && !rel.split('/').some((t) => t === 'node_modules' || t === 'fixtures'))
    .map((rel) => path.join(repo, rel))
    .filter((p) => fs.existsSync(p));
}

module.exports = { externeModule, entziehtSichBeiFehlendemModul, dateien, dateienImIndex, paketName };
