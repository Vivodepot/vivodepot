'use strict';
/* Gleichlauf docs/rechtsraum-modul/rechtsraum-modul-schema.json ↔ Rechtsraum-Prüfer (inline im
   EINLASS_REGISTER, mit _rechtsraumModulUebersetzen). Regeln: tests/mit-modul/helfer/modul-schema-gleichlauf.js.

   Dazu der Rot-Beweis der Reparatur vom 26.09.2026: das Schema in seiner alten Fassung verlangte
   `schemaVersion` (vom Kern nie gelesen, als unbekannt verworfen) und verbot `modulTyp`/`sprache`,
   die der Kern annimmt — ein kerngültiges, sauberes Modul fiel durch. Die alte Fassung steht hier
   wörtlich im Kern ihrer Pflicht- und Schlüssel-Liste, damit der Beweis nicht vom Git-Verlauf abhängt. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { gleichlaufProben, verstoesse, validatorBauen, schemaLaden, kernPrueferHolen } = require('./helfer/modul-schema-gleichlauf.js');
const { ladeKern } = require('../load-kern.js');

const basis = { modulTyp: 'rechtsraum', moduleVersion: 1, rechtsraum: 'AT', typen: { tpl_erbvertrag: { katalogVersion: 1 } } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const typ = (e) => mit({ typen: { tpl_erbvertrag: { katalogVersion: 1, ...e } } });

gleichlaufProben({
  typ: 'rechtsraum',
  positiv: [
    ['ein tpl_-Typ ohne Wortlaut', basis],
    ['mit Wortlaut und Sprache', mit({ sprache: 'de-AT', typen: { tpl_erbvertrag: { katalogVersion: 2, wortlaut: 'Text',
      formvorschriften: { paragraf: '§ 1' }, fristenVorrang: null, zweck: ['nachlass'] } } })],
    ['mit Bauplan', typ({ bauplan: [{ feld: { id: 'tpl_x', typ: 'text' }, frage: 'Frage?' }] })],
    ['mit Einlass-Marken', mit({ appVersion: 'v1', ungeprueft: true, eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne rechtsraum', ohne('rechtsraum'), 'rechtsraum'],
    ['rechtsraum leer', mit({ rechtsraum: ' ' }), 'rechtsraum'],
    ['rechtsraum DE', mit({ rechtsraum: 'DE' }), 'reserviert'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['ohne typen', ohne('typen'), 'typen'],
    ['typen leer', mit({ typen: {} }), 'typen'],
    ['einziger Typ ohne katalogVersion', typ({ katalogVersion: undefined }), 'typen'],
    ['Wortlaut ohne Sprache', typ({ wortlaut: 'Text' }), 'sprache'],
    ['Wortlaut, Sprache falscher Form', mit({ sprache: 'Deutsch', typen: { tpl_erbvertrag: { katalogVersion: 1, wortlaut: 'Text' } } }), 'sprache-form'],
  ],
  nurKern: {
    typen: 'Ob ein Typ-Schlüssel ohne tpl_-Präfix zulässig ist, entscheidet der eingebaute Katalog des jeweiligen Produkts (_rechtsraumTypBekannt) — das Schema kennt ihn nicht. Bleibt kein Typ übrig, lehnt der Kern ab.',
  },
  nurKernFaelle: [
    ['einziger Typ außerhalb von Katalog und tpl_-Namensraum', mit({ typen: { erbvertrag: { katalogVersion: 1 } } }), 'typen'],
  ],
});

/* Die alte Fassung, soweit sie das Urteil trug: Pflicht schemaVersion, keine weiteren Schlüssel. */
function alteFassung() {
  const s = schemaLaden('rechtsraum');
  delete s.if; delete s.then;
  s.required = ['schemaVersion', 'rechtsraum', 'moduleVersion', 'typen'];
  s.properties = { schemaVersion: { type: 'integer', minimum: 47 }, rechtsraum: s.properties.rechtsraum,
    moduleVersion: s.properties.moduleVersion, typen: s.properties.typen };
  return s;
}

test('[Modul-Schema·rechtsraum·Rot-Beweis] die alte Fassung verwirft ein kerngültiges, sauberes Modul', () => {
  const { V } = ladeKern();
  const pruefen = kernPrueferHolen(V, { typ: 'rechtsraum', register: true });
  const v = verstoesse(pruefen, validatorBauen(alteFassung()), [['Register-Form', basis]], {});
  assert.ok(v.some((x) => x.startsWith('(a)')), 'die alte Fassung hätte das saubere Modul annehmen müssen — dann beweist dieser Test nichts');
  assert.deepEqual(verstoesse(pruefen, validatorBauen(schemaLaden('rechtsraum')), [['Register-Form', basis]], {}), []);
});

test('[Modul-Schema·rechtsraum] schemaVersion ist entfallen und wird vom Kern als unbekannt verworfen', () => {
  const { V } = ladeKern();
  const pruefen = kernPrueferHolen(V, { typ: 'rechtsraum', register: true });
  assert.equal(schemaLaden('rechtsraum').properties.schemaVersion, undefined);
  const r = pruefen(mit({ schemaVersion: 47 }));
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.verworfene, [{ schluessel: 'schemaVersion', grund: 'unbekannt' }]);
});
