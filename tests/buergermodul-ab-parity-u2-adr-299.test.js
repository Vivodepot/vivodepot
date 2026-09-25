'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-299 (Auftrag, 05.09.2026) — der Produktabnahmebeweis,
   Kern-Seite: „Am Ende möchte ich ‚mein' Bürgerdepot haben. Als wäre nichts
   gewesen." A (nativ an, kein Modul) muss B (nativ aus, Bürgermodul geladen)
   gleichen, in allem, was die Bürgerin sieht.

   DIE LÜCKE, DIE DIESE DATEI SCHLIESST: U2-ADR-292 hat `buergermodulSektorErsetzen`
   gegen SICH SELBST bewiesen — der native Bestand aus der laufenden Kern-Instanz
   frisch als Modul-Defs zurückgereicht, nicht das ECHTE, committete Bündel
   (`tools/buergermodul/vd-privat.json`, 03s Erzeuger/Schnitt-Kette, 454
   Feld-Definitionen). Das ist ein echter Unterschied: die Datei auf der Platte
   kann veraltet sein, anders sortiert, oder einen Fehler tragen, den die
   Live-Kern-Rückgabe nie zeigen würde. Diese Datei fährt B GEGEN DIE DATEI.

   FORM, geprüft am Code (vivodepot.html: Kommentar über buergermodulSektorErsetzen,
   „Erwartete moduleDefs-Form"): `{sektorId, sektionId, feldId, unterVon, feld}`,
   flach, Top-Level und UnterFeld nebeneinander. Das Bündel selbst ist NICHT in
   dieser Form (es ist die 03/Schnitt-Ausgabeform: `{bereiche:{sektorId:{sektionen:
   [{id, felder:[{id,...,unterFelder:[...]}]}]}}}`) — die Umwandlung unten ist die
   Brücke, sonst nirgends im Haus gebraucht (nur diese Probe braucht sie).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const BUNDLE = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'tools', 'buergermodul', 'vd-privat.json'), 'utf8'));

const ALLE_SEKTOREN = Object.keys(BUNDLE.bereiche);

/* Wandelt EINEN Bereich des Bündels (`{id, sektionen:[{id, felder:[...]}]}`) in die flache
   moduleDefs-Form, exakt wie `buergermodulSektorErsetzen` sie verlangt. Keine Feld-Eigenschaft
   verändert — reines Umformen der Hülle. */
function moduleDefsAusBundle(sektorId) {
  const bereich = BUNDLE.bereiche[sektorId];
  const defs = [];
  for (const sek of bereich.sektionen) {
    for (const f of sek.felder) {
      const feld = Object.assign({}, f);
      delete feld.unterFelder;
      defs.push({ sektorId, sektionId: sek.id, feldId: f.id, unterVon: null, feld });
      for (const uf of (f.unterFelder || [])) {
        defs.push({ sektorId, sektionId: sek.id, feldId: uf.id, unterVon: f.id, feld: Object.assign({}, uf) });
      }
    }
  }
  return defs;
}

async function gerendertesHTML(kern, sektorId, depotName) {
  await kern.V.depotAnlegen(depotName);
  kern.V.renderSektor(sektorId);
  return kern.document.getElementById('content').innerHTML;
}

/* ══ Das Bündel selbst — Sanity vor jedem Vergleich ═══════════════════════════════════════ */

