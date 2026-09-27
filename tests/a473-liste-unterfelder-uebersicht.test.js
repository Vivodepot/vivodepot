'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A473 · Die Übersicht „Das wird herausgegeben" ist blind für sensible
   Listen-Unterfelder
   ────────────────────────────────────────────────────────────────────────────
   `exportUebersichtModell` prüfte im Bereichs-Zweig nur, ob das TRÄGERFELD
   einer Liste (z. B. `identity.formerNames`) selbst `sensibel` ist — nie,
   ob seine `unterFelder` es sind. Ein Trägerfeld ohne eigene Sensibel-Marke
   landete unter „enthalten", während sein gesamter Inhalt (alle Unterfelder
   sensibel, K3-Muster) am realen Export leer herausging.

   ZWEI FÄLLE, nicht einer:
     · `fruehere_namen` — ALLE Unterfelder sensibel → die Liste geht als leere
       Hülle heraus, gehört komplett unter „zurückgehalten".
     · `finance.accounts` — NUR `iban` sensibel, `bank`/`art` nicht → das
       Trägerfeld bleibt zu Recht unter „enthalten" (es wird ja etwas
       herausgegeben), trägt aber jetzt einen Hinweis, dass ein Unterfeld
       zurückgehalten wird.

   Derselbe Mechanismus wie am realen Export (`unterfeldIstSensibel`) —
   hier nur GEZÄHLT statt gefiltert. Der Kennungs-Listen-Weg (Anlass-Export)
   ist NICHT betroffen — er löst Listen-Selektoren längst einzeln auf.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-a473';

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Prüfung');
  return V;
}

test('[A473·Rot-Beweis] fruehere_namen (alle Unterfelder sensibel) landet unter zurueckgehalten, nicht enthalten', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('identity', 'formerNames',
    { name: 'Maria Müller', reason: 'heirat' });
  const m = V.exportUebersichtModell('identity');
  const enthaltenIds = m.enthalten.map((e) => e.feld);
  const zurueckgehaltenIds = m.zurueckgehalten.map((e) => e.feld);
  assert.ok(!enthaltenIds.includes('formerNames'),
    'fruehere_namen darf NICHT unter enthalten stehen — es ginge als leere Hülle heraus');
  assert.ok(zurueckgehaltenIds.includes('formerNames'), 'fruehere_namen fehlt in zurueckgehalten');
});

test('[A473] finance.accounts (nur iban sensibel) bleibt enthalten, trägt aber den Teilweise-Hinweis', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('finance', 'accounts', { accountType: 'Girokonto', iban: 'DE89370400440532013000' });
  const m = V.exportUebersichtModell('finance');
  const eintrag = m.enthalten.find((e) => e.feld === 'accounts');
  assert.ok(eintrag, 'konten muss unter enthalten stehen — bank/art werden ja herausgegeben');
  assert.equal(eintrag.teilweiseZurueckgehalten, true);
  assert.ok(!m.zurueckgehalten.some((e) => e.feld === 'accounts'), 'konten steht NICHT vollständig unter zurueckgehalten');
});

test('[A473·Gegenprobe] finance.accounts OHNE iban trägt keinen Teilweise-Hinweis', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('finance', 'accounts', { accountType: 'Girokonto' });
  const m = V.exportUebersichtModell('finance');
  const eintrag = m.enthalten.find((e) => e.feld === 'accounts');
  assert.ok(eintrag);
  assert.equal(eintrag.teilweiseZurueckgehalten, undefined);
});

test('[A473·Gegenprobe] ein gewöhnliches sensibles Skalarfeld verhält sich unverändert', async () => {
  const V = await depot();
  V.sektorFeldSetzen('identity', 'birthName', 'Immergrün');
  const m = V.exportUebersichtModell('identity');
  assert.ok(m.zurueckgehalten.some((e) => e.feld === 'birthName'));
  assert.ok(!m.enthalten.some((e) => e.feld === 'birthName'));
});

test('[A473] die gerenderte Übersicht zeigt den Teilweise-Hinweis am Konten-Eintrag', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Prüfung');
  V.listenEintragHinzufuegen('finance', 'accounts', { accountType: 'Girokonto', iban: 'DE89370400440532013000' });
  V.flowExportUebersicht({ sektorId: 'finance', titel: 'X', aufFortfahren: () => {} });
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(html.includes('einzelne Angaben davon werden zurückgehalten'), html);
});
