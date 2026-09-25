'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   aufgeloeste-marke-im-depot.js — findet AUFGELÖSTEN {marke}-Text im gespeicherten
   Depot (Marken-Fund, 19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIE ZUSICHERUNG: `{marke}`/`{marke_domain}` sind Platzhalter, die erst beim LESEN
   aufgelöst werden (`_markePlatzhalterAufloesen`, vivodepot.html) — welche Marke gerade
   aktiv ist, entscheidet die Anzeige, nie die Datei. Steht in einer gespeicherten Depot-
   Struktur ein bereits AUFGELÖSTER Satz, trägt die Datei die Marke mit, unter der sie
   entstand, und zeigt sie auch unter jeder späteren (nativ oder White Label) — genau der
   Fehler, den `_textsatzKnotenFuellen` über die geteilten Feld-Objekte in
   `data.abWerkMitschrift.bereich` verursachte.

   MASSSTAB IST DER KATALOG, KEINE HANDLISTE: jede Textsatz-Zeile, die einen Platzhalter
   TRÄGT (67 im deutschen, viele im englischen Bestand), wird für jede übergebene Marke
   aufgelöst — die Menge der zu suchenden Sätze wächst mit dem Katalog von selbst. Gefunden
   wird ein gespeicherter String, der einem aufgelösten Satz GLEICHT oder ihn ENTHÄLT.

   GRENZEN, benannt statt verschwiegen:
   · Eine Zeile, die außer dem Platzhalter kaum Text trägt (unter MIN_VORLAGE_TEXT Zeichen),
     wird ausgelassen — sonst träfe jeder gespeicherte „Vivodepot"-Eintrag den Katalog-
     Eintrag `{marke}` allein.
   · Gesucht wird nur für die ÜBERGEBENEN Marken. Eine dritte, unerwartete Marke fände sie
     nicht; das Depot-Beispiel des Wächters übergibt darum immer nativ UND die im Test
     angedockte Fremdmarke.
   · Freitext, den die Bürgerin selbst getippt hat und der zufällig einen ganzen
     Katalogsatz wörtlich wiederholt, wäre ein Fehlalarm. Bei Sätzen dieser Länge ist das
     kein Zufall, den das Produkt vermeiden könnte — er wird gemeldet, nicht versteckt.
   ════════════════════════════════════════════════════════════════════════════ */

const PLATZHALTER_RE = /\{marke_domain\}|\{marke\}/g;
const MIN_VORLAGE_TEXT = 8;     // Zeichen der Vorlage OHNE Platzhalter
const MIN_ENTHALTEN_LAENGE = 24; // ab dieser Länge zählt „enthält", darunter nur „gleicht"

function hatPlatzhalter(text) {
  return typeof text === 'string' && /\{marke_domain\}|\{marke\}/.test(text);
}

/* katalogTexte: { kennung: 'Text mit {marke}', … } — der Textsatz eines Moduls.
   marken: [{ name, domain }, …]. Rückgabe: Map<aufgeloester Satz, { kennung, marke }>. */
function aufgeloesteVarianten(katalogTexte, marken) {
  const varianten = new Map();
  for (const [kennung, roh] of Object.entries(katalogTexte || {})) {
    if (!hatPlatzhalter(roh)) continue;
    if (roh.replace(PLATZHALTER_RE, '').trim().length < MIN_VORLAGE_TEXT) continue;
    for (const m of marken) {
      const satz = roh.split('{marke_domain}').join(m.domain || '').split('{marke}').join(m.name);
      if (satz !== roh && !varianten.has(satz)) varianten.set(satz, { kennung, marke: m.name });
    }
  }
  return varianten;
}

// Jeder String in einer beliebig verschachtelten Struktur, mit seinem Pfad. Zyklen sind im
// Depot-JSON ausgeschlossen, werden aber über ein Besucht-Set trotzdem abgefangen.
function stringsMitPfad(wert, pfad = '$', besucht = new Set(), aus = []) {
  if (typeof wert === 'string') { aus.push({ pfad, text: wert }); return aus; }
  if (!wert || typeof wert !== 'object' || besucht.has(wert)) return aus;
  besucht.add(wert);
  if (Array.isArray(wert)) wert.forEach((w, i) => stringsMitPfad(w, pfad + '[' + i + ']', besucht, aus));
  else for (const k of Object.keys(wert)) stringsMitPfad(wert[k], pfad + '.' + k, besucht, aus);
  return aus;
}

function aufgeloesteMarkeImDepot(daten, varianten) {
  const funde = [];
  for (const { pfad, text } of stringsMitPfad(daten)) {
    if (varianten.has(text)) {
      const v = varianten.get(text);
      funde.push({ pfad, kennung: v.kennung, marke: v.marke });
      continue;
    }
    if (text.length < MIN_ENTHALTEN_LAENGE) continue;
    for (const [satz, v] of varianten) {
      if (satz.length >= MIN_ENTHALTEN_LAENGE && text.includes(satz)) {
        funde.push({ pfad, kennung: v.kennung, marke: v.marke });
        break;
      }
    }
  }
  return funde;
}

module.exports = { aufgeloesteVarianten, stringsMitPfad, aufgeloesteMarkeImDepot, hatPlatzhalter, MIN_VORLAGE_TEXT };
