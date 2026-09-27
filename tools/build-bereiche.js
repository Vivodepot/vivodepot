#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-bereiche.js — EINE Bereichsliste, überall dieselbe, in EINEM Schlüsselraum
   ────────────────────────────────────────────────────────────────────────
   Zug 1 des Auftrags „Die Bereichsliste wird ein andockbares Register"
   (17.08.2026, Grundlage A286). Bauart wie `tools/build-code-listen.js`:
   eine Quelle, generierte Regionen zwischen Markern, `--check` für CI.

   DIE QUELLE IST DER KERN. `vivodepot.html`s `SEKTOREN` trägt die Bereiche
   ohnehin mit Struktur, Sektionen und Feldern; eine zweite, danebenliegende
   Bereichsdatei wäre die Kopie, gegen die dieser Auftrag gebaut ist. Der Kern
   ist die Quelle, `bereiche/bereiche.json` ist der erzeugte TRANSPORT, und
   die drei übrigen Anwendungen lesen nur noch aus ihm.

   DER SCHLÜSSELRAUM IST DIE ID. Vor diesem Zug prüfte der Template-Generator
   gegen deutsche Beschriftungen („Identität", „Menschen") und das
   Einreich-Schema führte dieselben elf Wörter als `enum`. Das hatte zwei
   Folgen, beide gemessen: der zwölfte Bereich `krisenvorsorge` fehlte seit
   dem 10.08. in beiden Listen (keine Institution konnte eine Vorlage dafür
   einreichen), und die Beschriftungen sind seit A287/U2-ADR-141 anpassbar —
   ein Schlüsselraum, den ein Textsatz-Modul verändern kann, ist keiner.

   ALTE EINREICHUNGEN GEHEN NICHT VERLOREN. `ALT_LABEL` unten ist die
   historische Zuordnung Beschriftung→ID. Sie wird beim LESEN angewandt und
   nie beim Schreiben; sie wächst nicht mehr (`krisenvorsorge` hat bewusst
   keinen Eintrag — die Beschriftung hat es dort nie gegeben).

   Aufruf:
     node tools/build-bereiche.js            → schreibt Transport + Regionen
     node tools/build-bereiche.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const LESE = path.join(REPO, 'vivodepot-lesen.html');
const GENERATOR = path.join(REPO, 'vivodepot-template-generator.html');
const ISSUER = path.join(REPO, 'vivodepot-vc-issuer.html');
const SCHEMA = path.join(REPO, 'docs', 'template-generator', 'submission-schema.json');
const TRANSPORT = path.join(REPO, 'bereiche', 'bereiche.json');

/* PRO-BEREICHE ALS ZWEITE, BENANNTE ZIELMENGE (16.09.2026, Pro-Vorlage „geplante Übergabe"). Die Pro-
   Bereiche entstehen nicht in SEKTOREN, sondern über den Bereichsersatz des Pro-Produkts (U2-ADR-348/398).
   Ihre EINZIGE Quelle ist die Datei, aus der das Pro-Produkt sie bekommt (tools/lib/vier-produkte.js,
   PRO_BEREICHS_ERSATZ_PFAD). Von dort, nicht aus einer Liste hier, entstehen die Pro-Ziele im Generator und in
   den bereich-enums der Einreich-Schemata. Warum der Generator sie überhaupt zulässt, steht an der Sperre in
   `pruefeKonformitaet` (vivodepot-template-generator.html). */
const PRO_BEREICHS_ERSATZ = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereichsersatz.json');
function proBereiche() {
  const ersatz = JSON.parse(fs.readFileSync(PRO_BEREICHS_ERSATZ, 'utf8'));
  return Object.entries(ersatz.neu || {}).map(([id, b]) => ({ id, label: b.label }));
}

const BEGIN = '/* BEREICHE:BEGIN — generierter Bereich (tools/build-bereiche.js); Quelle: vivodepot.html SEKTOREN */';
const ENDE = '/* BEREICHE:END */';

/* Historische Zuordnung Generator-Beschriftung → Bereichs-ID. NUR fürs Lesen
   alter Einreichungen. Geschlossen: neue Bereiche bekommen hier keinen Eintrag,
   weil sie nie unter einer Beschriftung eingereicht wurden.
   Die ZIELE sind die heutigen Bereichs-IDs (Kennungs-Umbau, 15.09.2026) — dieselben wie
   `_BEREICH_ALT_LABEL` im Kern. Standen hier noch die deutschen IDs, lief jede alte Beschriftung,
   die heute anders heißt („Menschen", „Identität", „Vorsorge" …), im Generator auf einen Bereich,
   den es nicht mehr gibt. */
