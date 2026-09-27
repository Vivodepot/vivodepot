'use strict';
/* ════════════════════════════════════════════════════════════════════════
   export-luecken-topf-b-dialog.test.js — „57 Export-Lücken" (12.08.2026), Zug 3
   ────────────────────────────────────────────────────────────────────────
   Ein Feld ohne Ziel im gewählten Format (Topf B) ist im Herausgabedialog für DIESES Format
   nicht wählbar — mit einer Erklärung statt eines stillen Verschwindens. Die Grenze: das Feld
   bleibt für jeden ANDEREN Sektor-Zusammenhang (anderes Format, PDF, Voll-Export) normal
   wählbar — die Sperre ist format-spezifisch, nicht feld-global.

   NACHGEZOGEN 12.08.2026 („Die Herausgabe kommt ohne Kästchen aus", Zug 5): kein
   Kästchen/`disabled` mehr. Geprüft wird der NORMALWEG (im Node-Harnisch verlässlich lesbar,
   da `ui.modal()` sein `koerperHTML` per direkter Zuweisung setzt): ein Topf-B-Feld steht NIE
   in der „Geht mit"-Liste, sondern in der „Nicht mitgeschickt"-Box mit der Format-Erklärung.
   Der interaktive Rückhalte-Weg (Knopf-Klick, `.export-zz-format-fest` ohne Umschalt-Knopf)
   ist Playwright-Boden — der Node-DOM-Stub kann `box.querySelector()`-Verdrahtung nicht
   nachstellen (`querySelector` liefert dort immer ein frisches Phantom-Element, kein echtes
   Ziel) — s. `tests/e2e/export-ohne-kaestchen.spec.js`. Die Zusicherung, die den ganzen
   W-10-Befund verhindert hätte, bleibt: sie wird rot, wenn ein Topf-B-Feld je wieder im
   erzeugten Export landet (letzter Test, unverändert).
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

test('XÖV-Verwaltung — ein Topf-B-Feld fehlt in „Geht mit", steht in „Nicht mitgeschickt" mit Format-Erklärung', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('administration', 'passwordManager', 'Bitwarden');
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `bundid_email` ist mit diesem Glied in die
  // Liste `bundid` gewandert UND aus XOEV_VERWALTUNG_MAPPING entfernt worden (dokumentierter
  // Gap, „eigener Zug offen" — s. Kommentar an der Tabelle). Als Vergleichsfeld „bleibt normal
  // gemappt" taugt es darum nicht mehr; `bundid_status` ist ein unverändertes Skalarfeld
  // derselben Sektion, das weiterhin in XOEV_VERWALTUNG_MAPPING steht (Topf A).
  V.sektorFeldSetzen('administration', 'bundidVerificationLevel', 'substanziell');   // Topf-A/bereits-gemapptes Feld zum Vergleich
  V.flowFormatExport('xoev-verwaltung');
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(!html.includes('data-feld="passwordManager"'), 'pw_manager steht NICHT in der Geht-mit-Liste');
  assert.ok(html.includes('data-feld="bundidVerificationLevel"'), 'ein gemapptes Feld bleibt normal in der Geht-mit-Liste');
  assert.match(html, /Passwort-Manager.*dieses Format kann sie nicht abbilden/s,
    'pw_manager steht in der Nicht-mitgeschickt-Box mit der Format-Erklärung');
});

test('XÖV-Verwaltung — für ein ANDERES Format ist dasselbe Feld nicht mehr format-limitiert (formatspezifisch, nicht global)', async () => {
  const { V, document } = await frischMitDepot();
  // pw_manager selbst ist schema-sensibel (`sensibel: true`) — es steht darum auch ohne
  // Format-Bindung in „Nicht mitgeschickt", nur aus einem ANDEREN Grund (Schutz, nicht Format).
  // Ein Topf-A-Feld, das NICHT schema-sensibel ist, zeigt die eigentliche Zusage sauberer.
  // (`bundid_status` statt `bundid_email` — s. Kommentar im Test darüber.)
  V.sektorFeldSetzen('administration', 'passwordManager', 'Bitwarden');
  V.sektorFeldSetzen('administration', 'bundidVerificationLevel', 'substanziell');
  V.flowExportUebersicht({ sektorId: 'administration', titel: 'Test', aufFortfahren: () => {} });
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(html.includes('data-feld="bundidVerificationLevel"'), 'bundid_status (nicht schema-sensibel) geht ohne Format-Bindung normal mit');
  assert.ok(!html.includes('dieses Format kann sie nicht abbilden'), 'ohne Format-Bindung keine Format-Erklärung — auch nicht für pw_manager');
});

test('EDCI-Bildung — ein Topf-B-Feld fehlt in „Geht mit", ein Topf-A-Feld geht mit', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('education', 'grossMonthlyIncome', '4200 EUR');
  V.sektorFeldSetzen('education', 'universitySubject', 'VWL');
  V.flowFormatExport('edci-bildung');
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(!html.includes('data-feld="grossMonthlyIncome"'), 'brutto_monat steht NICHT in der Geht-mit-Liste');
  assert.ok(html.includes('data-feld="universitySubject"'), 'studium_fach geht normal mit');
});

test('SD-JWT-VC-Finanzen — ein Topf-B-Feld fehlt in „Geht mit", das ungeprüfte Feld (steuer_software) geht mit', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('finance', 'ongoingLoansDebts', 'Baudarlehen DKB');
  V.sektorFeldSetzen('finance', 'taxSoftware', 'WISO Steuer');
  V.flowFormatExport('sd-jwt-vc-finanzen');
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(!html.includes('data-feld="ongoingLoansDebts"'), 'schulden steht NICHT in der Geht-mit-Liste');
  assert.ok(html.includes('data-feld="taxSoftware"'), 'ungeprüft ist NICHT Topf B — geht normal mit');
});

test('[Zusicherung] ein Topf-B-Feld kommt nie im Export an', async () => {
  // Die eigentliche Zusicherung aus Zug 4: selbst wenn die Auswahl (defensiv, z. B. per
  // direktem DOM-Zugriff außerhalb der UI) manipuliert würde, exportiert baueAusMapping() das
  // Feld trotzdem nicht — die Sperre im Dialog ist eine UX-Schranke, keine zweite Datenquelle.
  // Diese Probe wird rot, wenn ein Topf-B-Feld je wieder im Export landet.
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('administration', 'passwordManager', 'Bitwarden');
  const e = V.kernAPI.exportiere('xoev-verwaltung', { sensibel: true });
  assert.ok(!JSON.stringify(e).includes('Bitwarden'), 'pw_manager darf unter keinen Umständen im XÖV-Export erscheinen');
});
