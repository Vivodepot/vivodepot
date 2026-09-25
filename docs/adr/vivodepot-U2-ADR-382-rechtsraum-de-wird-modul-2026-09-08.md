# U2-ADR-382 · Rechtsraum Deutschland wird ein Modul, wie Sprache — Besitz-Zug

**Status heute:** gilt
**Datum:** 08.09.2026
**Betrifft:** `vivodepot.html` (`RECHTSRAUM_KATALOG` → `AB_WERK_RECHTSRAUM_DE` umbenannt, s. §9 —
jetzt selbst das Modul, `modulTyp`/
`rechtsraum`/`moduleVersion`/`anbieterId`/`typen` statt einer instrument-geschlüsselten Tabelle;
`_rechtsraumKatalogAlsModul`/`_rechtsraumAbWerkRegistrySeed` neu; `_rechtsraumKatalogLesen` ohne
separaten nativen Zweig; `_rechtsraumModuleAusDepotAnmelden` mit expliziter DE-Reservierung;
`_rechtsraumVorschlagswert` zählt die Ab-Werk-Saat nicht mehr mit), `tools/rechtsraum-de-modul-
erzeugen.js` (liest die neue Formübersetzung aus dem Kern statt sie zu duplizieren),
`tools/waechter-register.js` + `tests/bgb-verweise-pruefen.test.js` (zwei Pflanz-Anker
nachgezogen), 13 Testdateien mit angepassten Erwartungen, `tests/load-kern.js` (zwei neue
Exporte)
**Bezug:** U2-ADR-367 (Zug 3, Besitz-Zug für Sprache — wörtliches Vorbild), U2-ADR-368 (Zug 1 —
Weg A gebaut, verdrahtet, aber tot), U2-ADR-352/E1 Teil 1 (Katalog aus dem Bündel materialisiert),
U2-ADR-285 (`validateRechtsraumModul`, Weg A/B), U2-ADR-121 (Katalog-Grundform)

---

## 0 · Der Auftrag

