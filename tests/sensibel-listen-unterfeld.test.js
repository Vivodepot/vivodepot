'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Sensibel-Architektur", 09.08.2026, Zug 1 — dritte
   Adressierungsebene: sektorId × listeId × unterfeldId.

   Befund (Auftrag, Liste 1): `sensibel: true` an einem Listen-Unterfeld
   (z. B. `konten.iban`) ist heute WIRKUNGSLOS — die Export-Wege prüfen
   `feldIstSensibel` nur am TOP-LEVEL-Feld (der ganzen Liste `accounts`), nie
   an den einzelnen Unterfeldern der Zeilen. Ein Konto mit sensibler IBAN
   ging bislang komplett heraus, sobald die Liste selbst nicht sensibel war.

   Adressierung: dieselbe Selektor-Schreibweise wie beim Lesen (U2-ADR-096,
   `liste:<listeId>:<typwert>:<unterfeldId>`), keine zweite erfunden — nur
   mit `typWert = '*'` als Platzhalter für Listen ohne Diskriminante (die
   meisten: konten, haustiere, fahrzeuge ... haben kein `typ`-Feld je
   Zeile). Für `provisionInstruments` (die einzige Liste mit echter
   Diskriminante) trägt `typWert` den echten `eintrag.typ`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function kontenFeld(V) {
  return V.SEKTOR_BY_ID.finance.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'accounts');
}

test('[Sensibel-U1] listenEintragZusammenfassung lässt ein schema-sensibles Unterfeld standardmäßig unverändert (Screen-Verhalten bleibt)', () => {
  const { V } = ladeKern();
  const feld = { id: 'test_liste', unterFelder: [
    { id: 'bank', typ: 'text' },
    { id: 'iban', typ: 'text', sensibel: true },
  ] };
  const eintrag = { bank: 'Sparkasse', iban: 'DE89370400440532013000' };
  const zusammen = V.listenEintragZusammenfassung(feld, eintrag);
  assert.match(zusammen, /DE89370400440532013000/, 'ohne opt bleibt das Screen-Verhalten unverändert — die Bürgerin sieht ihre eigenen Daten vollständig');
});

test('[Sensibel-U1] listenEintragZusammenfassung lässt mit opt.sektorId ein schema-sensibles Unterfeld weg', () => {
  const { V } = ladeKern();
  const feld = { id: 'test_liste', unterFelder: [
    { id: 'bank', typ: 'text' },
    { id: 'iban', typ: 'text', sensibel: true },
  ] };
  const eintrag = { bank: 'Sparkasse', iban: 'DE89370400440532013000' };
  const zusammen = V.listenEintragZusammenfassung(feld, eintrag, { sektorId: 'finance' });
  assert.doesNotMatch(zusammen, /DE89370400440532013000/, 'export-seitig muss das sensible Unterfeld fehlen');
  assert.match(zusammen, /Sparkasse/, 'das nicht-sensible Unterfeld bleibt erhalten');
});

test('[Sensibel-U1] listenEintragZusammenfassung honoriert opt.inklSensibel (Opt-in schaltet frei, wie bei Sektorfeldern)', () => {
  const { V } = ladeKern();
  const feld = { id: 'test_liste', unterFelder: [
    { id: 'iban', typ: 'text', sensibel: true },
  ] };
  const eintrag = { iban: 'DE89370400440532013000' };
  const zusammen = V.listenEintragZusammenfassung(feld, eintrag, { sektorId: 'finance', inklSensibel: true });
  assert.match(zusammen, /DE89370400440532013000/);
});

test('[Sensibel-U1] listenEintragZusammenfassung honoriert eine NUTZER-Markierung auf einem Listen-Unterfeld (dieselbe Adressierung wie beim Lesen)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const feld = { id: 'test_liste', unterFelder: [
    { id: 'notiz', typ: 'text' },
  ] };
  const eintrag = { notiz: 'geheime Notiz' };
  // Vor der Markierung: sichtbar.
  assert.match(V.listenEintragZusammenfassung(feld, eintrag, { sektorId: 'finance' }), /geheime Notiz/);
  V.sensibelFeldSetzen('finance', V.LISTEN_UNTERFELD_PRAEFIX + 'test_liste:*:notiz', true);
  const zusammen = V.listenEintragZusammenfassung(feld, eintrag, { sektorId: 'finance' });
  assert.doesNotMatch(zusammen, /geheime Notiz/, 'nutzer-markiertes Listen-Unterfeld muss export-seitig fehlen');
});

test('[Sensibel-U1→U3] echter Kern: konten.iban trägt seit Zug 3 sensibel:true (Liste 1)', () => {
  const { V } = ladeKern();
  const iban = (kontenFeld(V).unterFelder || []).find(u => u.id === 'iban');
  assert.ok(iban, 'iban muss als Unterfeld existieren');
  assert.equal(iban.sensibel, true, 'Zug 3 („Die Sensibel-Architektur", 09.08.2026) setzt das Schema-Flag');
});

