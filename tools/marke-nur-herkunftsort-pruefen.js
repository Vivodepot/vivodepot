'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   marke-nur-herkunftsort-pruefen.js — Bestands-Wächter, wörtlicher Spiegel von
   tools/gebeugte-marke-literale-erheben.js (U2-ADR-374), für eine ANDERE Frage
   (WL-PDF-Auftrag „White Label bis ins PDF", 10.09.2026, Entscheidung „EIN Ort
   trägt die Herkunft, sonst nirgends")
   ────────────────────────────────────────────────────────────────────────────
   ANDERE FRAGE ALS DER NACHBAR: `gebeugte-marke-literale-erheben.js` fragt
   „trägt ein GEBEUGTES Vivodepot-Literal ein Risiko, wenn {marke} es ersetzen
   müsste" (Muster `Vivodepot[a-zäöüß]+`, schließt die blanke Form aus). DIESES
   Werkzeug fragt „wo steht die blanke Wortmarke „Vivodepot"/„VIVODEPOT" heute
   überhaupt — und ist das der EINE erlaubte Ort". Zwei unabhängige Fragen,
   zwei unabhängige Werkzeuge — kein gemeinsames Muster, das beide verwässern
   würde.

   BESTANDS-WÄCHTER, NICHT MUSTER-WÄCHTER, aus demselben Grund wie beim
   Nachbarn: die Wortmarke steht heute an ~50 Stellen (Fließtext-Hinweise,
   Datei-Namen, interne Bezeichner wie DATEI_MAGIC, das dokumentierte
   `.welcome-wort` — UX-Konzept §9/§12) — die MEISTEN davon sind NICHT der
   Herkunftsort und NICHT heute schon bereinigt (ehrlich gemessen, nicht
   verschwiegen: s. Bericht white-label-reichweite-2026-09-10.md, Abschnitt
   „Was bewusst nicht in diesem Zug"). Ein Muster-Wächter, der ALLES außer dem
   Herkunftsort verböte, wäre heute sofort rot — nicht weil diese Sitzung
   nichts täte, sondern weil ~40 Fließtext-Stellen eine EIGENE Entscheidung
   brauchen (Konventionen wie {marke}-Ersetzung je Satz), die dieser Auftrag
   nicht pauschal treffen kann. Die eingefrorene Menge macht daraus einen
   EHRLICHEN Ausgangspunkt: JEDE künftige neue Fundstelle wird sofort sichtbar
   (Zuwachs), jede bereinigte zählt als Fortschritt (Verlust, Fixture nachziehen).

   IDENTITÄT, VIELFACHHEIT: identisch zum Nachbarn (datei + getroffene
   Zeichenkette, mit Vielfachheit — s. dortiger Kopf-Kommentar für die
   Begründung, hier nicht verdoppelt).

   Aufruf: node tools/marke-nur-herkunftsort-pruefen.js [--json]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');

// Seit dem Schnitt (17.09.2026) liegt ein Teil dessen, was ein Produkt trägt, nicht mehr
// eingebettet in vivodepot.html, sondern in externen modulPfade-Dateien (Bereichs-Templates,
// Dokumentmodule, AB-Werk-Fixtures) — Konfektionieren zieht sie erst beim Bauen dazu. EIN
// Fund (18.09.2026) belegte, dass ein Wächter, der nur die zwei Kern-Dateien kennt, für diesen
// ausgelagerten Inhalt seither BLIND ist, nicht grün, weil er dort geprüft hätte — er hat ihn
// nie gesehen. Darum: dieselbe Quelle wie der Konfektionierer selbst
// (modulDateienFuer() über alle vier PRODUKTE), nicht eine zweite, gepflegte Liste, die wieder
// veralten könnte.
const DATEIEN = Object.freeze([
  'vivodepot.html', 'vivodepot-lesen.html',
  ...new Set(PRODUKTE.flatMap((p) => modulDateienFuer(p).map((abs) => path.relative(REPO, abs)))),
]);

// Blanke Form, keine Beugung (die trägt der Nachbar). Wortgrenze VORNE (damit „meinVivodepot"
// nicht träfe), aber HINTEN bewusst KEIN `\b` — `\b` zählt `_` als Wortzeichen und übersähe damit
// eine ganze Klasse echter Quelltext-Vorkommen: `dateibasis: 'Vivodepot_Gesundheit_IPS'` in
// EXPORT_FORMATE. Gefunden am 10.09.2026 (WL-PDF), nach der Frage, ob ~25 Dateinamen-Funde
// im Bestand stecken — sie steckten nicht, aber der Grund war eine Regex-Lücke, keine saubere
// Abwesenheit: „0 Treffer" hätte „nie geprüft" bedeutet, nicht „geprüft und sauber". Ersatz:
// `(?![A-Za-z])` — blockt weiterhin „VivodepotGmbH" (nächstes Zeichen ein Buchstabe), lässt aber
// `Vivodepot_`, Satzzeichen, Zeilenende und Ziffern als echten Treffer durch.
const MUSTER = /\bVIVODEPOT(?![A-Za-z])|\bVivodepot(?![A-Za-z])/g;

const KONTEXT_BREITE = 60;
function kontextAusschnitt(zeile, treffer) {
  const start = Math.max(0, treffer.index - KONTEXT_BREITE);
  const ende = Math.min(zeile.length, treffer.index + treffer[0].length + KONTEXT_BREITE);
  return zeile.slice(start, ende).trim();
}

function schluessel(eintrag) { return eintrag.datei + ' ' + eintrag.treffer; }

/* Kommentare raus, BEVOR gesucht wird — ein Code-Kommentar (Changelog, Erläuterung,
   Marker-Block wie „VIVODEPOT-JWS-BLOCK BEGIN") erreicht nie DOM/PDF/Datei und ist für DIESE
   Frage („was sieht/bekommt die Bürgerin oder ihr Gegenüber") kein Treffer, sondern Rauschen —
   ohne diesen Schnitt läge die Menge bei über 180 Fundstellen, fast alle davon Kommentare.
   Dieselbe Zwei-Schritt-Entkommentierung wie `eigenerCode()` in
   tests/ui-marke-zusicherungen.test.js, hier nicht importiert (andere Datei, kein Vendor-
   Ausschluss nötig — jsPDF u. a. sagen nirgends „Vivodepot"). */
function ohneKommentare(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/([^:])\/\/.*$/gm, '$1');
}

function erheben(dateien = DATEIEN) {
  const funde = [];
  for (const rel of dateien) {
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) continue;
    const zeilen = ohneKommentare(fs.readFileSync(abs, 'utf8')).split('\n');
    zeilen.forEach((zeile, i) => {
      MUSTER.lastIndex = 0;
      let treffer;
      while ((treffer = MUSTER.exec(zeile))) {
        funde.push({
          datei: rel,
          treffer: treffer[0],
          zeilennummer: i + 1,
          kontext: kontextAusschnitt(zeile, treffer),
        });
      }
    });
  }
  funde.sort((a, b) => schluessel(a).localeCompare(schluessel(b)) || a.zeilennummer - b.zeilennummer);
  return funde;
}

