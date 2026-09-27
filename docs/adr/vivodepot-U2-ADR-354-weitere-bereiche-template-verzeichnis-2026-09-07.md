# U2-ADR-354: Templates bekommen ihren Ort — „Weitere Bereiche" als eigenes Verzeichnis, kein vierzehnter Bereich

**Status:** Angenommen
**Datum:** 07.09.2026
**Kategorie:** GERÜST / NAVIGATION
**Linie:** U2
**Anker:** Auftrag — ein Bereich „Templates … oder wie auch
immer", mit der harten Anforderung, dass der Ort eine nicht definierte Anzahl anzeigen muss.

- **Status heute:** gilt — Beleg `tests/c2-weitere-bereiche-template-verzeichnis.test.js`.

---

## Der Befund

Ein eingelassenes Template (`logikModul`, z. B. der Erbschein-Vorbereitungsauszug) hatte bisher
genau einen Einstiegspunkt: eine Karte im Vorsorge-Regal, sichtbar nur innerhalb des einen
Bereichs, der das Merkmal `vorsorgeRegal` trägt. Ein Template, dessen Feldinhalt über mehrere
Bereiche verteilt liegt (z. B. ein Justiz- oder Genossenschaftsfall), hatte dort keinen
natürlichen Platz.

**Kein vierzehnter Bereich** — ein Bereich beantwortet „welche Art Daten", ein Template
beantwortet „wofür"; beides als gleichrangige Zeile nebeneinander behauptet, es sei dasselbe.
Ein vierzehnter Datenbereich hätte außerdem einen zweiten Ausgabeweg gebraucht (Export/xShare),
obwohl die Felder eines Templates bereits in ihren eigenen Bereichen exportiert werden — zwei
Wege für dieselben Daten.

## Die Entscheidung

**Ein Verzeichnis, keine Datenhülle.** Eine eigene Navigationsgruppe „Weitere Bereiche" listet
alle Templates, die die Person selbst eingelassen hat — Name, Herkunft — und öffnet beim Antippen dasselbe Dokument, das
auch die bestehende Regal-Karte öffnet (`dokumentOeffnen`, ein Aufrufer, kein zweiter Weg). Der
Name ist im ganzen Haus exklusiv dem Template-Verzeichnis vorbehalten — die Auffanggruppe der
angedockten *Bereiche* heißt seit U2-ADR-171-Nachtrag „Bereiche", nicht „Weitere Bereiche"; die
beiden Gegenstände dürfen nicht denselben Namen tragen.

**Ab Werk Eingebackenes gilt als eingebaut.** Auszüge und Logikmodule, die ein Produkt ab Werk
mitbringt, stehen nicht in „Weitere Bereiche" und tragen im Regal kein Paket-Icon. Ab Werk ist,
was die ausgelieferte Datei selbst trägt: die eingebackenen Auszüge und Logikmodule. Das Merkmal
`abWerk` am gespeicherten Modul wird beim Laden aus dieser Kennungsliste neu gesetzt, nie aus der
Depot-Datei übernommen; eine Datei kann es weder entfernen noch einem selbst geladenen Modul
anheften. Ein selbst eingelassenes Logikmodul mit der Kennung eines eingebackenen weist der Einlass
benannt ab (`kennung-ab-werk`), damit nie zwei Einträge dieselbe Kennung tragen. Ein frisches Depot
zeigt die Gruppe darum nicht.

**Drei Eigenschaften, alle bereits am Bestand gemessen statt neu entworfen:**

1. **Sichtbar:** ein eigener Einstieg, aus der bereits bestehenden, generischen Erhebung
   `logikModuleAlsKarten()` — derselben Quelle, die das Vorsorge-Regal schon nutzt. Kein
   zweiter Enumerationsweg, keine Ortsliste.
2. **Unsichtbar in den Daten:** das Verzeichnis besitzt keinen einzigen Feldwert. Ein Template
   *liest* über sein `datenSchema` aus bestehenden Bereichsfeldern; das Bundle selbst trägt an
   keiner Stelle einen Bürgerwert.
3. **Kein Template, keine Gruppe:** die Gruppe erscheint nur, wenn
   `logikModuleAlsKarten().length > 0` — kein Platzhalter, kein Hinweis, dieselbe Hausregel wie
   an anderen datenlage-adaptiven Stellen der Anwendung.

