#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   design-treue.js — Token-Vollständigkeit des Kerns (U2-ADR-473, Wagen v894).
   ────────────────────────────────────────────────────────────────────────────
   DIE ZUSICHERUNG: Jede gestaltende Angabe im Kern läuft über ein Token aus
   `:root` — Farbe, Schriftgröße, Gewicht, Laufweite, Radius, Schatten, Rahmen,
   Schreibung. Nur dann kann ein Erscheinungsbild-Profil (Branding-Modul v2,
   Feld `erscheinung.tokens`) alles setzen, was die Profile unterscheidet. Ein
   Rohwert in einer Regel ist für jedes Profil unerreichbar.

   WAS GEZÄHLT WIRD, getrennt nach drei Orten:

     css       Deklarationen in den <style>-Blöcken. Kommentare zählen nicht;
               die Token-DEFINITIONEN (`--name: wert;`) zählen nicht — sie SIND
               das System. Familien:
                 hex, rgba            Farbwerte als Rohwert
                 fontSize             `font-size` ohne `var(`
                 fontSizeXs           `font-size: var(--fs-xs)` (G7 § 2.2: nur
                                      dezente Marker, nicht für Inhalt)
                 radiusPx             `border-radius*` mit px-Wert
                 shadowRoh            `box-shadow` ohne `var(` (außer none)
                 randLinksDick        `border-left` ab 3 px
                 uppercase            `text-transform: uppercase`
                 letterSpacing        `letter-spacing` mit Wert (außer normal/0)
                 fontWeight           `font-weight` als Zahl oder bold
     html      `style=`-Attribute im statischen Markup (außerhalb <script>/<style>).
     js        `style=` in Zeichenketten der <script>-Blöcke (JS-erzeugtes HTML),
               darin `font-size`; dazu Zuweisungen an `.style`.

   WIE ES WIRKT: Ratsche. `tools/design-treue-grundlinie.json` hält je Familie
   den Stand; der Test (`tests/design-treue.test.js`) verlangt, dass keine
   Familie steigt. Fällt eine, wird mit `--grundlinie-schreiben` festgeschrieben.
   Ausnahmen stehen in AUSNAHMEN — je mit Grund, nie still.

   AUFRUFE
     node tools/design-treue.js                       Bericht für vivodepot.html
     node tools/design-treue.js --dokument <pfad>     Bericht für eine andere Datei
     node tools/design-treue.js --gate                Exit 1, wenn eine Familie steigt
     node tools/design-treue.js --grundlinie-schreiben
     node tools/design-treue.js --stellen <familie>   Fundstellen einer Familie
     node tools/design-treue.js --json                Zahlen als JSON
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const GRUNDLINIE = path.join(REPO, 'tools', 'design-treue-grundlinie.json');


/* Längentreue Maske für CSS-Kommentare. Eigene, nicht die JS-Maske aus
   textsatz-umstellen.js: dort beginnt `//` einen Zeilenkommentar, und das
   kommt in CSS innerhalb von `url(data:…base64…)` vor. */
function cssKommentareMaskieren(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (k) => k.replace(/[^\n]/g, ' '));
}

/* Längentreue Maske für JS-Kommentare, Zeichenketten bleiben erhalten. */
function jsKommentareMaskieren(text) {
  let raus = '';
  let inStr = null, inZeile = false, inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], d = text[i + 1];
    if (inZeile) { if (c === '\n') { inZeile = false; raus += c; } else raus += ' '; continue; }
    if (inBlock) { if (c === '*' && d === '/') { inBlock = false; raus += '  '; i++; } else raus += (c === '\n' ? c : ' '); continue; }
    if (inStr) {
      raus += c;
      if (c === '\\') { raus += (text[i + 1] === undefined ? '' : text[i + 1]); i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && d === '/') { inZeile = true; raus += '  '; i++; continue; }
    if (c === '/' && d === '*') { inBlock = true; raus += '  '; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; raus += c; continue; }
    raus += c;
  }
  return raus;
}

/* Zeilennummer zu einer Position (für --stellen). */
function zeilenIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

/* Zerlegt das Dokument der Reihe nach, wie der HTML-Tokenizer: ein Kommentar
   endet am ersten `-->`, ein <script>/<style> am ersten schließenden Tag. Eine
   Regex je Tag reicht nicht — der Kopfkommentar des Kerns nennt „das erste
   <style>" und „</style>" im Wortlaut; als Treffer verschluckte das den
   Kommentar-Abschluss, und 149 statische style= verschwanden. */
