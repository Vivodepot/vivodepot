'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 2 (Auftrag „Depot ist Datei", 08.08.2026, Befund S10) — der Dirty-Fall
   des Schließen-Dialogs bekommt einen dritten, IMMER verfügbaren Datei-Weg.
   ────────────────────────────────────────────────────────────────────────
   Vorher: „Sichern und schließen" (mode-abhängig IDB/Datei) + „Trotzdem
   schließen" — kein Datei-Weg im gefährlichsten Fall (Safari/Firefox ohne
   verlässliches IDB, s. U2-ADR-031 Stück 11/12). Jetzt drei Wege:
     primär = IMMER Datei (der Verlass) · zweit = „Nur auf diesem Gerät
     merken" (nur gehostet, IDB ist unter file:// gar nicht die Senke) ·
     dritt = „Trotzdem schließen" (quittierter Verlust).
   Rotmachbarkeit (Regel 18): Probe 4 pflanzt den alten Zwei-Wege-Zustand
   (kein drittAktion-Slot) nach und zeigt, dass die Proben 1+3 das fangen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const FILE_LOC = { protocol: 'file:', href: 'file:///x/vivodepot.html' };

async function dirtyHosted(opts) {
  const fakeHandle = { name: 'z2.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  const { V, document } = ladeKern(Object.assign({ showSaveFilePicker: async () => fakeHandle, indexedDB: {} }, opts));
  await V.depotAnlegen('pw-z2');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');   // dirty
  return { V, document };
}

test('[Zug2] gehostet + dirty: drei Wege sichtbar (Datei primär, Nur-Gerät zweit, Trotzdem dritt)', async () => {
  const { V, document } = await dirtyHosted();
  assert.equal(V.internerSpeicherModus(), true, 'Aufbau: dieser Testkern gilt als gehostet');
  V.flowAppSchliessen();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('id="m-ok"'), 'primär (Datei-Weg) vorhanden');
  assert.ok(html.includes('id="m-zweit"'), '„Nur auf diesem Gerät merken" gehostet angeboten');
  assert.ok(html.includes('id="m-dritt"'), '„Trotzdem schließen" vorhanden');
  assert.ok(html.includes(V.STRINGS.d40SichernUndSchliessen), 'Primär-Label = Datei-Sichern-Wortlaut');
  assert.ok(html.includes(V.STRINGS.d40NurGeraetMerken), 'Zweit-Label = Nur-Gerät-Wortlaut');
  assert.ok(html.includes(V.STRINGS.d40TrotzdemSchliessen), 'Dritt-Label = Trotzdem-schließen-Wortlaut');
});

// GEÄNDERT (Auftrag „die pauschale Flagge weicht der Probe", 12.09.2026): file:// allein
// erzwingt keinen Datei-Modus mehr — nur eine ECHT fehlgeschlagene/fehlende IndexedDB tut das
// (s. Bericht sichern-je-browser-je-lauf-2026-09-12.md: IndexedDB funktioniert live gemessen
// unter file:// in Chromium/Firefox/WebKit). Diese Probe testet darum den ECHTEN Grund für den
// Zwei-Wege-Fall — keine funktionierende IndexedDB —, nicht mehr das bloße Protokoll. Der
// vorherige Aufbau nutzte den geteilten `indexedDB: {}`-Blindgänger aus dirtyHosted() zusammen
// mit file://, ohne dass je geprüft wurde, ob die Probe daran wirklich scheitert — `indexedDB:
// undefined` hier macht das explizit und eindeutig: keine Senke vorhanden, unabhängig vom
// Protokoll.
test('[Zug2] KEINE funktionierende IndexedDB + dirty: NUR zwei Wege, auch unter file://', async () => {
  const { V, document } = await dirtyHosted({ location: FILE_LOC, indexedDB: undefined });
  assert.equal(V.hatIndexedDB(), false, 'Aufbau: keine IndexedDB injiziert');
  assert.equal(V.internerSpeicherModus(), false, 'Aufbau: ohne IndexedDB bleibt es Datei-Modus');
  V.flowAppSchliessen();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('id="m-ok"'), 'primär (Datei-Weg) bleibt IMMER verfügbar');
  assert.ok(!html.includes('id="m-zweit"'), '„Nur auf diesem Gerät merken" ohne Senke NICHT angeboten');
  assert.ok(html.includes('id="m-dritt"'), '„Trotzdem schließen" bleibt verfügbar');
});

