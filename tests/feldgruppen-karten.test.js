'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Statuskarten: überladene Sektionen als klickbare Themen-Karten
   ────────────────────────────────────────────────────────────────────────
   Bezug: docs/spec/Vivodepot_Informationsarchitektur_Statuskarten_2026-08-26.md,
   Klick-Dummy-validiert. Betrifft NUR die in SEKTION_STATUSKARTEN_CLUSTER
   gelisteten Sektionen — alle anderen rendern unverändert flach.

   ROT-BEWEIS: vor dem Bau von SEKTION_STATUSKARTEN_CLUSTER/feldgruppenKarteHTML/
   feldgruppenStatusText warf `node --test tests/feldgruppen-karten.test.js` alle neun
   Proben rot (u. a. `V.SEKTION_STATUSKARTEN_CLUSTER` und `V.feldgruppenStatusText`
   waren `undefined`, „fünf .feldgruppen-karte" fand null Treffer). Die letzte Probe
   („andere Sektionen … rendern weiterhin flach") ist die GEGENPROBE dazu: sie hält
   fest, dass eine nicht gelistete Sektion (Stand 27.08.2026: `bundid-vorgaenge`) unverändert bleibt.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Stufe 2 (09.09.2026) — `bereicheAlle()` statt der Buendel-Liste: seit `wohnen` ab Werk
   gesaet wird, fuehrt `V.SEKTOREN` zwoelf. Diese Probe trifft eine Aussage ueber ALLE
   Bereiche; mit der Buendel-Liste haette sie einen davon still nicht mehr geprueft und
   waere gruen geblieben. (Erhebung vom 09.09.2026, Klasse „Aussage ueber alle Bereiche".) */

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

// Findet die SEKTION (nicht den Bereich) mit dieser id über alle SEKTOREN — und, falls ihr Bereich
// ein Deckblatt-Foto deklariert, dessen Feld-Id. `renderSektor` filtert das Deckblatt-Foto-Feld
// VOR dem Statuskarten-Aufruf aus `alleFelder` heraus (s. Kommentar dort: es erscheint bereits oben
// im Deckblatt, nicht als eigene Feldzeile) — dieselbe Ausnahme gilt hier für die Symmetrie-Probe.
function sektionUndFotoFeld(V, sektionId) {
  for (const sektor of V.bereicheAlle()) {
    const sektion = (sektor.sektionen || []).find(s => s.id === sektionId);
    if (sektion) return { sektion, fotoFeld: sektor.deckblatt && sektor.deckblatt.fotoFeld };
  }
  return { sektion: null, fotoFeld: null };
}

describe('[SEKTION_STATUSKARTEN_CLUSTER] Datentabelle', () => {
  test('person hat fünf Cluster', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['person'];
    assert.ok(Array.isArray(cluster) && cluster.length === 5);
  });

  /* Generisch über Object.keys(SEKTION_STATUSKARTEN_CLUSTER) — NICHT nur 'person': dies ist das
     Fundament für die sechs Anschlussbereiche (B.2-B.7). Jeder neue Eintrag in der Tabelle erbt
     diese Prüfung automatisch, ohne dass der jeweilige Folgeauftrag sie nachbauen müsste
     (Review-Fund vom 26.08.2026, Task B.1). */
  test('jede Sektion: jedes Feld höchstens einmal über ihre Cluster verteilt', () => {
    const { V } = ladeKern();
    for (const sektionId of Object.keys(V.SEKTION_STATUSKARTEN_CLUSTER)) {
      const alleFelder = V.SEKTION_STATUSKARTEN_CLUSTER[sektionId].flatMap(c => c.felder);
      assert.equal(new Set(alleFelder).size, alleFelder.length,
        '[' + sektionId + '] ein Feld steht doppelt in den Clustern');
    }
  });

  /* Review-Fund (26.08.2026): ohne diese Probe fällt ein Tippfehler in der Cluster-Tabelle NICHT
     laut auf — die betroffene, eigentlich gemeinte echte Feld-Id landet lautlos im Nachreich-
     Cluster "Weiteres" (feldgruppenKarteHTML), und die getippte Phantom-Id verschwindet spurlos
     (sie löst in `alleFelder.find` nie auf, `_clusterZaehlung` überspringt sie). Zwei Richtungen: */
  test('jede Sektion: jede Cluster-Feld-Id existiert wirklich (kein Tippfehler/Phantom)', () => {
    const { V } = ladeKern();
    for (const sektionId of Object.keys(V.SEKTION_STATUSKARTEN_CLUSTER)) {
      const { sektion } = sektionUndFotoFeld(V, sektionId);
      assert.ok(sektion, '[' + sektionId + '] keine Sektion mit dieser id im Katalog gefunden');
      const echteIds = new Set(sektion.felder.map(f => f.id));
      for (const id of V.SEKTION_STATUSKARTEN_CLUSTER[sektionId].flatMap(c => c.felder)) {
        assert.ok(echteIds.has(id),
          '[' + sektionId + '] Cluster nennt "' + id + '" — kein Feld dieser Sektion trägt diese Id');
      }
    }
  });

  test('jede Sektion: jedes echte Feld ist einem Cluster zugeordnet (Deckblatt-Foto ausgenommen)', () => {
    const { V } = ladeKern();
    for (const sektionId of Object.keys(V.SEKTION_STATUSKARTEN_CLUSTER)) {
      const { sektion, fotoFeld } = sektionUndFotoFeld(V, sektionId);
      const clusterIds = new Set(V.SEKTION_STATUSKARTEN_CLUSTER[sektionId].flatMap(c => c.felder));
      for (const f of sektion.felder) {
        if (f.id === fotoFeld) continue;   // s. Kommentar an sektionUndFotoFeld oben
        assert.ok(clusterIds.has(f.id),
          '[' + sektionId + '] Feld "' + f.id + '" steht in keinem Cluster — fiele beim Rendern '
          + 'lautlos in "Weiteres" statt in seine benannte Karte');
      }
    }
  });
});

describe('[feldgruppenStatusText] Klartext-Status, nie eine nackte Zahl', () => {
  test('0 von N eingetragen -> "noch nichts eingetragen"', () => {
    const { V } = ladeKern();
    assert.equal(V.feldgruppenStatusText(0, 5), V.STRINGS.statuskarteLeer);
  });
  test('N von N eingetragen -> "vollständig ausgefüllt"', () => {
    const { V } = ladeKern();
    assert.equal(V.feldgruppenStatusText(5, 5), V.STRINGS.statuskarteVollstaendig);
  });
  test('teilweise eingetragen -> "teilweise ausgefüllt"', () => {
    const { V } = ladeKern();
    assert.equal(V.feldgruppenStatusText(2, 5), V.STRINGS.statuskarteTeilweise);
  });
  test('kein Statustext enthält eine rohe Ziffer', () => {
    const { V } = ladeKern();
    for (const txt of [V.STRINGS.statuskarteLeer, V.STRINGS.statuskarteTeilweise, V.STRINGS.statuskarteVollstaendig]) {
      assert.doesNotMatch(txt, /\d/, 'Klartext-Status darf keine nackte Zahl enthalten: "' + txt + '"');
    }
  });
});

describe('[renderSektor] person rendert als Statuskarten, nicht als flache Liste', () => {
  test('fünf .feldgruppen-karte im gerenderten Markup, keine flache Feldliste außerhalb einer Karte', async () => {
    const { V, document } = await frischMitDepot();
    V.oeffneSektor('identity');
    const html = document.getElementById('content').innerHTML;
    const karten = html.match(/<details class="feldgruppen-karte"/g) || [];
    assert.equal(karten.length, 5, 'erwartet fünf Statuskarten für person');
    assert.match(html, /Kernidentität/);
    assert.match(html, /Kontakt/);
  });

  test('Klick-Zustand: leeres Depot -> alle Karten zeigen "noch nichts eingetragen"', async () => {
    const { V, document } = await frischMitDepot();
    V.oeffneSektor('identity');
    const html = document.getElementById('content').innerHTML;
    const kartenBloecke = html.split('<details class="feldgruppen-karte"').slice(1);
    assert.equal(kartenBloecke.length, 5);
    for (const block of kartenBloecke) {
      assert.match(block.split('</summary>')[0], new RegExp(V.STRINGS.statuskarteLeer));
    }
  });

  test('ein befülltes Feld -> seine Karte zeigt "teilweise ausgefüllt"', async () => {
    const { V, document } = await frischMitDepot();
    V.sektorFeldSetzen('identity', 'givenName', 'Erika');
    V.oeffneSektor('identity');
    const html = document.getElementById('content').innerHTML;
    const kernidentitaetKarte = html.split('<details class="feldgruppen-karte"')
      .find(b => b.includes('Kernidentität'));
    assert.match(kernidentitaetKarte.split('</summary>')[0], new RegExp(V.STRINGS.statuskarteTeilweise));
  });

  /* Review-Fund (26.08.2026, Critical): `_clusterZaehlung` zählte `gesamt` früher als die rohe
     Länge der KONFIGURIERTEN Cluster-Liste statt der tatsächlich sichtbaren Felder. "Familienstand
     & Güterstand" enthält zwei an `familienstand` gegatete Felder (`gueterstand`: nur 'verh'/'elp',
     `trennungsdatum`: nur 'getrennt'/'geschieden') — bei familienstand='ledig' sind BEIDE
     unsichtbar, `gesamt` blieb aber bei 4 (roh) statt 3 (sichtbar). Reproduziert exakt den
     gemeldeten Fall: jedes sichtbare Feld befüllt, Status bleibt trotzdem "teilweise ausgefüllt". */
  test('vollständig ausgefüllt ist erreichbar, wenn ausgeblendete Cluster-Felder mitzählen dürften (familienstand=ledig)', async () => {
    const { V, document } = await frischMitDepot();
    V.sektorFeldSetzen('identity', 'maritalStatus', 'ledig');
    V.sektorFeldSetzen('identity', 'taxClass', 'I');
    V.sektorFeldSetzen('identity', 'taxClassEarlierEntry', 'II');
    V.oeffneSektor('identity');
    const html = document.getElementById('content').innerHTML;
    const karte = html.split('<details class="feldgruppen-karte"')
      .find(b => b.includes('Familienstand'));
    // gueterstand/trennungsdatum sind bei familienstand='ledig' ausgeblendet (sichtbarWenn) — die
    // drei SICHTBAREN Felder des Clusters (familienstand, steuerklasse, steuerklasse_frueher)
    // sind alle gesetzt; die Karte muss darum "vollständig", nicht "teilweise" zeigen.
    assert.match(karte.split('</summary>')[0], new RegExp(V.STRINGS.statuskarteVollstaendig),
      'gesamt zählte den ausgeblendeten Zustand mit (Regression von _clusterZaehlung)');
  });

  test('andere Sektionen ohne Cluster-Eintrag rendern weiterhin flach (kein feldgruppen-karte)', async () => {
    const { V, document } = await frischMitDepot();
    // sozialversicherung (Task 2) und wohnen (Task 4) dienten hier nacheinander als Beispiel, bis
    // ADR-175 sie migrierte — inzwischen hat JEDER Bereich mindestens eine migrierte Sektion,
    // darum genügt „gar kein feldgruppen-karte im Bereich" nicht mehr. `bundid-vorgaenge` (Bereich
    // verwaltung) ist noch flach, sein Geschwister `geraete-digitale-zugaenge` bereits migriert
    // (fünf Cluster) — die Probe hält fest, dass bundid-vorgaenge KEINE zusätzliche Karte beisteuert.
    V.oeffneSektor('administration');
    const html = document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 5,
      'bundid-vorgaenge ist nicht in SEKTION_STATUSKARTEN_CLUSTER — nur die fünf Cluster von geraete-digitale-zugaenge dürfen erscheinen');
  });
});

describe('[SEKTION_STATUSKARTEN_CLUSTER] krisenvorsorge', () => {
  test('sechs Cluster, jedes der 33 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['preparedness'];
    assert.equal(cluster.length, 6);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 33);
  });
  test('renderSektor krisenvorsorge zeigt sechs Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('emergencyPreparedness');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 6);
    assert.match(html, /Wasser &amp; Lebensmittel/);
    assert.match(html, /Hygiene/);
  });
});

