'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   Entwurfsmarken im Template-Generator — nichts mit Marke geht hinaus
   ──────────────────────────────────────────────────────────────────────────
   Die Rechtstexte des Generators (RECHTSTEXTE in vivodepot-template-generator.html) stehen als Entwürfe da: jeder trägt
   `entwurf: true`, eine Kennung und einen Stand, und der Dialog zeigt die Marke sichtbar über dem Text. Ein Text mit
   Marke ist nicht geprüft und gehört in keine Auslieferung (Register, Produkt, Signatur). Freigegeben ist ein Text erst,
   wenn `entwurf` auf false steht UND die Marke auch aus dem Wortlaut verschwunden ist.

   Diese Funktion misst am Quelltext, was noch nicht freigegeben ist. Sie liefert leer, wenn alles freigegeben ist.
   Gefunden wird:
     · `entwurf: true` an einem Text                                            → grund 'entwurf'
     · ein Text ohne `entwurf`-Angabe (Status unbekannt)                        → grund 'ohne-status'
     · das Wort ENTWURF/DRAFT im Wortlaut eines als frei geführten Textes       → grund 'marke-im-text'
   Aufgerufen von tools/register-ausliefern.js (bevor irgendetwas erzeugt wird) und von
   tests/rechtstexte-entwurf.test.js (mit Rot-Beweis).
   ══════════════════════════════════════════════════════════════════════════ */
const ANFANG = 'const RECHTSTEXTE = Object.freeze({';
const ENDE = 'const RECHT_REIHENFOLGE';

function regionAusQuelle(html) {
  const a = html.indexOf(ANFANG);
  const b = html.indexOf(ENDE, a);
  if (a < 0 || b < 0) return null;
  return html.slice(a + ANFANG.length, b);
}

function entwurfsmarkenIn(html) {
  const region = regionAusQuelle(html);
  if (region === null) return [];   // ein Generator ohne Rechtstexte (ältere Fassung) trägt keine Entwurfsmarke
  const funde = [];
  // Jeder Text beginnt mit `<schluessel>: { titel: [`; sein Rumpf reicht bis zum nächsten.
  const kopf = /^\s{2}([a-z]+): \{ titel:/gm;
  const starts = []; let m;
  while ((m = kopf.exec(region))) starts.push({ schluessel: m[1], von: m.index });
  starts.forEach((s, i) => {
    const rumpf = region.slice(s.von, i + 1 < starts.length ? starts[i + 1].von : region.length);
    const kennung = (/kennung:\s*'([^']+)'/.exec(rumpf) || [])[1] || s.schluessel;
    const flag = /entwurf:\s*(true|false)/.exec(rumpf);
    if (!flag) { funde.push({ kennung, grund: 'ohne-status' }); return; }
    if (flag[1] === 'true') { funde.push({ kennung, grund: 'entwurf' }); return; }
    // als frei geführt: dann darf im Wortlaut keine Marke mehr stehen
    const text = rumpf.slice(rumpf.indexOf('text: ['));
    if (/\b(ENTWURF|DRAFT)\b/.test(text)) funde.push({ kennung, grund: 'marke-im-text' });
  });
  return funde;
}

module.exports = { entwurfsmarkenIn, regionAusQuelle };
