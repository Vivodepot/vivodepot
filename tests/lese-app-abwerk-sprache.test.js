'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Lese-App liest die ab Werk eingebackene Struktur aus der Datei
   (Sprache, Bereiche, Logikmodule)
   (Befund B3 im DoD-Code-Review vom 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   DER FALL: Seit dem 08.09.2026 backt ein konfektioniertes Produkt sein
   volles Sprachmodul in seinen eigenen Quelltext (`AB_WERK_SPRACHE_PRODUKT`)
   und schreibt es beim Anlegen des Depots als Mitschrift in die Datei
   (`data.abWerkMitschrift.sprache`, `_abWerkStrukturInsDepot` im Kern).
   GEMESSEN am 16.09.2026: `privat-en` backt 342 KB Sprachmodul ein,
   `pro-de` keines (Weg zum Nachsehen: konfektionieren und die Region
   zwischen `AB_WERK_SPRACHE_PRODUKT:BEGIN/END` messen).

   Die Lese-App las bis heute NUR `data.textsatzModule` — ein Fach, das nur
   ein ausdrücklich eingelassenes Modul füllt. Die eingebackene Sprache stand
   also in der Datei und kam trotzdem nicht an: die Bürgerin sah ihr
   englisches Depot auf Deutsch.

   DIE ORDNUNG IST DIE DES KERNS, nicht eine zweite: ein Depot-eigenes Modul
   gewinnt vor der Mitschrift, und `data.textsprache` gewinnt vor beidem
   (`textsatzSpracheAktiv` in `vivodepot.html`).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const lesen = () => { const r = ladeLesen(); return r.V || r; };

/* Ein kleines, echtes Sprachmodul in der Form, die der Kern einbackt — dieselbe
   Form, die `textsatzModulPruefen` auch für ein eingelassenes Modul verlangt. */
const EN_MODUL = Object.freeze({
  modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot',
  texte: { 'strings:sektorTitel.text': 'Area', 'identity.label': 'Identity and person' },
  regeln: { sprachkennung: 'en-GB' },
});

const DEPOT_EN = () => ({
  sektoren: {}, textsatzModule: [],
  abWerkMitschrift: { bereich: [], sprache: JSON.parse(JSON.stringify(EN_MODUL)), logikModul: [] },
});

test('[Rot 1] die eingebackene Sprache aus der Mitschrift wird aktiv', () => {
  const L = lesen();
  L._foldVollmachtenLesen(DEPOT_EN());
  assert.equal(L.textsatzSpracheAktiv(), 'en', 'das englische Produkt muss in der Lese-App englisch sein');
});

test('[Rot 2] und ihre Texte kommen an, nicht nur ihr Name', () => {
  const L = lesen();
  L._foldVollmachtenLesen(DEPOT_EN());
  assert.equal(L.textLesen('identity.label'), 'Identity and person');
});

test('[Rot 3] auch die Regeln der eingebackenen Sprache gelten', () => {
  const L = lesen();
  L._foldVollmachtenLesen(DEPOT_EN());
  const dok = { documentElement: { _attr: {},
    setAttribute(k, w) { this._attr[k] = w; }, getAttribute(k) { return this._attr[k]; } } };
  assert.equal(L.textsatzSprachkennungAnwenden(dok), 'en-GB');
});

test('Ein deutsches Produkt bleibt deutsch — die Mitschrift ist dort leer', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [],
    abWerkMitschrift: { bereich: [], sprache: null, logikModul: [] } });
  assert.equal(L.textsatzSpracheAktiv(), 'de');
});

test('Ein Depot-eigenes Modul gewinnt gegen die Mitschrift — dieselbe Ordnung wie im Kern', () => {
  const L = lesen();
  const d = DEPOT_EN();
  d.textsatzModule = [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
    texte: { 'identity.label': 'Identity (from the docked module)' } }];
  L._foldVollmachtenLesen(d);
  assert.equal(L.textLesen('identity.label'), 'Identity (from the docked module)');
});

