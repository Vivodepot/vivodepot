# U2-ADR-435 — Angehörigen-Blätter sind Inhalt (Template), kein Gerüst

**Datum:** 19.09.2026
**Status:** Angenommen (25.09.2026) · gebaut 19.09.2026
**Status heute:** gilt — Belege im `konformitaet`-Block unten.
**Nummer:** beim Landen gezogen (25.09.2026); bis dahin Platzhalter `NNN`, weil zwei bestehende
Dokumente unabhängig voneinander „U2-ADR-347" trugen.
**Löst ab:** U2-ADR-060 (Angehörigen-Modus: fünf Situationsblätter) — die Blätter selbst gelten
weiter, als Template; der Modus und die Konstante entfallen. Und U2-ADR-347 — NUR den Abschnitt
„Ausschluss von `_ANG_SITUATIONEN`, mit Bedingung": seine Bedingung ist eingetreten.
**Bezug:** U2-ADR-060 (fünf Blätter, Zuschnitt), U2-ADR-101 (Feldsätze der Blätter, Konformität),
U2-ADR-157 (Vorschlag und Heben, geschlossene Blattliste), U2-ADR-156 (Empfängerkreise),
U2-ADR-120 (Übergabe und Widerruf — betrifft den Eintritt, nicht den Inhalt),
Vokabular `MODUL ≠ TEMPLATE` (Gerüst + Modul (+ Template) = Produkt).
**Kategorie:** Struktur-Entscheidung, Inhalt vs. Mechanismus.

---

## Kontext, gemessen

**Die fünf Angehörigen-Blätter waren hartkodiertes Gerüst.** Die Konstante `_ANG_SITUATIONEN`
trug Krankenhaus, Pflegeheim-Aufnahme, Beerdigung und Nachlass, Behörden und Nachlass und Meine
Menschen mit fest im Kern stehenden Blöcken und Einträgen (Feld-Verweise auf Sektoren,
`sit:erbfall` für den Nachlass-Satz), ihre Titel unter `angSituation:*` im Textsatz. Dieselbe
Form wie `SITUATIONEN`, aber über keinen Modul-Mechanismus ladbar.

**Ihr Eintrittsweg war tot.** Der Modus `angehoerigen` war nur über `kernAPI.setzeModus()`
erreichbar, das `_uebergabenModulRegistriert === true` verlangte; die Variable wurde im
gesamten Kern nie auf `true` gesetzt, das Übergaben-Modul nie gebaut.

**Die Konstante war trotzdem nicht tot.** Vier lebende Verbraucher hingen an ihr: der
Anlass-Export (`anlassDef`/`anlaesseMitDaten`), die Empfängerkreise und der Angehörigen-Cache
(Schnitt über `_ANG_CACHE_ERLAUBT`, Empfänger-Bausteine), der Blatt-Vorschlag (geschlossene
Blattliste) und der Kennungsumbau. „Konstante löschen" hätte sie gebrochen; gemessen wurde vor
dem Bau.

## Entscheidung

**(1) Die Blätter sind ein Template, der Gerüst hält den Mechanismus.** Ein Angehörigen-Blatt hat
keine eigene Datendomäne — es ist eine thematische Zusammenstellung bestehender Modul-Felder
(`{ id, icon, titel, einfuehrung?, bloecke: [{ id, titel, eintraege: [{ quelle, feld }] }] }`),
wie ein Notar- oder Krisen-Template. Der Kern kennt kein einziges Blatt: er hält den Prüfer
(`angehoerigenVorlagePruefen`), die Registry (`angehoerigenSituationenAlle`), EINE Lese-Naht
(`_angSituationen`/`_angSituationById`) und die Auflösung der `quelle`/`feld`-Zeiger gegen das
offene Depot. Alle Verbraucher lesen über die Naht.

**(2) Form der Vorlage.** Modul mit `modulTyp: 'angehoerigenVorlage'`, `moduleVersion`,
`herkunft`, `sprache`, optional `rechtsraum` und `rechtsraumName`, `berufsstand` und
`berufsstandName`, `bereich`, und `situationen` (Blatt-ID → Blatt). Blatt-ID-Form
`^[a-z][a-z0-9_-]{1,39}$` — der Unterstrich bleibt erlaubt, weil zwei der fünf bestehenden IDs
(`behoerden_nachlass`, `meine_menschen`) so in bestehenden Depots stehen (Empfängerkreise,
Anlass-Export); umbenennen hätte sie gebrochen. Alle Zeichenketten sind reiner Text.

