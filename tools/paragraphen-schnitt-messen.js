#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   paragraphen-schnitt-messen.js — steht der alte Wortlaut noch irgendwo? (22.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE. Der Auftrag „Paragraphen raus“ ersetzt Sätze, die einen Gesetzesparagraphen zitieren (die
   Liste steht in tests/fixtures/paragraphen-raus/alt-wortlaut.json). Ein Schnitt, der nur das ausgelieferte
   Erzeugnis ändert, geht beim nächsten Erzeugerlauf verloren: der Satz kommt aus der Quelle zurück. Dieses
   Werkzeug sucht darum den ALTEN WORTLAUT in ALLEN Dateien, die Bürgertext tragen können — Quellen wie
   Erzeugnisse — und meldet je Fundstelle, ob die Datei Quelle, Erzeugnis oder Aufzeichnung ist (traeger.json) und
   woraus sie entsteht.

   WAS ES BEWACHT: den WORTLAUT in Dateien, nicht die Anzeige. Ein Text, der zur Laufzeit aus Teilen
   zusammengesetzt wird, oder ein Satz, der in einer Übersetzung anders steht, entgeht ihm. Es beweist
   „der alte Satz steht nirgends mehr, wie er heute geschrieben ist“, nicht „die Bürgerin sieht keinen
   Paragraphen“. Die zweite Aussage bleibt Sache des §-Wächters (Ratsche über alle Bürgertexte).
   ES SIEHT NICHT: Dateien außerhalb des Repos (Website), Testquelltexte, die Grundlinien der Ratschen
   (`*grundlinie*.json`, sie halten Zahlen und Kennungen, keinen Bürgertext) und Aufnahmen unter tests/fixtures
   (Render-Aufnahmen, Golden Master, eingefrorene Vorher-Stände): die zieht der Lauf ihrer eigenen Tests nach
   oder sie sind absichtlich alt. Ausnahme: was in traeger.json steht, wird gelesen, auch unter tests/.

   ZWEI BEFUNDARTEN, beide rot:
     OFFEN     — ein bekannter Träger trägt noch einen alten Satz.
     UNBEKANNT — eine Datei, die in traeger.json fehlt, trägt einen alten Satz: die Zuordnung ist
                 nicht mehr vollständig, ein Schnitt an den bekannten Trägern wäre nicht der ganze.
   BLEIBT  — eine Aufzeichnung (rolle aufzeichnung in traeger.json) trägt alten Wortlaut: eingefrorener Stand ohne Lauf im Landeablauf,
             der kein Produkt erreicht. Sie bleibt, mit Grund in der Tabelle; die Probe hält fest, dass sie keinen Rezept- oder Ladeweg bekommt.
   Eintragsart `gesperrt` wird nicht gemessen; ihre Zahl gehört in die Probe (sie muss bewusst sinken).

   AUFRUF
     node tools/paragraphen-schnitt-messen.js                       → gegen dieses Repo
     node tools/paragraphen-schnitt-messen.js --wurzel <ordner>     → gegen einen anderen Baum
     --json                                                         → maschinenlesbar
   Exit 0 nur ohne OFFEN und ohne UNBEKANNT.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURE_DIR = path.join(REPO, 'tests', 'fixtures', 'paragraphen-raus');
const ENDUNGEN = ['.html', '.js', '.json', '.mjs', '.cjs'];
const VERZEICHNISSE_NIE = new Set(['.git', 'node_modules', 'docs', 'tests', 'produkte', '.osv-cache', 'test-results', 'playwright-report', 'coverage', '.claude']);
const MAX_BYTES = 12 * 1024 * 1024;
const MIN_LAENGE = 30;   // ein kürzerer Satz träfe zu viele Nachbarn: nicht messbar, also rot (Probe)

/* Zeilenumbrüche, die als `\n` in JSON und JS-Literalen stehen, und echte Leerzeichenfolgen zählen als EIN Leerzeichen. */
function normieren(s) { return String(s).replace(/(?:\\[nrt]|\s)+/g, ' ').trim(); }

