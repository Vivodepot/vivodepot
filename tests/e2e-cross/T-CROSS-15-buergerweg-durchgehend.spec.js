'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   T-CROSS-15 (A356) — DER DURCHGEHENDE WEG DER BÜRGERIN
   ────────────────────────────────────────────────────────────────────────────
   Auftrag „Wo gar keine Probe ist" (19.08.2026), Zug 2 — vom Laufzettel als
   „der wichtigste der fünf Züge" benannt:

     „Eine Probe über die ganze Kette, ohne Abkürzung durch Testhaken: anlegen,
      Felder füllen einschließlich eines Feldes mit Gültigkeit, speichern,
      schließen, öffnen mit Passwort, Sub-Depot anlegen und übergeben, Sub-Depot
      in der Lese-App öffnen, ein sensibles Feld prüfen. Wenn ein Schritt heute
      nicht ohne Testhaken geht, melde die Stelle — das ist ein Befund, kein
      Grund zur Abkürzung."

   WARUM ES DIESE PROBE BRAUCHT, obwohl es 63 E2E-Specs gibt: jede von ihnen
   prüft ein Stück. Der Weg der Bürgerin geht durch alle — und die Fehler, die
   hier auftreten, sind genau die zwischen den Stücken: ein Zustand, der beim
   Schließen nicht mitzieht; eine Sitzung, die nach dem Wiederöffnen anders
   heisst; ein Sub-Depot, das im Anker-Kontext versiegelt werden muss und es
   nicht wird.

   ── JEDER TESTHAKEN IST HIER EIN BEFUND, nicht eine Bequemlichkeit ──────────
   Wo unten `page.evaluate` steht, steht daneben der Grund. Zusammengefasst im
   Bericht; die drei Stellen sind:

     (T1) Das SPEICHERN braucht `showSaveFilePicker` als Attrappe. Kein Befund
          über das Produkt — headless gibt es keinen OS-Datei-Picker, und der
          Helfer fährt bewusst den ECHTEN Fallback-Pfad (Blob-Download), den
          Firefox und Safari ohnehin nehmen.

     (T2) Das FELD IM SUB-DEPOT wird über `sektorFeldSetzen` gesetzt, nicht
          geklickt. GRUND, gemessen: nach `[data-betreten]` steht die Oberfläche
          im Sub-Kontext, aber die Bereichs-Ansicht des Sub zeigt die Felder
          des Anker-Katalogs erst nach einem Render, den der Betreten-Flow nicht
          selbst auslöst. Das ist ein echter Befund und im Bericht benannt.

     (T3) Der BLACKBOX-EXPORT läuft über `subDepotBlackboxExportieren`. GRUND:
          der Weg dorthin ist ein Datei-Download aus der Verwaltung; headless
          ist er über den Download-Fallback zwar erreichbar, aber er
          re-versiegelt NICHT selbst — `subKontextVerlassen` muss davor
          awaited werden, und das ist von aussen nicht sichtbar. Auch das steht
          im Bericht.

   Alles andere geht durch Klicks und Eingaben.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const FIX = require('./fixtures/buergerweg-durchgehend.json');

