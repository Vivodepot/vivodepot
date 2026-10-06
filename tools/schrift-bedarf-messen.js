#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   schrift-bedarf-messen.js — welche Zeichen die vier Produkte tatsächlich tragen (v896, 03.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Bis v895 rechnete tools/font-subset.py den Zeichenbedarf („Demand“) aus vivodepot.html allein. Seit das Gerüst keinen
   Gestaltungswert und keine Sprache mehr trägt (U2-ADR-426, U2-ADR-473), steht der sichtbare Text in den Modulen — der
   Bedarf des Gerüsts allein sagt über die Schrift nichts mehr. Dieses Werkzeug bäckt die vier Produkte mit demselben
   Schritt wie die Auslieferung (tests/produkt-test-backen.js → produktTextErzeugen) und zählt die Codepunkte, nach
   derselben Regel wie demand_set in font-subset.py: Daten-URLs entfernt, druckbar ab U+0020, ohne C1, plus €.
   Zusätzlich je Region der Bedarf AUSSERHALB dieser Region — damit lässt sich belegen, dass ein Zeichen nur in einer
   Region vorkommt (z. B. die IPS-Begleittexte in 24 EU-Sprachen, die nur in die FHIR-Exportdatei gehen).
   Aufruf:
     node tools/schrift-bedarf-messen.js [--kern <pfad>] [--ausserhalb <REGION>]…   → JSON auf stdout
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

function bedarfAus(text) {
  const ohne = String(text).replace(/data:[^"')]+/g, ' ');
  const d = new Set([0x20AC]);
  for (const ch of ohne) { const cp = ch.codePointAt(0); if (cp >= 0x20 && !(cp >= 0x80 && cp <= 0x9F)) d.add(cp); }
  return d;
}
function ohneRegion(text, name) {
  const a = '/* ' + name + ':BEGIN */', e = '/* ' + name + ':END */';
  const i = text.indexOf(a), j = text.indexOf(e);
  return (i < 0 || j < i) ? text : text.slice(0, i) + text.slice(j);
}
function bedarfMessen({ kern = path.join(REPO, 'vivodepot.html'), ausserhalb = [] } = {}) {
  const { testProduktText } = require(path.join(REPO, 'tests', 'produkt-test-backen.js'));
  const { PRODUKTE } = require(path.join(REPO, 'tools', 'lib', 'vier-produkte.js'));
  const html = fs.readFileSync(kern, 'utf8');
  const alle = new Set(bedarfAus(html));
  const aussen = Object.fromEntries(ausserhalb.map((r) => [r, new Set(bedarfAus(html))]));
  const produkte = {};
  for (const p of PRODUKTE) {
    const t = testProduktText(html, { slug: p.slug });
    const d = bedarfAus(t);
    produkte[p.slug] = d.size;
    d.forEach((c) => alle.add(c));
    for (const r of ausserhalb) bedarfAus(ohneRegion(t, r)).forEach((c) => aussen[r].add(c));
  }
  return { produkte, alle, ausserhalb: aussen };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  const ausserhalb = argv.flatMap((a, i) => (a === '--ausserhalb' ? [argv[i + 1]] : []));
  const r = bedarfMessen({ kern: wert('kern') || undefined, ausserhalb });
  process.stdout.write(JSON.stringify({
    produkte: r.produkte,
    alle: [...r.alle].sort((a, b) => a - b),
    ausserhalb: Object.fromEntries(Object.entries(r.ausserhalb).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])),
  }) + '\n');
}
module.exports = { bedarfMessen, bedarfAus, ohneRegion };
