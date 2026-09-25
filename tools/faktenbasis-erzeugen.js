#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   faktenbasis-erzeugen.js — „Die Faktenbasis — und STANDARDS.md als
   erstes Dokument" (13.08.2026), Zug 1.
   ────────────────────────────────────────────────────────────────────────────
   Anlass: das Audit vom 13.08. fand 26 von 34 geprüften Zitaten in STANDARDS.md/
   INTEROPERABILITY.md falsch — u. a. fünf ADR-Nummern, die auf themenfremde ADRs
   zeigten. Ein von Hand gepflegtes Nachweisdokument verfällt genau so. Diese
   Datei wird ERZEUGT, nicht geschrieben: jede Zahl/jeder Name kommt aus dem
   geladenen Kern (`tests/load-kern.js`) oder direkt aus `vivodepot.html`/
   `docs/adr/*.md` — nie aus einem Kommentar, nie aus dem Gedächtnis.

   STANDARD-BELEGE SIND MECHANISCH, NICHT HANDKURATIERT: für jeden Export-
   Erzeuger wird dessen tatsächlicher Funktionskörper (`fn.toString()`) nach
   Versions-/Profil-Literalen durchsucht (VERSION:-Zeilen für vCard/iCalendar,
   FHIR-`StructureDefinition`-Profil-URLs, SD-JWT `vct`-Kennungen). Was dort
   nicht auftaucht, wird als „kein Versions-/Profil-Marker im Code gefunden"
   ausgewiesen — nicht erfunden.

   `--check`: schreibt nichts, meldet Drift (Exit 1) — für den Wächter/Hook.
   Ohne Flag: schreibt `docs/faktenbasis.md` neu, mit Erzeugungsdatum + Commit.

   `--ausgabe <pfad>`: schreibt/prüft dort statt `docs/faktenbasis.md` — stehende Regel „Prüf-
   werkzeuge nehmen den zu prüfenden Gegenstand als Argument". Für die eigene Testsuite: ein
   Rot-Beweis auf einer Temp-Datei mutiert nicht die committete docs/faktenbasis.md, die eine
   parallel laufende zweite Testdatei im selben Suite-Lauf gleichzeitig lesen könnte.

   `--ohne-suite` (07.09.2026, „der vierte Träger"): schreibt wie ohne Flag,
   überspringt aber den ~50s-`node --test`-Lauf, der die Suite-Zahl mißt — der einzige teure
   Teil dieser Datei, drei Vergessens-Vorfälle an einem Vormittag. Die Suite-Zahl wird dabei
   NICHT geraten und NICHT auf Null gesetzt: die bestehende Zeile aus der aktuellen `AUSGABE`-
   Datei wird wörtlich übernommen (s. `main()`). Bricht ab, wenn die Datei noch gar nicht
   existiert oder keine Suite-Zeile trägt — ein erster Lauf braucht einmal den echten, teuren
   Weg (ohne `--ohne-suite`), danach trägt jede Fortschreibung die zuletzt gemessene Zahl
   weiter. `npm run ableitungen:build` (`tools/ableitungen-build.js`) nutzt diesen Modus für
   alle vier Träger in einem Befehl.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execSync, execFileSync } = require('node:child_process');
const { suiteDateien } = require('../scripts/suite-dateien-kern.js');

const REPO = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const OHNE_SUITE = process.argv.includes('--ohne-suite');
const AUSGABE_ARG_INDEX = process.argv.indexOf('--ausgabe');
const AUSGABE = AUSGABE_ARG_INDEX !== -1 ? path.resolve(process.argv[AUSGABE_ARG_INDEX + 1]) : path.join(REPO, 'docs', 'faktenbasis.md');

/* Der Commit, gegen den diese Zahlen gemessen wurden — MIT der Angabe, ob er ueberhaupt
   auffindbar bleibt. `git rev-parse HEAD` liefert den Arbeitsstand; wird der spaeter rebast,
   zeigt die Zeile ins Leere (gefunden 16.09.2026: `ebbc319a` stand in docs/faktenbasis.md und lag
   auf keinem Remote-Zweig). Ein Verweis, dem niemand folgen kann, ist schlimmer als keiner: er
   sieht aus wie ein Weg zum Nachsehen. Darum sagt die Zeile jetzt dazu, dass der Stand noch
   nicht gepusht ist — nach dem Landen schreibt der naechste Lauf den gelandeten Commit. */
function commitErreichbar(hash) {
  try {
    const raus = execSync('git branch -r --contains ' + hash, { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] });
    return raus.toString().trim() !== '';
  } catch (_) { return false; }
}

