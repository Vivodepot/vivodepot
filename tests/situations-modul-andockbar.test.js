'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-246 · Situationen werden andockbar — das achte Einlass-Register
   ────────────────────────────────────────────────────────────────────────
   Bislang war SITUATIONEN vollständig hartcodiert: kein angedocktes Modul
   konnte selbst eine Situation anlegen oder ihr ein eigenes Feld geben. Die
   Produktentscheidung hat das als Gerüst-Fähigkeit entschieden — nicht nachrüstbar,
   sobald das Gerüst eingefroren ist (s. U2-ADR-243 §1, Fund während des Baus).

   WÖRTLICHER SPIEGEL von `tests/bereichs-module-einlass.test.js` (A389, das
   fünfte Register) — dieselbe Bauart, derselbe Prüfaufbau, auf Situationen
   statt Bereiche übertragen:
     Registry (`_SITUATIONEN_MODUL_REGISTRY`) · Prüfer (`situationsModulPruefen`)
     · Anmeldung (`_situationsModuleAusDepotAnmelden`) · Merge (`situationenAlle`)
     · Einbetten (`situationsModulEinbetten`) · EINLASS_REGISTER-Eintrag `situation`.

   ZWEI STÜCKE OHNE BEREICHS-VORBILD, weil sie dort nicht existieren:
     - die Vorlagen-Übersetzung eines situationseigenen Felds
       (`_templateFeldZuModell`, Zweig `situation` statt `bereich`,
       `_templateFelderUebersetzen` liefert `situationFeldDefinitionen`
       zusätzlich zu `feldDefinitionen`);
     - die Render-Injektion in `renderSituation`/`situationModell` (ein neuer
       Block „Vom Anbieter", auf einer LOKALEN Kopie von `bloecke` — nie
       `si.bloecke` selbst, wörtlicher Spiegel der Brief-Anbindung
       (SITUATION_FELD_EXPORT) direkt daneben).

   VIER AUFLAGEN (04.09.2026), hier beantwortet:
   1. `situationFeldSetzen` schreibt wie `sektorFeldSetzen` unbedingt (A317,
      der Namensraum ist weiter als der Katalog) — dokumentiert, nicht
      gesperrt (kein eigener Test hier: dieselbe, bereits bewiesene
      Charakteristik, kein neues Verhalten).
   2. Der Erlaubnislisten-Wächter (`_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`) trägt
      jetzt eine Probe auf den VOLLSTÄNDIGEN Inhalt, nicht nur Stichproben —
      s. tests/schema-wirkt-nicht-nachtrag.test.js.
   3. Modul-vs-Modul-Kollision (erstes gewinnt, zweites `doppelt`) ist der
      exakte Spiegel des Bereichs-Verhaltens — geprüft unten.
   4. Ein docked `bloecke` ist ein STATISCHES, eingefrorenes Array, keine
      Getter — 20/20 Konsumenten von `.bloecke` im ganzen Skript lesen nur
      direkt, keiner spreadet/stringifiziert das ganze Situationsobjekt; die
      einzige dynamische Injektion (Brief-Anbindung) arbeitet ohnehin auf
      einer `.slice()`-Kopie, nie auf `si.bloecke` selbst.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

const NOTFALL_MODUL = {
  modulTyp: 'situation', moduleVersion: 1, herkunft: 'test-anbieter', sprache: 'de',
  situationen: {
    'test-notfall': { icon: 'star', titel: 'Notfall-Kontakt', bloecke: [] },
  },
};

/* ══ Registry, Prüfer, Anmeldung ═══════════════════════════════════════ */

test('[Register] der Einlassweg führt ein achtes Register, es heißt situation', () => {
  const { V } = ladeKern();
  const typen = V.EINLASS_REGISTER.map((r) => r.typ);
  assert.ok(typen.includes('situation'), 'Register vorhanden: ' + typen.join(','));
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'situation');
  assert.equal(reg.slot, 'situationsModule');
  assert.equal(reg.kennung(NOTFALL_MODUL), 'test-anbieter', 'die Kennung ist die Herkunft, nicht eine Situations-ID');
});

