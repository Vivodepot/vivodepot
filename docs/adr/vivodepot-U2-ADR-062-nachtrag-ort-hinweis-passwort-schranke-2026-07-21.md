# U2-ADR-062-Nachtrag · Vertrauens-Zugang — Ort-Hinweis und Passwort-Schranke

**Datum:** 21.07.2026
**Status:** Angenommen · gebaut 21.07.2026 (Commit `03805a3`, Suite 1521 grün, Block-Hash unverändert)
**Bezug:** ADR-061v3 · U2-ADR-062 (Vertrauensperson-Cache Stufe 2) · U2-ADR-078 (Klartext-Geschwister
entfernt) · U2-ADR-095 (Passwort-Lebenszyklus) · U2-ADR-090 (Präfix- und Benennungsregel) ·
Krypto-Architektur v0.6 · Verbatim-Block-Pin `8d31c678…`
**Status heute:** gilt — Beleg `tests/vertrauens-zugang-ort.test.js`.

---

## 0 · Zur Nummer (Benennung, U2-ADR-090)

Dieses Dokument trägt **keine eigene U2-Nummer**, sondern das Suffix `-Nachtrag` an der Nummer des
ADRs, auf das es sich bezieht. U2-ADR-090 §3 formalisiert das so: „Ein Nachtrag trägt die Nummer des
ADRs, auf das er sich bezieht, plus den Suffix `-Nachtrag`. Kein eigener Nummernschlitz."

Die Vorlage nannte im Kopf „nächste freie U2-Nummer, Vergabe gemäß U2-ADR-090" — das steht
im Widerspruch zu der Regel, die sie zitiert. Der Sonderfall U2-ADR-094 (eigene Nummer trotz
Nachtrags-Charakter) galt einer **linien-übergreifenden** Änderung an der eingefrorenen B16-Linie;
hier bleibt alles innerhalb der U2-Linie, also greift die Suffix-Konvention unmittelbar — wie bei
`vivodepot-U2-ADR-077-nachtrag-pdf-qr-2026-07-13.md`.

## 1 · Anlass

Der angezeigte Ablageort des Vertrauens-Passworts ist seit April 2026 Bestandteil der Sorge- und
Übergabe-Architektur: Eine Vertrauensperson, die das Depot in der Bürger-App über den
Stufe-1-Welcome-Link öffnet, soll **vor** der Passwort-Eingabe lesen können, wo das Passwort
physisch hinterlegt ist. Ohne diesen Hinweis steht sie im Ernstfall vor einem Eingabefeld, ohne zu
wissen, wo sie suchen soll — der Zweck der Funktion entfällt.

Der Gerätecheck vom 21.07.2026 hat gezeigt, dass die Anzeige **nie umgesetzt** war: Der Wert lag als
`data.angehoerigen_passwort_ort` innerhalb des Anker-Chiffrats und war damit vor der Entschlüsselung
technisch nicht erreichbar. Zugleich fiel auf, dass die Stärke-Anforderung an das
Vertrauens-Passwort härter ist als die an das Anker-Passwort.

## 2 · Beschluss A — Ort-Hinweis als Projektion im Umschlag

Der Ortstext wird als `angehoerigenOrt` unverschlüsselt in den Umschlag projiziert und im
Angehörigen-Anmeldeschirm der Bürger-App vor der Passwort-Eingabe angezeigt. **Führend bleibt** der
Wert im verschlüsselten Depot; der Umschlag trägt eine Projektion, die bei jedem Speichern neu
geschrieben wird. Damit können beide Stände nicht auseinanderlaufen, und bestehende Depots brauchen
keine Migration.

Randbedingungen: Die Projektion existiert **nur bei eingerichtetem Vertrauens-Zugang** und ist auf
200 Zeichen begrenzt. Sie überlebt den Anker-Passwort-Wechsel (U2-ADR-095), weil der Container über
`depotSerialisieren()` gebaut wird.

### Bewusst getragene Offenlegung

Der Ortstext ist **ohne jedes Passwort** aus der Depot-Datei lesbar. Wer die Datei in die Hände
bekommt, erfährt, wo das zweite Passwort liegt — nicht das Passwort selbst, aber den Weg dorthin.
Das ist der Preis der Anzeigbarkeit und unvermeidlich: Vor der Entschlüsselung kann die Anwendung
nur lesen, was unverschlüsselt vorliegt.

**Verhältnis zu U2-ADR-078**, das eine Klartext-Projektion beim `notfallCache` ersatzlos entfernt
hat: Dort ging es um Gesundheitsdaten der Bürgerin ohne funktionale Gegenleistung. Hier trägt die
Offenlegung eine Kernfunktion der Übergabe-Architektur, und der offengelegte Inhalt ist ein von der
Bürgerin frei gewählter Hinweistext, kein Personendatum. Die Wächter-Tests aus U2-ADR-078 werden um
dieses Feld **erweitert, nicht entschärft** — die Feldmengen-Prüfung bleibt exakt.

