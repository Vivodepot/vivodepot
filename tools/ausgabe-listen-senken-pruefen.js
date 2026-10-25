#!/usr/bin/env node
'use strict';
/* ausgabe-listen-senken-pruefen.js — statische Aufrufer-Probe zu „Rücknahme am Unterfeld gilt in jedem Ausgabeweg“.

   Die Laufzeit-Probe (die Ausgabe-Unterfeld-Probe, Wächter) prüft jeden Ausweg, der in einem Verzeichnis des
   Kerns steht (EXPORT_FORMATE, Situationsblätter, Anlässe, Bereiche, Voll-Export, Empfänger-Bausteine). Ein Ausweg AUSSERHALB jedes
   Verzeichnisses sähe sie nicht. Diese Probe schließt die Lücke von der anderen Seite:

   1. SENKEN: jede Kern-Funktion, deren Code eine Ausgabe erzeugt (`new Blob(`, `.download =`, `window.print(`, `navigator.share(`,
      `URL.createObjectURL(`, `showSaveFilePicker(`) — erhoben, nicht aufgezählt.
   2. AUSGABE-FUNKTIONEN: die Senken und ihre direkten Aufrufer (die Funktion, die den Inhalt baut und der Senke übergibt).
   3. LISTEN-LESER: eine Ausgabe-Funktion, die selbst oder über einen direkten Aufruf Listenwerte liest (Unterfeld-Wert per
      `[uf.id]`, `listenEintragZusammenfassung(`, `feldWertText(`, `_wertTextMenschlich(`, `_rohFuerAusgabe(`). Ein Aufruf in einen
      Bauer, den die Laufzeit-Probe abdeckt (VERZEICHNIS_BAUER und jedes `baue:`-Ziel in EXPORT_FORMATE), zählt nicht als Lesen.
   Jede Ausgabe-Funktion, die Listenwerte liest, steht entweder in einem Verzeichnis (über die Bauer abgedeckt) oder in der
   Positivliste tools/ausgabe-listen-senken-positivliste.json — mit Grund je Eintrag. Ein Eintrag ohne Fund ist ebenfalls rot.

   Grenzen, benannt: Funktionsnamen werden über den Namen aufgelöst (keine Gültigkeitsbereiche); ein Körper reicht bis zur
   nächsten Deklaration in Spalte 0. Eine Senke, die keine Ausgabe an Dritte ist (die eigene verschlüsselte Depot-Datei), steht
   mit Grund unter `senkenOhneAusgabe`.

   Aufruf: node tools/ausgabe-listen-senken-pruefen.js [--dokument <pfad>]   (Vorgabe: vivodepot.html)
   Fächer der Depot-Datei: FACH_SENKEN (unten) zählt die Schreibwege in ein Fach als Senken, mit eigener Laufzeit-Probe.

   Probe: die Ausgabe-Unterfeld-Probe ([Ausgabe-Senken]). */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const POSITIVLISTE = path.join(__dirname, 'ausgabe-listen-senken-positivliste.json');