/* Die dritte Stufe der Rangfolge ist in diesem Harness NICHT ausführbar: `data` ist in der
   Lese-App ein `let` im Skript-Bereich, das der Test nicht setzen kann (dieselbe Grenze, an
   der `tests/a479-lese-app-textsatz-regeln.test.js` den Quelltext liest statt den Zustand).
   Darum hier als STRUKTUR-Probe: die Lesereihenfolge steht in der Funktion selbst. */
test('data.textsprache steht vor der Modulsprache — geprüft am Quelltext, nicht am Zustand', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const i = quelle.indexOf('function textsatzSpracheAktiv()');
  assert.ok(i > 0, 'textsatzSpracheAktiv nicht gefunden');
  const koerper = quelle.slice(i, i + 600);
  assert.match(koerper, /data\.textsprache/, 'die Sprache der Bürgerin muss zuerst gelesen werden');
  assert.ok(koerper.indexOf('data.textsprache') < koerper.indexOf('_TEXTSATZ_MODUL_SPRACHE'),
    'data.textsprache steht vor dem Modul-Rückfall — sonst überstimmt ein Modul die Wahl der Bürgerin');
});

test('Eine kaputte Mitschrift bricht das Öffnen nicht', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [],
    abWerkMitschrift: { sprache: { modulTyp: 'textsatz' } } });
  assert.equal(L.textsatzSpracheAktiv(), 'de', 'ein unbrauchbares Modul wird uebersprungen, nicht geworfen');
});

/* ══ Bereiche und Logikmodule aus derselben Mitschrift (16.09.2026) ══════
   Dieselbe Baustelle wie die Sprache: ein Pro-Produkt backt seine Bereiche als
   `bereichsErsatz` und seine Logikmodule ein; beides reist als Mitschrift mit der
   Datei. Die Lese-App las bis heute nur die Fächer, die eine Bürgerin selbst
   gefüllt hat — und zeigte darum von einem Pro-Depot Werte ohne Namen. */

const PRO_MITSCHRIFT = () => ({
  sektoren: {}, textsatzModule: [], bereichsModule: [], logikModule: [],
  abWerkMitschrift: {
    bereich: [],
    sprache: null,
    logikModul: [{ id: 'proUebergabe', sektor: 'pro-betrieb-zugaenge', titel: 'Übergabe', abschnitte: [] }],
    bereichsErsatz: {
      ersetzt: ['health'],
      neu: { 'pro-betrieb-zugaenge': { label: 'Betrieb und Zugänge', icon: 'folder', sektionen: [] } },
    },
  },
});

test('[Rot 4] ein Pro-Bereich aus dem mitgeschriebenen Ersatz wird bekannt', () => {
  const L = lesen();
  const d = PRO_MITSCHRIFT();
  L._foldVollmachtenLesen(d);
  const n = L._bereichsModuleAusDepotAnmeldenLesen(d);
  assert.ok(n >= 1, 'der mitgeschriebene Pro-Bereich muss angemeldet werden, angemeldet: ' + n);
});

test('[Rot 4·Gegenprobe] ohne Mitschrift bleibt der Pro-Bereich unbekannt', () => {
  const L = lesen();
  const d = PRO_MITSCHRIFT();
  d.abWerkMitschrift.bereichsErsatz = null;
  L._foldVollmachtenLesen(d);
  assert.equal(L._bereichsModuleAusDepotAnmeldenLesen(d), 0);
});

test('[Rot 4·Grenze] die Mitschrift benennt, sie verdrängt nicht — `ersetzt` bleibt ohne Wirkung', () => {
  const L = lesen();
  const d = PRO_MITSCHRIFT();
  L._foldVollmachtenLesen(d);
  L._bereichsModuleAusDepotAnmeldenLesen(d);
  /* GEMESSEN AM KATALOG, NICHT AM ANZEIGE-INDEX (16.09.2026, aus dem
     Erbschein-Datenverlust): Vorhandensein ist eine Datenfrage. Ein Index, den ein Produkt
     filtert, beantwortet eine andere — er sagt, was gezeigt wird, nicht, was es gibt. */
  const katalog = (L.SEKTOREN || []).map((s) => s.id);
  assert.ok(katalog.includes('health'),
    'ein nativer Bereich darf aus einer Datei heraus nicht aus dem Katalog verschwinden');
});

