#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   anzeigetexte-orten.js — „Die abgelöste Farbe, und SITUATIONEN zu
   Ende" (17.08.2026), Zug 3.
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE: `vivodepot.html` trägt nach dem Textsatz-Umbau immer noch
   `label:`- und `titel:`-Zuweisungen. **Wo sitzen sie, und ist es Anzeigetext
   oder ein technischer Bezeichner?**

   DER ZÄHLGEGENSTAND (§7): Zuweisungen der Form `<schlüssel>: '<text>'` im CODE
   (Kommentare vorher längentreu maskiert), deren Schlüssel auf `label`, `titel`,
   `hint`, `beispiel`, `platzhalter` oder `einfuehrung` endet — auch
   zusammengesetzte wie `gruppenTitel` oder `knopfLabel`.

   DIE ORTUNG IST MECHANISCH: jeder Fundstelle wird die zuletzt DAVOR stehende
   Deklaration auf oberster Ebene zugeordnet (`^const NAME =` / `^let NAME =` /
   `^function name(`). Das ist keine Interpretation, sondern eine Position.

   WARUM DAS NICHT `grep -c` IST: `grep -c` zählt ZEILEN mit Treffer, nicht
   Treffer. Am 17.08. standen im Auftragstext 670 `label:` und 116 `titel:`;
   dieselbe Datei liefert mechanisch 685 Zeilen bzw. 767 Vorkommen für `label:`
   und 210 bzw. 208 für `titel:`. **Drei Zahlen für denselben Gegenstand, je
   nach Zählweise** — deshalb steht die Zählweise hier und nicht im Bericht.

   AUFRUFE
     node tools/anzeigetexte-orten.js            Tabelle nach Ort
     node tools/anzeigetexte-orten.js --json     maschinenlesbar
     node tools/anzeigetexte-orten.js --ort X    die Fundstellen EINES Ortes
     node tools/anzeigetexte-orten.js --datei vivodepot-lesen.html
                                                dieselbe Messung an einer anderen
                                                ausgelieferten Anwendung

   BLIND-FLECK-FIX (Schnitt-Nachtrag, 18.09.2026, s. tools/lib/kern-lesen.js):
   `messen()` las die Repo-Wurzel-vivodepot.html vorher ROH — seit dem Schnitt
   liefert das ein leeres Gerüst für die aus tools/bereich-templates/*.json
   gebackenen Regionen. Jetzt gebacken (`kernGebackenLesen()`).

   MUSTERLÜCKE GESCHLOSSEN (Schnitt-Reparatur, 18.09.2026): gebackene Bereiche/Module liegen als
   JSON-Literal vor (`"label":"…"`, gequoteter Schlüssel), DER ZÄHLGEGENSTAND (§7) verlangte aber
   ursprünglich nur die JS-Literal-Form (`label: '…'`, Schlüssel unquotiert). Gemessen vor dem
   Fix: 74 JSON-quotierte label/titel/… im rohen Gerüst (schon vorher unsichtbar), 494 im
   gebackenen Stand — die gebackenen Bereiche tragen ganz überwiegend die JSON-Form. `SCHLUESSEL`
   unten erkennt jetzt BEIDE Formen: der Schlüssel selbst trägt optionale Anführungszeichen
   (`"?`), alles andere — Wert-Extraktion, `optionen`-Nachbarschaft, `art()`-Klassifikation —
   bleibt unverändert, weil es nie an der Quotierung des SCHLÜSSELS hing, nur an der des WERTS
   (die war für beide Formen schon immer gleich behandelt). Die historischen 670/116
   (17.08.2026, vor dem Schnitt) galten einem Bestand, der nur die JS-Literal-Form kannte — kein
   Widerspruch, ein anderer Bestand. Gegenprobe: tests/anzeigetexte-orten.test.js. */
const path = require('node:path');
const { _maskiereKommentare } = require('./textsatz-umstellen.js');
const { kernGebackenLesen } = require('./lib/kern-lesen.js');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');

