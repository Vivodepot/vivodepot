'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   csp-beim-schreiben.js — Testumgebung: eine geschriebene HTML-Kopie trägt die passenden CSP-Hashes (U2-ADR-470)
   ────────────────────────────────────────────────────────────────────────────
   Seit U2-ADR-470 erlaubt die CSP jeden Inline-Block nur per sha256. Viele Browser-Proben schreiben eine ABGEÄNDERTE
   Kopie einer Anwendung (Rot-Beweise: eine Weiche ausgeschaltet, eine Meldung ersetzt) — der geänderte Block passt dann
   nicht mehr zu seinem Hash, der Browser blockiert ihn, und die Probe stirbt an einem Zeitlimit statt an ihrer Aussage.
   Gemessen im ersten Bau am 01.10.2026: fünf Rot-Beweise fielen so.

   Darum zieht dieses Modul in der Testumgebung beim Schreiben einer .html-Datei die Hashes nach, mit derselben Regel wie
   jeder Bauweg (tools/lib/csp-nach-bau.js): NUR, wenn die CSP schon ohne 'unsafe-inline' steht. Eine ältere Fassung mit
   'unsafe-inline' (A/B-Abnahmen) bleibt, wie sie ist. Geladen wird es von den Playwright-Konfigurationen (Haupt- und
   Arbeitsprozesse laden die Konfiguration); die Auslieferung berührt es nicht. Dass die CSP selbst trägt, prüft
   tests/konformitaet/csp-exploit.mjs ohne diesen Weg.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { cspNachBau } = require('./csp-nach-bau.js');

function anpassen(ziel, daten) {
  if (typeof ziel !== 'string' || !/\.html?$/i.test(ziel)) return daten;
  const text = typeof daten === 'string' ? daten : (Buffer.isBuffer(daten) ? daten.toString('utf8') : null);
  if (text == null || !/http-equiv="Content-Security-Policy"/.test(text)) return daten;
  const neu = cspNachBau(text);
  if (neu === text) return daten;
  return typeof daten === 'string' ? neu : Buffer.from(neu, 'utf8');
}

function einhaengen() {
  if (fs.writeFileSync.__cspBeimSchreiben) return;
  const original = fs.writeFileSync;
  const ersatz = function (ziel, daten, ...rest) { return original.call(fs, ziel, anpassen(ziel, daten), ...rest); };
  ersatz.__cspBeimSchreiben = true;
  fs.writeFileSync = ersatz;
}

module.exports = { einhaengen, anpassen };
