'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A436 (21.08.2026) — Parität an der Ereignis-Achse für angedockte Felder.
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN VOR DEM BAU (`tools/modul-feld-ereignis-messen.js`, mit
   Positivkontrolle): dasselbe Feld — `typ:'ref'`, `entitaet:'person'` —
   schlug im eingebauten Katalog an und blieb als angedocktes Modul-Feld
   unsichtbar. Der Wächter meldete `[]` und sagte damit „sauber" über eine
   Klasse, die er nie angesehen hatte.

   ENTSCHIEDEN am 21.08.2026: Parität, nicht melden. Die
   Bürgerin sieht ihrem Depot nicht an, welches Feld aus einem Modul kam.
   Zwei Klassen von Daten mit verschiedenen Zusagen, und keine davon
   erkennbar, ist der schlechtere Zustand als der Bau.

   WAS PARITÄT HIER HEISST — und was nicht: dieselbe REGEL, nicht dasselbe
   Ergebnis um jeden Preis. Ein angedocktes LISTEN-Feld mit Personen-Unterfeld
   bekommt dieselbe Markierung an derselben Dokument-Zeile wie ein eingebautes.
   Ein angedocktes FLACHES Feld trifft dieselbe strukturelle Grenze wie seine
   eingebauten Geschwister `erben`/`pv_beistand_personen`: ohne Zeile gibt es
   keinen Dokument-Träger. Beides ist hier belegt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-08-21T12:00:00.000Z');

/* Dateilokale Diskriminante (s. tests/pruefstand-bindung.js): ohne sie kann der Prüfstand
   die Wächter dieser Datei nicht instrumentieren. */
function depotMitAngedocktemMandat(V, unterFelder) {
  const d = V.leeresDepot();
  V.setData(d);
  d.menschen.push({ id: 'p-1', vorname: 'Mara', nachname: 'Bevoll' });
  d.feldDefinitionen = [{
    sektorId: 'advanceCare', feldId: 'modul_mandate', typ: 'liste', label: 'Mandate (Modul)',
    unterFelder,
  }];
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.modul_mandate = [{ id: 'm-1', bezeichnung: 'Kammer-Mandat', vertreter: { ref: 'p-1' } }];
  return d;
}
const MANDAT_FELDER = [
  { id: 'registrationPlate', typ: 'text', label: 'Bezeichnung' },
  { id: 'vertreter', typ: 'ref', entitaet: 'person', label: 'Vertretung' },
];

test('[A436] der Sammler betritt den angedockten Weg — vorher tat er es nicht', () => {
  const { V } = ladeKern();
  depotMitAngedocktemMandat(V, MANDAT_FELDER);
  const alle = V._ereignisAlleEntitaetPersonFelder();
  const treffer = alle.find((f) => f.feldId === 'modul_mandate' && f.unterFeldId === 'vertreter');
  assert.ok(treffer, 'das angedockte Personen-Unterfeld ist im Sammler');
  assert.equal(treffer.angedockt, true, 'und es ist als angedockt erkennbar');
});

