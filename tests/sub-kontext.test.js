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

test('Pille zeigt IMMER „Mein Depot" (Palettentausch Zug 2); der Sub-Hinweis daneben zeigt „Geöffnet: [Name]"', async () => {
  const { V, document, e } = await ankerMitSub();
  V.subKontextBetreten(e.depotUUID);
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Mein Depot', 'Pille bleibt unverändert — die Kopfzeile ist der Anker-Rahmen');
  assert.equal(document.getElementById('tb-sub-hinweis').hidden, false, 'Sub-Hinweis sichtbar im Sub-Kontext');
  assert.equal(document.getElementById('tb-sub-name').textContent, 'Geöffnet: Oma Erna');
  await V.subKontextVerlassen();
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Mein Depot');
  assert.equal(document.getElementById('tb-sub-hinweis').hidden, true, 'Sub-Hinweis verschwindet am Anker');
});

test('Vollmacht-Banner sitzt über dem Inhalt im Sub-Kontext und verschwindet beim Verlassen', async () => {
  const { V, document, e } = await ankerMitSub();
  V.subKontextBetreten(e.depotUUID);
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('vollmacht-banner'), 'Banner im Inhalt');
  assert.ok(html.includes('Oma Erna'), 'Name im Banner');
  assert.ok(html.includes('id="vm-zurueck"'), 'Rückweg-Knopf');
  // Regression: der Banner wird PREPENDED (insertAdjacentHTML), er ersetzt den Inhalt NICHT —
  // sonst gingen im Browser alle verdrahteten Klick-Handler (Bearbeiten/Fertig) verloren.
  assert.ok(html.includes('bereich-kopf'), 'Sektor-Inhalt bleibt neben dem Banner erhalten');
  assert.ok(V.vollmachtBannerHTML().includes('Oma Erna'), 'vollmachtBannerHTML trägt den Namen');
  await V.subKontextVerlassen();
  assert.ok(!document.getElementById('content').innerHTML.includes('vollmacht-banner'), 'Banner weg am Anker');
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
