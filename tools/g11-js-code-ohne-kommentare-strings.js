'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   G11 — JS-Code ohne Kommentare und String-/Template-Literale
   ────────────────────────────────────────────────────────────────────────────
   Anlass: die Offline-Garantie-Probe (05.08.2026).
   Anders als `tools/zusicherungen-kern.js`s `kommentarZeilen()` (die bewusst NUR
   ganze Kommentarzeilen ausschließt und Treffer in String-Literalen sichtbar
   lässt — dort ist das richtig, ein Verstoß in einem angezeigten Text soll
   auffallen) verlangt DIESER Auftrag das Gegenteil: ein API-Name, der nur in
   einem Kommentar oder einer Fehlermeldung STEHT (Selbstauskunft "kein fetch()"),
   darf die Netz-Code-Probe nicht rot machen — nur ein Vorkommen in wirklich
   ausgeführtem Code zählt. Eigene Datei statt einer dritten Variante in
   zusicherungen-kern.js, weil beide Ausschluss-Arten für unterschiedliche
   Fragen richtig sind und eine gemeinsame Funktion mit einem Modus-Flag hier
   mehr verschleiert als sie teilt.

   Zeichenweiser Automat: Zeilenkommentare, Blockkommentare, '..'-, ".."- und
   `..`-Literale werden durch ein Leerzeichen ersetzt (Wortgrenzen bleiben
   erhalten, kein zufälliges Verschmelzen von Code davor/danach). Template-
   Literale werden GANZ entfernt, EINSCHLIESSLICH `${...}`-Interpolationen —
   bekannte, akzeptierte Grenze: ein echter API-Aufruf INNERHALB einer
   Interpolation würde nicht gefunden. Für diesen Kern zutreffend geprüft
   (keiner der sechs Aufrufe steht dort) und als Grenze hier festgehalten,
   nicht verschwiegen.

   Regex-Literale vs. Division: klassische JS-Mehrdeutigkeit. Heuristik wie in
   den meisten leichten Tokenizern — ein `/` beginnt ein Regex-Literal, wenn das
   letzte sichtbare Zeichen davor ein Operator/Trenner ist (oder der Anfang der
   Datei/Zeile). Nach einem Bezeichner (z. B. `return`) kann diese Heuristik
   danebenliegen; für DIESEN Zweck unkritisch, weil ein falsch als Division
   gelesenes Regex-Literal höchstens dazu führt, dass ein `/`-Zeichen einzeln
   durchgereicht wird — es entsteht dadurch nie ein neuer Treffer für die sechs
   gesuchten Bezeichner, es kann höchstens den Rest der Zeile falsch als Code
   statt als Regex-Inhalt lesen, was bei den gesuchten Wort-Mustern (`\bfetch\b`
   u. ä.) ebenfalls harmlos ist, weil Regex-Inhalte keine dieser Bezeichner in
   Wortform enthalten (URLs/Zeichenklassen, keine JS-Bezeichner).
   ════════════════════════════════════════════════════════════════════════════ */

const REGEX_ERLAUBT_VOR = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '^', '~', '<', '>', '\n']);

function ohneKommentareUndStrings(code) {
  let out = '';
  let i = 0;
  const n = code.length;
  let letztesSichtbares = '\n';   // Dateianfang zählt wie Zeilenanfang

  while (i < n) {
    const c = code[i];
    const c2 = i + 1 < n ? code[i + 1] : '';

    // Zeilenkommentar
    if (c === '/' && c2 === '/') {
      i += 2;
      while (i < n && code[i] !== '\n') i++;
      continue;
    }
    // Blockkommentar
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i = Math.min(i + 2, n);
      out += ' ';
      continue;
    }
    // Einfache/doppelte String-Literale
    if (c === '"' || c === "'") {
      const anfuehrung = c;
      i++;
      while (i < n && code[i] !== anfuehrung) { if (code[i] === '\\') i++; i++; }
      i++;
      out += ' ';
      letztesSichtbares = ')';
      continue;
    }
    // Template-Literal — GANZ entfernt, inkl. ${...} (dokumentierte Grenze s. o.)
    if (c === '`') {
      i++;
      while (i < n && code[i] !== '`') { if (code[i] === '\\') i++; i++; }
      i++;
      out += ' ';
      letztesSichtbares = ')';
      continue;
    }
    // Regex-Literal (Heuristik s. Kopf-Kommentar)
    if (c === '/' && REGEX_ERLAUBT_VOR.has(letztesSichtbares)) {
      let j = i + 1, inKlasse = false, gueltig = false;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '\n') break;
        if (code[j] === '[') inKlasse = true;
        else if (code[j] === ']') inKlasse = false;
        else if (code[j] === '/' && !inKlasse) { gueltig = true; break; }
        j++;
      }
      if (gueltig) {
        let k = j + 1;
        while (k < n && /[a-z]/i.test(code[k])) k++;
        i = k;
        out += ' ';
        letztesSichtbares = ')';
        continue;
      }
      // kein gültiges Regex-Literal gefunden — als normales Zeichen (Division) weiterreichen
    }
    out += c;
    if (!/\s/.test(c)) letztesSichtbares = c;
    else if (c === '\n') letztesSichtbares = '\n';
    i++;
  }
  return out;
}

module.exports = { ohneKommentareUndStrings };
