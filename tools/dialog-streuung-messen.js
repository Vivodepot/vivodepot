#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Messwerkzeug „Streuung der Dialoge" (Stufe 4, UX-Bewertung 11.11.2026, Abschnitt 10: „Blatt: alle Dialoge und die Hilfe").

   Zählt je Dialog-Bauteil, wie viele VERSCHIEDENE Werte in den Stilquellen und im Inline-Stil stehen, und wie viele
   davon FREI sind (feste Länge statt Token). Bauteile: Titel, Text, Knopfzeile, Schließen-Knopf, Abstand, Breite, Radius.
   Dialog = `.modal`, `#modal-rueck`, `#overlay`, `#overlay-inhalt`, `#hilfe-overlay`, `.hilfe-*` (Hilfe, PV-/Notfallblatt-Overlay nicht).
   Gemessen werden nur Maße und Schrift (font-size/-weight, line-height, letter-spacing, padding, margin, gap, width/height,
   min-/max-, border-radius), keine Farben.

   Aufruf:  node tools/dialog-streuung-messen.js [--datei <pfad>] [--json]
     ohne Argument: Stilquellen (tools/erscheinung/stil/*.css) und vivodepot.html (Inline-Stil).
     --datei: nur diese Datei (.css = Stilquelle, sonst Markup mit Inline-Stil).
   Weg zum Nachsehen: tests/dialog-streuung-ratsche.test.js, tools/dialog-streuung-grundlinie.json.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const STILQUELLEN = ['tools/erscheinung/stil/grundlage.css', 'tools/erscheinung/stil/salbei-glas.css', 'tools/erscheinung/stil/ohne-icons.css'];
const MARKUP = ['vivodepot.html'];
const BAUTEILE = ['titel', 'text', 'knopfzeile', 'schliessen', 'abstand', 'breite', 'radius'];

const DIALOG = /\.modal(?![a-z-])|\.modal-[a-z]|#modal-rueck|#modal-inhalt|#overlay\b|#overlay-inhalt|#hilfe-|\.hilfe-|\.entsperren-/;
const SCHLIESSEN = /\.modal-x\b|#m-x\b|#hilfe-schliessen|#hilfe-zurueck/;
const KNOPFZEILE = /\.modal-aktionen|\.hilfe-toolbar|\.modal-zweit-text|\.pw-vorschlag-aktionen|\.whc-druck-zeile|\.welcome-aktionen|\.del-wahl|\.entsperren-wege/;
const TITEL = /\.modal h3|\.modal-kopf|\.modal-schritt|\.whc-abtippen-titel|\.entsperren-kopf|\.modal-logo|\.entsperren-titel/;
const TEXT = /\.modal-text|\.modal label|\.hilfe-abschnitt|\.hilfe-einleitung|\.pw-satz|\.feld-inline-fehler|\.modal-fehler|#overlay-inhalt label|\.modal-nebenweg|#m-zweit-hinweis|#whc-[a-z-]*hinweis|#whc-fehler|#crypto-fehler|\.welcome-sub|\.welcome-haftung/;

const MASS = /^(font-size|font-weight|line-height|letter-spacing|padding(-[a-z]+)?|margin(-[a-z]+)?|gap|row-gap|column-gap|width|height|min-width|min-height|max-width|max-height|border-radius)$/;
const ABSTAND = /^(padding(-[a-z]+)?|margin(-[a-z]+)?|gap|row-gap|column-gap)$/;
const BREITE = /^(width|min-width|max-width)$/;

function kommentareWeg(t) { return t.replace(/\/\*[\s\S]*?\*\//g, ''); }

/* flacher Leser: Regeln, auch innerhalb @media/@supports (eine Ebene tiefer) */
function regeln(css) {
  const t = kommentareWeg(css); const aus = [];
  function lies(s) {
    let i = 0;
    while (i < s.length) {
      const auf = s.indexOf('{', i); if (auf < 0) break;
      const kopf = s.slice(i, auf).trim();
      let tiefe = 1, j = auf + 1;
      while (j < s.length && tiefe > 0) { if (s[j] === '{') tiefe++; else if (s[j] === '}') tiefe--; j++; }
      const innen = s.slice(auf + 1, j - 1);
      if (/^@(media|supports|layer)/.test(kopf)) lies(innen);
      else if (!kopf.startsWith('@')) aus.push({ selektor: kopf, koerper: innen });
      i = j;
    }
  }
  lies(t);
  return aus;
}
function deklarationen(koerper) {
  const aus = []; let tiefe = 0, akt = '';
  for (const c of koerper) {
    if (c === '(') tiefe++; else if (c === ')') tiefe--;
    if (c === ';' && tiefe === 0) { aus.push(akt); akt = ''; } else akt += c;
  }
  if (akt.trim()) aus.push(akt);
  return aus.map((d) => { const k = d.indexOf(':'); return k < 0 ? null : { eig: d.slice(0, k).trim().toLowerCase(), wert: d.slice(k + 1).replace(/!important/i, '').replace(/\s+/g, ' ').trim().toLowerCase() }; }).filter(Boolean);
}
function selektoren(s) {
  const aus = []; let tiefe = 0, akt = '';
  for (const c of s) { if (c === '(' || c === '[') tiefe++; else if (c === ')' || c === ']') tiefe--; if (c === ',' && tiefe === 0) { aus.push(akt.trim()); akt = ''; } else akt += c; }
  if (akt.trim()) aus.push(akt.trim());
  return aus;
}
/* frei = eine feste Länge (px, rem, em, ch, cm, vh, vw, %) außerhalb von var(...); 0, 100 %, 1px und 2px (Strichstärke) gelten nicht als frei */
function istFrei(eig, wert) {
  let w = wert; let alt;
  do { alt = w; w = w.replace(/var\([^()]*\)/g, ''); } while (w !== alt);
  if (eig === 'font-weight') return false;
  if (eig === 'line-height' && /^[0-9.]+$/.test(w.trim())) return true;
  const m = w.match(/-?[0-9]*\.?[0-9]+(px|rem|em|ch|cm|vh|vw|dvh|%)/g) || [];
  return m.some((x) => !/^-?0(px|rem|em|%)?$/.test(x) && x !== '100%' && x !== '1px' && x !== '2px');
}
function sichtbarVerstecktRegel(koerper) { return /clip\s*:\s*rect\(/.test(koerper); }

function leereZaehler() {
  const z = {}; for (const b of BAUTEILE) z[b] = { werte: new Map(), freiWerte: new Set(), freiDeklarationen: 0, deklarationen: 0 };
  return z;
}
function buche(z, bauteil, eig, wert, quelle) {
  const e = z[bauteil]; e.deklarationen++;
  const schluessel = eig + ': ' + wert;
  if (!e.werte.has(schluessel)) e.werte.set(schluessel, []);
  e.werte.get(schluessel).push(quelle);
  if (istFrei(eig, wert)) { e.freiDeklarationen++; e.freiWerte.add(schluessel); }
}
function bauteileFuer(sel, eig) {
  const aus = [];
  if (SCHLIESSEN.test(sel)) aus.push('schliessen');
  else if (KNOPFZEILE.test(sel)) aus.push('knopfzeile');
  else if (TITEL.test(sel)) aus.push('titel');
  else if (TEXT.test(sel)) aus.push('text');
  if (ABSTAND.test(eig)) aus.push('abstand');
  if (BREITE.test(eig)) aus.push('breite');
  if (eig === 'border-radius') aus.push('radius');
  return aus;
}

function cssMessen(css, z, name) {
  for (const r of regeln(css)) {
    const versteckt = sichtbarVerstecktRegel(r.koerper);
    const decls = deklarationen(r.koerper);
    for (const sel of selektoren(r.selektor)) {
      if (!DIALOG.test(sel)) continue;
      for (const d of decls) {
        if (!MASS.test(d.eig)) continue;
        if (versteckt && /^(width|height|margin|padding)/.test(d.eig)) continue;
        for (const b of bauteileFuer(sel, d.eig)) buche(z, b, d.eig, d.wert, name + ' ' + sel.slice(0, 60));
      }
    }
  }
}

/* Inline-Stil im Markup: style="..." in der Nähe eines Dialogs (Zeile mit koerperHTML, modal, overlay, hilfe plus zwölf Folgezeilen) */
const FENSTER = 12;
function inlineMessen(text, z, name) {
  const zeilen = text.split('\n'); let rest = 0; let anzahl = 0;
  for (let n = 0; n < zeilen.length; n++) {
    const l = zeilen[n];
    if (/koerperHTML|modalOeffnen|overlayModal|hilfeOverlayHTML|class="modal|id="overlay|class="hilfe-|id="hilfe-/.test(l)) rest = FENSTER;
    if (rest <= 0) continue; rest--;
    const re = /style="([^"]*)"/g; let m;
    while ((m = re.exec(l))) {
      anzahl++;
      for (const d of deklarationen(m[1])) {
        if (!MASS.test(d.eig)) continue;
        const bs = bauteileFuer('.modal-text', d.eig);
        const ziel = bs.length ? bs : ['text'];
        for (const b of ziel) buche(z, b, d.eig, d.wert, name + ':' + (n + 1));
      }
    }
  }
  return anzahl;
}

