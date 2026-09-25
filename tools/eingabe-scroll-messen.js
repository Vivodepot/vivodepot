#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   eingabe-scroll-messen.js — misst, ob eine Eingabe-Interaktion den #content-
   Scroll verschiebt ("Eingabe springt nach oben", Auftrag „Kern: Eingabe
   springt, Sub-Depot-Farbe, PDF-CI", 13.09.2026, Befund 1)
   ────────────────────────────────────────────────────────────────────────────
   STICHPROBE statt Vollerhebung (Freigabe, Suiten sparen): je EIN
   Feld pro Feldtyp (text, datum, auswahl, ref, Listen-Unterfeld, Sub-Depot-
   Feld), nicht jedes Feld aller Bereiche/Sektoren.

   METHODIK-FALLE, selbst gemessen (nicht angenommen): Playwrights eigener
   `.click()` scrollt ein Ziel-Element VOR dem Klick automatisch in den
   sichtbaren Bereich ("scrollIntoViewIfNeeded"). Wer VOR dem eigentlichen
   Klick künstlich eine Scroll-Position setzt und NACHHER vergleicht, misst
   Playwrights eigenen Auto-Scroll, nicht die App. Darum misst diese Datei
   das Fenster ERST NACH dem Klick/Fokussieren (`vor`-Callback, siehe unten)
   — beide Messpunkte liegen dann jenseits von Playwrights Klick-Scroll,
   und ein Delta ist ausschließlich der App zurechenbar.

   Kein `new Function`/`eval` — nutzt `page.evaluate()` mit serialisierbaren
   Argumenten, dieselbe Bauart wie tests/e2e/helpers.js.
   ════════════════════════════════════════════════════════════════════════════ */

const SETTLE_VOR_MS = 150;
const SETTLE_NACH_MS = 300;

async function contentScrollTop(page) {
  return page.evaluate(() => {
    const c = document.getElementById('content');
    return c ? c.scrollTop : null;
  });
}

/* Misst den Scroll-Sprung EINER Interaktion.
   { vor: async(page)=>{...}, aktion: async(page)=>{...} }
   `vor` bringt das Feld in einen editierbaren Zustand (Sektor öffnen, Feld anklicken/fokussieren,
   Modal öffnen) — HIER darf Playwright noch scrollen, das zählt nicht mit. `aktion` ist die
   eigentliche Eingabe-Interaktion (Wert setzen + blur/change, oder Modal-Speichern-Klick) — NUR
   deren Effekt auf den Scroll wird gemessen. */
async function scrollSprungMessen(page, { vor, aktion }) {
  await vor(page);
  await page.waitForTimeout(SETTLE_VOR_MS);
  const vorWert = await contentScrollTop(page);
  await aktion(page);
  await page.waitForTimeout(SETTLE_NACH_MS);
  const nachWert = await contentScrollTop(page);
  return { vor: vorWert, nach: nachWert, delta: (nachWert == null || vorWert == null) ? null : (nachWert - vorWert) };
}

module.exports = { scrollSprungMessen, contentScrollTop, SETTLE_VOR_MS, SETTLE_NACH_MS };
