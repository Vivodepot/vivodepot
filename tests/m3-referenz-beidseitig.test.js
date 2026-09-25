'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — M3 (Auftrag M3/M4, 09.08.2026): das Versprechen einlösen —
   „einmal erfasst, überall im Vivodepot referenzierbar", beidseitig.
   ────────────────────────────────────────────────────────────────────────
   Umfang (Zug-0-Messung, s. Bericht): fast alle im Auftrag genannten
   Freitext-Fundstellen sind bereits `typ:'ref'` (M5/M6/C10-Vorarbeit hat
   das schon geleistet) — die verbleibende, tatsächlich buildbare Arbeit
   ist die BEIDSEITIGKEIT: personReferenzStellen() existierte bereits, aber
   NUR am Lösch-Dialog, erfasste KEINE refMehrfach-Felder, und war nicht
   anklickbar. Diese Probe deckt die drei Erweiterungen:
     1. refMehrfach-Felder werden jetzt mitgezählt.
     2. Die Liste ist jetzt auch beim BEARBEITEN sichtbar (nicht nur beim
        Löschen) — „wer die Person öffnet, sieht, worin sie vorkommt".
     3. Jede Fundstelle ist anklickbar (M4-Adressierbarkeit).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'm3-test-2026!';
async function frischesDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Testerin');
  return k;
}

test('[M3·1] personReferenzStellen: findet weiterhin einfache ref-Felder (Regressionsschutz)', async () => {
  const { V } = await frischesDepot();
  const arztId = V.personHinzufuegen({ name: 'Dr. Müller' });
  V.sektorFeldSetzen('health', 'generalPractitioner', { ref: arztId, override: '' });
  const stellen = V.personReferenzStellen(arztId);
  assert.equal(stellen.length, 1);
  assert.equal(stellen[0].sektor, 'health');
  assert.equal(stellen[0].sektorLabel, V.SEKTOR_BY_ID.health.label);
});

test('[M3·2] personReferenzStellen: findet jetzt auch refMehrfach-Felder — TOP-LEVEL (hauptpflegeperson-artig)', async () => {
  const { V } = await frischesDepot();
  const id = V.personHinzufuegen({ name: 'Notfallkontakt' });
  V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: id, override: '' }]);
  const stellen = V.personReferenzStellen(id);
  assert.equal(stellen.length, 1, 'refMehrfach-Fund wird jetzt erfasst');
  assert.equal(stellen[0].sektor, 'health');
});

test('[M3·2b] personReferenzStellen: findet jetzt auch refMehrfach-Unterfelder in Listen (bevollmaechtigter, das BMJ-Kernfeld einer Vorsorgevollmacht) — ohne den Fix bleibt dies rot (0 statt 1)', async () => {
  const { V } = await frischesDepot();
  const bevId = V.personHinzufuegen({ name: 'Peter Bevollmächtigter' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney',
    authorizedPersons: [{ ref: bevId, override: '' }],
  });
  const stellen = V.personReferenzStellen(bevId);
  assert.equal(stellen.length, 1, 'refMehrfach-in-Liste-Fund wird jetzt erfasst');
  assert.equal(stellen[0].sektor, 'advanceCare');
  assert.match(stellen[0].feld, /Bevollmächtigte Person/);
});

test('[M3·3] personReferenzStellen: eine unbeteiligte Person hat weiterhin null Fundstellen (Gegenprobe)', async () => {
  const { V } = await frischesDepot();
  V.personHinzufuegen({ name: 'Nirgends Referenziert' });
  const anders = V.personHinzufuegen({ name: 'Auch nirgends' });
  assert.deepEqual(V.personReferenzStellen(anders), []);
});

test('[M3·4] _referenzStellenListeHTML: jede Fundstelle ist ein anklickbarer Knopf mit dem Sektor als Sprungziel', () => {
  const { V } = ladeKern();
  const html = V._referenzStellenListeHTML([{ sektor: 'health', sektorLabel: 'Gesundheit', feld: 'Hausarzt' }]);
  assert.match(html, /data-referenz-sektor="health"/);
  assert.match(html, /Gesundheit — Hausarzt/);
  assert.match(html, /<button/);
});

test('[M3·5] _referenzStellenListeHTML: leere Liste liefert leeren String (kein leerer <ul>)', () => {
  const { V } = ladeKern();
  assert.equal(V._referenzStellenListeHTML([]), '');
});

test('[M3·6] flowPersonRegisterBearbeiten: eine referenzierte Person zeigt die Fundstellen-Liste im Bearbeiten-Modal — nicht mehr nur beim Löschen', async () => {
  const { V, document } = await frischesDepot();
  const arztId = V.personHinzufuegen({ name: 'Dr. Müller' });
  V.sektorFeldSetzen('health', 'generalPractitioner', { ref: arztId, override: '' });
  V.flowPersonRegisterBearbeiten(arztId);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /Wird verwendet in/);
  assert.match(html, /data-referenz-sektor="health"/);
});

test('[M3·7] flowPersonRegisterBearbeiten: eine unreferenzierte Person zeigt KEINE Fundstellen-Liste (Gegenprobe)', async () => {
  const { V, document } = await frischesDepot();
  const id = V.personHinzufuegen({ name: 'Unbeteiligt' });
  V.flowPersonRegisterBearbeiten(id);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(!html.includes('Wird verwendet in'));
});

test('[M3·8] _referenzStellenVerdrahten: ein Klick schließt das Modal (echte schliessen()-Funktion) und navigiert wirklich zum Sektor — mit einem selbst gebauten Container (der Node-Harness-DOM-Stub liefert für querySelectorAll immer [], wie an vielen Stellen dieser Suite dokumentiert; der ECHTE Klickweg im Browser ist Gegenstand der E2E-Abnahme, s. Bericht)', async () => {
  const { V } = await frischesDepot();
  const arztId = V.personHinzufuegen({ name: 'Dr. Müller' });
  V.sektorFeldSetzen('health', 'generalPractitioner', { ref: arztId, override: '' });
  let geschlossen = false;
  const fakeBtn = { getAttribute: () => 'health', onclick: null };
  const fakeContainer = { querySelectorAll: (sel) => (sel === '[data-referenz-sektor]' ? [fakeBtn] : []) };
  V._referenzStellenVerdrahten(fakeContainer, () => { geschlossen = true; });
  assert.ok(fakeBtn.onclick, 'onclick wurde gesetzt');
  fakeBtn.onclick();
  assert.ok(geschlossen, 'schliessen() wurde vor der Navigation aufgerufen');
  const vs = V.getViewState();
  assert.equal(vs.aktiverSektorId, 'health', 'Klick hat tatsächlich zum Sektor navigiert');
  assert.equal(vs.aktiveAnsicht, 'sektor');
});

test('[M3·9] flowPersonRegisterEntfernen: der Lösch-Hinweis bleibt bestehen UND ist jetzt ebenfalls anklickbar (Regressionsschutz + Erweiterung)', async () => {
  const { V, document } = await frischesDepot();
  const arztId = V.personHinzufuegen({ name: 'Dr. Müller' });
  V.sektorFeldSetzen('health', 'generalPractitioner', { ref: arztId, override: '' });
  V.flowPersonRegisterEntfernen(arztId);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /wird noch verwendet/);
  assert.match(html, /data-referenz-sektor="health"/);
});
