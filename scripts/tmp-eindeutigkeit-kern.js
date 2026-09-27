'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Tmp-Eindeutigkeit — der gemeinsame Kern (U2-ADR-225)
   ────────────────────────────────────────────────────────────────────────
   Befund und Bauplan liegen intern, beide vom 02.09.2026.

   Zwölf Stellen im Bestand bildeten Temp-Dateinamen als wörtlich feste
   Zeichenketten in `os.tmpdir()` — bei parallel laufenden Arbeitsbäumen
   kollidieren zwei unabhängige Läufe auf demselben Pfad. Dieser Wächter
   verhindert, dass eine NEUE Stelle denselben Fehler wiederholt.

   DIE REGEL, bewusst einfach (keine Schreib-Erkennung, kein Datenfluss über
   Funktionsgrenzen): eine Zeile bildet einen Temp-Pfad, wenn sie
   `tmpdir()` gefolgt von Komma und Anführungszeichen/Backtick trägt, UND
   keines von `mkdtempSync`/`process.pid`/`workerIndex`/`Date.now()`/
   `Math.random()` auf DERSELBEN Zeile steht. Eine Analyse, ob der
   gebildete Pfad je an einen echten Schreibaufruf geht, bräuchte
   Datenfluss-Verfolgung — genau das, wovor der Befund selbst warnt (Fall
   `hooks-laufen-wirklich.test.js:133`, Pfad wird nur durchgereicht).

   GRUNDLAGE: `git ls-files` (nicht ein Verzeichnis-Scan) — gitignorierte
   Dateien (`tests/offen-bei-leser.test.js`, `tests/arbeitsliste-standform.test.js`)
   erscheinen darin nicht, ohne eigene Ausnahmezeile im Wächter-Code.

   AUSNAHMELISTE: ortsgebunden (Datei + Zeile wörtlich), kein Freifahrtschein
   für das Textmuster an anderer Stelle.
   ════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('node:child_process');

