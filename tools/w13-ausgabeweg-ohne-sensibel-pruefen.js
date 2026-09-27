'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-13 — Ausgabeweg ohne Sensibel-Prüfung („Die Sensibel-
   Architektur", 09.08.2026, Zug 4)
   ────────────────────────────────────────────────────────────────────────
   Prüft: jeder in `EXPORT_FORMATE` registrierte Ausgabeweg (Bürger-Export,
   PDF/DOCX/Situationsblatt kommen über eigene, bereits verdrahtete Pfade —
   s. u.) muss, direkt oder über einen bekannten sicheren Zwischenschritt,
   `feldIstSensibel`/`unterfeldIstSensibel` aufrufen, bevor er einen
   Feldwert ausgibt. Statische Quelltext-Prüfung (Regex auf die Funktions-
   KÖRPER, nicht auf Laufzeitverhalten) — findet, ob der Aufruf im Text
   steht, nicht ob er auf jedem Pfad tatsächlich greift.

   „Bekannter sicherer Zwischenschritt" ist eine FESTE, KLEINE Liste
   (baueAusMapping, docxBereichModell, _bereichSektionenModell,
   vollExportJSON) — Funktionen, die ihrerseits bereits geprüft
   `feldIstSensibel`/`unterfeldIstSensibel` aufrufen. Kein rekursiver
   Graph-Durchlauf: ein NEUER Zwischenschritt, der selbst nicht auf dieser
   Liste steht, fällt als Fund auf statt still als „sicher" durchzugehen.

   Ergänzend geprüft: die drei weiteren bekannten Ausgabewege außerhalb der
   Registry — `situationModell` (Situationsblatt-PDF), `akutZeileHTML` +
   `angehoerigenCacheModell` (Angehörigen-Modus). Die Notfallkarte
   (`notfallKernModell`/`zeichneNotfallkarte`/…) ist eine bekannte,
   dokumentierte Ausnahme (Produktabsicht, s. Grundlinie) — bewusst NICHT
   scharf geprüft, sondern nur benannt.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w13-ausgabeweg-ohne-sensibel-grundlinie.json');
