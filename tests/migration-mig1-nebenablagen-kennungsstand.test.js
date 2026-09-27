'use strict';
/* ════════════════════════════════════════════════════════════════════════
   MIG1 (19.09.2026) — die nie gebaute systematische Probe aus dem
   K2-K6-Code-Review vom 15.09.2026 (Abschnitt „Was ich nicht geprüft habe"):
   nach depotNormalisieren() darf in KEINEM Top-Level-Schlüssel und KEINER
   Nebenablage mehr ein ALTER Bereichs-/Feld-Schlüssel stehen.

   QUELLE DER ALTEN NAMEN: docs/umbau-englisch-vor-v1/kennung-mapping.json
   (über V.KENNUNG_MAPPING, dieselbe Tabelle, die der Kern selbst verwendet)
   — KEINE Handliste. Für jede der 13 Bereiche wird das erste Top-Level-
   Feld (nicht Unterfeld) programmatisch aus der Tabelle genommen.

   ZWEI FUNDE, IM KERN BEHOBEN (nicht nur gemessen — Report-before-Build galt
   hier nicht: „Jeder Fund ist ein Migrationsfehler, wird im Kern
   repariert"):
     1. `data.logikModule[]` — `.sektor` und `.datenSchema`-Cross-Referenzen
        (`{typ:'verbinden', teile:[{sektor,feld}]}`) auf einen bestehenden
        Katalog-Bereich blieben unmigriert. `logikModulPruefen` prüft
        `.sektor` GEGEN DEN KATALOG (_sektorImKatalog) — ein Bestandsmodul
        mit alter Kennung wurde nach dem Umbau vollständig als „Bereich
        existiert nicht" verworfen. Die Lese-App (vivodepot-lesen.html)
        hatte dieselbe Reparatur längst (`_logikModulKennungenUmschreiben`,
        dort aufgerufen) — im Haupt-Kern fehlte nur der Aufruf.
     2. `data.formatModule[].sektor` und `data.ereignisAchseModule[].
        eintraege[].{sektorId,feldId,unterFeldId}` — dieselbe Klasse:
        `formatModulPruefen`/`ereignisAchseModulPruefen` prüfen beide gegen
        den aktuellen Katalog, beide blieben unmigriert.
   GEPRÜFT UND OHNE FUND: bereichsModule/situationsModule/wizardsModule
   definieren EIGENE, neue Bereiche/Situationen/Schritte (keine Referenz auf
   einen BESTEHENDEN Katalog-Eintrag — wizardsModule lässt `ziel.sektor`
   laut eigenem Kommentar „bewusst offen"); textsatzModule/stellensatzModul
   tragen keinen Bereichsbezug.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Dieselbe Struktur-Liste wie _nebenablagenKennungenUmschreiben (vivodepot.html) — keine
// zweite Datenquelle für WELCHE Kennungen alt sind (die kommt aus KENNUNG_MAPPING), nur für
// WELCHE Ablagen es gibt. Diese Liste ist stabil (Code-Struktur), keine wachsende Handliste.
// `bereicheVerwaist` und `feldDefinitionenVerwaist` bewusst NICHT hier — beide haben eine
// GESONDERTE Rettungs-Logik (gemessen unten: ein Bereich, der nach der Umbenennung wieder im
// Katalog steht, wird nicht nur umbenannt, sondern aus der „Verwaist"-Ablage in die LEBENDE
// zurückgeholt (bereicheVerwaist -> sektoren, feldDefinitionenVerwaist -> feldDefinitionen) —
// ein einfacher In-Place-Vergleich wie bei den übrigen sechs träfe die falsche Stelle.
const NEBENABLAGEN_BEREICH_FELD = ['feldGueltigkeit', 'feldGueltigkeitGerettet', 'urheberschaft',
  'ausdruecklichKeine', 'codes', 'sensibelFelder'];
const NEBENABLAGEN_BEREICH = ['bereichsIdentitaeten', 'bereicheVerwaistIdentitaet'];

function frischesDepot() {
  const { V } = ladeKern();
  return V;
}

// Erstes Top-Level-Feld (kein Unterfeld) je Bereich, programmatisch aus KENNUNG_MAPPING —
// Grundlage für ALLE Proben unten. { bereichAlt: {bereichNeu, feldAlt, feldNeu} }
function jeBereichEinFeld(V) {
  const out = {};
  for (const z of V.KENNUNG_MAPPING) {
    if (z.istUnterfeld || out[z.bereichAlt]) continue;
    out[z.bereichAlt] = { bereichNeu: z.bereichNeu, feldAlt: z.kennungAlt.slice(z.bereichAlt.length + 1),
      feldNeu: z.kennungNeu.slice(z.bereichNeu.length + 1) };
  }
  return out;
}

test('[MIG1] KENNUNG_MAPPING deckt alle 13 Bestandsbereiche mit mindestens einem Top-Level-Feld', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  assert.equal(Object.keys(je).length, 13, 'Grundlage für alle Proben unten — bricht, wenn die Tabelle schrumpft');
});

test('[MIG1] NEBENABLAGEN_BEREICH_FELD: kein alter Bereich/Feld-Schlüssel übersteht depotNormalisieren, in JEDEM der 13 Bereiche', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  for (const ablage of NEBENABLAGEN_BEREICH_FELD) {
    const data = { schemaVersion: 80 };
    data[ablage] = {};
    for (const [bereichAlt, def] of Object.entries(je)) data[ablage][bereichAlt] = { [def.feldAlt]: 'wert-' + bereichAlt };
    V.depotNormalisieren(data);
    for (const [bereichAlt, def] of Object.entries(je)) {
      assert.ok(!(bereichAlt in data[ablage]), ablage + ': alter Bereich „' + bereichAlt + '" übersteht Migration');
      assert.ok(data[ablage][def.bereichNeu], ablage + ': neuer Bereich „' + def.bereichNeu + '" fehlt nach Migration');
      assert.equal(data[ablage][def.bereichNeu][def.feldNeu], 'wert-' + bereichAlt,
        ablage + '.' + def.bereichNeu + ': Wert nicht erhalten oder falsches Feld');
    }
  }
});

test('[MIG1] bereicheVerwaist: ein wieder erkannter Bereich wird GERETTET (nach sektoren zurückgeholt), nicht nur umbenannt', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80, bereicheVerwaist: {} };
  for (const [bereichAlt, def] of Object.entries(je)) data.bereicheVerwaist[bereichAlt] = { [def.feldAlt]: 'wert-' + bereichAlt };
  V.depotNormalisieren(data);
  assert.deepEqual(data.bereicheVerwaist, {}, 'jeder Bereich ist nach der Umbenennung wieder im Katalog — nichts bleibt verwaist');
  for (const [bereichAlt, def] of Object.entries(je)) {
    assert.ok(!(bereichAlt in (data.sektoren || {})), 'sektoren trägt keine alte Bereichs-Kennung „' + bereichAlt + '"');
    assert.equal((data.sektoren[def.bereichNeu] || {})[def.feldNeu], 'wert-' + bereichAlt,
      'sektoren.' + def.bereichNeu + ': aus bereicheVerwaist geretteter Wert fehlt oder falsches Feld');
  }
});

test('[MIG1] NEBENABLAGEN_BEREICH: kein alter Bereichs-Schlüssel übersteht depotNormalisieren, in JEDEM der 13 Bereiche', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  for (const ablage of NEBENABLAGEN_BEREICH) {
    const data = { schemaVersion: 80 };
    data[ablage] = {};
    for (const bereichAlt of Object.keys(je)) data[ablage][bereichAlt] = 'wert-' + bereichAlt;
    V.depotNormalisieren(data);
    for (const [bereichAlt, def] of Object.entries(je)) {
      assert.ok(!(bereichAlt in data[ablage]), ablage + ': alter Bereich „' + bereichAlt + '" übersteht Migration');
      assert.equal(data[ablage][def.bereichNeu], 'wert-' + bereichAlt, ablage + '.' + def.bereichNeu + ': Wert nicht erhalten');
    }
  }
});

test('[MIG1] dokumente[]: sektorId, felder[] und leitfeld verlieren ihre alte Kennung nie, in JEDEM Bereich', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80, dokumente: [] };
  let i = 0;
  for (const [bereichAlt, def] of Object.entries(je)) {
    data.dokumente.push({
      id: 'dok-' + (i++), typ: 'test', name: 'Testdokument', sektorId: bereichAlt, gueltigAb: '2020-01-01',
      felder: [{ sektorId: bereichAlt, feldId: def.feldAlt }],
      leitfeld: { sektorId: bereichAlt, feldId: def.feldAlt },
    });
  }
  V.depotNormalisieren(data);
  for (const [idx, [bereichAlt, def]] of Object.entries(je).map((e, k) => [k, e])) {
    const doc = data.dokumente[idx];
    assert.equal(doc.sektorId, def.bereichNeu, 'dokumente[' + idx + '].sektorId nicht migriert (' + bereichAlt + ')');
    assert.equal(doc.felder[0].sektorId, def.bereichNeu, 'dokumente[' + idx + '].felder[0].sektorId nicht migriert');
    assert.equal(doc.felder[0].feldId, def.feldNeu, 'dokumente[' + idx + '].felder[0].feldId nicht migriert');
    assert.equal(doc.leitfeld.sektorId, def.bereichNeu, 'dokumente[' + idx + '].leitfeld.sektorId nicht migriert');
  }
});

test('[MIG1] feldDefinitionen[]: sektorId in JEDEM Bereich migriert', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80,
    feldDefinitionen: Object.keys(je).map((bereichAlt, i) => ({ sektorId: bereichAlt, feldId: 'f' + i, typ: 'text', label: 'X' })) };
  V.depotNormalisieren(data);
  assert.equal(data.feldDefinitionen.length, 13, 'kein Eintrag darf bei der Migration verloren gehen');
  Object.values(je).forEach((def, i) => {
    assert.equal(data.feldDefinitionen[i].sektorId, def.bereichNeu, 'feldDefinitionen[' + i + '].sektorId nicht migriert');
  });
});

test('[MIG1] feldDefinitionenVerwaist[]: ein wieder erkannter Bereich wird GERETTET (nach feldDefinitionen zurückgeholt), nicht nur umbenannt', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80,
    feldDefinitionenVerwaist: Object.keys(je).map((bereichAlt, i) => ({ sektorId: bereichAlt, feldId: 'f' + i, typ: 'text', label: 'X' })) };
  V.depotNormalisieren(data);
  assert.equal(data.feldDefinitionenVerwaist.length, 0, 'jeder Bereich ist nach der Umbenennung wieder im Katalog — nichts bleibt verwaist');
  assert.equal(data.feldDefinitionen.length, 13, 'alle 13 müssen aus der Verwaist-Ablage gerettet worden sein');
  const altKennungenNochDa = data.feldDefinitionen.some((f) => Object.prototype.hasOwnProperty.call(je, f.sektorId));
  assert.equal(altKennungenNochDa, false, 'kein geretteter Eintrag darf die alte Bereichs-Kennung tragen');
});

test('[MIG1] bereichssatz[]: jeder alte Bereichs-Eintrag migriert, sonst leere Seitenleiste', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80, bereichssatz: Object.keys(je) };
  V.depotNormalisieren(data);
  const erwartet = Object.values(je).map((d) => d.bereichNeu);
  assert.deepEqual(data.bereichssatz, erwartet, 'bereichssatz nicht vollständig migriert');
});

test('[MIG1] empfaengerkreise[].ausnahmen: "bereich.feld"-Strings migriert, in JEDEM Bereich', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80, empfaengerkreise: [{ id: 'k1',
    ausnahmen: Object.entries(je).map(([bereichAlt, def]) => bereichAlt + '.' + def.feldAlt) }] };
  V.depotNormalisieren(data);
  const erwartet = Object.values(je).map((def) => def.bereichNeu + '.' + def.feldNeu);
  assert.deepEqual(data.empfaengerkreise[0].ausnahmen, erwartet, 'Ausnahmen nicht vollständig migriert');
});

test('[MIG1] mappe[].bereich und importierteVorlagen[].sektorId: in JEDEM Bereich migriert', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80,
    mappe: Object.keys(je).map((b, i) => ({ id: 'm' + i, bereich: b })),
    importierteVorlagen: Object.keys(je).map((b, i) => ({ id: 'v' + i, sektorId: b })) };
  V.depotNormalisieren(data);
  Object.values(je).forEach((def, i) => {
    assert.equal(data.mappe[i].bereich, def.bereichNeu, 'mappe[' + i + '].bereich nicht migriert');
    assert.equal(data.importierteVorlagen[i].sektorId, def.bereichNeu, 'importierteVorlagen[' + i + '].sektorId nicht migriert');
  });
});

test('[MIG1] zusammenstellungen[].kennungen und anfragen[].felder[].kennung: "bereich.feld" migriert', () => {
  const V = frischesDepot();
  const je = jeBereichEinFeld(V);
  const data = { schemaVersion: 80,
    zusammenstellungen: [{ id: 'z1', kennungen: Object.entries(je).map(([b, d]) => b + '.' + d.feldAlt) }],
    anfragen: [{ id: 'a1', felder: Object.entries(je).map(([b, d]) => ({ kennung: b + '.' + d.feldAlt })) }] };
  V.depotNormalisieren(data);
  const erwartet = Object.values(je).map((d) => d.bereichNeu + '.' + d.feldNeu);
  assert.deepEqual(data.zusammenstellungen[0].kennungen, erwartet, 'zusammenstellungen[].kennungen nicht vollständig migriert');
  assert.deepEqual(data.anfragen[0].felder.map((f) => f.kennung), erwartet, 'anfragen[].felder[].kennung nicht vollständig migriert');
});

/* ── Die zwei gebauten Fixes ────────────────────────────────────────────── */