const SENKE = /new\s+Blob\s*\(|\.download\s*=[^=]|window\.print\s*\(|navigator\.share\s*\(|URL\.createObjectURL\s*\(|showSaveFilePicker\s*\(/;
const LISTENWERT = /\[\s*(?:uf|u|unterfeld|ufDef)\.id\s*\]|\blistenEintragZusammenfassung\s*\(|\bfeldWertText\s*\(|\b_wertTextMenschlich\s*\(|\b_rohFuerAusgabe\s*\(/;
// Die Bauer, die die Laufzeit-Probe über die Verzeichnisse des Kerns fährt.
const VERZEICHNIS_BAUER = Object.freeze(['zusammenstellungDatensatz', 'anfrageAntwortDatensatz', 'anfrageAntwortDatensatzGeprueft',
  'anlassDatensatz', 'anlassAusgaben', 'anlassQrTeile', 'situationModell', 'bereichVollModell', 'docxBereichModell', 'vollDepotModell',
  'vollExportJSON', 'empfaengerZuschnittModell', '_datensatzAusEintraegen', '_rohFuerAusgabe',
  // RUECKNAHME-ANGEHOERIGE-UND-NOTFALLKARTE (20.10.2026): seither fährt die Laufzeit-Probe auch Notfallkarte und Angehörigen-Cache.
  'notfallKernModell', 'angehoerigenCacheModell']);
// Senken ohne Ausgabe-Muster: Schreibwege in ein Fach der eigenen Depot-Datei, das eine andere Person mit ihrem Passwort
// öffnet (U2-ADR-156). Sie erzeugen keinen Blob, geben aber Daten an Dritte. Je Senke die Laufzeit-Probe, die das Fach öffnet
// und auf zurückgehaltene Unterfelder prüft; die Senke muss einen abgedeckten Bauer rufen und darf selbst keine Listenwerte lesen.
// Seit 20.10.2026 (Befund FACH-OBERSTE-EINHEITEN-UNGEFILTERT) dazu: sie zerlegt den vollen Wert und lässt keine Einheit am Namen
// vorbei, ohne ihren Wert zu vergleichen — eine Namensweiche hatte das Personen-Register und die Situationen ungeprüft geöffnet.
const FACH_SENKEN = Object.freeze({ _empfaengerFaecherFuerSchreibweg: ['tests/fach-liste-unterfelder.test.js', 'tests/fach-ganze-einheiten.test.js'] });
const FACH_ZERFALL_VOLL = /\b_zerfallEinheiten\(\s*quelle\s*\)/;
const FACH_NAMENSWEICHE = /\.name\.(?:indexOf|includes|startsWith|endsWith|match|test)\s*\(|\.test\(\s*e\.name\s*\)/;

const REGEX_NACH_WORT = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await', 'instanceof']);
// Code ohne Kommentare, Strings, Template-Text und Regex-Literale; jeder Zeilenumbruch bleibt (Spalte 0 bleibt Spalte 0).
// Template-Interpolationen `${…}` bleiben Code, auch verschachtelt.
function nurCode(q) {
  let out = '';
  let i = 0;
  const n = q.length;
  let letztes = '\n', wort = '';
  const stapel = [];   // offene Template-Interpolationen: Klammertiefe beim Eintritt
  let tiefe = 0;
  const leer = (s) => s.replace(/[^\n]/g, '');
  const template = () => {   // ab `i` hinter dem öffnenden Backtick
    let start = i;
    while (i < n) {
      if (q[i] === '\\') { i += 2; continue; }
      if (q[i] === '`') { out += leer(q.slice(start, i)) + '""'; i++; letztes = ')'; return; }
      if (q[i] === '$' && q[i + 1] === '{') { out += leer(q.slice(start, i)) + '""+('; i += 2; stapel.push(tiefe); tiefe++; letztes = '('; return; }
      i++;
    }
    out += leer(q.slice(start));
  };
  while (i < n) {
    const c = q[i], c2 = q[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && q[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { const e = q.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2; out += leer(q.slice(i, j)) + ' '; i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && q[j] !== c && q[j] !== '\n') { if (q[j] === '\\') j++; j++; }
      out += '""'; i = j + 1; letztes = ')'; wort = ''; continue;
    }
    if (c === '`') { i++; template(); wort = ''; continue; }
    if (c === '}' && stapel.length && tiefe - 1 === stapel[stapel.length - 1]) { stapel.pop(); tiefe--; out += ')+'; i++; template(); continue; }
    if (c === '/' && ('(,=:[!&|?{};+-*%^~<>\n'.includes(letztes) || REGEX_NACH_WORT.has(wort))) {
      let j = i + 1, klasse = false, ok = false;
      while (j < n && q[j] !== '\n') {
        if (q[j] === '\\') { j += 2; continue; }
        if (q[j] === '[') klasse = true; else if (q[j] === ']') klasse = false; else if (q[j] === '/' && !klasse) { ok = true; break; }
        j++;
      }
      if (ok) { j++; while (j < n && /[a-z]/i.test(q[j])) j++; out += '/r/'; i = j; letztes = ')'; wort = ''; continue; }
    }
    if (c === '{') tiefe++; else if (c === '}') tiefe--;
    out += c;
    if (/[A-Za-z0-9_$]/.test(c)) { wort = (/[A-Za-z0-9_$]/.test(letztes) ? wort : '') + c; letztes = c; }
    else if (c === '\n') { letztes = '\n'; wort = ''; }
    else if (!/\s/.test(c)) { letztes = c; wort = ''; }
    i++;
  }
  return out;
}

// Die Skriptblöcke des Kerns (`<script>` ohne Attribute, wie tests/load-kern.js sie liest), als ein Code-Text.
function skriptCode(html) {
  const bloecke = [];
  let i = html.indexOf('<script>');
  while (i >= 0) {
    const e = html.indexOf('</script>', i + 8);
    if (e < 0) break;
    bloecke.push(html.slice(i + 8, e));
    i = html.indexOf('<script>', e);
  }
  return bloecke.map(nurCode).join('\n;\n');
}
// Kern-Funktionen in Spalte 0: Name → Körper (bis zur nächsten Deklaration in Spalte 0).
function funktionen(code) {
  const kopf = /^(?:async[ \t]+)?function[ \t]*\*?[ \t]*([A-Za-z_$][\w$]*)[ \t]*\(/gm;
  const grenze = /^(?:(?:async[ \t]+)?function\b|const[ \t]|let[ \t]|var[ \t]|class[ \t])/gm;
  const fn = new Map();
  let m;
  while ((m = kopf.exec(code)) !== null) {
    grenze.lastIndex = m.index + 1;
    const g = grenze.exec(code);
    if (!fn.has(m[1])) fn.set(m[1], code.slice(m.index, g ? g.index : code.length));
  }
  return fn;
}

function erheben(html) {
  const fn = funktionen(skriptCode(html));
  const ruft = new Map();
  for (const [name, koerper] of fn) {
    const s = new Set();
    const re = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let x;
    while ((x = re.exec(koerper)) !== null) if (x[1] !== name && fn.has(x[1])) s.add(x[1]);
    ruft.set(name, s);
  }
  const baue = [...html.matchAll(/baue:\s*\([^)]*\)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1]);
  const gedeckt = new Set([...VERZEICHNIS_BAUER, ...baue]);
  const senken = [...fn.keys()].filter((n) => SENKE.test(fn.get(n)) || Object.prototype.hasOwnProperty.call(FACH_SENKEN, n));
  return { fn, ruft, gedeckt, senken };
}

function pruefen(html, positivliste) {
  const pl = positivliste || JSON.parse(fs.readFileSync(POSITIVLISTE, 'utf8'));
  const ohneAusgabe = pl.senkenOhneAusgabe || {};
  const erlaubt = pl.ausgaben || {};
  const { fn, ruft, gedeckt, senken } = erheben(html);
  const echteSenken = senken.filter((s) => !Object.prototype.hasOwnProperty.call(ohneAusgabe, s));
  const ausgabe = new Set(echteSenken);
  for (const [name, s] of ruft) for (const z of s) if (echteSenken.includes(z)) ausgabe.add(name);
  const funde = [];
  for (const a of [...ausgabe].sort()) {
    if (gedeckt.has(a)) continue;
    const leser = [a, ...(ruft.get(a) || [])].filter((f) => !gedeckt.has(f) && LISTENWERT.test(fn.get(f) || ''));
    if (leser.length) funde.push({ funktion: a, leser });
  }
  const probleme = [];
  for (const f of funde) {
    if (!Object.prototype.hasOwnProperty.call(erlaubt, f.funktion)) probleme.push('Ausgabe-Funktion liest Listenwerte außerhalb jedes Verzeichnisses, ohne Eintrag: ' + f.funktion + ' (über ' + f.leser.join(', ') + ')');
  }
  for (const [name, probe] of Object.entries(FACH_SENKEN)) {
    if (!fn.has(name)) { probleme.push('Fach-Senke nicht mehr im Kern, Wächter und Probe nachziehen: ' + name); continue; }
    if (![...(ruft.get(name) || [])].some((z) => gedeckt.has(z))) probleme.push('Fach-Senke ruft keinen abgedeckten Bauer (Zuschnitt umgangen): ' + name);
    if (LISTENWERT.test(fn.get(name))) probleme.push('Fach-Senke liest Listenwerte selbst: ' + name);
    if (!FACH_ZERFALL_VOLL.test(fn.get(name))) probleme.push('Fach-Senke vergleicht die Einheiten nicht mit dem vollen Wert: ' + name);
    if (FACH_NAMENSWEICHE.test(fn.get(name))) probleme.push('Fach-Senke lässt Einheiten am Namen vorbei ungeprüft: ' + name);
    for (const p of [].concat(probe)) {
      const probePfad = path.join(REPO, p);
      if (!fs.existsSync(probePfad) || !fs.readFileSync(probePfad, 'utf8').includes(name)) probleme.push('Fach-Senke ohne Laufzeit-Probe, die sie nennt: ' + name + ' (' + p + ')');
    }
  }
  const gefunden = new Set(funde.map((f) => f.funktion));
  for (const k of Object.keys(erlaubt)) if (!gefunden.has(k)) probleme.push('Eintrag der Positivliste ohne Fund, entfernen: ausgaben.' + k);
  for (const k of Object.keys(ohneAusgabe)) if (!senken.includes(k)) probleme.push('Eintrag der Positivliste ohne Fund, entfernen: senkenOhneAusgabe.' + k);
  for (const [k, g] of Object.entries(Object.assign({}, erlaubt, ohneAusgabe))) if (typeof g !== 'string' || g.trim().length < 20) probleme.push('Eintrag ohne Grund: ' + k);
  return { probleme, funde, senken, ausgabe: [...ausgabe], funktionen: fn.size };
}

if (require.main === module) {
  const i = process.argv.indexOf('--dokument');
  const pfad = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(REPO, 'vivodepot.html');
  const r = pruefen(fs.readFileSync(pfad, 'utf8'));
  console.log('[ausgabe-listen-senken] ' + r.funktionen + ' Funktionen, ' + r.senken.length + ' Senken, ' + r.ausgabe.length + ' Ausgabe-Funktionen, ' + r.funde.length + ' lesen Listenwerte außerhalb der Verzeichnisse.');
  if (r.probleme.length) { for (const p of r.probleme) console.log('  ✖ ' + p); process.exitCode = 1; }
  else console.log('[ausgabe-listen-senken] sauber.');
}

module.exports = { pruefen, erheben, nurCode, skriptCode, funktionen, VERZEICHNIS_BAUER, FACH_SENKEN, POSITIVLISTE };
