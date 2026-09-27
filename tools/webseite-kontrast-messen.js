'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kontrast der Website-Seiten — gerechnet, nicht geschätzt
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „der entschiedene Rest", Posten 5. Die Produktentscheidung sagt, die
   Kontraste seien durchgerechnet worden; zwei Registerzeilen (A187, A246)
   führen die Erhebung als offen. **Zug 0 war die Suche** — in den internen
   Berichtsordnern steht kein Bericht mit dem Ergebnis (die vier
   Website-Berichte vom 05.08. behandeln Hero-Töne, Gold und die Farbgrundlage,
   nicht die neun Seiten). **Also wird gerechnet.**

   WIE GEMESSEN WIRD, und warum nicht am Quelltext: die Farbe eines Textes steht
   selten in derselben Regel wie sein Grund. Gerechnet wird darum am GERENDERTEN
   Zustand — echtes Chromium, `getComputedStyle`, die ganze Hintergrundkette —
   und die Rechnung selbst macht `tools/lib/kontrast.js`, dasselbe Modul, das die
   Kampagne benutzt und das die Suite prüft. Zwei Rechnungen an zwei Orten wären
   zwei Ergebnisse.

   DIE SEITEN LIEGEN NICHT IN DIESEM REPO (`docs/webseite/` ist unverfolgt, und
   der aktuelle Stand wohnt im Vivodepot-intern-Baum). Der Ordner ist darum ein
   ARGUMENT. Ohne Argument läuft das Werkzeug gegen die Fixture im Repo, damit
   die Suite es fahren kann — auch ohne.

     node tools/webseite-kontrast-messen.js [--ordner <pfad>] [--json <pfad>]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const K = require('./lib/kontrast.js');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : s; };
const ORDNER = arg('ordner', path.join(__dirname, '..', 'tests', 'fixtures', 'webseite-kontrast'));
const JSON_ZIEL = arg('json', null);

/* WCAG 2.2, 1.4.3 (AA): 4.5:1 für normalen Text, 3:1 für grossen Text.
   „Gross" heisst ab 24px, oder ab 18.66px bei fett — dieselbe Grenze wie in der
   App-Messung, damit die zwei Zahlen vergleichbar bleiben. */
function schwelle(fs_, fett) {
  return (fs_ >= 24 || (fett && fs_ >= 18.66)) ? 3 : 4.5;
}

function ablesen() {
  const sicht = (e) => {
    const c = getComputedStyle(e), b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0;
  };
  // Eigener Text, nicht `textContent` — dieselbe Lehre wie in der App-Messung (B2, 28.07.2026):
  // ein Knopf mit Symbol hat ein Kind, und sein Text ist trotzdem seiner.
  const eigenerText = (e) => [...e.childNodes]
    .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(' ');
  const raus = [];
  for (const e of [...document.querySelectorAll('body *')].filter(sicht)) {
    const text = eigenerText(e);
    if (text.length < 2) continue;
    const c = getComputedStyle(e);
    const kette = [];
    for (let p = e; p; p = p.parentElement) kette.push(getComputedStyle(p).backgroundColor);
    raus.push({
      sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : (e.className ? '.' + String(e.className).split(' ')[0] : '')),
      text: text.slice(0, 50), farbe: c.color, kette,
      fs: parseFloat(c.fontSize), fett: parseInt(c.fontWeight, 10) >= 700,
    });
  }
  return raus;
}

async function main() {
  if (!fs.existsSync(ORDNER)) {
    console.error('Ordner nicht gefunden: ' + ORDNER);
    process.exit(2);
  }
  const seiten = fs.readdirSync(ORDNER).filter((f) => f.endsWith('.html')).sort();
  if (!seiten.length) { console.error('Keine .html-Seiten in ' + ORDNER); process.exit(2); }

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const bericht = { erzeugt: new Date().toISOString(), ordner: ORDNER, seiten: [] };

  for (const datei of seiten) {
    await seite.goto('file://' + path.join(ORDNER, datei));
    await seite.waitForLoadState('domcontentloaded');
    const funde = await seite.evaluate(ablesen);
    const stellen = [];
    for (const f of funde) {
      /* `K.kontrast` liefert ein Objekt, keine Zahl — mitsamt der Auskunft, ob die Kette
         überhaupt eine DECKENDE Fläche hatte. Ohne sie gibt es keinen Grund, gegen den man
         rechnen könnte, und eine Zahl wäre erfunden. */
      const r = K.kontrast(f.farbe, f.kette);
      if (!r || !r.gedeckt || typeof r.wert !== 'number') continue;
      const noetig = schwelle(f.fs, f.fett);
      stellen.push({ sel: f.sel, text: f.text, wert: +r.wert.toFixed(2), noetig,
        gross: noetig === 3, bestanden: r.wert >= noetig });
    }
    const rot = stellen.filter((s) => !s.bestanden);
    bericht.seiten.push({ datei, gemessen: stellen.length, unterschreitungen: rot.length, rot });
  }
  await browser.close();

  bericht.gesamt = {
    seiten: bericht.seiten.length,
    gemessen: bericht.seiten.reduce((a, s) => a + s.gemessen, 0),
    unterschreitungen: bericht.seiten.reduce((a, s) => a + s.unterschreitungen, 0),
  };

  const j = JSON.stringify(bericht, null, 2);
  if (JSON_ZIEL) { fs.writeFileSync(JSON_ZIEL, j); console.log('geschrieben: ' + JSON_ZIEL); }
  console.log('webseite-kontrast: ' + bericht.gesamt.seiten + ' Seiten · '
    + bericht.gesamt.gemessen + ' Textstellen · ' + bericht.gesamt.unterschreitungen + ' Unterschreitungen');
  for (const s of bericht.seiten) {
    console.log('  ' + s.datei.padEnd(22) + String(s.gemessen).padStart(4) + ' gemessen · '
      + String(s.unterschreitungen).padStart(3) + ' rot');
    for (const r of s.rot.slice(0, 5)) {
      console.log('      ' + r.wert + ' : 1 (nötig ' + r.noetig + ') — ' + r.sel + ' „' + r.text + '"');
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
