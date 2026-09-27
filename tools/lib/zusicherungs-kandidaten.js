'use strict';
/* Findet Kern-Funktionen, die einen Satz über einen ZUSTAND bauen oder lesen und NICHT in
   ZUSTAND_FUNKTIONEN_KERN stehen (ZS2-Restrisiko, 19.09.2026).

   Warum: die Kern-Sperrliste (ZUSICHERUNGS_SCHLUESSEL_KERN) wird nur aus den Funktionen erhoben,
   die im Anker stehen. Ein Satzbauer, der dort fehlt, fällt nicht auf — kein Test sieht ihn.

   Zwei Arten von Fund, beide je Funktion:
     · `lieferant`: die Funktion liest einen Schlüssel mit Zustands-Vokabular (Geprüft, Abgelaufen,
       Widerruf, Herkunft, Signatur, …), der NICHT in der Sperrliste steht.
     · `mitleser`: die Funktion liest einen Schlüssel, der schon in der Sperrliste steht, ist aber
       selbst nicht im Anker (ein zweiter Ort, an dem derselbe Satz verwendet wird). Nur zur Auskunft:
       der Schlüssel ist gesperrt, die Verwendung ist erlaubt — ein Fund ist nur `lieferant`.
   Vokabular-Heuristik, keine Beweisführung: sie findet Kandidaten, die Entscheidung „Zusicherung
   oder nicht" trifft ein Mensch und steht mit Grund in der Grundlinie. */
const VOKABULAR = /(Geprueft|Ungeprueft|Abgelaufen|Widerruf|Ungueltig|NichtPruefbar|Klartext|Teilantwort|Herkunft|Stand(?!ard)|Signatur|Zertifikat|Unverschluesselt)/i;

function funktionen(quelle) {
  const idx = [...quelle.matchAll(/^function ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => ({ name: m[1], von: m.index }));
  return idx.map((f) => {
    const ende = quelle.indexOf('\n}', f.von);
    return { name: f.name, text: quelle.slice(f.von, ende < 0 ? f.von : ende) };
  });
}

function kandidaten(quelle, anker, gesperrt) {
  const gesperrtSet = new Set(gesperrt);
  const ankerSet = new Set(anker);
  const funde = {};
  for (const f of funktionen(quelle)) {
    if (ankerSet.has(f.name)) continue;
    for (const m of f.text.matchAll(/STRINGS\.([A-Za-z][A-Za-z0-9_]*)/g)) {
      const k = m[1];
      const art = gesperrtSet.has(k) ? 'mitleser' : (VOKABULAR.test(k) ? 'lieferant' : null);
      if (!art) continue;
      const e = (funde[f.name] = funde[f.name] || { lieferant: new Set(), mitleser: new Set() });
      e[art].add(k);
    }
  }
  return Object.entries(funde).map(([funktion, e]) => ({ funktion, lieferant: [...e.lieferant].sort(), mitleser: [...e.mitleser].sort() }))
    .sort((a, b) => a.funktion.localeCompare(b.funktion));
}

module.exports = { kandidaten, funktionen, VOKABULAR };
