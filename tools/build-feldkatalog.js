#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-feldkatalog.js — die Kennungen, die eine Anfrage nennen darf
   ────────────────────────────────────────────────────────────────────────
   Kette, Auftrag 7, Zug 5 (20.08.2026). Der Erzeuger baut jetzt auch
   ANFRAGEN, und eine Anfrage nennt KENNUNGEN — die Form aus Auftrag 2.
   Damit eine Institution sie über die Suche wählen kann, muss der Erzeuger
   wissen, welche es gibt.

   DIE QUELLE IST DER KERN, wie bei `tools/build-bereiche.js`: `SEKTOREN`
   trägt die Felder ohnehin. Eine von Hand gepflegte Feldliste im Erzeuger
   wäre die Kopie, gegen die U2-ADR-149 („eine Quelle statt Kopien") gebaut
   ist — und sie liefe genau dann auseinander, wenn es weh tut: eine
   Institution nennte eine Kennung, die es im Kern nicht mehr gibt, und
   erführe es erst bei der Bürgerin.

   KENNUNG UND BESCHRIFTUNG, mehr nicht. Die Kennung ist der Schlüsselraum
   (stabil), die Beschriftung ist Anzeige und Suchziel (anpassbar seit
   U2-ADR-141, darum NIE Vergleich). Werte stehen hier nirgends — der
   Katalog beschreibt Felder, keine Menschen.

   LISTEN-UNTERFELDER SIND EIGENE EINTRÄGE (13.09.2026). Sie standen bis
   dahin gar nicht im Katalog: `vorsorge_instrumente` zählte als EIN Eintrag,
   seine fünfundsiebzig Unterfelder als keiner. Eine Institution, die
   `zvr_nummer` braucht, fand sie in der Suche des Erzeugers nicht — sie
   hätte die Kennung von Hand schreiben müssen, ohne dass ihr irgendetwas
   gesagt hätte, wie sie lautet.

   DIE KENNUNGSFORM IST NICHT NEU, sie ist die des Textsatzes:
   `<bereich>.<listenfeld>/<unterfeld>`, gebaut in `_textsatzFeldFuellen`
   (`kennung + '/' + uf.id`) und im Kern nachzusehen an
   `'advanceCare.provisionInstruments/centralRegisterOfPowersOf.label'`. Sie ist bewusst NICHT
   die zeilenbezogene Form `…[vorsorgevollmacht].ort` aus `kennungBauen`:
   die trägt den Typ-Wert EINER Zeile, und welche Zeilen es gibt, entscheidet
   die Bürgerin. Der Katalog beschreibt das FELD, nicht ihre Zeilen — darum
   die typfreie Form, genau eine je Unterfeld.

   Die Sammlung läuft rekursiv wie `_textsatzFeldFuellen`, obwohl heute kein
   Unterfeld selbst Unterfelder trägt (gemessen 13.09.2026: 187 Unterfelder,
   0 tiefer verschachtelt). Nachzusehen: `unterfelderSammeln` unten — eine
   zweite Ebene fiele sonst still aus, so wie die erste es tat.

   Aufruf:
     node tools/build-feldkatalog.js            → schreibt Transport + Region
     node tools/build-feldkatalog.js --check    → schreibt nichts, meldet Drift (Exit 1)
     node tools/build-feldkatalog.js --generator <pfad>   → --check gegen EINE Kopie
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GENERATOR = path.join(REPO, 'vivodepot-template-generator.html');
const TRANSPORT = path.join(REPO, 'bereiche', 'feldkatalog.json');
const BEREICH_TEMPLATES_DIR = path.join(REPO, 'tools', 'bereich-templates');

const BEGIN = '/* FELDKATALOG:BEGIN — generierter Bereich (tools/build-feldkatalog.js); Quelle: vivodepot.html SEKTOREN */';
const ENDE = '/* FELDKATALOG:END */';

/* Der Trenner zwischen Trägerfeld und Unterfeld — DIESELBE Form wie im Textsatz
   (`_textsatzFeldFuellen`: `kennung + '/' + uf.id`). Hier als Konstante, damit
   niemand sie an zwei Stellen unterschiedlich schreibt. */
const UNTERFELD_TRENNER = '/';

/* Hängt die Unterfelder eines Feldes als EIGENE Einträge an — rekursiv, wie der
   Textsatz-Füller. `bereich` ist der des TRÄGERFELDES und wird durchgereicht:
   ein Unterfeld gehört keinem anderen Bereich an als das Feld, in dem es steht. */
function unterfelderSammeln(feld, kennung, bereich, raus, opts) {
  const { template = null, textLesenFn = null } = opts || {};
  for (const uf of (Array.isArray(feld.unterFelder) ? feld.unterFelder : [])) {
    // Ohne `id` gäbe es keine Kennung — und eine erfundene wäre schlimmer als keine.
    if (!uf || typeof uf.id !== 'string' || !uf.id.trim()) continue;
    const k = kennung + UNTERFELD_TRENNER + uf.id;
    // Reihenfolge wie am Trägerfeld unten: literal am Feld > Textsatz-Kennung > die Kennung
    // selbst. `template`/`textLesenFn` bleiben beim Aufruf aus katalogAusKern() (unten) `null` —
    // dort ist das Feld bereits materialisiert, `uf.label` also schon aufgelöst oder gar nicht
    // erst vorhanden.
    const label = (uf.label && uf.label.trim()) || (textLesenFn && textLesenFn(k + '.label')) || uf.id;
    raus.push({ kennung: k, bereich, label, template });
    unterfelderSammeln(uf, k, bereich, raus, opts);
  }
}

/* STRANG D (17.09.2026) — DIE ZWÖLF BEREICHE ALS TEMPLATES, NICHT MEHR EIN BÜNDEL.
   `katalogAusKern()` liest `V.bereicheAlle()` aus GENAU EINER geladenen Datei — bisher
   immer die native, committete `vivodepot.html` mit ihrem einen eingebetteten
   `BUERGERMODUL_BUENDEL`. Sobald die Bereiche als eigene `modulTyp:'bereich'`-Dateien
   vorliegen (Strang A) und der native Kern sie NICHT mehr trägt, läse diese eine Datei
   nur noch einen Bruchteil — der Katalog verlöre Felder, ohne dass irgendetwas rot würde.

   DER WEG, DER GILT: nicht `bereicheAlle()` neu nachbauen (zweite Leseart derselben
   Bereichsform, gegen U2-ADR-149), sondern DEN KERN SELBST DIE VEREINIGUNG BAUEN LASSEN —
   `produkt-konfektionieren.js --slug privat-de` mit einem leeren Zusatz-Bündel bäckt
   privat-des Bereichsquellen (heute: nichts, morgen: alle zwölf Templates) in einen
   Wegwerf-Kern. `katalogAusKern()` selbst bleibt UNVERÄNDERT — sie liest weiterhin
   `V.bereicheAlle()`, nur aus diesem konfektionierten Kern statt aus dem Repo-Original.
   GEPRÜFT, NICHT ANGENOMMEN (17.09.2026, vor jeder Strang-A-Landung): ein konfektioniertes
   `privat-de` mit leerem Zusatz-Bündel liefert heute exakt dieselben 270 Top-Level-Felder
   wie der direkte Weg — die Umstellung ändert am heutigen Ergebnis nichts, erst am
   morgigen, wenn Strang A landet. */
function _konfektioniertenKernBauen() {
  const os = require('node:os');
  const { vorbedingungenPruefen, konfektionieren } = require('./produkt-konfektionieren.js');
  const { modulDateienFuer } = require('./lib/vier-produkte.js');
  const bundlePfad = path.join(REPO, 'tests', 'fixtures', 'produkt-konfektionieren', 'leer.json');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'feldkatalog-konfektion-'));
  const { funde, modulauswahl, produkt } = vorbedingungenPruefen({ slug: 'privat-de', bundlePfad });
  if (funde.length) throw new Error('konfektionieren (privat-de) scheitert: ' + funde.join(' · '));
  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const ISSUER = ladeIssuer().V;
  konfektionieren({
    ziel, slug: 'privat-de', modulauswahl, unsignierteModulDateien: modulDateienFuer(produkt),
    vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
  });
  return { kernPfad: path.join(ziel, 'privat-de', 'vivodepot.html'), aufraeumen: () => fs.rmSync(ziel, { recursive: true, force: true }) };
}

