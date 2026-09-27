# U2-ADR-096: Unterfeld-Adressierung für typisierte Listen — Zeile wählen, Feld lesen

**Status:** Angenommen
**Datum:** 22.07.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**U2-Bezug:** U2-ADR-089 (Vorsorge-Instrument-Liste) · U2-ADR-089-Nachtrag §3 (Instrument-Zeile
als Querverweis-Ziel) · U2-ADR-012 (Situationsblatt, Cross-Sektor-Verweise) · U2-ADR-010
(Feld-Architektur) · U2-ADR-067 §3 (welche Felder bewusst NICHT ans Instrument gekoppelt sind)
**Status heute:** gilt — Beleg `_listenSelektorZerlegen` (`vivodepot.html:26465`) und
`tests/alt-label-register.test.js`.

---

## Kontext

Mit U2-ADR-089 wurde die Vorsorge auf eine **typisierte Liste** umgestellt: `vorsorge_instrumente`,
ein Eintrag pro Instrument, unterschieden über die Diskriminante `typ`. Der Umbau zum *einen Ort*
(U2-ADR-096-Umfeld) entfernt die alten Flachfelder — damit verlieren rund acht Situations-
Querverweise ihr Ziel: Ein Blatt zog bisher `vorsorge.testament_ort`; der Wert lebt jetzt als
`ort` **innerhalb einer Zeile vom Typ Testament**.

Der Nachtrag zu U2-ADR-089 führte bereits den Präfix `instrument:<typ>` ein. Der adressiert aber
die **Zeile als Ganzes** — er beantwortet „gibt es ein Testament?". Er beantwortet **nicht**
„wo liegt es?". Für die Feld-Ebene fehlt die Adressierung vollständig.

**Warum das nicht vorsorge-spezifisch gelöst wird:** Vivodepot trägt bereits weitere Listen mit
Typ-artiger Unterscheidung (Konten mit `art`, Fahrzeuge, Vollmachten vor der Umhängung), und die
Merkliste (Teil B) wird eine weitere. Ein vorsorge-spezifischer Selektor müsste dort neu gebaut
werden — mit der bekannten Folge, dass die zweite Fassung von der ersten abweicht.

## Entscheidung

**Ein generischer Selektor adressiert `Liste → Zeilenauswahl → Unterfeld`.** Er ist an keine
konkrete Liste gebunden; Liste, Diskriminante, Typwert und Unterfeld sind Parameter.

### 1 · Zwei Auswahl-Formen, immer explizit

| Form | Bedeutung |
|---|---|
| **`neueste`** | genau eine Zeile — für Typen, bei denen ein neues Dokument das vorige rechtlich ablöst |
| **`alle`** | jede Zeile dieses Typs — für Typen, die nebeneinander gelten können |

**Es gibt keine Form „irgendeine Zeile".** Wer adressiert, sagt, nach welcher Regel ausgewählt
wird. Eine implizite Auswahl wäre genau die Sorte stille Entscheidung, die später niemand findet.

### 2 · Festlegung je Instrument (inhaltlich entschieden, nicht abgeleitet)

| Typ | Form | Grund |
|---|---|---|
| Testament | `neueste` | Ein neues Testament widerruft das frühere (§ 2258 BGB). |
| Patientenverfügung | `neueste` | Die jüngere Fassung drückt den aktuellen Willen aus. |
| KI-Verfügung | `neueste` | Wie PV — eine Willensäußerung, die fortgeschrieben wird. |
| Betreuungsverfügung | `neueste` | Vorschlag ans Gericht; der jüngere gilt. |
| **Vorsorgevollmacht** | **`alle`** | Mehrere Vollmachten gelten **gleichzeitig** nebeneinander (Bank-, Gesundheits-, Generalvollmacht) — das ist der Regelfall, nicht die Ausnahme. |
| **Sorgerechtsverfügung** | **`alle`** | Kann je Kind/Kindergruppe getrennt bestehen. |

**Regel für künftige Typen:** Löst ein neues Dokument das alte rechtlich ab → `neueste`. Können
mehrere gleichzeitig gelten → `alle`. **Im Zweifel `alle`** — ein zu viel gezeigtes Dokument ist
ärgerlich, ein nicht gezeigtes gültiges ist stiller Verlust.

### 3 · Die Grundlage von „neueste" — und was bei fehlendem Datum geschieht

**Grundlage ist das Unterfeld `datum` der Zeile** (ISO `JJJJ-MM-TT`), absteigend. Es ist das
einzige Feld, das den Stand des Dokuments in der Welt beschreibt; die stabile Record-`id`
(Schema 32) und die Array-Position beschreiben nur die Reihenfolge der *Erfassung*, nicht die
des Dokuments.

**`datum` ist bewusst kein Pflichtfeld** — „neueste" kann also unentscheidbar sein. Dafür gilt:

1. **Mindestens eine Zeile hat ein `datum`** → die mit dem höchsten gewinnt. Zeilen ohne `datum`
   verlieren gegen jede datierte Zeile (eine datierte Angabe ist die belastbarere).
