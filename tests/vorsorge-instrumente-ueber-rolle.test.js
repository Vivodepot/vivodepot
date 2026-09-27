'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-279 — `vorsorge_instrumente` über die Rolle `instrumenteListe`, nicht
   über den hartkodierten Feldnamen (Bündel D, tpl_-Präfix-Umstellung)
   ────────────────────────────────────────────────────────────────────────────
   Zwei Funktionen fragten bislang `feldId === 'vorsorge_instrumente'` direkt ab,
   obwohl die Rolle `instrumenteListe` seit Wochen existiert. Diese Datei beweist
   BEIDE Richtungen — nicht nur, dass der Bau grün ist:

   1. Bit-Identität: unveränderter Stand vs. dieser Stand → identisches Ergebnis
      für jeden heute erreichbaren Aufruf (die Probe, die ein grüner Haken ohne
      Deckung NICHT hätte — sie prüft den ECHTEN Kollisionsfall, kein Vakuum).
   2. Rot-Beweis: dieselbe Probe gegen eine mutierte Kopie von vivodepot.html
      (Rolle zeigt auf ein anderes Ziel) — MUSS umkippen, sonst wäre unbewiesen,
      dass der Code wirklich über die Rolle liest statt zufällig gleich auszusehen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

async function pruefeGegenLebendenKern() {
  const { V } = ladeKern();
  await V.depotAnlegen('u2-279-pw');
  V.akteurSelbstErklaeren('Tester');
  const html = V.situationSektorZeileHTML('advanceCare', 'instrument:living-will');
  const klickFeld = (/data-klick-feld="([^"]*)"/.exec(html) || [])[1] || null;

  // Echte Kollision provozieren — ohne bestehenden Eintrag wäre das Ergebnis in JEDEM
  // Stand {ok:true} und bewiese nichts (Vakuum-Falle, U2-ADR-108 lässt grüßen).
  const dat = V.getData();
  if (!dat.sektoren.advanceCare) dat.sektoren.advanceCare = {};
  dat.sektoren.advanceCare.provisionInstruments = [{ id: 'bestand-1', instrument: 'will' }];
  const feldObj = { unterFelder: [] };
  const neu = { instrument: 'will', typeOfPowerOfAttorney: undefined };

  return {
    klickFeld,
    kollisionVorsorge: V._listenEintragPruefen('advanceCare', 'provisionInstruments', feldObj, neu, -1),
    kollisionFalscherSektor: V._listenEintragPruefen('people', 'provisionInstruments', feldObj, neu, -1),
  };
}

test('[U2-ADR-279] situationSektorZeileHTML + _listenEintragPruefen lesen die Rolle korrekt (echte Kollision, kein Vakuum)', async () => {
  const r = await pruefeGegenLebendenKern();
  assert.equal(r.klickFeld, 'provisionInstruments');
  assert.deepEqual(r.kollisionVorsorge, { ok: false, grund: 'einzigartig' },
    'eine ECHTE Kollision im richtigen Sektor muss weiterhin erkannt werden');
  assert.deepEqual(r.kollisionFalscherSektor, { ok: true },
    'derselbe Feldname in einem Sektor OHNE die Rolle instrumenteListe darf keine Kollision auslösen');
});

/* ── Rotmachbarkeit gegen eine ECHTE Fehlzuweisung der Rolle ─────────────────────
   Mutiert `rollen.instrumenteListe` am vorsorge-Sektor auf ein Fantasie-Ziel, in einer
   Kopie der echten vivodepot.html — derselbe KERN_HTML_PATH-Umlenkweg wie bei den
   Migrationsketten-Rotmachbarkeits-Proben. Zeigt beide Stellen läsen wirklich über die
   Rolle: der Klick-Ziel-String wandert mit, die Kollisionserkennung verstummt. */
