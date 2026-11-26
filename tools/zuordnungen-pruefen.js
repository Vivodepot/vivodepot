#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   zuordnungen-pruefen.js — jede Zuordnung aus bereiche/bezuege.json mechanisch geprüft (22.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Eine Zuordnung (Kennung → Ziel in einem fremden Standard) trägt neben Ziel, Fassung und Grad ihre Stufe, ihre Begründung,
   wer sie vorgeschlagen und wer sie bestätigt hat und das Datum. Daraus entsteht die SSSOM-Ausgabe des Feldregisters
   (der Register-Erzeuger mit tools/lib/feldregister-sssom.js). Dieses Werkzeug prüft vor jeder Ausgabe:

     format                 Pflichtangaben je Zeile, Werte aus den Listen (STUFEN, GRADE), ISO-Daten (echter Kalendertag),
                            Bestätiger nur mit bestaetigtAm und umgekehrt, „fachlich-bestaetigt" nur mit Bestätiger, leeres
                            Datum nur mit dem Satz „Datum der Erhebung nicht belegt" in der Begründung, kein Tabulator und
                            kein Zeilenumbruch in einem Text (die Ausgabe ist TSV).
     quelle-nicht-gepinnt   das Ziel in der genannten Fassung hat keine gepinnte Datei in bereiche/bezuege-quellen.json:
                            Zeilen mit `vokabular` brauchen eine Datei mit diesem Vokabular und dieser Fassung, Zeilen ohne
                            (FIM) eine Datei mit Kennung = Ziel und dieser Fassung. Eine Zeile „zu-pruefen" behält ihre alte
                            Fassung bis zur Bestätigung; für sie ist das ein Hinweis, kein Befund.
     ziel-fehlt             (nur mit --quellordner) das Ziel steht nicht in der gepinnten Datei.
     quelle-veraendert      (nur mit --quellordner) die Datei weicht von ihrer SHA-256 in der Lock-Datei ab.
     dublette               dieselbe Kennung, derselbe Datensatz, dasselbe Ziel, dieselbe Fassung mehr als einmal
                            (eine abgelehnte neben einer gültigen ist keine Dublette, sondern ein Widerspruch).
     widerspruch            dieselbe Kennung zeigt mit „exakt" auf zwei Ziele desselben Vokabulars, oder eine gültige
                            Zuordnung steht neben einer abgelehnten mit demselben Ziel.

   --fassung-neu <datensatz>: wurde in der Lock-Datei eine neue Fassung eingetragen, setzt das Werkzeug jede Zeile dieses
   Datensatzes, deren Fassung nicht mehr gepinnt ist, auf `stufe: zu-pruefen` und schreibt die Tabelle zurück. Die Zeile bleibt
   stehen, mit ihrer alten Fassung, bis eine Bestätigung folgt. Abgelehnte Zeilen bleiben, wie sie sind. Das ergänzt die Regel
   der Lock-Datei (Bedeutungsänderung an einem abgebildeten Ziel ist eine Ratschen-Zeile), ersetzt sie nicht.

   Der Bestand (Zeilen vor dem 22.11.2026) trägt `stufe: aufgenommen`, `vorgeschlagenVon: vivodepot-redaktion`, einen leeren
   Bestätiger und das Datum des Commits, der die Zeile einführte; die Begründung nennt diesen Commit (git show <hash>).

   Aufruf:
     node tools/zuordnungen-pruefen.js                          gegen die erfundene Fixture tests/fixtures/zuordnungen-pruefen/
     node tools/zuordnungen-pruefen.js --bezuege <pfad> [--quellen <lock>] [--quellordner <ordner>] [--fassung-neu <datensatz>]
       --quellen     Lock-Datei (Vorgabe neben --bezuege: bezuege-quellen.json)
       --quellordner Ordner der gepinnten Quelldateien (Pfade aus der Lock-Datei); ohne ihn prüft das Werkzeug nur gegen die
                     Lock-Datei, weil die Quelldateien nicht im Repository liegen.
   Exit 0 ohne Befund, 1 mit Befund, 2 bei falschem Aufruf. Probe: tests/zuordnungen-pruefen.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'zuordnungen-pruefen');
const FIXTURE_QUELLEN = path.join(FIXTURE, 'quellen');

