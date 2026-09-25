'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Eine Leseart statt dreiundvierzig — der Wächter gegen die nächste (Zug 4)
   ────────────────────────────────────────────────────────────────────────────
   `V.SEKTOREN` ist die BÜNDEL-Liste. Sobald ein Bereich ab Werk gesät wird, lebt er in der
   Registry und steht dort nicht mehr — wer `V.SEKTOREN` liest, bekommt dann still einen
   Bereich weniger. `bereicheAlle()` ist die eine Lesestelle, die Bündel und Registry
   zusammenführt.

   WARUM ES DIESEN WÄCHTER GIBT, und der Grund ist Historie, keine Vermutung:
   `tools/lib/sektoren.js` wurde 2026 gegen genau diese Drift gebaut („Zwei Kopien derselben
   Funktion wären dieselbe Art Drift gewesen") — und hat trotzdem zweiundvierzig Nachbarn
   bekommen, die an ihr vorbei `V.SEKTOREN` lesen. Ein Fix ohne Wächter zerfällt.

   DER BEFUND, DER DEN WÄCHTER NÖTIG MACHT (09.09.2026 gemessen): von den zweiundvierzig
   Werkzeugen war nur NEUN durch eine Probe gedeckt. Dreiunddreissig gingen still auf zwölf
   — ein Wächter, der einen Bereich weniger prüft, meldet weiter grün: er prüft ja alles, was
   er sieht. **Die roten Proben sind das, was auffällt, nicht das, was falsch ist.**

   DIE BAUFORM — ein umgedrehter Wächter mit schrumpfender Liste:
   Die verbleibenden Lesearten stehen als BENANNTE Ausnahmen in `AUSNAHMEN`. Der Wächter ist
   damit heute grün. Er wird rot, sobald
     (a) eine NEUE Datei `V.SEKTOREN` liest, die nicht in der Liste steht, oder
     (b) eine Ausnahme veraltet — die Datei liest es nicht mehr (dann gehört sie aus der
         Liste) oder existiert nicht mehr.
   Mit jedem Zug der Kampagne schrumpft die Liste, und der Wächter zeigt selbst, wie weit
   sie ist, statt dass jemand nachzählt.

   KOMMENTARE WERDEN MASKIERT, BEVOR GESUCHT WIRD — und das ist nicht Feinschliff, sondern
   die Lehre aus Zug 0. Dort wurde ein Quelltext-Wächter GRÜN, weil der Kommentar, der
   erklärte warum sein Gegenstand verschwunden war, die gesuchte Zeichenfolge zitierte. Er
   fand sein eigenes Zitat und bewachte fortan nichts. Hier tritt dieselbe Falle sofort
   wieder auf: der Kopf-Kommentar von `lib/sektoren.js` nennt `V.SEKTOREN` mehrfach, um zu
   erklären, warum es dort nicht mehr gelesen wird. Ein Wächter, der Prosa liest, bewacht
   die Prosa.

   Aufruf:
     node tools/eine-leseart-pruefen.js              (gegen tools/ dieses Repos)
     node tools/eine-leseart-pruefen.js --verzeichnis <pfad>
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const GESUCHT = /\bV\.SEKTOREN\b/;

/* Die verbleibenden Lesearten, je mit dem Zug, der sie auflöst. Diese Liste SCHRUMPFT.
   Eine Datei hier einzutragen, statt sie zu ziehen, ist kein Fix — sie steht hier, weil ihr
   Zug noch nicht gefahren ist, nicht weil sie bleiben darf. */
const AUSNAHMEN = Object.freeze({
  /* LEER — die Kampagne ist durch (09.09.2026). Alle Werkzeuge in `tools/` lesen
     `bereicheAlle()`.

     WAS EIN EINTRAG HIER BEDEUTEN WUERDE: eine Datei, die die Buendel-Liste liest und deren
     Zug noch aussteht. Er ist eine Duldung auf Zeit, kein Freibrief — darum traegt jeder
     Eintrag den Zug, der ihn aufloest, und die zugehoerige Probe verlangt, dass es ein
     GUELTIGER Zug ist. Eine Ausnahme ohne Zug waere eine Duldung auf Dauer.

     WER HIER ETWAS EINTRAEGT, statt die Leseart zu ziehen, kehrt die Richtung dieser Liste
     um. Sie ist zum Schrumpfen gebaut: sie ging von 40 ueber 39 und 33 auf null, und der
     Waechter zeigte den Stand dabei selbst an, ohne dass jemand nachzaehlte. */
});

/* IST DIESE ZEILE CODE ODER PROSA? — zeilenweise, und das ist eine Entscheidung, keine
   Bequemlichkeit.

   ERSTER ANLAUF, UND WARUM ER FALSCH WAR: die Maskierung lief über die GANZE Datei —
   Blockkommentare, Zeilenkommentare und String-Literale in einem Durchgang durch den
   Zeichenstrom. Sie kannte keine Regex-Literale. In `gueltigkeitsbeginn-messen.js` steht

       /if \(feld\.typ !== 'datum' && !mitMarke\) return '';/.test(text)

   — das `'` in `'datum'` wurde als String-Anfang gelesen, der String schloss an der
   falschen Stelle, und ALLES danach war verdorben. Die echte Lesestelle vierzig Zeilen
   weiter unten verschwand, und der Wächter meldete die Datei als „liest es nicht mehr".
   Ein unbalanciertes Zeichen machte den Rest der Datei blind.

   ZEILENWEISE HÄLT DEN FEHLER LOKAL. Ein Regex-Literal auf Zeile 67 kann Zeile 107 nicht
   mehr vergiften. Die Blockkommentar-Klammer wird über die Zeilen mitgeführt (das ist die
   einzige Zustandsgrösse, die es geben MUSS); alles andere entscheidet sich in der Zeile,
   in der es steht.

   ES BLEIBT EINE HEURISTIK — darum die Positivkontrolle in der zugehörigen Probe: bekannte
   Dateien mit bekanntem Ergebnis, in BEIDE Richtungen. Eine, die es im Code liest, muss
   gefunden werden; eine, die es nur im Kommentar nennt, darf es nicht. Ohne sie wäre ein
   stilles „nichts gefunden" von einem echten Grün nicht zu unterscheiden — genau der
   Fehler, den der erste Anlauf gemacht hat. */
function liestImCode(quelltext) {
  const treffer = [];
  let imBlock = false;
  const zeilen = quelltext.split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    let zeile = zeilen[i];

    /* Blockkommentar-Zustand fortschreiben und dabei den auskommentierten Teil entfernen. */
    let rest = '';
    while (zeile.length) {
      if (imBlock) {
        const zu = zeile.indexOf('*/');
        if (zu === -1) { zeile = ''; break; }
        imBlock = false; zeile = zeile.slice(zu + 2); continue;
      }
      const auf = zeile.indexOf('/*');
      if (auf === -1) { rest += zeile; break; }
      rest += zeile.slice(0, auf);
      imBlock = true; zeile = zeile.slice(auf + 2);
    }

    /* Zeilenkommentar ab `//` — nur, wenn davor kein `:` einer URL steht. */
    const zk = rest.indexOf('//');
    if (zk !== -1 && !/[a-z]:$/i.test(rest.slice(0, zk))) rest = rest.slice(0, zk);
    if (!GESUCHT.test(rest)) continue;

    /* Steht der Treffer INNERHALB von Anführungszeichen dieser Zeile? Dann ist er Text —
       eine Fehlermeldung, die den Namen nennt, ist keine Lesestelle. Regex-Literale können
       hier höchstens diese eine Zeile falsch einordnen, nicht die Datei. */
    const pos = rest.search(GESUCHT);
    const davor = rest.slice(0, pos);
    const ungerade = (z) => (davor.split(z).length - 1) % 2 === 1;
    if (ungerade("'") || ungerade('"') || ungerade('`')) continue;

    treffer.push({ zeile: i + 1, text: rest.trim() });
  }
  return treffer;
}

