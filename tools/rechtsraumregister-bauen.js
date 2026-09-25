#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rechtsraumregister-bauen.js — Register-Katalog-Plan §6 Schritt 4 (14.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   KORRIGIERTE PRÄMISSE (gemessen, nicht aus dem Plan übernommen): der Plan-Entwurf
   nannte `RECHTSRAUM_TYPEN_BEKANNT` als Startbestand-Quelle — das ist FALSCH.
   `RECHTSRAUM_TYPEN_BEKANNT` (`vivodepot-template-generator.html:1495`) ist die
   Liste der fünf INSTRUMENT-TYPEN (vorsorgevollmacht/betreuungsverfuegung/…), die
   ein Rechtsraum-Modul abdecken KANN — nicht die Liste der Rechtsräume selbst.

   Die tatsächliche Rechtsraum-ACHSE lebt in `modul.rechtsraum` (freier String,
   `rechtsraumModulPruefen`/`vivodepot.html`) mit GENAU EINEM reservierten,
   nativen Wert: 'DE' (`STELLENSATZ_RECHTSRAUM_EINGEBAUT`, `AB_WERK_RECHTSRAUM_DE`,
   U2-ADR-382). Gemessen, nicht angenommen (12.09.2026, project-Notiz „Nur ein
   Rechtsraum: DE"): kein zweiter Rechtsraum ist heute geschnitten oder ausgeliefert
   — `_RECHTSRAUM_MODUL_REGISTRY`s zweites Fach (AB_WERK_RECHTSRAUM_PRODUKT) ist leer.

   STARTBESTAND DAMIT: genau EIN Eintrag (DE) — unverändert übernommen, keiner
   erfunden. Ein zweiter Rechtsraum (z. B. Irland) kommt über den künftigen
   Vorschlagsweg (Register-Katalog-Plan §4), nicht durch Raten an dieser Stelle.

   REGISTER-KATALOG-PLAN SCHRITT 7 (15.09.2026) — KOLLISIONSSCHUTZ, KEIN WHITELIST-GATE:
   `rechtsraumModulPruefen` im Template-Generator akzeptierte bis dahin JEDEN nicht-leeren
   String außer 'DE' als gültigen Rechtsraum — kein Abgleich gegen irgendeine Liste. Geprüft
   (vor dem Bau): ein hartes „muss schon im Register stehen"-Gate widerspräche der
   offenen, ökosystemischen Achse (die ALLERERSTE Einreichung eines neuen Rechtsraums wäre
   sonst unmöglich). Der Bau ist darum ein KOLLISIONSSCHUTZ, kein Whitelist-Gate: eine
   Einreichung wird nur abgewiesen, wenn ihr normalisierter Wert (trim+uppercase) mit einem
   BEREITS REGISTRIERTEN Eintrag übereinstimmt, aber in einer ANDEREN Schreibweise ('de' gegen
   registriertes 'DE') — dieselbe Namensraum-Disziplin wie bei `_gleicherAnbieter`/`tpl_`:
   verhindert, dass zwei Schreibweisen still zu zwei verschiedenen Dingen werden, ohne neue
   Werte zu blockieren. Heute (Startbestand nur 'DE', selbst bereits vorher reserviert)
   ändert das am BEOBACHTBAREN Verhalten nichts — der Mechanismus steht für den ersten
   echten zweiten Rechtsraum bereit.

   Aufruf:
     node tools/rechtsraumregister-bauen.js                → schreibt nach register-ausgabe/
     node tools/rechtsraumregister-bauen.js --ziel <ordner> → anderer Zielordner
     node tools/rechtsraumregister-bauen.js --kern <datei>  → andere Kern-Datei (Standzahl)
     node tools/rechtsraumregister-bauen.js --datum JJJJ-MM-TT → Fassungsdatum setzen (sonst heute)
     node tools/rechtsraumregister-bauen.js --check        → nur die Generator-Region prüfen (Exit 1 bei Drift)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { hashVonText, pruefsummenZeile, achsenRegisterJson, eintraegeFormPruefen } = require('./lib/achsenregister-bauen.js');
const { INDEX_DATEI, indexEintragBauen, indexJsonBauen, vorhandenenIndexLesen } = require('./lib/register-index.js');
const { standzahlLesen, heute, ZIEL_VORGABE: FELDREGISTER_ZIEL_VORGABE } = require('./feldregister-bauen.js');

const REPO = path.join(__dirname, '..');
const GENERATOR_PFAD = path.join(REPO, 'vivodepot-template-generator.html');
const REGION_BEGIN = '/* RECHTSRAUM_BEKANNT:BEGIN — generierter Bereich (tools/rechtsraumregister-bauen.js STARTBESTAND) */';
const REGION_ENDE = '/* RECHTSRAUM_BEKANNT:END */';
const ZIEL_VORGABE = FELDREGISTER_ZIEL_VORGABE;
const JSON_DATEI = 'rechtsraumregister.json';
const PRUEFSUMMEN_DATEI = JSON_DATEI + '.sha256';
const INDEX_ACHSE = 'rechtsraum';

const KOPFZEILE = 'ERZEUGT von tools/rechtsraumregister-bauen.js. Nicht von Hand bearbeiten — '
  + 'der Kern (vivodepot.html) ist die Quelle.';

/* Gemessen am 12.09.2026 (project_nur_ein_rechtsraum_de_ungarn_ist_auftrag) und erneut am
   14.09.2026 (vivodepot.html: STELLENSATZ_RECHTSRAUM_EINGEBAUT/AB_WERK_RECHTSRAUM_DE) —
   nicht angenommen. */
const STARTBESTAND = Object.freeze([
  {
    rechtsraum: 'DE',
    label: { de: 'Deutschland', en: 'Germany' },
    status: 'permanent',
    quelle: 'nativ (STELLENSATZ_RECHTSRAUM_EINGEBAUT/AB_WERK_RECHTSRAUM_DE, U2-ADR-382)',
  },
]);

function bauen(opt) {
  const o = opt || {};
  const eintraege = o.eintraege || STARTBESTAND;
  eintraegeFormPruefen(eintraege, 'rechtsraum');
  const fassung = { datum: o.datum || heute(), kern: standzahlLesen(o.kernPfad) };
  const json = achsenRegisterJson({
    schluesselraum: 'rechtsraum',
    kopfzeile: KOPFZEILE,
    herkunft: { quelle: 'vivodepot.html (rechtsraumModulPruefen, modul.rechtsraum)', pruefsumme: PRUEFSUMMEN_DATEI },
    eintraege,
    fassung,
  });
  const hash = hashVonText(json);
  return {
    fassung,
    anzahl: eintraege.length,
    json,
    hash,
    pruefsumme: pruefsummenZeile(hash, JSON_DATEI),
    indexEintrag: indexEintragBauen({
      achse: INDEX_ACHSE, datei: JSON_DATEI, pruefsummeDatei: PRUEFSUMMEN_DATEI,
      hash, anzahl: eintraege.length, fassung,
    }),
  };
}

/* Die Generator-Region — GENAU wie `tools/build-feldkatalog.js`s FELDKATALOG-Region: ein
   generierter Bereich, direkt im Generator eingebacken, keine zweite Datei zur Laufzeit zu
   lesen. Quelle ist `STARTBESTAND` (der einzige heute bekannte, gemessene Bestand), nicht die
   ephemeren, gitignorierten `register-ausgabe/`-Artefakte. */
function generatorRegion(eintraege) {
  const werte = eintraege.map((e) => e.rechtsraum);
  return [
    REGION_BEGIN,
    '/* Bekannte, registrierte Rechtsraum-Werte — für den Kollisionsschutz in',
    '   rechtsraumModulPruefen (Register-Katalog-Plan §6 Schritt 7). KEIN Whitelist-Gate:',
    '   ein neuer Wert ist immer erlaubt, nur eine ANDERE Schreibweise eines bereits',
    '   registrierten Werts wird abgewiesen. Quelle: tools/rechtsraumregister-bauen.js. */',
    'const RECHTSRAUM_BEKANNT = Object.freeze(' + JSON.stringify(werte) + ');',
    REGION_ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(REGION_BEGIN), b = quelle.indexOf(REGION_ENDE);
  if (a < 0 || b < 0) throw new Error('rechtsraumregister-bauen: RECHTSRAUM_BEKANNT-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + REGION_ENDE.length);
}

function generatorAktualisieren({ check } = {}) {
  const eintraege = STARTBESTAND;
  const quelle = fs.readFileSync(GENERATOR_PFAD, 'utf8');
  const neu = regionErsetzen(quelle, generatorRegion(eintraege), path.basename(GENERATOR_PFAD));
  if (neu === quelle) return { drift: false };
  if (check) return { drift: true };
  fs.writeFileSync(GENERATOR_PFAD, neu, 'utf8');
  return { drift: true, geschrieben: true };
}

function schreiben(zielOrdner, artefakt) {
  fs.mkdirSync(zielOrdner, { recursive: true });
  const index = indexJsonBauen(vorhandenenIndexLesen(zielOrdner), artefakt.indexEintrag);
  const dateien = [
    [JSON_DATEI, artefakt.json],
    [PRUEFSUMMEN_DATEI, artefakt.pruefsumme],
    [INDEX_DATEI, index],
  ];
  return dateien.map(([name, inhalt]) => {
    const p = path.join(zielOrdner, name);
    fs.writeFileSync(p, inhalt);
    return { name, pfad: p, bytes: Buffer.byteLength(inhalt, 'utf8') };
  });
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const wert = (flagge) => { const i = argv.indexOf(flagge); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };

  if (check) {
    const r = generatorAktualisieren({ check: true });
    if (r.drift) {
      console.error('rechtsraumregister-bauen --check: DRIFT — vivodepot-template-generator.html (RECHTSRAUM_BEKANNT-Region)');
      console.error('  Abhilfe: node tools/rechtsraumregister-bauen.js');
      process.exit(1);
    }
    console.log('rechtsraumregister-bauen --check: kein Drift.');
    return;
  }

  const ziel = wert('--ziel') ? path.resolve(wert('--ziel')) : ZIEL_VORGABE;
  const datum = wert('--datum');
  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    console.error('rechtsraumregister-bauen: --datum erwartet JJJJ-MM-TT, bekam "' + datum + '".');
    process.exit(1);
  }
  const artefakt = bauen({ kernPfad: wert('--kern') ? path.resolve(wert('--kern')) : null, datum });
  const geschrieben = schreiben(ziel, artefakt);
  const generatorErgebnis = generatorAktualisieren({});
  console.log('rechtsraumregister-bauen: ' + artefakt.anzahl + ' Rechtsraum/Rechtsräume · Fassung '
    + artefakt.fassung.datum + ' · Kern ' + artefakt.fassung.kern);
  for (const g of geschrieben) {
    console.log('  ' + g.name.padEnd(26) + (g.bytes / 1024).toFixed(2).padStart(7) + ' KB  ' + g.pfad);
  }
  console.log('  Generator-Region: ' + (generatorErgebnis.geschrieben ? 'aktualisiert' : 'bereits aktuell') + ' — ' + path.basename(GENERATOR_PFAD));
}

if (require.main === module) main();
module.exports = {
  bauen, schreiben, generatorRegion, regionErsetzen, generatorAktualisieren,
  STARTBESTAND, JSON_DATEI, PRUEFSUMMEN_DATEI, INDEX_ACHSE, ZIEL_VORGABE,
  GENERATOR_PFAD, REGION_BEGIN, REGION_ENDE,
};
