'use strict';
/* Rahmen-Schutz ohne Header (B16-ADR-066; Kern-Kommentar vor `<script id="rahmen-schutz">`). `frame-ancestors`
   wirkt nur als HTTP-Header, und kein Ausliefer-Weg setzt einen (file://, gehostete Fassung ohne eigene
   Response-Header, der Webspace von register.vivodepot.de). Darum verbirgt eine CSS-Regel den Inhalt, bis ein
   Skript ihn freigibt — nur wenn die Seite das oberste Fenster ist. In einem fremden Rahmen leitet sie das
   umgebende Fenster auf sich um; scheitert das, bleibt der Inhalt verborgen.
   Die Kern-Kommentare nannten diese Probe seit dem 18.09.2026, die Datei fehlte (Befund RAHMEN-SCHUTZ-PROBE).
   Gemessen wird der ausgelieferte Block selbst: Stil und Skript werden aus der Datei gelesen und in drei Lagen
   ausgeführt — oberstes Fenster, fremder Rahmen, fremder Rahmen mit gesperrter Umleitung.

   KLASSE (GENERATOR-RAHMEN, 26.09.2026): der Template-Generator lief live auf register.vivodepot.de/generator.html
   ohne diesen Block — er hält Signier- und Empfangsschlüssel im Speicher (U2-ADR-436). Nicht nur Kern und Lese-App,
   JEDE ausgelieferte HTML-Seite trägt den Block: jede HTML-Datei in der Wurzel des Repos, ausser den benannten
   Ausnahmen unten. Eine neue HTML-Datei in der Wurzel ohne Block oder ohne benannte Ausnahme fällt an der
   Vollständigkeitsprobe durch.
   Die erzeugte Register-Seite (tools/feldregister-bauen.js, register.vivodepot.de/) ist eine benannte Ausnahme: sie ist
   absichtlich ohne jedes Skript gebaut (tests/feldregister-bauen.test.js, U2-ADR-409) — eine statische Liste mit Links,
   ohne Eingabe, ohne Daten, ohne Schlüssel. Die Probe hält genau diesen Grund fest: trägt die Seite je ein Skript, ein
   Formular oder ein Eingabefeld, gilt die Ausnahme nicht mehr und die Probe ist rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const DATEIEN = [
  'vivodepot.html',
  'vivodepot-lesen.html',
  'vivodepot-studio.html',
  'vivodepot-vc-issuer.html',
  'vivodepot-schluessel-teilen.html',
];
// Benannte Ausnahmen — HTML in der Wurzel, die keinen Block tragen muss, mit Grund.
const AUSNAHMEN = {
  'vivodepot-style-guide.html': 'Gestaltungs-Dokumentation: trägt weder Daten noch Schlüssel noch eine Bedienung, die in einem fremden Rahmen etwas auslösen könnte',
};

function block(html) {
  const stil = html.match(/<style id="rahmen-verbergen">([\s\S]*?)<\/style>/);
  const skript = html.match(/<script id="rahmen-schutz">([\s\S]*?)<\/script>/);
  return { stil: stil && stil[1], skript: skript && skript[1], stilIndex: stil ? stil.index : -1, bodyIndex: html.search(/<body[\s>]/) };
}

// Führt das Skript in einer Lage aus und meldet: ist der Verberge-Stil noch da, wohin wurde umgeleitet?
function lage(skript, { imRahmen, umleitungGesperrt }) {
  let stilDa = true;
  let umgeleitetAuf = null;
  const selbst = { location: { href: 'file:///depot/vivodepot.html' } };
  const oben = imRahmen ? {} : selbst;
  if (imRahmen) {
    Object.defineProperty(oben, 'location', {
      get() { throw new Error('fremder Ursprung: lesen verboten'); },
      set(v) { if (umleitungGesperrt) throw new Error('sandbox: Navigation verboten'); umgeleitetAuf = v; },
    });
  }
  const fenster = { self: selbst, top: oben };
  const dokument = { getElementById: (id) => (id === 'rahmen-verbergen' && stilDa ? { remove() { stilDa = false; } } : null) };
  vm.runInNewContext(skript, { window: fenster, document: dokument });
  return { stilDa, umgeleitetAuf };
}

// Die Mängel einer Seite, leer wenn der Schutz trägt.
function schutzMaengel(html) {
  const b = block(html);
  if (!b.stil || !b.skript) return ['kein Rahmen-Schutz-Block (style#rahmen-verbergen + script#rahmen-schutz)'];
  const m = [];
  if (!/body\s*\{\s*display\s*:\s*none\s*!important\s*\}/.test(b.stil)) m.push('der Verberge-Stil verbirgt den body nicht mit !important');
  if (!(b.bodyIndex > 0 && b.stilIndex < b.bodyIndex)) m.push('der Verberge-Stil steht nicht vor dem body');
  const soll = [
    [{ imRahmen: false }, { stilDa: false, umgeleitetAuf: null }, 'oberstes Fenster wird nicht freigegeben'],
    [{ imRahmen: true, umleitungGesperrt: false }, { stilDa: true, umgeleitetAuf: 'file:///depot/vivodepot.html' }, 'im fremden Rahmen nicht umgeleitet oder freigegeben'],
    [{ imRahmen: true, umleitungGesperrt: true }, { stilDa: true, umgeleitetAuf: null }, 'bei gesperrter Umleitung freigegeben'],
  ];
  for (const [l, erwartet, text] of soll) {
    try { if (JSON.stringify(lage(b.skript, l)) !== JSON.stringify(erwartet)) m.push(text); } catch (e) { m.push('das Skript wirft: ' + e.message); }
  }
  return m;
}

function registerSeite() {
  return require('../tools/feldregister-bauen.js').bauen({ datum: '2026-09-26' }).html;
}

test('[Rahmen-Schutz · Klasse] jede HTML-Datei in der Wurzel trägt den Block oder steht als benannte Ausnahme', () => {
  const wurzel = execFileSync('git', ['ls-files', '*.html'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n').filter((f) => f && !f.includes('/'));
  assert.ok(wurzel.includes('vivodepot.html'), 'Vorbedingung: die Liste der Wurzel-Dateien ist gelesen');
  assert.deepEqual(wurzel.filter((f) => !DATEIEN.includes(f) && !AUSNAHMEN[f]), [], 'neue HTML-Datei ohne Rahmen-Schutz und ohne benannte Ausnahme');
  assert.deepEqual(DATEIEN.filter((f) => !wurzel.includes(f)), [], 'die Liste nennt eine Datei, die es nicht mehr gibt');
});

for (const datei of DATEIEN) {
  test('[Rahmen-Schutz · ' + datei + '] oberstes Fenster: frei · fremder Rahmen: umgeleitet, verborgen · Umleitung gesperrt: verborgen', () => {
    assert.deepEqual(schutzMaengel(fs.readFileSync(path.join(REPO, datei), 'utf8')), []);
  });
}

// Warum die Register-Seite keinen Block braucht — leer, solange der Grund der Ausnahme trägt.
function ausnahmeGrundVerletzt(html) {
  const m = [];
  if (/<script\b/i.test(html)) m.push('ein Skript');
  if (/<form\b/i.test(html)) m.push('ein Formular');
  if (/<(input|textarea|select|button)\b/i.test(html)) m.push('ein Eingabe- oder Bedienelement');
  return m;
}

test('[Rahmen-Schutz · Register-Seite] die erzeugte Seite von register.vivodepot.de bleibt ohne Skript und ohne Eingabe — sonst braucht sie den Block', () => {
  const seite = registerSeite();
  assert.ok(seite.includes('<body'), 'Vorbedingung: die Seite ist erzeugt');
  assert.deepEqual(ausnahmeGrundVerletzt(seite), [], 'die Register-Seite ist keine reine Liste mehr — dann trägt sie den Rahmen-Schutz-Block wie Kern und Generator');
  assert.deepEqual(ausnahmeGrundVerletzt(seite.replace('<body', '<form></form><body')), ['ein Formular'], 'Rot-Beweis: ein gepflanztes Formular hebt die Ausnahme auf');
});

test('[Rahmen-Schutz · Rot-Beweis] ein Skript, das auch im fremden Rahmen freigibt, und eines ohne Schutz werden erkannt', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { skript } = block(kern);
  const gibtImmerFrei = kern.replace(skript, skript.replace(/\}\s*else\s*\{/, "} { document.getElementById('rahmen-verbergen').remove();"));
  assert.notEqual(gibtImmerFrei, kern, 'Vorbedingung: die Pflanzung hat den Block verändert');
  assert.ok(schutzMaengel(gibtImmerFrei).includes('bei gesperrter Umleitung freigegeben'), JSON.stringify(schutzMaengel(gibtImmerFrei)));
  assert.deepEqual(schutzMaengel('<html><head></head><body></body></html>'), ['kein Rahmen-Schutz-Block (style#rahmen-verbergen + script#rahmen-schutz)']);
  const stilNachBody = kern.replace(/<style id="rahmen-verbergen">[\s\S]*?<\/style>/, '').replace(/<body([\s>])/, '<body$1<style id="rahmen-verbergen">body{display:none !important}</style>');
  assert.ok(schutzMaengel(stilNachBody).includes('der Verberge-Stil steht nicht vor dem body'));
});

/* ── Konvention (operating-manual §7.5): Deklaration per REFERENZ — die Register-Probe konsumiert den Rückgabewert von
   ausnahmeGrundVerletzt() (assert.deepEqual(..., [])); der Aufruf-Nachweis bindet sie daran. */
module.exports = {
  PROBEN: [
    { fuer: '[Rahmen-Schutz · Register-Seite] die erzeugte Seite von register.vivodepot.de bleibt ohne Skript und ohne Eingabe — sonst braucht sie den Block', diskriminante: ausnahmeGrundVerletzt },
  ],
};
