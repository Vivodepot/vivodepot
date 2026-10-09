#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EP7 (bis 29.07. „Z7") — die Klasse eingrenzen, BEVOR die Zusicherung gebaut wird
   ────────────────────────────────────────────────────────────────────────────
   Der Auftrag ist an dieser Stelle ausdrücklich: „Vor dem Bau die Klasse
   eingrenzen — die 317 Funde sind überwiegend Feld-Beschriftungen aus dem
   Datenmodell, und ob ADR-104 diese meint, ist offen. Klären, dann bauen."

   WARUM DAS KEINE FORMSACHE IST. „Für jeden sichtbaren Text gilt: er läuft über
   STRINGS" ist als Satz eindeutig und als Prüfung nicht. Zwischen einer
   Fehlermeldung, die im Code steht, und einer Feld-Beschriftung, die aus dem
   Datenmodell kommt, liegen zwei verschiedene Entscheidungen. Wer die
   Zusicherung vor der Klärung baut, entscheidet sie im Vorbeigehen — und die
   Auslegung des Erbauers wird dann zur Regel, ohne dass jemand sie beschlossen
   hätte.

   Dieses Werkzeug entscheidet nichts. Es ZÄHLT und legt Beispiele vor.

   Aufruf:
     node tools/eigenschaften-z7-erheben.js [--datei <pfad>] [--je 4] [--json]

   DER DATEINAME TRÄGT WEITER `z7` — bewusst. Die Kennung heisst seit dem
   29.07.2026 `EP7` (A41), aber U2-ADR-112 verweist an drei Stellen auf diesen
   Pfad. Eine Datei umzubenennen, auf die ein angenommener ADR zeigt, tauscht
   eine mehrdeutige Kennung gegen drei tote Verweise — die Umbenennung sollte
   Eindeutigkeit schaffen, nicht verschieben.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const REPO = path.join(__dirname, '..');
const DATEI = path.resolve(arg('datei', path.join(REPO, 'vivodepot.html')));
const JE = parseInt(arg('je', '4'), 10);

/* Derselbe Fundbegriff wie Ebene 15 der Kampagne — sonst wären es zwei Zahlen,
   die dasselbe zu messen behaupten und sich widersprechen. */
