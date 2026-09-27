# U2-ADR-187: Bereichs-Identität überlebt das Verwaisen

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** DATENINTEGRITÄT
**Linie:** U2
**U2-Bezug:** Ergänzt U2-ADR-050 (Rettungsfeld-Muster, Umzug statt Löschung) um die eine Ebene,
die dort noch fehlte. Verwandt, nicht abgelöst: eine unabhängige interne Messung derselben
Nacht befasst sich mit der Zusicherung „ein gekauftes Modul bleibt nutzbar" auf der
Zertifikats-/Widerruf-Ebene; diese ADR behandelt eine andere Frage (bleibt der Bereich LESBAR,
nicht bleibt er BENUTZBAR) und lässt jene unberührt.
**Anker:** Eine rein lesende Erhebung am 01.09.2026, freigegeben.
Vier Sitzungen arbeiteten parallel an `vivodepot.html`; Region-Absprache mit einer
Parallel-Sitzung (Einlass-Register, `:13000-13100`) — diese ADR fasst `bereicheAlle()`
(`:13072`) ausdrücklich nicht an.
**Status heute:** gilt — Beleg `tests/bereich-identitaet-verwaist.test.js` (17 Proben).

---

## Kontext

U2-ADR-050 sichert zu: verliert ein Bereich sein Modul, gehen seine WERTE nicht verloren, sie
wandern nach `data.bereicheVerwaist[<id>]` (Umzug, keine Löschung). Feld-Beschriftungen ziehen
seit Zug 4 mit (`data.feldDefinitionenVerwaist[].label`).

Was dabei nie mitgezogen ist: der Name des Bereichs selbst — die Rubriküberschrift, die eine
Bürgerin in der Seitenleiste sah, bevor er verschwand. Gemessen (Zug 0): `label`/`icon` eines
angedockten Bereichs leben ausschließlich als Getter am Registry-Objekt
(`bereichsModulPruefen`, `get label() { return _bereichLabelText(id, label); }`) — verschwindet
das Modul, verschwindet der Getter mit. Es gibt keine Kopie in `data`. Ein verwaister Bereich
liegt damit als nackter `{feldId: wert}`-Eintrag unter `bereicheVerwaist`, ohne dass irgendwo
noch stünde, wie er hieß.

**Der entscheidende Unterschied zu den Feld-Beschriftungen:** eine Feld-Definition lässt sich
beim Verwaisen selbst noch retten — sie liegt bereits in `data.feldDefinitionen[]`. Die
Bereichs-Identität nicht: ihre einzige Quelle (das Modul) ist im Moment des Verwaisens schon
weg. Sie muss darum **laufend** vorgehalten werden, solange der Bereich noch bekannt ist — nicht
nachträglich beschafft werden können.

## Entscheidung

**Ein Bereich, der verwaist, bleibt über seinen Namen auffindbar — nicht nur über seine rohe
Bereichs-ID.**

Drei Teile, additiv, ohne Schema-Anhebung (`SCHEMA_VERSION_AKTUELL` bleibt bei 75):

1. **`_sektorIndexNeuBauen()`** (`vivodepot.html:12656`, läuft bei jedem Andocken und jedem
   Laden) schreibt für jeden `angedockt`en Bereich zusätzlich einen Schnappschuss
   `data.bereichsIdentitaeten[<id>] = { label, icon }`. Nur angedockte Bereiche — die
   eingebauten zwölf sind reserviert (`BEREICH_IDS_EINGEBAUT`) und können nicht verwaisen.

2. **`_bereicheVerwaisteRetten()`** nimmt den zuletzt bekannten Schnappschuss beim Verwaisen mit
   — eigener Namensraum `data.bereicheVerwaistIdentitaet[<id>]`, dasselbe Umzugsmuster wie bei
   `feldDefinitionenVerwaist`. Bewusst **kein** Zusatzschlüssel im flachen
   `bereicheVerwaist[<id>]`-Raum selbst: der ist `{feldId: wert}`, ein Schlüssel wie `label`
   wäre von einem echten, gleichnamigen Feld nicht zu unterscheiden — dieselbe Begründung, die
   `feldGueltigkeit` bereits einen eigenen Namensraum statt eines Feld-Zusatzschlüssels trägt
   (Kommentar an `depotNormalisieren`, Schema 63→64). Kehrt der Bereich zurück, räumt sich der
   Slot; `_sektorIndexNeuBauen` schreibt ohnehin sofort wieder einen frischen, laufenden Eintrag.

