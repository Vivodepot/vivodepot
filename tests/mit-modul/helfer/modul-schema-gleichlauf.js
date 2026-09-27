'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Gleichlauf Schema ↔ Kern-Prüfer (Modul-Schemas, 26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Je Modultyp liegt unter docs/<typ>-modul/ ein öffentliches JSON-Schema (2020-12). Es darf
   nicht vom Kern weglaufen — das Rechtsraum-Schema tat genau das, unbemerkt, weil seine
   Probe nur die Datei las. Dieser Helfer fährt jedes Beispielmodul durch BEIDE und verlangt
   zwei Richtungen (entschieden 26.09.2026):

     (a) Kern gültig UND verworfene leer  ⇒  Schema gültig.   Ohne Ausnahme.
     (b) Schema gültig                    ⇒  Kern gültig.     Ausgenommen NUR ein Kern-Grund,
                                                              der auf der „nur Kern“-Liste steht.

   „nur Kern“ heißt: der Grund hängt am laufenden Bestand (reservierte Kennungen, bekannte
   Felder, Katalog), nicht an der Form — ein statisches Schema kann ihn nicht sehen. Jeder
   Eintrag trägt seine Begründung und einen Fall, an dem die Lücke vorgeführt wird.

   Abdeckung: jeder literale Ablehnungs-Code des Prüfers (tools/modul-schemas-messen.js,
   `ablehnungsCodes`) steht entweder an einem Negativfall, den das Schema ebenfalls ablehnt,
   oder auf der „nur Kern“-Liste. Ein neuer Code im Kern ohne Zuordnung fällt; ein Eintrag
   auf der Liste, den der Kern nicht mehr kennt, fällt auch.

   ajv ist devDependency und nur hier geladen — nie im Kern, nie in der Lese-App
   (tests/modul-schemas-klasse.test.js hält das fest). Darum liegt der Helfer mit seinen Proben unter
   tests/mit-modul/ (Schicht 1 läuft ohne externes Modul, tests/schicht-1-ohne-lieferkette.test.js).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const { ladeKern } = require('../../load-kern.js');
const M = require('../../../tools/modul-schemas-messen.js');
const { ALLE_REGISTER_BEISPIELE: REGISTER_BEISPIELE } = require('../../helfer/register-beispiele.js');

const WURZEL = path.join(__dirname, '..', '..', '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');

function schemaLaden(typ) {
  return JSON.parse(fs.readFileSync(path.join(WURZEL, M.schemaPfad(typ)), 'utf8'));
}
function validatorBauen(schema) {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  return ajv.compile(schema);
}
function kernPrueferHolen(V, eintrag) {
  if (eintrag.register) return V.EINLASS_REGISTER.find((r) => r.typ === eintrag.typ).pruefen;
  return V[eintrag.pruefer];
}
const kopie = (x) => JSON.parse(JSON.stringify(x));

/* Urteil beider Seiten für ein Modul. */
function urteil(pruefen, validieren, modul) {
  const k = pruefen(kopie(modul));
  const s = validieren(kopie(modul));
  return {
    kernGueltig: !!(k && k.gueltig),
    kernSauber: !!(k && k.gueltig && (!k.verworfene || k.verworfene.length === 0)),
    kernGrund: k ? k.grund : null,
    verworfene: k ? k.verworfene : null,
    schemaGueltig: s,
    schemaFehler: s ? null : (validieren.errors || []).map((e) => e.instancePath + ' ' + e.message).join('; '),
  };
}

/* Die zwei Richtungen als reine Funktionen — sie liefern die Verstöße, damit der Rot-Beweis
   dieselbe Prüfung an einem verfälschten Schema anschlagen sehen kann. */
function verstoesse(pruefen, validieren, module, nurKern) {
  const aus = [];
  for (const [name, modul] of module) {
    const u = urteil(pruefen, validieren, modul);
    if (u.kernSauber && !u.schemaGueltig) aus.push(`(a) ${name}: Kern sauber, Schema lehnt ab — ${u.schemaFehler}`);
    if (u.schemaGueltig && !u.kernGueltig && !Object.prototype.hasOwnProperty.call(nurKern, u.kernGrund)) {
      aus.push(`(b) ${name}: Schema gültig, Kern lehnt ab mit „${u.kernGrund}“ — nicht auf der nur-Kern-Liste`);
    }
  }
  return aus;
}

/* Erzeugt die Proben eines Typs.
   typ         — wie in EINLASS_REGISTER (bzw. 'design')
   positiv     — [[name, modul]] — Kern sauber verlangt (Vorbedingung) und Schema gültig
   negativ     — [[name, modul, grund]] — Kern lehnt mit `grund` ab, Schema lehnt ab
   nurKern     — { grund: 'Begründung' }
   nurKernFaelle — [[name, modul, grund]] — Kern lehnt mit `grund` ab, Schema nimmt an (die Lücke, vorgeführt) */
