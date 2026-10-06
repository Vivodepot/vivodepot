'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kette, Auftrag 8: der verschlüsselte Rückweg
   (SP Bau, 20.08.2026 — setzt Auftrag 7 voraus; Nachtrag vom 20.08. gelesen)
   ────────────────────────────────────────────────────────────────────────
   *Danach empfängt die Institution, ohne etwas zu installieren.*

   DER PRÜFSTOFF sind wieder die zwölf Angaben einer Heimaufnahme — derselbe
   wie in den Aufträgen 3 und 7. Ein Prüfstück würde hier besonders täuschen:
   der Rückweg soll GENAU das tragen, was die Bürgerin herausgegeben hat.

   DER SUCHRAUM: `vivodepot.html` (verschlüsseln), `vivodepot-lesen.html`
   (entschlüsseln, zeigen, weitergeben) und `vivodepot-studio.html`
   (das Empfangs-Schlüsselpaar). Drei Dateien, ein Verfahren.

   DIE ABBRUCHKLAUSELN sind hier als Proben gefahren, nicht als Behauptung:
   der gepinnte Krypto-Block bleibt byte-identisch (eigener Wächter, hier
   zusätzlich gemessen), die Empfängerseite läuft ohne Netz (Gegenprobe mit
   gesperrter Verbindung), und die offene Frage aus U2-ADR-085 betrifft den
   EUDIW-Pfad, nicht diesen — s. die Probe am Ende.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { jweLesbarerTeil } = require('./helfer/jwe-lesbar.js');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeGenerator } = require('./load-generator.js');

const PW = 'kette08-pw';
const JETZT = new Date('2026-08-20T10:00:00Z');
const GEN = ladeGenerator().V;

