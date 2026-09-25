# U2-ADR-409: Das Feldregister — der Bestand nach außen, Vorschläge nach innen

**Status:** Entschieden in neun Punkten (13.09.2026); offen sind nur noch die Vertretungsregel für
die Fünf-Tage-Frist, der Schutzbedarf (`noindex`) und die Form der Inaktivierungs-Gründe. Die Linie steht (wir folgen der Konvention, SNOMED CT als benanntes
Vorbild), Inaktivierung, freigebende Stelle und Fristen sind entschieden; offen sind
Schutzbedarf, Vertretungsregel und der Auslieferungsweg des Generators (s. „Was offen ist")
**Datum:** 13.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-299 (Bündel-Parität), U2-ADR-319/320 (Bündel erzeugt Bereiche, Zuwachs-Ratsche),
U2-ADR-348 (`bereichsErsatz` tauscht statt ergänzt), U2-ADR-404 ff. (Konfektionierung).
**Status heute:** gilt — entschieden in zehn Punkten am 13.09.2026. Gebaut ist davon der Feldkatalog (270 → 457 Kennungen), das Ausgabe-Artefakt, aus Punkt 10 der Status je Kennung (`permanent`/`deprecated`/`obsoleted`, Nachfolger-Pflicht bei `obsoleted`) und — nachgezogen 13.09.2026 — der Eingangsweg selbst: das Submission-Schema trägt `kennungVorschlaege` als eigenen Schlüssel neben `templates` (Punkt 3, an allen drei gepinnten Orten), der Template-Generator bietet „eine fehlende Kennung vorschlagen" mit Ausgabe als JSON-Datei und vorbereiteter E-Mail an `register@vivodepot.de` (Punkt 9: kein eigener Server), und `tools/kennung-vorschlag-pruefen.js` leistet die mechanische Prüfung (Schema, Dublette gegen den Katalog, Dublette gegen bereits inaktivierte Kennungen) gegen eine eingereichte Datei. Offen bleibt allein die Freigabe selbst (Punkt 6: Sache der Vivodepot GmbH im Postfach, absichtlich ohne Werkzeug) und der Auslieferungsweg des Generators auf die Subdomain (s. „Was offen ist").

**Anker — veröffentlicht, nicht rekonstruiert:** `https://register.vivodepot.de` steht seit
Längerem als Platzhalter online (HTTP 200, `noindex`, deutsch und englisch) und sagt selbst, wozu
die Adresse da ist:

> „Unter dieser Adresse wird das Feldregister von Vivodepot veröffentlicht: das **Verzeichnis der
> Feldkennungen, gegen die Vorlagen gebaut werden**. Eine Kennung bezeichnet dauerhaft dieselbe
> Angabe. Wer eine Vorlage erstellt, **verweist darauf, statt ein eigenes Feld zu beschreiben** — so
> bleibt eine Angabe auffindbar, **auch wenn der Anbieter wechselt**. Das Register ist noch nicht
> veröffentlicht. Diese Seite hält die Adresse."

Dazu die Produktentscheidung (13.09.2026), wörtlich: „Es geht um das Sammeln aller Felder, die
bisher enthalten sind und die jemand anders vorschlägt" — und: der Template-Generator muss **über
die Website** erreichbar sein, nicht über GitHub; **dafür** wurde die Subdomain angelegt.

**Anlass für diesen ADR — und eine Warnung an die nächste Erhebung:** Er hätte längst geschrieben
sein sollen. Am 13.09.2026 wurde nach dem Feldregister gefragt; eine Suche über fünf Ablagen, die
gesamte Versionsgeschichte aller Zweige und das Chatprotokoll meldete **keine einzige Zeile** — und
diese Meldung war FALSCH. Der Suchraum war zu eng: die Website liegt absichtlich außerhalb des
Repos und ist `.gitignore`d, und `grep` ist hier auf `ugrep --ignore-files` gebogen, das genau
solche Verzeichnisse wortlos überspringt. Die Adresse war die ganze Zeit online. **Wer den Bestand
nach außen prüft, prüft die Website — nie das Repo allein.**

---

## Kontext

### Was es heute gibt — gemessen am 13.09.2026, nicht angenommen

Der Kern führt **fünf** Mechanismen, die Feld-Kennungen festhalten. Alle fünf schauen nach innen:

| Mechanismus | Was er hält | Fundstelle |
|---|---|---|
| Paritätsliste | Bündel und nativer Bestand nennen dieselben Kennungen | `tests/buergermodul-ab-parity-u2-adr-299.test.js` |
| Zuwachs-Ratsche | jeder Zuwachs gegenüber dem eingefrorenen Bestand steht in der Zuwachsliste | `tests/buergermodul-bereich-erzeugen-u2-adr-319.test.js` |
| Entscheidungszeile | jedes Feld im Gegenstand trägt eine Zeile — „ein Feld ohne Zeile ist nicht ‚kein Fall', sondern eine ungestellte Frage" | `tests/anfaenge-falsch-abgelegt.test.js` |
| Aussagen-Gate | Grundlinie statt Nulltoleranz | `tests/aussagen-register-und-waechter.test.js` |
| Kern-Lese-Parität | die Lese-App deklariert dieselben Felder wie der Kern, **Unterfelder eingeschlossen** | `tests/paritaet-kern-lese.test.js` |

Dazu der erzeugte **Feldkatalog**: `bereiche/feldkatalog.json`, **270 Einträge**, erzeugt von
`tools/build-feldkatalog.js`. Seine Reichweite steht im Bericht vom 20.08.2026: „erzeugt aus dem
Kern · **nur der Erzeuger** — er ist der einzige, der ihn braucht · ja, `pre-commit`".

**Weg zum Nachsehen:** `node tools/build-feldkatalog.js` (meldet die Zahl) ·
`node --test tests/buergermodul-ab-parity-u2-adr-299.test.js` · ein neues Feld anlegen und
committen — die Wächter melden sich namentlich.

