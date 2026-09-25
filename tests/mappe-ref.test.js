'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Dokumenten-Mappe Schritt 4 (U2-ADR-013): Sektor-Anbindung ref:mappe
   ────────────────────────────────────────────────────────────────────────
   Ein Sektor-Feld typ:'ref', entitaet:'mappe' rendert lesend als Thumbnail +
   Beschriftung und im Edit-Modus als Dokument-Picker (vorhandene Einträge +
   „hochladen", KEIN Freitext-Override). Dereferenzierung beim Löschen greift
   auch auf Sektor-Felder (in Schritt 1 verankert).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const REF_FELD = { id: 'beleg', label: 'Beleg', typ: 'ref', entitaet: 'mappe' };

test('mappeVorschlag: listet die Mappen-Einträge als {id, name}', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Vertrag', dateiname: 'v.pdf' });
  const v = V.mappeVorschlag();
  assert.equal(v.length, 1);
  assert.equal(v[0].id, id);
  assert.equal(v[0].name, 'Vertrag');
});

test('feldWertHTML ref:mappe — Thumbnail bei Bild, Datei-Symbol sonst, Beschriftung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const bildId = V.mappeEintragHinzufuegen({ beschriftung: 'Ausweis', mime: 'image/jpeg', inhalt: 'data:image/jpeg;base64,AAA' });
  const htmlBild = V.feldWertHTML(REF_FELD, { ref: bildId });
  assert.ok(htmlBild.includes('mappe-ref-thumb'), 'Bild → Thumbnail');
  assert.ok(htmlBild.includes('Ausweis'), 'Beschriftung');
  const pdfId = V.mappeEintragHinzufuegen({ beschriftung: 'Testament', mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBER' });
  const htmlPdf = V.feldWertHTML(REF_FELD, { ref: pdfId });
  assert.ok(!htmlPdf.includes('mappe-ref-thumb'), 'PDF → kein Thumbnail');
  assert.ok(htmlPdf.includes('Testament'), 'Beschriftung');
});

test('feldWertHTML ref:mappe — gelöschter/leerer Verweis → Leer-Phrase', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.ok(V.feldWertHTML(REF_FELD, { ref: 'gibtsnicht' }).includes(V.STRINGS.leerZustand), 'toter Verweis → leer');
  assert.ok(V.feldWertHTML(REF_FELD, null).includes(V.STRINGS.leerZustand), 'kein Wert → leer');
});

test('feldInputHTML ref:mappe — Dokument-Picker mit Einträgen + Upload, KEIN Override', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Police' });
  const html = V.feldInputHTML(REF_FELD, { ref: id });
  assert.ok(html.includes('data-edit-ref="beleg"') && html.includes('data-entitaet="mappe"'), 'Picker verdrahtet als mappe');
  assert.ok(html.includes('value="' + id + '" selected'), 'aktueller Eintrag vorausgewählt');
  assert.ok(html.includes('Police'), 'Eintrag als Option');
  assert.ok(html.includes('value="__upload__"'), 'Hochladen-Option');
  assert.ok(!html.includes('data-edit-override'), 'kein Freitext-Override bei mappe');
});

test('Dereferenzierung: ein Sektor-ref:mappe-Feld wird beim Löschen des Eintrags leer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Scan' });
  V.sektorFeldSetzen('identity', 'profilePhotoCoverPage', { ref: id });
  // vor dem Löschen: Anzeige zeigt die Beschriftung.
  assert.ok(V.feldWertHTML(REF_FELD, V.getData().sektoren.identity.profilePhotoCoverPage).includes('Scan'));
  V.mappeEntfernen(id);
  assert.equal(V.getData().sektoren.identity.profilePhotoCoverPage, null, 'Sektor-Ref dereferenziert');
});

/* ── Schritt 6: Profilfoto ist ein frisches ref:mappe-Feld in Identität ──── */

