#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   geruest-waechter-pruefen.js — W0, der Gerüst-Wächter: das Gerüst wächst nicht (20.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Zwischen dem 17. und 18.09.2026 wanderte Inhalt aus dem 195-KB-Bündel in die
   AB_WERK_*-Konstanten von vivodepot.html. Das sah wie ein Schnitt aus, weil die Bündelzahl fiel —
   es war ein Umzug innerhalb des Kerns. Keine Probe maß „das Gerüst ist leer". Vorgabe: das
   Gerüst trägt Struktur und englische Feldbezeichnungen, sonst nichts.

   WAS GEMESSEN WIRD. Jede Konstante `AB_WERK_*` in der rohen vivodepot.html, in UTF-8-Bytes, von
   der Deklaration (`const`/`let`) bis zum abschließenden Semikolon. Nichts sonst: ein
   „enthält natürliche Sprache"-Erkenner ist nicht entscheidbar und wird nicht gebaut.

   DIE POSITIVLISTE HÄNGT AN DEN KONSTANTEN, NICHT AN DEN REGIONEN. Gemessen am Kanon de92a540:
   27 Konstanten, aber nur 30 `:BEGIN`-Marker, und sieben Konstanten haben gar keine Region —
   darunter AB_WERK_TEXTSATZ_DE, der mit rund 400 KB größte Posten überhaupt. Ein Deckel am
   Marker-Namen wäre gerade dafür blind.

   ZWEI ACHSEN MIT VERSCHIEDENEN ROLLEN. Die eine sagt WO, die andere sagt OB.

   Achse 1 — DIAGNOSE, je Konstante (tools/geruest-waechter-grundlinie.json, `konstanten`):
     bytes    Byte-Deckel. Wächst die Konstante über ihn, ist das ein Fund.
     marker   trägt sie einen Andockpunkt `NAME:BEGIN`? Eigene Spalte, KEINE Bedingung für die
              erste: eine Konstante ohne Marker ist genauso gedeckelt.
   Diese Achse ist AUSWEICHBAR: Inhalt, der hinter eine Zwischenkonstante oder einen Ausdruck
   wandert, verlässt sie unbemerkt (AB_WERK_AUSZUG_BUNDLE_TEXTE misst 111 Byte, weil sie nur
   `Object.freeze(_ZUGANG_RECHT_LOGIK_MODULE.map(...))` ist; der Inhalt liegt in einer nicht so
   benannten Konstante). Genau so kam Inhalt zwischen dem 17. und 18.09.2026 zurück. Eine Warnung
   an dieser Stelle schließt das nicht, darum die zweite Achse.

   Achse 2 — DIE BINDENDE ZUSICHERUNG (`eimer`, `fremdcode`): die Bytes aller Zeichenketten-Literale
   (' " und Template-Text, in den <script>-Blöcken) AUSSERHALB jeder Marker-Region `NAME:BEGIN` …
   `NAME:END`. Kommentare, Bezeichner und Ausdrücke zählen nicht; gezählt wird der Inhalt zwischen
   den Begrenzern, wie geschrieben, in UTF-8. Inhalt, der über eine Zwischenkonstante ins Gerüst
   wandert, landet zwangsläufig außerhalb einer Region und hebt diese Zahl, gleich wie die Konstante
   heißt. Die Zahl ist in DREI EIMER zerlegt, deren Summe die gesamte Achse ist (gemessen: die Teile
   ergeben die Gesamtzahl auf das Byte):

     fremdcode  Zeichenketten in Skriptblöcken, die in der Grundlinie NAMENTLICH im Register stehen
                (heute jsPDF 4.2.1, der QR-Code-Generator, die Inter-Restzeichenketten). Herkunft,
                nicht Erkennung: ein Block ist Fremdcode, wenn er im Register steht, an seiner
                `id` oder seinem `@license`-Kopf erkannt, nie an den Zeichenketten. Ein vierter,
                nicht eingetragener Bibliotheksblock fällt in struktur/satz, also nicht still.
                Eine Bibliotheks-Aktualisierung ändert nur den Deckel dieses Blocks und wird als
                benannter Zuwachs mit Version eingetragen.
     struktur   was keinen natürlichen Text tragen kann: Zeichenketten ohne Leerzeichen
                (Kennungen, Klassennamen, Objektschlüssel, kleingeschriebene Einzelwörter wie
                `'string'`), Markup/SVG/CSS ohne ein Wort von mindestens fünf Buchstaben außerhalb
                von Tags und Attributen, CSS-Selektoren, Klassenlisten, Style-Werte und die
                Einzelwörter der Liste `technischeWoerter`. Das ist eine FORM, keine Liste: 18 065
                Stücke lassen sich nicht listen. struktur darf steigen, aber JEDER Zuwachs steht
                namentlich mit Grund in `zuwaechse`.
     satz       alles andere: jede Zeichenkette mit Leerzeichen UND einem Wort, und jedes
                großgeschriebene Einzelwort (deutsche Substantive) außerhalb von technischeWoerter.
                Byte-exakt, darf nur sinken, kein Budget, nie eine Ausnahme. Was der Form von
                struktur nicht entspricht, ist satz: eine Sorte, die keiner benannt hat, fällt in
                den harten Eimer statt still durchzugehen.
   Gemessen am Kanon f82f6314 (Byte): struktur 383 727 · satz 223 663 · fremdcode 48 639, zusammen
   656 029. Von den satz-Bytes liegen rund 188 900 in AB_WERK_TEXTSATZ_DE, der Rest sind verstreute
   Beschriftungskataloge und deutsche Fehlertexte.

   WAS DIESE ZAHLEN NICHT SIND: nicht „so viel Inhalt". Sie sind ein Wächter gegen WACHSTUM, kein Maß
   für Leere. Der Messweg ist selbst geprüft: je <script>-Block wird der Text ohne die gezählten
   Literale als Skript übersetzt (vm.Script, nie ausgeführt); eine falsch erkannte Grenze bricht das,
   und die Messung meldet ein Problem statt einer Zahl.

   BEIDE ACHSEN: exakte Übereinstimmung, nicht nur „nicht mehr als". Ein zu hoher Deckel macht den
   Rot-Beweis auslöseunfähig und wird sofort gezogen, nicht beim nächsten Durchgang. Jede Landung,
   die Bytes aus einem Eimer entfernt, schreibt dessen Deckel neu, am Ist, in ihrem eigenen Commit.

   RATSCHE. `--grundlinie-schreiben` SENKT und streicht, es verweigert jedes Anheben und jeden
   verlorenen Andockpunkt. Es gibt keinen stillen Anheben-Schalter. Eine NEUE Konstante wird verweigert,
   außer sie ist ein LEERER Andockpunkt (Marker `NAME:BEGIN`, höchstens ANDOCKPUNKT_HOECHSTENS Byte)
   und wird benannt beantragt (`--anhebung <NAME> --grund "…"`, Eintrag in `zuwaechse` von 0): die
   Architektur verlangt neue Andockpunkte, ein Weg, der nur von Hand ginge, würde von Hand bedient.
   GRENZE, MIT ANSAGE: diese Regel — und der ganze Wächter — erfaßt nur Konstanten mit dem Namen
   `AB_WERK_…`. Ein Andockpunkt anderer Namenskonvention (etwa `HERKUNFTSORT_ANGABEN`) ist hier nicht
   sichtbar, weder als Wachstum noch als neuer Andockpunkt. Das ist eine Wächter-Lücke mit Ansage; wer
   sie schließen will, erweitert DEKLARATION, nicht die Ausnahmen.

   ZUWACHS, BENANNT. Nur struktur, ein fremdcode-Block und eine Konstante können steigen, und nur so:
   `--grundlinie-schreiben --anhebung <ziel> --grund "<Text>"` mit ziel `struktur`, `fremdcode:<name>`
   oder einem AB_WERK_-Namen. Der Eintrag in `zuwaechse` trägt Ziel, von, auf, `daneben` und einen Grund
   von mindestens 40 Zeichen. `daneben` (vom Werkzeug berechnet) ist die Änderung jedes ANDEREN Eimers
   im selben Lauf, je Eimer einzeln: `{ satz: -42 }`, nie als eine Zahl. Zuwachs und Senkung stehen
   je Eimer da, nie als Bilanz: das Register trennt, was das Werkzeug trennt; eine Zahl, die zwei Eimer
   zusammenfasst, hebt die Trennung auf — sie ist nicht ein Guthaben, sondern eine Bilanz. (Bis
   21.09.2026 trug jeder Eintrag ein `netto`, die Summe über alle Eimer des Laufs: struktur +179 und
   satz −42 standen als „137" da, und keine der beiden Zahlen war mehr zu lesen. `zuwaechsePruefen`
   verwirft ein `netto` jetzt als Fund.)
   Eine Anzahl-Grenze gibt es nicht; es begrenzt der Deckel selbst. Ein einzelner Zuwachs an struktur
   oder einer Konstante darf höchstens ZUWACHS_HOECHSTENS = 1024 Byte betragen: gemessen ist die längste
   Zeichenkette im Struktur-Eimer außerhalb von Base64-Blöcken 867 Byte (ein Beispiel-Credential), der
   längste SVG-Pfad 608; 1024 ist diese Messung plus 18 % Luft. Binäre Blöcke (data:-URIs, Base64: heute
   drei PNG mit zusammen 36 738 Byte) gehören in eine Marker-Region wie PDF-INTER-B64, nicht in diesen Eimer.
   fremdcode hat keine Größengrenze, weil eine Bibliothek beim Aktualisieren beliebig wächst. Für satz
   gibt es keinen Zuwachs, nie.

   LISTEN-WARNUNG. Wer eine Zeichenkette in `technischeWoerter` oder einen Block in `fremdcode`
   aufnimmt, NIMMT IHR DEN BYTE-EXAKTEN SCHUTZ. Eine zu enge Liste kostet nichts, weil der Deckel am
   Ist gemessen wird und nur sinken kann; eine zu großzügige gibt eine Kette frei, die Inhalt sein
   könnte. Im Zweifel NICHT aufnehmen. Das Reflex-Verhalten (listen, um Rot zu vermeiden) ist hier
   der teure Schritt. Für fremdcode gilt Herkunft, nicht Erkennung: namentlich, mit Fundstelle.

   SOLLWERT DER MARKER-REGIONEN. Eine Marker-Region nimmt ihren Inhalt aus der zweiten Achse: was
   zwischen `NAME:BEGIN` und `NAME:END` steht, zählt dort nicht. Jede Region wäre damit ein Versteck mit
   Deckel (die Achse 1 deckelt nur die Konstante). Gemessen am Kanon a9e2aaf5: 75 727 Byte deutscher
   Inhalt lagen in EINER Zeichenkette in AB_WERK_BASISTEMPLATE_DE, aus der zweiten Achse genommen und von
   keinem Schnitt gezählt. Darum gilt zusätzlich, je Region, über die satzförmigen Zeichenketten in ihr
   (gleiche Sortierung wie oben, Fremdcode-Blöcke ausgenommen):
     Der Sollwert jeder Marker-Region ist 0. Auch eine Nutzlast-Region ist im Gerüst leer: der
     Konfektionierer füllt sie erst beim Produktbau.
     Ein Wert über 0 ist ein ÜBERGANGSZUSTAND, nie ein Entwurf: die Region steht in `regionen.uebergang`
     mit dem Posten, der sie auf 0 bringt, und einer Probe (Testdatei, die existiert und die Region
     beim Namen nennt). Byte-Deckel exakt, nur sinkend; erreicht die Region 0, wird die Zeile gestrichen,
     bis dahin ist sie rot. Die ZAHL der Übergänge (`uebergangDeckel`) ist exakt und kann nur sinken.
     Eine Region mit Satz, die in keiner Liste steht, ist rot.
     Nur eine Sorte darf DAUERHAFT über 0 stehen (`regionen.dauerhaft`): Text, den wir führen MÜSSEN, weil
     das Weglassen falsch wäre (heute die Lizenz- und Urheberhinweise der Codelisten in CODE-LISTEN,
     1 945 Byte). Ihre Probe sichert das VORHANDENSEIN, nicht das Weglassen: sie ist rot, wenn der Text weg ist.
   Der Sollwert misst Zeichenketten-Inhalt, nicht die Länge der Region: eine geleerte Region
   (`const X = Object.freeze([]);`, ihre eigene Deklaration) trägt 0 Byte Satz, der Sollwert ist also
   erreichbar. Nach S4, S7 und dem S5-Rest bleiben im ganzen Gerüst 1 945 Byte satzförmig, und das ist
   Lizenztext. Grenze: auch das ist ein Zeichenketten-Maß; ob eine Nutzlast-Konstante geparst leer ist
   (`[]`, `{}`, `null`), prüft es nicht.

   AUFLAGE BEIM LANDEN IM KANON. Die Deckel sind gegen den Stand gemessen, auf dem dieser Zweig gebaut
   wurde (Schema 86, nach der Kennungs-Umstellung), nicht gegen den Kanon. Wird der Zweig vor der
   Zusammenführung umgesetzt oder verändert, ist der Deckel gegen etwas gemessen, das es so nicht mehr
   gibt: zu hoch heißt, der Rot-Beweis kann nicht mehr auslösen; zu niedrig heißt, er blockiert eine
   berechtigte Landung. Beides fällt still aus. Darum beim tatsächlichen Landen im Kanon
   `node tools/geruest-waechter-pruefen.js` laufen lassen: NACHMESSEN, nicht neu setzen. Grün heißt, die
   Zahlen tragen. Weicht es ab, wird die Abweichung mit Grund in der Commit-Nachricht benannt; die
   Grundlinie wird dabei nie angehoben (`--grundlinie-schreiben` verweigert es).

   GRENZE, BEZIFFERT. (1) Dieses Maß fängt keine einwortige Beschriftung im Kleinschreibungs-
   Bereich: kleingeschriebene Einzelwörter sind struktur (heute 4 835 Stücke, 36 206 Byte, gemischt
   aus JS-Werten wie `'string'` und deutschen wie `'unbekannt'`); großgeschriebene (933 Stücke, 9 416
   Byte, 610 verschiedene) sind satz, dort ist die technischeWoerter-Liste die handgeprüfte Ausnahme
   für eindeutig englische Typ- und Protokollnamen. Was struktur gegen einen eingeschleusten
   Katalog einwortiger Beschriftungen schützt, ist die Benennungspflicht für jeden Zuwachs, nicht das
   Maß. (2) Ein deutsches Einzelwort mit Satzzeichen (`'Hinweis:'`) hat kein Leerzeichen und
   fällt in struktur. (3) Inhalt in Bezeichnern, Zahlenfeldern oder Struktur, und Text als HTML-Markup
   oder Attribut außerhalb der <script>-Blöcke, sieht keiner der Eimer (gemessen 20.09.2026: 2 103
   Byte in 22 Knoten, im Wesentlichen der noscript-Satz). (4) Inhalt in einer Marker-Region wird von
   Achse 2 nicht gemessen; dort steht nur der Deckel der Achse 1. Und „grün" heißt „nicht
   gewachsen", nicht „das Gerüst ist leer".

   EINHEIT. Bytes (UTF-8), nie KB oder KiB: AB_WERK_TEXTSATZ_DE = 410 421 Byte = 400,8 KiB (Stand
   vor der Kennungs-Umstellung). Die Ausgabe rechnet zur Lesbarkeit in 1000er-KB; wer gegen KiB-Zahlen
   vergleicht, rechnet um.

   Aufruf:
     node tools/geruest-waechter-pruefen.js                       prüft die vivodepot.html im Repo
     node tools/geruest-waechter-pruefen.js --datei <pfad>        prüft eine andere Datei
     node tools/geruest-waechter-pruefen.js --grundlinie-schreiben   senkt die Grundlinie auf den
                                                                  gemessenen Stand (nie anheben)
     ... --grundlinie-schreiben --anhebung <ziel> --grund "<Text>"  wie oben, dazu EINE benannte
                                                                  Anhebung; <ziel> ist ein AB_WERK_-
                                                                  Name oder ausserhalbRegionen
     node tools/geruest-waechter-pruefen.js --grundlinie-datei <pfad>  liest/schreibt eine andere
                                                                  Grundlinie (für Proben)
   Exit 0 = grün, 1 = Fund. Die Testdatei prüft die Messung an synthetischen Texten UND den
   Rot-Beweis: 1 KB an eine Konstante OHNE Marker (AB_WERK_TEXTSATZ_DE, an der echten Datei), dazu 1 KB
   Zeichenkette außerhalb jeder Region unter einem Namen, der nicht AB_WERK_ heißt.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO = path.join(__dirname, '..');
const STANDARD_DATEI = path.join(REPO, 'vivodepot.html');
const ZUWACHS_HOECHSTENS = 1024;
/* Ein NEUER, leerer Andockpunkt darf das Lochbild vergrößern (21.09.2026): Konstante MIT Andockpunkt (`NAME:BEGIN`) und höchstens so viele Byte. Gemessen am Kanon (21.09.2026, 23 Konstanten):
   alle 19 Konstanten mit Andockpunkt sind 29–65 Byte groß (das Statement ist die Namenslänge plus 12–29 Byte), alle 4 ohne sind 157–2417 Byte groß.
   96 = 65 × 1,5, weit unter 157 — ein Name bis 67 Zeichen passt (der längste heutige hat 36). Eine Konstante mit Inhalt ist das Wachstum, das die Regel verhindern soll; ein leerer Andockpunkt ist Wachstum des Lochbilds. */
const ANDOCKPUNKT_HOECHSTENS = 96;
const GRUND_MINDESTLAENGE = 40;
const GRUNDLINIE_PFAD = path.join(__dirname, 'geruest-waechter-grundlinie.json');

const DEKLARATION = /^[ \t]*(?:const|let|var)[ \t]+(AB_WERK_[A-Z0-9_]+)[ \t]*=/gm;

function stringEnde(text, i) {
  const anfuehrung = text[i];
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') j += 2;
    else if (text[j] === anfuehrung) return j + 1;
    else j += 1;
  }
  return text.length;
}

