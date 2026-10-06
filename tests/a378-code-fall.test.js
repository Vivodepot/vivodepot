'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A378 — der Code-Fall: wenn eine Anfrage ein codiertes Feld verlangt
   (Auftrag vom 20.08.2026, setzt Auftrag 7 und 8 voraus)
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND, der die Sofortmeldung ausgelöst hat: ein Chip MIT Code, ein
   Freitext-Chip und ein Chip mit einem Code aus einem FREMDEN System waren im
   Antwort-Datensatz ununterscheidbar — dreimal derselbe String, `fehlend: 0`,
   und nichts sagte, ob eine Codierung dahinterstand. Der Code fiel auf dem Weg
   nach draussen weg.

   Es ging nichts FALSCHES hinaus. Es ging WENIGER hinaus, als die Anfrage
   verlangt hatte, und nichts sagte es — dieselbe Klasse wie die stille
   Teilantwort aus Auftrag 7, nur eine Ebene tiefer: nicht das Feld fehlt,
   sondern seine Form.

   DER PRÜFSTOFF ist `tests/fixtures/kammer-codeliste.js` — er entstand für
   diesen Auftrag, weil es keinen gab.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');
const { KAMMER_FELDER, KAMMER_CODELISTE, SNOMED_URI, FREMDES_SYSTEM_URI } = require('./fixtures/kammer-codeliste.js');

const GEN = ladeGenerator().V;
const PW = 'a378-pw';

function anfrage(kennung) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Ärztekammer Berlin',
    zweck: 'Vorbereitung einer Untersuchung', grundlage: '§ 630f BGB',
    vorgang: 'AK-2026-1', gueltigBis: '2099-12-31',
    felder: [{ kennung, zweck: 'Vermeidung von Zwischenfällen', pflicht: true }],
    antwort: { art: 'einmalpasswort' } };
}
async function depotMitChip(chip) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', Array.isArray(chip) ? chip : [chip]);
  return V;
}

/* ══ Zug 1 — der Prüfstoff, der fehlte ════════════════════════════════════ */

test('[A378 · Zug 1] eine Kammervorlage mit eigener Werte-Liste läuft durch — es gab keinen Prüfstoff dafür', () => {
  const { V } = ladeKern();
  const erg = GEN.felderAngleichungen(KAMMER_FELDER);
  assert.equal(erg.angeglichen.length, 0, 'der Erzeuger baut sie ohne Angleichung');
  const tpl = { felder: erg.felder, codeListen: [KAMMER_CODELISTE] };
  assert.equal(V.validateTemplate(tpl), null, 'und der Torwächter nimmt sie an');
  const u = V._templateFelderUebersetzen(tpl, 68, null, 'kammer/aek-berlin');
  assert.equal(u.feldDefinitionen.length, 2);
});

test('[A378 · Zug 1 · Rot-Beweis] eine FREI ERFUNDENE Liste wird benannt abgewiesen', () => {
  const { V } = ladeKern();
  const erg = GEN.felderAngleichungen(KAMMER_FELDER);
  const fremd = { felder: erg.felder,
    codeListen: [Object.assign({}, KAMMER_CODELISTE, { uri: FREMDES_SYSTEM_URI })] };
  const grund = V.validateTemplate(fremd);
  assert.match(String(grund), /codeListe-Herkunft unbekannt/,
    'eine Kammer kann eigene WERTE zu einem geführten System liefern — kein eigenes System');
  assert.match(String(grund), /kammer-example\.invalid/, 'und das System wird BENANNT, nicht nur gezählt');
});

/* ══ Zug 4 — die Dreiteilung für Codesysteme ══════════════════════════════ */

test('[A378 · Zug 4] `codeSystemPruefen` unterscheidet drei Fälle — wie `kennungPruefen`', async () => {
  const { V } = ladeKern();
  assert.deepEqual(V.codeSystemPruefen(SNOMED_URI), { ok: true, grund: null, system: SNOMED_URI });
  assert.equal(V.codeSystemPruefen(FREMDES_SYSTEM_URI).grund, 'fremdes-system');
  assert.equal(V.codeSystemPruefen('').grund, 'ohne-system');
  assert.equal(V.codeSystemPruefen(null).grund, 'ohne-system');
});

test('[A378 · Zug 4] die geführten Systeme kommen aus der LAUFENDEN Registry, nicht aus einer Liste hier', async () => {
  const { V } = ladeKern();
  // Jedes System, das die App führt, muss auch der Prüfer kennen — sonst zwei Statusorte.
  for (const c of Object.values(V.CODE_LISTEN)) {
    if (!c.uri) continue;
    assert.equal(V.codeSystemPruefen(c.uri).ok, true, 'geführtes System nicht erkannt: ' + c.uri);
  }
});

/* ══ Zug 2 + 3 — die drei Fälle, jetzt unterscheidbar ═════════════════════ */

