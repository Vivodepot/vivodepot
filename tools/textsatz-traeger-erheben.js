'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-traeger-erheben.js — läuft den BESTAND ab, nicht die Ortsliste
   (U2-ADR-322, 06.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, AUS DEM ES ENTSTEHT: `TEXTSATZ_FEHLSTELLEN` meldet ein fehlendes
   `label` — aber nur an den Knoten, die `_textsatzOrteBegehen` abläuft, und nur
   für die Art `label`. Ein Text-Träger an einem Ort, den diese Liste nicht
   kennt, fällt niemandem auf: die zehn `exporte[].label` fielen beim
   Bündel-Schnitt weg, im Export-Fenster hätte `undefined` gestanden.

   EIN WÄCHTER, DER DIESELBE LANDKARTE ABLÄUFT WIE DAS WERKZEUG, BEWACHT NICHTS.
   Darum kennt dieses Werkzeug KEINE Ortsliste. Es begeht den Objektgraphen der
   Kern-Ausfuhr generisch und entscheidet an jedem String nach seiner FORM, ob
   eine Bürgerin ihn liest — mit `tools/anzeigetexte-orten.js`, dem Werkzeug,
   das genau dafür gebaut und geprüft ist.

   DIE DECKUNGSFRAGE WIRD OHNE KENNUNG GESTELLT, und das ist Absicht: eine
   Kennung herzuleiten hieße, die Landkarte des Werkzeugs nachzubauen. Gefragt
   wird stattdessen, ob der WERT im Textsatz steht — denn `_textsatzKnotenFuellen`
   schreibt den Satz-Text in den Knoten. Was aus dem Satz kommt, steht darin;
   was inline im Bündel steht, steht nicht darin. Beides ohne jede Ortskenntnis
   unterscheidbar.
   ════════════════════════════════════════════════════════════════════════════ */

const { deTexte } = require('./lib/textsatz-de-quelle.js');
const { art } = require('./anzeigetexte-orten.js');

/* Wurzeln, die KEINE Träger sind, sondern der Satz selbst bzw. seine Verwaltung.
   Sie auszunehmen ist keine Ortsliste: es ist die Grenze zwischen dem Bestand
   und dem Satz, der ihn beschreibt. Ohne sie zählte der Satz sich selbst. */
const WURZELN_AUSGENOMMEN = new Set([
  'TEXTSATZ_ARTEN', 'TEXTSATZ_ARTEN_FELD', 'TEXTSATZ_FEHLSTELLEN',
  'TEXTSATZ_REGELN_EINGEBAUT', 'TEXTSATZ_REGELN_ERLAUBT', 'TEXTSATZ_REGEL_FORM',
  /* ANG1 (19.09.2026): die ab Werk eingebackenen Angehörigen-Vorlagen tragen ihren Wortlaut INLINE — die
     Vorlage IST die Sprache ihres Rechtsraums und schaltet nicht über den Textsatz mit (Entscheidung:
     Blätter sind Template, kein Gerüst; eine französische Fassung ist eine französische Vorlage). Ihre
     Titel als „ungedeckt" zu zählen, hieße, sie wieder in den Textsatz zu zwingen. */
  'AB_WERK_ANGEHOERIGEN_QUELLEN',
]);

/* WAS EINE BESCHRIFTUNG IST, sagt der Kern selbst: `TEXTSATZ_ARTEN` plus die
   Assistenten-Arten. Das ist KEINE Ortsliste — es ist das Vokabular, mit dem
   der Bestand seine Anzeigetexte benennt. Ein Knoten, der irgendwo im Graphen
   eine dieser Eigenschaften trägt, ist ein Text-Träger, gleich wo er hängt:
   `exporte[]` genauso wie ein Sektorfeld.

   Die Menge wird ÜBERGEBEN, nicht hier festgeschrieben — kommt eine Art hinzu,
   wächst die Deckung ohne Pflege an dieser Stelle. */
const ARTEN_RUECKFALL = Object.freeze(['label', 'hint', 'beispiel', 'platzhalter',
  'einfuehrungstext', 'titel', 'einfuehrung', 'frage', 'hilfetext', 'einleitung', 'toast']);

const MAX_TIEFE = 14;

/* Alle Texte, die der eingebaute Satz trägt — als WERT-Menge. Ein Träger gilt
   als gedeckt, wenn sein sichtbarer Text hier vorkommt. */
/* `aufloesen` (16.09.2026, White Label): ein Satztext mit {marke} erscheint am Träger
   aufgelöst („Vivodepot" oder der Partnername). Ohne die aufgelöste Form zählte jeder
   solche Träger als ungedeckt, obwohl sein Text aus dem Satz kommt. Beide Formen gelten. */
function satzWerte(texte, aufloesen) {
  const s = new Set();
  for (const v of Object.values(texte || {})) {
    if (typeof v === 'string' && v.trim() !== '') {
      s.add(v);
      if (typeof aufloesen === 'function') s.add(aufloesen(v));
    }
  }
  return s;
}

/* Der generische Gang durch den Bestand. `wurzeln` ist ein Objekt; jeder eigene,
   aufzählbare Schlüssel darin ist eine Wurzel. Getter werden aufgerufen, wie sie
   auch die Sicht aufruft — ein werfender Getter beendet nicht den Lauf. */
function traegerErheben(wurzeln, opts) {
  const o = opts || {};
  const werte = o.satzWerte || new Set();
  const arten = new Set(o.arten || ARTEN_RUECKFALL);
  const gesehen = new WeakSet();
  const traeger = [];
  let knotenBesucht = 0;

  const lies = (obj, schluessel) => {
    try { return obj[schluessel]; } catch (_) { return undefined; }
  };

  const gehe = (knoten, pfad, tiefe) => {
    if (tiefe > MAX_TIEFE || knoten === null || typeof knoten !== 'object') return;
    if (gesehen.has(knoten)) return;
    gesehen.add(knoten);
    knotenBesucht++;

    let schluesselListe;
    try { schluesselListe = Object.keys(knoten); } catch (_) { return; }

    for (const k of schluesselListe) {
      const v = lies(knoten, k);
      if (typeof v === 'string') {
        if (!arten.has(k) || v.trim() === '') continue;
        /* Die FORM entscheidet, ob eine Bürgerin den Wert liest — dieselbe Regel
           und dasselbe Werkzeug wie in textsatz-mechanismus.test.js. Ein
           Bezeichner („C1E") ist ein Datenwert und gehört nicht in den Satz;
           die Führerschein-Klassen sind der geprüfte Referenzfall dafür. */
        const einstufung = art(v, false);
        const gedeckt = werte.has(v);
        traeger.push({ pfad: pfad + '.' + k, art: k, text: v, form: einstufung, gedeckt });
      } else if (v && typeof v === 'object') {
        gehe(v, pfad + '.' + k, tiefe + 1);
      }
    }
  };

  for (const w of Object.keys(wurzeln)) {
    if (WURZELN_AUSGENOMMEN.has(w)) continue;
    const v = lies(wurzeln, w);
    if (v && typeof v === 'object') gehe(v, w, 0);
  }

  /* Ein ungedeckter Träger ist ein Befund NUR, wenn seine Form Anzeigetext sagt.
     `unklar` (ein einzelnes großes Wort) wird gezählt und ausgewiesen, aber nicht
     behauptet — die Zahl macht sichtbar, was die Form nicht entscheidet. */
  const ungedeckt = traeger.filter((t) => !t.gedeckt && t.form === 'anzeigetext');
  const unklar = traeger.filter((t) => !t.gedeckt && t.form === 'unklar');
  const datenwerte = traeger.filter((t) => !t.gedeckt && t.form === 'bezeichner');
  return {
    traeger,
    ungedeckt,
    unklar,
    datenwerte,
    zahlen: {
      knotenBesucht,
      traegerGesamt: traeger.length,
      gedeckt: traeger.filter((t) => t.gedeckt).length,
      ungedeckt: ungedeckt.length,
      unklar: unklar.length,
      datenwerte: datenwerte.length,
    },
  };
}

module.exports = { traegerErheben, satzWerte, WURZELN_AUSGENOMMEN, ARTEN_RUECKFALL };

if (require.main === module) {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const arten = [].concat(V.TEXTSATZ_ARTEN || [], ['frage', 'hilfetext', 'einleitung', 'toast']);
  const erg = traegerErheben(V, { satzWerte: satzWerte(deTexte(), V._markePlatzhalterAufloesen), arten });
  console.log(JSON.stringify(erg.zahlen, null, 2));
  const grenze = Number(process.argv[2] || 40);
  console.log('\n── ungedeckte Träger (erste ' + grenze + ') ──');
  for (const t of erg.ungedeckt.slice(0, grenze)) {
    console.log(t.pfad + '  ::  ' + JSON.stringify(t.text.slice(0, 90)));
  }
}
