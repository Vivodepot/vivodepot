# U2-ADR-334-Nachtrag — Erfinden verboten, Übersetzen erlaubt

**Status:** Angenommen
**Datum:** 2026-09-07
**Bezug:** U2-ADR-334 (die Zusicherung, die dieser Nachtrag einengt), U2-ADR-349 (der Zug, der
die Einengung nötig macht), U2-ADR-090 §3 (Benennung von Nachträgen)
**Linie:** U2

**Status heute:** gilt — Beleg `tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js`.

---

## Anlass

U2-ADR-334s Konformitätsklausel führt die Aussage (wörtlich):

> „Die Beschriftung eines EINGEBAUTEN Bereichs kann ein Modul nicht setzen; die Kennung wird
> benannt verworfen, und die Sperre deckt jede eingebaute Kennung, weil sie aus der eingebauten
> Liste abgeleitet ist."

mit Beleg am Test `[U2-ADR-334·Rot-Beweis Sperre] eine EINGEBAUTE Bereichs-Kennung wird benannt
verworfen`. U2-ADR-349 (selber Abend, wenige Stunden später) hat diesen Test geändert: eine
eingebaute Bereichs-Kennung wie `identitaet.label` wird jetzt AKZEPTIERT, wenn ein Modul sie
liefert — nicht mehr pauschal verworfen. Die Aussage oben stimmt damit in ihrer starken Form
nicht mehr, und ein Nachtrag muss sagen, warum das keine stille Absenkung ist, sondern eine
Präzisierung dessen, was die Sperre immer gemeint hat.

## Was sich ändert, und was nicht

Die STARKE Aussage („kann ein Modul nicht setzen") war zu weit gefasst. Sie stand so, weil die
Lese-App bis U2-ADR-349 KEINEN Weg hatte, zwei verschiedene Dinge zu unterscheiden, die an
derselben Kennung (`identitaet.label`) hängen:

- **Erfinden:** ein Modul benutzt eine eingebaute ID, um sich selbst als NEUEN, docked Bereich
  auszugeben — den es nicht ist. Das kapert einen fremden Namen.
- **Übersetzen:** ein Modul liefert eine andere Sprachfassung des BEREITS BESTEHENDEN,
  eingebauten Bereichs — dieselbe `identitaet`, ein anderer Anzeigetext.

Ohne Unterscheidungsmechanismus war „beides sperren" die einzige sichere Antwort. U2-ADR-349
liefert den Mechanismus (`TEXTSATZ_EINGEBAUT_LESEN`, wörtlicher Spiegel von Kerns
`hasOwnProperty(TEXTSATZ_EINGEBAUT, kennung)`-Bedingung) — und der KERN selbst hatte diese
Unterscheidung immer schon getroffen: `identitaet.label` war im Kern nie gesperrt, weil er sie
längst als „bereits bekannt, also übersetzbar" führt (`vivodepot.html`,
`_textsatzTexteUebernehmen`, Zeile ~10680, erste von drei ODER-verknüpften Bedingungen). Die
Lese-App hinkte dem Kern hinterher, nicht umgekehrt — das ist keine neue Öffnung, sondern das
Schließen einer Lücke ZWISCHEN Kern und Lese-App.

**Was UNVERÄNDERT gesperrt bleibt:** das Erfinden. `_istBereichLabelKennungLesen` (der eigentliche
Riegel aus U2-ADR-334) prüft weiterhin, ob eine ID zur eingebauten Liste gehört, und verweigert
für sie GENAU DEN Zweig, der einen NEUEN docked Bereich anmelden würde. Dieser Prädikat-Code ist
von U2-ADR-349 nicht berührt — geprüft in
`[U2-ADR-334·Rot-Beweis Sperre] die Sperre ist ABGELEITET, sie deckt jede eingebaute Kennung`,
unverändert grün.

## Die Aussage, präzisiert

Die zweite Aussage in U2-ADR-334s Konformitätsklausel wird ersetzt durch:

> Ein Modul kann eine eingebaute Bereichs-ID nicht als NEUEN, eigenen Bereich anmelden (Erfinden
> bleibt gesperrt, `_istBereichLabelKennungLesen` weist jede eingebaute ID ab). Ein Modul KANN
> die Beschriftung eines bereits bestehenden eingebauten Bereichs übersetzen, wenn die Kennung im
> Kern selbst als bekannt geführt wird (U2-ADR-349, `TEXTSATZ_EINGEBAUT_LESEN`) — das ist
> Übersetzen, kein Kapern.

**Beleg (ersetzt den alten Test-Verweis):**
`tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js`
`"[U2-ADR-334→349] eine EINGEBAUTE Bereichs-Kennung wird jetzt als Übersetzung akzeptiert, nicht mehr pauschal verworfen"`
(Erfinden weiterhin gesperrt: `"[U2-ADR-334·Rot-Beweis Sperre] die Sperre ist ABGELEITET, sie deckt jede eingebaute Kennung"`, unverändert.)

## Warum das kein Widerspruch zur ursprünglichen Absicht ist

U2-ADR-334s eigener Kopfkommentar beschreibt den Riegel so: „ein Modul beschriftet den Bereich,
den es selbst mitgebracht hat — niemals identitaet, gesundheit, vorsorge." Das ist eine Aussage
über EIGENTUM AN EINER NEUEN IDENTITÄT, nicht über die Übersetzbarkeit einer BESTEHENDEN. Die
Konformitätsklausel hatte diese Nuance nicht mitgeführt, weil zum Zeitpunkt ihrer Formulierung
kein Test die beiden Fälle auseinanderhielt — es gab nur den einen, der abprallte. Dieser
Nachtrag trägt die Nuance nach, die der Kopfkommentar schon immer meinte.
