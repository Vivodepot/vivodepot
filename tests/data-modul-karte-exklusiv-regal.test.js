'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   `data-modul-karte` gehört EXKLUSIV der Regal-Karte

   FUND (Konvoi, 07.09.2026): C2s Template-Verzeichnis in der Seitenleiste
   verdrahtete seine Einträge ursprünglich über dieselbe Kennung wie die
   Regal-Karte (vorsorgeRegalHTML()/logikModuleAlsKarten()). Ein Template stand
   damit ZWEIMAL im DOM unter demselben Selektor — Playwright brach mit „strict
   mode violation: resolved to 2 elements", fünf Proben wurden rot (u. a.
   erbschein-en-mechanik-durchgang, 10-verdrahtung-charakterisierung). Behoben
   im Produktcode: das Verzeichnis trägt seither `data-modul-verzeichnis`.

   DIESER WÄCHTER verhindert die Wiederkehr — nicht nur für C2, sondern für
   JEDEN künftigen zweiten Ort, der ein logikModul zeigt: `data-modul-karte`
   darf nur innerhalb der beiden legitimen Funktionen vorkommen, die die
   Kennung SETZEN (vorsorgeRegalHTML) bzw. LESEN (verdrahteSektorAktionen,
   `c.querySelector('[data-modul-karte="…"]')`). Jedes Vorkommen ausserhalb ist
   ein zweites Element mit derselben Kennung — genau der Fund von oben.

   Geprüft wird die literale Zeichenfolge `data-modul-karte="` (mit
   schliessendem `="`) im UNVERÄNDERTEN Quelltext, nicht der maskierte Text:
   die Kennung steht als STRING-Literal im Code selbst (`'…data-modul-karte="'
   + …`), eine Kommentar-/String-Maskierung (wie `ohneKommentareUndStrings`)
   würde genau die gesuchte Stelle mit verdecken. Prosa-Erwähnungen in
   Kommentaren („`data-modul-karte` gehört …") tragen kein `="` und zählen
   darum nicht mit — gemessen, nicht angenommen (s. Positivkontrolle unten).

   Klammernzählen wie in tests/ladeweg-fragt-kein-zertifikat.test.js
   (funktionsRumpf) — hier gegen den UNMASKIERTEN Quelltext, aus demselben
   Grund wie oben.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { HTML_PATH } = require('./load-kern.js');

const KENNUNG = 'data-modul-karte="';
const EIGENTUEMER = ['vorsorgeRegalHTML', 'verdrahteSektorAktionen'];

// Klammernzählen ab `function <name>(` im UNMASKIERTEN Quelltext. Liefert den Bytebereich
// [start, ende) des Funktionsrumpfs (inklusive der Klammern selbst).
function funktionsBereich(quelle, name) {
  const muster = new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(');
  const treffer = muster.exec(quelle);
  if (!treffer) return null;
  const klammerStart = quelle.indexOf('{', treffer.index + treffer[0].length);
  if (klammerStart < 0) return null;
  let tiefe = 0, i = klammerStart;
  for (; i < quelle.length; i++) {
    if (quelle[i] === '{') tiefe++;
    else if (quelle[i] === '}') { tiefe--; if (tiefe === 0) { i++; break; } }
  }
  return { start: treffer.index, ende: i };
}

// Alle Fundstellen der Kennung als Byte-Index, gegen die übergebenen Bereiche geprüft.
function fundstellenAusserhalb(quelle, bereiche) {
  const raus = [];
  let i = quelle.indexOf(KENNUNG);
  while (i >= 0) {
    const gedeckt = bereiche.some((b) => b && i >= b.start && i < b.ende);
    if (!gedeckt) raus.push(i);
    i = quelle.indexOf(KENNUNG, i + 1);
  }
  return raus;
}

test('[data-modul-karte·exklusiv] echter Bestand: keine Fundstelle ausserhalb Regal-Karte/Verdrahtung', () => {
  const quelle = fs.readFileSync(HTML_PATH, 'utf8');
  const bereiche = EIGENTUEMER.map((n) => funktionsBereich(quelle, n));
  for (let k = 0; k < EIGENTUEMER.length; k++) {
    assert.ok(bereiche[k], 'Funktion "' + EIGENTUEMER[k] + '" nicht gefunden — Klammernzählung oder Name geprüft?');
  }
  // Positivkontrolle im selben Lauf: die Kennung muss ÜBERHAUPT vorkommen — sonst wäre eine
  // leere Fundmenge nicht von echtem Grün zu unterscheiden.
  assert.ok(quelle.includes(KENNUNG), 'die Kennung selbst kommt im Bestand nicht mehr vor — Wächter prüft dann nichts');
  const raus = fundstellenAusserhalb(quelle, bereiche);
  assert.deepEqual(raus, [],
    raus.length + ' Fundstelle(n) außerhalb von ' + EIGENTUEMER.join('/') + ' — dieselbe Kennung an einem zweiten '
    + 'Ort bricht Playwright mit „strict mode violation" (s. Kommentar am Dateikopf)');
});

test('[data-modul-karte·exklusiv·Rot-Beweis] eine gepflanzte zweite Stelle wird gefunden', () => {
  const quelle = fs.readFileSync(HTML_PATH, 'utf8');
  const bereiche = EIGENTUEMER.map((n) => funktionsBereich(quelle, n));
  // Pflanzung NACH dem letzten Funktionsende — garantiert ausserhalb jedes Eigentümer-Bereichs,
  // unabhängig davon, wo im Kern die Funktionen selbst gerade stehen.
  const einfuegePunkt = Math.max(...bereiche.map((b) => b.ende));
  const verseucht = quelle.slice(0, einfuegePunkt)
    + "\nfunction _pruefstand_pflanzung() { return '<button data-modul-karte=\"geplant\">'; }\n"
    + quelle.slice(einfuegePunkt);
  const raus = fundstellenAusserhalb(verseucht, EIGENTUEMER.map((n) => funktionsBereich(verseucht, n)));
  assert.equal(raus.length, 1, 'die gepflanzte zweite Stelle muss GENAU EINMAL gefunden werden — sonst zählt der Wächter nicht mit');
});
