#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   serifen-pruefen.js — keine Serifenschrift in Kern, Studio, Nebenanwendungen und Ausdrucken (03.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Produktentscheidung 03.10.2026, zur Vorschau Gestalt A: keine Serifenschrift.
   Fläche: alle *.html im Wurzelordner, CSS und JSON unter tools/erscheinung und HTML, CSS, JS unter share (die einzige ausgelieferte
   Seite außerhalb des Wurzelordners). Erweitert 05.10.2026 um Attribut, Kurzform, Canvas, JS-fontFamily und var()-Rückfall.
   Gezählt wird jeder Schriftstapel, der eine Serifenschrift trägt:
     · `font-family: …` und `--font-*: …` (CSS, Inline-Style, Token-Werte in Erscheinungsbild-Modulen),
     · jsPDF `setFont('times' …)` (die eingebaute Serifenschrift der Ausdrucke).
   Ein Stapel ist serif, wenn er eine bekannte Serifenfamilie nennt oder als letzte generische Familie `serif`
   trägt (nicht `sans-serif`). Ein Stapel, der mit einer Sans-Schrift beginnt und nur als allerletzte Stufe
   `serif` hätte, zählt trotzdem: der Rückfall wäre im Ernstfall genau die Serifenschrift.

   Ratsche: tools/serifen-grundlinie.json nennt die Funde, die es beim Bau dieses Werkzeugs gab (Datei und
   Anzahl). Neue Funde sind rot, die Zahl je Datei darf nur sinken. Der Schriften-Wagen (v896) leert sie.

     node tools/serifen-pruefen.js                     → prüft die Standardmenge gegen die Grundlinie, Exit 1 bei Zuwachs
     node tools/serifen-pruefen.js --datei <pfad> …    → listet die Funde in den genannten Dateien (ohne Grundlinie)
     node tools/serifen-pruefen.js --modul <pfad> … [--erscheinungsbild <pfad>] [--kern <pfad>]
                                                       → löst die `schriftart` der Branding-Module auf (Modulweg), Exit 1 bei Fund

   MODULWEG (05.10.2026, Befund SCHRIFTART-OHNE-DATEI-SERIFEN): Die Dateisicht sieht nur Stapel, die als Text dastehen. Eine
   `schriftart` aus einem Branding-Modul wird erst im Kern zum Stapel — `schriftart: "Barlow"` ohne Datei ergab `Barlow` allein,
   also die Standardschrift des Browsers, eine Serifenschrift, ohne dass irgendwo `serif` stand. Der Modulweg schneidet die
   Stapel-Funktionen aus dem Kerntext (von `const _BRANDING_SCHRIFT_GENERISCH` bis vor `function brandingModulPruefen(`, kein
   Spiegel) und löst die Schriftart gegen ein Erscheinungsbild zu genau dem Stapel auf, den der Kern anwenden würde. Fund ist:
   eine Schriftart ohne Datei (der Kern verwirft sie), ein serifer Stapel, ein Stapel, der nicht auf `sans-serif` endet. Ohne
   `--modul` prüft der Standardlauf jedes Branding-Modul unter tools/ gegen das Ab-Werk-Erscheinungsbild „heute“.
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'serifen-grundlinie.json');
const SERIFEN_FAMILIEN = /\b(georgia|times(\s+new\s+roman)?|palatino(\s+linotype)?|book\s+antiqua|garamond|baskerville|cambria|constantia|didot|bodoni|merriweather|lora|playfair(\s+display)?|fraunces|source\s+serif(\s+pro|\s+4)?|noto\s+serif|pt\s+serif|libre\s+baskerville|crimson(\s+text|\s+pro)?|ibm\s+plex\s+serif|literata|charter|iowan\s+old\s+style)\b/i;

