'use strict';
/* Situationsblatt und Sensibel-Überschreibung (19.09.2026). Drei Stellen im Situationsblatt lasen das
   Schema-Flag `f.sensibel` direkt; die Überschreibung der Inhaberin (data.sensibelFelder) sahen sie nicht.
   Jetzt läuft alles über feldIstSensibel; tools/sensibel-direktlesung-pruefen.js bewacht die Klasse. */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const W = require('../tools/sensibel-direktlesung-pruefen.js');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(W.KERN, 'utf8');
const GRUNDLINIE = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));

describe('Wächter — direkte Lesung von .sensibel', () => {
  test('der Kern: jede direkte Lesung steht mit Grund in der Grundlinie, kein Eintrag ohne Fund', () => {
    const funde = W.direkteLesungen(KERN);
    assert.ok(funde.length >= 10, 'Vorbedingung: der Suchraum ist besetzt (' + funde.length + ')');
    assert.deepEqual(W.pruefe(funde, GRUNDLINIE).probleme, []);
  });

  test('Rot-Beweis: die alten drei Stellen des Situationsblatts sind ohne Eintrag rot', () => {
    const alt = ['        if (druck && f.sensibel) continue;   // sensibel: nicht im Druck/Akut',
      '        if (f.sensibel && !druck) {', '        if (f.sensibel) continue;   // sensibel: nicht ins PDF'].join('\n');
    const funde = W.direkteLesungen(alt);
    assert.equal(funde.length, 3, 'der Wächter erkennt alle drei');
    assert.equal(W.pruefe(funde, { erlaubt: {} }).probleme.length, 3);
  });

  test('Rot-Beweis: eine neue direkte Lesung im Kern macht den Wächter rot', () => {
    const funde = W.direkteLesungen(KERN + '\n  if (feld.sensibel) continue;\n');
    const r = W.pruefe(funde, GRUNDLINIE);
    assert.equal(r.probleme.length, 1);
    assert.match(r.probleme[0], /ohne Eintrag/);
  });

  test('Gegenprobe: Schreiben, Kommentare, Optionen und CSS-Klassen zählen nicht als Lesung', () => {
    const text = ['def.sensibel = true;', '// wer f.sensibel liest', '/* f.sensibel', '   x.sensibel */', 'if (opt.sensibel) {}', 'const c = ".sensibel-schloss";', 'x.zurueckgehalten.sensibel'].join('\n');
    assert.deepEqual(W.direkteLesungen(text), []);
  });

  test('nur sinkend: ein Eintrag ohne Fund ist ein Fehler', () => {
    const r = W.pruefe([], { erlaubt: { 'return !!feld.sensibel;': 'x' } });
    assert.equal(r.probleme.length, 1);
    assert.match(r.probleme[0], /ohne Fund/);
  });
});

describe('Situationsblatt — Überschreibung der Inhaberin wirkt', () => {
  const SIT = { id: 'probe', titel: 'Probe', bloecke: [{ titel: 'B', eintraege: [
    { feld: { id: 'offen', typ: 'text', label: 'Offen', sensibel: false } },
    { feld: { id: 'schutz', typ: 'text', label: 'Schutz', sensibel: true } }] }] };
  async function modell(ueberschreibungen) {
    const { V } = ladeKern();
    await V.depotAnlegen('Situationsblatt-Sensibel-2026');
    const d = V.getData();
    d.situationen = Object.assign({}, d.situationen, { probe: { offen: 'WERT-OFFEN', schutz: 'WERT-SCHUTZ' } });
    V.setData(d);
    for (const [feld, an] of ueberschreibungen || []) V.sensibelFeldSetzen('sit:probe', feld, an);
    const m = V.situationModell(SIT);
    return m.bloecke.flatMap((b) => b.zeilen).map((z) => z.wert);
  }

  test('ohne Überschreibung wie bisher: das Vorgabe-sensible Feld fehlt, das offene steht', async () => {
    const werte = await modell([]);
    assert.ok(werte.includes('WERT-OFFEN') && !werte.includes('WERT-SCHUTZ'));
  });

  test('Rot-Beweis: was die Inhaberin zusätzlich zurückhält, erscheint nicht im Situationsblatt-PDF', async () => {
    const werte = await modell([['offen', true]]);
    assert.ok(!werte.includes('WERT-OFFEN'), 'ROT ERWARTET, wenn falsch: das zurückgehaltene Feld steht im Blatt');
  });

  test('was die Inhaberin ausdrücklich freigibt, steht im Blatt (Sensibel ist eine Voreinstellung)', async () => {
    const werte = await modell([['schutz', false]]);
    assert.ok(werte.includes('WERT-SCHUTZ'));
  });
});
