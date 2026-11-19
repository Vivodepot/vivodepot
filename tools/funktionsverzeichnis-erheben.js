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
     node tools/funktionsverzeichnis-erheben.js --quelle <datei> --html <name> [--schreiben]
                                                                      festes HTML der Seite (vor dem ersten eingebetteten Skript):
                                                                      jeder Knopf und jedes Feld, mit dem umschließenden Raum
                                                                      (id „raum-…“ oder „dlg-…“). --schreiben führt mit der
                                                                      bestehenden tests/fixtures/umbau-verzeichnis-<name>.json
                                                                      zusammen: gepflegte Angaben (zustand, neuer_platz, befund)
                                                                      bleiben, neue Elemente kommen ohne Platz dazu, entfallene
                                                                      werden gemeldet und nicht still gestrichen.

   Grenzen: Klammern in Zeichenketten werden nicht ausgewertet; die Stelle endet bei der passenden schließenden
   Klammer der Funktion. Die Stellen-Liste stammt aus dem Umbau-RbB (13.11.2026).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

/* Stellen, deren Elemente zur Laufzeit aus dem Katalog kommen: gemessen werden nur die Aufrufe, dazu ein Hinweis. */
const LAUFZEIT = ['renderSektor', 'renderSituation', 'renderContentInner'];
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

function eintraegeLesen(koerper, selbst) {
  const raus = [];
  const seen = new Set();
  const add = (art, kennung, beschriftung) => {
    const k = art + ':' + kennung;
    if (seen.has(k)) return;
    seen.add(k);
    raus.push({ art, kennung, beschriftung: beschriftung || '', neuer_platz: '', zustand: 'gemessen' });
  };
  for (const m of koerper.matchAll(/\b(flow[A-Za-z]+)\s*\(/g)) add('flow', m[1]);
  /* Verteiler (renderContentInner) und Aufbauer (renderSektor) erzeugen ihre Elemente über andere Stellen: die
     Aufrufe der render- und verdrahte-Funktionen sind die Einträge, die sich am Quelltext ablesen lassen. Felder und
     Knöpfe aus dem Katalog entstehen erst zur Laufzeit; das misst dieses Werkzeug nicht (Befund steht im Bericht). */
  for (const m of koerper.matchAll(/\b((?:render|verdrahte)[A-Za-z]+)\s*\(/g)) { if (m[1] !== selbst) add('aufruf', m[1]); }
  for (const m of koerper.matchAll(/<button\b[^>]*?\bid="([^"]+)"[^>]*>([^<]*)</g)) add('knopf', m[1], m[2].trim());
  for (const m of koerper.matchAll(/<(?:input|select|textarea)\b[^>]*?\bid="([^"]+)"/g)) add('feld', m[1]);
  for (const m of koerper.matchAll(/class="[^"]*\bmenu[^"]*"[^>]*?\bid="([^"]+)"[^>]*>([^<]*)</g)) add('menue', m[1], m[2].trim());
  return raus;
}

/* Festes HTML einer Seite: vom <body> bis zum ersten eingebetteten Skript (ohne src). */
function htmlTeil(text) {
  const b = text.search(/<body\b/);
  if (b < 0) throw new Error('kein <body> im Quelltext');
  const rest = text.slice(b);
  const s = rest.search(/<script(?![^>]*\bsrc=)[^>]*>/);
  return s < 0 ? rest : rest.slice(0, s);
}

/* Bereiche der Räume: jedes Element mit id „raum-…“ oder „dlg-…“, von seinem öffnenden bis zum passenden schließenden Tag. */
function raeumeLesen(html) {
  const raus = [];
  for (const m of html.matchAll(/<([a-z]+)\b[^>]*?\bid="((?:raum|dlg)-[^"]+)"[^>]*>/g)) {
    const marke = new RegExp('<(/?)' + m[1] + '\\b', 'g');
    marke.lastIndex = m.index;
    let tiefe = 0, ende = html.length, t;
    while ((t = marke.exec(html))) {
      tiefe += t[1] ? -1 : 1;
      if (tiefe === 0) { ende = t.index; break; }
    }
    raus.push({ id: m[2], von: m.index, bis: ende });
  }
  return raus;
}

/* Wähler eines Elements: die id, sonst das erste data-Attribut (ohne die Übersetzungs-Attribute data-en…). */
function waehler(tagName, tag) {
  const id = /\bid="([^"]+)"/.exec(tag);
  if (id) return { kennung: id[1], weg: '#' + id[1] };
  for (const d of tag.matchAll(/\b(data-(?!en\b|en-)[a-z-]+)="([^"]*)"/g)) {
    const w = tagName + '[' + d[1] + '="' + d[2] + '"]';
    return { kennung: w, weg: w };
  }
  return null;
}

