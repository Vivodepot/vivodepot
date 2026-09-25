# U2-ADR-217: Format-Tags in Lese-App und Bürger-App-Spezifikation nachgezogen

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** KORREKTUR, DOKUMENTATION
**Linie:** U2
**U2-Bezug:** U2-ADR-046 (Format-Tag-Korrektur `mobilitaet` `ISO_18013 → GENERISCH`, `vorsorge`
`W3C_VC → GENERISCH`, 04.07.2026) · U2-ADR-030 (Sozialversicherung-Format-Tag auf den real
gebauten Pfad korrigiert, `W3C_VC → SD_JWT_VC`, 21.06.2026). Diese Entscheidung ändert an keiner
der beiden ADRs etwas — sie zieht ihre bereits getroffene Korrektur an zwei Stellen nach, die sie
nie erreicht hatte.
**Anker:** Auftrag vom 02.09.2026: die Bürger-App-Spezifikation führt beim Mobilitäts-Sektor
noch „ISO 18013" — ein Format, das U2-ADR-046 ausdrücklich verworfen hat. Prüfung vor dem Ändern
(Auflage: nicht einfach löschen, erst auf Referenzen prüfen) fand zwei weitere Stellen mit
demselben Muster, eine davon im ausgelieferten Produktcode.
**Status heute:** gilt — Beleg `tests/paritaet-kern-lese.test.js`.

---

## Kontext

U2-ADR-046 und U2-ADR-030 korrigierten je einen `format:`-Tag im Kern (`vivodepot.html`), weil der
bisherige Tag eine Fähigkeit behauptete, die das Produkt nicht hat (`mobilitaet`/`vorsorge`:
Selbst-Export-Standards, die es nicht gibt; `sozialversicherung`: ein Etikett, das nie gebaut
wurde). Beide Korrekturen trafen ausschließlich `vivodepot.html`. Zwei nachgelagerte Abbilder
dieses Zustands wurden nie nachgezogen:

1. **`vivodepot-lesen.html`** (die Angehörigen-/Institutions-Lese-App) führt bis heute die
   ursprünglichen, bereits verworfenen Tags: `mobilitaet: ISO_18013`, `vorsorge: W3C_VC`,
   `sozialversicherung: W3C_VC`. `tests/paritaet-kern-lese.test.js` prüft seit dem
   Paritäts-Auftrag (23.07.2026) systematisch, dass Kern und Lese-App dieselben Felder, Typen,
   Unterfelder und Sensibel-Flags führen — aber `format:` sitzt am BEREICH selbst, nicht an
   einem Feld, und lag damit außerhalb jeder bestehenden Prüfung. Die Abweichung war folgenlos
   für die Feld-Paritätstests, aber real: `format` ist laut U2-ADR-046 „eine Fähigkeits-Aussage"
   — genau die Aussage, die eine Institution liest, wenn ihr ein Angehöriger die Lese-App zeigt.
2. **Zwei externe Spezifikationsdokumente** (`docs/spec/vivodepot-elf-bereiche-definition-2026-05-29.md`,
   die Bürger-App-Spezifikation vom 30.05.2026, überholt und nicht Teil der Veröffentlichung) — beide vom 29./30.05.2026,
   also vor U2-ADR-030 (21.06.) und U2-ADR-046 (04.07.) — trugen dieselben drei überholten Tags.

Vor der Korrektur wurde geprüft, ob „ISO 18013"/„W3C-VC" an diesen Stellen irgendwo als Schlüssel
oder Referenzziel dient (Auflage aus dem Auftrag): keine der drei Fundstellen ist ein Bezugspunkt
für Code oder andere Dokumente — sie sind reine Anzeige-/Deklarationswerte. Der `SEKTOR_FORMATE`-
Enum selbst behält `ISO_18013`/`W3C_VC` als gültige Werte (für andere Sektoren bzw. eine mögliche
künftige Verwendung) — nur die drei fehlerhaften ZUWEISUNGEN werden korrigiert.

