'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem Sichern: der QR-Code erst nach „QR-Code zeigen“ (Dummy 14.11.2026, Z. 204–206, Zeile N75)
   ─────────────────────────────────────────────────────────────────
   (1) In der Gruppe „Vorlage an Personen geben“ steht „QR-Code zeigen“ mit „Zum Aushängen oder Vorzeigen am Schalter“ und dem
       Knopf „Zeigen“. Der QR-Code mit der lesbaren Adresse steht darunter, zunächst verborgen.
   (2) „Zeigen“ zeigt den Code, der Knopf heißt dann „Verbergen“; noch einmal verbirgt ihn wieder.
   (3) Die Datei des QR-Codes geht weiter beim Sichern hinaus (unverändert, nur die Anzeige wartet).
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Wagen> node --test tests/studio-nach-sichern-qr-zeigen.test.js → rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const text = (b) => String(b.attrs.text != null ? b.attrs.text : b.kinder.filter((k) => typeof k === 'string').join(''));

function ergebnis() {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  g.sandbox.vorlageErgebnisZeigen({ pdf: true, name: 'Bibliotheksausweis', stelle: 'Stadtbibliothek Probestadt', zahl: 2,
    qr: { art: 'inhalt', link: 'https://privat-de.vivodepot.de/v.html#t=abc', qr: { dataUrl: 'data:image/gif;base64,R0lGOD' } } });
  return { g, gebaut };
}

test('[Nach Sichern · QR zeigen] „QR-Code zeigen“ mit Dummy-Wortlaut; der Code ist zunächst verborgen', () => {
  const { gebaut } = ergebnis();
  const zeile = gebaut.find((b) => b.tag === 'strong' && text(b) === 'QR-Code zeigen: ');
  assert.ok(zeile, '„QR-Code zeigen“ fehlt');
  const knopf = gebaut.find((b) => b.tag === 'button' && b.attrs.id === 'ns-qr-zeigen');
  assert.ok(knopf && text(knopf) === 'Zeigen', 'der Knopf „Zeigen“ fehlt');
  assert.ok(gebaut.some((b) => b.tag === 'p' && b.kinder.some((k) => typeof k === 'string' && k.includes('Zum Aushängen oder Vorzeigen am Schalter'))),
    'der Dummy-Satz „Zum Aushängen oder Vorzeigen am Schalter“ fehlt');
  const block = gebaut.find((b) => b.attrs.id === 'ns-qr');
  assert.ok(block, 'der Block mit dem QR-Code fehlt');
  assert.equal(block.e.hidden, true, 'der QR-Code steht schon vor „Zeigen“ da');
  assert.ok(block.kinder.some((k) => gebaut.find((b) => b.e === k && b.tag === 'img')), 'das QR-Bild steht nicht im Block');
  assert.ok(block.kinder.some((k) => gebaut.find((b) => b.e === k && b.attrs['data-qr-adresse'] === '1')), 'die lesbare Adresse steht nicht beim Code');
});

test('[Nach Sichern · QR zeigen] „Zeigen“ zeigt den Code, „Verbergen“ verbirgt ihn wieder', () => {
  const { gebaut } = ergebnis();
  const knopf = gebaut.find((b) => b.tag === 'button' && b.attrs.id === 'ns-qr-zeigen');
  const block = gebaut.find((b) => b.attrs.id === 'ns-qr');
  knopf.attrs.onclick();
  assert.equal(block.e.hidden, false, 'nach „Zeigen“ ist der Code nicht zu sehen');
  assert.equal(knopf.e.textContent, 'Verbergen');
  knopf.attrs.onclick();
  assert.equal(block.e.hidden, true, 'nach „Verbergen“ ist der Code noch zu sehen');
  assert.equal(knopf.e.textContent, 'Zeigen');
});

test('[Nach Sichern · QR zeigen] die Datei des QR-Codes geht weiter beim Sichern hinaus', () => {
  const i = HTML.indexOf('async function vorlageSichern(');
  const f = HTML.slice(i, HTML.indexOf('\n}\n', i));
  assert.match(f, /if \(qr\) blobDownload\(basis \+ \(qr\.aushang \? '-qr\.png' : '-qr\.gif'\)/, 'die QR-Datei geht beim Sichern nicht mehr hinaus');
});
