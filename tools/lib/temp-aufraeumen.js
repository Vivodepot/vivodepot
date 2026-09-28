'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Temp-Aufräumen — was Tests unter os.tmpdir anlegen, verschwindet wieder (28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (Befund TEMP-RESTE-FUELLEN-DIE-PLATTE, HOCH). Die Platte war fast voll: 328 GB in
   rund 180 000 Verzeichnissen unter os.tmpdir, liegengelassen von Tests (größte Präfixe
   oeffentlicher-zuschnitt-test-, produkt-html-privat-de-, kvf-gl-, kvf-, krypto-prop-,
   vd-feldregister-test-). Hunderte Proben legten mit mkdtemp an und räumten nicht ab, jede für
   sich klein; die Summe über Wochen hielt die Maschine an.

   DREI SCHICHTEN, keine hängt an der Sorgfalt einer einzelnen Probe:
   1. temp-aufraeumen-preload.js (per --require in jedem Testprozess): merkt sich jedes mkdtemp
      und räumt es beim Prozessende.
   2. Die Wache um `npm test` (tools/geteilte-git-config-wache.js) gibt dem Lauf ein EIGENES
      TMPDIR. Was nach dem Lauf darin liegt, ist liegengeblieben — rot, mit den Präfixen. Ein
      eigenes Verzeichnis statt Zählen im gemeinsamen tmpdir: parallele Suiten anderer Sitzungen
      verschieben dort jede Zahl.
   3. Danach räumt die Wache das Laufverzeichnis und verwaiste Laufverzeichnisse abgebrochener Läufe
      (PID tot) — AUSSCHLIESSLICH diesen eigenen Namensraum `vd-lauf-*`. Keine Säuberung nach
      Präfixen aus dem Code im gemeinsamen tmpdir: viele Präfixe sind zusammengesetzt
      (`produkt-html-${slug}-`), das Erkennen wäre unsicher, und eine Aufräumaktion, die an fremde
      Dateien geht, kann private Daten gefährden (entschieden am 28.09.2026).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const LAUF_PRAEFIX = 'vd-lauf-';
/** Ein eigenes TMPDIR für einen Lauf. */
function laufVerzeichnis(basis = os.tmpdir(), pid = process.pid) {
  return fs.mkdtempSync(path.join(basis, LAUF_PRAEFIX + pid + '-'));
}

/** Räumt ein Laufverzeichnis samt Inhalt (die Wache ruft es nach jedem Lauf, in jedem Fall). */
function laufVerzeichnisRaeumen(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

/* Keine Reste, sondern Caches, die ein Lauf über Prozessgrenzen teilt und die mit dem Laufverzeichnis
   verschwinden — sie lassen nichts wachsen. Jeder Eintrag mit Grund; die Liste wächst nicht ohne einen. */
const LAUF_CACHES = Object.freeze([
  { muster: /^vivodepot-e2e-gebacken-[0-9a-f]{12}-/, grund: 'die gebackenen Produkte des E2E-Laufs (tests/e2e/global-setup.js): globalSetup schreibt, jeder Worker liest dieselbe Datei — mkdtemp ginge über die Prozessgrenze nicht' },
  { muster: /^node-compile-cache$/, grund: 'der Kompilier-Cache von Node (module.enableCompileCache, von einer Abhängigkeit eingeschaltet)' },
]);

/** Was im Laufverzeichnis liegt, nach Präfix gezählt (Präfix = Name bis zum letzten Bindestrich); Caches zählen nicht. */
function reste(dir) {
  let namen = [];
  try { namen = fs.readdirSync(dir).filter((n) => !LAUF_CACHES.some((c) => c.muster.test(n))); } catch (_) { return { anzahl: 0, praefixe: {} }; }
  const praefixe = {};
  for (const n of namen) {
    const p = n.includes('-') ? n.slice(0, n.lastIndexOf('-') + 1) : n;
    praefixe[p] = (praefixe[p] || 0) + 1;
  }
  return { anzahl: namen.length, praefixe };
}

function prozessLebt(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** Verwaiste Laufverzeichnisse (vd-lauf-<pid>-…, PID tot) im gemeinsamen tmpdir. Sonst nichts. */
function verwaisteLaeufeRaeumen({ basis = os.tmpdir() } = {}) {
  const geraeumt = [];
  let namen = [];
  try { namen = fs.readdirSync(basis); } catch (_) { return geraeumt; }
  for (const n of namen) {
    if (!n.startsWith(LAUF_PRAEFIX)) continue;
    const pid = Number(n.slice(LAUF_PRAEFIX.length).split('-')[0]);
    if (prozessLebt(pid)) continue;
    try { laufVerzeichnisRaeumen(path.join(basis, n)); geraeumt.push(n); } catch (_) { /* nächstes Mal */ }
  }
  return geraeumt;
}

module.exports = { LAUF_PRAEFIX, LAUF_CACHES, laufVerzeichnis, laufVerzeichnisRaeumen, reste, verwaisteLaeufeRaeumen, prozessLebt };
