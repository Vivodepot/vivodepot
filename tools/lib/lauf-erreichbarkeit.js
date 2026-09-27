'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   lauf-erreichbarkeit.js — welche Test- und Spec-Dateien erreicht ein Lauf?
   ───────────────────────────────────────────────────────────────────────
   Anlass (19.09.2026): der ganze Ordner tests/e2e-cross lief seit dem 07.08.2026 in keinem Lauf —
   sein einziger Anstoß waren GitHub Actions, und die sind aus. Dass er rot war, sah niemand. Die
   Klasse: eine Testdatei, die existiert und von keinem Lauf angefahren wird, ist keine Probe,
   sondern ein Dokument.

   „LAUF“ heißt hier: das, was vor einem Commit oder Push wirklich fährt.
     · hooks/pre-commit und hooks/pre-push,
     · die Skripte, die diese Hooks aufrufen (`node scripts/….js`, `node tools/….js`) — eine Ebene tief,
     · jedes npm-Skript, das dort (oder in einem erreichten Skript) genannt wird, samt Verschachtelung,
     · `node --test <Dateien/Globs>`, `playwright test [--config …]` und ausdrücklich genannte
       `tests/….js`-Pfade darin.
   Kommentare zählen nicht: wer „npm run x“ nur in Prosa erwähnt, fährt es nicht.

   Alles ist Text, nichts wird ausgeführt: die Funktion liest nur. `lese` ist austauschbar, damit der
   Rot-Beweis dieselbe Erkennung an einer verstümmelten Fassung messen kann.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const KANDIDAT = /\.(?:test|spec)\.m?js$/;
const NUR_IN_KONFORMITAET = /^tests\/konformitaet\/[^/]+\.mjs$/;
const UEBERSPRINGEN = new Set(['node_modules', '.artifacts', 'fixtures']);

function ohneKommentare(text, art) {
  if (art === 'sh') return text.split('\n').filter((z) => !/^\s*#/.test(z)).join('\n');
  return text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((z) => !/^\s*\/\//.test(z)).join('\n');
}

/* Glob → RegExp: `**` über Ordner, `*` innerhalb eines Namens. */
function globZuRegExp(g) {
  let r = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') { r += g[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += g[i + 2] === '/' ? 2 : 1; }
    else if (c === '*') r += '[^/]*';
    else r += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + r + '$');
}

function kandidaten(wurzel) {
  const aus = [];
  (function geh(rel) {
    for (const e of fs.readdirSync(path.join(wurzel, rel), { withFileTypes: true })) {
      const r = rel + '/' + e.name;
      if (e.isDirectory()) { if (!UEBERSPRINGEN.has(e.name)) geh(r); }
      else if (KANDIDAT.test(e.name)) aus.push(r);
      else if (NUR_IN_KONFORMITAET.test(r) && /['"]node:test['"]/.test(fs.readFileSync(path.join(wurzel, r), 'utf8'))) aus.push(r);   // ein Helfer ohne node:test ist keine Probe
    }
  })('tests');
  return aus.sort();
}

/* Die Stellen, an denen ein Text einen Lauf anstößt: npm-Skripte, Pfade/Globs, Playwright-Konfigurationen. */
function anstoesse(text) {
  const skripte = new Set(); const pfade = new Set(); const configs = new Set(); let pwStandard = false;
  if (/\bnpm\s+(?:--silent\s+)?test\b/.test(text)) skripte.add('test');
  for (const m of text.matchAll(/\bnpm\s+run\s+(?:--silent\s+)?([\w:.-]+)/g)) skripte.add(m[1]);
  for (const m of text.matchAll(/['"]run['"]\s*,\s*['"]([\w:.-]+)['"]/g)) skripte.add(m[1]);
  for (const m of text.matchAll(/(?:^|[\s'"=])(tests\/[\w./*-]+\.m?js)\b/g)) pfade.add(m[1]);
  for (const m of text.matchAll(/playwright\s+test\b([^\n&|;]*)/g)) {
    const c = /(?:--config[= ]|-c\s+)([\w./-]+\.js)/.exec(m[1]);
    if (c) configs.add(c[1].replace(/^\.\//, '')); else pwStandard = true;
  }
  if (pwStandard) configs.add('playwright.config.js');
  return { skripte, pfade, configs };
}

function playwrightVerzeichnis(text) {
  const t = /testDir:\s*path\.join\(__dirname,([^)]*)\)/.exec(text);
  if (!t) return null;
  const teile = [...t[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
  const m = /testMatch:\s*['"]([^'"]+)['"]/.exec(text);
  return { dir: teile.join('/'), match: m ? m[1] : '**/*.spec.js' };
}

function erreichbarkeit(opt) {
  const wurzel = (opt && opt.wurzel) || path.join(__dirname, '..', '..');
  const lese = (opt && opt.lese) || ((p) => { try { return fs.readFileSync(path.join(wurzel, p), 'utf8'); } catch (_) { return null; } });
  const dateien = (opt && opt.dateien) || kandidaten(wurzel);
  const pkg = JSON.parse(lese('package.json'));

  const texte = [];
  for (const h of ['hooks/pre-commit', 'hooks/pre-push']) {
    const t = lese(h); if (t) texte.push(ohneKommentare(t, 'sh'));
  }
  // Skripte, die die Hooks aufrufen — eine Ebene tief
  const aufgerufen = new Set();
  for (const t of texte.slice()) for (const m of t.matchAll(/\bnode\s+((?:scripts|tools)\/[\w./-]+\.js)/g)) aufgerufen.add(m[1]);
  for (const s of aufgerufen) { const t = lese(s); if (t) texte.push(ohneKommentare(t, 'js')); }

  const erreichteSkripte = new Set(); const pfade = new Set(); const configs = new Set();
  const aufnehmen = (text) => {
    const a = anstoesse(text);
    a.pfade.forEach((p) => pfade.add(p)); a.configs.forEach((c) => configs.add(c));
    for (const s of a.skripte) if (!erreichteSkripte.has(s) && pkg.scripts && pkg.scripts[s]) { erreichteSkripte.add(s); aufnehmen(pkg.scripts[s]); }
  };
  texte.forEach(aufnehmen);
  // `node --test` ohne Pfad im Skript: die Globs stehen als Zeichenketten im Skript selbst
  for (const s of erreichteSkripte) for (const m of String(pkg.scripts[s]).matchAll(/['"]?((?:tests|tools)\/[\w./*-]+)['"]?/g)) pfade.add(m[1]);

  const muster = [...pfade].map(globZuRegExp);
  const verz = [];
  for (const c of configs) { const t = lese(c); const v = t && playwrightVerzeichnis(t); if (v) verz.push({ dir: v.dir, re: globZuRegExp(v.dir + '/' + v.match) }); }

  const erreicht = []; const nichtErreicht = [];
  for (const d of dateien) {
    (muster.some((re) => re.test(d)) || verz.some((v) => v.re.test(d)) ? erreicht : nichtErreicht).push(d);
  }
  return { dateien, erreicht, nichtErreicht, skripte: [...erreichteSkripte].sort(), configs: [...configs].sort() };
}

/* Ordner-weise Zusammenfassung der Nicht-Erreichten (für Meldung und Grundlinie). */
function nachOrdner(liste) {
  const o = {};
  for (const p of liste) { const k = path.posix.dirname(p); (o[k] = o[k] || []).push(p); }
  return o;
}

module.exports = { erreichbarkeit, nachOrdner, kandidaten, globZuRegExp, anstoesse };
