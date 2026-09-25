'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Prüfstand der Bindungen — U2-ADR-099, Teil B-2
   ────────────────────────────────────────────────────────────────────────
   Das Fundament (`bindung-pruefen.js`) prüft, dass eine Zusicherung ihre Prüfung
   NENNT. Dieser Prüfstand prüft die Stufe darüber: dass die genannte Prüfung eine
   NEGATIVPROBE hat und dass der Wächter die deklarierte Diskriminante WIRKLICH
   BENUTZT.

   DREI Entscheidungen, jede aus einem gemessenen Befund:

   1 · GRUNDMENGE AUS ```konformitaet-BLÖCKEN, nicht aus beliebigen `pruefung:`-Zeilen.
       Gemessen (26.07.): 44 `pruefung:`-Zeilen im ADR-Bestand, davon 39 im Block und
       5 außerhalb — darunter das FORMAT-BEISPIEL in U2-ADR-098-nachtrag, das ein
       Filter „gültiger Pfad" als echten Wächter gezählt hätte. Prosa ist keine Klausel.

   2 · ZWEI MENGEN, BEIDE GEPINNT. Eine `pruefung:`-Zeile, die nicht parsbar ist oder
       nicht auflöst, ist ein EIGENER FEHLSCHLAG — kein Überspringen. Sonst wäre
       „0 Lücken" durch schlechtes Schreiben erreichbar: der Prüfbereich verkleinerte
       sich still, genau wie der leere Slice aus Stufe 7, nur besser getarnt.
       Ausnahmen gibt es, aber nur BENANNT und GEZÄHLT (Länge mit-assertiert).

   3 · AUFRUF-NACHWEIS STATT IDENTITÄT. Dass die Probe dieselbe Funktion NENNT, heißt
       nicht, dass der Wächter sie BENUTZT — ein Wächter kann D deklarieren und inline
       gegen E prüfen (die Kopie-Klasse eine Ebene tiefer, in Teil A achtmal im eigenen
       Bestand gefunden). Deshalb wird die Diskriminante INSTRUMENTIERT: ihr Rumpf wird
       in einer Wegwerf-Kopie der Datei durch einen zählenden, IMMER-VERLETZUNG
       liefernden Ersatz getauscht, und der Wächter läuft im Kindprozess. Zwei Signale:
         · der Zähler meldet sich  → der Wächter RUFT sie
         · der Wächter wird ROT    → der Wächter BENUTZT ihr Ergebnis auch
       Das zweite ist die schärfere Aussage: Rufen und Wegwerfen fiele hier auf.

   Weil der Nachweis über einen Kindprozess läuft, wird KEINE `.test.js` requiret —
   das hätte ihre Tests ein zweites Mal registriert (in B-1 gemessen: Testfall lief 2×).
   Die Zuordnung Wächter↔Diskriminante wird aus dem Quelltext gelesen und durch den
   Nachweis VERIFIZIERT, nicht geglaubt: stimmt der Name nicht, greift die Instrumen-
   tierung nicht und der Prüfstand wird rot.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const ADR_VERZ = path.join(REPO, 'docs', 'adr');
const TESTS = __dirname;
const MARKE = '__PRUEFSTAND_DISKRIMINANTE_GERUFEN__';
const MUTATION = '__PRUEFSTAND_MUTATION__';

/* SELBSTHEILUNG (03.09.2026, Auftrag — Fund: `_pruefstand-tmp-10437-949356599.cjs` lag
   COMMITTET im Kanon; eine zweite, ungetrackte Leiche (`_pruefstand-tmp-6769-1410333364.cjs`)
   entstand in DERSELBEN Nacht neu — das Problem ist LIVE, nicht nur historisch. Ursache: der
   `finally` unten (Zeile siehe `aufrufNachweisAusQuelle`) läuft nicht, wenn der Elternprozess
   während des blockierenden `execFileSync` extern beendet wird. Gemessen, nicht vermutet, WELCHE
   Beendigungen das trifft: SIGKILL ist per Definition unfangbar. Ein registrierter
   `process.on('SIGTERM', …)`-Handler wurde diese Nacht isoliert gegen genau diese Blockade
   getestet (ein `node`-Prozess mitten in einem blockierenden `execFileSync`, `SIGTERM` von
   außen) — der Handler lief NICHT; der Prozess endete über die Standard-Aktion, bevor der
   Node-Event-Loop den Signal-Callback je zustellen konnte. Kein Signal-Pfad schließt diese
   Lücke, weil während des Blocks kein JavaScript läuft, das ihn schließen könnte — nur der
   Aufrufer selbst (dieses Modul, beim NÄCHSTEN Laden) kann es noch.

   Räumt beim Laden dieses Moduls Leichen VORIGER, toter Läufe weg — nie die Datei eines noch
   laufenden Prozesses: die PID steht im Dateinamen selbst, `process.kill(pid, 0)` prüft
   Lebendigkeit ohne zu signalisieren (ESRCH = kein solcher Prozess = tot; jeder andere
   Fehlercode, z. B. EPERM, heißt: existiert, nur kein Zugriff — dann NICHT löschen). Kein Ersatz
   für das `finally` unten (das bleibt der Normalfall, läuft schneller und ohne
   Verzeichnis-Scan) — nur das Netz darunter für den Fall, den kein `finally` und kein
   Signal-Handler erreichen kann. `verzeichnis` ist parametrierbar, damit der Rot-Beweis gegen
   ein isoliertes Fixture laufen kann, ohne je das echte `tests/`-Verzeichnis anzufassen. */
function pruefstandTmpLeichenRaeumen(verzeichnis) {
  const ziel = verzeichnis || TESTS;
  let dateien;
  try { dateien = fs.readdirSync(ziel); } catch (_) { return []; }
  const muster = /^_pruefstand-tmp-(\d+)-\d+\.cjs$/;
  const geraeumt = [];
  for (const name of dateien) {
    const treffer = muster.exec(name);
    if (!treffer) continue;
    const pid = Number(treffer[1]);
    let lebt;
    try { process.kill(pid, 0); lebt = true; }
    catch (e) { lebt = e.code !== 'ESRCH'; }
    if (lebt) continue;
    try { fs.unlinkSync(path.join(ziel, name)); geraeumt.push(name); } catch (_) {}
  }
  return geraeumt;
}
pruefstandTmpLeichenRaeumen();

/* ── Grundmenge: nur ```konformitaet-Blöcke ──────────────────────────────── */
// Liefert die Zeilen INNERHALB von ```konformitaet …-Blöcken, mit Dateiname und Zeilennummer.
function konformitaetZeilen() {
  const raus = [];
  for (const f of fs.readdirSync(ADR_VERZ).filter(x => x.endsWith('.md'))) {
    const zeilen = fs.readFileSync(path.join(ADR_VERZ, f), 'utf8').split('\n');
    let drin = false;
    for (let i = 0; i < zeilen.length; i++) {
      const z = zeilen[i];
      if (!drin && /^\s*```konformitaet/.test(z)) { drin = true; continue; }
      if (drin && /^\s*```/.test(z)) { drin = false; continue; }
      if (drin) raus.push({ adr: f, nr: i + 1, zeile: z });
    }
  }
  return raus;
}

