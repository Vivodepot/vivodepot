'use strict';
/* Eine Gruppenkarte mit einem frisch angelegten, noch leeren Listeneintrag steht offen.
   Seit jeder Abschnitt als Gruppenkarte erscheint, liegt auch die Liste der Vorsorgedokumente in einer Karte. Die Karte
   öffnete nur, wenn ein Feld einen Wert trug; ein neuer leerer Eintrag zählt nicht. Dann standen der Eintrag und
   „Weiteres Vorsorgedokument hinzufügen“ in einer zugeklappten Karte (Bürgerweg-Durchstich, listenDialogOeffnen).
   ROT-BEWEIS: der zweite Test nimmt die Listenbedingung heraus und sieht die Karte zu (als zugeklappt gemerkt, s. karteDerListe). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Die Karte, in der der Hinzufügen-Knopf einer Liste steht: ihr öffnendes <details …>-Tag. */
async function karteDerListe(opt, feldId) {
  const { V, document } = ladeKern(Object.assign({ produkt: 'privat-de' }, opt || {}));
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Maria');
  const b = V.bereicheAlle().find((x) => [].concat(...(x.sektionen || []).map((s) => s.felder || []), x.felder || []).some((f) => f && f.id === feldId));
  assert.ok(b, 'Bereich der Liste ' + feldId);
  await V.listenEintragHinzufuegen(b.id, feldId, {});
  const finde = () => {
    V.renderSektor(b.id);
    const html = String(document.getElementById('content').innerHTML);
    const i = html.indexOf('data-eintrag-hinzufuegen="' + feldId + '"');
    assert.ok(i > 0, 'Knopf „Weiteres … hinzufügen“ ist gerendert');
    const k = html.lastIndexOf('<details class="feldgruppen-karte"', i);
    assert.ok(k >= 0, 'die Liste steht in einer Gruppenkarte');
    return html.slice(k, html.indexOf('>', k) + 1);
  };
  /* Die Karte steht womöglich schon im Ruhezustand offen (die ersten Karten eines Bereichs, tests/feldgruppen-ruhezustand.test.js).
     Darum zuerst als zugeklappt gemerkt: offen hält sie dann allein der leere Eintrag. */
  const schluessel = /data-karte="([^"]*)"/.exec(finde());
  assert.ok(schluessel && V._kartenZustand, 'Karte trägt ihren Schlüssel');
  V._kartenZustand.set(schluessel[1], false);
  return finde();
}

test('[Gruppenkarte] ein neuer, leerer Eintrag der Vorsorgedokumente hält seine Karte offen', async () => {
  const tag = await karteDerListe(null, 'provisionInstruments');
  assert.match(tag, / open[ >]/, 'Karte offen: ' + tag);
});

test('[Gruppenkarte·Rot-Beweis] mit der alten Bedingung (nur Felder mit Wert) bleibt die Karte zu', async () => {
  const neu = /    const _offen = \(_gemerkt === null \? _abWerk : _gemerkt\) \|\|\n      _ids\.some\([^\n]*\n/;
  assert.equal((KERN.match(new RegExp(neu.source, 'g')) || []).length, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'gruppenkarte-offen-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(neu, '    const _offen = (_gemerkt === null ? _abWerk : _gemerkt);\n'));
  try {
    const tag = await karteDerListe({ htmlPfad: tmp, backen: true }, 'provisionInstruments');
    assert.doesNotMatch(tag, / open[ >]/, 'ohne die Listenbedingung ist die Karte zu — die Probe oben wäre rot');
  } finally { fs.unlinkSync(tmp); }
});
