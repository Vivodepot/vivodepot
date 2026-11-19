#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   gestaltung-definition.js — Erzeuger und Prüfer der Gestaltungsdefinition (Stufe 1)
   ────────────────────────────────────────────────────────────────────────────
   Die Definition `tools/erscheinung/definition.json` hat zwei Schichten:
     grundwerte  Schicht 1: Schriftgrößen (Verweis auf tools/groessenleiter.json), sechs Abstände, drei Radien,
                 Trefferfläche, optional benannte Maße des Aufbaus (--mass-…), zwei Umbruchpunkte, Farben (Verweis auf Custom Properties der Stil-Dateien).
     bedeutung   Schicht 2: Token nach der Bedeutung (Fläche, Text, Linie, Aktion, Warnung, Herkunft), je mit
                 Verweis auf einen Grundwert. Keine Zahl, kein Farbwert.
   Jede Zahl steht nur in Schicht 1.

   Dieses Werkzeug schreibt aus Schicht 1 einen markierten Block in `tools/erscheinung/stil/grundlage.css`
   (--abstand-1 … --abstand-6, --radius-klein, --radius-gross, --radius-rund, --treffer) zwischen
   `GESTALTUNG-DEFINITION:BEGIN` und `GESTALTUNG-DEFINITION:END`. Bestehende Regeln stellt es NICHT um.
   Schicht 2 wird in dieser Stufe nur geprüft (Verweise lösen auf), nicht ins CSS geschrieben.

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

const ABSTAENDE = ['--abstand-1', '--abstand-2', '--abstand-3', '--abstand-4', '--abstand-5', '--abstand-6'];
const RADIEN = ['--radius-klein', '--radius-gross', '--radius-rund'];
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
  // Abstände: genau sechs, in der Reihenfolge, aufsteigend
  const st = (g.abstaende && g.abstaende.stufen) || [];
  if (st.map((s) => s.token).join() !== ABSTAENDE.join()) fehler.push('grundwerte.abstaende: erwartet ' + ABSTAENDE.join(', '));
  if (st.some((s, i) => !Number.isFinite(s.px) || s.px <= 0 || (i && s.px <= st[i - 1].px))) fehler.push('grundwerte.abstaende: px positiv und aufsteigend');
  if (!g.abstaende || !['rem', 'px'].includes(g.abstaende.einheit)) fehler.push('grundwerte.abstaende.einheit: rem oder px');
  // Radien, Treffer
  const rd = g.radien || [];
  if (rd.map((r) => r.token).join() !== RADIEN.join()) fehler.push('grundwerte.radien: erwartet ' + RADIEN.join(', '));
  if (rd.some((r) => !/^\d+(\.\d+)?px$/.test(String(r.wert)))) fehler.push('grundwerte.radien: Wert in px');
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
  const grundNamen = new Set([...farbNamen, ...ABSTAENDE, ...RADIEN, '--treffer']);
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
  return fehler;
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
  const abstand = g.abstaende.stufen.map((s) => `${s.token}: ${g.abstaende.einheit === 'rem' ? zahlText(s.px / basis) + 'rem' : s.px + 'px'};`);
  const radius = g.radien.map((r) => `${r.token}: ${r.wert};`);
  const zeilen = [
    `  /* ${MARKE_ANFANG} — erzeugt aus tools/erscheinung/definition.json durch tools/gestaltung-definition.js; nicht von Hand ändern */`,
    '  :root {',
    '    ' + abstand.join(' '),
    '    ' + radius.join(' '),
    `    ${g.treffer.token}: ${g.treffer.wert};`,
    ...(g.masse ? ['    ' + g.masse.map((m) => `${m.token}: ${m.wert};`).join(' ')] : []),
    ...(g.zeichen ? g.zeichen.map((z) => `    ${z.token}: ${zeichenDataUrl(z.svg)};`) : []),
    '  }',
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
    const neu = blockEinsetzen(fs.readFileSync(cssPfad, 'utf8'), blockBauen(def));
    fs.writeFileSync(cssPfad, neu);
    console.log('Block geschrieben: ' + path.relative(REPO, cssPfad));
    if (!arg('--css') && fs.existsSync(DUMMY_STIL)) {
      const dc = fs.readFileSync(DUMMY_STIL, 'utf8'); const r = leiterBlockRegion(dc);
      if (r) { fs.writeFileSync(DUMMY_STIL, dc.slice(0, r.von) + leiterBlockBauen() + dc.slice(r.bis)); console.log('Größenleiter-Block geschrieben: ' + path.relative(REPO, DUMMY_STIL)); }
    }
    return;
  }
  if (process.argv.includes('--check')) {
    const def = definitionLaden(defPfad);
    const fehler = [...definitionPruefen(def), ...blockPruefen(fs.readFileSync(cssPfad, 'utf8'), def), ...(arg('--css') || !fs.existsSync(DUMMY_STIL) ? [] : leiterBlockPruefen(fs.readFileSync(DUMMY_STIL, 'utf8'))), ...adrPruefen(defPfad, arg('--adr') || adrDatei())];
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

module.exports = { zeichenSvgPruefen, zeichenDataUrl, leiterBlockBauen, leiterBlockPruefen, definitionLaden, definitionPruefen, blockBauen, blockEinsetzen, blockPruefen, blockRegion, pruefsumme, adrDatei, adrPruefsumme, adrPruefen,
  DEFINITION, GRUNDLAGE, FIXTURES, MARKE_ANFANG, MARKE_ENDE };
if (require.main === module) main();