**Dass es fünf sind und nicht vier, ist selbst ein Befund.** Am 13.09.2026 wurden drei Felder
ergänzt; die Auftragsbeschreibung nannte vier Wächter, gemessen aus dem roten `pre-commit`-Lauf.
Der fünfte — die Kern-Lese-Parität — meldete sich erst danach, weil die Lese-App einen **eigenen
Spiegel** der Unterfelder führt (dieselbe A359-Klasse wie überall: eigene Kopie, kein
Laufzeit-Modul). Wer heute ein Feld ergänzt, muss fünf Stellen von Hand nachziehen und erfährt
die Zahl erst, indem er sie alle rot macht. **Das ist der Zustand, den ein Register ablöst.**

### Die zwei gemessenen Mängel

**1 · Der Feldkatalog kannte keine Unterfelder — behoben am 13.09.2026.** Der Befund war:

```
vorsorge_instrumente      im Katalog
zvr_nummer                NICHT im Katalog
vm_gesundheit_eingriffe   NICHT im Katalog
```

Eine Liste zählte als **ein** Feld; ihre Unterfelder gar nicht — allein `vorsorge_instrumente`
trägt 75. Ein Register, gegen das jemand ein Vorsorge-Template bauen soll, das aber `zvr_nummer`
nicht führt, verfehlt seinen Zweck.

**Behoben:** `tools/build-feldkatalog.js` sammelt Unterfelder rekursiv; der Katalog wuchs von
**270 auf 457** Einträge (+187 aus 26 Listenfeldern), ohne dass ein alter Eintrag verschwand oder
sich in Bereich oder Label änderte. Die Kennungsform ist belegt, nicht erfunden:
`<bereich>.<listenfeld>/<unterfeld>`, wie sie `_textsatzFeldFuellen` im Kern schon baut. Eine
eingefrorene Grundlinie der alten 270 hält das fest, mit Rot-Beweis.

**2 · Es gibt keinen Weg herein.** Alle vier Mechanismen oben prüfen, was schon da ist. Keiner
nimmt einen Vorschlag von außen entgegen.

### Dass der Bedarf echt ist, ist belegt — einmal, von Hand

Ein internes Spezifikationsdokument vom 30.08.2026 (ein Felder-Vorschlag „Zugang zum Recht" für
das Bürgermodul, außerhalb dieses Repositoriums) hält genau diesen Vorgang fest: ein fremdes Projekt (Digitalservice, `a2j-rechtsantragstelle`,
MIT) bringt Felder mit, und jemand prüft Abschnitt für Abschnitt, „was überhaupt neue Kern-Felder
braucht" — mit dem Ergebnis, dass von sieben Abschnitten genau einer welche braucht. Das ist der
Vorgang, den ein Feldregister trägt. Heute ist er ein Dokument, das jemand von Hand geschrieben hat.

## Entscheidung (Entwurf)

> Der Bestand geht nach außen, damit ein Fremder dagegen bauen kann. Der Vorschlag kommt nach
> innen, damit ein Feld entstehen kann, das hier niemand erfunden hätte. Die Kennung bleibt
> geschlossen — sie ist die einzige Zusage eines Registers.

### 1 · Vokabular offen, Kennung zu

Das Feldregister ist die Außenseite der `FELDKATALOG`-Prüfung, nicht ihre Aufweichung. Die Prüfung
bleibt ein geschlossenes Tor: **ein Modul erfindet kein Feld** (`grund: 'feld-unbekannt'`). Wer ein
Feld braucht, das es nicht gibt, schlägt es vor — er nimmt es sich nicht.

**Eine Kennung bedeutet für immer dasselbe.** Sie ist der einzige Wert, den ein Register hat, und
darum grundsätzlich nicht zu öffnen.

### 1a · Lesen ohne Anmeldung, Einreichen mit Identität

**Produktentscheidung (13.09.2026), nach der Frage „muss man sich anmelden, wie bei SNOMED?":**
Die Anmeldung gibt es — sie sitzt beim **Vorschlagen**, nicht beim **Nachschlagen**.

```
LESEN        offen, ohne Anmeldung. Sonst kann niemand dagegen bauen,
             und das Register verfehlt seinen einzigen Zweck.
EINREICHEN   mit Identitaet. Sie steht bereits im Vertrag: `anbieter` traegt
             Kennung, Name, Rechtsform, Adresse, Kontakt, Bereich, Zweck.
```

**Die Linie zwischen Schnittstelle und Geheimnis, damit sie nicht jedesmal neu gezogen wird:**

| Draußen | Bleibt drinnen |
|---|---|
| Feldnamen, Bereiche, Beschriftungen | der Kern und seine Logik |
| die Regeln, wie eine Kennung entsteht | Krypto, Ableitungen, Schlüsselwege |
| Fassung und Prüfsumme | Textsätze, Dokumentvorlagen, Rechtsraum-Wissen |
| | eingereichte, noch nicht freigegebene Vorschläge |

Ein Feldname ist eine **Schnittstelle** — er muss bekannt sein, damit etwas zusammenpaßt, wie ein
Steckerformat. Geheim ist, was hinter dem Stecker geschieht. Das letzte Kästchen ist das
empfindliche: ein offener Vorschlag verrät, wer gerade was baut, und gehört ins Postfach und
nirgendwo sonst hin (Punkt 7).

### 2 · Der Bestand, den das Register zeigt, muss vollständig sein

Vor jeder Veröffentlichung ist Mangel 1 zu beheben: der Feldkatalog muss Unterfelder führen. Eine
halbe Liste ist schlechter als keine, weil sie den Fremden glauben macht, er habe den Bestand
gesehen.

### 3 · Der Weg herein ist ein Vorgang, kein Formular

Ein Vorschlag trägt: die vorgeschlagene Kennung, wofür sie steht, wer sie braucht und wozu, und ob
sie eine **dauerhafte Tatsache über die Bürgerin** ist oder eine fallspezifische Frage. Genau diese
Unterscheidung hat den Vorgang vom 30.08. entschieden — sechs von sieben Abschnitten fielen daran
heraus.

**Der Vertrag, gemessen am 13.09.2026 — der Vorschlag hat schon fast alles, was er braucht.**
`docs/template-generator/submission-schema.json` führt auf oberster Ebene: `submissionId` ·
`submissionTimestamp` · `generatorVersion` · `anbieter` · `publicKeyJwk` · `templates` ·
`templatesJws`.