function katalogAusKern() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const raus = [];
  /* Kampagne „eine Leseart statt dreiundvierzig", Zug 2 (09.09.2026) — `bereicheAlle()`
     statt der Buendel-Liste: ein AB WERK gesaeter Bereich steht nicht im Buendel und fiele
     sonst aus diesem Artefakt. Der Drift-Waechter wuerde das melden und anbieten, den
     Ausgabestand neu zu backen — was die Auslassung einfriert statt sie zu beheben. */
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        const kennung = V.kennungAusSelektor(s.id, f.id);
        if (!kennung) continue;                       // abgeleitete Zeilen tragen keine Kennung
        // `template: null` — dieses Feld kommt (noch) aus dem materialisierten Kern, nicht aus
        // einer eigenen tools/bereich-templates/-Datei. Dieselbe Struktur wie ein
        // template-sourced Eintrag (s. katalogAusTemplateDatei unten), nur ohne Herkunftsnamen —
        // KEIN bedingter Schlüssel, damit ein Verbraucher nie zwischen zwei Formen unterscheiden muss.
        raus.push({ kennung, bereich: s.id, label: f.label || f.id, template: null });
        /* Direkt hinter seinem Trägerfeld, nicht am Ende: der Katalog ist auch die
           Trefferliste der Erzeuger-Suche, und dort steht ein Unterfeld bei dem
           Feld, zu dem es gehört. Die Reihenfolge der Trägerfelder untereinander
           bleibt dabei unverändert — reiner Zuwachs. */
        unterfelderSammeln(f, kennung, s.id, raus);
      }
    }
  }
  return raus;
}

