'use strict';
/* Das Test-Artefakt ist der Auslieferungs-Bau: derselbe Backschritt (produktTextErzeugen), dieselben
   Argumente wie tools/produkt-konfektionieren.js#konfektionieren für die vier Produkte — bis auf GENAU
   eine benannte Test-Option, mitEntwicklerleiste:true. Geteilt von tests/e2e/global-setup.js und
   tests/load-kern.js; die Gleichheit hält tests/e2e-artefakt-gleich-auslieferung.test.js. */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
let _vorDepotFn = null;

function testProduktText(html, { slug = 'privat-de', ohneBereiche = false, ...modulOptionen } = {}) {
  const { PRODUKTE, modulDateienFuer } = require(path.join(REPO, 'tools', 'lib', 'vier-produkte.js'));
  const { _unsigniertesModulKlassifizieren, produktTextErzeugen } = require(path.join(REPO, 'tools', 'lib', 'produkt-text-erzeugen.js'));
  const { PRODUKT_DATEISATZ } = require(path.join(REPO, 'tools', 'produkt-konfektionieren.js'));
  const produkt = PRODUKTE.find((p) => p.slug === slug);
  if (!produkt) throw new Error('Test-Backen: unbekanntes Produkt „' + slug + '"');
  const dateien = modulDateienFuer(produkt, modulOptionen);
  let module = dateien.map((pfad) => _unsigniertesModulKlassifizieren(JSON.parse(fs.readFileSync(pfad, 'utf8')), path.basename(pfad)));
  if (ohneBereiche) module = module.filter((k) => !(k.region && (k.region.modulTyp === 'bereich' || k.region.modulTyp === 'bereicheBekannt')));
  // Ein Kern VOR v894 trägt seine Erscheinungswerte selbst und keine Region dafür — produktTextErzeugen würde das Modul
  // dann zu Recht abweisen. Für Vergleichsläufe gegen die Geschichte (tools/design-bildvergleich.js --basis <ref>) bleibt
  // es hier darum weg. Der Auslieferungsweg kennt diese Nachsicht nicht.
  if (!html.includes('/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:BEGIN */')) module = module.filter((k) => k.region.modulTyp !== 'erscheinungsbild');
  if (!_vorDepotFn) _vorDepotFn = require(path.join(REPO, 'tests', 'load-issuer.js')).ladeIssuer().V.vorDepotKonfigurationDateiInhalt;
  return produktTextErzeugen(html, {
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: _vorDepotFn,
    unsignierteModule: module,
    serviceWorkerVorhanden: PRODUKT_DATEISATZ.includes('sw.js'),
    mitEntwicklerleiste: true,
  }).text;
}

module.exports = { testProduktText };
