'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der EINE ankommende Andockweg — und was er beim Empfänger anrichtet.
   „Die Empfängerseite" (17.08.2026), Zug 1.
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND AUS A271: Von fünf Andockwegen erreicht genau einer die Lese-App —
   die Feld-Definitionen aus einem signierten Anbieter-Template (U2-ADR-037).
   **Und er kam beschädigt an.** Der Adapter `_tplDefAlsFeld` liess zwei Angaben
   fallen, die der Kern übernimmt:

     `codeSystemId` → `codeListe` — ohne den Marker fällt ein Chip-Array nicht in
       den Chip-Zweig von `feldWertText`, sondern in den String-Zweig.
     `optionen` — ein `auswahl`-Feld ohne Optionsliste zeigt den ROHEN Schlüssel.

   **Die Bürgerin sieht die Bezeichnung, der Empfänger eine Kennung** — dieselbe
   Klasse, die A273 für die Beschriftungen geschlossen hat.

   WARUM DAS NICHT IN DIE PARITÄTS-PRÜFUNG GEHÖRT (der Auftrag verlangt, erst
   nachzusehen): `tests/paritaet-kern-lese.test.js` vergleicht DEKLARATIONEN aus
   `SEKTOR_BY_ID` — beide Bäume, kein Depot. Angedockte Felder sind kein
   Deklarationsbestand, sondern Laufzeit-Daten aus `data.feldDefinitionen[]`; sie
   kommen in keinem der beiden Bäume vor. Sie brauchen einen eigenen Ort.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const lesen = () => { const r = ladeLesen(); return r.V || r; };

/* ── Rot-Beleg: derselbe Wert, beide Anwendungen, dieselbe Anzeige ────────── */

test('[Andock·Lesen] ein angedocktes Code-Feld zeigt beim Empfänger die BEZEICHNUNG, nicht den Code', () => {
  const L = lesen();
  const def = { sektorId: 'gesundheit', feldId: 'tpl_diagnose', typ: 'text', label: 'Diagnose', codeSystemId: 'tpl_icd' };
  const wert = [{ text: 'Diabetes mellitus Typ 2', code: { system: 'tpl_icd', code: 'E11' } }];
  assert.equal(L.feldWertText(L._tplDefAlsFeld(def), wert), 'Diabetes mellitus Typ 2');
});

test('[Andock·Lesen] ein angedocktes Auswahl-Feld zeigt das LABEL, nicht den Schlüssel', () => {
  const L = lesen();
  const def = { sektorId: 'verwaltung', feldId: 'tpl_art', typ: 'auswahl', label: 'Art',
    optionen: [{ wert: 'amtlich', label: 'Amtlich beglaubigt' }, { wert: 'privat', label: 'Privatschriftlich' }] };
  assert.equal(L.feldWertText(L._tplDefAlsFeld(def), 'amtlich'), 'Amtlich beglaubigt');
});

test('[Andock·Lesen] KERN UND LESE-APP zeigen denselben Wert gleich — das ist die eigentliche Zusicherung', () => {
  const { V: K } = ladeKern();
  const L = lesen();
  const faelle = [
    [{ sektorId: 'gesundheit', feldId: 'tpl_a', typ: 'text', label: 'A', codeSystemId: 'tpl_icd' },
      [{ text: 'Bluthochdruck', code: { system: 'tpl_icd', code: 'I10' } }]],
    [{ sektorId: 'verwaltung', feldId: 'tpl_b', typ: 'auswahl', label: 'B',
      optionen: [{ wert: 'x', label: 'Klartext X' }] }, 'x'],
    [{ sektorId: 'verwaltung', feldId: 'tpl_c', typ: 'text', label: 'C' }, 'einfacher Text'],
    [{ sektorId: 'verwaltung', feldId: 'tpl_d', typ: 'zahl', label: 'D' }, 42],
  ];
  for (const [def, wert] of faelle) {
    assert.equal(L.feldWertText(L._tplDefAlsFeld(def), wert),
      K.feldWertText(K._templateDefAlsFeld(def), wert), def.feldId);
  }
});

test('[Andock·Lesen·Rot] OHNE die Marker zeigt die Lese-App etwas anderes — der Zustand vor dem 17.08.', () => {
  // Der Rot-Beleg ohne Datei-Mutation: der alte Adapter, hier nachgebaut, liefert für
  // dieselben zwei Fälle nachweislich NICHT die Bezeichnung. Ohne diese Probe wäre nicht
  // belegt, dass die zwei Zeilen im Adapter überhaupt etwas bewirken.
  const L = lesen();
  const alterAdapter = (def) => ({ id: def.feldId, typ: def.typ, label: def.label || def.feldId });

  const codeDef = { feldId: 'tpl_a', typ: 'text', label: 'A', codeSystemId: 'tpl_icd' };
  const codeWert = [{ text: 'Bluthochdruck', code: { system: 'tpl_icd', code: 'I10' } }];
  assert.notEqual(L.feldWertText(alterAdapter(codeDef), codeWert), 'Bluthochdruck',
    'alt: der Chip-Array fiel in den String-Zweig');
  assert.equal(L.feldWertText(L._tplDefAlsFeld(codeDef), codeWert), 'Bluthochdruck', 'neu: Bezeichnung');

  const wahlDef = { feldId: 'tpl_b', typ: 'auswahl', label: 'B', optionen: [{ wert: 'x', label: 'Klartext X' }] };
  assert.equal(L.feldWertText(alterAdapter(wahlDef), 'x'), 'x', 'alt: der rohe Schlüssel');
  assert.equal(L.feldWertText(L._tplDefAlsFeld(wahlDef), 'x'), 'Klartext X', 'neu: das Label');
});

test('[Andock·Lesen] der Adapter übernimmt NUR, was der Kern auch übernimmt', () => {
  // Kein stiller Zuwachs: `pflicht` (die Lese-App bearbeitet nicht) und `hint` (sie
  // rendert keinen) bleiben draussen — sonst wächst hier eine zweite, eigene Form.
  const L = lesen();
  const f = L._tplDefAlsFeld({ feldId: 'tpl_x', typ: 'text', label: 'X', pflicht: true, hint: 'Hinweis', mehrzeilig: true });
  assert.deepEqual(Object.keys(f).sort(), ['id', 'label', 'typ']);
  assert.equal(f.typ, 'textarea', 'mehrzeilig wird zu textarea — wie im Kern');
});
