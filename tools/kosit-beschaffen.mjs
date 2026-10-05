#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   kosit-beschaffen.mjs — den KoSIT-Validator aus dem gepinnten Release-Asset beschaffen (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Lädt validator-1.6.3-standalone.jar (github.com/itplr-kosit/validator, Apache-2.0), prüft den SHA-256-Pin und
   legt die Datei in den Cache außerhalb des Baums (~/.cache/vivodepot-standards/kosit-validator-1.6.3, oder
   KOSIT_CACHE). Der Pin steht im Adapter (tests/konformitaet/adapter/kosit-validator.mjs, WERKZEUG). Braucht Java 11+.
   Aufruf: node tools/kosit-beschaffen.mjs
   ════════════════════════════════════════════════════════════════════════════ */
import { beschaffen, cacheVerzeichnis } from '../tests/konformitaet/adapter/kosit-validator.mjs';

try {
  await beschaffen({ ausgabe: (z) => console.log('[kosit-beschaffen] ' + z) });
  console.log('[kosit-beschaffen] fertig — Cache ' + cacheVerzeichnis());
} catch (e) {
  console.error('[kosit-beschaffen] ' + e.message);
  process.exit(1);
}
