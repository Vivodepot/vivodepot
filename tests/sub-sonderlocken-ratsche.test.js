'use strict';
/* SUB-SONDERLOCKEN — Klassenwächter (23.09.2026). Grundsatz, längst entschieden: U2-ADR-002 „Ein Mechanismus für alle
   Depots, kein Anker-Sonderfall", U2-ADR-124 „Gleichwertigkeit". Die Depotinhaberin: „ALLE DEPOTS SIND GLEICH! IMMER! Sie
   unterscheiden sich durch nichts ausser ihrer Position als Anker- oder Sub-Depot."
   Zwei Teile:
   1. MECHANIK: jeder Weg, der einen Depot-Umschlag schreibt — Anker wie Sub —, geht durch `_depotV4Schreiben`; keiner ruft
      ein eigenes `encryptDepot`. Das war S1 (Sub-Anlage als eigenes V3) und S2 (Neuversiegeln mit V3-Annahme).
   2. POSITIVLISTE der noch verbleibenden Abweichungen, je mit Grund. Sie darf nur SCHRUMPFEN: der Deckel ist der Ist-Stand,
      und ein Eintrag, dessen Stelle es nicht mehr gibt, muss gestrichen werden (sonst steht die Liste für eine Lage, die
      vorbei ist). Ein NEUER Sonderweg gehört nicht hier hinein, sondern abgebaut. Befund: SUB-SONDERLOCKEN (Befund-Ratsche). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
function funktionsKoerper(name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(KERN);
  if (!m) return null;
  const naechste = /^(async )?function [A-Za-z_$][\w$]*\(/gm;
  naechste.lastIndex = m.index + m[0].length;
  const n = naechste.exec(KERN);
  return KERN.slice(m.index, n ? n.index : KERN.length);
}

const SCHREIBWEGE = ['depotSerialisierenV4', 'subDepotVersiegeln', 'subDepotNeuVersiegeln', 'subDepotEntsiegeln'];

test('[SUB-SONDERLOCKEN·Mechanik] jeder Weg, der einen Depot-Umschlag schreibt, geht durch _depotV4Schreiben — keiner verschlüsselt selbst', () => {
  for (const name of SCHREIBWEGE) {
    const k = funktionsKoerper(name);
    assert.ok(k, name + ' existiert');
    assert.ok(k.includes('_depotV4Schreiben('), name + ' schreibt über den gemeinsamen Speicherweg');
    assert.ok(!/encryptDepot\(/.test(k), name + ' verschlüsselt NICHT an ihm vorbei');
  }
});

test('[SUB-SONDERLOCKEN·Mechanik·Rot-Beweis] ein Sub-Weg mit eigenem encryptDepot fiele auf', () => {
  const kopie = funktionsKoerper('subDepotVersiegeln').replace('_depotV4Schreiben(', 'VdCrypto.encryptDepot(');
  assert.ok(/encryptDepot\(/.test(kopie) && !kopie.includes('_depotV4Schreiben('), 'dieselbe Prüfung schlüge an');
});

// Was ein Sub-Depot heute noch anders macht als jedes Depot — nur schrumpfen. `stelle` muss im Kern stehen.
const POSITIVLISTE = [
  { kennung: 'S6', stelle: 'function subDepotEigenerPasswortWechsel(',
    grund: 'eigener Passwortwechsel ohne Anker-Sitzung; V4-fähig, aber ein eigener Weg neben passwortWechselDurchfuehren' },
  { kennung: 'S7', stelle: "bearbeitung: 'nach-umfang'",
    grund: "Modus 'vollmacht' deklariert eine Umfangs-Regel ('nach-umfang'), die nichts liest — eigene Mechanik, keine reine Positionsfolge" },
  { kennung: 'S8', stelle: 'function blackboxDateiAusUmschlag(',
    grund: 'die Blackbox-Hülle (Export/Einhängen) — seit S1 trägt sie dasselbe Format wie jede Depot-Datei; die Hülle selbst ist noch ein eigener Weg' },
  { kennung: 'S9', stelle: 'async function leseSubUmschlag(', datei: 'vivodepot-lesen.html',
    grund: 'Lese-App: eigener Einstieg für Sub-Umschläge; liest seit S1 V4 über denselben Leser wie jede Depot-Datei' },
  { kennung: 'S11', stelle: 'e.vertretungsGrundlageUmzugOffen',
    grund: 'händischer Umzug der Vertretungsgrundlage (Stufe 67) in subDepotVertrauenOeffnen — braucht Anker-Eintrag und Sub-Passwort zugleich' },
];
// NICHT gezählt, mit Grund: S4 (Ablage im Anker) IST die Position — der eine Unterschied, den es geben darf.
// S7 geteilt: Akzentfarbe und Akteur 'unter-vollmacht' folgen aus der Position (jemand handelt für eine andere Person) —
// nicht gezählt; die deklarierte, nie gelesene Regel 'nach-umfang' ist eigene Mechanik — gezählt.
// Gestrichen: S1 (Anlage V3), S2 (Neuversiegeln V3-Annahme), S3 (keine Fächer), beide mit Probe (sub-depot-gleiches-format,
// sub-depot-v4-neuversiegeln); S5 (Migrationen) mit tests/sub-depot-migrationen.test.js; S10 nie gelandet (geparkt).
// Die KENNUNGEN sind festgeschrieben, nicht nur ihre Zahl: sonst könnte ein neuer Sonderweg einen abgebauten ersetzen, und
// die Zahl bliebe gleich. Die Grundlinie schrumpft im selben Commit wie die Liste — sie wächst nie.
const KENNUNGEN_GRUNDLINIE = ['S6', 'S7', 'S8', 'S9', 'S11'];
const DECKEL = KENNUNGEN_GRUNDLINIE.length;

function positivlisteUrteil(liste) {
  const fremd = liste.map((e) => e.kennung).filter((k) => !KENNUNGEN_GRUNDLINIE.includes(k));
  return { fremd, zuViele: liste.length > DECKEL, zuWenige: liste.length < DECKEL };
}

test('[SUB-SONDERLOCKEN·Positivliste] nur schrumpfen — feste Kennungen, jeder Eintrag steht noch im Code, der Deckel ist der Ist-Stand', () => {
  const u = positivlisteUrteil(POSITIVLISTE);
  assert.deepEqual(u.fremd, [], 'eine Kennung außerhalb der Grundlinie: ein neuer Sonderweg wird abgebaut, nicht eingetragen');
  assert.equal(u.zuViele, false, 'die Liste ist gewachsen');
  assert.equal(u.zuWenige, false, 'geschrumpft? Dann KENNUNGEN_GRUNDLINIE im selben Commit um genau diese Kennung kürzen');
  for (const e of POSITIVLISTE) {
    const text = e.datei ? fs.readFileSync(path.join(__dirname, '..', e.datei), 'utf8') : KERN;
    assert.ok(text.includes(e.stelle), e.kennung + ': die Stelle gibt es nicht mehr — streichen und den Deckel senken');
    assert.ok(e.grund && e.grund.length > 30, e.kennung + ' trägt einen Grund');
  }
});

test('[SUB-SONDERLOCKEN·Positivliste·Rot-Beweis] ein Tausch — neuer Sonderweg statt eines abgebauten, gleiche Zahl — fällt auf', () => {
  const getauscht = POSITIVLISTE.filter((e) => e.kennung !== 'S6').concat([{ kennung: 'S12', stelle: 'x', grund: 'ein neuer Sonderweg, der einen abgebauten ersetzt' }]);
  assert.equal(getauscht.length, POSITIVLISTE.length, 'Vorbedingung: dieselbe Zahl');
  assert.deepEqual(positivlisteUrteil(getauscht).fremd, ['S12'], 'die Zahl allein hätte es nicht gesehen, die Kennung schon');
});
