'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   entwickler-doku-module.test.js — die Bauanleitung für Module stimmt mit dem Kern überein (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   docs/modules/ erklärt Dritten, wie man ein Modul baut, ohne den Kern zu lesen. Eine solche
   Anleitung veraltet still: ein Beispiel, das der Kern inzwischen ablehnt, oder ein Link auf eine
   Datei, die umbenannt wurde, fällt beim Lesen niemandem auf, der es nicht ausprobiert.
   Diese Probe probiert es aus:
     - jedes Beispiel unter docs/modules/examples/ geht durch die Prüfung des Kerns, ohne dass
       etwas verworfen wird; Branding wird unsigniert abgelehnt (so steht es in branding.md) und
       ist der Form nach gültig;
     - kein Beispiel trägt ein Feld, das die App selbst setzt (eine Anleitung, die das vormacht,
       lehrt genau das, was sie verbietet);
     - jeder relative Link in den Entwickler-Dokumenten zeigt auf eine Datei, die es gibt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const BEISPIELE = path.join(REPO, 'docs', 'modules', 'examples');
const APP_FELDER = ['ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft', 'pruefstufe', 'beleg', 'abWerk', 'signiert', 'verifiziert', 'appVersion'];
const DOKUMENTE = [
  ...fs.readdirSync(path.join(REPO, 'docs', 'modules')).filter((d) => d.endsWith('.md')).map((d) => path.join('docs', 'modules', d)),
  path.join('docs', 'INTEGRATION.md'),
  path.join('docs', 'VERIFYING-SIGNATURES.md'),
  path.join('docs', 'JURISDICTIONS.md'),
];

function beispiele() {
  return fs.readdirSync(BEISPIELE).filter((d) => d.endsWith('.example.json')).map((d) => ({ datei: d, modul: JSON.parse(fs.readFileSync(path.join(BEISPIELE, d), 'utf8')) }));
}

test('[Entwickler-Doku·Beispiele] jedes Beispiel besteht die Prüfung des Kerns, ohne Verlust; Branding nur signiert', () => {
  const { V } = ladeKern();
  const liste = beispiele();
  assert.ok(liste.length >= 6, 'sechs Achsen, je ein Beispiel');
  for (const { datei, modul } of liste) {
    const d = V.leeresDepot();
    const r = V.modulEinlassen(JSON.stringify(modul), d);
    if (modul.modulTyp === 'branding') {
      assert.equal(r.grund, 'nur-signiert-erlaubt', datei);
      const b = V.brandingModulPruefen(modul);
      assert.equal(b.gueltig, true, datei);
      assert.deepEqual(b.verworfene, [], datei);
      continue;
    }
    assert.equal(r.angenommen, true, datei + ': ' + r.grund);
    assert.deepEqual(r.verworfene || [], [], datei);
    assert.ok(!r.unvollstaendig, datei + ': unvollständig');
  }
});

test('[Entwickler-Doku·Beispiele] kein Beispiel trägt ein Feld, das die App selbst setzt', () => {
  for (const { datei, modul } of beispiele()) {
    for (const f of APP_FELDER) assert.ok(!(f in modul), datei + ': ' + f);
  }
});

test('[Entwickler-Doku·Links] jeder relative Link in den Entwickler-Dokumenten zeigt auf eine vorhandene Datei', () => {
  const fehlend = [];
  for (const dok of DOKUMENTE) {
    const text = fs.readFileSync(path.join(REPO, dok), 'utf8');
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const ziel = m[1];
      if (/^(https?:|mailto:|#)/.test(ziel)) continue;
      const pfad = path.join(REPO, path.dirname(dok), ziel.split('#')[0]);
      if (!fs.existsSync(pfad)) fehlend.push(dok + ' → ' + ziel);
    }
  }
  assert.deepEqual(fehlend, []);
});

test('[Entwickler-Doku·Links·Rot-Beweis] ein Link auf eine fehlende Datei wird gefunden', () => {
  const text = 'siehe [x](gibt-es-nicht.md)';
  const treffer = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((z) => !fs.existsSync(path.join(REPO, 'docs', z)));
  assert.deepEqual(treffer, ['gibt-es-nicht.md']);
});

test('[Entwickler-Doku·Befehle] jedes Werkzeug, das die Dokumente mit `node …` aufrufen, liegt im Repository', () => {
  const fehlend = [];
  for (const dok of DOKUMENTE) {
    const text = fs.readFileSync(path.join(REPO, dok), 'utf8');
    for (const m of text.matchAll(/node\s+((?:tools|scripts)\/[A-Za-z0-9_./-]+\.(?:js|mjs))/g)) {
      if (!fs.existsSync(path.join(REPO, m[1]))) fehlend.push(dok + ' → ' + m[1]);
    }
  }
  assert.deepEqual(fehlend, []);
});
