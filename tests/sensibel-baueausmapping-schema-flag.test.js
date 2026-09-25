'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Sensibel-Architektur", 09.08.2026, Zug 4 — echter Fund
   des neuen Wächters W-13: `baueAusMapping` (VC/XÖV/FIM/EDCI-Export)
   prüfte NICHT das echte Schema-Flag (`feld.sensibel`), sondern eine
   HAND-GEPFLEGTE Kopie davon (`m.sensibel` auf der Mapping-Zeile). Zug 3
   setzte `sensibel: true` an 75 weiteren Schema-Feldern — 20 davon haben
   eine Mapping-Zeile in VC_IDENTITAET_MAPPING/XOEV_VERWALTUNG_MAPPING/
   EDCI_BILDUNG_MAPPING/VC_SOZIALVERSICHERUNG_MAPPING, deren `m.sensibel`
   nie nachgezogen wurde — ein Feld wie `birthName` (identitaet, seit
   Zug 3 schema-sensibel) ginge über den SD-JWT-VC-Export ungefiltert
   heraus, obwohl derselbe Wert im JSON-/DOCX-/PDF-Export längst
   zurückgehalten wird. Fix: `baueAusMapping` liest jetzt dieselbe
   Quelle wie jeder andere Export-Weg — `feldIstSensibel` am ECHTEN,
   über `feldDefFuer` aufgelösten Feld.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Sensibel-U4·Regel 18] echter Kern: baueAusMapping hält ein schema-sensibles Feld ohne Opt-in zurück, auch ohne m.sensibel auf der Mapping-Zeile', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'birthName', 'Musterfrau');
  // geburtsname ist seit Zug 3 schema-sensibel — die Mapping-Zeile selbst trägt (Ausgangsbefund)
  // KEIN eigenes m.sensibel:true.
  const eintrag = V.VC_IDENTITAET_MAPPING.find((m) => m.feld === 'birthName');
  assert.ok(eintrag, 'geburtsname muss in VC_IDENTITAET_MAPPING stehen');
  const ohneOptIn = V.baueAusMapping('identity', V.VC_IDENTITAET_MAPPING);
  assert.equal(ohneOptIn.birth_family_name, undefined, 'schema-sensibles Feld muss ohne Opt-in zurückgehalten werden');
  const mitOptIn = V.baueAusMapping('identity', V.VC_IDENTITAET_MAPPING, { sensibel: true });
  assert.equal(mitOptIn.birth_family_name, 'Musterfrau', 'Opt-in schaltet frei, wie überall sonst');
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `taxIdsTaxNumbers` ist jetzt eine Liste — die Zeile
// `{ feld: 'taxIdsTaxNumbers', ziel: 'tax_id' }` in VC_FINANZEN_MAPPING ist ENTFALLEN (dokumentierter
// Gap, eigener Zug offen, s. Kommentar an der Mapping-Tabelle und tests/import-formate.test.js
// Test 10b). Der Regressionsanker gilt darum nicht mehr dem Sensibel-Zurückhalten (dafür gibt es
// keine Mapping-Zeile mehr, die zurückhalten könnte), sondern der ehrlichen Abwesenheit.
test('[Sensibel-U4] `tax_id` (steuerid) bleibt aus dem Export — Mapping entfallen, nicht der Sensibel-Filter zuständig', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  assert.equal(V.VC_FINANZEN_MAPPING.some((m) => m.feld === 'taxIdsTaxNumbers'), false,
    'kein Mapping-Eintrag mehr für steuerid — Liste statt Skalar');
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12345678901' });
  const out = V.baueAusMapping('finance', V.VC_FINANZEN_MAPPING);
  assert.equal(out.tax_id, undefined, 'kein tax_id-Claim, mit oder ohne Sensibel-Opt-in');
});

test('[Sensibel-U4] baueAusMapping lässt ein nicht-sensibles Feld unverändert durch', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const out = V.baueAusMapping('identity', V.VC_IDENTITAET_MAPPING);
  assert.equal(out.given_name, 'Maria');
});

test('[Sensibel-U4] echter Kern: baueAusMapping hält JEDES schema-sensible Feld aus allen fünf Mapping-Arrays zurück, unabhängig von m.sensibel', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const karten = [
    ['VC_IDENTITAET_MAPPING', 'identity'],
    ['XOEV_VERWALTUNG_MAPPING', 'administration'],
    ['EDCI_BILDUNG_MAPPING', 'education'],
    ['VC_FINANZEN_MAPPING', 'finance'],
    ['VC_SOZIALVERSICHERUNG_MAPPING', 'socialInsurance'],
  ];
  const durchgerutscht = [];
  for (const [mapName, sektorId] of karten) {
    const mapping = V[mapName];
    for (const m of mapping) {
      const def = V.feldDefFuer(sektorId, m.feld);
      if (!def || def.sensibel !== true) continue;
      const wert = (def.typ === 'ref') ? { override: 'TESTWERT_MUSS_ZURUECKGEHALTEN_WERDEN' } : 'TESTWERT_MUSS_ZURUECKGEHALTEN_WERDEN';
      V.sektorFeldSetzen(sektorId, m.feld, wert);
      const out = V.baueAusMapping(sektorId, mapping);
      if (out[m.ziel] !== undefined) durchgerutscht.push(mapName + '.' + m.feld);
    }
  }
  assert.deepEqual(durchgerutscht, [], 'jedes schema-sensible Mapping-Feld muss ohne Opt-in zurückgehalten werden — real gebaut, nicht abgeleitet');
});
