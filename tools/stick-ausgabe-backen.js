'use strict';
/* ════════════════════════════════════════════════════════════════════════
   stick-ausgabe-backen.js — die Auslieferungsform in eine fertige Produktdatei backen
   ────────────────────────────────────────────────────────────────────────
   Vivodepot wird auch auf einem USB-Stick verkauft. Vom Stick geöffnet soll die Anwendung
   beim Schließen auf den Stick sichern und danach die Kopie im fremden Browser räumen
   (Produktentscheidung „Mittelweg", 16.09.2026). Dafür muss die Datei WISSEN, dass sie
   Stick-Ware ist: `file://` allein sagt es nicht — dieselbe Adresse hat die heruntergeladene
   Datei im eigenen Download-Ordner, und den Pfad zu deuten wäre Raten.

   DIE REGION KOMMT AUS DEM GEGENSTAND, NICHT AUS DIESER DATEI. Die Marker werden aus der
   Kennung abgeleitet (dieselbe Schreibweise wie jede andere Ab-Werk-Region), und die Spanne
   wird in der ÜBERGEBENEN Datei gesucht. Fehlt sie, steht sie doppelt, oder trägt sie etwas
   anderes als reine Nutzlast, bricht der Lauf ab — er rät nicht und schreibt nichts.
   Geschrieben wird über `_regionNutzlastSetzen` aus tools/lib/produkt-text-erzeugen.js,
   denselben Weg, den der Konfektionierer für alle übrigen Regionen nimmt.

   Aufruf:
     node tools/stick-ausgabe-backen.js --datei PFAD              (backt { art: 'stick' })
     node tools/stick-ausgabe-backen.js --datei PFAD --art keine  (nimmt das Merkmal zurück)
     node tools/stick-ausgabe-backen.js --pruefen PFAD            (sagt nur, was drinsteht)
   Ohne Argument läuft die Selbstprobe gegen den Kern im Repo (schreibt nichts).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { _regionSpanne, _regionNutzlastSetzen } = require('./lib/produkt-text-erzeugen.js');

const KENNUNG = 'AB_WERK_AUSGABE';
// Dieselbe Ableitung wie bei jeder Ab-Werk-Region: aus der Kennung, nicht aus einem zweiten Literal.
const REGION = Object.freeze({
  kennung: KENNUNG,
  begin: '/* ' + KENNUNG + ':BEGIN */',
  ende: '/* ' + KENNUNG + ':END */',
  nativerWert: 'null',
});

const ARTEN = Object.freeze({ stick: { art: 'stick' }, keine: null });

/* Genau EIN Markerpaar — sonst wüsste niemand, welches gemeint ist (Lehre aus dem
   Showcase-Bäcker: ein zweites BEGIN macht das Ergebnis mehrdeutig, nicht falsch-aber-harmlos). */
function _spanneEindeutig(quelle, datei) {
  const anfaenge = quelle.split(REGION.begin).length - 1;
  const enden = quelle.split(REGION.ende).length - 1;
  if (anfaenge !== 1 || enden !== 1) {
    throw new Error('Region ' + KENNUNG + ' steht ' + anfaenge + 'x/' + enden + 'x in ' + datei +
      ' — genau einmal erwartet. Nicht geraten, nichts geschrieben.');
  }
  return _regionSpanne(quelle, REGION, datei);
}

/* Was steht heute drin? Liest die Nutzlast als Text — bewusst ohne eval: die Antwort ist eine
   Auskunft für Menschen und Proben, nicht ein Wert für den Kern. */
function ausgabeLesen(quelle, datei) {
  const { innenStart, innenEnde } = _spanneEindeutig(quelle, datei || '(Text)');
  const innen = quelle.slice(innenStart, innenEnde).trim();
  return { roh: innen, istStick: /art"?\s*:\s*"stick"/.test(innen), leer: /=\s*null\s*;$/.test(innen) };
}

function ausgabeBacken(quelle, art, datei) {
  if (!Object.prototype.hasOwnProperty.call(ARTEN, art)) {
    throw new Error('Unbekannte Auslieferungsform „' + art + '" — erlaubt: ' + Object.keys(ARTEN).join(', '));
  }
  _spanneEindeutig(quelle, datei || '(Text)');
  return _regionNutzlastSetzen(quelle, REGION, ARTEN[art], datei || '(Text)');
}

function dateiBacken(pfad, art) {
  const quelle = fs.readFileSync(pfad, 'utf8');
  const neu = ausgabeBacken(quelle, art, pfad);
  fs.writeFileSync(pfad, neu);
  return ausgabeLesen(neu, pfad);
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const wert = (flagge) => { const i = argv.indexOf(flagge); return i >= 0 ? argv[i + 1] : null; };
  const pruefen = wert('--pruefen');
  const datei = wert('--datei');
  const art = wert('--art') || 'stick';
  try {
    if (pruefen) {
      const stand = ausgabeLesen(fs.readFileSync(pruefen, 'utf8'), pruefen);
      console.log(stand.istStick ? 'Stick-Ausgabe' : (stand.leer ? 'keine Auslieferungsform gebacken' : 'andere Nutzlast'));
      console.log(stand.roh);
    } else if (datei) {
      const stand = dateiBacken(datei, art);
      console.log('gebacken: ' + art + ' → ' + datei);
      console.log(stand.roh);
    } else {
      // Selbstprobe ohne Argument: gegen den Kern im Repo, nur lesen.
      const kern = path.join(__dirname, '..', 'vivodepot.html');
      const stand = ausgabeLesen(fs.readFileSync(kern, 'utf8'), kern);
      console.log('Selbstprobe gegen den Kern — Region gefunden, genau einmal.');
      console.log(stand.roh);
      if (!stand.leer) { console.error('ROT: der Kern im Repo trägt eine Auslieferungsform. Er muss leer bleiben.'); process.exit(1); }
    }
  } catch (e) { console.error('ROT: ' + e.message); process.exit(1); }
}

module.exports = { REGION, ARTEN, ausgabeLesen, ausgabeBacken, dateiBacken };