/* ── Der Prüfstoff: die zwölf Angaben einer Heimaufnahme ──────────────────── */
const ZWOELF = [
  { kennung: 'identity.givenName',                                   wert: 'Hedwig',                     zweck: 'Anrede im Aufnahmebogen' },
  { kennung: 'identity.familyName',                                  wert: 'Brandt',                     zweck: 'Anrede im Aufnahmebogen' },
  { kennung: 'identity.birthDate',                              wert: '1938-03-14',                 zweck: 'Zuordnung zur Akte' },
  { kennung: 'health.healthInsurance',                                    wert: { override: 'AOK Bayern' },   zweck: 'Abrechnung mit der Kasse' },
  { kennung: 'health.insuranceNumber',                                 wert: 'A123456780',                 zweck: 'Abrechnung mit der Kasse' },
  { kennung: 'socialInsurance.careLevel',                        wert: '3',                          zweck: 'Bemessung der Leistungen' },
  { kennung: 'socialInsurance.longTermCareFundPhone',                   wert: '089 123456',                 zweck: 'Rückfragen zur Kostenübernahme' },
  { kennung: 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation',  wert: null,                        zweck: 'Wer im Notfall entscheiden darf' },
  { kennung: 'health.medicationOngoing',                               wert: [{ text: 'Metformin 500' }],  zweck: 'Fortführung der Medikation' },
  { kennung: 'health.allergiesMedicationFoodOther',                                 wert: [{ text: 'Penicillin' }],     zweck: 'Vermeidung von Zwischenfällen' },
  { kennung: 'health.chronicConditionsDiagnoses',                               wert: [{ text: 'Diabetes Typ 2' }], zweck: 'Pflegeplanung' },
  { kennung: 'health.emergencyContacts',                         wert: null,                         zweck: 'Ansprechperson für die Station' },
];
async function heimaufnahmeDepot(auslassen) {
  const weg = new Set(auslassen || []);
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  for (const a of ZWOELF) {
    if (a.wert == null || weg.has(a.kennung)) continue;
    const sel = V.kennungZuSelektor(a.kennung);
    V.sektorFeldSetzen(sel.sektorId, sel.feldId, a.wert);
  }
  if (!weg.has('health.emergencyContacts')) {
    const p = V.personSicherstellen('Tochter Reiter');
    V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: (p && (p.id || p)) || 'Tochter Reiter' }]);
  }
  if (!weg.has('advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation')) {
    V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', storageLocation: 'Ordner im Wohnzimmer' });
  }
  return V;
}
function heimAnfrage(ueber) {
  return Object.assign({
    modulTyp: 'anfrage', anfrageVersion: 1,
    von: 'Pflegeheim Sonnenhof gGmbH',
    anbieterId: 'heim/sonnenhof',
    zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
    grundlage: '§ 630f BGB und der von Ihnen unterzeichnete Heimvertrag',
    vorgang: 'AUF-2026-0815',
    gueltigBis: '2099-12-31',
    felder: ZWOELF.map((a) => ({ kennung: a.kennung, zweck: a.zweck, pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example.de' },
  }, ueber || {});
}
/* Seit U2-ADR-449 (v833) schreibt der Kern die Antwort als JWE; die Lese-App öffnet sie mit antwortJweOeffnen und die
   Antworten aus der Zeit davor (Umschlag v1) weiter mit den v1-Funktionen. Die Proben unten halten dieselben Zusagen wie
   vorher — jetzt an der JWE. */
async function oeffnePw(L, jwe, pw) { return JSON.parse((await L.antwortJweOeffnen(jwe, { passwort: pw })).klartext); }
async function oeffneKey(L, jwe, priv) { return JSON.parse((await L.antwortJweOeffnen(jwe, { privateJwk: priv })).klartext); }
const jweKopf = (jwe) => JSON.parse(Buffer.from(String(jwe).split('.')[0], 'base64url').toString('utf8'));
function jweMitKopf(jwe, aendern) {
  const t = String(jwe).split('.');
  const k = jweKopf(jwe); aendern(k);
  t[0] = Buffer.from(JSON.stringify(k)).toString('base64url');
  return t.join('.');
}
async function empfangsPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  delete pub.key_ops; delete pub.ext;
  return { pub, priv };
}

/* ══ ZUG 1 — die zwei Verfahren, je Hin- und Rückrichtung ═════════════════
   „Ein Verfahren, bei dem nur der Fehlerfall geprüft ist, ist nicht geprüft." */

test('[Kette 08 · Zug 1 · tragend] Einmalpasswort: die zwölf Angaben gehen verschlüsselt hinaus und kommen vollständig an', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  assert.equal(ds.felder.length, 12, 'Vorbedingung: zwölf Angaben stehen im Datensatz');

  const u = await V.antwortVerschluesseln(ds, anfrage, { passwort: 'einmal-2026', anbieterId: 'heim/sonnenhof' });
  // Nichts von dem, was die Bürgerin eingetragen hat, steht im lesbaren Teil der JWE (Kopf samt apu/apv dekodiert);
  // im rohen base64url-Text wäre die Suche still grün.
  const lesbarerTeil = jweLesbarerTeil(u);
  for (const w of ['Hedwig', 'Brandt', '1938-03-14', 'A123456780', 'Penicillin', 'Metformin']) {
    assert.equal(lesbarerTeil.includes(w), false, 'im Klartext des Umschlags darf „' + w + '" nicht stehen');
  }
  // Und die Gegenrichtung: mit dem richtigen Passwort kommt alles an.
  const zurueck = await oeffnePw(L, u, 'einmal-2026');
  assert.equal(zurueck.felder.length, 12, 'nicht zehn, nicht sechs — zwölf');
  assert.deepEqual(Array.from(zurueck.felder).map((f) => f.kennung).sort(), ZWOELF.map((a) => a.kennung).sort());
});

test('[Kette 08 · Zug 1 · Rot-Beweis] ein falsches Einmalpasswort entschlüsselt NICHT', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage, { passwort: 'einmal-2026' });
  await assert.rejects(() => oeffnePw(L, u, 'einmal-2027'));
  // Gegenprobe im selben Test: das RICHTIGE tut es.
  const ok = await oeffnePw(L, u, 'einmal-2026');
  assert.equal(ok.felder.length, 12, 'ein Verfahren, bei dem nur der Fehlerfall geprüft ist, ist nicht geprüft');
});

