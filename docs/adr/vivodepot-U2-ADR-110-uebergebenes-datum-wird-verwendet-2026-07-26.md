# U2-ADR-110: Ein übergebenes Datum wird auch verwendet — keine Realm-Prüfung

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** PRÜF-ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-109 (der Fund) · U2-ADR-023 (abgeleitete Werte) · operating-manual §3.5b
**Anker:** Nachmessung am `instanceof Date`-Fund, 26.07.2026
**Status heute:** gilt — Beleg `tests/datum-wird-verwendet.test.js`.

---

## Kontext

Beim Bau von U2-ADR-109 fiel `notvertretungAblaufText` über `heute instanceof Date`. Der Fund war
richtig, seine **Reichweite in der ADR aber überzeichnet** — und der schwerere Zwilling blieb stehen.

### Die Reichweite, nachgemessen

| | |
|---|---|
| App-seitige Aufrufe mit Datum | **null** — `renderSektor` übergibt gar keins |
| Realms im Browser | **einer** — `instanceof` stimmt dort |
| betroffen ist also | **das Test-Harness**, nicht die Bürgerin |

Die U2-ADR-109-Formulierung („hätte jeden Eintrag als abgelaufen gemeldet") sagte mehr, als gemessen
war. Sie ist entschärft. **Dieselbe Klasse wie „That validates" beim `dataAbsentReason`-Deliverable:
ein Satz, der plausibel klingt und nicht belegt ist.**

### Der Zwilling, und warum er schwerer wiegt

`_heuteTeile` trug exakt dasselbe Muster — und daran hängt die **Altersrechnung**
(`personAlter` → `minderjaehrigkeit`), also der Weg zu `minderjaehrig`.

**Die Folge ist nicht eine falsche Anzeige, sondern etwas Unangenehmeres:** ein Test, der ein festes
Datum übergibt, um eine Volljährigkeits-Grenze zu prüfen, misst gegen das **echte Heute** — und
**besteht aus dem falschen Grund**. Nicht rot, **grün**. Das ist die Vakuum-Grün-Form; sie fällt
nicht auf.

Gemessen: `minderjaehrigkeit({geburtsjahr:'2010'}, new Date('2040-01-01'))` und dieselbe Person mit
`new Date('2015-01-01')` lieferten **dasselbe** Ergebnis — das Datum wurde vollständig ignoriert.

**Die bestehenden Tests entgingen dem nur durch Glück:** sie übergeben **Strings**
(`'2026-06-23'`), und dafür gibt es einen eigenen Zweig, der korrekt arbeitet. Keine Absicht, kein
Verdienst — hätte jemand ein `Date` übergeben, wäre der Test grün geblieben und hätte nichts
gemessen.

## Entscheidung

**Entenprobe statt Realm-Prüfung**, an beiden Stellen:

```js
const d = (heute && typeof heute.getTime === 'function' && !isNaN(heute.getTime())) ? heute : new Date();
```

Dieselbe Form, die `fhirIpsBundle` schon benutzt. Der **Rückfall bleibt** — ohne Datum ist „heute"
das gewollte Verhalten, genau so ruft die App es auf.

**Und die Umstellung wird gepinnt.** Eine Umstellung ohne Probe wäre selbst unbelegt: `U2-ADR-110`
prüft, dass ein übergebenes Datum in **beiden** Formen (String und `Date`) ankommt, und dass früh und
spät **verschiedene** Antworten geben. Ein Einstieg, der beide gleich beantwortet, ignoriert das
Datum — und fällt auf.

## Konsequenzen

**Die Kontrolle brauchte zwei Anläufe, und beide Fehler sind lehrreich.**

Der **erste** definierte die alte Form im **node**-Realm und prüfte sie gegen ein node-`Date` — dort
stimmt `instanceof` ja. Die Kontrolle maß ihre eigene Umgebung, nicht den Fehler, und war grün.
**Eine Kontrolle, die den fehlerhaften Zustand nicht wirklich herstellt, ist grün und wertlos.**

Der **zweite** stellte die Realm-Grenze mit `node:vm` nach — korrekt, aber überflüssiges Gerüst:
**die Grenze ist im Harness ohnehin real.** Die schlichtere Form ist zugleich die stärkere:

```js
const teile = V._heuteTeile(new Date('2040-05-01'));
assert.equal(teile.y, 2040);
```

Das `Date` entsteht im äußeren Realm, die Prüfung läuft **im Kern**. Mit Entenprobe kommt 2040
zurück, mit `instanceof Date` das laufende Jahr. **Die Probe ist damit ihre eigene
Negativkontrolle** — sie unterscheidet die beiden Implementierungen ohne jedes Zutun.

Ungemessen: ob es außerhalb von `_heuteTeile` und `notvertretungAblaufText` weitere
`instanceof`-Prüfungen auf realm-fremde Objekte gibt. Gemessen wurden die beiden Datums-Einstiege.

## Konformität

```konformitaet
aussage:  Ein übergebenes „heute" wird verwendet — als String wie als Date-Objekt, und
          ein frühes Datum liefert eine andere Antwort als ein spätes. Sonst misst ein
          Test, der eine Altersgrenze prüft, gegen das echte Heute und ist grün aus dem
          falschen Grund.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datum-wird-verwendet.test.js#u2-110-ein-uebergebenes-datum-wird-verwendet
```

```konformitaet
aussage:  Der Kern nimmt ein Date aus dem äußeren Realm an: `_heuteTeile(new Date('2040-05-01')).y`
          ist 2040 und nicht das laufende Jahr. Die Probe ist ihre eigene Negativkontrolle —
          die Realm-Grenze im Harness unterscheidet die beiden Implementierungen ohne Mutation.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datum-wird-verwendet.test.js#u2-110-der-kern-selbst-nimmt-ein-fremdes-date-an
```

```konformitaet
aussage:  Ohne (oder mit unbrauchbarem) Datum gilt weiterhin „heute" — so ruft die App
          es auf; die Entenprobe behebt die stille Fehldeutung, nicht den Rückfall.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datum-wird-verwendet.test.js#u2-110-ohne-datum-gilt-weiterhin-heute
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
