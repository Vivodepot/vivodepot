#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   design-gleichstand.js — rechnet nach, ob eine Tokenisierung den Kern ab Werk
   unverändert lässt (U2-ADR-473: „v894–v896 lassen Vivodepot ab Werk pixelgleich").
   ────────────────────────────────────────────────────────────────────────────
   Der Bildvergleich zeigt das Ergebnis an einigen Ansichten. Diese Rechnung zeigt
   es an JEDER Deklaration, auch an solchen, die keine Aufnahme trifft (Dialoge,
   Banner, Druck, Nachtmodus):

   1. Jede Deklaration beider Fassungen wird aufgelöst — `var(--x)` rekursiv gegen
      die Token-Definitionen am Wurzelelement, mit Rückfallwert.
   2. Das geschieht in JEDEM Wurzel-Kontext: Grund (`:root`) und jede Regel, die
      Tokens am Wurzelelement überschreibt (`html.dark-mode`, `html.high-contrast`
      …). Ein Rohwert `#fff`, ersetzt durch `var(--white)`, wäre im Grund gleich
      und im Nachtmodus nicht — genau das fällt hier auf.
   3. Ein Token, dessen Wert ein anderes Token nennt (`--karte-rahmen: 1px solid
      var(--line)`), wird am Wurzelelement aufgelöst. Überschreibt eine Regel
      unterhalb der Wurzel (`.topbar { --line: … }`) das genannte Token, sähe die
      Karte dort vorher den lokalen Wert und nachher den der Wurzel. Darum: kein
      Token, das die neue Fassung erst über ein anderes Token erreicht, darf
      unterhalb der Wurzel definiert sein.

   Verglichen wird je Regel und Eigenschaft (Selektor | Eigenschaft | n-tes
   Vorkommen). Deklarationen, die nur in einer Fassung stehen, werden gemeldet —
   sie sind nicht automatisch Fehler, aber jede ist zu begründen.

   AUFRUFE
     node tools/design-gleichstand.js --basis <git-ref>          vivodepot.html gegen den Stand im Ref
     node tools/design-gleichstand.js --vorher <a> --nachher <b>  zwei Dateien
     node tools/design-gleichstand.js ... --gate                  Exit 1 bei jeder Abweichung
     node tools/design-gleichstand.js ... --erlaubt <sel|prop>    eine erwartete Abweichung (mehrfach)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { cssQuelle } = require('./lib/kern-mit-erscheinungsbild.js');   // v894: CSS aus „Gerüst + heute"
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');
const { zerlegen, cssKommentareMaskieren } = require('./design-treue.js');

const REPO = path.join(__dirname, '..');

const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*([,()])\s*/g, '$1').trim();

/* Alle Regeln der <style>-Blöcke: { selektor, deklarationen: [[prop, wert]] }.
   @media-Kapseln werden durchlaufen; der Selektor trägt die Kapsel als Präfix. */
function regeln(css) {
  const raus = [];
  const stapel = [];
  let i = 0, start = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      const kopf = norm(css.slice(start, i));
      if (/^@(media|supports|container|layer)\b/i.test(kopf)) { stapel.push(kopf); start = i + 1; i++; continue; }
      if (/^@keyframes\b/i.test(kopf)) { stapel.push(kopf); start = i + 1; i++; continue; }
      const ende = css.indexOf('}', i);
      const koerper = css.slice(i + 1, ende);
      const deklarationen = [];
      for (const teil of koerper.split(';')) {
        const k = teil.indexOf(':');
        if (k < 0) continue;
        const prop = teil.slice(0, k).trim();
        const wert = teil.slice(k + 1).trim();
        if (prop && /^-?-?[a-zA-Z][a-zA-Z0-9-]*$/.test(prop)) deklarationen.push([prop.toLowerCase().startsWith('--') ? prop : prop.toLowerCase(), wert]);
      }
      raus.push({ selektor: (stapel.length ? stapel.join(' » ') + ' » ' : '') + kopf, kopf, deklarationen });
      i = ende + 1; start = i; continue;
    }
    if (c === '}') { stapel.pop(); start = i + 1; }
    else if (c === ';' && css.slice(start, i).trim().startsWith('@')) start = i + 1;   // @import/@charset
    i++;
  }
  return raus;
}

function lesen(text) {
  const teile = zerlegen(cssQuelle(text));
  const css = teile.style.map((b) => cssKommentareMaskieren(b.inhalt)).join('\n');
  return regeln(css);
}

