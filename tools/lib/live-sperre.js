'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Live-Sperre für Werkzeuge, die gegen einen echten Host SCHREIBEN (26.09.2026, fail-closed seit 07.10.2026).

   Am 26.09.2026 hat eine Agentensitzung tools/shl-empfangen-probe.js mit `--help` gestartet, das das
   Werkzeug damals nicht kannte; es fuhr einen echten Lauf und legte (wahrscheinlich) eine Wegwerf-Freigabe auf
   share.vivodepot.de an. Solche Läufe startet ein Mensch im eigenen Terminal.

   FAIL-CLOSED (07.10.2026): gesperrt ist, solange kein Nachweis vorliegt, dass ein Mensch am eigenen Terminal sitzt.
   Bis dahin erkannte die Sperre eine Agentensitzung an einer Umgebungsvariablen, die das Werkzeug der Sitzung setzt;
   fehlte sie, war die Sperre offen. Jetzt gilt umgekehrt:
     - ohne Terminal (stdin und stdout kein TTY) — so läuft jede Agentensitzung und jeder Hintergrundlauf — gesperrt,
       auch mit gesetzter Variable unten: einen Nachweis kann sich niemand ohne Terminal selbst ausstellen;
     - im Testprozess samt seinen Kindern (VD_SCHLUESSELBUND_GESPERRT=1) gesperrt;
     - am Terminal: frei nach der Bestätigung „ja“, oder ohne Rückfrage, wenn VD_LIVE_MENSCH=1 im eigenen Terminal
       gesetzt ist.

   Gebunden an: tools/shl-empfangen-probe.js (schreibt immer) und tools/shl-belegstrecke.js --hochladen.
   Probe: tests/live-sperre.test.js. Umgebung und Terminal werden injiziert, damit die Probe nie einen echten Lauf braucht.

   EIN MENSCHEN-NACHWEIS FÜR ALLE SPERREN (07.10.2026, Befund AGENTENSPERRE-FAIL-OPEN): dieselbe Regel trägt jetzt auch
   den Schlüsselbund, den Release und den Auslieferungslauf (interne Werkzeuge). `menschNachweis` ist die eine Entscheidung;
   `liveSperre` ruft sie.
     - Je Prozess höchstens EINE Frage: ein positiver Nachweis am ECHTEN Terminal wird im Modul gemerkt (ein Werkzeug,
       das Passphrase und Schlüsselpfad aus dem Schlüsselbund liest, fragte sonst zweimal). Gemerkt wird nur das „ja“,
       nie ein „nein“, und nur am Terminal aus echtesTerminal() (Kennung `echt`) — Proben injizieren ein eigenes Terminal
       ohne diese Kennung und bleiben so deterministisch, unabhängig von der Reihenfolge. Testschalter und fehlendes
       Terminal sperren auch nach einem „ja“. Ein Kindprozess fragt erneut (eigener Prozess, eigenes Gedächtnis).
     - Spur: Ruft ein Signier- oder Schlüsselbund-Weg den Nachweis (Option `werkzeug`), schreibt er eine JSON-Zeile in
       hook-log.ndjson im Repo-Wurzelverzeichnis (dieselbe Datei wie hooks/_hook-log.sh): zeit, hook, werkzeug,
       nachweis „ja“/„nein“ — sonst nichts, kein Wert, kein Pfad, kein Grund-Text, nichts aus der Umgebung. `logDatei`
       ist injizierbar; im Testprozess (VD_SCHLUESSELBUND_GESPERRT=1 im ECHTEN process.env) schreibt nur eine
       ausdrücklich übergebene `logDatei`, damit keine Probe in den Repo-Baum schreibt. Ein Schreibfehler der Spur
       ändert die Entscheidung nicht.
   ═════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const FRAGE = 'Dieser Lauf schreibt gegen einen Live-Host. Fortfahren? Bitte „ja“ eingeben: ';
