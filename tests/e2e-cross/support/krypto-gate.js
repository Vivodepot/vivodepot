'use strict';
/* ════════════════════════════════════════════════════════════════════════
   globalSetup — Krypto-Block-Hash-Gate für den Cross-Component-BROWSER-Lauf
   ────────────────────────────────────────────────────────────────────────
   Spiegelt T-CROSS-07 (tests/e2e-cross/T-CROSS-07-krypto-block-gate.test.js) in
   die Playwright-Pipeline: Bevor ein einziger Browser-Kontext geöffnet wird,
   wird der VdCrypto-Block (Script 1) aus ALLEN VIER HTMLs extrahiert und gegen
   den erwarteten Hash `f0f88502…` sowie gegeneinander byte-verglichen. Bei Drift
   wirft dieser Setup — und der gesamte Cross-Lauf bricht ab, mit der Meldung
   „Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt“.

   Browser-frei (reine Datei-/Hash-Inspektion); die HTMLs werden nur gelesen.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..', '..', '..');
const BLOCK_HASH_ERWARTET = '732ff4b0dc74e7ae9cce9febc8eb5cb3d8e52150775f88c80ff1f8967a8a6282';

const KOMPONENTEN = [
  { name: 'Bürger-App (Kern)',  datei: 'vivodepot.html' },
  { name: 'Lese-App',           datei: 'vivodepot-lesen.html' },
  { name: 'VC-Issuer',          datei: 'vivodepot-vc-issuer.html' },
  { name: 'Template-Generator', datei: 'vivodepot-template-generator.html' },
];

function ersterScriptBlock(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const o1 = html.indexOf(OPEN);
  const o1e = o1 + OPEN.length;
  const c1 = html.indexOf(CLOSE, o1e);
  if (o1 < 0 || c1 < 0) throw new Error('Konnte den ersten <script>-Block nicht finden.');
  const block = html.slice(o1e, c1);
  return block.startsWith('\n') ? block.slice(1) : block;
}
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

module.exports = async function globalSetup() {
  let referenz = null;
  for (const k of KOMPONENTEN) {
    const html = fs.readFileSync(path.join(REPO, k.datei), 'utf8');
    const block = ersterScriptBlock(html);
    const ist = sha256(block);
    if (ist !== BLOCK_HASH_ERWARTET) {
      throw new Error(
        `Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt: ` +
        `${k.name} (${k.datei}) hat Block-Hash ${ist}, erwartet ${BLOCK_HASH_ERWARTET}. ` +
        `Cross-Component-Lauf abgebrochen.`,
      );
    }
    if (referenz === null) referenz = block;
    else if (block !== referenz) {
      throw new Error(
        `Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt: ` +
        `${k.name} (${k.datei}) ist nicht byte-identisch zur Bürger-App. Cross-Component-Lauf abgebrochen.`,
      );
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[krypto-gate] VdCrypto-Block über alle vier Komponenten byte-identisch (${BLOCK_HASH_ERWARTET.slice(0, 6)}…) ✓`);
};
