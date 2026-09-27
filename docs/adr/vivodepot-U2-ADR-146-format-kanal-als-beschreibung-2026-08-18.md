# U2-ADR-146: Ein Format-Kanal ist eine Beschreibung, niemals Code

**Status:** Akzeptiert
**Datum:** 18.08.2026
**Kategorie:** ARCHITEKTUR, SICHERHEIT
**Grundlage:** Auftragskette Abend 17.08.2026, Glied 7 („Die Form eines Format-Kanals"),
Zug 3 des Lokalisierbarkeits-Strangs. Vormessung A272, vor dem Bau mit
`tools/formate-dreischnitt.js` neu gefahren und bestätigt.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `FORMAT_LESER`, `formatModulPruefen`,
  `formatModulZuImportKanal`, `formatModulZuExportKanal`, `formatModulEinbetten`,
  `alleImportFormate` / `alleExportFormate`, `importFormatFuerId` / `exportFormatFuerId`,
  der vierte Eintrag in `EINLASS_REGISTER`.
- **ADR-Bezug:** U2-ADR-145 (Einlassweg — dieser ADR baut KEINEN zweiten, er meldet ein
  viertes Register an), U2-ADR-051 (Registry-Anmeldemuster), U2-ADR-141 (Textsatz-Modul),
  U2-ADR-121 (Rechtsraum-Modul), U2-ADR-015/066 (CSP und `connect-src 'none'` — die
  Offline-Garantie, an der diese Entscheidung ihre harte Grenze hat).
- **Status heute:** gilt — Beleg `tests/format-modul-beschreibung.test.js` (15 Proben,
  darunter beide vom Auftrag verlangten Rot-Belege und eine Positivkontrolle am Wächter).

---

## Der Befund

**A272 hat gemessen, und der Befund war nicht „es fehlt etwas".** Streng gelesen — geteilter
Leser plus echter Erkenner plus Tabellen-Zuordnung — sind **0 von 17** Import-Kanälen
Konfiguration. Weit gelesen **4**, dazu **2 ganz ohne Erkenner**. Der Export trägt den Schnitt
besser: **6 von 11** laufen über eine Tabelle.

**Warum die enge Lesart null ergibt, ist selbst der Befund:** die Kanäle mit Tabellen-Zuordnung
haben keinen Erkenner in Datenform, die mit Erkenner keine Tabelle. **Die drei Teile sind alle
da. Sie treffen nur nirgends zusammen.**

Ohne andockbare Formate gibt es keine Lokalisierung: ein Rechtsraum, der eine eigene Sprache
und eigene Institutions-Arten mitbringen darf, aber kein eigenes Dateiformat lesen kann, ist
zur Hälfte angedockt.

## Die Entscheidung

**1 · Die drei Teile treffen sich an EINER Stelle — als Daten.** Ein Format-Modul nennt
`leser`, `erkennen` und `zuordnung` in einer Datei. Die Zuordnung ist dieselbe
`{feld, ziel}`-Tabelle, die der eingebaute Satz seit Welle 1 fährt.

**2 · Die harte Grenze: Beschreibung, niemals Code.** Kein `eval`, keine Funktion aus einer
Datei, kein Nachladen. Das ist keine Zusage, sondern eine Mechanik an drei Stellen:

> Der **Leser** wird NAMENTLICH aus einer eingebauten Tabelle GEWÄHLT (`FORMAT_LESER`), nicht
> mitgeliefert — ein unbekannter Name verwirft das Modul.
> Der **Erkenner** ist eine UND-verknüpfte Liste von Vergleichen, kein Ausdruck.
> `formatModulPruefen` läuft **den ganzen Baum** ab und verwirft jedes Modul, das irgendwo
> einen Funktionswert oder einen Schlüssel der Prototypenkette trägt.

**Warum die Baum-Prüfung gebaut ist, obwohl JSON keine Funktion tragen kann:**
`modulEinlassen` nimmt Rohtext **oder** ein bereits geparstes Objekt. Der zweite Weg ist der,
auf dem ein Funktionswert ankäme. Eine Prüfung, die nur den JSON-Weg abdeckt, deckt den
gefährlicheren nicht ab.

**3 · Ein Motor, nicht zwei.** Der eingelassene Kanal läuft durch `_ausMappingZurueck` und
`baueAusMapping` — dieselben Funktionen wie der eingebaute Satz. Ein zweiter Motor daneben
wäre eine zweite Gelegenheit, bei `sensibel`, bei `rueck` oder bei `_wertAusText` verschieden
falsch zu liegen. **Damit erbt ein angedockter Kanal die Sensibel-Prüfung, ohne sie zu kennen.**

**4 · Verschachtelung liest der Pfad, nicht der Code.** `ziel` darf ein Punktpfad sein
(`address.street_address`); `quelle` benennt den Umschlag (`claims`, `datensatz`,
`learningAchievements`). `__proto__`, `constructor` und `prototype` sind in jedem Pfad
ausgeschlossen — ein Pfad liest Daten, er läuft die Kette nicht hoch.

**5 · Ein Kanal OHNE Erkenner ist zulässig und beansprucht keine Datei.** Das beschreibt genau
die zwei Fälle aus A272, die von Hand gewählt werden (`xoev-verwaltung`, `fim-json`). **Ein
Erkenner, von dem nichts übrig bleibt, ist dagegen ein kaputter, kein fehlender** — sonst sähe
ein fehlerhaftes Modul aus wie ein bewusst handgewähltes.

**6 · Reservierte Kennungen bleiben reserviert, in BEIDEN Richtungen.** Der eingebaute Satz ist
nicht überschreibbar. Sonst hinge es an der Reihenfolge zweier Listen, welcher `json`-Kanal ein
Depot wiederherstellt.

**7 · Ein Modul erfindet kein Feld und keinen Bereich.** Eine Zuordnungszeile auf ein Feld, das
es im Bereich nicht gibt, wird **namentlich ausgewiesen und verworfen** — die übrigen Zeilen
tragen weiter. Ein unbekannter Bereich verwirft das ganze Modul.

**8 · Kein vierter Einlassweg.** Das Format-Register meldet sich in `EINLASS_REGISTER` an und
fährt `modulEinlassen` wie die drei anderen. Genau das ist die Zusage aus U2-ADR-145 Punkt 1,
hier zum ersten Mal eingelöst statt behauptet.

## Die Abbruchbedingung — geprüft, trifft nicht zu

Der Auftrag nennt einen einzigen echten Abbruchgrund: *„Lässt sich keine tragfähige Form ohne
ausführbaren Code bauen: anhalten, melden, nächstes Glied."*

**Sie lässt sich bauen, und das ist gemessen, nicht behauptet.** Die Probe
„die Form drückt `sd-jwt-vc-identitaet` verlustfrei aus" vergleicht den Feld-Plan eines
beschriebenen Kanals **Feld für Feld gegen den eingebauten** — dreizehn Felder, elf aus der
Tabelle und zwei aus der verschachtelten Adresse, gleiche Reihenfolge, gleiche Werte.
Dasselbe für `xoev-verwaltung` (ohne Erkenner) und den zweibedingten EDCI-Erkenner.

## Die Grenzen — benannt, nicht als Mangel gezählt

**Wo ein eigener Parser zwingend bleibt, ist das die Grenze zwischen Werkzeug und Plattform.**
FHIR-IPS (ein Bündel mit Ressourcen-Graph), CAMT.053 und XMeld (XML mit Namensräumen), ELSTER
und `vivodepot-beta` (eigene Struktur-Logik), `provider-credential` (Kryptographie),
`edci-europass-extern` (unterscheidet signierte von unsignierten Nachweisen strukturell),
`fhir-lab` (legt verbatim ab und mappt bewusst kein Feld), `vcard-menschen` (erzeugt
Listen**einträge**, keine Feldwerte). Die Einzelbegründung je Kanal steht in der Registerzeile A298.

**Auf der Exportseite ist ein verschachteltes `ziel` die Grenze** — `baueAusMapping` schreibt in
eine flache Claim-Ebene; ein Punkt im Ziel würde dort ein Schlüssel mit Punkt statt einer
Verschachtelung. Der Umschlag ist `quelle`. Die Zeile wird ausgewiesen, nicht geraten.

## Was das für die Bürgerin heißt

**Nichts, solange sie kein Modul einlässt** — die eingebauten Kanäle sind unverändert und
stehen zuerst in jeder Liste. Lässt sie eines ein, steht es im Abschnitt „Eingelassene
Erweiterungen" mit derselben Marke wie jedes andere: *ich habe es selbst hineingelassen.*
**Ein eingelassener Kanal zertifiziert niemanden.** Die Signatur-Architektur (U2-ADR-040)
bleibt unberührt.

---

## Nachtrag (07.09.2026) — drei Fälle derselben Ursache, eine Prüffrage

**Auftrag**, nach der Landung von U2-ADR-348: In der Nacht waren drei Bau-Stellen
als dieselbe Klasse benannt worden — „ein JSON-Bündel trägt Werte, keine Beziehungen" — mit der Frage, ob
sie sich zusammenlegen lassen. **Gemessen: nein.** Drei echt verschiedene Zeitverhalten, keine
drei Stile derselben Mechanik — ein Zusammenzug bräuchte intern trotzdem drei Pfade und würde die
Unterscheidung nur verschieben, nicht auflösen (voller Bericht, gegengeprüft mit den beiden
Sitzungen, die Fall 2 und Fall 3 gebaut haben, außerhalb dieses ADR).

**Die Prüffrage, wörtlich fortgesetzt aus dem Befund oben** („ist eine Funktion ein NAME oder
echte Logik?") **— jetzt für den ganzen Fund, nicht nur Fall 1:**

> **Trifft ein Bau auf „JSON trägt das nicht": drei Fragen, in dieser Reihenfolge.**
>
> **1 · Ist es eine benannte Wahl aus einer festen Menge?** → Tabelle im Gerüst, einmal
> zugewiesen, danach starr — nie erneut berechnet. Beispiel im Bestand: `DOKUMENT_MODUL_
> MOTOREN_ERLAUBT` + die sieben `_DOKUMENT_MODUL_*_MOTOREN`-Tabellen (dieser ADR, U2-ADR-146,
> auf die vier Dokumentmodule erweitert in U2-ADR-345) — ein Motorname wird EINMAL bei der
> Materialisierung zur echten Funktion aufgelöst, ein unbekannter Name wirft.
>
> **2 · Muss der Wert nach der Materialisierung noch auf sich ändernden Bestand reagieren?** →
> Getter, läuft bei JEDEM Zugriff neu, trägt keinen Zustand. Beispiel im Bestand:
> `Object.defineProperty(feld, 'optionen', { get() {...} })` für Wizard-Katalogfelder
> (U2-ADR-346 §5) — ein Bereich, der erst NACH dem Boot andockt, muss den Assistenten trotzdem
> erreichen (U2-ADR-304); als Schnappschuss statt Getter gebaut, verlor `heirwiz.familienstand`
> real seine Andock-Toleranz.
>
> **3 · Hält irgendein bereits ausgewerteter Code eine Referenz auf das Objekt, das gerade
> ersetzt wird?** → In-Place-Mutation, EINMAL beim Materialisierungslauf, danach starr bis zum
> nächsten Lauf — kein Getter, keine Neuberechnung bei Lesezugriffen. Zwei Techniken je nach
> Container: `Object.freeze`-gesperrt → Splice (`PV_BMJ.steps.splice(0, …, ...neueSteps)`,
> Zuweisung wäre ein `TypeError`); ungefroren → gewöhnliche Neuzuweisung. Beispiel im Bestand:
> `PV_BMJ.steps`/`pvwiz.schritte` (U2-ADR-344 §3, U2-ADR-292 §7) — `PV_MODUL.bezugFuer` hält eine
> Referenz auf `PV_BMJ.steps`, gezogen vor der Materialisierung; ohne In-Place-Mutation sähe sie
> weiter den alten Inhalt.

**Die drei Antworten sind nicht austauschbar** — Fall 1 als Getter gebaut wäre unnötige Last ohne
Nutzen und höhlte die Sicherheitsprüfung (einmal statt bei jedem Zugriff) auf; Fall 2 als
einmalige Mutation ist der reale `heirwiz`-Vorfall oben; Fall 3 als Getter wäre unnötig teuer, wo
eine stabile Referenz reicht. **Die Frage entscheidet, welcher der drei gebaut wird — sie ersetzt
keinen der drei.**

**Eine Zählfrage, benannt statt aufgelöst:** der Nachtstand vom 06./07.09.2026 spricht von „vier
Erscheinungen", drei sind hier benannt. Einordnung: die Vier war eine Zählung mit einer anderen
Grenze, nicht ein vierter Fall — plausibel, weil sowohl Fall 3 (zwei Techniken, Splice/Zuweisung)
als auch Fall 2 (zwei Instanzen, Situationen/Wizards) sich einzeln zählen ließen, ohne die drei Antworten
oben zu ändern. Keine der beiden Lesarten fügt eine VIERTE Antwort hinzu — sie zählt eine der drei
feiner.
