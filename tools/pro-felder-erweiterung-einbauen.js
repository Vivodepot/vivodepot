#!/usr/bin/env node
'use strict';
/* Hängt die Pro-Felder aus tools/pro-felder-erweiterung.json in die sechs Bereichs-Templates
   (tools/bereich-templates/vivodepot-pro-*.json). Idempotent. `--check`: schreibt nichts, Exit 1, wenn ein Feld oder eine
   Sektion fehlt. Bibliothek: tools/lib/pro-felder-erweiterung.js. */
const fs = require('node:fs');
const path = require('node:path');
const { strukturEinbauen } = require('./lib/pro-felder-erweiterung.js');

const VERZ = path.join(__dirname, 'bereich-templates');
const CHECK = process.argv.includes('--check');

function main() {
  const dateien = fs.readdirSync(VERZ).filter((f) => /^vivodepot-pro-.*\.json$/.test(f)).sort();
  const geladen = dateien.map((datei) => {
    const pfad = path.join(VERZ, datei);
    const roh = fs.readFileSync(pfad, 'utf8');
    return { pfad, roh, json: JSON.parse(roh) };
  });
  const templates = {};
  for (const g of geladen) Object.assign(templates, g.json.bereiche);
  const n = strukturEinbauen(templates);
  if (CHECK) {
    if (n.sektionen || n.felder) {
      console.error('[pro-felder-erweiterung] ' + n.sektionen + ' Sektion(en) und ' + n.felder + ' Feld(er) fehlen in den Templates — node tools/pro-felder-erweiterung-einbauen.js');
      process.exit(1);
    }
    console.log('[pro-felder-erweiterung] OK — alle Felder stehen in den Templates.');
    return;
  }
  for (const g of geladen) {
    const neu = JSON.stringify(g.json, null, 2) + '\n';
    if (neu !== g.roh) fs.writeFileSync(g.pfad, neu);
  }
  console.log('[pro-felder-erweiterung] ' + n.sektionen + ' Sektion(en), ' + n.felder + ' Feld(er) eingebaut.');
}
main();
