#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   overlay-schreiber-pruefen.js — kein Overlay geht bei offenem Depot verdeckt auf (U2-ADR-463, 01.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Sichtbar wird das Overlay nur über `overlayModalOeffnen()`; solange die App offen ist, gilt `#overlay.weg {display:none}`.
   Ein Aufruf, der den Overlay-Inhalt schreibt, ohne es nach vorn zu holen, schreibt ins Unsichtbare — so lag der
   Öffnen-Schirm nach einem Doppelklick bei offenem Depot hinter der App (Befund aus der Gegenprobe).

   REGEL je Aufruf eines Overlay-Schreibers (außerhalb der Schreiber selbst):
     (a) in der innersten umgebenden Funktion steht VOR dem Aufruf `overlayModalOeffnen(` oder `geheZuZuhause(`, oder
     (b) die innerste Funktion ist `const NAME = (…) => {…}` und die umgebende übergibt sie mit `geheZuZuhause(NAME)`, oder
     (c) die Stelle steht in der Positivliste unten — JEDE mit Grund. Neue Einträge nur mit Wort der Gegenlesung.

   Aufruf:  node tools/overlay-schreiber-pruefen.js [--datei <vivodepot.html>]   → Exit 1 bei ungedeckten Stellen
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const SCHREIBER = ['renderWelcome', 'renderCryptoOverlay', 'renderCodeOeffnen', 'renderAnlassAuswahl', 'zeigeSchlussSicht'];
const NUR_SICHTBAR = 'nur bei sichtbarem Overlay';
const NUR_START = 'nur beim Start';
// Schlüssel: <oberste Funktion> · <Aufruf ohne Argumente>. Der Grund sagt, warum die App dort nie offen ist.
const POSITIV = Object.freeze({
  '_ablageortOeffnen · renderCryptoOverlay': NUR_SICHTBAR + ' (Knopf eines gemerkten Orts auf dem Startschirm)',
  'renderWelcome · renderWelcome @ if (spracheKnopf) spracheKnopf.onclick = () =>': NUR_SICHTBAR + ' (Sprachschalter auf dem Startschirm)',
  "renderWelcome · renderAnlassAuswahl @ verdrahteEintritt('w-anlass', () =>": NUR_SICHTBAR + ' (Knopf „Weiter“ auf dem Startschirm)',
  'renderWelcome · renderCryptoOverlay': NUR_SICHTBAR + ' (Knopf „Datei öffnen“ auf dem Startschirm)',
  "renderCryptoOverlay · renderCryptoOverlay @ w('vor-depot-sprache', () =>": NUR_SICHTBAR + ' (Sprachschalter im Öffnen-Schirm)',
  "renderCryptoOverlay · renderCodeOeffnen @ w('co-code', () =>": NUR_SICHTBAR + ' (Link „Mit Wiederherstellungs-Code öffnen“)',
  "renderCryptoOverlay · renderWelcome @ w('co-neu', () =>": NUR_SICHTBAR + ' (Link „Doch neu anfangen“)',
  'renderCodeOeffnen · renderCryptoOverlay': NUR_SICHTBAR + ' (Zurück im Code-Schirm)',
  'flowTrotzdemSchliessen · zeigeSchlussSicht': 'Schluss-Sicht nach dem Schließen; die App ist verlassen (window.close-Rückfall)',
  'booteInternenStandVielleicht · renderCryptoOverlay': NUR_START + ' (interner Stand beim Boot)',
  'booteEingang · renderWelcome @ vorDepotKonfigurationAnwenden().then(() =>': NUR_START + ' (nach der Vor-Depot-Konfiguration)',
  'booteEingang · renderCryptoOverlay': NUR_START + ' (URL-Marker ?datei)',
  'booteEingang · renderWelcome': NUR_START + ' (Kalt-Start und Rückfall bei einem Render-Fehler)',
  "booteEingang · renderCryptoOverlay @ ov.addEventListener('drop', (e) =>": NUR_SICHTBAR + ' (Drop am #overlay, das bei offener App display:none ist)',
});

