'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-017: Identitäts-Name speist Akteur-/Provenienz-Name
   ────────────────────────────────────────────────────────────────────────
   Zwei getrennte Namens-Datenpunkte: data.sektoren.identity.vorname/nachname
   (Dateiname) vs. data.menschen[akteur].name (Provenienz). Beim Identitäts-Edit
   wird der Name in die Anker-Person gespeist — NUR wenn die Eigentümerin selbst
   handelt ('selbst'). Über die stempelName-Hybrid-Auflösung leuchten leere Stempel
   dynamisch auf (keine Migration); benannte Snapshots bleiben eingefroren.
   Beide Schreibpfade: sektorFeldSetzen (granular) + bearbeitungSpeichern (Inline-UI).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'adr017-pw';

test('[ADR-017] Speisung via sektorFeldSetzen: name-loses Depot → Anker-Person bekommt Namen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('');                              // name-loser Eintritt (E-i)
  const menschen = () => V.getData().menschen;
  assert.equal(menschen()[0].name, '', 'Anker-Person startet namenlos');

  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  assert.equal(menschen()[0].name, 'Maria', 'Vorname gespeist');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  assert.equal(menschen()[0].name, 'Maria Mustermann', 'Vor- + Nachname gespeist');
});

test('[ADR-017] Nachziehen bei JEDEM Edit: Namensänderung aktualisiert den Akteur-Namen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'familyName', 'Schmidt');   // Heirat/Korrektur
  assert.equal(V.getData().menschen[0].name, 'Maria Schmidt', 'Namensänderung zieht nach');
});

test('[ADR-017] Rückwirkung gratis: alter namenloser Stempel löst nach Speisung zu „[Name]" auf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('');
  // Stempel VOR der Namens-Eingabe — eingabeDurchName-Snapshot ist leer.
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const stempelVorher = V.getData().urheberschaft.health.allergiesMedicationFoodOther.slice(-1)[0];
  assert.equal(V.stempelName(stempelVorher), '', 'vor Speisung: „von " (namenlos)');

  // Identitäts-Name eintragen → Anker-Person gefüllt.
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  assert.equal(V.stempelName(stempelVorher), 'Maria Mustermann', 'rückwirkend „von [Name]" (Hybrid-Auflösung)');

  // Neuer Stempel friert den Namen als Snapshot ein.
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg' }]);
  const stempelNachher = V.getData().urheberschaft.health.medicationOngoing.slice(-1)[0];
  assert.equal(stempelNachher.eingabeDurchName, 'Maria Mustermann', 'neuer Stempel: Name als eingefrorener Snapshot');
});

test('[ADR-017] Scope: unter Vollmacht wird der Eigentümer-Name NICHT auf die Vertretungs-Person geschrieben', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('');                              // Anker-Person P0 (Eigentümerin)
  const eignerId = V.aktuellerSitzungsAkteur().personId;
  const vertreterId = V.personSicherstellen('Anwalt');     // separate Person
  V.setzeSitzungsAkteur({ personId: vertreterId, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'Vorsorgevollmacht' });

  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');

  const eigner = V.getData().menschen.find(m => m.id === eignerId);
  const vertreter = V.getData().menschen.find(m => m.id === vertreterId);
  assert.equal(eigner.name, '', 'Eigentümer-Person bleibt unter Vollmacht ungespeist (Selbst-Scope)');
  assert.equal(vertreter.name, 'Anwalt', 'Vertretungs-Person behält ihren eigenen Namen');
});

test('[ADR-017] leerer Name überschreibt nichts', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  assert.equal(V.getData().menschen[0].name, 'Maria');
  V.sektorFeldSetzen('identity', 'givenName', '');           // Vorname geleert
  // Helfer setzt keinen leeren Namen — der vorhandene bleibt (kein Überschreiben mit '').
  assert.equal(V.getData().menschen[0].name, 'Maria', 'leerer Identitäts-Name überschreibt den Akteur-Namen nicht');
});

test('[ADR-017] beide Schreibpfade verdrahtet (sektorFeldSetzen + bearbeitungSpeichern)', () => {
  const { src } = ladeKern();
  /* ANKER NACHGEZOGEN (Nachtrag „Vier Häufungen", 17.08.2026): beide Pfade fragen nicht mehr
     `sektorId === 'identity'`, sondern die Rolle `ankerNameFelder`, die der Bereich mitbringt.
     Die AUSSAGE ist unverändert — beide Schreibwege müssen verdrahtet sein; nur der Wortlaut,
     an dem sie hängt, ist ein anderer. Zusätzlich unten belegt, dass die Rolle wirklich auf die
     beiden Namensfelder zeigt: ein Anker allein bewiese sonst nur, dass irgendein Text da steht. */
  assert.ok(/bereichFeldHatRolle\(sektorId, feldId, 'ankerNameFelder'\)[\s\S]{0,90}?ankerNameAusIdentitaetSpeisen\(\)/.test(src),
    'granularer Pfad (sektorFeldSetzen)');
  assert.ok(/bereichFeldHatRolle\(stempelNs, f, 'ankerNameFelder'\)[\s\S]{0,120}?ankerNameAusIdentitaetSpeisen\(\)/.test(src),
    'Inline-Pfad (bearbeitungSpeichern)');
  const { V } = ladeKern();
  assert.deepEqual(V.bereichRolle('identity', 'ankerNameFelder'), ['givenName', 'familyName', 'secondLastName', 'displayFamilyNameFirst'],
    'die Rolle zeigt auf die vier namensrelevanten Felder — nachname2 seit A460 (22.08.2026), ' +
    'familienname_zuerst seit U2-ADR-256 (04.09.2026): ändert sich nur die Reihenfolge, muss ' +
    'data.menschen[].name genauso nachziehen wie eine Änderung an vorname/nachname selbst.');
});

test('[ADR-017] eigene Identitäts-Namensfelder STILL; unter Vollmacht auf Namensfeld bleibt sichtbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  // (a) eigene Namensfelder (Selbst-Stempel) → KEINE Provenienz-Zeile.
  assert.equal(V.urheberschaftZeileHTML('identity', 'givenName'), '', 'eigenes Vorname-Feld still');
  assert.equal(V.urheberschaftZeileHTML('identity', 'familyName'), '', 'eigenes Nachname-Feld still');
  // (b) ein Vertreter ändert den Namen → „von [Vertreter] (unter Vollmacht)" BLEIBT sichtbar.
  const pid = V.personSicherstellen('Hans Vertreter');
  V.setzeSitzungsAkteur({ personId: pid, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'vorsorge' });
  V.sektorFeldSetzen('identity', 'familyName', 'Schmidt');
  const zeile = V.urheberschaftZeileHTML('identity', 'familyName');
  assert.ok(zeile.includes(V.STRINGS.urheberVon + ' Hans Vertreter'), 'unter Vollmacht auf Namensfeld sichtbar');
  assert.ok(zeile.includes(V.STRINGS.urheberUnterVollmacht), 'mit Vollmacht-Vermerk');
});

test('[ADR-017] „von [Name]" an Gesundheits-Feld bleibt erhalten (nur die Namensfelder werden still)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');                       // Selbst-Stempel, Snapshot „B"
  V.getData().menschen.find(m => m.id === akteur.personId).name = 'C';        // späterer echter Namenswechsel
  const zeile = V.urheberschaftZeileHTML('health', 'bloodType');
  assert.ok(zeile.includes(V.STRINGS.urheberVon + ' B'), 'Gesundheits-Feld zeigt weiter „von B" (Snapshot, nicht unterdrückt)');
});