- **Wer vorschlägt, steht schon drin.** `anbieter` trägt Anbieter-Kennung, Name, Rechtsform,
  Adresse, Kontakt, Bereich und Anwendungsfall — die „Registrierung" ist also keine neue Hürde,
  sondern Bestandteil jeder Einreichung.
- **Die Form für einen Vorschlag gibt es als Vorbild eine Ebene tiefer.** `codeListen`
  (`systemId`, `uri`, `version`, `lizenz`, `eintraege`) ist der etablierte Weg, auf dem ein
  Dritter etwas Eigenes mitbringt. Ein Kennungs-Vorschlag gehört als eigener Schlüssel **neben**
  `templates` und wird nach diesem Muster gebaut — nicht daneben erfunden.
- **Die Grenze steht:** 512 KB je Einreichung (`SUBMISSION_MAX_BYTES`), geprüft im VC-Issuer.
- **Und die Auflage, die jede Änderung teuer macht:** das Schema liegt an **drei** Orten —
  `docs/template-generator/submission-schema.json`, eingebettet im Template-Generator und
  eingebettet im VC-Issuer — und `tests/e2e-cross/T-CROSS-08-submission-schema.test.js` pinnt
  ihre Gleichheit. Wer einen Schlüssel ergänzt, ergänzt ihn dreimal, oder das Gate hält ihn auf.

### 4 · Wir folgen der Konvention — vergleichbar zu bekannten Beispielen

**Die Produktentscheidung (13.09.2026), wörtlich: „wir folgen der Konvention. Wir machen es
vergleichbar zu bekannten Beispielen."**

Das Feldregister wird also nicht neu erfunden, sondern nach dem Muster gebaut, das sich bei
Terminologie- und Kennungs-Registern bewährt hat. Benanntes Vorbild ist **SNOMED CT**. Vergleichbare
Beispiele führt das Haus ohnehin schon — LOINC, ICD-10-GM, XÖV und FIM sind in Kern, ADRs und
Werkzeugen präsent, das Muster ist also keines von außen.

Vier Eigenschaften machen diese Konvention aus; jede steht bereits im Platzhalter-Text oder in
diesem ADR:

| SNOMED-Eigenschaft | Entsprechung hier |
|---|---|
| Eine Kennung bezeichnet dauerhaft denselben Begriff | „Eine Kennung bezeichnet dauerhaft dieselbe Angabe" |
| Ein Begriff wird nie gelöscht, nur **inaktiviert** — mit Grund | **entschieden**, ebenso wie bei SNOMED — s. Punkt 6 |
| Erweiterungen leben in einem **eigenen Namensraum** und können den Kern nie beschatten | **gebaut**, s. u. |
| Es gibt einen **definierten Weg, einen neuen Begriff zu beantragen** | fehlt — das ist die Lücke |