function alsZaehlkarte(funde) {
  const karte = new Map();
  for (const f of funde) karte.set(schluessel(f), (karte.get(schluessel(f)) || 0) + 1);
  return karte;
}

function vergleichen(live, eingefroren) {
  const liveKarte = alsZaehlkarte(live);
  const eingefrorenKarte = alsZaehlkarte(eingefroren);
  const alleSchluessel = new Set([...liveKarte.keys(), ...eingefrorenKarte.keys()]);
  const zuwachs = [];
  const verlust = [];
  for (const k of alleSchluessel) {
    const liveAnzahl = liveKarte.get(k) || 0;
    const eingefrorenAnzahl = eingefrorenKarte.get(k) || 0;
    if (liveAnzahl > eingefrorenAnzahl) {
      const beispiel = live.find((f) => schluessel(f) === k);
      for (let i = 0; i < liveAnzahl - eingefrorenAnzahl; i += 1) zuwachs.push(beispiel);
    } else if (eingefrorenAnzahl > liveAnzahl) {
      const beispiel = eingefroren.find((f) => schluessel(f) === k);
      for (let i = 0; i < eingefrorenAnzahl - liveAnzahl; i += 1) verlust.push(beispiel);
    }
  }
  return { zuwachs, verlust, unveraendert: live.length - zuwachs.length };
}

/* Grobe, automatische Erst-Einordnung für die Fixture-Erzeugung (--klassifizieren) — ERSETZT
   KEINE Prüfung durch eine Person, macht nur die 96 heutigen Fundstellen ohne 96 einzeln
   getippte Sätze nachvollziehbar. Drei benannte, geprüfte Kategorien; alles andere ehrlich als
   REST-OFFEN geführt (Bericht white-label-reichweite-2026-09-10.md nennt die Zahl). */
