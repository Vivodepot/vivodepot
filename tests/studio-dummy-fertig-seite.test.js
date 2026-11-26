'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem Sichern: „Vorlage gesichert“ als eigener Bildschirm wie im Dummy vom 14.11.2026 (Zeile N75, Z. 195–214)
   ─────────────────────────────────────────────────────────────────
   (1) Nach dem Sichern ruht die Arbeitsfläche: #raum-bau trägt „gesichert“, sichtbar bleiben nur das Ergebnis und
       „Wie geht es weiter“; „‹ Weiter bearbeiten“ und „Weitere Vorlage beginnen“ nehmen das zurück, ebenso der Weg zum Start.
   (2) Die Untertexte der Wege sind wortgleich zum Dummy.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Wagen> node --test tests/studio-dummy-fertig-seite.test.js → rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const text = (b) => String(b.attrs.text != null ? b.attrs.text : b.kinder.filter((k) => typeof k === 'string').join(''));

function mitRaum() {
  const g = ladeGenerator();
  const klassen = new Set();
  const raum = g.sandbox.document.getElementById('raum-bau');
  raum.classList = { add: (c) => klassen.add(c), remove: (c) => klassen.delete(c), contains: (c) => klassen.has(c), toggle: () => {} };
  return { g, klassen };
}
const ERG = { pdf: true, name: 'Bibliotheksausweis', stelle: 'Stadtbibliothek Probestadt', zahl: 9,
  qr: { art: 'inhalt', link: 'https://privat-de.vivodepot.de/v.html#t=abc', qr: { dataUrl: 'data:image/gif;base64,R0lGOD' } } };

test('[Fertig-Seite 1] nach dem Sichern ruht die Arbeitsfläche; nur Ergebnis und „Wie geht es weiter“ bleiben', () => {
  assert.match(HTML, /\n {2}\.raum-bau\.gesichert > :not\(#sichern-ergebnis\):not\(#nach-sichern\) \{ display: none; \}/, 'die Regel für den eigenen Bildschirm fehlt');
  const { g, klassen } = mitRaum();
  g.sandbox.vorlageErgebnisZeigen(ERG);
  assert.ok(klassen.has('gesichert'), 'die Arbeitsfläche ruht nach dem Sichern nicht');
  g.sandbox.vorlageWeiterBearbeiten();
  assert.ok(!klassen.has('gesichert'), '„Weiter bearbeiten“ führt nicht zurück');
});

test('[Fertig-Seite 1] „Weitere Vorlage beginnen“ und der Weg zum Start schließen die Seite', () => {
  const { g, klassen } = mitRaum();
  g.sandbox.vorlageErgebnisZeigen(ERG);
  g.sandbox.weitereVorlageBeginnen();
  assert.ok(!klassen.has('gesichert'));
  g.sandbox.vorlageErgebnisZeigen(ERG);
  g.sandbox.zeigeSchritt('willkommen');
  assert.ok(!klassen.has('gesichert'), 'der Start lässt die Seite „Vorlage gesichert“ stehen');
});

test('[Fertig-Seite 2] Untertexte der Wege wortgleich zum Dummy (Link, QR-Code, Datei, PDF)', () => {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  g.sandbox.vorlageErgebnisZeigen(Object.assign({ dateiSpeichern: () => {}, pdfSpeichern: () => {} }, ERG));
  const t = gebaut.filter((b) => b.attrs.class === 't').map(text);
  /* Zwei Gruppen wie im Dummy (N74, Entscheidung 22.11.2026 „Wie im Dummy“): Link und QR-Code, dann Datei und PDF. */
  /* Dazu der Weg zu den Antworten (Benutzbarkeitsprüfung 22.11.2026, H2). */
  assert.deepEqual(t, ['Für E-Mail, Brief oder Ihre Website', 'Zum Aushängen oder Vorzeigen am Schalter',
    'Eine Anfrage mit diesen Datenfeldern veröffentlichen; Sie legen fest, wohin die Antworten gehen.',
    'Zum späteren Öffnen und Ändern im Studio', 'Die Vorlage zum Lesen und Ablegen']);
});
