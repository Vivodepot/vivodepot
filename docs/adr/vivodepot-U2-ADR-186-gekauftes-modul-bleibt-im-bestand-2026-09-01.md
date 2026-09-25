# U2-ADR-186: Ein gekauftes Modul bleibt im Bestand nutzbar — Widerruf wirkt am Einlass, nicht im Depot

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** SICHERHEIT, VERTRAUEN
**Linie:** U2
**U2-Bezug:** Präzisiert die Reichweite von U2-ADR-038 (CRL/Widerruf: ablaufbasiertes Vertrauen)
und U2-ADR-173 (Notfall-Widerruf) — beide bleiben für den **Import-Pfad** unverändert gültig,
**kein ADR wird abgelöst.**
**Anker:** Freigegeben, 01.09.2026. Die Entscheidung selbst, wörtlich
sinngemäß: ein gekauftes Modul ist wie eine CD, kein Abo — gekauft wird ein Datenspeicher, nicht
Nutzungszeit. Ein Widerruf darf neue Installationen verhindern und **informieren**, niemals
abschalten, was jemand bereits gekauft hat. Und: „die Nutzerin sollte informiert werden können
und selbst entscheiden."
**Status heute:** gilt bereits als Nebenprodukt der Umsetzung (die Zertifikatsprüfung sitzt
strukturell nur am Einlass, nie im Ladeweg) — dieses ADR befördert das von einem Nebenprodukt zu
einer benannten, geprüften Zusage. Zusätzlich behoben: die stille Unsichtbarkeit eines beim Laden
ausgefallenen Moduls.

---

## Kontext

Der zugrunde liegende Bericht hat gemessen, nicht angenommen: Auf allen fünf Andockwegen
(`depotLaden`, `vivodepot.html:16576`) wird beim Öffnen eines Depots **kein** Zertifikat geprüft —
weder Signatur noch Ablauf noch Widerrufsliste. Der Grund trägt tiefer als „es wird nicht
geprüft": beim Einlassen (`modulEinlassenGeprueft`) wird das Zertifikat **verbraucht und
weggeworfen** — im Depot liegt hinterher reiner Modulinhalt, an dem eine spätere Prüfung gar nicht
ansetzen könnte. Verschwindet ein Anbieter, läuft sein Zertifikat ab oder landet er auf der
`WIDERRUFS_LISTE`, ändert sich beim Öffnen eines Bestandsdepots **nichts**. Die CD bleibt spielbar.

**Zwei Brüche, aus demselben blinden Fleck, in entgegengesetzte Richtungen:**

