'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-07 — Krypto-Block-Hash-Gate (KLASSE-A der Vier-Komponenten-Schicht)
   ────────────────────────────────────────────────────────────────────────
   Der WICHTIGSTE Test der Cross-Component-Suite. Er beweist die zentrale
   Architektur-Behauptung der Vier-Komponenten-Architektur (ADR-098):

     „Byte-identischer VdCrypto-Block — vier Komponenten teilen denselben
      Krypto-Stack.“

   Solange dieser Test fehlt, ist diese Aussage eine Behauptung. Mit ihm ist
   sie ein Beweis: Der VdCrypto-Block (Script 1) wird aus ALLEN VIER HTMLs
   extrahiert und Byte für Byte verglichen — untereinander, gegen die kanonische
   Quelle `vivodepot-krypto-kern-PORT-VERBATIM.js` und gegen den erwarteten Hash
   `3f6c7890…` (Zerfall in Feld-Einheiten, 19.08.2026 — Krypto-Generation 4:
   pseudonyme Adressen, Inhaltsschlüssel je Einheit, AAD um `depotUUID` und
   Adresse erweitert, `KRYPTO_VERSION_ALLOWLIST` [3] → [3, 4]; vorher `612357e7…` (S18 —
   `bytesToBase64` durch dieselbe chunkweise `_bytesAlsBinaerstring`-Umwandlung
   ersetzt wie S17, s. tests/s18-bytes-to-base64-chunking.test.js), davor
   `1182dc…` (S17 — Array.from+join in `encryptData` ersetzt, s.
   tests/vdcrypto-block-base64-chunking.test.js), davor `8d31c6…`, davor `6eb590…`
   B2/v3 — Schlüsseltrennung). Weicht eine einzige Komponente ab, schlägt der GESAMTE
   Cross-Lauf fehl mit klarer Meldung „Krypto-Block-Drift erkannt — Architektur-Vertrag
   verletzt“.

   BROWSER-FREI: reine Datei-/Hash-Inspektion, läuft in der Schicht-1-Suite
   (`node --test`) — SOFORT grün, kein Playwright nötig. In der Cross-Playwright-
   Config ist derselbe Gedanke als globalSetup verdrahtet (support/krypto-gate.js),
   damit auch der Browser-Lauf bei Drift gar nicht erst startet.

   Die vier HTML-Komponenten werden NUR GELESEN; nichts wird in sie eingebaut.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..', '..');

// Erwarteter VdCrypto-Block-Hash (== vivodepot-krypto-kern-PORT-VERBATIM.js).
const BLOCK_HASH_ERWARTET = '4cd539cd564738e3f7d165235708bde0ea1253328fd5317e144a80b9a1d4fd98';

// Die vier Komponenten der Architektur (ADR-098).
const KOMPONENTEN = [
  { name: 'Bürger-App (Kern)',      datei: 'vivodepot.html' },
  { name: 'Lese-App',               datei: 'vivodepot-lesen.html' },
  { name: 'VC-Issuer',              datei: 'vivodepot-vc-issuer.html' },
  { name: 'Template-Generator',     datei: 'vivodepot-studio.html' },
];

const PORT_VERBATIM = 'vivodepot-krypto-kern-PORT-VERBATIM.js';

/* ── Block-Extraktion: identisch zu allen load-*.js-Hilfen ─────────────────
   Erster <script>-Block der HTML == VdCrypto-Block. Das eine führende
   Zeilenende direkt hinter „<script>“ wird entfernt — dann ist der Inhalt
   byte-genau gleich dem PORT-VERBATIM.js. */
function ersterScriptBlock(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const o1 = html.indexOf(OPEN);
  const o1e = o1 + OPEN.length;
  const c1 = html.indexOf(CLOSE, o1e);
  if (o1 < 0 || c1 < 0) throw new Error('Konnte den ersten <script>-Block nicht finden.');
  const block = html.slice(o1e, c1);
  return block.startsWith('\n') ? block.slice(1) : block;
}
function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function ladeBlock(relPfad) {
  const html = fs.readFileSync(path.join(REPO, relPfad), 'utf8');
  return ersterScriptBlock(html);
}

test('[Klasse-A] T-CROSS-07: VdCrypto-Block in allen vier HTMLs == erwarteter Hash (4cd539cd…)', () => {
  for (const k of KOMPONENTEN) {
    const block = ladeBlock(k.datei);
    const ist = sha256(block);
    assert.equal(
      ist, BLOCK_HASH_ERWARTET,
      `Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt: ` +
      `${k.name} (${k.datei}) hat Block-Hash ${ist}, erwartet ${BLOCK_HASH_ERWARTET}.`,
    );
  }
});

test('[Klasse-A] T-CROSS-07: VdCrypto-Block über alle vier Komponenten byte-identisch', () => {
  const referenz = ladeBlock(KOMPONENTEN[0].datei);
  for (const k of KOMPONENTEN.slice(1)) {
    const block = ladeBlock(k.datei);
    assert.equal(
      block, referenz,
      `Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt: ` +
      `${k.name} (${k.datei}) ist nicht byte-identisch zur Bürger-App.`,
    );
  }
});

test('[Klasse-A] T-CROSS-07: VdCrypto-Block == kanonische Quelle PORT-VERBATIM.js', () => {
  const port = fs.readFileSync(path.join(REPO, PORT_VERBATIM), 'utf8');
  assert.equal(sha256(port), BLOCK_HASH_ERWARTET, 'PORT-VERBATIM.js-Hash unerwartet.');
  for (const k of KOMPONENTEN) {
    const block = ladeBlock(k.datei);
    assert.equal(
      block, port,
      `Krypto-Block-Drift erkannt — Architektur-Vertrag verletzt: ` +
      `${k.name} (${k.datei}) weicht von ${PORT_VERBATIM} ab.`,
    );
  }
});
