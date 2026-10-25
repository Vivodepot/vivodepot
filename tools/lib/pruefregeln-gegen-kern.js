'use strict';
/* pruefregeln-gegen-kern.js — hält docs/pruefregeln/pruefregeln.json gegen die Prüfer der Bürger-App (U2-ADR-496, 10.10.2026)
   Zwei Richtungen: jeder Ablehnungsgrund der App hat eine Regel, und jede Regel mit `kernGrund` kommt in der App noch vor.
   Liest nur Text, lädt kein externes Modul und führt die App nicht aus. */
const M = require('../modul-schemas-messen.js');
const { regelFinden, regelIndex } = require('./vorab-pruefung.js');

/* Jeder Ablehnungsgrund, den ein Prüfer als Kennwort oder Satz zurückgibt, hat eine Regel; jede Regel mit `kernGrund`
   kommt im Kern noch vor.
   Eine Regel mit `dynamisch: true` trägt einen Grund, den der Kern zur Laufzeit zusammensetzt und der darum im Quelltext
   nicht als Literal steht; für sie gilt die zweite Richtung nicht, ein Fall unter tests/fixtures/pruefregeln/ hält sie. */
/* Weitergereichte Gründe (21.10.2026, Befund PRUEFREGELN-WEITERGEREICHTE-GRUENDE): ein Prüfer gibt den Grund eines anderen
   weiter, `grund: e.grund` oder `nein(r.grund)`. Gefolgt wird zwei Formen: `const e = Name(…)` mit einer Funktion des Kerns,
   und `const r = TABELLE[…](…)` bzw. `const p = TABELLE[…]; … p(…)` mit einer Tabelle, deren Einträge Funktionen des Kerns
   aufrufen oder nennen. Gesammelt werden die Literale der gefolgten Funktion und, rekursiv, deren eigene Weitergaben.
   Eine Weitergabe, der nicht zu folgen ist, ist ein Fund — sonst hieße „kein Grund gesehen“ still „alles hat eine Regel“. */
const BEZEICHNER = '[A-Za-z_$][A-Za-z0-9_$]*';
const KEINE_FUNKTION = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'function', 'catch', 'Object', 'Array', 'String', 'Number', 'JSON']);

function tabellenFunktionen(kern, tabelle) {
  const m = new RegExp('^const ' + tabelle + ' = (?:Object\\.freeze\\()?\\{', 'm').exec(kern);
  if (!m) return null;
  let j = kern.indexOf('{', m.index), tiefe = 0;
  const anfang = j;
  for (; j < kern.length; j++) {
    if (kern[j] === '{') tiefe++;
    else if (kern[j] === '}' && --tiefe === 0) break;
  }
  const block = kern.slice(anfang, j + 1);
  const namen = new Set();
  for (const [, n] of block.matchAll(new RegExp('\\b(' + BEZEICHNER + ')\\(', 'g'))) if (!KEINE_FUNKTION.has(n)) namen.add(n);
  for (const [, n] of block.matchAll(new RegExp(':\\s*(' + BEZEICHNER + ')\\s*[,}\\n]', 'g'))) if (n !== 'null' && n !== 'true' && n !== 'false') namen.add(n);
  return [...namen].filter((n) => M.funktionsKoerper(kern, n));
}

