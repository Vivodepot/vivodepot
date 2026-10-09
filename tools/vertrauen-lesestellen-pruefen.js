#!/usr/bin/env node
'use strict';
/* Lesestellen der Vertrauensfelder — Kern UND Lese-App (Schutz-Wagen, 05.10.2026; Härtung des Klassenwächters
   tests/vertrauen-nie-aus-selbstauskunft.test.js nach der Zweitlesung zu S1/S2, Punkte F2–F4).

   Die Felder `ungeprueft`, `pruefstufe`, `abWerk`, `anbieterIdGeprueft`, `signiert`, `beleg`, `verifiziert` und `herkunft`
   stehen in Dateien, die jeder ändern kann, der sie hat. Wer daraus Vertrauen ableitet, fragt die Ladeprüfung oder den
   Inhalt, nie das Feld. Dieses Werkzeug findet JEDE Stelle, an der eines der Felder im ausgeführten Code vorkommt:
     - Punkt- und Optional-Zugriff        m.ungeprueft, m?.ungeprueft
     - Klammerzugriff und jede Nennung als Zeichenkette   m['ungeprueft'], 'ungeprueft' in m, Reflect.get(m, "abWerk")
     - Destrukturierung                   const { ungeprueft } = m;  ({ pruefstufe }) => …;  function f({ abWerk }) {…}
   Kommentare zählen nicht (zeichenweiser Automat, Zeilen bleiben erhalten); CSS und HTML außerhalb von <script> auch nicht.
   Gelesen wird bis zum ersten `/** @license` (danach eingebettete Fremdbibliotheken).

   Bekannte Grenze: ein Feldname, der zur Laufzeit zusammengesetzt wird ('unge' + 'prueft'), wird nicht gefunden. Gegen
   eine Absicht hilft kein Textwächter; gegen das Versehen, das hier gemeint ist, reicht er.

   Aufruf:  node tools/vertrauen-lesestellen-pruefen.js [--datei <pfad>]…   (ohne Argument: Kern und Lese-App)
   Ausgabe: je Stelle `datei | funktion | feld | code`; Exit 0. Die Bewertung macht die Probe gegen die Positivliste. */
const fs = require('node:fs');
const path = require('node:path');

const FELDER = Object.freeze(['ungeprueft', 'pruefstufe', 'abWerk', 'anbieterIdGeprueft', 'signiert', 'beleg', 'verifiziert', 'herkunft', 'abWerkMitschrift']);
const F = FELDER.join('|');
const MUSTER = Object.freeze([
  ['punkt', new RegExp('(?:\\.|\\?\\.)\\s*(' + F + ')\\b')],
  ['zeichenkette', new RegExp('([\'"`])(' + F + ')\\1')],
  ['destrukturierung', new RegExp('\\{[^{}]*\\b(' + F + ')\\b[^{}]*\\}\\s*=(?![=>])')],
  ['parameter', new RegExp('\\(\\s*\\{[^{}]*\\b(' + F + ')\\b[^{}]*\\}[^)]*\\)\\s*=>')],
  ['parameter', new RegExp('function\\s*[A-Za-z0-9_$]*\\s*\\([^)]*\\{[^{}]*\\b(' + F + ')\\b')],
]);

// Zeichen, nach denen ein `/` einen Regex-Literal beginnt (Lexer-Tabelle, keine Ausnahmeliste; dieselbe Regel wie im Gegenlesungs-Werkzeug).
const REGEX_KANN_FOLGEN_AUF = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '^', '~', '<', '>', '\n']);

