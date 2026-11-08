'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin.
/* Pflichtblock Anbieterprüfung ↔ Prüfung vor der Signatur im Browser-Aussteller (vivodepot-vc-issuer.html).
   Befund ANBIETERPRUEFUNG-STILL-UMGANGEN: die Signatur prüft, was der Block liefert. Diese Probe hält die
   Verdrahtung zwischen beiden fest — mit dem ECHTEN Block (Lesefunktion zwischen BEGIN/END und Markup beider
   Blöcke aus der HTML) und der ECHTEN Prüfung (Quelle aus der HTML), nicht mit einem Stub:
     - die Einzelausstellung liest den Einzel-Block, der Stapel den Stapel-Block, keiner das ganze Dokument;
     - der Beleg-Hash (Attribut am Block) kommt bei der Prüfung an;
     - ein leerer Block verweigert, der Schalter des anderen Blocks gilt nicht mit.
   Wächter gegen die Fehlerklasse: kein Aufruf von anbieterPruefungAusBlock mit `document`, jeder Aufruf der
   Lesestelle nennt die Ausstellungsart als Literal.
   Rot-Beweis im selben Lauf: dieselben Fälle gegen die frühere Lesestelle (anbieterPruefungAusBlock(document))
   müssen scheitern. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO, 'vivodepot-vc-issuer.html'), 'utf8');

function zwischen(a, e, quelle = HTML) {
  const i = quelle.indexOf(a);
  const j = quelle.indexOf(e, i + 1);
  assert.ok(i >= 0 && j > i, 'Abschnitt gefunden: ' + a.slice(0, 60));
  return quelle.slice(i, j);
}
const BLOCK_JS = () => zwischen('/* BEGIN Pflichtblock Anbieterprüfung — Oberfläche', '/* END Pflichtblock Anbieterprüfung — Oberfläche */');
const PRUEF_JS = () => zwischen('/* ANBIETERPRÜFUNG VOR JEDER AUSSTELLUNG', 'async function stapelAusstellen(');

/* ── Mini-DOM aus dem echten Markup der beiden Blöcke ─────────────────────────────────────────────── */
function attrs(tag) {
  const o = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}
function baueBlock(art) {
  const markup = zwischen('<!-- BEGIN Pflichtblock Anbieterprüfung (' + art + ')', '<!-- END Pflichtblock Anbieterprüfung (' + art + ')');
  const kopf = attrs(/<div class="ap-block"[^>]*>/.exec(markup)[0]);
  const felder = [...markup.matchAll(/<(input|fieldset|span)\b[^>]*data-ap="[^"]+"[^>]*>/g)].map((m) => {
    const a = attrs(m[0]);
    return { tag: m[1], id: a.id || '', name: a.name || '', type: a.type || '', dataAp: a['data-ap'],
      value: a.value || '', checked: false, disabled: false, textContent: '' };
  });
  const at = { ...kopf };
  return {
    art, id: kopf.id, felder,
    querySelector(sel) { const m = /^\[data-ap="([^"]+)"\]$/.exec(sel); return m ? (felder.find((f) => f.dataAp === m[1]) || null) : null; },
    querySelectorAll(sel) { const m = /^\[data-ap="([^"]+)"\]$/.exec(sel); return m ? felder.filter((f) => f.dataAp === m[1]) : []; },
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(at, n) ? at[n] : null; },
    setAttribute(n, v) { at[n] = String(v); },
    removeAttribute(n) { delete at[n]; },
  };
}
function baueDokument() {
  const bloecke = [baueBlock('einzel'), baueBlock('stapel')];
  const alle = () => bloecke.flatMap((b) => b.felder);
  // Wie ein echtes Dokument: querySelector findet den ersten Treffer im ganzen Dokument, getAttribute gibt es nicht.
  const document = {
    getElementById(id) { return bloecke.find((b) => b.id === id) || alle().find((f) => f.id === id) || null; },
    querySelector(sel) { const m = /^\[data-ap="([^"]+)"\]$/.exec(sel); return m ? (alle().find((f) => f.dataAp === m[1]) || null) : null; },
    querySelectorAll(sel) { const m = /^\[data-ap="([^"]+)"\]$/.exec(sel); return m ? alle().filter((f) => f.dataAp === m[1]) : []; },
  };
  return { document, einzel: bloecke[0], stapel: bloecke[1] };
}
function fuelle(block, { methode, am, von, hash, ohne } = {}) {
  for (const f of block.felder) {
    if (f.dataAp === 'methode') f.checked = (f.value === methode);
    if (f.dataAp === 'geprueftAm' && am) f.value = am;
    if (f.dataAp === 'geprueftVon' && von) f.value = von;
    if (f.dataAp === 'ohne') f.checked = !!ohne;
  }
  if (hash) block.setAttribute('data-beleg-hash', hash);
}

function lade(pruefQuelle, document) {
  const sb = { crypto: crypto.webcrypto, Uint8Array, Array, Object, String, Error, document };
  vm.createContext(sb);
  vm.runInContext(BLOCK_JS() + '\n' + pruefQuelle
    + '\n;globalThis.__AP__ = { lies: _anbieterPruefungAusOberflaeche, fuer: anbieterPruefungFuerAusstellung };', sb);
  return sb.__AP__;
}

const HASH = crypto.createHash('sha256').update('beleg').digest('hex');
const VOLL = { methode: 'email-bestaetigung', am: '2026-11-06', von: 'Prüferin A', hash: HASH };

