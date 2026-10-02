'use strict';
/* tools/platzhalter-pruefen.js (26.09.2026): kein ausgeliefertes HTML trägt einen Platzhalter. Anlass: das eingebaute Impressum
   des Vorlagen-Generators stand live mit „Name vor der Freigabe einsetzen". Gehalten wird der Bestand (jede versionierte HTML-Datei
   außerhalb von tests/ und die Seite von register.vivodepot.de); Rot-Beweis am Wortlaut des Funds, und die Gegenprobe, dass
   Kommentare und eingebettete Daten nicht zählen. */
// nur-privat: der Generator geht nicht in den Zuschnitt; nur die Vorbedingung, dass er mitgeprüft wird, läuft privat.
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const P = require('../tools/platzhalter-pruefen.js');

test('[Platzhalter] kein ausgeliefertes HTML trägt einen Platzhalter — App, Lese-App, Generator, Werkzeuge, Register-Seite', () => {
  const { dateien, funde } = P.bestandPruefen();
  assert.ok(dateien >= 6, 'ausgelieferte Dateien gefunden: ' + dateien);
  assert.deepEqual(funde, []);
});

test('[Platzhalter·Generator] der Template-Generator gehört zum geprüften Bestand', () => {
  assert.ok(P.ausgelieferteDateien().includes('vivodepot-studio.html'));   // zuschnitt-privat: nur-privat-Test
});

test('[Platzhalter·Rot-Beweis] der Fund vom 26.09.2026 und jede Sorte Platzhalter werden gefunden', () => {
  const fund = "'Vertretungsberechtigt: die Geschäftsführung (Name vor der Freigabe einsetzen). Verantwortlich nach § 18 Abs. 2 MStV: (Name vor der Freigabe einsetzen)',";
  assert.equal(P.pruefen('<script>const t = [' + fund + '];</script>', 'probe').length, 1);
  assert.equal(P.pruefen('<p>the managing director (insert name before release)</p>', 'probe').length, 1);
  for (const s of ['<p>[BITTE Anschrift ergänzen]</p>', '<p>Lorem ipsum dolor</p>', '<p>Kontakt: TODO</p>', '<p>Telefon XXX</p>', '<p>FIXME</p>']) {
    assert.equal(P.pruefen(s, 'probe').length, 1, 'nicht gefunden: ' + s);
  }
});

test('[Platzhalter·Gegenprobe] Kommentare und eingebettete Daten zählen nicht — dort stehen TODO und XXX im Kern', () => {
  const html = '<!-- TODO: später --><script>/* U2-ADR-XXX (Entwurf) */ const a = 1; // TODO offen\nconst u = "https://example.de/a";</script>'
    + '<style>@font-face { src: url("data:font/woff2;base64,AAAXXX+/TODO==") }</style><p>Alles fertig.</p>';
  assert.deepEqual(P.pruefen(html, 'probe'), []);
  assert.equal(P.pruefen('<script>const u = "https://x.de"; const t = "TODO";</script>', 'probe').length, 1, 'eine URL beendet die Prüfung nicht');
});
