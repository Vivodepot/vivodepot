#!/usr/bin/env node
'use strict';
/* bereich-eigenschaften-lesestellen-messen.js — welche Eigenschaften einer Bereichsdefinition liest der Kern, und wo?
   (Befund DATEI-BEREICH-AUSGEBLENDET und der Mitschrift-Weg seit v926, 11.10.2026)

   Ein Bereich „aus der Datei“ (nicht als ausgeliefert erkannt) wird gezeigt, verliert aber am Bereich selbst alle Eigenschaften
   mit Wirkung über das Anzeigen hinaus (_bereichAusDateiSchlicht). Abschnitte, Felder, Unterfelder und Optionen gehen dagegen
   unverändert durch: _templateFeldMitTexten kopiert ein Feld als Ganzes. Dieses Werkzeug erhebt je Eigenschaft auf diesen Ebenen,
   in welchen Funktionen des Kerns sie gelesen wird, damit je Eigenschaft entschieden werden kann, ob sie mehr tut als zeigen und
   Eingabe annehmen. Es misst nur und schreibt nichts in den Baum.

   EIGENSCHAFTEN: jede, die in einer Bereichsdefinition des Repos an Abschnitt, Feld, Unterfeld oder Option vorkommt
   (tools/bereich-templates, tools/vivodepot-bereiche-bekannt.json, tools/berufsmodule, tools/behandlungsweg-bereich-modul.json),
   dazu die zwei Schlüssellisten des Kerns für Vorlagen-Felder (_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL,
   _TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL) und die Schlüssel am Modul (BEREICH_MODUL_SCHLUESSEL).
   LESESTELLEN: Zeilen im Code des Kerns (ohne Kommentare und Zeichenketten), an denen `.eigenschaft` gelesen wird, mit der
   umschließenden Funktion. Der Name allein sagt nicht, dass dort ein Bereichs-Feld gelesen wird (derselbe Name kommt an anderen
   Objekten vor); die Liste ist die Obermenge, an der gelesen und entschieden wird.

   Aufruf:  node tools/bereich-eigenschaften-lesestellen-messen.js [--aus <datei>] [--eigenschaft <name>]
   Probe: tests/bereich-eigenschaften-lesestellen-messen.test.js. */
const fs = require('node:fs');
const path = require('node:path');
const { nurCode } = require('./lese-app-depot-speicher-messen.js');

const REPO = path.join(__dirname, '..');
const arg = (a, n, s) => { const i = a.indexOf('--' + n); return i >= 0 && a[i + 1] ? a[i + 1] : s; };
const reinesObjekt = (w) => !!w && typeof w === 'object' && !Array.isArray(w);

/* Die Bereichsdefinitionen einer JSON-Datei: aus Modulen (modulTyp bereich/bereichsErsatz) und aus der Form { neu: {…} }. */
function definitionenAus(wurzel) {
  const raus = [];
  const gehe = (w) => {
    if (Array.isArray(w)) { w.forEach(gehe); return; }
    if (!reinesObjekt(w)) return;
    if (w.modulTyp === 'bereich' && reinesObjekt(w.bereiche)) raus.push(...Object.values(w.bereiche).filter(reinesObjekt));
    else if (reinesObjekt(w.neu) && Object.values(w.neu).every((d) => reinesObjekt(d) && Array.isArray(d.sektionen))) raus.push(...Object.values(w.neu));
    for (const k of Object.keys(w)) gehe(w[k]);
  };
  gehe(wurzel);
  return raus;
}
/* Die Eigenschaftsnamen je Ebene in einer Menge von Definitionen. */
function eigenschaftenJeEbene(definitionen) {
  const e = { abschnitt: new Set(), feld: new Set(), unterfeld: new Set(), option: new Set() };
  const optionen = (liste) => { for (const o of (Array.isArray(liste) ? liste : [])) if (reinesObjekt(o)) Object.keys(o).forEach((k) => e.option.add(k)); };
  for (const d of definitionen) for (const s of (Array.isArray(d.sektionen) ? d.sektionen : [])) {
    if (!reinesObjekt(s)) continue;
    Object.keys(s).forEach((k) => e.abschnitt.add(k));
    for (const f of (Array.isArray(s.felder) ? s.felder : [])) {
      if (!reinesObjekt(f)) continue;
      Object.keys(f).forEach((k) => e.feld.add(k));
      optionen(f.optionen);
      for (const u of (Array.isArray(f.unterFelder) ? f.unterFelder : [])) {
        if (!reinesObjekt(u)) continue;
        Object.keys(u).forEach((k) => e.unterfeld.add(k));
        optionen(u.optionen);
      }
    }
  }
  return e;
}
/* Eine Liste von Zeichenketten aus einer Konstante des Kerns: const NAME = …[ 'a', 'b', … ]…; */
function schluesselListe(kern, name) {
  const a = kern.indexOf('const ' + name + ' = ');
  if (a < 0) return [];
  const ende = kern.indexOf('\n', kern.indexOf(']', a));
  return (kern.slice(a, ende).replace(/\/\/[^\n]*/g, '').match(/'([A-Za-z_][A-Za-z0-9_]*)'/g) || []).map((x) => x.slice(1, -1));
}
/* Je Eigenschaft: Zeilen und umschließende Funktionen im Code des Kerns. */
function lesestellenImKern(kern, eigenschaften) {
  const code = nurCode(kern);
  const zeilenAnfang = [0];
  for (let i = code.indexOf('\n'); i >= 0; i = code.indexOf('\n', i + 1)) zeilenAnfang.push(i + 1);
  const zeileVon = (pos) => { let lo = 0, hi = zeilenAnfang.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (zeilenAnfang[m] <= pos) lo = m; else hi = m - 1; } return lo + 1; };
  const funktionen = [];
  const fn = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  for (let m = fn.exec(code); m; m = fn.exec(code)) funktionen.push({ name: m[1], pos: m.index });
  const funktionVon = (pos) => { let lo = 0, hi = funktionen.length - 1, r = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (funktionen[m].pos <= pos) { r = funktionen[m].name; lo = m + 1; } else hi = m - 1; } return r; };
  const raus = {};
  for (const e of eigenschaften) {
    const re = new RegExp('\\.' + e.replace(/[$]/g, '\\$') + '\\b(?!\\s*[:(])', 'g');
    const je = new Map();
    let n = 0;
    for (let m = re.exec(code); m; m = re.exec(code)) { n++; const f = funktionVon(m.index) || '(oberste Ebene)'; if (!je.has(f)) je.set(f, zeileVon(m.index)); }
    raus[e] = { lesestellen: n, funktionen: [...je].map(([name, zeile]) => ({ name, zeile })) };
  }
  return raus;
}

