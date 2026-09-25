'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Wizard-Zielraum — die vier Formen, an EINER Stelle
   ────────────────────────────────────────────────────────────────────────────
   `wizardSchrittZiel` liefert nicht eine Struktur, sondern VIER. Erhoben am
   29.07.2026 über `Object.keys` jedes Ziels jedes Wizard-Schritts — nicht
   geraten und nicht einzeln nachgezogen ⟦M⟧:

     { sektor }                  49 Schritte  pvwiz, anamwiz, pflwiz, heirwiz, umzwiz
     { sektor, liste, instrument} 12 Schritte  kiwiz
     { situation }                6 Schritte  gebwiz
     { sektor, liste, unterfeld}  2 Schritte  anamwiz
                                 ──
                                 69 Schritte, 7 Wizards, 4 Formen

   ── WARUM DIESES MODUL EXISTIERT ───────────────────────────────────────────
   Weil das Wissen „es sind vier" schon zweimal an je EINER Stelle stand und
   die andere blind blieb. `wertAmZiel` (A51) kannte alle vier; `ohneWegNachVorn`
   (A49, `anlass-ereignis-umzug.test.js`) kannte nur `ziel.sektor` — und war
   trotzdem grün, weil `umzwiz` zufällig nur Sektor-Ziele trägt.

   Der Quelltext führt dieselbe Klage schon einmal: `feldDefFuer` entstand,
   weil dieselbe Verzweigung an fünf Stellen inline stand — „Fünf Kopien einer
   Regel sind fünf Gelegenheiten, dass eine davon den Selektor NICHT kennt."
   Eine dritte Kopie für den E1-Wächter zu bauen wäre genau das gewesen.

   ── DIE REIHENFOLGE IST NICHT BELIEBIG ─────────────────────────────────────
   `zielZweig` klassifiziert in derselben Reihenfolge, in der `wizardZielSetzen`
   (`vivodepot.html`) dispatcht: erst `liste && unterfeld`, dann `liste`, dann
   `sektor`, dann `situation`. Wer anders herum prüft, beurteilt bei einem Ziel
   mit mehreren Schlüsseln einen ANDEREN Zweig als den, der wirklich läuft —
   und belegt dann etwas über einen Pfad, den es nicht gibt.

   ── EINE FÜNFTE FORM WIRD ROT, NICHT STILL GELESEN ─────────────────────────
   Beide Leser hier melden eine unbekannte Form ausdrücklich, statt sie in den
   nächstbesten Zweig fallen zu lassen. Beim Bau von A51 ist genau das zweimal
   passiert: zehn kiwiz-Felder und zwei anamwiz-Felder standen kurz davor, als
   Produktbefund gebucht zu werden — der Wert war längst da, der Leser zu
   einfach. Ein Leser, der schweigt, wo er nichts weiß, erzeugt Falschbefunde
   in beide Richtungen.
   ════════════════════════════════════════════════════════════════════════════ */

/* Die vier erhobenen Formen als Schlüsselmengen, alphabetisch verbunden. */
const ZIELFORMEN = Object.freeze([
  'sektor',
  'instrument+liste+sektor',
  'liste+sektor+unterfeld',
  'situation',
]);

/** Die Form EINES Ziels, als sortierte Schlüsselmenge — die Erhebungs-Einheit. */
function zielForm(ziel) {
  return Object.keys(ziel || {}).sort().join('+') || '(leer)';
}

/** Kennt dieser Zielraum die Form? Eine fünfte gehört gemeldet, nicht geraten. */
function istBekannteZielform(ziel) {
  return ZIELFORMEN.includes(zielForm(ziel));
}

/* Der Zweig, den `wizardZielSetzen` für dieses Ziel WIRKLICH nimmt — in der
   Reihenfolge des Schreibers, siehe Kopf. */
function zielZweig(ziel) {
  if (!ziel || typeof ziel !== 'object') return 'keines';
  if (ziel.liste && ziel.unterfeld) return 'liste-unterfeld';
  if (ziel.liste) return 'liste-typ';
  if (ziel.sektor) return 'sektor';
  if (ziel.situation) return 'situation';
  return 'keines';
}

/** Die Felddefinition einer Liste in einem Sektor — oder null. */
function listenFeldDef(V, sektorId, listeId) {
  const sek = V.SEKTOR_BY_ID[sektorId];
  if (!sek) return null;
  const def = (sek.sektionen || []).flatMap((s) => s.felder || []).find((f) => f.id === listeId);
  return def && def.typ === 'liste' ? def : null;
}

/* ── DER LESER: wo steht der Wert eines Schritts nach dem Abschluss? ────────
   Übernommen aus A51 (`wizard-eingaben-kommen-an.test.js`), wo er gebaut und
   je Zweig gegen einen gepflanzten Verlust gefahren wurde. */
function wertAmZiel(daten, ziel, feldId) {
  if (!ziel) return undefined;
  if (ziel.liste) {
    const zeilen = ((daten.sektoren || {})[ziel.sektor] || {})[ziel.liste];
    if (!Array.isArray(zeilen)) return undefined;
    /* Zwei Listen-Formen: über `instrument` die passende Zeile (kiwiz), sonst die
       erste. Und der Wert steht unter `unterfeld`, wo eines genannt ist —
       `voroperationen` landet als `eingriff`, nicht als `voroperationen`. */
    const zeile = ziel.instrument ? zeilen.find((z) => z && z.instrument === ziel.instrument) : zeilen[0];
    return zeile ? zeile[ziel.unterfeld || feldId] : undefined;
  }
  if (ziel.situation) return ((daten.situationen || {})[ziel.situation] || {})[feldId];
  return ((daten.sektoren || {})[ziel.sektor] || {})[feldId];
}