// Ende des Statements ab `start`: das erste `;` außerhalb von Strings, Templates, Kommentaren
// und Klammern. Regex-Literale kennt der Scanner nicht — darum wird jedes Ergebnis in
// `konstantenMessen` per vm.Script als vollständiges Statement gegengeprüft.
function statementEnde(text, start) {
  const n = text.length;
  const stapel = [{ art: 'code', tiefe: 0, ausdruck: false }];
  let i = start;
  while (i < n) {
    const oben = stapel[stapel.length - 1];
    const c = text[i];
    if (oben.art === 'vorlage') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stapel.pop(); i += 1; continue; }
      if (c === '$' && text[i + 1] === '{') { stapel.push({ art: 'code', tiefe: 0, ausdruck: true }); i += 2; continue; }
      i += 1;
      continue;
    }
    if (c === '\'' || c === '"') { i = stringEnde(text, i); continue; }
    if (c === '`') { stapel.push({ art: 'vorlage' }); i += 1; continue; }
    if (c === '/' && text[i + 1] === '/') { const e = text.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '(' || c === '[' || c === '{') { oben.tiefe += 1; i += 1; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (oben.ausdruck && c === '}' && oben.tiefe === 0) { stapel.pop(); i += 1; continue; }
      oben.tiefe -= 1;
      i += 1;
      continue;
    }
    if (c === ';' && stapel.length === 1 && oben.tiefe === 0) return i + 1;
    i += 1;
  }
  return -1;
}

