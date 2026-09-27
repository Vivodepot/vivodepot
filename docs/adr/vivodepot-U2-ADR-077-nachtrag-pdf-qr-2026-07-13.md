# U2-ADR-077 — Nachtrag: der PDF-Selbstverifikations-QR trug dasselbe Leck

**Status:** Gegenstandslos (bereinigt 25.09.2026)
**Typ:** Nachtrag zu U2-ADR-077 (Notfall-QR-Kodierung) — deckt einen Ort ab, der dort **nicht**
mitgeprüft wurde.
**Bezug:** U2-ADR-077 (Notfall-QR: Klartext → Kontakte-vCard), U2-ADR-082 (QR-Kette-Reparatur +
Kamera-Erfassung), Befund-Dokument vom 13.07.2026 (internes
Arbeitsdokument, nicht Teil dieses Repos),
Reparatur-Gesamtkonzept, Punkt E5 (internes Arbeitsdokument, nicht Teil dieses Repos).
**Status heute:** gegenstandslos — der PDF-Selbstverifikations-QR
(`zeichnePdfSelbstverifQr`/`pdfQrText`/`pdfQrNutzlast`) ist ersatzlos entfernt, kein Vorkommen mehr
im Kern; eigener Test mitentfernt.

## Was der Nachtrag korrigiert

U2-ADR-077 stellte fest: ein Klartext-QR wird von der nativen iOS-Kamera nicht als eigener
Handler erkannt und stattdessen an die Google-Websuche weitergereicht — ein Leck, keine
Entscheidung. Die Analyse und die Entscheidung (Option C, Kontakte-vCard) betrafen **ausschließlich
den Notfall-QR**. Der Text hielt fest: „an einer Stelle, die dort nicht mitgeprüft wurde" — genau
diese Stelle ist mit dem Bedien-Durchlauf vom 13.07. jetzt aufgetaucht: der
**PDF-Selbstverifikations-QR** (Gesamt- und Bereichs-Export, `zeichnePdfSelbstverifQr` /
`pdfQrText`) trug ebenfalls Klartext-JSON — je nach Bereich Blutgruppe, Diagnosen, Medikamente,
Pflegegrad, Kontonummer, Testament, Bestattungswunsch — ungeschützt vor demselben
Kamera-Mechanismus.

**Wichtig, um Verwechslung zu vermeiden:** dies ist NICHT dieselbe Payload wie der Notfall-QR
(U2-ADR-077 behandelte nur `notfallKernText`/`notfallKontakteVcard`). Der PDF-QR war ein **zweiter,
unabhängiger Erzeuger** mit eigener Nutzlast (`pdfQrNutzlast`, die volle Modell-Projektion des
exportierten PDFs). Beide Erzeuger litten am selben Fehler — Klartext ohne Rücksicht auf die
Plattformgrenze —, aber es waren zwei getrennte Code-Pfade, zwei getrennte Bau-Entscheidungen, die
nie gegeneinander abgeglichen wurden.

## Sofortmaßnahme (bereits umgesetzt, 13.07.2026)

Der PDF-Selbstverifikations-QR wurde **ersatzlos entfernt** (Commit `56f75fc`) — analog zu Option B
aus U2-ADR-077 („QR ersatzlos streichen"), nicht Option C (kein Ersatz-Payload gebaut). Begründung:
die Lese-App konnte mehrteilige QR zum Zeitpunkt des Befunds ohnehin nicht zusammensetzen (U2-ADR-082
behob das separat), der Block nützte niemandem und leckte gleichzeitig. Der Aufforderungstext
(„Maschinenlesbare Selbst-Verifikation … scannt ihn und prüft") ist mit entfernt — er versprach eine
Prüfbarkeit, die den Leck-Umweg in Kauf nahm.

**Unverändert, geprüft nicht angenommen (Stufe 1):**
- Notfall-QR (eigener Pfad, U2-ADR-077 bleibt in Kraft)
- Der In-App-Modal-QR (`flowBereichQr`/`bereichQrText`/`bereichQrModell`) — **einziger** verbliebener
  Weg, wie die Lese-App Daten bekommt. Trägt weiterhin Klartext-JSON, ist aber der Weg, den die
  Kette absichtlich benutzt (U2-ADR-082) — hier ist der Leck-Charakter derselbe, nur ist dieser
  Pfad noch nicht abgeschaltet, weil er die einzige Brücke zur Lese-App ist.
- Anlass-/Situations-Export — hatte ohnehin nie einen QR-Block.

## Was noch offen ist — E5 (nicht Teil der PDF-QR-Sofortmaßnahme)

Der Modal-QR (`flowBereichQr`) ist strukturell dasselbe Risiko wie der ursprüngliche Notfall-QR
vor U2-ADR-077: ein Klartext-`VDQR|…`-Rahmen, den eine falsch gegriffene Systemkamera an eine
Websuche weiterreichen kann, bevor die Lese-App überhaupt zum Zug kommt. Zwei Wege stehen offen
(Reparatur-Gesamtkonzept, Punkt E5):

- **Payload so formen, dass die Systemkamera kein Handler-Ziel findet** (z. B. ein Trägerformat,
  das nicht als reiner Text interpretiert wird — Analogon zur vCard-Lösung bei U2-ADR-077, aber
  ohne den Bereichsdaten-Umfang in ein Kontaktfeld zu pressen).
- **Payload verschlüsseln** (Schlüssel müsste dann außerhalb des QR selbst transportiert werden —
  eigene Schlüsselverteilungsfrage).

Beide Wege berühren die Lese-App und sind eine Architekturentscheidung, kein Fix — **nicht Teil
dieses Nachtrags, nicht Teil der PDF-QR-Sofortmaßnahme oder der zweiten, hier nicht behandelten
Sofortmaßnahme.** Zusätzlich offen (E5, zweiter Punkt): wie
mehrteilige QR angezeigt werden — heute stehen im Prinzip alle Teile gleichzeitig im Bild, ein
Einzeln-anzeigen-mit-Weiterblättern ist der naheliegende Weg, aber ungebaut.

## Gates

Siehe Commit `56f75fc`: Suite 1367/0 (von 1376/0, −9 Tests — `tests/pdf-qr-selbstverif.test.js`
entfernt, T-QR-05 aus `qr-kette.test.js` entfernt), OSV CLEAN, sw.js CACHE + SCHALEN_STAND v57→v58
(Lockstep). Kein Push (eine Produktentscheidung).

## Cross-Referenz

Ergänzt U2-ADR-077 um den zweiten Erzeuger-Pfad, der dort nicht mitgeprüft wurde. E5 (Payload-Form
oder Verschlüsselung für den verbleibenden Modal-QR) bleibt eine offene, eigenständige
Architekturentscheidung — Reparatur-Gesamtkonzept vom 13.07.2026 (internes Arbeitsdokument,
nicht Teil dieses Repos).

## Konformität

```konformitaet
aussage:   Der PDF-Selbstverifikations-QR (`zeichnePdfSelbstverifQr`/`pdfQrText`/`pdfQrNutzlast`)
           wurde ersatzlos entfernt.
zustand:   abgeloest
quelle:    entscheidung
```

Grund: Der eigene Test dieses Erzeugers (`tests/pdf-qr-selbstverif.test.js`) wurde im selben Zug
gelöscht (Commit `56f75fc`, Suite 1376→1367) — es gibt keinen bestehenden Test mehr, der etwas über
diesen Erzeuger behauptet, weil es ihn nicht mehr gibt. Geprüft per grep (05.08.2026): keine der drei
Funktionen kommt in `vivodepot.html` noch vor.

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
