'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-geruest-sprachagnostisch.test.js — U2-ADR-363 (Zug 2, 07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Produktentscheidung (über): ohne Sprachmodul zeigt das Gerüst NULL deutsche
   und NULL englische Zeichenketten — nur Kennungen. Kein natives Sprachwissen
   bleibt im Gerüst selbst.

   GENERISCH, KEINE ORTSLISTE (dieselbe Lehre wie U2-ADR-322, tools/textsatz-
   traeger-erheben.js: "ein Wächter, der dieselbe Landkarte abläuft wie das
   Werkzeug, bewacht nichts"): diese Probe läuft den GESAMTEN Kennungsraum ab,
   den AB_WERK_TEXTSATZ_DE selbst führt (Object.keys) — nicht eine Handvoll
   ausgewählter Beispiele. AB_WERK_TEXTSATZ_DE bleibt dafür genau das, was sein
   eigener Kopf-Kommentar seit Zug 2 sagt: die BAUZEIT-Landkarte, welche
   Kennungen es gibt — hier nur zur ENUMERATION gelesen, nie zur Textquelle.

   ROT-BEWEIS: die Ab-Werk-Saat erneut anwenden macht die Probe wieder grün —
   sie prüft also wirklich den Registry-Zustand, nicht eine tote Kennungsliste. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Die Stufen des Lesepfads, in der Reihenfolge, in der textLesen() sie anwendet. */
const PLATZHALTER_STUFEN = ['_markePlatzhalterAufloesen', '_beschriftungPlatzhalterAufloesen'];

/* Klassenwächter: jede `_…PlatzhalterAufloesen`-Funktion des Kerns steht in PLATZHALTER_STUFEN. Kommt eine dritte Art dazu, wird der
   Spiegel-Test sonst still rot (so brach er am 19.09.2026 an `{beschriftung:…}`); hier wird es benannt. */
function stufenImKern(quelle) { return [...quelle.matchAll(/^function (_\w+PlatzhalterAufloesen)\(/gm)].map((m) => m[1]).sort(); }
test('[Geruest·sprachagnostisch] jede Platzhalter-Auflöse-Stufe des Lesepfads ist im Spiegel-Test verzeichnet', () => {
  const { kernRohLesen } = require('../tools/lib/kern-lesen.js');
  const q = kernRohLesen();
  assert.deepEqual(stufenImKern(q), PLATZHALTER_STUFEN.slice().sort(), 'eine Auflöse-Stufe fehlt in PLATZHALTER_STUFEN (oder ist zu viel)');
  // Rot-Beweis: eine dritte Art im Kern wird gemeldet
  const mit = q + '\nfunction _zweckPlatzhalterAufloesen(t) { return t; }\n';
  assert.notDeepEqual(stufenImKern(mit), PLATZHALTER_STUFEN.slice().sort());
});

test('[Geruest·sprachagnostisch] mit AB-WERK-SAAT liefert jede AB_WERK_TEXTSATZ_DE-Kennung ihren echten Text', () => {
  const { V } = ladeKern();
  const kennungen = Object.keys(V.TEXTSATZ_DE_QUELLE.texte);
  assert.ok(kennungen.length > 3000, 'Ausbeute zuerst: die Landkarte muss etwas zu prüfen haben');
  let geprueft = 0;
  for (const k of kennungen) {
    /*,: seit U2-ADR-362 sitzt _markePlatzhalterAufloesen IM Lesepfad —
       textLesen() loest {marke}/{marke_domain} auf, die Tabelle traegt den Platzhalter roh.
       Der Spiegel gilt weiterhin, aber gegen den AUFGELOESTEN Erwartungswert; sonst
       vergliche die Probe zwei verschiedene Schichten und waere kein Spiegel mehr. */
    /* Der Erwartungswert geht durch DIESELBEN Auflöse-Stufen des Lesepfads wie textLesen(), in derselben Reihenfolge
       (PLATZHALTER_STUFEN, unten). Beschriftungs-Platzhalter (19.09.2026): `{beschriftung:schluessel}` ist die zweite Stufe. */
    /* Seit 34.7 (Angaben am Herkunftsort) löst `_markePlatzhalterAufloesen` SCHLÜSSELGENAU auf: sie bekommt die Kennung als zweites Argument (in den Herkunftsort-Schlüsseln
       lösen `{urheberin}`/`{lizenz}` aus der Konstante, `{marke}` bleibt stehen); die Beschriftungs-Stufe bekommt weiter die Tiefe. */
    const erwartet = PLATZHALTER_STUFEN.map((n) => [n, V[n]]).filter(([, f]) => typeof f === 'function')
      .reduce((t, [n, f]) => f(t, n === '_markePlatzhalterAufloesen' ? k : 0), V.TEXTSATZ_DE_QUELLE.texte[k]);
    assert.equal(V.textLesen(k), erwartet, 'Ab-Werk-DE muss AB_WERK_TEXTSATZ_DE 1:1 spiegeln: ' + k);
    geprueft++;
  }
  assert.equal(geprueft, kennungen.length);
});

test('[Geruest·sprachagnostisch] OHNE JEDES SPRACHMODUL liefert textLesen() für KEINE einzige Kennung mehr Text — nur null', () => {
  const { V } = ladeKern();
  const kennungen = Object.keys(V.TEXTSATZ_DE_QUELLE.texte);
  assert.ok(kennungen.length > 3000, 'Ausbeute zuerst');

  // DIE PROBE SELBST: die komplette Registry leeren — kein Ab-Werk-DE, kein Ab-Werk-EN-Vordepot,
  // kein Depot-Modul. Das ist der Zustand, den kein Kern-Aufrufer je herstellt (Ab-Werk-Saat
  // läuft unbedingt) — genau deswegen ist er die richtige Probe für "gibt es NOCH einen
  // versteckten Rückfall": gäbe es einen, würde er hier sichtbar.
  V._TEXTSATZ_MODUL_REGISTRY = Object.create(null);

  let nichtNull = [];
  for (const k of kennungen) {
    const t = V.textLesen(k);
    if (t !== null) nichtNull.push({ kennung: k, wert: t });
  }
  assert.deepEqual(nichtNull, [], 'jede dieser Kennungen lieferte trotz leerer Registry noch Text — ' +
    'ein versteckter Rückfall lebt fort');
});

test('[Geruest·sprachagnostisch] STRINGS zeigt ohne Sprachmodul die Kennung selbst, nie Deutsch oder Englisch', () => {
  const { V } = ladeKern();
  const flacheSchluessel = Object.keys(V.TEXTSATZ_DE_QUELLE.texte)
    .filter((k) => k.startsWith('strings:') && k.endsWith('.text'))
    .map((k) => k.slice('strings:'.length, -'.text'.length));
  assert.ok(flacheSchluessel.length > 500, 'Ausbeute zuerst');

  V._TEXTSATZ_MODUL_REGISTRY = Object.create(null);

  let falsch = [];
  for (const schluessel of flacheSchluessel) {
    const angezeigt = V.STRINGS[schluessel];
    const erwarteteKennung = 'strings:' + schluessel + '.text';
    if (angezeigt !== erwarteteKennung) falsch.push({ schluessel, angezeigt, erwartet: erwarteteKennung });
  }
  assert.deepEqual(falsch, [], 'STRINGS zeigte für diese Schlüssel etwas anderes als ihre eigene Kennung');
});

test('[Geruest·sprachagnostisch] Sektor-Feld-Beschriftungen zeigen ohne Sprachmodul ihre Kennung, nie Deutsch', async () => {
  const { V } = ladeKern();
  V._TEXTSATZ_MODUL_REGISTRY = Object.create(null);
  V.textsatzNeuAnwenden();

  const deutscheTreffer = [];
  for (const sektorId of Object.keys(V.SEKTOR_BY_ID)) {
    const sektor = V.SEKTOR_BY_ID[sektorId];
    for (const sektion of (sektor.sektionen || [])) {
      for (const feld of (sektion.felder || [])) {
        if (typeof feld.label === 'string' && /[a-zäöüß]/i.test(feld.label) && !feld.label.includes('.')) {
          deutscheTreffer.push({ sektorId, feldId: feld.id, label: feld.label });
        }
      }
    }
  }
  // Eine Kennung enthält immer einen Punkt (sektor.feld.label) — ein Label OHNE Punkt UND mit
  // Buchstaben ist entweder Deutsch/Englisch geblieben oder inline hartkodiert; beides ist der Fund.
  assert.deepEqual(deutscheTreffer.slice(0, 5), [],
    (deutscheTreffer.length) + ' Feld-Label zeigen trotz leerer Registry keine Kennung — Beispiel(e) oben');
});

test('[Geruest·sprachagnostisch·Rot-Beweis] die Ab-Werk-Saat erneut anwenden macht die Probe wieder grün', () => {
  const { V } = ladeKern();
  V._TEXTSATZ_MODUL_REGISTRY = Object.create(null);
  assert.equal(V.textLesen('strings:appTagline.text'), null, 'Vorbedingung: leere Registry liefert wirklich null');

  V._TEXTSATZ_MODUL_REGISTRY = V._textsatzAbWerkRegistrySeed();
  assert.equal(V.textLesen('strings:appTagline.text'), V.TEXTSATZ_DE_QUELLE.texte['strings:appTagline.text'],
    'nach dem Wiederaufbau der Saat muss derselbe Text wie vorher zurückkommen — sonst prüft die Probe oben nichts Reales');
});
