'use strict';
/* Test 4 — KLASSE-A (muss vor jedem Commit grün sein)
   Umschlag-Form: die sechs Krypto-Felder, kryptoVersion 3, depotUUID uuid-v4,
   pbkdf2.salt 16 B, depotSalt 32 B, iv 12 B. (U2-ADR-002/003/004)
   U2-ADR-078: der früher hier getragene Klartext-`notfallCache` ist ERSATZLOS
   entfernt. Der ANKER-Umschlag trägt jetzt die sechs Krypto-Felder + das
   `angehoerigenOrt`-Geschwister (Klartext-Ort-Hinweis) — KEIN
   Klartext-Cache. Der SUB-Depot-Umschlag bleibt bei genau sechs Feldern. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const b64len = (s) => Buffer.from(s, 'base64').length;
/* U2-ADR-078: kein notfallCache mehr. F5 Zug 2 (21.08.2026): auch kein angehoerigenCache mehr.
   U2-ADR-062-Nachtrag (21.07.2026): angehoerigenOrt — KLARTEXT, bewusst.
   Diese Zeile ist der Wächter gegen ein still hinzugefügtes Klartext-Geschwister; genau
   dieser Fehler war U2-ADR-078 (notfallCache leckte vier Art-9-Felder an jeden Datei-
   Besitzer). Sie wird nur mit einer getroffenen Entscheidung geändert — hier: der
   Ort-Hinweis MUSS vor der Passwort-Eingabe lesbar sein, sonst hat er keinen Zweck.
   Er ist nie das Passwort, nur der Verweis darauf, und er steht nur da, wenn ein
   Vertrauens-Zugang eingerichtet ist. */
/* ZERFALL IN FELD-EINHEITEN (A345, 19.08.2026) — DIESER WÄCHTER HAT GEKLEMMT, UND ER
   SOLLTE ES. A333 hat ihn vorab benannt: er fixiert die Umschlag-Form, und der Schnitt
   auf Generation 4 ändert sie. Geändert wird er mit der getroffenen Entscheidung, nicht
   im Vorbeigehen — und er wird dabei SCHÄRFER, nicht weicher:

     · Der Schlüsselsatz ist weiterhin exakt fixiert (kein still hinzugefügtes
       Geschwister) — nur eben auf die Form der Generation 4.
     · NEU: die Zusage aus der Entscheidung vom 18.08. wird hier belegt — ohne Passwort
       gibt die Datei die ZAHL der Einträge preis und sonst nichts. Kein Feldname, kein
       Fach-Name, kein Ort-Hinweis, keine Unterscheidung zwischen Anker und Fach.
     · Der SUB-Depot-Umschlag bleibt unverändert bei sechs Feldern (v3) — Sub-Depots
       zerfallen nicht. */
const ANKER = 'angehoerigenOrt,depotSalt,depotUUID,einheiten,kryptoVersion,pbkdf2,umschlagTabelle';

// Prüft die gemeinsamen Rumpf-Felder rigoros (Werte/Längen), unabhängig von der Generation.
function pruefeRumpf(u) {
  assert.match(u.depotUUID, UUID_V4, 'depotUUID ist uuid-v4');
  assert.equal(b64len(u.pbkdf2.salt), 16, 'pbkdf2.salt 16 B');
  assert.equal(b64len(u.depotSalt), 32, 'depotSalt 32 B');
}
// v4 (Anker): viele Einheiten, je mit eigenem IV, plus die Umschlagstabelle.
function pruefeEinheitenForm(u) {
  assert.equal(u.kryptoVersion, 4, 'kryptoVersion 4');
  pruefeRumpf(u);
  const adressen = Object.keys(u.einheiten);
  assert.ok(adressen.length > 0, 'mindestens eine Einheit');
  for (const a of adressen) {
    assert.equal(b64len(u.einheiten[a].iv), 12, 'jede Einheit hat einen eigenen 12-B-IV');
    assert.ok(typeof u.einheiten[a].ct === 'string' && u.einheiten[a].ct.length > 0, 'jede Einheit hat ein Chiffrat');
  }
  assert.ok(Array.isArray(u.umschlagTabelle) && u.umschlagTabelle.length === 1,
    'genau ein Eintrag — die Tabelle ist die Fähigkeit, nicht ihr erster Inhalt');
  const e = u.umschlagTabelle[0];
  assert.equal(Object.keys(e).sort().join(','), 'geheim,kdf,kennung,umschlaege',
    'Eintrag nach Form 3: neutrale Kennung + kdf + Umschläge im Klartext, alles Übrige im `geheim`-Teil');
  assert.equal(Object.keys(e.umschlaege).sort().join(','), adressen.sort().join(','),
    'zu jeder Einheit genau ein gewickelter Schlüssel');
}

