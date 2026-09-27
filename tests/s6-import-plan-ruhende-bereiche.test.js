'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   s6-import-plan-ruhende-bereiche.test.js — Rot-Beweis für S6
   (code-review-schranke2-bereichrolle-bereichkann-2026-09-16.md, in der
   Befund-Ratsche 18./19.09.2026 nachgetragen).

   S6 · NIEDRIG · "Import-Stellen (`_importPlanZeile`/`importAnwenden`) hängen
   an denselben Rollen [wie S2-S5]; heute durch die Weckung beim Plan
   gedeckt, ohne eigene Probe."

   `_importPlanZeile` löst `feldDefFuer(sektorId, feldId)` auf und fällt bei
   einer nicht gefundenen Definition auf `{ id: feldId, typ: 'text', label:
   feldId }` zurück — GENAU DIE FORM, DIE EIN SCHLAFENDER BEREICH OHNE
   WECKUNG HÄTTE. Diese Probe hält fest: in Pro ist `finance` (ein NATIVER,
   nicht eingebauter Bereich) über den echten Einlese-Weg
   (`importPlan`/`importAnwenden`) trotzdem mit der ECHTEN Feld-Definition
   erreichbar — die Weckung beim Plan (`_vollDepotFelder` → `_ruhendeBereichIds`
   → `_sektorIndexNeuBauen`) trägt auch den Import-Pfad, nicht nur die
   Render-Strecke, die S2–S5 halten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');

async function ladeKernAus(kernPfad) {
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const paar = ladeKern({ blank: true });
  if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  return paar;
}

test('[S6·Rot-Beweis] pro-de: der Import-Weg löst ein Feld eines schlafenden, nativen Bereichs mit der ECHTEN Definition auf', async () => {
  const p = PRODUKTE.find((x) => x.slug === 'pro-de');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 's6-import-'));
  try {
    const r = konfektionieren({
      ziel, slug: p.slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    const { V } = await ladeKernAus(path.join(r.ordner, 'vivodepot.html'));
    await V.basisVorlagenVerifizieren();
    await V.depotAnlegen('s6-import-plan-pw');
    V.akteurSelbstErklaeren('Rundlauf');

    // Vorbedingung: pro-de kennt "finance" nicht als eigenen (Pro-)Bereich —
    // es muss über die Datei geweckt werden, sonst prüft dieser Test nichts.
    assert.ok(!V.bereicheAlle().some((b) => b.id === 'finance'), 'Vorbedingung gefallen: finance ist in pro-de schon vor dem Import bekannt');

    const exportRoh = JSON.stringify({ sektoren: { finance: { companyPensionSchemeBav: 'Allianz' } } });
    const plan = V.importPlan('json', exportRoh);
    assert.equal(plan.ungueltig, false, 'importPlan lehnt den Plan ab — sollte gültig sein');
    const zeile = (plan.zeilen || []).find((z) => z.sektorId === 'finance' && z.feldId === 'companyPensionSchemeBav');
    assert.ok(zeile, 'keine Import-Zeile für finance.companyPensionSchemeBav — die Weckung beim Plan hat nicht gegriffen');
    // Der eigentliche Rot-Beweis: der Fallback in _importPlanZeile wäre
    // { label: feldId } — die Kennung selbst als Label. Ein echt aufgelöstes
    // Feld trägt das MENSCHENLESBARE Label aus dem Feldkatalog.
    assert.notEqual(zeile.label, 'companyPensionSchemeBav', 'Label ist die rohe Kennung — feldDefFuer ist auf den Fallback gefallen (Bereich nicht geweckt)');
    assert.equal(zeile.label, 'Betriebliche Altersvorsorge (bAV) — Anbieter');

    const ergebnis = V.importAnwenden(plan);
    assert.equal(ergebnis.gesetzt, 1);
    assert.equal(V.feldRohwert('finance', 'companyPensionSchemeBav'), 'Allianz');
    assert.ok(V.bereicheAlle().some((b) => b.id === 'finance'), 'finance ist nach dem Import nicht in bereicheAlle()');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});
