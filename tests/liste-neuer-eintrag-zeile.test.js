'use strict';
/* liste-neuer-eintrag-zeile.test.js — Konvention „Hinzufügen“ (Produktentscheidung 07.10.2026) für gefüllte Listen (D39) und Chip-Felder (D38)
   ─────────────────────────────────────────────────────────────────
   D39: „Weitere … hinzufügen“ unter einer gefüllten Liste öffnete einen Dialog. Jetzt steht unter den Einträgen eine Zeile mit denselben
   Eingaben wie beim ersten Eintrag, dazu Speichern und Abbrechen; angelegt wird erst mit Speichern, nicht beim Verlassen.
   D38: ein Chip-Feld mit eigenem Zweitknopf-Text (die laufenden Medikamente) zeigt leer die Eingabe, ab einem Eintrag „Weiteres Medikament
   hinzufügen“; der Klick zeigt die Eingabe. Felder ohne eigenen Text bleiben wie bisher.
   Rot-Beweis je Teil: der frühere Stand fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZUSATZ = { zusatzBindungen: ['LISTE_NEUE_ZEILE'] };

const feldVon = (V, sektor, id) => V.SEKTOR_BY_ID[sektor].sektionen.flatMap((s) => s.felder || []).find((f) => f.id === id);

/* Rein: Funde an dem HTML einer gefüllten Liste mit offener neuer Zeile. */
function zeileFunde(html, fid) {
  const aus = [];
  if (!new RegExp('data-liste-inline="' + fid + '" data-liste-neu="1"').test(html)) aus.push('keine Zeile unter den Einträgen');
  if (!new RegExp('data-liste-neu-speichern="' + fid + '"').test(html)) aus.push('kein Speichern');
  if (!new RegExp('data-liste-neu-abbrechen="' + fid + '"').test(html)) aus.push('kein Abbrechen');
  if (/data-eintrag-hinzufuegen="/.test(html)) aus.push('der Knopf steht neben der offenen Zeile noch da');
  return aus;
}
/* Rein: Funde am HTML eines Chip-Feldes mit eigenem Zweitknopf-Text und mindestens einem Eintrag. */
function chipFunde(html, fid, text) {
  const aus = [];
  if (!/<div class="chip-eingabe-zeile" hidden>/.test(html)) aus.push('die Eingabe steht offen da');
  if (!new RegExp('data-chip-weitere="' + fid + '">' + text + '</button>').test(html)) aus.push('kein Zweitknopf „' + text + '“');
  return aus;
}
/* Rein: Funde im Quelltext der Verdrahtung. */
function wegFunde(kern) {
  const aus = [];
  const a = kern.indexOf("c.querySelectorAll('[data-eintrag-hinzufuegen]')");
  const rumpf = kern.slice(a, kern.indexOf('});', kern.indexOf('flowListenEintragHinzufuegen(sektorId, feld)', a)));
  if (!/LISTE_NEUE_ZEILE\.add\(fid\)/.test(rumpf)) aus.push('„Weitere … hinzufügen“ öffnet in einer gefüllten Liste keine Zeile');
  if (!/box\.hasAttribute\('data-liste-neu'\)\) return;/.test(kern)) aus.push('die Zeile legt schon beim Verlassen an');
  if (!/_listeInlineUebernehmen\(sektorId, feld, box\)\) return;/.test(kern)) aus.push('Speichern geht nicht über den Weg des ersten Eintrags');
  return aus;
}

test('[D39] gefüllte Liste: geschlossen der Knopf „Weitere … hinzufügen“, offen die Zeile mit Speichern und Abbrechen', () => {
  const { V } = ladeKern(ZUSATZ);
  const feld = feldVon(V, 'identity', 'idDocuments');
  const liste = [{ system: 'Personalausweis', documentNumber: 'X1' }];
  const zu = V.feldInputHTML(feld, liste, null, 'identity');
  assert.match(zu, /class="btn-mini liste-weitere" data-eintrag-hinzufuegen="idDocuments"/);
  assert.ok(!/data-liste-neu=/.test(zu));
  V.__zusatz.LISTE_NEUE_ZEILE.add('idDocuments');
  try {
    const offen = V.feldInputHTML(feld, liste, null, 'identity');
    assert.deepEqual(zeileFunde(offen, 'idDocuments'), []);
    assert.match(offen, /data-eintrag-edit="documentNumber"/, 'dieselben Eingaben wie beim ersten Eintrag');
  } finally { V.__zusatz.LISTE_NEUE_ZEILE.delete('idDocuments'); }
});

test('[D39] Verdrahtung: Knopf öffnet die Zeile, Speichern über _listeInlineUebernehmen, kein Anlegen beim Verlassen', () => {
  assert.deepEqual(wegFunde(KERN), []);
});

test('[D39·Rot-Beweis] der frühere Stand (Knopf öffnet den Dialog, keine Zeile) fällt durch', () => {
  const alt = KERN.replace('LISTE_NEUE_ZEILE.add(fid);', '').replace("if (box.hasAttribute('data-liste-neu')) return;", '');
  const funde = wegFunde(alt);
  assert.ok(funde.some((f) => /keine Zeile/.test(f)), funde.join(' | '));
  assert.ok(funde.some((f) => /beim Verlassen/.test(f)));
  assert.deepEqual(zeileFunde('<button type="button" class="btn-mini liste-weitere" data-eintrag-hinzufuegen="idDocuments">', 'idDocuments').length, 4);
});

test('[D38] laufende Medikamente: leer die Eingabe, ab einem Eintrag „Weiteres Medikament hinzufügen“ vor verborgener Eingabe', () => {
  const { V } = ladeKern();
  const feld = feldVon(V, 'health', 'medicationOngoing');
  const leer = V.feldInputHTML(feld, [], null, 'health');
  assert.match(leer, /<div class="chip-eingabe-zeile">/);
  assert.ok(!/data-chip-weitere=/.test(leer));
  const voll = V.feldInputHTML(feld, [{ text: 'Beispielol' }], null, 'health');
  assert.deepEqual(chipFunde(voll, 'medicationOngoing', 'Weiteres Medikament hinzufügen'), []);
  assert.match(KERN, /weiterBtn\.onclick = \(\) => \{[\s\S]{0,200}zeile\.hidden = false;/, 'der Knopf zeigt die Eingabe');
});

test('[D38] ein Chip-Feld ohne eigenen Text bleibt wie bisher', () => {
  const { V } = ladeKern();
  const feld = feldVon(V, 'health', 'allergiesMedicationFoodOther');
  const voll = V.feldInputHTML(feld, [{ text: 'Penicillin' }], null, 'health');
  assert.match(voll, /<div class="chip-eingabe-zeile">/);
  assert.ok(!/data-chip-weitere=/.test(voll));
});

test('[D38·Rot-Beweis] ohne Zweitknopf (früherer Stand) fällt die Probe durch', () => {
  const { V } = ladeKern();
  const feld = feldVon(V, 'health', 'medicationOngoing');
  const voll = V.feldInputHTML(feld, [{ text: 'Beispielol' }], null, 'health')
    .replace(/<div class="chip-eingabe-zeile" hidden>/, '<div class="chip-eingabe-zeile">').replace(/<button[^>]*data-chip-weitere[^>]*>[^<]*<\/button>/, '');
  assert.deepEqual(chipFunde(voll, 'medicationOngoing', 'Weiteres Medikament hinzufügen').length, 2);
});
