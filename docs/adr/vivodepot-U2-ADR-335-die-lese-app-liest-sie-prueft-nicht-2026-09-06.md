# U2-ADR-335: Die Lese-App liest, sie prüft nicht — kein „geprüft" aus einem Depot-Feld

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot-lesen.html` (`modulHerkunftStand`, `_modulHerkunftBehauptung`),
`tests/u2-adr-258-herkunft-sichtbar.test.js`,
`docs/adr/vivodepot-U2-ADR-258-…` (berichtigt)

- **Status heute:** gilt — die Lese-App leitet aus `ungeprueft`/`pruefstufe` niemals „geprüft" ab.
  Der Kern bleibt unangetastet.

---

## Der Befund

`ungeprueft` und `pruefstufe` sind **Depot-Felder**. Die Lese-App öffnet eine **Datei**, die der
Absender vollständig in der Hand hat. Gemessen am Kanon mit einem Depot, dessen Module
`ungeprueft: false` tragen:

```
geprueft=2  ungeprueft=0  unbekannt=0   ·   gilt als geprueft: TRUE

„Ein Teil dieser Angaben stammt aus eingelassenen Erweiterungen — 2 insgesamt.
 Deren Herkunft ist geprüft: sie tragen eine Unterschrift, die Vivodepot
 bestätigen konnte."
```

**Die Anwendung sagt das über eine Datei, in der nie eine Unterschrift war.** Und der Empfänger hat
kein Original, gegen das er es halten könnte.

**Die Klasse dahinter, aus der der Fall stammt** (vollständig in einer internen Erhebung vom
06.09.2026):

```
faelschbar     die Anwendung LIEST ein Feld und sagt einen Satz darueber
unfaelschbar   die Anwendung PRUEFT etwas
```

Von den vier Blöcken, in denen die Lese-App über den Zustand des Dokuments spricht, sind zwei
fälschbar (`herkunft-marke`, `stand-marke`) und zwei nicht (`vorlage-marke` prüft kryptographisch,
`klartext-warn` strukturell). **`klartext-warn` zeigt, dass es dafür keine Krypto braucht: eine
Aussage über die Form der Datei ist unfälschbar, weil die Form die Aussage ist.**

`stand-marke` bleibt unverändert — seine Wortlaute sagen nur, **was in der Datei steht**, nicht dass
es stimmt (U2-ADR-259 will dort ausdrücklich keine Vertrauens-Unterscheidung).

## Eine Zusicherung, deren Bedingung ablief

**A467 (23.08.2026) hatte das Prinzip bereits**, im Kommentar an `modulEinlassen`:

> „eine SELBSTAUSKUNFT … überlebte — **heute folgenlos, weil niemand die Marke liest**, aber eine
> Behauptung, die niemand widerlegt hat, ist keine Prüfung."

```
23.08.2026   A467         „heute folgenlos, weil niemand die Marke liest"
04.09.2026   U2-ADR-258    gibt der Marke einen Leser
```

**Die Bedingung fiel zwölf Tage später weg. Niemand hat es bemerkt, weil nichts es bemerken
konnte.** A467 war und ist richtig — der Kern setzt das Prinzip dort durch, wo er es durchsetzen
konnte. **Abgelaufen ist der Halbsatz über die Folgenlosigkeit, nicht die Entscheidung.**

Der Befund enthält die Zählung dazu: drei Stellen im Produktcode notieren eine solche Bedingung,
**zweimal von drei Malen ist sie tatsächlich gefallen** — einmal bemerkt, einmal nicht. Daraus
folgt **keine** neue Konvention: `vivodepot.html:19009` zeigt den richtigen Umgang bereits, indem
es den Mangel trotzdem behebt, „bevor er scharf wird, statt erst danach".

## Die Entscheidung — und sie ist dauerhaft

> **Die Lese-App leitet aus `ungeprueft`/`pruefstufe` niemals „geprüft" ab. Die ehrlichen Stände
> dort sind `ungeprueft` und `unbekannt`.**

**Kein Provisorium.** Auch nach dem Folge-Posten bliebe die Regel: das „geprüft" käme dann aus der
**Prüfung**, nicht aus dem Feld. Das Feld bleibt in einer fremden Datei, was es dort immer war.
**Genau wie `vorlagenMarkeHTML` es heute schon macht** — der Name des Anbieters erscheint dort
ausschließlich im geprüften Zustand.

**`unbekannt` bleibt `unbekannt`.** Die Abwesenheit einer Angabe ist etwas anderes als eine Angabe,
der nicht zu trauen ist (U2-ADR-258, „Die Semantik der Abwesenheit").

**Der Kern bleibt unangetastet.** Dort ist `ungeprueft: false` belastbar: er hat es selbst gesetzt,
im eigenen Prozess, nach echter Signaturprüfung — und der Kommentar an jener Stelle nennt den
Grund, warum der signierte Zweig es heben muss („sonst hätte der ganze Zertifikatsbetrieb für die
Anzeige nichts bewirkt").

**Kein Informationsverlust, sondern eine fehlende Funktion:** die Lese-App kann heute nicht prüfen,
weil kein Beleg mitreist. **Das ist die Lücke — nicht die Zeile, die sie ehrlich benennt.**

## U2-ADR-258 wird berichtigt, nicht historisiert

258 verlangte, dass beide Fassungen von `modulHerkunftStand` **gleich** urteilen. **Richtig, solange
beide dasselbe taten; falsch, sobald einer von beiden etwas weiß, was der andere nicht wissen
kann.** Der Absatz „Der Spiegel und seine eine Bruchstelle" trägt die Berichtigung an Ort und
Stelle.

**Die Probe ist umgedreht, nicht gelöscht — und als ORDNUNG gefasst, nicht als Tabelle:**

```
verlangt:  die Lese-App urteilt NIE MILDER als der Kern
           (unbekannt < ungeprueft < geprueft)
