'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund STELLENSATZ-DE-RESERVIERUNG (HOCH, 26.09.2026) und seine Klasse
   ────────────────────────────────────────────────────────────────────────
   stellensatzModulPruefen verglich `modul.rechtsraum === 'DE'` am ROHEN Wert, speicherte aber den
   getrimmten. Ein Modul mit `rechtsraum: ' DE'` wurde angenommen, unter 'DE' angemeldet und
   lieferte im deutschen Depot seine Stellen — der reservierte Rechtsraum war fremd belegt.
   Gefunden beim Bau der Modul-Schemas.

   Die Klasse: ein Vergleich mit einem reservierten Code läuft erst nach der Normalisierung
   (rechtsraumCodeNormalisieren / sprachCodeNormalisieren), und Speicherung wie Nachschlagen
   benutzen denselben normalisierten Wert. Der Wächter unten findet jeden Vergleich eines
   Modul-Codes (`.rechtsraum`/`.sprache`) mit einem reservierten Wert, der das nicht tut.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KENNUNG = 'identity.dateOfSeparation';
const stellensatz = (rechtsraum) => ({ modulTyp: 'stellensatz', moduleVersion: 1, rechtsraum, stellen: { [KENNUNG]: 'Fremde Stelle' } });

for (const variante of [' DE', 'DE ', 'de', 'De', '\tDE\n']) {
  test(`[STELLENSATZ-DE-RESERVIERUNG] ein Stellensatz mit rechtsraum ${JSON.stringify(variante)} belegt die DE-Stellen nicht`, () => {
    const { V } = ladeKern();
    assert.equal(V.stellensatzModulPruefen(stellensatz(variante)).grund, 'reserviert');
    for (const aktiv of ['DE', 'de']) {
      V.setData({ stellensatzModule: [stellensatz(variante)], rechtsraum: aktiv });
      V._stellensatzModuleAusDepotAnmelden();
      assert.equal(V.stelleLesen(KENNUNG), null, `aktiver Rechtsraum ${aktiv}: fremde Stelle sichtbar`);
    }
  });
}

test('[STELLENSATZ-DE-RESERVIERUNG·Gegenprobe] ein fremder Rechtsraum in anderer Schreibung findet seine Stellen weiter', () => {
  const { V } = ladeKern();
  V.setData({ stellensatzModule: [stellensatz(' fr ')], rechtsraum: 'FR' });
  V._stellensatzModuleAusDepotAnmelden();
  assert.equal(V.stelleLesen(KENNUNG), 'Fremde Stelle');
  V.setData({ stellensatzModule: [stellensatz('FR')], rechtsraum: 'fr' });
  V._stellensatzModuleAusDepotAnmelden();
  assert.equal(V.stelleLesen(KENNUNG), 'Fremde Stelle');
});

test('[Reserviert·Klasse] Textsatz und Rechtsraum lehnen die reservierten Codes in jeder Schreibung ab', () => {
  const { V } = ladeKern();
  const R = (t) => V.EINLASS_REGISTER.find((r) => r.typ === t).pruefen;
  for (const s of [' de', 'DE', 'De ']) {
    assert.equal(R('textsatz')({ modulTyp: 'textsatz', moduleVersion: 1, sprache: s, texte: { 'mobility.label': 'X' } }).grund, 'reserviert', `Sprache ${JSON.stringify(s)}`);
  }
  for (const r of [' DE', 'de', 'De ']) {
    assert.equal(R('rechtsraum')({ modulTyp: 'rechtsraum', moduleVersion: 1, rechtsraum: r, typen: { tpl_x: { katalogVersion: 1 } } }).grund, 'reserviert', `Rechtsraum ${JSON.stringify(r)}`);
  }
});

/* Normalisiert an der QUELLE: textsatzRechtsraumAktiv() liefert den normalisierten Code, und Textsatz,
   Stellensatz und Rechtsraum-Katalog sehen für 'at' und 'AT' dasselbe (Entscheidung 26.09.2026). */
