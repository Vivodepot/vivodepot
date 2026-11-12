'use strict';
/* Befund SHL-GUELTIG-NAN (HOCH, 06.11.2026). Der Dialog eines Freigabe-Links („Sicher weitergeben“, „Link senden“) zeigte die
   Zeile „gültig bis …“ schon, bevor ein Link erzeugt war, gerechnet aus `teile.exp`. Fehlte die Ablaufzeit, stand dort
   „gültig bis NaN-NaN-NaN“ (Aufnahme der Gestaltungsleitung vom 06.11.2026, Dialog mit Teilen ohne Ablaufzeit geöffnet).
   Die Regel:
     (a) vor dem Erzeugen steht keine Gültig-Zeile, und nirgends im Dialog steht „NaN“;
     (b) nach dem Erzeugen steht das Datum der Ablaufzeit des erzeugten Links; ohne Ablaufzeit steht keine Zeile.
   Gegenprobe: das Datum, das die alte Fassung aus fehlender Ablaufzeit rechnete, ist „NaN-NaN-NaN“; die Probe erkennt es. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const rumpf = (name) => { const a = KERN.indexOf('function ' + name + '('); return KERN.slice(a, KERN.indexOf('\n}\n', a)); };

async function dialogVorDemErzeugen(teile, gueltigBis) {
  const { V, document } = ladeKern({ Blob });
  V._shlDialogZeigen(typeof teile === 'function' ? await teile(V) : teile, { titel: 'Sicher weitergeben', gueltigBis: gueltigBis(V) });
  return document.getElementById('modal-inhalt').innerHTML;
}

test('[SHL·Gültig·a] vor dem Erzeugen: keine Gültig-Zeile und kein NaN, mit und ohne Ablaufzeit, in beiden Dialogen', async () => {
  const faelle = [
    ['Sicher weitergeben, Teile ohne Ablaufzeit', [], (V) => V.STRINGS.shlGueltigBis],
    ['Sicher weitergeben, echte Teile', (V) => V.auszugLinkTeile(new Blob(['{"a":1}'], { type: 'application/json' }), { label: 'Befund' }), (V) => V.STRINGS.shlGueltigBis],
    ['Link senden, echte Teile', (V) => V.auszugLinkTeile(new Blob(['{"a":1}'], { type: 'application/json' }), { label: 'Krankenhaus' }), (V) => V.STRINGS.linkSendenGueltigBis],
  ];
  for (const [name, teile, satz] of faelle) {
    const html = await dialogVorDemErzeugen(teile, satz);
    assert.doesNotMatch(html, /NaN/, name + ': kein NaN');
    assert.doesNotMatch(html, /[Gg]ültig bis/, name + ': keine Gültig-Zeile vor dem Erzeugen');
    assert.match(html, /id="shl-bauen"/, name + ': Kontrolle, der Dialog ist offen');
  }
});

test('[SHL·Gültig·b] nach dem Erzeugen: das Datum der Ablaufzeit des Links; ohne Ablaufzeit keine Zeile', async () => {
  const { V } = ladeKern({ Blob });
  const teile = await V.auszugLinkTeile(new Blob(['{"a":1}'], { type: 'application/json' }), { label: 'Befund' });
  assert.ok(Number.isFinite(teile.exp), 'Kontrolle: echte Teile tragen eine Ablaufzeit');
  const erwartet = V.heuteLokal(new Date(teile.exp * 1000));
  const zeile = V._shlGueltigZeile(teile, V.STRINGS.shlGueltigBis);
  assert.ok(zeile.includes(erwartet), zeile);
  assert.doesNotMatch(zeile, /\{datum\}|NaN/);
  assert.equal(V._shlGueltigZeile({}, V.STRINGS.shlGueltigBis), '', 'ohne Ablaufzeit keine Zeile');
  assert.equal(V._shlGueltigZeile({ exp: 'morgen' }, V.STRINGS.shlGueltigBis), '', 'eine Ablaufzeit, die keine Zahl ist, gibt keine Zeile');
  // Der Knopf „Link erzeugen“ setzt die Zeile erst nach dem gebauten Link, als Text, nicht als HTML.
  const bauen = rumpf('_shlDialogZeigen');
  const a = bauen.indexOf('_shlLinkKopierenUndQr(out, uri)');
  const b = bauen.indexOf('_shlGueltigZeile(teile', a);
  assert.ok(a > 0 && b > a, 'die Gültig-Zeile entsteht nach dem gebauten Link');
  assert.doesNotMatch(bauen.slice(b, bauen.indexOf('\n', b)), /innerHTML/);
});

test('[SHL·Gültig·Gegenprobe] aus fehlender Ablaufzeit rechnet der Tag „NaN-NaN-NaN“, und die Probe erkennt ihn', () => {
  const { V } = ladeKern({ Blob });
  const alt = V.heuteLokal(new Date(undefined * 1000));
  assert.equal(alt, 'NaN-NaN-NaN');
  assert.match('<p>' + V.STRINGS.shlGueltigBis.replace('{datum}', alt) + '</p>', /NaN/);
});
