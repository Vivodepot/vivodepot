#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   huelle-lesbar-messen.js — was eine Depot-Datei ohne Passwort über ihren Aufbau zeigt (U2-ADR-520 Nr. 3, 04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Posten HUELLE-AUFBAU-VERDECKEN. Das Werkzeug liest eine Depot-Datei (v4) OHNE Passwort und gibt die lesbaren Punkte aus:
     1  Zahl der Fach-Einträge in umschlagTabelle
     2  Lücken in den Fach-Nummern („Fach n“)
     3  Felder je Eintrag (der eigene Eintrag ohne fachSchluessel/tuerSalt)
     4  je Fach, ob tuerSalt dem depotSalt gleicht (dann wechselte das Passwort seit dem Einrichten nicht)
     5  Größenstufen der Einheiten (Chiffrat-Bytes, 1-KiB-Stufen)
     6  Zahl der Einheiten
     7  ob `wiederherstellung` existiert
   Mit --messen misst es zusätzlich die Öffnungsdauer am echten Lesepfad (`depotLaden`): mit dem Passwort eines Empfängers
   und mit einem falschen Passwort, für 0, 4 und 8 zusätzliche Attrappen-Fächer. Die Attrappen haben die Form, die der Bau
   schreiben soll (alle Felder eines echten Fachs, Zufallsbytes gleicher Länge); der Lesepfad leitet für jede eine Tür ab.

     node tools/huelle-lesbar-messen.js [--depot <datei> [--kreis-passwort <pw>]] [--messen [--wiederholungen N]] [--json <datei>]

   Ohne --depot gegen ein Beispiel-Depot, das das Werkzeug mit dem Kern dieses Baums im Speicher baut: drei Kreise mit Fach,
   das Fach des mittleren ist entfernt (Fach 3 fehlt). Als Datei läge es bei 1,3 MB, weil jedes neue Depot die Mitschrift der
   Werksmodule trägt; darum kein Fixture-Blob. Die Passwörter sind Testwerte und stehen unten.
   Exit 0 immer beim Messen; die Bewertung macht die Probe (tests/huelle-lesbar-messen.test.js).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

const WURZEL = path.join(__dirname, '..');
const FIXTURE_PW = { inhaberin: 'Huelle-Inhaberin-2026-11-04!', kreis: 'Huelle-Kreis-Vier-2026!' };

const b64 = (s) => Buffer.from(String(s), 'base64');
const zufallB64 = (n) => Buffer.from(webcrypto.getRandomValues(new Uint8Array(n))).toString('base64');

/* Die lesbaren Punkte einer v4-Datei, ohne Schlüssel. */
function lesbar(umschlag) {
  const u = umschlag || {};
  const tabelle = Array.isArray(u.umschlagTabelle) ? u.umschlagTabelle : [];
  const nummern = tabelle.map((e) => parseInt(String((e && e.kennung) || '').replace(/\D+/g, ''), 10)).filter(Number.isFinite);
  const hoechste = nummern.length ? Math.max(...nummern) : 0;
  const luecken = [];
  for (let n = 1; n <= hoechste; n++) if (!nummern.includes(n)) luecken.push(n);
  const felder = tabelle.map((e) => Object.keys(e || {}).sort().join(',') + (e && e.kdf ? ' kdf:' + Object.keys(e.kdf).filter((k) => e.kdf[k] !== undefined).sort().join(',') : ''));
  const tuerGleichDepot = tabelle.slice(1).map((e) => !!(e && e.kdf && e.kdf.tuerSalt && e.kdf.tuerSalt === u.depotSalt));
  const stufen = {};
  for (const ch of Object.values(u.einheiten || {})) {
    const bytes = ch && typeof ch.ct === 'string' ? b64(ch.ct).length : 0;
    const stufe = Math.ceil(bytes / 1024);
    stufen[stufe] = (stufen[stufe] || 0) + 1;
  }
  return {
    faecher: tabelle.length,
    luecken,
    feldformen: [...new Set(felder)].length,
    felder,
    tuerSaltGleichDepotSalt: tuerGleichDepot,
    einheiten: Object.keys(u.einheiten || {}).length,
    stufenJeKiB: stufen,
    wiederherstellung: Object.prototype.hasOwnProperty.call(u, 'wiederherstellung'),
  };
}

