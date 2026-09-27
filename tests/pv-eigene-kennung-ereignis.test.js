'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Laufzettel „Die Vierunddreissig" (22.08.2026), Posten 1 / 1.0b —
   Registerzeile A494 — „Die Patientenverfügung wird eine Zeile mit eigener
   Kennung, damit ein Ereignis sie erreicht."
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN VOR DEM BAU: die PV ist EINE flache Instanz pro Depot (der
   BMJ-Vordruck ist kein Listen-Mechanismus wie vorsorge_instrumente) — sie
   in Listen-Unterfelder umzubauen wäre der Umbau eines ganzen Rechtsdokuments
   für zwei Personenfelder. Die eigentliche Lücke war schmaler: `supportFrom
   ThesePersons`/`confidentialityWaiverFor` standen bislang in
   EREIGNIS_ACHSE_FELDER als `ausgenommen` — kein zeilenId, also kein
   Dokument-Träger, also kein Anlass.

   DIE KENNUNG, DIE DIESER POSTEN GIBT, ist nicht eine neue Zeilen-id, sondern
   die bereits bestehende Dedup-Garantie `dokumentFuerTyp('living-will')`
   (U2-ADR-014 Einheit 4: höchstens EIN Dokument-Datensatz je typ) — ihre
   `doc.id` trägt den Anlass, ganz ohne zeilenId. Diese Reise belegt, dass der
   Auslöser (Familienstand/Tod) sie jetzt tatsächlich erreicht, und dass eine
   unbeteiligte Person nichts markiert.

   Rot-Beleg: gegen den Stand vor diesem Posten (`ausgenommen` statt `instrumentTyp`,
   kein `_ereignisFlachesFeldMarkieren`) fallen sieben der acht Proben unten — belegt
   per `git stash` gegen den unveränderten Kern, nicht behauptet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pv-eigene-kennung-pw';
const PV_TYP = 'living-will';

async function depotMitPvPersonen() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const beistandId = V.personHinzufuegen({ name: 'Beistand Person' });
  const schweigepflichtId = V.personHinzufuegen({ name: 'Vertraute Ärztin-Kontakt' });
  V.sektorFeldSetzen('advanceCare', 'supportFromThesePersons', [{ ref: beistandId }]);
  V.sektorFeldSetzen('advanceCare', 'confidentialityWaiverFor', [{ ref: schweigepflichtId }]);
  return { V, beistandId, schweigepflichtId };
}

test('[Posten1] Registry: supportFromThesePersons/confidentialityWaiverFor tragen jetzt Ereignisse statt `ausgenommen`', async () => {
  const { V } = ladeKern();
  for (const feldId of ['supportFromThesePersons', 'confidentialityWaiverFor']) {
    const e = V.EREIGNIS_ACHSE_FELDER.find(x => x.sektorId === 'advanceCare' && x.feldId === feldId);
    assert.ok(e, feldId + ' fehlt in der Registry');
    assert.equal(e.ausgenommen, undefined,
      'ROT ERWARTET, wenn falsch: ' + feldId + ' darf nicht mehr ausgenommen sein');
    assert.equal(e.instrumentTyp, PV_TYP);
    assert.deepEqual(e.ereignisse.slice().sort(), ['familienstand', 'tod']);
  }
});

test('[Posten1] ereignisMarkieren(familienstand): legt ein UNDATIERTES PV-Dokument an und markiert es', async () => {
  const { V, beistandId } = await depotMitPvPersonen();
  assert.equal(V.dokumentFuerTyp(PV_TYP), null, 'Vorbedingung: noch kein PV-Dokument-Datensatz');
  const m = V.ereignisMarkieren('familienstand', beistandId, new Date());
  assert.equal(m.length, 1, 'ROT ERWARTET, wenn falsch: die Patientenverfügung muss jetzt erreicht werden');
  const doc = V.dokumentFuerTyp(PV_TYP);
  assert.ok(doc, 'kein PV-Dokument angelegt');
  assert.equal(doc.id, m[0], 'die markierte id muss die Kennung des PV-Dokuments sein');
  assert.equal(doc.gueltigAb, null, 'kein erfundenes Datum');
  assert.ok(doc.ereignisAnlaesse.some(a => a.typ === 'familienstand'));
});