function gleichlaufProben({ typ, positiv = [], negativ = [], nurKern = {}, nurKernFaelle = [] }) {
  const eintrag = M.modulTypen(KERN).find((t) => t.typ === typ);
  const marke = `[Modul-Schema·${typ}]`;
  const beispiel = REGISTER_BEISPIELE.find((b) => b.typ === typ);
  const allePositiv = (beispiel ? [['Register-Beispiel', beispiel.modul]] : []).concat(positiv);
  let _V = null;
  const V = () => (_V || (_V = ladeKern().V));

  test(`${marke} der Typ ist dem Kern bekannt und das Schema kompiliert streng (2020-12)`, () => {
    assert.ok(eintrag, `Typ ${typ} nicht in der Messung (tools/modul-schemas-messen.js)`);
    const schema = schemaLaden(typ);
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.doesNotThrow(() => validatorBauen(schema));
  });

  test(`${marke} (a) sauber im Kern ⇒ gültig im Schema`, () => {
    const pruefen = kernPrueferHolen(V(), eintrag);
    const validieren = validatorBauen(schemaLaden(typ));
    assert.ok(allePositiv.length >= 1, 'Vorbedingung: mindestens ein Positivfall');
    for (const [name, modul] of allePositiv) {
      const u = urteil(pruefen, validieren, modul);
      assert.ok(u.kernSauber, `Vorbedingung ${name}: Kern soll sauber annehmen — grund ${u.kernGrund}, verworfene ${JSON.stringify(u.verworfene)}`);
      assert.ok(u.schemaGueltig, `${name}: Schema lehnt ab — ${u.schemaFehler}`);
    }
  });

  test(`${marke} (b) Kern lehnt ab ⇒ Schema lehnt ab (Negativfälle)`, () => {
    const pruefen = kernPrueferHolen(V(), eintrag);
    const validieren = validatorBauen(schemaLaden(typ));
    for (const [name, modul, grund] of negativ) {
      const u = urteil(pruefen, validieren, modul);
      assert.equal(u.kernGueltig, false, `Vorbedingung ${name}: Kern soll ablehnen`);
      assert.equal(u.kernGrund, grund, `Vorbedingung ${name}: Kern-Grund`);
      assert.equal(u.schemaGueltig, false, `${name}: Schema nimmt an, obwohl der Kern mit „${grund}“ ablehnt`);
    }
  });

  test(`${marke} nur Kern: jede Lücke ist begründet und vorgeführt`, () => {
    const pruefen = kernPrueferHolen(V(), eintrag);
    const validieren = validatorBauen(schemaLaden(typ));
    for (const [grund, warum] of Object.entries(nurKern)) {
      assert.ok(typeof warum === 'string' && warum.length > 20, `nur-Kern „${grund}“ braucht eine Begründung`);
      assert.ok(nurKernFaelle.some((f) => f[2] === grund), `nur-Kern „${grund}“ braucht einen Fall, der die Lücke vorführt`);
    }
    for (const [name, modul, grund] of nurKernFaelle) {
      const u = urteil(pruefen, validieren, modul);
      assert.equal(u.kernGueltig, false, `Vorbedingung ${name}: Kern soll ablehnen`);
      assert.equal(u.kernGrund, grund, `Vorbedingung ${name}: Kern-Grund`);
      assert.ok(Object.prototype.hasOwnProperty.call(nurKern, grund), `${name}: Grund ${grund} steht nicht auf der nur-Kern-Liste`);
    }
    assert.deepEqual(verstoesse(pruefen, validieren, allePositiv.concat(negativ, nurKernFaelle), nurKern), []);
  });

  test(`${marke} jeder Ablehnungs-Code des Prüfers ist zugeordnet, und die nur-Kern-Liste ist nicht veraltet`, () => {
    const codes = M.ablehnungsCodes(KERN, eintrag);
    const zugeordnet = new Set(negativ.map((f) => f[2]).concat(Object.keys(nurKern)));
    assert.deepEqual(codes.filter((c) => !zugeordnet.has(c)), [], 'Ablehnungs-Codes ohne Negativfall und ohne nur-Kern-Eintrag');
    const dynamisch = new Set(negativ.map((f) => f[2]).concat(nurKernFaelle.map((f) => f[2])));
    assert.deepEqual(Object.keys(nurKern).filter((c) => !codes.includes(c) && !dynamisch.has(c)), [],
      'nur-Kern-Einträge, die der Prüfer nicht mehr kennt');
  });

  test(`${marke}·Rot-Beweis beide Richtungen schlagen an einem verfälschten Schema an`, () => {
    const pruefen = kernPrueferHolen(V(), eintrag);
    const faelle = allePositiv.concat(negativ, nurKernFaelle);
    // (a) ein Schema, das nichts annimmt, lehnt die sauberen Module ab
    const zuStreng = { ...schemaLaden(typ), not: {} };
    assert.ok(verstoesse(pruefen, validatorBauen(zuStreng), faelle, nurKern).some((v) => v.startsWith('(a)')), '(a) schlägt nicht an');
    // (b) ein Schema, das alles annimmt, nimmt die Negativfälle an
    if (negativ.length) {
      assert.ok(verstoesse(pruefen, validatorBauen(true), faelle, nurKern).some((v) => v.startsWith('(b)')), '(b) schlägt nicht an');
    }
  });
}

module.exports = { gleichlaufProben, urteil, verstoesse, schemaLaden, validatorBauen, kernPrueferHolen };