describe('[SEKTION_STATUSKARTEN_CLUSTER] ausbildung-beruf', () => {
  test('sechs Cluster, jedes der 31 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['ausbildung-beruf'];
    assert.equal(cluster.length, 6);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 31);
  });
  test('renderSektor ausbildung-beruf zeigt sechs Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('education');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 6);
    assert.match(html, /Schulabschluss/);
    assert.match(html, /Sonstige Qualifikationen/);
  });
});

describe('[SEKTION_STATUSKARTEN_CLUSTER] notfall-aerzte', () => {
  test('sechs Cluster, jedes der 28 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['notfall-aerzte'];
    assert.equal(cluster.length, 6);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 28);
  });
  test('renderSektor notfall-aerzte zeigt sechs Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('health');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 6);
    assert.match(html, /Im Notfall/);
    assert.match(html, /Krankenversicherung/);
  });
});

describe('[SEKTION_STATUSKARTEN_CLUSTER] geraete-digitale-zugaenge', () => {
  test('fünf Cluster, jedes der 22 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['geraete-digitale-zugaenge'];
    assert.equal(cluster.length, 5);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 22);
  });
  test('renderSektor verwaltung zeigt fünf Statuskarten für geraete-digitale-zugaenge', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('administration');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 5);
    assert.match(html, /Passwörter &amp; Zugangscodes/);
    assert.match(html, /Kryptowerte/);
  });
  test('bundid-vorgaenge bleibt flach (kein zusätzlicher feldgruppen-karte-Block dafür)', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('administration');
    const html = k.document.getElementById('content').innerHTML;
    // genau 5 Karten (nur geraete-digitale-zugaenge) — bundid-vorgaenge fügt keine weiteren hinzu
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 5);
  });
});

