'use strict';
/* huelle-aufbau-verdecken.test.js — Attrappen-Fächer und zufälliger Tür-Salt (U2-ADR-520 Nr. 3, Posten HUELLE-AUFBAU-VERDECKEN, 04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ohne Passwort zeigte die Depot-Datei, wie viele Empfängerkreise ein Fach haben, ob Fach-Nummern fehlen und ob seit dem
   Einrichten eines Fachs das Passwort wechselte (tuerSalt == depotSalt). Jetzt füllen Attrappen die Lücken und runden auf
   ein Vielfaches von 4 auf; neue Fächer tragen einen zufälligen Tür-Salt.
   Gehalten wird, mit dem Werkzeug tools/huelle-lesbar-messen.js (ohne Passwort):
     · keine Lücke, Fachzahl ein Vielfaches von 4, eine Feldform für alle Fach-Einträge, gleiche Längen, kein tuerSalt == depotSalt;
     · Inhaberin, Empfänger und falsches Passwort verhalten sich wie vorher;
     · der Lesepfad ist zeichengleich mit v1038, in Kern und Lese-App: ältere Leser gehen über die Attrappen wie über ein fremdes Fach.
   ROT-BEWEISE: ohne Attrappen fehlt Fach 3 sichtbar; mit dem Depot-Salt als Tür-Salt sind echte Fächer von Attrappen zu unterscheiden. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');
const M = require('../tools/huelle-lesbar-messen.js');
const F = require('../tools/format-pruefen.js');

const WURZEL = path.join(__dirname, '..');
const b = (s) => Buffer.from(s, 'base64').length;

function kernMit(ersetzen) {
  let roh = fs.readFileSync(HTML_PATH, 'utf8');
  for (const [alt, neu] of ersetzen) { assert.equal(roh.split(alt).length, 2, 'Stelle genau einmal: ' + alt.slice(0, 60)); roh = roh.replace(alt, neu); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huelle-verdecken-'));
  const kopie = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(kopie, roh);
  return { kern: ladeKern({ htmlPfad: kopie }), weg: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('[Hülle·Fächer] ohne Passwort: keine Lücke, vier gleich gebaute Fach-Einträge, kein Tür-Salt gleich dem Depot-Salt', async () => {
  const u = await M.beispielDepot();
  const l = M.lesbar(u);
  assert.equal(l.faecher % 4, 0, 'Fachzahl auf die Stufe gerundet: ' + l.faecher);
  assert.deepEqual(l.luecken, [], 'keine fehlende Nummer');
  assert.equal(new Set(l.felder.slice(1)).size, 1, 'eine Feldform für jedes Fach: ' + l.felder.join(' / '));
  assert.deepEqual(l.tuerSaltGleichDepotSalt.filter(Boolean), [], 'kein Tür-Salt gleich dem Depot-Salt');
  const faecher = u.umschlagTabelle.slice(1);
  for (const feld of ['iv', 'ct']) {
    assert.equal(new Set(faecher.map((e) => b(e.fachSchluessel[feld]))).size, 1, 'fachSchluessel.' + feld + ' gleich lang');
    assert.equal(new Set(u.umschlagTabelle.map((e) => b(e.geheim[feld]))).size, 1, 'geheim.' + feld + ' gleich lang');
  }
  assert.equal(new Set(faecher.map((e) => b(e.kdf.salt))).size, 1);
  assert.equal(new Set(faecher.map((e) => b(e.kdf.tuerSalt))).size, 1);
  assert.equal(new Set(faecher.map((e) => Object.keys(e.umschlaege).sort().join())).size, 1, 'jedes Fach hat Umschläge für alle Einheiten');
  // Das Prüfprogramm für fremde Leser meldet an den Attrappen nichts.
  const r = await F.dateiPruefen('VIVODEPOT' + String.fromCharCode(1) + JSON.stringify(u));
  assert.deepEqual(r.befunde.map((x) => x.code), [], 'tools/format-pruefen.js ohne Befund');
});

test('[Hülle·Fächer] ein Depot ohne Kreise trägt ebenfalls vier Fach-Einträge', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Huelle-Ohne-Kreise-2026-11-04!');
  const l = M.lesbar(await V.depotSerialisieren());
  assert.equal(l.faecher, 4);
  assert.deepEqual(l.luecken, []);
});

test('[Hülle·Öffnen] Inhaberin und Empfänger öffnen wie vorher, ein falsches Passwort meldet dasselbe', async () => {
  const u = await M.beispielDepot();
  const inhaberin = await ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), M.FIXTURE_PW.inhaberin);
  assert.ok(inhaberin, 'die Inhaberin öffnet');
  const kreis = await ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), M.FIXTURE_PW.kreis);
  assert.ok(kreis, 'Kreis C öffnet sein Fach hinter der Attrappe');
  const kreisA = await ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), M.FIXTURE_PW.kreis + '-0');
  assert.ok(kreisA, 'Kreis A öffnet sein Fach');
  await assert.rejects(ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), M.FIXTURE_PW.kreis + '-1'),
    'das entfernte Fach von Kreis B öffnet nichts, auch keine Attrappe');
  await assert.rejects(ladeKern().V.depotLaden(JSON.parse(JSON.stringify(u)), 'falsch-falsch-falsch-2026'));
});

/* Der Lesepfad (Fach-Schleife, Eintrag, Tür) in v1038, gemessen am 04.11.2026 mit
   `git show origin/u2-kanon:vivodepot.html` (Kanon v1038) und ebenso vivodepot-lesen.html: SHA-256 der drei Funktionstexte. */
