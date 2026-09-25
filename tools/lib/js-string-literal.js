'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Einfach-gequotete JS-String-Literale sicher schreiben, ihr Ende finden,
   sie wieder entschärfen — EIN Ort, nicht drei Kopien (06.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Herkunft: `tools/situationen-ins-buendel-schreiben.js` (U2-ADR-341) führte `jsStringSicher`
   zuerst, mit einem `indexOf("');")` als Ende-Anker und `JSON.parse(html.slice(start,j))` OHNE
   Entschärfung. Der Fund A4 hat real getroffen, was der zweite Teil bedeutet: ein
   Dokumentmodul-Wortlaut mit einem `\"`-artigen Anführungszeichen ließ `JSON.parse` bei ~7 % der
   echten Länge abbrechen — der escapte Backslash vor dem `"` macht aus `\"` (gültiges
   JSON-Escape) nach `jsStringSicher`s Verdopplung `\\"` (ein escapter Backslash, gefolgt von
   einem BLOSSEN, string-beendenden `"`).

   KORRIGIERTE ANNAHME (derselbe Tag): der `indexOf("');")`-Anker selbst ist NICHT der Fehler —
   nachgemessen, er findet IMMER dieselbe Stelle wie `stringLiteralEndeFinden` unten, weil
   `jsStringSicher` jeden Apostroph unbedingt escaped und darum nach dem Schreiben kein blosses
   `'` mehr vor dem echten Ende stehen kann. Der EINZIGE reale Fehler war die fehlende
   Entschärfung vor `JSON.parse` (s. `tests/js-string-literal-escape-fund.test.js`, das die
   erste, falsche Fassung dieser Behauptung dokumentiert und richtigstellt). Der escape-bewusste
   Scanner bleibt trotzdem hier — er zieht dieselbe Grenze unabhängig von der genauen
   Escape-Strategie und ist darum robuster gegen künftige Änderungen an `jsStringSicher`, auch
   wenn er heute keinen zusätzlichen Fall fängt.

   `situationen-ins-buendel-schreiben.js` ist in DEMSELBEN Commit auf diese Bibliothek umgestellt
   und liest jetzt entschärft vor `JSON.parse` (nicht mehr offen, kein eigener Posten). Neue
   Erzeuger lesen von HIER, statt den Fehler ein drittes Mal zu bauen.

   NACHTRAG (07.09.2026, A4-Landung) — ROHE C0-/C1-STEUERZEICHEN: `JSON.stringify` escaped C0
   (U+0000–U+001F) zwingend, den C1-Bereich (U+007F–U+009F, DEL eingeschlossen) NIE. Ein
   Dokumentmodul-Wortlaut trug ein natives `\x83`-artiges Escape im Quelltext; der JSON-Rundlauf
   (`JSON.parse(JSON.stringify(...))` beim Lesen aus dem Kern) dekodierte es zur echten
   Steuerzeichen-Byte, und `JSON.stringify` beim Zurückschreiben ließ sie ROH stehen — vier Treffer
   im W3C-Nu-Html-Checker-Wächter (`tests/keine-rohen-steuerzeichen.test.js`), real getroffen bei
   A4 (U2-ADR-345). Trifft JEDEN, der ein Bündel durch einen JSON-Rundlauf schickt — darum HIER,
   nicht im aufrufenden Werkzeug: `jsStringSicher` escaped C0/C1 jetzt selbst, als LETZTEN Schritt
   (nach der Backslash-Verdopplung — sonst würde die eigene `\uXXXX`-Escape-Sequenz mitverdoppelt
   und vom JS-Parser als Literaltext statt als Unicode-Escape gelesen). Bereich exakt gespiegelt
   aus dem Wächter selbst (`istC0`/`istC1` dort), NICHT neu erfunden — \t/\n/\r bleiben unangetastet,
   die schreibt `JSON.stringify` ohnehin schon als benannte Escapes.
   ════════════════════════════════════════════════════════════════════════ */

/* Escaped einen Text für die Einbettung in ein einfach-gequotetes JS-String-Literal:
   Backslashes zuerst verdoppeln, DANACH Apostrophe escapen (Reihenfolge ist Teil der
   Korrektheit — vertauscht, escapt der zweite Schritt auch die frisch verdoppelten
   Backslashes mit), ZULETZT rohe C0-/C1-Steuerzeichen als `\uXXXX` (s. Kopfkommentar
   „NACHTRAG" — muss der letzte Schritt sein, sonst verdoppelt der erste Schritt das
   frisch eingefügte Escape-Backslash mit). */
function jsStringSicher(text) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let out = '';
  for (const ch of escaped) {
    const cp = ch.codePointAt(0);
    // exakt gespiegelt aus tests/keine-rohen-steuerzeichen.test.js (istC0/istC1) — \t/\n/\r
    // (0x09/0x0A/0x0D) bleiben unangetastet, JSON.stringify hat sie laengst benannt escaped.
    const istC0 = cp <= 0x1f && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d;
    const istC1 = cp >= 0x7f && cp <= 0x9f;
    out += (istC0 || istC1) ? ('\\u' + cp.toString(16).padStart(4, '0')) : ch;
  }
  return out;
}

/* Umkehrung von `jsStringSicher` — EIN Durchlauf, nicht zwei verkettete `replace()`
   (die Reihenfolge wäre sonst nicht sauber umkehrbar). Jedes `\X` im Text ist eine
   Escape-Einheit aus genau zwei Zeichen, das zweite Zeichen ist der wahre Wert — AUSSER
   `\uXXXX` (sechs Zeichen, das C0-/C1-Escape von oben): ein EINZELNER (nicht verdoppelter)
   Backslash vor `u` + vier Hex-Ziffern kann nur von dort stammen, weil `jsStringSicher`
   jeden ROHEN Backslash aus dem Original-Text bereits verdoppelt hat — keine Mehrdeutigkeit. */
function jsStringEntsichern(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      const naechstes = text[i + 1];
      const hex = (naechstes === 'u') ? text.slice(i + 2, i + 6) : '';
      if (naechstes === 'u' && /^[0-9a-fA-F]{4}$/.test(hex)) {
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        continue;
      }
      out += naechstes; i++; continue;
    }
    out += ch;
  }
  return out;
}

/* Findet das ECHTE Ende eines mit `jsStringSicher` maskierten String-Literals ab `start`
   (der Index direkt nach dem öffnenden `'`) — escape-bewusst: ein `\` überspringt sich
   selbst und das nächste Zeichen, egal was es ist; das erste UNESCAPETE `'` danach ist
   das Ende. Gibt -1 zurück, wenn kein Ende gefunden wird.

   WARUM DIESE FUNKTION EXISTIERT, OBWOHL SIE HEUTE KEINEN ZUSÄTZLICHEN FALL FÄNGT: der
   naive `indexOf("');")` war NIE das Problem — die fehlende Entschärfung vor `JSON.parse`
   war es (s. Kopfkommentar, „KORRIGIERTE ANNAHME"). Diese Funktion zieht dieselbe Grenze
   nur UNABHÄNGIG von der genauen Escape-Strategie in `jsStringSicher` — ändert sich die
   dort, bleibt hier nichts stillschweigend falsch. WER `jsStringSicher` ändert, MUSS diese
   Funktion mitdenken, nicht sie als toten Code streichen. */
function stringLiteralEndeFinden(html, start) {
  let i = start;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === "'") return i;
    i++;
  }
  return -1;
}

module.exports = { jsStringSicher, jsStringEntsichern, stringLiteralEndeFinden };
