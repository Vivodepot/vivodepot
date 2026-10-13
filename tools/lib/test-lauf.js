#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Test-Lauf — jeder Testprozess bekommt ein eigenes TMPDIR und das Temp-Netz (10.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (Befund TEMP-RESTE-WIEDER, MITTEL): zwölf Tage nach TEMP-RESTE-FUELLEN-DIE-PLATTE lagen
   wieder rund 8400 Einträge unter os.tmpdir. Das Netz (tools/lib/temp-aufraeumen-preload.js und das
   eigene TMPDIR der Wache um `npm test`) hing an genau einem Startweg. Playwright, die Hooks mit ihren
   direkten `node --test`-Aufrufen und ein Dutzend Werkzeuge, die die Suite selbst starten, liefen daran
   vorbei; ein SIGKILL übersprang zudem den exit-Handler des Preloads.

   EIN NETZ ÜBER DIE UMGEBUNG statt einer Stelle je Startweg:
     · TMPDIR (und TMP/TEMP) = ein eigenes Laufverzeichnis `vd-lauf-*` mit Besitzer-Datei
       (tools/lib/temp-aufraeumen.js). Kinder erben es; der Aufrufer räumt es am Ende in jedem Fall,
       auch wenn ein Kind hart beendet wurde. Bleibt der Aufrufer selbst liegen, räumt der nächste Lauf
       das Verzeichnis, sobald sein Besitzer nachweislich fort ist — nie nach Alter.
     · NODE_OPTIONS ERGÄNZT um `--require <abs>/tools/lib/temp-aufraeumen-preload.js`: vorhandene
       Optionen bleiben stehen, steht der Preload schon darin, kommt er kein zweites Mal hinzu. Der
       Preload wird nur in Testprozessen wach (Kopf der Preload-Datei).

   DREI FORMEN:
     testLauf()                 → { tmpdir, env, aufraeumen() } — der Aufrufer reicht `env` weiter und räumt selbst.
     mitTestLauf((env) => …)    → dasselbe, das Räumen im finally.
     node tools/lib/test-lauf.js -- <befehl> [args…]   (Hooks) — Exit-Code des Befehls, Räumen danach.
   Für Playwright: playwrightLaufBeginnen() beim Laden der Konfiguration (vor jedem os.tmpdir() eines
   Moduls — tests/e2e/global-setup.js rechnet seine Pfade beim Laden aus, und die Specs laden es schon
   beim Sammeln), playwrightLaufBeenden() im globalTeardown.

   NICHT FÜR RELEASE- UND SIGNIERWEGE. Auslieferung, Signieren, Token und Schlüsselbund laufen ohne
   dieses TMPDIR und ohne diese NODE_OPTIONS: ein fremder --require in einem Signierprozess, oder ein
   Laufverzeichnis, das unter einem Signierschritt weggeräumt wird, ist dort kein Gewinn, sondern ein
   Risiko. Die Liste der Wege und ihre Probe: tests/test-lauf.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const T = require('./temp-aufraeumen.js');

const PRELOAD = path.join(__dirname, 'temp-aufraeumen-preload.js');
const UMGEBUNG_LAUF = 'VD_TEST_LAUF';
const UMGEBUNG_BESITZER = 'VD_TEST_LAUF_BESITZER';

/** NODE_OPTIONS mit dem Preload — ergänzt, nie ersetzt, nie doppelt. */
function nodeOptionenMitPreload(vorhanden) {
  const alt = String(vorhanden || '').trim();
  if (alt.includes(PRELOAD)) return alt;
  const req = '--require ' + (/\s/.test(PRELOAD) ? JSON.stringify(PRELOAD) : PRELOAD);
  return alt ? alt + ' ' + req : req;
}