const KLARTEXT_WORTE = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

function literaleImBlock(t, i, n, out) {
  let regexErlaubt = true;
  while (i < n) {
    const c = t[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i += 1; continue; }
    if (c === '/' && t[i + 1] === '/') { const x = t.indexOf('\n', i); i = x < 0 || x > n ? n : x; continue; }
    if (c === '/' && t[i + 1] === '*') { const x = t.indexOf('*/', i + 2); i = x < 0 ? n : x + 2; continue; }
    if (c === '\'' || c === '"') { const e = stringEnde(t, i) - 1; out.push({ s: i + 1, e: Math.min(e, n) }); i = e + 1; regexErlaubt = false; continue; }
    if (c === '`') { i = vorlageLesen(t, i + 1, n, out); regexErlaubt = false; continue; }
    if (c === '/') {
      if (regexErlaubt) {
        let j = i + 1;
        let klasse = false;
        while (j < n) {
          const d = t[j];
          if (d === '\\') { j += 2; continue; }
          if (d === '[') klasse = true; else if (d === ']') klasse = false;
          else if (d === '/' && !klasse) break; else if (d === '\n') break;
          j += 1;
        }
        j += 1;
        while (j < n && /[a-z]/i.test(t[j])) j += 1;
        i = j; regexErlaubt = false; continue;
      }
      i += 1; regexErlaubt = true; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(t[j])) j += 1;
      regexErlaubt = KLARTEXT_WORTE.has(t.slice(i, j));
      i = j; continue;
    }
    if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /[\w.]/.test(t[j])) j += 1; i = j; regexErlaubt = false; continue; }
    if (c === ')' || c === ']' || c === '}') { regexErlaubt = c === '}'; i += 1; continue; }
    regexErlaubt = true; i += 1;
  }
}

