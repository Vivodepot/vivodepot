# U2-ADR-158: Eine Person gilt als verstorben — und das löst das Ereignis „Tod" aus

**Status:** Akzeptiert
**Datum:** 21.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, VORSORGE
**Grundlage:** Produktentscheidung vom 21.08.2026
(internes Entscheidungsdokument vom 21.08.2026), Laufzettel
„der entschiedene Rest", Posten 1.
- **Code-Stelle:** `vivodepot.html` — `personAktualisieren` (`verstorben`),
  `MENSCHEN_REGISTER_FELD.unterFelder` (das Häkchen), `ereignisMarkieren`,
  `EREIGNIS_ACHSE_FELDER`, `strings:kontaktVerstorbenLabel/-Hint`.
- **ADR-Bezug:** U2-ADR-022 (ein Personenregister), U2-ADR-138 (Eintrag-Bezug über `zeilenId`),
  C15/A247 (die Ereignis-Achse).
- **Status heute:** gilt — gebaut und belegt in `tests/todesfall-ausloeser.test.js`
  (8 Proben, drei Mutations-Rot-Belege).

---

## Kontext

**Die Achse stand, die Hand fehlte.** `EREIGNIS_ACHSE_FELDER` kennt seit dem 15.08. neun
Unterfelder, die auf `tod` reagieren — Bevollmächtigter, Betreuungspersonen, Sorgerechts- und
KI-Verfügung, Betreuerbestellung. `strings:ereignisAnlassTod.text` lag fertig und **ungenutzt**
im Textsatz: *„Eine hier eingetragene Person gilt als verstorben."*

**Keine dieser Marken konnte feuern**, weil es keinen Weg gab, einen Tod einzutragen.

**Der stärkste Sachgrund:** Stirbt der Bevollmächtigte, ist die
Vollmacht gegenstandslos. **Das Produkt sagt das an anderer Stelle selbst — und meldete sich
nicht.**

## Entscheidung

**Ein Mensch im Personenregister kann als verstorben gekennzeichnet werden. Die Kennzeichnung
löst das Ereignis „Tod" aus.**

**Als Häkchen an der Person**, in derselben Form wie `nichtMitgeben` — eine Eigenschaft des
Eintrags, kein Datum und kein eigener Dialog. **Der Hinweis sagt die Folge, bevor das Häkchen
gesetzt wird**, nicht danach.

## Die Auflage, und sie ist die wichtigste

**Der Tod einer DRITTEN Person ist strikt vom Tod der Inhaberin getrennt.** Für letzteren gibt es
die Lebenslage Todesfall und die Depot-Übernahme; dieser Weg fasst sie nicht an.

**Der Schutz sitzt im Datenweg, nicht in der Oberfläche:** `personAktualisieren` wirft, wenn die
Kennzeichnung der Inhaberin gälte — mit einem Satz, der auf die Lebenslage verweist. Eigene Probe.

## Das Zurücknehmen löscht die Anlässe nicht

**Ein Anlass ist die Aufzeichnung eines Ereignisses, keine Anzeige eines Zustands.** Wird das
Häkchen zurückgenommen, verschwindet die Kennzeichnung — die bereits eingetragenen Anlässe
bleiben stehen und werden dort geschlossen, wo sie stehen.

**Der Grund:** Sie mitzulöschen legte eine Prüfung still, die die Bürgerin vielleicht schon
begonnen hat. Eine falsch gesetzte Kennzeichnung ist ein kleiner Fehler; eine still
verschwundene Prüfaufforderung an einer gegenstandslosen Vollmacht ist ein großer.

## Was NICHT in dieser ADR steht

**Der Wortlaut und der Zeitpunkt der Meldung.** Der Anlass erscheint unmittelbar, nachdem die
Bürgerin einen Tod eingetragen hat. **Ob das trägt, ist nicht am Bau zu entscheiden** — es ist
ein benannter Beobachtungspunkt für die Testerrunde. Der vorhandene Text bleibt bis dahin
unverändert.

**Die Öffnung der Achse für Module.** Sie ist eine Entscheidungsvorlage, kein Bau.

## Der Befund aus Zug 0 — gemessen, und er lautet „gar nichts, und zwar still"

**Trägt die Achse ein angedocktes Feld? Nein — sie ist eine im Kern eingefrorene Liste.**

**Was mit einem Modul-Feld vom Typ Personen-Verweis geschieht, ist gemessen:** Es wird **nicht
verworfen und nicht gemeldet, sondern still übergangen.** Das eingebaute Feld reagiert, das
angedockte bleibt unberührt, und nirgends steht ein Satz darüber.

**Aus diesem Befund folgt kein Bau** (so beauftragt) — er trägt die Vorlage zur Öffnung der
Achse. Er ist mit einer eigenen Probe festgehalten, damit er nicht als gelöst gilt.

---

*Vivodepot GmbH · 21.08.2026*