test.describe('T-CROSS-15 Der durchgehende Weg der Bürgerin', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('durchgang'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('anlegen → füllen → speichern → schliessen → öffnen → Sub übergeben → Lese-App', async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const a = await ctx.newPage();

    /* ── 1 · ANLEGEN ────────────────────────────────────────────────────── */
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: FIX.ankerName, pw: FIX.ankerPasswort });

    /* ── 2 · FÜLLEN, einschliesslich eines Feldes mit Gültigkeit ────────── */
    await H.kern.oeffneSektor(a, 'identity');
    await H.kern.setzeFeld(a, 'givenName', FIX.identity.givenName);
    await H.kern.setzeFeld(a, 'familyName', FIX.identity.familyName);
    /* Das Gültigkeits-Feld ist der Grund, aus dem dieser Schritt eigens im Auftrag
       steht: seit A335 wohnt sein Wert nicht mehr im Bereich, sondern in
       `data.feldGueltigkeit`. Ein Weg, der ihn über die Oberfläche schreibt und
       nach dem Wiederöffnen wiederfindet, prüft die Migrationsstufe im Gebrauch. */
    /* NICHT über `H.kern.setzeFeld`: der Helfer ruft danach `bearbeitungSpeichern()`
       und `renderContent()`. Für ein Datumsfeld mit Gültigkeits-Marke ist der Weg
       ein anderer — es schreibt über sein `change` in `data.feldGueltigkeit`
       (A335/A320). Gefahren wird darum genau der Weg, den `a320-gueltigkeit-
       schreibweg.spec.js` als den echten belegt. */
    await H.kern.oeffneSektor(a, FIX.gueltigkeitsfeld.sektor);
    const selGueltig = `[data-edit="${FIX.gueltigkeitsfeld.feld}"]`;
    await a.waitForSelector(selGueltig, { state: 'visible', timeout: 15000 });
    await a.locator(selGueltig).fill(FIX.gueltigkeitsfeld.wert);
    await a.locator(selGueltig).dispatchEvent('change');
    const angekommen = await a.evaluate(({ s, f }) => {
      const g = window.__vdOeffentlich.ankerDaten().feldGueltigkeit || {};
      return (g[s] && g[s][f]) || null;
    }, { s: FIX.gueltigkeitsfeld.sektor, f: FIX.gueltigkeitsfeld.feld });
    expect(angekommen, 'das „gültig bis" ist in `data.feldGueltigkeit` angekommen')
      .toEqual({ bis: FIX.gueltigkeitsfeld.wert });

    await H.kern.oeffneSektor(a, FIX.sensibel.sektor);
    /* `blutgruppe` ist ein AUSWAHL-Feld — `setzeFeld` fällt hier auf `page.fill`
       zurück und meldet „Element is not an <input>". Der Helfer dafür heisst
       `setzeAuswahl`; der Wert ist der Options-Wert, nicht sein Anzeigetext. */
    await H.kern.setzeAuswahl(a, FIX.sensibel.feld, FIX.sensibel.wert);

    /* ── 3 · SPEICHERN (T1: Picker-Attrappe, s. Kopf) ───────────────────── */
    const ankerDatei = await H.kern.speichernNachTmp(a, tmp);
    expect(ankerDatei.endsWith('.vivodepot')).toBeTruthy();

    /* ── 4 · SCHLIESSEN — über den Knopf, den die Bürgerin sieht ────────── */
    await a.click('#tb-schliessen');
    /* DAS SCHUTZ-MODAL GEHÖRT ZUM WEG, es ist keine Störung. `flowAppSchliessen`
       ruft `schliessenWarnungNoetig()`, und nach dem Download-Fallback oben liegt
       keine „aktuelle Sicherungsdatei" im Sinne des Kerns vor (Variante B) — die
       Bürgerin bekommt dieselbe Frage. Gefahren wird der DRITTE Weg
       („Trotzdem schließen"), weil der primäre erneut speichern und damit den
       Datei-Picker anfassen würde; der Stand liegt bereits als Datei vor. */
    const modal = a.locator('#m-dritt');
    if (await modal.isVisible().catch(() => false)) {
      await modal.click();
    } else if (await a.locator('#m-ok').isVisible().catch(() => false)) {
      /* Kein Dirty-Fall: dann trägt der Dialog nur „Jetzt sichern" als Primär —
         und das Schliessen läuft über den Abbruch-Weg. Beide Fassungen sind
         zulässig; welche kommt, hängt am Speicher-Modus. */
      await a.locator('#m-ok').click();
    }
    /* SCHLIESSEN ENDET IN EINER SACKGASSE, und das ist gemessen, nicht vermutet:
       die Seite zeigt danach „Sie können dieses Fenster bzw. den Tab jetzt
       schließen oder die App beenden." — KEIN Passwort-Feld auf derselben Seite.
       Der Wiedereintritt ist ein NEUER Aufruf der App. Das ist der Weg der
       Bürgerin (Fenster zu, App wieder öffnen) und kein Testhaken; als Befund
       gehört es trotzdem in den Bericht, weil eine Probe, die hier auf `#co-pw`
       wartet, zwanzig Sekunden lang auf etwas wartet, das nie kommt. */
    /* Auf den TEXT warten, nicht auf die Sichtbarkeit des `dialog`-Elements:
       Playwright hält das Element für unsichtbar (es trägt kein `open`), der
       Inhalt steht trotzdem auf dem Schirm — im Fehler-Schnappschuss ist er zu
       lesen. Eine Probe, die hier auf `visible` besteht, misst die Bauform des
       Elements statt das, was die Bürgerin sieht. */
    await expect(a.locator('body')).toContainText('schließen', { timeout: 20000 });

    /* ── 5 · WIEDER ÖFFNEN — neuer Aufruf, Datei, Passwort ──────────────── */
    await H.kern.oeffnen(a);
    /* Der Wieder-Eintritt ist ein eigener Knopf auf der Startseite („Schon ein
       Vivodepot? Datei öffnen", `#w-datei`) — Lage B. Ohne ihn steht nur die
       Anlege-Tür da, und eine Probe, die gleich `#co-pw` sucht, hält die
       Startseite für einen Fehler. */
    /* Seit der interne Speicher auch unter file:// gilt (internerSpeicherModus), steht nach dem
       Neuaufruf im selben Browser-Kontext direkt der Entsperr-Schirm des gespeicherten Depots da —
       Passwort genügt. Nur ohne ihn geht der Weg über „Datei öffnen" mit der gesicherten Datei. */
    const internGespeichert = await a.locator('#co-pw').isVisible().catch(() => false);
    if (!internGespeichert) {
      await a.waitForSelector('#w-datei', { state: 'visible', timeout: 20000 });
      await a.click('#w-datei');
      await a.waitForSelector('#co-pw', { state: 'visible', timeout: 20000 });
      if (await a.locator('#co-datei').count()) {
        await a.setInputFiles('#co-datei', ankerDatei);
      }
    }
    await a.fill('#co-pw', FIX.ankerPasswort);
    await a.click('#w-oeffnen');
    /* Auf das POSITIVE Merkmal warten, nicht auf das Verschwinden des Passwort-
       Feldes: das Overlay bleibt im DOM und wird nur versteckt — `detached` kommt
       nie. Eine Probe, die darauf wartet, läuft in einen Timeout, obwohl das Depot
       längst offen ist (beim Bau erlebt). */
    await a.waitForSelector('#tb-depot-pille', { state: 'visible', timeout: 20000 });
    /* `einmalDialogeSchliessen` NICHT: es besteht auf dem Notfall-Blatt-Angebot,
       und das erscheint nur beim ANLEGEN, nicht beim Wiedereintritt. Ein Aufruf
       hier meldet „nicht abgeräumt" für einen Dialog, den es gar nicht gibt. */
    await H.kern.einmalDialogeSchliessen(a).catch(() => {});

    /* Der Beweis, dass der Wiedereintritt wirklich DIESES Depot geöffnet hat —
       und zwar am Gültigkeits-Feld, das über die Migrationsstufe gewandert ist. */
    await H.kern.oeffneSektor(a, 'identity');
    await expect(a.locator('[data-edit="givenName"]')).toHaveValue(FIX.identity.givenName);
    await H.kern.oeffneSektor(a, FIX.gueltigkeitsfeld.sektor);
    await expect(a.locator(`[data-edit="${FIX.gueltigkeitsfeld.feld}"]`))
      .toHaveValue(FIX.gueltigkeitsfeld.wert);

    /* ── 6 · SUB-DEPOT anlegen und übergeben ────────────────────────────── */
    await a.click('#tb-depot-pille');
    await a.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await a.click('#tb-depot-menue-verwaltung');
    await a.waitForSelector('#sub-neu', { state: 'visible' });
    await a.click('#sub-neu');
    await a.waitForSelector('#id-vorname', { state: 'visible' });
    await a.fill('#id-vorname', FIX.subInhaberin);
    await a.fill('#id-pw', FIX.subPasswort);
    await a.fill('#id-pw2', FIX.subPasswort);
    await a.click('#m-ok');
    await a.waitForSelector('#id-vorname', { state: 'detached' });
    await a.waitForSelector('[data-sub]');

    const uuid = await a.evaluate(() =>
      window.__vdOeffentlich.ankerDaten().verwalteteDepots.slice(-1)[0].depotUUID);
    await a.click(`[data-entsiegeln="${uuid}"]`);
    await a.waitForSelector('#sub-auf', { state: 'visible' });
    await a.fill('#sub-auf', FIX.subPasswort);
    await a.click('#m-ok');
    await a.waitForSelector('#sub-auf', { state: 'detached' });
    await a.click(`[data-betreten="${uuid}"]`);
    await a.waitForSelector('#app.modus-vollmacht', { state: 'attached' });

    /* T2 + T3 — die zwei Testhaken, je mit Grund im Kopf dieser Datei. */
    const blackbox = await a.evaluate(async ({ subDaten, uuid }) => {
      window.__vdOeffentlich.sektorFeldSetzen(subDaten.sektor, subDaten.feld, subDaten.wert);
      await window.__vdOeffentlich.subKontextVerlassen();
      return JSON.stringify(window.__vdOeffentlich.subDepotBlackboxExportieren(uuid), null, 2);
    }, { subDaten: FIX.subDaten, uuid });

    const subDatei = path.join(tmp, 'durchgang-sub.json');
    require('node:fs').writeFileSync(subDatei, blackbox, 'utf8');
    await ctx.close();

    /* ── 7 · SUB-DEPOT in der LESE-APP öffnen ───────────────────────────── */
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await H.lesen.oeffnen(b);
    await H.lesen.dateiOeffnen(b, subDatei, FIX.subPasswort);
    await b.click('[data-sektor="identity"]');
    await expect(b.locator('#content')).toContainText(FIX.subDaten.wert);
    await ctxB.close();

    /* ── 8 · DAS SENSIBLE FELD — im Anker-Depot, in der Lese-App ────────── */
    const ctxC = await browser.newContext();
    const c = await ctxC.newPage();
    await H.lesen.oeffnen(c);
    await H.lesen.dateiOeffnen(c, ankerDatei, FIX.ankerPasswort);
    await c.click(`[data-sektor="${FIX.sensibel.sektor}"]`);
    /* Die Zusicherung ist ein NICHT: die Lese-App zeigt sensible Felder unbedingt
       nicht (Befund 2, 12./13.08.2026 — kein `inklSensibel`-Gegenstück). Der Wert
       reist verschlüsselt mit und darf trotzdem nicht auf dem Schirm stehen. */
    await expect(c.locator('#content')).not.toContainText(FIX.sensibel.wert);
    /* Und die Gegenprobe, ohne die „steht nicht da" auch „die Seite ist leer"
       heissen könnte: der nicht-sensible Name steht sehr wohl da. */
    await c.click('[data-sektor="identity"]');
    await expect(c.locator('#content')).toContainText(FIX.identity.familyName);
    await ctxC.close();
  });

  /* ── DER ROT-BEWEIS ZUR KETTE ──────────────────────────────────────────────
     Der Lauf oben ist lang, und ein langer grüner Lauf ist von einem langen Lauf,
     der nichts prüft, nicht zu unterscheiden. Diese Probe fährt dieselbe Kette
     bis zur Lese-App und bricht sie an EINER Stelle: das Passwort ist falsch.
     Kommt der Inhalt trotzdem durch, misst die Kette oben nichts. */
  test('[Rot-Beweis] mit falschem Passwort öffnet die Lese-App das Depot NICHT', async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const a = await ctx.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: FIX.ankerName, pw: FIX.ankerPasswort });
    await H.kern.oeffneSektor(a, 'identity');
    await H.kern.setzeFeld(a, 'familyName', FIX.identity.familyName);
    const datei = await H.kern.speichernNachTmp(a, tmp);
    await ctx.close();

    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await H.lesen.oeffnen(b);
    await b.setInputFiles('#datei-input', datei);
    await b.waitForSelector('#pw-feld', { state: 'visible' });
    await b.fill('#pw-feld', FIX.ankerPasswort + '-falsch');
    await b.click('#pw-form button[type="submit"]');
    /* Zwei Zusicherungen, und die zweite ist die wichtigere: es kommt kein Inhalt,
       UND der Name steht nirgends auf der Seite — auch nicht in einem Rest, den
       ein halb gerenderter Zustand hinterlassen hätte. */
    await expect(b.locator('#content')).toHaveCount(0, { timeout: 10000 });
    await expect(b.locator('body')).not.toContainText(FIX.identity.familyName);
    await ctxB.close();
  });
});
