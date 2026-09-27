'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ERHEBUNG 13 (Laufzettel „Nach den dreizehn", Posten 13) — das zweite Depot
   derselben Person
   ────────────────────────────────────────────────────────────────────────────
   „Die Mechanik ist gebaut. Gemessen ist damit die EXISTENZ, nicht das
   VERHALTEN." Diese Datei misst das Verhalten, mit
   `tools/zweites-depot-messen.js`, am 21.08.2026:

     1 versiegelt, während der Anker offen ist   JA — weder in der Datei noch im
                                                 `data` der offenen Sitzung
     2 was beim Aushängen zurückbleibt           der EINTRAG, immer; „abgeben"
                                                 entfernt allein den Umschlag
     3 was ein Neustart überlebt                 Definition, Wert und Zeile

   PUNKT 1 TRÄGT DIE BEGRÜNDUNG DES GANZEN MODELLS: öffnet das private Depot das
   eingehängte mit, ist die Berufsgeheimnis-Begründung hinfällig. Sie ist es
   nicht — gemessen am echten `depotLaden` mit einer frischen Anwendung, und mit
   einer Positivkontrolle, die denselben Geheimtext mit dem Sub-Passwort sehr wohl
   sieht.

   PUNKT 2 IST DER BEFUND: „abgeben" löscht den Umschlag — und lässt den Eintrag
   stehen, mit Bezeichnung, Vor- und Nachname, Beziehung, Empfänger und der
   ganzen Delegationsgeschichte. Vom INHALT bleibt nichts, von der IDENTITÄT
   bleibt alles. Das ist dieselbe Klasse wie der Angehörigen-Cache aus F5: eine
   Abschrift, die niemand als Abhängigkeit geführt hat.

   MESSEN, NICHT BAUEN. Keine Umbenennung, keine Vorauswahl. Dass das Sub-Depot
   heute als Depot für anvertraute Personen beschrieben ist, während der Pro-Fall
   das zweite Depot DERSELBEN Person meint, ist eine Produktentscheidung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../tools/zweites-depot-messen.js');

test('[E13·Positivkontrolle] die Probe KANN Klartext sehen — mit dem Sub-Passwort', async () => {
  /* Ohne sie hiesse „der Geheimtext ist nirgends auffindbar" nur, dass er nie geschrieben
     wurde. Die Kontrolle entsiegelt dasselbe Sub-Depot mit demselben Werkzeug. */
  const m = await M.messeVersiegelung();
  assert.equal(m.kontrolleSichtbar, true,
    'auch mit dem Sub-Passwort erscheint nichts — dieser Lauf misst den Messweg, nicht den Gegenstand');
});

test('[E13·trägt das Modell?] das eingehängte Depot bleibt versiegelt, während der Anker offen ist', async () => {
  const m = await M.messeVersiegelung();
  assert.equal(m.imAnkerUmschlag, false,
    'der Inhalt des zweiten Depots steht im Klartext in der Anker-Datei');
  assert.equal(m.imGeladenenData, false,
    'das Öffnen des privaten Depots öffnet das eingehängte MIT — damit trägt die '
    + 'Berufsgeheimnis-Begründung des ganzen Modells nicht');
});

test('[E13] „beiseitelegen" behält den Umschlag — der Rettungsweg', async () => {
  const a = await M.messeAushaengen('beiseitelegen');
  assert.equal(a.umschlagBleibt, true);
  assert.equal(a.status, 'uebergeben-archiviert');
  assert.deepEqual(a.wegGefallen, [], 'nichts fällt weg — das ist der Unterschied zum Abgeben');
});

test('[E13·DER BEFUND] „abgeben" nimmt den Inhalt — und lässt die ganze Identität stehen', async () => {
  const a = await M.messeAushaengen('abgeben');
  assert.equal(a.status, 'abgegeben');
  assert.deepEqual(a.wegGefallen, ['umschlag'], 'genau eine Angabe verschwindet: der verschlüsselte Inhalt');
  assert.equal(a.eintragBleibt, true);
  for (const angabe of ['bezeichnung', 'inhaberin', 'vorname', 'nachname', 'delegationsGeschichte', 'empfaenger']) {
    assert.ok(a.zurueckbleibendeAngaben.includes(angabe),
      '`' + angabe + '` bleibt nicht mehr zurück — dann ist dieser Befund überholt (gut) und die '
      + 'Vorlage zur Entscheidung gegenstandslos');
  }
});

test('[E13] ein Neustart nimmt einer angedockten Angabe nichts — Definition, Wert und Zeile bleiben', async () => {
  /* Am 19.08. wurde berichtet, es verschwinde nichts. Der Laufzettel verlangt ausdrücklich, das
     gegen den HEUTIGEN Stand zu BESTÄTIGEN statt zu übernehmen. Gemessen: eine Definition und ihr
     Wert überstehen `depotSerialisieren` → `depotLaden` in einer FRISCHEN Anwendung, und die Zeile
     steht danach auf dem Blatt. Nichts prüft beim Laden eine Herkunft nach. */
  const m = await M.messeZertifikatsablauf();
  assert.equal(m.defDa, true, 'die Felddefinition überlebt den Neustart nicht');
  assert.equal(m.wertDa, true, 'der eingetragene Wert überlebt den Neustart nicht');
  assert.equal(m.zeileDa, true, 'die Zeile steht nach dem Neustart nicht mehr auf dem Blatt');
});
