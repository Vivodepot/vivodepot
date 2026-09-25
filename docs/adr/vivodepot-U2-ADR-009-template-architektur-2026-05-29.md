# U2-ADR-009: Template-Architektur — Module, die sich nicht wie Module anfühlen

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** ARCHITEKTUR, UX, DATENMODELL
**Cross-Referenz (v1-RC / Produktiv):** `ladeTemplate()`, `VIVODEPOT_STANDARD_TEMPLATES`, `geladene-templates`-Liste, `pruefeTemplateLifecycle()`, ADR-065 (Trust Authority, JWS-Signatur).
**U2-Bezug:** U2-ADR-006 (Andock-Architektur, Code-Slot), U2-ADR-008 (Propagation).
**Status heute:** gilt — Beleg `tests/konformitaet/offline-garantie.mjs` und `tests/netz-verbote.test.js#u2-009-kein-url-abruf-im-code`.

---

## Kontext

Der Template-Mechanismus aus v1-RC ist unter der Haube sauber: eine Funktion `ladeTemplate()`, durch die sowohl eingebaute Standard-Templates als auch später geladene gehen, eine gemeinsame Liste `geladene-templates`, Lifecycle-Prüfung. Das Problem von v1 war die Oberfläche: ein eigener „Übergabebereich", in dem Templates als Templates auftraten, mit eigener Verwaltungs-Logik, in der man sich nicht orientieren konnte.

Diese ADR legt fest, wie U2 den Mechanismus übernimmt und die Oberfläche anders löst. Vier Festlegungen.

## Entscheidung

### 1. Templates fühlen sich nicht wie Templates an

Es gibt **keinen** Übergabe- oder Template-Bereich. Der Nutzer sieht nie „ein Template laden" oder eine Template-Verwaltung. Stattdessen: Felder aus einem Template erscheinen als aufklappbarer Abschnitt („mehr", „zusätzliche Felder", „weiter") **im thematisch passenden Lebensbereich** — exakt wie die eingebauten `mehr()`-Blöcke. Ein eingebautes Modul und ein geladenes Template sind im Bedien-Erlebnis ununterscheidbar.

Technisch: Das `mehr()`-Konstrukt und der Template-Mechanismus teilen sich dasselbe Render-Ziel. Jedes Template trägt, in welchen Bereich (und an welche Stelle) seine Felder gehören. Der Bereichs-Renderer fragt beim Aufbau: „Gibt es für mich registrierte Template-Felder?" und hängt sie als aufklappbaren Abschnitt an.

Eingebaute und geladene Module gehen durch **einen** Weg (wie v1-RC: Standard-Templates laufen durch dieselbe `ladeTemplate()`-Funktion wie importierte). Kein technischer Unterschied zwischen „von Anfang an da" und „später geladen".

### 2. Der Online-Schritt ist bewusst und erkennbar

Vivodepot ist offline. In dem Moment, in dem eine Vorlage aus dem Netz geholt wird, greift das Offline-Versprechen für genau diesen Schritt nicht. Dieser Moment wird **nicht** verschleiert.

Das Hereinholen ist ein bewusster, benannter Schritt mit klarer Ansage: einmal online gehen, Vorlage holen, danach liegt sie dauerhaft im Depot, wieder offline. Online-Sein ist ein **einmaliges Ereignis**, kein Dauerzustand. Das unterscheidet Vivodepot von einer Cloud-App. Kein verstecktes Nachladen im Hintergrund.

### 3. Die Anwendung fasst nie selbst das Netz an

Vivodepot greift **nie** selbst auf eine URL zu, um eine Vorlage zu holen. Die Anwendung nimmt ausschließlich **Dateien entgegen**, die der Nutzer ihr reicht — per „Datei öffnen", woher auch immer er sie hat (Browser-Download, USB-Stick, E-Mail-Anhang).

Konsequenz: Das Offline-Versprechen ist für die Anwendung **absolut** wahr — sie kann technisch nichts aus dem Netz holen. Der Online-Schritt liegt komplett außerhalb, beim Nutzer und seinem Browser. Das Versprechen kann nicht verwischen, weil es keinen Netzpfad in der Anwendung gibt. Passt zur Single-File-Disziplin.

Der Nutzer merkt zwangsläufig, dass er die Vorlage von außerhalb holt — er tut es selbst, bewusst. Das erfüllt Festlegung 2 baulich, nicht nur durch Hinweistext.

### 4. Daten überleben ihr Template