test('[Rot 5] die mitgeschriebenen Logikmodule kommen an', () => {
  const L = lesen();
  const d = PRO_MITSCHRIFT();
  const alle = L._logikModuleAlleLesen(d);
  assert.equal(alle.length, 1);
  assert.equal(alle[0].id, 'proUebergabe');
});

test('[Rot 5·Rangfolge] ein depot-eigenes Modul gewinnt gegen dasselbe aus der Mitschrift', () => {
  const L = lesen();
  const d = PRO_MITSCHRIFT();
  d.logikModule = [{ id: 'proUebergabe', sektor: 'pro-betrieb-zugaenge', titel: 'Selbst angedockt', abschnitte: [] }];
  const alle = L._logikModuleAlleLesen(d);
  assert.equal(alle.length, 1);
  assert.equal(alle[0].titel, 'Selbst angedockt');
});

/* ══ Pro-Bereiche aus der Datei tragen ihre FELDER, nicht nur ihre Namen (Korrektur 16.09.2026, Code-Review M2) ══
   `bereichsModulPruefenLesen` legte jeden Modul-Bereich mit `sektionen: []` an — der Stand des
   Kerns vor dem 08.09.2026. Gemessen an einer echten pro-de-Datei: die Lese-App zeigte die sieben
   Pro-Bereiche mit Namen und „nicht hinterlegt", obwohl zwei Werte in der Datei standen. Ein Feld
   aus einer Vorlage erschien (anderer Weg), ein Feld aus der Sektion nicht. Diese Probe hält
   genau das: ein Sektions-Feld eines mitgeschriebenen Pro-Bereichs wird mit seinem Wert gezeigt. */

const PRO_MIT_FELDERN = () => ({
  sektoren: { 'pro-vertretung-vollmachten': { notiz: 'WERT-AUS-DER-DATEI' } },
  textsatzModule: [], bereichsModule: [], logikModule: [],
  abWerkMitschrift: {
    bereich: [], sprache: null, logikModul: [],
    bereichsErsatz: {
      ersetzt: ['health'],
      neu: {
        'pro-vertretung-vollmachten': {
          label: 'Vertretung und Vollmachten', icon: 'folder',
          sektionen: [{ id: 'allgemein', label: 'Allgemein', felder: [{ id: 'notiz', typ: 'textarea', label: 'Notiz' }] }],
        },
      },
    },
  },
});

test('[Rot 6] ein Pro-Bereich aus der Datei trägt seine Sektionen und Felder', () => {
  const L = lesen();
  const d = L._foldVollmachtenLesen(PRO_MIT_FELDERN());
  L.setData(d);
  L._bereichsModuleAusDepotAnmeldenLesen(d);
  const pv = L.bereicheAlleLesen().find((b) => b.id === 'pro-vertretung-vollmachten');
  assert.ok(pv, 'der Pro-Bereich muss bekannt sein');
  const felder = pv.sektionen.reduce((n, s) => n + s.felder.length, 0);
  assert.equal(felder, 1, 'der Bereich trägt sein Feld — nicht nur seinen Namen');
});

test('[Rot 6·Wert] und der Wert erscheint in der Ansicht des Bereichs', () => {
  const L = lesen();
  const d = L._foldVollmachtenLesen(PRO_MIT_FELDERN());
  L.setData(d);
  L._bereichsModuleAusDepotAnmeldenLesen(d);
  const html = L.sektorHTML('pro-vertretung-vollmachten');
  assert.ok(html.includes('WERT-AUS-DER-DATEI'), 'der Wert aus der Datei muss sichtbar sein, nicht „nicht hinterlegt"');
});

test('[Rot 6·Gegenprobe] ein Bereichs-Modul ohne `sektionen` bleibt bei der alten Aussage', () => {
  const L = lesen();
  const r = L.bereichsModulPruefenLesen({
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    bereiche: { 'eigener-bereich': { label: 'Eigener Bereich', icon: 'folder' } },
  });
  assert.equal(r.gueltig, true);
  assert.equal(r.bereiche[0].sektionen.length, 0);
});