function klassifizieren(eintrag) {
  const { datei, kontext } = eintrag;
  if (datei === 'vivodepot-lesen.html' && /const URHEBER_LESEN\b/.test(kontext)) {
    return 'Herkunftsort der Lese-App — die Urheberin (Konstante URHEBER_LESEN, Fuß der Hilfe-Sicht, Anker data-herkunftsort); Name, kein Satz, nicht im Textsatz (tests/lese-app-herkunftsort.test.js).';
  }
  if (/const HERKUNFTSORT_ANGABEN\b|name: 'Vivodepot GmbH', marke: 'Vivodepot'/.test(kontext)) {
    return 'Herkunftsort — der erzeugte Block HERKUNFTSORT_ANGABEN (tools/herkunftsort-angaben.json): Name und Marke der Urheberin, DAUERHAFTE Region, in Kern und Lese-App byte-gleich (34.7, eine Quelle); ersetzt die Klartexte in den Sprachmodulen.';
  }
  if (/data-herkunftsort|einstAnbieter\.text|herkunftPoweredBy\.text|herkunftLizenzhinweis\.text/.test(kontext)) {
    return 'Herkunftsort — der eine erlaubte Ort (Einstellungen → Recht).';
  }
  if (datei === 'vivodepot.html' && /<title>Vivodepot|apple-mobile-web-app-title|application-name/.test(kontext)) {
    return 'Statischer <head>-Tag — von _markeAnzeigeAnwenden() bei jedem Boot überschrieben, bevor die Bürgerin etwas sieht.';
  }
  if (/DATEI_MAGIC\s*=\s*'VIVODEPOT'/.test(kontext)) {
    return 'Dateiformat-Kennung, niemals brandbar — würde jede bestehende .vivodepot-Datei brechen.';
  }
  if (/description: 'Vivodepot-Sicherung'/.test(kontext)) {
    return 'Datei-Picker-Beschreibung für das .vivodepot-Format, kein Markenauftritt.';
  }
  if (/dateibasis:\s*'Vivodepot_/.test(kontext)) {
    return 'EXPORT_FORMATE-Registry-Literal — Quelltext-Vorkommen, aber vor Ausgabe von exportDateiname() über _dateiNamePraefix() ersetzt (empirisch geprüft, Zug 2 wirkt); nie nutzersichtbar.';
  }
  if (/\bVIVODEPOT_[A-Z_]+\b/.test(kontext)) {
    return 'Interner Bezeichner (Konstantenname wie DATEI_MAGIC) — Wert ist kleingeschrieben oder ein Link, nie im DOM/PDF/Dateinamen sichtbar.';
  }
  if (datei === 'vivodepot-lesen.html' && /return 'Vivodepot';/.test(kontext)) {
    return '_markeName()s nativer Rückfall (WL-PDF-Nachtrag, U2-ADR-400) — derselbe Lesepfad wie der Kern, geprüft, kein REST-OFFEN.';
  }
  if (datei === 'vivodepot-lesen.html') {
    return 'REST-OFFEN — Fließtext ohne {marke}-Ersetzung (Branding erreicht seit dem WL-PDF-Nachtrag Topbar+Tab-Titel, s. tests/lese-app-marke.test.js; die übrigen Fließtext-Stellen sind eine eigene, spätere Entscheidung wie im Kern).';
  }
  return 'REST-OFFEN — Fließtext/Label ohne {marke}-Ersetzung, nicht in diesem Zug bereinigt (Bericht, Abschnitt „Was bewusst nicht in diesem Zug").';
}

function main() {
  if (process.argv.includes('--klassifizieren')) {
    const funde = erheben().map((f) => Object.assign({}, f, { grund: klassifizieren(f) }));
    process.stdout.write(JSON.stringify(funde, null, 2) + '\n');
    return;
  }
  const funde = erheben();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(funde, null, 2) + '\n');
    return;
  }
  console.log('marke-nur-herkunftsort-pruefen: ' + funde.length + ' Fundstellen über ' + DATEIEN.join(', '));
  for (const f of funde) console.log('  ' + f.datei + ':' + f.zeilennummer + '  ' + f.kontext);
}

if (require.main === module) main();
module.exports = { erheben, vergleichen, schluessel, alsZaehlkarte, klassifizieren, DATEIEN, MUSTER };
