'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bedingungskatalog als Modul (MyTerms v1-Schnitt, Teil B, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Ab Werk nur öffentliche Kennungen mit Quelle, als Beispiele markiert, kein Wortlaut (Weg 3).
   Ein eingelassener Katalog ersetzt den Ab-Werk-Katalog; Wortlaut-Schlüssel werden verworfen und benannt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Katalog] ab Werk genau die fünf öffentlichen Kennungen, je mit https-Quelle, alle als Beispiel, ohne Wortlaut', () => {
  const { V } = ladeKern();
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
  const k = V.bedingungskatalog();
  assert.equal(k.herkunft, 'vivodepot');
  assert.deepEqual(k.eintraege.map(e => e.kennung), ['SD-BASE', 'SD-BASE-DP', 'PDC-AI', 'PDC-GOOD', 'PDC-INTENT']);
  for (const e of k.eintraege) {
    assert.deepEqual(Object.keys(e).sort(), ['beispiel', 'kennung', 'quelle']);
    assert.equal(e.beispiel, true);
    assert.match(e.quelle, /^https:\/\//);
  }
  assert.equal(V.bedingungskatalogModulPruefen(V.AB_WERK_BEDINGUNGSKATALOG).verworfene.length, 0);
});

test('[Katalog·Rot-Beweis] Wortlaut-Schlüssel werden verworfen und benannt; kaputte Einträge fallen einzeln heraus', () => {
  const { V } = ladeKern();
  const r = V.bedingungskatalogModulPruefen({ modulTyp: 'bedingungskatalog', moduleVersion: 1, herkunft: 'kammer', eintraege: [
    { kennung: 'K-1', quelle: 'https://kammer.example/k1', wortlaut: 'Der Empfänger darf …' },
    { kennung: 'K-2', quelle: 'http://kammer.example/k2' },
    { kennung: 'mit Leerzeichen', quelle: 'https://kammer.example/x' },
    { kennung: 'K-1', quelle: 'https://kammer.example/doppelt' },
  ] });
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.katalog.eintraege.map(e => e.kennung), ['K-1']);
  assert.equal('wortlaut' in r.katalog.eintraege[0], false);
  assert.deepEqual(r.verworfene.map(v => v.schluessel || v.grund), ['wortlaut', 'quelle', 'kennung', 'doppelt']);
  assert.equal(V.bedingungskatalogModulPruefen({ moduleVersion: 1, herkunft: 'x', eintraege: [{ kennung: 'A', quelle: 'ftp://x' }] }).gueltig, false);
  assert.equal(V.bedingungskatalogModulPruefen({ moduleVersion: 0, herkunft: 'x', eintraege: [] }).grund, 'moduleVersion');
});

test('[Katalog] ein eingelassenes Modul ersetzt den Ab-Werk-Katalog; ohne gültiges Modul gilt wieder ab Werk', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'bedingungskatalog', moduleVersion: 1, herkunft: 'kammer', eintraege: [{ kennung: 'K-1', quelle: 'https://kammer.example/k1' }] };
  assert.equal(V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [{ kaputt: true }, modul] }), 1);
  assert.deepEqual(V.bedingungskatalog().eintraege.map(e => e.kennung), ['K-1']);
  assert.equal(V.bedingungskatalog().eintraege[0].beispiel, false);
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [{ kaputt: true }] });
  assert.equal(V.bedingungskatalog().herkunft, 'vivodepot');
});

test('[Katalog] eine Katalog-Kennung ergibt eine Bedingung, die der Übergabe-Eintrag annimmt', async () => {
  const { V } = ladeKern();
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
  const e = V.bedingungskatalog().eintraege[0];
  const b = { kennung: e.kennung, quelle: e.quelle, pruefsumme: await V.uebergabeBedingungPruefsumme(e.kennung, e.quelle) };
  assert.deepEqual(V.uebergabeBedingungNormalisieren(b), b);
});