const FRAGE_MENSCH = 'Dieser Lauf signiert oder öffnet den Schlüsselbund. Sitzen Sie selbst am Terminal? Bitte „ja“ eingeben: ';
const STANDARD_LOG = path.join(__dirname, '..', '..', 'hook-log.ndjson');
const SPUR_SCHLUESSEL = Object.freeze(['zeit', 'hook', 'werkzeug', 'nachweis']);

/* Das echte Terminal des Prozesses. `bestaetigen` liest blockierend eine Zeile von stdin; nur aufgerufen, wenn beide
   Seiten ein TTY sind. */
function echtesTerminal() {
  return {
    echt: true,
    istTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    bestaetigen(frage) {
      fs.writeSync(1, frage);
      const puffer = Buffer.alloc(256);
      let n = 0;
      try { n = fs.readSync(0, puffer, 0, puffer.length, null); } catch (_) { return ''; }
      return puffer.subarray(0, n).toString('utf8').trim();
    },
  };
}

// Der gemerkte positive Nachweis dieses Prozesses (nur am echten Terminal, s. Kopf).
let nachgewiesenAmEchtenTerminal = false;

function entscheiden(env, terminal, frage) {
  const merken = terminal.echt === true;
  if (env.VD_SCHLUESSELBUND_GESPERRT === '1') return 'in der Testumgebung gestartet (VD_SCHLUESSELBUND_GESPERRT)';
  if (!terminal.istTTY) return 'kein eigenes Terminal (stdin/stdout kein TTY), etwa in einer Agentensitzung';
  if (env.VD_LIVE_MENSCH === '1') return null;
  if (merken && nachgewiesenAmEchtenTerminal) return null;
  if (terminal.bestaetigen(frage) === 'ja') {
    if (merken) nachgewiesenAmEchtenTerminal = true;
    return null;
  }
  return 'am Terminal nicht mit „ja“ bestätigt';
}

// Eine Zeile Spur, genau die Schlüssel aus SPUR_SCHLUESSEL. `werkzeug` ist ein fester Name, den der Aufrufer setzt.
function spurSchreiben(werkzeug, grund, logDatei) {
  const ziel = logDatei || (process.env.VD_SCHLUESSELBUND_GESPERRT === '1' ? null : STANDARD_LOG);
  if (!ziel) return;
  const zeile = { zeit: new Date().toISOString(), hook: 'mensch-nachweis', werkzeug: String(werkzeug).slice(0, 80), nachweis: grund ? 'nein' : 'ja' };
  try { fs.appendFileSync(ziel, JSON.stringify(zeile) + '\n'); } catch (_) { /* die Spur entscheidet nichts */ }
}

/* null = ein Mensch sitzt nachweislich am eigenen Terminal; sonst der Grund der Sperre.
   optionen: { werkzeug, logDatei, frage } — mit `werkzeug` schreibt der Aufruf eine Zeile Spur (s. Kopf).
   `terminal` fehlt = echtesTerminal() (nur dort wird ein „ja“ gemerkt). */
function menschNachweis(env = process.env, terminal = echtesTerminal(), optionen = {}) {
  const grund = entscheiden(env, terminal, optionen.frage || FRAGE_MENSCH);
  if (optionen.werkzeug) spurSchreiben(optionen.werkzeug, grund, optionen.logDatei);
  return grund;
}

function liveSperre(env = process.env, terminal) {
  return menschNachweis(env, terminal, { frage: FRAGE });
}

// Beendet den Prozess mit Exit 2, wenn gesperrt — BEVOR irgendetwas gegen den Host läuft.
function liveSperreDurchsetzen(werkzeug, env = process.env, terminal) {
  const grund = liveSperre(env, terminal);
  if (!grund) return;
  console.error('✖ ' + werkzeug + ': gesperrt — ' + grund + '. Dieser Lauf schreibt gegen einen Live-Host; '
    + 'starten Sie ihn selbst im eigenen Terminal.');
  process.exit(2);
}

module.exports = { menschNachweis, liveSperre, liveSperreDurchsetzen, echtesTerminal, FRAGE, FRAGE_MENSCH, SPUR_SCHLUESSEL };