test('[Posten1] ereignisMarkieren(tod): erreicht die Patientenverfügung über die Schweigepflicht-Entbindung', async () => {
  const { V, schweigepflichtId } = await depotMitPvPersonen();
  const m = V.ereignisMarkieren('tod', schweigepflichtId, new Date());
  assert.equal(m.length, 1);
  assert.ok(V.dokumentFuerTyp(PV_TYP).ereignisAnlaesse.some(a => a.typ === 'tod'));
});

test('[Posten1] ereignisMarkieren: unbeteiligte Person markiert die Patientenverfügung NICHT', async () => {
  const { V } = await depotMitPvPersonen();
  const fremdeId = V.personHinzufuegen({ name: 'Fremde Person' });
  const m = V.ereignisMarkieren('familienstand', fremdeId, new Date());
  assert.equal(m.length, 0);
  assert.equal(V.dokumentFuerTyp(PV_TYP), null, 'kein Dokument darf ohne Treffer entstehen');
});

test('[Posten1] ereignisMarkieren: idempotent — zweimal derselbe Anlass, ein Dokument, ein Eintrag', async () => {
  const { V, beistandId } = await depotMitPvPersonen();
  V.ereignisMarkieren('familienstand', beistandId, new Date());
  V.ereignisMarkieren('familienstand', beistandId, new Date());
  assert.equal(V.getData().dokumente.filter(d => d.typ === PV_TYP).length, 1,
    'ROT ERWARTET, wenn falsch: kein zweites PV-Dokument, dokumentFuerTyp dedupliziert');
  const doc = V.dokumentFuerTyp(PV_TYP);
  assert.equal(doc.ereignisAnlaesse.filter(a => a.typ === 'familienstand').length, 1);
});

test('[Posten1] ereignisMarkieren: existiert bereits ein PV-Dokument (z. B. aus pvwiz), wird DASSELBE markiert — keine zweite Kennung', async () => {
  const { V, beistandId } = await depotMitPvPersonen();
  const bestehend = V.dokumentAnlegen({ typ: PV_TYP, sektorId: 'advanceCare', name: 'Meine Patientenverfügung' }, new Date());
  const m = V.ereignisMarkieren('familienstand', beistandId, new Date());
  assert.deepEqual(m, [bestehend.id],
    'ROT ERWARTET, wenn falsch: die bestehende Kennung muss wiederverwendet werden, nicht verdoppelt');
  assert.equal(V.getData().dokumente.filter(d => d.typ === PV_TYP).length, 1);
});

test('[Posten1] dokumentEreignisSchliessen wirkt auf das PV-Dokument wie auf jedes andere', async () => {
  const { V, beistandId } = await depotMitPvPersonen();
  V.ereignisMarkieren('familienstand', beistandId, new Date());
  const doc = V.dokumentFuerTyp(PV_TYP);
  V.dokumentEreignisSchliessen(doc.id, 'familienstand');
  assert.equal(V.dokumentLesen(doc.id).ereignisAnlaesse.length, 0);
});

test('[Posten1] Wächter (ereignisAchseWaechterFunde): keine neue Lücke — pv_beistand/schweigepflicht sind jetzt erklärt', async () => {
  const { V } = ladeKern();
  const funde = V.ereignisAchseWaechterFunde();
  const treffer = funde.filter(f => f.feldId === 'supportFromThesePersons' || f.feldId === 'confidentialityWaiverFor');
  assert.deepEqual(treffer, [], 'ROT ERWARTET, wenn falsch: der Wächter darf die beiden PV-Felder nicht mehr als ungeklärt melden');
});