/* Kommentare durch Leerzeichen ersetzen, Zeilenumbrüche und alles andere (auch Zeichenketten) unverändert lassen. */
function ohneKommentare(code) {
  const out = [];
  const n = code.length;
  let i = 0;
  let letztes = '\n';
  const tiefe = [];   // offene `${` in Template-Literalen: Klammertiefe, bei der das Template weitergeht
  let klammern = 0;
  const template = () => {   // ab i steht der Inhalt eines Template-Literals (nach ` oder nach `}`)
    while (i < n) {
      const c = code[i];
      if (c === '\\') { out.push(c, code[i + 1] || ''); i += 2; continue; }
      if (c === '`') { out.push(c); i++; return; }
      if (c === '$' && code[i + 1] === '{') { out.push('${'); i += 2; tiefe.push(klammern); klammern++; return; }
      out.push(c); i++;
    }
  };
  while (i < n) {
    const c = code[i];
    const c2 = code[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && code[i] !== '\n') { out.push(' '); i++; } continue; }
    if (c === '/' && c2 === '*') {
      out.push('  '); i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { out.push(code[i] === '\n' ? '\n' : ' '); i++; }
      out.push('  '); i += 2; continue;
    }
    if (c === '\'' || c === '"') {
      out.push(c); i++;
      while (i < n && code[i] !== c && code[i] !== '\n') { if (code[i] === '\\') { out.push(code[i]); i++; } out.push(code[i]); i++; }
      if (i < n) { out.push(code[i]); i++; }
      letztes = c; continue;
    }
    if (c === '`') { out.push(c); i++; template(); letztes = '`'; continue; }
    if (c === '/' && REGEX_KANN_FOLGEN_AUF.has(letztes)) {
      out.push(c); i++;
      let klasse = false;
      while (i < n && code[i] !== '\n') {
        const r = code[i];
        if (r === '\\') { out.push(r, code[i + 1] || ''); i += 2; continue; }
        out.push(r); i++;
        if (r === '[') klasse = true; else if (r === ']') klasse = false; else if (r === '/' && !klasse) break;
      }
      letztes = 'a'; continue;
    }
    if (c === '{') klammern++;
    if (c === '}') {
      klammern--;
      if (tiefe.length && tiefe[tiefe.length - 1] === klammern) { tiefe.pop(); out.push('}'); i++; template(); letztes = '`'; continue; }
    }
    out.push(c); i++;
    if (!/\s/.test(c)) letztes = c; else if (c === '\n') letztes = '\n';
  }
  return out.join('');
}

/* Die <script>-Inhalte, je Block mit einer Zeilenmarke davor, bis zum ersten `/** @license`. */
function skripte(html) {
  const ende = html.indexOf('/** @license');
  if (ende > 0) html = html.slice(0, ende) + '\n</script>';
  const raus = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) raus.push(m[1]);
  return raus;
}

/* Alle Lesestellen: [{ funktion, feld, art, code }]. `funktion` ist die zuletzt begonnene benannte Funktion oder die
   Top-Level-Deklaration (const/let/var), in der die Zeile steht. */
function lesestellen(html) {
  const raus = [];
  for (const block of skripte(html)) {
    let fn = '?';
    for (const zeile of ohneKommentare(block).split('\n')) {
      let m = zeile.match(/^\s*(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/);
      if (m) fn = m[1];
      m = zeile.match(/^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/);
      if (m) fn = m[1];
      const code = zeile.trim();
      if (!code) continue;
      for (const [art, re] of MUSTER) {
        const t = code.match(re);
        if (t) { raus.push({ funktion: fn, feld: art === 'zeichenkette' ? t[2] : t[1], art, code }); break; }
      }
    }
  }
  return raus;
}

const DATEIEN = Object.freeze({ kern: 'vivodepot.html', lesen: 'vivodepot-lesen.html' });

if (require.main === module) {
  const args = process.argv.slice(2);
  const pfade = [];
  for (let k = 0; k < args.length; k++) if (args[k] === '--datei' && args[k + 1]) pfade.push(args[++k]);
  if (!pfade.length) for (const d of Object.values(DATEIEN)) pfade.push(path.join(__dirname, '..', d));
  for (const p of pfade) {
    const s = lesestellen(fs.readFileSync(p, 'utf8'));
    process.stdout.write('### ' + p + ' — ' + s.length + ' Stellen\n');
    for (const x of s) process.stdout.write([path.basename(p), x.funktion, x.feld, x.code].join(' | ') + '\n');
  }
}

module.exports = { FELDER, DATEIEN, ohneKommentare, skripte, lesestellen };