const STUFEN = Object.freeze(['vorgeschlagen', 'mechanisch-geprueft', 'fachlich-bestaetigt', 'aufgenommen', 'strittig', 'abgelehnt', 'zu-pruefen']);
const GRADE = Object.freeze(['exakt', 'naeherung', 'eng', 'weit']);
const REDAKTION = 'vivodepot-redaktion';
const OHNE_DATUM = 'Datum der Erhebung nicht belegt';
/* Begründung des Grades: Pflicht für jede Zeile, die nach dem Bestand hinzukommt (datum nach dem Stichtag). Im Bestand steht sie
   nur, wo sie aus den Definitionen beider Seiten belegbar ist; sonst bleibt das Feld leer, statt etwas zu erfinden. */
const BESTAND_STICHTAG = '2026-11-22';
const begruendungPflicht = (z) => typeof z.datum !== 'string' || z.datum === '' || z.datum > BESTAND_STICHTAG;

/* Wer eine Zuordnung vorschlägt oder bestätigt: die Redaktion, eine Person mit ORCID oder eine Stelle mit ROR-Kennung.
   Andere Formen (Namen, Kürzel) sind ein Formatfehler: in der Tabelle steht eine Kennung, kein Name. */
const ORCID = /^(?:https:\/\/orcid\.org\/)?(\d{4}-\d{4}-\d{4}-\d{3}[\dX])$/;
const ROR = /^https:\/\/ror\.org\/(0[a-hj-km-np-tv-z0-9]{6}[0-9]{2})$/;
function stelleForm(wert) {
  if (wert === REDAKTION) return { art: 'redaktion' };
  let m = ORCID.exec(wert);
  if (m) return { art: 'orcid', id: m[1] };
  m = ROR.exec(wert);
  if (m) return { art: 'ror', id: m[1] };
  return null;
}

function isoTag(wert) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(wert));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

const gueltig = (z) => z.stufe !== 'abgelehnt';
const ort = (z) => z.kennung + ' → ' + z.datensatz + ' ' + z.ziel + ' (' + z.fassung + ')';

function formatMaengel(z) {
  const m = [];
  for (const k of ['kennung', 'datensatz', 'ziel', 'fassung', 'grad', 'stufe', 'vorgeschlagenVon']) {
    if (typeof z[k] !== 'string' || !z[k].trim()) m.push(k + ' fehlt');
  }
  if (typeof z.begruendung !== 'string') m.push('begruendung fehlt (leer im Bestand, wenn nicht belegbar)');
  else if (!z.begruendung.trim() && begruendungPflicht(z)) m.push('begruendung leer bei einer neuen Zeile (nach ' + BESTAND_STICHTAG + ')');
  if (z.stufe === 'zu-pruefen' && !String(z.begruendung || '').trim() && !String(z.kommentar || '').trim()) m.push('zu-pruefen ohne Sachsatz in kommentar oder begruendung');
  if (z.kommentar !== undefined && typeof z.kommentar !== 'string') m.push('kommentar ist kein Text');
  if (typeof z.bestaetigtVon !== 'string') m.push('bestaetigtVon fehlt (leer, wenn niemand bestätigt hat)');
  if (typeof z.datum !== 'string') m.push('datum fehlt (leer, wenn nicht belegt)');
  if (z.grad !== undefined && !GRADE.includes(z.grad)) m.push('unbekannter Grad „' + z.grad + '"');
  if (z.stufe !== undefined && !STUFEN.includes(z.stufe)) m.push('unbekannte Stufe „' + z.stufe + '"');
  if (typeof z.vorgeschlagenVon === 'string' && z.vorgeschlagenVon && !stelleForm(z.vorgeschlagenVon)) m.push('vorgeschlagenVon ist weder ' + REDAKTION + ' noch ORCID noch ROR');
  const bestaetigt = typeof z.bestaetigtVon === 'string' && z.bestaetigtVon !== '';
  if (bestaetigt && !stelleForm(z.bestaetigtVon)) m.push('bestaetigtVon ist weder ' + REDAKTION + ' noch ORCID noch ROR');
  if (bestaetigt && !isoTag(z.bestaetigtAm)) m.push('bestaetigtVon ohne bestaetigtAm (JJJJ-MM-TT)');
  if (!bestaetigt && z.bestaetigtAm !== undefined) m.push('bestaetigtAm ohne bestaetigtVon');
  if (z.stufe === 'fachlich-bestaetigt' && !bestaetigt) m.push('fachlich-bestaetigt ohne bestaetigtVon');
  if (typeof z.datum === 'string') {
    if (z.datum === '' && !String(z.begruendung || '').includes(OHNE_DATUM)) m.push('leeres datum ohne „' + OHNE_DATUM + '" in der Begründung');
    if (z.datum !== '' && !isoTag(z.datum)) m.push('datum ist kein Kalendertag JJJJ-MM-TT');
  }
  for (const [k, v] of Object.entries(z)) if (typeof v === 'string' && /[\t\r\n]/.test(v)) m.push(k + ' enthält Tabulator oder Zeilenumbruch');
  return m;
}

