'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem Sichern: die Wege als ganze Listenzeilen, das Aktionswort rechts (Dummy 14.11.2026, Z. 202–211; P-1 a, b)
   ─────────────────────────────────────────────────────────────────
   (1) „Link kopieren“ ist eine ganze Zeile mit Untertext und „Kopieren“ rechts; ein Druck kopiert den Link des QR-Codes und
       das Wort heißt „Kopiert ✓“.
   (2) „Als Datei speichern“ und „Als PDF“ stehen als Zeilen in „Speichern“. Beide Dateien gehen beim Sichern schon
       hinaus; die Zeile sagt „Gespeichert ✓“ und speichert auf Druck noch einmal. Entstand das PDF nicht, steht die Zeile
       ohne Knopf mit dem Grund da.
   (3) Nach dem Sichern erscheint unten kein Hinweis über der Seite (bei 375 deckte er „Speichern“ zu); der Text
       bleibt für Vorleser in der Statuszeile.
   (4) Die Zeilen tragen das Listenbild des Dummys (.liste: Rand, Trennlinie, Aktionswort rechts).
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Wagen> node --test tests/studio-nach-sichern-wege-liste.test.js → rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const text = (b) => String(b.attrs.text != null ? b.attrs.text : b.kinder.filter((k) => typeof k === 'string').join(''));
const LINK = 'https://privat-de.vivodepot.de/v.html#t=abc';

function ergebnis(extra) {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  g.sandbox.vorlageErgebnisZeigen(Object.assign({ pdf: true, name: 'Bibliotheksausweis', stelle: 'Stadtbibliothek Probestadt', zahl: 2,
    qr: { art: 'inhalt', link: LINK, qr: { dataUrl: 'data:image/gif;base64,R0lGOD' } } }, extra || {}));
  const zeile = (id) => gebaut.find((b) => b.attrs.id === id);
  const wort = (z) => gebaut.find((b) => b.tag === 'span' && b.attrs.class === 'w' && z.kinder.includes(b.e));
  const inListe = (listeId, z) => gebaut.find((b) => b.attrs.id === listeId) && gebaut.findIndex((b) => b.attrs.id === listeId) < gebaut.indexOf(z);
  return { g, gebaut, zeile, wort, inListe };
}
function funktion(name) {
  const i = HTML.search(new RegExp('(?:async )?function ' + name + '\\('));
  return i < 0 ? '' : HTML.slice(i, HTML.indexOf('\n}\n', i) + 2);
}

test('[Wege · Liste 1] „Link kopieren“ als ganze Zeile mit „Kopieren“ rechts; ein Druck kopiert den Link der Vorlage, dann „Kopiert ✓“', async () => {
  const { g, zeile, wort } = ergebnis();
  const z = zeile('ns-weg-anfrage-link');
  assert.ok(z && z.tag === 'button' && z.attrs.class === 'ns-weg', '„Link kopieren“ ist keine Listenzeile');
  assert.equal(text(wort(z)), 'Kopieren');
  let kopiert = null;
  g.sandbox.textKopieren = async (t) => { kopiert = t; return true; };
  await z.attrs.onclick();
  assert.equal(kopiert, LINK, 'kopiert wird nicht der Link der Vorlage');
  assert.equal(wort(z).e.textContent, 'Kopiert ✓');
});

test('[Wege · Liste 2] „Als Datei speichern“ und „Als PDF“ in „Speichern“: „Gespeichert ✓“, ein Druck speichert noch einmal', async () => {
  let datei = 0, pdf = 0;
  const { zeile, wort, inListe } = ergebnis({ dateiSpeichern: () => { datei++; }, pdfSpeichern: () => { pdf++; } });
  for (const id of ['ns-weg-datei', 'ns-weg-pdf']) {
    const z = zeile(id);
    assert.ok(z && z.tag === 'button', id + ' ist keine Listenzeile mit Knopf');
    assert.ok(inListe('ns-liste-aufbewahren', z), id + ' steht nicht in „Vorlage aufbewahren“');
    assert.equal(text(wort(z)), 'Gespeichert ✓');
    await z.attrs.onclick();
  }
  assert.deepEqual([datei, pdf], [1, 1], 'die Zeilen speichern nicht noch einmal');
});

test('[Wege · Liste 2] ohne PDF steht die Zeile ohne Knopf mit dem Grund da', () => {
  const { gebaut, zeile } = ergebnis({ pdf: false, pdfFehler: 'Schrift fehlt', dateiSpeichern: () => {} });
  const z = zeile('ns-weg-pdf');
  assert.ok(z && z.tag === 'div', 'die PDF-Zeile ist trotz Fehler ein Knopf');
  assert.ok(gebaut.some((b) => b.attrs.class === 't' && /konnte nicht erstellt werden: Schrift fehlt/.test(text(b))));
});

test('[Wege · Liste 2] vorlageSichern übergibt die Datei und das PDF zum erneuten Speichern', () => {
  const f = funktion('vorlageSichern');
  assert.match(f, /dateiSpeichern\(\);/, 'die Datei geht beim Sichern nicht mehr hinaus');
  assert.match(f, /pdfSpeichern: r\.pdf \? \(\) => blobDownload\(r\.dateiname, r\.bytes, 'application\/pdf'\)/);
  assert.match(funktion('studioStandardUndPdfAusgeben'), /return \{ pdf: true, bytes, dateiname \};/);
});

test('[Wege · Liste 3] nach dem Sichern kein Hinweis über der Seite; der Text bleibt in der Statuszeile', () => {
  const f = funktion('vorlageSichern');
  const a = f.indexOf("c.setAttribute('data-ohne-hinweis', '1')"), b = f.indexOf("Vorlage gesichert: Als Datei");
  assert.ok(a > 0 && b > a, 'die Statuszeile wird nach dem Sichern noch als Hinweis gezeigt');
  assert.match(funktion('statusAlsMeldung'), /if \(chip\.hasAttribute\('data-ohne-hinweis'\)\) \{ chip\.removeAttribute\('data-ohne-hinweis'\); chip\.classList\.remove\('toast-an'\);/,
    'der Hinweis unten achtet nicht auf data-ohne-hinweis');
});

test('[Wege · Liste 4] Listenbild wie der Dummy: Rand, Trennlinie, Aktionswort rechts', () => {
  assert.match(HTML, /\n {2}\.ns-liste \{ --ns-linie: color-mix\(in srgb, var\(--salbei-dunkel\) 18%, transparent\); background: var\(--karte\); border: 1px solid var\(--ns-linie\); border-radius: 12px;/, 'die Liste trägt keinen sichtbaren Rand (--rand ist durchsichtig)');
  assert.match(HTML, /\n {2}\.ns-liste \.ns-weg \{ display: flex; width: 100%; text-align: left;[^}]*border-top: 1px solid var\(--ns-linie\);/, 'die Zeilen tragen keine sichtbare Trennlinie');
  assert.match(HTML, /\n {2}\.ns-liste \.ns-weg \.w \{ margin-left: auto;/);
});
