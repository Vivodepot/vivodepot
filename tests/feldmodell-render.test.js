'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Feld-Modell Stufe 2/3 / Block 3: Render der eingewanderten Template-Felder
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-037 Stufe 3: data.feldDefinitionen[] rendert als eigene, inhaltlich
   benannte, sichtbare Abschnitte am Bereich-Ende (Kern-Look über feldZeileHTML).
   Geprüft:
   - Übersetzer-Härtung: Slug-Kollision (zwei feldnames → eine tpl_-feldId) →
     zweite als 'id-kollision' verworfen (Template-Fehler, namentlich), erste gewinnt.
   - Adapter: Feld-Modell-Def → feldZeileHTML-Form (id=feldId, mehrzeilig→textarea,
     codeListe=codeSystemId, optionen durch).
   - Gruppierung nach abschnitt; unbekannter Typ wird NICHT gerendert, bleibt aber
     in data.feldDefinitionen[] (Daten-Verbleib).
   - Render-HTML trägt den Abschnittsnamen, den Kern-Look (feld-zeile, data-feld)
     und den Wert aus dem geteilten Slot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Korrekt-Pferd-Batterie-Heftklammer-9';

// ── Übersetzer-Härtung: Slug-Kollision ──────────────────────────────────────
test('B3 id-kollision: zwei feldnames → eine tpl_-feldId; zweite namentlich verworfen, erste gewinnt', () => {
  const { V } = ladeKern();
  const u = V._templateFelderUebersetzen({ felder: [
    { feldname: 'Zähler-Punkt', feldtyp: 'text', bereich: 'housing' },
    { feldname: 'Zähler Punkt', feldtyp: 'zahl', bereich: 'housing' },
  ] }, 23);
  assert.equal(u.feldDefinitionen.length, 1, 'nur die erste Definition übernommen');
  assert.equal(u.feldDefinitionen[0].typ, 'text', 'erste gewinnt (text, nicht zahl)');
  assert.equal(u.verworfeneFelder.length, 1, 'zweite verworfen');
  assert.equal(u.verworfeneFelder[0].grund, 'id-kollision', 'Grund = id-kollision (Template-Fehler)');
  assert.equal(u.verworfeneFelder[0].name, 'Zähler Punkt', 'namentlich genannt');
});

// ── Adapter ─────────────────────────────────────────────────────────────────
test('B3 Adapter: Def → feldZeileHTML-Form (id=feldId, mehrzeilig→textarea, codeListe=codeSystemId)', () => {
  const { V } = ladeKern();
  const f = V._templateDefAlsFeld({ sektorId: 'housing', feldId: 'tpl_notiz', typ: 'text', label: 'Notiz', mehrzeilig: true, pflicht: true });
  assert.equal(f.id, 'tpl_notiz', 'feldId → id (feldZeileHTML liest feld.id)');
  assert.equal(f.typ, 'textarea', 'mehrzeilig → textarea (Renderer-Konvention)');
  assert.equal(f.pflicht, true);
  const c = V._templateDefAlsFeld({ sektorId: 'health', feldId: 'tpl_diagnose', typ: 'text', label: 'Diagnose', codeSystemId: 'icd10' });
  assert.equal(c.codeListe, 'icd10', 'codeSystemId → codeListe (datalist-Andock)');
  assert.equal(c.typ, 'text', 'ohne mehrzeilig bleibt text');
});

