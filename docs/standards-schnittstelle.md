# Standards-Register und Prüf-Rahmen

Vivodepot soll die relevanten Standards wirklich lesen und schreiben und jedes Erzeugnis gegen den
offiziellen Prüfer der jeweiligen Autorität messen. Dieses Dokument ist der Vertrag, gegen den
Register, Beschaffung und Prüfer-Adapter gebaut sind. Geprüft wird er von
`tools/standards-register-pruefen.js` und `tests/standards-register-schnittstelle.test.js`.

## 1. Das Register

Je Familie eine Datei `tools/standards-register/<familie>.json`:

```json
{
  "familie": "fhir-ig",
  "adapter": "hl7-fhir-validator",
  "standards": [
    {
      "id": "ips",
      "name": "International Patient Summary Implementation Guide",
      "version": "2.0.0",
      "herausgeber": "HL7 International / Patient Care",
      "quelle": { "url": "https://…", "abgerufen": "2026-09-28" },
      "lizenz": { "status": "geprueft", "text": "woher die Angabe stammt" },
      "richtung": ["schreiben", "lesen"],
      "bereich": "gesundheit",
      "status": "echt",
      "artefakte": ["hl7-validator-cli-6.9.12", "hl7-fhir-uv-ips-2.0.0"],
      "exportwege": ["fhir-ips"],
      "importwege": ["fhir-ips"],
      "bezuege": null,
      "grund": null
    }
  ]
}
```

| Feld | Werte, Regel |
|---|---|
| `familie` | `fhir-ig` · `xml-xsd` · `rdf-shacl` · `json-schema` · `signatur` · `codeliste` · `pdf` · `text-rfc` · `barrierefreiheit`; der Dateiname ist die Familie |
| `adapter` | die `id` eines Prüfer-Adapters (Datei in `tests/konformitaet/adapter/` oder inline-Eintrag in `VALIDATOREN`), oder `null` |
| `status` | `echt` · `teilweise` · `orientiert` · `fehlt` · `strukturell-nicht-erzeugbar` · `kein-standard-vorhanden`; die letzten beiden verlangen `grund` |
| `lizenz.status` | `geprueft` · `rueckfrage-offen` (mit `rueckfrage.an` und `rueckfrage.datum`) · `genehmigung-noetig`; `text` nennt, woher die Angabe stammt |
| `richtung` | `lesen` · `schreiben` · `verwahren` · `empfangen` · `pruefen` · `vorzeigen` · `selbstauskunft-ausgeben` |
| `bereich` | `gesundheit` · `verwaltung` · `identitaet` · `finanzen` · `bildung` · `dokumente` · `querschnitt` |
| `exportwege` / `importwege` | Kennungen aus `EXPORT_FORMATE` / `IMPORT_FORMATE` des Kerns; dürfen leer sein |
| `bezuege` | `null` oder eine Liste von Datensatz-Kennungen aus `bereiche/bezuege-quellen.json` |

**`echt` verlangt:** einen Adapter, der über diesen Standard urteilt (`standards`), `lizenz.status`
`geprueft` und jedes Artefakt im Manifest. Die Struktur ist nur die Voraussetzung: grün misst die
Konformitäts-Suite. Im Gate-Modus (`VD_EXTERN_GATE=1`) ist ein Prüfer, an dem ein `echt`-Standard
hängt und der nicht gemessen werden kann, rot.

**Holder-Regel:** Standards der Familie `signatur` und alle Standards mit `bereich: bildung` tragen
nur `empfangen` · `pruefen` · `verwahren` · `vorzeigen` · `selbstauskunft-ausgeben` (und `lesen`),
nie `schreiben`. Vivodepot verwahrt fremd ausgestellte Nachweise und gibt sie unverändert heraus.
Es stellt keine aus. `selbstauskunft-ausgeben` ist die unsignierte, als Selbstauskunft
gekennzeichnete Ausgabe (U2-ADR-030).

## 2. Das Beschaffungs-Manifest

`tools/standards-artefakte.json`, eine Liste. Je Artefakt `id`, `art` (`werkzeug` oder `daten`),
`version`, `lizenz` und **genau eine** Beschaffungsform:

- `url` (https) und `sha256`: eine Datei, gepinnt nach SHA-256; `entpacken`: `null`, `zip` oder `tgz`.
- `docker`: `<image>@sha256:<digest>`, gepinnt nach Digest, nie nach Tag (nur `werkzeug`).
- `quelle`: `<repo-url>@<Tag-Objekt-SHA>`, aus der gepinnten Quelle gebaut (nur `werkzeug`).

Kein Re-Hosting und keine Kopie im Repo: beschafft wird in einen lokalen Cache
(`VD_STANDARDS_CACHE`, Vorgabe `~/.cache/vivodepot-standards/<id>/`). Scheitert die Beschaffung am
Netz, bleibt der Prüfer ungemessen. Weicht die Prüfsumme ab, ist das rot. Das HL7-Werkzeug beschafft
weiterhin sein eigener, schon bestehender Beschaffungsweg; der Manifest-Eintrag spiegelt Version und SHA-256.

## 3. Der Prüfer-Adapter

Eine Datei je Familie in `tests/konformitaet/adapter/<adapter>.mjs` (Dateien mit `_`-Präfix sind
Hilfen). `externe-validatoren.mjs` hängt sie hinter seine inline-Einträge.

```js
export default {
  id: 'itb-shacl',                 // = "adapter" im Register
  familie: 'rdf-shacl',
  autoritaet: '…',                 // wer urteilt
  prueft: '…',                     // was geprüft wird
  werkzeugVersion: '1.13.0',
  werkzeug: 'itb-shacl-validator-1.13.0',   // Artefakt-Kennung im Manifest
  standards: ['edc-ap'],           // Register-Kennungen, über die dieser Adapter urteilt
  vorhanden() {},                  // → { ok: true, … } oder { ok: false, grund }
  urteile(umgebung, dateiPfad, standardId) {},   // → { gelesen, gueltig, fehler: [] }
  async artefakte() {},            // → [{ name, standard, pfad, erwartet: 'gueltig'|'ungueltig', herkunft, warum }]
  async kaputt() {},               // → [{ standard, pfad, warum }] — je Standard ein beschädigtes Erzeugnis
};
```

- **Es zählt der Bericht des Prüfers, nicht sein Rückgabecode.**
- **`herkunft` je Fall:** `generator` (der Kern erzeugt), `kern-rundweg` (ein gepinntes offizielles
  Beispiel läuft durch den Kern, geprüft wird, was er wieder herausgibt) oder
  `offizielles-beispiel` (die Eingangsdatei selbst, nur als Kontrolle des Prüfers).
- **Hilfen** in `_umgebung.mjs`: `javaPfad(minVersion)`, `artefaktPfad(id)`, `arbeitsVerzeichnis()`.
- **Altform:** Der inline-Eintrag `hl7-fhir-validator` hat kein `standards`-Feld. Für ihn gelten die
  bisherigen Regeln (beide Erwartungen unter den Fällen, `kaputt()` als ein Objekt).

**Der Lauf** (`npm run test:konformitaet:extern`):
- Jeder vorhandene Prüfer urteilt. Ein fehlender steht als ungemessen da, nie als grün.
- Je Standard eines Adapters muss es einen `gueltig`-Fall geben, und jeder `kaputt()`-Fall muss
  abgelehnt werden.
