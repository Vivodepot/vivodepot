'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-101, Entscheidung 2, zweite Konformitätsklausel — die AUSGEGEBENE Sicht
   ────────────────────────────────────────────────────────────────────────────
   Die erste Klausel des ADR liest die Deklaration im Quelltext (`_ANG_SITUATIONEN`)
   und vergleicht sie mit der Sieben-Felder-Tabelle — kein Render nötig. Diese
   zweite Klausel prüft das, was tatsächlich aus `renderAngehoerigenBlatt` kommt, über
   einen echten Kern (`load-kern.js`) mit echtem DOM-Stub — der Weg vom Modell zur
   Anzeige, auf dem der Fehler vom 22.07.2026 entstand (ein Wizard zeigte auf das
   Instrument eines anderen Moduls).

   SCOPE-PRÄZISIERUNG (Fund, 30.08.2026, vor dem Bau dieser Datei): U2-ADR-157
   (21.08.2026 — nach ADR-101, keine Ref in keine Richtung) erlaubt der Bürgerin
   ausdrücklich, ein von einem Modul vorgeschlagenes Fremdfeld auf JEDES der fünf
   Angehörigen-Blätter zu heben — Blatt 3 „Beerdigung und Nachlass" eingeschlossen,
   keine Ausnahme in ADR-157s geschlossener Werteliste. Wörtlich genommen ist die
   Klausel „die ausgegebene Sicht ... enthält kein Feld außerhalb der sieben
   benannten" darum FALSCH, sobald irgendwer einmal hebt — nicht durch einen Bug,
   sondern durch eine spätere, bewusste, weiterhin geltende Entscheidung.

   ADR-157 selbst zieht die Grenze aber schon strukturell: das Gehobene landet
   NICHT zwischen den eingebauten Blöcken, sondern in einem eigenen Abschnitt am
   Ende („Von Ihnen dazugenommen", `renderAngehoerigenBlatt`, vivodepot.html) — genau
   damit eine Leserin sieht, „was zum Blatt gehört und was dazugenommen wurde".
   Diese Datei prüft darum den EINGEBAUTEN Teil der Sicht (die `bloecke` aus
   `_ANG_SITUATIONEN`, vor einem etwaigen Gehoben-Abschnitt) — dieselbe Trennung,
   die ADR-157 schon eingeführt hat, keine neue. Die dritte Probe unten belegt
   ausdrücklich, dass ein gehobenes Fremdfeld zwar erscheint, aber NACH der
   Sieben-Felder-Grenze, nicht darin gemischt.

   ROT-BEWEIS: die zweite Probe (Gegenprobe) beweist, dass die Sieben-Zählung der
   ersten Probe tatsächlich anschlägt, wenn ein achtes Feld dazukäme — sonst wäre
   „sieben Zeilen" auch dann grün, wenn die Zählung nichts misst.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'adr-101-blatt3-probe-2026';

// Der Orakel-Maßstab — wörtlich aus U2-ADR-101, Entscheidung 2, Tabelle Spalte
// „Feld", von Hand abgetippt und NICHT aus `_ANG_SITUATIONEN` abgeleitet. Driftet
// die Registry vom ADR, muss dieser unabhängige Maßstab das fangen.
const ADR_101_SIEBEN_FELDER = Object.freeze([
  ['personal', 'typeOfFuneral'],
  ['personal', 'funeralHome'],
  ['personal', 'preferredLocationGraveUrnSite'],
  ['personal', 'funeralAlreadyPlannedInAdvance'],
  ['personal', 'preArrangementContractStorage'],
  ['people', 'menschen'],
  ['personal', 'letterForTheDeathScenario'],
]);

test('[ADR-101·Sicht] Blatt "Beerdigung und Nachlass": die ausgegebene Sicht enthält im eingebauten Teil kein Feld außerhalb der sieben benannten', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);

  V.renderAngehoerigenBlatt(V._angSituationById('beerdigung'));
  const html = document.getElementById('content').innerHTML;

  const anzahlZeilen = (html.match(/class="feld-zeile"/g) || []).length;
  assert.equal(anzahlZeilen, 7,
    'die ausgegebene Sicht trägt genau sieben Feld-Zeilen — nicht mehr, nicht weniger');

  // Byte-genau: jede der sieben ADR-Zeilen, gerendert über dieselbe Produktionsfunktion
  // (`akutZeileHTML`), die `renderAngehoerigenBlatt` selbst benutzt — keine zweite Auflösung.
  for (const [quelle, feld] of ADR_101_SIEBEN_FELDER) {
    const erwarteteZeile = V.akutZeileHTML(quelle, feld);
    assert.ok(erwarteteZeile, 'die Diskriminante muss selbst auflösen: ' + quelle + '/' + feld);
    assert.ok(html.includes(erwarteteZeile),
      'die ausgegebene Sicht muss die Zeile für ' + quelle + '/' + feld + ' tragen');
  }
});

