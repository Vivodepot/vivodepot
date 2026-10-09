#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   studio-erscheinung-backen.js — das Studio trägt dasselbe Erscheinungsbild wie die App, gebacken, nicht abgeschrieben
   ────────────────────────────────────────────────────────────────────────────
   Studio-Neugestaltung A+ mit Glas, Wagen S0 (08.10.2026). Das Studio lädt kein CSS aus der App und kein Modul zur
   Laufzeit; bisher standen seine Farben als Literale in der Datei („Werte 1:1 übernommen“) und liefen der App davon.
   Dieser Erzeuger bäckt aus dem Erscheinungsbild-Modul der App (Vorgabe: tools/erscheinung/erscheinungsbild-salbei-
   glas-modul.json) eine Region in vivodepot-studio.html:
     1. die Schrift des Moduls (@font-face, woff2 aus `schriften`);
     2. die Grund-Tokens aus der Ebene `basis` (TOKENS unten, Wert unverändert);
     3. das Glas: je ROLLE die Deklarationen, die das Modul der entsprechenden Fläche der App gibt (Hintergrund, Unschärfe,
        Schatten), auf die Fläche des Studios umgesetzt; dazu der deckende Rückfall, den das Modul für „Transparenz
        reduzieren“ und ohne backdrop-filter setzt. Das Studio legt denselben Rückfall zusätzlich auf `forced-colors`.
   Nichts wird erfunden: ein Wert, der im Modul nicht steht, steht nicht in der Region. Fehlt eine Rolle im Modul, bricht
   der Erzeuger ab, statt still eine Fläche ohne Glas zu bauen.

     node tools/studio-erscheinung-backen.js                 Region neu schreiben
     node tools/studio-erscheinung-backen.js --check         Exit 1, wenn die Region nicht dem Modul entspricht
     node tools/studio-erscheinung-backen.js --modul <pfad>  ein anderes Modul (Proben)
     node tools/studio-erscheinung-backen.js --studio <pfad> eine andere Studio-Datei (Proben)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STUDIO = path.join(REPO, 'vivodepot-studio.html');
const MODUL = path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json');
const BEGIN = '/* STUDIO-ERSCHEINUNG:BEGIN — erzeugt von tools/studio-erscheinung-backen.js aus dem Erscheinungsbild-Modul der App, nicht von Hand ändern */';
const ENDE = '/* STUDIO-ERSCHEINUNG:END */';

/* Die Grund-Tokens, die das Studio aus der Ebene `basis` übernimmt. */
const TOKENS = Object.freeze(['--ink', '--ink2', '--ink3', '--salbei-dunkel', '--salbei-mid', '--salbei-light', '--cream', '--white', '--line', '--gold', '--gold-soft', '--error']);

/* Die Flächen: welche Fläche der App (Selektor im Modul, ohne den Modus-Vorsatz) welcher Fläche des Studios entspricht. */
const MODUS = 'html:not(.dark-mode):not(.high-contrast) ';
const ROLLEN = Object.freeze([
  { name: 'grundflaeche', app: '#app .content', studio: 'body' },
  { name: 'kopf', app: '.topbar', studio: 'header.app' },
  { name: 'karte', app: '#app .karte', studio: '.kachel, .palette, .eigenschaften, .karte-innen, .bsp-karte, .weg-liste li, .fs, .blatt-meta, .bk-blatt' },
  { name: 'dialog', app: '#modal-rueck .modal', studio: 'dialog.dlg' },
  { name: 'vorschau', app: '.vorfuehrung-spalte', studio: '.vorschau.hat-felder' },
]);
/* Nur diese Eigenschaften machen das Glas einer Fläche aus; alles andere (Abstände, Variablen der App) bleibt draußen. */
const GLAS_EIGENSCHAFTEN = Object.freeze(['background', 'background-color', 'background-attachment', '-webkit-backdrop-filter', 'backdrop-filter', 'box-shadow', 'border-radius']);
const RUECKFALL_MEDIA = '@media (prefers-reduced-transparency: reduce)';
const OHNE_FILTER_SUPPORTS = '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))';

