'use strict';
/* SIT2b — eine Situation erklärt ihre Anlass-Kachel und ihre Suchbegriffe selbst, im Template. Der Kern hält nur den
   Mechanismus (`anlaesseAlle`, `_anlassAusSituation`) und die Kacheln, die zu keiner Situation gehören.
   (1) Feldverlust-Beweis: die Kachel-Liste des Standard-Produkts ist nach dem Umzug dieselbe wie vorher
       (tests/fixtures/anlaesse-vor-umzug-2026-09-19.json): Reihenfolge, Klasse, Symbol, Ziel, versteckt, Wortlaut.
   (2) Das nackte Gerüst führt keine Kachel und keinen Suchbegriff einer Situation.
   (3) Was im Template steht, wirkt: eine andere Position, ein anderer Suchbegriff, eine neue Kachel.
   (4) Ein ungültiger `anlass`-Eintrag ergibt keine Kachel; ein Modul der Datei kann keine Kachel mitbringen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const GRUND = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'anlaesse-vor-umzug-2026-09-19.json'), 'utf8')).kacheln;
const ZEHN = ['geburt', 'volljaehrig', 'hauskauf', 'notar', 'arzt', 'einfach-so', 'krankenhaus', 'pflegeheim', 'erbfall', 'todesfall-uebernahme'];
const flach = (a) => ({ id: a.id, klasse: a.klasse, icon: a.icon, ziel: JSON.parse(JSON.stringify(a.ziel)), versteckt: a.versteckt === true, label: a.label });
const bloecke = () => [{ id: 'b', titel: 'B', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }];
const modul = (situationen) => [{ modulTyp: 'situation', herkunft: 'vivodepot', moduleVersion: 1, situationen }];
function blank(situationen) {
  const { V } = ladeKern({ blank: true });
  V._situationModulAbWerkSeed({ abWerkMitschrift: { situationen: modul(situationen) } });
  return V;
}

test('[Feldverlust] die Kachel-Liste des Standard-Produkts ist nach dem Umzug ins Template unverändert', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.anlaesseAlle().map(flach), GRUND);
});

test('[Feldverlust · Rot-Beweis] der Vergleich sieht eine vertauschte Reihenfolge und eine fehlende Kachel', () => {
  const { V } = ladeKern();
  const ist = V.anlaesseAlle().map(flach);
  const vertauscht = ist.slice(); vertauscht.splice(0, 2, ist[1], ist[0]);
  assert.notDeepEqual(vertauscht, GRUND);
  assert.notDeepEqual(ist.slice(1), GRUND);
});

test('[Gerüst] das nackte Gerüst führt keine Kachel und keinen Suchbegriff einer Situation', () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual(V.anlaesseAlle().map((a) => a.id).filter((id) => ZEHN.includes(id)), []);
  assert.equal(V.situationenAlle().length, 0);
  assert.deepEqual(V._sucheKatalogAufbauen().filter((e) => e.quelle === 'situation'), []);
});

test('[Template → Kern] Position, Klasse und Suchbegriffe der Situation wirken; eine neue Situation bringt ihre Kachel mit', () => {
  const V = blank({
    'test-eins': { icon: 'star', modus: 'eigen', titel: 'Eins', bloecke: bloecke(), suchbegriffe: ['Zauberwort'], anlass: { klasse: 2, icon: 'star', ziel: { sbl: 'test-eins' }, position: 0 } },
    'test-zwei': { icon: 'star', modus: 'eigen', titel: 'Zwei', bloecke: bloecke(), anlass: { klasse: 1, icon: 'star', ziel: { sbl: 'test-zwei' }, position: 1, versteckt: true } },
  });
  const kacheln = V.anlaesseAlle();
  assert.deepEqual(kacheln.slice(0, 2).map((a) => a.id), ['test-eins', 'test-zwei']);
  assert.equal(kacheln[0].klasse, 2);
  assert.equal(kacheln[1].versteckt, true);
  const suche = V._sucheKatalogAufbauen();
  assert.ok(suche.some((e) => e.quelle === 'situation' && e.label === 'Eins' && e.alltag.includes('Zauberwort')));
  assert.ok(suche.some((e) => e.quelle === 'anlass' && e.alltag.includes('Zauberwort')), 'auch die Kachel derselben ID findet über das Wort');
});

test('[Template → Kern] die Suchbegriffe einer Situation stehen im Template, nicht mehr im Kern-Wörterbuch', () => {
  const V = blank({ 'test-notar': { icon: 'scale', modus: 'eigen', titel: 'Notar neu', bloecke: bloecke(), suchbegriffe: ['Urkunde'] } });
  const e = V._sucheKatalogAufbauen().find((x) => x.quelle === 'situation' && x.label === 'Notar neu');
  assert.deepEqual(Array.from(e.alltag), ['Urkunde']);
  // Das Standard-Produkt trägt „Testament" für den Notar aus seinem Template …
  const P = ladeKern().V;
  const notar = P._sucheKatalogAufbauen().find((x) => x.quelle === 'situation' && /Notar/.test(x.label));
  assert.deepEqual(Array.from(notar.alltag), ['Testament']);
  // … und der Kern führt keinen Eintrag für eine Situations-ID mehr.
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const woerterbuch = quelle.slice(quelle.indexOf('const SUCHE_ALLTAGSBEGRIFFE = Object.freeze({'), quelle.indexOf('});', quelle.indexOf('const SUCHE_ALLTAGSBEGRIFFE = Object.freeze({')));
  for (const id of ZEHN) assert.ok(!new RegExp("'" + id + "'\\s*:").test(woerterbuch), id + ' steht nicht im Kern-Wörterbuch');
});

test('[Gegenprobe] ungültiger anlass-Eintrag: keine Kachel — und die Situation selbst bleibt', () => {
  const schlecht = [
    { klasse: 9, icon: 'star', ziel: { sbl: 'x' } }, { klasse: 1, icon: 'star' }, { klasse: 1, ziel: { sbl: 'x' } },
    { klasse: 1, icon: 'star', ziel: {} }, { klasse: 1, icon: '<b>', ziel: { sbl: '<img src=x>' } }, 'kachel',
  ];
  schlecht.forEach((a, i) => {
    const V = blank({ ['test-x' + i]: { icon: 'star', modus: 'eigen', titel: 'X', bloecke: bloecke(), anlass: a } });
    assert.ok(V._sucheKatalogAufbauen().some((e) => e.quelle === 'situation' && e.label === 'X'), 'Situation ' + i + ' bleibt');
    assert.ok(!V.anlaesseAlle().some((k) => k.id === 'test-x' + i), 'keine Kachel für ' + JSON.stringify(a));
  });
});

test('[Vertrauen] ein Situations-Modul der Datei bringt keine Kachel mit — der Prüfer lässt anlass und suchbegriffe weg', () => {
  const { V } = ladeKern({ blank: true });
  const r = V.situationsModulPruefen({ modulTyp: 'situation', moduleVersion: 1, herkunft: 'fremd', sprache: 'de', situationen: {
    'fremd-blatt': { titel: 'Fremd', bloecke: bloecke(), anlass: { klasse: 1, icon: 'star', ziel: { sbl: 'x' }, position: 0 }, suchbegriffe: ['Wort'] } } });
  assert.equal(r.gueltig, true);
  assert.equal(r.situationen[0].anlass, undefined);
  assert.equal(r.situationen[0].suchbegriffe, undefined);
});