/* Die gepinnten Dateien einer Zeile: Vokabular-Zeilen über (vokabular, fassung), andere über (kennung = ziel, fassung). */
function gepinnteDateien(z, quelle) {
  return (quelle.dateien || []).filter((d) => (z.vokabular !== undefined
    ? d.vokabular === z.vokabular && String(d.fassung) === String(z.fassung)
    : d.kennung === z.ziel && String(d.fassung) === String(z.fassung)));
}

function pruefen({ tabelle, lock, quellOrdner = null }) {
  const befunde = [];
  const hinweise = [];
  const zeilen = (tabelle && tabelle.zeilen) || [];
  const quellen = new Map(((lock && lock.quellen) || []).map((q) => [q.datensatz, q]));
  const E = quellOrdner ? require('./bezuege-erheben.js') : null;
  const gelesen = new Map();   // pfad → { elemente } | { fehlt } (je Datei einmal gelesen)
  if (E) {
    for (const q of quellen.values()) {
      for (const d of q.dateien || []) {
        const voll = path.join(quellOrdner, d.pfad);
        if (!fs.existsSync(voll)) { gelesen.set(d.pfad, { fehlt: true }); continue; }
        if (d.sha256 && E.sha256(voll) !== d.sha256) befunde.push({ art: 'quelle-veraendert', text: q.datensatz + ' ' + d.pfad + ': SHA-256 weicht von der Lock-Datei ab' });
        gelesen.set(d.pfad, { elemente: E.quelleLesen(voll).elemente });
      }
    }
  }
  for (const z of zeilen) {
    const maengel = formatMaengel(z);
    if (maengel.length) { befunde.push({ art: 'format', text: ort(z) + ': ' + maengel.join('; ') }); continue; }
    const q = quellen.get(z.datensatz);
    if (!q) { befunde.push({ art: 'quelle-nicht-gepinnt', text: ort(z) + ': Quelle nicht gepinnt (Datensatz fehlt in der Lock-Datei)' }); continue; }
    const dateien = gepinnteDateien(z, q);
    if (!dateien.length) {
      const was = (z.vokabular !== undefined ? z.vokabular : z.ziel) + ' ' + z.fassung;
      if (z.stufe === 'zu-pruefen') hinweise.push({ art: 'alte-fassung', text: ort(z) + ': zu prüfen, ' + was + ' ist nicht mehr gepinnt' });
      else befunde.push({ art: 'quelle-nicht-gepinnt', text: ort(z) + ': Quelle nicht gepinnt (' + was + ')' });
      continue;
    }
    if (E) {
      const da = dateien.some((d) => { const g = gelesen.get(d.pfad); return g && g.elemente && Object.prototype.hasOwnProperty.call(g.elemente, z.ziel); });
      if (!da) befunde.push({ art: 'ziel-fehlt', text: ort(z) + ': steht in keiner gepinnten Datei (' + dateien.map((d) => d.pfad).join(', ') + ')' });
    }
  }
  const ok = zeilen.filter((z) => !formatMaengel(z).length);
  const dubl = new Map();
  for (const z of ok) {
    const k = [z.kennung, z.datensatz, z.ziel, z.fassung, gueltig(z) ? '+' : '-'].join('\u0000');
    dubl.set(k, (dubl.get(k) || 0) + 1);
  }
  for (const [k, n] of dubl) if (n > 1) { const [kennung, ds, ziel, fassung] = k.split('\u0000'); befunde.push({ art: 'dublette', text: kennung + ' → ' + ds + ' ' + ziel + ' (' + fassung + ') steht ' + n + '-mal da' }); }
  const exakt = new Map();
  for (const z of ok.filter((x) => gueltig(x) && x.grad === 'exakt')) {
    const k = z.kennung + '\u0000' + z.datensatz + '\u0000' + (z.vokabular !== undefined ? z.vokabular : '');
    if (!exakt.has(k)) exakt.set(k, new Set());
    exakt.get(k).add(z.ziel);
  }
  for (const [k, ziele] of exakt) if (ziele.size > 1) { const [kennung, ds, vok] = k.split('\u0000'); befunde.push({ art: 'widerspruch', text: kennung + ' zeigt mit „exakt" auf ' + ziele.size + ' Ziele in ' + ds + (vok ? ' ' + vok : '') + ': ' + [...ziele].sort().join(', ') }); }
  const abgelehnt = new Set(ok.filter((z) => !gueltig(z)).map((z) => z.kennung + '\u0000' + z.datensatz + '\u0000' + z.ziel));
  const gemeldet = new Set();
  for (const z of ok.filter(gueltig)) {
    const k = z.kennung + '\u0000' + z.datensatz + '\u0000' + z.ziel;
    if (abgelehnt.has(k) && !gemeldet.has(k)) { gemeldet.add(k); befunde.push({ art: 'widerspruch', text: ort(z) + ': gültig und zugleich abgelehnt' }); }
  }
  return { befunde, hinweise, anzahl: zeilen.length };
}

