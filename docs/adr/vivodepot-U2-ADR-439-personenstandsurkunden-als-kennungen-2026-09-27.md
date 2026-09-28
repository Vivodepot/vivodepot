# U2-ADR-439: Personenstandsurkunden — die Ablageorte werden Kennungen im Bereich Identität

**Status:** Angenommen; die Übernahme in beide Urkundenfelder ist bestätigt (27.09.2026)
**Datum:** 27.09.2026
**Kategorie:** FELDER, MIGRATION, NACHLASS
**Linie:** U2
**Bezug:** U2-ADR-409 (Feldregister: Kennungen dauerhaft, deaktivieren statt löschen) · U2-ADR-151 (eine Stufe statt mehrerer) ·
U2-ADR-108 (Migrationsprobe je Sprung) · U2-ADR-347 (Situationen aus dem Bündel) · U2-ADR-288 (Erbschein-Vorbereitungsauszug)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Wird ein Sterbefall angezeigt, soll das Standesamt verlangen, dass ihm unter anderem die Ehe- oder
Lebenspartnerschaftsurkunde der letzten Ehe und die Geburtsurkunde vorgelegt werden (§ 38 PStV). Wer einen Erbschein
beantragt, weist Todeszeitpunkt und das Verhältnis, auf dem das Erbrecht beruht, durch öffentliche Urkunden nach
(§ 352 Abs. 3 FamFG). Beides fragt: wo liegen die Urkunden?

Bis Schema 88 stand diese Angabe nur als eigenes Feld der Situation Erbfall: `erb_personenstand` („Geburts-/Heiratsurkunde —
Ablageort“, ein Feld für zwei Urkunden) und `erb_stammbuch` („Familienstammbuch — Ablageort“). Situationsfelder sind keine
Kennungen des Feldregisters. Eine Anfrage konnte sie nicht erfragen, Katalog und Exporte kannten sie nicht.

## Entscheidung

1. **Drei Kennungen im Bereich `identity`**, Sektion `civil-status-certificates`, jede `text`, `sensibel` wie die
   Situationsfelder vorher: `birthCertificateStorage`, `marriageCertificateStorage`, `familyRegisterBookStorage`.
   Getrennt, weil § 38 PStV die Urkunden getrennt nennt. `birthCertificateStorage` trägt dieselbe Feld-ID wie das
   Unterfeld an den Kindern (`people.childrenAndDependants[].birthCertificateStorage`). Es ist eine andere Kennung,
   liest sich aber gleich. Nichts wird umbenannt (U2-ADR-409).
2. **Die zwei Situationsfelder werden deaktiviert, nicht gelöscht.** Die Situation Erbfall und das Blatt „Behörden und
   Nachlass“ verweisen auf die drei Kennungsfelder (`{ quelle: 'identity', feld: … }`). Die Werte bleiben in
   `data.situationen.erbfall` stehen (Verwaisungsregel).
3. **Stufe 88 → 89.** Ein Wert wird nur in ein LEERES Zielfeld übernommen. `erb_stammbuch` geht nach
   `familyRegisterBookStorage`. `erb_personenstand` geht in **beide** Urkundenfelder: Es ist ein Ort, an dem beide liegen,
   und das Produkt kann ihn nicht zerlegen. Die Alternative (nur Geburtsurkunde, mit Hinweis) ist verworfen,
   die Übernahme in beide ist bestätigt (27.09.2026).
4. **Die Lese-App migriert nicht, sie liest beide.** Ein gesetztes Identitätsfeld gewinnt; es gilt dieselbe Tabelle
   `PERSONENSTAND_SITUATION_ZU_IDENTITY_89` wie im Kern.
5. **Exporte:** Ein Ablageort ist keine Angabe über die Person, die ein Credential oder ein FHIR-Patient trägt. Die drei
   Felder werden **nicht abgebildet**; sie stehen mit Grund in der Lückengrundlinie des Identitäts-Credentials.
6. **Erbschein-Vorbereitungsauszug:** Der Anschluss (Nachweis durch öffentliche Urkunden, § 352 Abs. 3 FamFG) ist ein
   eigener Textbaustein. Er wird erst nach Gegenlesung des Wortlauts eingelassen und ist nicht Teil dieser Stufe.
7. **Englische Beschriftung** nach der Übersetzung des BMJ (nicht verbindlich; amtlich verbindliche EN-Fassungen gibt es
   nicht): „birth certificate“, „marriage certificate“ (FamFG Section 133(2)), „life partnership“ (LPartG), „registry of
   births, deaths and marriages“ (BGB). Für das Familienstammbuch gibt es keinen amtlichen Begriff; es heißt „Family
   register book (Familienstammbuch)“.

**Nicht in dieser Entscheidung:** das Geschlecht des Ehegatten (§ 31 Abs. 1 Nr. 3 PStG). Eine Person trägt heute kein
Geschlecht, und eine Anfrage kennt keine Attribute einer referenzierten Person. Das ist ein eigener Posten (Anfrageweg für
Personen-Attribute), mit eigener ADR.

```yaml
konformitaet:
  - aussage: >-
      Stufe 89 übernimmt die Urkunden-Ablageorte aus der Situation Erbfall in die drei Kennungen, nur in leere Felder;
      der Altwert bleibt stehen.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026; Migration in beide Felder bestätigt am 27.09.2026
    pruefung:
      - tests/schema-89-personenstandsurkunden.test.js
        "[Stufe 89] „Geburts-/Heiratsurkunde“ geht in beide Urkundenfelder, das Stammbuch in sein Feld; der Altwert bleibt"
      - tests/schema-89-personenstandsurkunden.test.js
        "[Stufe 89·Vorrang] ein schon gesetztes Identitätsfeld wird nicht überschrieben; leere Altwerte schreiben nichts"
  - aussage: >-
      Die drei sind Kennungen des Kerns, sensibel, mit Beschriftung; eine Anfrage erreicht sie.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026; § 38 PStV
    pruefung:
      - tests/schema-89-personenstandsurkunden.test.js
        "[Kennungen] die drei sind Kennungen des Kerns, sensibel, und eine Anfrage erreicht sie"
  - aussage: >-
      Situation Erbfall und Blatt „Behörden und Nachlass“ zeigen die Kennungsfelder; die zwei Situationsfelder sind deaktiviert.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026; U2-ADR-409 (deaktivieren statt löschen)
    pruefung:
      - tests/schema-89-personenstandsurkunden.test.js
        "[Situation·Blatt] die Situation Erbfall und das Blatt „Behörden und Nachlass“ zeigen die Kennungsfelder, nicht mehr die eigenen"
  - aussage: >-
      Die Lese-App zeigt einen Stand bis Schema 88 mit den Ablageorten im Bereich Identität.
    zustand: erfuellt
    herkunft: B8-PARITAET; Entscheidung vom 27.09.2026
    pruefung:
      - tests/schema-89-personenstandsurkunden.test.js
        "[Lese-App] ein Stand bis Schema 88 zeigt die Ablageorte bei der Angehörigen im Bereich Identität"
```
