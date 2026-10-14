'use strict';
/* Befund ATTRIBUTWERT-NUR-ANFUEHRUNGSZEICHEN: Werte aus Depot, Bereichsmodul oder Vorlage standen in Attributen der
   Eingabemasken, maskiert nur am Anführungszeichen (`"` → `&quot;`). Ein Ausbruch aus dem Attribut war so nicht möglich,
   aber `&`, `<`, `>` und der Apostroph standen roh im Markup, und ein Wert wie `a&lt;b` kam als `a<b` zurück.
   Jetzt läuft jeder solche Wert über escapeAttr. Eine Probe je Funktion, dazu der Wächter über die ganze Datei:
   kein Attributwert des Kerns wird mehr nur am Anführungszeichen maskiert, außer nach escapeHTML (dort ist es doppelt). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const WERT = 'a&lt;b <i>c</i> \'d\' "e"';
const MASKIERT = 'a&amp;lt;b &lt;i&gt;c&lt;/i&gt; &#39;d&#39; &quot;e&quot;';

test('[Attributwert] feldInputHTML: Beispiel, Optionswert und Freitext stehen vollständig maskiert im Attribut', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('attributwert-pw-1');
  const text = V.feldInputHTML({ id: 'f1', typ: 'text', label: 'Feld', beispiel: WERT }, '');
  assert.ok(text.includes(' placeholder="' + MASKIERT + '"'), 'Beispiel: ' + text);
  const auswahl = V.feldInputHTML({ id: 'f2', typ: 'auswahl', label: 'Feld', optionen: [{ wert: WERT, label: 'Eins' }] }, '');
  assert.ok(auswahl.includes('<option value="' + MASKIERT + '"'), 'Optionswert: ' + auswahl);
  const ref = V.feldInputHTML({ id: 'f3', typ: 'ref', entitaet: 'person', label: 'Feld' }, { ref: '', override: WERT });
  assert.ok(ref.includes(' value="' + MASKIERT + '"'), 'Freitext am Verweis: ' + ref);
  for (const h of [text, auswahl, ref]) assert.ok(!h.includes('<i>c</i>'), 'kein Wert roh');
});

test('[Attributwert] _refmZeileHTML (über ein Mehrfach-Verweisfeld): Anzeige und Bestand stehen vollständig maskiert im Attribut', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('attributwert-pw-2');
  const h = V.feldInputHTML({ id: 'f4', typ: 'refMehrfach', entitaet: 'person', label: 'Feld' }, [{ ref: '', override: WERT }]);
  assert.ok(h.includes('data-refm-zeile'), 'Testvoraussetzung: die Zeile wird gebaut — ' + h.slice(0, 200));
  assert.ok(h.includes(' value="' + MASKIERT + '"'), 'Anzeige: ' + h);
  assert.ok(h.includes(' data-refm-bestand-override="' + MASKIERT + '"'), 'Bestand: ' + h);
  assert.ok(!h.includes('<i>c</i>'), 'kein Wert roh');
});

/* Die Klasse: `….replace(/"/g, '&quot;')` als einzige Maskierung eines Attributwerts. Erlaubt bleibt es hinter escapeHTML
   (unschädlich, dort ist das Anführungszeichen schon maskiert) und in den Maskierfunktionen selbst. */
const NUR_ANFUEHRUNGSZEICHEN = /replace\(\/"\/g, '&quot;'\)/g;
function schwacheStellen(text) {
  const raus = [];
  text.split('\n').forEach((zeile, i) => {
    let m;
    NUR_ANFUEHRUNGSZEICHEN.lastIndex = 0;
    while ((m = NUR_ANFUEHRUNGSZEICHEN.exec(zeile)) !== null) {
      const davor = zeile.slice(0, m.index);
      if (/replace\(\/>\/g, '&gt;'\)\.$/.test(davor)) continue;                 // Teil einer vollen Maskierkette
      if (/escapeHTML\((?:[^()]|\([^()]*\))*\)\.$/.test(davor)) continue;        // hinter escapeHTML(…)
      raus.push(i + 1);
    }
  });
  return raus;
}
test('[Attributwert·Klasse] kein Wert im Kern wird nur am Anführungszeichen maskiert', () => {
  assert.deepEqual(schwacheStellen(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')), []);
});
test('[Attributwert·Klasse·Rot-Beweis] der Stand vor dem Fix wäre rot, die erlaubten Formen sind es nicht', () => {
  assert.deepEqual(schwacheStellen("h += '<option value=\"' + String(v.id).replace(/\"/g, '&quot;') + '\">';"), [1]);
  assert.deepEqual(schwacheStellen("x = ' value=\"' + override.replace(/\"/g, '&quot;') + '\">';"), [1]);
  assert.deepEqual(schwacheStellen("x = escapeHTML(String(feld.label)).replace(/\"/g, '&quot;');"), []);
  assert.deepEqual(schwacheStellen("return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');"), []);
});
