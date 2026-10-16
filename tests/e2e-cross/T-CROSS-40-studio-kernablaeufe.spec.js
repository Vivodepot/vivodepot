'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-40 — Studio-Kernabläufe im Browser: sichern, erneut öffnen, abweisen
   ─────────────────────────────────────────────────
   Der erste Teil eines Durchstichs vom Studio bis zur Rückgabe. Jeder Schritt nimmt die Datei, die der vorige
   heruntergeladen hat: Der Entwurf, der wieder geöffnet wird, ist der eben gesicherte; die Schlüsseldatei, die
   abgewiesen wird, ist die eben erzeugte mit einem geänderten Zeichen. Nichts davon wird hier von Hand gebaut,
   außer den Dateien, die ungültig sein SOLLEN.

   Was hier steht
     P1  Vorlage anlegen, ein Feld ändern, als Entwurf sichern, Seite neu öffnen, Entwurf fortsetzen.
     P3  Eine Datei, die kein Entwurf ist, wird mit einer Meldung abgewiesen und ändert nichts.
     P4  Eine Schlüsseldatei mit einem geänderten Zeichen und ein falsches Passwort werden abgewiesen.

     P4b Ein von Hand geänderter Entwurf öffnet ohne Schaden oder wird mit einer Meldung abgelehnt, nie halb.
     P4c Ein Entwurf aus einer neueren Fassung wird mit einer Meldung abgelehnt; einer ohne Angabe öffnet weiter.

   Der Entwurf ist die Arbeitsdatei der Einrichtung und trägt bewusst keine Signatur. „Abweisen wegen Manipulation“
   gilt für signierte Dinge. Für den Entwurf gilt: Die Form wird beim Öffnen geprüft, der Inhalt ist nur Daten
   (nichts daraus wird ausgeführt oder ungeprüft ins Markup gesetzt), eine kaputte Datei ergibt eine Meldung.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

const ENTWURF_NAME = 'vivodepot-vorlage-entwurf.json';
/* Die Karte der Vorschau zeigt den Namen eines Pflichtfelds mit einem Stern; der Entwurf trägt den Namen ohne ihn. */
const ohneStern = (namen) => namen.map((n) => n.replace(/\*$/, ''));
const ABGEWIESEN = /Der Entwurf konnte nicht geöffnet werden/;

/* Zwei eigene Felder auf der Arbeitsfläche anlegen, auf dem Weg, den auch die Helfer gehen. */
async function zweiFelderAnlegen(p) {
  await p.click('#start-leer');
  await p.waitForSelector('#palette', { state: 'visible' });
  await p.click('.pal-frei > summary');
  for (const f of FIX.felder.slice(0, 2)) {
    await p.click('.pal-eintrag[data-typ="' + f.feldtyp + '"] .pal-plus');
    await p.waitForSelector('#feld-editor:not([hidden])');
    await p.fill('#ed-name', f.feldname);
    await p.evaluate(() => { document.querySelector('.eig-erweitert').open = true; });
    await p.selectOption('#ed-bereich', f.bereich);
    if (f.pflicht) await p.check('#ed-pflicht');
  }
  await expect(p.locator('.vk')).toHaveCount(2);
}

async function entwurfOeffnen(p, datei) {
  await H.generator.oeffnen(p, 'de');
  await p.setInputFiles('#ent-datei', datei);
}

