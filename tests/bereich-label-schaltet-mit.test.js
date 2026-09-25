'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Laufzettel „Die Vierunddreissig" (22.08.2026), Strang 1, Posten 2 + 3 —
   „Der angedockte Bereich schaltet mit dem Textsatz mit" (1.1b) — Registerzeile
   A495.
   ────────────────────────────────────────────────────────────────────────────
   POSTEN 2 (Herkunftssprache am Bereichsmodul, additiv) ist bereits mit A493
   gebaut: `bereichsModulPruefen` verlangt seit 1.0a `modul.sprache` für jedes
   Bereichsmodul, das eine `bereiche[].label` trägt (Positivkontrolle unten).

   POSTEN 3 IST NEU HIER: „obhut.label wird heute noch verworfen" — die
   verbliebene Hälfte des Befunds aus Erhebung 11. Dieselbe Mechanik wie 1.1
   (A491, ein angedocktes MODULFELD schaltet mit dem Textsatz mit), eine
   Ebene höher: die RUBRIK-Beschriftung eines angedockten BEREICHS.

   Die Schlüsselform stand laut Laufzettel bereits: `<bereichId>.label` — sie
   ist die Form, die der Satz für die zwölf eingebauten Bereiche ohnehin führt
   (`vorsorge.label` usw.). Geöffnet wird sie hier für Bereichs-IDs, die es im
   eingebauten Katalog NICHT gibt (`_istBereichLabelKennung`), UND die Rubrik
   wird als GETTER geführt (kein neuer Render-Mechanismus, reines JS — derselbe
   Kunstgriff wie `todesfall-uebernahme.bloecke`), damit sie mit der aktiven
   Sprache mitschaltet, ohne dass das Modul neu registriert werden muss.

   Rot-Beleg: gegen den Stand vor diesem Posten (kein `_istBereichLabelKennung`,
   `label` ein einfacher String am gefrorenen Bereichs-Objekt) fallen alle
   Proben unter „Posten 3" unten — per `git stash` gegen den unveränderten Kern
   belegt, nicht behauptet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BEREICH_ID = 'obhut';
const BEREICH_MODUL = {
  modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'probe-obhut',
  bereiche: { [BEREICH_ID]: { label: 'Fremde Daten in meiner Obhut', icon: 'folder' } },
};

function depotMitAngedocktemBereich() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const r = V.modulEinlassen(JSON.stringify(BEREICH_MODUL));
  assert.equal(r.angenommen, true, 'Vorbedingung: das Bereichsmodul muss angenommen werden — ' + r.grund);
  V._bereichsModuleAusDepotAnmelden(V.getData());
  return V;
}

function textsatzAktivieren(V, sprache, texte) {
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache, moduleVersion: 1, texte }));
  assert.equal(r.angenommen, true, 'Vorbedingung: der Textsatz muss angenommen werden — '
    + r.grund + ' · verworfen: ' + JSON.stringify(r.verworfene));
  const d = V.getData(); d.textsprache = sprache; V.setData(d);
  V._textsatzModuleAusDepotAnmelden(V.getData());
}

/* ── Posten 2 (bereits mit A493 gebaut) — hier nur bestätigt, nicht neu gebaut ── */

test('[Posten2] bereichsModulPruefen verlangt weiterhin eine Herkunftssprache (A493, keine Regression)', () => {
  const { V } = ladeKern();
  const ohneSprache = Object.assign({}, BEREICH_MODUL); delete ohneSprache.sprache;
  const g = V.bereichsModulPruefen(ohneSprache);
  assert.equal(g.gueltig, false);
  assert.equal(g.grund, 'sprache');
});

/* ── Posten 3 — NEU: die Rubrik schaltet mit ─────────────────────────────── */

test('[Posten3] Form: `<bereichId>.label` einer angedockten Bereichs-ID kommt jetzt durch den Textsatz-Prüfer', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { [BEREICH_ID + '.label']: 'Données confiées' } });
  assert.equal(r.gueltig, true, r.grund);
  assert.deepEqual(r.verworfene, [], 'ROT ERWARTET, wenn falsch: die Kennung darf nicht mehr verworfen werden');
  assert.equal(r.texte[BEREICH_ID + '.label'], 'Données confiées');
});

