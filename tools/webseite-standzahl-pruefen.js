#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Keine Standzahl auf der Website — Nachfolger von webseite-testzahl-messen.js
   ────────────────────────────────────────────────────────────────────────────
   HERKUNFT. Der Vorgänger entstand aus einem Fund vom
   30.08.2026: validierung.html zeigte 2788 Tests vom 07.08. und 942 vom
   20.06., während die echte Zahl über 6300 lag. Er hielt DIE Zahl auf DIESER
   Seite gegen die Faktenbasis — und war damit auf den Dateinamen
   `validierung.html` fest verdrahtet, brauchte Pflege bei jedem Suite-Lauf
   und war blind für eine Zahl auf einer anderen Seite.

   DER ZUSCHNITT IST UMGEDREHT. Dieses Werkzeug fragt nicht „stimmt die Zahl",
   sondern „hat sie jemand von Hand hingeschrieben".

   ZWEI SORTEN ZAHL, UND SIE SIND NICHT DASSELBE (entschieden 12.09.2026):
     Umfangszahl   13 Sektoren, 270 Felder, 19 Anlässe — gilt für GENAU EINE
                   Zusammensetzung. Ein ungarisches Pro-Produkt hat andere.
                   Bleibt draußen.
     Suite-Zahl    „N Prüfungen gefahren, alle bestanden, Stand vom TT.MM."
                   Eine Tatsache über den Code, nicht über ein Produkt.
                   Dieselbe Suite trägt jede Zusammensetzung. SOLL dastehen —
                   wörtlich: „natürlich sollen die aktuell gefahrenen und
                   bestandenen tests da stehen".

   DIE REGEL IST DARUM MECHANISCH, NICHT SEMANTISCH. Ein Erkenner kann den
   Unterschied nicht am Wort ablesen, wohl aber an der Herkunft: eine Zahl
   INNERHALB des erzeugten Blocks hat ein Werkzeug geschrieben und kann nicht
   veralten, ohne dass der Erzeuger es merkt. Eine Zahl AUSSERHALB stammt aus
   einer Hand — und genau das war die Drift vom 30.08.2026.

   ── WAS DIESES WERKZEUG NICHT SEHEN KANN ────────────────────────────────────
   Es prüft einen Ordner, den `git ls-files` NIE zeigt. Der Auftritt liegt
   absichtlich außerhalb des Repositoriums (`Vivodepot-intern/docs/webseite/`),
   und was dort liegt, ist nicht dasselbe wie das, was auf vivodepot.de
   ausgeliefert ist. Wer dieses Werkzeug ohne `--ordner` aufruft, bekommt ein
   Urteil über eine Fixture und KEINES über die echte Website. Wer es mit
   `--ordner` aufruft, bekommt ein Urteil über einen Arbeitsstand und keines
   über das Web-Root. Ein grüner Lauf hier heißt nicht, dass draußen keine
   Zahl steht.
   ────────────────────────────────────────────────────────────────────────────

   AUFRUF
     node tools/webseite-standzahl-pruefen.js [--ordner <pfad>] [--json <datei>]

     ohne --ordner:  läuft gegen tests/fixtures/webseite-standzahl/ — die
                     Fixtures des Vorgängers, umgewidmet: validierung.html
                     trägt die gepflanzte Drift aus dem Fund vom 30.08.2026
                     und ist damit die Positivkontrolle dieses Werkzeugs.

   EXIT
     0  keine Standzahl gefunden
     1  mindestens eine Standzahl gefunden (mit Fundstelle und Umgebung)
     2  Anker verfehlt: Ordner fehlt oder enthält keine HTML-Seite.
        Ein verfehlter Anker WIRFT und meldet nicht grün — sonst bewacht ein
        Werkzeug, das ins Leere zeigt, scheinbar weiter.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);
function arg(name, vorgabe) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : vorgabe;
}
const ORDNER = path.resolve(arg('ordner', path.join(REPO, 'tests', 'fixtures', 'webseite-standzahl')));
const JSON_ZIEL = arg('json', null);

// Die Ausnahmezone. Dieselben Marker, die tools/build-standzahlen.js setzt —
// bewusst dieselben und nicht eigene, damit es einen Ort für die Frage gibt,
// was ein erzeugter Block ist.
const BLOCK_BEGIN = '<!-- STANDZAHLEN:BEGIN';
const BLOCK_ENDE = '<!-- STANDZAHLEN:END -->';