## Entscheidung

**1 — `vivodepot-lesen.html` auf den Kern-Stand nachgezogen:** `mobilitaet` und `vorsorge` auf
`SEKTOR_FORMATE.GENERISCH` (U2-ADR-046), `sozialversicherung` auf `SEKTOR_FORMATE.SD_JWT_VC`
(U2-ADR-030).

**2 — Neue Parität-Prüfung `[Paritaet] gemeinsame Bereiche haben dasselbe format-Tag`** in
`tests/paritaet-kern-lese.test.js`: vergleicht `format:` je Bereich zwischen Kern und Lese-App.
Deckt die Lücke, die die bestehenden feldbezogenen Paritätstests strukturell nie erreichen
konnten (`format` ist ein Bereichs-, kein Feld-Attribut).

**3 — Beide externen Spezifikationsdokumente korrigiert**, mit Verweis auf die jeweilige ADR
direkt an der Stelle (nicht nur der neue Wert — der Grund bleibt dokumentiert, damit niemand den
alten Tag in drei Monaten wieder einträgt).

## Ausdrücklich nicht behandelt

Der `SEKTOR_FORMATE`-Enum selbst (`ISO_18013`, `MDOC`, `W3C_VC`, …) bleibt unverändert — diese
Werte sind gültige Format-Kennungen für andere Zwecke, nur ihre fehlerhafte Zuweisung an die drei
genannten Bereiche wird korrigiert. Keine neue Enum-Bereinigung, kein neuer Mechanismus.

## Konsequenzen

Positiv: Kern, Lese-App und externe Spezifikation sagen an dieser Stelle wieder dasselbe. Ein
künftiges erneutes Auseinanderlaufen an dieser spezifischen Achse (Bereichs-`format:`) wird durch
Punkt 2 rot, nicht erst wieder durch eine externe Prüfung sichtbar.

`SCHALEN_STAND`/`CACHE` auf v502 gehoben (02.09.2026) — s. Nebenfund unten, warum
dieser Bump für eine reine `vivodepot-lesen.html`-Änderung nötig ist.

## Nebenfund — Die Schalen-Prüfung misst am Zweck vorbei

Beim Commit fiel auf: der `SCHALEN_STAND`/`CACHE`-Lockstep-Wächter (Pre-Commit-Hook) hängt einzig
an Änderungen von `vivodepot.html`. Er blieb für diesen Commit stumm, obwohl dieser ausschließlich
`vivodepot-lesen.html` ändert.

`vivodepot-lesen.html` wird aber MIT ausgeliefert — sie steht im DATEISATZ von
`tools/testfassung-legen.js`, zusammen mit `sw.js` und dem Manifest. Was ausgeliefert wird, holt
der Service Worker aus seinem Zwischenspeicher, dessen Name an `CACHE` hängt. **Ohne einen
`CACHE`-Bump erreicht eine Änderung, die NUR die Lese-App betrifft, eine bereits installierte PWA
nie** — der Service Worker liefert weiter die alte Fassung aus dem Zwischenspeicher aus, unbemerkt:
der Wächter ist grün, der Commit liegt vor, die Datei ist gepusht, und trotzdem sieht niemand die
Änderung.

Der Wächter selbst wird hier NICHT repariert — das ist ein eigener Posten, U2-ADR-215 (dieselbe
Familie: ein Prüfmechanismus, der eine engere Reichweite hat als sein eigentlicher Zweck). Diese
ADR hält nur den Befund fest und trägt den für DIESEN Commit nötigen Bump von Hand nach (v502,
Zuweisung).

## Konformität

```konformitaet
aussage:  Kern und Lese-App führen für jeden gemeinsamen Bereich dasselbe `format:`-Tag.
zustand:  geprüft
herkunft: invariante
pruefung: tests/paritaet-kern-lese.test.js#gemeinsame Bereiche haben dasselbe format-Tag
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