test('[A378 · tragend] die drei Fälle sind im Datensatz UNTERSCHEIDBAR — sie waren es nicht', async () => {
  const { V: V0 } = ladeKern();
  const faelle = [
    { name: 'codiert', chip: V0.chipAusEingabe('snomedAllergen', 'Penicillin'), form: 'codiert' },
    { name: 'freitext', chip: { text: 'Hausstaub' }, form: 'freitext' },
    { name: 'fremdes System', chip: { text: 'Fremdstoff', code: { system: FREMDES_SYSTEM_URI, code: 'X99' } },
      form: 'fremdes-system' },
  ];
  const gesehen = new Set();
  for (const f of faelle) {
    const V = await depotMitChip(f.chip);
    const ds = V.anfrageAntwortDatensatz(anfrage('health.allergiesMedicationFoodOther'), { sensibel: true });
    assert.equal(ds.felder.length, 1, f.name + ': die Angabe geht hinaus — gesperrt wird nichts');
    assert.equal(ds.fehlend.length, 0, f.name + ': sie fehlt nicht');
    assert.ok(ds.felder[0].codeForm, f.name + ': die Form reist mit');
    assert.equal(ds.felder[0].codeForm.form, f.form, f.name);
    gesehen.add(ds.felder[0].codeForm.form);
  }
  assert.equal(gesehen.size, 3, 'drei Fälle, drei Formen — vorher dreimal dasselbe');
});

test('[A378 · Zug 3] DER GEFÄHRLICHSTE FALL wird benannt: ein Code aus fremdem System', async () => {
  const V = await depotMitChip({ text: 'Fremdstoff', code: { system: FREMDES_SYSTEM_URI, code: 'X99' } });
  const ds = V.anfrageAntwortDatensatz(anfrage('health.allergiesMedicationFoodOther'), { sensibel: true });
  const cf = ds.felder[0].codeForm;
  assert.equal(cf.form, 'fremdes-system', 'er sieht aus wie ein Treffer und ist für den Empfänger keiner');
  assert.equal(cf.fremd, 1);
  assert.deepEqual(Array.from(cf.systeme), [FREMDES_SYSTEM_URI], 'und WELCHES System, nicht nur DASS eines');
});

test('[A378 · Zug 3] es wird GESAGT, nicht gesperrt — die Herausgabe läuft in allen drei Fällen', async () => {
  for (const chip of [{ text: 'Hausstaub' },
                      { text: 'F', code: { system: FREMDES_SYSTEM_URI, code: 'X' } }]) {
    const V = await depotMitChip(chip);
    const ds = V.anfrageAntwortDatensatz(anfrage('health.allergiesMedicationFoodOther'), { sensibel: true });
    assert.equal(ds.vollstaendig, true,
      'eine Herausgabe zu verweigern, weil ein Code fehlt, wäre das Gegenteil des Hausgrundsatzes');
    assert.equal(ds.felder.length, 1);
  }
});

test('[A378 · Zug 3] die Bürgerin erfährt es VOR der Freigabe', async () => {
  const V = await depotMitChip({ text: 'Hausstaub' });
  const ab = V.anfrageAbgleich(anfrage('health.allergiesMedicationFoodOther'));
  assert.equal(ab.ok, true);
  assert.equal(ab.nurTextHinaus.length, 1, 'der Abgleich sagt, was als blosser Text hinausgeht');
  assert.equal(ab.nurTextHinaus[0].form, 'freitext');
  assert.ok(ab.nurTextHinaus[0].label, 'und nennt das Feld beim Namen, nicht bei der Kennung');
});

test('[A378 · Gegenprobe] ein Feld OHNE Code-Dimension trägt gar keine Form-Angabe', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const ds = V.anfrageAntwortDatensatz(anfrage('identity.givenName'), { sensibel: true });
  assert.equal(ds.felder[0].codeForm, undefined,
    'ein Schlüssel, der immer da ist, sagt nichts — ein Name trägt keine Codierung');
  const ab = V.anfrageAbgleich(anfrage('identity.givenName'));
  assert.deepEqual(ab.nurTextHinaus, [], 'und es wird auch nichts gesagt');
});

test('[A378 · Zug 3] eine gemischte Liste wird nach der SCHWÄCHSTEN Form beurteilt', async () => {
  const { V: V0 } = ladeKern();
  const V = await depotMitChip([
    V0.chipAusEingabe('snomedAllergen', 'Penicillin'),
    { text: 'Hausstaub' },
  ]);
  const ds = V.anfrageAntwortDatensatz(anfrage('health.allergiesMedicationFoodOther'), { sensibel: true });
  assert.equal(ds.felder[0].codeForm.form, 'freitext',
    'eine Angabe, von der ein Teil unbrauchbar ist, ist insgesamt nicht brauchbar');
  assert.equal(ds.felder[0].codeForm.codiert, 1);
  assert.equal(ds.felder[0].codeForm.freitext, 1);
});

test('[A378 · Rot-Beweis] ohne die Form-Angabe sind die drei Fälle wieder ununterscheidbar', async () => {
  /* Die Mutation am Gegenstand: die Form aus dem Eintrag nehmen. Genau dann ist der Zustand
     vom 20.08. wieder da — dreimal derselbe String, und nichts sagt es. */
  const { V: V0 } = ladeKern();
  const chips = [V0.chipAusEingabe('snomedAllergen', 'Penicillin'), { text: 'Hausstaub' },
                 { text: 'F', code: { system: FREMDES_SYSTEM_URI, code: 'X' } }];
  const ohneForm = new Set();
  for (const chip of chips) {
    const V = await depotMitChip(chip);
    const ds = V.anfrageAntwortDatensatz(anfrage('health.allergiesMedicationFoodOther'), { sensibel: true });
    const e = Object.assign({}, ds.felder[0]);
    delete e.codeForm; delete e.roh;
    ohneForm.add(JSON.stringify({ kennung: e.kennung, label: e.label, wertTyp: typeof e.wert }));
  }
  assert.equal(ohneForm.size, 1,
    'ohne `codeForm` ist der Eintrag in allen drei Fällen derselbe — genau das war der Befund');
});
