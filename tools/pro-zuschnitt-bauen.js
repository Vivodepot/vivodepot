#!/usr/bin/env node
'use strict';
/* pro-zuschnitt-bauen.js — ein Pro mit einem Berufsmodul ab Werk als Datei bauen (12.10.2026, U2-ADR-489)
   Baut einen Zuschnitt aus tools/lib/vier-produkte.js (PRODUKT_ZUSCHNITTE) mit demselben Konfektionierer wie die Produkte:
   das Pro-Grundprodukt, dazu Bereich und Auszug des Berufsmoduls in der Modulliste. Kein Einlass, keine Signatur, kein Netz.
   Das Ergebnis ist eine Datei zum Öffnen und Vorführen; ausgeliefert wird ein Zuschnitt über sein Rezept, nicht hierüber.

   Aufruf:
     node tools/pro-zuschnitt-bauen.js --liste                          nennt die Zuschnitte
     node tools/pro-zuschnitt-bauen.js --zuschnitt <kennung> --ziel <ordner>   baut einen (mehrfach --zuschnitt möglich)
     node tools/pro-zuschnitt-bauen.js --alle --ziel <ordner>           baut jeden
   Schreibt je Zuschnitt <ordner>/<kennung>/vivodepot.html und am Ende <ordner>/bau.json (Kennung, SHA-256, Größe, Stand).
   Exit 0 = gebaut; 1 = Fehlbedienung oder ein Bau scheiterte. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { konfektionieren } = require('./produkt-konfektionieren.js');
const { PRODUKT_ZUSCHNITTE, modulDateienFuer, REPO } = require('./lib/vier-produkte.js');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

function zuschnittBauen(kennung, ziel) {
  const z = PRODUKT_ZUSCHNITTE.find((x) => x.slug === kennung);
  if (!z) throw new Error('unbekannter Zuschnitt „' + kennung + '“ (bekannt: ' + PRODUKT_ZUSCHNITTE.map((x) => x.slug).join(', ') + ')');
  const dateien = modulDateienFuer(z);
  // Wie bei der Auslieferung: jeder Verweis des Produkts löst auf, sonst bricht der Bau ab.
  require('./lib/produkt-verweise-pruefen.js').produktVerweiseSichern(z.slug, dateien.map((pfad) => ({ roh: JSON.parse(fs.readFileSync(pfad, 'utf8')), basisname: path.basename(pfad) })), { grundprodukt: z.basis });
  const r = konfektionieren({ ziel, slug: z.slug, modulauswahl: [], unsignierteModulDateien: dateien,
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n' });
  const datei = path.join(r.ordner, 'vivodepot.html');
  const bytes = fs.readFileSync(datei);
  return { kennung: z.slug, basis: z.basis, zuschnitt: z.zuschnitt, sprache: z.sprache, datei, bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

function main(argv) {
  if (argv.includes('--liste')) { for (const z of PRODUKT_ZUSCHNITTE) process.stdout.write(z.slug + '\n'); return 0; }
  const kennungen = [];
  let ziel = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--zuschnitt' && argv[i + 1]) kennungen.push(argv[++i]);
    else if (argv[i] === '--ziel' && argv[i + 1]) ziel = path.resolve(argv[++i]);
    else if (argv[i] === '--alle') kennungen.push(...PRODUKT_ZUSCHNITTE.map((z) => z.slug));
    else { process.stderr.write('unbekanntes Argument: ' + argv[i] + '\n'); return 1; }
  }
  if (!ziel || !kennungen.length) { process.stderr.write('Aufruf: --zuschnitt <kennung> --ziel <ordner>  |  --alle --ziel <ordner>  |  --liste\n'); return 1; }
  fs.mkdirSync(ziel, { recursive: true });
  let stand = null;
  try { stand = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }).trim(); } catch (_) { stand = null; }
  const gebaut = [];
  for (const k of [...new Set(kennungen)]) {
    try { gebaut.push(zuschnittBauen(k, ziel)); }
    catch (e) { process.stderr.write('[pro-zuschnitt] ' + k + ': ' + String(e && e.message || e) + '\n'); return 1; }
  }
  fs.writeFileSync(path.join(ziel, 'bau.json'), JSON.stringify({ gebautAm: new Date().toISOString(), stand, zuschnitte: gebaut.map((g) => Object.assign({}, g, { datei: path.relative(ziel, g.datei) })) }, null, 1) + '\n');
  for (const g of gebaut) process.stdout.write(g.kennung + '  ' + g.bytes + ' Byte  ' + g.sha256.slice(0, 16) + '\n');
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { zuschnittBauen };