// `"?` um Präfix UND Schlüsselwort — NICHT als eigene Gruppe (die Nummerierung m[2]/m[3]/m[4]
// unten bleibt dieselbe wie vor dem Fix, JS- wie JSON-Form landen in denselben Gruppen).
const SCHLUESSEL = /(^|[^A-Za-z])"?([A-Za-z_$][A-Za-z0-9_$]*)?(label|titel|hint|beispiel|platzhalter|einfuehrung|Label|Titel|Hint|Beispiel|Platzhalter|Einfuehrung)"?\s*:\s*(['"])/g;

/* Die Deklarationen oberster Ebene — die Orte. Eine Zuweisung gehört zu der
   Deklaration, die ihr am nächsten VORAUSGEHT. */
function orte(text) {
  const raus = [];
  const re = /^(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)|^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m;
  while ((m = re.exec(text)) !== null) raus.push({ name: m[1] || m[2], pos: m.index });
  return raus;
}

function ortFuer(orteListe, pos) {
  let links = 0, rechts = orteListe.length - 1, treffer = null;
  while (links <= rechts) {
    const mitte = (links + rechts) >> 1;
    if (orteListe[mitte].pos <= pos) { treffer = orteListe[mitte]; links = mitte + 1; } else rechts = mitte - 1;
  }
  return treffer ? treffer.name : '(vor der ersten Deklaration)';
}

/* IST ES ANZEIGETEXT ODER EIN BEZEICHNER? Die Unterscheidung ist der ganze Zug.
   Sie wird NICHT geraten, sondern an drei mechanischen Merkmalen entschieden —
   und wo keines greift, steht `unklar`, nicht eine Vermutung.

     bezeichner  der Wert sieht aus wie eine Kennung: keine Leerzeichen, keine
                 Umlaute, kleingeschrieben oder durchgehend groß, mit `-`/`_`
                 (`'vorsorgevollmacht'`, `'C1E'`, `'tpl_x'`).
     anzeigetext der Wert trägt ein Leerzeichen ODER einen Umlaut/ß ODER ein
                 Satzzeichen — beides zusammen kommt in Kennungen nicht vor.
     unklar      ein einzelnes großgeschriebenes Wort ohne beides
                 (`'Reisepass'` wäre Anzeigetext, `'Bank'` könnte beides sein).

   EINE AUSNAHME, DIE DIE FORM NICHT HERGIBT: in einem `optionen`-Eintrag
   (`{ wert: 'ledig', label: 'ledig' }`) ist das `label` **immer** Anzeigetext —
   auch wenn es wie eine Kennung aussieht. „ledig", „weiblich", „verheiratet"
   sind deutsche Wörter, die eine Bürgerin liest; sie sind nur zufällig
   kleingeschrieben und einwortig. Erkannt wird das an der Nachbarschaft:
   ein `wert:` im selben Objektliteral. **Ohne diese Ausnahme zählte die
   Messung 106 Anzeigetexte in `SEKTOREN` als Bezeichner** — die Form allein
   trägt hier nicht, die Position schon. */
function art(wert, inOptionen) {
  if (inOptionen) return 'anzeigetext';
  if (/[\s]/.test(wert) && /[A-Za-zÄÖÜäöü]/.test(wert)) return 'anzeigetext';
  if (/[äöüßÄÖÜ.,!?—–:()„"]/.test(wert)) return 'anzeigetext';
  if (/^[a-z0-9_-]+$/.test(wert) || /^[A-Z0-9_-]+$/.test(wert)) return 'bezeichner';
  return 'unklar';
}

// Gegenprobe (18.09.2026), unabhängig von SCHLUESSEL: zählt JSON-quotierte
// label/titel/…-Schlüssel roh, ohne Präfix-Wörter, ohne Klassifikation — eine zweite,
// simplere Messung desselben Gegenstands. Weicht sie von der Zahl der JSON-quotierten
// Funde in `funde` ab, hat SCHLUESSEL selbst eine Lücke — genau die Art Fehler, die
// diesen Zug ausgelöst hat, hier strukturell gegengeprüft statt nur einmal behauptet.
const SCHLUESSEL_JSON_ROH = /"(?:[A-Za-z_$][A-Za-z0-9_$]*)?(label|titel|hint|beispiel|platzhalter|einfuehrung)"\s*:/gi;
function jsonFormRohZaehlen(code) {
  let n = 0;
  SCHLUESSEL_JSON_ROH.lastIndex = 0;
  while (SCHLUESSEL_JSON_ROH.exec(code) !== null) n++;
  return n;
}

/* REIN/testbar — nimmt bereits kommentarmaskierten Code entgegen, liest keine Datei.
   Der ganze Fund-Aufbau, herausgelöst aus messen(), damit eine Probe synthetischen Code
   ohne kernGebackenLesen()/Dateisystem prüfen kann. */
function _findenInCode(code) {
  const orteListe = orte(code);
  const funde = [];
  SCHLUESSEL.lastIndex = 0;
  let m;
  while ((m = SCHLUESSEL.exec(code)) !== null) {
    const quote = m[4];
    const start = m.index + m[0].length;
    // Wert bis zum nächsten unmaskierten Anführungszeichen derselben Art.
    let i = start, wert = '';
    while (i < code.length) {
      if (code[i] === '\\') { wert += code[i + 1] || ''; i += 2; continue; }
      if (code[i] === quote) break;
      wert += code[i]; i++;
    }
    const schluessel = (m[2] || '') + m[3];
    // Quotiert war der SCHLÜSSEL, wenn direkt nach dem Präfix-Zeichen ein `"` steht —
    // dieselbe Stelle, an der die JS-Form kein `"` hätte.
    const quotiert = m[0][m[1].length] === '"';
    // Nachbarschaft: ein `wert:` im selben Objektliteral (rückwärts bis zur öffnenden Klammer).
    const davor = code.slice(Math.max(0, m.index - 200), m.index);
    const klammer = davor.lastIndexOf('{');
    const inOptionen = klammer >= 0 && /\bwert\s*:/.test(davor.slice(klammer));
    funde.push({
      schluessel, wert, inOptionen, quotiert,
      ort: ortFuer(orteListe, m.index),
      zeile: code.slice(0, m.index).split('\n').length,
      art: art(wert, inOptionen),
    });
  }
  return funde;
}

function messen(datei) {
  const roh = kernGebackenLesen(datei ? path.join(REPO, datei) : KERN);
  const code = _maskiereKommentare(roh);
  return _findenInCode(code);
}

function main() {
  const argv = process.argv.slice(2);
  const dIdx = argv.indexOf('--datei');
  const datei = (dIdx >= 0 && argv[dIdx + 1]) ? argv[dIdx + 1] : null;
  const funde = messen(datei);
  if (datei) console.log('Datei: ' + datei);

  // Gegenprobe (18.09.2026): die unabhängige Roh-Zählung muss zur Zahl der JSON-quotierten
  // Funde passen — sonst eine STILLE Lücke, dieselbe Fehlerklasse wie die, die diesen Zug
  // ausgelöst hat. Auf stderr, damit --json auf stdout maschinenlesbar bleibt.
  const rohFuerZaehlung = kernGebackenLesen(datei ? path.join(REPO, datei) : KERN);
  const jsonRoh = jsonFormRohZaehlen(_maskiereKommentare(rohFuerZaehlung));
  const jsonErfasst = funde.filter((f) => f.quotiert).length;
  if (jsonRoh !== jsonErfasst) {
    process.stderr.write(
      `[anzeigetexte-orten] GEGENPROBE ROT: ${jsonRoh} JSON-quotierte Schlüssel roh gezählt, ` +
      `aber nur ${jsonErfasst} als Fund erfasst — SCHLUESSEL hat eine Lücke.\n`);
    process.exitCode = 1;   // 21.09.2026: eine Gegenprobe, die rot wird, darf nicht mit 0 enden (main läuft nur als CLI; `messen` bleibt für die Proben)
  }
  process.stderr.write(
    `[anzeigetexte-orten] ${funde.length} Funde gesamt (${funde.length - jsonErfasst} JS-Form, ` +
    `${jsonErfasst} JSON-Form) — Gegenprobe ${jsonRoh === jsonErfasst ? 'grün' : 'ROT, s. o.'}.\n`);

  const ortIdx = argv.indexOf('--ort');
  if (ortIdx >= 0 && argv[ortIdx + 1]) {
    for (const f of funde.filter((x) => x.ort === argv[ortIdx + 1])) {
      console.log(`${String(f.zeile).padStart(6)}  ${f.art.padEnd(12)} ${f.schluessel.padEnd(16)} ${JSON.stringify(f.wert).slice(0, 70)}`);
    }
    return;
  }
  if (argv.includes('--json')) { console.log(JSON.stringify(funde, null, 1)); return; }

  const nachOrt = new Map();
  for (const f of funde) {
    if (!nachOrt.has(f.ort)) nachOrt.set(f.ort, { ort: f.ort, gesamt: 0, anzeigetext: 0, bezeichner: 0, unklar: 0 });
    const e = nachOrt.get(f.ort);
    e.gesamt++; e[f.art]++;
  }
  const zeilen = Array.from(nachOrt.values()).sort((a, b) => b.gesamt - a.gesamt);
  console.log('Ort'.padEnd(38) + 'gesamt'.padStart(8) + 'Anzeigetext'.padStart(13) + 'Bezeichner'.padStart(12) + 'unklar'.padStart(8));
  for (const z of zeilen.filter((x) => x.gesamt >= 3)) {
    console.log(z.ort.slice(0, 37).padEnd(38) + String(z.gesamt).padStart(8)
      + String(z.anzeigetext).padStart(13) + String(z.bezeichner).padStart(12) + String(z.unklar).padStart(8));
  }
  const klein = zeilen.filter((x) => x.gesamt < 3);
  const summe = (k) => zeilen.reduce((n, z) => n + z[k], 0);
  console.log(`(${klein.length} weitere Orte mit je unter 3 Fundstellen, zusammen ${klein.reduce((n, z) => n + z.gesamt, 0)})`);
  console.log('— GESAMT —'.padEnd(38) + String(summe('gesamt')).padStart(8)
    + String(summe('anzeigetext')).padStart(13) + String(summe('bezeichner')).padStart(12) + String(summe('unklar')).padStart(8));
}

if (require.main === module) main();
module.exports = { messen, art, _findenInCode, jsonFormRohZaehlen };
