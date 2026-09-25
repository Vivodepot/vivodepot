# U2-ADR-080 · EUDIW-Nachweise: keine Import-Verifikation — der Fluss kennt keine importierbare Datei

**Status:** Akzeptiert (Nicht-Entscheidung) · 13.07.2026
**Nummer:** U2-ADR-080 (bestätigt gegen `docs/adr/` — höchste belegte war U2-ADR-079).
**Typ:** Nicht-Bau / Scoping-Entscheidung — eine im Clean-Slate fallengelassene Fähigkeit wird **nicht** wieder eingebaut.
**Ersetzt:** ADR-096 (interne Reihe, „EUDIW-PID-Import mit Trust-Anchor-Schicht").
**Ersetzt den Entwurf:** die erste Fassung dieser Nummer („gebackenes Ankerbündel mit Ehrlichkeitshorizont", 12.07.) — verworfen zugunsten der Nicht-Entscheidung.
**Verwandt:** U2-ADR-079 (delegierter IPS-Export), U2-ADR-030 (unsignierte SD-JWT-Selbstauskunft), Zusagen-Audit 12.07. Kategorie 0.
**Externer Bezug:** VC Data Model Position Paper, Finding 1 (DOI 10.5281/zenodo.20180480); D4-Befund (IPS-Rollenlücke).
**Status heute:** gilt — Beleg `tests/sonderfall-verbote.test.js`.

---

## Kontext

Der Clean-Slate-Neubau hat die EUDIW-Trust-Schicht aus b16 nicht übernommen (Zusagen-Audit, Kategorie 0.1). Die Frage war: wieder einbauen? Der **erste Entwurf dieser Nummer** sagte ja — mit einem aus der LOTL abgeleiteten, signierten Ankerbündel, das die App mit jedem Release ausliefert, einem Stichtagsdatum statt eines Hakens und einem Neun-Monats-Ehrlichkeitshorizont. Der Entwurf war sorgfältig und löste das Offline-Verifikations-Problem ehrlich.

Zwei read-only Befunde aus der Anker-Frage (Bau 2) kippen die **Grundannahme** dieses Entwurfs, bevor sein Mechanismus überhaupt greift.

## Die Grundannahme, die nicht trägt

Der Entwurf setzte voraus: **es gibt ein EUDIW-Nachweis, das eine Bürgerin als Datei in Vivodepot importiert, dessen Aussteller-Signatur zu prüfen wäre.** Diese Datei gibt es nicht.

### Befund 1 — kein produktiver Aussteller (Zeit)

Stand Juli 2026 ist die PID-Ausgabe Vor-Produktion. Die Rechtsfrist ist Dezember 2026 (jeder Mitgliedstaat ≥1 Wallet). France Identité ist der einzige Fall nahe echter Produktion; Deutschland startet seine staatliche Wallet erst 02.01.2027; die Annahmepflicht der Diensteanbieter greift erst ein Jahr nach der Frist. Es gibt heute keinen breit-produktiven Aussteller.

### Befund 2 — der Fluss kennt keine importierbare Datei (Architektur; der schwerere)

Das ändert sich auch mit dem Kalender nicht:

- EUDI ist **vorzeigungs-basiert**: Ausgabe per OpenID4VCI in eine **zertifizierte** Wallet → Vorzeigung per OpenID4VP, bei der die Wallet einem Verifizierer **präsentiert**.
- PID ist **geräteschlüssel-gebunden** (Key-Attestation ISO 18045 „high"), in der Referenz-Ausgabe pro Transaktion neu erzeugt und **gar nicht in der Wallet gespeichert** — **nicht übertragbar**.
- Es gibt keinen Fluss „Bürgerin exportiert ihr Credential als Datei und importiert es in eine dritte App". Vivodepots natürliche Rolle wäre ein **vernetzter Verifizierer / Relying Party**, der eine OpenID4VP-Vorzeigung über das Netz empfängt — was Vivodepot nicht sein kann (`connect-src 'none'`, und müsste selbst als RP registriert sein).

Die Datei, deren Aussteller-Signatur der Entwurf prüfen wollte, ist in der Architektur nicht vorgesehen.

---

## Entscheidung

**Vivodepot baut keinen EUDIW-Nachweis-Import mit Verifikation.**

Das ist **nicht vertagt**: es gibt kein Artefakt zu prüfen und keinen Fluss, der eines liefert. Ein Ankervorrat wäre ein Verifizierer ohne Eingabe.

- Der EUDIW-Pfad bleibt **reiner Export** als unsignierte Selbstauskunft, ausdrücklich beschriftet („von Ihnen selbst zusammengestellt und (noch) nicht von einer offiziellen Stelle signiert").
- Der bestehende SD-JWT-**Import** ist ein **Selbstauskunft-Roundtrip** — das eigene Export zurücklesen —, im Code ausdrücklich als „KEIN verifizierter Provider-Bescheid-Import" markiert. Er bleibt unverändert, weil er nichts vortäuscht.
- Die Frage „was zeigt die App bei leerer Ankerliste" stellt sich gar nicht: es gibt keine Import-Prüfung, also keinen erfundenen Status.

## Der Re-Prüf-Auslöser — kein Datum

Diese Entscheidung wird neu bewertet, wenn **beide** eintreten:

1. ein produktiver Aussteller gibt einen Nachweis aus, den die Bürgerin als **signiertes, tragbares Artefakt** hält, **und**
2. es gibt einen realen **Offline-Halte-und-Weitergabe-Fluss**, der dieses Artefakt an Vivodepot liefert.

Bis dahin gibt es nichts zu verifizieren. Kein Release-Rhythmus, kein Horizont — der Auslöser ist das **Erscheinen des Artefakts**, nicht das Verstreichen von Zeit.

---

## Verworfene Alternative — das gebackene Ankerbündel (der Entwurf dieser Nummer)

Der 12.07.-Entwurf löste ehrlich das Problem, das Vivodepot im Paper (Finding 1) selbst beschrieben hat: eine Statusliste mit angezeigtem Alter und einem Horizont, ab dem keine Aussage mehr gemacht wird. Er verworfen zu haben, ist keine Kritik an seiner Sorgfalt.

Er löst ein Problem, das man **noch nicht hat**. Er verifiziert die Aussteller-Signatur auf einem Nachweis, den niemand importieren kann. Ein ehrlicher Verifizierer für eine Eingabe, die die Architektur nicht liefert, ist trotzdem ein Verifizierer **ohne Eingabe** — und er brächte vier ungelöste Betriebspunkte mit (Ableitung, Signierschlüssel, kaputte Signatur, Bürger-Import), für einen Nutzen, der nicht existiert.

Der Horizont-Mechanismus des Entwurfs (Stichtag statt Haken, Ehrlichkeitshorizont) ist gute Vorarbeit und wird intern als Notiz aufgehoben, falls der Re-Prüf-Auslöser je eintritt.

**Weitere verworfene Alternativen** (aus dem Entwurf übernommen, weiter gültig): b16 eins-zu-eins zurückbauen (handgepflegte Liste mit leeren Ankern war nie ein Vertrauensanker); Online-Auffrischung opt-in (bricht `connect-src 'none'`).

---

## Der öffentliche Bruch, den das aufdeckt

Mehrere öffentliche Aussagen — VC-Paper, Website, Master-Briefing, xShare-Bewerbung — beschreiben „EUDIW-Import", „empfängt EUDIW-Credentials" oder „offline-Verifikation gegen Vertrauensanker". Das beschreibt eine Fähigkeit, die es nicht gibt und in der heutigen Architektur nicht geben kann.

Das ist der **vierte Fall der Zusagen-Liste**: Die Fundstellen (Website, Master-Briefing, Paper, xShare) sind erfasst; die Korrektur steht noch aus. Bis dahin bleibt die Aussage öffentlich falsch.

## Das Muster — drei Spezifikationen, ein fehlender Akteur

Diese Nicht-Entscheidung ist der dritte Beleg eines Musters. Keine der drei Spezifikationen modelliert den **offline, selbst-verwahrenden Bürger, der einen Nachweis hält und ohne Netz weiterreicht** — und jede zeigt die Lücke an einer anderen Stelle:

- **IPS / EHDS** (D4-Befund): keine Autorenrolle für den Bürger bei Laborbericht und Entlassbrief.
- **W3C VC** (Finding 1): kein spezifizierter Pfad für einen Offline-Verifizierer (Status/Widerruf ohne Netzabruf).
- **EUDI / eIDAS** (hier): kein Transportmodell für ein offline gehaltenes, ohne Netz weitergereichtes Credential.

Derselbe fehlende Akteur, dreimal anders sichtbar — eine Autorenrolle, ein Verifizierer-Pfad, ein Transportmodell. Kein einzelner Mechanismus, aber ein Muster. Material für die Spezifikationsarbeit.

---

## Konsequenzen

**Positiv.** v1.0 verspricht nichts, was es nicht hat. Die vier offenen Betriebspunkte des Bündel-Entwurfs entfallen. Der Code steht bereits im Einklang (0 inbound Verify-Pfad) — es gibt keinen Rückbau. Die Klarheit ist selbst wieder Material für die Spezifikationsarbeit.

**Negativ.** Vivodepot zertifiziert vorerst **keine** Aussteller-Authentizität im EUDIW-Sektor — die Zertifizierungsdoktrin ruht dort, bis es etwas zu zertifizieren gibt. Das ist ehrlicher als eine Doktrin ohne Gegenstand.

**Nachzuziehen.** Der öffentliche Bruch oben (vierter Zusagen-Fall) — dringend, weil öffentlich.

---

## Verifikation

- **Code:** 0 inbound EUDIW-Verify-Pfad (`parseEudiwSdJwtVerified`/`_eudiwTrustStatus`/`vertrauensanker`/`trustAnchor` = 0 im Kern). SD-JWT-Import = Selbstauskunft-Roundtrip, ausdrücklich „KEIN verifizierter Provider-Bescheid-Import" (`vivodepot.html` Kommentar bei `_sdJwtSozialversicherungFelder`). **Keine Code-Änderung nötig — der Ist-Zustand entspricht der Entscheidung.**
- **Kein Bau, kein Schema-Bump, kein Krypto-Byte, kein SW-Bump.**
- Suite unverändert (dokumentierender ADR). **Kein Push** (eine Produktentscheidung).

## Konformität

```konformitaet
aussage:   U2-080: Vivodepot baut keinen EUDIW-Nachweis-Import mit Verifikation — es existiert kein
           Import-/Verifikations-Einstieg im Code (der Fluss kennt keine importierbare Datei); nur der
           ruhende Übergabe-/Export-Weg (EUDIW_SICHTBAR=false) ist vorhanden.
zustand:   prüfbar
pruefung:  tests/sonderfall-verbote.test.js#u2-080-kein-eudiw-import-mit-verifikation
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 7). Die Prüfung misst die ARCHITEKTUR-Aussage (kein Import-/
Verifikationspfad), nicht die Laufzeit — das ist der Kern des ADR; eine Netz-Bindung („0 Requests")
träfe nur die Folge, nicht den Verbotssatz.*
