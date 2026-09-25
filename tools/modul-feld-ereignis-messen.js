#!/usr/bin/env node
/* Was geschieht heute, wenn ein ANGEDOCKTES Feld auf Personen verweist und ein
   Ereignis eintritt? — Messung fuer die Entscheidungsvorlage „Ereignis-Achse fuer
   Module oeffnen" (Auftrag `Pro_Achse_und_Modulstruktur`, Vorlage 1, Punkt 1).

   KEIN BAU. Das Werkzeug aendert nichts am Produkt; es legt ein Depot an, dockt
   ein Modul-Feld vom Typ Personen-Verweis an, fuellt es, laesst ein Ereignis
   eintreten und schreibt auf, was passiert.

   WARUM UEBERHAUPT EIN PRUEFGEGENSTAND UND KEINE CODE-LESUNG: Der Auftrag
   verlangt ausdruecklich, „am Pruefgegenstand zu messen, der das Merkmal traegt".
   Eine Code-Lesung sagt, was der Filter tut; sie sagt nicht, ob das Feld
   verworfen, uebergangen oder gemeldet wird — das sind drei verschiedene
   Antworten, und nur der Lauf unterscheidet sie.

   Ohne Argument laeuft es gegen den Kern des Arbeitsbaums. */

'use strict';
const path = require('path');

(async () => {
  const { ladeKern } = require(path.resolve(__dirname, '../tests/load-kern.js'));
  const { V } = ladeKern();

  const d = V.leeresDepot();
  V.setData(d);

  /* Eine Person, die spaeter stirbt. */
  const person = { id: 'p-modul-1', vorname: 'Mara', nachname: 'Bevoll', rolle: 'bevollmaechtigt' };
  d.menschen.push(person);

  /* Ein angedocktes Modul-Feld vom Typ Personen-Verweis — genau das Merkmal, um
     das es geht. Gleiche Form wie in den Andock-Proben (`a359-*`). */
  d.feldDefinitionen = [{
    sektorId: 'advanceCare', feldId: 'modul_bezugsperson',
    typ: 'ref', entitaet: 'person', label: 'Bezugsperson (Modul)',
  }];
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.modul_bezugsperson = { ref: person.id };

  /* Zum Vergleich: derselbe Verweis an einem EINGEBAUTEN Feld der Achse. */
  d.sektoren.advanceCare.provisionInstruments = [{
    id: 'z-1', instrument: 'enduring-power-of-attorney', authorizedPersons: { ref: person.id },
  }];

  const zeile = (k, v) => console.log(`  ${k.padEnd(46)} ${v}`);
  const jetzt = new Date('2026-08-21T12:00:00.000Z');

  console.log('\n1 · Sieht der Waechter das angedockte Feld?');
  const funde = V.ereignisAchseWaechterFunde();
  zeile('ereignisAchseWaechterFunde()', JSON.stringify(funde));
  zeile('darunter modul_bezugsperson?', funde.some(f => f.feldId === 'modul_bezugsperson') ? 'JA' : 'NEIN');

  console.log('\n2 · Kennt der Sammler der Personen-Felder es?');
  const alle = V._ereignisAlleEntitaetPersonFelder();
  zeile('Personen-Felder gesamt', alle.length);
  zeile('darunter modul_bezugsperson?', alle.some(f => f.feldId === 'modul_bezugsperson') ? 'JA' : 'NEIN');

  console.log('\n3 · Was markiert das Ereignis „Tod"?');
  const markiert = V.ereignisMarkieren('tod', person.id, jetzt);
  zeile('markierte Dokument-IDs', JSON.stringify(markiert));
  zeile('betroffene Zeilen-IDs', JSON.stringify(V._ereignisBetroffeneZeilenIds(person.id, 'tod')));

  console.log('\n4 · Traegt das angedockte Feld danach irgendeine Spur?');
  const rohe = d.sektoren.advanceCare.modul_bezugsperson;
  zeile('Wert des Modul-Feldes', JSON.stringify(rohe));
  zeile('Anlass am Modul-Feld', (rohe && rohe.ereignisAnlaesse) ? JSON.stringify(rohe.ereignisAnlaesse) : 'keiner — das Feld ist unveraendert');
  zeile('Fehler/Meldung dabei', 'keine — ereignisMarkieren wirft nicht und meldet nicht');

  /* POSITIVKONTROLLE. Ohne sie waere „der Waechter findet nichts" nicht von
     „der Waechter laeuft nicht" zu unterscheiden — genau die stumme Sorte, die
     dieses Projekt schon mehrfach getroffen hat. Dasselbe Feld wird einmal in
     den eingebauten Katalog und einmal an das Modul-Register gehaengt. */
  console.log('\n5 · Positivkontrolle — derselbe Feldtyp, zwei Orte');
  const fingiert = { id: 'probe_person_ref', label: 'Probe', typ: 'ref', entitaet: 'person' };
  const sek = V.bereicheAlle().find((x) => x.id === 'identity');
  sek.sektionen[0].felder.push(fingiert);
  const imKatalog = V.ereignisAchseWaechterFunde().some((f) => f.feldId === 'probe_person_ref');
  sek.sektionen[0].felder.pop();
  d.feldDefinitionen.push({ sektorId: 'identity', feldId: 'probe_person_ref', typ: 'ref', entitaet: 'person', label: 'Probe' });
  const imModul = V.ereignisAchseWaechterFunde().some((f) => f.feldId === 'probe_person_ref');
  d.feldDefinitionen.pop();
  zeile('im eingebauten Katalog: Waechter schlaegt an?', imKatalog ? 'JA' : 'NEIN');
  zeile('als angedocktes Modul-Feld: schlaegt an?', imModul ? 'JA' : 'NEIN');

  console.log('\nKeine Empfehlung, keine Wertung — die Vorlage zieht den Schluss, nicht das Werkzeug.\n');
})().catch((e) => { console.error(e); process.exit(1); });
