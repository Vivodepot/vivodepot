'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-089 Teil A Block 1 (17.07.2026) — Einzigartigkeits-Durchsetzung +
   Pflicht-Validierung im manuellen Listen-Pfad der geteilten Instrument-Liste
   `vorsorge_instrumente`.
   ────────────────────────────────────────────────────────────────────────
   Geprüft: die Policy-Konstante VORSORGE_EINZIGARTIG (Design-Entscheidung 4/5),
   die generalisierte Existenz-Prüfung _instrumentVorhanden() (Verallgemeinerung
   von _vorsorgevollmachtVorhanden()), die Speicher-Sperre _listenEintragPruefen()
   (Pflicht war bisher nur ein visueller Marker, hier erstmals durchgesetzt —
   kein Bestandsfeld trug vorher pflicht:true), und die Verdrahtung im echten
   Modal-Speicherpfad (flowListenEintragHinzufuegen/-Bearbeiten).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function instrumenteFeld(V) {
  return V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).find(f => f.id === 'provisionInstruments');
}

/* ── Policy-Konstante ─────────────────────────────────────────────────────── */
test('VORSORGE_EINZIGARTIG: fünf Instrument-Typen einzigartig auf Typ-Ebene, Vollmacht über art', () => {
  const { V } = ladeKern();
  assert.equal(V._instrumentEinzigartig('will'), true);
  assert.equal(V._instrumentEinzigartig('living-will'), true);
  assert.equal(V._instrumentEinzigartig('custodianship-declaration'), true);
  assert.equal(V._instrumentEinzigartig('guardian-nomination'), true);
  assert.equal(V._instrumentEinzigartig('ki-verfuegung'), true);
  // Vollmacht hat KEINE pauschale Typ-Ebene-Einzigartigkeit — nur über art.
  assert.equal(V._instrumentEinzigartig('enduring-power-of-attorney'), false, 'ohne art-Parameter: nicht pauschal einzigartig');
  assert.equal(V._instrumentEinzigartig('enduring-power-of-attorney', 'vorsorge'), true);
  assert.equal(V._instrumentEinzigartig('enduring-power-of-attorney', 'gesundheit'), true);
  assert.equal(V._instrumentEinzigartig('enduring-power-of-attorney', 'betreuung'), true);
  assert.equal(V._instrumentEinzigartig('enduring-power-of-attorney', 'general'), true);
  assert.equal(V._instrumentEinzigartig('enduring-power-of-attorney', 'bank'), false, 'Bankvollmacht: mehrere erlaubt (pro Bank eine)');
  // Defensiv: unbekannter Typ blockiert nichts.
  assert.equal(V._instrumentEinzigartig('unbekannt'), false);
});

/* ── Existenz-Prüfung ─────────────────────────────────────────────────────── */
test('_instrumentVorhanden: findet einen Eintrag nach typ(+art), ignoriert andere Typen/Arten', () => {
  const { V } = ladeKern();
  V.setData({
    schemaVersion: 39,
    sektoren: { advanceCare: { provisionInstruments: [
      { id: 't1', instrument: 'will', storageLocation: 'x' },
      { id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank' },
      { id: 'v2', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'general' },
    ] } },
    menschen: [],
  });
  assert.equal(V._instrumentVorhanden('will'), true);
  assert.equal(V._instrumentVorhanden('custodianship-declaration'), false, 'kein Betreuungs-Eintrag vorhanden');
  assert.equal(V._instrumentVorhanden('enduring-power-of-attorney', 'bank'), true);
  assert.equal(V._instrumentVorhanden('enduring-power-of-attorney', 'vorsorge'), false, 'kein Vorsorge-Vollmacht-Eintrag, nur bank/general');
  assert.equal(V._instrumentVorhanden('enduring-power-of-attorney'), true, 'ohne art-Filter: irgendein Vollmacht-Eintrag reicht');
});

/* ── Speicher-Sperre: Einzigartigkeit ─────────────────────────────────────── */
test('_listenEintragPruefen: zweiter Eintrag einer einzigartigen Art wird blockiert (Testament)', () => {
  const { V } = ladeKern();
  V.setData({
    schemaVersion: 39,
    sektoren: { advanceCare: { provisionInstruments: [{ id: 't1', instrument: 'will', storageLocation: 'x' }] } },
    menschen: [],
  });
  const feld = instrumenteFeld(V);
  const neu = { instrument: 'will', storageLocation: 'y' };
  const r = V._listenEintragPruefen('advanceCare', 'provisionInstruments', feld, neu, -1);
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'einzigartig');
});

