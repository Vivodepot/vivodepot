'use strict';
/* Die Listenzeile wird länger (02.10.2026, Befund LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG): Jedes Unterfeld trägt jetzt seine
   Beschriftung, in Kern und Lese-App. Diese Probe hält fest, dass die längere Zeile nirgends abgeschnitten wird und keine Seite sprengt.
   1. Gesamt-PDF mit dem längsten Listenwert: jedes Listenfeld jedes Bereichs bekommt einen Eintrag, in dem jedes Unterfeld lang
      gefüllt ist. Jede Listenzeile des Modells steht vollständig im gezeichneten Text, und keine Zeile liegt unter dem Blattrand.
   2. Die Listenzeile auf dem Schirm bricht um: keine Regel für die Zeile (Kern und Lese-App) setzt nowrap, Ellipse oder
      overflow:hidden.
   3. Die A6-Notfallkarte zieht keine Listenzusammenfassung: Listen-Unterfelder kommen dort einzeln über den Selektor. Kommt ein
      Listenfeld als Ganzes auf die Karte, fällt diese Probe, und die Passform der Karte (tests/e2e/k3-notfallkarte-a6-passt.spec.js)
      ist neu zu prüfen.
   ROT-BEWEISE: Teil 1 mit einem Zeichenweg, der nur die erste Zeile eines Werts zeichnet; Teil 2 mit `white-space: nowrap` an der
   Zeile; Teil 3 mit einem Listenfeld in NOTFALL_KERN_FELDER. Alle drei per Hand geführt beim Bau (02.10.2026). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LOAD_KERN = require.resolve('./load-kern.js');

function produktKern() {
  const { _standardProduktBaken } = require(LOAD_KERN);
  const p = path.join(os.tmpdir(), 'listen-ausgabe-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(p, _standardProduktBaken(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')));
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = p;
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern({ blank: true }).V; } finally {   // die umgelenkte Datei ist schon gebacken (_standardProduktBaken) — so laden, wie sie ist
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
    fs.rmSync(p, { force: true });
  }
}

// Stub mit echtem Umbruch, wie tests/pdf-umbruch-je-zeile.test.js: je `proZeile` Zeichen eine Zeile.
function docMitUmbruch(proZeile) {
  let seiten = 1, aktuelle = 1;
  const gezeichnet = [];
  return {
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 }, getNumberOfPages: () => seiten },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {}, addImage() {},
    splitTextToSize(s) {
      s = String(s == null ? '' : s);
      if (!s) return [''];
      const raus = [];
      for (let i = 0; i < s.length; i += proZeile) raus.push(s.slice(i, i + proZeile));
      return raus;
    },
    addPage() { seiten += 1; aktuelle = seiten; },
    setPage(p) { aktuelle = p; },
    text(t, x, y) { (Array.isArray(t) ? t : [t]).forEach((z) => gezeichnet.push({ text: String(z), x, y, seite: aktuelle })); },
    _gezeichnet: () => gezeichnet,
    _seiten: () => seiten,
  };
}

const LANG = 'Aktenordner „Familie und Vorsorge“, Arbeitszimmer, unteres Regal links, hinter den Steuerunterlagen der letzten zehn Jahre';
function langerWert(uf) {
  if (uf.typ === 'checkbox') return true;
  if (uf.typ === 'datum') return '2026-03-14';
  if (uf.typ === 'ref' || uf.typ === 'refMehrfach') return undefined;   // Personen hängen am Register; ihr Name ist nicht der längste Wert
  if (Array.isArray(uf.optionen) && uf.optionen.length) {
    const laengste = uf.optionen.reduce((a, b) => (String(b.label || '').length > String(a.label || '').length ? b : a));
    return uf.typ === 'mehrfachauswahl' ? uf.optionen.map((o) => o.wert) : laengste.wert;
  }
  return LANG;
}

test('[Listen·Ausgabe] Gesamt-PDF mit dem längsten Listenwert: jede Listenzeile vollständig, keine unter dem Blattrand', async () => {
  const V = produktKern();
  await V.depotAnlegen('pw-listen-ausgabe');
  V.akteurSelbstErklaeren('Tester');
  let listen = 0;
  for (const b of V.bereicheAlle()) for (const se of b.sektionen || []) for (const f of se.felder || []) {
    if (f.typ !== 'liste' || !Array.isArray(f.unterFelder) || !f.unterFelder.length) continue;
    const e = {};
    for (const uf of f.unterFelder) { const w = langerWert(uf); if (w !== undefined) e[uf.id] = w; }
    try { V.listenEintragHinzufuegen(b.id, f.id, e); listen++; } catch (_) { /* abgeleitete Listen nimmt der Kern nicht an */ }
  }
  assert.ok(listen > 15, 'zu wenige Listenfelder gesetzt (' + listen + ') — Messweg kaputt?');

  const modell = V.vollDepotModell({ sensibel: true });
  const doc = docMitUmbruch(70);
  V.zeichneVollDepotPdf(doc, modell, V.vollDepotPdfMeta());
  const alles = doc._gezeichnet().map((g) => g.text).join('');
  const werte = JSON.stringify(modell).match(/"wert":"((?:[^"\\]|\\.)*)"/g).map((m) => JSON.parse(m.slice(7)))
    .filter((w) => w.includes(LANG.slice(0, 30)));
  assert.ok(werte.length > 15, 'zu wenige Listenzeilen im Modell (' + werte.length + ')');
  const fehlt = werte.filter((w) => !alles.includes(w));
  assert.deepEqual(fehlt.slice(0, 3), [], fehlt.length + ' Listenzeilen nicht vollständig gezeichnet');
  // Nur die Zeilen der Listenwerte; Kopf und Fuß liegen gewollt in den Rändern.
  const unten = doc._gezeichnet().filter((g) => g.text.length > 5 && werte.some((w) => w.includes(g.text)) && g.y + 13 > 842 - 48);
  assert.deepEqual(unten.slice(0, 3), [], 'Zeilen eines Listenwerts unter dem Blattrand');
  assert.ok(doc._seiten() > 1, 'der längste Listenwert füllt mehr als eine Seite, sonst prüft der Rand nichts');
});

test('[Listen·Ausgabe] die Listenzeile bricht auf dem Schirm um, in Kern und Lese-App', () => {
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const css = fs.readFileSync(path.join(REPO, datei), 'utf8').match(/<style[^>]*>[\s\S]*?<\/style>/g).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    const regeln = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => /liste-eintraege\s+li|liste-eintrag-zusammenfassung/.test(sel));
    assert.ok(regeln.length > 0, datei + ': keine Regel für die Listenzeile gefunden — Messweg kaputt?');
    for (const [, sel, rumpf] of regeln) {
      assert.doesNotMatch(rumpf, /white-space\s*:\s*nowrap|text-overflow\s*:\s*ellipsis|overflow\s*:\s*hidden|-webkit-line-clamp/,
        datei + ': „' + sel.trim() + '“ schneidet die Listenzeile ab');
    }
  }
});

test('[Listen·Ausgabe] die A6-Notfallkarte zieht keine ganze Listenzusammenfassung', () => {
  const V = produktKern();
  const ganzeListen = V.NOTFALL_KERN_FELDER.filter((e) => { const f = V.feldDefFuer(e.sektor, e.feld); return f && f.typ === 'liste'; });
  assert.deepEqual(ganzeListen.map((e) => e.sektor + '.' + e.feld), [], 'Listenfeld als Ganzes auf der A6-Karte — Passform neu prüfen');
});