const DEUTSCH = /[A-Za-zÄÖÜäöüß]{4,}[ ,][A-Za-zÄÖÜäöüß]{3,}/;
const HTML_BAU = /(innerHTML|textContent|koerperHTML|titel:|label:|<[a-z]+[ >]|toast\(|primaerLabel)/;

/* ── Der Schlüssel unmittelbar VOR dem Text ───────────────────────────────
   KORREKTUR AUS DEM ERSTLAUF. Die erste Fassung fragte, ob eine Zeile mit
   `label:` BEGINNT. Damit fielen 289 von 317 in „nicht eingeordnet" — und
   „nicht eingeordnet" ist keine Antwort, sondern eine unterlassene Messung.

   Die Schlüssel stehen inline in Objektliteralen, nicht am Zeilenanfang.
   Gemessen wird darum, was UNMITTELBAR vor dem Text steht. Ergebnis: 226
   `label` und 55 `titel`. Die Vermutung des Auftrags — „überwiegend
   Feld-Beschriftungen aus dem Datenmodell" — ist damit belegt, nicht mehr
   vermutet. */
const SCHLUESSEL_MUSTER = [
  /([A-Za-z_$][\w$]*)\s*:\s*['"`]?\s*$/,
  /([A-Za-z_$][\w$]*)\s*\(\s*['"`]?\s*$/,
  /([A-Za-z_$][\w$-]*)\s*=\s*['"`]?\s*$/,   // mit Bindestrich: `aria-label="` ist NICHT `label:`
];

function schluesselVor(zeile, text) {
  const i = zeile.indexOf(text);
  const davor = zeile.slice(Math.max(0, i - 60), i);
  for (const re of SCHLUESSEL_MUSTER) { const m = davor.match(re); if (m) return m[1]; }
  return null;
}

/* ── Die Klassen ──────────────────────────────────────────────────────────
   Nach dem, WOFÜR der Text steht — nicht danach, wie er gebaut wird. Die
   Frage an die Produktverantwortung ist eine fachliche, keine syntaktische. */
const KLASSEN = [
  { id: 'feld-beschriftung',
    was: 'Feld-Beschriftung oder Titel aus einer Definition (`label:`, `titel:`)',
    frage: 'DIE EIGENTLICHE FRAGE: meint U2-ADR-104 auch diese? Sie kommen aus dem Datenmodell, ' +
      'nicht aus dem Bedienfluss — eine andere Sorte Text als eine Meldung.',
    trifft: (_z, k) => k === 'label' || k === 'titel' },
  { id: 'zugaenglicher-name',
    was: 'zugänglicher Name im Markup (`aria-label=`, `title=`)',
    frage: 'Vermutlich unstrittig JA: das ist der Text, den ein Screenreader vorliest — ' +
      'für eine blinde Bürgerin IST er die Beschriftung.',
    trifft: (_z, k) => k === 'aria-label' || k === 'aria-description' || k === 'title' || k === 'placeholder' },
  { id: 'meldung',
    was: 'Meldung an die Bürgerin (Toast, Warnung, Fehler)',
    frage: 'Vermutlich unstrittig JA — das ist der Kern dessen, was ADR-104 meint.',
    trifft: (z) => /toast\(|alert\(|warnung|fehlermeldung/i.test(z) },
  { id: 'markup-vorlage',
    was: 'HTML-Vorlage, die Text mitführt',
    frage: 'Grenzfall: der Text steht im Markup, nicht in einer Definition.',
    trifft: (z) => /innerHTML|koerperHTML|<[a-z]+[ >]/.test(z) },
  { id: 'sonstiges', was: 'nicht eingeordnet',
    frage: 'Einzeln anzusehen. Bleibt diese Zahl gross, taugt die Einteilung nicht.',
    trifft: () => true },
];

function erheben(text) {
  const zeilen = text.split('\n');
  const funde = [];
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (!HTML_BAU.test(z)) continue;
    if (/STRINGS\./.test(z)) continue;                    // versorgt
    if (/^\s*(\/\/|\*|\/\*)/.test(z)) continue;           // Kommentar
    for (const m of z.matchAll(/'([^'\\]{12,120})'|"([^"\\]{12,120})"/g)) {
      const t = (m[1] || m[2] || '').trim();
      if (!DEUTSCH.test(t)) continue;
      if (/^[a-z-]+$/.test(t) || /^[.#]/.test(t)) continue;
      if (/[<>{}]/.test(t) && !/[A-ZÄÖÜ]/.test(t)) continue;
      const k = schluesselVor(z, t);
      funde.push({ zeile: i + 1, text: t, schluessel: k, klasse: KLASSEN.find((kl) => kl.trifft(z, k)).id });
      break;
    }
  }
  return funde;
}

function main() {
  if (!fs.existsSync(DATEI)) { console.error('Datei nicht gefunden: ' + DATEI); process.exit(2); }
  const funde = erheben(fs.readFileSync(DATEI, 'utf8'));

  /* ZUSTANDSANSAGE: findet die Erhebung überhaupt etwas? Eine Erhebung, die
     null meldet, weil der Fundbegriff nicht mehr greift, sieht genauso aus wie
     eine, bei der alles versorgt ist. */
  if (!funde.length) {
    console.error('KEIN EINZIGER FUND — das ist kein Ergebnis, sondern ein Verdacht auf einen\n' +
      'nicht mehr greifenden Fundbegriff. Gemessen wurde: ' + path.relative(REPO, DATEI));
    process.exit(2);
  }

  const jeKlasse = new Map(KLASSEN.map((k) => [k.id, []]));
  for (const f of funde) jeKlasse.get(f.klasse).push(f);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ datei: path.relative(REPO, DATEI), gesamt: funde.length, funde }, null, 1));
    return;
  }

  console.log(`EP7-Erhebung — ${funde.length} sichtbare Texte ohne STRINGS-Bezug`);
  console.log(`Gemessen an: ${path.relative(REPO, DATEI)}\n`);
  console.log('DIESES WERKZEUG ENTSCHEIDET NICHTS. Es legt die Klassen vor, damit die');
  console.log('Zusicherung nicht im Vorbeigehen entschieden wird.\n');
  for (const k of KLASSEN) {
    const liste = jeKlasse.get(k.id);
    console.log(`  ${String(liste.length).padStart(4)}  ${k.was}`);
    console.log(`        → ${k.frage}`);
    for (const f of liste.slice(0, JE)) {
      console.log(`        · Zeile ${String(f.zeile).padStart(6)}  „${f.text.slice(0, 62)}"`);
    }
    if (liste.length > JE) console.log(`        · … ${liste.length - JE} weitere`);
    console.log('');
  }
  console.log('Die Zahl ist eine Momentaufnahme dieser Datei, kein fester Stand.');
}

if (require.main === module) main();
module.exports = { erheben, KLASSEN, schluesselVor };
