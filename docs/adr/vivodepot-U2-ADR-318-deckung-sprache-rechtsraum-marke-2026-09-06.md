# U2-ADR-318: Die Deckung der drei übrigen Achsen — Sprache, Rechtsraum, Marke

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `tests/erzeuger-deckung-sprache-rechtsraum-marke.test.js`

- **Status heute:** gilt — jeder Verweis aus `vd-de-sprache.json`, `vd-de-rechtsraum.json`
  und `vd-branding.json` ist gegen den lebenden Kern geprüft, mit Rot-Beweisen für jede
  gefundene Klasse. **Zwei bereits bestehende, benannte Lücken** — kein neuer Bruch.

---

## Der Auftrag, und was er fortsetzt

U2-ADR-317 hat die Struktur-Achse des Bündel-Erzeugers gemessen: acht `WIZARDS`-Katalog­verweise
waren gedeckt, hundertneun sind es. Von den **vier Achsen** (U2-ADR-291: Struktur ∪ Sprache ∪
Recht ∪ Marke = nativer Bestand) war damit **eine** beantwortet. Dieser ADR beantwortet die
übrigen drei — mit derselben Frage: **welche Verweise löst die Achse auf, und was passiert, wenn
einer ins Leere zeigt?**

**Vier Dateien, ein Erzeuger.** `tools/buergermodul-schnitt.js` schneidet den nativen Bestand in
EINEM Lauf in `tools/buergermodul/{vd-privat,vd-de-sprache,vd-de-rechtsraum,vd-branding}.json`.
Anders als bei der Struktur-Achse trägt keine der drei hier gemessenen Dateien eine im Kern
**eingebettete** Zweitfassung (kein `BUERGERMODUL_BUENDEL`-Äquivalent) — geprüft wird darum gegen
den **lebenden Kern direkt**, nicht gegen einen zweiten Träger.

## Die drei Achsen — je ein eigener, echter Konsument

Anders als vermutet gibt es **keinen** gemeinsamen `buergermodulSpracheErsetzen`/
`buergermodulRechtsraumErsetzen`/`buergermodulMarkeErsetzen`. Jede Achse hängt an einem eigenen,
bereits bestehenden Mechanismus:

| Achse | Konsument | Kennungsform |
|---|---|---|
| Sprache | `textsatzModulPruefen` → `_textsatzTexteUebernehmen` (EINLASS_REGISTER, `typ:'textsatz'`) | `<sektorId>.<feldId>.<rolle>`, `<sektorId>#<sektionId>.<rolle>`, `feld.<feldId>.vorschlaege`, `dokument.<typ>.<art>` |
| Rechtsraum | `rechtsraumFristUeberlagerungSetzen` + `_rechtsraumFristRegel`/`_rechtsraumGueltigkeitVorschlag` (U2-ADR-307/314) | `<sektorId>.<feldId>` / `situation:<sitId>.<feldId>` |
| Marke | (kein Konsument — reine Namensangabe, s. u.) | — |

**`vd-de-sprache.json` selbst wird von `textsatzModulPruefen` heute abgelehnt** (`sprache:'de'`
ist reserviert, `TEXTSATZ_SPRACHE_EINGEBAUT`) — die Datei ist die Referenzform für ein künftiges
Fremdsprachen-Modul, kein direkt andockbares. Die **Kennungs-Auflösung** in
`_textsatzTexteUebernehmen` läuft aber VOR dieser Sprachprüfung und ist von ihr unabhängig — genau
sie wird hier gemessen, mit einer umbenannten Sprachkennung, die die Reserviert-Prüfung umgeht,
ohne die gemessene Logik zu berühren.

## Was gefunden wurde

### Sprache: 1249 von 1250 lösen auf — ein bereits bestehender Fund

`feld.art.vorschlaege` wird vom echten Einlassweg **verworfen** (`grund: 'unbekannt'`), alle
übrigen 1249 `texte`-Kennungen werden angenommen. Die `vorschlaege`-Kennungsform ist bewusst
**ohne** `sektorId` gebaut — der Kommentar an `_vorschlaegeTextsatz` begründet das damit, dass
„Feld-IDs im ganzen Katalog eindeutig sind". **`art` ist aber genau eine der 17 katalogweit
mehrfach vergebenen UnterFeld-IDs** (derselbe Befund, der im Kommentar an
`RECHTSRAUM_FRIST_UEBERLAGERUNG` bereits steht — dort als Grund, warum die FELD-Form allein für
Rechtsraum-Kennungen ausfällt). Die Kennungsform trifft für dieses eine Feld ihre eigene Prämisse
nicht mehr.

