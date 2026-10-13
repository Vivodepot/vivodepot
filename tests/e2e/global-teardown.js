'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — globalTeardown: das Laufverzeichnis des Playwright-Laufs räumen (10.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund TEMP-RESTE-WIEDER: Playwright-Läufe ließen ihre Wegwerf-Verzeichnisse unter os.tmpdir
   liegen (Specs mit mkdtemp ohne Aufräumen, Worker, die vor ihrem exit-Handler endeten). Jede
   Playwright-Konfiguration setzt darum beim Laden ein eigenes TMPDIR (tools/lib/test-lauf.js,
   playwrightLaufBeginnen); hier wird es nach dem letzten Worker geräumt — samt allem, was Specs,
   Worker und Browser darin abgelegt haben, auch den gebackenen Produkten aus global-setup.js.
   Geräumt wird nur, wenn dieser Prozess das Verzeichnis angelegt hat; ein geerbtes räumt sein
   Besitzer. Bleibt der Lauf hart stehen, räumt der nächste Lauf das Verzeichnis, sobald sein
   Besitzer nachweislich fort ist.
   ════════════════════════════════════════════════════════════════════════ */
const { playwrightLaufBeenden } = require('../../tools/lib/test-lauf.js');

module.exports = async function globalTeardown() {
  playwrightLaufBeenden();
};
