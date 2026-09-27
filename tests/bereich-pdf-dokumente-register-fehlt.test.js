'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Dokumente & Prüftermine im Bereichs-PDF (Fund 19.09.2026, behoben 19.09.2026)
   ────────────────────────────────────────────────────────────────────────
   GEFUNDEN bei A1b („gefüllten Privat-Bereich am Artefakt
   prüfen"): ein echter, per Klick über die UI angelegtes Vorsorge-Dokument
   (Patientenverfügung, „Gültig ab" 18.09.2026) wurde über einen echten Klick
   als Bereichs-PDF „Vorsorge & Recht" ausgegeben — mit `pdftotext` (poppler,
   fremd) gelesen. Weder „Patientenverfügung" noch das Datum erschienen im
   Text; die PDF-eigene Zeile lautete „Vollständiger Auszug — keine
   vorhandenen Angaben zurückgehalten." (STRINGS.pdfHerkunftVollstaendig).

   URSACHE (gelesen, nicht geraten): `_bereichSektionenModell()` (Quelle für
   `bereichVollModell`/`vollDepotModell`, also JEDES PDF) las ausschließlich
   `data.sektoren[id]` (Kern-Felder) und `_templateAbschnitte(id)` (angedockte
   Modul-Felder) — an KEINER Stelle `data.dokumente[]`. Gezielt nach einem
   ADR gesucht, das diesen Ausschluss trägt — keines gefunden (U2-ADR-118
   entscheidet nur den ICS-Weg, U2-ADR-014 stellt die Frage offen).

   BEHOBEN: `_bereichSektionenModell()` hängt jetzt eine Sektion
   `STRINGS.dokumentPanelTitel` an — dieselbe Filterung wie `dokumentPanelHTML`
   (nur dieser Bereich, `quelle:'erkannt-abgelehnt'` zählt nicht), dieselbe
   Sensibel-Regel wie ein Feld (`d.sensibel`, `inklSensibel` schaltet frei).
   Wirkt damit automatisch auch im Gesamt-/Vollauszug-PDF (`vollDepotModell`
   ruft dieselbe Funktion je Bereich).

   ROT-BEWEIS (19.09.2026, am echten Bestand gefahren, nicht nur hier):
   den neuen Block aus `_bereichSektionenModell` entfernt → diese Probe unten
   bricht (`AssertionError`, Dokumentname/Datum fehlen wieder) → Block exakt
   zurückgenommen (Backup-Diff geprüft, byte-identisch) → Probe wieder grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'BereichPdfDokRegisterRot-2026!';

test('Bereichs-PDF „Vorsorge & Recht" zeigt ein angelegtes Patientenverfügungs-Dokument', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');

  // Dasselbe Feld, das die UI braucht, damit `bereichVollModell('advanceCare')` überhaupt
  // eine nicht-leere Sektion hat — sonst wäre „leer" allein schon der (falsche) Befund.
  V.sektorFeldSetzen('advanceCare', 'dailyRoutineActivities', 'Früh aufstehen');

  // Echte Form/echter Wert, wie ihn die UI beim „Termin eintragen"-Dialog erzeugt (per
  // Klick gemessen, 19.09.2026): _dokumenteRoot legt data.dokumente[] additiv an.
  const data = V.getData();
  const reg = V._dokumenteRoot(data);
  reg.push({
    id: 'pv-rotbeweis-1', typ: 'living-will', name: 'Patientenverfügung',
    sektorId: 'advanceCare', gueltigAb: '2026-09-18', ablaufDatum: null,
    aktualisiertAm: '2026-09-19', erstelltAm: '2026-09-19', felder: [],
    mappeRef: null, istStandard: true, quelle: 'standard', sensibel: false,
    adresse: '', partei: '', pruefIntervallMonate: 12,
  });
  V.setData(data);

  const modell = V.bereichVollModell('advanceCare', { sensibel: true });
  assert.equal(modell.bereiche[0].leer, false, 'Vorbedingung: der Bereich selbst ist nicht leer');

  const dokSektion = modell.bereiche[0].sektionen.find((s) => s.titel === V.STRINGS.dokumentPanelTitel);
  assert.ok(dokSektion, 'eine Dokumente-&-Prüftermine-Sektion existiert im Bereichs-Modell');
  const zeile = dokSektion.zeilen.find((z) => z.label === 'Patientenverfügung');
  assert.ok(zeile, 'die angelegte Patientenverfügung erscheint als eigene Zeile');
  assert.equal(zeile.wert, V.STRINGS.dokumentDatumLabel + ': 18.09.26',
    'Datum menschlich formatiert (datumKurz), derselbe Text wie am Bildschirm');
});

