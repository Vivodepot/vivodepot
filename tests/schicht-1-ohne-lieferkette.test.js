'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schicht 1 läuft ohne Lieferkette — und das bleibt so
   ────────────────────────────────────────────────────────────────────────
   WOZU DIE SCHNELLE SCHICHT DA IST, und es ist nicht Tempo. Der `pre-commit`
   fährt ohnehin alles, weil die Module lokal liegen; die CI-Laufzeit bestimmen
   die Browser-Jobs, die parallel laufen. Das tragende Argument ist Haltbarkeit:

     Neunzehnhundert Prüfungen ohne externes Modul laufen in fünf Jahren noch.
     Neunzehnhundert Prüfungen, die `playwright` 1.45 und einen Chromium-
     Download brauchen, leben so lange wie diese Werkzeugkette.

   Für ein Produkt, dessen Lizenz Mission-Continuity zusagt und das jemand
   forken können muss, ist die ausführbare Spezifikation mehr wert, wenn sie
   ohne Lieferkette läuft.

   WAS DAMIT NICHT BEHAUPTET IST: dass diese Schicht die wertvollste sei. Sie
   ist per Konstruktion die, die unter dem liegt, was eine Bürgerin anfasst —
   die sieben Bürgerwege, die stärksten Prüfungen dieser Woche, sind
   unvermeidlich Browser-Prüfungen. Geschützt wird das Regressionsnetz, nicht
   die Erkenntnis. Beides zu haben ist besser, als eines für das andere zu
   opfern; darum zieht der Wächter eine Grenze, statt etwas zu verbieten.

   DER EIMER IST STRUKTURELL, NICHT NOMINELL. Was ein externes Modul braucht,
   liegt in `tests/mit-modul/`. Damit entscheidet der ORT, nicht ein Dateiname
   und nicht ein Vorsatz — dasselbe Muster wie die Regel „keine Skripte in /tmp":
   wer 2 und 3 befolgt, KANN sie nicht brechen.

   DER WÄCHTER FOLGT DEM REQUIRE-BAUM, NICHT DER DATEI. Gemessen am 28.07.:
   von dreizehn Dateien, die die Zusage brachen, taten es VIER mittelbar —
   `waechter-selbsttest.test.js` erreicht `@playwright/test` über drei
   Repo-Module. In keiner dieser vier steht der Aufruf selbst. Ein
   Wächter, der nur die Testdatei liest, hätte grün gemeldet und genau die
   Eigenschaft nicht gemessen, für die er gebaut ist.

   Die Folge ist gewollt und muss benannt sein: **die Eigenschaft hängt auch an
   `tools/`.** Wer dort ein externes `require` einfügt, macht eine Testdatei rot,
   die er nie angefasst hat. Deshalb nennt die Meldung die ganze KETTE.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { builtinModules } = require('node:module');

const REPO = path.join(__dirname, '..');
const KERN = new Set(builtinModules);

/* ── DER GELTUNGSBEREICH, und was er NICHT sieht ───────────────────────────
   Ein statisch verfolgter Require-Baum ist blind für alles, was zur Laufzeit
   entsteht. Das ist für genau diesen Wächter die naheliegende Vakuum-Falle: er
   meldete grün, weil er nicht hinsehen kann, und das sähe aus wie „sauber".
   Also sagt er es. */
const GELTUNGSBEREICH = {
  gemessen: 'statisch verfolgte `require(\'…\')`-Aufrufe mit LITERALEM Pfad, über den ganzen ' +
    'Baum aus Repo-Modulen hinweg, ausgehend von jeder *.test.js direkt in tests/',
  nichtGemessen: [
    '`require(pfad)` mit berechnetem oder zusammengesetztem Argument',
    'verzögertes Laden innerhalb einer Funktion, das nie ausgeführt wird — es zählt hier trotzdem',
    'dynamisches `import()` und ESM-`import`-Anweisungen',
    'Module, die ein Modul über einen anderen Mechanismus erreicht (Plugin-Register, eval)',
    'einen `require`-Aufruf, der im Quelltext nicht am Stück steht — der Scanner liest Text, ' +
      'nicht Code, und drei Selbsttreffer am 28.07. kamen genau daher',
  ],
};

