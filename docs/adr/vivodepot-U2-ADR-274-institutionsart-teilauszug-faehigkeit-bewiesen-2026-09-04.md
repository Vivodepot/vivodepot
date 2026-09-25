# U2-ADR-274: institutionsArt — die Auszugs-Fähigkeit bewiesen, der native Bestand unangetastet

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** VORBEREITUNG, KORREKTHEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-142 (Institutions-Arten von außen erweiterbar — der Registerzugang selbst),
U2-ADR-275 (Voraussetzung: `INSTITUTION_ART_EINGEBAUT` entkoppelt), U2-ADR-246/-250/-251
(Situationen/Assistenten/Ereignis-Achse werden andockbar — dasselbe Nachweis-Niveau).
**Anker:** Auftrag „bau den Teil-Auszug" (04.09.2026, im Rahmen der Paket-5-Messung
zur Teilauszugs-Fähigkeit von institutionsArt), gebaut nach Absprache
mit `86` (Identitätsprobe) sowie zu Umfangsfrage und Signatur-Grenze.
**Status heute:** gilt — Beleg `tests/paket5-institutionsart-teilauszug-beweis.test.js`.

---

## Was dieser ADR NICHT ist

Der Name „Teilauszug" legt nahe, die zwölf nativen Institutions-Arten seien jetzt tatsächlich
aus dem Kern entfernt und lägen in einem Modul. **Das ist nicht der Fall.**
`INSTITUTION_ART`/`INSTITUTION_ART_EINGEBAUT` sind nach diesem Commit unverändert vorhanden,
byte-identisch zum Stand vor diesem ADR (abgesehen von der Entkopplung aus U2-ADR-275, die
selbst keine sichtbare Änderung ist).

## Der Grund: eine Signatur-Grenze, die vorher niemand benannt hatte

Aus einem internen Konzeptdokument vom 03.09.2026, Nachtrag „Provisionierung
vs. Ladeweg" (03.09.2026 abends), wörtlich:

> „Wird das Bürgerdepot ein echtes Modul im Sinne der Runtime-Mechanik (nicht nur im
> Vokabular), braucht es ein von Vivodepot selbst gegen den eigenen Anker signiertes Bündel …
> Es liefe dann als `pruefstufe: 'intern'` ein, identisch zu jedem anderen Vivodepot-eigenen
> Modul." … „Kein zweiter, schwächerer Pfad."

Dasselbe Dokument beantwortet auch, wer diesen Schritt ausführt: das ausführende Werkzeug darf
ohnehin nie mit Schlüsselmaterial umgehen (stehende Regel) — welcher der beiden Wege gewählt
wird, entscheidet, WER den Signierschritt künftig ausführt, nicht nur wie er technisch aussieht.

**Zwei unabhängige Konsequenzen, keine davon eine Vermutung:**

1. Ein ECHTER, laufzeit-eingelassener institutionsArt-Modul-Inhalt bräuchte ein signiertes
   Bündel — es gibt keinen ungeprüften Nebenweg, ohne die bestehende Kryptoprüfung
   (`modulEinlassenGeprueft`) zu unterlaufen, was ausdrücklich nicht in Frage steht.
2. **Diese Sitzung darf diesen Schritt nicht selbst ausführen.** Nicht aus Vorsicht — aus einer
   harten, stehenden Regel.

**Der Betriebsweg der Signierung — bei jedem Build automatisch, oder einmalig gepflegt und Teil
der Auslieferung — ist außerdem eine offene Betriebsentscheidung, keine
technische Frage, die dieser ADR beantworten könnte.** Er entscheidet, WER künftig signiert,
nicht nur wie.

**Damit hat „das Bürgerdepot aus dem Kern herausnehmen" zwei unabhängige Blocker, nicht einen:**
den `tpl_`-Präfix-Riegel (Feld-Ebene, s. Paket-5-Messung) und diese Signaturfrage (Modul-Ebene).
Sie haben nichts miteinander zu tun — die eine ist mit Feldern gelöst, die andere bleibt offen,
unabhängig davon, was mit `tpl_` geschieht.

