# U2-ADR-093 · Teardown-Architektur und der Eingangsschirm als Ausgang

**Datum:** 20.07.2026
**Status:** Angenommen · gebaut 20.07.2026 (Browser-Abnahme bestanden, beide Dateien)
**Bezug:** Befund Teardown-DOM-Rest (20.07.2026) · Erhebung `geheZuZuhause()`/`renderWelcome()`-Aufrufer (20.07.2026) · U2-ADR-090 (Präfix-Regel, Nummernvergabe) · U2-ADR-065 (refMehrfach, Ursprung der „Attribut-Allowlist"-Lehre)
**Status heute:** gilt — Beleg `tests/e2e/adr093-teardown-keine-klartextreste.spec.js` (Positivkontrolle + Rot-Beleg, seit 17.08.2026). Der frühere Vermerk „Event-Blindzone, kein automatisierter Test" ist damit überholt. Der `zustand:`-Wert im Konformitäts-Block unten bleibt trotzdem `nicht_pruefbar` stehen — eine Format-Grenze des Prüfstands (liest nur `tests/*.test.js` mit `assert.`, keine Playwright-Specs), keine Prüflücke, s. Abschnitt 7.
*(Nachtrag 29.08.2026, ADR-Lücken-Prüfung: die Zusage war bereits belegt, nur der erste Satz führte mit „ungeprüft" statt mit dem Ergebnis. Umformuliert, kein neuer Inhalt, keine neue Prüfung.)*

---

## 1 · Der Fund

`_depotSpeicherZuruecksetzen()` trug seit ihrer Entstehung den Kommentar „Nach diesem Reset
bleibt NICHTS Wiederherstellbares im Speicher" — ein Anspruch, der nur als Code-Kommentar
existierte und nie geprüft wurde. Er war nicht erfüllt: Die Funktion selbst dokumentierte im
selben Atemzug „KEIN DOM/Render — die Aufrufer entscheiden", und mindestens einer der
Aufrufer (`geheZuZuhause()`, der häufigste Weg — Logo, Sidebar) rief sie für die echte Sitzung
überhaupt nicht auf. `data` blieb dabei vollständig live im Speicher, während die App den
Eingangsschirm zeigte — kein kurzes Zeitfenster, sondern ein unbegrenzter Zustand, solange der
Tab offen blieb. Dasselbe Muster wie bei den ADRs, die als Entscheidung existierten und als
Datei fehlten (U2-ADR-015): ein Anspruch, der nirgends außerhalb eines Kommentars geprüft
wird, wird nicht eingelöst.

Ein zweiter, unabhängiger Fund fiel bei derselben Erhebung an: der Sidebar-Knopf „Zuhause"
und das Logo führten zum generischen Erst-Einstiegsschirm — demselben, den eine Person sieht,
die die App nie geöffnet hat. Kein sichtbares Signal unterschied „Sie haben verlassen" von
„Sie haben nie geöffnet".

## 2 · Entscheidung Teil A: „Zuhause" wird nicht umverdrahtet, sondern ehrlich benannt

Eine Bereichsübersicht innerhalb des geöffneten Depots existiert nicht als eigener Render-Zustand
— die einzige heutige Navigation ist die Sidebar-Liste. Eine echte Übersicht hängt am noch nicht
terminierten Kachel-Umbau (zehn→elf Bereiche). Der sicherheitsrelevante Fix sollte daran nicht
hängen — deshalb keine Umverdrahtung.

Stattdessen: Logo und Sidebar-Knopf **behalten ihre Funktion** (Verlassen zum Eingangsschirm)
und werden **ehrlich beschriftet**. Der Sidebar-Eintrag heißt „Depot verlassen"
(`STRINGS.navDepotVerlassen`, vormals `navZuhause`/„Zuhause"; `data-verlassen` statt
`data-home`). Das Logo bleibt bewusst identisch verdrahtet (`geheZuZuhause`) — keine zweite
Verhaltensweise — und trägt `aria-label`/`title` „Depot verlassen" als Umgebungshinweis, da ein
Logo selbst keine Beschriftung trägt und sonst als beiläufigste Geste überhaupt eine Sitzung
ohne Ansage beenden würde.

„Angehörigen-Modus beenden", der Wizard-Abbruch-Fallback (ohne Rückkehrkontext) und
`subKontextVerlassen()` bleiben unverändert — sie meinen tatsächlich Verlassen.

**Bewusst offener Kassensturz-Posten:** eine echte Bereichsübersicht als Ziel von „Zuhause"
gehört zum Kachel-Umbau und wird mit ihm terminiert, nicht vorher entschieden.

## 3 · Entscheidung Teil B (Weg 1): Aufräumung zentral in `renderWelcome()`

**Grundsatz: Wer den Eingangsschirm zeigt, räumt vorher auf.** Nicht pro Aufrufer nachgepflegt,
sondern in `renderWelcome()` selbst verankert — jeder heutige und künftige Weg zum
Eingangsschirm bekommt die Aufräumung automatisch, ohne sie selbst auslösen zu müssen.
Dieselbe Lehre wie die refMehrfach-Attribut-Allowlist (U2-ADR-091): eine Regel, die an jeder
Aufrufstelle einzeln eingehalten werden muss, fällt still durch, sobald sie jemand vergisst.

**Die Vorschau-Ausnahme ist tragend, nicht neu erfunden.** Eine echte, passwortgeschützte
Sitzung wird vollständig abgeräumt. Eine passwortlose Vorschau-Sitzung (`imVorschau()`) bleibt
bewusst **erhalten** — sonst ginge beim bloßen „zurück" aus der Anlass-Auswahl echte, noch
ungesicherte Vorschau-Eingabe verloren, die es vorher nicht gab. Kaltstart und Crypto-Overlay:
`data` ist ohnehin leer, kein Eingriff nötig. Die Prüfung ist idempotent — ein wiederholter
Aufruf schadet nicht.

**Umfang der Aufräumung bei echter Sitzung:** `data`/Sitzungszustand über die bestehende
`_depotSpeicherZuruecksetzen()`, zusätzlich neu `_eingangsschirmDomAufraeumen()` — leert
`#content` und ein offenes Modal (`#modal-inhalt`/`#modal-rueck`), was `_depotSpeicherZuruecksetzen()`
laut eigenem Kommentar bewusst nie tat.

**Lese-App (`vivodepot-lesen.html`), eigener Code, dasselbe Prinzip:** `renderWelcome()` prüft
`if (data) entladen();` — ohne Vorschau-Ausnahme, da die Lese-App kein Vorschau-Konzept kennt.
Architektur-Unterschied: alle Sichten rendern ins selbe `#app`-Element per vollem
`innerHTML`-Ersatz — die nächste Sicht überschreibt automatisch, was vorher da war. Das
eigentliche Loch war dort die nie genullte `data`-Variable, nicht liegengebliebenes Markup.
Nebenbefund behoben: `entladen()` ist parameterlos definiert, wurde aber mit
`entladen(true)`/`entladen(false)` aufgerufen — beide Argumente wurden nie gelesen.

## 4 · Verworfene/nicht gewählte Alternative

Ein gemeinsamer, expliziter Eingangspunkt (z. B. `geheZumEingang()`), den alle Wege statt
`renderWelcome()` direkt aufrufen müssten, wurde erwogen und verworfen: ohne harte Durchsetzung
kollabiert das zu Weg 1 mit einer Umbenennung; mit harter Durchsetzung ist kein Grund
ersichtlich, warum `renderWelcome()` selbst je ohne Aufräumung aufgerufen werden sollte.

## 5 · Abnahme

Node-Suite (1494/1494 grün) ist keine Abnahme-Grundlage — der Pfad liegt in der
Event-Blindzone. Browser-Abnahme am Referenzdepot, nach dem Werteprinzip (alle
identifizierenden Zeichenketten aus dem offenen Depot vor der Aktion gesammelt, danach der
gerenderte DOM-Baum — ohne `SCRIPT`/`STYLE` — darauf durchsucht, keine Feldnamen-Liste):

- `vivodepot.html`: Logo (echte Sitzung, Warnung bestätigt), Sidebar „Depot verlassen" mit
  einem beim Verlassen offen gelassenen Modal, Angehörigen-Modus „beenden" (schwerster Fall,
  echtes Sektoren-Subset als Cache-Skelett nachgebildet) — je `data` null, `#content`/Modal
  leer, keine Klartext-Reste. Gegenprobe passwortlose Vorschau („zurück" aus der
  Anlass-Auswahl): `data` bleibt dasselbe Objekt, nicht genullt.
- `vivodepot-lesen.html`: Hinweis-Helfer, QR-Zurück-Knopf, `onSchliessen()` — je `data` null,
  keine Testwerte im DOM.

Commits: `b40b8a5` (Teil A), `e7deb69` (Teil B), `274eb1d` (Lese-App). Branch
`ci-probe-2026-07-02`, kein Push.

## 6 · Offen — bewusst nicht Teil dieser Entscheidung

- Eine echte Bereichsübersicht als Ziel von „Zuhause" — Kassensturz-Posten, terminiert mit dem
  Kachel-Umbau (zehn→elf Bereiche).
- Ob die Icon-Wahl (`home`-Symbol für einen jetzt „Depot verlassen" beschrifteten Knopf) noch
  passt — nicht Teil dieses Auftrags, kleiner Restpunkt.
- Der tote Vendor-Code (`html2pdf`/`html2canvas`/`DOMPurify`) — eigener Kassensturz-Posten.

## 7 · Konformität

```konformitaet
aussage:   Beim Verlassen einer echten Sitzung über den Eingangsschirm bleiben keine
           Klartext-Reste im DOM oder in `data` — geprüft am Referenzdepot (Logo, Sidebar,
           Angehörigen-Modus).
zustand:   nicht_pruefbar
quelle:    invariante
```

**Nachtrag 17.08.2026 — die Zusicherung ist jetzt BELEGT, `zustand` bleibt trotzdem stehen,
und der Grund dafür ist ein anderer als bisher.**
Der bisherige Vermerk lautete: der Pfad liege in der Event-Blindzone der Node-Suite, eine Probe
setzte „eine echte Browser-DOM-Sitzung mit gerendertem `#content`/Modal voraus, die die aktuelle
Test-Infrastruktur nicht aufbaut". **Sie baut sie inzwischen auf.** Playwright fährt den Weg
`#tb-marke → geheZuZuhause → flowSchliessenWarnungEchteSitzung → #m-ok` in einem echten Browser;
was fehlte, war nicht die Sitzung, sondern die Zusicherung.

`tests/e2e/adr093-teardown-keine-klartextreste.spec.js` setzt einen Marker in ein Feld,
**belegt zuerst, dass er im DOM UND in `data` steht**
(ohne diese Positivkontrolle wäre „nicht gefunden" nicht von „nie dagewesen" zu unterscheiden),
verlässt die Sitzung über den Klickweg und prüft danach `document.body.innerHTML`, `data` sowie
die beiden Stellen, die `_eingangsschirmDomAufraeumen` ausdrücklich leert.
**Rot-Beleg:** die Funktion testweise wirkungslos gemacht → Probe rot; Rücknahme byte-identisch.

**WARUM `zustand` DENNOCH `nicht_pruefbar` BLEIBT — und das ist eine Format-Grenze, keine
Prüflücke:** Das Bindungsformat aus U2-ADR-098/099 löst eine `pruefung:`-Zeile über
`tests/pruefstand-bindung.js` auf, und dieser Mechanismus liest ausschliesslich
`tests/*.test.js` — flach, mit `assert.` als Assertionsform. Eine Zusicherung, die eine echte
Browser-Sitzung braucht, kann dort NICHT liegen; sie ist notwendig eine Playwright-Spec mit
`expect(`. Gemessen am 17.08.: mit eingetragener Bindung meldet der Prüfstand die Spec als
„Wächter ohne lesbaren Testrumpf“ — nicht, weil der Rumpf fehlt, sondern weil er nach `assert.`
sucht.

**Das ist eine Entscheidung, kein Nachziehen:** die Bindungsform auf Playwright-Specs zu
erweitern, ändert, was der Prüfstand als Zusicherung anerkennt, und bewegt fünf gepinnte Zahlen.
Sie steht noch aus, als Produktentscheidung. **Bis dahin ist die Lage genau so festgehalten, wie sie ist:** die
Zusicherung wird bei jedem Playwright-Lauf geprüft, und das Bindungsformat kann das (noch)
nicht abbilden.

**Eine Aussage dieses ADR ist dabei präzisiert worden.** §5 sagt, eine passwortlose
Vorschau-Sitzung „bleibt bewusst erhalten". Das beschreibt korrekt das Verhalten von
`renderWelcome` (dort greift `if (data && !imVorschau())`) — **nicht den Ausgang des ganzen
Weges**: eine LEERE Vorschau wird beim Verlassen ohne Rückfrage verworfen, eine GEFÜLLTE erst
nach der Warnung und nur auf „Vorschau verlassen". Beides ist gewollt; die zweite Probe der Datei
hält die Stelle fest, an der es sich entscheidet.

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*

---

*Vivodepot GmbH · Berlin · 20.07.2026*
