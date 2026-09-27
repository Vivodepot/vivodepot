'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   P17 UND P15 — der Prüfstoff für die zwei Schlüsselfragen von morgen
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C1 und C2. Der Laufzettel nennt sie
   „die einzigen zwei Posten der ganzen Nacht, die eine Entscheidung von morgen
   BELEGEN statt nur vorzubereiten".

   SIE BELEGEN ZWEI VERSCHIEDENE DINGE, und das ist der Grund, sie zusammen zu
   fahren:

   P17 (Österreich) trennt SPRACHE von RECHTSRAUM. Bei P19/P20 fielen beide
   gemeinsam aus dem Rahmen; hier ist die Sprache dieselbe, und jeder Bruch, der
   bleibt, ist ein Rechtsraum-Bruch. Ihr Kernsatz: die Beschriftung ist deutsch,
   richtig und trotzdem falsch.

   P15 (deutsch-türkisch) fragt „ein Wert oder mehrere". Ihr Kernsatz ist der
   Gegensatz zu P17: die Beschriftung STIMMT, und es fehlt der zweite Ort.

   DAS IST DIE ANTWORT, DIE MORGEN GEBRAUCHT WIRD: die zwei Mängel sehen gleich
   aus und sind es nicht. Ein Modul — gleich ob Sprache oder Rechtsraum — heilt
   den ersten und den zweiten NICHT. Es tauscht Wörter; es legt kein Feld an.

   EIGENER DURCHGANG UND NICHT IM ZEHNER-LÄUFER, aus demselben Grund wie bei
   P19/P20: dort steht die Zusicherung „genau die zehn des Personas-Papiers".

   DIE PHANTOMFELD-AUFLAGE GILT HIER MIT (A379): `sektorFeldSetzen` nimmt eine
   unbekannte Feld-Id klaglos an. Beim Bau von P15 ist genau das passiert
   (`finanzen/steuer_id` statt `steuerid`), und die Probe daneben las denselben
   falschen Namen und war grün. Der Wächter unten ist die Stelle, an der es
   auffällt — er hat es aufgedeckt, nicht die Aufmerksamkeit.
   ════════════════════════════════════════════════════════════════════════════ */
