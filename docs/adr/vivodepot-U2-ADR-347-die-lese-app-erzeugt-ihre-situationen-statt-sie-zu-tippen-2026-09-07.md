# U2-ADR-347: Die SITUATIONEN der Lese-App sind eine erzeugte Kopie mit Prüfung

**Datum:** 2026-09-07
**Status:** gebaut, todesfall-uebernahme fehlte in der Lese-App vollständig (Altlast seit `37038011`), jetzt erzeugt aus dem Kern, `--check` im pre-commit
**Status heute:** abgelöst durch U2-ADR-NNN (19.09.2026, SIT2a): die Lese-App führt keine Kopie der Situationen mehr, sie liest sie aus der Datei
(Mitschrift des Produkts und Module der Datei); der Erzeuger, sein pre-commit-Check und seine Tests sind entfallen. Der Grundsatz, dass eine
Zusicherung über den Schreibweg auch am Leseweg gilt, bleibt: die Grundlinie der zehn Situationen belegt, dass beim Umzug nichts verloren ging.
**Bezug:** U2-ADR-341/341b (Bündel-Mechanismus, erster Umzug SITUATIONEN) · U2-ADR-341c (bedingte Situationsblöcke) · U2-ADR-258 (A467-Nachtrag, „heute folgenlos" ist keine Zusicherung)
**Kategorie:** Gerüst / Zusicherung-über-den-Schreibweg

## Ausgangsbefund

`vivodepot-lesen.html` führte eine eigene, HANDGETIPPTE `SITUATIONEN`-Liste mit neun
Einträgen. Der Kern führt zehn. Die zehnte, `todesfall-uebernahme`, fehlte in der Lese-App
vollständig — bereits in der ausgelieferten Fassung (Commit `37038011`), nicht erst seit den
Bündel-Migrationen vom 06.09.2026. Gemessen im Auftrag „eine Zusicherung über den Schreibweg
gilt nicht am Leseweg". Entschieden: dieser Altlast-Fund wird vor
v1 geschlossen — „ohne eventuelle Fehler" in der Definition of Done gilt auch rückwirkend.

## Entscheidung

`tools/build-situationen-lesen.js` erzeugt die `SITUATIONEN`-Region in `vivodepot-lesen.html`
aus dem laufenden Kern (`ladeKern()`), markierte Region, `--check` im `pre-commit`.

**Präzise Formulierung, absichtlich so und nicht anders:** das ist eine ERZEUGTE KOPIE MIT
PRÜFUNG, nicht „nur noch eine Quelle". Die Lese-App führt weiterhin ihren eigenen Datensatz —
sie hat kein `ladeKern()` zur Laufzeit, sie bleibt eine einzelne, lesende HTML-Datei ohne
Kern-Import. Was sich ändert: der Datensatz entsteht nicht mehr von Hand, sondern wird generiert,
und `--check` verbietet ein stilles Auseinanderlaufen. Die Zusicherung lautet „kann nicht mehr
LAUTLOS abweichen", nicht „es gibt nur noch eine Quelle".

`_ANG_SITUATIONEN` bleibt AUSSERHALB des Generators — bewusst, nicht vergessen.

## Ausschluss von `_ANG_SITUATIONEN`, mit Bedingung

Gemeinsam mit Peer `a5` gemessen (06.09.2026). `_ANG_SITUATIONEN` hängt am Kerns
Live-Session-Privileg: `Modus.aktuell() === 'angehoerigen'`, nur über das gesperrte
`kernAPI.setzeModus()` erreichbar, das seinerseits `_uebergabenModulRegistriert` voraussetzt.
Die Lese-App führt kein Modus-System, kein `kernAPI`, kein Übergaben-Modul — sie liest eine
abgeschlossene Datei, sie führt keine Sitzung. Der einzige denkbare Transportweg
(`deriveKey()`/`_AAD_UEBERGABE_V2`) ist in beiden Apps unverdrahteter toter Code.

Diese Begründung steht unter einer Bedingung, nicht für immer: eine Zusicherung, die an „heute
folgenlos" hängt und keinen Wächter hat, ist eine Momentaufnahme, keine Zusicherung (Beleg aus
diesem Projekt: A467 notierte am 23.08.2026 Folgenlosigkeit, U2-ADR-258 gab demselben Feld
zwölf Tage später einen Leser, ohne dass etwas es meldete). Darum bewachte
ein eigener Test die BEDINGUNG selbst — vier benannte
Merkmale (`Modus.aktuell`, `kernAPI.setzeModus`, `_uebergabenModulRegistriert`,
`_ANG_SITUATIONEN`) —, nicht den Ausschluss. Der Tag, an dem die Lese-App eines davon bekommt,
wäre der Tag gewesen, an dem der Ausschluss neu zu entscheiden ist. (Erledigt am 19.09.2026, U2-ADR-NNN: die Blätter sind ein
Template und die Lese-App liest sie aus der Datei; Modus, Übergaben-Modul und `_ANG_SITUATIONEN` sind entfernt, der Test
entfiel mit dem Gegenstand.)

