'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Aufenthaltstitel („Aufenthaltstitel", 10.08.2026, Anschluss M1/A138)
   ────────────────────────────────────────────────────────────────────────
   Ein befristeter Aufenthaltstitel ist die Sorte Frist, deren Versäumnis
   existenzielle Folgen hat. Sechs neue, ALLE optionale identitaet-Felder,
   strukturell dieselbe Kategorie wie Personalausweis/Reisepass. ANDERS als
   dort: KEIN berechneter Vorschlag für aufenthaltstitel_gueltig — die Frist
   hängt von Art und Grundlage ab, ein geratenes Datum wäre hier die
   gefährlichste Fehlerklasse (dieselbe Lage/Entscheidung wie beim
   Führerschein).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): fünf der sechs Felder (alle außer
// `aufenthaltstitel_art`, das ist Korb 2) sind zu Unterfeldern der Liste `aufenthaltstitel`
// geworden. `aufenthaltstitel_art` bleibt als eigenständiges Flachfeld daneben stehen.
test('[Aufenthaltstitel] `aufenthaltstitel_art` bleibt Flachfeld, die übrigen fünf sind jetzt Unterfelder der Liste', () => {
  const { V } = ladeKern();
  const idFelder = V.SEKTOR_BY_ID.identity.sektionen.flatMap(s => s.felder);
  const art = idFelder.find(x => x.id === 'residencePermitType');
  assert.ok(art, 'aufenthaltstitel_art existiert weiterhin als Flachfeld');
  assert.equal(art.typ, 'text');
  assert.equal(art.sensibel, true);

  const liste = idFelder.find(x => x.id === 'residencePermit');
  assert.equal(liste.typ, 'liste');
  const erwartet = { number: 'text', issuedOn: 'datum', validUntil: 'datum', responsibleImmigration: 'text', fileReferenceNumber: 'text' };
  for (const [id, typ] of Object.entries(erwartet)) {
    const u = liste.unterFelder.find(x => x.id === id);
    assert.ok(u, id + ' existiert als Unterfeld');
    assert.equal(u.typ, typ, id + ' hat Typ ' + typ);
    assert.equal(u.sensibel, true, id + ' ist sensibel:true — mindestens dieselbe Einstufung wie ausweis/reisepass_nr');
  }
});

test('[Aufenthaltstitel] aufenthaltstitel_art bleibt Freitext mit Vorschlägen, kein geschlossener Katalog', () => {
  const { V } = ladeKern();
  const idFelder = V.SEKTOR_BY_ID.identity.sektionen.flatMap(s => s.felder);
  const f = idFelder.find(x => x.id === 'residencePermitType');
  assert.equal(f.typ, 'text', 'text, nicht auswahl — kein fester Katalog');
  assert.ok(Array.isArray(f.vorschlaege) && f.vorschlaege.length >= 3, 'trägt Vorschläge als Bequemlichkeit');
  assert.equal(f.optionen, undefined, 'keine optionen — sonst wäre es doch ein geschlossener Katalog');
});

test('[Aufenthaltstitel] kein berechneter Vorschlag für aufenthaltstitel_gueltig — schon vorher, gilt unverändert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Aufenthaltstitel-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'birthDate', '1990-01-01');
  V.listenEintragHinzufuegen('identity', 'residencePermit', { system: '', issuedOn: '2026-01-01' });
  const text = V._fristHinweisFuerFeld('aufenthaltstitel_gueltig', null, V.getData().sektoren.identity, new Date('2026-08-11'));
  assert.equal(text, '', 'kein Vorschlag — war schon vorher nicht im Vorschlags-Registry verdrahtet, gilt unverändert');
});

test('[Aufenthaltstitel] die Liste ist optional — ein leeres Depot bricht mit keinem der Felder', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Aufenthaltstitel-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  await V.depotSerialisieren('Aufenthaltstitel-Test-2026!');
  const d = V.getData();
  assert.equal((d.sektoren.identity || {}).residencePermitType, undefined, 'nichts gesetzt, kein Default erfunden');
  assert.equal((d.sektoren.identity || {}).residencePermit, undefined, 'auch die Liste bleibt ungesetzt, kein leeres Array erfunden');
});

/* ── Zug 2: Fristen-Anbindung — genau die Lücke, die M1 Zug 4 aufdeckte (Feld im Katalog, aber
   graue Zeile ohne zweite manuelle Eingabe). Beide Stellen geprüft, nicht angenommen. */
test('[Aufenthaltstitel] standardDokumente trägt einen Ablauf-getriebenen Eintrag über die Liste + ihr Gültigkeits-Unterfeld', () => {
  const { V } = ladeKern();
  const alle = V.alleStandardDokumente();
  const eintrag = alle.find(d => d.typ === 'residence-permit');
  assert.ok(eintrag, 'standardDokumente-Eintrag existiert');
  assert.equal(eintrag.sektorId, 'identity');
  assert.equal(eintrag.empfRhythmusMonate, null, 'kein fester Rhythmus — das Ablaufdatum führt, wie bei schwerbehindertenausweis');
  assert.equal(eintrag.felder[0].feldId, 'residencePermit');
  assert.equal(eintrag.felder[0].unterfeldId, 'validUntil');
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): ERKENNUNG_LEITFELDER.aufenthaltstitel ist
// ENTFALLEN, nicht nur ungenutzt — ein `leitfeld`-Zeiger erwartet einen Skalarwert, und
// `aufenthaltstitel_gueltig` ist seither ein Listen-Unterfeld. Die „Dokument erkannt"-
// Vorschlagskarte für den Aufenthaltstitel fehlt darum bewusst (dokumentierter Gap, s.
// Kommentar am Kern) — eine Dedup-Regel für MEHRERE erkannte Aufenthaltstitel ist eine
// Produktentscheidung, keine, die dieser Bau trifft. Die Prüftermine bleiben erhalten
// (s. `korb1-mehrwertig-pruefermine.test.js`), nur die Erkennungskarte nicht.
test('[Aufenthaltstitel] ERKENNUNG_LEITFELDER kennt den Typ nicht mehr — dokumentierter Gap, kein Absturz', async () => {
  const { V } = ladeKern();
  assert.equal(V.ERKENNUNG_LEITFELDER.aufenthaltstitel, undefined,
    'der Typ ist entfallen, seit aufenthaltstitel_gueltig eine Liste ist');
  await V.depotAnlegen('Aufenthaltstitel-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.listenEintragHinzufuegen('identity', 'residencePermit', { system: '', validUntil: '2020-01-01' });
  assert.equal(V.erkennungsVorschlagFuer('residencePermit'), false,
    'kein Absturz, kein Vorschlag — der Typ existiert im Register nicht mehr');
});
