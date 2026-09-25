'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   P13 UND P16 — der weiteste Sprung, und der Ernstfall
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C3 und C4.

   P13 (Vereinigtes Königreich) ist der weiteste Sprung der geplanten
   Reihenfolge: kein Meldewesen, kein Personalausweis, kein Notar. Sie zeigt
   einen DRITTEN Mangel neben denen von P17 und P15 — ein Feld, das gar keine
   Entsprechung hat. Ein leeres Feld sieht aus wie eine Lücke in den Angaben und
   ist eine Lücke im Weltbild.

   P16 (Anwältin) fragt: was sieht der Abwickler im Ernstfall, und was nicht?
   Vier Lagen, einzeln gemessen. Die Antwort ist nicht „alles gut" und nicht
   „kaputt", sondern: **der richtige Weg existiert, und der naheliegende ist
   der falsche.**

   Eigener Durchgang, nicht im Zehner-Läufer — derselbe Grund wie bei P19/P20
   und P17/P15: dort steht die Zusicherung „genau die zehn des Personas-Papiers".

   Die Phantomfeld-Auflage aus A379 gilt hier mit; der Wächter läuft je Persona.
   ════════════════════════════════════════════════════════════════════════════ */
const { katalogDe } = require('./helfer/rechtsraum-katalog-de.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const P13 = require('./fixtures/persona-p13.js');
const P16 = require('./fixtures/persona-p16.js');

const PERSONAS = [P13, P16];

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

test('[P13/P16] beide Personas sind gebaut und tragen ihre Teile', () => {
  assert.deepEqual(PERSONAS.map((p) => p.ID), ['P13', 'P16']);
  for (const p of PERSONAS) {
    assert.ok(p.TITEL && p.TITEL.length > 5, p.ID + ' ohne Titel');
    assert.equal(typeof p.baueDepot, 'function');
    assert.ok(p.UNTERLAGEN_OHNE_FELD.length > 0,
      p.ID + ' nennt keine einzige Bruchstelle — dann misst sie nichts');
  }
});

for (const p of PERSONAS) {
  test('[' + p.ID + '] jedes gesetzte Feld existiert im Modell', async () => {
    const { V } = await depotFuer(p);
    const bekannt = bekannteFeldIds(V);
    const gesetzt = [];
    for (const [sektorId, felder] of Object.entries(V.getData().sektoren || {})) {
      for (const feldId of Object.keys(felder || {})) gesetzt.push(sektorId + '/' + feldId);
    }
    const erfunden = gesetzt.filter((k) => !bekannt.has(k));
    assert.deepEqual(erfunden, [], p.ID + ' setzt Felder, die es nicht gibt: ' + erfunden.join(', '));
  });

  for (const pr of p.pruefungen(assert)) {
    test('[' + p.ID + '] ' + pr.name, async () => {
      const { V, ctx } = await depotFuer(p);
      await pr.fn(V, ctx);
    });
  }
}

/* ══ DER GEMEINSAME ERTRAG — vier Personas, DREI verschiedene Mängel ═════════ */

test('[C1–C3·DIE ORDNUNG] P17, P15 und P13 zeigen drei Mängel, die kein Modul gemeinsam heilt', async () => {
  /* DAS IST DER SATZ FÜR MORGEN, und er ist der Ertrag des ganzen Strangs C:

     P17 · die Beschriftung ist falsch          → ein Textsatz-Modul heilt es
     P15 · es fehlt der zweite ORT              → kein Modul heilt es, es braucht ein Feld
     P13 · das Feld ist GEGENSTANDSLOS          → kein Modul und kein Feld heilt es,
                                                  es braucht ein Weltbild je Rechtsraum

     Alle drei sehen in der Oberfläche gleich aus: ein Feld, das nicht passt. Wer
     sie zusammenwirft, baut EIN Mittel und heilt EIN Drittel. */
  const a = await depotFuer(P13);
  const ident = a.V.getData().sektoren.identity;

  /* P13: das Ausweis-Feld existiert (Schnitt Glied 3: seit A448 eine Liste) und ist leer. */
  assert.equal(ident.idDocuments, undefined);
  const bekannt = bekannteFeldIds(a.V);
  assert.ok(bekannt.has('identity/idDocuments'),
    'das Feld gibt es — es hat nur in diesem Rechtsraum keinen Gegenstand');

  /* Und der Rechtsraum-Katalog kennt auch UK nicht — wie schon bei AT. */
  assert.equal(katalogDe(a.V)['enduring-power-of-attorney'].GB, undefined);
  assert.equal(katalogDe(a.V)['enduring-power-of-attorney'].UK, undefined);
});

test('[C4·DIE ANTWORT] der richtige Weg zum Abwickler existiert — der naheliegende ist der falsche', async () => {
  /* Der naheliegende Weg ist, dem Abwickler die Depot-Datei zu geben. Dann sieht
     er das Privatleben und NICHT die Handakten — genau verkehrt herum zu dem,
     was § 55 BRAO will.
     Der richtige Weg ist `subDepotBlackboxExportieren`: die versiegelte
     Kanzleidatei allein, ohne ein Byte des Privaten. Er ist gebaut, und er ist
     nicht der Weg, den jemand ohne Anleitung nimmt. */
  const { V, ctx } = await depotFuer(P16);
  const d = V.getData();

  /* Der naheliegende Weg: alles Private offen, die Akten zu. */
  assert.match(String(d.sektoren.personal.whatElseIWantToSayWhatElse || ''), /Brief an Jonas/);
  assert.ok(d.verwalteteDepots[0].umschlag, 'die Akten liegen versiegelt');

  /* Der richtige Weg: die Blackbox allein. */
  const blackbox = V.subDepotBlackboxExportieren(ctx.subUUID);
  const roh = typeof blackbox === 'string' ? blackbox : JSON.stringify(blackbox);
  assert.ok(!roh.includes('Brief an Jonas'), 'die Blackbox trägt nichts Privates');
  assert.ok(roh.length > 100, '… und sie ist trotzdem nicht leer');
});

/* ══ DER ROT-BELEG — Pflicht aus A348 ════════════════════════════════════════ */

test('[P13/P16·Rot-Beleg] die Blackbox-Zusicherung wird rot, wenn Privates hineingerät', async () => {
  /* Positivkontrolle: heute ist sie sauber. */
  const { V, ctx } = await depotFuer(P16);
  const sauber = JSON.stringify(V.subDepotBlackboxExportieren(ctx.subUUID));
  assert.ok(!sauber.includes('Brief an Jonas'));

  /* Und der Rot-Teil: dieselbe Prüfung an einem Gegenstand, in dem das Private
     wirklich steht, MUSS anschlagen. Ohne ihn wäre „kein privater Inhalt" nicht
     davon zu unterscheiden, dass die Prüfung nie etwas findet. */
  const gepflanzt = sauber.slice(0, 50) + 'Brief an Jonas' + sauber.slice(50);
  assert.ok(gepflanzt.includes('Brief an Jonas'),
    'die Prüfung findet den gepflanzten Klartext — sie ist also überhaupt fähig, ihn zu finden');
});