/* ── TEMPLATES ALS EIGENE QUELLE (17.09.2026) ────────────────────────────────────────────────
   „Das Feldregister zählt Templates, nicht Produkte." Eine Produktliste ändert sich mit jedem
   neuen Produkt — ein Verzeichnis nicht: `katalogAusTemplateVerzeichnis` liest jede
   `modulTyp:'bereich'`-Datei in `tools/bereich-templates/` einzeln, ohne je ein Produkt zu
   kennen. Pro fällt damit automatisch hinein (sechs `pro-*`-Dateien), eine künftige Hebammen-
   Vorlage später genauso — niemand muss diesen Erzeuger dafür anfassen.

   ZWEI ZUSTÄNDE GLEICHZEITIG, BEIDE ERLAUBT (Fund von -6c, 17.09.2026): eine Template-Datei
   trägt ihr Feld-Label ENTWEDER literal im JSON (Migration zur Sprachachse noch nicht
   vollzogen, heute alle sechs `pro-*`-Dateien) ODER über eine Textsatz-Kennung `<bereich>.
   <feld>.label` (Migration vollzogen, heute die vier von -3a). Die Reihenfolge unten —
   literal > Textsatz-Kennung (`V.textLesen`) > die Feld-ID selbst — GEMESSEN gegen beide
   real vorliegenden Formen (17.09.2026: `education.schoolLeavingQualification.label` löst
   über Textsatz auf, `pro-vertretung-vollmachten.tpl_vertretungsregelung.label` liefert dort
   `null` und fällt auf das Literal zurück), nicht angenommen. Ändert eine Datei morgen von
   literal auf Textsatz, liefert dieser Erzeuger ohne eigene Änderung dieselbe Beschriftung.

   JEDER EINTRAG NENNT SEIN TEMPLATE (`template: '<dateiname>.json'`) — der Unterschied zu
   einem kern-materialisierten Eintrag (`template: null`, s. katalogAusKern() oben) ist damit
   sichtbar, nicht erschlossen. */
