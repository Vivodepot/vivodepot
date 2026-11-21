'use strict';
/* Foto-Feld nie im Bearbeiten-Formular (Befund FOTO-RUNDLAUF-VERLUST, 17.11.2026).
   Stünde das Deckblatt-Foto als Auswahl im Bearbeiten-Formular (data-edit-ref), läse bearbeitungSpeichern deren beim Zeichnen
   festgehaltenen Wert zurück. War das Foto inzwischen über den Kreis gesetzt, löschte der leere Wert der Auswahl es (Kern: Schleife
   über [data-edit-ref], „delete neu[fid]“). Im Browser gezeigt vom Rundlauf über die Sicherungsdatei (Zweites Gerät, Falsches
   Passwort) und von tests/e2e/hintergrund-wipe-bildschirm.spec.js.
   Seit FOTO-ABSCHNITT-DOPPELT (20.11.2026) steht das Foto nur am Kreis oben und in keiner Karte. Diese Probe hält die Ursache an der
   Quelle fest: kein Kartenaufruf trägt das Foto-Feld, und in der Bearbeiten-Sicht der Identität trägt kein Element mit dem Foto-Feld
   ein data-edit-Attribut. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function fotoKartenAufrufe(quelle) {
  return quelle.split('\n').filter((z) => /feldgruppenKarteHTML\(\[\{ name: STRINGS\.deckblattFotoHinzufuegen/.test(z) || /felder: \[_dbFoto\]/.test(z));
}
/* Rein: Elemente der Sicht, die das Foto-Feld als Speicherfeld tragen. */
function speicherfelder(html, feldId) {
  return [...html.matchAll(/<[^>]*>/g)].map((m) => m[0])
    .filter((t) => /data-edit/.test(t) && (t.includes('"' + feldId + '"') || t.includes('|' + feldId + '"')));
}

test('[Foto-Rubrik] kein Kartenaufruf trägt das Foto-Feld', () => {
  assert.deepEqual(fotoKartenAufrufe(KERN), []);
});

test('[Foto-Rubrik] Bearbeiten-Sicht der Identität: das Foto-Feld ist nirgends ein Speicherfeld', async () => {
  const { V, document } = ladeKern({ produkt: 'privat-de' });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.renderSektor('identity');
  const html = String(document.getElementById('content').innerHTML);
  assert.ok(html.includes('data-edit'), 'Vorbedingung: die Sicht trägt Speicherfelder');
  assert.deepEqual(speicherfelder(html, V.SEKTOR_BY_ID.identity.deckblatt.fotoFeld), []);
});

test('[Foto-Rubrik·Rot-Beweis] ein Kartenaufruf mit dem Foto oder ein data-edit-ref auf dem Foto-Feld fällt auf', () => {
  assert.equal(fotoKartenAufrufe('      if (x) html += feldgruppenKarteHTML([{ name: STRINGS.deckblattFotoHinzufuegen, felder: [_dbFoto] }], a, b, c, darf, {});').length, 1);
  assert.equal(speicherfelder('<select data-edit-ref="profilePhotoCoverPage"></select>', 'profilePhotoCoverPage').length, 1);
  assert.equal(speicherfelder('<input data-edit="givenName">', 'profilePhotoCoverPage').length, 0);
});
