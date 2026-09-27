#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   aussenaussagen-pruefen.js — Wächter für docs/aussenaussagen.md
   „Register der Außenaussagen" (02.09.2026).
   ────────────────────────────────────────────────────────────────────────────
   Prüft GENAU DREIERLEI, nicht mehr (Konzept Abschnitt 4, wörtlich übernommen):
     1. Löst jeder genannte Beleg auf? — wiederverwendet loeseAuf() aus
        tools/aussage-pruefung-abgleich-messen.js (derselbe Mechanismus, der
        für die ADR-`konformitaet`-Blöcke gebaut wurde). KEIN zweites Werkzeug.
     2. Ist ein „Gilt bis" abgelaufen?
     3. Trägt jede Zeile ein „Was ihn falsch macht"?

   WAS DIESES WERKZEUG NICHT PRÜFT UND NICHT PRÜFEN KANN — wörtlich aus
   docs/aussenaussagen.md übernommen, nicht nur dort: ob eine Aussage
   tatsächlich das behauptet, was ihr Beleg misst. Das ist Lesen, keine
   Maschine. Ein grünes „Beleg löst auf" heißt „es gibt eine Probe mit diesem
   Namen" — NICHT „diese Probe deckt diesen Satz". Wer dieses Werkzeug als
   Beleg für Letzteres zitiert, baut die nächste Zusicherung ohne Deckung.

   Aufruf:
     node tools/aussenaussagen-pruefen.js            (Bericht, lesbar)
     node tools/aussenaussagen-pruefen.js --check    (nur Exit-Code, für CI)
     node tools/aussenaussagen-pruefen.js [--check] <pfad>
       prüft eine ANDERE Registerdatei statt docs/aussenaussagen.md — trägt
       den zu prüfenden Gegenstand als Argument (stehende Hausregel), nicht
       zuletzt, damit tools/waechter-selbsttest.js dieses Werkzeug gegen eine
       echte Wegwerf-Fixtur fahren kann, ohne den echten Bestand anzufassen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const REGISTER = path.join(REPO, 'docs', 'aussenaussagen.md');
const { loeseAuf } = require('./aussage-pruefung-abgleich-messen.js');

const ALS_CHECK = process.argv.includes('--check');
const PFAD_ARG = process.argv.slice(2).find((a) => !a.startsWith('--'));
const REGISTER_PFAD = PFAD_ARG ? path.resolve(REPO, PFAD_ARG) : REGISTER;

