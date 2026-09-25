# U2-ADR-120 — Übergabe und Widerruf sind ein Paar

**Status:** Entschieden (31.07.2026, nach eigener Prüfung des Arbeitsbaums) und umgesetzt — B20 + B21 (Zug-Details dort), alle acht Abnahmen belegt, `npm test` 2202/0. Nachtrag zur Faktenlage unten.
**Datum:** 30. Juli 2026
**Grundlage:** Produktentscheidung
**Status heute:** gilt — `data.uebergabeProtokoll[]` mit dem additiven Schema-Bump 44→45 im Kern
vorhanden (`vivodepot.html:21922`), B20 und B21 laut `docs/ARBEITSLISTE-v1.md` als erledigt
geführt, `npm test` aktuell grün.
**Bezug:** U2-ADR-100 §8 (migrationsfreies Fenster) · ADR-065 Klärung 4b (Template-Widerruf über Lifecycle-Status — Quelle im Arbeitsbaum nicht auffindbar, siehe Nachtrag) · U2-ADR-110 (übergebenes Datum wird verwendet) · Release-Definition vom 26.07.2026 · Template-Mechanismus intern v0.3 vom 17.05.2026, Abschnitt 4.1

---

## Kontext und Problem

Vivodepot kann Dokumente herausgeben. Es kann der Bürgerin nicht sagen, wem sie was gegeben hat, und es kann ihr nicht helfen, es zurückzunehmen.

