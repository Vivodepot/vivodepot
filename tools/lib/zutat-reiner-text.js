'use strict';
/* ════════════════════════════════════════════════════════════════════════
   zutat-reiner-text.js — reiner Text beim Einbacken (Befund ANLASS-KACHEL-TITEL-ROH)
   ────────────────────────────────────────────────────────────────────────
   Situationen und Assistenten ab Werk prüft der Kern nur auf ihre Struktur, nie auf ihren Text: er vertraut dem, was
   in der ausgelieferten Datei steht. Darum hält der Bau die Regel, bevor es dort steht: jede Zeichenkette einer solchen
   Zutat ist reiner Text, dieselbe Form wie `_TAG_ODER_REFERENZ` im Kern (kein Tag, keine Zeichenreferenz, kein ASCII-
   Anführungszeichen). Dass beide Muster gleich sind, hält tests/anlass-kachel-titel-reiner-text.test.js.

   Aufgerufen von tools/produkt-konfektionieren.js für jede unsignierte Zutat, vor dem Backen. Eine eigene Datei, weil
   der Backschritt selbst (tools/lib/produkt-text-erzeugen.js) byte-gleich mit seiner Kopie im Schwesterrepo gehalten wird.
   ════════════════════════════════════════════════════════════════════════ */
const TAG_ODER_REFERENZ = /<[A-Za-z\/!?]|&(?:#|[A-Za-z][A-Za-z0-9]*;)|"/;
const NUR_REINER_TEXT_MODULTYPEN = Object.freeze(['situation', 'wizard']);

/* Alle Zeichenketten in einem Modul-Teil, die kein reiner Text sind — als Pfade, für die Meldung. */
function nichtReineTextStellen(wert, pfad, raus) {
  raus = raus || [];
  if (typeof wert === 'string') { if (TAG_ODER_REFERENZ.test(wert)) raus.push(pfad || '(wert)'); }
  else if (wert && typeof wert === 'object') {
    for (const k of Object.keys(wert)) nichtReineTextStellen(wert[k], (pfad ? pfad + '.' : '') + k, raus);
  }
  return raus;
}

/* Wirft, wenn eine Situations- oder Assistenten-Zutat eine Zeichenkette trägt, die kein reiner Text ist. */
function zutatReinerTextPruefen(roh, basisname) {
  if (!roh || !NUR_REINER_TEXT_MODULTYPEN.includes(roh.modulTyp)) return;
  const stellen = nichtReineTextStellen(roh, '');
  if (stellen.length) {
    throw new Error('Kein reiner Text in ' + basisname + ' (' + roh.modulTyp + '): ' + stellen.slice(0, 5).join(', ')
      + (stellen.length > 5 ? ' und ' + (stellen.length - 5) + ' weitere' : '')
      + ' — Beschriftungen einer Zutat sind reiner Text, ohne Tag, Zeichenreferenz oder ASCII-Anführungszeichen.');
  }
}

module.exports = { TAG_ODER_REFERENZ, NUR_REINER_TEXT_MODULTYPEN, nichtReineTextStellen, zutatReinerTextPruefen };
