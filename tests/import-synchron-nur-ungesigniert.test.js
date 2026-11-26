'use strict';
/* Der synchrone Einleseweg liest die kompakte SD-JWT-Form nicht (IMPORT-SYNCHRON-UNGEPRUEFT, 21.11.2026).
   ──────────────────────────────────────────────────────────────────────────────────────────────────────
   Die kompakte Form trägt eine Selbst-Signatur und Offenlegungen, die nur über `_sd` gebunden sind (RFC 9901 §7.1). Beides prüft
   importPlanGeprueft. importPlan ist synchron und prüft nicht; er liest die kompakte Form darum nur mit der Marke, die allein
   importPlanGeprueft übergibt. Jeder andere Aufrufer, auch kernAPI.importVorschau und kernAPI.importiere, bekommt eine Ablehnung.
   Wächter (1): die Aufrufstellen von importPlan( im Kern sind gezählt; eine neue Stelle macht die Probe rot und verlangt die
   Entscheidung, ob sie geprüft lesen muss. Wächter (2): kein Format aus IMPORT_FORMATE bringt über den synchronen Weg Werte
   aus einer kompakten Form herein. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* Aufrufstellen von importPlan( je umgebender Funktion (Definition mitgezählt). Eine Änderung hier ist eine Entscheidung:
   ruft die neue Stelle mit Fremdtext, muss sie über importPlanGeprueft gehen. */
const AUFRUFSTELLEN = Object.freeze({
  importPlan: 1,               // die Definition
  importPlanGeprueft: 1,       // der einzige Aufrufer mit Marke
  xpsGeburtVorschauModell: 1,  // XPS-Geburtsurkunde: JSON, nie kompakt
  xpsGeburtAlsUnterlage: 1,
  flowXpsGeburtVorschau: 2,
  kernAPI: 2,                  // importVorschau, importiere: ohne Marke, also abgelehnt
  medDokFelderPlan: 1,
});

function aufrufstellen(quelltext) {
  const D = /^(?:async\s+)?function\s*\*?\s*([\w$]+)|^(?:const|let|var)\s+([\w$]+)/;
  const C = /(?<![\w$.])importPlan\(/g;
  const aus = {};
  let ort = '(oben)';
  for (const z of quelltext.split('\n')) {
    const m = D.exec(z);
    if (m) ort = m[1] || m[2];
    const n = (z.match(C) || []).length;
    if (n) aus[ort] = (aus[ort] || 0) + n;
  }
  return aus;
}

async function eigeneKompakteAusgabe(V) {
  await V.depotAnlegen('import-synchron-lang-genug-2026');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
  V.sektorFeldSetzen('identity', 'streetAddress', 'Lindenweg 3');
  const { serialisierung } = await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}));
  assert.match(serialisierung, /~$/);
  return serialisierung;
}

test('[Import·synchron] die kompakte Form kommt nur über importPlanGeprueft herein', async () => {
  const { V } = ladeKern();
  const kompakt = await eigeneKompakteAusgabe(V);
  const sync = V.importPlan('sd-jwt-vc-identitaet', kompakt);
  assert.equal(sync.ungueltig, true);
  assert.equal(sync.grund, 'kompakt-nur-geprueft');
  assert.deepEqual(sync.zeilen, []);
  assert.equal(V.importUngueltigNachricht(sync), V.STRINGS.importUngueltig, 'der vorhandene Satz, kein neuer Text');
  const vorschau = V.kernAPI.importVorschau('sd-jwt-vc-identitaet', kompakt);
  assert.equal(vorschau.ungueltig, true, 'kernAPI.importVorschau liest nicht ungeprüft');
  const geprueft = await V.importPlanGeprueft('sd-jwt-vc-identitaet', kompakt);
  assert.ok(!geprueft.ungueltig, 'die unveränderte eigene Form bleibt lesbar: ' + geprueft.grund);
  assert.ok(geprueft.zeilen.length >= 4);
});

test('[Import·synchron] die JSON-Selbstauskunft bleibt synchron lesbar', async () => {
  const { V } = ladeKern();
  await eigeneKompakteAusgabe(V);
  const plan = V.importPlan('sd-jwt-vc-identitaet', JSON.stringify(V.sdJwtVcIdentitaet({})));
  assert.ok(!plan.ungueltig);
  assert.ok(plan.zeilen.length >= 4);
});

test('[Import·synchron·Wächter] die Aufrufstellen von importPlan( sind gezählt', () => {
  assert.deepEqual(aufrufstellen(fs.readFileSync(KERN, 'utf8')), { ...AUFRUFSTELLEN });
});

test('[Import·synchron·Wächter·Rot-Beweis] eine neue Aufrufstelle fällt auf', () => {
  const quelle = 'function importPlan(a) {\n}\nfunction neuerWeg(t) {\n  return importPlan(\'x\', t);\n}\nV.importPlan(1);\n';
  assert.deepEqual(aufrufstellen(quelle), { importPlan: 1, neuerWeg: 1 });
});

test('[Import·synchron·Wächter] kein Format bringt synchron Werte aus einer kompakten Form herein', async () => {
  const { V } = ladeKern();
  const kompakt = await eigeneKompakteAusgabe(V);
  const durchgelassen = async (lesen) => {
    const durch = [];
    for (const def of V.IMPORT_FORMATE) {
      let plan;
      try { plan = await lesen(def.id); } catch (_) { continue; }
      const werte = (plan.zeilen || []).length + (plan.listen || []).length + (plan.register || []).length;
      if (!plan.ungueltig && werte > 0) durch.push(def.id);
    }
    return durch;
  };
  assert.ok(V.IMPORT_FORMATE.length > 10, 'Formate gelesen');
  assert.deepEqual(await durchgelassen((id) => V.importPlan(id, kompakt)), []);
  // Rot-Beweis des Wächters: derselbe Zähler sieht die Werte, wenn der Weg sie hereinlässt (hier der geprüfte).
  assert.ok((await durchgelassen((id) => V.importPlanGeprueft(id, kompakt))).includes('sd-jwt-vc-identitaet'), 'der Zähler sieht hereingelassene Werte');
});
