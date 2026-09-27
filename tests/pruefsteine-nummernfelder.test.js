'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   TEIL C · Prüfstein 3 und 5 — gemessen und vorgelegt, NICHT entschieden
   ────────────────────────────────────────────────────────────────────────────
   Auftrag „Der grosse Zug", Teil C. Beide Prüfsteine tragen einen Abbruch; beide
   Abbrüche sind eingetreten. Diese Datei hält den gemessenen Stand fest, an dem
   die Produktentscheidung entscheidet — und wird rot, wenn er sich verschiebt.

   PRÜFSTEIN 3 · Alle zwanzig Korb-1-Felder sind EINWERTIG (`text` oder `datum`),
   KEINES ist eine Liste. Ein Mensch kann heute nicht zwei Nummern derselben Art
   nebeneinander führen — Doppelstaatler, Grenzgänger, Zugezogene mit behaltener
   alter Nummer. **Ob das Feld künftig einen Wert trägt oder mehrere, ist die
   Struktur-Frage mit der längsten Wirkung**, und der Auftrag legt sie
   ausdrücklich vor.

   PRÜFSTEIN 5 · Zwei spanische Textsätze verschiedener Anbieter liegen im Depot
   nebeneinander (A437 trägt) — **angezeigt wird der ZULETZT angemeldete.** Es
   gibt keinen Weg zu sagen, welcher gilt: `registry[m.sprache]` ist allein nach
   der Sprache geschlüsselt. **Und ein Satz, der einen `rechtsraum` mitbringt,
   wird ANGENOMMEN und die Angabe stillschweigend ignoriert** — dieselbe Klasse
   wie `appVersion` am Vorlagen-Bündel aus Erhebung 12: „wird akzeptiert" ist
   nicht „wirkt".

   DER ABBRUCH, den der Auftrag den wichtigsten nennt, ist damit eingetreten: der
   Schlüssel der Textsatz-Registry müsste um den Rechtsraum erweitert werden, und
   er steckt im Depot-Format. Das wäre ein VIERTES Glied dieses Schnitts.

   NACHTRAG — Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): PRÜFSTEIN 3 IST
   ENTSCHIEDEN. Die Produktentscheidung hat die Struktur-Frage beantwortet: mehrwertig.
   Alle zwanzig Korb-1-Feld-Slots sind zu Unterfeldern von neun `typ:'liste'`-
   Gruppen geworden (Doppelstaatler/Grenzgänger/Zugezogene können jetzt mehrere
   Einträge derselben Art führen). Die Proben unten wechseln von „hält den
   Vor-Entscheidungs-Stand fest" zu „hält den Entscheidungs-Stand fest" — der
   Wächter hat seinen Zweck erfüllt: er ist genau dann rot geworden, als die
   Struktur sich verschob. PRÜFSTEIN 5 (Textsatz/Rechtsraum) ist von diesem
   Glied UNBERÜHRT und bleibt offen, unverändert unten geprüft.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/pruefsteine-nummernfelder-messen.js');

