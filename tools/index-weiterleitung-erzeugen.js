'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   index-weiterleitung-erzeugen.js — U2-ADR-194, Auftrag (01.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND: `vivodepot-ios-test` (und jede Modul-App darin) liefert an ihrer
   Wurzel keine Datei ohne Namen — GitHub Pages verlangt dafür `index.html`,
   die keiner der Ausliefer-Wege bisher anlegte. Zwei Symptome, eine Ursache:
   ein Tester, der die Adresse kürzt/abtippt, bekommt einen echten 404 (nicht
   nur den App-Rückfall); und `sw.js`s Precache-Eintrag `'./'`
   (`SCHALE`, `sw.js`) scheitert beim Installieren aus demselben Grund — vom
   `.catch(() => undefined)` je Eintrag lautlos verschluckt (01.09.2026, live gemessen).

   DIE ENTSCHEIDUNG (01.09.2026, nicht die Produktentscheidung — im ADR so zu
   vermerken): eine MINIMALE `index.html`, die sofort auf das `vivodepot.html`
   DESSELBEN Verzeichnisses weiterleitet. Keine eigene Einstiegsseite mit
   eigenem Text/eigener Pflege — der einzige heutige Treffer für diesen Pfad
   ist eine gekürzte/abgetippte Adresse, die ohnehin zur App wollte.

   WARUM DIE SPRACHE AUS DER ZIELDATEI GELESEN WIRD, NICHT FEST VERDRAHTET:
   dieses Werkzeug kennt die Slugs nicht (die kennt nur der Aufrufer) und soll
   sie auch nicht kennen müssen — ein hartkodiertes Slug→Sprache-Register wäre
   eine zweite Quelle, die bei jeder neuen Modul-App von Hand nachgezogen werden
   müsste. Stattdessen: `<html lang="…">` aus der GERADE KOPIERTEN Zieldatei
   selbst lesen — spiegelt, was die Datei ÜBER SICH SELBST sagt, unabhängig
   davon, ob dieser Wert an anderer Stelle noch einen eigenen, unabhängig
   verfolgten Fehler trägt (bekannt: die englische Modul-App zeigt heute
   `lang="de"` — ein separat verfolgter, hier NICHT behobener Befund).

   Fehlt das Attribut ganz, wird NICHT geraten (weder "de" noch "en" als
   Default) — das wäre ein Vierter-Zustand-Fehler derselben Klasse wie in
   `tests/gitignoriert-pruefen.js`: ein unbekannter Zustand ist kein negatives
   ODER positives Ergebnis, er ist ein eigener, sichtbarer Fehlschlag. */
const fs = require('node:fs');

function indexWeiterleitungInhalt(vivodepotHtmlPfad) {
  const html = fs.readFileSync(vivodepotHtmlPfad, 'utf8');
  const lang = (html.match(/<html\s+lang="([^"]+)"/) || [])[1];
  if (!lang) {
    throw new Error('Kein <html lang="…"> in ' + vivodepotHtmlPfad + ' gefunden — Sprache der '
      + 'Weiterleitungsseite nicht bestimmbar. Kein Rate-Default (weder "de" noch "en").');
  }
  return '<!doctype html>\n'
    + '<html lang="' + lang + '">\n'
    + '<head>\n'
    + '<meta charset="utf-8">\n'
    + '<meta http-equiv="refresh" content="0; url=./vivodepot.html">\n'
    + '<title>Vivodepot</title>\n'
    + '</head>\n'
    + '<body>\n'
    + '<p><a href="./vivodepot.html">Vivodepot</a></p>\n'
    + '</body>\n'
    + '</html>\n';
}

module.exports = { indexWeiterleitungInhalt };
