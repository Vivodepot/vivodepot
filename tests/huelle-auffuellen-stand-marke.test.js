'use strict';
/* ═══════════════════════════════════════════════════════════
   v860 (Befund HUELLEN-METADATEN): was ein Anbieter an einer Datei über die Versionen sieht, wird kleiner.
     · Jede Einheit ist auf das nächste Vielfache von 1 KiB aufgefüllt — eine Änderung unter 1 KiB ändert keine Länge.
     · Statt des Speicherzeitpunkts trägt die Datei eine Stand-Marke (HMAC der Zeit mit dem Adress-Schlüssel des Depots):
       gleich bei gleichem Stand, ohne Schlüssel keine Zeit.
   Und: eine ältere ausgelieferte Fassung (v818, v843) öffnet die neue Datei fehlerfrei — sonst wäre es ein
   Versionssprung. Gemessen wird außerdem, was ihr Konfliktvergleich mit einer Datei ohne Zeitpunkt tut.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const PW = 'auffuellen-marke-pw-1';
const STUFE = 1024;

const ctBytes = (zelle) => Buffer.from(zelle.ct, 'base64').length - 16;   // AES-GCM: Klartext = Chiffrat − 16 Byte Tag
const laengen = (u) => Object.fromEntries(Object.entries(u.einheiten).map(([a, z]) => [a, ctBytes(z)]));

async function depotMitInhalt(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
}

test('[Auffüllen] jede Einheit endet auf einer vollen 1-KiB-Stufe', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const u = await V.depotSerialisieren();
  const l = Object.values(laengen(u));
  assert.ok(l.length >= 40, 'Vorbedingung: die Einheiten');
  assert.deepEqual(l.filter((n) => n % STUFE !== 0), [], 'eine Einheit ohne volle Stufe');
});

test('[Auffüllen] eine kleine Änderung ändert keine Länge — Rot-Beweis am Stand davor', async () => {
  async function zweiStaende(V) {
    await depotMitInhalt(V);
    const a = laengen(await V.depotSerialisieren());
    V.sektorFeldSetzen('identity', 'givenName', 'Maria-Theresia');
    const b = laengen(await V.depotSerialisieren());
    return Object.keys(a).filter((k) => a[k] !== b[k]);
  }
  assert.deepEqual(await zweiStaende(ladeKern().V), [], 'eine Länge hat sich geändert');
  // Der Stand davor ist fest die Fassung v857, nicht origin/u2-kanon: seit der Landung trägt der Kanon v860 selbst.
  const alt = altenKern(commitDerFassung('v857'));
  const altOrdner = path.dirname(alt);
  try {
    const geaendert = await zweiStaende(ladeKern({ htmlPfad: alt }).V);
    assert.ok(geaendert.length > 0, 'Rot-Beweis: am Stand davor ändert dieselbe Änderung eine Länge');
  } finally { fs.rmSync(altOrdner, { recursive: true, force: true }); }
});

test('[Stand-Marke] die Datei trägt die Marke, keinen Zeitpunkt; gleich und fremd werden erkannt', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const ts = '2026-10-01T10:00:00.000Z';
  const marke = await V.standMarkeFuer(ts);
  assert.match(marke || '', /^[A-Za-z0-9+/=_-]{16,}$/, 'Vorbedingung: eine Marke');
  assert.ok(!marke.includes('2026'), 'die Marke trägt keine Zeit');
  assert.equal(await V.standMarkeFuer(ts), marke, 'gleich bei gleicher Zeit');
  assert.notEqual(await V.standMarkeFuer('2026-10-01T10:00:01.000Z'), marke, 'anders bei anderer Zeit');
  const datei = { stand_marke: marke };
  assert.equal(V.speicherKonfliktModell(ts, datei, marke).grund, 'gleich');
  assert.equal(V.speicherKonfliktModell(ts, { stand_marke: 'fremd' }, marke).konflikt, true, 'eine fremde Marke ist ein Konflikt');
  assert.equal(V.speicherKonfliktModell(null, datei, marke).grund, 'gleich', 'nach dem Öffnen einer Datei: ihre Marke ist der erwartete Stand');
  assert.equal(V.standKonfliktModell({ gespeichert_am: ts }, datei, marke).grund, 'gleich');
  // eine ältere Datei (mit Zeit) liest sich wie bisher
  assert.equal(V.speicherKonfliktModell(ts, { gespeichert_am: ts }, marke).grund, 'gleich');
});

/* Eine ältere ausgelieferte Fassung: die vivodepot.html des Commits, der die Schalen-Fassung einführte. */
function altenKern(ref) {
  const text = execFileSync('git', ['show', ref + ':vivodepot.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() });
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'huelle-alt-')), 'vivodepot.html');
  fs.writeFileSync(p, text);
  return p;
}
function commitDerFassung(v) {
  const aus = execFileSync('git', ['log', 'origin/u2-kanon', '--format=%H', '-S', "SCHALEN_STAND = '" + v + "'", '--', 'vivodepot.html'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() }).trim().split('\n');
  return aus[aus.length - 1];   // der älteste: der Commit, der die Fassung einführte
}

// Je Fassung ein Test mit wörtlichem Titel: die Klauseln in U2-ADR-464 nennen genau diese Titel
// (tools/adr-konformitaet-pruefen.js sucht sie wörtlich, ein Titel aus einer Schleife wäre für ihn unsichtbar).
async function aeltereFassungOeffnet(fassung) {
  const neu = ladeKern().V;
  await depotMitInhalt(neu);
  const umschlag = await neu.depotSerialisieren();
  const marke = await neu.standMarkeFuer('2026-10-01T10:00:00.000Z');
  const datei = Object.assign({}, umschlag, { stand_marke: marke });
  const altPfad = altenKern(commitDerFassung(fassung));
  try {
    const alt = ladeKern({ htmlPfad: altPfad }).V;
    await alt.depotLaden(JSON.parse(JSON.stringify(datei)), PW);
    assert.equal(alt.getData().sektoren.identity.givenName, 'Maria', fassung + ' liest den Inhalt');
    assert.equal(alt.getData().sektoren.health.bloodType, 'A+');
    // Gemessen, nicht verlangt: die ältere Fassung kennt die Marke nicht. Nach dem Öffnen hat sie keinen erwarteten
    // Stand → ihre erste Speicherung ist „erstes-speichern", kein Konflikt.
    assert.equal(alt.speicherKonfliktModell(null, datei).grund, 'erstes-speichern', fassung + ': kein falscher Speicher-Konflikt');
  } finally {
    const altOrdner = path.dirname(altPfad);
    fs.rmSync(altOrdner, { recursive: true, force: true });
  }
}

test('[Ältere Fassung·v818] öffnet die neue Datei (aufgefüllt, ohne Zeitpunkt) fehlerfrei — und was ihr Konfliktvergleich tut', () => aeltereFassungOeffnet('v818'));
test('[Ältere Fassung·v843] öffnet die neue Datei (aufgefüllt, ohne Zeitpunkt) fehlerfrei — und was ihr Konfliktvergleich tut', () => aeltereFassungOeffnet('v843'));
