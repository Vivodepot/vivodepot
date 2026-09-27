'use strict';
/* Zitierte Beschriftung — Proben (19.09.2026). Erklärung, Klasse und Grenzen: tools/zitierte-beschriftung-pruefen.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tools/zitierte-beschriftung-pruefen.js');

test('[Zitat·Rot-Beweis] der Fund selbst: ein Satz, der „Schon ein Vivodepot? Datei öffnen“ zitiert, während der Knopf „Schon ein Depot? Datei öffnen“ heißt, wird gefunden', () => {
  const t = {
    welcomeDateiOeffnen: 'Schon ein Depot? Datei öffnen',
    wiedereinstiegHinweisText: 'Öffnen Sie zuerst {marke}, dann tippen Sie auf ‚Schon ein {marke}? Datei öffnen’ und wählen Ihre Sicherungsdatei.',
  };
  const funde = P.zitate(t);
  assert.deepEqual(funde.map((f) => f.zitierender + ' → ' + f.zitierter), ['wiedereinstiegHinweisText → welcomeDateiOeffnen'],
    'die Kopie mit der alten Marke ist dieselbe Beschriftung bis auf die Umbenennung — genau das war der Fund');
});

test('[Zitat·Rot-Beweis] auch die englische Form (“…”) und eine Kopie, die noch wörtlich stimmt, werden gefunden', () => {
  const t = { knopf: 'Import data', satz: 'Then tap “Import data” to continue.' };
  assert.equal(P.zitate(t).length, 1);
  const de = { knopf: 'Daten einlesen', satz: 'Tippen Sie auf „Daten einlesen“ und wählen Sie die Datei.' };
  assert.equal(P.zitate(de).length, 1);
});

test('[Zitat·Gegenprobe] der Platzhalter, ein Einzelwort, ein Zitat ohne passende Beschriftung und ein langer Text lösen NICHT aus', () => {
  const knopf = 'Schon ein Depot? Datei öffnen';
  assert.deepEqual(P.zitate({ knopf, satz: 'Tippen Sie auf ‚{knopf}’ und wählen Ihre Sicherungsdatei.' }), [], 'Platzhalter statt Kopie');
  assert.deepEqual(P.zitate({ Datei: 'Datei', satz: 'Das Feld „Datei“ bleibt leer.' }), [], 'ein einzelnes Wort ist kein Zitat einer Beschriftung');
  assert.deepEqual(P.zitate({ knopf, satz: 'Das steht so im Gesetz: „Wer will, der darf“, sagte sie.' }), [], 'kein Text trägt diese Beschriftung');
  const lang = 'Dies ist ein langer Erklärtext, der nur zufällig in Anführungszeichen wiederholt wird und deshalb keine Beschriftung ist.';
  assert.deepEqual(P.zitate({ lang, satz: 'Hier: „' + lang + '“' }), [], 'ein langer Text gilt nicht als Beschriftung');
  assert.deepEqual(P.zitate({ a: 'Ohne Zitat und ohne Verweis' }), [], 'ein Text zitiert sich nicht selbst');
});

test('[Zitat·Mechanik] ein neues Paar oder eine steigende Zahl ist rot, ein Rückgang grün', () => {
  const g = { summe: { de: 1, en: 1 }, paare: { de: ['a → b'], en: ['a → b'] } };
  const neu = P.urteil({ summe: { de: 2, en: 1 }, paare: { de: ['a → b', 'c → d'], en: ['a → b'] } }, g);
  assert.equal(neu.gruen, false);
  assert.ok(neu.befunde.some((b) => b.includes('DE NEU') && b.includes('c → d')));
  assert.equal(P.urteil({ summe: { de: 0, en: 0 }, paare: { de: [], en: [] } }, g).gruen, true);
});

test('[Zitat·Positivkontrolle] der Suchraum ist besetzt, und der echte Bestand zitiert keine Beschriftung mehr wörtlich', () => {
  for (const [sprache, pfad] of Object.entries(P.QUELLEN)) {
    const n = Object.keys(P.texte(pfad)).length;
    assert.ok(n > 1000, sprache + ': Suchraum besetzt (' + n + ' Texte)');
  }
  const g = P.grundlinieLesen();
  assert.deepEqual(g.summe, { de: 0, en: 0 }, 'die Grundlinie steht auf 0: alle abgeschriebenen Beschriftungen sind auf {beschriftung:…} umgestellt');
  const u = P.urteil(P.messen(), g);
  assert.ok(u.gruen, 'Zitierte-Beschriftung-Wächter rot:\n' + u.befunde.join('\n'));
  assert.ok(!P.messen().paare.de.some((p) => p.startsWith('wiedereinstiegHinweisText')), 'der behobene Fund taucht nicht mehr auf');
});
