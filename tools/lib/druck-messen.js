'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Erhebungsregel für den Druck-Zustand — B6/B7b (30.07.2026, Testsuite-CC)
   ────────────────────────────────────────────────────────────────────────────
   WOZU SIE DA IST. Ebene 14 der Kampagne (`tools/kampagne.js`) mass bis zum
   27.07. `#content *` unter `emulateMedia('print')` und fand dort nichts —
   nicht, weil im Druck-Zustand nichts fehlt, sondern weil `#content` GENAU DIE
   Fläche ist, die das Print-CSS ausblendet (`vivodepot.html:1420`,
   `body > *:not(#pv-dok-overlay):not(#notfallblatt-overlay) { display: none
   !important; }`). Die druckbaren Ansichten sind die zwei Overlays, nicht der
   Bildschirm-Inhalt.

   Dieselbe Trennung wie bei `trefferflaechen.js`: die Erhebung steht EINMAL,
   damit die Kampagnen-Ebene und ihre rotmachbare Probe (hier:
   `tests/mit-modul/druck-zustand-erhebungsregel.test.js`) dieselbe Regel
   tragen, nicht zwei wortgleiche Kopien mit getrennten Fehlern.

   ── GEFÜLLT, NICHT LEER — was das heisst ─────────────────────────────────
   Ein druckbares Dokument hat immer Kopf, Fuss und Unterschriftzeile — auch
   wenn kein einziges Feld beantwortet ist (die Eingangsformel und die feste
   Schlussklausel stehen unbedingt). Ein Overlay, das NUR das trägt, ist am
   Papier funktionslos: die Bürgerin druckt eine Vorlage ohne ihre eigenen
   Angaben. Darum reicht `sichtbar > 0` nicht — die Erhebung zählt zusätzlich
   die gefüllten `.pv-dok-abschnitt`-Blöcke und die Textlänge im Overlay.

   ── WAS „BREITER ALS DIE SEITE" HEISST ────────────────────────────────────
   Das Print-CSS nimmt `.pv-dok-blatt` bewusst die Bildschirm-`max-width`
   (Zeile 1423): am Papier gibt die physische Seite den Rand vor, nicht die
   App. Der Vergleich ist NUR an einem Viewport fair, der die Papierbreite
   simuliert (A4 bei 96 dpi = 794 px) — an einem Bildschirm-Viewport meldet
   jedes Element „zu breit", ohne dass am Papier ein Fehler wäre (gemessen
   30.07.: 15 falsche Funde bei Viewport 1200 px, 0 bei 794 px, exakt dieselbe
   Ausgabe). Die Seitenbreite ist darum ein Argument, keine Annahme im Code.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── DIESE FUNKTION LÄUFT IM BROWSER (page.evaluate) ─────────────────────────
   Kein Zugriff auf den Gültigkeitsbereich dieser Datei — alles kommt als
   Argument. `wurzelId` ist das Overlay-Element, `seitenbreite` die Schwelle in
   CSS-Pixeln, unter der ein Element als „passt auf die Seite" gilt. */
function messeDruckInhalt({ wurzelId, seitenbreite }) {
  const sichtbar = (e) => {
    const c = getComputedStyle(e), b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0;
  };
  /* Benennt Tag + erste Klasse + id — nur der Tag allein unterscheidet in einem Dokument mit
     Dutzenden `<div>`/`<p>` keinen Fund vom nächsten (rotmachbar geprüft: ohne die Klasse hiessen
     ein absichtlich zu breites und ein normales Element im Fund identisch „div"). */
  const benennen = (e) => {
    const erste = String(e.className || '').trim().split(/\s+/).filter(Boolean)[0];
    return e.tagName.toLowerCase() + (erste ? '.' + erste : '') + (e.id ? '#' + e.id : '');
  };
  const root = document.getElementById(wurzelId);
  if (!root) return { vorhanden: false };
  const el = [...root.querySelectorAll('*')].filter(sichtbar);
  const abschnitte = [...root.querySelectorAll('.pv-dok-abschnitt')].filter(sichtbar);
  const breiter = [], abgeschnitten = [];
  for (const e of el) {
    const b = e.getBoundingClientRect();
    if (b.width > seitenbreite) breiter.push({ sel: benennen(e), w: Math.round(b.width) });
    const c = getComputedStyle(e);
    if (c.overflow === 'hidden' && e.scrollHeight > e.clientHeight + 2 && e.textContent.trim())
      abgeschnitten.push({ sel: benennen(e), text: e.textContent.trim().slice(0, 30) });
  }
  /* `innerText`, NICHT `textContent`: textContent liest auch `display:none`-Nachfahren mit — ein
     verdeckter Abschnitt könnte die Textlängen-Schwelle allein tragen, ohne dass am Papier je ein
     Zeichen davon ankäme. Rotmachbar geprüft (Probe „ein unsichtbarer Abschnitt zählt NICHT mit"). */
  return {
    vorhanden: true,
    sichtbar: el.length,
    abschnitte: abschnitte.length,
    textLaenge: (root.innerText || '').replace(/\s+/g, ' ').trim().length,
    breiter, abgeschnitten,
  };
}

/* Schwellen der GEFÜLLT-Bewertung — an einer Stelle, damit Kampagne und Probe
   dieselbe Grenze ziehen. Kein Sollwert für den Inhalt, nur die Grube „nur
   Kopf/Fuss/Unterschriftzeile sieht aus wie ein Dokument, ist aber leer". */
const MINDEST_ABSCHNITTE = 2;
const MINDEST_TEXTLAENGE = 200;

module.exports = { messeDruckInhalt, MINDEST_ABSCHNITTE, MINDEST_TEXTLAENGE };
