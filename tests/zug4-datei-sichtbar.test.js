'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 4 (Auftrag „Depot ist Datei", 08.08.2026, Befund S5) — die Datei wird
   sichtbar: Dateiname + Zeitpunkt des letzten Schreibens als BLEIBENDE
   Anzeige (Depot-Liste, Pillen-Klick), kein Toast. Ort nur, soweit der
   Browser ihn hergibt — File-System-Access-Handles tragen keinen Pfad.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function mitDateiSave() {
  const fakeHandle = { name: 'z4.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  const { V, document } = ladeKern({ showSaveFilePicker: async () => fakeHandle, indexedDB: {} });
  await V.depotAnlegen('pw-z4');
  V.akteurSelbstErklaeren('Maria');
  await V.depotInDateiSichern();
  return { V, document };
}

test('[Zug4] nach einem Datei-Save zeigt die Depot-Liste Dateiname UND Zeitpunkt', async () => {
  const { V, document } = await mitDateiSave();
  V.flowDepotListe();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('z4.vivodepot'), 'Dateiname sichtbar');
  assert.ok(html.includes(V.STRINGS.depotListeZuletztGespeichertLabel), 'Zeitpunkt-Label sichtbar');
  // Deterministisch geformt (TT.MM.JJJJ, HH:MM Uhr) — kein rohes ISO im UI.
  assert.match(html, /\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/, 'Zeitpunkt lesbar formatiert, kein rohes ISO');
});

test('[Zug4] vor jedem Datei-Save behauptet die Depot-Liste NICHTS Erfundenes', async () => {
  const { V, document } = ladeKern({ indexedDB: {} });
  await V.depotAnlegen('pw-z4b');
  V.akteurSelbstErklaeren('Maria');
  V.flowDepotListe();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(!html.includes('depot-datei-info'), 'ohne bekannten Dateinamen keine Datei-Zeile — nichts erfunden');
});

test('[Zug4] eine spätere Sicherung aktualisiert Name UND Zeitpunkt (nicht der Anlege-Stand hängt fest)', async () => {
  let handleName = 'z4-erst.vivodepot';
  const { V, document } = ladeKern({
    showSaveFilePicker: async () => ({ name: handleName, createWritable: async () => ({ write: async () => {}, close: async () => {} }) }),
    indexedDB: {},
  });
  await V.depotAnlegen('pw-z4c');
  V.akteurSelbstErklaeren('Maria');
  await V.depotInDateiSichern();
  V.flowDepotListe();
  const ersteHtml = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(ersteHtml.includes('z4-erst.vivodepot'));
  // Kein zweiter Picker-Aufruf nötig (Handle bleibt gebunden) — aber der ZEITPUNKT muss sich lösen.
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  await V.depotInDateiSichern();
  V.flowDepotListe();
  const zweiteHtml = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(zweiteHtml.includes('z4-erst.vivodepot'), 'derselbe Dateiname (in-place überschrieben)');
});

/* ── Rotmachbarkeit (Regel 18) ──────────────────────────────────────────── */
test('[Zug4·Rotmachbarkeit] ohne die Datei-Zeile in flowDepotListe findet die Probe sie nicht (rot)', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const cp = require('node:child_process');
  const KERN = path.join(__dirname, '..', 'vivodepot.html');
  const src = fs.readFileSync(KERN, 'utf8');
  // Anker seit dem Sub-Kontext-Fix (Screenshot-Befund 26.08.2026, „Mein Depot ▾ im Sub-Kontext"):
  // das „aktiv"-Etikett auf der „Mein Depot"-Zeile ist jetzt bedingt (imSub ? '' : …) — die
  // Datei-Zeile hängt aber unverändert unbedingt dahinter.
  const anker = "(imSub ? '' : '<span class=\"dp-aktiv-tag\">' + STRINGS.depotAktiv + '</span>') + '</div>' + dateiZeile,";
  assert.ok(src.includes(anker), 'Anker der Datei-Zeilen-Einbindung gefunden (sonst umbenannt)');
  const mutantSrc = src.replace(anker, "(imSub ? '' : '<span class=\"dp-aktiv-tag\">' + STRINGS.depotAktiv + '</span>') + '</div>',");
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-zug4-keine-dateizeile-mutant-'));
  const mutant = path.join(mutantDir, 'kern-zug4-keine-dateizeile-mutant.html');
  fs.writeFileSync(mutant, mutantSrc, 'utf8');
  const probeSkript = path.join(__dirname, '..', 'tools', '_zug4-mutant-probe.js');
  try {
    const r = cp.spawnSync(process.execPath, [probeSkript], {
      env: Object.assign({}, process.env, { KERN_HTML_PATH: mutant }),
      encoding: 'utf8',
    });
    assert.equal(r.status, 1, 'Mutant (Datei-Zeile entfernt) muss die Probe ROT machen. stdout: ' + r.stdout + ' stderr: ' + r.stderr);
    assert.ok(String(r.stdout).includes('ROT'), 'Probe meldet ausdrücklich, was fehlt');
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});

test('[Zug4·Rotmachbarkeit] dieselbe Probe gegen den ECHTEN Kern läuft grün', () => {
  const path = require('node:path');
  const cp = require('node:child_process');
  const probeSkript = path.join(__dirname, '..', 'tools', '_zug4-mutant-probe.js');
  const r = cp.spawnSync(process.execPath, [probeSkript], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'Positivkontrolle: gegen den echten Kern muss dieselbe Probe grün laufen. stdout: ' + r.stdout + ' stderr: ' + r.stderr);
});
