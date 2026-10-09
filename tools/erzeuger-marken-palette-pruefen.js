'use strict';
/* ════════════════════════════════════════════════════════════════════════════════
   erzeuger-marken-palette-pruefen — trägt der Vorlagen-Erzeuger noch Vivodepots eigene Farben?

   Auftrag (12.09.2026), Punkt 4 einer v501-Nachlese: `vivodepot-studio.html`
   trug bis zu diesem Zug eine FREMDE Palette (Blau/Rot/Blaugrau) unter Vivodepots eigener
   Adresse — gemessen, weil `tools/styleguide-komponenten-abgleich.js` nur den KERN prüft
   (Klassennamen, nicht Farben, nicht den Erzeuger). Genau darum konnte die Palette abdriften,
   ohne dass ein Lauf es meldete. Dieses Werkzeug schließt die Lücke — für DIESE eine Datei,
   nicht als Vorlage für jede beliebige Datei im Repo (s. `--datei` unten für den Einzelfall).

   WAS ES PRÜFT: jeder Hex-Farbwert INNERHALB des <style>-Blocks von
   `vivodepot-studio.html` muss in der festen Erlaubt-Liste stehen — den Werten,
   die beim Palette-Tausch (12.09.2026) 1:1 aus vivodepot.html:72-133 übernommen wurden.
   Ein Neu-Import einer Fremdfarbe (z. B. beim Wiedereinspielen einer älteren Fassung, oder
   beim Anfügen eines neuen Stils ohne Rücksicht auf die Marke) bricht den Lauf.

   WAS ES BEWUSST NICHT PRÜFT: Farb-Beispiele AUSSERHALB des <style>-Blocks (Platzhalter-Text
   wie `placeholder="#1f4068"` an den Eingabefeldern, an denen eine ANBIETER-Institution ihre
   EIGENE Marken-Farbe einträgt) — das sind Formatbeispiele für eine fremde Farbe, die dort per
   Aufgabe fremd sein DARF; sie stehen nicht für den Erzeuger selbst. Eine Grenze wie
   `tests/fixtures-herkunft-pruefen.js` sie für Fixtures zieht: Ort entscheidet, nicht Vorkommen.

   Aufruf:
     node tools/erzeuger-marken-palette-pruefen.js                # gegen die echte Datei im Repo
     node tools/erzeuger-marken-palette-pruefen.js --datei <pfad> # gegen eine andere Datei (Fixture/Kopie)
     node tools/erzeuger-marken-palette-pruefen.js --check        # Waechter-Modus, Exit-Code 1 bei Fund
     node tools/erzeuger-marken-palette-pruefen.js --json
   ════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STANDARD_DATEI = path.join(REPO, 'vivodepot-studio.html');

// Erlaubte Hex-Werte im <style>-Block — Stand nach dem Palette-Tausch (12.09.2026), 1:1 aus
// vivodepot.html:72-133 übernommen (Salbei-Familie + Ink/Line/Weiß + funktionale Status-
// Farben Fehler/Gold). Feste Liste, kein berechneter Abgleich — der Erzeuger lädt kein CSS
// von vivodepot.html (getrennte Datei), ein `var()`-Verweis über Dateigrenzen ist nicht
// möglich, darum stehen die Werte hier als Literal-Kopie.
const ERLAUBTE_HEX = new Set([
  '#1c2a1e',   // --ink
  '#4a5e4f',   // --ink2 (Reserve — Erzeuger nutzt heute nur --ink3 für „grau", Token bleibt gültig)
  '#637568',   // --ink3 / --grau
  '#4f6539',   // --salbei-dunkel / --akzent-dunkel / --ok
  '#7b9a6a',   // --salbei-mid / --akzent
  '#eef2e8',   // --salbei-light / --ok-bg / --nav-hover / --akzent-flaeche
  '#d8d2c4',   // --line / --rand
  '#f6f5f1',   // --cream / --bg
  '#fdfbf7',   // --papier-bereich (Reserve, heute im Erzeuger ungenutzt)
  // Die Wortmarke VIVO/DEPOT im Kopf (26.09.2026): dieselben Markenfarben wie in der App, vivodepot.html
  // --wortmarke-vivo / --wortmarke-depot (Zeilen 292–293, außerhalb des 1:1 übernommenen Blocks 72–133).
  '#edefea',   // --wortmarke-vivo
  '#d5e3d9',   // --wortmarke-depot
  '#ffffff', '#fff',   // --white / --karte / --auf-akzent
  '#c0392b',   // --error / --fehler / --gefahr
  '#fdecea',   // --fehler-flaeche / --fehler-bg
  '#8a6d3a',   // --gold / --warn (Text)
  '#f3ead4',   // --gold-soft / --warn-bg
  // Bestehende, bereits vor dem Tausch brauchbare Rand-/Flächen-Töne (rot/grün/gold-Familie
  // trifft die neue Zielfarbe ohnehin — unverändert gelassen, s. Commit-Begründung):
  '#f0bcc2', '#e6b8bd',   // --fehler-rand / --fehler-rand-zart
  '#b7ddc6',              // --ok-rand
  '#ecd98f',              // --warn-rand
  // Aus dem Palette-Tausch abgeleitete Flächen-/Rand-Zwischentöne (Sage-Familie, keine
  // 1:1-Entsprechung im Kern-Token-Satz — eigens für dieses schmalere Werkzeug gemischt):
  '#e0e6d6',   // --nav-nr-flaeche
  '#d3ddc8',   // --akzent-flaeche-rand
  '#f5f8f1',   // --akzent-flaeche-zart
  '#fbfcf8',   // --karte-innen
]);

function styleBlockLesen(text) {
  const treffer = [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  return treffer.map((t) => t[1]).join('\n');
}

function hexFundeImStyle(text) {
  const style = styleBlockLesen(text);
  const funde = [...style.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
  return funde;
}

/* Studio S0 (08.10.2026, Wort der Gegenlesung): die Region STUDIO-ERSCHEINUNG trägt die Farben des App-Moduls, gebacken von
   tools/studio-erscheinung-backen.js. Ausgeblendet wird sie nur, wenn sie genau einmal da ist und der dort frisch erzeugten
   Region gleicht (regionGeprueftAusblenden); sonst wird jede Farbe darin geprüft, und der Grund ist ein eigener Fund. */
