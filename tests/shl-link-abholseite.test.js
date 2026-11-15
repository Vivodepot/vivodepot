'use strict';
/* Der Link für Menschen trägt die Abholseite davor (14.11.2026). Vorher gab der Dialog „Sicher weitergeben“ (und „Link senden“)
   ein blankes shlink:/… aus; ein Klick darauf öffnete im Browser nichts, und der Hinweis „Über den Link kann die Datei
   heruntergeladen werden.“ wäre nicht wahr gewesen. Jetzt steht vor der URI die Abholseite (SHL_ABHOL_URL) mit #, wie es
   HL7 SMART Health Cards and Links IG 1.0.0 (STU 1), Health Links Specification, „Construct a SMART Health Link Payload“
   erlaubt („Optionally prefixed with a viewer URL that ends with #“).
   Belegt: [Link·Präfix] (angezeigter Link, Kopie und QR tragen dieselbe Form; nach dem # steht genau die URI aus shlUriBauen),
   [Link·Präfix·Schlüssel] (der Schlüssel steht nur nach dem #), [Empfang·Präfix] (shlLinkLesen liest den Link mit Präfix
   wie den blanken), [Link·Präfix·Rot-Beweis] (ein blanker Link wird als Verstoß erkannt). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ABLAGE = 'https://share.vivodepot.de/holen.php?t=' + 'a1'.repeat(24);

// Baut den Dialog mit Attrappen für Modal und Ergebnis, trägt die Adresse ein, bestätigt den Host und liefert den Link.
async function dialogFahren() {
  const { V, document } = ladeKern();
  await V.depotAnlegen('abholseite-pw-2026');
  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const erzeugt = [];
  const echtCreate = document.createElement.bind(document);
  document.createElement = (tag) => { const e = echtCreate(tag); erzeugt.push(e); return e; };
  const els = { datei: { onclick: null }, bauen: { onclick: null }, url: { value: '' }, ergebnis: echtCreate('div'), zeichen: { hidden: true }, pod: { onclick: null } };
  const echt = document.getElementById.bind(document);
  document.getElementById = (id) => {
    if (id !== 'modal-inhalt' || !modale.length) return echt(id);
    return {
      querySelector: (s) => ({ '#shl-datei': els.datei, '#shl-bauen': els.bauen, '#shl-url': els.url, '#shl-ergebnis': els.ergebnis, '#shl-yb-zeichen': els.zeichen, '#shl-pod': els.pod })[s] || null,
      querySelectorAll: () => [],
    };
  };
  const teile = { jwe: 'a.b.c.d.e', key: 'k'.repeat(43), label: 'Probe', exp: Math.floor(Date.UTC(2026, 10, 30) / 1000), weg: 'direkt' };
  V._shlDialogZeigen(teile, { titel: 'T', gueltigBis: V.STRINGS.shlGueltigBis, vorHTML: '' });
  els.url.value = ABLAGE;
  els.bauen.onclick();
  const ok = erzeugt.find((e) => e.id === 'shl-host-ok');
  if (ok) ok.onclick();
  const link = erzeugt.find((e) => e.id === 'shl-uri');
  return { V, teile, link: link ? String(link.textContent) : null };
}

// Der Verstoß gegen die Regel: ein Link für Menschen ohne Abholseite davor, oder mit einer anderen URI nach dem #.
function praefixVerstoesse(V, link, uri) {
  const raus = [];
  const soll = V.SHL_ABHOL_URL + '#';
  if (typeof link !== 'string' || !link.startsWith(soll)) raus.push('ohne Abholseite: ' + String(link).slice(0, 40));
  else if (link.slice(soll.length) !== uri) raus.push('nach dem # nicht die URI aus shlUriBauen');
  return raus;
}

test('[Link·Präfix] der Dialog gibt den Link mit der Abholseite davor aus; nach dem # steht die URI aus shlUriBauen', async () => {
  const { V, teile, link } = await dialogFahren();
  assert.ok(link, 'Positivkontrolle: der Dialog hat einen Link gebaut');
  assert.match(V.SHL_ABHOL_URL, /^https:\/\/[^#]+$/, 'die Abholseite ist eine https-Adresse ohne eigenes #');
  const uri = V.shlUriBauen(teile, ABLAGE);
  assert.ok(uri.startsWith('shlink:/'), 'shlUriBauen bleibt bei der blanken Protokollform');
  assert.deepEqual(praefixVerstoesse(V, link, uri), []);
  assert.equal(V.shlLinkMitAbholseite(uri), link);
  assert.equal(V.shlLinkMitAbholseite(link), link, 'ein Link mit Präfix bekommt keinen zweiten');
});

test('[Link·Präfix·Schlüssel] der Schlüssel steht nur nach dem #, den ein Browser nie mitschickt', async () => {
  const { link } = await dialogFahren();
  const i = link.indexOf('#');
  assert.ok(i > 0);
  const nutzlast = JSON.parse(Buffer.from(link.slice(i + 1 + 'shlink:/'.length).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.equal(nutzlast.key, 'k'.repeat(43));
  assert.ok(!link.slice(0, i).includes(nutzlast.key), 'vor dem # kein Schlüssel');
});

test('[Empfang·Präfix] shlLinkLesen liest den Link mit Abholseite wie den blanken', async () => {
  const { V, teile, link } = await dialogFahren();
  const blank = V.shlLinkLesen(V.shlUriBauen(teile, ABLAGE));
  const mit = V.shlLinkLesen(link);
  assert.ok(blank.teile, 'Positivkontrolle: der blanke Link ist lesbar');
  assert.deepEqual(mit, blank);
});

test('[Link·Präfix·Rot-Beweis] ein blanker Link für Menschen wird erkannt', async () => {
  const { V, teile } = await dialogFahren();
  const uri = V.shlUriBauen(teile, ABLAGE);
  assert.equal(praefixVerstoesse(V, uri, uri).length, 1, 'der frühere Stand (blankes shlink:/) ist ein Verstoß');
  assert.equal(praefixVerstoesse(V, V.SHL_ABHOL_URL + '#shlink:/anders', uri).length, 1);
});
