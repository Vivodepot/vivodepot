#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════
   fim-schema-inhalt-pruefen.js — kein FIM-Schema-Inhalt im Kern (01.10.2026, eingeengt 08.11.2026)
   ───────────────────────────────────────────────────────────────────────────────────────
   Bauregel Gerüst und Modul: Die Struktur eines FIM-Stammdatenschemas (Verschachtelung der Kennungen) und seine Feldnamen
   stehen im FIM-Modul, nicht im Kern. Im Kern stehen nur Kennungen (U2-ADR-456 Punkt 5) und der Schreibweg.
   Bis 08.11.2026 prüfte das Werkzeug zusätzlich jede öffentlich hinausgehende Datei, weil die Zustimmung der FITKO zur Nutzung
   fehlte. Die Nutzung ist frei (U2-ADR-465 und U2-ADR-456, Nachträge 08.11.2026); seither prüft es nur noch die Kern-Dateien,
   ein Modul außerhalb des Kerns darf Schema-Inhalt tragen.

   Geprüft werden die Kern-Dateien (KERN_DATEIEN) oder die mit --dateien genannten, auf:
     markup       XDatenfelder- oder XSD-Markup eines Schemas (xdatenfelder.stammdatenschema, <xs:element name="F…">)
     struktur     eine Gruppenkennung, der in einem Literal Feldkennungen folgen ("G…": [ "F…" …] bzw. { "G…": { "F…" …)
     kennung      mit --schema <xdf>: eine Kennung dieses Schemas außerhalb der Region FIM-BEZUEGE
     name         mit --schema <xdf>: ein Feld- oder Gruppenname dieses Schemas ab 20 Zeichen (kürzere sind Alltagswörter)
   Ausgenommen sind Zeilen, deren Kennungen alle aus dem Nummernkreis 99 stammen (F99…, G99…, S99…): den gibt es im FIM nicht,
   er ist die Kennzeichnung erfundener Fixtures (tests/fixtures/fim-schema/, tests/fixtures/bezuege/).
   Ohne --schema laufen nur die ersten beiden; mit --schema liest das Werkzeug die Namen aus der Datei außerhalb des Repos
   und schreibt sie nirgends hin, auch nicht in die Ausgabe (gemeldet werden Datei, Zeile und Art).

   Aufruf:
     node tools/fim-schema-inhalt-pruefen.js [--schema <xdf-datei außerhalb des Repos>] [--dateien <a> <b> …]
   Exit 0 = kein Fund, 1 = Fund, 2 = Aufruf falsch.
   Probe: tests/fim-schema-inhalt-pruefen.test.js
   ═══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_DATEIEN = Object.freeze(['vivodepot.html', 'vivodepot-lesen.html']);
const NAME_MINDESTLAENGE = 20;
const REGION = /FIM-BEZUEGE:BEGIN[\s\S]*?FIM-BEZUEGE:END/g;

const MARKUP = [/xdatenfelder\.stammdatenschema/, /<xs:element\s+name="[FG]\d{8,}"/, /<(?:\w+:)?datenfeldgruppe>\s*<(?:\w+:)?identifikation>/];
const STRUKTUR = /["']G\d{8,}["']\s*:\s*[[{][^\]}]{0,400}?["']F\d{8,}["']/;

/** Kennungen und lange Namen eines XDF-Schemas (nur im Speicher). */
function schemaInhalt(xdf) {
  const kennungen = new Set([...xdf.matchAll(/<(?:\w+:)?id>([FG]\d{8,})<\/(?:\w+:)?id>/g)].map((m) => m[1]));
  const namen = new Set([...xdf.matchAll(/<(?:\w+:)?name>([^<]+)<\/(?:\w+:)?name>/g)].map((m) => m[1].trim()).filter((n) => n.length >= NAME_MINDESTLAENGE));
  return { kennungen, namen };
}

/** Die Funde in einem Text: [{ zeile, art }]. */
function textPruefen(text, inhalt = null) {
  const funde = [];
  const ohneRegion = text.replace(REGION, (m) => m.replace(/[^\n]/g, ' '));
  const zeilen = ohneRegion.split('\n');
  zeilen.forEach((z, i) => {
    const ids = z.match(/\b[FGS]\d{8,}\b/g) || [];
    if (ids.length && ids.every((x) => /^[FGS]99/.test(x))) return;   // erfundener Nummernkreis
    for (const re of MARKUP) if (re.test(z)) funde.push({ zeile: i + 1, art: 'markup' });
    if (STRUKTUR.test(z)) funde.push({ zeile: i + 1, art: 'struktur' });
    if (inhalt) {
      for (const m of z.matchAll(/\b[FG]\d{8,}\b/g)) if (inhalt.kennungen.has(m[0])) { funde.push({ zeile: i + 1, art: 'kennung' }); break; }
      for (const n of inhalt.namen) if (z.includes(n)) { funde.push({ zeile: i + 1, art: 'name' }); break; }
    }
  });
  return funde;
}

/** Die Kern-Dateien, die das Werkzeug ohne --dateien prüft. */
function kernDateien() {
  return [...KERN_DATEIEN];
}

function pruefen({ dateien, inhalt = null }) {
  const funde = [];
  for (const d of dateien) {
    const p = path.isAbsolute(d) ? d : path.join(REPO, d);
    if (!fs.existsSync(p)) continue;
    for (const f of textPruefen(fs.readFileSync(p, 'utf8'), inhalt)) funde.push({ datei: d, ...f });
  }
  return funde;
}

module.exports = { schemaInhalt, textPruefen, kernDateien, pruefen, NAME_MINDESTLAENGE, KERN_DATEIEN };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--schema');
  let inhalt = null;
  if (i >= 0) {
    const p = argv[i + 1];
    if (!p || !fs.existsSync(p)) { console.error('[fim-schema-inhalt] --schema <xdf-datei> fehlt oder ist nicht lesbar'); process.exit(2); }
    if (path.resolve(p).startsWith(REPO + path.sep)) { console.error('[fim-schema-inhalt] das echte Schema liegt nie im Repo'); process.exit(2); }
    inhalt = schemaInhalt(fs.readFileSync(p, 'utf8'));
  }
  const j = argv.indexOf('--dateien');
  const dateien = j >= 0 ? argv.slice(j + 1) : kernDateien();
  const funde = pruefen({ dateien, inhalt });
  for (const f of funde) console.log('  ✗ ' + f.datei + ':' + f.zeile + '  [' + f.art + ']');
  console.log('[fim-schema-inhalt] ' + dateien.length + ' Dateien' + (inhalt ? ', mit Schema (' + inhalt.kennungen.size + ' Kennungen, ' + inhalt.namen.size + ' lange Namen)' : '')
    + ' — ' + (funde.length ? funde.length + ' Fund(e).' : 'kein Fund.'));
  process.exit(funde.length ? 1 : 0);
}
