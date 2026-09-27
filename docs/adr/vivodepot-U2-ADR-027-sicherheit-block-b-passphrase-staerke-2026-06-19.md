# U2-ADR-027: Sicherheit Block B — Passphrase-Stärke-Rückmeldung (hinweisend), Zwang/Empfehlung offen

**Status:** Akzeptiert (gebaut, hinweisend/nicht-blockierend; B2-Entscheidung Zwang-vs.-Empfehlung offen — Produktentscheidung)
**Datum:** 19.06.2026
**Kategorie:** SICHERHEIT, UX
**Grundlage:** Krypto-Gutachten-Mängelliste 19.06., Befund 1.7 (keine Passwort-Stärke-Rückmeldung).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `passwortStaerke`/`PW_BLOCKLISTE`/`pwGrundFehler`/`pwStaerkeAnzeigeVerdrahten` (nach `modalPwFelderVerdrahten`); `STRINGS.pwStaerke*`; eingehängt in `_depotIdentitaetUndPasswortAbfragen` (Feld `id-pw`) und `flowPasswortSetzen` (Feld `pw-neu`); CSS `.pw-staerke` (neben `.feld-inline-fehler`).
- **Sprint-Commit:** dieser Bau (Sicherheits-Kette Block B).
- **ADR-Bezug:** dieser ADR (U2-ADR-027).

**Status heute:** gilt — Beleg `tests/sicherheit-block-b.test.js#B-Negativ-5`; Zwang-vs.-Empfehlung
bleibt offen wie im Dokument selbst vermerkt.

---

## Kontext

Das Krypto-Gutachten (Befund 1.7) bemängelt, dass beim Setzen eines Depot-Passworts keine
Stärke-Rückmeldung erscheint — nur die harte Mindestlänge 8. Für die Zielgruppe (oft ältere
Menschen, die ihr Depot selbst absichern) ist eine ruhige, verständliche Rückmeldung wertvoll,
ohne sie zu bevormunden oder im Panik-Moment auszusperren.

## Entscheidung — was gebaut wurde

Eine **heuristische, rein hinweisende** Stärke-Einschätzung, **ohne externe Bibliothek und ohne
Netz** (passt zur Offline-/Single-File-Linie):

- `passwortStaerke(pw)` → `{ stufe: 'schwach'|'mittel'|'stark', bekannt }`. Bewertet **Länge**
  (≥8/≥12/≥16) und **Zeichenklassen-Vielfalt** (Klein-/Großbuchstaben/Ziffern/Sonderzeichen).
  **Zwei harte Untergrenzen** drücken IMMER auf „schwach" und werden vom Balken nie belohnt:
  (1) Länge < 8; (2) **bekannt/trivial** — eingebettete Blockliste der verbreitetsten DE/EN-
  Passwörter (`PW_BLOCKLISTE`, ~80 Einträge, lowercased), reine Ziffernfolgen (`12345678`) und
  ein einziges wiederholtes Zeichen (`aaaaaaaa`).
- **Sichtbare Rückmeldung** unter dem Passwortfeld (`pwStaerkeAnzeigeVerdrahten`, `aria-live=polite`):
  ein dezenter Drei-Segment-Balken + Text „Passwort-Stärke: schwach/mittel/stark", in ruhiger,
  nicht-bevormundender Sprache; bei Blocklisten-Treffern ein sanfter Hinweis. Live beim Tippen.
- **Beide** Passwort-Eintritte verdrahtet: Depot-Anlegen (`id-pw`) und das namenslose
  Passwort-Setzen aus der Vorschau (`pw-neu`).
- **Marken-/Funktionsfarben unverändert:** nur vorhandene Tokens (`--line` neutral, `--warning`
  Bernstein, `--success` Grün) — keine neue Farbe eingeführt.

### Getrennte harte Schranke (Anti-Regression)
Die Mindestlänge-8 wurde aus den zwei Modalen in **eine** Funktion `pwGrundFehler(pw)` gezogen
(liefert `'pwSetzenLeer'` / `'pwMin8Fehler'` / `null`). Beide `onPrimaer`-Handler rufen sie — die
hinweisende Stärke ersetzt die **Pflichtprüfung nie**. Das macht die Schranke außerdem unit-testbar.

## B2-STOPP — Zwang vs. Empfehlung (Produktentscheidung)

Auftragsgemäß wurde die Rückmeldung **nicht-blockierend** gebaut: sie zeigt die Stärke, **verhindert
das Setzen aber nicht** (über die bestehende Mindestlänge-8 hinaus). Offen ist die Entscheidung, ob
eine Mindest-Stärke **erzwungen** oder nur **empfohlen** wird.

**Konsequenz für die Zielgruppe (ein Satz je Richtung):**
- **Zwang** (schwache PW werden abgelehnt): mehr Sicherheit im Schnitt, **aber** echtes Aussperr-/
  Frust-Risiko gerade bei älteren Nutzern, die sich ein „starkes" Passwort schwer merken — und das
  Depot ist nicht wiederherstellbar.
- **Empfehlung** (nur Hinweis, Setzen bleibt frei): niedrigschwellig und würdevoll, **aber**
  schwache Passwörter bleiben möglich.

Bis zur Antwort bleibt es bei **Empfehlung** (Anzeige ja, Blockade nein).

## Wortlaut (nicht das verbatim-geschützte Zitat-Set nach U2-ADR-025)

Die Hinweis-Texte (`pwStaerkeLabel/-Schwach/-Mittel/-Stark/-Tipp/-Bekannt`) sind **mein** Vorschlag,
ruhig und knapp gehalten; sie gehören NICHT zum Verbatim-geschützten Haftungs-Set (U2-ADR-025) und
dürfen jederzeit angepasst werden.

## Konsequenzen
- Stärke-Rückmeldung sichtbar an beiden Passwort-Eintritten; rein hinweisend.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678…` unverändert (nur STRINGS/UI/CSS + zwei
  reine Helfer außerhalb des Blocks). Block-Integrität 2/0. Suite **919/0/1** (1 FHIR-Skip).
  Neuer Voll-SHA in `vivodepot.html.sha256`.
- **Offen:** Zwang-vs.-Empfehlung (B2) — Produktentscheidung; bei „Zwang" Folge-Commit (Schwelle
  an `pwGrundFehler` andocken).

## Implementations-Verweis
Tests: neu `sicherheit-block-b.test.js` (5 Negativ-Tests, Muster „Angriff konstruieren → scheitert":
12345678→schwach, passwort/password→Blockliste, starke Passphrase→stark, Mindestlänge-8 weiter
erzwungen + kurzes-aber-reiches PW bleibt schwach, sichtbare DOM-Rückmeldung). Test-Infrastruktur:
`load-kern.js` EXPORT_HOOK um die drei Block-B-Helfer ergänzt.

## Konformität

```konformitaet
aussage:   Die Stärke-Rückmeldung wird sichtbar in den DOM geschrieben (aria-live, nicht still) —
           die beiden harten Untergrenzen (Länge < 8, Blockliste/Trivialfolge) drücken die
           Bewertung immer auf „schwach".
zustand:   prüfbar
pruefung:  tests/sicherheit-block-b.test.js#B-Negativ-5: die Stärke-Anzeige wird sichtbar in den DOM geschrieben (nicht still)
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
