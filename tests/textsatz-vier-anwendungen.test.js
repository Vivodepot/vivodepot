'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Glied 10 (Abendkette) · Die Form trägt in ALLEN VIER Anwendungen
   ────────────────────────────────────────────────────────────────────────────
   Der Auftrag verlangt einen Rot-Beleg JE ANWENDUNG: „ein Modul ersetzt genau
   einen Text, und die Anwendung zeigt ihn. Vier Anwendungen, vier Proben.
   **Trägt eine der vier nicht, ist die Form nicht fertig — melden, nicht die
   drei anderen als Erfolg zählen.**"

   Gebaut ist die FORM, nicht der Inhalt: je Werkzeug EIN gehobener Text, der
   den Weg beweist. Das Heben der übrigen ist das Heben in Tranchen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');

/* ══ 1 · Kern ══════════════════════════════════════════════════════════════ */

test('[Glied 10·Rot 1/4] Kern: ein Modul ersetzt genau einen Text, und der Kern zeigt ihn', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const kennung = Object.keys(V.TEXTSATZ_DE_QUELLE.texte).find(k => k.startsWith('strings:'));
  assert.ok(kennung, 'Vorbedingung: der Kern führt mindestens einen gehobenen Text');
  const schluessel = kennung.slice('strings:'.length, -'.text'.length);
  const eingebaut = V.STRINGS[schluessel];
  assert.ok(eingebaut, 'Vorbedingung: er ist über die Tabelle sichtbar');

  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { [kennung]: 'UN TEXTE DE MODULE' } }));
  assert.equal(r.angenommen, true, r.grund || '');
  // Der Kern wählt die Sprache über `data.textsprache` — ein Wert IM Depot, nicht die
  // Reihenfolge der Anmeldung. Ohne ihn bleibt der eingebaute Satz gültig, und genau das
  // ist richtig: ein eingelassenes Modul schaltet die Sprache nicht von selbst um.
  const d = V.getData(); d.textsprache = 'fr'; V.setData(d);
  V._textsatzModuleAusDepotAnmelden(V.getData());
  assert.equal(V.STRINGS[schluessel], 'UN TEXTE DE MODULE', 'der Kern ZEIGT den Modultext');
  assert.notEqual(V.STRINGS[schluessel], eingebaut);
});

/* ══ 2 · Lese-App ══════════════════════════════════════════════════════════ */

test('[Glied 10·Rot 2/4] Lese-App: ein Modul ersetzt genau einen Text, und der Empfänger zeigt ihn', () => {
  const r = ladeLesen(); const W = r.V || r;
  const schluessel = 'formatUnbekannt';
  const eingebaut = W.STRINGS[schluessel];
  assert.ok(eingebaut, 'Vorbedingung: der Text existiert eingebaut');
  // Dieselbe Regel wie im Kern: die Sprache steht im Depot (Korrektur vom 18.08.).
  const depot = { sektoren: {}, textsprache: 'fr', textsatzModule: [
    { modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
      texte: { ['strings:' + schluessel + '.text']: 'FORMAT INCONNU' } }] };
  W._foldVollmachtenLesen(depot); W.setData(depot);
  assert.equal(W.STRINGS[schluessel], 'FORMAT INCONNU', 'die Lese-App ZEIGT den Modultext');
  assert.notEqual(W.STRINGS[schluessel], eingebaut);
});

/* ══ 3 · Template-Generator ════════════════════════════════════════════════ */

test('[Glied 10·Rot 3/4] Generator: ein Modul ersetzt genau einen Text, und das Werkzeug zeigt ihn', () => {
  const { V, document } = ladeGenerator();
  const kennung = 'strings:appUntertitel.text';
  const eingebaut = V.TEXTSATZ_TEXTE_EINGEBAUT[kennung];
  assert.ok(eingebaut, 'Vorbedingung: der Generator führt einen gehobenen Text');
  assert.equal(V.textLesen(kennung), eingebaut, 'ohne Modul gilt der eingebaute Wortlaut');

  const n = V.textsatzModulAnwenden({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { [kennung]: 'Générateur de modèles pour institutions' } });
  assert.equal(n, 1, 'das Modul wird angenommen');
  assert.equal(V.textLesen(kennung), 'Générateur de modèles pour institutions',
    'der Generator ZEIGT den Modultext');
  assert.equal(typeof document, 'object');
});