test('Identität trägt ein profilfoto-Feld vom Typ ref:mappe (frisch, keine Migration)', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.identity.sektionen.flatMap(s => s.felder || []);
  const pf = felder.find(f => f.id === 'profilePhotoCoverPage');
  assert.ok(pf, 'profilfoto-Feld existiert');
  assert.equal(pf.typ, 'ref');
  assert.equal(pf.entitaet, 'mappe', 'verweist auf die Mappe (dritter Entitätstyp)');
});

test('Profilfoto rendert über den ref:mappe-Pfad: Thumbnail (Bild) bzw. Picker im Edit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const bildId = V.mappeEintragHinzufuegen({ beschriftung: 'Mein Foto', mime: 'image/jpeg', inhalt: 'data:image/jpeg;base64,AAA' });
  V.sektorFeldSetzen('identity', 'profilePhotoCoverPage', { ref: bildId });
  const pf = V.SEKTOR_BY_ID.identity.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'profilePhotoCoverPage');
  // Lese-Sicht → Thumbnail.
  const wert = V.feldWertHTML(pf, V.getData().sektoren.identity.profilePhotoCoverPage);
  assert.ok(wert.includes('mappe-ref-thumb') && wert.includes('Mein Foto'), 'Thumbnail + Beschriftung');
  // Edit-Sicht → Dokument-Picker mit Upload, kein Freitext-Override.
  const input = V.feldInputHTML(pf, V.getData().sektoren.identity.profilePhotoCoverPage);
  assert.ok(input.includes('data-entitaet="mappe"') && input.includes('value="__upload__"'), 'Picker mit Upload');
  assert.ok(!input.includes('data-edit-override'), 'kein Override');
});

/* ── Benennung + Bereichs-Anzeige (Auftrag 30.05.) ────────────────────────── */

test('Bruch A: das Beschriftungs-Label fragt freundlich nach einem Namen', () => {
  const { V } = ladeKern();
  assert.match(V.STRINGS.mappeBeschriftung, /nennen/i, 'Label ist die Nenn-Frage, nicht nur „Beschriftung"');
});

test('Bruch B: Dokumente mit bereich === sektorId erscheinen als eigener Block im Sektor', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const mobId = V.mappeEintragHinzufuegen({ beschriftung: 'Fahrzeugschein', bereich: 'mobility', dateiname: 'fz.pdf' });
  // ADR-175 Task 1 (27.08.2026): Beschriftung des Fremd-Bereich-Dokuments war zuvor „Ausweis" —
  // seit der neuen mobilitaet-Statuskarte „Reise- & Ausweisdokumente" ist das ein Teilstring-
  // Treffer im eigenen Block-Titel und hätte die Probe scheinbar bestehen lassen, obwohl sie nichts
  // mehr über das Fremd-Dokument aussagt. Umbenannt auf einen Namen ohne Kollision, und die
  // Fremd-Dokument-id statt eines rohen Beschriftungs-Substrings geprüft.
  const fremdId = V.mappeEintragHinzufuegen({ beschriftung: 'Perso-Scan', bereich: 'identity' });   // fremder Bereich
  V.renderSektor('mobility');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.mappeBereichBlockTitel), 'Block-Titel „Dokumente in diesem Bereich"');
  assert.ok(html.includes('Fahrzeugschein'), 'das zugeordnete Dokument erscheint');
  assert.ok(html.includes('data-mappe-id="' + mobId + '"'), 'klickbarer Eintrag (data-mappe-id) für die Vorschau');
  assert.ok(!html.includes('Perso-Scan'), 'ein Dokument aus einem anderen Bereich erscheint hier nicht');
  assert.ok(!html.includes('data-mappe-id="' + fremdId + '"'), 'kein klickbarer Eintrag für das Fremd-Dokument');
});

test('Bruch B: ohne zugeordnete Dokumente kein leerer Bereichs-Block', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor('mobility');
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes(V.STRINGS.mappeBereichBlockTitel), 'kein Block, wenn der Bereich keine Dokumente hat');
});