**Wirkung, wäre die Datei je gedockt:** ein Vorschlagstext für ein `art`-Feld bliebe leer, ohne
Meldung — die leiseste der drei Klassen, „liefert weniger". Heute ohne Auswirkung: die Datei wird
gar nicht gedockt (s. o.).

**Zwei Symptome, eine Ursache — nicht zweimal derselbe Fund.** `tests/buergermodul-schnitt.test.js`
führt `feld.art.vorschlaege` bereits in seiner eigenen `BEKANNTE_LUECKEN`-Ratsche, dort auf der
SCHNITT-Seite: von den zwei katalogweit gleichnamigen `art`-Feldern
(`meine-menschen/unterhalt/art` — Unterhaltsarten, `finanzen/konten/art` — Kontoarten) kann die
flache Kennungsform `feld.<feldId>.vorschlaege` nur EINES erfassen; die Vorschläge des anderen
bleiben absichtlich ungeschnitten, weil eine vertauschte Kontoart im Unterhaltsfeld schlimmer wäre
als eine Lücke. Der hier gemessene Befund ist die KONSUMENTEN-Seite derselben Ursache: selbst das
EINE Feld, dessen Vorschläge die Kennung tatsächlich trägt, findet beim echten Einlassweg kein Ziel
— `feld.art.vorschlaege` steht unter keiner Kennung in `TEXTSATZ_EINGEBAUT` (die native Indizierung
von `vorschlaege`-Texten setzt dieselbe katalogweite Eindeutigkeit voraus wie die Schnitt-Kennung
und trägt `art` deshalb unter keiner flachen Form). **Beide Symptome laufen auf dieselbe Prämisse
zurück** — „Feld-IDs sind im ganzen Katalog eindeutig" trifft für `art` nicht zu —, und beide
gehören zusammen gelesen, damit eine künftige Suche nicht ein drittes Mal bei derselben Ursache
landet.

### Rechtsraum: alle sechs äußeren und alle drei inneren Verweise lösen auf — eine Formlücke

Sowohl die sechs Träger-Felder (drei Sektor-, drei Situations-Kennungen) als auch die drei
`ausFeld`/`abFeld`-Geschwisterverweise finden ihr Ziel im lebenden Kern. **Eine Lücke eigener
Art**, die weder Existenzverweis noch Ausbeuteproblem ist: `mobilitaet.reisepass_gueltig` trägt im
nativen Bestand die **alte**, geschlossene Regel-Kennung (`gueltigkeitVorschlag: {ausFeld, regel:
'ausweisdauer'}`) statt der von U2-ADR-314 verlangten `monate`-Form. Der Schnitt exportiert die
Rohwerte unbesehen (`RECHTS_EIGENSCHAFTEN` kennt nur die zwei Eigenschaftsnamen, keine Formprüfung)
— **`feldGueltigkeitVorschlagPruefen` verwirft den Eintrag beim Einlass** (`(ohne monate)`),
`_rechtsraumGueltigkeitVorschlag` liefert `null`, und der Kern fällt auf die eingebaute Regel
zurück. **Heute harmlos**, weil der native Fallback dieselbe Ausweisdauer-Logik trägt — aber ein
Leser der Datei, der eine wirksame `monate`-Überlagerung erwartet, würde sich täuschen: der Eintrag
sieht aus wie eine Regel und ist keine.

**Beide Fundstellen sind in der Probe benannt** (`SPRACHE_BEKANNTE_LUECKEN`,
`RECHTSRAUM_BEKANNTE_FORM_LUECKEN`), nicht stillschweigend toleriert — wächst die Menge, schlägt
die Probe an; wird eine behoben, muss die Liste nachgezogen werden (dieselbe Bauart wie die
`ENTFALLEN`-Liste in `Schema-Wirkung`/A377).

### Marke: keine Verweise — gemessen, nicht angenommen

`tools/buergermodul-schnitt.js` füllt `marke` an **genau einer** Stelle (Zeile ~237): dem
Produktnamen aus dem Dokument-Katalog (`persoenliches.standardDokumente[].typ === 'vivodepot'`).
Farben, Logo, Schriftart sind **benannt, nicht geschnitten** (`BRANDING_NICHT_GESCHNITTEN`) — sie
liegen als CSS/Inline-SVG im Gerüst, nicht als Datenwert. Es gibt darum heute **keinen** feldbezogenen
Verweis in dieser Achse, der ins Leere zeigen könnte — die Probe bestätigt das strukturell (der
frische Schnitt liefert nur den Schlüssel `name`) statt es zu unterstellen, und prüft zusätzlich,
dass der eingefrorene Wert mit dem lebenden Kern übereinstimmt (Drift-Wächter ohne Regenerierung).

