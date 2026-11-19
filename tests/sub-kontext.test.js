'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Aktiver Sub-Depot-Kontext (Durchbau T1, Schnitt 1.1/1.2)
   ────────────────────────────────────────────────────────────────────────
   Die verwaltende Person betritt ein geöffnetes Sub-Depot: `data` wechselt
   auf den Sub-Inhalt, Bearbeitung läuft wie am Anker, beim Verlassen wird mit
   dem SITZUNGS-Schlüssel re-verschlüsselt (kein Passwort, gleiche Identität).
   Belegt den Krypto-Rundlauf: re-versiegelt → mit Sub-Passwort wieder lesbar.
   VdCrypto-Block bleibt unberührt (Klasse-A-Test der Suite prüft den Hash).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER = 'anker-pw', SUB = 'sub-pw';

async function ankerMitSub() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(ANKER);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Oma', inhaberin: 'Oma Erna', verwaltungsTyp: 'verwaltet' }, SUB);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  return { V, document, e };
}

test('subKontextBetreten/Verlassen: data wechselt zum Sub-Inhalt und zurück', async () => {
  const { V, e } = await ankerMitSub();
  const anker = V.getData();
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.imSubKontext(), true);
  assert.equal(V.getAktiverSubKontext(), e.depotUUID);
  assert.notEqual(V.getData(), anker, 'data zeigt jetzt auf den Sub-Inhalt');
  assert.equal(V.ankerDaten(), anker, 'der Anker bleibt über ankerDaten() erreichbar');
  await V.subKontextVerlassen();
  assert.equal(V.imSubKontext(), false);
  assert.equal(V.getData(), anker, 'data ist wieder der Anker');
});

test('Sub-Kontext bearbeiten → Re-Versiegeln (Sitzungs-Schlüssel) → mit Passwort wieder lesbar', async () => {
  const { V, e } = await ankerMitSub();
  const uuid = e.depotUUID;
  const umschlagVorher = JSON.stringify(e.umschlag);
  V.subKontextBetreten(uuid);
  V.akteurSelbstErklaeren('Verwalterin');
  V.sektorFeldSetzen('identity', 'givenName', 'Erna');   // schreibt in den Sub-Inhalt
  await V.subKontextVerlassen();                          // re-versiegelt mit dem Sitzungs-Schlüssel
  const eintrag = V.getData().verwalteteDepots.find(x => x.depotUUID === uuid);
  assert.equal(eintrag.depotUUID, uuid, 'depotUUID unverändert (Identität bleibt)');
  assert.notEqual(JSON.stringify(eintrag.umschlag), umschlagVorher, 'Umschlag re-versiegelt (neue iv/ct)');
  // Mit dem Sub-Passwort wieder öffnen → die Bearbeitung ist persistiert.
  const wieder = await V.subDepotVertrauenOeffnen(uuid, SUB);
  assert.equal(wieder.sektoren.identity.givenName, 'Erna', 'Bearbeitung über das Re-Versiegeln erhalten');
});

test('Falsches Sub-Passwort nach Re-Versiegeln wirft (AAD korrekt gebunden)', async () => {
  const { V, e } = await ankerMitSub();
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('V');
  V.sektorFeldSetzen('identity', 'givenName', 'Erna');
  await V.subKontextVerlassen();
  await assert.rejects(() => V.subDepotVertrauenOeffnen(e.depotUUID, 'falsch'));
});

test('aktiverSubName liefert Inhaberin im Sub-Kontext, leer am Anker', async () => {
  const { V, e } = await ankerMitSub();
  assert.equal(V.aktiverSubName(), '');
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.aktiverSubName(), 'Oma Erna');
  await V.subKontextVerlassen();
  assert.equal(V.aktiverSubName(), '');
});

/* ── UI (Schnitt 1.1/1.2): Pille-Label + Dauer-Banner ─────────────────────── */