/** Neue Fassung eines Datensatzes gepinnt: betroffene Zeilen auf zu-pruefen, alte Fassung bleibt. Verändert die Eingabe nicht. */
function fassungNeu(tabelle, lock, datensatz) {
  const q = ((lock && lock.quellen) || []).find((x) => x.datensatz === datensatz);
  if (!q) throw new Error('zuordnungen-pruefen: --fassung-neu ' + datensatz + ': der Datensatz steht nicht in der Lock-Datei.');
  const neu = JSON.parse(JSON.stringify(tabelle));
  const geaendert = [];
  for (const z of neu.zeilen || []) {
    if (z.datensatz !== datensatz || z.stufe === 'abgelehnt' || z.stufe === 'zu-pruefen') continue;
    if (gepinnteDateien(z, q).length) continue;
    z.stufe = 'zu-pruefen';
    geaendert.push(ort(z));
  }
  return { tabelle: neu, geaendert };
}

const lesenJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function eingaben(argv) {
  const wert = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  const bez = wert('--bezuege');
  if (argv.includes('--bezuege') && !bez) throw new Error('--bezuege braucht einen Pfad');
  if (!bez) return { tabelle: lesenJson(path.join(FIXTURE, 'bezuege.json')), lock: lesenJson(path.join(FIXTURE, 'bezuege-quellen.json')), bezuegePfad: path.join(FIXTURE, 'bezuege.json') };
  const bezuegePfad = path.resolve(bez);
  const lockPfad = wert('--quellen') ? path.resolve(wert('--quellen')) : path.join(path.dirname(bezuegePfad), 'bezuege-quellen.json');
  const e = { tabelle: lesenJson(bezuegePfad), lock: lesenJson(lockPfad), bezuegePfad };
  if (wert('--quellordner')) e.quellOrdner = path.resolve(wert('--quellordner'));
  return e;
}

module.exports = { STUFEN, GRADE, REDAKTION, OHNE_DATUM, BESTAND_STICHTAG, stelleForm, isoTag, formatMaengel, gepinnteDateien, pruefen, fassungNeu, eingaben, FIXTURE, FIXTURE_QUELLEN };

if (require.main === module) {
  const argv = process.argv.slice(2);
  let e;
  try { e = eingaben(argv); } catch (err) { console.error('zuordnungen-pruefen: ' + err.message); process.exit(2); }
  const i = argv.indexOf('--fassung-neu');
  if (i >= 0) {
    if (!argv[i + 1]) { console.error('zuordnungen-pruefen: --fassung-neu braucht einen Datensatz'); process.exit(2); }
    const { tabelle, geaendert } = fassungNeu(e.tabelle, e.lock, argv[i + 1]);
    for (const g of geaendert) console.log('ZU PRÜFEN ' + g);
    if (geaendert.length) fs.writeFileSync(e.bezuegePfad, JSON.stringify(tabelle, null, 2) + '\n');
    console.log('[zuordnungen] ' + geaendert.length + ' Zeile(n) auf zu-pruefen gesetzt' + (geaendert.length ? ' und ' + e.bezuegePfad + ' geschrieben' : ''));
    e.tabelle = tabelle;
  }
  const r = pruefen(e);
  for (const h of r.hinweise) console.log('HINWEIS ' + h.art + ': ' + h.text);
  for (const b of r.befunde) console.log('BEFUND ' + b.art + ': ' + b.text);
  console.log('[zuordnungen] ' + r.anzahl + ' Zeilen · ' + (r.befunde.length ? r.befunde.length + ' Befund(e)' : 'ohne Befund'));
  process.exitCode = r.befunde.length ? 1 : 0;
}