3. **`bereicheVerwaisteAlle()`** — eine **neue, eigenständige** Lesefunktion, die Identität
   (Schritt 1/2), Feld-Beschriftungen (`feldDefinitionenVerwaist`, bereits vorhanden) und Werte
   (`bereicheVerwaist`, bereits vorhanden) zu einer anzeigbaren Liste zusammenführt.

**Die rückwirkende Notlösung.** Ein Bereich, der schon vor dieser ADR verwaist ist, hat nie einen
Schnappschuss bekommen — sein Name ist unwiederbringlich weg. `bereicheVerwaisteAlle()` leitet in
diesem Fall einen Anzeigenamen aus der ID selbst ab (`_bereichAnzeigenameAusId`,
z. B. `fremde-daten-in-obhut` → `Fremde Daten In Obhut`) und markiert das ausdrücklich
(`identitaetRekonstruiert: true`) — nie als der ursprüngliche Name ausgegeben. **Gemessen (Zug 0,
`vivodepot.html:12825`): „es gibt NULL ausgelieferte Module"** — der rückwirkende Fall ist heute
real leer. Die Notlösung ist trotzdem gebaut und geprüft, für den Tag, an dem er es nicht mehr
ist.

**Exportsperren, symmetrisch zu den Geschwistern.** `bereicheVerwaistIdentitaet` steht auf
derselben Rückhalteliste wie `bereicheVerwaist`/`feldDefinitionenVerwaist`
(`VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL`, beiläufiger Export hält sie zurück) und derselben harten
Sperre (`EMPFAENGER_NIE`, ein Empfänger-Baustein bekommt sie nie). Der Umzugsfall bleibt möglich:
`{sensibel: true}` gibt sie vollständig mit. `data.bereichsIdentitaeten` (die LAUFENDE Liste, für
aktive Bereiche) steht auf keiner der beiden Listen — ein Bereichsname ist so wenig sensibel wie
der Name in der Seitenleiste selbst, die niemand hinter einer Sensibel-Schranke versteckt.

## Die wichtigere Zusicherung — was diese ADR ausdrücklich NICHT ändert

**`bereicheAlle()` (`vivodepot.html:13072`) wird nicht erweitert.** Der Kommentar über
`_bereicheVerwaisteRetten` macht die Trennung „ein verwaister Bereich zählt nicht als gültig"
bereits zur Zusicherung — Zähler, Export-Mapping und Vollständigkeits-Prüfungen hängen an
`bereicheAlle()`. Eine naheliegende, aber falsche Reparatur wäre gewesen, `bereicheAlle()` selbst
verwaiste Bereiche mitliefern zu lassen — das hätte zwölf Aufrufstellen (Sidebar, Vollexport,
Vollsicherung, Import-Zielsektoren, Cluster-Gruppierung, Gesamt-PDF, Suche, Herausgeben-Weg u. a.)
auf einmal versorgt, aber genau diese Zusicherung gebrochen. `bereicheVerwaisteAlle()` ist darum
eine **eigene** Funktion, kein Zusatz.

Diese Trennung ist die wichtigere Probe der beiden unten — sie schützt nicht neuen Code, sondern
eine bereits bestehende Zusicherung davor, später versehentlich aufgeweicht zu werden.

## Ausdrücklich nicht behandelt

- **Welche der zwölf `bereicheAlle()`-Aufrufstellen einen verwaisten Bereich anzeigen sollen, ist
  eine Design-/Platzierungsfrage, keine dieser ADR.** Naheliegend, aber hier nicht entschieden:
  Sidebar und Gesamt-PDF vermutlich ja (damit die Bürgerin ihre Werte wiederfindet), Zähler und
  Import-Zielsektoren vermutlich nein (das ist die geschützte Zusicherung selbst). Ohne visuelle
  Prüfmöglichkeit für die DOM-Seite dieser Anwendung an dieser Stelle nicht blind gebaut — bleibt
  offen.
