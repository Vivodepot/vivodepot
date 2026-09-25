# U2-ADR-123 · Sub-Depot-Selbstbestimmung statt Re-Key-Ceremony

**Status:** Akzeptiert
**Datum des Beschlusses:** 01.08.2026 (in Sparring-Sitzung getroffen)
**Nummer vergeben:** 03.08.2026 — nachträglich, nach Prüfung von `docs/adr/INDEX.md` (090–122
lückenlos). Der Beschluss lag zwischen dem 01.08. und dem 03.08. nur als Entwurf im
Claude-Projekt-Wissen und als Kommentar im Quelltext vor; der Bau ist ihm vorausgegangen. Das ist
die Lücke, die diese Nummer schließt.
**Fassung:** zweite, ersetzt die erste Fassung vom 01.08. (Re-Key-Ceremony-Ansatz) vollständig.
**Amendiert:** `adr-tranche-1-2026-05-24.md` (ADR-103) und die eigene erste Fassung.
**Bezug:** ADR-081 Komponente 2 Weg 1 · Krypto-Architektur v0.1 §4.1 (Re-Key beim
Verselbstständigen) und §4.2 (Blackbox-Übergabe) · Klärung 11 (eigenes Passwort pro Sub-Depot) ·
U2-ADR-095 (Anker-Passwort-Wechsel) · interne Liste offener Punkte (T2.1 Volljährigkeit).
**Umgesetzt in:** `vivodepot.html` — `subDepotEigenerPasswortWechsel` (`:13076–13092`),
`flowSubDepotSelbstbedienung` (`:26245`), Einstieg `#w-subselbst` (`:15653`, `:15682`).
Wächter: `tests/sub-depot-selbstbestimmung.test.js` (9 Proben).
**Status heute:** gilt — Beleg `tests/sub-depot-selbstbestimmung.test.js#[Sub-Selbst·1] der Wechsel läuft OHNE jede Anker-Session — kein depotAnlegen, kein data`.

---

## Wendepunkt in der Klärung

Die erste Fassung sah einen generischen Re-Key-Kern vor, ausgelöst über eine Anwesenheits-Ceremony
mit dem Anker-Passwort der verwaltenden Person. Der entscheidende Punkt kam in der Diskussion:
**ein Sub-Depot ist von Anfang an mit einem eigenen, unabhängigen Passwort verschlüsselt**
(Klärung 11) — der Cipher hängt nie am Anker-Schlüssel der verwaltenden Person. Eine
Blackbox-Übergabe (§4.2, bereits gebaut) liefert deshalb schon eine vollständig eigenständige,
unverändert verschlüsselte Datei. Ein Re-Key ist für „eigenständige Datei" nicht nötig — nur für
„ein anderes Passwort als das schon bekannte".

Das löst auch die rechtliche Frage anders als angenommen: es ist keine Frage elterlicher
Kooperation, weil die Kooperation kryptographisch nie notwendig war. Die Sub-Depot-Inhaberin
verfügt bereits über die volle technische Kontrolle ihres eigenen Schlüssels.

## Entscheidung

**Kein neuer Re-Key-Mechanismus, keine Anwesenheits-Ceremony.** Stattdessen zwei bestehende Muster
wiederverwenden und um Selbstbedienung erweitern:

1. **Selbstständiger Passwort-Wechsel für die Sub-Depot-Inhaberin**, analog zum Anker-Passwort-
   Wechsel (U2-ADR-095). Damit kann sie ein den Eltern bekanntes Passwort jederzeit selbst
   entwerten — ohne Ceremony, ohne Mitwirkung der Eltern.
2. **Selbstständiger Blackbox-Export**, ausgelöst durch die Inhaberin selbst statt nur durch die
   verwaltende Person aus deren Anker-Sitzung. Liefert die eigenständige Datei.

Für die Bürgerin heißt das: eigenes Passwort ändern, eigene Daten als Datei mitnehmen. Kein
Backdoor-Dilemma, weil niemand etwas übergehen muss, was nicht schon der Inhaberin gehört.

**Für den Todesfall (ADR-081 Weg 1) sinngemäß dasselbe:** der Übernehmer hat das Passwort der
verstorbenen Person über das Notfall-Instruktionsblatt, kann per Einhängen (gebaut) zugreifen und
die Datei als eigene weiterführen. Ein Passwort-Wechsel auf der übernommenen Datei ist ein
Hygiene-Schritt, kein Blocker.

## Was damit entfällt

Kein generischer `verselbststaendige()`-Kern, kein Re-Key-Mechanismus. Kein Anker-Passwort als
Anwesenheitsnachweis, keine Zwei-Personen-Ceremony. Die frühere Schritt-A/Schritt-B-Aufteilung
entfällt — beide älteren internen Aufträge sind mit ERSETZT-Vermerk stillgelegt. Die Frage nach dem Alter
für „Versiegelungs-Modus als Default" stellt sich nicht mehr in derselben Dringlichkeit, weil die
Selbstbedienung unabhängig vom Modus funktioniert.

## Reichweite — was diese Entscheidung ausdrücklich nicht leistet

Der Passwort-Wechsel wirkt auf **der Datei der Inhaberin**. Der Umschlag in der Liste der
verwaltenden Person bleibt unverändert und mit dem alten Passwort lesbar. Ein Kind, das mit 18 sein
Passwort wechselt, nimmt eine eigenständige Kopie mit — es entwertet die Kopie der Eltern nicht.
Das ist kryptographisch unvermeidbar, sobald jemand die Bytes besitzt, und keine Schwäche der
Umsetzung. Es ist aber eine Grenze, die der Name „Selbstbestimmung" nicht von selbst mitteilt und
die in Bürgertexten nicht überversprochen werden darf.

Belegt in einer eigenen Erhebung zum Sub-Depot-Lebenszyklus vom 03.08.2026.

## Was offen bleibt

Die **Anker-zu-Sub-Wandlung** (ADR-081 Weg 1, Posten 103) ist davon unberührt und weiterhin
ungebaut — seit 19.07. als B5 offen, seit 27.07. durch einen Wächter-Test
(`tests/sub-depot-uebergaenge.test.js:187–206`) verriegelt, der `verselbststaendigungMoeglich` auf
`false` festhält. Diese Sperre ist nie durch eine ADR beschlossen worden. Sie bleibt hier
ausdrücklich unentschieden und ist kein Gegenstand dieser Entscheidung.

## Konformität

```konformitaet
aussage:   Der Sub-Depot-eigene Passwort-Wechsel läuft ohne jede Anker-Session (kein
           `depotAnlegen`, kein `data`) — es gibt keinen neuen Re-Key-Mechanismus und keine
           Anwesenheits-Ceremony, weil das Sub-Depot von Anfang an eigenständig verschlüsselt ist.
zustand:   prüfbar
pruefung:  tests/sub-depot-selbstbestimmung.test.js#[Sub-Selbst·1] der Wechsel läuft OHNE jede Anker-Session — kein depotAnlegen, kein data
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*

---

*Vivodepot GmbH · U2-ADR-123 · Beschluss 01.08.2026, Nummer vergeben 03.08.2026*
