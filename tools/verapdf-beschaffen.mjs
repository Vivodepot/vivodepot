#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   verapdf-beschaffen.mjs — veraPDF aus dem gepinnten offiziellen Archiv beschaffen (01.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Lädt verapdf-greenfield-1.30.1-installer.zip, prüft den SHA-256-Pin und installiert unbeaufsichtigt in den
   Cache außerhalb des Baums (~/.cache/vivodepot-standards/verapdf-1.30.1, oder VERAPDF_CACHE). Der Pin steht im
   Adapter (tests/konformitaet/adapter/verapdf.mjs, WERKZEUG), nicht hier. Braucht Java 11+ und unzip.
   Aufruf: node tools/verapdf-beschaffen.mjs
   ════════════════════════════════════════════════════════════════════════════ */
import { beschaffen, cacheVerzeichnis } from '../tests/konformitaet/adapter/verapdf.mjs';

try {
  await beschaffen({ ausgabe: (z) => console.log('[verapdf-beschaffen] ' + z) });
  console.log('[verapdf-beschaffen] fertig — Cache ' + cacheVerzeichnis());
} catch (e) {
  console.error('[verapdf-beschaffen] ' + e.message);
  process.exit(1);
}
