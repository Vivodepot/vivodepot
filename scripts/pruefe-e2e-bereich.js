#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pre-push-Gate — die E2E-Suite über den zu pushenden Bereich
   ────────────────────────────────────────────────────────────────────────
   WARUM ES ÜBERHAUPT GEBRAUCHT WIRD. Die E2E-Deckung hing an GitHub Actions.
   Die sind seit dem 07.08.2026 aus — seither fährt die Suite vor KEINER
   Landung. Am 06.09. ging ein Schnitt durch sieben Gates und riss dabei eine
   E2E-Probe; gefunden hat es nicht das Netz, sondern ein freiwilliger
   Volllauf. Vier Wochen ohne dieses Netz sind vier Wochen, in denen jede
   Landung darauf setzte, dass jemand freiwillig nachsieht.

   DER ANLASS WIRD ABGELEITET, NICHT GEPFLEGT. Die Trägerdateien kommen aus
   `scripts/ausgeliefertes-dateiset.js` (`DATEISATZ`) — dieselbe einzige
   Quelle, aus der auch der Schalen-Lockstep seine vier Dateien nimmt. Eine
   zweite Liste hier wäre eine zweite Landkarte: sie kennte die Träger von
   heute und keinen, der morgen dazukommt.

   DAZU die E2E-Proben selbst (`tests/e2e/`). Wer eine Probe ändert, muss sie
   fahren — sonst landet eine kaputte Probe, und das Gate, das sie stellen
   soll, meldet erst beim nächsten fremden Zug. Das ist eine Erweiterung
   gegenüber „nur Trägerdateien", und sie ist billig: sie kostet nur dort,
   wo ohnehin an E2E gearbeitet wird.

   KEIN STILLES ÜBERSPRINGEN (U2-ADR-106). Fehlt Playwright oder sein
   Browser, ist der Befund UNGEMESSEN — und ungemessen ist nicht grün,
   sondern rot. Vor einem Push ist die Frage beantwortbar; wer sie nicht
   beantworten kann, hat nichts belegt.

   DIE LASTSCHRANKE ist aus demselben Holz. In der Nacht zum 06.09.2026 hat
   der Rechner unter gleichzeitigen Testsuiten eine Kernel-Panik ausgelöst.
   Gemessen (`tools/last-waehrend-lauf-messen.js`): EIN Lauf trägt rund 4,8
   zur Systemlast bei, Spitze 8,76 bei einer Grundlast von 3,97, Dauer 103 s.
   Liegt die Last beim Start schon über der Schranke, bricht das Gate ab —
   der Push wird VERHINDERT, nicht durchgewinkt. „Gerade keine Kapazität"
   ist ungemessen, und ungemessen ist rot.
   ════════════════════════════════════════════════════════════════════════ */
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const { DATEISATZ } = require('./ausgeliefertes-dateiset.js');

/* Ab dieser Ein-Minuten-Last bricht das Gate ab, statt einen weiteren Lauf
   danebenzustellen. 15 lässt zwei gleichzeitige Läufe zu (gemessen: 3,97 +
   2 x 4,8 = 13,6) und fängt den dritten ab, der rechnerisch bei 18,4 läge —
   real höher, weil `loadavg` ein gleitendes Mittel ist und einem 103-Sekunden-
   Lauf hinterherhinkt. Die dokumentierte Abbruchschwelle des Rechners liegt
   bei 25; diese Schranke hält Abstand dazu, statt ihn auszureizen. */
const LAST_SCHRANKE = 15;

/* ZWEIMAL MESSEN, mit Abstand, und nur abbrechen, wenn BEIDE Messungen über der
   Schranke liegen. Eine einzelne Spitze — ein Erzeuger, der gerade fertig wird —
   ist kein Zustand, und eine Schranke, die an einem Zucken auslöst, wird umgangen
   statt beachtet. */
const LAST_MESSUNGEN = 2;
const LAST_ABSTAND_MS = 4000;

const E2E_PFAD = 'tests/e2e/';
/* Die Cross-Reisen (vier Komponenten) hingen ebenfalls nur an GitHub Actions; ihr Rot am nackten Gerüst
   (19.09.2026, T-CROSS-01) blieb deshalb unbemerkt. Gleicher Anlass, gleiche Last-Schranke, eigener Lauf. */
