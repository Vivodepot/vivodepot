'use strict';
/* Jede Importart ist an die Anzeige angeschlossen (12.10.2026, Befund IMPORT-VERWIRFT-OHNE-ANZEIGE)
   Das Anzeige-Modell führt je Importart eine Zeile. Angeschlossen an die Oberfläche sind mit v929 der Modul-Einlass, die
   Vorlage, die Anfrage und die Konfiguration vor dem Depot. Für die übrigen Arten bildet noch keine Stelle das Modell: was
   sie verwerfen, erfährt die Person nicht.

   Diese Probe ist die ERWARTETE RÖTE des Befunds. Sie wird grün, sobald jede Art der Liste angeschlossen ist; dann fällt das
   `todo` und seine Zeile in der Liste der ausgesetzten Proben. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const aufruf = (art) => "importAnzeigeModell('" + art + "'";
/* Die Arten, für die keine Stelle der Quelle das Modell bildet. */
const artenOhneAnschluss = (arten, quelle) => arten.filter((art) => !quelle.includes(aufruf(art)));

test('[Import-Anzeige·offen] jede Importart der Liste ist an die Oberfläche angeschlossen',
  { todo: 'Befund IMPORT-VERWIRFT-OHNE-ANZEIGE (HOCH): angeschlossen sind modul, vorlage, anfrage und vor-depot-konfiguration; die übrigen Arten fehlen' },
  () => {
    const { V } = ladeKern();
    assert.deepEqual(artenOhneAnschluss(V.IMPORT_ANZEIGE_ARTEN, KERN), [], 'für diese Arten bildet keine Stelle der Oberfläche das Modell');
  });

test('[Import-Anzeige·angeschlossen] die vier mit v929 angeschlossenen Arten sind es', () => {
  assert.deepEqual(artenOhneAnschluss(['modul', 'vorlage', 'anfrage', 'vor-depot-konfiguration'], KERN), []);
});

test('[Import-Anzeige·Rot-Beweis] eine Art, deren Anschluss entfällt, wird benannt; sind alle angeschlossen, bleibt die Liste leer', () => {
  const { V } = ladeKern();
  const arten = Array.from(V.IMPORT_ANZEIGE_ARTEN);
  assert.ok(KERN.includes(aufruf('modul')), 'Vorbedingung: der Modul-Einlass ist angeschlossen');
  assert.ok(artenOhneAnschluss(arten, KERN.split(aufruf('modul')).join('importAnzeigeModell(')).includes('modul'));
  assert.deepEqual(artenOhneAnschluss(arten, arten.map((a) => aufruf(a) + ', r)').join('\n')), []);
});
