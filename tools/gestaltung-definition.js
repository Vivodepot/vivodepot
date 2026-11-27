#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   gestaltung-definition.js — Erzeuger und Prüfer der Gestaltungsdefinition (Stufe 1)
   ────────────────────────────────────────────────────────────────────────────
   Die Definition `tools/erscheinung/definition.json` hat zwei Schichten:
     grundwerte  Schicht 1: Schriftgrößen (Verweis auf tools/groessenleiter.json), sieben Abstände mit Zwischenwerten, eine Radienreihe,
                 Trefferfläche, optional benannte Maße des Aufbaus (--mass-…), zwei Umbruchpunkte, Farben (Verweis auf Custom Properties der Stil-Dateien).
     bedeutung   Schicht 2: Token nach der Bedeutung (Fläche, Text, Linie, Aktion, Warnung, Herkunft), je mit
                 Verweis auf einen Grundwert. Keine Zahl, kein Farbwert.
   Jede Zahl steht nur in Schicht 1.

   Dieses Werkzeug schreibt aus Schicht 1 einen markierten Block in `tools/erscheinung/stil/grundlage.css`
   (--abstand-1 … --abstand-7 und Zwischenwerte, Radienreihe, --treffer, Gewichte, Zeilenhöhen, Übergänge, Schatten, Maße) zwischen
   `GESTALTUNG-DEFINITION:BEGIN` und `GESTALTUNG-DEFINITION:END`. Bestehende Regeln stellt es NICHT um.
   Schicht 2 wird in dieser Stufe nur geprüft (Verweise lösen auf), nicht ins CSS geschrieben.
     vorlagen    Schicht 3 (Formatvorlagen, AP 2 S1, 24.11.2026): je Elementart genau ein Eintrag mit Selektor und Regeln. Jeder
                 Regelwert besteht nur aus Verweisen (var(--…)) und den Schlüsselwörtern 0/none, keine Zahl. Daraus schreibt das
                 Werkzeug einen zweiten markierten Block GESTALTUNG-VORLAGEN in grundlage.css: die Grundregel je Feldart, im Bereich
                 `bereich` (ohne hohen Kontrast) und, wo angegeben, die Fassung für hohen Kontrast.

   AUFRUFE
     node tools/gestaltung-definition.js                  Selbstprobe gegen die Fixtures im Repo (grün und rot)
     node tools/gestaltung-definition.js --check          Exit 1, wenn Definition, Block oder ADR-Prüfsumme nicht passen
     node tools/gestaltung-definition.js --schreiben      schreibt den Block (ersetzt ihn, oder setzt ihn nach der Größenleiter ein)
     Optionen: --definition <pfad> --css <pfad> --adr <pfad>
   Danach: `node tools/erscheinungsbild-modul.js` (und das Salbei-Glas-Profil) baut die abgeleiteten Module neu.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const DEFINITION = path.join(REPO, 'tools', 'erscheinung', 'definition.json');
const GRUNDLAGE = path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css');
const FORMATE = path.join(REPO, 'tools', 'erscheinung', 'vd-formate.css');   // gebackener Block VD-FORMATE (--backen)
const ADR_ORDNER = path.join(REPO, 'docs', 'adr');
const ADR_MUSTER = /^vivodepot-U2-ADR-\d+-gestaltungsdefinition-eine-quelle-.*\.md$/;
const FIXTURES = path.join(__dirname, 'gestaltung-fixtures');

