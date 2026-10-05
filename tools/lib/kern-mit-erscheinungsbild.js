'use strict';
/* Der Kern mit dem Erscheinungsbild „heute" — für Proben und Werkzeuge, die Token-Werte oder CSS-Regeln als TEXT lesen (v894).
   Liegt in tools/lib, weil auch Werkzeuge ihn brauchen (tools/styleguide-klassen-vollstaendig-messen.js); die Proben laden
   ihn über tests/helfer/kern-mit-erscheinungsbild.js.
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Seit v894 trägt das Gerüst keinen Gestaltungswert (U2-ADR-473 Nachtrag, Lesart B): im <style id="design-system"> stehen
   nur noch Schriften, die Verdrahtung der reservierten Tokens und die Mechanik display:none; die Token-Werte stehen in
   tools/erscheinung/heute.css, das Stylesheet in tools/erscheinung/stil/<teil>.css, die Schutzregeln (mit !important) im
   <style id="schutz-stil">. Proben, die sagen „--salbei-mid ist #7B9A6A" oder „.nav-item.aktiv trägt die Randlinie", meinen
   das AUSSEHEN DES PRODUKTS.

   Dieser Helfer setzt für sie zusammen, was das Produkt anwendet, in einem Stylesheet: :root (Verdrahtung + Werte),
   html.high-contrast, html.dark-mode, dann die `stil`-Teile in ihrer Reihenfolge (aus den Quellen, mit Kommentaren), dann die
   Schutzregeln ohne das nachgestellte !important. Er liest die QUELLEN, nicht das gebaute Modul; dass beide übereinstimmen,
   prüft tests/erscheinungsbild-pruefung.test.js. Dass das Produkt im Browser pixelgleich zu v893 aussieht, belegt die
   Pixelvergleich (ein einmaliger Lauf von tools/design-bildvergleich.js --basis; die Werte je Ebene hält
   tests/erscheinungsbild-pruefung.test.js [Erscheinungsbild·Werte]) — dieser Helfer ersetzt ihn nicht. */
const fs = require('node:fs');
const path = require('node:path');
const { anzeigeMechanik } = require('./css-zerlegen.js');

const REPO = path.join(__dirname, '..', '..');
const QUELLE = path.join(REPO, 'tools', 'erscheinung', 'heute.css');
const STIL_ORDNER = path.join(REPO, 'tools', 'erscheinung', 'stil');
const STIL_REIHENFOLGE = path.join(REPO, 'tools', 'erscheinung', 'stil-reihenfolge.json');
const DESIGN = '<style id="design-system">';
const SCHUTZ = '<style id="schutz-stil">';

function _block(text, selektor, ab = 0) {
  const a = text.indexOf(selektor + ' {', ab);
  if (a < 0) return null;
  let tiefe = 0;
  let j = text.indexOf('{', a);
  for (; j < text.length; j++) {
    if (text[j] === '{') tiefe++;
    else if (text[j] === '}' && --tiefe === 0) break;
  }
  return { a, e: j + 1, innen: text.slice(text.indexOf('{', a) + 1, j) };
}

const _einruecken = (b) => b.split('\n').map((z) => (z ? '  ' + z : z)).join('\n');

/* Trägt `html` das Gerüst ohne Gestaltungswerte (v894)? */
// Die Elemente selbst stehen am Zeilenanfang; dieselbe Zeichenfolge in einem Kommentar zählt nicht.
const _elementAnfang = (html, tag) => { const i = html.indexOf('\n' + tag + '\n'); return i < 0 ? -1 : i + 1; };
function istGeruestOhneWerte(html) {
  return _elementAnfang(html, SCHUTZ) >= 0 && html.includes('/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:BEGIN */');
}