## Der Prüfstein: Widerruf entfernt die Seite, nicht die Eintragung

Weil ein Template nie einen eigenen Wert besitzt, folgt zwingend: Entfernt man ein Template aus
`data.logikModule[]`, verschwindet sein Eintrag aus dem Verzeichnis — die Felder, die es gelesen
hat, stehen unverändert in ihren Bereichen, weil sie nie woanders lagen. Geprüft an einem echten
Zwei-Template-Bestand: das Entfernen des einen Templates löscht ausschließlich dessen eigenen
Eintrag, lässt das andere unberührt, und beide zuvor gesetzten Feldwerte bleiben unverändert
bestehen — auch der Wert, den ausschließlich das entfernte Template gelesen hatte.

## Was diese Änderung ausdrücklich nicht tut

- **Keine eigene UI zum Entfernen/Widerrufen eines Templates.** Geprüft ist die STRUKTUR, die
  eine künftige Bedienoberfläche nur noch aufrufen müsste (`data.logikModule` filtern, neu
  rendern) — der Bedienweg selbst (Knopf, Bestätigung, Wortlaut) ist nicht Teil dieser Änderung.
- **Kein Gültigkeits-/Ablauf-/Widerrufs-Zustand pro Zeile.** Ein signierter Widerruf mit
  Ablaufdatum setzt eine Zertifikatskette voraus, die für heute eingelassene Templates
  (unsigniertes Selbst-Einlassen) nicht existiert — dieser Zustand wäre eine eigene, spätere
  Erweiterung an genau der Stelle, die diese Änderung dafür offen lässt.
- **Kein Eingriff in die „Bereiche"-Auffanggruppe.** Sie ist ein anderer Gegenstand (angedockte
  Bereichs-Container, nicht Templates) und bleibt unverändert.

## Konformität

```konformitaet
aussage:  Ohne ein selbst eingelassenes Template erscheint die Gruppe "Weitere Bereiche" im
          Markup überhaupt nicht — kein Platzhalter, kein Hinweis. Ab Werk Eingebackenes
          zählt nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/c2-weitere-bereiche-template-verzeichnis.test.js#kein Template angedockt → keine Gruppe, kein Platzhalter, kein Hinweis
pruefung: tests/c2-weitere-bereiche-template-verzeichnis.test.js#ab-Werk-Auszüge (Erbschein + Beratungshilfe) erscheinen nach depotAnlegen NICHT dort — sie gelten als eingebaut
```

```konformitaet
aussage:  Jedes selbst eingelassene Template erscheint als eigener, klickbarer Eintrag mit Name und
          Herkunft; der Öffnungsweg ist derselbe wie an der bestehenden Regal-Karte
          (dokumentOeffnen, kein zweiter Mechanismus).
zustand:  geprüft
herkunft: invariante
pruefung: tests/c2-weitere-bereiche-template-verzeichnis.test.js#selbst eingelassene Templates → Gruppe erscheint mit beiden
pruefung: tests/c2-weitere-bereiche-template-verzeichnis.test.js#der Sidebar-Eintrag wird auf denselben Öffnungsweg verdrahtet wie die Regal-Karte (dokumentOeffnen, kein zweiter Weg)
```

```konformitaet
aussage:  Ein Feldwert, den ein Template liest, lebt ausschließlich in seinem Bereich — das
          Modul-Bundle selbst trägt an keiner Stelle eine Kopie.
zustand:  geprüft
herkunft: invariante
pruefung: tests/c2-weitere-bereiche-template-verzeichnis.test.js#ein Feldwert, den ein Template liest, steht unverändert in SEINEM Bereich — keine Kopie im Verzeichnis
```

```konformitaet
aussage:  Entfernen eines Templates aus data.logikModule[] löscht ausschließlich seinen eigenen
          Verzeichnis-Eintrag; ein anderes, nicht betroffenes Template bleibt unverändert
          sichtbar, und alle zuvor gesetzten Feldwerte in den Bereichen bleiben unangetastet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/c2-weitere-bereiche-template-verzeichnis.test.js#Entfernen eines Templates aus data.logikModule[] löscht seinen Sidebar-Eintrag UND läßt den anderen unberührt UND läßt die Felddaten unangetastet
```

---

*Vivodepot GmbH · Berlin · 07.09.2026*