function messen(quellen) {
  const z = leereZaehler(); let inlineAttribute = 0;
  for (const q of quellen) {
    if (q.art === 'css') cssMessen(q.text, z, q.name);
    else inlineAttribute += inlineMessen(q.text, z, q.name);
  }
  const ergebnis = { inlineAttribute, bauteile: {} };
  for (const b of BAUTEILE) {
    const e = z[b];
    ergebnis.bauteile[b] = { verschieden: e.werte.size, frei: e.freiWerte.size, freiDeklarationen: e.freiDeklarationen, deklarationen: e.deklarationen };
  }
  ergebnis.detail = z;
  return ergebnis;
}
function quellenLaden(datei) {
  if (datei) { const p = path.resolve(datei); return [{ name: path.basename(p), art: p.endsWith('.css') ? 'css' : 'markup', text: fs.readFileSync(p, 'utf8') }]; }
  return [...STILQUELLEN.map((q) => ({ name: q, art: 'css', text: fs.readFileSync(path.join(WURZEL, q), 'utf8') })),
    ...MARKUP.map((q) => ({ name: q, art: 'markup', text: fs.readFileSync(path.join(WURZEL, q), 'utf8') }))];
}
module.exports = { messen, quellenLaden, BAUTEILE, STILQUELLEN };

if (require.main === module) {
  const a = process.argv.slice(2); const i = a.indexOf('--datei');
  const erg = messen(quellenLaden(i >= 0 ? a[i + 1] : null));
  if (a.includes('--json')) { const o = { inlineAttribute: erg.inlineAttribute, bauteile: erg.bauteile }; process.stdout.write(JSON.stringify(o, null, 2) + '\n'); }
  else {
    console.log('Bauteil      verschiedene  frei(verschieden)  frei(Deklarationen)  Deklarationen');
    for (const b of BAUTEILE) { const e = erg.bauteile[b]; console.log(b.padEnd(12), String(e.verschieden).padStart(12), String(e.frei).padStart(18), String(e.freiDeklarationen).padStart(20), String(e.deklarationen).padStart(14)); }
    console.log('Inline-Stil-Attribute in Dialognähe: ' + erg.inlineAttribute);
    if (a.includes('--frei')) for (const b of BAUTEILE) { console.log('\n[' + b + '] freie Werte'); for (const k of erg.detail[b].freiWerte) console.log('  ' + k + '   <- ' + erg.detail[b].werte.get(k).slice(0, 2).join(' | ')); }
  }
}
