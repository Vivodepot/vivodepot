'use strict';
/* Klassenwächter: ein Werkzeug, das ✗ oder ROT druckt und nirgends mit einem Nicht-0-Code endet (21.09.2026).
   Ein Wächter, der ✗ ausgibt und mit 0 endet, ist kein Wächter: er sieht aus wie eine Prüfung, nennt sogar den Fehler — und niemand erfährt es, weil nichts danach fragt.
   Gemessen am Stand ea900b97 über tools/ und scripts/ (ohne Tests): 103 Dateien drucken ✗/ROT, fünf davon haben keinen Nicht-0-Ausgang: vier-produkte-erzeugen.js,
   zwei-achsen-erzeugen.js, anzeigetexte-orten.js (Wächter, in diesem Zug behoben) und zwei Messberichte (unten, Positivliste).
   GRENZE DER MESSUNG: gefunden wird nur ein Werkzeug OHNE JEDEN Nicht-0-Ausgang. Eines, das aus anderem Grund mit 1 endet, bei seinem ✗ aber nicht, ist nicht erfaßt —
   dafür müßte der Pfad je Datei gelesen werden. „Keine Treffer" heißt hier nicht „alle binden", sondern „keines ist von dieser Bauform". */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DRUCKT = /['"`][^'"`\n]*(?:✗|ROT\b|ROT —)[^'"`\n]*['"`]/;
const NICHT_NULL = /process\.exit\((?!0\))|process\.exitCode\s*=\s*(?!0)|throw\s|\.exit\(1\)|exit\(\s*[a-zA-Z_]/;

/* BERICHTE, keine Wächter: sie melden JA/NEIN als ihre Antwort, sie sperren nichts. Ein NEIN bleibt folgenlos, weil es ein Bericht ist. Nur auf diese Liste kommt, wer das ausdrücklich ist. */
const BERICHTE = Object.freeze({
  'tools/mitschalt-beleg-messen.js': 'Messbericht „schaltet ein angedocktes Modulfeld mit?" — POSITIVKONTROLLE/ROT-BELEG/ANTWORT als JA/NEIN im Bericht; die Probe dazu: tests/mitschalt-beleg-textsatz.test.js',
  'tools/textsatz-en-beleg-messen.js': 'Messbericht wie mitschalt-beleg-messen.js mit dem echten englischen Satz — HAT KEINEN TEST (Befund, im Bericht s8-fahrer1-… vermerkt)',
});

function ohneKommentarzeilen(text) {
  return text.split('\n').filter((z) => { const t = z.trim(); return !t.startsWith('//') && !t.startsWith('*'); }).join('\n');
}
/** rein: nimmt den Quelltext, sagt, ob die Bauform „druckt ✗/ROT, kein Nicht-0-Ausgang" vorliegt. */
function bauform(text) {
  const code = ohneKommentarzeilen(text);
  return DRUCKT.test(code) && !NICHT_NULL.test(code);
}
function werkzeuge() {
  const liste = [];
  for (const dir of ['tools', 'scripts']) {
    const abs = path.join(REPO, dir);
    if (!fs.existsSync(abs)) continue;
    for (const n of fs.readdirSync(abs).sort()) {
      if (!/\.(js|mjs)$/.test(n) || /\.test\.(js|mjs)$/.test(n)) continue;
      const p = path.join(abs, n);
      if (!fs.statSync(p).isFile()) continue;
      liste.push([dir + '/' + n, fs.readFileSync(p, 'utf8')]);
    }
  }
  return liste;
}

test('[Klasse·druckt ✗/ROT] kein Werkzeug in tools/ und scripts/ druckt ✗/ROT, ohne irgendwo mit einem Nicht-0-Code zu enden (außer benannten Berichten)', () => {
  const funde = werkzeuge().filter(([rel, text]) => bauform(text) && !(rel in BERICHTE)).map(([rel]) => rel);
  assert.deepEqual(funde, [], 'ein Wächter, der ✗ druckt und mit 0 endet, bindet niemanden — process.exitCode = 1 setzen und per Test als Prozess fahren (Beispiel: tests/erzeuger-exit-bindung.test.js)');
});

test('[Klasse·druckt ✗/ROT·Positivkontrolle] der Suchraum ist besetzt, und die Positivliste führt nur noch Werkzeuge, die es gibt und die diese Bauform wirklich tragen', () => {
  const liste = werkzeuge();
  assert.ok(liste.length > 300, 'Werkzeuge gelesen: ' + liste.length);
  assert.ok(liste.filter(([, t]) => DRUCKT.test(ohneKommentarzeilen(t))).length > 60, 'viele Werkzeuge drucken ✗/ROT — der Scan sieht sie');
  for (const rel of Object.keys(BERICHTE)) {
    const eintrag = liste.find(([r]) => r === rel);
    assert.ok(eintrag, rel + ' steht auf der Positivliste, existiert aber nicht mehr — streichen');
    assert.equal(bauform(eintrag[1]), true, rel + ' trägt die Bauform nicht mehr — von der Positivliste streichen (sie darf nur sinken)');
  }
});

test('[Klasse·druckt ✗/ROT·Rot-Beweis] die Bauform wird in synthetischem Code gefunden; mit Exit-Code, ohne Ausgabe und in Kommentaren nicht', () => {
  assert.equal(bauform("console.log('  ✗ abweichung');\n"), true);
  assert.equal(bauform("process.stdout.write('ROT — s. o.\\n');\n"), true);
  assert.equal(bauform("console.log('  ✗ abweichung');\nprocess.exitCode = 1;\n"), false, 'mit Exit-Code gebunden');
  assert.equal(bauform("console.log('✗ x');\nprocess.exit(2);\n"), false);
  assert.equal(bauform("console.log('ok');\n"), false, 'druckt nichts Rotes');
  assert.equal(bauform("// console.log('✗ nur ein Kommentar');\n"), false, 'ein Kommentar druckt nicht');
});
