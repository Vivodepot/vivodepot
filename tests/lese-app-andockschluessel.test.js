'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Glied 8 · Die Lese-App liest die übrigen Andockschlüssel
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, vor dem Bau gemessen: von den fünf andockbaren Registern erreichte
   GENAU EINES den Empfänger — `feldDefinitionen` (U2-ADR-037, seit A276/A277
   auch unbeschädigt). `textsatzModule`, `rechtsraumModule`, `institutionsArten`
   und `importierteVorlagen` kamen in `vivodepot-lesen.html` NULL Mal vor.

   Ein Depot, dessen Beschriftungen die Bürgerin ausgetauscht hat, sprach beim
   Empfänger wieder die eingebaute Sprache — ohne Fehler, ohne Hinweis.

   WAS HIER GEPRÜFT WIRD, IST DIE LEITUNG, NICHT DAS HEBEN. Der Kennungsraum,
   den beide Anwendungen heute bedienen, ist der der Zeichenketten-Tabelle.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const lesen = () => { const r = ladeLesen(); return r.V || r; };
const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');

/* ══ Vorbedingung · der Befund, aus dem dieses Glied kommt ══════════════════ */

test('[Glied 8·Vorbedingung] der EINE Trichter: alle Zuweisungen an `data` laufen über _depotUebernehmenGeprueft (das _foldVollmachtenLesen aufruft)', () => {
  // Sonst müsste die Anmeldung mehrfach danebenstehen — genau die Verteilung, an der der Kern
  // seine Register-Wege verloren hatte (U2-ADR-145).
  const zuweisungen = (QUELLE.match(/^\s*data = (?!null)/gm) || []).length + (QUELLE.match(/\{ data = d;/g) || []).length;
  const ueberTrichter = (QUELLE.match(/data = await _depotUebernehmenGeprueft\(/g) || []).length + (QUELLE.match(/_depotUebernehmenGeprueft\([^)]*\)\.then\(\(d\) => \{ data = d;/g) || []).length;
  assert.ok(zuweisungen > 0, 'Vorbedingung: es gibt überhaupt Zuweisungen');
  assert.equal(zuweisungen, ueberTrichter, 'jede Depot-Zuweisung geht durch den Trichter');
});

/* ══ Rot-Beleg 1 · ein angedockter Satz erreicht den Empfänger ══════════════ */

test('[Glied 8·Rot 1] ein Textsatz-Modul im Depot ändert den Text, den der Empfänger zeigt', () => {
  const L = lesen();
  const schluessel = 'formatUnbekannt';
  const eingebaut = L.STRINGS[schluessel];
  assert.ok(eingebaut && typeof eingebaut === 'string', 'Vorbedingung: der Text existiert eingebaut');

  const depot = {
    sektoren: {},
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
      texte: { ['strings:' + schluessel + '.text']: 'Ce format n’est pas reconnu.' } }],
  };
  // Der ECHTE Öffnen-Trichter, nicht setData: setData läuft an der Anmeldung vorbei.
  L._foldVollmachtenLesen(depot);
  assert.equal(L.textsatzSpracheAktiv(), 'fr');
  assert.equal(L.textLesen('strings:' + schluessel + '.text'), 'Ce format n’est pas reconnu.');
  assert.equal(L.STRINGS[schluessel], 'Ce format n’est pas reconnu.',
    'die Tabelle selbst liefert den angedockten Text');
  // Alles Übrige ersetzt der Satz nicht — es kommt aus dem Rückfall (19.09.2026: Modulsprache → Englisch → Deutsch), hier Englisch.
  assert.equal(L.STRINGS.appName, L.LESE_TEXTE_EN.appName);
});

test('[Glied 8·Rot 1b] der Satz geht MIT dem Depot — nach dem Schliessen spricht der Empfänger wieder eingebaut', () => {
  const L = lesen();
  const eingebaut = L.STRINGS.formatUnbekannt;
  L._foldVollmachtenLesen({ sektoren: {},
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
      texte: { 'strings:formatUnbekannt.text': 'Format inconnu.' } }] });
  assert.equal(L.STRINGS.formatUnbekannt, 'Format inconnu.');
  // Ein leeres Depot ist die Umkehrung des Öffnens auf der Ebene, die diese Probe erreicht.
  L._foldVollmachtenLesen({ sektoren: {} });
  assert.equal(L.STRINGS.formatUnbekannt, eingebaut, 'kein Satz überlebt sein Depot');
});

/* ══ Rot-Beleg 2 · was der Empfänger NICHT kann, sagt er namentlich ═════════ */

