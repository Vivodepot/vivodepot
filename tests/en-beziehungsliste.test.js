'use strict';
/* EN-BEZIEHUNGSLISTE-DEUTSCH (18.11.2026, Befund an der ausgelieferten englischen Fassung): im Dialog „Create new depot“ stand die
   Auswahl „Your relationship to this person“ ganz deutsch („Ich bin Ehepartner oder Lebensgefährte dieser Person“ …), nur
   „— please choose —“ war englisch. Die Einträge kamen aus BEZIEHUNGS_CODES.displayDe statt aus dem Textsatz.
   Gemessen an beiden Stellen, die die Beziehung zur Wahl stellen: beim Anlegen (_beziehungsAuswahlFuellen) und beim Weitergeben
   des Depots (flowDelegationsExportEntscheid nutzt dieselbe Beschriftung _beziehungsText).
   Rot-Beweis: mit der deutschen Beschriftung (dem Stand vor dem Fix) fällt die Probe.
   Wächter gegen die Klasse: kein Zugriff `.<name>De` (feste deutsche Anzeige) geht im Kern oder in der Lese-App in die Oberfläche
   (tools/sprachluecken-messen.js, Teil B, am echten Stand gemessen). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { messen } = require('../tools/sprachluecken-messen.js');

async function mitSprache(sprache) {
  const k = ladeKern({ backen: true });
  const V = k.V;
  await V.depotAnlegen('en-beziehungsliste-pw-2026!');
  V.betreteApp();
  if (sprache === 'en') {
    const r = V.modulEinlassen(JSON.stringify(V.TEXTSATZ_EN_QUELLE));
    assert.equal(r.angenommen, true, r.grund || '');
    V._textsatzModuleAusDepotAnmelden(V.getData());
    V.getData().textsprache = 'en';
    V.textsatzNeuAnwenden();
  }
  return { V, document: k.document };
}

function auswahlTexte(V) {
  const optionen = [];
  V._beziehungsAuswahlFuellen({ appendChild: (o) => optionen.push(o) }, '');
  return optionen.map((o) => String(o.textContent || '')).filter(Boolean).slice(1);   // ohne „bitte wählen“
}

const DEUTSCH = /\b(Ich|bin|dieser|Person|Kind|Andere|Beziehung|Schwester|Bruder|Großeltern|Enkel|Nichte|Neffe|Tante|Onkel|Freund|Ehepartner|Lebens)/;

test('[EN-Beziehung·Anlegen] in Englisch ist kein Eintrag der Beziehungs-Auswahl deutsch', async () => {
  const { V } = await mitSprache('en');
  const texte = auswahlTexte(V);
  assert.ok(texte.length >= 15, 'die Auswahl hat ihre Einträge: ' + texte.length);
  const deutsch = texte.filter((t) => DEUTSCH.test(t));
  assert.deepEqual(deutsch, [], 'deutsche Einträge in der englischen Auswahl');
});

test('[EN-Beziehung·Deutsch] in Deutsch bleibt die Auswahl deutsch, mit demselben Satz je Code', async () => {
  const { V } = await mitSprache('de');
  const texte = auswahlTexte(V);
  assert.ok(texte.includes('Ich bin Ehepartner oder Lebensgefährte dieser Person'), texte.join(' | '));
});

test('[EN-Beziehung·Eine Stelle] jede Beziehung hat ihren Text im deutschen und im englischen Satz; beide Auswahlstellen lesen ihn', async () => {
  const { V } = await mitSprache('de');
  for (const code of Object.keys(V.BEZIEHUNGS_CODES)) {
    const kennung = 'strings:beziehung' + code + '.text';
    assert.ok(V.TEXTSATZ_DE_QUELLE.texte[kennung], 'deutscher Text fehlt: ' + kennung);
    assert.ok(V.TEXTSATZ_EN_QUELLE.texte[kennung], 'englischer Text fehlt: ' + kennung);
    assert.notEqual(V.TEXTSATZ_EN_QUELLE.texte[kennung], V.TEXTSATZ_DE_QUELLE.texte[kennung], 'en gleich de: ' + kennung);
  }
  const quelle = String(V._beziehungsAuswahlFuellen) + String(V.flowDelegationsExportEntscheid);
  assert.ok(!/displayDe/.test(quelle), 'keine Auswahlstelle liest displayDe');
  assert.equal((quelle.match(/_beziehungsText\(/g) || []).length, 2, 'beide Stellen lesen _beziehungsText');
});

test('[EN-Beziehung·Rot-Beweis] mit der deutschen Beschriftung (Stand vor dem Fix) fällt die Probe', async () => {
  const { V } = await mitSprache('en');
  const vorher = Object.keys(V.BEZIEHUNGS_CODES).map((c) => V.TEXTSATZ_DE_QUELLE.texte['strings:beziehung' + c + '.text']);
  assert.ok(vorher.filter((t) => DEUTSCH.test(t)).length >= 15, 'der Rot-Beweis findet deutsche Einträge');
  assert.equal(auswahlTexte(V).filter((t) => DEUTSCH.test(t)).length, 0, 'nach dem Fix keiner');
});

test('[EN-Beziehung·Klasse] keine feste deutsche Anzeige (.<name>De) geht im Kern oder in der Lese-App in die Oberfläche', () => {
  const e = messen(path.join(__dirname, '..'));
  const oberflaeche = e.teilB.filter((s) => s.art === 'oberflaeche');
  assert.deepEqual(oberflaeche, [], 'feste deutsche Anzeige in der Oberfläche');
});
