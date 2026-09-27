'use strict';
/* ════════════════════════════════════════════════════════════════════════
   EXP1 (19.09.2026) — Export-Rundlauf eines ALTEN Depots.

   AUFTRAG (wörtlich): „Altes Depot (referenzdepot-vor-kennungsumbau) → Migration
   → jedes der 10 Exportformate plus natives JSON → wieder einlesen, wo das Format
   einen Eingang hat. Nichts darf verloren gehen: Felder, Dokumente, Module,
   Bereiche. Wo ein Format keinen Eingang hat: am Artefakt mit Fremdparser prüfen,
   dass die Inhalte drinstehen. Probe je Format mit Rot-Beweis, Funde reparieren."

   WEG: dasselbe alte, eingefrorene Depot (tests/fixtures/referenzdepot-vor-
   kennungsumbau.js, aus f165f9d8, alte deutsche Kennungen), bei schemaVersion 80
   (unmittelbar VOR der Kennungsumbau-Stufe 81) in einen frisch angelegten Kern
   eingesetzt, dann `depotNormalisieren()` — derselbe Weg, den ein echtes Öffnen
   einer alten Datei nimmt (dieselbe Technik wie
   tests/migration-mig1-nebenablagen-kennungsstand.test.js, nur mit dem echten
   Referenzdepot statt Einzelfeld-Fixtures). ANDERS als
   tools/rundlauf-matrix.js (das Referenzdepot direkt in aktueller Kennung
   einsetzt, keine Migration) — hier ist die Migration selbst Teil der Kette.

   MASSSTAB (wie tools/rundlauf-matrix.js): „läuft rund" heißt, der GLEICHNAMIGE
   Einlese-Kanal nimmt die Ausgabe an und jede Zeile trägt exakt den Wert, der im
   migrierten Depot steht (`zeilenVergleichen`, wiederverwendet aus
   tools/rundlauf-matrix.js — keine zweite Vergleichslogik daneben).

   „DOKUMENTE" IM AUFTRAG: die einzige Exportart, die `data.dokumente[]` liest,
   ist `ics-vorsorge` (über `prueftermineDokumente()`) — kein anderes der zehn
   Formate baut aus dem Dokument-Register, sondern ausschließlich aus `sektoren`/
   `menschen`/`institutionen`. EIN altes-Kennung-Dokument (advanceCare/
   vorsorgevollmacht, unter der alten sektorId `vorsorge` angelegt) prüft darum
   genau diesen Weg: K4 (`_nebenablagenKennungenUmschreiben`, 15.09.2026) schreibt
   `dokumente[].sektorId` bereits um — diese Probe ist der erste End-zu-Ende-Beleg
   dafür, dass der umgeschriebene Datensatz auch im ICS-Export ankommt, nicht nur
   in der Nebenablage selbst.

   `ics-vorsorge` TRÄGT `nurExport: true` (kein Einlesekanal, s. Kommentar an
   seiner Registry-Zeile: „der ICS-Import … ist ENTFERNT"). Für dieses eine Format
   verlangt der Auftrag ausdrücklich einen FREMDPARSER statt eines Reimports:
   `ical.js` (MPL-2.0, Mozilla — dieselbe Bibliothek, die
   ausgaenge-pdf-vcard-ics-gemessen-2026-09-18.md für denselben Zweck einsetzte;
   auf DIESEM Zweig als eigene devDependency nachgezogen, da jener Bau auf einem
   anderen, noch nicht gelandeten Zweig entstand).

   ERGEBNIS DER MESSUNG (s. Bericht exp1-export-rundlauf-altes-depot-2026-09-19.md):
   alle Formate mit eigenem Einlesekanal (zur Zeit der Messung zehn, inzwischen neun ohne JSON-Vollexport) liefen beim
   ersten Lauf bereits rund (`anders: []`) — kein Migrationsverlust gefunden. Die
   Proben unten sind darum
   Abnahme-Wächter gegen künftige Regressionen, kein Fund-Fix. Ein Rot-Beweis
   [EXP1·Rot-Beweis] zeigt, dass die Vergleichsprobe eine echte Verfälschung auch
   tatsächlich findet (Methodik-Beleg, keine Reparatur eines Produktfehlers).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ICAL = require('ical.js');
const { ladeKern } = require('../load-kern.js');
const altesFixture = require('../fixtures/referenzdepot-vor-kennungsumbau.js');
const { zeilenVergleichen, planZeilen } = require('../../tools/rundlauf-matrix.js');

const PASSWORT = 'exp1-export-rundlauf-2026-09-19';
const JETZT = new Date('2026-01-15T09:00:00.000Z');

// EIN Dokument mit alter sektorId — die einzige Nebenablage, die in einen der
// zehn Exportkanäle (ics-vorsorge) einfließt. Alle übrigen Felder (Felder,
// Bereiche) kommen bereits vollständig aus baueSektoren() der alten Fixture.
const ALTES_DOKUMENT = Object.freeze({
  id: 'exp1-doc-vorsorgevollmacht', typ: 'vorsorgevollmacht', sektorId: 'vorsorge',
  name: 'Vorsorgevollmacht', gueltigAb: '2026-01-01', aktualisiertAm: '2026-01-01',
  pruefIntervallMonate: 12, quelle: 'manuell',
});

async function altesDepotMigriert() {
  const { V } = ladeKern();
  await V.depotAnlegen(PASSWORT);
  const d = V.getData();
  d.menschen = altesFixture.MENSCHEN.map((m) => Object.assign({}, m));
  d.institutionen = altesFixture.INSTITUTIONEN.map((i) => Object.assign({}, i));
  d.sektoren = altesFixture.baueSektoren();
  d.dokumente = [Object.assign({}, ALTES_DOKUMENT)];
  d.schemaVersion = 80;   // unmittelbar vor Stufe 81 (Kennungsumbau) — der reale Stand vor f165f9d8
  V.depotNormalisieren(d);
  V.setData(d);
  return { V, d };
}

// Alle bereichNeu-Ziele der 12 alten Bereiche — aus KENNUNG_MAPPING, keine Handliste
// (dieselbe Herleitung wie jeBereichEinFeld in tests/migration-mig1-nebenablagen-kennungsstand.test.js).
function bereicheNeuAusMapping(V) {
  const out = new Set();
  for (const z of V.KENNUNG_MAPPING) if (!z.istUnterfeld) out.add(z.bereichNeu);
  return out;
}

test('[EXP1] jedes Exportformat mit eigenem Einlesekanal läuft nach der Migration rund — nichts verloren', async () => {
  const { V } = await altesDepotMigriert();
  const importIds = V.IMPORT_FORMATE.map((f) => f.id);
  let geprueft = 0;
  for (const def of V.EXPORT_FORMATE) {
    if (def.nurExport) continue;
    assert.ok(importIds.includes(def.id), def.id + ': kein Einlesekanal, obwohl nicht nurExport');
    const text = V.formatExportInhalt(def, { sensibel: true, jetzt: JETZT });
    const plan = V.importPlan(def.id, text);
    assert.ok(plan && !plan.ungueltig, def.id + ': eigener Einlesekanal lehnt die eigene Ausgabe ab');
    assert.ok(planZeilen(plan) > 0, def.id + ': eigener Einlesekanal liefert keine Zeile');
    const { anders } = zeilenVergleichen(V, plan);
    assert.deepEqual(anders, [], def.id + ': ' + anders.length + ' Wert(e) weichen nach Migration+Export+Reimport vom Depot ab');
    geprueft++;
  }
  assert.equal(geprueft, 9, 'erwartet neun Formate mit eigenem Einlesekanal (zehn EXPORT_FORMATE minus ics-vorsorge/nurExport; der offene JSON-Vollexport ist entfernt, json ist nur noch Import)');
});

test('[EXP1] ics-vorsorge (kein Einlesekanal): Fremdparser (ical.js) findet das migrierte Dokument', async () => {
  const { V, d } = await altesDepotMigriert();
  const def = V.EXPORT_FORMATE.find((f) => f.id === 'ics-vorsorge');
  assert.ok(def && def.nurExport, 'Vorbedingung: ics-vorsorge ist weiterhin als nurExport erklärt');
  const text = V.formatExportInhalt(def, { sensibel: true, jetzt: JETZT });

  const jcal = ICAL.parse(text);   // wirft bei strukturell kaputtem ICS — kein eigener Code, echte fremde Bibliothek
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents('vevent');
  assert.equal(vevents.length, 1, 'ein VEVENT für das eine datierte Dokument erwartet');
  const ev = new ICAL.Event(vevents[0]);
  assert.equal(ev.uid, 'vivodepot-doc-' + ALTES_DOKUMENT.id + '@vivodepot.de', 'UID trägt nicht die (migrierte) Dokument-id');
  assert.match(ev.summary, /Vorsorgevollmacht/, 'SUMMARY nennt den Dokumentnamen nicht');
  assert.equal(ev.startDate.toString(), '2027-01-01', 'DTSTART entspricht nicht aktualisiertAm + 12 Monate (Intervall)');

  // Gegenprobe zur Fremdparser-Feststellung: dieselbe sektorId, die K4 (15.09.) bereits
  // umschreibt, muss im migrierten Depot selbst ebenfalls die neue Kennung tragen —
  // sonst prüfte das ICS-Ergebnis oben zufällig richtig, obwohl die Quelle noch alt wäre.
  assert.equal(d.dokumente[0].sektorId, 'advanceCare', 'dokumente[0].sektorId ist nach der Migration nicht umgeschrieben');
});

test('[EXP1] nichts verloren: alle migrierten Bereiche, Menschen, Institutionen sind im Depot', async () => {
  const { V, d } = await altesDepotMigriert();
  const erwarteteBereiche = bereicheNeuAusMapping(V);
  for (const b of erwarteteBereiche) {
    assert.ok(d.sektoren && typeof d.sektoren[b] === 'object' && d.sektoren[b] !== null,
      'Bereich ' + b + ' (Migrationsziel eines alten Bereichs) fehlt nach der Migration');
  }
  assert.equal(d.menschen.length, altesFixture.MENSCHEN.length, 'Menschen-Register hat nach der Migration eine andere Länge');
  assert.equal(d.institutionen.length, altesFixture.INSTITUTIONEN.length, 'Institutionen-Register hat nach der Migration eine andere Länge');
  for (const m of altesFixture.MENSCHEN) {
    assert.ok(d.menschen.some((x) => x.name === m.name), 'Mensch "' + m.name + '" fehlt nach der Migration');
  }
});

test('[EXP1·Rot-Beweis] die Vergleichsprobe erkennt eine echte Verfälschung (Methodik-Beleg, kein Produktfund)', async () => {
  const { V } = await altesDepotMigriert();
  const def = V.EXPORT_FORMATE.find((f) => f.id === 'sd-jwt-vc-identitaet');
  const text = V.formatExportInhalt(def, { sensibel: true, jetzt: JETZT });
  assert.ok(text.includes('Wredenhagen-Sonnenschein'), 'Vorbedingung: der bekannte Nachname steht in der unverfälschten Ausgabe');
  const verfaelscht = text.replace(/Wredenhagen-Sonnenschein/g, 'Falscher-Nachname');
  const plan = V.importPlan('sd-jwt-vc-identitaet', verfaelscht);
  const { anders } = zeilenVergleichen(V, plan);
  assert.ok(anders.length > 0, 'Rot-Beweis verfehlt: eine verfälschte Ausgabe wird als "gleich" durchgewunken');
  assert.ok(anders.some((z) => z.eingelesen === 'Falscher-Nachname'), 'die verfälschte Zeile selbst steht nicht unter "anders"');
});
