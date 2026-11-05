'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-fr.test.js — Erzeuger, Prüfer und Glossar des französischen Sprachmoduls (29.10.2026)
   Werkzeuge: tools/textsatz-fr-modul-erzeugen.js, tools/textsatz-fr-pruefen.js, tools/textsatz-fr-glossar.json.
   Rot-Beweise: [FR·Prüfer] findet einen verlorenen Platzhalter und einen Begriff außerhalb des Glossars (der Prüfer fällt an
   einem gebrochenen Text); [FR·Deckung] ein übersetzter amtlicher Wortlaut bricht den Bau ab; mit Lücken schreibt der Erzeuger
   keine Datei. Jede dieser Proben bricht den Gegenstand und verlangt, dass er auffällt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { baueModul, main } = require('../tools/textsatz-fr-modul-erzeugen.js');
const { pruefen, GLOSSAR } = require('../tools/textsatz-fr-pruefen.js');
const { TEXTSATZ_FR_TEXTE } = require('../tools/textsatz-fr-daten.js');
const { deTexte } = require('../tools/lib/textsatz-de-quelle.js');
const { OFFEN_JURISTISCH } = require('../tools/textsatz-en-juristisch-offen.js');
const { ladeKern } = require('./load-kern.js');

const { V } = ladeKern();
const de = deTexte();
const ohneAmtlich = () => Object.fromEntries(Object.keys(de).filter((k) => !OFFEN_JURISTISCH.includes(k)).map((k) => [k, de[k]]));

test('[FR·Glossar] trägt die sechs ersten Begriffe, je mit französischer Fassung', () => {
  assert.deepEqual(GLOSSAR.begriffe.map((b) => b.de), ['Depot', 'Vorlage', 'Wiederherstellungs-Code', 'Notfall-Blatt', 'Studio', 'Signatur']);
  for (const b of GLOSSAR.begriffe) assert.ok(b.fr.length > 0 && b.fr.every((f) => typeof f === 'string' && f.trim()), b.de);
});

test('[FR·Deckung] ohne Übersetzung trägt das Modul genau den amtlichen Wortlaut; jeder übersetzte Text zählt eins', () => {
  const leer = baueModul({ texte: {}, V });
  assert.equal(leer.deckung.kennungen, Object.keys(de).length);
  assert.equal(leer.deckung.vorhanden, OFFEN_JURISTISCH.length);
  for (const k of OFFEN_JURISTISCH) assert.equal(leer.modul.texte[k], de[k], k);
  const kennung = Object.keys(de).find((k) => !OFFEN_JURISTISCH.includes(k) && !k.startsWith('wizard:pvwiz.') && !k.startsWith('advanceCare.'));
  assert.equal(baueModul({ texte: { [kennung]: 'texte' }, V }).deckung.vorhanden, OFFEN_JURISTISCH.length + 1);
  assert.equal(baueModul({ V }).deckung.vorhanden, OFFEN_JURISTISCH.length + Object.keys(TEXTSATZ_FR_TEXTE).length);
});

test('[FR·Deckung] bei voller Deckung nimmt der Kern das Modul an, als Französisch und ohne Verwerfung', () => {
  const { modul, deckung } = baueModul({ texte: ohneAmtlich(), V });
  assert.deepEqual(deckung.fehlend, []);
  assert.equal(modul.sprache, 'fr');
  assert.equal(modul.regeln.sprachkennung, 'fr-FR');
  assert.equal(modul.regeln.tausendertrenner, ' ');
  const r = V.textsatzModulPruefen(modul, { vertrauenswuerdig: true });
  assert.equal(r.gueltig, true, r.grund);
  assert.deepEqual([...r.verworfene], []);
});

test('[FR·Deckung] ein übersetzter amtlicher Wortlaut bricht den Bau ab', () => {
  assert.throws(() => baueModul({ texte: { [OFFEN_JURISTISCH[0]]: 'traduit' }, V }), /amtlicher Wortlaut bleibt deutsch/);
});

test('[FR·Deckung] mit Lücken schreibt der Erzeuger keine Datei', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'textsatz-fr-'));
  try {
    const ziel = path.join(ordner, 'modul.json');
    const log = console.log; const err = console.error;
    console.log = () => {}; console.error = () => {};
    let code;
    try { code = main([ziel]); } finally { console.log = log; console.error = err; }
    assert.equal(code, 1);
    assert.equal(fs.existsSync(ziel), false);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[FR·Prüfer] findet einen verlorenen Platzhalter und einen Begriff außerhalb des Glossars', () => {
  const quelle = { a: 'Ihr Depot enthält {n} Einträge.', b: 'Die Vorlage von {name}.' };
  assert.deepEqual(pruefen(quelle, { a: 'Votre dépôt contient {n} entrées.', b: 'Le modèle de {name}.' }), { platzhalter: [], glossar: [] });
  const r = pruefen(quelle, { a: 'Votre coffre contient {n} entrées.', b: 'Le modèle de Marie.' });
  assert.deepEqual(r.platzhalter.map((v) => v.kennung), ['b']);
  assert.deepEqual(r.glossar.map((v) => [v.kennung, v.begriff]), [['a', 'Depot']]);
});

test('[FR·Prüfer] die Texte im Repo halten Platzhalter und Glossar ein', () => {
  assert.deepEqual(pruefen(de, TEXTSATZ_FR_TEXTE), { platzhalter: [], glossar: [] });
});
