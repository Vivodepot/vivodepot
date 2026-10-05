#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ist ein veröffentlichtes FHIR-Paket aus einem bestimmten Quell-Stand gebaut? (U2-ADR-468)
   ────────────────────────────────────────────────────────────────────────
   Ein Paket darf nur ins Manifest, wenn seine Herkunft aus einem Repo mit belegter Lizenz nachgewiesen ist (Lizenzentscheid
   vom 01.10.2026). Die Registry nennt kein Repo, und der Name im Repo kann vom Paketnamen abweichen (ISiK 6.0.0: Paket
   `de.gematik.isik`, im Tag `de.gematik.isik-basismodul`). Dieses Werkzeug vergleicht darum den Inhalt.

   WAS VERGLICHEN WIRD: ausgehend von den Start-Ressourcen (die Profile, die der Export beansprucht) die Hülle aller
   Ressourcen DESSELBEN Pakets, auf die sie verweisen — Profile, Extensions, ValueSets, CodeSystems. Je Ressource der Inhalt,
   den ein Autor schreibt, nicht das, was der Paketbau ergänzt:
     · StructureDefinition: url, type, baseDefinition, derivation und `differential` (kein snapshot, kein text)
     · ValueSet: url und `compose`
     · CodeSystem: url, content und die Konzepte (code, display, definition, Unterkonzepte)
   Ressourcen aus anderen Paketen (Abhängigkeiten) stehen als „außerhalb“ im Ergebnis; sie haben ihre eigene Herkunft.

   ERGEBNIS: gleich (Exit 0) · ungleich, fehlt in der Quelle, Start nicht im Paket (Exit 1) · Aufruffehler (Exit 2).
   Schon EINE Abweichung heißt ungleich — eine teilweise belegte Herkunft ist keine.

   ZWEITE FORM, für Terminologie, deren Quelle FSH ist: `--codes <system|code>[,…]` vergleicht nur diese Konzepte (Code und
   display) zwischen Paket und Quelle. CodeSystems in der Quelle dürfen JSON oder FSH sein (`CodeSystem:` mit `^url` und
   `* #code "display"`). Gleich heißt: jedes genannte Konzept steht in beiden, mit wörtlich demselben display.

   Aufruf:  node tools/fhir-paket-herkunft-vergleichen.js --paket <entpacktes Paket> --quelle <Verzeichnis im Tag> --start <url>[,<url>…] [--json]
            node tools/fhir-paket-herkunft-vergleichen.js --paket <…> --quelle <…> --codes <system|code>[,…] [--json]
   Ohne Argumente läuft es gegen die Fixture tests/fixtures/paket-herkunft/ (damit die Suite es prüft).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE = path.join(__dirname, '..', 'tests', 'fixtures', 'paket-herkunft');
const FIXTURE_START = ['https://example.org/fhir/StructureDefinition/BeispielDokument'];
const ARTEN = new Set(['StructureDefinition', 'ValueSet', 'CodeSystem']);

// Alle FHIR-Ressourcen der drei Arten unter einem Verzeichnis, nach kanonischer URL.
function ressourcenLesen(wurzel) {
  const nachUrl = new Map();
  (function lauf(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { lauf(p); continue; }
      if (!e.name.endsWith('.json')) continue;
      let r;
      try { r = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { continue; }
      if (r && ARTEN.has(r.resourceType) && typeof r.url === 'string') nachUrl.set(r.url, { r, datei: p });
    }
  })(wurzel);
  return nachUrl;
}

const ohneVersion = (u) => String(u).split('|')[0];

