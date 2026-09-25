'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-284 (05.09.2026) — Stellensatz: eine Bezugsstelle, die mit dem
   Rechtsraum reist, nicht mit der Sprache
   ────────────────────────────────────────────────────────────────────────
   Auslöser: Anforderungspapier „Neutrales Gerüst und Baukasten" (04.09.2026),
   §5 — drei Beispiele für Erklärtext im Bürgerdepot. Gemessen
   (Bericht „erklaertext-als-ein-andockbarer-eintrag-2026-09-05", nicht im
   Repo): Bedingung/Frist/Text docken bereits an, eine strukturierte
   Bezugsstelle fehlte. `institutionsArt` geprüft und verworfen (eigene Achse,
   eigener Kommentar an der Konstante: „deutsch, nicht allgemein").

   Rot-Beweis-Pflicht (A348 Zug 4): [Negativprobe]/[Gegenprobe] markiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[U2-ADR-284] STELLENSATZ_RECHTSRAUM_EINGEBAUT ist DE, wie bei Textsatz/Rechtsraum-Modul', () => {
  const { V } = ladeKern();
  assert.equal(V.STELLENSATZ_RECHTSRAUM_EINGEBAUT, 'DE');
});

test('[U2-ADR-284] STELLENSATZ_EINGEBAUT ist leer — Struktur vor Inhalt, kein erfundener Rechtsinhalt', () => {
  const { V } = ladeKern();
  assert.deepEqual(Object.keys(V.STELLENSATZ_EINGEBAUT), []);
});

test('[U2-ADR-284] stellensatzModulPruefen verwirft kein Objekt', () => {
  const { V } = ladeKern();
  assert.equal(V.stellensatzModulPruefen(null).gueltig, false);
  assert.equal(V.stellensatzModulPruefen(null).grund, 'kein-objekt');
});

test('[U2-ADR-284] stellensatzModulPruefen verwirft leeren/fehlenden Rechtsraum', () => {
  const { V } = ladeKern();
  assert.equal(V.stellensatzModulPruefen({}).grund, 'rechtsraum');
  assert.equal(V.stellensatzModulPruefen({ rechtsraum: '  ' }).grund, 'rechtsraum');
});

test('[U2-ADR-284·Negativprobe] stellensatzModulPruefen weist "DE" als reserviert zurück', () => {
  const { V } = ladeKern();
  const r = V.stellensatzModulPruefen({ rechtsraum: 'DE', moduleVersion: 1, stellen: { x: 'y' } });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'reserviert');
});

test('[U2-ADR-284·Gegenprobe] ein nicht-deutscher Rechtsraum bleibt zulässig', () => {
  const { V } = ladeKern();
  const r = V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 1, stellen: {} });
  assert.notEqual(r.grund, 'reserviert');
});

test('[U2-ADR-284] stellensatzModulPruefen verwirft ungültige moduleVersion', () => {
  const { V } = ladeKern();
  assert.equal(V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 0, stellen: {} }).grund, 'moduleVersion');
  assert.equal(V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 1.5, stellen: {} }).grund, 'moduleVersion');
});

test('[U2-ADR-284] stellensatzModulPruefen verwirft fehlendes/falsches stellen-Objekt', () => {
  const { V } = ladeKern();
  assert.equal(V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 1 }).grund, 'stellen');
  assert.equal(V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 1, stellen: 'x' }).grund, 'stellen');
});

test('[U2-ADR-284·Negativprobe] eine erfundene Kennung wird verworfen — Modul bleibt trotzdem gültig', () => {
  const { V } = ladeKern();
  const r = V.stellensatzModulPruefen({ rechtsraum: 'CH', moduleVersion: 1, stellen: { 'voellig.erfunden.xyz': 'Foo' } });
  assert.equal(r.gueltig, true);
  assert.deepEqual(Object.keys(r.stellen), []);
  assert.equal(r.verworfene.length, 1);
  assert.equal(r.verworfene[0].grund, 'unbekannt');
});

test('[U2-ADR-284·Negativprobe] ein leerer/kein-String-Wert wird verworfen', () => {
  const { V } = ladeKern();
  const r = V.stellensatzModulPruefen({ rechtsraum: 'CH', moduleVersion: 1, stellen: { 'identity.dateOfSeparation': '  ' } });
  assert.equal(r.verworfene[0].grund, 'keine-stelle');
});

test('[U2-ADR-284·Gegenprobe] eine reale native Feld-Kennung (Label-Namensraum) wird angenommen', () => {
  const { V } = ladeKern();
  // "identity.dateOfSeparation" hat ein echtes '.label' in AB_WERK_TEXTSATZ_DE (STAND 05.09.2026) —
  // dieselbe Kennung, die das Feld für sein eigenes Label trägt.
  const r = V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 1, stellen: { 'identity.dateOfSeparation': 'Caisse Test' } });
  assert.equal(r.gueltig, true);
  assert.equal(r.stellen['identity.dateOfSeparation'], 'Caisse Test');
  assert.deepEqual(r.verworfene, []);
});