function weitergereichteGruende(kern, name, gesehen = new Set()) {
  const gruende = new Set(), unverfolgbar = [];
  if (gesehen.has(name)) return { gruende: [], unverfolgbar };
  gesehen.add(name);
  const k = M.funktionsKoerper(kern, name);
  if (!k) return { gruende: [], unverfolgbar: [name + ': Funktion nicht im Kern'] };
  const text = k.text;
  const kurz = [...text.matchAll(/const ([A-Za-z_]+) = \(grund[^)]*\) => \(\{ gueltig: false/g)].map((x) => x[1]);
  const quellen = new Set();
  for (const [, v] of text.matchAll(new RegExp('gueltig: false, grund: (' + BEZEICHNER + ')\\.grund\\b', 'g'))) quellen.add(v);
  for (const n of kurz) for (const [, v] of text.matchAll(new RegExp('\\b' + n + '\\((' + BEZEICHNER + ')\\.grund\\b', 'g'))) quellen.add(v);
  const folgen = (f) => {
    for (const g of M.ablehnungsCodes(kern, { pruefer: f })) gruende.add(g);
    const r = weitergereichteGruende(kern, f, gesehen);
    r.gruende.forEach((g) => gruende.add(g));
    unverfolgbar.push(...r.unverfolgbar);
  };
  for (const v of quellen) {
    const zeile = k.zeile + text.slice(0, text.search(new RegExp('\\b' + v + '\\.grund\\b'))).split('\n').length - 1;
    const def = new RegExp('(?:const|let|var) ' + v + ' = (' + BEZEICHNER + ')(\\(|\\[)').exec(text);
    let ziele = null;
    if (def && def[2] === '(' && M.funktionsKoerper(kern, def[1])) ziele = [def[1]];
    else if (def && def[2] === '[') ziele = tabellenFunktionen(kern, def[1]);
    else if (def && def[2] === '(') {
      /* `const r = p(…)` mit `const p = TABELLE[…]` */
      const p = new RegExp('(?:const|let|var) ' + def[1] + ' = (' + BEZEICHNER + ')\\[').exec(text);
      if (p) ziele = tabellenFunktionen(kern, p[1]);
    }
    if (!ziele || !ziele.length) { unverfolgbar.push(name + ' Z. ' + zeile + ': weitergereichter Grund ' + v + '.grund nicht verfolgbar'); continue; }
    ziele.forEach(folgen);
  }
  return { gruende: [...gruende].sort(), unverfolgbar };
}

function regelnGegenKern(regeln, kernText) {
  const index = regelIndex(regeln);
  const fehlend = [], verwaist = [];
  const gesehen = new Set();
  const braucht = (art, grund) => {
    const r = regelFinden(index, art, grund) || regelFinden(index, 'allgemein', grund);
    if (r) gesehen.add(r.kennung); else fehlend.push(art + ' · ' + grund);
  };
  for (const t of M.modulTypen(kernText)) for (const c of M.ablehnungsCodes(kernText, t)) braucht(t.typ, c);
  const unverfolgbar = [];
  for (const t of M.modulTypen(kernText)) {
    if (!t.pruefer) continue;
    const w = weitergereichteGruende(kernText, t.pruefer);
    for (const g of w.gruende) braucht(t.typ, g);
    unverfolgbar.push(...w.unverfolgbar);
  }
  const koerper = (name) => (M.funktionsKoerper(kernText, name) || { text: '' }).text;
  /* Vorlage: jeder Satz, den validateTemplate zurückgibt (das erste Zeichenketten-Literal je return). */
  for (const m of koerper('validateTemplate').matchAll(/return (?:[A-Za-z_]+ \+ )?'([^']+)'/g)) braucht('vorlage', m[1]);
  /* Anfrage: die Kurzform nein('…'). */
  for (const m of koerper('anfragePruefen').matchAll(/\bnein\('([^']+)'\)/g)) braucht('anfrage', m[1]);
  /* Einlassweg: die Gründe vor der Prüfung der Art. */
  for (const m of koerper('modulEinlassen').matchAll(/raus\.grund = '([^']+)'/g)) braucht('allgemein', m[1]);
  for (const m of koerper('_modulGroesseTiefePruefen').matchAll(/grund: '([^']+)'/g)) braucht('allgemein', m[1]);
  for (const m of koerper('_modulSpracheGrund').matchAll(/return '([^']+)'/g)) braucht('allgemein', m[1]);
  for (const r of regeln.regeln) {
    if (typeof r.kernGrund === 'string' && !r.dynamisch && !gesehen.has(r.kennung)) verwaist.push(r.kennung);
  }
  return { fehlend: [...new Set(fehlend)].sort(), verwaist: verwaist.sort(), unverfolgbar: [...new Set(unverfolgbar)].sort() };
}

module.exports = { regelnGegenKern, weitergereichteGruende };
