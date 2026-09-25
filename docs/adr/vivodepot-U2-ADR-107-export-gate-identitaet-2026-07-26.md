# U2-ADR-107: Das Export-Gate deckt beide IPS-Pflichtfelder der Identität

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** KONFORMITÄT, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-105 (`dataAbsentReason`) · U2-ADR-106 (Validator-Registry) ·
D37 (Banner „Depot ohne Namen") · U2-ADR-099 (Prüfstand)
**Anker:** Messung am offiziellen HL7-Validator 6.9.12, 26.07.2026
**Status heute:** gilt — Beleg `tests/fhir-export-gate-identitaet.test.js`.

---

## Kontext

`Patient.name` und `Patient.birthDate` sind beide **min=1** in `Patient-uv-ips`. Für das
Geburtsdatum gab es seit Längerem ein Export-Gate: fehlt es, bekommt die Bürgerin einen
freundlichen Hinweis und das Angebot, es zu ergänzen — **kein Export**. Für den Namen gab es
keins.

| | Geburtsdatum | Name |
|---|---|---|
| IPS-Pflicht (`min=1`) | ja | **ja** |
| Prüffunktion vorhanden | `depotHatGeburtsdatum()` | `depotHatNamen()` |
| als **Export-Gate** benutzt | ja | **nein** — einziger Aufruf war das D37-Einmal-Banner |
| Folge für die Bürgerin | eine Erklärung | eine ungültige Datei, **kein Wort** |

Zwei Pflichtfelder derselben Klasse, zwei völlig verschiedene Regeln. Ein Depot **ohne Namen** ist
dabei kein Sonderfall, sondern ein **vorgesehener Zustand**: das Passwort-Modal hat kein
Namensfeld, und das D37-Banner existiert genau deswegen.

### Ein zurückgezogener Posten, ausdrücklich vermerkt

Der Bericht zu U2-ADR-106 führte: *„eine Bürgerin ohne Geburtsdatum erzeugt einen ungültigen
FHIR-Export."* **Das ist zurückgezogen.** Gemessen wurde der Builder, nicht der Weg der Bürgerin —
den deckt das bestehende Gate ab. Was von dem Posten bleibt, ist die Namens-Lücke, und die hat eine
andere Begründung.

### Gate-Deckung — gemessen, nicht angenommen

`fhirIpsBundle` hat drei Aufrufer. Genau **ein** Weg ist für eine Bürgerin erreichbar:

| Weg | Erreichbarkeit | durch das Gate? |
|---|---|---|
| Herausgeben-Chooser → `data-h-format="fhir-ips"` → `flowSektorExport` → `flowGesundheitFhirExport` | **ja**, der einzige | **ja** |
| Registry-Eintrag `EXPORT_FORMATE['fhir-ips'].baue` | nur aus dem Flow **nach** dem Gate | ja (nachgelagert) |
| `kernAPI.exportiere`-Rückfall | **unerreichbar** — die Registry trägt die id, `def.baue` greift immer | — |

Der Dispatcher `flowSektorExport` leitet `fhir-ips` **ausdrücklich** am generischen Registry-Weg
vorbei in den gegateten Flow. Es gibt keinen Vorbei-Weg; das Gate steht an der richtigen Stelle,
es prüfte nur zu wenig.

**Am Validator, mit Positivkontrolle:** Bundle mit Geburtsdatum, **ohne** Namen → **ungültig**
(„`Patient.name`: mindestens erforderlich = 1, aber nur gefunden 0"). Dasselbe Depot **mit** Namen
→ **gültig**.

## Entscheidung

Das bestehende Gate prüft beide Pflichtfelder. **Kein zweites Gate daneben** — das wäre genau die
Zwei-Mechanismen-Klasse, die dieser Zug behebt.

**Ein Hinweis, nicht zwei.** Fehlen beide, wäre eine Absage nach der anderen zwei Absagen für eine
einzige Handlung. Der Text benennt, was wirklich fehlt: eigener Wortlaut für „nur Name", für „nur
Geburtsdatum" und für „beides".

**Niedrigschwelligkeit bleibt, unverändert.** Geprüft wird am **Export**, nicht am Eintritt. Ein
Depot ohne Namen lässt sich weiterhin anlegen und benutzen; der Builder bleibt rein.

Der Ergänzen-Flow bleibt einer (`flowFhirGeburtsdatumErgaenzen`) — das Ziel ist für beide Fälle
dasselbe: der Bereich Identität, in dem beide Felder nebeneinander stehen. Ein zweiter Flow mit
identischem Rumpf wäre ein zweiter Mechanismus für dieselbe Sache.

**Registry-Eintrag (U2-ADR-106):** `mit-geburtsdatum-ohne-namen` als `erwartet: 'ungueltig'` hält
die Format-Grenze am echten Validator fest — so wie der Leer-Depot-Fall.

## Konsequenzen

Ein Messweg-Fehler ist im Test benannt, damit er sich nicht wiederholt: die erste Fassung prüfte
`#modal-rueck.classList.contains('an')`. Im node-Harness setzt `ui.modal` diese Klasse nicht und
schreibt keinen Text in den Host — der Primärknopf wird sehr wohl verdrahtet. **Alle sechs Proben
waren rot, obwohl der Bau stimmte.** Gemessen wird jetzt am `ui.modal`-**Aufruf**: was der Flow
anfordert, hängt nicht am Render-Verhalten des Harness.

Ungemessen: ob es außerhalb von `gesundheit` weitere Export-Formate mit IPS-artigen Pflichtfeldern
gibt, die dieselbe Lücke hätten. Dieser Zug prüft den FHIR-Weg.

## Konformität

```konformitaet
aussage:  Fehlt am Export ein IPS-Pflichtfeld der Identität — Name, Geburtsdatum oder
          beides —, wird der Export nicht ausgeführt und die Bürgerin bekommt einen
          Hinweis mit dem Angebot, es zu ergänzen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-export-gate-identitaet.test.js#u2-107-export-gate-deckt-name-und-geburtsdatum
```

```konformitaet
aussage:  Sind Name und Geburtsdatum vorhanden, greift kein Hinweis — ein Gate, das
          immer feuert, ist eine Blockade.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-export-gate-identitaet.test.js#u2-107-vollstaendige-identitaet-wird-nicht-gegated
```

```konformitaet
aussage:  Fehlen beide Pflichtfelder, erscheint GENAU EIN Hinweis, der beide benennt —
          nicht zwei Absagen hintereinander für eine einzige Handlung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-export-gate-identitaet.test.js#u2-107-bei-zwei-luecken-nur-ein-hinweis
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