test('[Kette 08 · Zug 1] Schlüsselpaar: der öffentliche Teil reist in der Anfrage, der private öffnet die Antwort', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const { pub, priv } = await empfangsPaar();
  const anfrage = heimAnfrage({ antwort: { art: 'schluesselpaar', an: 'personal@arbeitgeber.example.de', publicKeyJwk: pub } });
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  const u = await V.antwortVerschluesseln(ds, anfrage, { anbieterId: 'heim/sonnenhof' });
  assert.equal(jweKopf(u).alg, 'ECDH-ES');
  assert.equal(jweKopf(u).epk.crv, 'P-256', 'der flüchtige öffentliche Teil reist mit');
  assert.equal(jweKopf(u).epk.d, undefined, 'und NUR der öffentliche — der private verlässt die Funktion nie');
  const zurueck = await oeffneKey(L, u, priv);
  assert.equal(zurueck.felder.length, 12);
});
test('[Kette 08 · Zug 1 · Rot-Beweis] ein fremder privater Schlüssel entschlüsselt NICHT', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const { pub, priv } = await empfangsPaar();
  const fremd = await empfangsPaar();
  const anfrage = heimAnfrage({ antwort: { art: 'schluesselpaar', publicKeyJwk: pub } });
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage, {});
  await assert.rejects(() => oeffneKey(L, u, fremd.priv));
  const ok = await oeffneKey(L, u, priv);      // Gegenprobe
  assert.equal(ok.felder.length, 12);
});

test('[Kette 08 · Zug 1] JEDE Antwort trägt einen eigenen flüchtigen Schlüssel', async () => {
  const V = await heimaufnahmeDepot();
  const { pub } = await empfangsPaar();
  const anfrage = heimAnfrage({ antwort: { art: 'schluesselpaar', publicKeyJwk: pub } });
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  const a = await V.antwortVerschluesseln(ds, anfrage, {});
  const b = await V.antwortVerschluesseln(ds, anfrage, {});
  assert.notEqual(jweKopf(a).epk.x, jweKopf(b).epk.x, 'wer zweihundert Antworten abfängt, hat zweihundert Schlüssel vor sich');
  assert.notEqual(a.split('.')[3], b.split('.')[3]);
});

/* ── Die AAD-Bindung: wer sie behauptet, mutiert die AAD (Pflicht 1) ──────────
   In der JWE (U2-ADR-449) steht jede dieser Angaben im geschützten Kopf, der die AAD ist: `verfahren` ist `alg`,
   `vorgang` und `anbieterId` sind `vorgang` und `anbieter`, die Fassung `v` ist `typ`. */
const JWE_KOPF_FUER = { verfahren: ['alg', 'ECDH-ES'], vorgang: ['vorgang', 'etwas-anderes'], anbieterId: ['anbieter', 'etwas-anderes'], v: ['typ', 'vivodepot-antwort+jwe; v=99'] };
for (const feld of ['verfahren', 'vorgang', 'anbieterId', 'v']) {
  test('[Kette 08 · Zug 1 · Rot-Beweis] eine Antwort lässt sich nicht auf „' + feld + '" umetikettieren', async () => {
    const V = await heimaufnahmeDepot();
    const L = ladeLesen().V;
    const anfrage = heimAnfrage();
    const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage,
      { passwort: 'einmal-2026', anbieterId: 'heim/sonnenhof' });
    const [kopfFeld, wert] = JWE_KOPF_FUER[feld];
    const m = jweMitKopf(u, (k) => { k[kopfFeld] = wert; });
    await assert.rejects(() => oeffnePw(L, m, 'einmal-2026'),
      'ohne die Bindung landete die Antwort beim Empfänger in der falschen Akte');
  });
}
test('[Kette 08 · Zug 1 · Gegenprobe] der UNVERÄNDERTE Umschlag öffnet sich', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage,
    { passwort: 'einmal-2026', anbieterId: 'heim/sonnenhof' });
  const ds = await oeffnePw(L, u, 'einmal-2026');
  assert.equal(ds.anfrage.vorgang, 'AUF-2026-0815');
});
test('[Kette 08 · Zug 1 · Rot-Beweis] ein gekipptes Byte im Chiffrat wird bemerkt', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage, { passwort: 'p' });
  const t = u.split('.');
  const b = Buffer.from(t[3], 'base64url'); b[0] ^= 1; t[3] = b.toString('base64url');
  await assert.rejects(() => oeffnePw(L, t.join('.'), 'p'));
});

