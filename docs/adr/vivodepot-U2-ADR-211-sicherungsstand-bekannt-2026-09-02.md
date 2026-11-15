# U2-ADR-211: Sicherungsstand bekannt — persistiert statt Arbeitsspeicher-Variable

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** ARCHITEKTUR, PERSISTENZ
**Linie:** U2
**U2-Bezug:** U2-ADR-031 (Persistenz ehrlich — führte `exportErinnerung`/`exportErinnerungRisiko`
und die 14-Tage-Schwelle ein) · U2-ADR-015 (interner verschlüsselter Arbeitsstand — Etappe 4/5,
`persist()`/Eviction-Härtung, derselbe `exportErinnerungModell()`). Diese Entscheidung ändert NUR,
WORAN der Sicherungsstand hängt (Datenfeld statt Arbeitsspeicher-Variable) und WAS angezeigt wird
(ein Zustand statt einer Frist) — die 14-Tage-Schwelle und die Fälligkeits-Logik aus U2-ADR-031
gelten unverändert weiter.
**Anker:** Zug-0-Messung „Interner Speicher als Zuhause" (02.09.2026, Dritter Nachtrag) — gemessen:
die App weiß heute NICHT, ob ein echter Datei-Backup vorliegt, sie zählt nur einen
Arbeitsspeicher-Timer herunter, der bei jeder neuen Sitzung wieder bei null beginnt. Mehrfach
wiederholt diese Nacht: „Wir müssen SICHER SEIN, dass die Nutzerin speichert und ihre Daten
behält! SICHER!"
**Status heute:** gilt — Beleg `tests/sicherungsstand-bekannt.test.js`.

---

## Kontext

Die 14-Tage-Erinnerung an eine Datei-Sicherung (U2-ADR-031) hing an einer einzigen Zeile:
`var _letzteSicherungskopieISO = null;` — eine reine Arbeitsspeicher-Variable, gesetzt beim
Herunterladen einer Datei, gelesen von `exportErinnerungModell()`. Bei jedem neuen Tab, jedem
Neuladen, jedem Gerätewechsel begann sie wieder bei `null`. `exportErinnerungModell()` konnte
damit eine Bürgerin, die gestern gesichert hatte, nicht von einer unterscheiden, die es nie getan
hatte — die Erinnerung war faktisch „einmal pro Sitzung fällig", kein echter Datei-Stand.

Das war kein isolierter Fund. Er fiel am Ende einer Kette von Messungen derselben Nacht: ob
`showSaveFilePicker`-Handles same-file-overwrite erlauben, ob OPFS/`persist()` das Depot vor
Räumung schützt, ob iOS-Installation den Schutz ändert — jede dieser Fragen unterstellt, dass die
App am Ende WEISS, wann zuletzt wirklich gesichert wurde. Genau das war nicht der Fall. Ein
Sicherheitsversprechen, das auf einem Timer beruht, der bei jedem Neustart genau dann auf null
fällt, wenn er am meisten gebraucht wird, ist kein Versprechen.

## Entscheidung

**1 — Der Sicherungsstand wird Teil von `data` selbst**, nicht von internem Speicher und nicht von
einer Arbeitsspeicher-Variable: `data.sicherungsStand = { letzteDateiIso, aenderungenDanach }`.
Weil er im Depot-Inhalt steht, reist er im verschlüsselten Umschlag mit — er übersteht nicht nur
ein Neuladen, sondern einen echten Gerätewechsel über die Datei selbst (der Fall, den der Auftrag
ausdrücklich verlangte: „muss einen Gerätewechsel überstehen").

**2 — `markiereAlsDateiGesichert()` setzt/erneuert das Feld** bei jeder bestätigten
Datei-Sicherung (`letzteDateiIso` = jetzt, `aenderungenDanach` = 0). `markiereUngespeichert(n)`
erhöht `aenderungenDanach` zusätzlich zum bestehenden Dirty-Zähler, wenn das Feld existiert —
additiv, kein Ersatz für den bestehenden Zähler.

**3 — Anzeige ist ein ZUSTAND, keine Frist.** Statt einer abstrakten Erinnerung „sichern Sie ab
und zu" sagt der Hinweis, sobald ein echter Stand bekannt ist: vor wie vielen Tagen zuletzt
gesichert wurde UND wie viele Änderungen seither aufgelaufen sind
(`exportErinnerungZustand`-Wortlaut, `{tage}`/`{aenderungen}`-Platzhalter). Ohne bekannten Stand
(kein Depot je gesichert, oder ein Depot von vor diesem ADR) bleibt der alte, unbedingte Hinweis
(`exportErinnerung`/`exportErinnerungRisiko`) — er trifft dort unverändert zu.

**4 — Die 14-Tage-Erinnerung UND die Depot-Liste stützen sich jetzt auf denselben echten Stand.**
`exportErinnerungModell()` liest `data.sicherungsStand` statt der toten Variable und liefert
zusätzlich `aenderungenSeither`. Die „Zuletzt gespeichert"-Zeile im Depot-Liste-Dialog
(`flowDepotListe()`) liest dieselbe Quelle statt der toten Variable — dieselbe Lücke, derselbe
Fix, an der zweiten Stelle, an der sie auftrat.

**5 — WORTLAUT ist als Entwurf markiert, nicht entschieden.** Weisung ausdrücklich:
Mechanismus bauen, den Wortlaut NICHT selbst festlegen — die endgültige Formulierung ist eine offene Entscheidung.
`exportErinnerungZustand` trägt darum denselben „WORTLAUT (Entwurf) — man darf ihn
verfeinern"-Kommentar wie andere Erst-Wortlaute dieser Nacht (Konvention aus
`shlGueltigBis`/`exportErinnerungVielleichtZeigen`).