test('[A436·Rot-Beweis] Positivkontrolle: derselbe Feldtyp, zwei Orte — beide werden gesehen', () => {
  /* Die Kontrolle aus der Messung, jetzt als Dauerprobe. Ohne sie wäre „der Wächter findet
     nichts" nicht von „der Wächter läuft nicht" zu unterscheiden — genau die stumme Sorte, die
     A436 überhaupt erst gefunden hat. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const fingiert = { id: 'probe_person_ref', label: 'Probe', typ: 'ref', entitaet: 'person' };

  const sek = V.SEKTOREN.find((x) => x.id === 'identity');
  sek.sektionen[0].felder.push(fingiert);
  const imKatalog = V._ereignisAlleEntitaetPersonFelder().some((f) => f.feldId === 'probe_person_ref');
  sek.sektionen[0].felder.pop();

  d.feldDefinitionen = [{ sektorId: 'identity', feldId: 'probe_person_ref', typ: 'ref', entitaet: 'person', label: 'Probe' }];
  const imModul = V._ereignisAlleEntitaetPersonFelder().some((f) => f.feldId === 'probe_person_ref');

  assert.equal(imKatalog, true, 'Vorbedingung: im eingebauten Katalog wird es gesehen');
  assert.equal(imModul, true, 'ROT VOR A436: als angedocktes Modul-Feld wurde es NICHT gesehen');
});

test('[A436·Rot-Beweis] dieselbe Markierung, dieselbe Zeile im Dokument', () => {
  const { V } = ladeKern();
  const d = depotMitAngedocktemMandat(V, MANDAT_FELDER);

  const ziele = V._ereignisBetroffeneZeilenIds('p-1', 'tod');
  assert.deepEqual(ziele, [{ sektorId: 'advanceCare', feldId: 'modul_mandate', zeilenId: 'm-1' }],
    'ROT VOR A436: die Achse fand die angedockte Zeile nicht');

  const markiert = V.ereignisMarkieren('tod', 'p-1', JETZT);
  assert.equal(markiert.length, 1, 'genau ein Dokument markiert');
  const doc = d.dokumente.find((x) => x.id === markiert[0]);
  assert.deepEqual(doc.felder, [{ sektorId: 'advanceCare', feldId: 'modul_mandate', zeilenId: 'm-1' }],
    'das Dokument hängt an DER Zeile, nicht an einer erfundenen');
  assert.deepEqual(doc.ereignisAnlaesse.map((a) => a.typ), ['tod'],
    'und trägt den Anlass — dieselbe Markierung wie ein eingebautes Feld');
});

test('[A436] das eingebaute Feld verhält sich unverändert — die Öffnung nimmt nichts weg', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  d.menschen.push({ id: 'p-1', vorname: 'Mara', nachname: 'Bevoll' });
  d.sektoren.advanceCare = { provisionInstruments: [{ id: 'z-1', instrument: 'enduring-power-of-attorney', authorizedPersons: { ref: 'p-1' } }] };
  const markiert = V.ereignisMarkieren('tod', 'p-1', JETZT);
  assert.equal(markiert.length, 1);
  const doc = d.dokumente.find((x) => x.id === markiert[0]);
  assert.deepEqual(doc.felder, [{ sektorId: 'advanceCare', feldId: 'provisionInstruments', zeilenId: 'z-1' }]);
  assert.deepEqual(doc.ereignisAnlaesse.map((a) => a.typ), ['tod']);
});

test('[A436] ein angedocktes Personen-Feld ist kein Wächter-Fund mehr — es ist Teil der Achse', () => {
  const { V } = ladeKern();
  depotMitAngedocktemMandat(V, MANDAT_FELDER);
  assert.deepEqual(V.ereignisAchseWaechterFunde(), [],
    'die Registry kann ein Modul-Feld nicht kennen — es fällt unter die Regel, nicht unter die Liste');
});

test('[A436] die Standardmenge ist personenscharf: familienstand und tod, nicht betreuung/geburt', () => {
  const { V } = ladeKern();
  depotMitAngedocktemMandat(V, MANDAT_FELDER);
  assert.deepEqual([...V.EREIGNIS_ACHSE_ANGEDOCKT_STANDARD], ['familienstand', 'tod']);
  for (const typ of ['familienstand', 'tod']) {
    assert.equal(V._ereignisBetroffeneZeilenIds('p-1', typ).length, 1, typ + ' greift');
  }
  for (const typ of ['emergencyCarePersonContact', 'geburt']) {
    /* Beide markieren Zeilen eines TYPS unabhängig davon, wer darin steht — sie setzen Wissen
       über die Bedeutung des Feldes voraus, das ein Modul heute nirgends erklären kann. */
    assert.equal(V._ereignisBetroffeneZeilenIds('p-1', typ).length, 0, typ + ' greift bewusst nicht');
  }
});

test('[A436] ein angedocktes FLACHES Personen-Feld trifft dieselbe Grenze wie erben — benannt, nicht still', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  d.menschen.push({ id: 'p-1', vorname: 'Mara', nachname: 'Bevoll' });
  d.feldDefinitionen = [{ sektorId: 'advanceCare', feldId: 'modul_bezugsperson', typ: 'ref', entitaet: 'person', label: 'Bezugsperson' }];
  d.sektoren.advanceCare = { modul_bezugsperson: { ref: 'p-1' } };

  const feld = V._ereignisAlleEntitaetPersonFelder().find((f) => f.feldId === 'modul_bezugsperson');
  assert.ok(feld, 'der Sammler sieht es');
  const eintrag = V._ereignisAchseEintragFuer(feld);
  assert.ok(eintrag.ausgenommen, 'und die Achse benennt die Grenze, statt zu schweigen');
  assert.match(eintrag.ausgenommen, /ohne Zeilen-Bezug/);
  // Dieselbe Grenze wie beim eingebauten Geschwister — Parität heisst dieselbe Regel.
  const erben = V.EREIGNIS_ACHSE_FELDER.find((e) => e.feldId === 'heirsBriefOverview');
  assert.ok(erben && erben.ausgenommen, 'Vorbedingung: das eingebaute flache Feld ist ebenso ausgenommen');
});
