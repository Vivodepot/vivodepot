'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textknoten-verkettung-pruefen.js — findet `'<tag>' + wert` und `wert + '</tag>'` ohne Maskierung
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (05.10.2026, Klassensuche „Werte aus fremden Dateien als HTML im DOM“): der Attribut-Wächter
   (attribut-verkettung-pruefen.js) sieht nur `name="' + wert + '"`. Ein Wert, der als TEXTKNOTEN zwischen zwei
   Tags in eine HTML-Zeichenkette verkettet wird, hatte keinen Wächter. Die Klassensuche fand an diesem Tag
   keine ungeschützte Stelle; der Schutz hing aber allein daran, dass jede Stelle von Hand maskiert war.

   WAS GEZÄHLT WIRD: jeder Ausdruck direkt nach einem Literal, das auf `>` endet (`'<li>' + wert`), und jeder
   Ausdruck direkt vor einem Literal, das mit `</` beginnt (`+ wert + '</li>'`). Steht derselbe Ausdruck an
   derselben Stelle in beiden Formen, zählt er einmal.

   ALS GESCHÜTZT GILT NUR, WAS BELEGT IST:
     - der Ausdruck beginnt mit `escapeHTML(`, `escapeAttr(` oder `encodeURIComponent(`, oder mit `esc(` in einer
       Datei, in der `const esc = escapeHTML` steht;
     - der Ausdruck ist genau ein Textsatz-Wert `STRINGS.<name>`: jeder Wert geht beim Einlass durch
       `_textsatzWertZulaessig` → `_istReinerText` (kein Tag, keine Zeichenreferenz, kein `"`); die wenigen
       Schlüssel in `_TEXTSATZ_HTML_ERLAUBT` tragen nur eine feste Absatzform;
     - `escapeXml(` nur in einer Datei, die die eingebettete QR-Bibliothek mit genau dieser Funktion trägt
       (`var escapeXml = function(s)`, ersetzt `<`, `>`, `&`, `"`; geprüft von der Probe des Trägers).
   HTML-BAUER (`…HTML(…)`, `svgIcon(…)`, `icon(…)`) gelten NICHT als geschützt, nur weil sie HTML liefern sollen:
   eine Namensregel ließe jeden künftigen Bauer still durch. Sie stehen gezählt in der Grundlinie.

   DIE RATSCHE: `tools/textknoten-verkettung-grundlinie.json` trägt die übrigen Stellen als `datei|ausdruck` mit
   Anzahl. Eine NEUE ist rot (maskieren), eine VERSCHWUNDENE ebenfalls: die Grundlinie wird nachgezogen und
   darf nur sinken.

   GRENZE: gelesen wird bis zum ersten eingebetteten Bibliotheks-Block (`/** @license`). Template-Literale und
   über mehrere Zeilen verteilte Verkettungen sieht das Muster nicht (wie beim Attribut-Wächter).
   ZWEITE GRENZE (Gegenlesung 05.10.2026): „geschützt“ wird am ANFANG des Ausdrucks erkannt — `escapeHTML(a) || b`
   gilt als geschützt, obwohl `b` roh ist. Und die Grundlinie zählt nach dem Ausdruckstext: dieselbe rohe Form an
   einer anderen Stelle tauscht unbemerkt gegen eine verschwundene. Schärfung (ganzer Ausdruck, Ort statt Text) ist
   der nächste Wagen; Eigentümer: Sicherheits-Strang.

   Aufruf:  node tools/textknoten-verkettung-pruefen.js              (Liste)
            node tools/textknoten-verkettung-pruefen.js --check      (gegen die Grundlinie, Exit 1 bei Abweichung)
            node tools/textknoten-verkettung-pruefen.js --zaehlen    (Summe je Datei)
            node tools/textknoten-verkettung-pruefen.js --grundlinie-schreiben
            --datei <pfad> (mehrfach; Vorgabe: vivodepot.html und vivodepot-lesen.html)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'textknoten-verkettung-grundlinie.json');
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];
const MASKIERT = /^(?:escapeHTML|escapeAttr|encodeURIComponent)\s*\(/;
const ESC = /^esc\s*\(/;
const ESC_XML = /^escapeXml\s*\(/;
const TEXTSATZ = /^STRINGS\.[A-Za-z_$][\w$]*$/;

/* Vorwärts: liest ab `start` bis zum nächsten `+` auf oberster Ebene (wie der Attribut-Wächter). */
function vorwaerts(zeile, start) {
  let tiefe = 0, i = start, q = null;
  for (; i < zeile.length; i++) {
    const c = zeile[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) break; tiefe--; }
    else if (tiefe === 0 && (c === '+' || c === ',' || c === ';' || c === ':' || c === '?')) break;
  }
  return { text: zeile.slice(start, i).trim(), ende: i };
}

/* Rückwärts: liest ab `ende` (exklusiv) zurück bis zum vorigen `+` auf oberster Ebene. Zeichenketten werden
   übersprungen, indem rückwärts bis zum öffnenden, nicht maskierten Anführungszeichen gelesen wird. */
function rueckwaerts(zeile, ende) {
  let tiefe = 0, i = ende - 1;
  for (; i >= 0; i--) {
    const c = zeile[i];
    if (c === "'" || c === '"' || c === '`') {
      let j = i - 1;
      while (j >= 0 && !(zeile[j] === c && zeile[j - 1] !== '\\')) j--;
      i = j; continue;
    }
    if (c === ')' || c === ']' || c === '}') tiefe++;
    else if (c === '(' || c === '[' || c === '{') { if (tiefe === 0) break; tiefe--; }
    else if (tiefe === 0 && (c === '+' || c === ',' || c === ';' || c === '=' || c === ':' || c === '?')) break;
  }
  return { text: zeile.slice(i + 1, ende).trim(), anfang: i + 1 };
}

function geschuetzt(ausdruck, mitEsc, mitEscXml) {
  return MASKIERT.test(ausdruck) || (mitEsc && ESC.test(ausdruck)) || (mitEscXml && ESC_XML.test(ausdruck)) || TEXTSATZ.test(ausdruck);
}

function stellen(quelle, datei) {
  const ende = quelle.indexOf('/** @license');
  const text = ende > 0 ? quelle.slice(0, ende) : quelle;
  const mitEsc = /const esc = escapeHTML\b/.test(text);
  const mitEscXml = /var escapeXml = function\(s\)/.test(text);
  const raus = [];
  text.split('\n').forEach((zeile, nr) => {
    const gesehen = new Set();
    const nimm = (a, pos) => {
      a = a.replace(/^(?:return|throw|yield|await)\s+/, '');
      if (!a || geschuetzt(a, mitEsc, mitEscXml) || gesehen.has(pos)) return;
      if (/^['"`]/.test(a) || /^\d+$/.test(a)) return;   // ein Literal ist kein Wert
      gesehen.add(pos);
      raus.push({ datei, zeile: nr + 1, ausdruck: a });
    };
    let m;
    const nachTag = />['"]\s*\+\s*/g;
    while ((m = nachTag.exec(zeile))) { const r = vorwaerts(zeile, m.index + m[0].length); nimm(r.text, m.index + m[0].length + (r.text ? zeile.slice(m.index + m[0].length).indexOf(r.text[0]) : 0)); }
    const vorSchluss = /\s*\+\s*['"]<\//g;
    while ((m = vorSchluss.exec(zeile))) { const r = rueckwaerts(zeile, m.index); nimm(r.text, r.anfang + (zeile.slice(r.anfang).length - zeile.slice(r.anfang).trimStart().length)); }
  });
  return raus;
}

function zaehlen(liste) {
  const z = Object.create(null);
  for (const s of liste) { const k = s.datei + '|' + s.ausdruck; z[k] = (z[k] || 0) + 1; }
  return z;
}

function vergleichen(ist, soll) {
  const fehler = [];
  for (const k of Object.keys(ist)) {
    if (!(k in soll)) fehler.push('NEU: ' + k + ' (' + ist[k] + '×) — mit escapeHTML maskieren');
    else if (ist[k] > soll[k]) fehler.push('MEHR als in der Grundlinie: ' + k + ' ' + soll[k] + ' → ' + ist[k]);
  }
  for (const k of Object.keys(soll)) {
    const n = ist[k] || 0;
    if (n < soll[k]) fehler.push('VERSCHWUNDEN: ' + k + ' ' + soll[k] + ' → ' + n + ' — Grundlinie nachziehen (--grundlinie-schreiben)');
  }
  return fehler;
}

function messen(repo, dateien) {
  const alle = [];
  for (const d of dateien) alle.push(...stellen(fs.readFileSync(path.isAbsolute(d) ? d : path.join(repo, d), 'utf8'), path.basename(d)));
  return alle;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dateien = [];
  argv.forEach((a, i) => { if (a === '--datei') dateien.push(argv[i + 1]); });
  const liste = messen(REPO, dateien.length ? dateien : DATEIEN);
  const ist = zaehlen(liste);
  if (argv.includes('--grundlinie-schreiben')) {
    const sortiert = Object.fromEntries(Object.keys(ist).sort().map((k) => [k, ist[k]]));
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(sortiert, null, 1) + '\n');
    console.log('[textknoten] Grundlinie geschrieben: ' + liste.length + ' Stellen');
  } else if (argv.includes('--check')) {
    const fehler = vergleichen(ist, JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')));
    if (fehler.length) { for (const f of fehler) console.error('[textknoten] ' + f); process.exit(1); }
    console.log('[textknoten] grün — ' + liste.length + ' Stellen wie in der Grundlinie');
  } else if (argv.includes('--zaehlen')) {
    const je = {};
    for (const s of liste) je[s.datei] = (je[s.datei] || 0) + 1;
    console.log(JSON.stringify(je));
  } else {
    for (const s of liste) console.log(s.datei + ':' + s.zeile + '\t' + s.ausdruck);
  }
}

module.exports = { stellen, zaehlen, vergleichen, messen, DATEIEN };
