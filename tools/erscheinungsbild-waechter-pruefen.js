#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   erscheinungsbild-waechter-pruefen.js — das Gerüst kennt kein Profil, und was an Gestaltung noch draußen steht,
   wird nur weniger (v894, 02.10.2026, Auflage zur Grenze „Gerüst leer, auch von Designinhalten")
   ───────────────────────────────────────────────────────────────────────────────────────────────
   ZWEI PRÜFUNGEN.

   1. PROFILNAMEN SIND IM GERÜST VERBOTEN — sofort, ohne Grundlinie. Ein Gerüst, das `.profil-leinen` stylt oder
      `if (profil === 'klar')` verzweigt, hat das Profil wieder eingebaut, nur versteckt: dann ist es kein Modul mehr,
      sondern ein Schalter im Kern. Gesucht wird (Kommentare ausgeblendet) in CSS-SELEKTOREN jeder Name als eigenes
      Wort und in SKRIPTEN jeder Profilname als vollständiges Zeichenketten-Literal. Die Namen: die `id` jedes Moduls
      unter tools/erscheinung/*-modul.json und die angekündigten Profile (PROFILE_ANGEKUENDIGT, v898 v899).

   2. GESTALTUNG AUSSERHALB DER REGION — eine Ratsche. Was das Gerüst noch an Gestaltung trägt, ohne dass ein Modul
      es setzt: die modusabhängigen Regeln (`html.dark-mode .x`, `html.high-contrast .x`) und die eingebetteten
      Schriften (`@font-face`). Die Liste in tools/erscheinungsbild-ausserhalb-grundlinie.json darf nur SINKEN
      (`--grundlinie-schreiben` streicht, nimmt nie auf) und ist ab dem Stand `leerBis` (v899) leer; trägt der Kern
      dann noch eine Zeile, ist das rot. Wer zieht: v896 die Schriften, v898 die Modus-Regeln (v899).

     node tools/erscheinungsbild-waechter-pruefen.js                       Bericht
     node tools/erscheinungsbild-waechter-pruefen.js --gate                Exit 1 bei jedem Fund
     node tools/erscheinungsbild-waechter-pruefen.js --grundlinie-schreiben   nur senken
     node tools/erscheinungsbild-waechter-pruefen.js --dokument <pfad>     ein anderer Kern (Proben)
   Probe: tests/erscheinungsbild-waechter.test.js
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const GRUNDLINIE = path.join(REPO, 'tools', 'erscheinungsbild-ausserhalb-grundlinie.json');
const MODUL_ORDNER = path.join(REPO, 'tools', 'erscheinung');
const PROFILE_ANGEKUENDIGT = Object.freeze(['leinen', 'klar', 'warm']);

const _ohneBlockKommentare = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, ' '));

function profilNamen({ ordner = MODUL_ORDNER } = {}) {
  const namen = new Set(PROFILE_ANGEKUENDIGT);
  if (fs.existsSync(ordner)) {
    for (const d of fs.readdirSync(ordner).filter((n) => n.endsWith('-modul.json'))) {
      const id = JSON.parse(fs.readFileSync(path.join(ordner, d), 'utf8')).id;
      if (typeof id === 'string' && id) namen.add(id.toLowerCase());
    }
  }
  return [...namen].sort();
}

function _stilText(html, { ohneSchutz = false } = {}) {
  // Nur echte Elemente am Zeilenanfang (ein „<style" in einem Kommentar ist keins); das Schutz-CSS (style-Element schutz-stil)
  // ist die eine erlaubte Gestaltung im Gerüst und zählt für die Ratsche nicht mit.
  return [...html.matchAll(/^<style([^>]*)>([\s\S]*?)<\/style>/gm)]
    .filter((m) => !(ohneSchutz && /id="schutz-stil"/.test(m[1]))).map((m) => _ohneBlockKommentare(m[2])).join('\n');
}
/* Die Selektoren eines Stylesheets, linear: der Text vor jedem `{` seit der letzten Klammer. (Ein Regex `([^{}]+)\{` läuft
   über die Base64-Schriften quadratisch — gemessen 10 s je Aufruf.) */
function _selektoren(stil) {
  const raus = [];
  let start = 0;
  for (let i = 0; i < stil.length; i++) {
    const c = stil[i];
    if (c === '{') { raus.push(stil.slice(start, i).trim().replace(/\s+/g, ' ')); start = i + 1; }
    else if (c === '}') start = i + 1;
  }
  return raus;
}
function _skriptText(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => _ohneBlockKommentare(m[1]).replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1')).join('\n');
}

function profilNamenFunde(html, namen) {
  const funde = [];
  const selektoren = _selektoren(_stilText(html));
  for (const sel of selektoren) {
    for (const n of namen) if (new RegExp('(^|[^a-z0-9_])' + n + '([^a-z0-9_]|$)', 'i').test(sel)) funde.push({ wo: 'selektor', name: n, stelle: sel.slice(0, 120) });
  }
  const skript = _skriptText(html);
  for (const n of namen) {
    const re = new RegExp('([\'"`])' + n + '\\1', 'gi');
    let m;
    while ((m = re.exec(skript))) funde.push({ wo: 'skript', name: n, stelle: skript.slice(Math.max(0, m.index - 40), m.index + n.length + 2).replace(/\s+/g, ' ') });
  }
  return funde;
}

function gestaltungAusserhalb(html) {
  const stil = _stilText(html, { ohneSchutz: true });
  const stellen = _selektoren(stil)
    .filter((s) => /html\.(dark-mode|high-contrast)\b/.test(s) && !/^html\.(dark-mode|high-contrast)$/.test(s))
    .map((s) => 'modus: ' + s);
  const schriften = (stil.match(/@font-face\s*\{[^}]*font-weight:\s*(\d+)/g) || []).map((s) => 'schrift: @font-face ' + /font-weight:\s*(\d+)/.exec(s)[1]);
  // Die Inter-Schrift des PDFs (Base64, Region PDF-INTER-B64) ist ebenfalls Designinhalt im Gerüst (Entscheidung vom 02.10.2026); sie zieht in v896 ins Modul.
  if (html.includes('PDF-INTER-B64:BEGIN')) schriften.push('schrift: PDF-INTER-B64');
  return [...stellen, ...schriften];
}

function schalenStand(html) {
  const m = /const SCHALEN_STAND = 'v(\d+)'/.exec(html);
  return m ? Number(m[1]) : null;
}

function pruefen({ html = fs.readFileSync(KERN, 'utf8'), grundlinie = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')), namen = profilNamen() } = {}) {
  const fehler = [];
  for (const f of profilNamenFunde(html, namen)) fehler.push('Profilname „' + f.name + '" im Gerüst (' + f.wo + '): ' + f.stelle);
  const ist = gestaltungAusserhalb(html);
  const erlaubt = new Set(grundlinie.stellen);
  for (const s of ist) if (!erlaubt.has(s)) fehler.push('neue Gestaltung außerhalb der Region (nicht in der Positivliste): ' + s);
  const stand = schalenStand(html);
  const leerAb = Number(String(grundlinie.leerBis).replace(/^v/, ''));
  if (stand !== null && stand >= leerAb && ist.length) fehler.push('Stand v' + stand + ' ≥ ' + grundlinie.leerBis + ', aber ' + ist.length + ' Stelle(n) stehen noch außerhalb der Region.');
  const verschwunden = grundlinie.stellen.filter((s) => !ist.includes(s));
  return { fehler, ist, verschwunden, stand };
}

function main(argv) {
  const dok = argv.includes('--dokument') ? argv[argv.indexOf('--dokument') + 1] : null;
  const html = fs.readFileSync(dok ? path.resolve(dok) : KERN, 'utf8');
  const grundlinie = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const e = pruefen({ html, grundlinie });
  if (argv.includes('--grundlinie-schreiben')) {
    if (e.fehler.length) { console.error('[erscheinungsbild-waechter] nicht geschrieben — erst die Funde beheben:\n  ' + e.fehler.join('\n  ')); return 1; }
    grundlinie.stellen = grundlinie.stellen.filter((s) => e.ist.includes(s));
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(grundlinie, null, 2) + '\n');
    console.log('[erscheinungsbild-waechter] Grundlinie gesenkt um ' + e.verschwunden.length + ' auf ' + grundlinie.stellen.length + '.');
    return 0;
  }
  console.log('[erscheinungsbild-waechter] ' + e.ist.length + ' Stelle(n) Gestaltung außerhalb der Region (leer ab ' + grundlinie.leerBis + '), '
    + e.fehler.length + ' Fund(e).');
  for (const f of e.fehler) console.log('  ✗ ' + f);
  if (e.verschwunden.length) console.log('  gesunken um ' + e.verschwunden.length + ' — Grundlinie nachziehen: --grundlinie-schreiben');
  return argv.includes('--gate') && (e.fehler.length || e.verschwunden.length) ? 1 : 0;
}

module.exports = { profilNamen, profilNamenFunde, gestaltungAusserhalb, schalenStand, pruefen, PROFILE_ANGEKUENDIGT, GRUNDLINIE };

if (require.main === module) process.exit(main(process.argv.slice(2)));
