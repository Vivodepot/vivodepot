'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A64 — der Sensibel-Knopf an der Feldzeile — ENTFERNT (Zug 5, „Die
   Herausgabe kommt ohne Kästchen aus", 12.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Der Knopf selbst (`sensibelKnopfHTML`, `data-sensibel-toggle`, die vier
   button-spezifischen Proben, die bis 12.08.2026 hier standen) ist mit dem
   Feature entfernt — die einzige verbleibende Bedienstelle für Sensibilität ist
   der Herausgabe-Dialog (`flowExportUebersicht`, s. dort).

   WAS BLEIBT UND WARUM: die zwei Voraussetzungen unten prüfen nicht den Knopf,
   sondern das DATENMODELL, das er nur EIN Verbraucher unter mehreren war —
   `feldIstSensibel`/`feldSensibelMarkiert` bedienen weiterhin
   `exportUebersichtModell` und jeden Export-Weg. Voraussetzung a: jedes Feld mit
   `sensibel: true` steht in der N4-Grundlinie (kein stiller Zuwachs).
   Voraussetzung b (Regel 17): jeder Sensibel-Verbraucher nimmt eine echte
   Bereichs-id, keinen Situations-Namensraum — sonst markierte eine Bürgerin
   „nicht herausgeben", und kein Exportweg läse es.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function offenesDepot() {
  const { V, src } = ladeKern();
  await V.depotAnlegen('a64-pw');
  V.akteurSelbstErklaeren('Tester');
  return { V, src };
}

/* ── VORAUSSETZUNG a — seit N4 (09.08.2026) ──────────────────────────────────
   N4 Zug 1 setzt `sensibel:true` an 97+ echten Feldern (Liste 1, Grundlagendokument) — die
   Probe hier läuft am ECHTEN Bestand, nicht an einem erfundenen Objekt. */
test('[A64·Wächter] jedes Feld mit `sensibel: true` steht in der N4-Liste-1-Grundlinie — kein stiller Zuwachs', async () => {
  const { V } = await offenesDepot();
  const grundlinie = require('../tools/w3-sensibel-grundlinie.json');
  // „Die Sensibel-Architektur", Zug 1+3 (09.08.2026): Unterfeld-Einträge der
  // Grundlinie waren hier bislang ausgeschlossen, weil `sensibel: true` an einem Listen-
  // Unterfeld vor Zug 1 wirkungslos war — ein Zuwachs dort konnte nichts bedeuten. Seit Zug 1
  // wirkt er (dritte Adressierungsebene), darum zählt die Grundlinie ihn jetzt mit.
  const erlaubt = new Set(grundlinie.filter((e) => !e.sektor.startsWith('sit:'))
    .map((e) => e.sektor + '.' + e.feld + (e.unterfeld ? '.' + e.unterfeld : '')));
  const treffer = [];
  const pruefe = (f, wo) => {
    if (f && f.sensibel === true) treffer.push(wo + '.' + f.id);
    for (const u of (f && f.unterFelder) || []) if (u.sensibel === true) treffer.push(wo + '.' + f.id + '.' + u.id);
  };
  let gezaehlt = 0;
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) { pruefe(f, s.id); gezaehlt++; }
  }
  for (const sit of (V.SITUATIONEN || [])) {
    for (const f of (sit.eigeneFelder || sit.felder || [])) { pruefe(f, 'sit:' + sit.id); gezaehlt++; }
  }
  assert.ok(gezaehlt > 100, 'nur ' + gezaehlt + ' Felder durchlaufen — der Suchraum trägt die Aussage nicht');
  const unbekannt = treffer.filter((t) => !erlaubt.has(t));
  assert.deepEqual(unbekannt, [],
    'Diese FELDER tragen `sensibel: true`, stehen aber NICHT in Liste 1 (N4-Grundlinie):\n  '
    + unbekannt.join('\n  ') + '\n\nEin Flag außerhalb der geprüften Liste ist entweder ein neuer, '
    + 'noch nicht berichteter Fund oder ein Tippfehler in der Feld-id — nicht stillschweigend zu übergehen.');
});

test('[A64·Positivkontrolle] ein erfundenes `sensibel: true` fällt der Zählung auf', () => {
  /* Der Zähler oben läuft über einen Bestand, in dem nichts zu finden ist. Ob er FÄNDE, weiss
     bis hierher niemand — Regel 13, zweite Hälfte: Aussage über den Wächter, erfundener Weg. */
  const treffer = [];
  const pruefe = (f, wo) => {
    if (f && f.sensibel === true) treffer.push(wo + '.' + f.id);
    for (const u of (f && f.unterFelder) || []) if (u.sensibel === true) treffer.push(wo + '.' + f.id + '.' + u.id);
  };
  pruefe({ id: 'harmlos' }, 'x');
  pruefe({ id: 'heikel', sensibel: true }, 'x');
  pruefe({ id: 'liste', unterFelder: [{ id: 'drin', sensibel: true }] }, 'x');
  assert.deepEqual(treffer, ['x.heikel', 'x.liste.drin'],
    'die Zählung muss Feld UND Unterfeld finden — sonst ist ihr Schweigen wertlos');
});