// Zwei Mengen. `gueltig`: Pfad#Name, Pfad existiert, Name ist ein Test-Titel dort.
// `ungueltig`: alles andere — MIT Grund, damit der Fehlschlag etwas sagt.
function pruefungsZeilen() { return klassifiziere(konformitaetZeilen()); }

// Getrennt von der Datei-Lesung, damit die Meta-Beweise eine VERSTÜMMELTE Zeile
// einspeisen können, ohne je eine ADR anzufassen.
function klassifiziere(eintraege) {
  const gueltig = [], ungueltig = [];
  for (const e of eintraege) {
    // NUR Zeilen, die mit `pruefung:` BEGINNEN — nicht solche, die es erwähnen.
    // Gefunden vom eigenen ADR-Text: die `aussage:` des ersten Blocks enthält das
    // Wort „`pruefung:`-Zeile", und die lose Form hat sie als kaputte Klausel
    // gemeldet. Dieselbe Zu-breit-Klasse, die diese Strecke bei Wächtern jagt.
    if (!/^\s*pruefung:\s/.test(e.zeile)) continue;
    const roh = e.zeile.replace(/^\s*pruefung:\s*/, '').trim();
    // Der Name darf LEERZEICHEN tragen — die Test-Titel dieses Bestands tun das
    // („NULL externe HTTP/S-Requests …", „[Konformität] Runtime …"). Eine \S+-Form
    // hätte sechs gültige Klauseln als unlesbar gemeldet; gemessen, nicht vermutet.
    const m = roh.match(/^([\w./-]+\.(?:js|mjs|cjs))#(.+)$/);
    if (!m) { ungueltig.push({ ...e, roh, grund: 'nicht als „Pfad#Name" parsbar' }); continue; }
    const [, rel] = m; const name = m[2].trim();
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) { ungueltig.push({ ...e, roh, grund: 'Pfad existiert nicht: ' + rel }); continue; }
    const quelle = fs.readFileSync(abs, 'utf8');
    // U2-ADR-226 (03.09.2026): GENAU EIN Treffer, nicht nur „mindestens einer" (`.some()` war
    // blind für Mehrdeutigkeit — zwei echte Funde im Bestand selbst, s. ADR). Ein Name, der auf
    // mehrere Testtitel passt, ist ungültig, nicht zufällig gültig.
    const treffer = testTitelVon(quelle).filter(t => t.includes(name));
    if (treffer.length === 0) {
      ungueltig.push({ ...e, roh, grund: 'kein Test-Titel „' + name + '" in ' + rel }); continue;
    }
    if (treffer.length > 1) {
      ungueltig.push({
        ...e, roh,
        grund: 'mehrdeutig — „' + name + '" passt auf ' + treffer.length + ' Test-Titel in ' + rel + ': '
          + treffer.map(t => JSON.stringify(t)).join(', '),
      });
      continue;
    }
    gueltig.push({ ...e, datei: rel, name });
  }
  return { gueltig, ungueltig };
}

