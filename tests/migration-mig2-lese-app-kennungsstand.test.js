'use strict';
/* ════════════════════════════════════════════════════════════════════════
   MIG2 (19.09.2026) — dieselbe systematische Probe wie MIG1, für den
   Leseweg der Lese-App (`vivodepot-lesen.html`). Eine alte Datei, die
   Angehörige öffnen, darf nach `_foldVollmachtenLesen()` keine alte Kennung
   mehr tragen und nichts verwerfen, was der Kern (`depotNormalisieren()`)
   migriert. Soll ist GLEICHHEIT mit dem Kern, nicht nur „irgendein neuer
   Wert" — dieselben alten Depot-Bytes laufen durch beide, das Ergebnis wird
   verglichen.

   FUND, IM LESEWEG BEHOBEN: dieselben zwei Register wie MIG1 (Haupt-Kern) —
   `formatModule[].sektor` und `ereignisAchseModule[].eintraege[].
   {sektorId,feldId,unterFeldId}` — blieben in der Lese-App-eigenen Kopie von
   `_nebenablagenKennungenUmschreiben()` unmigriert (Diff gegen die Kern-
   Fassung von VOR MIG1 war byte-identisch bis auf diese zwei fehlenden
   Blöcke). `logikModule` brauchte HIER keinen Block — `_foldVollmachtenLesen`
   ruft `_logikModulKennungenUmschreiben` bereits separat auf, unabhängig von
   `_nebenablagenKennungenUmschreiben`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frischeLesenInstanz() {
  delete require.cache[require.resolve('./load-lesen.js')];
  const x = require('./load-lesen.js').ladeLesen();
  return x.V || x;
}

// Kern und Lese-App laufen in ZWEI getrennten vm-Realms (load-kern.js/load-lesen.js) — ihre
// Objekte tragen darum verschiedene Object.prototype-Instanzen. assert.deepEqual meldet das
// als „same structure but are not reference-equal", obwohl der INHALT identisch ist. Über
// JSON.stringify verglichen, wie an anderer Stelle in der Suite bereits üblich (z. B.
// massstabMitNr8-Vergleiche) — der Realm-Unterschied ist kein Befund, nur ein Test-Fallstrick.
function gleich(lesen, kern, meldung) {
  assert.deepEqual(JSON.parse(JSON.stringify(lesen === undefined ? null : lesen)),
    JSON.parse(JSON.stringify(kern === undefined ? null : kern)), meldung);
}

// Erstes Top-Level-Feld je Bereich, aus dem Kern-KENNUNG_MAPPING — dieselbe Tabelle, die
// tools/build-kennung-mapping-region.js in BEIDE Dateien (Kern + Lese-App) einbackt, also
// für den Vergleich hier zuständigkeitshalber vom Kern genommen (keine Handliste).
function jeBereichEinFeld(V) {
  const out = {};
  for (const z of V.KENNUNG_MAPPING) {
    if (z.istUnterfeld || out[z.bereichAlt]) continue;
    out[z.bereichAlt] = { bereichNeu: z.bereichNeu, feldAlt: z.kennungAlt.slice(z.bereichAlt.length + 1),
      feldNeu: z.kennungNeu.slice(z.bereichNeu.length + 1) };
  }
  return out;
}

test('[MIG2] NEBENABLAGEN_BEREICH_FELD: Lese-App liefert dieselbe migrierte Ablage wie der Kern, in JEDEM Bereich', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  for (const ablage of ['feldGueltigkeit', 'feldGueltigkeitGerettet', 'urheberschaft', 'ausdruecklichKeine', 'codes', 'sensibelFelder']) {
    const bauen = () => { const d = { schemaVersion: 80 }; d[ablage] = {};
      for (const [b, def] of Object.entries(je)) d[ablage][b] = { [def.feldAlt]: 'wert-' + b }; return d; };
    const kern = bauen(); V.depotNormalisieren(kern);
    const lesen = bauen(); L._foldVollmachtenLesen(lesen);
    gleich(lesen[ablage], kern[ablage], ablage + ': Lese-App weicht vom Kern ab — ' + JSON.stringify(lesen[ablage]));
  }
});

test('[MIG2] NEBENABLAGEN_BEREICH: Lese-App = Kern, in JEDEM Bereich', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  for (const ablage of ['bereichsIdentitaeten', 'bereicheVerwaistIdentitaet']) {
    const bauen = () => { const d = { schemaVersion: 80 }; d[ablage] = {};
      for (const b of Object.keys(je)) d[ablage][b] = 'wert-' + b; return d; };
    const kern = bauen(); V.depotNormalisieren(kern);
    const lesen = bauen(); L._foldVollmachtenLesen(lesen);
    gleich(lesen[ablage], kern[ablage], ablage + ': Lese-App weicht vom Kern ab');
  }
});

test('[MIG2] dokumente[]: Lese-App = Kern, sektorId/felder[]/leitfeld, in JEDEM Bereich', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => ({ schemaVersion: 80, dokumente: Object.entries(je).map(([b, def], i) => ({
    id: 'dok-' + i, typ: 'test', name: 'T', sektorId: b, gueltigAb: '2020-01-01',
    felder: [{ sektorId: b, feldId: def.feldAlt }], leitfeld: { sektorId: b, feldId: def.feldAlt } })) });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  gleich(lesen.dokumente, kern.dokumente, 'dokumente[]: Lese-App weicht vom Kern ab');
});

test('[MIG2] feldDefinitionen[]: Lese-App = Kern (einfache Umbenennung, keine Rettung nötig), in JEDEM Bereich', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => ({ schemaVersion: 80, feldDefinitionen: Object.keys(je).map((b, i) => ({ sektorId: b, feldId: 'f' + i, typ: 'text', label: 'X' })) });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  gleich(lesen.feldDefinitionen, kern.feldDefinitionen, 'feldDefinitionen: Lese-App weicht vom Kern ab');
});

/* [MIG2·Fund, behoben in MIG3] `_bereicheVerwaisteRetten()` rettet auch `feldDefinitionenVerwaist[]`
   zurück nach `feldDefinitionen[]` — war hier zunächst als „NICHT behoben, größer als der Rest"
   festgehalten (Report-before-Build). Geschlossen in MIG3 (generierte Region
   BEREICHE-VERWAISTE-RETTEN-LESEN, tools/build-kennung-mapping-region.js) — volle Probe dort:
   tests/migration-mig3-bereiche-verwaiste-retten-lesen.test.js. Hier nur die Umkehr bestätigt,
   keine Dopplung der MIG3-Tiefe. */
