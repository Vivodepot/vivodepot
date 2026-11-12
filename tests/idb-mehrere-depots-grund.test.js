'use strict';
/* IDB-FALSCHES-PASSWORT (04.11.2026): Liegen mehrere Depots im Gerätespeicher, nennt die Meldung den Grund, nicht den Fehler des
   zuerst probierten Records.
     [IDB·A]       neuer Record mit fremdem Passwort, älterer mit dem eigenen, dessen Migration wirft → das Depot öffnet nur lesend,
                   mit dem Grund migration-fehler, nicht mit dem Passwort-Satz (das Passwort passte).
     [IDB·B]       neuer Record beschädigt, älterer mit fremdem Passwort → eigene Mischmeldung (beides wird genannt).
     [IDB·Welches] neuer Record fremd, älterer eigen → öffnet; die Meldung nennt den Stand des geöffneten Depots.
   Die reinen Fälle (nur falsches Passwort, nur beschädigt) bleiben, wie sie sind. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const PW_EIGEN = 'zz-probe-idb-eigen-Passwort-7';
const PW_FREMD = 'zz-probe-idb-fremd-Passwort-7';
const KOPF = 'function depotNormalisieren(d) {';
const WIRFT = " if (d && d.zzProbeMigrationWirft) throw new Error('zz-probe: Migration wirft');";

const tempOrdner = [];
after(() => { for (const d of tempOrdner) fs.rmSync(d, { recursive: true, force: true }); });
let _kernMitWurf = null;
function kernMitWurf(ersetzen) {
  let quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  assert.equal(quelle.split(KOPF).length, 2);
  quelle = quelle.replace(KOPF, KOPF + WIRFT);
  if (ersetzen) {
    assert.equal(quelle.split(ersetzen[0]).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal: ' + ersetzen[0].slice(0, 60));
    quelle = quelle.replace(ersetzen[0], ersetzen[1]);
  } else if (_kernMitWurf) return _kernMitWurf;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idb-mehrere-depots-'));
  tempOrdner.push(dir);
  const pfad = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(pfad, quelle);
  if (!ersetzen) _kernMitWurf = pfad;
  return pfad;
}
function geraet(dbs, htmlPfad) {
  const mock = createIdbMock(dbs ? { _dbs: dbs } : undefined);
  return { ...ladeKern({ indexedDB: mock, location: HOSTED, htmlPfad: htmlPfad || kernMitWurf(), backen: true }), mock };
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// Legt ein Depot an und sichert es in den gemeinsamen Gerätespeicher. Später angelegt heißt neuer.
async function depotAblegen(dbs, pw, extra, htmlPfad) {
  const k = geraet(dbs, htmlPfad);
  await k.V.depotAnlegen(pw);
  if (extra) Object.assign(k.V.getData(), extra);
  await k.V.depotInIdbSichern();
  await warte(5);
  return k.mock._dbs;
}
async function ladenScheitert(V, pw) {
  try { await V.depotAusIdbLaden(pw); } catch (e) { return e; }
  return null;
}
async function beschaedigtAblegen(dbs) {
  // Ein Record, dessen Umschlag kein JSON ist: scheitert vor der Entschlüsselung (datei-defekt).
  const k = geraet(dbs);
  await k.V.depotAnlegen('zz-probe-idb-defekt-Passwort-7');
  await k.V.depotInIdbSichern();
  const liste = await k.V.VdStore.liste();
  const r = liste.find((x) => x.id === k.V.aktuelleDepotUUID) || liste[liste.length - 1];
  await k.V.VdStore.setzen(Object.assign({}, r, { cipherBlob: '{kaputt', gespeichert_am: new Date().toISOString() }));
  await warte(5);
  return k.mock._dbs;
}

test('[IDB·A] das Passwort passt zum älteren Depot, dessen Migration wirft: es öffnet nur lesend, nicht „Passwort falsch“', async () => {
  let dbs = await depotAblegen(null, PW_EIGEN, { schemaVersion: 80, zzProbeMigrationWirft: true });
  dbs = await depotAblegen(dbs, PW_FREMD);
  const k = geraet(dbs);
  const e = await ladenScheitert(k.V, PW_EIGEN);
  assert.equal(e, null, 'das Passwort passte, also öffnet das Depot: ' + (e && e.message));
  const m = k.V.migrationFehlerErgebnis();
  assert.equal(m && m.grund, 'migration-fehler');
  assert.equal(k.V.neuereFassungNurLesen(), true, 'nur lesend');
});

test('[IDB·B] ein Depot beschädigt, zum anderen passt das Passwort nicht: die Mischmeldung nennt beides', async () => {
  let dbs = await depotAblegen(null, PW_FREMD);
  dbs = await beschaedigtAblegen(dbs);
  const k = geraet(dbs);
  const e = await ladenScheitert(k.V, PW_EIGEN);
  assert.equal(e && e.code, 'passwort-oder-beschaedigt', 'Code: ' + (e && e.code));
  assert.equal(k.V.oeffnenAbweisungText(e), k.V.STRINGS.idbPasswortUndBeschaedigt);
});

test('[IDB·Rein] nur fremde Passwörter: der Passwort-Satz; nur beschädigt: datei-defekt', async () => {
  const k1 = geraet(await depotAblegen(await depotAblegen(null, PW_FREMD), PW_FREMD + 'x'));
  const e1 = await ladenScheitert(k1.V, PW_EIGEN);
  assert.ok(e1 && !e1.code, 'ein reiner Passwort-Fehler trägt keinen Code: ' + (e1 && e1.code));
  const k2 = geraet(await beschaedigtAblegen(null));
  const e2 = await ladenScheitert(k2.V, PW_EIGEN);
  assert.equal(e2 && e2.code, 'datei-defekt');
});

test('[IDB·Welches] öffnet nicht das neueste Depot, nennt die Meldung den Stand des geöffneten', async () => {
  let dbs = await depotAblegen(null, PW_EIGEN);
  dbs = await depotAblegen(dbs, PW_FREMD);
  const k = geraet(dbs);
  await k.V.depotAusIdbLaden(PW_EIGEN);
  const text = k.V.idbGeoeffnetText();
  assert.ok(text && text !== k.V.STRINGS.geoeffnet, 'eigene Meldung mit Stand: ' + text);
  assert.match(text, /\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
  // Öffnet das neueste, bleibt es beim bisherigen Satz.
  const k2 = geraet(await depotAblegen(null, PW_EIGEN));
  await k2.V.depotAusIdbLaden(PW_EIGEN);
  assert.equal(k2.V.idbGeoeffnetText(), k2.V.STRINGS.geoeffnet);
});

// Rot-Beweise: je eine Zeile der Auswahl zurück auf „der erste Fehler gewinnt“; geladen wird mit dem mutierten Kern.
async function mitMutation(ersetzen, aufbau, pw) {
  const pfad = kernMitWurf(ersetzen);
  const dbs = await aufbau();
  return geraet(dbs, pfad);
}

test('[IDB·A·Rot-Beweis] ohne Vorrang des Grundes nach passendem Passwort liest die Person „Passwort falsch“', async () => {
  const k = await mitMutation(['  if (passtDanachGescheitert) throw passtDanachGescheitert;\n', ''],
    async () => depotAblegen(await depotAblegen(null, PW_EIGEN, { schemaVersion: 80, zzProbeMigrationWirft: true }), PW_FREMD));
  const e = await ladenScheitert(k.V, PW_EIGEN);
  assert.equal(k.V.oeffnenAbweisungText(e), k.V.STRINGS.entsperrPasswortFalsch);
});

test('[IDB·B·Rot-Beweis] ohne Mischmeldung nennt die Abweisung nur einen der beiden Gründe', async () => {
  const k = await mitMutation(['if (vorEntschluesselung && anEntschluesselung) {', 'if (false) {'],
    async () => beschaedigtAblegen(await depotAblegen(null, PW_FREMD)));
  const e = await ladenScheitert(k.V, PW_EIGEN);
  assert.notEqual(e && e.code, 'passwort-oder-beschaedigt');
  assert.notEqual(k.V.oeffnenAbweisungText(e), k.V.STRINGS.idbPasswortUndBeschaedigt);
});

test('[IDB·Welches·Rot-Beweis] ohne Merken des Stands sagt die Meldung nicht, welches Depot offen ist', async () => {
  const k = await mitMutation(['if (!warNeuester) _idbGeoeffnetStand', 'if (false) _idbGeoeffnetStand'],
    async () => depotAblegen(await depotAblegen(null, PW_EIGEN), PW_FREMD));
  await k.V.depotAusIdbLaden(PW_EIGEN);
  assert.equal(k.V.idbGeoeffnetText(), k.V.STRINGS.geoeffnet);
});

/* Klasse: eine Schleife, die mehrere Kandidaten entschlüsselt (depotLaden, decryptDepot) und im catch weiterzieht, wählt den
   Fehler nicht nach der Reihenfolge. Gesucht wird das unbedingte Muster `x = x || e` in einem solchen catch. */
