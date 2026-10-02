# U2-ADR-458: Die Sprache des IPS-Begleittexts wird beim Export gewählt

**Status:** Angenommen — entschieden am 30.09.2026; Ausgestaltung (amtliche Sätze vor eigenen, nur vollständige Sprachen,
Vermerk bei ungeprüfter Übersetzung) abgestimmt am 30.09./01.10.2026
**Datum:** 01.10.2026
**Kategorie:** INTEROPERABILITÄT, ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** Baut auf dem Stand von `acae26f90` (28.08.2026) auf: der IPS-Export war fest englisch, weil ein Empfänger im
Ausland den deutschen Inhalt nicht lesen konnte. Englisch bleibt die Voreinstellung; neu ist die Wahl.
**Status heute:** gilt — Beleg `tests/fhir-ips-exportsprache.test.js`.

---

## Kontext

Der FHIR-IPS-Export trägt feste Sätze für Menschen: die Narrative jeder Ressource, die Leer-Hinweise einer Sektion
(`emptyReason.text`), den Satz zur Zusammenstellung (Provenance), den Satz „keine bekannten Allergien“ usw. Seit dem
28.08.2026 standen sie fest englisch im Kern. In der Demo-Prüfung vom 28.09.2026 fiel das im deutschen Produkt als
„englischer Text“ auf. Die Entscheidung vom 30.09.2026: die Bürgerin wählt beim Export die Sprache dieser Sätze; zur Wahl
stehen alle EU-Amtssprachen und weitere, Voreinstellung bleibt Englisch.

## Die Entscheidung

1. **Ein Datenmodul, kein Text im Gerüst.** Die Sätze stehen in `tools/ips-begleittext-modul.json` (modulTyp
   `ips-begleittext`), je Sprache ein Fach mit allen Kennungen, mit Herkunft und Prüfstand. Der Produktbau setzt das Modul
   in die Region `AB_WERK_IPS_BEGLEITTEXT` jedes Produkts; im Gerüst ist sie `null`. Die Region steht im geteilten Abschnitt
   von `tools/lib/produkt-text-erzeugen.js`; die Kopie im Download-Gateway zieht mit (gepinnte Prüfsumme, U2-ADR-406).
2. **Codes bleiben, Freitexte bleiben.** Codes und ihr `display` stehen, wie die Terminologie sie führt; Sektionstitel
   (`section.title`) bleiben englisch wie bisher. Was die Bürgerin selbst eingetragen hat, bleibt in ihrer Sprache.
3. **Kennzeichnung.** `Composition.language` und `lang`/`xml:lang` jeder Narrative nennen die gewählte Sprache.
4. **Nur vollständige Sprachen.** Angeboten wird eine Sprache nur, wenn ihr Fach alle Kennungen trägt
   (`ipsExportSprachen`). Ein IPS in zwei Sprachen gemischt ist für einen Arzt schlechter als ein englischer.
5. **Amtliches vor Eigenem.** Die englischen Leer-Sätze sind die amtlichen eHDSI-DisplayLabels (MyHealth@EU Master Value
   Set Catalogue 9.1.0, CodeSystem `eHDSIDisplayLabel`, CC0-1.0; Codes 133–145). Übersetzungen dieser Labels sind nicht
   öffentlich (die Übersetzungen der eHDSI liegen nur bei den nationalen Kontaktstellen); für alle übrigen Sätze gibt es
   nichts Amtliches. Sie sind eigene Übersetzungen, im Modul als solche benannt.
6. **Ungeprüft sichtbar.** Eine Übersetzung, die noch nicht unabhängig geprüft ist (Rückübersetzung und
   Fachbegriffsabgleich durch eine zweite Instanz, Pflicht), trägt den Vermerk in der Sprachauswahl und im Export selbst
   (Narrative der Composition). Der Vermerk in der Auswahl ist eine Zusicherung (`ipsSprachwahlUngeprueft` in
   `ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT`): ein Sprachmodul kann ihn nicht überschreiben.
7. **Die Wahl.** Ein Schritt vor der Ausgabe fragt die Sprache, vorausgewählt Englisch; gibt es nur eine Sprache oder kommt
   der Aufruf programmatisch, wird nicht gefragt.
8. **Ein Modul für alle Produkte.** Alle vier Produkte tragen dasselbe Modul, über das Rezept (`modulPfade`), damit
   Mess- und Auslieferweg dasselbe Produkt bauen. Darum reist die Region nicht mit der Depot-Datei (Mitschrift
   „fuehrt-nicht“, wie die nativen Kataloge); trägt ein Produkt ein anderes Modul, wird sie ein Fach.

## Was nicht entschieden ist

- Sprachen aus angedockten Sprachmodulen: die Entscheidung nennt auch „jede angedockte Sprache“. Das braucht einen
  Einlassweg für `ips-begleittext`-Fächer (heute verwirft der Textsatz-Einlass unbekannte Kennungen); folgt als eigener
  Schritt.
- Ob nach der Rückübersetzung zusätzlich Muttersprachler prüfen müssen, bevor der Vermerk fällt.

## Belege

```konformitaet
aussage:  Kein fester Satz geht als Literal in eine Narrative des IPS-Exports; jeder kommt aus dem Modul.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-exportsprache.test.js#[IPS-Sprache·Literal] kein fester Satz geht als Literal in eine Narrative
```

```konformitaet
aussage:  Ohne Wahl ist der Begleittext englisch, auch im deutschen Produkt; jede Narrative und Composition.language nennen die Sprache.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-exportsprache.test.js#[IPS-Sprache·Voreinstellung] ohne Wahl ist der Begleittext englisch — auch im deutschen Produkt
```

```konformitaet
aussage:  Bei gewählter Sprache stehen alle festen Sätze in ihr, keiner in einer anderen; eine unbekannte Sprache fällt auf Englisch.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-exportsprache.test.js#[IPS-Sprache·Wahl] gewählt Deutsch: Composition.language, lang und alle festen Sätze deutsch — keiner englisch
```

```konformitaet
aussage:  Alle vier Produkte tragen byte-gleich dasselbe IPS-Modul; trägt eines ein anderes oder keines, fällt es auf.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-exportsprache.test.js#[IPS·Modul·Produkte] alle vier Produkte tragen byte-gleich dasselbe IPS-Modul
```

---

*Vivodepot GmbH · Berlin · 01.10.2026*
