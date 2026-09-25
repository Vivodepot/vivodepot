'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   D3 — Fünf Beispielbündel, eines je Modul-Art. Jedes lädt.
   ────────────────────────────────────────────────────────────────────────────
   Strang D3 des Laufzettels „Nacht 21./22.08.2026".

   DER ZWECK IST ZWEITEILIG, und der zweite ist der eigentliche: die Bündel sind
   die Vorarbeit für die Anleitung — und sie zeigen beim Bauen, **wie schwer es
   ist, ein Modul von Hand zu schreiben.** Das ist die Frage aus dem Konzept,
   Abschnitt 1e: ein Erzeuger oder fünf Werkzeuge?

   DIESE DATEI PRÜFT DREI DINGE:
     1 · Jedes der fünf Bündel wird angenommen — ohne einen einzigen verworfenen
         Schlüssel. Ein „angenommen" mit stillen Verlusten wäre kein Beleg.
     2 · Jedes Bündel landet in seinem Slot und ist danach wirksam.
     3 · Jedes Bündel nennt seinen WIDERSTAND — was beim Schreiben schwerfiel.
         Ohne das wäre es Prüfstoff und keine Antwort.

   ROT-BELEG: dieselbe Prüfung an einem absichtlich falschen Bündel MUSS
   ablehnen. Ohne ihn wäre „fünfmal angenommen" nicht davon zu unterscheiden,
   dass der Einlass alles annimmt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { BUENDEL } = require('./fixtures/beispielbuendel/index.js');

test('[D3] fünf Bündel, fünf Modul-Arten — keine doppelt, keine fehlt', () => {
  assert.equal(BUENDEL.length, 5);
  assert.deepEqual(BUENDEL.map((b) => b.art).sort(),
    ['bereich', 'format', 'institutionsArt', 'rechtsraum', 'textsatz']);
});

for (const b of BUENDEL) {
  test('[D3·' + b.art + '] das Bündel wird angenommen — und OHNE verworfene Schlüssel', () => {
    const { V } = ladeKern();
    const d = V.leeresDepot();
    const r = V.modulEinlassen(b.modul, d);
    assert.equal(r.angenommen, true, 'abgelehnt mit Grund: ' + r.grund);
    /* Der zweite Teil ist der wichtigere: ein Modul kann ANGENOMMEN werden und
       trotzdem die Hälfte verloren haben. Genau das ist der Klasse nach der
       gefährlichste Fall — der Anbieter hört „eingelassen" und hat nichts
       bewirkt (A437, Kette Auftrag 6). */
    assert.deepEqual(r.verworfene, [],
      b.art + ' verliert beim Einlassen: ' + JSON.stringify(r.verworfene));
  });

  test('[D3·' + b.art + '] es landet in seinem Slot', () => {
    const { V } = ladeKern();
    const d = V.leeresDepot();
    V.modulEinlassen(b.modul, d);
    assert.ok(Array.isArray(d[b.slot]), 'der Slot `' + b.slot + '` ist eine Liste');
    assert.equal(d[b.slot].length, 1, 'genau ein Eintrag im Slot');
    assert.equal(d[b.slot][0].ungeprueft, true,
      'selbst eingelassen heisst ungeprueft — die Marke reist am Modul mit');
  });

  test('[D3·' + b.art + '] das Bündel nennt, was beim Schreiben schwerfiel', () => {
    /* Ohne diese Notizen wären die fünf Bündel Prüfstoff und keine Antwort auf
       „ein Erzeuger oder fünf Werkzeuge". */
    assert.ok(Array.isArray(b.widerstand) && b.widerstand.length > 0,
      b.art + ' notiert keinen Widerstand');
    for (const w of b.widerstand) {
      assert.ok(typeof w === 'string' && w.length > 60,
        'eine Widerstands-Notiz, die nichts sagt, ist schlimmer als keine');
    }
  });
}