/* ── Der gepinnte Krypto-Block bleibt unberührt (Abbruchklausel 1) ────────── */
test('[Kette 08 · Abbruchklausel 1] der Rückweg fasst den gepinnten Krypto-Block NICHT an', () => {
  const kernL = require('./load-kern.js');
  const lesenL = require('./load-lesen.js');
  // Beide Anwendungen tragen DENSELBEN gepinnten Block — er ist in beiden byte-identisch.
  const kernScript1 = kernL.extrahiereScripts(fs.readFileSync(kernL.HTML_PATH, 'utf8')).script1;
  const lesenScript1 = lesenL.extrahiereScripts(fs.readFileSync(lesenL.LESEN_PATH, 'utf8')).script1;
  assert.equal(kernL.sha256(kernL.kryptoBlock(kernScript1)), kernL.BLOCK_HASH_ERWARTET,
    'der Block im Kern ist byte-identisch geblieben');
  assert.equal(lesenL.sha256(lesenL.kryptoBlock(lesenScript1)), lesenL.BLOCK_HASH_ERWARTET,
    'der Block in der Lese-App ebenso');
  // Und die Rückweg-Krypto liegt AUSSERHALB: keine ihrer Funktionen steht im Block.
  const blockKern = kernL.kryptoBlock(kernScript1);
  for (const name of ['antwortVerschluesseln', 'qrTeileZusammensetzen',
    'antwortJweSchluessel', 'antwortJwePasswort', '_jweConcatKdf']) {
    assert.equal(blockKern.includes(name), false, name + ' darf nicht im gepinnten Block stehen');
  }
});

/* ══ ZUG 2 — die Empfängerseite ═══════════════════════════════════════════ */

test('[Kette 08 · Zug 2] die Lese-App ERKENNT eine Antwort — vorher fiel sie auf „unbekannt"', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage, { passwort: 'p' });
  const erkannt = L.antwortJweAlsUmschlag(u);
  assert.equal(erkannt && erkannt.verfahren, 'einmalpasswort', 'die JWE-Antwort wird erkannt, mit ihrem Verfahren');
  // Und eine Antwort aus der Zeit vor der JWE (Umschlag v1) erkennt die Lese-App weiter. Der Kern schreibt v1 seit
  // 05.10.2026 nicht mehr; der Umschlag kommt aus der eingefrorenen Fixture (tests/kern-antwort-v1-entfernt.test.js).
  const v1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'antwort-v1-umschlaege.json'), 'utf8')).einmalpasswort.umschlag;
  assert.equal(L.erkenneFormat(v1), 'antwort');
  assert.equal(L.istAntwortUmschlag(v1), true);
});
test('[Kette 08 · Zug 2 · Gegenprobe] was keine Antwort ist, wird nicht dafür gehalten', () => {
  const L = ladeLesen().V;
  assert.equal(L.erkenneFormat({ dateiTyp: 'vivodepot-antwort', v: 1, verfahren: 'einmalpasswort' }), 'unbekannt',
    'Rumpf ohne Chiffrat ist kaputt, egal was in `v` steht');
  assert.equal(L.erkenneFormat({ was: 'anderes' }), 'unbekannt');
});

