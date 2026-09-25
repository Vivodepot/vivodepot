# U2-ADR-124 · Depot-Hülle umpacken — Gleichwertigkeit auch am Startseiten-Öffnen-Weg

**Status:** Angenommen (04.08.2026 — nach Zug 1a, zwei Ergänzungen unten eingearbeitet).
**Datum:** 04.08.2026 (interner Entwurfsauftrag „Depot umpacken – Bau", 03.08.2026,
Zug 1/1a).
**Bezug:** U2-ADR-123 (Sub-Depot-Selbstbestimmung statt Re-Key-Ceremony) · U2-ADR-081 Komponente 2
Weg 1 (Anker-zu-Sub-Wandlung, weiterhin **nicht** Gegenstand dieser ADR) · Klärung 11 (eigenes
Passwort pro Sub-Depot) · Gleichwertigkeits-Produktklarstellung (03.08.2026) ·
`depot-gleichwertigkeit-erhebung-2026-08-04.md` · `depot-umpacken-zug0-aufwand-und-fragen-2026-08-04.md`.
**Status heute:** gilt — Beleg `tests/adr-124-huelle-umpacken-zug2.test.js#[U2-124·Zug2·2] die entpackte Datei öffnet über depotLaden — Inhalt byte-identisch zum Sub-Depot-Weg`.

---

## Korrektur zur Auftragsprämisse

