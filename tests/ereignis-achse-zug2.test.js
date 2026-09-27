'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Ereignis-Achse" (13.08.2026), Zug 2 — Prüftermine-Sicht.
   ────────────────────────────────────────────────────────────────────────
   Kein neuer Ort: ein betroffener Eintrag erscheint in der bestehenden
   Prüftermine-Sicht mit dem Ereignis als Begründung („zu prüfen, weil"),
   nicht mit einer erfundenen Fälligkeit. Der Bürger wird den Anlass los,
   OHNE den Eintrag zu bearbeiten — „Bleibt, wie es ist" nimmt nur den
   Anlass, rührt aktualisiertAm/Datum nicht an.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'ereignis-zug2-pw';

async function depotMitMarkierterVollmacht() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const partnerId = V.personHinzufuegen({ name: 'Jonas Partner' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: partnerId }] });
  V.ereignisMarkieren('familienstand', partnerId, new Date());
  return { V, partnerId };
}

test('[Zug2] prueftermineDokumenteOhneTermin: undatierter Eintrag trägt ereignisAnlaesse mit Text', async () => {
  const { V } = await depotMitMarkierterVollmacht();
  const ohne = V.prueftermineDokumenteOhneTermin();
  assert.equal(ohne.length, 1);
  assert.equal(ohne[0].ereignisAnlaesse.length, 1);
  assert.equal(ohne[0].ereignisAnlaesse[0].typ, 'familienstand');
  /* A435 (21.08.2026): die Fixture ist eine VORSORGEVOLLMACHT — dort steht seit heute der dritte
     Satz dahinter. Dass er an einem Testament NICHT steht, belegt `tests/a435-wortlaut-vollmacht.test.js`. */
  assert.equal(ohne[0].ereignisAnlaesse[0].text,
    V.STRINGS.ereignisAnlassFamilienstand + ' ' + V.STRINGS.ereignisAnlassFamilienstandVollmacht);
});

test('[Zug2] prueftermineSektionHTML: „ohne Termin"-Zeile zeigt „Zu prüfen, weil" statt der neutralen Leerzeile', async () => {
  const { V } = await depotMitMarkierterVollmacht();
  const html = V.prueftermineSektionHTML();
  assert.match(html, /Zu prüfen, weil:/, 'ROT ERWARTET, wenn falsch: der Anlass-Text fehlt in der Sicht');
  assert.match(html, new RegExp(V.STRINGS.ereignisAnlassFamilienstand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(html, new RegExp(V.STRINGS.prueftermineOhneZeile),
    'die neutrale „kein Prüftermin"-Aussage soll dem konkreteren Grund weichen');
  assert.match(html, /data-prtm-ereignis-schliessen="/, '„Bleibt, wie es ist"-Knopf muss gerendert sein');
});

test('[Zug2] prueftermineSektionHTML: datierter Eintrag mit Ampel UND Ereignis zeigt beides', async () => {
  const { V, partnerId } = await depotMitMarkierterVollmacht();
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const [doc] = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeile.id);
  V.dokumentSetzen(doc.id, 'gueltigAb', '2024-01-01');
  const html = V.prueftermineSektionHTML();
  assert.match(html, /Zu prüfen, weil:/, 'Ereignis-Grund bleibt sichtbar, auch wenn jetzt datiert');
  assert.match(html, /data-prtm-ereignis-schliessen="/);
  assert.match(html, /data-prtm-geprueft="/, 'die normale Ampel-Aktion bleibt zusätzlich bestehen');
});

test('[Zug2] verdrahtePrueftermine: Klick auf „Bleibt, wie es ist" schließt NUR den Anlass, kein aktualisiertAm-Wechsel', async () => {
  const { V, partnerId } = await depotMitMarkierterVollmacht();
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const [doc] = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeile.id);
  const aktualisiertVorher = doc.aktualisiertAm;
  const knopf = { getAttribute: () => doc.id, onclick: null };
  const host = { querySelectorAll: (sel) => (sel === '[data-prtm-ereignis-schliessen]' ? [knopf] : []) };
  V.verdrahtePrueftermine(host);
  assert.ok(typeof knopf.onclick === 'function', 'Knopf ist verdrahtet');
  knopf.onclick();
  const nachher = V.dokumentLesen(doc.id);
  assert.equal(nachher.ereignisAnlaesse.length, 0, 'ROT ERWARTET, wenn falsch: der Anlass muss weg sein');
  assert.equal(nachher.aktualisiertAm, aktualisiertVorher, 'aktualisiertAm bleibt unberührt — kein Bearbeiten nötig');
});

test('[Zug2] ohne aktiven Anlass: kein „Bleibt, wie es ist"-Knopf, keine „Zu prüfen, weil"-Zeile', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' });
  const html = V.prueftermineSektionHTML();
  assert.doesNotMatch(html, /data-prtm-ereignis-schliessen="/);
  assert.doesNotMatch(html, /Zu prüfen, weil:/);
});
