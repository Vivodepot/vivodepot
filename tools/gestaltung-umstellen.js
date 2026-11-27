#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   gestaltung-umstellen.js — stellt freie Längen der Stilquelle auf die Token der Gestaltungsdefinition um
   ────────────────────────────────────────────────────────────────────────────
   Quelle der Token: tools/erscheinung/definition.json (Schicht 1): --abstand-1…6 (4/8/12/16/24/32 px), Radienreihe --radius-1 … (px) und --radius-rund
   --treffer (Wert in der Definition). Gezählt wird mit tools/gestaltung-freie-werte.js (derselbe Maskierer: Kommentare und der erzeugte
   Block GESTALTUNG-DEFINITION sind ausgenommen). Das Werkzeug ändert nur Werte hinter padding*, margin*, gap, row-gap, column-gap,
   min-height, min-width (Treffer) und border-*radius; Werte in var(…) und negative Werte fasst es nicht an.

   MODI
     --exakt                    Wagen 1, Bild unverändert. Ersetzt NUR, wo der Wert dem Token genau entspricht:
                                padding/margin/gap/min-height: 4/8/12/16/24/32 px (und 0.25/0.5/0.75/1/1.5/2 rem) → var(--abstand-N);
                                border-radius: px-Wert der Radienreihe → var(--radius-<n>/-rund); min-height/min-width gleich dem Trefferwert → var(--treffer).
                                Dazu in den Profilen: --space-N: <rem> → --space-N: var(--abstand-N), wo der Wert gleich ist.
     --angleichen               Wagen 2, nur Liste (Datei/Zeile, alt → Token, Pixeldifferenz), ändert nichts.
     --angleichen --schreiben   setzt Off-Raster-Werte auf das nächstliegende Token (bei Gleichstand das größere); Radien auf
                                klein/gross/rund; Mindest-Trefferfläche 36–56 px auf var(--treffer); in den Profilen --radius-sm/-md/-lg/-pill
                                und --ziel auf das nächstliegende Token. Nicht angefasst, aber gelistet: Werte über 32 px (Abstand),
                                negative Werte, Prozent- und em/ch-Längen.
   Optionen: --css <pfad>   Gegenstand (Vorgabe: tools/erscheinung/stil/grundlage.css)
             --profil <pfad[,pfad]>   Profil-Dateien für --space-N und die Profil-Token (Vorgabe: heute.css und salbei-glas.css in tools/erscheinung)
             --definition <pfad>      --trocken (bei --exakt: nur zählen)
   Ohne Argument: Selbstprobe gegen die Fixtures im Repo. Danach neu erzeugen: erscheinungsbild-modul.js (beide Profile),
   csp-bauen, landung-vorbereiten --nur-erzeugen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const w = require('./gestaltung-freie-werte.js');

const REPO = path.join(__dirname, '..');
const FIXTURES = w.FIXTURES;
const PROFILE = [path.join(REPO, 'tools', 'erscheinung', 'heute.css'), path.join(REPO, 'tools', 'erscheinung', 'salbei-glas.css')];
const PX_JE_REM = 16;

function tokensLaden(def) {
  const g = def.grundwerte;
  return {
    abstand: g.abstaende.stufen.map((s) => ({ token: s.token, px: s.px })),
    radius: g.radien.filter((r) => /px$/.test(String(r.wert))).map((r) => ({ token: r.token, px: parseFloat(r.wert) })),
    treffer: { token: g.treffer.token, px: parseFloat(g.treffer.wert) },
  };
}

