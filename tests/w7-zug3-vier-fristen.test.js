'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — die berechneten Fristen. Ursprung W-7 Zug 3 (09.08.2026): vier
   Fristen, hart verdrahtet in einem `switch` über die Feld-Kennung.

   Umgeschrieben am 21.08.2026, A419 Weg 2 (Laufzettel „Nach den dreizehn“,
   Posten 1): die Regeln stehen jetzt DEKLARATIV an den Felddefinitionen
   (`fristRegel`), der Namens-`switch` ist fort. Die Probe geht darum nicht
   mehr gegen vier Einzelfunktionen, sondern gegen die echten Definitionen
   aus dem Katalog — sie belegt damit zusätzlich, dass die Regel wirklich AM
   FELD hängt und nicht daneben.

   Dieselbe Linie wie notvertretungAblaufText (U2-ADR-109): BERECHNET, NIE
   GESPEICHERT. Die beiden Fälle, in denen ein naiver Tage-Zähler falsch
   rechnen würde (§ 28 PStG Werktagsregel, § 1944 BGB Kenntnis-statt-Tod),
   sind eigens geprüft.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function sitFeld(V, sitId, feldId) {
  const sit = V.SITUATION_BY_ID[sitId];
  for (const blk of sit.bloecke || []) for (const e of blk.eintraege || []) {
    if (e.feld && e.feld.id === feldId) return e.feld;
  }
  return null;
}
function sektorFeld(V, sektorId, feldId) {
  return V.SEKTOR_BY_ID[sektorId].sektionen.flatMap((s) => s.felder || []).find((f) => f.id === feldId);
}

test('[W7-Zug3] erb_sterbeurkunde — § 28 PStG, drei Werktage nach dem Sterbedatum (Sa/So übersprungen)', () => {
  const { V } = ladeKern();
  // Donnerstag 06.08.2026 gestorben → Fr 07., (Sa/So übersprungen), Mo 10. = Werktag 2, Di 11. = Werktag 3.
  const text = V._fristHinweisFuerFeld(sitFeld(V, 'erbfall', 'erb_sterbeurkunde'),
    { erb_sterbedatum: '2026-08-06' }, null, new Date('2026-08-06T00:00:00Z'));
  assert.match(text, /2026-08-11/, 'drei WERKTAGE, nicht drei Kalendertage — Sa 08./So 09. zählen nicht mit');
});

test('[W7-Zug3] erb_sterbeurkunde — Rotmachbarkeits-Beleg: ein naiver Drei-Tage-Zähler würde 2026-08-09 (Sonntag) liefern', () => {
  const naiv = new Date('2026-08-06T00:00:00Z');
  naiv.setUTCDate(naiv.getUTCDate() + 3);
  assert.equal(naiv.toISOString().slice(0, 10), '2026-08-09', 'Vorbedingung: der naive Zähler landet auf einem Sonntag');
});

test('[W7-Zug3] erb_sterbeurkunde — ohne Sterbedatum kein Hinweis (kein Erfinden)', () => {
  const { V } = ladeKern();
  assert.equal(V._fristHinweisFuerFeld(sitFeld(V, 'erbfall', 'erb_sterbeurkunde'), {}, null, new Date()), '');
});

test('[W7-Zug3] erb_schulden_kenntnis — § 1944 BGB, sechs Wochen ab KENNTNIS, nicht ab dem Sterbedatum', () => {
  const { V } = ladeKern();
  const f = sitFeld(V, 'erbfall', 'erb_schulden_kenntnis');
  const text = V._fristHinweisFuerFeld(f,
    { erb_schulden_kenntnis: '2026-06-01', erb_sterbedatum: '2026-01-01' }, null, new Date('2026-06-01T00:00:00Z'));
  // 2026-06-01 + 6 Wochen = 2026-07-13 — NICHT irgendein Datum, das vom Sterbedatum 2026-01-01 ausginge.
  assert.match(text, /2026-07-13/, 'sechs Wochen ab der Kenntnis');
  assert.doesNotMatch(text, /2026-02-12/, 'sechs Wochen ab dem Sterbedatum wären 2026-02-12 — das wäre der Fehler');
});