/* Regeln eines Stylesheets als { kontext: ['@media …'], selektoren: [...], dekl: [[eig, wert], …] }. Kommentare fallen weg. */
function regelnLesen(css) {
  const ohne = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const raus = [];
  const gehe = (s, kontext) => {
    let i = 0;
    while (i < s.length) {
      const j = s.indexOf('{', i);
      if (j < 0) break;
      const kopf = s.slice(i, j).trim();
      let tiefe = 1, k = j + 1;
      while (tiefe && k < s.length) { if (s[k] === '{') tiefe++; else if (s[k] === '}') tiefe--; k++; }
      const rumpf = s.slice(j + 1, k - 1);
      if (kopf.startsWith('@')) gehe(rumpf, kontext.concat([kopf.replace(/\s+/g, ' ')]));
      else raus.push({ kontext, selektoren: _selektorListe(kopf), dekl: _deklarationen(rumpf) });
      i = k;
    }
  };
  gehe(ohne, []);
  return raus;
}
function _selektorListe(kopf) {
  const teile = []; let tiefe = 0, akt = '';
  for (const z of kopf) {
    if (z === '(') tiefe++; else if (z === ')') tiefe--;
    if (z === ',' && !tiefe) { teile.push(akt.trim().replace(/\s+/g, ' ')); akt = ''; } else akt += z;
  }
  if (akt.trim()) teile.push(akt.trim().replace(/\s+/g, ' '));
  return teile;
}
function _deklarationen(rumpf) {
  const raus = []; let tiefe = 0, akt = '';
  for (const z of rumpf) {
    if (z === '(') tiefe++; else if (z === ')') tiefe--;
    if (z === ';' && !tiefe) { _dekl(akt, raus); akt = ''; } else akt += z;
  }
  _dekl(akt, raus);
  return raus;
}
function _dekl(t, raus) {
  const i = t.indexOf(':');
  if (i < 0) return;
  const eig = t.slice(0, i).trim().toLowerCase(), wert = t.slice(i + 1).trim().replace(/\s+/g, ' ');
  if (eig && wert) raus.push([eig, wert]);
}

/* Die Deklarationen, die das Modul einer App-Fläche im hellen Modus gibt, in einem Kontext; spätere Regeln gewinnen. */
function glasFuer(regeln, appSelektor, kontext) {
  const gesucht = MODUS + appSelektor;
  const dekl = new Map();
  for (const r of regeln) {
    if (r.kontext.join(' ') !== kontext.join(' ')) continue;
    if (!r.selektoren.includes(gesucht)) continue;
    for (const [eig, wert] of r.dekl) if (GLAS_EIGENSCHAFTEN.includes(eig)) { dekl.delete(eig); dekl.set(eig, wert); }
  }
  return dekl;
}

const _block = (selektor, dekl, einzug = '') => einzug + selektor + ' { ' + [...dekl].map(([e, w]) => e + ': ' + w + ';').join(' ') + ' }';

function regionErzeugen(modul) {
  if (!modul || modul.modulTyp !== 'erscheinungsbild') throw new Error('kein Erscheinungsbild-Modul');
  const zeilen = [BEGIN, '/* Quelle: Modul „' + modul.id + '“ */'];
  // Nur die Bildschirmschriften (woff2); die TTF-Einträge des Moduls sind für das PDF und gehören nicht ins Studio.
  for (const s of (modul.schriften || []).filter((x) => typeof x.woff2 === 'string')) {
    // Die Datenzeile steht allein (nur `src:`): so trennt der Zuschnitt-Wächter Schriftdaten sauber vom Text (nurDataUrl).
    zeilen.push('@font-face { font-family: "' + s.familie + '"; font-weight: ' + s.gewicht + '; font-style: ' + (s.stil || 'normal') + '; font-display: swap;',
      '  src: url(data:font/woff2;base64,' + s.woff2 + ') format("woff2");', '}');
  }
  const basis = modul.basis || {};
  const fehlend = TOKENS.filter((t) => typeof basis[t] !== 'string');
  if (fehlend.length) throw new Error('Token fehlt in der Ebene basis: ' + fehlend.join(', '));
  zeilen.push(':root { ' + TOKENS.map((t) => t + ': ' + basis[t] + ';').join(' ') + ' }');
  const css = (modul.stil && Object.values(modul.stil).join('\n')) || '';
  const regeln = regelnLesen(css);
  const rueckfall = [], ohneFilter = [];
  for (const rolle of ROLLEN) {
    const glas = glasFuer(regeln, rolle.app, []);
    if (!glas.size) throw new Error('Rolle „' + rolle.name + '“: das Modul gibt der Fläche ' + rolle.app + ' kein Glas');
    zeilen.push('/* ' + rolle.name + ' = App ' + rolle.app + ' */');
    zeilen.push(_block(rolle.studio, glas));
    const r = glasFuer(regeln, rolle.app, [RUECKFALL_MEDIA]);
    if (r.size) rueckfall.push(_block(rolle.studio, r, '  '));
    const o = glasFuer(regeln, rolle.app, [OHNE_FILTER_SUPPORTS]);
    if (o.size) ohneFilter.push(_block(rolle.studio, o, '  '));
  }
  if (!rueckfall.length) throw new Error('das Modul setzt keinen Rückfall für „Transparenz reduzieren“');
  zeilen.push('/* deckender Rückfall: aus dem Modul für „Transparenz reduzieren“, im Studio auch im Hochkontrast (forced-colors) */');
  zeilen.push('@media (prefers-reduced-transparency: reduce), (forced-colors: active) {', ...rueckfall, '}');
  if (ohneFilter.length) zeilen.push(OHNE_FILTER_SUPPORTS + ' {', ...ohneFilter, '}');
  zeilen.push(ENDE);
  return zeilen.join('\n');
}

