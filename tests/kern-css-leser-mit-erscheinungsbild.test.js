'use strict';
/* Wächter: wer CSS aus einem Kern liest, liest „Gerüst + heute" (v894, U2-ADR-473 Nachtrag, Lesart B)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Seit v894 trägt das Gerüst kein Stylesheet mehr; es steht im Erscheinungsbild-Modul (Quellen: tools/erscheinung/). Ein
   Werkzeug, das weiter nur die <style>-Blöcke der Datei liest, sieht ein fast leeres Blatt — und meldet still grün (ein
   Wächter, der nichts mehr findet) oder falsche Zahlen (Faktenbasis, Styleguide). Beim Umbau fielen sieben solche Werkzeuge
   auf, einzeln, über rote Proben; dieser Wächter fängt das nächste, bevor es still wird.

   Regel: jede Datei unter tools/ und scripts/, die CSS aus <style>-Blöcken herausschneidet, lädt
   tools/lib/kern-mit-erscheinungsbild.js (cssQuelle/kernMitHeute) — oder steht unten mit Grund auf der Positivliste. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

// Die Lesewege, an denen CSS aus einem HTML-Text geschnitten wird.
const LESEWEGE = [
  /<style[^\n]{0,24}>\(\[\\s\\S\]\*\?\)/,          // /<style[^>]*>([\s\S]*?)<\/style>/ und Verwandte
  /['"]<style id="design-system">['"]/,             // Anker über die Kennung
  /<\(script\|style\)\\b/,                            // design-treue.js: zerlegen()
  /\bteile\.style\b/,                                 // Nutzer von design-treue.js zerlegen()
  /\(\[\^\{\}\]\+\)\\\{/,                                   // eine CSS-Regel als Muster: /([^{}]+)\{…/ (css-tote-html-regeln.js)
];
const NUTZT_ZUSAMMENSETZER = /kern-mit-erscheinungsbild(\.js)?['"]/;

const POSITIVLISTE = {
  'tools/abgeloeste-farben-pruefen.js': 'liest die Erscheinungsbild-Quellen selbst (tools/erscheinung/*.css und stil/*.css)',
  'tools/css-eigenschaftsnamen-pruefen.js': 'liest die Erscheinungsbild-Quellen selbst (erscheinungsbildQuellen)',
  'tools/design-treue.js': 'liest die stil-Quellen selbst (_mitStilQuellen)',
  'tools/erscheinungsbild-waechter-pruefen.js': 'Gegenstand ist gerade das Gerüst: Gestaltung außerhalb der Region',
  'tools/erzeuger-marken-palette-pruefen.js': 'prüft das Studio, nicht den Kern',
  'tools/erscheinungsbild-modul.js': 'baut das Modul aus den Erscheinungsbild-Quellen selbst (heute.css, stil/*.css)',
  'tools/lib/kern-mit-erscheinungsbild.js': 'ist der Zusammensetzer selbst',
};

function alleJs(ordner) {
  if (!fs.existsSync(ordner)) return [];
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules') return [];
    const p = path.join(ordner, e.name);
    return e.isDirectory() ? alleJs(p) : (e.name.endsWith('.js') ? [p] : []);
  });
}

const liestCss = (text) => LESEWEGE.some((r) => r.test(text));

function befund(dateien) {
  const raus = [];
  for (const [rel, text] of dateien) {
    if (!liestCss(text) || NUTZT_ZUSAMMENSETZER.test(text) || POSITIVLISTE[rel]) continue;
    raus.push(rel);
  }
  return raus;
}

const echteDateien = () => [...alleJs(path.join(REPO, 'tools')), ...alleJs(path.join(REPO, 'scripts'))]
  .map((p) => [path.relative(REPO, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')]);

test('[Kern-CSS-Leser] jedes Werkzeug, das CSS aus <style> schneidet, liest „Gerüst + heute" oder steht mit Grund auf der Liste', () => {
  assert.deepEqual(befund(echteDateien()), [],
    'diese Werkzeuge lesen nur das Gerüst — cssQuelle() aus tools/lib/kern-mit-erscheinungsbild.js davorsetzen');
});

test('[Kern-CSS-Leser] keine tote Ausnahme: jeder Eintrag der Positivliste liest wirklich CSS und braucht die Ausnahme', () => {
  const karte = new Map(echteDateien());
  for (const [rel, grund] of Object.entries(POSITIVLISTE)) {
    assert.ok(karte.has(rel), rel + ' gibt es nicht mehr — Eintrag streichen');
    assert.ok(liestCss(karte.get(rel)), rel + ' liest kein CSS mehr — Eintrag streichen (' + grund + ')');
    assert.ok(!NUTZT_ZUSAMMENSETZER.test(karte.get(rel)), rel + ' nutzt den Zusammensetzer — Eintrag streichen');
  }
});

test('[Kern-CSS-Leser] Positivkontrolle: die umgestellten Werkzeuge werden als Leser erkannt', () => {
  // Die Werkzeuge, die cssQuelle() nutzen — erkannt an ihrem Inhalt statt am Namen; im öffentlichen Zuschnitt fehlen einige.
  const umgestellt = echteDateien().filter(([rel, text]) => NUTZT_ZUSAMMENSETZER.test(text) && rel !== 'tools/lib/kern-mit-erscheinungsbild.js');
  assert.ok(umgestellt.length >= 4, 'die umgestellten Werkzeuge werden gefunden');
  for (const [rel, text] of umgestellt) {
    assert.ok(liestCss(text), rel + ' wird nicht als CSS-Leser erkannt — der Wächter sähe einen Rückfall nicht');
  }
});

test('[Kern-CSS-Leser·Rot-Beweis] ein neues Werkzeug, das nur die <style>-Blöcke liest, fällt auf; mit cssQuelle nicht', () => {
  const roh = "const css = [...html.matchAll(/<style[^>]*>([\\s\\S]*?)<\\/style>/g)].map((m) => m[1]).join('\\n');";
  assert.deepEqual(befund([['beispiel-neu-messen', roh]]), ['beispiel-neu-messen']);
  const anker = "const MARKER = '<style id=\"design-system\">';";
  assert.deepEqual(befund([['beispiel-neu-anker', anker]]), ['beispiel-neu-anker']);
  const mit = "const { cssQuelle } = require('./lib/kern-mit-erscheinungsbild.js');\n" + roh;
  assert.deepEqual(befund([['beispiel-neu-messen', mit]]), []);
});
