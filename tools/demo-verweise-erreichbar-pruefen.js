#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   demo-verweise-erreichbar-pruefen.js — hält docs/demo-verweis-ziele.json aktuell
   („Doku↔Demo-Verknüpfung", 22.09.2026, nach dem Muster von
   tools/website-live-abgleich-pruefen.js — bewusst übernommen, nicht neu erfunden)
   ────────────────────────────────────────────────────────────────────────────
   WOZU: der Rahmentext von DOCS.md nennt die drei Demo-Illustrationen (Betreuungsverein,
   Kleingarten, Betriebsübergabe) über Platzhalter {{ANKER_<ID>}} — tools/docs-md-erzeugen.js
   setzt dafür entweder einen echten Markdown-Link ein (wenn die Adresse ERREICHBAR ist) oder
   nur den bloßen Namen (wenn nicht). Ein toter Link in ausgelieferter Doku bringt dem Leser
   bei, der Doku nicht zu trauen — ein fehlender Link kostet ihn einen Klick, ein toter das
   Vertrauen in alle übrigen (22.09.2026). Dieses Werkzeug ist die einzige Stelle,
   die den Status in docs/demo-verweis-ziele.json schreibt.

   DREI AUSGÄNGE, NICHT ZWEI (Korrektur, 22.09.2026, dieselbe Form wie
   `vergleichsBefund()` in tools/faktenbasis-erzeugen.js — §36.1b):
     erreichbar               — echte HTTP-Antwort, Status 2xx.
     nachweislich unerreichbar — echte HTTP-Antwort, aber kein 2xx (z. B. 404) — der Server hat
                                  geantwortet, nur nicht mit Erfolg. Ein FUND, kein Zufall.
     NICHT GEMESSEN           — kein Netz, Timeout, DNS-Fehler, oder der Lauf ohne --live: KEINE
                                 Aussage über die Adresse selbst. Zählt NIE als „erreichbar" —
                                 sonst meldet ein Lauf ohne Netz nichts und sieht aus wie ein
                                 Lauf.

   WARUM DIE LIVE-PRÜFUNG KEIN GATE IST: wie website-live-abgleich-pruefen.js — ein Wächter, der
   bei jedem Commit ins Netz greift, hat eigene Tücken (kein Netz während der Suite, Adresse
   langsam). `--live` gehört NIE in einen Commit-/Push-Hook, nur dorthin, wo jemand ihn bewusst
   fährt.

   OFFENE ZEILE, NICHT STILL GELASSEN (22.09.2026): es gibt HEUTE keinen geskripteten
   Anlaß, an dem `--live` tatsächlich läuft — genau wie bei website-live-abgleich-pruefen.js
   selbst (dessen `--live` ebenfalls an keinem Hook/Skript/Checkliste hängt, s. dortiger
   Kopfkommentar). Ohne einen solchen Anlaß bleibt docs/demo-verweis-ziele.json für immer
   „NICHT GEMESSEN", die Links aktivieren sich nie, und ohne einen roten Zustand fällt es
   niemandem auf. Details, Grundlage der Zahl: docs/demo-verweis-ziele.json, Schlüssel
   `liveAuslassungOffen`.

   Aufruf:
     node tools/demo-verweise-erreichbar-pruefen.js
       — gegen die eigenen Rot-Beweise (kategorisiereAntwort() pur getestet, kein Netz) — prüft
         NUR die Kategorisierungs-Logik dieses Werkzeugs, rührt die Registrierung nicht an.
     node tools/demo-verweise-erreichbar-pruefen.js --live [--registrierung <pfad>]
       — echter Netzabruf gegen jede url in der Registrierung (Vorgabe:
         docs/demo-verweis-ziele.json), schreibt status + gemessenAm zurück, meldet, welche
         Zeilen noch offen sind (status !== 'erreichbar'). Nie automatisiert gefahren.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const REGISTRIERUNG_VORGABE = path.join(REPO, 'docs', 'demo-verweis-ziele.json');

const ERREICHBAR = 'erreichbar';
const NACHWEISLICH_UNERREICHBAR = 'nachweislich unerreichbar';
const NICHT_GEMESSEN = 'NICHT GEMESSEN';

/* ── Die reine Kategorisierung — kein Netz, kein Dateizugriff, darum ohne Fixtures testbar ─── */

