'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   P14 UND P18 — der vierte Mangel, und der Rückzug einer Kammer
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C5 — im Laufzettel unter „wenn die
   Nacht reicht". Sie reichte.

   P14 (ungarische Hebamme mit Beinprothese) fügt den drei Mängeln aus P17/P15/
   P13 einen VIERTEN hinzu, und er ist der unangenehmste: **ein Feld, das den
   falschen Gegenstand benennt.** Eine Beinprothese unter „Implantate" geht nicht
   verloren — sie wird UNWAHR.

   P18 (Kammer zieht ein Modul zurück) ist keine Bürgerin. Sie ist der Fall, den
   das Produktmodell braucht und den bisher niemand als GANZEN WEG durchgespielt
   hat: anlegen, eintragen, zurückziehen, wiederkommen.

   Eigener Durchgang, nicht im Zehner-Läufer — derselbe Grund wie bei den vier
   Personas davor. Die Phantomfeld-Auflage aus A379 läuft mit.

   P18 BEKOMMT JE PROBE EIN FRISCHES DEPOT, weil ihre Proben den Zustand
   ABSICHTLICH verändern (Modul weg, Modul zurück). Eine geteilte Welt liesse die
   dritte Probe messen, was die zweite hinterlassen hat.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const P14 = require('./fixtures/persona-p14.js');
const P18 = require('./fixtures/persona-p18.js');

const PERSONAS = [P14, P18];

async function depotFuer(m) {
  const { V } = ladeKern();
  const ctx = await m.baueDepot(V);
  return { V, ctx };
}

function bekannteFeldIds(V) {
  const raus = new Set();
  for (const s of (V.SEKTOREN || [])) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) raus.add(s.id + '/' + f.id);
    }
  }
  return raus;
}

test('[P14/P18] beide sind gebaut und tragen ihre Teile', () => {
  assert.deepEqual(PERSONAS.map((p) => p.ID), ['P14', 'P18']);
  for (const p of PERSONAS) {
    assert.ok(p.TITEL && p.TITEL.length > 5, p.ID + ' ohne Titel');
    assert.ok(p.UNTERLAGEN_OHNE_FELD.length > 0, p.ID + ' nennt keine Bruchstelle');
  }
});

test('[P14] jedes gesetzte Feld existiert im Modell', async () => {
  const { V } = await depotFuer(P14);
  const bekannt = bekannteFeldIds(V);
  const gesetzt = [];
  for (const [sektorId, felder] of Object.entries(V.getData().sektoren || {})) {
    for (const feldId of Object.keys(felder || {})) gesetzt.push(sektorId + '/' + feldId);
  }
  const erfunden = gesetzt.filter((k) => !bekannt.has(k));
  assert.deepEqual(erfunden, [], 'P14 setzt Felder, die es nicht gibt: ' + erfunden.join(', '));
});

for (const p of PERSONAS) {
  for (const pr of p.pruefungen(assert)) {
    test('[' + p.ID + '] ' + pr.name, async () => {
      const { V, ctx } = await depotFuer(p);
      await pr.fn(V, ctx);
    });
  }
}

/* ══ DER ERTRAG — die Ordnung ist jetzt VIERTEILIG ═══════════════════════════ */

test('[C·DIE VOLLE ORDNUNG] vier Mängel, die alle gleich aussehen und vier verschiedene Mittel brauchen', async () => {
  /* DAS IST DER SATZ, DER AUS STRANG C ÜBRIGBLEIBT:

     P17 · die BESCHRIFTUNG ist falsch        → ein Textsatz-/Rechtsraum-Modul heilt es
     P15 · es fehlt der ZWEITE ORT            → ein Feld heilt es, kein Modul
     P13 · das Feld ist GEGENSTANDSLOS        → ein Weltbild je Rechtsraum, kein Feld
     P14 · das Feld benennt den FALSCHEN      → nichts davon heilt es; die Angabe wird
           Gegenstand                            unwahr statt zu fehlen

     Der vierte ist der unangenehmste, weil er als einziger keine LÜCKE erzeugt.
     Eine Lücke sieht man. Eine Prothese unter „Implantate" sieht aus wie eine
     gepflegte Angabe. */
  const { V } = await depotFuer(P14);
  const g = V.getData().sektoren.health;
  assert.ok(String(g.implantsProsthesesPacemakers).length > 50,
    'das Feld ist GEFÜLLT — es fehlt nichts, und genau darum fällt es nicht auf');
  assert.match(String(g.implantsProsthesesPacemakers), /^KEIN IMPLANTAT/,
    'nur der Text der Bürgerin selbst sagt, dass die Beschriftung nicht stimmt');
});

test('[P18·Rot-Beleg] die Rettung wird rot, wenn sie nicht liefe', async () => {
  /* Positivkontrolle und Rot-Beleg in einem: derselbe Rückzug, einmal MIT
     `depotNormalisieren` (die Rettung läuft) und einmal OHNE (sie läuft nicht).
     Ohne diesen Vergleich wäre „die Werte sind im Rettungsslot" nicht davon zu
     unterscheiden, dass sie ohnehin nie umgezogen wären. */
  const { V } = await depotFuer(P18);
  const d = V.getData();

  /* OHNE Rettung: das Modul ist fort, die Werte stehen noch am alten Platz und
     wären beim nächsten Schreiben ein Waisenschlüssel. */
  d.bereichsModule = [];
  V._bereichsModuleAusDepotAnmelden(d);
  assert.ok(d.sektoren[P18.BEREICH_ID], 'ohne den Rettungslauf liegen sie unverändert');
  assert.ok(!d.bereicheVerwaist || !d.bereicheVerwaist[P18.BEREICH_ID],
    '… und im Rettungsslot liegt nichts');

  /* MIT Rettung. */
  V.depotNormalisieren(d);
  assert.equal(d.sektoren[P18.BEREICH_ID], undefined);
  assert.deepEqual(d.bereicheVerwaist[P18.BEREICH_ID], Object.assign({}, P18.EINGETRAGEN),
    'erst der Rettungslauf zieht sie um — er tut also wirklich etwas');
});
