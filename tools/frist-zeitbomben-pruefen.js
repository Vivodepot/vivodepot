#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zeitbomben in Proben und Werkzeugen (03.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Eine Zeitbombe ist ein festes Kalenderdatum, das in derselben Zeile mit der
   aktuellen Zeit verglichen wird (`new Date() >= new Date('2026-11-03…')`,
   `Date.now() < Date.parse(FRIST)`). Solange das Datum in der Zukunft liegt,
   ist die Probe grün; am Stichtag kippt sie, ohne dass jemand etwas geändert
   hat, und jeder Commit danach ist rot. Vorfall: eine Förderfrist in einer
   Probe hielt am 03.11.2026 ab 00:00 UTC jeden Commit an.

   Dieses Werkzeug findet jede solche Stelle unter tests/, tools/, hooks/ und
   scripts/ (getrackte .js/.cjs/.mjs, ohne fixtures/) und urteilt gegen die
   Grundlinie tools/frist-zeitbomben-grundlinie.json:
     • eine künftige Frist (Datum ≥ heute), die nicht in der Grundlinie steht,
       ist rot — sie braucht einen Eintrag mit Datei, Datum, Eigentümer und Grund (je Eintrag ein Wort);
     • eine Frist der Grundlinie, die in höchstens VORLAUF_TAGE Tagen abläuft,
       ist rot — Zeit zum Verschieben oder Streichen, bevor sie kippt;
     • ein Grundlinien-Eintrag ohne Fund oder mit abgelaufenem Datum ist rot,
       bis er gestrichen ist (die Liste sinkt).
   Die drei Tage Vorlauf stehen fest hier (VORLAUF_TAGE), nicht in der Grundlinie.
   Ein Datum in der Vergangenheit ist keine Zeitbombe mehr: der Vergleich kippt
   nicht noch einmal. Ein festes Datum OHNE aktuelle Zeit in derselben Zeile ist
   eine feste Uhr und kein Gegenstand; ebenso eine Liste fester Uhren ohne Vergleich.

   ERKANNT werden in einer Zeile mit `Date.now()`, `new Date()` oder `Date()` UND einem Vergleich (<, >, <=, >=):
   Datumsliterale 'JJJJ-MM-TT[…]', `new Date(JJJJ, M, T)` und `Date.UTC(JJJJ, M, T)`
   (Monat ab 0), und Konstanten derselben Datei, denen eines davon zugewiesen ist.
   NICHT erkannt: ein Vergleich über mehrere Zeilen oder über eine andere Datei.

   Aufruf: node tools/frist-zeitbomben-pruefen.js [--repo <pfad>] [--heute JJJJ-MM-TT] [--liste]
   Ohne --repo prüft es dieses Repo; --liste druckt jede gefundene künftige Frist.
   Exit 0 grün, 1 rot, 2 Aufruffehler.
   Probe: tests/frist-zeitbomben-pruefen.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const VORLAUF_TAGE = 3;
