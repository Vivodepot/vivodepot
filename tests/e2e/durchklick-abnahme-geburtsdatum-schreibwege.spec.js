'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   durchklick-abnahme-geburtsdatum-schreibwege.spec.js — Auftrag, 23.09.2026:
   der ECHTE UI-Klickweg über die beiden Schreibwege, die zuletzt (14.09.2026) ein
   Geburtsdatum verloren haben — Register-Formular und Geburts-Assistent (`gebwiz`,
   `_gebwizKindEintragErstellen`), in allen vier gebackenen Produkten.

   WARUM ALS SPEC UND NICHT NUR ALS WERKZEUG-MODUS (23.09.2026): eine
   Behauptung gehört in die Suite, die bei JEDEM Push läuft — ein Werkzeug
   (`tools/produkt-durchklick-messen.js --geburtsdatum-schreibwege`) läuft nur, wenn
   jemand es startet. Beide nutzen DIESELBE Klickfolge
   (`tests/e2e/durchklick-abnahme-helpers.js#registerFormularGeburtsdatumWeg`/
   `#gebwizGeburtsdatumWeg`) — ein Ort für den Weg, zwei Verwender.

   ZWEI LÄUFE, NICHT NUR EIN KOMMENTAR (23.09.2026: „eine Behauptung ist
   erst mit Lauf bewiesen"):
   - ROT gegen 0fca806f7 (Schema-88-Landung, gemessen 23.09.2026): 6 von 8
     Fällen rot — Register-Formular/Gebwiz schrieben überall, wo erreichbar,
     `geburtsdatum`, nie `birthDate` (die 2 „grünen" Fälle waren Pro-Register-Formular,
     `erreichbar:false`, keine Aussage über den Feldnamen). Exakt der erwartete Befund.
   - GRÜN gegen 65584608d (Landung, Merge in diesem Arbeitsbaum, gemessen
     23.09.2026): 8 von 8 grün — NACHDEM ein echter Bug im Klickweg selbst gefunden und
     behoben wurde: `registerFormularGeburtsdatumWeg` füllte noch die ALTE Feld-Id
     (`[data-edit="geburtsdatum"]`), die Landung benennt `MENSCHEN_REGISTER_FELD` aber
     auf `birthDate` um (vivodepot.html:53353) — der alte Selektor traf nichts mehr,
     `page.fill()` hing bis zum 30s-Timeout. Fix: der Helfer füllt jetzt BEIDE Feld-Ids
     (`birthDate` UND `geburtsdatum`), damit die Klickfolge Feldnamens-Umbenennungen wie
     diese übersteht, statt einen festen Namen anzunehmen.

   „BEIDE FÜLLEN" DARF KEINEN REST VERDECKEN (23.09.2026): dass der Klickweg beide
   Feld-Ids PROBIERT, heißt nicht, dass beide im Formular stehen dürften. Ein
   stehengebliebener alter `geburtsdatum`-Zwilling neben dem neuen `birthDate`-Feld wäre
   selbst ein Fund (doppeltes Feld im DOM), den der reine Wert-Vergleich in `data.menschen[]`
   nicht sähe. Die Register-Formular-Fälle behaupten darum zusätzlich: GENAU EIN Feld-Id im
   DOM, und zwar `birthDate` — kein `geburtsdatum` daneben.

   NUR EIN LAUF JE PRODUKT/WEG UND STAND (Auftrag Punkt 4, „seltenes"): diese
   Probe beweist den Weg und den Feldnamen an je einem Lauf pro Kanon-Stand, nicht
   Stabilität über Wiederholung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers.js');
const { echtesProduktUrl, registerFormularGeburtsdatumWeg, gebwizGeburtsdatumWeg } = require('./durchklick-abnahme-helpers.js');

const SLUGS = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];
const WEGE = {
  'register-formular': registerFormularGeburtsdatumWeg,
  gebwiz: gebwizGeburtsdatumWeg,
};

for (const slug of SLUGS) {
  for (const [wegName, wegFn] of Object.entries(WEGE)) {
    test('[Geburtsdatum-Schreibweg·MESSUNG·' + wegName + '] ' + slug, async ({ page }) => {
      await oeffneApp(page, { url: echtesProduktUrl(slug) });
      await depotAnlegen(page, { name: slug.endsWith('-en') ? 'Mary Example' : 'Maria Mustermann' });
      const r = await wegFn(page);
      console.log(JSON.stringify({ produkt: slug, ...r }));
      // Nur messen — der Feldname wird unten separat behauptet.
    });

    test('[Geburtsdatum-Schreibweg·BEHAUPTUNG] ' + slug + '·' + wegName
      + ': schreibt nur birthDate, nie geburtsdatum', async ({ page }) => {
      await oeffneApp(page, { url: echtesProduktUrl(slug) });
      await depotAnlegen(page, { name: slug.endsWith('-en') ? 'Mary Example' : 'Maria Mustermann' });
      const r = await wegFn(page);
      if (!r.erreichbar) return;   // Pro ohne people-Sektor: der Weg fehlt, keine Aussage über den Feldnamen.
      expect(r.gefunden, 'Person/Kind-Eintrag muss entstanden sein').toBe(true);
      expect(r.schluessel, 'nur birthDate, nie geburtsdatum').toEqual(['birthDate']);
      if (wegName === 'register-formular') {
        expect(r.feldIdsGefunden, 'im Formular steht GENAU ein Feld-Id, birthDate — kein alter geburtsdatum-Zwilling daneben').toEqual(['birthDate']);
      }
    });
  }
}