test('[Reserviert·Quelle] alle Verbraucher sehen für den aktiven Rechtsraum denselben Code, gleich wie geschrieben', () => {
  for (const [aktiv, modulSchreibung] of [['at', 'AT'], ['AT', ' at'], [' At ', 'aT']]) {
    const { V } = ladeKern();
    V.setData({
      rechtsraum: aktiv,
      stellensatzModule: [stellensatz(modulSchreibung)],
      rechtsraumModule: [{ modulTyp: 'rechtsraum', moduleVersion: 1, rechtsraum: modulSchreibung, typen: { tpl_probe: { katalogVersion: 3 } } }],
    });
    assert.equal(V.textsatzRechtsraumAktiv(), 'AT', `Quelle für ${JSON.stringify(aktiv)}`);
    V._stellensatzModuleAusDepotAnmelden();
    V._rechtsraumModuleAusDepotAnmelden();
    assert.equal(V.stelleLesen(KENNUNG), 'Fremde Stelle', `Stellensatz ${JSON.stringify(modulSchreibung)} bei aktiv ${JSON.stringify(aktiv)}`);
    assert.equal(V._rechtsraumKatalogLesen('tpl_probe', aktiv, 'katalogVersion'), 3, `Rechtsraum-Katalog ${JSON.stringify(modulSchreibung)} bei ${JSON.stringify(aktiv)}`);
    const t = V.textsatzModulPruefen({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', rechtsraum: modulSchreibung, texte: { 'mobility.label': 'X' } });
    assert.equal(t.rechtsraum, V.textsatzRechtsraumAktiv(), 'Textsatz meldet sich unter demselben Code an, unter dem gelesen wird');
  }
});

test('[Reserviert·Quelle·Rot-Beweis] der Ab-Werk-Sprachwert wird normalisiert gespeichert, nicht roh', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const zeile = kern.split('\n').find((z) => /data\.textsprache = .*AB_WERK_SPRACHE_PRODUKT\.sprache/.test(z));
  assert.ok(zeile, 'Vorbedingung: die Schreibstelle existiert');
  assert.match(zeile, /data\.textsprache = sprachCodeNormalisieren\(AB_WERK_SPRACHE_PRODUKT\.sprache\)/);
});

/* Der Wächter: ein Modul-Code (`.rechtsraum`/`.sprache`), roh verglichen mit einem reservierten Wert
   (zweibuchstabiges Literal oder …EINGEBAUT/…RESERVIERT-Konstante). */
const ROHVERGLEICH = /(?<!Normalisieren\()(?<![A-Za-z_.])[A-Za-z_.]*\.(rechtsraum|sprache)(\.trim\(\))?\s*[!=]==\s*('[A-Za-z]{2}'|[A-Z_]*(EINGEBAUT|RESERVIERT)[A-Z_]*)/;
function befunde(text) {
  return text.split('\n').map((z, i) => [i + 1, z]).filter(([, z]) => !/^\s*(\/\/|\*|\/\*)/.test(z) && ROHVERGLEICH.test(z))
    .map(([n, z]) => `${n}: ${z.trim().slice(0, 140)}`);
}

test('[Reserviert·Klasse] kein Modul-Code wird roh mit einem reservierten Wert verglichen', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(/function rechtsraumCodeNormalisieren\(/.test(kern) && /function sprachCodeNormalisieren\(/.test(kern), 'Vorbedingung: die Normalisierer existieren');
  assert.deepEqual(befunde(kern), []);
});

test('[Reserviert·Klasse·Rot-Beweis] rohe Vergleiche werden gefunden, normalisierte und Kommentare nicht', () => {
  const f = befunde([
    "if (modul.rechtsraum === STELLENSATZ_RECHTSRAUM_EINGEBAUT) return x;",
    "if (m.rechtsraum === 'DE') continue;",
    "if (modul.sprache.trim() !== TEXTSATZ_SPRACHE_EINGEBAUT) y();",
    "if (rechtsraumCodeNormalisieren(m.rechtsraum) === 'DE') continue;",
    "if (sprachCodeNormalisieren(modul.sprache) === TEXTSATZ_SPRACHE_EINGEBAUT) z();",
    "// if (m.rechtsraum === 'DE') im Kommentar",
  ].join('\n'));
  assert.deepEqual(f.map((x) => Number(x.split(':')[0])), [1, 2, 3]);
});
