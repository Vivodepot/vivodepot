'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Baustein 3 — Verwaltungsvorgänge-Tracker (Templates-Trio, Baustein-
   Reklassifizierung 02.08.2026)
   ────────────────────────────────────────────────────────────────────────
   `verwaltung_vorgaenge`, typ:'liste' mit acht unterFelder (behoerde,
   vorgangstyp, aktenzeichen, datum, gueltig_bis, betrag, referenz, notiz) —
   1:1 nach dem haustiere/kinder-Muster, kein neuer Mechanismus.

   Sektion „BundID und Vorgänge" trug seit jeher den Namen, aber nie ein
   Vorgänge-Feld — BundID (fester Einzel-Eintrag, eine Person/ein Konto) und
   die Vorgänge-Liste (mehrere, unabhängige Behörden-Angelegenheiten) bleiben
   bewusst getrennte Felder, keine gemeinsame Liste.

   Kein Wizard, kein Dokument-Export — reiner Baustein-Fall wie die anderen
   beiden Trio-Punkte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'verwaltungsvorgaenge-pw-2026!';

async function depot() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  return { V, document };
}
const vorgaenge = (V) => V.getData().sektoren.administration.ongoingAdministrativeCases || [];

test('[Baustein-Verwaltungsvorgänge] Hinzufügen: ein Vorgang landet vollständig in data', async () => {
  const { V } = await depot();
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', {
    authority: 'Deutsche Rentenversicherung', typeOfCase: 'Rentenantrag',
    fileReferenceNumber: 'RV-2026-00417', start: '2026-03-12', deadline: '',
    amount: '1.240 EUR monatlich', contactPerson: 'Sachbearbeiterin Frau Meyer',
    note: 'Unterlagen eingereicht',
  });
  assert.equal(vorgaenge(V).length, 1);
  assert.equal(vorgaenge(V)[0].authority, 'Deutsche Rentenversicherung');
  assert.equal(vorgaenge(V)[0].fileReferenceNumber, 'RV-2026-00417');
});

test('[Baustein-Verwaltungsvorgänge] Zwei unabhängige Vorgänge nebeneinander (mehrere Behörden gleichzeitig)', async () => {
  const { V } = await depot();
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Rentenversicherung', typeOfCase: 'Rentenantrag' });
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Bürgerbüro', typeOfCase: 'Ummeldung' });
  assert.equal(vorgaenge(V).length, 2, 'zwei unabhängige Vorgänge stehen nebeneinander');
});

test('[Baustein-Verwaltungsvorgänge] Bearbeiten: ein Vorgang lässt sich aktualisieren, ohne den anderen zu berühren', async () => {
  const { V } = await depot();
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Rentenversicherung', typeOfCase: 'Rentenantrag', amount: '' });
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Bürgerbüro', typeOfCase: 'Ummeldung' });
  V.listenEintragAktualisieren('administration', 'ongoingAdministrativeCases', 0,
    { authority: 'Rentenversicherung', typeOfCase: 'Rentenantrag', amount: '1.240 EUR monatlich' });
  assert.equal(vorgaenge(V)[0].amount, '1.240 EUR monatlich', 'der bearbeitete Vorgang trägt den neuen Betrag');
  assert.equal(vorgaenge(V)[1].authority, 'Bürgerbüro', 'der zweite Vorgang bleibt unverändert');
});

test('[Baustein-Verwaltungsvorgänge] Entfernen: ein Vorgang verschwindet, der andere bleibt', async () => {
  const { V } = await depot();
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Rentenversicherung', typeOfCase: 'Rentenantrag' });
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Bürgerbüro', typeOfCase: 'Ummeldung' });
  V.listenEintragEntfernen('administration', 'ongoingAdministrativeCases', 0);
  assert.equal(vorgaenge(V).length, 1);
  assert.equal(vorgaenge(V)[0].authority, 'Bürgerbüro', 'der verbleibende Vorgang ist der richtige');
});

test('[Baustein-Verwaltungsvorgänge] Anzeige: Rundlauf bis in den Render', async () => {
  const { V, document } = await depot();
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', {
    authority: 'Deutsche Rentenversicherung', typeOfCase: 'Rentenantrag', fileReferenceNumber: 'RV-2026-00417',
  });
  V.renderSektor('administration');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Laufende Verwaltungsvorgänge'), 'Feld-Label gerendert');
});

test('[Baustein-Verwaltungsvorgänge] BundID bleibt eine EIGENE Liste — kein gemeinsames Listenfeld mit den Vorgängen', () => {
  const { V } = ladeKern();
  const s = V.SEKTOR_BY_ID.administration;
  const felder = s.sektionen.find((x) => x.id === 'bundid-vorgaenge').felder;
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): bundid_email/bundid_ort sind in der Liste
  // `bundid` aufgegangen (mehrwertig) — BundID ist seither selbst eine Liste, aber eine EIGENE,
  // getrennt von `verwaltung_vorgaenge`. „eigenständig" heisst seither „nicht dieselbe Liste",
  // nicht mehr „kein Listenfeld".
  const bundid = felder.find((f) => f.id === 'bundid');
  const vorgaengeFeld = felder.find((f) => f.id === 'ongoingAdministrativeCases');
  assert.ok(bundid && bundid.typ === 'liste', 'BundID ist seit Glied 3 selbst eine Liste');
  assert.ok(vorgaengeFeld && vorgaengeFeld.typ === 'liste', 'Vorgänge sind eine eigene Liste');
  assert.notEqual(bundid.id, vorgaengeFeld.id, 'zwei getrennte Listen, keine gemeinsame');
  // F5 Posten 1 („F4 und F5", 09.08.2026): betrag_waehrung/betrag_frequenz kamen
  // additiv neben betrag dazu (W-2-Fund, Frequenz variiert je Vorgang).
  // U2-ADR-326 (06.09.2026): gegenseite/beratung_bisher kamen additiv HINTEN dazu — sie gehoeren
  // an DEN Vorgang, nicht an die Buergerin: ein Mensch kann mehrere Angelegenheiten haben,
  // jede mit eigener Gegenseite. Die Reihenfolge der bestehenden elf ist unberuehrt.
  assert.equal((vorgaengeFeld.unterFelder || []).map((u) => u.id).join(','),
    'authority,typeOfCase,fileReferenceNumber,start,deadline,amount,direction,currency,frequency,contactPerson,note,opposingParty,alreadyAdvisedBy');
});