const MARKE_ANFANG = 'GESTALTUNG-DEFINITION:BEGIN';
const MARKE_ENDE = 'GESTALTUNG-DEFINITION:END';
// Größenleiter des Stilsatzes „dummy“ (U-G): Stufen stehen in tools/groessenleiter.json unter `profile.dummy`, der Block wird erzeugt.
const LEITER = path.join(REPO, 'tools', 'groessenleiter.json');
const DUMMY_STIL = path.join(REPO, 'tools', 'erscheinung', 'stil', 'dummy.css');
const LEITER_MARKE_ANFANG = 'GROESSENLEITER-DUMMY:BEGIN';
const LEITER_MARKE_ENDE = 'GROESSENLEITER-DUMMY:END';
// Hinter diese Zeile (Ende der Größenleiter) setzt `--schreiben` den Block, solange er noch fehlt.
const EINSETZEN_NACH = /^[ \t]*@media \(max-width: 767px\) \{ :root \{ --fs-role-anzeige:.*$/m;

const VORLAGEN_MARKE_ANFANG = 'GESTALTUNG-VORLAGEN:BEGIN';
const VORLAGEN_MARKE_ENDE = 'GESTALTUNG-VORLAGEN:END';
const ABSTAENDE = ['--abstand-1', '--abstand-2', '--abstand-3', '--abstand-4', '--abstand-5', '--abstand-6', '--abstand-7'];
// Radien (25.11.2026, Dummy 13.11.): eine aufsteigende Reihe --radius-1 … --radius-N in px, dazu --radius-rund (Pille) und --radius-kreis (50 %).
const RADIUS_NAME = /^--radius-([1-9][0-9]*|rund|kreis)$/;
// Weitere Gruppen der Schicht 1 (25.11.2026): je Wert ein Name; Muster für Name und Wert. Die Werte stehen nur hier.
const GRUPPEN = {
  gewichte: { name: /^--fw-[a-z]+$/, wert: /^[1-9][05]0$/, art: 'Schriftgewicht 100 … 950 in Fünfzigern' },
  zeilenhoehen: { name: /^--zh-[a-z]+$/, wert: /^(1|1\.\d{1,2})$/, art: 'Zeilenhöhe ohne Einheit, 1 … 1.99' },
  uebergaenge: { name: /^--dauer-[a-z]+$/, wert: /^0?\.\d{1,2}s$/, art: 'Dauer in s' },
  schatten: { name: /^--schatten-[a-z0-9-]+$/, wert: /^(inset )?(-?\d+(px)? ){3}(\d+px )?(rgba\(\d{1,3},\d{1,3},\d{1,3},0?\.\d+\)|var\(--[a-z0-9-]+\))(, ?(inset )?(-?\d+(px)? ){3}(\d+px )?(rgba\(\d{1,3},\d{1,3},\d{1,3},0?\.\d+\)|var\(--[a-z0-9-]+\)))*$/, art: 'Schatten aus Längen und einer Farbe (rgba oder Farbname)' },
};
function radienNamen(g) { return ((g && g.radien) || []).map((r) => r.token); }
function zwischenNamen(g) { return ((g && g.abstaende && g.abstaende.zwischen) || []).map((s) => s.token); }
const BEDEUTUNGEN = ['flaeche', 'text', 'linie', 'aktion', 'warnung', 'herkunft'];

function definitionLaden(datei = DEFINITION) { return JSON.parse(fs.readFileSync(datei, 'utf8')); }
function pruefsumme(datei = DEFINITION) { return crypto.createHash('sha256').update(fs.readFileSync(datei)).digest('hex'); }

function ohneKommentare(text) { return text.replace(/\/\*[\s\S]*?\*\//g, (k) => k.replace(/[^\n]/g, ' ')); }
function deklariert(cssText, name) {
  return new RegExp('(^|[\\s;{])' + name.replace(/[-]/g, '\\-') + '\\s*:').test(ohneKommentare(cssText));
}

/* ── Prüfung der Definition selbst: Form, Verweise, keine Zahl in Schicht 2 ───────────────────────────────── */
function definitionPruefen(def, wurzel = REPO) {
  const fehler = [];
  const g = def && def.grundwerte;
  const b = def && def.bedeutung;
  if (!g || !b) return ['Definition: Schicht grundwerte oder bedeutung fehlt'];

  // Schriftgrößen: nur Verweis auf die Größenleiter, keine Kopie
  if (!g.schriftgroessen || typeof g.schriftgroessen.verweis !== 'string') fehler.push('grundwerte.schriftgroessen: Verweis fehlt');
  else {
    if (Object.keys(g.schriftgroessen).some((k) => k === 'stufen' || k === 'px')) fehler.push('grundwerte.schriftgroessen: Größen werden nicht kopiert, sie bleiben in der Größenleiter');
    if (!fs.existsSync(path.join(wurzel, g.schriftgroessen.verweis))) fehler.push('grundwerte.schriftgroessen: Verweisziel fehlt: ' + g.schriftgroessen.verweis);
  }
  // Abstände: genau sieben, in der Reihenfolge, aufsteigend
  const st = (g.abstaende && g.abstaende.stufen) || [];
  if (st.map((s) => s.token).join() !== ABSTAENDE.join()) fehler.push('grundwerte.abstaende: erwartet ' + ABSTAENDE.join(', '));
  if (st.some((s, i) => !Number.isFinite(s.px) || s.px <= 0 || (i && s.px <= st[i - 1].px))) fehler.push('grundwerte.abstaende: px positiv und aufsteigend');
  if (!g.abstaende || !['rem', 'px'].includes(g.abstaende.einheit)) fehler.push('grundwerte.abstaende.einheit: rem oder px');
  // Zwischenwerte der Abstände (25.11.2026): Namen --abstand-<n>-<m>, px positiv, kein Wert doppelt mit der Hauptreihe
  const zw = (g.abstaende && g.abstaende.zwischen) || [];
  const allePx = new Set(st.map((s) => s.px));
  for (const s of zw) {
    if (!/^--abstand-\d+-\d+$/.test(String(s.token))) fehler.push('grundwerte.abstaende.zwischen: Name ' + s.token + ' (erwartet --abstand-<n>-<m>)');
    if (!Number.isFinite(s.px) || s.px <= 0) fehler.push('grundwerte.abstaende.zwischen: ' + s.token + ' px positiv');
    if (allePx.has(s.px)) fehler.push('grundwerte.abstaende.zwischen: ' + s.px + ' px hat schon einen Namen');
    allePx.add(s.px);
  }
  // Radien, Treffer
  const rd = g.radien || [];
  const rdZahl = rd.filter((r) => /^--radius-\d+$/.test(String(r.token)));
  if (rd.some((r) => !RADIUS_NAME.test(String(r.token)))) fehler.push('grundwerte.radien: Namen --radius-<n>, --radius-rund, --radius-kreis');
  if (!rd.some((r) => r.token === '--radius-rund')) fehler.push('grundwerte.radien: --radius-rund fehlt');
  if (rdZahl.some((r, i) => r.token !== '--radius-' + (i + 1))) fehler.push('grundwerte.radien: Reihe --radius-1 … lückenlos');
  if (rdZahl.some((r, i) => !/^\d+(\.\d+)?px$/.test(String(r.wert)) || (i && parseFloat(r.wert) <= parseFloat(rdZahl[i - 1].wert)))) fehler.push('grundwerte.radien: Reihe in px, aufsteigend');
  for (const r of rd) if (r.token === '--radius-rund' && !/^\d+px$/.test(String(r.wert))) fehler.push('grundwerte.radien: --radius-rund in px');
  for (const r of rd) if (r.token === '--radius-kreis' && r.wert !== '50%') fehler.push('grundwerte.radien: --radius-kreis ist 50%');
  if (new Set(rd.map((r) => r.wert)).size !== rd.length) fehler.push('grundwerte.radien: ein Wert mit zwei Namen');
  // Gewichte, Zeilenhöhen, Übergänge, Schatten
  for (const [gruppe, m] of Object.entries(GRUPPEN)) {
    if (g[gruppe] === undefined) continue;
    const liste = Array.isArray(g[gruppe]) ? g[gruppe] : [];
    if (!liste.length) fehler.push('grundwerte.' + gruppe + ': Liste fehlt oder leer');
    const namen = new Set(); const werte = new Set();
    for (const e of liste) {
      if (!m.name.test(String(e.token))) fehler.push('grundwerte.' + gruppe + ': Name ' + e.token);
      if (!m.wert.test(String(e.wert))) fehler.push('grundwerte.' + gruppe + ': ' + e.token + ' (' + m.art + ')');
      if (namen.has(e.token)) fehler.push('grundwerte.' + gruppe + ': doppelter Name ' + e.token);
      if (werte.has(e.wert)) fehler.push('grundwerte.' + gruppe + ': ' + e.wert + ' hat zwei Namen');
      namen.add(e.token); werte.add(e.wert);
    }
  }
  if (!g.treffer || g.treffer.token !== '--treffer' || !/^\d+px$/.test(String(g.treffer.wert))) fehler.push('grundwerte.treffer: --treffer in px');
  // Maße des Aufbaus (Nachtrag U-G, 15.11.2026): benannte Längen in px, Namen --mass-…; die Zahl steht nur hier
  if (g.masse !== undefined) {
    const ms = Array.isArray(g.masse) ? g.masse : [];
    if (!ms.length) fehler.push('grundwerte.masse: Liste fehlt oder leer');
    const gesehenM = new Set();
    for (const m of ms) {
      if (!/^--mass-[a-z-]+$/.test(String(m.token))) fehler.push('grundwerte.masse: Name ' + m.token + ' (erwartet --mass-…)');
      if (!/^\d+px$/.test(String(m.wert))) fehler.push('grundwerte.masse: ' + m.token + ' in px');
      if (gesehenM.has(m.token)) fehler.push('grundwerte.masse: doppelter Name ' + m.token);
      gesehenM.add(m.token);
    }
  }
  // Zeichen (Nachtrag Herkunft A2, 17.11.2026): benannte Bildzeichen als SVG-Kontur, Namen --zeichen-…; das Zeichen steht nur hier.
  // Die Stilquelle nimmt es als Maske (mask-image), die Farbe kommt aus dem Text. Erlaubt ist nur reine Kontur: kein Skript,
  // kein Ereignis-Attribut, kein Verweis nach außen.
  if (g.zeichen !== undefined) {
    const zs = Array.isArray(g.zeichen) ? g.zeichen : [];
    if (!zs.length) fehler.push('grundwerte.zeichen: Liste fehlt oder leer');
    const gesehenZ = new Set();
    for (const z of zs) {
      if (!/^--zeichen-[a-z-]+$/.test(String(z.token))) fehler.push('grundwerte.zeichen: Name ' + z.token + ' (erwartet --zeichen-…)');
      fehler.push(...zeichenSvgPruefen(z.token, z.svg));
      if (gesehenZ.has(z.token)) fehler.push('grundwerte.zeichen: doppelter Name ' + z.token);
      gesehenZ.add(z.token);
    }
  }
  // Umbruchpunkte: zwei, lückenlos (schmal bis N, breit ab N+1)
  const u = g.umbrueche || {};
  if (!Number.isInteger(u.schmal_bis_px) || u.breit_ab_px !== u.schmal_bis_px + 1) fehler.push('grundwerte.umbrueche: schmal_bis_px und breit_ab_px = schmal_bis_px + 1');
  // Farben: jeder Name in jeder Quelle deklariert
  const f = g.farben || {};
  const farbNamen = f.namen || [];
  if (!farbNamen.length || !(f.quellen || []).length) fehler.push('grundwerte.farben: Quellen und Namen fehlen');
  for (const q of f.quellen || []) {
    const p = path.join(wurzel, q);
    if (!fs.existsSync(p)) { fehler.push('grundwerte.farben: Quelle fehlt: ' + q); continue; }
    const t = fs.readFileSync(p, 'utf8');
    for (const n of farbNamen) if (!/^--[a-z0-9-]+$/.test(n) || !deklariert(t, n)) fehler.push(`grundwerte.farben: ${n} ist in ${q} nicht deklariert`);
  }
  // Personenfarbe (Sub-Depot): benannte Töne, jeder mit Text- und Linienfassung in jeder Quelle deklariert
  const pe = g.person || {};
  if (g.person && (!Array.isArray(pe.toene) || !pe.toene.length)) fehler.push('grundwerte.person: Töne fehlen');
  if (g.person && (pe.token || []).join() !== '--person,--person-text,--person-linie') fehler.push('grundwerte.person: erwartet --person, --person-text, --person-linie');
  for (const q of g.person ? f.quellen || [] : []) {
    const pf = path.join(wurzel, q);
    if (!fs.existsSync(pf)) continue;
    const t = fs.readFileSync(pf, 'utf8');
    for (const ton of pe.toene || []) for (const suf of ['', '-text', '-linie']) { const n = '--' + ton + suf; if (!/^--[a-z0-9-]+$/.test(n) || !deklariert(t, n)) fehler.push(`grundwerte.person: ${n} ist in ${q} nicht deklariert`); }
  }
  // Schicht 2: je Bedeutung mindestens ein Token; Verweis löst in Schicht 1 auf; keine Zahl, kein Farbwert
  const grundNamen = new Set([...farbNamen, ...ABSTAENDE, ...zwischenNamen(g), ...radienNamen(g), '--treffer']);
  const tokens = b.token || [];
  for (const art of BEDEUTUNGEN) if (!tokens.some((t) => t.bedeutung === art)) fehler.push('bedeutung: keine Token für ' + art);
  const gesehen = new Set();
  for (const t of tokens) {
    if (!/^--bedeutung-[a-z-]+$/.test(String(t.token))) fehler.push('bedeutung: Name ' + t.token + ' (erwartet --bedeutung-…)');
    if (gesehen.has(t.token)) fehler.push('bedeutung: doppelter Name ' + t.token);
    gesehen.add(t.token);
    if (!BEDEUTUNGEN.includes(t.bedeutung)) fehler.push('bedeutung: unbekannte Bedeutung ' + t.bedeutung);
    if (!grundNamen.has(t.verweis)) fehler.push(`bedeutung: ${t.token} verweist auf ${t.verweis}, das in Schicht 1 nicht steht`);
    if (Object.keys(t).some((k) => !['bedeutung', 'token', 'verweis'].includes(k))) fehler.push(`bedeutung: ${t.token} trägt mehr als bedeutung, token, verweis (keine Zahl in Schicht 2)`);
    if (!/^--[a-z][a-z0-9-]*$/.test(String(t.verweis))) fehler.push(`bedeutung: ${t.token}: Verweis ist ein Name, kein Wert`);
  }
  // Feldtönung (Schicht 1, AP 2): die hinterlegte Fläche der Felder, hell und nachts; die Werte stehen nur hier
  if (g.feldtoenung !== undefined) {
    const ft = g.feldtoenung || {};
    if (ft.token !== '--feld-toenung') fehler.push('grundwerte.feldtoenung: erwartet --feld-toenung');
    for (const k of ['hell', 'nacht']) if (!/^rgba\(\d{1,3},\d{1,3},\d{1,3},(0|1|0?\.\d+)\)$/.test(String(ft[k]))) fehler.push('grundwerte.feldtoenung.' + k + ': rgba(r,g,b,a)');
  }
  fehler.push(...vorlagenPruefen(def.vorlagen));
  fehler.push(...elementePruefen(def.vorlagen && def.vorlagen.elemente));
  return fehler;
}
/* Schicht 3: je Art ein Eintrag; Werte nur aus Verweisen und 0/none (keine Zahl in Schicht 3). */
const VORLAGE_WERT = /^(?:var\(--[a-z][a-z0-9-]*\)|0|none)(?: (?:var\(--[a-z][a-z0-9-]*\)|0|none))*$/;
const VORLAGE_EIGENSCHAFT = /^[a-z]+(?:-[a-z]+)*$/;
function vorlagenPruefen(v) {
  if (v === undefined) return [];
  const f = [];
  if (!v || typeof v.bereich !== 'string' || !v.bereich.trim()) f.push('vorlagen.bereich fehlt');
  const arten = (v && v.arten) || [];
  if (!Array.isArray(arten) || !arten.length) f.push('vorlagen.arten: Liste fehlt oder leer');
  const gesehen = new Set();
  for (const a of arten) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(String(a.art))) f.push('vorlagen: Name ' + a.art);
    if (gesehen.has(a.art)) f.push('vorlagen: doppelte Art ' + a.art);
    gesehen.add(a.art);
    if (typeof a.selektor !== 'string' || !a.selektor.trim() || /[{}]/.test(a.selektor)) f.push('vorlagen: ' + a.art + ': Selektor fehlt oder trägt Klammern');
    for (const fass of ['regeln', 'hochkontrast']) {
      if (fass === 'hochkontrast' && a[fass] === undefined) continue;
      const rg = a[fass] || {};
      if (!Object.keys(rg).length) f.push('vorlagen: ' + a.art + ': ' + fass + ' leer');
      for (const [k, w] of Object.entries(rg)) {
        if (!VORLAGE_EIGENSCHAFT.test(k)) f.push(`vorlagen: ${a.art}: Eigenschaft ${k}`);
        if (!VORLAGE_WERT.test(String(w))) f.push(`vorlagen: ${a.art}.${k}: „${w}“ ist kein Verweis (keine Zahl in Schicht 3)`);
      }
    }
  }
  return f;
}
function vorlagenBlockBauen(def) {
  const v = def.vorlagen;
  const z = [`  /* ${VORLAGEN_MARKE_ANFANG} — erzeugt aus tools/erscheinung/definition.json (Schicht 3) durch tools/gestaltung-definition.js; nicht von Hand ändern */`];
  const regel = (rg) => Object.entries(rg).map(([k, w]) => `${k}: ${w};`).join(' ');
  for (const a of v.arten) {
    z.push(`  /* ${a.art} */`);
    z.push(`  html:not(.high-contrast) :is(${v.bereich}) :is(${a.selektor}) { ${regel(a.regeln)} }`);
    if (a.hochkontrast) z.push(`  html.high-contrast :is(${v.bereich}) :is(${a.selektor}) { ${regel(a.hochkontrast)} }`);
  }
  z.push(`  /* ${VORLAGEN_MARKE_ENDE} */`);
  return z.join('\n');
}
function vorlagenRegion(css) {
  const a = css.indexOf(VORLAGEN_MARKE_ANFANG); const e = css.indexOf(VORLAGEN_MARKE_ENDE);
  if (a < 0 || e < a) return null;
  return { von: css.lastIndexOf('\n', a) + 1, bis: css.indexOf('\n', e) < 0 ? css.length : css.indexOf('\n', e) };
}
function vorlagenEinsetzen(css, def) {
  if (!def.vorlagen) return css;
  const block = vorlagenBlockBauen(def);
  const r = vorlagenRegion(css);
  if (r) return css.slice(0, r.von) + block + css.slice(r.bis);
  const d = blockRegion(css);
  if (!d) throw new Error('Einfügestelle für ' + VORLAGEN_MARKE_ANFANG + ' (nach ' + MARKE_ENDE + ') nicht gefunden');
  return css.slice(0, d.bis) + '\n' + block + css.slice(d.bis);
}
function vorlagenPruefenImCss(css, def) {
  if (!def.vorlagen) return [];
  const r = vorlagenRegion(css);
  if (!r) return ['Block ' + VORLAGEN_MARKE_ANFANG + ' fehlt'];
  return css.slice(r.von, r.bis) === vorlagenBlockBauen(def) ? [] : ['Block der Formatvorlagen weicht von der Definition ab (neu erzeugen mit --schreiben)'];
}

/* Elementarten (AP 2 Wagen 3, 24.11.2026): je Art eine Regel, die der Erzeuger an ihre Stelle in der Stilquelle schreibt —
   in die Zeile direkt nach der Marke „GESTALTUNG-ELEMENT:<art>“. Die Marke steht dort, wo die Regel vorher stand, damit die
   Kaskade gleich bleibt (Abwandlungen weiter unten gewinnen wie bisher). Werte: Verweise, 0, none und die Schlüsselwörter unten;
   als Maß nur die Haarlinie 1px/2px. Lage und Abstand nach außen bleiben bei der Stelle. */
const ELEMENT_TEIL = '(?:var\\(--[a-z][a-z0-9-]*\\)|0|none|transparent|inherit|normal|solid|pointer|1px|2px)';
const ELEMENT_WERT = new RegExp('^' + ELEMENT_TEIL + '(?: ' + ELEMENT_TEIL + ')*$');
const ELEMENT_MARKE = (art) => '/* GESTALTUNG-ELEMENT:' + art + ' — erzeugt aus tools/erscheinung/definition.json (vorlagen.elemente); nicht von Hand ändern */';
function elementePruefen(el) {
  if (el === undefined) return [];
  const f = [];
  if (!Array.isArray(el) || !el.length) return ['vorlagen.elemente: Liste fehlt oder leer'];
  const gesehen = new Set();
  for (const e of el) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(e.art))) f.push('elemente: Name ' + e.art);
    if (gesehen.has(e.art)) f.push('elemente: doppelte Art ' + e.art);
    gesehen.add(e.art);
    if (e.basis !== undefined && !el.some((x) => x.art === e.basis && x.basis === undefined)) f.push('elemente: ' + e.art + ': basis ' + e.basis + ' fehlt oder ist selbst Abwandlung');
    if (!_vdKlasse(e)) f.push('elemente: ' + e.art + ': braucht genau eine Klasse .vd-*');
    if (typeof e.selektor !== 'string' || !e.selektor.trim() || /[{}]/.test(e.selektor)) f.push('elemente: ' + e.art + ': Selektor fehlt oder trägt Klammern');
    const rg = e.regeln || {};
    if (!Object.keys(rg).length) f.push('elemente: ' + e.art + ': regeln leer');
    for (const [k, w] of Object.entries(rg)) {
      if (!VORLAGE_EIGENSCHAFT.test(k)) f.push(`elemente: ${e.art}: Eigenschaft ${k}`);
      if (!ELEMENT_WERT.test(String(w))) f.push(`elemente: ${e.art}.${k}: „${w}“ ist kein Verweis (keine Zahl außer der Haarlinie)`);
    }
  }
  return f;
}
/* Eine Abwandlung (`basis: <art>`) trägt nur, was sie ändert; ihre .vd-Klasse steht darum mit in der Regel der Basis. */
const _vdKlasse = (e) => { const k = String(e.selektor).match(/\.vd-[a-z0-9-]+/g) || []; return k.length === 1 ? k[0] : null; };
function _mitAbwandlungen(e, alle) { const ab = (alle || []).filter((x) => x.basis === e.art).map(_vdKlasse).filter(Boolean); return ab.length ? e.selektor + ', ' + ab.join(', ') : e.selektor; }
function elementZeile(e, alle) { return '  ' + _mitAbwandlungen(e, alle) + ' { ' + Object.entries(e.regeln).map(([k, w]) => `${k}: ${w};`).join(' ') + ' }'; }
function elementeEinsetzen(css, def) {
  const el = def.vorlagen && def.vorlagen.elemente;
  if (!el) return css;
  const z = css.split('\n');
  for (const e of el) {
    const m = ELEMENT_MARKE(e.art);
    const i = z.findIndex((x) => x.trim() === m);
    if (i < 0) throw new Error('Marke fehlt: ' + m);
    z[i + 1] = elementZeile(e, el);
  }
  return z.join('\n');
}
function elementePruefenImCss(css, def) {
  const el = def.vorlagen && def.vorlagen.elemente;
  if (!el) return [];
  const z = css.split('\n'); const f = [];
  for (const e of el) {
    const m = ELEMENT_MARKE(e.art);
    const treffer = z.reduce((n, x) => n + (x.trim() === m ? 1 : 0), 0);
    if (treffer !== 1) { f.push(`Element ${e.art}: Marke ${treffer}-mal statt einmal`); continue; }
    const i = z.findIndex((x) => x.trim() === m);
    if (z[i + 1] !== elementZeile(e, el)) f.push(`Element ${e.art}: Regel weicht von der Definition ab (neu erzeugen mit --schreiben)`);
  }
  return f;
}

