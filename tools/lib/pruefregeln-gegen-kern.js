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
function regelnGegenKern(regeln, kernText) {
  const index = regelIndex(regeln);
  const fehlend = [], verwaist = [];
  const gesehen = new Set();
  const braucht = (art, grund) => {
    const r = regelFinden(index, art, grund) || regelFinden(index, 'allgemein', grund);
    if (r) gesehen.add(r.kennung); else fehlend.push(art + ' · ' + grund);
  };
  for (const t of M.modulTypen(kernText)) for (const c of M.ablehnungsCodes(kernText, t)) braucht(t.typ, c);
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
  return { fehlend: [...new Set(fehlend)].sort(), verwaist: verwaist.sort() };
}

module.exports = { regelnGegenKern };