**(3) Mehrere Vorlagen nebeneinander, additiv.** Jede geladene Vorlage trägt ihre Blätter
unverändert bei — zwei Rechtsraum-Vorlagen und eine Berufs-Vorlage in einem Depot zeigen genau
deren Blätter, keine schließt eine andere aus. Bei gleicher Blatt-ID gewinnt die erste, die
zweite wird benannt verworfen. Fremdheit hängt am Rechtsraum/Berufsstand der Vorlage, nicht an
der gerade aktiven Oberflächensprache.

**(4) Ab Werk und aus der Datei.** Die fünf Blätter sind das erste Ab-Werk-Template: als
Region `AB_WERK_ANGEHOERIGEN_QUELLEN` (im nackten Gerüst leer) in ALLE vier Produkte gebacken —
deutsch in den deutschen, englisch in den englischen (Rechtsraum bleibt DE; die englische
Fassung ist nativ geschrieben, nicht maschinell übersetzt). Die Datei bringt sie mit
(`abWerkMitschrift.angehoerigen`, elftes Mitschrift-Fach; ein lebendes Ab-Werk gewinnt, die
Mitschrift gilt nur ohne es) und kann weitere per `data.angehoerigenVorlagenModule` tragen
(Schema 82 → 83). Der Vollexport hält das Fach zurück wie die übrigen Mitschrift-Fächer.

**(5) Zwei Ansichten, kein Modus.** Im Kern öffnet ein Blatt als gewöhnliche Ansicht
`angehoerigen-blatt` (lesend, mit Zurück-Weg), erreichbar über die globale Suche — ohne diesen
Zugang wäre sie nicht zu erreichen. In der Lese-App erscheint eine Sidebar-Gruppe
„Angehörigen-Blätter" aus den Vorlagen der geöffneten Datei. Unter dem Titel steht in
Bürgersprache, für wen das Blatt gilt: „Gilt für: Deutschland" / „Applies in: Germany". Der Name
steht in der Vorlage (`rechtsraumName`/`berufsstandName`, in ihrer Sprache), nie im Code; fehlt
er, steht der Wert der Vorlage unverändert da.

**(6) Was ein Angehöriger ohne Depot-Passwort sehen darf, bleibt im Kern.** Die Cache-Allowlist
`_ANG_CACHE_ERLAUBT` (Schlüssel `blatt|quelle|feld`) ist Kern-fest. Eine Vorlage kann ein Blatt
anbieten, aber kein Feld für die Angehörigen-Sicht freischalten: ein neues Blatt bleibt draußen,
eine doppelte ID wird verworfen (Probe mit Rot-Beweis).

