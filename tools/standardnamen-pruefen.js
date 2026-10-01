#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════
   standardnamen-pruefen.js — kein Standardname ohne Registerzeile mit Prüfer (30.09.2026)
   ───────────────────────────────────────────────────────────────────────────────────────
   ANLASS: Der Exportweg der Verwaltungsdaten hieß „XÖV (Verwaltung)“ — in STANDARDS.md, im
   Format-Kürzel, im Hinweis der Ausgabedatei. Er erzeugte nie XÖV: nach belegter Suche über alle
   Standards des XRepository trägt keiner diese Daten. Der Name stand da, weil nichts ihn an einen
   Prüfer band. Dazu belegte die Rollencode-Liste den Namensraum urn:xoev-de, der der KoSIT gehört.

   WAS ES PRÜFT: Jeder Name aus tools/standardnamen-schutz.json, der in einem Außentext oder einer
   Ausgabe steht, braucht eine Zeile im Standards-Register (tools/standards-register/*.json), deren
   Familie einen Adapter hat. Namen, die heute schon ohne solche Zeile dastehen, führt
   tools/standardnamen-grundlinie.json mit ihrer Fundzahl; die Zahl darf nur sinken, und ein Name
   ohne Eintrag darf gar nicht auftauchen. Code-Kommentare zählen nicht — nur was ein Mensch
   draußen liest: Dokumente, Textsätze, Ausgabe-Literale des Kerns, Format-Kürzel, Code-Listen-Kennungen.

   Aufruf:
     node tools/standardnamen-pruefen.js                       Repo gegen Grundlinie; Exit 1 bei Abweichung
     node tools/standardnamen-pruefen.js --dokument <pfad>     zusätzlich eine Datei als Außentext prüfen
     node tools/standardnamen-pruefen.js --json                Funde als JSON
   ═══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SCHUTZ = path.join(REPO, 'tools', 'standardnamen-schutz.json');
const GRUNDLINIE = path.join(REPO, 'tools', 'standardnamen-grundlinie.json');
const REGISTER_DIR = path.join(REPO, 'tools', 'standards-register');

function dateien(muster, wurzel) {
  const stern = muster.indexOf('*');
  if (stern < 0) return fs.existsSync(path.join(wurzel, muster)) ? [muster] : [];
  const ordner = path.dirname(muster);
  const endung = muster.slice(stern + 1);
  const voll = path.join(wurzel, ordner);
  if (!fs.existsSync(voll)) return [];
  return fs.readdirSync(voll).filter((f) => f.endsWith(endung)).sort().map((f) => ordner + '/' + f);
}

/* Die Texte, die draußen gelesen werden, je mit Ort. */
function texteSammeln(schutz, wurzel) {
  const o = schutz.orte;
  const lies = (r) => fs.readFileSync(path.join(wurzel, r), 'utf8');
  const texte = [];
  for (const m of o.dokumente) for (const r of dateien(m, wurzel)) texte.push({ ort: r, text: lies(r) });
  for (const r of o.textsaetze) {
    const j = JSON.parse(lies(r));
    const werte = j.texte || j.eintraege || j;
    for (const [k, v] of Object.entries(werte)) if (typeof v === 'string') texte.push({ ort: r + '#' + k, text: v });
  }
  const kern = lies(o.kernAusgaben);
  const literal = /\b(_hinweis|standard|nachrichtentyp|fimSchema)\s*:\s*'([^'\n]*)'/g;
  for (const t of kern.matchAll(literal)) texte.push({ ort: o.kernAusgaben + '#' + t[1], text: t[2] });
  const formate = /const SEKTOR_FORMATE = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(kern);
  if (formate) for (const t of formate[1].matchAll(/'([^']*)'/g)) texte.push({ ort: o.kernAusgaben + '#SEKTOR_FORMATE', text: t[1] });
  for (const r of dateien(o.bereichsVorlagen, wurzel)) {
    const j = JSON.parse(lies(r));
    for (const b of Object.values(j.bereiche || {})) if (b && typeof b.format === 'string') texte.push({ ort: r + '#format', text: b.format });
  }
  for (const r of dateien(o.codeListen, wurzel)) {
    const j = JSON.parse(lies(r));
    for (const k of ['uri', 'kuerzel']) if (typeof j[k] === 'string') texte.push({ ort: r + '#' + k, text: j[k] });
  }
  return texte;
}

