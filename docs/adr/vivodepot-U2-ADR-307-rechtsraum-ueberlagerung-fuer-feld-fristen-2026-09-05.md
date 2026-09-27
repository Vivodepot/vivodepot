# U2-ADR-307: Die Rechtsraum-Überlagerung für Feld-Fristen — und die drei Regeln, die mein eigener Schnitt nie besucht hat

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Betrifft:** `vivodepot.html` (`RECHTSRAUM_FRIST_UEBERLAGERUNG`,
`rechtsraumFristUeberlagerungSetzen`, `_rechtsraumFristRegel`, `_fristHinweisFuerFeld`),
`tools/buergermodul-schnitt.js`, `tests/rechtsraum-frist-ueberlagerung.test.js`,
`tests/buergermodul-schnitt.test.js`

- **Status heute:** gilt — die Überlagerung ist gebaut, der Slot ist leer, und der Leerfall ist
  als byte-identisch zum heutigen Stand belegt. Das Rechtsraum-Modul selbst entsteht in einem
  eigenen Zug. Ein zweiter Rechtsraum (IT, UK) ist der eigentliche Prüfstein und wird hier
  **nicht** behauptet.

---

## Der Fund, der wichtiger ist als der Bau

Der Auftrag lautete, für die Rechtsraum-Achse den A/B-Beweis zu bauen — mit meinem eigenen
Bündel aus U2-ADR-291 als B-Seite: drei Felder, 577 Bytes.

**Gemessen trägt der Bestand sechs Rechtsregeln, nicht drei:**

```
SEKTOREN       3    gueltigkeitVorschlag reisepass · § 84 Abs. 1 SGG · § 4 Satz 1 KSchG
SITUATIONEN    3    § 198 Abs. 1 VVG · § 28 PStG · § 1944 BGB
WIZARDS        0
VOLLMACHT_BMJ  0
ANLAESSE       0
```

**Mein Schnitt lief nur über `SEKTOREN`.** Die drei Situations-Regeln hat er nie gesehen —
darunter **§ 1944 BGB, die Erbausschlagungsfrist von sechs Wochen.**

**Und am Bündel war das nicht zu sehen:** `vd-de-rechtsraum.json` sah vollständig aus, weil
nichts darin fehlte, das es kannte. **Ein Bündel kann nicht melden, was sein Erzeuger nie
besucht hat.**

Die Folge wäre konkret gewesen: in einem italienischen Rechtsraum bliebe die deutsche
Sechs-Wochen-Frist stehen. **Eine falsche Frist ist schlimmer als eine fehlende — die Bürgerin
verlässt sich darauf.**

### Die Probe dagegen läuft den Bestand ab, nicht die Landkarte des Werkzeugs

`[Schnitt·Recht·RATSCHE]` durchsucht **generisch jeden exportierten Katalog** nach
Rechts-Eigenschaften, ohne zu wissen, wo sie stehen dürfen — und hält dagegen, was der Schnitt
gefunden hat. Die Positivkontrolle setzt eine Regel an einem Ort ein, den der Schnitt **nicht**
abläuft (ein Wizard-Schritt), und prüft, dass die Ratsche sie sieht.

**Ein Wächter, der dieselbe Landkarte benutzt wie das Werkzeug, das er bewacht, bewacht nichts.**

## Es gab keinen eigenen Rechtsraum-Weg — und das ist die Bauart, kein Mangel

```
_fristHinweisFuerFeld(feldOderId, …)   las `feldOderId.fristRegel`
```

Der Kommentar dort sagt es wörtlich: „Nimmt die FELDDEFINITION — dann gilt die deklarative
Regel, gleich ob eingebaut oder angedockt." **Ein Feld bringt seine Frist mit. Wer das Feld
trägt, trägt die Frist.**

`rechtsraumModule` ist etwas **anderes**: `_RECHTSRAUM_MODUL_SCHLUESSEL` führt `typen` — den
Vorsorge-Instrumentenkatalog, nicht Feld-Fristen. Die beiden teilen nur den Namen.

