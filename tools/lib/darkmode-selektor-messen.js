'use strict';
/* ════════════════════════════════════════════════════════════════════════
   darkmode-selektor-messen — Struktur-Vergleich, keine Zeilenzahl
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-350 (07.09.2026, Befund `e2`): die Nachtmodus-Über-
   steuerung (`html.dark-mode ...`) ist eine HANDGEPFLEGTE Selektorliste —
   jede Basisregel, die `color: var(--salbei-dunkel)` setzt, braucht eine
   passende `html.dark-mode`-Zeile, sonst bleibt der Text im Nachtmodus auf
   der eigenen, unveränderten Fläche (--salbei-dunkel kippt nachts NICHT,
   s. Kommentar an der Nachtliste selbst) und der Kontrast fällt auf
   ~2,16–2,71:1. Zweimal von Hand nachgezogen (28.07.2026, dann erneut beim
   Umbau von `.sektion h2`) — dieses Modul macht daraus eine Struktur-Probe:
   Schlüsselmenge (welche Selektoren), nicht Zeilenzahl.

   Extrahiert per einfachem State-Machine-Scan (keine `@media`-Sonderrolle
   nötig — Selektoren werden textuell erkannt, unabhängig von der
   Verschachtelungstiefe, in der ihre Regel steht). Kommentare werden vorher
   ausgeblendet (Zeichen ersetzt, Zeilenumbrüche bleiben – Zeilennummern
   bleiben dadurch exakt).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

function kommentareAusblenden(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function findeSchliessendeKlammer(css, openIdx) {
  let tiefe = 1;
  let i = openIdx + 1;
  while (i < css.length && tiefe > 0) {
    if (css[i] === '{') tiefe++;
    else if (css[i] === '}') tiefe--;
    i++;
  }
  return i - 1;
}

function regelnExtrahieren(css) {
  const regeln = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    const selectorText = css.slice(i, brace).trim();
    const closeBrace = findeSchliessendeKlammer(css, brace);
    const decls = css.slice(brace + 1, closeBrace);
    regeln.push({ selectorText, decls, declStartIdx: brace + 1 });
    i = closeBrace + 1;
  }
  return regeln;
}

/* Liest das <style>...</style> aus dem Kern und liefert:
   - benoetigt: Map<Selektor, Zeile> — Basisregeln mit `color: var(--salbei-dunkel)`
   - abgedeckt: Set<Selektor> — Selektoren, die unter `html.dark-mode` einen
     `color:`-Wert bekommen (ihr Praefix „html.dark-mode " ist entfernt) */
function messen(html) {
  /* Anker über die Kennung, nicht über die Position (Fund 18.09.2026, Rahmen-Schutz-Nachtrag):
     `<style` allein traf zuvor JEDES <style>-Element, auch ein zusätzliches, das vor dem
     eigentlichen Design-Stylesheet steht — ein Anker über die Reihenfolge hält nur, solange
     niemand etwas davorschreibt. `id="design-system"` ist die Kennung des EINEN Elements, das
     diese Funktion wirklich meint, unabhängig davon, wie viele andere <style>-Elemente im
     Dokument stehen oder in welcher Reihenfolge. */
  const MARKER = '<style id="design-system">';
  const markerAt = html.indexOf(MARKER);
  const styleStart = markerAt === -1 ? -1 : markerAt + MARKER.length;
  const styleEnd = styleStart === -1 ? -1 : html.indexOf('</style>', styleStart);
  if (styleStart === -1 || styleEnd === -1) {
    throw new Error('darkmode-selektor-messen: kein <style id="design-system">-Block gefunden — Anker veraltet?');
  }
  const cssRaw = html.slice(styleStart, styleEnd);
  const css = kommentareAusblenden(cssRaw);

  function zeileVon(idxInCss) {
    return html.slice(0, styleStart + idxInCss).split('\n').length;
  }

  const regeln = regelnExtrahieren(css);
  const benoetigt = new Map();
  const abgedeckt = new Set();

  for (const r of regeln) {
    const sel = r.selectorText;
    if (!sel || sel.startsWith('@') || sel === ':root') continue;
    const istDarkMode = /(^|,)\s*html\.dark-mode\b/.test(sel);
    const colorMatch = r.decls.match(/(?:^|;)\s*color\s*:\s*([^;]+);?/);
    if (!colorMatch) continue;
    const colorWert = colorMatch[1].trim();

    if (istDarkMode) {
      for (const einzel of sel.split(',')) {
        const bereinigt = einzel.trim().replace(/^html\.dark-mode\s+/, '').trim();
        if (bereinigt) abgedeckt.add(bereinigt);
      }
    } else if (colorWert === 'var(--salbei-dunkel)') {
      for (const einzel of sel.split(',')) {
        const bereinigt = einzel.trim();
        if (bereinigt && !benoetigt.has(bereinigt)) benoetigt.set(bereinigt, zeileVon(r.declStartIdx));
      }
    }
  }
  return { benoetigt, abgedeckt };
}

/* Lücken = benötigt, aber weder abgedeckt noch als Ausnahme benannt. */
function luecken(html, ausnahmen) {
  const ausnahmenSet = new Set(ausnahmen || []);
  const { benoetigt, abgedeckt } = messen(html);
  const raus = [];
  for (const [sel, zeile] of benoetigt) {
    if (!abgedeckt.has(sel) && !ausnahmenSet.has(sel)) raus.push({ sel, zeile });
  }
  return raus;
}

function messenAusDatei(pfad) {
  return messen(fs.readFileSync(pfad, 'utf8'));
}

module.exports = { messen, luecken, messenAusDatei };
