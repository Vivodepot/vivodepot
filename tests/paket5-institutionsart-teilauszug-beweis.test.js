'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-274 (04.09.2026) — Paket 5, institutionsArt: die Fähigkeit bewiesen,
   der native Bestand unangetastet
   ────────────────────────────────────────────────────────────────────────────
   NICHT das, was der Name „Teilauszug" zuerst vermuten lässt: die zwölf nativen
   Institutions-Arten werden hier NICHT aus `INSTITUTION_ART`/
   `INSTITUTION_ART_EINGEBAUT` entfernt. Zwei unabhängige Gründe, beide in
   U2-ADR-274 ausführlich:

     1. Ein echtes, laufzeit-eingelassenes Modul bräuchte ein gegen Vivodepots
        eigenen Anker signiertes Bündel (Konzept „Bürgerdepot als Modul",
        Nachtrag „Provisionierung vs. Ladeweg", 03.09.2026 abends: „kein
        zweiter, schwächerer Pfad"). CC darf mit Schlüsselmaterial nicht
        umgehen (stehende Regel) — dieser Test tut es folgerichtig auch nicht.
     2. Der Betriebsweg der Signierung (bei jedem Build vs. einmalig gepflegt)
        ist eine offene BETRIEBS-Entscheidung, keine technische Frage, die
        dieser Test lösen könnte oder sollte.

   Was hier stattdessen bewiesen wird, auf demselben Niveau wie U2-ADR-246/
   -250/-251 (Situationen/Assistenten/Ereignis-Achse werden andockbar — der
   Zugang wird geöffnet und bewiesen, der native Bestand bleibt liegen):
   **würden die zwölf nativen Kennungen durch ein Modul mit demselben Inhalt
   ersetzt, wäre die einzige sichtbare Fläche (die Dropdown-Optionsliste in
   `_institutionFelder`) byte-identisch zu heute.** Kein Gedankenspiel — der
   Beweis läuft gegen eine echte, zur Testzeit erzeugte Kernkopie, in der
   `INSTITUTION_ART_EINGEBAUT` tatsächlich leer ist, über denselben
   Registrierungsweg wie ein echtes Modul (`_institutionsArtenAusDepotAnmelden`
   über `data.institutionsArten[]` — kein Mocking von `institutionsArtenAlle()`
   oder der Prüf-Funktion selbst).

   Diese Kernkopie entsteht NUR in einem temporären Verzeichnis, verändert
   `vivodepot.html` nicht — der native Bestand ist nach diesem Commit exakt so
   vorhanden wie davor, das ist der Sinn dieses Nachweis-Niveaus.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PW = 'paket5-institutionsart-beweis-pw';

const ECHTE_ZWOELF = Object.freeze({
  krankenkasse: 'Krankenkasse', pflegekasse: 'Pflegekasse', pflegedienst: 'Pflegedienst',
  krankenhaus: 'Krankenhaus', arztpraxis: 'Arztpraxis', bestatter: 'Bestatter',
  bank: 'Bank', versicherung: 'Versicherung', standesamt: 'Standesamt',
  meldebehoerde: 'Meldebehörde', behoerde: 'Behörde', arbeitgeber: 'Arbeitgeber',
});

// Baut eine Kernkopie, in der INSTITUTION_ART_EINGEBAUT leer ist — die
// simulierte Nach-Extraktions-Lage, ohne die echte Datei anzufassen.
function kernkopieOhneNativeInstitutionsarten() {
  const echterPfad = path.join(__dirname, '..', 'vivodepot.html');
  const html = fs.readFileSync(echterPfad, 'utf8');
  const marker = "const INSTITUTION_ART_EINGEBAUT = Object.freeze([\n"
    + "  'krankenkasse', 'pflegekasse', 'pflegedienst', 'krankenhaus', 'arztpraxis', 'bestatter',\n"
    + "  'bank', 'versicherung', 'standesamt', 'meldebehoerde', 'behoerde', 'arbeitgeber',\n"
    + "]);";
  if (!html.includes(marker)) {
    throw new Error('INSTITUTION_ART_EINGEBAUT-Block nicht im erwarteten Wortlaut gefunden — '
      + 'Test veraltet gegen den aktuellen Kern (nach U2-ADR-275), nicht stillschweigend anpassen.');
  }
  const geaendert = html.replace(marker, 'const INSTITUTION_ART_EINGEBAUT = Object.freeze([]);');
  const zielVerzeichnis = fs.mkdtempSync(path.join(os.tmpdir(), 'paket5-institutionsart-beweis-'));
  const zielPfad = path.join(zielVerzeichnis, 'vivodepot-institutionsart-leer.html');
  fs.writeFileSync(zielPfad, geaendert);
  return zielVerzeichnis;
}

function ladeMitPfad(kernHtmlPfad) {
  const vorher = process.env.KERN_HTML_PATH;
  if (kernHtmlPfad === undefined) delete process.env.KERN_HTML_PATH;
  else process.env.KERN_HTML_PATH = kernHtmlPfad;
  delete require.cache[require.resolve('./load-kern.js')];
  const { ladeKern } = require('./load-kern.js');
  const ergebnis = ladeKern();
  if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
  return ergebnis;
}

const artOptionen = (V) => V._institutionFelder().unterFelder.find((f) => f.id === 'art').optionen;

test('[Paket5·institutionsArt·Beweis] Dropdown-Optionsliste ist byte-identisch, ob nativ oder vollständig moduliert', async () => {
  // Referenz: der heutige, unveränderte Kern.
  const { V: VEcht } = ladeMitPfad(undefined);
  await VEcht.depotAnlegen(PW);
  VEcht.akteurSelbstErklaeren('Beweis-Testerin');
  const referenz = artOptionen(VEcht);
  assert.equal(referenz.length, 12, 'Vorbedingung: heute genau zwölf native Arten');

  // Simulation: dieselbe Datei, INSTITUTION_ART_EINGEBAUT geleert — die
  // Nach-Extraktions-Lage — plus ein Modul mit exakt demselben Inhalt.
  const tempVerzeichnis = kernkopieOhneNativeInstitutionsarten();
  try {
    const { V: VSim } = ladeMitPfad(path.join(tempVerzeichnis, 'vivodepot-institutionsart-leer.html'));
    assert.equal(VSim.INSTITUTION_ART_EINGEBAUT.length, 0,
      'Vorbedingung der Simulation: leer, wie nach einer echten Extraktion');

    await VSim.depotAnlegen(PW);
    VSim.akteurSelbstErklaeren('Beweis-Testerin');
    VSim.getData().institutionsArten = [
      { herkunft: 'buergerdepot-modul-simulation', moduleVersion: 1, sprache: 'de', arten: { ...ECHTE_ZWOELF } },
    ];
    const n = VSim._institutionsArtenAusDepotAnmelden(VSim.getData());
    assert.equal(n, 1, 'Modul muss angenommen werden, Grund bei 0: ' + JSON.stringify(VSim.INSTITUTION_ART_VERWORFEN));
    assert.deepEqual(VSim.INSTITUTION_ART_VERWORFEN, [], 'keine der zwölf darf als "reserviert" oder sonst verworfen werden');

    const simuliert = artOptionen(VSim);
    assert.deepEqual(simuliert, referenz,
      'byte-identisch: dieselben zwölf {wert,label}-Paare, dieselbe Reihenfolge, ob nativ oder moduliert');
  } finally {
    fs.rmSync(tempVerzeichnis, { recursive: true, force: true });
  }
});

// [Rot-Beleg] (A348 Zug 4): die Probe oben wäre auch grün, wenn sie nichts prüfte — dieser Test
// zeigt, dass sie es tut. Dasselbe Modul, aber mit ELF statt ZWÖLF Arten (eine fehlt absichtlich):
// die Hauptprobe (byte-identisch, dieselbe Reihenfolge) MUSS an genau dieser Lücke rot werden.
test('[Rot-Beleg] eine unvollständige Modul-Antwort (elf statt zwölf Arten) macht die Hauptprobe rot', async () => {
  const { V: VEcht } = ladeMitPfad(undefined);
  await VEcht.depotAnlegen(PW);
  VEcht.akteurSelbstErklaeren('Beweis-Testerin');
  const referenz = artOptionen(VEcht);

  const tempVerzeichnis = kernkopieOhneNativeInstitutionsarten();
  try {
    const { V: VSim } = ladeMitPfad(path.join(tempVerzeichnis, 'vivodepot-institutionsart-leer.html'));
    await VSim.depotAnlegen(PW);
    VSim.akteurSelbstErklaeren('Beweis-Testerin');
    const { krankenkasse, ...ELF_STATT_ZWOELF } = ECHTE_ZWOELF;
    VSim.getData().institutionsArten = [
      { herkunft: 'buergerdepot-modul-simulation', moduleVersion: 1, sprache: 'de', arten: { ...ELF_STATT_ZWOELF } },
    ];
    const n = VSim._institutionsArtenAusDepotAnmelden(VSim.getData());
    assert.equal(n, 1, 'Modul muss auch mit elf Arten angenommen werden, Grund bei 0: '
      + JSON.stringify(VSim.INSTITUTION_ART_VERWORFEN));

    const simuliert = artOptionen(VSim);
    assert.notDeepEqual(simuliert, referenz,
      'ROT ERWARTET, sobald die Hauptprobe wieder byte-identisch meldete: mit nur elf statt zwölf '
      + 'Arten muss der Vergleich tatsächlich scheitern — sonst prüft die Hauptprobe nichts, was '
      + 'ein fehlerhaftes Modul überhaupt aufdecken könnte.');
  } finally {
    fs.rmSync(tempVerzeichnis, { recursive: true, force: true });
  }
});