**(7) Eine Vorlage lässt sich einlesen.** Das Einlass-Register führt den Typ `angehoerigenVorlage`
(Slot `angehoerigenVorlagenModule`, Kennung = `herkunft`, Fassungsvergleich wie bei den übrigen Modulen);
der Weg ist derselbe wie für jedes Modul: Prüfstufe und Signatur. Der unsignierte Weg ist offen, die
Vorlage trägt dann `ungeprueft` und das Blatt sagt es („Nicht geprüfte Vorlage"); eine unsignierte
Vorlage kann kein ab-Werk-Blatt ersetzen — wie bei der Beschriftung eines eingebauten Bereichs. Ein
Modul mit verifizierter Signatur darf es. Rundlauf: einlesen, speichern, wieder öffnen, in der Lese-App
angezeigt, mit Rot-Beweis (ohne den Register-Eintrag wird dieselbe Vorlage abgewiesen).

**(8) Abriss.** Entfernt sind der Modus `angehoerigen` (samt Klausel in `darfBearbeiten`,
`ang-vollbild`, Render-Zweig), das Übergaben-Modul (`_uebergabenModulRegistriert`,
`kernAPI.setzeModus`), die Akut-Renderer (`renderAkutSituation`, `renderAngehoerigenAuswahl`,
`renderAngehoerigen`, Banner, `oeffneAkut`/`akutZurueck`), die Konstante `_ANG_SITUATIONEN`
samt Index, die `angSituation:*`-Texte und sieben nur vom Modus genutzte Texte. Der Feldbestand
von damals steht als eingefrorene Grundlinie in
`tests/fixtures/angehoerigen-blaetter-vor-abriss-2026-09-19.json`: die Vorlagen dürfen wachsen,
aber nichts daraus verlieren (Blatt, Block, Eintrag).

**(9) Ein Wächter gegen den Rückfall.** `tools/geruest-inhalt-pruefen.js` sucht im Quelltext des
Gerüsts die FORM eines Blatts (ein geschlossenes `{ quelle, feld }`-Paar, ein Array-Literal von
Blöcken, eine frühere Blatt-Kennung, das Präfix `angSituation:`) außerhalb von Kommentaren und
markierten Ab-Werk-Regionen. Eine benannte Ausnahme steht in einer Positivliste, deren Zahl nur
sinken darf: die Cache-Allowlist (Punkt 6).

**(10) Welche Dokumente ein Blatt zeigt, legt das Blatt fest.** Ein Blatt der Vorlage kann `dokumenttypen`
(Liste von Dokumenttyp-Kennungen) und `dokumenttypenVorschlag` (boolesch) tragen. Der Kern kennt keine
Zuordnung Typ → Blatt: er zeigt auf Kern-Ansicht, Lese-App und Situationsblatt-Ausgabe genau die Dokumente
des Depots, deren Typ das Blatt nennt. Ein sensibles Dokument erscheint mit Namen und dem Freigabe-Satz,
nie mit seinen Angaben. Die Ausgangsbelegung der Ab-Werk-Vorlage sind die Typen, die ein Blatt schon über
einen `instrument:`-Eintrag zieht; sie steht als „Vorschlag" im Abschnittstitel und wird im Template
geändert, nicht im Kern. Der Wächter gegen Gerüst-Inhalt findet eine solche Zuordnung als Literal im Kern.

**(11) Die Situationen folgen demselben Grundsatz (SIT2).** Die zehn Situationsblätter stehen im Kern schon
als Template (Ab-Werk-Bündel, Mitschrift der Datei); in der Lese-App standen sie als erzeugte Kopie im Gerüst und
kamen nie aus der Datei — was im Template geändert wurde, erreichte die Empfängerin nicht. Jetzt liest die Lese-App
sie aus der Datei (Mitschrift zuerst, danach Module der Datei; erste ID gewinnt; ein Modul ohne belegte Signatur
trägt „Nicht geprüfte Vorlage" und kann kein Blatt des Produkts ersetzen, ein verifiziertes darf). Titel und
Einführung stehen dafür im Template. Ohne Datei-Inhalt zeigt das Gerüst keine Situation. Die Grundlinie der zehn
Situationen vor dem Abriss friert den Bestand ein: Verlust verboten, Wachstum erlaubt. Der Wächter gegen
Gerüst-Inhalt prüft beide Dateien und beide Schreibweisen.

**(12) Eine Situation erklärt ihre Anlass-Kachel und ihre Suchbegriffe selbst (SIT2b).** Ein Eintrag der Situation im Template
kann `anlass` (`klasse`, `icon`, `ziel`, optional `versteckt`, und `position` als Platz in der fertigen Kachel-Liste) und
`suchbegriffe` tragen. Der Kern setzt daraus zur Laufzeit die Kachel mit der ID der Situation in die Liste und findet die
Situation über ihre Wörter; er hält nur den Mechanismus und die Kacheln, die zu keiner Situation gehören. Nur eine Situation
aus dem Ab-Werk-Bündel bringt eine Kachel mit, ein Modul der Datei meldet Kacheln über die Kern-Schnittstelle; ein ungültiger
Eintrag ergibt keine Kachel. Die Kachel-Liste des Standard-Produkts ist gegen ihren Stand vor dem Umzug eingefroren
(Reihenfolge, Klasse, Symbol, Ziel, Wortlaut). Die feste Liste der zehn Situations-IDs bleibt als reservierter Namensraum:
ein Modul der Datei kann keine dieser IDs übernehmen. Offen bleibt der Lebenslagen-Katalog, der eine Situation noch beim Namen
nennt (die Verweise „verwandte Situation" und die Zwischenfrage der Todesfall-Kachel).

## Folgen und offene Punkte

- **Eine Sprachfassung eines Blatts ist eine Vorlage in dieser Sprache**, kein Textsatz-Eintrag: die
  Titel schalten nicht mehr über `angSituation:*` mit. Die Ab-Werk-Vorlage ist deshalb für DE und EN
  getrennt vorhanden.
- **Die Lese-App zeigt sensible Felder nicht** (bestehende Sensibel-Zurückhaltung); der Kern zeigt
  auf dem Blatt auch sensible Sektorfelder, weil dort die Aufnahme ins Blatt die Vertrauensgrenze
  ist. Beide Richtlinien bleiben, die Blatt-Sicht der Lese-App ist darum knapper als die des Kerns.
- **Der Empfänger-Baustein kommt aus der Vorlage.** Ein Blatt erklärt seinen Empfängerkreis selbst
  (`baustein: { id, label, hint, weit }`); das Gerüst leitet die Bausteine zur Laufzeit aus der Registry
  ab (`empfaengerBausteineAlle`), gespeicherte Kreise verweisen weiter über die Baustein-ID. Die vier
  Ab-Werk-Bausteine (notfall, pflege, bestattung, erbe) stehen in der Vorlage, die Wortlaute dazu nicht
  mehr im Kern. Ein „weiter" Baustein gibt auch sensible Felder frei und darf darum nur von einem Blatt
  vom Produkt oder mit verifizierter Signatur erklärt werden; bei einer ungeprüften Vorlage wird `weit`
  zurückgenommen. Die Cache-Allowlist bleibt im Kern.
- **Vorlagen-Dateien** stehen unter `tools/angehoerigen-vorlagen/` und werden von Hand gepflegt (kein
  Generator mehr); ihre Prüfsummen stehen in den Produkt-Rezepten des Bau-Werkzeugs.

## Konformität

```konformitaet
aussage:  Der Kern kennt kein einziges Blatt: im nackten Gerüst ist die Ab-Werk-Region der Vorlagen leer.
zustand:  geprüft
herkunft: Entscheidung (1) und (4)
pruefung: tests/angehoerigen-vorlagen-modul.test.js#AB_WERK_ANGEHOERIGEN_QUELLEN ist im nativen (unkonfektionierten) Gerüst leer
pruefung: tests/angehoerigen-mitschrift-rundlauf.test.js#[Fach 11] ein nacktes Gerüst liest die fünf Blätter aus der Mitschrift der Datei — ohne sie sieht es keine
```

```konformitaet
aussage:  Mehrere Vorlagen stehen nebeneinander und tragen je ihre Blätter bei; bei gleicher Blatt-ID gewinnt die erste.
zustand:  geprüft
herkunft: Entscheidung (3)
pruefung: tests/angehoerigen-lese-app.test.js#[Lese-App · Abnahme 1] zwei Rechtsraum-Vorlagen und eine Berufs-Vorlage zeigen genau ihre vier Blätter
pruefung: tests/angehoerigen-lese-app.test.js#[Lese-App] dieselbe Blatt-ID in zwei Vorlagen: die erste gewinnt, die zweite wird benannt
```

```konformitaet
aussage:  Für wen ein Blatt gilt, steht in der Vorlage, nie im Code; fehlt der Name, steht der Wert der Vorlage.
zustand:  geprüft
herkunft: Entscheidung (5)
pruefung: tests/angehoerigen-gilt-fuer.test.js#[Lese-App] ohne Namen in der Vorlage steht der Wert der Vorlage, nie ein erfundener Ländername
```

```konformitaet
aussage:  Ein Blatt aus dem Template-Generator hat die Form, die der Prüfer des Kerns annimmt, an jedem Fall.
zustand:  geprüft
herkunft: Entscheidung (2)
pruefung: tests/generator-angehoerigen-blatt.test.js#[GEN3 · Blatt] Parität mit dem Prüfer des Kerns an jedem Fall
```

## Referenzen

U2-ADR-347 (Lese-App-Situationen-Generator, Ausschlussbedingung) · U2-ADR-060 (fünf Blätter,
Zuschnitt) · U2-ADR-101 (Feldsätze, Konformität) · U2-ADR-157 (Vorschlag und Heben) · U2-ADR-156
(Empfängerkreise) · U2-ADR-120 (Übergabe und Widerruf, Eintritt) · U2-ADR-296 („Rand, nicht Fläche",
Fremdheits-Kriterium) · Vokabular `MODUL ≠ TEMPLATE`.