Unterstellt wurde zunächst ein Widerrufsmechanismus für einen anderen Gegenstand: Templates würden über einen Lifecycle-Status-Wechsel auf `widerrufen` zurückgezogen, wirksam innerhalb des Depots (Zitat aus dem internen Template-Mechanismus-Papier: „ADR-065 Klärung 4b"). **Weder diese Quelle noch dieser Mechanismus lassen sich im Arbeitsbaum auffinden — Faktenkorrektur im Nachtrag unten.** Der einzige tatsächlich vorhandene Widerrufsmechanismus (`WIDERRUFS_LISTE`) betrifft Anbieter-Schlüssel global, nicht einzelne Template-Instanzen innerhalb eines Depots. Unberührt von dieser Korrektur bleibt der eigentliche Befund: ein Widerruf gegenüber einer Gegenstelle, die eine Kopie erhalten hat, ist ohnehin nicht vorgesehen.

**Zur Faktenlage, zweimal korrigiert am 30.07., nach einer gezielten Prüfung des Arbeitsbaums.** Das interne Papier zum Template-Mechanismus vom 17.05. nennt `_root.data['uebergabe-protokoll']` als Struktur des Schema-7-Bumps, beschrieben als „Übergabe-Historie pro Sektor und Format". Eine Suche im Branch `u2-kanon` am 30.07. findet den Bezeichner nicht, gefunden werden nur Übergabe-Module und deren Tests. **Eine unabhängig wiederholte Prüfung bestätigt diesen Befund:** null Treffer im gesamten Arbeitsbaum außerhalb der Zitate in diesem ADR. Ob die Struktur beim Clean-Slate-Umbau entfallen ist, umbenannt wurde oder nie migrierte, bleibt mit dieser Suchmethode ungeklärt — nur die **Abwesenheit selbst** ist belegt, nicht ihre Ursache. Die Entscheidung unten steht damit nicht mehr unter Vorbehalt der Messung, sondern auf ihr.

Der auslösende Befund ist unabhängig davon: Wer etwas weggibt, denkt über die Rücknahme nach. Eine Anwendung, die die Übergabe anbietet und den Widerruf offenlässt, erzeugt die Frage „und wie nehme ich das zurück?" ohne Antwort. Das ist keine fehlende Zusatzfunktion, sondern eine unvollständige Handlung.

---

## Entscheidungs-Treiber

— **Vorsorge-Strang.** Eine widerrufene Vorsorgevollmacht oder Patientenverfügung muss alle Stellen erreichen, die noch die alte Fassung haben. Ohne Empfängerliste weiß niemand, welche das sind.

— **Angehörigen- und Erbfall.** Wer ein Depot übernimmt, muss wissen, wohin Dokumente gegangen sind. Ohne Empfänger im Protokoll bricht der Faden mit dem Tod der Person.

— **Souveränitätsanspruch.** „Die Daten liegen bei Dir" gilt ohne Empfängerliste nur für die Datei, nicht für die Kopien.

— **Papierwirklichkeit der Zielgruppe.** Der Großteil der Weitergaben läuft nicht über Export, sondern über Ausdruck, Kopie oder Vorzeigen. Ein Protokoll, das nur digitale Ausgänge kennt, deckt den kleineren Teil ab.

— **Migrationsfreies Fenster.** Neue Felder sind eine Datenmodell-Änderung. Die Auslieferung an Tester schließt das Fenster aus U2-ADR-100 §8.

— **Nebennutzen, nicht Treiber.** Eine Zulieferer-Rolle in Datennutzungs-Vorhaben setzt diese Felder voraus. Die Begründung dieses ADR steht ohne sie.

---

## Entscheidung

**Übergabe und Widerruf werden als ein Vorgang behandelt, nicht als zwei Funktionen.** Daraus folgt siebenfach:

**1 · Datenmodell.** Ein Übergabe-Eintrag führt mindestens: Empfänger in Klartext, wie die Bürgerin ihn benannt hat; Zweck in Klartext; Zeitpunkt; Kennung, auf die ein Widerruf sich beziehen kann. Additiver Bump, keine Umstrukturierung.

**2 · Oberfläche.** Der Rücknahme-Weg liegt am selben Ort wie der Übergabe-Eintrag. Ein eigener Menüpunkt „Widerruf" wird abgelehnt — er zerlegt die Geste wieder in zwei Teile. Darstellung als Liste mit wenigen Spalten, ohne Assistent und ohne Konfiguration. Was nicht in eine Liste passt, kommt nicht hinein.

**3 · Manuelle Nachträge sind zulässig.** Die Bürgerin kann einen Übergabe-Eintrag anlegen, ohne dass ein Export stattgefunden hat — für Ausdrucke, Kopien, Vorzeigen, Postversand. Ohne diesen Punkt deckt das Protokoll den kleineren Teil der Wirklichkeit ab. Ein nachgetragener Eintrag ist als nachgetragen erkennbar, damit er nicht als technischer Nachweis missverstanden wird.

**4 · Einträge sind löschbar.** Es ist ihre Datei. Ein Protokoll, das sie nicht löschen kann, wäre ein Zwangsprotokoll in eigener Hand und widerspricht der Produktphilosophie. Beim Löschen erscheint der Hinweis, dass damit der Widerrufsweg zu diesem Empfänger verloren geht. Kein Papierkorb, keine Schattenkopie, keine Markierung „gelöscht".

**5 · Wahrhaftigkeit des Widerrufs.** Ein Widerruf aus einer Offline-Anwendung wirkt beim Empfänger, nicht im Depot. Die Oberfläche sagt das, bevor der Widerruf erzeugt wird, in einem Satz, den die Zielgruppe versteht. Kein Häkchen, das suggeriert, die Kopie sei weg. Falsche Sicherheit ist schlechter als kein Protokoll.

**6 · Form des Widerrufs.** Erzeugt wird ein Widerruf, den die Bürgerin auf einem Weg ihrer Wahl übermittelt: ausdruckbar und für Menschen lesbar, zugleich maschinenlesbar für Empfänger, die das verarbeiten können. Vivodepot übermittelt nichts selbst.

**7 · Wortwahl.** Wo die ePA ein Begriffsmodell etabliert hat — Berechtigung erteilen, Umfang festlegen, zurücknehmen — lehnt Vivodepot sich daran an, statt eigene Begriffe zu bilden. Wer beides nutzt, soll nicht zwei Denkmodelle lernen.

**Bestandsdaten.** Vorhandene Einträge, sofern es sie gibt, behalten leere Felder. Kein Rückschreiben, kein Rateverfahren. In der Liste erscheinen sie mit dem Vermerk, dass der Empfänger nicht erfasst wurde.

**Nicht Teil dieser Entscheidung.** Ein Einwilligungsbeleg als FHIR-`Consent`-Ressource. Er ist ein Institutionen-Adapter ohne Bürgernutzen und wird erst gebaut, wenn ein konkreter Partner benennt, was er maschinenlesbar braucht.

---

## Abnahme

Umgesetzt ist die Entscheidung, wenn folgendes belegt ist — Zahlen erzeugt, nicht getippt:

1. Ein Übergabe-Eintrag mit allen vier Feldern entsteht beim Export und übersteht Speichern und erneutes Öffnen.
2. Ein manuell angelegter Eintrag ist von einem Export-Eintrag unterscheidbar.
3. Löschen eines Eintrags entfernt ihn vollständig; nach Speichern und Öffnen ist keine Spur auffindbar.
4. Der Rücknahme-Weg ist vom Eintrag aus in einem Schritt erreichbar; es existiert kein eigener Menüpunkt „Widerruf".
5. Der Hinweis zur Wirkungsgrenze erscheint vor der Erzeugung des Widerrufs, nicht danach.
6. Der erzeugte Widerruf ist lesbar ausdruckbar und maschinenlesbar; die Kennung verweist auf den Eintrag.
7. Migrationstest je Sprung nach U2-ADR-108 ist grün; ein Depot der Vorgängerfassung öffnet ohne Verlust.
8. Kein Netzverkehr während des gesamten Vorgangs.

---

## Konsequenzen

**Positiv.** Die Übergabe-Geste ist vollständig. Die häufigste Frage der Zielgruppe — wem habe ich das gegeben? — hat eine Antwort im Werkzeug. Der Vorsorge-Strang wird belastbar, weil Widerruf adressierbar ist. Der Erbfall erbt den Faden, nicht nur die Dateien. Das Unterscheidungsmerkmal gegenüber einem Ordner wird sichtbar: ein Ordner gibt Kopien heraus und vergisst.

**Negativ.** Bauumfang vor dem Release, mit Anteil in der UX-Stufe der festgelegten Reihenfolge; der Release rückt entsprechend. Das Protokoll erzeugt eine Erwartung, die nur teilweise erfüllbar ist — Punkt 5 begrenzt den Schaden, hebt ihn nicht auf. Empfänger in Klartext sind personenbezogene Daten Dritter im Depot; ausschließlich lokal und in Bürgerhand, gehört aber in die DPIA nach Art. 35 DSGVO. Und die Löschbarkeit aus Punkt 4 kann den Widerrufsweg zerstören — bewusst in Kauf genommen, weil Datenhoheit Vorrang hat.

**Rückfallposition.** Felder anlegen und leer lassen, Oberfläche zunächst als reine Liste ohne Rücknahme-Weg. Damit ist das migrationsfreie Fenster genutzt und der Ausbau kommt später ohne Migrationspfad. Ausdrücklich zweite Wahl — sie zerlegt die Geste wieder, was dieser ADR ablehnt. Vertretbar nur, wenn die Alternative wäre, das Fenster ungenutzt zu schließen.

---

## Offen

Ein zweiter ADR zu Beteiligungsbedingungen bei Datennutzungs-Vorhaben ist vorbereitet, aber nicht beauftragt. Er ist von dieser Entscheidung unabhängig.

---

## Nachtrag 31.07.2026 — Beschluss, Umsetzung, Faktenkorrektur

**Beschluss:** 31.07.2026, gestützt auf eine eigene Prüfung des Arbeitsbaums (s. Faktenlage oben). Der Beschluss selbst war zuvor nicht in dieser Datei festgehalten, obwohl der Bau (B20/B21) bereits darauf lief — dieser Nachtrag schließt die Lücke zwischen Entscheidung und Bau-Dokumentation.

**Faktenkorrektur zum Kontext-Abschnitt:** Die Prüfung konnte die dort zitierte Quelle „ADR-065 Klärung 4b" (Template-Widerruf über Lifecycle-Status-Wechsel) im Arbeitsbaum nicht auffinden — weder als Textstelle noch als lauffähigen Mechanismus. Der einzige vorhandene Widerrufsmechanismus (`WIDERRUFS_LISTE`) betrifft Anbieter-Schlüssel, nicht Template-Instanzen. Der auslösende Befund dieses ADR (kein Widerruf gegenüber einer Gegenstelle vorgesehen) bleibt davon unberührt und ist unabhängig bestätigt — nur der Verweis auf eine bestehende Template-Widerruf-Blaupause trägt nicht.

**Umsetzung:** `data.uebergabeProtokoll[]`, additiver Schema-Bump 44→45, Schreibpunkte an allen fünf geprüften Exportwegen, manueller Nachtrag, spurloses Löschen mit Vorab-Hinweis, Rücknahme-Weg am Eintrag ohne eigenen Menüpunkt, Wahrhaftigkeits-Hinweis vor Widerruf-Erzeugung, druck- und maschinenlesbares Widerruf-Artefakt (PDF + QR), Wortwahl nach ePA-Begriffsmodell. Alle acht Abnahmen aus diesem ADR einzeln gemessen und grün (siehe `docs/ARBEITSLISTE-v1.md`, Posten B20/B21). Kein Netzverkehr, additiv, keine Migration gebrochen (Kette 19→45 verlustfrei).