/* Die Standardmenge: was ausgeliefert wird oder eine Auslieferung erzeugt. */
function standardDateien() {
  const html = fs.readdirSync(REPO).filter((n) => n.endsWith('.html')).map((n) => path.join(REPO, n));
  const erscheinung = path.join(REPO, 'tools', 'erscheinung');
  const quellen = [];
  const sammeln = (ordner) => {
    if (!fs.existsSync(ordner)) return;
    for (const n of fs.readdirSync(ordner)) {
      const p = path.join(ordner, n);
      if (fs.statSync(p).isDirectory()) sammeln(p);
      else if (/\.(css|json)$/.test(n)) quellen.push(p);
    }
  };
  sammeln(erscheinung);
  /* Ausgelieferte Seiten außerhalb des Wurzelordners (gemessen 05.10.2026 mit `git ls-files '*.html' | grep /`): nur share/
     (Empfangsseite der Freigaben, mit eigenem CSS und JS). Alle übrigen HTML-Dateien in Unterordnern sind Test-Fixtures. */
  const share = path.join(REPO, 'share');
  if (fs.existsSync(share)) for (const n of fs.readdirSync(share)) if (/\.(html|css|js)$/.test(n)) quellen.push(path.join(share, n));
  return html.concat(quellen);
}

/* Ein Stapel ist serif, wenn er eine Serifenfamilie nennt oder auf generischem `serif` endet. */
function stapelIstSerif(stapel) {
  const teile = String(stapel).split(',').map((t) => t.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
  if (!teile.length) return false;
  if (teile.some((t) => SERIFEN_FAMILIEN.test(t) && !/sans/i.test(t))) return true;
  return teile.some((t) => /^serif$/i.test(t));
}

/* Rückfall in `var(--x, …)`: der Stapel nach dem ersten Komma auf oberster Ebene; ohne Rückfall leer. */
function varRueckfall(stapel) {
  const t = String(stapel).trim();
  if (!/^var\(/.test(t)) return null;
  let tiefe = 0;
  for (let i = 4; i < t.length; i++) {
    if (t[i] === '(') tiefe++;
    else if (t[i] === ')') { if (tiefe === 0) return ''; tiefe--; }
    else if (t[i] === ',' && tiefe === 0) { const rest = t.slice(i + 1); const zu = rest.lastIndexOf(')'); return (zu < 0 ? rest : rest.slice(0, zu)).trim(); }
  }
  return '';
}

/* Kurzform `font: [Stil] Größe[/Zeilenhöhe] Familie, …` (CSS und Canvas `ctx.font`): die Familie nach der Größe. */
function kurzformFamilie(wert) {
  const m = /(?:^|\s)[\d.]+(?:px|pt|pc|em|rem|%|vw|vh|ex|ch|q|mm|cm|in)(?:\/\S+)?\s+(.+)$/i.exec(String(wert).trim());
  return m ? m[1] : null;
}

function stapelPruefen(stapel) {
  const t = String(stapel).trim();
  if (/^var\(/.test(t)) { const r = varRueckfall(t); return r ? stapelPruefen(r) : false; }
  return stapelIstSerif(t);
}

/* Funde in einem Text: [{ art, stapel, zeile }]. Erkannt werden
     · `font-family: …` und `--font-*: …` (CSS, Inline-Style, Token-Werte), auch der Rückfall in `var(--x, …)`,
     · die Kurzform `font: … Größe Familie` (CSS) und Canvas `….font = '16px serif'`,
     · das SVG-/HTML-Attribut `font-family="…"` und `….fontFamily = '…'` bzw. `fontFamily: '…'` (JS),
     · jsPDF `setFont('times' …)`. */
function funde(text) {
  const raus = [];
  const zeileVon = (i) => text.slice(0, i).split('\n').length;
  const melden = (art, stapel, i) => raus.push({ art, stapel: String(stapel).trim().slice(0, 120), zeile: zeileVon(i) });
  let m;
  const stapelMuster = /(font-family|--font-[a-z0-9-]+)\s*["']?\s*:\s*["']?([^;}{\n<>]+)/gi;
  while ((m = stapelMuster.exec(text))) {
    const stapel = m[2].replace(/["'],?\s*$/, '').replace(/\\"/g, '"');
    if (stapelPruefen(stapel)) melden(m[1].toLowerCase().startsWith('--') ? 'token' : 'font-family', stapel, m.index);
  }
  const attribut = /font-family\s*=\s*(["'])([^"'<>]+)\1/gi;
  while ((m = attribut.exec(text))) if (stapelPruefen(m[2])) melden('attribut', m[2], m.index);
  const jsFamilie = /fontFamily\s*[:=]\s*(["'`])([^"'`]+)\1/g;
  while ((m = jsFamilie.exec(text))) if (stapelPruefen(m[2])) melden('js-fontFamily', m[2], m.index);
  const cssKurz = /(?:^|[;{\s"'])font\s*:\s*([^;}{\n<>"]+)/gi;
  while ((m = cssKurz.exec(text))) { const f = kurzformFamilie(m[1]); if (f && stapelPruefen(f)) melden('font-kurzform', m[1], m.index); }
  const canvas = /\.font\s*=\s*(["'`])([^"'`]+)\1/g;
  while ((m = canvas.exec(text))) { const f = kurzformFamilie(m[2]); if (f && stapelPruefen(f)) melden('canvas-font', m[2], m.index); }
  const pdf = /setFont\(\s*["']times["']/g;
  while ((m = pdf.exec(text))) melden('pdf-times', 'times', m.index);
  return raus;
}

/* ── Modulweg ─────────────────────────────────────────────────────────────────────────────────────────── */
const KERN = path.join(REPO, 'vivodepot.html');
const ERSCHEINUNGSBILD_HEUTE = path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json');
const STAPEL_ANKER = ['const _BRANDING_SCHRIFT_GENERISCH = ', 'function brandingModulPruefen('];

/* Die Stapel-Funktionen des Kerns, aus dem Kerntext geschnitten und in einem leeren vm-Kontext ausgeführt. Fehlt ein Anker, wirft
   es, statt still nichts zu prüfen. */
function stapelAufloeserAusKern(kernText) {
  const a = kernText.indexOf(STAPEL_ANKER[0]), e = kernText.indexOf(STAPEL_ANKER[1], a);
  if (a < 0 || e < 0) throw new Error('serifen-pruefen: Anker der Schrift-Stapel im Kern nicht gefunden (' + (a < 0 ? STAPEL_ANKER[0] : STAPEL_ANKER[1]) + ')');
  const kontext = vm.createContext({});
  vm.runInContext(kernText.slice(a, e) + '\n;this.__s = { _brandingSchriftStapel, _brandingSchriftFamilie };', kontext);
  return kontext.__s;
}

/* Ein Erscheinungsbild-Modul (roh, wie unter tools/erscheinung) in der Form, die die Kern-Funktionen lesen: { schriften, basis }. */
function ebAusModul(modul) {
  return { schriften: Array.isArray(modul && modul.schriften) ? modul.schriften : [], basis: (modul && modul.basis) || {} };
}

/* Endet der Stapel auf `sans-serif`? Ein `var(--x, …)` gilt mit seinem Rückfall. */
function stapelEndetSans(stapel) {
  let t = String(stapel || '').trim();
  if (/^var\(/.test(t)) t = varRueckfall(t) || '';
  const teile = t.split(',').map((x) => x.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
  return teile.length > 0 && /^sans-serif$/i.test(teile[teile.length - 1]);
}

/* Der Stapel, den der Kern für dieses Branding-Modul anwendet: die Marke (brandingAnwenden), sonst der Kern-Stapel der Basis
   (`font-family: var(--vd-branding-schriftart, var(--font-inter))`, tools/erscheinung/stil/grundlage.css). */
function modulStapel(modul, eb, aufloeser) {
  const marke = aufloeser._brandingSchriftStapel(modul && modul.schriftart, eb);
  return marke || String((eb.basis || {})['--font-inter'] || '');
}

/* Funde eines Branding-Moduls: [{ art, stapel, grund }]. */
function modulFunde(modul, eb, aufloeser) {
  const raus = [];
  if (!modul || typeof modul !== 'object' || modul.schriftart == null) return raus;
  if (!aufloeser._brandingSchriftFamilie(modul.schriftart, eb)) raus.push({ art: 'modul-schriftart', stapel: String(modul.schriftart).slice(0, 120), grund: 'schriftart-ohne-datei' });
  const stapel = modulStapel(modul, eb, aufloeser);
  if (stapelPruefen(stapel)) raus.push({ art: 'modul-stapel', stapel: stapel.slice(0, 120), grund: 'serif' });
  else if (!stapelEndetSans(stapel)) raus.push({ art: 'modul-stapel', stapel: stapel.slice(0, 120), grund: 'endet-nicht-auf-sans-serif' });
  return raus;
}

/* Die Branding-Module unter tools/ (was ausgeliefert oder vorgeführt wird). */
function standardModule() {
  const raus = [];
  const sammeln = (ordner) => {
    for (const n of fs.readdirSync(ordner)) {
      const p = path.join(ordner, n);
      if (n === 'node_modules') continue;
      if (fs.statSync(p).isDirectory()) sammeln(p);
      else if (n.endsWith('.json')) {
        let m; try { m = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { continue; }
        if (m && m.modulTyp === 'branding') raus.push(p);
      }
    }
  };
  sammeln(path.join(REPO, 'tools'));
  return raus;
}

/* Prüft Branding-Module (Pfade) gegen ein Erscheinungsbild: { '<pfad>': [Funde] } nur mit Fund. */
function moduleMessen(pfade, opts) {
  const o = opts || {};
  const aufloeser = stapelAufloeserAusKern(fs.readFileSync(o.kern || KERN, 'utf8'));
  const eb = ebAusModul(JSON.parse(fs.readFileSync(o.erscheinungsbild || ERSCHEINUNGSBILD_HEUTE, 'utf8')));
  const ergebnis = {};
  for (const p of pfade) {
    const f = modulFunde(JSON.parse(fs.readFileSync(p, 'utf8')), eb, aufloeser);
    if (f.length) ergebnis[path.relative(REPO, p)] = f;
  }
  return ergebnis;
}

function messen(dateien) {
  const ergebnis = {};
  for (const d of dateien) {
    const f = funde(fs.readFileSync(d, 'utf8'));
    if (f.length) ergebnis[path.relative(REPO, d)] = f;
  }
  return ergebnis;
}

/* Vergleich gegen die Grundlinie: { zuwachs: [...], gesunken: [...] }. */
function gegenGrundlinie(gemessen, grundlinie) {
  const zuwachs = [], gesunken = [];
  for (const [datei, f] of Object.entries(gemessen)) {
    const erlaubt = (grundlinie.dateien || {})[datei] || 0;
    if (f.length > erlaubt) zuwachs.push(datei + ': ' + f.length + ' Funde (Grundlinie ' + erlaubt + ') — ' + f.map((x) => 'Z.' + x.zeile + ' ' + x.stapel).join(' | '));
  }
  for (const [datei, n] of Object.entries(grundlinie.dateien || {})) {
    const jetzt = (gemessen[datei] || []).length;
    if (jetzt < n) gesunken.push(datei + ': ' + n + ' → ' + jetzt);
  }
  return { zuwachs, gesunken };
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? path.resolve(argv[i + 1]) : undefined; };
  if (argv.includes('--modul')) {
    const pfade = argv.filter((a, i) => argv[i - 1] === '--modul').map((p) => path.resolve(p));
    const g = moduleMessen(pfade, { erscheinungsbild: wert('--erscheinungsbild'), kern: wert('--kern') });
    console.log(JSON.stringify(g, null, 2));
    process.exitCode = Object.keys(g).length ? 1 : 0;
    return;
  }
  if (argv.includes('--datei')) {
    const dateien = argv.filter((a, i) => argv[i - 1] === '--datei').map((p) => path.resolve(p));
    const g = messen(dateien);
    console.log(JSON.stringify(g, null, 2));
    process.exitCode = Object.keys(g).length ? 1 : 0;
    return;
  }
  const grundlinie = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const { zuwachs, gesunken } = gegenGrundlinie(messen(standardDateien()), grundlinie);
  for (const z of zuwachs) console.error('[serifen] NEU: ' + z);
  for (const s of gesunken) console.log('[serifen] gesunken (Grundlinie senken): ' + s);
  const module = moduleMessen(standardModule());
  for (const [p, f] of Object.entries(module)) console.error('[serifen] MODUL: ' + p + ' — ' + f.map((x) => x.grund + ' (' + x.stapel + ')').join(' | '));
  const rot = zuwachs.length || Object.keys(module).length;
  process.exitCode = rot ? 1 : 0;
  if (!rot) console.log('[serifen] keine neue Serifenschrift, kein Branding-Modul mit Schrift ohne Datei');
}

module.exports = { funde, stapelIstSerif, stapelPruefen, varRueckfall, kurzformFamilie, messen, gegenGrundlinie, standardDateien, GRUNDLINIE, REPO,
  stapelAufloeserAusKern, ebAusModul, stapelEndetSans, modulStapel, modulFunde, standardModule, moduleMessen, KERN, ERSCHEINUNGSBILD_HEUTE, STAPEL_ANKER };
if (require.main === module) main();
