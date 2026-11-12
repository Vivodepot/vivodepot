'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B23, Zug 1 (31.10.2026): die Formatfolgen vor der Formatwahl.
   ────────────────────────────────────────────────────────────────────────
   `herausgabeFormatTraegt(sektorId, formatId)` sagt je Bereich und Format, welche Felder das
   Format trägt und welche nicht. Die Zuordnung ist dieselbe, aus der die Übersicht nach der
   Wahl ihren Satz „nicht mitgeschickt" bildet (`EXPORT_TOPF_B_FELDER`, über die gemeinsame
   Hilfsfunktion `_formatTraegtFeldNicht`) — keine zweite Kopie der Regel.
   Die Oberfläche (Halbsatz je Zeile des Auswahldialogs) baut eine andere Stelle; hier steht
   nur die Logik.
   Rot-Beweis: gegen den Stand vor B23 (vivodepot.html aus HEAD) fehlen `herausgabeFormatTraegt` und `_herausgabeFormateFuerBereich`; jede dieser Proben schlägt dort fehl.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZUSATZ = ['herausgabeFormatTraegt', '_herausgabeFormateFuerBereich', 'SEKTOREN', 'SEKTOR_BY_ID'];

function felderDesBereichs(V, sektorId) {
  const s = V.__zusatz.SEKTOR_BY_ID[sektorId];
  return (s.sektionen || []).flatMap((sek) => sek.felder || []);
}

test('[B23·Z1] herausgabeFormatTraegt: traegt ∪ nicht = alle Felder des Bereichs, traegt ∩ nicht = leer — für jeden Bereich und jedes angebotene Format', () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  const f = V.__zusatz.herausgabeFormatTraegt;
  const formateFuer = V.__zusatz._herausgabeFormateFuerBereich;
  assert.equal(typeof f, 'function', 'ROT ERWARTET vor dem Fix: herausgabeFormatTraegt fehlt');
  assert.equal(typeof formateFuer, 'function', 'ROT ERWARTET vor dem Fix: die Formatliste von flowHerausgeben ist nicht herausgezogen');
  let paare = 0, mitNicht = 0;
  for (const s of V.__zusatz.SEKTOREN) {
    const alle = felderDesBereichs(V, s.id).map((x) => x.label);
    for (const ex of formateFuer(s.id)) {
      const r = f(s.id, ex.format);
      paare++;
      if (r.nicht.length) mitNicht++;
      assert.deepEqual([...r.traegt, ...r.nicht].sort(), alle.slice().sort(), s.id + '/' + ex.format + ': traegt ∪ nicht ist nicht der ganze Bereich');
      const nichtMenge = new Set(r.nicht);
      assert.deepEqual(r.traegt.filter((l) => nichtMenge.has(l)), [], s.id + '/' + ex.format + ': ein Feld steht in beiden Listen');
    }
  }
  assert.ok(paare > 0, 'es gibt angebotene Formate');
  assert.ok(mitNicht > 0, 'mindestens ein Format trägt etwas nicht (sonst prüft die Probe nichts)');
});

test('[B23·Z1] herausgabeFormatTraegt: `nicht` ist genau das, was die Übersicht als nicht mitgeschickt führt', async () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const f = V.__zusatz.herausgabeFormatTraegt;
  const formateFuer = V.__zusatz._herausgabeFormateFuerBereich;
  let geprueft = 0;
  for (const s of V.__zusatz.SEKTOREN) {
    // Alle einfachen Textfelder füllen, damit die Übersicht jedes davon führt.
    for (const fd of felderDesBereichs(V, s.id)) {
      if ((fd.typ === 'text' || fd.typ === 'textarea') && !fd.codeListe) V.sektorFeldSetzen(s.id, fd.id, 'x');
    }
    for (const ex of formateFuer(s.id)) {
      const r = f(s.id, ex.format);
      const m = V.exportUebersichtModell(s.id, ex.format);
      for (const e of [...m.enthalten, ...m.zurueckgehalten]) {
        geprueft++;
        assert.equal(!!e.formatOhneZiel, r.nicht.includes(e.label),
          s.id + '/' + ex.format + '/' + e.feld + ': Übersicht und herausgabeFormatTraegt widersprechen sich');
      }
    }
  }
  assert.ok(geprueft > 0, 'die Übersicht führte Felder');
});

test('[B23·Z1·Klasse] flowExportUebersicht und die Übersicht benutzen die gemeinsame Hilfsfunktion, nicht eine eigene Kopie der Regel', () => {
  const a = KERN.indexOf('function flowExportUebersicht(');
  assert.ok(a > -1);
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(rumpf, /_formatTraegtFeldNicht\(/, 'flowExportUebersicht bildet formatFest über die gemeinsame Hilfsfunktion');
  assert.doesNotMatch(rumpf, /EXPORT_TOPF_B_FELDER/, 'keine eigene Lesart der Zuordnung in flowExportUebersicht');
  const g = KERN.indexOf('function herausgabeFormatTraegt(');
  assert.ok(g > -1, 'herausgabeFormatTraegt steht im Kern');
  assert.match(KERN.slice(g, KERN.indexOf('\n}\n', g)), /_formatTraegtFeldNicht\(/, 'herausgabeFormatTraegt nutzt dieselbe Hilfsfunktion');
  const stellen = KERN.match(/EXPORT_TOPF_B_FELDER/g) || [];
  const m = KERN.indexOf('function _formatTraegtFeldNicht(');
  assert.ok(m > -1);
  assert.equal(KERN.slice(m, KERN.indexOf('\n}\n', m)).includes('EXPORT_TOPF_B_FELDER'), true, 'die Zuordnung wird nur in der Hilfsfunktion gelesen');
  assert.equal(stellen.length, 2, 'die Tabelle: eine Deklaration, eine Lesestelle (die Hilfsfunktion)');
});
