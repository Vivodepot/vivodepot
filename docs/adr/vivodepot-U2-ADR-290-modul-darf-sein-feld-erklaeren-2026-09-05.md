# U2-ADR-290: Ein Modul darf sein eigenes Feld nicht nur benennen, sondern auch erklären

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Kategorie:** GERÜST, BAUKASTEN
**Drei-Anker:**
- **Code-Stelle:** `_istModulfeldKennung` in `vivodepot.html` — die Rolle wird beim AUFRUF gegen
  `TEXTSATZ_ARTEN_FELD` geprüft statt in der Form verdrahtet. Probe:
  `tests/modulfeld-rollen.test.js`.
- **ADR-Bezug:** U2-ADR-282 (die Erste-Partei-Zone, dieselbe Form: der Rand ist die Grenze, nicht
  die Erlaubnis), U2-ADR-037 (die Namensraum-Härtung, die unberührt bleibt).
- **Status heute:** gilt — fünf Proben, darunter ein Rot-Beweis, eine **Umkehrung** (keine Rolle
  ohne Abholer) und eine **Ratsche** gegen das Auseinanderlaufen zweier Listen.

---

## Der Befund

Das Anforderungspapier setzt den Abnahmetest für das Gerüst:

> **Wenn ein Autor aus dem Baukasten nicht bauen kann, was das Bürgerdepot heute kann, ist das
> Gerüst nicht fertig — egal wie neutral seine Namen klingen.**

Benannt, woran das hängt: *„Den besonderen Charme des Bürgerdepots machen auch
die vielen kleinen Hilfestellungen und Erklärtexte aus. **Auch die Prompts in den Feldern
selber.**"*

**Gemessen war der Stand:**

```
ein Modul durfte an seinem eigenen Feld:   label · hint
der eingebaute Bestand nutzt:              label 1174 · beispiel 357 · hint 187 · …
```

**`beispiel` ist die zweithäufigste Rolle im ganzen Satz — und genau das sind die Prompts im
Feld.** Ein Autor konnte sein Feld **benennen, aber nicht erklären.**

### Was der Befund NICHT war — eine Korrektur im eigenen Haus

**Zuvor war gemeldet worden, ein Fremdmodul könne Felder bringen, „aber keine Namen dafür".** Das
war **falsch** und wurde vor der Planung zurückgenommen: `label` und `hint` gingen längst. Die
Regex war gelesen, ihre Wirkung falsch zusammengefasst.

**Die Wand stand also schmaler, aber sie stand** — und sie steht dort, wo der Wert liegt:
**nicht bei den Namen, sondern bei den Erklärungen.**

---

## Die Entscheidung

**Die Rollenliste wird abgeleitet, nicht aufgezählt.**

```
vorher   /^…\.tpl_…\.(label|hint)$/            zwei Rollen, fest verdrahtet
jetzt    Form prueft die STRUKTUR,
         die ROLLE wird beim Aufruf gegen TEXTSATZ_ARTEN_FELD geprueft
```

**Die Regel in einem Satz:** *Was der Kern an einem FELD abholt, darf ein Modul an seinem EIGENEN
Feld setzen.*

**Warum abgeleitet:** eine zweite Liste neben `TEXTSATZ_ARTEN_FELD` liefe auseinander, sobald eine
Rolle dazukommt — **und die Abweichung wäre still.** Eine eigene Probe hält beide gegeneinander.

**Warum im Funktionskörper und nicht im Initialisierer:** `TEXTSATZ_ARTEN_FELD` entsteht rund 500
Zeilen weiter unten. Ein `const`-Initialisierer liefe in die temporale Totzone — **dieselbe
Vorsicht, die der Kommentar am `tpl_`-Literal darüber aus einem gemessenen Grund schon übt.**

**Fail-closed:** fehlt die Liste, gilt der alte, engere Stand (`label`, `hint`). **Nie „im Zweifel
erlauben".**

### Was ausdrücklich NICHT dazugehört

**`hinweis` und `vorschlaege` stehen NICHT in `TEXTSATZ_ARTEN`** — sie sind übersetzbar, aber über
andere Schlüsselformen: `dokument.<typ>.hinweis` (Dokument-Weg) und `feld.<feldId>.vorschlaege`
(Datalist, bewusst ohne `sektorId`). Der Knoten-Füller holt `<sektorId>.<feldId>.<art>`; über diese
Form sind beide gar nicht erreichbar. **An den Aufrufen gemessen, nicht angenommen** — ein früherer
Entwurf dieses ADR behauptete, sie stünden im Satz und würden nur nicht abgeholt. Das war falsch.

**Sie einzulassen wäre „angenommen und wirkungslos"** — genau die Klasse, gegen die der bestehende
Kommentar an derselben Stelle schreibt. **Beinahe wäre sie hier gebaut worden:** ein früherer
Vorschlag desselben Tages wollte `hinweis` an einem Feld erlauben, und der Text wäre durch jede
Prüfung gegangen und nie erschienen.

**Assistenten-Rollen** (`frage`, `hilfetext`, `einleitung`, `toast`) gehören an den Assistenten,
nicht ans Feld — die Trennung stammt nicht von hier, sie stand schon.

---

## Die Sicherheitsgrenze bleibt unberührt

**Erlaubt ist mehr über das EIGENE Feld — nicht ein Feld mehr.**

```
identitaet.tpl_meinfeld.beispiel   ANGENOMMEN   das eigene Feld, abgeholte Rolle
identitaet.neuesfeld.beispiel      abgelehnt    ohne tpl_ waere es eine Kern-Kennung
identitaet.neuesfeld.label         abgelehnt    dito
strings:speichern.text             abgelehnt    der STRINGS-Namensraum bleibt zu
identitaet.tpl_meinfeld.erfunden   abgelehnt    keine abgeholte Rolle
```

**Der `tpl_`-Präfix bleibt der Riegel; nur der Rollenteil der Form wurde geöffnet.**

---

## Was die Proben halten

- **Rot-Beweis:** fremde und Kern-Kennungen bleiben abgelehnt — das ist die Grenze, nicht die
  Erlaubnis.
- **Umkehrung:** keine Rolle wird angenommen, die am Feld niemand abholt. **Diese Probe macht den
  Fehler unmöglich, den dieser Bau beinahe gemacht hätte.**
- **Ratsche:** jede Rolle aus `TEXTSATZ_ARTEN_FELD` muss durchkommen. Laufen die Listen
  auseinander, wird sie rot — statt dass jemand es bemerkt.
- **Positivkontrolle:** die Prüf-Hilfsfunktion meldet nachweislich auch `true`. **Ohne sie sagten
  alle Ablehnungen oben nichts.**

---

## Was offen bleibt

- **Ob die abgeholten Rollen für den Abnahmetest genügen.** `beispiel` und `platzhalter` sind
  jetzt möglich; ob ein Autor damit baut, „was das Bürgerdepot heute kann", ist **nicht gemessen**
  — das ist der Baukasten-Test selbst und eine eigene Arbeit.
- **`hinweis` am Feld.** Er wäre heute wirkungslos. Sollte er wirken, gehört die Rolle zuerst in
  den Abhol-Weg — **dann folgt die Erlaubnis von selbst, ohne dass hier etwas zu ändern wäre.**
- **Die Whitelist-Asymmetrie bei Unterfeld-Schlüsseln** (`verborgenWenn`, `marken` fehlen, obwohl
  der Kommentar „wörtlicher Spiegel" verspricht) bleibt unbehoben — **eigener Gegenstand.**

---

*Vivodepot GmbH · Berlin · 05.09.2026*