test('[Migrationsstufe] legt die zwei Slots an — und schreibt nichts um', () => {
  const { V } = ladeKern();
  const alt = Object.assign(V.leeresDepot(), { schemaVersion: 74 });
  delete alt.situationsModule;
  delete alt.situationFeldDefinitionen;
  alt.situationen.geburt = { klinik: 'Klinikum München' };
  const neu = V.depotNormalisieren(alt);
  assert.deepEqual(neu.situationsModule, [], 'Slot angelegt und LEER');
  assert.deepEqual(neu.situationFeldDefinitionen, [], 'zweiter Slot angelegt und LEER');
  assert.ok(neu.schemaVersion >= 76, 'mindestens bis 76 gestiegen: ' + neu.schemaVersion);
  assert.equal(neu.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(neu.situationen.geburt.klinik, 'Klinikum München', 'kein Bestandswert angefasst');
});

test('[Prüfer] eine reservierte, eingebaute Situations-ID wird verworfen — benannt, nicht schweigend', () => {
  const { V } = ladeKern();
  const g = V.situationsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    situationen: {
      geburt: { titel: 'Übernahmeversuch' },        // eingebaut — reserviert
      'x-eigen': { titel: 'Eigene Situation' },
    },
  });
  assert.equal(g.gueltig, true, 'ein verworfener Eintrag verwirft nicht das ganze Modul');
  const ids = g.situationen.map((s) => s.id);
  assert.deepEqual(ids, ['x-eigen']);
  assert.ok(g.verworfene.some((v) => v.id === 'geburt' && v.grund === 'reserviert'));
});

test('[Prüfer·rot] ohne moduleVersion, ohne Herkunft, ohne brauchbaren Eintrag gibt es kein Modul', () => {
  const { V } = ladeKern();
  assert.equal(V.situationsModulPruefen(null).grund, 'kein-objekt');
  assert.equal(V.situationsModulPruefen({ herkunft: 'x', situationen: {} }).grund, 'moduleVersion');
  assert.equal(V.situationsModulPruefen({ moduleVersion: 1, situationen: {} }).grund, 'herkunft');
  const nurMuell = V.situationsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de', situationen: { 'GROSS UND FALSCH': { titel: 'x' } },
  });
  assert.equal(nurMuell.gueltig, false, 'ein Modul ohne eine einzige tragbare Situation ist keins');
  assert.equal(nurMuell.grund, 'leer');
});

test('[Prüfer·rot] eine Situation ohne Titel wird verworfen', () => {
  const { V } = ladeKern();
  const g = V.situationsModulPruefen({
    moduleVersion: 1, herkunft: 'x', situationen: { 'ohne-titel': { titel: '' } },
  });
  assert.equal(g.gueltig, false);
  assert.equal(g.grund, 'leer');
});

test('[Prüfer·rot] ein eigenes Feld ({feld:{…}}) in bloecke bei der ANMELDUNG wird verworfen — nur der signierte Vorlagen-Weg darf eigene Felder liefern', () => {
  const { V } = ladeKern();
  const g = V.situationsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    situationen: {
      'x-eigen': {
        titel: 'Eigene Situation',
        bloecke: [{ titel: 'Block', eintraege: [{ feld: { id: 'x', label: 'y', typ: 'text' } }] }],
      },
    },
  });
  assert.equal(g.gueltig, false, 'ein Modul ohne eine einzige tragbare Situation ist keins: ' + g.grund);
  assert.equal(g.grund, 'leer');
  assert.ok(g.verworfene.some((v) => v.id === 'x-eigen' && v.grund === 'bloecke'));
});

