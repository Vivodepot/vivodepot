# U2-ADR-142: Institutions-Arten sind von aussen erweiterbar — der fünfte Andockweg

**Status:** Akzeptiert
**Datum:** 17.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** Produktentscheidung vom 17.08.2026 — die Lücke aus der
Andockbarkeits-Erhebung wird geschlossen. Auftrag „Die abgelöste Farbe, und `SITUATIONEN` zu
Ende" (Zug 4), nachgeholt als Zug 0 des Auftrags „Die Empfängerseite".
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `INSTITUTION_ART_EINGEBAUT`,
  `_INSTITUTION_ART_MODUL_REGISTRY`, `institutionsArtModulPruefen`,
  `institutionsArtModulEinbetten`, `_institutionsArtenAusDepotAnmelden` (Boot),
  `institutionsArtLabel`, `institutionsArtenAlle`, `INSTITUTION_ART_VERWORFEN`,
  Verbrauchsstelle `_institutionFelder`.
- **ADR-Bezug:** U2-ADR-141 (Textsatz — das jüngste der vier Vorbilder, dessen Form hier
  übernommen wird; die zwölf Beschriftungen liegen seither in seinem Satz), U2-ADR-121
  (Rechtsraum-Modul — Namensraum- und Versionsregel), U2-ADR-008 (Institutionen sind
  Nutzerdaten, kein Katalog — davon bleibt dieser ADR unberührt).
- **Status heute:** gilt — Beleg `tests/institutions-arten-andockbar.test.js#[InstArt·Rot 1] ein
  angedocktes Modul erscheint in der Auswahlmaske`.

---

## Der Befund

Die Andockbarkeits-Erhebung vom 17.08.2026 hat siebzehn Register gemessen. Institutionen selbst
sind **kein** Register — sie sind Nutzerdaten (U2-ADR-008). Was eines IST, sind die
**Institutions-ARTEN**: `INSTITUTION_ART`, ein `Object.freeze` mit zwölf Werten, dazu
`INSTITUTION_ART_LABEL` mit deutschen Beschriftungen.

**Das war keine Lücke aus Versehen, sondern eine geschlossene Liste mit Nachreich-Politik.**
Der Kommentar darüber sagt es: *„Keine weiteren Werte — was fehlt, kommt, wenn jemand es
vermisst."*

**Und die Liste ist deutsch, nicht allgemein.** Standesamt, Meldebehörde, Pflegekasse sind
deutsche Institutionen. Wer für ein anderes Land anpasst, ergänzt nicht eine Art, sondern
ersetzt die Hälfte.

**Warum es nach v1 teurer wird:** `data.institutionen[].art` **speichert** die Kennung. Je mehr
Bestandsdepots, desto teurer eine Regel, die nachträglich entscheidet, was mit einer unbekannten
Art geschieht.

## Zwei Messungen vor dem Bau — beide sagen: das bekannte Muster reicht

**(1) Ein unbekannter Wert bricht heute nichts.** Empirisch geprüft mit `art: 'notaire'` ohne
jedes Modul:

| geprüft | Ergebnis |
|---|---|
| `institutionenVorschlag('notaire')` | findet den Eintrag |
| `verweisExportFelder('geschaeftlich', 'institution', …)` | `{name: 'Étude Dupont', art: 'notaire'}` |
| Auswahlmaske | bietet ihn nicht an (zwölf feste Optionen) |

**Nicht abgelehnt, nicht geleert — durchgereicht.** Dasselbe Verhalten, das
`_rechtsraumKatalogLesen` für einen unbekannten Schlüssel zeigt: `undefined` statt Wurf. Der
Vergleichsfall stand also bereits entschieden, wie der Auftrag vermutete.

**(2) Keine geschlossene Menge wird vorausgesetzt.** `INSTITUTION_ART` wird an **genau einer**
Stelle gelesen: den Auswahl-Optionen in `_institutionFelder`. `INSTITUTION_VERWEIS_MATRIX` führt
`art` als **Feldnamen** (`art: true`), nicht als Wertebereich; `verweisExportFelder` kopiert den
Wert wörtlich. Kein Export, keine FHIR- oder XÖV-Zuordnung prüft gegen die zwölf.