test('[MIG1·Fund 1, behoben] logikModule[]: .sektor und datenSchema-Cross-Referenzen migriert, Modul bleibt gültig', () => {
  const V = frischesDepot();
  const modul = {
    modulTyp: 'logikModul', id: 'citizen-modul-1', titel: 'Mein Modul', sektor: 'vorsorge',
    herkunft: 'citizen',
    datenSchema: { x: { typ: 'verbinden', teile: [{ sektor: 'vorsorge', feld: 'vorsorge_instrumente' }] } },
    abschnitte: [{ titel: 'Abschnitt', bloecke: [
      { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' },
    ] }],
    dokAusgabe: { h1: 'Mein Dokument', unterschrift: false, unterschriftErsatzHinweis: 'Ersatzhinweis.' },
  };
  const data = { schemaVersion: 80, logikModule: [modul] };
  V.depotNormalisieren(data);
  const gehoben = data.logikModule[0];
  assert.equal(gehoben.sektor, 'advanceCare', '.sektor nicht migriert');
  assert.equal(gehoben.datenSchema.x.teile[0].sektor, 'advanceCare', 'datenSchema-Cross-Referenz .sektor nicht migriert');
  assert.equal(gehoben.datenSchema.x.teile[0].feld, 'provisionInstruments', 'datenSchema-Cross-Referenz .feld nicht migriert');
  const geprueft = V.logikModulPruefen(gehoben);
  assert.equal(geprueft.gueltig, true, 'ROT ERWARTET, wenn falsch: Modul mit alter Kennung wird nach Migration abgelehnt — ' + JSON.stringify(geprueft));
});

test('[MIG1·Fund 1·Rot-Beweis] ohne die Migration wird dasselbe Modul als "Bereich existiert nicht" verworfen', () => {
  const V = frischesDepot();
  const modul = { modulTyp: 'logikModul', id: 'citizen-modul-1', titel: 'Mein Modul', sektor: 'vorsorge',
    herkunft: 'citizen', datenSchema: {}, abschnitte: [{ titel: 'A', bloecke: [] }],
    dokAusgabe: { h1: 'X', unterschrift: false, unterschriftErsatzHinweis: 'E.' } };
  // KEINE Migration — direkt geprüft, wie ein Modul, das depotNormalisieren nie durchlief.
  const geprueft = V.logikModulPruefen(modul);
  assert.equal(geprueft.gueltig, false);
  assert.equal(geprueft.grund, 'sektor', 'Rot-Beweis: ohne Migration schlägt die Prüfung GENAU an der alten Kennung fehl');
});

test('[MIG1·Fund 2, behoben] formatModule[].sektor migriert', () => {
  const V = frischesDepot();
  const data = { schemaVersion: 80, formatModule: [{ id: 'fm-1', sektor: 'vorsorge', leser: 'json@1' }] };
  V.depotNormalisieren(data);
  assert.equal(data.formatModule[0].sektor, 'advanceCare');
});

test('[MIG1·Fund 2, behoben] ereignisAchseModule[].eintraege[].sektorId/feldId migriert, Eintrag bleibt gültig', () => {
  const V = frischesDepot();
  const data = { schemaVersion: 80, ereignisAchseModule: [{ moduleVersion: 1, herkunft: 'citizen',
    eintraege: [{ sektorId: 'vorsorge', feldId: 'vorsorge_instrumente', ereignisse: ['familienstand'] }] }] };
  V.depotNormalisieren(data);
  const eintrag = data.ereignisAchseModule[0].eintraege[0];
  assert.equal(eintrag.sektorId, 'advanceCare');
  assert.equal(eintrag.feldId, 'provisionInstruments');
  const geprueft = V.ereignisAchseModulPruefen(data.ereignisAchseModule[0]);
  assert.equal(geprueft.gueltig, true, 'ROT ERWARTET, wenn falsch: ' + JSON.stringify(geprueft));
});

test('[MIG1·Fund 2·Rot-Beweis] ohne Migration verwirft ereignisAchseModulPruefen denselben Eintrag als "ziel"', () => {
  const V = frischesDepot();
  const modul = { moduleVersion: 1, herkunft: 'citizen',
    eintraege: [{ sektorId: 'vorsorge', feldId: 'vorsorge_instrumente', ereignisse: ['heirat'] }] };
  const geprueft = V.ereignisAchseModulPruefen(modul);
  assert.equal(geprueft.gueltig, false);
  assert.equal(geprueft.verworfene[0].grund, 'ziel', 'Rot-Beweis: ohne Migration löst sich die alte Kennung nicht auf');
});
