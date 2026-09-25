'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   M1 · Zug 1 — die Marke „läuft ab", und sie gehört NICHT in die Erkennungstabelle
   ────────────────────────────────────────────────────────────────────────────
   DER GRUND, gemessen: `ERKENNUNG_LEITFELDER` hat elf Einträge, liegt von Hand
   im Quelltext, ist `Object.freeze` und hat null Schreibzugriffe. **Ein Modul
   kann dort nichts eintragen.** Käme der Vorschlag von dort, bekäme ein
   angedocktes Feld nie einen.

   WAS „LÄUFT AB" HEISST, WIRD FESTGELEGT UND NICHT ABGELEITET: ein Prüftermin
   entsteht AUS einer Gültigkeit, eine Ableitung aus dem Bestand schlüge nie an.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Stufe 2 (09.09.2026) — `bereicheAlle()` statt der Buendel-Liste: seit `wohnen` ab Werk
   gesaet wird, fuehrt `V.SEKTOREN` zwoelf. Diese Probe trifft eine Aussage ueber ALLE
   Bereiche; mit der Buendel-Liste haette sie einen davon still nicht mehr geprueft und
   waere gruen geblieben. (Erhebung vom 09.09.2026, Klasse „Aussage ueber alle Bereiche".) */

/* ══ Die Vorbedingung: warum nicht die Erkennungstabelle ═══════════════════ */

test('[M1·Zug1·Vorbedingung] die Erkennungstabelle ist geschlossen — ein Modul kann dort nichts eintragen', () => {
  const { V, src } = ladeKern();
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): elf → sechs. Fünf Typen sind entfallen
  // (schwerbehindertenausweis, personalausweis, krankenkassenkarte, elefand, aufenthaltstitel)
  // — ihr Leitfeld ist seither ein Listen-Unterfeld, kein Skalarwert mehr; ein `leitfeld`-Zeiger
  // erwartet einen Skalar. Dokumentierter Gap, keine Dedup-Regel für Mehrfacheinträge gebaut.
  assert.equal(Object.keys(V.ERKENNUNG_LEITFELDER).length, 6, 'sechs Einträge, wie gemessen');
  assert.ok(Object.isFrozen(V.ERKENNUNG_LEITFELDER), 'und eingefroren');
  // Kein Schreibzugriff im ganzen Kern: die Tabelle wird gelesen, nie ergänzt.
  const schreibend = (src.match(/ERKENNUNG_LEITFELDER\s*\[[^\]]*\]\s*=/g) || []).length
    + (src.match(/ERKENNUNG_LEITFELDER\.\w+\s*=/g) || []).length;
  assert.equal(schreibend, 0, 'null Schreibzugriffe — darum trägt sie den Vorschlag nicht');
});

test('[M1·Zug1] die Erkennungstabelle bleibt UNBERÜHRT — sie ist eine benachbarte Mechanik, keine Doppelung', () => {
  const { V } = ladeKern();
  // Sie arbeitet auf DOKUMENT-Typen, die Marke auf FELDERN. Kippt das, ist es eine Doppelung.
  for (const typ of Object.keys(V.ERKENNUNG_LEITFELDER)) {
    assert.ok(V.ERKENNUNG_LEITFELDER[typ], typ + ' steht unverändert');
  }
  assert.equal(Object.keys(V.ERKENNUNG_LEITFELDER).length, 6);
});

/* ══ Die Form ══════════════════════════════════════════════════════════════ */

test('[M1·Zug1] die Werteliste ist geschlossen, und eine unbekannte Marke wird NAMENTLICH verworfen', () => {
  const { V } = ladeKern();
  /* Zwei Marken seit dem 21.08.2026 (Kreise-Laufzettel Posten 3): `frist` ist dazugekommen.
     Die Zahl war nie das Kriterium — geprüft wird die FORM: geschlossene Liste, Unbekanntes
     wird namentlich verworfen. Die Aufzählung steht trotzdem hier, damit eine dritte Marke
     eine bewusste Entscheidung bleibt und nicht durchrutscht.

     DIE DRITTE IST AM 21.08.2026 GEKOMMEN, und sie ist genau eine solche Entscheidung:
     `giltAb` (A445), entschieden mit dem Satz „Gültigkeitsbeginn bauen".
     Sie ist der Zwilling von `laeuftAb` und läuft durch dieselben zwei Stellen — nur an den
     anderen Schlüssel (`feldGueltigkeit[…].von` statt `.bis`). Sie ist NICHT durchgerutscht:
     dieser Wächter hat sie gefangen, und dieser Absatz ist die Antwort darauf. */
  assert.equal(V.FELD_MARKEN_ERLAUBT.join(','), 'laeuftAb,frist,giltAb');
  const g = V.feldMarkenPruefen(['laeuftAb', 'laeuftAbPlus', 'darfAllesLesen']);
  assert.equal(g.marken.join(','), 'laeuftAb', 'die bekannte bleibt, das Feld lebt');
  assert.equal(Array.from(g.verworfen).sort().join(','), 'darfAllesLesen,laeuftAbPlus',
    'beide unbekannten werden BENANNT — ein Tippfehler sähe sonst aus wie ein Verzicht');
});

