#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kernsatz-aussentext-pruefen.js — sagen Website und Außentexte nur, was der Kernsatz trägt? (04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Entschieden ist (22.10.2026): aus dem öffentlichen Quelltext ist der Kern nachbaubar, die Produkte sind es nicht. Ein Text,
   der „Open Source“ oder „Der Quelltext ist offen“ sagt, ohne den Kern zu nennen, verspricht mehr. Dieses Werkzeug liest HTML-
   und Markdown-Dateien und meldet jeden Satz, der eines der Muster trägt:
     · open-source       „Open Source“, „open-source“ (nicht in „Open Source Initiative“, „Open Source Vulnerabilities“)
                                                                              — erlaubt, wenn derselbe Satz den Kern nennt
     · quelltext-offen   „Quelltext ist offen“, „Quellcode der Anwendung ist offen“ — ebenso
     · source-code-open  „source code is open“                                 — ebenso
     · quelloffen        „quelloffen“                                           — ebenso
     · anhang-iii        „Anhang III“ (eine Nummer aus Anhang III wird nicht genannt) — ohne Ausnahme
     · behandeln-als     „Wir behandeln Vivodepot als …“ (alter Satz zur Produktklasse) — ohne Ausnahme
   „Den Kern nennen“ heißt: im selben Satz steht „Kern…“ oder „core“. Ausgenommen sind nur die Sätze der Liste AUSNAHMEN
   (Beschreibungen fremder Werke, je Datei und wörtlichem Satzteil).

   Gelesen wird, was eine Leserin oder eine Suchmaschine sieht: Text zwischen den Tags, die Attribute content, alt, title,
   aria-label und placeholder (Meta-Beschreibung, Keywords) und die Zeichenketten in JSON-LD. Stil, Kommentare und andere Skripte
   zählen nicht. Satzgrenzen sind Satzzeichen und Block-Tags; Inline-Tags (a, strong, em, b, i, abbr, code, small, mark, sup, sub)
   trennen keinen Satz.

   Aufruf:
     node tools/kernsatz-aussentext-pruefen.js --dokument <datei|ordner> [--dokument …]   (Ordner: alle .html und .md darunter)
     node tools/kernsatz-aussentext-pruefen.js                                             (ohne Argument: gegen die Fixture
                                                                                            tests/fixtures/kernsatz-aussentext/gut)
   Exit 0 ohne Fund, 1 mit Fund, 2 bei falschem Aufruf. Eine Live-Seite misst, wer sie vorher mit curl in eine Datei holt; das
   Werkzeug selbst geht nicht ins Netz.
   Probe: tests/kernsatz-aussentext-pruefen.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURE_GUT = path.join(REPO, 'tests', 'fixtures', 'kernsatz-aussentext', 'gut');

const MUSTER = [
  // Eigennamen Dritter („Open Source Initiative“, „Open Source Vulnerabilities“) sind keine Aussage über Vivodepot.
  { id: 'open-source', re: /\bopen[\s-]?source\b(?!\s+(?:Initiative|Vulnerabilities)\b)/i, kernErlaubt: true },
  { id: 'quelltext-offen', re: /\bQuell(?:text|code)(?:\s+der\s+Anwendung)?\s+ist\s+offen/i, kernErlaubt: true },
  { id: 'source-code-open', re: /\bsource\s+code\s+(?:of\s+the\s+application\s+)?is\s+open\b/i, kernErlaubt: true },
  { id: 'quelloffen', re: /\bquelloffen/i, kernErlaubt: true },
  { id: 'anhang-iii', re: /\bAnhang\s+III\b/, kernErlaubt: false },
  { id: 'behandeln-als', re: /\bWir\s+behandeln\s+Vivodepot\s+als\b/i, kernErlaubt: false },
];
const KERN = /\bKern|\bcore\b/i;
/* AUSNAHMEN (Wort vom 2026-11-04): Beschreibungen fremder Werke auf der Literaturseite und der Kriteriumsname eines fremden
   Katalogs auf der Souveränitätsseite bleiben, wie sie sind — ein Zitat wird nicht umgeschrieben. `genau`: nur der ganze Satz. Je Fundstelle ein Eintrag mit dem wörtlichen Satzteil; ein neuer Treffer auf derselben Seite, der Vivodepot meint,
   bleibt rot. Die Liste darf nur mit Wort wachsen (Deckel in der Probe). */
