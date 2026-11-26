'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   deckel-vorlauf.js — die zählenden Proben vor dem Volllauf (30.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   ANLASS: am 30.10.2026 endeten zwei als „gezielt grün“ gemeldete Zugköpfe erst im Volllauf rot, an Deckeln, die die gezielte
   Wagenstufe nicht wählt: eine feste Zahl in einer Probe (Specs mit Testfläche 141 > 140, eine neue e2e-Spec, kein Kern-Code)
   und ein Hash-Abgleich einer Ausnahmeliste. Der Volllauf brauchte bis zum Rot 35 bis 70 Minuten; die zählenden Proben allein
   fanden beide in vier bis fünf Minuten (gemessen an den roten Ständen beider Züge).

   WAS GEWÄHLT WIRD: jede Probe in tests/ und tests/mit-modul/, die
     · eine Grundlinie, eine Ausnahmeliste oder das Deckel-Register liest (MUSTER[0]), oder
     · eine feste Zahl über eine Länge prüft, `….length, N)` mit N ≥ 10 (MUSTER[1]), oder
     · sich mit der Zeile `deckel-vorlauf: zählt` selbst meldet (MUSTER[2]) — für Proben, die einen Abgleich ohne Grundlinie
       fahren (03.11.2026: neue Kernfelder gegen die Nativ-A/B-Listen), oder
     · den Kern liest und im Testnamen eine Klasse prüft (`istKlassenwaechterUeberKern`, 10.11.2026: drei rote Zugköpfe endeten an
       solchen Proben, und keine von ihnen stand im Vorlauf), oder
     · die Probe tests/<stamm>.test.js eines gleichnamigen Werkzeugs tools/<stamm>.js ist, das eine Grundlinie liest und
       `--grundlinie-schreiben` kennt, und das Werkzeug nennt (03.11.2026: die Probe der Bereichs-Literale liest ihre
       Grundlinie über das Werkzeug, trug den Dateinamen also nicht selbst und fehlte im Vorlauf; erst die Landung wurde rot).
       Eng gewählt: jede Probe, die irgendein Werkzeug mit Grundlinie lädt, wären 145 Proben mehr gewesen, diese Regel 4.
   Gewählt wird nach dem Text der Datei, nicht nach dem Diff: ein Deckel zählt über den ganzen Baum.
   Eine leere Wahl ist ein Fehler, kein Grün — `node --test` ohne Dateien führe die ganze Suite.

   Diese Datei wählt nur. Den Lauf baut und fährt die Landungsvorbereitung, vor dem Volllauf und nach den Erzeugern, über ihren
   Schrittläufer mit dem Temp-Helfer.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const MUSTER = Object.freeze([/grundlinie[a-z-]*\.json|-ausnahmen\.json|deckel-register/, /\.length, *[0-9]{2,}\)/, /deckel-vorlauf: zählt/]);