**Die Daten gehören dem Bürger, nicht dem Template.** Ein Template kann ablaufen (18-Monats-Lifecycle), zurückgezogen oder veraltet sein — die eingegebenen Daten bleiben. Sie verschwinden **nie**, weil ihre Quelle verschwindet. Nur der Bürger selbst entscheidet, ob Daten gehen.

Harte Trennung:
- **Template = Hülle:** Felddefinitionen, Struktur, Beschriftung, ggf. Code-Tabellen für Export. Werkzeug, nicht Inhalt. Liegt in `geladene-templates`.
- **Daten = Inhalt:** was der Bürger eingetragen hat. Liegt eigenständig in der Datenschicht (`data`), mit eigenen Schlüsseln, **nicht** im Template und **nicht** nur über das Template erreichbar.

Beim Archivieren oder Zurückziehen eines Templates:
- Jeder `data`-Eintrag bleibt bestehen.
- Erlaubt: Template als „archiviert"/„zurückgezogen" markieren, Hinweis „Vorlage veraltet, neue verfügbar".
- Verboten: Felder verschwinden, Daten werden unlesbar, Bereich klappt leer.
- **Fallback-Render:** Gibt es kein aktives Template mehr für vorhandene Daten, werden sie trotzdem angezeigt — notfalls roh („gespeicherte Angaben", ohne Template-Beschriftung). Der Bürger sieht seine Daten immer.

## Konsequenzen

- U2 portiert `ladeTemplate()`, die `geladene-templates`-Liste und die Standard-Template-Schleife aus v1-RC — ein Weg für eingebaute und geladene Module.
- Render-Schicht: Bereichs-Renderer hängt registrierte Template-Felder als aufklappbaren Abschnitt an, ununterscheidbar von eingebauten `mehr()`-Blöcken.
- Datei-Entgegennahme statt Netzzugriff: Import-Pfad nimmt eine vom Nutzer gereichte Datei, kein `fetch` auf URLs im Kern.
- Daten-Schlüssel sind template-unabhängig. Fallback-Render für verwaiste Daten.
- White-Label: Jede Edition ist erweiterbar — kann jederzeit weitere Vorlagen aus beliebigen Bereichen aufnehmen (eine Sparkassen-Edition kann den gynäkologischen Fragebogen aufnehmen). Kein Sonderfall „vorbestückt und fertig"; der Aufnahme-Mechanismus ist immer da.

## Offen (eigene Folge-Entscheidung, nicht hier)

- **Signatur/Trust Authority:** v1-RC hat `proof.jws: null` als Platzhalter — Standard-Templates laden ohne Signaturprüfung. Die JWS-Prüfung gegen die Trust Authority (ADR-065) ist eine Härtung, die separat entschieden wird. Mechanismus funktioniert auch ohne; Signatur ist Vertrauens-Schicht, kein Blocker.
- **Bereichs- und Stellen-Zuordnung im Template-Schema:** genaues Feld, das festlegt, wo Template-Felder andocken.
- **Verschmelzung versus eigener Block:** ob Template-Felder mit eingebauten Modul-Feldern in einem gemeinsamen „mehr"-Block verschmelzen oder als eigener aufklappbarer Abschnitt mit Quellenangabe darunter sitzen.

## Implementations-Verweis

Folgt. Vor Template-Code für U2 ist diese ADR die Grundlage.

## Konformität

```konformitaet
aussage:   U2-009: Vivodepot ruft nie selbst eine URL für Vorlagen ab — kein fetch/XMLHttpRequest/
           WebSocket/sendBeacon/EventSource im Eigen-Code; die Laufzeit stellt 0 externe Requests.
           Erlaubt bleibt nur, eine Vorlage als „archiviert"/„zurückgezogen" zu markieren (kein Abruf).
zustand:   prüfbar
pruefung:  tests/konformitaet/offline-garantie.mjs#NULL externe HTTP/S-Requests bei Laden + Nutzung
pruefung:  tests/netz-verbote.test.js#u2-009-kein-url-abruf-im-code
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 2 der 26-Verbote-Strecke), über `tests/bindung-pruefen.js`
(U2-ADR-098 + Nachtrag). Bindungsart B: **Verweis** auf den ausgeführten offline-garantie-Runtime-Test
(„0 externe Requests", pre-push + CI-konformitaet; Gate-Nachweis `deepEqual(externeRequests, [])` → rot
bei externem Request) **plus** ein additiver Always-on-Statik-Test (`tests/netz-verbote.test.js`, läuft in
jedem `npm test`), der latenten Abruf-Code fängt.*
