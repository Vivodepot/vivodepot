# ADR — Erst-Eintritts-Architektur und Verschlüsselungs-Disziplin

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 24.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Status:** Akzeptiert
**Datum:** 24. Mai 2026
**Verantwortlich:** Produktverantwortliche
**Beteiligt:** UX-Abstimmung, Synthese-Abstimmung
**Bezug:** UX-Spezifikation und Planungsgrundlage, B16-ADR-061v2 (Zwei-Stufen-Cache), B16-ADR-099 (Stufe-1-Plain-Cache final), Klumpen 1 (Welcome-Stufen-Architektur), Klumpen 2a (Modus-Wechsel-Disziplin)

---

## Kontext und Problem

Bei der Klumpen-1-Akzeptanz-Probe am 24.05. hat sich gezeigt: die heute spezifizierte Erst-Eintritts-Architektur (Passwort-Setzung als erster Schritt vor jedem Daten-Eintrag) ist eine gewichtige Bürger-Hürde. Die Aussage aus der Probe: „Ich würde sofort aufhören." Wenn schon eine mit dem Projekt vertraute Person an dieser Hürde scheitert, scheitert auch jede Bürgerin im Pflegealltag, die weniger Geduld und keine Bindung an das Projekt hat.

Gleichzeitig trägt das erste Mission-Versprechen — „Es ist Ihre verschlüsselte Datei. Nichts geht ins Internet, niemand sonst kann sie lesen." — eine harte Disziplin: Vivodepot darf keine Klartext-Daten auf den Stick schreiben. Wer den Stick verliert, soll keinen Klartext finden.

Diese zwei Pflichten kommen am Erst-Eintritt in Konflikt:

— **Erstes Versprechen** verlangt Verschlüsselung, die ein Passwort braucht.
— **Zweites Versprechen** („Sie entscheiden, wie viel und wie schnell") verlangt Niedrigschwelligkeit, die kein Passwort als Eintritts-Hürde duldet.

Drei Architekturen wurden in der UX-Abstimmung durchdacht:

— **Architektur eins — Passwort sofort.** Heute spezifiziert. Mission rein, aber Bürger-Verlust am Erst-Eintritt.
— **Architektur zwei — Klartext bis Passwort.** Niedrigschwellig, aber Mission-Bruch (Stick mit Klartext-Daten).
— **Architektur drei — Demo-Modus ohne Datei.** Mission rein, aber Hürde nur verschoben.

Diese ADR setzt eine vierte Architektur — die einzige, die beide Versprechen tragen kann.

---

## Entscheidungs-Treiber

— **Bürger-Niedrigschwelligkeit (P-8):** Marlies, 72, kann die App öffnen und sofort erkunden, ohne Passwort-Hürde am Erst-Eintritt.
— **Datei-Souveränität (P-1):** Nichts geht in Klartext auf den Stick. Verschlüsselung ist hart.
— **Tempo-Souveränität (P-2):** Bürgerin entscheidet selbst, wann sie ein Passwort setzt — beim ersten Eintrag, später, oder beim Schließen.
— **Ehrlichkeit (P-9):** Bürgerin weiß in jedem Moment, was passiert. Sie wird nicht überrascht, dass ihre Daten verloren gehen.
— **Mission-Kommunikation:** Pilotpartner und rechtliche Beratung müssen die Architektur klar erklärbar finden. „Vivodepot speichert nur verschlüsselt" muss wahr bleiben.

---

## Entscheidung

### Architektur vier — Sofortiger Eintritt, Speicher-mit-Passwort

Vivodepot lässt die Bürgerin sofort eintreten und arbeiten, ohne Passwort. Was sie einträgt, lebt im Browser-Speicher (in-memory), wird nicht auf den Stick geschrieben. Beim Versuch zu schließen oder beim Versuch zu speichern wird die Bürgerin zur Passwort-Setzung geführt. Wer ohne Passwort schließt, verliert die Daten — bewusst, mit Warnung.

### Vier Disziplinen, die Architektur vier tragen

**Disziplin eins — Persistenter Topbar-Hinweis.**

Solange kein Passwort gesetzt ist, ist oben in der Topbar ein dauerhafter Hinweis sichtbar, nicht wegklickbar:

> Ihre Daten sind noch nicht dauerhaft gespeichert. [Passwort setzen →]

Farbe Gold-soft (analog `--angehoerige-akzent` aus ADR Modus-Wechsel-Disziplin), Ton informativ, nicht alarmierend. Der Hinweis verschwindet erst, wenn das Passwort gesetzt und damit der erste Save-Cycle erfolgreich war.

**Disziplin zwei — Schließen-Warnung als bewusste Wahl.**

Wenn die Bürgerin den Browser-Tab schließt oder die App über einen App-internen Schließen-Button verlässt, ohne ein Passwort gesetzt zu haben, erscheint ein Modal:

> Ihre Daten sind noch nicht dauerhaft gespeichert.
>
> Setzen Sie ein Passwort, um sie zu behalten. Ohne Passwort gehen sie beim Schließen verloren.
>
> [Passwort setzen]   [Trotzdem schließen]

Bürgerin trifft eine bewusste Entscheidung. Sie kann „Trotzdem schließen" wählen — die Daten gehen verloren, das ist okay, weil sie informiert wurde.

Bei Browser-Tab-Schließen wird der Standard-`beforeunload`-Mechanismus genutzt — die Browser-eigene Dialog-Sprache wird nicht überschrieben (technisch eingeschränkt durch Browser). Wer auf den App-internen Schließen-Button klickt, sieht den ausformulierten Modal oben.

**Disziplin drei — Erst-Eintrag-Hinweis als einmalige Anker-Erinnerung.**

Beim ersten Datenfeld-Eintrag (erstes erfolgreiches Speichern eines Wertes im In-Memory-State) erscheint *einmal* ein kontextuelles Toast-Element neben dem Feld:

> Tipp: Diese Eingabe ist noch nicht dauerhaft gespeichert. Setzen Sie ein Passwort, wenn Sie sie behalten möchten. [Passwort setzen]

Der Toast verschwindet nach 8 Sekunden oder beim nächsten Eintrag oder bei Klick auf „Passwort setzen". Er erscheint nicht wieder, bis die App neu geöffnet wird. Damit ist die Bürgerin frühzeitig aufgeklärt, *bevor* sie emotional in Daten investiert ist.

**Disziplin vier — Technische Garantie: keine Klartext-Persistierung.**

Auf der Code-Seite gilt: alle Schreib-Pfade des Datenmodells sind konditional. Sie schreiben nur, wenn ein Verschlüsselungs-Schlüssel im Speicher liegt. Vor Passwort-Setzung ist der Schlüssel `null`, und alle Save-Aufrufe sind No-Ops auf der Persistierungs-Ebene (in-memory bleibt erhalten).

In der technischen Abstimmung ist bei der Klumpen-Implementation zu prüfen:

— Alle existierenden Auto-Save-Pfade werden konditional gestellt oder bis zur Passwort-Setzung deaktiviert.
— Kein `localStorage.setItem` ohne Verschlüsselung.
— Kein „temporäres" Schreiben in die HTML-Datei.
— Reload und Refresh führen zu Daten-Verlust *vor* der Passwort-Setzung (das ist die Architektur-Konsequenz und muss durch Disziplin zwei und drei kommuniziert sein).

### Welcome-Stufen-Architektur nach Architektur vier

**Erst-Eintritt mit leerer Datei (keine vorhandene Datei).**

Das heute existierende `stufe1-neue-datei-overlay` wird *zurückgebaut*. An seine Stelle tritt das normale Welcome-Modal (Stufe-2-Variante) direkt nach App-Öffnung, mit drei sichtbaren Buttons:

— **Primärer Button:** „Was bringt Sie heute hierher? →" (führt in Anlass-Auswahl-Grid).
— **Sekundärer Button:** „Hier anfangen — ohne festes Ziel" (führt in App-Innensicht mit Sidebar).
— **Notfall-Button (rot, immer sichtbar):** „Für Sanitäter — Akut-Daten ohne Passwort". (Wortlaut präzisiert, siehe weiter unten.)

Plus der persistente Topbar-Hinweis (Disziplin eins).

Kein „Setzen Sie ein Passwort"-Bildschirm vor der Anlass-Auswahl. Kein Stufe-1/Stufe-2-Wechsel mehr für die neue-Datei-Lage — beide werden zu einer Sicht.

**Wieder-Eintritt mit vorhandener verschlüsselter Datei.**

Das heute existierende `crypto-overlay` bleibt als Stufe-1-Welcome erhalten. Logo, Untertitel, „Geben Sie das Passwort für Ihr Vivodepot ein", Öffnen-Button, „Als Angehörige öffnen →"-Link, Notfall-Button. Architektur eins gilt hier, weil die Datei *bereits* verschlüsselt ist und das Passwort technisch nötig ist.

### Notfall-Button-Wortlaut: präzisiert auf Adressaten-Trennung

Der Button „Im Notfall — ohne Passwort" wird umbenannt in:

> Für Sanitäter — Akut-Daten ohne Passwort

Begründung: der Button bedient die Sanitäter-Lage (Bürgerin ist nicht handlungsfähig, fremde Hand bedient den Stick). Bürgerinnen sollen nicht den Eindruck haben, dies sei ein Bürger-Pfad zum „mal Reinschauen". Der Adressaten-Trennungs-Wortlaut macht klar: das ist für medizinisches Personal.

Cluster C.1 (Notfall-Tür immer sichtbar) bleibt aktiv — der Button ist auf jedem Welcome-Bildschirm sichtbar. Nur der Wortlaut ändert sich.

### Passwort-Setzungs-Pfad

Beim Klick auf „Passwort setzen" (im Topbar-Hinweis, im Schließen-Modal, im Erst-Eintrag-Toast) öffnet sich ein Modal mit:

— Begrüßung: „Schützen Sie Ihre Daten mit einem Passwort."
— Erklärung: „Mit diesem Passwort öffnen Sie Vivodepot ab jetzt jedes Mal. Vivodepot kann es nicht für Sie wiederherstellen — notieren Sie es an einem sicheren Ort."
— Eingabe-Feld „Passwort" mit Wiederholungs-Feld „Passwort bestätigen".
— Primärer Button: „Passwort setzen und speichern →".
— Sekundärer Button: „Abbrechen" (führt zurück in den vorherigen Kontext, ohne Passwort zu setzen).

Nach erfolgreicher Passwort-Setzung wird der In-Memory-State verschlüsselt auf den Stick geschrieben. Der Topbar-Hinweis verschwindet.

---

## Konsequenzen

**Positiv.**

— Niedrigschwelliger Erst-Eintritt: Bürgerin kommt sofort rein, kann erkunden, kann eintragen.
— Mission-Versprechen 1 bleibt: Vivodepot speichert nie Klartext auf den Stick.
— Ehrlich kommunizierbar: „Vor Passwort lebt es im Browser, nach Passwort verschlüsselt auf dem Stick."
— Schließen-Disziplin schützt vor versehentlichem Daten-Verlust.
— Erst-Eintrag-Toast klärt frühzeitig auf, bevor die Bürgerin emotional engagiert ist.

**Negativ.**

— Die heute im Working Tree existierende `stufe1-neue-datei-overlay`-Logik wird rückgebaut. Klumpen-1-Code muss gewichtig überarbeitet werden.
— Auto-Save und alle Persistierungs-Pfade müssen konditional gestellt werden — eine technisch gewichtig Änderung.
— `beforeunload`-Mechanismus muss zuverlässig sein — Browser-spezifisch.
— Bürgerin muss verstehen, dass „keine Passwort = Daten weg" — die Disziplinen eins, zwei, drei tragen das, aber es ist eine kognitive Last.
— `stufe1-neue-datei-overlay` aus Klumpen 1 muss explizit zurückgebaut werden, sonst Patchwork.

---

## Verwerfung der Alternativen

**Architektur eins (Passwort sofort).** Bauch-Test: „Ich würde sofort aufhören." Wenn schon eine mit dem Projekt vertraute Person scheitert, scheitert die Bürgerin erst recht. P-8 (Niedrigschwelligkeit) gebrochen.

**Architektur zwei (Klartext bis Passwort).** Mission-Versprechen 1 wird im Zeitfenster zwischen Eintritt und Passwort-Setzung verletzt. Pilotpartner und rechtliche Beratung können nicht sagen „Vivodepot speichert nur verschlüsselt". Daten-Schutz-rechtlich riskant.

**Architektur drei (Demo-Modus ohne Datei).** Verschiebt die Hürde nur. Bürgerin erkundet im Demo, will dann anfangen, steht wieder vor der Passwort-Hürde. Plus: zwei UI-Welten (Demo und Realität) sind eine kognitive Belastung.

---

## Validierung und Prüf-Trigger

**Validierung in Klumpen 1b** (neuer Klumpen, der die heutige Klumpen-1-Kern nach Architektur vier umbaut):

Akzeptanz-Liste:

— [ ] Bei Erst-Eintritt mit leerer Datei: kein Passwort-Setzen-Bildschirm. Direkt Welcome-Modal mit drei Buttons.
— [ ] Topbar-Hinweis „Ihre Daten sind noch nicht dauerhaft gespeichert. [Passwort setzen →]" ist sichtbar, solange kein Passwort gesetzt ist.
— [ ] Bürgerin kann Anlass wählen und Daten eintragen, ohne Passwort.
— [ ] Beim ersten Feld-Eintrag erscheint einmal der Erst-Eintrag-Toast.
— [ ] Beim Klick auf App-internen Schließen-Button erscheint das Schließen-Warnungs-Modal.
— [ ] Bei Browser-Tab-Schließen erscheint die `beforeunload`-Warnung.
— [ ] Bei „Trotzdem schließen": App wird beendet, Daten sind weg.
— [ ] Bei „Passwort setzen": Passwort-Setzungs-Modal erscheint, Passwort kann gesetzt werden, danach Daten verschlüsselt auf Stick.
— [ ] Topbar-Hinweis verschwindet nach erfolgreicher Passwort-Setzung.
— [ ] Notfall-Button trägt Wortlaut „Für Sanitäter — Akut-Daten ohne Passwort".
— [ ] Reload der HTML-Datei *vor* Passwort-Setzung: Daten sind weg (kein versehentliches Persistieren).
— [ ] Reload der HTML-Datei *nach* Passwort-Setzung: Datei ist verschlüsselt auf Stick, Stufe-1-Welcome (`crypto-overlay`) erscheint.

**Prüf-Trigger zur Neu-Bewertung dieser ADR.**

— Wenn Beta-Tester die Schließen-Warnung als unklar oder die Daten-Verlust-Logik als überraschend melden — Disziplin zwei und drei wurden nicht klar genug umgesetzt.
— Wenn ein Sicherheits-Audit zeigt, dass durch einen Browser-Bug oder eine technische Lücke doch Klartext auf den Stick gelangt — Disziplin vier ist nicht zuverlässig.
— Wenn der Erst-Eintrag-Toast (Disziplin drei) als störend empfunden wird — Wortlaut oder Erscheinen anpassen.

---

## Auswirkung auf andere Cluster und ADRs

— **Klumpen 1:** Die heute im Working Tree existierende `stufe1-neue-datei-overlay`-Logik wird rückgebaut. Klumpen 1 ist *nicht* abgenommen — ein neuer Klumpen 1b setzt diese ADR um.
— **Cluster A.1 (Vorname überspringbar):** bleibt aktiv, aber Vornamen-Schritt verschiebt sich. Er erscheint *nach* der ersten Daten-Erkundung, nicht *vor*. Oder er entfällt ganz und die Bürgerin trägt den Vornamen im Bereich „Identität & Person" ein, wann sie will.
— **Cluster A.3 (Passwort-Text):** wird zum „Passwort-Setzungs-Modal-Text" — derselbe Wortlaut, anderer Kontext.
— **Cluster C.1 (Notfall-Tür immer sichtbar):** bleibt aktiv, Wortlaut wird zu „Für Sanitäter — Akut-Daten ohne Passwort".
— **B16-ADR-061v2 (Zwei-Stufen-Cache):** unverändert. Die Stufe-2-Vertrauens-Passwort-Architektur ist unabhängig von der Erst-Eintritts-Frage.
— **B16-ADR-099 (Stufe-1-Plain-Cache final):** unverändert. Der Plain-Cache wird *nach* Passwort-Setzung gefüllt, wie bisher spezifiziert.
— **ADR Modus-Wechsel-Disziplin (24.05.):** unverändert. Die vier Modi und ihre Farb-Semantik gelten unabhängig.

---

## Offene Implementations-Fragen

Diese Fragen sind nicht in der ADR entschieden — die technische Abstimmung klärt sie bei der Implementation:

— **`beforeunload`-Zuverlässigkeit.** Browser-Standard erlaubt nur eingeschränkte Dialog-Sprache. Reicht der Browser-eigene Dialog, oder braucht es eine zusätzliche In-App-Warnung *vor* dem Tab-Schließen?
— **Auto-Save-Pfade.** Welche existierenden Pfade müssen konditional gestellt werden? Eine Code-Inventur ist nötig.
— **Verschlüsselungs-Schlüssel-Lifecycle.** Wo wird der Schlüssel im Speicher gehalten? Wie wird sichergestellt, dass er beim Reload ohne Passwort *nicht* persistent ist?
— **Erst-Eintrag-Toast-Trigger.** Welcher Daten-Eintrag löst den Toast aus — das erste Tippen, das erste „Speichern"-Click, das erste verlassene Feld?
— **Test-Strategie.** Wie wird die „keine Klartext-Persistierung"-Disziplin durch Tests abgesichert?

---

*Vivodepot v1.0 · ADR Erst-Eintritts-Architektur und Verschlüsselungs-Disziplin · 24. Mai 2026 · Akzeptiert · Trägt Architektur vier: sofortiger Eintritt, Speicher-mit-Passwort, vier Disziplinen für Mission-Treue und Niedrigschwelligkeit.*