/* ── VORAUSSETZUNG b — worauf das Gate im Erzeuger steht (Regel 17) ─────────── */
const SENSIBEL_VERBRAUCHER = /\b(feldIstSensibel|feldSensibelMarkiert)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

// „Die Sensibel-Architektur", Zug 2 (09.08.2026) — BEWUSSTE Erweiterung, wie die
// Fehlermeldung unten selbst verlangt: `angehoerigenCacheModell`s `setSituation` liest jetzt
// `feldIstSensibel(def, 'sit:' + sitId)`, um die bislang UNGEPRÜFTEN situations-eigenen Felder
// (erb_* im Behörden-&-Nachlass-Angehörigen-Blatt, sieben laut Auftrag betroffen) zu schützen.
// Das Gate `SEKTOR_BY_ID[sektorId]` in `sensibelKnopfHTML` bleibt UNVERÄNDERT — diese Erweiterung
// betrifft nur den LESE-Pfad (ob eine Markierung/Schema-Flag beim Kopieren gilt), nicht den
// Knopf (ob die Bürgerin eine setzen kann). Der Knopf am `sit:`-Feld bleibt darum weiterhin
// wirkungslos für das SETZEN — nur das (ohnehin bereits gültige) Schema-Flag wird jetzt gelesen.
// NICHT hierunter fällt jeder künftige `sit:`-Aufruf — nur dieser eine, hier benannte.
// L3-Fund (19./20.09.2026): das Situationsblatt las bislang das Schema-Flag `.sensibel` direkt,
// statt über `feldIstSensibel` — die Überschreibung der Inhaberin (ein zurückgehaltenes Feld
// wieder freigeben) griff darum nicht, weder im Druck/Akut-Pfad noch im PDF (Fix „Situationsblatt
// liest die Sensibel-Überschreibung der Inhaberin", Wächter tools/sensibel-direktlesung-pruefen.js
// gegen die direkte Lesung). Dieselbe Kategorie wie die Zug-2-Erweiterung oben: nur der LESE-Pfad
// (ob ein sensibles Situationsfeld angezeigt wird), keine neue SETZEN-Fläche — der Knopf bleibt
// weiterhin nur an Bereichs-Feldern wirksam.
const A64_BEWUSSTE_SIT_AUFRUFE = new Set([
  "feldIstSensibel(def, 'sit:' + sitId)",
  'feldIstSensibel(f, _sitNs(sitId))',
]);

test('[A64·Wächter] jeder Sensibel-Verbraucher nimmt eine echte Bereichs-id, keinen `sit:`-Namensraum — außer den bewusst erweiterten', async () => {
  const { src } = await offenesDepot();
  const schlecht = [];
  let n = 0;
  for (const m of src.matchAll(SENSIBEL_VERBRAUCHER)) {
    const args = m[2];
    if (/^\s*(sektorId|feldId|an)\s*,/.test(args) && /feldSensibelMarkiert\(sektorId, feldId\)/.test(m[0])) { /* die Definition selbst */ }
    n++;
    if (/_sitNs\s*\(|['"]sit:/.test(args) && !A64_BEWUSSTE_SIT_AUFRUFE.has(m[0])) schlecht.push(m[0]);
  }
  assert.ok(n >= 6, 'nur ' + n + ' Aufrufstellen gefunden — der Leser greift ins Leere');
  assert.deepEqual(schlecht, [],
    'Diese Sensibel-Aufrufe bekommen einen Situations-Namensraum statt eines Bereichs:\n  '
    + schlecht.join('\n  ')
    + '\n\nDarauf steht das Gate `SEKTOR_BY_ID[sektorId]` in `sensibelKnopfHTML` (A64): solange KEIN '
    + 'Exportweg `sensibelFelder["sit:<id>"]` liest, wäre ein Knopf am Situations-Feld Schutz, der '
    + 'nur so aussieht. Liest jetzt einer davon — dann gehört das Gate erweitert, und zwar bewusst.');
});

test('[A64·Positivkontrolle] ein `sit:`-Aufruf würde gefunden', () => {
  const erfunden = "if (feldIstSensibel(f, _sitNs(sitId))) return;\n"
    + "const x = feldSensibelMarkiert('sit:notarzt', f.id);\n"
    + "const ok = feldIstSensibel(f, s.id);";
  const schlecht = [...erfunden.matchAll(SENSIBEL_VERBRAUCHER)]
    .filter((m) => /_sitNs\s*\(|['"]sit:/.test(m[2]));
  assert.equal(schlecht.length, 2,
    'beide `sit:`-Formen müssen auffallen (Funktions-Aufruf UND Literal), die echte Bereichs-id nicht');
});