describe('[SEKTION_STATUSKARTEN_CLUSTER] konten-steuern-vorsorge', () => {
  test('sechs Cluster, jedes der 22 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['konten-steuern-vorsorge'];
    // 20.09.2026 (U2-ADR-424): 5 → 6 Cluster, 21 → 22 Felder — die neue Feldgruppe Versicherungen
    // (fg-finanzen-versicherungen, ein Feld: privateInsurancePolicies), gemessen, nicht addiert.
    assert.equal(cluster.length, 6);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 22);
  });
  test('renderSektor finanzen zeigt sechs Statuskarten für konten-steuern-vorsorge', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('finance');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 6);
    assert.match(html, /Vermögen &amp; Nachlass/);
    assert.match(html, /Altersvorsorge/);
  });
});

/* Screenshot-Review Befund B (27.08.2026): „Meine Menschen" war der Kontrast-Beleg im Founder-
   Screenshot — grüne, immer offene .sektion--eingabe-Karten statt der hier etablierten weißen
   Klapp-Karten. Vier ihrer fünf Sektionen (kinder-sek, unterhalt-sek, pflege-sek,
   partnerschaft-sek) wandern hier ein; `menschen-liste` bleibt bewusst draußen — sie trägt kein
   Feld (felder: []), sondern das Personen-Register (menschenRegisterHTML), eine Listen-Ansicht
   ohne Vollständigkeits-Status (s. Kommentar an der Sektion im Katalog). Werte-Erhalt: die
   Feld-Zeilen selbst kommen unverändert aus feldZeileHTML — nur ihre Hülle wechselt von flach zu
   Klapp-Karte, dieselbe Garantie wie bei `person` oben. */