## Zwei Zwischenfunde beim Bau (beide vor dem Commit geschlossen)

**1. Der Getter mit bedingtem Block.** `todesfall-uebernahme.bloecke` ist im Kern ein GETTER,
der einen Block bedingt einschließt (`_kiHatDaten()`, U2-ADR-341c) — ein naiver
`ladeKern()`-Schnappschuss an einem leeren Depot hätte ihn lautlos weggelassen (dieselbe
Fehlerklasse wie der zurückgezogene Prüftermine-Befund dieses Auftrags, und die vierte
Erscheinung dieser Klasse — Funktionswert/Getter/geteilte Identität — an diesem Abend).
Gelöst durch Wiederverwendung von `kiBedingungDepotAnlegen`/`BEDINGTE_BLOECKE` aus
`tools/situationen-ins-buendel-schreiben.js` (kein zweiter Mechanismus für dieselbe
Bedingtheit) plus eine wörtlich gespiegelte `SITUATION_BEDINGUNGEN_ERLAUBT_LESEN`-Auswertung
in der Lese-App selbst, die zur LESE-Zeit gegen das jeweils offene Depot prüft — sonst sähe
jede Leserin denselben KI-Verfügungs-Block, ganz gleich ob ihr eigenes Depot eine KI-Verfügung
führt.

**2. Der verworfene Anleitungs-Block.** `situationModell()` verwarf jeden Block ohne
`eintraege` — `todesfall-uebernahme` hat sechs reine Anleitungs-Blöcke (nur `hint`,
`eintraege: []`). Ohne Korrektur hätte die Situation nur ihre Einführung gezeigt, sonst
nichts — der Fund wäre eingebaut und für „geschlossen" gehalten worden. Behoben: ein Block
gilt jetzt auch dann als vorhanden, wenn er einen `hint` trägt, unabhängig von `eintraege`.
Eigens abgesichert (`tests/situationen-lesen-generator-kopplung.test.js`, acht Fälle,
darunter zwei Rot-Beweise: ein Block mit unbekanntem Bedingungsnamen bleibt aussen vor statt
zu werfen; ein Block ohne `eintraege` UND ohne `hint` verschwindet weiterhin zu Recht).

## Nebeneffekt: die volle Generierung ändert auch die neun bestehenden Situationen

Der Generator ersetzt den GESAMTEN `SITUATIONEN`-Block, nicht nur den fehlenden zehnten
Eintrag — das ist die „erzeugte Kopie mit Prüfung", keine punktuelle Ergänzung. Vollständig
gemessen (alt: Handkopie in `origin/u2-kanon`, neu: frisch aus dem Kern erzeugt): **53
Felddetails ändern sich in 8 von 9 bestehenden Situationen** (nur „arzt" bleibt unverändert
bis auf die Sensibel-Neusetzungen unten), **davon 41 Sensibel-Markierungen** neu auf `true`.
Null Felder wurden entfernt.

Auf ausdrückliche Auflage wird das hier vollständig aufgeschlüsselt, nicht unter
„Nebeneffekt" zusammengefasst — ein Verhaltenswechsel, der als Nebeneffekt mitfährt, ist beim
nächsten Lesen keiner mehr.

### 1. Sensibel-Rückhalt, 41 Felder — eine BEWUSSTE Abweichung von `37038011`, kein Nebeneffekt

`geburt.{geburt_klinik, geburt_hebamme, geburt_urkunde, geburt_kind_kv, geburt_vaterschaft}` ·
`volljaehrig.{vj_mietvertrag, vj_konto, vj_krankenversicherung}` ·
`hauskauf.{hk_kaufvertrag, hk_finanzierung, hk_grundbuch, heirat_ehevertrag_ort}` ·
`notar.{notar_urkunde, bank_vollmacht, bank_schliessfach}` ·
`arzt.{arzt_termin, arzt_anliegen, arzt_fragen, arzt_mitbringen, arzt_ergebnis}` ·
`krankenhaus.{kh_termin, kh_grund, kh_zuhause, kh_entlassung}` ·
`pflegeheim.{ph_einrichtung, ph_einzug, ph_kosten, ph_heimvertrag}` ·
`erbfall.{erb_originaldokumente, erb_stammbuch, erb_personenstand, erb_lebensversicherung,
erb_sterbegeld, erb_unfallversicherung, erb_konten, erb_geldanlagen, erb_immobilien,
erb_schulden, erb_wertgegenstaende, erb_renten, erb_digitales}`.

