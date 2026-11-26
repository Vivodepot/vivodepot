'use strict';
/* ═════════════════════════════════════════════════════════════════
   POSTEINGANG-HINWEIS-NUR-WOANDERS (23.11.2026)

   Der Hinweis „Die Dateien warten unter „Eingelesene Dateien“ …“ lag am Handy über dem Knopf „Als Dokument ablegen“ und über dem Kopf des
   Ablege-Dialogs. Auf der Seite Einlesen sagt die Überschrift mit „n zuzuordnen“ dasselbe; dort erscheint er nicht mehr, woanders weiter.
   Öffnet der Ablege-Dialog, schließt ein offener Hinweis.

   Proben:
   [Hinweis·Einlesen]    auf der Seite Einlesen kein Hinweis, auf einer anderen Seite einer.
   [Hinweis·Aufrufe]     beide Hinweise nach dem Einlesen gehen über _posteingangHinweisZeigen; der Dialog schließt offene Hinweise.
   [Hinweis·Rot-Beweis]  ein Kern ohne die Abfrage der Seite zeigt den Hinweis auch auf Einlesen.
   (Das Verhalten im Browser zeigt der Browser-Beleg des Wagens.)
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ABFRAGE = '  if (_aufEinlesenSeite(docArg)) return false;\n';
const dok = (einlesen) => ({ getElementById: (id) => (id === 'content' ? { querySelector: (sel) => (einlesen && sel === '[data-ansicht="einlesen"]' ? {} : null) } : null) });

function zaehlen(V) {
  let n = 0;
  const alt = V.ui.toast;
  V.ui.toast = () => { n++; };
  return { n: () => n, zurueck: () => { V.ui.toast = alt; } };
}

test('[Hinweis·Einlesen] auf der Seite Einlesen kein Hinweis, auf einer anderen Seite einer', () => {
  const { V } = ladeKern();
  const z = zaehlen(V);
  try {
    assert.equal(V._posteingangHinweisZeigen('x', dok(true)), false);
    assert.equal(z.n(), 0, 'auf Einlesen kein Hinweis');
    assert.equal(V._posteingangHinweisZeigen('x', dok(false)), true);
    assert.equal(z.n(), 1, 'woanders ein Hinweis');
  } finally { z.zurueck(); }
});

test('[Hinweis·Aufrufe] beide Hinweise gehen über _posteingangHinweisZeigen; der Ablege-Dialog schließt offene Hinweise', () => {
  assert.equal(QUELLE.split('_posteingangHinweisZeigen(STRINGS.posteingangAufgenommen)').length, 2);
  assert.equal(QUELLE.split('_posteingangHinweisZeigen(STRINGS.posteingangNichtErkannt)').length, 2);
  assert.ok(!/ui\.toast\(STRINGS\.posteingang(Aufgenommen|NichtErkannt)/.test(QUELLE), 'kein Hinweis am Helfer vorbei');
  const i = QUELLE.indexOf('function flowMappeMetadaten(');
  assert.ok(i > 0);
  assert.ok(QUELLE.slice(i, i + 400).includes('_meldungenBeimSeitenwechsel(null, Infinity)'), 'der Dialog schließt offene Hinweise');
});

test('[Hinweis·Rot-Beweis] ein Kern ohne die Abfrage der Seite zeigt den Hinweis auch auf Einlesen', () => {
  assert.equal(QUELLE.split(ABFRAGE).length, 2, 'Vorbedingung: die Abfrage steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hinweis-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, QUELLE.replace(ABFRAGE, ''));
  try {
    const { V } = ladeKern({ htmlPfad: datei });
    const z = zaehlen(V);
    try {
      V._posteingangHinweisZeigen('x', dok(true));
      assert.equal(z.n(), 1, 'ohne Abfrage erscheint der Hinweis auch auf Einlesen');
    } finally { z.zurueck(); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