describe('[SEKTION_STATUSKARTEN_CLUSTER] meine-menschen', () => {
  test('vier Sektionen mit Cluster-Eintrag, jedes ihrer Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    // Erwartete Feldzahl je Sektion — Review-Fund (27.08.2026): der Testname behauptete die
    // Eindeutigkeits-Prüfung, prüfte sie aber nicht selbst (verließ sich stillschweigend auf den
    // generischen [Datentabelle]-Block oben). Jetzt lokal UND explizit, pro Sektion.
    const erwarteteFelderZahl = { 'kinder-sek': 4, 'unterhalt-sek': 1, 'pflege-sek': 2, 'partnerschaft-sek': 1 };
    for (const sektionId of Object.keys(erwarteteFelderZahl)) {
      const cluster = V.SEKTION_STATUSKARTEN_CLUSTER[sektionId];
      assert.ok(Array.isArray(cluster), '[' + sektionId + '] fehlt in SEKTION_STATUSKARTEN_CLUSTER');
      const alle = cluster.flatMap(c => c.felder);
      assert.equal(new Set(alle).size, alle.length, '[' + sektionId + '] ein Feld steht doppelt in den Clustern');
      assert.equal(alle.length, erwarteteFelderZahl[sektionId], '[' + sektionId + '] Feldzahl weicht ab');
    }
  });

  test('menschen-liste bleibt absichtlich draußen (Register, keine Feldgruppe)', () => {
    const { V } = ladeKern();
    assert.equal(V.SEKTION_STATUSKARTEN_CLUSTER['menschen-liste'], undefined);
  });

  test('renderSektor meine-menschen zeigt vier Statuskarten (kinder/unterhalt/pflege/partnerschaft)', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('people');
    const html = k.document.getElementById('content').innerHTML;
    // Eine Karte je Cluster: Kinder+Geburts-Assistent (2), Unterhalt (1), Pflege (1),
    // Partnerschaft (1) = 5 Karten insgesamt.
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 5);
    assert.match(html, /Kinder und Schutzbefohlene/);
    assert.match(html, /Unterhaltsverpflichtungen und -ansprüche/);
    assert.match(html, /Pflege/);
    assert.match(html, /Ehe- \/ Lebenspartnerschaft/);
  });

  test('menschen-liste rendert weiterhin das Personen-Register, nicht als Karte', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('people');
    const html = k.document.getElementById('content').innerHTML;
    assert.match(html, /data-menschen-register="1"/, 'das Register muss weiterhin erscheinen');
  });

  test('Werte-Erhalt: ein befülltes Pflege-Feld erscheint unverändert innerhalb seiner Karte', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('people', 'careLeaveFamilyCareLeave', 'Pflegezeit ab 09/2026');
    k.V.oeffneSektor('people');
    const html = k.document.getElementById('content').innerHTML;
    const pflegeKarte = html.split('<details class="feldgruppen-karte"').slice(1)
      .find(b => b.includes('feldgruppen-karte-titel">Pflege<'));
    assert.ok(pflegeKarte, 'keine Pflege-Karte gefunden');
    assert.match(pflegeKarte, /Pflegezeit ab 09\/2026/);
    assert.match(pflegeKarte.split('</summary>')[0], new RegExp(k.V.STRINGS.statuskarteTeilweise));
  });
});

