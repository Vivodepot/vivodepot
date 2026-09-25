'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S11 (Auftrag „Das Stick-Versprechen halten", 09.08.2026) — Browser-Abnahme,
   Auflage U2-ADR-125 (Browser-Abnahme für alles am Speicher- und Statusweg).

   Der Fall, den es so noch nicht gibt: das gemerkte Dateiziel verschwindet
   ZWISCHEN zwei Sicherungen (Stick gezogen, Berechtigung nach längerer
   Sitzung entzogen). Node-Tests (tests/s11-zielwechsel-sichtbar.test.js)
   belegen die Logik bereits synchron gegen den Kern; dieser Spec belegt sie
   über einen ECHTEN Klick auf #tb-save-knopf im interner-Speicher-Modus
   (http://) — dort liegen VOR dem Dateischreiben bereits mehrere awaits
   (depotInIdbSichern), also genau die Stelle, an der eine Nutzer-Aktivierung
   am ehesten verbraucht sein könnte, bevor `requestPermission` sie noch
   braucht. Läuft die Erholung/Ansage hier durch, trägt sie erst recht im
   einfacheren file://-Fall (weniger awaits davor).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld, starteLokalenServer } = require('./helpers');

// Die erste bewusste Datei-Sicherung (über #tb-save-knopf, nicht der Anlege-Weg) zeigt einmalig
// den Wiedereinstieg-Hinweis (helpers.js' einmalDialogeSchliessen ist auf die Anlege-Sequenz
// zugeschnitten — dort wartet sie auf das Notfall-Blatt-Angebot, das HIER nie kommt, und würde
// nach 10 s ergebnislos werfen). Ein schlanker, gezielter Dismiss genügt.
async function wiedereinstiegHinweisSchliessenFallsDa(page) {
  if (await page.locator('#wiedereinstieg-hinweis').isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.click('#m-ok');
    await page.locator('#wiedereinstieg-hinweis').waitFor({ state: 'hidden' });
  }
}

const PW = 's11-e2e-passwort-741';

// Ein Handle mit einer echten Permissions-Oberfläche (queryPermission/requestPermission), dessen
// Berechtigungsstand von AUSSEN (window.__s11Zustand) umgeschaltet werden kann — simuliert den
// Stick, der zwischen zwei Sicherungen verschwindet, ohne dass Playwright eine echte OS-Freigabe
// bedienen könnte (das kann kein Testwerkzeug).
async function fsaAttrappeMitBerechtigungEinrichten(page) {
  await page.evaluate(() => {
    window.__s11Zustand = { berechtigung: 'granted', requestAntwort: 'granted', requestAufrufe: 0 };
    window.__s11Bytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 's11-e2e-test.vivodepot',
        queryPermission: async () => window.__s11Zustand.berechtigung,
        requestPermission: async () => {
          window.__s11Zustand.requestAufrufe++;
          window.__s11Zustand.berechtigung = window.__s11Zustand.requestAntwort;
          return window.__s11Zustand.berechtigung;
        },
        createWritable: async () => {
          if (window.__s11Zustand.berechtigung !== 'granted') {
            const e = new DOMException('simuliert', 'NotAllowedError');
            throw e;
          }
          return {
            write: async (chunk) => { window.__s11Bytes = (typeof chunk === 'string') ? chunk : await chunk.text(); },
            close: async () => {},
          };
        },
      }),
    });
  });
}

// U2-ADR-212 (02.09.2026, nach diesem Test entstanden) hatte den Regelfall-Klick im internen
// Modus zuerst INTERN falten lassen (kein Datei-Weg, keine FSA-Berührung) — dieser Spec brauchte
// darum zwei Klicks, um den Datei-Weg samt Berechtigungs-Kette überhaupt zu erreichen.
// Speicher-Modell (03.09.2026, Stück 3) drehte die Falt-Entscheidung kurzzeitig zurück
// (saveKnopfDateiWeg() konstant true) — U2-ADR-237-Nachzug (04.09.2026): SELBIGER Abend nahm das
// wieder zurück (saveKnopfDateiWeg() wieder !internerSpeicherModus()), UND #tb-save-knopf ist im
// internen Modus jetzt dauerhaft hidden (jede Änderung sichert still, der Knopf hat dort nichts
// mehr zu tun). Der bewusste Datei-Weg läuft seither über den dritten Menüpunkt „Sicherungskopie
// erstellen" im Depot-Pillen-Menü — derselbe direkte depotInDateiSichern()-Aufruf, den dieser Test
// von Anfang an belegen wollte, nur über eine andere echte Nutzer-Geste erreicht.
async function eintragenUndSpeichern(page, wert) {
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'streetAddress', wert);
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue', { state: 'visible' });
  await page.click('#tb-depot-menue-sicherungskopie');
  await page.waitForTimeout(400);
}