test('[M1·Zug1] die Prüfung wirft nie und schluckt keinen Doppeleintrag', () => {
  const { V } = ladeKern();
  for (const roh of [undefined, null, 'laeuftAb', 42, {}, [null, undefined]]) {
    const g = V.feldMarkenPruefen(roh);
    assert.ok(Array.isArray(g.marken) && Array.isArray(g.verworfen), JSON.stringify(roh));
  }
  assert.equal(V.feldMarkenPruefen(['laeuftAb', 'laeuftAb']).marken.length, 1, 'keine Dublette');
});

/* ══ Die Zahl, die ganz vorn steht ════════════════════════════════════════ */

test('[M1·Zug1] wie viele der eingebauten Datumsfelder tragen die Marke — von wie vielen', () => {
  const { V } = ladeKern();
  let datumsfelder = 0;
  for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    if (f.typ === 'datum') datumsfelder++;
    for (const u of (f.unterFelder || [])) if (u.typ === 'datum') datumsfelder++;
  }
  // Direkt am Baum gezählt, nicht über eine Hilfsfunktion: eine Hilfsfunktion, die NUR die
  // Probe benutzt, ist unverdrahteter Code — genau das, was der A253-Wächter meldet.
  let mitMarke = 0;
  for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    if (V.feldMarkenPruefen(f.marken).marken.includes('laeuftAb')) mitMarke++;
    for (const u of (f.unterFelder || [])) if (V.feldMarkenPruefen(u.marken).marken.includes('laeuftAb')) mitMarke++;
  }
  /* 15 → 13 (Produktentscheidung, 18.08.2026, Weg 2 — A320): die zwei Listen-Unterfelder
     `kreditkarten[].karte_gueltig` und `weitere_wohnungen[].mietvertrag_befristet_bis` trugen die
     Marke wirkungslos — `data.feldGueltigkeit` führt `[sektorId][feldId]` flach und hat für eine
     Listenzeile keinen Platz. Seither ist die deklarierte Menge deckungsgleich mit der wirksamen;
     `tests/m1-gueltigkeit-schreibweg-angabe.test.js` prüft genau diese Deckungsgleichheit.

     13 → 14 (M1 Zug 5, Zug 1, 18.08.2026 — der Umzug). Die Rechenkette, und sie ist der Beleg,
     dass nichts übersehen wurde: 13 + 4 neu markierte Ablauf-Felder
     (`schwerbehindertenausweis_gueltig`, `pflegegrad_befristet_bis`, `ks_wasser_haltbar`,
     `ks_lebensmittel_haltbar`) − 3 AUSSTELLUNGS-Daten, die die Marke verlieren
     (`ausweis_ausgestellt`, `aufenthaltstitel_ausgestellt`, `reisepass_ausgestellt`) = 14.
     Der Grund für die drei: `laeuftAb` heisst „dieses Datum ist der letzte Tag, an dem etwas
     gilt" — ein Ausstellungsdatum ist der ERSTE. Es bleibt an seinem Ort im Bereich und speist
     weiter den Gültigkeits-Vorschlag und `issuance_date`.

     14 → 16 (Kreise-Laufzettel Posten 5, 21.08.2026): die zwei Listen-Unterfelder von oben sind
     ZURÜCK — und diesmal wirken sie. Nicht über `feldGueltigkeit` (dort hat eine Zeile
     weiterhin keinen Platz), sondern über `prueftermineZeilen`, das den Termin direkt aus der
     ZEILE liest. Die Deckungsgleichheit, die A320 hergestellt hat, gilt damit unverändert —
     nur zählt sie jetzt zwei Wirkungswege statt einen.

     16 → 11 (Schnitt Glied 3, 22.08.2026, A448, U2-ADR-161): fünf Skalarfelder mit der Marke
     sind zu Listen-Unterfeldern OHNE Marke geworden (`ausweis_gueltig`, `aufenthaltstitel_gueltig`,
     `elefand_gueltig`, `krankenkassenkarte_gueltig`, `schwerbehindertenausweis_gueltig`) —
     `data.feldGueltigkeit` führt weiterhin nur `[sektorId][feldId]` flach, keinen Platz für eine
     Listenzeile. Kein stiller Verlust: `prueftermineFelder` emittiert für genau diese neun
     Gruppen seither JE EINTRAG einen eigenen Prüftermin (s. `tests/korb1-mehrwertig-pruefermine.
     test.js`) — ein zweiter, listenfähiger Wirkungsweg, der die Marke hier nicht braucht.

     11 → 10 (Auftrag „Die Feld-Remarkierung", 23.08.2026): `finance.companyPensionAgreedStartDate` trug die
     Marke FÄLSCHLICH — ein Rentenbeginn ist ein Beginn, keine endende Gültigkeit. Migriert auf
     `giltAb` (Schema 74→75, `tests/feld-remarkierung-bav-rentenbeginn.test.js`). Acht
     Bereichsfelder plus zwei Listen-Unterfelder bleiben bei `laeuftAb`. */
  assert.equal(mitMarke, 10, 'acht Bereichsfelder plus zwei Listen-Unterfelder — und alle zehn wirken');
  // 13.09.2026: +1 Datumsfeld (zvr_abschrift_datum, U2-ADR-410) — ein Ereignisdatum, KEIN laeuftAb
  // (s. tools/anfaenge-falsch-abgelegt-erheben.js, dort als KEIN_FALL geführt), darum bleibt
  // mitMarke bei 10 und nur die Gesamtzahl steigt.
  assert.equal(datumsfelder, 43, 'von dreiundvierzig Datumsfeldern insgesamt');
  // Ein Geburtsdatum läuft nicht ab — das ist der Sinn der Marke, nicht ihr Nebeneffekt.
  assert.equal(V.feldHatMarke('identitaet', 'birthDate', 'laeuftAb'), false);
  // `ausweis_gueltig` existiert seit Glied 3 nicht mehr als Skalarfeld — kein Absturz, keine Marke.
  assert.equal(V.feldHatMarke('identitaet', 'ausweis_gueltig', 'laeuftAb'), false);
  assert.equal(V.feldHatMarke('mobility', 'passportValidUntil', 'laeuftAb'), true, 'unverändert markiert');
});

