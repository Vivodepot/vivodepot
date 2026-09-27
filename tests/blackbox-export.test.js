'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Blackbox-Export (Übergaben-Modul, Schritt 2; U2-ADR-004)
   ────────────────────────────────────────────────────────────────────────
   Die verwaltende Person exportiert ein verwaltetes Sub-Depot als verschlüsselte
   Datei, OHNE es zu öffnen. Geprüfte Invarianten (KLASSE-A, wo sicherheitskritisch):
     1) Empfänger-Roundtrip nur mit dem eigenen Passwort der Inhaberin,
     2) Isolation: das Anker-Passwort öffnet die Datei NICHT (DSGVO),
     3) keine Re-Verschlüsselung: ct/iv/Salts byte-identisch zum Quell-Umschlag,
     4) Audit-Trail nur im Anker, nicht in der Datei; kein Schlüssel in der Datei.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'anker-verwaltend-geheim-123';
const SUB_PW   = 'inhaberin-eigenes-pw-456';

// Legt einen Anker an, darin ein verwaltetes Sub-Depot mit eigenem Passwort.
async function anlageMitSubDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Oma', inhaberin: 'Oma', verwaltungsTyp: 'verwaltet' },
    SUB_PW
  );
  return { V, eintrag };
}

test('[Klasse-A] Empfänger-Roundtrip: exportierte Datei öffnet mit dem eigenen Passwort der Inhaberin', async () => {
  const { V, eintrag } = await anlageMitSubDepot();
  const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);

  assert.equal(datei.dateiTyp, 'vivodepot-blackbox-export', 'Datei-Typ-Marker gesetzt');
  const { inhalt } = await V.subDepotEntsiegeln(datei.umschlag, SUB_PW);   // wirft bei Falschpasswort
  assert.equal(inhalt.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'Klartext-Inhalt nach Roundtrip restauriert');
  assert.equal(inhalt.verwaltungsTyp, 'verwaltet', 'Sub-Depot-Typ im entschlüsselten Inhalt erhalten');
});

test('[Klasse-A] Isolation (DSGVO): das Anker-Passwort öffnet die exportierte Datei NICHT', async () => {
  const { V, eintrag } = await anlageMitSubDepot();
  const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);
  await assert.rejects(
    () => V.subDepotEntsiegeln(datei.umschlag, ANKER_PW),
    'Anker-Passwort darf die Sub-Depot-Datei nicht entschlüsseln (eigener Krypto-Pfad).'
  );
});

test('[Klasse-A] Keine Re-Verschlüsselung: ct/iv/Salts der Datei sind byte-identisch zum Quell-Umschlag', async () => {
  const { V, eintrag } = await anlageMitSubDepot();
  const vorher = JSON.parse(JSON.stringify(eintrag.umschlag));   // Schnappschuss VOR dem Export
  const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);

// U2-ADR-002 (23.09.2026, S1): ein Sub-Depot ist ein Depot wie jedes andere — V4, derselbe Speicherweg. Die Probe
  // bleibt gleich streng: statt ct/iv sind Einheiten und Umschlagstabelle byte-identisch (JSON), statt „sechs Felder" die V4-Felder.
  assert.equal(JSON.stringify(datei.umschlag.einheiten), JSON.stringify(vorher.einheiten), 'Einheiten VERBATIM — nie neu verschlüsselt');
  assert.equal(JSON.stringify(datei.umschlag.umschlagTabelle), JSON.stringify(vorher.umschlagTabelle), 'Umschlagstabelle unverändert');
  assert.equal(datei.umschlag.depotSalt, vorher.depotSalt, 'depotSalt unverändert');
  assert.equal(datei.umschlag.depotUUID, vorher.depotUUID, 'depotUUID unverändert');
  assert.equal(datei.umschlag.pbkdf2.salt, vorher.pbkdf2.salt, 'pbkdf2.salt unverändert (Empfänger leitet daraus ab)');
  assert.equal(datei.umschlag.kryptoVersion, 4, 'kryptoVersion 4 — wie jedes Depot');
  // Der Quell-Umschlag im Anker bleibt durch den Export selbst unangetastet.
  assert.equal(JSON.stringify(eintrag.umschlag.einheiten), JSON.stringify(vorher.einheiten), 'Quell-Einheiten im Anker unverändert');
});

