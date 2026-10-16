'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Sub-Depot als verschlüsselte Datei exportieren — über den echten Klickweg, dann wieder öffnen
   (Befund SUB-DEPOT-EXPORT-KLICKWEG, HOCH, 15.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Gemeldet an v929 live: ein Sub-Depot lässt sich nicht als verschlüsselte Datei exportieren; es erscheint nur
   „Das hat nicht geklappt“. Die vorhandenen Browser-Proben riefen den Export über die Testfläche direkt auf
   (`subDepotBlackboxExportieren`) und gingen nie den Weg, den eine Person geht: Karte → „Als verschlüsselte Datei
   übergeben“ → Dialog → „Verschlüsselte Datei exportieren“ → Datei. Diese Probe geht genau diesen Weg, ohne
   Testfläche, und öffnet die Datei danach in einer frischen Anwendung mit dem Passwort des Sub-Depots.

   Zwei Lagen: aus dem eigenen Depot heraus, und nachdem die Person das Sub-Depot betreten hat und über die
   Verwaltung zurück zur Liste geht. In der zweiten liest die Liste ihre Karten aus dem Anker-Depot, der Export
   suchte im Inhalt des betretenen Sub-Depots (gelesen am Kanon 78e466890).

   Konsole und Seitenfehler jeder Probe stehen in einer Datei unter test-results, damit der Grund eines Fehlers
   nicht nur in der Anzeige „Das hat nicht geklappt“ steckt. Die Datei verlässt den Browser über das Herunterladen
   (ohne Datei-Dialog des Systems), so wie in Safari und Firefox.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('@playwright/test');
const { durchspielen } = require('./sub-depot-export-klickweg-ablauf.js');

test('[Sub-Depot·Export·Klickweg] aus dem eigenen Depot: verschlüsselte Datei, dann wieder öffnen', async ({ page }, testInfo) => {
  await durchspielen(page, testInfo, { nachBetreten: false });
});

test('[Sub-Depot·Export·Klickweg] nach dem Betreten des Sub-Depots: verschlüsselte Datei, dann wieder öffnen', async ({ page }, testInfo) => {
  await durchspielen(page, testInfo, { nachBetreten: true });
});
