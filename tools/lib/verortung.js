'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Verortung — jede Angabe, die ein Fund über sich selbst macht, ist eine
   eigene Behauptung, und sie wird geprüft.
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (27.07.2026). Ein Wächter blendete Kommentare aus und ersetzte
   dabei Zeilenumbrüche durch Leerzeichen. Zeichenzahl stimmte, Zeilenzahl
   nicht — und JEDE gemeldete Zeilennummer zeigte auf unbeteiligten Code.
   Sämtliche Positiv- und Negativkontrollen liefen grün, weil keine von ihnen
   die VERORTUNG prüfte, nur das Ergebnis. Aufgefallen ist es allein dadurch,
   dass jemand die gemeldete Stelle nachgeschlagen hat.

   DIE REGEL. Ein Fund behauptet zweierlei: DASS etwas gilt, und WO. Das Zweite
   ist nicht Beiwerk, sondern der Teil, auf den jemand hingeht. Eine falsche
   Verortung ist teurer als ein fehlender Fund, weil sie Arbeit an die falsche
   Stelle lenkt und dabei überzeugt aussieht.

   Geprüft wird darum jede Art von Ortsangabe, nicht nur die Zeilennummer:
     zeile     — die Zeile in der Datei trägt das gemeldete Muster
     datei     — die Datei existiert und ist lesbar
     selektor  — der Selektor trifft im gerenderten DOM (UX-Messungen)
     feld      — die Feld-Kennung existiert im geladenen Modell

   WER ROT WIRD. Nicht der Fund — das WERKZEUG. Ein Fund kann richtig sein und
   trotzdem falsch verortet; dann ist die Meldung unbrauchbar und der Lauf
   ungültig. Darum ist das Ergebnis eine eigene Liste `werkzeugFehler`, die
   nie mit den Funden vermischt wird.
   ════════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');

/**
 * @typedef {Object} Fund
 * @property {string}  datei     Pfad, relativ zur Wurzel
 * @property {number} [zeile]    1-basiert
 * @property {string} [muster]   was an dieser Zeile stehen muss (Teilstring oder RegExp-Quelle)
 * @property {string} [selektor] CSS-Selektor, der treffen muss
 * @property {string} [feld]     Feld-Kennung, die im Modell existieren muss
 */

/**
 * Prüft die VERORTUNG jedes Funds. Gibt die Werkzeug-Fehler zurück (leer = in Ordnung).
 *
 * @param {Fund[]} funde
 * @param {Object} opts
 * @param {string}   opts.wurzel        Basis für relative Dateipfade
 * @param {Function} [opts.selektorTrifft]  (datei, selektor) => boolean — für DOM-Messungen
 * @param {Function} [opts.feldExistiert]   (feld) => boolean            — für Modell-Messungen
 */
function pruefeVerortung(funde, opts) {
  const o = opts || {};
  const wurzel = o.wurzel || process.cwd();
  const fehler = [];
  const cache = new Map();

  const zeilenVon = (datei) => {
    if (!cache.has(datei)) {
      cache.set(datei, fs.readFileSync(path.join(wurzel, datei), 'utf8').split('\n'));
    }
    return cache.get(datei);
  };

  funde.forEach((f, i) => {
    const wo = `Fund ${i + 1} (${f.datei || '—'}${f.zeile != null ? ':' + f.zeile : ''})`;

    if (!f.datei) { fehler.push(`${wo}: keine Datei angegeben`); return; }

    let zeilen;
    try { zeilen = zeilenVon(f.datei); }
    catch (e) { fehler.push(`${wo}: Datei nicht lesbar — ${e.code || e.message}`); return; }

    if (f.zeile != null) {
      // 1-basiert, und die Grenzen ausdrücklich: eine Zeile 0 oder n+1 ist der
      // Klassiker beim Umrechnen und faellt sonst als „leer" durch.
      if (!Number.isInteger(f.zeile) || f.zeile < 1 || f.zeile > zeilen.length) {
        fehler.push(`${wo}: Zeile ausserhalb der Datei (1..${zeilen.length})`);
        return;
      }
      if (f.muster != null) {
        const text = zeilen[f.zeile - 1];
        const trifft = f.muster instanceof RegExp ? f.muster.test(text) : text.includes(f.muster);
        if (!trifft) {
          fehler.push(
            `${wo}: das gemeldete Muster steht dort NICHT.\n` +
            `      erwartet: ${f.muster}\n` +
            `      Zeile   : ${String(text).trim().slice(0, 120)}`
          );
        }
      }
    }

    if (f.selektor != null) {
      if (typeof o.selektorTrifft !== 'function') {
        fehler.push(`${wo}: Selektor gemeldet, aber kein selektorTrifft() gegeben — ungeprueft ist nicht bestanden`);
      } else if (!o.selektorTrifft(f.datei, f.selektor)) {
        fehler.push(`${wo}: der Selektor "${f.selektor}" trifft im gerenderten DOM nicht`);
      }
    }

    if (f.feld != null) {
      if (typeof o.feldExistiert !== 'function') {
        fehler.push(`${wo}: Feld gemeldet, aber kein feldExistiert() gegeben — ungeprueft ist nicht bestanden`);
      } else if (!o.feldExistiert(f.feld)) {
        fehler.push(`${wo}: die Feld-Kennung "${f.feld}" gibt es im Modell nicht`);
      }
    }
  });

  return fehler;
}

