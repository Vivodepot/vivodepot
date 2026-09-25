'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fix (Screenshot-Review, 26.08.2026) — die Depot-Liste
   (Pillen-Klick „Mein Depot ▾" in der Kopfzeile, flowDepotListe()) zeigte
   im Sub-Kontext fälschlich „Mein Depot — aktiv", obwohl tatsächlich ein
   fremdes Sub-Depot offen war (imSubKontext() wurde beim Bau dieses Dialogs
   nie geprüft). Ein Klick auf die fälschlich „aktiv" markierte Zeile war
   zudem folgenlos — der einzige funktionierende Rückweg war bislang
   ausschließlich das Dauer-Banner (#vm-zurueck → flowSubKontextVerlassen()).

   Fix: dieselbe imSubKontext()/aktiverSubName()-Prüfung wie beim Banner und
   der Kopfzeilen-Pille wird jetzt auch hier angewandt — im Sub-Kontext zeigt
   der Dialog das offene Sub-Depot als die tatsächlich aktive Zeile, „Mein
   Depot" verliert sein „aktiv"-Etikett, und eine zweite Dialog-Aktion ruft
   den bereits bestehenden, funktionierenden Rückweg (flowSubKontextVerlassen())
   auf — keine zweite Rückweg-Logik, nur ein zweiter Aufrufer der bestehenden.

   Rot-Beweis (A348-Pflicht): alle vier Proben unten wurden VOR diesem Fix
   gegen den Vor-Fix-Kern gehalten (`git stash` auf vivodepot.html) — zwei
   der vier gingen exakt am beschriebenen Bug rot (die dritte, „Anker-Kontext
   unverändert", blieb erwartungsgemäß grün als Gegenprobe; die vierte, „kein
   Abbrechen", ebenfalls grün, weil dieses Detail vom Fix unberührt bleibt).
   Nach dem Fix laufen alle vier grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-dl';

// Wie tests/modal-knoepfe.test.js: die GERENDERTE Knopfleiste lesen, nicht die Aufruf-Optionen —
// der DOM-Stub liefert für #m-abbr/#m-zweit/#m-dritt IMMER ein (Phantom-)Element zurück, sobald
// die ID irgendwo statisch im Kern vorkommt (load-kern.js, A248) — ein getElementById-Null-Check
// beweist hier also NICHTS über das tatsächliche Rendern. Nur die Knopfleisten-Beschriftung tut das.
function knopfBeschriftungen(dokument) {
  const html = dokument.getElementById('modal-inhalt').innerHTML || '';
  const zeile = (html.match(/<div class="modal-aktionen">([\s\S]*?)<\/div>/) || [])[1] || '';
  return [...zeile.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)]
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

async function mitOffenemSubKontext() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const e = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Sophie', inhaberin: 'Sophie', verwaltungsTyp: 'verwaltet' },
    'sub-pw-dl',
  );
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'sub-pw-dl');
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Verwalterin');
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: Sub-Kontext tatsächlich aktiv');
  return { V, document, depotUUID: e.depotUUID };
}

test('[Depot-Liste] Anker-Kontext (kein Sub offen): unverändert nur „Mein Depot", aktiv, ein Ausgang', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  assert.equal(V.imSubKontext(), false);

  V.flowDepotListe();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes(V.STRINGS.depotPilleEigen), '„Mein Depot" steht in der Liste');
  assert.match(html, /depot-liste-eintrag aktiv[^]*Mein Depot/, '„Mein Depot" trägt weiterhin die aktiv-Klasse');
  assert.ok(!html.includes(V.STRINGS.depotPilleVollmacht), 'keine Sub-Zeile ohne offenen Sub-Kontext');

  const labels = knopfBeschriftungen(document);
  assert.deepEqual(labels, [V.STRINGS.btnSchliessen], 'unverändert genau ein Ausgang ohne Sub-Kontext (Regressionsschutz)');
});

test('[Depot-Liste] Sub-Kontext offen: die Sub-Zeile ist aktiv, „Mein Depot" NICHT — der Bug ist behoben', async () => {
  const { V, document } = await mitOffenemSubKontext();

  V.flowDepotListe();
  const html = document.getElementById('modal-inhalt').innerHTML || '';

  // (a) die Sub-Zeile steht da, als die tatsächlich aktive markiert.
  assert.ok(html.includes('Sophie'), 'Name des offenen Sub-Depots steht im Dialog');
  assert.ok(html.includes(V.STRINGS.depotAktiv), 'ein "aktiv"-Etikett ist vorhanden (auf der Sub-Zeile)');

  // (b) „Mein Depot" behauptet NICHT mehr, die aktive Zeile zu sein — das war der Kernbefund:
  // die alte Fassung markierte „Mein Depot" unbedingt als aktiv, unabhängig vom echten Kontext.
  const meinDepotIdx = html.indexOf(V.STRINGS.depotPilleEigen);
  assert.ok(meinDepotIdx > -1, '„Mein Depot" steht weiterhin in der Liste (zum Zurückwechseln)');
  const meinDepotZeileStart = html.lastIndexOf('<div class="depot-liste-eintrag', meinDepotIdx);
  const meinDepotZeileEnde = html.indexOf('</div>', meinDepotIdx);
  const meinDepotZeile = html.slice(meinDepotZeileStart, meinDepotZeileEnde);
  assert.ok(!meinDepotZeile.includes(' aktiv'), '„Mein Depot"-Zeile trägt NICHT mehr die aktiv-Klasse');
  assert.ok(!meinDepotZeile.includes(V.STRINGS.depotAktiv), '„Mein Depot"-Zeile trägt NICHT mehr das aktiv-Etikett');
});

test('[Depot-Liste] Sub-Kontext offen: der Dialog bietet einen ECHTEN, funktionierenden Rückweg', async () => {
  const { V, document } = await mitOffenemSubKontext();

  V.flowDepotListe();
  const labels = knopfBeschriftungen(document);
  assert.ok(labels.includes(V.STRINGS.btnZurueckMeinDepot), 'im Sub-Kontext gibt es eine zweite Dialog-Aktion (den Rückweg)');
  assert.ok(labels.includes(V.STRINGS.btnSchliessen), '„Schließen" bleibt daneben bestehen');
  assert.equal(new Set(labels).size, labels.length, 'keine doppelten Knöpfe');

  document.getElementById('m-zweit').onclick();
  // flowSubKontextVerlassen() re-versiegelt per WebCrypto (async) — real abwarten, keine synchrone Direktprüfung.
  // Auf den Zustand warten statt einer festen Zeit (23.09.2026): seit ein Sub-Depot V4 ist (U2-ADR-002), verschlüsselt
  // das Neuversiegeln jede Einheit einzeln und brauchte unter Suite-Last länger als die früheren 300 ms.
  for (let i = 0; i < 100 && V.imSubKontext(); i++) await new Promise((r) => setTimeout(r, 50));

  assert.equal(V.imSubKontext(), false, 'der Klick hat den Sub-Kontext TATSÄCHLICH verlassen — kein No-op mehr');
});

test('[Depot-Liste] Sub-Kontext offen: „Abbrechen" bleibt weiterhin abwesend — auch mit dem neuen Rückweg-Knopf', async () => {
  const { V, document } = await mitOffenemSubKontext();

  V.flowDepotListe();
  const labels = knopfBeschriftungen(document);
  assert.ok(!labels.includes(V.STRINGS.btnAbbrechen), 'weiterhin ohne „Abbrechen" — reine Anzeige plus Rückweg, keine Entscheidung, die abzubrechen wäre');
});