// ── Gruppierung + Unbekannt-Typ-Skip + Daten-Verbleib ───────────────────────
test('B3 Abschnitte: Gruppierung nach abschnitt; unbekannter Typ nicht gerendert, bleibt im Depot', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Test');
  const d = V.getData();
  d.feldDefinitionen.push(
    { sektorId: 'housing', feldId: 'tpl_zaehlpunkt', abschnitt: 'Energie & Erzeugung', typ: 'text', label: 'Zählpunkt', schemaVersion: 23 },
    { sektorId: 'housing', feldId: 'tpl_einspeisung', abschnitt: 'Energie & Erzeugung', typ: 'zahl', label: 'Einspeisung', schemaVersion: 23 },
    /* Kette, Auftrag 5, Zug 1 (20.08.2026): `ref` IST seither ein renderbarer Typ — die vier
       fehlenden Feldarten sind gebaut. Der Fall „unbekannter Typ" braucht darum einen Typ, den
       es WIRKLICH nicht gibt; sonst prüfte diese Zeile ab heute nichts mehr. */
    { sektorId: 'housing', feldId: 'tpl_tags', abschnitt: 'Energie & Erzeugung', typ: 'gibtsnicht', label: 'Schlagworte', schemaVersion: 23 },
    { sektorId: 'health', feldId: 'tpl_fremd', abschnitt: 'Anderswo', typ: 'text', label: 'Fremd', schemaVersion: 23 },
  );
  const gruppen = V._templateAbschnitte('housing');
  assert.equal(gruppen.length, 1, 'eine Abschnitts-Gruppe für wohnen');
  assert.equal(gruppen[0].label, 'Energie & Erzeugung');
  assert.equal(gruppen[0].felder.length, 2, 'nur die zwei renderbaren Typen (text, zahl)');
  assert.ok(!gruppen[0].felder.some(f => f.feldId === 'tpl_tags'), 'ein wirklich unbekannter Typ wird uebersprungen');
  // Daten-Verbleib: die unbekannte Definition liegt weiterhin im Depot.
  assert.ok(d.feldDefinitionen.some(x => x.feldId === 'tpl_tags'), 'unbekannte Definition bleibt in data.feldDefinitionen[]');
  // Sektor-Trennung: gesundheit-Def taucht bei wohnen nicht auf.
  assert.ok(!gruppen[0].felder.some(f => f.feldId === 'tpl_fremd'), 'fremder Sektor nicht eingemischt');
});

// ── Render-HTML: Kern-Look ──────────────────────────────────────────────────
test('B3 Render: Abschnitt im Kern-Look — Abschnittsname, feld-zeile/data-feld, Wert aus geteiltem Slot', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Test');
  const d = V.getData();
  d.feldDefinitionen.push({ sektorId: 'housing', feldId: 'tpl_zaehlpunkt', abschnitt: 'Energie & Erzeugung', typ: 'text', label: 'Zählpunkt', schemaVersion: 23 });
  // Wert im GETEILTEN Slot data.sektoren[sektorId][feldId] — derselbe Pfad wie Kern-Felder.
  V.sektorFeldSetzen('housing', 'tpl_zaehlpunkt', 'DE0001234', { eingabeArt: 'eingabe' });

  const gruppen = V._templateAbschnitte('housing');
  const htmlEdit = V.templateAbschnitteHTML(gruppen, 'housing', true);
  assert.ok(htmlEdit.includes('Energie &amp; Erzeugung') || htmlEdit.includes('Energie & Erzeugung'), 'Abschnittsname als Überschrift');
  assert.ok(htmlEdit.includes('class="sektion'), 'rendert als Sektion (Kern-Look)');
  assert.ok(htmlEdit.includes('id="sek-tpl-'), 'Anker-id für das Inhaltsverzeichnis');
  assert.ok(htmlEdit.includes('feld-zeile'), 'Kern-Feldzeile (identisches Markup)');
  assert.ok(htmlEdit.includes('data-feld="tpl_zaehlpunkt"'), 'Feld adressiert den geteilten Slot');
  assert.ok(htmlEdit.includes('Zählpunkt'), 'Feld-Label');

  // Lese-Sicht (darf=false) zeigt den Wert.
  const htmlLese = V.templateAbschnitteHTML(gruppen, 'housing', false);
  assert.ok(htmlLese.includes('DE0001234'), 'gespeicherter Wert in der Lese-Sicht sichtbar');
});

test('B3 Render: leere/keine Definitionen → kein Abschnitt (leerer String)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Test');
  assert.equal(V.templateAbschnitteHTML(V._templateAbschnitte('housing'), 'housing', true), '', 'ohne Definitionen kein Markup');
});
