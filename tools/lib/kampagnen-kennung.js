'use strict';
/* kampagnen-kennung.js — Herkunfts-Kennung ?von= an Links in den Dateien, die Menschen im Repository lesen (06.10.2026)
   Das Schema ?von=<kennung> zählt am Download-Gateway, woher ein Abruf kam; ohne Kennung zählt er „ohne“. Wer die Anwendung
   von GitHub oder openCoDE aus öffnet, liest README, QUICKSTART und die übrigen Dateien unten — beide Orte zeigen dieselbe
   Datei, darum trägt jeder Link dort dieselbe Kennung `github`.

   AUSGENOMMEN sind feste, maschinell gelesene Adressen: `/.well-known/`-Pfade (Vertrauensanker, Manifest-Orte), `$id`
   eines Schemas, `did:`-Kennungen und Mailadressen. Eine Query machte aus ihnen eine andere Adresse. */

const KENNUNG = 'github';

// Die Dateien, die Menschen im öffentlichen Repository lesen (Wurzel und Wegweiser).
const DATEIEN = Object.freeze([
  'README.md', 'README_en.md', 'QUICKSTART.md', 'QUICKSTART_en.md', 'DEVELOPING.md', 'CONTRIBUTING.md', 'FAQ.md',
  'SECURITY.md', 'LICENSING.md', 'DOCS.md', 'publiccode.yml', 'funding.json', 'CITATION.cff',
]);

// Feste Adressen, die keine Kennung tragen dürfen; je Muster ein Grund.
const AUSGENOMMEN = Object.freeze([
  { muster: /\/\.well-known\//, grund: 'Vertrauensanker und Manifest-Orte werden maschinell und wörtlich gelesen' },
]);

const LINK = /https?:\/\/(?:[a-z0-9-]+\.)*vivodepot\.(?:de|org)(?:[/?#][^\s)"'`<>\]]*)?/gi;

function ausgenommen(url) {
  return AUSGENOMMEN.some((a) => a.muster.test(url));
}

function hatKennung(url) {
  return /[?&]von=[a-z0-9-]+/.test(url);
}

/* Hängt ?von=<kennung> an einen vivodepot-Link; eine vorhandene Kennung bleibt, ein Anker (#…) bleibt hinten. */
function mitKennung(url, kennung = KENNUNG) {
  if (!/^https?:\/\/(?:[a-z0-9-]+\.)*vivodepot\.(?:de|org)(?:[/?#]|$)/i.test(url) || ausgenommen(url) || hatKennung(url)) return url;
  const [vorne, anker] = url.split('#');
  return vorne + (vorne.includes('?') ? '&' : '?') + 'von=' + kennung + (anker !== undefined ? '#' + anker : '');
}

/* Jeder vivodepot-Link im Text ohne die Kennung; Zeilen mit `$id` und `did:` zählen nicht (Schema- und DID-Kennungen). */
function linksOhneKennung(text, kennung = KENNUNG) {
  const aus = [];
  text.split('\n').forEach((zeile, i) => {
    if (/"\$id"\s*:|\bdid:/.test(zeile)) return;
    for (const m of zeile.matchAll(LINK)) {
      const url = m[0];
      // Sichtbarer Linktext in Markdown ([adresse](ziel)) ist kein Ziel; gezählt wird das Ziel in der Klammer.
      if (zeile[m.index - 1] === '[' && zeile.slice(m.index + url.length, m.index + url.length + 2) === '](') continue;
      if (ausgenommen(url)) continue;
      if (!new RegExp('[?&]von=' + kennung + '(?:[&#]|$)').test(url)) aus.push({ zeile: i + 1, url });
    }
  });
  return aus;
}

module.exports = { KENNUNG, DATEIEN, AUSGENOMMEN, mitKennung, linksOhneKennung };