/* Die Schreibweisen, in denen ein Satz in einer Datei stehen kann: roh, mit maskierten Anführungszeichen (JSON, JS),
   mit \\uXXXX für alles außerhalb von ASCII (JSON mit ensure_ascii) und als HTML-Entitäten. */
function varianten(alt) {
  const a = normieren(alt);
  const maskiere = (s) => s.replace(/"/g, '\\"');
  const apostroph = (s) => s.replace(/'/g, "\\'");
  const unicode = (s) => s.replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  const html = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/§/g, '&sect;');
  return [...new Set([a, maskiere(a), apostroph(a), apostroph(maskiere(a)), unicode(a), unicode(maskiere(a)), html(a)])];
}

function trifft(heuNormiert, alt) { return varianten(alt).some((v) => heuNormiert.includes(v)); }

/* Rein: `texte` = { pfad: Text }. Kein Zugriff auf das Dateisystem — die Probe füttert sie mit erfundenen Bäumen. */
function messenTexte({ texte, eintraege, traeger }) {
  const bekannt = new Map(traeger.map((t) => [t.pfad, t]));
  const gemessen = eintraege.filter((e) => e.art === 'ersetzen' || e.art === 'streichen');
  const offen = [];
  const bleibt = [];
  const unbekannt = [];
  for (const [pfad, text] of Object.entries(texte)) {
    const heu = normieren(text);
    const treffer = gemessen.filter((e) => trifft(heu, e.alt)).map((e) => ({ nr: e.nr, sprache: e.sprache }));
    if (!treffer.length) continue;
    const t = bekannt.get(pfad);
    if (t && t.rolle === 'aufzeichnung') bleibt.push({ pfad, grund: t.grund || '', treffer });
    else if (t) offen.push({ pfad, rolle: t.rolle, aus: t.aus || [], erzeuger: t.erzeuger || [], treffer });
    else unbekannt.push({ pfad, treffer });
  }
  return { offen, bleibt, unbekannt, gemessen: gemessen.length, gesperrt: eintraege.filter((e) => e.art === 'gesperrt').length, dateien: Object.keys(texte).length };
}

function dateienSammeln(wurzel, extra) {
  const texte = {};
  const lies = (rel) => {
    const abs = path.join(wurzel, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size > MAX_BYTES) return;
    texte[rel.split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
  };
  (function ab(rel) {
    for (const n of fs.readdirSync(path.join(wurzel, rel)).sort()) {
      const r = rel ? path.join(rel, n) : n;
      const st = fs.statSync(path.join(wurzel, r));
      if (st.isDirectory()) { if (!VERZEICHNISSE_NIE.has(n)) ab(r); continue; }
      if (!ENDUNGEN.includes(path.extname(n))) continue;
      if (/\.(test|spec)\.js$/.test(n) || /grundlinie/i.test(n)) continue;
      lies(r);
    }
  })('');
  for (const rel of extra) lies(rel);
  return texte;
}

function fixturesLesen(dir = FIXTURE_DIR) {
  return {
    eintraege: JSON.parse(fs.readFileSync(path.join(dir, 'alt-wortlaut.json'), 'utf8')).eintraege,
    traeger: JSON.parse(fs.readFileSync(path.join(dir, 'traeger.json'), 'utf8')).traeger,
  };
}

/* Fund 22.09.2026: tests/fixtures/buergermodul-situationen-ab-werk.json ist trotz ihres Pfads eine
   ECHTE, in allen vier Produkten gebackene Quelle (AB_WERK_FIXTURE_PFADE_4) — der pauschale
   tests/-Ausschluss unten hätte sie für immer verdeckt, hätte niemand sie von Hand in traeger.json
   nachgetragen. Statt einer gepflegten Liste (die vergessen werden kann) werden die tests/-Pfade
   darum aus dem BAU selbst abgeleitet: jede Datei, die `modulDateienFuer` für irgendeines der vier
   Produkte tatsächlich in ein Produkt bäckt, ist automatisch eine Extra-Fundstelle — unabhängig
   davon, ob traeger.json sie kennt (kennt sie sie nicht, meldet die Probe sie als UNBEKANNT, nicht
   als still übersehen). traeger.json bleibt die Quelle für Rollen/Gründe, nicht für die Auswahl. */
function tatsaechlichGebackeneDateien() {
  const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');
  const alle = new Set();
  for (const p of PRODUKTE) for (const pfad of modulDateienFuer(p)) alle.add(path.relative(REPO, pfad).split(path.sep).join('/'));
  return [...alle].filter((p) => p.startsWith('tests/'));
}

function messen({ wurzel = REPO, fixtures = FIXTURE_DIR } = {}) {
  const { eintraege, traeger } = fixturesLesen(fixtures);
  const ausTraeger = traeger.map((t) => t.pfad).filter((p) => p.startsWith('tests/'));
  const ausBau = wurzel === REPO ? tatsaechlichGebackeneDateien() : [];   // nur im echten Repo ableitbar (require lädt den echten vier-produkte.js) — ein anderer Baum bekommt nur die Handliste
  const extra = [...new Set([...ausTraeger, ...ausBau])];
  return messenTexte({ texte: dateienSammeln(wurzel, extra), eintraege, traeger });
}

function bericht(m) {
  const z = [];
  z.push('Alter Wortlaut: ' + m.gemessen + ' Sätze gemessen, ' + m.gesperrt + ' gesperrt, ' + m.dateien + ' Dateien gelesen.');
  const zeile = (x) => x.treffer.map((t) => t.sprache + '#' + t.nr).join(' ');
  for (const o of m.offen) z.push('  OFFEN     ' + o.pfad + ' [' + o.rolle + (o.aus.length ? ', aus ' + o.aus.join(' + ') : '') + '] — ' + o.treffer.length + ' Sätze: ' + zeile(o));
  for (const b of m.bleibt) z.push('  BLEIBT    ' + b.pfad + ' [aufzeichnung] — ' + b.treffer.length + ' Sätze: ' + zeile(b) + ' (Grund in traeger.json)');
  for (const u of m.unbekannt) z.push('  UNBEKANNT ' + u.pfad + ' [nicht in traeger.json] — ' + u.treffer.length + ' Sätze: ' + zeile(u));
  return z.join('\n');
}

/* Rein: erreicht eine Aufzeichnung ein Produkt? Zwei Wege, beide ohne Laufzeit: sie steht in einem Rezept (`rezeptPfade`: die Moduldateien der Produkte, absolut oder relativ zur Wurzel),
   oder ihr Dateiname steht in einem Text, der Dateien in ein Produkt lädt (`ladewegTexte`: { pfad: Text }). Das zweite ist eine Namenssuche, keine Laufzeitmessung. */
function aufzeichnungErreichbar(pfad, rezeptPfade, ladewegTexte) {
  const name = path.basename(pfad);
  const imRezept = rezeptPfade.filter((r) => path.basename(r) === name);
  const imLadeweg = Object.entries(ladewegTexte).filter(([, text]) => text.includes(name)).map(([p]) => p);
  return { imRezept, imLadeweg, erreichbar: imRezept.length > 0 || imLadeweg.length > 0 };
}

function ausgang(m) { return m.offen.length || m.unbekannt.length ? 1 : 0; }

function main() {
  const argv = process.argv.slice(2);
  const wert = (f) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
  const m = messen({ wurzel: path.resolve(wert('--wurzel') || REPO) });
  if (argv.includes('--json')) console.log(JSON.stringify(m, null, 2));
  else {
    console.log(bericht(m));
    console.log(ausgang(m) ? 'ROT — der alte Wortlaut steht noch (OFFEN oder UNBEKANNT).' : 'OK — der alte Wortlaut steht in keinem Träger.');
  }
  process.exitCode = ausgang(m);
}

if (require.main === module) main();

module.exports = { messen, messenTexte, aufzeichnungErreichbar, dateienSammeln, fixturesLesen, bericht, ausgang, normieren, varianten, trifft, MIN_LAENGE, FIXTURE_DIR };