test('[U2-ADR-299] das Bündel deckt alle 13 nativen Sektoren, 465 Feld-Definitionen (271 Top-Level + 194 Unterfelder)', () => {
  assert.equal(ALLE_SEKTOREN.length, 13);
  let top = 0, unter = 0;
  for (const sid of ALLE_SEKTOREN) {
    const defs = moduleDefsAusBundle(sid);
    top += defs.filter((d) => !d.unterVon).length;
    unter += defs.filter((d) => d.unterVon).length;
  }
  // 20.09.2026: 270/187 → 271/194 (U2-ADR-424: privateInsurancePolicies + sechs Unterfelder, garnishmentProtection), gemessen.
  assert.equal(top, 271, 'Top-Level-Felder');
  // 13.09.2026: +3 Unterfelder (zvr_abschrift/zvr_abschrift_datum/zvr_abschrift_stelle,
  // Unterfelder von vorsorge_instrumente) — der gemessene Stand, ändert sich diese Zahl,
  // gehört die Zeile neu gemessen.
  assert.equal(unter, 194, 'Unterfelder');
  assert.equal(top + unter, 465);
});

test('[U2-ADR-299] SEKTOREN/Feld-Definitionen: das Bündel nennt für JEDEN Sektor GENAU dieselben Kennungen wie der native Bestand — nicht mehr, nicht weniger', async () => {
  const { V } = await ladeKern();
  for (const sid of ALLE_SEKTOREN) {
    const nativeIds = new Set(V._erstePartieErlaubteIdsFuerSektor(sid));
    const bundleIds = new Set(moduleDefsAusBundle(sid).map((d) => sid + '.' + d.feldId));
    const fehlend = [...nativeIds].filter((k) => !bundleIds.has(k));
    const zusaetzlich = [...bundleIds].filter((k) => !nativeIds.has(k));
    assert.deepEqual(fehlend, [], sid + ': im Bündel fehlende Kennungen');
    assert.deepEqual(zusaetzlich, [], sid + ': im Bündel erfundene Kennungen');
  }
});

/* ══ A == B — renderSektor, ALLE 13 Sektoren, gegen das ECHTE Bündel ═════════════════════ */

for (const sid of ALLE_SEKTOREN) {
  test('[U2-ADR-299] "als wäre nichts gewesen" — renderSektor(\'' + sid + '\') ist byte-identisch nach dem Ersatz durch das echte Bündel', async () => {
    const kernA = await ladeKern();
    const htmlA = await gerendertesHTML(kernA, sid, 'Parity-A-' + sid + '!');

    const kernB = await ladeKern();
    const ergebnis = kernB.V.buergermodulSektorErsetzen(sid, moduleDefsAusBundle(sid));
    assert.equal(ergebnis.angewandt, true, sid + ': Ersatz muss angewandt werden');
    assert.equal(ergebnis.verworfen.length, 0, sid + ': das echte Bündel darf gegen den eigenen Sektor nichts verwerfen — ' + JSON.stringify(ergebnis.verworfen));
    const htmlB = await gerendertesHTML(kernB, sid, 'Parity-B-' + sid + '!');

    assert.equal(htmlB, htmlA, sid + ': die Bürgerin darf zwischen A (nativ) und B (Bündel geladen) keinen Unterschied sehen');
  });
}

/* ══ Textsatz-Achse — die Beschriftung kommt zurück, obwohl das Bündel keinen Text trägt ══ */

test('[U2-ADR-299·Textsatz] das Bündel selbst trägt KEIN label — die Beschriftung im Rendering kommt nachweislich aus dem Textsatz-Lauf, nicht aus dem Bündel', async () => {
  const bereich = BUNDLE.bereiche.identity;
  const vorname = bereich.sektionen.flatMap((s) => s.felder).find((f) => f.id === 'givenName');
  assert.ok(vorname, 'Vorbedingung: das Feld existiert im Bündel');
  assert.equal(vorname.label, undefined, 'Vorbedingung: das Struktur-Bündel trägt kein label — Text ist eine eigene Achse');

  const { V, document } = await ladeKern();
  await V.depotAnlegen('Parity-Textsatz!');
  V.buergermodulSektorErsetzen('identity', moduleDefsAusBundle('identity'));
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Vorname'), 'die deutsche Beschriftung muss trotz textloser Struktur-Datei erscheinen — _textsatzAufSektorenAnwenden füllt sie über sektorId.feldId nach');
});