test('[Sensibel-U1] feldWertText reicht opt an listenEintragZusammenfassung durch', () => {
  const { V } = ladeKern();
  const feld = { id: 'test_liste', typ: 'liste', unterFelder: [
    { id: 'iban', typ: 'text', sensibel: true },
  ] };
  const roh = [{ iban: 'DE89370400440532013000' }];
  const mitOpt = V.feldWertText(feld, roh, { sektorId: 'finance' });
  assert.doesNotMatch(mitOpt, /DE89370400440532013000/);
  const ohneOpt = V.feldWertText(feld, roh);
  assert.match(ohneOpt, /DE89370400440532013000/, 'ohne opt bleibt feldWertText unverändert (andere geteilte Aufrufer)');
});

test('[Sensibel-U1] _wertTextMenschlich reicht opt durch (PDF-Pfad)', () => {
  const { V } = ladeKern();
  const feld = { id: 'test_liste', typ: 'liste', unterFelder: [
    { id: 'iban', typ: 'text', sensibel: true },
  ] };
  const roh = [{ iban: 'DE89370400440532013000' }];
  const mitOpt = V._wertTextMenschlich(feld, roh, { sektorId: 'finance' });
  assert.doesNotMatch(mitOpt, /DE89370400440532013000/);
});

test('[Sensibel-U1·Regel 18] echter Kern, End-zu-Ende: vollExportJSON enthält die Notiz vor der NUTZER-Markierung und nicht mehr danach', async () => {
  // konten.iban trägt seit Zug 3 SCHEMA-sensibel:true — hier geht es um den NUTZER-Flag-Pfad,
  // darum ein weiterhin nicht-sensibles Unterfeld (notiz).
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Sparkasse München' }, accountType: 'Girokonto', note: 'Gemeinschaftskonto mit Partner' });
  const vorher = V.vollExportJSON();
  assert.match(JSON.stringify(vorher.depot.sektoren.finance.accounts), /Gemeinschaftskonto mit Partner/, 'vor der Markierung: real gesehen enthalten');
  V.sensibelFeldSetzen('finance', V.LISTEN_UNTERFELD_PRAEFIX + 'accounts:*:note', true);
  const nachher = V.vollExportJSON();
  assert.doesNotMatch(JSON.stringify(nachher.depot.sektoren.finance.accounts), /Gemeinschaftskonto mit Partner/, 'nach der Markierung: real gesehen nicht mehr enthalten');
  assert.match(JSON.stringify(nachher.depot.sektoren.finance.accounts), /Sparkasse München/, 'nicht-markierte Unterfelder bleiben');
});

test('[Sensibel-U1·Regel 18] echter Kern, End-zu-Ende: docxBereichModell/bereichVollModell enthalten die Notiz vor der NUTZER-Markierung und nicht mehr danach', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Sparkasse München' }, accountType: 'Girokonto', note: 'Gemeinschaftskonto mit Partner' });
  const docxVorher = V.docxBereichModell('finance');
  assert.match(JSON.stringify(docxVorher.zeilen), /Gemeinschaftskonto mit Partner/);
  const pdfVorher = V.bereichVollModell('finance');
  assert.match(JSON.stringify(pdfVorher), /Gemeinschaftskonto mit Partner/);
  V.sensibelFeldSetzen('finance', V.LISTEN_UNTERFELD_PRAEFIX + 'accounts:*:note', true);
  const docxNachher = V.docxBereichModell('finance');
  assert.doesNotMatch(JSON.stringify(docxNachher.zeilen), /Gemeinschaftskonto mit Partner/);
  const pdfNachher = V.bereichVollModell('finance');
  assert.doesNotMatch(JSON.stringify(pdfNachher), /Gemeinschaftskonto mit Partner/);
});

test('[Sensibel-U1] echte Adressierung: vorsorge_instrumente nutzt den echten typWert aus eintrag.typ, nicht den Platzhalter', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const feld = { id: 'provisionInstruments', unterFelder: [
    { id: 'storageLocation', typ: 'text' },
  ] };
  const eintragA = { instrument: 'living-will', storageLocation: 'Ordner A' };
  const eintragB = { instrument: 'will', storageLocation: 'Ordner B' };
  V.sensibelFeldSetzen('advanceCare', V.LISTEN_UNTERFELD_PRAEFIX + 'provisionInstruments:living-will:storageLocation', true);
  const a = V.listenEintragZusammenfassung(feld, eintragA, { sektorId: 'advanceCare' });
  const b = V.listenEintragZusammenfassung(feld, eintragB, { sektorId: 'advanceCare' });
  assert.doesNotMatch(a, /Ordner A/, 'patientenverfuegung-Zeile ist markiert — muss fehlen');
  assert.match(b, /Ordner B/, 'testament-Zeile ist NICHT markiert — muss erhalten bleiben (typWert-genau, kein Übergriff)');
});