function commitHash() {
  let hash;
  try { hash = execSync('git rev-parse --short HEAD', { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch (_) { return '(kein Git-Commit ermittelbar)'; }
  return commitErreichbar(hash) ? hash : hash + ' (Arbeitsstand, noch nicht gepusht)';
}

function versionsBelegeAusFunktion(fn) {
  if (typeof fn !== 'function') return [];
  const src = fn.toString();
  const belege = new Set();
  for (const m of src.matchAll(/VERSION:([\d.]+)/g)) belege.add('VERSION:' + m[1]);
  for (const m of src.matchAll(/https?:\/\/[\w.-]+\/fhir\/[^\s'"]*StructureDefinition\/[\w-]+/g)) belege.add(m[0]);
  for (const m of src.matchAll(/vct:\s*['"]([^'"]+)['"]/g)) belege.add('vct:' + m[1]);
  for (const m of src.matchAll(/resourceType:\s*['"]([^'"]+)['"]/g)) belege.add('resourceType:' + m[1]);
  return [...belege];
}

// Erzeugerfunktions-NAME aus der lebenden `baue`-Closure lesen (nicht aus dem Registry-Text) —
// `def.baue.toString()` liefert z. B. "(opt) => vcardMenschen(opt)"; der aufgerufene Bezeichner
// ist der Erzeuger. Trifft das Muster nicht (komplexere Closure), bleibt der rohe Quelltext stehen.
function erzeugerName(baueFn) {
  const src = (baueFn || '').toString();
  const m = src.match(/=>\s*([A-Za-zÄÖÜäöüß_][\w]*)\s*\(/);
  return m ? m[1] : src.replace(/\s+/g, ' ').slice(0, 60);
}

// Import-Parser sind KEINE einfachen Wrapper wie `baue` — der Funktionskörper parst erst den
// Rohtext und mappt danach auf Felder (z. B. "(text) => { const o = _jsonParse(text); return
// { felder: _fhirIpsFelder(o) }; }"). Der eigentliche Parser ist die erste Funktion, die MIT
// `text` als Argument aufgerufen wird — jeder Import-Parser folgt dieser Konvention.
function importErzeugerName(parseFn) {
  if (typeof parseFn !== 'function') return '(kein Parser hinterlegt)';
  const src = parseFn.toString();
  const m = src.match(/([A-Za-zÄÖÜäöüß_][\w]*)\(text\)/);
  if (m) return m[1];
  if (/^\(\)\s*=>\s*null\s*$/.test(src.trim())) return '(kein Import-Pfad — Funktion liefert stets null)';
  return src.replace(/\s+/g, ' ').slice(0, 60);
}

// NACHTRAG (07.09.2026, Fund von `51` beim Poster-Bau): `importErzeugerName` mißt AUSSCHLIESSLICH
// an `parse` entlang — für zwei registrierte Formate ist das irreführend, nicht nur ungenau, weil ein
// echter Import-WEG existiert, den ein anderes Feld trägt, nicht `parse`:
//   `autoritativDoc: true` (heute nur `fhir-lab`) — `parse` liefert bewusst `() => null` (reine
//   Absicherung, falls je regulär aufgerufen); der eigentliche Import läuft über den ABLAGE-Zweig
//   `flowImportAutoritativ`, ausgelöst durch `def.autoritativDoc` selbst (vivodepot.html, zwei
//   Aufrufer). Der Import legt ab, statt Felder zu ziehen — er FINDET trotzdem statt.
//   `felderAusClaims` (heute nur `provider-credential`, `fachpfad: true`) — trägt GAR KEIN `parse`-
//   Feld, sondern eine eigene Funktion mit demselben Zweck (geprüfte Nutzlast auf Felder abbilden,
//   s. `def.felderAusClaims(nutzlast)`-Aufruf im Kern). `importErzeugerName(undefined)` meldete bislang
//   "(kein Parser hinterlegt)" — dieselbe Verwechslung von „anderer Name" mit „keiner da".
// `importErzeugerName` selbst bleibt unverändert (eigene, geprüfte Ein-Funktions-Kontrakt, s.
// tests/faktenbasis-erzeugen.test.js) — diese Funktion davor geschaltet, mit dem GANZEN `def`, nicht
// nur `def.parse`, damit beide Wege VOR der "kein Import-Pfad/kein Parser"-Behauptung geprüft werden.
function importWegBeschreiben(def) {
  if (typeof def.felderAusClaims === 'function') {
    return 'felderAusClaims (fachpfad — kein `parse`, geprüfte Nutzlast wird direkt auf Felder abgebildet, s. Kommentar in vivodepot.html)';
  }
  if (def.autoritativDoc && typeof def.parse === 'function' && /^\(\)\s*=>\s*null\s*$/.test(def.parse.toString().trim())) {
    return 'flowImportAutoritativ (autoritativDoc — Ablage-Zweig statt Feld-Vorschau; `parse` liefert bewusst null, reine Absicherung)';
  }
  return importErzeugerName(def.parse);
}

function formatEintrag(V, def, istImport) {
  const erzeuger = istImport ? importWegBeschreiben(def) : erzeugerName(def.baue);
  const fn = istImport ? (def.parse || null) : (V[erzeuger] || null);
  return {
    id: def.id,
    erzeuger,
    mime: def.mime || null,
    endung: def.endung || null,
    sektor: def.sektor || null,
    kategorie: def.kategorie || null,
    nurExport: !!def.nurExport,
    nurImport: !!def.nurImport,
    ohneAuswahl: !!def.ohneAuswahl,
    versionsBelege: versionsBelegeAusFunktion(fn),
  };
}

function zaehleFelder(sektor) {
  let felder = 0, unterfelder = 0;
  for (const sek of sektor.sektionen || []) {
    for (const f of sek.felder || []) {
      felder++;
      if (Array.isArray(f.unterFelder)) unterfelder += f.unterFelder.length;
    }
  }
  return { felder, unterfelder };
}

// Die Nummer kommt aus dem DATEINAMEN, nicht aus der ersten Zeile — der Bestand trennt Nummer
// und Titel mit drei verschiedenen Zeichen (":", "·", "—"), teils mit "-Nachtrag"-Suffix an der
// Nummer selbst. Der Dateiname ist der stabile Anker; der Titel wird davon befreit, egal welcher
// Trenner benutzt wurde. Nur Dateien, deren NAME ein "U2-ADR-<Zahl>" trägt, zählen als ADR — das
// schließt README.md automatisch aus, ohne sie namentlich zu nennen. (Die frühere U2-INDEX-Datei
// traf dasselbe Muster nie und ist seit 15.08.2026 ohnehin kein Bewohner von docs/adr/ mehr.)
function adrRegister() {
  const ordner = path.join(REPO, 'docs', 'adr');
  const dateien = fs.readdirSync(ordner).filter((f) => f.endsWith('.md') && /U2-ADR-\d+/.test(f));
  const eintraege = [];
  for (const datei of dateien) {
    const text = fs.readFileSync(path.join(ordner, datei), 'utf8');
    const erstZeile = (text.split('\n', 1)[0] || '').trim();
    const nummerAusDatei = (datei.match(/U2-ADR-(\d+)/) || [])[1];
    const nummer = 'U2-ADR-' + nummerAusDatei;
    let titel = erstZeile.replace(/^#\s*/, '');
    titel = titel.replace(/^U2-ADR-\d+(-Nachtrag)?\s*[:·—]\s*/i, '');
    if (!titel) titel = '(kein Titel in erster Zeile — ' + datei + ')';
    eintraege.push({ nummer, titel, datei });
  }
  eintraege.sort((a, b) => {
    const na = parseInt((a.nummer.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.nummer.match(/\d+/) || ['0'])[0], 10);
    if (na !== nb) return na - nb;
    return a.datei.localeCompare(b.datei);
  });
  return eintraege;
}

function pruefebeneZahlen(htmlText) {
  // Suite-Zahl: NICHT mechanisch gezählt — ein mechanischer `test(`-Zähler über tests/*.test.js
  // ergab beim ersten Lauf 3539, der echte Lauf 3649 (Differenz 110). Grund: einzelne Dateien
  // erzeugen mehrere Tests pro Schleifendurchlauf aus EINEM `test(`-Aufruf im Quelltext (z. B.
  // tests/s4-begriffsliste-wortlaut.test.js). Ein Zähler, der genau die Zahl liefert, an der die
  // fünf falschen ADR-Zitate gescheitert sind, darf selbst nicht mechanisch-falsch sein — darum
  // hier der ECHTE `node --test`-Lauf (~50 s), dessen TAP-Summenzeile geparst wird.
  //
  // NICHT in --check: dieses Werkzeug hat einen eigenen Test (tests/faktenbasis-aktualitaet.
  // test.js), der TEIL der Suite ist, die hier gestartet würde — ein echter Lauf während --check
  // riefe sich selbst rekursiv auf (jeder verschachtelte Lauf enthält wieder den --check-Test).
  // Darum bleibt suiteZahl in --check unermittelt; main() nimmt die Suite-Zeile deshalb aus dem
  // Drift-Vergleich aus, genau wie Erzeugungsdatum und Commit. Nur ein echter, freistehender Lauf
  // (`node tools/faktenbasis-erzeugen.js`, ohne --check) schreibt die Zahl in die Datei.
  let suiteZahl = null;
  let suiteHinweis = null;
  if (CHECK) {
    suiteHinweis = 'in --check nicht ermittelt (Rekursionsschutz, s. Kommentar in tools/faktenbasis-erzeugen.js)';
  } else if (OHNE_SUITE) {
    // Vor der `--ausgabe`-Abfrage geprüft: `--ohne-suite` ist eine explizite Anweisung, die auch
    // dann gilt, wenn zugleich `--ausgabe` gesetzt ist (s. tests/faktenbasis-ohne-suite.test.js).
    // Der Platzhalter hier verlässt diese Funktion nie unverändert — main() ersetzt die Zeile
    // durch die bestehende aus der aktuellen Datei, oder bricht ab, wenn keine da ist.
    suiteHinweis = 'in --ohne-suite nicht neu gemessen — bestehende Zeile wird übernommen, s. main()';
  } else if (AUSGABE_ARG_INDEX !== -1) {
    // `--ausgabe` gesetzt heißt: die eigene Testsuite ruft hier auf (s. Kommentar oben an der
    // Definition von AUSGABE) — der ~50s-Lauf träfe nur die Geschwindigkeit der Suite selbst,
    // nicht die Richtigkeit des Prüfmechanismus, den diese Läufe belegen sollen.
    suiteHinweis = 'in Testläufen (--ausgabe gesetzt) nicht ermittelt, s. Kommentar';
  } else {
    // U2-ADR-228: explizite Dateiliste aus `git ls-files`, nicht Nodes eigene
    // Muster-Suche — sonst zählt ein gitignorierter, nie committeter Testfund
    // im Arbeitsbaum mit, den ein frischer Checkout nicht kennt (s. ADR).
    const dateien = suiteDateien(REPO);
    try {
      const out = execFileSync('node', ['--test', ...dateien], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const m = out.match(/^ℹ tests (\d+)$/m);
      if (m) suiteZahl = parseInt(m[1], 10); else suiteHinweis = 'Lauf ausgeführt, aber Summenzeile nicht gefunden';
    } catch (e) {
      const out = (e.stdout || '').toString();
      const m = out.match(/^ℹ tests (\d+)$/m);
      if (m) suiteZahl = parseInt(m[1], 10); else suiteHinweis = 'Lauf fehlgeschlagen, nicht ermittelbar';
    }
  }
  let e2eZahl = 0;
  let e2eSchleifenZuwachs = 0;
  const e2eDir = path.join(REPO, 'tests', 'e2e');
  // U2-ADR-372 (08.09.2026): eine Schleife kann auch über einen BENANNTEN Import laufen statt
  // über ein Inline-Array (`for (const p of PRODUKTE)`, keine `[...]`-Literale im Schleifenkopf).
  // Die Länge kommt aus der echten Quelle, nicht aus einer zweiten, hier erfundenen Zahl.
  let produkteLaenge = null;
  try { produkteLaenge = require(path.join(REPO, 'tools', 'lib', 'vier-produkte.js')).PRODUKTE.length; } catch (_) { produkteLaenge = null; }
  if (fs.existsSync(e2eDir)) {
    for (const datei of alleTestDateien(e2eDir, true)) {
      const text = fs.readFileSync(datei, 'utf8');
      // test.fail(...) zählt mit (U2-ADR-222, 02.09.2026, erster Rot-Beweis dieser Form im
      // E2E-Bestand) — Playwright führt ihn genauso aus, nur mit umgekehrter Erwartung.
      e2eZahl += (text.match(/^\s*test(?:\.fail)?\(/gm) || []).length;
      /* A423 (21.08.2026): EIN `test(`-AUFRUF IST NICHT EIN TEST. Vier Aufrufe stehen in
         `for`-Schleifen über zwei CPU-Drosselungen und erzeugen je ZWEI Tests — Playwright
         führt darum 183 aus, wo hier 179 gezählt werden.

         DAS WAR DIE „SCHWANKUNG", DIE A423 GEMELDET HAT, und sie war keine: die Differenz ist
         konstant und erklärbar. Sie wird hier MITGEZÄHLT und in der Zeile ausgewiesen, damit die
         zwei Zahlen nicht als Widerspruch weiterwandern (§7.6 — wer zwei Zahlen nebeneinander
         stellt, sagt, dass beide dasselbe zählen). */
      // Klammerbalance statt Spalten-0-Anker (U2-ADR-372, 08.09.2026): eine Schleife kann
      // eingerückt in einem describe()-Block stehen, nicht nur auf oberster Ebene.
      const kopfRegex = /^\s*for \([^)]*\)\s*\{/gm;
      let kopfTreffer;
      while ((kopfTreffer = kopfRegex.exec(text))) {
        const kopf = kopfTreffer[0];
        const inlineWerte = (kopf.match(/\[([^\]]*)\]/) || [])[1];
        const n = inlineWerte ? inlineWerte.split(',').length
          : (/of\s+PRODUKTE\s*\)/.test(kopf) ? produkteLaenge : null);
        if (!n) continue;
        let tiefe = 1;
        let i = kopfTreffer.index + kopf.length;
        while (tiefe > 0 && i < text.length) {
          if (text[i] === '{') tiefe++; else if (text[i] === '}') tiefe--;
          i++;
        }
        const drin = text.slice(kopfTreffer.index + kopf.length, i - 1);
        e2eSchleifenZuwachs += ((drin.match(/^\s*test\(/gm) || []).length) * (n - 1);
      }
    }
  }
  let waechterZahl = 0;
  let waechterHinweis = null;
  try {
    const { REGISTER } = require(path.join(REPO, 'tools', 'waechter-register.js'));
    waechterZahl = REGISTER.length;
  } catch (e) {
    // Ein FEHLEN darf kein Wert werden (21.09.2026): ohne node_modules ließ sich das Register nicht laden, der Fehler wurde
    // verschluckt, und die Datei bekam den Wert „nicht ermittelbar". --check meldete dann nur „weicht vom Kern ab" und
    // nannte weder die Zeile noch den Grund. Jetzt bleibt der Grund an der Zeile stehen, und --check trennt sie vom Unterschied.
    waechterZahl = null;
    waechterHinweis = String((e && e.message) || e).split('\n')[0].slice(0, 120);
  }
  return { suiteZahl, suiteHinweis, e2eZahl, e2eSchleifenZuwachs, waechterZahl, waechterHinweis };
}

function alleTestDateien(dir, nurSpec) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'e2e' || nurSpec) out.push(...alleTestDateien(abs, nurSpec)); continue; }
    if (nurSpec ? e.name.endsWith('.spec.js') : e.name.endsWith('.test.js')) out.push(abs);
  }
  return out;
}

/* ── Gestaltung („Faktenbasis-Design", Zug 2, 14.08.2026) ────────────────────────
   Anlass: der Design-System-Abgleich vom 14.08. fand 114 von 185 geprüften Design-Angaben
   abweichend — dasselbe Drift-Muster wie bei STANDARDS.md/INTEROPERABILITY.md, nur beim
   Design-System-Dokument (`Vivodepot-intern`). DESIGN_KLASSEN ist eine HANDKURATIERTE
   Namensliste — welche Klassen zu den in Design-System-Abschnitt 6 benannten Komponenten
   gehören, ist keine mechanisch ableitbare Frage (der Dokument-Name UND der Code-Name können
   auseinanderlaufen, genau das ist der `.btn-primary`-Befund). Die WERTE je Name sind es: jede
   Deklaration und jede Verwendungszahl kommt aus dem Stylesheet/Markup selbst, nichts wird
   zugeschrieben oder bewertet. */
const DESIGN_KLASSEN = Object.freeze([
  'btn', 'btn-sek', 'btn-dezent', 'btn-klein', 'btn-notfall', 'btn-mini',
  'karte', 'modal', 'toast', 'banner-stapel', 'topbar', 'sidebar',
  'leer', 'pause-erlaubnis', 'hinweis-box',
]);

// Grenze für einen Klassennamen: weder rechts noch links ein Wort-/Bindestrich-Zeichen, sonst
// verwechselt ".btn" mit ".btn-sek" (Substring-Treffer) — genau der Fehler, den ein einfaches
// `\b`-Wortgrenzen-Regex hätte: "-" ist selbst kein Wortzeichen, \b sähe an "btn|-sek" trotzdem
// eine Grenze und zählte "btn-sek" fälschlich auch als "btn".
function _klassenGrenzeRegex(name, praefix) {
  const sicher = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp((praefix || '') + '(?<![\\w-])' + sicher + '(?![\\w-])', 'g');
}

// Liest je Klassenname (a) jede CSS-Regel, deren Selektor die Klasse nennt, mit ihrer vollen
// Deklaration, und (b) wie oft der Klassenname AUSSERHALB des <style>-Blocks vorkommt (Markup/
// JS-generiertes HTML) — der zweite Wert macht toten Code sichtbar (z. B. `.btn-notfall`,
// U2-ADR-078: Regel vorhanden, Verwendung 0).
function gestaltungsKlassen(htmlText, klassenNamen) {
  /* Anker über die Kennung `id="design-system"`, nicht über die Position (Fund 18.09.2026,
     Rahmen-Schutz-Nachtrag, vierter Fundort derselben Klasse nach Krypto-Block-Wächter und drei
     weiteren Style-Ankern): `<style[^>]*>` traf zuvor JEDES <style>-Element, auch ein
     zusätzliches, das vor dem eigentlichen Design-Stylesheet steht. Fällt kein Element mit
     dieser Kennung, bleibt der alte, ungebundene Treffer als Rückfall — für Fixtures/Proben in
     dieser Datei, die absichtlich ein schlichtes `<style>` ohne Kennung bauen. */
  const styleMatch = htmlText.match(/<style id="design-system">([\s\S]*?)<\/style>/)
    || htmlText.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const styleText = styleMatch ? styleMatch[1] : '';
  const ausserhalbStyle = styleMatch
    ? htmlText.slice(0, styleMatch.index) + htmlText.slice(styleMatch.index + styleMatch[0].length)
    : htmlText;
  const regeln = styleText.split('}').map((chunk) => {
    const teile = chunk.split('{');
    if (teile.length < 2) return null;
    return { selektoren: teile[0].trim(), deklaration: teile.slice(1).join('{').trim() };
  }).filter(Boolean);

  return klassenNamen.map((name) => {
    // Frisches Regex-Objekt JE PRÜFUNG, nicht wiederverwendet — ein einzelnes /g-Regex verschiebt
    // seinen `lastIndex` bei jedem .test()-Aufruf und würde bei mehreren Selektoren abwechselnd
    // Treffer verpassen (klassischer Stateful-Regex-Fehler, hier real aufgetreten: „.btn:hover"
    // fand nur die erste von zwei echten Regeln, bis dieser Kommentar den Fund festhielt).
    const treffer = regeln.filter((r) => _klassenGrenzeRegex(name, '\\.').test(r.selektoren));
    const deklarationen = treffer.map((r) =>
      r.selektoren.replace(/\s+/g, ' ') + ' { ' + r.deklaration.replace(/\s+/g, ' ') + ' }');
    const verwendungAusserhalbStyle = (ausserhalbStyle.match(_klassenGrenzeRegex(name)) || []).length;
    return { klasse: '.' + name, regelnGefunden: treffer.length, deklarationen, verwendungAusserhalbStyle };
  });
}

function kryptoFakten(htmlText) {
  const pbkdf2 = (htmlText.match(/PBKDF2_ITERATIONS\s*=\s*(\d+)/) || [])[1] || null;
  const aesGcm = /AES-256-GCM/.test(htmlText);
  return { pbkdf2Iterationen: pbkdf2, aes256Gcm: aesGcm };
}

function erzeugeFaktenbasis() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const htmlText = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

  const exportFormate = V.EXPORT_FORMATE.map((d) => formatEintrag(V, d, false));
  const importFormate = V.IMPORT_FORMATE.map((d) => formatEintrag(V, d, true));

  const sektoren = Object.values(V.SEKTOR_BY_ID || {});
  let felderGesamt = 0, unterfelderGesamt = 0;
  const sektorZeilen = sektoren.map((s) => {
    const { felder, unterfelder } = zaehleFelder(s);
    felderGesamt += felder; unterfelderGesamt += unterfelder;
    return { id: s.id, label: s.label, felder, unterfelder };
  });

  const anlaesseZahl = Array.isArray(V.ANLAESSE) ? V.ANLAESSE.length : Object.keys(V.ANLAESSE || {}).length;
  const wizardsZahl = Array.isArray(V.WIZARDS) ? V.WIZARDS.length : Object.keys(V.WIZARDS || {}).length;
  const situationenZahl = Array.isArray(V.SITUATIONEN) ? V.SITUATIONEN.length : Object.keys(V.SITUATIONEN || {}).length;

  const adr = adrRegister();
  const pruefebene = pruefebeneZahlen(htmlText);
  const krypto = kryptoFakten(htmlText);
  const gestaltung = gestaltungsKlassen(htmlText, DESIGN_KLASSEN);

  return {
    erzeugtAm: new Date().toISOString().slice(0, 10),
    commit: commitHash(),
    exportFormate, importFormate,
    exportFormateZahl: exportFormate.length,
    importFormateZahl: importFormate.length,
    sektoren: sektorZeilen, sektorenZahl: sektoren.length,
    felderGesamt, unterfelderGesamt,
    anlaesseZahl, wizardsZahl, situationenZahl,
    krypto,
    schemaVersion: V.SCHEMA_VERSION_AKTUELL,
    kryptoVersion: V.CRYPTO_VERSION_AKTUELL,
    schalenStand: V.SCHALEN_STAND,
    buildVersion: V.BUILD_VERSION,
    jwsAlgPrimaer: V.JWS_ALG_PRIMAER, jwsAlgFallback: V.JWS_ALG_FALLBACK,
    pruefebene,
    adr, adrZahl: adr.length,
    gestaltung,
  };
}

function formatiereMarkdown(f) {
  let m = '';
  m += '# Faktenbasis — maschinell erzeugt, nicht von Hand gepflegt\n\n';
  m += '**Erzeugt am:** ' + f.erzeugtAm + ' · **Commit:** `' + f.commit + '` · **Werkzeug:** `tools/faktenbasis-erzeugen.js`\n\n';
  m += 'Jede Zahl hier stammt aus dem geladenen Kern (`vivodepot.html` via `tests/load-kern.js`) oder direkt aus dem Quelltext — nicht aus einem Kommentar, nicht aus dem Gedächtnis. Bei Abweichung schlägt `tests/faktenbasis-aktualitaet.test.js` an (`node tools/faktenbasis-erzeugen.js --check`).\n\n';
  m += '---\n\n## Export-Formate (' + f.exportFormateZahl + ')\n\n';
  m += '| Kennung | Erzeuger | MIME | Endung | Sektor | Flags | Versions-/Profil-Belege im Code |\n|---|---|---|---|---|---|---|\n';
  for (const d of f.exportFormate) {
    const flags = [d.nurExport && 'nurExport', d.ohneAuswahl && 'ohneAuswahl'].filter(Boolean).join(', ') || '—';
    const belege = d.versionsBelege.length ? d.versionsBelege.map((b) => '`' + b + '`').join(', ') : 'kein Versions-/Profil-Marker im Code gefunden';
    m += '| `' + d.id + '` | `' + d.erzeuger + '` | ' + (d.mime || '—') + ' | ' + (d.endung || '—') + ' | ' + (d.sektor || '—') + ' | ' + flags + ' | ' + belege + ' |\n';
  }
  m += '\n---\n\n## Import-Formate (' + f.importFormateZahl + ')\n\n';
  m += '| Kennung | Erzeuger | Sektor | Flags | Versions-/Profil-Belege im Code |\n|---|---|---|---|---|\n';
  for (const d of f.importFormate) {
    const flags = [d.nurImport && 'nurImport'].filter(Boolean).join(', ') || '—';
    const belege = d.versionsBelege.length ? d.versionsBelege.map((b) => '`' + b + '`').join(', ') : 'kein Versions-/Profil-Marker im Code gefunden';
    m += '| `' + d.id + '` | `' + d.erzeuger + '` | ' + (d.sektor || '—') + ' | ' + flags + ' | ' + belege + ' |\n';
  }
  m += '\n---\n\n## Sektoren, Felder, Unterfelder\n\n';
  m += '**' + f.sektorenZahl + ' Sektoren, ' + f.felderGesamt + ' Felder, ' + f.unterfelderGesamt + ' Unterfelder gesamt.**\n\n';
  m += '| Sektor | Label | Felder | Unterfelder |\n|---|---|---|---|\n';
  for (const s of f.sektoren) m += '| `' + s.id + '` | ' + s.label + ' | ' + s.felder + ' | ' + s.unterfelder + ' |\n';
  m += '\n**Anlässe:** ' + f.anlaesseZahl + ' · **Assistenten (Wizards):** ' + f.wizardsZahl + ' · **Situationen:** ' + f.situationenZahl + '\n\n';
  m += '---\n\n## Krypto\n\n';
  m += '- PBKDF2-Iterationen: ' + (f.krypto.pbkdf2Iterationen || 'nicht gefunden') + '\n';
  m += '- AES-256-GCM verwendet: ' + (f.krypto.aes256Gcm ? 'ja' : 'nicht gefunden') + '\n';
  m += '- JWS-Signatur primär: ' + f.jwsAlgPrimaer + ' · Fallback: ' + f.jwsAlgFallback + '\n';
  m += '- Krypto-Version: ' + f.kryptoVersion + '\n\n';
  m += '---\n\n## Prüfebene\n\n';
  m += '- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): ' + (f.pruefebene.suiteZahl ?? f.pruefebene.suiteHinweis) + '\n';
  m += '- E2E (Playwright): ' + f.pruefebene.e2eZahl + ' `test(`-Aufrufe in `tests/e2e/*.spec.js`'
    + ' + ' + f.pruefebene.e2eSchleifenZuwachs + ' aus Schleifen über CPU-Drosselungen = **'
    + (f.pruefebene.e2eZahl + f.pruefebene.e2eSchleifenZuwachs) + ' ausgeführte Tests**'
    + ' (mechanisch gezählt, nicht ausgeführt — die Differenz ist konstant, s. A423)\n';
  m += '- Wächter-Register (`tools/waechter-register.js`): ' + (f.pruefebene.waechterZahl ?? ('nicht ermittelbar' + (f.pruefebene.waechterHinweis ? ' (' + f.pruefebene.waechterHinweis + ')' : ''))) + '\n';
  m += '- Schema-Version: ' + f.schemaVersion + ' · SCHALEN_STAND: ' + f.schalenStand + ' · Build-Version: ' + f.buildVersion + '\n\n';
  m += '---\n\n## ADR-Register (' + f.adrZahl + ')\n\n';
  m += '| Nummer | Titel |\n|---|---|\n';
  for (const a of f.adr) m += '| ' + a.nummer + ' | ' + a.titel + ' |\n';
  m += '\n---\n\n## Gestaltung (' + f.gestaltung.length + ' Klassen)\n\n';
  m += 'Handkuratierte Namensliste (`DESIGN_KLASSEN` in `tools/faktenbasis-erzeugen.js`) — welche Klassen zu den Design-System-Komponenten gehören, ist keine mechanisch ableitbare Frage. Deklarationen und Verwendungszahl je Name sind mechanisch aus `vivodepot.html` gelesen, nicht zugeschrieben.\n\n';
  m += '| Klasse | Regeln im Stylesheet | Verwendung außerhalb des Stylesheets | Deklarationen |\n|---|---|---|---|\n';
  for (const g of f.gestaltung) {
    const deklarationen = g.deklarationen.length ? g.deklarationen.map((d) => '`' + d + '`').join('<br>') : '—';
    const totHinweis = (g.verwendungAusserhalbStyle === 0 && g.regelnGefunden > 0) ? ' (toter Code)' : '';
    m += '| `' + g.klasse + '` | ' + g.regelnGefunden + ' | ' + g.verwendungAusserhalbStyle + totHinweis + ' | ' + deklarationen + ' |\n';
  }
  return m;
}

// Zwei Zeilen sind aus dem Drift-Vergleich ausgenommen, nicht weil sie unwichtig wären, sondern
// weil ihre exakte Prüfung ihren eigenen Bau widerlegen würde: Erzeugungsdatum+Commit ändern sich
// bei jedem Lauf per Definition, und die Suite-Zahl wird in --check gar nicht erst ermittelt
// (s. Kommentar in pruefebeneZahlen — ein echter Lauf dort wäre rekursiv). Beide werden auf einen
// festen Platzhalter normalisiert, bevor verglichen wird.
function normalisiertFuerVergleich(text) {
  return text
    .replace(/\*\*Erzeugt am:\*\* [\d-]+ · \*\*Commit:\*\* `[^`]+`/, '**Erzeugt am:** DATUM · **Commit:** `COMMIT`')
    .replace(/^- Suite \(Node-Tests,.*$/m, '- Suite: ZAHL');
}

// Der BEFUND eines --check-Vergleichs, mit drei Ausgängen statt zwei (Spezifikation §36.1b, 21.09.2026):
//   gleich        die Datei stimmt mit dem Kern überein
//   abweichend    Zeilen unterscheiden sich — der Befund NENNT sie (nurDatei / nurNeu)
//   nicht messbar die Erzeugung konnte eine Angabe nicht ermitteln (`nicht ermittelbar`); das ist ein Ausfall der Messung,
//                 kein Unterschied im Inhalt, und es besteht NICHT — auch dann nicht, wenn die Datei dieselbe Zeile trägt
// Gemessen am 21.09.2026: in einem Arbeitsbaum ohne node_modules war das Wächter-Register nicht ladbar, die Zeile hieß
// „nicht ermittelbar", und --check meldete nur „weicht vom Kern ab", ohne Zeile und ohne Grund. Zwei Achsen mussten einzeln
// ausgeschlossen werden. Wer die Zeile kennt, weiß in einer Zeile, was los ist.
function vergleichsBefund(bisherig, neu) {
  const a = normalisiertFuerVergleich(bisherig);
  const b = normalisiertFuerVergleich(neu);
  const zeilenA = a.split('\n');
  const zeilenB = b.split('\n');
  const ungemessen = zeilenB.filter((z) => /nicht ermittelbar/.test(z));
  const schluessel = ungemessen.map((z) => z.split(': ')[0] + ': ');
  const zaehle = (zeilen) => { const m = new Map(); for (const z of zeilen) m.set(z, (m.get(z) || 0) + 1); return m; };
  const ma = zaehle(zeilenA);
  const mb = zaehle(zeilenB);
  const rest = (von, gegen) => {
    const out = [];
    for (const [z, n] of von) for (let i = 0; i < n - (gegen.get(z) || 0); i++) out.push(z);
    // die ungemessene Zeile steht schon unter „nicht messbar", nicht noch einmal als Unterschied
    return out.filter((z) => !schluessel.some((k) => z.startsWith(k)));
  };
  const nurDatei = rest(ma, mb);
  const nurNeu = rest(mb, ma);
  return { gleich: a === b, ungemessen, nurDatei, nurNeu, nurReihenfolge: a !== b && nurDatei.length === 0 && nurNeu.length === 0 && ungemessen.length === 0 };
}

const MAX_ZEILEN_IM_BEFUND = 8;
const kurz = (z) => (z.length > 200 ? z.slice(0, 197) + '…' : z);

function main() {
  const f = erzeugeFaktenbasis();
  let neuerText = formatiereMarkdown(f);
  if (CHECK) {
    if (!fs.existsSync(AUSGABE)) { console.error('✗ faktenbasis-erzeugen --check: docs/faktenbasis.md fehlt.'); process.exit(1); }
    const befund = vergleichsBefund(fs.readFileSync(AUSGABE, 'utf8'), neuerText);
    if (befund.ungemessen.length) {
      console.error('✗ faktenbasis-erzeugen --check: NICHT MESSBAR. Die Erzeugung konnte eine Angabe nicht ermitteln (das ist ein Ausfall der Messung, kein Unterschied im Inhalt, und er besteht nicht):');
      for (const z of befund.ungemessen) console.error('    ' + kurz(z));
      console.error('  Gemessen am 21.09.2026: ohne node_modules ist das Wächter-Register nicht ladbar (npm ci bzw. node_modules verlinken).');
    }
    if (!befund.gleich && (befund.nurDatei.length || befund.nurNeu.length || befund.nurReihenfolge)) {
      console.error('✗ faktenbasis-erzeugen --check: docs/faktenbasis.md weicht vom Kern ab' + (befund.nurReihenfolge ? ' (nur die Reihenfolge der Zeilen, gleicher Bestand).' : ':'));
      const zeigen = (marke, zeilen) => {
        for (const z of zeilen.slice(0, MAX_ZEILEN_IM_BEFUND)) console.error('    ' + marke + ' ' + kurz(z));
        if (zeilen.length > MAX_ZEILEN_IM_BEFUND) console.error('    … und ' + (zeilen.length - MAX_ZEILEN_IM_BEFUND) + ' weitere Zeile(n) ' + marke);
      };
      zeigen('Datei:', befund.nurDatei);
      zeigen('Kern: ', befund.nurNeu);
      // Nennt den BILLIGEN Befehl, nicht den ~50s-Lauf: --check normalisiert die Suite-Zeile
      // ohnehin weg (s. normalisiertFuerVergleich) — der teure Lauf behebt hier nichts, was
      // --ohne-suite nicht auch behebt, kostet aber jedes Mal die volle Suite-Messung. Der
      // Vergessens-Vorfall, der zu diesem Satz führte: die Meldung nannte bislang den teuren Weg.
      console.error('  Beheben mit: node tools/faktenbasis-erzeugen.js --ohne-suite (oder ohne Flag, wenn die Suite-Zahl selbst neu gemessen werden soll)');
    }
    if (befund.ungemessen.length || !befund.gleich) process.exit(1);
    console.log('faktenbasis-erzeugen --check: docs/faktenbasis.md ist aktuell (Suite-Zahl nicht geprüft, s. Kommentar).');
    process.exit(0);
  }
  if (OHNE_SUITE) {
    // Die Suite-Zahl wird NICHT geraten und NICHT auf Null gesetzt („der vierte
    // Träger", 07.09.2026): die bestehende Zeile aus der aktuellen AUSGABE-Datei wird wörtlich
    // übernommen. Kein Bestand, keine Zeile → Abbruch, statt eine erfundene Zahl zu schreiben.
    if (!fs.existsSync(AUSGABE)) {
      console.error('faktenbasis-erzeugen --ohne-suite: ' + AUSGABE + ' existiert noch nicht — keine bestehende '
        + 'Suite-Zahl zum Übernehmen. Einmal ohne --ohne-suite laufen lassen: node tools/faktenbasis-erzeugen.js'
        + (AUSGABE_ARG_INDEX !== -1 ? ' --ausgabe ' + AUSGABE : ''));
      process.exit(1);
    }
    const bestehendeZeile = fs.readFileSync(AUSGABE, 'utf8').match(/^- Suite \(Node-Tests,.*$/m);
    if (!bestehendeZeile) {
      console.error('faktenbasis-erzeugen --ohne-suite: keine Suite-Zeile in ' + AUSGABE + ' gefunden — '
        + 'Abbruch, statt eine geratene Zahl zu schreiben. Einmal ohne --ohne-suite laufen lassen.');
      process.exit(1);
    }
    neuerText = neuerText.replace(/^- Suite \(Node-Tests,.*$/m, bestehendeZeile[0]);
  }
  fs.writeFileSync(AUSGABE, neuerText);
  console.log('faktenbasis-erzeugen: docs/faktenbasis.md geschrieben (' + f.exportFormateZahl + ' Export-, ' + f.importFormateZahl + ' Import-Formate, ' + f.adrZahl + ' ADRs).'
    + (OHNE_SUITE ? ' Suite-Zahl unverändert übernommen (--ohne-suite).' : ''));
}

if (require.main === module) main();
module.exports = {
  commitHash, commitErreichbar,
  erzeugeFaktenbasis, formatiereMarkdown, versionsBelegeAusFunktion, erzeugerName, importErzeugerName,
  importWegBeschreiben, adrRegister, normalisiertFuerVergleich, vergleichsBefund, gestaltungsKlassen, DESIGN_KLASSEN,
};
