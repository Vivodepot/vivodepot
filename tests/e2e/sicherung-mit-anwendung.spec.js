'use strict';
/* Die Anwendung reist mit der Sicherung (11.10.2026, Befund SICHERUNG-OHNE-ANWENDUNG)
   Eine Sicherungskopie ist heute nur die .vivodepot-Datei. Nirgends ist zugesagt oder gebaut, dass Anwendung und Lese-App
   neben der Sicherung oder auf dem Stick liegen. Wer die Datei in vielen Jahren findet, braucht auch das Programm dazu.

   Diese Probe ist die ERWARTETE RÖTE des Befunds (`test.fixme`, Kennung im Register der ausgesetzten Browser-Proben).
   Vertrag, den der Bau erfüllt:
     · `stickOrdnerBauen(ziel, produkt)` in tools/stick-ausgabe-backen.js legt die Anwendung UND die Lese-App in den Ordner;
     · beide laufen von `file://` ohne eine einzige Netzanfrage;
     · die mitgelegte Lese-App öffnet die Sicherung, die die Anwendung aus demselben Ordner eben geschrieben hat.
   Der Stick wird nachgestellt wie in stick-schliessen-raeumt-browser-kopie.spec.js: ein eigener Ordner, Aufruf über `file://`. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const stick = require('../../tools/stick-ausgabe-backen.js');

// FIXME-ID: SICHERUNG-OHNE-ANWENDUNG
test.fixme('[Sicherung·mit Anwendung] der Stick-Ordner trägt Anwendung und Lese-App, und die Lese-App öffnet die Sicherung ohne Netz', async ({ page }) => {
  // Befund SICHERUNG-OHNE-ANWENDUNG (MITTEL; HOCH, sobald ein Stick ohne Lese-App ausgeliefert wird). Eigentümer: Kern-Strang.
  // Rückkehr: stickOrdnerBauen gebaut, Angebot „Anwendung dazulegen“ beim Sichern gebaut; dann `test.fixme` → `test`.
  expect(typeof stick.stickOrdnerBauen, 'das Werkzeug baut den ganzen Stick-Ordner, nicht nur eine Datei').toBe('function');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-ordner-'));
  try {
    stick.stickOrdnerBauen(ordner, 'privat-de');
    expect(fs.existsSync(path.join(ordner, 'vivodepot.html')), 'die Anwendung liegt im Ordner').toBe(true);
    expect(fs.existsSync(path.join(ordner, 'vivodepot-lesen.html')), 'die Lese-App liegt daneben').toBe(true);

    const netz = [];
    page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) netz.push(r.url()); });
    await page.goto('file://' + path.join(ordner, 'vivodepot-lesen.html'));
    await expect(page.locator('body')).toBeVisible();
    expect(netz, 'die Lese-App vom Stick stellt keine Netzanfrage').toEqual([]);
    // Mit dem Bau: Depot in der Anwendung anlegen, Sicherung in den Ordner schreiben, in der Lese-App öffnen, Inhalt lesen.
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