/**
 * Bequemer Aufruf für Wächter: wirft, wenn die Verortung nicht hält.
 * Ausdrücklich ein eigener Fehlschlag — nicht in die Fund-Meldung gemischt.
 */
function verortungOderWirf(funde, opts) {
  const fehler = pruefeVerortung(funde, opts);
  if (fehler.length) {
    const e = new Error(
      'VERORTUNG FEHLERHAFT — nicht der Fund ist falsch, sondern das Werkzeug.\n' +
      'Eine Meldung, die auf die falsche Stelle zeigt, lenkt Arbeit ins Leere:\n  ' +
      fehler.join('\n  ')
    );
    e.name = 'VerortungsFehler';
    e.verortungsFehler = fehler;
    throw e;
  }
  return funde;
}

/**
 * Entdoppeln, ohne fremde Angaben mitzunehmen.
 *
 * DER ANLASS (27.07.2026). Eine Fundliste wurde nach `tag+klasse+kontrast`
 * entdoppelt, und aus dem übrig gebliebenen Objekt wurde anschliessend `theme`
 * abgelesen — ein Feld, das NICHT im Schlüssel stand. Die Gruppe enthielt Zeilen
 * aus mehreren Themes; abgelesen wurde eines davon, willkürlich. Daraus entstand
 * die These „der Hochkontrast-Modus macht es kaputt", die einen Tag lang galt und
 * einen Bau-Posten begründete. Gemessen war das Element in ALLEN Themes gleich
 * schlecht.
 *
 * Das ist die Verortungs-Familie eine Ebene weiter: nicht „wo ist der Fund",
 * sondern „über welchen Fund redet dieses Feld". Ein Feld ausserhalb des
 * Schlüssels ist nach dem Entdoppeln eine Angabe über einen FREMDEN Fund.
 *
 * Die Antwort ist ein Mechanismus statt einer Vorsatzregel: was hier
 * herauskommt, TRÄGT die Nicht-Schlüssel-Felder gar nicht mehr. Wer sie
 * braucht, muss sie ausdrücklich anfordern — und bekommt dann alle Werte der
 * Gruppe, nicht einen willkürlichen.
 *
 * @param {object[]} liste
 * @param {string[]} schluesselFelder  die Felder, die die Gruppe definieren
 * @param {string[]} [auchSammeln]     Felder, die als SET aller Gruppenwerte mitkommen
 */
function entdoppeln(liste, schluesselFelder, auchSammeln) {
  const sammeln = auchSammeln || [];
  const gruppen = new Map();
  for (const e of liste || []) {
    const k = schluesselFelder.map((f) => String(e[f])).join('\u0000');
    if (!gruppen.has(k)) {
      const kern = {};
      for (const f of schluesselFelder) kern[f] = e[f];
      kern.anzahl = 0;
      for (const f of sammeln) kern[f] = new Set();
      gruppen.set(k, kern);
    }
    const g = gruppen.get(k);
    g.anzahl++;
    for (const f of sammeln) g[f].add(e[f]);
  }
  // Sets zu sortierten Listen — damit ein Bericht sie ausschreiben kann, statt
  // einen Wert davon fuer DEN Wert zu halten.
  return [...gruppen.values()].map((g) => {
    const raus = {};
    for (const f of schluesselFelder) raus[f] = g[f];
    raus.anzahl = g.anzahl;
    for (const f of sammeln) raus[f] = [...g[f]].sort();
    return raus;
  });
}

module.exports = { pruefeVerortung, verortungOderWirf, entdoppeln };