/* Misst das feste HTML: Knöpfe und Felder mit Raum. Elemente ohne id und ohne data-Attribut stehen im Hinweis. */
function messeHtml(text, name) {
  const html = htmlTeil(text);
  const raeume = raeumeLesen(html);
  const raumVon = (pos) => {
    let treffer = null;
    for (const r of raeume) if (pos >= r.von && pos < r.bis && (!treffer || r.von > treffer.von)) treffer = r;
    return treffer ? treffer.id : 'seite';
  };
  const eintraege = [];
  const gesehen = new Set();
  const ohne = [];
  for (const m of html.matchAll(/<(button|input|select|textarea)\b([^>]*)>([^<]*)/g)) {
    const w = waehler(m[1], m[2]);
    if (!w) { ohne.push(m[1] + ' in ' + raumVon(m.index)); continue; }
    const raum = raumVon(m.index);
    /* Ohne id gilt der Wähler nur im Raum; steht er dort mehrfach, zählt die Stelle mit (Playwright: >> nth=). */
    if (w.weg[0] !== '#' && raum !== 'seite') { w.kennung = raum + ' ' + w.kennung; w.weg = '#' + raum + ' ' + w.weg; }
    if (gesehen.has(w.kennung)) {
      if (w.weg[0] === '#' && !w.weg.includes(' ')) throw new Error('id doppelt im festen HTML: ' + w.kennung);
      let n = 2;
      while (gesehen.has(w.kennung + ' (' + n + ')')) n++;
      w.weg = w.weg + ' >> nth=' + (n - 1);
      w.kennung = w.kennung + ' (' + n + ')';
    }
    gesehen.add(w.kennung);
    const label = /\baria-label="([^"]*)"/.exec(m[2]);
    /* Der Text eines Knopfs steht oft in Kind-Elementen; gelesen wird bis zum schließenden Tag, ohne Zeichnungen und Tags. */
    const ende = m[1] === 'button' ? html.indexOf('</button>', m.index) : -1;
    const innen = ende < 0 ? '' : html.slice(m.index + m[0].length - m[3].length, ende)
      .replace(/<svg\b[\s\S]*?<\/svg>/g, ' ').replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    eintraege.push({ kennung: w.kennung, art: m[1] === 'button' ? 'knopf' : 'feld',
      beschriftung: innen || (label ? label[1] : ''), fundort_alt: raum,
      zustand: 'gemessen', neuer_platz: { ort: '', weg: { alle: [w.weg] } } });
  }
  return { stelle: name, eintraege, ...(ohne.length ? { hinweis: 'ohne id und ohne data-Attribut, nicht gemessen: ' + ohne.join(', ') } : {}) };
}

/* Führt eine neue Messung mit einem gepflegten Verzeichnis zusammen. Gepflegtes bleibt; `neu` und `entfallen` nennen den Unterschied. */
function zusammenfuehren(alt, messung) {
  const vorher = new Map(((alt && alt.eintraege) || []).map((e) => [e.kennung, e]));
  const jetzt = new Set(messung.eintraege.map((e) => e.kennung));
  const eintraege = messung.eintraege.map((e) => {
    const a = vorher.get(e.kennung);
    if (!a) return e;
    const { neuer_platz: gemessen, ...rest } = e;
    /* Der alte Fundort bleibt der alte: nach dem Umbau steht das Element an seinem neuen Platz, das Verzeichnis nennt weiter, woher es kam. */
    return { ...rest, fundort_alt: a.fundort_alt || rest.fundort_alt, zustand: a.zustand, ...(a.neuer_platz ? { neuer_platz: a.neuer_platz } : {}), ...(a.befund ? { befund: a.befund } : {}) };
  });
  const entfallen = [...vorher.keys()].filter((k) => !jetzt.has(k));
  for (const k of entfallen) eintraege.push(vorher.get(k));
  return { eintraege, neu: messung.eintraege.filter((e) => !vorher.has(e.kennung)).map((e) => e.kennung), entfallen };
}

