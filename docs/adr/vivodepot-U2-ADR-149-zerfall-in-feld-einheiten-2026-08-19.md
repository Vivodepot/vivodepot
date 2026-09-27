# U2-ADR-149: Der Depot-Inhalt zerfällt in Feld-Einheiten — und der Beleg reist mit

**Status:** Akzeptiert
**Datum:** 19.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, SICHERHEIT
**Grundlage:** Produktentscheidung vom 18.08.2026 (internes Entscheidungsdokument,
mit Nachtrag zu den Fachnamen) und vom 19.08.2026 (internes Entscheidungsdokument,
Möglichkeit A). Vormessungen: A331 (Zuschnitt), A332 (Kosten, pseudonyme Adressen), A333 (Grenze
Format/Bedienung), A334 (Fachnamen im Klartext), A338–A340 (der Block-Wechsel), A344 (Pro-Durchstich:
kein Fund mit Formatanteil).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `deriveAdressKeyV4`/`feldAdresseV4`/`_aadEinheitV4`/
  `_einheitSchluesselNeu`/`_einheitSchluesselWickeln`/`_einheitSchluesselEntwickeln` (im
  VdCrypto-Block), `_zerfallEinheiten`/`_zerfallZusammensetzen`/`_zerfallLesen`,
  `depotSerialisierenV4`, `depotSerialisierenV3` (der Rückweg), `depotSerialisieren` (der
  Schnitt), die Migrationsstufe 65→66 in `depotNormalisieren`, `importierteVorlagen[].beleg`;
  `vivodepot-lesen.html` — `_zerfallLesenLeseApp`, `erkenneFormat`.
- **ADR-Bezug:** U2-ADR-016 (Krypto-Generation 3 — die Vorgängerin), U2-ADR-066 Nachtrag 9
  (der Block-Pin-Wechsel, mit dem die Primitiven kamen), U2-ADR-037 (`feldDefinitionen`,
  dieselbe additive Bauart), U2-ADR-039/040 (die Signatur-Kette, aus der der Beleg stammt),
  U2-ADR-050 (Rettungsfeld-Muster), U2-ADR-123/124 (Blackbox-Export — bleibt v3, weil
  Sub-Depots nicht zerfallen).
- **Status heute:** gilt — Belege `tests/zerfall-feld-einheiten.test.js` (16),
  `tests/zertifikat-slot-stufe66.test.js` (6), `tests/rueckweg-bestandsdepot-stufe.test.js` (4),
  `tests/umschlag-form.test.js`, `tests/e2e/zuschnitt-oeffnungszeit.spec.js`.

---

## Der Befund

**Bis heute lag der ganze Depot-Inhalt unter EINEM Chiffrat.** Das war einfach und sicher — und es
machte eine Zusage unmöglich, die das Produkt braucht: einer Vertrauensperson genau die Felder zu
geben, die sie sehen soll, und keines mehr. Wer ein Feld herausgeben wollte, gab die Datei heraus.

**A331 hat gemessen, dass genau eine Stufe die Angehörigensicht verlustfrei abbildet:** die
FELD-Stufe (528 Einheiten). Sektions- und Bereichsschnitt legen 49 bzw. 53 Felder zu viel offen,
darunter Angaben, die eine Arbeitslosigkeit offenbaren.

**Und A331 hat einen Befund geliefert, der in keinem Papier stand:** `_AAD_DEPOT_V2` identifiziert
keine Einheit. Blieben alle Einheiten unter derselben AAD gebunden, liesse sich der Ciphertext von
`gesundheit.blutgruppe` an die Stelle von `identitaet.vorname` legen — und er entschlüsselte
fehlerfrei.

## Die Entscheidung

**1 · Der Inhalt zerfällt in Feld-Einheiten, jede mit eigenem Inhaltsschlüssel.** Die Schlüssel
liegen gewickelt in einer Umschlagstabelle; der Anker-Eintrag trägt sie alle.

**2 · Die Adressen sind pseudonym.** HMAC-SHA256 über den Feldnamen unter einem eigenen,
domain-separierten Adress-Schlüssel (`vivodepot/v4/adressen/`), auf 16 Byte gekürzt. **Ohne sie
verriete die Datei OHNE JEDES PASSWORT, welche Felder ausgefüllt sind** — `sozialversicherung.gdb`
vorhanden heisst: es gibt einen Grad der Behinderung. Das wäre qualitativ schlechter als vorher,
und es folgt aus genau dem, was den Zerfall attraktiv macht: der Adressierbarkeit.

**3 · Der Name reist IN der Einheit mit** (`{name, wert}`). Das ist die Bedingung, unter der alles
trägt: die Pseudonymisierung ist damit eine Eigenschaft der DATEI, nicht der Laufzeit —
Migrationskette, Blackbox-Export und `depotNormalisieren` arbeiten weiter auf dem entschlüsselten
`data` und sehen nie ein Pseudonym. A317 hat gemessen, dass `depotNormalisieren` die inneren
Schlüssel gerade NICHT filtert: eine Datei kann Adressen mitbringen, die der Katalog nicht kennt.
Mit dem Namen in der Einheit ist ihr Urbild immer rückgewinnbar.

