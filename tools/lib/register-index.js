'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   register-index.js — der gemeinsame Katalog-Index-Mechanismus (Register-Katalog-
   Plan §6 Schritt 3/4, 14.09.2026), aus tools/feldregister-bauen.js gezogen.
   ────────────────────────────────────────────────────────────────────────────
   EIN Weg, nicht so viele wie Achsen — dieselbe Disziplin wie `_einbettenMitFassung`
   im Kern (A437/U2-ADR-145-Nachtrag): jeder Achsen-Erzeuger (Feld/Rechtsraum/
   Sprache/…) ruft dieselben drei Funktionen, keiner schreibt seinen eigenen
   Merge. Additiv: ein Erzeuger kennt nur SEINE Achse und schreibt nur diesen
   einen Eintrag — findet er bereits ein `index.json` mit fremden Achsen-
   Einträgen, bleiben die unangetastet stehen. Eine kaputte/fremde bestehende
   Datei bricht den Lauf nicht, nur den Merge (dann trägt der neue Index eben
   nur den eigenen Eintrag).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const INDEX_DATEI = 'index.json';

function indexEintragBauen({ achse, datei, pruefsummeDatei, hash, anzahl, fassung }) {
  return {
    achse,
    datei,
    pruefsummeDatei,
    sha256: hash,
    anzahl,
    fassung: { datum: fassung.datum, kern: fassung.kern },
  };
}

function indexJsonBauen(vorhandenerIndex, eintrag) {
  const bisherige = (vorhandenerIndex && Array.isArray(vorhandenerIndex.register))
    ? vorhandenerIndex.register.filter((e) => e && e.achse !== eintrag.achse)
    : [];
  const register = [...bisherige, eintrag].sort((a, b) => String(a.achse).localeCompare(String(b.achse)));
  return JSON.stringify({
    hinweis: 'ERZEUGT — Katalog-Index über alle Achsen-Register unter diesem Verzeichnis. Nicht von Hand bearbeiten.',
    register,
  }, null, 2) + '\n';
}

/* Defensiv: eine kaputte/fremde Datei an dieser Stelle darf den Lauf nicht abbrechen,
   nur den additiven Merge auslassen. */
function vorhandenenIndexLesen(zielOrdner) {
  try {
    return JSON.parse(fs.readFileSync(path.join(zielOrdner, INDEX_DATEI), 'utf8'));
  } catch (e) { return null; }
}

module.exports = { INDEX_DATEI, indexEintragBauen, indexJsonBauen, vorhandenenIndexLesen };