## Was hier stattdessen bewiesen wird

**Dasselbe Niveau wie U2-ADR-246/-250/-251:** der Registerzugang wird geöffnet UND geprüft,
der native Bestand bleibt liegen. Konkret: eine zur Testzeit erzeugte Kopie von
`vivodepot.html`, in der `INSTITUTION_ART_EINGEBAUT` geleert ist (die simulierte
Nach-Extraktions-Lage), erhält über den echten, ungekürzten Registrierungsweg
(`data.institutionsArten[]` → `_institutionsArtenAusDepotAnmelden` →
`institutionsArtModulPruefen`/`-Einbetten`) ein Modul mit exakt den zwölf heutigen Kennungen
und Beschriftungen. **Die einzige sichtbare Fläche — die Dropdown-Optionsliste in
`_institutionFelder` — ist danach byte-identisch zur Referenz aus dem echten, unveränderten
Kern.** Keine Mock-Funktion, kein `institutionsArtenAlle()`-Stub — derselbe Code-Pfad, den ein
echtes Modul auch nähme, nur mit einem unsignierten Test-Bündel statt einem signierten.

**Warum die sichtbare Fläche so klein ist, und das kein Zufall der Bequemlichkeit ist:** bereits
in der Paket-5-Messung gefunden — `art` wird beim Export als roher String herausgegeben, nie als
aufgelöstes Label (`verweisExportFelder`); `institutionsArtLabel()` wird nirgends außer in
`institutionsArtenAlle()` selbst aufgerufen; die Beschriftungen kommen ohnehin zuerst aus dem
(hier unangetasteten) Textsatz. Der Dropdown ist die einzige Stelle, an der der Unterschied
zwischen „nativ" und „moduliert" für eine Bürgerin überhaupt sichtbar werden könnte.

## Entscheidung

Kein Entfernen des nativen Bestands. Ein Beweis, geführt gegen eine Testkopie, nicht gegen die
ausgelieferte Datei — s. `tests/paket5-institutionsart-teilauszug-beweis.test.js` für die
technische Ausführung (temporäre Kernkopie, `KERN_HTML_PATH`-Override, aufgeräumt nach dem
Lauf).

**Der Zugang ist bewiesen offen, die Signierfrage ist eine andere Ebene** — diese Trennung ist
der eigentliche Ertrag dieses ADR, nicht ein fertiges Modul.

## Konsequenzen

Keine sichtbare Änderung für eine Bürgerin, keine Änderung am ausgelieferten `vivodepot.html`
über die Entkopplung aus U2-ADR-275 hinaus. Als offener Punkt festgehalten: zwei unabhängige
Blocker für „Bürgerdepot als Modul", `tpl_` (Feld-Ebene) und die Signierfrage (Modul-Ebene,
Betriebsentscheidung + Schlüsselmaterial-Grenze) — beide vorher unbenannt, jetzt beide
schriftlich.

## Konformität

```konformitaet
aussage:   eine zur Testzeit erzeugte Kernkopie mit geleertem INSTITUTION_ART_EINGEBAUT liefert,
           nachdem ein Modul mit den zwölf heutigen Kennungen und Beschriftungen über den echten
           Registrierungsweg angemeldet wurde, in der Institutions-Auswahlmaske dieselben zwölf
           {wert,label}-Paare in derselben Reihenfolge wie der unveränderte, native Kern.
zustand:   prüfbar
pruefung:  tests/paket5-institutionsart-teilauszug-beweis.test.js#[Paket5·institutionsArt·Beweis] Dropdown-Optionsliste ist byte-identisch, ob nativ oder vollständig moduliert
quelle:    fund
```

---
*Vivodepot GmbH · Berlin · U2-ADR-274 · 04.09.2026*
