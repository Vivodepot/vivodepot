'use strict';
/* SPRUNGLINK-FEHLT (Barrierefreiheits-Audit 06.09.2026, Befund 1; WCAG 2.4.1, Stufe A)
   Kern und Lese-App hatten keinen Sprunglink: das erste fokussierbare Element war der Menü-Knopf, <main> folgte erst nach
   Topbar und Navigation. Diese Probe liest die ausgelieferten Gerüste ohne Browser und verlangt:
   - Kern: das erste fokussierbare Element in #app ist <a href="#content"> mit Text, nicht versteckt; <main id="content"> trägt
     tabindex="-1"; der Text steht in beiden Sprachen.
   - Lese-App: topbarHTML beginnt mit demselben Link, und jede Sicht, die topbarHTML rendert, trägt <main id="content" tabindex="-1">.
   - Klassenschutz über alle HTML-Anwendungen (tools/csp-bauen.js, aus dem Bestand abgeleitet): jede hat als erstes fokussierbares
     Element im <body> einen Sprunglink auf ein fokussierbares Ziel, oder steht in AUSNAHMEN mit Grund (die Liste darf nur sinken).
   Rot-Beweis: der Kern und die Lese-App von a8243ba7e (vor dem Link) fallen durch.
   Das Verhalten mit der Tastatur misst tests/e2e/sprunglink-tastatur.spec.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { anwendungen } = require('../tools/csp-bauen.js');

const REPO = path.join(__dirname, '..');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');   // im pre-commit sind GIT_DIR/GIT_INDEX_FILE gesetzt
const VORHER = 'a8243ba7e';   // der Stand vor dem Wagen; öffentlich fehlt die private Geschichte
function vorherDa() {
  try { execFileSync('git', ['cat-file', '-e', VORHER + '^{commit}'], { cwd: REPO, env: ohneGitUmgebung(), stdio: 'ignore' }); return true; } catch { return false; }
}
const vorher = (d) => execFileSync('git', ['show', VORHER + ':' + d], { cwd: REPO, env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
const lies = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');

const FOKUSSIERBAR = /<(a\b[^>]*\bhref=|button\b|input\b(?![^>]*type="hidden")|select\b|textarea\b|[a-z]+\b[^>]*\btabindex="(?!-)\d)[^>]*>/i;

/** Erstes fokussierbares Element ab `start`, ohne Kommentare und ohne SVG-Symbole. */
function erstesFokussierbares(html, start) {
  const rest = html.slice(start).replace(/<!--[\s\S]*?-->/g, '').replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
  const m = FOKUSSIERBAR.exec(rest);
  return m ? rest.slice(m.index, m.index + 300) : '';
}
/** @returns {string[]} Mängel des Sprunglinks am Anfang von `html` (ab `start`) */
function sprunglinkMaengel(html, start) {
  const erst = erstesFokussierbares(html, start);
  const m = /^<a\b([^>]*)>([^<]*)/.exec(erst);
  if (!m || !/\bhref="#([\w-]+)"/.test(m[1])) return ['erstes fokussierbares Element ist kein Sprunglink: ' + erst.slice(0, 100)];
  const fehler = [];
  const ziel = /\bhref="#([\w-]+)"/.exec(m[1])[1];
  if (/\shidden\b|display:\s*none/.test(m[1])) fehler.push('der Sprunglink ist versteckt');
  if (!m[2].trim()) fehler.push('der Sprunglink hat keinen Text');
  const zielTag = new RegExp('<[a-z]+\\b[^>]*\\bid="' + ziel + '"[^>]*>', 'i').exec(html.slice(start));   // im Gerüst, nicht in Skript-Strings davor
  if (!zielTag) fehler.push('Ziel #' + ziel + ' fehlt');
  else if (!/\btabindex="-1"/.test(zielTag[0])) fehler.push('Ziel #' + ziel + ' ist nicht fokussierbar (tabindex="-1" fehlt)');
  return fehler;
}