function erstFehlerSchleifen(quelle) {
  const funde = [];
  const re = /catch \((\w+)\) \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let m;
  while ((m = re.exec(quelle))) {
    const rumpf = m[2];
    if (!/\bcontinue\b/.test(rumpf)) continue;
    const davor = quelle.slice(Math.max(0, m.index - 600), m.index);
    if (!/depotLaden\(|decryptDepot\(/.test(davor)) continue;
    const e = m[1];
    // Nur die unbedingte Zuweisung: steht ein `if`/`else` davor, ist der Fehler nach seinem Grund einsortiert.
    const erst = new RegExp('(?:^|[;\\n])\\s*(\\w+) = \\1 \\|\\| ' + e + '\\b').exec(rumpf);
    if (erst) funde.push(quelle.slice(0, m.index).split('\n').length + ': ' + erst[0]);
  }
  return funde;
}
test('[IDB·Klasse] keine Entschlüsselungs-Schleife lässt den ersten Fehler gewinnen', () => {
  assert.deepEqual(erstFehlerSchleifen(fs.readFileSync(KERN_PFAD, 'utf8')), []);
});
test('[IDB·Klasse·Rot-Beweis] die alte Zeile in depotAusIdbLaden wird gefunden', () => {
  const q = fs.readFileSync(KERN_PFAD, 'utf8');
  const alt = q.replace('      else anEntschluesselung = anEntschluesselung || e;\n      continue;\n    }',
    '      ersterFehler = ersterFehler || e; continue;\n    }');
  assert.notEqual(alt, q);
  assert.equal(erstFehlerSchleifen(alt).length, 1, JSON.stringify(erstFehlerSchleifen(alt)));
});