test('[S11·http://] echte Nutzergeste: Berechtigung verloren → Ansage-Modal, Datei-Fallback, kein falsches "gespeichert"', async ({ page }) => {
  const srv = await starteLokalenServer();
  const port = srv.address().port;
  try {
    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await fsaAttrappeMitBerechtigungEinrichten(page);
    const modus = await page.evaluate(() => window.__vdOeffentlich.internerSpeicherModus());
    expect(modus, 'Vorbedingung: interner Speicher-Modus (die meisten awaits vor dem Datei-Schreiben)').toBe(true);

    await depotAnlegen(page, { pw: PW });
    await eintragenUndSpeichern(page, 'Erste Sicherung');   // Handle wird angelegt, schreibt erfolgreich
    await wiedereinstiegHinweisSchliessenFallsDa(page);
    await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/, { timeout: 5000 });
    const ersteBytes = await page.evaluate(() => window.__s11Bytes);
    expect(ersteBytes, 'Vorbedingung: die erste Sicherung hat wirklich geschrieben').toBeTruthy();

    // Der Stick verschwindet zwischen den beiden Sicherungen.
    await page.evaluate(() => { window.__s11Zustand.berechtigung = 'denied'; });
    await eintragenUndSpeichern(page, 'Zweite Sicherung nach Zielverlust');   // ECHTER Klick treibt die ganze Kette

    // Die Ansage muss sichtbar sein — ein Modal, kein Toast, der schon wieder weg wäre.
    const modalText = await page.evaluate(() => (document.getElementById('modal-inhalt') || {}).innerText || '');
    expect(modalText.length, 'die Bürgerin bekommt eine Ansage, kein stilles Nichts').toBeGreaterThan(0);
    expect(modalText).toMatch(/nicht mehr aktuell|nicht aktuell/i);

    // Status bleibt ehrlich: NICHT als aktuell gesichert markiert (die zweite Änderung blieb offen).
    await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-gespeichert/);
  } finally {
    srv.close();
  }
});

test('[S11·http://] Berechtigung "prompt" + echte Freigabe: stille Erholung, KEIN Ansage-Modal', async ({ page }) => {
  const srv = await starteLokalenServer();
  const port = srv.address().port;
  try {
    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await fsaAttrappeMitBerechtigungEinrichten(page);
    await depotAnlegen(page, { pw: PW });
    await eintragenUndSpeichern(page, 'Erste Sicherung');
    await wiedereinstiegHinweisSchliessenFallsDa(page);
    await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/, { timeout: 5000 });

    await page.evaluate(() => {
      window.__s11Zustand.berechtigung = 'prompt';       // erneute Bestätigung fällig (z. B. lange Sitzung)
      window.__s11Zustand.requestAntwort = 'granted';     // Bürgerin bestätigt am OS-Dialog
    });
    await eintragenUndSpeichern(page, 'Zweite Sicherung mit Nachfrage');

    const requestAufrufe = await page.evaluate(() => window.__s11Zustand.requestAufrufe);
    expect(requestAufrufe, 'requestPermission wurde aus der echten Klick-Geste heraus erreicht').toBe(1);
    await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/, { timeout: 5000 });
    const modalText = await page.evaluate(() => (document.getElementById('modal-inhalt') || {}).innerText || '');
    expect(modalText.trim(), 'eine stille Erholung braucht keine Ansage').toBe('');
  } finally {
    srv.close();
  }
});
