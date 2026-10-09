#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   erscheinungsbild-modul.js — aus einer CSS-Quelle ein Erscheinungsbild-Modul bauen (v894, 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   WOZU. Das Gerüst trägt keine Erscheinungswerte mehr (Entscheidung vom 02.10.2026: „Das Gerüst muss komplett
   leer sein von Inhalten, auch Designinhalten"; U2-ADR-473 Nachtrag). Die Werte reisen wie ein
   Sprachmodul: als Rezept-Zutat `erscheinungsbildModul`, die produktTextErzeugen
   (tools/lib/produkt-text-erzeugen.js) in die Region AB_WERK_ERSCHEINUNGSBILD_PRODUKT des Kerns backt.

   DIE QUELLE IST CSS, DAS MODUL IST JSON. Die Werte von „heute" tragen Begründungen (Kontrastzahlen,
   Entscheidungsdaten), die in JSON verlorengingen. Darum ist `tools/erscheinung/heute.css` die Quelle,
   mit Kommentaren, und dieses Werkzeug baut daraus das Modul. Gelesen werden genau drei Blöcke:
     :root               → basis
     html.high-contrast  → hochkontrast
     html.dark-mode      → dunkel
   Jeder andere Block, jede Deklaration ohne `--`-Namen und jeder doppelte Name ist ein Fehler, keine
   stille Auslassung.

   WAS ES NICHT TUT. Es prüft keine Schutzregeln — das tut der Kern selbst (erscheinungsbildPruefen im
   <script id="erscheinungsbild">), beim Anwenden und, über produktTextErzeugen, beim Bauen. EINE Prüfung,
   kein zweiter Prüfer hier, der still abweichen könnte.

     node tools/erscheinungsbild-modul.js                    → baut tools/erscheinung/erscheinungsbild-heute-modul.json
     node tools/erscheinungsbild-modul.js --check            → Exit 1, wenn das Modul nicht dem Bau aus der Quelle entspricht
     node tools/erscheinungsbild-modul.js --quelle <css> --ziel <json> --id <id> [--schriften <json>]   → anderes Profil
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const QUELLE_HEUTE = path.join(REPO, 'tools', 'erscheinung', 'heute.css');
const ZIEL_HEUTE = path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json');
const STIL_REIHENFOLGE = path.join(REPO, 'tools', 'erscheinung', 'stil-reihenfolge.json');
// Profil „Salbei mit Glas“ (U2-ADR-473 W5a): Quelle, stil-Reihenfolge und Ziel, gebaut wie jedes Profil (--quelle … --stil-reihenfolge …).
const PROFIL_SALBEI_GLAS = Object.freeze({
  id: 'salbei-glas',
  quelle: path.join(REPO, 'tools', 'erscheinung', 'salbei-glas.css'),
  stilReihenfolge: path.join(REPO, 'tools', 'erscheinung', 'stil-reihenfolge-salbei-glas.json'),
  ziel: path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json'),
});
const STIL_ORDNER = path.join(REPO, 'tools', 'erscheinung', 'stil');
const SCHRIFTEN_HEUTE = path.join(REPO, 'tools', 'erscheinung', 'schriften.json');

/* Der Abschnitt `schriften` (v896): je Eintrag der Liste (tools/erscheinung/schriften.json) die Datei, base64, als `woff2` bzw. —
   mit `pdf: true` — als `ttf`. Geprüft wird nicht hier, sondern im Kern (_ebSchriftenPruefen) und beim Backen. */
function schriftenBauen(liste = SCHRIFTEN_HEUTE) {
  if (!fs.existsSync(liste)) return undefined;
  const basis = path.dirname(liste);
  return JSON.parse(fs.readFileSync(liste, 'utf8')).schriften.map((e) => {
    const b64 = fs.readFileSync(path.resolve(basis, e.datei)).toString('base64');
    const { datei, ...rest } = e;
    return Object.assign({ familie: rest.familie, gewicht: rest.gewicht, stil: rest.stil },
      rest.pdf === true ? { ttf: b64, pdf: true } : { woff2: b64 }, { lizenz: rest.lizenz, quelle: rest.quelle });
  });
}

/* Der Abschnitt `stil` (Lesart B, 02.10.2026): je Teil der CSS-Text aus tools/erscheinung/stil/<teil>.css, in der Reihenfolge von
   stil-reihenfolge.json (= Kaskade). Kommentare und Leerzeilen fallen weg — das Modul trägt nur Regeln; die Begründungen
   bleiben in der Quelle. */
function stilBauen({ reihenfolge = STIL_REIHENFOLGE, ordner = STIL_ORDNER } = {}) {
  if (!fs.existsSync(reihenfolge)) return undefined;
  const stil = {};
  for (const teil of JSON.parse(fs.readFileSync(reihenfolge, 'utf8'))) {
    const roh = fs.readFileSync(path.join(ordner, teil + '.css'), 'utf8');
    stil[teil] = _ohneKommentare(roh).split('\n').map((z) => z.replace(/\s+$/, '')).filter((z) => z.trim()).join('\n') + '\n';
  }
  return stil;
}

