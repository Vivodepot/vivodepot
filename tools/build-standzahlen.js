#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-standzahlen.js — Stand-Zahlen in Aussen-Dokumenten ERZEUGEN, nicht
   von Hand eintragen
   ────────────────────────────────────────────────────────────────────────────
   NACHTRAG VOM 20.08.2026: „Nicht von Hand eintragen, wo es erzeugt
   werden kann. Eine korrigierte Handkopie ist in vier Wochen wieder falsch."

   NACHTRAG VOM 11.09.2026 (Nachtlauf, „Standzahlen raus" — Befund
   `standzahlen-geltungsbereich-und-die-dreizehnte-2026-09-11.md`, Ansage: „wir nehmen die Zahlen ganz raus, denn sie können durch die
   Modularität nicht fix sein."): der Block „Umfang der Erhebung" in
   `STANDARDS.md` — 13 Sektoren, 270 Felder, 184 Unterfelder, 19 Anlässe, 7
   Assistenten, 10 Situationen — ist ENTFALLEN. Er behauptete einen Umfang für
   GENAU EINE Zusammensetzung (ab Werk); jedes andere Produkt lag außerhalb,
   ohne dass der Text das sagte. `standMessen()` bleibt stehen und misst diese
   Zahlen weiterhin — Zug 2 der Kampagne „eine Leseart statt dreiundvierzig"
   braucht sie direkt (`tests/zug2-erzeuger-leseart.test.js`) — sie fließen
   nur nicht mehr in ein Dokument.

   WAS NOCH ERZEUGT WIRD, UND WARUM DIESE ZWEI NICHT UNTER DIE ANSAGE FALLEN:
   Schema-Version und `SCHALEN_STAND` in `STANDARDS.md` (Abschnitt „Interner
   Versionsstand") sowie die Suite-Zahl in `docs/konformitaet-quellen.md`. Alle
   drei sind Tatsachen über EINEN Build/Lauf, nicht Zusicherungen über eine
   Zusammensetzung — anders als die Sektoren-/Felder-Zählung ändern sie sich
   nicht, wenn ein Produkt Bereiche mitbringt oder weglässt. `SCHALEN_STAND`
   trägt zusätzlich eine eigene Wächterpflicht: `tools/standzahl-frei-pruefen.js`
   vergleicht dieselbe Zahl über vier Trägerdateien (`sw.js`, `vivodepot.html`,
   `STANDARDS.md`, `docs/faktenbasis.md`) gegen offene Zweige, um eine doppelt
   beanspruchte Versionsnummer zu finden — ein Grund mehr, diesen Satz stehen
   zu lassen, auch wenn die Zeile daneben verschwindet.

   NICHT ERZEUGT: die Krypto-Zahlen in `SOVEREIGNTY.md` und `STANDARDS.md`
   und die axe-Sichten in `docs/konformitaet-quellen.md`. Sie stehen MITTEN IM
   SATZ („PBKDF2 mit 600 000 Iterationen, AES-256-GCM, Krypto-Version 3 …"),
   und ein Marker mitten in einem Satz macht das Dokument für den Leser
   kaputt, um es für die Maschine lesbar zu machen. Sie werden von Hand
   nachgezogen und vom Aussagen-Prüfer bewacht — der Unterschied ist, dass
   der Prüfer sie ab jetzt SIEHT, und das war vorher nicht so.

   DIE SUITE-ZAHL IST DER TEURE SLOT. Sie verlangt einen vollen `npm test`-Lauf.
   Ohne `--mit-suite` bleibt sie UNGEMESSEN und wird nicht angefasst — nie
   stillschweigend als „passt" gezählt, dieselbe Regel wie im Briefing-Prüfer.

   Aufruf:
     node tools/build-standzahlen.js schreibt (ohne Suite-Zahl)
     node tools/build-standzahlen.js --mit-suite schreibt auch die Suite-Zahl
     node tools/build-standzahlen.js --check meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { suiteDateien } = require('../scripts/suite-dateien-kern.js');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const MIT_SUITE = argv.includes('--mit-suite');

const BEGIN = '<!-- STANDZAHLEN:BEGIN — erzeugt von tools/build-standzahlen.js; Quelle: vivodepot.html -->';
const ENDE = '<!-- STANDZAHLEN:END -->';

function standMessen() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const zahl = (re) => { const m = re.exec(kern); return m ? Number(m[1]) : null; };
  let felder = 0, unterfelder = 0;
  /* Kampagne „eine Leseart statt dreiundvierzig", Zug 2 (09.09.2026) — `bereicheAlle()`
     statt der Buendel-Liste: ein AB WERK gesaeter Bereich steht nicht im Buendel und fiele
     sonst aus diesem Artefakt. Der Drift-Waechter wuerde das melden und anbieten, den
     Ausgabestand neu zu backen — was die Auslassung einfriert statt sie zu beheben.
     Die Felder selbst schreibt seit dem 11.09.2026 kein Dokument mehr — standMessen()
     bleibt trotzdem die Messung, die Zug 2 direkt braucht. */
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) { felder++; unterfelder += (f.unterFelder || []).length; }
    }
  }
  return {
    sektoren: V.bereicheAlle().length,
    felder, unterfelder,
    anlaesse: (V.ANLAESSE || []).length,
    wizards: Object.keys(V.WIZARDS || {}).length,
    situationen: (V.SITUATIONEN || []).length,
    schema: zahl(/const SCHEMA_VERSION_AKTUELL = (\d+);/),
    schale: zahl(/const SCHALEN_STAND = 'v(\d+)'/),
  };
}
function suiteMessen() {
  if (!MIT_SUITE) return null;
  // U2-ADR-228: explizite Dateiliste aus `git ls-files`, wie in
  // `tools/faktenbasis-erzeugen.js` — dieselbe Begründung, derselbe Weg, und
  // dasselbe Feld (`tests`, die Gesamtzahl, nicht `pass`, das einen roten
  // Lauf verschweigt statt ihn zu zeigen).
  const { execFileSync } = require('node:child_process');
  const dateien = suiteDateien(REPO);
  let roh = '';
  try { roh = execFileSync('node', ['--test', ...dateien], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { roh = (e.stdout || '') + (e.stderr || ''); }
  const m = /^ℹ tests (\d+)$/m.exec(roh);
  return m ? Number(m[1]) : null;
}

/* Nur noch Schema-Version/SCHALEN_STAND — die Sektoren-/Felder-/Unterfelder-/Anlässe-/
   Wizards-/Situationen-Zählung ist mit der Ansage vom 11.09.2026 entfallen (s. Kopf). */
function versionsBlock(s) {
  return [
    BEGIN,
    'Schema-Version ' + s.schema + ', `SCHALEN_STAND` v' + s.schale + '.',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('STANDZAHLEN-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const s = standMessen();
  const drift = [];

  /* UMLENKBAR (`--standards <pfad>`) — die stehende Schreibregel für Prüfwerkzeuge verlangt
     den Gegenstand als Argument. Ohne sie liesse sich der Rot-Beleg zu diesem Gate nur führen,
     indem man die echte Auslieferungsdatei verbiegt. */
  const i = argv.indexOf('--standards');
  const sp = (i >= 0 && argv[i + 1]) ? path.resolve(argv[i + 1]) : path.join(REPO, 'STANDARDS.md');
  const q = fs.readFileSync(sp, 'utf8');
  const neu = regionErsetzen(q, versionsBlock(s), 'STANDARDS.md');
  if (neu !== q) { drift.push('STANDARDS.md (Interner Versionsstand)'); if (!CHECK) fs.writeFileSync(sp, neu); }

  const suite = suiteMessen();
  const kp = path.join(REPO, 'docs', 'konformitaet-quellen.md');
  if (suite != null) {
    const kq = fs.readFileSync(kp, 'utf8');
    const kneu = kq.replace(/\| \*\*Behavior-Suite\*\* \| \d[\d.]* Tests grün \|/,
      '| **Behavior-Suite** | ' + suite.toLocaleString('de-DE') + ' Tests grün |');
    if (kneu !== kq) { drift.push('docs/konformitaet-quellen.md (Suite-Zahl)'); if (!CHECK) fs.writeFileSync(kp, kneu); }
  }

  if (CHECK) {
    if (drift.length) {
      console.error('build-standzahlen: DRIFT — ' + drift.join(' · '));
      console.error('  Abhilfe: node tools/build-standzahlen.js');
      process.exit(1);
    }
    console.log('build-standzahlen: kein Drift.'
      + (suite == null ? ' Suite-Zahl UNGEMESSEN (ohne --mit-suite) — nicht beurteilt.' : ''));
    return;
  }
  console.log('build-standzahlen: Schema ' + s.schema + ', Schale v' + s.schale
    + (suite == null ? ' — Suite-Zahl UNGEMESSEN (ohne --mit-suite), nicht angefasst.' : ', Suite ' + suite)
    + (drift.length ? ' — geändert: ' + drift.join(' · ') : ' — nichts zu tun.'));
}

if (require.main === module) main();
module.exports = { standMessen, versionsBlock, regionErsetzen, BEGIN, ENDE };