const WURZEL = /^(:root|html)([.[:][^\s>+~,]*)*$/;

/* Token-Definitionen am Wurzelelement, je Kontext. */
function kontexte(rs) {
  const grund = {};
  const ueber = new Map();
  for (const r of rs) {
    if (r.selektor !== r.kopf) continue;   // in @media: kein ab-Werk-Kontext
    for (const sel of r.kopf.split(',').map((s) => s.trim())) {
      if (!WURZEL.test(sel)) continue;
      const ziel = (sel === ':root' || sel === 'html') ? grund : (ueber.get(sel) || ueber.set(sel, {}).get(sel));
      for (const [p, w] of r.deklarationen) if (p.startsWith('--')) ziel[p] = w;
    }
  }
  const raus = [{ name: ':root', tokens: grund }];
  for (const [name, t] of ueber) raus.push({ name, tokens: Object.assign({}, grund, t) });
  return raus;
}

/* Tokens, die unterhalb der Wurzel definiert werden (lokal). */
function lokaleTokens(rs) {
  const lokal = new Map();
  for (const r of rs) {
    const sels = r.kopf.split(',').map((s) => s.trim());
    if (r.selektor === r.kopf && sels.every((s) => WURZEL.test(s))) continue;
    for (const [p] of r.deklarationen) if (p.startsWith('--')) lokal.set(p, (lokal.get(p) || []).concat(r.selektor));
  }
  return lokal;
}

function aufloesen(wert, tokens, tiefe = 0, besucht = new Set()) {
  if (tiefe > 20) return wert;
  let aus = '', i = 0;
  while (i < wert.length) {
    const j = wert.indexOf('var(', i);
    if (j < 0) { aus += wert.slice(i); break; }
    aus += wert.slice(i, j);
    let k = j + 4, t = 1;
    for (; k < wert.length && t; k++) { if (wert[k] === '(') t++; else if (wert[k] === ')') t--; }
    const innen = wert.slice(j + 4, k - 1);
    const komma = innen.indexOf(',');
    const name = (komma < 0 ? innen : innen.slice(0, komma)).trim();
    const rueck = komma < 0 ? null : innen.slice(komma + 1).trim();
    if (Object.prototype.hasOwnProperty.call(tokens, name) && !besucht.has(name)) {
      aus += aufloesen(tokens[name], tokens, tiefe + 1, new Set(besucht).add(name));
    } else if (rueck != null) aus += aufloesen(rueck, tokens, tiefe + 1, besucht);
    else aus += 'var(' + innen + ')';   // lokal oder zur Laufzeit gesetzt: bleibt als Bezug stehen
    i = k;
  }
  return aus;
}

/* Tokens, die ein Wert NUR über ein anderes Token erreicht. */
function indirekt(wert, tokens) {
  const raus = new Set();
  const direkt = [...wert.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]);
  const lauf = (name, tiefe, besucht) => {
    if (tiefe > 20 || besucht.has(name) || !Object.prototype.hasOwnProperty.call(tokens, name)) return;
    besucht.add(name);
    for (const m of tokens[name].matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) { raus.add(m[1]); lauf(m[1], tiefe + 1, besucht); }
  };
  for (const d of direkt) lauf(d, 0, new Set());
  return raus;
}

function schluesselListe(rs) {
  const zaehler = new Map();
  const raus = [];
  for (const r of rs) {
    if (r.selektor === r.kopf && r.kopf.split(',').every((s) => WURZEL.test(s.trim()))) {
      // Wurzel-Token-Definitionen sind der Gegenstand, nicht das Ergebnis — außer Nicht-Token-Eigenschaften.
      for (const [p, w] of r.deklarationen) if (!p.startsWith('--')) raus.push(eintrag(r, p, w));
      continue;
    }
    for (const [p, w] of r.deklarationen) if (!p.startsWith('--')) raus.push(eintrag(r, p, w));
  }
  function eintrag(r, p, w) {
    const basis = r.selektor + ' | ' + p;
    const n = (zaehler.get(basis) || 0) + 1; zaehler.set(basis, n);
    return { schluessel: basis + ' | ' + n, selektor: r.selektor, prop: p, wert: w };
  }
  return raus;
}