test('[ADR-101·Sicht·Gegenprobe] ein achtes, erfundenes Feld in den eingebauten Blöcken lässt die Zählung tatsächlich anschlagen', () => {
  /* Ohne diese Probe wäre „sieben Zeilen" auch dann grün, wenn die Zählung selbst nichts misst.
     Ein LOKALES, nicht-eingefrorenes Abbild von `beerdigung` mit einem achten, erfundenen Eintrag
     in einem eingebauten Block — nicht die echte Registry, die ist eingefroren (ADR-157). */
  const { V, document } = ladeKern();
  const echtesBlatt = V._angSituationById('beerdigung');
  const gefaelschtesBlatt = {
    id: echtesBlatt.id, icon: echtesBlatt.icon, titel: echtesBlatt.titel,
    bloecke: echtesBlatt.bloecke.map((b) => ({ id: b.id, titel: b.titel, eintraege: b.eintraege.slice() })),
  };
  gefaelschtesBlatt.bloecke[0].eintraege = gefaelschtesBlatt.bloecke[0].eintraege.concat([
    { quelle: 'identity', feld: 'givenName' },   // ein Feld AUSSERHALB der sieben benannten
  ]);

  V.renderAngehoerigenBlatt(gefaelschtesBlatt);
  const html = document.getElementById('content').innerHTML;
  const anzahlZeilen = (html.match(/class="feld-zeile"/g) || []).length;
  assert.equal(anzahlZeilen, 8,
    'BELEG: ein achtes Feld in den eingebauten Blöcken hebt die Zählung auf acht — '
    + 'die Sieben-Probe oben würde diesen Fall also tatsächlich als rot melden');
});

test('[ADR-101·Sicht·Heben-Trennung] ein gehobenes Fremdfeld (U2-ADR-157) erscheint NACH der Sieben-Felder-Grenze, nicht darin gemischt', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.feldDefinitionen = [{
    sektorId: 'finance', feldId: 'tpl_bestattungskosten_fonds', label: 'Bestattungskosten-Fonds',
    typ: 'text', herkunft: 'Bestattungsvorsorge-Fonds GmbH', blattVorschlag: 'beerdigung',
  }];
  d.sektoren.finance = Object.assign({}, d.sektoren.finance, { tpl_bestattungskosten_fonds: '12.000 EUR' });
  V.setData(d);
  await V.blattFeldHeben('beerdigung', 'finance', 'tpl_bestattungskosten_fonds');

  V.renderAngehoerigenBlatt(V._angSituationById('beerdigung'));
  const html = document.getElementById('content').innerHTML;

  const anzahlZeilenGesamt = (html.match(/class="feld-zeile"/g) || []).length;
  assert.equal(anzahlZeilenGesamt, 8,
    'Vorbedingung: das gehobene Fremdfeld erscheint überhaupt — sonst prüft die Trennung unten Luft');

  const grenze = html.indexOf(V.STRINGS.blattGehobenTitel);
  assert.ok(grenze > 0, 'der eigene Gehoben-Abschnitt ("Von Ihnen dazugenommen") muss stehen');

  const eingebauterTeil = html.slice(0, grenze);
  const gehobenerTeil = html.slice(grenze);
  assert.equal((eingebauterTeil.match(/class="feld-zeile"/g) || []).length, 7,
    'VOR der Grenze stehen weiterhin genau die sieben eingebauten Zeilen');
  assert.equal((gehobenerTeil.match(/class="feld-zeile"/g) || []).length, 1,
    'das gehobene Fremdfeld steht NACH der Grenze, im eigenen Abschnitt — nicht unter den sieben');
  assert.ok(!eingebauterTeil.includes('Bestattungskosten-Fonds'),
    'die Beschriftung des Fremdfelds darf im eingebauten Teil nicht auftauchen');
});