Der Bau-Auftrag benennt „ADR-081 Weg 1 und ADR-103 mit Re-Key-Ceremony" als Vorlagen, die durch
den Gleichwertigkeits-Befund überholt seien. Gemessen (Erhebung 04.08.): **keine der beiden Dateien
enthält „Weg 1", „Re-Key" oder „verselbstständig".** Die tatsächliche Re-Key-Prämisse stand in
U2-ADR-123s eigener erster Fassung vom 01.08. und wurde dort bereits verworfen — U2-ADR-123 trägt
seinen Ersatz-Titel selbst („statt Re-Key-Ceremony"). U2-ADR-123 grenzt seine Reichweite aber
ausdrücklich von der hier behandelten Frage ab: sie deckt „Inhaberin wechselt selbst ihr Passwort
und exportiert selbst" ab, nicht die Frage, ob die bereits exportierte Datei über den **gewöhnlichen
Startseiten-Öffnen-Weg** ohne Umweg lesbar wird. Diese ADR **amendiert U2-ADR-123**, nicht
U2-ADR-081/-103.

**Damit ausdrücklich festgehalten, gegen ein späteres Missverständnis (Zug 1a):** diese ADR
betrifft die **Hüllen-Erkennung beim Lesen** einer bereits als Sub-Depot angelegten Datei — nicht
die **Wandlung der Verwaltungsstruktur**. **Posten 103 (ADR-081 Weg 1, die Anker-zu-Sub-Wandlung
innerhalb einer bestehenden Verwaltungsbeziehung) bleibt offen und wird durch diese ADR nicht
entschieden.** Wer diese ADR liest und daraus schließt, Posten 103 sei erledigt oder gegenstandslos,
liest sie falsch.

## Kontext

Die Produktklarstellung vom 03.08.: Depots, die von Vivodepot kommen, sind vollständig gleich. Ein
Depot kann allein stehen oder in Beziehung zu anderen — die Beziehung heißt Einhängen und
Aushängen, in beide Richtungen.

**Gemessen ⟦M⟧ (Erhebung 04.08.):** der Abstand zwischen diesem Modell und dem Bestand ist eine
reine Hüllen-Frage, keine Krypto-Frage. Eine Sub-Depot-Blackbox-Datei
(`blackboxDateiAusUmschlag`, `:13445`) trägt `ct`/`iv`/beide Salts **verbatim**, mit demselben
Ableitungsgraphen wie ein Anker-Depot (`deriveMasterBits` → `importMasterHkdfKey` →
`deriveDepotKeyV2`, byte-identisch auf beiden Pfaden). Sie scheitert am regulären Öffnen-Weg
ausschließlich an `istGueltigerUmschlag` (`:7821`), die fünf Felder auf **oberster Ebene** verlangt
— die Blackbox-Datei trägt sie verschachtelt unter `.umschlag`. Umgekehrt weist
`umschlagAusDatei` (`:13912`) jede Datei zurück, die nicht `dateiTyp ===
'vivodepot-blackbox-export'` trägt — wieder eine reine Typ-Markierung, keine Krypto-Bedingung.

## Entscheidung

**Der Lesepfad lernt eine zweite Hüllen-Form, das Exportformat ändert sich nicht.**

1. **Sub → allein:** eine neue, reine Funktion entpackt eine Blackbox-Hülle auf die oberste Ebene,
   bevor `istGueltigerUmschlag`/`depotLaden` sie prüfen. Eine Datei, die heute exportiert wird, ist
   morgen unverändert — sie wird nur an einer zweiten Stelle (dem regulären Startseiten-Weg)
   zusätzlich akzeptiert.
2. **Allein → Sub:** `umschlagAusDatei` erkennt zusätzlich die Form einer regulären, über
   `depotSerialisieren` erzeugten Datei (die fünf Krypto-Felder bereits auf oberster Ebene, ohne
   `dateiTyp`) und gibt sie unverändert als Umschlag zurück.
3. **Kein Re-Encrypt, an keiner Stelle.** `ct`/`iv`/beide Salts wandern in jedem Zweig verbatim.
   Sobald ein Weg eine Neuverschlüsselung verlangen würde, ist das nach Auftragslage ein Halt, kein
   Zug — diese ADR entscheidet also ausdrücklich nur den hier beschriebenen, re-encrypt-freien Weg.

## Was diese Entscheidung ausdrücklich nicht mit entscheidet

**Der Vertrauens-Cache beim Einhängen** (`angehoerigenCache`/`angehoerigenOrt` einer vormals
eigenständigen Datei) — drei Optionen stehen offen (Zug-0-Bericht), diese ADR trifft keine
Vorentscheidung.

**Die Sperre `verselbststaendigungMoeglich`** bleibt, was sie in U2-ADR-123 bereits war: „nie durch
eine ADR beschlossen, hier ausdrücklich unentschieden." Gemessen (Erhebung 04.08.): sie hat im
gesamten Kern keinen Leser und bewacht die **Anker-zu-Sub-Verwaltungsstruktur-Wandlung**
(ADR-081 Weg 1, Posten 103) — ein anderes, weiterhin ungebautes Feature, das diese ADR nicht
berührt. Diese ADR entscheidet nichts über jene Wandlung.

**Die Anker-zu-Sub-Wandlung selbst** (ein bestehendes Depot wird nachträglich zum Sub-Depot einer
Verwaltungsstruktur, mit allem, was daran hängt) bleibt Posten 103 und ist nicht Gegenstand dieser
ADR — hier geht es um die Datei-Hülle einer bereits als Sub-Depot angelegten Datei, nicht um eine
Umwandlung bestehender Anker-Strukturen.

## Konsequenzen

Alte, bereits exportierte Blackbox-Dateien bleiben unverändert gültig und weiterhin über
`subDepotEinhaengen` einhängbar — keine Migration, keine Versionsnummer springt. Der bestehende
Blackbox-Weg wird um eine zweite akzeptierte Form **ergänzt**, nicht ersetzt.

## Was das Modell erfüllt — in zwei Schritten, nicht in einem

Nach diesem Bau ist das Gleichwertigkeits-Modell erreichbar, aber **zweischrittig, nicht
einschrittig**, und das ist beabsichtigt, keine Lücke:

1. **Aushängen mit Absicht `abgeben`** löscht den Umschlag bei der bisher führenden Person
   (`subDepotAushaengen`, bestehender Mechanismus, unverändert durch diese ADR).
2. **Danach steht die Datei allein** — sie öffnet über den regulären Startseiten-Weg (dieser Bau,
   Zug 2) und kann umgekehrt wieder eingehängt werden (Zug 3).

Beide Hälften zusammen erfüllen den Satz „ein Depot kann allein stehen oder eingehängt sein, in
beide Richtungen". **Das ist hier ausdrücklich festgehalten, damit später nicht der Eindruck
entsteht, es fehle noch etwas, und deshalb Posten 103 aus dem falschen Grund gebaut wird** — Posten
103 wäre ein DRITTER, hier nicht entschiedener Weg (Wandlung ohne den Umweg über Aushängen/Abgeben),
kein fehlendes Stück dieses Modells.

## Zug 2 — gebaut 04.08.2026

`umschlagEntpacken(roh)` (`vivodepot.html:7842`) hebt eine Blackbox-Hülle auf die oberste Ebene;
verdrahtet in `cryptoOverlayOeffnen` und `angehoerigenEintritt`, direkt nach dem JSON-Parse, vor
`istGueltigerUmschlag`. Acht Proben in `tests/adr-124-huelle-umpacken-zug2.test.js`: Datei durch
beide Wege geführt, Inhalt byte-identisch · altes Passwort öffnet, falsches wird abgewiesen · eine
manipulierte Datei wird über den GCM-Auth-Tag abgewiesen · die unveränderte Blackbox-Hülle bleibt
weiterhin über `subDepotEinhaengen` einhängbar (Regressionsprobe, belegt „additiv, kein Ersatz").

## Zug 3 — gebaut 04.08.2026

`umschlagAusDatei` (`vivodepot.html:14015`) akzeptiert zusätzlich eine reguläre Depot-Datei
(kein `dateiTyp`, Krypto-Felder auf oberster Ebene — dieselbe Form wie `istGueltigerUmschlag`)
und normiert sie auf denselben Sechs-Felder-Umschlag wie der Blackbox-Weg.
`pruefeBlackboxUmschlag` bleibt unverändert — gleiche Strenge, kein verwässerter Türsteher.
`bestaetigeEinhaengen` zeigt Option 3 (Entscheidung 04.08.2026): trägt die Datei einen
`angehoerigenCache`, erscheint vor der Bestätigung `STRINGS.einhaengenCacheHinweis` — zwei
Fakten, keine Empfehlung. Trägt sie keinen, erscheint kein Hinweis. Der Kern-Default ändert
sich nicht: die Sechs-Felder-Allowlist lässt `angehoerigenCache`/`angehoerigenOrt` weiterhin
aus — das war schon vor Zug 3 so (Gleichwertigkeits-Erhebung, Punkt 2) und ist jetzt nur nicht
mehr stillschweigend.

Sechs Proben in `tests/adr-124-huelle-umpacken-zug3.test.js`: reguläre Datei wird erkannt und
normiert · Blackbox-Weg bleibt unverändert (Regression) · eine Datei ohne beide Formen wirft
weiterhin · eine eingehängte eigenständige Datei öffnet danach byte-identisch mit ihrem eigenen
Passwort · `angehoerigenCache` fällt weiterhin (Kern-Default, Positivkontrolle mit gesetztem
Cache) · eine manipulierte `depotUUID` wird weiterhin abgewiesen (gleiche Strenge,
unverwässert).

## Zug 4 — gebaut 04.08.2026

Drei Verweise, freigegeben aus dem internen Auftrag „SubDepot – Erklärung und Schnellstart"
(Fassung 4, 03.08.2026), Zug 1 —
einschließlich `volljaehrig`, das auf Zug 2/3 gewartet hat.

**`geburt`:** Verweis auf den Sub-Depot-Knopf an der Kinder-Liste (Bereich „Meine Menschen").
**`volljaehrig`:** eigenständiger Passwort-Wechsel und eigene Datei, mit der unbequemen Hälfte —
die Kopie bei den Eltern bleibt mit dem alten Passwort lesbar. **`todesfall-uebernahme`:** neuer
Block „Ein Sub-Depot weitergeben" — zwei Wege mit unterschiedlicher Folge (Kopie exportieren,
Verwaltung bleibt bestehen; oder abgeben, unumkehrbar, Reaktivieren gesperrt). Alle drei
U2-ADR-033-konform: was geschieht, keine Empfehlung.

Neun Proben in `tests/adr124-zug4-verweise.test.js` — je Verweis der Text UND die dahinterstehende
Mechanik gegen den echten Code gehalten (Knopf existiert wirklich, Passwort-Wechsel lässt die
Eltern-Kopie nachweislich unberührt, „abgeben" löscht den Umschlag wirklich und sperrt
`subDepotReaktivieren`, „beiseitelegen" bleibt zum Vergleich reversibel).

## Konformität

```konformitaet
aussage:   Zug 2 — eine entpackte Blackbox-Hülle öffnet über den regulären Startseiten-Weg
           (`depotLaden`) mit Inhalt byte-identisch zum bisherigen Sub-Depot-Weg; kein
           Re-Encrypt, an keiner Stelle.
zustand:   prüfbar
pruefung:  tests/adr-124-huelle-umpacken-zug2.test.js#[U2-124·Zug2·2] die entpackte Datei öffnet über depotLaden — Inhalt byte-identisch zum Sub-Depot-Weg
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1). Der Paletten-Nachtrag unten
trägt seine eigene, separate Klausel.*

## Nachtrag 04.08.2026 — Konzeptseite wird zur Reise, kein neuer ADR

Die Konzeptseite aus dem texte-Zug 2 (`renderSubDepotKonzept`) wurde am 04.08. von einer
Zustandstafel (fünf Aussagen, Allein/Eingehängt/Wieder gelöst) auf eine Reise mit vier Stationen
(Anlegen · Aufbewahren · Übergeben · Allein) umgestellt, weil die Zustandsform nicht zeigte, dass
Datei und Schlüssel bei verschiedenen Personen liegen — Prüfung der gebauten Seite.
Wortlaut-Quelle: `subdepot-konzeptseite-reise-entwurf-2026-08-04.md`, Fassung 2. Die Architektur
ändert sich nicht, nur die Darstellung — kein neuer ADR. Neun Proben in
`tests/adr124-zug2-konzeptseite.test.js` (vorher sieben, keine entfallen).

## Nachtrag 04.08.2026 — Palettentausch: sechs helle Naturtöne, ein Aufnahmekriterium

Die Gleichwertigkeit dieser ADR machte die alte Sub-Depot-Farbpalette (Schiefer als Default UND
Farbe zugleich) zum gemessenen Bruch: „Fläche gegen Fläche" gegen das Anker-Chrome war nie geprüft
worden, nur Text gegen Fläche innerhalb einer Farbe. Sechs helle Naturtöne (Hafer, Ton, Altrose,
Flieder, Nebel, Kiesel) ersetzen die alte Palette vollständig; die Kopfzeile bleibt in jedem
Zustand Salbei-dunkel, nur Sidebar und Content tragen den Akzent. **Aufnahmekriterium: eine
Palettenfarbe für ein eingehängtes Depot muss mindestens 3:1 gegen das Chrome ihres Themes
erreichen und mindestens 4,5:1 für den Text, der auf ihr steht.** Geprüft von
`tests/palette-aufnahmekriterium.test.js`. Details: zwei interne
Freigabenotizen vom 04.08.2026 (Palette und Reihenfolge; Züge 5 und 6).

---

*Vivodepot GmbH · U2-ADR-124 · Entwurf 04.08.2026, angenommen 04.08.2026 (Zug 1a)*
