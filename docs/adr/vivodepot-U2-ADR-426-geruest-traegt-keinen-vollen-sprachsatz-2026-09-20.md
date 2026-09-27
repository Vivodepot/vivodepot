# U2-ADR-426: Das Gerüst trägt keinen vollen Sprachsatz — Englisch kommt als Modul

**Status:** Angenommen — gebaut
**Datum:** 20.09.2026
**Kategorie:** SPRACHE, GERÜST
**Linie:** U2
**U2-Bezug:** U2-ADR-416 (Entscheidung 5 wird abgelöst) · U2-ADR-363 (Gerüst sprachagnostisch) ·
U2-ADR-423 (Rückfall Modulsprache, Englisch, Deutsch)
**Anker:** Gerüst-Definition: Gerüst + Modul (+ Template) = Produkt; das Gerüst enthält keine Inhalte.
**Status heute:** gilt — gebaut und belegt, s. Konformität.

---

## Kontext

U2-ADR-416 Entscheidung 5 ließ jeden Kern den vollen englischen Ab-Werk-Satz tragen, rund 370 KB, damit
eine englische Datei in einem deutschen Produkt für jeden neuen Text eine Quelle derselben Sprache hat.
Gemessen am 20.09.2026 an den vier gebauten Produkten: das englische Produkt trägt sein Sprachmodul
(3787 Kennungen) und die Saat (2805 Kennungen) — sie ist nicht nur doppelt, sondern ärmer als das
Modul, das sie ersetzt. In den deutschen Produkten war sie ungenutzter Inhalt.

Die Prämisse der Entscheidung — „ohne englische Saat hat eine englische Datei keine Quelle derselben
Sprache" — gilt mit der Gerüst-Definition nicht mehr: ein Produkt ist Gerüst plus Modul, und die Sprache
eines Produkts ist ein Modul.

## Entscheidung

1. **Das Gerüst und die deutschen Produkte tragen keinen vollen englischen Satz.** `AB_WERK_TEXTSATZ_EN`
   und die Region samt Eintrag in `_textsatzAbWerkRegistrySeed` entfallen. Für die Lese-App gilt dasselbe seit dem
   21.09.2026: ihre Region `AB_WERK_TEXTSATZ_EN` steht als Leerform (`null`), der Erzeuger für diese
   Region ist entfernt. Englisch kommt dort aus der Datei
   (`abWerkMitschrift.sprache`, `textsatzModule`); die Oberflächentexte der Lese-App selbst stehen in
   `LESE_TEXTE_EN` und `ZUSICHERUNG_TEXTE_EN`. Ein englisches Depot ohne `abWerkMitschrift.sprache` (Dateien von vor
   dem 08.09.2026) zeigt Bereichsnamen und Einführungen deutsch.
2. **Englisch steht im Gerüst nirgends.** Ein englisches Produkt trägt es als Sprachmodul in `AB_WERK_SPRACHE_PRODUKT`; ein deutsches Produkt
   trägt die 26 Texte des „English“-Knopfs auf dem Schirm vor dem Depot als Sprachangebot in `AB_WERK_SPRACHANGEBOT_QUELLEN` (U2-ADR-428).
3. **Deutsch bleibt bis zum Schnitt „Deutsch als Modul“ eingebacken** (`AB_WERK_TEXTSATZ_DE`).
4. **Vertrauen:** `{ vertrauenswuerdig: true }` gilt für drei gebackene Module statt vier.

## Folgen — ausgeschrieben, nicht hergeleitet

- **Bis zum Schnitt „Deutsch als Modul“ fallen nicht-deutsche Module auf Deutsch zurück, nicht auf
  Englisch.** Ein griechisches Produkt, dessen Modul 2500 von 2796 Kennungen deckt, zeigte die übrigen
  bisher auf Englisch, jetzt auf Deutsch. Kein Text fehlt; die Sprache ist die falsche. Ein
  Zusicherungssatz trägt die Ersatzsprache sichtbar mit („[Deutsch]“), für andere Lücken steht der
  Hinweis „Sprachfassung unvollständig“. Zeitlich begrenzt.
- **Nach dem Schnitt „Deutsch als Modul“ gibt es keinen Rückfall mehr: eine ungedeckte Kennung ist leer,
  bisher war sie englisch, jetzt deutsch.** Das ist die gewollte Folge eines leeren Gerüsts, aber ein
  Wechsel des Versagensmodus. Wer später eine leere Beschriftung sieht, sucht hier und nicht einen Fehler.
