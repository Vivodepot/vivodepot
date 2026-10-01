'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Test-Parallelität — EINE Stelle für node --test und Playwright (29.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS: ein Suite-Lauf startete so viele Node-Prozesse, wie es Kerne gibt (node --test nimmt
   ohne Angabe availableParallelism() - 1); zwei Läufe gleichzeitig ergaben Last 65, und der Rechner
   wurde heiß. Seitdem gilt: je Lauf höchstens die HÄLFTE der logischen Kerne (mindestens 2), Playwright
   die Hälfte davon (mindestens 1). Die zwei Suite-Plätze (tools/lib/suite-platz.js) bleiben.

   ÜBERSTEUERN, dokumentiert und nur hier:
     VD_TEST_PARALLEL=<n>   Zahl der parallelen node --test-Dateien (z. B. nachts wieder voll: die Kernzahl)
     PW_WORKERS=<n>         Playwright-Worker; ohne Angabe die Hälfte von VD_TEST_PARALLEL bzw. des Vorgabewerts
   Gelesen von der Wache um `npm test` (setzt --test-concurrency, wenn der Befehl keine trägt) und von
   playwright.config.js. Damit gilt derselbe Wert für npm test, die Schnellstufe im pre-commit und den
   pre-push.
   ════════════════════════════════════════════════════════════════════════════ */
const os = require('node:os');

const ganzzahl = (x) => { const n = Number(x); return Number.isInteger(n) && n >= 1 ? n : null; };

function kernZahl() { return typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length; }

/** Parallele node --test-Dateien je Lauf. */
function testParallel({ env = process.env, kerne = kernZahl() } = {}) {
  return ganzzahl(env.VD_TEST_PARALLEL) || Math.max(2, Math.floor(kerne / 2));
}

/** Playwright-Worker je Lauf. */
function pwWorker({ env = process.env, kerne = kernZahl() } = {}) {
  return ganzzahl(env.PW_WORKERS) || Math.max(1, Math.floor(testParallel({ env, kerne }) / 2));
}

/** Setzt --test-concurrency in einen `node --test`-Befehl, wenn er keine trägt. Andere Befehle bleiben unverändert. */
function mitParallelitaet(befehl, n) {
  const i = befehl.indexOf('--test');
  if (befehl[0] !== 'node' || i < 0 || befehl.some((a) => a.startsWith('--test-concurrency'))) return befehl;
  return [...befehl.slice(0, i + 1), '--test-concurrency=' + n, ...befehl.slice(i + 1)];
}

module.exports = { testParallel, pwWorker, mitParallelitaet, kernZahl };