test('[Kette 08 · Zug 2] MEHRTEILIGE Serie, in FALSCHER Reihenfolge gescannt, ergibt denselben Datensatz', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage, { passwort: 'p' });
  const text = u;
  const teile = V.qrTeilePacken(text, 200);
  assert.ok(teile.length >= 3, 'Vorbedingung: die Antwort zerfällt in mehrere Teile (' + teile.length + ')');
  const rahmen = teile.map((t) => t.rahmen).reverse();          // rückwärts gescannt
  const z = L.qrTeileZusammensetzen(rahmen);
  assert.equal(z.fertig, true, z.grund || '');
  assert.equal(z.text, text, 'dieselbe Serie, andere Reihenfolge, derselbe Text');
  const ds = await oeffnePw(L, z.text, 'p');
  assert.equal(ds.felder.length, 12);
});
test('[Kette 08 · Zug 2 · Rot-Beweis] ein FEHLENDER Teil wird als fehlend gemeldet — nicht als Teilergebnis', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const teile = V.qrTeilePacken(JSON.stringify({ a: 'x'.repeat(900) }), 200);
  assert.ok(teile.length >= 4);
  const ohneZwei = teile.filter((t) => t.index !== 2).map((t) => t.rahmen);
  const z = L.qrTeileZusammensetzen(ohneZwei);
  assert.equal(z.fertig, false, 'eine stumm ausgegebene Teilausgabe ist ein Fehlschlag');
  assert.equal(z.grund, 'unvollstaendig');
  assert.deepEqual(Array.from(z.fehlend), [2], 'und WELCHER Teil fehlt, wird gesagt');
  assert.equal(z.text, undefined, 'es gibt kein halbes Ergebnis');
});
test('[Kette 08 · Zug 2 · Gegenprobe] Teile aus ZWEI Serien ergeben keinen halben Text, sondern einen Befund', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const a = V.qrTeilePacken('AAAA'.repeat(200), 200).map((t) => t.rahmen);
  const b = V.qrTeilePacken('BBBB'.repeat(200), 200).map((t) => t.rahmen);
  const z = L.qrTeileZusammensetzen([a[0], b[1]]);
  assert.equal(z.fertig, false);
  assert.equal(z.grund, 'fremde-gruppe');
});
test('[Kette 08 · Zug 2] der zustandsbehaftete Sammler läuft über DENSELBEN Zusammensetzer', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const teile = V.qrTeilePacken(JSON.stringify({ probe: 'y'.repeat(700) }), 200);
  let letzte = null;
  for (const t of teile.slice().reverse()) letzte = L.qrTeilAufnehmen(t.rahmen);
  assert.equal(letzte.fertig, true, 'ein Mechanismus, nicht zwei nebeneinander');
  assert.equal(JSON.parse(letzte.text).probe.length, 700);
});

test('[Kette 08 · Abbruchklausel 2 · Gegenprobe] die Empfängerseite entschlüsselt OHNE NETZ', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: true }), anfrage, { passwort: 'p' });
  const globale = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
  const zuvor = {};
  for (const g of globale) { zuvor[g] = global[g]; global[g] = function () { throw new Error('Netzzugriff gesperrt: ' + g); }; }
  try {
    const ds = await oeffnePw(L, u, 'p');
    assert.equal(ds.felder.length, 12, 'eine Empfängerseite, die eine Verbindung braucht, ist am Tresen wertlos');
  } finally {
    for (const g of globale) { if (zuvor[g] === undefined) delete global[g]; else global[g] = zuvor[g]; }
  }
});

/* ══ ZUG 3 — die Lese-App zeigt, was die Anwendung ihr zeigen will ════════ */

