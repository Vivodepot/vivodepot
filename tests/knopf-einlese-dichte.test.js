'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Knopf-Flut + Einlese-Dichte — Struktur-Aufräumen aus der Inventur 05.07.
   (U2-ADR-055). Reine Render-/Wege-Änderung; kein Krypto, kein Datenmodell.
   ────────────────────────────────────────────────────────────────────────
   A — Einzel-Export-Knöpfe entfallen; die maschinenlesbaren Formate + Word
       leben redundanzfrei im Herausgeben-Chooser (flowHerausgeben).
   B — Ab ZWEI geführten Einstiegen bündelt eine Aufklapp-Zeile die Startknöpfe.
   C — Die bereichslokale Einlese-Tür erscheint nur bei EIGENEM (kategorie:'sektor')
       Format; depot-weite Formate bleiben über die zentrale Tür erreichbar.
   Abgegrenzt: die zentrale Seitenleisten-Tür (gesundheit-Durchstich) bleibt
   unverändert — bewusst NICHT Teil dieses kosmetischen Durchgangs.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  return k;
}
const inhalt = (document) => document.getElementById('content').innerHTML;

/* ── A — Export-Knöpfe redundanzfrei in den Chooser ─────────────────────── */
test('A1) renderSektor trägt KEINE freistehenden Export-/docx-Knöpfe mehr', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');   // Daten → Herausgeben-Weg aktiv
  V.oeffneSektor('identity');
  const html = inhalt(document);
  assert.ok(!html.includes('data-export-format='), 'kein loser maschinenlesbar-Knopf');
  assert.ok(!html.includes('data-export-docx='), 'kein loser Word-Knopf');
  assert.ok(html.includes('data-herausgeben="identity"'), 'die eine Herausgeben-Tür bleibt');
});

test('A2) der Herausgeben-Chooser trägt jedes s.exporte-Format (data-h-format)', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.flowHerausgeben('identity');
  const modal = document.getElementById('modal-inhalt').innerHTML;
  for (const ex of (V.SEKTOR_BY_ID.identity.exporte || [])) {
    assert.ok(modal.includes('data-h-format="' + ex.format + '"'), 'Chooser trägt ' + ex.format);
  }
  // Der Chooser bleibt die Heimat von PDF. Der QR-Weg ist entfernt (CC-08, 14.07. —
  // Klartext-„VDQR|…"-Leck an die Systemkamera, Spiegel zu CC-01).
  assert.ok(modal.includes('data-h-pdf'), 'PDF-Weg im Chooser');
  assert.ok(!modal.includes('data-h-qr'), 'kein QR-Weg mehr im Chooser');
});

test('A3) die Klick-Route der Chooser-Formate ist verdrahtet (kein Wurf)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('administration', 'mainEmailAddress', 'a@b.example.de');
  assert.doesNotThrow(() => V.flowHerausgeben('administration'));
});

/* ── B — Wizards als Aufklapp-Zeile ─────────────────────────────────────── */
test('B1) Vorsorge (Teil 1): Instrument-Wizard pvwiz direkt, Anlass-Wizards unter „Übergänge"', async () => {
  const { V, document } = await frischMitDepot();
  V.oeffneSektor('advanceCare');
  const html = inhalt(document);
  // Instrument-Wizard pvwiz: direkter Startknopf, OHNE Sammel-Überschrift.
  assert.ok(html.includes('data-wizard-start="pvwiz"'), 'pvwiz-Startknopf vorhanden');
  // Anlass-Wizards unter der sichtbaren Kategorie „Übergänge". Summary trägt Icon (SVG) + Text.
  assert.ok(html.includes('<details class="wizard-gruppe">'), 'Übergänge-Aufklapp-Zeile vorhanden');
  assert.match(html, /<summary>[\s\S]*?Übergänge[\s\S]*?<\/summary>/, 'Summary-Text „Übergänge"');
  assert.ok(html.includes('data-wizard-start="pflwiz"') && html.includes('data-wizard-start="heirwiz"'),
    'pflwiz und heirwiz als Anlass-Wizards vorhanden');
  // pvwiz steht NICHT innerhalb der Übergänge-Gruppe (Instrument ohne Sammel-Überschrift).
  // (Hinweis: „Geführt ausfüllen" bleibt der BUTTON-Text jeder Startkachel — wizStartErstellen —
  // und ist kein Kategorie-Titel mehr; die einzige Kategorie-Summary im Vorsorge-Bereich ist
  // „Übergänge", oben geprüft.)
  const abUebergaenge = html.slice(html.indexOf('<details class="wizard-gruppe">'));
  assert.ok(!abUebergaenge.includes('data-wizard-start="pvwiz"'), 'pvwiz NICHT in der Übergänge-Gruppe');
});

