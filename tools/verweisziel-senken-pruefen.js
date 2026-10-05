'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   verweisziel-senken-pruefen.js — jedes dynamische Verweisziel steht mit Grund in der Grundlinie
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (05.10.2026, Befund TEMPLATE-URL-SCHEMA-UNGEPRUEFT): `wortlautVorlageHTML` setzte die Quell-URL
   einer Vorlage als `href`. `escapeHTML` schützte das Attribut, nicht das Ziel; ein `javascript:`-Link ging
   durch, weil an keiner Stelle das Schema geprüft wurde. Der Attribut-Wächter (attribut-verkettung-pruefen.js)
   zählt eine maskierte Stelle als erledigt und sieht diese Klasse darum nicht.

   WAS GEZÄHLT WIRD, in Kern und Lese-App: `href="' + ausdruck + '"`, `<iframe … src="' + ausdruck + '"`,
   `.href = ausdruck`, `setAttribute('href'|'src', ausdruck)` (beide Anführungszeichen), `window.open(ausdruck`
   und `location.assign(…)`/`location.replace(…)`. `location.href = …` fällt unter `.href =`.

   DIE GRUNDLINIE (`tools/verweisziel-senken-grundlinie.json`) trägt je `datei|ausdruck` die Anzahl und den
   GRUND, warum das Ziel kein fremdes Schema tragen kann: Konstante, Ab-Werk-Saat, Blob-URL, oder die Prüfung,
   die es auf https: bzw. einen relativen Pfad beschränkt. Eine NEUE Stelle ist rot, bis sie mit Grund dasteht.
   Eine VERSCHWUNDENE ist ebenfalls rot: die Grundlinie wird nachgezogen und darf nur schrumpfen.

   GRENZE: gelesen wird bis zum ersten eingebetteten Bibliotheks-Block (`/** @license`). Template-Literale und
   über mehrere Zeilen verteilte Ausdrücke sieht das Muster nicht. `src=` an `<img>` zählt nicht: ein Bild führt kein Skript aus. Das Studio wird nicht veröffentlicht; seine
   eine Verweis-Stelle prüft eine interne Probe.

   Aufruf:  node tools/verweisziel-senken-pruefen.js            (Liste)
            node tools/verweisziel-senken-pruefen.js --check    (gegen die Grundlinie, Exit 1 bei Abweichung)
            --datei <pfad> (mehrfach; Vorgabe: vivodepot.html und vivodepot-lesen.html)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'verweisziel-senken-grundlinie.json');
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];
const MUSTER = [
  /\shref="'\s*\+\s*(.*?)\s*\+\s*'"/g,
  /\.href\s*=\s*([^;]+);/g,
  /<iframe\b[^>]*?\ssrc="'\s*\+\s*(.*?)\s*\+\s*'"/g,
  /setAttribute\(\s*['"](?:href|src)['"]\s*,\s*([^;]+?)\);/g,
  /window\.open\(\s*([^,)]+)/g,
  /location\.(?:assign|replace)\(\s*([^)]+)\)/g,
];

function stellen(quelle, datei) {
  const ende = quelle.indexOf('/** @license');
  const text = ende > 0 ? quelle.slice(0, ende) : quelle;
  const raus = [];
  text.split('\n').forEach((zeile, nr) => {
    for (const rx of MUSTER) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(zeile))) raus.push({ datei, zeile: nr + 1, ausdruck: m[1].trim() });
    }
  });
  return raus;
}

function zaehlen(liste) {
  const z = Object.create(null);
  for (const s of liste) { const k = s.datei + '|' + s.ausdruck; z[k] = (z[k] || 0) + 1; }
  return z;
}

function vergleichen(ist, grundlinie) {
  const fehler = [];
  const soll = Object.create(null);
  for (const e of grundlinie.eintraege) {
    soll[e.datei + '|' + e.ausdruck] = e.anzahl;
    if (typeof e.grund !== 'string' || e.grund.trim().length < 10) fehler.push('ohne Grund: ' + e.datei + '|' + e.ausdruck);
  }
  for (const k of Object.keys(ist)) {
    if (!(k in soll)) fehler.push('NEU, ohne Grund: ' + k + ' (' + ist[k] + '×) — Schema prüfen (https: oder relativ) und mit Grund eintragen');
    else if (ist[k] > soll[k]) fehler.push('MEHR als in der Grundlinie: ' + k + ' ' + soll[k] + ' → ' + ist[k]);
  }
  for (const k of Object.keys(soll)) {
    const n = ist[k] || 0;
    if (n < soll[k]) fehler.push('VERSCHWUNDEN: ' + k + ' ' + soll[k] + ' → ' + n + ' — Grundlinie nachziehen');
  }
  return fehler;
}

function messen(repo, dateien) {
  const alle = [];
  for (const d of dateien) {
    const p = path.isAbsolute(d) ? d : path.join(repo, d);
    alle.push(...stellen(fs.readFileSync(p, 'utf8'), path.basename(d)));
  }
  return alle;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dateien = [];
  argv.forEach((a, i) => { if (a === '--datei') dateien.push(argv[i + 1]); });
  const liste = messen(REPO, dateien.length ? dateien : DATEIEN);
  if (!argv.includes('--check')) {
    for (const s of liste) console.log(s.datei + ':' + s.zeile + '\t' + s.ausdruck);
    process.exit(0);
  }
  const fehler = vergleichen(zaehlen(liste), JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')));
  if (fehler.length) { for (const f of fehler) console.error('[verweisziel] ' + f); process.exit(1); }
  console.log('[verweisziel] grün — ' + liste.length + ' Verweisziele, jedes mit Grund');
}

module.exports = { stellen, zaehlen, vergleichen, messen, MUSTER, DATEIEN };
