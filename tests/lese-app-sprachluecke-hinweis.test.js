'use strict';
/* Lese-App: eine Datei mit unvollständigem Sprach-Eintrag sagt es (Befund vom 21.09.2026, S1 der Lese-App)
   ───────────────────────────────────────────────────────────────────────────────────────────
   Eine Datei trägt den Sprachstand ihres Produkts (`abWerkMitschrift.sprache`). Trägt dieser Eintrag einen Text nicht — weil er erst nach dem
   Anlegen der Datei in den Kern kam —, zeigt die Lese-App den deutschen Namen der Struktur. Das ist ein Ausfall, den es geben darf; dass er
   STUMM bleibt, ist der Fund: der Hinweis „Diese Sprachfassung ist unvollständig" (`sprachfassungHinweisHTML`) erscheint dann nicht.
   Zwei Gründe, gemessen im Quelltext (`sprachfassungLueckenAnzahl`):
     1. für `sprache === 'en'` gibt die Zählung immer 0 zurück — die Begründung stand in der eingebackenen englischen Basis, die seit S1
        (21.09.2026) leer ist;
     2. gezählt werden nur die Oberflächen-Schlüssel aus `_STRINGS_EINGEBAUT`, nie Bereichs-, Sektions- oder Feldnamen — für keine Sprache.
   Behoben am 23.09.2026 (Englisch nicht mehr ausgenommen, Bereichsnamen zählen); die frühere `todo`-Probe ist ein gewöhnlicher Test mit
   Rot-Beweis (interner Befund vom 21.09.2026). Eine Reparatur ohne diese Probe wäre eine ohne Rot-Beweis.

   NICHT GEMESSEN: wie viele echte Dateien es trifft (das Produkt ist unveröffentlicht) und ob der Hinweis für Bereichsnamen der Kern-Ansicht
   gleich aussehen müsste (dort bleibt eine ungedeckte Kennung leer, U2-ADR-426). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const modul = (sprache, texte) => ({ modulTyp: 'textsatz', sprache, moduleVersion: 1, anbieterId: 'vivodepot', texte });
const dateiMit = (sprachModul) => ({ sektoren: {}, textsatzModule: [],
  abWerkMitschrift: { bereich: [], sprache: JSON.parse(JSON.stringify(sprachModul)), logikModul: [] } });
function oeffnen(sprachModul) {
  const L = ladeLesen().V;
  L.setData(L._foldVollmachtenLesen(dateiMit(sprachModul)));
  return L;
}

test('[Sprachlücke·Positivkontrolle] eine Sprache ausser Englisch, deren Sprach-Eintrag Oberflächentexte nicht trägt, löst den Hinweis aus', () => {
  const L = oeffnen(modul('hu', { 'identity#person.label': 'Személy' }));
  assert.equal(L.textsatzSpracheAktiv(), 'hu');
  assert.ok(L.sprachfassungLueckenAnzahl() > 50, 'die Lücke wird gezählt: ' + L.sprachfassungLueckenAnzahl());
  assert.match(L.sprachfassungHinweisHTML(), /sprach-luecke/);
});

test('[Sprachlücke·Charakterisierung] eine englische Datei, deren Sprach-Eintrag einen Bereichsnamen nicht trägt, zeigt ihn deutsch', () => {
  const L = oeffnen(modul('en', { 'identity#person.label': 'Person' }));
  assert.equal(L.textsatzSpracheAktiv(), 'en');
  assert.equal(L.textLesen('identity#person.label'), 'Person', 'Vorbedingung: der Eintrag trägt diesen Text');
  assert.equal(L.textLesen('identity.label'), null, 'der Bereichsname steht nicht im Eintrag');
  const name = L.SEKTOR_BY_ID.identity.label;
  assert.match(name, /[äöüß]/, 'Vorbedingung: der Name der Struktur ist deutsch: ' + name);
  assert.ok(L.sektorHTML('identity').includes(name.replace(/&/g, '&amp;')), 'der deutsche Name der Struktur erscheint: ' + name);
});

/* SL1, behoben am 23.09.2026: Englisch ist nicht mehr ausgenommen, und Bereichsnamen zählen. Ein Oberflächentext zählt für Englisch nur,
   wenn auch die App-eigenen englischen Quellen (LESE_TEXTE_EN u. a.) ihn nicht tragen — dort liest STRINGS ihn auch. */
test('[Sprachlücke] eine englische Datei, deren Sprach-Eintrag Bereichsnamen nicht trägt, zeigt den Hinweis „Sprachfassung unvollständig"', () => {
  const L = oeffnen(modul('en', { 'identity#person.label': 'Person' }));
  assert.ok(L.sprachfassungLueckenAnzahl() > 0, 'die fehlenden Bereichsnamen werden gezählt');
  assert.match(L.sprachfassungHinweisHTML(), /sprach-luecke/, 'der Hinweis erscheint, wenn Bereichsnamen des Eintrags fehlen');
});

test('[Sprachlücke·Rot-Beweis] ohne die Zählung der Bereichsnamen bleibt dieselbe englische Datei stumm', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');
  const quelle = fs.readFileSync(LESEN, 'utf8');
  const ZEILE = "    if (b && b.id && typeof fach[b.id + '.label'] !== 'string') fehlend++;\n";
  assert.equal(quelle.split(ZEILE).length, 2, 'die Zählzeile steht genau einmal — sonst trifft die Mutation nichts');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl1-'));
  const mutant = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(mutant, quelle.replace(ZEILE, '    /* MUTATION */\n'));
  const vorher = process.env.LESEN_HTML_PATH;
  try {
    process.env.LESEN_HTML_PATH = mutant;
    delete require.cache[require.resolve('./load-lesen.js')];
    const L = require('./load-lesen.js').ladeLesen().V;
    L.setData(L._foldVollmachtenLesen(dateiMit(modul('en', { 'identity#person.label': 'Person' }))));
    assert.equal(L.sprachfassungHinweisHTML(), '', 'ohne die Zählung bleibt die Lücke still — die Probe misst den Fix');
  } finally {
    if (vorher === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-lesen.js')];
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* Positivkontrolle an ECHTEN Dateien: ein Hinweis, der an jeder vollständigen Datei stünde, wäre Rauschen. */
const { depotImProduktAnlegen } = require('./produkt-html-erzeugen.js');
const PW = 'Sprachluecke-Positivkontrolle-2026';
async function produktdatei(slug) {
  const { umschlag } = await depotImProduktAnlegen(slug, PW);
  const L = ladeLesen().V;
  const obj = await L.leseDepotUmschlag(JSON.parse(JSON.stringify(umschlag)), PW);
  L.setData(L._foldVollmachtenLesen(obj));
  return L;
}
for (const slug of ['privat-en', 'pro-en']) {
  test('[Sprachlücke·Positivkontrolle] eine echte ' + slug + '-Datei ist vollständig englisch und zeigt keinen Hinweis', async () => {
    const L = await produktdatei(slug);
    assert.equal(L.textsatzSpracheAktiv(), 'en');
    assert.equal(L.sprachfassungLueckenAnzahl(), 0);
    assert.equal(L.sprachfassungHinweisHTML(), '');
  });
}
