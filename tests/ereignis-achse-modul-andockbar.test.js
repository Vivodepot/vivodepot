'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-251 · Ereignis-Achse wird andockbar — das zehnte Einlass-Register
   ────────────────────────────────────────────────────────────────────────
   Paket 2b des Gerüst-Umbaus (Konzept 03.09.2026, Nachtrag 04.09.2026):
   vor diesem ADR war EREIGNIS_ACHSE_FELDER vollständig hartcodiert, kein
   Registry-Gegenstück existierte.

   WÖRTLICHER SPIEGEL von `tests/wizards-modul-andockbar.test.js`
   (U2-ADR-250, das neunte Register) — dieselbe Bauart, auf die
   Ereignis-Achse übertragen: Registry (`_EREIGNIS_ACHSE_MODUL_REGISTRY`) ·
   Prüfer (`ereignisAchseModulPruefen`) · Anmeldung
   (`_ereignisAchseModuleAusDepotAnmelden`) · Merge
   (`ereignisAchseFelderAlle`) · Einbetten (`ereignisAchseModulEinbetten`) ·
   EINLASS_REGISTER-Eintrag `ereignisAchse`.

   ZWEI STÜCKE OHNE VORBILD, weil die Ereignis-Achse anders geformt ist als
   Bereich/Situation/Assistent — s. ausführlicher Kopfkommentar bei
   `ereignisAchseModulPruefen` im Kern:
     - kein natürliches Einzel-Schlüssel-Feld — ein Modul liefert
       `eintraege: [...]` als ARRAY, Duplikate INNERHALB eines Moduls
       werden hier ausdrücklich geprüft (`grund:'doppelt-im-modul'`),
       weil ein Array sie nicht strukturell ausschließt;
     - keine Sprachpflicht — ein Eintrag trägt nie menschenlesbaren Text.

   NACHTRAG (Paket 3, Commit A, U2-ADR-253): zum Landungszeitpunkt hier noch
   NICHT TEIL DIESES PAKETS — kein bestehender Aufrufer (`_ereignisArten
   FuerUnterfeld` u. a.) las `ereignisAchseFelderAlle()`, bewiesen an einem
   künstlichen Test-Modul, die 33 eingebauten Einträge blieben vollständig
   nativ. Das Umstellen war als „vier echte Aufrufer" benannt — tatsächlich
   waren es sechs (Zensus, 04.09.2026, korrigiert in
   tests/paket3-commitA-entkopplung.test.js). Alle sechs lesen inzwischen
   `ereignisAchseFelderAlle()`. Der Browser-Beweis unten testete zum
   Landungszeitpunkt bewusst nur, dass die damals vier BEKANNTEN Aufrufer die
   native Kette überleben — dieser Befund bleibt richtig, nur die Zahl war
   zu niedrig.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const NOTFALL_MODUL = {
  modulTyp: 'ereignisAchse', moduleVersion: 1, herkunft: 'test-anbieter',
  eintraege: [
    { sektorId: 'identity', feldId: 'x_notfall_test_feld', ereignisse: ['geburt', 'tod'] },
  ],
};

/* ══ Register, Prüfer, Anmeldung ═══════════════════════════════════════ */

test('[Register] der Einlassweg führt ein zehntes Register, es heißt ereignisAchse', () => {
  const { V } = ladeKern();
  const typen = V.EINLASS_REGISTER.map((r) => r.typ);
  assert.ok(typen.includes('ereignisAchse'), 'Register vorhanden: ' + typen.join(','));
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'ereignisAchse');
  assert.equal(reg.slot, 'ereignisAchseModule');
  assert.equal(reg.kennung(NOTFALL_MODUL), 'test-anbieter', 'die Kennung ist die Herkunft, nicht ein Tripel');
});

test('[Migrationsstufe] legt den Slot an — und schreibt nichts um', () => {
  const { V } = ladeKern();
  const alt = Object.assign(V.leeresDepot(), { schemaVersion: 77 });
  delete alt.ereignisAchseModule;
  alt.situationen.geburt = { klinik: 'Klinikum München' };
  const neu = V.depotNormalisieren(alt);
  assert.deepEqual(neu.ereignisAchseModule, [], 'Slot angelegt und LEER');
  assert.ok(neu.schemaVersion >= 78, 'mindestens bis 78 gestiegen: ' + neu.schemaVersion);
  assert.equal(neu.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(neu.situationen.geburt.klinik, 'Klinikum München', 'kein Bestandswert angefasst');
});

test('[Prüfer] ein Eintrag mit unauflösbarer sektorId wird benannt verworfen — weder Sektor noch Situation', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'x',
    eintraege: [{ sektorId: 'nie-existiert', feldId: 'x', ereignisse: ['tod'] }],
  });
  assert.equal(g.gueltig, false);
  assert.ok(g.verworfene.some((v) => v.sektorId === 'nie-existiert' && v.grund === 'ziel'));
});

test('[Prüfer] sektorId löst über eine SITUATION genauso auf wie über einen Sektor — nativ schon so (geburt/erbfall)', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'x',
    eintraege: [{ sektorId: 'geburt', feldId: 'x-situationsfeld', ereignisse: ['tod'] }],
  });
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund);
  assert.equal(g.eintraege[0].sektorId, 'geburt');
});

test('[Prüfer·rot] ohne moduleVersion, ohne Herkunft, ohne eintraege-Array gibt es kein Modul', () => {
  const { V } = ladeKern();
  assert.equal(V.ereignisAchseModulPruefen(null).grund, 'kein-objekt');
  assert.equal(V.ereignisAchseModulPruefen({ herkunft: 'x', eintraege: [] }).grund, 'moduleVersion');
  assert.equal(V.ereignisAchseModulPruefen({ moduleVersion: 1, eintraege: [] }).grund, 'herkunft');
  assert.equal(V.ereignisAchseModulPruefen({ moduleVersion: 1, herkunft: 'x' }).grund, 'eintraege');
});