test('[W7-Zug3] erb_schulden_kenntnis — ohne Kenntnisdatum kein Hinweis, auch wenn ein Sterbedatum vorliegt', () => {
  const { V } = ladeKern();
  assert.equal(V._fristHinweisFuerFeld(sitFeld(V, 'erbfall', 'erb_schulden_kenntnis'),
    { erb_sterbedatum: '2026-01-01' }, null, new Date()), '');
});

test('[W7-Zug3] geburt_kind_kv — § 198 Abs. 1 VVG, zwei Monate nach der Geburt', () => {
  const { V } = ladeKern();
  const text = V._fristHinweisFuerFeld(sitFeld(V, 'geburt', 'geburt_kind_kv'),
    { geburt_datum: '2026-06-15' }, null, new Date('2026-06-15T00:00:00Z'));
  assert.match(text, /2026-08-15/);
});

test('[W7-Zug3] pflegegrad_bescheid_vom — § 84 Abs. 1 SGG, ein Monat nach Bekanntgabe des Bescheids', () => {
  const { V } = ladeKern();
  const text = V._fristHinweisFuerFeld(sektorFeld(V, 'socialInsurance', 'noticeDated'),
    null, { noticeDated: '2026-03-10' }, new Date('2026-03-10T00:00:00Z'));
  assert.match(text, /2026-04-10/);
});

test('[W7-Zug3] „Frist abgelaufen“ vs. „Frist läuft bis“ — dieselbe Unterscheidung wie notvertretungAblaufText', () => {
  const { V } = ladeKern();
  const f = sektorFeld(V, 'socialInsurance', 'noticeDated');
  const laeuft = V._fristHinweisFuerFeld(f, null, { noticeDated: '2026-03-10' }, new Date('2026-03-15T00:00:00Z'));
  const abgelaufen = V._fristHinweisFuerFeld(f, null, { noticeDated: '2026-03-10' }, new Date('2026-05-01T00:00:00Z'));
  assert.match(laeuft, new RegExp(V.STRINGS.fristFaelligAm));
  assert.match(abgelaufen, new RegExp(V.STRINGS.fristAbgelaufen));
});

test('[W7-Zug3] die vier Bezugsdatum-Felder sind im Schema angelegt', () => {
  const { V } = ladeKern();
  assert.equal(sitFeld(V, 'erbfall', 'erb_sterbedatum').typ, 'datum');
  assert.equal(sitFeld(V, 'erbfall', 'erb_schulden_kenntnis').typ, 'datum');
  assert.equal(sitFeld(V, 'geburt', 'geburt_datum').typ, 'datum');
  assert.equal(sektorFeld(V, 'socialInsurance', 'noticeDated').typ, 'datum');
});

/* ── A419 Weg 2, 21.08.2026 ─────────────────────────────────────────────────────────────── */

test('[A419-Weg2] die drei Felder, die den ANFANG speichern, tragen Marke UND Regel', () => {
  const { V } = ladeKern();
  const faelle = [
    [sektorFeld(V, 'socialInsurance', 'noticeDated'), 'P1M'],
    [sektorFeld(V, 'socialInsurance', 'terminationDate'),        'P3W'],
    [sitFeld(V, 'erbfall', 'erb_schulden_kenntnis'),                 'P6W'],
  ];
  for (const [f, dauer] of faelle) {
    assert.ok(Array.isArray(f.marken) && f.marken.includes('frist'), f.id + ' trägt die Marke `frist` nicht');
    assert.equal(f.fristRegel.dauer, dauer, f.id);
    assert.equal(f.fristRegel.abFeld, undefined, f.id + ' rechnet auf dem EIGENEN Wert, nicht auf einem Nachbarfeld');
    assert.ok(f.fristRegel.quelle, f.id + ' nennt keine Rechtsgrundlage');
  }
});

test('[A419-Weg2] kuendigungsdatum — § 4 Satz 1 KSchG, drei Wochen ab Zugang', () => {
  const { V } = ladeKern();
  const text = V._fristHinweisFuerFeld(sektorFeld(V, 'socialInsurance', 'terminationDate'),
    null, { terminationDate: '2026-03-02' }, new Date('2026-03-02T00:00:00Z'));
  assert.match(text, /2026-03-23/, 'drei Wochen ab dem 02.03. sind der 23.03.');
});