test('[Klasse-A] Umschlag-Form: Anker-Umschlag (Generation 4: Einheiten + Umschlagstabelle + der Ort-Hinweis, KEIN notfallCache)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw');
  const u = await V.depotSerialisieren();
  pruefeEinheitenForm(u);
  assert.equal(Object.keys(u).sort().join(','), ANKER,
    'Rumpf + einheiten + umschlagTabelle + angehoerigenOrt — und nichts sonst (F5 Zug 2: die Abschrift ist fort)');
  // U2-ADR-078: das passwortlose Klartext-Geschwister ist weg.
  assert.equal('notfallCache' in u, false, 'kein notfallCache-Sibling mehr');
});

test('[Klasse-A] Umschlag-Form: ohne Passwort gibt die Datei die ZAHL der Einträge preis — und sonst nichts', async () => {
  /* Die Zusage aus der Entscheidung vom 18.08.2026 (Form 3). Sie ist der Grund, aus dem
     Kreis-Name und Ort-Hinweis im verschlüsselten Teil liegen; ohne diese Probe wäre sie
     eine Absicht statt einer Eigenschaft. */
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw');
  const d = V.getData();
  d.sektoren.health = { bloodType: '0 negativ' };
  d.sektoren.socialInsurance = { gdb_grad: '50' };
  V.setData(d);
  const roh = JSON.stringify(await V.depotSerialisieren());

  // Kein sprechender FELDname steht ausserhalb einer verschlüsselten Einheit.
  for (const name of ['bloodType', 'gdb_grad', 'health.bloodType', 'sozialversicherung.gdb_grad']) {
    assert.ok(!roh.includes(name), 'kein sprechender Feldname in der Datei: ' + name);
  }
  // Auch kein WERT.
  assert.ok(!roh.includes('0 negativ'), 'kein Feldwert im Klartext');

  // Was die Datei preisgibt: die Zahl der Einträge. Der Eintrag heisst neutral.
  const u = JSON.parse(roh);
  assert.equal(u.umschlagTabelle[0].kennung, 'Fach 1',
    'neutraler Index — der Anker ist an seiner Kennung nicht von einem Fach zu unterscheiden');
  assert.equal('name' in u.umschlagTabelle[0], false, 'kein Klartext-Name');
  assert.equal('ortHinweis' in u.umschlagTabelle[0], false, 'kein Klartext-Ort-Hinweis');
});

// U2-ADR-002 (23.09.2026, S1): ein Sub-Depot ist ein Depot wie jedes andere — V4, derselbe Speicherweg; die V3-Erwartung hielt die Sonderlocke fest.
// Geprüft wird darum GENAU die Form des Anker-Umschlags (pruefeEinheitenForm + ANKER), nicht eine eigene Sub-Form.
test('[Klasse-A] Umschlag-Form: Sub-Depot-Umschlag (dieselbe Form wie jedes Depot, KEIN Cache)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw');
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'B', inhaberin: 'I', verwaltungsTyp: 'verwaltet' }, 'sub-pw');
  pruefeEinheitenForm(eintrag.umschlag);
  assert.equal(Object.keys(eintrag.umschlag).sort().join(','), ANKER,
    'Sub-Umschlag trägt genau die Felder des Anker-Umschlags');
  assert.equal('notfallCache' in eintrag.umschlag, false, 'kein Notfall-Cache — wie beim Anker');
});