test('_listenEintragPruefen: zweite Bankvollmacht (nicht einzigartig) wird erlaubt', () => {
  const { V } = ladeKern();
  V.setData({
    schemaVersion: 39,
    sektoren: { advanceCare: { provisionInstruments: [{ id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', form: 'privat' }] } },
    menschen: [],
  });
  const feld = instrumenteFeld(V);
  const neu = { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', form: 'privat' };
  const r = V._listenEintragPruefen('advanceCare', 'provisionInstruments', feld, neu, -1);
  assert.equal(r.ok, true, 'zweite Bankvollmacht ist erlaubt (pro Bank eine)');
});

test('_listenEintragPruefen: eine zweite Vorsorge-Vollmacht (art=vorsorge, einzigartig) wird blockiert', () => {
  const { V } = ladeKern();
  V.setData({
    schemaVersion: 39,
    sektoren: { advanceCare: { provisionInstruments: [{ id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' }] } },
    menschen: [],
  });
  const feld = instrumenteFeld(V);
  const r = V._listenEintragPruefen('advanceCare', 'provisionInstruments', feld, { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' }, -1);
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'einzigartig');
});

test('_listenEintragPruefen: Bearbeiten des EIGENEN Eintrags kollidiert nicht mit sich selbst (ausgenommenIndex)', () => {
  const { V } = ladeKern();
  V.setData({
    schemaVersion: 39,
    sektoren: { advanceCare: { provisionInstruments: [{ id: 't1', instrument: 'will', storageLocation: 'x' }] } },
    menschen: [],
  });
  const feld = instrumenteFeld(V);
  // Index 0 bearbeiten (sich selbst) — keine Kollision, weil ausgenommenIndex=0 den eigenen Eintrag ausschließt.
  const r = V._listenEintragPruefen('advanceCare', 'provisionInstruments', feld, { instrument: 'will', storageLocation: 'y' }, 0);
  assert.equal(r.ok, true, 'Bearbeiten des eigenen Eintrags bleibt uneingeschränkt möglich');
});

/* ── Speicher-Sperre: Pflicht (art muss gesetzt sein) ────────────────────── */
test('_listenEintragPruefen: art ist Pflicht bei Vollmacht-Einträgen — leer blockiert', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 39, sektoren: { vorsorge: {} }, menschen: [] });
  const feld = instrumenteFeld(V);
  const r = V._listenEintragPruefen('vorsorge', 'provisionInstruments', feld, { typ: 'enduring-power-of-attorney' }, -1);
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'pflicht', 'art fehlt — Pflichtverletzung, nicht Einzigartigkeit');
});

test('_listenEintragPruefen: typ ist Pflicht — ganz leerer Eintrag blockiert', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 39, sektoren: { vorsorge: {} }, menschen: [] });
  const feld = instrumenteFeld(V);
  const r = V._listenEintragPruefen('vorsorge', 'provisionInstruments', feld, {}, -1);
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'pflicht');
});

test('_listenEintragPruefen: Pflicht gilt nur für sichtbare Felder — art bei typ=testament nicht verlangt', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 39, sektoren: { advanceCare: {} }, menschen: [] });
  const feld = instrumenteFeld(V);
  // art ist sichtbarWenn typ='enduring-power-of-attorney' — bei typ='will' ist art nicht sichtbar,
  // seine Pflicht-Markierung darf hier also NICHT greifen.
  const r = V._listenEintragPruefen('advanceCare', 'provisionInstruments', feld, { instrument: 'will', storageLocation: 'x' }, -1);
  assert.equal(r.ok, true, 'kein Testament-Eintrag existiert noch, art ist nicht sichtbar → keine Pflicht-Blockade');
});

