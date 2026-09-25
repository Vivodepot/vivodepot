#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   sektor-wortlisten-pruefen.js — jede Wortliste von Sektor-IDs gegen SEKTOREN
   ────────────────────────────────────────────────────────────────────────
   „Falsche Sektorliste" (22.08.2026, Zug 3). Anlass: ein Messlauf
   führte `versicherungen`/`arbeit` als Sektor-IDs — beide existieren nicht,
   `sozialversicherung`/`vorsorge` fehlten dadurch komplett. Eine Messung mit
   falscher Grundmenge findet nicht zu wenig, sie findet das Falsche und
   meldet es als vollständig.

   WAS ALS „WORTLISTE" ZÄHLT: eine Zeile zählt nur, wenn sie NICHTS anderes
   trägt als kommagetrennte Sektor-ID-förmige Tokens — optional mit EINEM
   führenden Schlüssel vor einem Doppelpunkt (für Label-Objekte wie
   `_BEREICH_ALT_LABEL`). Eine Zeile mit `"type": "string",` fällt damit
   heraus (der Wert ist nicht ID-förmig), eine Zeile `'identitaet',` oder
   `"identitaet": "Identität & Person",` zählt. Ein erster Entwurf clusterte
   nach Zeilennähe statt nach Zeilenform — das riss HTML-Attribute und
   JSON-Schema-Nachbarfelder mit hinein (an `vivodepot.html` selbst
   gegengeprüft, siehe Bericht). Diese Fassung prüft die Zeile, nicht ihre
   Umgebung.

   WAS DAS WERKZEUG NICHT PRÜFT: ob eine Liste VOLLSTÄNDIG ist. Eine Liste mit
   acht echten Namen ist zulässig; eine mit einem erfundenen nicht.

   Kein Hook, kein Gate — dieses Werkzeug meldet, es blockiert keinen Commit.
   Aufruf:
     node tools/sektor-wortlisten-pruefen.js               → Fixtures (Selbsttest)
     node tools/sektor-wortlisten-pruefen.js --datei <pfad> → eine echte Datei
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const { bereicheAusKern } = require('./build-bereiche.js');

const TOKEN = "['\"]([a-z][a-z-]{2,})['\"]";
const NUR_TOKENS_ZEILE = new RegExp(`^(${TOKEN}\\s*,?\\s*)+$`);
const SCHLUESSEL_WERT_ZEILE = new RegExp(`^${TOKEN}\\s*:\\s*(${TOKEN}|["'][^"']*["'])\\s*,?$`);
const MIN_CLUSTER = 6;

function kanonischeIds() {
  return new Set(bereicheAusKern().map((b) => b.id));
}

// Liefert die Sektor-ID-förmigen Tokens einer Zeile, wenn die Zeile NICHTS
// anderes trägt — sonst null (die Zeile ist keine Wortlisten-Zeile).
function zeilenTokens(zeileRoh) {
  const zeile = zeileRoh.replace(/\/\/.*$/, '').trim();
  if (!zeile) return null;

  if (NUR_TOKENS_ZEILE.test(zeile)) {
    const tokens = [];
    const re = new RegExp(TOKEN, 'g');
    let m;
    while ((m = re.exec(zeile))) tokens.push(m[1]);
    return tokens;
  }

  const sw = zeile.match(SCHLUESSEL_WERT_ZEILE);
  if (sw) {
    // Schlüssel ODER Wert kann der Sektor-ID-Kandidat sein (Label→ID oder ID→Label).
    const kandidaten = [];
    const re = new RegExp(TOKEN, 'g');
    let m;
    while ((m = re.exec(zeile))) kandidaten.push(m[1]);
    return kandidaten;
  }

  return null;
}

function cluster(zeilen) {
  const gruppen = [];
  let lauf = null; // { von, bis, tokens: Map }
  const schliessen = () => {
    if (lauf && lauf.tokens.size >= MIN_CLUSTER) gruppen.push(lauf);
    lauf = null;
  };
  zeilen.forEach((zeileRoh, idx) => {
    const nr = idx + 1;
    const zeile = zeileRoh.replace(/\/\/.*$/, '').trim();
    if (!zeile) return; // Leerzeile unterbricht einen Lauf nicht
    const tokens = zeilenTokens(zeileRoh);
    if (tokens === null) {
      schliessen();
      return;
    }
    if (!lauf) lauf = { von: nr, bis: nr, tokens: new Map() };
    lauf.bis = nr;
    for (const t of tokens) if (!lauf.tokens.has(t)) lauf.tokens.set(t, nr);
  });
  schliessen();
  return gruppen;
}

function pruefeDatei(pfad, kanon) {
  const inhalt = fs.readFileSync(pfad, 'utf8');
  const zeilen = inhalt.split('\n');
  const gruppen = cluster(zeilen);
  const befunde = [];
  for (const g of gruppen) {
    const erfunden = [...g.tokens.keys()].filter((t) => !kanon.has(t));
    if (erfunden.length > 0) {
      befunde.push({ datei: pfad, von: g.von, bis: g.bis, erfunden, gesamt: g.tokens.size });
    }
  }
  return befunde;
}

function main() {
  const kanon = kanonischeIds();
  const argDatei = process.argv.includes('--datei')
    ? process.argv[process.argv.indexOf('--datei') + 1]
    : null;

  const ziele = argDatei
    ? [path.resolve(REPO, argDatei)]
    : [
        path.join(REPO, 'tests', 'fixtures', 'sektor-wortlisten-echt.js'),
        path.join(REPO, 'tests', 'fixtures', 'sektor-wortlisten-erfunden.js'),
      ];

  let alleBefunde = [];
  for (const ziel of ziele) {
    alleBefunde = alleBefunde.concat(pruefeDatei(ziel, kanon));
  }

  console.log(`Kanonische Sektor-IDs (${kanon.size}): ${[...kanon].join(', ')}`);
  console.log(`Geprüft: ${ziele.length} Datei(en).`);
  if (alleBefunde.length === 0) {
    console.log('Keine erfundenen Sektor-IDs in einer Wortliste gefunden.');
    process.exitCode = 0;
    return;
  }
  for (const b of alleBefunde) {
    console.log(
      `ROT  ${path.relative(REPO, b.datei)}:${b.von}-${b.bis} — Wortliste mit ${b.gesamt} Tokens, ` +
        `davon erfunden: ${b.erfunden.join(', ')}`
    );
  }
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { kanonischeIds, zeilenTokens, cluster, pruefeDatei };
