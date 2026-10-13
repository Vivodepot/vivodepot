#!/usr/bin/env node
'use strict';
/* pruefregeln-lesbar-erzeugen.js — die lesbare Fassung der Prüfregeln (U2-ADR-496, 10.10.2026)
   Schreibt docs/pruefregeln/pruefregeln.md aus docs/pruefregeln/pruefregeln.json. Die JSON-Datei ist die Quelle;
   die Markdown-Datei wird nie von Hand geändert. Eine Probe verlangt, dass sie genau das ist, was dieses Werkzeug heute
   erzeugt.
   Aufruf:  node tools/pruefregeln-lesbar-erzeugen.js --schreiben | --check */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const QUELLE = path.join(WURZEL, 'docs', 'pruefregeln', 'pruefregeln.json');
const ZIEL = path.join(WURZEL, 'docs', 'pruefregeln', 'pruefregeln.md');

const zelle = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|');

function erzeugen(regeln) {
  const z = [];
  z.push('# Prüfregeln');
  z.push('');
  z.push('<!-- Erzeugt aus pruefregeln.json von tools/pruefregeln-lesbar-erzeugen.js. Nicht von Hand ändern. -->');
  z.push('');
  z.push(`Fassung ${regeln.fassung} · Stand ${regeln.stand} · maschinenlesbar: [pruefregeln.json](pruefregeln.json), Schema: [pruefregeln-schema.json](pruefregeln-schema.json)`);
  z.push('');
  z.push(regeln.grundsatz.de);
  z.push('');
  z.push(regeln.massstab.de);
  z.push('');
  z.push('## Selbst prüfen');
  z.push('');
  z.push('```');
  z.push('npm ci');
  z.push('node tools/vorlage-pruefen.js --dokument meine-datei.json');
  z.push('```');
  z.push('');
  z.push('Das Werkzeug kennt keinen Schlüssel und öffnet keine Verbindung. Es prüft keine Signatur und sagt nichts darüber, von wem eine Datei kommt.');
  z.push('');
  z.push('## Urteile');
  z.push('');
  z.push('| Urteil | Bedeutung |');
  z.push('|---|---|');
  for (const [k, v] of Object.entries(regeln.urteile)) z.push(`| \`${k}\` | ${zelle(v.de)} |`);
  z.push('');
  z.push('## Schwere einer Zeile');
  z.push('');
  z.push('| Schwere | Bedeutung |');
  z.push('|---|---|');
  for (const [k, v] of Object.entries(regeln.schweren)) z.push(`| \`${k}\` | ${zelle(v.de)} |`);
  for (const art of regeln.arten) {
    const liste = regeln.regeln.filter((r) => r.art === art);
    z.push('');
    z.push(`## ${art}`);
    z.push('');
    z.push('| Kennung | Schwere | Regel | Grund der App |');
    z.push('|---|---|---|---|');
    for (const r of liste) {
      const grund = r.kernGrund == null ? '' : '`' + zelle(r.kernGrund) + '`' + (r.abgleich && r.abgleich !== 'gleich' ? ` (${r.abgleich})` : '');
      z.push(`| \`${r.kennung}\` | ${r.schwere} | ${zelle(r.satz.de)} | ${grund} |`);
    }
  }
  z.push('');
  return z.join('\n');
}

module.exports = { erzeugen, QUELLE, ZIEL };

if (require.main === module) {
  const soll = erzeugen(JSON.parse(fs.readFileSync(QUELLE, 'utf8')));
  if (process.argv.includes('--schreiben')) {
    fs.writeFileSync(ZIEL, soll);
    console.log('geschrieben: ' + path.relative(WURZEL, ZIEL));
  } else if (process.argv.includes('--check')) {
    const ist = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, 'utf8') : null;
    if (ist !== soll) { console.error('docs/pruefregeln/pruefregeln.md ist nicht der heutige Stand der Regeldatei. Neu erzeugen: --schreiben'); process.exit(1); }
    console.log('pruefregeln.md ist aktuell');
  } else {
    console.error('Aufruf: --schreiben | --check');
    process.exit(3);
  }
}