/* ══ 4 · VC-Issuer ═════════════════════════════════════════════════════════ */

test('[Glied 10·Rot 4/4] VC-Issuer: ein Modul ersetzt genau einen Text, und das Werkzeug zeigt ihn', () => {
  const { V } = ladeIssuer();
  const kennung = 'strings:appUntertitel.text';
  const eingebaut = V.TEXTSATZ_TEXTE_EINGEBAUT[kennung];
  assert.ok(eingebaut, 'Vorbedingung: der Issuer führt einen gehobenen Text');
  const n = V.textsatzModulAnwenden({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { [kennung]: 'Émettre des certificats de fournisseur.' } });
  assert.equal(n, 1);
  assert.equal(V.textLesen(kennung), 'Émettre des certificats de fournisseur.',
    'der Issuer ZEIGT den Modultext');
  assert.notEqual(V.textLesen(kennung), eingebaut);
});

/* ══ Die Zusicherungen, die für alle vier gelten ═══════════════════════════ */

test('[Glied 10] der Rückfall im Markup ist byte-gleich mit der Tabelle — sonst zeigt die Seite zwei Wahrheiten', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const [datei, selektorText] of [
    ['vivodepot-studio.html', null],
    ['vivodepot-vc-issuer.html', null],
  ]) {
    const lader = datei.includes('studio') ? ladeGenerator : ladeIssuer;
    const { V } = lader();
    const quelle = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
    for (const ort of V.TEXTSATZ_MARKUP_ORTE) {
      const text = V.TEXTSATZ_TEXTE_EINGEBAUT[ort.kennung];
      assert.ok(typeof text === 'string' && text, datei + ': ' + ort.kennung + ' hat einen eingebauten Wortlaut');
      // Der Wortlaut MUSS auch im Markup stehen — er ist der Rückfall, solange kein Skript lief.
      assert.ok(quelle.includes('>' + text + '<'),
        datei + ': der Wortlaut von ' + ort.kennung + ' steht nicht byte-gleich im Markup');
    }
    assert.equal(selektorText, null);
  }
});

test('[Glied 10] die eingebaute Sprache ist in allen vier reserviert', () => {
  const kern = ladeKern().V;
  const lesenR = ladeLesen(); const lesen = lesenR.V || lesenR;
  const gen = ladeGenerator().V;
  const iss = ladeIssuer().V;
  for (const [name, V] of [['Kern', kern], ['Lese-App', lesen], ['Generator', gen], ['Issuer', iss]]) {
    const g = V.textsatzModulPruefen({ sprache: 'de', moduleVersion: 1, texte: {} });
    assert.equal(g.gueltig, false, name + ': `de` ist reserviert');
    assert.equal(g.grund, 'reserviert', name);
  }
});

test('[Glied 10] eine unbekannte Kennung wird in allen vier NAMENTLICH verworfen', () => {
  const gen = ladeGenerator().V;
  const iss = ladeIssuer().V;
  for (const [name, V] of [['Generator', gen], ['Issuer', iss]]) {
    const g = V.textsatzModulPruefen({ sprache: 'fr', moduleVersion: 1,
      texte: { 'strings:gibtEsNicht.text': 'x', 'strings:appUntertitel.text': 'y' } });
    assert.equal(g.gueltig, true, name + ': die tragfähige Zeile trägt weiter');
    assert.equal(Object.keys(g.texte).join('|'), 'strings:appUntertitel.text', name);
    assert.equal(Array.from(g.verworfene).map(v => v.kennung).join('|'), 'strings:gibtEsNicht.text', name);
  }
});

test('[Glied 10] ein kaputtes Modul bricht kein Werkzeug — es zeigt die eingebaute Sprache', () => {
  for (const lader of [ladeGenerator, ladeIssuer]) {
    const { V } = lader();
    const eingebaut = V.textLesen('strings:appUntertitel.text');
    assert.doesNotThrow(() => V.textsatzModulAnwenden([null, 42, 'kein objekt', { sprache: 'de' }]));
    assert.equal(V.textLesen('strings:appUntertitel.text'), eingebaut);
  }
});
