'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-fr-modul-erzeugen.js — baut das französische Sprachmodul (29.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Entscheid 21.10.2026: Französisch als signiertes Sprachmodul; die Oberfläche spricht Französisch, der Rechtsraum
   bleibt Deutschland. Daraus folgt derselbe Aufbau wie beim englischen Modul (tools/textsatz-en-modul-erzeugen.js):
     · die übersetzten Texte aus tools/textsatz-fr-daten.js;
     · der amtliche Wortlaut (tools/textsatz-en-juristisch-offen.js) byte-gleich auf Deutsch aus dem deutschen Modul,
       nie übersetzt (U2-ADR-363);
     · die Festlegungen der Patientenverfügung abgeleitet, nicht gepflegt (U2-ADR-440).
   Regeln: Datum TT/MM/JJJJ, Komma als Dezimaltrenner, Leerzeichen als Tausendertrenner, Sprachkennung fr-FR; Währung
   bleibt beim Rechtsraum.
   DECKUNG: geschrieben wird nur ein Modul, das jede Kennung des deutschen Satzes trägt. Fehlt eine, bricht der Bau mit
   der Zahl ab, statt ein Modul auszuliefern, das an den Lücken still Deutsch zeigt. Signiert wird nicht hier.
   Aufruf:  node tools/textsatz-fr-modul-erzeugen.js [--deckung] [ausgabepfad.json]
   --deckung druckt nur „Deckung: <vorhanden> von <kennungen>“ und schreibt nichts (Exit 0).
   Probe: tests/textsatz-fr.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const MAX = 1024 * 1024; // _TEXTSATZ_MODUL_MAX_BYTES, vivodepot.html (U2-ADR-513)
const REGELN_FR = Object.freeze({ datumsformat: 'TT/MM/JJJJ', dezimaltrenner: ',', tausendertrenner: ' ', sprachkennung: 'fr-FR' });

function baueModul({ texte: uebersetzt = require('./textsatz-fr-daten.js').TEXTSATZ_FR_TEXTE, V = null } = {}) {
  const { OFFEN_JURISTISCH } = require('./textsatz-en-juristisch-offen.js');
  const de = deTexte();
  const kern = V || require(path.join(REPO, 'tests', 'load-kern.js')).ladeKern().V;
  const amtlich = {};
  for (const k of OFFEN_JURISTISCH) {
    if (typeof de[k] !== 'string') throw new Error('FR-Erzeuger: amtliche Kennung fehlt im deutschen Modul: ' + k);
    if (Object.prototype.hasOwnProperty.call(uebersetzt, k)) throw new Error('FR-Erzeuger: amtlicher Wortlaut bleibt deutsch, nicht übersetzen: ' + k);
    amtlich[k] = de[k];
  }
  const texte = Object.assign({}, uebersetzt, amtlich);
  const { pvFestlegungenTexte, pvFestlegungenIds } = require('./lib/pv-festlegungen-textsatz.js');
  // Nur die Festlegungen, deren Wortlaut im Assistenten schon übersetzt ist; die übrigen zählt die Deckung als fehlend.
  const pvIds = pvFestlegungenIds(kern).filter((id) => typeof texte['wizard:pvwiz.' + id + '.label'] === 'string');
  Object.assign(texte, pvFestlegungenTexte(texte, pvIds));
  const kennungen = Object.keys(de);
  const fehlend = kennungen.filter((k) => typeof texte[k] !== 'string');
  return {
    modul: { modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, anbieterId: 'vivodepot', texte, regeln: { ...REGELN_FR } },
    deckung: { kennungen: kennungen.length, vorhanden: kennungen.length - fehlend.length, fehlend },
  };
}

function main(argv = process.argv.slice(2)) {
  const { V } = require(path.join(REPO, 'tests', 'load-kern.js')).ladeKern();
  const { modul, deckung } = baueModul({ V });
  console.log('Deckung: ' + deckung.vorhanden + ' von ' + deckung.kennungen);
  if (argv.includes('--deckung')) return 0;
  if (deckung.fehlend.length) {
    console.error('ABBRUCH: ' + deckung.fehlend.length + ' Kennung(en) ohne französischen Text, z. B. ' + deckung.fehlend.slice(0, 5).join(', '));
    return 1;
  }
  const r = V.textsatzModulPruefen(modul, { vertrauenswuerdig: true });
  if (!r.gueltig || r.verworfene.length) {
    console.error('ABBRUCH: ' + (r.gueltig ? r.verworfene.length + ' Kennung(en) verworfen' : 'Modul ungültig — ' + r.grund));
    return 1;
  }
  const bytes = Buffer.byteLength(JSON.stringify(modul), 'utf8');
  if (bytes > MAX) { console.error('ABBRUCH: ' + bytes + ' Bytes über der Einlass-Obergrenze (' + MAX + ').'); return 1; }
  if (bytes > MAX * 0.8) console.warn('WARNUNG: ' + bytes + ' Bytes sind mehr als 80 % der Einlass-Obergrenze.');
  const ausgabe = argv.find((a) => !a.startsWith('--')) || path.join(__dirname, 'textsatz-fr-modul.json');
  fs.writeFileSync(ausgabe, JSON.stringify(modul, null, 2) + '\n', 'utf8');
  console.log('Modul geschrieben: ' + ausgabe + ' (' + bytes + ' Bytes)');
  return 0;
}

module.exports = { baueModul, main, REGELN_FR };

if (require.main === module) process.exitCode = main();