/* ── EIN `require` IN EINEM KOMMENTAR IST KEINES ───────────────────────────
   GEMESSEN AM EIGENEN ERSTLAUF (28.07.): der Waechter meldete sich SELBST mit
   zwei Funden — `playwright` aus einem Block-Kommentar dieser Datei und
   `ein-fremdes-modul` aus einem Fixture-String der Positivkontrolle. Beide sind
   Text, kein Aufruf.

   Dieselbe Klasse hatte der Zusicherungs-Scanner am 23.07. mit Z8, das an einem
   `//`-Kommentar anschlug. Ein Scanner ohne Kommentar-Begriff misst die Datei,
   nicht das Programm — und der erste, den er dann falsch meldet, ist er selbst.

   Block-Kommentare fallen raus; bei Zeilen-Kommentaren wird je Treffer geprueft,
   ob ein `//` davor auf derselben Zeile steht. Die Fixture-Quellen der
   Kontrollen sind zusammengesetzt, damit `require('…')` dort nicht am Stueck
   im Text steht. */
function ohneBlockKommentare(quelle) {
  // Ersetzt durch gleich viele Zeilenumbrueche, damit Zeilennummern stimmen.
  return quelle.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function imZeilenKommentar(quelle, pos) {
  const zeilenanfang = quelle.lastIndexOf('\n', pos) + 1;
  return quelle.slice(zeilenanfang, pos).includes('//');
}

/** Der entscheidbare Kern — ohne Dateisystem-Annahmen, damit er Kontrollen tragen kann. */
function externeKetten(einstieg, gesehen = new Set()) {
  if (gesehen.has(einstieg)) return [];      // Zyklen brechen, nicht wiederholen
  gesehen.add(einstieg);
  let quelle = '';
  try { quelle = ohneBlockKommentare(fs.readFileSync(einstieg, 'utf8')); } catch { return []; }

  const funde = [];
  /* GLEICHE ANFUEHRUNGSZEICHEN, KEIN LEERRAUM im Bezeichner. Ein echter
     Modulbezeichner enthaelt weder Leerzeichen noch `+`. Die erste Fassung nahm
     `[^'"]+` und fand in der eigenen Datei `require(' + JSON.stringify(m) + ')`
     — den Fixture-Helfer der Kontrollen, als Text. Dritter Selbsttreffer in
     Folge, und jeder aus derselben Wurzel: der Scanner liest Text, nicht Code.
     Enger zu fassen loest das nicht grundsaetzlich, es schliesst die Formen, die
     vorkommen. Die Grenze steht im Geltungsbereich. */
  for (const m of quelle.matchAll(/require\(\s*(['"])([^'"\s]+)\1\s*\)/g)) {
    if (imZeilenKommentar(quelle, m.index)) continue;
    const modul = m[2];
    if (modul.startsWith('node:') || KERN.has(modul)) continue;
    if (!modul.startsWith('.')) {
      funde.push({ modul, kette: [path.relative(REPO, einstieg)] });
      continue;
    }
    let ziel = path.resolve(path.dirname(einstieg), modul);
    if (!fs.existsSync(ziel) && fs.existsSync(ziel + '.js')) ziel += '.js';
    for (const f of externeKetten(ziel, gesehen)) {
      funde.push({ modul: f.modul, kette: [path.relative(REPO, einstieg), ...f.kette] });
    }
  }
  // Gleiche Kette, gleiches Modul nur einmal.
  return [...new Map(funde.map((f) => [f.modul + '|' + f.kette.join('>'), f])).values()];
}

/** Alle *.test.js DIREKT in tests/ — Unterverzeichnisse gehören nicht zur Schicht. */
function schichtEins() {
  return fs.readdirSync(path.join(REPO, 'tests'), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.test.js'))
    .map((e) => path.join(REPO, 'tests', e.name))
    .sort();
}

/* ── DIE ZUSICHERUNG ───────────────────────────────────────────────────── */

test('[Schicht 1] keine Datei erreicht ein Modul ausserhalb von node-core und Repo', () => {
  const dateien = schichtEins();

  /* ZUSTANDSANSAGE: findet der Wächter überhaupt etwas zu messen? Eine leere
     Population meldete sonst grün — vakuum, wie überall sonst auch. */
  assert.ok(dateien.length > 100,
    `nur ${dateien.length} Testdateien direkt in tests/ gefunden — das ist kein Ergebnis, ` +
    'sondern ein Verdacht auf eine verschobene Population.');

  const brueche = [];
  for (const d of dateien) {
    for (const f of externeKetten(d)) brueche.push(f);
  }

  const meldung = brueche.map((b) =>
    `  ✖ ${b.modul}\n      über  ${b.kette.join('\n            → ')}`).join('\n');

  assert.deepEqual(brueche, [],
    `${brueche.length} Datei-Ketten erreichen ein externes Modul:\n${meldung}\n\n` +
    'Schicht 1 soll ohne Lieferkette laufen — neunzehnhundert Prüfungen ohne externes Modul\n' +
    'laufen in fünf Jahren noch, mit `playwright` 1.45 leben sie so lange wie diese\n' +
    'Werkzeugkette. Was ein externes Modul braucht, gehört nach `tests/mit-modul/`.\n\n' +
    'DIE KETTE, NICHT DIE DATEI: bricht sie über `tools/`, ist die Ursache dort und nicht\n' +
    'in der Testdatei, die rot wurde.\n\n' +
    `GELTUNGSBEREICH — dieser Wächter sieht NICHT:\n  · ${GELTUNGSBEREICH.nichtGemessen.join('\n  · ')}`);
});

/* ── POSITIVKONTROLLE ──────────────────────────────────────────────────── */

test('[Schicht 1·Positivkontrolle] eine Kette über drei Repo-Module wird gefunden', () => {
  /* Der Fall, der am 28.07. überrascht hat, ist der Regelfall: das externe Modul
     steht nicht in der Testdatei, sondern drei Requires weiter. Ein Wächter, der
     nur die Datei liest, wäre hier still. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-schicht1-'));
  try {
    const ruf = (m) => 'require(' + JSON.stringify(m) + ');\n';   // nicht am Stueck im Text
    fs.writeFileSync(path.join(tmp, 'c.js'), ruf('ein-fremdes-modul'));
    fs.writeFileSync(path.join(tmp, 'b.js'), ruf('./c.js'));
    fs.writeFileSync(path.join(tmp, 'a.js'), ruf('./b.js'));
    fs.writeFileSync(path.join(tmp, 'probe.test.js'), ruf('node:fs') + ruf('./a.js'));

    const f = externeKetten(path.join(tmp, 'probe.test.js'));
    assert.equal(f.length, 1, 'genau ein Bruch');
    assert.equal(f[0].modul, 'ein-fremdes-modul');
    assert.equal(f[0].kette.length, 4, 'die GANZE Kette, nicht nur der Einstieg');
    assert.match(f[0].kette.join(' '), /probe\.test\.js.*a\.js.*b\.js.*c\.js/,
      'und in der Reihenfolge, in der jemand ihr folgen kann');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ── NEGATIVKONTROLLE ──────────────────────────────────────────────────── */

test('[Schicht 1·Negativkontrolle] eine rein interne Kette und node-core schlagen NICHT an', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-schicht1-'));
  try {
    const ruf = (m) => 'require(' + JSON.stringify(m) + ');\n';
    fs.writeFileSync(path.join(tmp, 'kern.js'), ruf('node:crypto') + ruf('fs'));
    fs.writeFileSync(path.join(tmp, 'probe.test.js'), ruf('node:test') + ruf('assert') + ruf('./kern.js'));
    assert.deepEqual(externeKetten(path.join(tmp, 'probe.test.js')), [],
      'sonst waere der Waechter von einem, der jede Datei meldet, nicht zu unterscheiden — ' +
      'und `node:`-Praefix wie blanker Kernname muessen beide durchgehen');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Schicht 1·Negativkontrolle] ein Zyklus laeuft nicht endlos und erfindet nichts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-schicht1-'));
  try {
    const ruf = (m) => 'require(' + JSON.stringify(m) + ');\n';
    fs.writeFileSync(path.join(tmp, 'x.js'), ruf('./y.js'));
    fs.writeFileSync(path.join(tmp, 'y.js'), ruf('./x.js'));
    fs.writeFileSync(path.join(tmp, 'probe.test.js'), ruf('./x.js'));
    assert.deepEqual(externeKetten(path.join(tmp, 'probe.test.js')), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Schicht 1·Negativkontrolle] ein `require` in einem KOMMENTAR ist keines', () => {
  /* Der Fall, den der Waechter im eigenen Erstlauf an sich selbst gefunden hat.
     Ohne diese Kontrolle waere die Reparatur eine Zusage — und ein Scanner, der
     Kommentare mitliest, meldet als Erstes sich selbst. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-schicht1-'));
  try {
    const ruf = (m) => 'require(' + JSON.stringify(m) + ');';
    fs.writeFileSync(path.join(tmp, 'probe.test.js'),
      '/* Beispiel im Block-Kommentar: ' + ruf('fremd-im-block') + ' */\n' +
      '// Beispiel im Zeilen-Kommentar: ' + ruf('fremd-in-zeile') + '\n' +
      ruf('node:fs') + '\n');
    assert.deepEqual(externeKetten(path.join(tmp, 'probe.test.js')), [],
      'ein Scanner ohne Kommentar-Begriff misst die Datei, nicht das Programm');

    // GEGENRICHTUNG: derselbe Aufruf als echter Code wird sehr wohl gefunden.
    fs.writeFileSync(path.join(tmp, 'echt.test.js'), ruf('fremd-als-code') + '\n');
    const f = externeKetten(path.join(tmp, 'echt.test.js'));
    assert.equal(f.length, 1, 'sonst haette die Kommentar-Ausnahme die Regel kaputtgemacht');
    assert.equal(f[0].modul, 'fremd-als-code');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Schicht 1·Negativkontrolle] zusammengesetzter Text ist kein Modulbezeichner', () => {
  /* Der dritte Selbsttreffer: `'require(' + JSON.stringify(m) + ');'` steht im
     Quelltext und sieht wie ein Aufruf aus. Ein echter Bezeichner enthaelt
     weder Leerraum noch `+`. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-schicht1-'));
  try {
    fs.writeFileSync(path.join(tmp, 'probe.test.js'),
      "const ruf = (m) => 'require(' + JSON.stringify(m) + ');';\nmodule.exports = { ruf };\n");
    assert.deepEqual(externeKetten(path.join(tmp, 'probe.test.js')), [],
      'sonst meldet der Waechter seinen eigenen Fixture-Helfer als Lieferketten-Bruch');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Schicht 1] der Geltungsbereich nennt, was der Waechter nicht sieht', () => {
  assert.ok(GELTUNGSBEREICH.nichtGemessen.length >= 3,
    'Ein statischer Require-Baum ist blind fuer berechnete Pfade und `import()`. ' +
    'Wer das nicht ausspricht, laesst „gruen weil geprueft" und „gruen weil nicht ' +
    'hingesehen" gleich aussehen.');
});

module.exports = { externeKetten, schichtEins, GELTUNGSBEREICH };
