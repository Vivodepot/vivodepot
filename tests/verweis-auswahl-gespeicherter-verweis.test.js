'use strict';
/* Verweis-Auswahl trägt den gespeicherten Verweis (Befunde VERWEIS-VERLUST-PFLEGEDIENST, VERWEIS-ERSATZ-NOTFALLNACHBAR, 18.11.2026).
   Die Auswahl eines Verweis-Felds zeigt nur Vorschläge: Institutionen nach Art gefiltert, Personen ohne die eigene. Stand der
   gespeicherte Verweis nicht darunter, zeichnete sie keine Option für ihn; der Browser wählte die erste freie Option, und
   bearbeitungSpeichern schrieb sie beim nächsten Sichern zurück. So ging ein Pflegedienst anderer Art ohne Eingabe verloren,
   und ein verwaister Notfallnachbar wurde durch die erste Person der Liste ersetzt.
   Diese Probe hält fest: der gespeicherte Verweis steht immer genau einmal als gewählte Option da, mit Namen aus dem Register,
   verwaist mit dem vorhandenen Text für „unbekannt“. Klasse im Browser: der Wächter „Bearbeiten ohne Änderung“ über alle Sichten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const PW = 'pw';

// Werte der gewählten Optionen einer Auswahl (ohne Platzhalter und „neu anlegen“).
function gewaehlt(html) {
  return Array.from(html.matchAll(/<option value="([^"]*)"[^>]*\bselected\b[^>]*>([^<]*)<\/option>/g)).map((m) => ({ id: m[1], name: m[2] }));
}
function befunde(html, ref, name) {
  const g = gewaehlt(html);
  const aus = [];
  if (g.length !== 1) aus.push('gewählte Optionen: ' + g.length);
  if (!g.some((o) => o.id === ref)) aus.push('gespeicherter Verweis nicht gewählt');
  if (name && !g.some((o) => o.id === ref && o.name === name)) aus.push('Name fehlt');
  if ((html.split('value="' + ref + '"').length - 1) !== 1) aus.push('Verweis nicht genau einmal');
  return aus;
}

test('[Verweis-Auswahl] Institution anderer Art: der gespeicherte Verweis steht gewählt mit Namen da', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.institutionHinzufuegen({ name: 'Pflege Nord', art: 'sonstige' });
  const html = V.feldInputHTML({ id: 'probeDienst', typ: 'ref', entitaet: 'institution', art: 'pflegedienst' }, { ref: id });
  assert.deepEqual(befunde(html, id, 'Pflege Nord'), []);
});

test('[Verweis-Auswahl] verwaister Personen-Verweis: steht gewählt als „unbekannt“ da, keine andere Person wird gewählt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.personHinzufuegen({ name: 'Dr. Sommer' });
  const html = V.feldInputHTML({ id: 'probeNachbar', typ: 'ref', entitaet: 'person' }, { ref: 'p-weg' });
  assert.deepEqual(befunde(html, 'p-weg', V.STRINGS.konfliktDatumUnbekannt), []);
});

test('[Verweis-Auswahl] Verweis unter den Vorschlägen: genau einmal, gewählt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Dr. Sommer' });
  const html = V.feldInputHTML({ id: 'probeNachbar', typ: 'ref', entitaet: 'person' }, { ref: id });
  assert.deepEqual(befunde(html, id, 'Dr. Sommer'), []);
});

test('[Verweis-Auswahl·Rot-Beweis] eine Auswahl ohne Option für den Verweis fällt auf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.personHinzufuegen({ name: 'Dr. Sommer' });
  const html = V.feldInputHTML({ id: 'probeNachbar', typ: 'ref', entitaet: 'person' }, { ref: 'p-weg' });
  const ohne = html.replace(/<option value="p-weg"[^>]*>[^<]*<\/option>/, '');
  assert.notEqual(ohne, html, 'Vorbedingung: die Option ließ sich entfernen');
  assert.ok(befunde(ohne, 'p-weg').includes('gespeicherter Verweis nicht gewählt'));
});