// NEU (Auftrag, 12.09.2026): der Gegenfall zum obigen — file:// MIT einer echt
// funktionierenden IndexedDB (createIdbMock(), kein Blindgänger) verhält sich jetzt wie
// gehostet: drei Wege, „Nur auf diesem Gerät merken" eingeschlossen. Deterministisch geprüft
// (Probe zurückgesetzt und explizit abgewartet), statt sich auf die "Ergebnis noch ausstehend
// → gilt vorläufig als true"-Zwischenlage zu verlassen.
test('[Zug2] file:// MIT funktionierender IndexedDB + dirty: DREI Wege, wie gehostet', async () => {
  const { createIdbMock } = require('./idb-mock.js');
  const { V, document } = await dirtyHosted({ location: FILE_LOC, indexedDB: createIdbMock() });
  V._internSpeicherProbeZuruecksetzen();
  await V.internSpeicherFunktionsprobe();
  assert.equal(V.internerSpeicherModus(), true, 'file:// mit echt funktionierender IndexedDB gilt jetzt als interner Speicher-Modus');
  V.flowAppSchliessen();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('id="m-ok"'), 'primär (Datei-Weg) bleibt verfügbar');
  assert.ok(html.includes('id="m-zweit"'), '„Nur auf diesem Gerät merken" jetzt AUCH unter file:// angeboten — die Senke funktioniert nachweislich');
  assert.ok(html.includes('id="m-dritt"'), '„Trotzdem schließen" bleibt verfügbar');
});

/* Die beiden folgenden Proben können den Save-Zustand NICHT nach dem Klick aus saveStatusModell()
   lesen: bei Erfolg ruft der jeweilige Handler `weiterFn()` — Default (flowAppSchliessen) endet in
   `flowTrotzdemSchliessen()`, aber auch die generalisierte Fortsetzung von `geheZuZuhause()` läuft
   über `renderWelcome()`, und DIE räumt bei jeder echten Sitzung unbedingt über
   `_depotSpeicherZuruecksetzen()` ab (s. dort: „eine ECHTE, passwortgeschützte Sitzung wird
   vollständig abgeräumt"). GEMESSEN (nicht angenommen): mit beiden Fortsetzungen liest
   saveStatusModell() NACH einem erfolgreichen Klick immer 'keine-datei' — das ist der Teardown,
   keine falsche Aktion. Die Proben spionieren darum den WEG selbst aus (Datei-Handle-Aufrufe /
   den externen IDB-Mock-Speicher, der den Kern-Teardown überlebt) und bestätigen zusätzlich, dass
   der Erfolgspfad wirklich bis zum Abschluss läuft (kein Sackgasse: `V.getData()` wird null). */

test('[Zug2] Primär ist IMMER der Datei-Weg, auch gehostet (nicht mehr mode-abhängig IDB)', async () => {
  let schreibversuche = 0;
  let geschriebenerBlob = null;
  const fakeHandle = {
    name: 'z2.vivodepot',
    createWritable: async () => ({
      write: async (b) => { schreibversuche++; geschriebenerBlob = b; },
      close: async () => {},
    }),
  };
  const { V, document } = await dirtyHosted({ showSaveFilePicker: async () => fakeHandle });
  V.flowAppSchliessen();
  await document.getElementById('m-ok').onclick();
  assert.equal(schreibversuche, 1, 'Primär schreibt genau einmal über die Datei-API — nicht nur den internen Cache');
  assert.ok(geschriebenerBlob, 'ein echter Blob wurde an die Datei-API übergeben');
  assert.equal(V.getData(), null, 'kein Sackgasse: der Erfolgspfad läuft bis zum Abschluss (Sitzung geschlossen)');
});

test('[Zug2] „Nur auf diesem Gerät merken": IDB-Save, kein Datei-Schreiben', async () => {
  const { createIdbMock } = require('./idb-mock.js');
  let schreibversuche = 0;
  const fakeHandle = { name: 'z2.vivodepot', createWritable: async () => { schreibversuche++; return { write: async () => {}, close: async () => {} }; } };
  const mock = createIdbMock();
  const { V, document } = await dirtyHosted({ showSaveFilePicker: async () => fakeHandle, indexedDB: mock });
  V.flowAppSchliessen();
  await document.getElementById('m-zweit').onclick();
  assert.equal(schreibversuche, 0, '„Nur auf diesem Gerät merken" rührt die Datei-API NICHT an');
  // Der externe IDB-Mock-Speicher überlebt den Kern-Teardown (er liegt außerhalb des vm-Kontexts) —
  // ein echter Record dort belegt den Save, unabhängig davon, dass der Kern selbst gleich abräumt.
  const irgendeinStore = Array.from(mock._dbs.values())[0];
  const zeilen = irgendeinStore ? Array.from(irgendeinStore.stores.values()).flatMap((s) => Array.from(s.rows.values())) : [];
  assert.ok(zeilen.length > 0, 'der interne Save hat wirklich einen Record in die Senke geschrieben');
  assert.equal(V.getData(), null, 'kein Sackgasse: der Erfolgspfad läuft bis zum Abschluss (Sitzung geschlossen)');
});