function testTitelVon(quelle) {
  const titel = [];
  const re = /\btest\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(quelle))) titel.push(m[2]);
  return titel;
}

/* ── Proben-Deklarationen aus dem Quelltext ──────────────────────────────── */
// { fuer: '<waechter>', diskriminante: <Bezeichner> } — der Bezeichner wird NICHT
// geglaubt: der Aufruf-Nachweis unten scheitert, wenn er nicht die echte Funktion trifft.
function probenDeklarationen() {
  const raus = [];
  for (const f of fs.readdirSync(TESTS).filter(x => x.endsWith('.test.js'))) {
    const q = fs.readFileSync(path.join(TESTS, f), 'utf8');
    const block = q.match(/PROBEN\s*:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
    if (!block) continue;
    const re = /\{\s*fuer\s*:\s*['"]([^'"]+)['"]\s*,\s*diskriminante\s*:\s*([A-Za-z_$][\w$]*)\s*\}/g;
    let m;
    while ((m = re.exec(block[1]))) raus.push({ datei: 'tests/' + f, fuer: m[1], diskriminante: m[2] });
  }
  return raus;
}

/* ── Aufruf-Nachweis ─────────────────────────────────────────────────────── */
// Ersetzt den RUMPF der genannten Funktion durch einen zaehlenden Ersatz, der IMMER
// eine Verletzung meldet. Liefert null, wenn die Funktion so nicht gefunden wurde —
// das ist selbst ein Befund (die Deklaration zeigt ins Leere).
function instrumentiere(quelle, name) {
  const einschub = '\n  console.log("' + MARKE + '");\n  return ["' + MUTATION + '"];\n';
  // ZWEI Deklarationsformen. Die reine `function`-Form war die erste Fassung — und
  // stellte damit jeden Waechter still frei, dessen Diskriminante als Pfeil-Konstante
  // geschrieben ist (`const leseApp = () => { … }`). Das ist keine exotische Form,
  // sondern die haeufigere in den juengeren Testdateien; die Reichweite des ganzen
  // Aufruf-Nachweises hing an dieser einen Zeichenfolge.
  const formen = [
    new RegExp('(function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{)'),
    new RegExp('(const\\s+' + name + '\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{)'),
    new RegExp('(const\\s+' + name + '\\s*=\\s*(?:async\\s*)?[A-Za-z_$][\\w$]*\\s*=>\\s*\\{)'),
  ];
  for (const re of formen) if (re.test(quelle)) return quelle.replace(re, '$1' + einschub);
  return null;
}

// Fuehrt GENAU den einen Waechter-Test gegen die instrumentierte Kopie aus.
// Rueckgabe: { gefunden, gerufen, waechterRot, ausgabe }
function aufrufNachweis({ datei, fuer, diskriminante }) {
  return aufrufNachweisAusQuelle(fs.readFileSync(path.join(REPO, datei), 'utf8'),
                                 { datei, fuer, diskriminante });
}

// Dieselbe Prüfung, aber gegen ÜBERGEBENEN Quelltext. Der Wrapper braucht seine eigene
// Rot-und-Grün-Probe (Auftrag) — und die verlangt einen veränderten Wächter. Über diesen
// Einstieg geschieht das im Speicher: die echte Datei wird nie geschrieben.
function aufrufNachweisAusQuelle(roh, { datei, fuer, diskriminante }) {
  const mutiert = instrumentiere(roh, diskriminante);
  if (mutiert === null) return { gefunden: false, gerufen: false, waechterRot: false, ausgabe: '' };
  // Wegwerf-Kopie NEBEN der Datei (relative require() muessen aufloesen), aber ohne
  // .test.js-Endung: `node --test` entdeckt sie nicht, nur der gezielte Aufruf hier.
  const tmp = path.join(TESTS, '_pruefstand-tmp-' + process.pid + '-' + Math.abs(hash(datei + fuer)) + '.cjs');
  try {
    fs.writeFileSync(tmp, mutiert, 'utf8');
    // NODE_TEST_CONTEXT aus der Umgebung nehmen: laeuft der Pruefstand selbst unter
    // `node --test`, erbt das Kind diese Variable und schaltet auf das Maschinenformat
    // (kein „ℹ tests N"). Der Nachweis waere dann IM RUNNER anders als einzeln — genau
    // die Sorte stiller Abweichung, die hier gejagt wird. Gemessen: ohne diese Zeile
    // grün beim Einzellauf und rot in der Suite.
    const umgebung = { ...process.env };
    delete umgebung.NODE_TEST_CONTEXT;
    let ausgabe = '', rot = false;
    try {
      ausgabe = execFileSync(process.execPath,
        ['--test', '--test-reporter=spec', '--test-name-pattern=' + escapeRe(fuer), tmp],
        { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: umgebung });
    } catch (e) { rot = true; ausgabe = String((e.stdout || '') + (e.stderr || '')); }
    // „rot" heisst: der Lauf endete mit Fehlschlag UND es lief ueberhaupt ein Test.
    // Lief KEIN Test (Muster traf nicht), ist das kein Beleg, sondern ein Fehlschlag.
    const m = ausgabe.match(/^\s*(?:ℹ )?tests (\d+)/m);
    const gelaufen = m ? +m[1] : 0;
    return { gefunden: true, gerufen: ausgabe.includes(MARKE), waechterRot: rot && gelaufen > 0,
             gelaufen, ausgabe };
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

/* ── Deckung ─────────────────────────────────────────────────────────────── */
// Waechter (aus den Klausel-Bloecken) ohne PROBEN-Deklaration.
function waechterOhneProbe(gueltig, proben) {
  const mitProbe = new Set(proben.map(p => p.fuer));
  const raus = [];
  for (const w of gueltig) if (!mitProbe.has(w.name)) raus.push(w);
  return raus;
}

/* ── Klassifikation der Wächter ohne deklarierte Probe ────────────────────
   Die Trennung lief am 26.07. zuerst als Skript im Scratchpad und ihr Ergebnis stand
   als Prosa in einem Kommentar. Das ist WEDER berechnet NOCH gepinnt: ein eingefrorenes
   Urteil, dessen Erzeuger mit der Sitzung verschwindet — und ein Wächter, der später
   zur Kollektor-Form wechselt, bliebe still freigestellt. Dieselbe Klasse wie
   „gedeckt war nicht ausgeführt", eine Ebene höher. Darum lebt sie jetzt hier und
   wird bei JEDEM Lauf neu gerechnet; die Zahlen sind im Test gepinnt.

   DER TRENNENDE UNTERSCHIED ist NICHT „Verbot gegen Zusicherung" — das wäre
   Namensdisziplin: `b16-009b-wortmarke-im-footer` klingt positiv und ist ein
   Kollektor, `[Sprung] jede Regal-Karte …` ebenso. Er lautet:
       KANN DIESER TEST ÜBER EINEM LEEREN SUCHRAUM GRÜN SEIN?
   Die Kollektor-Form (Liste sammeln, ihre Leere behaupten) kann es — genau dagegen
   verlangt operating-manual §7.5 die Probe. Die Konstruktions-Form nennt einen
   erwarteten Wert und fällt laut aus. */

// Rumpf des Wächter-Tests. WICHTIG: den test()-AUFRUF suchen, nicht die erste Nennung
// des Namens — der steht meist zuerst in der PRUEFUNGEN-Liste. Die naive Form lieferte
// zwölf FREMDE Rümpfe, sichtbar nur daran, dass sie keine einzige Assertion enthielten.
function waechterRumpf(datei, name) {
  const abs = path.join(REPO, datei);
  if (!fs.existsSync(abs)) return null;
  const q = fs.readFileSync(abs, 'utf8');
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp("test\\(\\s*(['\"`])" + esc.replace(/'/g, "\\'") + "\\1").exec(q)
         || new RegExp("test\\(\\s*['\"`][^'\"`]*" + esc.slice(0, 40).replace(/'/g, "\\'")).exec(q);
  if (!m) return null;
  const ende = q.indexOf('\n});', m.index);
  return q.slice(m.index, ende < 0 ? m.index + 8000 : ende + 4);
}

// Sammelt eine Liste und behauptet ihre Leere. Die `,\s*''\s*[,)]`-Form ist tragend:
// die enge Fassung `''\)` verfehlte vier Fälle, deren Meldung als drittes Argument folgt.
const KOLLEKTOR_FORMEN = [
  // [\s\S]{0,140}? statt einer Zeichenklasse: das Argument ist oft ein AUSDRUCK
  // (`k.ohneRumpf.map(x => x.name)`), und eine Klasse ohne `=`/`>` verfehlt ihn.
  // Sechster Fall dieses Musters an einem Tag — die Positivkontrolle unten traegt
  // ihn jetzt, damit die Enge nicht ein siebtes Mal unbemerkt bleibt.
  /deepEqual\([\s\S]{0,140}?,\s*\[\]/,
  /equal\(\s*[\w.]+\.length,\s*0\b/,
  /equal\(\s*[\w.]+\.join\([^)]*\),\s*''\s*[,)]/,
  // 01.09.2026 (U2-ADR-190-Nachtrag, clients.claim()): erste `@playwright/test`-gebundene
  // Klausel im ganzen Bestand — `expect(x, meldung).toEqual([])` statt `assert.deepEqual`.
  // Der lange Meldungstext steht ZWISCHEN `expect(` und `.toEqual([])` (Playwright-Signatur
  // `expect(value, message)`), oft über 140 Zeichen — darum matcht dieses Muster den
  // charakteristischen SCHWANZ `.toEqual([])` direkt, unabhängig davon, was davor steht.
  /\.toEqual\(\s*\[\]\s*\)/,
];
const SCHUTZ_FORMEN = [
  [/assert\.ok\([^,)]*\.length\s*>\s*0/, 'Nicht-leer-Wache'],
  [/assert\.throws\(/, 'assert.throws (Probe im Test)'],
  [/assert\.equal\([^,]*\.length,\s*(?!0)\d+/, 'gepinnte Zahl'],
];

function istKollektorForm(rumpf) { return KOLLEKTOR_FORMEN.some(re => re.test(rumpf || '')); }
function schutzImTest(rumpf) { return SCHUTZ_FORMEN.filter(([re]) => re.test(rumpf || '')).map(([, l]) => l); }

/* AUSSERHALB DER REICHWEITE — eine eigene, GEZAEHLTE Kategorie, nicht Prosa neben
   der Liste. Sonst liest der naechste Lauf die Restschuld als vollstaendig und
   uebersieht Waechter, die der Mechanismus nie erreichen konnte.
   Zwei strukturelle Gruende, beide mechanisch bestimmbar:
     · die Datei ist keine tests/*.test.js — probenDeklarationen() liest nur die
     · der Waechter ruft KEINE dateieigene `function` — der Aufruf-Nachweis
       instrumentiert `function <name>` in der TESTDATEI; liegt die Diskriminante
       im geteilten Modul, greift er nicht */
function ausserhalbReichweite(w, rumpf) {
  if (!/^tests\/[^/]+\.test\.js$/.test(w.datei)) return 'Datei ist keine tests/*.test.js';
  const q = fs.readFileSync(path.join(REPO, w.datei), 'utf8');
  // Dieselben Formen, die `instrumentiere` beherrscht — sonst meldet der Detektor
  // Reichweite, wo der Nachweis keine hat, oder umgekehrt. Sie muessen zusammen
  // wandern; darum stehen sie hier nebeneinander und nicht in zwei Dateien.
  const eigene = [
    ...[...q.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]),
    ...[...q.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g)].map(m => m[1]),
  ];
  const gerufen = eigene.filter(n => new RegExp('\\b' + n + '\\s*\\(').test(rumpf || ''));
  return gerufen.length ? null : 'ruft keine instrumentierbare dateieigene Funktion (Diskriminante im geteilten Modul)';
}

// Klassifiziert die uebergebenen Waechter. `ohneRumpf` ist ein eigener Fehlschlag,
// keine stille Einordnung: ein nicht lesbarer Rumpf darf niemanden freistellen.
function klassifiziereWaechter(waechter) {
  const kollektor = [], konstruktion = [], ohneRumpf = [], ausserReichweite = [];
  for (const w of waechter) {
    const r = waechterRumpf(w.datei, w.name);
    // `expect(` zusätzlich zu `assert.`: 01.09.2026, erste `@playwright/test`-gebundene
    // Klausel im Bestand (s. KOLLEKTOR_FORMEN oben) — ohne diese Erweiterung würde ihr
    // echter, lesbarer Rumpf hier fälschlich als „kein Beleg gefunden" gemeldet.
    if (!r || !/assert\.|expect\(/.test(r)) { ohneRumpf.push(w); continue; }
    const grund = ausserhalbReichweite(w, r);
    const schutz = schutzImTest(r);
    const negProbeInDatei = /test\(\s*['"`]\[Negativprobe\]/
      .test(fs.existsSync(path.join(REPO, w.datei)) ? fs.readFileSync(path.join(REPO, w.datei), 'utf8') : '');
    const eintrag = { ...w, schutz, negProbeInDatei, ausserhalb: grund };
    if (grund) ausserReichweite.push(eintrag);
    (istKollektorForm(r) ? kollektor : konstruktion).push(eintrag);
  }
  // Die Schuld-Mengen zaehlen NUR, was der Mechanismus auch erreichen kann.
  const erreichbar = x => !x.ausserhalb;
  return {
    kollektor, konstruktion, ohneRumpf, ausserReichweite,
    mitSchutz:  kollektor.filter(erreichbar).filter(x => x.schutz.length),
    nurSchwach: kollektor.filter(erreichbar).filter(x => !x.schutz.length && x.negProbeInDatei),
    ohneBeleg:  kollektor.filter(erreichbar).filter(x => !x.schutz.length && !x.negProbeInDatei),
  };
}

module.exports = {
  konformitaetZeilen, pruefungsZeilen, klassifiziere, testTitelVon, probenDeklarationen,
  instrumentiere, aufrufNachweis, aufrufNachweisAusQuelle, waechterOhneProbe,
  waechterRumpf, istKollektorForm, schutzImTest, klassifiziereWaechter, ausserhalbReichweite,
  pruefstandTmpLeichenRaeumen,
  MARKE, MUTATION, REPO,
};
