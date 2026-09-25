#!/usr/bin/env node
/* Welche Zusicherung sagt „jedes Feld" und meint nur den eingebauten Katalog?
   — Erhebung nach `CLAUDE.md` „CC laeuft nicht leer", Stufe 4: gemessen, nicht gebaut.

   WARUM DIESE STELLE: Am 21.08. hat A436 einen Waechter gefunden, dessen Sammler
   `data.feldDefinitionen` nicht betritt — `ereignisAchseWaechterFunde` meldet fuer
   ein angedocktes Personen-Feld `[]` und sagt damit „sauber" ueber eine Klasse,
   die er nie angesehen hat. Die Frage, die daraus folgt und die keine Messung
   deckt: **ist das ein Einzelfall oder eine Klasse?**

   WAS GEMESSEN WIRD: Jede Datei in `tests/` und `tools/`, die ueber den
   eingebauten Katalog laeuft (`SEKTOREN`, `SEKTOR_BY_ID`, `feldDefFuer`), und ob
   in derselben Datei die angedockte Quelle ueberhaupt vorkommt
   (`feldDefinitionen`, `_angedockteFeldDef`, `_templateDefAlsFeld`).

   WAS DIESE MESSUNG NICHT KANN, und das gehoert in ihre Ausgabe: Sie sieht die
   ERWAEHNUNG, nicht die Deckung. Eine Datei, die `feldDefinitionen` nennt, kann
   sie trotzdem nur in einem Zweig pruefen. Die Liste ist darum eine
   **Kandidatenliste fuer das Nachsehen**, kein Befund. Umgekehrt gilt sie
   scharf: **wo die angedockte Quelle GAR NICHT vorkommt, ist sie sicher nicht
   geprueft.**

   Ohne Argument laeuft es gegen den Arbeitsbaum. */

'use strict';
const fs = require('fs');
const path = require('path');
const WURZEL = path.resolve(__dirname, '..');

/* ENG, NICHT WEIT — das erste Modell war zu weit und lieferte 213 Dateien, von
   denen die meisten gar keine Allaussage ueber Felder treffen. Gezaehlt wird nur,
   wer den Katalog WIRKLICH durchlaeuft: ueber `sektionen` UND `felder`. Ein
   blosses Vorkommen von `SEKTOREN` genuegt nicht. */
const KATALOG = /\.sektionen\b[\s\S]{0,400}?\.felder\b|\.felder\b[\s\S]{0,400}?\.sektionen\b/;
/* Und wer keine Zusicherung trifft, sichert auch nichts falsch zu. */
const ZUSICHERUNG = /\bassert\b|funde\.push|process\.exit\(1\)|verstoesse/;
const ANDOCK = /feldDefinitionen|_angedockteFeldDef|_templateDefAlsFeld/;
/* Die Woerter, mit denen eine Allaussage im Haus formuliert wird — deutsch, weil
   die Zusicherungen deutsch sind. `JEDER`/`ALLE` gross geschrieben kommen in den
   Rot-Erwartungs-Texten vor und sind darum besonders aussagekraeftig. */
const ALLAUSSAGE = /\b([Jj]edes|[Jj]eder|[Jj]ede|[Aa]lle|[Kk]ein|[Kk]eine)\b|JEDE|ALLE|KEIN/;

function dateien(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (p === __filename) continue;
    if (e.isDirectory()) dateien(p, out);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

const funde = { ohne: [], mit: [] };
for (const p of dateien(path.join(WURZEL, 'tests'), dateien(path.join(WURZEL, 'tools'), []))) {
  const t = fs.readFileSync(p, 'utf8');
  if (!KATALOG.test(t) || !ZUSICHERUNG.test(t)) continue;
  const rel = path.relative(WURZEL, p);
  /* Die erste Allaussage der Datei als Beleg — sie sagt, WAS zugesichert wird. */
  const zeile = t.split('\n').find((z) => ALLAUSSAGE.test(z) && KATALOG.test(z))
    || t.split('\n').find((z) => ALLAUSSAGE.test(z)) || '';
  (ANDOCK.test(t) ? funde.mit : funde.ohne).push({ rel, zeile: zeile.trim().slice(0, 110) });
}

console.log(`\nDateien, die den Katalog wirklich durchlaufen UND etwas zusichern: ${funde.mit.length + funde.ohne.length}`);
console.log(`  davon erwaehnen die angedockte Quelle:      ${funde.mit.length}`);
console.log(`  davon erwaehnen sie GAR NICHT:              ${funde.ohne.length}\n`);

console.log('── Sicher ungeprueft: der angedockte Weg kommt in der Datei nicht vor');
for (const f of funde.ohne) console.log(`   ${f.rel}\n      ${f.zeile}`);

console.log('\n── Kandidaten fuers Nachsehen: die Quelle kommt vor, die Deckung ist damit NICHT belegt');
for (const f of funde.mit) console.log(`   ${f.rel}`);

console.log('\nKeine Wertung, keine Empfehlung — die Liste sagt, wo nachzusehen ist.');
