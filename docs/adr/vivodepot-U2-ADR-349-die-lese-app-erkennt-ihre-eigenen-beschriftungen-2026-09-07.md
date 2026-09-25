# U2-ADR-349: Die Lese-App erkennt ihre eigenen Sektor-/Feld-Beschriftungen als übersetzbar

**Datum:** 2026-09-07
**Status:** gebaut, Rundlauf mit echtem EN-Modul geprüft (Registrierung + Rendering)
**Status heute:** gilt
**Bezug:** U2-ADR-141 (17.08.2026, führt diese Frage seit einem Monat als offen) · U2-ADR-166
(Spiegel-Muster für den Textsatz der Lese-App) · U2-ADR-323/334 (der Riegel gegen fremde
Bereichsnamen, hier ausdrücklich unberührt) · U2-ADR-347 (derselbe Erzeuger-statt-Handkopie-
Grundsatz, eine Woche — eigentlich denselben Abend — vorher, SITUATIONEN)

## Ausgangsbefund (Peer 55, im Browser gemessen, nicht vermutet)

Ein Depot mit aktivem englischem Textsatz-Modul (`data.textsatzsprache='en'`, echte
Datei-Rundlaufprobe bestanden) zeigt in `vivodepot-lesen.html` weiterhin deutsche Sektor- und
Feld-Beschriftungen, obwohl `textsatzSpracheAktiv()` korrekt `'en'` liefert. Zwei getrennte
Ursachen, jede für sich ausreichend:

1. **Der Kennungs-Filter.** `_textsatzModuleAusDepotAnmelden()` ließ nur 8 von 3263 Kennungen
   des Moduls durch — ausschließlich `strings:*`-Kennungen (die kleine, eigene UI-Text-Tabelle
   der Lese-App). Jede `identitaet.*`/Sektor-/Feld-Kennung wurde als „unbekannt" verworfen.
2. **Das Rendering.** `sektorHTML()` (Sektor-/Sektions-Überschrift) und `feldZeileHTML()`
   (Feld-Label) lasen `sek.label`/`sektion.label`/`feld.label` ROH aus `SEKTOR_BY_ID`, ohne je
   `textLesen()` aufzurufen. Selbst ein korrekt registriertes Modul hätte am Bildschirm nichts
   geändert.

## Beantwortet U2-ADR-141, offene Frage 3

U2-ADR-141 (17.08.2026) führte seit einem Monat die Frage: „Ob die Lese-App aus demselben Satz
lesen soll. Heute trägt sie eine eigene Kopie. Die Frage ist eine Architekturfrage über zwei
Anwendungen, keine Textfrage." Antwort dieses ADRs: **nein zu einer gemeinsamen Laufzeit-Quelle**
(die Lese-App hat kein `ladeKern()`, sie bleibt eine einzelne lesende Datei), **ja zum
wörtlichen Spiegel des Kennungsraums** — derselbe Kern-Mechanismus, erzeugt statt getippt.
Dasselbe Muster wie U2-ADR-166 für die Textsatz-REGELN, jetzt für die Textsatz-KENNUNGEN.

## Warum U2-ADR-334s Riegel kein Widerspruch ist

U2-ADR-334 (selber Tag, 06.09.2026): „ein Modul beschriftet den Bereich, den es selbst
mitgebracht hat — niemals identitaet, gesundheit, vorsorge." Das ließt sich wie ein Verbot
genau dessen, was dieses ADR jetzt tut. Ist es nicht — der Kern-Code selbst unterscheidet zwei
verschiedene Fragen (`vivodepot.html`, `_textsatzTexteUebernehmen`, Zeile ~10680):

```
if (!Object.prototype.hasOwnProperty.call(TEXTSATZ_EINGEBAUT, kennung)
    && !_istModulfeldKennung(kennung)
    && !_istBereichLabelKennung(kennung)) { verworfen }
```