// Konzepte je CodeSystem-URL aus JSON-Ressourcen und FSH-Dateien: Map url -> Map code -> display.
const FSH_DEFINITION = /^(CodeSystem|ValueSet|Profile|Extension|Instance|Alias|RuleSet|Logical|Resource|Invariant|Mapping):/;
function konzepteLesen(wurzel) {
  const nachUrl = new Map();
  const merken = (url, code, display) => {
    if (!nachUrl.has(url)) nachUrl.set(url, new Map());
    nachUrl.get(url).set(code, display == null ? null : display);
  };
  for (const [url, { r }] of ressourcenLesen(wurzel)) {
    if (r.resourceType !== 'CodeSystem') continue;
    (function lauf(cc) { for (const c of (cc || [])) { merken(url, c.code, c.display); lauf(c.concept); } })(r.concept);
  }
  (function lauf(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { lauf(p); continue; }
      if (!e.name.endsWith('.fsh')) continue;
      let imCs = false; let url = null; const offen = [];
      const abschliessen = () => { if (url) for (const [c, d] of offen) merken(url, c, d); url = null; offen.length = 0; };
      for (const zeile of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        if (FSH_DEFINITION.test(zeile)) { abschliessen(); imCs = /^CodeSystem:/.test(zeile); continue; }
        if (!imCs) continue;
        const u = /^\s*\*\s*\^url\s*=\s*"([^"]+)"/.exec(zeile);
        if (u) { url = u[1]; continue; }
        const k = /^\s*\*\s+#(?:"([^"]+)"|([^\s"]+))(?:\s+"((?:[^"\\]|\\.)*)")?/.exec(zeile);
        if (k) offen.push([k[1] || k[2], k[3] == null ? null : k[3].replace(/\\"/g, '"')]);
      }
      abschliessen();
    }
  })(wurzel);
  return nachUrl;
}
function codesVergleichen(paketDir, quelleDir, codes) {
  const paket = konzepteLesen(paketDir);
  const quelle = konzepteLesen(quelleDir);
  const ergebnis = { gleich: [], ungleich: [], fehltInQuelle: [], startFehlt: [], ausserhalb: [] };
  for (const sc of codes) {
    const i = sc.lastIndexOf('|');
    const system = sc.slice(0, i); const code = sc.slice(i + 1);
    const p = paket.get(system); const q = quelle.get(system);
    if (!p || !p.has(code)) { ergebnis.startFehlt.push(sc); continue; }
    if (!q || !q.has(code)) { ergebnis.fehltInQuelle.push(sc); continue; }
    (p.get(code) === q.get(code) ? ergebnis.gleich : ergebnis.ungleich).push(sc + (p.get(code) === q.get(code) ? '' : ' (' + JSON.stringify(p.get(code)) + ' ≠ ' + JSON.stringify(q.get(code)) + ')'));
  }
  for (const k of Object.keys(ergebnis)) ergebnis[k].sort();
  ergebnis.urteil = (ergebnis.ungleich.length || ergebnis.fehltInQuelle.length || ergebnis.startFehlt.length || !ergebnis.gleich.length) ? 'ungleich' : 'gleich';
  return ergebnis;
}

// Schlüssel sortiert, damit die Reihenfolge der Eigenschaften nicht als Unterschied zählt.
function sortiert(x) {
  if (Array.isArray(x)) return x.map(sortiert);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortiert(x[k])]));
  return x;
}
function konzepte(liste) {
  return (liste || []).map((c) => ({ code: c.code, display: c.display, definition: c.definition, concept: konzepte(c.concept) }))
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
}
// Der Inhalt, den ein Autor schreibt — der Vergleichsgegenstand.
function kern(r) {
  if (r.resourceType === 'StructureDefinition') {
    return sortiert({ url: r.url, type: r.type, baseDefinition: r.baseDefinition, derivation: r.derivation,
      differential: (r.differential && r.differential.element) || [] });
  }
  if (r.resourceType === 'ValueSet') return sortiert({ url: r.url, compose: r.compose || null });
  return sortiert({ url: r.url, content: r.content, concept: konzepte(r.concept) });
}