Definition of Done nennt fünf Modulachsen: Privat/Pro, Sprache, Rechtsraum, Branding, UX.
Vier waren in Arbeit oder gelandet; Rechtsraum hatte seit U2-ADR-368 („Zug 1") niemand mehr
angefasst — und „Zug 1" heißt per Definition, dass ein Zug 2 folgen sollte. Auftrag, in
zwei Schritten:

1. **Messen**, ob „Modul Rechtsraum deutsch" wirklich ein Modul ist — dieselbe Frage, die in der
   Nacht zuvor die Pro-Achse als „zwei Module, nicht eins" entlarvt hatte (U2-ADR-379): gibt es
   ein AUSGELIEFERTES ARTEFAKT, das der Konfektionierer einem Produkt mitgeben kann?
2. **Bauen, was fehlt** — nicht nur berichten. stehende Regel: Lücke schließen, nicht
   anzeigen.

**Auflagen:** Rechtsraum ist IMMER Deutschland in allen vier Produkten (keine zweite
Rechtsordnung, kein Österreich/Schweden bauen). Rechtsraum und Sprache bleiben zwei getrennte
Achsen. Bei Überschneidung mit e2s paralleler Ab-Werk-Rangfolge-Arbeit (U2-ADR-369-Umfeld): vorher
absprechen.

## 1 · Der Befund (Schritt 1)

- `RECHTSRAUM_KATALOG` (vivodepot.html) war eine reine Tabelle, nach INSTRUMENT verschlüsselt
  (`typ → .DE → Felder`), materialisiert aus `BUERGERMODUL_BUENDEL` — kein `modulTyp`/`rechtsraum`/
  `moduleVersion`/`anbieterId`-Rahmen, strukturell kein Modul.
- U2-ADR-368 (Zug 1) hatte den Inhalt gehoben: der frühere Erzeuger `rechtsraum-de-modul-erzeugen` (mit dem Gerüst-Schnitt S3 entfallen) baute
  bereits ein echt modul-geformtes `tools/rechtsraum-de-modul.json`. Der einzige Weg dorthin
  (Weg A, `_rechtsraumGeruestModulLaden`, volle TA-Signaturkette) war aber tot — Cert-Tabelle und
  JWS-Konstante beide leer, mangels eines tatsächlich ausgestellten echten Zertifikats.
- `tools/lib/vier-produkte.js`s `PRODUKTE`-Liste kannte `sprachModulPfad`/`proModulPfad`, aber
  kein Rechtsraum-Feld — kein einziges der vier Produkte bekam je ein Rechtsraum-Modul mitgegeben.
- **Entscheidender Nebenfund:** `BUERGERMODUL_BUENDEL` selbst (der heute genutzte, echte Inhalt)
  trägt KEINE Laufzeit-Signaturprüfung — ein nackter `JSON.parse(...)`-Literal, vertraut wie
  `AB_WERK_TEXTSATZ_DE`, weil die ganze Datei das ist, was ausgeliefert wird. Die
  „Signaturpflicht" aus U2-ADR-368 §2 gilt damit faktisch nur für einen KÜNFTIGEN, echten
  ZWEITEN Rechtsraum oder ein späteres echtes TA-Zertifikat für DE selbst — nicht für den heute
  schon eingebetteten deutschen Inhalt, der bereits denselben Vertrauensgrad trägt wie alles
  andere im Gerüst. Bestätigung: „Konfektionieren ist nicht Einlassen. Vivodepot backt
  seine eigenen Module beim Bauen ein, OHNE Signatur; der signierte Einlassweg ist für FREMDE
  Module, die eine Bürgerin hinzufügt."
- Geprüft und NICHT gefunden: `textsatzRechtsraumAktiv()`/`data.rechtsraum` ist eine ANDERE Achse
  (Text-Modul-Auswahl nach `[sprache][rechtsraum]`, U2-ADR-162) — keine Vermischung mit dem
  Rechts-INHALT (`_rechtsraumKatalogLesen`). Sprache und Rechtsraum bleiben im Code getrennt.
  Das ist ein Ergebnis, keine Auslassung: ausdrücklich GESUCHT und NICHT gefunden.

## 2 · Verzahnung mit e2s Ab-Werk-Rangfolge

e2 baut parallel eine dreistufige Rangfolge für Ab-Werk-Module (Ab-Werk-Saat < signiertes
Vor-Depot-Bündel < Wahl der Bürgerin), tabellengetrieben über die Modultypen. Die erste Anweisung
war, auf die fertige Tabellenform zu warten; die zweite, richtiggestellte Anweisung:
die Tabelle ist BESCHREIBEND, nicht vorschreibend — „jeder Modultyp hat eine deklarierte Zeile"
heißt nicht „jeder Modultyp benutzt denselben Saat-Mechanismus" (das wäre Form (a), bewusst
verworfen, weil sie Textsatz und logikModul eine Gemeinsamkeit aufzwingt, die es nicht gibt). Der
Bau folgt darum der Form, die FÜR RECHTSRAUM richtig ist — mit e2 abgesprochen über EINE
zusammenfassende Zeile (Typ, Herkunft der Saat, die drei Stufen für Rechtsraum), nicht über
gemeinsamen Code oder eine gemeinsame Datei.

## 3 · Der Bau (Schritt 2, Besitz-Zug — wörtlich U2-ADR-367s Muster)

**Der Rahmen:** `AB_WERK_RECHTSRAUM_DE` (umbenannt aus `RECHTSRAUM_KATALOG`, s. §9) trägt jetzt
selbst `modulTyp:'rechtsraum'`,
`rechtsraum:'DE'`, `moduleVersion:1`, `anbieterId:'vivodepot'` — die bisherigen sechs
Instrument-Einträge stehen unverändert unter `.typen` (kein Kopieren, kein zweiter Block, nur der
Rahmen kommt dazu, wie bei `AB_WERK_TEXTSATZ_DE`).