test('[Kette 08 · Zug 3] das Antwort-Blatt trägt jede Angabe UND jede Selbstaussage des Datensatzes', () => {
  const { pruefen, MUSS, DARF_NICHT } = require('../tools/lese-antwort-reichweite-pruefen.js');
  const r = pruefen();
  assert.deepEqual(r.fehlend.map((f) => f.was), [], 'nicht weniger: ' + r.fehlend.map((f) => f.was).join(', '));
  assert.deepEqual(r.zuviel.map((f) => f.was), [], 'nicht mehr: ' + r.zuviel.map((f) => f.was).join(', '));
  assert.ok(MUSS.length >= 10 && DARF_NICHT.length >= 2, 'der Wächter prüft beide Richtungen');
});
test('[Kette 08 · Zug 3 · Rot-Beweis] fällt der Teilantwort-Hinweis weg, schlägt der Wächter an', () => {
  const { blattHtml } = require('../tools/lese-antwort-reichweite-pruefen.js');
  const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');
  const original = fs.readFileSync(LESEN, 'utf8');
  const anker = '  if (!m.vollstaendig) {';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(require('node:os').tmpdir(), 'kette08-lesen-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, '  if (false) {'));
  try {
    const html = blattHtml(tmp);
    assert.equal(html.includes('TEILANTWORT'), false,
      'genau das fängt der Wächter: der Empfänger hielte fünf von neun Angaben für eine ganze Auskunft');
  } finally { fs.rmSync(tmp, { force: true }); }
  assert.equal(fs.readFileSync(LESEN, 'utf8'), original, 'die Probe darf die echte Lese-App nicht verändern');
});
test('[Kette 08 · Zug 3] das Modell zeigt keine Angabe, die im Datensatz nicht steht', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage({ felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }] });
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  const m = L.antwortAnzeigeModell(ds, { verfahren: 'einmalpasswort', vorgang: 'AUF-2026-0815' });
  assert.equal(m.felder.length, 1, 'eine gefragte Angabe, eine gezeigte — kein Depot dahinter');
  assert.equal(m.felder[0].wert, 'Hedwig');
  assert.equal(JSON.stringify(m).includes('Penicillin'), false, 'nichts, wonach niemand gefragt hat');
});

/* ══ DER ERZEUGER: das EMPFANGS-Schlüsselpaar ═════════════════════════════ */

test('[Kette 08] der Erzeuger baut ein EMPFANGS-Schlüsselpaar — ein zweites, kein umgewidmetes', async () => {
  const paar = await GEN.erzeugeEmpfangsSchluesselpaar();
  assert.equal(paar.publicJwk.kty, 'EC');
  assert.equal(paar.publicJwk.crv, 'P-256', 'ECDH über P-256 — X25519 gibt es an älteren Tresen nicht');
  assert.equal(paar.publicJwk.d, undefined, 'der öffentliche Teil trägt kein Geheimnis');
  assert.ok(paar.privateJwk.d, 'und der private eines');
});
test('[Kette 08 · Rot-Beweis] eine Schlüsselpaar-Anfrage OHNE Empfangsschlüssel wird gar nicht erst erzeugt', async () => {
  const st = {
    anbieter: { anbieterId: 'ag/muster', anbieterName: 'Arbeitgeber Muster' },
    anfrage: { zweck: 'Sicherheitsunterweisung', grundlage: '§ 5 ArbSchG', vorgang: 'AG-7',
      gueltigBis: '2099-12-31', antwortArt: 'schluesselpaar',
      felder: [{ kennung: 'identity.givenName', zweck: 'Anrede' }], empfangPublicJwk: null },
  };
  const blocker = Array.from(GEN.pruefeAnfrage(st).blocker);
  assert.ok(blocker.some((b) => b.includes('Empfangs-Schlüsselpaar')),
    'sonst verschlüsselte die Bürgerin gegen einen Schlüssel, mit dem sich nichts öffnen lässt');
  // Gegenprobe: mit Schlüssel ist der Blocker weg.
  st.anfrage.empfangPublicJwk = (await GEN.erzeugeEmpfangsSchluesselpaar()).publicJwk;
  assert.deepEqual(Array.from(GEN.pruefeAnfrage(st).blocker), []);
});

/* ══ DER GANZE WEG (Ebene 3) ══════════════════════════════════════════════
   Anfrage erzeugen · zustellen · lesen · abgleichen · nachtragen · beantworten ·
   VERSCHLÜSSELT zustellen · beim Empfänger öffnen · zeigen · weitergeben. */

