'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   csp-nach-bau.js — jeder Bauweg zieht die CSP-Hashes als letzten Schritt nach (U2-ADR-470)
   ────────────────────────────────────────────────────────────────────────────
   Seit die Anwendungen ihre Inline-Skripte nur per sha256 erlauben, sperrt der Browser jeden Block, den ein Bauweg nach
   dem Bau ändert (Vor-Depot-Konfiguration, Service-Worker-Vermerk, Ab-Werk-Regionen, Vorführung, Auslieferungsform,
   geschnittene Entwicklerleiste und Test-Fläche). Darum ruft jeder solche Weg als LETZTEN Schritt vor Prüfsumme und
   Signatur cspNachBau(text).

   Dieselbe Regel wie das Download-Gateway (`cspNachBau` in src/produkt-bauen.js dort): trägt die Datei noch
   'unsafe-inline' oder keine bzw. mehr als eine CSP-Zeile, bleibt sie unverändert. Ein älterer Kern (A/B-Abnahmen gegen
   frühere Fassungen) bekommt so keine Hashes untergeschoben, die seine Freigabe zurücknähmen. Die Rechnung selbst ist
   der byte-gleich mit dem Gateway geteilte Abschnitt in tools/lib/csp-hashes.js — diese Datei ändert ihn nicht.

   cspNeutral(text): die Hashliste in script-src durch einen Platzhalter ersetzt — für Vergleiche „gleich außerhalb der
   Regionen“, deren Hashes sich mit den Regionen ändern müssen.
   ════════════════════════════════════════════════════════════════════════════ */
const { cspHashesNachziehen, cspPruefen } = require('./csp-hashes.js');

function cspNachBau(text) {
  if (typeof text !== 'string') return text;
  const vorher = cspPruefen(text);
  if (vorher.grund || vorher.unsafeInline) return text;
  return cspHashesNachziehen(text);
}

const META = /(<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*?script-src)((?:\s+[^;"]*)?)/;
function cspNeutral(text) {
  return String(text).replace(META, (g, kopf, quellen) => kopf + quellen.replace(/\s+'sha(256|384|512)-[^']*'/g, '') + ' \'sha256-*\'');
}

module.exports = { cspNachBau, cspNeutral };