const SICHERE_ZWISCHENSCHRITTE = ['baueAusMapping', 'docxBereichModell', '_bereichSektionenModell', 'vollExportJSON'];
const SENSIBEL_MUSTER = /\bfeldIstSensibel\s*\(|\bunterfeldIstSensibel\s*\(/;

// Extrahiert den Funktionskörper von `function <name>(...) { ... }` per Klammerzählung —
// robuster als ein Regex mit .*, das an der ersten `}` irgendwo im Körper stoppen würde.
function funktionsKoerper(html, name) {
  const kopf = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = kopf.exec(html);
  if (!m) return null;
  let i = m.index + m[0].length;
  let tiefe = 1;
  const start = i;
  while (i < html.length && tiefe > 0) {
    if (html[i] === '{') tiefe++;
    else if (html[i] === '}') tiefe--;
    i++;
  }
  return tiefe === 0 ? html.slice(start, i - 1) : null;
}

function prueftSensibel(html, name, tiefe) {
  const koerper = funktionsKoerper(html, name);
  if (koerper == null) return { ok: null, grund: 'Funktion nicht gefunden' };
  if (SENSIBEL_MUSTER.test(koerper)) return { ok: true, grund: 'direkter Aufruf im Funktionskörper' };
  if (tiefe > 0) {
    for (const z of SICHERE_ZWISCHENSCHRITTE) {
      if (new RegExp('\\b' + z + '\\s*\\(').test(koerper)) {
        const tief = prueftSensibel(html, z, tiefe - 1);
        if (tief.ok) return { ok: true, grund: 'über bekannten Zwischenschritt ' + z };
      }
    }
  }
  return { ok: false, grund: 'kein feldIstSensibel/unterfeldIstSensibel im Körper, kein bekannter Zwischenschritt' };
}

// Liest den Namen der `baue`-Zielfunktion aus `baue: (opt) => zielFn(...)` bzw. `baue: () => zielFn()`.
function bauZielFunktion(html, formatId) {
  const eintrag = new RegExp("id:\\s*'" + formatId + "'[\\s\\S]{0,400}?baue:\\s*\\([^)]*\\)\\s*=>\\s*([A-Za-z_$][\\w$]*)\\s*\\(");
  const m = eintrag.exec(html);
  return m ? m[1] : null;
}

// 'json' entfernt (U2-ADR-NNN, 18.09.2026): der offene JSON-Vollexport ist aus EXPORT_FORMATE
// entfernt — kein `id: 'json' ... baue:`-Eintrag mehr aufzulösen. Die Funktion selbst
// (vollExportJSON) bleibt internes Meßinstrument, ist aber kein Ausgabeweg über diese Registry
// mehr, s. docs/adr/…-offener-json-vollexport-entfernt-2026-09-17.md.
const EXPORT_FORMAT_IDS = [
  'fhir-ips', 'sd-jwt-vc-identitaet', 'xoev-verwaltung', 'edci-bildung',
  'sd-jwt-vc-finanzen', 'sd-jwt-vc-sozialversicherung', 'fim-json',
  'vcard-identitaet', 'vcard-menschen', 'ics-vorsorge',
];
const WEITERE_WEGE = ['situationModell', 'akutZeileHTML', 'angehoerigenCacheModell'];

function ausgabewegFunde(html) {
  const funde = [];
  for (const id of EXPORT_FORMAT_IDS) {
    const ziel = bauZielFunktion(html, id);
    if (!ziel) { funde.push({ carrier: 'EXPORT_FORMATE', id, ziel: null, ergebnis: 'Ziel-Funktion nicht auflösbar' }); continue; }
    const r = prueftSensibel(html, ziel, 2);
    if (r.ok !== true) funde.push({ carrier: 'EXPORT_FORMATE', id, ziel, ergebnis: r.grund });
  }
  for (const name of WEITERE_WEGE) {
    const r = prueftSensibel(html, name, 2);
    if (r.ok !== true) funde.push({ carrier: 'Weiterer-Weg', id: name, ziel: name, ergebnis: r.grund });
  }
  return funde;
}

function schluesselFund(f) { return f.carrier + '|' + f.id; }
function ladeGrundlinie() { return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')); }
function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map(schluesselFund));
  const neu = funde.filter((f) => !bekannt.has(schluesselFund(f)));
  return { neu, rot: neu.length > 0 };
}
function ermittleFunde(html) { return ausgabewegFunde(html); }

if (require.main === module) {
  const { ladeKern } = require('../tests/load-kern.js');
  const args = process.argv.slice(2);
  const { html } = ladeKern();
  const funde = ermittleFunde(html);
  if (args.includes('--grundlinie-schreiben')) {
    const vorhandene = fs.existsSync(GRUNDLINIE) ? ladeGrundlinie() : [];
    const bekannt = new Map(vorhandene.map((f) => [schluesselFund(f), f]));
    const ausgabe = funde.map((f) => bekannt.get(schluesselFund(f)) || Object.assign({}, f, {
      vermerk: 'Entscheidung offen', begruendung: 'automatisch übernommen — noch nicht klassifiziert',
    }));
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(ausgabe, null, 2) + '\n');
    console.log('Grundlinie geschrieben:', ausgabe.length, 'Einträge');
  } else if (args.includes('--json')) {
    console.log(JSON.stringify(funde, null, 2));
  } else if (args.includes('--gate')) {
    const grundlinie = ladeGrundlinie();
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (rot) {
      console.log('GATE ROT —', neu.length, 'neue(r) Fund(e) gegen die Grundlinie:');
      for (const f of neu) console.log(' ', schluesselFund(f), '—', f.ergebnis);
      process.exitCode = 1;
    } else {
      console.log('GATE grün — kein neuer Fund gegen die Grundlinie (' + grundlinie.length + ' bekannt).');
    }
  } else {
    console.log(funde.length, 'Funde,', funde.length, 'gegen Grundlinie zu prüfen (--gate) oder --json/--grundlinie-schreiben');
  }
}

module.exports = { ausgabewegFunde, funktionsKoerper, prueftSensibel, bauZielFunktion, schluesselFund, ladeGrundlinie, gateBewerten, ermittleFunde, EXPORT_FORMAT_IDS, WEITERE_WEGE };
