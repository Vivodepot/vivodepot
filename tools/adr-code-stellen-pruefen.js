#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-code-stellen-pruefen.js — meldet Funktions-/Bezeichner-Nennungen in ADRs,
   die im heutigen Code nirgends mehr als Definition stehen.
   ────────────────────────────────────────────────────────────────────────────
   Anlass (20.09.2026, aus einem internen Bericht zur systematischen Dokumentation):
   `angehoerigenEintritt()` wurde am 21.08.2026 aus dem Code entfernt
   (`vivodepot.html`, nur noch als Kommentar-Erwähnung der eigenen Entfernung),
   steht aber unverändert in drei ADRs (U2-ADR-031, -062, -124) als benannte
   Code-Stelle. Kein bestehender Wächter prüft das — `adr-konformitaet-pruefen.js`
   hält nur `pruefung:`-Testtitel gegen echte Tests, nicht benannte Funktionen
   im Fließtext.

   WAS ALS KANDIDAT GILT — zweite Fassung, nach einem ersten Lauf mit 1127
   Treffern (Datenfeld-Namen wie `dataAbsentReason`, externe Typnamen wie
   `CodeableConcept`, Browser-Globale wie `localStorage`): ein Backtick-
   Bezeichner, dessen Kernname (ohne optionale `()`) klein beginnt (schließt
   externe PascalCase-Typnamen aus — dieser Bestand schreibt eigene Funktionen
   nie großgeschrieben) UND entweder camelCase ist oder mit `_` beginnt, UND
   ENTWEDER mit `()` in der ADR selbst genannt ist (starkes Funktions-Signal)
   ODER innerhalb von zwei Zeilen um eine Datei-Nennung steht (`vivodepot*.html`,
   `tools/…`, `tests/…`) — die beiden Muster, an denen die drei bekannten Funde
   (`angehoerigenEintritt()` mit Klammern in U2-ADR-031; ohne Klammern, aber
   direkt neben `vivodepot.html`/`vivodepot.html:7842` in U2-ADR-062/-124)
   tatsächlich hängen. Ohne diese zweite Bedingung meldet das Werkzeug auch
   reine Datenfeld-Nennungen in Fließtext-Aufzählungen — kein Funktions-Signal,
   nur Rauschen. Mindestens vier Zeichen (schließt `` `K` ``/`` `d` `` aus).

   WAS „EXISTIERT" HEISST — dritte Fassung, nach einem zweiten Lauf mit 406
   Treffern: eine reine Definitions-Prüfung (`function NAME(`, `const NAME =`)
   markierte echte, weiterhin bestehende DATENFELDER (`ablaufDatum`,
   `sensibelFelder`, `notfallCache` — je zwei- bis 46-mal im Kern vorhanden,
   nachgemessen) fälschlich als „verwaist", weil ein Datenfeld nie als Funktion
   definiert wird. Die richtige Frage ist nicht „ist es eine Definition",
   sondern „lebt der Name noch außerhalb eines Kommentars" — als Funktion,
   Objekt-Schlüssel, Attribut, Zeichenkette, was auch immer. Darum: mehrzeilige
   Block-Kommentare werden aus dem Code-Text entfernt, ganze Zeilen, die
   getrimmt mit `//` beginnen, ebenso — danach zählt jedes Wortgrenzen-
   Vorkommen des Namens als „lebt noch". Genau das unterscheidet die beiden
   echten Fälle: `ablaufDatum` steht weit überwiegend in echtem Code (lebt),
   `angehoerigenEintritt` steht nur noch in zwei Kommentarzeilen, die exakt
   seine Entfernung festhalten (lebt nicht mehr) — nachgemessen an
   `vivodepot.html`, nicht angenommen.

   WAS DAS AUSDRÜCKLICH NICHT LEISTET, absichtlich: keine Aussage über externe
   Standard-Bezeichner (FHIR-Ressourcennamen etc. — camelCase/PascalCase, aber
   nie im eigenen Code definiert und trotzdem richtig genannt), keine Aussage
   über Fach- oder Feldnamen ohne Funktionscharakter. Das ist ein HINWEIS-
   Werkzeug, kein hartes Gate: jeder Fund braucht eine Person, die ihn liest,
   bevor er in den ADR-Text nachgezogen wird.

   NUR U2-ADRs (18.10.2026): Die B16-Linie ist eingefroren, beschreibt den Vorgänger-Code und
   wird nicht gemessen — ihre Namen stehen überwiegend nicht im U2-Kern, fast jeder wäre ein Fund
   ohne Gegenstand.

   Ohne Flag: listet jeden Fund (Datei, Zeile, Name).
   `--check`: wie oben, Exit 1 sobald mindestens ein Fund vorliegt (für einen
   künftigen Hook/Wächter — heute noch nicht verdrahtet, s. Bericht).
   `--adr-ordner <pfad>`: docs/adr/ durch einen anderen Ordner ersetzen (Tests).
   `--code-dateien <pfad,...>`: die Code-Dateien ersetzen, die auf Definitionen
   geprüft werden (Tests, Wegwerf-Fixtures).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const STANDARD_ADR_ORDNER = path.join(REPO, 'docs', 'adr');