// Ohne den Erzeuger (etwa in einer verworfenen Kopie mit wenigen Dateien) wird nichts ausgeblendet: dann zählt jede Farbe.
function regionGeprueftAusblenden(text, modul) {
  let f = null;
  try { f = require('./studio-erscheinung-backen.js').regionGeprueftAusblenden; } catch (_) { return { text, ausgeblendet: false, fehler: null }; }
  return f(text, modul);
}
function pruefeDatei(pfad, opts = {}) {
  const roh = fs.readFileSync(pfad, 'utf8');
  const r = regionGeprueftAusblenden(roh, opts.modul);
  const funde = hexFundeImStyle(r.text);
  const fremde = funde.filter((h) => !ERLAUBTE_HEX.has(h));
  const fremdeEindeutig = [...new Set(fremde)];
  return {
    pfad,
    hexGesamt: funde.length,
    fremde: fremdeEindeutig,
    regionFehler: r.fehler,
    sauber: fremdeEindeutig.length === 0 && !r.fehler,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const json = argv.includes('--json');
  const dateiIdx = argv.indexOf('--datei');
  const pfad = dateiIdx >= 0 && argv[dateiIdx + 1] ? path.resolve(argv[dateiIdx + 1]) : STANDARD_DATEI;

  if (!fs.existsSync(pfad)) {
    console.error('erzeuger-marken-palette-pruefen: Datei nicht gefunden — ' + pfad);
    process.exit(2);
  }

  const befund = pruefeDatei(pfad);

  if (json) {
    console.log(JSON.stringify(befund, null, 2));
  } else if (befund.sauber) {
    console.log('erzeuger-marken-palette-pruefen: sauber — ' + befund.hexGesamt
      + ' Hex-Werte im <style>-Block, alle in der Marken-Palette (' + path.relative(REPO, befund.pfad) + ').');
  } else {
    console.log('erzeuger-marken-palette-pruefen: FREMDFARBE gefunden in ' + path.relative(REPO, befund.pfad) + ':');
    for (const h of befund.fremde) console.log('  ' + h);
    if (befund.regionFehler) console.log('  ' + befund.regionFehler);
  }

  if (check && !befund.sauber) process.exit(1);
}

if (require.main === module) main();

module.exports = { ERLAUBTE_HEX, styleBlockLesen, hexFundeImStyle, pruefeDatei };
