#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-logik-typen — die Datenlesen-Typen eines Logik-Moduls: eine Quelle,
   zwei Verbraucher
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS, gemessen am 06.09.2026 (U2-ADR-325):

     Kern    LOGIK_DATEN_TYPEN        6 Typen, darunter `listenfeldAlle`
     Lesen   LOGIK_DATEN_TYPEN_LESEN  5 Typen — `listenfeldAlle` fehlte

   `listenfeldAlle` entstand am 05.09.2026 im Kern (U2-ADR-287, Pro-Notar-
   Kanzleivertretung). Die Lese-App führte ihre eigene Aufzählung derselben
   Sache und zog nicht mit. Ein unbekannter Typ im `datenSchema` weist das
   GANZE Bundle ab — beide eingelassenen Pro-Templates (U2-ADR-287, U2-ADR-295)
   waren beim Empfänger damit nicht vorhanden, obwohl der Kern sie zeigt.

   Es war keine falsche Zeile, sondern eine zweite Liste. Darum ein Erzeuger und
   kein Wächter: dieselbe Antwort, die das Repo für die Bereiche schon gibt
   (`tools/build-bereiche.js`) — eine Quelle, generierte Region zwischen
   Markern, `--check` im Gate.

   ── UND ER SCHREIBT NICHT BLIND AB ──────────────────────────────────────────
   Ein bloß kopierter Typname wäre SCHLIMMER als der alte Zustand. Heute weist
   die Lese-App ein Bundle mit unbekanntem Typ ab — laut und ganz. Stünde der
   Name in der Liste, ohne dass `_datenPrimitivLesenLesen` einen `case` dafür
   hat, nähme sie das Bundle an und ließe das Feld still leer
   (`default: return undefined`). Der Empfänger sähe ein Dokument mit Löchern
   und wüsste nicht, dass sie da sind.

   Darum prüft dieser Erzeuger BEIDES und schlägt fehl, wenn ein Typ des Kerns
   in der Lese-App keinen Lese-Fall hat. Ein siebter Typ im Kern macht das Gate
   rot, statt hier still zu fehlen — und die Meldung sagt, was zu bauen ist.

   Aufruf:
     node tools/build-logik-typen.js            → schreibt die Region
     node tools/build-logik-typen.js --check    → schreibt nichts, meldet Drift (Exit 1)
     node tools/build-logik-typen.js --lese <pfad>
         Gegenstand als Argument (stehende Schreibregel für Prüfwerkzeuge):
         `--check` läuft dann gegen die genannte Kopie statt gegen die echte
         Auslieferungsdatei. Ohne das Argument derselbe volle Lauf.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const LESE_ECHT = path.join(REPO, 'vivodepot-lesen.html');

const BEGIN = '/* LOGIK-DATEN-TYPEN:BEGIN — generierter Bereich (tools/build-logik-typen.js); Quelle: vivodepot.html LOGIK_DATEN_TYPEN */';
const ENDE = '/* LOGIK-DATEN-TYPEN:END */';

/* Die Quelle. Aus dem Quelltext gelesen und nicht aus einem Kommentar — dieselbe
   Regel wie in `build-bereiche.js`: was hier steht, muss im Kern stehen. */
function kernTypen(quelle) {
  const m = quelle.match(/const LOGIK_DATEN_TYPEN\s*=\s*Object\.freeze\(\[([^\]]*)\]\)/);
  if (!m) throw new Error('LOGIK_DATEN_TYPEN im Kern nicht gefunden — der Anker trägt nicht mehr.');
  const typen = m[1].split(',').map((t) => t.trim().replace(/^'|'$/g, '')).filter(Boolean);
  if (!typen.length) throw new Error('LOGIK_DATEN_TYPEN im Kern ist leer — das ist kein gültiger Stand.');
  return typen;
}

/* Welche Typen die Lese-App tatsächlich LESEN kann. Nicht die Liste, sondern die
   `case`-Zweige des Primitivs — die Liste ist die Behauptung, die Zweige sind die Sache. */
