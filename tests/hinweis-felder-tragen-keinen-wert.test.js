'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-102 · Namensdisziplin: ein `_hinweis`-Feld trägt keinen Wert
   ────────────────────────────────────────────────────────────────────────
   ANLASS (Triage der 26, 26.07.): `erbfolge_hinweis` heißt `_hinweis`, ist aber
   vom Typ `auswahl` — es TRÄGT einen Wert. Wer nach dem Namen sortiert, legt es
   zu den harmlosen; in der Triage wäre es fast in Ausgang 2 gelandet, wo nichts
   zu tun ist. Gemessen statt gelesen fiel es auf.

   Das ist keine Instanz, sondern eine KLASSE: ein Bezeichner, der etwas anderes
   verspricht als der Typ hält. Deshalb ein Wächter statt eines Rename — eine
   Feld-id-Änderung zöge nach U2-ADR-100 §8 einen Alt-Label-Register-Eintrag und
   den B16-Import-Alias nach sich, und „ist nur eine Zeile" war heute früh der
   Anfang von drei Stunden.

   BEIDE Dateien: der Kern und die Lese-App deklarieren getrennt, und sie sind
   heute schon auseinandergelaufen (34 unausgewertete `sichtbarWenn` in der
   Lese-App). Ein Wächter, der nur eine Datei liest, wäre die halbe Prüfung.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-102';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = ['u2-102-hinweis-felder-tragen-keinen-wert'];

/* ── BENANNTE, GEZÄHLTE Ausnahme — LEER seit 19.09.2026 (dod-stand#B8) ────
   NICHT als Eintrag in `_bekannte-fehlschlaege.js`: diese Liste ist LEER —
   „Ziel: leere Liste = Umbau fertig" ist erreicht — und trägt die Regel „Die
   Liste schrumpft nur … nie ergänzt, um einen neuen Fehler ruhigzustellen. Wer
   hier etwas hinzufügt, hebt den Zweck der Liste auf." Ein Eintrag dort würde
   ein geschlossenes Kapitel wieder öffnen.

   Die einzige geführte Ausnahme (`erbfolge_hinweis`, seit 2026-07-26) betraf
   allein das Flachfeld der Lese-App-Sektion `verfuegungen-vollmachten-
   testament` — der Kern kannte das Feld schon seit dem Kennungs-Umbau nicht
   mehr. Mit B8 (19.09.2026) ist das Flachfeld selbst aus der Lese-App entfernt
   (UMBAU_RUECKSTAND nachgezogen); die Ausnahme greift ins Leere und ist
   ersatzlos gestrichen — eine Ausnahme, die niemand zurückbaut, wird zur
   Dauerregel. */
const ERLAUBT = [];

function wertTragendeHinweisFelder(V) {
  const treffer = [];
  const lauf = (felder, ort) => {
    for (const f of felder || []) {
      if (/_hinweis$/.test(f.id || '') && f.typ !== 'hinweis') treffer.push({ id: f.id, ort, typ: f.typ });
      if (f.unterFelder) lauf(f.unterFelder, ort + '/' + f.id);
    }
  };
  for (const s of V.SEKTOREN || []) {
    lauf(s.felder, s.id);
    for (const sek of (s.sektionen || [])) lauf(sek.felder, s.id + '/' + sek.id);
  }
  return treffer;
}

function beideApps() {
  const k = ladeKern().V;
  const l = ladeLesen(); const lv = l.V || l;
  return [['Kern', k], ['Lese-App', lv]];
}

/* ── Wächter ─────────────────────────────────────────────────────────────── */
test('u2-102-hinweis-felder-tragen-keinen-wert', () => {
  const erlaubteIds = new Set(ERLAUBT.map(e => e.id));
  const neu = [];
  for (const [wo, V] of beideApps()) {
    const treffer = wertTragendeHinweisFelder(V);
    // Positivkontrolle des Suchraums (§3.5b): ohne Felder liefe der Wächter über nichts.
    assert.ok((V.SEKTOREN || []).length > 0, wo + ': keine Sektoren geladen — der Wächter liefe über nichts');
    for (const t of treffer) if (!erlaubteIds.has(t.id)) neu.push(wo + ' · ' + t.ort + '/' + t.id + ' (typ=' + t.typ + ')');
  }
  assert.deepEqual(neu, [],
    'Ein Feld, dessen id auf `_hinweis` endet, darf keinen werttragenden Typ haben — der Name '
    + 'verspricht sonst etwas anderes, als das Feld hält, und jede spätere Sichtung ordnet es '
    + 'falsch ein:\n  ' + neu.join('\n  '));

  // Die Ausnahme kann nicht still wachsen.
  assert.equal(ERLAUBT.length, 0, 'Zahl der geführten Ausnahmen geändert — begründen und diese Zahl mitziehen');
  for (const e of ERLAUBT) {
    assert.match(e.seit, /^\d{4}-\d{2}-\d{2}$/, e.id + ': Ausnahme ohne Datum');
    assert.ok(e.grund && e.grund.length > 30, e.id + ': Ausnahme ohne tragenden Grund');
  }
});

/* ── Negativprobe, gekoppelt (operating-manual §7.5) ──────────────────────── */
test('[Negativprobe] u2-102-hinweis feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  // Die Lese-App, nicht der Kern: seit U2-ADR-102/B8 ist ERLAUBT leer — Rückstellung ist 0, nicht 1.
  const [, V] = beideApps()[1];
  const vorher = wertTragendeHinweisFelder(V);
  assert.equal(vorher.length, 0, 'Rückstellung: keine geführte Ausnahme mehr, war: ' + JSON.stringify(vorher));

  // MUTATION: ein `_hinweis`-Feld bekommt einen werttragenden Typ.
  const sektor = (V.SEKTOREN || [])[0];
  const ziel = { id: 'probe_hinweis', label: 'Probe', typ: 'text' };
  (sektor.felder = sektor.felder || []).push(ziel);
  const rot = wertTragendeHinweisFelder(V);
  assert.equal(rot.length, 1, 'die Mutation muss als einziger Treffer erscheinen, war: ' + JSON.stringify(rot));
  assert.ok(rot.some(t => t.id === 'probe_hinweis'), 'und zwar genau sie');
  sektor.felder.pop();
  assert.equal(wertTragendeHinweisFelder(V).length, 0, 'Rückstellung fehlgeschlagen');

  // NEGATIVKONTROLLE (§3.5b): ein `_hinweis`-Feld MIT typ `hinweis` darf NICHT anschlagen —
  // sonst meldete der Wächter jedes Hinweisfeld und wäre wertlos.
  sektor.felder.push({ id: 'echter_hinweis', label: 'Probe', typ: 'hinweis' });
  assert.equal(wertTragendeHinweisFelder(V).length, 0, 'ein echtes Hinweisfeld darf nicht anschlagen');
  sektor.felder.pop();
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-102 nennt auch die Hinweis-Pruefung', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

module.exports = {
  PROBEN: [{ fuer: 'u2-102-hinweis-felder-tragen-keinen-wert', diskriminante: wertTragendeHinweisFelder }],
};
