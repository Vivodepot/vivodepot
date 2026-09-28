'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund LOGIK-BLOCKTYP-PROTOTYP (MITTEL, 26.09.2026) und seine Klasse
   ────────────────────────────────────────────────────────────────────────
   logikModulPruefen prüfte den Blocktyp mit `MODUL_BLOCK_HANDLER[blk.typ]` — ein gewöhnliches
   Objekt, das `constructor`, `toString` und `__proto__` erbt. Ein Logikmodul mit einem dieser
   Blocktypen wurde sauber angenommen. Gefunden beim Bau der Modul-Schemas: das Schema lehnte ab,
   der Kern nicht.

   Die Klasse: jeder Lookup einer Konstanten-Map mit nicht-literalem Schlüssel läuft über
   `_eigenerWert`. Wächter: tools/konstanten-lookup-pruefen.js über den ganzen Kern.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const W = require('../tools/konstanten-lookup-pruefen.js');

const logik = (typ) => ({ modulTyp: 'logikModul', moduleVersion: 1, id: 'zz-probe', titel: 'Probe', sektor: 'finance',
  herkunft: 'probe', sprache: 'de', datenSchema: {}, abschnitte: [{ titel: 'x', bloecke: [{ typ, texte: ['Text'] }] }],
  dokAusgabe: { h1: 'Titel' } });

for (const typ of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
  test(`[LOGIK-BLOCKTYP-PROTOTYP] ein geerbter Name als Blocktyp („${typ}“) wird abgelehnt`, () => {
    const { V } = ladeKern();
    const pruefen = V.EINLASS_REGISTER.find((r) => r.typ === 'logikModul').pruefen;
    const r = pruefen(logik(typ));
    assert.equal(r.gueltig, false, `Blocktyp ${typ} wurde angenommen`);
  });
}

test('[LOGIK-BLOCKTYP-PROTOTYP·Gegenprobe] ein echter Blocktyp bleibt gültig', () => {
  const { V } = ladeKern();
  const r = V.EINLASS_REGISTER.find((x) => x.typ === 'logikModul').pruefen(logik('immer'));
  assert.equal(r.gueltig, true);
});

test('[Konstanten-Lookup·Klasse] kein Lookup einer Konstanten-Map mit fremdem Schlüssel ohne _eigenerWert im Kern', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(W.konstantenMaps(kern).size >= 50, 'Vorbedingung: die Konstanten-Maps werden gefunden');
  assert.ok(W.konstantenMaps(kern).has('MODUL_BLOCK_HANDLER'), 'Vorbedingung: auch eine Map ohne Object.freeze');
  assert.deepEqual(W.befunde(kern).map((b) => `${b.zeile}: ${b.map}[${b.ausdruck}]`), []);
});

test('[Konstanten-Lookup·Klasse·Rot-Beweis] bloße Lookups werden gefunden, _eigenerWert, Literale und Kommentare nicht', () => {
  const kern = [
    'const HANDLER = { immer: 1 };',
    'const FARBEN = Object.freeze({ rot: 1 });',
    'if (!HANDLER[blk.typ]) return;',
    "const f = FARBEN[m['__proto__']];",
    'const g = HANDLER[FARBEN[x]];',
    'const ok = _eigenerWert(HANDLER, blk.typ);',
    "const lit = FARBEN['rot'];",
    '// HANDLER[kommentar]',
    'const fremd = andereMap[x];',
  ].join('\n');
  const f = W.befunde(kern).map((b) => `${b.map}[${b.ausdruck}]`);
  assert.deepEqual(f, ['HANDLER[blk.typ]', "FARBEN[m['__proto__']]", 'HANDLER[FARBEN[x]]', 'FARBEN[x]']);
});

/* Der Folge-Lookup auf einem Map-WERT — genau die Zeile, die der Wächter in seiner ersten Fassung
   übersah (listenZeilenWaehlen, LISTEN_AUSWAHLFORM): `constructor` als typWert lieferte eine Funktion. */
test('[Konstanten-Lookup·Klasse·Rot-Beweis] der Folge-Lookup auf einem Map-Wert wird gefunden, der doppelt geschützte nicht', () => {
  const vorher = [
    'const LISTEN_AUSWAHLFORM = Object.freeze({ a: Object.freeze({ b: 1 }) });',
    '    : (((_eigenerWert(LISTEN_AUSWAHLFORM, listeId) || {})[typWert]) || LISTEN_AUSWAHLFORM_STANDARD);',
    '  const y = _eigenerWert(LISTEN_AUSWAHLFORM, a).unter[schluessel];',
    "  const z = _eigenerWert(LISTEN_AUSWAHLFORM, a)['b'];",
    '    : ((_eigenerWert(_eigenerWert(LISTEN_AUSWAHLFORM, listeId) || {}, typWert)) || LISTEN_AUSWAHLFORM_STANDARD);',
  ].join('\n');
  assert.deepEqual(W.befunde(vorher).map((b) => `${b.zeile}:${b.map}[${b.ausdruck}]`), ['2:(Wert)[typWert]', '3:(Wert)[schluessel]']);
});