function gedeckteNamen(schutz, registerDir) {
  const mitPruefer = new Set();
  for (const f of fs.readdirSync(registerDir).filter((x) => x.endsWith('.json'))) {
    const fam = JSON.parse(fs.readFileSync(path.join(registerDir, f), 'utf8'));
    if (!fam.adapter) continue;
    for (const s of fam.standards || []) mitPruefer.add(s.id);
  }
  return new Set(schutz.namen.filter((n) => n.register.some((id) => mitPruefer.has(id))).map((n) => n.name));
}

/* Zählt je ungedecktem Namen die Fundstellen. */
function zaehlen(schutz, texte, gedeckt) {
  const funde = {};
  for (const n of schutz.namen) {
    if (gedeckt.has(n.name)) continue;
    const re = new RegExp(n.muster, 'gu');
    for (const t of texte) {
      const k = (t.text.match(re) || []).length;
      if (!k) continue;
      (funde[n.name] = funde[n.name] || { zahl: 0, orte: [] }).zahl += k;
      funde[n.name].orte.push(t.ort);
    }
  }
  return funde;
}

/* Vergleich mit der Grundlinie: mehr als erlaubt ist rot, weniger verlangt das Senken.
   Im öffentlichen Stand (01.10.2026, Schalter nurObergrenze; der Test setzt ihn mit istOeffentlich aus
   tests/helfer/nur-privat.js) gilt nur die Obergrenze: dort fehlt ein Teil des Bestands (etwa docs/spec), das Ist
   liegt darum unter dem Deckel, ohne dass ein Fund verschwunden wäre. Der öffentliche Stand entsteht nur aus dem privaten,
   und dort fängt die volle Prüfung jedes Wachstum und verlangt das Senken. Öffentlich bleibt rot: eine neue Fundstelle. */
function urteil(funde, grundlinie, { nurObergrenze = false } = {}) {
  const maengel = [];
  const namen = new Set([...Object.keys(funde), ...Object.keys(grundlinie)]);
  for (const n of [...namen].sort()) {
    const ist = funde[n] ? funde[n].zahl : 0;
    const soll = grundlinie[n] || 0;
    if (ist > soll) maengel.push(n + ': ' + ist + ' Fundstellen ohne Registerzeile mit Prüfer, erlaubt ' + soll + ' (' + [...new Set(funde[n].orte)].slice(0, 5).join(', ') + ')');
    else if (ist < soll && !nurObergrenze) maengel.push(n + ': Deckel ' + soll + ' steht über dem Ist ' + ist + ' — in tools/standardnamen-grundlinie.json senken');
  }
  return maengel;
}

function pruefen({ wurzel = REPO, extraDokumente = [], nurObergrenze = false } = {}) {
  const schutz = JSON.parse(fs.readFileSync(SCHUTZ, 'utf8'));
  const texte = texteSammeln(schutz, wurzel);
  for (const p of extraDokumente) texte.push({ ort: p, text: fs.readFileSync(p, 'utf8') });
  const funde = zaehlen(schutz, texte, gedeckteNamen(schutz, path.join(wurzel, 'tools', 'standards-register')));
  const grundlinie = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')).namen;
  return { funde, maengel: urteil(funde, grundlinie, { nurObergrenze }) };
}

module.exports = { texteSammeln, gedeckteNamen, zaehlen, urteil, pruefen };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const extra = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--dokument') extra.push(argv[++i]);
  const r = pruefen({ extraDokumente: extra });
  if (argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else if (r.maengel.length) console.log('standardnamen-pruefen: ROT\n  ' + r.maengel.join('\n  '));
  else console.log('standardnamen-pruefen: grün');
  process.exit(r.maengel.length ? 1 : 0);
}
