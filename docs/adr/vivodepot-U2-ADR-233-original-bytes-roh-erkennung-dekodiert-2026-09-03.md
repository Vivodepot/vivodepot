# U2-ADR-233 · Original-Bytes bleiben roh, Erkennung bleibt dekodiert

**Datum:** 03.09.2026
**Status:** Angenommen · gebaut 03.09.2026 (Suite grün)
**Status heute:** gilt
**Grundlage:** Vorlauf-Messung
**Bezug:** U2-ADR-086 (Klasse-4-Datei-Export — Durchreiche, kein Producer) · U2-ADR-045/048/049
(autoritative Original-Ablage) · Vorlaufberichte vom 03.09.2026: „Urkunde-Byte-Genauigkeit und
Dokumentklassen" und „Urkunde: BOM-Kette + Bildverkleinerung — Zug 1"

---

## 1 · Kontext

„Original herunterladen" (U2-ADR-086) gibt ein autoritativ importiertes medizinisches Dokument
(eu-lab, eu-hdr, profiliertes IPS) unverändert zurück — gebaut mit dem Anspruch „Bytes rein, Bytes
raus, kein Neubau". Eine eigene Vorlauf-Messung (03.09.2026) hat diesen Anspruch geprüft und
einen einzigen, aber folgenreichen Rest gefunden: **Ein führendes UTF-8-BOM in der Originaldatei
überlebt den Weg nicht.** `datei.text()` (Standard-Browserverhalten, W3C „UTF-8 decode") entfernt
ein BOM beim Einlesen, VOR jedem Vivodepot-eigenen Code. Die drei Bytes sind ab diesem Moment für
immer weg — kein Fehler, keine Warnung, nichts im Produkt, das es je bemerken könnte.

**Warum das zählt:** Eine Personenstandsurkunde oder ein qualifiziert signiertes Dokument trägt
seine Beweiskraft in der byte-genauen Form, in der die ausstellende Stelle es erzeugt hat. Fehlen
drei Bytes — und sei es nur eine Kodierungs-Marke ohne sichtbaren Inhalt —, ist eine kryptografische
Signatur über die Originalbytes nicht mehr gültig gegen die von Vivodepot herausgegebene Kopie: aus
der Urkunde wird eine Kopie, unbemerkt.

**Die naheliegende Reparatur wäre falsch gewesen.** Ein erster Messdurchgang zeigte: würde man das
BOM einfach nicht mehr entfernen (`datei.arrayBuffer()` statt `datei.text()`, ohne weitere
Anpassung), bricht die FORMAT-ERKENNUNG. Die Registry-Stelle für `fhir-lab`
(`_istAutoritativesMedDokument`, `JSON.parse`-basiert) trägt bereits den Kommentar „MUSS vor
fhir-ips stehen: importFormatErkennen nimmt den ERSTEN Treffer, und fhir-ips.erkennen matcht jedes
Bundle" — ein BOM lässt `JSON.parse` werfen, die Reihenfolge-Absicherung greift dann nicht mehr, und
der generische, Regex-basierte `fhir-ips`-Fallback (keine `JSON.parse`-Empfindlichkeit) übernimmt
die Erkennung fälschlich. Ergebnis, gemessen: ein BOM-behafteter eu-lab-Bericht würde als
`fhir-ips` erkannt, `importPlanGeprueft` liefert `ungueltig:true`, leerer Plan — der Laborbefund
wird gar nicht mehr erkannt, statt (wie vor diesem ADR) erkannt und bis auf drei Bytes korrekt
herausgegeben zu werden. **Ein naiver Fix wäre schlechter gewesen als der Fehler.**

---

## 2 · Entscheidung

**Ein String trägt heute zwei Aufgaben, die entkoppelt gehören: Format-Erkennung (braucht einen
dekodierten String) und die maßgebliche Ablage (braucht die rohen Bytes). Die Regel:**

> **Die maßgebliche Kopie wird byte-treu abgelegt. Die Erkennung arbeitet auf einem dekodierten
> String.**

Umgesetzt als additive Erweiterung, kein Umbau der 17 registrierten Import-Formate:

- `flowImportAuto`/`flowImportDatei` (`vivodepot.html`) lesen die gewählte Datei EINMAL über
  `datei.arrayBuffer()`. `text` wird daraus per `TextDecoder` abgeleitet — Standardverhalten,
  identisch zum bisherigen `datei.text()` (BOM wird für die Erkennung weiterhin entfernt,
  unverändert). Die rohen Bytes bleiben zusätzlich als `Uint8Array` erhalten.
- `_importEingabeAufteilen` liefert neu `unveraendert: true/false` — `true`, wenn der Text roh
  durchgereicht wurde, `false` beim 2b-Bundle-Sonderfall (der `providerCredentialJws`-Teilstring
  wird aus einer JSON-Hülle herausgeschält; die vollen Datei-Bytes sind dann NICHT mehr „das
  Original" dessen, was importiert wird). Nur bei `unveraendert:true` werden die rohen Bytes an den
  autoritativen Zweig weitergereicht — sonst `null`, bewusste Fallunterscheidung, kein
  Durchreichen ins Blaue.
- `flowImportAutoritativ`/`importAutoritativDokument` bekommen die rohen Bytes als neuen, optionalen
  Parameter. Erkennung (`_autoritativesMedDokumentTyp`, `JSON.parse`) bleibt unverändert auf dem
  dekodierten `text`. Nur die Ablage wechselt: mit Bytes `_bytesZuDataUrl(rohBytes, mime)` (neu,
  reines Base64 der rohen Bytes, kein Encode/Decode-Umweg), ohne Bytes weiterhin
  `_fhirTextZuDataUrl(roh)` wie bisher (Rückfall, kein Verhaltensbruch für Aufrufer ohne Bytes,
  z. B. den Bestand der Tests).
- `flowMappeOriginalHerunterladen` liest neu über `_autoritativRohBytes` (Geschwister von
  `_autoritativKlartext`, ohne den TextDecoder-Schritt) — sonst hätte der Export dieselben drei
  Bytes ein zweites Mal verloren, egal wie sauber die Ablage ist. `_autoritativKlartext` selbst
  bleibt unverändert für alle Konsumenten, die den Inhalt als lesbaren STRING brauchen (SHL-Payload,
  FHIR-Narrative-Renderer) — dort ist ein dekodierter String weiterhin richtig.

**Kein Touch an den 17 Format-Erkennern, keine Krypto-Berührung.** Die Erkennungskette
(`_importEingabeAufteilen` → `importFormatErkennen` → `importPlanGeprueft`) läuft auf demselben
Text wie vor diesem ADR.

---

## 3 · Rot-Beweis, zweiseitig (Auftrag Zug A)

Ein Fix an dieser Stelle ist nur belegt, wenn BEIDE Seiten geprüft sind — Byte-Treue UND
unveränderte Erkennung:

1. **Byte-Treue:** eine eu-lab-Datei MIT führendem BOM aufnehmen, herausgeben — SHA-256 der Ausgabe
   gleich SHA-256 der wahren Originaldatei (BOM inklusive). Ohne den Fix: ungleich (fehlten drei
   Bytes).
2. **Erkennung:** dieselbe BOM-behaftete Datei wird weiterhin als `fhir-lab` erkannt (nicht als der
   generische `fhir-ips`-Fallback) und bleibt auf dem autoritativen Ablage-Zweig
   (`autoritativDoc: true`).

Beide Proben in `tests/original-byte-treu-bom.test.js`. Eine dritte Probe hält den Rückfall fest:
ohne übergebene Bytes (Bestandsaufrufe mit einem Argument) bleibt das Verhalten unverändert — geprüft
über die Bytes, nicht mehr über einen String-Zwischenschritt (der Download-Weg ist jetzt immer
byte-basiert). Zwei Bestandstests (`tests/autoritativ-import.test.js`, U2-ADR-086) sind entsprechend
angepasst: sie prüfen weiterhin exakt dieselbe Eigenschaft (Original-Bytes byte-identisch am
Ausgang), jetzt über einen Bytevergleich statt über String-Gleichheit — der Download liefert seit
diesem ADR grundsätzlich `Uint8Array`-Teile, kein `Blob([string])` mehr.

---

## 4 · Konsequenzen

**Positiv.** „Original herunterladen" ist jetzt byte-treu zur wahren Originaldatei, einschließlich
eines etwaigen führenden BOM — nicht nur zu dem, was Vivodepot nach dem Decodieren gespeichert hat.
Der 2b-Bundle-Sonderfall verliert nichts (fällt bewusst auf den bisherigen Text-Weg zurück, statt
fälschlich die volle Rohdatei als „Original" eines extrahierten Teilstrings zu behandeln).

**Kein Schema-Bump.** Die Struktur eines `data.mappe[]`-Eintrags (`inhalt` als Data-URL) ist
unverändert — nur WIE die Bytes hinter dieser Data-URL entstehen, ändert sich.

**Grenze, ausdrücklich benannt.** Dieses ADR schließt die Lücke für den autoritativen FHIR-Import-
Weg (`flowImportAuto`/`flowImportDatei` → `flowImportAutoritativ`). Es berührt nicht die eigene-
Upload-Mappe (`flowMappeEigenesHerunterladen`/`dataUrlZuBlob`) — die war bereits byte-treu (kein
Text-Umweg, gemessen im Vorlaufbericht) — und nicht die Bildverkleinerung (separater Fund, eigener
Zug, U2-ADR folgt gesondert).

---

*Vivodepot GmbH · Berlin · 03.09.2026*