- **Eine Datei trägt den Sprachstand ihres Produkts.** In der Lese-App zeigt eine neuere Fassung einen Text, der erst nach dem
  Anlegen der Datei in den Kern kam, deutsch: der deutsche Name der Struktur bleibt stehen (gemessen an einer englischen Datei ohne
  `abWerkMitschrift.sprache`, 21.09.2026; für eine Datei mit einem älteren Sprach-Eintrag nicht gemessen). Der Versagensmodus
  unterscheidet sich damit vom Kern, wo eine ungedeckte Kennung leer bleibt (s. o.). Das ist eine dauerhafte Eigenschaft des
  Modells „Struktur und Sprache reisen in der Datei“ und keine Nebenwirkung des Schnitts der Lese-App; sie trifft eine Person, die
  eine alte Datei in einer neueren Anwendung öffnet.
- Eine alte englische Modul-App-Datei, in einem deutschen Produkt geöffnet, zeigt für einen Text, den ihr
  Modul nicht trägt, Deutsch.
- Der deutsche `noscript`-Satz steht weiter im Gerüst, außerhalb jedes Skriptblocks; er geht in den
  Schnitt „Deutsch als Modul“.
- Das Vor-Depot-Sprachangebot (26 Texte, 2,3 KB) steht seit U2-ADR-428 nicht mehr im Gerüst, sondern als Moduldatei im Rezept des deutschen Produkts. Der Knopf bleibt im Gerüst und erscheint nur, wo das Produkt eine zweite Sprache trägt.

## Versagensmodus an einer Vertrauensgrenze

Ein nicht verifiziertes Modul aus einer Depot-Datei setzt die Beschriftung der eingebauten Bereiche
nicht (U2-ADR-331); `_eingebauteBereichsBeschriftungVerwerfen` setzt stattdessen den Wert des bestehenden
Fachs wieder ein. Dieser Wert war bisher der englische aus der Saat. Ohne Saat gibt es ihn in einem
deutschen Produkt nicht: eine Nutzerin, die eine englische Datei mit nicht verifiziertem Modul öffnet,
sieht die Bereichsnamen und die englischen Sätze der Anwendung auf Deutsch. Das ist kein Randfall,
sondern ein Wechsel des Versagensmodus an einer Stelle, an der eine Vertrauensregel greift. Im englischen
Produkt kommen diese Werte aus dem eingebackenen Sprachmodul (es füllt das Fach direkt, vor jeder
Prüfung) und ändern sich nicht. Ein verifiziertes Modul ist nicht betroffen.

Nachsehen: `tests/en-audit-laufzeit.test.js` bootet ein Depot mit dem englischen Modul und zählt
deutsche Reste; er läuft gegen das englische Produkt. Gegen das Gerüst lief er vor der Umstellung rot:
„Identity & person“ kam als „Identität & Person“ zurück. Die Quelle der Regel steht in
`_eingebauteBereichsBeschriftungVerwerfen` in `vivodepot.html`.

## Anforderung an den Schnitt „Deutsch als Modul“

Ein Depot trägt seine Sprache, und die Bürgerin kann beim Öffnen unter den Sprachen umschalten, die in ihrer
Datei liegen (Entscheidung 20.09.2026). Solange `AB_WERK_TEXTSATZ_DE` im Gerüst steht, kann Deutsch nicht
mitreisen: es ist Inventar des Gerüsts, keine Zutat der Datei. Ein deutsches Depot, in einem fremdsprachigen
Produkt geöffnet, brächte seine Sprache also nicht mit. Der Schnitt „Deutsch als Modul“ muss darum Deutsch
als Sprachmodul in die Mitschrift der Datei legen (Fach `sprache`, wie Englisch heute) — er ist damit nicht nur
Aufräumen für die Lesbarkeit des Gerüsts, sondern Voraussetzung dafür, dass ein deutsches Depot überall lesbar
bleibt. Der heutige Ist-Zustand (die Sprache folgt dem Produkt; der Schalter vor dem Depot überlagert nur die
Schirme davor; in den Einstellungen gibt es nur das Einlesen einer Modul-Datei) ist gemessen, nicht das Soll.

Nachsehen: `tests/produkt-wechsel-en-nach-de.test.js`, die als `todo` geführten Proben.

## Was diese ADR nicht leistet

- Sie entschied die Lese-App ursprünglich nicht; das ist mit dem Nachzug vom 21.09.2026 geschehen (Punkt 1).
- Sie entscheidet nicht, wie die Vor-Depot-Teilmenge im Gerüst gelesen werden kann, wenn auch sie
  ein Modul wird.

## Konformität

```konformitaet
aussage:  Das Gerüst trägt keinen vollen englischen Satz; die englischen Produkte zeigen Englisch aus ihrem Sprachmodul, die deutschen bleiben deutsch.
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-en-ueberall.test.js#[EN·Gerüst] das Gerüst trägt keinen vollen englischen Satz — weder als Konstante noch als Region
pruefung: tests/textsatz-en-ueberall.test.js#[EN·DE-Produkt] ohne Datei bleibt ein deutsches Produkt deutsch
```

---

*Vivodepot GmbH · Berlin · 20.09.2026*
