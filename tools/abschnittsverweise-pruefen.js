#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   abschnittsverweise-pruefen.js — Verweise auf einen ABSCHNITT, den es nicht gibt (21.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. SECURITY.md 2.2 sagte in der Fassung v933, wie man die Prüfsummen nachrechnet, stehe in DEVELOPING.md; der
   Abschnitt dort war mit a6298d838 entfallen. Tote Verweise auf ganze Dateien hält schon die Achse „tote Verweise" des
   Zuschnitts; ein Verweis auf einen Abschnitt prüfte niemand. Eine Überschrift zu ändern ändert ihren Anker.

   GEPRÜFT wird jede getrackte Markdown-Datei auf zwei Formen:
   1. Anker: `[…](DATEI.md#anker)` oder `[…](#anker)`. Der Anker muss einer Überschrift der Zieldatei entsprechen,
      gebildet wie auf GitHub (klein, Satzzeichen weg, Leerzeichen zu „-", Dubletten mit -1, -2 …), oder einem
      `<a id|name="…">` darin.
   2. Abschnitt beim Namen: `[…](DATEI.md), „Titel"` oder `[…](DATEI.md) „Titel"`. Der Titel muss eine Überschrift
      der Zieldatei sein (ohne führende Nummer verglichen).
   Ziele außerhalb des Repos, mit Schema oder ohne .md-Endung zählen nicht; Überschriften in Code-Blöcken auch nicht.
   Eine Zieldatei, die fehlt, ist Sache der Achse „tote Verweise", nicht dieser.

   NICHT gesehen wird ein Satz, der einen Inhalt behauptet, ohne einen Abschnitt zu nennen („steht in DEVELOPING.md").
   Den Fall aus dem Anlass hält eine eigene Probe für Sätze, die vom Nachrechnen sprechen.

   Aufruf: `node tools/abschnittsverweise-pruefen.js` (Repo-Wurzel; Exit 1 bei Fund), `--wurzel <pfad>` für einen
   anderen Baum. Probe mit Rot-Beweis: die Suite.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

function slug(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function ohneCodeBloecke(text) {
  let imBlock = false;
  return text.split('\n').map((z) => {
    if (/^\s*(```|~~~)/.test(z)) { imBlock = !imBlock; return ''; }
    return imBlock ? '' : z;
  });
}

function ueberschriften(text) {
  return ohneCodeBloecke(text).map((z) => /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(z)).filter(Boolean).map((m) => m[1]);
}

function anker(text) {
  const menge = new Set();
  const gesehen = new Map();
  for (const u of ueberschriften(text)) {
    const s = slug(u);
    const n = gesehen.get(s) || 0;
    menge.add(n ? `${s}-${n}` : s);
    gesehen.set(s, n + 1);
  }
  for (const m of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/gi)) menge.add(m[1]);
  return menge;
}

// Titel ohne führende Nummer und Satzzeichen, damit „2.4 Abweichender Fingerabdruck" und „Abweichender Fingerabdruck" gleich sind.
const titelSchluessel = (t) => slug(t).replace(/^[\d.-]+/, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

const VERWEIS = /\]\(([^)\s]+)\)(?:,?\s*„([^“]+)“)?/g;

/* `lesen(rel)` liefert den Text oder null. Rückgabe: Funde als Zeilen `datei:zeile  [art]  verweis`. */
function abschnittsverweisePruefen(relPfade, lesen) {
  const cache = new Map();
  const ziel = (rel) => {
    if (!cache.has(rel)) {
      const t = lesen(rel);
      cache.set(rel, t == null ? null : { anker: anker(t), titel: new Set(ueberschriften(t).map(titelSchluessel)) });
    }
    return cache.get(rel);
  };
  const funde = [];
  for (const rel of relPfade.filter((r) => r.endsWith('.md'))) {
    const text = lesen(rel);
    if (text == null) continue;
    ohneCodeBloecke(text).forEach((zeile, i) => {
      for (const [, roh, titel] of zeile.matchAll(VERWEIS)) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(roh)) continue;
        const [datei, frag] = roh.split('#');
        if (datei && !datei.endsWith('.md')) continue;
        let zielRel = rel;
        if (datei) {
          try { zielRel = path.posix.normalize(path.posix.join(path.posix.dirname(rel), decodeURI(datei))); } catch (_) { continue; }
          if (zielRel.startsWith('..') || zielRel.startsWith('/')) continue;
        }
        const z = ziel(zielRel);
        if (!z) continue;
        if (frag !== undefined) {
          let f;
          try { f = decodeURIComponent(frag); } catch (_) { f = frag; }
          if (f && !z.anker.has(f)) funde.push(`${rel}:${i + 1}  [Anker fehlt]  ${roh}`);
        }
        if (titel && datei && !z.titel.has(titelSchluessel(titel))) funde.push(`${rel}:${i + 1}  [Abschnitt fehlt]  ${roh} „${titel}“`);
      }
    });
  }
  return funde;
}

function repoLauf(wurzel) {
  const liste = execFileSync('git', ['-C', wurzel, 'ls-files', '-z', '--', '*.md'], { encoding: 'utf8', env: ohneGitUmgebung() }).split('\0').filter(Boolean);
  const lesen = (rel) => { try { return fs.readFileSync(path.join(wurzel, rel), 'utf8'); } catch (_) { return null; } };
  return abschnittsverweisePruefen(liste, lesen);
}

module.exports = { slug, anker, ueberschriften, titelSchluessel, abschnittsverweisePruefen, repoLauf };

if (require.main === module) {
  const i = process.argv.indexOf('--wurzel');
  const wurzel = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(__dirname, '..');
  const funde = repoLauf(wurzel);
  for (const f of funde) console.log(f);
  console.log(`abschnittsverweise: ${funde.length} Fund(e)`);
  process.exit(funde.length ? 1 : 0);
}
