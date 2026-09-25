'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Schnitt Glied 6 (23.08.2026, A492 „1.4b", U2-ADR-164) — Modul-Beschriftungen je
   Sprache
   ────────────────────────────────────────────────────────────────────────────
   Produktentscheidung (22.08.2026, Ergebnisblatt „Fünfundzwanzig v1-
   Einstufungen", Bündel 3): „Ein Modul bringt seine Beschriftungen je Sprache mit
   — Textsätze stapeln NICHT." Ein Feld-Definitions-Name (`feldname` in der
   Einreichung, `label` im Feld-Modell) darf jetzt Sprachvarianten tragen:
   `{sprache: text, ...}`. `label` selbst bleibt ein stabiler String — über zwanzig
   Lesestellen im Kern lesen ihn direkt, keine davon muss Sprachvarianten kennen.
   Die Varianten liegen additiv an `def.beschriftungen`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ══ Die Form-Probe ═══════════════════════════════════════════════════════ */

test('[Glied6·Form] _istSprachvariantenObjekt erkennt gültige Sprachvarianten und weist Unsinn ab', () => {
  const { V } = ladeKern();
  assert.equal(V._istSprachvariantenObjekt({ de: 'Lagerort', hu: 'Raktár' }), true);
  assert.equal(V._istSprachvariantenObjekt({}), false, 'leer ist keine Variante');
  assert.equal(V._istSprachvariantenObjekt('Lagerort'), false, 'ein String ist keine Sprachvarianten-Form');
  assert.equal(V._istSprachvariantenObjekt(['Lagerort']), false, 'ein Array ist keine Sprachvarianten-Form');
  assert.equal(V._istSprachvariantenObjekt({ 'DE': 'Lagerort' }), false, 'Grossbuchstaben-Schlüssel: keine gültige BCP-47-Form hier');
  assert.equal(V._istSprachvariantenObjekt({ de: '' }), false, 'ein leerer Wert verwirft die ganze Form');
  assert.equal(V._istSprachvariantenObjekt({ de: 123 }), false, 'ein Nicht-String-Wert verwirft die ganze Form');
});

test('[Glied6·Form] _sprachvarianteRepraesentativ liefert die erste Variante deterministisch', () => {
  const { V } = ladeKern();
  assert.equal(V._sprachvarianteRepraesentativ({ hu: 'Raktár', de: 'Lagerort' }), 'Raktár', 'erste Schlüssel-Reihenfolge, nicht alphabetisch');
  assert.equal(V._sprachvarianteRepraesentativ('Lagerort'), 'Lagerort', 'ein String bleibt sich selbst');
  assert.equal(V._sprachvarianteRepraesentativ({}), '', 'nichts Brauchbares -> leerer String, nicht erfunden');
});

/* ══ Der Torwächter (validateTemplate) ════════════════════════════════════ */

function feldMitName(feldname) {
  return { feldname, feldtyp: 'text', pflicht: false, bereich: 'housing' };
}

test('[Glied6·Torwächter] ein feldname als Sprachvarianten-Objekt kommt durch', () => {
  const { V } = ladeKern();
  const tpl = { felder: [feldMitName({ de: 'Lagerort', hu: 'Raktár' })] };
  assert.equal(V.validateTemplate(tpl), null, 'ROT ERWARTET, wenn falsch: ein gültiges Sprachvarianten-Objekt wird abgelehnt');
});

test('[Glied6·Torwächter·Rot-Beweis] ein feldname, der weder String noch gültige Sprachvarianten ist, wird abgewiesen', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [feldMitName({})] }), 'feldname fehlt', 'leeres Objekt ist keine Sprachvarianten-Form');
  assert.equal(V.validateTemplate({ felder: [feldMitName({ DE: 'Lagerort' })] }), 'feldname fehlt', 'Grossbuchstaben-Schlüssel fällt durch');
  assert.equal(V.validateTemplate({ felder: [feldMitName(42)] }), 'feldname fehlt', 'eine Zahl ist kein feldname');
  assert.equal(V.validateTemplate({ felder: [feldMitName('')] }), 'feldname fehlt', 'ein leerer String bleibt abgewiesen — keine Regression');
});