function main() {
  const a = process.argv.slice(2);
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const quellen = fs.readdirSync(path.join(REPO, 'tools', 'bereich-templates')).filter((f) => f.endsWith('.json')).map((f) => path.join('tools', 'bereich-templates', f))
    .concat(fs.readdirSync(path.join(REPO, 'tools', 'berufsmodule')).filter((f) => /bereich.*\.json$/.test(f)).map((f) => path.join('tools', 'berufsmodule', f)))
    .concat(['tools/vivodepot-bereiche-bekannt.json', 'tools/behandlungsweg-bereich-modul.json'].filter((f) => fs.existsSync(path.join(REPO, f))));
  const definitionen = quellen.flatMap((q) => definitionenAus(JSON.parse(fs.readFileSync(path.join(REPO, q), 'utf8'))));
  const ebenen = eigenschaftenJeEbene(definitionen);
  const kernListen = { feld: schluesselListe(kern, '_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL'), unterfeld: schluesselListe(kern, '_TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL'), modul: schluesselListe(kern, 'BEREICH_MODUL_SCHLUESSEL') };
  const alle = new Map();
  const merke = (name, ebene) => { if (!alle.has(name)) alle.set(name, new Set()); alle.get(name).add(ebene); };
  for (const ebene of Object.keys(ebenen)) for (const k of ebenen[ebene]) merke(k, ebene);
  for (const k of kernListen.feld) merke(k, 'feld (Schlüsselliste des Kerns)');
  for (const k of kernListen.unterfeld) merke(k, 'unterfeld (Schlüsselliste des Kerns)');
  for (const k of kernListen.modul) merke(k, 'modul');
  const nur = arg(a, 'eigenschaft', null);
  const namen = [...alle.keys()].filter((k) => !nur || k === nur).sort();
  const stellen = lesestellenImKern(kern, namen);
  const ergebnis = { quellen: quellen.length, definitionen: definitionen.length, eigenschaften: namen.map((k) => Object.assign({ name: k, ebenen: [...alle.get(k)].sort() }, stellen[k])) };
  const aus = arg(a, 'aus', null);
  if (aus) fs.writeFileSync(path.resolve(aus), JSON.stringify(ergebnis, null, 1) + '\n');
  console.log('bereich-eigenschaften: ' + definitionen.length + ' Definitionen aus ' + quellen.length + ' Dateien, ' + namen.length + ' Eigenschaften an Abschnitt, Feld, Unterfeld, Option und Modul.');
  for (const e of ergebnis.eigenschaften) console.log('  ' + String(e.lesestellen).padStart(4) + '  ' + e.name + '  [' + e.ebenen.join('; ') + ']  ' + e.funktionen.slice(0, nur ? 200 : 6).map((f) => f.name + ':' + f.zeile).join(', ') + (!nur && e.funktionen.length > 6 ? ' … +' + (e.funktionen.length - 6) : ''));
}

if (require.main === module) main();
module.exports = { definitionenAus, eigenschaftenJeEbene, schluesselListe, lesestellenImKern };
