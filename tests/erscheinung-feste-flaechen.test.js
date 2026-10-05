'use strict';
/* erscheinung-feste-flaechen.test.js — feste helle Flächen und feste Farbwerte als Hintergrund (Befund 04.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Fund: `--notfall-flaeche` und `--fehler-flaeche` standen als feste helle Werte, die Schrift der Ebene darauf kippte in der
   Nacht zu hell — Notfall nachts 1,08:1, Fehlermeldung nachts 1,04:1. Der Finder im Browser (tests/e2e/ebenen-kontrast.spec.js) misst
   das Ergebnis; dieser Test hält die Ursache vorn an der Quelle fest, in zwei Regeln:
     1. Eine Flächen-Variable mit hellem Festwert hat einen Nacht-Wert — oder steht mit Grund auf der Liste.
     2. Ein fester Farbwert als `background`/`background-color` außerhalb von :root steht mit Grund auf der Liste.
   Die Liste darf wachsen, aber nur mit Grund: ein Eintrag ohne Grund ist ein Fehler. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cssZuModul } = require('../tools/erscheinungsbild-modul.js');
const k = require('../tools/lib/kontrast.js');

const REPO = path.join(__dirname, '..');
const lies = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

/* ── Regel 1: Flächen-Variablen ─────────────────────────────────────────────────────────────────────────────────── */
const FLAECHE = /flaeche|grund|papier|leiste/;
/* Eine helle Fläche ohne Nacht-Wert ist erlaubt, wenn sie durch eine REGEL gedeckt ist — nicht durch einen Namen auf einer Liste:
   PAPIER  — „Papier bleibt Papier“: Blätter (Hilfe, Dokumente, Notfallblatt, Zettel) folgen nicht der Nacht. Gedeckt ist das nur, weil ihre
             Schrift ebenfalls fest ist; darum MISST der Test jedes Paar aus einer Papier-Fläche und einer festen Schrift in allen drei Ebenen
             (≥ 4,5:1). Ein Textpaar unter Soll bleibt rot, auch wenn die Fläche unter die Regel fällt.
   OHNE VORDERGRUND — eine Fläche, auf der nie Schrift steht (der Knopf des Schalters): der einzige Name; geprüft wird, dass keine Regel, die sie
             als Hintergrund setzt, eine Schriftfarbe setzt. */
const PAPIER = /^--(?:dok|notiz|papier)-(?:grund|leiste|papier|salbei-light)$/;
/* Welche feste Schrift auf welcher Papier-Fläche steht: das Dokument-Papier trägt die Dokument-Schrift und die Blatt-Tinte, der Zettel seine Tinte,
   die helle Hinweisfläche der Blätter die Blatt-Tinte (1 und 2) und die Knopffarbe, die ein Blatt in der Nacht lokal auf den hellen Wert setzt. */
