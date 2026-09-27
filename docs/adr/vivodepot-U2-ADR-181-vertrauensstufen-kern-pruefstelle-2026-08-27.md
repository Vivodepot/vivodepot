# U2-ADR-181: Vertrauensstufen für Module — `vivodepot/kern` und `vivodepot/pruefstelle` auf derselben Kette

**Status:** Akzeptiert
**Datum:** 27.08.2026
**Kategorie:** ARCHITEKTUR, SICHERHEIT
**Status heute:** gilt

**Grundlage:** `tests/zwischenstufe-ausgabestelle.test.js`, `tests/modul-einlassen-geprueft.test.js` —
Architektur-Entwurf mehrfach gegengeprüft (Bestandsaufnahme + Vorschlag + adversariale Kritik +
Revision), bevor dieser Bau begann. Anlass: es entstehen Module (Pro, Justiz, Sprachen) —
entschieden, die Vertrauensarchitektur jetzt zu bauen, nicht zurückzustellen („ich hatte darum
gebeten, das so zu lösen, dass es langfristig und dauerhaft und modular ist und anpassbar für
künftige Module"). Ein früherer Rat eines Gegenprüf-Panels („0 Module heute, warte lieber") ist
damit bewusst überstimmt — die Prämisse selbst ist inzwischen falsch.

**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `ZWISCHENSTUFEN_ANBIETERTYPEN`/`VIVODEPOT_KERN_ANBIETERTYP`/
  `VIVODEPOT_PRUEFSTELLE_ANBIETERTYP` (neben `AUSGABESTELLE_ANBIETERTYP`, U2-ADR-172),
  `verifiziereProviderCredential` (Mengenprüfung statt Einzelvergleich),
  `_modulPruefstufeAusZertifikat`/`modulEinlassenGeprueft` (neue `pruefstufe`-Klassifikation).
- **Betroffener gemeinsamer Weg:** dieselbe Zertifikatskette wie U2-ADR-172 (Anker →
  Zwischenstufe → Kunde) — kein Parallelmechanismus, zwei zusätzliche `anbieterTyp`-Werte auf
  derselben Prüfung.
- **Test-Bezug:** `tests/zwischenstufe-ausgabestelle.test.js` (Prüfstelle läuft wie Ausgabestelle,
  Kern läuft NICHT als Zwischenstufe), `tests/modul-einlassen-geprueft.test.js` (die drei
  `pruefstufe`-Werte).

---

## Kontext

U2-ADR-172 gibt der Kette genau eine Zwischenstufen-Kennung: `vivodepot/ausgabestelle`. Zwei
Lücken blieben offen, beide jetzt real geworden:

1. **Selbstbezug.** Vivodepots eigene Bereichsschichten (Krisenvorsorge heute, künftig weitere)
   sind selbst Module — liefen sie je durch eine künftige Registrierung, bräuchten sie eine
   Sonderbehandlung, wenn die Kette nur „extern zertifiziert" oder „gar nicht zertifiziert" kennt.
2. **Prüfung vs. Herausgabe.** `vivodepot/ausgabestelle` sagt nur „darf Zertifikate ausstellen",
   nicht „in welcher Funktion". Eine Institution, die ein FREMDES Modul nur AUDITIERT (nicht
   selbst verfasst), braucht eine andere Auskunft an die Bürgerin als eine, die ihr eigenes
   Modul herausgibt.

## Entscheidung

**Zwei neue `anbieterTyp`-Werte auf derselben Kette, kein Parallelmechanismus:**

- `VIVODEPOT_KERN_ANBIETERTYP = 'vivodepot/kern'` — verifiziert DIREKT gegen
  `TRUST_AUTHORITY_PUBLIC_JWK`, wie ein Bestandszertifikat. **Keine Zwischenstufe**: ein
  `vivodepot/kern`-Zertifikat darf sich nicht selbst zur Zwischenstufe erklären (derselbe
  Rechte-Erweiterungs-Schutz wie bei jedem gewöhnlichen Zertifikat, gemessen in
  `tests/zwischenstufe-ausgabestelle.test.js`).
