'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Reisen-Varianten — zusätzliche DOM-Zustände fürs M1-Messgerät, KEINE neuen
   Cognitive-Walkthrough-Reisen
   ────────────────────────────────────────────────────────────────────────────
   Auftrag M1_Messgeraet_Haerten, Zug 4 (03.08.2026). 15 der 37 unerreichten
   Regeln (`.pv-dok*`, `.nfb-*`, `#notfallblatt-overlay`, Zug-2-Bericht §4b)
   hängen an einer einzigen abgewählten Entscheidung: beide echten Reisen
   rufen bei `S4-notfallblatt-angebot` `einmalDialogeSchliessen()` — sie lehnen
   das Notfallblatt-Angebot ab. Diese Datei baut den fehlenden Zweig NACH,
   OHNE Reise 1 oder ihre Grundlinie anzufassen.

   FORM-ENTSCHEIDUNG, BEGRÜNDET: eigene Datei statt Eintrag in
   `tools/reisen-registry.js`. Die Registry ist die Quelle für
   der Läufer der Reisen (Grundlinien-Vergleich, Cognitive-Walkthrough-
   Standard) — ein Eintrag dort würde `--alle` sofort rot machen (keine
   Grundlinie) oder eine Grundlinie für einen Zustand erzwingen, der keine
   eigene Bürgerin-Reise ist, sondern derselbe Weg wie Reise 1 bis S3, nur mit
   einer anders beantworteten Ja/Nein-Frage. Diese Datei wird NUR von
   UX-Mitlauf der M1-Messung gelesen, `reisen-lauf.js`/`reisen-registry.js`
   bleiben unverändert — „der bestehende Reisen-Lauf muss danach unverändert
   grün sein" (Auftrag) ist damit strukturell erfüllt, nicht nur geprüft.

   S0–S3 sind DIESELBEN Schritt-Objekte aus `reise-1-marlies` (keine Kopie,
   kein Nachbau — Referenz auf dieselben Funktionen), nur S4 ersetzt: „Drucken"
   statt „Später". `#nfb-angebot` ist derselbe stabile Griff, den
   `tools/reisen-registry.js` selbst im Kommentar als Prüfpunkt nennt. */
const { REISEN } = require('./reisen-registry.js');

const REISE_1 = REISEN.find((r) => r.id === 'reise-1-marlies');
if (!REISE_1) {
  throw new Error('tools/reisen-varianten.js: „reise-1-marlies" nicht in der Registry gefunden — Struktur geändert?');
}

const VOR_DEM_ANGEBOT_IDS = ['S0-landing', 'S1-einstieg-vorschau', 'S2-anlege-dialog-oeffnen', 'S3-depot-anlegen'];
const VOR_DEM_ANGEBOT = VOR_DEM_ANGEBOT_IDS.map((id) => {
  const schritt = REISE_1.schritte.find((s) => s.id === id);
  if (!schritt) throw new Error('tools/reisen-varianten.js: Schritt „' + id + '" fehlt in reise-1-marlies — Struktur geändert?');
  return schritt;
});

const NOTFALLBLATT_ANGENOMMEN = {
  id: 'variante-notfallblatt-angenommen',
  persona: REISE_1.persona,
  ziel: 'Wie reise-1-marlies bis zum Notfallblatt-Angebot, dort „Drucken" statt „Später"',
  viewport: REISE_1.viewport,
  schritte: [
    ...VOR_DEM_ANGEBOT,
    {
      id: 'S4-notfallblatt-angenommen',
      titel: 'Einmal-Angebot nach dem Anlegen (Notfallblatt) — „Drucken" annehmen',
      veraendernd: false,
      aktion: async (seite) => {
        // U2-ADR-430: vor dem Notfall-Blatt kommt das Angebot des Codes — abgelehnt, wie in den übrigen Reisen.
        await seite.waitForSelector('#whc-angebot', { state: 'visible', timeout: 10000 });
        await seite.click('#m-zweit', { timeout: 5000 });
        await seite.waitForSelector('#whc-tragweite', { state: 'visible', timeout: 5000 });
        await seite.click('#m-zweit', { timeout: 5000 });
        await seite.waitForSelector('#nfb-angebot', { state: 'visible', timeout: 10000 });
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('#notfallblatt-overlay', { state: 'visible', timeout: 5000 });
      },
    },
  ],
};

module.exports = { NOTFALLBLATT_ANGENOMMEN };