/** Kern: ab <div id="app"> */
function kernMaengel(html) {
  const start = html.indexOf('<div id="app">');
  if (start < 0) return ['<div id="app"> fehlt'];
  const f = sprunglinkMaengel(html, start);
  if (!f.length && !/href="#content"/.test(erstesFokussierbares(html, start))) f.push('der Sprunglink zeigt nicht auf #content');
  return f;
}
/** Lese-App: topbarHTML beginnt mit dem Link; jede Funktion, die topbarHTML rendert, trägt <main id="content" tabindex="-1">. */
function leseMaengel(html) {
  const fehler = [];
  const def = /function topbarHTML\([^)]*\) \{\s*(?:\/\/[^\n]*\n\s*)*return '([^']*)'/.exec(html);
  if (!def || !/^<a class="sprunglink"[^>]*href="#content"/.test(def[1])) fehler.push('topbarHTML beginnt nicht mit dem Sprunglink');
  const funktionen = html.split(/\nfunction /).slice(1);
  const nutzer = funktionen.filter((f) => !f.startsWith('topbarHTML(') && /\btopbarHTML\(/.test(f));
  if (nutzer.length < 3) fehler.push('zu wenige Sichten mit Topbar gefunden (' + nutzer.length + ')');
  for (const f of nutzer) {
    if (!/<main class="content" id="content" tabindex="-1">/.test(f)) fehler.push(f.slice(0, f.indexOf('(')) + ': kein <main id="content" tabindex="-1">');
  }
  return fehler;
}

test('[Sprunglink·Kern] das erste fokussierbare Element in #app ist ein Sprunglink auf <main id="content" tabindex="-1">', () => {
  assert.deepEqual(kernMaengel(lies('vivodepot.html')), []);
});

test('[Sprunglink·Kern] der Text steht auf Deutsch und Englisch', () => {
  const { ladeKern } = require('./load-kern.js');
  for (const [produkt, text] of [['privat-de', 'Zum Inhalt springen'], ['privat-en', 'Skip to content']]) {
    assert.equal(ladeKern({ produkt }).V.STRINGS.sprunglinkText, text, produkt);
  }
});

test('[Sprunglink·Lese-App] jede Sicht mit Topbar beginnt mit dem Sprunglink und trägt das Ziel', () => {
  assert.deepEqual(leseMaengel(lies('vivodepot-lesen.html')), []);
});

test('[Sprunglink·Rot-Beweis] Kern und Lese-App von a8243ba7e haben keinen Sprunglink — die Probe findet es', (t) => {
  if (!vorherDa()) return t.skip('ohne Git-Historie: der Stand ' + VORHER + ' fehlt');
  assert.match(kernMaengel(vorher('vivodepot.html')).join(' '), /kein Sprunglink/);
  assert.match(leseMaengel(vorher('vivodepot-lesen.html')).join(' '), /topbarHTML beginnt nicht/);
});

/* Klassenschutz. Ausnahmen nur mit Grund; die Liste darf nur kürzer werden. */
const AUSNAHMEN = {
  'vivodepot-vc-issuer.html': 'vor dem Inhalt steht nur ein Link (Kopf mit Marken-Link); ein Sprunglink spart keinen Tab-Schritt',
  'vivodepot-schluessel-teilen.html': 'alles steht in einem <main>, davor kein Block; vor dem Text nur der Marken-Link — ein Sprunglink spart keinen Tab-Schritt',
};
const GEPRUEFT_ANDERS = new Set(['vivodepot.html', 'vivodepot-lesen.html']);   // Gerüst per Skript, eigene Proben oben

test('[Sprunglink·Klasse] jede HTML-Anwendung hat einen Sprunglink als erstes Element im <body> — sonst eine benannte Ausnahme', () => {
  const offen = [];
  for (const d of anwendungen()) {
    if (GEPRUEFT_ANDERS.has(d) || AUSNAHMEN[d]) continue;
    const html = lies(d);
    const f = sprunglinkMaengel(html, html.search(/<body\b/));
    if (f.length) offen.push(d + ': ' + f.join('; '));
  }
  assert.deepEqual(offen, []);
  const tot = Object.keys(AUSNAHMEN).filter((d) => !anwendungen().includes(d));
  assert.deepEqual(tot, [], 'Ausnahme ohne Anwendung — streichen');
});

test('[Sprunglink·Klasse·Rot-Beweis] eine Seite ohne Sprunglink oder mit unfokussierbarem Ziel fällt auf', () => {
  assert.match(sprunglinkMaengel('<body><header><button>x</button></header><main id="m">', 0).join(), /kein Sprunglink/);
  assert.match(sprunglinkMaengel('<body><a href="#m">Zum Inhalt</a><main id="m">', 0).join(), /nicht fokussierbar/);
  assert.match(sprunglinkMaengel('<body><a href="#m" hidden>Zum Inhalt</a><main id="m" tabindex="-1">', 0).join(), /versteckt/);
  assert.deepEqual(sprunglinkMaengel('<body><a href="#m">Zum Inhalt</a><main id="m" tabindex="-1">', 0), []);
});
