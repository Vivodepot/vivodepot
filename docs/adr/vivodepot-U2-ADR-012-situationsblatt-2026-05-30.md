# U2-ADR-012: Situationsblatt-Architektur — eine Wahrheit für Anlässe, generische `sensibel`-Property

**Status:** Akzeptiert · Situationsblatt-Code gebaut (Nachtrag 04.08.2026: `SITUATIONEN`
(`vivodepot.html:5889`) und `SITUATION_BY_ID`/`renderSituation` sind mit 24 Fundstellen im Kern
verdrahtet — nach einer Erhebung vom 04.08.2026 selbst nachgemessen; reine Statuskorrektur, keine
inhaltliche Überarbeitung)
**Datum:** 30.05.2026
**Kategorie:** ARCHITEKTUR, UX, DATENMODELL
**Cross-Referenz:** U2-ADR-005 (Urheberschaft pro Eintrag), U2-ADR-006 (Andock, Code-Slot pro Feld), U2-ADR-008 (Propagation, `CROSS_SEKTOR_FELDER` als Vorbild für `SITUATION_FELD_EXPORT`), U2-ADR-011 (Auto-Save beim Bereichs-Wechsel). Produktiv-Bezug: Anlässe-Katalog (4.7), veröffentlichte Website-Anlässe.

> **Teil-Ablösung (23.07.2026):** Für den Bereich der **Angehörigen-Situationsblätter** ist diese
> Entscheidung durch **U2-ADR-101** abgelöst — dort wird deren Feldsatz als Beschluss festgelegt,
> statt ihn dem Code zu überlassen. Die hier getroffene Aussage „die Freiheit liegt im Render und
> im Inhalt, nicht im Zuschnitt der Liste" gilt für diesen Bereich nicht mehr. **Nur die
> Angehörigen-Situationsblätter sind betroffen; alle übrigen Aussagen von U2-ADR-012 bleiben
> unberührt und in Kraft.**

**Status heute:** teilweise überholt durch U2-ADR-101 (nur Angehörigen-Situationsblätter betroffen,
s. Kasten oben) — im Übrigen gilt, bereits am 04.08.2026 selbst nachgemessen (s. Status-Feld oben).

---

## Kontext

Das Vivodepot hat zwei Orte, an denen „Anlässe" leben: die **veröffentlichte Website** (acht Anlässe, mit denen Bürger angesprochen werden) und die **App** (Situationsblätter, die Felder quer über die elf Bereiche bündeln). Ein frischer Entwurf hatte sechs eigene App-Situationen vorgeschlagen — ein eigener Schnitt. Das erzeugt zwei Wahrheiten: Was auf der Website „Anlass" heißt, hätte in der App einen anderen Zuschnitt. Sobald das auseinanderläuft, weiß niemand mehr, welche Liste gilt.

Parallel braucht das Situationsblatt — und später die Dokumenten-Mappe — eine Möglichkeit, einzelne Felder **am Bildschirm zu zeigen, aber aus Druck und Akut-Export herauszuhalten** (sensible Zugangsdaten, PINs, Passwort-Ablageorte). Das ist keine Situationsblatt-Eigenheit, sondern eine generische Feld-Tatsache, die an genau einer Stelle verankert gehört.

## Entscheidung

### 1. Situationen = die acht Website-Anlässe, eins zu eins

Die App übernimmt die acht Anlässe der Website mit gleichem Titel und gleicher Reihenfolge:

1. Bei der Geburt eines Kindes
2. Bei Volljährigkeit oder Auszug
3. Beim Hauskauf oder einer Heirat
4. Beim Notar oder bei der Bank
5. Einfach so — weil es Zeit wird
6. Vor einem Krankenhaus-Aufenthalt
7. Beim Einzug ins Pflegeheim
8. Im Erbfall

„Im Erbfall" ist das Nachlass-Blatt mit den 23 `erb_*`-Feldern aus dem Entwurf. **Die Freiheit liegt im Render und im Inhalt, nicht im Zuschnitt der Liste:** welche Sektor-Felder ein Blatt bündelt und welche situations-eigenen Felder es trägt, wird weiter selbst entworfen. Gesetzt ist allein der Satz der acht Situationen.

### 2. Datenmodell und Render

