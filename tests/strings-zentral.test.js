'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — STRINGS-Zentralisierung (Teil 6, Schnitt 6.1, ADR-104 Variante a)
   ────────────────────────────────────────────────────────────────────────
   Zuvor hartkodierte sichtbare UI-Texte liegen jetzt in der zentralen STRINGS-Map.
   Belegt, dass die zentralisierten Schlüssel existieren UND die gerenderte Ausgabe
   unverändert dieselben sichtbaren Texte trägt (kein verlorener Text).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('1) neue zentrale Schlüssel existieren mit den erwarteten Werten', async () => {
  const { V } = ladeKern();
  const S = V.STRINGS;
  assert.equal(S.notfallKontakteVcardTitel, 'Notfallkontakte');   // U2-ADR-077: FN-Titel der Kontakte-vCard (früher notfallQrKopf)
  assert.equal(S.dateiLabel, 'Depot-Datei');
  assert.equal(S.btnZurueck, 'Zurück');
  assert.equal(S.refNeuePersonOption, 'Neue Person');
  assert.equal(S.refNeueInstitutionOption, 'Neue Institution');
  assert.equal(S.refFreitextPlatzhalter, 'oder Freitext');
  assert.equal(S.listenEintragSg, 'Eintrag');
  assert.equal(S.listenEintragPl, 'Einträge');
  assert.equal(S.pdfSeite, 'Seite');
});

test('2) QR-vCard nutzt den zentralisierten Kontakte-Titel im FN (U2-ADR-077)', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren.identity = { givenName: 'Maria', familyName: 'Mustermann' };
  d.menschen = [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }];
  d.sektoren.health = Object.assign({}, d.sektoren.health, { emergencyContacts: [{ ref: 'p1', override: '' }] });
  V.setData(d);
  const vcard = V.notfallKontakteVcard();
  assert.ok(vcard.startsWith('BEGIN:VCARD'), 'QR ist eine vCard');
  assert.ok(vcard.includes('FN:' + V.STRINGS.notfallKontakteVcardTitel), 'zentralisierter Titel im FN');
});

test('3) ref-Picker rendert „+ Neue Person anlegen" und den Freitext-Platzhalter', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const person = V.feldInputHTML({ id: 'p', typ: 'ref', entitaet: 'person' }, null);
  assert.ok(person.includes('+ Neue Person anlegen'), 'Person-Option unverändert');
  assert.ok(person.includes('placeholder="oder Freitext"'), 'Freitext-Platzhalter unverändert');
  const inst = V.feldInputHTML({ id: 'i', typ: 'ref', entitaet: 'institution' }, null);
  assert.ok(inst.includes('+ Neue Institution anlegen'), 'Institution-Option unverändert');
});

test('4) Listen-Zähler unverändert: „1 Eintrag" / „2 Einträge"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const lf = { id: 'l', typ: 'liste' };
  assert.equal(V.feldWertText(lf, [{}]), '1 Eintrag');
  assert.equal(V.feldWertText(lf, [{}, {}]), '2 Einträge');
});

test('5) keine der zentralisierten Roh-Literale mehr direkt im Skript (Stichprobe)', async () => {
  const { src } = ladeKern();
  // Der zweite <script>-Block (App) sollte die Roh-Literale nicht mehr als HTML-Text führen.
  // (Die Werte leben jetzt in der STRINGS-Map; dort dürfen sie genau einmal stehen.)
  const vorkommen = (nadel) => src.split(nadel).length - 1;
  assert.equal(vorkommen("placeholder=\"oder Freitext\""), 0, 'kein hartkodierter Freitext-Platzhalter mehr');
  assert.equal(vorkommen("'VIVODEPOT NOTFALL\\n'"), 0, 'kein hartkodierter QR-Kopf mehr');
});
