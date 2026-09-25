# U2-ADR-086 · Klasse-4-Datei-Export — Durchreiche, kein Producer

**Datum:** 14.07.2026
**Status:** Angenommen · gebaut 14.07.2026 (Suite grün, Produktfreigabe)
**Status heute:** gilt — `flowMappeOriginalHerunterladen` (`vivodepot.html:27492`) und der Knopf
„Original herunterladen" sind im Kern vorhanden.
**Bezug:** U2-ADR-045/047/048/049 (autoritative Original-Ablage, Klasse 4) · U2-ADR-050 (Producer-Weg
Lab entfernt — berührt hier nicht) · Stufe-1-Bericht „Durchreiche-Export für eu-lab und eu-hdr" (14.07.2026)

---

## 1 · Kontext

Der Stufe-1-Bericht zur Frage „kann ein autoritativ importiertes eu-lab-/eu-hdr-Dokument wieder
ausgegeben werden, ohne es neu zu bauen?" kam zu einem eindeutigen Befund: **Ja.**

Ein autoritativ importiertes Dokument (`importAutoritativDokument`, U2-ADR-045/048) liegt
byte-identisch als Original in `mappeEintrag.inhalt` (base64-Data-URL des unveränderten Textes).
`_autoritativKlartext(eintrag)` (`vivodepot.html:9189-9196`) dekodiert exakt diese Original-Bytes
zurück — **kein Neubau**. Diese Funktion ist bereits produktiv im Einsatz: der SHL-Provider-Pfad
(`shlProviderPayload`) verschlüsselt genau diesen Klartext für die Weitergabe.

Was fehlte, war ausschließlich die letzte Verdrahtung: das Original als **Datei** (statt
verschlüsselt für SHL) auszugeben.

---

## 2 · Entscheidung

**Ein Datei-Download für Klasse-4-Einträge, der ausschließlich liest und durchreicht.**

- Neue Funktion `flowMappeOriginalHerunterladen(id)` (`vivodepot.html`, nahe `flowMappeEntfernen`):
  liest den Mappe-Eintrag, verweigert bei `!e.autoritativ`, dekodiert über `_autoritativKlartext`
  und reicht das Ergebnis unverändert an `dateiAusgeben` (denselben Mechanismus wie jeder andere
  Datei-Export der App) — Dateiname aus `beschriftung`/`dateiname`, Endung `.json`, MIME aus
  `e.mime`.
- Neuer Knopf „Original herunterladen" in `flowMappeVorschau`, sichtbar **nur** für
  `e.autoritativ === true` — neben dem bestehenden „Sicher weitergeben"-Knopf (SHL), nicht an
  dessen Stelle.
- **Kein neuer Generator, keine Performer-/Author-Rekonstruktion.** Die Funktion interpretiert den
  Inhalt nicht — sie liest eine Zeichenkette und reicht sie weiter.

---

## 3 · Zertifizierungs-Doktrin — ausdrücklich benannt

**Vivodepot erzeugt an dieser Stelle keine klinische Aussage.** Was herausgeht, ist exakt das, was
eine Institution (Labor, Krankenhaus) ausgestellt und was Vivodepot beim Import als konform
erkannt hat (`_autoritativesMedDokumentTyp`, Bundle-Profil-Match) — unverändert, Byte für Byte.
`performer`/`author` im Dokument sind die der ausstellenden Institution, nie die Vivodepots oder
der Bürgerin. Vivodepot bezeugt nur die **Herkunft und Unversehrtheit** der Aufbewahrung
(Provenance im Sinne von „so angekommen, so herausgegeben"), nicht den klinischen Inhalt.

**Das ist kein Producer-Pfad.** Ein Producer-Pfad erzeugt ein FHIR-Dokument aus Bürger-Feldern und
trägt damit **Vivodepots eigene** Aussage über Performer/Autor — genau das Muster, das beim
entfernten `fhirLabBundle()` strukturell nie eu-lab-konform sein konnte (`performer=Patient`,
ADR-050). Ein Durchreiche-Export trägt **keine eigene Aussage** — er verändert nichts an dem, was
bereits konform ins Depot kam.

---

## 4 · Verhältnis zu U2-ADR-050

**U2-ADR-050 wird durch diese ADR nicht angetastet.** ADR-050 entfernte den **Producer**-Weg
(`fhirLabBundle()`, Feld `laborwerte`, Export-Format `fhir-lab`, CI-Validator-Gate) — Vivodepot
erzeugte dort selbst einen Laborbefund aus Bürgerfeldern und scheiterte strukturell an der
Performer-Rolle. Dieser Pfad hier **liest nur, was eine Institution bereits ausgestellt hat** und
gibt es unverändert zurück. Es gibt keinen Generator, den ADR-050 hätte wiederbeleben müssen, und
keinen neuen, den diese ADR einführt. Die beiden ADRs betreffen unterschiedliche Dinge, die
zufällig denselben Datentyp (eu-lab-Bundle) berühren.

Ein etwaiger künftiger Producer-Pfad (Vivodepot erzeugt selbst einen Laborbefund) bliebe von
dieser ADR unberührt und müsste die Performer-Frage eigenständig lösen — dafür ist kein datierter
Supersede nötig, weil es keinen Widerspruch gibt.

---

## 5 · Konsequenzen

**Positiv.** Institutionell ausgestellte eu-lab-/eu-hdr-Dokumente können aus Vivodepot wieder
herausgegeben werden — z. B. für eine erneute Vorlage, eine Gazelle-Sample-Einreichung, oder
schlicht weil die Bürgerin die Datei erneut braucht. Kein neuer Code-Pfad mit
Konformitätsrisiko — der bestehende, bereits geprüfte Lesepfad (`_autoritativKlartext`) trägt es.

**Kein Schema-Bump.** Der Export liest nur; `data`/`schemaVersion` bleiben unberührt.

**Test, der zählt.** `tests/autoritativ-import.test.js` — vier neue Tests: eu-lab byte-identisch,
eu-hdr byte-identisch (ursprünglich gegen das IG-Beispiel Bundle-HDR-Paolo-Marcheschi-Example.json
geprüft, am 12.09.2026 durch ein selbst erzeugtes Profil-Bündel ersetzt — byte-Verbatim braucht
keinen echten Inhalt; s. `tests/fixtures/README.md`),
nicht-autoritative Einträge bekommen keinen Download, unbekannte id stürzt nicht ab. Geprüft über
einen abfangenden `Blob`-Stub (`CapturingBlob`) — die Bytes, die tatsächlich an `dateiAusgeben`
gereicht würden, werden verglichen, nicht nur „der Export lief durch".

**Krypto unberührt.** Kein Zugriff auf den VdCrypto-Block; `mappeEintrag`/`_autoritativKlartext`
sind reine Lesefunktionen auf bereits entschlüsselten Depot-Daten.

---

*Vivodepot GmbH · Berlin · 14.07.2026*