## Die Entscheidung

**Gegen den lebenden Kern, nicht gegen eine zweite Bündel-Fassung.** Anders als bei Struktur (wo
`BUERGERMODUL_BUENDEL` eine eingebettete Zweitfassung ist) gibt es für diese drei Achsen keinen
zweiten Träger — die Regenerierung bleibt aus (wie bei ADR-317 verlangt), die Deckung kommt aus
dem direkten Vergleich zwischen eingefrorener Datei und `ladeKern()`.

**Der ECHTE Konsument, nicht eine nachgebaute Existenzprüfung.** Für Sprache läuft die Kennung
durch `textsatzModulPruefen` selbst; für Rechtsraum wird `rechtsraumFristUeberlagerungSetzen` +
`_fristHinweisFuerFeld`/`feldGueltigkeitVorschlag` tatsächlich aufgerufen, mit einer gepflanzten
Verletzung — nicht nur eine parallele Existenzprüfung behauptet dasselbe Verhalten. Beide
Rot-Beweise belegen **wirft NICHT**: `_fristHinweisFuerFeld` liefert `''`, `textsatzModulPruefen`
verwirft benannt statt zu werfen.

**Bekannte Lücken bleiben benannt, nicht stillschweigend toleriert.** Zwei reale, heute schon
bestehende Funde (`feld.art.vorschlaege`; `mobilitaet.reisepass_gueltig`s Regel-Form) sind in der
Probe als geschlossene Listen geführt — wächst die Menge, wird die Probe rot. Das ist dieselbe
Bauart wie `Schema-Wirkung`s vier `ENTFALLEN`-Einträge und `aussagen-abgleich`s Zuwachs-Gate: eine
bekannte, benannte Abweichung ist eine Entscheidung, keine Erlaubnis, sie zu vergrößern.

**Jede Probe prüft zuerst ihre eigene Ausbeute** (`>= 1000`, `>= 5`, `>= 2`) — dieselbe Vorkehrung
wie ADR-317, aus demselben Grund: eine Probe, die nichts findet, ist sonst nicht von einer zu
unterscheiden, die nichts zu finden hat.

**`tests/load-kern.js` bekam vier neue Exporte** (`textsatzModulPruefen`, `TEXTSATZ_EINGEBAUT`,
`TEXTSATZ_SPRACHE_EINGEBAUT`, `feldDefFuer`) — ohne sie wäre die Kennungs-Auflösung nur von außen
nachgebaut, nicht am echten Konsumenten gemessen worden.

## Was bewiesen ist

```
Sprache      1250 Kennungen geprüft, 1249 akzeptiert, 1 bekannt verworfen (kein neuer)
             ROT   gepflanzte Kennung wird verworfen
             POS   eine echte Kennung wird akzeptiert
Rechtsraum   6 äußere + 3 innere Verweise, alle lösen auf
             1 bekannte Regel-Form-Lücke (kein neuer Fund)
             ROT   äußerer Verweis auf nichts wird gefunden (Sektor- UND Situationsform)
             ROT   echter Konsument liefert '' bei kaputtem abFeld, wirft nicht
             POS   echter Konsument liefert einen echten Hinweis am unveränderten Bündel
Marke        0 feldbezogene Verweise — aus dem frischen Schnitt bestätigt
             Drift-Wächter: eingefroren === lebend
```

## Was ausdrücklich NICHT dazugehört

**Die beiden benannten Lücken zu beheben.** Das ist eine Entscheidung über Kennungsform bzw.
Regel-Migration — eine Produktentscheidung, keine Testreparatur — die Probe misst, sie korrigiert nicht.

**Ein neuer Ersetzer für Sprache/Rechtsraum/Marke.** Keine der drei Achsen hat heute einen
`buergermodulBuendelAnwenden`-artigen Anwendungspfad wie Struktur/Situation — Sprache und
Rechtsraum haben stattdessen je einen ANDEREN, bereits bestehenden, generischen Mechanismus
(Einlassweg bzw. Überlagerungs-Setter). Ihn zu vereinheitlichen oder Marke einen eigenen zu geben,
ist eine Architekturfrage, kein Messauftrag.

**Was ein Ladeweg zur Laufzeit einsetzt.** Wie bei ADR-317: geprüft ist die eingefrorene Datei
gegen den lebenden Kern, nicht das Ergebnis eines konkreten Docking-Vorgangs mit echten
Institutionsdaten.

*Vivodepot GmbH · Berlin · 06.09.2026*
