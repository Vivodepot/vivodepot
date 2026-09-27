# U2-ADR-342 · Der Beleg bleibt im Depot — und zwei Klassen von Lesern sehen verschiedene Dinge

**Datum:** 06.09.2026
**Status:** gebaut (Kern-Teil UND Lese-App-Teil), Suite grün
**Status heute:** gilt
**Nummer:** 342, gegen `docs/adr/README.md` geprüft und dort eingetragen (frei; 336 war zuerst
belegt, an `cb`s "Vier reservierte Klassennamen" gefallen, 342 freigegeben)
**Auftrag:** "Auftrag C1 — der Beleg bleibt im Depot", 06.09.2026
**Bezug:** U2-ADR-181 (`modulEinlassen`/`pruefstufe`) · U2-ADR-258 (Herkunft beim Empfänger) ·
U2-ADR-335 (die Lese-App liest, sie prüft nicht — die harte Auflage für Teil 2) ·
U2-ADR-040 (`_plan.beleg`, das Vorbild bei `importierteVorlagen`) · A467 (die erzwungene Gruppe,
`anbieterIdGeprueft`) · Befund `lese-app-liest-statt-prueft-2026-09-06.md` §6

---

## 1 · Der Mangel

`modulEinlassenGeprueft` (vivodepot.html) verifiziert bei einem eingelassenen `logikModul` die
volle Zertifikatskette — `providerCredentialJws` gegen den Anker, `modulSignaturJws` gegen den
zertifizierten Anbieter-Key — und reichte danach nur `tv.nutzlast` an `modulEinlassen` weiter.
Das JWS-Bündel selbst, mit dem genau diese Kette geprüft wurde, ging verloren. Ein Empfänger, der
die Depot-Datei öffnet, kann danach **nichts nachprüfen** — er liest nur, was der Kern beim
Einlass selbst behauptete (`ungeprueft`, `pruefstufe`, `anbieterId`).

Dasselbe Muster existiert bereits, bewiesen, bei `importierteVorlagen`: `_plan.beleg` legt
`{templateJws, providerCredentialJws}` in den Depot-Eintrag, `verifiziereTemplateKette` prüft ihn
beim Empfänger nach. `logikModule` hatte diesen zweiten Schritt nie bekommen.

## 2 · Die Entscheidung: nachbauen, nicht neu erfinden

`beleg` gehört in dieselbe erzwungene Gruppe wie `ungeprueft`/`anbieterIdGeprueft`/`pruefstufe`
(A467, U2-ADR-181): ein Modul, das selbst ein `beleg`-Feld mitbringt, behauptet einen
Prüfgegenstand, den niemand geprüft hat. `modulEinlassen` baut `markiert` per
`Object.assign({}, modul, …)` — das kopiert zuerst ALLE Felder aus dem rohen Modul, ein selbst
eingebrachtes `beleg` also mit. Erzwungen auf `null` im selben Schritt wie `ungeprueft: true` und
`anbieterIdGeprueft: false`; nur der EINE geprüfte Zweig darf ihn heben — mit dem Bündel DIESES
Einlasses, nie mit dem, was das Modul selbst nennt.

`modulEinlassenGeprueft` reicht dafür einen fünften, neuen Parameter an `modulEinlassen`:
`{providerCredentialJws, modulSignaturJws}`, gebaut aus dem bereits verifizierten `bundle` —
keine neue Prüfung, dieselben zwei Felder, die die Funktion ohnehin schon verifiziert hat.

`LOGIK_MODUL_SCHLUESSEL` bekommt `'beleg'` additiv dazu — kein Schema-Bump, keine
Migrationsstufe. Es gibt für `logikModule`-Einträge kein nummeriertes JSON-Schema, sondern ein
Objekt-Allowlist, durchgesetzt von `logikModulPruefen()`; `ungeprueft`/`anbieterIdGeprueft`/
`pruefstufe` sind genau so additiv in dieses Allowlist gewandert, ohne eine "Stufe N→N+1".

## 3 · Der Fund, der wichtiger ist als der Bau: zwei Klassen von Lesern

`_modulOderVorlage` — der Weg, über den ein `logikModul`-Eintrag zu einem erzeugbaren Dokument
wird — liest NICHT den rohen Depot-Eintrag. Es ruft `logikModulPruefen()` **erneut** auf und nimmt
`geprueft.logik`: ein bei jedem Lesen frisch gebautes, allowlist-only Objekt
(`id, titel, sektor, herkunft, moduleVersion, eingelassenAm, sprache, datenSchema, abschnitte,
dokAusgabe`).

