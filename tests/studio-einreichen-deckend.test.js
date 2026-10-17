'use strict';
/* Studio: der Dialog „Einreichen“ ist deckend, der Hintergrund gedimmt, der Text gut lesbar (16.10.2026)

   Befund am Bild der gebauten Folge (1280 px): der Dialog und seine Schritte waren Glas (rgba(…, .72) und .62 mit Weichzeichner);
   hinter „Sicherung speichern“ las man die Formularseite mit („Vollständiger Name“, „Geburtsdatum“ …). Gemessen am Quelltext:
     · die Regeln für #dlg-fertig stehen NACH den Glasregeln (die Kaskade entscheidet für sie) und setzen deckende Farben und
       backdrop-filter: none;
     · der Hintergrund hinter dem Dialog ist gedimmt (::backdrop mit Deckkraft ≥ .5);
     · Text (--ink, --ink2) auf den deckenden Flächen erreicht mindestens 4,5 : 1 (WCAG 2.2, 1.4.3).
   ROT-BEWEIS: eine Fassung mit Glas im Dialog, eine vor den Glasregeln und eine mit zu hellem Text werden gemeldet.
   Den Augenschein in WebKit (1280, iPad quer) hält das Aufnahme-Skript im Bericht fest; diese Probe hält die Ursache. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

function regel(html, selektor) {
  const i = html.indexOf('\n' + selektor + ' {');
  if (i < 0) return null;
  return { stelle: i, text: html.slice(i, html.indexOf('}', i) + 1) };
}
function farbe(css) {
  const m = /background:\s*(#[0-9a-fA-F]{6}|rgba?\(([^)]*)\))/.exec(css);
  if (!m) return null;
  if (m[1][0] === '#') return { hex: m[1], alpha: 1 };
  const t = m[2].split(',').map((x) => x.trim());
  return { rgb: t.slice(0, 3).map(Number), alpha: t.length > 3 ? Number(t[3]) : 1 };
}
function luminanz(hex) {
  const k = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
const kontrast = (a, b) => { const [x, y] = [luminanz(a), luminanz(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const token = (html, name) => (new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})').exec(html) || [])[1];

function befunde(html) {
  const f = [];
  const glas = html.indexOf('\ndialog.dlg { background: rgba(');
  const dlg = regel(html, '#dlg-fertig');
  if (!dlg) return ['dialog-regel-fehlt'];
  if (glas < 0 || dlg.stelle < glas) f.push('dialog-vor-den-glasregeln');
  const d = farbe(dlg.text);
  if (!d || d.alpha < 1) f.push('dialog-nicht-deckend');
  if (!/backdrop-filter:\s*none/.test(dlg.text)) f.push('dialog-mit-weichzeichner');
  const schritt = regel(html, '#dlg-fertig .fs, #dlg-fertig .karte-innen');
  const s = schritt && farbe(schritt.text);
  if (!s || s.alpha < 1 || !/backdrop-filter:\s*none/.test(schritt.text)) f.push('schritte-nicht-deckend');
  const hinten = regel(html, '#dlg-fertig::backdrop');
  const h = hinten && farbe(hinten.text);
  if (!h || h.alpha < 0.5) f.push('hintergrund-nicht-gedimmt');
  for (const t of ['ink', 'ink2']) {
    const vorne = token(html, t);
    for (const flaeche of [d && d.hex, s && s.hex, '#ffffff'].filter(Boolean)) {
      if (!vorne || kontrast(vorne, flaeche) < 4.5) f.push('kontrast-' + t + '-auf-' + flaeche);
    }
  }
  return f;
}

test('[Einreichen·Deckend] Dialog und Schritte deckend, Hintergrund gedimmt, Text mit mindestens 4,5 : 1', () => {
  assert.deepEqual(befunde(HTML), []);
});

test('[Einreichen·Deckend·Rot-Beweis] Glas im Dialog, eine Regel vor den Glasregeln und zu heller Text werden gemeldet', () => {
  const faelle = [
    ['dialog-nicht-deckend', HTML.replace('#dlg-fertig { background: #fbfcf8;', '#dlg-fertig { background: rgba(255,255,255,.72);')],
    ['dialog-mit-weichzeichner', HTML.replace('#dlg-fertig { background: #fbfcf8; -webkit-backdrop-filter: none; backdrop-filter: none; }', '#dlg-fertig { background: #fbfcf8; backdrop-filter: blur(24px); }')],
    ['hintergrund-nicht-gedimmt', HTML.replace('#dlg-fertig::backdrop { background: rgba(28,42,30,.55); }', '#dlg-fertig::backdrop { background: rgba(28,42,30,.1); }')],
    ['dialog-vor-den-glasregeln', (() => {
      const r = regel(HTML, '#dlg-fertig').text;
      return HTML.replace(r, '').replace('\n<style', r + '\n<style');
    })()],
    ['kontrast-ink2-auf-#fbfcf8', HTML.replace(/--ink2:\s*#[0-9a-fA-F]{6}/, '--ink2: #b8c2b8')],
  ];
  for (const [kennung, schlecht] of faelle) {
    assert.notEqual(schlecht, HTML, kennung + ': die Verschlechterung hat nichts geändert');
    assert.ok(befunde(schlecht).includes(kennung), kennung + ' wird nicht gemeldet: ' + befunde(schlecht).join());
  }
});
