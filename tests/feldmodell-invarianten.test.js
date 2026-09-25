'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Feld-Modell Stufe 2 / Block 4: Format-Invarianten (U2-ADR-037)
   ────────────────────────────────────────────────────────────────────────
   Die drei Eigenschaften, wegen derer das selbst-beschreibende Modell existiert:
   (1) Daten-Verbleib über den Krypto-Rundlauf — und schärfer: ein Template-Feld
       ist NACH simuliertem Template-Widerruf noch rendierbar; die Definition im
       Depot allein genügt, das Feld (mit Wert) anzuzeigen, ohne das ursprüngliche
       Template/Credential. Geprüft über zwei Kern-Instanzen: V serialisiert, eine
       FRISCHE Instanz V2 (die das Template nie sah) lädt nur den Chiffretext und
       rendert daraus.
   (2) Krypto/Provenienz feldId-agnostisch — ein dynamisches tpl_-Feld trägt
       Urheberschaft wie ein Kern-Feld (Voll-Objekt-Verschlüsselung, Block-Pin
       unberührt — Block-Pin-Gate prüft die Suite separat).
   (3) U2-ADR-036-Selbstauskunft-Guard hält auch für dynamische Felder: selbst
       erfasst -> nie verifiziert-stämmig (kein positiver Marker); signiert-stämmig
       -> als verifiziert erkannt. Der Guard ist feldId-agnostisch.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Korrekt-Pferd-Batterie-Heftklammer-9';
const DEF = { sektorId: 'housing', feldId: 'tpl_zaehlpunkt', abschnitt: 'Energie & Erzeugung', typ: 'text', label: 'Zählpunkt', schemaVersion: 23 };

// ── (1) Daten-Verbleib + Render nach Template-Widerruf ──────────────────────
test('Inv-1: Template-Feld übersteht den Krypto-Rundlauf UND rendert in einer frischen Instanz ohne das Template', async () => {
  // Sender: Depot mit einer eingewanderten Definition + Wert.
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.getData().feldDefinitionen.push(Object.assign({}, DEF));
  V.sektorFeldSetzen('housing', 'tpl_zaehlpunkt', 'DE0001234567890', { eingabeArt: 'eingabe' });
  const umschlag = await V.depotSerialisieren();

  // Empfänger = FRISCHE Kern-Instanz: kein Template, kein Übersetzer-Lauf, kein Credential.
  // „Template-Widerruf" = diese Instanz hat das Template nie gesehen; nur der Chiffretext liegt vor.
  const { V: V2 } = ladeKern();
  await V2.depotLaden(umschlag, PW);
  const d2 = V2.getData();

  // Definition hat den Rundlauf überlebt.
  const def2 = d2.feldDefinitionen.find(x => x.feldId === 'tpl_zaehlpunkt');
  assert.ok(def2, 'Definition liegt nach dem Rundlauf im Depot');
  assert.equal(def2.label, 'Zählpunkt', 'Definition vollständig (Label)');
  assert.equal(def2.abschnitt, 'Energie & Erzeugung', 'Definition vollständig (Abschnitt)');
  // Wert hat den Rundlauf überlebt (geteilter Slot).
  assert.equal(d2.sektoren.housing.tpl_zaehlpunkt, 'DE0001234567890', 'Wert im geteilten Slot erhalten');

  // SCHÄRFE: Die Definition im Depot ALLEIN genügt zum Rendern — ohne Template/Credential.
  const gruppen = V2._templateAbschnitte('housing');
  assert.equal(gruppen.length, 1, 'der Abschnitt entsteht allein aus dem Depot');
  const html = V2.templateAbschnitteHTML(gruppen, 'housing', false);
  assert.ok(html.includes('Zählpunkt'), 'Feld-Label rendert aus der Definition');
  assert.ok(html.includes('DE0001234567890'), 'Wert rendert mit — Feld ist nach Widerruf weiter anzeigbar');
  assert.ok(html.includes('data-feld="tpl_zaehlpunkt"'), 'adressiert den geteilten Slot');
});

// ── (2) Provenienz feldId-agnostisch ────────────────────────────────────────
test('Inv-2: ein dynamisches tpl_-Feld trägt Urheberschaft wie ein Kern-Feld', async () => {
  // Schreibt ein tpl_-Feld OHNE feldDefinitionen-Eintrag — genau das ist die Probe (feldId-agnostisch);
  // die Kennungs-Prüfung des Harness würde das Unbekannte sonst zu Recht abweisen.
  const { V } = ladeKern({ kennungsPruefungAus: true });
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Inhaberin');
  V.sektorFeldSetzen('housing', 'tpl_zaehlpunkt', 'DE42', { eingabeArt: 'eingabe' });

  const kette = V.liesUrheberschaft('housing', 'tpl_zaehlpunkt');
  assert.ok(Array.isArray(kette) && kette.length >= 1, 'Provenienz-Kette für das dynamische Feld vorhanden');
  const st = V._letzterStempel('housing', 'tpl_zaehlpunkt');
  assert.ok(st, 'jüngster Stempel existiert');
  assert.equal(st.akteur, akteur.personId, 'handelnde Person am dynamischen Feld benannt — wie am Kern-Feld');
});

// ── (3) U2-ADR-036-Selbstauskunft-Guard, feldId-agnostisch ──────────────────
test('Inv-3a: selbst erfasstes tpl_-Feld ist nie verifiziert-stämmig (kein positiver Marker)', async () => {
  // Schreibt ein tpl_-Feld OHNE feldDefinitionen-Eintrag — genau das ist die Probe (feldId-agnostisch);
  // die Kennungs-Prüfung des Harness würde das Unbekannte sonst zu Recht abweisen.
  const { V } = ladeKern({ kennungsPruefungAus: true });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.sektorFeldSetzen('housing', 'tpl_zaehlpunkt', 'DE42', { eingabeArt: 'eingabe' });

  assert.equal(V._feldVerifiziertStaemmig('housing', 'tpl_zaehlpunkt'), false, 'Selbstauskunft → nicht verifiziert-stämmig');
  const st = V._letzterStempel('housing', 'tpl_zaehlpunkt');
  assert.ok(st && st.verifiziert !== true, 'jüngster Stempel trägt KEIN verifiziert-Flag');
});

test('Inv-3b: signiert-stämmiges tpl_-Feld wird als verifiziert erkannt — Guard ist feldId-agnostisch', async () => {
  // Schreibt ein tpl_-Feld OHNE feldDefinitionen-Eintrag — genau das ist die Probe (feldId-agnostisch);
  // die Kennungs-Prüfung des Harness würde das Unbekannte sonst zu Recht abweisen.
  const { V } = ladeKern({ kennungsPruefungAus: true });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  // Wie der signiert-geprüfte Import-Pfad (importAnwenden bei plan.signiert) ein Feld stempelt.
  V.sektorFeldSetzen('housing', 'tpl_extern', 'X', { eingabeArt: 'import', verifiziert: true });

  assert.equal(V._feldVerifiziertStaemmig('housing', 'tpl_extern'), true, 'verifiziert-stämmiges dynamisches Feld wird erkannt');
  // Und das selbst erfasste bleibt davon unberührt getrennt.
  V.sektorFeldSetzen('housing', 'tpl_selbst', 'Y', { eingabeArt: 'eingabe' });
  assert.equal(V._feldVerifiziertStaemmig('housing', 'tpl_selbst'), false, 'self-Feld bleibt Selbstauskunft — sauber getrennt');
});
