'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Sub-Depots entstehen nur im eigenen Depot, nie im betretenen Sub-Depot
   (Befund SUB-DEPOT-ANLEGEN-IM-SUB-KONTEXT, 15.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Das Modell ist flach (B16-ADR-052: ein Anker, null bis vier Sub-Depots; ADR-068v2 Klärung 4–7: keine Kaskade). Im
   betretenen Sub-Depot schrieben Anlegen und Einhängen in dessen Inhalt (`data`) und erzeugten eine zweite Ebene, die
   die Liste der Verwaltung (aus dem Anker) nie zeigte und die sich darum auch nicht exportieren ließ.

   Gehalten wird an drei Stellen: die Liste zeigt im betretenen Sub-Depot weder „Anlegen“ noch „Einhängen“, sondern den
   Weg zurück; die Abläufe dahinter brechen dort mit einem Hinweis ab; die Funktionen selbst weisen den Aufruf ab.
   Rot-Beweis: ohne die Abweisung entstünde das Sub-Depot im Inhalt des betretenen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'nur-im-anker-anker-504';
const SUB_PW = 'nur-im-anker-sub-618';

async function betretenesSubDepot(laden = ladeKern) {
  const { V, document } = laden();
  await V.depotAnlegen(ANKER_PW);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Klara', inhaberin: 'Klara', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Verwalterin');
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: Sub-Kontext aktiv');
  return { V, document };
}

test('[Sub-Depot·nur im Anker] im betretenen Sub-Depot weist subDepotAnlegen ab, und im Inhalt entsteht nichts', async () => {
  const { V } = await betretenesSubDepot();
  await assert.rejects(() => V.subDepotAnlegen({ bezeichnung: 'Zweite Ebene', inhaberin: 'X', verwaltungsTyp: 'verwaltet' }, 'zweite-ebene-pw-1'),
    /in Ihrem eigenen Depot an/);
  assert.deepEqual(V.getData().verwalteteDepots || [], [], 'im Inhalt des betretenen Sub-Depots ist eine zweite Ebene entstanden');
});

test('[Sub-Depot·nur im Anker] im betretenen Sub-Depot weist subDepotEinhaengen ab', async () => {
  const { V } = await betretenesSubDepot();
  assert.throws(() => V.subDepotEinhaengen({ dateiTyp: 'vivodepot-blackbox-export', umschlag: {} }), /in Ihrem eigenen Depot an/);
});

test('[Sub-Depot·nur im Anker] die Liste zeigt im betretenen Sub-Depot weder „Anlegen“ noch „Einhängen“, sondern den Weg zurück', async () => {
  const { V, document } = await betretenesSubDepot();
  V.renderVerwalteteDepots();
  // Das Dokument der Unit-Umgebung liefert zu jeder Kennung ein Element; geprüft wird darum das gezeichnete HTML.
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('id="sub-neu"'), 'der Knopf „Anlegen“ steht im betretenen Sub-Depot');
  assert.ok(!html.includes('id="sub-einhaengen"'), 'der Knopf „Einhängen“ steht im betretenen Sub-Depot');
  assert.ok(html.includes('id="sub-anlegen-nur-anker"'), 'der Hinweis auf das eigene Depot fehlt');
});

test('[Sub-Depot·nur im Anker] im eigenen Depot bleibt Anlegen wie bisher', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Ich');   // Anlegen ist eine Eigentümer-Handlung (Modus.darfBearbeiten)
  V.renderVerwalteteDepots();
  assert.ok(document.getElementById('content').innerHTML.includes('id="sub-neu"'), 'der Knopf „Anlegen“ fehlt im eigenen Depot');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Klara', inhaberin: 'Klara', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  assert.ok(V.ankerDaten().verwalteteDepots.some((x) => x.depotUUID === e.depotUUID));
});

test('[Sub-Depot·nur im Anker·Rot-Beweis] ohne die Abweisung entstünde das Sub-Depot im Inhalt des betretenen', async () => {
  const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
  const abweisung = "  if (imSubKontext()) throw new Error(STRINGS.subAnlegenNurAnker);   // flaches Modell (B16-ADR-052), s. renderVerwalteteDepots\n";
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  assert.ok(text.includes(abweisung), 'Rot-Beweis ohne Anker: die Abweisung steht nicht in der erwarteten Form im Kern');
  const ohne = text.split(abweisung).join('');
  const verzeichnis = fs.mkdtempSync(path.join(os.tmpdir(), 'nur-im-anker-rot-'));
  const kopie = path.join(verzeichnis, 'vivodepot.html');
  fs.writeFileSync(kopie, ohne, 'utf8');
  try {
    const { V } = await betretenesSubDepot(() => ladeKern({ htmlPfad: kopie, backen: true }));
    await V.subDepotAnlegen({ bezeichnung: 'Zweite Ebene', inhaberin: 'X', verwaltungsTyp: 'verwaltet' }, 'zweite-ebene-pw-1');
    assert.equal((V.getData().verwalteteDepots || []).length, 1, 'ohne Abweisung hätte das Sub-Depot im Inhalt entstehen müssen');
  } finally {
    fs.rmSync(verzeichnis, { recursive: true, force: true });
  }
});
