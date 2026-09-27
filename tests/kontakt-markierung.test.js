'use strict';
/* ════════════════════════════════════════════════════════════════════════
   kontakt-markierung.test.js — „Die Mappe bleibt drin — und der Kontakt bekommt
   eine Markierung" (13.08.2026), Zug 2
   ────────────────────────────────────────────────────────────────────────
   Ein Eintrag in data.menschen[] kann als NICHT mitzugeben markiert werden. Neue, generische
   Feldart `typ:'checkbox'` (feldInputHTML/liesEintragAusWerten/liesEintragAusDOM) — bislang gab
   es keinen einzelnen Boolean-Unterfeld-Typ (nur `data-edit-multi` für Mehrfachauswahl-Sets).
   Entitäts-Ebene, nicht Feld-Ebene — `sensibelFeldSetzen`/`data.sensibelFelder` bleiben
   unangetastet (andere Sache, andere Mechanik).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('MENSCHEN_REGISTER_FELD trägt ein Unterfeld nichtMitgeben (typ:checkbox)', () => {
  const { V } = ladeKern();
  const uf = V.MENSCHEN_REGISTER_FELD.unterFelder.find(f => f.id === 'nichtMitgeben');
  assert.ok(uf, 'Unterfeld nichtMitgeben existiert');
  assert.equal(uf.typ, 'checkbox');
});

test('feldInputHTML(typ:checkbox): rendert <input type="checkbox"> mit data-edit, checked wenn true', () => {
  const { V } = ladeKern();
  const feld = { id: 'nichtMitgeben', typ: 'checkbox', label: 'Privat' };
  const htmlLeer = V.feldInputHTML(feld, undefined);
  assert.match(htmlLeer, /<input type="checkbox" data-edit="nichtMitgeben"[^>]*>/);
  assert.ok(!htmlLeer.includes('checked'), 'ohne Wert nicht angehakt');
  const htmlGesetzt = V.feldInputHTML(feld, true);
  assert.match(htmlGesetzt, /checked/, 'mit Wert true angehakt');
});

test('liesEintragAusWerten(typ:checkbox): true UND false werden explizit zurückgegeben (der DOM-Rundweg braucht false, um eine Rücknahme zu erkennen)', () => {
  const { V } = ladeKern();
  const feld = { unterFelder: [{ id: 'nichtMitgeben', typ: 'checkbox' }] };
  let eintrag = V.liesEintragAusWerten(feld, { nichtMitgeben: true });
  assert.equal(eintrag.nichtMitgeben, true);
  eintrag = V.liesEintragAusWerten(feld, { nichtMitgeben: false });
  assert.equal(eintrag.nichtMitgeben, false, 'false explizit zurückgegeben — personAktualisieren braucht das, um zu löschen statt nichts zu tun');
  eintrag = V.liesEintragAusWerten(feld, {});
  assert.equal(eintrag.nichtMitgeben, false, 'fehlender Wert zählt wie false (kein Checkbox-Input im DOM = nicht angehakt)');
});

test('vcardMenschen(): ein als nichtMitgeben markierter Kontakt fehlt in der Datei, ein unmarkierter geht mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.personHinzufuegen({ name: 'Peter Nachbar', tel: '0891112233' });
  V.personHinzufuegen({ name: 'Anna Schmidt', tel: '0891112234', nichtMitgeben: true });
  const vcf = V.vcardMenschen();
  assert.ok(vcf.includes('Peter Nachbar'), 'unmarkierter Kontakt geht mit');
  assert.ok(!vcf.includes('Anna Schmidt'), 'markierter Kontakt fehlt');
});

test('personHinzufuegen: nichtMitgeben lässt sich beim Anlegen setzen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const id = V.personHinzufuegen({ name: 'Anna Schmidt', nichtMitgeben: true });
  const p = V.getData().menschen.find(m => m.id === id);
  assert.equal(p.nichtMitgeben, true);
});

test('Zug 3: EXPORT_FORMAT_BY_ID["vcard-menschen"].zurueckgehaltenFn liefert die Namen der markierten Kontakte', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.personHinzufuegen({ name: 'Peter Nachbar' });
  V.personHinzufuegen({ name: 'Anna Schmidt', nichtMitgeben: true });
  V.personHinzufuegen({ name: 'Klaus Meier', nichtMitgeben: true });
  const def = V.EXPORT_FORMAT_BY_ID['vcard-menschen'];
  assert.equal(typeof def.zurueckgehaltenFn, 'function');
  const namen = def.zurueckgehaltenFn();
  assert.deepEqual(namen.sort(), ['Anna Schmidt', 'Klaus Meier']);
});

test('Zug 3: ohne markierte Kontakte liefert zurueckgehaltenFn eine leere Liste', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.personHinzufuegen({ name: 'Peter Nachbar' });
  assert.deepEqual(V.EXPORT_FORMAT_BY_ID['vcard-menschen'].zurueckgehaltenFn(), []);
});

test('Zug 3: ics-vorsorge bleibt unverändert — kein zurueckgehaltenFn (Termine haben keine markierbare Entität)', () => {
  const { V } = ladeKern();
  assert.equal(V.EXPORT_FORMAT_BY_ID['ics-vorsorge'].zurueckgehaltenFn, undefined);
});

test('[Rot-Beweis] Migration/depotNormalisieren markiert KEINEN Bestandseintrag — Abwesenheit bleibt Abwesenheit', () => {
  const { V } = ladeKern();
  // Alt-Depot-Form: menschen[] ohne jede nichtMitgeben-Eigenschaft, wie vor diesem Auftrag.
  const alt = { menschen: [{ id: 'p1', name: 'Anna Schmidt' }, { id: 'p2', name: 'Peter Nachbar' }] };
  const normalisiert = V.depotNormalisieren(alt);
  for (const p of normalisiert.menschen) {
    assert.ok(!('nichtMitgeben' in p), p.name + ': depotNormalisieren erfindet keine Markierung');
  }
});

test('personAktualisieren: nichtMitgeben lässt sich setzen und wieder zurücknehmen (Append-only-Semantik wie institution)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const id = V.personHinzufuegen({ name: 'Anna Schmidt' });
  V.personAktualisieren(id, { nichtMitgeben: true });
  assert.equal(V.getData().menschen.find(m => m.id === id).nichtMitgeben, true);
  V.personAktualisieren(id, { nichtMitgeben: false });
  const p = V.getData().menschen.find(m => m.id === id);
  assert.ok(!('nichtMitgeben' in p), 'Zurücknehmen entfernt die Markierung wieder (kein "false" stehen lassen)');
});
