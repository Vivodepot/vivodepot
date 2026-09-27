# U2-ADR-088 · Selbstbezug-Ausschluss — Präzisierung zu ADR-021

**Datum:** 15.07.2026
**Status:** Angenommen · gebaut 15.07.2026 (Suite grün, Produktfreigabe)
**Status heute:** gilt — `personenVorschlag(selbstbezug)` (`vivodepot.html:16973`) filtert weiterhin
`sitzungsAkteur.personId` nach dem `selbstbezug`-Flag, beide Aufrufstellen bestätigt.
**Bezug:** U2-ADR-021 (Personen-Vereinheitlichung, rollenloses Register) · Teil D4 der eigenen
Umsetzung · eigene Erhebung Selbstbezug-Felder (15.07.2026)

---

## 1 · Die bisherige Entscheidung (ADR-021)

„Rolle am Bezug, nicht an der Person": das Personen-Register ist rollenlos — eine Person
trägt keine feste Rolle, die Rolle steckt im Feld, das sie referenziert. Daraus folgte bisher
eine zweite, ungeschriebene Eigenschaft: **jede** Person im Register, einschließlich der
Depot-Inhaberin selbst, erscheint als Auswahl in **jedem** Person-Ref-Feld. Ein bestehender
Test (`a1-rollenloses-register.test.js`) hielt das ausdrücklich fest: „Sitzungs-Akteur ist
als Person wählbar."

## 2 · Der Fund

D4 (Teil der eigenen Umsetzung) erhob systematisch alle 27 Verweis-Felder der App gegen die Frage „Kann
die Depot-Inhaberin hier legitim die Antwort sein?" (eigene Erhebung Selbstbezug, 15.07.2026).
Ergebnis: **kein einziges** Feld erlaubt das. Ärzte, Bevollmächtigte, Vermieter, Erben,
Notfallkontakte — jeder Verweis zeigt strukturell auf eine *andere* Person (Gegenpartei).
Die Inhaberin als Auswahloption in diesen Feldern ist kein neutrales Nebenprodukt der
Rollenlosigkeit, sondern eine echte Fehlerquelle: eine Bürgerin könnte sich versehentlich
selbst als ihre eigene Vermieterin oder Bevollmächtigte eintragen.

## 3 · Die Präzisierung

**Kein Widerspruch zu ADR-021 — eine Einschränkung einer Eigenschaft, die ADR-021 nie
bewusst getroffen hat.** Das Register bleibt vollständig rollenlos (jede Person gleich,
keine Rollen-Speicherung an der Person). Was sich ändert: die **Vorschlagsliste** eines
Verweis-Felds schließt die Inhaberin standardmäßig aus — nicht das Register.

- Alt: Inhaberin erscheint überall als Auswahl (ADR-021, ungeprüfte Nebenfolge).
- Neu: Inhaberin erscheint in der Vorschlagsliste eines Feldes NUR, wenn das Feld
  ausdrücklich `selbstbezug: true` trägt (Default `false` an jedem heutigen Feld — heute
  nirgends gesetzt, da kein Feld legitimen Selbstbezug erlaubt).
- Das Register selbst (`data.menschen[]`, „Meine Menschen"-Ansicht, vCard-Gesamtexport)
  bleibt unverändert vollständig — die Inhaberin steht weiter drin, für Zwecke, die nicht
  über die Verweis-Vorschlagsliste laufen.

**Warum jetzt als eigene ADR und nicht nur als Test-Kommentar:** Ein Test-Kommentar ist keine
auffindbare Architektur-Entscheidung. Wenn in einigen Monaten jemand fragt, warum die
Inhaberin im Register steht, aber in keinem Verweis-Feld vorgeschlagen wird, ist dies die
Stelle, die das beantwortet — nicht der Git-Blame eines Testfiles.

## 4 · Der Mechanismus (technisch)

`personenVorschlag(selbstbezug)` filtert `sitzungsAkteur.personId` heraus, außer der
Aufrufer übergibt `selbstbezug: true` (aus `feld.selbstbezug`). Der Filter sitzt an der
Aufrufstelle (Ref-Picker-Render, refMehrfach-Live-Vorschlag) — nicht im Register selbst, nicht
in `personHinzufuegen`/`personAktualisieren`. Das Flag ist eine reine Feld-Eigenschaft, wie
`rolle` oder `art` bereits — es beschreibt eine Erwartung an den Verweis, keine Eigenschaft
der Person.

## 5 · Offen — bewusst nicht Teil dieser Entscheidung

Kein Feld trägt heute `selbstbezug: true`. Es gibt keinen Eigentümer- (Wohnen), Halter-
(Mobilität) oder Kontoinhaber-Verweis (Finanzen) — diese Konzepte fehlen strukturell, nicht
nur am Flag. Ob und wo sie entstehen sollen (und ob der **geteilte Fall** — gemeinsames
Konto, Auto auf den Partner — ein eigenes Datenmodell braucht), ist eine eigene, noch nicht
begonnene Erhebung (Offener Punkt 4, interne Übergabenotiz vom 15.07.2026).
Diese ADR liefert nur das Werkzeug (`selbstbezug`-Flag), nicht die Entscheidung, wo es greift.

## 6 · Konsequenzen

- `vivodepot.html`: `personenVorschlag()` Signaturänderung (`selbstbezug`-Parameter statt
  totem `rolle`-Parameter), zwei Aufrufstellen angepasst.
- `tests/a1-rollenloses-register.test.js`: bestehender Test umgeschrieben (nicht gelöscht),
  dokumentiert die Umkehr mit Datum. Zwei neue Tests (Mechanik, Abgrenzung Register vs.
  Vorschlagsliste).
- Kein Schema-Bump — reine Verweis-Auflösungslogik, `data` unberührt.
- Krypto unberührt.

---

*Vivodepot GmbH · Berlin · 15.07.2026*
