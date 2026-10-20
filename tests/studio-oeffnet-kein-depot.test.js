'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Das Studio öffnet kein Depot (Befund LESE-APP-MODULE-OHNE-WAHL, 17.10.2026, Klassensuche über die Anwendungen).
   Der Befund: eine Anwendung, die eine Depot-Datei öffnet und deren Module anmeldet, braucht die Regel des Kerns (wirkt nur ab
   Werk, nachgeprüft signiert oder gewählt). Kern und Lese-App haben sie. Das Studio baut Module, es öffnet keine Depots — diese
   Probe hält das fest, statt es zu glauben:
     1 jede Dateieingabe des Studios steht mit ihrer Sorte in der Liste unten; eine neue Eingabe ohne Eintrag ist rot;
     2 kein Studio-Code (ohne Kommentare) liest ein Modul-Fach eines Depots oder die Register-Listen.
   Kommt eines Tages ein Weg dazu, der ein Depot öffnet, gehört er in die Liste mit seiner Sorte — und das Studio braucht dann
   dieselbe Markierung wie die Lese-App (`_depotModuleNichtAngewandtMarkierenLesen`).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STUDIO = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

/* Jede Dateieingabe des Studios, mit dem, was sie einliest. Keine davon ist ein Depot. */
const EINGABEN = Object.freeze({
  'an-dateien': 'Antwort-Dateien (.jwe) an die Stelle',
  'tpl-csv': 'Spaltenliste (CSV) für eine neue Vorlage',
  'ent-datei': 'Entwurfsdatei des Studios',
  'sk-pruef-datei': 'Schlüsseldatei zum Prüfen',
  'pr-privkey': 'Schlüsseldatei zum Signieren',
  'ts-datei': 'Sprachmodul zum Bearbeiten',
  'bd-logo': 'Logo-Bild für das Erscheinungsbild der Marke',
});
/* Die Modul-Fächer eines Depots (MODUL_SLOTS der Lese-App, EINLASS_REGISTER des Kerns) und die Register-Listen selbst. */
const FAECHER = Object.freeze(['textsatzModule', 'rechtsraumModule', 'institutionsArten', 'formatModule', 'bereichsModule',
  'situationsModule', 'wizardsModule', 'ereignisAchseModule', 'brandingModule', 'logikModule', 'stellensatzModule',
  'erscheinungsModule', 'blattformatModule', 'bedingungskatalogModule', 'angehoerigenVorlagenModule', 'MODUL_SLOTS', 'EINLASS_REGISTER']);

function dateiEingaben(html) {
  return [...html.matchAll(/<input\b[^>]*\btype="file"[^>]*>/g)].map((m) => {
    const id = /\bid="([^"]+)"/.exec(m[0]);
    return id ? id[1] : m[0];
  });
}
/* Der Quelltext ohne Kommentare (Block-, Zeilen- und HTML-Kommentare); eine Erwähnung in einem Kommentar liest nichts. */
function ohneKommentare(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

test('[Studio·kein Depot] jede Dateieingabe des Studios steht mit ihrer Sorte in der Liste — keine öffnet ein Depot', () => {
  const ist = dateiEingaben(STUDIO);
  assert.ok(ist.length >= 5, 'Positivkontrolle: Eingaben gefunden: ' + ist.length);
  assert.deepEqual([...ist].sort(), Object.keys(EINGABEN).sort());
  // Kein anderer Weg zu einer Datei: kein Dateidialog per Skript, kein Ablegen von Dateien.
  for (const muster of [/showOpenFilePicker/, /dataTransfer\.files/, /createElement\(\s*['"]input['"]\s*\)/]) {
    assert.ok(!muster.test(ohneKommentare(STUDIO)), 'weiterer Dateiweg: ' + muster);
  }
});

test('[Studio·kein Depot·Rot-Beweis] eine neue Dateieingabe ohne Eintrag fällt auf', () => {
  const gepflanzt = STUDIO.replace('<input type="file" id="ts-datei"', '<input type="file" id="depot-oeffnen" accept=".vivodepot"></label><input type="file" id="ts-datei"');
  assert.notEqual(gepflanzt, STUDIO, 'Vorbedingung: die Stelle gibt es');
  assert.throws(() => assert.deepEqual([...dateiEingaben(gepflanzt)].sort(), Object.keys(EINGABEN).sort()));
});

test('[Studio·kein Depot] kein Studio-Code liest ein Modul-Fach eines Depots', () => {
  const code = ohneKommentare(STUDIO);
  const treffer = FAECHER.filter((f) => new RegExp('\\b' + f + '\\b').test(code));
  assert.deepEqual(treffer, []);
  // Positivkontrolle: die Fächer werden in Kommentaren erwähnt — das Muster findet sie dort, nur dort.
  assert.ok(FAECHER.some((f) => STUDIO.includes(f)), 'Positivkontrolle: im Quelltext samt Kommentaren steht mindestens ein Fach');
});

test('[Studio·kein Depot·Rot-Beweis] ein Lesezugriff auf ein Modul-Fach fällt auf', () => {
  const gepflanzt = STUDIO.replace('</script>', 'const _probe = (d) => d.brandingModule;\n</script>');
  const code = ohneKommentare(gepflanzt);
  assert.ok(FAECHER.some((f) => new RegExp('\\b' + f + '\\b').test(code)));
});
