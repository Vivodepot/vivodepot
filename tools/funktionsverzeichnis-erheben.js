#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Funktionsverzeichnis erheben (Zulieferung an den Umbau, 13.11.2026).

   Misst je Stelle die Funktionen einer Funktion im Quelltext: Aufrufe flow*(…), Knöpfe (<button id=…>),
   Felder (<input|select|textarea id=…>) und Menüeinträge (class „menu…“ mit id). Schreibt das Ergebnis
   als JSON; die Zuordnung „neuer Platz“ pflegt der Umbau, dieses Werkzeug misst nur.

     node tools/funktionsverzeichnis-erheben.js                       Fixture im Repo (Probe)
     node tools/funktionsverzeichnis-erheben.js --quelle <datei> --stelle <name>
     node tools/funktionsverzeichnis-erheben.js --quelle <datei> --kern   alle Stellen der Liste
     … --schreiben                                                    schreibt tests/fixtures/umbau-verzeichnis-<stelle>.json

   Grenzen: Klammern in Zeichenketten werden nicht ausgewertet; die Stelle endet bei der passenden schließenden
   Klammer der Funktion. Die Stellen-Liste stammt aus dem Umbau-RbB (13.11.2026).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const KERN = ['renderTopbar', 'renderSidebar', 'renderWizard', 'renderContentInner', 'renderSektor', 'renderSituation',
  'renderZusammenstellen', 'flowEinlesen', 'flowEinlesenZentral', 'flowZusammenstellungHerausgeben', 'flowHerausgebenZentral'];
/* Eingebautes Fixture (ohne Datei, damit kein neuer Eintrag unter tests/fixtures entsteht). */
const FIXTURE_QUELLTEXT = [
  '<!doctype html>',
  '<html lang="de"><head><meta charset="utf-8"><title>Fixture Funktionsverzeichnis</title></head>',
  '<body>',
  '<script>',
  'function renderFixture() {',
  "  const kopf = '<button id=\"btnA\" data-aktion=\"speichern\">Speichern</button>';",
  "  const fuss = '<button id=\"btnB\">Drucken</button>';",
  "  const feld = '<input id=\"feldX\" type=\"text\">';",
  "  const punkt = '<div class=\"menu-punkt\" id=\"menuE\">Export</div>';",
  '  flowFixture(1);',
  '}',
  'function flowFixture(n) { return n; }',
  '</script>',
  '</body></html>',
  '',
].join('\n');

/* Liefert den Körper der Funktion `name` samt Startzeile, oder null. */
function koerperLesen(text, name) {
  const kopf = new RegExp('(^|\\n)\\s*(async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = kopf.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  const auf = text.indexOf('{', start);
  if (auf < 0) return null;
  let tiefe = 0;
  for (let i = auf; i < text.length; i++) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}') { tiefe--; if (tiefe === 0) return { koerper: text.slice(auf, i + 1), zeile: text.slice(0, m.index + m[0].indexOf('function')).split('\n').length }; }
  }
  return null;
}

function eintraegeLesen(koerper) {
  const raus = [];
  const seen = new Set();
  const add = (art, kennung, beschriftung) => {
    const k = art + ':' + kennung;
    if (seen.has(k)) return;
    seen.add(k);
    raus.push({ art, kennung, beschriftung: beschriftung || '', neuer_platz: '', zustand: 'gemessen' });
  };
  for (const m of koerper.matchAll(/\b(flow[A-Za-z]+)\s*\(/g)) add('flow', m[1]);
  for (const m of koerper.matchAll(/<button\b[^>]*?\bid="([^"]+)"[^>]*>([^<]*)</g)) add('knopf', m[1], m[2].trim());
  for (const m of koerper.matchAll(/<(?:input|select|textarea)\b[^>]*?\bid="([^"]+)"/g)) add('feld', m[1]);
  for (const m of koerper.matchAll(/class="[^"]*\bmenu[^"]*"[^>]*?\bid="([^"]+)"[^>]*>([^<]*)</g)) add('menue', m[1], m[2].trim());
  return raus;
}

/* Misst eine Funktion im Quelltext. Wirft, wenn die Funktion im Text fehlt. */
function messeStelle(text, name) {
  const k = koerperLesen(text, name);
  if (!k) throw new Error('Stelle nicht gefunden im Quelltext: ' + name);
  const eintraege = eintraegeLesen(k.koerper);
  const hinweis = eintraege.length ? undefined : 'keine Muster gefunden: die Stelle erzeugt ihre Elemente über Hilfsfunktionen oder Vorlagen; Messung unvollständig';
  return { stelle: name, fundort_alt: String(k.zeile), eintraege, ...(hinweis ? { hinweis } : {}) };
}

/* Vergleicht zwei Messungen derselben Stelle: fehlt (nur in der alten) und neu (nur in der neuen). */
function lueckenVergleich(alt, neu) {
  const a = new Set(alt.eintraege.map((e) => e.art + ':' + e.kennung));
  const b = new Set(neu.eintraege.map((e) => e.art + ':' + e.kennung));
  return { fehlt: [...a].filter((x) => !b.has(x)).sort(), neu: [...b].filter((x) => !a.has(x)).sort() };
}

function argsLesen(argv) {
  const o = { quelle: null, stellen: null, schreiben: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--quelle') o.quelle = path.resolve(argv[++i]);
    else if (argv[i] === '--stelle') o.stellen = [argv[++i]];
    else if (argv[i] === '--kern') o.stellen = KERN.slice();
    else if (argv[i] === '--schreiben') o.schreiben = true;
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  if (!o.stellen) o.stellen = ['renderFixture'];
  return o;
}

function hauptprogramm(argv) {
  const o = argsLesen(argv);
  const text = o.quelle ? fs.readFileSync(o.quelle, 'utf8') : FIXTURE_QUELLTEXT;
  const ergebnis = [];
  for (const s of o.stellen) {
    try { ergebnis.push(messeStelle(text, s)); }
    catch (e) { if (o.stellen.length === 1) throw e; process.stderr.write('[funktionsverzeichnis] ' + e.message + '\n'); }
  }
  if (o.schreiben) {
    const ziel = path.join(__dirname, '..', 'tests', 'fixtures');
    for (const z of ergebnis) {
      const datei = path.join(ziel, 'umbau-verzeichnis-' + z.stelle.replace(/^render|^flow/, (m) => m.toLowerCase()) + '.json');
      fs.writeFileSync(datei, JSON.stringify({ quelle: o.quelle ? path.basename(o.quelle) : 'eingebautes Fixture', ...z }, null, 2) + '\n');
      process.stdout.write('geschrieben: ' + path.relative(process.cwd(), datei) + ' (' + z.eintraege.length + ' Einträge)\n');
    }
  } else {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + '\n');
  }
  return 0;
}

module.exports = { messeStelle, lueckenVergleich, koerperLesen, eintraegeLesen, KERN, FIXTURE_QUELLTEXT };

if (require.main === module) {
  try { process.exitCode = hauptprogramm(process.argv.slice(2)); }
  catch (e) { process.stderr.write('[funktionsverzeichnis-erheben] ' + e.message + '\n'); process.exitCode = 2; }
}