- `VIVODEPOT_PRUEFSTELLE_ANBIETERTYP = 'vivodepot/pruefstelle'` — läuft als Zwischenstufe GENAU
  wie eine Ausgabestelle (Zwischenzertifikat unter dem Anker, kaskadierender Widerruf durch
  Konstruktion, dieselbe `WIDERRUFS_LISTE`). `ZWISCHENSTUFEN_ANBIETERTYPEN` fasst beide
  Zwischenstufen-Typen für die Prüfung in `verifiziereProviderCredential` zusammen — eine
  Mengenprüfung (`.includes(...)`) statt des bisherigen Einzelvergleichs gegen
  `AUSGABESTELLE_ANBIETERTYP` allein.

**Löst den Selbstbezug-Einwand:** eine künftige Registrierung der eigenen Bereichsschicht trägt
automatisch `anbieterTyp === VIVODEPOT_KERN_ANBIETERTYP` → `pruefstufe: 'intern'`. Keine
Sonderbehandlung im Code, kein zweiter Pfad für „das bin ich selbst".

**Neues Feld `rolle` im Zwischenkredential (optional, additiv):** unterscheidet, WAS die
Zwischenstelle bei EINEM konkreten Modul getan hat — `'herausgeber'` (hat das Modul erstellt/
publiziert) vs. `'pruefer'` (hat ein fremdes Modul nur auditiert). Kein Duplikat von
`anbieterTyp`: `anbieterTyp` sagt, WELCHE ART Zwischenstelle es ist (Ausgabestelle vs.
Prüfstelle als Institution), `rolle` sagt, WAS diese Stelle bei diesem Modul war. Fehlt `rolle`
(heutige, bereits ausgestellte `vivodepot/ausgabestelle`-Zertifikate), gilt der Default
`'herausgeber'`.

**Neue `pruefstufe`-Klassifikation, drei Werte, deckt jeden Fall ab — abgeleitet, nicht
gespeichert/migriert:** `_modulPruefstufeAusZertifikat` berechnet sie bei jedem
`modulEinlassenGeprueft`-Durchlauf frisch aus dem gerade geprüften `anbieterTyp` der Kette. Kein
Sonderfall im Code für alt vs. neu, keine Migration, keine Bestandsdaten betroffen (0 Module
heute).

| `pruefstufe` | Bedingung |
|---|---|
| `'intern'` | Kette endet bei `vivodepot/kern`, direkt gegen den Anker. |
| `'extern-geprueft:<rolle>'` | Kette läuft über eine Zwischenstufe (`vivodepot/ausgabestelle` ODER `vivodepot/pruefstelle`); `rolle` aus dem Zwischenkredential, Default `herausgeber`. Das heutige `vivodepot/ausgabestelle` fällt automatisch hier hinein. |
| `'extern-ungeprueft'` | jede andere gültig verifizierte Kette. Praktisch: ein direkt ankersigniertes Zertifikat, dessen `anbieterTyp` weder Kern noch eine Zwischenstufe ist — für Modul-Einlass kein vorgesehener Weg, aber ein Judgment-Call der Umsetzung (s. u.), kein explizit benannter vierter Fall. |

Additiv gespeichert: nur der geprüfte Zweig in `modulEinlassen` setzt `markiert.pruefstufe`. Ein
selbst eingelassenes Modul (die fünf Register, keine Signatur) bekommt das Feld gar nicht erst —
kein stiller Default, kein Migrationsschritt für Bestandsmodule.

**Markenneutralität — von Anfang an festgehalten, nicht als Folgefrage offengelassen (wie bei
`AUSGABESTELLE_ANBIETERTYP`/U2-ADR-172 ursprünglich passiert):** `anbieterTyp` bleibt rein
FUNKTIONAL (welche Rolle in der Vertrauenskette), nie ein Marken- oder Namens-Identifikator. Eine
White-Label-Ausgabestelle (fremder Name, eigenes Geschäft, unter demselben Vivodepot-Anker)
bekommt ein gewöhnliches Zwischenzertifikat wie jede andere — unterschieden nur über die
bestehenden Felder `anbieterId`/`anbieterName`, nicht über einen eigenen `anbieterTyp`-Wert und
nicht über eine Sonderbehandlung in `verifiziereProviderCredential`. Dieselbe Antwort gilt für
eine White-Label-Prüfstelle.

