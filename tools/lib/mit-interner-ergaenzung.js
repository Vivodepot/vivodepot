'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Eine Datenliste, öffentlich und drinnen — der EINE Lese-Weg (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Manche Grundlinien und Register führen Einträge zu Dateien, die in den
   öffentlichen Zuschnitt gehen, und Einträge zu Dateien, die drinnen bleiben.
   Sie sind in der QUELLE geteilt: `X.json` geht hinaus und nennt keine Datei,
   die drinnen bleibt (tests/zuschnitt-datenlisten-ohne-interne-pfade.test.js);
   `X.intern.json` ist die Ergänzung und bleibt drinnen (ZURUECK_INTERN).
   Dieser Helfer ist die einzige Stelle, die eine Ergänzung liest — gehalten
   von tests/mit-interner-ergaenzung.test.js. Drinnen sieht ein Leser damit den
   ganzen Bestand wie vorher; öffentlich nur den öffentlichen Teil, und dort
   fehlen auch die Dateien, auf die die Ergänzung zeigt.
   ZUSAMMENFÜHRUNG: Objekte werden zusammengeführt; Listen aneinandergehängt —
   außer Listen aus Objekten mit `id`: dort wird je id zusammengeführt (ein
   Eintrag der Ergänzung mit bekannter id ergänzt diesen Eintrag, eine neue id
   wird angehängt). Derselbe Schlüssel mit einem Einzelwert in beiden Teilen
   ist ein Fehler (kein stilles Überschreiben).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');

function ergaenzungPfad(pfad) {
  if (!/\.json$/.test(pfad)) throw new Error('mit-interner-ergaenzung: nur .json-Dateien: ' + pfad);
  return pfad.replace(/\.json$/, '.intern.json');
}

function zusammenfuehren(a, b, ort) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const mitId = (l) => l.length > 0 && l.every((x) => x && typeof x === 'object' && !Array.isArray(x) && 'id' in x);
    if (!mitId(b) || (a.length && !mitId(a))) return a.concat(b);
    const aus = a.slice();
    for (const e of b) {
      const i = aus.findIndex((x) => x.id === e.id);
      if (i < 0) { aus.push(e); continue; }
      const { id, ...rest } = e;
      aus[i] = zusammenfuehren(aus[i], rest, ort + '[id=' + id + ']');
    }
    return aus;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const aus = { ...a };
    for (const [k, v] of Object.entries(b)) {
      aus[k] = Object.prototype.hasOwnProperty.call(a, k) ? zusammenfuehren(a[k], v, ort + '.' + k) : v;
    }
    return aus;
  }
  throw new Error('mit-interner-ergaenzung: ' + ort + ' steht in beiden Teilen als Einzelwert — doppelter Schlüssel');
}

// Liest X.json und fügt X.intern.json hinzu, wenn es sie gibt. `lesen` ist für Proben injizierbar.
function lesenMitErgaenzung(pfad, { lesen = (p) => fs.readFileSync(p, 'utf8'), gibt = fs.existsSync } = {}) {
  const oeffentlich = JSON.parse(lesen(pfad));
  const ergaenzung = ergaenzungPfad(pfad);
  if (!gibt(ergaenzung)) return oeffentlich;
  return zusammenfuehren(oeffentlich, JSON.parse(lesen(ergaenzung)), '(Wurzel)');
}

module.exports = { lesenMitErgaenzung, ergaenzungPfad, zusammenfuehren };
