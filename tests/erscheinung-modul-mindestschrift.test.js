'use strict';
/* Mindestschrift im unsignierten Erscheinungs-Modul (Befund ERSCHEINUNG-MINDESTSCHRIFT-UNSIGNIERT, 18.10.2026).
   erscheinungModulPruefen nahm jede Schriftgröße an, die wie ein Längenmaß aussah — auch 1px oder 0.1em. Ein unsigniertes Modul
   konnte damit Beschriftungen und Werte unlesbar klein machen. Jetzt gilt dieselbe Untergrenze wie für jede --fs-*-Größe eines
   Erscheinungsbilds: ERSCHEINUNGSBILD_REGELN.schriftMindestPx (U2-ADR-473, „Mindestgrößen: Schrift 10 px …“), rem und em mit 16 px. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const pruefen = (V, wert) => V.erscheinungModulPruefen({ moduleVersion: 1, label: wert });

test('[Erscheinung·Mindestschrift] unter der Untergrenze wird verworfen, ab ihr angenommen — px, rem und em', () => {
  const { V, html } = ladeKern();
  // Die Untergrenze aus dem Regelblock des Kerns (reines JSON, dieselbe Form, die der Bauweg liest).
  const grenze = Number((/"schriftMindestPx":\s*(\d+)/.exec(html) || [])[1]);
  assert.equal(grenze, 10, 'Vorbedingung: die Untergrenze des Kerns ist die aus U2-ADR-473');
  for (const zuKlein of ['1px', '9px', '0.5rem', '0.1em', '0.6em']) {
    const r = pruefen(V, zuKlein);
    assert.equal(r.gueltig, false, zuKlein + ' darf nicht gelten');
    assert.deepEqual(r.verworfene, [{ schluessel: 'label', grund: 'mindestgroesse' }], zuKlein);
  }
  for (const gross of ['10px', '0.625rem', '0.625em', '14px', '1.2rem']) {
    assert.equal(pruefen(V, gross).gueltig, true, gross + ' gilt');
  }
});

test('[Erscheinung·Mindestschrift·Rot-Beweis] der Prüfweg ohne Untergrenze (Stand vor dem Fix) nähme 1px an', () => {
  const { html } = ladeKern();
  const a = html.indexOf('function erscheinungModulPruefen(');
  const quelle = html.slice(a, html.indexOf('\n}\n', a));
  assert.match(quelle, /ERSCHEINUNGSBILD_REGELN\.schriftMindestPx/, 'der Prüfweg liest die Untergrenze des Kerns');
  // Der Stand vor dem Fix prüfte nur die Form: genau dieses Muster ließ 1px durch.
  const vorher = /^\d+(\.\d+)?(px|rem|em)$/;
  assert.equal(vorher.test('1px'), true, 'die reine Formprüfung ließe 1px gelten — sonst prüfte die Probe oben nichts');
});

test('[Erscheinung·Mindestschrift·Fließtext] die Rolle „wert“ (.feld-wert) trägt die Fließtext-Grenze', () => {
  const { V, html } = ladeKern();
  const fliesstext = Number((/"mindestPx":\s*\{[^}]*"--fs-base":\s*(\d+)/.exec(html) || [])[1]);
  assert.equal(fliesstext, 14, 'Vorbedingung: die Fließtext-Grenze des Kerns ist die aus U2-ADR-473');
  const wert = (w) => V.erscheinungModulPruefen({ moduleVersion: 1, wert: w });
  for (const zuKlein of ['10px', '13px', '0.8rem', '0.85em']) {
    assert.deepEqual(wert(zuKlein).verworfene, [{ schluessel: 'wert', grund: 'mindestgroesse' }], zuKlein + ' ist für Fließtext zu klein');
  }
  for (const gross of ['14px', '0.875rem', '1rem']) assert.equal(wert(gross).gueltig, true, gross);
  // Gegenprobe: dieselbe Größe gilt für eine Beschriftung, die keine Fließtext-Rolle ist.
  assert.equal(V.erscheinungModulPruefen({ moduleVersion: 1, label: '10px' }).gueltig, true);
});