test('[Prüfer·rot] ein Eintrag mit unbekannter Ereignis-Art wird verworfen — geschlossener Katalog', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'x',
    eintraege: [{ sektorId: 'identity', feldId: 'x', ereignisse: ['erfundene-art'] }],
  });
  assert.equal(g.gueltig, false);
  assert.ok(g.verworfene.some((v) => v.grund === 'ereignisse'));
});

test('[Prüfer] ein `ausgenommen`-Eintrag ist gültig ohne ereignisse', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'x',
    eintraege: [{ sektorId: 'identity', feldId: 'x', ausgenommen: 'Kontaktfeld, keine Vollmacht' }],
  });
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund);
  assert.equal(g.eintraege[0].ausgenommen, 'Kontaktfeld, keine Vollmacht');
  assert.equal(g.eintraege[0].ereignisse, undefined);
});

test('[Prüfer·rot] dasselbe Tripel zweimal IM SELBEN Modul wird benannt verworfen — Array schließt Duplikate nicht strukturell aus', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'x',
    eintraege: [
      { sektorId: 'identity', feldId: 'x', unterFeldId: 'y', ereignisse: ['tod'] },
      { sektorId: 'identity', feldId: 'x', unterFeldId: 'y', ereignisse: ['geburt'] },
    ],
  });
  assert.equal(g.gueltig, true, 'der erste Eintrag bleibt gültig, nur der zweite wird verworfen');
  assert.equal(g.eintraege.length, 1);
  assert.equal(g.eintraege[0].ereignisse[0], 'tod', 'der erste im Modul gewinnt');
  assert.ok(g.verworfene.some((v) => v.grund === 'doppelt-im-modul'));
});

test('[Sprache] ein Ereignis-Achse-Modul OHNE sprache ist gültig — keine Sprachpflicht, kein menschenlesbarer Text', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen(NOTFALL_MODUL);
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund
    + ' — _modulTraegtBeschriftung braucht KEINEN ereignisAchse-Zweig, geprüft nicht angenommen');
});

test('[Anmeldung] eingelassen wirkt: der Eintrag steht in der Liste', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const r = V.modulEinlassen(JSON.stringify(NOTFALL_MODUL), d);
  assert.equal(r.angenommen, true, 'Grund bei Ablehnung: ' + r.grund);
  assert.equal(r.typ, 'ereignisAchse');
  assert.equal(r.ungeprueft, true, 'ein eingelassenes Modul zertifiziert niemanden (U2-ADR-145)');
  assert.equal(d.ereignisAchseModule.length, 1);
  V._ereignisAchseModuleAusDepotAnmelden(d);
  assert.equal(V.ereignisAchseFelderAlle().length, Object.keys(V.EREIGNIS_ACHSE_FELDER).length + 1);
});

test('[Anmeldung·Kollision] zwei Module mit demselben Tripel: das erste gewinnt, das zweite heißt doppelt — exakter Spiegel des Assistenten-/Situations-/Bereichs-Verhaltens', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const basis = (herkunft, art) => ({
    modulTyp: 'ereignisAchse', moduleVersion: 1, herkunft,
    eintraege: [{ sektorId: 'identity', feldId: 'x-geteilt', ereignisse: [art] }],
  });
  d.ereignisAchseModule = [basis('anbieter-a', 'geburt'), basis('anbieter-b', 'tod')];
  V._ereignisAchseModuleAusDepotAnmelden(d);
  const alle = V.ereignisAchseFelderAlle();
  const treffer = alle.filter((e) => e.sektorId === 'identity' && e.feldId === 'x-geteilt');
  assert.equal(treffer.length, 1, 'nur ein Eintrag unter dem geteilten Tripel');
  assert.equal(treffer[0].ereignisse[0], 'geburt', 'der erste gewinnt');
  assert.ok(V.EREIGNIS_ACHSE_MODUL_VERWORFEN.some((v) => v.sektorId === 'identity' && v.feldId === 'x-geteilt' && v.grund === 'doppelt'));
});

test('[Anmeldung·Gegenprobe] fällt das Modul weg, verschwindet der Eintrag aus der Registry — und kehrt zurück', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const basisZahl = Object.keys(V.EREIGNIS_ACHSE_FELDER).length;
  d.ereignisAchseModule = [NOTFALL_MODUL];
  V._ereignisAchseModuleAusDepotAnmelden(d);
  assert.equal(V.ereignisAchseFelderAlle().length, basisZahl + 1);
  d.ereignisAchseModule = [];
  V._ereignisAchseModuleAusDepotAnmelden(d);
  assert.equal(V.ereignisAchseFelderAlle().length, basisZahl, 'zurück auf die eingebauten');
  d.ereignisAchseModule = [NOTFALL_MODUL];
  V._ereignisAchseModuleAusDepotAnmelden(d);
  assert.equal(V.ereignisAchseFelderAlle().length, basisZahl + 1, 'zurück, sobald das Modul wieder da ist');
});

test('[Gegenprobe] Sektoren/Situationen/Assistenten bleiben von diesem Register unberührt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  const sektorenVorher = Object.keys(V.SEKTOREN).length;
  const situationenVorher = V.situationenAlle().length;
  const wizardsVorher = V.wizardsAlle().length;
  d.ereignisAchseModule = [NOTFALL_MODUL];
  V._ereignisAchseModuleAusDepotAnmelden(d);
  assert.equal(Object.keys(V.SEKTOREN).length, sektorenVorher);
  assert.equal(V.situationenAlle().length, situationenVorher);
  assert.equal(V.wizardsAlle().length, wizardsVorher);
});
