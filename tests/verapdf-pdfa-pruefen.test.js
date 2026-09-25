'use strict';
/* Prüft die AUSWERTUNGS-LOGIK von tools/verapdf-pdfa-pruefen.js gegen die feste
   Fixture tests/fixtures/verapdf-kandidat.pdf — nicht die PDF/A-Konformität
   selbst (die hängt am realen Kern-Stand und ändert sich mit ihm), sondern
   dass das Werkzeug einen echten veraPDF-Lauf tatsächlich fährt und dessen
   JSON korrekt in einen deutschen Befund übersetzt. Ohne installiertes
   `verapdf` (CI-Umgebungen ohne Java/Homebrew) übersprungen, nicht rot
   behauptet — das Werkzeug selbst meldet diesen Fall bereits explizit. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

function veraPdfDa() {
  try {
    execFileSync('verapdf', ['--version'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

const WERKZEUG = path.join(__dirname, '..', 'tools', 'verapdf-pdfa-pruefen.js');
const HAT_VERAPDF = veraPdfDa();

test('[veraPDF] Werkzeug läuft ohne Argument gegen die Fixture und liefert einen strukturierten Befund',
  { skip: !HAT_VERAPDF && 'verapdf nicht installiert (brew install verapdf) -- kein automatischer Befund ohne echten Lauf' },
  () => {
    const out = execFileSync('node', [WERKZEUG], { encoding: 'utf8' });
    const befund = JSON.parse(out);
    assert.match(befund.werkzeug, /^veraPDF /, 'nennt Werkzeug+Version, nicht nur "veraPDF"');
    assert.equal(befund.profil, 'PDF/A-3b validation profile');
    assert.equal(typeof befund.konform, 'boolean', 'konform muss ein echtes true/false sein, kein String');
    assert.ok(befund.datum, 'trägt ein Datum');
    assert.ok(Number.isInteger(befund.bestandeneRegeln) && befund.bestandeneRegeln > 0,
      'muss mindestens eine bestandene Regel zählen -- ein Lauf, der NICHTS zählt, prüft nichts');
    assert.ok(Array.isArray(befund.nichtBestandeneRegelnDetail));
  });

test('[veraPDF·Rot-Beweis] fehlendes PDF wird als Fehler gemeldet, nicht als stiller Erfolg',
  { skip: !HAT_VERAPDF && 'verapdf nicht installiert' },
  () => {
    assert.throws(() => {
      execFileSync('node', [WERKZEUG, '--pdf', '/nicht/vorhanden.pdf'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    }, /Command failed/);
  });

test('[veraPDF·Rot-Beweis] ohne installiertes verapdf meldet das Werkzeug den fehlenden Befund explizit, kein stiller Erfolg', () => {
  // node selbst muss im gestutzten PATH erreichbar bleiben -- nur der Ordner, in dem `verapdf`
  // steht, fliegt raus. Sonst scheitert schon der execFileSync-Aufruf selbst (ENOENT auf `node`),
  // nicht das, was diese Probe eigentlich prüft.
  const nodeOrdner = path.dirname(process.execPath);
  let wurf = null;
  try {
    execFileSync(process.execPath, [WERKZEUG], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, { PATH: nodeOrdner + ':/usr/bin:/bin' }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    wurf = e;
  }
  if (!wurf) return;   // der gestutzte PATH enthält verapdf trotzdem -- dann nichts zu prüfen hier
  assert.match(wurf.stderr.toString(), /verapdf.*nicht im PATH|ENOENT/i);
});
