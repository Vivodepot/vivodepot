'use strict';
/* ════════════════════════════════════════════════════════════════════════
   kern-lesen.js — der bequeme Weg liefert Inhalt, nicht das nackte Gerüst
   ────────────────────────────────────────────────────────────────────────
   Schnitt-Nachtrag (18.09.2026). Seit dem Schnitt trägt die rohe,
   eingecheckte vivodepot.html kein Feld-Schema mehr inline — Bereiche
   wandern aus tools/bereich-templates/*.json (und Geschwister-Regionen)
   ein, erst `_standardProduktBaken` (tests/load-kern.js) füllt die
   AB_WERK-Regionen mit echtem Inhalt. `fs.readFileSync(...vivodepot.html)`
   ist der bequemste, unauffälligste Weg — und liefert für Feldschema-
   Zwecke seither das Falsche: ein leeres Gerüst statt eines Produkts.

   GEFUNDEN, AN DIESEM TAG, DREIMAL: die E2E-Strecke (-80), neun Wächter-
   Anker in tools/waechter-register.js (-6c), und die beiden Werkzeuge,
   deren Fix diese Datei trägt (tools/nativ-bestand-aenderungen-erheben.js,
   tools/anzeigetexte-orten.js). Kein Zufall — derselbe blinde Standard.

   DIE UMKEHRUNG: `kernGebackenLesen()` ist der bequeme, empfohlene Weg —
   wer Inhalt will, muss nichts Besonderes tun. `kernRohLesen()` nur, wer
   das nackte Gerüst ausdrücklich will (Prüfsummen, git-diff-Ratschen,
   Byte-Identität — dieselbe Absicht wie -80s benannte Konstante für die
   E2E-Strecke).

   RÜCKWÄRTSKOMPATIBEL MIT ÄLTEREN STÄNDEN: ein VOR dem Schnitt committeter
   Stand trägt sein Feldschema noch inline — die AB_WERK-Marker-Kommentare
   existieren dort nicht, und `_standardProduktBaken` wirft dann („Ab-Werk-
   Region fehlt/beschädigt"), weil sie etwas sucht, das es dort nie gab.
   `kernGebackenLesen()` bäckt darum NUR, wenn der Marker wirklich da ist —
   ein alter Stand kommt unverändert roh zurück, sein Inhalt ist ja schon
   da. Gemessen, nicht angenommen: Backen gegen den Stand vor dem Schnitt
   (37038011) wirft ohne diese Prüfung, mit ihr nicht.

   RENNENFEST GEGEN GLEICHZEITIGEN SCHREIBZUGRIFF (Nachtrag A65-Absturz,
   18.09.2026, gemessen). Die Repo-Wurzel-vivodepot.html hat
   keinen zentralen Schreibpfad im Code — Fix-Sitzungen ändern sie direkt
   über ihr gewöhnliches Editier-Werkzeug, am geteilten Arbeitsbaum, mit
   mehreren Sitzungen gleichzeitig (kein `renameSync`/atomares Schreiben
   möglich, das Muster existiert im Projekt nur für ERZEUGTE Dateien).
   Ein Leser kann darum mitten in einem fremden Schreibvorgang lesen und
   eine Region halb geschrieben sehen — `_regionSpanne` wirft dann zu
   Recht („fehlt/beschädigt"), nur trifft der Wurf einen Normalzustand,
   nicht nur einen echten Schaden. Bestätigt: eine künstlich zerrissene
   Kopie wirft exakt dieselbe Fehlerklasse.

   Der Wurf bleibt ein Wurf — kein stilles Auffangen. Nur der Lesevorgang
   selbst bekommt begrenzte Versuche mit frischem Read dazwischen, weil ein
   Riss durch gleichzeitiges Schreiben typischerweise Millisekunden dauert.
   Jeder Fehlversuch meldet sich auf stderr — eine Wiederholung, die kein
   Mensch je sieht, macht aus einem Riss ein Rauschen. Bleibt es nach allen
   Versuchen beschädigt, wirft die letzte Meldung weiter, ergänzt um die
   Versuchszahl — das unterscheidet einen echten Schaden (bleibt über alle
   Versuche beschädigt) von einem vorübergehenden Riss (heilt beim
   nächsten Read). */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

// Ein Marker, der nur in post-Schnitt-Ständen existiert — reicht als Anwesenheits-
// probe für "braucht dieser Stand ein Backen". Backen selbst prüft alle Regionen.
const BACK_ANKER = 'AB_WERK_BEREICH_QUELLEN:BEGIN';

// Nur Riss-Meldungen (Region fehlt/beschädigt) sind wiederholbar — jeder andere
// Fehler beim Backen ist ein echter Defekt und wird sofort weitergeworfen.
const RISS_MUSTER = /Ab-Werk-Region .* fehlt\/besch.digt/;
const VERSUCHE_MAX = 3;
const WARTE_MS = 20;

function schlafSyncMs(ms) {
  const puffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(puffer), 0, 0, ms);
}

function kernRohLesen(pfad) {
  return fs.readFileSync(pfad || KERN_PFAD, 'utf8');
}

function kernGebackenLesen(pfad, opts) {
  // eslint-disable-next-line global-require
  const { _standardProduktBaken } = require(path.join(REPO, 'tests', 'load-kern.js'));
  let letzterFehler;
  for (let versuch = 1; versuch <= VERSUCHE_MAX; versuch++) {
    const roh = kernRohLesen(pfad);
    if (!roh.includes(BACK_ANKER)) return roh; // aelterer, bereits-inline Stand — nichts zu backen
    try {
      return _standardProduktBaken(roh, opts);
    } catch (err) {
      if (!RISS_MUSTER.test(err.message)) throw err; // kein Riss-Muster — kein Grund zur Wiederholung
      letzterFehler = err;
      process.stderr.write(
        `[kern-lesen] Riss beim Backen (Versuch ${versuch}/${VERSUCHE_MAX}, ${pfad || KERN_PFAD}): ` +
        `${err.message}\n`);
      if (versuch < VERSUCHE_MAX) schlafSyncMs(WARTE_MS);
    }
  }
  throw new Error(
    `kernGebackenLesen: nach ${VERSUCHE_MAX} Versuchen weiterhin beschädigt (${pfad || KERN_PFAD}) — ` +
    'vermutlich wurde waehrend des Lesens geschrieben (geteilter Arbeitsbaum, kein atomarer ' +
    `Schreibpfad fuer diese Datei), kann aber auch echter Schaden sein. Letzter Fehler: ${letzterFehler.message}`);
}

module.exports = { kernRohLesen, kernGebackenLesen, KERN_PFAD, BACK_ANKER };