test('[U2-ADR-284·Gegenprobe] eine gedockte Feld-Kennung (tpl_-Namensraum) wird ebenfalls angenommen', () => {
  const { V } = ladeKern();
  // Dieselbe Form wie _MODULFELD_KENNUNG: <bereichId>.tpl_<feld>.label — Stelle teilt sich den
  // Namensraum mit dem Label, kein eigener.
  const r = V.stellensatzModulPruefen({ rechtsraum: 'FR', moduleVersion: 1, stellen: { 'gesundheit.tpl_meinfeld.label': 'Caisse Docked' } });
  assert.equal(r.gueltig, true);
  assert.equal(r.stellen['gesundheit.tpl_meinfeld.label'], 'Caisse Docked');
});

test('[U2-ADR-284] stellensatzModulEinbetten verwaltet eine ROHE Liste, wie textsatzModulEinbetten/_rechtsraumModulEinbetten', () => {
  const { V } = ladeKern();
  const v1 = V.stellensatzModulEinbetten([], { rechtsraum: 'FR', moduleVersion: 1, stellen: { a: 'eins' } });
  assert.equal(v1.length, 1);
  assert.equal(v1[0].moduleVersion, 1);
  const v2 = V.stellensatzModulEinbetten(v1, { rechtsraum: 'FR', moduleVersion: 2, stellen: { a: 'zwei' } });
  assert.equal(v2.length, 1, 'dieselbe Rechtsraum-Kennung ersetzt den Eintrag, statt ihn zu verdoppeln');
  assert.equal(v2[0].moduleVersion, 2);
  const v3 = V.stellensatzModulEinbetten(v2, { rechtsraum: 'FR', moduleVersion: 1, stellen: { a: 'alt' } });
  assert.equal(v3[0].moduleVersion, 2, 'eine ältere Fassung darf nichts ändern');
  const v4 = V.stellensatzModulEinbetten(v3, { rechtsraum: 'CH', moduleVersion: 1, stellen: { a: 'schweiz' } });
  assert.equal(v4.length, 2, 'ein anderer Rechtsraum steht daneben, nicht darüber');
});

test('[U2-ADR-284] stelleLesen liefert null ohne aktiven Rechtsraum und ohne angedocktes Modul', () => {
  const { V } = ladeKern();
  V.setData({ rechtsraum: '' });
  assert.equal(V.stelleLesen('identity.dateOfSeparation'), null);
});

test('[U2-ADR-284] _stellensatzModuleAusDepotAnmelden hebt ein gültiges Modul in die Registry', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'stellensatz', rechtsraum: 'FR', moduleVersion: 1,
    stellen: { 'identity.dateOfSeparation': 'Caisse Test' } };
  V.setData({ stellensatzModule: [modul], rechtsraum: 'FR' });
  const n = V._stellensatzModuleAusDepotAnmelden();
  assert.equal(n, 1);
  assert.equal(V.getStellensatzModulRegistry().FR.stellen['identity.dateOfSeparation'], 'Caisse Test');
});

test('[U2-ADR-284·Negativprobe] _stellensatzModuleAusDepotAnmelden überspringt ein ungültiges Modul, ohne zu werfen', () => {
  const { V } = ladeKern();
  const kaputt = { modulTyp: 'stellensatz', rechtsraum: 'DE', moduleVersion: 1, stellen: { x: 'y' } };
  V.setData({ stellensatzModule: [kaputt] });
  const n = V._stellensatzModuleAusDepotAnmelden();
  assert.equal(n, 0);
  // Object.create(null) aus dem Sandbox-Realm ist nie deepStrictEqual zu {} — Schlüsselzahl
  // statt Objektidentität prüfen (feedback_vm_sandbox_arrays_deepstrictequal).
  assert.deepEqual(Object.keys(V.getStellensatzModulRegistry()), []);
});

test('[U2-ADR-284] stelleLesen liefert die angedockte Stelle, wenn ihr Rechtsraum aktiv ist', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'stellensatz', rechtsraum: 'FR', moduleVersion: 1,
    stellen: { 'identity.dateOfSeparation': 'Caisse Test' } };
  V.setData({ stellensatzModule: [modul], rechtsraum: 'FR' });
  V._stellensatzModuleAusDepotAnmelden();
  assert.equal(V.stelleLesen('identity.dateOfSeparation'), 'Caisse Test');
});