function obersteFunktion(zeilen, i) {
  for (let j = i; j >= 0; j--) { const m = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(zeilen[j]); if (m) return m[1]; }
  return '(außerhalb)';
}
// Innerste umgebende Funktion: rückwärts Klammern zählen bis zur öffnenden `{`, deren Kopf eine Funktion ist.
function innersteFunktion(text, ort) {
  let tiefe = 0;
  for (let i = ort - 1; i >= 0; i--) {
    const c = text[i];
    if (c === '}') tiefe++;
    else if (c === '{') {
      if (tiefe > 0) { tiefe--; continue; }
      const kopf = text.slice(Math.max(0, i - 160), i);
      if (/=>\s*$/.test(kopf) || /function\s*[\w$]*\s*\([^)]*\)\s*$/.test(kopf)) return { start: i, kopf };
    }
  }
  return { start: 0, kopf: '' };
}
function blockEnde(text, start) {
  let tiefe = 0;
  for (let i = start; i < text.length; i++) { if (text[i] === '{') tiefe++; else if (text[i] === '}') { tiefe--; if (tiefe === 0) return i; } }
  return text.length;
}

function pruefen(text) {
  const zeilen = text.split('\n');
  const zeilenStart = []; let z = 0; for (const l of zeilen) { zeilenStart.push(z); z += l.length + 1; }
  const zeileVon = (ort) => { let lo = 0, hi = zeilenStart.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (zeilenStart[m] <= ort) lo = m; else hi = m - 1; } return lo; };
  const stellen = [];
  const re = new RegExp('(?<![\\w$.])(' + SCHREIBER.join('|') + ')\\(', 'g');
  let m;
  while ((m = re.exec(text))) {
    const zi = zeileVon(m.index);
    const zeile = zeilen[zi];
    const vorher = zeile.slice(0, m.index - zeilenStart[zi]);
    const imBlockKommentar = text.lastIndexOf('/*', m.index) > text.lastIndexOf('*/', m.index);
    const imHtmlKommentar = text.lastIndexOf('<!--', m.index) > text.lastIndexOf('-->', m.index);
    if (imBlockKommentar || imHtmlKommentar || /^\s*(\/\/|\*)/.test(zeile) || vorher.includes('//') || /function\s+$/.test(vorher)) continue;   // Kommentar, Definition des Schreibers selbst
    const oben = obersteFunktion(zeilen, zi);
    const inner = innersteFunktion(text, m.index);
    const bisHier = text.slice(inner.start, m.index);
    let gedeckt = /overlayModalOeffnen\(|geheZuZuhause\(/.test(bisHier);
    if (!gedeckt) {
      const name = /const\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*$/.exec(inner.kopf);
      if (name) {
        const aussen = innersteFunktion(text, inner.start);
        const aussenText = text.slice(aussen.start, blockEnde(text, aussen.start));
        gedeckt = new RegExp('geheZuZuhause\\(' + name[1] + '\\)').test(aussenText);
      }
    }
    // Der Kopf der innersten Funktion trennt Wege in derselben obersten Funktion (Drop, Adress-Marker, launchQueue im Boot).
    const kopfKurz = (inner.kopf.split(/[;\n]/).pop() || '').replace(/\s+/g, ' ').trim().slice(-60);
    const schluessel = oben + ' · ' + m[1] + (kopfKurz && !/^(?:async )?function /.test(kopfKurz) ? ' @ ' + kopfKurz : '');
    stellen.push({ zeile: zi + 1, schluessel, gedeckt, grund: POSITIV[schluessel] || null });
  }
  const ungedeckt = stellen.filter((s) => !s.gedeckt && !s.grund);
  const benutzt = new Set(stellen.filter((s) => !s.gedeckt && s.grund).map((s) => s.schluessel));
  const verwaist = Object.keys(POSITIV).filter((k) => !benutzt.has(k));
  return { stellen, ungedeckt, verwaist };
}

if (require.main === module) {
  const i = process.argv.indexOf('--datei');
  const datei = i > 0 ? process.argv[i + 1] : path.join(__dirname, '..', 'vivodepot.html');
  const r = pruefen(fs.readFileSync(datei, 'utf8'));
  console.log('Overlay-Schreiber: ' + r.stellen.length + ' Aufrufe, ' + r.stellen.filter((s) => s.gedeckt).length + ' gedeckt, '
    + r.stellen.filter((s) => !s.gedeckt && s.grund).length + ' über die Positivliste.');
  for (const s of r.ungedeckt) console.log('  UNGEDECKT Z. ' + s.zeile + ': ' + s.schluessel);
  for (const k of r.verwaist) console.log('  VERWAIST in der Positivliste: ' + k);
  process.exitCode = (r.ungedeckt.length || r.verwaist.length) ? 1 : 0;
}
module.exports = { pruefen, POSITIV, SCHREIBER };