test('[Kette 08 · Ebene 3] der ganze Rückweg, Schlüsselpaar-Verfahren, über QR in mehreren Teilen', async () => {
  // 1 · Die Institution baut die Anfrage MIT Empfangs-Schlüsselpaar.
  const paar = await GEN.erzeugeEmpfangsSchluesselpaar();
  const st = {
    anbieter: { anbieterId: 'heim/sonnenhof', anbieterName: 'Pflegeheim Sonnenhof gGmbH' },
    anfrage: {
      zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
      grundlage: '§ 630f BGB und der unterzeichnete Heimvertrag',
      vorgang: 'AUF-2026-0815', gueltigBis: '2099-12-31',
      antwortArt: 'schluesselpaar', antwortAn: 'aufnahme@sonnenhof.example.de',
      felder: ZWOELF.map((a) => ({ kennung: a.kennung, zweck: a.zweck, pflicht: true })),
      empfangPublicJwk: paar.publicJwk,
    },
  };
  const gebaut = GEN.pruefeAnfrage(st);
  assert.deepEqual(Array.from(gebaut.blocker), []);

  // 2 · Zustellung als mehrteiliger QR — der Regelfall, nicht die Notlösung.
  const B = await heimaufnahmeDepot(['health.insuranceNumber']);
  const umschlagText = JSON.stringify({ anfrage: gebaut.anfrage });
  const anfrageTeile = B.qrTeilePacken(umschlagText, 300);
  assert.ok(anfrageTeile.length >= 2, 'die Anfrage kommt in ' + anfrageTeile.length + ' Teilen');

  // 3 · Lesen — in umgekehrter Reihenfolge, und ein fehlender Teil wird zuerst gemeldet.
  const unvollstaendig = B.anfrageAusTeilen(anfrageTeile.slice(1).map((t) => t.rahmen));
  assert.equal(unvollstaendig.ok, false);
  assert.deepEqual(Array.from(unvollstaendig.fehlend), [1], 'welcher Teil fehlt, wird gesagt');
  const gelesen = B.anfrageAusTeilen(anfrageTeile.map((t) => t.rahmen).reverse());
  assert.equal(gelesen.ok, true, gelesen.grund || '');

  // 4 · Abgleichen und nachtragen.
  const eintrag = B.anfrageMerken(gelesen.umschlag, null).eintrag;
  assert.deepEqual(B.anfrageAbgleich(eintrag.anfrage, { jetzt: JETZT }).fehlend.map((f) => f.kennung),
    ['health.insuranceNumber']);
  assert.equal(B.anfrageFeldNachtragen('health.insuranceNumber', 'A123456780').ok, true);

  // 5 · Beantworten — verschlüsselt für den Schlüssel aus der Anfrage.
  const ds = B.anfrageAntwortDatensatz(eintrag.anfrage, { sensibel: true });
  const antwort = await B.antwortVerschluesseln(ds, eintrag.anfrage, { anbieterId: eintrag.anbieterId });
  B.anfrageBeantwortetVermerken(eintrag.anfrage.vorgang, eintrag.anbieterId);
  assert.equal(B.anfrageZustand(B.anfragenListe()[0], JETZT), 'beantwortet');

  // 6 · Zustellung der ANTWORT, ebenfalls mehrteilig und rückwärts gescannt.
  const L = ladeLesen().V;
  const antwortTeile = B.qrTeilePacken(antwort, 300);
  const z = L.qrTeileZusammensetzen(antwortTeile.map((t) => t.rahmen).reverse());
  assert.equal(z.fertig, true);
  const beimEmpfaenger = L.antwortJweAlsUmschlag(z.text);
  assert.equal(beimEmpfaenger && beimEmpfaenger.verfahren, 'schluesselpaar');

  // 7 · Öffnen, zeigen, weitergeben.
  const klar = await oeffneKey(L, z.text, paar.privateJwk);
  const m = L.antwortAnzeigeModell(klar, beimEmpfaenger);
  assert.equal(m.felder.length, 12, 'alle zwölf Angaben sind da');
  assert.equal(m.vollstaendig, true, 'und der Datensatz sagt es');
  assert.equal(m.vorgang, 'AUF-2026-0815', 'der Empfänger weiss, worauf das die Antwort ist');
  assert.ok(m.grundlage.includes('§ 630f BGB'), 'und auf welcher Grundlage er gefragt hat');
  for (const f of m.felder) assert.ok(f.zweck, 'je Angabe steht da, wozu sie gefragt wurde');
});

/* ══ Die offene Frage aus U2-ADR-085 — geprüft, nicht angenommen ══════════ */

