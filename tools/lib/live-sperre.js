'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Live-Sperre für Werkzeuge, die gegen einen echten Host SCHREIBEN (26.09.2026).

   Am 26.09.2026 hat eine Agentensitzung tools/shl-empfangen-probe.js mit `--help` gestartet, das das
   Werkzeug damals nicht kannte; es fuhr einen echten Lauf und legte (wahrscheinlich) eine Wegwerf-Freigabe auf
   share.vivodepot.de an. Hochladen gegen einen Live-Host startet darum dieselbe Regel wie der Auslieferungslauf
   (tools/auslieferung-je-version-lauf.js) und der Schlüsselbund (tools/lib/schluesselbund.js): nicht aus einer
   Agentensitzung (CLAUDECODE) und nicht aus einem Testprozess samt seinen Kindern
   (VD_SCHLUESSELBUND_GESPERRT). Solche Läufe startet ein Mensch im eigenen Terminal.

   Gebunden an: tools/shl-empfangen-probe.js (schreibt immer) und tools/shl-belegstrecke.js --hochladen.
   Probe: tests/live-sperre.test.js. Die Umgebung wird injiziert, damit die Probe nie einen echten Lauf braucht.
   ═════════════════════════════════════════════════════════════════════════════ */

function liveSperre(env = process.env) {
  if (env.CLAUDECODE) return 'in einer Agentensitzung gestartet (CLAUDECODE gesetzt)';
  if (env.VD_SCHLUESSELBUND_GESPERRT === '1') return 'in der Testumgebung gestartet (VD_SCHLUESSELBUND_GESPERRT)';
  return null;
}

// Beendet den Prozess mit Exit 2, wenn gesperrt — BEVOR irgendetwas gegen den Host läuft.
function liveSperreDurchsetzen(werkzeug, env = process.env) {
  const grund = liveSperre(env);
  if (!grund) return;
  console.error('✖ ' + werkzeug + ': gesperrt — ' + grund + '. Dieser Lauf schreibt gegen einen Live-Host; '
    + 'starten Sie ihn selbst im eigenen Terminal.');
  process.exit(2);
}

module.exports = { liveSperre, liveSperreDurchsetzen };
