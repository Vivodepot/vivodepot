'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der fehlende Auslöser „Tod" (U2-ADR-158)
   ────────────────────────────────────────────────────────────────────────────
   Entschieden am 21.08.2026: Ein Mensch im Personenregister kann als verstorben
   gekennzeichnet werden; die Kennzeichnung löst das Ereignis „Tod" aus.

   DER SACHGRUND, und er ist der stärkste: Stirbt der Bevollmächtigte, ist die
   Vollmacht gegenstandslos. Das Produkt sagt das an anderer Stelle selbst — und
   meldete sich nicht. Achse, Marken, Verweise und Anzeigetext standen seit dem
   15.08.; was fehlte, war die Hand, die sie auslöst.

   DIE AUFLAGE, und sie ist die wichtigste: Der Tod einer DRITTEN Person ist
   strikt vom Tod der Inhaberin zu trennen. Dafür gibt es die Lebenslage
   Todesfall und die Depot-Übernahme — dieser Weg fasst sie nicht an.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'todesfall-probe-2026';

async function depotMitVollmacht() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const p = V.personHinzufuegen({ name: 'Bevollmächtigter Meier' });
  const personId = p.id || p;
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', authorizedPersons: { ref: personId } });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  return { V, personId, zeilenId: zeile.id };
}
const anlaesse = (V, zeilenId) =>
  V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeilenId).flatMap((d) => d.ereignisAnlaesse || []);

/* ══ DER VERLANGTE ROT-BEWEIS ══════════════════════════════════════════════ */

test('[Tod·Rot-Beweis] OHNE die Kennzeichnung trägt die Vollmachtszeile keinen Anlass', async () => {
  const { V, zeilenId } = await depotMitVollmacht();
  assert.deepEqual(anlaesse(V, zeilenId), [],
    'sonst prüfte die Zusicherung darunter einen Zustand, den es ohnehin gäbe');
});

test('[Tod·Rot-Beweis] MIT der Kennzeichnung trägt sie ihn', async () => {
  const { V, personId, zeilenId } = await depotMitVollmacht();
  V.personAktualisieren(personId, { verstorben: true });
  const a = anlaesse(V, zeilenId);
  assert.equal(a.length, 1);
  assert.equal(a[0].typ, 'tod');
  assert.match(a[0].seit, /^\d{4}-\d{2}-\d{2}$/);
});

test('[Tod] die Kennzeichnung steht an der Person', async () => {
  const { V, personId } = await depotMitVollmacht();
  V.personAktualisieren(personId, { verstorben: true });
  assert.equal(V.getData().menschen.find((m) => m.id === personId).verstorben, true);
});

/* ══ Die Auflage: strikt getrennt vom Tod der Inhaberin ════════════════════ */

test('[Tod·Auflage] die INHABERIN lässt sich hier NICHT als verstorben kennzeichnen', async () => {
  const { V } = await depotMitVollmacht();
  const inhaberId = V._inhaberPersonIdFinden();
  assert.ok(inhaberId, 'die Inhaberin ist auflösbar — sonst prüfte die Probe nichts');
  assert.throws(() => V.personAktualisieren(inhaberId, { verstorben: true }), /Inhaberin|Todesfall/,
    'dafür gibt es die Lebenslage Todesfall und die Depot-Übernahme');
  assert.equal(typeof V.getData().menschen.find((m) => m.id === inhaberId).verstorben, 'undefined');
});

/* ══ Zurücknehmen ══════════════════════════════════════════════════════════ */

test('[Tod] die Kennzeichnung lässt sich zurücknehmen — die Anlässe bleiben stehen', async () => {
  const { V, personId, zeilenId } = await depotMitVollmacht();
  V.personAktualisieren(personId, { verstorben: true });
  V.personAktualisieren(personId, { verstorben: false });
  assert.equal(typeof V.getData().menschen.find((m) => m.id === personId).verstorben, 'undefined');
  assert.equal(anlaesse(V, zeilenId).length, 1,
    'ein Anlass ist die Aufzeichnung eines Ereignisses, keine Anzeige eines Zustands — '
    + 'ihn mitzulöschen legte eine Prüfung still, die die Bürgerin vielleicht schon begonnen hat');
});

test('[Tod] zweimal kennzeichnen legt keinen zweiten Anlass an', async () => {
  const { V, personId, zeilenId } = await depotMitVollmacht();
  V.personAktualisieren(personId, { verstorben: true });
  V.personAktualisieren(personId, { verstorben: true });
  assert.equal(anlaesse(V, zeilenId).length, 1);
});

test('[Tod] eine Person, die in KEINER Vollmacht steht, markiert nichts', async () => {
  const { V, zeilenId } = await depotMitVollmacht();
  const fremd = V.personHinzufuegen({ name: 'Unbeteiligte Person' });
  V.personAktualisieren(fremd.id || fremd, { verstorben: true });
  assert.deepEqual(anlaesse(V, zeilenId), []);
});

/* ══ Zug 0: was die Achse mit einem ANGEDOCKTEN Feld tut ═══════════════════ */

test('[Tod·Zug0] die Achse kennt kein angedocktes Feld — und sie sagt es auch nicht', async () => {
  const { V, personId, zeilenId } = await depotMitVollmacht();
  const d = V.getData();
  d.feldDefinitionen = [{ sektorId: 'advanceCare', feldId: 'tpl_notar_bedachter',
    label: 'Bedachter (Kanzlei-Modul)', typ: 'ref', entitaet: 'person', herkunft: 'Kanzlei Meier' }];
  d.sektoren.advanceCare.tpl_notar_bedachter = { ref: personId };
  V.setData(d);

  assert.equal(V.EREIGNIS_ACHSE_FELDER.some((e) =>
    String(e.feldId).startsWith('tpl_') || String(e.unterFeldId || '').startsWith('tpl_')), false,
  'die Achse ist eine im Kern eingefrorene Liste — ein angedocktes Feld kann nicht hineingelangen');

  V.personAktualisieren(personId, { verstorben: true });
  assert.equal(anlaesse(V, zeilenId).length, 1, 'das eingebaute Feld reagiert');
  assert.deepEqual(V.getData().sektoren.advanceCare.tpl_notar_bedachter, { ref: personId },
    'das angedockte Feld bleibt unberührt — es wird nicht verworfen und nicht gemeldet, sondern '
    + 'STILL übergangen. Das ist der Befund aus Zug 0, und aus ihm folgt kein Bau (Vorlage 1).');
});
