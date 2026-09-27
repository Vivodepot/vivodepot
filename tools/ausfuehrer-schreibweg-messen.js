#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kann der generische Ausführer (A58) das, was er zeigt, auch SPEICHERN?
   (Erhebung vor dem Bau der Ansichts-Hälfte, 30.07.2026 — aus A58.)
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE, die der Auftrag nicht stellt. Der Auftrag nennt die Klick-Verdrahtung
   („benutze `verdrahteSektorAktionen`/`verdrahteSektorEingaben` mit, statt sie zu
   kopieren") und sie ist seit A62 heraus, disjunkt und bewacht. Der SCHREIBWEG ist
   ein anderer Weg: `feldZeileHTML` erzeugt `data-edit`-Eingaben, und die werden
   nicht von der Verdrahtung gesichert, sondern vom Auto-Save-Lauschen auf `#content`
   → `bearbeitungSpeichern()`. Ein Ausführer, dessen Klicks alle sitzen, kann seine
   TIPPEINGABEN trotzdem in den falschen Bereich schreiben.

   ── WARUM DAS EINE MESSUNG BRAUCHT UND KEINE ANNAHME ──────────────────────
   `bearbeitungSpeichern()` bestimmt EINEN Ziel-Namensraum für das GANZE `#content`
   (aktive Situation ODER `aktiverSektorId`) und liest dann alle `[data-edit*]` im
   ganzen Container. Solange eine Ansicht Felder genau eines Bereichs zeigt, ist das
   richtig. Der Ausführer zeigt die Felder EINER LEBENSLAGE — und eine Lebenslage ist
   nicht an einen Bereich gebunden. Wie viele Lagen über mehr als einen Bereich
   streuen, ist die Zahl, die den Bauumfang entscheidet.

   Genau diese Klasse ist in dieser Datei schon einmal aufgetreten und teuer
   bezahlt: der Wizard (1b-Fix + 4. Fund, 22.07.2026) schrieb ein Schritt-Feld mit
   fremdem `ziel` nach `aktiverSektorId` — eine Streu-Kopie im Startbereich. Der
   Ausführer ist derselbe Fall, nur ohne Schritte: bis zu drei Bereiche gleichzeitig
   im selben Container.

   ── GEMESSEN WIRD AM KERN, NICHT AN DER ERINNERUNG ────────────────────────
   Die Lagen-/Bereichs-Streuung kommt aus `BAUSTEINE` im Kern (seit T5 die einzige
   Quelle). Die Aussage über `bearbeitungSpeichern` kommt aus dem Quelltext derselben
   geladenen Datei — nicht aus einer Beschreibung, die veralten kann.

   ── DER GELTUNGSBEREICH, AUSDRÜCKLICH BENANNT (Regel 13 · A62-Lehre) ──────
   Dies ist KEINE Produktweg-Probe. Der DOM-Stub in `tests/load-kern.js` liefert
   `querySelectorAll` UNBEDINGT `[]` — ein headless gefahrenes
   `bearbeitungSpeichern()` schriebe darum NICHTS und meldete fälschlich „kein
   Problem". Was hier gemessen wird, ist die STRUKTUR (ein Ziel-Namensraum, ganzer
   Container als Leseraum) und die Streuung der Lagen. Der Nachweis am laufenden
   Produktweg gehört in eine E2E-Probe und ist nicht Teil dieses Werkzeugs. Diese
   Grenze steht hier, weil ein grüner headless Lauf hier genau nichts belegen würde.

   Aufruf:  node tools/ausfuehrer-schreibweg-messen.js [--lage <id>] [--aus <datei>]
   Ohne `--lage` laufen alle Lagen des Kerns. `KERN_HTML_PATH` lenkt die Quelle um.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const NUR_LAGE = arg('lage', '');
const AUS = arg('aus', '');

const { V, src } = ladeKern();

/* ── 1) Die Struktur von `bearbeitungSpeichern` — aus dem Quelltext ──────────
   Gelesen wird der Funktionskörper, nicht die ganze Datei: ein `aktiverSektorId`
   irgendwo sonst sagt nichts über den Schreibweg. */