- **`vivodepot-lesen.html`** kannte das Andock-/Verwaisen-Konzept bis zum 19.09.2026 gar nicht
  (0 Treffer, Positivkontrolle gefahren). **Nachtrag 19.09.2026 (MIG3):** `_bereicheVerwaisteRetten`
  und `_proIdentitaetUebernehmen` sind seither auch dort verdrahtet — GENERIERT, nicht von Hand
  kopiert (`tools/build-kennung-mapping-region.js`, Region `BEREICHE-VERWAISTE-RETTEN-LESEN`, mit
  eigenem Drift-Wächter), damit es weiterhin genau eine Fassung des Rettungs-Codes gibt. Eine
  Namens-Anpassung dabei: `bereichsModulPruefen` heißt in der Lese-App `bereichsModulPruefenLesen`
  (gleiche Signatur bei Aufruf ohne `opt`).

  **Bewusste Abweichung zum Kern, weil die Lese-App etwas nicht kann:** der Vorrang-Fall
  „Bürgerin war schneller — nicht überschreiben" in `_bereicheVerwaisteRetten` beschreibt laufende,
  konkurrierende Bearbeitung — die es in einer read-only Lese-App PER DEFINITION nicht gibt (eine
  Sitzung, ein Laderaum, kein Schreibweg). Der Code bleibt unverändert (der Zweig trifft dort nie
  zwei widersprüchliche Werte an), nur das Szenario selbst tritt nie ein. Zweitens: die Rettung
  wird bei JEDEM Öffnen neu berechnet, nie in eine Datei zurückgeschrieben — anders als im Kern,
  wo ein nachfolgendes Sichern den geretteten Zustand dauerhaft macht. `bereicheVerwaisteAlle()`
  (Schritt 3 unten) ist NICHT mitgezogen — dieselbe „eigenständige Anzeigefunktion, Design-/
  Platzierungsfrage" wie im Abschnitt „Ausdrücklich nicht behandelt" oben, weiterhin offen.
  Beleg: `tests/migration-mig3-bereiche-verwaiste-retten-lesen.test.js`.
- Die Zertifikats-/Widerruf-Ebene aus `rat-gekauftes-modul-bleibt-2026-09-01.md` — separates
  Thema, s. U2-Bezug oben.

## Konsequenzen

**Für die Bürgerin:** ein Bereich, dessen Modul verschwindet (Widerruf, abgelaufener Anbieter,
verschärfte Kernfassung ohne Migration — s. rat-Bericht), verliert nicht mehr seinen Namen,
sobald jemand die richtige Anzeige dafür baut. Bis dahin ist der Name im Depot gesichert, auch
wenn noch nirgends angezeigt.

**Für den nächsten Bau:** `bereicheVerwaisteAlle()` liefert eine fertige, geprüfte Grundlage.
Wer eine Anzeige baut, entscheidet die Aufrufstellen-Frage aus dem Abschnitt „Ausdrücklich nicht
behandelt" und braucht `bereicheAlle()` dafür nicht anzufassen.

## Konformität

```konformitaet
aussage:  Verwaist ein angedockter Bereich, wandert sein zuletzt bekannter Name/Icon mit —
          `bereicheVerwaisteAlle()` zeigt ihn mit Identität, nicht nur mit roher Bereichs-ID.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/bereich-identitaet-verwaist.test.js#[Teil2·Rot] verwaist ein Bereich, wandert die Identität mit — eigener Namensraum
pruefung: tests/bereich-identitaet-verwaist.test.js#[Teil3·DIE ANTWORT] ein verwaister Bereich ist über die neue Funktion lesbar, mit Namen
```

```konformitaet
aussage:  Ein verwaister Bereich zählt weiterhin NICHT als gültiger Bereich — `bereicheAlle()`
          und der davon abhängige Index führen ihn nicht, unabhängig von der neuen Lesefunktion.
zustand:  geprüft
herkunft: invariante
pruefung: tests/bereich-identitaet-verwaist.test.js#[Guard·DIE WICHTIGERE PROBE] ein verwaister Bereich taucht in bereicheAlle() NICHT auf
```

```konformitaet
aussage:  Ohne Identitäts-Schnappschuss (rückwirkender Fall, heute real leer) liefert
          `bereicheVerwaisteAlle()` einen aus der ID abgeleiteten Anzeigenamen und markiert ihn
          ausdrücklich als Notlösung — nie als den ursprünglichen Namen.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/bereich-identitaet-verwaist.test.js#[Teil3·Rückwirkender Fall] ohne Identitäts-Schnappschuss: Notlösung, ausdrücklich markiert
```

```konformitaet
aussage:  Ein Bereich, den der Kern nach dem Verwaisen wieder erkennt und aus bereicheVerwaist
          zurückholt, zeigt die Lese-App identisch — dasselbe alte Depot durch Kern und
          Lese-App gefahren, gleiches Ergebnis (Nachtrag 19.09.2026, MIG3).
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/migration-mig3-bereiche-verwaiste-retten-lesen.test.js#[MIG3] bereicheVerwaist: Lese-App = Kern — dieselbe Rettung nach sektoren, in JEDEM Bereich
pruefung: tests/migration-mig3-bereiche-verwaiste-retten-lesen.test.js#[MIG3·Drift] die generierte BEREICHE-VERWAISTE-RETTEN-LESEN-Region ist aus dem Kern erzeugt — kein Drift
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
