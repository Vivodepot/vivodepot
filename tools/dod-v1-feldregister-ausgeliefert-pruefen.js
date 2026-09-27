#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   dod-v1-feldregister-ausgeliefert-pruefen.js — stimmt das Veröffentlichte mit dem Kanon überein?
   (Abnahme-Strang, 17.09.2026, Zuordnung nach Fund aus Strang D)
   ────────────────────────────────────────────────────────────────────────────
   DoD-Punkt 3 („Feldregister … voll funktionsfähig") zerfällt in zwei Fragen, und dieses
   Werkzeug beantwortet nur die zweite: „wird es gebaut" prüft ein anderer Strang (Erzeuger-/Generator-Seite,
   `tools/feldregister-bauen.js`, unverändert von diesem Werkzeug hier — keine zweite
   Implementierung, `bauen()` wird wörtlich wiederverwendet). „STIMMT DAS VERÖFFENTLICHTE MIT DEM
   KANON ÜBEREIN" ist die Lücke, die der Kopf-Kommentar von `feldregister-bauen.js` selbst nennt:
   „das Register liegt an ZWEI Orten … die ausgelieferte Fassung … hängt hinter dem Kanon
   zurück, ohne dass es jemandem auffällt."

   GEMESSEN, NICHT ANGENOMMEN (17.09.2026): `https://register.vivodepot.de/feldregister.json`
   antwortet heute mit 404 — das Register ist NOCH GAR NICHT veröffentlicht (nicht „veraltet",
   sondern „fehlt"). Die 404-Seite selbst sagt das offen: „wird hier veröffentlicht, ist aber
   noch nicht erschienen." Das macht diese Probe heute UNVERMEIDLICH rot — kein Vergleichswert
   vorhanden, keine Übereinstimmung möglich.

   WAS „GRÜN" HEISST: die Prüfsumme, die `bauen()` aus dem AKTUELLEN Kanon (Katalog + Kern-
   Standzahl) frisch berechnet, ist WORTGLEICH mit der Prüfsumme, die unter der Webspace-Adresse
   tatsächlich abrufbar ist. Nicht „eine Datei liegt dort", sondern „es ist DIESELBE Datei, die
   der heutige Kanon erzeugen würde".

   Aufruf:
     node tools/dod-v1-feldregister-ausgeliefert-pruefen.js
       — gegen die eingefrorene Fixture hier im Repo (Stand 17.09.2026: „kein Live-Inhalt", der
         gemessene 404-Fall) — läuft überall, ohne Netzzugriff, damit die Suite es mitfahren kann.
     node tools/dod-v1-feldregister-ausgeliefert-pruefen.js --live
       — echter Netzabruf gegen `https://register.vivodepot.de`, für die tatsächliche Abnahme.
     node tools/dod-v1-feldregister-ausgeliefert-pruefen.js --webspace-url <basis>
       — wie --live, aber gegen eine andere Basis-Adresse (z. B. eine Staging-Kopie).
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { bauen, PRUEFSUMMEN_DATEI } = require('./feldregister-bauen.js');

const LIVE_BASIS_VORGABE = 'https://register.vivodepot.de';

function argWert(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

/* Liest eine .sha256-Zeile im shasum-Format ("<hash>  <dateiname>") — wirft benannt bei
   fremdem Format, statt einen Vergleich gegen `undefined` still als „verschieden" zu werten. */
function hashAusPruefsummenzeile(zeile) {
  const m = /^([0-9a-f]{64})\s+\S+/i.exec((zeile || '').trim());
  if (!m) throw new Error('dod-v1-feldregister-ausgeliefert-pruefen: keine gültige sha256-Zeile: ' + JSON.stringify(zeile));
  return m[1].toLowerCase();
}

/* Der eigentliche Vergleich — reine Funktion, kein Netz-/Dateizugriff, testbar mit
   synthetischen Werten. `liveText` ist entweder die abgerufene .sha256-Zeile, oder `null`
   (nichts veröffentlicht/kein Zugriff) — beide Fälle sind ROT, aus unterscheidbarem Grund. */
function vergleichen(kanonHash, liveText) {
  if (liveText === null || liveText === undefined) {
    return { gruen: false, grund: 'nicht-veroeffentlicht', kanonHash, liveHash: null };
  }
  let liveHash;
  try {
    liveHash = hashAusPruefsummenzeile(liveText);
  } catch (e) {
    return { gruen: false, grund: 'unlesbar', kanonHash, liveHash: null, fehler: e.message };
  }
  return liveHash === kanonHash
    ? { gruen: true, grund: 'uebereinstimmend', kanonHash, liveHash }
    : { gruen: false, grund: 'abweichend', kanonHash, liveHash };
}

/* Echter Netzabruf — einzige Stelle mit I/O, damit `vergleichen()` ohne Netz testbar bleibt.
   Liefert `null` bei 404 (der heute gemessene, erwartete Fall) oder jedem anderen Fehler —
   der GRUND (404 vs. Netzfehler) steht im Log, nicht im Rückgabewert, der bleibt einheitlich. */
async function liveHashLesen(basis) {
  const url = basis.replace(/\/+$/, '') + '/' + PRUEFSUMMEN_DATEI;
  try {
    const antwort = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!antwort.ok) {
      process.stderr.write('  (Netzabruf ' + url + ': HTTP ' + antwort.status + ')\n');
      return null;
    }
    return await antwort.text();
  } catch (e) {
    process.stderr.write('  (Netzabruf ' + url + ' fehlgeschlagen: ' + e.message + ')\n');
    return null;
  }
}

async function main() {
  const alsJson = process.argv.includes('--json');
  const live = process.argv.includes('--live') || argWert('--webspace-url') !== null;
  const basis = argWert('--webspace-url') || LIVE_BASIS_VORGABE;

  const kanonHash = bauen({}).hash;
  const liveText = live
    ? await liveHashLesen(basis)
    /* Fixture-Fall: der gemessene Stand vom 17.09.2026 selbst ist „nichts veröffentlicht" —
       keine Datei im Repo nötig, `null` IST die Fixture. */
    : null;

  const ergebnis = vergleichen(kanonHash, liveText);
  ergebnis.quelle = live ? basis : '(Fixture Stand 17.09.2026: nicht veröffentlicht, gemessen per curl)';

  if (alsJson) {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + '\n');
  } else {
    process.stdout.write('Feldregister ausgeliefert vs. Kanon — Quelle: ' + ergebnis.quelle + '\n');
    process.stdout.write('  Kanon-Prüfsumme: ' + ergebnis.kanonHash + '\n');
    process.stdout.write('  Live-Prüfsumme:  ' + (ergebnis.liveHash || '(keine)') + '\n');
    if (ergebnis.gruen) {
      process.stdout.write('GRÜN — ausgeliefert entspricht dem aktuellen Kanon.\n');
    } else {
      process.stdout.write('ROT — ' + ergebnis.grund + (ergebnis.fehler ? ' (' + ergebnis.fehler + ')' : '') + '\n');
      process.exitCode = 1;
    }
  }
}

if (require.main === module) main();
module.exports = { vergleichen, hashAusPruefsummenzeile, liveHashLesen, LIVE_BASIS_VORGABE };
