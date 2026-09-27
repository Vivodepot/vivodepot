# U2-ADR-135: Frühere Namen sind eine Liste, kein zweites Geburtsname-Feld — und der Anlass „Personenstandsänderung" trägt eine eigene Schutz-Auflage

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** ARCHITEKTUR / DATENSCHUTZ
**Grundlage:** interner Auftrag „Frühere Namen" (11.08.2026),
Produktentscheidung aus der F4-Durchsicht („Name ist Name — durch Heirat oder Rückkehr zum
Namen vor der Ehe oder wodurch auch immer. Es gibt zu keinem Zeitpunkt zwei Nachnamen.").
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — Sektion `identitaet.fruehere-namen` (Liste
  `fruehere_namen`, Unterfelder `name`/`gefuehrt_bis`/`anlass`/`nachweis_ort`, Hinweis-
  Unterfeld `anlass_personenstand_hinweis`), `identitaet.geburtsname` (Hint korrigiert),
  `identitaet.heirat_namenswahl_frueher` und Situationsblatt `hauskauf.heirat_name_frueher`
  (Hints auf die Liste verwiesen).
- **Sprint-Commits:** `b5b2eec` (Zug 1), `788035f` (Zug 2), `e964567` (Zug 3).
- **ADR-Bezug:** U2-ADR-096/U2-ADR-128 (K3 — dritte Adressierungsebene für Listen-Unterfelder,
  hier zum ersten Mal auf ALLE Unterfelder einer Liste angewandt, nicht nur einzelne), U2-ADR-050
  (Bürgerdaten werden nie durch Migration gelöscht — Grund, warum Zug 3 nur Hinweise ändert),
  U2-ADR-104 (kein Komma-Split/Parsen von Bürgerfreitext).
**Status heute:** gilt — Beleg `tests/fruehere-namen-zug1.test.js#[Frühere Namen·Zug1] K3-Muster:
die Liste ist VOLLSTÄNDIG sensibel — jedes werttragende Unterfeld trägt sensibel:true`.

---

## Kontext — ein Feld, das jede Namensänderung tragen sollte

`identitaet.geburtsname` trug seinen Hint „z. B. Name vor der Heirat" seit der ersten Fassung
des Schemas. Das zweckentfremdete das Feld: eine Person, die zweimal geheiratet hat, hat einen
Geburtsnamen UND einen vorigen Ehenamen — für das zweite gab es keinen Ort. F4 Zug 4
(„der Name wohnt an einer Stelle") vereinheitlichte die Heirats-Namensform auf ein Katalogfeld
(`heirat_namenswahl`), stieß dabei aber auf denselben strukturellen Mangel von der anderen
Seite: Heirat ist nur EINER von mehreren Anlässen einer Namensänderung — Scheidung, behördliche
Namensänderung, Adoption, Einbürgerung, Personenstandsänderung tragen ebenso frühere Namen, die
im Erbfall und bei der Rente belegt werden müssen (Zeugnisse, Rentenkonto, Versicherungspolicen,
Grundbuch, alte Konten lauten auf den alten Namen).

## Entscheidung 1 — eine Liste, nicht ein zweites Skalarfeld

`identitaet.fruehere-namen` ist eine neue Sektion (zwischen `person` und `haustiere`) mit genau
einem Listenfeld `fruehere_namen`. Je Eintrag: **Name** (der geführte Name, Freitext) ·
**geführt bis** (Datum, optional) · **Anlass** (Auswahl: Heirat / Scheidung oder Rückkehr zum
Geburtsnamen / behördliche Namensänderung / Adoption / Einbürgerung / Personenstandsänderung /
sonstiges) · **Nachweis — Ablageort** (Freitext, dasselbe Muster wie die übrigen
Ablageort-Felder im Schema).

`geburtsname` bleibt unverändert bestehen — er steht so auf Urkunden, wird von Behörden
gesondert abgefragt und ist ein eigenes Datum, keine Zeile in einer Liste. Sein Hint verweist
jetzt auf die neue Liste statt sie vorwegzunehmen.

**Nur additiv, keine Migration.** Kein bestehender `geburtsname`-Wert wandert in die Liste —
wer dort bereits einen früheren Ehenamen eingetragen hat, ordnet ihn selbst zu; es wird nicht
geraten, ob ein Wert ein Geburtsname oder ein voriger Ehename ist (dieselbe Zurückhaltung wie
U2-ADR-104 bei jeder Freitext→Katalog-Migration).

## Entscheidung 2 — der Anlass „Personenstandsänderung" trägt eine eigene Schutz-Auflage

Recherche (§ 13 SBGG, Gesetz über die Selbstbestimmung in Bezug auf den Geschlechtseintrag,
amtlicher Wortlaut über gesetze-im-internet.de nachgeschlagen): **§ 13 Abs. 1 SBGG — das
Offenbarungsverbot** schützt „die bis zur Änderung eingetragene Geschlechtsangabe und die bis
zur Änderung eingetragenen Vornamen" einer Person, deren Geschlechtseintrag nach § 2 SBGG
geändert wurde, vor Offenbarung oder Ausforschung ohne ihre Zustimmung (Abs. 2–4 regeln
begrenzte Ausnahmen für Angehörige, amtliche Register und öffentliches Interesse).

**Der Wortlaut nennt VORNAMEN, keinen Nachnamen.** Eine gesetzliche Aussage zum früheren
NACHNAMEN lässt sich aus § 13 SBGG nicht belegen — das SBGG-Verfahren selbst ändert nur
Vornamen und Geschlechtseintrag, keinen Nachnamen. Diese Grenze wird im Hinweistext nicht
verwischt: er behauptet ausdrücklich nur, was die Vorschrift trägt (Vorname,
Geschlechtsangabe), nicht mehr.

**Die drei Auflagen gelten unabhängig vom Ergebnis der Recherche — sie folgen aus der Sache,
nicht nur aus dem Gesetz** (wörtlich aus dem Auftrag übernommen):

1. **Die Liste ist vollständig sensibel, nicht feldweise.** Alle vier werttragenden
   Unterfelder (`name`/`gefuehrt_bis`/`anlass`/`nachweis_ort`) tragen `sensibel: true` — dies
   ist die erste Anwendung des K3-Mechanismus (U2-ADR-096/-128, dritte Adressierungsebene für
   Listen-Unterfelder) auf JEDES Unterfeld einer Liste zugleich, nicht nur einzelne wie bisher
   (z. B. `konten.iban`). Verifiziert am echten Kern: der volle Klartext-Export
   (`vollExportJSON()`, Standard ohne Sensibel-Einschluss) reduziert jede Zeile auf ihre
   `id` — kein Namens-Wert übersteht die Redaktion.
2. **Kein automatischer Export.** Keine der sieben `EXPORT_FORMATE`-Mapping-Tabellen
   (VC-Identität/XÖV-Verwaltung/EDCI-Bildung/VC-Finanzen/VC-Sozialversicherung/XMeld-Identität/
   B16-Import) enthält einen Eintrag für `fruehere_namen` — geprüft gegen W-10, mit
   dauerhafter Regressions-Probe (`tests/fruehere-namen-zug2.test.js`, Rotmachbarkeit über eine
   gepflanzte Mapping-Zeile bewiesen).
3. **Ein eigener Hinweis am Anlass „Personenstandsänderung".** Erscheint nur bei dieser
   Auswahl (`sichtbarWenn`), zitiert § 13 SBGG mit Paragraph, sagt der Bürgerin ausdrücklich,
   dass sie diese Angabe nicht eintragen muss, um ihre Namenskette zu belegen — die übrigen
   Einträge der Liste reichen dafür oft aus.

## Entscheidung 3 — die Heirats-Rettungsfelder werden Verweis, kein zweiter Namens-Ort

`identitaet.heirat_namenswahl_frueher` (Migrationsfeld aus F4 Zug 4) und
`hauskauf.heirat_name_frueher` (Bestandswert eines entfallenen Situationsfelds) können jeweils
Alt-Freitext tragen, der einen tatsächlichen Namen enthalten kann. Beide Hints verweisen jetzt
ausdrücklich auf die neue Liste — **reine Hinweis-Änderung, keine Migration**: U2-ADR-050
(Bürgerdaten werden nie durch Migration gelöscht) verbietet ein automatisches Verschieben oder
Parsen dieser Freitextwerte; die Bürgerin trägt einen erkannten Namen selbst in die Liste ein,
wenn sie das möchte.

Geprüft (Regel 23): kein weiteres Anlass-Situationsblatt (Scheidung/Einbürgerung/Adoption)
existiert heute im Schema — die Auftrags-Formulierung „soweit es sie gibt" trifft auf keine
zusätzliche Stelle zu.

## Was NICHT Teil dieser Entscheidung ist

**Keine automatische Ableitung der Namenskette** aus Heirats- oder Scheidungsdaten — jeder
Eintrag ist eine bewusste Handlung der Bürgerin.

**Kein Schema-Bump, keine Migrationsstufe.** U2-ADR-100 §8 verlangt eine Migrationsstufe NUR
bei Feld-ENTFERNUNG — hier wird kein Feld entfernt, nur additiv ergänzt bzw. ein Hinweistext
geändert. `SCHEMA_VERSION_AKTUELL` bleibt bei 58.

**Keine rechtliche Beratung.** Der Hinweistext benennt die Vorschrift und ihre Reichweite, wie
sie recherchiert wurde — er ersetzt keine Rechtsberatung und trifft keine Aussage über den
Nachnamen, die das Gesetz selbst nicht trägt.

## Verifikation

Regel 18, drei Testdateien: `tests/fruehere-namen-zug1.test.js` (Schema, K3-Vollständigkeit,
echter Setzen-und-Wiederfinden-Weg, Hinweis-Sichtbarkeit), `tests/fruehere-namen-zug2.test.js`
(W-10-Dauerprobe über alle sieben Mapping-Tabellen mit Rotmachbarkeits-Positivkontrolle,
Gesetzeszitat-Probe), `tests/fruehere-namen-zug3.test.js` (Verweis-Hints, kein zusätzliches
Anlass-Situationsblatt, Idempotenz-Probe: ein Bestandswert übersteht zweimaliges
`depotNormalisieren` unverändert).

Browser-Abnahme, echter Klickweg (`tests/e2e/helpers.js`, kein Vorschau-Modus): zwei Einträge
über den echten Listen-Modal-Weg (`data-eintrag-hinzufuegen="fruehere_namen"` →
`#modal-inhalt [data-edit=…]` → `#m-ok`) angelegt, einer mit Nachweis-Ablageort — Speichern
(`depotSerialisieren`) + frisches Laden (`depotLaden`) liefert beide Einträge unverändert
zurück. Export erzeugt (`vollExportJSON()`) — die Namens-Werte stehen nicht darin, nur die
redaktierte Zeilenstruktur. Volle Suite plus Konformität gegen Zug 0 — Zahlen im Bericht.
