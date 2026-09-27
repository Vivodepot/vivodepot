# U2-ADR-396 — Die KI-Verfügung wird selbst übersetzt: Vivodepot ist hier Autor, nicht Träger

**Status heute:** gilt
**Datum:** 08.09.2026
**Auftrag:** Entscheidung, wörtlich übergeben: „KI-Verfügung übersetzen — das
ist keine amtliche Vorlage."

## Ausgangslage

`tools/lib/deutsch-leck-erlaubnisliste.js` (U2-ADR-369) hielt die 28 Kennungen der
KI-Verfügung (16 `dok:ki-verfuegung#…`-Wortlautstellen + 12 `kiKorpus#…sektion`-Rubriktitel
im Formular) in einer eigenen Gruppe `KI_VERFUEGUNG_WIRKSAMER_TEXT`, mit derselben Begründung
wie Gruppe 1 (`AMTLICHER_WORTLAUT_BMJ`): „wirksamer Text, keine festgestellte englische
Fassung — keine eigene Übersetzung ohne amtliche englische Fassung."

Das war ein Fehlschluss. [[project_immer_amtliche_fassung_kein_eigener_content]] — die Regel,
aus der diese Zurückhaltung stammt — gilt für Fälle, in denen **Vivodepot Träger eines
amtlichen Textes ist, nicht dessen Autor** (Patientenverfügung/Vorsorgevollmacht: BMJ-Wortlaut,
Gruppe 1). Für die KI-Verfügung gibt es kein amtliches Muster, keine Behörde, die sie
herausgibt. Es ist Vivodepots **eigenes** Template. Vivodepot ist hier selbst der Autor — und
darf darum auch selbst übersetzen, ohne fachliche Feststellung, ohne zweiten Prüfweg.

## Entscheidung

Die 28 Kennungen sind aus der Erlaubnisliste entfernt (270 → 242) und in
`tools/textsatz-en-modul.json` **echt übersetzt** — nicht durch eine Lesehilfe daneben ersetzt,
sondern als der eigentliche englische Text an derselben Kennung.

Gruppe 1 (106, amtliche BMJ-Wortlaute) und die (jetzt) Gruppe „Code/Eigenname/Format" (112)
bleiben unverändert in der Liste — dort ist Vivodepot weiterhin Träger, nicht Autor, die
Feststellungspflicht gilt unverändert.

## Übersetzungsgrundsatz

Übersetzt wurde der **Text**, nicht seine Wirkung: die KI-Verfügung ist eine Erklärung der
Bürgerin über ihre eigene digitale Nachbildung, kein Werbetext. Wortnah am deutschen Original,
keine Umformulierung, keine Glättung. Ein Satzfragment (`…einleitung`, das in eine Liste
mündet) bleibt ein Satzfragment, keine vollständige Übersetzung, die den Anschluss verlöre.

## Drei Stellen, an denen Englisch und Deutsch nicht wortgleich abbilden — benannt, nicht
## stillschweigend geglättet

1. **„Zweckbindung"** (Rubriktitel 1) → *purpose limitation*. Kein wörtliches Cognate im
   Englischen vorhanden („purpose binding" existiert nicht als feststehender Begriff);
   „purpose limitation" ist der etablierte englische Rechts-/Datenschutzbegriff für exakt
   diesen Sachverhalt (derselbe, den die DSGVO in ihrer offiziellen englischen Fassung für
   „Zweckbindung" verwendet) — eine bewusste Wahl eines etablierten Fachbegriffs, keine freie
   Umschreibung.
2. **„weltanschauliche Aussagen"** (§1) → *ideological statements*. „Weltanschaulich" ist im
   Deutschen breiter als „ideological" im Englischen (schließt religiöse/philosophische
   Weltsicht mit ein, nicht nur politisch-ideologische Positionen) — eine leichte Verengung
   zugunsten der Lesbarkeit. Die Rechtsfolge (Ausschluss von Werbung/Politik/Weltanschauung
   aus der Nutzung der Nachbildung) bleibt dieselbe; nur der Begriffsumfang ist im Englischen
   eine Spur enger als im Original.
3. **„formlos … widerrufen oder ändern"** (§5) → *without any particular form*, NICHT
   *informally*. Im deutschen Recht bedeutet „formlos" konkret: keine vorgeschriebene
   Rechtsform nötig (keine Schriftform, keine Notarisierung) — eine rechtliche Aussage über
   die FORM. „Informally" trüge im Englischen eher eine Konnotation von Beiläufigkeit/
   Nachlässigkeit, die dem deutschen Begriff fehlt. Bewusst die längere, aber rechtlich
   präzisere Formulierung gewählt.

Alle anderen 25 Kennungen sind wörtliche, strukturgleiche Übersetzungen ohne Bedeutungs- oder
Rechtsfolgen-Verschiebung.

## Konsistenz mit dem übrigen EN-Modul

`dok:ki-verfuegung#…` und `dokument.ki-verfuegung.name` verwendeten bereits vor diesem Zug
„directive" für „Verfügung" (z. B. `situation:todesfall-uebernahme#digitale-nachbildung-ki-
verfuegung.titel`: „Digital recreation (AI provision)"; `dokument.ki-verfuegung.name`:
„Directive on digital recreation") — dieselbe Terminologie wurde für die 28 neu übersetzten
Kennungen durchgehalten, nicht neu erfunden.

`tools/textsatz-en-begriffe-pruefen.js` (der Glossar-Wächter, der bei den 17
Vollmacht-Kurzlabels drei von siebzehn als Rückfälle in eigene Entscheidungen fing)
lief gegen den vollständigen Bestand NACH diesem Zug: **0 Verstöße gegen die 7 festgelegten
Glossar-Begriffe** (Klasse 4), **keine der 28 neuen Kennungen** erscheint unter den 40 Fällen
von Klasse 2 (Uneinheitlichkeit — ein deutscher Ausgangssatz mit mehreren, widersprüchlichen
englischen Fassungen an verschiedenen Kennungen). Der Wächter griff diesmal nicht, weil es
nichts zu greifen gab — geprüft, nicht angenommen.

## Nachweis

- `tests/u2-adr-369-deutsch-leck.test.js` — die scharfe Abnahme: reale Deutsch-Leck-Menge
  gegen die Erlaubnisliste entspricht exakt (242, nicht mehr, nicht weniger).
- `tools/textsatz-en-begriffe-pruefen.js` — 0 Glossar-Verstöße, keine neue Uneinheitlichkeit.
- `tools/lib/deutsch-leck-erlaubnisliste.js` — Gruppe `KI_VERFUEGUNG_WIRKSAMER_TEXT` entfernt,
  nicht stillschweigend gelöscht: der Kopf-Kommentar trägt den Nachtrag mit Datum, Grund und
  Verweis hierher (dieselbe Konvention wie u2-106 „Entscheidungen abgelöst oder vermerkt").

## Was NICHT betroffen ist

Gruppe 1 (`AMTLICHER_WORTLAUT_BMJ`, 106 Kennungen — Patientenverfügung/Vorsorgevollmacht) und
die Code/Eigenname/Format-Gruppe (112) bleiben unverändert. Die Unterscheidung Träger/Autor
gilt fort — dies ist keine allgemeine Lockerung der Feststellungspflicht, sondern die korrekte
Anwendung ihrer eigenen Grenze auf einen Fall, der von Anfang an außerhalb ihres Geltungsbereichs
lag.
