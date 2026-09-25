'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Immer editierbar — eine Sicht statt Lese-/Bearbeiten-Modus (Umbau 06.06.2026)
   ────────────────────────────────────────────────────────────────────────
   Der frühere „Lesemodus" ist abgeschafft: das `bearbeitungAn`-Flag existiert
   nicht mehr, das einzige Schreibrecht-Gate ist Modus.darfBearbeiten(). Diese
   Tests (vormals „bearbeiten-reihenfolge") sind auf das NEUE Verhalten umgestellt:

     1) Felder sind bei Schreibrecht IMMER Eingabefelder (data-edit); es gibt
        KEINE „Bearbeiten"/„Fertig"-Knöpfe (b-bearb/b-fertig) mehr.
     2) Reihenfolge bleibt: Felder (.sektion--eingabe) VOR den optionalen Türen
        (er-panel, doku-panel) — die Türen sind jetzt bei Schreibrecht dauerhaft
        sichtbar (nicht mehr modus-gegated).
     3) Kein Diktier-Hinweis im Sektor; kein b-bearb/b-fertig im DOM.
     4) Schreibschutz (kein darfBearbeiten, z. B. Notfall): feldZeileHTML rendert
        die reine Wert-Anzeige (feldWertHTML), KEIN Eingabefeld.
     5) Lese-only-Elemente (Provenienz, Herausgeben/Einlesen) sind in der einen
        (editierbaren) Sicht sichtbar — nicht mehr nur im früheren Lese-Modus.

   KEINE Krypto. Reine DOM-/Render-Prüfung über den einen Einsetzpunkt c.innerHTML.
   (Das blur/change-Auto-Save + Fokus-Verhalten ist browser-gated — Schicht 2.)
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-immer-editierbar';

/* Einen echten Bereich öffnen (Anker-Modus → darfBearbeiten === true). */
async function sektorSicht(sektorId = 'identity') {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.oeffneSektor(sektorId);
  return { V, document, html: document.getElementById('content').innerHTML };
}

test('1) Felder sind immer Eingabefelder (data-edit); keine Bearbeiten/Fertig-Knöpfe', async () => {
  const { html } = await sektorSicht();
  assert.ok(html.includes('data-edit'), 'Felder rendern direkt als Eingabefelder');
  assert.equal(html.includes('id="b-bearb"'), false, 'kein „Bearbeiten"-Knopf mehr');
  assert.equal(html.includes('id="b-fertig"'), false, 'kein „Fertig"-Knopf mehr');
});

test('2) Reihenfolge: Felder VOR der Dokumente-Tür; Tür bei Schreibrecht dauerhaft sichtbar', async () => {
  const { html } = await sektorSicht();
  const iFelder = html.indexOf('sektion--eingabe');
  const iDoku   = html.indexOf('class="doku-panel"');

  assert.ok(iFelder > -1, 'Felder (.sektion--eingabe) gerendert');
  assert.ok(iDoku   > -1, 'Dokumente-Tür (doku-panel) sichtbar (immer bei Schreibrecht)');
  assert.ok(iFelder < iDoku, 'Felder stehen vor der Dokumente-Tür');
  // Strang 1b: das Bereichs-Erinnerungs-Panel (er-panel) ist entfallen — die Zeit-Datenpunkte
  // leben jetzt auf der Dokument-Ebene. Es darf keine Erinnerung-Tür mehr gerendert werden.
  assert.equal(html.includes('class="er-panel"'), false, 'keine Erinnerung-Tür mehr (er-panel entfernt)');
});

test('3) Kein Diktier-Hinweis im Sektor; kein b-bearb/b-fertig im DOM', async () => {
  const { html } = await sektorSicht();
  assert.equal(html.includes('diktier-hinweis'), false, 'kein Diktier-Hinweis im Bereich');
  assert.equal(html.includes('id="b-bearb"') || html.includes('id="b-fertig"'), false,
    'weder Bearbeiten- noch Fertig-Knopf im DOM');
});

test('4) Schreibschutz (kein darfBearbeiten): feldZeileHTML rendert Wert-Anzeige, kein Eingabefeld', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const feld = { id: 'givenName', label: 'Vorname', typ: 'text' };
  const htmlRO = V.feldZeileHTML(feld, 'Maria', 'identity', false);   // darf = false (Schreibschutz)
  const htmlED = V.feldZeileHTML(feld, 'Maria', 'identity', true);    // darf = true (Schreibrecht)
  assert.equal(htmlRO.includes('data-edit'), false, 'Schreibschutz → kein Eingabefeld (feldWertHTML)');
  assert.ok(htmlRO.includes('Maria'), 'Schreibschutz → reine Wert-Anzeige');
  assert.ok(htmlED.includes('data-edit'), 'Schreibrecht → Eingabefeld');
});

test('5a) Provenienz-Zeile erscheint auch in der editierbaren Sicht (nicht mehr edit-gegated)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // Eine abweichende (eingelesene) Provenienz direkt hinterlegen, damit urheberschaftZeileHTML
  // einen sichtbaren Beleg erzeugt (vom Anker manuell wäre still).
  const data = V.getData();
  data.urheberschaft = data.urheberschaft || {};
  data.urheberschaft.identity = {
    givenName: [{ eingabeArt: 'import', quelle: 'vCard', zeitpunkt: new Date().toISOString() }],
  };
  const feld = { id: 'givenName', label: 'Vorname', typ: 'text' };
  const htmlED = V.feldZeileHTML(feld, 'Maria', 'identity', true);   // editierbare Sicht
  assert.ok(htmlED.includes('data-edit'), 'Feld ist editierbar');
  assert.ok(htmlED.includes(V.STRINGS.urheberEingelesen),
    'Provenienz-Beleg auch in der editierbaren Sicht sichtbar');
});

test('5b) Lese-only-Affordanzen (Herausgeben/Einlesen) sind in der einen Sicht sichtbar', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');   // Bereich trägt Daten
  V.betreteApp();
  V.oeffneSektor('identity');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('data-herausgeben="identity"'),
    '„Herausgeben"-Affordanz in der editierbaren Sicht sichtbar (datenlage-adaptiv)');
  assert.ok(html.includes('data-einlesen="identity"'),
    '„Daten einlesen"-Affordanz in der editierbaren Sicht sichtbar');
});