test('[Sensibel-Gegenprobe] ein als sensibel markiertes Dokument bleibt ohne inklSensibel zurückgehalten', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('advanceCare', 'dailyRoutineActivities', 'Früh aufstehen');

  const data = V.getData();
  const reg = V._dokumenteRoot(data);
  reg.push({
    id: 'pv-sensibel-1', typ: 'living-will', name: 'Sensibles Dokument',
    sektorId: 'advanceCare', gueltigAb: '2026-09-18', ablaufDatum: null,
    aktualisiertAm: '2026-09-19', erstelltAm: '2026-09-19', felder: [],
    mappeRef: null, istStandard: true, quelle: 'standard', sensibel: true,
    adresse: '', partei: '', pruefIntervallMonate: 12,
  });
  V.setData(data);

  const ohneSensibel = V.bereichVollModell('advanceCare');
  const zeilenOhne = (ohneSensibel.bereiche[0].sektionen.find((s) => s.titel === V.STRINGS.dokumentPanelTitel) || { zeilen: [] }).zeilen;
  const sensiblesOhne = zeilenOhne.find((z) => z.label === 'Sensibles Dokument');
  assert.ok(sensiblesOhne && sensiblesOhne.wert === V.STRINGS.zurueckgehaltenVorhanden, 'sensibel ohne inklSensibel: nur der Freigabe-Satz, keine Angaben des Dokuments');

  const mitSensibel = V.bereichVollModell('advanceCare', { sensibel: true });
  const labelsMit = mitSensibel.bereiche[0].sektionen.find((s) => s.titel === V.STRINGS.dokumentPanelTitel).zeilen.map((z) => z.label);
  assert.ok(labelsMit.includes('Sensibles Dokument'), 'mit inklSensibel wieder sichtbar');
});

test('[Gegenprobe] ein Dokument ohne Gültig-ab-Datum zeigt „kein Prüftermin hinterlegt", kein leerer Wert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('advanceCare', 'dailyRoutineActivities', 'Früh aufstehen');

  const data = V.getData();
  const reg = V._dokumenteRoot(data);
  reg.push({
    id: 'pv-ohne-datum-1', typ: 'living-will', name: 'Patientenverfügung ohne Termin',
    sektorId: 'advanceCare', gueltigAb: null, ablaufDatum: null,
    aktualisiertAm: '2026-09-19', erstelltAm: '2026-09-19', felder: [],
    mappeRef: null, istStandard: true, quelle: 'standard', sensibel: false,
    adresse: '', partei: '', pruefIntervallMonate: 0,
  });
  V.setData(data);

  const modell = V.bereichVollModell('advanceCare', { sensibel: true });
  const dokSektion = modell.bereiche[0].sektionen.find((s) => s.titel === V.STRINGS.dokumentPanelTitel);
  const zeile = dokSektion.zeilen.find((z) => z.label === 'Patientenverfügung ohne Termin');
  assert.equal(zeile.wert, V.STRINGS.prueftermineOhneZeile, 'derselbe Leer-Hinweis wie am Bildschirm, kein leerer Wert');
});

test('[Gegenprobe] ein abgelehnter Erkennungs-Vorschlag (quelle:erkannt-abgelehnt) erscheint NICHT im PDF', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('advanceCare', 'dailyRoutineActivities', 'Früh aufstehen');

  const data = V.getData();
  const reg = V._dokumenteRoot(data);
  reg.push({
    id: 'pv-abgelehnt-1', typ: 'living-will', name: 'Abgelehnter Vorschlag',
    sektorId: 'advanceCare', gueltigAb: '2026-09-18', ablaufDatum: null,
    aktualisiertAm: '2026-09-19', erstelltAm: '2026-09-19', felder: [],
    mappeRef: null, istStandard: false, quelle: 'erkannt-abgelehnt', sensibel: false,
    adresse: '', partei: '', pruefIntervallMonate: 0,
  });
  V.setData(data);

  const modell = V.bereichVollModell('advanceCare', { sensibel: true });
  const dokSektion = modell.bereiche[0].sektionen.find((s) => s.titel === V.STRINGS.dokumentPanelTitel);
  assert.ok(!dokSektion || !dokSektion.zeilen.some((z) => z.label === 'Abgelehnter Vorschlag'),
    'ein abgelehnter Erkennungs-Vorschlag ist kein echtes Dokument, erscheint nicht im PDF');
});

test('vollDepotModell (Gesamt-/Vollauszug-PDF) zeigt dasselbe Dokument über denselben Weg', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('advanceCare', 'dailyRoutineActivities', 'Früh aufstehen');

  const data = V.getData();
  const reg = V._dokumenteRoot(data);
  reg.push({
    id: 'pv-gesamt-1', typ: 'living-will', name: 'Patientenverfügung',
    sektorId: 'advanceCare', gueltigAb: '2026-09-18', ablaufDatum: null,
    aktualisiertAm: '2026-09-19', erstelltAm: '2026-09-19', felder: [],
    mappeRef: null, istStandard: true, quelle: 'standard', sensibel: false,
    adresse: '', partei: '', pruefIntervallMonate: 12,
  });
  V.setData(data);

  const modell = V.vollDepotModell({ sensibel: true });
  const bereich = modell.bereiche.find((b) => b.id === 'advanceCare');
  assert.ok(bereich, 'Vorsorge & Recht ist Teil des Gesamt-Modells');
  const dokSektion = bereich.sektionen.find((s) => s.titel === V.STRINGS.dokumentPanelTitel);
  assert.ok(dokSektion && dokSektion.zeilen.some((z) => z.label === 'Patientenverfügung'),
    'dieselbe Sektion erscheint auch im Gesamt-/Vollauszug-Modell — geteilte Funktion, kein zweiter Pfad');
});
