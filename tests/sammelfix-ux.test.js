'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sammel-Fix UX (U2-ADR-024): Export-Opt-in + Sub-Depot-Akzent-Vererbung
   ────────────────────────────────────────────────────────────────────────
   §1 Export-Dialog datensparsam: die Ephemer-Mechanik (`exportAuswahlEphemerAnwenden`) gilt für
      BEIDE Richtungen unverändert — wegklicken/nichts wählen → nichts geht raus, die Auswahl
      persistiert NIE als Sensibel-Markierung. Die VORAUSWAHL selbst ist seit dem Nachtrag
      12.08.2026 („Die Herausgabe kommt ohne Kästchen aus") gerichtet: bei GESETZTER
      sektorId Opt-out (kein Kästchen, Leseliste + „Etwas zurückhalten"), bei `sektorId:null`
      (Gesamt-PDF/volles JSON) unverändert Opt-in mit Kästchen.
   §2 Sub-Depot-Akzent wird an der Wurzel (--akzent) vererbt → Einstellungen/Dialoge/Toasts
      erben ihn; überlebt einen späteren Modus-Wechsel (Reihenfolge-Robustheit).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
function kandidatenVon(V, sektorId) {
  const m = V.exportUebersichtModell(sektorId);
  return m.enthalten.concat(m.zurueckgehalten.filter(e => !e.schemaSensibel));
}

/* ── §1 — Opt-in-Logik (ephemer) ─────────────────────────────────────────── */

test('§1 Opt-in: nur Angekreuztes geht raus; persistente Markierung bleibt unberührt', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  const kandidaten = kandidatenVon(V, 'identity');
  let captured = null;
  await V.exportAuswahlEphemerAnwenden(kandidaten, new Set(['identity/givenName']), (opt) => { captured = V.vollExportJSON(opt); });
  assert.equal(captured.depot.sektoren.identity.givenName, 'Maria', 'angekreuzt → mitgegeben');
  assert.equal(captured.depot.sektoren.identity.familyName, undefined, 'nicht angekreuzt → zurückgehalten');
  assert.equal(Object.keys(V.getData().sensibelFelder).length, 0, 'ephemer: keine persistente Markierung nach Export');
});

test('§1 Opt-in: nichts angekreuzt → es geht nichts heraus (datensparsam)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const kandidaten = kandidatenVon(V, 'identity');
  let captured = null;
  await V.exportAuswahlEphemerAnwenden(kandidaten, new Set(), (opt) => { captured = V.vollExportJSON(opt); });
  assert.equal(captured.depot.sektoren.identity && captured.depot.sektoren.identity.givenName, undefined, 'nichts gewählt → nichts heraus');
  assert.equal(Object.keys(V.getData().sensibelFelder).length, 0, 'ephemer: Markierung danach leer');
});

test('§1 „Alles auswählen": alle Kandidaten gehen raus', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  const kandidaten = kandidatenVon(V, 'identity');
  const alle = new Set(kandidaten.map(e => e.sektor + '/' + e.feld));
  let captured = null;
  await V.exportAuswahlEphemerAnwenden(kandidaten, alle, (opt) => { captured = V.vollExportJSON(opt); });
  assert.equal(captured.depot.sektoren.identity.givenName, 'Maria');
  assert.equal(captured.depot.sektoren.identity.familyName, 'Mustermann');
});

test('§1 ephemer: eine VORHER gesetzte Sensibel-Markierung überlebt den Export unverändert', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sensibelFeldSetzen('identity', 'givenName', true);    // Nutzerin hat das Feld als sensibel markiert
  const kandidaten = kandidatenVon(V, 'identity');
  await V.exportAuswahlEphemerAnwenden(kandidaten, new Set(['identity/givenName']), () => { V.vollExportJSON({ sensibel: false }); });
  assert.equal(V.getData().sensibelFelder.identity && V.getData().sensibelFelder.identity.givenName, true,
    'persistente Sensibel-Markierung nach dem Export exakt wiederhergestellt');
});

// „Die Herausgabe kommt ohne Kästchen aus" (12.08.2026) dreht §1 bei GESETZTER
// sektorId auf Opt-out (Nachtrag am ADR, s. dort) — kein Kästchen mehr, dafür eine Leseliste
// + „Nicht mitgeschickt"-Satz + „Etwas zurückhalten"-Zweitweg. `sektorId:null` (Gesamt-PDF/
// volles JSON, hier NICHT geprüft) bleibt unverändert Opt-in mit Kästchen — s.
// export-durchgang.test.js.
test('§1 Dialog rendert Opt-out (sektorId gesetzt): kein Kästchen, Leseliste, „Etwas zurückhalten"', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.betreteApp();
  V.flowExportUebersicht({ sektorId: 'identity', titel: 'Test', aufFortfahren: () => {} });
  const modal = document.getElementById('modal-inhalt');
  assert.ok(modal, 'Modal gerendert');
  const html = modal.innerHTML;
  assert.ok(!html.includes('type="checkbox"'), 'kein Kästchen mehr im Normalweg');
  assert.ok(html.includes('exp-zurueckhalten-weg') && html.includes(V.STRINGS.exportEtwasZurueckhalten),
    '„Etwas zurückhalten"-Zweitweg vorhanden');
  assert.ok(html.includes('Maria') || html.includes('Vorname'), 'das gefüllte Feld steht in der Geht-mit-Liste');
});

/* ── §2 — Sub-Depot-Akzent an der Wurzel vererbt ─────────────────────────── */

// Hinweis: der node-Test-DOM stubt classList als No-Op (contains→false), darum ist die `vm-akzent`-
// Klasse (Toast-Scoping auf <html>) nicht node-prüfbar — sie geht auf die Mac-Abnahme. Node-prüfbar
// ist der KERN des Fixes: der generische --akzent an der Wurzel (den Einstellungen/Dialoge erben).
test('§2 Sub-Akzent an der Wurzel (--akzent) vererbt; überlebt Modus-Wechsel; Reset → Modus-Akzent', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  const root = document.documentElement;
  // Palettentausch (04.08.2026): keine Farbe trägt mehr eine Default-/Reset-Sonderrolle (Zug 3) —
  // jede der sechs ist ein echter Sub-Akzent, die erste genügt.
  const sub = (V.SUBDEPOT_PALETTE || [])[0];
  assert.ok(sub, 'es gibt mindestens einen Sub-Akzent in der Palette');
  V.setzeSubDepotAkzent(sub);
  assert.equal(root.style.getPropertyValue('--akzent'), 'var(--' + sub + ')', '--akzent an der Wurzel = Sub-Akzent → Dialoge/Einstellungen erben');
  // Der Modus-Setter läuft in der echten Sequenz NACH setzeSubDepotAkzent — darf den Sub-Akzent nicht klauen.
  V.Modus._setzeIntern('vollmacht');
  assert.equal(root.style.getPropertyValue('--akzent'), 'var(--' + sub + ')', 'Sub-Akzent überlebt den Modus-Setter (Reihenfolge-robust)');
  // Reset (Zug 3: eigener, farbfreier Weg) → --akzent zurück auf den aktuellen Modus-Akzent (NICHT entfernt — gehört dem Modus).
  V.entferneSubDepotAkzentOverride();
  assert.notEqual(root.style.getPropertyValue('--akzent'), 'var(--' + sub + ')', '--akzent nicht mehr Sub-Akzent');
  assert.ok(root.style.getPropertyValue('--akzent'), '--akzent gesetzt (Modus-Akzent), nicht leer');
});