function katalogAusTemplateDatei(dateiPfad, kennungFn, textLesenFn) {
  const raus = [];
  let modul;
  try {
    modul = JSON.parse(fs.readFileSync(dateiPfad, 'utf8'));
  } catch (e) {
    throw new Error('katalogAusTemplateDatei: ' + path.basename(dateiPfad) + ' ist kein gültiges JSON — ' + e.message);
  }
  if (!modul || modul.modulTyp !== 'bereich' || !modul.bereiche || typeof modul.bereiche !== 'object' || Array.isArray(modul.bereiche)) {
    throw new Error('katalogAusTemplateDatei: ' + path.basename(dateiPfad)
      + ' ist kein bereich-Template (modulTyp/bereiche fehlt oder falsch) — gehört sie in tools/bereich-templates/?');
  }
  const template = path.basename(dateiPfad);
  for (const [bereichId, bereich] of Object.entries(modul.bereiche)) {
    for (const sek of (Array.isArray(bereich && bereich.sektionen) ? bereich.sektionen : [])) {
      for (const f of (Array.isArray(sek && sek.felder) ? sek.felder : [])) {
        if (!f || typeof f.id !== 'string' || !f.id.trim()) continue;
        const kennung = (kennungFn && kennungFn(bereichId, f.id)) || (bereichId + '.' + f.id);
        const label = (f.label && f.label.trim()) || (textLesenFn && textLesenFn(kennung + '.label')) || f.id;
        raus.push({ kennung, bereich: bereichId, label, template });
        unterfelderSammeln(f, kennung, bereichId, raus, { template, textLesenFn });
      }
    }
  }
  return raus;
}

/* Leeres/fehlendes Verzeichnis → leere Liste, kein Wurf: heute (17.09.2026, vor jeder
   Strang-A-Landung) existiert `tools/bereich-templates/` im committeten Repo noch nicht — der
   Erzeuger muss damit laufen können, nicht erst ab der ersten gelandeten Datei. */
function katalogAusTemplateVerzeichnis(verzeichnis, kennungFn, textLesenFn) {
  if (!fs.existsSync(verzeichnis)) return [];
  const dateien = fs.readdirSync(verzeichnis).filter((d) => d.endsWith('.json')).sort();
  const raus = [];
  for (const d of dateien) raus.push(...katalogAusTemplateDatei(path.join(verzeichnis, d), kennungFn, textLesenFn));
  return raus;
}

function transportInhalt(felder) {
  return JSON.stringify({
    hinweis: 'ERZEUGT von tools/build-feldkatalog.js aus vivodepot.html SEKTOREN und '
      + 'tools/bereich-templates/*.json. Nicht von Hand bearbeiten — Kern und Template-Dateien '
      + 'sind die Quelle. Der Template-Generator liest von hier, damit eine Anfrage nur Kennungen '
      + 'nennen kann, die es gibt. `template` nennt die Herkunftsdatei, `null` heißt: kommt noch '
      + 'aus dem Kern, nicht aus einem eigenen Template.',
    schluesselraum: 'kennung',
    anzahl: felder.length,
    felder,
  }, null, 2) + '\n';
}

/* Die englische Beschriftung je Kennung: die des Kerns selbst (`tools/textsatz-en-modul.json`, Schlüssel
   `<kennung>.label`). Der Generator trägt sie mit, damit er in beiden Sprachen dieselben Felder unter denselben
   Namen anbietet wie der Kern — statt sie aus der Kennung zu erraten. Fehlt eine, steht dort ein leerer Text;
   `tests/generator-feldkatalog-drift.test.js` macht das rot. */
