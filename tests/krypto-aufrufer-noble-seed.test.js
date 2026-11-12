'use strict';
/* Befund KRYPTO-AUFRUFER-BLIND (02.11.2026, MITTEL): Wer gibt einen geheimen Ed25519-Seed in die eingebettete noble-ed25519?
   `_ed25519OeffentlichAusSeed(seed)` reicht den Seed an `getPublicKey`. Der Wächter tools/krypto-aufrufer-pruefen.js zählte nur die
   Übergabe ohne Aufrufklammer (`halterOeffentlichAusSeed`); ein direkter Aufruf fiel durch. Seit U2-ADR-501 Wagen V4 ruft der
   Antwortschlüssel je Stelle die Funktion direkt, seit dem Nachtrag U2-ADR-457 vom 02.11.2026 über `_ed25519SchluesselAusSeed`
   auch der Schlüssel je Datei-Ausgabe.
   Gehalten wird:
   - der Wächter zählt beide Formen (Aufruf und Übergabe als Wert), die Definition und Kommentare nicht;
   - Sollwert im Kern: genau ein direkter Aufruf, in `_ed25519SchluesselAusSeed`, und genau eine Übergabe als Wert, in
     `_halterSignaturHolen` (bis zum Rückbau der alten Kette, A253-Grundlinie); Grundlinie 2;
   - Lese-App, Studio und VC-Issuer nennen die Funktion nicht;
   - Rot-Beweise: ein zweiter direkter Aufruf fällt im Wächter und in der Stellenliste auf; das alte Muster sah ihn nicht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/krypto-aufrufer-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const GRUNDLINIE = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));
const NAME = '_ed25519OeffentlichAusSeed';
const SOLL = Object.freeze({ aufruf: ['_ed25519SchluesselAusSeed'], wert: ['_halterSignaturHolen'] });

/* Jede Nennung außerhalb der Definition und außerhalb von Kommentaren, mit der umgebenden Funktion und der Form. */
function stellen(quelle) {
  const zeilen = quelle.split('\n');
  const raus = [];
  let funktion = null;
  zeilen.forEach((z) => {
    const kopf = z.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (kopf) funktion = kopf[1];
    if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
    const ohneDefinition = z.replace(new RegExp('function\\s+' + NAME + '\\b'), '');
    const re = new RegExp('\\b' + NAME + '\\b(\\s*\\()?', 'g');
    let m;
    while ((m = re.exec(ohneDefinition))) raus.push({ funktion, form: m[1] ? 'aufruf' : 'wert' });
  });
  return raus;
}
function abweichungen(quelle) {
  const s = stellen(quelle);
  const fehler = [];
  for (const form of ['aufruf', 'wert']) {
    const ist = s.filter((x) => x.form === form).map((x) => x.funktion).sort();
    if (JSON.stringify(ist) !== JSON.stringify([...SOLL[form]].sort())) fehler.push(form + ': ' + ist.join(', ') + ' statt ' + SOLL[form].join(', '));
  }
  return fehler;
}
function zweiterAufruf(quelle) {
  const anker = 'async function sdjwtSchluesselJeAusgabe(';
  assert.equal(quelle.split(anker).length, 2, 'Vorbedingung: Anker genau einmal');
  return quelle.replace(anker, 'async function _fremdOeffentlich(s) { return _ed25519OeffentlichAusSeed(s); }\n' + anker);
}

test('[Noble·Seed] im Kern genau ein direkter Aufruf (_ed25519SchluesselAusSeed) und eine Übergabe als Wert (_halterSignaturHolen)', () => {
  assert.deepEqual(abweichungen(KERN), []);
});

test('[Noble·Seed·Wächter] der Wächter zählt beide Formen; Grundlinie und Messung stehen auf 2', () => {
  assert.equal(W.messen(KERN).halterOeffentlichAusSeed, 2, 'Aufruf und Übergabe gezählt, Definition nicht');
  assert.equal(GRUNDLINIE.operationen.halterOeffentlichAusSeed.anzahl, 2);
  assert.deepEqual(W.pruefen(W.messen(KERN), GRUNDLINIE), []);
});

test('[Noble·Seed·andere Oberflächen] Lese-App, Studio und VC-Issuer nennen die Funktion nicht', () => {
  for (const d of W.WEITERE_DATEIEN) {
    assert.equal(W.messenGanz(fs.readFileSync(path.join(REPO, d), 'utf8')).halterOeffentlichAusSeed, 0, d);
  }
});

test('[Noble·Seed·Rot-Beweis] ein zweiter direkter Aufruf fällt im Wächter und in der Stellenliste auf', () => {
  const neu = zweiterAufruf(KERN);
  assert.ok(abweichungen(neu).some((f) => /_fremdOeffentlich/.test(f)), 'Stellenliste');
  assert.ok(W.pruefen(W.messen(neu), GRUNDLINIE).some((f) => /halterOeffentlichAusSeed: 2 → 3/.test(f)), 'Wächter');
});

test('[Noble·Seed·Rot-Beweis·alt] das alte Muster ohne Aufrufklammer sah den direkten Aufruf nicht', () => {
  const alt = /\b_ed25519OeffentlichAusSeed\b(?!\s*\()/;
  const zaehle = (q) => q.split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z) && alt.test(z)).length;
  assert.equal(zaehle(zweiterAufruf(KERN)), zaehle(KERN), 'blind: derselbe Zählstand mit einem zweiten Aufruf');
  assert.notEqual(W.OPERATIONEN.halterOeffentlichAusSeed.source, alt.source, 'der Wächter trägt nicht mehr das alte Muster');
});

test('[Noble·Seed·Rot-Beweis·Zeile] zwei Aufrufe in einer Zeile zählen zwei, nicht einen', () => {
  const anker = 'async function sdjwtSchluesselJeAusgabe(';
  const neu = KERN.replace(anker, 'async function _zwei(s, t) { return [_ed25519OeffentlichAusSeed(s), _ed25519OeffentlichAusSeed(t)]; }\n' + anker);
  assert.equal(W.messen(neu).halterOeffentlichAusSeed, 4, 'eine Zeile, zwei Aufrufe');
  assert.ok(W.pruefen(W.messen(neu), GRUNDLINIE).some((f) => /halterOeffentlichAusSeed: 2 → 4/.test(f)));
  assert.equal(W.vorkommen(/\.sign\(/, 'a.sign(x); b.sign(y); Math.sign(z)'), 3, 'je Vorkommen; Math.sign schließt erst das Muster der Operation aus');
});