**6 — EN-Übersetzung parallel ergänzt** (`tools/textsatz-en-vollabdeckung-daten.js`), mit
denselben zwei Platzhaltern, damit das englische Sprachmodul nicht hinter dem deutschen
Original zurückbleibt.

## Verworfene Alternative

**Sicherungsstand nur in internem Speicher (IndexedDB), nicht in `data`.** Wäre einfacher gewesen
(kein neues Feld im Depot-Inhalt, keine Krypto-Berührung) und hätte das Neuladen-Problem allein
schon gelöst. Verworfen, weil der Auftrag ausdrücklich einen Gerätewechsel nennt — interner
Speicher ist per Konstruktion an EIN Gerät gebunden (dieselbe Grenze, die die ganze
„Interner Speicher als Zuhause"-Untersuchung dieser Nacht überhaupt erst motivierte). Nur ein Feld
IN der Datei selbst überlebt den Wechsel.

## Konsequenzen

**Migration ist rein additiv.** Jedes heute bestehende Depot hat `data.sicherungsStand` nicht —
das ist erwartet, keine fehlerhafte Migration nötig. Für diese Depots ist das Verhalten bis zur
ersten Datei-Sicherung unter diesem Code identisch zum bisherigen Zustand
(`jeExportiert=false` → `faellig` folgt derselben Regel wie vorher). Erst der erste
`markiereAlsDateiGesichert()`-Aufruf unter diesem ADR beginnt, einen echten Stand aufzubauen.

**Offen:** der Wortlaut von `exportErinnerungZustand` ist ein Entwurf (Punkt 5)
— die endgültige Formulierung steht aus.

## Konformität

```konformitaet
aussage:  Der zuletzt-als-Datei-gesichert-Zeitpunkt und die Änderungen seither übersteht einen
          echten Serialisieren→Laden-Rundlauf (= neue Sitzung, neues Gerät). Mit der früheren
          Arbeitsspeicher-Variable strukturell unmöglich — sie war nie Teil von
          depotSerialisieren()s Ausgabe.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sicherungsstand-bekannt.test.js#Sicherungsstand übersteht Serialisieren→Laden
```

```konformitaet
aussage:  Ein Depot ohne data.sicherungsStand (jedes heute bestehende Depot) liefert an
          exportErinnerungModell() ein sauberes „unbekannt" (jeExportiert=false, tageHer=null,
          aenderungenSeither=null) statt eines Wurfs oder einer erfundenen Zahl.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sicherungsstand-bekannt.test.js#exportErinnerungModell() ohne sicherungsStand
```

```konformitaet
aussage:  Ein Depot ohne data.sicherungsStand bricht auch an den beiden anderen Verbrauchsstellen
          nicht — markiereUngespeichert() zählt den bestehenden Dirty-Zähler unverändert weiter,
          und die Depot-Liste lässt die „Zuletzt gespeichert"-Zeile schlicht weg, statt einen Wert
          zu erfinden.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sicherungsstand-bekannt.test.js#markiereUngespeichert() ohne sicherungsStand
pruefung: tests/sicherungsstand-bekannt.test.js#Depot-Liste: Dateiname bekannt, sicherungsStand fehlt
```

```konformitaet
aussage:  Mit bekanntem Stand ersetzt der neue Zustands-Wortlaut beide Platzhalter
          ({tage}/{aenderungen}) mit echten Zahlen; ohne Stand bleibt es bei einer der beiden
          bestehenden Fassungen, nie einem unersetzten Platzhalter.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sicherungsstand-bekannt.test.js#ersetzt der Zustands-Wortlaut BEIDE Platzhalter
pruefung: tests/sicherungsstand-bekannt.test.js#exportErinnerungVielleichtZeigen() ohne sicherungsStand
```

## Nachtrag 06.10.2026 — Schwelle auf WebKit im Tab

Auf WebKit im Tab (iPhone/iPad im Safari-Tab, Safari auf dem Mac, jeweils ohne gewährten Dauerspeicher) löscht der Browser allen
Skript-Speicher einer Seite nach sieben Tagen ohne Besuch. Die 14-Tage-Schwelle lag dort über der Räumungsfrist. Dort ist die
Erinnerung jetzt fällig, sobald seit der letzten Datei Änderungen bestehen, beim nächsten Besuch (`exportErinnerungModell`,
Feld `webkitFrist`, Einstufung `webkitTabMitFrist()`). Überall sonst bleibt die Schwelle 14 Tage. Probe:
`tests/safari-luecke.test.js`. Quellen: webkit.org/tracking-prevention („7-Day Cap on All Script-Writeable Storage“, „Home Screen Web Application Domain Exempt From ITP“); webkit.org/blog/14445 („Safari does not copy over any other kind of local storage“).

## Nachtrag 12.11.2026 — der Hinweis ohne bekannten Stand als Zustand mit Knopf

**Anlass:** Die Meldung „Ihre Datei ist nicht aktuell“ erschien direkt nach dem Anlegen und sagte der Person nicht, ob etwas zu tun ist.

**Entscheidung (12.11.2026):**
1. Der unbedingte Hinweis aus Punkt 3 bleibt: Ohne bekannten Stand ist die Erinnerung fällig, und ihr Satz ist eine der beiden
   bestehenden Fassungen (`exportErinnerung`/`exportErinnerungRisiko`), nie ein unersetzter Platzhalter.
2. Seine Form ist ein Zustand mit Knopf, an zwei Stellen:
   - im Blatt am Speicherstatus (ⓘ im Kopf): „Sicherungskopie: noch keine“, der Satz, der Knopf „Sicherungskopie erstellen“;
   - auf der Übersicht, sobald das Depot Angaben trägt, mit Schreibrecht, nicht in Vorschau oder Umschau: die Zeile
     „Sicherungskopie: noch keine“ mit demselben Knopf. Auch der Name aus dem Anlegen zählt als Angabe (`vorschauHatDaten`); die
     Zeile steht darum gleich nach dem Anlegen. Ein eigenes Merkmal dafür gibt es nicht; U2-ADR-222 bleibt unberührt.
   Beide Stellen lesen eine Bedingung, `exportErinnerungModell().ohneSicherungskopie` (fällig und nie als Datei gesichert). Der Knopf
   geht denselben Weg wie der Menüpunkt (`sicherungskopieErstellen`). Nach der Sicherungskopie verschwinden Zeile und ⓘ.
3. Die Meldung direkt nach dem Anlegen entfällt. `exportErinnerungVielleichtZeigen()` bleibt einmal je Sitzung fällig und zeichnet
   nur den Speicherstatus neu.
4. Der Satz der Risiko-Fassung ist ruhig gefasst und nennt den Sachverhalt weiter: Der Browser darf Daten auf diesem Gerät von
   sich aus löschen; eine Sicherungskopie als Datei bewahrt das Depot.

Die bestehende `pruefung:`-Zeile „exportErinnerungVielleichtZeigen() ohne sicherungsStand“ bleibt gültig; sie prüft die Fassung
ohne offenen Platzhalter und erwartet seit diesem Nachtrag keine Meldung.

```konformitaet
aussage:  Ohne bekannten Stand steht der Hinweis als Zustand mit Knopf im Blatt am Speicherstatus, nicht als Meldung nach dem Anlegen.
zustand:  geprüft
herkunft: rot-bewiesen (Kern-Kopie mit der früheren Meldung fällt durch)
pruefung: tests/meldungen-zustand-naechster-schritt.test.js#[Meldungen·1] nach dem Anlegen erscheint keine Meldung, die einen veralteten Stand behauptet
pruefung: tests/meldungen-zustand-naechster-schritt.test.js#[Meldungen·2] das ⓘ öffnet den Zustand mit dem nächsten Schritt
```

```konformitaet
aussage:  Ohne bekannten Stand steht auf der Übersicht, sobald das Depot Angaben trägt (auch der Name aus dem Anlegen), die Zeile „Sicherungskopie: noch keine“ mit Knopf, nicht im leeren Depot und nicht nach der Sicherungskopie.
zustand:  geprüft
herkunft: rot-bewiesen (Kern-Kopie ohne die Zeile fällt durch)
pruefung: tests/meldungen-zustand-naechster-schritt.test.js#[Meldungen·2b] Übersicht: im leeren Depot keine Zeile
pruefung: tests/meldungen-zustand-naechster-schritt.test.js#[Meldungen·2b] angelegt mit Namen: die Zeile steht gleich nach dem Anlegen
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
