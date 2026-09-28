#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Screenshots für publiccode.yml aus der ausgelieferten Anwendung (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Das Softwareverzeichnis von openCoDE verlangt eine Beschreibung mit
   aussagekräftigen Screenshots. Sie entstehen hier aus einer ausgelieferten
   Produktdatei (--produkt, z. B. privat-de der zuletzt ausgelieferten
   Fassung), nie von Hand gezeichnet: Startbildschirm, Auswahl „Was möchten Sie
   erledigen?" und die eingebaute Beispielansicht („Ich schaue mich erst
   einmal um"). Bilder aus Demos gehen erst hinaus, wenn die Demo abgenommen ist.
   Die Bilder gehen nach --ziel (Vorgabe docs/screenshots/) unter festen Namen;
   publiccode.yml nennt sie unter description.<sprache>.screenshots.
   Aufruf:
     node tools/screenshots-oeffentlich-erzeugen.js --produkt <vivodepot.html> [--ziel <ordner>]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const { BILDER } = require('./lib/screenshots-oeffentlich-bilder.js');
const argWert = (argv, n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };

async function erzeugen({ produkt, ziel }) {
  const { chromium } = require('playwright');
  fs.mkdirSync(ziel, { recursive: true });
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    for (const b of BILDER) {
      await seite.goto('file://' + path.resolve(produkt));
      await seite.waitForTimeout(1500);
      for (const k of b.klicks) { await seite.getByText(k, { exact: true }).first().click({ timeout: 8000 }); await seite.waitForTimeout(1200); }
      await seite.screenshot({ path: path.join(ziel, b.datei) });
    }
  } finally {
    await browser.close();
  }
  return BILDER.map((b) => path.join(ziel, b.datei));
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const produkt = argWert(argv, '--produkt');
  if (!produkt) { console.error('Aufruf: --produkt <vivodepot.html> [--ziel <ordner>]'); process.exit(2); }
  erzeugen({ produkt, ziel: argWert(argv, '--ziel') || path.join(REPO, 'docs', 'screenshots') })
    .then((l) => { for (const d of l) console.log('geschrieben: ' + path.relative(REPO, d)); })
    .catch((e) => { console.error('screenshots-oeffentlich-erzeugen: ' + e.message); process.exit(1); });
}

module.exports = { BILDER, erzeugen };