test('[C·Prüfstein 3·Positivkontrolle] die Messung erkennt mehrwertige Felder überhaupt', () => {
  /* Ohne sie hiesse „keines der zwanzig ist mehrwertig" womöglich nur, dass die Messung
     mehrwertige gar nicht sieht. */
  const { V } = ladeKern();
  const p = M.pruefstein3(V);
  assert.ok(p.mehrwertigImKern > 0,
    'die Messung findet im ganzen Kern kein einziges mehrwertiges Feld — dann misst sie nichts');
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): die Entscheidung ist gefallen — mehrwertig.
// Neunzehn der zwanzig alten Korb-1-Namen sind umbenannt (z. B. `ausweis_nr` → Unterfeld `nr`
// der Liste `ausweis`); das Werkzeug kennt nur die ALTEN Namen (Auftrags-Auflage: wörtlich aus
// dem Bericht übernommen) und meldet sie darum als „fehlend" — das ist jetzt der ERWARTETE
// Befund, nicht mehr der Alarm. `steuerid` behält seinen Namen (der Skalar wurde zur
// gleichnamigen Liste), darum bleibt es als einziges unter altem Namen auffindbar.
test('[C·Prüfstein 3 · ENTSCHIEDEN] alle zwanzig Korb-1-Feld-Slots sind mehrwertig geworden', () => {
  const { V } = ladeKern();
  const p = M.pruefstein3(V);
  assert.deepEqual(p.fehlend.slice().sort(), M.KORB1.filter((k) => k !== 'taxIdsTaxNumbers').sort(),
    'erwartet: alle Korb-1-Namen außer steuerid sind mit Schnitt Glied 3 umbenannt — '
    + 'weicht diese Menge ab, hat sich der Umbau seit A448 verschoben');
  assert.deepEqual(p.mehrwertige, ['taxIdsTaxNumbers'],
    'steuerid ist die einzige unter altem Namen auffindbare, jetzt mehrwertige Zeile');
  assert.deepEqual(p.arten, ['liste'], 'die Struktur-Frage ist entschieden: mehrwertig (liste)');
});

test('[C·Prüfstein 5·Positivkontrolle] ohne angedockten Satz erscheint der eingebaute Text', () => {
  const { V } = ladeKern();
  const p = M.pruefstein5(V);
  assert.ok(p.eingebaut && !p.erwartetesPaar.includes(p.eingebaut),
    'ohne Modul kommt kein eingebauter Text — dann misst dieser Lauf den Leseweg und nicht die '
    + 'Auswahl zwischen zwei Sätzen');
});

test('[C·Prüfstein 5·DER ABBRUCH] zwei Sätze derselben Sprache liegen nebeneinander — angezeigt wird der letzte', () => {
  const { V } = ladeKern();
  const p = M.pruefstein5(V);
  assert.equal(p.abgelegt, 2,
    'die zwei Sätze überschreiben einander im Depot — dann ist A437 zurückgebaut worden');
  assert.deepEqual(p.anbieter, ['es-es', 'ec-ec'], 'beide Anbieter stehen im Depot');
  assert.ok(p.erwartetesPaar.includes(p.angezeigt), 'angezeigt wird einer der beiden');
  assert.equal(p.angezeigt, p.erwartetesPaar[1],
    'angezeigt wird nicht mehr der ZULETZT angemeldete — dann hat jemand eine Auswahlregel '
    + 'gebaut, und die war einer Produktentscheidung vorbehalten');
});

test('[C·Prüfstein 5 · WORTLAUT NACHGEZOGEN 23.08.2026] ein `rechtsraum` am Textsatz wird angenommen — und seit Glied 4 auch gelesen', () => {
  /* Der Titel stand hier vor Schnitt Glied 4 (A469, U2-ADR-162): „wird angenommen und
     ignoriert" — zu dem Zeitpunkt stimmte das noch, `rechtsraum` war ein reiner
     Formwert ohne Wirkung auf die Satz-Auswahl. Glied 4 hat genau das behoben (Prüfstein 5,
     s. `tests/schnitt-glied3-fuenf-pruefsteine.test.js`); diese Probe hier prüft seither nur
     noch die schmalere, unveränderte Tatsache: die FORM wird geprüft (gültig/String), aber
     `rechtsraum` selbst löst KEINEN eigenen `verworfene`-Eintrag aus — dieselbe Klasse wie
     `appVersion` am Vorlagen-Bündel (Erhebung 12): der Prüfer wacht über die TEXT-Kennungen
     und die bekannten Kopf-Schlüssel (`TEXTSATZ_MODUL_SCHLUESSEL`, A466), nicht über den
     Umfang des Moduls. */
  const { V } = ladeKern();
  const p = M.pruefstein5(V);
  assert.equal(p.rechtsraumAngenommen, true, 'der Satz mit `rechtsraum` wird abgelehnt — Befund überholt');
  assert.equal(p.rechtsraumVerworfen, 0,
    '`rechtsraum` selbst ist seit A466 ein bekannter Kopf-Schlüssel (TEXTSATZ_MODUL_SCHLUESSEL) — kein Verworfen-Eintrag dafür');
});

// Schnitt Glied 3 hat NUR Prüfstein 3 (mehrwertig/einwertig) entschieden — die Namensraum-Frage
// (ob eine Feld-Kennung ein Länder-/Rechtsraum-Präfix trägt, z. B. `de:steuerid`) ist eine
// ANDERE Frage und bleibt angehalten. Diese Probe hält das an den neuen, mehrwertigen Feldern
// fest: ihre Kennungen (Liste UND Unterfelder) tragen kein Präfix.
test('[C·angehalten] die neuen mehrwertigen Korb-1-Felder haben KEINEN Namensraum bekommen', () => {
  const { V } = ladeKern();
  const p = M.pruefstein3(V);
  for (const id of Object.keys(p.gefunden)) {
    assert.ok(!/:/.test(id), id + ' trägt ein Präfix — dann ist die Namensraum-Frage (Prüfstein 5) '
      + 'ebenfalls schon gebaut worden, und das war weiterhin angehalten');
    const feld = V.SEKTOREN.flatMap((s) => s.sektionen || []).flatMap((sek) => sek.felder || [])
      .find((f) => f.id === id);
    for (const uf of (feld && feld.unterFelder) || []) {
      assert.ok(!/:/.test(uf.id), id + '/' + uf.id + ' trägt ein Präfix — Namensraum-Frage weiterhin angehalten');
    }
  }
});
