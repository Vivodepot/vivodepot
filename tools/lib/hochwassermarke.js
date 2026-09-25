'use strict';
/* ══════════════════════════════════════════════════════════════
   hochwassermarke.js — „schreibt nur nach oben, senkt nur benannt" (21.09.2026)
   ──────────────────────────────────────────────────────────────
   EINE Funktion für jede Grundlinie, die einen Höchststand hält (Dateien im Baum, Dateien im Lauf, …),
   statt eines Schreibwegs je Werkzeug: zwei Stellen, die dieselbe Art Zahl schreiben, wären zwei Stellen,
   an denen dieselbe Ratsche kaputtgehen kann.

   DER ANLASS, GEMESSEN: tools/suite-umfang-grundlinie.json stand am 21.09.2026 auf 440 (11.08.), der Ist am
   Kanon auf 1295 — Abstand 855: zwei Drittel der Suite hätten verschwinden können, das Gate wäre grün
   geblieben. Die Ursache ist nicht Unaufmerksamkeit: die Lücke stand seit dem 19.08. GEMESSEN im Kommentar
   derselben Datei („rekursiv 542, flach 512, Grundlinie 440") — aufgeschrieben, nie übernommen. Es gab
   keinen Weg von der Notiz zur Grundlinie — eine fehlende Kante. Diese Funktion ist diese Kante; sie ersetzt genau dieses Versäumnis.
   Verlauf der Testdateien in tests/ (gemessen mit `git ls-tree -r --name-only <commit> -- tests | grep -c '\.test\.js$'`): 546 (19.08.) · 782 (01.09.) · 977 (10.09.) · 1295 (21.09.),
   bei genau EINER Änderung der Grundlinie (e66b325b, 11.08.).

   DIE FORM: ist >= Marke ist der ZUSTAND (die Suite prüft ihn, `pruefen`); ist > Marke schreibt die neue
   Marke (`fortschreiben`, aus tools/landung-vorbereiten.js, also im Zug — der PFLEGT ihn). Die Marke sitzt so
   immer auf dem Höchststand, der Verlust EINER Datei ist rot, und niemand muss an eine Fortschreibung denken.
   Ausdrücklich KEINE Schwelle und KEINE Spanne: ein Gate, das regelmäßig aus formalen Gründen rot wird,
   wird abgeschaltet. Sinken darf sie nur benannt (`senken`: Grund ab GRUND_MINDESTLAENGE Zeichen, datiert).

   SCHREIBEN NUR BEI ÄNDERUNG: `schreiben` faßt die Datei nicht an, wenn ihr Inhalt derselbe bliebe — ein Schreiben
   ohne Änderung setzt ein Datum, das später wie eine Entscheidung aussieht.
   ══════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const GRUND_MINDESTLAENGE = 40;

/** rein: die Marke steigt nur, und nur wenn `ist` darüber liegt. Kein Argument verändert sich. */
function fortschreiben(grundlinie, feld, ist, { datum }) {
  const von = grundlinie[feld];
  if (!Number.isInteger(von) || !Number.isInteger(ist)) return { ok: false, grund: feld + ': Marke oder Ist ist keine ganze Zahl (' + von + ' / ' + ist + ') — nicht messbar.' };
  if (ist <= von) return { ok: true, geaendert: false, von, auf: von, grundlinie };
  return { ok: true, geaendert: true, von, auf: ist, grundlinie: { ...grundlinie, [feld]: ist, datum } };
}

/** rein: der ZUSTAND — `ist >= marke`. Fehlt die Marke oder das Ist, ist das nicht messbar, nicht bestanden. */
function pruefen(grundlinie, feld, ist) {
  const marke = grundlinie[feld];
  if (!Number.isInteger(marke) || !Number.isInteger(ist)) return { ok: false, messbar: false, marke, ist };
  return { ok: ist >= marke, messbar: true, marke, ist, fehlt: Math.max(0, marke - ist) };
}

/** rein: eine Senkung nur mit Grund und nur, wenn `ist` wirklich unter der Marke liegt. */
function senken(grundlinie, feld, ist, { datum, grund }) {
  const von = grundlinie[feld];
  if (!Number.isInteger(von) || !Number.isInteger(ist)) return { ok: false, grund: feld + ': Marke oder Ist ist keine ganze Zahl — nicht messbar.' };
  if (ist >= von) return { ok: false, grund: feld + ': nichts zu senken (Ist ' + ist + ' liegt nicht unter der Marke ' + von + ').' };
  const g = typeof grund === 'string' ? grund.trim() : '';
  if (g.length < GRUND_MINDESTLAENGE) return { ok: false, grund: feld + ': eine Senkung braucht einen Grund von mindestens ' + GRUND_MINDESTLAENGE + ' Zeichen — was ist weg, und warum ist das kein Verlust.' };
  return { ok: true, von, auf: ist, grundlinie: { ...grundlinie, [feld]: ist, datum, grund: g } };
}

/** Der EINE Zähler für Testdateien: rekursiv, jede Tiefe, nur `.test.js`, node_modules bleibt außen. Liefert relative Pfade. */
function dateienZaehlen(wurzel) {
  const treffer = [];
  const gehe = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const voll = path.join(dir, name);
      if (fs.statSync(voll).isDirectory()) gehe(voll);
      else if (name.endsWith('.test.js')) treffer.push(path.relative(wurzel, voll));
    }
  };
  gehe(wurzel);
  return treffer;
}

function lesen(pfad) { return JSON.parse(fs.readFileSync(pfad, 'utf8')); }
const serialisieren = (g) => JSON.stringify(g, null, 2) + '\n';

/** Schreibt nur, wenn sich der Inhalt ändert. Gibt zurück, ob geschrieben wurde. */
function schreiben(pfad, grundlinie) {
  const neu = serialisieren(grundlinie);
  if (fs.existsSync(pfad) && fs.readFileSync(pfad, 'utf8') === neu) return false;
  fs.writeFileSync(pfad, neu, 'utf8');
  return true;
}

module.exports = { fortschreiben, pruefen, senken, dateienZaehlen, lesen, schreiben, serialisieren, GRUND_MINDESTLAENGE };