/* ══ Rot-Beweis: die Probe ist scharf, kein Zufallsgrün ═══════════════════════════════════ */

test('[U2-ADR-299·Rot-Beweis] ein aus dem ECHTEN Bündel weggelassenes Feld fehlt wirklich im gerenderten HTML', async () => {
  const kernVoll = await ladeKern();
  const htmlVoll = await gerendertesHTML(kernVoll, 'assets', 'Rot-Voll!');

  const kernGekuerzt = await ladeKern();
  const alle = moduleDefsAusBundle('assets');
  const gekuerzt = alle.filter((d) => d.feldId !== 'livingSituation');
  assert.equal(gekuerzt.length, alle.length - 1, 'Vorbedingung: genau ein Feld weniger');
  kernGekuerzt.V.buergermodulSektorErsetzen('assets', gekuerzt);
  const htmlGekuerzt = await gerendertesHTML(kernGekuerzt, 'assets', 'Rot-Gekuerzt!');

  assert.ok(htmlVoll.includes('data-feld="livingSituation"'), 'Vorbedingung: der Feld-Bezeichner steht im vollen HTML');
  assert.ok(!htmlGekuerzt.includes('data-feld="livingSituation"'), 'nach dem Weglassen darf der Bezeichner nicht mehr im HTML stehen');
  assert.notEqual(htmlGekuerzt, htmlVoll, 'ein wirklich verändertes Bündel MUSS einen Unterschied zeigen — sonst prüft die A==B-Kette nichts');
});

test('[U2-ADR-299·Rot-Beweis] ein Feld, das ins FALSCHE Sektions-Konto einsortiert wird, verändert die Reihenfolge messbar', async () => {
  // Reihenfolge zählt: ein Feld, das da ist, aber woanders steht, ist ein Unterschied,
  // den die Buergerin sieht. Simuliert durch dieselbe Kennung, aber mit vertauschter sektionId
  // zweier existierender Sektionen desselben Sektors.
  const alle = moduleDefsAusBundle('identity');
  const sektionen = [...new Set(alle.map((d) => d.sektionId))];
  assert.ok(sektionen.length >= 2, 'Vorbedingung: identity hat mindestens zwei Sektionen');
  const [sekA, sekB] = sektionen;
  const verschoben = alle.map((d) => {
    if (d.sektionId === sekA) return Object.assign({}, d, { sektionId: sekB });
    if (d.sektionId === sekB) return Object.assign({}, d, { sektionId: sekA });
    return d;
  });

  const kernA = await ladeKern();
  const htmlA = await gerendertesHTML(kernA, 'identity', 'Reihenfolge-A!');
  const kernVerschoben = await ladeKern();
  kernVerschoben.V.buergermodulSektorErsetzen('identity', verschoben);
  const htmlVerschoben = await gerendertesHTML(kernVerschoben, 'identity', 'Reihenfolge-B!');

  assert.notEqual(htmlVerschoben, htmlA,
    'zwei vertauschte Sektionen MÜSSEN einen sichtbaren Unterschied erzeugen — sonst prüft die Probe die Reihenfolge nicht wirklich');
});

/* ══ Was diese Datei NICHT abdeckt — benannt, nicht verschwiegen ═════════════════════════ */

test('[U2-ADR-299·Grenze] das Bündel trägt heute NUR bereiche — Situationen/Wizards sind keine eigene Struktur-Achse im Bündel (Lücke, nicht Fehler)', () => {
  const schluessel = Object.keys(BUNDLE);
  assert.deepEqual(schluessel, ['modulTyp', 'moduleVersion', 'herkunft', 'bereiche'],
    'Sollte diese Zeile künftig rot werden, weil das Bündel `situationen`/`wizards` bekommen hat: gute Nachricht — dann ist diese Lücke geschlossen, die Probe hier muss dann erweitert werden, nicht nur diese Zeile.');
});
