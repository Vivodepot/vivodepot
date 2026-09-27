'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auslieferungsorte-register.js — „die Brücke fehlt" (11.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   UNABHÄNGIGE LANDKARTE, KEINE ABLEITUNG. Diese Liste wird von Hand gepflegt,
   nicht aus `tools/testfassung-legen.js`s `DATEISATZ` oder `tools/modul-app-
   packen.js`s `vorhandeneSlugs()` abgeleitet — genau das wäre die Falle:
   „ein Prüfer, der die Auslieferungsorte aus derselben Liste zieht, aus der
   die Erzeuger schreiben, bewacht nichts — er stimmt per Konstruktion."
   (11.09.2026, Auftrag „Rangfolge bauen"). Die Erzeuger-Werkzeuge
   ENTDECKEN ihre Ziele zur Laufzeit (`vorhandeneSlugs` scannt `module-apps/*`);
   dieses Register BEHAUPTET, was da sein SOLL — zwei unabhängige Aussagen,
   die ein Wächter gegeneinanderhält (s. `tools/auslieferungsweg-
   klassifikation-pruefen.js`), statt eine von der anderen abzuleiten.

   Heute (11.09.2026) gemessen, WELCHER Weg tatsächlich zu welchem Ort führt —
   der Befund, der den ganzen Auftrag auslöste (s. Bericht
   „ausgelieferte-produkte-geprueft-2026-09-11.md" + Korrektur
   „KORREKTUR-vorheriger-befund-war-falsch-2026-09-11.md"):

     WEG_ROH   — `tools/testfassung-legen.js` kopiert die rohe, generische
                 `vivodepot.html` byte-für-byte. Kein Konfektionierer beteiligt.
     WEG_B     — `tools/modul-app-packen.js` (`--alle`) kopiert dieselbe rohe
                 Datei PLUS eine unangetastete, signierte Begleitdatei
                 `vorabkonfiguration.js` (U2-ADR-182, Weg B) — die trägt das
                 eigentliche Produkt (Sprachmodul, Logikmodul), zur Laufzeit
                 per `<script src>` nachgeladen, nicht eingebacken.
     WEG_A     — `tools/vier-produkte-erzeugen.js` (der „Konfektionierer")
                 bäckt Ab-Werk-Regionen direkt in die Kern-Datei ein. Heute an
                 KEINEM realen Auslieferungsort im Einsatz — sein Ergebnis
                 landet nur unter `produkte/`, nirgends sonst (die Brücke, die
                 fehlt).
     NICHT_VORHANDEN — der Ort existiert (noch) nicht. Kein Fehlzustand für
                 SICH genommen — ein Ort OHNE Eintrag hier ist der Fehlzustand
                 (s. `tools/auslieferungsweg-klassifikation-pruefen.js`).

   `slug` folgt derselben Namensform wie `PRODUCTS` in vivodepot-download-
   gateway/src/index.js (buerger-de/buerger-en/betriebssatz-de/betriebssatz-en)
   — absichtlich, damit `tools/produkte-map-duplikate-pruefen.js` (im Gateway-
   Repo) dieselben Kennungen wiederverwenden kann, ohne sie zu erfinden.
   `pfad` ist relativ zur Wurzel von `vivodepot-ios-test` — `''` heißt Wurzel. */
const AUSLIEFERUNGSORTE = Object.freeze([
  Object.freeze({
    slug: 'buerger-de', pfad: '', weg: 'WEG_ROH', quelleWerkzeug: 'testfassung-legen.js',
    begruendung: 'Nativer deutscher Rückfall braucht kein Modul — roh und produktkonfektioniert '
      + 'unterscheiden sich hier nur um eine folgenlose Marker-Zeile (gemessen 11.09.2026).',
  }),
  Object.freeze({
    slug: 'buerger-en', pfad: 'module-apps/englisch', weg: 'WEG_B', quelleWerkzeug: 'modul-app-packen.js',
    begruendung: 'vorabkonfiguration.js trägt ein signiertes textsatz-Modul (sprache:"en"), '
      + 'geprüft 11.09.2026 durch Decodieren des Bündels — echtes Englisch, auf dem vorgesehenen Weg.',
  }),
  Object.freeze({
    slug: 'betriebssatz-de', pfad: 'module-apps/betriebssatz', weg: 'WEG_B', quelleWerkzeug: 'modul-app-packen.js',
    begruendung: 'vorabkonfiguration.js trägt zwei signierte Bündel (bereich, textsatz) — kein '
      + 'logikModul wie im Konfektionierer-Produkt "pro-de". Ob das noch die beabsichtigte '
      + 'Zusammenstellung ist, ist eine offene Produktfrage (s. Bericht 11.09.2026), keine hier '
      + 'entschiedene.',
  }),
  Object.freeze({
    slug: 'betriebssatz-en', pfad: null, weg: 'NICHT_VORHANDEN', quelleWerkzeug: null,
    begruendung: 'Existiert am 11.09.2026 nicht — weder unter module-apps/ noch sonstwo geprüft '
      + '(mehrere Pfade probiert, alle 404). Wird nachgebaut. Bis dahin bewusst als "nicht vorhanden" '
      + 'geführt statt stillschweigend zu fehlen.',
  }),
]);

module.exports = { AUSLIEFERUNGSORTE };
