# U2-ADR-468: ISiK Stufe 6 — Vollmacht und IPS als DocumentReference für das Krankenhaus

**Status:** Angenommen — entschieden und gegengelesen am 01.10.2026
**Datum:** 01.10.2026
**Kategorie:** INTEROPERABILITÄT, STANDARDS, GESUNDHEIT
**Linie:** U2
**Bezug:** U2-ADR-466 (Vollmacht und Patientenverfügung im IPS/EPS-Export) · U2-ADR-458 (Sprache des IPS-Begleittexts) ·
U2-ADR-097 (Klartext-Ausgabepfade)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

---

## Kontext

Ein Krankenhausinformationssystem nimmt Dokumente nach ISiK (Informationstechnische Systeme in Krankenhäusern, gematik)
entgegen. In Stufe 6 (`de.gematik.isik` 6.0.0) beschreibt das Profil `ISiKDokumentenMetadaten` eine DocumentReference; erst
Stufe 6 erlaubt `subject.identifier` als logische Referenz, sodass eine Person ohne Patientennummer des Hauses ein Dokument
bereitstellen kann. Weg zum Nachsehen: `~/.fhir/packages/de.gematik.isik#6.0.0/package/StructureDefinition-ISiKDokumentenMetadaten.json`.

## Die Entscheidung

1. **Zwei DocumentReferences**, weil `content` im Profil höchstens einen Eintrag hat (gemessen): DR 1 die Vorsorgevollmacht,
   DR 2 die IPS aus `fhirIpsBundle`. Transport: eine Datei, Bundle `type: collection`. ISiK definiert die Übergabe als
   Einzel-Create (MHD ITI-105); ob ein Haus eine Datei aus Patientenhand annimmt, ist nicht belegt — die Ausgabe behauptet keinen
   Import.
2. **DR 1 nur mit der unterschriebenen Urschrift**, so wie sie in „Meine Dokumente“ liegt: die Datei, auf die das Dokument
   der Vorsorgevollmacht per `mappeRef` zeigt. Nie der Vivodepot-Entwurf — ein unsignierter Entwurf im KIS würde als Vollmacht
   gelesen. Eine Datei ist ausgeschlossen, wenn sie am Mappe-Eintrag `erzeugtVonVivodepot: true` trägt
   (`flowDokumentInMappeAblegen` setzt es) oder in der Datei das Merkmal `vivodepot-kern/` (Info /Creator bzw.
   xmp:CreatorTool, gesetzt ab v858 von `_pdfArchivfassungInstallieren`) steht — auch wieder eingelegt.
   Bei jeder anderen Datei bestätigt die Person beim Export einmal, dass es die unterschriebene Fassung ist. Ohne
   Bestätigung entfällt DR 1, mit sichtbarem Grund.
3. **Codes**:
   - DR 1: KDL `AM160103`; DR 2: KDL `AM160199`, der Restcode der Unterklasse `AM1601`, definiert für Dokumente ohne
     spezifischeren Code. Die Anzeigetexte stehen in keiner Datei dieses Repos (Lizenzentscheidung offen); nachzulesen in der
     Datei codesystem-kdl.xml.json im Paket dvmd.kdl.r4#2025.0.1. Was das Dokument ist, steht in `description` und Titel.
   - Der Kern kennt von der KDL genau diese zwei Codes und die System-URL (`KDL_GEBRAUCHT`, `KDL_SYSTEM`), keinen Text — die
     Person lädt die KDL selbst (Nachtrag 02.10.2026 unten). Wächter: tests/kdl-nicht-im-kern.test.js (genau zwei Codes, kein
     KDL-Text im Repo, keiner in der Historie des Push-Bereichs; Texte zur Laufzeit aus dem Paket). Einen KDL-Code für eine Patientenkurzakte gibt es
     nicht (557 Codes durchsucht); die Frage ist an die DVMD gestellt.
   - IHE-D: `type.coding:XDS` PATD, `category` ADM, `context.facilityType` und `practiceSetting` PAT „Patient außerhalb der
     Betreuung“.
   - `content.format`: `urn:ihe:iti:xds:2017:mimeTypeSufficient` aus `IHEXDSformatCodeINTL`, in `IHEXDSformatCodeDE`
     eingeschlossen (`de.ihe-d.terminology#3.0.1`). **Lücke:** einen Formatcode für eine FHIR-IPS gibt es im gebundenen
     ValueSet nicht, auch nicht in IHE-D 4.0.0 — nicht geraten.
   - `subject.identifier`: die Krankenversichertennummer (`http://fhir.de/sid/gkv/kvid-10`), mit Prüfziffer.
   - `securityLabel` N, `masterIdentifier` `urn:oid:2.25.<UUID>`.
   Die Codes stehen als Terminologie-Daten in `code-listen/terminologie/isik.json` (IPS_BEGRIFFE.isik); die zwei KDL-Codes als
   `KDL_GEBRAUCHT` im Kern, ohne Text.
