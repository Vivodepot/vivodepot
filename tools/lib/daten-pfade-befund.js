'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Prüfregel der Daten-Null-Probe, an EINEM Ort (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine hinausgehende Daten-Datei (.json/.yml/.yaml/.txt) nennt keinen getrackten
   Pfad, der drinnen bleibt. Vorher lebte die Regel nur in der Daten-Null-Probe selbst;
   jetzt liest sie auch die Probe über Pfade in Prosa und Kommentaren, um zu beweisen,
   dass ihre eigene Grundlinie — die genau zurückgehaltene Pfade nennt — von dieser Regel gefangen würde, ginge sie hinaus. Wörtlich übernommen, kein
   Verhaltenswechsel.
   ════════════════════════════════════════════════════════════════════════ */
const DATEN = /\.(json|ya?ml|txt)$/;

function datenBefund(dateien, hinaus, bestand, lesen, ausnahmen = new Map()) {
  const drinnen = new Set(bestand.filter((f) => !hinaus.has(f)));
  const funde = [];
  for (const d of dateien.filter((f) => hinaus.has(f) && DATEN.test(f))) {
    const genannt = new Set([...lesen(d).matchAll(/[A-Za-z0-9_.\/-]+\.[A-Za-z0-9]+/g)].map((m) => m[0]).filter((x) => drinnen.has(x) && ausnahmen.get(d) !== x));
    if (genannt.size) funde.push(d + ' nennt ' + genannt.size + ' zurückgehaltene Pfade, z. B. ' + [...genannt].slice(0, 2).join(', '));
  }
  return funde;
}

module.exports = { DATEN, datenBefund };