function faelle(pruefQuelle) {
  // 1. Einzel vollständig, Stapel leer: Einzel besteht mit dem Hash am Block, Stapel verweigert.
  {
    const d = baueDokument(); fuelle(d.einzel, VOLL);
    const V = lade(pruefQuelle, d.document);
    const ap = V.fuer(V.lies('einzel'));
    assert.deepStrictEqual({ ...ap.anbieterPruefung }, { methode: 'email-bestaetigung', geprueftAm: '2026-11-06', geprueftVon: 'Prüferin A', belegHash: HASH });
    assert.strictEqual(ap.anbieterPruefungAbgeschaltet, false);
    assert.throws(() => V.fuer(V.lies('stapel')), /Anbieterprüfung fehlt/, 'leerer Stapel-Block verweigert, auch wenn der Einzel-Block voll ist');
  }
  // 2. Stapel vollständig, Einzel leer: der Stapel liest seine eigenen Felder.
  {
    const d = baueDokument(); fuelle(d.stapel, { ...VOLL, methode: 'registerauszug', von: 'Prüfer B' });
    const V = lade(pruefQuelle, d.document);
    const ap = V.fuer(V.lies('stapel'));
    assert.strictEqual(ap.anbieterPruefung.methode, 'registerauszug');
    assert.strictEqual(ap.anbieterPruefung.geprueftVon, 'Prüfer B');
    assert.strictEqual(ap.anbieterPruefung.belegHash, HASH);
    assert.throws(() => V.fuer(V.lies('einzel')), /Anbieterprüfung fehlt/);
  }
  // 3. Schalter nur am Stapel: gilt für den Stapel, nicht für die Einzelausstellung.
  {
    const d = baueDokument(); fuelle(d.stapel, { ohne: true });
    const V = lade(pruefQuelle, d.document);
    assert.strictEqual(V.fuer(V.lies('stapel')).anbieterPruefungAbgeschaltet, true);
    assert.throws(() => V.fuer(V.lies('einzel')), /Anbieterprüfung fehlt/, 'Schalter des Stapels schaltet die Einzelausstellung nicht ab');
  }
  // 4. Beide leer: keine Ausstellung.
  {
    const V = lade(pruefQuelle, baueDokument().document);
    assert.throws(() => V.fuer(V.lies('einzel')), /Anbieterprüfung fehlt/);
    assert.throws(() => V.fuer(V.lies('stapel')), /Anbieterprüfung fehlt/);
  }
}

test('Markup: zwei Blöcke mit eigenen IDs, eigenen Radio-Gruppen und allen Feldern der Lesefunktion', () => {
  const { einzel, stapel } = baueDokument();
  assert.deepStrictEqual([einzel.id, stapel.id], ['apEinzelBlock', 'apStapelBlock']);
  for (const b of [einzel, stapel]) {
    for (const f of ['methode', 'geprueftAm', 'geprueftVon', 'beleg', 'ohne']) assert.ok(b.querySelector('[data-ap="' + f + '"]'), b.art + ': ' + f);
  }
  const namen = (b) => new Set(b.querySelectorAll('[data-ap="methode"]').map((r) => r.name));
  assert.strictEqual(namen(einzel).size, 1); assert.strictEqual(namen(stapel).size, 1);
  assert.notDeepStrictEqual([...namen(einzel)], [...namen(stapel)], 'eigene Radio-Gruppe je Block');
});

test('Echter Block → echte Prüfung: jede Ausstellungsart liest ihren eigenen Block', () => {
  faelle(PRUEF_JS());
});

test('Wächter: niemand liest den Pflichtblock aus dem ganzen Dokument; jede Lesestelle nennt ihre Art', () => {
  assert.doesNotMatch(HTML, /anbieterPruefungAusBlock\(\s*document\s*\)/, 'anbieterPruefungAusBlock(document) liest die Felder des ersten Blocks und keinen Beleg-Hash');
  const aufrufe = [...HTML.matchAll(/_anbieterPruefungAusOberflaeche\(([^)]*)\)/g)].map((m) => m[1].trim()).filter((a) => a !== 'art');
  assert.deepStrictEqual(aufrufe.sort(), ["'einzel'", "'stapel'"], 'genau eine Lesestelle je Ausstellungsart, Art als Literal');
  const einzelStelle = zwischen('async function onAusstellen', '\n}\n');
  assert.match(einzelStelle, /_anbieterPruefungAusOberflaeche\('einzel'\)/, 'Einzelausstellung liest den Einzel-Block');
  const stapelStelle = zwischen('_stapelLauf = await stapelAusstellen(', '});');
  assert.match(stapelStelle, /_anbieterPruefungAusOberflaeche\('stapel'\)/, 'Stapel liest den Stapel-Block');
});

test('Rot-Beweis: die frühere Lesestelle (ganzes Dokument) besteht dieselben Fälle nicht', () => {
  const alt = PRUEF_JS().replace(/function _anbieterPruefungAusOberflaeche\(art\) \{[\s\S]*?\n\}/,
    "function _anbieterPruefungAusOberflaeche() {\n  return (typeof anbieterPruefungAusBlock === 'function') ? anbieterPruefungAusBlock(document) : null;\n}");
  assert.notStrictEqual(alt, PRUEF_JS(), 'Mutation greift');
  assert.throws(() => faelle(alt));
});