/**
 * @param {{ok:boolean, status:number}|null} antwort  eine echte oder simulierte fetch-Antwort,
 *   oder null, wenn der Abruf selbst geworfen hat (Netzfehler, Timeout, DNS).
 * @returns {string}  einer der drei Ausgänge oben
 */
function kategorisiereAntwort(antwort) {
  if (antwort === null) return NICHT_GEMESSEN;
  return antwort.ok ? ERREICHBAR : NACHWEISLICH_UNERREICHBAR;
}

/**
 * Ein echter Netzabruf, in eine der drei Kategorien übersetzt — jeder geworfene Fehler
 * (Netzfehler, Timeout, DNS, ungültige URL) wird zu NICHT_GEMESSEN, nie zu
 * NACHWEISLICH_UNERREICHBAR: „kein Netz" ist keine Aussage über die Adresse selbst.
 */
async function pruefeLive(url, { timeoutMs = 8000 } = {}) {
  const abbruch = new AbortController();
  const t = setTimeout(() => abbruch.abort(), timeoutMs);
  try {
    const antwort = await fetch(url, { method: 'GET', redirect: 'follow', signal: abbruch.signal });
    return kategorisiereAntwort({ ok: antwort.ok, status: antwort.status });
  } catch {
    return kategorisiereAntwort(null);
  } finally {
    clearTimeout(t);
  }
}

/* ── Registrierung lesen/schreiben — reine Funktionen auf einem bereits geladenen Objekt ───── */

function registrierungLesen(pfad) {
  return JSON.parse(fs.readFileSync(pfad, 'utf8'));
}

/** @returns {{name:string,url:string}[]} nur die drei Felder, die die Platzhalter-Ersetzung braucht */
function ankerkarteAusRegistrierung(registrierung) {
  const karte = {};
  for (const a of registrierung.anker) karte[a.id] = { name: a.name, url: a.url, status: a.status };
  return karte;
}

function offeneZeilen(registrierung) {
  return registrierung.anker.filter((a) => a.status !== ERREICHBAR);
}

/* ── CLI ──────────────────────────────────────────────────────────────────────────────────── */

function argWert(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function liveLauf(registrierungPfad) {
  const registrierung = registrierungLesen(registrierungPfad);
  for (const eintrag of registrierung.anker) {
    eintrag.status = await pruefeLive(eintrag.url);
    eintrag.gemessenAm = new Date().toISOString();
    console.log(`[demo-verweise] ${eintrag.id}: ${eintrag.status} (${eintrag.url})`);
  }
  fs.writeFileSync(registrierungPfad, JSON.stringify(registrierung, null, 2) + '\n', 'utf8');
  const offen = offeneZeilen(registrierung);
  if (offen.length) {
    console.log(`\n${offen.length} von ${registrierung.anker.length} Zeile(n) offen (nicht 'erreichbar'):`);
    offen.forEach((a) => console.log(`   ${a.id}: ${a.status}`));
  } else {
    console.log('\nAlle Zeilen erreichbar.');
  }
  // Kein Gate (s. Kopfkommentar) — ein --live-Lauf informiert, blockiert nichts.
}

function selbstProbe() {
  const faelle = [
    [{ ok: true, status: 200 }, ERREICHBAR],
    [{ ok: true, status: 204 }, ERREICHBAR],
    [{ ok: false, status: 404 }, NACHWEISLICH_UNERREICHBAR],
    [{ ok: false, status: 500 }, NACHWEISLICH_UNERREICHBAR],
    [null, NICHT_GEMESSEN],
  ];
  let rot = 0;
  for (const [antwort, erwartet] of faelle) {
    const ist = kategorisiereAntwort(antwort);
    if (ist !== erwartet) {
      console.error(`[demo-verweise] ✗ ${JSON.stringify(antwort)} → ${ist}, erwartet ${erwartet}`);
      rot++;
    }
  }
  if (rot) { console.error(`\n${rot} Fall/Fälle rot.`); process.exit(1); }
  console.log('[demo-verweise] ✓ Kategorisierung selbst geprüft, kein Netz.');
}

async function main() {
  if (process.argv.includes('--live')) {
    const pfad = argWert('--registrierung') || REGISTRIERUNG_VORGABE;
    await liveLauf(pfad);
    return;
  }
  selbstProbe();
}

module.exports = {
  ERREICHBAR, NACHWEISLICH_UNERREICHBAR, NICHT_GEMESSEN,
  kategorisiereAntwort, pruefeLive, registrierungLesen, ankerkarteAusRegistrierung, offeneZeilen,
};
if (require.main === module) main();