test('[Anmeldung] eingelassen wirkt: die Situation steht in der Liste und im Nachschlage-Index', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const r = V.modulEinlassen(JSON.stringify(NOTFALL_MODUL), d);
  assert.equal(r.angenommen, true, 'Grund bei Ablehnung: ' + r.grund);
  assert.equal(r.typ, 'situation');
  assert.equal(r.ungeprueft, true, 'ein eingelassenes Modul zertifiziert niemanden (U2-ADR-145)');
  assert.equal(d.situationsModule.length, 1);
  V._situationsModuleAusDepotAnmelden(d);
  assert.equal(V.situationenAlle().length, 11, 'zehn eingebaute plus eine angedockte');
  assert.ok(V._situationIndexHalter()['test-notfall'], 'der Nachschlage-Index kennt die angedockte Situation');
});

test('[Anmeldung·Kollision] zwei Module mit derselben Situations-ID: das erste gewinnt, das zweite heißt doppelt — exakter Spiegel des Bereichs-Verhaltens', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.situationsModule = [
    { modulTyp: 'situation', moduleVersion: 1, herkunft: 'anbieter-a', sprache: 'de', situationen: { 'x-geteilt': { titel: 'Von A' } } },
    { modulTyp: 'situation', moduleVersion: 1, herkunft: 'anbieter-b', sprache: 'de', situationen: { 'x-geteilt': { titel: 'Von B' } } },
  ];
  V._situationsModuleAusDepotAnmelden(d);
  const alle = V.situationenAlle();
  const treffer = alle.filter((s) => s.id === 'x-geteilt');
  assert.equal(treffer.length, 1, 'nur eine Situation unter der geteilten ID');
  assert.equal(treffer[0].titel, 'Von A', 'die erste gewinnt');
  assert.ok(V.SITUATIONEN_MODUL_VERWORFEN.some((v) => v.id === 'x-geteilt' && v.grund === 'doppelt'));
});

test('[Anmeldung·Gegenprobe] fällt das Modul weg, verschwindet die Situation aus der Registry — und kehrt zurück', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.situationsModule = [NOTFALL_MODUL];
  V._situationsModuleAusDepotAnmelden(d);
  assert.equal(V.situationenAlle().length, 11);
  d.situationsModule = [];
  V._situationsModuleAusDepotAnmelden(d);
  assert.equal(V.situationenAlle().length, 10, 'zurück auf die zehn eingebauten');
  assert.equal(V._situationIndexHalter()['test-notfall'], undefined);
  d.situationsModule = [NOTFALL_MODUL];
  V._situationsModuleAusDepotAnmelden(d);
  assert.equal(V.situationenAlle().length, 11, 'zurück, sobald das Modul wieder da ist');
});

/* ══ Vorlagen-Übersetzung — situationseigenes Feld ═══════════════════════ */

test('[Übersetzung] ein Vorlagen-Feld mit `situation` statt `bereich` wird zu einer Situations-Felddefinition', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.situationsModule = [NOTFALL_MODUL];
  V._situationsModuleAusDepotAnmelden(d);
  const r = V._templateFeldZuModell(
    { feldname: 'Interner Kontakt', feldtyp: 'text', situation: 'test-notfall' },
    d.schemaVersion, [], 'test-anbieter');
  assert.ok(!r.verworfen, 'nicht verworfen: ' + JSON.stringify(r));
  assert.equal(r.def.situationId, 'test-notfall');
  assert.equal(r.def.feldId, 'tpl_interner_kontakt');
  assert.equal(r.def.sektorId, undefined, 'ein Situationsfeld trägt keine sektorId — genau eins von beiden (s. Kommentar am Übersetzer)');
});

test('[Übersetzung·rot] weder `bereich` noch `situation` gesetzt → verworfen, Grund `bereich`', () => {
  const { V } = ladeKern();
  const r = V._templateFeldZuModell({ feldname: 'Verwaist', feldtyp: 'text' }, 1, [], 'x');
  assert.equal(r.verworfen, true);
  assert.equal(r.grund, 'bereich');
});

