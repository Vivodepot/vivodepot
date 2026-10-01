'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   anbieterpruefung-adapter.js — {land, art, nummer} → Ergebnis (19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Erweiterbare Registry externer Prüf-Adapter für die Anbieterprüfung. JEDER Adapter liefert nur
   `belegHash` zurück, nie den Rohbeleg — die Ausstellungswerkzeuge selbst rufen KEINEN Adapter
   automatisch auf (kein Netzverbindungs-Bedarf beim Signieren, dieselbe Auflage wie bisher, s.
   Kopfkommentar kundenzertifikat-ausstellen.js: „keine Netzverbindung"). Ein Adapter wird VORHER,
   von Hand oder aus einem separaten Werkzeug, aufgerufen; sein `belegHash` wandert danach in die
   Anbieterprüfung-Angaben (tools/lib/anbieterpruefung.js).

   VIES ist der einzige heute WIRKLICH verdrahtete Adapter (öffentlich, kostenlos, EU-USt-IdNr-
   Prüfung). Ein Registerabruf über das Gateway (Handelsregister/Vereinsregister) bleibt ein
   BAUPLAN — die Nutzungsbedingungen der einzelnen Register sind ungeklärt (dieselbe offene Frage
   wie im Bericht gateway-institutionscode-report-before-build-2026-09-19.md §7); der Adapter
   existiert als benannter, aufrufbarer Platzhalter, der explizit wirft statt etwas vorzutäuschen.
   ════════════════════════════════════════════════════════════════════════════ */

const crypto = require('node:crypto');

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// VIES REST API (ec.europa.eu) — öffentlich, kein Schlüssel nötig. `fetchFn` injizierbar (Tests
// ohne echten Netzabruf, dieselbe Bauform wie überall sonst im Repo — kette({fetchFn}) etc.).
async function viesAdapter({ land, nummer }, fetchFn) {
  if (!land || !nummer) throw new Error('vies-adapter: land und nummer sind Pflicht.');
  const holen = fetchFn || (typeof fetch === 'function' ? fetch : null);
  if (!holen) throw new Error('vies-adapter: kein fetch verfügbar — fetchFn übergeben.');
  const url = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/' + encodeURIComponent(land) + '/vat/' + encodeURIComponent(nummer);
  const antwort = await holen(url);
  if (!antwort || !antwort.ok) return { gefunden: false, belegHash: null, quelle: 'vies' };
  const text = await antwort.text();
  let daten;
  try { daten = JSON.parse(text); } catch { return { gefunden: false, belegHash: null, quelle: 'vies' }; }
  if (!daten || daten.isValid !== true) return { gefunden: false, belegHash: null, quelle: 'vies' };
  // Beleg = die gesamte VIES-Antwort, gehasht — nicht der Rohtext im Ergebnis, nur sein Hash.
  return { gefunden: true, belegHash: sha256Hex(text), quelle: 'vies' };
}

// NICHT VERDRAHTET (bewusst) — s. Kopf-Kommentar. Wirft immer, benannt statt stillschweigend
// „nichts gefunden" vorzutäuschen.
async function registerGatewayAdapter() {
  throw new Error('registerGatewayAdapter: nicht verdrahtet — die Nutzungsbedingungen der einzelnen '
    + 'Register sind ungeklärt (Bauplan, kein Aufrufweg). S. gateway-institutionscode-report-before-build-2026-09-19.md §7.');
}

const ADAPTER = Object.freeze({ vies: viesAdapter, registerGateway: registerGatewayAdapter });

module.exports = { sha256Hex, viesAdapter, registerGatewayAdapter, ADAPTER };