/* ── B3 (19.09.2026): eigenes AB_WERK_TEXTSATZ_EN als Basis-Fach ────────────
   Der obige Mechanismus (Mitschrift) trägt nur, WENN die Datei eine Mitschrift mitbringt. Eine
   ältere Datei, oder eine Kennung, die seit ihrer Erzeugung zum Kern hinzukam, hatte gar keine
   englische Quelle — die Lese-App selbst hatte KEINEN eigenen englischen Textsatz (anders als
   der Kern, der AB_WERK_TEXTSATZ_EN immer trägt). Diese Datei-Harness setzt `data` nie global
   (die Folds nehmen `obj` als Parameter, s. Kern-Kommentar an `_foldVollmachtenLesenVorUmbau`)
   — `data.textsprache` ist darum hier nicht auslösbar (der bestehende Test „data.textsprache
   steht vor der Modulsprache" prüft das schon rein am Quelltext, nicht am Zustand). Die
   erreichbare, realistische Lücke ist eine MITSCHRIFT, die die aktive Sprache auf Englisch
   setzt, aber eine Kennung NICHT trägt (eine ältere Datei; eine Kennung, die seit ihrer
   Erzeugung zum Kern hinzukam — genau der Fall aus dem Befund). */
const EN_MODUL_UNVOLLSTAENDIG = Object.freeze({
  modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot',
  // Trägt EINE Kennung (identity#person.label), aber NICHT identity.label — die muss aus der
  // Ab-Werk-Basis kommen.
  texte: { 'identity#person.label': 'Person' },
});
const DEPOT_EN_UNVOLLSTAENDIGE_MITSCHRIFT = () => ({
  sektoren: {}, textsatzModule: [],
  abWerkMitschrift: { bereich: [], sprache: JSON.parse(JSON.stringify(EN_MODUL_UNVOLLSTAENDIG)), logikModul: [] },
});

test('[S1] eine Mitschrift, die eine Kennung NICHT trägt, ergibt für sie keinen englischen Text — die Lese-App trägt keine eigene Basis mehr', () => {
  const L = lesen();
  L._foldVollmachtenLesen(DEPOT_EN_UNVOLLSTAENDIGE_MITSCHRIFT());
  assert.equal(L.textsatzSpracheAktiv(), 'en');
  assert.equal(L.textLesen('identity#person.label'), 'Person', 'Vorbedingung: die Mitschrift selbst trägt');
  const wert = L.textLesen('identity.label');
  assert.equal(wert, null, 'S1: keine eingebackene Basis — was die Mitschrift nicht trägt, bleibt ohne englischen Text (der deutsche Name der App-Struktur bleibt stehen)');
});

test('[B3] dieselbe Kennung bleibt auf Deutsch, solange die aktive Sprache Deutsch ist', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [] });
  assert.equal(L.textsatzSpracheAktiv(), 'de');
  assert.equal(L.textLesen('identity.label'), null, 'Deutsch bleibt die Kennung selbst — kein Rückfall-Modul dafür (U2-ADR-363)');
});

test('[S1·Rangfolge] die Mitschrift liefert ihren eigenen Text unverändert (eine Basis, die sie überschreiben müsste, gibt es nicht mehr)', () => {
  const L = lesen();
  const depot = DEPOT_EN();
  L._foldVollmachtenLesen(depot);
  // EN_MODUL (Mitschrift) trägt „identity.label": „Identity and person". Vor S1 stand dort bewusst ein anderer Wortlaut in der Basis ("Identity & person").
  assert.equal(L.textLesen('identity.label'), 'Identity and person',
    'die Mitschrift trägt ihren Text');
});

test('[S1·Leerform] die Region AB_WERK_TEXTSATZ_EN ist im Gerüst leer (null) — die Lese-App trägt keinen eingebackenen englischen Satz', () => {
  const L = lesen();
  assert.equal(L.AB_WERK_TEXTSATZ_EN, null);
});