- **`data.situationen[…]`** trägt die situations-eigenen Werte. Sektor-Felder werden **zur Laufzeit gezogen, nicht kopiert** — eine Quelle bleibt eine Quelle.
- **Urheberschaft (U2-ADR-005) und Code-Slots (U2-ADR-006)** liegen im Situations-Namespace: was im Blatt eingetragen wird, ist gestempelt und andockbar wie ein Sektor-Feld.
- **Render als Karte mit Blöcken.** Sektor-gezogene und situations-eigene Zeilen werden gleich gerendert; ein **dezentes Quelle-Tag** zeigt die Herkunft.
- **Click-Through:** Klick auf eine sektor-gezogene Zeile öffnet den Sektor und scrollt zum Feld. Das ist die elegante Antwort auf „wo trage ich das ein?".
- **Eigene Felder direkt im Blatt eintragbar** (Auto-Save aus U2-ADR-011); Sektor-Felder sind im Blatt nur Lese-Sicht.

### 3. Zwei Modi

- **Eigener-Modus:** die acht Situationen oben, Charakter „Vorbereiten".
- **Angehörigen-Modus:** vier **Akut-Situationen** (Notarzt, Krankenhaus, Pflegeheim, Tod), „Meine Menschen" als Datenquelle, keine eigene Situation. Eigener, schlanker **Akut-Render-Pfad** mit System-Druck; sensible Felder erscheinen am Bildschirm, nicht im Druck.

Dass Krankenhaus/Pflegeheim/Tod thematisch mit den Eigenen-Situationen 6/7/8 überlappen, ist gewollt: verschiedener Modus (Vorbereiten gegenüber Akut), **getrennte ids** (`krankenhausvor` / `krankenhausakut`).

### 4. Generische `sensibel: true`-Property (Architektur-Anker)

Ein Feld mit **`sensibel: true`** erscheint am Bildschirm, aber **nicht im Druck und nicht im Akut-Export**. Diese Property ist **nicht situationsblatt-spezifisch** — sie wird hier als Architektur-Tatsache verankert und von der Dokumenten-Mappe (U2-ADR-013) übernommen, nicht neu erfunden.

### 5. Szenario-Briefe über `SITUATION_FELD_EXPORT`

Die Szenario-Briefe (Notarzt, Krankenhaus, Pflegeheim-Aufnahme, Todesfall) werden als Muster über eine deklarative Tabelle **`SITUATION_FELD_EXPORT`** angebunden — analog zu `CROSS_SEKTOR_FELDER` aus U2-ADR-008, nur mit einer Situation als Ziel statt eines Sektors.

## Konsequenzen

- **Eine Wahrheit für App und Website.** Die acht Anlässe sind der gemeinsame Anker. Eine künftige Situation (z. B. Trennung/Scheidung) ist **zuerst eine Website-Entscheidung, dann App** — nie umgekehrt.
- **Die Mappe erbt `sensibel`.** Sensible Felder verhalten sich überall gleich; ein Mechanismus, an einer Stelle verankert.
- **Click-Through beantwortet „wo eintragen".** Keine Doppel-Eingabe, keine Kopie — das Blatt ist eine Sicht, der Sektor bleibt die Quelle.
- **Provenance bleibt konsistent.** Urheberschaft und Code-Slots im Situations-Namespace heißt: auch im Blatt eingetragene Werte tragen Akteur und Zeitpunkt.

## Offen / Bau-Reihenfolge

- **„Einfach so — weil es Zeit wird"** ist die einzige nicht selbsterklärende Situation: kein Anlass, sondern ein niedrigschwelliger Einstieg. **Vorschlag vor Bau** dieses einen Blatts (Vermutung: eine ruhige Auswahl der wichtigsten Felder quer über die Bereiche, als „fangen Sie hier an").
- Reihenfolge: (1) Maschine-Erweiterung Situationen + Sidebar-Sektion, dann die acht Eigenen-Situationen (eine pro Commit; „Einfach so" erst nach Vorschlag). (2) Akut-Render-Pfad, dann die vier Akut-Situationen, dann Briefe-Anbindung über `SITUATION_FELD_EXPORT`.
- Nach jedem Kern-Schritt: Block-Hash und Suite-Stand melden, Stopp vor Commit, kein Push.