/** Die Umgebung für einen Testprozess mit eigenem Laufverzeichnis. */
function umgebungFuer(dir, env = process.env) {
  return { ...env, TMPDIR: dir, TMP: dir, TEMP: dir, NODE_OPTIONS: nodeOptionenMitPreload(env.NODE_OPTIONS), [UMGEBUNG_LAUF]: dir };
}

/**
 * Ein Laufverzeichnis samt Umgebung. Vorher räumt es verwaiste Laufverzeichnisse unter derselben Basis.
 * @param {{basis?: string, env?: object, pid?: number}} [optionen]
 * @returns {{tmpdir: string, env: object, aufraeumen: () => void}}
 */
function testLauf({ basis = os.tmpdir(), env = process.env, pid = process.pid } = {}) {
  T.verwaisteLaeufeRaeumen({ basis });
  const dir = T.laufVerzeichnis(basis, pid);
  let geraeumt = false;
  return {
    tmpdir: dir,
    env: umgebungFuer(dir, env),
    aufraeumen() { if (geraeumt) return; geraeumt = true; T.laufVerzeichnisRaeumen(dir); },
  };
}

/** fn(env, lauf) in einem eigenen Laufverzeichnis; geräumt wird in jedem Fall. Auch für async fn. */
function mitTestLauf(fn, optionen) {
  const lauf = testLauf(optionen);
  let ergebnis;
  try { ergebnis = fn(lauf.env, lauf); } catch (e) { lauf.aufraeumen(); throw e; }
  if (ergebnis && typeof ergebnis.then === 'function') return ergebnis.finally(() => lauf.aufraeumen());
  lauf.aufraeumen();
  return ergebnis;
}

/* Playwright: der Prozess, der die Konfiguration zuerst lädt, legt das Laufverzeichnis an und setzt die Umgebung
   in process.env — Worker und Lade-Prozesse erben sie und legen kein zweites an. Besitzer ist dieser Prozess. */
function playwrightLaufBeginnen({ basis, env = process.env, pid = process.pid } = {}) {
  const da = env[UMGEBUNG_LAUF];
  if (da && fs.existsSync(da)) return { tmpdir: da, neu: false };
  const lauf = testLauf({ basis: basis || os.tmpdir(), env, pid });
  for (const k of ['TMPDIR', 'TMP', 'TEMP', 'NODE_OPTIONS', UMGEBUNG_LAUF]) env[k] = lauf.env[k];
  env[UMGEBUNG_BESITZER] = String(pid);
  return { tmpdir: lauf.tmpdir, neu: true };
}

/** Räumt das Laufverzeichnis, wenn dieser Prozess es angelegt hat; ein geerbtes räumt sein Besitzer. */
function playwrightLaufBeenden({ env = process.env, pid = process.pid } = {}) {
  const dir = env[UMGEBUNG_LAUF];
  if (!dir || env[UMGEBUNG_BESITZER] !== String(pid)) return false;
  T.laufVerzeichnisRaeumen(dir);
  return true;
}

/** Hooks: `node tools/lib/test-lauf.js -- <befehl> [args…]`. Exit-Code des Befehls; ein Signal zählt als 1. */
function main(argv = process.argv.slice(2)) {
  const trenner = argv.indexOf('--');
  if (trenner === -1 || trenner === argv.length - 1) {
    console.error('Aufruf: node tools/lib/test-lauf.js -- <befehl> [args...]');
    return 2;
  }
  const [cmd, ...args] = argv.slice(trenner + 1);
  return mitTestLauf((env) => {
    const r = spawnSync(cmd, args, { stdio: 'inherit', env });
    if (r.error) { console.error('[test-lauf] ' + r.error.message); return 1; }
    return r.status == null ? 1 : r.status;
  });
}

if (require.main === module) process.exit(main());

module.exports = {
  PRELOAD, UMGEBUNG_LAUF, UMGEBUNG_BESITZER,
  nodeOptionenMitPreload, umgebungFuer, testLauf, mitTestLauf, playwrightLaufBeginnen, playwrightLaufBeenden, main,
};
