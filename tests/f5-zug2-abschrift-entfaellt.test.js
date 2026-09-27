'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — F5 Zug 2 (21.08.2026): die Angehörigen-Abschrift ist fort.
   ────────────────────────────────────────────────────────────────────────
   `data.angehoerigenCache` war ein SCHNAPPSCHUSS der fünf Angehörigen-Blätter,
   verschlüsselt mit einem zweiten Passwort. Er veraltete, während das Depot
   weiterlebte, und trug genau dafür sein `stand`-Feld. Die Empfängerkreise
   (U2-ADR-156) geben statt einer Kopie einen Schlüssel auf den lebenden
   Bestand — darum ERSETZT, nicht gelöscht (Entscheidung 21.08.2026).

   DER TRAGENDE ROTE PUNKT ist die Migrationsstufe. Die Messung vom selben Tag
   hat gezeigt: ein blosses Weglassen im Grundgerüst wirkt NICHT, weil die alte
   26→27-Stufe das Feld bei jedem Laden sofort wieder anlegte. Ohne die tilgende
   Stufe 72→73 trügen Bestandsdepots ein Chiffrat weiter, das niemand mehr
   öffnen kann.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-passwort-12345';

test('[F5·Zug2] das Grundgerüst kennt die Abschrift nicht mehr', () => {
  const { V } = ladeKern();
  const leer = V.leeresDepot();
  assert.equal('angehoerigenCache' in leer, false, 'kein Schlüssel, auch nicht mit Wert null');
  assert.equal(typeof leer.angehoerigen_passwort_ort, 'string',
    'der Ort-Hinweis bleibt — er hängt seit Zug 1 am zweiten WEG, nicht an der Abschrift');
});

test('[F5·Zug2·Rot-Beweis] die Migrationsstufe TILGT sie aus einem Bestandsdepot', () => {
  const { V } = ladeKern();
  const bestand = V.leeresDepot();
  // So sah ein Depot mit eingerichtetem Vertrauens-Zugang aus.
  bestand.angehoerigenCache = { v: 2, salt: 'x', iv: 'y', ct: 'z', stand: '2026-07-01T00:00:00.000Z' };
  bestand.schemaVersion = 72;
  V.depotNormalisieren(bestand);
  /* DIES IST DER ROTE PUNKT. Vor Zug 2 legte die 26→27-Stufe das Feld bei jedem Laden wieder an;
     ein Weglassen im Grundgerüst allein wäre wirkungslos gewesen — gemessen, nicht vermutet. */
  assert.equal('angehoerigenCache' in bestand, false, 'die Abschrift ist fort, nicht auf null gesetzt');
  // Schnitt-Kampagne (23.08.2026): der gemeinsame Bump auf 74 läuft unbedingt weiter, direkt
  // nach dieser Stufe — die Kette läuft bis zum aktuellen Stand, nicht nur bis 73.
  assert.equal(bestand.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[F5·Zug2] die Tilgung ist idempotent und nimmt nichts anderes mit', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.angehoerigenCache = { ct: 'z' };
  d.angehoerigen_passwort_ort = 'Tresor';
  d.sektoren.identity = { givenName: 'Maria' };
  V.depotNormalisieren(d);
  V.depotNormalisieren(d);                       // zweimal — dieselbe Antwort
  assert.equal('angehoerigenCache' in d, false);
  assert.equal(d.angehoerigen_passwort_ort, 'Tresor', 'der Ort-Hinweis bleibt stehen');
  assert.equal(d.sektoren.identity.givenName, 'Maria', 'Bürgerdaten unberührt');
});

test('[F5·Zug2] kein Umschlag trägt die Abschrift mehr — beide Serialisierer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const u = await V.depotSerialisieren();
  assert.equal('angehoerigenCache' in u, false, 'v4-Schreibweg');
  const u3 = await V.depotSerialisierenV3();
  assert.equal('angehoerigenCache' in u3, false, 'v3-Rückweg');
});

test('[F5·Zug2] die zwei toten Registereinträge sind fort — und die Listen bleiben vollständig', () => {
  const { V } = ladeKern();
  assert.equal(V.EMPFAENGER_NIE.has('angehoerigenCache'), false, 'keine Sperre für einen Schlüssel, den es nicht gibt');
  assert.equal(V.EMPFAENGER_NIE.has('angehoerigen_passwort_ort'), true, 'der Ort-Hinweis bleibt gesperrt — er sagt etwas über Dritte');
  assert.equal(V.VOLLEXPORT_STRUKTURELL_SCHLUESSEL.includes('angehoerigenCache'), false);
  /* Die Gegenprobe zum Entfernen: der Wächter `vollexport-schluessel-abdeckung` verlangt für
     JEDEN Schlüssel aus `leeresDepot()` einen Eintrag. Hier direkt nachgehalten, damit das
     Entfernen nicht versehentlich eine Lücke öffnet statt eine Leiche zu räumen. */
  const klassifiziert = new Set([...V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL,
    ...V.VOLLEXPORT_STRUKTURELL_SCHLUESSEL, ...V.VOLLEXPORT_FELDWEISE_SCHLUESSEL]);
  for (const k of Object.keys(V.leeresDepot())) {
    if (k.startsWith('_')) continue;
    assert.ok(klassifiziert.has(k), 'unklassifizierter Schlüssel im Grundgerüst: ' + k);
  }
});

test('[F5·Zug2] der Ort-Hinweis hängt jetzt allein am Fach — die Abschrift kann ihn nicht mehr tragen', () => {
  const { V } = ladeKern();
  const ORT = 'Versiegelter Umschlag im Tresor';
  const mitFach = { kennung: 'Fach 2', kdfSalt: 'x', fachSchluessel: 'y', fachKeyRoh: 'z' };
  assert.equal(V._ortHinweisFuerUmschlag({ angehoerigen_passwort_ort: ORT }), null);
  assert.equal(V._ortHinweisFuerUmschlag({ angehoerigen_passwort_ort: ORT, empfaengerkreise: [mitFach] }), ORT);
  // Eine Abschrift im Objekt ändert nichts mehr — der Zweig ist fort.
  assert.equal(V._ortHinweisFuerUmschlag({ angehoerigen_passwort_ort: ORT, angehoerigenCache: { ct: 'x' } }), null,
    'ein übriggebliebenes Cache-Feld öffnet den Hinweis NICHT wieder');
});

test('[F5·Zug2] der Eintritt ist fort — und der eine Öffnen-Weg trägt beide Fälle', () => {
  const { V, document: dok } = ladeKern();
  assert.equal(typeof V.angehoerigenAusUmschlag, 'undefined', 'kein Kern-Eintritt mehr');
  assert.equal(typeof V.vertrauenspersonAktiv, 'undefined', 'kein Owner-Setup mehr');
  V.renderWelcome();
  const welcome = dok.getElementById('app').innerHTML || dok.body.innerHTML || '';
  assert.equal(welcome.includes('id="w-angehoerige"'), false, 'kein zweiter Startseiten-Eintritt');
  V.renderCryptoOverlay();
  const overlay = dok.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(overlay.includes('id="w-oeffnen"'), 'der eine Öffnen-Weg steht');
  assert.equal(overlay.includes('id="co-ang-primaer"'), false, 'kein Angehörigen-Zweig mehr');
  assert.ok(overlay.includes('id="co-ang-ort"'), 'der Ort-Hinweis aus Zug 1 bleibt — er gilt jetzt dem Fach');
});