**Die Formübersetzung, EINE Quelle statt zwei:** der native Katalog trägt `zweck` eine Ebene ÜBER
`.DE` (rechtsraumunabhängig, U2-ADR-121 Posten 3), ein Modul erwartet sie flach neben
`katalogVersion`/`wortlaut`/`formvorschriften`/`fristenVorrang`. Diese Übersetzung lebte bisher
DUPLIZIERT im früheren Erzeuger `rechtsraum-de-modul-erzeugen` (mit dem Gerüst-Schnitt S3 entfallen); sie lebt jetzt EIN Mal im Kern
(`_rechtsraumKatalogAlsModul()`), und der Erzeuger ruft sie nur noch auf.

**Die Ab-Werk-Saat:** `_rechtsraumAbWerkRegistrySeed()` validiert `AB_WERK_RECHTSRAUM_DE` über
DENSELBEN Gerüst-eigenen Prüfweg wie Weg A (`validateRechtsraumModul(…,
{erlaubtGeruestEigenesDE:true})`, U2-ADR-285) — aber OHNE Signatur, weil es Vivodepots eigener,
eingebackener Inhalt ist (s. §1, Nebenfund). Sät das Ergebnis direkt in
`_RECHTSRAUM_MODUL_REGISTRY['DE']`. Zwei Aufrufstellen, wie bei Sprache: als Anfangswert der
Registry, und erneut als erster Schritt in `_rechtsraumModuleAusDepotAnmelden` — sonst würde
deren Reset auf `Object.create(null)` die Ab-Werk-Saat beim ersten echten Depot-Laden verlieren.

**`_rechtsraumKatalogLesen` verliert seinen separaten nativen Zweig:** vorher drei Zweige (nativ
zuerst, dann Weg A, dann Weg B); jetzt zwei — Weg A (`_RECHTSRAUM_GERUEST_REGISTRY`, höhere
Vertrauensstufe, für ein späteres echtes TA-Zertifikat oder einen echten zweiten Rechtsraum)
zuerst, dann die Modul-Registry (die die Ab-Werk-Saat UND normal angedockte Module trägt).
Dieselbe Kollaps-Bewegung wie bei `textLesen()` in U2-ADR-367.

**Nicht angetastet:** Weg A selbst (`_rechtsraumGeruestModulLaden`, `_RECHTSRAUM_GERUEST_REGISTRY`,
die Cert-Tabelle, die JWS-Konstante) — bleibt exakt wie U2-ADR-368 es baute, für ein späteres
echtes Zertifikat oder einen echten zweiten Rechtsraum. `tools/lib/vier-produkte.js`,
`vier-produkte-erzeugen.js`, `tools/produkt-konfektionieren.js` — unberührt, weil Rechtsraum=DE
konstant über alle vier Produkte ist und automatisch mit der byte-identischen Kopie mitkommt,
keine Pro-Produkt-Verdrahtung nötig (anders als Sprache/Pro, die zwischen Produkten variieren).

## 4 · Zwei Funde beim Bau