/* Rekursiv alle .js/.mjs/.cjs-Dateien eines Ordners — dritter Rausch-Fund (nach 1127, dann 406): viele
   ADR-genannte Namen (`ladeKern`, `konformitaetZeilen`, `pruefeKlausel`, `ohneGitUmgebung`) sind
   Werkzeug-/Test-Helfer, keine Kern-Funktionen — nur die fünf HTML-Anwendungen zu durchsuchen
   ließ sie fälschlich als „verwaist" erscheinen, weil sie dort nie standen. */
function jsDateienRekursiv(ordner) {
  const treffer = [];
  for (const name of fs.readdirSync(ordner)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const voll = path.join(ordner, name);
    const stat = fs.statSync(voll);
    if (stat.isDirectory()) treffer.push(...jsDateienRekursiv(voll));
    else if (/\.(js|mjs|cjs)$/.test(name)) treffer.push(voll);
  }
  return treffer;
}

/* Die eigenen zwei Dateien dieses Wächters NIE zur Code-Basis zählen: sein Kopfkommentar und
   seine Tests nennen `angehoerigenEintritt` als Beispiel-/Fixture-Text (in Zeichenketten, nicht
   als Kommentar dieser Datei) — genau real gemessen: ohne diesen Ausschluss „lebte" der Name
   wieder, weil der Wächter über sich selbst stolperte. */
const SELBST_AUSGENOMMEN = new Set([
  path.join(REPO, 'tools', 'adr-code-stellen-pruefen.js'),
  path.join(REPO, 'tests', 'adr-code-stellen-pruefen.test.js'),
]);

/* Code-Basis: jede Anwendungs-HTML und jede JS-Datei auf der obersten Ebene (statt einer festen
   Namensliste — eine entfernte Anwendung ließ die feste Liste beim Lesen werfen, nachgemessen
   18.10.2026 an der früheren Studio-Datei unter ihrem alten Namen), dazu rekursiv `tools/`, `tests/`, `scripts/`. */
function wurzelCodeDateien() {
  return fs.readdirSync(REPO)
    .filter((n) => /\.(html|js|mjs|cjs)$/.test(n))
    .map((n) => path.join(REPO, n));
}

const STANDARD_CODE_DATEIEN = wurzelCodeDateien()
  .concat(['tools', 'tests', 'scripts']
    .map((o) => path.join(REPO, o))
    .filter((o) => fs.existsSync(o))
    .flatMap((o) => jsDateienRekursiv(o)))
  .filter((p) => !SELBST_AUSGENOMMEN.has(p));

/* Node-/Web-Bordmittel, die in ADRs genannt werden, aber nie im eigenen Code DEFINIERT sind
   (sie kommen aus `node:assert`, `node:fs`, dem Service-Worker-Bordmittel …) — kein Fund,
   ein bekannter, endlicher Ausschluss, keine Heuristik. */
const BORDMITTEL_AUSSCHLUSS = new Set([
  'deepEqual', 'deepStrictEqual', 'strictEqual', 'notStrictEqual', 'doesNotThrow', 'doesNotMatch',
  'mkdtempSync', 'readFileSync', 'writeFileSync', 'existsSync', 'readdirSync', 'statSync', 'rmSync',
  'execFileSync', 'execSync', 'spawnSync', 'spawn',
  'skipWaiting', 'waitUntil', 'addEventListener', 'querySelector', 'querySelectorAll', 'getElementById',
  'fetchFn',
]);

