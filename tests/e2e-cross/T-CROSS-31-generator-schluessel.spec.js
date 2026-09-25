'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-31 — GEN1: der Schlüssel-Tresor im echten Browser
   ─────────────────────────────────────────────────
   Die Zusicherungen (a) bis (c) der ADR zum Schlüssel im Speicher, dort, wo ein Node-Harnisch nichts messen
   kann: ein ECHTER Klick ist vertrauenswürdig, ein von einem Skript erzeugter nicht; und `window` trägt nichts.
   Rot-Beweis: die Gegenrichtung steht in derselben Datei — der synthetische Klick signiert NICHT, der echte
   danach schon; ohne diesen Kontrast wäre „wird abgewiesen“ auch dann grün, wenn der Knopf tot wäre.
   Das Zeitlimit und der Rot-Beweis je Zusicherung stehen in tests/generator-schluessel-tresor.test.js.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

async function bisZumPaketKnopf(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  await H.generator.oeffnen(p, 'de');
  await H.generator.stammdaten(p, FIX.stammdaten);
  await H.generator.schluesselErzeugen(p);
  await H.generator.dreiFelder(p, FIX.felder);
  await p.waitForSelector('#pr-pruefen', { state: 'visible' });
  await p.click('#pr-pruefen');
  await expect(p.locator('#pr-submit')).toBeEnabled();
  return { ctx, p };
}