1. **Reservierungslücke in `_rechtsraumModuleAusDepotAnmelden` (gefunden, sofort behoben).** Vor
   diesem Zug schützte ALLEIN die Lesereihenfolge (nativer Katalog zuerst) davor, dass ein
   manipulierter/fingierter `data.rechtsraumModule`-Eintrag mit `rechtsraum:'DE'` (strukturell
   über den echten Einlassweg nie erreichbar — `EINLASS_REGISTER` lehnt „DE" dort ab) das Fach
   'DE' überschreibt. Mit der Ab-Werk-Saat IN derselben Registry war diese Reihenfolge-Deckung
   weg: ein bestehender Test (`tests/u2-adr-285-rechtsraum-geruest-modul.test.js`, „ein geladenes
   Gerüst-Modul und eine fingierte Einlassweg-Registry überholen sich nicht gegenseitig") fing
   das sofort — eine fingierte 'DE'-Nutzlast gewann gegen die Ab-Werk-Saat. Behoben durch eine
   explizite Reservierung an der Schreibstelle selbst (`if (m.rechtsraum === 'DE') continue;`),
   genau wie `textsatzModulPruefen` sie für Sprache an ihrer eigenen Schreibstelle durchsetzt.
2. **`_rechtsraumVorschlagswert()` zählte die Ab-Werk-Saat mit.** Die Funktion bestimmt den
   Rechtsraum-Vorschlag für ein neues Dokument aus „genau ein angedockter Rechtsraum" —
   `Object.keys(_RECHTSRAUM_MODUL_REGISTRY).length === 1`. Seit 'DE' IMMER in dieser Registry
   steht, war diese Bedingung nie mehr wahr, sobald ein echtes zusätzliches Modul dazukam (DE +
   Modul = 2) — zwei bestehende Tests (U2-ADR-254, U2-ADR-255) fingen das. Behoben durch
   `'DE'` aus der Zählung auszuschließen: gezählt wird nur, was ECHT zusätzlich zur deutschen
   Ab-Werk-Saat angedockt ist.

Beide Funde wurden von BESTEHENDEN Tests gefangen, keiner erforderte eine neue Probe, um sichtbar
zu werden — ein Beleg dafür, dass die vorhandene Suite die Rechtsraum-Achse bereits ernsthaft
bewachte, auch wenn die Achse selbst kein Modul war.

## 5 · Die Gegenprobe (Auflage 3) — die Tür bleibt offen

Ohne Beweis hätte dieser Zug DE modular gemacht und dabei unbemerkt die Tür für einen echten
zweiten Rechtsraum zugezogen. Drei neue Proben in `tests/rechtsraum-de-modul.test.js`:

- **Ab-Werk-Saat ohne Weg A:** der Lesepfad liefert den Ab-Werk-Inhalt bereits ohne jedes
  geladene Modul.
- **Weg A schlägt die Ab-Werk-Saat (Stufe 2 > Stufe 1):** ein ECHT signiertes Weg-A-Modul für DE
  wird jetzt tatsächlich gelesen, nicht nur strukturell angenommen und ignoriert (vor diesem Zug
  galt: der native Katalog gewinnt IMMER, ein geladenes Weg-A-Modul lag inhaltsgleich daneben,
  ohne je gelesen zu werden — genau die Behauptung, die dieser Zug umkehrt).
- **Koexistenz eines echten zweiten Rechtsraums:** ein synthetisches FR-Modul (bewusst NICHT
  Österreich/Schweden, nur der Mechanismus) wird über Weg A geladen — die Ab-Werk-Saat für DE
  bleibt unberührt, FR ist über denselben Lesepfad erreichbar wie DE, keiner überschreibt den
  anderen.

## 6 · Wortlaut für die Zusammensetzungs-Tabelle (Auflage 2)

Auf Weisung an den zuständigen Strang übergeben und dort in `tools/lib/vier-produkte-zusammensetzung.js`
für alle vier Produkte eingetragen: „Rechtsraum: DE, ab Werk in die Registry gesät, kein
mitgegebenes Artefakt — dieselbe Form wie Sprache DE."

## 7 · Was ausdrücklich NICHT Teil dieses Zugs ist

- **Kein zweiter Rechtsraum gebaut** (Auflage 1) — Österreich, Schweden oder jeder andere Staat
  bleiben eine eigene, spätere Produktentscheidung.
- **Kein echtes TA-Zertifikat ausgestellt** — bleibt ein eigener, manueller Akt (TA-Anker-
  Schlüssel), unverändert seit U2-ADR-368 §5.

## 8 · Reservierung und Drei-Stufen-Rangfolge widersprechen sich nicht (Nachtrag)

e2 baut parallel eine dreistufige Rangfolge für Ab-Werk-Module: Ab-Werk-Saat < signiertes
Vor-Depot-Bündel < Wahl der Bürgerin — die Bürgerin gewinnt immer. Auf den ersten Blick sieht das
wie ein Widerspruch zur DE-Reservierung aus (§4, Fund 1): dort gewinnt AUSSCHLIESSLICH das
Gerüst, nie die Bürgerin. Beide Sätze regeln VERSCHIEDENES:

- Die Rangfolge sagt, WELCHES Modul aktiv ist. Dort gewinnt die Bürgerin, immer.
- Die Reservierung sagt, WER „DE" heißen darf. Dort gewinnt niemand außer dem Gerüst.

Eine Bürgerin kann jederzeit einen anderen Rechtsraum andocken und aktivieren — sie kann nur
nicht umdefinieren, was „DE" bedeutet. Das ist Schutz, nicht Bevormundung: ein fremdes Modul soll
sich nicht als der amtliche deutsche Rechtsraum ausgeben können. Ohne diesen Satz sieht die
Reservierung bei einem künftigen Lesen wie eine Verletzung von Stufe 3 aus und würde als
Widerspruch „repariert" — sie ist keiner.

## 9 · Umbenennung für e2s Ab-Werk-Wächter (Nachtrag, 08.09.2026)

e2s tabellengetriebener Ab-Werk-Rangfolge-Wächter (`tools/ab-werk-rangfolge-pruefen.js`) erkennt
Ab-Werk-Mechanismen NICHT über eine Ausnahmeliste, sondern GENERISCH über die Namenskonvention
`const AB_WERK_*` — verifiziert gegen alle heute bekannten echten Konstanten, keine Annahme.
`RECHTSRAUM_KATALOG` folgte dieser Konvention nicht und wäre für diesen Wächter unsichtbar
geblieben — nicht als „unerklärt" (das würde wenigstens auffallen), sondern GAR NICHT, weil das
Muster nicht greift. Genau die Falle, vor der wiederholt gewarnt wurde: ein Wächter, der die
Landkarte des Bewachten übernimmt, statt sie selbst zu ziehen.

**Entscheidung:** umbenennen, nicht manuell in e2s Wächter aufnehmen. Eine manuelle Ausnahme hätte
e2s Wächter von „automatisch verifiziert" auf „an dieser Stelle behauptet" zurückgestuft — genau
das Muster, das dieser ganze Zug beseitigen sollte. `RECHTSRAUM_KATALOG` → `AB_WERK_RECHTSRAUM_DE`
(und `_RECHTSRAUM_KATALOG_MATERIALISIERT` → `_AB_WERK_RECHTSRAUM_DE_MATERIALISIERT`), mechanischer
Rename über Kern, sieben Werkzeuge und zwölf Testdateien, dieselben Werte, dieselbe Struktur.

**Nebenbei behoben, weil selbst gefunden und explizit benannt (Vorgabe: „nicht so lassen"):**
`tools/rechtsraum-katalog-ins-buendel-schreiben.js` — die U2-ADR-352-Migration, deren eigener
Anker im Kern schon seit ihrer eigenen Ausführung nicht mehr existiert und die darum bei jedem
Aufruf wirft, unabhängig von diesem Zug. Ein Werkzeug, das wirft, sieht benutzbar aus und ist es
nicht — schlimmer als eine tote Ausnahme. Kein Verbraucher (kein Test, kein anderes Werkzeug)
referenzierte es; entfernt statt nur gekennzeichnet.

## 10 · Stand

Kern-Restrukturierung abgeschlossen, zwei Funde beim Bau gefangen und behoben (bestehende Tests,
keine neue Probe nötig), drei neue Gegenproben für die Koexistenz mit Weg A, anschließend auf
e2s Ab-Werk-Konvention umbenannt und ein totes Migrationswerkzeug entfernt. Volle Suite grün nach
jedem Schritt. Nicht gepusht — Landung über den Konvoi, wie bei den vorherigen Zügen.