// Eine Zahl, die einen Prüfstand behauptet. Bewusst eng: Jahreszahlen,
// Paragraphen, Aktenzeichen und Geldbeträge sollen nicht mitgehen.
const STANDZAHL = new RegExp(
  '\\b\\d{2,6}\\s*(?:automatische[nr]?\\s+|ausgeführte[nr]?\\s+)?' +
  '(Tests?|Testdateien|Testfälle|Proben|Prüfungen|Wächter|Durchläufe|E2E-Läufe|Zusicherungen)\\b',
  'g');

function seiten(wurzel) {
  const aus = [];
  (function ab(ordner) {
    for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, eintrag.name);
      if (eintrag.isDirectory()) ab(p);
      else if (eintrag.name.endsWith('.html')) aus.push(p);
    }
  })(wurzel);
  return aus.sort();
}

/* Schneidet die erzeugten Blöcke heraus, BEVOR irgendetwas gezählt wird.
   Ein unvollständiges Markerpaar ist selbst ein Fund: wer nur den Anfang
   setzt, hebelt die Prüfung für den Rest der Seite aus. */
function blockFehler(html, datei) {
  const a = html.indexOf(BLOCK_BEGIN), b = html.indexOf(BLOCK_ENDE);
  if (a < 0 && b < 0) return null;
  if (a < 0 || b < 0 || b < a) {
    return `${datei}: STANDZAHLEN-Marker unvollständig oder verdreht — so bewacht die ` +
           `Ausnahmezone nichts mehr`;
  }
  return null;
}

function ohneBloecke(html) {
  let s = html, schutz = 0;
  for (;;) {
    const a = s.indexOf(BLOCK_BEGIN);
    if (a < 0) break;
    const b = s.indexOf(BLOCK_ENDE, a);
    if (b < 0) break;
    s = s.slice(0, a) + ' ' + s.slice(b + BLOCK_ENDE.length);
    if (++schutz > 50) break;
  }
  return s;
}

function koerpertext(html) {
  const m = /<main id="inhalt">([\s\S]*?)<\/main>/.exec(html);
  let s = m ? m[1] : html;
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  return s.replace(/\s+/g, ' ');
}

function main() {
  if (!fs.existsSync(ORDNER)) {
    console.error('Ordner nicht gefunden: ' + ORDNER);
    process.exit(2);
  }
  const dateien = seiten(ORDNER);
  if (!dateien.length) {
    console.error('keine HTML-Seite in: ' + ORDNER + ' — Anker verfehlt, kein Urteil möglich');
    process.exit(2);
  }

  const funde = [];
  const markerfehler = [];
  for (const datei of dateien) {
    const roh = fs.readFileSync(datei, 'utf8');
    const kurz = path.relative(ORDNER, datei);
    const mf = blockFehler(roh, kurz);
    if (mf) markerfehler.push(mf);
    const text = koerpertext(ohneBloecke(roh));
    STANDZAHL.lastIndex = 0;
    let m;
    while ((m = STANDZAHL.exec(text)) !== null) {
      funde.push({
        datei: kurz,
        fund: m[0].trim(),
        umgebung: text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60).trim(),
      });
    }
  }

  const bericht = { ordner: ORDNER, seiten: dateien.length, funde, markerfehler };
  if (JSON_ZIEL) fs.writeFileSync(JSON_ZIEL, JSON.stringify(bericht, null, 2) + '\n');

  if (markerfehler.length) {
    console.error('[webseite-standzahl] Marker kaputt:');
    for (const z of markerfehler) console.error('  · ' + z);
    process.exit(1);
  }
  if (!funde.length) {
    console.log(`[webseite-standzahl] ${dateien.length} Seiten, keine Standzahl.`);
    process.exit(0);
  }
  console.error(`[webseite-standzahl] ${funde.length} Standzahl(en) in ${dateien.length} Seiten:`);
  for (const f of funde) console.error(`  · ${f.datei}: „${f.fund}“ — …${f.umgebung}…`);
  console.error('\nEine Zahl von Hand veraltet still. Wenn die Zahl dastehen SOLL, gehört sie');
  console.error('in den erzeugten Block zwischen die STANDZAHLEN-Marker, damit ein Werkzeug');
  console.error('sie schreibt und ein zweites sie gegen den echten Lauf hält.');
  process.exit(1);
}

main();