const AUSNAHMEN = Object.freeze([
  { datei: 'literatur.html', satzteil: 'Das Warum hinter Open Source', grund: 'Werk Dritter (FSFE)' },
  { datei: 'literatur.html', satzteil: 'The why behind open source', grund: 'Werk Dritter (FSFE)' },
  { datei: 'literatur.html', satzteil: 'Die Lizenz, die quelloffene Werkzeuge fortbestehen lässt', grund: 'Werk Dritter (EUPL)' },
  { datei: 'literatur.html', satzteil: 'The licence that lets open-source tools endure', grund: 'Werk Dritter (EUPL)' },
  { datei: 'literatur.html', satzteil: 'Der Maßstab für digitale Gemeingüter: quelloffen', grund: 'Werk Dritter (Digital Public Goods Standard)' },
  { datei: 'literatur.html', satzteil: 'The benchmark for digital public goods: open source', grund: 'Werk Dritter (Digital Public Goods Standard)' },
  { datei: 'literatur.html', satzteil: 'Verbindet Open Source unmittelbar mit der digitalen Souveränität', grund: 'Werk Dritter (Public Money, Public Code)' },
  { datei: 'literatur.html', satzteil: 'It ties open source directly to the digital sovereignty', grund: 'Werk Dritter (Public Money, Public Code)' },
  { datei: 'literatur.html', satzteil: 'Eine Open-Source-Technologie für verteilte Speicherung', grund: 'Werk Dritter (Hub of All Things)' },
  { datei: 'literatur.html', satzteil: 'An open-source technology for distributed personal data storage', grund: 'Werk Dritter (Hub of All Things)' },
  // Kriteriumsname eines fremden Katalogs: nur als ganzer Satz (genau), nur auf dieser Seite.
  { datei: 'souveraenitaet.html', satzteil: 'Verfügbarkeit von Open Source', genau: true, grund: 'Werk Dritter (Kriteriumsname)', quelle: 'SOV-6.3' },
  { datei: 'souveraenitaet.html', satzteil: 'Availability of open source', genau: true, grund: 'Werk Dritter (Kriteriumsname)', quelle: 'SOV-6.3' },
]);
function ausgenommen(datei, satz) {
  const name = path.basename(String(datei || ''));
  return AUSNAHMEN.some((a) => a.datei === name && (a.genau ? satz === a.satzteil : satz.includes(a.satzteil)));
}
const INLINE = new Set(['a', 'strong', 'em', 'b', 'i', 'abbr', 'code', 'small', 'mark', 'sup', 'sub']);
const ATTRIBUTE = /\b(?:content|alt|title|aria-label|placeholder)\s*=\s*("([^"]*)"|'([^']*)')/gi;

function entitaeten(t) {
  return t.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

/* Die Textstücke einer HTML-Seite, in denen Sätze stehen. */
function htmlStuecke(html) {
  const stuecke = [];
  let t = String(html).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, '\n');
  t = t.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attr, inhalt) => {
    if (/application\/ld\+json/i.test(attr)) {
      for (const m of inhalt.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
        try { stuecke.push(JSON.parse('"' + m[1] + '"')); } catch (_) { stuecke.push(m[1]); }
      }
    }
    return '\n';
  });
  t = t.replace(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi, (ganz, name, attr) => {
    for (const m of attr.matchAll(ATTRIBUTE)) stuecke.push(entitaeten(m[2] !== undefined ? m[2] : m[3] || ''));
    return INLINE.has(name.toLowerCase()) ? '' : '\n';
  });
  t = t.replace(/<\/([a-z][a-z0-9-]*)\s*>/gi, (_, name) => (INLINE.has(name.toLowerCase()) ? '' : '\n'));
  stuecke.push(...entitaeten(t).split(/\n/));
  return stuecke;
}

/* Die Textstücke einer Markdown-Datei: Absätze (Leerzeile trennt). */
function mdStuecke(md) {
  return String(md).split(/\n\s*\n/);
}

function saetze(stueck) {
  return String(stueck).replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
}

/* Funde in einem Text. `art`: 'html' oder 'md'. Jeder Fund nennt Muster und Satz. */
function funde(text, art = 'html', datei = null) {
  const out = [];
  for (const stueck of art === 'md' ? mdStuecke(text) : htmlStuecke(text)) {
    for (const satz of saetze(stueck)) {
      for (const m of MUSTER) {
        if (!m.re.test(satz)) continue;
        if (m.kernErlaubt && KERN.test(satz)) continue;
        if (datei && ausgenommen(datei, satz)) continue;
        out.push({ muster: m.id, satz });
      }
    }
  }
  return out;
}

function dateienUnter(ziel) {
  const st = fs.statSync(ziel);
  if (st.isFile()) return [ziel];
  const out = [];
  for (const e of fs.readdirSync(ziel, { withFileTypes: true })) {
    const p = path.join(ziel, e.name);
    if (e.isDirectory()) out.push(...dateienUnter(p));
    else if (/\.(html?|md)$/i.test(e.name)) out.push(p);
  }
  return out.sort();
}

function pruefen(ziele) {
  const ergebnis = [];
  for (const ziel of ziele) {
    for (const datei of dateienUnter(ziel)) {
      const art = /\.md$/i.test(datei) ? 'md' : 'html';
      for (const f of funde(fs.readFileSync(datei, 'utf8'), art, datei)) ergebnis.push({ datei, ...f });
    }
  }
  return ergebnis;
}

function main() {
  const argv = process.argv.slice(2);
  const ziele = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dokument' && argv[i + 1]) ziele.push(path.resolve(argv[++i]));
    else { console.error('Aufruf: node tools/kernsatz-aussentext-pruefen.js [--dokument <datei|ordner> …]'); process.exit(2); }
  }
  if (!ziele.length) ziele.push(FIXTURE_GUT);
  for (const z of ziele) if (!fs.existsSync(z)) { console.error('kernsatz-aussentext: nicht gefunden: ' + z); process.exit(2); }
  const ergebnis = pruefen(ziele);
  for (const f of ergebnis) console.log(path.relative(process.cwd(), f.datei) + ': ' + f.muster + ' — „' + f.satz.slice(0, 200) + '“');
  console.log('kernsatz-aussentext: ' + ergebnis.length + ' Fund(e) in ' + ziele.length + ' Ziel(en).');
  process.exit(ergebnis.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { MUSTER, KERN, AUSNAHMEN, ausgenommen, funde, htmlStuecke, saetze, pruefen, dateienUnter };