function zerlegen(text) {
  const raus = { script: [], style: [], kommentar: [] };
  const re = /<!--|<(script|style)\b[^>]*>/gi;
  let i = 0;
  while (i < text.length) {
    re.lastIndex = i;
    const m = re.exec(text);
    if (!m) break;
    if (m[0] === '<!--') {
      const e = text.indexOf('-->', m.index + 4);
      const ende = e < 0 ? text.length : e + 3;
      raus.kommentar.push({ start: m.index, ende });
      i = ende;
      continue;
    }
    const tag = m[1].toLowerCase();
    const start = m.index + m[0].length;
    const e = text.toLowerCase().indexOf('</' + tag, start);
    const ende = e < 0 ? text.length : e;
    raus[tag].push({ start, ende, inhalt: text.slice(start, ende) });
    i = ende;
  }
  return raus;
}

/* AUSNAHMEN — Fundstellen, die bewusst ohne Token bleiben. Jede mit Grund; sie
   zählen nicht in die Familie. Eine neue Zeile hier fasst den Test mit an. */
const AUSNAHMEN = [
  { ort: 'css', muster: /^html\.fs-(medium|large)\s*\{\s*font-size:/,
    grund: 'Bedienhilfe „Schrift größer" (Bruch B2): die Wurzel-Schriftgröße ist die Einstellung der Person, '
      + 'kein Gestaltungswert — ein Profil darf sie weder setzen noch zurücknehmen.' },
  { ort: 'css', muster: /\.wizard-eingabe select\s*\{\s*font-size: 16px$/,
    grund: 'iOS-Zoomsperre: unter 16 px zoomt Safari beim Tippen in ein Feld. Der Kommentar an der Regel sagt '
      + '„kein Token, damit der mobile Breakpoint sie NICHT mit verkleinert" — ein Profil darf das auch nicht.' },
  { ort: 'html', muster: /id="eingang-fehler-hinweis"/,
    grund: 'Auffangposten des Eingangswegs (Befund F4, 22.09.2026): erscheint, wenn kein Modul geladen '
      + 'werden konnte — auch dann, wenn das Stylesheet fehlt. Er darf von keinem Token abhängen.' },
];

function ausgenommen(ort, ausschnitt) {
  return AUSNAHMEN.find((a) => a.ort === ort && a.muster.test(ausschnitt));
}

const FAMILIEN = {};  // unten nach DESIGN gefüllt
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
/* Benannte Farben, die im Kern vorkommen könnten. `transparent`, `currentColor`
   und `inherit` sind keine Gestaltungswerte, sondern Bezüge. */
const FARBNAME = /(^|[\s,(])(white|black|red|green|blue|gray|grey|silver|orange|yellow|navy|maroon|purple|teal|olive|lime|aqua|fuchsia|pink|brown|gold|beige|ivory|khaki)(?=$|[\s,;)])/gi;
const FARB_EIGENSCHAFT = /^(color|background(-color)?|border(-[a-z]+)*(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|text-decoration(-color)?|caret-color|accent-color|column-rule(-color)?)$/;

/* Die gestaltenden Familien, für alle drei Orte dieselben. */
const DESIGN = ['hex', 'rgba', 'farbname', 'fontSize', 'fontSizeXs', 'radiusPx', 'shadowRoh', 'randLinksDick', 'uppercase', 'letterSpacing', 'fontWeight'];

/* Eine Deklaration auf Rohwerte prüfen; `merke(familie)` je Fund. */
function deklarationPruefen(prop, wert, merke) {
  prop = prop.toLowerCase();
  if (prop.startsWith('--')) return;                       // Token-Definition: das System selbst
  if (prop === 'src' || /^url\(\s*data:/i.test(wert)) return;   // eingebettete Schriften und Bilder
  for (const _ of wert.match(HEX) || []) merke('hex');   // eslint-disable-line no-unused-vars
  for (const _ of wert.match(/rgba?\(/gi) || []) merke('rgba');   // eslint-disable-line no-unused-vars
  if (FARB_EIGENSCHAFT.test(prop)) for (const _ of wert.match(FARBNAME) || []) merke('farbname');   // eslint-disable-line no-unused-vars
  if (prop === 'font-size') {
    if (/^var\(\s*--fs-xs\s*\)$/.test(wert)) merke('fontSizeXs');
    else if (!/var\(/.test(wert) && !/^(inherit|initial|unset)$/i.test(wert)) merke('fontSize');
  }
  if (prop === 'font' && /\d(px|rem|em|%)/.test(wert) && !/var\(--fs-/.test(wert)) merke('fontSize');
  if (/^border(-[a-z]+)*-radius$/.test(prop) && /\d(\.\d+)?px/.test(wert) && !/var\(/.test(wert)) merke('radiusPx');
  if (prop === 'box-shadow' && !/var\(/.test(wert) && !/^none$/i.test(wert)) merke('shadowRoh');
  if (/^border-left(-width)?$/.test(prop)) {
    const px = wert.match(/(\d+(?:\.\d+)?)px/);
    if (px && parseFloat(px[1]) >= 3) merke('randLinksDick');
  }
  if (prop === 'text-transform' && /uppercase/i.test(wert)) merke('uppercase');
  if (prop === 'letter-spacing' && !/var\(/.test(wert) && !/^(normal|0)$/i.test(wert)) merke('letterSpacing');
  if (prop === 'font-weight' && !/var\(/.test(wert) && !/^(inherit|normal)$/i.test(wert)) merke('fontWeight');
}

/* Inhalt eines style-Attributs in Deklarationen zerlegen. Im JS-erzeugten HTML
   stehen Ausdrücke dazwischen (`' + x + '`); sie bleiben Teil des Werts. */
function attributDeklarationen(inhalt) {
  return inhalt.split(';').map((d) => {
    const i = d.indexOf(':');
    return i < 0 ? null : [d.slice(0, i).trim(), d.slice(i + 1).trim()];
  }).filter((d) => d && /^-?[a-zA-Z][a-zA-Z-]*$/.test(d[0]));
}

FAMILIEN.css = DESIGN.slice();
FAMILIEN.html = DESIGN.concat('styleAttr');
FAMILIEN.js = DESIGN.concat('styleAttr', 'styleZuweisung');

function leereZaehlung(ort) {
  const z = Object.fromEntries(DESIGN.map((f) => [f, 0]));
  if (ort !== 'css') z.styleAttr = 0;
  if (ort === 'js') z.styleZuweisung = 0;
  return z;
}

/* Der Selektor der Regel, in der `pos` steht: Text zwischen der vorigen Grenze
   (`}`, `{` oder `;` auf derselben Ebene) und der öffnenden Klammer. */
function selektorVor(css, pos) {
  const auf = css.lastIndexOf('{', pos);
  if (auf < 0) return '';
  let i = auf - 1;
  while (i >= 0 && css[i] !== '}' && css[i] !== '{' && css[i] !== ';') i--;
  return css.slice(i + 1, auf).replace(/\s+/g, ' ').trim();
}

function cssZaehlen(teile, zeile, stellen) {
  const z = leereZaehlung('css');
  for (const b of teile.style) {
    const css = cssKommentareMaskieren(b.inhalt);
    // Deklarationen: Eigenschaft: Wert, beendet von ; oder }. Selektoren mit
    // Pseudoklassen (`a:hover {`) scheitern am Lookahead, weil `{` folgt.
    const re = /(^|[;{\s])(-?[a-zA-Z][a-zA-Z-]*)\s*:\s*([^;{}]+?)\s*(?=;|})/g;
    for (const m of css.matchAll(re)) {
      const pos = b.start + m.index + m[1].length;
      const sel = selektorVor(css, m.index + m[1].length);
      if (/^@font-face$/i.test(sel)) continue;   // beschreibt die Schriftdatei, gestaltet nichts
      if (ausgenommen('css', sel + ' { ' + m[2] + ': ' + m[3])) continue;
      deklarationPruefen(m[2], m[3], (familie) => {
        z[familie]++;
        if (stellen) stellen.push({ ort: 'css', familie, zeile: zeile(pos), text: (m[2] + ': ' + m[3]).slice(0, 140) });
      });
    }
  }
  return z;
}

function htmlZaehlen(roh, teile, zeile, stellen) {
  // Statisches Markup: Kommentare, <script>-/<style>-Inhalte und Inline-SVG
  // (Bildmaterial, z. B. die Verläufe der Bildmarke) längentreu ausblenden.
  let text = roh;
  const leeren = (s, e) => { text = text.slice(0, s) + text.slice(s, e).replace(/[^\n]/g, ' ') + text.slice(e); };
  for (const b of [...teile.kommentar, ...teile.script, ...teile.style]) leeren(b.start, b.ende);
  for (const m of [...text.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)]) leeren(m.index, m.index + m[0].length);
  const z = leereZaehlung('html');
  for (const m of text.matchAll(/<[a-zA-Z][^<>]*?\sstyle\s*=\s*(["'])([^"']*)\1[^<>]*>/g)) {
    const tagText = m[0];
    if (ausgenommen('html', tagText)) continue;
    const merke = (familie) => {
      z[familie]++;
      if (stellen) stellen.push({ ort: 'html', familie, zeile: zeile(m.index), text: tagText.slice(0, 160) });
    };
    merke('styleAttr');
    for (const [p, w] of attributDeklarationen(m[2])) deklarationPruefen(p, w, merke);
  }
  return z;
}

/* Eigenschaften, deren Zuweisung an `.style` eine Gestaltung ist. Custom
   Properties (`setProperty('--…')`) sind der Token-Weg, Layout (`display`,
   `top`, `width`) keine Gestaltung. */
const STYLE_GESTALTEND = /^(color|background(Color)?|font[A-Z]?[a-zA-Z]*|border[A-Z]?[a-zA-Z]*|boxShadow|textShadow|letterSpacing|textTransform|outline[A-Z]?[a-zA-Z]*|cssText)$/;

function jsZaehlen(teile, zeile, stellen) {
  const z = leereZaehlung('js');
  for (const b of teile.script) {
    const js = jsKommentareMaskieren(b.inhalt);
    // style= in Zeichenketten: style="…", style='…', style=\"…\"
    for (const m of js.matchAll(/\bstyle\s*=\s*(\\?["'])/g)) {
      const pos = b.start + m.index;
      const q = m[1];
      const nach = js.slice(m.index + m[0].length);
      const ende = nach.indexOf(q);
      const wert = ende >= 0 ? nach.slice(0, Math.min(ende, 400)) : nach.slice(0, 200);
      const ausschnitt = 'style=' + q + wert;
      if (ausgenommen('js', ausschnitt)) continue;
      const merke = (familie) => {
        z[familie]++;
        if (stellen) stellen.push({ ort: 'js', familie, zeile: zeile(pos), text: ausschnitt.slice(0, 140) });
      };
      merke('styleAttr');
      for (const [p, w] of attributDeklarationen(wert)) deklarationPruefen(p, w, merke);
    }
    for (const m of js.matchAll(/\.style\.([a-zA-Z]+)\s*=(?!=)/g)) {
      if (!STYLE_GESTALTEND.test(m[1])) continue;
      const pos = b.start + m.index;
      const ausschnitt = js.slice(m.index, m.index + 100).split('\n')[0];
      if (ausgenommen('js', ausschnitt)) continue;
      z.styleZuweisung++;
      if (stellen) stellen.push({ ort: 'js', familie: 'styleZuweisung', zeile: zeile(pos), text: ausschnitt.trim() });
    }
  }
  return z;
}

/* Seit v894 (Lesart B) steht das Stylesheet nicht mehr im Kern, sondern als Modulabschnitt `stil` in
   tools/erscheinung/stil/<teil>.css. Die Zusage dieses Werkzeugs („kein gestaltender Rohwert, alles über Tokens") gilt für
   das, was ein Produkt anwendet — darum zählt beim Kern das Stylesheet aus den Quellen mit, als eigener style-Block. */
function _mitStilQuellen(roh, pfad) {
  if (path.resolve(pfad) !== path.resolve(KERN) || !roh.includes('\n<style id="schutz-stil">\n')) return roh;
  const reihenfolge = path.join(REPO, 'tools', 'erscheinung', 'stil-reihenfolge.json');
  if (!fs.existsSync(reihenfolge)) return roh;
  const stil = JSON.parse(fs.readFileSync(reihenfolge, 'utf8'))
    .map((teil) => fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', teil + '.css'), 'utf8')).join('\n');
  return roh + '\n<style id="stil-aus-modul">\n' + stil + '\n</style>\n';
}

function messen(pfad = KERN, { stellen = false } = {}) {
  const roh = _mitStilQuellen(fs.readFileSync(pfad, 'utf8'), pfad);
  const zeile = zeilenIndex(roh);
  const liste = stellen ? [] : null;
  const teile = zerlegen(roh);
  const ergebnis = {
    css: cssZaehlen(teile, zeile, liste),
    html: htmlZaehlen(roh, teile, zeile, liste),
    js: jsZaehlen(teile, zeile, liste),
  };
  if (liste) ergebnis.stellen = liste;
  return ergebnis;
}

/* Vergleich gegen die Grundlinie: jede Familie darf fallen, keine steigen. */
function vergleichen(stand, basis) {
  const gestiegen = [], gefallen = [];
  for (const [ort, fams] of Object.entries(FAMILIEN)) {
    for (const f of fams) {
      const jetzt = stand[ort][f];
      const vorher = basis.zahlen && basis.zahlen[ort] ? basis.zahlen[ort][f] : undefined;
      if (vorher === undefined) { gestiegen.push({ ort, familie: f, jetzt, vorher: 'fehlt' }); continue; }
      if (jetzt > vorher) gestiegen.push({ ort, familie: f, jetzt, vorher });
      else if (jetzt < vorher) gefallen.push({ ort, familie: f, jetzt, vorher });
    }
  }
  return { gestiegen, gefallen };
}

function heute() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function main() {
  const argv = process.argv.slice(2);
  const iDok = argv.indexOf('--dokument');
  const pfad = iDok >= 0 ? path.resolve(argv[iDok + 1]) : KERN;
  const iSt = argv.indexOf('--stellen');
  const iGl = argv.indexOf('--grundlinie');
  const glPfad = iGl >= 0 ? path.resolve(argv[iGl + 1]) : GRUNDLINIE;
  const stand = messen(pfad, { stellen: iSt >= 0 });

  if (argv.includes('--json')) { console.log(JSON.stringify(stand, null, 1)); return; }
  if (iSt >= 0) {
    const fam = argv[iSt + 1];
    for (const s of stand.stellen.filter((x) => !fam || x.familie === fam || x.ort + '.' + x.familie === fam)) {
      console.log(`${s.ort}.${s.familie}\t${s.zeile}\t${s.text}`);
    }
    return;
  }

  console.log(`[design-treue] ${path.relative(REPO, pfad) || pfad}`);
  for (const [ort, fams] of Object.entries(FAMILIEN)) {
    console.log('  ' + ort + ': ' + fams.map((f) => `${f} ${stand[ort][f]}`).join(' · '));
  }

  if (argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(glPfad, JSON.stringify({
      gegenstand: 'Gestaltende Rohwerte im Kern, die kein Token aus :root beziehen: je Familie in den '
        + '<style>-Bloecken (ohne Kommentare und Token-Definitionen), im statischen style= und im JS-erzeugten '
        + 'style= sowie Zuweisungen an .style. Zaehlweg: tools/design-treue.js.',
      stichtag: heute(),
      zahlen: { css: stand.css, html: stand.html, js: stand.js },
    }, null, 1) + '\n');
    console.log('[design-treue] Grundlinie geschrieben.');
    return;
  }

  if (!fs.existsSync(glPfad)) return;
  const basis = JSON.parse(fs.readFileSync(glPfad, 'utf8'));
  const { gestiegen, gefallen } = vergleichen(stand, basis);
  for (const g of gefallen) console.log(`  gefallen: ${g.ort}.${g.familie} ${g.vorher} → ${g.jetzt} (mit --grundlinie-schreiben festschreiben)`);
  if (gestiegen.length) {
    for (const g of gestiegen) {
      console.error(`[design-treue] ROT — ${g.ort}.${g.familie}: ${g.jetzt} (Grundlinie vom ${basis.stichtag}: ${g.vorher}). `
        + 'Ein gestaltender Wert gehört als Token in :root, nicht als Rohwert in eine Regel.');
    }
    if (argv.includes('--gate')) process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { messen, zerlegen, deklarationPruefen, DESIGN, vergleichen, FAMILIEN, AUSNAHMEN, GRUNDLINIE, KERN, cssKommentareMaskieren };