test.describe('T-CROSS-31 Schlüssel im Speicher', () => {
  test('(b) nichts an window, STATE oder den Namen der obersten Ebene trägt den Schlüssel', async ({ browser }) => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await p.click('#start-leer');
    await p.click('#fertig-oeffnen');
    const sd = FIX.stammdaten;
    await p.fill('#sd-name', sd.anbieterName); await p.selectOption('#sd-rechtsform', sd.rechtsform);
    await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
    await p.fill('#sd-k-name', sd.kontaktName); await p.fill('#sd-k-funktion', sd.kontaktFunktion);
    await p.fill('#sd-k-email', sd.kontaktEmail); await p.fill('#sd-k-telefon', sd.kontaktTelefon);
    await p.selectOption('#sd-bereich', sd.bereich); await p.fill('#sd-usecase', sd.useCase);
    await p.click('#sd-weiter');
    await p.click('#sk-erzeugen');
    await p.waitForSelector('#sk-downloads:not([hidden])');
    // das Material des privaten Anteils über den einzigen erlaubten Weg holen: die Datei
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#sk-priv')]);
    const d = JSON.parse(require('node:fs').readFileSync(await dl.path(), 'utf8')).d;
    expect(d && d.length > 20).toBeTruthy();
    const treffer = await p.evaluate((dWert) => {
      const funde = []; const gesehen = new Set();
      const geh = (x, weg, tiefe) => {
        if (x === null || tiefe > 6) return;
        if (typeof x === 'string') { if (x.indexOf(dWert) >= 0) funde.push(weg); return; }
        if (typeof x !== 'object' && typeof x !== 'function') return;
        if (gesehen.has(x)) return; gesehen.add(x);
        if (x instanceof CryptoKey && x.type === 'private') funde.push(weg + ' (CryptoKey)');
        let ks = []; try { ks = Object.getOwnPropertyNames(x); } catch (e) { return; }
        for (const k of ks) { if (k === 'document' || k === 'top' || k === 'parent' || k === 'frames') continue; let v; try { v = x[k]; } catch (e) { continue; } geh(v, weg + '.' + k, tiefe + 1); }
      };
      geh(window, 'window', 0); geh(STATE, 'STATE', 0);
      return { funde, stateHatPrivat: typeof STATE.privateJwk !== 'undefined' || typeof STATE.cryptoKeyPair !== 'undefined', hueelle: Object.keys(SCHLUESSEL_TRESOR) };
    }, d);
    expect(treffer.funde).toEqual([]);
    expect(treffer.stateHatPrivat).toBe(false);
    expect(treffer.hueelle).not.toContain('schluessel');
    // Positivkontrolle: derselbe Sucher findet das Material, wenn es an window läge
    const kontrolle = await p.evaluate((dWert) => { window.__probe = { d: dWert }; let g = false; const geh = (x, t) => { if (x === null || t > 2 || typeof x !== 'object') return; for (const k of Object.getOwnPropertyNames(x)) { const v = x[k]; if (v === dWert) g = true; geh(v, t + 1); } }; geh(window.__probe, 0); delete window.__probe; return g; }, d);
    expect(kontrolle).toBe(true);
    await ctx.close();
  });

  test('(b) ein von einem Skript erzeugter Klick signiert nicht, der echte danach schon', async ({ browser }) => {
    const { ctx, p } = await bisZumPaketKnopf(browser);
    // Ein Skript löst den Knopf aus: isTrusted ist false — abgewiesen, und der Schlüssel bleibt
    await p.evaluate(() => document.getElementById('pr-submit').click());
    await expect(p.locator('#pr-ergebnis')).toContainText(/echten Klick/);
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);
    expect(await p.evaluate(() => STATE.letzteSubmission)).toBeNull();
    // Der echte Klick geht durch
    const datei = await H.downloadNachTmp(p, H.frischerTmp('gen1-schluessel'), () => p.click('#pr-submit'));
    expect(require('node:fs').existsSync(datei)).toBe(true);
    expect(await p.evaluate(() => STATE.letzteSubmission && STATE.letzteSubmission.templatesJws.length)).toBe(1);
    await ctx.close();
  });

  test('(c) verworfen nach dem Signieren und beim Verlassen; danach verlangt die Seite die Schlüsseldatei', async ({ browser }) => {
    const { ctx, p } = await bisZumPaketKnopf(browser);
    await H.downloadNachTmp(p, H.frischerTmp('gen1-schluessel2'), () => p.click('#pr-submit'));
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);    // nach dem Signieren
    // ein zweites Paket ohne Schlüssel: der Knopf ist gesperrt und die Seite sagt, was fehlt
    await p.click('#pr-pruefen');
    await expect(p.locator('#pr-submit')).toBeDisabled();
    await expect(p.locator('#pr-schluessel-hinweis')).toBeVisible();
    // beim Verlassen: pagehide räumt einen neuen Schlüssel
    await p.click('#fs-b-kopf');
    await p.click('#sk-erzeugen');
    await p.waitForSelector('#sk-downloads:not([hidden])');
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);
    await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);
    await expect(p.locator('#sk-status')).toContainText(/Kein Schlüssel im Speicher/);
    await ctx.close();
  });

  test('(a) der gehaltene Schlüssel ist nicht herausholbar, das Material nach „weiter“ fort', async ({ browser }) => {
    const { ctx, p } = await bisZumPaketKnopf(browser);
    const z = await p.evaluate(() => SCHLUESSEL_TRESOR.zustand());
    expect(z.extractable).toBe(false);
    expect(z.algorithmus).toBe('Ed25519');
    expect(z.rohMaterialDa).toBe(false);   // nach „weiter“ (im Helfer geklickt) gibt es das Material nicht mehr
    await ctx.close();
  });

  test('GEN2: das Empfangs-Schlüsselpaar der Anfrage liegt nicht als Klartext-JWK an STATE oder window und wird bei Bestätigung verworfen', async ({ browser }) => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await p.click('#start-module');
    await p.click('#mod-kacheln [data-mod="anf"]');
    await p.selectOption('#anf-antwort-art', 'schluesselpaar');
    await p.click('#anf-schluessel-erzeugen');
    await p.waitForSelector('#anf-schluessel-downloads:not([hidden])');
    await expect(p.locator('#anf-schluessel-fertig')).toBeVisible();
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#anf-schluessel-priv')]);
    const d = JSON.parse(require('node:fs').readFileSync(await dl.path(), 'utf8')).d;
    expect(d && d.length > 20).toBeTruthy();
    const funde = await p.evaluate((dWert) => {
      const f = []; const gesehen = new Set();
      const geh = (x, weg, t) => {
        if (x === null || t > 6) return;
        if (typeof x === 'string') { if (x.indexOf(dWert) >= 0) f.push(weg); return; }
        if (typeof x !== 'object' && typeof x !== 'function') return;
        if (gesehen.has(x)) return; gesehen.add(x);
        if (typeof x === 'object' && typeof x.kty === 'string' && typeof x.d === 'string') f.push(weg + ' (JWK mit d)');
        let ks = []; try { ks = Object.getOwnPropertyNames(x); } catch (e) { return; }
        for (const k of ks) { if (['document', 'top', 'parent', 'frames'].includes(k)) continue; let v; try { v = x[k]; } catch (e) { continue; } geh(v, weg + '.' + k, t + 1); }
      };
      geh(window, 'window', 0); geh(STATE, 'STATE', 0);
      return f;
    }, d);
    expect(funde).toEqual([]);
    expect(await p.evaluate(() => EMPFANGS_TRESOR.vorhanden())).toBe(true);
    await p.click('#anf-schluessel-fertig');            // die Institution bestätigt: beide Teile gesichert
    expect(await p.evaluate(() => EMPFANGS_TRESOR.vorhanden())).toBe(false);
    await expect(p.locator('#anf-schluessel-status')).toContainText(/aus dem Speicher entfernt/);
    await expect(p.locator('#anf-schluessel-fertig')).toBeHidden();
    await ctx.close();
  });

  test('GEN2b: eine Modul-Ausgabeart signiert mit dem Tresor-Schlüssel, nur auf einen echten Klick, einmal', async ({ browser }) => {
    const { ctx, p } = await bisZumPaketKnopf(browser);           // Angaben und Schlüssel stehen, der Schlüssel liegt im Tresor
    await p.click('#dlg-fertig .dlg-zu');
    await p.click('#bau-start');
    await p.click('#start-module');
    await p.click('#mod-kacheln [data-mod="ia"]');
    await p.fill('#ia-sprache', 'de');
    await p.fill('#ia-herkunft', 'test');
    await p.click('#ia-zeile-hinzu');
    await p.fill('#ia-zeilen input >> nth=0', 'notaire');
    await p.fill('#ia-zeilen input >> nth=1', 'Notariat');
    // ein von einem Skript ausgelöster Klick signiert nicht, und fällt nicht auf „unsigniert“ zurück
    await p.evaluate(() => document.getElementById('ia-erzeugen').click());
    await expect(p.locator('#ia-ergebnis')).toContainText(/echten Klick/);
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);
    // der echte Klick signiert, und der Schlüssel ist danach fort
    const datei = await H.downloadNachTmp(p, H.frischerTmp('gen1-modul'), () => p.click('#ia-erzeugen'));
    const umschlag = JSON.parse(require('node:fs').readFileSync(datei, 'utf8').replace(/^[^{]*/, ''));
    expect(umschlag.modulSignaturJws).toBeTruthy();
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);
    await ctx.close();
  });
});
