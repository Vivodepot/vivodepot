# U2-ADR-128: Sensibel-Mechanismus — dritte Adressierungsebene und Situations-Schema-Flag

**Status:** Akzeptiert
**Datum:** 09.08.2026
**Kategorie:** DATENSCHUTZ, EXPORT, ARCHITEKTUR
**Grundlage:** interner Auftrag „Sensibel-Architektur" (09.08.2026), gestützt auf dieselbe
Erhebung der Wächter-Grundlagen vom 08.08.2026, Liste 1 („Zwei Dinge, die vor dem Setzen der
Flags entschieden sein müssen").
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `unterfeldIstSensibel` (neu, bei `feldIstSensibel`),
  `listenEintragZusammenfassung`/`feldWertText`/`_wertTextMenschlich`/
  `_verweisListenEintragZusammenfassung` (optionaler `opt`-Parameter), `vollExportJSON`,
  `docxBereichModell`, `_bereichSektionenModell`, `situationModell`, `akutZeileHTML`,
  `angehoerigenCacheModell` (alle verdrahtet), `tools/w3-schema-sensibel-pruefen.js`
  (`traegtSensibel` löst `sit:`-Einträge jetzt über `SITUATION_BY_ID` auf).
- **Sprint-Commits:** `6679588` (Zug 1), `3925179` (Zug 2).
- **ADR-Bezug:** dieser ADR; U2-ADR-126 (Schema-Default, dessen Liste 1 hier erst
  vollständig wirksam wird); U2-ADR-096 (Listen-Unterfeld-Selektor, hier wiederverwendet).
**Status heute:** gilt — Beleg `tests/sensibel-listen-unterfeld.test.js#[Sensibel-U1·Regel 18] echter Kern, End-zu-Ende: vollExportJSON enthält die Notiz vor der NUTZER-Markierung und nicht mehr danach`.

---

## Kontext

U2-ADR-126 setzte `sensibel: true` an 97 Feldebene-Feldern aus Liste 1. Zwei Klassen aus
derselben Liste blieben dabei ausdrücklich außen vor, weil das Flag für sie **wirkungslos**
war:

1. **34 Listen-Unterfelder** (z. B. `konten.iban`, der gesamte `vorsorge_instrumente`-Satz):
   `feldSensibelMarkiert`/`feldIstSensibel` arbeiteten auf `sektorId × feldId` — eine
   Listenzeile hatte keinen eigenen Schlüsselraum. Ohne Erweiterung hätte nur das
   Zurückhalten des GANZEN Trägerfelds funktioniert; bei `vorsorge_instrumente` hieße das:
   die komplette Vorsorge fiele aus jedem Export.
2. **35 Situationsfelder** (`sit:<id>`-Namensraum, z. B. `erb_notar`): kein Export-Weg rief
   `feldIstSensibel` für sie auf. Ein Nutzer-Sensibel-Knopf am `sit:`-Feld hätte ohnehin
   ins Leere geschrieben (Kommentar bei `sensibelKnopfHTML`, A64) — aber auch das
   SCHEMA-Flag wurde nirgends gelesen.

## Entscheidung

**Zug 1 — dritte Adressierungsebene für Listen-Unterfelder.** Wiederverwendet die
bestehende Selektor-Schreibweise `liste:<listeId>:<typwert>:<unterfeldId>` (U2-ADR-096),
statt eine zweite zu erfinden: `unterfeldIstSensibel(sektorId, listeId, eintrag,
unterfeldDef)` baut daraus einen Feld-Stellvertreter und reicht ihn an das unveränderte
`feldIstSensibel` weiter. `typWert` kommt aus `eintrag.typ`, wenn die Zeile eine trägt (nur
`vorsorge_instrumente`); sonst Platzhalter `*` (die meisten Listen — `konten`, `haustiere`,
`fahrzeuge` — haben keine Diskriminante, ihre `unterFelder` sind EIN geteiltes Set über
alle Zeilen).

Die drei geteilten Wertformatierer (`listenEintragZusammenfassung`, `feldWertText`,
`_wertTextMenschlich`) sowie der docx-Sonderpfad für Listen mit `verweisZweck`-Unterfeldern
(`_verweisListenEintragZusammenfassung`, live gefunden — hätte die Prüfung sonst umgangen)
bekommen einen **optionalen** dritten Parameter (`opt.sektorId`/`opt.inklSensibel`). Ohne
`opt` bleibt jeder bestehende Aufrufer unverändert (Bildschirm-Lese-/Bearbeiten-Sicht,
Lösch-Rückfrage zeigen der Bürgerin ihre eigenen Daten immer vollständig) — nur die
identifizierten Export-Wege (`vollExportJSON`, `docxBereichModell`,
`_bereichSektionenModell`, damit Gesamt- und Bereichs-PDF) reichen ihn.

**Zug 2 — Situationsblätter und Angehörigen-Modus lesen das Schema-Flag, mit einer
bewussten Grenze.** `situationModell`s `eintrag.quelle`-Zweig (ein echtes Sektorfeld in ein
Situationsblatt gezogen) prüft jetzt `feldIstSensibel` wie jeder andere Export-Weg.

Im Angehörigen-Modus (`akutZeileHTML`, `angehoerigenCacheModell`) gilt das **nur für
situations-eigene Felder** (`sit:`-Quelle). Sektor-Felder bleiben dort bewusst
UNGEFILTERT: eine echte UI-Probe (`tests/mit-modul/reisen-3-4-registry.test.js`) belegt,
dass „Blutgruppe" (schema-sensibel) auf dem Krankenhaus-Blatt stehen MUSS — die Aufnahme
eines Sektorfelds in die `_ANG_SITUATIONEN`-Allowlist ist dort selbst die
Vertrauensgrenze, nicht das allgemeine Flag. Ein breiterer Filter brach diese Probe live
— eingegrenzt statt übergangen.

`setSituation` (im Cache) liest `feldIstSensibel` mit einem `sit:`-Namensraum als
`sektorId` — eine bewusste, im Wächter selbst dokumentierte Ausnahme
(`tests/fix-a64-sensibel-knopf.test.js`, `A64_BEWUSSTE_SIT_AUFRUFE`), die den dortigen
Grundsatz „jeder Sensibel-Verbraucher nimmt eine echte Bereichs-id" NICHT aufweicht,
sondern für genau diesen einen Fall wissentlich erweitert.

**Der Nutzer-Knopf am `sit:`-Feld bleibt weiterhin wirkungslos** — das
`SEKTOR_BY_ID[sektorId]`-Gate in `sensibelKnopfHTML` (A64) ist unverändert. Nur das
ohnehin gültige SCHEMA-Flag wird jetzt gelesen; eine künftige UI zum Setzen einer
Nutzer-Markierung an Situationsfeldern ist eine eigene, hier nicht getroffene Entscheidung.

## Konsequenzen

`tools/w3-schema-sensibel-pruefen.js`s `traegtSensibel` löst `sit:`-Einträge jetzt über
`SITUATION_BY_ID` auf, statt sie kategorisch als nicht prüfbar zu zählen — der Kommentar
„Situationsfelder haben heute KEINEN sensibel-Mechanismus" stimmte vor diesem ADR, nicht
mehr danach. Mit U2-ADR-126s Feldern plus dieser Erweiterung stehen nach Zug 3 (Setzen der
verbleibenden Flags) 173 von 173 gelisteten Feldern auf `sensibel: true`, 0 nicht prüfbar.

Nicht in diesem ADR untersucht: `vivodepot-lesen.html` trägt eigene Kopien der drei
Wertformatierer (kein Teil des VdCrypto-Pins) — ob dieselbe Lücke dort erreichbar ist, ist
offen.

```konformitaet
aussage:  Listen-Unterfelder und Situationsfelder mit `sensibel: true` werden in
          vollExportJSON, docxBereichModell, dem Gesamt-/Bereichs-PDF, dem
          Situationsblatt-PDF und im Angehörigen-Modus (nur situations-eigene Felder)
          zurückgehalten wie Sektorfelder.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sensibel-listen-unterfeld.test.js#[Sensibel-U1·Regel 18] echter Kern, End-zu-Ende: vollExportJSON enthält die Notiz vor der NUTZER-Markierung und nicht mehr danach
```