test('B2) Bereich mit EINEM Wizard (sozialversicherung) bleibt direkter Knopf — keine Aufklapp-Zeile', async () => {
  const { V, document } = await frischMitDepot();
  // U2-ADR-096: finanzen trug seinen einzigen Einstieg ueber erbwiz' Ziel-Override; mit erbwiz ist
  // er entfallen, finanzen hat heute gar keinen Wizard. Der Ein-Wizard-Fall — um den es hier geht —
  // ist jetzt sozialversicherung (nur pflwiz). Die Regel selbst ist unveraendert.
  V.oeffneSektor('socialInsurance');
  const html = inhalt(document);
  assert.ok(html.includes('data-wizard-start="pflwiz"'), 'pflwiz-Startknopf direkt sichtbar');
  assert.ok(!html.includes('wizard-gruppe'), 'kein Aufklappen für einen einzelnen Wizard');
});

test('B3) Bereich OHNE Wizard (mobilitaet) zeigt weder Startknopf noch Aufklapp-Zeile', async () => {
  const { V, document } = await frischMitDepot();
  V.oeffneSektor('mobility');
  const html = inhalt(document);
  assert.ok(!html.includes('data-wizard-start'), 'kein Startknopf');
  assert.ok(!html.includes('wizard-gruppe'), 'keine Aufklapp-Zeile');
});

/* ── C — Bereich-Einlese-Tür nur bei echtem Sektor-Format ────────────────── */
test('C1) Bereiche MIT eigenem Einlese-Format zeigen die bereichslokale Tür', async () => {
  const { V, document } = await frischMitDepot();
  for (const id of ['health', 'identity', 'finance']) {
    V.oeffneSektor(id);
    assert.ok(inhalt(document).includes('data-einlesen="' + id + '"'), 'Einlese-Tür in ' + id);
  }
});

test('C2) Depot-only-Bereiche zeigen KEINE bereichslokale Einlese-Tür', async () => {
  const { V, document } = await frischMitDepot();
  for (const id of ['mobility', 'housing', 'personal']) {
    V.oeffneSektor(id);
    assert.ok(!inhalt(document).includes('data-einlesen="' + id + '"'), 'keine bereichslokale Tür in ' + id);
  }
});

test('C3) Fähigkeit bleibt: Depot-only-Bereiche tragen depot-weite Formate (zentral erreichbar)', async () => {
  const { V } = await frischMitDepot();
  for (const id of ['mobility', 'housing', 'personal']) {
    const f = V.importFormateFuerSektor(id);
    assert.ok(!f.some(x => x.kategorie === 'sektor'), id + ' hat kein eigenes Sektor-Format');
    assert.ok(f.some(x => x.kategorie === 'depot'), id + ' hat depot-weite Formate (json/beta/provider)');
  }
});

test('C4) Beide zentrale Türen sind bereich-neutral (U2-ADR-056 Einlesen / U2-ADR-057 Herausgeben)', async () => {
  const { V, document } = await frischMitDepot();
  V.oeffneSektor('identity');   // irgendein Bereich → Sidebar wird gerendert
  V.renderSidebar();
  const sb = document.getElementById('sidebar').innerHTML;
  assert.ok(sb.includes('data-einlesen-zentral="1"'), 'Einlese-Tür neutral (kein fester Bereich)');
  assert.ok(sb.includes('data-weitergeben-zentral="1"'), 'Herausgeben-Tür neutral (kein fester Bereich)');
  assert.ok(!sb.includes('-zentral="health"'), 'keine Tür mehr fix auf Gesundheit');
});