const EBENE_JE_SELEKTOR = Object.freeze({ ':root': 'basis', 'html.high-contrast': 'hochkontrast', 'html.dark-mode': 'dunkel' });

function _ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* Zerlegt einen Deklarationsblock in `--name: wert`. Werte dürfen Klammern, Kommas und Anführungszeichen
   tragen (Schriftstapel, color-mix, rgba), aber kein Semikolon — das ist die Grenze. */
function _deklarationen(innen, wo) {
  const tokens = {};
  for (const roh of innen.split(';')) {
    const d = roh.trim();
    if (!d) continue;
    const m = /^(--[a-z0-9-]+)\s*:\s*([\s\S]+)$/.exec(d);
    if (!m) throw new Error(wo + ': keine Token-Deklaration: „' + d.slice(0, 60) + '"');
    if (Object.prototype.hasOwnProperty.call(tokens, m[1])) throw new Error(wo + ': ' + m[1] + ' doppelt');
    tokens[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return tokens;
}

function cssZuModul(cssText, id, { stil, schriften } = {}) {
  const css = _ohneKommentare(cssText);
  const modul = { modulTyp: 'erscheinungsbild', id, basis: {}, hochkontrast: {}, dunkel: {} };
  const gesehen = new Set();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  let rest = css;
  while ((m = re.exec(css))) {
    const selektor = m[1].trim().replace(/\s+/g, ' ');
    const ebene = EBENE_JE_SELEKTOR[selektor];
    if (!ebene) throw new Error('Unbekannter Block „' + selektor + '" — erlaubt sind ' + Object.keys(EBENE_JE_SELEKTOR).join(', '));
    if (gesehen.has(selektor)) throw new Error('Block „' + selektor + '" doppelt');
    gesehen.add(selektor);
    modul[ebene] = _deklarationen(m[2], selektor);
    rest = rest.replace(m[0], '');
  }
  if (rest.trim()) throw new Error('Text außerhalb der Blöcke: „' + rest.trim().slice(0, 60) + '"');
  if (!Object.keys(modul.basis).length) throw new Error('Kein :root-Block — ein Erscheinungsbild ohne Basis ist keines');
  if (stil) modul.stil = stil;
  if (schriften) modul.schriften = schriften;
  return modul;
}

function modulText(modul) {
  return JSON.stringify(modul, null, 2) + '\n';
}

function _arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

function main(argv) {
  const quelle = _arg(argv, '--quelle') ? path.resolve(_arg(argv, '--quelle')) : QUELLE_HEUTE;
  const ziel = _arg(argv, '--ziel') ? path.resolve(_arg(argv, '--ziel')) : ZIEL_HEUTE;
  const id = _arg(argv, '--id') || 'heute';
  const stil = _arg(argv, '--stil-reihenfolge') ? stilBauen({ reihenfolge: path.resolve(_arg(argv, '--stil-reihenfolge')), ordner: path.join(path.dirname(path.resolve(_arg(argv, '--stil-reihenfolge'))), 'stil') })
    : (quelle === QUELLE_HEUTE ? stilBauen() : undefined);
  const schriften = _arg(argv, '--schriften') ? schriftenBauen(path.resolve(_arg(argv, '--schriften')))
    : (quelle === QUELLE_HEUTE ? schriftenBauen() : undefined);
  const soll = modulText(cssZuModul(fs.readFileSync(quelle, 'utf8'), id, { stil, schriften }));
  if (argv.includes('--check')) {
    const ist = fs.existsSync(ziel) ? fs.readFileSync(ziel, 'utf8') : null;
    if (ist !== soll) {
      console.error('✗ ' + path.relative(REPO, ziel) + ' entspricht nicht dem Bau aus ' + path.relative(REPO, quelle)
        + ' — neu bauen: node tools/erscheinungsbild-modul.js');
      return 1;
    }
    console.log('✓ ' + path.relative(REPO, ziel) + ' = Bau aus ' + path.relative(REPO, quelle));
    return 0;
  }
  fs.writeFileSync(ziel, soll);
  const m = JSON.parse(soll);
  console.log('geschrieben: ' + path.relative(REPO, ziel) + ' (basis ' + Object.keys(m.basis).length + ', hochkontrast '
    + Object.keys(m.hochkontrast).length + ', dunkel ' + Object.keys(m.dunkel).length
    + (m.stil ? ', stil ' + Object.keys(m.stil).join('+') + ' ' + Object.values(m.stil).reduce((n, t) => n + Buffer.byteLength(t), 0) + ' B' : '')
    + (m.schriften ? ', schriften ' + m.schriften.length : '') + ')');
  return 0;
}

module.exports = { cssZuModul, modulText, stilBauen, schriftenBauen, SCHRIFTEN_HEUTE, QUELLE_HEUTE, ZIEL_HEUTE, STIL_REIHENFOLGE, EBENE_JE_SELEKTOR, PROFIL_SALBEI_GLAS };

if (require.main === module) process.exit(main(process.argv.slice(2)));
