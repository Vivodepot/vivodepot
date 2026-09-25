'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A162 · Glied 7 der Nachtkette 16./17.08.2026 — die Browser-Abnahme des
   Eintrag-Bezugs (`zeilenId`) im MEHRZEILEN-Fall.
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND, DER DIESE PROBE AUSLÖST: Die Mehrzeilen-Regel aus M3/Zug 1 ist
   ausschließlich im Node-Harnisch belegt (`tests/m3-eintrag-bezug-zug1.test.js`),
   und dort gegen eine gebaute Depot-Struktur. Gemessen am 16.08.: KEINE Probe
   unter `tests/e2e/`, `tests/mit-modul/` oder `tests/demo/` nennt `zeilenId` —
   der Weg, auf dem eine Bürgerin die Referenz tatsächlich erzeugt, war nie im
   Browser gefahren.

   ABGRENZUNG ZU `m3-zwei-mietvertraege-abnahme.spec.js` (A188, 13.08.): Jene
   Spec prüft die SICHTBARE Unterscheidung zweier gleichnamiger Dokumente über
   Adresse/Partei (A185, Befund 2). Sie sagt nichts über `zeilenId` — die
   Zeilen-Referenz hat bewusst KEINE eigene Anzeige (der „Bezug" IST die
   Referenz, kein drittes Feld; Auftragsgrenze A162/Zug 2). Diese Spec prüft
   deshalb nicht eine Anzeige, sondern dass der ECHTE KLICKWEG im Browser die
   Referenz auf die RICHTIGE Zeile setzt, wenn mehrere Zeilen da sind.

   DER GEFAHRENE WEG IST DER DER BÜRGERIN (C7/U2-ADR-118, Weg 3): Bereich
   Vorsorge → Bearbeiten → „+ Hinzufügen" an der Instrument-Liste → Art wählen,
   Datum setzen → Speichern. Der Eintrag mit Datum registriert sein
   Standard-Dokument über `instrumentDokumentNachtragen` →
   `_dokumentTypRegistrieren` → `dokumentAusStandard` →
   `_standardDokumentFelderMitZeile`. Kein `page.evaluate`-Bypass auf dem
   Erzeugungsweg; `page.evaluate` liest nur den Zustand aus, den der Klickweg
   hinterlassen hat (die Referenz hat keine Anzeige, s. o.).

   WARUM `will` + `living-will` UND NICHT `enduring-power-of-attorney`: gemessen im
   Browser, nicht angenommen — die Vorsorgevollmacht trägt `bevollmaechtigter` als
   PFLICHT-Unterfeld (refMehrfach), `_listenEintragPruefen` weist den Eintrag sonst mit
   `grund:'pflicht'` ab und das Modal bleibt offen. Beide gewählten Typen validieren mit
   Typ + Datum allein und haben eine Standard-Definition mit Feld-Vorverknüpfung.

   ROT-BELEG (16.08.2026, an der ECHTEN `vivodepot.html` gefahren — eine Kopie hätte
   Playwright nicht geladen): `_vorsorgeInstrumentZeileFuerStandardTyp` testweise auf
   `return liste[0]` umgestellt („nimm immer die erste Zeile"). BEIDE Proben rot.
   Rücknahme byte-identisch belegt (MD5 `132979849f390af5e30dcae267109544` vorher wie
   nachher), danach beide wieder grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const KONSOLE_HARMLOS = /Content-Security-Policy|frame-ancestors/i;

/** Eine Instrument-Zeile über den echten Klickweg anlegen (Bearbeiten-Modus vorausgesetzt). */
async function instrumentZeileAnlegen(page, { typ, datum }) {
  await page.click('[data-eintrag-hinzufuegen="provisionInstruments"]');
  const modal = page.locator('#modal-inhalt');
  await expect(modal).toBeVisible();
  await modal.locator('[data-edit="instrument"]').selectOption(typ);
  // `datum` liegt hinter der Diskriminante: erst nach der Typ-Wahl blendet
  // _listenEintragBedingungVerdrahten die passenden Unterfelder ein.
  const datumFeld = modal.locator('[data-edit="dateOfLastChange"]');
  await expect(datumFeld).toBeVisible();
  await datumFeld.fill(datum);
  await page.click('#m-ok');
  await expect(page.locator('#modal-rueck.an')).toHaveCount(0);
}

test('zwei Instrument-Zeilen: jedes Dokument zeigt über zeilenId auf SEINE Zeile, nicht auf die erste', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !KONSOLE_HARMLOS.test(m.text())) fehler.push(m.text()); });

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  // Reihenfolge ist Absicht: das Testament steht ZUERST in der Liste. Ein Fehler, der „nimm
  // die erste Zeile" bedeutet, wäre bei nur einer Zeile unsichtbar und bei gleicher Reihenfolge
  // zufällig richtig — die zweite Zeile ist die eigentliche Probe.
  await instrumentZeileAnlegen(page, { typ: 'will', datum: '2024-03-01' });
  await instrumentZeileAnlegen(page, { typ: 'living-will', datum: '2025-06-15' });

  const befund = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    const zeile = (typ) => (liste.find((r) => r && r.instrument === typ) || {}).id || null;
    const doc = (typ) => (window.__vdOeffentlich.ankerDaten().dokumente || []).find((d) => d && d.typ === typ) || null;
    const ref = (typ) => {
      const d = doc(typ);
      const f = d && (d.felder || []).find((x) => x && x.feldId === 'provisionInstruments');
      return f ? { sektorId: f.sektorId, feldId: f.feldId, zeilenId: f.zeilenId || null } : null;
    };
    return {
      zeilen: liste.length,
      zeileTS: zeile('will'),
      zeilePV: zeile('living-will'),
      refTS: ref('will'),
      refPV: ref('living-will'),
    };
  });

  expect(befund.zeilen, 'beide Zeilen sind über den Klickweg entstanden').toBe(2);
  expect(befund.zeileTS).toBeTruthy();
  expect(befund.zeilePV).toBeTruthy();
  expect(befund.zeileTS).not.toBe(befund.zeilePV);

  // Die eigentliche Zusicherung: jede Referenz trägt eine zeilenId, und zwar die IHRE.
  expect(befund.refTS, 'das Testament hat eine Feld-Referenz').not.toBeNull();
  expect(befund.refPV, 'die Patientenverfügung hat eine Feld-Referenz').not.toBeNull();
  expect(befund.refTS.zeilenId, 'Testament → seine eigene Zeile').toBe(befund.zeileTS);
  expect(befund.refPV.zeilenId, 'Patientenverfügung → ihre eigene Zeile, NICHT die erste der Liste').toBe(befund.zeilePV);
  expect(befund.refPV.zeilenId).not.toBe(befund.zeileTS);

  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});

test('die Rückrichtung (Zeile → Dokumente) trennt die beiden Zeilen im Browser sauber', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  await instrumentZeileAnlegen(page, { typ: 'will', datum: '2024-03-01' });
  await instrumentZeileAnlegen(page, { typ: 'living-will', datum: '2025-06-15' });

  // `dokumenteFuerEintrag` ist BERECHNET, nicht gespeichert (M3/Zug 1) — im Browser ist das
  // die einzige Stelle, an der die Zeile ihre Dokumente kennt. Sie darf nicht beide liefern.
  const rueck = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    const idTS = (liste.find((r) => r && r.instrument === 'will') || {}).id;
    const idPV = (liste.find((r) => r && r.instrument === 'living-will') || {}).id;
    const namen = (id) => window.__vdOeffentlich.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', id).map((d) => d.typ);
    return { ts: namen(idTS), pv: namen(idPV) };
  });

  expect(rueck.ts).toEqual(['will']);
  expect(rueck.pv).toEqual(['living-will']);
});