describe('[SEKTION_STATUSKARTEN_CLUSTER] erinnerungen-briefe', () => {
  test('sechs Cluster, jedes der 17 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['erinnerungen-briefe'];
    assert.equal(cluster.length, 6);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 17);
  });
  test('renderSektor persoenliches zeigt sechs Statuskarten für erinnerungen-briefe', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('personal');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 6);
    assert.match(html, /Abhängige Personen &amp; Konflikte/);
    assert.match(html, /Religion &amp; Spiritualität/);
  });
  test('bestattung-abschied bleibt flach (kein zusätzlicher feldgruppen-karte-Block dafür)', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('personal');
    const html = k.document.getElementById('content').innerHTML;
    // genau 6 Karten (nur erinnerungen-briefe) — bestattung-abschied fügt keine weiteren hinzu
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 6);
  });
});

/* ADR-175 (27.08.2026) Task 1 — erster von vier komplett flachen Bereichen im Vollrollout.
   `mobilitaet` hat nur die eine Sektion `fahrzeuge-fuehrerschein`, darum keine "bleibt flach"-
   Nachbarprobe wie bei erinnerungen-briefe/bestattung-abschied nötig. Gruppierung übernommen aus
   dem bestehenden Block-Kommentar an der Feldliste (Zug 5, CW-14, 24.08.2026) — nicht neu
   erfunden. */
