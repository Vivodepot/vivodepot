/**
 * wcag-axe-lesen.mjs — WCAG 2.2 AA Konformität via axe-core über die Lese-App
 * ============================================================================
 * „Die Lese-App wird nirgends mitgemessen" (12./13.08.2026), Befund 1.
 * Gegenstück zu wcag-axe.mjs (Kern) — dieselben Tags, dieselbe Logotype-Ausnahme,
 * gegen `vivodepot-lesen.html`. GEGATET (Teil von `npm run test:konformitaet`),
 * schlank: die volle Referenzdepot-Kampagne mit Theme×Skala-Produkt liegt als
 * separates Werkzeug in `tools/axe-lauf-lesen.js` (die Lese-App trägt ohnehin
 * KEINE Theme-/Schriftskala-Klassen — gemessen, grep über die ganze Datei: null
 * Treffer für dark-mode/high-contrast/fs-medium/fs-large. Ein visueller Zustand
 * je Sicht, kein Matrix-Produkt wie beim Kern nötig).
 *
 * DIE LESE-APP HAT KEIN EIGENES sektorFeldSetzen — der einzige Weg zu gefülltem
 * Inhalt ist eine ECHTE, vom Kern erzeugte .vivodepot-Datei (zwei Browser-
 * Kontexte, wie tests/e2e-cross/T-CROSS-01-voll-depot.spec.js).
 *
 * Ausführen: node --test tests/konformitaet/wcag-axe-lesen.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const H = require('../e2e-cross/support/helpers.js');
const { echteSektorenListe } = require('../../tools/lib/sektoren.js');

const HTML_PFAD = process.env.LESEN_HTML_PATH
  ? resolve(process.env.LESEN_HTML_PATH)
  : join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vivodepot-lesen.html');
const FILE_URL = pathToFileURL(HTML_PFAD).href;
const TAGS    = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const EXCLUDE = ['.logo-wort', '.vd-logo'];   // WCAG 1.4.3 Logotype-Ausnahme, wortgleich zum Kern
const PW = 'wcag-axe-lesen-pw';

async function scan(page, name, alle) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude(EXCLUDE).analyze();
  alle.push({ name, violations: r.violations.map(v => `${v.id}(${v.impact}×${v.nodes.length})`) });
}

test('[Konformität] axe-core WCAG 2.2 AA über alle Lese-App-Sichten', async (t) => {
  const browser = await chromium.launch();
  const tmp = mkdtempSync(join(tmpdir(), 'wcag-axe-lesen-'));
  try {
    /* ── Kontext A: Kern baut ein schlankes, aber repräsentatives Depot ──── */
    const ctxA = await browser.newContext({ acceptDownloads: true });
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: 'Maria Mustermann', pw: PW });
    await a.evaluate(() => {
      const V = window.__vdOeffentlich;
      V.sektorFeldSetzen('identity', 'givenName', 'Maria');
      V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
      V.sektorFeldSetzen('identity', 'birthDate', '1965-04-23');
      V.sektorFeldSetzen('health', 'bloodType', 'A+');
      V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
      // Ein sensibles Listen-Unterfeld — Befund 2 hält es zurück, hier prüft Befund 1 nur,
      // dass die Zurückhaltung selbst (die Zeile bleibt weg) keine neue axe-Verletzung erzeugt.
      V.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Sparkasse Test' }, accountType: 'Girokonto', iban: 'DE89 3704 0044 0532 0130 00' });
    });
    let dateiPfad;
    try {
      dateiPfad = await H.kern.speichernNachTmp(a, tmp);
    } finally {
      await ctxA.close();
    }

    /* ── Kontext B: Lese-App — Welcome, Voll-Sicht je Sektor, qr-bereich ──── */
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    const alle = [];

    await H.lesen.oeffnen(b);
    await scan(b, 'welcome:weg-datei', alle);

    await b.click('#weg-einfuegen');
    await b.waitForSelector('#qr-text', { state: 'visible' });
    await scan(b, 'welcome:weg-einfuegen', alle);
    await b.goto(FILE_URL);
    await b.waitForSelector('#weg-datei', { state: 'visible' });

    await H.lesen.dateiOeffnen(b, dateiPfad, PW);
    const SEKTOREN = echteSektorenListe();
    for (const sid of SEKTOREN) {
      await b.click(`[data-sektor="${sid}"]`);
      await b.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
      await scan(b, 'sektor:' + sid, alle);
    }
    await ctxB.close();

    /* ── Kontext C: qr-bereich (Text-Einfüge-Weg, U2-ADR-082 Selbstauskunftssicht) ── */
    const ctxC = await browser.newContext();
    const c = await ctxC.newPage();
    try {
      const { ladeKern } = require('../load-kern.js');
      const { V: K } = ladeKern();
      const nutzlast = JSON.stringify({
        v: 1, typ: 'vivodepot-bereich', bereich: 'gesundheit', bereichLabel: 'Gesundheit',
        stand: '2026-08-13', felder: [{ id: 'blutgruppe', label: 'Blutgruppe', wert: 'A+' }],
      });
      const teile = K.qrTeilePacken(nutzlast);
      assert.equal(teile.length, 1, 'Testaufbau muss einteilig sein');
      await H.lesen.oeffnen(c);
      await H.lesen.qrTextEinfuegen(c, teile[0].rahmen);
      await c.waitForSelector('#app .bereich-kopf', { timeout: 5000 });   // renderQrBereich() schreibt in #app, nicht #content
      await scan(c, 'qr-bereich', alle);
    } finally {
      await ctxC.close();
    }

    const mitViol = alle.filter(v => v.violations.length);
    t.diagnostic(`Sichten gescannt: ${alle.length}`);
    t.diagnostic(`Sichten mit Violations: ${mitViol.length}`);
    for (const v of mitViol) t.diagnostic(`  ${v.name}: ${v.violations.join(', ')}`);

    assert.equal(mitViol.length, 0,
      `WCAG-Violations in ${mitViol.length}/${alle.length} Lese-App-Sichten:\n` +
      mitViol.map(v => `  ${v.name}: ${v.violations.join(', ')}`).join('\n'));
  } finally {
    await browser.close();
    try { rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  }
});
