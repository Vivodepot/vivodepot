#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rezept-fingerabdruecke-erheben — woran ein Produkt erkennt, dass ein Modul aus einem
   Vivodepot-Rezept stammt, auch aus dem eines ANDEREN Produkts
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (04.10.2026, Selbst-Einlass-Sperre): was beim Öffnen einer Datei mitreist und nicht
   ab Werk ist, wird nicht angemeldet. „Ab Werk“ hieß zuerst: inhaltsgleich mit der Saat DIESES
   Produkts. Eine Privat-Datei bringt aber die Auszüge Erbschein und Zugang mit, die im Pro-Produkt
   nicht gebacken sind (B13, ein geschlossener HOCH-Befund), und ein englisches Depot im deutschen
   Produkt seine Mitschrift. Entscheidung der Gegenlesung: „ab Werk“ heißt inhaltsgleich mit einer
   Nutzlast IRGENDEINES Vivodepot-Rezepts.

   DIE QUELLE IST DIESELBE WIE BEI DER AUSLIEFERUNG: `PRODUKTE` und `modulDateienFuer` aus
   tools/lib/vier-produkte.js (dieselbe Liste, die konfektioniert und kern-ausliefern backen). Ein
   fünftes Produkt kommt von selbst hinein. Je Moduldatei: SHA-256 über die kanonische JSON-Form
   (Schlüssel sortiert, wie `_kanonischJSON` im Kern) OHNE die Felder, die der Einlassweg selbst ans
   Modul schreibt (`_EINLASS_META_FELDER` im Kern). Ein Feld im Modul, das einen Fingerabdruck
   BEHAUPTET, liest niemand — gezählt wird nur, was der Kern selbst rechnet.

   DIE REGION STEHT IM GERÜST (nicht in einer Ab-Werk-Region des Produkts): sie ist für alle Produkte
   gleich und Teil des ausgelieferten Codes; kein Modul und keine Mitschrift kann sie ergänzen.

   ZWEITER TRÄGER: die Lese-App (Region REZEPT-FINGERABDRUECKE-LESEN, dieselbe Menge). Sie entscheidet damit wie der
   Kern nach Inhalt, ob ein Modul der Datei ab Werk ist — für die Schutzliste und für die Herkunftsanzeige.
   --check und --schreiben behandeln beide Träger.

   Aufruf:
     node tools/rezept-fingerabdruecke-erheben.js [--datei <kern>] [--lese <lese-app>] [--json|--check|--schreiben]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const BEGIN = '/* REZEPT-FINGERABDRUECKE-KERN:BEGIN — generierter Bereich (tools/rezept-fingerabdruecke-erheben.js) */';
const ENDE = '/* REZEPT-FINGERABDRUECKE-KERN:END */';
const LESE = path.join(REPO, 'vivodepot-lesen.html');
const TRAEGER = Object.freeze({
  kern: Object.freeze({ begin: BEGIN, ende: ENDE, konstante: 'REZEPT_FINGERABDRUECKE_KERN', anker: '/* SCHUTZ-SCHLUESSEL-KERN:END */' }),
  lese: Object.freeze({ begin: '/* REZEPT-FINGERABDRUECKE-LESEN:BEGIN — generierter Bereich (tools/rezept-fingerabdruecke-erheben.js) */',
    ende: '/* REZEPT-FINGERABDRUECKE-LESEN:END */', konstante: 'REZEPT_FINGERABDRUECKE_LESEN', anker: '/* SCHUTZ-SCHLUESSEL-LESEN:END */' }),
});
/* Wörtlicher Spiegel von `_EINLASS_META_FELDER` im Kern — die Probe tests/rezept-fingerabdruecke.test.js hält beide gleich. */
const EINLASS_META_FELDER = Object.freeze(['ungeprueft', 'eingelassenAm', 'anbieterIdGeprueft', 'beleg', 'abWerk', 'pruefstufe', 'anbieterId']);

/* Wörtlicher Spiegel von `_kanonischJSON` im Kern (dieselbe Probe vergleicht beide an Stichproben). */
function kanonischJSON(x) {
  if (Array.isArray(x)) return '[' + x.map(kanonischJSON).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + kanonischJSON(x[k])).join(',') + '}';
  return JSON.stringify(x === undefined ? null : x);
}
function fingerabdruck(modul) {
  const kopie = Object.assign({}, modul);
  for (const f of EINLASS_META_FELDER) delete kopie[f];
  return crypto.createHash('sha256').update(kanonischJSON(kopie), 'utf8').digest('hex');
}

function rezeptDateien() {
  const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');
  const dateien = new Set();
  for (const p of PRODUKTE) for (const f of modulDateienFuer(p)) if (f) dateien.add(path.resolve(f));
  return [...dateien].sort();
}