Drei Zulassungs-Bedingungen, ODER-verknüpft. `_istBereichLabelKennung` (der Riegel aus
ADR-334) ist nur die DRITTE — sie verhindert, dass ein Modul eine NEUE `<eingebaute-id>.label`-
Kennung ERFINDET (einen fremden Bereichsnamen kapert). Die ERSTE Bedingung —
`hasOwnProperty(TEXTSATZ_EINGEBAUT, kennung)` — ist eine andere Frage: darf ein Modul eine
BEREITS BEKANNTE Kennung ÜBERSETZEN? Ja, das ist der ganze Zweck eines Sprachmoduls. **Erfinden
ist gesperrt, Übersetzen nicht.** Die Lese-App hatte kein Äquivalent zur ersten Bedingung — nicht,
weil sie es nicht durfte, sondern weil sie kein `TEXTSATZ_EINGEBAUT`-Äquivalent besaß, an dem
sich „bereits bekannt" hätte prüfen lassen (kein `_textsatzAufSektorenAnwenden`-Äquivalent
existiert dort). Der Riegel selbst (`_istBereichLabelKennungLesen`) ist von diesem ADR
UNVERÄNDERT — er steht weiterhin, Zeile für Zeile.

## Entscheidung

`tools/build-textsatz-eingebaut-lesen.js` erzeugt `TEXTSATZ_EINGEBAUT_LESEN` in
`vivodepot-lesen.html` — 310 Kennungen (13 Sektor-Label + 27 Sektions-Label + 270 Feld-Label),
aus `V.SEKTOREN` gezogen (`ladeKern()`), `--check` im pre-commit. `_textsatzKennungBekannt()`
akzeptiert jetzt zusätzlich jede Kennung, die in dieser Tabelle steht — wörtlicher Spiegel der
ersten Kern-Bedingung. `sektorHTML()`/`feldZeileHTML()` fragen für ihre Beschriftungen jetzt
`textLesen(kennung) || rohesLabel` ab, statt das Label roh zu lesen.

**Erzeugt, nicht getippt (07.09.2026):** 310 Kennungen von Hand abzutippen ist exakt die
Bauform, die die 41 zurückgehaltenen sensiblen Felder aus U2-ADR-347 erzeugt hat — eine Kopie,
bei der eine Markierung nicht mitkam. Der Aufwand eines Erzeugers wächst nicht mit der Zahl der
Kennungen; eine Handtabelle würde lautlos auseinanderlaufen. Ein Wächter
(`W-textsatz-eingebaut-lese-app`, wörtlicher Spiegel von `W-situationen-lese-app`) wird rot,
sobald Kern und Lese-App auseinanderlaufen.

**Nur Label, keine Hints:** die Lese-App fragt heute ausschließlich `label`-Kennungen ab — kein
Konsument liest je einen `.hint` an dieser Stelle. Eine `.hint`-Zeile wäre angenommen und
wirkungslos. Kommt ein Konsument dazu, wird die Art ergänzt — nicht vorsorglich.

## Geprüft

Voller Rundlauf mit einem echten EN-Modul: Registrierung nimmt alle drei Kennung-Formen an
(0 Verwürfe, vorher 3 von 3), `sektorHTML('identitaet')` zeigt „Identity & Person"/„Person"/
„First name" statt „Identität & Person"/„Person"/„Vorname". Ohne aktives Modul bleibt die
eingebaute deutsche Beschriftung unverändert (Rot-Beweis: kein Fehlalarm). Der Riegel aus
ADR-334 bleibt für eine wirklich unbekannte Kennung wirksam (eigener Test).

## Umsetzung

- `tools/build-textsatz-eingebaut-lesen.js` (neu) — Erzeuger, `--check`-Modus.
- `vivodepot-lesen.html` — `TEXTSATZ_EINGEBAUT_LESEN` als markierte, generierte Region;
  `_textsatzKennungBekannt()` erweitert; `sektorHTML()`/`feldZeileHTML()` rufen `textLesen()`.
- `hooks/pre-commit` — `build-textsatz-eingebaut-lesen.js --check` verdrahtet.
- `tools/waechter-register.js` — `W-textsatz-eingebaut-lese-app`.
- `tests/textsatz-eingebaut-lesen-generator.test.js` — Selbstprobe des Erzeugers.
- `tests/textsatz-anbindung-lese-app-kopplung.test.js` — voller Rundlauf, Rot-Beweise für
  beide Ursachen (Filter UND Rendering).
