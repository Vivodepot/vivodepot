# U2-ADR-219: der plattformabhängige Sicherungs-Hinweis bleibt bei iOS — Android und Schreibtisch-Safari bekommen den bestehenden, plattformunabhängigen Hinweis

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** ARCHITEKTUR, DATENSCHUTZ, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-031 (Persistenz ehrlich — iOS-Install-Hinweis, `erhoehtesVerlustRisiko()`,
`exportErinnerungModell()`) · U2-ADR-211 (Sicherungsstand bekannt — `data.sicherungsStand`, der
Grund, warum der plattformunabhängige Hinweis einen Zustand nennen kann, keine Frist) ·
U2-ADR-097 §12 (UI- und Marken-Grenzen — Verbot von UA-Sniffing, Beleg
`tests/ui-marke-zusicherungen.test.js#b16-030-kein-ua-sniffing-nur-feature-detection`).
**Anker:** Auftrag vom 02.09.2026, wörtlich: „Wir brauchen keine Info für die
Tester, sondern eine Info für jede Person auf der Startseite der App oder wo es sinnvoll ist —
so wie jetzt das Speichern als App empfohlen wird." Gemessene Plattform-Lage (derselbe
Auftrag): iOS Home-Bildschirm von der Räumung ausgenommen (WebKit-Beleg); iOS-Tab Sieben-Tage-
Regel; Android-Chrome keine Frist, aber „Speicher leeren" löscht spurlos (Emulator gemessen);
Android-Installation UNBELEGT (zweimal versucht, kein App-Paket); Firefox Desktop dauerhafte
Ablage gewährt (von Hand geprüft); Chrome/Edge Desktop weder Frist noch Gewährung; Safari
Desktop Sieben-Tage-Regel wie iOS.
**Status heute:** gilt — Beleg `tests/persistenz-status.test.js` (PS4-Serie, unverändert),
`tests/ui-marke-zusicherungen.test.js#b16-030`, `tests/wahrhaftigkeit-fristen.test.js`.

---

## Kontext

Der bestehende iOS-Install-Hinweis (U2-ADR-031 Stück 4=2b) ist die einzige plattformabhängige
Stelle im ganzen Persistenz-Mechanismus: er erkennt `navigator.standalone === false` (iOS-Safari,
nicht vom Home-Bildschirm geöffnet) und empfiehlt echte Installation — der einzige Fall, in dem
eine Plattform einen ECHTEN, unbedingten Unterschied im Verhalten hat (installierte PWA auf iOS
ist von der Sieben-Tage-Räumung ausgenommen, ein Tab nicht) UND einen echten Feature-Flag trägt
(`navigator.standalone` existiert nur auf iOS-Safari, kein UA-String nötig).

Der Auftrag verlangte, denselben Mechanismus auf Android (Speicher-leeren-Risiko) und
Schreibtisch-Safari (dieselbe Sieben-Tage-Regel wie iOS, andere Plattform) auszuweiten — mit
je eigener Plattform-Erkennung und je eigenem Wortlaut.

## Entscheidung

