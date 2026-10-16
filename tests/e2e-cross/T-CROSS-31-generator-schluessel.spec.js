'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-31 — GEN1: der Schlüssel-Tresor im echten Browser
   ─────────────────────────────────────────────────
   Die Zusicherungen (a) bis (c) der ADR zum Schlüssel im Speicher, dort, wo ein Node-Harnisch nichts messen
   kann: ein ECHTER Klick ist vertrauenswürdig, ein von einem Skript erzeugter nicht; und `window` trägt nichts.
   Rot-Beweis: die Gegenrichtung steht in derselben Datei — der synthetische Klick signiert NICHT, der echte
   danach schon; ohne diesen Kontrast wäre „wird abgewiesen“ auch dann grün, wenn der Knopf tot wäre.
   Der Rot-Beweis je Zusicherung steht in tests/generator-schluessel-tresor.test.js.
   ZEITLIMIT UND ECHTES VERLASSEN IM BROWSER (12.10.2026): bis hierher maß nur der Node-Harnisch das Zeitlimit, mit verkürzter
   Frist, und das Verlassen war ein nachgestelltes Ereignis. Zwei Proben am Ende dieser Datei messen beides am echten
   Browser: die Uhr des Browsers wird vorgestellt (das Limit der Seite bleibt 15 Minuten), und die Seite wird wirklich
   verlassen und über „zurück“ wieder betreten.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