test('[MIG2·Fund, behoben in MIG3] feldDefinitionenVerwaist[]: Lese-App = Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => ({ schemaVersion: 80, feldDefinitionenVerwaist: Object.keys(je).map((b, i) => ({ sektorId: b, feldId: 'f' + i, typ: 'text', label: 'X' })) });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  gleich(lesen.feldDefinitionenVerwaist, kern.feldDefinitionenVerwaist, 'feldDefinitionenVerwaist: Lese-App weicht vom Kern ab');
  gleich(lesen.feldDefinitionen, kern.feldDefinitionen, 'feldDefinitionen: Lese-App weicht vom Kern ab');
});

/* [MIG2·Fund, behoben in MIG3] `_bereicheVerwaisteRetten()` (U2-ADR-187, A389) — war hier
   zunächst als „NICHT behoben, größer als der Rest" festgehalten (Report-before-Build: eine
   U2-ADR-187-Funktion mit bidirektionaler HINAUS/ZURÜCK-Logik plus einer fehlenden Vorbedingung,
   kein Ein-Zeilen-Port). Geschlossen in MIG3 — volle Probe dort:
   tests/migration-mig3-bereiche-verwaiste-retten-lesen.test.js. Hier nur die Umkehr bestätigt. */
test('[MIG2·Fund, behoben in MIG3] bereicheVerwaist: Lese-App = Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => { const d = { schemaVersion: 80, bereicheVerwaist: {} };
    for (const [b, def] of Object.entries(je)) d.bereicheVerwaist[b] = { [def.feldAlt]: 'wert-' + b }; return d; };
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  gleich(lesen.bereicheVerwaist, kern.bereicheVerwaist, 'bereicheVerwaist: Lese-App weicht vom Kern ab');
  gleich(lesen.sektoren, kern.sektoren, 'gerettete sektoren: Lese-App weicht vom Kern ab');
});