const ALT_LABEL = Object.freeze({
  'Identität': 'identity',
  'Menschen': 'people',
  'Mobilität': 'mobility',
  'Finanzen': 'finance',
  'Gesundheit': 'health',
  'Bildung': 'education',
  'Sozialversicherung': 'socialInsurance',
  'Vorsorge': 'advanceCare',
  'Verwaltung': 'administration',
  'Persönliches': 'personal',
  'Wohnen': 'housing',
});

/* ── Die Quelle lesen ────────────────────────────────────────────────────────
   ÜBER DEN AUSGEFÜHRTEN KERN, nicht über einen eigenen Parser. Ein zweiter
   Textleser neben `tools/lib/sektoren.js` wäre genau die Kopie, gegen die
   dieser Auftrag gebaut ist — und er läge falsch, sobald die Beschriftungen
   durch den Textsatz laufen (`_textsatzAufSektorenAnwenden`, A287): im
   Quelltext steht dann nicht mehr die Beschriftung, die die Anwendung zeigt. */
const { echteBereicheMitLabel } = require('./lib/sektoren.js');
function bereicheAusKern() { return echteBereicheMitLabel(); }

/* ── Transport schreiben ─────────────────────────────────────────────────── */
function transportInhalt(bereiche) {
  return JSON.stringify({
    hinweis: 'ERZEUGT von tools/build-bereiche.js aus vivodepot.html SEKTOREN. Nicht von Hand '
      + 'bearbeiten — der Kern ist die Quelle. Die drei übrigen Anwendungen lesen von hier.',
    schluesselraum: 'id',
    altLabelNurZumLesen: ALT_LABEL,
    bereiche,
  }, null, 2) + '\n';
}

/* ── Generierte Region im Template-Generator ─────────────────────────────── */
function generatorRegion(bereiche, pro = proBereiche()) {
  const ids = bereiche.map(b => "'" + b.id + "'");
  const paare = bereiche.map(b => '  ' + JSON.stringify(b.id) + ': ' + JSON.stringify(b.label) + ',');
  const proIds = pro.map(b => "'" + b.id + "'");
  const proPaare = pro.map(b => '  ' + JSON.stringify(b.id) + ': ' + JSON.stringify(b.label) + ',');
  return [
    BEGIN,
    '/* Die Bereiche als IDs — der einzige Schlüsselraum. Die Beschriftung daneben ist',
    '   Anzeige, nie Vergleich (U2-ADR-141 macht sie anpassbar; ein anpassbarer Wert',
    '   kann kein Schlüssel sein). Alte Einreichungen mit deutscher Beschriftung liest',
    '   `normBereich` über BEREICH_ALT_LABEL weiter. */',
    'const BEREICHE = Object.freeze([',
    '  ' + ids.join(', ').replace(/(.{80,}?), /g, '$1,\n  '),
    ']);',
    'const BEREICH_LABEL = Object.freeze({',
    ...paare,
    '});',
    'const BEREICH_ALT_LABEL = Object.freeze(' + JSON.stringify(ALT_LABEL, null, 2).split('\n').join('\n') + ');',
    '/* Pro-Bereiche aus dem Bereichsersatz des Pro-Produkts — zulässige ZIELE eines Feldes, keine Bürger-Bereiche. */',
    'const PRO_BEREICHE = Object.freeze([',
    '  ' + proIds.join(', ').replace(/(.{80,}?), /g, '$1,\n  '),
    ']);',
    'const PRO_BEREICH_LABEL = Object.freeze({',
    ...proPaare,
    '});',
    ENDE,
  ].join('\n');
}