**4 · Die AAD bindet die Einheit an ihren Platz.** Je Einheit zusätzlich `depotUUID` und die
Adresse. Pseudonym und AAD stützen einander: das Pseudonym ist genau die stabile, eindeutige,
ohnehin vorhandene Kennung, die eine AAD braucht.

**5 · Die Umschlagstabelle folgt Form 3.** Im Klartext: eine **neutrale Kennung** (`Fach 1` …),
`kdf` und die gewickelten Schlüssel. Verschlüsselt: `name`, `ortHinweis`, `stand`. **Der Anker
bekommt denselben neutralen Index wie jedes Fach** — eine leere Belegung wäre selbst eine Aussage.
**Die Zusage, die daraus folgt und die belegt ist: ohne Passwort gibt die Datei die ZAHL der
Einträge preis und sonst nichts.**

**6 · Der signierte Beleg reist im Depot mit** (Schema 66). `importierteVorlagen[]` trug bis heute
nur das ERGEBNIS einer Prüfung; die Lese-App hatte nichts nachzuprüfen, und eine Anzeige „geprüft
und gültig" ohne Prüfgegenstand wäre eine Behauptung gewesen. **Beide Stücke reisen** —
`templateJws` UND `providerCredentialJws` —, und das ist gemessen, nicht angenommen: der
Anbieter-Public-Key steckt ausschliesslich im Zertifikat.

**7 · Der v3-Lesepfad bleibt.** `KRYPTO_VERSION_ALLOWLIST = [3, 4]`. Er ist der RÜCKWEG, nicht nur
ein Migrationsweg. **Und `depotSerialisierenV3` bleibt erreichbar**, obwohl nichts im Produkt ihn
ruft: ein Rückweg, dessen alte Form sich nicht mehr ERZEUGEN lässt, liesse sich nicht proben.

**8 · Eine Stufe, nicht zwei.** Feld-Einheiten und Zertifikat-Slot fahren in EINEM Schnitt. Ein
neuer Schlüssel ist eine Migrationsstufe; wäre der Beleg nachgereicht worden, bliebe sie für immer
als zweite in der Kette jedes Depots. **Das ist der ganze Grund, aus dem A337 vor der Stufe
entschieden werden musste.**

## Was gemessen wurde, nicht behauptet

| Frage | Antwort |
|---|---|
| Öffnungszeit an der scharfen Fassung | **v4 ≈ v3** — 39,1 ms gegen 44,8 ms (CPU ×1), 44,4 ms gegen 42,4 ms (CPU ×6). PBKDF2 dominiert; der Zerfall kostet praktisch nichts. Vorbehalt A334: die Drosselung greift bei PBKDF2 nicht. |
| Dateigröße | Am leicht befüllten Depot (41 Einheiten) **1666 B → 12156 B**. Der feste Anteil je Einheit dominiert dort; A332 misst am Referenzdepot ×2,39. |
| Verlust über die Stufe | **Kein einziger Pfad weicht ab** — derselbe Bestand über den alten und über den neuen Weg geführt kommt identisch heraus. |
| Was ein Zyklus ohnehin ändert | Drei Pfade (Rechtsraum-Stempel am Vorsorge-Instrument) — **vorbestehend, über beide Wege gleich**. Nicht dem Zerfall zuzuschreiben. |

## Zwei Funde, die der Schnitt selbst zutage gebracht hat

**Die Lese-App hatte die Primitiven, aber keinen Lesepfad.** Der VdCrypto-Block ist byte-identisch
propagiert — die Generation 4 stand also schon in der Datei. `leseDepotUmschlag` griff aber auf
`umschlag.iv` zu, das es in v4 nicht gibt. **Ein v4-Depot kam durch das Versions-Gate und scheiterte
danach.** Nachgezogen als read-only Spiegel von `_zerfallLesen`.

**Und ihre Format-Erkennung fragte nach `iv`/`ct`.** Eine zerfallene Datei fiel damit auf
`unbekannt` — die Lese-App zeigte gar kein Passwortfeld, und die Bürgerin bekam „unbekanntes
Format" für ihr eigenes, intaktes Depot. **Gefunden hat das nicht eine Vermutung, sondern das
Konformitäts-Gate über die Lese-App.**

## Was ausdrücklich NICHT entschieden ist

**Kein Empfängerkreis** — weder angelegt noch bedient noch widerrufen. Die Tabelle trägt EINEN
Eintrag; sie ist die Fähigkeit, nicht ihr erster Inhalt. **Keine Rotation der Adressen** — Pseudonyme
sind je Depot stabil, und wer zwei Fassungen derselben Datei sieht, erkennt an gleichbleibenden
Adressen, WELCHE Einheiten sich geändert haben. Das Restrisiko ist benannt und getragen, nicht
stillschweigend übergangen. **Keine Entscheidung zu F5** (`angehoerigenCache`). **Kein
Scharfschalten der Belegprüfung in der Lese-App** — das ist A318 Zug 2 und wartet auf den
Ankerwechsel A285, der ausdrücklich davor steht.

---

*Vivodepot GmbH · 19.08.2026*