Diese 41 Felder wurden von der Lese-App angezeigt — im ausgelieferten Stand (`37038011`)
genauso, unverändert bis heute. Nach diesem Zug hält sie sie zurück (`situationModell()`
lässt kein `sensibel:true`-Feld mehr durch). Damit sieht die Lese-App an dieser Stelle NICHT
MEHR aus wie `37038011` — und das ist richtig so: der Maßstab lautet „wie `37038011`, ohne
eventuelle Fehler", und ein sensibles Feld anzuzeigen war einer dieser Fehler. Das steht darum
hier als BENANNTE, BEGRÜNDETE Abweichung vom Vor-Zustand, nicht als stiller Nebeneffekt —
sonst meldet die A==B-Abnahme (Achse B6a) diese Abweichung in vier Wochen als Fund. Die
Entscheidung, ob dieser Rückhalt so gewollt ist, ist eine Produktentscheidung; sie ist
zur Bestätigung vorgelegt.

### 2. Typ geändert, 5 Felder — geprüft: kein Datenverlust bei Alt-Werten

`geburt_hebamme` (`text`→`ref`) · `geburt_kind_kv` (`text`→`auswahl`) ·
`vj_krankenversicherung` (`text`→`auswahl`) · `erb_erbschein` (`text`→`auswahl`) ·
`erb_notar` (`text`→`ref`).

Geprüft, nicht angenommen: ein alter Freitext-Wert (vor der Typ-Änderung eingegeben, passt zu
keinem Katalogwert) geht nicht verloren — `_wertTextMenschlich` zeigt ihn roh an; ein echter
Katalogwert bekommt sein Label (Probe: `erb_erbschein` mit Freitext „Bankvollmacht vorhanden,
evtl. entbehrlich" → Text erscheint unverändert; mit `nicht_noetig` → „nicht nötig").
`geburt_hebamme`, `geburt_kind_kv`, `vj_krankenversicherung` sind zugleich jetzt sensibel
(Abschnitt 1) — der Typwechsel ist für sie am Bildschirm unsichtbar, weil das Feld ohnehin
nicht mehr erscheint.

### 3. Fristregel neu, 2 Felder

`geburt_kind_kv` (§ 198 Abs. 1 VVG, zwei Monate — unsichtbar, s. Abschnitt 1, sensibel) ·
`erb_sterbeurkunde` (§ 28 PStG, drei Werktage — NEU SICHTBAR, dieses Feld ist nicht sensibel).

### 4. Sechs neue Felder — Wiedergewinnung, nicht Preisgabe

`geburt_datum`, `erb_sterbedatum` (echte neue Inhalte, wenn befüllt: Geburts-/Sterbedatum) ·
`geburt_kind_kv_frueher`, `vj_krankenversicherung_frueher`, `erb_erbschein_frueher`,
`erb_schulden_kenntnis`.

Die vier zuletzt genannten sind die kerneigene Migrations-Auffangstelle für alten Freitext,
der zu keinem Katalogwert passt (`_frueher`-Konvention bzw. `erb_schulden_kenntnis` als
eigenständiges Fristfeld). Die Handkopie kannte diesen Mechanismus nicht: bei einer
betroffenen Bürgerin zeigte die Lese-App bisher STILL NICHTS, wo jetzt der alte Text unter
„… — frühere Angabe" erscheint. Das ist ein eigener Befund und der Grund, warum Handkopien
gefährlicher sind, als sie aussehen — sie kannten den Migrationsmechanismus des Kerns nicht,
und niemand hat es gemerkt, weil das Ergebnis Stille war, kein Fehler.

### 5. Zwei tote Querverweise, beide vorgefunden, keiner neu erzeugt

- `identitaet.ausweis_nr` → `identitaet.ausweis` (`volljaehrig`): `ausweis_nr` ist in der
  Lese-App selbst `sensibel: true` (war also schon vorher unsichtbar); `ausweis` existiert in
  der lese-app-eigenen Bereichs-Kopie gar nicht (eigene, unabhängige Altlast — nicht Teil
  dieses Auftrags). Netto: keine Änderung, die Zeile bleibt in beiden Fassungen unsichtbar.
