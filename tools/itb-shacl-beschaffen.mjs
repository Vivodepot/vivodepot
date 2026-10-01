#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   itb-shacl-beschaffen.mjs — den offiziellen EDC-Prüfer beschaffen (U2-ADR-443)
   ────────────────────────────────────────────────────────────────────────────
   Zieht das ITB-SHACL-Image der Kommission per Digest und lädt die gepinnten Shapes und
   Kontexte in den Cache außerhalb des Baums (~/.cache/vivodepot/itb-shacl, oder
   ITB_SHACL_CACHE). Jede Datei wird gegen ihren SHA-256-Pin geprüft; eine abweichende Datei
   ist ein Fehler (Exit 1), kein Netzausfall. Die Pins stehen im Adapter
   (tests/konformitaet/adapter/itb-shacl.mjs, ARTEFAKTE und WERKZEUG), nicht hier.

   Die Suite beschafft nie selbst: ohne diesen Schritt ist der Prüferlauf „ungemessen" (todo).
   Aufruf: node tools/itb-shacl-beschaffen.mjs
   ════════════════════════════════════════════════════════════════════════════ */
import { beschaffen, cacheVerzeichnis } from '../tests/konformitaet/adapter/itb-shacl.mjs';

try {
  await beschaffen({ ausgabe: (z) => console.log('[itb-shacl-beschaffen] ' + z) });
  console.log('[itb-shacl-beschaffen] fertig — Cache ' + cacheVerzeichnis());
} catch (e) {
  console.error('[itb-shacl-beschaffen] ' + e.message);
  process.exit(1);
}
