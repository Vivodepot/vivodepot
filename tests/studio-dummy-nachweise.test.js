'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio wie der freigegebene Dummy vom 14.11.2026: Nachweise und das Beispiel „Bibliotheksausweis“ (Zeile N37, Z. 158, 229–253)
   ─────────────────────────────────────────────────────────────────
   (1) Die Gruppe „Nachweise und Dokumente“ zeigt offen: Ausweis, Meldebescheinigung, Nachweis für eine Ermäßigung, Foto.
   (2) Der Nachweis für eine Ermäßigung ist freiwillig, wenn er aus den Bausteinen kommt.
   (3) Das Beispiel heißt „Bibliotheksausweis“, trägt den Zweck „Ausstellen eines Bibliotheksausweises“ und die Bausteine
       Vorname, Nachname, Geburtsdatum, Anschrift und den Nachweis; dazu bleibt die Liste der Vorführung. Der Feldname des
       Nachweises ist der des Kernfelds, damit das Depot ihn findet.
   (4) Die Kachel nennt die Felder wie der Dummy; beim Laden steht der Zweck im Feld, wenn dort noch keiner stand, und die
       Vorschau zeigt Name und Zweck gleich mit.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Wagen> node --test tests/studio-dummy-nachweise.test.js → rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
function konstante(name) { const i = HTML.indexOf('const ' + name + ' = '); return i < 0 ? '' : HTML.slice(i, HTML.indexOf(');\n', i) + 2); }

test('[Dummy · Nachweise 1] „Nachweise und Dokumente“: Ausweis, Meldebescheinigung, Ermäßigung, Foto offen', () => {
  const k = konstante('STUDIO_GRUPPEN');
  assert.match(k, /haeufig: \['identity\.idDocuments', 'housing\.registrationCertificate', 'socialInsurance\.reducedRateProofs', 'identity\.profilePhotoCoverPage'\]/,
    'die offenen Bausteine der Gruppe weichen vom Dummy ab');
});

test('[Dummy · Nachweise 2] der Nachweis für eine Ermäßigung ist als Baustein freiwillig', () => {
  const { V } = ladeGenerator();
  const idx = V.FELDKATALOG.findIndex((k) => k.kennung === 'socialInsurance.reducedRateProofs');
  assert.ok(idx >= 0, 'das Kernfeld fehlt im Katalog');
  assert.equal(V.feldAusKatalog(idx).pflicht, false);
  assert.equal(V.feldAusKatalog(idx).feldname, 'Nachweise für eine Ermäßigung', 'der Feldname ist nicht der des Kernfelds');
});

test('[Dummy · Nachweise 3] Beispiel „Bibliotheksausweis“ mit Zweck und den Bausteinen des Dummys', () => {
  const { V } = ladeGenerator();
  const b = V.BEISPIEL_TEMPLATES.bibliothek;
  assert.equal(b.titel, 'Bibliotheksausweis');
  assert.equal(b.zweck, 'Ausstellen eines Bibliotheksausweises');
  assert.deepEqual(Array.from(b.felder, (f) => f.feldname), ['Vorname', 'Nachname', 'Geburtsdatum', 'Straße', 'Hausnummer', 'Postleitzahl', 'Ort',
    'Nachweise für eine Ermäßigung', 'Weitere Personen im Familienausweis']);
  assert.equal(b.felder.find((f) => f.bereich === 'socialInsurance').pflicht, false);
});

test('[Dummy · Nachweise 4] Kachel wie der Dummy; beim Laden steht der Zweck im Feld', () => {
  const g = ladeGenerator();
  assert.equal(g.sandbox.beispielKachelText('bibliothek'), 'Name, Geburtsdatum, Anschrift, Nachweis für die Ermäßigung');
  assert.match(HTML, /<span class="kachel-titel" data-en="Library card">Bibliotheksausweis<\/span>/);
  g.sandbox.zeigeSchritt = () => {}; g.sandbox.rendereFelder = () => {}; g.sandbox.zeigeAngleichung = () => {};
  g.sandbox.ladeBeispiel('bibliothek');
  const zweck = g.V.STATE.vorlageZweck;
  assert.equal(zweck, 'Ausstellen eines Bibliotheksausweises', 'der Zweck des Beispiels fehlt');
  assert.equal(g.sandbox.document.getElementById('av-titel').textContent, 'Bibliotheksausweis', 'die Vorschau zeigt den Namen des Beispiels nicht');
});
