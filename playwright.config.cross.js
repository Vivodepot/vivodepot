'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Playwright-Konfiguration — VIER-KOMPONENTEN-E2E (Cross-Component-Verifikation)
   ────────────────────────────────────────────────────────────────────────
   Eigene Config PARALLEL zu playwright.config.js (Bürger-App-internes E2E,
   tests/e2e/). Diese hier fährt die Cross-Component-Reisen in tests/e2e-cross/:
   mehrere Single-File-HTMLs werden GLEICHZEITIG in mehreren Browser-Kontexten
   geladen (Bürger-App ⇄ Lese-App, Generator → VC-Issuer → Bürger-App). Der
   Datei-Transfer zwischen den Kontexten („per E-Mail / USB-Stick übergeben“)
   wird über ein tmp-Verzeichnis ehrlich simuliert (support/helpers.js).

   Vor JEDEM Lauf prüft globalSetup das Krypto-Block-Hash-Gate über alle vier
   HTMLs (support/krypto-gate.js). Bei Drift startet kein einziger Browser-Test —
   „Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt“.

   ── Umgebungs-Realität (wie Teil 7 / playwright.config.js) ──
   Der tatsächliche Lauf braucht Browser-Binaries (`npx playwright install
   chromium`). In der Bau-Sandbox waren weder @playwright/test noch die Binaries
   beschaffbar (npm-Registry 403). Das Gerüst, die Specs und die Fixtures sind
   vollständig und lauffähig konfiguriert; der erste echte Browser-Lauf passiert
   am Mac (mit Netz) oder in CI (.github/workflows/e2e-cross.yml). Die
   BROWSER-FREIEN Gates T-CROSS-07 (Hash) und T-CROSS-08 (Schema) laufen bereits
   in der Schicht-1-Suite (`node --test`) grün, unabhängig von dieser Config.
   ════════════════════════════════════════════════════════════════════════ */
const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e-cross'),
  // NUR die Reise-Specs. Die node-Tests (*.test.js: T-CROSS-07/08) gehören in die
  // Schicht-1-Suite (node --test) und werden hier bewusst NICHT geladen.
  testMatch: '**/*.spec.js',
  // Cross-Reisen sind länger (zwei Kontexte, Datei-Transfer) → großzügigeres Timeout.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,            // Reisen teilen das tmp-Transfer-Verzeichnis seriell.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                      // ein Worker — deterministischer Datei-Transfer.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Hash-Gate vor allen Browser-Tests (Architektur-Vertrag).
  globalSetup: require.resolve('./tests/e2e-cross/support/global-setup.js'),
  outputDir: path.join(__dirname, 'tests', 'e2e-cross', '.artifacts'),
  use: {
    offline: true,                // Sicherheits-Anforderung: kein Netz (file:// genügt).
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