test('[Übersetzung·rot] `situation` zeigt auf eine unbekannte ID (nicht angedockt, nicht eingebaut) → verworfen', () => {
  const { V } = ladeKern();
  const r = V._templateFeldZuModell({ feldname: 'x', feldtyp: 'text', situation: 'nie-angedockt' }, 1, [], 'x');
  assert.equal(r.verworfen, true);
  assert.equal(r.grund, 'bereich');
});

test('[Übersetzung] `_templateFelderUebersetzen` trennt Bereichs- und Situations-Felder in zwei Listen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.situationsModule = [NOTFALL_MODUL];
  V._situationsModuleAusDepotAnmelden(d);
  const tpl = {
    felder: [
      { feldname: 'Kammer', feldtyp: 'text', bereich: 'kanzlei-existiert-nicht' },  // wird verworfen (unbekannter Bereich)
      { feldname: 'Interner Kontakt', feldtyp: 'text', situation: 'test-notfall' },
    ],
  };
  const u = V._templateFelderUebersetzen(tpl, d.schemaVersion, [], 'test-anbieter');
  assert.equal(u.feldDefinitionen.length, 0);
  assert.equal(u.situationFeldDefinitionen.length, 1);
  assert.equal(u.situationFeldDefinitionen[0].situationId, 'test-notfall');
  assert.equal(u.verworfeneFelder.length, 1, 'die Bereichs-Zeile ist verworfen: ' + JSON.stringify(u.verworfeneFelder));
});

/* ══ Render — die zwei Stellen (Bildschirm + PDF-Modell) ═════════════════ */

async function angemeldetesNotfallDepot(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.situationsModule = [NOTFALL_MODUL];
  V._situationsModuleAusDepotAnmelden(d);
  const u = V._templateFelderUebersetzen(
    { felder: [{ feldname: 'Interner Kontakt', feldtyp: 'text', situation: 'test-notfall' }] },
    d.schemaVersion, [], 'test-anbieter');
  d.situationFeldDefinitionen = u.situationFeldDefinitionen;
  V.situationFeldSetzen('test-notfall', 'tpl_interner_kontakt', 'Herr Müller, 030-1234567');
  return d;
}

test('[Render Bildschirm] ein angedocktes situationseigenes Feld erscheint im eigenen Block „Vom Anbieter"', async () => {
  const { V, document } = ladeKern();
  await angemeldetesNotfallDepot(V);
  V.renderSituation('test-notfall');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Notfall-Kontakt'), 'Titel der angedockten Situation');
  assert.ok(html.includes(V.STRINGS.situationEigeneFelderBlock), 'eigener Block-Titel „Vom Anbieter"');
  assert.ok(html.includes('Interner Kontakt'), 'Label des angedockten Felds');
  assert.ok(html.includes('Herr Müller'), 'Wert des angedockten Felds — derselbe Speicherweg wie ein eingebautes eigenes Feld');
});

test('[Render Bildschirm] ohne angedockte Felder bleibt der Block „Vom Anbieter" weg', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.situationsModule = [NOTFALL_MODUL];
  V._situationsModuleAusDepotAnmelden(d);
  V.renderSituation('test-notfall');
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes(V.STRINGS.situationEigeneFelderBlock), 'kein leerer Block, wenn nichts angedockt wurde');
});

test('[Render PDF-Modell] situationModell zieht dasselbe angedockte Feld — derselbe Datenpfad wie renderSituation', async () => {
  const { V } = ladeKern();
  await angemeldetesNotfallDepot(V);
  const modell = V.situationModell('test-notfall');
  const alleZeilen = modell.bloecke.flatMap((b) => b.zeilen);
  assert.ok(alleZeilen.some((z) => z.label === 'Interner Kontakt' && z.wert === 'Herr Müller, 030-1234567'),
    'angedocktes Feld steht mit Beschriftung und Wert im PDF-Modell: ' + JSON.stringify(alleZeilen));
});
