#!/usr/bin/env node
/* Was haengt an `data.angehoerigenCache`? — Erhebung vor einem moeglichen Wegfall.
   Laufzettel „der entschiedene Rest", Posten 9. KEIN Bau, KEINE Empfehlung.

   WARUM DIESES WERKZEUG UND NICHT EIN `grep`: Ein blosses Zaehlen der Fundstellen
   zaehlt drei verschiedene Dinge zusammen, die ein Wegfall NICHT gleich betraefe:

     (1) das persistierte Feld `data.angehoerigenCache` — der verschluesselte
         Schnappschuss selbst. NUR dieses Feld steht in Posten 9 zur Debatte.
     (2) `angehoerigenCacheModell()` — die Funktion, die den Zuschnitt der fuenf
         Blaetter bestimmt. Sie ist Massstab fuer drei Waechter und traegt den
         Zuschnitt auch dann, wenn niemand ihn mehr verschluesselt ablegt.
     (3) Kommentare und Historie — Schema-Stufen, ADR-Verweise, Schalen-Vermerke.
         Ein Wegfall macht sie nicht falsch; sie beschreiben, was einmal war.

   Ohne Argument laeuft es gegen den Arbeitsbaum. `--datei <pfad>` misst eine
   einzelne Datei. Die Ausgabe ist eine Liste, kein Urteil. */

'use strict';
const fs = require('fs');
const path = require('path');
const WURZEL = path.resolve(__dirname, '..');

const BEGRIFF = 'angehoerigenCache';

/* Die Zuordnung geschieht an der Fundstelle selbst, nicht an der Datei: eine
   Testdatei kann beides beruehren, und der Kern tut es auf jeden Fall. */
function klasse(zeile) {
  const t = zeile.trim();
  /* Auch eine Zeile, die einen Blockkommentar SCHLIESST, ist Kommentar — sie
     beginnt nicht mit einem Marker und wuerde sonst als Code gezaehlt. */
  const istKommentar = t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
    || t.startsWith('|') || t.startsWith('-') || (t.endsWith('*/') && !t.includes(';'));
  if (/angehoerigenCacheModell/.test(zeile)) return istKommentar ? 'modell-kommentar' : 'modell';
  if (/angehoerigenCache(Verschluesseln|Entschluesseln|AusUmschlag)/.test(zeile)) {
    return istKommentar ? 'krypto-kommentar' : 'krypto';
  }
  if (istKommentar) return 'kommentar';
  return 'feld';
}

function dateienSammeln(dir, treffer) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    /* Das Werkzeug misst sich nicht selbst — seine eigenen Erklaerzeilen waeren
       sonst der groesste Posten in der Spalte „Werkzeuge". */
    if (p === __filename) continue;
    if (e.isDirectory()) dateienSammeln(p, treffer);
    else if (/\.(html|js|json|md)$/.test(e.name)) treffer.push(p);
  }
  return treffer;
}

function bereich(rel) {
  if (rel.startsWith('tests/')) return 'Proben';
  if (rel.startsWith('tools/')) return 'Werkzeuge und Waechter';
  if (rel.startsWith('docs/')) return 'Dokumentation';
  return 'Ausgelieferter Stand';
}

function messen(dateien) {
  const funde = [];
  for (const p of dateien) {
    let text;
    try { text = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (!text.includes(BEGRIFF)) continue;
    text.split('\n').forEach((zeile, i) => {
      if (!zeile.includes(BEGRIFF)) return;
      const rel = path.relative(WURZEL, p);
      funde.push({ datei: rel, zeile: i + 1, klasse: klasse(zeile), bereich: bereich(rel), text: zeile.trim() });
    });
  }
  return funde;
}

function ausgeben(funde) {
  const nachKlasse = {};
  for (const f of funde) (nachKlasse[f.klasse] ||= []).push(f);

  const TITEL = {
    feld: 'Das persistierte Feld `data.angehoerigenCache` — NUR das faellt weg',
    krypto: 'Die drei Funktionen um das Feld (Verschluesseln/Entschluesseln/AusUmschlag)',
    modell: '`angehoerigenCacheModell()` — der Zuschnitt, der den Wegfall UEBERLEBT',
    kommentar: 'Kommentare und Historie (ein Wegfall macht sie nicht falsch)',
    'modell-kommentar': 'Kommentare ueber den Zuschnitt',
    'krypto-kommentar': 'Kommentare ueber die drei Funktionen',
  };
  const REIHE = ['feld', 'krypto', 'modell', 'kommentar', 'modell-kommentar', 'krypto-kommentar'];

  console.log(`\nFundstellen gesamt: ${funde.length}\n`);
  for (const k of REIHE) {
    const menge = nachKlasse[k] || [];
    console.log(`── ${TITEL[k]} — ${menge.length}`);
    const nachBereich = {};
    for (const f of menge) (nachBereich[f.bereich] ||= []).push(f);
    for (const b of Object.keys(nachBereich).sort()) {
      console.log(`   ${b}: ${nachBereich[b].length}`);
      for (const f of nachBereich[b]) console.log(`     ${f.datei}:${f.zeile}  ${f.text.slice(0, 96)}`);
    }
    console.log('');
  }
  console.log('Keine Empfehlung, keine Wertung — Posten 9 verlangt die Messung, nicht den Schluss.');
}

const arg = process.argv.indexOf('--datei');
const dateien = arg > -1
  ? [path.resolve(process.argv[arg + 1])]
  : dateienSammeln(WURZEL, []);
ausgeben(messen(dateien));
