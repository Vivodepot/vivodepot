'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Befund RECHTSRAUM-SCHEMA-BESCHREIBT-DE-MODUL-NICHT (MITTEL, 16.10.2026), Rechtsraum-Teil — mit R1 gebaut (die Schema-Datei gehört R1,
   U2-ADR-504 §3, 17.10.2026).
   ────────────────────────────────────────────────────────────────────────────
   Das veröffentlichte Schema ist der Vertrag für den Einlass FREMDER Rechtsraum-Module. Das ausgelieferte DE-Modul kommt über den
   Gerüst-Ladeweg, den das Schema ausdrücklich nicht beschreibt; die Reservierung („DE nicht“) ist darum richtig und bleibt. Die Lücke
   war eine andere: das Schema kannte drei Felder nicht, die das Modul trägt (`name`, `rechtsformen` — U2-ADR-495; `typen.*.rechtsgrundlage`
   — U2-ADR-466). Diese Probe hält:
     · jedes Ab-Werk-Rechtsraum-Modul der vier Produkte ist gültig gegen das Schema OHNE genau die eine Reservierungsregel
       (`properties.rechtsraum.not`); fehlt die Regel, ist die Probe rot — sie entfernt nichts Unbekanntes;
     · ein erfundenes Fremdmodul mit „DE“ ist gegen das unveränderte Schema ungültig (die Reservierung bleibt im Vertrag);
     · Rot-Beweise: ein unbekannter Schlüssel macht das DE-Modul ungültig; ein Schema ohne `rechtsformen` ebenso.
   Die Klassenprobe über ALLE Ab-Werk-Module (Bereichs-Templates, Textsätze, Pro-Situationen, Fixtures, 22 ohne Schema) ist nicht Teil
   dieses Wagens; der Befund bleibt dafür offen.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const { PRODUKTE } = require('../../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..', '..');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'rechtsraum-modul', 'rechtsraum-modul-schema.json'), 'utf8'));
// Wie tests/mit-modul/schema-fassungen-ajv.test.js: strenges Schema, Formate aus (ohne ajv-formats unbekannt).
const OPTIONEN = { strictSchema: true, strictTypes: false, strictTuples: false, strictRequired: false, validateFormats: false, allErrors: true };
const pruefer = (schema) => new (Ajv2020.default || Ajv2020)(OPTIONEN).compile(schema);
const fehler = (v) => (v.errors || []).map((e) => e.instancePath + ' ' + e.message).join('; ');

function ohneReservierung(schema) {
  const s = structuredClone(schema);
  assert.ok(s.properties && s.properties.rechtsraum && s.properties.rechtsraum.not, 'Vorbedingung: die Reservierungsregel properties.rechtsraum.not steht im Schema');
  delete s.properties.rechtsraum.not;
  return s;
}

/* Alle Rechtsraum-Moduldateien, die ab Werk in einem der vier Produkte stecken (über `modulTyp`, nicht über den Dateinamen). */
function abWerkRechtsraumModule() {
  const pfade = new Set();
  for (const p of PRODUKTE) for (const f of p.modulPfade) pfade.add(f);
  const aus = [];
  for (const f of pfade) {
    let m; try { m = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { continue; }
    if (m && m.modulTyp === 'rechtsraum') aus.push({ datei: path.relative(REPO, f), modul: m });
  }
  return aus;
}

test('[Rechtsraum-Schema] jedes Ab-Werk-Rechtsraum-Modul ist gültig gegen das Schema ohne die Reservierungsregel', () => {
  const module = abWerkRechtsraumModule();
  assert.ok(module.length >= 1, 'Vorbedingung: mindestens ein Ab-Werk-Rechtsraum-Modul');
  const v = pruefer(ohneReservierung(SCHEMA));
  for (const { datei, modul } of module) assert.ok(v(modul), datei + ': ' + fehler(v));
});

test('[Rechtsraum-Schema] das GB-Fixture (ein fremdes Modul ohne Reservierung) ist gegen das unveränderte Schema gültig', () => {
  /* Ein erfundenes Fremdmodul mit dem Code „GB“ in der Form der Achsen-Fixture (ohne deren Leser-Anmerkungen): nur Struktur,
     keine Rechtsaussage. Inline, weil diese Probe hinausgeht und die Achsen-Fixture drinnen bleibt. */
  const gb = {
    modulTyp: 'rechtsraum', rechtsraum: 'GB', sprache: 'en', moduleVersion: 1, anbieterId: 'achsentest',
    typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: null, formvorschriften: null, fristenVorrang: null, zweck: ['vermoegenssorge', 'gesundheitssorge'] },
      'living-will': { katalogVersion: 1, wortlaut: null, formvorschriften: null, fristenVorrang: null, zweck: ['gesundheitssorge'] },
    },
  };
  const v = pruefer(SCHEMA);
  assert.ok(v(gb), fehler(v));
});

test('[Rechtsraum-Schema] die Reservierung bleibt im Vertrag: ein Fremdmodul mit „DE“ ist ungültig, in jeder Schreibung', () => {
  const v = pruefer(SCHEMA);
  for (const code of ['DE', 'de', ' De ']) {
    assert.equal(v({ modulTyp: 'rechtsraum', rechtsraum: code, moduleVersion: 1, typen: { tpl_x: { katalogVersion: 1 } } }), false, code);
  }
});

test('[Rechtsraum-Schema·Rot-Beweis] ein unbekannter Schlüssel und ein Schema ohne `rechtsformen` machen das DE-Modul ungültig', () => {
  const de = abWerkRechtsraumModule().find((x) => x.modul.rechtsraum === 'DE');
  assert.ok(de && Array.isArray(de.modul.rechtsformen), 'Vorbedingung: das DE-Modul trägt rechtsformen');
  const v = pruefer(ohneReservierung(SCHEMA));
  assert.equal(v(Object.assign({}, de.modul, { unbekannt: 1 })), false, 'unbekannter Schlüssel');
  const ohneFeld = ohneReservierung(SCHEMA);
  delete ohneFeld.properties.rechtsformen;
  assert.equal(pruefer(ohneFeld)(de.modul), false, 'Schema ohne rechtsformen — die alte Lücke');
  const ohneRg = ohneReservierung(SCHEMA);
  delete ohneRg.properties.typen.additionalProperties.properties.rechtsgrundlage;
  assert.equal(pruefer(ohneRg)(de.modul), false, 'Schema ohne typen.*.rechtsgrundlage — die alte Lücke');
});