function leseFaelle(quelle) {
  const von = quelle.indexOf('function _datenPrimitivLesenLesen');
  if (von < 0) throw new Error('_datenPrimitivLesenLesen in der Lese-App nicht gefunden — der Anker trägt nicht mehr.');
  const bis = quelle.indexOf('\nfunction ', von + 1);
  const koerper = quelle.slice(von, bis < 0 ? quelle.length : bis);
  const faelle = [...koerper.matchAll(/case\s+'([A-Za-z]+)'\s*:/g)].map((m) => m[1]);
  if (!faelle.length) throw new Error('keine `case`-Zweige in _datenPrimitivLesenLesen gefunden.');
  return faelle;
}

/* DIE PRÜFUNG, für die es diesen Erzeuger überhaupt gibt. */
function deckungPruefen(typen, faelle) {
  const fehlend = typen.filter((t) => faelle.indexOf(t) < 0);
  if (fehlend.length) {
    throw new Error(
      'Der Kern kennt Datenlesen-Typen, für die die Lese-App keinen Fall hat: ' + fehlend.join(', ') + '.\n'
      + 'Diese Liste NICHT einfach nachziehen — ein Typname ohne `case` in `_datenPrimitivLesenLesen`\n'
      + 'lässt die Lese-App das Bundle ANNEHMEN und das Feld still leer lassen. Der Empfänger sähe\n'
      + 'ein Dokument mit Löchern und wüsste nicht, dass sie da sind.\n'
      + 'Zuerst den Lese-Fall bauen — samt Sensibel-Prüfung je Zeile, wo der Typ Zeilen liest —,\n'
      + 'dann diesen Erzeuger laufen lassen.');
  }
  return fehlend;
}

function region(typen) {
  return [
    BEGIN,
    '/* ERZEUGT, nicht von Hand gepflegt. Die Liste ist die des Kerns — eine zweite, danebengepflegte',
    '   Aufzählung lief auseinander und tat es: `listenfeldAlle` (U2-ADR-287) fehlte hier einen Tag',
    '   lang, und ein unbekannter Typ im datenSchema weist das GANZE Bundle ab. Beide eingelassenen',
    '   Pro-Templates waren beim Empfänger damit nicht vorhanden.',
    '',
    '   DER ERZEUGER SCHREIBT NICHT BLIND AB: er prüft, dass die Lese-App zu jedem Typ des Kerns',
    '   einen `case`-Zweig in `_datenPrimitivLesenLesen` hat, und schlägt fehl, wenn einer fehlt.',
    '   Ein bloß abgeschriebener Name wäre schlimmer als der alte Zustand — die Lese-App nähme das',
    '   Bundle dann an und ließe das Feld still leer (`default: return undefined`). Der Empfänger',
    '   sähe ein Dokument mit Löchern und wüsste nicht, dass sie da sind. */',
    'const LOGIK_DATEN_TYPEN_LESEN = Object.freeze([' + typen.map((t) => "'" + t + "'").join(', ') + ']);',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('LOGIK-DATEN-TYPEN-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function lauf({ lesePfad = LESE_ECHT, check = false } = {}) {
  const kern = fs.readFileSync(KERN, 'utf8');
  const lese = fs.readFileSync(lesePfad, 'utf8');
  const typen = kernTypen(kern);
  deckungPruefen(typen, leseFaelle(lese));
  const neu = regionErsetzen(lese, region(typen), path.basename(lesePfad));
  const drift = neu !== lese;
  if (drift && !check) fs.writeFileSync(lesePfad, neu, 'utf8');
  return { typen, drift, geschrieben: drift && !check };
}

function main() {
  const check = process.argv.includes('--check');
  const iL = process.argv.indexOf('--lese');
  const lesePfad = (iL >= 0 && process.argv[iL + 1]) ? path.resolve(process.argv[iL + 1]) : LESE_ECHT;
  let r;
  try {
    r = lauf({ lesePfad, check });
  } catch (e) {
    console.error('build-logik-typen: ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
  if (check && r.drift) {
    console.error('build-logik-typen: ' + path.basename(lesePfad) + ' weicht vom Kern ab. '
      + 'Beheben mit: node tools/build-logik-typen.js');
    process.exit(1);
  }
  console.log('build-logik-typen: ' + r.typen.length + ' Typen (' + r.typen.join(', ') + ') — '
    + (r.geschrieben ? 'geschrieben.' : 'nichts zu tun.'));
}

if (require.main === module) main();
module.exports = { lauf, kernTypen, leseFaelle, deckungPruefen, region, regionErsetzen, BEGIN, ENDE, KERN, LESE_ECHT };
