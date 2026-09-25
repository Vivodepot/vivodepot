#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-de-nur-lateinisch-pruefen.js — U2-ADR-364 (Produktentscheidung über,
   07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: die Produktentscheidung öffnete das deutsche Produkt und fand im ersten Block
   (Vor-/Nachname) den Hinweistext „z. B. 王芳 statt Fang Wang" — chinesische
   Schriftzeichen in einem deutschen Depot. Ihr Urteil, wörtlich: „Im deutschen
   Depot sind die Feldbezeichnungen und alle anderen Texte deutsch." Das Beispiel
   ist ausgetauscht (Nagy Peter statt Peter Nagy, ungarisch, Familienname zuerst
   — dieselbe Funktion bleibt, nur das Beispiel wird lateinisch). DIESER Wächter
   ist der eigentliche Wert des Auftrags: er hält fest, dass der nächste Fall
   NICHT wieder selbst gefunden werden muss.

   WAS GEPRÜFT WIRD: jeder String-Wert in `tools/textsatz-de-modul.json`
   (dem „echten, andockbaren deutschen Sprachmodul", s.
   tools/textsatz-de-modul-erzeugen.js) — außer den vier Metadaten-Schlüsseln
   auf oberster Ebene (`modulTyp`/`sprache`/`moduleVersion`/`anbieterId`, interne
   Kennungen, keine bürgersichtbaren Texte). Rekursiv über `texte` UND `regeln`,
   nicht nur `texte` — generisch über den GANZEN sichtbaren Bestand, nicht nur
   die eine Stelle, die die Produktentscheidung gefunden hat.

   WIE GEPRÜFT WIRD: jedes Zeichen muss einer der drei UNIVERSELL NEUTRALEN
   Unicode-Skript-Eigenschaften angehören — `Latin` (lateinische Buchstaben,
   AUCH mit Diakritika: é/ü/ñ/ő sind Teil des Latin-Skripts, keine Ausnahme
   nötig), `Common` (Ziffern, Satzzeichen, Währungszeichen, die meisten Symbole
   — · — „" '' € $ ☐ sind alle `Common`) oder `Inherited` (kombinierende
   diakritische Zeichen). ALLES ANDERE (Han/CJK, Kyrillisch, Arabisch, Hebräisch,
   Griechisch, Devanagari, …) ist ein Fund. GEMESSEN, nicht angenommen: die
   Grenzfälle aus dem Auftrag (Währungszeichen, · — Anführungszeichen, ☐,
   Diakritika in Eigennamen wie García) wurden vor dem Bau einzeln geprüft —
   keiner davon macht den Wächter fälschlich rot (s. Selbsttest-Datei). Eine
   Positivliste bekannter Zeichen wäre die falsche Form gewesen (fängt den
   nächsten Fall nicht, den niemand vorher aufgelistet hat) — die Skript-
   Eigenschaft ist die generische Form, die der Auftrag verlangt.

   Aufruf: node tools/textsatz-de-nur-lateinisch-pruefen.js [--gate]
   Ohne Argument: Tabelle aller Funde. Mit --gate: Exit 1 bei mindestens einem
   Fund, sonst 0 (schnell, keine echte Suite-Last).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

const AUSGENOMMENE_METADATEN_SCHLUESSEL = new Set(['modulTyp', 'sprache', 'moduleVersion', 'anbieterId']);

/* Latin/Common/Inherited sind die drei UNIVERSELLEN Unicode-Skript-Klassen —
   „gehört zu keinem bestimmten Alphabet, kollidiert mit keinem" (Common: Ziffern,
   Satzzeichen, Symbole, Währung; Inherited: kombinierende Diakritika). Alles
   außerhalb dieser drei ist ein fremdes Schriftsystem. */
const LATEINISCH_ODER_NEUTRAL = /[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;

function fremdeZeichen(text) {
  const funde = [];
  for (const ch of text) {
    if (LATEINISCH_ODER_NEUTRAL.test(ch)) continue;
    funde.push(ch);
  }
  return funde;
}

/* Läuft rekursiv über jeden Wert des Moduls, außer den vier Metadaten-
   Schlüsseln auf oberster Ebene. `pfad` ist die menschenlesbare Fundstelle
   (z. B. "texte.identity.displayFamilyNameFirst.hint"). */
function sichtbareTexteSammeln(knoten, pfad, raus) {
  if (typeof knoten === 'string') {
    if (knoten) raus.push({ pfad, text: knoten });
    return;
  }
  if (Array.isArray(knoten)) {
    knoten.forEach((eintrag, i) => sichtbareTexteSammeln(eintrag, pfad + '[' + i + ']', raus));
    return;
  }
  if (knoten && typeof knoten === 'object') {
    for (const k of Object.keys(knoten)) {
      sichtbareTexteSammeln(knoten[k], pfad ? pfad + '.' + k : k, raus);
    }
  }
}

function pruefeModul(modulPfad) {
  const modul = JSON.parse(fs.readFileSync(modulPfad, 'utf8'));
  const raus = [];
  for (const k of Object.keys(modul)) {
    if (AUSGENOMMENE_METADATEN_SCHLUESSEL.has(k)) continue;
    sichtbareTexteSammeln(modul[k], k, raus);
  }
  const funde = [];
  for (const { pfad, text } of raus) {
    const fremd = fremdeZeichen(text);
    if (fremd.length) funde.push({ pfad, text, fremdeZeichen: [...new Set(fremd)] });
  }
  return { geprueft: raus.length, funde };
}

function main() {
  const modulPfad = process.argv.includes('--modul')
    ? path.resolve(process.argv[process.argv.indexOf('--modul') + 1])
    : path.join(REPO, 'tools', 'textsatz-de-modul.json');
  const { geprueft, funde } = pruefeModul(modulPfad);
  const gate = process.argv.includes('--gate');

  if (funde.length) {
    console.error('textsatz-de-nur-lateinisch-pruefen: ' + funde.length + ' Fund(e) unter '
      + geprueft + ' geprüften Werten:');
    for (const f of funde.slice(0, 20)) {
      console.error('  ' + f.pfad + ': "' + f.text.slice(0, 60) + '" — fremde Zeichen: '
        + JSON.stringify(f.fremdeZeichen));
    }
    if (gate) process.exit(1);
  } else {
    console.log('textsatz-de-nur-lateinisch-pruefen: OK — ' + geprueft
      + ' sichtbare Werte geprüft, kein Zeichen außerhalb Latin/Common/Inherited.');
    if (gate) process.exit(0);
  }
}

if (require.main === module) main();
module.exports = { pruefeModul, fremdeZeichen, sichtbareTexteSammeln, LATEINISCH_ODER_NEUTRAL };