test('[U2-ADR-284·Gegenprobe] dieselbe angedockte Stelle bleibt stumm, wenn ein ANDERER Rechtsraum aktiv ist', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'stellensatz', rechtsraum: 'FR', moduleVersion: 1,
    stellen: { 'identity.dateOfSeparation': 'Caisse Test' } };
  V.setData({ stellensatzModule: [modul], rechtsraum: 'CH' });
  V._stellensatzModuleAusDepotAnmelden();
  assert.equal(V.stelleLesen('identity.dateOfSeparation'), null);
});

test('[U2-ADR-284] _stelleFuerFeld liefert null ohne fristRegel', () => {
  const { V } = ladeKern();
  assert.equal(V._stelleFuerFeld({ id: 'x', typ: 'text' }), null);
});

test('[U2-ADR-284] _stelleFuerFeld liefert null, wenn fristRegel keine stelle nennt', () => {
  const { V } = ladeKern();
  assert.equal(V._stelleFuerFeld({ id: 'x', typ: 'datum', fristRegel: { dauer: 'P1M' } }), null);
});

test('[U2-ADR-284] Frist und Stelle sind EIN Eintrag: dieselbe fristRegel speist beide Anzeigen', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'stellensatz', rechtsraum: 'FR', moduleVersion: 1,
    stellen: { 'identity.dateOfSeparation': 'Caisse Test' } };
  V.setData({ stellensatzModule: [modul], rechtsraum: 'FR' });
  V._stellensatzModuleAusDepotAnmelden();
  const feld = { id: 'dateOfSeparation', typ: 'datum',
    fristRegel: { dauer: 'P1M', quelle: 'Test-Paragraf', stelle: 'identity.dateOfSeparation' } };
  const heute = new Date('2026-09-05T00:00:00Z');
  const fristText = V._fristHinweisFuerFeld(feld, { dateOfSeparation: '2026-08-01' }, null, heute);
  const stelle = V._stelleFuerFeld(feld);
  assert.match(fristText, /2026-09-01/);
  assert.equal(stelle, 'Caisse Test');
});

test('[U2-ADR-284] ein gedocktes Feld reicht fristRegel.stelle durch _templateFeldZuModell durch', () => {
  const { V } = ladeKern();
  const g = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'datum',
    fristRegel: { dauer: 'P1M', quelle: 'Test', stelle: 'identity.dateOfSeparation' } };
  const r = V._templateFeldZuModell(g, V.APP_SCHEMA_VERSION || 78, null, 'kammer/test');
  assert.equal(r.def.fristRegel.dauer, 'P1M');
  assert.equal(r.def.fristRegel.stelle, 'identity.dateOfSeparation',
    'ohne diese Zeile würde ein gedocktes Feld seine Bezugsstelle stillschweigend verlieren');
});

test('[U2-ADR-284·Gegenprobe] ein gedocktes Feld ohne stelle bekommt auch keine — kein erfundener Wert', () => {
  const { V } = ladeKern();
  const g = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'datum',
    fristRegel: { dauer: 'P1M', quelle: 'Test' } };
  const r = V._templateFeldZuModell(g, V.APP_SCHEMA_VERSION || 78, null, 'kammer/test');
  assert.equal(Object.prototype.hasOwnProperty.call(r.def.fristRegel, 'stelle'), false);
});

test('[U2-ADR-284] EINLASS_REGISTER führt "stellensatz" als eigenen Eintrag', () => {
  const { V } = ladeKern();
  const eintrag = V.EINLASS_REGISTER.find((r) => r.typ === 'stellensatz');
  assert.ok(eintrag, 'kein Eintrag "stellensatz" in EINLASS_REGISTER gefunden');
  assert.equal(eintrag.slot, 'stellensatzModule');
});

test('[U2-ADR-284] modulEinlassen nimmt ein gültiges Stellensatz-Modul über den echten Weg an', () => {
  const { V } = ladeKern();
  const data = { stellensatzModule: [] };
  const roh = JSON.stringify({ modulTyp: 'stellensatz', rechtsraum: 'FR', moduleVersion: 1,
    stellen: { 'identity.dateOfSeparation': 'Caisse Test' } });
  const r = V.modulEinlassen(roh, data);
  assert.equal(r.angenommen, true, JSON.stringify(r));
  assert.equal(data.stellensatzModule.length, 1);
});

test('[U2-ADR-284·Negativprobe] modulEinlassen weist "DE" über denselben Weg zurück wie Textsatz/Rechtsraum', () => {
  const { V } = ladeKern();
  const data = { stellensatzModule: [] };
  const roh = JSON.stringify({ modulTyp: 'stellensatz', rechtsraum: 'DE', moduleVersion: 1, stellen: { x: 'y' } });
  const r = V.modulEinlassen(roh, data);
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'reserviert');
});
