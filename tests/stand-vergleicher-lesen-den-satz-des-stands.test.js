'use strict';
/* S8 (U2-ADR-428), Fehlerklasse „der Vergleicher liest den Arbeitsbaum statt des Stands".
   Der Fund: `tools/nativ-bestand-aenderungen-erheben.js` vergleicht zwei Stände der vivodepot.html, ihr Textsatz-Register kam aber aus `deTexte()` — der Moduldatei des
   Arbeitsbaums. Beide Stände wurden damit gegen dieselbe Datei gelesen; jede Textänderung zwischen ihnen blieb unsichtbar, der Vergleicher sagte immer „keine Änderung".
   Seit S8 steht der deutsche Satz nicht mehr im Kern, und ein Werkzeug, das einen fremden Stand lädt, sieht ihn nur über den geladenen Stand (`_sprachBasis()`).
   Regel: ein Werkzeug in tools/, das ZWEI Stände vergleicht (Argumente `--a` / `--a-commit`), liest den deutschen Satz nicht über den Leser `tools/lib/textsatz-de-quelle.js`.
   Nicht gemeint sind Werkzeuge, die EINEN Stand gegen die Moduldatei prüfen (tote-strings, w-aussagetext, …): dort IST die Moduldatei die Quelle, gegen die geprüft wird.
   Die Regel prüft die Bauform, nicht den Einzelfall: das nächste Vergleichswerkzeug wird beim ersten Lauf rot, nicht erst, wenn jemand einen stillen Vergleich bemerkt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const TOOLS = path.join(REPO, 'tools');
const VERGLEICHT_ZWEI_STAENDE = /(?:^|[^-\w])--a(?:-commit)?\b/m;
const LEST_LEISER = /textsatz-de-quelle/;

function verstoesst(text) { return VERGLEICHT_ZWEI_STAENDE.test(text) && LEST_LEISER.test(text); }
function werkzeuge() {
  return fs.readdirSync(TOOLS).filter((n) => /\.js$/.test(n) && !/\.test\.js$/.test(n)).map((n) => ['tools/' + n, fs.readFileSync(path.join(TOOLS, n), 'utf8')]);
}

test('[S8·Stand-Vergleicher] kein Werkzeug, das zwei Stände vergleicht, liest den deutschen Satz aus dem Arbeitsbaum', () => {
  const funde = werkzeuge().filter(([, text]) => verstoesst(text)).map(([rel]) => rel);
  assert.deepEqual(funde, [], 'den deutschen Satz eines geladenen Stands liest man über V._sprachBasis() des Stands, nicht über tools/lib/textsatz-de-quelle.js');
});

test('[S8·Stand-Vergleicher·Positivkontrolle] der Suchraum ist besetzt und die Bauform „zwei Stände vergleichen" kommt vor', () => {
  const liste = werkzeuge();
  assert.ok(liste.length > 100, 'Werkzeuge gelesen: ' + liste.length);
  const ladend = liste.filter(([, text]) => VERGLEICHT_ZWEI_STAENDE.test(text)).map(([rel]) => rel);
  assert.ok(ladend.includes('tools/nativ-bestand-aenderungen-erheben.js'), 'der Vergleicher, an dem die Klasse gefunden wurde, trägt die Bauform');
});

test('[S8·Stand-Vergleicher·Rot-Beweis] die alte Lesart des Vergleichers wird gefunden; die richtige und ein Werkzeug, das nur einen Stand prüft, nicht', () => {
  const alt = fs.readFileSync(path.join(TOOLS, 'nativ-bestand-aenderungen-erheben.js'), 'utf8')
    .replace("jsonSicher(typeof V._sprachBasis === 'function' ? Object.assign({}, V._sprachBasis()) : {});", "jsonSicher(require('./lib/textsatz-de-quelle.js').deTexte());");
  assert.ok(verstoesst(alt), 'die alte Lesart (Moduldatei des Arbeitsbaums) muss rot sein');
  assert.equal(verstoesst(fs.readFileSync(path.join(TOOLS, 'nativ-bestand-aenderungen-erheben.js'), 'utf8')), false, 'die Lesart über den Stand ist grün');
  assert.equal(verstoesst("const { deTexte } = require('./lib/textsatz-de-quelle.js'); deTexte();"), false, 'ein Werkzeug, das nur einen Stand prüft, darf den Leser benutzen');
});