// Ein `Datei#Fragment`-Beleg steht IMMER als eigener Backtick-Code-Span in der
// Zelle (Register-Konvention) — das Fragment endet darum am schließenden
// Backtick, nie an Komma/Klammer (die können Teil des Fragments selbst sein,
// z. B. „G11-CSP` (`connect-src…"-Prosa DANEBEN, nicht IM Span). loeseAuf()
// prüft per Teilstring-Suche (`.includes(name)`), darum reicht ein kurzes,
// eindeutiges Fragment des echten Testtitels — der volle Titel muss NICHT
// wörtlich in der Zelle stehen (vermeidet die Escape-Falle bei Titeln mit
// eingebetteten Quotes, s. Bericht).
const BELEG_MUSTER = /`([\w./-]+\.(?:test\.js|mjs|js))#([^`]+)`/g;

/* ── Register-Tabelle lesen ──────────────────────────────────────────────── */
// Kopfzeile: | Kennung | Aussage | Wo | Beleg | Art | Gilt bis | Was ihn falsch macht |
// Trennzeile (|---|---|...) wird übersprungen. Zellen an ` | ` getrennt, Markdown-
// Escapes für `|` (`\|`) werden nicht erwartet (kommen im Bestand nicht vor —
// geprüft: kein `\|` im Register).
function zeilen(registerPfad) {
  const inhalt = fs.readFileSync(registerPfad || REGISTER, 'utf8');
  const raus = [];
  let inTabelle = false;
  for (const roh of inhalt.split('\n')) {
    if (/^\|\s*Kennung\s*\|/.test(roh)) { inTabelle = true; continue; }
    if (inTabelle && /^\|\s*---/.test(roh)) continue;
    if (inTabelle && !roh.startsWith('|')) { inTabelle = false; continue; }
    if (!inTabelle) continue;
    const zellen = roh.split('|').slice(1, -1).map((z) => z.trim());
    if (zellen.length < 7) continue;
    const [kennung, aussage, wo, beleg, art, giltBis, wasFalschMacht] = zellen;
    raus.push({ kennung, aussage, wo, beleg, art, giltBis, wasFalschMacht });
  }
  return raus;
}

/* ── Prüfung 1: löst jeder genannte Beleg auf? ───────────────────────────── */
function belegeAufloesen(zeile) {
  const fundstellen = [...zeile.beleg.matchAll(BELEG_MUSTER)];
  if (!fundstellen.length) return { erwartet: false, funde: [] };
  const funde = fundstellen.map(([, datei, fragment]) => {
    const r = loeseAuf(datei + '#' + fragment.trim());
    return { datei, fragment: fragment.trim(), ok: r.ok, grund: r.grund };
  });
  return { erwartet: true, funde };
}

/* ── Prüfung 2: „Gilt bis" abgelaufen? ────────────────────────────────────
   Nur Zeilen mit einem echten ISO-Datum (YYYY-MM-DD) werden geprüft — „—"
   heißt „nicht befristet" (Konzept: nur Messung/Entscheidung TRAGEN ein
   Ablaufdatum, Probe braucht keins, weil sie bei jedem Lauf mitprüft). */
function giltBisAbgelaufen(zeile, heute) {
  const m = zeile.giltBis.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (!m) return false;
  return m[1] < heute;
}

/* ── Prüfung 3: trägt jede Zeile ein „Was ihn falsch macht"? ─────────────── */
function ohneFalschMacher(zeile) {
  return !zeile.wasFalschMacht || zeile.wasFalschMacht === '—' || zeile.wasFalschMacht.length < 10;
}

function erhebe(heuteISO, registerPfad) {
  const heute = heuteISO || new Date().toISOString().slice(0, 10);
  const raus = [];
  for (const z of zeilen(registerPfad)) {
    const beleg = belegeAufloesen(z);
    const belegeFehlerhaft = beleg.funde.filter((f) => !f.ok);
    const abgelaufen = giltBisAbgelaufen(z, heute);
    const ohneMacher = ohneFalschMacher(z);
    raus.push({
      kennung: z.kennung, art: z.art,
      belegErwartet: beleg.erwartet, belegeFehlerhaft, abgelaufen, ohneMacher,
      befund: belegeFehlerhaft.length > 0 || abgelaufen || ohneMacher,
    });
  }
  return raus;
}

function bericht(ergebnis) {
  const zeilenMitBefund = ergebnis.filter((e) => e.befund);
  const raus = ['aussenaussagen-pruefen — ' + ergebnis.length + ' Zeilen, ' + zeilenMitBefund.length + ' mit Befund.'];
  for (const e of zeilenMitBefund) {
    raus.push('');
    raus.push('· ' + e.kennung + ' [' + e.art + ']');
    for (const f of e.belegeFehlerhaft) raus.push('  → Beleg löst NICHT auf: ' + f.datei + '#' + f.fragment + ' (' + f.grund + ')');
    if (e.abgelaufen) raus.push('  → „Gilt bis" ist abgelaufen — neu vorlegen.');
    if (e.ohneMacher) raus.push('  → kein (oder zu kurzes) „Was ihn falsch macht".');
  }
  return raus.join('\n');
}

if (require.main === module) {
  const ergebnis = erhebe(null, REGISTER_PFAD);
  const befunde = ergebnis.filter((e) => e.befund);
  if (!ALS_CHECK) process.stdout.write(bericht(ergebnis) + '\n');
  if (befunde.length) {
    if (ALS_CHECK) process.stderr.write(bericht(ergebnis) + '\n');
    process.exit(1);
  }
}

module.exports = { zeilen, belegeAufloesen, giltBisAbgelaufen, ohneFalschMacher, erhebe, bericht, BELEG_MUSTER };
