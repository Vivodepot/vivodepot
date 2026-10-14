'use strict';
/* Befund PLATZHALTER-NACH-REINTEXT-PRUEFUNG: geprüft wurde ein Text, gesetzt ein anderer.
   Die Reiner-Text-Regel prüft beim Einlass den Satz, wie er im Sprachmodul steht. `{beschriftung:x}` und `{marke}` werden erst
   beim Lesen eingesetzt. »<{beschriftung:x}« und der Zieltext »img src=q onerror=…>« bestehen einzeln und ergaben gelesen ein
   Tag, in jeder Senke, die einen STRINGS-Text ohne Maskierung setzt. Jetzt gilt die Regel für das Ergebnis, an der einen Stelle,
   durch die beide Leser gehen (_textsatzAufgeloest). Je Auflösungsart ein Fall, je mit Rot-Beweis.
   GERÜST-TEST im Sinne des Wächters: die Rot-Beweise laden eine geänderte Kopie des schon gebackenen englischen Produkts,
   ladeKern backt nichts dazu (`blank: true`). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const LOAD = require.resolve('./load-kern.js');
const ZIEL = 'img src=q onerror=alert(9)>';
const roh = (s) => /<img src=q /.test(String(s || ''));
const OHNE_FIX = [["  if (html || text === roh || _istReinerText(text)) return text;\n  return roh;", "  return text;"]];

/* Das englische Produkt, wahlweise aus einem geänderten Text (Rot-Beweis). */
function kern(ersetzungen) {
  if (!ersetzungen) return require(LOAD).ladeKern({ produkt: 'privat-en' }).V;
  const produktPfad = require('./produkt-html-erzeugen.js').produktHtml('privat-en');
  let text = fs.readFileSync(produktPfad, 'utf8');
  for (const [alt, neu] of ersetzungen) {
    assert.equal(text.split(alt).length - 1, 1, 'Anker steht genau einmal: ' + alt.slice(0, 60));
    text = text.replace(alt, neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'platzhalter-'));
  fs.writeFileSync(path.join(dir, 'vivodepot.html'), text);
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(dir, 'vivodepot.html');
  delete require.cache[LOAD];
  try { return require(LOAD).ladeKern({ blank: true }).V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD];
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
function mitSprachmodul(V, texte, marke) {
  const d = V.leeresDepot();
  d.textsprache = 'en';
  d.textsatzModule = [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte }];
  if (marke) d.brandingModule = [{ modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: marke }];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  return V;
}
const BESCHRIFTUNG = { 'strings:bereichLeer.text': 'Nothing here <{beschriftung:navWeitergeben}', 'strings:navWeitergeben.text': ZIEL };
const MARKE = { 'strings:bereichLeer.text': 'Nothing here <{marke}' };

test('[Platzhalter·Beschriftung] zwei Texte, die einzeln reiner Text sind, ergeben gelesen kein Tag', () => {
  const V = mitSprachmodul(kern(), BESCHRIFTUNG);
  assert.equal(V.STRINGS.navWeitergeben, ZIEL, 'Vorbedingung: der Zieltext ist eingelassen (er ist einzeln reiner Text)');
  const t = V.STRINGS.bereichLeer;
  assert.ok(!roh(t), 'kein Tag im gelesenen Satz: ' + t);
  assert.ok(t.includes('{beschriftung:navWeitergeben}'), 'der Platzhalter bleibt sichtbar stehen: ' + t);
});
test('[Platzhalter·Beschriftung·Rot-Beweis] ohne die Prüfung des Ergebnisses entsteht das Tag', () => {
  const V = mitSprachmodul(kern(OHNE_FIX), BESCHRIFTUNG);
  assert.ok(roh(V.STRINGS.bereichLeer), 'der Stand vor dem Fix: ' + V.STRINGS.bereichLeer);
});

test('[Platzhalter·Marke] ein Markenname, der einzeln reiner Text ist, ergibt hinter »<« kein Tag', () => {
  const V = mitSprachmodul(kern(), MARKE, ZIEL);
  assert.equal(V._markeName(), ZIEL, 'Vorbedingung: der Markenname gilt (er ist einzeln reiner Text)');
  const t = V.STRINGS.bereichLeer;
  assert.ok(!roh(t), 'kein Tag im gelesenen Satz: ' + t);
  assert.ok(t.includes('{marke}'), 'der Platzhalter bleibt sichtbar stehen: ' + t);
});
test('[Platzhalter·Marke·Rot-Beweis] ohne die Prüfung des Ergebnisses entsteht das Tag', () => {
  const V = mitSprachmodul(kern(OHNE_FIX), MARKE, ZIEL);
  assert.ok(roh(V.STRINGS.bereichLeer), 'der Stand vor dem Fix: ' + V.STRINGS.bereichLeer);
});

test('[Platzhalter] ein gewöhnlicher Verweis und ein gewöhnlicher Markenname lösen weiter auf', () => {
  const V = mitSprachmodul(kern(), { 'strings:bereichLeer.text': 'See {beschriftung:navWeitergeben} at {marke}', 'strings:navWeitergeben.text': 'Hand over' }, 'Bank & Co');
  assert.equal(V.STRINGS.bereichLeer, 'See Hand over at Bank & Co');
});

test('[Platzhalter·HTML-Satz] in einem Satz, der HTML sein darf, steht eine eingesetzte Beschriftung maskiert', () => {
  const V = mitSprachmodul(kern(), { 'strings:pvToolbarHinweis.text': '<p class="pv-dok-hinweis">{beschriftung:navWeitergeben}</p>', 'strings:navWeitergeben.text': 'a < b > c' });
  const t = V.textLesen('strings:pvToolbarHinweis.text');
  assert.equal(t, '<p class="pv-dok-hinweis">a &lt; b &gt; c</p>');
});

/* Der letzte Zweig von _textsatzAufgeloest gibt den Satz selbst zurück, wenn das Ergebnis kein reiner Text ist. Für einen
   eingelassenen Satz ist das der Satz, den der Einlass geprüft hat. Für die mitgelieferten Sätze hält diese Probe, dass
   keiner außerhalb der Liste der Markup-Sätze die Regel verfehlt: der Zweig zeigt dann nie etwas anderes als reinen Text. */
test('[Platzhalter·Bestand] kein mitgelieferter Satz außerhalb der Markup-Liste verfehlt die Reiner-Text-Regel', () => {
  const kernText = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const muster = /const _TAG_ODER_REFERENZ = (\/.*\/);/.exec(kernText);
  const liste = /const _TEXTSATZ_HTML_ERLAUBT = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(kernText);
  assert.ok(muster && liste, 'Testvoraussetzung: Muster und Liste stehen im Kern');
  const TAG = new RegExp(muster[1].slice(1, -1));
  const erlaubt = new Set(liste[1].match(/'strings:[A-Za-z0-9]+\.text'/g).map((s) => s.slice(1, -1)));
  assert.ok(erlaubt.size >= 1, 'Testvoraussetzung: die Liste ist besetzt');
  let saetze = 0;
  for (const datei of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const modul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', datei), 'utf8'));
    for (const [kennung, text] of Object.entries(modul.texte || {})) {
      if (typeof text !== 'string') continue;
      saetze++;
      if (!erlaubt.has(kennung)) assert.ok(!TAG.test(text), datei + ' ' + kennung + ': kein reiner Text und nicht in der Liste');
    }
  }
  assert.ok(saetze > 1000, 'Testvoraussetzung: die Sätze beider Sprachen wurden gelesen, gelesen: ' + saetze);
});