Konsequenz für die Nutzerführung: Der Einrichtungs-Dialog sagt ausdrücklich, dass die Angabe für
Angehörige sichtbar ist, damit die Bürgerin den Wortlaut bewusst wählt — „bei den Unterlagen" ist
etwas anderes als eine präzise Verstecksbeschreibung.

## 3 · Beschluss B — Stärke-Schranke angeglichen

Die zusätzliche Blockade bei schwacher Passwort-Stärke im Einrichtungs-Pfad entfällt. Es gilt
dieselbe Regel wie beim Anker-Passwort: Mindestlänge acht Zeichen, Stärke-Anzeige hinweisend, nicht
blockierend.

### Korrektur eines Irrtums, keine neue Abwägung

U2-ADR-062 begründete die Schranke mit „analog zum Depot-Passwort". Diese Annahme trifft nicht zu —
der Anker kennt nur die Grundprüfung (leer / unter acht Zeichen), seine Stärke-Anzeige blockiert
nicht. Es gab also nie einen Beschluss zur Asymmetrie, sondern eine falsche Annahme über den
Ist-Zustand. Die Angleichung stellt her, was der ADR ohnehin sagen wollte.

**Produktseitige Begründung:** Niedrigschwelligkeit ist nicht verhandelbar. Wer beim zweiten
Passwort scheitert, richtet den Vertrauens-Zugang gar nicht erst ein — kein Vertrauens-Zugang ist
für die Zielgruppe schlechter als ein mittelstarkes zweites Passwort.

**Gegenargument, das gültig bleibt:** Das Brute-Force-Argument aus dem Angreifer-Review trifft beide
Passwörter gleichermaßen; wer es verschärfen will, müsste den Anker anheben statt das
Vertrauens-Passwort abzusenken. Diese Frage bleibt offen und ist nicht Gegenstand dieses Nachtrags.

## 4 · Was ausdrücklich nicht gilt

Der Angehörigen-Eintritt liegt in der **Bürger-App**: Stufe-1-Welcome, Link „Als Angehörige öffnen →",
Vertrauens-Passwort, dann die Angehörigen-Auswahl-Sicht mit den fünf Situations-Kacheln
(Krankenhaus, Pflegeheim, Beerdigung und Nachlass, Behörden und Nachlass, Meine Menschen). Die
Lese-App kennt den Angehörigen-Modus nicht und **soll ihn nicht bekommen**. Diese Architektur steht
seit April 2026 und wird durch diesen Nachtrag nicht berührt.

## 5 · Konsequenzen

| Betrifft | Änderung |
| --- | --- |
| Krypto-Architektur, Container-Tabelle | `angehoerigenOrt` als unverschlüsseltes, optionales Umschlag-Feld aufnehmen |
| Krypto-Architektur, Bedrohungsmodell | Offenlegung des Ortstextes als eigene Zeile führen |
| Wächter-Tests aus U2-ADR-078 | Um das neue Feld erweitert, Begründung im Test dokumentiert |
| Notfall-Blatt | „Vivodepot-Leseprogramm" → „Vivodepot-App" korrigiert — die Angehörige braucht die Bürger-App |
| Einrichtungs-Dialog | Hinweis auf die Sichtbarkeit der Ortsangabe |

## 6 · Offen

- **Gerätecheck:** Anmeldeschirm mit und ohne hinterlegten Ortstext (nach dem nächsten Harness-Stand
  — v72 enthält diesen Bau noch nicht).
- **Grundsatzfrage Passwort-Stärke** (Anker anheben statt Vertrauen absenken) — eigene Entscheidung,
  nicht Teil dieses Nachtrags.

## 7 · Konformität

```konformitaet
aussage:   Beschluss A — der Ort-Hinweis (`angehoerigenOrt`) liegt unverschlüsselt im Umschlag,
           neben `ct`, nicht darin — lesbar vor jeder Passwort-Eingabe.
zustand:   prüfbar
pruefung:  tests/vertrauens-zugang-ort.test.js#[Klasse-A][ADR-062-N] Ort-Hinweis liegt im Umschlag — neben ct, nicht darin
quelle:    invariante
```

```konformitaet
aussage:   Beschluss B — ein „schwaches" zweites Passwort blockiert das Einrichten nicht mehr
           (nur eine Mindestlänge bleibt hart), dieselbe Regel wie beim Anker-Passwort.
zustand:   prüfbar
pruefung:  tests/vertrauens-zugang-ort.test.js#[Klasse-A][ADR-062-N] zweites Passwort: „schwach" blockiert nicht mehr, Mindestlänge bleibt
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