const GRUNDLINIE = 'tools/frist-zeitbomben-grundlinie.json';
const ORDNER = ['tests', 'tools', 'hooks', 'scripts'];
const JETZT = /Date\.now\(\s*\)|new Date\(\s*\)|(?<![\w$.])Date\(\s*\)/;
const VERGLEICH = /(?<![=<>!-])[<>]=?(?![=>])/;      // <, >, <=, >= — kein =>, kein ->, kein <<
const LITERAL = /(["'`])(20\d\d-[01]\d-[0-3]\d)(?:[T ][\d:.]+Z?)?\1/g;
const ZAHLEN = /(?:new Date|Date\.UTC)\(\s*(20\d\d)\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*[,)]/g;
const KONSTANTE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:new Date\(\s*|Date\.parse\(\s*)?(["'`])(20\d\d-[01]\d-[0-3]\d)[^"'`\n]*\2/g;

function zweistellig(n) { return String(n).padStart(2, '0'); }
function gueltig(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/* Alle Zeitbomben-Stellen einer Datei, gleich ob künftig oder vergangen. */
function stellenInText(text) {
  const aus = [];
  const konst = new Map();
  for (const m of text.matchAll(KONSTANTE)) if (gueltig(m[3])) konst.set(m[1], m[3]);
  text.split('\n').forEach((zeile, i) => {
    if (!JETZT.test(zeile) || !VERGLEICH.test(zeile)) return;
    const daten = new Set();
    for (const m of zeile.matchAll(LITERAL)) daten.add(m[2]);
    for (const m of zeile.matchAll(ZAHLEN)) daten.add(m[1] + '-' + zweistellig(Number(m[2]) + 1) + '-' + zweistellig(m[3]));
    for (const [name, datum] of konst) {
      if (new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])').test(zeile)) daten.add(datum);
    }
    for (const datum of daten) if (gueltig(datum)) aus.push({ zeile: i + 1, datum });
  });
  return aus;
}

function dateienLesen(repo) {
  return execFileSync('git', ['ls-files', '-z', '--', ...ORDNER], { cwd: repo, env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8').split('\0').filter(Boolean)
    .filter((d) => /\.(c?js|mjs)$/.test(d) && !d.split('/').includes('fixtures') && !d.split('/').includes('node_modules'));
}

/* Künftige Fristen (Datum ≥ heute) je Datei und Datum. */
function fristenFinden(dateien, lesen, heute) {
  const aus = [];
  for (const d of dateien) {
    let text;
    try { text = lesen(d); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
    for (const s of stellenInText(text)) if (s.datum >= heute) aus.push({ datei: d, zeile: s.zeile, datum: s.datum });
  }
  return aus.sort((a, b) => a.datum.localeCompare(b.datum) || a.datei.localeCompare(b.datei) || a.zeile - b.zeile);
}

function tageBis(datum, heute) {
  return Math.round((Date.parse(datum + 'T00:00:00Z') - Date.parse(heute + 'T00:00:00Z')) / 86400000);
}

function urteil(fristen, grundlinie, heute) {
  const fehler = [];
  const eintraege = (grundlinie && Array.isArray(grundlinie.eintraege)) ? grundlinie.eintraege : [];
  const bekannt = new Map(eintraege.map((e) => [e.datei + ' ' + e.datum, e]));
  const gefunden = new Set();
  for (const f of fristen) {
    const k = f.datei + ' ' + f.datum;
    gefunden.add(k);
    const tage = tageBis(f.datum, heute);
    if (!bekannt.has(k)) fehler.push(`neue Frist ohne Grundlinie: ${f.datei}:${f.zeile} ${f.datum} (in ${tage} Tagen)`);
    else if (tage <= VORLAUF_TAGE) fehler.push(`Frist läuft ab: ${f.datei}:${f.zeile} ${f.datum} in ${tage} Tagen — verschieben oder streichen`);
  }
  for (const e of eintraege) {
    if (typeof e.grund !== 'string' || e.grund.length < 20) fehler.push(`Grund fehlt: ${e.datei} ${e.datum}`);
    if (typeof e.eigentuemer !== 'string' || !e.eigentuemer.trim()) fehler.push(`Eigentümer fehlt: ${e.datei} ${e.datum}`);
    if (!gefunden.has(e.datei + ' ' + e.datum)) fehler.push(`Grundlinie senken: ${e.datei} ${e.datum} wird nicht mehr gefunden oder ist abgelaufen`);
  }
  return fehler;
}

function pruefen({ repo, heute = new Date().toISOString().slice(0, 10) } = {}) {
  const wurzel = repo || path.join(__dirname, '..');
  const lesen = (d) => fs.readFileSync(path.join(wurzel, d), 'utf8');
  const grundlinie = JSON.parse(lesen(GRUNDLINIE));
  const fristen = fristenFinden(dateienLesen(wurzel), lesen, heute);
  return { fristen, fehler: urteil(fristen, grundlinie, heute) };
}

module.exports = { VORLAUF_TAGE, GRUNDLINIE, stellenInText, fristenFinden, urteil, tageBis, pruefen };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const heute = wert('--heute');
  if (heute !== undefined && !gueltig(heute)) { console.error('[frist-zeitbomben] --heute braucht JJJJ-MM-TT'); process.exit(2); }
  const { fristen, fehler } = pruefen({ repo: wert('--repo') && path.resolve(wert('--repo')), heute });
  if (argv.includes('--liste')) for (const f of fristen) console.log(`${f.datum}  ${f.datei}:${f.zeile}`);
  if (fehler.length) { for (const f of fehler) console.error('[frist-zeitbomben] ✗ ' + f); process.exit(1); }
  console.log(`[frist-zeitbomben] grün — ${fristen.length} künftige Frist(en), keine in den nächsten ${VORLAUF_TAGE} Tagen, alle in der Grundlinie.`);
}