- `finanzen.konto_haupt_bank` → `finanzen.konten` (`notar`, `einfach-so`, `erbfall`):
  `konto_haupt_bank` existierte in der lese-app-eigenen Bereichs-Kopie NIE — eine dritte,
  unabhängig gefundene tote Verknüpfung, älter als dieser Auftrag. `konten` existiert (Typ
  `liste`, nicht sensibel). Geprüft mit echten Kontodaten: `notar`, `einfach-so` und
  `erbfall` zeigen jetzt eine Zeile „Konten: <Bankname>", wo vorher gar nichts stand. **Das
  ist keine neue Datenkategorie** — derselbe Bankname steht ohnehin sichtbar im Bereich
  „Finanzen" selbst —, **aber eine zusätzliche Stelle, an der dieselbe Angabe erscheint.** Die
  Lese-App ist das, was ein EMPFÄNGER einer geteilten Datei sieht — das gehört ausdrücklich
  benannt, nicht stillschweigend als unbedenklich vorausgesetzt.

Beide toten Querverweise bestanden bereits vor diesem Auftrag, unabhängig von den heutigen
Bündel-Migrationen. Daraus ist ein eigener, generischer Folgeposten geworden: Verweise,
die ins Leere zeigen, sind in BEIDEN Apps zu suchen (Lese-App und Kern), nicht nur an den zwei
hier zufällig gefundenen Stellen.

## Abgrenzung: nicht zu verwechseln mit den vier Dokumentmodulen

Im Zuge des Zuschnitt-Nachtrags (Template-Generator gehört mit in die DoD) wurde geprüft, ob
`vivodepot-template-generator.html` einen der vier migrierenden Bestände liest oder eine
eigene Kopie führt. Ergebnis: null Treffer für `SITUATIONEN`, `WIZARDS`, `PV_BMJ`,
`VOLLMACHT_BMJ`, `KI_KORPUS`, `BUERGERMODUL_BUENDEL` — sowohl bei `37038011` als auch beim
aktuellen Kanon. Für die vier „Dokumentmodule" im engeren Sinn — `PV_MODUL`
(`patientenverfuegung`, Zeile 40397), `KI_MODUL` (`ki-verfuegung`, 40897), `VOLLMACHT_MODUL`
(`vorsorgevollmacht`, 41015), `BETREUUNG_MODUL` (`betreuungsverfuegung`, 41165) — bestätigt
auch von `tools/dokumentmodul-folge-fingerabdruck.js`s eigenem Selbsttest: ebenfalls null
Treffer im Generator, an beiden Ständen. Die Trennung ist keine neue Drift, sie bestand schon
bei Auslieferung.

**Nicht zu verwechseln:** `STANDARD_VORLAGEN` (Kern, Zeile 24336: `patientenverfuegung`,
`betreuungsverfuegung`, `vorsorgevollmacht`, `organspende`) ist eine VIERTE, unabhängige
Registrierung — signierte JWS-Vorlagen für die Vertrauens-/Signierkette
(`tools/basistemplate-neu-signieren.js` ↔ `docs/template-generator/basistemplate-inhalte.json`).
Sie teilt drei von vier Themen mit den Dokumentmodulen, ist aber strukturell unabhängig (ihr
viertes Thema ist `organspende`, nicht `ki-verfuegung`). Diese Abgrenzung steht hier, damit
sie beim nächsten Mal nicht neu gemessen werden muss.

## Umsetzung

- `tools/build-situationen-lesen.js` (neu) — Erzeuger, `--check`-Modus.
- `vivodepot-lesen.html` — `SITUATIONEN`/`SITUATION_BY_ID` als markierte, generierte Region;
  `situationModell()` trägt `block.hint` und wertet `block.bedingung` aus
  (`SITUATION_BEDINGUNGEN_ERLAUBT_LESEN`, `_kiHatDatenLesen()`); `situationContentHTML()`
  rendert `block.hint`.
- `hooks/pre-commit` — `build-situationen-lesen.js --check` verdrahtet.
- `tests/situationen-lesen-generator.test.js` — Selbstprobe des Erzeugers (Region da, trägt
  den Kern-Bestand, Rot-Beweis bei Drift, Marker-Wurf, `--check` im pre-commit).
- `tests/situationen-lesen-generator-kopplung.test.js` — Kopplungs-Probe der
  Rendering-Logik gegen die erzeugte Form (acht Fälle, s. Zwischenfund 2).
- (entfallen 19.09.2026 mit dem Gegenstand: der Test der Ausschluss-Bedingung, s. U2-ADR-NNN.)

## Referenzen

U2-ADR-341c (bedingte Situationsblöcke) · U2-ADR-258 (A467-Nachtrag, „heute folgenlos" ist
keine Zusicherung) · Auftrag, Achse B6a/„Zusicherung über den Schreibweg gilt
nicht am Leseweg" (06.09.2026) · gemeinsame Messung mit Peer `a5` (`_ANG_SITUATIONEN`-Ausschluss).
