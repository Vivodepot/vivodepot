'use strict';
/* Injizierter Mauszeiger für stumme Demo-Aufnahmen (Auftrag 04.08.2026, Abschnitt 4a).
   Playwright zeichnet den Systemcursor nicht auf; dieses Element lebt NUR im Testkontext
   (page.addInitScript), niemals in vivodepot.html. Folgt echten `mousemove`-Ereignissen,
   die page.mouse.move() auslöst — kein Overlay-Trick, echte Browser-Events. */

async function zeigerEinfuegen(page) {
  await page.addInitScript(() => {
    const einsetzen = () => {
      if (document.getElementById('__demo-zeiger')) return;
      // Echte Pfeilform (SVG-Polygon), Hotspot = Spitze oben-links = genau die Mausposition —
      // wie ein echter OS-Cursor. Ein gefüllter Kreis hätte den Zielpunkt selbst zugedeckt
      // (gemessen: Glukosewert im Frame unlesbar, weil die Zeigerscheibe genau auf der Zahl lag).
      const z = document.createElement('div');
      z.id = '__demo-zeiger';
      z.style.cssText =
        'position:fixed;top:0;left:0;width:22px;height:26px;z-index:2147483647;pointer-events:none;';
      z.innerHTML =
        '<svg width="22" height="26" viewBox="0 0 22 26" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M1,1 L1,20 L6.5,15.8 L10,23.5 L13.2,22.1 L9.7,14.6 L16.5,14.2 Z" ' +
        'fill="rgba(196,58,58,.92)" stroke="white" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(z);
      window.addEventListener('mousemove', (e) => {
        z.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      });
      window.addEventListener('mousedown', () => { z.style.transform += ' scale(1.35)'; });
      window.addEventListener('mouseup', () => {
        z.style.transform = z.style.transform.replace(' scale(1.35)', '');
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', einsetzen);
    else einsetzen();
  });
}

// Bewegung IMMER mit steps — ohne steps springt der Zeiger (sieht im Video wie Schnittfehler aus).
async function bewegeZu(page, x, y, steps = 25) {
  await page.mouse.move(x, y, { steps });
}

async function mitteVon(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('mitteVon: Element hat kein boundingBox (nicht sichtbar?)');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Sichtbarer Klick: erst hinbewegen (echtes mousemove, Zeiger folgt), dann klicken.
// NICHT locator.click() allein verwenden — das teleportiert ohne Bewegung.
async function klickSichtbar(page, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded();
  const { x, y } = await mitteVon(locator);
  await bewegeZu(page, x, y, opts.steps);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
}

// Zeiger NEBEN einem Element stehen lassen (z. B. Glukosewert), optional mit Umriss-Hervorhebung.
// Bewusst NICHT die Mitte des Elements — ein Zeiger genau auf dem Text deckt ihn zu (gemessen:
// Frame zeigte den Kreis statt „135 mg/dl"). Ruht knapp unten-links, der Umriss übernimmt das
// eigentliche Zeigen; das ist auch, wie ein echter Mauszeiger neben Text ruht, nicht darauf.
async function stehenLassen(page, locator, sekunden, opts = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('stehenLassen: kein boundingBox (nicht sichtbar?)');
  const x = box.x - 6;
  const y = box.y + box.height + 6;
  await bewegeZu(page, x, y);
  if (opts.hervorheben) {
    await locator.evaluate((el) => { el.style.outline = '3px solid #c4a558'; el.style.outlineOffset = '2px'; });
  }
  await page.waitForTimeout(sekunden * 1000);
  if (opts.hervorheben) {
    await locator.evaluate((el) => { el.style.outline = ''; el.style.outlineOffset = ''; });
  }
}

module.exports = { zeigerEinfuegen, bewegeZu, mitteVon, klickSichtbar, stehenLassen };
