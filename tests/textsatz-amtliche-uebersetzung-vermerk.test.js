'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-amtliche-uebersetzung-vermerk.test.js — U2-ADR-363, Anlage Vermerk
   (07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Wörtlich: „Die dt. Version muss dann mit einem Vermerk
   gekennzeichnet sein. Und natürlich ist es besser, wenn eine amtliche
   Übersetzung vorliegt. Deren Vorhandensein muss also ausgeschlossen sein."

   AMTLICHE_UEBERSETZUNG_FESTSTELLUNG modelliert die FORM dieser Feststellung —
   quelle/datum/ergebnis je Dokument — MIT AUSDRÜCKLICH OFFENEN, LEEREN
   Beleg-Feldern für alle vier Dokumente. Die eigentliche Recherche (BMJ/BZgA:
   liegt wirklich keine amtliche Übersetzung vor?) ist NICHT Gegenstand dieses
   Baus — eine eigene, später beauftragte Erhebung. Diese Probe hält darum
   AUSDRÜCKLICH fest, dass heute alle vier offen sind (Bericht an), und
   beweist zugleich am Mechanismus selbst: der Vermerk erscheint NUR, wenn eine
   Feststellung vollständig auf Record steht — nie aus der bloßen Tatsache,
   dass ein Dokument amtlichen Wortlaut trägt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const DOKUMENTE = ['living-will', 'enduring-power-of-attorney', 'custodianship-declaration', 'ki-verfuegung'];
const satzMit = (texte) => ({
  modulTyp: 'textsatz', sprache: 'zz', moduleVersion: 1, anbieterId: 'pruefstoff', texte,
});
function mitSprache(V, texte) {
  const d = V.leeresDepot();
  d.textsatzModule = [satzMit(texte)];
  d.textsprache = 'zz';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  return d;
}
function zurueckAufDeutsch(V, d) {
  d.textsprache = 'de';
  V.setData(d);
  V.textsatzNeuAnwenden();
}

test('[_dokumentUnuebersetzteStellen·Fund] eine sichtbare Kennung im Dokument zaehlt als offen — der Zaehler darf nie 0 behaupten', () => {
  /* U2-ADR-363 (Fund 07.09.2026): VOR diesem Fund verliess sich die Zaehlung auf
     `textLesen(k) === AB_WERK_TEXTSATZ_DE[k]` — ein Signal, das nur funktionierte, SOLANGE
     textLesen() bei fehlender Uebersetzung auf AB_WERK_TEXTSATZ_DE zurueckfiel (der jetzt
     entfernte Rueckfall). Ohne ihn liefert eine echte Luecke `null`, nicht mehr den deutschen
     Text — die alte Bedingung traf nie mehr zu. Diese Probe registriert ein Modul, das
     GARANTIERT NICHTS der Betreuungsverfuegung uebersetzt (leeres `texte`) — die Bedienoberflaeche
     zeigt an dieser Stelle sichtbare KENNUNGEN (s. _textsatzKnotenFuellenOhnePflicht) — und
     verlangt, dass der Zaehler das erkennt (> 0), nicht schweigt (0). */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.textsatzModule = [{ modulTyp: 'textsatz', sprache: 'zz', moduleVersion: 1, anbieterId: 'pruefstoff', texte: {} }];
  d.textsprache = 'zz';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  try {
    const offen = V._dokumentUnuebersetzteStellen(V.BETREUUNG_MODUL);
    assert.ok(offen > 0,
      'ohne jede Uebersetzung UND ohne Rueckfall muss der Zaehler > 0 melden — 0 waere die ' +
      'falsche Zusicherung "keine unuebersetzten Passagen", waehrend Kennungen sichtbar sind');
  } finally {
    d.textsprache = 'de';
    V.setData(d);
    V.textsatzNeuAnwenden();
  }
});

test('[Vermerk·Bestand] AMTLICHE_UEBERSETZUNG_FESTSTELLUNG kennt genau die vier Dokumente', () => {
  const { V } = ladeKern();
  assert.deepEqual(Object.keys(V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG).sort(), DOKUMENTE.slice().sort());
});

test('[Vermerk·Beleg-Bericht] heute stehen ALLE VIER Feststellungen offen — kein Beleg, keine Recherche vorweggenommen', () => {
  const { V } = ladeKern();
  const offen = [];
  for (const doc of DOKUMENTE) {
    const f = V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG[doc];
    if (f.quelle === null && f.datum === null && f.ergebnis === null) offen.push(doc);
  }
  /* Dies ist der Bericht an, als Probe festgehalten statt nur im Chat gesagt: die
     eigentliche Recherche wurde bewusst NICHT durchgeführt (separate, spätere Erhebung). */
  assert.deepEqual(offen.sort(), DOKUMENTE.slice().sort(),
    'jedes der vier Dokumente sollte heute ohne Beleg sein — stimmt das nicht mehr, ist die ' +
    'Recherche inzwischen gelaufen und dieser Test muss die neuen Werte widerspiegeln, nicht verstecken');
});

test('[Vermerk] ohne Feststellung erscheint KEIN Vermerk, auch bei fremder Sprache im amtlichen Dokument', () => {
  const { V } = ladeKern();
  for (const doc of DOKUMENTE) {
    assert.equal(V.amtlicheUebersetzungVermerkNoetig(doc), false, doc);
  }
});

test('[Vermerk] auf Deutsch bleibt der Vermerk aus, selbst mit vollständiger Feststellung', () => {
  const { V } = ladeKern();
  const original = V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG;
  V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG = Object.freeze(Object.assign({}, original, {
    'living-will': Object.freeze({
      quelle: 'Test-Beleg (Probe)', datum: '2026-09-07', ergebnis: 'keine-amtliche-uebersetzung',
    }),
  }));
  // KEIN mitSprache() hier — die eingebaute Sprache (Deutsch) ist aktiv, dieselbe Sprache wie
  // der Originaltext selbst. Der Vermerk erklärt einer NICHT-deutschen Leserin, warum sie
  // Deutsch sieht — für eine deutsche Leserin ist er sinnlos.
  assert.equal(V.amtlicheUebersetzungVermerkNoetig('living-will'), false,
    'auf Deutsch darf der Vermerk nicht erscheinen, egal wie vollständig die Feststellung ist');
});

test('[Vermerk] eine VOLLSTAeNDIGE Feststellung schaltet den Vermerk frei — NUR bei fremder Sprache', () => {
  const { V } = ladeKern();
  const original = V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG;
  assert.equal(original['living-will'].quelle, null, 'Vorbedingung: heute offen');
  mitSprache(V, {});

  // `AMTLICHE_UEBERSETZUNG_FESTSTELLUNG` ist im Kern ein `let` GENAU dafür (s. Kopf-Kommentar
  // an der Definition in vivodepot.html) — eine spätere, echte Landung ersetzt den GESAMTEN
  // Bestand ebenso, nie ein einzelnes Feld an Ort und Stelle.
  V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG = Object.freeze(Object.assign({}, original, {
    'living-will': Object.freeze({
      quelle: 'Test-Beleg (Probe)', datum: '2026-09-07', ergebnis: 'keine-amtliche-uebersetzung',
    }),
  }));
  assert.equal(V.amtlicheUebersetzungVermerkNoetig('living-will'), true,
    'vollständige Feststellung + fremde Sprache muss den Vermerk freischalten');
  assert.equal(V.amtlicheUebersetzungVermerkNoetig('enduring-power-of-attorney'), false,
    'ein anderes Dokument bleibt unberührt — kein Flächenbrand');
});

test('[Vermerk·Rot-Beweis] das Dokument selbst zeigt den Vermerk nur MIT Feststellung — entfernen macht ihn wieder verschwinden', async () => {
  const { V } = ladeKern();
  const original = V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG;

  const d = mitSprache(V, { 'strings:amtlicherWortlautVermerk.text': 'No official translation exists for this wording.' });
  const abOhne = V.modulDokumentAbschnitte(V.PV_MODUL, null);
  const zeilenOhne = abOhne.flatMap((a) => a.zeilen);
  assert.ok(!zeilenOhne.some((z) => /No official translation exists/.test(z)),
    'ohne Feststellung darf der Vermerk-Text nirgends im Dokument stehen');

  V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG = Object.freeze(Object.assign({}, original, {
    'living-will': Object.freeze({
      quelle: 'Test-Beleg (Probe)', datum: '2026-09-07', ergebnis: 'keine-amtliche-uebersetzung',
    }),
  }));
  const abMit = V.modulDokumentAbschnitte(V.PV_MODUL, null);
  const zeilenMit = abMit.flatMap((a) => a.zeilen);
  assert.ok(zeilenMit.some((z) => /No official translation exists/.test(z)),
    'MIT vollständiger Feststellung muss der Vermerk-Text im Dokument stehen');

  // Der eigentliche Rot-Beweis: die Feststellung WIEDER zurücknehmen macht den Vermerk wieder
  // verschwinden — ohne diese Hälfte bewiese der Test oben nur, dass IRGENDETWAS erscheint.
  V.AMTLICHE_UEBERSETZUNG_FESTSTELLUNG = original;
  const abZurueck = V.modulDokumentAbschnitte(V.PV_MODUL, null);
  const zeilenZurueck = abZurueck.flatMap((a) => a.zeilen);
  assert.ok(!zeilenZurueck.some((z) => /No official translation exists/.test(z)),
    'nach dem Zurücknehmen der Feststellung darf der Vermerk nicht mehr erscheinen');

  zurueckAufDeutsch(V, d);
});