function regionLesen(studioText) {
  const a = studioText.indexOf(BEGIN), e = studioText.indexOf(ENDE);
  if (a < 0 || e < a) return null;
  return studioText.slice(a, e + ENDE.length);
}
function studioMitRegion(studioText, region) {
  const alt = regionLesen(studioText);
  if (alt == null) throw new Error('vivodepot-studio.html trägt keine Region STUDIO-ERSCHEINUNG');
  return studioText.replace(alt, () => region);
}

/* Für die Farb-Wächter (tools/erzeuger-marken-palette-pruefen.js, tools/abgeloeste-farben-pruefen.js; Wort der Gegenlesung
   08.10.2026): die Region trägt die Farben des App-Moduls, nicht abgeschriebene. Ausgeblendet wird sie NUR, wenn es sie genau
   einmal gibt (BEGIN und END je einmal, in dieser Reihenfolge) und sie Zeichen für Zeichen der Region entspricht, die
   regionErzeugen HIER aus dem Modul erzeugt — kein Flag, keine Umgebung, kein früherer Lauf. Sonst bleibt der Text, wie er ist
   (jede Farbe darin wird geprüft), und `fehler` nennt den Grund. Die Ausblendung ist zeilentreu (Leerzeichen, Zeilenumbrüche bleiben). */
function regionGeprueftAusblenden(text, modul) {
  const nBegin = (String(text).match(/STUDIO-ERSCHEINUNG:BEGIN/g) || []).length;
  const nEnde = (String(text).match(/STUDIO-ERSCHEINUNG:END/g) || []).length;
  if (!nBegin && !nEnde) return { text, ausgeblendet: false, fehler: null };
  if (nBegin !== 1 || nEnde !== 1 || text.indexOf(BEGIN) < 0 || text.indexOf(ENDE) < text.indexOf(BEGIN)) {
    return { text, ausgeblendet: false, fehler: 'Region STUDIO-ERSCHEINUNG nicht genau einmal (BEGIN ' + nBegin + '×, END ' + nEnde + '×)' };
  }
  const a = text.indexOf(BEGIN), e = text.indexOf(ENDE) + ENDE.length;
  let soll;
  try { soll = regionErzeugen(modul || JSON.parse(fs.readFileSync(MODUL, 'utf8'))); } catch (x) { return { text, ausgeblendet: false, fehler: 'Region nicht erzeugbar: ' + x.message }; }
  if (text.slice(a, e) !== soll) return { text, ausgeblendet: false, fehler: 'Region STUDIO-ERSCHEINUNG weicht vom Modul ab' };
  return { text: text.slice(0, a) + soll.replace(/[^\n]/g, ' ') + text.slice(e), ausgeblendet: true, fehler: null };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const modulPfad = arg('--modul') || MODUL;
  const studioPfad = arg('--studio') || STUDIO;
  const region = regionErzeugen(JSON.parse(fs.readFileSync(modulPfad, 'utf8')));
  const text = fs.readFileSync(studioPfad, 'utf8');
  if (argv.includes('--check')) {
    if (regionLesen(text) !== region) {
      console.error('studio-erscheinung-backen --check: DRIFT — die Region in ' + path.relative(REPO, studioPfad) + ' entspricht nicht dem Modul. node tools/studio-erscheinung-backen.js ausführen.');
      process.exit(1);
    }
    console.log('studio-erscheinung-backen --check: kein Drift.');
    return;
  }
  const neu = studioMitRegion(text, region);
  if (neu !== text) fs.writeFileSync(studioPfad, neu);
  console.log('studio-erscheinung-backen: ' + (neu !== text ? 'geschrieben' : 'unverändert') + ' (' + ROLLEN.length + ' Flächen).');
}

module.exports = { regionErzeugen, regionGeprueftAusblenden, regionLesen, studioMitRegion, regelnLesen, glasFuer, ROLLEN, TOKENS, BEGIN, ENDE, MODUL, STUDIO };
if (require.main === module) main();