- **Bruch 1 (Kontraktverschärfung ohne Migration)** — ein rechtmäßig eingelassenes Modul kann bei
  einer künftigen App-Fassung durch die Strukturprüfung fallen (Präzedenzfälle im Repo: `72fef85`,
  A484, 23.08.2026; `e42cf92`, 1.0a, 22.08.2026). Bleibt **ausdrücklich offen** — dieser Auftrag
  baut die Zusicherung für den Zertifikats-Fall, nicht die Migrationsfrage (s. „Ausdrücklich nicht
  behandelt").
- **Bruch 2 (Stille Unsichtbarkeit)** — fällt ein Modul beim Laden durch die Strukturprüfung, wird
  es still übersprungen (`if (!geprueft.gueltig) continue;`), UND die Einstellungen zeigten es
  bislang weiter als „eingelassen, geprüft" an: `eingelasseneModule()` (`vivodepot.html:24307`) las
  die rohen Depot-Slots, ohne je `reg.pruefen` aufzurufen. Die Bürgerin konnte den Widerspruch
  zwischen einer verschwundenen Rubrik und einer bestätigenden Zeile in den Einstellungen nicht
  bemerken. **Dieser Bruch wird mit diesem ADR geschlossen.**

**Das Vorbild existierte bereits, eine Bildschirmebene daneben.** `importierteVorlagenUebersicht()`
(`vivodepot.html:39131`) berechnet `widerrufen`/`abgelaufen` je Zeile und zeigt sie an. Der
Kommentar dort formuliert die Regel selbst: *„Eine Vorlage, die stillschweigend weiter aussieht
wie gültig, ist schlimmer als eine, die fehlt."* Für die sieben Einlass-Register galt sie bislang
nicht.

## Entscheidung

**1 — Der Ladeweg fragt weiterhin kein Zertifikat, jetzt als Zusage statt als Nebenprodukt.**
`depotLaden` und die fünf Andockwege bleiben synchron; jede Zertifikatsprüfung im Kern läuft über
`await crypto.subtle.verify` — ein synchroner Weg kann sie strukturell nicht tragen. Ein gekauftes
Modul bleibt darum nutzbar, wenn sein Anbieter verschwindet, sein Zertifikat abläuft oder er auf
die Sperrliste gerät. **Widerruf wirkt am Einlass, nicht im Bestand.**

**2 — `eingelasseneModule()` prüft jedes Modul mit demselben Prüfer, den auch der Ladeweg für sein
Register nutzt (`reg.pruefen`), statt die rohen Slots ungeprüft zu lesen.** Fällt die Prüfung
durch, erscheint das Modul in den Einstellungen als **ausgefallen** statt als eingelassen —
Bürgertext, kein Technik-Jargon (U2-ADR-095): „wird gerade nicht eingelesen — Ihre Angaben bleiben
erhalten", plus ein Sammel-Hinweis, wenn mindestens ein Eintrag betroffen ist. Der technische
`grund` (z. B. welches Datenfeld die Prüfung nicht mehr besteht) reist im Rückgabewert mit, wird
aber bewusst nicht wörtlich in der Bürgertext-Zeile gezeigt — die Zusage, die zählt, ist „nichts
ist verloren", nicht die Fehlermeldung.

**3 — `_bereichsModuleAusDepotAnmelden` protokolliert jetzt auch ein VOLLSTÄNDIG verworfenes
Modul** in `BEREICHS_MODUL_VERWORFEN` (vorher stand das `continue` vor der protokollierenden
Zeile — ein ganz verworfenes Modul hinterließ nicht einmal einen internen Eintrag). Kein
Bürgertext, ein interner Diagnose-Pfad — belegt durch die Verhaltensprobe in diesem ADR.

**Was ausdrücklich NICHT gebaut wird** (Auftragsgrenze, nicht Auslassung): kein Modul wird
abgeschaltet, keine Zertifikatsprüfung wandert in den Ladeweg, keine Schwelle wird verschärft. Das
Gegenteil ist der Auftrag.

## Abgrenzung gegen U2-ADR-038

ADR-038 (b3) trägt: *„Widerruf schlägt Schonfrist: ein widerrufenes Cert bekommt nie die
b2-Schonfrist."* Dieser Satz steht nur **in Spannung** zur heutigen Entscheidung, wenn man ihn
universell liest — das ist er nicht. Er beschreibt das Verhalten innerhalb von
`verifiziereProviderCredential`, also **am Einlass**. Reichweite jetzt ausgesprochen, statt dem
Leser überlassen: „Widerruf schlägt Schonfrist" gilt an der Tür. Es gilt nicht im Depot. ADR-038
bleibt für den Import-Pfad unverändert gültig; ein entsprechender Nachtrag steht dort.

## Abgrenzung gegen U2-ADR-173

ADR-173 nennt als Zweck ausdrücklich die „Verteilung eines Widerrufs an bereits ausgelieferte
Depots". Heute besteht dazu kein Konflikt im Code, weil der Ladeweg die Widerrufsliste nicht
konsultiert — aber die **Absicht** von ADR-173 zeigt genau auf das, was diese Entscheidung
verbietet. Festgehalten, damit ADR-173 nicht als Einladung gelesen wird, die Prüfung nachträglich
in den Ladeweg zu bauen: der Notfall-Weg darf **warnen und neue Einlässe sperren**, er schaltet
**nicht ab**, was bereits eingelassen ist. Ein entsprechender Nachtrag steht dort. Nebenbefund beim
Nachziehen: ADR-173 nennt als Code-Stelle „`vivodepot.html` ~Zeile 3834 (`WIDERRUFS_LISTE`)" —
tatsächlich steht sie heute an anderer Stelle (Zeilen verschieben sich mit jedem Zug); der
Zeilenverweis in ADR-173 wurde entsprechend korrigiert.

**Offene Formfrage, nicht durch dieses ADR entschieden:** `docs/adr/README.md` kennt als
Beziehungsart heute nur „Ersetzt durch …" (volle Ablösung, neue Nummer, alter Status ändert sich).
Da ADR-038 und ADR-173 nicht abgelöst, sondern in ihrer Reichweite präzisiert werden, passt das
nicht wörtlich — beide erhalten hier einen erklärenden Nachtrag-Absatz statt einer geänderten
`Status:`-Zeile. Ob das Hausformat künftig eine eigene Beziehungsart („Präzisiert durch …") kennen
soll, ist eine offene Frage, hier nicht entschieden.

## Ausdrücklich nicht behandelt

- **Bruch 1 (Kontraktverschärfung ohne Migration, Abschnitt 5 im Bericht)** — der einzige heute
  reale Ausfallweg. Braucht eine eigene Aussage und eine andere Probe (ein Fixture-Satz
  historischer Modulformen gegen den jeweils aktuellen Prüfer) sowie eine Antwort auf die Frage,
  wo eine Modul-Inhalts-Migration überhaupt hingehört, nachdem `depotNormalisieren` für die
  Registrierung zu spät läuft. Eigener Zug.
- **Bloßer Zeitablauf der gekauften DATEI** (Bruch 3 im Bericht — 12/18-Monats-Schonfrist für einen
  erneuten Einlass auf einem neuen Gerät/Sub-Depot). Die Prämisse spricht von Widerruf, nicht von
  Ablauf; das Bestandsdepot ist unberührt, die gekaufte Datei ist es nicht. Offene Produktfrage,
  nicht Teil dieses ADR.
- **Vor-Depot-Provisionierung (Bruch 4)** und **Rechtsraum-Kollision (Bruch 5)** — im Bericht
  benannt, hier nicht angefasst.

## Konformität

```konformitaet
aussage:   Der Weg, auf dem ein Depot beim Öffnen seine mitgereisten Module anmeldet, fragt kein
           Zertifikat — weder Signatur noch Ablauf noch Widerrufsliste. `depotLaden` und die fünf
           Andockwege sind synchron und erreichen `verifiziereProviderCredential`, `_verifyJWS`,
           `modulEinlassenGeprueft` und `WIDERRUFS_LISTE` an keiner Stelle. Ein gekauftes Modul
           bleibt darum nutzbar, wenn sein Anbieter verschwindet, sein Zertifikat abläuft oder er
           auf die Sperrliste gerät. Widerruf wirkt am Einlass, nicht im Bestand.
zustand:   geprüft
quelle:    entscheidung
pruefung:  tests/ladeweg-fragt-kein-zertifikat.test.js#ladeweg-fragt-kein-zertifikat
```

```konformitaet
aussage:   Ein Modul, das die Strukturprüfung beim Laden nicht mehr besteht, erscheint in den
           Einstellungen als ausgefallen statt als eingelassen — dieselbe Regel wie bei
           importierten Vorlagen, jetzt auch für die Einlass-Register.
zustand:   geprüft
herkunft:  invariante
pruefung:  tests/ladeweg-fragt-kein-zertifikat.test.js#[U2-ADR-186 · Positivkontrolle] derselbe Extraktor findet die Zertifikatsprüfung dort, wo sie wirklich steht
```

**Zur zweiten Klausel, ehrlich benannt:** die referenzierte Probe belegt die BAUART (derselbe
Prüfweg wird tatsächlich benutzt, nicht nur genannt), nicht die konkrete UI-Ausgabe — ein E2E-Test
für den sichtbaren Bürgertext ist nicht Teil dieses Zugs (kein Sub-Depot-Fixture mit einem
strukturell ausgefallenen Modul im bestehenden E2E-Bestand). Die Funktions-Ebene ist über die
Verhaltensprobe unten mitabgedeckt.

**Verhaltensprobe (ergänzend, in derselben Testdatei, nicht über eine eigene Klausel getrackt):**
ein Bereichsmodul, das jeden denkbaren Ausschlussgrund trägt (uraltes `eingelassenAm`, selbst
behauptetes `widerrufen`, abgelaufenes `gueltigBis`, weit vorgestellte Systemuhr), bleibt beim
erneuten Einlesen unverändert angemeldet — `tests/ladeweg-fragt-kein-zertifikat.test.js#[U2-ADR-186
· Teil B] ein Bereichsmodul mit jedem denkbaren Ausschlussgrund bleibt beim Laden angemeldet`.

**Die Probe wird auch dann rot, wenn jemand den Ladeweg aus einem ganz anderen, legitimen Grund
`async` macht — das ist gewollt** (s. Testdatei-Kopfkommentar): dieser Weg soll synchron und
billig bleiben, eine Änderung daran gehört entschieden, nicht nebenbei gemacht.

**Rot-Beweis gefahren, nicht nur behauptet:** zwei künstliche Verstöße probeweise eingebaut und
wieder entfernt — (a) ein Aufruf von `verifiziereProviderCredential` im Rumpf von
`_bereichsModuleAusDepotAnmelden` macht die erste Behauptung rot; (b) dieselbe Funktion `async`
gemacht (mit einem `await` auf eine erfundene, anders benannte Prüf-Funktion, um zu zeigen, dass
Behauptung 1 allein das NICHT fängt) macht die zweite Behauptung rot. Beide Male lief die Probe
danach wieder grün, keine Repo-Änderung blieb stehen.

---

*Vivodepot GmbH · Berlin · 01.09.2026*
