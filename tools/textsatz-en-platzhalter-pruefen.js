'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-en-platzhalter-pruefen.js — hält fest, dass eine Übersetzung jeden
   `{...}`-Platzhalter aus dem deutschen Original unverändert trägt
   („Bürgersatz englisch andocken", Strang 3, 27.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   BEFUND: Kennungen wie `strings:einstModuleKurzstatus.text` tragen `{n}` —
   zur Laufzeit ersetzt `.replace('{n}', String(...))` diesen literalen Text.
   Eine Übersetzung, die `{n}` übersetzt, umformuliert oder weglässt, bricht
   diesen Aufruf lautlos (kein Wurf — `.replace()` auf einem nicht vorhandenen
   Suchtext ist ein No-op, der Platzhalter bliebe im ausgelieferten Text
   stehen). Klammerhinweise wie „(Datum)"/„(Name)" sind reine Prosa-Hinweise,
   NIE programmatisch ersetzt — sie DÜRFEN übersetzt werden ("(date)"), nur
   die geschweifte Form ist sicherheitskritisch.

   Bei rund 1700 maschinell-unterstützt übersetzten Kennungen (elf parallele
   Entwürfe) ist das die eine Prüfung, die sich nicht durch Stichprobe ersetzen
   lässt — ein einziger verlorener Platzhalter bricht eine Bedienfluss-Zeile
   für jede Depotinhaberin, die dieses Sprachmodul nutzt.
   ════════════════════════════════════════════════════════════════════════════ */
const PLATZHALTER_MUSTER = /\{[a-zA-Z0-9_]+\}/g;

function platzhalter(text) {
  return String(text).match(PLATZHALTER_MUSTER) || [];
}

// Multiset-Vergleich (nicht nur Menge) — ein Text, der einen Platzhalter ZWEIMAL
// braucht, muss ihn auch zweimal tragen.
function multisetGleich(a, b) {
  if (a.length !== b.length) return false;
  const zaehlA = new Map();
  for (const x of a) zaehlA.set(x, (zaehlA.get(x) || 0) + 1);
  for (const x of b) {
    const n = zaehlA.get(x) || 0;
    if (n === 0) return false;
    zaehlA.set(x, n - 1);
  }
  return true;
}

// Prüft eine ganze Übersetzung (Kennung → Text) gegen ihre deutsche Quelle
// (dasselbe Kennung-Format) — gibt eine Liste der Verstöße zurück, leer heißt
// sauber. `quelle`/`ziel` müssen dieselben Kennungen als Schlüssel tragen;
// eine fehlende Kennung in `ziel` zählt NICHT als Platzhalter-Verstoß (das ist
// ein Vollständigkeits-, kein Treue-Fehler — eigene Prüfung, s. Aufrufer).
function platzhalterVerstoesse(quelle, ziel) {
  const verstoesse = [];
  for (const kennung of Object.keys(quelle)) {
    if (!Object.prototype.hasOwnProperty.call(ziel, kennung)) continue;
    const deTokens = platzhalter(quelle[kennung]);
    if (!deTokens.length) continue;
    const enTokens = platzhalter(ziel[kennung]);
    if (!multisetGleich(deTokens, enTokens)) {
      verstoesse.push({ kennung, deutsch: deTokens, englisch: enTokens });
    }
  }
  return verstoesse;
}

module.exports = { platzhalter, platzhalterVerstoesse };
