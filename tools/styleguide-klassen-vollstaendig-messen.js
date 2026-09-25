#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════════
   styleguide-klassen-vollstaendig-messen — JEDE CSS-Klasse des Kerns, ohne Zuschnitt
   ────────────────────────────────────────────────────────────────────────────────
   „Nach der Nacht" / Nachtrag „Design-Auftrag" (23.08.2026). Vorgänger-
   Werkzeug `styleguide-komponenten-abgleich.js` bündelt Varianten zu „Stämmen" und lässt
   einen Menschen wählen, was beschrieben wird — genau der Zuschnitt, den dieser Auftrag
   ausdrücklich NICHT will: „Alle Klassen erfassen, kein Zuschnitt nach Einschätzung."

   Die Staffelung ist MECHANISCH, nicht geurteilt: die Zahl der Verwendungsstellen im
   Kern (Vorkommen der Klasse ausserhalb der `<style>`-Bloecke — also da, wo sie an ein
   Element angeschrieben wird, nicht da, wo ihre Regel steht) entscheidet.

     · GENAU EIN Vorkommen  → Minimum: Name, Fundstellenzahl (1), Zeile.
     · MEHR ALS EIN Vorkommen → zusaetzlich die VOLLE Beschreibung: jede CSS-Regel, die
       diese Klasse traegt (Selektor + Deklaration, woertlich aus dem Kern) — mechanisch
       extrahiert, keine erfundene Prosa. Eine Regel mit mehreren Deklarationen zaehlt als
       eine Fundstelle ihres Selektors; :hover/.aktiv/Medienabfrage-Varianten sind eigene
       Regeln und werden alle gelistet.

   Aufruf:
     node tools/styleguide-klassen-vollstaendig-messen.js                # Zahlen
     node tools/styleguide-klassen-vollstaendig-messen.js --json         # volle Daten
     node tools/styleguide-klassen-vollstaendig-messen.js --kern <pfad>  # gegen andere Datei
   ════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
function _argWert(name) {
  const i = process.argv.indexOf(name);
  return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : null;
}
const KERN_DEFAULT = path.join(REPO, 'vivodepot.html');

// Alle <style>-Bloecke als EIN String, mit ihren Zeilen-Startpunkten, damit CSS-Regeln
// nicht als „Verwendung" mitgezaehlt werden.
function styleBloecke(html) {
  const bloecke = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) {
    bloecke.push({ text: m[1], start: m.index + m[0].indexOf(m[1]) });
  }
  return bloecke;
}

// Binärsuche über vorab gesammelte Zeilenumbruch-Offsets — O(log n) statt O(offset) je
// Treffer. Bei 448 Klassen mit je Hunderten Fundstellen macht das den Unterschied zwischen
// Sekunden und Minuten (gemessen: 14s → <1s durch dieses plus die Einmal-Durchläufe unten).
function zeilenIndex(html) {
  const umbrueche = [];
  for (let i = 0; i < html.length; i++) if (html[i] === '\n') umbrueche.push(i);
  return umbrueche;
}
function zeileVonOffset(umbrueche, offset) {
  let lo = 0, hi = umbrueche.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (umbrueche[mid] < offset) lo = mid + 1; else hi = mid;
  }
  return lo + 1;
}

// Alle Klassen MIT eigener Regel (wie im Vorgaenger-Werkzeug) — das ist die zu erfassende
// Menge: eine Klasse ohne jede Regel traegt keine Gestaltungsentscheidung.
function klassenMitRegel(styleText) {
  const ohneKommentare = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const klassen = new Set();
  const regelRe = /([^{}]+)\{[^{}]*\}/g;
  let r;
  while ((r = regelRe.exec(ohneKommentare))) {
    const selektor = r[1];
    if (selektor.indexOf('@') >= 0 && !/[.]/.test(selektor)) continue;
    const treffer = selektor.match(/\.[A-Za-z_][A-Za-z0-9_-]*/g) || [];
    for (const t of treffer) klassen.add(t.slice(1));
  }
  return klassen;
}

