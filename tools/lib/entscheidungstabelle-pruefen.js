'use strict';
/* Gemeinsamer Baustein für „jeder Gegenstand steht in einer entschiedenen Zeile" (Gerüst-Schnitt, 20.09.2026).
   Reine Funktion, kein Dateizugriff. Der Aufrufer liefert den gemessenen Bestand und die Tabelle (Positivliste aus einer
   *-grundlinie.json). Schlüssel, die auf '/' enden, sind Präfixe und decken mehrere Bestandseinträge.
   Befunde: probeFehlt (Probe fehlt, Datei fehlt oder Testname nicht darin) · unentschieden (Bestand ohne Zeile) · veraltet (Zeile ohne Bestand) · ohneGrund (Art verlangt Grund) ·
   unbekannteArt · mehrdeutig (Bestand trifft mehrere Zeilen gleicher Länge). */

function zeileFuer(schluessel, eintraege) {
  if (Object.prototype.hasOwnProperty.call(eintraege, schluessel)) return schluessel;
  let bester = null;
  for (const k of Object.keys(eintraege)) {
    if (k.endsWith('/') && schluessel.startsWith(k) && (bester === null || k.length > bester.length)) bester = k;
  }
  return bester;
}

/* `probe` (`datei#testname`): ein Ausnahme-Eintrag zeigt auf eine Probe, nicht auf einen Satz. Geprüft wird nur, ob die
   Datei existiert und der Testname darin steht (`dateiLesen(pfad)` liefert den Text oder null); ob die Probe GRÜN läuft, trägt
   die Suite, der Wächter startet keine. `probePflichtFuer`: Arten, die eine Probe brauchen (Vorgabe: keine). */
function probeFehler(probe, dateiLesen) {
  if (typeof probe !== 'string' || probe.indexOf('#') < 1) return 'keine Probe (datei#testname erwartet)';
  const i = probe.indexOf('#');
  const text = dateiLesen(probe.slice(0, i));
  if (text === null || text === undefined) return 'Datei fehlt: ' + probe.slice(0, i);
  if (!text.includes(probe.slice(i + 1))) return 'Testname nicht in der Datei: ' + probe.slice(i + 1);
  return '';
}

function abdeckungPruefen({ bestand, eintraege, erlaubteArten, grundPflichtFuer, probePflichtFuer = [], dateiLesen = () => null }) {
  const befund = { unentschieden: [], veraltet: [], ohneGrund: [], unbekannteArt: [], mehrdeutig: [], probeFehlt: [] };
  const getroffen = new Set();
  for (const s of bestand) {
    const z = zeileFuer(s, eintraege);
    if (z === null) befund.unentschieden.push(s); else getroffen.add(z);
  }
  for (const [k, e] of Object.entries(eintraege)) {
    if (!getroffen.has(k)) befund.veraltet.push(k);
    if (!e || !erlaubteArten.includes(e.art)) { befund.unbekannteArt.push(k); continue; }
    if (grundPflichtFuer.includes(e.art) && !(typeof e.grund === 'string' && e.grund.trim())) befund.ohneGrund.push(k);
    if (probePflichtFuer.includes(e.art) || e.probe !== undefined) {
      const f = probeFehler(e.probe, dateiLesen);
      if (f) befund.probeFehlt.push(k + ': ' + f);
    }
  }
  return befund;
}

module.exports = { abdeckungPruefen, zeileFuer };