describe('[SEKTION_STATUSKARTEN_CLUSTER] fahrzeuge-fuehrerschein', () => {
  test('drei Cluster, jedes der 13 Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const cluster = V.SEKTION_STATUSKARTEN_CLUSTER['fahrzeuge-fuehrerschein'];
    assert.equal(cluster.length, 3);
    const alle = cluster.flatMap(c => c.felder);
    assert.equal(new Set(alle).size, alle.length);
    assert.equal(alle.length, 13);
  });
  test('renderSektor mobilitaet zeigt drei Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('mobility');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 3);
    assert.match(html, /Fahrzeuge/);
    assert.match(html, /Führerschein/);
    assert.match(html, /Reise/);
  });

  /* Review-Fund (27.08.2026): feldgruppenKarteHTML rief _fristHinweisFuerFeld nie auf — der
     flache Pfad (renderSektor, W-7 Zug 3) hängt seinen berechneten Fristhinweis direkt ans Feld,
     die Statuskarte tat das nicht. Latent, solange kein geclustertes Feld gueltigkeitVorschlag/
     fristRegel trug — reisepass_gueltig (dieser Bereich) ist der erste betroffene Fall im ganzen
     Kern. Ohne diese Probe verschwindet der Hinweis lautlos bei jedem künftigen Rollout-Schritt,
     der ein Feld mit demselben Muster in eine Karte umzieht. */
  test('reisepass_gueltig trägt seinen Fristhinweis auch innerhalb der Statuskarte', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    // _ausweisGueltigkeitVorschlagText braucht das Geburtsdatum (identitaet), um zwischen der
    // Sechs-/Zehn-Jahre-Regel (§ 5 Abs. 1 PassG, unter/über 24 bei Ausstellung) zu unterscheiden —
    // ohne es liefert die Berechnung stumm '' zurück (kein Fehlschlag, kein Hinweis).
    k.V.sektorFeldSetzen('identity', 'birthDate', '1990-01-01');
    k.V.sektorFeldSetzen('mobility', 'passportIssuedOn', '2023-04-01');
    k.V.oeffneSektor('mobility');
    const html = k.document.getElementById('content').innerHTML;
    assert.match(html, /Vorschlag: gültig bis/, 'Fristhinweis fehlt — feldgruppenKarteHTML ruft _fristHinweisFuerFeld nicht auf');
  });
});

/* ADR-175 (27.08.2026) Task 2 — zweiter der vier komplett flachen Bereiche. Drei Sektionen, je
   ein Cluster mit allen Feldern der Sektion (Sektionsgrenze = vorhandene thematische Grenze,
   wie bei kinder-sek/unterhalt-sek/pflege-sek/partnerschaft-sek — keine neue Untergliederung
   erfunden). */
describe('[SEKTION_STATUSKARTEN_CLUSTER] sozialversicherung', () => {
  test('drei Sektionen mit Cluster-Eintrag, jedes ihrer Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const erwarteteFelderZahl = { 'renten-pflege-soz': 11, 'schwerbehinderung-pflege': 7, 'unemployment': 4 };
    for (const sektionId of Object.keys(erwarteteFelderZahl)) {
      const cluster = V.SEKTION_STATUSKARTEN_CLUSTER[sektionId];
      assert.ok(Array.isArray(cluster), '[' + sektionId + '] fehlt in SEKTION_STATUSKARTEN_CLUSTER');
      const alle = cluster.flatMap(c => c.felder);
      assert.equal(new Set(alle).size, alle.length, '[' + sektionId + '] ein Feld steht doppelt in den Clustern');
      assert.equal(alle.length, erwarteteFelderZahl[sektionId], '[' + sektionId + '] Feldzahl weicht ab');
    }
  });

  test('renderSektor sozialversicherung zeigt drei Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('socialInsurance');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 3);
    assert.match(html, /Renten-, Pflege-, Sozialversicherung/);
    assert.match(html, /Schwerbehinderung und Pflege/);
    assert.match(html, /Arbeitslosigkeit/);
  });

  /* Generischer Fristhinweis (nicht der Sonderfall reisepass_gueltig wie bei Task 1) —
     kuendigungsdatum trägt fristRegel (§ 4 Satz 1 KSchG, drei Wochen). Bestätigt, dass die
     Task-1-Nachtrag-Reparatur an feldgruppenKarteHTML jeden fristRegel-Fall trägt, nicht nur
     den einen, der sie aufdeckte. */
  test('kuendigungsdatum trägt seinen Fristhinweis auch innerhalb der Statuskarte', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('socialInsurance', 'terminationDate', '2026-08-01');
    k.V.oeffneSektor('socialInsurance');
    const html = k.document.getElementById('content').innerHTML;
    assert.match(html, new RegExp(k.V.STRINGS.fristAbgelaufen), 'Fristhinweis fehlt für kuendigungsdatum');
  });
});