4. **Das Tor.** ISiK verlangt die Anzeigetexte von KDL und IHE-D wörtlich (gemessen: ein eigener Text ist ein Fehler, ein
   fehlender ebenfalls). Sie stehen im Produkt nur, wenn ihre Nutzung erlaubt ist:
   - IHE-D: Creative Commons BY 4.0 vom Rechteinhaber, gebunden an den Quell-Commit `aa1e0e5bed8c5fbcf3ff64636dbce74e6ca8f3b1` von
     `github.com/IHE-Germany/ITI.XDS.VS` (sushi-config, Feld `license`); Codes und Texte gleich 3.0.1, gemessen mit
     `tools/fhir-paket-herkunft-vergleichen.js --codes`. Namensnennung in NOTICE und THIRD_PARTY_LICENSES.
   - KDL: steht unter **GPL-3.0-or-later** (Fundstelle: KDL-Implementierungsleitfaden 2025,
     https://simplifier.net/guide/kdl-implementierungsleitfaden-2025?version=current, gelesen am 01.10.2026). Ob eine
     GPL-Datendatei neben dem EUPL-Produkt geht, war die offene Frage — entschieden am 01.10.2026: **nie einbacken, die Person
     lädt sie selbst** (Nachtrag 02.10.2026 unten). Ohne eingelesene KDL entsteht **keine ISiK-Datei** (Grund
     `kdl-nicht-geladen`), mit ihr bleibt das Tor bis zur Antwort der Fachanwältin zu (`kdl-freigabe-ausstehend`).
   Interne Proben setzen die amtlichen Texte zur Laufzeit aus dem lokalen Paket-Cache ein (`opt.anzeigetexte`,
   `tools/isik-validieren.js`); sie stehen in keiner Datei im Repo.
5. **Weitere Gründe ohne Datei**, jeder gesagt: keine Versichertennummer, keine Freigabe der sensiblen Felder (dieselbe
   Übersicht wie beim IPS-Export). Die Weitergabe läuft durch `mitVereinbarung` (MyTerms Teil D).
6. **Paket-Herkunft.** `de.gematik.isik` 6.0.0 ist aus `github.com/gematik/spec-ISiK-Basismodul`, Tag `v.6.0.0`, Commit
   `4386cc1f5dfa286fe09ffde1c85f1867203c19df`, Apache-2.0, gebaut: Differential des Profils und Inhalt des ValueSets
   ISiKConfidentialityCodes gleich (`tools/fhir-paket-herkunft-vergleichen.js --start …ISiKDokumentenMetadaten`). Das Paket
   dient nur der Prüfung; im Produkt steht allein die Profil-URL.

## Was nicht entschieden ist

- **KBV-Patientenkurzakte für die Vollmacht** (`KBV_PR_MIO_NFDxDPE_Consent_Active_Advance_Directive`, Ablageort-Extension
  Pflicht, ohne `provision.type`): folgt, sobald U2-ADR-466 gelandet ist, aus derselben Consent- und RelatedPerson-Abbildung.
- **Die Freigabe der ISiK-Ausgabe** nach der Antwort der Fachanwältin (Fragen im Register: Sind die zwei Codes geschützt? Ist ein
  weitergegebenes Depot eine Verbreitung? Ist ein Anzeigetext in einer DocumentReference an ein Krankenhaus Verbreitung oder
  bestimmungsgemäße Nutzung?) und ein eigener KDL-Code für eine Patientenkurzakte (Anfrage an die DVMD ist gestellt).
- **Ein IPS-Formatcode** in IHE-D.

## Nachtrag 02.10.2026 — KDL selbst laden (in v863 gefaltet)

Entscheidung der Geschäftsführung, 01.10.2026: „wir backen das nie ein, sondern man kann es unter GPL selber reinladen.“ Entschieden am
01.10.2026 mit drei Auflagen; gefaltet in v863 statt einer eigenen Fassung (02.10.2026), damit keine
KDL-Datei je in einen Commit kommt, der landet.

1. **Einlesen.** Im ISiK-Dialog bietet das geschlossene Tor „KDL selbst laden“: Quelle (`https://packages.fhir.org/dvmd.kdl.r4`,
   ohne Anmeldung, gemessen 02.10.2026) und Lizenzhinweis GPL-3.0-or-later mit Verweis auf gnu.org, dann die Dateiwahl.
   Angenommen werden das CodeSystem als JSON und das Paket `.tgz` (gzip und tar ohne Bibliothek, gelesen wird nur
   die CodeSystem-Datei codesystem-kdl.xml.json im Ordner package des Pakets). Gemessen: die amtliche Datei und das amtliche Paket 2025.0.1 bestehen den Einlass.
2. **Prüfung**, jeder Fehler mit eigener Meldung, gespeichert wird bei keinem etwas: CodeSystem, genau die KDL-URL, Fassung,
   Begriffe; beide gebrauchten Codes mit nicht leerem Text; Größe, Tiefe und Textlänge gedeckelt.
3. **Speichern** im Depot der Person (`data.kdlEingelesen`, verschlüsselt wie alles): nur die zwei Begriffe samt Text und die
   Herkunft (Dateiname, Fassung, SHA-256 der Datei, Zeitpunkt, Lizenz) — nie die übrige Liste. Nur im eigenen Depot, nicht in
   einem verwalteten Sub-Depot, denn das wird weitergegeben.
4. **Das Tor**: ohne KDL `kdl-nicht-geladen`; mit KDL bis zur Freigabe `kdl-freigabe-ausstehend`. Die Freigabe ist ein Datum im
   Kern (`KDL_FREIGABE`), das nur ein Commit setzt, nie die Person (Auflage 3).
5. **Auflage 1 — im Kern genau zwei Codes und die URL**, kein KDL-Text im Repo, kein erfundener Fixture-Text, der einem amtlichen
   gleicht. **Auflage 2 — keine Ausgabe an Dritte nimmt die eingelesene KDL mit**; die eigene Sicherung darf sie tragen.
   **Ergänzung (02.10.2026):** der Wächter prüft JEDEN Commit des Push-Bereichs (`tools/kdl-historie-pruefen.js`, pre-push),
   nicht nur den Baum der Spitze — ein Zwischenstand mit KDL-Datei, der sie später löscht, trüge sie sonst nach draußen.
   Gemessen 02.10.2026: auf `origin` liegt kein Commit mit KDL-Datei oder KDL-Text (`git log --remotes -- '*kdl*'` leer;
   `git log --remotes -S<Code>` findet nur die Erwähnung der Codes ohne Text in U2-ADR-466).
6. Die frühere Datendatei mit den zwei Codes außerhalb des Kerns und ihr Anmelde-Helfer für Proben entfallen; sie kamen in keinen
   Commit, der landet. `tools/isik-validieren.js` speist die amtliche Paketdatei durch denselben Einlass.

## Belege

Validator (validator_cli 6.9.12, offline, `-ig de.gematik.isik#6.0.0`, 01.10.2026): DR 1 und DR 2 aus dem echten Generator
mit den amtlichen Texten zur Laufzeit gültig; ohne KDL-Coding und mit eigenem KDL-Text ungültig. Weg zum Nachsehen:
`node tools/isik-validieren.js --jar <validator_cli.jar>` (mit Suite-Platz).

```konformitaet
aussage:  Ohne eingelesene KDL entsteht keine ISiK-Datei, weder im Bau noch über den Ausgabeweg; der Grund steht da.
zustand:  geprüft
herkunft: invariante
pruefung: tests/isik-dokumente.test.js#[ISiK·Tor] ohne eingelesene KDL: kein Bundle, der Grund steht da — und der Ausgabeweg schreibt keine Datei
```

```konformitaet
aussage:  Die Person lädt die KDL selbst; jede Datei, die die Prüfung nicht besteht, wird mit ihrem Grund abgewiesen, und gespeichert wird nichts.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kdl-selbst-laden.test.js#[KDL·Prüfen·Rot] jeder Abweisungsgrund an seinem Fall
```

```konformitaet
aussage:  Mit eingelesener KDL bleibt das Tor zu, bis ein Commit die Freigabe setzt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kdl-selbst-laden.test.js#[KDL·Tor] ohne KDL „nicht geladen“, mit KDL bis zur Freigabe „Freigabe ausstehend“ — kein Weg schreibt eine Datei
```

```konformitaet
aussage:  Keine Ausgabe an Dritte trägt die eingelesene KDL.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kdl-selbst-laden.test.js#[KDL·Ausgabewege] kein Registry-Format, nicht das IPS und nicht der Erbschein-Auszug tragen die eingelesene KDL
```

```konformitaet
aussage:  Kein Commit des Push-Bereichs trägt eine KDL-Datei, auch kein Zwischenstand, der sie später löscht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kdl-nicht-im-kern.test.js#[KDL·Historie] jeder Commit des Bereichs zählt: kdl.json in n−1, in n gelöscht → rot; ein sauberer Bereich → grün
```

```konformitaet
aussage:  Eine von Vivodepot erzeugte Datei ist nie DR 1, auch wieder eingelegt und auch bestätigt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/isik-dokumente.test.js#[ISiK·Urschrift] von Vivodepot erzeugt (Kennzeichen oder Merkmal in der Datei) ist nie DR 1, auch nicht bestätigt
```

```konformitaet
aussage:  Die zwei DocumentReferences tragen das ISiK-Profil, die KVNR als subject.identifier, je einen content; DR 1 die Urschrift unverändert.
zustand:  geprüft
herkunft: de.gematik.isik#6.0.0 ISiKDokumentenMetadaten
pruefung: tests/isik-dokumente.test.js#[ISiK·DR] interne Probe: zwei DocumentReferences nach ISiKDokumentenMetadaten, DR 1 die Urschrift unverändert, DR 2 die IPS
```

```konformitaet
aussage:  Ohne Versichertennummer oder ohne Freigabe der sensiblen Felder entsteht nichts.
zustand:  geprüft
herkunft: invariante
pruefung: tests/isik-dokumente.test.js#[ISiK·Gates] ohne KVNR oder ohne Freigabe der sensiblen Felder entsteht nichts
```

```konformitaet
aussage:  Die Herkunft eines Pakets wird am Inhalt gegen den Quell-Tag gemessen; schon eine Abweichung heißt ungleich.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-paket-herkunft-vergleichen.test.js#[Paket-Herkunft·Rot] eine Abweichung im differential, im compose oder in einem Konzept ist ungleich
```

---

*Vivodepot GmbH · Berlin · 01.10.2026*