**`logik` trägt heute schon nicht `ungeprueft`, nicht `anbieterId`, nicht `anbieterIdGeprueft`,
nicht `pruefstufe` — und würde `beleg` genauso wenig tragen, ohne eine gezielte Erweiterung.**

Das heißt: es gibt zwei Klassen von Lesern, und sie sehen strukturell verschiedene Depots:

```
Roh-Leser      lesen data.logikModule[] direkt
               sehen ungeprueft/anbieterId/pruefstufe/beleg sofort
               (z. B. die Herkunft-Marke, U2-ADR-332; ein künftiger Beleg-Prüfer)

logik-Leser    gehen über _modulOderVorlage -> logikModulPruefen().logik
               sehen KEINES dieser Felder — auch nach diesem Zug nicht
               (die Dokument-Erzeugung selbst: datenLesen, abschnitte, dokAusgabe)
```

**Entscheidung: `logik` reicht `beleg` NICHT durch.** Das ist keine Lücke, die dieser Zug
übersehen hätte, sondern dieselbe Trennung, die für die gesamte Provenienz bereits gilt und
bewusst gilt: `logik` beschreibt, WIE ein Dokument entsteht (Struktur, Felder, Ausgabeform) — es
beantwortet nie die Frage, WER das Modul eingelassen hat oder OB es geprüft ist. Diese Frage
beantwortet ausschließlich der rohe Depot-Eintrag, und ausschließlich Roh-Leser stellen sie
(die Herkunft-Marke heute, ein künftiger Beleg-Prüfer der Lese-App morgen). Würde `beleg` in
`logik` durchgereicht, entstünde ein ZWEITER Weg, über den Provenienz sichtbar wird, während die
bestehenden vier Felder weiter nur über den Roh-Weg liefen — zwei Mechanismen für dieselbe Klasse
von Aussage, die auseinanderdriften könnten. Das ist genau die Art Fehler, die A281
(Textsatz-Regeln) und A467 bereits für andere Fälle ausgeschlossen haben.

**Folge, die nicht dieser Zug ist:** ein Prüfer, der über `logik`/`_modulOderVorlage` geht, kann
über Herkunft grundsätzlich nichts sagen — das gilt heute schon für alle vier bestehenden Felder
und ist keine neue Eigenschaft von `beleg`. Niemand hat es bisher bemerkt, weil `_modulOderVorlage`
nichts behauptet, was es nicht prüft (anders als die Lese-App vor dem Befund vom 06.09., der genau
diese Klasse von Fehler an anderer Stelle beschreibt).

## 4 · Rot-Beweise

```
a  Beleg vorhanden, Signatur passt NICHT   -> ungeprueft
   Zweifach gedeckt: am Kern erreicht eine verfälschte Signatur modulEinlassen nie
   (modulEinlassenGeprueft bricht vorher ab, s. tests/modul-einlassen-geprueft.test.js).
   Am LESER (Teil 2, s. §6) prüft logikModulPruefstandBerechnen den gespeicherten
   Beleg unabhängig nach — ein manipulierter Beleg wird 'ungueltig', nicht 'gueltig'.
   Getestet: tests/c1-logikmodul-pruefstand-lese-app.test.js ([C1·ungueltig·Rot-Beleg], zwei Fälle).
b  `ungeprueft: false` OHNE Beleg          -> ungeprueft
   Getestet: tests/c1-beleg-im-depot-logikmodul.test.js
c  Depot ohne Beleg (also jedes heutige)   -> gueltig, ungeprueft
   Getestet: tests/c1-beleg-im-depot-logikmodul.test.js — die wichtigste, weil
   sie rot werden MUSS, wenn ein späterer Zug sie versehentlich bricht.
```

## 5 · Was dieser Zug NICHT ist

Kein Schlüsselmaterial berührt, kein Signieren gebaut — die beiden ab-Werk-Module werden von Hand
signiert, außerhalb dieses Zugs.

## 6 · Teil 2: der zweite Weg in der Lese-App — nach U2-ADR-335, mit ihrer harten Auflage