test('[Glied6·Torwächter] eine zu lange Sprachvariante wird wie ein zu langer String abgewiesen', () => {
  const { V } = ladeKern();
  const lang = 'x'.repeat(400);
  assert.equal(V.validateTemplate({ felder: [feldMitName({ de: lang })] }), 'feldname zu lang');
});

/* ══ Der Übersetzer (_templateFeldZuModell / _templateFelderUebersetzen) ══ */

test('[Glied6·Übersetzer] ein Sprachvarianten-feldname wird zu label (repräsentativ) + beschriftungen (voll)', () => {
  const { V } = ladeKern();
  const { feldDefinitionen, verworfeneFelder } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ hu: 'Raktár', de: 'Lagerort' })] }, 73, {}, 'kammer-hu');
  assert.deepEqual(verworfeneFelder, []);
  assert.equal(feldDefinitionen.length, 1);
  const def = feldDefinitionen[0];
  assert.equal(def.label, 'Raktár', 'label ist die REPRÄSENTATIVE (erste) Variante, ein stabiler String');
  assert.deepEqual(def.beschriftungen, { hu: 'Raktár', de: 'Lagerort' }, 'die volle Form reist zusätzlich mit');
  assert.equal(typeof def.label, 'string', 'ROT ERWARTET, wenn falsch: label ist NIE ein Objekt — das wäre der Umbau, den man ausdrücklich nicht wollte');
});

test('[Glied6·Übersetzer] ein gewöhnlicher String-feldname bleibt unverändert — kein beschriftungen-Schlüssel', () => {
  const { V } = ladeKern();
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName('Lagerort')] }, 73, {}, 'kammer-de');
  assert.equal(feldDefinitionen[0].label, 'Lagerort');
  assert.equal('beschriftungen' in feldDefinitionen[0], false, 'additiv heisst additiv — kein Bestandswert bekommt einen neuen Schlüssel ohne Grund');
});

test('[Glied6·Übersetzer] die Feld-ID entsteht aus der repräsentativen Variante, nicht aus „[object Object]"', () => {
  const { V } = ladeKern();
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ de: 'Lagerort' })] }, 73, {}, 'kammer-de');
  assert.ok(!feldDefinitionen[0].feldId.includes('object'),
    'ROT ERWARTET, wenn falsch: String(objekt) würde "tpl_object_object" erzeugen — der frühere Fehler, den dieser Bau verhindert');
  assert.ok(feldDefinitionen[0].feldId.startsWith('tpl_'));
});

/* ══ Der Anzeigepfad (_templateDefAlsFeld / _templateLabelAktiv) ══════════ */

test('[Glied6·Anzeige] die zur aktiven Sprache passende Variante erscheint auf dem Blatt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('glied6-pw');
  V.akteurSelbstErklaeren('Testerin');
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ de: 'Lagerort', hu: 'Raktár' })] }, 73, {}, 'kammer-hu');
  const d = V.getData();
  d.feldDefinitionen = feldDefinitionen;
  d.textsprache = 'hu';
  V.setData(d);
  const feld = V._templateDefAlsFeld(feldDefinitionen[0]);
  assert.equal(feld.label, 'Raktár', 'ROT ERWARTET, wenn falsch: die ungarische Variante muss erscheinen, nicht der Standardwert');
});

test('[Glied6·Anzeige] ohne passende Variante gilt der stabile label-Standardwert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('glied6-pw');
  V.akteurSelbstErklaeren('Testerin');
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ de: 'Lagerort', hu: 'Raktár' })] }, 73, {}, 'kammer-hu');
  const d = V.getData();
  d.feldDefinitionen = feldDefinitionen;
  d.textsprache = 'fr';   // weder de noch hu
  V.setData(d);
  const feld = V._templateDefAlsFeld(feldDefinitionen[0]);
  assert.equal(feld.label, feldDefinitionen[0].label, 'kein Raten in eine dritte Sprache — der Standardwert gilt');
});

