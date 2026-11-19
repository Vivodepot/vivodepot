'use strict';
/* Nachbildung der Häkchen im Herausgabe-Dialog (Entscheidung „Häkchen in Gruppen“, 17.11.2026) für Proben ohne echtes DOM.
   Der Dialog verdrahtet seine Häkchen über #modal-inhalt (flowExportUebersicht, oeffnen). Diese Box liefert je Häkchen ein
   Element mit `checked`, `getAttribute` und `onchange`; `umschalten` setzt ein Häkchen und ruft die Verdrahtung. */
const HAKEN = /<input type="checkbox" class="export-haken" id="([^"]+)" data-(sektor|zusatz)="([^"]+)"(?: data-feld="([^"]+)")?( checked)?>/g;

const ent = (s) => (s == null ? null : String(s).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

/** Die Häkchen im HTML: { id, sektor, feld, zusatz, gehalten }. */
function haekchenZeilen(html) {
  return [...String(html).matchAll(HAKEN)].map((m) => ({
    id: m[1], sektor: m[2] === 'sektor' ? ent(m[3]) : null, feld: ent(m[4]) || null, zusatz: m[2] === 'zusatz' ? ent(m[3]) : null, gehalten: !m[5],
  }));
}

/** Eine Box für #modal-inhalt aus dem HTML des Fensters. */
function haekchenBox(html) {
  const knoepfe = haekchenZeilen(html).map((z) => ({
    id: z.id, checked: !z.gehalten, onchange: null,
    getAttribute: (n) => (n === 'data-sektor' ? z.sektor : n === 'data-feld' ? z.feld : n === 'data-zusatz' ? z.zusatz : null),
  }));
  return {
    knoepfe,
    querySelector: () => null,
    querySelectorAll: (s) => (String(s).startsWith('input.export-haken') ? knoepfe : []),
  };
}

/** Setzt das Häkchen, dessen Attribut `attr` den Wert `wert` hat, auf `an` und ruft die Verdrahtung. */
function umschalten(box, attr, wert, an) {
  const b = box.knoepfe.find((x) => x.getAttribute(attr) === wert);
  if (!b) throw new Error('kein Häkchen mit ' + attr + '=' + wert);
  b.checked = !!an;
  b.onchange();
}

module.exports = { haekchenZeilen, haekchenBox, umschalten };