async function bisZumPaketKnopf(browser, vorDemOeffnen) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  if (vorDemOeffnen) await vorDemOeffnen(p);
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
    await p.fill('#sd-name', sd.anbieterName); await p.fill('#sd-rechtsform', sd.rechtsform); await p.fill('#sd-land', sd.land || 'Deutschland');
    await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
    await p.fill('#sd-k-name', sd.kontaktName);
    await p.fill('#sd-k-email', sd.kontaktEmail); await p.fill('#sd-k-telefon', sd.kontaktTelefon);
    await p.click('#sd-weiter');
    await p.fill('#sk-pw1', H.SCHLUESSEL_PASSWORT_E2E); await p.fill('#sk-pw2', H.SCHLUESSEL_PASSWORT_E2E);
    await p.click('#sk-erzeugen');
    await p.waitForSelector('#sk-downloads:not([hidden])');
    // das Material des privaten Anteils über den einzigen erlaubten Weg holen: die Datei
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#sk-priv')]);
    // die Datei ist verschlüsselt (.vdkey) und trägt kein d; das Material holt die Probe über die Hülle der Seite selbst
    const huelle = JSON.parse(require('node:fs').readFileSync(await dl.path(), 'utf8'));
    expect(huelle.d).toBeUndefined();
    const d = await p.evaluate(async ([h, pw]) => (await entschluesseleSchluesselJwk(h, pw)).d, [huelle, H.SCHLUESSEL_PASSWORT_E2E]);
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
    // Befund STUDIO-ERFOLG-NEBEN-SCHLUESSELHINWEIS (05.10.2026): direkt nach dem Erzeugen steht der Erfolg allein. Vorher
    // standen darüber der gelbe „Schlüssel nicht im Speicher“ und der gesperrte Knopf (Rot-Beweis: die Fassung vor dem Fix
    // zeigte genau das, im Browser nachgestellt).
    await expect(p.locator('#fs-fertig')).toBeVisible();
    await expect(p.locator('#fs-fertig')).toContainText(/signiert/);
    await expect(p.locator('#pr-schluessel-hinweis')).toBeHidden();
    await expect(p.locator('#pr-submit')).toBeHidden();
    // ein zweites Paket ohne Schlüssel: wer den Dialog neu öffnet, sieht den gesperrten Knopf und was fehlt
    await p.click('#fs-fertig-zu');
    await p.click('#fertig-oeffnen');
    await expect(p.locator('#fs-fertig')).toBeHidden();
    await p.click('#pr-pruefen');
    await expect(p.locator('#pr-submit')).toBeDisabled();
    await expect(p.locator('#pr-schluessel-hinweis')).toBeVisible();
    // beim Verlassen: pagehide räumt einen neuen Schlüssel
    await p.click('#fs-b-kopf');
    await p.fill('#sk-pw1', H.SCHLUESSEL_PASSWORT_E2E); await p.fill('#sk-pw2', H.SCHLUESSEL_PASSWORT_E2E);
    await p.click('#sk-erzeugen');
    // #sk-downloads ist vom ersten Paar noch sichtbar — gewartet wird auf den Tresor selbst: das Verschlüsseln der
    // Schlüsseldatei (PBKDF2) braucht seine Zeit, und erst danach ist der neue Schlüssel da.
    await p.waitForFunction(() => SCHLUESSEL_TRESOR.vorhanden());
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
    expect(z.huelleDa).toBe(false);   // nach „weiter“ (im Helfer geklickt) gibt es die verschlüsselte Datei im Speicher nicht mehr
    await ctx.close();
  });

  test('GEN2: das Empfangs-Schlüsselpaar der Anfrage liegt nicht als Klartext-JWK an STATE oder window und wird bei Bestätigung verworfen', async ({ browser }) => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await p.click('#start-module');
    await p.click('#mod-kacheln [data-mod="anf"]');
    await p.selectOption('#anf-antwort-art', 'schluesselpaar');
    await p.fill('#anf-pw1', H.SCHLUESSEL_PASSWORT_E2E); await p.fill('#anf-pw2', H.SCHLUESSEL_PASSWORT_E2E);
    await p.click('#anf-schluessel-erzeugen');
    await p.waitForSelector('#anf-schluessel-downloads:not([hidden])');
    await expect(p.locator('#anf-schluessel-fertig')).toBeVisible();
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#anf-schluessel-priv')]);
    // die Datei ist verschlüsselt (.vdkey) und trägt kein d; das Material holt die Probe über die Hülle der Seite selbst
    const huelle = JSON.parse(require('node:fs').readFileSync(await dl.path(), 'utf8'));
    expect(huelle.d).toBeUndefined();
    const d = await p.evaluate(async ([h, pw]) => (await entschluesseleSchluesselJwk(h, pw)).d, [huelle, H.SCHLUESSEL_PASSWORT_E2E]);
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
  test('(c) Zeitlimit im Browser: mit vorgestellter Uhr ist der Schlüssel nach 15 Minuten fort, davor nicht; das Limit der Seite ist nicht verkürzt', async ({ browser }) => {
    // Die Uhr des Browsers wird ersetzt, BEVOR die Seite ihren Zeitgeber stellt; sie läuft weiter und lässt sich vorstellen.
    const { ctx, p } = await bisZumPaketKnopf(browser, (seite) => seite.clock.install());
    const z = await p.evaluate(() => SCHLUESSEL_TRESOR.zustand());
    expect(z.limitMs).toBe(15 * 60 * 1000);                                        // keine Testtür: das echte Limit
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);
    await p.clock.fastForward(14 * 60 * 1000);
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);    // Gegenprobe: vor Ablauf ist er da
    await p.clock.fastForward(61 * 1000);
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);   // nach 15 Minuten fort
    // und ein echter Klick signiert danach nichts mehr: die Seite verlangt die Schlüsseldatei
    await expect(p.locator('#pr-schluessel-hinweis')).toBeVisible();
    await expect(p.locator('#pr-submit')).toBeDisabled();
    await ctx.close();
  });

  test('(c) echtes Verlassen: die Anwendung verwirft den Schlüssel im pagehide der Navigation; nach „zurück“ ist keiner da', async ({ browser }) => {
    const { ctx, p } = await bisZumPaketKnopf(browser);
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);
    // Drei Messungen an der ECHTEN Navigation. Im beforeunload, dem letzten Ereignis vor dem pagehide, ist der Schlüssel noch
    // da (sonst mäße die Probe nichts). Der Tresor meldet danach sein Verwerfen mit dem Grund „verlassen“, und im pagehide
    // nach dem Griff der Anwendung ist der Schlüssel fort. Ein Messpunkt VOR dem Griff im selben pagehide geht nicht: am
    // Fenster laufen die Hörer in der Reihenfolge ihrer Anmeldung, und die Anwendung hat sich zuerst angemeldet.
    // Das Studio fragt beim Verlassen mit offener Arbeit nach (beforeunload): die Probe bestätigt die Rückfrage wie eine
    // Person, die wirklich geht, und hält fest, dass sie kam. Das Ergebnis schreibt der zweite Messpunkt in den Speicher der
    // Seite (im Entladen kommt weder eine Konsolenzeile noch ein Funktionsaufruf mehr an, und window.name leert der Browser
    // beim Wechsel der Herkunft); gelesen wird es nach der Rückkehr.
    const FACH = 'vd-probe-tresor-bei-pagehide';
    const rueckfragen = [];
    p.on('dialog', (d) => { rueckfragen.push(d.type()); d.accept(); });
    await p.evaluate((fach) => {
      // Ablauf des Verlassens, Schritt für Schritt in den Speicher der Seite geschrieben: je Ereignis, ob der Schlüssel da ist.
      const ablauf = [];
      const merke = (was, e) => {
        ablauf.push({ was, da: SCHLUESSEL_TRESOR.vorhanden(), sichtbar: document.visibilityState, imSeitenCache: !!(e && e.persisted) });
        const t = JSON.stringify(ablauf);
        try { localStorage.setItem(fach, t); } catch (_) { /* dann der Sitzungsspeicher */ }
        try { sessionStorage.setItem(fach, t); } catch (_) { /* dann fehlt die Messung, und die Probe sagt es */ }
      };
      merke('angemeldet');
      // Der Melder des Tresors nennt den Grund. Er ersetzt hier den der Oberfläche; die Seite wird ohnehin verlassen.
      SCHLUESSEL_TRESOR.beimVerwerfen((grund) => merke('verworfen:' + grund));
      window.addEventListener('beforeunload', (e) => merke('beforeunload-einfang', e), true);
      document.addEventListener('visibilitychange', (e) => merke('visibilitychange', e), true);
      window.addEventListener('pagehide', (e) => merke('pagehide-danach', e));
    }, FACH);
    await p.goto('about:blank');
    expect(p.url()).toBe('about:blank');     // die Seite ist wirklich verlassen, nicht an der Rückfrage hängen geblieben
    expect(rueckfragen).toEqual(['beforeunload']);
    // Rückkehr über „zurück“: gleich ob aus dem Seiten-Cache oder neu geladen, es ist kein Schlüssel da.
    await p.goBack();
    await p.waitForFunction(() => typeof SCHLUESSEL_TRESOR !== 'undefined');
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);
    const roh = await p.evaluate((fach) => {
      let t = null;
      try { t = localStorage.getItem(fach); localStorage.removeItem(fach); } catch (_) { /* weiter */ }
      try { t = t || sessionStorage.getItem(fach); sessionStorage.removeItem(fach); } catch (_) { /* weiter */ }
      return t;
    }, FACH);
    expect(roh, 'das pagehide der Navigation hat seine Messung im Speicher der Seite hinterlassen').not.toBeNull();
    const ablauf = JSON.parse(roh);
    const schritt = (was) => ablauf.find((x) => x.was === was);
    const bericht = JSON.stringify(ablauf);
    expect(schritt('angemeldet').da, bericht).toBe(true);
    expect(schritt('pagehide-danach'), bericht).toBeTruthy();
    expect(schritt('pagehide-danach').da, bericht).toBe(false);         // nach dem Griff der Anwendung im echten pagehide: fort
    // Unmittelbar davor war er da, und verworfen hat ihn die Anwendung mit dem Grund „verlassen“, genau einmal und vor dem
    // Messpunkt im pagehide. Ohne diese beiden Zeilen wäre „fort“ auch wahr, wenn der Schlüssel schon vorher gefehlt hätte.
    expect(schritt('beforeunload-einfang').da, bericht).toBe(true);
    expect(ablauf.filter((x) => x.was.startsWith('verworfen:')).map((x) => x.was), bericht).toEqual(['verworfen:verlassen']);
    const iVerworfen = ablauf.findIndex((x) => x.was === 'verworfen:verlassen');
    expect(iVerworfen, bericht).toBeGreaterThanOrEqual(0);
    const iDanach = ablauf.findIndex((x) => x.was === 'pagehide-danach');
    expect(iDanach, bericht).toBeGreaterThanOrEqual(0);
    expect(iVerworfen, bericht).toBeLessThan(iDanach);
    test.info().annotations.push({ type: 'Ablauf', description: bericht });
    // und nach einem Neuladen ebenso
    await p.reload();
    await p.waitForFunction(() => typeof SCHLUESSEL_TRESOR !== 'undefined');
    expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);
    await ctx.close();
  });
});