/* var(…) (auch verschachtelt) zu Leerzeichen maskieren, Länge bleibt: so liegen Treffer nie in einem var-Aufruf. */
function ohneVarMaske(wert) {
  let s = wert;
  for (let i = 0; i < 6; i++) { const n = s.replace(/var\([^()]*\)/g, (k) => ' '.repeat(k.length)); if (n === s) break; s = n; }
  return s;
}
const LAENGE = /(?<![\w.#\-])(\d*\.?\d+)(px|rem|em|ch|%)(?![\w%])/g;
function pxVon(zahl, einheit) { return einheit === 'px' ? zahl : einheit === 'rem' ? zahl * PX_JE_REM : null; }

function artVon(name) {
  if (/^padding(-[a-z]+)*$/.test(name) || /^margin(-[a-z]+)*$/.test(name) || /^(row-|column-)?gap$/.test(name)) return 'abstand';
  if (/^border(-[a-z]+)*-radius$|^border-radius$/.test(name)) return 'radius';
  if (name === 'min-height' || name === 'min-width') return 'treffer';
  return null;
}

/* Alle Deklarationen mit Eigenschaft, Wertbereich (Position im Original) und Zeile. */
function deklarationen(css) {
  const t = w.maskieren(css);
  const starts = []; { let p = 0; starts.push(0); for (; p < t.length; p++) if (t.charCodeAt(p) === 10) starts.push(p + 1); }
  const zeile = (pos) => { let lo = 0; let hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
  const re = /(?:^|[{;\s])((?:padding|margin|gap|row-gap|column-gap|border|min-height|min-width)[a-z-]*)(\s*:\s*)([^;{}]*)/g;
  const aus = []; let m;
  while ((m = re.exec(t))) {
    const name = m[1]; const art = artVon(name);
    if (!art) continue;
    const von = m.index + m[0].length - m[3].length;
    aus.push({ name, art, von, bis: von + m[3].length, wert: m[3], zeile: zeile(von), t });
  }
  return { aus, zeile };
}

/* Ein Längenstück bewerten. Rückgabe: { token, px, diff, exakt } oder { grund } (nicht angefasst). */
function bewerten(art, name, zahl, einheit, tok) {
  if (einheit === '%') return { grund: 'Prozent' };
  const px = pxVon(zahl, einheit);
  if (px === null) return { grund: einheit };
  if (px === 0) return { grund: 'null' };
  if (art === 'abstand' || (art === 'treffer' && !(px >= w_TREFFER_VON && px <= w_TREFFER_BIS))) {
    if (art === 'treffer') {
      // min-height/min-width außerhalb 36–56 px: eine Höhe oder Breite, kein Abstand; ein Abstandstoken ist keine Höhe (Review 13.11.)
      return { grund: 'Höhe, kein Abstand' };
    }
    const e = tok.abstand.find((s) => s.px === px);
    if (e) return { token: e.token, px, diff: 0, exakt: true };
    if (px > 32) return { grund: 'über 32 px' };
    let best = null;
    for (const s of tok.abstand) {
      const d = Math.abs(s.px - px);
      if (!best || d < best.d || (d === best.d && s.px > best.s.px)) best = { s, d };
    }
    return { token: best.s.token, px, diff: best.d, exakt: false };
  }
  if (art === 'treffer') {
    return { token: tok.treffer.token, px, diff: Math.abs(tok.treffer.px - px), exakt: px === tok.treffer.px };
  }
  // Radius
  if (einheit !== 'px') return { grund: einheit };
  let best = null;
  for (const r of tok.radius) {
    const d = Math.abs(r.px - px);
    if (!best || d < best.d || (d === best.d && r.px > best.r.px)) best = { r, d };
  }
  return { token: best.r.token, px, diff: best.d, exakt: best.d === 0 };
}
const w_TREFFER_VON = 36; const w_TREFFER_BIS = 56;

/* Alle Ersetzungen für eine Stilquelle. modus 'exakt' | 'angleichen'. */
function ersetzungen(css, tok, modus) {
  const { aus } = deklarationen(css);
  const treffer = []; const offen = [];
  for (const d of aus) {
    const maske = ohneVarMaske(d.wert);
    let m; LAENGE.lastIndex = 0;
    while ((m = LAENGE.exec(maske))) {
      // negative Werte (`-` davor) schließt der Lookbehind schon aus; Leerzeichen-Minus in calc steht als Operator davor, das ist erlaubt
      const b = bewerten(d.art, d.name, parseFloat(m[1]), m[2], tok);
      const pos = d.von + m.index;
      const eintrag = { zeile: d.zeile, eigenschaft: d.name, alt: m[0], pos, laenge: m[0].length };
      if (b.grund) { if (b.grund !== 'null') offen.push({ ...eintrag, grund: b.grund }); continue; }
      if (modus === 'exakt' && !b.exakt) continue;
      if (b.exakt || modus === 'angleichen') treffer.push({ ...eintrag, neu: `var(${b.token})`, diff: b.diff, exakt: b.exakt });
    }
    // negative Längen melden (Angleichen fasst sie nicht an)
    if (modus === 'angleichen') {
      for (const n of maske.matchAll(/(?<![\w.#])-(\d*\.?\d+)(px|rem)\b/g)) offen.push({ zeile: d.zeile, eigenschaft: d.name, alt: '-' + n[1] + n[2], grund: 'negativ' });
    }
  }
  return { treffer, offen };
}
function anwenden(css, liste) {
  let aus = css;
  for (const e of [...liste].sort((a, b) => b.pos - a.pos)) aus = aus.slice(0, e.pos) + e.neu + aus.slice(e.pos + e.laenge);
  return aus;
}

/* Profil-Token: --space-N (nur bei Gleichheit, Modus exakt) und, beim Angleichen, --radius-sm/-md/-lg/-pill und --ziel. */
function profilErsetzungen(css, tok, modus) {
  /* Modul-Profile dürfen nicht auf Kern-Token verweisen (Regeln des Kerns: unbekannter-verweis) — ihre Werte bleiben Zahlen. */
  if (!(process.env.VD_PROFIL_ALIAS === '1')) return [];
  const t = w.maskieren(css);
  const liste = []; const lines = [0]; for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) === 10) lines.push(i + 1);
  const zeile = (pos) => { let n = 1; for (let i = 0; i < lines.length; i++) if (lines[i] <= pos) n = i + 1; return n; };
  const re = /(--(?:space-(\d)|radius-(sm|md|lg|pill)|ziel))(\s*:\s*)(\d*\.?\d+)(px|rem)(?=\s*[;}\s])/g;
  let m;
  while ((m = re.exec(t))) {
    const px = pxVon(parseFloat(m[5]), m[6]);
    const pos = m.index + m[0].length - (m[5] + m[6]).length;
    const e = { zeile: zeile(pos), eigenschaft: m[1], alt: m[5] + m[6], pos, laenge: (m[5] + m[6]).length };
    if (m[2]) {
      const s = tok.abstand[+m[2] - 1];
      if (s && s.px === px) liste.push({ ...e, neu: `var(${s.token})`, diff: 0, exakt: true });
    } else if (modus === 'angleichen') {
      if (m[3]) {
        let best = null; for (const r of tok.radius) { const d = Math.abs(r.px - px); if (!best || d < best.d || (d === best.d && r.px > best.r.px)) best = { r, d }; }
        liste.push({ ...e, neu: `var(${best.r.token})`, diff: best.d, exakt: best.d === 0 });
      } else liste.push({ ...e, neu: `var(${tok.treffer.token})`, diff: Math.abs(tok.treffer.px - px), exakt: px === tok.treffer.px });
    }
  }
  return liste;
}

function arg(n) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; }
function zeigen(datei, l) { for (const e of l) console.log(`${path.relative(REPO, datei)}:${e.zeile}\t${e.eigenschaft}\t${e.alt} -> ${e.neu}\t(${e.diff} px)`); }

function selbstprobe() {
  const tok = tokensLaden(JSON.parse(fs.readFileSync(path.join(FIXTURES, 'definition-gut.json'), 'utf8')));
  const def = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'definition-gut.json'), 'utf8'));
  const roh = fs.readFileSync(path.join(FIXTURES, 'umstellen-roh.css'), 'utf8');
  const profil = fs.readFileSync(path.join(FIXTURES, 'umstellen-profil.css'), 'utf8');
  const zaehl = (c) => Object.values(w.messen(c, def).zahlen).reduce((a, b) => a + b, 0);
  const vor = zaehl(roh);
  const ex = anwenden(roh, ersetzungen(roh, tok, 'exakt').treffer);
  const nachEx = zaehl(ex);
  const an = anwenden(roh, ersetzungen(roh, tok, 'angleichen').treffer);
  const nachAn = zaehl(an);
  const al = profilErsetzungen(profil, tok, 'exakt');
  const ok = vor > 0 && nachEx < vor && nachAn < nachEx && al.length === 0 && ex.includes('var(--abstand-2)') && !ex.includes('-7px: x');
  console.log(`umstellen-roh: frei ${vor}; nach --exakt ${nachEx}; nach --angleichen --schreiben ${nachAn}; Profil-Alias ${al.length}`);
  console.log(ok ? 'Selbstprobe grün' : 'Selbstprobe ROT');
  process.exit(ok ? 0 : 1);
}

function main() {
  const A = process.argv;
  if (!A.some((a) => ['--exakt', '--angleichen'].includes(a))) return selbstprobe();
  const tok = tokensLaden(JSON.parse(fs.readFileSync(arg('--definition') || w.DEFINITION, 'utf8')));
  const css = arg('--css') || w.GRUNDLAGE;
  const profile = (arg('--profil') !== null ? arg('--profil').split(',') : PROFILE).filter((p) => fs.existsSync(p));
  const schreiben = A.includes('--schreiben'); const trocken = A.includes('--trocken');
  const modus = A.includes('--angleichen') ? 'angleichen' : 'exakt';
  if (modus === 'angleichen' && !schreiben) {
    const { treffer, offen } = ersetzungen(fs.readFileSync(css, 'utf8'), tok, 'angleichen');
    const dateien = [[css, treffer]];
    for (const p of profile) dateien.push([p, profilErsetzungen(fs.readFileSync(p, 'utf8'), tok, 'angleichen')]);
    const aufgabe = dateien.map(([d, l]) => [d, l.filter((e) => e.diff > 0)]);
    for (const [d, l] of aufgabe) zeigen(d, l);
    for (const e of offen) console.log(`${path.relative(REPO, css)}:${e.zeile}\t${e.eigenschaft}\t${e.alt}\tnicht angefasst (${e.grund})`);
    const gesamt = aufgabe[0][1];
    console.log(`Off-Raster in ${path.relative(REPO, css)}: ${gesamt.length}; Profile: ${aufgabe.slice(1).map(([d, l]) => path.basename(d) + ' ' + l.length).join(', ')}; nicht angefasst: ${offen.length}`);
    return;
  }
  const arbeit = [];
  const text = fs.readFileSync(css, 'utf8');
  arbeit.push([css, text, ersetzungen(text, tok, modus).treffer.concat(profilErsetzungen(text, tok, modus))]);
  for (const p of profile) { if (path.resolve(p) === path.resolve(css)) continue; const pt = fs.readFileSync(p, 'utf8'); arbeit.push([p, pt, profilErsetzungen(pt, tok, modus)]); }
  let n = 0;
  for (const [d, t, l] of arbeit) {
    const rel = path.relative(REPO, d);
    console.log(`${rel}: ${l.length} Ersetzungen`);
    n += l.length;
    if (l.length && !trocken) fs.writeFileSync(d, anwenden(t, l));
  }
  console.log(`${modus}${trocken ? ' (trocken)' : ''}: ${n} Ersetzungen`);
}

module.exports = { tokensLaden, ersetzungen, anwenden, profilErsetzungen, deklarationen };
if (require.main === module) main();
