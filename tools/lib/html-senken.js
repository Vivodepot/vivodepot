'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   html-senken.js — jede Stelle, an der Code HTML aus einem Wert in die Seite setzt (v842, D5, 30.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Findet in den <script>-Blöcken der HTML-Anwendungen (ohne mitgelieferte Fremdbibliotheken) und in sw.js/share/
   die Zuweisungen an innerHTML/outerHTML, insertAdjacentHTML und document.write — außer, der Wert ist ein fester
   Text ohne Einsetzung. Je Stelle: Datei, Zeile, der Ausdruck (normalisiert) und ein Abdruck davon.
   Die Grundlinie tools/html-senken-grundlinie.json nennt je Stelle, warum sie sicher ist (woher der Wert kommt,
   wo er maskiert wird). Eine neue Stelle ist rot, bis sie so begründet ist (tests/html-senken-grundlinie.test.js).
   Bewusst ohne Parser: eine Regel, die man lesen kann; was sie verfehlt, deckt die statische Analyse (Semgrep).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SENKE = /(\.(?:innerHTML|outerHTML)\s*\+?=(?!=)|\.insertAdjacentHTML\s*\(|\bdocument\.write(?:ln)?\s*\()/g;
// Ein fester Text ohne Einsetzung, danach endet die Anweisung (nicht: eine Zeile, die mit + weitergeht).
const FESTER_TEXT = /^\s*(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\$]|\\.)*`)\s*(?:[;)]|\n(?!\s*[+.?:|&,]))/;

/** Kommentare durch Leerzeichen ersetzen (Zeilen bleiben erhalten), Zeichenketten unberührt. */
function ohneKommentare(t) {
  let aus = ''; let q = null;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { aus += c; if (c === '\\') { aus += t[++i] || ''; continue; } if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; aus += c; continue; }
    if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') { aus += ' '; i++; } aus += t[i] || ''; continue; }
    if (c === '/' && t[i + 1] === '*') {
      const e = t.indexOf('*/', i + 2); const ende = e < 0 ? t.length : e + 2;
      aus += t.slice(i, ende).replace(/[^\n]/g, ' '); i = ende - 1; continue;
    }
    aus += c;
  }
  return aus;
}

const FREMD_ODER_DATEN = (attr, inhalt) =>
  /\bsrc\s*=/.test(attr) ||
  /\btype\s*=\s*["']?(application\/(ld\+)?json|text\/template|text\/plain)/i.test(attr) ||
  /\bid\s*=\s*["'][^"']*_VivodepotInline["']/.test(attr) ||
  /^\s*\/\*\*?\s*@license/.test(inhalt);

/** Die eigenen Skriptblöcke einer HTML-Datei, mit der Zeile, an der jeder beginnt. */
function skripte(html) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  const aus = [];
  let m;
  while ((m = re.exec(html))) {
    if (FREMD_ODER_DATEN(m[1], m[2])) continue;
    const start = m.index + m[0].indexOf('>') + 1;
    aus.push({ text: m[2], zeile0: html.slice(0, start).split('\n').length });
  }
  return aus;
}

/** Den Ausdruck ab der Senke bis zum Ende der Anweisung (Klammertiefe 0, dann ; oder Zeilenende nach )). */
function ausdruckAb(text, i) {
  let tiefe = 0; let q = null; let j = i;
  for (; j < text.length && j - i < 4000; j++) {
    const c = text[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) break; tiefe--; }
    else if (c === ';' && tiefe === 0) break;
  }
  return text.slice(i, j);
}

const normal = (s) => s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim();
const abdruck = (s) => crypto.createHash('sha256').update(normal(s)).digest('hex').slice(0, 16);

function senkenIn(roh, datei, zeile0 = 1) {
  const text = ohneKommentare(roh);
  const aus = [];
  SENKE.lastIndex = 0;
  let m;
  while ((m = SENKE.exec(text))) {
    const wertAb = m.index + m[0].length;
    const rest = text.slice(wertAb);
    const insertAdj = /insertAdjacentHTML/.test(m[0]);
    const wert = insertAdj ? rest.replace(/^\s*(['"])[a-z]+\1\s*,/, '') : rest;
    if (FESTER_TEXT.test(wert)) continue;
    const zeilenAnfang = text.lastIndexOf('\n', m.index) + 1;
    const ausdruck = ausdruckAb(text, zeilenAnfang);
    // Die umschließende benannte Funktion gehört zum Abdruck: `c.innerHTML = html` steht an vielen Orten, jeweils mit
    // einer anderen Herkunft von html — jeder Ort braucht seinen eigenen Grund.
    const vor = text.slice(Math.max(0, m.index - 200000), m.index);
    const fn = [...vor.matchAll(/function\s+([\w$]+)\s*\(/g)].pop();
    const funktion = fn ? fn[1] : '';
    aus.push({ datei, zeile: zeile0 + text.slice(0, m.index).split('\n').length - 1, funktion, code: normal(ausdruck).slice(0, 200), abdruck: abdruck(funktion + ' ' + ausdruck) });
  }
  return aus;
}

function jsDateien(repo, ordner) {
  const abs = path.join(repo, ordner);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.posix.join(ordner, e.name);
    if (e.isDirectory()) return jsDateien(repo, rel);
    return /\.m?js$/.test(e.name) ? [rel] : [];
  });
}

/** Alle Senken des Repos. */
function senken(repo) {
  const aus = [];
  for (const f of fs.readdirSync(repo).filter((x) => x.endsWith('.html')).sort()) {
    for (const s of skripte(fs.readFileSync(path.join(repo, f), 'utf8'))) aus.push(...senkenIn(s.text, f, s.zeile0));
  }
  for (const f of ['sw.js', ...jsDateien(repo, 'share'), ...jsDateien(repo, 'firefox-erweiterung')]) {
    if (fs.existsSync(path.join(repo, f))) aus.push(...senkenIn(fs.readFileSync(path.join(repo, f), 'utf8'), f));
  }
  return aus;
}

/* Die begründete Liste: alle Dateien tools/html-senken-grundlinie*.json zusammen (eine je Veröffentlichungsstand —
   im öffentlichen Stand fehlt die Liste der dort nicht enthaltenen Dateien, und mit ihr deren Senken). */
const OFFEN = 'OFFEN';
const schluessel = (e) => e.datei + '\t' + e.abdruck;
function grundlinieLesen(repo) {
  const ordner = path.join(repo, 'tools');
  const dateien = fs.readdirSync(ordner).filter((f) => /^html-senken-grundlinie.*\.json$/.test(f)).sort();
  return { dateien, eintraege: dateien.flatMap((f) => JSON.parse(fs.readFileSync(path.join(ordner, f), 'utf8')).eintraege) };
}
function abgleichen(ist, grundlinie) {
  const erlaubt = new Map(grundlinie.eintraege.map((e) => [schluessel(e), e]));
  const gezaehlt = new Map();
  for (const s of ist) gezaehlt.set(schluessel(s), (gezaehlt.get(schluessel(s)) || 0) + 1);
  const neu = ist.filter((s) => !erlaubt.has(schluessel(s)) || gezaehlt.get(schluessel(s)) > erlaubt.get(schluessel(s)).anzahl);
  const weg = grundlinie.eintraege.filter((e) => (gezaehlt.get(schluessel(e)) || 0) < e.anzahl);
  const ohneGrund = grundlinie.eintraege.filter((e) => !e.grund || e.grund.startsWith(OFFEN));
  return { neu, weg, ohneGrund };
}

module.exports = { senken, senkenIn, skripte, abdruck, normal, ohneKommentare, grundlinieLesen, abgleichen, schluessel, OFFEN };