test('[Rotmachbarkeit] U2-ADR-279: eine fehlgeleitete instrumenteListe-Rolle lässt beide Stellen umkippen', () => {
  /* DIE ROLLENZUWEISUNG STEHT IM BEREICHS-TEMPLATE (tools/bereich-templates/vivodepot-advanceCare.json),
     nicht mehr im Quelltext und nicht im Bündel: `ladeKern()` backt sie beim Laden in den Kern.
     Die Rotprobe mutiert darum die Template-DATEI in einer Kopie des Verzeichnisses und lässt
     ladeKern diese Kopie backen (`bereichTemplateVerzeichnis`). Bis 19.09.2026 mutierte sie den
     Kern-Quelltext über KERN_HTML_PATH — dort steht die Rolle seit der nativen Katalogkopie
     (BEREICHE_NATIV_KATALOG) noch einmal, ohne dass der Kern sie für Privat je läse: die
     Positivkontrolle lieferte null (KERN_HTML_PATH backt nicht). */
  const alt = '"instrumenteListe": "provisionInstruments"';
  const neuKaputt = '"instrumenteListe": "FAKE_ROLLE_ZIEL_U2_ADR_279"';
  const TPL_QUELLE = path.join(REPO, 'tools', 'bereich-templates');
  const tplAdvance = fs.readFileSync(path.join(TPL_QUELLE, 'vivodepot-advanceCare.json'), 'utf8');
  assert.equal(tplAdvance.split(alt).length - 1, 1, 'Anker für die instrumenteListe-Rollenzuweisung im Template nicht mehr eindeutig — Test nachziehen');

  const laufSkript = `
    const { ladeKern } = require(${JSON.stringify(path.join(__dirname, 'load-kern.js'))});
    (async () => {
      const { V } = ladeKern(process.env.VD_TPL_DIR ? { bereichTemplateVerzeichnis: process.env.VD_TPL_DIR } : {});
      await V.depotAnlegen('u2-279-pw');
      V.akteurSelbstErklaeren('Tester');
      const html = V.situationSektorZeileHTML('advanceCare', 'instrument:living-will');
      const dat = V.getData();
      if (!dat.sektoren.advanceCare) dat.sektoren.advanceCare = {};
      dat.sektoren.advanceCare.provisionInstruments = [{ id: 'bestand-1', instrument: 'will' }];
      const kollision = V._listenEintragPruefen('advanceCare', 'provisionInstruments', { unterFelder: [] }, { instrument: 'will', typeOfPowerOfAttorney: undefined }, -1);
      process.stdout.write(JSON.stringify({
        klickFeld: (/data-klick-feld="([^"]*)"/.exec(html) || [])[1] || null,
        kollisionOk: kollision.ok,
      }));
    })();
  `;

  const pruefe = (tplText) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-279-rot-'));
    try {
      for (const f of fs.readdirSync(TPL_QUELLE)) fs.copyFileSync(path.join(TPL_QUELLE, f), path.join(tmp, f));
      fs.writeFileSync(path.join(tmp, 'vivodepot-advanceCare.json'), tplText);
      const out = execFileSync('node', ['-e', laufSkript], { cwd: REPO, encoding: 'utf8', env: { ...process.env, VD_TPL_DIR: tmp } });
      return JSON.parse(out);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  };

  const echtesErgebnis = pruefe(tplAdvance);
  assert.equal(echtesErgebnis.klickFeld, 'provisionInstruments', 'Positivkontrolle: unveränderte Rolle liefert das echte Ziel');
  assert.equal(echtesErgebnis.kollisionOk, false, 'Positivkontrolle: unveränderte Rolle erkennt die echte Kollision');

  const kaputtesErgebnis = pruefe(tplAdvance.replace(alt, neuKaputt));
  assert.equal(kaputtesErgebnis.klickFeld, 'FAKE_ROLLE_ZIEL_U2_ADR_279',
    'ROT ERWARTET: situationSektorZeileHTML muss der fehlgeleiteten Rolle folgen, nicht am alten Literal festhalten');
  assert.equal(kaputtesErgebnis.kollisionOk, true,
    'ROT ERWARTET: _listenEintragPruefen darf die Kollision nicht mehr erkennen, wenn die Rolle woanders hinzeigt — ' +
    'sonst wäre unbewiesen, dass beide Stellen wirklich über bereichRolle/bereichFeldHatRolle laufen');
});
