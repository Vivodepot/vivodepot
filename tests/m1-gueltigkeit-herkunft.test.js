'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   M1 · Zug 6 — die Herkunft reist mit, und das ist Bedingung, nicht Zutat
   ────────────────────────────────────────────────────────────────────────────
   Eine selbst eingetragene Frist hat eine andere Verlässlichkeit als eine, die
   aus einem angedockten Modul stammt. Ohne diese Unterscheidung sagt das
   Prüfblatt „gilt bis 30.09." und verschweigt, wer das behauptet.

   DER ROT-BELEG DES AUFTRAGS: dieselbe Frist einmal selbst eingetragen und
   einmal aus einem Modul — beide erscheinen, und die Sicht unterscheidet sie
   nachweislich.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function depotMitAkteur() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.akteurSelbstErklaeren('Testerin');
  return V;
}

/* ══ Die Messung, die der Auftrag zuerst verlangt ══════════════════════════ */

test('[M1·Zug6·Messung] `urheberschaft` führt DENSELBEN Schlüsselraum wie `feldGueltigkeit`', () => {
  const { V, src } = ladeKern();
  assert.ok(/data\.urheberschaft\[sektorId\]\[feldId\]/.test(src), 'beide sind [sektorId][feldId]');
  // Und niemand zählt die inneren Schlüssel auf — darum kann ein zusätzlicher keinen Leser stören.
  const zaehlt = (src.match(/Object\.keys\(\s*data\.urheberschaft\[[^\]]+\]\s*\)/g) || []).length;
  assert.equal(zaehlt, 0, 'kein Leser zählt die inneren Schlüssel auf');
  assert.equal(V._gueltigkeitStempelSchluessel('ausweis_gueltig'), 'gueltigkeit:ausweis_gueltig');
});

test('[M1·Zug6·Gefahr] der Stempel steht NICHT am Feldschlüssel — sonst kippte der Wahrheits-Filter', async () => {
  const V = await depotMitAkteur();
  V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2030-03-02');
  // Die Kette des FELDWERTS bleibt unberührt: `_feldVerifiziertStaemmig` liest ihren letzten
  // Eintrag, um zu entscheiden, ob der WERT aus einem verifizierten Credential stammt.
  assert.equal(V.liesUrheberschaft('identity', 'ausweis_gueltig').length, 0,
    'kein Gültigkeits-Stempel in der Wertkette');
  assert.equal(V.liesUrheberschaft('identity', 'gueltigkeit:ausweis_gueltig').length, 1,
    'sondern unter dem eigenen, benannten Schlüssel');
});

/* ══ Der Rot-Beleg ═════════════════════════════════════════════════════════ */

test('[M1·Zug6·Rot] dieselbe Frist, einmal selbst und einmal aus einem Modul — die Sicht unterscheidet sie', async () => {
  const V = await depotMitAkteur();
  // 1 · Selbst eingetragen — über den echten Schreibweg.
  V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2030-09-30');
  // 2 · Aus einem Modul: die Gültigkeit liegt im Depot, ohne dass jemand sie hier eingetragen hat.
  const d = V.getData();
  d.feldGueltigkeit.mobility = { passportValidUntil: { bis: '2030-09-30' } };
  V.setData(d);

  const selbst = V.feldGueltigkeitHerkunft('identity', 'ausweis_gueltig');
  const fremd = V.feldGueltigkeitHerkunft('mobility', 'passportValidUntil');
  assert.equal(selbst.selbst, true, 'die eigene trägt einen Stempel');
  assert.ok(selbst.stempel, 'und der Stempel ist da');
  assert.equal(fremd.selbst, false, 'die fremde nicht');
  assert.equal(fremd.stempel, null);

  // BEIDE erscheinen — die Herkunft entscheidet über die Aussage, nicht über die Sichtbarkeit.
  const termine = V.prueftermineFelder(new Date('2026-08-18'));
  const ausweis = termine.find(t => t.id && t.id.includes('ausweis_gueltig'));
  const pass = termine.find(t => t.id && t.id.includes('passportValidUntil'));
  assert.ok(ausweis && pass, 'beide Fristen stehen im Prüfblatt');
  assert.equal(ausweis.selbstEingetragen, true);
  assert.equal(pass.selbstEingetragen, false);
});

test('[M1·Zug6] eine Gültigkeit OHNE Eintrag hat keine Herkunft — null, nicht „unbekannt"', async () => {
  const V = await depotMitAkteur();
  assert.equal(V.feldGueltigkeitHerkunft('identity', 'ausweis_gueltig'), null,
    'keine Gültigkeit, keine Herkunftsaussage');
});

test('[M1·Zug6] der Stempel ist beste Absicht, kein Tor — ohne Akteur steht die Gültigkeit trotzdem', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());   // KEIN akteurSelbstErklaeren
  assert.doesNotThrow(() => V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2030-03-02'));
  assert.deepEqual(V.feldGueltigkeitLesen('identity', 'ausweis_gueltig'), { von: null, bis: '2030-03-02' });
  const h = V.feldGueltigkeitHerkunft('identity', 'ausweis_gueltig');
  assert.equal(h.selbst, false, 'ohne Stempel heisst „nicht von hier" — keine erfundene Quelle');
});

test('[M1·Zug6] die Kette ist append-only: zweimal setzen, zwei Stempel, der erste bleibt', async () => {
  const V = await depotMitAkteur();
  V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2030-03-02');
  const erster = V.liesUrheberschaft('identity', 'gueltigkeit:ausweis_gueltig')[0];
  V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2031-03-02');
  const kette = V.liesUrheberschaft('identity', 'gueltigkeit:ausweis_gueltig');
  assert.equal(kette.length, 2);
  assert.deepEqual(kette[0], erster, 'der erste Eintrag ist eingefroren');
});

test('[M1·Zug6·Rot] das Prüfblatt ZEIGT den Unterschied — nicht nur das Modell kennt ihn', async () => {
  const V = await depotMitAkteur();
  V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2027-09-30');
  const d = V.getData();
  d.feldGueltigkeit.mobility = { passportValidUntil: { bis: '2027-09-30' } };
  V.setData(d);
  const html = V.prueftermineSektionHTML();
  const treffer = (html.match(new RegExp(V.STRINGS.gueltigkeitSelbstEingetragen, 'g')) || []).length;
  assert.equal(treffer, 1,
    'genau EINE der beiden gleich lautenden Fristen trägt die Herkunftsangabe — die selbst gesetzte');
  assert.ok(html.includes('Ausweis') || html.includes('ausweis'), 'und beide Zeilen stehen da');
});

test('[M1·Zug6] der Wortlaut ist ein VORSCHLAG und steht im Satz, nicht im Quelltext', () => {
  const { V, src } = ladeKern();
  assert.equal(V.STRINGS.gueltigkeitSelbstEingetragen, 'von Ihnen eingetragen');
  // Er darf nirgends als Literal danebenstehen — sonst gäbe es zwei Wahrheiten.
  const treffer = (src.match(/'von Ihnen eingetragen'|"von Ihnen eingetragen"/g) || []).length;
  assert.equal(treffer, 1, 'genau eine Fundstelle: die Tabelle selbst');
});