test('[Glied6·Anzeige] ein angedockter TEXTSATZ hat weiterhin Vorrang vor der Modul-eigenen Variante', async () => {
  // Dieselbe Reihenfolge wie überall (_templateFeldText, A478): die Bürgerin selbst (via
  // angedocktem Textsatz) geht vor dem, was das Modul mitbringt.
  const { V } = ladeKern();
  await V.depotAnlegen('glied6-pw');
  V.akteurSelbstErklaeren('Testerin');
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ de: 'Lagerort', hu: 'Raktár' })] }, 73, {}, 'kammer-hu');
  const d = V.getData();
  d.feldDefinitionen = feldDefinitionen;
  d.textsprache = 'hu';
  d.textsatzModule = V.textsatzModulEinbetten([], { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'hu',
    texte: { [feldDefinitionen[0].sektorId + '.' + feldDefinitionen[0].feldId + '.label']: 'Bürgerin-Übersetzung' } });
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  const feld = V._templateDefAlsFeld(feldDefinitionen[0]);
  assert.equal(feld.label, 'Bürgerin-Übersetzung', 'ein angedockter Textsatz gewinnt weiterhin, auch gegen die Modul-eigene Variante');
});

/* ══ Zwanzig unveränderte Lesestellen — die Auflage, die den Bau motiviert ══ */

test('[Glied6·Rückwärtskompatibilität] def.label bleibt IMMER ein String — jede bestehende Lesestelle bleibt unverändert', async () => {
  const { V } = ladeKern();
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ de: 'Lagerort', hu: 'Raktár' })] }, 73, {}, 'kammer-hu');
  const def = feldDefinitionen[0];
  // Repräsentative Stichprobe der zwanzig Lesestellen: blattVorschlaege liest def.label direkt.
  await V.depotAnlegen('glied6-pw');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.feldDefinitionen = [Object.assign({}, def, { blattVorschlag: null })];
  V.setData(d);
  assert.equal(typeof def.label, 'string');
  assert.doesNotThrow(() => V.blattVorschlaege(d), 'eine Stelle, die def.label ohne Sprachbewusstsein liest, darf nicht brechen');
});

/* ══ Export-Transparenz (_angedockteBeschriftungenFuerExport, A496) ══════ */

test('[Glied6·Export] die Voll-Export-Beschriftung zeigt die Modul-eigene Variante, wenn kein Textsatz greift', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('glied6-pw');
  V.akteurSelbstErklaeren('Testerin');
  const { feldDefinitionen } = V._templateFelderUebersetzen(
    { felder: [feldMitName({ de: 'Lagerort', hu: 'Raktár' })] }, 73, {}, 'kammer-hu');
  const d = V.getData();
  d.feldDefinitionen = feldDefinitionen;
  d.textsprache = 'hu';
  V.setData(d);
  const ex = V.vollExportJSON();
  const block = ex._angedockteBeschriftungen;
  assert.ok(block, 'ROT ERWARTET, wenn falsch: der Export muss den Beschriftungs-Block tragen');
  const eintrag = block.eintraege.find((e) => e.rohSchluessel === feldDefinitionen[0].sektorId + '.' + feldDefinitionen[0].feldId);
  assert.ok(eintrag, 'Eintrag fehlt: ' + JSON.stringify(block.eintraege));
  assert.equal(eintrag.uebersetzteBeschriftung, 'Raktár', 'der Export berichtet die Modul-eigene Variante, nicht den rohen Standardwert');
  assert.equal(eintrag.rohesLabel, feldDefinitionen[0].label, 'der rohe Name bleibt unverändert daneben stehen');
  assert.equal(eintrag.sprache, 'hu');
});
