#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   geruest-anordnung-pruefen.js — Ratsche „Anordnung im Gerüst“ (U2-ADR-473 W6, 05.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Maßstab: „im fertigen Gerüst darf nichts mehr fest verdrahtet sein“. Farben laufen schon über das Erscheinungsbild-Modul;
   WELCHE Elemente in Kopf, Leiste, Tab-Leiste und Fußzeile stehen und in welcher Reihenfolge, steht heute noch fest im Gerüst.
   Diese Ratsche zählt genau das und darf nur sinken; W3b senkt sie auf 0, indem der Rahmen aus der Layout-Beschreibung entsteht.

   ERKANNT WIRD NACH REGEL, NICHT NACH NAMEN (Bedingung der Gegenlesung 1):
     Ziel     document.getElementById('sidebar'|'app-fuss'|'bottom-tabs') oder document.querySelector auf .topbar, #sidebar,
              .sidebar, #app-fuss, .app-fuss, #bottom-tabs, .bottom-tabs — direkt oder über einen Alias in derselben Funktion
              (const/let/var x = Ziel, x = Ziel).
     Schreibweg  x.innerHTML = / +=, x.outerHTML =, x.insertAdjacentHTML(, x.appendChild(, x.append(, x.prepend(, x.replaceChildren(.
   Gezählt wird jede Funktion der obersten Ebene mit mindestens einem solchen Schreibweg.

   LAYOUT-GETRIEBEN zählt nur ein Schreibweg, dessen Wert (rechte Seite bzw. erstes Argument) mit dem Aufruf eines Layout-Schreibers aus
   LAYOUT_SCHREIBER beginnt (Bedingung 2): ein bloßer Verweis auf die Layout-Beschreibung in der Funktion reicht nicht. Heute ist die
   Liste leer — W3b trägt den einen Schreiber ein, der den Rahmen aus der Beschreibung baut.

   DAS STATISCHE MARKUP von Kopf (<header class="topbar">) und Tab-Leiste (<nav class="bottom-tabs">) wird mit Zahl und Folge seiner Elemente geführt (Bedingung 3):
   je Element „tag#id.ersteKlasse“. Ein neues Element ist rot, ein verschobener Zeilenbereich nicht.

   SCHUTZ (Bedingung 4): fest gewollte Schreibwege (geschützte Anzeigen) stehen nur in `schutz` der Grundlinie, je mit Grund und eigenem
   Wort der Gegenlesung — nie still im Grundbestand.

   Aufruf:
     node tools/geruest-anordnung-pruefen.js                       Abgleich mit der Grundlinie, Exit 1 bei neuem Eintrag oder Luft
     node tools/geruest-anordnung-pruefen.js --grundlinie-schreiben  Grundlinie auf den Bestand senken (nie heben)
     node tools/geruest-anordnung-pruefen.js --kern <datei>         eine andere Datei messen
   Gehalten von seiner Probe; die Zahlen und LAYOUT_SCHREIBER stehen im Zähler-Register der Gegenlesung (Richtung L).
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ohneKommentare, skripte } = require('./lib/html-senken.js');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const GRUNDLINIE = path.join(__dirname, 'geruest-anordnung-grundlinie.json');

// Die Schreiber, die den Rahmen aus der Layout-Beschreibung bauen (W3b). Ein Eintrag hier braucht das Wort der Gegenlesung.
const LAYOUT_SCHREIBER = Object.freeze([]);

const ZIEL = String.raw`document\s*\.\s*(?:getElementById\(\s*['"](?:sidebar|app-fuss|bottom-tabs)['"]\s*\)|querySelector\(\s*['"](?:\.topbar|#sidebar|\.sidebar|#app-fuss|\.app-fuss|#bottom-tabs|\.bottom-tabs)['"]\s*\))`;
const SCHREIB = String.raw`\s*\.\s*(?:(?:innerHTML|outerHTML)\s*\+?=(?!=)|(?:insertAdjacentHTML|appendChild|append|prepend|replaceChildren)\s*\()`;

/* Ab Position i (auf „{“) bis zur passenden „}“, Zeichenketten, Vorlagen mit ${…} und Kommentare (schon entfernt) beachtet. */
function blockEnde(t, i) {
  let tiefe = 0;
  const vorlage = [];
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (c === '"' || c === "'") { for (j++; j < t.length && t[j] !== c; j++) if (t[j] === '\\') j++; continue; }
    if (c === '`') { vorlage.push(tiefe); for (j++; j < t.length; j++) { if (t[j] === '\\') { j++; continue; } if (t[j] === '`') { vorlage.pop(); break; } if (t[j] === '$' && t[j + 1] === '{') { tiefe++; j++; break; } } continue; }
    if (c === '{') tiefe++;
    else if (c === '}') {
      tiefe--;
      if (vorlage.length && tiefe === vorlage[vorlage.length - 1]) { for (j++; j < t.length; j++) { if (t[j] === '\\') { j++; continue; } if (t[j] === '`') { vorlage.pop(); break; } if (t[j] === '$' && t[j + 1] === '{') { tiefe++; j++; break; } } continue; }
      if (tiefe === 0) return j;
    }
  }
  return -1;
}

/* Die Funktionen der obersten Ebene: function name(…) { … } und const name = (…) => { … } / function (…) { … }. */
function funktionen(js) {
  const aus = [];
  const re = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b[^{]*|\([^)]*\)\s*=>\s*|[A-Za-z_$][\w$]*\s*=>\s*)(?=\{)/gm;
  let m;
  while ((m = re.exec(js))) {
    const auf = js.indexOf('{', m.index + m[0].length - (m[2] ? 0 : 1));
    if (auf < 0) continue;
    const zu = blockEnde(js, auf);
    if (zu < 0) continue;
    aus.push({ name: m[1] || m[2], koerper: js.slice(auf, zu + 1) });
    re.lastIndex = zu + 1;
  }
  return aus;
}

/* Die Schreibwege einer Funktion in den Rahmen: [{ ziel, art, wert }]. */
function schreibwege(koerper) {
  const ziele = [ZIEL];
  const alias = new RegExp(String.raw`(?:\b(?:const|let|var)\s+|(?:^|[;{}(,\s]))([A-Za-z_$][\w$]*)\s*=(?!=)\s*` + ZIEL, 'g');
  let m;
  while ((m = alias.exec(koerper))) ziele.push(String.raw`\b` + m[1].replace(/\$/g, '\\$') + String.raw`\b`);
  const aus = [];
  for (const z of ziele) {
    const re = new RegExp('(' + z + ')' + SCHREIB, 'g');
    while ((m = re.exec(koerper))) {
      const nach = koerper.slice(m.index + m[0].length).replace(/^\s*/, '');
      aus.push({ ziel: m[1].replace(/\s+/g, ''), art: m[0].replace(m[1], '').replace(/[\s(=+]/g, '').replace(/^\./, ''), wert: nach.slice(0, 80) });
    }
  }
  return aus;
}

function layoutGetrieben(w, schreiber = LAYOUT_SCHREIBER) {
  return schreiber.some((n) => new RegExp('^(?:[A-Za-z_$][\\w$.]*\\.)?' + n + '\\s*\\(').test(w.wert));
}

/* Das statische Kopf-Markup: Folge der Elemente zwischen <header class="topbar"> und dem zugehörigen </header>. */
const STATISCH = Object.freeze({ kopf: [/<header\s+class="topbar"[^>]*>/, '</header>'], tabLeiste: [/<nav\s+class="bottom-tabs"[^>]*>/, '</nav>'] });
function kopfMarkup(html, art = 'kopf') {
  const [anfang, ende] = STATISCH[art];
  const a = html.search(anfang);
  if (a < 0) return { anzahl: 0, folge: [] };
  const e = html.indexOf(ende, a);
  const stueck = html.slice(a, e).replace(/<!--[\s\S]*?-->/g, '');
  const folge = [];
  for (const m of stueck.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/g)) {
    const id = /\bid="([^"]+)"/.exec(m[2]); const kl = /\bclass="([^"]+)"/.exec(m[2]);
    folge.push(m[1] + (id ? '#' + id[1] : '') + (kl ? '.' + kl[1].trim().split(/\s+/)[0] : ''));
  }
  return { anzahl: folge.length, folge };
}

function messen(html, { schreiber = LAYOUT_SCHREIBER } = {}) {
  const js = skripte(html).map((s) => ohneKommentare(typeof s === 'string' ? s : s.text || '')).join('\n');
  const fest = [];
  for (const f of funktionen(js)) {
    const w = schreibwege(f.koerper).filter((x) => !layoutGetrieben(x, schreiber));
    if (w.length) fest.push({ name: f.name, wege: w.map((x) => x.ziel + '.' + x.art) });
  }
  return { funktionen: fest, kopf: kopfMarkup(html, 'kopf'), tabLeiste: kopfMarkup(html, 'tabLeiste') };
}

function abgleichen(ist, gl) {
  const funde = [];
  const schutz = new Set((gl.schutz || []).map((s) => s.name));
  const bekannt = new Set(gl.funktionen);
  const istNamen = new Set(ist.funktionen.map((f) => f.name));
  for (const f of ist.funktionen) if (!bekannt.has(f.name) && !schutz.has(f.name)) funde.push('neu: ' + f.name + ' schreibt fest in den Rahmen (' + f.wege.join(', ') + ')');
  for (const n of gl.funktionen) if (!istNamen.has(n)) funde.push('Luft: ' + n + ' schreibt nicht mehr fest — Grundlinie senken (--grundlinie-schreiben)');
  for (const s of gl.schutz || []) if (!s.grund) funde.push('Schutz ohne Grund: ' + s.name);
  for (const art of Object.keys(STATISCH)) {
    const k = ist[art], gk = gl[art] || { anzahl: 0, folge: [] };
    const neuDa = k.folge.filter((x, i) => k.folge.slice(0, i).filter((y) => y === x).length >= gk.folge.filter((y) => y === x).length);
    for (const x of neuDa) funde.push('neu im statischen Markup (' + art + '): ' + x);
    if (!neuDa.length && k.anzahl < gk.anzahl) funde.push('Luft im statischen Markup (' + art + '): ' + k.anzahl + ' statt ' + gk.anzahl + ' Elemente — Grundlinie senken');
    if (!neuDa.length && k.anzahl === gk.anzahl && k.folge.join('|') !== gk.folge.join('|')) funde.push('statisches Markup (' + art + ') umgestellt: die Folge gehört in die Layout-Beschreibung');
  }
  return funde;
}

function main(argv) {
  const ki = argv.indexOf('--kern');
  const html = fs.readFileSync(ki >= 0 ? argv[ki + 1] : KERN, 'utf8');
  const ist = messen(html);
  if (argv.includes('--grundlinie-schreiben')) {
    const alt = fs.existsSync(GRUNDLINIE) ? JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')) : null;
    const neu = ist.funktionen.map((f) => f.name).filter((n) => !(alt && (alt.schutz || []).some((s) => s.name === n)));
    if (alt) {
      const zuwachs = neu.filter((n) => !alt.funktionen.includes(n));
      if (zuwachs.length || Object.keys(STATISCH).some((a) => ist[a].anzahl > (alt[a] || { anzahl: 0 }).anzahl)) { console.error('[geruest-anordnung] ABBRUCH: die Grundlinie sinkt nur. Zuwachs: ' + (zuwachs.join(', ') || 'Kopf-Markup')); return 1; }
    }
    const gl = { beschreibung: 'Ratsche „Anordnung im Gerüst“ (U2-ADR-473 W6): Funktionen, die Rahmen-Markup fest schreiben, und das statische Kopf-Markup. Darf nur sinken; W3b senkt auf 0. Zählweg: node tools/geruest-anordnung-pruefen.js',
      funktionen: neu.sort(), kopf: ist.kopf, tabLeiste: ist.tabLeiste, schutz: alt ? alt.schutz || [] : [] };
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(gl, null, 1) + '\n');
    console.log('[geruest-anordnung] Grundlinie geschrieben: ' + gl.funktionen.length + ' Funktionen, Kopf ' + gl.kopf.anzahl + ', Tab-Leiste ' + gl.tabLeiste.anzahl + ' Elemente.');
    return 0;
  }
  const gl = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const funde = abgleichen(ist, gl);
  if (funde.length) { console.error('[geruest-anordnung] ' + funde.length + ' Fund(e):\n  ' + funde.join('\n  ')); return 1; }
  console.log('[geruest-anordnung] OK — ' + ist.funktionen.length + ' Funktionen, ' + ist.kopf.anzahl + ' Kopf- und ' + ist.tabLeiste.anzahl + ' Tab-Leisten-Elemente, wie die Grundlinie.');
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { STATISCH, LAYOUT_SCHREIBER, funktionen, schreibwege, kopfMarkup, messen, abgleichen, blockEnde };
