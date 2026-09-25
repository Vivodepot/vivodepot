'use strict';
/* rezepte-schnitt-kern-heben.js — D2 (19.09.2026): hebt die Rezepte aller vier Produkte
   von der eingefrorenen `kern/v670.html`-Pinnung auf den Schnitt-Kern-Stand.

   BEFUND, DER DAS TRÄGT: die Zusammensetzung selbst (tools/lib/vier-produkte.js,
   `PRODUKTE`/`modulDateienFuer`) ist bereits gebaut und geprüft
   (tests/privat-ist-zusammengesetzt-nicht-eingebacken-2026-09-18.test.js, 4/4 grün inkl.
   Rot-Beweis, auf diesem Kommit nachgefahren). Was fehlte, ist ausschließlich das REZEPT — die
   eingefrorene Fixture von gestern kennt den heutigen Aufbau noch nicht (die Wortlaut,
   Übergabeblatt §8). Dieses Werkzeug schließt genau diese Lücke: es liest dieselbe Zusammen-
   setzung, die der Kern tatsächlich lädt, und schreibt sie ins Rezept-Schema.

   sprachModulPfad -> rezept.sprachmodul (einzelnes, benanntes Feld). Alle übrigen Dateien
   (Bereichs-Templates, Pro-Logikmodul, bereicheBekannt, Dokumentmodule, AB_WERK-Fixturen) ->
   rezept.bereichsmodule (der Gateway führt beide Listen ohnehin zu EINER Zutatenliste zusammen,
   s. produkt-bauen.js `zutaten = [sprachmodul, rechtsraumModul, ...bereichsmodule, ...templates]`
   — die Aufteilung ist Gruppierung, keine Funktionsgrenze). `templates` trägt seit U2-ADR-427 die
   Dateien, die ein Produkt in `templatePfade` führt (heute: das Notar-Template in pro-de/pro-en,
   unter `templates/v<stand>/`); sonst bleibt es `[]` — keines der vier Produkte lädt heute eine
   `modulTyp:'vorlage'`-Datei (P1, 17.09.2026 — Pro-Vorlage entfallen).
*/
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PRODUKTE, REZEPT_KOEPFE, modulDateienFuer } = require('./lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

function sha256Datei(pfad) {
  return crypto.createHash('sha256').update(fs.readFileSync(pfad)).digest('hex');
}

function standzahlAusKern() {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const m = /const SCHALEN_STAND = 'v(\d+)'/.exec(text);
  if (!m) throw new Error('SCHALEN_STAND nicht gefunden in ' + KERN_PFAD);
  return m[1];
}

// Bereichs-Templates/Dokumentmodule/AB_WERK-Fixturen sind `herkunft:'vivodepot'`-Module — sie
// liegen beim Gateway unter `module/v<stand>/<dateiname>`, egal aus welchem lokalen Ordner sie
// hier kommen (BEREICH_TEMPLATE_VERZEICHNIS, DOKUMENT_MODUL_VERZEICHNIS, AB_WERK_FIXTURE_VERZEICHNIS
// sind alle drei "eine Zutat, ein Dateiname" — der Gateway kennt keine Unterordner, s. `_zutatTraegtStand`
// in produkte-register.js: `^(module|templates)/(v\d+)/[^/]+$`).
function zutat(lokalerPfad, standzahl, modulTypAusDatei, ordner = 'module') {
  return {
    modulTyp: modulTypAusDatei,
    pfad: ordner + '/v' + standzahl + '/' + path.basename(lokalerPfad),
    pruefsumme: sha256Datei(lokalerPfad),
  };
}

function rezeptFuer(slug, standzahl, kernPruefsumme) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  if (!p) throw new Error('unbekanntes Produkt: ' + slug);
  const kopf = REZEPT_KOEPFE[slug];
  if (!kopf) throw new Error('kein REZEPT_KOPF für: ' + slug);

  let sprachmodul = null;
  let sprachmodulPruefsumme = null;
  if (p.sprachModulPfad) {
    sprachmodul = 'module/v' + standzahl + '/' + path.basename(p.sprachModulPfad);
    sprachmodulPruefsumme = sha256Datei(p.sprachModulPfad);
  }

  // modulDateienFuer() liefert die VOLLE Liste inkl. sprachModulPfad an erster Stelle (falls
  // gesetzt) — der ist oben schon separat behandelt, hier also herausgefiltert, damit er nicht
  // doppelt im Rezept steht.
  const templatePfade = p.templatePfade || [];   // U2-ADR-427: Templates stehen in `templates`, nicht in `bereichsmodule`
  const alleDateien = modulDateienFuer(p).filter((pfad) => pfad !== p.sprachModulPfad && !templatePfade.includes(pfad));
  const bereichsmodule = alleDateien.map((pfad) => {
    const inhalt = JSON.parse(fs.readFileSync(pfad, 'utf8'));
    return zutat(pfad, standzahl, inhalt.modulTyp);
  });

  return {
    slug,
    zugangsart: kopf.zugangsart,
    odooProduktVorlageId: kopf.odooProduktVorlageId,
    anzeigename: kopf.anzeigename,
    kernStand: 'kern/v' + standzahl + '.html',
    kernPruefsumme,
    sprachmodul,
    sprachmodulPruefsumme,
    rechtsraumModul: null,
    rechtsraumModulPruefsumme: null,
    bereichsmodule,
    templates: templatePfade.map((pfad) => zutat(pfad, standzahl, JSON.parse(fs.readFileSync(pfad, 'utf8')).modulTyp, 'templates')),
  };
}