test('[Posten3·Rot-Beleg] ein EINGEBAUTER Bereich bleibt über seinen eigenen Weg erreichbar — kein zweites Tor', () => {
  // `advanceCare.label` ist bereits eine gültige AB_WERK_TEXTSATZ_DE-Kennung; `_istBereichLabelKennung`
  // schliesst eingebaute Bereichs-IDs ausdrücklich aus (BEREICH_IDS_EINGEBAUT), damit kein
  // Modul über den neuen, weiteren Weg eine bestehende Kennung ein zweites Mal beansprucht.
  const { V } = ladeKern();
  assert.equal(V._istBereichLabelKennung('advanceCare.label'), false,
    'ein eingebauter Bereich braucht die neue Form nicht — er hat bereits eine gültige Kennung');
  assert.equal(V._istBereichLabelKennung(BEREICH_ID + '.label'), true);
});

test('[Posten3·Rot-Beleg] eine erfundene Art (`.hint`) an einer Bereichs-ID fällt weiter durch', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { [BEREICH_ID + '.hint']: 'sollte nicht ankommen' } });
  assert.deepEqual(r.verworfene.map((v) => v.grund), ['unbekannt'],
    'nur `.label` ist die Rubrik-Beschriftung einer Bereichs-ID — `.hint` bleibt unbekannt');
});

test('[Posten3·DIE ANTWORT] die Rubrik zeigt OHNE Satz weiter das Modul-eigene Label', () => {
  const V = depotMitAngedocktemBereich();
  const bereich = V._sektorIndexHalter()[BEREICH_ID];
  assert.ok(bereich, 'der angedockte Bereich muss im Index stehen');
  assert.equal(bereich.label, 'Fremde Daten in meiner Obhut',
    'ohne Textsatz gilt weiter das, was das Modul selbst mitgebracht hat — kein leerer Titel');
});

test('[Posten3·DIE ANTWORT] mit aktivem Satz zeigt die Rubrik den übersetzten Text — und schaltet zurück', () => {
  const V = depotMitAngedocktemBereich();
  textsatzAktivieren(V, 'fr', { [BEREICH_ID + '.label']: 'Données confiées' });
  assert.equal(V._sektorIndexHalter()[BEREICH_ID].label, 'Données confiées',
    'ROT ERWARTET, wenn falsch: die Rubrik muss auf den aktiven Satz umschalten');

  // Zurück auf Deutsch — dieselbe Probe wie beim Modulfeld (A491): „zurück auf Deutsch" darf
  // nicht am zuletzt gesehenen Modultext hängen bleiben.
  const d = V.getData(); d.textsprache = ''; V.setData(d);
  V._textsatzModuleAusDepotAnmelden(V.getData());
  assert.equal(V._sektorIndexHalter()[BEREICH_ID].label, 'Fremde Daten in meiner Obhut',
    'ohne aktiven Satz muss der Modul-eigene Text wieder gelten, kein Rest des Französischen');
});

test('[Posten3] `label` ist ein GETTER am gefrorenen Bereichs-Objekt, kein Datenfeld — Object.keys nennt ihn trotzdem', () => {
  const V = depotMitAngedocktemBereich();
  const bereich = V._sektorIndexHalter()[BEREICH_ID];
  const beschreibung = Object.getOwnPropertyDescriptor(bereich, 'label');
  assert.equal(typeof beschreibung.get, 'function', 'ROT ERWARTET, wenn falsch: label muss ein Getter sein');
  assert.equal(beschreibung.set, undefined);
  assert.ok(Object.keys(bereich).includes('label'), 'ein Getter bleibt enumerable und für Leser sichtbar');
  assert.ok(Object.isFrozen(bereich), 'das Bereichs-Objekt bleibt eingefroren wie zuvor');
});
