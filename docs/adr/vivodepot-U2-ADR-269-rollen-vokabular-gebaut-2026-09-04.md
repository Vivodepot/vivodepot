# U2-ADR-269 · Das Rollen-Vokabular gebaut — vier Rollen, erste Listenzeilen-Form

**Datum:** 04.09.2026
**Status:** gebaut, betroffene Suiten grün
**Status heute:** gilt
**Entscheidung:** Auftrag A1;
Verzicht auf zwei der ursprünglich sechs vorgeschlagenen Rollen vermittelt
**Bezug:** Rollen-Vokabular-Erhebung vor dem Einfrieren (04.09.2026, interner Bericht, nicht Teil
des Repos) · `BEREICH_ROLLEN_ERLAUBT`/`bereichRolle`/`bereichFeldHatRolle` (Nachtrag „Vier
Häufungen", 17.08.2026, das strukturelle Vorbild) · `tests/rollen-vokabular-u2-adr-269.test.js`

---

## 1 · Kontext

Der Kern kennt seine Inhalte auf zwei Arten: wörtlich (`sektorId === 'identitaet'`, hunderte
Stellen) oder über Rollen (`rollen: { ankerNameFelder: [...], familienstandFeld: '...' }`, seit
17.08.2026 an drei Bereichen). Eine geschlossene Rollen-Liste sollte vor dem Einfrieren des
Gerüsts vollständig sein — was heute fehlt, kann später nie mehr ergänzt werden, ohne die
Einbahnstraße selbst zu öffnen. Eine eigene Erhebung (derselbe Tag, dieselbe Session) maß den
Bestand und schlug sechs neue Rollen vor. Entschieden wurde zunächst: „A1: ok" — alle sechs
sollten gebaut werden, einschließlich der neu vorgeschlagenen Listenzeilen-Form. Noch am selben
Abend kam zusätzlich A4 hinzu (Rechtsformen-Öffnung, s. §4) — und im Licht dieser zweiten
Entscheidung wurden zwei der sechs Rollen vor der Landung wieder verworfen, nicht gebaut (s. §2b).

---

## 2 · Entscheidung

**Drei Rollen derselben Form wie die bestehenden drei** (String oder String-Array, zeigt auf ein
Feld des Bereichs selbst), in `BEREICH_ROLLEN_ERLAUBT` aufgenommen und dem Bereich `identitaet`
zugewiesen — allesamt Kontaktkanäle, rechtsform-neutral:

| Rolle | Bereich | Wert |
|---|---|---|
| `telefonFeld` | identitaet | `'telefon'` |
| `emailFeld` | identitaet | `'email'` |
| `adresseFelder` | identitaet | `['strasse', 'plz_ort']` |

**Eine vierte Rolle einer neuen Form** — der **Listenzeilen-Form**: `instrumentTypUnterfeld`
(Bereich vorsorge, Wert `'typ'`) zeigt nicht auf ein Feld des Bereichs, sondern auf ein Unterfeld
**innerhalb** der Zeilen einer bereits über eine andere Rolle (`instrumenteListe` → `'vorsorge_
instrumente'`) benannten Liste. Der bestehende `bereichRolle(sektorId, rolle)` löst sie unverändert
auf — er ist bereits generisch genug, jeden Rollen-Schlüssel zu lesen, unabhängig davon, worauf der
Wert zeigt. Was fehlte, war ein Prüf-Helfer für den Konsum: **`bereichListenUnterfeldHatRolle
(sektorId, unterfeldId, rolle)`**, wörtlicher Zwilling von `bereichFeldHatRolle`, bewusst als
eigene Funktion statt Wiederverwendung — Bereichs-Feld-Ids und Listenzeilen-Unterfeld-Ids sind
verschiedene Namensräume, auch wenn sie sich heute nirgends überschneiden.

**Die geschlossene Liste bleibt geschlossen.** Das ist die nicht verhandelbare Auflage des
Auftrags: eine neue Rolle ist eine Code-Änderung im Kern, kein Feld, das ein Modul mitbringt. Ein
erfundener Rollen-Name wird weiterhin namentlich verworfen (`bereichRollenPruefen`), unverändert
— Rot-Beweis in der neuen Testdatei.

---

## 2b · Verzicht auf zwei Rollen — `geburtsdatumFeld`, `ehepartnerFeld`

Die Erhebung hatte sechs Rollen vorgeschlagen. Zwei davon — `geburtsdatumFeld` (identitaet) und
`ehepartnerFeld` (meine-menschen) — wurden **nicht aufgenommen**, kein Umbenennen, kein Posten
mit Frist, sondern echter Verzicht.

**Warum:** Dieser Zug friert das Gerüst ein. Es soll neben natürlichen Personen
auch Institutionen, Genossenschaften, Vereine — jede künftige Rechtsform, an die heute niemand
denkt — tragen (A4, s. §4). Beide Rollen setzen stillschweigend eine natürliche Person voraus: ein
Verein hat ein Gründungs-, kein Geburtsdatum; eine GbR hat Träger, keinen Ehepartner. In ein
Gerüst, das jede Rechtsform tragen soll, gehören sie in dieser Form nicht.

**Warum jetzt der billigste Moment war:** Beide Rollen hatten null Leser — kein Aufrufer im Kern
fragte sie ab, es geht kein Verhalten verloren. Und sie existieren in keinem Commit der Historie
(`git log --all -S`, null Treffer) — sie wären erst durch diesen Zweig entstanden. Kein Modul
könnte sich je an sie gebunden haben. Der Gegensatz aus der Erhebung selbst trägt hier in beide
Richtungen: eine neue Rolle ist billig nachzutragen, eine falsch geschnittene ist teuer, weil
Module sich daran binden und ihr Entfernen sie bricht — genau deshalb wurde hier verzichtet statt
geraten, bevor irgendetwas daran gebunden werden konnte.

**Was das nicht ist:** kein Plan, sie unter neuem Namen sofort nachzuziehen. Ob und wie eine
rechtsform-neutrale Entsprechung (ein Entstehungsdatum? getrennte, rechtsform-abhängige Rollen?)
aussieht, ist eine A4-Entscheidung mit echtem Rechtsgehalt — Familienstand und Ehepartner sind
zivilrechtlich präzise Begriffe, keine austauschbaren Etiketten. Nachtragen bleibt möglich und ist
der vorgesehene Weg, sobald eine echte Kern-Tätigkeit die Rolle wirklich braucht.

**Was unverändert bleibt:** die vorbestehende Rolle `familienstandFeld` (identitaet, seit
17.08.2026, nicht Teil dieses Baus) trägt exakt dieselbe natürliche-Person-Annahme wie das
verworfene `ehepartnerFeld` — sie wurde in diesem Zug nicht angefasst und bleibt als offener
Befund stehen, nicht als Auftrag dieses ADRs.

---

## 3 · Ein Aufrufer umgestellt — bit-identisch, nicht als Umstellungskampagne

Die Erhebung selbst hatte die Umstellung der bestehenden Aufrufstellen ausdrücklich **außerhalb**
der Einbahnstraße verortet — Innenleben, jederzeit nachholbar, nicht Gegenstand des Einfrierens.
Dieser Bau bleibt bei dieser Abgrenzung: **kein** Umstellungs-Feldzug über die gemessenen ~40
Bypässe um `vorsorge_instrumente`, **ein** demonstrativer Aufrufer als Funktionsbeleg der neuen
Listenzeilen-Form — `_instrumentTypLabel()`, die bislang `f.id === 'typ'` literal prüfte, prüft
jetzt `bereichListenUnterfeldHatRolle('vorsorge', f.id, 'instrumentTypUnterfeld')`. Bit-identisch,
weil die Rolle exakt auf `'typ'` zeigt — belegt durch eine eigene Probe, die reale Instrument-Typen
(Vorsorgevollmacht, Patientenverfügung, Testament, Betreuungsverfügung, Sorgerechtsverfügung)
weiterhin auf einen echten Options-Treffer statt auf den blossen Rückfall auf den rohen Code
auflöst — sowie ein Quelltext-Rot-Beweis, dass die Funktion `'typ'` nicht mehr literal nennt.

---

## 4 · Geprüft — Rechtsformen (A4)

Im Zuge dieses Auftrags wurde zusätzlich A4 entschieden: künftige Rechtsformen (Verein,
Genossenschaft, GbR, und was heute nicht bekannt ist) sollen andocken können. Klargestellt wurde die
Unterscheidung, die diesen Bau betrifft: **Rollen sagen, was ein Feld TUT — geschlossen.
Rechtsformen sind INHALT, welche Felder eine Rechtsform mitbringt — offen.** Eine unbekannte
Rechtsform dockt an, indem sie Felder mitbringt, die bekannte Rollen tragen.

Auf dieser Grundlage wurde jede der sechs ursprünglich vorgeschlagenen Rollen geprüft, ob sie eine
Rechtsform-Annahme mitschleppt, die nur für eine natürliche Person gilt:

- **`geburtsdatumFeld`** und **`ehepartnerFeld`** sind nach Name und Bedeutung auf eine natürliche
  Person zugeschnitten. **Ergebnis: verworfen, s. §2b** — nicht gedehnt, nicht umbenannt.
- **`telefonFeld`**, **`emailFeld`**, **`adresseFelder`** sind Kontaktangaben — rechtsform-neutral,
  eine Organisation hat ebenso eine Telefonnummer, eine E-Mail-Adresse, eine Anschrift. Gebaut.
- **`instrumentTypUnterfeld`** ist eine strukturelle Rolle (ein Diskriminanten-Unterfeld einer
  Liste) — rechtsform-neutral als Mechanismus; nur die heutigen Katalog-*Werte* (Patientenverfügung
  usw.) sind natürliche-Person-spezifisch, und die stehen nicht in der Rolle, sondern in den
  `optionen` des Feldes selbst. Gebaut.

---

## 5 · Bewusst nicht Teil dieses Pakets

Kein bestehender Aufrufer der drei `identitaet`-Kontaktrollen (FHIR-IPS, SD-JWT-VC, vCard,
XML-Import, B16-Migration) wurde umgestellt — dieselbe Zurückhaltung wie bei jedem vorherigen
Einlass-Register-Bau: Die Registry-/Rollen-Mechanik ist bewiesen, die Umstellung realer, aus- und
eingehender Export-/Import-Pfade ist ein eigener, größerer Zug mit höherem Regressionsrisiko
(externe Interop-Formate) und war nie Gegenstand dieses Auftrags.

---

## 6 · Rot-Beweis

Testdatei `tests/rollen-vokabular-u2-adr-269.test.js` (9 Proben): alle vier Rollen in der
geschlossenen Liste, jede einzeln auflösbar (kein Merkmal ohne Träger wirkt), `identitaet`/
`vorsorge` lösen ihre neuen Rollen korrekt auf (mit Gegenproben auf falsche Felder), die neue
Listenzeilen-Form (`bereichListenUnterfeldHatRolle`) prüft korrekt hinein (inkl. Gegenprobe auf
Bereiche ohne die Rolle, wirft nie), der eine umgestellte Aufrufer bleibt bit-identisch (echte
Instrument-Typen weiterhin real aufgelöst, unbekannter Typ weiterhin Rückfall auf den rohen Code)
mit Quelltext-Beleg, dass `'typ'` nicht mehr literal steht, und der Kern-Rot-Beweis des Auftrags:
eine erfundene Rolle wird weiterhin benannt verworfen, kein Modul kann sie sich ausdenken.

Betroffene Bestandssuiten (`bereich-stellen-register`, `bereich-merkmale-vier-haeufungen`,
`ereignis-achse-zug3`, `namenskomposition-reihenfolge`, `provenienz-name-bruecke`) gegengeprüft,
unverändert grün.

---

## 7 · Befund zur Bauform — dritter SyntaxError an derselben Stelle

Zwei Rebases dieses Zweigs (auf `39372460`, dann auf `ba826350`) trafen je einen Konflikt in
`vivodepot.html` auf exakt derselben Zeile: der `SCHALEN_STAND`-Zeilenkommentar, inzwischen über
21.000 Zeichen lang, gewachsen aus jahrelang angehängter Rebase-Historie. Beide Male ließ die
automatische Text-Verschmelzung beim Zusammenfügen von HEAD-Seite und eigener Seite einen rohen
Zeilenumbruch mitten in der Kommentarzeile stehen — ein `//`-Kommentar endet an jedem Zeilenumbruch,
die Folgeprosa wäre als Code gelaufen. Beide Male hat `ladeKern()` (einzeln, vor dem Commit
gefahren) das mit einem klaren `SyntaxError` gefangen, nicht der `pre-commit`-Hook, der erst die
volle Suite fährt.

**Das ist nicht der erste Fall.** Die Kommentarkette selbst dokumentiert denselben Fehler bereits
beim Übergang v537→v538: „der additive Merge-Splice ließ den öffnenden Blockkommentar mit dem
SCHALEN_STAND-Zeilenkommentar verschmelzen, die Kommentarprosa lief als Code, ladeKern() brach mit
SyntaxError." **Dreimal derselbe Fehler, an derselben Zeile, aus derselben Ursache** — kein Zufall
mehr, sondern eine Eigenschaft der Bauform: eine einzelne, monoton wachsende Kommentarzeile ist
beim automatischen Zusammenführen strukturell zerbrechlich. Kein Vorschlag hier, wie das behoben
werden sollte — nur der gemessene Befund, festgehalten, statt beim dritten Mal für Zufall gehalten
zu werden.

---

*Vivodepot GmbH · Berlin · 04.09.2026*