function funktionsKoerper(quelle, name) {
  const start = quelle.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let i = quelle.indexOf('{', start);
  if (i < 0) return null;
  let tiefe = 0;
  for (let j = i; j < quelle.length; j++) {
    const ch = quelle[j];
    if (ch === '{') tiefe++;
    else if (ch === '}') { tiefe--; if (tiefe === 0) return quelle.slice(start, j + 1); }
  }
  return null;
}

const koerper = funktionsKoerper(src, 'bearbeitungSpeichern');
if (!koerper) {
  console.error('ABBRUCH: `bearbeitungSpeichern` nicht im Kern gefunden. Wurde sie umbenannt?');
  console.error('Ohne den Funktionskörper ist jede Aussage dieses Werkzeugs gegenstandslos.');
  process.exit(2);
}

/* Die Ziel-Namensräume: an welche EINE Ablage schreibt der Lauf? */
const zielNamensraeume = [];
if (/aktiveAnsicht === 'situation'/.test(koerper)) zielNamensraeume.push("data.situationen[aktiveSituationId] (aktiveAnsicht==='situation')");
if (/const sektorId = aktiverSektorId/.test(koerper)) zielNamensraeume.push('data.sektoren[aktiverSektorId] (else-Zweig)');
/* Die Leseräume: über WELCHEN Container laufen die Feld-Scans? */
const scans = [...koerper.matchAll(/(\w+)\.querySelectorAll\('\[(data-[a-z-]+)[^']*'\)/g)]
  .map((m) => ({ container: m[1], anker: m[2] }));
const scanContainer = [...new Set(scans.map((s) => s.container))];

/* POSITIVKONTROLLE der Quelltext-Hälfte: findet der Leser die bekannten Stellen
   überhaupt? Zwei Namensräume und mindestens vier Feld-Scans sind der Bestand vom
   30.07.2026. Findet er sie nicht, hat sich die Funktion geändert — dann ist ein
   leeres Ergebnis kein Freispruch, sondern ein blinder Leser. */
if (zielNamensraeume.length < 2 || scans.length < 4) {
  console.error('ABBRUCH: der Quelltext-Leser findet den bekannten Bestand nicht'
    + ' (' + zielNamensraeume.length + ' Namensräume, ' + scans.length + ' Feld-Scans).');
  console.error('Erwartet waren 2 und >=4. Ein leeres Ergebnis wäre hier kein Freispruch.');
  process.exit(2);
}

/* ── 2) Die Streuung der Lagen über Bereiche — aus dem Kern ──────────────────*/
const lagen = (V.BAUSTEINE || []).filter((l) => !NUR_LAGE || l.id === NUR_LAGE);
if (NUR_LAGE && !lagen.length) {
  console.error('ABBRUCH: die Lage `' + NUR_LAGE + '` gibt es im Katalog nicht.');
  process.exit(2);
}
if (!lagen.length) {
  console.error('ABBRUCH: der Katalog ist leer — nichts zu messen.');
  process.exit(2);
}

const befunde = [];
for (const l of lagen) {
  const nachSektor = new Map();
  for (const pfad of (l.felder || [])) {
    const i = pfad.indexOf('.');
    const sektorId = pfad.slice(0, i), feldId = pfad.slice(i + 1);
    const def = V.feldDefFuer(sektorId, feldId);
    if (!nachSektor.has(sektorId)) nachSektor.set(sektorId, []);
    /* NUR Felder, die eine Eingabe erzeugen, zählen für den Schreibweg. `hinweis`
       rendert Text und trägt kein `data-edit` — es mitzuzählen blähte den Befund. */
    nachSektor.get(sektorId).push({ feldId, pfad, typ: def ? def.typ : null, fehlt: !def });
  }
  const sektoren = [...nachSektor.keys()];
  const schreibend = (arr) => arr.filter((f) => !f.fehlt && f.typ !== 'hinweis');
  befunde.push({
    id: l.id,
    sorte: l.sorte,
    sektoren,
    felderJeSektor: Object.fromEntries([...nachSektor].map(([k, v]) => [k, v.map((f) => f.feldId)])),
    schreibendeFelderJeSektor: Object.fromEntries([...nachSektor].map(([k, v]) => [k, schreibend(v).map((f) => f.feldId)])),
    mehrsektorig: sektoren.length > 1,
  });
}

/* POSITIVKONTROLLE der Kern-Hälfte: streute KEINE Lage über mehrere Bereiche,
   wäre der ganze Befund gegenstandslos — aber genauso sähe ein kaputter Lauf aus
   (leerer Katalog, `felder` nicht gelesen). Bei --lage greift sie nicht: eine
   einzelne einsektorige Lage ist ein legitimes Ergebnis. */
if (!NUR_LAGE && !befunde.some((b) => b.mehrsektorig)) {
  console.error('ABBRUCH: keine einzige Lage streut über mehrere Bereiche.');
  console.error('Das kann stimmen — sähe aber genauso aus wie ein Lauf, der `felder` nicht liest.');
  process.exit(2);
}

/* ── 3) Ausgabe ─────────────────────────────────────────────────────────────*/
const mehr = befunde.filter((b) => b.mehrsektorig);
const maxSekt = befunde.reduce((m, b) => Math.max(m, b.sektoren.length), 0);

const zeilen = [];
const z = (s) => zeilen.push(s == null ? '' : String(s));

z('══ Der Schreibweg des Ausführers (A58) — gemessen ' + (NUR_LAGE ? 'für `' + NUR_LAGE + '`' : 'über alle Lagen'));
z('');
z('── `bearbeitungSpeichern()`: Ziel-Namensräume (genau EINER je Lauf) ──');
for (const n of zielNamensraeume) z('   · ' + n);
z('');
z('── Leseraum der Feld-Scans ──');
z('   Container: ' + scanContainer.join(', ') + '  (`c` = document.getElementById(\'content\'), der GANZE Inhalt)');
z('   Anker:     ' + [...new Set(scans.map((s) => s.anker))].join(' · '));
z('');
z('   FOLGERUNG: der Lauf liest die Eingaben des ganzen Containers und schreibt sie');
z('   in EINEN Namensraum. Für eine Ansicht mit Feldern aus mehreren Bereichen ist das');
z('   nicht nur unvollständig, sondern falsch — die fremden Felder landen als Streu-Kopie');
z('   im Ziel-Bereich (dieselbe Klasse wie der Wizard-1b-Fix vom 22.07.2026).');
z('');
z('── Streuung der Lebenslagen über Bereiche ──');
z('   Lagen gemessen:      ' + befunde.length);
z('   davon mehrsektorig:  ' + mehr.length);
z('   Bereiche je Lage max: ' + maxSekt);
z('');
if (mehr.length) {
  z('   Die betroffenen Lagen — je Lage der Bereich, der beim Speichern gewinnt, und die,');
  z('   deren Felder in ihn hineinlaufen würden (SCHREIBENDE Felder, `hinweis` ausgenommen):');
  z('');
  for (const b of mehr) {
    z('   ' + b.id + '  (' + b.sorte + ', ' + b.sektoren.length + ' Bereiche)');
    for (const s of b.sektoren) {
      const f = b.schreibendeFelderJeSektor[s] || [];
      z('      ' + s.padEnd(20) + f.length + ' schreibende Felder: ' + (f.join(', ') || '—'));
    }
  }
  z('');
  const summe = mehr.reduce((n, b) => {
    const je = b.sektoren.map((s) => (b.schreibendeFelderJeSektor[s] || []).length);
    return n + (je.reduce((a, x) => a + x, 0) - Math.max(...je));
  }, 0);
  z('   MINDESTENS ' + summe + ' schreibende Felder liegen in einem Bereich, der beim Speichern');
  z('   NICHT gewinnt — je Lage alle bis auf den grössten. Sie wären die Streu-Kopien.');
}
z('');
z('── Geltungsbereich dieser Messung ──');
z('   Struktur + Katalog, NICHT der laufende Produktweg. Der DOM-Stub liefert');
z('   `querySelectorAll` unbedingt `[]`; ein headless gefahrenes `bearbeitungSpeichern()`');
z('   schriebe nichts und meldete fälschlich Unbedenklichkeit. Der Nachweis am Produktweg');
z('   gehört in eine E2E-Probe (Regel 13) und ist hier ausdrücklich NICHT geleistet.');

const text = zeilen.join('\n');
if (AUS) {
  fs.writeFileSync(path.resolve(AUS), text + '\n', 'utf8');
  console.log('geschrieben: ' + path.resolve(AUS));
} else {
  console.log(text);
}
