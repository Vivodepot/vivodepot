'use strict';
/* dokumentmodul-folge-fingerabdruck.js — die FOLGE der Abschnitte und Bloecke
   (U2-ADR-333, 06.09.2026)
   ---------------------------------------------------------------------------
   WARUM DIE FOLGE UND NICHT DIE ZAHL. Die Kennungen der Dokument-Module tragen
   einen Index, weil es nichts Besseres gibt: null von 35 Abschnitten und null
   von 75 Bloecken haben eine `id`. Ein Index verschiebt sich, sobald jemand
   etwas einfuegt — das faengt auch eine Zaehlung.

   EIN TAUSCH ABER LAESST DIE ZAHL UNVERAENDERT. Und ein Tausch ist genau der
   Fall, der den Schaden anrichtet: ein Sprachmodul liefert still den falschen
   Text an die falsche Stelle, in einem Vollmachtsdokument. Darum wird die
   REIHENFOLGE festgehalten, nicht ihre Laenge.

   UND DIE MELDUNG SAGT, WAS SICH VERSCHOBEN HAT. Wer sie rot sieht, muss
   wissen, ob er eine Zeile eingefuegt oder eine Reihenfolge geaendert hat: das
   erste ist harmlos und braucht nur nachgezogene Kennungen, das zweite bricht
   bestehende Uebersetzungen. Eine Meldung, die nur "hat sich geaendert" sagt,
   laesst beide gleich aussehen.

   DER DAUERHAFTE AUSWEG waeren `id`s an Abschnitten und Bloecken — dann
   braeuchte keine Kennung einen Index und dieses Werkzeug keinen Gegenstand.
   Das ist ein eigener Zug am Bestand; die Grenze steht hier, damit sie benannt
   ist. */

/* Der Anker eines Blocks ist derselbe, den der Kern fuer die Kennung nimmt:
   `feldId`, wo vorhanden, sonst die Position. Wer hier etwas anderes naehme,
   bewachte eine andere Kennung als die gebaute. */
function blockAnker(block, index) {
  return (block && typeof block.feldId === 'string' && block.feldId) ? block.feldId : String(index);
}

/* Ein Abschnitt hat keinen Namen — sein Fingerabdruck ist der Anfang seines
   Titels, sonst seiner Eingangsformel, sonst seine Position. Der Anfang genuegt
   und ist absichtlich kurz: der Fingerabdruck soll auf ein VERSCHIEBEN
   ansprechen, nicht auf jede Textaenderung — sonst faerbt ihn jede Uebersetzung
   rot und er wird abgeschaltet. */
function abschnittAnker(abschnitt, index) {
  const t = (abschnitt && (abschnitt.titel || abschnitt.eingangsformel)) || '';
  return typeof t === 'string' && t.trim() ? t.trim().slice(0, 24) : '#' + index;
}

function folgeVon(modul) {
  if (!modul || !Array.isArray(modul.abschnitte)) return [];
  return modul.abschnitte.map((a, i) => ({
    abschnitt: abschnittAnker(a, i),
    bloecke: (Array.isArray(a && a.bloecke) ? a.bloecke : []).map(blockAnker),
  }));
}

/** Fingerabdruck als flache, vergleichbare Zeichenkette je Modul. */
function fingerabdruck(modul) {
  return folgeVon(modul).map((a) => a.abschnitt + '{' + a.bloecke.join(',') + '}').join('|');
}

/* Vergleicht zwei Folgen und sagt, WAS passiert ist. Die drei Faelle sind
   verschieden teuer, und die Meldung unterscheidet sie. */
function vergleiche(vorher, jetzt) {
  const a = folgeVon(vorher), b = folgeVon(jetzt);
  if (fingerabdruck(vorher) === fingerabdruck(jetzt)) return { gleich: true, art: null, meldung: '' };

  const nA = a.map((x) => x.abschnitt), nB = b.map((x) => x.abschnitt);
  const mengeA = [...nA].sort().join(' '), mengeB = [...nB].sort().join(' ');

  if (mengeA === mengeB) {
    const stelle = nA.findIndex((x, i) => x !== nB[i]);
    return {
      gleich: false,
      art: 'getauscht',
      meldung: 'REIHENFOLGE GETAUSCHT ab Position ' + stelle + ': "' + nA[stelle]
        + '" steht jetzt an der Stelle von "' + nB[stelle] + '". Das bricht bestehende '
        + 'Uebersetzungen — jede indizierte Kennung ab hier zeigt auf einen anderen Text.',
    };
  }
  const dazu = nB.filter((x) => !nA.includes(x));
  const fort = nA.filter((x) => !nB.includes(x));
  return {
    gleich: false,
    art: (dazu.length && !fort.length) ? 'eingefuegt' : ((fort.length && !dazu.length) ? 'entfernt' : 'veraendert'),
    meldung: (dazu.length ? 'NEU: ' + dazu.join(' - ') + '. ' : '')
      + (fort.length ? 'FORT: ' + fort.join(' - ') + '. ' : '')
      + 'Eingefuegtes ist harmlos und braucht nur nachgezogene Kennungen; Entferntes '
      + 'laesst tote Kennungen zurueck.',
  };
}

module.exports = { folgeVon, fingerabdruck, vergleiche, blockAnker, abschnittAnker };

if (require.main === module) {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const aus = {};
  for (const name of ['PV_MODUL', 'VOLLMACHT_MODUL', 'KI_MODUL', 'BETREUUNG_MODUL']) {
    aus[name] = fingerabdruck(V[name]);
  }
  console.log(JSON.stringify(aus, null, 1));
}