const E2E_CROSS_PFAD = 'tests/e2e-cross/';
/* Die Firefox-Proben (Entscheidung, 19.09.2026): anlassbezogen — wenn sich eine der beiden Oberflächen,
   die Proben oder ihre Konfiguration ändern. Das Firefox-Binary kommt mit `tools/arbeitsbaum-einsatzbereit-machen.js`
   (`npx playwright install firefox`); fehlt es, ist der Lauf rot, nicht übersprungen. */
const E2E_FIREFOX_PFAD = 'tests/e2e-firefox/';
const FIREFOX_TRAEGER = ['vivodepot.html', 'vivodepot-lesen.html', 'playwright.config.firefox.js'];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

/* Die geänderten Dateien des zu pushenden Bereichs. Ein remote-sha aus lauter
   Nullen heisst „neuer Branch" — dann gibt es keinen Bereich, gegen den man
   diffen könnte, und der Anlass gilt als gegeben. Lieber einmal zu viel
   fahren als einen ganzen neuen Zweig ungemessen lassen. */
function geaenderteDateien(lokalSha, remoteSha) {
  if (/^0+$/.test(remoteSha)) return null;          // null = ganzer Zweig, Anlass gegeben
  try {
    return git('diff', '--name-only', remoteSha, lokalSha).split('\n').filter(Boolean);
  } catch (_) {
    return null;                                     // kein Bereich messbar -> fahren
  }
}

function firefoxAnlassGegeben(dateien) {
  if (dateien === null) return { ja: true, grund: 'neuer Zweig oder kein messbarer Bereich' };
  const t = dateien.filter((d) => FIREFOX_TRAEGER.includes(d) || d.startsWith(E2E_FIREFOX_PFAD));
  return t.length ? { ja: true, grund: 'Firefox-relevant geändert: ' + t.join(', ') } : { ja: false, grund: 'weder Oberfläche noch Firefox-Probe im Bereich' };
}

function anlassGegeben(dateien) {
  if (dateien === null) return { ja: true, grund: 'neuer Zweig oder kein messbarer Bereich' };
  const traeger = dateien.filter((d) => DATEISATZ.includes(d));
  if (traeger.length) return { ja: true, grund: 'Trägerdatei geändert: ' + traeger.join(', ') };
  const proben = dateien.filter((d) => d.startsWith(E2E_PFAD));
  if (proben.length) return { ja: true, grund: proben.length + ' E2E-Probe(n) geändert' };
  const cross = dateien.filter((d) => d.startsWith(E2E_CROSS_PFAD) || d === 'playwright.config.cross.js');
  if (cross.length) return { ja: true, grund: cross.length + ' Cross-Probe(n) geändert' };
  return { ja: false, grund: 'weder Trägerdatei noch E2E-Probe im Bereich' };
}

/* Ist Playwright samt Browser da? Die Frage wird GESTELLT, nicht angenommen —
   `npx playwright --version` allein sagt nichts über den Browser. */
function playwrightBereit() {
  const r = spawnSync('npx', ['playwright', '--version'], { encoding: 'utf8' });
  if (r.status !== 0) return { ja: false, grund: 'playwright nicht aufrufbar' };
  return { ja: true, version: (r.stdout || '').trim() };
}

/* Blockierend, weil ein Hook keine Ereignisschleife hat, auf die er warten
   könnte — und weil vier Sekunden gegenüber einem 103-Sekunden-Lauf nichts sind. */
function lastMehrfach(anzahl = LAST_MESSUNGEN, abstandMs = LAST_ABSTAND_MS) {
  const werte = [os.loadavg()[0]];
  for (let i = 1; i < anzahl; i++) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, abstandMs);
    werte.push(os.loadavg()[0]);
  }
  return werte;
}

