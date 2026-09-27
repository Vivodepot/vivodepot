#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════
   hilfe-website-export-erzeugen.js — dieselbe Hilfe-Quelle für die Website (20.09.2026,
   „Hilfe in der Datei")
   ───────────────────────────────────────────────────────────
   Es gibt keinen Website-Quellordner in diesem Repo — vivodepot.de wird extern gepflegt (nur
   `tools/website-live-abgleich-pruefen.js` misst sie von außen gegen). Diese Datei ist darum
   die einzig praktikable Kopplungsstelle: sie liest `HILFE_THEMEN` und die `hilfe:`-Kennungen
   AUS DEM KERN (nicht aus einer zweiten, von Hand gepflegten Liste — dieselbe Begründung wie
   überall sonst, wo ein Erzeuger den Kern statt eine Abschrift liest) und schreibt eine reine
   Inhaltsdatei (`docs/hilfe-website-export.json`), die das Website-Repo zieht — ob per Kopie,
   Fetch oder Submodul entscheidet, wer die Website betreut; das ist außerhalb dieses Repos.

   NIE TRANSKRIBIERT: die Datei entsteht ausschließlich aus `node … ` (schreiben) oder
   `node … --check` (nur prüfen, Exit 1 bei Abweichung, wie jeder andere Erzeuger hier) — von
   Hand editieren wäre die zweite Wahrheit, die diese Mechanik gerade vermeiden soll.

   NUR DEUTSCH UND ENGLISCH: die Website hat kein Sprachmodul-System — sie bekommt die beiden
   App-eigenen Sprachen (dieselbe Grenze wie U2-ADR-423 „Deutsch und Englisch sind app-eigen"),
   kein Drittanbieter-Sprachmodul reist mit.

   NUR THEMEN MIT INHALT: ein Thema ohne Titel-Text (sollte nicht vorkommen, `titel` hat immer
   einen Rückfall auf die ID) erscheint trotzdem; ein Thema OHNE Abschnitte (die Redaktion hat
   noch nichts geliefert, `anzahlAbschnitte: 0`) wird NICHT exportiert — die Website zeigt sonst
   eine leere Seite, das ist schlimmer als eine fehlende.

   Aufruf:
     node tools/hilfe-website-export-erzeugen.js            → schreibt die Exportdatei
     node tools/hilfe-website-export-erzeugen.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ═══════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ZIEL = path.join(REPO, 'docs', 'hilfe-website-export.json');

/* Die Website ist Vivodepots eigener Auftritt: {marke} löst sich hier zum Markennamen auf. */
function _marke(t) { return typeof t === 'string' ? t.split('{marke}').join('Vivodepot') : t; }

function _hilfeTextSprache(V, satz, themaId, feld, rueckfallDe) {
  const t = _marke(satz && satz['hilfe:' + themaId + '.' + feld]);
  if (typeof t === 'string' && t.trim()) return t;
  return feld === 'titel' ? rueckfallDe : '';
}

function exportErzeugen(V) {
  if (!V) {
    const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
    V = ladeKern({ blank: true }).V;
  }
  if (!Array.isArray(V.HILFE_THEMEN)) {
    throw new Error('HILFE_THEMEN im Kern nicht gefunden oder leer — Form geändert? Nicht raten, nachsehen.');
  }
  const de = (V.TEXTSATZ_DE_QUELLE && V.TEXTSATZ_DE_QUELLE.texte) || deTexte();
  // Der Kern trägt seit S1 keinen englischen Satz mehr — die Quelle des EN-Sprachmoduls ist tools/textsatz-en-modul.json.
  const en = (V.TEXTSATZ_EN_QUELLE || JSON.parse(require('node:fs').readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'))).texte;

  const themen = [];
  for (const def of V.HILFE_THEMEN) {
    if (!def.anzahlAbschnitte) continue;   // kein Inhalt: nicht exportieren, s. Kopf-Kommentar
    const abschnitteDe = []; const abschnitteEn = [];
    for (let i = 0; i < def.anzahlAbschnitte; i++) {
      const kennung = 'hilfe:' + def.id + '.abschnitt' + i;
      if (typeof de[kennung] === 'string' && de[kennung].trim()) abschnitteDe.push(_marke(de[kennung]));
      if (typeof en[kennung] === 'string' && en[kennung].trim()) abschnitteEn.push(_marke(en[kennung]));
    }
    if (!abschnitteDe.length) continue;
    themen.push({
      id: def.id,
      de: {
        titel: _hilfeTextSprache(V, de, def.id, 'titel', def.id),
        einleitung: _hilfeTextSprache(V, de, def.id, 'einleitung', ''),
        abschnitte: abschnitteDe,
      },
      en: {
        titel: _hilfeTextSprache(V, en, def.id, 'titel', _hilfeTextSprache(V, de, def.id, 'titel', def.id)),
        einleitung: _hilfeTextSprache(V, en, def.id, 'einleitung', ''),
        abschnitte: abschnitteEn,
      },
    });
  }
  return { herkunft: 'tools/hilfe-website-export-erzeugen.js aus vivodepot.html (HILFE_THEMEN, AB_WERK_TEXTSATZ_DE/EN) — nicht von Hand ändern.', themen };
}

function main() {
  const check = process.argv.includes('--check');
  const neu = JSON.stringify(exportErzeugen(), null, 2) + '\n';
  const alt = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, 'utf8') : null;
  if (neu === alt) {
    console.log('hilfe-website-export-erzeugen: kein Drift — ' + JSON.parse(neu).themen.length + ' Thema/Themen mit Inhalt.');
    return;
  }
  if (check) {
    console.error('hilfe-website-export-erzeugen: DRIFT — docs/hilfe-website-export.json');
    console.error('  Abhilfe: node tools/hilfe-website-export-erzeugen.js');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, neu);
  console.log('hilfe-website-export-erzeugen: geschrieben — ' + JSON.parse(neu).themen.length + ' Thema/Themen mit Inhalt.');
}

if (require.main === module) main();
module.exports = { exportErzeugen, ZIEL };