test('[D3·Rot-Beleg] ein absichtlich falsches Bündel wird ABGELEHNT', () => {
  /* Ohne ihn wäre „fünfmal angenommen" nicht davon zu unterscheiden, dass der
     Einlass alles annimmt. Genommen wird der Fall, an dem der Bau dieser Nacht
     dreimal gescheitert ist: das Format-Modul ohne `leser`. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const format = BUENDEL.find((b) => b.art === 'format');
  const ohneLeser = Object.assign({}, format.modul);
  delete ohneLeser.leser;
  const r = V.modulEinlassen(ohneLeser, d);
  assert.equal(r.angenommen, false, 'ein Import-Format ohne Leser darf nicht durchgehen');
  assert.equal(r.grund, 'leser', 'und die Ablehnung heisst `leser` — ein Wort, keine Erklärung');
});

test('[D3·DIE ANTWORT] fünf Register, EINE Form für „eine benannte Menge Unter-Dinge" — Rest bleibt Konzeptfrage', () => {
  /* DAS IST DER ERTRAG. Nicht „die Bündel laden", sondern: WIE VIELE Formen muss
     ein Anbieter kennen, um alle fünf zu bedienen?

     Schnitt Glied 5 (23.08.2026, A484) hat DIE EINE „dieselbe Sache, zwei Formen"-Frage gelöst:
     `arten` (institutionsArt), `typen` (rechtsraum) UND `bereiche` (bereich) sind jetzt alle
     drei Objekte (Schlüssel = Kennung/ID) — gemessen, nicht geraten: 32 Bestandsstellen bauten
     `bereiche` als Liste, 128 die anderen drei als Objekt, das Objekt gewann. Diese Probe
     bestätigt den Zielzustand (umgekehrt, nicht gelöscht — wie an jeder Prüfstein-Probe dieser
     Kampagne).

     Was bewusst NICHT vereinheitlicht wurde, weil es keine „dieselbe Sache, zwei Formen" ist,
     sondern echte Unterschiede zwischen den Registern:
       · `anbieterId` nehmen vier Register; `format` verwirft ihn als unbekannt.
       · `katalogVersion` steht am TYP (rechtsraum), `moduleVersion` am Modul —
         zwei Versionszahlen auf zwei Ebenen.
       · `format` verlangt zusätzlich `leser`, `sektor` und `label`; die anderen
         vier verlangen nichts dergleichen. */
  const nachArt = Object.fromEntries(BUENDEL.map((b) => [b.art, b.modul]));

  assert.ok(!Array.isArray(nachArt.institutionsArt.arten) && typeof nachArt.institutionsArt.arten === 'object',
    '`arten` ist ein Objekt');
  assert.ok(!Array.isArray(nachArt.bereich.bereiche) && typeof nachArt.bereich.bereiche === 'object',
    '`bereiche` ist jetzt auch ein Objekt — Glied 5 hat die Liste-Form abgelöst');

  const mitAnbieterId = BUENDEL.filter((b) => b.modul.anbieterId).length;
  assert.equal(mitAnbieterId, 4, 'vier von fünf tragen eine Anbieter-Kennung, eines kann sie nicht');

  assert.ok(nachArt.rechtsraum.typen['enduring-power-of-attorney'].katalogVersion,
    'der Rechtsraum trägt eine ZWEITE Versionszahl am Typ');
  for (const b of BUENDEL) assert.ok(Number.isInteger(b.modul.moduleVersion),
    b.art + ' trägt die Modul-Versionszahl');

  /* Und die Zahl, die in den Bericht gehört: wie viele Anläufe die fünf Bündel
     zusammen gebraucht haben, steht in den Widerstands-Notizen — sie sind die
     Antwort auf „ein Erzeuger oder fünf Werkzeuge", nicht diese Probe. */
  const notizen = BUENDEL.reduce((n, b) => n + b.widerstand.length, 0);
  assert.ok(notizen >= 10,
    'die fünf Bündel haben zusammen ' + notizen + ' Widerstands-Notizen erzeugt');
});