function erheben() {
  const abdruecke = new Set();
  const quellen = [];
  for (const datei of rezeptDateien()) {
    if (!fs.existsSync(datei)) throw new Error('rezept-fingerabdruecke: Rezeptdatei fehlt: ' + path.relative(REPO, datei));
    const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
    const module = Array.isArray(roh) ? roh : [roh];
    for (const m of module) {
      if (!m || typeof m !== 'object') continue;
      abdruecke.add(fingerabdruck(m));
      quellen.push(path.relative(REPO, datei));
    }
  }
  return { abdruecke: [...abdruecke].sort(), quellen: [...new Set(quellen)].sort() };
}

function region(abdruecke, t) {
  t = t || TRAEGER.kern;
  return t.begin + '\nconst ' + t.konstante + ' = new Set(' + JSON.stringify(abdruecke).replace(/","/g, '",\n  "').replace(/^\[/, '[\n  ').replace(/\]$/, '\n]') + ');\n' + t.ende;
}
function alteAus(kern, t) {
  t = t || TRAEGER.kern;
  const a = kern.indexOf(t.begin); const e = kern.indexOf(t.ende);
  if (a < 0 || e < a) return null;
  const m = kern.slice(a, e).match(/new Set\((\[[\s\S]*\])\)/);
  return m ? JSON.parse(m[1]) : null;
}
function regionErsetzen(kern, neu, t) {
  t = t || TRAEGER.kern;
  const a = kern.indexOf(t.begin); const e = kern.indexOf(t.ende);
  if (a >= 0 && e > a) return kern.slice(0, a) + neu + kern.slice(e + t.ende.length);
  const i = kern.indexOf(t.anker);
  if (i < 0) throw new Error('rezept-fingerabdruecke: weder die eigene Region noch der Anker ' + t.anker + ' gefunden.');
  return kern.slice(0, i + t.anker.length) + '\n' + neu + kern.slice(i + t.anker.length);
}
/* Für kern-ausliefern: passt die Region im auszuliefernden Kern zu den Rezepten? Wirft mit Nennung, sonst true. */
function pruefen(kernText) {
  const soll = erheben().abdruecke;
  const ist = alteAus(kernText);
  if (!ist) throw new Error('rezept-fingerabdruecke: die Region REZEPT-FINGERABDRUECKE-KERN fehlt im Kern.');
  const fehlt = soll.filter((x) => !ist.includes(x));
  const zuviel = ist.filter((x) => !soll.includes(x));
  if (fehlt.length || zuviel.length) {
    throw new Error('rezept-fingerabdruecke: die Region passt nicht zu den Rezepten (' + fehlt.length + ' fehlen, ' + zuviel.length
      + ' zu viel) — node tools/rezept-fingerabdruecke-erheben.js --schreiben, dann neu bauen.');
  }
  return true;
}

function main() {
  const a = process.argv.slice(2);
  const arg = (n, s) => { const i = a.indexOf('--' + n); return i >= 0 && a[i + 1] ? a[i + 1] : s; };
  const ziele = [{ datei: path.resolve(arg('datei', KERN)), t: TRAEGER.kern }, { datei: path.resolve(arg('lese', LESE)), t: TRAEGER.lese }];
  let r;
  try { r = erheben(); } catch (e) { console.error(e.message); process.exit(1); }
  if (a.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
  for (const z of ziele) {
    z.text = fs.readFileSync(z.datei, 'utf8');
    z.neu = regionErsetzen(z.text, region(r.abdruecke, z.t), z.t);
    z.drift = z.neu !== z.text;
  }
  if (a.includes('--check')) {
    const ab = ziele.filter((z) => z.drift);
    if (ab.length) { console.error('rezept-fingerabdruecke: die Region in ' + ab.map((z) => path.basename(z.datei)).join(', ') + ' weicht von den Rezepten ab. Beheben mit: npm run rezepte:fingerabdruecke'); process.exit(1); }
    console.log('rezept-fingerabdruecke: ' + r.abdruecke.length + ' Fingerabdrücke aus ' + r.quellen.length + ' Rezeptdateien — passt.');
    return;
  }
  if (a.includes('--schreiben')) {
    for (const z of ziele) if (z.drift) fs.writeFileSync(z.datei, z.neu, 'utf8');
    const geschrieben = ziele.filter((z) => z.drift).map((z) => path.basename(z.datei));
    console.log('rezept-fingerabdruecke: ' + r.abdruecke.length + ' Fingerabdrücke aus ' + r.quellen.length + ' Rezeptdateien — ' + (geschrieben.length ? 'geschrieben: ' + geschrieben.join(', ') + '.' : 'nichts zu tun.'));
    return;
  }
  console.log('Rezept-Fingerabdrücke: ' + r.abdruecke.length + ' aus ' + r.quellen.length + ' Dateien');
}

if (require.main === module) main();
module.exports = { erheben, region, regionErsetzen, alteAus, pruefen, fingerabdruck, kanonischJSON, EINLASS_META_FELDER, BEGIN, ENDE, TRAEGER, KERN, LESE };