test('[M1·Zug1] die Marke sagt „diese SORTE Feld läuft ab" — unabhängig davon, ob ein Wert steht', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  // Leeres Depot, kein einziger Wert — die Marke trägt trotzdem. Eine Ableitung aus dem
  // Bestand schlüge hier nie an, und genau das war der Grund, sie festzulegen.
  assert.equal(V.feldHatMarke('mobility', 'passportValidUntil', 'laeuftAb'), true);
});

/* ══ Ein angedocktes Feld trägt sie wie ein eingebautes ═══════════════════ */

test('[M1·Zug1·Rot] ein Modul bringt die Marke mit, und sie wirkt', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const d = V.getData();
  d.feldDefinitionen = [
    { sektorId: 'verwaltung', feldId: 'tpl_lizenz_gueltig', typ: 'datum', label: 'Lizenz gültig bis',
      marken: ['laeuftAb'] },
    { sektorId: 'verwaltung', feldId: 'tpl_ohne_marke', typ: 'datum', label: 'Irgendein Datum' },
  ];
  V.setData(d);
  assert.equal(V.feldHatMarke('verwaltung', 'tpl_lizenz_gueltig', 'laeuftAb'), true,
    'das angedockte Feld trägt die Marke wie ein eingebautes');
  assert.equal(V.feldHatMarke('verwaltung', 'tpl_ohne_marke', 'laeuftAb'), false);
  assert.equal(V.feldHatMarke('verwaltung', 'tpl_ohne_marke', 'laeuftAb'), false,
    'und ein angedocktes Feld ohne Marke bekommt keine');
});

test('[M1·Zug1·Rot] ein Modul mit einer UNBEKANNTEN Marke wird namentlich verworfen und verwirft nicht das Feld', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const d = V.getData();
  d.feldDefinitionen = [{ sektorId: 'verwaltung', feldId: 'tpl_schlau', typ: 'datum', label: 'Schlau',
    marken: ['laeuftAb', 'darfAllesLesen'] }];
  V.setData(d);
  assert.equal(V.feldHatMarke('verwaltung', 'tpl_schlau', 'laeuftAb'), true, 'das Feld lebt weiter');
  const g = V.feldMarkenPruefen(['laeuftAb', 'darfAllesLesen']);
  assert.equal(g.verworfen.join(','), 'darfAllesLesen', 'und die unbekannte Marke ist benannt');
});

test('[M1·Zug1] der Template-Adapter reicht die Marke durch — sonst käme sie am Feld nie an', () => {
  const { V } = ladeKern();
  const f = V._templateDefAlsFeld({ feldId: 'tpl_x', typ: 'datum', label: 'X', marken: ['laeuftAb'] });
  assert.deepEqual(Array.from(f.marken || []), ['laeuftAb']);
  const ohne = V._templateDefAlsFeld({ feldId: 'tpl_y', typ: 'datum', label: 'Y' });
  assert.equal('marken' in ohne, false, 'ohne Marke wird kein leeres Feld erfunden');
});

test('[M1·Zug1] es gibt KEINE Liste erlaubter Felder — der Schlüssel bleibt der Feldschlüssel', () => {
  const { V, src } = ladeKern();
  // Dieselbe Zusicherung wie bei `feldGueltigkeit` selbst (U2-ADR-144 §2): eine Liste wäre
  // die Nachpflege-Stelle, an der die Erkennungstabelle sieben Tage hinterherlief.
  const rumpf = src.slice(src.indexOf('function feldHatMarke'), src.indexOf('function feldGueltigkeitLesen'));
  assert.ok(rumpf.includes('feldDefFuer('), 'die Marke wird am aufgelösten Feld gelesen');
  assert.ok(rumpf.includes('data.feldDefinitionen'), 'und, wenn dort nichts steht, an der eingewanderten Definition');
  assert.ok(!/ERLAUBTE_FELDER|FELD_ALLOWLIST/.test(rumpf), 'und nirgends gegen eine Feldliste geprüft');
});
