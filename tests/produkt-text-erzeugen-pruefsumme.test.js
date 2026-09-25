'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   produkt-text-erzeugen-pruefsumme.test.js — U2-ADR-406 (12.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ROT-BEWEIS, DER DIESE DATEI RECHTFERTIGT: ändert sich tools/lib/produkt-text-
   erzeugen.js zwischen den PRODUKT_TEXT_ERZEUGEN-Markern, ohne dass dieselbe Prüfsumme im
   Schwesterrepo (vivodepot-download-gateway, src/produkt-text-erzeugen.js) nachgezogen wird,
   bricht DIESER Test HIER. Er kann das Schwesterrepo nicht sehen — das muss er auch nicht: der
   Bruch selbst ist die Erinnerung, dass drüben nachzuziehen ist (die byte-für-byte-Kopie
   inklusive). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  kopierterAbschnitt, codePruefsumme, PRODUKT_TEXT_ERZEUGEN_PRUEFSUMME, PRODUKT_TEXT_ERZEUGEN_PFAD,
} = require('../tools/lib/produkt-text-erzeugen-pruefsumme.js');

test('[Produkt-Text-Erzeugen·Prüfsumme] der kopierte Abschnitt hasht auf die gepinnte, im Schwesterrepo wortgleich hinterlegte Prüfsumme', () => {
  const echterHash = codePruefsumme(kopierterAbschnitt(PRODUKT_TEXT_ERZEUGEN_PFAD));
  assert.equal(echterHash, PRODUKT_TEXT_ERZEUGEN_PRUEFSUMME,
    'tools/lib/produkt-text-erzeugen.js hat sich zwischen den PRODUKT_TEXT_ERZEUGEN-Markern '
    + 'geändert — die Prüfsumme ' + echterHash + ' muss BEWUSST auch im Schwesterrepo '
    + '(vivodepot-download-gateway, tools/lib/produkt-text-erzeugen-pruefsumme.js, '
    + 'PRODUKT_TEXT_ERZEUGEN_PRUEFSUMME) nachgezogen werden — UND die Kopie dort '
    + '(src/produkt-text-erzeugen.js) muss denselben Abschnitt byte-für-byte neu erhalten.');
});

test('[Produkt-Text-Erzeugen·Prüfsumme·Rot-Beweis] eine geänderte Zeile im markierten Abschnitt ändert die Prüfsumme', () => {
  const original = kopierterAbschnitt(PRODUKT_TEXT_ERZEUGEN_PFAD);
  const veraendert = original.replace("modulTyp: 'textsatz',", "modulTyp: 'gepflanzt',");
  assert.notEqual(veraendert, original, 'Testvoraussetzung: die gepflanzte Ersetzung muss überhaupt greifen');
  assert.notEqual(codePruefsumme(veraendert), codePruefsumme(original),
    'eine geänderte Zeile im kopierten Abschnitt MUSS eine andere Prüfsumme ergeben — sonst bewacht sie nichts');
});

test('[Produkt-Text-Erzeugen·Prüfsumme] die Marker existieren genau einmal — kein doppelter/fehlender Marker', () => {
  const fs = require('node:fs');
  const quelle = fs.readFileSync(PRODUKT_TEXT_ERZEUGEN_PFAD, 'utf8');
  const begins = quelle.split('/* ==PRODUKT_TEXT_ERZEUGEN:BEGIN== */').length - 1;
  const endes = quelle.split('/* ==PRODUKT_TEXT_ERZEUGEN:END== */').length - 1;
  assert.equal(begins, 1);
  assert.equal(endes, 1);
});

test('[Produkt-Text-Erzeugen·Prüfsumme] die Prüfsumme ist deterministisch', () => {
  const a = kopierterAbschnitt(PRODUKT_TEXT_ERZEUGEN_PFAD);
  const b = kopierterAbschnitt(PRODUKT_TEXT_ERZEUGEN_PFAD);
  assert.equal(codePruefsumme(a), codePruefsumme(b));
});