/* Gebackener Block VD-FORMATE (Weisung 24.11.2026 „Wir bauen modular – also bauen wir einmal“): Token und Regeln je Elementart
   als selbsttragendes Stück, für Oberflächen außerhalb des Kerns (Lese-App, Studio, Register). Er hängt an genau einer
   Wurzelklasse (Vorgabe `.vd-formate`) und an den Klassen .vd-* aus der Definition, an keinem Selektor der Anwendung. Die Werte
   kommen aus dem gebauten Erscheinungsbild-Modul (Vorgabe: Profil dummy, das alle Produkte beziehen): :root und html.dark-mode des
   Moduls und seiner Stilsätze, dazu die Handy-Fassung (@media max-width 767px). Nur Token, die eine Regel braucht, samt deren
   Abhängigkeiten. Schrift: der Block nennt die Familie; die Schriftdatei lädt die Oberfläche selbst. */
const { zerlegen: _zerlegen, deklarationen: _dekl } = require('./lib/css-zerlegen.js');
function _tokenSammeln(css, ziel) {
  for (const t of _zerlegen(css)) {
    if (t.art === 'regel') {
      const sel = t.selektor.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      const ebene = sel === ':root' ? 'hell' : ((sel === 'html.dark-mode' || sel === ':root.dark-mode') ? 'dunkel' : null);
      if (!ebene) continue;
      for (const d of _dekl(t.innen)) { const m = /^(--[a-z0-9-]+)\s*:\s*([\s\S]+)$/i.exec(d); if (m) ziel[ebene][m[1]] = m[2].trim(); }
    } else if (t.art === 'at-block' && t.name === 'media' && /max-width:\s*767px/.test(t.kopf)) {
      const innen = { hell: {}, dunkel: {} }; _tokenSammeln(t.innen, innen); Object.assign(ziel.handy, innen.hell);
    } else if (t.art === 'at-block' && (t.name === 'layer' || t.name === 'supports')) _tokenSammeln(t.innen, ziel);
  }
}
const _verweise = (w) => [...String(w).matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]);
function formatePruefen(def) {
  if (!fs.existsSync(FORMATE)) return ['VD-FORMATE fehlt: ' + path.relative(REPO, FORMATE) + ' (erzeugen mit --schreiben)'];
  return fs.readFileSync(FORMATE, 'utf8') === vorlagenBacken({ def }) ? [] : ['VD-FORMATE weicht von Definition oder Modul ab (neu erzeugen mit --schreiben)'];
}
function vorlagenBacken({ def = definitionLaden(), modul = path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-dummy-modul.json'), wurzel = '.vd-formate' } = {}) {
  if (!/^\.[a-z][a-z0-9-]*$/.test(wurzel)) throw new Error('Wurzelklasse ungültig: ' + wurzel);
  const m = typeof modul === 'string' ? JSON.parse(fs.readFileSync(modul, 'utf8')) : modul;
  const tok = { hell: Object.assign({}, m.basis), dunkel: Object.assign({}, m.dunkel), handy: {} };
  for (const css of Object.values(m.stil || {})) _tokenSammeln(css, tok);
  const regeln = [];
  for (const a of def.vorlagen.arten) { if (!a.klasse) throw new Error('vorlagen.arten: ' + a.art + ' ohne klasse'); regeln.push({ art: a.art, sel: a.klasse, r: a.regeln }); }
  for (const e of def.vorlagen.elemente || []) {
    const ab = (def.vorlagen.elemente || []).filter((x) => x.basis === e.art).map(_vdKlasse);
    regeln.push({ art: e.art, sel: ab.length ? ':is(' + [_vdKlasse(e), ...ab].join(', ') + ')' : _vdKlasse(e), r: e.regeln });
  }
  const noetig = new Set(); const offen = [];
  for (const g of regeln) for (const w of Object.values(g.r)) offen.push(..._verweise(w));
  while (offen.length) {
    const n = offen.pop(); if (noetig.has(n)) continue; noetig.add(n);
    for (const ebene of ['hell', 'dunkel', 'handy']) if (tok[ebene][n] != null) offen.push(..._verweise(tok[ebene][n]));
  }
  const fehlt = [...noetig].filter((n) => tok.hell[n] == null);
  if (fehlt.length) throw new Error('VD-FORMATE: Token ohne Wert im Modul: ' + fehlt.join(', '));
  const liste = (ebene) => [...noetig].sort().filter((n) => tok[ebene][n] != null && (ebene === 'hell' || tok[ebene][n] !== tok.hell[n])).map((n) => `${n}: ${tok[ebene][n]};`).join(' ');
  const z = [`/* VD-FORMATE — gebacken aus tools/erscheinung/definition.json (vorlagen) und ${m.id ? 'Erscheinungsbild ' + m.id : 'dem Erscheinungsbild-Modul'} durch tools/gestaltung-definition.js --backen; nicht von Hand ändern */`];
  z.push(`${wurzel} { ${liste('hell')} }`);
  const h = liste('handy'); if (h) z.push(`@media (max-width: 767px) { ${wurzel} { ${h} } }`);
  const d = liste('dunkel'); if (d) z.push(`html.dark-mode ${wurzel}, ${wurzel}.vd-dunkel { ${d} }`);
  for (const g of regeln) z.push(`${wurzel} ${g.sel} { ${Object.entries(g.r).map(([k, w]) => `${k}: ${w};`).join(' ')} }`);
  return z.join('\n') + '\n';
}

/* ── Größenleiter des Stilsatzes dummy: Block bauen, schreiben, prüfen ─────────────────────────────────────── */
function leiterBlockBauen(leiter = JSON.parse(fs.readFileSync(LEITER, 'utf8')), profil = 'dummy') {
  const pr = leiter.profile && leiter.profile[profil];
  if (!pr) throw new Error('Größenleiter: Profil fehlt: ' + profil);
  const basis = leiter.basis_px_je_rem || 16;
  const rem = (px) => zahlText(px / basis) + 'rem';
  const namen = leiter.stufen.map((s) => s.stufe);
  const fehlt = namen.filter((n) => !pr.stufen[n]); if (fehlt.length) throw new Error('Größenleiter Profil ' + profil + ': Stufen fehlen: ' + fehlt.join(', '));
  const t = (s) => (n) => `${leiter.token_praefix}${n}: ${rem(pr.stufen[n][s])};`;
  const desktop = namen.map(t(0)).join(' ');
  const mobil = namen.filter((n) => pr.stufen[n][1] !== pr.stufen[n][0]).map(t(1)).join(' ');
  return [
    `/* ${LEITER_MARKE_ANFANG} — erzeugt aus tools/groessenleiter.json (profile.${profil}) durch tools/gestaltung-definition.js; nicht von Hand ändern */`,
    `:root { ${desktop} }`,
    `@media (max-width: ${leiter.umbruch_px - 1}px) { :root { ${mobil} } }`,
    `/* ${LEITER_MARKE_ENDE} */`,
  ].join('\n');
}
function leiterBlockRegion(css) {
  const a = css.indexOf(LEITER_MARKE_ANFANG); const e = css.indexOf(LEITER_MARKE_ENDE);
  if (a < 0 || e < a) return null;
  const von = css.lastIndexOf('\n', a) + 1; const bis = css.indexOf('\n', e) < 0 ? css.length : css.indexOf('\n', e);
  return { von, bis };
}
function leiterBlockPruefen(css, leiter) {
  const r = leiterBlockRegion(css);
  if (!r) return ['Block ' + LEITER_MARKE_ANFANG + ' fehlt in stil/dummy.css'];
  return css.slice(r.von, r.bis) === leiterBlockBauen(leiter) ? [] : ['Größenleiter-Block des Stilsatzes dummy weicht von tools/groessenleiter.json ab (neu erzeugen mit --schreiben)'];
}

/* ── Zeichen: Prüfung und Einbettung als data-URL ─────────────────────────────────────────────────────────── */
function zeichenSvgPruefen(token, svg) {
  const s = String(svg || '');
  const f = [];
  if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24"[^>]*>[\s\S]*<\/svg>$/.test(s)) f.push('grundwerte.zeichen: ' + token + ' ist kein SVG mit viewBox 0 0 24 24');
  if (/<script|<foreignObject|\son[a-z]+\s*=|href\s*=|url\(|<image/i.test(s)) f.push('grundwerte.zeichen: ' + token + ' trägt Skript, Ereignis oder Verweis');
  return f;
}
function zeichenDataUrl(svg) {
  return 'url("data:image/svg+xml,' + String(svg).replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E') + '")';
}

/* ── Block bauen ──────────────────────────────────────────────────────────────────────────────────────────── */
function zahlText(n) { return String(Math.round(n * 10000) / 10000); }
function blockBauen(def, wurzel = REPO) {
  const g = def.grundwerte;
  let basis = 16;
  try { basis = JSON.parse(fs.readFileSync(path.join(wurzel, g.schriftgroessen.verweis), 'utf8')).basis_px_je_rem || 16; } catch (e) { /* Standardbasis */ }
  const abstand = [...g.abstaende.stufen, ...(g.abstaende.zwischen || [])].map((s) => `${s.token}: ${g.abstaende.einheit === 'rem' ? zahlText(s.px / basis) + 'rem' : s.px + 'px'};`);
  const radius = g.radien.map((r) => `${r.token}: ${r.wert};`);
  const zeilen = [
    `  /* ${MARKE_ANFANG} — erzeugt aus tools/erscheinung/definition.json durch tools/gestaltung-definition.js; nicht von Hand ändern */`,
    '  :root {',
    '    ' + abstand.join(' '),
    '    ' + radius.join(' '),
    `    ${g.treffer.token}: ${g.treffer.wert};`,
    ...Object.keys(GRUPPEN).filter((k) => g[k]).map((k) => '    ' + g[k].map((e) => `${e.token}: ${e.wert};`).join(' ')),
    ...(g.masse ? ['    ' + g.masse.map((m) => `${m.token}: ${m.wert};`).join(' ')] : []),
    ...(g.zeichen ? g.zeichen.map((z) => `    ${z.token}: ${zeichenDataUrl(z.svg)};`) : []),
    ...(g.feldtoenung ? [`    ${g.feldtoenung.token}: ${g.feldtoenung.hell};`] : []),
    '  }',
    ...(g.feldtoenung ? [`  :root.dark-mode { ${g.feldtoenung.token}: ${g.feldtoenung.nacht}; }`] : []),
    `  /* ${MARKE_ENDE} */`,
  ];
  return zeilen.join('\n');
}
function blockRegion(css) {
  const a = css.indexOf(MARKE_ANFANG);
  const e = css.indexOf(MARKE_ENDE);
  if (a < 0 || e < a) return null;
  const von = css.lastIndexOf('\n', a) + 1;
  const bis = css.indexOf('\n', e) < 0 ? css.length : css.indexOf('\n', e);
  return { von, bis };
}
function blockEinsetzen(css, block) {
  const r = blockRegion(css);
  if (r) return css.slice(0, r.von) + block + css.slice(r.bis);
  const m = EINSETZEN_NACH.exec(css);
  if (!m) throw new Error('Einfügestelle (Ende der Größenleiter) nicht gefunden und keine Marke ' + MARKE_ANFANG);
  const ende = m.index + m[0].length;
  return css.slice(0, ende) + '\n' + block + css.slice(ende);
}
function blockPruefen(css, def, wurzel = REPO) {
  const r = blockRegion(css);
  if (!r) return ['Block ' + MARKE_ANFANG + ' fehlt'];
  const ist = css.slice(r.von, r.bis);
  return ist === blockBauen(def, wurzel) ? [] : ['Block weicht von der Definition ab (neu erzeugen mit --schreiben)'];
}

/* ── ADR-Prüfsumme ────────────────────────────────────────────────────────────────────────────────────────── */
function adrDatei(ordner = ADR_ORDNER) {
  const d = fs.existsSync(ordner) ? fs.readdirSync(ordner).filter((n) => ADR_MUSTER.test(n)) : [];
  return d.length === 1 ? path.join(ordner, d[0]) : null;
}
function adrPruefsumme(adrPfad) {
  const m = /^definition-pruefsumme:\s*([0-9a-f]{64})\s*$/m.exec(fs.readFileSync(adrPfad, 'utf8'));
  return m ? m[1] : null;
}
function adrPruefen(defPfad = DEFINITION, adrPfad = adrDatei()) {
  if (!adrPfad) return ['ADR „Gestaltungsdefinition: eine Quelle“ nicht gefunden (genau eine Datei erwartet)'];
  const soll = adrPruefsumme(adrPfad);
  if (!soll) return ['ADR trägt keine Zeile „definition-pruefsumme: <hex>“'];
  const ist = pruefsumme(defPfad);
  return soll === ist ? [] : [`Prüfsumme der Definition ${ist} ≠ ADR ${soll}: Nachtrag in der ADR und neue Prüfsumme`];
}

/* ── Aufrufe ──────────────────────────────────────────────────────────────────────────────────────────────── */
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
function main() {
  const defPfad = arg('--definition') || DEFINITION;
  const cssPfad = arg('--css') || GRUNDLAGE;
  if (process.argv.includes('--schreiben')) {
    const def = definitionLaden(defPfad);
    const f = definitionPruefen(def);
    if (f.length) { console.error(f.join('\n')); process.exit(1); }
    const neu = elementeEinsetzen(vorlagenEinsetzen(blockEinsetzen(fs.readFileSync(cssPfad, 'utf8'), blockBauen(def)), def), def);
    fs.writeFileSync(cssPfad, neu);
    console.log('Block geschrieben: ' + path.relative(REPO, cssPfad));
    if (!arg('--css')) { fs.writeFileSync(FORMATE, vorlagenBacken({ def })); console.log('VD-FORMATE geschrieben: ' + path.relative(REPO, FORMATE)); }
    if (!arg('--css') && fs.existsSync(DUMMY_STIL)) {
      const dc = fs.readFileSync(DUMMY_STIL, 'utf8'); const r = leiterBlockRegion(dc);
      if (r) { fs.writeFileSync(DUMMY_STIL, dc.slice(0, r.von) + leiterBlockBauen() + dc.slice(r.bis)); console.log('Größenleiter-Block geschrieben: ' + path.relative(REPO, DUMMY_STIL)); }
    }
    return;
  }
  if (process.argv.includes('--backen')) {
    const block = vorlagenBacken({ def: definitionLaden(defPfad), wurzel: arg('--wurzel') || '.vd-formate', modul: arg('--modul') || undefined });
    if (arg('--ziel')) { fs.writeFileSync(arg('--ziel'), block); console.error('VD-FORMATE geschrieben: ' + arg('--ziel')); } else process.stdout.write(block);
    return;
  }
  if (process.argv.includes('--check')) {
    const def = definitionLaden(defPfad);
    const fehler = [...definitionPruefen(def), ...blockPruefen(fs.readFileSync(cssPfad, 'utf8'), def), ...vorlagenPruefenImCss(fs.readFileSync(cssPfad, 'utf8'), def), ...elementePruefenImCss(fs.readFileSync(cssPfad, 'utf8'), def), ...(arg('--css') || !fs.existsSync(DUMMY_STIL) ? [] : leiterBlockPruefen(fs.readFileSync(DUMMY_STIL, 'utf8'))), ...adrPruefen(defPfad, arg('--adr') || adrDatei()), ...(arg('--css') ? [] : formatePruefen(def))];
    if (fehler.length) { console.error('ROT:\n' + fehler.map((x) => '  ' + x).join('\n')); process.exit(1); }
    console.log('gestaltung-definition: grün (Definition, Block, ADR-Prüfsumme)');
    return;
  }
  // ohne Argument: Selbstprobe gegen die Fixtures
  const def = definitionLaden(path.join(FIXTURES, 'definition-gut.json'));
  const gut = fs.readFileSync(path.join(FIXTURES, 'grundlage-gut.css'), 'utf8');
  const schief = fs.readFileSync(path.join(FIXTURES, 'grundlage-schief.css'), 'utf8');
  const a = [...definitionPruefen(def, FIXTURES), ...blockPruefen(gut, def, FIXTURES)];
  const b = blockPruefen(schief, def, FIXTURES);
  console.log('Fixture gut:    ' + (a.length ? 'ROT ' + a.join('; ') : 'grün (erwartet)'));
  console.log('Fixture schief: ' + (b.length ? 'rot (erwartet)' : 'GRÜN (unerwartet)'));
  process.exit(a.length === 0 && b.length > 0 ? 0 : 1);
}

module.exports = { formatePruefen, FORMATE, vorlagenBacken, elementePruefen, elementeEinsetzen, elementePruefenImCss, elementZeile, ELEMENT_MARKE, vorlagenPruefen, vorlagenBlockBauen, vorlagenEinsetzen, vorlagenPruefenImCss, VORLAGEN_MARKE_ANFANG, VORLAGEN_MARKE_ENDE, zeichenSvgPruefen, zeichenDataUrl, leiterBlockBauen, leiterBlockPruefen, definitionLaden, definitionPruefen, blockBauen, blockEinsetzen, blockPruefen, blockRegion, pruefsumme, adrDatei, adrPruefsumme, adrPruefen,
  DEFINITION, GRUNDLAGE, FIXTURES, MARKE_ANFANG, MARKE_ENDE };
if (require.main === module) main();