function dateienSammeln(wurzel) {
  const funde = [];
  const gehen = (ordner) => {
    for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, eintrag.name);
      if (eintrag.isDirectory()) {
        if (eintrag.name === 'node_modules' || eintrag.name.startsWith('.')) continue;
        gehen(p); continue;
      }
      if (eintrag.isFile() && eintrag.name.endsWith('.js')) funde.push(p);
    }
  };
  gehen(wurzel);
  return funde.sort();
}

function pruefen(wurzel, ausnahmen) {
  const leser = [];
  for (const datei of dateienSammeln(wurzel)) {
    if (liestImCode(fs.readFileSync(datei, 'utf8')).length) leser.push(path.basename(datei));
  }
  const bekannt = new Set(Object.keys(ausnahmen));
  const neue = leser.filter((b) => !bekannt.has(b)).sort();
  const veraltet = [...bekannt].filter((b) => !leser.includes(b)).sort();
  return { leser: leser.sort(), neue, veraltet };
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--verzeichnis');
  const wurzel = (i >= 0 && argv[i + 1]) ? path.resolve(argv[i + 1]) : path.join(__dirname);
  const { leser, neue, veraltet } = pruefen(wurzel, AUSNAHMEN);

  process.stdout.write('eine-leseart-pruefen: ' + leser.length + ' Datei(en) lesen V.SEKTOREN, '
    + Object.keys(AUSNAHMEN).length + ' benannte Ausnahme(n).\n');

  if (neue.length) {
    process.stdout.write('\nROT — ' + neue.length + ' NEUE Leseart(en), in keiner Ausnahme benannt:\n');
    neue.forEach((b) => process.stdout.write('  ' + b + '\n'));
    process.stdout.write('\n  V.SEKTOREN ist die Bündel-Liste. Ein ab Werk gesäter Bereich steht dort\n'
      + '  NICHT — wer sie liest, bekommt still einen weniger. `bereicheAlle()` lesen.\n');
  }
  if (veraltet.length) {
    process.stdout.write('\nROT — ' + veraltet.length + ' VERALTETE Ausnahme(n): die Datei liest es nicht mehr\n'
      + '  (oder existiert nicht mehr). Das ist FORTSCHRITT — aus der Liste nehmen:\n');
    veraltet.forEach((b) => process.stdout.write('  ' + b + ' (' + AUSNAHMEN[b] + ')\n'));
  }
  if (!neue.length && !veraltet.length) {
    const offen = Object.keys(AUSNAHMEN).length;
    process.stdout.write(offen
      ? 'GRÜN — keine neue Leseart. Noch ' + offen + ' benannte, alle einem Zug zugeordnet.\n'
      : 'GRÜN — eine Leseart. Die Liste ist leer, die Kampagne ist fertig.\n');
  } else {
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { pruefen, liestImCode, dateienSammeln, AUSNAHMEN, GESUCHT };
