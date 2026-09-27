'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Lese-Spiegel der Bürger-App-Migration 39 → 40 (U2-ADR-096 Block E).
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor dem Fold geschrieben und rot.

   WARUM DAS IN DENSELBEN ZUG GEHÖRT wie der Schema-Bump und nicht in den
   späteren Spiegel-Punkt: Die Bürger-App migriert beim Öffnen. Die Lese-App
   migriert NICHT — sie bekommt die Datei, wie sie ist. Ein Depot, das seit
   dem Update nie in der Bürger-App geöffnet wurde, trägt die zwölf `ki_*`
   weiterhin flach in `verwaltung`. Ohne diesen Fold zeigt die Lese-App dort
   NICHTS: keine Zeile in Vorsorge, und in Verwaltung ist keines dieser
   Felder deklariert (dort leben die anders benannten `ki_verhalten_*`).

   Read-only geprüft: Genau dieser Fall wurde vor dem Bau gemessen, nicht
   vermutet — Schema 40 zeigte die KI-Verfügung korrekt, Schema 39 zeigte
   sie gar nicht. Die Lese-App VERWEIGERT nichts (sie prüft die Version nur
   als Formmerkmal), sie schweigt — und Schweigen ist hier ununterscheidbar
   von „die Bürgerin hat nichts hinterlegt".

   Der Fold ist read-only, additiv und idempotent — wie seine drei
   Vorgänger (28→29, 29→30, 38→39).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeLesen } = require('./load-lesen.js');

// Ein Depot, wie es aus einer Bürger-App VOR Block E kommt: ki_* flach in verwaltung.
const DEPOT_39 = () => ({
  schemaVersion: 39,
  sektoren: {
    verwaltung: { bundid_email: 'maria@example.org', ki_grundentscheidung: 'erlaubnis', ki_raum: 'privat' },   // Alt-Datei: deutsche Kennungen
    vorsorge: {},
  },
  menschen: [],
});

/* Ueber den ECHTEN Oeffnen-Pfad, nicht ueber setData: `setData` weist nur zu und laeuft an
   allen Lese-Spiegeln vorbei. Ein Test darueber wuerde die Folds gar nicht ausfuehren und
   trotzdem gruen aussehen, sobald die Datei den Zielzustand schon traegt — er pruefte dann
   nur sich selbst. (Genau darauf bin ich beim ersten Anlauf hereingefallen.) */
const vorsorgeHTML = (V, depot) => { V.setData(V._foldVollmachtenLesen(depot)); return V.sektorHTML('advanceCare'); };

test('[LeseFold40] Schema-39-Datei: die KI-Verfuegung wird SICHTBAR, nicht verschwiegen', () => {
  const L = ladeLesen(); const V = L.V || L;
  const html = vorsorgeHTML(V, DEPOT_39());
  assert.ok(/Nachbildung|KI-Verf/i.test(html),
    'die KI-Zeile erscheint im Vorsorge-Bereich — ohne Fold zeigt die Lese-App hier nichts, '
    + 'und „nichts" ist von „nichts hinterlegt" nicht zu unterscheiden');
});

test('[LeseFold40] die Werte selbst kommen an, nicht nur die Ueberschrift', () => {
  const L = ladeLesen(); const V = L.V || L;
  const html = vorsorgeHTML(V, DEPOT_39());
  // Eine sichtbare, aber leere Zeile waere schlimmer als keine: Sie behauptet, es sei nichts
  // hinterlegt, obwohl die Angaben im Depot stehen.
  assert.ok(/erlaub/i.test(html), 'die Grundentscheidung ist lesbar');
});

test('[LeseFold40] Schema-40-Datei (bereits migriert) bleibt unveraendert richtig', () => {
  const L = ladeLesen(); const V = L.V || L;
  const html = vorsorgeHTML(V, {
    schemaVersion: 40,
    sektoren: { advanceCare: { provisionInstruments: [
      { id: 'k1', instrument: 'ki-verfuegung', basicDecision: 'erlaubnis' }] } },
    menschen: [],
  });
  assert.ok(/erlaub/i.test(html), 'der migrierte Fall funktionierte schon vorher und muss es weiter tun');
});

test('[LeseFold40] read-only: der Fold legt KEINE leere Zeile an, wenn nichts da ist', () => {
  const L = ladeLesen(); const V = L.V || L;
  const html = vorsorgeHTML(V, {
    schemaVersion: 39,
    sektoren: { verwaltung: { bundid_email: 'x@y.z' }, vorsorge: {} },
    menschen: [],
  });
  assert.ok(!/Nachbildung/i.test(html),
    'ein Geistereintrag waere eine Behauptung ueber die Buergerin, die sie nie aufgestellt hat');
});