// EIN Durchlauf über ALLE Regeln (statt 448 Durchläufe, einer je Klasse): Map
// klasse -> [{selektor, deklaration}].
function regelnJeKlasse(styleBlocks) {
  const karte = new Map();
  for (const block of styleBlocks) {
    const ohneKommentare = block.text.replace(/\/\*[\s\S]*?\*\//g, '');
    const regelRe = /([^{}]+)\{([^{}]*)\}/g;
    let r;
    while ((r = regelRe.exec(ohneKommentare))) {
      const selektor = r[1].trim();
      const klassenImSelektor = (selektor.match(/\.[A-Za-z_][A-Za-z0-9_-]*/g) || []).map(s => s.slice(1));
      if (!klassenImSelektor.length) continue;
      const deklaration = r[2].trim().replace(/\s+/g, ' ');
      for (const k of new Set(klassenImSelektor)) {
        if (!karte.has(k)) karte.set(k, []);
        karte.get(k).push({ selektor, deklaration });
      }
    }
  }
  return karte;
}

// EIN Durchlauf über die ganze Datei (ausserhalb der <style>-Bloecke) mit EINER
// Alternations-Regex ueber alle Klassennamen — statt 448 einzelnen Vollscans. Laengere
// Namen zuerst in der Alternation, sonst koennte eine Alternative wie `btn` vor `btn-sek`
// greifen und den Rest des laengeren Namens als Nicht-Treffer uebrig lassen (das
// Wortgrenzen-Lookaround faengt das zwar zusaetzlich ab, aber die Reihenfolge bleibt die
// robustere Grundannahme bei Regex-Alternation).
function verwendungsstellenAlle(html, styleBlocks, klassen) {
  let rest = html;
  for (const b of styleBlocks) {
    rest = rest.slice(0, b.start) + ' '.repeat(b.text.length) + rest.slice(b.start + b.text.length);
  }
  const umbrueche = zeilenIndex(html);
  const sortiert = Array.from(klassen).sort((a, b) => b.length - a.length);
  const alternation = sortiert.map(k => k.replace(/[-]/g, '\\-')).join('|');
  const muster = new RegExp('(?<![\\w-])(' + alternation + ')(?![\\w-])', 'g');
  const ergebnis = new Map(klassen.map(k => [k, []]));
  let m;
  while ((m = muster.exec(rest))) {
    ergebnis.get(m[1]).push(zeileVonOffset(umbrueche, m.index));
  }
  return ergebnis;
}

function messen(kernPfad) {
  const html = fs.readFileSync(kernPfad, 'utf8');
  const styleBlocks = styleBloecke(html);
  const styleTextGesamt = styleBlocks.map(b => b.text).join('\n');
  const klassen = Array.from(klassenMitRegel(styleTextGesamt)).sort();

  const regelKarte = regelnJeKlasse(styleBlocks);
  const stellenKarte = verwendungsstellenAlle(html, styleBlocks, klassen);

  const ergebnis = klassen.map((klasse) => {
    const stellen = stellenKarte.get(klasse) || [];
    return {
      klasse,
      fundstellenZahl: stellen.length,
      fundstellenZeilen: stellen,
      regeln: regelKarte.get(klasse) || [], // immer mitgeliefert — Ausgabe/Renderer entscheidet Tiefe
    };
  });

  return {
    kernPfad,
    klassenGesamt: ergebnis.length,
    einVorkommen: ergebnis.filter(e => e.fundstellenZahl <= 1).length,
    mehrVorkommen: ergebnis.filter(e => e.fundstellenZahl > 1).length,
    nullVorkommen: ergebnis.filter(e => e.fundstellenZahl === 0).length, // nur in Medienabfrage o.ä. verwendet, s. Hinweis unten
    klassen: ergebnis,
  };
}

function main() {
  const kernPfad = path.resolve(_argWert('--kern') || KERN_DEFAULT);
  const e = messen(kernPfad);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(e, null, 2));
    return;
  }
  console.log('Kern: ' + e.kernPfad);
  console.log('Klassen mit eigener Regel gesamt: ' + e.klassenGesamt);
  console.log('  genau ein Vorkommen (Minimum-Eintrag): ' + e.einVorkommen);
  console.log('  mehr als ein Vorkommen (volle Beschreibung): ' + e.mehrVorkommen);
  console.log('  null Vorkommen ausserhalb <style> (nur ueber Eltern-/Geschwister-Selektor oder JS-Zusammensetzung wirksam): ' + e.nullVorkommen);
}

if (require.main === module) main();
module.exports = { messen, klassenMitRegel, regelnJeKlasse, verwendungsstellenAlle };