const { katalogDe } = require('./helfer/rechtsraum-katalog-de.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const P17 = require('./fixtures/persona-p17.js');
const P15 = require('./fixtures/persona-p15.js');

const PERSONAS = [P17, P15];

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

test('[P17/P15] beide Personas sind gebaut und tragen ihre Teile', () => {
  assert.deepEqual(PERSONAS.map((p) => p.ID), ['P17', 'P15']);
  for (const p of PERSONAS) {
    assert.ok(p.TITEL && p.TITEL.length > 5, p.ID + ' ohne Titel');
    assert.equal(typeof p.baueDepot, 'function');
    assert.equal(typeof p.pruefungen, 'function');
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
    assert.ok(gesetzt.length > 0, 'die Persona setzt überhaupt Felder');
    const erfunden = gesetzt.filter((k) => !bekannt.has(k));
    assert.deepEqual(erfunden, [],
      p.ID + ' setzt Felder, die es nicht gibt: ' + erfunden.join(', '));
  });

  test('[' + p.ID + '] die Persona entsteht über echte Schreibwege', async () => {
    const { V } = await depotFuer(p);
    const d = V.getData();
    assert.ok(d && d.sektoren, 'ein Depot ist entstanden');
    assert.ok((d.personen || []).length + (d.institutionen || []).length > 0,
      'Menschen und Stellen sind über die echten Wege angelegt');
  });

  for (const pr of p.pruefungen(assert)) {
    test('[' + p.ID + '] ' + pr.name, async () => {
      const { V } = await depotFuer(p);
      await pr.fn(V);
    });
  }
}

/* ══ DER GEMEINSAME MESSPUNKT — der eigentliche Ertrag beider Personas ═══════ */

test('[C1+C2·DIE ANTWORT] dieselbe Feld-Kennung trägt zwei VERSCHIEDENE Mängel', async () => {
  /* Beide Personas schreiben in `sozialversicherung.rentenversicherungsnummer`.
     Bei P17 ist der Wert österreichisch und die Beschriftung falsch — ein
     ÜBERSETZUNGS-Mangel, den ein Modul heilen könnte.
     Bei P15 ist der Wert deutsch und die Beschriftung richtig — es fehlt der
     ZWEITE ORT, und den legt kein Modul an.
     Wer die beiden zusammenwirft, baut ein Modul und wundert sich, dass die
     Hälfte der Fälle bleibt. */
  const a = await depotFuer(P17);
  const b = await depotFuer(P15);
  assert.equal(a.V.getData().sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, P17.SV_NUMMER);
  assert.ok(b.V.getData().sektoren.socialInsurance.pensionInsuranceNumbers.some((e) => e.pensionInsuranceNumber === P15.RV_DE));
  assert.notEqual(P17.SV_NUMMER, P15.RV_DE, 'zwei verschiedene Nummernsysteme, dieselbe Liste');

  /* Schnitt Glied 3 (A448, U2-ADR-161): die türkische Nummer steht NICHT mehr im Freitext —
     sie ist ein zweiter Eintrag in derselben Liste, per `system` unterschieden. Das war
     genau der fehlende „zweite Ort", den diese Persona benannt hat. */
  assert.ok(b.V.getData().sektoren.socialInsurance.pensionInsuranceNumbers.some((e) => e.pensionInsuranceNumber === P15.SGK_TR),
    'die zweite Nummer liegt jetzt in der Liste, nicht mehr im Freitext');
  // Hinweis: P15.SGK_TR und P15.KIMLIK sind in der Fixture zufällig dieselbe erfundene
  // Ziffernfolge — darum auf die Beschriftung "SGK-Nummer" prüfen, nicht auf die blosse Zahl
  // (die über KIMLIK ohnehin weiterhin im Freitext steht, zu Recht).
  const notiz = String(b.V.getData().sektoren.identity.furtherDetails || '');
  assert.ok(!notiz.includes('SGK-Nummer'), 'und NICHT mehr zusätzlich im Freitext (kein doppelter Ort)');
});

test('[C1·Sprache mal Rechtsraum] der Textsatz kann P17 nicht heilen — er hängt an der Sprache', async () => {
  /* DER BELEG FÜR DIE SCHLÜSSELFRAGE. `_TEXTSATZ_MODUL_REGISTRY` ist auf
     `sprache` verschlüsselt (A469). Ingrid Pichler liest Deutsch. Ein deutscher
     Satz kann nur EINE Beschriftung für `rentenversicherungsnummer` tragen —
     und Deutschland und Österreich teilen sich die Sprache.
     Das ist derselbe Mechanismus, den P19 an der WÄHRUNG traf (Spanien und
     Ecuador, ein Satz, eine Währung). Zwei Personas, zwei Felder, ein Grund. */
  const { V } = await depotFuer(P17);
  const satz = { modulTyp: 'textsatz', sprache: 'de-AT', moduleVersion: 1, anbieterId: 'pruefstoff',
    texte: { 'socialInsurance.pensionInsuranceNumbers.label': 'Sozialversicherungsnummer' } };
  const geprueft = V.textsatzModulPruefen(satz);
  assert.equal(geprueft.gueltig, true, 'der Satz selbst ist gültig — die Kennung ist eine Kern-Kennung');
  assert.ok(Object.keys(geprueft.texte).length === 1,
    'die Beschriftung KÖNNTE also ankommen — unter einer eigenen SPRACHKENNUNG');

  /* Und genau hier liegt der Bruch: `de-AT` ist eine Sprache, kein Rechtsraum.
     Wer damit Österreich abbildet, sagt „österreichisches Deutsch" und meint
     „österreichisches Recht". Für die Schweiz, für Südtirol und für jede
     deutschsprachige Bürgerin im Ausland ginge dieselbe Rechnung nicht auf. */
  assert.equal(katalogDe(V)['enduring-power-of-attorney'].AT, undefined,
    'der Rechtsraum-Katalog kennt kein AT — die Sprache trägt die Last, die dem Recht gehört');
});

/* ══ DER ROT-BELEG — die Pflicht aus A348, und hier ist sie keine Formalie ═════
   Der Phantomfeld-Wächter oben ist die Probe, die den eigenen Baufehler dieser
   Nacht gefunden hat (`finanzen/steuer_id` statt `steuerid`). Eine Probe, die
   das kann, muss zeigen, dass sie ROT wird — sonst ist sie eine Zusage und keine
   Messung, und genau der Zustand war in A336, A338 und A345 dreimal grün,
   während der Gegenstand kaputt war. */
test('[P17/P15·Rot-Beleg] der Phantomfeld-Wächter wird rot, wenn eine Persona ein erfundenes Feld setzt', async () => {
  const { V } = await depotFuer(P17);
  const bekannt = bekannteFeldIds(V);

  /* Positivkontrolle zuerst: der echte Bestand der Persona ist sauber. */
  const sauber = [];
  for (const [sektorId, felder] of Object.entries(V.getData().sektoren || {})) {
    for (const feldId of Object.keys(felder || {})) sauber.push(sektorId + '/' + feldId);
  }
  assert.deepEqual(sauber.filter((k) => !bekannt.has(k)), [],
    'P17 ist heute sauber — sonst bewiese der Rot-Teil unten nichts');

  /* Und jetzt derselbe Weg mit einer erfundenen Kennung. `sektorFeldSetzen`
     nimmt sie klaglos an (A379); der Wächter muss sie trotzdem finden. */
  V.__ungeprueft.sektorFeldSetzen('identity', 'erfundenes_feld_rotbeleg', 'x');   // Produktweg ohne Harness-Prüfung
  const mitPhantom = [];
  for (const [sektorId, felder] of Object.entries(V.getData().sektoren || {})) {
    for (const feldId of Object.keys(felder || {})) mitPhantom.push(sektorId + '/' + feldId);
  }
  assert.deepEqual(mitPhantom.filter((k) => !bekannt.has(k)), ['identity/erfundenes_feld_rotbeleg'],
    'der Wächter findet das erfundene Feld — er hat genau so den Baufehler dieser Nacht gefunden');
});
