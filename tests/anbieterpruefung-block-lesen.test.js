'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin.
/* Pflichtblock Anbieterprüfung im Browser-Aussteller (vivodepot-vc-issuer.html) — die Lesefunktion.
   anbieterPruefungAusBlock(wurzel) liest nur: leer → null, Schalter an → {abgeschaltet:true},
   sonst {methode, geprueftAm, geprueftVon, belegHash} in der Form von tools/lib/anbieterpruefung.js.
   Geladen wird genau der markierte Block aus der HTML (BEGIN/END), nicht eine Kopie.
   Rot-Beweis im selben Lauf: dieselben Prüfungen gegen eine Quelle ohne den Abschalt-Zweig bzw. ohne die
   Leer-Regel müssen scheitern. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO, 'vivodepot-vc-issuer.html'), 'utf8');
const { METHODEN, anbieterPruefungPruefen } = require('../tools/lib/anbieterpruefung.js');

function blockQuelle() {
  const a = HTML.indexOf('/* BEGIN Pflichtblock Anbieterprüfung — Oberfläche');
  const e = HTML.indexOf('/* END Pflichtblock Anbieterprüfung — Oberfläche */');
  assert.ok(a > 0 && e > a, 'markierter Block im Aussteller gefunden');
  return HTML.slice(a, e);
}
function lade(quelle) {
  const sb = { crypto: crypto.webcrypto, Uint8Array, Array, Object, String };
  vm.createContext(sb);
  vm.runInContext(quelle + '\n;globalThis.__AP__ = { anbieterPruefungAusBlock, anbieterPruefungBelegHashRechnen, '
    + 'anbieterPruefungZustand, ANBIETERPRUEFUNG_BLOCK_METHODEN };', sb);
  return sb.__AP__;
}
// Ein Block wie im Markup: Felder per data-ap, Hash als Attribut am Block.
function block({ methode = '', am = '', von = '', hash = '', ohne = false } = {}) {
  const radios = ['registerauszug', 'email-bestaetigung', 'ausweis-von-hand'].map((v) => ({ value: v, checked: v === methode }));
  const felder = { geprueftAm: { value: am }, geprueftVon: { value: von }, ohne: { checked: ohne } };
  const attr = hash ? { 'data-beleg-hash': hash } : {};
  return {
    querySelector(sel) { const m = /^\[data-ap="([^"]+)"\]$/.exec(sel); return m ? (felder[m[1]] || null) : null; },
    querySelectorAll(sel) { return sel === '[data-ap="methode"]' ? radios : []; },
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(attr, n) ? attr[n] : null; },
  };
}
const HASH = crypto.createHash('sha256').update('beleg').digest('hex');
const VOLL = { methode: 'registerauszug', am: '2026-11-06', von: 'Prüferin A', hash: HASH };

function pruefungen(V) {
  assert.strictEqual(V.anbieterPruefungAusBlock(block()), null, 'leer → null');
  assert.strictEqual(V.anbieterPruefungAusBlock(null), null, 'keine Wurzel → null');
  assert.deepStrictEqual({ ...V.anbieterPruefungAusBlock(block({ ...VOLL, ohne: true })) }, { abgeschaltet: true },
    'Schalter an → abgeschaltet, auch wenn Felder gefüllt sind');
  assert.deepStrictEqual({ ...V.anbieterPruefungAusBlock(block({ ohne: true })) }, { abgeschaltet: true });
  const p = V.anbieterPruefungAusBlock(block(VOLL));
  assert.deepStrictEqual({ ...p }, { methode: 'registerauszug', geprueftAm: '2026-11-06', geprueftVon: 'Prüferin A', belegHash: HASH });
  assert.doesNotThrow(() => anbieterPruefungPruefen(p), 'vollständiger Block besteht die Prüfung der Bibliothek');
  const teil = V.anbieterPruefungAusBlock(block({ von: 'Prüferin A' }));
  assert.ok(teil && teil.geprueftVon === 'Prüferin A' && teil.methode === '', 'teilweise → Objekt, die Prüfung entscheidet');
  assert.throws(() => anbieterPruefungPruefen(teil), /methode/);
}

test('Methoden des Blocks = METHODEN der Bibliothek, auch im Markup je Block', () => {
  const V = lade(blockQuelle());
  assert.deepStrictEqual([...V.ANBIETERPRUEFUNG_BLOCK_METHODEN], [...METHODEN]);
  for (const art of ['einzel', 'stapel']) {
    const a = HTML.indexOf('<!-- BEGIN Pflichtblock Anbieterprüfung (' + art + ')');
    const e = HTML.indexOf('<!-- END Pflichtblock Anbieterprüfung (' + art + ')');
    assert.ok(a > 0 && e > a, 'Block ' + art + ' im Markup');
    const werte = [...HTML.slice(a, e).matchAll(/type="radio"[^>]*value="([^"]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(werte, [...METHODEN], 'Block ' + art);
    assert.match(HTML.slice(a, e), /data-ap="ohne"/, 'Schalter im Block ' + art);
  }
});

test('anbieterPruefungAusBlock: null, abgeschaltet, vollständig, teilweise', () => {
  pruefungen(lade(blockQuelle()));
});

test('Zustand für den Chip: leer, teil, voll, ohne', () => {
  const V = lade(blockQuelle());
  assert.strictEqual(V.anbieterPruefungZustand(block()), 'leer');
  assert.strictEqual(V.anbieterPruefungZustand(block({ methode: 'ausweis-von-hand' })), 'teil');
  assert.strictEqual(V.anbieterPruefungZustand(block(VOLL)), 'voll');
  assert.strictEqual(V.anbieterPruefungZustand(block({ ohne: true })), 'ohne');
});

test('Beleg-Hash: sha256-Hex, 64 Zeichen, gleich node:crypto', async () => {
  const V = lade(blockQuelle());
  const bytes = new TextEncoder().encode('Registerauszug HRB 12345');
  const hex = await V.anbieterPruefungBelegHashRechnen(bytes);
  assert.match(hex, /^[0-9a-f]{64}$/);
  assert.strictEqual(hex, crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex'));
});

test('Rot-Beweis: ohne Abschalt-Zweig oder ohne Leer-Regel scheitern die Prüfungen', () => {
  const q = blockQuelle();
  const ohneSchalter = q.replace("if (ohne && ohne.checked) return { abgeschaltet: true };", '');
  assert.notStrictEqual(ohneSchalter, q, 'Mutation 1 greift');
  assert.throws(() => pruefungen(lade(ohneSchalter)), assert.AssertionError);
  const ohneLeer = q.replace('if (!methode && !geprueftAm && !geprueftVon && !belegHash) return null;', '');
  assert.notStrictEqual(ohneLeer, q, 'Mutation 2 greift');
  assert.throws(() => pruefungen(lade(ohneLeer)), assert.AssertionError);
});