const MINDESTLAENGE = 4;
const CAMEL_CASE = /[a-z][A-Z]/;
const KLEIN_START = /^[a-z_]/;
const BACKTICK_BEZEICHNER = /`([A-Za-z_$][A-Za-z0-9_$]*)(\(\))?`/g;
const DATEI_NENNUNG = /vivodepot[A-Za-z-]*\.html|(?:^|[\s`"(])tools\/[A-Za-z0-9._/-]+\.js|(?:^|[\s`"(])tests\/[A-Za-z0-9._/-]+\.js/;
const NAECHSTE_ZEILEN_FENSTER = 2;

function istKandidatenName(kern) {
  if (kern.length < MINDESTLAENGE) return false;
  if (!KLEIN_START.test(kern)) return false; // schließt externe PascalCase-Typnamen aus
  if (BORDMITTEL_AUSSCHLUSS.has(kern)) return false;
  return CAMEL_CASE.test(kern) || kern.startsWith('_');
}

/* Reine Funktion: eine ADR-Zeile → Liste ihrer Kandidaten-Bezeichner, MIT dem Info, ob
   die Zeile selbst den Namen mit `()` (starkes Funktions-Signal) nennt. */
function kandidatenAusZeile(zeile) {
  const gefunden = new Map(); // name -> mitKlammern
  let m;
  BACKTICK_BEZEICHNER.lastIndex = 0;
  while ((m = BACKTICK_BEZEICHNER.exec(zeile))) {
    const kern = m[1];
    if (!istKandidatenName(kern)) continue;
    const mitKlammern = Boolean(m[2]);
    if (mitKlammern || !gefunden.has(kern)) gefunden.set(kern, mitKlammern || gefunden.get(kern) || false);
  }
  return [...gefunden.entries()].map(([name, mitKlammern]) => ({ name, mitKlammern }));
}

/* Block-Kommentare ganz entfernen (können über mehrere Zeilen laufen), dann jede Zeile
   verwerfen, die getrimmt mit `//` beginnt — ein Wortvorkommen zählt nur, wenn es außerhalb
   davon steht. Kein Anspruch auf einen vollständigen JS-Tokenizer (ein `//` mitten in einer
   Zeichenkette bliebe unerkannt) — für die beiden real beobachteten Muster (Zeilen-Kommentar
   ab Zeilenanfang, mehrzeiliger Block-Kommentar) reicht es, nachgemessen an den echten
   Fundstellen. */
function kommentareEntfernen(text) {
  const ohneBlock = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return ohneBlock.split('\n').map((z) => (/^\s*\/\//.test(z) ? '' : z)).join('\n');
}

function lebtNochMuster(name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${n}\\b`);
}

/* codeTexteOhneKommentare: bereits kommentarbereinigte Texte (einmal je Code-Datei
   vorberechnet, s. `pruefe()`) — nicht pro Kandidat neu bereinigen, das wäre bei 400+
   Kandidaten × mehreren Megabyte HTML unnötig teuer. */
function existiertLebendig(name, codeTexteOhneKommentare) {
  const muster = lebtNochMuster(name);
  return codeTexteOhneKommentare.some((text) => muster.test(text));
}

const NUR_U2 = /^vivodepot-U2-ADR-.*\.md$/;
function adrDateienLesen(adrOrdner) {
  return fs.readdirSync(adrOrdner).filter((n) => NUR_U2.test(n)).sort();
}

/* ANDERSWO BEKANNT (18.10.2026), zwei schärfere Muster statt Ausnahmen:
   1 · Der Name lebt im Schwesterrepo (Download-Gateway): der Text nennt es in derselben oder der
       Nachbarzeile („im Gateway", „Gateway (src/…)", „Schwesterrepo") oder einen Pfad `src/` —
       dieses Repo hat kein `src/`, ein solcher Pfad meint das Gateway.
   2 · Der Name ist ein Datenschlüssel einer getrackten .json unter tools/ (z. B. ein Feldsatz-
       Schlüssel) — lebt als Daten, nicht als Code. */
const SCHWESTERREPO = /\bim Gateway\b|Gateway \(`?src\/|Schwesterrepo|Schwester-Repo|vivodepot-download-gateway|(?:^|[\s`(])src\//;
const SCHWESTER_FENSTER = 1;

function schwesterrepoNamen(zeilen) {
  const namen = new Set();
  zeilen.forEach((zeile, i) => { if (SCHWESTERREPO.test(zeile)) namenImFenster(zeilen, i, SCHWESTER_FENSTER, namen); });
  return namen;
}

function jsonSchluesselSammeln(wert, ziel) {
  if (Array.isArray(wert)) { for (const w of wert) jsonSchluesselSammeln(w, ziel); return ziel; }
  if (wert && typeof wert === 'object') for (const [k, v] of Object.entries(wert)) { ziel.add(k); jsonSchluesselSammeln(v, ziel); }
  return ziel;
}

function getrackteToolsJson() {
  try {
    const aus = require('node:child_process').execFileSync('git', ['ls-files', '-z', '--', 'tools/*.json'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() });
    return aus.split('\0').filter(Boolean).map((n) => path.join(REPO, n)).filter((p) => fs.existsSync(p));
  } catch (_) { return []; }
}

function jsonSchluesselAus(dateien) {
  const ziel = new Set();
  for (const p of dateien) { try { jsonSchluesselSammeln(JSON.parse(fs.readFileSync(p, 'utf8')), ziel); } catch (_) { /* keine gültige JSON: zählt nicht */ } }
  return ziel;
}

/* AUSNAHMEN — je ADR und Name, mit Grund. Nur, was kein Muster trägt (fremde API-Felder, nur
   erwogene Namen). Wort der Gegenlesung 18.10.2026; registriert im Zähler-Register der Gegenlesung,
   ein neuer Schlüssel braucht das Wort. Schlüssel: „U2-ADR-NNN/name". */
const AUSNAHMEN = Object.freeze({
  'U2-ADR-260/pushedAt': 'Feld der GitHub-API (Repository-Metadaten), kein eigener Code',
  'U2-ADR-379/proBereichModulPfad': 'nur erwogener Name in „was dieser Zug nicht entscheidet", nie gebaut',
});

/* OFFEN — Funde ohne eindeutige Berichtigung, je mit Eigentümer. Sie werden nicht gemeldet, damit
   der Lauf grün bleibt; die Liste hält sie sichtbar und kann nur schrumpfen (registriert im
   Zähler-Register der Gegenlesung). Die Stelle zeigt
   `node -e "console.log(require('./tools/adr-code-stellen-pruefen.js').pruefe({ offen: {} }))"`. */
const OFFEN = Object.freeze({
  'U2-ADR-032/standardDokument': 'offen: Singular nur als Begriff, im Code lebt nur standardDokumente — pruefe({ offen: {} }) zeigt die Stelle; Eigentümer: Gerüst-/Kern-Strang',
  'U2-ADR-097/pdfOhneSchriftmodul': 'offen: Schutztext der Stufe 3 steht nirgends im Code — pruefe({ offen: {} }) zeigt die Stelle; Eigentümer: Ausgabe-/PDF-Strang',
});

function schluesselFuer(datei, name) {
  const m = /^vivodepot-(U2-ADR-[0-9]+)-/.exec(datei);
  return m ? `${m[1]}/${name}` : null;
}

/* NACHGEZOGEN — vierte Fassung (18.10.2026): eine Berichtigung im ADR-Text nennt den Namen weiter
   (die historische Aussage bleibt stehen, „Stand X") und vermerkt daneben den Fund mit dem Namen
   dieses Werkzeugs. Ohne diese Regel bliebe jeder berichtigte Fund für immer gemeldet, und die Zahl
   könnte nie 0 werden. Die Regel ist eng: nur ein Name, der höchstens zwei Zeilen von einer Nennung
   `adr-code-stellen-pruefen` entfernt steht, gilt in DIESER ADR als nachgezogen — ein bloßes
   „entfernt" irgendwo im Satz reicht nicht (es steht oft neben lebenden Namen). */
const VERMERK = /adr-code-stellen-pruefen/;

/* Zweite, noch engere Form: der ADR-Text sagt das Fehlen selbst schon aus („`fhirLabBundle`
   existiert nicht mehr", „wurden gebaut … und wieder entfernt", „erwogen und verworfen") — dann
   ist die Nennung zutreffend und kein toter Verweis. Ebenso „kein `X`" (eine Fehlen-Aussage). Fenster nur ±1 Zeile (ein umbrochener Satz),
   nicht ±2: ein „entfernt" zwei Zeilen weiter gehört meist schon zu einem anderen Namen. */
const FEHLEN_AUSSAGE = /entfernt|abgewickelt|existiert nicht mehr|nicht mehr vorhanden|verworfen|entfallen|nie gebaut|= 0 im Kern|\bkein(e|en|em)? `/;
const FEHLEN_FENSTER = 1;

function namenImFenster(zeilen, i, fenster, namen) {
  const von = Math.max(0, i - fenster);
  const bis = Math.min(zeilen.length - 1, i + fenster);
  for (let j = von; j <= bis; j++) for (const { name } of kandidatenAusZeile(zeilen[j])) namen.add(name);
}

function nachgezogeneNamen(zeilen) {
  const namen = new Set();
  zeilen.forEach((zeile, i) => {
    if (VERMERK.test(zeile)) namenImFenster(zeilen, i, NAECHSTE_ZEILEN_FENSTER, namen);
    if (FEHLEN_AUSSAGE.test(zeile)) namenImFenster(zeilen, i, FEHLEN_FENSTER, namen);
  });
  return namen;
}

function hatNaheDateiNennung(zeilen, i) {
  const von = Math.max(0, i - NAECHSTE_ZEILEN_FENSTER);
  const bis = Math.min(zeilen.length - 1, i + NAECHSTE_ZEILEN_FENSTER);
  for (let j = von; j <= bis; j++) if (DATEI_NENNUNG.test(zeilen[j])) return true;
  return false;
}

/* Kernfunktion: alle Kandidaten aus allen ADRs, je mit Existenz-Status. Nimmt
   Ordner/Dateien als Parameter (kein globaler Zustand) — Tests spiegeln den
   echten Aufruf, statt eine Fixture-Kopie des Moduls zu bauen. Ein Kandidat
   zählt nur, wenn er ENTWEDER mit `()` genannt ist ODER in der Nähe (±2
   Zeilen) einer Datei-Nennung steht — reines Funktions-Signal, kein
   Datenfeld-Rauschen (s. Kopfkommentar, erster Lauf hatte 1127 Treffer ohne
   diese Bedingung). */
function pruefe({
  adrOrdner = STANDARD_ADR_ORDNER, codeDateien = STANDARD_CODE_DATEIEN, jsonDateien = null,
  ausnahmen = AUSNAHMEN, offen = OFFEN,
} = {}) {
  const codeTexteOhneKommentare = codeDateien.map((p) => kommentareEntfernen(fs.readFileSync(p, 'utf8')));
  const jsonSchluessel = jsonSchluesselAus(jsonDateien === null ? getrackteToolsJson() : jsonDateien);
  const funde = [];
  for (const datei of adrDateienLesen(adrOrdner)) {
    const zeilen = fs.readFileSync(path.join(adrOrdner, datei), 'utf8').split('\n');
    const inDieserDateiSchonGemeldet = new Set();
    const nachgezogen = nachgezogeneNamen(zeilen);
    const imSchwesterrepo = schwesterrepoNamen(zeilen);
    zeilen.forEach((zeile, i) => {
      for (const { name, mitKlammern } of kandidatenAusZeile(zeile)) {
        if (!mitKlammern && !hatNaheDateiNennung(zeilen, i)) continue;
        if (nachgezogen.has(name) || imSchwesterrepo.has(name) || jsonSchluessel.has(name)) continue;
        const schluessel = schluesselFuer(datei, name);
        if (schluessel && (schluessel in ausnahmen || schluessel in offen)) continue;
        if (existiertLebendig(name, codeTexteOhneKommentare)) continue;
        if (inDieserDateiSchonGemeldet.has(name)) continue; // je Name nur der ERSTE Fund je Datei
        inDieserDateiSchonGemeldet.add(name);
        funde.push({ datei, zeile: i + 1, name });
      }
    });
  }
  return funde;
}

function main() {
  const argv = process.argv.slice(2);
  const CHECK = argv.includes('--check');
  const ordnerIdx = argv.indexOf('--adr-ordner');
  const adrOrdner = ordnerIdx !== -1 ? path.resolve(argv[ordnerIdx + 1]) : STANDARD_ADR_ORDNER;
  const codeIdx = argv.indexOf('--code-dateien');
  const codeDateien = codeIdx !== -1
    ? argv[codeIdx + 1].split(',').map((p) => path.resolve(p))
    : STANDARD_CODE_DATEIEN;

  const funde = pruefe({ adrOrdner, codeDateien });
  if (funde.length === 0) {
    console.log('[adr-code-stellen-pruefen] keine verwaisten Bezeichner gefunden.');
    return;
  }
  console.log(`[adr-code-stellen-pruefen] ${funde.length} möglicherweise verwaiste Bezeichner (Hinweis, keine Zusicherung — jeder Fund braucht eine Person):`);
  for (const f of funde) console.log(`  ${f.datei}:${f.zeile}  \`${f.name}\``);
  if (CHECK) process.exit(1);
}

module.exports = { pruefe, nachgezogeneNamen, schwesterrepoNamen, jsonSchluesselAus, AUSNAHMEN, OFFEN, kandidatenAusZeile, istKandidatenName, existiertLebendig, kommentareEntfernen, lebtNochMuster };
if (require.main === module) main();