**Folge: ein A/B-Beweis war nicht baubar, weil kein Weg die B-Seite lädt.** Mein eigenes Bündel
hatte keinen Verbraucher — derselbe Zustand, den ich bei `buergermodulSektorErsetzen` gefunden
hatte, diesmal von mir selbst erzeugt.

## Die Entscheidung

Eine **additive Überlagerung** vor der Feldregel:

```js
let RECHTSRAUM_FRIST_UEBERLAGERUNG = null;          // Slot, leer bis zum eigenen Zug
function rechtsraumFristUeberlagerungSetzen(modul)  // der EINZIGE Schreiber
function _rechtsraumFristRegel(kennung)             // Regel oder null
_fristHinweisFuerFeld(feld, …, heute, kennung)      // kennung optional
```

**Ohne geladenes Modul gilt die Feldregel unverändert, Byte für Byte wie heute.** Der Slot ist
`null`, `_rechtsraumFristRegel` liefert `null`, und der Weg ist derselbe wie zuvor. Eine eigene
Probe hält genau das fest, indem sie den Aufruf **mit** und **ohne** Kennung vergleicht.

**Die Regel läuft durch denselben Prüfer wie eine eingebaute** (`feldFristRegelPruefen`): ein
Modul mit einem Tippfehler in der Dauer wird verworfen und lässt den eingebauten Stand stehen.

**Ein ungültiges Modul setzt zurück**, statt einen halben Stand weiterwirken zu lassen — sonst
sähe niemand, welcher gilt.

### Zwei Kennungsformen, nicht eine

```
<sektorId>.<feldId>            renderSektor · feldgruppenKarteHTML
situation:<sitId>.<feldId>     renderSituation — eigener Kennungsraum
```

Alle drei Aufrufstellen tragen ihre Kennung bei: `renderSektor` und `feldgruppenKarteHTML`
haben `sektorId` im Zugriff, `renderSituation` hat `sitId`.

**Eine Form allein über `feldId` fällt aus, und der Beleg ist gemessen:** unter den 182
UnterFeldern sind **17 IDs doppelt vergeben** — `system`, `nr`, `gueltig`, `ort`, `person`,
`art`, `aktenzeichen`, `anmerkung`, `ausgestellt`, `behoerde`, `name`, `betrag`, `richtung`,
`notiz`, `typ`, `datum`, `gueltig_bis`. `art` allein träfe die Unterhaltsarten **und** die
Kontoarten. Dieselbe Mehrdeutigkeit, an der `feld.art.vorschlaege` schon gescheitert ist
(U2-ADR-291).

Die Situations-Form ist mit der Sitzung abgestimmt, die den Situations-Ladeweg baut, und sie ist
**nicht erfunden**: der Textsatz führt sie bereits im Bestand (`situation:erbfall.…`).

### Warum `let` und ein Setzer

Nach dem Vorbild von `_RECHTSRAUM_GERUEST_REGISTRY` (U2-ADR-285): ein Modul-Registerstand muss
gesetzt werden können, und der Weg dorthin ist eine **eng benannte Funktion im Gerüst**, kein
Feld in einem Modul. Ein fremdes Modul erreicht sie nie — es gibt keinen eval-Pfad, und der
Einlassweg ruft sie nicht.

## Was ausdrücklich NICHT dazugehört

**Das Rechtsraum-Modul selbst.** Der Slot ist `null`. Der A/B-Beweis, den der Auftrag verlangte,
ist damit **vorbereitet, nicht erbracht** — er braucht die B-Seite, und die entsteht in einem
eigenen Zug.

**Ein zweiter Rechtsraum.** IT oder UK sind der eigentliche Prüfstein. Was hier bewiesen ist:
der Mechanismus greift, der Leerfall ist unverändert, ein Tippfehler wird verworfen. Nicht
bewiesen: dass ein echter fremder Rechtsraum vollständig abbildbar ist.

**`gueltigkeitVorschlag`.** Er steht im Rechtsraum-Anteil des Schnitts, wird aber von
`_fristHinweisFuerFeld` über einen **eigenen, älteren Weg** gelesen (ein hartkodierter
`case 'reisepass_gueltig'`). Die Überlagerung greift dort **nicht**. Benannt, nicht behoben —
eigener Gegenstand.