test('[MIG2] bereichssatz[]/empfaengerkreise[].ausnahmen/mappe[].bereich/importierteVorlagen[].sektorId: Lese-App = Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => ({
    schemaVersion: 80,
    bereichssatz: Object.keys(je),
    empfaengerkreise: [{ id: 'k1', ausnahmen: Object.entries(je).map(([b, d]) => b + '.' + d.feldAlt) }],
    mappe: Object.keys(je).map((b, i) => ({ id: 'm' + i, bereich: b })),
    importierteVorlagen: Object.keys(je).map((b, i) => ({ id: 'v' + i, sektorId: b })),
  });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  gleich(lesen.bereichssatz, kern.bereichssatz, 'bereichssatz: Lese-App weicht vom Kern ab');
  gleich(lesen.empfaengerkreise, kern.empfaengerkreise, 'empfaengerkreise: Lese-App weicht vom Kern ab');
  // Nur das Kennungs-Feld verglichen, nicht der ganze Eintrag: `mappe[].autoritativ` ist ein
  // additiver Default aus einer ANDEREN, älteren Migrationsstufe (23->24, U2-ADR-045, nichts mit
  // der Kennungs-Kampagne zu tun) — der Kern setzt ihn nach, die Lese-App kennt das Feld gar
  // nicht (0 Treffer für „autoritativ" in vivodepot-lesen.html). Das ist eine eigene, von MIG2
  // unabhängige Feature-Lücke (Angehörige sehen den „autoritativ"-Marker nie), kein
  // Kennungsstand-Fund — gemeldet, hier nicht mitgebaut.
  gleich(lesen.mappe.map((m) => m.bereich), kern.mappe.map((m) => m.bereich), 'mappe[].bereich: Lese-App weicht vom Kern ab');
  // Dieselbe Klasse wie bei `mappe[].autoritativ" oben: `importierteVorlagen[].beleg` ist ein
  // additiver Default einer anderen Migrationsstufe, den die Lese-App nicht nachzieht — eigene,
  // von MIG2 unabhängige Lücke, hier nicht mitgebaut.
  gleich(lesen.importierteVorlagen.map((v) => v.sektorId), kern.importierteVorlagen.map((v) => v.sektorId),
    'importierteVorlagen[].sektorId: Lese-App weicht vom Kern ab');
});

test('[MIG2] zusammenstellungen[].kennungen/anfragen[].felder[].kennung: Lese-App = Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => ({
    schemaVersion: 80,
    zusammenstellungen: [{ id: 'z1', kennungen: Object.entries(je).map(([b, d]) => b + '.' + d.feldAlt) }],
    anfragen: [{ id: 'a1', felder: Object.entries(je).map(([b, d]) => ({ kennung: b + '.' + d.feldAlt })) }],
  });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  gleich(lesen.zusammenstellungen, kern.zusammenstellungen, 'zusammenstellungen: Lese-App weicht vom Kern ab');
  gleich(lesen.anfragen, kern.anfragen, 'anfragen: Lese-App weicht vom Kern ab');
});

/* ── Der Fund: formatModule/ereignisAchseModule fehlten in der Lese-App-Kopie ────────── */

test('[MIG2·Fund, behoben] formatModule[].sektor: Lese-App = Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const bauen = () => ({ schemaVersion: 80, formatModule: [{ id: 'fm-1', sektor: 'vorsorge', leser: 'json@1' }] });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  assert.equal(lesen.formatModule[0].sektor, 'advanceCare');
  gleich(lesen.formatModule, kern.formatModule, 'formatModule: Lese-App weicht vom Kern ab');
});

test('[MIG2·Fund, behoben] ereignisAchseModule[].eintraege[]: Lese-App = Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const bauen = () => ({ schemaVersion: 80, ereignisAchseModule: [{ moduleVersion: 1, herkunft: 'citizen',
    eintraege: [{ sektorId: 'vorsorge', feldId: 'vorsorge_instrumente', ereignisse: ['familienstand'] }] }] });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);
  const eintrag = lesen.ereignisAchseModule[0].eintraege[0];
  assert.equal(eintrag.sektorId, 'advanceCare');
  assert.equal(eintrag.feldId, 'provisionInstruments');
  gleich(lesen.ereignisAchseModule, kern.ereignisAchseModule, 'ereignisAchseModule: Lese-App weicht vom Kern ab');
});

test('[MIG2·Fund·Rot-Beweis] ohne die Reparatur bleibt die alte Kennung in der Lese-App stehen (formatModule)', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');
  const quelle = fs.readFileSync(LESEN, 'utf8');
  const marker = "  for (const fm of (Array.isArray(depot.formatModule) ? depot.formatModule : [])) {\n    if (fm && typeof fm.sektor === 'string') fm.sektor = bereich(fm.sektor);\n  }\n";
  assert.equal(quelle.split(marker).length, 2, 'die Reparaturzeile steht genau einmal — sonst trifft die Mutation nichts');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mig2-lesen-'));
  const mutant = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(mutant, quelle.replace(marker, ''));
  try {
    const vorher = process.env.LESEN_HTML_PATH;
    process.env.LESEN_HTML_PATH = mutant;
    delete require.cache[require.resolve('./load-lesen.js')];
    const L = require('./load-lesen.js').ladeLesen().V;
    if (vorher === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-lesen.js')];
    const data = { schemaVersion: 80, formatModule: [{ id: 'fm-1', sektor: 'vorsorge', leser: 'json@1' }] };
    L._foldVollmachtenLesen(data);
    assert.equal(data.formatModule[0].sektor, 'vorsorge', 'Rot-Beweis: ohne die Reparaturzeile bleibt die alte Kennung stehen');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