/* Ein Attrappen-Fach in der Form, die der Bau schreiben soll: dieselben Felder und Längen wie das Vorbild. */
function attrappeFach(vorbild, kennung) {
  const laenge = (s) => (typeof s === 'string' ? b64(s).length : 16);
  const umschlaege = {};
  for (const [a, x] of Object.entries(vorbild.umschlaege || {})) umschlaege[a] = { iv: zufallB64(laenge(x.iv)), ct: zufallB64(laenge(x.ct)) };
  return {
    kennung,
    kdf: { salt: zufallB64(laenge(vorbild.kdf.salt)), iterationen: vorbild.kdf.iterationen, tuerSalt: zufallB64(laenge(vorbild.kdf.tuerSalt || vorbild.kdf.salt)) },
    fachSchluessel: { iv: zufallB64(laenge(vorbild.fachSchluessel.iv)), ct: zufallB64(laenge(vorbild.fachSchluessel.ct)) },
    umschlaege,
    geheim: { iv: zufallB64(laenge(vorbild.geheim.iv)), ct: zufallB64(laenge(vorbild.geheim.ct)) },
  };
}
/* Die Datei mit n Attrappen VOR den echten Fächern (ungünstigster Fall: der Leser probiert sie zuerst). */
function mitAttrappen(umschlag, n) {
  const u = JSON.parse(JSON.stringify(umschlag));
  const echte = u.umschlagTabelle.slice(1);
  const vorbild = echte.find((e) => e.fachSchluessel);
  if (!vorbild || n <= 0) return u;
  const hoechste = Math.max(...u.umschlagTabelle.map((e) => parseInt(String(e.kennung).replace(/\D+/g, ''), 10)));
  const attrappen = [];
  for (let i = 0; i < n; i++) attrappen.push(attrappeFach(vorbild, 'Fach ' + (hoechste + 1 + i)));
  u.umschlagTabelle = [u.umschlagTabelle[0]].concat(attrappen, echte);
  return u;
}

async function messen(umschlag, pw, wiederholungen) {
  const { ladeKern } = require(path.join(WURZEL, 'tests', 'load-kern.js'));
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const zeit = async (u, passwort) => {
    const V = ladeKern().V;
    const t0 = process.hrtime.bigint();
    let ok = true;
    try { await V.depotLaden(JSON.parse(JSON.stringify(u)), passwort); } catch (_) { ok = false; }
    return { ms: Number(process.hrtime.bigint() - t0) / 1e6, ok };
  };
  const raus = [];
  for (const n of [0, 4, 8]) {
    const u = mitAttrappen(umschlag, n);
    const kreis = [], falsch = [];
    let kreisOk = true;
    for (let i = 0; i < wiederholungen; i++) {
      const k = await zeit(u, pw.kreis); kreis.push(k.ms); kreisOk = kreisOk && k.ok;
      falsch.push((await zeit(u, 'falsch-falsch-falsch-2026')).ms);
    }
    raus.push({ attrappen: n, faecher: u.umschlagTabelle.length, kreisMs: Math.round(median(kreis)), kreisGeoeffnet: kreisOk, falschMs: Math.round(median(falsch)) });
  }
  return raus;
}

async function beispielDepot() {
  const { ladeKern } = require(path.join(WURZEL, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  await V.depotAnlegen(FIXTURE_PW.inhaberin);
  V.akteurSelbstErklaeren('Erika Beispiel');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  for (const name of ['Kreis A', 'Kreis B', 'Kreis C']) await V.empfaengerkreisSetzen({ name, bausteine: ['notfall'] });
  const kreise = V.empfaengerkreiseListe();
  for (let i = 0; i < kreise.length; i++) {
    await V.empfaengerkreisFachEinrichten(kreise[i], i === 2 ? FIXTURE_PW.kreis : FIXTURE_PW.kreis + '-' + i, null);
  }
  await V.empfaengerkreisFachEntfernen(V.empfaengerkreiseListe()[1].id);   // der mittlere Kreis: Fach 3 fehlt danach
  return V.depotSerialisieren();
}

async function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const datei = arg('--depot');
  const umschlag = datei ? JSON.parse(fs.readFileSync(datei, 'utf8')) : await beispielDepot();
  const erg = { datei: datei ? path.relative(process.cwd(), datei) : '(Beispiel-Depot im Speicher)', lesbar: lesbar(umschlag) };
  if (argv.includes('--messen')) {
    if (datei && !arg('--kreis-passwort')) throw new Error('--messen mit --depot braucht --kreis-passwort');
    erg.messung = await messen(umschlag, { kreis: arg('--kreis-passwort') || FIXTURE_PW.kreis }, Math.max(1, parseInt(arg('--wiederholungen') || '3', 10)));
    erg.rechner = { plattform: process.platform, arch: process.arch, node: process.version, cpus: require('node:os').cpus().length, modell: (require('node:os').cpus()[0] || {}).model };
  }
  const text = JSON.stringify(erg, null, 2);
  if (arg('--json')) fs.writeFileSync(arg('--json'), text + '\n');
  console.log(text);
  return 0;
}

module.exports = { lesbar, attrappeFach, mitAttrappen, beispielDepot, FIXTURE_PW };
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error('[huelle-lesbar-messen] ' + e.message); process.exit(2); });
