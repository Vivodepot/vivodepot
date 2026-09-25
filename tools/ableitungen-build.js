#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ableitungen-build.js — EIN Befehl für alle vier abgeleiteten Träger
   („der vierte Träger", 07.09.2026, Anordnung: „fixen —
   verbrennt Tokens, blockiert uns")
   ────────────────────────────────────────────────────────────────────────────
   Vier Trägerdateien hängen mechanisch am Kern und müssen nach jeder Kern-Änderung
   nachgezogen werden: `STANDARDS.md` (build-standzahlen, seit 11.09.2026 nur noch
   Schema-Version/SCHALEN_STAND — s. Nachtrag unten), `docs/adr/README.md`
   (adr-readme-erzeugen), das SBOM (sbom-pflegen), `docs/faktenbasis.md`
   (faktenbasis-erzeugen). Drei sind billig (Sekunden). Der vierte fährt in seiner
   Voreinstellung einen echten `node --test`-Lauf (~50 s) für eine einzige Zahl (die
   gemessene Suite-Größe) — an einem Vormittag dreimal vergessen, weil niemand einen
   50-Sekunden-Befehl "mal eben" mitlaufen lässt. `--ohne-suite`
   (`tools/faktenbasis-erzeugen.js`) macht den vierten Träger genauso billig wie die
   anderen drei, ohne die Suite-Zahl zu raten oder auf Null zu setzen.

   NACHTRAG 11.09.2026 („Standzahlen raus"): `build-standzahlen`
   schrieb bis zu diesem Tag zusätzlich den Block „Umfang der Erhebung" (Sektoren/
   Felder/Unterfelder/Anlässe/Wizards/Situationen) in `STANDARDS.md`. Die Ansage nahm genau diesen Block raus — er behauptete einen Umfang für GENAU EINE
   Zusammensetzung (ab Werk). Geblieben, und weiterhin hier als billiger Träger
   geführt: Schema-Version/`SCHALEN_STAND` (Abschnitt „Interner Versionsstand") —
   Tatsachen über einen Build, keine Zusicherung über eine Zusammensetzung, und
   `SCHALEN_STAND` trägt zudem die eigene Wächterpflicht aus
   `tools/standzahl-frei-pruefen.js` (Kollision offener Zweige auf derselben Zahl).

   WAS DIESES WERKZEUG NICHT IST: kein Hook, der eine Drift selbst repariert. Der
   pre-commit/pre-push-Hook ruft weiterhin nur die vier `--check`-Varianten auf und
   meldet rot — ein Gate, das den Mangel behebt statt ihn zu melden, verliert seinen
   Zweck (ausdrückliche Auflage dieses Auftrags). `ableitungen:build` ist das
   Werkzeug, das ein Mensch VOR dem Commit von Hand ruft, um alle vier auf einen
   Schlag nachzuziehen — dieselbe Rolle, die die einzelnen "Beheben mit: …"-Sätze in
   den Fehlermeldungen schon immer hatten, nur für alle vier in einem Befehl.

   ZWEITER DURCHLAUF, NICHT NUR EINER: nach dem Bau wird JEDER der vier Träger erneut
   geprüft (`--check`), nicht nur die, deren Bau-Schritt einen Fehler warf. Ein
   Träger, der von einem ANDEREN abhängt (z. B. faktenbasis.md liest den ADR-Bestand,
   den adr-readme-erzeugen gerade verändert haben könnte), darf nicht durchrutschen,
   nur weil sein EIGENER Bau-Aufruf ohne Fehler zurückkam — der Bau-Aufruf beweist,
   dass ER lief, nicht, dass danach nichts mehr driftet.
   ════════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Echter Unterprozess-Aufruf — der Standard-Ausführer für main(). Tests injizieren einen
   eigenen `ausfuehren`, damit der Rot-Beweis (ein Träger driftet auch nach dem Bau weiter)
   nicht vier echte, teils langsame Unterprozesse braucht. */
function schrittAusfuehren(cmd) {
  try {
    execFileSync(cmd[0], cmd.slice(1), { cwd: REPO, stdio: 'pipe', encoding: 'utf8' });
    return { ok: true, ausgabe: '' };
  } catch (e) {
    return { ok: false, ausgabe: ((e.stdout || '') + (e.stderr || '')).toString() };
  }
}

/* Baut jeden Schritt, prüft DANACH ALLE erneut (s. Kopfkommentar „ZWEITER DURCHLAUF").
   Rein — `ausfuehren` ist die einzige Seiteneffekt-Quelle, austauschbar für Tests. */
function ableitungenBauen(schritte, ausfuehren) {
  const lauf = ausfuehren || schrittAusfuehren;
  const bauFehler = [];
  for (const schritt of schritte) {
    const erg = lauf(schritt.bau);
    if (!erg.ok) bauFehler.push({ name: schritt.name, phase: 'Bau', ausgabe: erg.ausgabe });
  }
  const driftFehler = [];
  for (const schritt of schritte) {
    const erg = lauf(schritt.check);
    if (!erg.ok) driftFehler.push({ name: schritt.name, phase: 'Check nach Bau', check: schritt.check, ausgabe: erg.ausgabe });
  }
  return { ok: bauFehler.length === 0 && driftFehler.length === 0, bauFehler, driftFehler };
}

const SCHRITTE = Object.freeze([
  { name: 'build-standzahlen', bau: ['node', 'tools/build-standzahlen.js'], check: ['node', 'tools/build-standzahlen.js', '--check'] },
  { name: 'adr-readme-erzeugen', bau: ['node', 'tools/adr-readme-erzeugen.js'], check: ['node', 'tools/adr-readme-uebereinstimmung.js'] },
  { name: 'sbom-pflegen', bau: ['node', 'tools/sbom-pflegen.js'], check: ['node', 'tools/sbom-pflegen.js', '--check'] },
  { name: 'faktenbasis-erzeugen', bau: ['node', 'tools/faktenbasis-erzeugen.js', '--ohne-suite'], check: ['node', 'tools/faktenbasis-erzeugen.js', '--check'] },
]);

function letzteZeilen(text, n) {
  return text.trim().split('\n').slice(-n).join('\n  ');
}

function main() {
  const { ok, bauFehler, driftFehler } = ableitungenBauen(SCHRITTE);
  for (const f of bauFehler) {
    console.error('ableitungen:build — ' + f.name + ' (Bau) ist gescheitert:');
    console.error('  ' + letzteZeilen(f.ausgabe, 5));
  }
  for (const f of driftFehler) {
    console.error('ableitungen:build — ' + f.name + ' driftet WEITERHIN nach dem Bau — Abhilfe: '
      + f.check.join(' ') + ' zeigt die Einzelheit:');
    console.error('  ' + letzteZeilen(f.ausgabe, 5));
  }
  if (!ok) {
    console.error('ableitungen:build ROT — ' + (bauFehler.length + driftFehler.length) + ' Fund(e), s. o.');
    process.exit(1);
  }
  console.log('ableitungen:build: alle vier Träger aktuell (build-standzahlen, adr-readme-erzeugen, sbom-pflegen, faktenbasis-erzeugen --ohne-suite).');
}

if (require.main === module) main();
module.exports = { ableitungenBauen, schrittAusfuehren, SCHRITTE };
