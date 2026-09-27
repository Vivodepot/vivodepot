'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test (Klasse A) — Modal-Knopfleisten: keine doppelten, keine folgenlosen Ausgänge
   ────────────────────────────────────────────────────────────────────────
   Anlass: Geräte-Befund vom 21.07.2026 (v71) — der Dialog „Sicherungsdatei benennen"
   zeigte ZWEIMAL „Abbrechen". `ui.modal` setzt seinen eingebauten Abbruch-Knopf
   ZUSÄTZLICH zur `zweitAktion`; wer beides nutzt, ohne `ohneAbbrechen: true` zu
   setzen, bekommt zwei Knöpfe.

   Der eigentliche Schaden war nicht die Doppelung: Der eingebaute Knopf ruft nur
   `schliessen()`. Bei einem Dialog, der ein Promise einlöst, blieb dieses Promise
   für immer offen — der Speicherweg wartete stumm weiter. Betroffen war der
   Nicht-FSA-Pfad (iOS/Safari/Firefox), also genau dort, wo der Dialog erscheint.

   Diese Tests messen die GERENDERTE Knopfleiste, nicht die Aufruf-Optionen: die
   Frage ist, was die Bürgerin sieht und drücken kann.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Beschriftungen der Knopfleiste aus dem gerenderten Modal-HTML.
function knopfBeschriftungen(V, dokument) {
  const html = dokument.getElementById('modal-inhalt').innerHTML || '';
  const zeile = (html.match(/<div class="modal-aktionen">([\s\S]*?)<\/div>/) || [])[1] || '';
  return [...zeile.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)]
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function keineDoppelten(labels, wo) {
  const gesehen = new Set();
  for (const l of labels) {
    assert.ok(!gesehen.has(l), wo + ': Knopf „' + l + '" erscheint doppelt — ' + JSON.stringify(labels));
    gesehen.add(l);
  }
}

test('[Klasse-A] Sicherungsdatei-Namensdialog: genau ein Abbrechen, und es löst das Versprechen ein', async () => {
  const { V, document: dok } = ladeKern();
  // Kein FSA-Picker im Node-Kontext → genau der Pfad, auf dem der Dialog erscheint.
  assert.equal(V.hatDateiSpeichernPicker(), false, 'Vorbedingung: Nicht-FSA-Pfad');

  const versprechen = V._dateiNameErfragen();
  const labels = knopfBeschriftungen(V, dok);
  assert.ok(labels.length >= 2, 'Vorbedingung: die Knopfleiste wurde gerendert — ' + JSON.stringify(labels));
  keineDoppelten(labels, 'Sicherungsdatei benennen');
  assert.equal(labels.filter(l => l === V.STRINGS.btnAbbrechen).length, 1,
    'genau ein Abbrechen-Knopf (vorher zwei: eingebauter + zweitAktion)');

  // Der Kern der Sache: Abbrechen muss das Promise auflösen. Bewusst mit eigener Frist
  // statt einfach `await` — ein nicht eingelöstes Versprechen soll als klare Aussage
  // scheitern, nicht als hängender Testlauf (der in CI nur die Job-Frist verbrennt und
  // wie ein Umgebungsproblem aussieht).
  dok.getElementById('m-zweit').onclick();
  const OFFEN = Symbol('offen');
  const ergebnis = await Promise.race([
    versprechen,
    new Promise((r) => setTimeout(() => r(OFFEN), 2000)),
  ]);
  assert.notEqual(ergebnis, OFFEN,
    'Abbrechen ließ das Versprechen offen — der Speicherweg würde hier für immer warten (Geräte-Befund 21.07.)');
  assert.equal(ergebnis, null, 'Abbrechen liefert null');
});

test('[Klasse-A] Sicherungsdatei-Namensdialog: Speichern löst mit einem Dateinamen auf', async () => {
  const { V, document: dok } = ladeKern();
  const versprechen = V._dateiNameErfragen();
  dok.getElementById('datei-name').value = 'Meine Sicherung';
  await dok.getElementById('m-ok').onclick();
  const name = await versprechen;
  assert.match(name, /\.vivodepot$/, 'Primärweg liefert einen Dateinamen — Gegenprobe zum Abbruchweg');
});

test('[Klasse-A] Rückfrage „Sub-Depot jetzt anlegen?": kein zweiter Nein-Knopf neben „Später"', () => {
  const { V, document: dok } = ladeKern();
  V.flowSubDepotNachAnker();
  const labels = knopfBeschriftungen(V, dok);
  keineDoppelten(labels, 'Sub-Depot-Rückfrage');
  assert.ok(labels.includes(V.STRINGS.subRueckfrageSpaeter), '„Später" ist der Nein-Weg');
  assert.ok(!labels.includes(V.STRINGS.btnAbbrechen),
    'kein zusätzliches „Abbrechen" — es täte exakt dasselbe wie „Später"');
});

test('[Klasse-A] Depot-Liste (reine Anzeige): „Schließen" ohne widersprüchliches „Abbrechen"', () => {
  const { V, document: dok } = ladeKern();
  V.flowDepotListe();
  const labels = knopfBeschriftungen(V, dok);
  keineDoppelten(labels, 'Depot-Liste');
  assert.deepEqual(labels, [V.STRINGS.btnSchliessen],
    'ein Dialog ohne Entscheidung trägt genau einen Ausgang');
});

/* Gegenprobe zur Abgrenzung: Wo „Abbrechen" eine EIGENE Bedeutung hat, bleibt es.
   Beim Schließen-Schutz sind „Trotzdem schließen" (verwerfen) und „Abbrechen"
   (zurück in die App) zwei verschiedene Entscheidungen — dieser Test hält fest,
   dass die Aufräumaktion sie nicht mit weggeräumt hat. */
test('[Klasse-A] Schließen-Schutz behält den echten Dreiweg (verwerfen ≠ zurück)', () => {
  const { V, document: dok } = ladeKern();
  V.flowSchliessenWarnung({ onVerwerfen: () => {} });
  const labels = knopfBeschriftungen(V, dok);
  keineDoppelten(labels, 'Schließen-Warnung');
  assert.ok(labels.includes(V.STRINGS.d2TrotzdemSchliessen), 'verwerfen bleibt');
  assert.ok(labels.includes(V.STRINGS.btnAbbrechen), 'zurück in die App bleibt — hier trägt es Bedeutung');
  assert.equal(labels.length, 3, 'genau drei Ausgänge');
});
