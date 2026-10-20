'use strict';
/* vorlage-kreuzfassung.js — die Zellen der Kreuzfassungs-Messung für Vorlagen (12.10.2026)
   Eine Vorlage, die heute im Studio entsteht, muss in einem Kern von gestern entweder richtig gelesen oder als Ganzes
   abgewiesen werden, nie halb. Diese Datei hält fest, WELCHE Vorlagen gemessen werden und WAS je Sorte Kern gelten soll.
   Gemessen wird die Strukturprüfung des Kerns (`validateTemplate`), sonst nichts: Signaturprüfung, das Übersetzen der
   Felder und der Weg einer ab Werk mitgelieferten Vorlage liegen dahinter und sind hier NICHT gemessen.

   ZWEI SORTEN KERN:
     ohneLeser  ein Kern, der `formatFassung` und `nutzlastTyp` nicht kennt (alle vor dem Leser ausgelieferten).
                Er kann „zu neu“ nicht erkennen. Darum muss eine brechende Fassung ein Strukturmerkmal tragen, an dem er
                scheitert: sie lässt `felder` weg.
     mitLeser   ein Kern, der beide Felder liest.

   DER SCHLÜSSEL DER BRECHENDEN FASSUNG ist hier ein Platzhalter (FELDQUELLE_BRECHEND). Den wirklichen Namen legt fest,
   wer die erste brechende Fassung schreibt; gemessen wird hier nur, dass ein Kern ohne Leser eine Vorlage ohne `felder`
   als Ganzes abweist, gleich unter welchem anderen Schlüssel die Felder stehen.

   Erwartung je Zelle: 'angenommen' oder 'abgewiesen'. Eine dritte Antwort gibt es an dieser Prüfung nicht; „teilweise
   übernommen“ wäre erst dahinter zu sehen und ist nicht gemessen. */
const NUTZLAST_TYP = 'vivodepot-vorlage';
const FELDQUELLE_BRECHEND = 'felderAbFassung2';
const feld = () => ({ feldname: 'Beispielangabe', feldtyp: 'text', pflicht: false, bereich: 'identity' });

/* [Name, Vorlage, erwartet ohne Leser, erwartet mit Leser, Anmerkung] */
const ZELLEN = Object.freeze([
  ['alte Gestalt, ohne beide Felder', () => ({ felder: [feld()] }), 'angenommen', 'angenommen',
    'jede vor dem Leser signierte Vorlage; gilt als Fassung 1'],
  ['neue Vorlage, Fassung 1', () => ({ nutzlastTyp: NUTZLAST_TYP, formatFassung: 1, felder: [feld()] }), 'angenommen', 'angenommen',
    'was das Studio heute schreibt; ein Kern ohne Leser überliest beide Felder'],
  ['Fassung 1 ohne Typfeld', () => ({ formatFassung: 1, felder: [feld()] }), 'angenommen', 'angenommen',
    'das Typfeld ist erst ab Fassung 2 Pflicht'],
  ['höhere Fassung, die nicht bricht', () => ({ nutzlastTyp: NUTZLAST_TYP, formatFassung: 2, felder: [feld()] }), 'angenommen', 'abgewiesen',
    'BENANNTE GRENZE: ein Kern ohne Leser nimmt sie an. Darum darf es so eine Fassung nicht geben: was die Zahl hebt, lässt `felder` weg'],
  ['brechende Fassung: ohne felder, Felder unter neuem Schlüssel', () => ({ nutzlastTyp: NUTZLAST_TYP, formatFassung: 2, [FELDQUELLE_BRECHEND]: [feld()] }), 'abgewiesen', 'abgewiesen',
    'das Strukturmerkmal: ein Kern ohne Leser findet keine Felder und weist die ganze Vorlage ab'],
  ['beide Feldquellen zugleich', () => ({ nutzlastTyp: NUTZLAST_TYP, formatFassung: 2, felder: [feld()], [FELDQUELLE_BRECHEND]: [feld()] }), 'angenommen', 'abgewiesen',
    'GEFÄHRLICHER FALL: ein Kern ohne Leser läse `felder`, einer mit Leser den neuen Schlüssel. Das Studio schreibt nie beide; wer gegenzeichnet, weist es ab'],
  ['Typfeld mit anderem Wert', () => ({ nutzlastTyp: 'vorlage', formatFassung: 1, felder: [feld()] }), 'angenommen', 'abgewiesen',
    'ein Kern ohne Leser prüft das Typfeld nicht'],
  ['Typfeld in anderer Schreibweise', () => ({ nutzlastTyp: 'Vivodepot-Vorlage', formatFassung: 1, felder: [feld()] }), 'angenommen', 'abgewiesen', ''],
  ['Typfeld zusammen mit modulTyp', () => ({ nutzlastTyp: NUTZLAST_TYP, modulTyp: 'anfrage', formatFassung: 1, felder: [feld()] }), 'angenommen', 'abgewiesen', ''],
  ['Fassung 2 ohne Typfeld', () => ({ formatFassung: 2, [FELDQUELLE_BRECHEND]: [feld()] }), 'abgewiesen', 'abgewiesen', ''],
  ['Fassung ist keine ganze Zahl ab 1', () => ({ nutzlastTyp: NUTZLAST_TYP, formatFassung: '1', felder: [feld()] }), 'angenommen', 'abgewiesen',
    'ein Kern ohne Leser sieht die Angabe nicht an'],
  // Gegenproben: was jeder Kern abweisen muss. Nähme ein Kern auch das an, mäße die Messung nichts.
  ['Gegenprobe: unbekannter Feldtyp', () => ({ felder: [Object.assign(feld(), { feldtyp: 'gibt-es-nicht' })] }), 'abgewiesen', 'abgewiesen', ''],
  ['Gegenprobe: leere Feldliste', () => ({ felder: [] }), 'abgewiesen', 'abgewiesen', ''],
]);

/* Eine Zelle an einem geladenen Kern messen. Rückgabe { urteil: 'angenommen' | 'abgewiesen' | 'wirft', grund }. */
function zelleMessen(V, vorlage) {
  try {
    const r = V.validateTemplate(vorlage);
    if (r === null || r === undefined || r === '' || r === false) return { urteil: 'angenommen', grund: null };
    return { urteil: 'abgewiesen', grund: (typeof r === 'string' ? r : JSON.stringify(r)).slice(0, 160) };
  } catch (e) { return { urteil: 'wirft', grund: String(e && e.message || e).split('\n')[0].slice(0, 160) }; }
}

/* Alle Zellen an einem Kern. `sorte` ist 'ohneLeser' oder 'mitLeser'. Rückgabe: Liste { zelle, erwartet, urteil, grund, passt }. */
function kernMessen(V, sorte) {
  if (sorte !== 'ohneLeser' && sorte !== 'mitLeser') throw new Error('Sorte ist ohneLeser oder mitLeser.');
  if (!V || typeof V.validateTemplate !== 'function') throw new Error('Dieser Kern hat keine Strukturprüfung für Vorlagen.');
  return ZELLEN.map(([zelle, bauen, ohne, mit]) => {
    const erwartet = sorte === 'ohneLeser' ? ohne : mit;
    const m = zelleMessen(V, bauen());
    return { zelle, erwartet, urteil: m.urteil, grund: m.grund, passt: m.urteil === erwartet };
  });
}

module.exports = { ZELLEN, NUTZLAST_TYP, FELDQUELLE_BRECHEND, zelleMessen, kernMessen };