2. **Keine Zeile des Typs hat ein `datum`, und es gibt mehr als eine** → **die Auswahl fällt auf
   `alle` zurück.** Es wird **nicht** still auf die Anlagereihenfolge ausgewichen.
3. Genau eine Zeile → sie ist trivial die neueste.

**Begründung für Punkt 2 — die eigentliche Entscheidung dieses ADR.** Die Anlagereihenfolge wäre
verfügbar und bequem, aber sie ist eine *Erfassungs*-Tatsache, die als *Rechts*-Tatsache gelesen
würde: „das zuletzt Eingetippte ist das gültige" stimmt nicht. Wer zwei undatierte Testamente
erfasst hat, hat ein Problem, das die App nicht auflösen kann — und sie soll es nicht auflösen,
sondern zeigen. Das ist dieselbe Regel wie oben („im Zweifel alle"), nur eine Ebene tiefer:
angewandt auf die Zeilenwahl statt auf den Typ. Konsequenz: Die Nutzerin sieht beide und erkennt,
dass ein Datum fehlt — statt dass die App eines davon unsichtbar macht.

### 4 · Rückgabeform und Leerverhalten

Der Selektor liefert **immer eine Liste** — auch `neueste` liefert eine Liste mit höchstens einem
Element. Damit kann Punkt 3.2 (Rückfall auf `alle`) den Rückgabetyp nicht verändern, und jede
Konsumenten-Stelle behandelt einen und mehrere Treffer über denselben Pfad.

**Existiert keine Zeile des Typs, oder trägt die gewählte Zeile das Unterfeld nicht: leere Liste.**
Kein Wurf, kein Platzhalter, keine Lücke im Layout. Ein Blatt, das nach einem nicht vorhandenen
Testament fragt, zeigt an dieser Stelle nichts — genau wie ein leeres Flachfeld heute.

### 5 · Sonderregel Notfall-Pfad — die Klartext-Grenze

Der Notfall-Pfad (`NOTFALL_KERN_FELDER`, die Allowlist der Felder, die **unverschlüsselt** auf
Notfall-Blatt und Notfall-QR erscheinen) ist kein gewöhnlicher Konsument. Für ihn gelten zwei
Regeln, die von §1–§4 **abweichen**. Sie sind Sicherheitsgrenzen, nicht Detail.

**(a) Immer genau eine Zeile pro Typ — unabhängig von der Registry-Form.** Auch bei Typen mit
Form `alle` (Vorsorgevollmacht, Sorgerechtsverfügung) nimmt der Notfall-Pfad **eine** Zeile.
Begründung: Die Klartext-Menge darf nicht mit der Zahl der Instrument-Zeilen wachsen. Heute wäre
das zufällig eng — bei zwei Vollmachten schon nicht mehr, und die Menge dessen, was ohne Passwort
sichtbar wird, ist keine Größe, die von der Erfassungsfreude der Nutzerin abhängen darf.

*Angenommene Folge:* Trägt jemand später zwei Vollmachten mit verschiedenem Ablageort, zeigt das
Notfall-Blatt einen davon. Das ist der bewusste Preis der Klartext-Grenze. Die vollständige Sicht
steht im entschlüsselten Depot.

*Auswahl der einen Zeile:* dieselbe Datums-Ordnung wie `neueste` (§3). **Aber der Rückfall auf
„alle" aus §3.2 ist hier gesperrt** — er würde Regel (a) aufheben. Ist die Auswahl undatiert und
damit unentscheidbar, nimmt der Notfall-Pfad die **erste gespeicherte Zeile** des Typs
(Array-Ordnung, deterministisch und stabil über die Record-`id`). Das ist genau die
Anlagereihenfolge-Auswahl, die §3.2 für den Normalfall ausdrücklich verwirft — hier ist sie
zulässig, weil die Alternative nicht „mehr zeigen", sondern „die Klartext-Grenze aufgeben" wäre.
Der Unterschied gehört benannt, damit ihn niemand als Inkonsistenz „aufräumt".

**(b) Das Leerverhalten kehrt sich um: Nachweispflicht statt „leer statt Fehler".** §4 sagt für
alle anderen Stellen: kein Treffer → leere Liste, kein Fehler. Für den Notfall-Pfad gilt das
**nicht als ausreichend**. Hier ist zu **belegen**, dass jeder Wert, der heute sichtbar ist, nach
der Umstellung ankommt. Stilles Nichts ist auf dem Notfall-Blatt der schlimmere Ausgang: Ein
leeres Feld sieht aus wie „nicht hinterlegt" und ist von „ging bei der Umstellung verloren" nicht
zu unterscheiden — und zwar in genau der Situation, in der niemand nachfragen kann.

*Umsetzung dieser Nachweispflicht:* ein Test, der ein Depot mit belegten Alt-Flachfeldern durch
die Migration führt und für **jedes** Feld der Notfall-Allowlist prüft, dass der Wert danach am
Notfall-Pfad ankommt — nicht, dass der Pfad „nicht wirft".

## Konsequenzen

- Die acht Situations-Querverweise auf entfallende Vorsorge-Flachfelder werden über diesen
  Selektor umgestellt (eigener Schritt, nach dem Bau des Mechanismus).
- Der `instrument:<typ>`-Präfix aus dem U2-ADR-089-Nachtrag bleibt gültig und unverändert: Er
  beantwortet die Existenzfrage. Dieser Selektor beantwortet die Feldfrage. Zwei Fragen, zwei
  Mechanismen, keiner ersetzt den anderen.
- Undatierte Mehrfach-Einträge werden **sichtbar** statt stillschweigend gefiltert. Das kann in
  einem Blatt zwei Testamente zeigen — das ist gewollt und der Hinweis darauf, dass ein Datum fehlt.
- Für jede künftige typisierte Liste gilt derselbe Selektor; die Form (`neueste`/`alle`) ist pro
  Typ zu entscheiden und gehört in das ADR, das den Typ einführt.

## Verworfene Alternative

**Auswahl über die Anlagereihenfolge, wenn kein Datum vorliegt.** Verworfen: Sie liefert immer ein
Ergebnis und wirkt dadurch robuster, macht aber aus einer Erfassungs-Tatsache eine Rechts-Aussage.
Der Fehler wäre unsichtbar — die App zeigt genau ein Testament, überzeugend, und möglicherweise das
falsche. Ein sichtbares „hier stimmt etwas nicht" ist einem unsichtbaren Fehlgriff vorzuziehen.

### 6 · Ein Feld zu entfernen heißt, seinen Registereintrag zu schreiben

Wird ein Feld aus dem Modell entfernt, bleiben seine **Werte** im Depot stehen — die
Verwaisungsregel verbietet, Bürgerdaten wegen einer neuen Regel zu löschen. Was verschwindet,
ist die **Frage**: das Label. Und ohne die Frage sagt der Wert nichts.

Belegt am 23.07.2026 an den fünf `ki_verhalten_*`-Feldern: Der gespeicherte Code `familie` kommt
in vier von ihnen vor und bedeutet jedes Mal etwas anderes — „Familie entscheidet", „die ganze
Familie und enge Freunde", „die Familie soll das entscheiden". Eine Bürgerin, die diese vier
Werte als Rohschlüssel läse, hätte weniger als nichts: vier gleich aussehende Einträge mit
verschiedener Bedeutung.

Deshalb führt `ALT_LABEL_REGISTER` je entferntem Feld: `sektor`, `id`, `label`, `typ`, die
**Optionslabels** und rekursiv die Unterfelder, dazu `entferntAm` und das entfernende `adr`. Nur
anwachsend; ein Eintrag wird nie geändert und nie entfernt, denn er beschreibt einen Zustand der
Vergangenheit.

**Der Zeitpunkt ist der Kern der Regel.** Die Klausel greift beim Entfernen — dort, wo das Wissen
noch vorhanden ist. Die zehn Einträge vom 23.07. konnten nur deshalb vollständig geerntet werden,
weil die Lese-App die Deklarationen noch trug und ein historischer Commit erreichbar war. Wird ein
Feld künftig aus **beiden** Apps entfernt, ohne dass jemand daran denkt, ist sein Label nur noch
über `git log -S` beschaffbar — und das setzt voraus, dass jemand weiß, dass er suchen muss.

Die Ansicht „Frühere Angaben", die aus dem Register liest, ist **nicht** Teil dieser Entscheidung.
Sie ist UX-Arbeit und folgt nach dem Umbau; das Register ist die Ernte, die Anzeige folgt.

## Konformität

```
status: prüfbar
pruefungen:
  - alt-label-register-eintraege-vollstaendig
  - alt-label-register-optionslabels-vorhanden
  - alt-label-register-deckt-lese-app-reste
  - migration-erzeugt-keine-neuen-waisen
bedeutung: >
  Jedes Feld, das nur noch die Lese-App kennt, hat einen vollständigen
  Registereintrag mit Label, Typ und Optionslabels; und keine Migrationsstufe
  erzeugt Schlüssel, die danach in keiner der beiden Apps mehr deklariert sind.
```

Die Klausel sichert **Einhaltung, nicht Güte**: Sie sagt, dass kein Label unbemerkt verlorengeht.
Ob ein Feld zu Recht entfernt wurde, sagt sie nicht — das steht im jeweiligen ADR.

**Offen und hier ausdrücklich benannt:** Der Linter, der beide Richtungen erzwingt (Klausel nennt
existierende Prüfung; Prüfung nennt existierendes ADR), ist noch nicht gebaut. Bis dahin ist die
Bindung dokumentiert, aber nicht maschinell durchgesetzt — sie gehört in die Automatisierungs-Stufe.

## Implementations-Verweis

Folgt mit dem Bau (Code-Anker, keine Commit-Hashes — s. die Praxis ab U2-ADR-017).

---

*Vivodepot GmbH · Berlin · 22.07.2026*
