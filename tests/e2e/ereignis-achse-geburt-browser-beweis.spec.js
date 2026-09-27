'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — U2-ADR-251 (Paket 2b, Gerüst-Umbau), Auflage 3 (04.09.2026):
   Browser-Beweis für die Ereignis-Achse, nicht nur ein Einheiten-Aufruf.
   ────────────────────────────────────────────────────────────────────────
   DER GRUND, WARUM DAS EINE EINHEITEN-PROBE NICHT ZEIGEN KANN: die vier
   echten Aufrufstellen der Ereignis-Achse (`_ereignisArtenFuerUnterfeld`,
   `ereignisBetreuungsbeginnMarkieren`, `ereignisGeburtMarkieren`,
   `_ereignisAchseEintragFuer`) laufen bei ECHTER Bürger-Nutzung, ausgelöst
   aus einem echten Klickweg (Assistent-Abschluss), nicht bei App-Start. Ein
   Test, der `ereignisGeburtMarkieren()` direkt aufruft, würde eine Lücke in
   der VERDRAHTUNG (Klick → Funktion) nicht sehen — nur ein Test, der den
   echten Klickweg fährt, kann das.

   DIESE PROBE PRÜFT NICHT die neue Docking-Fähigkeit (U2-ADR-251 selbst
   berührt keinen der vier Aufrufer — bewusste Zurückhaltung, s.
   Kopfkommentar bei `ereignisAchseModulPruefen` im Kern). Sie ist das
   Sicherheitsnetz FÜR SPÄTER: sollte ein künftiger Umbau (Gerüst-Umbau
   Paket 3) `EREIGNIS_ACHSE_FELDER` je leeren, ohne die vier Aufrufer auf
   `ereignisAchseFelderAlle()` umzustellen, reißt genau diese Probe — heute
   ist sie GRÜN, weil die native Kette intakt ist (vorher wie nachher).

   KLICKWEG ÜBERNOMMEN, NICHT NEU ERFUNDEN: `gebwizStarten`/
   `bisZumNamenSchrittDurchklicken` sind wörtlich aus
   `gebwiz-kind-abnahme.spec.js` (Zug 4, 11.08.2026) — derselbe Assistent,
   derselbe Weg, hier nur bis zum Ende gefahren und auf die Ereignis-Achse
   statt auf die Kind-Anlage selbst geprüft.

   VORBEDINGUNG PER DIREKTEM DATENWEG (page.evaluate, `listenEintragHinzu
   fuegen` — dieselbe echte Funktion, die auch die UI ruft), NICHT über die
   UI geklickt: das Anlegen eines Testament-Vorsorge-Instruments mit
   befülltem `testament_bedachte` ist eine andere, bereits andernorts
   geprüfte Fähigkeit (Listen-Editor) — nicht Gegenstand dieser Probe.
   Etabliertes Muster in diesem Verzeichnis (s. `depot-liste-sub-kontext.
   spec.js` u. a.), kein Alleingang.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

async function gebwizStarten(page) {
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();
}

async function bisZumNamenSchrittDurchklicken(page) {
  for (let i = 0; i < 6; i++) await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryChildsNameNot"]')).toBeVisible();
}

async function gebwizMitNamenDurchlaufen(page, name) {
  await gebwizStarten(page);
  await bisZumNamenSchrittDurchklicken(page);
  await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', name);
  await page.click('#wiz-weiter');
  await page.click('#wiz-weiter');   // Geburtsdatum leer
  await page.click('#wiz-weiter');   // Verhältnis auf Vorgabe
}

test('Ereignis-Achse: eine Bürgerin trägt eine Geburt ein (echter Klickweg) — ein Testament mit Bedachten wird markiert, vorher nicht, nachher schon', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Vorbedingung: EIN Vorsorge-Instrument mit befülltem testament_bedachte — der einzige Fall,
  // den ereignisGeburtMarkieren heute kennt (EREIGNIS_ACHSE_FELDER, unterFeldId
  // 'testament_bedachte', ereignisse enthält 'geburt').
  const zeilenId = await page.evaluate(() => {
    window.__vdOeffentlich.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
      { instrument: 'will', personsNamedInTheWill: [{ override: 'Ein Neffe (E2E-Vorbedingung)' }] },
      { eingabeArt: 'sonstiges' });
    const liste = window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments;
    return liste[liste.length - 1].id;
  });

  // VORHER: kein Dokument zu dieser Zeile trägt einen 'geburt'-Ereignis-Anlass — die Zeile ist
  // frisch angelegt, es gab noch kein Ereignis, das sie hätte markieren können.
  const vorher = await page.evaluate((zid) => window.__vdOeffentlich.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zid)
    .some((d) => Array.isArray(d.ereignisAnlaesse) && d.ereignisAnlaesse.some((a) => a.typ === 'geburt')), zeilenId);
  expect(vorher, 'vor der Geburt darf kein Dokument einen geburt-Anlass tragen').toBe(false);

  // Der eigentliche Klickweg: der Assistent, nicht die Funktion.
  await gebwizMitNamenDurchlaufen(page, 'Mia Musterfrau');
  // Sub-Depot-Vorschlag erscheint (gebwiz-kind-abnahme.spec.js, Zug 4) — nicht Gegenstand dieser
  // Probe, sauber wegklicken, damit der Endzustand prüfbar ist.
  await expect(page.locator('#modal-titel')).toContainText('Eigenes Depot für Ihr Kind?');
  await page.click('#m-abbr');
  await expect(page.locator('#modal-titel')).toHaveCount(0);

  // NACHHER: genau EIN Dokument zu derselben Zeile trägt jetzt den geburt-Anlass. Das ist der
  // stille Ausfall, den eine reine Funktions-Probe nicht sehen würde — hier lief der komplette
  // echte Weg: Klick → wizardAbschluss → _gebwizKindEintragErstellen → ereignisGeburtMarkieren
  // → EREIGNIS_ACHSE_FELDER-Filterung → _ereignisZeileMarkieren → _dokumentEreignisEintragen.
  const nachher = await page.evaluate((zid) => {
    const docs = window.__vdOeffentlich.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zid);
    return docs.filter((d) => Array.isArray(d.ereignisAnlaesse) && d.ereignisAnlaesse.some((a) => a.typ === 'geburt')).length;
  }, zeilenId);
  expect(nachher, 'nach der Geburt muss genau ein Dokument den geburt-Anlass tragen').toBe(1);
});