test('[Zug2·kein Sackgasse] scheitert „Nur auf diesem Gerät merken", bleibt der Dirty-Zustand stehen (kein toter Zustand)', async () => {
  const { createIdbMock } = require('./idb-mock.js');
  // fehlerBeiPut erst NACH depotAnlegen scharf schalten: die Boot-Funktionsprobe
  // (internSpeicherProbeStarten, fire-and-forget aus booteEingang) schreibt selbst einmal — schlüge
  // sie fehl, kippte internerSpeicherModus() dauerhaft auf false und „Nur auf diesem Gerät merken"
  // stünde gar nicht erst zur Wahl (anderer Zustand als der hier geprüfte: EIN Save-Versuch scheitert
  // bei sonst funktionsfähigem IDB, z. B. ein transienter Quota-Ausreißer).
  const idbOpts = {};
  const mock = createIdbMock(idbOpts);
  const { V, document } = await dirtyHosted({ indexedDB: mock });
  assert.equal(V.internerSpeicherModus(), true, 'Aufbau: die Boot-Probe war zu diesem Zeitpunkt bereits erfolgreich');
  idbOpts.fehlerBeiPut = true;
  V.flowAppSchliessen();
  await document.getElementById('m-zweit').onclick();
  assert.equal(V.istUngespeichert(), true, 'gescheiterter IDB-Save darf den Zähler NICHT zurücksetzen — sonst gilt Arbeit als gesichert, obwohl sie es nicht ist');
  // Kein Sackgasse: das Schließen-Dialog lässt sich erneut öffnen, alle drei Wege wieder da.
  V.flowAppSchliessen();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('id="m-ok"') && html.includes('id="m-zweit"') && html.includes('id="m-dritt"'),
    'nach einem gescheiterten Weg bietet der Dialog beim erneuten Öffnen wieder alle drei Wege');
});

test('[Zug2] „Trotzdem schließen" quittiert den Verlust unabhängig vom Modus', async () => {
  const { V, document } = await dirtyHosted({ location: FILE_LOC });
  V.flowAppSchliessen();
  document.getElementById('m-dritt').onclick();
  const ovHtml = document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(ovHtml.includes(V.STRINGS.schlussSichtText), 'Trotzdem schließen führt zur Schluss-Sicht');
});

/* ── Rotmachbarkeit (Regel 18) ────────────────────────────────────────────
   Der alte Zwei-Wege-Zustand (kein `drittAktion`-Slot, „Trotzdem schließen"
   lag im `zweitAktion`-Slot) auf einer Kopie gepflanzt und ECHT über
   KERN_HTML_PATH in einem frischen Node-Prozess geladen (load-kern.js legt
   HTML_PATH beim require fest, ein zweiter ladeKern() im selben Prozess kann
   also nicht auf zwei Quellen zeigen). Der Kind-Prozess muss mit Exit-Code 1
   sterben — sonst prüft die Probe oben nichts. */
test('[Zug2·Rotmachbarkeit] ohne drittAktion-Slot (alter Zustand) findet #m-dritt nicht — die Probe fängt das (rot)', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const cp = require('node:child_process');
  const KERN = path.join(__dirname, '..', 'vivodepot.html');
  const src = fs.readFileSync(KERN, 'utf8');
  const ankerDritt = "    drittAktion: {\n      label: STRINGS.d40TrotzdemSchliessen,\n      handler: (schliessen) => { if (typeof schliessen === 'function') schliessen(); _dateiVerlustQuittiert = true; weiterFn(); },\n    },";
  const ankerPrimaer = 'primaerLabel: dirty ? STRINGS.d40SichernUndSchliessen : STRINGS.saveStatusJetztSichern,';
  assert.ok(src.includes(ankerDritt), 'Anker der drittAktion-Verdrahtung gefunden (sonst umbenannt)');
  assert.ok(src.includes(ankerPrimaer), 'Anker von primaerLabel gefunden (sonst umbenannt)');
  const mutantSrc = src.replace(ankerDritt, '').replace(ankerPrimaer,
    ankerPrimaer + "\n    zweitAktion: { label: STRINGS.d40TrotzdemSchliessen, handler: (schliessen) => { if (typeof schliessen === 'function') schliessen(); _dateiVerlustQuittiert = true; weiterFn(); } },");
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-zug2-zwei-wege-mutant-'));
  const mutant = path.join(mutantDir, 'kern-zug2-zwei-wege-mutant.html');
  fs.writeFileSync(mutant, mutantSrc, 'utf8');
  const probeSkript = path.join(__dirname, '..', 'tools', '_zug2-mutant-probe.js');
  try {
    const r = cp.spawnSync(process.execPath, [probeSkript], {
      env: Object.assign({}, process.env, { KERN_HTML_PATH: mutant }),
      encoding: 'utf8',
    });
    assert.equal(r.status, 1, 'Mutant (alter Zwei-Wege-Zustand) muss die Probe ROT machen — sonst prüft sie #m-dritt nicht wirklich. '
      + 'stdout: ' + r.stdout + ' stderr: ' + r.stderr);
    assert.ok(String(r.stdout).includes('ROT'), 'Probe meldet ausdrücklich, WAS fehlt (kein stiller Absturz)');
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});

test('[Zug2·Rotmachbarkeit] dieselbe Probe gegen den ECHTEN Kern läuft grün', () => {
  const path = require('node:path');
  const cp = require('node:child_process');
  const probeSkript = path.join(__dirname, '..', 'tools', '_zug2-mutant-probe.js');
  const r = cp.spawnSync(process.execPath, [probeSkript], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'Positivkontrolle: gegen den echten Kern (kein KERN_HTML_PATH) muss dieselbe Probe grün laufen. '
    + 'stdout: ' + r.stdout + ' stderr: ' + r.stderr);
});