/* ADR-175 (27.08.2026) Task 3 — dritter der vier komplett flachen Bereiche. */
describe('[SEKTION_STATUSKARTEN_CLUSTER] vorsorge', () => {
  test('drei Sektionen mit Cluster-Eintrag, jedes ihrer Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const erwarteteFelderZahl = { 'meine-vorsorge': 1, 'estate': 1, 'care-preferences': 8 };
    for (const sektionId of Object.keys(erwarteteFelderZahl)) {
      const cluster = V.SEKTION_STATUSKARTEN_CLUSTER[sektionId];
      assert.ok(Array.isArray(cluster), '[' + sektionId + '] fehlt in SEKTION_STATUSKARTEN_CLUSTER');
      const alle = cluster.flatMap(c => c.felder);
      assert.equal(new Set(alle).size, alle.length, '[' + sektionId + '] ein Feld steht doppelt in den Clustern');
      assert.equal(alle.length, erwarteteFelderZahl[sektionId], '[' + sektionId + '] Feldzahl weicht ab');
    }
  });

  test('renderSektor vorsorge zeigt drei Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('advanceCare');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 3);
    assert.match(html, /Meine Vorsorge/);
    assert.match(html, />Erbe</);
    assert.match(html, /Pflegewünsche/);
  });

  test('Werte-Erhalt: ein befülltes Pflegewünsche-Feld erscheint unverändert innerhalb seiner Karte', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('advanceCare', 'personalCareDignity', 'Nur Baumwollkleidung, keine Wolle');
    k.V.oeffneSektor('advanceCare');
    const html = k.document.getElementById('content').innerHTML;
    const karte = html.split('<details class="feldgruppen-karte"').slice(1)
      .find(b => b.includes('feldgruppen-karte-titel">Pflegewünsche<'));
    assert.ok(karte, 'keine Pflegewünsche-Karte gefunden');
    assert.match(karte, /Nur Baumwollkleidung, keine Wolle/);
  });
});

/* ADR-175 (27.08.2026) Task 4 — vierter und letzter der komplett flachen Bereiche. */
describe('[SEKTION_STATUSKARTEN_CLUSTER] wohnen', () => {
  test('zwei Sektionen mit Cluster-Eintrag, jedes ihrer Felder genau einmal zugeordnet', () => {
    const { V } = ladeKern();
    const erwarteteFelderZahl = { 'wohnen-haupt': 14, 'wohnen-zweit': 1 };
    for (const sektionId of Object.keys(erwarteteFelderZahl)) {
      const cluster = V.SEKTION_STATUSKARTEN_CLUSTER[sektionId];
      assert.ok(Array.isArray(cluster), '[' + sektionId + '] fehlt in SEKTION_STATUSKARTEN_CLUSTER');
      const alle = cluster.flatMap(c => c.felder);
      assert.equal(new Set(alle).size, alle.length, '[' + sektionId + '] ein Feld steht doppelt in den Clustern');
      assert.equal(alle.length, erwarteteFelderZahl[sektionId], '[' + sektionId + '] Feldzahl weicht ab');
    }
  });

  test('renderSektor wohnen zeigt zwei Statuskarten', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.oeffneSektor('housing');
    const html = k.document.getElementById('content').innerHTML;
    assert.equal((html.match(/<details class="feldgruppen-karte"/g) || []).length, 2);
    assert.match(html, /Hauptwohnung/);
    assert.match(html, /Weitere Wohnungen/);
  });

  test('sichtbarWenn bleibt gewahrt: Mietfelder erscheinen nur bei wohnung_typ=miete', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('housing', 'ownedOrRented', 'eigentum');
    k.V.oeffneSektor('housing');
    let html = k.document.getElementById('content').innerHTML;
    assert.doesNotMatch(html, /data-edit="monthlyRentServiceCharges"/, 'Miete darf bei Eigentum nicht erscheinen');
    k.V.sektorFeldSetzen('housing', 'ownedOrRented', 'miete');
    k.V.oeffneSektor('housing');
    html = k.document.getElementById('content').innerHTML;
    assert.match(html, /data-edit="monthlyRentServiceCharges"/, 'Miete muss bei wohnung_typ=miete erscheinen');
  });
});