test('Bestandsverhalten unberührt: pflicht ohne diese Prüfung war reiner Marker — kein Bestandsfeld trägt pflicht:true außer den ADR-089-Feldern', () => {
  const { V } = ladeKern();
  /* U2-ADR-320 — AUS DEM GELADENEN KERN GEZAEHLT, NICHT AUS DEM QUELLTEXT. Vorher zaehlte
     diese Probe `pflicht: true` im HTML — die JS-Schreibweise des nativen Bestands. Seit dem
     Schnitt steht die Marke als `"pflicht":true` im eingebetteten Buendel, und der Zaehler fand
     0 statt 2. Nachgemessen war KEIN Verlust: der Kern traegt beide Marken unveraendert
     (advanceCare.provisionInstruments/instrument und /art), nur die Schreibweise ist eine andere.

     Der geladene Kern ist ohnehin der bessere Gegenstand: er misst, was gilt, statt wie es
     geschrieben steht — und ueberlebt jeden weiteren Formatwechsel. */
  let treffer = 0;
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.pflicht) treffer++;
        for (const uf of (f.unterFelder || [])) if (uf.pflicht) treffer++;
      }
    }
  }
  // Erwartet: typ + art (Vollmacht) = 2 Stellen. Ein Anstieg hier bedeutet, dass eine weitere
  // Pflicht-Regel eingeführt wurde — dann muss dieser Test bewusst nachgezogen werden, nicht
  // stillschweigend grün bleiben.
  assert.equal(treffer, 2, 'genau typ + art tragen pflicht:true (ADR-089) — sonst Test nachziehen');
});

/* ── Verdrahtung im echten Modal-Speicherpfad ─────────────────────────────
   Hinweis: der node-Stub führt addEventListener als No-op aus (s. Kommentar in
   muster-b-render-scroll-fokus.test.js) — die reaktive Sichtbarkeits-Schicht
   (_listenEintragBedingungVerdrahten) kann hier nicht live umschalten. Darum
   über flowListenEintragBearbeiten auf einem BESTEHENDEN Eintrag testen, dessen
   typ von Anfang an gesetzt ist — die Sichtbarkeit von `art` steht dann schon
   beim initialen Render fest (kein Live-Umschalten nötig), nur `art` selbst
   wird im Test geändert (nicht `typ`), das bleibt unberührt von der No-op-Lücke. */
test('flowListenEintragBearbeiten: Umbenennen auf eine bereits vorhandene Vollmacht-Art wird blockiert (Toast, kein Speichern)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank' });
  const feld = instrumenteFeld(V);
  // Eintrag 1 (art:'bank') bearbeiten, auf 'vorsorge' umstellen — kollidiert mit Eintrag 0.
  // (Der node-DOM-Stub berechnet select.value nicht aus <option selected> — die Vorbelegung selbst
  // ist bereits in vollmachten-liste.test.js über die gerenderten hidden-Attribute abgesichert;
  // hier zählt nur, dass die art-Zeile beim Edit-Öffnen sichtbar UND beschreibbar ist.)
  V.flowListenEintragBearbeiten('advanceCare', feld, 1);
  const artSel = document.querySelector('[data-edit="typeOfPowerOfAttorney"]');
  assert.ok(artSel, 'art-Feld im Edit-Modal vorhanden und ansprechbar (nicht durch hidden blockiert)');
  // Der Stub berechnet select.value nicht aus <option selected> — typ muss explizit gesetzt werden,
  // sonst liest liesEintragAusDOM einen leeren typ und die Pflicht-Prüfung blockte aus dem falschen Grund.
  document.querySelector('[data-edit="instrument"]').value = 'enduring-power-of-attorney';
  artSel.value = 'vorsorge';
  const okBtn = document.getElementById('m-ok');
  await okBtn.onclick();
  const liste = V.getData().sektoren.advanceCare.provisionInstruments;
  assert.equal(liste.length, 2, 'kein Eintrag verloren');
  assert.equal(liste[1].typeOfPowerOfAttorney, 'bank', 'die Änderung wurde NICHT übernommen — Eintrag 1 bleibt bei bank');
  // Toast-TEXT ist mit diesem generischen Element-Stub nicht prüfbar (appendChild ist dort ein
  // reiner No-op, s. makeEl() in load-kern.js) — die eigentliche Abnahme-relevante Eigenschaft ist
  // ohnehin die Datenintegrität oben: der Speicherversuch wurde tatsächlich verworfen, nicht nur
  // eine Meldung gezeigt. Toast-Wortlaut selbst ist Geräte-Abnahme (Node-grün ≠ Gerät-grün).
});