/* ── Die `bereich`-enums des Einreich-Schemas, an allen drei Orten ───────── */
function enumsErsetzen(quelle, bereiche, dateiname, pro = proBereiche()) {
  const ids = bereiche.map(b => b.id).concat(pro.map(b => b.id));
  let raus = quelle, ersetzt = 0, idx = -1;
  const treffer = [];
  while ((idx = raus.indexOf('"bereich"', idx + 1)) >= 0) {
    const zu = raus.indexOf('}', idx);
    const fenster = raus.slice(idx, zu < 0 ? idx + 600 : zu);
    const enumIdx = fenster.indexOf('"enum"');
    if (enumIdx < 0) continue;
    const auf = fenster.indexOf('[', enumIdx);
    const bis = fenster.indexOf(']', enumIdx);
    if (auf < 0 || bis < 0) continue;
    treffer.push({ von: idx + auf, bis: idx + bis + 1 });
  }
  if (!treffer.length) throw new Error('kein "bereich"-enum in ' + dateiname + ' gefunden');
  // von hinten ersetzen, damit die Offsets der früheren Treffer gültig bleiben
  for (const t of treffer.reverse()) {
    const alt = raus.slice(t.von, t.bis);
    // Einrückung der ersten Eintragszeile übernehmen, damit der Diff klein bleibt
    const einr = (alt.match(/\n(\s+)"/) || [null, '        '])[1];
    const neu = '[\n' + ids.map(i => einr + JSON.stringify(i)).join(',\n') + '\n' + einr.slice(0, -2) + ']';
    if (alt !== neu) { raus = raus.slice(0, t.von) + neu + raus.slice(t.bis); ersetzt++; }
  }
  return { quelle: raus, ersetzt, gefunden: treffer.length };
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('BEREICHE-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  /* UMLENKBAR (`--generator <pfad>`) — die stehende Schreibregel für Prüfwerkzeuge
     verlangt den Gegenstand als Argument. Ohne sie liesse sich der Rot-Beleg zu
     diesem Gate nur führen, indem man die echte Auslieferungsdatei verbiegt.
     Mit `--generator` läuft `--check` gegen EINE Kopie und lässt alles andere
     unberührt; ohne das Argument derselbe volle Lauf wie zuvor. */
  const iG = process.argv.indexOf('--generator');
  const nurGenerator = iG >= 0 && process.argv[iG + 1] ? path.resolve(process.argv[iG + 1]) : null;
  const bereiche = bereicheAusKern();
  const drift = [];

  if (nurGenerator) {
    const q = fs.readFileSync(nurGenerator, 'utf8');
    const neu = regionErsetzen(q, generatorRegion(bereiche), path.basename(nurGenerator));
    if (neu !== q) {
      console.error('build-bereiche: DRIFT — ' + path.basename(nurGenerator) + ' (BEREICHE-Region)');
      console.error('  Abhilfe: node tools/build-bereiche.js');
      process.exit(1);
    }
    console.log('build-bereiche: kein Drift in ' + path.basename(nurGenerator) + ' — '
      + bereiche.length + ' Bereiche.');
    return;
  }

  // 1 · Transport
  const soll = transportInhalt(bereiche);
  const ist = fs.existsSync(TRANSPORT) ? fs.readFileSync(TRANSPORT, 'utf8') : null;
  if (ist !== soll) {
    drift.push('bereiche/bereiche.json');
    if (!check) { fs.mkdirSync(path.dirname(TRANSPORT), { recursive: true }); fs.writeFileSync(TRANSPORT, soll); }
  }

  // 2 · Generator-Region
  const gq = fs.readFileSync(GENERATOR, 'utf8');
  const gneu = regionErsetzen(gq, generatorRegion(bereiche), 'vivodepot-template-generator.html');
  if (gneu !== gq) {
    drift.push('vivodepot-template-generator.html (BEREICHE-Region)');
    if (!check) fs.writeFileSync(GENERATOR, gneu);
  }

  // 3 · die sechs `bereich`-enums
  for (const datei of [SCHEMA, ISSUER, GENERATOR]) {
    const q = fs.readFileSync(datei, 'utf8');
    const r = enumsErsetzen(q, bereiche, path.basename(datei));
    if (r.ersetzt > 0) {
      drift.push(path.basename(datei) + ' (' + r.ersetzt + ' von ' + r.gefunden + ' bereich-enum)');
      if (!check) fs.writeFileSync(datei, r.quelle);
    }
  }

  if (check) {
    if (drift.length) {
      console.error('build-bereiche: DRIFT — ' + drift.join(' · '));
      console.error('  Abhilfe: node tools/build-bereiche.js');
      process.exit(1);
    }
    console.log('build-bereiche: kein Drift — ' + bereiche.length + ' Bereiche, eine Quelle.');
    return;
  }
  console.log('build-bereiche: ' + bereiche.length + ' Bereiche geschrieben'
    + (drift.length ? ' — geändert: ' + drift.join(' · ') : ' — nichts zu tun.'));
}

if (require.main === module) main();
module.exports = { bereicheAusKern, proBereiche, ALT_LABEL, transportInhalt, generatorRegion, enumsErsetzen, KERN, LESE, GENERATOR, ISSUER, SCHEMA, TRANSPORT, PRO_BEREICHS_ERSATZ };