**Die Auflage, wörtlich aus dem Auftrag:** *„`41` baut gerade U2-ADR-335: `modulHerkunftStand`
sagt nie mehr `geprueft`. DAS BLEIBT SO — Dein Zug fügt einen ZWEITEN Weg daneben, der etwas
prüft."* U2-ADR-335 landete zuerst (`41` ist beendet). Dieser Zug
baut darauf auf, **ändert `modulHerkunftStand` an keiner Stelle** und fügt den zweiten Weg als
eigenständigen Mechanismus daneben — wörtlicher Nachbau der bereits bewiesenen Bauform
`vorlagenPruefstandBerechnen`/`vorlagenMarkeHTML`/`_vorlagenStand` (A318 Zug 2), nur für
`data.logikModule` statt `data.importierteVorlagen`:

```
logikModulPruefstandBerechnen(depot, opts)   Prüfstand: id -> {zustand, anbieter, …}
                                              vier Zustände, wörtlich wie bei Vorlagen:
                                              gueltig · abgelaufen · ungueltig · nicht-pruefbar
                                              ruft verifiziereTemplateKette UNVERÄNDERT —
                                              die Funktion ist generisch (zwei JWS + opts),
                                              ihr ist gleichgültig, ob die Signatur ursprünglich
                                              über einer Vorlage oder einem logikModul geleistet
                                              wurde
_logikModulStand / logikModulStandRechnen    eigener Cache, eigener Zuruecksetzen-Aufruf beim
                                              Depot-Schliessen — derselbe Grund wie bei Vorlagen:
                                              ein Prüfstand, der nach dem Schliessen stehen bliebe,
                                              markierte das NÄCHSTE Depot mit dem Urteil über das
                                              vorige
logikModulMarkeHTML(rohEintrag)              die Anzeige — NEUE Klasse `logikmodul-marke` (nicht
                                              `vorlage-marke` wiederverwendet: die Erhebung soll
                                              sie als eigenen Fund sehen, s. u.), sechs neue
                                              STRINGS-Schlüssel (logikmodul{Geprueft,
                                              GeprueftOhneNamen, Abgelaufen, AbgelaufenOhneNamen,
                                              Ungueltig, NichtPruefbar})
```

**Eingebunden in `logikModulAbschnitteHTML`**, direkt neben `dokAusgabe.herkunftText` — mit dem
ROHEN Depot-Eintrag (`roh`), nicht mit `logik`: genau die Trennung, die §3 dieser ADR für den
Kern-Teil begründet, gilt spiegelbildlich am Leser. `roh` trägt `beleg`, `logik` (der
`logikModulPruefenLesen`-Ertrag) tut es nicht und soll es nicht — dieselbe Entscheidung, zweimal
unabhängig getroffen, weil sie an beiden Stellen aus demselben Grund folgt.

**U2-ADR-331 — die Zusicherungs-Sperre.** Ein Zustandssatz in der Lese-App ist keine
Behauptung, die ein angedocktes Sprachmodul überschreiben darf (U2-ADR-331,
`ZUSICHERUNGS_SCHLUESSEL_LESEN`, erzeugt von `tools/zusicherungs-schluessel-erheben.js`). Die
sechs neuen `logikmodul*`-STRINGS-Schlüssel sind genau diese Art Aussage. Die Sperrliste ist
GENERIERT, nicht von Hand gepflegt — sie leitet sich aus Markup-Blöcken mit einer der
`ZUSTAND_KLASSEN`-Klassen ab. `ZUSTAND_KLASSEN` bekommt darum `'logikmodul-marke'` additiv dazu
(`tools/zusicherungs-schluessel-erheben.js`); die generierte Region in `vivodepot-lesen.html`
selbst wird mit `npm run zusicherungen:build`/`--check` beim Suite-Lauf nachgezogen, nicht von
Hand — **das ist ausdrücklich der Schritt, der bei der Suite noch aussteht** (s. Statuszeile).

**Die Probe, die U2-ADR-335 ausdrücklich freigibt, fallen zu dürfen:** *„Dass die Lese-App heute
zu keinem Modul `geprueft` sagt, ist eine ZWEITE, eigene Probe — mit eigener Lebensdauer. Sie
darf fallen, wenn der Beleg mitreist, und ihr Fallen ist dann ein Ereignis und kein Rätsel."*
Übernommen, nicht gelöscht: `tests/c1-logikmodul-pruefstand-lese-app.test.js` führt eine eigene
Probe (`[C1·U2-ADR-335 unberührt]`), die zeigt, dass `modulHerkunftStand` an einem logikModul MIT
gültigem Beleg weiterhin `ungeprueft` sagt — der erste Weg bleibt unberührt, der zweite Weg liegt
daneben, keiner ersetzt den anderen.
