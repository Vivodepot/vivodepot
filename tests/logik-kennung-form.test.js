'use strict';
/* Befund LOGIK-KENNUNG-ROH-IM-TAG: die Kennung eines Logikmoduls stand als Attributname im Markup der Karte.
   `logikModulAuszugKartenHTML` setzt `data-<knopfAttr>` in den Knopf der Karte. Nennt das Modul kein eigenes `knopfAttr`, gilt
   `<kennung>-dokument`, und die Kennung hatte keine Form: mit Leerzeichen darin stand der Rest als eigenes Attribut im Tag.
   Ein Attributname lässt sich nicht maskieren. Darum zwei Stellen: die Kennung hat am Einlass eine Form
   (LOGIK_KENNUNG_MUSTER: Buchstaben, Ziffern, Bindestrich, Unterstrich), und die Karte entsteht nur mit einem Attributnamen
   in dieser Form. Groß- und Kleinbuchstaben und der Unterstrich bleiben erlaubt: das Studio nimmt die Kennung als freien Text an.
   GERÜST-TEST im Sinne des Wächters: die Rot-Beweise laden eine geänderte Kopie des schon gebackenen deutschen Produkts,
   ladeKern backt nichts dazu (`blank: true`). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LOAD = require.resolve('./load-kern.js');
const MODUL = path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json');
const BOESE = 'x onmouseover=alert(7) y';

function modul(id, mitKnopfAttr) {
  const b = JSON.parse(fs.readFileSync(MODUL, 'utf8'));
  b.id = id;
  if (mitKnopfAttr) b.dokAusgabe.knopfAttr = mitKnopfAttr; else delete b.dokAusgabe.knopfAttr;
  return b;
}
/* Der Kern, wahlweise aus einem geänderten Text (Rot-Beweis). */
function kern(ersetzungen) {
  if (!ersetzungen) return require(LOAD).ladeKern().V;
  let text = fs.readFileSync(require('./produkt-html-erzeugen.js').produktHtml('privat-de'), 'utf8');
  for (const [alt, neu] of ersetzungen) {
    assert.equal(text.split(alt).length - 1, 1, 'Anker steht genau einmal: ' + alt.slice(0, 60));
    text = text.replace(alt, neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logik-kennung-'));
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
async function einlassen(V, b) {
  await V.depotAnlegen('logik-kennung-pw-1');
  V.getData().logikModule = [];
  return V.modulEinlassen(JSON.stringify(b), V.getData(), null, null);
}

test('[Logik-Kennung] ein Modul mit einer Kennung außerhalb der Form wird nicht eingelassen', async () => {
  for (const id of [BOESE, 'a b', '9anfang', 'a"b', 'a>b', 'a=b', 'a/b', 'a.b', "a'b", ' rand-vorn', 'rand-hinten ', 'zeile\\numbruch'.replace('\\n', '\n')]) {
    const e = await einlassen(kern(), modul(id, null));
    assert.equal(e.angenommen, false, id);
    assert.equal(e.grund, 'id', id);
  }
});

test('[Logik-Kennung] eine Kennung in der Form wird eingelassen, die Karte trägt den abgeleiteten Attributnamen', async () => {
  // Auch Großbuchstaben und Unterstrich: eine im Studio frei vergebene Kennung funktioniert weiter.
  for (const id of ['fremd-probe', 'Mein_Auszug', 'PDF-Test-Sub-Depot']) {
    const V = kern();
    const b = modul(id, null);
    const e = await einlassen(V, b);
    assert.equal(e.angenommen, true, id + ': das Modul wird eingelassen — ' + (e.grund || ''));
    const h = V.logikModulAuszugKartenHTML(b.sektor);
    assert.ok(h.includes(' data-' + id + '-dokument>'), id + ': die Karte steht da: ' + h.slice(0, 300));
  }
});

test('[Logik-Kennung·Rot-Beweis] ohne die Formprüfung am Einlass hält die Karte: kein Knopf mit fremdem Attribut', async () => {
  const V = kern([[" || !LOGIK_KENNUNG_MUSTER.test(modul.id)) {", ") {"]]);
  const b = modul(BOESE, null);
  const e = await einlassen(V, b);
  assert.equal(e.angenommen, true, 'Vorbedingung: ohne die Formprüfung kommt das Modul herein — ' + (e.grund || ''));
  assert.ok(!V.logikModulAuszugKartenHTML(b.sektor).includes('onmouseover'), 'die Karte entsteht nicht');
});

test('[Logik-Kennung·Rot-Beweis] ohne beide Stellen steht das fremde Attribut im Tag', async () => {
  const V = kern([
    [" || !LOGIK_KENNUNG_MUSTER.test(modul.id)) {", ") {"],
    ["    if (!LOGIK_KENNUNG_MUSTER.test(logik.dokAusgabe.knopfAttr)) continue;", ""],
  ]);
  const b = modul(BOESE, null);
  const e = await einlassen(V, b);
  assert.equal(e.angenommen, true, 'Vorbedingung: das Modul kommt herein — ' + (e.grund || ''));
  assert.ok(V.logikModulAuszugKartenHTML(b.sektor).includes('data-x onmouseover=alert(7) y-dokument>'), 'der Stand vor dem Fix');
});

test('[Logik-Kennung] die ausgelieferten Logikmodule tragen eine Kennung in der Form', () => {
  const MUSTER = /^[A-Za-z][A-Za-z0-9_-]*$/;
  const kernText = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.ok(kernText.includes('const LOGIK_KENNUNG_MUSTER = ' + String(MUSTER) + ';'), 'Testvoraussetzung: dasselbe Muster wie im Kern');
  let n = 0;
  const lauf = (o, datei) => {
    if (Array.isArray(o)) { o.forEach((x) => lauf(x, datei)); return; }
    if (!o || typeof o !== 'object') return;
    if (o.dokAusgabe && typeof o.dokAusgabe === 'object' && typeof o.id === 'string') { n++; assert.match(o.id, MUSTER, datei + ': ' + o.id); }
    for (const v of Object.values(o)) lauf(v, datei);
  };
  for (const ordner of ['tools', path.join('tools', 'templates'), path.join('tests', 'fixtures')]) {
    for (const d of fs.readdirSync(path.join(REPO, ordner)).filter((x) => x.endsWith('.json'))) {
      const text = fs.readFileSync(path.join(REPO, ordner, d), 'utf8');
      if (!text.includes('"dokAusgabe"')) continue;
      let j = null; try { j = JSON.parse(text); } catch (e) { continue; }
      lauf(j, d);
    }
  }
  assert.ok(n >= 1, 'Testvoraussetzung: mindestens ein Logikmodul gefunden');
});

/* Befund LOGIK-KENNUNG-NUR-SCHREIBUNG-VERSCHIEDEN (NIEDRIG, offen): Groß- und Kleinbuchstaben sind in der Kennung erlaubt, der
   Browser schreibt Attributnamen aber klein. Zwei Module, deren Kennungen sich nur in der Schreibung unterscheiden, teilen
   sich darum das Attribut am Knopf ihrer Karte. Die Regel: der Einlass weist die zweite ab. */
async function zweiModuleNurSchreibungVerschieden() {
  const V = kern();
  await V.depotAnlegen('logik-kennung-pw-2');
  V.getData().logikModule = [];
  const erstes = V.modulEinlassen(JSON.stringify(modul('gleiche-kennung', null)), V.getData(), null, null);
  const zweites = V.modulEinlassen(JSON.stringify(modul('Gleiche-Kennung', null)), V.getData(), null, null);
  return { erstes, zweites };
}
test('[Logik-Kennung·Schreibung·Rot-Beweis] eine zweite Kennung, die sich nur in Groß- und Kleinschreibung unterscheidet, weist der Einlass ab',
  { todo: 'Befund LOGIK-KENNUNG-NUR-SCHREIBUNG-VERSCHIEDEN (NIEDRIG, Ratsche tools/befund-ratsche-eintraege): der Einlass vergleicht Kennungen heute genau; Rückkehr mit dem Wagen, der die zweite abweist' },
  async () => {
    const r = await zweiModuleNurSchreibungVerschieden();
    assert.equal(r.erstes.angenommen, true, 'Vorbedingung: das erste Modul wird eingelassen');
    assert.equal(r.zweites.angenommen, false, 'das zweite wird abgewiesen');
  });
test('[Logik-Kennung·Schreibung·Stolperdraht] solange das todo steht, nimmt der Einlass beide an', async () => {
  const r = await zweiModuleNurSchreibungVerschieden();
  assert.equal(r.erstes.angenommen && r.zweites.angenommen, true, 'der Einlass weist die zweite ab: das todo oben ist überholt');
});
