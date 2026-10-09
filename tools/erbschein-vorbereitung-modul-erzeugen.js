'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   erbschein-vorbereitung-modul-erzeugen.js — der Erbschein-Vorbereitungsauszug
   als echtes, ausgeliefertes Bündel statt nur als Testfixture
   ────────────────────────────────────────────────────────────────────────────
   WOZU (05.09.2026, gegen die Definition of Done „in
   Bürgerdepot eingelassenes Juratemplate (Erbschein)"). Der Einlassweg selbst
   ist längst bewiesen — echter `modulEinlassen()`-Registry-Weg, echter
   Datei-Upload über die Einstellungen-UI (`tests/e2e/erbschein-
   vorbereitungsauszug-abnahme.spec.js`), byte-genauer Vergleich gegen den
   früher fest verdrahteten Stand (`tests/siebtes-register-erbschein-byte-
   gleichheit.test.js`). Was fehlte: das Modul lag NUR unter `tests/fixtures/`
   — Prüfstoff, kein Erzeugnis, das eine Institution/Vivodepot selbst
   herunterladen und über den echten Andock-Weg einlassen könnte.

   NICHT `module/`: das Verzeichnis ist laut U2-ADR-270 reserviert für das
   provisionierte BÜRGERDEPOT-Modul selbst („keinen Anbieter, keine
   Signaturkette, keine Zertifikats-Ausstellung") — das genaue Gegenteil
   dessen, was der Erbschein-Auszug ist: ein `logikModul` über den echten
   Einlass-/Trust-Weg (`EINLASS_REGISTER`). Beides dort zu mischen bräche die
   EUPL-1.2-Argumentation, die ADR-270 für `module/` hält.

   MUSTER: `tools/textsatz-en-modul-erzeugen.js` → `tools/textsatz-en-
   modul.json` — dieselbe Bauart für dasselbe Problem (Vivodepots eigenes,
   unsigniertes Modul, real ausgeliefert statt nur getestet).

   UNSIGNIERT, BEWUSST: dies ist Vivodepots EIGENES Modul (kein Fremdmodul) —
   `herkunft: "vivodepot"` markiert die Herkunft im Klartext, wörtlich auch im
   gerenderten Dokument selbst ("Vivodepot-Zusammenstellung aus Ihren
   Depot-Angaben — keine amtliche Vorlage, keine Verbindung zu
   service.justiz.de"). Der volle Zertifikatsweg (U2-ADR-172/181,
   das Signier-Werkzeug des Ausgabebetriebs) bräuchte Vivodepots reale Ausgabestelle-.vdkey
   samt Passphrase — operative Betriebs-Infrastruktur, die in keinem
   Arbeitsbaum liegt und die dieses Werkzeug nie anfasst. Dieses Bündel
   beweist darum den EINLASSWEG, nicht die Fremdzertifizierung.

   EINE QUELLE, KEIN ZWEITES BÜNDEL: der Modul-Inhalt selbst wird NICHT hier
   neu verfasst, sondern aus der bestehenden, bereits doppelt getesteten
   Fixture gelesen (`tests/fixtures/erbschein-vorbereitung-logikmodul.json`,
   von `tests/erbschein-modul-mechanik.test.js` UND `tests/siebtes-register-
   erbschein-byte-gleichheit.test.js` referenziert — deren eigener Kommentar
   warnt ausdrücklich vor einem zweiten, leicht abweichenden Test-Bundle).
   Dieses Werkzeug validiert diese eine Quelle über den echten
   `logikModulPruefen`-Pfad (denselben, den `modulEinlassen()` beim Import
   nimmt) und schreibt sie unverändert als reales, ausgeliefertes Artefakt.
   `tests/erbschein-modul-tools-byte-gleichheit.test.js` hält beide Dateien
   dauerhaft byte-identisch — zwei leicht abweichende Bündel wären die
   schlimmere Fassung von „gebaut, nie verdrahtet": gebaut, zweimal, leicht
   verschieden.

   Aufruf:
     node tools/erbschein-vorbereitung-modul-erzeugen.js [ausgabepfad.json]
     (Standard-Ausgabepfad: tools/erbschein-vorbereitung-modul.json)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const QUELLE = path.join(REPO, 'tests', 'fixtures', 'erbschein-vorbereitung-logikmodul.json');

function leseModul() {
  return JSON.parse(fs.readFileSync(QUELLE, 'utf8'));
}

function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const modul = leseModul();

  if (modul.herkunft !== 'vivodepot') {
    console.error('ABBRUCH: die Quelle trägt nicht mehr `herkunft: "vivodepot"` — dieses Werkzeug '
      + 'liefert ausdrücklich nur Vivodepots eigenes, unsigniertes Modul aus, keine fremde Herkunft.');
    process.exit(1);
  }

  // Derselbe Prüf-Weg wie beim echten Einlass (modulEinlassen → reg.pruefen(modul) für
  // modulTyp:'logikModul') — ein Fehler hier heißt, ein echter Einlass würde ihn ebenso ablehnen.
  const r = V.logikModulPruefen(modul);
  if (!r.gueltig) {
    console.error('ABBRUCH: Modul ungültig — Grund: ' + r.grund);
    process.exit(1);
  }
  if (r.verworfene.length) {
    console.error('ABBRUCH: ' + r.verworfene.length + ' Schlüssel würde(n) beim Einlass verworfen — '
      + 'Modul würde unvollständig ankommen:');
    for (const v of r.verworfene.slice(0, 20)) console.error('  ' + JSON.stringify(v));
    process.exit(1);
  }

  const groesseTiefe = V._modulGroesseTiefePruefen(modul, {
    maxBytes: V._MODUL_EINLASS_MAX_BYTES, maxTiefe: V._MODUL_EINLASS_MAX_TIEFE,
  });
  if (!groesseTiefe.ok) {
    console.error('ABBRUCH: Größen-/Tiefen-Prüfung fehlgeschlagen — Grund: ' + groesseTiefe.grund);
    process.exit(1);
  }

  const roh = fs.readFileSync(QUELLE, 'utf8');
  const ausgabepfad = process.argv[2] || path.join(__dirname, 'erbschein-vorbereitung-modul.json');
  fs.writeFileSync(ausgabepfad, roh, 'utf8');

  console.log('Modul geschrieben: ' + ausgabepfad);
  console.log('Quelle (einzige, unverändert übernommen): ' + path.relative(REPO, QUELLE));
  console.log('logikModulPruefen: gültig, 0 verworfene Schlüssel.');
  console.log('Größe: ' + groesseTiefe.bytes + ' von ' + V._MODUL_EINLASS_MAX_BYTES
    + ' Bytes erlaubt, Tiefe ' + groesseTiefe.tiefe + ' von ' + V._MODUL_EINLASS_MAX_TIEFE + '.');
  console.log('Hinweis: dieses Bündel ist selbst-eingelassen (ungeprueft:true beim Import), nicht '
    + 'fremdsigniert — es beweist den Einlassweg, nicht die Fremdzertifizierung.');
}

if (require.main === module) main();
module.exports = { leseModul };
