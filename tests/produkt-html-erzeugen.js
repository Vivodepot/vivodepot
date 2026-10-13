'use strict';
/* Baut ein konfektioniertes Produkt (wie tools/vier-produkte-erzeugen.js) und liefert den Pfad seiner
   vivodepot.html. Seit S1 (U2-ADR-426) trägt das Gerüst keinen vollen englischen Satz; Tests, die
   „Englisch ist aktiv" am ERZEUGTEN Produkt messen, laden ihn über KERN_HTML_PATH aus dem englischen Produkt. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const zwischen = new Map();
function _bauArgumente(slug) {
  const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  const p = PRODUKTE.find((x) => x.slug === slug);
  // Der Ordner lebt so lange wie der Prozess (zwischen hält den Pfad); beim Ende wird er geräumt (Befund TEMP-RESTE-WIEDER).
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-html-' + slug + '-'));
  process.once('exit', () => fs.rmSync(ziel, { recursive: true, force: true }));
  return { ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(p) };
}
/* Das Produkt, wie es ausgeliefert wird: ohne window.__vdOeffentlich (U2-ADR-494). Für Byte-, Text- und jsdom-Proben. */
function produktHtml(slug) {
  if (!zwischen.has(slug)) {
    const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
    zwischen.set(slug, path.join(konfektionieren(_bauArgumente(slug)).ordner, 'vivodepot.html'));
  }
  return zwischen.get(slug);
}
/* Die Testfassung desselben Produkts: mit der Fläche. Für Proben, die das Produkt im Browser über die Fläche bedienen.
   Eine eigene Funktion, damit tools/testflaeche-klasse-pruefen.js je Funktion sieht, wer welches Produkt baut. */
function produktHtmlTestfassung(slug) {
  const k = slug + '#testfassung';
  if (!zwischen.has(k)) {
    const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
    zwischen.set(k, path.join(konfektionieren({ ..._bauArgumente(slug), mitTestflaeche: true }).ordner, 'vivodepot.html'));
  }
  return zwischen.get(k);
}
const LADER = path.join(__dirname, 'load-kern.js');

/* Lädt den Kern einer beliebigen vivodepot.html (KERN_HTML_PATH), leert den Cache davor und danach und
   setzt die Umgebung zurück. Liefert das Ergebnis von ladeKern(): { V, document, window, ... }. */
function kernAus(html, opts) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = html;
  delete require.cache[require.resolve(LADER)];
  try { return require(LADER).ladeKern(opts); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LADER)];
  }
}

/* Produktwechsel, Ausgangsseite: legt im Produkt `slug` ein Depot an, ruft `vorbereiten(V)` (z. B.
   Felder setzen; darf async sein) und serialisiert es über den echten Schreibweg. Liefert { V, umschlag }. */
async function depotImProduktAnlegen(slug, passwort, vorbereiten) {
  const { V } = kernAus(produktHtml(slug));
  await V.depotAnlegen(passwort);
  if (vorbereiten) await vorbereiten(V);
  return { V, umschlag: await V.depotSerialisieren() };
}

/* Produktwechsel, Zielseite: bootet das Produkt `slug` und lädt den Umschlag über den echten Leseweg.
   Liefert { V, document, d } mit d = V.getData() nach dem Laden. */
async function depotImProduktLaden(slug, umschlag, passwort) {
  const { V, document } = kernAus(produktHtml(slug));
  await V.depotLaden(umschlag, passwort);
  return { V, document, d: V.getData() };
}

module.exports = { produktHtml, produktHtmlTestfassung, kernAus, depotImProduktAnlegen, depotImProduktLaden };
