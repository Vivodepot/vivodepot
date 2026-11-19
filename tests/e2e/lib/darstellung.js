'use strict';
/* Darstellung schalten, wie die Person es tut: Zahnrad im Kopf, Schalter im Abschnitt „Barrierefreiheit“ der Einstellungen,
   Fenster schließen. (U-3 S.4a: die Knöpfe Nacht, Kontrast und Schrift stehen nicht mehr in der Kopfleiste.)
   art: 'nacht' | 'kontrast'. Klickt per Skript, damit überdeckte Flächen den Klick nicht abfangen. */
async function schalten(page, art) {
  await page.evaluate((a) => {
    const offen = !!document.getElementById('einst-' + a);
    if (!offen) { const z = document.getElementById('tb-einstellungen'); if (z) z.click(); }
    const schalter = document.getElementById('einst-' + a);
    if (!schalter) {
      // Vor dem Depot (Willkommen) gibt es keine Einstellungen: die Barrierefreiheit wird wie nach dem Schalter gesetzt, über die Klasse der Wurzel.
      document.documentElement.classList.toggle(a === 'nacht' ? 'dark-mode' : 'high-contrast');
      return;
    }
    schalter.click();
    if (!offen) { const ok = document.getElementById('m-ok'); if (ok) ok.click(); }
  }, art);
  await page.waitForTimeout(200);
}
module.exports = { schalten };