// Beide Bedingungen zusammen: der Name allein wählt auch Proben über fremde Dateien, das Lesen des Kerns allein gut tausend Dateien.
const KLASSE_IM_TESTNAMEN = /test\(\s*['"`][^'"`]*(Klasse|Wächter|Waechter|Deckung|DIE MESSUNG)/;
const istKlassenwaechterUeberKern = (text) => text.includes('vivodepot.html') && KLASSE_IM_TESTNAMEN.test(text);
const ORTE = Object.freeze(['tests', path.join('tests', 'mit-modul'), 'tools']);
/* Nachtrag 20.11.2026, verengt (Befund am v1065-Kopf e6a3eba06: Rot an Proben, die der Vorlauf nicht wählte). Ein erster
   Nachtrag wählte jede feste Zahl und jeden Listenvergleich mit [] über den Kern: 1306 statt 435 Dateien, der Schritt riss am
   Zugkopf dreimal seine Zeitgrenze. Gemessen gewählt wird nur noch, was den Bestand liest UND
     · eine feste Zahl ohne .length prüft, `equal(wert, 341)`, N ≥ 10 (FESTE_ZAHL), oder
     · eine Liste mit [] vergleicht, deren Name eine Lücke benennt, `deepEqual(fehlend, [])` (LUECKEN_LISTE);
   dazu alle Proben unter tools/ (ALLE_IN), denn dort liegen wenige und keine wird sonst gesammelt.
   Ausgelassen sind neu hinzukommende Proben, die allein länger als 120 s laufen (LANG_AUSSER): sie trugen keinen der Fänge
   und hätten die Spanne des Schritts verlängert. Gemessen: 742 Dateien, Spanne bei 14 Arbeitern wie zuvor.
   Probe: [Deckel-Vorlauf·Auswahl·Nachtrag].
   Nachtrag 20.11.2026, Zeitgrenze am v1071-Kopf: die gemessene Spanne galt nicht unter Last. Der Nachtrag wählte 310 Dateien
   mehr (435 → 745, Dateizeit 3236 → 4850 s), darunter sieben Proben unter tests/mit-modul/, die einen Browser starten; der
   Schritt riss zweimal 600 s. Der Nachtrag wählt darum nur noch unter tests/ (NACHTRAG_ORT) und keine Probe, die einen Browser
   startet (BROWSER_START). Diese Proben laufen weiter im Volllauf. Probe: [Deckel-Vorlauf·Auswahl·Nachtrag·ohne Browser].
   Nachtrag 20.11.2026, Dateizeit: auch so blieben 729 Dateien mit 4652 s. Den Zweck tragen nur die Proben, die am v1065-Kopf rot
   waren: feste Zahlen des Feld- und Bereichsbestands (Felder, Unterfelder, Bereiche, Feldmarken) und Lücken-Listen, die einen
   fehlenden Eintrag benennen (fehlende, ohneZeile, luecke). FESTE_ZAHL und LUECKEN_LISTE wählen nur noch diese. Alle anderen
   festen Zahlen und Listenvergleiche laufen weiter im Volllauf. Probe: [Deckel-Vorlauf·Auswahl·Nachtrag·Bestandszahl].
   Nachtrag 21.11.2026, Spanne am v1071-Kopf: Eine Probe, die selbst Testläufe startet, holt deren Dateien in den Vorlauf,
   auch solche aus LANG_AUSSER. Seit die längste Probe zuerst startet, laufen diese inneren Läufe neben allen Arbeitern statt
   allein am Ende. INNERE_LAEUFE_AUSSER nimmt solche Proben aus der Wahl, auch wenn ein Muster sie trifft; sie laufen weiter im
   Volllauf. Probe: [Deckel-Vorlauf·Auswahl·Innere Läufe]. */
const FESTE_ZAHL = /[eE]qual\(\s*[\w$.()]*?(?:[fF]elder|[bB]ereiche(?:Alle\(\))?\.length|\.top|\btop|\.unter|\bunter|Marke|LaeuftAb)\s*,\s*[0-9]{2,}\s*[,)]/;
const LUECKEN_LISTE = /[dD]eep(?:Strict)?Equal\(\s*[\w$.]*(fehlende|ohneZeile|luecke|lücke)[\w$.]*\s*(\([^;\n]*\))?\s*,\s*\[\]\s*[,)]/;
const BESTAND = /ladeKern|load-kern|vivodepot\.html|buergermodul\/|feldkatalog|vd-privat\.json/;
const ALLE_IN = Object.freeze(['tools']);
const LANG_AUSSER = Object.freeze(['ausgabewege-nach-zweck.test.js', 'css-spezifitaet-und-mobile-schrift.test.js']);
// Proben, die je Ausnahme bis zu drei innere Testläufe gleichzeitig starten (gemessen 21.11.2026: zwölf Läufe, darunter eine
// Probe aus LANG_AUSSER mit über 400 s).
const INNERE_LAEUFE_AUSSER = Object.freeze(['zuschnitt-testpfade-erreichbar.test.js']);
const NACHTRAG_ORT = 'tests';
const BROWSER_START = /\b(?:chromium|firefox|webkit)\.launch(?:Persistent(?:Context)?)?\(/;
const istNachtragMuster = (text) => BESTAND.test(text) && (FESTE_ZAHL.test(text) || LUECKEN_LISTE.test(text));
function eigenesWerkzeugMitGrundlinie(wurzel, stamm, text, lesen) {
  const esc = stamm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp('tools/' + esc + '(\\.js)?[\'"]').test(text)) return false;
  let werkzeug = '';
  try { werkzeug = lesen(path.join(wurzel, 'tools', stamm + '.js')); } catch (_) { return false; }
  return MUSTER[0].test(werkzeug) && werkzeug.includes('--grundlinie-schreiben');
}
function dateienWaehlen(wurzel, { liste = (d) => fs.readdirSync(d), lesen = (p) => fs.readFileSync(p, 'utf8') } = {}) {
  const gewaehlt = [];
  for (const ort of ORTE) {
    let namen = [];
    try { namen = liste(path.join(wurzel, ort)); } catch (_) { continue; }
    for (const n of namen) {
      if (!n.endsWith('.test.js')) continue;
      const rel = path.join(ort, n);
      let text = '';
      try { text = lesen(path.join(wurzel, rel)); } catch (_) { continue; }
      const bisher = MUSTER.some((m) => m.test(text)) || istKlassenwaechterUeberKern(text) || eigenesWerkzeugMitGrundlinie(wurzel, n.slice(0, -'.test.js'.length), text, lesen);
      if (INNERE_LAEUFE_AUSSER.includes(n)) continue;
      if (bisher || (!LANG_AUSSER.includes(n) && (ALLE_IN.includes(ort) || (ort === NACHTRAG_ORT && !BROWSER_START.test(text) && istNachtragMuster(text))))) gewaehlt.push(rel);
    }
  }
  return gewaehlt.sort();
}

module.exports = { MUSTER, ORTE, ALLE_IN, NACHTRAG_ORT, BROWSER_START, FESTE_ZAHL, LUECKEN_LISTE, BESTAND, LANG_AUSSER, INNERE_LAEUFE_AUSSER, istNachtragMuster, istKlassenwaechterUeberKern, dateienWaehlen, eigenesWerkzeugMitGrundlinie };