function enBeschriftungen() {
  return require(path.join(__dirname, 'textsatz-en-modul.json')).texte || {};
}
function generatorRegion(felder) {
  const en = enBeschriftungen();
  const zeilen = felder.map(f => '  ' + JSON.stringify([f.kennung, f.bereich, f.label, en[f.kennung + '.label'] || '']) + ',');
  return [
    BEGIN,
    '/* Die Kennungen, die eine Anfrage nennen darf — [kennung, bereich, beschriftung, englische Beschriftung].',
    '   Der Kern ist die Quelle; hier steht nur der Transport. Verglichen wird über die',
    '   KENNUNG, gesucht über die Beschriftung (anpassbar, darum nie Vergleich). */',
    'const FELDKATALOG = Object.freeze([',
    ...zeilen,
    '].map((z) => Object.freeze({ kennung: z[0], bereich: z[1], label: z[2], labelEn: z[3] })));',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('FELDKATALOG-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

/* Vereinigung, nicht Summe: liegt eine Kennung in BEIDEN (Übergangszeit — der native Kern
   trägt den Bereich heute noch, die Template-Datei ihn schon), gewinnt das Template, die
   kern-materialisierte Kopie fällt weg. Sonst zählte der Katalog dieselbe Kennung zweimal,
   sobald eine Strang-A-Datei landet, bevor sie den nativen Bestand ablöst. Eigene Funktion
   (nicht inline in main()), damit die Vorrang-Regel selbst geprüft werden kann, ohne einen
   echten Kern zu booten. */
function felderVereinigen(nativeFelder, templateFelder) {
  const templateKennungen = new Set(templateFelder.map((f) => f.kennung));
  return nativeFelder.filter((f) => !templateKennungen.has(f.kennung)).concat(templateFelder);
}

function main() {
  const check = process.argv.includes('--check');
  const iG = process.argv.indexOf('--generator');
  const nurGenerator = iG >= 0 && process.argv[iG + 1] ? path.resolve(process.argv[iG + 1]) : null;
  const kern = _konfektioniertenKernBauen();
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kern.kernPfad;
  let felder;
  try {
    const nativeFelder = katalogAusKern();
    const { V } = require('../tests/load-kern.js').ladeKern();
    const templateFelder = katalogAusTemplateVerzeichnis(BEREICH_TEMPLATES_DIR, V.kennungAusSelektor, V.textLesen);
    felder = felderVereinigen(nativeFelder, templateFelder);
  } finally {
    if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
    kern.aufraeumen();
  }
  const drift = [];

  if (nurGenerator) {
    const q = fs.readFileSync(nurGenerator, 'utf8');
    const neu = regionErsetzen(q, generatorRegion(felder), path.basename(nurGenerator));
    if (neu !== q) {
      console.error('build-feldkatalog: DRIFT — ' + path.basename(nurGenerator) + ' (FELDKATALOG-Region)');
      console.error('  Abhilfe: node tools/build-feldkatalog.js');
      process.exit(1);
    }
    console.log('build-feldkatalog: kein Drift in ' + path.basename(nurGenerator) + ' — ' + felder.length + ' Felder.');
    return;
  }

  const soll = transportInhalt(felder);
  const ist = fs.existsSync(TRANSPORT) ? fs.readFileSync(TRANSPORT, 'utf8') : null;
  if (ist !== soll) {
    drift.push('bereiche/feldkatalog.json');
    if (!check) { fs.mkdirSync(path.dirname(TRANSPORT), { recursive: true }); fs.writeFileSync(TRANSPORT, soll); }
  }
  const gq = fs.readFileSync(GENERATOR, 'utf8');
  const gneu = regionErsetzen(gq, generatorRegion(felder), 'vivodepot-template-generator.html');
  if (gneu !== gq) {
    drift.push('vivodepot-template-generator.html (FELDKATALOG-Region)');
    if (!check) fs.writeFileSync(GENERATOR, gneu);
  }

  if (check) {
    if (drift.length) {
      console.error('build-feldkatalog: DRIFT — ' + drift.join(' · '));
      console.error('  Abhilfe: node tools/build-feldkatalog.js');
      process.exit(1);
    }
    console.log('build-feldkatalog: kein Drift — ' + felder.length + ' Felder, eine Quelle.');
    return;
  }
  console.log('build-feldkatalog: ' + felder.length + ' Felder geschrieben'
    + (drift.length ? ' — geändert: ' + drift.join(' · ') : ' — nichts zu tun.'));
}

if (require.main === module) main();
module.exports = { katalogAusKern, enBeschriftungen, unterfelderSammeln, UNTERFELD_TRENNER, _konfektioniertenKernBauen,
  katalogAusTemplateDatei, katalogAusTemplateVerzeichnis, BEREICH_TEMPLATES_DIR, felderVereinigen,
  generatorRegion, transportInhalt, regionErsetzen, BEGIN, ENDE, GENERATOR, TRANSPORT };