```

**Eine Tabelle („Kern geprüft → Lesen ungeprüft") schriebe die heutige Abwesenheit des Belegs
fest** und würde rot, sobald der Folge-Posten landet und der Empfänger wieder prüfen kann. **Die
Ordnung trägt beides.** Sie hat eine Ausbeute-Zusicherung: die Fallmenge muss mindestens einen Fall
enthalten, den der **Kern** als `geprueft` führt — sonst prüfte sie nichts.

**Dass die Lese-App heute zu keinem Modul `geprueft` sagt, ist eine ZWEITE, eigene Probe** — mit
eigener Lebensdauer. **Sie darf fallen, wenn der Beleg mitreist, und ihr Fallen ist dann ein
Ereignis und kein Rätsel.**

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Die Lese-App leitet aus `ungeprueft`/`pruefstufe` niemals „geprüft" ab; ein Depot, dessen
      Module `ungeprueft: false` behaupten, lässt die Herkunftszeile nicht „geprüft" sagen.
    zustand: erfuellt
    herkunft: U2-ADR-335 (06.09.2026), am Kanon gemessen vor und nach dem Bau
    pruefung:
      - tests/u2-adr-258-herkunft-sichtbar.test.js
        "[U2-ADR-335] die Lese-App sagt HEUTE zu keinem Modul `geprueft` — sie kann nichts prüfen"

  - aussage: >-
      Die Lese-App urteilt über die Herkunft eines Moduls nie milder als der Kern; die Fallmenge
      der Probe enthält mindestens einen Fall, den der Kern als geprüft führt.
    zustand: erfuellt
    herkunft: U2-ADR-335 (06.09.2026), enger gefasste Zusicherung aus U2-ADR-258
    pruefung:
      - tests/u2-adr-258-herkunft-sichtbar.test.js
        "[258·Ordnung] die Lese-App urteilt nie milder als der Kern"

  - aussage: >-
      `unbekannt` bleibt `unbekannt` — die Abwesenheit einer Angabe wird nicht zu einer Angabe,
      der nicht zu trauen ist.
    zustand: erfuellt
    herkunft: U2-ADR-335 (06.09.2026) auf U2-ADR-258
    pruefung:
      - tests/u2-adr-258-herkunft-sichtbar.test.js
        "[258·Ordnung] die Lese-App urteilt nie milder als der Kern"

  - aussage: >-
      Der Kern urteilt unverändert; seine Fassung darf `geprueft` sagen, weil er selbst geprüft hat.
    zustand: erfuellt
    herkunft: U2-ADR-335 (06.09.2026)
    pruefung:
      - tests/u2-adr-258-herkunft-sichtbar.test.js
        "[258·Stand] ein signiertes Modul mit anerkannter Kette heißt „geprueft""
```

## Der Folge-Posten: der Beleg muss im Depot bleiben

**Gemessen:** `modulEinlassenGeprueft` verifiziert die Kette und reicht dann die Nutzlast weiter —
**kein JWS überlebt ins Depot** (null Vorkommen in der Funktion). Ein Empfänger kann ein Modul mit
dem, was in der Datei steht, nicht nachprüfen.

**Das Muster existiert nebenan und ist bewiesen:** `importierteVorlagen.beleg.providerCredentialJws`
reist mit, `verifiziereTemplateKette` prüft beim Empfänger, der Name erscheint nur im geprüften
Zustand. **Eigener Zug; er hängt an der DoD („provisioniert, signierfertig"). Danach kommt
„geprüft" zurück — verdient statt behauptet.**

## Was dieser Zug nicht tut

- **`stand-marke` bleibt.** Gemessen, nicht vorsorglich mitgeändert.
- **Der Kern ist nicht vermessen.** Ein Einzelfall dort ist bekannt (`modulKarteHerkunft`, von
  `df` gefunden und in U2-ADR-332 repariert) — **ein Einzelfall ist kein Bestand.** Eine
  systematische Kern-Messung bräuchte zuerst einen Anker, der aus **seinem** Bau folgt: der Anker
  dieser Erhebung überträgt sich nicht (der Kern kennt die Warn-Variablen nicht, seine
  Marker-Klassen markieren Felder).
- **Zustands-Sätze außerhalb der vier Klassen** sind nicht erhoben; die Grenze steht im Kopf des
  Erhebers.
