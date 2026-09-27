'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   attribut-verkettung-pruefen.js — findet `attr="' + wert + '"` ohne Maskierung im Kern
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (16.09.2026, v1-Blocker Sicherheit; Review des XSS-Fixes, X2): ein Textsatz-Wert
   aus einer fremden Datei stand roh im `aria-label` des Inhaltsverzeichnisses. Ein Anführungszeichen
   darin brach aus dem Attribut aus und wurde zum lebenden Ereignis-Attribut. Der Kern baut HTML als
   Zeichenkette; jede Stelle `name="' + ausdruck + '"` ist eine Attribut-Senke.

   WAS GEZÄHLT WIRD: jede solche Verkettung, deren Ausdruck NICHT mit `escapeAttr(`, `escapeHTML(`
   oder `encodeURIComponent(` beginnt. `escapeHTML` zählt als maskiert, weil es seit demselben Tag
   beide Anführungszeichen maskiert. Viele der rohen Stellen sind folgenlos (Kennungen, Zahlen, feste
   Klassen) — das Werkzeug urteilt nicht, es hält den Bestand fest.

   DIE RATSCHE: `tools/attribut-verkettung-grundlinie.json` trägt die rohen Stellen als
   `attribut|ausdruck` mit Anzahl. Eine NEUE rohe Stelle ist rot — maskieren oder, wenn sie folgenlos
   ist, mit Grund in die Grundlinie. Eine VERSCHWUNDENE ist ebenfalls rot: die Grundlinie wird
   nachgezogen, sie darf nur schrumpfen.

   GRENZE: gelesen wird bis zum ersten eingebetteten Bibliotheks-Block (`/** @license`). Ein Attribut,
   das über zwei Zeichenketten-Literale verteilt ist oder per Template-Literal entsteht, sieht das
   Muster nicht.

   Aufruf:  node tools/attribut-verkettung-pruefen.js            (Liste)
            node tools/attribut-verkettung-pruefen.js --check    (gegen die Grundlinie, Exit 1 bei Abweichung)
            node tools/attribut-verkettung-pruefen.js --grundlinie-schreiben
            --kern <pfad>  (Vorgabe: vivodepot.html)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'attribut-verkettung-grundlinie.json');
const MASKIERT = /^(?:escapeAttr|escapeHTML|encodeURIComponent)\s*\(/;
// Die ältere Form, die nur das doppelte Anführungszeichen ersetzt — für ein doppelt gequotetes Attribut genügt sie.
const ANFUEHRUNG_ERSETZT = /\.replace\(\/"\/g,\s*'&quot;'\)$/;

/* Liest ab `start` einen Ausdruck bis zum nächsten `+` oder Zeilenende auf oberster Ebene. */
function ausdruckLesen(zeile, start) {
  /* Der Kern ist durchgängig `' + ausdruck + '` gesetzt: das nächste ` + '` bzw. ` + "` beendet den
     Ausdruck. Nur wenn es fehlt, wird geklammert gelesen (Regex-Literale kennt dieser Leser nicht). */
  const rest = zeile.slice(start);
  const naechstes = /\s\+\s*['"`]/.exec(rest);
  if (naechstes) return rest.slice(0, naechstes.index).trim();
  let tiefe = 0, i = start, q = null;
  for (; i < zeile.length; i++) {
    const c = zeile[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) break; tiefe--; }
    else if (tiefe === 0 && (c === '+' || c === ',' || c === ';')) break;
  }
  return zeile.slice(start, i).trim();
}

function rohStellen(quelle) {
  const ende = quelle.indexOf('/** @license');
  const text = ende > 0 ? quelle.slice(0, ende) : quelle;
  const raus = [];
  const rx = /\s([A-Za-z][\w:-]*)="'\s*\+\s*/g;
  text.split('\n').forEach((zeile, nr) => {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(zeile))) {
      const ausdruck = ausdruckLesen(zeile, m.index + m[0].length);
      if (!ausdruck || MASKIERT.test(ausdruck) || ANFUEHRUNG_ERSETZT.test(ausdruck)) continue;
      raus.push({ zeile: nr + 1, attribut: m[1], ausdruck });
    }
  });
  return raus;
}

function zaehlen(stellen) {
  const z = Object.create(null);
  for (const s of stellen) { const k = s.attribut + '|' + s.ausdruck; z[k] = (z[k] || 0) + 1; }
  return z;
}

function vergleichen(ist, soll) {
  const neu = [], verschwunden = [];
  for (const k of Object.keys(ist)) if ((ist[k] || 0) > (soll[k] || 0)) neu.push(k + ' (' + (soll[k] || 0) + ' → ' + ist[k] + ')');
  for (const k of Object.keys(soll)) if ((ist[k] || 0) < soll[k]) verschwunden.push(k + ' (' + soll[k] + ' → ' + (ist[k] || 0) + ')');
  return { neu: neu.sort(), verschwunden: verschwunden.sort() };
}

function main() {
  const args = process.argv.slice(2);
  const ki = args.indexOf('--kern');
  const kern = ki >= 0 ? path.resolve(args[ki + 1]) : path.join(REPO, 'vivodepot.html');
  const stellen = rohStellen(fs.readFileSync(kern, 'utf8'));
  const ist = zaehlen(stellen);
  if (args.includes('--grundlinie-schreiben')) {
    const sortiert = Object.fromEntries(Object.keys(ist).sort().map((k) => [k, ist[k]]));
    // Begründungen bleiben beim Neuschreiben erhalten — sie sind von Hand gesetzt, nicht erzeugt.
    let begruendungen = {};
    try { begruendungen = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')).begruendungen || {}; } catch (_) { begruendungen = {}; }
    fs.writeFileSync(GRUNDLINIE, JSON.stringify({
      begruendungen,
      hinweis: 'Rohe Attribut-Verkettungen im Kern (attribut|ausdruck: Anzahl). Darf nur schrumpfen. Erzeugt von tools/attribut-verkettung-pruefen.js --grundlinie-schreiben.',
      stellen: sortiert,
    }, null, 2) + '\n');
    console.log('attribut-verkettung-pruefen: Grundlinie geschrieben — ' + stellen.length + ' rohe Stellen.');
    return 0;
  }
  if (args.includes('--check')) {
    const soll = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')).stellen;
    const v = vergleichen(ist, soll);
    if (!v.neu.length && !v.verschwunden.length) {
      console.log('attribut-verkettung-pruefen: kein Zuwachs — ' + stellen.length + ' rohe Stellen wie in der Grundlinie.');
      return 0;
    }
    if (v.neu.length) console.error('NEUE rohe Attribut-Verkettung — mit escapeAttr maskieren:\n  ' + v.neu.join('\n  '));
    if (v.verschwunden.length) console.error('Verschwunden — Grundlinie nachziehen (--grundlinie-schreiben):\n  ' + v.verschwunden.join('\n  '));
    return 1;
  }
  for (const s of stellen) console.log(s.zeile + '\t' + s.attribut + '\t' + s.ausdruck);
  console.log(stellen.length + ' rohe Stellen');
  return 0;
}

module.exports = { rohStellen, zaehlen, vergleichen, ausdruckLesen };
if (require.main === module) process.exit(main());
