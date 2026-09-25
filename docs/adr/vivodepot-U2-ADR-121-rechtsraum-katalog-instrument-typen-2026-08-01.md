# ADR — Rechtsraum-Katalog über den Instrument-Typen

**Status:** Angenommen und vollständig umgesetzt — sechs Züge, abgeschlossen 02.08.2026, alle zehn
Entscheidungspunkte gebaut und verifiziert (Commits s. „Bau-Stand" unter Konsequenzen).
**Ersetzt vollständig** die Fassung vom 01.08.2026
(erste Annahme, Posten 1–4 danach gebaut) — kein Nachtrag, weil noch nichts veröffentlicht ist.
**Datum:** 1. August 2026
**Grundlage:** Produktentscheidung
**Status heute:** gilt — `RECHTSRAUM_KATALOG` und `_rechtsraumKatalogLesen` im Kern vorhanden
(`vivodepot.html:14563`/`14638`), `tools/typ-menge-offen-pruefen.js`,
`docs/rechtsraum-modul/rechtsraum-modul-schema.json` und `docs/JURISDICTIONS.md` existieren, alle
sechs im Bau-Stand genannten Commits (`c16fdc4`…`14bea0d`) sind in der Historie vorhanden.
**Bezug:** PRINCIPLES.md Wurzel 2 (Infrastruktur zum Andocken) · zwei unabhängige interne Messungen
(27.07. und 01.08.2026, s. Kontext) · ADR-Tranche 1 vom 24.05.2026 (STRINGS-Map, `t(schlüssel)`) ·
U2-ADR-037 (Feld-Modell, „der Keller") · U2-ADR-051 (Code-Listen reisen als Daten) · U2-ADR-063
(`ref`/`liste` zurückgestellt) · interner Abgleich mit dem Feld-Modell (01.08.2026, s. Kontext) ·
externe Recherche Bedrohungsmodell (01.08., s. Punkt 10) · `docs/JURISDICTIONS.md` (02.08.2026,
Lokalisierungs-Landkarte für externe Mitwirkende, aus diesem ADR hervorgegangen)

**Nummer:** U2-ADR-121 (bereits vergeben, Fassung wird ersetzt — vor dem Commit prüfen, ob die
Nummer im Repo zwischenzeitlich weiterläuft).

---

## Kontext und Problem

„Lokalisierungsfähigkeit" ist zwei verschiedene Probleme, deren Vermischung bisher jede Klärung
verhindert hat.

Erstens **Text/UI** — 833 Inline-Strings, `STRINGS`-Block mit 764 Schlüsseln. Mit `t(schlüssel)`
existiert seit ADR-Tranche 1 (24.05.2026) bereits der Zugriffspfad für eine künftige
Locale-Umschaltung, nur ist sie nicht gebaut. Nicht Teil dieses ADR.

Zweitens **Rechtslogik** — die schwerere Hälfte, weil es keine Übersetzungsfrage ist, sondern
fremdes Recht, das Vivodepot inhaltlich nicht verantworten kann. Zwei unabhängige Messungen
(27.07.2026 und 01.08.2026) haben das konkretisiert: keine i18n-Ebene, kein Rechtsraum-Feld im
Datenmodell, `country_code: 'DE'` hart codiert im SD-JWT-VC-Adressexport (`sdJwtVcIdentitaet`,
`vivodepot.html:9431`) — bewusst außerhalb dieses ADR (Freigabe-Nachtrag Posten 2, 01.08.2026:
separates Formatfeld, keine Rechtswahl; aktueller Stand s. `docs/JURISDICTIONS.md`, Layer 5, statt
das hier ein zweites Mal zu führen). 43 BGB-Referenzen im Code, mehrere davon in Kontrollfluss statt nur in der
Anzeige: die Ehegattennotvertretungsfrist (§ 1358 BGB, sechs Monate, U2-ADR-109) ist eine feste
Berechnung; das Testament-Vorrangprinzip „neueste gewinnt" (§ 2258 BGB) ist Default-Programmlogik;
die Formvorschrift für ein gültiges Testament (§ 2247 BGB) ist in `formhinweis`/`herkunft` der
`STANDARD_VORLAGEN` verankert.

PRINCIPLES.md, Wurzel 2, verlangt Infrastruktur, „die sich an andere Sprachen und Rechtsräume
anpassen lässt, ohne zu fragen" — und nennt Immigration ausdrücklich als Zielthema. U2-ADR-037 hat
für einen benachbarten Fall (neue Themenfelder, Formulardaten) bereits ein Fundament gebaut: drei
„nicht nachrüstbare" Anforderungen (Versions-Marke, stabile Slot-IDs, offenes Typ-System) unter dem
Namen „der Keller". Die erste Fassung dieses ADR (01.08., vormittags/mittags) hat einen eigenen
Katalog entworfen, ohne gegen dieses Fundament zu prüfen — der Abgleich (01.08. abends) hat
gezeigt: teilweise dieselbe Grundhaltung nötig, teilweise bewusst andere Regeln, weil Rechtsinhalt
sich anders verhält als Bürger-eingegebene Formulardaten.

Ein zweiter, in der ersten Fassung übersehener Punkt: Rechtsraum ist keine Eigenschaft, die ein
Depot einmalig hat. Eine Person mit Bezug zu zwei Ländern (Immigration, bereits als Zielszenario in
PRINCIPLES.md benannt) kann gleichzeitig gültige Dokumente aus zwei Rechtsräumen benötigen — nicht
nacheinander, sondern nebeneinander.

Ein dritter Punkt, aus einer gezielten Recherche zu Rechtsräumen mit repressiven Staatsstrukturen
(01.08.): Rechtsraum-Metadaten können selbst zum Risiko werden, unabhängig vom Inhalt des
Dokuments — s. Punkt 10.

**Frage:** Wie wird der Rechtsraum ein austauschbarer, erweiterbarer, mehrfach gleichzeitig
gültiger Parameter, ohne dass Vivodepot fremdes Recht inhaltlich liefert oder verantwortet, ohne
Bürgerinnen in gefährdeten Kontexten neuen Risiken auszusetzen, und ohne dieselbe Bestandsaufnahme
ein drittes Mal zu wiederholen?

---

## Entscheidungs-Treiber

- **Werkzeug-Charakter / Wurzel 2 — ermöglichen, nicht liefern.** Vivodepot baut den
  Andock-Mechanismus. Den Inhalt eines fremden Rechtsraums liefert, wer ihn braucht.
- **EUPL-1.2 als Voraussetzung.** Nur wer andocken darf, kann einen eigenen Katalog beitragen.
- **Single Source of Truth.** `typ` bleibt der stabile persistierte Identifier für bestehende
  Instrumente — keine Schema-Änderung an bestehenden Depots durch die Umbenennung von Werten.
- **Zeitachse vor v1 (PRINCIPLES.md).** Struktur wird vor v1 gebaut, Inhalt fließt danach.
- **Jetzt oder nie fürs Datenmodell.** Solange keine Bürger-Depots im Feld sind, sind
  Datenmodell-Änderungen günstig. Danach werden sie zu Migrationen auf echten Bürgerdaten. Das
  betrifft insbesondere den Instrument-Stempel und die offene Typ-Menge unten — beides ist nach
  Auslieferung nicht mehr ohne Bestandsrisiko nachrüstbar.
- **Gleiche Fundamentgarantien wie der Rest der App.** Was für Formularfelder gilt (Versions-Marke,
  stabile Schlüssel, Unbekannt-Skip statt Absturz), soll auch für Rechtsinhalt gelten — nicht, weil
  es dieselbe Pipeline ist, sondern weil es dieselbe Art von Verlässlichkeit ist.
- **Bedrohungsmodell ernst nehmen, ohne falsche Sicherheit zu bauen.** Schutzmaßnahmen, die auf
  Erfahrung von Fachstellen und nicht auf Intuition beruhen — s. Punkt 10.
- **Vermeidung von Doppelarbeit.** Dieselbe Messung ist bereits zweimal unabhängig zum selben
  Ergebnis gekommen. Dieses ADR schließt die Lücke abschließend, nicht nur strukturell vorläufig.

---

## Entscheidung

### 1 — Katalog-Grundform

Jeder Instrument-Typ bekommt einen Rechtsraum-Katalog-Eintrag mit drei Feldern: **Wortlaut/
Textbausteine** (heute `STANDARD_VORLAGEN`), **Formvorschriften** (heute `formhinweis`/`herkunft`),
**Fristen- und Vorrangregeln** (heute BGB-Paragraphen in Kontrollfluss). Deutschland ist der erste,
bis auf Weiteres einzige ausgelieferte Katalog-Eintrag.

### 2 — Rechtsraum ist eine Instrument-Eigenschaft, kein Depot-Attribut

Jedes einzelne Instrument trägt seinen eigenen Rechtsraum. Ein Depot kann mehrere gleichzeitig
gültige Rechtsräume enthalten. Ein Depot-weites Feld ist höchstens ein Vorschlagswert für neu
anzulegende Dokumente, keine Aussage über den Inhalt des Depots.

### 3 — Zweck-Ebene über `typ`

Jeder bestehende `typ` bekommt eine rechtsraumunabhängige Zweck-Markierung (z. B.
Vorsorgevollmacht: Vermögenssorge + Gesundheitssorge, Testament: Nachlass). Cross-Jurisdiktions-
Matching läuft über den Zweck, nicht über den deutschen Namen.

### 4 — Offene Typ-Menge

Die Menge der `typ`-Werte ist nicht auf die fünf deutschen Instrumente begrenzt. Kardinalität
`typ` ↔ Rechtsraum ist 0, 1 oder mehrere in beide Richtungen: ein Rechtsraum kann für ein
deutsches Instrument keine Entsprechung haben (Weglassen genügt als Darstellung), kann mehrere
eigene Instrumente für einen deutschen `typ` brauchen, oder ein Instrument ohne deutsches
Gegenstück mitbringen (neuer `typ`).

### 5 — Instrument-Stempel: Rechtsraum + Katalog-Stand

Jedes erzeugte Instrument hält fest, unter welchem Rechtsraum UND unter welcher Version/welchem
Stand des Katalogs es entstanden ist. Ändert sich ein Paragraf im Katalog später (Gesetzesnovelle),
darf das ein bereits unterschriebenes Dokument nicht rückwirkend umdeuten.

### 6 — Bestandsdaten-Backfill

Mit der Einführung des Rechtsraum-Felds (Schema-Version-Sprung) bekommen alle heute bestehenden
Depots und Instrumente einen expliziten Backfill-Vermerk „vor Einführung entstanden, angenommen
DE" — sinngemäß nach dem `dataAbsentReason`-Muster (U2-ADR-105/107), keine Neuerfindung.

### 7 — Die drei Keller-Fundamentanforderungen gelten für den Katalog

`RECHTSRAUM_KATALOG` muss dieselben drei aus U2-ADR-037 erfüllen: Versions-Marke pro
Katalog-Eintrag, stabile Schlüssel statt Freitext-Labels, offenes Schema (unbekannter `typ` oder
Rechtsraum wird übersprungen, nicht wirft eine Exception).

### 8 — Verhältnis zum Feld-Modell (Institutions-Templates): gleiche Hülle, eigener Vertrag

Kein gemeinsamer Payload mit `feldDefinitionen`/`codeListen` — deren Widerrufsregel (Wert bleibt
für die Bürgerin eingefroren) passt nicht zu Rechtsinhalt, der aktuell bleiben soll. Geteilt wird
die Infrastruktur: signierter Vertrag, `tpl_`-artiger Namensraum, Versionierung, Unbekannt-Skip,
ein gemeinsames Register/„Bibliothek" für Institutions- und Lokalisierungs-Beiträge. Neuer
Payload-Vertrag **Rechtsraum-Modul** mit zwei Abweichungen vom bestehenden Muster:
Aktualisieren-statt-Einfrieren bei neuer Version, und die ausdrückliche Erlaubnis, vom
Kontrollfluss gelesen zu werden (bestehende Templates sind laut ADR-037 „reine Struktur ohne
Gültigkeitsbindung" — für Fristen-/Vorrangregeln, die Berechnungen speisen, reicht das nicht).

### 9 — `ref`/`liste` bei Bedarf, nicht vorsorglich

Für Kern-Felder bereits produktiv (Personen/Konten, ADR-063). Für die Template-Pipeline fehlt nur
die Verdrahtung (`_TEMPLATE_RENDER_TYPEN` erweitern), nicht der Bau der Mechanik. Erst ziehen, wenn
Kategorien/Anlassblätter/Rechtsraum-Inhalt nachweislich strukturierten statt flachen Inhalt
brauchen.

### 10 — Metadaten-Schutz bei Verfolgungsrisiko

Der Instrument-Stempel aus Punkt 5 (Rechtsraum + Katalog-Stand) und jede weitere
Rechtsraum-Metadatenangabe müssen ausschließlich innerhalb der Verschlüsselung liegen, niemals in
Dateistruktur, Kopfdaten oder an anderer Stelle außerhalb des verschlüsselten Inhalts sichtbar.
Begründung: für Bürgerinnen unter staatlicher Verfolgung kann allein die außenliegende Angabe
„enthält Dokument aus Rechtsraum X" belastend sein, unabhängig vom Inhalt. Recherche-Grundlage: s.
Verwerfung der Alternativen. Diese Anforderung ist mit Punkt 7 vereinbar (Versions-Marke bleibt
innerhalb der Verschlüsselung, nicht außerhalb) und erzeugt keinen zusätzlichen Bauaufwand
gegenüber dem ohnehin bestehenden Verschlüsselungsmodell.

---

## Verwerfung der Alternativen

- **Vollständige Rechtsraum-Neutralität des Datenmodells sofort und erschöpfend bauen** (inklusive
  Kategorien/Anlassblätter, Contributor-Vertrauensweg, Verteilungsmechanik). Zu groß für einen
  Zug, blockiert v1 vollständig. Dieses ADR trennt das Jetzt-günstige (Datenmodell) vom später
  Klärbaren (s. u.).
- **Rechtsraum als Depot-Feld statt Instrument-Feld.** Verworfen, weil das den
  Mehrfach-Rechtsraum-Fall (Immigration) strukturell ausschließt.
- **Rechtsraum-Inhalt über dieselbe `feldDefinitionen`-Pipeline wie Institutions-Formulare.**
  Verworfen: falsche Widerrufsregel (Einfrieren statt Aktualisieren), keine
  Kontrollfluss-Berechtigung im bestehenden Vertrag.
- **Tarn-/Panik-Lösch-Mechanismus (Hidden-Volume-artig oder Duress-Wipe) als Schutz gegen
  Verfolgung.** Verworfen, mit Recherche-Beleg (01.08.): (a) VeraCrypts eigene Dokumentation
  bestreitet ausdrücklich, dass dateibasierte Container (wie eine einzelne HTML-Datei) echte
  Plausible Deniability erreichen können — ein „verstecktes zweites Depot" würde falsche
  Sicherheit erzeugen, keine echte. (b) Ein Duress-Wipe-Mechanismus kann selbst strafbar sein: ein
  aktueller US-Fall (GrapheneOS, Grenzkontrolle, Anklage nach 18 U.S.C. § 2232, Juli 2026) zeigt,
  dass eine Schutzfunktion zur eigenen Straftat werden kann — rechtsraumabhängig, nicht
  pauschal sicher. (c) Die auf Betroffenen-Sicherheit spezialisierte Fachstelle Safety Net Project
  empfiehlt für genau diesen Bedrohungskontext ausdrücklich Datenminimierung und Verlässlichkeit
  statt Tarn-Mechanismen. Vivodepots stärkster bestehender Schutz in diesem Bedrohungsmodell ist,
  was die App schon heute nicht tut: kein Cloud-Backup, kein Konto, keine Telemetrie.
- **Nichtstun / Frage weiter offen lassen.** Hat bereits zweimal zur selben Messung ohne
  Entscheidung geführt.

---

## Ausdrücklich offen, bewusst nicht Teil dieses ADR

- **Kategorien und Anlassblätter.** Ob und wie sie sich lokalisierungsbedingt ändern/ergänzen/
  entfernen lassen, ist eine eigene, noch ungeprüfte Baustelle — nicht automatisch durch die
  Instrument-Typ-Lösung oben gedeckt. Hinweis aus der heutigen Recherche: es existiert bereits ein
  eigener, katalog-getriebener „Lebenslagen"-Mechanismus im Kern (Master-Briefing v1-57, A58) mit
  generischem Ausführer über 23 Lebenslagen — vermutlich der technische Ort für Anlassblätter,
  seine Rechtsraum-Fähigkeit ist ungeprüft.
- **Trägerebene jenseits der Einzelperson.** Rechtssubjekte, die keine Einzelperson sind (z. B.
  erweiterte Familie/Sippe als eigene Einheit mit Rechten und Pflichten, in manchen Rechtsräumen
  relevant) — heute nicht im Datenmodell abbildbar, eigene, größere Frage.
- **Inhalt eines zweiten Rechtsraums.** Braucht eigene Rechtsexpertise, die Vivodepot nicht selbst
  vorhält.
- **STRINGS-Sprachumschaltung.** Unabhängig von diesem ADR, hängt an ADR-Tranche 1.
- **Erklärende Hilfetexte (`hint:`/`hilfetext:`/`einfuehrung:`/`beispiel:`).** Befund vom
  02.08.2026 (126/55/18/310 Fundstellen): diese Texte sind nicht an den Rechtsraum-Mechanismus
  gekoppelt und teilweise inhaltlich deutschrechtlich geprägt — Beispiel im Code (Testament-Hinweis):
  „Aufgesetzt wird es nicht in Vivodepot, sondern bei einer Notarin, einem Notar oder in
  anwaltlicher Beratung." setzt das deutsche Notariatssystem voraus. Anders als der
  Instrument-Stempel (Punkt 5) müssen diese Texte nie eingefroren werden — sie werden bei jedem
  Öffnen live gerendert (geprüft an den Fundstellen `vivodepot.html:22792`, `22950`, `24486`,
  `24610`, `21095` sowie weiteren für `einfuehrung`/`beispiel`), nie in ein Depot oder einen Export
  gezogen. Kein Backfill-Risiko, aber ein echter inhaltlicher Fund — bewusst nicht jetzt gebaut,
  s. `docs/JURISDICTIONS.md`, Layer 4. Auslöser fürs Bauen: das erste reale, nicht-deutsche
  Rechtsraum-Modul, nicht ein Datum.
- **Ein bürgersichtbares Rechtsraum-Feld.** Erst relevant, wenn ein zweiter Rechtsraum real gebaut
  wird.
- **Contributor-Vertrauensweg.** Wie ein fremdes Rechtsraum-Modul signiert, geprüft und verteilt
  wird, ist bisher nur mit Test-Schlüssel (Energie-Pilot, Sentinel-TA) durchexerziert. Ergänzung
  aus der Bedrohungsmodell-Recherche: der Verteilungsweg darf selbst keine Spur hinterlassen, aus
  der hervorgeht, welches Rechtsraum-Modul eine Bürgerin nutzt.
- **Ein-Datei-für-alle vs. Bauvarianten pro Rechtsraum.** Technischer Verteilungsweg nicht
  entschieden.
- **Fork vs. Marken-Ökosystem.** Governance-/Lizenz-/Markenfrage, keine Architekturfrage.
- **Sicherheits-Leitfaden für Bürgerinnen in gefährdeten Kontexten.** Inhaltliche Empfehlung
  (Dateiname, Ablageort, Verhalten bei Kontrollen), keine Architektur — separates Vorhaben.

---

## Konsequenzen

**Positiv.** Wurzel 2 wird strukturell eingelöst, einschließlich Mehrfach-Rechtsraum-Fähigkeit pro
Depot. Datenmodell-Änderungen, die nur jetzt günstig sind, werden jetzt getroffen. Der Katalog
erfüllt danach dieselben Fundamentgarantien wie der Rest der App. Der Metadaten-Schutz (Punkt 10)
kostet nichts zusätzlich, verhindert aber ein späteres, schwer zu behebendes Leck. Zukünftige
Rückfragen haben eine dokumentierte, vollständige Antwort statt einer erneuten Ad-hoc-Messung.

**Negativ.** Der Umbau ist größer als in der ersten Fassung sichtbar: Instrument-Stempel,
Keller-Fundamentanforderungen und der neue Payload-Vertrag „Rechtsraum-Modul" kommen zum
ursprünglichen Kern-Umbau hinzu. Aufwandsschätzung steht aus, gehört in die Zug-Planung.

**Bau-Stand.** Alle zehn Entscheidungspunkte gebaut und verifiziert, in sechs Zügen
(02.08.2026), Schema-Sprung 45 → 47:

- **Zug 1 — Punkt 7** (Keller-Fundamentanforderungen: Versions-Marke, geschützter Zugriff
  `_rechtsraumKatalogLesen`). Commit `c16fdc4`.
- **Zug 2 — Punkt 3** (Zweck-Ebene über `typ`). Commit `b1a16c7`; Nachtrag (vierter Zweck-Wert
  `postmortalespersoenlichkeitsrecht` für `ki-verfuegung`) Commit `64b6ee5`.
- **Zug 3 — Punkt 4** (offene Typ-Menge, Wächter `tools/typ-menge-offen-pruefen.js` gegen
  geschlossene Listen-Annahmen). Commit `07ce811`.
- **Zug 4+5 — Punkte 2+5+6+10** (Instrument-Stempel `rechtsraum`+`katalogStand`, ausschließlich
  innerhalb der Verschlüsselung, mit Bestandsdaten-Backfill). Commit `0d8c2d3`.
- **Zug 6 — Punkt 8** (Rechtsraum-Modul-Payload-Vertrag, `docs/rechtsraum-modul/
  rechtsraum-modul-schema.json`, geteilte JWS-Verifikationskette mit dem Feld-Modell). Commit
  `14bea0d`.
- **Punkt 1** (Katalog-Grundform) und **Punkt 9** (`ref`/`liste` bei Bedarf) waren bereits vor
  diesen sechs Zügen erfüllt (Katalog-Grundform seit der ersten Fassung, `ref`/`liste` als
  Ist-Zustand-Entscheidung).

Alle Commits auf `u2-kanon`, gepusht, jeweils mit eigenem Wächter (Suite zuletzt 2423/0).