**`herkunft` war nie der Vertrauensträger und ist es weiterhin nicht.** Das Feld bleibt
unverändert eine selbst gewählte Freitext-Kennung für Fassungs-/Versions-Zuordnung
(`_einbettenMitFassung` gleicht Module über `herkunft` ab) — keine kryptografisch geprüfte
Aussage über den Anbieter. Dieselbe Unterscheidung wie bei U2-ADR-086 (`custodian`/`transmit`):
ein Feld, das wie eine Vertrauens-Kennung klingt, aber nie eine war.

## Verworfene Alternativen

- **Ein Parallelmechanismus für Kern-/Prüfstellen-Zertifikate (eigene Prüf-Funktion neben
  `verifiziereProviderCredential`).** Verworfen: zwei Prüfwege für dieselbe Frage („wer darf was
  bescheinigen") sind genau die Art Drift, die U2-ADR-172 selbst vermeiden wollte. Zwei weitere
  `anbieterTyp`-Werte auf DERSELBEN Kette reichen.
- **`rolle` dupliziert als eigener `anbieterTyp`-Wert (z. B. `vivodepot/pruefstelle-herausgeber` /
  `vivodepot/pruefstelle-pruefer`).** Verworfen: vervielfacht die Zwischenstufen-Typen pro
  künftiger Rollen-Unterscheidung, obwohl `anbieterTyp` und `rolle` zwei unabhängige Fragen
  beantworten (welche Art Stelle vs. was sie bei diesem Modul tat).
- **`pruefstufe` als gespeichertes, migriertes Feld auf jedem Modul rückwirkend.** Verworfen: 0
  Bestandsmodule heute, eine Migration für nichts. Additiv reicht.

## Offen, nicht Gegenstand dieses ADR

**Der vierte Klassifikationsfall** (direkt ankersigniertes, nicht-`vivodepot/kern`-Zertifikat als
Modul-Aussteller) ist im ursprünglichen Drei-Werte-Entwurf nicht benannt — die Umsetzung ordnet
ihn defensiv `'extern-ungeprueft'` zu (nie eine höhere Vertrauensstufe behaupten, als die Kette
hergibt), ohne dass dieser Fall als eigenständige Produktentscheidung geprüft wurde. Praktisch
kein vorgesehener Modul-Einlassweg (Module sind laut diesem ADR entweder `vivodepot/kern` oder
laufen über eine der beiden Zwischenstufen) — gemeldet, nicht hier vertieft entschieden.

---

**Nachtrag 27.08.2026 (Behörden-Briefing) — ein DRITTER, rein technischer Zwischenstufen-Typ:**
`VIVODEPOT_INSTITUTION_ANBIETERTYP = 'vivodepot/institution'`, auf derselben Ebene wie
`AUSGABESTELLE_ANBIETERTYP`/`VIVODEPOT_PRUEFSTELLE_ANBIETERTYP` — Teil von
`ZWISCHENSTUFEN_ANBIETERTYPEN`, keine Sonderbehandlung, fällt wie die anderen beiden unter
`pruefstufe: 'extern-geprueft:<rolle>'`. Eine Behörde kann damit technisch genauso andocken wie
jede Ausgabestelle heute.

**Ausdrücklich NICHT Teil dieser Ergänzung: das Geschäftsmodell.** Ob, wann und unter welchen
Bedingungen (Vertrag, Bezahlung, Kooperation) je ein `vivodepot/institution`-Zertifikat tatsächlich
ausgestellt wird, bleibt eine Produktentscheidung außerhalb des Codes — der Code trifft keine Zulassungs-
entscheidung, er hält nur denselben, bereits gebauten Mechanismus für einen dritten Typ offen.
Dieselbe Trennung wie bei den beiden Typen oben: die Architektur ist neutral, wer sie tatsächlich
nutzen darf, ist eine Frage außerhalb des Codes.