test('[A419-Weg2] eine unbekannte Dauer erfindet keine Frist — und wird BENANNT', () => {
  const { V } = ladeKern();
  const geprueft = V.feldFristRegelPruefen({ dauer: 'P99J' });
  assert.equal(geprueft.regel, null);
  assert.equal(geprueft.verworfen, 'P99J', 'die verworfene Dauer wird genannt, nicht verschluckt');
  assert.equal(V._fristHinweisFuerFeld({ id: 'x', fristRegel: { dauer: 'P99J' } },
    { x: '2026-01-01' }, null, new Date('2026-01-01T00:00:00Z')), '');
});

test('[A419-Weg2] Rot-Beweis: ein ANGEDOCKTES Feld bekommt seinen Hinweis — der alte Namens-switch konnte das nie', () => {
  const { V } = ladeKern();
  // Ein Feld, dessen Kennung in KEINEM eingebauten Katalog steht. Der Vorgänger verzweigte
  // über genau diese Kennung und hätte hier '' geliefert.
  const angedockt = { id: 'tpl_kammer_widerspruch_ab', typ: 'datum',
    marken: ['frist'], fristRegel: { dauer: 'P1M', quelle: '§ 84 Abs. 1 SGG' } };
  const text = V._fristHinweisFuerFeld(angedockt, null,
    { tpl_kammer_widerspruch_ab: '2026-03-10' }, new Date('2026-03-10T00:00:00Z'));
  assert.match(text, /2026-04-10/, 'die Regel am Feld wirkt unabhängig von der Kennung');
});

test('[A419-Weg2] Rot-Beweis im Prüfblatt: ein ANFANG-Feld darf nicht sein Rohdatum als Fälligkeit zeigen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('a419-weg2-pw-777');
  V.akteurSelbstErklaeren('Maria');
  V.betreteApp();
  const d = V.getData();
  d.sektoren.socialInsurance = d.sektoren.socialInsurance || {};
  d.sektoren.socialInsurance.noticeDated = '2026-03-10';
  const zeilen = V.prueftermineFristen(new Date('2026-03-15T00:00:00Z'));
  const zeile = zeilen.find((z) => String(z.id).includes('noticeDated'));
  assert.ok(zeile, 'die Frist erscheint im Prüfblatt');
  assert.equal(zeile.faelligAm, '2026-04-10', 'gerechnet: ein Monat nach dem Bescheid');
  assert.notEqual(zeile.faelligAm, '2026-03-10', 'das Bescheid-Datum selbst ist NICHT die Fälligkeit');
  assert.equal(zeile.istFrist, true);
});

test('[W7-Zug3] renderSituation hängt den berechneten Fristhinweis unter erb_sterbeurkunde, wenn ein Sterbedatum gesetzt ist', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('w7zug3-pw-999');
  V.akteurSelbstErklaeren('Maria');
  V.betreteApp();
  V.getData().situationen = V.getData().situationen || {};
  V.getData().situationen.erbfall = { erb_sterbedatum: '2026-08-06' };
  V.renderSituation('erbfall');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /Frist läuft bis 2026-08-11|Frist abgelaufen seit 2026-08-11/);
});

test('[W7-Zug3] renderSektor hängt den berechneten Fristhinweis an, wenn ein Bescheid-Datum gesetzt ist', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('w7zug3-pw-998');
  V.akteurSelbstErklaeren('Maria');
  V.betreteApp();
  if (!V.getData().sektoren.socialInsurance) V.getData().sektoren.socialInsurance = {};
  // CW-8 (24.08.2026): pflegegrad_bescheid_vom ist jetzt an gesetzten Pflegegrad gebunden
  // (sichtbarWenn) — ohne ihn wäre das Feld unsichtbar und der Fristhinweis würde gar nicht erst
  // gerendert. Realistisches Fixture: ein Bescheid-Datum setzt einen kommunizierten Pflegegrad voraus.
  V.getData().sektoren.socialInsurance.careLevel = '2';
  V.getData().sektoren.socialInsurance.noticeDated = '2026-03-10';
  V.renderSektor('socialInsurance');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /Frist läuft bis 2026-04-10|Frist abgelaufen seit 2026-04-10/);
});
