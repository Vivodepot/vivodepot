'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   e2e-schleifen-zaehlen.js — wie viele Tests eine E2E-Datei über ihre `test(`-Aufrufe hinaus
   ausführt, weil Aufrufe in `for … of`-Schleifen stehen (A423). Eine Fassung, gelesen von
   tools/faktenbasis-erzeugen.js und der Probe A423.

   Befund A423-DESTRUKTURIERTE-SCHLEIFENKOEPFE (17.10.2026), drei Lücken der vorigen Zählung:
   1. `for (const [a, b] of LISTE)` las die eckigen Klammern im Kopf als Inline-Liste mit zwei
      Werten, gleich wie lang LISTE war.
   2. Eine Schleife über einen Namen ohne Destrukturierung (`for (const b of BREITEN)`) zählte
      gar nicht, außer der Name hieß PRODUKTE; eine Inline-Liste mit Objekten (`{ width: … }`)
      fiel aus dem Kopfmuster.
   3. Verschachtelte Schleifen wurden addiert statt multipliziert.
   Jetzt: die Werte kommen aus dem, was nach `of` steht, je `test(` wird das Produkt aller
   umschließenden Schleifen gezählt, und eine unbekannte Quelle wird gemeldet, nicht übergangen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

/* Einträge eines Array- oder Objekt-Literals auf oberster Ebene, ab der öffnenden Klammer bei `start`.
   Klammern, Zeichenketten und Vorlagen werden beachtet; ein abschließendes Komma zählt nicht mit. */
function eintraegeZaehlen(text, start) {
  let tiefe = 0, eintraege = 0, inhalt = false, q = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; inhalt = true; continue; }
    if ('[{('.includes(c)) { if (tiefe === 1) inhalt = true; tiefe++; continue; }
    if (']})'.includes(c)) { tiefe--; if (tiefe === 0) return eintraege + (inhalt ? 1 : 0); continue; }
    if (tiefe === 1 && c === ',') { if (inhalt) eintraege++; inhalt = false; continue; }
    if (tiefe === 1 && !/\s/.test(c)) inhalt = true;
  }
  return null;
}

/* Länge der Liste NAME, wie die Datei sie bindet: `const NAME = [ … ]`, `const NAME = { … }` (für Object.entries/keys)
   oder aus einem eingebundenen Modul (`const { NAME } = require('./x')`, `const NAME = require('./x')`). */
function namensLaenge(name, text, { verzeichnis, produkteLaenge } = {}) {
  const literal = new RegExp('^\\s*const\\s+' + name + '\\s*=\\s*(?:Object\\.freeze\\()?([\\[{])', 'm').exec(text);
  if (literal) return eintraegeZaehlen(text, literal.index + literal[0].length - 1);
  const modul = new RegExp("^\\s*const\\s+(?:\\{[^}]*\\b" + name + "\\b[^}]*\\}|" + name + ")\\s*=\\s*require\\('([^']+)'\\)", 'm').exec(text);
  if (modul && verzeichnis && modul[1].startsWith('.')) {
    try {
      const m = require(path.resolve(verzeichnis, modul[1]));
      const wert = Array.isArray(m) ? m : m && m[name];
      if (Array.isArray(wert)) return wert.length;
    } catch (_) { return null; }
  }
  if (name === 'PRODUKTE' && produkteLaenge) return produkteLaenge;
  return null;
}

/* Wie viele Werte eine Schleife durchläuft, aus dem Ausdruck nach `of`. */
function schleifenWerte(kopf, text, kontext = {}) {
  const m = kopf.match(/\bof\s+([\s\S]+?)\)\s*\{\s*$/);
  if (!m) return { werte: null, quelle: null };
  const quelle = m[1].trim();
  if (quelle.startsWith('[')) return { werte: eintraegeZaehlen(quelle, 0), quelle: 'inline' };
  const objInline = quelle.match(/^Object\.(?:entries|keys|values)\(\s*\{/);
  if (objInline) return { werte: eintraegeZaehlen(quelle, objInline[0].length - 1), quelle: 'inline' };
  const obj = quelle.match(/^Object\.(?:entries|keys|values)\(\s*([A-Za-z_$][\w$]*)\s*\)$/);
  if (obj) return { werte: namensLaenge(obj[1], text, kontext), quelle };
  if (/^[A-Za-z_$][\w$]*$/.test(quelle)) return { werte: namensLaenge(quelle, text, kontext), quelle };
  return { werte: null, quelle };
}

const KOPF = /^[ \t]*for \((?:const|let) [^;\n]*?\bof\b[^\n]*\)[ \t]*\{[ \t]*$/gm;   // bis zur { am Zeilenende
const AUFRUF = /^\s*test\(/gm;

/* Alle Schleifen einer Datei mit ihrem Rumpfbereich, und je `test(` das Produkt der umschließenden Schleifen.
   Liefert { zuwachs, faelle: [{ werte, tests, quelle }], unbekannt: [quelle] }. */
function dateiZaehlen(text, kontext = {}) {
  const schleifen = [];
  KOPF.lastIndex = 0;
  let k;
  while ((k = KOPF.exec(text))) {
    let tiefe = 1, i = k.index + k[0].length;
    while (tiefe > 0 && i < text.length) { if (text[i] === '{') tiefe++; else if (text[i] === '}') tiefe--; i++; }
    const von = k.index + k[0].length, bis = i - 1;
    schleifen.push(Object.assign({ von, bis }, schleifenWerte(k[0], text, kontext)));
  }
  const aufrufe = [];
  AUFRUF.lastIndex = 0;
  let a;
  while ((a = AUFRUF.exec(text))) aufrufe.push(a.index);
  let zuwachs = 0;
  const unbekannt = new Set();
  for (const pos of aufrufe) {
    let produkt = 1;
    for (const s of schleifen) {
      if (pos < s.von || pos > s.bis) continue;
      if (!s.werte) { unbekannt.add(s.quelle); continue; }
      produkt *= s.werte;
    }
    zuwachs += produkt - 1;
  }
  const faelle = schleifen.map((s) => ({ werte: s.werte, quelle: s.quelle, tests: aufrufe.filter((p) => p >= s.von && p <= s.bis).length }))
    .filter((f) => f.tests);
  return { zuwachs, faelle, unbekannt: [...unbekannt] };
}

module.exports = { eintraegeZaehlen, schleifenWerte, dateiZaehlen };