function vorlageLesen(t, i, n, out) {
  let s = i;
  while (i < n) {
    const c = t[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') { out.push({ s, e: i }); return i + 1; }
    if (c === '$' && t[i + 1] === '{') { out.push({ s, e: i }); i = ausdruckLesen(t, i + 2, n, out); s = i; continue; }
    i += 1;
  }
  return n;
}

function ausdruckLesen(t, i, n, out) {
  let tiefe = 0;
  while (i < n) {
    const c = t[i];
    if (c === '\'' || c === '"') { const e = stringEnde(t, i) - 1; out.push({ s: i + 1, e }); i = e + 1; continue; }
    if (c === '`') { i = vorlageLesen(t, i + 1, n, out); continue; }
    if (c === '/' && t[i + 1] === '/') { const x = t.indexOf('\n', i); i = x < 0 ? n : x; continue; }
    if (c === '/' && t[i + 1] === '*') { const x = t.indexOf('*/', i + 2); i = x < 0 ? n : x + 2; continue; }
    if (c === '{') tiefe += 1;
    if (c === '}') { if (tiefe === 0) return i + 1; tiefe -= 1; }
    i += 1;
  }
  return n;
}

/**
 * Achse 2: Bytes aller Zeichenketten-Literale in den <script>-Blöcken, getrennt nach innerhalb und
 * außerhalb der Marker-Regionen `NAME:BEGIN` … `NAME:END`. Wirft nie: Unstimmigkeiten stehen in
 * `probleme` (unpaarige Marker, ein Skriptblock, der ohne die gezählten Literale nicht übersetzbar ist).
 * @param {string} text
 * @returns {{ausserhalb:number, innerhalb:number, literale:number, probleme:string[]}}
 */
const HTML_TAGS = new Set(['a', 'b', 'i', 'p', 'u', 'br', 'hr', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ol', 'ul', 'dd', 'dl', 'dt', 'td', 'th', 'tr', 'div', 'img', 'nav', 'svg', 'path', 'span', 'main', 'form', 'input', 'label', 'button', 'select', 'option', 'table', 'thead', 'tbody', 'section', 'article', 'header', 'footer', 'aside', 'details', 'summary', 'textarea', 'body', 'html', 'circle', 'rect', 'line', 'strong', 'small', 'code', 'pre']);
const CSS_EIGENSCHAFTEN = new Set(['color', 'display', 'font', 'margin', 'padding', 'width', 'height', 'border', 'background', 'position', 'top', 'left', 'right', 'bottom', 'opacity', 'overflow', 'cursor', 'gap', 'flex', 'grid', 'transform', 'transition', 'content', 'visibility', 'fill', 'stroke']);

// Ein natürliches Wort: eine Buchstabenfolge von mindestens fünf Zeichen AUSSERHALB von Tags und Attributen.
function natuerlichesWort(s) {
  const ohne = s
    .replace(/<[^>]*>/g, ' ')
    .replace(/<\/?[a-zA-Z][\w-]*/g, ' ')
    .replace(/[\w:-]+\s*=\s*(\\?"[^"\\]*\\?"|\\?'[^'\\]*\\?')/g, ' ')
    .replace(/[\w:-]+=\\?["']?/g, ' ')
    .replace(/\\[nrt]|\\u[0-9a-fA-F]{4}/g, ' ');
  return /[A-Za-zäöüßÄÖÜ]{5,}/.test(ohne);
}

function selektorForm(s) {
  const t = s.trim();
  if (!t || !/[.#]/.test(t)) return false;
  const teile = t.split(/\s*[>+~,]\s*|\s+/).filter(Boolean);
  if (!teile.some((x) => /^[.#]/.test(x))) return false;
  return teile.every((x) => /^[.#][\w-]+(\[[^\]]*\])*(:[\w-]+(\([^)]*\))?)*$/.test(x) || HTML_TAGS.has(x) || x === '*');
}

function klassenlisteForm(s) {
  const teile = s.trim().split(/\s+/);
  return teile.length >= 2 && teile.every((x) => /^[a-z][a-z0-9_-]*$/.test(x)) && teile.some((x) => /[-_]/.test(x));
}

function styleForm(s) {
  const t = s.replace(/^[\s"'>]+|[\s"'>]+$/g, '');
  const teile = t.split(';').map((x) => x.trim()).filter(Boolean);
  return teile.length > 0 && teile.every((x) => {
    const m = /^([a-z-]+)\s*:\s*\S.*$/.exec(x);
    return m && (m[1].includes('-') || CSS_EIGENSCHAFTEN.has(m[1]));
  });
}

/**
 * Sortiert eine Zeichenkette in „struktur" oder „satz". Struktur (darf, benannt, steigen) ist, was
 * keinen natürlichen Text tragen kann: Bezeichner ohne Leerzeichen, Markup/SVG/CSS ohne Wort,
 * Selektoren, Klassenlisten, Style-Werte, und die Wörter der Liste `technischeWoerter`. Alles andere
 * ist satz (byte-exakt, nur sinkend): jede Zeichenkette mit Leerzeichen UND einem Wort, und jedes
 * großgeschriebene Einzelwort (deutsche Substantive). Kleingeschriebene Einzelwörter sind Struktur:
 * dort liegen JS-Werte und Schlüsselwörter (`'string'`, `'object'`).
 * @returns {'struktur'|'satz'}
 */
function eimerVon(s, technischeWoerter) {
  if (!/\s/.test(s)) {
    if (/^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(s)) return technischeWoerter.has(s) ? 'struktur' : 'satz';
    return 'struktur';
  }
  if (!natuerlichesWort(s)) return 'struktur';
  if (selektorForm(s) || klassenlisteForm(s) || styleForm(s)) return 'struktur';
  return 'satz';
}

function blockErkannt(erkennung, tag, kopf) {
  if (erkennung.scriptId) return new RegExp('\\bid="' + erkennung.scriptId + '"').test(tag);
  if (erkennung.lizenzKopf) return kopf.includes(erkennung.lizenzKopf);
  return false;
}


function literaleMessen(text, optionen = {}) {
  const probleme = [];
  const regionen = [];
  // indexOf statt einer Regex mit führender Zeichenklasse: die braucht auf 6 MB Text Sekunden.
  const namenszeichen = /[A-Za-z0-9_-]/;
  for (let i = text.indexOf(':BEGIN'); i >= 0; i = text.indexOf(':BEGIN', i + 1)) {
    let von = i;
    while (von > 0 && namenszeichen.test(text[von - 1])) von -= 1;
    const name = text.slice(von, i);
    if (!name) continue;
    const ende = text.indexOf(name + ':END', i);
    if (ende < 0) { probleme.push(name + ':BEGIN ohne :END — Regionsgrenze unbekannt'); continue; }
    regionen.push([von, ende, name]);
  }
  regionen.sort((a, b) => a[0] - b[0]);
  const regionVon = (p) => {
    let lo = 0; let hi = regionen.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (p < regionen[mid][0]) hi = mid - 1; else if (p > regionen[mid][1]) lo = mid + 1; else return regionen[mid][2];
    }
    return null;
  };
  const imInnern = {};
  const register = optionen.fremdcode || [];
  const technische = new Set(optionen.technischeWoerter || []);
  const blocksGefunden = new Set();
  const fremdBytes = new Map(register.map((r) => [r.name, 0]));
  const eimer = { struktur: 0, satz: 0 };
  let laengsteStruktur = { bytes: 0, beispiel: '' };
  let ausserhalb = 0; let innerhalb = 0; let anzahl = 0;
  let pos = 0;
  let block = 0;
  for (;;) {
    const a = text.indexOf('<script', pos);
    if (a < 0) break;
    const g = text.indexOf('>', a);
    if (g < 0) break;
    let e = text.indexOf('</script', g);
    if (e < 0) e = text.length;
    const literale = [];
    literaleImBlock(text, g + 1, e, literale);
    const tag = text.slice(a, g + 1);
    const kopf = text.slice(g + 1, g + 1 + 600);
    const fremd = register.find((r) => blockErkannt(r.erkennung || {}, tag, kopf));
    if (fremd) blocksGefunden.add(fremd.name);
    let rest = ''; let von = g + 1;
    for (const l of literale) {
      rest += text.slice(von, l.s);
      von = l.e;
      const wert = text.slice(l.s, l.e);
      const b = Buffer.byteLength(wert, 'utf8');
      anzahl += 1;
      const region = regionVon(l.s);
      if (region) {
        innerhalb += b;
        const e = imInnern[region] || (imInnern[region] = { struktur: 0, satz: 0, fremdcode: 0 });
        if (fremd) e.fremdcode += b;
        else {
          const artInnen = eimerVon(wert, technische);
          e[artInnen] += b;
          if (optionen.sammeln) optionen.sammeln({ art: artInnen, region, bytes: b, wert, ort: l.s });
        }
        continue;
      }
      ausserhalb += b;
      if (fremd) { fremdBytes.set(fremd.name, fremdBytes.get(fremd.name) + b); continue; }
      const art = eimerVon(wert, technische);
      eimer[art] += b;
      if (optionen.sammeln) optionen.sammeln({ art, region: null, bytes: b, wert, ort: l.s });
      if (art === 'struktur' && b > laengsteStruktur.bytes) laengsteStruktur = { bytes: b, beispiel: wert.slice(0, 80) };
    }
    rest += text.slice(von, e);
    try {
      new vm.Script(rest); // nur Übersetzen, nie Ausführen
    } catch (err) {
      probleme.push('Skriptblock ' + block + ' (Zeile ' + zeileVon(text, g) + '): ohne die gezählten Literale nicht übersetzbar ('
        + err.message + ') — Literalerkennung unzuverlässig');
    }
    block += 1;
    pos = e + 1;
  }
  for (const r of register) {
    if (!blocksGefunden.has(r.name)) probleme.push('Fremdcode "' + r.name + '": kein Skriptblock erkannt (' + JSON.stringify(r.erkennung) + ') — Register veraltet?');
  }
  return {
    ausserhalb, innerhalb, literale: anzahl, probleme,
    eimer: { struktur: eimer.struktur, satz: eimer.satz },
    regionen: imInnern,
    fremdcode: Object.fromEntries(fremdBytes),
    laengsteStruktur,
  };
}

function markerVorhanden(text, name) {
  const muster = new RegExp('(^|[^A-Za-z0-9_])' + name + ':BEGIN');
  return muster.test(text);
}

function zeileVon(text, index) {
  let z = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < index; i = text.indexOf('\n', i + 1)) z += 1;
  return z;
}

/**
 * Misst jede AB_WERK_*-Konstante: UTF-8-Bytes des ganzen Statements und ob sie einen Andockpunkt
 * `NAME:BEGIN` trägt. Wirft nie: eine nicht messbare oder doppelte Konstante steht in `probleme`.
 * @param {string} text  Inhalt der vivodepot.html
 * @returns {{konstanten: Array<{name:string, bytes:number, marker:boolean, zeile:number}>, probleme: string[]}}
 */
function konstantenMessen(text) {
  const konstanten = [];
  const probleme = [];
  const gesehen = new Set();
  DEKLARATION.lastIndex = 0;
  let m;
  while ((m = DEKLARATION.exec(text)) !== null) {
    const name = m[1];
    const beginn = m.index + m[0].length - m[0].trimStart().length;
    const start = m.index;
    if (gesehen.has(name)) { probleme.push(name + ': doppelt deklariert (Zeile ' + zeileVon(text, start) + ')'); continue; }
    gesehen.add(name);
    const ende = statementEnde(text, start + m[0].length);
    if (ende < 0) { probleme.push(name + ': Ende des Statements nicht gefunden — Messung unzuverlässig'); continue; }
    const segment = text.slice(beginn, ende);
    try {
      new vm.Script(segment); // nur Übersetzen, nie Ausführen
    } catch (e) {
      probleme.push(name + ': das gemessene Stück ist kein vollständiges Statement (' + e.message + ') — Messung unzuverlässig');
      continue;
    }
    konstanten.push({ name, bytes: Buffer.byteLength(segment, 'utf8'), marker: markerVorhanden(text, name), zeile: zeileVon(text, start) });
  }
  konstanten.sort((a, b) => a.name.localeCompare(b.name));
  return { konstanten, probleme };
}

/**
 * Vergleicht die Messung mit der Grundlinie. Exakte Übereinstimmung: jede Abweichung ist ein Fund,
 * die Meldung benennt die Richtung (Wachstum ist der eigentliche Fund, Schrumpfen verlangt nur,
 * die Grundlinie zu senken, damit der Deckel scharf bleibt).
 * @param {{konstanten: object[], probleme: string[], literale?: object}} messung
 * @returns {{fehler: string[]}}
 */
function pruefen(messung, grundlinie) {
  const fehler = [...messung.probleme];
  const bekannt = new Map((grundlinie.konstanten || []).map((k) => [k.name, k]));
  const gemessen = new Map(messung.konstanten.map((k) => [k.name, k]));
  const SENKEN = ' Ein Schnitt senkt den Deckel: node tools/geruest-waechter-pruefen.js --grundlinie-schreiben';
  for (const k of messung.konstanten) {
    const g = bekannt.get(k.name);
    if (!g) {
      fehler.push(k.name + ': NEUE AB_WERK-Konstante ohne Eintrag in der Positivliste (' + k.bytes + ' Byte'
        + (k.marker ? '' : ', ohne Andockpunkt') + ') — das Gerüst wächst.');
      continue;
    }
    if (k.bytes > g.bytes) {
      fehler.push(k.name + ': wächst um ' + (k.bytes - g.bytes) + ' Byte über den Deckel (' + g.bytes + ' → ' + k.bytes
        + ') — Inhalt gehört ins Produkt, nicht ins Gerüst.');
    } else if (k.bytes < g.bytes) {
      fehler.push(k.name + ': Deckel zu hoch — gemessen ' + k.bytes + ', Deckel ' + g.bytes + '.' + SENKEN);
    }
    if (g.marker && !k.marker) fehler.push(k.name + ': Andockpunkt ' + k.name + ':BEGIN verloren.');
    if (!g.marker && k.marker) fehler.push(k.name + ': trägt jetzt einen Andockpunkt — Grundlinie nachziehen (--grundlinie-schreiben).');
  }
  for (const g of grundlinie.konstanten || []) {
    if (!gemessen.has(g.name)) fehler.push(g.name + ': steht in der Positivliste, aber nicht mehr im Gerüst — Zeile streichen (--grundlinie-schreiben).');
  }
  if (messung.literale) {
    const ist = messung.literale;
    const eimer = grundlinie.eimer;
    if (!eimer || !eimer.struktur || !eimer.satz) {
      fehler.push('eimer: die Grundlinie führt die Eimer der Zeichenketten außerhalb der Regionen nicht.');
    } else {
      if (ist.eimer.satz > eimer.satz.bytes) {
        fehler.push('eimer.satz: satzförmige Zeichenketten wachsen um ' + (ist.eimer.satz - eimer.satz.bytes) + ' Byte über den Deckel ('
          + eimer.satz.bytes + ' → ' + ist.eimer.satz + ') — Inhalt gehört ins Produkt; für diesen Eimer gibt es nie eine Ausnahme.');
      } else if (ist.eimer.satz < eimer.satz.bytes) {
        fehler.push('eimer.satz: Deckel zu hoch — gemessen ' + ist.eimer.satz + ', Deckel ' + eimer.satz.bytes + '.' + SENKEN);
      }
      if (ist.eimer.struktur > eimer.struktur.bytes) {
        fehler.push('eimer.struktur: wächst um ' + (ist.eimer.struktur - eimer.struktur.bytes) + ' Byte über den Deckel (' + eimer.struktur.bytes
          + ' → ' + ist.eimer.struktur + ') — ein Zuwachs steht namentlich mit Grund in der Grundlinie: --grundlinie-schreiben --anhebung struktur --grund "…".');
      } else if (ist.eimer.struktur < eimer.struktur.bytes) {
        fehler.push('eimer.struktur: Deckel zu hoch — gemessen ' + ist.eimer.struktur + ', Deckel ' + eimer.struktur.bytes + '.' + SENKEN);
      }
    }
    for (const r of grundlinie.fremdcode || []) {
      const b = ist.fremdcode[r.name];
      if (b == null) continue; // fehlender Block steht schon in messung.probleme
      if (b > r.bytes) {
        fehler.push('fremdcode.' + r.name + ': wächst um ' + (b - r.bytes) + ' Byte (' + r.bytes + ' → ' + b + ') — eine Bibliotheks-Aktualisierung steht namentlich mit Version: --anhebung fremdcode:' + r.name + ' --grund "…".');
      } else if (b < r.bytes) {
        fehler.push('fremdcode.' + r.name + ': Deckel zu hoch — gemessen ' + b + ', Deckel ' + r.bytes + '.' + SENKEN);
      }
    }
  }
  fehler.push(...zuwaechsePruefen(grundlinie));
  if (messung.literale) fehler.push(...regionenPruefen(messung.literale.regionen || {}, grundlinie.regionen));
  return { fehler };
}

/**
 * Der Sollwert der Marker-Regionen: jede Region trägt 0 Byte satzförmigen Inhalt. Eine Region mit Satz > 0
 * steht namentlich in `regionen.uebergang` (Posten, der sie auf 0 bringt, und eine Probe) oder in
 * `regionen.dauerhaft` (begründet, Probe sichert das VORHANDENSEIN). Beide exakt, nur sinkend.
 * @returns {string[]}
 */
function regionenPruefen(gemessen, regionen) {
  const fehler = [];
  if (!regionen || !Array.isArray(regionen.uebergang) || !Array.isArray(regionen.dauerhaft) || !Number.isInteger(regionen.uebergangDeckel)) {
    return ['regionen: die Grundlinie führt den Sollwert der Marker-Regionen (uebergang, dauerhaft, uebergangDeckel) nicht.'];
  }
  const ist = (name) => (gemessen[name] && gemessen[name].satz) || 0;
  const eingetragen = new Map();
  for (const e of regionen.uebergang) eingetragen.set(e.name, ['uebergang', e]);
  for (const e of regionen.dauerhaft) {
    if (eingetragen.has(e.name)) fehler.push('regionen.' + e.name + ': steht in uebergang UND dauerhaft — genau eine Stelle.');
    eingetragen.set(e.name, ['dauerhaft', e]);
  }
  for (const [name, e] of Object.entries(gemessen)) {
    if (e.satz > 0 && !eingetragen.has(name)) {
      fehler.push('regionen.' + name + ': trägt ' + e.satz + ' Byte satzförmigen Inhalt, der Sollwert jeder Region ist 0 — ein Übergang steht mit Posten und Probe in regionen.uebergang.');
    }
  }
  for (const [name, [art, e]] of eingetragen) {
    const wo = 'regionen.' + name + ' (' + art + ')';
    const i = ist(name);
    if (art === 'uebergang') {
      if (typeof e.posten !== 'string' || e.posten.trim().length < 2) fehler.push(wo + ': ohne Posten — ein Übergang hat einen Eigentümer, der ihn auf 0 bringt.');
    } else if (typeof e.grund !== 'string' || e.grund.trim().length < GRUND_MINDESTLAENGE) {
      fehler.push(wo + ': ohne Grund (mindestens ' + GRUND_MINDESTLAENGE + ' Zeichen) — ein Sollwert über 0 auf Dauer muss sagen, warum das Weglassen falsch wäre.');
    }
    if (typeof e.probe !== 'string' || !/^tests\/[^/]+\.test\.js$/.test(e.probe)) fehler.push(wo + ': ohne Probe (eine Testdatei tests/….test.js).');
    if (!Number.isInteger(e.satz)) { fehler.push(wo + ': ohne Byte-Deckel.'); continue; }
    if (i > e.satz) fehler.push(wo + ': wächst um ' + (i - e.satz) + ' Byte über den Deckel (' + e.satz + ' → ' + i + ') — für satzförmigen Inhalt gibt es nie einen Zuwachs.');
    else if (i < e.satz && i > 0) fehler.push(wo + ': Deckel zu hoch — gemessen ' + i + ', Deckel ' + e.satz + '.' + ' Ein Schnitt senkt den Deckel: node tools/geruest-waechter-pruefen.js --grundlinie-schreiben');
    else if (i === 0 && art === 'uebergang') fehler.push(wo + ': ist bei 0 angekommen — Zeile streichen (--grundlinie-schreiben), der Übergang ist vorbei.');
    else if (i === 0) fehler.push(wo + ': der Inhalt, den die Probe sichern soll, ist nicht mehr da — ein dauerhafter Sollwert steht für etwas, das vorhanden sein MUSS.');
  }
  if (regionen.uebergang.length > regionen.uebergangDeckel) {
    fehler.push('regionen.uebergangDeckel: ' + regionen.uebergang.length + ' Übergänge bei einem Deckel von ' + regionen.uebergangDeckel + ' — die Zahl kann nur sinken.');
  } else if (regionen.uebergang.length < regionen.uebergangDeckel) {
    fehler.push('regionen.uebergangDeckel: ' + regionen.uebergang.length + ' Übergänge, Deckel ' + regionen.uebergangDeckel + ' — Deckel senken (--grundlinie-schreiben).');
  }
  return fehler;
}

/** Jede Probe der Regionen-Einträge existiert und nennt die Region beim Namen (sie hängt am Gegenstand). */
function regionenProbenPruefen(regionen, testInhalt) {
  const fehler = [];
  for (const [art, liste] of [['uebergang', regionen.uebergang || []], ['dauerhaft', regionen.dauerhaft || []]]) {
    for (const e of liste) {
      if (typeof e.probe !== 'string') continue;
      const inhalt = testInhalt(e.probe);
      if (inhalt == null) fehler.push('regionen.' + e.name + ' (' + art + '): die Probe ' + e.probe + ' gibt es nicht.');
      else if (!inhalt.includes(e.name)) fehler.push('regionen.' + e.name + ' (' + art + '): die Probe ' + e.probe + ' nennt die Region nicht — sie hängt nicht an diesem Gegenstand.');
    }
  }
  return fehler;
}

/** `daneben`: ein flaches Objekt, Schlüssel ein Eimer (struktur, satz, fremdcode:<name>), Wert eine ganze Zahl. */
function daneben(d) {
  return !!d && typeof d === 'object' && !Array.isArray(d)
    && Object.entries(d).every(([k, v]) => /^(struktur|satz|fremdcode:.+)$/.test(k) && Number.isInteger(v));
}

/**
 * Prüft die Zuwächse der Grundlinie selbst: jeder vollständig und mit Grund, jeder klein genug, keiner
 * am satzförmigen Eimer. Eine Anzahl-Grenze gibt es nicht: der Deckel selbst begrenzt, was steigen darf.
 * @returns {string[]}
 */
function zuwaechsePruefen(grundlinie) {
  const liste = grundlinie.zuwaechse;
  if (!Array.isArray(liste)) return ['zuwaechse: die Grundlinie führt die benannten Zuwächse nicht.'];
  const fehler = [];
  liste.forEach((a, i) => {
    const wo = 'zuwaechse[' + i + '] (' + (a && a.ziel) + ')';
    if (a && Object.prototype.hasOwnProperty.call(a, 'netto')) {
      fehler.push(wo + ': trägt `netto` — eine Zahl über zwei Eimer ist eine Bilanz. Die Änderung jedes anderen Eimers steht einzeln unter `daneben`.');
      return;
    }
    if (!a || !a.ziel || !Number.isInteger(a.von) || !Number.isInteger(a.auf) || !daneben(a.daneben)) {
      fehler.push(wo + ': unvollständig — Ziel, von, auf und `daneben` (je Eimer eine ganze Zahl, ggf. leer) sind Pflicht.');
      return;
    }
    if (Object.prototype.hasOwnProperty.call(a.daneben, a.ziel)) fehler.push(wo + ': `daneben` nennt das eigene Ziel — dort stehen von und auf.');
    if (a.ziel === 'satz') fehler.push(wo + ': für den satzförmigen Eimer gibt es keinen Zuwachs, nie.');
    if (typeof a.grund !== 'string' || a.grund.trim().length < GRUND_MINDESTLAENGE) {
      fehler.push(wo + ': Zuwachs OHNE Grund — er muss sagen, was hinzukommt und warum es Struktur ist.');
    }
    if (!/^fremdcode:/.test(a.ziel) && a.auf - a.von > ZUWACHS_HOECHSTENS) {
      fehler.push(wo + ': wächst um ' + (a.auf - a.von) + ' Byte, erlaubt sind höchstens ' + ZUWACHS_HOECHSTENS + '. Binäre Blöcke (data:-URIs, Base64) gehören in eine Marker-Region, nicht in diesen Eimer.');
    }
    if (a.auf <= a.von) fehler.push(wo + ': ist kein Zuwachs (auf ' + a.auf + ' nicht über von ' + a.von + ').');
  });
  return fehler;
}

/**
 * Baut die neue Grundlinie aus der Messung — SENKEND. Verweigert (`ok:false`), wenn ein Deckel wüchse,
 * eine Konstante neu wäre oder ein Andockpunkt verloren ginge. Die einzige Ausnahme ist ein ausdrücklich
 * beantragter, benannter Zuwachs (`anhebungen: [{ziel, grund}]`) für den Struktur-Eimer, einen
 * Fremdcode-Block oder eine Konstante, nie für den satzförmigen Eimer. Ohne alte Grundlinie
 * (erste Messung) wird alles übernommen.
 */
function grundlinieAktualisieren(messung, alt, { anhebungen = [] } = {}) {
  if (messung.probleme.length) return { ok: false, verweigert: messung.probleme };
  const lit = messung.literale;
  const neu = messung.konstanten.map((k) => ({ name: k.name, bytes: k.bytes, marker: k.marker }));
  if (!alt) {
    return {
      ok: true, konstanten: neu, eimer: lit ? { struktur: { bytes: lit.eimer.struktur }, satz: { bytes: lit.eimer.satz } } : undefined,
      fremdcode: [], technischeWoerter: [], zuwaechse: [], regionen: undefined,
    };
  }
  const altMap = new Map((alt.konstanten || []).map((k) => [k.name, k]));
  const beantragt = new Map(anhebungen.map((a) => [a.ziel, a]));
  const verweigert = [];
  const eintraege = [];
  const aenderung = {}; // je Eimer die Änderung dieses Laufs, einzeln — nie summiert
  const wachsen = (ziel, von, auf) => {
    const antrag = beantragt.get(ziel);
    if (ziel === 'satz') { verweigert.push('eimer.satz: würde von ' + von + ' auf ' + auf + ' steigen — für satzförmige Zeichenketten gibt es nie eine Ausnahme.'); return; }
    if (!antrag) { verweigert.push(ziel + ': Deckel würde von ' + von + ' auf ' + auf + ' steigen.'); return; }
    eintraege.push({ ziel, von, auf, antrag });
  };
  for (const k of neu) {
    const g = altMap.get(k.name);
    if (!g) {
      // Neu: nur ein LEERER Andockpunkt, nur mit benanntem Antrag (--anhebung <NAME> --grund "…"), und er steht im Register (`zuwaechse`, von 0). Sonst verweigert.
      const antrag = beantragt.get(k.name);
      if (!antrag) {
        verweigert.push(k.name + ': neue Konstante — nur ein LEERER Andockpunkt (Marker ' + k.name + ':BEGIN, höchstens ' + ANDOCKPUNKT_HOECHSTENS
          + ' Byte) darf das Lochbild vergrößern, und nur benannt: --grundlinie-schreiben --anhebung ' + k.name + ' --grund "<Text>". Inhalt gehört ins Produkt, nicht ins Gerüst.');
        continue;
      }
      if (!k.marker || k.bytes > ANDOCKPUNKT_HOECHSTENS) {
        verweigert.push(k.name + ': neue Konstante trägt Inhalt (' + k.bytes + ' Byte' + (k.marker ? '' : ', ohne Andockpunkt') + ') — nur ein leerer Andockpunkt (Marker, höchstens '
          + ANDOCKPUNKT_HOECHSTENS + ' Byte) darf das Lochbild vergrößern. Inhalt gehört ins Produkt, nicht ins Gerüst.');
        continue;
      }
      eintraege.push({ ziel: k.name, von: 0, auf: k.bytes, antrag });
      continue;
    }
    if (k.bytes > g.bytes) wachsen(k.name, g.bytes, k.bytes);
    if (g.marker && !k.marker) verweigert.push(k.name + ': Andockpunkt verloren.');
  }
  let eimer;
  const fremdNeu = [];
  if (lit) {
    const alteEimer = alt.eimer || {};
    eimer = { struktur: { bytes: lit.eimer.struktur }, satz: { bytes: lit.eimer.satz } };
    for (const art of ['struktur', 'satz']) {
      const a = alteEimer[art] && alteEimer[art].bytes;
      if (a == null) continue;
      if (lit.eimer[art] !== a) aenderung[art] = lit.eimer[art] - a;
      if (lit.eimer[art] > a) wachsen(art, a, lit.eimer[art]);
    }
    for (const r of alt.fremdcode || []) {
      const b = lit.fremdcode[r.name];
      if (b == null) { verweigert.push('fremdcode.' + r.name + ': Block nicht mehr erkannt.'); continue; }
      if (b !== r.bytes) aenderung['fremdcode:' + r.name] = b - r.bytes;
      if (b > r.bytes) wachsen('fremdcode:' + r.name, r.bytes, b);
      fremdNeu.push({ ...r, bytes: b });
    }
  }
  let regionenNeu;
  if (lit && alt.regionen) {
    const gem = lit.regionen || {};
    const ist = (n) => (gem[n] && gem[n].satz) || 0;
    const uebergang = [];
    const dauerhaft = [];
    for (const [name, e] of Object.entries(gem)) {
      if (e.satz > 0 && ![...alt.regionen.uebergang, ...alt.regionen.dauerhaft].some((x) => x.name === name)) {
        verweigert.push('regionen.' + name + ': neue Region mit ' + e.satz + ' Byte satzförmigem Inhalt — der Sollwert ist 0, die Grundlinie wächst nicht mit.');
      }
    }
    for (const e of alt.regionen.uebergang) {
      const i = ist(e.name);
      if (i > e.satz) verweigert.push('regionen.' + e.name + ': Deckel würde von ' + e.satz + ' auf ' + i + ' steigen.');
      else if (i > 0) uebergang.push({ ...e, satz: i });
    }
    for (const e of alt.regionen.dauerhaft) {
      const i = ist(e.name);
      if (i > e.satz) verweigert.push('regionen.' + e.name + ': Deckel würde von ' + e.satz + ' auf ' + i + ' steigen.');
      else if (i === 0) verweigert.push('regionen.' + e.name + ': dauerhafter Sollwert, der Inhalt ist weg — die Probe sichert sein Vorhandensein.');
      else dauerhaft.push({ ...e, satz: i });
    }
    regionenNeu = { uebergangDeckel: uebergang.length, uebergang, dauerhaft };
  }
  for (const ziel of beantragt.keys()) {
    if (ziel !== 'satz' && !eintraege.some((e) => e.ziel === ziel)) verweigert.push(ziel + ': Zuwachs beantragt, aber dieses Ziel wächst nicht (oder kennt das Werkzeug nicht).');
  }
  const bisher = Array.isArray(alt.zuwaechse) ? alt.zuwaechse : [];
  const neueEintraege = [];
  for (const e of eintraege) {
    const grund = typeof e.antrag.grund === 'string' ? e.antrag.grund.trim() : '';
    if (grund.length < GRUND_MINDESTLAENGE) verweigert.push(e.ziel + ': Zuwachs ohne Grund (mindestens ' + GRUND_MINDESTLAENGE + ' Zeichen: was kommt hinzu, warum ist es Struktur).');
    if (!/^fremdcode:/.test(e.ziel) && e.auf - e.von > ZUWACHS_HOECHSTENS) {
      verweigert.push(e.ziel + ': Zuwachs um ' + (e.auf - e.von) + ' Byte, erlaubt sind höchstens ' + ZUWACHS_HOECHSTENS + '. Binäre Blöcke gehören in eine Marker-Region.');
    }
    const uebrige = Object.fromEntries(Object.entries(aenderung).filter(([k]) => k !== e.ziel));
    neueEintraege.push({ ziel: e.ziel, von: e.von, auf: e.auf, daneben: uebrige, grund });
  }
  if (verweigert.length) return { ok: false, verweigert };
  return {
    ok: true, konstanten: neu, eimer, fremdcode: fremdNeu, technischeWoerter: alt.technischeWoerter || [],
    regionen: regionenNeu, zuwaechse: [...bisher, ...neueEintraege], aenderung,
  };
}

function grundlinieLesen(pfad) {
  return JSON.parse(fs.readFileSync(pfad || GRUNDLINIE_PFAD, 'utf8'));
}

function grundlinieSchreiben(r, beschreibung, pfad) {
  const inhalt = {
    beschreibung,
    konstanten: r.konstanten,
    eimer: r.eimer,
    fremdcode: r.fremdcode,
    technischeWoerter: r.technischeWoerter,
    regionen: r.regionen,
    zuwaechse: r.zuwaechse,
  };
  fs.writeFileSync(pfad || GRUNDLINIE_PFAD, JSON.stringify(inhalt, null, 1) + '\n', 'utf8');
}

const BESCHREIBUNG = 'Grundlinie für tests/geruest-waechter-pruefen.test.js (W0, 20.09.2026). Achse 1 (Diagnose, sagt WO): '
  + 'je AB_WERK_*-Konstante der Byte-Deckel (UTF-8, das ganze Statement) und ob sie einen Andockpunkt NAME:BEGIN trägt. '
  + 'Achse 2 (bindend, sagt OB): die Zeichenketten außerhalb aller Marker-Regionen, in DREI Eimern. fremdcode: Zeichenketten '
  + 'in Skriptblöcken, die hier NAMENTLICH mit Herkunft stehen (Register, keine Erkennung); struktur: was keinen natürlichen '
  + 'Text tragen kann (Bezeichner, Markup ohne Wort, Selektoren, technischeWoerter), darf steigen, aber jeder Zuwachs steht '
  + 'namentlich in zuwaechse; satz: alles Satzförmige und jedes großgeschriebene Einzelwort, byte-exakt, nur sinkend, nie eine '
  + 'Ausnahme. Zuwachs und Senkung stehen je Eimer da, nie als Bilanz: das Register trennt, was das Werkzeug trennt; eine Zahl, '
  + 'die zwei Eimer zusammenfasst, hebt die Trennung auf, sie ist nicht ein Guthaben, sondern eine Bilanz. Wer eine Zeichenkette in fremdcode oder technischeWoerter aufnimmt, nimmt ihr den byte-exakten Schutz: im Zweifel '
  + 'NICHT aufnehmen. Gemessen mit tools/geruest-waechter-pruefen.js, exakt, kein Puffer.';

function kb(bytes) { return (bytes / 1000).toFixed(1).replace('.', ','); }

function messen(text, grundlinie = {}) {
  const m = konstantenMessen(text);
  const l = literaleMessen(text, { fremdcode: grundlinie.fremdcode, technischeWoerter: grundlinie.technischeWoerter });
  return { konstanten: m.konstanten, probleme: [...m.probleme, ...l.probleme], literale: l };
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const grundlinieDatei = wert('--grundlinie-datei') ? path.resolve(wert('--grundlinie-datei')) : GRUNDLINIE_PFAD;
  const iDatei = argv.indexOf('--datei');
  const datei = iDatei >= 0 ? path.resolve(argv[iDatei + 1]) : STANDARD_DATEI;
  const text = fs.readFileSync(datei, 'utf8');
  const alt = fs.existsSync(grundlinieDatei) ? grundlinieLesen(grundlinieDatei) : null;
  const messung = messen(text, alt || {});
  const gesamt = messung.konstanten.reduce((s, k) => s + k.bytes, 0);
  const ohneMarker = messung.konstanten.filter((k) => !k.marker).length;
  const e = messung.literale.eimer;

  if (argv.includes('--grundlinie-schreiben')) {
    const ziele = argv.flatMap((a, i) => (a === '--anhebung' ? [argv[i + 1]] : []));
    const r = grundlinieAktualisieren(messung, alt, { anhebungen: ziele.map((ziel) => ({ ziel, grund: wert('--grund') })) });
    if (!r.ok) {
      console.error('[geruest-waechter] Grundlinie NICHT geschrieben — sie sinkt, ein Zuwachs nur benannt:');
      for (const v of r.verweigert) console.error('  - ' + v);
      process.exitCode = 1;
      return;
    }
    grundlinieSchreiben(r, BESCHREIBUNG, grundlinieDatei);
    console.log('[geruest-waechter] Grundlinie geschrieben: ' + r.konstanten.length + ' Konstanten, ' + kb(gesamt)
      + ' KB gesamt; außerhalb der Regionen struktur ' + e.struktur + ', satz ' + e.satz + ', fremdcode '
      + Object.values(messung.literale.fremdcode).reduce((a, b) => a + b, 0) + ' Byte.');
    if (ziele.length) {
      const je = Object.entries(r.aenderung).map(([eimer, d]) => eimer + ' ' + (d > 0 ? '+' : '') + d).join(', ');
      console.log('[geruest-waechter] Zuwachs eingetragen: ' + ziele.join(', ') + '. Änderung je Eimer in diesem Lauf (Byte, keine Summe): ' + (je || 'keine') + '.');
    }
    return;
  }

  const r = pruefen(messung, alt || {});
  r.fehler.push(...regionenProbenPruefen((alt || {}).regionen || {}, (p) => { const f = path.join(REPO, p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }));
  console.log('[geruest-waechter] ' + messung.konstanten.length + ' AB_WERK-Konstanten, ' + kb(gesamt) + ' KB gesamt, '
    + ohneMarker + ' ohne Andockpunkt; Zeichenketten außerhalb der Regionen: struktur ' + e.struktur + ', satz ' + e.satz
    + ', fremdcode ' + Object.values(messung.literale.fremdcode).reduce((a, b) => a + b, 0) + ' Byte.');
  if (r.fehler.length) {
    console.error('[geruest-waechter] ROT — das Gerüst weicht von seiner Grundlinie ab:');
    for (const f of r.fehler) console.error('  - ' + f);
    process.exitCode = 1;
    return;
  }
  console.log('[geruest-waechter] OK — kein Deckel überschritten, keine neue Konstante.');
}

if (require.main === module) main();

module.exports = {
  konstantenMessen, literaleMessen, messen, pruefen, grundlinieAktualisieren, grundlinieLesen, statementEnde, markerVorhanden,
  GRUNDLINIE_PFAD, STANDARD_DATEI, DEKLARATION, zuwaechsePruefen, ZUWACHS_HOECHSTENS, ANDOCKPUNKT_HOECHSTENS, GRUND_MINDESTLAENGE,
  eimerVon, natuerlichesWort, regionenPruefen, regionenProbenPruefen,
};
