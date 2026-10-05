'use strict';
/* Wächter gegen die Klasse von TEMPLATE-URL-SCHEMA-UNGEPRUEFT (05.10.2026): jedes dynamische Verweisziel in Kern und Lese-App
   steht mit dem Grund in tools/verweisziel-senken-grundlinie.json, warum es kein fremdes Schema tragen kann. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/verweisziel-senken-pruefen.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'verweisziel-senken-grundlinie.json'), 'utf8'));

function mitZusatz(zusatz) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verweisziel-probe-'));
  try {
    const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
    fs.writeFileSync(path.join(dir, 'vivodepot.html'), zusatz + '\n' + kern);
    fs.copyFileSync(path.join(REPO, 'vivodepot-lesen.html'), path.join(dir, 'vivodepot-lesen.html'));
    return W.vergleichen(W.zaehlen(W.messen(dir, W.DATEIEN)), GRUNDLINIE);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('[Verweisziel] der Bestand entspricht der Grundlinie, jede Stelle mit Grund', () => {
  assert.deepEqual(W.vergleichen(W.zaehlen(W.messen(REPO, W.DATEIEN)), GRUNDLINIE), []);
});

test('[Verweisziel·Rot-Beweis] ein neues Ziel ohne Schemaprüfung ist rot, auch maskiert', () => {
  const f = mitZusatz("h += '<a href=\"' + escapeHTML(vorlage.quelle) + '\">x</a>';");
  assert.ok(f.some((x) => /NEU, ohne Grund: vivodepot\.html\|escapeHTML\(vorlage\.quelle\)/.test(x)), f.join('\n'));
});

test('[Verweisziel·Rot-Beweis] auch .href = und window.open werden gesehen', () => {
  assert.ok(mitZusatz('a.href = fremd.ziel;').some((x) => /fremd\.ziel/.test(x)));
  assert.ok(mitZusatz("window.open(fremd.ziel, '_blank');").some((x) => /fremd\.ziel/.test(x)));
});

test('[Verweisziel·Rot-Beweis] eine zweite Stelle eines bekannten Ausdrucks ist rot (Anzahl, nicht nur Form)', () => {
  const f = mitZusatz("h += '<a href=\"' + escapeHTML(q) + '\">x</a>';");
  assert.ok(f.some((x) => /MEHR als in der Grundlinie: vivodepot\.html\|escapeHTML\(q\)/.test(x)), f.join('\n'));
});

test('[Verweisziel] jeder Eintrag der Grundlinie trägt einen Grund', () => {
  for (const e of GRUNDLINIE.eintraege) assert.ok(typeof e.grund === 'string' && e.grund.length >= 10, e.ausdruck);
});

test('[Verweisziel·Rot-Beweis] setAttribute mit doppelten Anführungszeichen und location.assign/replace werden gesehen', () => {
  assert.ok(mitZusatz('a.setAttribute("href", fremd.ziel);').some((x) => /fremd\.ziel/.test(x)));
  assert.ok(mitZusatz('window.location.assign(fremd.ziel);').some((x) => /fremd\.ziel/.test(x)));
  assert.ok(mitZusatz('location.replace(fremd.ziel);').some((x) => /fremd\.ziel/.test(x)));
});

test('[Verweisziel·Rot-Beweis] iframe src, setAttribute("src") und location.href = werden gesehen', () => {
  assert.ok(mitZusatz("h += '<iframe class=\"x\" src=\"' + escapeHTML(fremd.ziel) + '\"></iframe>';").some((x) => /fremd\.ziel/.test(x)));
  assert.ok(mitZusatz("f.setAttribute('src', fremd.ziel);").some((x) => /fremd\.ziel/.test(x)));
  assert.ok(mitZusatz('f.setAttribute("src", fremd.ziel);').some((x) => /fremd\.ziel/.test(x)));
  assert.ok(mitZusatz('window.location.href = fremd.ziel;').some((x) => /fremd\.ziel/.test(x)));
});

/* Der Grund der Mappen-Vorschau (iframe src) hängt an _MAPPE_PDF_DATA_URL: ohne Blob-URL geht nur eine
   data:application/pdf;base64-Form ins iframe. Diese Probe hält den Regex fest, damit der Grund nicht still verfällt. */
test('[Verweisziel·Mappe·Rot-Beweis] _mappeInhaltAlsQuelle lässt als PDF nur data:application/pdf;base64 durch', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.equal(typeof V._mappeInhaltAlsQuelle, 'function');
  const pdf = 'data:application/pdf;base64,JVBERi0xLjQK';
  assert.equal(V._mappeInhaltAlsQuelle(pdf, 'pdf'), pdf, 'Positivkontrolle');
  for (const boese of ['data:text/html,<script>alert(1)</script>', 'data:text/html;base64,PHNjcmlwdD4=',
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' data:application/pdf;base64,JVBERi0xLjQK',
    'data:application/pdf;base64,JVBE"onload="x', 'https://beispiel.invalid/a.pdf']) {
    assert.equal(V._mappeInhaltAlsQuelle(boese, 'pdf'), null, JSON.stringify(boese));
  }
});
