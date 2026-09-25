#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   depot-pille-messen.js — Auftragskette Abwesenheit (15.08.2026), Glied 1.
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE. `.depot-pille` trägt im selben Stylesheet zwei Trefferflächen:
   `min-height: 24px` (`vivodepot.html:590`) und `min-width/min-height: 44px`
   in der A47-Sammelregel (`:1544–1546`). Beide Selektoren haben dieselbe
   Spezifität (0,1,0) — es gewinnt der spätere, also 44 px. So weit die
   Papierform.

   WARUM DAS NICHT REICHT. Innerhalb `@media (max-width: 760px)` steht
   `.depot-pille { min-width: 0 }` (`:1911`) und hebt die 44-px-Breite genau
   dort wieder auf, wo Trefferflächen am meisten zählen. Die Höhe bleibt
   unangetastet. Ob die Pille deshalb SCHMALER als 44 px wird, entscheidet
   nicht das Stylesheet, sondern ihr Inhalt (der Depot-Name) — das ist eine
   Messung, keine Lesung. Der Auftrag verlangt sie ausdrücklich vor dem Bau:
   „Möglich ist, dass die 44 px bereits gewinnen und nur der tote Wert stehen
   bleibt; dann ist es eine Aufräumung und kein Fehler."

   WAS GEMESSEN WIRD. Die gerenderte Trefferfläche der `.depot-pille` über
   Breite × Theme × Skala, dazu die effektiv gewinnenden `min-width`/
   `min-height` aus `getComputedStyle`. Zwei Schwellen nebeneinander, weil es
   zwei verschiedene Zusagen sind und §7.6 verlangt, sie nicht zu vermengen:
     24 px — WCAG 2.5.8 AA, die Basis (so auch im Kommentar bei `:1540`)
     44 px — die Zielgruppen-Produktentscheidung (ältere Bürgerin,
             auch am Zeigegerät), die Grundlage der A47-Sammelregel

   WARUM EIN EIGENES WERKZEUG UND NICHT EBENE 4b. Nachgesehen, wie der Auftrag
   es verlangt: Ebene 4b misst mit `PFLICHT_PX = 24` und meldet darum für diese
   Stelle nichts — die 24-px-Zusage ist eingehalten. Die 44-px-Zusage prüft sie
   gar nicht. Ebene 4b zu verschärfen wäre der falsche Griff: sie bewacht eine
   andere, allgemeinere Zusage über den ganzen Baum, und ihre Grundlinie hängt
   am Push-Gate. Dieses Werkzeug beantwortet genau eine Frage zu genau einer
   Stelle und sagt seine Schwelle dazu.

   Aufruf:
     node tools/depot-pille-messen.js                → alle Lagen
     node tools/depot-pille-messen.js --json
     node tools/depot-pille-messen.js --breiten 390,760,1280
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const BREITEN = arg('breiten', '390,520,740,760,761,1280').split(',').map((s) => parseInt(s.trim(), 10));
const THEMES = ['', 'dark-mode', 'high-contrast'];
const SKALEN = ['', 'fs-medium', 'fs-large'];

const WCAG_BASIS = 24;   // 2.5.8 AA
const ZUSAGE = 44;       // A47-Sammelregel, Zielgruppen-Entscheidung

const ABLESEN = () => {
  const el = document.querySelector('.depot-pille');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return {
    breite: Math.round(r.width * 10) / 10,
    hoehe: Math.round(r.height * 10) / 10,
    minWidth: s.minWidth,
    minHeight: s.minHeight,
    text: (el.textContent || '').trim().slice(0, 24),
  };
};

async function main() {
  const { chromium } = require('playwright');
  const { depotEinrichten } = require(path.join(__dirname, 'kampagne.js'));
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: BREITEN[0], height: 900 } });
  const bereit = await depotEinrichten(seite);
  if (!bereit) {
    console.error('[depot-pille-messen] ABBRUCH: Depot nicht eingerichtet — ohne offenes Depot gibt es keine Pille. '
      + 'Ein Lauf ohne Messpunkt ist kein leeres Ergebnis, sondern eine Fehlmessung.');
    await browser.close();
    process.exit(2);
  }

  const lagen = [];
  for (const breite of BREITEN) {
    await seite.setViewportSize({ width: breite, height: 900 });
    for (const th of THEMES) for (const sk of SKALEN) {
      await seite.evaluate(([t, s]) => {
        document.documentElement.className = [t, s].filter(Boolean).join(' ');
      }, [th, sk]);
      await seite.waitForTimeout(30);
      const m = await seite.evaluate(ABLESEN);
      if (!m) continue;
      lagen.push({ breite, theme: th || 'hell', skala: sk || 'normal', ...m });
    }
  }
  await browser.close();

  if (!lagen.length) {
    console.error('[depot-pille-messen] ABBRUCH: keine einzige Lage gemessen.');
    process.exit(2);
  }

  const unter24 = lagen.filter((l) => Math.min(l.breite_ ?? l.breite, 0) === 0 && (l.hoehe < WCAG_BASIS));
  const schmalerAls44 = lagen.filter((l) => l.breite < ZUSAGE);
  const niedrigerAls44 = lagen.filter((l) => l.hoehe < ZUSAGE);
  const unterWcag = lagen.filter((l) => l.hoehe < WCAG_BASIS);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ wcagBasis: WCAG_BASIS, zusage: ZUSAGE, lagen,
      schmalerAls44: schmalerAls44.length, niedrigerAls44: niedrigerAls44.length,
      unterWcag: unterWcag.length }, null, 1));
    return;
  }

  console.log(`[depot-pille-messen] ${lagen.length} Lagen (Breite x Theme x Skala)\n`);
  console.log('  Breite  Theme          Skala    gerendert      min-width  min-height');
  for (const l of lagen) {
    const flagge = l.breite < ZUSAGE || l.hoehe < ZUSAGE ? '  <44' : '';
    console.log(`  ${String(l.breite).padEnd(7)} ${l.theme.padEnd(14)} ${l.skala.padEnd(8)} `
      + `${(l.breite_ ?? '').toString()}${String(l.breite).padStart(0)}`.replace(/^/, '')
      + `${String(Math.round(l.breite)).padStart(4)}x${String(Math.round(l.hoehe)).padEnd(4)} `
      + ` ${String(l.minWidth).padEnd(10)} ${String(l.minHeight).padEnd(8)}${flagge}`);
  }
  console.log('');
  console.log(`  unter WCAG 2.5.8 (${WCAG_BASIS} px, Höhe):            ${unterWcag.length}`);
  console.log(`  unter der 44-px-Zusage, Breite:              ${schmalerAls44.length}`);
  console.log(`  unter der 44-px-Zusage, Höhe:                ${niedrigerAls44.length}`);
  console.log('\n  ZÄHLGEGENSTAND: die gerenderte Trefferfläche EINES Elements (.depot-pille) mit');
  console.log('  einem eingerichteten Beispiel-Depot. Der Depot-Name bestimmt die Breite mit —');
  console.log('  ein längerer Name macht die Pille breiter, nicht schmaler (§7.6: diese Zahlen');
  console.log('  gelten für DIESEN Namen, und ein kürzerer Name wäre der ungünstigere Fall).');
  if (unter24.length) process.exitCode = 0; // reine Messung, kein Gate
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { ABLESEN, WCAG_BASIS, ZUSAGE };