test('[Klasse-A] Datei trägt KEINEN Sub-Schlüssel und KEIN Passwort', () => {
  return anlageMitSubDepot().then(({ V, eintrag }) => {
    const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);
    const felder = Object.keys(datei.umschlag).sort();
    assert.deepEqual(
      felder,
      ['angehoerigenOrt', 'depotSalt', 'depotUUID', 'einheiten', 'kryptoVersion', 'pbkdf2', 'umschlagTabelle'],
      'genau die Felder einer Depot-Datei (mit dem Ortshinweis), nichts Geheimes hinzugefügt (U2-ADR-002, S1: dasselbe Format wie jedes Depot)'
    );
    const alsText = JSON.stringify(datei);
    assert.equal(alsText.includes(SUB_PW), false, 'Sub-Passwort nicht in der Datei');
    assert.equal(alsText.includes(ANKER_PW), false, 'Anker-Passwort nicht in der Datei');
    assert.equal(alsText.toLowerCase().includes('schluessel'), false, 'kein Schlüssel-Feld in der Datei');
    assert.equal(alsText.includes('subKey'), false, 'kein subKey in der Datei');
  });
});

test('Audit-Trail: Übergabe wird NUR im Anker protokolliert, NICHT in der Export-Datei', async () => {
  const { V, eintrag } = await anlageMitSubDepot();
  assert.equal(eintrag.delegationsGeschichte.length, 0, 'vor dem Export leer');

  const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);

  assert.equal(eintrag.delegationsGeschichte.length, 1, 'genau ein Protokoll-Eintrag im Anker');
  const log = eintrag.delegationsGeschichte[0];
  assert.equal(log.art, 'blackbox-export', 'Eintrags-Art korrekt');
  assert.equal(log.initiiert_von, 'verwaltend', 'initiiert von der verwaltenden Person');
  assert.ok(typeof log.zeitpunkt === 'string' && log.zeitpunkt.length > 0, 'Zeitstempel gesetzt');

  // Die Export-Datei darf KEIN Protokoll tragen. (Hinweis: der Datei-Typ-Marker
  // 'vivodepot-blackbox-export' enthält selbst die Zeichenkette „blackbox-export";
  // geprüft werden daher die protokoll-spezifischen Felder, nicht dieser Marker.)
  const alsText = JSON.stringify(datei);
  assert.equal(alsText.includes('delegationsGeschichte'), false, 'kein Audit-Trail-Feld in der Datei');
  assert.equal(alsText.includes('initiiert_von'), false, 'kein Protokoll-Eintrag (initiiert_von) in der Datei');
  assert.equal(alsText.includes('zeitpunkt'), false, 'kein Protokoll-Zeitstempel in der Datei');
});

test('blackboxDateiAusUmschlag lehnt Nicht-v3-Umschläge ab (v3-only, kein zweiter Krypto-Pfad)', () => {
  return anlageMitSubDepot().then(({ V, eintrag }) => {
    // B2/v3: Release ist v3-only — v1 UND v2 müssen abgelehnt werden.
    for (const altVer of [1, 2]) {
      const fremd = JSON.parse(JSON.stringify(eintrag.umschlag));
      fremd.kryptoVersion = altVer;
      assert.throws(() => V.blackboxDateiAusUmschlag(fremd), /kryptoVersion 3/,
        'Blackbox-Export nur für das aktuelle Format (v3) — Version ' + altVer + ' abgelehnt');
    }
  });
});