function kernMitHeute(html, { quelle = QUELLE } = {}) {
  if (!istGeruestOhneWerte(html)) throw new Error('kernMitHeute: kein Gerüst ohne Werte (v894) — schon ein Erzeugnis oder ein Kern davor?');
  const css = fs.readFileSync(quelle, 'utf8');
  const s = _elementAnfang(html, DESIGN) + DESIGN.length;
  const e = html.indexOf('</style>', s);
  const geruest = html.slice(s, e);
  const verdrahtungBlock = _block(geruest, '  :root');
  const verdrahtung = verdrahtungBlock.innen.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((z) => z.trim()).join('\n');
  const root = _block(css, ':root');
  const hc = _block(css, 'html.high-contrast');
  const dunkel = _block(css, 'html.dark-mode');
  // Die Verdrahtung VOR die Werte: bis v893 stand sie vor dem Block ERSCHEINUNGSBILD-TOKENS (s. tests/helfer/ab-werk-wortlaut.js).
  const neuRoot = '  :root {\n' + verdrahtung + _einruecken(root.innen).replace(/\s+$/, '') + '\n  }';
  const modi = _einruecken(css.slice(hc.a, hc.e)) + '\n' + _einruecken(css.slice(dunkel.a, dunkel.e));
  const stil = JSON.parse(fs.readFileSync(STIL_REIHENFOLGE, 'utf8'))
    .map((teil) => fs.readFileSync(path.join(STIL_ORDNER, teil + '.css'), 'utf8')).join('\n');
  const sa = _elementAnfang(html, SCHUTZ) + SCHUTZ.length;
  const schutz = html.slice(sa, html.indexOf('</style>', sa)).replace(/\s*!important/g, '');
  // Die Anzeige-Mechanik des Gerüsts (nur display, aus stil erzeugt) fällt weg: stil trägt dieselben Deklarationen in ihren
  // vollständigen Regeln, und eine Probe, die die erste Regel zu einem Selektor liest, meint diese — nicht die Mechanik-Zeile.
  const mechanik = anzeigeMechanik(stil).join('\n');
  if (!geruest.includes(mechanik)) throw new Error('kernMitHeute: die Anzeige-Mechanik im Gerüst weicht von stil ab — Gerüst neu erzeugen');
  const ohneMechanik = geruest.replace(mechanik, '');
  const ohneRoot = ohneMechanik.slice(0, _block(ohneMechanik, '  :root').a) + ohneMechanik.slice(_block(ohneMechanik, '  :root').e);
  const neu = ohneRoot + '\n' + neuRoot + '\n' + modi + '\n' + stil + '\n' + schutz + '\n';
  // Das <style id="schutz-stil"> selbst fällt weg: seine Regeln stehen (ohne !important) schon im zusammengesetzten Blatt.
  const ohneSchutz = html.slice(0, _elementAnfang(html, SCHUTZ) - 1) + html.slice(html.indexOf('</style>', sa) + '</style>'.length);
  const s2 = _elementAnfang(ohneSchutz, DESIGN) + DESIGN.length;
  return ohneSchutz.slice(0, s2) + neu + ohneSchutz.slice(ohneSchutz.indexOf('</style>', s2));
}

/* Der Kern ohne das Kopf-Skript des Erscheinungsbilds (Kommentar + <script id="erscheinungsbild">) — für Proben, die ein
   Werkzeug VOR v894 gegen den heutigen Kern fahren: das alte Werkzeug kennt das Rezeptfeld nicht, und der heutige Backschritt
   wiese einen Kern mit Region ohne Modul zu Recht ab. Gegenstand solcher Proben ist anderes (z. B. der Service Worker). */
function kernOhneErscheinungsbildRegion(html) {
  const a = html.indexOf('<!-- Erscheinungsbild (U2-ADR-473 Nachtrag, v894');
  const sk = html.indexOf('<script id="erscheinungsbild">');
  if (a < 0 || sk < 0) return html;
  const e = html.indexOf('</script>', sk) + '</script>\n'.length;
  return html.slice(0, a) + html.slice(e);
}

/* Für Werkzeuge, die CSS aus einem Kern lesen: das Gerüst ohne Werte (v894) mit „heute" zusammengesetzt, jeder andere Text
   (ein Kern vor v894, ein Erzeugnis, eine Fixture) unverändert. Welche Werkzeuge das brauchen, hält
   tests/kern-css-leser-mit-erscheinungsbild.test.js fest. */
function cssQuelle(html) { return istGeruestOhneWerte(html) ? kernMitHeute(html) : html; }

module.exports = { kernMitHeute, kernOhneErscheinungsbildRegion, istGeruestOhneWerte, cssQuelle, QUELLE };
