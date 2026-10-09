# U2-ADR-491: Passkey als zweiter Entsperrweg in der Web-App — abgelehnt

**Status:** Abgelehnt (07.10.2026)
**Datum:** 07.10.2026
**Kategorie:** KRYPTO, SOUVERÄNITÄT
**Linie:** U2
**Bezug:** U2-ADR-097 §3 (Kein Konto) · SOVEREIGNTY.md §2 · U2-ADR-430 (Wiederherstellungs-Hülle) · U2-ADR-463 (Passwort-Vorschlag) · U2-ADR-362 (Marken-Adressen)
**Status heute:** gilt — abgelehnt, nicht gebaut. Die Frage ist beantwortet und wird nicht neu vorgelegt, solange die beiden Zusicherungen unten gelten.

## Frage

Kann ein Passkey (WebAuthn mit der Erweiterung `prf`, entsperrt mit Touch ID oder Face ID) das Depot in der Web-App öffnen, als zweiter Weg neben dem Passwort? Der Maßstab ist eine Bequemlichkeit wie bei einer Banking-App, ohne dass Vivodepot einen Server, ein Konto oder einen Generalschlüssel bekommt.

## Prüfung gegen die geltenden Zusicherungen

| Maßstab | Fundstelle | Ergebnis |
|---|---|---|
| Kein Konto | U2-ADR-097 §3: „Der Zugang besteht aus dem Besitz der Datei und der Kenntnis des Passworts, aus nichts sonst.“ Zu messen ist „kein Wiederherstellungspfad, der eine dritte Stelle einbezieht“. | Ein synchronisierter Passkey liegt im Speicher eines Plattformanbieters: im iCloud-Schlüsselbund (Apple: „Passkeys sync across a user's devices using iCloud Keychain“, support.apple.com/en-us/102195) oder im Google Passwortmanager (developers.google.com/identity/passkeys/faq). Dessen Wiederherstellung holt ihn nach einem Geräteverlust zurück, bei Google über die PIN des Passwortmanagers (support.google.com/chrome/answer/13168025). Damit liegt eine Tür zum Depot samt Rückholweg bei einer dritten Stelle. **Bricht die Zusicherung.** |
| Den zweiten Weg hält die Halterin selbst | SOVEREIGNTY.md §2: „Den einzigen zweiten Weg zum vollen Depot hält die Halterin selbst“; „ein Wiederherstellungsweg beim Anbieter wäre ein Zweitschlüssel in fremder Hand.“ | Ein Passkey wäre ein dritter Weg, gehalten in einem Speicher, den ein Dritter betreibt und wiederherstellt. **Bricht den Satz.** |
| Die Datei geht überall auf | U2-ADR-430, verworfene Alternative „Gerätegebundene Hülle“ | U2-ADR-430 verwirft den gerätegebundenen Weg *als Wiederherstellung*. Gefolgert: Bliebe das Passwort der vollständige Weg, wäre ein Passkey nur Bequemlichkeit, und sein Verlust kostete nichts. Kein Grund der Ablehnung. |
| Heruntergeladene Datei | WebAuthn Level 3 (W3C), §5.1.3 und §5.1.4.1: „If callerOrigin is an opaque origin, throw a "NotAllowedError"“; eine RP ID ist „a valid domain string“. Eine heruntergeladene Datei (`file://`) hat in den Browsern einen undurchsichtigen Ursprung; das regeln HTML- und URL-Standard, nicht WebAuthn. | In der Datei-Fassung nicht möglich, nur unter https in der Web-App. |
| Marke | U2-ADR-362 | U2-ADR-362 hält Name und Domain je Marke. Gefolgert: Die RP ID wäre die Domain der Web-App jeder Marke, die Passkeys wären je Marke getrennt. |
| Kein Generalschlüssel bei Vivodepot | SOVEREIGNTY.md §2 | Die PRF-Ausgabe entsteht im Authenticator (WebAuthn Level 3, §10.1.4) und käme nur in der Seite der Halterin an. Einen Server von Vivodepot, der sie hielte, gibt es nicht. Trägt. |

## Entscheidung

1. **Abgelehnt wird der synchronisierte Passkey** (Speicher eines Plattformanbieters mit Kontowiederherstellung). Er bräche U2-ADR-097 §3 und SOVEREIGNTY.md §2.
2. **Nicht ausgeschlossen** ist ein gerätegebundener Hardware-Schlüssel, nicht synchronisiert und von der Halterin selbst gehalten. Er bräche §3 nicht. Er wird hier nicht gebaut. Ein Vorschlag dazu braucht eine eigene ADR, mit Zusatzhülle um die Master-Bits, dem Passwort als Rückweg und dem Wort der Krypto-Gegenlesung.
3. **Bequemlichkeit ohne Passkey:** der Passwort-Vorschlag aus sechs Wörtern (U2-ADR-463) und der Wiederherstellungs-Code (U2-ADR-430).
4. **Eine Wiedervorlage setzt voraus,** dass U2-ADR-097 §3 und SOVEREIGNTY.md §2 vorher ausdrücklich geändert werden, als öffentliche Zusicherung. Diese ADR ändert sie nicht.

## Verworfen

- **Passkey als einziger Entsperrweg:** Mit dem Passkey wäre die Tür verloren.
- **Passkey zuwählbar, mit geänderten Zusicherungen:** Technisch möglich. Abgelehnt, weil die Bedingung, unter der er erwogen wurde, nicht erfüllt ist: Die Zusicherungen sollen gelten, nicht angepasst werden.

```yaml
konformitaet:
  - aussage: >-
      Kern, Lese-App und Web-App bieten keinen Entsperrweg über WebAuthn an; im ausgelieferten Code steht kein Aufruf von
      navigator.credentials.
    zustand: offen
    frist: 2026-12-31
    bedingung: ein Wächter gegen navigator.credentials in den ausgelieferten Dateien, gültig solange keine ADR einen gerätegebundenen Weg erlaubt
    herkunft: U2-ADR-491 (07.10.2026)
```

---

*Vivodepot GmbH · Berlin · 07.10.2026*
