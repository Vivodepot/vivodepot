'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-260 Posten 1 (04.09.2026, Auftrag) — die Transparenz-Zusage in
   der Fußzeile verlinkt kein Ziel mehr, das es nicht gibt
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, selbst nachgemessen (04.09.2026, `gh repo view vivodepot/vivodepot`):
   das verlinkte Repository ist PRIVAT und LEER — angelegt am 30.05.2026,
   `pushedAt` gleich dem Anlege-Zeitpunkt, nie ein Push. Die Fußzeile rendert
   den Link dauerhaft und nicht wegklickbar; er reist in jeder byte-identischen
   Kopie mit, auch in jeder Modul-App, die ein Herausgeber an seine Kunden
   liefert. Eine Zusage, die ins Nichts zeigt, ist schlechter als keine.

   WAS DIESER TEST HÄLT — zwei Aussagen, beide am gerenderten Fuß gemessen,
   nicht an der Quelle:
     1. Der Fuß trägt die Transparenz-Zusage weiterhin (sie ist nicht still
        verschwunden — U2-ADR-097 führt sie als produkttragende Zusicherung).
     2. Sie ist kein Link mehr: kein `href` im Fuß zeigt auf ein Repository,
        und der Text selbst ist keine Adresse.

   DIE POSITIVKONTROLLE steht darunter: dieselbe Diskriminante, angesetzt auf
   den ALTEN Fuß (mit dem Link), muss rot werden. Ohne sie könnte dieser Test
   grün sein, weil er nichts misst.

   NICHT GEPRÜFT und bewusst nicht: ob das Repository irgendwann öffentlich
   wird. Das ist eine Produktentscheidung und hat kein Datum; der Test
   ist so gebaut, dass er in JEDEM Ausgang richtig bleibt — wird der Link je
   zurückgebaut, bricht er, und dann gehört das Ziel neu belegt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'u2-adr-260-fuss-pw';

/* Die Diskriminante, von Test UND Positivkontrolle genutzt: jedes href im Fuß,
   das auf einen Code-Hoster zeigt. Bewusst breiter als die eine gefundene
   Adresse — ein Umzug auf gitlab/codeberg/sourcehut wäre derselbe Fehler. */
const HOSTER = /href\s*=\s*"[^"]*(github|gitlab|codeberg|sourcehut|bitbucket)[^"]*"/i;
/* Und: der Zusage-Text selbst darf keine Adresse sein. Eine Adresse erkennt man
   an der Form `wort.tld/…`, nicht an einem bestimmten Hostnamen. */
const ADRESSFORM = /[\w-]+\.[a-z]{2,}\/[\w./-]/i;

async function fussHtml() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  return { V, html: document.getElementById('app-fuss').innerHTML };
}

test('[U2-ADR-260·Fuß] die Transparenz-Zusage steht weiterhin im Fuß', async () => {
  const { V, html } = await fussHtml();
  assert.ok(typeof V.STRINGS.fussQuellcode === 'string' && V.STRINGS.fussQuellcode.trim() !== '',
    'die Zusage darf nicht ersatzlos verschwinden — U2-ADR-097 führt sie als produkttragende Zusicherung');
  assert.ok(html.includes(V.STRINGS.fussQuellcode),
    'der Fuß rendert die Quellcode-Zusage nicht mehr');
});

/* NACHTRAG 24.09.2026 — das Ziel ist neu belegt, wie der Kopf es für diesen Fall vorsah: das Repository ist öffentlich
   (gemessen am 24.09.2026: main 505ee7fae, anonym HTTP 200; nachsehen: `curl -sI https://github.com/vivodepot/vivodepot`).
   Der Fuß verlinkt es wieder — und zwar GENAU dieses eine Ziel aus der Konstanten QUELLCODE_LINK, kein anderes Hoster-Ziel. */
test('[U2-ADR-260·Fuß·Nachtrag] die Zusage verlinkt genau das öffentliche Repository (QUELLCODE_LINK), kein anderes Hoster-Ziel', async () => {
  const { V, html } = await fussHtml();
  const ziele = [...html.matchAll(/href\s*=\s*"([^"]*(github|gitlab|codeberg|sourcehut|bitbucket)[^"]*)"/gi)].map((m) => m[1]);
  assert.deepEqual(ziele, [V.QUELLCODE_LINK], 'der Fuß verlinkt ein anderes Hoster-Ziel als QUELLCODE_LINK: ' + JSON.stringify(ziele));
  assert.equal(V.QUELLCODE_LINK, 'https://github.com/vivodepot/vivodepot');
});

test('[U2-ADR-260·Fuß] der Zusage-Text ist keine Adresse', async () => {
  const { V } = await fussHtml();
  assert.equal(ADRESSFORM.test(V.STRINGS.fussQuellcode), false,
    'fussQuellcode trägt wieder eine Adressform ("' + V.STRINGS.fussQuellcode + '") — '
    + 'eine Adresse im Text ist eine Zusage über ein Ziel, das dieser Test nicht prüfen kann');
});

test('[U2-ADR-260·Fuß·Positivkontrolle] dieselbe Diskriminante wird am ALTEN Fuß rot', () => {
  // Der Fuß, wie er bis zum 04.09.2026 gerendert wurde — wörtlich nachgebaut, nicht zitiert
  // aus der Quelle (die gibt es nicht mehr; ein Test, der seine eigene Quelle liest, misst nichts).
  const alterFuss = '<span class="ff-lizenz">Open Source · EUPL-1.2</span> · '
    + '<a href="https://github.com/vivodepot/vivodepot" target="_blank" rel="noopener noreferrer">'
    + 'github.com/vivodepot/vivodepot</a>';
  assert.equal(HOSTER.test(alterFuss), true,
    'die Hoster-Diskriminante findet den alten Link nicht — sie misst nichts');
  assert.equal(ADRESSFORM.test('github.com/vivodepot/vivodepot'), true,
    'die Adressform-Diskriminante erkennt die alte Adresse nicht — sie misst nichts');
  // Gegenprobe zur Gegenprobe: der NEUE Text darf nicht schon an der Adressform scheitern,
  // sonst wäre die Diskriminante zu grob und der Test oben grün aus dem falschen Grund.
  assert.equal(ADRESSFORM.test('Quellcode auf Anfrage'), false);
  assert.equal(ADRESSFORM.test('Source code on request'), false);
  assert.equal(ADRESSFORM.test('Quellcode auf GitHub'), false);
  assert.equal(ADRESSFORM.test('Source code on GitHub'), false);
});