function main() {
  const standzahl = standzahlAusKern();
  const kernPruefsumme = sha256Datei(KERN_PFAD);
  const rezepte = {};
  for (const p of PRODUKTE) {
    rezepte[p.slug] = rezeptFuer(p.slug, standzahl, kernPruefsumme);
  }
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(rezepte, null, 2) + '\n');
    return;
  }
  if (process.argv.includes('--check')) {
    // Reiner Vergleich, schreibt nichts: die eingecheckten Rezept-Fixtures müssen zum Kern passen, den
    // dieser Baum trägt. Jede Änderung an vivodepot.html (auch ein Kommentar) ändert die Prüfsumme —
    // ohne diesen Vergleich fiel es erst am Test dod-v1-rezept-zu-artefakt-pruefen auf.
    const ordner = process.argv.includes('--fixtures')
      ? process.argv[process.argv.indexOf('--fixtures') + 1]
      : path.join(REPO, 'tests', 'fixtures', 'dod-v1-rezepte-stand-2026-09-17');
    const abweichend = [];
    for (const [slug, rezept] of Object.entries(rezepte)) {
      const datei = path.join(ordner, slug + '.json');
      const ist = fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8') : null;
      if (ist !== JSON.stringify(rezept, null, 2) + '\n') abweichend.push(slug);
    }
    if (abweichend.length) {
      console.error('[rezepte-schnitt-kern-heben] Rezept-Fixtures weichen vom Kern ab: ' + abweichend.join(', ') + '\n'
        + '  Nachziehen: node tools/rezepte-schnitt-kern-heben.js — und das Gateway-Repo mit derselben Fassung nachführen.');
      process.exitCode = 1;
    } else {
      console.log('[rezepte-schnitt-kern-heben] Rezept-Fixtures passen zum Kern.');
    }
    return;
  }
  const zielOrdner = process.argv.includes('--ziel')
    ? process.argv[process.argv.indexOf('--ziel') + 1]
    : path.join(REPO, 'tests', 'fixtures', 'dod-v1-rezepte-stand-2026-09-17');
  fs.mkdirSync(zielOrdner, { recursive: true });
  for (const [slug, rezept] of Object.entries(rezepte)) {
    const ziel = path.join(zielOrdner, slug + '.json');
    fs.writeFileSync(ziel, JSON.stringify(rezept, null, 2) + '\n');
    console.log('geschrieben: ' + ziel + ' (kernStand ' + rezept.kernStand + ', ' +
      rezept.bereichsmodule.length + ' bereichsmodule, ' + rezept.templates.length + ' templates)');
  }
}

if (require.main === module) main();

module.exports = { rezeptFuer, standzahlAusKern, sha256Datei };