/* style="…"-Zeichenketten im JS-erzeugten HTML, der Reihe nach. */
function jsStile(text) {
  const { script } = zerlegen(text);
  const raus = [];
  for (const b of script) {
    for (const m of b.inhalt.matchAll(/\bstyle\s*=\s*(\\?["'])/g)) {
      const nach = b.inhalt.slice(m.index + m[0].length);
      const e = nach.indexOf(m[1]);
      raus.push(e < 0 ? nach.slice(0, 200) : nach.slice(0, e));
    }
  }
  return raus;
}

function vergleichen(vorherText, nachherText, { erlaubt = [] } = {}) {
  const vr = lesen(vorherText), nr = lesen(nachherText);
  const vk = kontexte(vr), nk = kontexte(nachherText === vorherText ? vr : nr);
  const lokal = lokaleTokens(nr);
  const vorher = new Map(schluesselListe(vr).map((e) => [e.schluessel, e]));
  const nachher = new Map(schluesselListe(nr).map((e) => [e.schluessel, e]));
  const abweichungen = [];
  const istErlaubt = (sel, prop) => erlaubt.some((x) => (sel + '|' + prop).includes(x));

  for (const [k, n] of nachher) {
    const v = vorher.get(k);
    if (!v) { if (!istErlaubt(n.selektor, n.prop)) abweichungen.push({ art: 'neu', schluessel: k, nachher: n.wert }); continue; }
    if (norm(v.wert) === norm(n.wert)) continue;
    for (const ctxName of new Set(vk.map((c) => c.name).concat(nk.map((c) => c.name)))) {
      const vt = (vk.find((c) => c.name === ctxName) || vk[0]).tokens;
      const nt = (nk.find((c) => c.name === ctxName) || nk[0]).tokens;
      const a = norm(aufloesen(v.wert, vt)), b = norm(aufloesen(n.wert, nt));
      if (a !== b && !istErlaubt(n.selektor, n.prop)) {
        abweichungen.push({ art: 'wert', schluessel: k, kontext: ctxName, vorher: a, nachher: b });
        break;
      }
    }
    for (const t of indirekt(n.wert, nk[0].tokens)) {
      if (lokal.has(t) && !indirekt(v.wert, vk[0].tokens).has(t)) {
        abweichungen.push({ art: 'lokal', schluessel: k, token: t, orte: lokal.get(t).slice(0, 3) });
      }
    }
  }
  for (const [k, v] of vorher) {
    if (!nachher.has(k) && !istErlaubt(v.selektor, v.prop)) abweichungen.push({ art: 'entfallen', schluessel: k, vorher: v.wert });
  }

  // Neue Wurzel-Tokens dürfen nirgends sonst definiert sein: sonst gilt ihr ab-Werk-Wert nicht überall.
  const alteNamen = new Set(Object.keys(vk[0].tokens));
  for (const name of Object.keys(nk[0].tokens)) {
    if (!alteNamen.has(name) && lokal.has(name)) abweichungen.push({ art: 'neu-lokal', token: name, orte: lokal.get(name).slice(0, 3) });
  }

  // JS-erzeugte style=: dieselbe Rechnung im Grundkontext und in jedem Wurzel-Kontext.
  const vj = jsStile(vorherText), nj = jsStile(nachherText);
  if (vj.length !== nj.length) abweichungen.push({ art: 'js-anzahl', vorher: vj.length, nachher: nj.length });
  else {
    for (let i = 0; i < vj.length; i++) {
      if (vj[i] === nj[i]) continue;
      for (const c of nk) {
        const vt = (vk.find((x) => x.name === c.name) || vk[0]).tokens;
        const a = norm(aufloesen(vj[i], vt)), b = norm(aufloesen(nj[i], c.tokens));
        if (a !== b) { abweichungen.push({ art: 'js-wert', index: i, kontext: c.name, vorher: a, nachher: b }); break; }
      }
    }
  }
  return { abweichungen, kontexte: nk.map((c) => c.name), deklarationen: nachher.size };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const erlaubt = argv.flatMap((a, i) => (a === '--erlaubt' ? [argv[i + 1]] : []));
  let vorherText, nachherText;
  if (arg('--basis')) {
    vorherText = execFileSync('git', ['show', arg('--basis') + ':vivodepot.html'], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 << 20 });
    nachherText = fs.readFileSync(arg('--nachher') || path.join(REPO, 'vivodepot.html'), 'utf8');
  } else {
    vorherText = fs.readFileSync(arg('--vorher'), 'utf8');
    nachherText = fs.readFileSync(arg('--nachher'), 'utf8');
  }
  const { abweichungen, kontexte: ks, deklarationen } = vergleichen(vorherText, nachherText, { erlaubt });
  console.log(`[design-gleichstand] ${deklarationen} Deklarationen, Kontexte: ${ks.join(', ')}`);
  for (const a of abweichungen) console.log('  ' + JSON.stringify(a));
  console.log(abweichungen.length ? `[design-gleichstand] ${abweichungen.length} Abweichung(en).` : '[design-gleichstand] gleich in jedem Kontext.');
  if (abweichungen.length && argv.includes('--gate')) process.exit(1);
}

if (require.main === module) main();
module.exports = { vergleichen, aufloesen, kontexte, lesen, lokaleTokens };
