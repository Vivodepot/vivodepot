'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   datenteile.js — was ein Text-Scan nicht als Text liest (21.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Der Kürzel-Scan (Achsen VDnn, DCn) brach eine Landung ab, weil eine neu erzeugte Korpusdatei des
   .vivodepot-Formats im Chiffrat zufällig zwei Buchstaben und eine Ziffer zwischen zwei „+" trug — Base64 hat „+", „/" und „=", die eine Wortgrenze
   erfüllen. Gemessen: etwa 0,2 Treffer je MB Zufalls-Base64 und Achse. Drei Prüfer führten bis dahin je eine
   eigene Regel für Datenzeilen, und nur zwei davon kannten die Form `"ct": "<Chiffrat>"`.

   DIESE BIBLIOTHEK IST DIE EINE STELLE dafür (ein Klassenwächter in der Suite verlangt das):

   1. DATENZEILE — eine Zeile, die als Ganzes Daten ist (eingebettete Schrift, Bild, ab 200 Zeichen): eine
      `data:…;base64,`-URL, eine nackte Base64-Zeile oder eines der Schriftfelder `woff2`/`ttf`. Ein ANDERER Schlüssel
      mit Base64-Wert ist bewusst keine Datenzeile für den Kürzel-Scan (Probe [Sitzungskürzel·Negativkontrolle]).
      Zwei weitere Formen tragen nur der Zuschnitt-Bauer und die benannten `nurBase64`-Ausnahmen, wie bisher:
      DATENFELD (jeder Schlüssel mit reinem Base64-Wert ab 200) und LANGE_ZEICHENFOLGE (jede Zeile ohne Leerraum).
      Die Bibliothek ändert an diesen Grenzen nichts; sie hält sie nur an einer Stelle.

   2. chiffratMaskieren(text) — NUR für Dateien, die mit der Formatmarke beginnen (docs/format/SPEZIFIKATION.md,
      Abschnitt 2: Kennung „VIVODEPOT", ein Versions-Byte, dann das JSON). Darin werden die Krypto-Felder aus
      Abschnitt 3 ersetzt: die Werte von `ct`, `iv`, `salt`, `tuerSalt`, `depotSalt` und die Adressen (Schlüssel)
      unter `einheiten` und `umschlaege`, je nur wenn sie reines Base64 sind. Alles andere bleibt Text und wird
      geprüft, auch in derselben Zeile: Schlüsselnamen, `kennung`, `depotUUID`, `angehoerigenOrt`, die Blackbox-
      Hülle. Ersetzt wird Zeichen für Zeichen durch „*" — Länge und Zeilen bleiben, Zeilennummern stimmen.
      Gelesen wird ohne JSON.parse: der Korpus trägt absichtlich kaputte Dateien, und das JSON darf kompakt
      auf einer Zeile oder eingerückt stehen.

   Eine Datei OHNE Formatmarke wird nicht maskiert, auch wenn sie dieselben Feldnamen trägt. Ausgenommen ist
   also kein Dateityp, sondern genau das, was die Spezifikation als Chiffrat und Zufall festlegt.
   ════════════════════════════════════════════════════════════════════════════ */

const DATENZEILE = /base64,[A-Za-z0-9+/=]{200,}|^\s*"?[A-Za-z0-9+/=]{200,}"?,?\s*$|^\s*"(?:woff2|ttf)":\s*"[A-Za-z0-9+/=]{200,}",?\s*$/;
const DATENFELD = /^\s*"[A-Za-z0-9_]+"\s*:\s*"[A-Za-z0-9+/=]{200,}",?\s*$/;
const LANGE_ZEICHENFOLGE = /^\s*\S{200,}\s*$/;
// Nur der base64-Inhalt einer data:-URL (für die enge Ausnahme `nurDataUrl`); mit /g, Aufrufer ersetzen damit.
const DATA_URL_INHALT = /(data:[a-z0-9.+/-]+;base64,)[A-Za-z0-9+/=]{200,}/gi;

const FORMATMARKE = /^VIVODEPOT[\s\S]\{/;
const KRYPTO_FELDER = Object.freeze(['ct', 'iv', 'salt', 'tuerSalt', 'depotSalt']);
const ADRESS_OBJEKTE = Object.freeze(['einheiten', 'umschlaege']);
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function istDatenzeile(zeile) {
  return DATENZEILE.test(zeile);
}

function hatFormatmarke(text) {
  return FORMATMARKE.test(text);
}

/* Die Stellen [von, bis) der Krypto-Felder, aus einem toleranten Durchgang über das JSON nach der Marke. */
function chiffratStellen(text) {
  const stellen = [];
  const stapel = []; // je offener Klammer: { obj, unter } — `unter` ist der Schlüssel, unter dem sie steht
  let schluesselErwartet = false;
  let schluessel = null;
  for (let i = text.indexOf('{'); i >= 0 && i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      if (j >= text.length) break;
      const inhalt = text.slice(i + 1, j);
      const oben = stapel[stapel.length - 1];
      if (oben && oben.obj && schluesselErwartet) {
        if (ADRESS_OBJEKTE.includes(oben.unter) && BASE64.test(inhalt)) stellen.push([i + 1, j]);
        schluessel = inhalt;
        schluesselErwartet = false;
      } else if (KRYPTO_FELDER.includes(schluessel) && BASE64.test(inhalt)) {
        stellen.push([i + 1, j]);
      }
      i = j;
    } else if (c === '{' || c === '[') {
      const oben = stapel[stapel.length - 1];
      stapel.push({ obj: c === '{', unter: oben && oben.obj ? schluessel : null });
      schluesselErwartet = c === '{';
      schluessel = null;
    } else if (c === '}' || c === ']') {
      stapel.pop();
      schluesselErwartet = false;
      schluessel = null;
    } else if (c === ',') {
      const oben = stapel[stapel.length - 1];
      schluesselErwartet = Boolean(oben && oben.obj);
      schluessel = null;
    }
  }
  return stellen;
}

function chiffratMaskieren(text) {
  if (!hatFormatmarke(text)) return text;
  const teile = [];
  let pos = 0;
  for (const [von, bis] of chiffratStellen(text)) {
    teile.push(text.slice(pos, von), '*'.repeat(bis - von));
    pos = bis;
  }
  teile.push(text.slice(pos));
  return teile.join('');
}

module.exports = {
  DATENZEILE, DATENFELD, LANGE_ZEICHENFOLGE, DATA_URL_INHALT, FORMATMARKE, KRYPTO_FELDER, ADRESS_OBJEKTE,
  istDatenzeile, hatFormatmarke, chiffratStellen, chiffratMaskieren,
};