test('[Glied 8·Rot 2] eine Kennung, die dieser Empfänger nicht führt, wird NAMENTLICH verworfen — nicht still geschluckt', () => {
  const L = lesen();
  const g = L.textsatzModulPruefen({ sprache: 'fr', moduleVersion: 1, texte: {
    'strings:formatUnbekannt.text': 'Format inconnu.',
    'sektor:identitaet.label': 'Identité',          // Kennungsraum, den heute KEINE der beiden Anwendungen bedient
    'strings:gibtEsNicht.text': 'Rien',
  } });
  assert.equal(g.gueltig, true, 'die tragfähige Zeile trägt weiter');
  // Über die Sandbox-Grenze hinweg wird auf WERTE verglichen, nicht auf Prototypen:
  // ein Array aus dem geladenen Empfänger ist nicht referenzgleich mit einem hiesigen.
  assert.equal(Object.keys(g.texte).join('|'), 'strings:formatUnbekannt.text');
  assert.equal(Array.from(g.verworfene).map(v => v.kennung).sort().join('|'),
    'sektor:identitaet.label|strings:gibtEsNicht.text');
  for (const v of g.verworfene) assert.equal(v.grund, 'unbekannt');
});

test('[Glied 8] die eingebaute Sprache ist nicht überschreibbar, und ein kaputtes Modul ist ein Befund', () => {
  const L = lesen();
  assert.equal(L.textsatzModulPruefen({ sprache: L.TEXTSATZ_SPRACHE_EINGEBAUT, moduleVersion: 1, texte: {} }).grund, 'reserviert');
  for (const kaputt of [null, {}, { sprache: 'fr' }, { sprache: 'fr', moduleVersion: 0, texte: {} },
    { sprache: 'fr', moduleVersion: 1 }]) {
    const g = L.textsatzModulPruefen(kaputt);
    assert.equal(g.gueltig, false, JSON.stringify(kaputt));
    assert.ok(typeof g.grund === 'string' && g.grund, 'es gibt einen benennbaren Grund');
  }
});

test('[Glied 8] ein kaputtes Modul bricht das ÖFFNEN nicht — der Empfänger zeigt die eingebaute Sprache', () => {
  const L = lesen();
  const eingebaut = L.STRINGS.formatUnbekannt;
  const depot = { sektoren: {}, textsatzModule: [null, 42, { sprache: 'de' }, 'kein objekt'] };
  assert.doesNotThrow(() => L._foldVollmachtenLesen(depot));
  assert.equal(L.STRINGS.formatUnbekannt, eingebaut);
});

/* ══ Die Tabelle bleibt unveränderlich — sie wandert nur eine Ebene nach aussen ══ */

test('[Glied 8] STRINGS weist jedes Schreiben ZURÜCK — mit einem Wurf, nicht still', () => {
  const L = lesen();
  assert.throws(() => { L.STRINGS.appName = 'anders'; }, /unveraenderlich/);
  assert.throws(() => { delete L.STRINGS.appName; }, /unveraenderlich/);
  assert.throws(() => { Object.defineProperty(L.STRINGS, 'neu', { value: 'x' }); }, /unveraenderlich/);
});

/* ══ Der Rechtsraum: die Leitung, ausdrücklich ohne Satz ════════════════════ */

test('[Glied 8] ein Rechtsraum-Modul im Depot steht der Ansicht zur Verfügung', () => {
  const L = lesen();
  assert.equal(L.rechtsraumModulFuer('AT'), null, 'Vorbedingung: ohne Depot kein Modul');
  L._foldVollmachtenLesen({ sektoren: {},
    rechtsraumModule: [{ rechtsraum: 'AT', moduleVersion: 1, sprache: 'de', typen: { 'enduring-power-of-attorney': {} } }] });
  const m = L.rechtsraumModulFuer('AT');
  assert.ok(m, 'das Modul ist abrufbar');
  assert.equal(m.rechtsraum, 'AT');
  assert.equal(L.rechtsraumModuleAlle().length, 1);
});

test('[Glied 8] höhere moduleVersion gewinnt; ein kaputtes Rechtsraum-Modul wird übersprungen', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, rechtsraumModule: [
    { rechtsraum: 'AT', moduleVersion: 1, sprache: 'de', typen: {} },
    { rechtsraum: 'AT', moduleVersion: 3, sprache: 'de', typen: {}, marke: 'neu' },
    { moduleVersion: 2 },            // ohne rechtsraum — kein Modul
    { rechtsraum: 'CH', moduleVersion: 0 },   // ungültige Version
  ] });
  assert.equal(L.rechtsraumModulFuer('AT').marke, 'neu');
  assert.equal(L.rechtsraumModulFuer('CH'), null);
  assert.equal(L.rechtsraumModuleAlle().length, 1);
});

test('[Glied 8] KEIN Rechtsraum-Hinweistext — der Wortlaut ist eine Produktentscheidung, nicht diesem Glied', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {},
    rechtsraumModule: [{ rechtsraum: 'AT', moduleVersion: 1, sprache: 'de', typen: {} }] });
  // Der Empfänger stellt das Modul bereit und sagt darüber NICHTS. Diese Probe hält fest,
  // dass hier keine Formulierung entstanden ist — sie wird rot, sobald eine dazukommt.
  const texte = Object.keys(L.STRINGS).map(k => String(L.STRINGS[k])).join(' ');
  assert.equal(/[Rr]echtsraum/.test(texte), false, 'keine Zeichenkette der Lese-App nennt einen Rechtsraum');
});