test('Pille nennt im Sub-Kontext die Person (Umbau 13.11.2026), im eigenen Depot „Mein Depot"; der Hinweis „Geöffnet: [Name]" ist durch die Kontextzeile ersetzt', async () => {
  const { V, document, e } = await ankerMitSub();
  V.subKontextBetreten(e.depotUUID);
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Oma Erna', 'Pille nennt die Person');
  assert.equal(document.getElementById('tb-sub-hinweis'), null, 'kein zweiter Hinweis neben der Pille: die Kontextzeile trägt den Namen, das Markup gibt es nicht mehr');
  /* Der Rückweg-Eintrag im Wechsler-Menü braucht das echte Menü; ihn prüft die Browser-Probe tests/e2e/sub-depot-kopfzeile-schmal.spec.js und der Weg in tests/fixtures/umbau-verzeichnis-kopfleiste.json. */
  await V.subKontextVerlassen();
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Mein Depot');
});

test('Kontextzeile unter der Kopfzeile trägt Namen und Rückweg im Sub-Kontext und ist beim Verlassen leer und versteckt', async () => {
  const { V, document, e } = await ankerMitSub();
  V.subKontextBetreten(e.depotUUID);
  const zeile = document.getElementById('sub-kontextzeile');
  assert.equal(zeile.hidden, false, 'Kontextzeile sichtbar');
  assert.ok(document.getElementById('sub-kontext-name').textContent.includes('Oma Erna'), 'Name in der Kontextzeile');
  assert.ok(document.getElementById('vm-zurueck'), 'Rückweg-Knopf');
  // Der Inhalt bleibt unberührt: kein Banner mehr im Inhalt, der Sektor-Inhalt steht allein.
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('vollmacht-banner'), 'kein Banner mehr im Inhalt');
  assert.ok(html.includes('bereich-kopf'), 'Sektor-Inhalt bleibt erhalten');
  await V.subKontextVerlassen();
  assert.equal(zeile.hidden, true, 'Kontextzeile weg am Anker');
  assert.equal(document.getElementById('sub-kontext-name').textContent, '', 'kein Name als Spur');
});

/* ── Bearbeiten im Sub-Kontext (Bugfix): Akteur „unter-vollmacht" automatisch ── */

test('Bearbeiten im Sub-Kontext ohne erneute Akteur-Erklärung — Akteur unter-vollmacht, Stempel im Sub', async () => {
  const { V, e } = await ankerMitSub();
  V.akteurSelbstErklaeren('Anna Verwalterin');     // Anker-Akteur (wie nach flowDepotAnlegen)
  V.subKontextBetreten(e.depotUUID);
  const ak = V.aktuellerSitzungsAkteur();
  assert.equal(ak.eigenschaft, 'unter-vollmacht', 'Sub-Akteur ist unter-vollmacht');
  assert.equal(ak.vollmachtsGrundlage, e.depotUUID, 'Vollmachts-Grundlage = depotUUID');
  assert.equal(V.akteurName(ak.personId), 'Anna Verwalterin', 'Name im Sub auflösbar (Person im Sub eingetragen)');
  // Bearbeiten funktioniert jetzt ohne erneute Akteur-Erklärung (vorher: „Kein Sitzungs-Akteur").
  assert.doesNotThrow(() => V.sektorFeldSetzen('identity', 'givenName', 'Erna'));
  assert.equal(V.getData().sektoren.identity.givenName, 'Erna');
  const st = V.liesUrheberschaft('identity', 'givenName');
  assert.equal(st[st.length - 1].eigenschaft, 'unter-vollmacht', 'Stempel trägt unter-vollmacht');
  // Verlassen stellt den Anker-Akteur wieder her.
  await V.subKontextVerlassen();
  const ankerAk = V.aktuellerSitzungsAkteur();
  assert.equal(ankerAk.eigenschaft, 'selbst', 'Anker-Akteur (selbst) wiederhergestellt');
  assert.equal(V.akteurName(ankerAk.personId), 'Anna Verwalterin');
});