/* Misst eine Funktion im Quelltext. Wirft, wenn die Funktion im Text fehlt. */
function messeStelle(text, name) {
  const k = koerperLesen(text, name);
  if (!k) throw new Error('Stelle nicht gefunden im Quelltext: ' + name);
  const eintraege = eintraegeLesen(k.koerper, name);
  const hinweis = !eintraege.length ? 'keine Muster gefunden: die Stelle erzeugt ihre Elemente über Hilfsfunktionen oder Vorlagen; Messung unvollständig'
    : (LAUFZEIT.includes(name) ? 'Felder und Knöpfe aus dem Katalog entstehen zur Laufzeit; gemessen sind nur die Aufrufe' : undefined);
  return { stelle: name, fundort_alt: String(k.zeile), eintraege, ...(hinweis ? { hinweis } : {}) };
}

/* Vergleicht zwei Messungen derselben Stelle: fehlt (nur in der alten) und neu (nur in der neuen). */
function lueckenVergleich(alt, neu) {
  const a = new Set(alt.eintraege.map((e) => e.art + ':' + e.kennung));
  const b = new Set(neu.eintraege.map((e) => e.art + ':' + e.kennung));
  return { fehlt: [...a].filter((x) => !b.has(x)).sort(), neu: [...b].filter((x) => !a.has(x)).sort() };
}

function argsLesen(argv) {
  const o = { quelle: null, stellen: null, schreiben: false, html: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--quelle') o.quelle = path.resolve(argv[++i]);
    else if (argv[i] === '--stelle') o.stellen = [argv[++i]];
    else if (argv[i] === '--kern') o.stellen = KERN.slice();
    else if (argv[i] === '--html') o.html = argv[++i];
    else if (argv[i] === '--schreiben') o.schreiben = true;
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  if (!o.stellen) o.stellen = ['renderFixture'];
  return o;
}

function hauptprogramm(argv) {
  const o = argsLesen(argv);
  const text = o.quelle ? fs.readFileSync(o.quelle, 'utf8') : FIXTURE_QUELLTEXT;
  if (o.html) {
    if (!/^[a-z0-9-]+$/.test(o.html)) throw new Error('--html verlangt einen Namen aus Kleinbuchstaben, Ziffern und Bindestrich');
    if (!o.quelle) throw new Error('--html verlangt --quelle <datei>');
    const messung = messeHtml(text, o.html);
    if (!o.schreiben) { process.stdout.write(JSON.stringify(messung, null, 2) + '\n'); return 0; }
    const datei = path.join(__dirname, '..', 'tests', 'fixtures', 'umbau-verzeichnis-' + o.html + '.json');
    const alt = fs.existsSync(datei) ? JSON.parse(fs.readFileSync(datei, 'utf8')) : null;
    const z = zusammenfuehren(alt, messung);
    fs.writeFileSync(datei, JSON.stringify({ quelle: path.basename(o.quelle), stelle: o.html, ...(messung.hinweis ? { hinweis: messung.hinweis } : {}), eintraege: z.eintraege }, null, 2) + '\n');
    process.stdout.write('geschrieben: ' + path.relative(process.cwd(), datei) + ' (' + z.eintraege.length + ' Einträge, neu ' + z.neu.length + ', entfallen ' + z.entfallen.length + ')\n');
    for (const k of z.entfallen) process.stdout.write('  entfallen im Quelltext, Eintrag bleibt stehen: ' + k + '\n');
    return 0;
  }
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

module.exports = { messeStelle, lueckenVergleich, koerperLesen, eintraegeLesen, messeHtml, zusammenfuehren, KERN, FIXTURE_QUELLTEXT };

if (require.main === module) {
  try { process.exitCode = hauptprogramm(process.argv.slice(2)); }
  catch (e) { process.stderr.write('[funktionsverzeichnis-erheben] ' + e.message + '\n'); process.exitCode = 2; }
}
