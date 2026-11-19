'use strict';
/* Herausgegeben (Umbau U-10, Nachbau S-7c, 16.11.2026, Dummy D64): die neueste Herausgabe steht oben, nach dem Zeitpunkt
   und nicht nach der Reihenfolge des Eintragens; am Telefon (schmaler Umbruch, bis 767 px) wird jede Zeile eine Karte, die Spaltennamen
   stehen über dem Wert. Dazu der Hinweis eines Mappe-Verweises in der Lese-App. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');
const PW = 'Probe-Passwort-S7c-2026';

/* Drei Herausgaben, absichtlich NICHT in zeitlicher Folge eingetragen: die jüngste zuerst, die älteste zuletzt. */
const EINTRAEGE = [
  { kennung: 's7c-mitte', empfaenger: 'Meldebehörde Beispielstadt', zweck: 'Umzug', zeitpunkt: '2026-10-18T09:00:00.000Z', herkunft: 'manuell' },
  { kennung: 's7c-neu', empfaenger: 'Praxis Dr. Beispiel', zweck: 'Patientenkurzakte', zeitpunkt: '2026-11-02T10:15:00.000Z', herkunft: 'manuell' },
  { kennung: 's7c-alt', empfaenger: 'Arbeitgeber', zweck: 'Bewerbung', zeitpunkt: '2026-10-01T14:30:00.000Z', herkunft: 'manuell' },
];

async function folgeIm(eintraege) {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.uebergabeProtokoll = eintraege.map((e) => Object.assign({}, e));
  V.renderUebergabeProtokoll();
  const html = dok.getElementById('content').innerHTML;
  return [...html.matchAll(/data-uebergabe-id="([^"]+)"/g)].map((m) => m[1]);
}

test('[S-7c·a] die neueste Herausgabe steht oben, nach dem Zeitpunkt', async () => {
  assert.deepEqual(await folgeIm(EINTRAEGE), ['s7c-neu', 's7c-mitte', 's7c-alt']);
});

test('[S-7c·b] ein Eintrag ohne lesbaren Zeitpunkt steht unten, nichts fällt heraus', async () => {
  const mitOhne = EINTRAEGE.concat([{ kennung: 's7c-ohne', empfaenger: 'Ohne Datum', zweck: 'Nachtrag', herkunft: 'manuell' }]);
  assert.deepEqual(await folgeIm(mitOhne), ['s7c-neu', 's7c-mitte', 's7c-alt', 's7c-ohne']);
});

test('[S-7c·Rot-Beweis] die alte Folge (umgekehrte Eintragsreihenfolge) wäre hier falsch', async () => {
  // Gegenprobe zur Lesart vor S-7c: slice().reverse() stellt die älteste Herausgabe nach oben.
  const alteFolge = EINTRAEGE.slice().reverse().map((e) => e.kennung);
  assert.notDeepEqual(alteFolge, await folgeIm(EINTRAEGE));
  assert.equal(alteFolge[0], 's7c-alt');
});

test('[S-7c·c] jede Zelle trägt ihren Spaltennamen für die Karte', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  V.getData().uebergabeProtokoll = [Object.assign({}, EINTRAEGE[0])];
  V.renderUebergabeProtokoll();
  const html = dok.getElementById('content').innerHTML;
  for (const k of ['uebergabeSpalteWann', 'uebergabeSpalteAn', 'uebergabeSpalteWas', 'uebergabeSpalteFormat']) {
    assert.ok(html.includes('data-spalte="' + V.STRINGS[k] + '"'), k + ' fehlt als data-spalte');
  }
  for (const k of ['uebergabeSpalteWann', 'uebergabeSpalteAn', 'uebergabeSpalteWas', 'uebergabeSpalteFormat']) {
    assert.ok(html.includes('<span class="uebergabe-spalte-name" aria-hidden="true">' + V.STRINGS[k] + '</span>'), k + ' fehlt als Spaltenname');
  }
  // Ein nachgetragener Eintrag hat kein Format: die Zelle trägt uebergabe-leer und entfällt in der Karte; Was hat einen Wert.
  assert.ok(html.includes('<td class="uebergabe-format uebergabe-leer" data-spalte="'), 'leere Format-Zelle ist nicht als leer markiert');
  assert.ok(html.includes('<td class="uebergabe-was" data-spalte="'), 'Was-Zelle mit Wert ist als leer markiert');
});

test('[S-7c·d] im schmalen Umbruch (bis 767 px) wird die Zeile eine Karte, im Stil und in der Anzeige-Mechanik des Kerns', () => {
  const stil = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  const block = stil.slice(stil.indexOf('@media (max-width: 767px) {\n    .uebergabe-tabelle thead'));
  assert.ok(block.length > 0, 'Kartenblock für die Herausgaben fehlt in grundlage.css');
  assert.match(block, /\.uebergabe-tabelle tr, \.uebergabe-tabelle td \{ display: block;/);
  assert.match(block, /\.uebergabe-tabelle td\.uebergabe-leer \{ display: none; \}/);
  assert.match(block, /\.uebergabe-tabelle \.uebergabe-spalte-name \{ display: block;/);
  // Die Stil-Regeln des Kerns erlauben kein content: attr(); der Spaltenname ist ein eigenes Element.
  assert.equal(/content\s*:\s*attr\(/.test(stil), false, 'content: attr() verletzt die Stil-Regeln des Kerns');
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.ok(kern.includes('.uebergabe-tabelle, .uebergabe-tabelle tbody, .uebergabe-tabelle tr, .uebergabe-tabelle td { display: block; }'),
    'die Anzeige-Mechanik im Gerüst des Kerns trägt die Karte nicht');
});

test('[S-7c·e] die Lese-App zeigt den Hinweis eines Mappe-Verweises unter dem Wert', () => {
  const { V } = ladeLesen();
  const feld = { id: 'profilePhotoCoverPage', typ: 'ref', entitaet: 'mappe', label: 'Profilfoto', hint: 'Ein Foto als Deckblatt Ihres Depots.' };
  const html = V.feldZeileHTML('identity', feld, null);
  assert.ok(html.includes('<p class="feld-wert-hinweis">'), 'kein Hinweis unter dem Wert');
  // Gegenprobe: ein Textfeld bekommt keinen Hinweis.
  const text = V.feldZeileHTML('identity', { id: 'furtherDetails', typ: 'text', label: 'Weiteres', hint: 'Hinweis' }, 'x');
  assert.equal(text.includes('feld-wert-hinweis'), false);
});
