'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Datenschutzerklärung ist aus der App erreichbar (26.09.2026, v805)
   ────────────────────────────────────────────────────────────────────────
   Einstellungen → Rechtliches trägt unter dem Impressum einen Link auf die
   Datenschutzerklärung der Webseite, je Sprache ein Ziel (DATENSCHUTZ_LINK;
   die Webseite wählt die Sprache über ?lang). Fehlt einer Sprache die eigene
   Seite, zeigt sie auf die deutsche und muss das im Linktext sagen.
   Nur ein Link: kein Nachladen, die Offline-Zusage bleibt.
   Die Klassenprobe: zeigt eine Sprache auf die deutsche Seite, nennt ihr
   Linktext das — sonst verspräche der Link etwas, das die Seite nicht hält.
   ROT-BEWEIS: der Abschnitt ohne die Zeile, und ein englischer Linktext ohne
   den Hinweis auf die deutsche Seite.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');

function linkBefund(html, ziel, text) {
  const befund = [];
  const m = html.match(/<a class="herkunft-datenschutz-link" href="([^"]*)" target="_blank" rel="noopener noreferrer">([^<]*)<\/a>/);
  if (!m) return ['kein Datenschutz-Link im Abschnitt Rechtliches'];
  if (m[1] !== ziel) befund.push('Ziel ' + m[1] + ' statt ' + ziel);
  if (m[2] !== text) befund.push('Linktext „' + m[2] + '“ statt „' + text + '“');
  if (html.indexOf('herkunft-datenschutz-link') < html.indexOf('herkunft-impressum-link')) befund.push('steht nicht unter dem Impressum');
  return befund;
}

function sprachhinweisBefund(links, texte) {
  // Eine Sprache, deren Ziel die deutsche Seite ist, muss das im Linktext sagen.
  return Object.keys(links).filter((s) => s !== 'de' && links[s] === links.de && !/\bGerman\b|\bDeutsch/i.test(texte[s] || ''))
    .map((s) => s + ': zeigt auf die deutsche Seite, der Linktext sagt es nicht');
}

for (const [produkt, sprache] of [['privat-de', 'de'], ['privat-en', 'en']]) {
  test('[Datenschutz-Link·' + sprache + '] Einstellungen → Rechtliches verlinkt die Datenschutzerklärung', () => {
    const { V } = kernAus(produktHtml(produkt));
    assert.equal(V.textsatzSpracheAktiv(), sprache, 'Vorbedingung: das Produkt spricht ' + sprache);
    assert.match(V.DATENSCHUTZ_LINK[sprache], /^https:\/\/vivodepot\.de\//);
    assert.deepEqual(linkBefund(V.einstellungenHTML(), V.DATENSCHUTZ_LINK[sprache], V.escapeHTML(V.STRINGS.herkunftDatenschutzLink)), []);
  });
}

test('[Datenschutz-Link] zeigt EN auf die deutsche Seite, sagt der englische Linktext das', () => {
  const { V: de } = kernAus(produktHtml('privat-de'));
  const { V: en } = kernAus(produktHtml('privat-en'));
  assert.deepEqual(sprachhinweisBefund(de.DATENSCHUTZ_LINK, { de: de.STRINGS.herkunftDatenschutzLink, en: en.STRINGS.herkunftDatenschutzLink }), []);
});

test('[Datenschutz-Link·Rot-Beweis] fehlt die Zeile, oder fehlt der Hinweis auf die deutsche Seite, fällt die Probe', () => {
  const { V } = kernAus(produktHtml('privat-de'));
  const html = V.einstellungenHTML();
  const ohne = html.replace(/<p class="einst-zeile"><a class="herkunft-datenschutz-link"[^]*?<\/p>/, '');
  assert.notEqual(ohne, html, 'Vorbedingung: die Zeile steht da');
  assert.deepEqual(linkBefund(ohne, V.DATENSCHUTZ_LINK.de, V.escapeHTML(V.STRINGS.herkunftDatenschutzLink)), ['kein Datenschutz-Link im Abschnitt Rechtliches']);
  const gleich = { de: V.DATENSCHUTZ_LINK.de, en: V.DATENSCHUTZ_LINK.de };
  assert.equal(sprachhinweisBefund(gleich, { de: 'Datenschutzerklärung', en: 'Privacy policy' }).length, 1);
  assert.equal(sprachhinweisBefund(gleich, { de: 'Datenschutzerklärung', en: 'Privacy policy (in German)' }).length, 0);
});
