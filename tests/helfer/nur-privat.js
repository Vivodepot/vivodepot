'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Tests, die nur im privaten Repo laufen können — sichtbar übersprungen, mit Grund (25.09.2026).

   Im öffentlichen Zuschnitt fehlen zurückgehaltene Dateien und die git-Geschichte des privaten Repos. Wer daran
   rot wird, weil eine DATEI fehlt, bleibt ganz privat (tools/zuschnitt-tests-privat.json, gemessen). Wer aus einem
   anderen Grund nicht laufen kann, steht HIER, je Datei mit den betroffenen Tests und einem der zwei Gründe:
     GIT      — der Test liest Refs oder Commits des privaten Repos (origin/u2-kanon, frühere Commit-Hashes);
     BESTAND  — der Test misst den ganzen privaten Bestand gegen eine Grundlinie; im Zuschnitt fehlt ein Teil davon;
     ZUSCHNITT — der Test prüft eine erzeugte Datei, deren Stempel der Zuschnitt-Bauer bewusst durch die Fassung ersetzt.
   Im öffentlichen Repo springen genau diese Tests auf skip, mit dem Grund im Protokoll. Im privaten Repo laufen sie
   alle — das verlangt tests/nur-privat-gegenstueck.test.js, das nie hinausgeht.

   ÖFFENTLICH ist ein Stand, dem tools/befund-ratsche.json fehlt: die Befund-Ratsche ist interner Arbeitsprozess und
   bleibt nach Regel drinnen (ZURUECK_INTERN in tools/veroeffentlichung-zuschnitt.js). Geht sie einmal hinaus, laufen
   die Tests unten öffentlich wieder — und werden sichtbar rot, nicht still grün.

   Einbinden: `const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);` statt
   `const { test } = require('node:test');`. Die Liste ist eine Ratsche: tests/nur-privat-helfer.test.js verlangt, dass
   jeder Name im Test noch vorkommt und dass die Zahl der Einträge den Deckel nicht übersteigt.
   Erhebungsweg: node tools/zuschnitt-tests-messen.js --ziel <leer> (Abschnitt „anders").
   ═════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const GIT = 'liest Refs oder Commits des privaten Repos';
const BESTAND = 'misst den ganzen privaten Bestand gegen eine Grundlinie';
const ZUSCHNITT = 'prüft eine erzeugte Datei, deren Stempel der Zuschnitt durch die Fassung ersetzt';
const MARKE = path.join('tools', 'befund-ratsche.json');
const DECKEL = 42;   // 40 → 41 am 25.09.2026: ZUSCHNITT-Fall, gefunden in der Vorprobe des öffentlichen Stands

const NUR_PRIVAT = {
  "tests/modulpruefung-posten4-kontrakt-faktenuebersicht.test.js": { grund: ZUSCHNITT, tests: [
    "[Posten4] --check ist grün gegen die echte, committete Datei",
  ] },
  "tests/adr-commit-hashes-waechter.test.js": { grund: BESTAND, tests: [
    "[ADR-Hash-Wächter] die echten ADR-Dateien tragen heute keine tote Commit-Hash-Referenz",
  ] },
  "tests/adr-konformitaet-pruefen.test.js": { grund: BESTAND, tests: [
    "[Konformitäts-Wächter] pruefung auf eine WIRKLICH existierende Probe ist GRÜN (Positivkontrolle)",
    "[Konformitäts-Wächter·226 Klasse B] ZWEITE pruefung-Zeile eines Blocks, die auf nichts passt, ist ROT — vor U2-ADR-226 unsichtbar",
    "[Konformitäts-Wächter·226 Gegenprobe] MEHRERE pruefung-Zeilen, die alle einzeln korrekt auflösen, bleiben GRÜN — Mehrfachbindung ist der Normalfall, kein Fund",
    "[Konformitäts-Wächter] gegen den echten Bestand: die vier Zahlen sind plausibel",
    "[Konformitäts-Wächter] Negativkontrolle: die unveränderte Kopie lässt das Gate grün",
    "[Konformitäts-Wächter] Positivkontrolle: eine verstümmelte pruefung-Zeile macht das Gate ROT — und die Entschärfung wieder GRÜN",
    "[Konformitäts-Wächter] Positivkontrolle YAML-Form: eine verstümmelte pruefung-Zeile macht das Gate ROT — und die Entschärfung wieder GRÜN",
  ] },
  "tests/adr-praefix-ratsche-pruefen.test.js": { grund: GIT, tests: [
    "[ADR-Ratsche] --arbeitsstand: der Arbeitsbaum fügt gegen den Vorfahren mit origin/u2-kanon keine neue präfixlose ADR-Nummer hinzu",
    "[ADR-Ratsche] Basis nach einem Rebase: alter Remote-Stand kein Vorfahr → Vorfahr mit dem Kanon",
  ] },
  "tests/adr-referenzen-waechter.test.js": { grund: BESTAND, tests: [
    "[ADR-Referenzen-Wächter] Negativkontrolle: die unveränderte Kopie lässt das Gate grün",
    "[ADR-Referenzen-Wächter] das echte Produkt trägt heute keine unbekannte ADR-Referenz",
  ] },
  "tests/ausgabewege-proben.test.js": { grund: BESTAND, tests: [
    "[Ausgabewege·Proben] jeder Ausgabeweg des Inventars ist an eine Probe am Artefakt gebunden, oder als Lücke benannt",
    "[Ausgabewege·Proben·Rot-Beweis] ein neuer Weg ohne Bindung, eine veraltete Bindung, ein fehlender Titel und eine unbegründete Lücke werden gefunden",
    "[Ausgabewege·Proben·Formate] jedes Format der Export-Registry hat eine Probe am Inhalt, und die Bindung nennt kein Format, das es nicht gibt",
  ] },
  "tests/aussagen-register-und-waechter.test.js": { grund: BESTAND, tests: [
    "[W-aussagen] die Träger werden GEFUNDEN, nicht aufgezählt — auch die Anwendungen",
  ] },
  "tests/build-dateipruefsumme.test.js": { grund: BESTAND, tests: [
    "[Dateiprüfsumme] echte vivodepot.html + echte vivodepot.html.sha256: keine Drift (Positivkontrolle des Ist-Zustands)",
  ] },
  "tests/dateisatz-parst.test.js": { grund: BESTAND, tests: [
    "[Dateisatz] jede ausgelieferte Datei ist gültig — JS parst, JSON parst",
  ] },
  "tests/docx-streichung-gegenprobe.test.js": { grund: GIT, tests: [
    "[Zug3.1·Rot-Beleg am Gegenstand] der Kern VOR der Streichung liest window.docx, der heutige nicht",
    "[Zug3.1·DIE GEGENPROBE] PDF, Datensatz und QR tragen unverändert — kein Feld verschwindet",
  ] },
  "tests/dod-v1-rezept-zu-artefakt-pruefen.test.js": { grund: BESTAND, tests: [
    "[Rezept-zu-Artefakt·privat-de] das AUS DEM REZEPT gebaute Produkt trägt alle 13 nativen Bereiche",
    "[Rezept-zu-Artefakt·privat-en] das AUS DEM REZEPT gebaute Produkt trägt alle 13 nativen Bereiche",
    "[Rezept-zu-Artefakt·pro-de] das AUS DEM REZEPT gebaute Produkt trägt genau die sieben Pro-Bereiche",
    "[Rezept-zu-Artefakt·pro-en] das AUS DEM REZEPT gebaute Produkt trägt genau die sieben Pro-Bereiche",
    "[Rezept-zu-Artefakt·Rot-Beweis] eine verschobene Zutaten-Prüfsumme im Rezept wird abgewiesen",
  ] },
  "tests/dokumente-rechtsraum-umzug-rundlauf.test.js": { grund: GIT, tests: [
    "[U2-ADR-NNN2·Rundlauf] .rechtsraumKatalog: alter Bündel-Inhalt === Inhalt des DE-Moduls tools/rechtsraum-de-modul.json (Gerüst-Schnitt S3)",
    "[U2-ADR-NNN2·Rundlauf] .dokumente: alter Bündel-Inhalt === neuer AB_WERK_DOKUMENTE_DE-Inhalt (beide voll gebootet)",
    "[U2-ADR-NNN2·Rundlauf] die drei Motoren-Konstanten (PV_BMJ/VOLLMACHT_BMJ/KI_KORPUS) tragen nach der Materialisierung dieselben Schritte wie am alten Kanon",
  ] },
  "tests/druckt-rot-ohne-exit-klasse.test.js": { grund: BESTAND, tests: [
    "[Klasse·druckt ✗/ROT·Positivkontrolle] der Suchraum ist besetzt, und die Positivliste führt nur noch Werkzeuge, die es gibt und die diese Bauform wirklich tragen",
  ] },
  "tests/englische-kennungen-regionen-ausnahmen-lebendig.test.js": { grund: BESTAND, tests: [
    "[Regionen-Lebendigkeit·Ratsche] jeder heute tote/wirkungslose Anker steht namentlich in der Grundlinie — kein neuer, keiner heimlich verschwunden",
  ] },
  "tests/faktenbasis-aktualitaet.test.js": { grund: BESTAND, tests: [
    "[Wächter] node tools/faktenbasis-erzeugen.js --check ist heute grün (Exit 0) — gegen die echte docs/faktenbasis.md",
    "[Zurückgenommen] dieselbe Temp-Datei ohne Manipulation ist wieder grün",
  ] },
  "tests/faktenbasis-check-nennt-die-zeile.test.js": { grund: BESTAND, tests: [
    "[Werkzeug · Rot-Beweis · nicht messbar] ein nicht ladbares Wächter-Register ist NICHT MESSBAR, mit Zeile und Grund, Exit 1",
  ] },
  "tests/bindung-pruefen.test.js": { grund: BESTAND, tests: [
    "bindung-098-nachtrag-gemeinsame-pruefung: Fundament löst Punkt 1/2/4 ein und jede Bindung nutzt es",
  ] },
  "tests/faktenbasis-erzeugen.test.js": { grund: GIT, tests: [
    ["[ADR-Register] doppelt vergebene Nummern (Nachtrag-Dateien) bleiben als zwei Einträge erhalten", BESTAND],
    "[Rot⇄Grün] nach Wiederherstellung der echten Datei stimmt --check wieder überein",
    "[Faktenbasis·Commit] ein gelandeter Commit steht nackt, ein ungepushter trägt seinen Vermerk",
  ] },
  "tests/faktenbasis-ohne-suite.test.js": { grund: BESTAND, tests: [
    "[Gegenprobe] --ohne-suite gegen eine unveränderte Datei bleibt --check-grün",
  ] },
  "tests/git-umgebung-pflicht.test.js": { grund: BESTAND, tests: [
    "[U2-ADR-232·dritte-Pruefung] der echte Bestand traegt keine NEUE git-Aufrufstelle cwd: REPO ohne env-Option",
  ] },
  "tests/git-umgebung-pruefen.test.js": { grund: BESTAND, tests: [
    "[Git-Umgebung·Gate] der echte Bestand (tests/, tools/, scripts/) weicht nicht von der Grundlinie ab",
    "[Git-Umgebung·Positivkontrolle] die 32 `repoOhneEnv`-Dateien tragen wirklich eine Fundstelle — die Grundlinie ist kein Leerlauf",
  ] },
  "tests/gitignoriert-pruefen.test.js": { grund: BESTAND, tests: [
    "[gitignoriert-pruefen] ein Pfad unter einem real gitignorierten Verzeichnis gilt als absichtlich ausgeschlossen",
  ] },
  "tests/handkopien-gegen-original.test.js": { grund: BESTAND, tests: [
    "[U2-ADR-262] jede geführte Handkopie stimmt mit ihrem Original überein",
    "[U2-ADR-262 · Gegenprobe] `schreiber` ist eine benannte, keine stille Ausnahme",
  ] },
  "tests/hooks-laufen-wirklich.test.js": { grund: BESTAND, tests: [
    "[Hooks] core.hooksPath zeigt ins eigene Arbeitsverzeichnis, und die Hooks sind die versionierten",
  ] },
  "tests/invarianten-register.test.js": { grund: BESTAND, tests: [
    "[Invarianten-Register] das echte Register ist stimmig: Proben geöffnet und auffindbar, Grundlinie exakt",
    "[Invarianten-Register·CLI] ohne Argument: Exit 0 und die ungemessene Hälfte steht in der Ausgabe",
  ] },
  "tests/kennung-vorkommen-finden.test.js": { grund: BESTAND, tests: [
    "[Bestand] alle umbenannten Codes: jeder Treffer ist geführt, keine Grundlinie veraltet",
  ] },
  "tests/kern-html-path-absicht.test.js": { grund: BESTAND, tests: [
    "[Absicht·Ratsche] die Grundlinie führt nur Dateien, die es noch gibt und die weiter ohne Absicht sind — Abgänge werden gestrichen",
  ] },
  "tests/krypto-block-propagation.test.js": { grund: GIT, tests: [
    "[Klasse-A] W-Hüllenschicht: das echte Repo ist vollständig propagiert",
  ] },
  "tests/leere-messung-suchen.test.js": { grund: BESTAND, tests: [
    "[2.1] die echte Fassung von katalogbindung-messen.js ist sauber — der Fall ist behoben",
  ] },
  "tests/migration-stufen.test.js": { grund: BESTAND, tests: [
    "[Deckung] Stufen mit `geprueftIn` zeigen auf eine Datei, die es gibt",
  ] },
  "tests/mit-modul/fremdparser-fehlt-wird-rot.test.js": { grund: BESTAND, tests: [
    "[Fremdmodul·Ausbeute] die Suche findet die bekannten Fremdparser und ihre Nutzer",
  ] },
  "tests/modul-app-signieren-und-packen.test.js": { grund: BESTAND, tests: [
    "[Merkdatei] die echte MERKDATEI ist gitignored",
  ] },
  "tests/pro-struktur-wie-privat.test.js": { grund: GIT, tests: [
    "[B1·Tabelle] die Tabelle ist frisch aus ihren Quellen erzeugt und reist in der eingebackenen Region mit",
  ] },
  "tests/pruefstand-bindung.test.js": { grund: BESTAND, tests: [
    "pruefstand-jede-klausel-zeile-ist-lesbar",
    "pruefstand-jeder-waechter-hat-eine-probe",
    "pruefstand-klassen-werden-bei-jedem-lauf-gerechnet",
    "pruefstand-jede-probe-wird-vom-waechter-benutzt",
    "[Negativprobe] Meta A: blinder Waechter -> Zaehler 0 -> Pruefstand rot (und zurueck gruen)",
    "[Negativprobe] Meta B: Probe zeigt auf eine fremde Funktion -> Pruefstand rot",
  ] },
  "tests/register-zahl-nicht-gepinnt.test.js": { grund: BESTAND, tests: [
    "[Register-Zahl] kein Test pinnt die Zahl der Register, und die Beispielliste steht nur in tests/helfer/register-beispiele.js",
  ] },
  "tests/rezepte-schnitt-kern-heben-check.test.js": { grund: BESTAND, tests: [
    "[Rezept-Fixtures·Check] der eingecheckte Stand passt zum Kern (Exit 0)",
  ] },
  "tests/rohe-steuerzeichen-pruefen.test.js": { grund: GIT, tests: [
    "[Steuerzeichen-Ratsche] --arbeitsstand: der Arbeitsbaum fügt gegen den Vorfahren mit origin/u2-kanon keine neue Zeile mit rohem Steuerzeichen hinzu",
    "[Steuerzeichen-Ratsche] Basis nach einem Rebase: alter Remote-Stand kein Vorfahr → Vorfahr mit dem Kanon",
  ] },
  "tests/stumme-zurueckweisung-waechter.test.js": { grund: BESTAND, tests: [
    "[Klassenwächter] der echte Bestand entspricht der Grundlinie: jede Stelle hat eine Spur oder steht mit Grund da",
    "[Klassenwächter·Rot-Beweis] die Vergleichsgrundlage ist grün (sonst beweisen die roten Fälle nichts)",
    "[Klassenwächter·CLI] ohne Argument grün gegen das Repo; --wurzel mit einer stummen Stelle Exit 1 und der Ort im Fund",
  ] },
  "tests/u2-adr-257-format-schreiber.test.js": { grund: GIT, tests: [
    "[U2-ADR-257·A] ein Bestandsmodul OHNE schreiber erzeugt byte-identisch denselben Text wie vor dem Zug",
    "[U2-ADR-257·A] der Kern von vorher kennt den Schlüssel `schreiber` NICHT — sonst misst Gruppe A nichts",
  ] },
  "tests/vier-produkte-orte.test.js": { grund: BESTAND, tests: [
    "[U2-ADR-386] HEUTE: genau die drei namentlich genannten Orte tragen die Zusammensetzung — nicht mehr, nicht weniger",
  ] },
  "tests/wahrhaftigkeit-fristen.test.js": { grund: BESTAND, tests: [
    "[Block5] Negativkontrolle: die unveränderte Kopie lässt das Gate grün",
    "[Block5] Positivkontrolle: eine erfundene „Alle 12 Monate\" macht das Gate ROT",
    "[Block5] das echte Produkt trägt keine unklassifizierte Aussage (Grundlinie aktuell)",
  ] },
  "tests/wizard-optionen-aus-materialisieren-u2-adr-341.test.js": { grund: GIT, tests: [
    "[U2-ADR-341 · Rot-Beweis 1] A1b real vollzogen: Optionen byte-gleich zum Kern VOR dem Umzug (Commit-Vergleich)",
  ] },
};

function istOeffentlich(repo = REPO) {
  return !fs.existsSync(path.join(repo, MARKE));
}

function testMitPrivat(datei, { repo = REPO, nodeTest = require('node:test').test } = {}) {
  const rel = path.relative(repo, datei).split(path.sep).join('/');
  const eintrag = NUR_PRIVAT[rel];
  const oeffentlich = istOeffentlich(repo);
  const huelle = (name, ...rest) => {
    // Ein Test steht als Name (Grund des Eintrags) oder als [Name, Grund], wenn er einen eigenen Grund hat.
    const treffer = eintrag && eintrag.tests.find((t) => (Array.isArray(t) ? t[0] : t) === name);
    if (treffer && oeffentlich) {
      const fn = rest.pop();
      const opt = rest[0] && typeof rest[0] === 'object' ? rest[0] : {};
      return nodeTest(name, { ...opt, skip: 'läuft nur im privaten Repo: ' + (Array.isArray(treffer) ? treffer[1] : eintrag.grund) }, fn);
    }
    return nodeTest(name, ...rest);
  };
  return Object.assign(huelle, nodeTest);
}

module.exports = { testMitPrivat, istOeffentlich, NUR_PRIVAT, DECKEL, MARKE, GIT, BESTAND, ZUSCHNITT };