const TMP_MUSTER = /tmpdir\(\)\s*,\s*[`'"]/;
const AUSSCHLUSS_MUSTER = /mkdtempSync|process\.pid|workerIndex|Date\.now\(\)|Math\.random\(\)/;

/* Ortsgebunden, nicht als Muster: `hooksBefund` bekommt den Pfad nur als
   Argument, schreibt nie (s. Bauplan Abschnitt 4). Der Eintrag zu
   `waechter-register.js` ist kein zweiter Fall derselben Art, sondern
   Selbstbezug (s. SELBSTBEZUG unten) an einer einzelnen Zeile, nicht der
   ganzen Datei — dort steht kein Fixtur-Testtitel, sondern ein
   Register-`lauf()`, der dieselbe Fixtur wörtlich braucht. */
const AUSNAHMEN = [
  { datei: 'tests/hooks-laufen-wirklich.test.js', zeile: 133 },
  /* AN DEN INHALT GEBUNDEN, NICHT AN DIE ZEILE (U2-ADR-329, 06.09.2026).
     Die Vorgeschichte steht in den Nachzieh-Schritten: 2798 -> 2833 (U2-ADR-314),
     2833 -> 2836 (U2-ADR-323), und beim dritten Mal — ein neuer Register-Eintrag
     weiter oben — stand 2836 auf 2868. Jedes Mal derselbe mechanische Grund: eine
     Einfügung ÜBER der Zeile verschiebt sie, ohne dass sich ihr Inhalt ändert.
     Der Kommentar an dieser Stelle sagte es beim zweiten Mal selbst voraus; hier
     ist die Umstellung, die er verlangt.

     Der Inhalt ist der bessere Anker, weil er der Gegenstand IST: die Ausnahme
     gilt dieser einen Fixtur-Zeile im Register-`lauf()`, die die Verstoßform
     wörtlich braucht — nicht einem Ort in einer Datei. Verschwindet die Zeile,
     verfällt die Ausnahme von selbst; das prüft die Toten-Probe im Wächter-Test. */
  /* IN ZWEI STUECKEN GESCHRIEBEN, und das ist kein Schoenheitsfehler: stuende der
     Wortlaut hier an einem Stueck, traege diese Zeile selbst die Verstossform —
     der Waechter beanstandete seine eigene Ausnahmeliste. Der Ausweg waere sonst
     ein SELBSTBEZUG-Eintrag, der die GANZE Datei ausblendet; genau davor warnt der
     Kommentar dort. Der Umbruch setzt zwischen den Funktionsaufruf und das Komma,
     das ihm folgt — damit greift TMP_MUSTER auf keiner der beiden Zeilen, waehrend
     der zusammengesetzte Wert unveraendert bleibt. Auch dieser Kommentar meidet die
     Form aus demselben Grund.

     ⚠ NICHT ZUSAMMENFUEGEN. Die Zweiteilung sieht wie ein Versehen aus und ist
     keins: an einem Stueck geschrieben, traege diese Zeile die Verstossform selbst,
     und der Waechter beanstandete seine eigene Ausnahmeliste. Ein Formatierer, der
     die Stuecke zusammenzieht, bricht sie — und es faellt erst auf, wenn jemand
     ganz woanders arbeitet. Dagegen steht eine eigene Probe in
     tests/tmp-eindeutigkeit-waechter.test.js: der zusammengesetzte Wert muss
     bitgleich zum Original-Wortlaut sein. */
  { datei: 'tools/waechter-register.js',
    inhalt: "const pos = tmpVerstoesse({ 'tests/x.test.js': \"const t = path.join(os.tmpdir()"
      + ", 'fest.html');\" });" },
  /* TMP1 (Auftrag, 19.09.2026): vier Zeilen, ortsgebunden am Inhalt, nicht am
     Textmuster — keines der fünf erkannten Muster (mkdtempSync/process.pid/workerIndex/
     Date.now()/Math.random()) passt hier, weil der Pfad von ZWEI unabhängigen Prozessen
     gebraucht wird: der globalSetup-Prozess SCHREIBT ihn, jeder Playwright-Worker-Prozess
     (eigene PID) wertet dieselbe Konstante über require() erneut aus, um dieselbe Datei zu
     LESEN — ein zufälliger oder prozessgebundener Anteil wäre in beiden Prozessen
     verschieden. Die Eindeutigkeit kommt stattdessen aus einem Hash des Arbeitsbaum-Pfads
     (REPO_KENNUNG, s. tests/e2e/global-setup.js) — in BEIDEN Prozessen identisch, zwischen
     verschiedenen Arbeitsbäumen verschieden. Kopf-Kommentar an Ort und Stelle trägt die
     volle Begründung.
     ZWEIGETEILT wie die Ausnahme oben, aus demselben Grund: am Stück geschrieben, trüge
     jede dieser vier Zeilen selbst die Verstoßform — der Wächter beanstandete seine eigene
     Ausnahmeliste. NICHT ZUSAMMENFUEGEN. */
  { datei: 'tests/e2e/global-setup.js',
    inhalt: "'privat-de': path.join(os.tmpdir()"
      + ", `vivodepot-e2e-gebacken-${REPO_KENNUNG}-privat-de.html`)," },
  { datei: 'tests/e2e/global-setup.js',
    inhalt: "'privat-en': path.join(os.tmpdir()"
      + ", `vivodepot-e2e-gebacken-${REPO_KENNUNG}-privat-en.html`)," },
  { datei: 'tests/e2e/global-setup.js',
    inhalt: "'pro-de': path.join(os.tmpdir()"
      + ", `vivodepot-e2e-gebacken-${REPO_KENNUNG}-pro-de.html`)," },
  { datei: 'tests/e2e/global-setup.js',
    inhalt: "'pro-en': path.join(os.tmpdir()"
      + ", `vivodepot-e2e-gebacken-${REPO_KENNUNG}-pro-en.html`)," },
];

/* SELBSTBEZUG — eine Datei, namentlich, kein Muster (dasselbe Prinzip wie
   `tools/krypto-block-propagation-pruefen.js`). Der Wächter-Test MUSS die
   exakte Verstoßform als Fixtur-Zeichenkette enthalten — das ist sein
   Gegenstand, nicht sein Fehler. Ein Verzeichnismuster (`tests/*`) würde
   still eine ganze Ebene ausblenden. */
const SELBSTBEZUG = new Set(['tests/tmp-eindeutigkeit-waechter.test.js']);

/* Ein Eintrag bindet ENTWEDER an eine Zeilennummer ODER an den Zeileninhalt.
   Der Inhalt gewinnt, wo er steht: er überlebt jede Einfügung darüber. Die
   Zeilenbindung bleibt für Fälle, in denen der Inhalt selbst mehrfach vorkommt
   und erst der Ort ihn eindeutig macht. */
function istAusnahme(datei, zeile, inhalt) {
  return AUSNAHMEN.some((a) => a.datei === datei
    && (a.inhalt != null ? a.inhalt === String(inhalt).trim() : a.zeile === zeile));
}

/**
 * Der reine Kern — testbar ohne echtes Dateisystem.
 * `dateiInhalte`: { pfad: inhalt } oder Map(pfad -> inhalt).
 * Rückgabe: [{ datei, zeile, inhalt }] — jede Zeile, die einen festen
 * Temp-Pfad bildet und nicht auf der Ausnahmeliste steht.
 */
function tmpVerstoesse(dateiInhalte) {
  const eintraege = dateiInhalte instanceof Map ? [...dateiInhalte.entries()] : Object.entries(dateiInhalte || {});
  const verstoesse = [];
  for (const [datei, inhalt] of eintraege) {
    if (typeof inhalt !== 'string') continue;
    const zeilen = inhalt.split('\n');
    for (let i = 0; i < zeilen.length; i++) {
      const zeile = zeilen[i];
      const zeilenNr = i + 1;
      if (!TMP_MUSTER.test(zeile)) continue;
      if (AUSSCHLUSS_MUSTER.test(zeile)) continue;
      if (istAusnahme(datei, zeilenNr, zeile)) continue;
      verstoesse.push({ datei, zeile: zeilenNr, inhalt: zeile.trim() });
    }
  }
  return verstoesse;
}

/* GIT_*-Umgebung strippen: ein `git -C <anderswo>` läse sonst aus einem
   GIT_DIR/GIT_INDEX_FILE, das ein umgebender `pre-commit`-Lauf gesetzt hat,
   statt aus `wo` — isoliert grün, im echten Hook rot (Fund, U2-ADR-225). */
function ohneGitUmgebung() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
}

/* Listet über `git ls-files` — nur TRACKED, damit Gitignoriertes automatisch
   draussen bleibt (kein Schreiben auf das Dateisystem, kein `--others`). */
function jsDateienListen(wo) {
  const aus = execFileSync('git', ['-C', wo, 'ls-files', '-z', '--', '*.js', '*.mjs'],
    { maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() });
  return aus.toString('utf8').split('\0').filter(Boolean);
}

/* Liest jede über `git ls-files` gemeldete Datei relativ zu `wo` und prüft sie. */
function pruefeRepo(wo) {
  const fs = require('node:fs');
  const path = require('node:path');
  const dateien = jsDateienListen(wo);
  const inhalte = {};
  for (const rel of dateien) {
    if (SELBSTBEZUG.has(rel)) continue;
    try { inhalte[rel] = fs.readFileSync(path.join(wo, rel), 'utf8'); } catch { /* gelöscht seit ls-files, überspringen */ }
  }
  return tmpVerstoesse(inhalte);
}

module.exports = { tmpVerstoesse, jsDateienListen, pruefeRepo, AUSNAHMEN, SELBSTBEZUG, TMP_MUSTER, AUSSCHLUSS_MUSTER };