// Die kanonischen URLs, auf die eine Ressource verweist.
function verweise(r) {
  const aus = new Set();
  if (r.resourceType === 'StructureDefinition') {
    if (r.baseDefinition) aus.add(ohneVersion(r.baseDefinition));
    for (const el of ((r.differential && r.differential.element) || [])) {
      for (const t of (el.type || [])) {
        for (const p of (t.profile || [])) aus.add(ohneVersion(p));
        for (const p of (t.targetProfile || [])) aus.add(ohneVersion(p));
      }
      if (el.binding && el.binding.valueSet) aus.add(ohneVersion(el.binding.valueSet));
    }
  } else if (r.resourceType === 'ValueSet') {
    for (const teil of [...(((r.compose || {}).include) || []), ...(((r.compose || {}).exclude) || [])]) {
      if (teil.system) aus.add(ohneVersion(teil.system));
      for (const v of (teil.valueSet || [])) aus.add(ohneVersion(v));
    }
  }
  return aus;
}

function vergleichen(paketDir, quelleDir, start) {
  const paket = ressourcenLesen(paketDir);
  const quelle = ressourcenLesen(quelleDir);
  const ergebnis = { gleich: [], ungleich: [], fehltInQuelle: [], startFehlt: [], ausserhalb: [] };
  const besucht = new Set();
  const schlange = start.map(ohneVersion);
  for (const s of schlange) if (!paket.has(s)) ergebnis.startFehlt.push(s);
  while (schlange.length) {
    const url = schlange.shift();
    if (besucht.has(url)) continue;
    besucht.add(url);
    const p = paket.get(url);
    if (!p) { if (!ergebnis.startFehlt.includes(url)) ergebnis.ausserhalb.push(url); continue; }
    const q = quelle.get(url);
    if (!q) ergebnis.fehltInQuelle.push(url);
    else if (JSON.stringify(kern(p.r)) === JSON.stringify(kern(q.r))) ergebnis.gleich.push(url);
    else ergebnis.ungleich.push(url);
    for (const v of verweise(p.r)) schlange.push(v);
  }
  for (const k of Object.keys(ergebnis)) ergebnis[k].sort();
  ergebnis.urteil = (ergebnis.ungleich.length || ergebnis.fehltInQuelle.length || ergebnis.startFehlt.length || !ergebnis.gleich.length)
    ? 'ungleich' : 'gleich';
  return ergebnis;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}

function main() {
  const mitArgument = arg('--paket') || arg('--quelle') || arg('--start') || arg('--codes');
  if (mitArgument && !(arg('--paket') && arg('--quelle') && (arg('--start') || arg('--codes')))) {
    console.error('Abbruch: --paket, --quelle und --start oder --codes gehören zusammen.');
    return 2;
  }
  const paketDir = arg('--paket') || path.join(FIXTURE, 'paket');
  const quelleDir = arg('--quelle') || path.join(FIXTURE, 'quelle');
  const start = arg('--start') ? arg('--start').split(',').map((s) => s.trim()).filter(Boolean) : FIXTURE_START;
  for (const d of [paketDir, quelleDir]) if (!fs.existsSync(d)) { console.error('Abbruch: Verzeichnis fehlt: ' + d); return 2; }
  const e = arg('--codes')
    ? codesVergleichen(paketDir, quelleDir, arg('--codes').split(',').map((x) => x.trim()).filter(Boolean))
    : vergleichen(paketDir, quelleDir, start);
  if (process.argv.includes('--json')) console.log(JSON.stringify(e, null, 2));
  else {
    console.log('Herkunft: ' + e.urteil.toUpperCase() + (mitArgument ? '' : '  (Fixture)'));
    console.log('  gleich ' + e.gleich.length + ' · ungleich ' + e.ungleich.length + ' · fehlt in der Quelle ' + e.fehltInQuelle.length
      + ' · Start nicht im Paket ' + e.startFehlt.length + ' · außerhalb (andere Pakete) ' + e.ausserhalb.length);
    for (const u of e.ungleich) console.log('  ✖ ungleich: ' + u);
    for (const u of e.fehltInQuelle) console.log('  ✖ fehlt in der Quelle: ' + u);
    for (const u of e.startFehlt) console.log('  ✖ Start nicht im Paket: ' + u);
  }
  return e.urteil === 'gleich' ? 0 : 1;
}

if (require.main === module) process.exit(main());
module.exports = { vergleichen, codesVergleichen, konzepteLesen, kern, verweise, ressourcenLesen };