function main() {
  const roh = require('node:fs').readFileSync(0, 'utf8').trim();
  if (!roh) { console.log('[e2e-bereich] nichts zu pushen'); return 0; }

  /* DER LETZTE GEPRUEFTE BEFUND GILT, nicht ein Startwert. Ein Startwert, der
     stehenbleibt, wenn die Schleife nichts findet, meldet einen Grund, der nie
     gemessen wurde — „kein Ref mit Inhalt", obwohl in Wahrheit ein Bereich
     geprueft und fuer irrelevant befunden wurde. Wer das liest, sucht den Fehler
     beim Hook statt beim Anlass. Dieselbe Klasse wie ein Anker, der ins Leere
     zeigt: die Meldung sieht wie ein Befund aus und ist keiner.
     (Fund aus einer internen Erhebung vom 06.09.2026 · Fix vorgezeichnet in Commit 5dadfbb8,
     nur lokal, nie gepusht.) */
  let anlass = { ja: false, grund: 'kein Ref mit Inhalt — der Hook bekam keine prüfbare Zeile' };
  for (const zeile of roh.split('\n').filter(Boolean)) {
    const [, lokalSha, , remoteSha] = zeile.split(/\s+/);
    if (/^0+$/.test(lokalSha)) continue;                     // Löschung eines Refs
    anlass = anlassGegeben(geaenderteDateien(lokalSha, remoteSha));
    if (anlass.ja) break;
  }

  let firefox = { ja: false, grund: 'kein Ref mit Inhalt' };
  for (const zeile of roh.split('\n').filter(Boolean)) {
    const [, lokalSha, , remoteSha] = zeile.split(/\s+/);
    if (/^0+$/.test(lokalSha)) continue;
    firefox = firefoxAnlassGegeben(geaenderteDateien(lokalSha, remoteSha));
    if (firefox.ja) break;
  }

  if (!anlass.ja && !firefox.ja) {
    console.log('[e2e-bereich] kein Anlass — ' + anlass.grund + '. Nicht gefahren.');
    return 0;
  }
  console.log('[e2e-bereich] Anlass: ' + (anlass.ja ? anlass.grund : 'Chromium-Suite: keiner') + (firefox.ja ? ' · Firefox: ' + firefox.grund : ''));

  const pw = playwrightBereit();
  if (!pw.ja) {
    console.error('[e2e-bereich] UNGEMESSEN: ' + pw.grund + '. Ungemessen ist nicht grün — ABBRUCH.');
    console.error('              Beheben mit: npx playwright install chromium');
    return 1;
  }

  const messwerte = lastMehrfach();
  if (messwerte.every((l) => l >= LAST_SCHRANKE)) {
    console.error('[e2e-bereich] UNGEMESSEN — nicht rot: die E2E-Suite wurde nicht gefahren, weil');
    console.error('              der Rechner sie gerade nicht tragen kann. KEIN Fehler in diesem Zug.');
    console.error('              Gemessen: ' + messwerte.map((l) => l.toFixed(2)).join(' und ')
      + ' (Ein-Minuten-Last), Schranke ' + LAST_SCHRANKE + '. Zweimal gemessen,');
    console.error('              damit eine einzelne Spitze die Schranke nicht auslöst.');
    console.error('              ZU TUN: warten, bis die anderen Läufe durch sind, dann erneut pushen.');
    console.error('              Ein E2E-Lauf trägt rund 4,8 zur Last bei (tools/last-waehrend-lauf-messen.js).');
    return 1;
  }
  console.log('[e2e-bereich] Systemlast ' + messwerte.map((l) => l.toFixed(2)).join('/')
    + ' — unter der Schranke ' + LAST_SCHRANKE + ', Lauf beginnt.');

  if (anlass.ja) {
    const r = spawnSync('npm', ['run', 'test:e2e'], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error('[e2e-bereich] ABBRUCH: die E2E-Suite ist rot.');
      return 1;
    }
    console.log('[e2e-bereich] E2E-Suite grün. Jetzt die Cross-Reisen (vier Komponenten) …');
    const c = spawnSync('npm', ['run', 'test:e2e:cross', '--', '--workers=1'], { stdio: 'inherit' });
    if (c.status !== 0) {
      console.error('[e2e-bereich] ABBRUCH: die Cross-Reisen sind rot.');
      return 1;
    }
  }
  if (firefox.ja) {
    console.log('[e2e-bereich] Firefox-Proben …');
    const f = spawnSync('npm', ['run', 'test:e2e:firefox', '--', '--workers=1'], { stdio: 'inherit' });
    if (f.status !== 0) {
      console.error('[e2e-bereich] ABBRUCH: die Firefox-Proben sind rot — oder das Firefox-Binary fehlt (kein Überspringen).');
      console.error('              Beheben mit: npx playwright install firefox  (oder node tools/arbeitsbaum-einsatzbereit-machen.js)');
      return 1;
    }
  }
  console.log('[e2e-bereich] OK — alle angestoßenen Läufe grün.');
  return 0;
}

module.exports = { anlassGegeben, lastMehrfach, LAST_SCHRANKE, LAST_MESSUNGEN, E2E_PFAD, E2E_CROSS_PFAD, E2E_FIREFOX_PFAD, firefoxAnlassGegeben };

if (require.main === module) process.exit(main());