**Der Namensraum ist bereits gebaut, nur für Code-Listen statt für Felder.** U2-ADR-051
(04.07.2026, „Templates bringen ihre Code-Listen als Daten mit") entscheidet wörtlich
„Namensraum-Disziplin (`tpl_`-Präfix-Muster wie feldIds)": jede mitgebrachte Liste bekommt eine
`tpl_<slug>`-Kennung, „eine fest eingebaute App-Liste ist **strukturell unbeschattbar**". Dazu
Kollisionsregeln mit Provenienz (`quelle`), ein Submission-Vertrag als Eingangsform
(`docs/template-generator/submission-schema.json`, byte-gleich an drei Orten gepinnt) und der
`teilliste`-Marker für Ausschnitte eines größeren Systems.

**Das Feldregister ist dasselbe Muster eine Ebene höher**: angewandt auf Feld-Kennungen statt auf
Code-Listen. Der Mechanismus muss nicht erfunden werden — er muss gehoben werden.

**Ein Fund aus dem Bau vom 13.09.2026, der Weg B (Punkt 9) trägt:** Der Feldkatalog ist im
Template-Generator nicht nur *gelesen*, sondern als **erzeugte Region eingebacken** — derselbe
Lauf schreibt `bereiche/feldkatalog.json` und die Region in der Generator-Datei, und ein
Drift-Wächter hält beide zusammen. Solange das so bleibt, erreicht eine neu freigegebene Kennung
einen fremden Vorlagen-Bauer erst, wenn der Generator neu gebaut und neu ausgeliefert ist — die
dynamische Aufnahme aus Punkt 7 käme nie bei ihm an. Erst das Holen aus dem veröffentlichten
Register löst das auf. **Die eingebackene Region ist damit kein Umweg zum Register, sondern der
Grund, es zu brauchen.**

**Eine Verwechslung, die hier ausdrücklich ausgeschlossen sei:** Vorbild ist das **Verhalten**,
nicht der Inhalt und nicht die Trägerschaft. Vivodepot führt eine SNOMED-Teilliste
(`snomedAllergen`, SEED, Affiliate-Lizenz); die Lizenzlage von SNOMED-Inhalten hat mit der Frage,
wie ein eigenes Feldregister aufgebaut ist, nichts zu tun.

**Was „vergleichbar" praktisch heißt:** Das Register zeigt nicht nur die Kennungen, sondern auch
die Regeln, nach denen eine Kennung entsteht, gilt und inaktiviert wird — so, wie es die
genannten Beispiele halten. Ein Verzeichnis ohne seine Regeln ist eine Liste; erst die Regeln
machen es zu der Zusage, die der Platzhalter bereits gibt: „so bleibt eine Angabe auffindbar, auch
wenn der Anbieter wechselt."

**Was es NICHT heißt:** Vivodepot beansprucht keine Rolle als Normgeber. Das Register gilt für die
Vorlagen, die gegen dieses Gerüst gebaut werden — nicht darüber hinaus.

### 5 · Vier Wege über den Template-Generator — und drei davon stehen schon

Die Produktentscheidung (13.09.2026): „Es muss über den Template-Generator einen Eingabe-, Prüf-,
Freigabe- und Ausgabeweg geben."

**Gemessen am 13.09.2026 — die vier Wege gibt es, aber für VORLAGEN, nicht für KENNUNGEN:**

| Weg | Was heute steht | Für ein Feldregister fehlt |
|---|---|---|
| **Eingabe** | `docs/template-generator/submission-schema.json`, 36 KB, byte-gleich an drei Orten gepinnt (T-CROSS-08) | ein Vorschlag OHNE Vorlage. Heute bringt eine Vorlage Felder mit; wer nur eine Kennung anregen will, hat keinen Weg |
| **Prüfung** | `validateTemplate` (9 Stellen im Generator) + `tools/build-torwaechter.js` → `torwaechterAusKern` — **aus dem Kern erzeugt**, also nie veraltet | die Prüfung fragt „paßt diese Vorlage zum Bestand", nicht „soll dieser Bestand wachsen" |
| **Freigabe** | `vivodepot-vc-issuer.html`, JWS über `providerCredentialJws`/`modulSignaturJws` (21 Stellen im Kern) — **die Signatur IST der Freigabeakt** | signiert wird eine Vorlage. Eine neue Kennung ist kein Signaturgegenstand, sondern eine Aufnahme ins Register |
| **Ausgabe** | `bereiche/feldkatalog.json`, 270 Einträge, erzeugt — und der **Template-Generator liest ihn bereits**: „damit eine Anfrage nur Kennungen nennen kann, die es gibt" (Kopfzeile des Katalogs) | die Ausgabe ist eine **Datei neben dem Werkzeug**, keine veröffentlichte Adresse; ohne Unterfelder; unter der Subdomain steht ein Platzhalter |

**Die Lücke ist damit genau benannt, und sie ist kleiner als sie aussah:** Der Apparat steht. Was
fehlt, ist ein **fünfter Gegenstand** neben der Vorlage — der Kennungs-Vorschlag — der dieselben
vier Wege nimmt:

```
Eingabe    ein Vorschlag im Submission-Vertrag, ohne Vorlage drumherum:
           Kennung, wofuer sie steht, wer sie braucht, wozu — und ob sie eine
           DAUERHAFTE TATSACHE ueber die Buergerin ist oder eine fallspezifische Frage.
           Genau diese Unterscheidung entschied den Vorgang vom 30.08.: sechs von
           sieben Abschnitten fielen daran heraus.

Pruefung   gegen den erzeugten Torwaechter: gibt es die Kennung schon, kollidiert sie,
           traegt sie die Namensraum-Form. Mechanisch, nicht redaktionell.

Freigabe   der redaktionelle Akt — und der einzige der vier, den kein Werkzeug
           abnehmen kann. Wer entscheidet, ist offen (s. u.).

Ausgabe    die Kennung wird Teil des veroeffentlichten Registers und gilt von da an
           dauerhaft. Ab hier ist sie nicht mehr ruecknehmbar, nur inaktivierbar.
```

**Der Generator ist damit die richtige Stelle, nicht eine zusaetzliche:** er trägt Eingabe und
Prüfung bereits, und er ist das Werkzeug, das ein fremder Vorlagen-Bauer ohnehin in der Hand hat.
Dass er über die Website erreichbar sein muss und nicht über GitHub, ist entschieden — es ist
derselbe Grund, aus dem die Subdomain angelegt wurde.

### 6 · Inaktivierung: ebenso wie SNOMED — und Freigabe: die Vivodepot GmbH

**Produktentscheidung (13.09.2026): Inaktivierung ebenso wie SNOMED.**

Eine Kennung wird **nie gelöscht**. Wird sie unbrauchbar, falsch oder überflüssig, wird sie
**inaktiviert** — sie bleibt im Register sichtbar, trägt einen **Grund** und, wo es einen gibt,
den **Nachfolger**. Das ist der ganze Unterschied zwischen einem Register und einer Liste: eine
Kennung, die verschwindet, macht jede Datei unlesbar, die sie je benutzt hat. Eine inaktivierte
Kennung bleibt lesbar und sagt, was an ihre Stelle tritt.

Für ein Depot, das die Bürgerin jahrzehntelang behält, ist das keine Formalie, sondern die
Bedingung dafür, dass eine alte Datei in zwanzig Jahren noch etwas bedeutet.

**Beim Bau festzulegen** (die Form, nicht das Ob): welche Gründe es gibt und welche Arten von
Nachfolge-Beziehung. SNOMED unterscheidet dort mehrere — die Übernahme ist am Vorbild zu messen,
nicht zu erfinden.

**Produktentscheidung (13.09.2026): die Freigabe erteilt bis auf weiteres die Vivodepot GmbH.**

Das ist die vierte der vier Stationen und die einzige, die kein Werkzeug abnehmen kann. Solange das
Register klein ist, ist eine Stelle richtig: sie ist erreichbar, sie entscheidet schnell, und sie
haftet für die Zusage, die eine Kennung darstellt.

**Offen und ausdrücklich als Frage notiert:** ob die Freigabe später an eine gemeinnützige
Trägerschaft übergeht. Das ist erwogen, nicht entschieden. Die Frage wird praktisch, sobald Dritte
in nennenswerter Zahl gegen das Register bauen — denn dann entscheidet die freigebende Stelle über
die Arbeitsgrundlage von Wettbewerbern. Die genannten Vorbilder lösen das jeweils über eine eigene
Trägerorganisation; dass die Frage kommt, ist also absehbar, nur ihr Zeitpunkt nicht.

### 7 · Der Vorgang in Zeiten und Wegen

**Produktentscheidung (13.09.2026):** Eingangsbestätigung automatisch · Entscheidung in **höchstens
fünf Arbeitstagen** · Aufnahme **dynamisch, sobald freigegeben** · Benachrichtigung an
`register@vivodepot.de`.

```
Eingang        automatische Bestaetigung, sofort
Entscheidung   hoechstens 5 Arbeitstage
Aufnahme       dynamisch — die Kennung gilt, sobald sie freigegeben ist
Inaktivierung  NICHT dynamisch — nur zum angekuendigten Stichtag
```

**Warum die Aufnahme dynamisch ist.** Eine erste Fassung dieses ADR schlug vor, Aufnahmen zum
Fassungswechsel zu bündeln. Das ist falsch: wer einen Vorschlag eingereicht hat, kann bis dahin
nicht weiterbauen — er hängt in der Luft. Eine Aufnahme ist **additiv** und bricht niemanden: wer
die neue Kennung nicht kennt, merkt von ihr nichts.

**Warum die Inaktivierung es nicht ist.** Sie ist die einzige Bewegung im Register, die eine
fremde Vorlage brechen kann. Sie braucht darum die angekündigte Grenze, die eine Aufnahme nicht
braucht. Die Asymmetrie ist der Punkt: **Zuwachs sofort, Wegnahme angekündigt.**

**Fünf Arbeitstage sind eine Zusage, kein Richtwert.** Sie binden eine Person. Zu regeln ist
darum, was bei Abwesenheit gilt — eine Vertretung oder eine ausgesprochene Verlängerung. Eine
Frist, die im Urlaub reißt, ist schlechter als keine, weil sie beim ersten Mal Vertrauen kostet.

**Der Weg, technisch — und er ist kürzer als gedacht.** Gemessen am 13.09.2026:

- Der Template-Generator ist eine **statische Seite**. Er kann keine Einreichung entgegennehmen und
  keine E-Mail senden. Er sammelt und signiert; mehr nicht.
- `vivodepot-download-gateway` ist ein Cloudflare Worker und **kann beides schon**: `worker-mailer`
  ist Abhängigkeit (`package.json`, zwei Stellen in src/index.js dieses Schwesterrepos), `sendDownloadEmail` ist
  verdrahtet, und es gibt bereits Webhook-Endpunkte (`/webhook/download-gate`) sowie einen
  KV-Speicher.

Der Eingangsweg gehört also **ans Gateway**, nicht an den Generator: der Generator stellt den
Vorschlag zusammen, das Gateway nimmt ihn an, bestätigt automatisch und benachrichtigt
`register@vivodepot.de`. Kein neuer Dienst.

**Weg zum Nachsehen:** `grep -n "worker-mailer" src/index.js package.json` im Gateway-Repo ·
`grep -n "pathname" src/index.js` zeigt die bestehenden Endpunkte.

**Nachtrag 13.09.2026, beim Bau — dieselbe Schlussfolgerung wie oben ist BEREITS überholt.**
Der Absatz „Der Eingangsweg gehört also ans Gateway" oben ist nicht die Entscheidung, die gilt:
Punkt 9 (unten, im selben ADR, am selben Tag geschrieben) prüft dieselbe Frage noch einmal —
„wie kommt eine Einreichung überhaupt zugestellt" — und kommt zum genauen Gegenteil: **kein
Gateway, kein eigener Server, reine E-Mail.** Die Entscheidung im Kopf dieses ADR („Konvention
wie IANA … kein eigener Server, U2-ADR-409 Punkt 9 bleibt") übernimmt ausdrücklich Punkt 9, nicht
diesen Absatz. Gebaut ist entsprechend Punkt 9, nicht der Gateway-Weg: der Template-Generator
stellt den Kennungs-Vorschlag zusammen, lässt ihn als JSON-Datei herunterladen und öffnet
zusätzlich eine vorbereitete E-Mail an `register@vivodepot.de` (lesbarer Text + kompaktes JSON im
Body) — kein Worker, kein Webhook, kein neuer Endpunkt. Stehen bleibt dieser Absatz als Beleg,
wie die Entscheidung entstand, nicht als geltender Weg.

### 8 · Die inhaltliche Zuordnung ist verbindlich, nicht dekorativ

**Produktentscheidung (13.09.2026), wörtlich: „wenn ein Feld inhaltlich in Finanzen gehört, darf es
nicht außerhalb stehen."**

Der Katalog trägt die Zuordnung bereits — und zwar **zweimal**, was kein Versehen ist:

```json
{"kennung": "identitaet.vorname", "bereich": "identitaet", "label": "Vorname"}
```

Einmal im Namen (`identitaet.` als Präfix der Kennung) und einmal als eigenes Feld `bereich`.
Der Schlüsselraum ist ausdrücklich deklariert (`schluesselraum: "kennung"`), die heutige Verteilung
über die dreizehn Bereiche ist gemessen: krisenvorsorge 33 · bildung 31 · identitaet 29 ·
gesundheit 28 · verwaltung 27 · sozialversicherung 22 · persoenliches 22 · finanzen 21 · wohnen 15 ·
mobilitaet 13 · vermoegen 11 · vorsorge 10 · meine-menschen 8.

**Die Regel, die daraus folgt:** Der Bereich ergibt sich aus dem **Inhalt** des Feldes, nicht aus
dem Wunsch dessen, der es vorschlägt. Über die Zuordnung entscheidet die Freigabe, nicht die
Einreichung. Ein Vorschlagender kann ein Finanzfeld nicht in seinem eigenen Bereich parken, um der
inhaltlichen Prüfung auszuweichen — täte er es, stünde dieselbe Angabe zweimal im Register, an
zwei Orten, mit zwei Kennungen. Genau das zerstört die Zusage, für die das Register da ist:
auffindbar zu bleiben, auch wenn der Anbieter wechselt.

**Die Folge für den Vorschlag (Punkt 3):** Er nennt den Bereich, den der Einreichende für richtig
hält — als Vorschlag, nicht als Setzung. Die Prüfung fragt zuerst „gibt es diese Angabe schon
irgendwo", und erst dann „gehört sie dorthin, wo sie hin soll".

**Ein Punkt, der beim Bau zu entscheiden ist und den diese Regel aufwirft:** Die Kennung trägt den
Bereich im Namen. Stellt sich später heraus, dass ein Feld inhaltlich woanders hingehört, kollidiert
das mit „eine Kennung bedeutet für immer dasselbe" — der Umzug erzwänge eine neue Kennung. Die
Vorbilder lösen das, indem ihre Kennungen **bedeutungsfrei** sind und die Zuordnung als Beziehung
danebensteht. Hier steht sie doppelt: im Namen und als Feld `bereich`. Solange beide übereinstimmen,
ist nichts zu tun; für den Umzugsfall ist zu entscheiden, welche der beiden führt — und das gehört
zur Inaktivierungs-Regel (Punkt 6), nicht daneben.

### 9 · Das Register braucht keinen Server — der Weg existiert schon zweimal

**Produktentscheidung (13.09.2026), in drei Schritten entstanden.** Erst „das Gateway liefert aus"
(Cloudflare Worker), dann „bei IONOS", schließlich — nachdem gemessen war, wie eine Einreichung
heute überhaupt zugestellt wird — **ohne serverseitige Stelle überhaupt**.

**Die zwei Messungen, die den Bau auflösten:**

1. **Der Template-Generator sendet nichts.** `fetch`/`XMLHttpRequest` im Generator: **0 Treffer**.
   Er stellt das Paket zusammen, prüft es und lässt es **herunterladen**. Die Zustellung lag
   immer außerhalb des Werkzeugs — das ist keine Lücke, das ist die bestehende Form.
2. **Der Auslieferungsweg nach HiDrive steht.** `tools/kern-ausliefern.js` (U2-ADR-407) liefert
   den Kern über `HIDRIVE_USER`/`HIDRIVE_PASSWORT` aus; die Ablage führt bereits `kern`,
   `module` und `templates`.

**Die Richtigstellung, die das Ganze auflöst (13.09.2026):** HiDrive ist **kein Ablageziel,
sondern die Quelle**. Bei einer Bestellung im Shop baut das Gateway das Produkt **dynamisch aus
den dort liegenden Zutaten** — src/produkt-bauen.js im Schwesterrepo liest `HIDRIVE_USER`/`HIDRIVE_PASSWORT`, die
Ablage führt `kern`, `module`, `templates`.

**Damit ist das Feldregister kein neuer Weg, sondern eine Zutat mehr.** Der vierte Ordner
`register` steht neben den drei bestehenden, wird vom selben Erzeuger beliefert und vom selben
Mechanismus ausgeliefert, der heute schon Produkte baut. Kein zweiter Auslieferungsweg, keine
zweite Wahrheit darüber, was gilt — die Frage „wie kommt die Liste hoch" beantwortet sich mit
„so wie alles andere auch".

**Daraus der Weg, ohne eine einzige neue Stelle:**

```
Eingabe    Der Generator baut den Kennungs-Vorschlag und laesst ihn herunterladen.
           Die Vorschlagende schickt ihn an register@vivodepot.de — derselbe Weg,
           den eine Vorlagen-Einreichung heute schon nimmt.

Pruefung   im Generator, gegen den Feldkatalog. Laeuft bereits: „damit eine Anfrage
           nur Kennungen nennen kann, die es gibt."

Freigabe   im Postfach. Die Entscheidung faellt dort, wo sie hingehoert.

Ausgabe    die erzeugte Feldliste, ausgeliefert wie der Kern — HiDrive, vierter
           Ordner neben kern/module/templates — und abrufbar unter der Subdomain,
           die schon auf den Webspace zeigt.
```

**Was damit entfällt:** PHP oder Node als zweite Sprache · ein Worker · ein Endpunkt, der
Einreichungen entgegennimmt · ein Zonenumzug · ein DNS-Eintrag · ein zweiter Anbieter · die
Frage, wo unveröffentlichte Vorschläge ruhen. Sie ruhen nirgends: sie liegen im Postfach, wie
jede andere Zuschrift auch.

**Was der Preis ist, ehrlich benannt:** „dynamisch" (Punkt 7) heißt jetzt „nach jeder Freigabe ein
Auslieferungslauf", nicht „im selben Augenblick". Der Lauf ist gebaut und dauert Minuten — der
Unterschied ist für einen Vorlagen-Bauer nicht spürbar, solange die Freigabe binnen fünf
Arbeitstagen fällt. **Die Zusage aus Punkt 7 bleibt damit eingelöst**; nur der Mechanismus
dahinter ist kleiner.

**Die automatische Eingangsbestätigung** (Punkt 7) leistet eine Abwesenheits-/Autoantwort auf
`register@vivodepot.de`. Kein Code.

**Die zwei Orte, bestätigt am 13.09.2026:** `register` besteht bereits als Verzeichnis im
Webspace; in HiDrive kommt ein gleichnamiger Ordner neben `kern`, `module` und `templates` dazu.

**Und damit die Auflage, ohne die zwei Orte zu zwei Wahrheiten werden:** die veröffentlichte
Feldliste trägt **ihre eigene Fassungsangabe und eine Prüfsumme**, wie der Kern sie in
`vivodepot.html.sha256` schon führt. Ohne das ist nicht feststellbar, ob die Liste unter der
Adresse dem entspricht, was der Erzeuger zuletzt gebaut hat — und genau diese Lücke besteht heute
bereits einmal: die ausgelieferte Fassung auf `vivodepot.de` hängt hinter dem Kanon zurück, ohne
daß es jemandem auffällt. **Zweimal derselbe Fehler wäre keiner mehr, sondern eine Bauart.**

**Der Größen-Einwand ist gemessen und trägt nicht:** der Katalog mit 457 Einträgen ist **63 KB**
(gepackt 8,6 KB), 115 Byte je Kennung — gegen **4.744 KB** für eine einzige Kern-Datei. Das
Register verschwindet neben dem, was ohnehin dort liegt.

**Gebaut, 13.09.2026 — genau dieser Weg, kein anderer.** Der Template-Generator
(`vivodepot-template-generator.html`, Abschnitt „eine fehlende Kennung vorschlagen") baut das
Paket aus `anbieter`/`publicKeyJwk` (Schritt 2/3, unverändert) plus `kennungVorschlaege`
(Submission-Schema, Punkt 3), lässt es als JSON-Datei herunterladen (`blobDownload`, wie jede
andere Ausgabeart hier) und öffnet zusätzlich `mailto:register@vivodepot.de` mit lesbarem Text
und — solange kurz genug — dem kompakten JSON im Body. Kein `fetch`, kein neuer Endpunkt: derselbe
Befund wie oben („der Template-Generator sendet nichts") gilt für diese fünfte Ausgabeart genauso
wie für Vorlagen. Die mechanische Prüfung auf der Empfängerseite — Schema, Dublette gegen den
aktiven Katalog, Dublette gegen eine bereits inaktivierte Kennung (Punkt 6: eine Kennung wird nie
wiederverwendet) — leistet `tools/kennung-vorschlag-pruefen.js --datei <pfad>`.
**Weg zum Nachsehen:** `node tools/kennung-vorschlag-pruefen.js` (Selbsttest gegen
`tests/fixtures/kennung-vorschlag/`) · `node --test tests/kennung-vorschlag-generator.test.js
tests/kennung-vorschlag-pruefen.test.js`.

### 10 · Auffindbarkeit, Inaktivierung und Vertretung — nach dem Vorbild IANA

**Produktentscheidungen (13.09.2026): `noindex` und Inaktivierung wie bei IANA; Vertretung über
eine Postfach-Weiterleitung.**

**Auffindbar, nicht versteckt.** `noindex` fällt weg, sobald echter Inhalt unter der Adresse
steht. Ein Register, das Suchmaschinen nicht führen dürfen, findet auch der nicht, der danach
sucht — und die Vorbilder sind sämtlich indexiert. Bis zur ersten Veröffentlichung bleibt die
Angabe auf der Platzhalter-Seite stehen.

**Inaktivierung: eine Zeile bleibt, ihr Status ändert sich.** IANA löscht keinen Eintrag; er
behält seine Zeile und trägt einen Status samt Verweis auf die Stelle, die ihn abgelöst hat. Für
das Feldregister heißt das: eine Kennung verschwindet nie aus der Liste. Sie trägt fortan ihren
Status und, wo es einen gibt, den Nachfolger.

**Zwei Statussorten, die nicht vermengt werden dürfen.** Die einen beschreiben, **wie ein Wert
vergeben werden darf** (`Reserved`, `Unassigned`, `Private Use`, `Experimental Use`); die anderen,
**daß ein vergebener Wert überholt ist** — mit Verweis auf den Nachfolger. Das Feldregister braucht
die zweite Sorte.

**Entschieden (13.09.2026), am tatsächlichen Bestand eines Vorbild-Registers abgelesen, nicht
erfunden:** Die drei Wörter der IANA-Konvention, wörtlich aus der „Hypertext Transfer Protocol
(HTTP) Field Name Registry" (RFC 9110 §16.3.1) — deren Status-Spalte genau diese Sorte führt, mit
`Ref`-Verweis auf den Nachfolger — und aus der Registrierungsrichtlinie für neue Register
(RFC 8126 §9.6):

```
permanent    gilt unveraendert. Voreinstellung: eine Kennung ohne Eintrag in der
             Inaktivierungs-Tabelle ist permanent.
deprecated   gilt noch, wird aber nicht mehr empfohlen. Ein Nachfolger ist hier
             erlaubt, aber nicht Pflicht.
obsoleted    ist abgeloest. Ein Nachfolger ist hier PFLICHT — eine obsoleted
             Kennung ohne Nachfolger sagt „veraltet", ohne zu sagen, wohin.
```

**`provisional` fehlt bewusst.** Die HTTP Field Name Registry führt ein viertes Wort für Werte, die
noch nicht endgültig sind. Das Feldregister braucht es nicht: ein Vorschlag, der noch nicht
freigegeben ist, steht überhaupt nicht im Register — er liegt im Postfach (Punkt 1a, Punkt 9). Eine
Kennung erscheint hier erst mit der Freigabe, und ab dann ist sie sofort `permanent`. `provisional`
wäre ein Status für einen Fall, den es in diesem Register nicht gibt.

**Die Nachfolger-Regel, aus derselben Lesart:** `permanent` darf keinen Nachfolger tragen — es gibt
nichts, wohin verwiesen werden müsste. `obsoleted` muss einen tragen, und der muss selbst eine
Kennung sein, die im Register existiert (sonst verweist die Ablösung ins Leere). `deprecated` steht
dazwischen: meist schon absehbar, wohin es geht, aber nicht immer — der Nachfolger bleibt optional.

**Gebaut:** `tools/feldregister-bauen.js` führt die Inaktivierungs-Tabelle `INAKTIVIERT` — heute
leer, weil noch keine Kennung inaktiviert wurde — und prüft beim Bauen genau diese Regel: ein
unbekanntes Statuswort, ein `obsoleted` ohne Nachfolger, ein Nachfolger, der nicht existiert, oder
ein `permanent` mit Nachfolger lassen den Lauf werfen, statt still ein falsches Register zu
erzeugen. Jeder Eintrag im veröffentlichten Register trägt seinen Status sichtbar; eine
inaktivierte Kennung bleibt gelistet, wie Punkt 6 es verlangt.

**Weg zum Nachsehen:** `node --test tests/feldregister-bauen.test.js` — die Tests
„[Feldregister·Status] …" prüfen jede der vier Abweisungen einzeln und dass eine inaktivierte
Kennung in Liste und Seite stehen bleibt.

**Vertretung: eine Weiterleitung, kein Verfahren.** Die Fünf-Tage-Frist aus Punkt 7 wird durch
eine Weiterleitung des Postfachs `register@vivodepot.de` gehalten, wenn die freigebende Stelle
nicht erreichbar ist. Das ist die kleinste Lösung, die trägt: keine zweite Zuständigkeit, keine
Vertretungsregelung im Text — die Zuschrift erreicht schlicht jemanden.

**Was damit NICHT geregelt ist, und es gehört gesagt:** eine Weiterleitung stellt zu, sie
entscheidet nicht. Wer die Freigabe in Abwesenheit tatsächlich erteilt, bleibt offen — bis
dahin trägt die Frist nur, solange jemand erreichbar ist.

### 11 · Die Fassung des Registers folgt den Zutaten, nicht dem Kanon

**Produktentscheidung (13.09.2026): „HiDrive muss die letzte stabile Version haben."**

Daraus folgt eine Reihenfolge, die nicht vertauscht werden darf. Gemessen am 13.09.2026: der
Kanon stand auf **v684**, die Ablage in HiDrive laut U2-ADR-411 auf **v670**.

**Der Widerspruch, den das erzeugt:** Ein Vorlagen-Bauer liest im Register eine Kennung, die es
seit v684 gibt, und baut dagegen. Ausgeliefert bekommt die Bürgerin ein Produkt, das aus den
Zutaten in HiDrive gebaut wurde — und kennt die Kennung nicht. **Das Register hätte etwas
zugesagt, was die Zutaten nicht hergeben.**

**Die Regel:** Die Fassungsangabe des Registers bezeichnet den Stand, aus dem tatsächlich gebaut
wird — also den in HiDrive, nicht den im Kanon. Läuft der Kanon voraus, ist das kein Fehler
(U2-ADR-411: ein Rezept zieht nicht stillschweigend mit); das Register darf ihm nur nicht
vorauslaufen.

**Die Reihenfolge bei jeder Veröffentlichung:**

```
1  der Stand landet im Kanon und ist gepusht
2  der Kern wird nach HiDrive ausgeliefert — die Zutaten sind jetzt dieser Stand
3  das Register wird aus DIESEM Stand erzeugt
4  die drei Dateien gehen unter die Adresse
```

Schritt 3 vor Schritt 2 macht die Fassungsangabe zur Behauptung.

**Was die Fassungsangabe NICHT ist, und das gehört auf die Seite:** ein Beleg. Das Kern-Repo ist
privat (gemessen: die GitHub-Seite antwortet ohne Anmeldung mit 404). „Kern v6xx" ist eine
Herkunftsangabe, die ein Außenstehender nicht nachschlagen kann. Nachprüfbar ist für ihn allein
die Prüfsumme der Liste — und die ist es vollständig. Beides gehört unterschiedlich beschriftet,
damit niemand das eine für das andere hält.

### 12 · Sprachfrei: die Kennung ist undurchsichtig, die Bedeutung steht in den Beschriftungen

**Anlaß (13.09.2026):** „die Felder sind doch alle deutsch?" — und darauf: „wie machen wir das,
dass das sprachagnostisch ist?"

**Gemessen am 13.09.2026:** alle 457 Kennungen tragen eine deutsche **und** eine englische
Beschriftung (`tools/textsatz-de-modul.json`, `tools/textsatz-en-modul.json`, Schlüssel
`<kennung>.label`), und alle 457 Kennungen bestehen aus reinem ASCII. Veröffentlicht war bis
dahin nur die deutsche Beschriftung.

**Die Konvention, der gefolgt wird (wie SNOMED CT und LOINC):** Eine Kennung trägt keine Bedeutung
— die Beschriftung trägt sie, und zwar je Sprache.

1. **Die Kennung ist undurchsichtig.** `identitaet.vorname` wird nicht übersetzt und nicht
   gedeutet; für jemanden ohne Deutsch ist sie ein Zeichen wie `2345-7` bei LOINC — zum
   Wiederfinden, nicht zum Verstehen. Das Register sagt das ausdrücklich. Da eine Kennung sich
   ohnehin nie ändert (Punkt 1), bleibt ihre deutsche Herkunft sichtbar, aber folgenlos.
2. **Die Bedeutung steht in Beschriftungen je Sprache.** Jeder Eintrag trägt
   `label: {de: …, en: …}`. Eine weitere Sprache wird eine weitere Beschriftung, nie eine neue
   Kennung.
3. **Neue Kennungen folgen derselben Form.** Die Prüfung eines Kennungs-Vorschlags (Punkt 5)
   verlangt ASCII und die bestehende Schreibweise `<bereich>.<feld>` bzw.
   `<bereich>.<listenfeld>/<unterfeld>`. Eine Kennung mit Umlaut oder in fremder Schrift wird
   abgewiesen — sonst ist das Register ab der ersten Aufnahme nicht mehr sprachfrei.

**Bewußt nicht gebaut:** eine zusätzliche bedeutungsfreie Nummer nach SNOMED-Art. Sie wäre eine
zweite Kennung für dieselbe Sache, von Hand synchron zu halten — dieselbe Bauart „eine Angabe an
zwei Orten, nur einer wird nachgezogen", die am 13.09.2026 dreimal als Befund auftrat. Solange die
ASCII-Kennung als undurchsichtig gilt, leistet sie dasselbe.

**Folge für das veröffentlichte Artefakt:** der Erzeuger gibt die Beschriftungen je Sprache aus;
die Seite zeigt beide. Das erfordert einen neuen Upload der drei Dateien.

## Was offen ist — ausdrücklich nicht geraten

- **Die Statuswörter der Inaktivierung sind entschieden** (Punkt 10: `permanent` · `deprecated` ·
  `obsoleted`, nach RFC 9110 §16.3.1 / RFC 8126 §9.6, `provisional` bewusst ausgeschlossen) und
  gebaut. Offen bleibt allein die Form der **Inaktivierungs-Gründe** — der Text, der bei einer
  künftigen Inaktivierung neben Status und Nachfolger stehen soll.
- **Wer in Abwesenheit tatsächlich freigibt.** Die Zustellung ist geregelt (Punkt 10,
  Weiterleitung); die Entscheidung nicht.
- **Der Auslieferungsweg des Generators auf die Subdomain.** Entschieden ist, dass er über die
  Website erreichbar sein muss und nicht über GitHub — das war der Grund, die Subdomain anzulegen.
  Gemessen: der Generator **liest den Feldkatalog schon**, aber als Datei neben sich; externe
  Adressen kennt er nur zwei (`json-schema.org`, `vivodepot.de`), und die Datei liegt im Repo,
  nicht auf der Website. Die Anbindung ist also keine neue Fähigkeit, sondern ein Ortswechsel:
  dieselbe Lesung, andere Quelle. Offen ist der Auslieferungsweg dorthin —
  wer die Datei auf die Subdomain bringt und woran man sieht, dass die dort liegende Fassung die
  gelandete ist.
- **Die künftige Trägerschaft der Freigabe** — gemeinnützige Stelle statt GmbH — ist erwogen,
  nicht entschieden (Punkt 6).

## Konsequenzen

Solange dieser ADR Entwurf ist, ändert sich nichts: die fünf inneren Mechanismen bleiben, der
Feldkatalog bleibt intern, und unter der Adresse steht der Platzhalter.

Zwei Lehren stehen damit fest, unabhängig von der ausstehenden Entscheidung:

**Wo eine Entscheidung nur im Gespräch stand, ist sie beim nächsten Fenster fort.** Die Adresse
lebte, die Seite stand, der Zweck war dort in zwei Sprachen formuliert — und in Repo,
Versionsgeschichte und internen Dokumenten gab es davon kein Wort.

**Und: „im Projekt nicht gefunden" ist keine Aussage über den Bestand, sondern über den
Suchraum.** Diese Datei wäre um ein Haar mit dem Satz „das Feldregister existiert nirgends"
begonnen worden.