**Damit war genau eine Sache zu bauen: die Auswahlmaske muss angedockte Arten anbieten.**
Alles andere trug schon.

## Entscheidung

**1 — `data.institutionsArten[]` ist der fünfte Andockweg**, nach dem Muster der vier
bestehenden: eingebauter Satz, darübergelegt die Einträge geprüfter Module, Registrierung beim
Öffnen des Depots in derselben Reihe wie Code-Listen, Rechtsraum-Module und Textsätze.

**2 — Das Vorbild ist das JÜNGSTE der vier, und die Wahl ist begründet.** Die vier bestehenden
Wege unterscheiden sich: `codeListen`/`feldDefinitionen`/`importierteVorlagen` kommen über den
**signierten Import** (`provider-credential`), `rechtsraumModule` und `textsatzModule` werden
**aus dem Depot** registriert, mit Strukturprüfung statt Signatur. Der Auftrag sagt: wo sie sich
unterscheiden, gilt der jüngste — das ist U2-ADR-141 (Textsatz).

**Der sachliche Grund dahinter:** der signierte Weg setzt einen Import-Kanal voraus, den es für
ein Register dieser Art nicht gibt. Der Depot-Umschlag ist AEAD-authentifiziert und
passwortgeschützt; was darin steht, hat die Bürgerin hineingelassen.

**3 — Die zwölf eingebauten Arten bleiben unverändert und sind reserviert.** Ein Modul, das eine
von ihnen beansprucht, wird **verworfen und namentlich benannt** (`INSTITUTION_ART_VERWORFEN`) —
dieselbe Regel, mit der `'DE'` beim Rechtsraum und `'de'` beim Textsatz gesperrt ist. **Ein
Modul ergänzt, es ersetzt nicht.** Ein verworfener Eintrag verwirft nicht das Modul.

**4 — `moduleVersion` regiert wie überall:** ganzzahlig ≥ 1, und nur eine höhere ersetzt einen
bestehenden Eintrag derselben Herkunft (Aktualisieren-statt-Einfrieren).

**5 — Die Beschriftungen liegen im Textsatz, nicht in einem zweiten eingefrorenen Objekt.**
`INSTITUTION_ART_LABEL` war beim Umbau der Nacht **durchgerutscht** — das Umstell-Werkzeug läuft
den `SEKTOREN`-Baum ab, und dieses Objekt liegt dort nicht. Es bleibt als Lese-Sicht für
Bestandsaufrufer bestehen, wird aber **aus dem Satz gebaut** statt daneben gepflegt.

**6 — Ohne Modul gibt es kein Label, und das ist Absicht.** `institutionsArtLabel` liefert für
eine unbekannte Kennung `null`, nie einen erfundenen Text. Die Anzeige zeigt dann die Kennung —
so wie sie es vor diesem ADR schon tat.

## Konsequenzen

**Die Zahl der von aussen erweiterbaren Register steigt von vier auf fünf** (sechs mit dem
Textsatz aus derselben Nacht gezählt, s. Erhebung vom 17.08.).

**Was dieser ADR NICHT löst:** es gibt weiterhin **keinen Weg, ein Modul in ein Depot zu
bekommen** — die schreibende Funktion (`institutionsArtModulEinbetten`) hat im Produkt keinen
Aufrufer, genau wie ihre Geschwister bei Rechtsraum und Textsatz. Das ist dieselbe eine offene
Frage für alle drei (Contributor-Trust-Path, `docs/JURISDICTIONS.md`), und sie wird nicht durch
einen vierten Einzelfall beantwortet.

**Die Lese-App erreicht dieser Weg nicht.** Sie liest `data.institutionsArten` nicht; ein
Empfänger sieht die Kennung, nicht die Beschriftung — dieselbe Lage wie bei den Code-Listen.

---

*Vivodepot GmbH · Berlin · 17.08.2026*
