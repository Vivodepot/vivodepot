'use strict';
/* Altbestand der Mappe: autoritativ eingelesene Gesundheitsdokumente aus der Zeit, bevor der Import sensibel:true setzte
   (21.10.2026, Befund GESUNDHEIT-ALTBESTAND-OHNE-SENSIBEL). Seit fd3b40dc2 trägt ein eingelesenes Gesundheitsdokument die
   Markierung ab dem Import (DSGVO Art. 9, Entscheidung 29.09.2026); ausgeliefert zuerst mit v843. Ein Depot aus einer
   früheren Fassung trägt am selben Dokument sensibel:false. Filtert ein Ausgabeweg nach der Markierung, ginge genau dieses
   Dokument hinaus. Die Migration in depotNormalisieren hebt es beim Öffnen auf sensibel:true.
   Gehalten: ein mit dem Kern von v818 angelegtes Depot öffnet und trägt danach dieselben Dokumente, das Gesundheitsdokument
   mit sensibel:true; nur autoritative Gesundheitsdokumente werden gehoben; zweimal normalisiert ändert nichts mehr.
   Rot-Beweis: ohne den Aufruf in depotNormalisieren bleibt das Dokument auf sensibel:false. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const HDR = fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-eu-hdr.json'), 'utf8');
const PW = 'Mappe-Probe-2026!';
const V818 = 'b66155dd9';   // Kanon-Commit der ausgelieferten Fassung v818, der letzten vor der Voreinstellung im Import
const AUFRUF = '  _mappeGesundheitSensibelMigrieren(ziel);';

function kernAus(commit, dir) {
  let text;
  try {
    text = execFileSync('git', ['show', commit + ':vivodepot.html'], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (_) { return null; }
  const pfad = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(pfad, text);
  return pfad;
}

function frischerLader() {
  delete require.cache[require.resolve('./load-kern.js')];
  return require('./load-kern.js').ladeKern;
}

async function altesDepot(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mappe-gesundheit-alt-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const pfad = kernAus(V818, dir);
  if (!pfad) { t.skip('ohne Git-Historie (öffentlicher Zuschnitt): der Kern von v818 ist nicht lesbar'); return null; }
  const alt = frischerLader()({ htmlPfad: pfad }).V;
  await alt.depotAnlegen(PW);
  const id = alt.importAutoritativDokument(HDR);
  alt.mappeEintragHinzufuegen({ beschriftung: 'Eigenes', bereich: 'health', dateiname: 'notiz.txt', mime: 'text/plain', inhalt: 'data:text/plain;base64,SGFsbG8=' });
  const vorher = JSON.parse(JSON.stringify(alt.getData().mappe));
  assert.equal(vorher.find((m) => m.id === id).sensibel, false, 'Vorbedingung: v818 setzt die Markierung beim Import nicht');
  return { id, vorher, umschlag: await alt.depotSerialisieren() };
}

test('[Mappe·Gesundheit·Migration] ein Depot aus v818 öffnet und trägt dieselben Dokumente, das Gesundheitsdokument sensibel', async (t) => {
  const alt = await altesDepot(t);
  if (!alt) return;
  const { V } = frischerLader()();
  await V.depotLaden(alt.umschlag, PW);
  const nachher = V.getData().mappe;
  assert.deepEqual(nachher.map((m) => m.id), alt.vorher.map((m) => m.id), 'dieselben Dokumente, in derselben Reihenfolge');
  for (const m of alt.vorher) {
    const n = nachher.find((x) => x.id === m.id);
    const { sensibel: _a, ...rest } = m;
    const { sensibel: _b, ...restNeu } = n;
    assert.deepEqual(restNeu, rest, `${m.beschriftung}: alles außer der Markierung bleibt, wie es war`);
  }
  assert.equal(nachher.find((m) => m.id === alt.id).sensibel, true, 'das eingelesene Gesundheitsdokument ist jetzt sensibel');
  assert.equal(nachher.find((m) => m.id !== alt.id).sensibel, false, 'ein selbst abgelegtes Dokument behält die Wahl der Person');

  // Ein zweites Öffnen ändert nichts mehr: die Mappe ist Byte für Byte dieselbe.
  const einmal = JSON.stringify(nachher);
  const { V: V2 } = frischerLader()();
  await V2.depotLaden(await V.depotSerialisieren(), PW);
  assert.equal(JSON.stringify(V2.getData().mappe), einmal);
});

test('[Mappe·Gesundheit·Migration] die Migration setzt nur sensibel:true, nie false', () => {
  const { V } = frischerLader()();
  const d = V.depotNormalisieren({ schemaVersion: 93, sektoren: {}, mappe: [
    { id: 'a', bereich: 'health', autoritativ: true, sensibel: true, inhalt: '' },
    { id: 'b', bereich: 'family', autoritativ: false, sensibel: true, inhalt: '' },
    { id: 'c', bereich: 'education', autoritativ: true, sensibel: true, inhalt: '' },
  ] });
  assert.deepEqual(d.mappe.map((m) => m.sensibel), [true, true, true]);
  const quelle = fs.readFileSync(KERN, 'utf8');
  const anfang = quelle.indexOf('function _mappeGesundheitSensibelMigrieren(');
  const rumpf = quelle.slice(anfang, quelle.indexOf('\n}\n', anfang) + 2);
  assert.ok(rumpf.includes('m.sensibel = true'));
  assert.doesNotMatch(rumpf, /sensibel\s*=\s*(false|!)/, 'kein Weg im Rumpf setzt die Markierung zurück');
});

test('[Mappe·Gesundheit·Migration] nur autoritative Gesundheitsdokumente werden gehoben; ein zweites Normalisieren ändert nichts', () => {
  const { V } = frischerLader()();
  // Die IG steht so am Eintrag, wie die Importe sie schreiben (MED_DOK_TYPEN bzw. BILDUNG_DOK_TYPEN, je `gepruefteIG: def.ig`).
  const d = V.depotNormalisieren({ schemaVersion: 89, sektoren: {}, mappe: [
    { id: 'a', bereich: 'health', autoritativ: true, sensibel: false, gepruefteIG: 'hl7.fhir.eu.hdr#0.1.0-ballot', inhalt: '' },
    { id: 'b', bereich: 'health', autoritativ: false, sensibel: false, inhalt: '' },
    { id: 'c', bereich: 'education', autoritativ: true, sensibel: false, gepruefteIG: 'http://data.europa.eu/snb/model/context/edc-ap', inhalt: '' },
    { id: 'd', bereich: 'health', autoritativ: true, gepruefteIG: 'hl7.fhir.eu.laboratory#2.0.0', inhalt: '' },
    { id: 'e', bereich: 'health', autoritativ: true, sensibel: false, gepruefteIG: 'hl7.fhir.uv.ips#2.0.0', inhalt: '' },
  ] });
  const s = Object.fromEntries(d.mappe.map((m) => [m.id, m.sensibel]));
  assert.deepEqual(s, { a: true, b: false, c: false, d: true, e: true });
  const zweimal = V.depotNormalisieren(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(zweimal.mappe, d.mappe);
});

test('[Mappe·Gesundheit·Migration·Rot-Beweis] ohne den Aufruf in depotNormalisieren bleibt das Gesundheitsdokument auf sensibel:false', async (t) => {
  const alt = await altesDepot(t);
  if (!alt) return;
  const original = fs.readFileSync(KERN, 'utf8');
  assert.equal(original.split(AUFRUF + '\n').length - 1, 1, 'Vorbedingung: der Aufruf steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'mappe-gesundheit-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(AUFRUF + '\n', ''));
  t.after(() => fs.rmSync(tmp, { force: true }));
  const { V } = frischerLader()({ htmlPfad: tmp, backen: true });
  await V.depotLaden(alt.umschlag, PW);
  assert.equal(V.getData().mappe.find((m) => m.id === alt.id).sensibel, false);
});