**1 — Kein neuer, plattformabhängiger Hinweis für Android oder Schreibtisch-Safari.** Beide
Erkennungen (`istAndroid()`, `istDesktopSafari()`) wurden gebaut, geprüft — und wieder entfernt,
nicht auskommentiert. Beide brauchten `navigator.userAgent`: für Android existiert kein
Feature-Flag-Äquivalent zu `navigator.standalone` (kein `beforeinstallprompt`-Unterschied, keine
Storage-API-Eigenart, kein Touch-Signal, das Android von iPadOS/Windows-Touch unterscheidet —
geprüft, nicht nur vermutet); für Schreibtisch-Safari ließe sich zwar ein UA-*Muster*
(„Safari" ohne „Chrome"/„Chromium"/„Edg"/„OPR") bilden, aber das IST UA-Sniffing im Sinn der
Zusicherung, auch wenn kein einzelnes Property aus `UA_MUSTER`
(`tests/ui-marke-zusicherungen.test.js`) matcht.

**2 — U2-ADR-097 §12 wird nicht aufgeweicht.** Das Verbot ist Teil der Datenschutz-Zusicherung
„wir erkennen Dich nicht wieder" — kein Stilentscheid. Ein hartes, ausnahmslos erzwungenes
Verbot wird durch die erste benannte Ausnahme weich; die zweite ist dann leichter. Die
Zusicherung wiegt höher als ein spezifischerer Hinweis.

**3 — Der Verzicht kostet nichts, weil die richtige Auskunft ohnehin plattformunabhängig gilt.**
„Sichern Sie gelegentlich als Datei" ist auf jeder Plattform wahr und die einzige Garantie —
das leistet bereits `exportErinnerungVielleichtZeigen()` (U2-ADR-211), gespeist aus dem echten,
persistierten `data.sicherungsStand`: ein Zustand („vor {tage} Tagen zuletzt gesichert"), keine
Frist. Was für Android/Schreibtisch-Safari zusätzlich SPEZIFISCH wäre, ist ohnehin schwach: bei
Android eine Warnung vor einem bewussten Nutzer-Schritt an einem Ort, an dem die App nichts sagen
kann; bei Schreibtisch-Safari eine Frist, die durch Benutzung ohnehin nicht abläuft.

**4 — iOS bleibt unverändert.** `iosInstallHinweisNoetig()`, `iosInstallHinweisVielleichtZeigen()`,
`sitzungEtablieren()` — keine Änderung. Die einzige Stelle, an der ein plattformabhängiger
Hinweis durch eine echte Fähigkeitsprüfung gedeckt ist, bleibt die einzige.

## Verworfene Alternative

**Plattform-Hinweis-Familie mit UA-basierter Erkennung für Android und Schreibtisch-Safari.**
Vollständig gebaut, geprüft (14 grüne Proben, PS11-Serie), dann verworfen — nicht weil falsch,
sondern weil §12 keine Ausnahme kennt. Die Wortlaut-Entwürfe, festgehalten für den Fall, dass der
Tausch (plattformgenauer Hinweis gegen die Wiedererkennungs-Zusicherung)
ausdrücklich anders entschieden wird:

- **Android** (Auslöser wäre gewesen: `istAndroid() && internerSpeicherModus()`, NICHT an
  `erhoehtesVerlustRisiko()`/`persist()` gekoppelt — das gemessene Risiko ist ein manueller
  Schritt, den `persist()` nicht verhindert): „‚Speicher leeren' in den Android-Einstellungen
  würde Ihr Depot löschen, ohne zu warnen. Sichern Sie es von Zeit zu Zeit als Datei — dann ist
  nichts in Gefahr." Bewusst OHNE Installations-Empfehlung (auf Android unbelegt).
- **Schreibtisch-Safari** (Auslöser wäre gewesen: `istDesktopSafari() && erhoehtesVerlustRisiko()`,
  derselbe Gate wie der iOS-Hinweis): „Damit Ihr Depot zuverlässig erhalten bleibt: Safari kann
  intern gespeicherte Daten räumen, wenn Sie länger nicht vorbeischauen. Sichern Sie es von Zeit
  zu Zeit als Datei." Ohne die „sieben Tage"-Zahl im Bürgertext — dieselbe Zurückhaltung, die der
  bestehende iOS-Hinweis schon übt (kein unklassifizierter Fristen-Fund für
  `tools/wahrhaftigkeit-fristen.js`).

Beide Erkennungsfunktionen sind vollständig aus `vivodepot.html` entfernt (nicht hinter einem
Flag), ebenso die zugehörigen `STRINGS`-Einträge und `tests/load-kern.js`-Exporte.

## Konsequenzen

**Kein Ausnahme-Präzedenzfall für §12.** Die Grenze bleibt, wo sie war: Feature-Detection erlaubt
(`navigator.standalone`), UA-Sniffing verboten, ausnahmslos, für neuen wie bestehenden eigenen
Code.

**Offen:** Der Tausch liegt zur Entscheidung vor — plattformgenaue Hinweise nur um
den Preis der Wiedererkennungs-Zusicherung. Fällt die Entscheidung dafür, ist dieses ADR die
Grundlage für einen bewussten, benannten §12-Ausnahme-Zusatz (nicht für eine stille Aufweichung)
und die oben festgehaltenen Wortlaut-Entwürfe der Ausgangspunkt.

## Konformität

```konformitaet
aussage:  Vivodepots eigener Code (vivodepot.html, vivodepot-lesen.html) trägt nach diesem ADR
          weiterhin KEIN UA-Sniffing — die verworfene Android-/Schreibtisch-Safari-Erkennung
          hinterließ keine Spur.
zustand:  geprüft
herkunft: invariante
pruefung: tests/ui-marke-zusicherungen.test.js#b16-030-kein-ua-sniffing-nur-feature-detection
```

```konformitaet
aussage:  Der iOS-Install-Hinweis (die einzige plattformabhängige Stelle) ist durch dieses ADR
          unverändert — Erkennung, Gate und Wortlaut wie vor dem Auftrag.
zustand:  geprüft
herkunft: invariante
pruefung: tests/persistenz-status.test.js#PS4-4: iOS nicht installiert + Risiko → Install-Hinweis fällig, dann einmal pro Sitzung
pruefung: tests/persistenz-status.test.js#PS4-6: installierte Home-Bildschirm-App → kein Risiko, kein Install-Hinweis
```

```konformitaet
aussage:  Kein unklassifizierter Fristen-/Zahlen-Fund im Bürgertext aus diesem ADR — die
          verworfenen Wortlaut-Entwürfe wurden nie eingecheckt, und der einzige gebaute
          Hinweis (Android/Schreibtisch-Safari) trug ohnehin keine Frist im STRINGS-Text.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wahrhaftigkeit-fristen.test.js#[Block5] das echte Produkt trägt keine unklassifizierte Aussage (Grundlinie aktuell)
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