const PAPIER_SCHRIFT = [
  [/^--dok-(?:grund|leiste|papier)$/, /^--(?:dok-schrift(?:-[a-z]+)?|papier-ink[23]?)$|^--salbei-dunkel$/],
  [/^--notiz-papier$/, /^--notiz-(?:tinte|leise)$/],
  [/^--papier-salbei-light$/, /^--(?:papier-ink2?|salbei-dunkel)$/],
];
const OHNE_VORDERGRUND = { '--schalter-knopf-flaeche': 'Der Knopf des Schalters bleibt weiß und trägt keine Schrift.' };
const hexAus = (tokens, wert, tiefe = 0) => {
  if (tiefe > 8 || wert == null) return null;
  const v = String(wert).trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  const m = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(v);
  return m ? hexAus(tokens, tokens[m[1]], tiefe + 1) : null;
};
const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const leucht = (h) => k.relativeLeuchtdichte(rgb(h));
function festeHelleFlaechen(cssText) {
  const m = cssZuModul(cssText, 'probe');
  const funde = [];
  for (const [name, wert] of Object.entries(m.basis)) {
    if (!FLAECHE.test(name) || Object.prototype.hasOwnProperty.call(m.dunkel, name)) continue;
    if (/^var\(/.test(String(wert).trim())) continue;   // ein Verweis erbt den Nacht-Wert seines Ziels (das Ziel steht selbst in der Prüfung)
    const hex = hexAus(m.basis, wert);
    if (hex && leucht(hex) > 0.5) funde.push(name);
  }
  return funde.sort();
}
/* Jedes Paar aus einer Papier-Fläche und einer festen Schrift, je Ebene. Rückgabe: die Paare unter 4,5:1. */
function papierPaareUnterSoll(cssText) {
  const m = cssZuModul(cssText, 'probe');
  const unter = [];
  for (const ebene of ['basis', 'dunkel', 'hochkontrast']) {
    const t = Object.assign({}, m.basis, ebene === 'basis' ? {} : m[ebene]);
    for (const [flaecheRegel, schriftRegel] of PAPIER_SCHRIFT) for (const f of Object.keys(m.basis).filter((n) => flaecheRegel.test(n))) for (const sc of Object.keys(m.basis).filter((n) => schriftRegel.test(n))) {
      const fh = hexAus(t, t[f]), sh = hexAus(t, t[sc]);
      if (!fh || !sh) continue;
      const r = k.verhaeltnis(rgb(sh), rgb(fh));
      if (r < 4.5) unter.push(ebene + ': ' + sc + ' auf ' + f + ' = ' + r);
    }
  }
  return unter;
}
/* Rahmen: die Regeln, die eine Fläche als Hintergrund setzen — mit ihrem Selektor und ob sie eine Schriftfarbe setzen. */
function regelnMitHintergrund(cssText, token) {
  const t = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus = [];
  for (const r of t.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (new RegExp('background(?:-color)?\\s*:\\s*var\\(\\s*' + token + '\\s*\\)').test(r[2])) aus.push({ selektor: r[1].trim(), setztSchriftfarbe: /(?:^|;)\s*color\s*:/.test(r[2]) });
  }
  return aus;
}

test('[Feste Flächen] jede helle Flächen-Variable hat einen Nacht-Wert, fällt unter die Papier-Regel oder ist eine Fläche ohne Vordergrund', () => {
  const funde = festeHelleFlaechen(lies('tools/erscheinung/heute.css'));
  const ausserhalb = funde.filter((n) => !PAPIER.test(n) && !OHNE_VORDERGRUND[n]);
  assert.deepEqual(ausserhalb, [], 'helle Fläche ohne Nacht-Wert, nicht durch die Papier-Regel und nicht als Fläche ohne Vordergrund gedeckt');
  for (const [n, grund] of Object.entries(OHNE_VORDERGRUND)) assert.ok(grund.length > 15, n + ': ein Eintrag ohne Grund');
  assert.deepEqual(funde.filter((n) => OHNE_VORDERGRUND[n]), Object.keys(OHNE_VORDERGRUND), 'die Fläche ohne Vordergrund steht nicht mehr in heute.css oder trägt einen Nacht-Wert');
  assert.deepEqual(funde.filter((n) => PAPIER.test(n)), ['--dok-grund', '--dok-leiste', '--dok-papier', '--notiz-papier', '--papier-salbei-light'],
    'die Papier-Regel deckt eine andere Menge als bei der Einführung — neue Papier-Fläche bewusst prüfen');
});

test('[Feste Flächen] jedes Paar aus Papier-Fläche und fester Schrift erreicht 4,5:1 in allen drei Ebenen', () => {
  assert.deepEqual(papierPaareUnterSoll(lies('tools/erscheinung/heute.css')), []);
});

test('[Feste Flächen] die Fläche ohne Vordergrund setzt in keiner Regel eine Schriftfarbe', () => {
  const css = lies('tools/erscheinung/stil/grundlage.css');
  for (const token of Object.keys(OHNE_VORDERGRUND)) {
    const regeln = regelnMitHintergrund(css, token);
    assert.ok(regeln.length > 0, token + ': keine Regel setzt sie als Hintergrund — der Eintrag ist überholt');
    assert.deepEqual(regeln.filter((r) => r.setztSchriftfarbe), [], token + ': eine Regel setzt Schrift auf diese Fläche');
  }
});

test('[Feste Flächen·Rot-Beweis] ohne den Nacht-Wert von --notfall-flaeche fällt der Wächter an', () => {
  const quelle = lies('tools/erscheinung/heute.css');
  assert.ok(/--notfall-flaeche: #2b1a17;/.test(quelle), 'Voraussetzung: der Nacht-Wert steht in heute.css');
  const ohne = quelle.replace('--notfall-flaeche: #2b1a17;', '');
  assert.ok(festeHelleFlaechen(ohne).includes('--notfall-flaeche'));
  assert.ok(!PAPIER.test('--notfall-flaeche') && !OHNE_VORDERGRUND['--notfall-flaeche'], 'die Notfall-Fläche ist weder Papier noch ohne Vordergrund');
});

test('[Feste Flächen·Rot-Beweis] ein Textpaar unter Soll auf einer Papier-Fläche bleibt rot, auch wenn die Fläche unter die Regel fällt', () => {
  const quelle = lies('tools/erscheinung/heute.css');
  // eine helle Schrift auf dem Dokument-Papier
  const hell = quelle.replace(/--dok-schrift: #111;/, '--dok-schrift: #dddddd;');
  assert.notEqual(hell, quelle, 'Voraussetzung: --dok-schrift steht als #111 in heute.css');
  assert.ok(papierPaareUnterSoll(hell).some((z) => /--dok-schrift auf --dok-papier/.test(z)), papierPaareUnterSoll(hell).join('; '));
  // eine dunkle Papier-Fläche mit der festen dunklen Schrift
  const dunkel = quelle.replace(/--dok-papier: #fff;/, '--dok-papier: #223322;');
  assert.notEqual(dunkel, quelle, 'Voraussetzung: --dok-papier steht als #fff in heute.css');
  assert.ok(papierPaareUnterSoll(dunkel).some((z) => /auf --dok-papier/.test(z)));
});

test('[Feste Flächen·Rot-Beweis] eine Schriftfarbe auf der Fläche ohne Vordergrund fällt an', () => {
  const css = lies('tools/erscheinung/stil/grundlage.css').replace('background: var(--schalter-knopf-flaeche);', 'background: var(--schalter-knopf-flaeche); color: var(--ink);');
  const regeln = regelnMitHintergrund(css, '--schalter-knopf-flaeche');
  assert.ok(regeln.some((r) => r.setztSchriftfarbe));
});

test('[Feste Flächen·Rot-Beweis] auch ein vorhandener, aber heller Nacht-Wert zählt nicht: die Messung am Ergebnis steht im Finder', () => {
  // Der Wächter oben kennt nur „vorhanden“. Dass ein heller Nacht-Wert nicht genügt, hält tests/e2e/ebenen-kontrast.spec.js
  // (Rot-Beweis „ein zu heller Nacht-Wert macht den Finder rot“). Hier nur die Verweisprobe, damit beide zusammenbleiben.
  assert.ok(/zu heller Nacht-Wert macht den Finder rot/.test(lies('tests/e2e/ebenen-kontrast.spec.js')));
});

/* ── Regel 2: feste Farbwerte als Hintergrund ───────────────────────────────────────────────────────────────────── */
const FESTE_HINTERGRUENDE = [
  ['vivodepot.html', '#fff', 'Die Fehlerseite vor jeder Gestaltung (Sperre: Seite lädt nicht): sie läuft, bevor Stil und Token da sind.'],
  ['vivodepot-lesen.html', '#fff', 'Die Lese-App hat keine Nacht- und keine Hochkontrast-Ebene und eine eigene Palette (Karte, Hover).'],
  ['vivodepot-lesen.html', '#fff', 'Wie oben (zweite Karte).'],
  ['vivodepot-lesen.html', '#3d5878', 'Wie oben: Vollmacht-Ton der Lese-App, feste Fläche mit fester heller Schrift.'],
  ['vivodepot-lesen.html', '#a82a1c', 'Wie oben: Notfall-Kopfzeile der Lese-App, feste Fläche mit fester heller Schrift.'],
  ['vivodepot-lesen.html', '#3d5878', 'Wie oben (Vorführleiste, Vollmacht).'],
  ['vivodepot-lesen.html', '#3d5878', 'Wie oben (Vorführspalte, Vollmacht).'],
];
function festeHintergruende(datei, text) {
  const t = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus = [];
  for (const m of t.matchAll(/background(?:-color)?\s*:\s*([^;}"']*)/g)) {
    const v = m[1];
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b/.test(v) && !/^\s*var\(/.test(v)) aus.push([datei, v.trim().split(/\s+/)[0]]);
  }
  return aus;
}
const DATEIEN = ['tools/erscheinung/stil/grundlage.css', 'vivodepot.html', 'vivodepot-lesen.html'];

test('[Feste Flächen] jeder feste Farbwert als Hintergrund außerhalb von :root steht mit Grund auf der Liste', () => {
  const ist = DATEIEN.flatMap((d) => festeHintergruende(path.basename(d), lies(d)));
  const soll = FESTE_HINTERGRUENDE.map(([d, w]) => [d, w]);
  assert.deepEqual(ist, soll, 'ein fester Hintergrund ist dazugekommen oder weggefallen — mit Grund auf die Liste, oder als Token');
  for (const [, , grund] of FESTE_HINTERGRUENDE) assert.ok(grund.length > 15, 'ein Eintrag ohne Grund');
});

test('[Feste Flächen·Rot-Beweis] ein neuer fester Hintergrund wird gefunden, ein Token nicht', () => {
  assert.deepEqual(festeHintergruende('x', '.a { background: #fff; } .b { background: var(--white); } .c { background-color: rgba(0,0,0,.1); }'),
    [['x', '#fff'], ['x', 'rgba(0,0,0,.1)']]);
});