test.describe('T-CROSS-40 Studio-Kernabläufe', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('studio-kern'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('P1 anlegen, ändern, sichern, erneut öffnen: der Entwurf kommt so zurück, wie er gesichert wurde', async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await zweiFelderAnlegen(p);
    // Bearbeiten: das zuletzt angelegte Feld ist im Editor; sein Name ändert sich, die Vorschau folgt.
    await p.fill('#ed-name', 'Aufnahmedatum geändert');
    await expect(p.locator('.vk .vk-name', { hasText: 'Aufnahmedatum geändert' })).toBeVisible();
    const namen = await p.locator('.vk .vk-name').allInnerTexts();

    const datei = await H.downloadNachTmp(p, tmp, () => p.click('#entwurf-sichern'));
    expect(path.basename(datei)).toBe(ENTWURF_NAME);
    await expect(p.locator('#bau-status')).toContainText('Entwurf gesichert');
    const entwurf = JSON.parse(fs.readFileSync(datei, 'utf8'));
    expect(entwurf.format).toBe('vivodepot-generator-entwurf');
    expect(entwurf.felder.map((f) => f.feldname)).toEqual(ohneStern(namen));
    expect(entwurf.felder.map((f) => !!f.pflicht)).toEqual(namen.map((n) => /\*$/.test(n)));   // der Stern steht genau an den Pflichtfeldern
    // Der Entwurf trägt keinen Schlüssel, in keinem Feld.
    expect(JSON.stringify(entwurf)).not.toMatch(/"d"\s*:|privateKey|vdkey/i);
    await ctx.close();

    // Erneut öffnen: eine frische Seite, die gesicherte Datei durch die Kachel „Entwurf fortsetzen“.
    const ctx2 = await browser.newContext({ acceptDownloads: true });
    const p2 = await ctx2.newPage();
    await entwurfOeffnen(p2, datei);
    await expect(p2.locator('.vk')).toHaveCount(2);
    expect(await p2.locator('.vk .vk-name').allInnerTexts()).toEqual(namen);
    await expect(p2.locator('#tpl-anzahl')).toContainText('2');
    await expect(p2.locator('#start-status')).toBeHidden();
    // Noch einmal sichern: dieselben Felder gehen wieder hinaus.
    const datei2 = await H.downloadNachTmp(p2, H.frischerTmp('studio-kern-2'), () => p2.click('#entwurf-sichern'));
    expect(JSON.parse(fs.readFileSync(datei2, 'utf8')).felder).toEqual(entwurf.felder);
    H.tmpAufraeumen(path.dirname(datei2));
    await ctx2.close();

    // Rot-Beweis: Die Prüfung oben unterscheidet. Ein Entwurf mit nur einem Feld zeigt eine Karte, nicht zwei.
    const gekuerzt = path.join(tmp, 'entwurf-ein-feld.json');
    fs.writeFileSync(gekuerzt, JSON.stringify(Object.assign({}, entwurf, { felder: entwurf.felder.slice(0, 1) })));
    const ctx3 = await browser.newContext();
    const p3 = await ctx3.newPage();
    await entwurfOeffnen(p3, gekuerzt);
    await expect(p3.locator('.vk')).toHaveCount(1);
    await ctx3.close();
  });

  test('P3 was kein Entwurf ist, wird mit einer Meldung abgewiesen und ändert nichts', async ({ browser }) => {
    test.setTimeout(120000);
    const faelle = [
      ['kein JSON', '{ kaputt'],
      ['leere Datei', ''],
      ['JSON, aber kein Objekt', '[1, 2, 3]'],
      ['anderes Format', JSON.stringify({ format: 'etwas-anderes', version: 1, felder: [] })],
      ['richtiges Format ohne Felder', JSON.stringify({ format: 'vivodepot-generator-entwurf', version: 1 })],
      ['Felder sind keine Liste', JSON.stringify({ format: 'vivodepot-generator-entwurf', version: 1, felder: 'x' })],
      ['ein Einreichungspaket statt eines Entwurfs', JSON.stringify({ submissionId: 'x', anbieter: {}, publicKeyJwk: {}, templates: [] })],
    ];
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    for (const [name, inhalt] of faelle) {
      await p.setInputFiles('#ent-datei', { name: 'pruefling.json', mimeType: 'application/json', buffer: Buffer.from(inhalt, 'utf8') });
      await expect(p.locator('#start-status'), name).toBeVisible();
      await expect(p.locator('#start-status'), name).toHaveClass(/fehler/);
      await expect(p.locator('#start-status'), name).toContainText(ABGEWIESEN);
      // Nichts geändert: der Start steht noch da, die Arbeitsfläche hat keine Karte bekommen.
      await expect(p.locator('#start-leer'), name).toBeVisible();
      await expect(p.locator('.vk'), name).toHaveCount(0);
    }
    // Gegenprobe auf derselben Seite: nach sieben Abweisungen öffnet ein echter Entwurf.
    await zweiFelderAnlegen(p);
    const datei = await H.downloadNachTmp(p, tmp, () => p.click('#entwurf-sichern'));
    await ctx.close();
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await entwurfOeffnen(p2, datei);
    await expect(p2.locator('.vk')).toHaveCount(2);
    await ctx2.close();
  });

  test('P4 eine Schlüsseldatei mit einem geänderten Zeichen und ein falsches Passwort werden abgewiesen, die unveränderte Datei lädt', async ({ browser }) => {
    test.setTimeout(180000);
    // Die Schlüsseldatei entsteht im Studio selbst.
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await H.generator.stammdaten(p, FIX.stammdaten);
    await p.fill('#sk-pw1', H.SCHLUESSEL_PASSWORT_E2E); await p.fill('#sk-pw2', H.SCHLUESSEL_PASSWORT_E2E);
    await p.click('#sk-erzeugen');
    await p.waitForSelector('#sk-downloads:not([hidden])');
    await Promise.all([p.waitForEvent('download'), p.click('#sk-pub')]);
    const schluesseldatei = await H.downloadNachTmp(p, tmp, () => p.click('#sk-priv'));
    await ctx.close();
    const original = fs.readFileSync(schluesseldatei, 'utf8');
    expect(original).not.toMatch(/"d"\s*:/);          // die Datei ist verschlüsselt, kein privater Teil im Klartext

    // Ein Zeichen in der Mitte der Datei ändern, ohne das JSON zu brechen: eine Ziffer oder ein Buchstabe wird ein anderer.
    const mitte = Math.floor(original.length / 2);
    let i = mitte;
    while (i < original.length && !/[A-Za-z0-9]/.test(original[i])) i += 1;
    const ersatz = original[i] === 'A' ? 'B' : 'A';
    const veraendert = original.slice(0, i) + ersatz + original.slice(i + 1);
    expect(veraendert).not.toBe(original);
    expect(() => JSON.parse(veraendert)).not.toThrow();

    async function laden(inhalt, passwort) {
      const c = await browser.newContext();
      const s = await c.newPage();
      await H.generator.oeffnen(s, 'de');
      await H.generator.stammdaten(s, FIX.stammdaten);
      await s.evaluate(() => { document.querySelector('details.fs-vorhanden').open = true; });
      await s.setInputFiles('#pr-privkey', { name: 'schluessel.vdkey', mimeType: 'application/json', buffer: Buffer.from(inhalt, 'utf8') });
      await s.fill('#pr-privkey-pw', passwort);
      await s.click('#pr-privkey-laden');
      await expect(s.locator('#pr-privkey-status')).not.toHaveText('');
      const erg = { status: await s.locator('#pr-privkey-status').innerText(), imSpeicher: await s.evaluate(() => SCHLUESSEL_TRESOR.vorhanden()) };
      await c.close();
      return erg;
    }

    const manipuliert = await laden(veraendert, H.SCHLUESSEL_PASSWORT_E2E);
    expect(manipuliert.imSpeicher, 'geändertes Zeichen: kein Schlüssel im Speicher').toBe(false);
    expect(manipuliert.status).not.toMatch(/geladen/);

    const falschesPasswort = await laden(original, H.SCHLUESSEL_PASSWORT_E2E + 'x');
    expect(falschesPasswort.imSpeicher, 'falsches Passwort: kein Schlüssel im Speicher').toBe(false);
    expect(falschesPasswort.status).toMatch(/Passwort passt nicht|beschädigt/);

    const keinSchluessel = await laden(JSON.stringify({ format: 'vivodepot-generator-entwurf', version: 1, felder: [] }), H.SCHLUESSEL_PASSWORT_E2E);
    expect(keinSchluessel.imSpeicher, 'eine andere Datei: kein Schlüssel im Speicher').toBe(false);
    expect(keinSchluessel.status).not.toMatch(/geladen/);

    // Rot-Beweis: Der Weg selbst trägt. Die unveränderte Datei mit dem richtigen Passwort lädt.
    const echt = await laden(original, H.SCHLUESSEL_PASSWORT_E2E);
    expect(echt.imSpeicher, 'unveränderte Datei: Schlüssel im Speicher').toBe(true);
    expect(echt.status).toMatch(/geladen/);
  });

  test('P4b ein von Hand geänderter Entwurf öffnet ohne Schaden oder wird mit Meldung abgelehnt, nie halb; sein Inhalt bleibt Text', async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await zweiFelderAnlegen(p);
    const datei = await H.downloadNachTmp(p, tmp, () => p.click('#entwurf-sichern'));
    await ctx.close();
    const entwurf = JSON.parse(fs.readFileSync(datei, 'utf8'));

    const MARKUP = '<img src=x onerror="window.__entwurfSkriptLief=1"><script>window.__entwurfSkriptLief=1</script>';
    const faelle = [
      ['Markup im Feldnamen', (e) => { e.felder[0].feldname = MARKUP; }],
      ['Markup im Wortlaut', (e) => { e.wortlaut = MARKUP; }],
      ['Markup in den Angaben der Einrichtung', (e) => { e.anbieter = { anbieterName: MARKUP, adresse: { ort: MARKUP }, kontakt: { name: MARKUP } }; }],
      ['unbekannter Feldtyp', (e) => { e.felder[0].feldtyp = 'gibtEsNicht'; }],
      ['ein Feld ist kein Objekt', (e) => { e.felder[1] = 'kein Feld'; }],
      ['ein Feld ohne Namen und Typ', (e) => { e.felder[1] = {}; }],
      ['unbekannte Schlüssel auf oberster Ebene', (e) => { e.__proto__zusatz = { a: 1 }; e.constructor_zusatz = 'x'; }],
    ];
    for (const [name, aendern] of faelle) {
      const kopie = JSON.parse(JSON.stringify(entwurf));
      aendern(kopie);
      const c = await browser.newContext();
      const s = await c.newPage();
      const fehler = [];
      s.on('pageerror', (e) => fehler.push(String(e && e.message || e)));
      await H.generator.oeffnen(s, 'de');
      await s.setInputFiles('#ent-datei', { name: 'entwurf.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(kopie), 'utf8') });
      // Entweder die Arbeitsfläche steht (geöffnet) oder die Meldung steht (abgelehnt). Nie beides, nie keines.
      await expect.poll(async () => (await s.locator('#fertig-oeffnen').isVisible()) || (await s.locator('#start-status').isVisible()), { message: name }).toBe(true);
      const geoeffnet = await s.locator('#fertig-oeffnen').isVisible();
      const abgelehnt = await s.locator('#start-status').isVisible();
      expect(geoeffnet !== abgelehnt, name + ': geöffnet und abgelehnt zugleich').toBe(true);
      if (abgelehnt) {
        await expect(s.locator('#start-status'), name).toContainText(ABGEWIESEN);
        await expect(s.locator('.vk'), name).toHaveCount(0);
      }
      // Nichts aus der Datei ist gelaufen, und kein Element aus der Datei steht im Dokument.
      expect(await s.evaluate(() => window.__entwurfSkriptLief), name + ': Skript aus der Datei lief').toBeUndefined();
      expect(await s.locator('img[src="x"]').count(), name + ': Markup aus der Datei im Dokument').toBe(0);
      expect(fehler, name + ': Fehler der Seite').toEqual([]);
      await c.close();
    }
  });

  // Die Fassung eines Entwurfs wird beim Öffnen gelesen. Ein Entwurf aus einem neueren Studio wäre sonst still mit dem geöffnet
  // worden, was dieses Studio davon versteht. Vor dem Fix im Studio war diese Probe rot: der Entwurf öffnete.
  test('P4c ein Entwurf aus einer neueren oder mit ungültiger Fassung wird mit einer Meldung abgelehnt, einer ohne Fassung öffnet weiter', async ({ browser }) => {
    const feld = { feldname: 'Feld aus der Zukunft', feldtyp: 'text', bereich: 'identity', pflicht: false };
    const oeffnen = async (entwurf) => {
      const c = await browser.newContext();
      const s = await c.newPage();
      await H.generator.oeffnen(s, 'de');
      await s.setInputFiles('#ent-datei', { name: 'entwurf.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(entwurf), 'utf8') });
      return { c, s };
    };
    for (const art of ['felder', 'blatt']) {
      const neuer = art === 'blatt'
        ? { format: 'vivodepot-generator-entwurf', version: 99, sprache: 'de', art: 'blatt', blatt: { situationen: [] }, felder: [], anbieter: null }
        : { format: 'vivodepot-generator-entwurf', version: 99, sprache: 'de', felder: [feld], anbieter: null };
      const { c, s } = await oeffnen(neuer);
      await expect(s.locator('#start-status'), art).toBeVisible();
      await expect(s.locator('#start-status'), art).toHaveClass(/fehler/);
      await expect(s.locator('#start-status'), art).toContainText(/neueren Fassung/);
      // Nichts übernommen: der Start steht noch, die Arbeitsfläche ist nicht offen, kein Feld im Zustand.
      await expect(s.locator('#start-leer'), art).toBeVisible();
      await expect(s.locator('#fertig-oeffnen'), art).toBeHidden();
      expect(await s.evaluate(() => STATE.felder.length), art).toBe(0);
      await c.close();
    }
    // Eine Angabe, die keine ganze Zahl ab 1 ist, wird ebenfalls abgelehnt: die Tür geht nach „zu“.
    for (const version of ['99', 0, 1.5, null, -1, true]) {
      const { c, s } = await oeffnen({ format: 'vivodepot-generator-entwurf', version, sprache: 'de', felder: [feld], anbieter: null });
      const name = 'Fassung ' + JSON.stringify(version);
      await expect(s.locator('#start-status'), name).toBeVisible();
      await expect(s.locator('#start-status'), name).toContainText(/Fassung ist ungültig/);
      await expect(s.locator('#fertig-oeffnen'), name).toBeHidden();
      expect(await s.evaluate(() => STATE.felder.length), name).toBe(0);
      await c.close();
    }
    // Gegenprobe: dieselbe Datei in der geltenden Fassung und eine ohne Angabe der Fassung öffnen.
    for (const version of [1, undefined]) {
      const alt = { format: 'vivodepot-generator-entwurf', sprache: 'de', felder: [feld], anbieter: null };
      if (version !== undefined) alt.version = version;
      const { c, s } = await oeffnen(alt);
      await expect(s.locator('.vk'), 'Fassung ' + version).toHaveCount(1);
      await expect(s.locator('#start-status'), 'Fassung ' + version).toBeHidden();
      await c.close();
    }
  });
});