const LESEPFAD_V1038 = '0a251e7b132aef7e5999cab99aa1ba9421ef2e19c4f9281477b236bd7a1b5674';
function funktion(src, name) {
  const i = src.indexOf('async function ' + name + '(');
  if (i < 0) return '';
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1);
  }
  return '';
}
const lesepfad = (src) => crypto.createHash('sha256')
  .update(['_zerfallLesen', '_zerfallEintragLesen', '_fachTuerSchluessel'].map((n) => funktion(src, n)).join('\n')).digest('hex');

test('[Hülle·ältere Leser] der Lesepfad in Kern und Lese-App ist zeichengleich mit v1038; er öffnet die Datei mit Attrappen', async () => {
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    assert.equal(lesepfad(fs.readFileSync(path.join(WURZEL, datei), 'utf8')), LESEPFAD_V1038, datei + ': Lesepfad wie in v1038');
  }
  // Mit genau diesem Lesepfad öffnet der Empfänger hinter den Attrappen (Test oben); hier zusätzlich die ungünstigste Lage:
  // alle Attrappen vor dem echten Fach.
  const u = await M.beispielDepot();
  const echte = u.umschlagTabelle.filter((e) => e.kennung !== 'Fach 1');
  const vorne = JSON.parse(JSON.stringify(u));
  vorne.umschlagTabelle = [u.umschlagTabelle[0]].concat(M.mitAttrappen(u, 4).umschlagTabelle.slice(1, 5), echte);
  assert.ok(await ladeKern().V.depotLaden(vorne, M.FIXTURE_PW.kreis), 'der Empfänger öffnet auch hinter vier weiteren Attrappen');
});

test('[Hülle·Rot-Beweis] ohne Attrappen fehlt Fach 3 sichtbar und die Fachzahl verrät die Kreise', async () => {
  const k = kernMit([['    _zerfallFachAttrappenAnhaengen(tabelle, umschlaege, depotSalt);\n', '']]);
  try {
    const V = k.kern.V;
    await V.depotAnlegen(M.FIXTURE_PW.inhaberin);
    V.akteurSelbstErklaeren('Erika Beispiel');
    for (const name of ['Kreis A', 'Kreis B', 'Kreis C']) await V.empfaengerkreisSetzen({ name, bausteine: ['notfall'] });
    for (const [i, kreis] of V.empfaengerkreiseListe().entries()) await V.empfaengerkreisFachEinrichten(kreis, 'Kreis-' + i + '-2026-11-04!', null);
    await V.empfaengerkreisFachEntfernen(V.empfaengerkreiseListe()[1].id);
    const l = M.lesbar(await V.depotSerialisieren());
    assert.deepEqual(l.luecken, [3]);
    assert.equal(l.faecher, 3);
  } finally { k.weg(); }
});

test('[Hülle·Rot-Beweis] mit dem Depot-Salt als Tür-Salt wären echte Fächer von den Attrappen zu unterscheiden', async () => {
  const k = kernMit([['  const tuerSalt = crypto.getRandomValues(new Uint8Array(aktuelleDepotSalt.length));\n', '  const tuerSalt = aktuelleDepotSalt;\n']]);
  try {
    const V = k.kern.V;
    await V.depotAnlegen(M.FIXTURE_PW.inhaberin);
    V.akteurSelbstErklaeren('Erika Beispiel');
    await V.empfaengerkreisSetzen({ name: 'Kreis A', bausteine: ['notfall'] });
    await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], 'Kreis-A-2026-11-04!', null);
    const l = M.lesbar(await V.depotSerialisieren());
    assert.deepEqual(l.tuerSaltGleichDepotSalt, [true, false, false], 'das echte Fach verrät sich am Tür-Salt');
  } finally { k.weg(); }
});

test('[Hülle·Schutz] ein Fach-Eintrag mit anderer Feldform wird nicht geschrieben', () => {
  const { V } = ladeKern();
  const fach = (mitTuer) => ({ kennung: 'Fach 2', kdf: Object.assign({ salt: 'AA==', iterationen: 1 }, mitTuer ? { tuerSalt: 'AA==' } : {}),
    fachSchluessel: { iv: 'AAAA', ct: 'AAAA' }, umschlaege: {}, geheim: { iv: 'AAAA', ct: 'AAAA' } });
  const anker = { kennung: 'Fach 1', kdf: {}, umschlaege: {}, geheim: { iv: 'AAAA', ct: 'AAAA' } };
  assert.doesNotThrow(() => V._zerfallLaengenPruefen([anker, fach(true), fach(true)]));
  assert.throws(() => V._zerfallLaengenPruefen([anker, fach(true), fach(false)]), /zerfall-form/);
});