/* ── SACKGASSEN-KRITERIUM (1): kein Weg nach vorn ───────────────────────────
   Ein Schritt, dessen Ziel es nicht gibt, führt die Bürgerin ins Leere — die
   Eingabe hat keinen Ort.

   „Keinen Ort" heißt hier nicht „wirft". Der Schreibpfad ist an drei von vier
   Zweigen NACHSICHTIG, und genau das macht das Kriterium nötig ⟦M⟧:

     `sektorFeldSetzen`      schreibt in `data.sektoren[<unbekannt>]`
     `situationFeldSetzen`   legt `data.situationen[<unbekannt>]` an
     `_listeOder`            legt Sektor UND Liste an, wenn es sie nicht gibt

   Der Wert liegt danach im Depot und wird von keiner Sicht gezeigt — genau der
   Zustand, den der Quelltext an `wizardListenZeileSetzen` schon einmal benennt:
   kiwiz schrieb seine `ki_*`-Werte nach `verwaltung`, „gespeichert, aber
   nirgends darstellbar oder korrigierbar".

   Der EINE Zweig, der wirklich wirft, ist `liste-typ` ohne einzigartigen `typ`
   — dort ist „die Zeile" nicht bestimmt, und der Schreiber verweigert.

   GEPRÜFT WIRD DAS ZIEL, nicht das Feld. Ob die `feldId` eines Schritts als
   Unterfeld der Liste deklariert ist, ist eine eigene Frage (heute für alle 14
   Listen-Schritte erfüllt ⟦M⟧); sie hier einzuschmuggeln hieße, das Kriterium
   still zu erweitern. */
function ohneWegNachVorn(V, def) {
  const tot = [];
  const schritte = (def && Array.isArray(def.schritte)) ? def.schritte : [];
  for (const [i, s] of schritte.entries()) {
    const ziel = V.wizardSchrittZiel(def, s);
    const wo = 'Schritt ' + i + ' („' + ((s && s.frage) || '?') + '")';

    /* Eine unbekannte Form wird gemeldet, nicht in den nächsten Zweig
       fallengelassen — sonst beurteilte der Erkenner einen Pfad, über den er
       nichts weiß, und sein Schweigen belegte nichts. */
    if (!istBekannteZielform(ziel)) {
      tot.push(wo + ' → UNBEKANNTE ZIELFORM {' + zielForm(ziel) + '}. Der Erkenner kennt vier '
        + 'Formen (' + ZIELFORMEN.join(' · ') + ') und kann diese nicht beurteilen. Erst den '
        + 'Zielraum erweitern, dann die Form in `ZIELFORMEN` eintragen.');
      continue;
    }

    const zweig = zielZweig(ziel);

    if (zweig === 'sektor') {
      if (!V.SEKTOR_BY_ID[ziel.sektor]) {
        tot.push(wo + ' → Bereich ' + JSON.stringify(ziel.sektor) + ', den das Modell nicht kennt');
      }
      continue;
    }

    if (zweig === 'situation') {
      if (!V.SITUATION_BY_ID[ziel.situation]) {
        tot.push(wo + ' → Situationsblatt ' + JSON.stringify(ziel.situation)
          + ', das das Modell nicht kennt');
      }
      continue;
    }

    /* Beide Listen-Zweige: Bereich und Liste müssen es geben, sonst legt
       `_listeOder` sie wortlos an und der Wert ist unsichtbar. */
    const listeDef = listenFeldDef(V, ziel.sektor, ziel.liste);
    if (!V.SEKTOR_BY_ID[ziel.sektor]) {
      tot.push(wo + ' → Bereich ' + JSON.stringify(ziel.sektor) + ', den das Modell nicht kennt');
      continue;
    }
    if (!listeDef) {
      tot.push(wo + ' → Liste ' + JSON.stringify(ziel.liste) + ' in Bereich '
        + JSON.stringify(ziel.sektor) + ', die es dort nicht gibt (oder kein Listenfeld ist). '
        + '`_listeOder` legte sie wortlos an — der Wert stünde im Depot und in keiner Sicht.');
      continue;
    }

    if (zweig === 'liste-unterfeld') {
      const uf = (listeDef.unterFelder || []).find((f) => f.id === ziel.unterfeld);
      if (!uf) {
        tot.push(wo + ' → Unterfeld ' + JSON.stringify(ziel.unterfeld) + ' der Liste '
          + JSON.stringify(ziel.liste) + ', das die Liste nicht führt. Der Wert landete in der '
          + 'Zeile unter einem Namen, den kein Editor zeigt.');
      }
      continue;
    }

    /* `liste-typ`: der EINE Zweig, an dem der Schreiber wirklich wirft. Ohne
       einzigartigen Typ ist „die Zeile" nicht bestimmt — die Eingabe kommt
       nicht einmal bis ins Depot. */
    if (!V._instrumentEinzigartig(ziel.instrument)) {
      tot.push(wo + ' → Listen-Zeile vom Typ ' + JSON.stringify(ziel.instrument) + ', der nicht '
        + 'einzigartig ist. `wizardListenZeileSetzen` wirft hier — „die Zeile" ist nicht '
        + 'bestimmt, und die Eingabe kommt nirgends an.');
    }
  }
  return tot;
}

module.exports = {
  ZIELFORMEN, zielForm, istBekannteZielform, zielZweig,
  listenFeldDef, wertAmZiel, ohneWegNachVorn,
};
