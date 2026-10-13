'use strict';
/* Befund DATEI-BEREICH-AUSGEBLENDET (HOCH), Teil B — ein Bereich aus `bereichsModule[]` der Datei, samt Angaben.

   Jede Datei öffnet in jedem Produkt (U2-ADR-160, U2-ADR-398): was eine Datei an Bereichen und Angaben trägt, wird gezeigt.
   Sichtbarkeit und Rechte sind zwei Dinge; die Selbst-Einlass-Sperre bewacht Vorrechte, nicht das Lesen. Für die Mitschrift hält
   das tests/mitschrift-bereich-nach-inhalt.test.js (Abschnitt 5). Für ein Bereichsmodul im Fach `bereichsModule` gilt es im Kern
   noch nicht: ein nicht ab Werk geliefertes, nicht kettengeprüftes Modul wird als Ganzes nicht angemeldet, und der Bereich fehlt
   mit seinen Angaben. Die Lese-App zeigt denselben Bereich. Die erste Probe ist der offene Rot-Beweis; die zweite hält die
   Lese-App; die letzte meldet, sobald die Lücke geschlossen ist. Teil C steht weiter unten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'probe-passwort-datei-bereich-2026-10-11';
const kopie = (x) => JSON.parse(JSON.stringify(x));
const MODUL = Object.freeze({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'urn:partner-probe:v1', sprache: 'de',
  bereiche: { 'partner-werkstatt': { id: 'partner-werkstatt', icon: 'wrench', label: 'Werkstatt & Lager',
    sektionen: [{ id: 'lager', label: 'Lager', felder: [{ id: 'regal', typ: 'text', label: 'Regal' }] }] } } });

/* Der Öffnen-Weg für eine Datei, die das Modul und Angaben dazu schon trägt: prüfen, sperren, anmelden, zeigen. */
async function imKernGezeigt() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.bereichsModule = [kopie(MODUL)];
  d.sektoren['partner-werkstatt'] = { regal: 'Regal 7' };
  await V._depotModuleAbWerkPruefen(d, true);
  V._depotModuleSperreMarkieren(d, true);
  V._bereichsModuleAusDepotAnmelden(d);
  if (!V._sektorIndexHalter()['partner-werkstatt']) return { angemeldet: false, html: '' };
  V.renderSektor('partner-werkstatt');
  return { angemeldet: true, html: String(document.getElementById('content').innerHTML) };
}

test('[Datei-Bereich·Kern·Rot-Beweis] ein Bereich aus bereichsModule der Datei wird im Kern mit seinen Angaben gezeigt',
  { todo: 'Befund DATEI-BEREICH-AUSGEBLENDET (HOCH, Teil B, Ratsche tools/befund-ratsche-eintraege): die Sperre meldet das Modul als Ganzes nicht an; Rückkehr mit dem Wagen „lesen ja, gelten nein“ für bereichsModule' },
  async () => {
    const r = await imKernGezeigt();
    assert.ok(r.angemeldet, 'der Bereich ist angemeldet');
    assert.ok(r.html.includes('Regal 7'), 'die Angabe steht da');
  });

test('[Datei-Bereich·Lese-App] die Lese-App zeigt denselben Bereich mit seinen Angaben', async () => {
  const { V } = ladeLesen({ ohneSaat: true });
  V.setData(await V._depotUebernehmenGeprueft({ sektoren: { 'partner-werkstatt': { regal: 'Regal 7' } }, bereichsModule: [kopie(MODUL)] }));
  assert.ok(V.SEKTOR_BY_ID['partner-werkstatt'], 'angemeldet');
  assert.ok(String(V.sektorHTML('partner-werkstatt')).includes('Regal 7'), 'die Angabe steht da');
});

/* Teil C — die Lese-App und das Stellen-Register. Aus einem Datei-Bereich übernimmt der Prüfer der Lese-App nur Kennung,
   Beschriftung und Abschnitte; ein Register rendert sie dort nie. Die Zeilen des Stellen-Registers liegen im Depot
   (`institutionen`). Die Lese-App löst eine Stelle nur auf, wo ein Feld auf sie verweist; eine Stelle, auf die kein Feld verweist,
   steht in keiner Ansicht. Gemessen wird über jeden angemeldeten Bereich. */
const STELLEN_MODUL = Object.freeze({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'urn:partner-probe:v1', sprache: 'de',
  bereiche: { 'partner-kontakte': { id: 'partner-kontakte', icon: 'users', label: 'Partner-Kontakte', merkmale: ['stellenRegister'],
    rollen: { stellenListe: 'institutionen', stellenSektion: 'stellen' },
    sektionen: [{ id: 'stellen', label: 'Stellen', felder: [{ id: 'notiz', typ: 'text', label: 'Notiz' }] }] } } });
async function stelleInDerLeseApp() {
  const { V } = ladeLesen({ ohneSaat: true });
  V.setData(await V._depotUebernehmenGeprueft({ sektoren: { 'partner-kontakte': { notiz: 'Notiz' } }, bereichsModule: [kopie(STELLEN_MODUL)],
    institutionen: [{ id: 'i-probe', name: 'Stadtwerke Stellenzeile' }] }));
  return Object.keys(V.SEKTOR_BY_ID).filter((id) => String(V.sektorHTML(id)).includes('Stadtwerke Stellenzeile'));
}
test('[Datei-Bereich·Lese-App·Rot-Beweis] eine Stelle des Depots, auf die kein Feld verweist, steht in der Lese-App in einer Ansicht',
  { todo: 'Befund DATEI-BEREICH-AUSGEBLENDET (HOCH, Teil C, Ratsche tools/befund-ratsche-eintraege): die Lese-App rendert das Stellen-Register nirgends; Rückkehr mit dem Wagen zu Teil B' },
  async () => {
    assert.ok((await stelleInDerLeseApp()).length >= 1, 'die Stellen-Zeile steht in mindestens einem Bereich');
  });
test('[Datei-Bereich·Lese-App·Stolperdraht] solange das todo zu Teil C steht, zeigt die Lese-App die Stelle in keinem Bereich', async () => {
  assert.deepEqual(await stelleInDerLeseApp(), [], 'die Lese-App zeigt die Stelle: das todo oben ist überholt');
});

/* Stolperdraht: ein todo-Test, der grün wird, meldet das sonst nirgends. Schließt ein Fix die Lücke, fällt DIESER Test — dann im
   selben Commit das todo oben herausnehmen, diesen Test löschen, die Obergrenze der Aussetzungen wieder senken und den
   Ratschen-Eintrag schließen. */
test('[Datei-Bereich·Kern·Stolperdraht] solange das todo oben steht, ist die Lücke noch offen', async () => {
  assert.equal((await imKernGezeigt()).angemeldet, false, 'der Kern meldet den Bereich an: das todo oben ist überholt');
});