test('[Kette 08 · Abbruchklausel 3] der offene EUDIW-Punkt aus U2-ADR-085 ist von diesem Zug NICHT berührt', () => {
  const adr = fs.readFileSync(path.join(__dirname, '..', 'docs', 'adr',
    'vivodepot-U2-ADR-085-institutions-stufenmodell-2026-07-14.md'), 'utf8');
  // Der offene Punkt hängt daran, dass der Rahmen für eine FREMDE Wallet benutzt würde.
  assert.ok(adr.includes('Bei\nReaktivierung von EUDIW ist es die erste zu klärende Frage')
    || adr.includes('Reaktivierung von EUDIW'), 'Vorbedingung: der offene Punkt steht in der ADR');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(kern.includes('EUDIW_SICHTBAR = false'),
    'der EUDIW-Pfad bleibt ausgeblendet — dieser Auftrag reaktiviert ihn nicht');
  // Und der Empfänger dieses Wegs IST die Lese-App, also gilt die Prämisse von Entscheidung 1.
  const lesen = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  assert.ok(lesen.includes('qrTeileZusammensetzen'),
    'der Zusammensetzer steht dort, wo der Empfänger die Lese-App ist');
});

/* ══ DER FUND BEIM BAU: eine zurückgehaltene PFLICHTANGABE ════════════════
   Ein Feld, das die Sensibel-Prüfung zurückhält, steht weder in `felder` noch
   in `fehlend` — es wird nur gezählt. War es ein Pflichtfeld der Anfrage, sah
   die Antwort damit VOLLSTÄNDIG aus, obwohl die verlangte Angabe fehlte. Das
   ist die stille Teilantwort an der Stelle, an der Auftrag 7 sie gerade
   abgeschafft hatte, nur eine Ebene tiefer — beim Empfänger. */

test('[Kette 08 · Fund] eine zurückgehaltene PFLICHTANGABE macht die Antwort unvollständig', async () => {
  const V = await heimaufnahmeDepot();
  const anfrage = heimAnfrage();
  const ohneFreigabe = V.anfrageAntwortDatensatz(anfrage, {});          // sensibel NICHT freigegeben
  assert.ok(ohneFreigabe.zurueckgehalten.sensibel > 0, 'Vorbedingung: es wird etwas zurückgehalten');
  assert.ok(ohneFreigabe.zurueckgehalten.pflicht > 0, 'und es waren Pflichtangaben');
  assert.equal(ohneFreigabe.vollstaendig, false,
    'ohne diese Zeile hielte der Empfänger eine beschnittene Antwort für eine ganze');
  // Die zurückgehaltene Angabe wird GEZÄHLT, nicht BENANNT — das wäre eine Aussage über die
  // Bürgerin, die sie mit dem Zurückhalten gerade nicht machen wollte.
  const genannt = new Set(Array.from(ohneFreigabe.felder).concat(Array.from(ohneFreigabe.fehlend)).map((f) => f.kennung));
  assert.equal(genannt.has('health.insuranceNumber'), false, 'sie steht in keiner der beiden Listen');
});
test('[Kette 08 · Fund · Gegenprobe] mit Freigabe ist dieselbe Antwort vollständig', async () => {
  const V = await heimaufnahmeDepot();
  const anfrage = heimAnfrage();
  const mitFreigabe = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  assert.equal(mitFreigabe.zurueckgehalten.pflicht, 0);
  assert.equal(mitFreigabe.vollstaendig, true);
  assert.equal(mitFreigabe.felder.length, 12);
});
test('[Kette 08 · Fund] das Antwort-Blatt der Lese-App sagt es dem Empfänger', async () => {
  const V = await heimaufnahmeDepot();
  const L = ladeLesen().V;
  const anfrage = heimAnfrage();
  const ds = V.anfrageAntwortDatensatz(anfrage, {});
  const m = L.antwortAnzeigeModell(ds, { verfahren: 'einmalpasswort', vorgang: 'AUF-2026-0815' });
  assert.equal(m.vollstaendig, false);
  assert.ok(m.zurueckgehalten > 0, 'und wie viele zurückgehalten wurden');
});
