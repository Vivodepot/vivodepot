'use strict';
/* Auswertung einer Durchklick-Aufnahme (tools/produkt-durchklick-messen.js), ohne Browser — damit die Suite sie
   prüfen kann, ohne Playwright zu laden (tests/schicht-1-ohne-lieferkette.test.js). */
/* Häufige deutsche Wörter, die in einem englischen Bürgertext nicht vorkommen. Bewusst OHNE Wörter, die es
   auch im Englischen gibt (name, person, block, kind, die, war, will, also) — sie erzeugten beim ersten
   Durchgang (17.09.2026) fast nur Fehlalarme. */
const DEUTSCHE_WOERTER = new Set(('und oder nicht keine kein keinen ist sind wird werden wurde mit für bei von zum zur '
  + 'der die das den dem des ein eine einen einem einer eines auch noch nur wie bitte ihre ihr ihnen sie wenn dann '
  + 'hier dort diese dieser dieses jetzt schon ohne über unter nach vor aus bis sowie sowohl '
  + 'angaben bereich bereiche datei dateien vorsorge testament erbschein vollmacht verfügung patientenverfügung '
  + 'betreuungsverfügung vorsorgevollmacht vorbereitungsauszug abschnitt eintrag einträge hinweis hinweise '
  + 'speichern öffnen schließen abbrechen weiter zurück hinzufügen löschen bearbeiten fertig ja nein '
  + 'amtlicher wortlaut amtliche fassung personen anschrift geburtsdatum vorname nachname '
  + 'betrieb gesellschaft geschäftsführer geschäftsführerin nachfolge übergabe kinder kind ehe ehepartner').split(/\s+/));
const UMLAUT = /[äöüÄÖÜß]/;

/* Die mechanischen Kandidaten je Sicht. */
function kandidaten(aufnahme) {
  const raus = [];
  for (const s of aufnahme.sichten) {
    const zeilen = s.text.split('\n').map((z) => z.trim()).filter(Boolean);
    if (aufnahme.sprache === 'en') {
      for (const z of new Set(zeilen)) {
        const woerter = z.split(/[^A-Za-zÄÖÜäöüß]+/).filter(Boolean);
        const deutsch = woerter.filter((w) => UMLAUT.test(w) || DEUTSCHE_WOERTER.has(w.toLowerCase()));
        if (deutsch.length) raus.push({ sicht: s.sicht, foto: s.foto, klasse: 'sprache-gemischt', wortlaut: z.slice(0, 220), treffer: [...new Set(deutsch)].slice(0, 6) });
      }
    }
    const gezaehlt = new Map();
    for (const h of s.ueberschriften) if (h.text) gezaehlt.set(h.text, (gezaehlt.get(h.text) || 0) + 1);
    for (const [t, n] of gezaehlt) if (n > 1) raus.push({ sicht: s.sicht, foto: s.foto, klasse: 'ueberschrift-doppelt', wortlaut: t, treffer: [n + '×'] });
    for (const h of s.ueberschriften) if (!h.text) raus.push({ sicht: s.sicht, foto: s.foto, klasse: 'ueberschrift-leer', wortlaut: '<' + h.tag + '>', treffer: [] });
    for (const z of new Set(zeilen)) {
      if (/\b(Block|Teil|Abschnitt|Section|Part)\s+\d+\s*[—–-]/.test(z)) raus.push({ sicht: s.sicht, foto: s.foto, klasse: 'nummerierung-intern', wortlaut: z.slice(0, 160), treffer: [] });
      const kenn = z.match(/\b[a-z]+(?:[A-Z][a-z0-9]+){1,}\b|\b[a-z]+\.[a-z][A-Za-z]+(?:\.[a-z][A-Za-z]+)+\b|\btpl_\w+|\{[a-zA-Z]+\}|\bundefined\b|\bnull\b|\bNaN\b|\[object \w+\]/g);
      if (kenn) raus.push({ sicht: s.sicht, foto: s.foto, klasse: 'kennung-oder-platzhalter', wortlaut: z.slice(0, 160), treffer: [...new Set(kenn)].slice(0, 6) });
    }
    if (s.leereIcons) raus.push({ sicht: s.sicht, foto: s.foto, klasse: 'icon-leer', wortlaut: s.leereIcons + ' leere Icon-Stellen', treffer: [] });
  }
  return raus;
}

module.exports = { kandidaten, DEUTSCHE_WOERTER };
