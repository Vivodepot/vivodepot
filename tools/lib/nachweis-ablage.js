'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Nachweis-Ablage — wohin ein Konformitätslauf sein Nachweis-Artefakt schreibt (28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (Befund KONFORMITAET-ARTEFAKTE-IM-BAUM, 28.09.2026): der pre-commit-Suite-Lauf
   hinterließ tests/konformitaet/.artifacts/ im Arbeitsbaum; der Wächter-Selbsttest im pre-push wurde
   davon rot. Dieselbe Klasse wie das Temp-Leck (be4fc4415): ein Seiteneffekt ohne Aufräumer.

   DREI WEGE, in dieser Reihenfolge:
     1. VD_NACHWEIS_DIR gesetzt  → genau dorthin (wer den Nachweis behalten will, sagt es).
     2. CI gesetzt (GitHub setzt CI=true) → <hier>/.artifacts — der Konformitäts-Workflow lädt den
        Nachweis von dort hoch.
     3. sonst                   → ein eigenes mkdtemp unter os.tmpdir, beim Prozessende geräumt. Lokal
        liest niemand den Nachweis nach dem Lauf; der Test prüft ihn im selben Prozess.
   Im Arbeitsbaum landet damit lokal nichts mehr.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function nachweisVerzeichnis(hier, { env = process.env, raeumenBeimEnde = true } = {}) {
  if (env.VD_NACHWEIS_DIR) return { dir: path.resolve(env.VD_NACHWEIS_DIR), weg: 'VD_NACHWEIS_DIR' };
  if (env.CI) return { dir: path.join(hier, '.artifacts'), weg: 'CI' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-nachweis-'));
  if (raeumenBeimEnde) process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* weg */ } });
  return { dir, weg: 'tmpdir' };
}

module.exports = { nachweisVerzeichnis };
