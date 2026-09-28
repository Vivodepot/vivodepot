'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   U2-ADR-430 — Wiederherstellungs-Code: die Proben der Hülle (Bau 27.09.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Je Zusicherung eine Probe mit Rot-Beweis; die Nummern sind die des Report-before-Build
   (#3, #5, #7, #10, #11, #14, #17–#23 und die Probe zum Passwortwechsel, Frage B).
   Gemessen wird an der geschriebenen Datei, nicht am Zustand im Speicher.
   Die Browser-Seite (angezeigte Sätze, Ziffer 2 und 7) steht in
   tests/e2e/wiederherstellungs-code.spec.js.
   ═════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const PW = 'whc-probe-passwort-2026';
const PW_NEU = 'whc-probe-neues-passwort-2026';
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const KANON_VOR_DEM_BAU = '875d31856';   // der Kern, der die Hülle nicht kennt (Prüfstein Ziffer 5, #3)

// Eine Funktion des Kerns als Quelltext, bis zur schließenden Klammer auf Spalte 0.
function funktionsText(quelle, name) {
  const re = new RegExp('^(async )?function ' + name + '\\(', 'm');
  const m = re.exec(quelle);
  assert.ok(m, 'Vorbedingung: ' + name + ' steht im Kern');
  const ende = quelle.indexOf('\n}\n', m.index);
  return quelle.slice(m.index, ende + 2);
}

async function depotMitInhalt(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Ayse Beispiel');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  return V;
}

// Richtet eine Hülle ein und liefert den Code, wie die Nutzerin ihn abschreibt (gruppiert).
async function mitHuelle(V) {
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(PW, code.slice(0, V.WHC_STELLEN));
  return V.whcCodeGruppiert(code);
}

const kopie = (u) => JSON.parse(JSON.stringify(u));

// ── #7 Code erzeugt, ≥ 128 Bit, gemessen am Erzeugten ───────────────────────────────────────────
function entropieGemessen(codes, stellen) {
  let bits = 0;
  for (let i = 0; i < stellen; i++) bits += Math.log2(new Set(codes.map((c) => c[i])).size);
  return bits;
}

test('[WHC·#7] 10 000 erzeugte Codes: je Stelle alle 32 Zeichen, zusammen ≥ 128 Bit, keine Wiederholung, Verteilung im Band', () => {
  const { V } = ladeKern();
  const codes = Array.from({ length: 10000 }, () => V.whcCodeErzeugen());
  assert.ok(codes.every((c) => c.length === V.WHC_STELLEN + 1 && /^[0-9A-HJKMNP-TV-Z]+$/.test(c)), 'Alphabet und Länge');
  assert.equal(new Set(codes).size, codes.length, 'keine Wiederholung');
  const bits = entropieGemessen(codes, V.WHC_STELLEN);
  assert.ok(bits >= 128, 'gemessen ' + bits.toFixed(1) + ' Bit');
  for (let i = 0; i < V.WHC_STELLEN; i++) {
    const zaehl = {};
    for (const c of codes) zaehl[c[i]] = (zaehl[c[i]] || 0) + 1;
    for (const n of Object.values(zaehl)) assert.ok(n > 200 && n < 440, 'Stelle ' + i + ': ' + n + ' außerhalb des Bands um 312');
  }
  assert.ok(codes.every((c) => V.whcCodeLesen(c) === c.slice(0, V.WHC_STELLEN)), 'jeder erzeugte Code liest sich zurück');
});

test('[WHC·#7·Rot-Beweis] ein Generator mit festem Präfix (64 Bit) fällt unter die Schwelle', () => {
  const { V } = ladeKern();
  const fest = (n) => { const b = webcrypto.getRandomValues(new Uint8Array(n)); b.fill(0, 0, n - 13); return b; };
  const codes = Array.from({ length: 2000 }, () => V.whcCodeErzeugen(fest));
  assert.ok(entropieGemessen(codes, V.WHC_STELLEN) < 128, 'die Messung erkennt den schwachen Generator');
});

test('[WHC·Prüfzeichen] ein falsch abgeschriebenes Zeichen wird erkannt; O/0, I/L/1, Klein, Bindestriche sind egal', () => {
  const { V } = ladeKern();
  const code = V.whcCodeErzeugen();
  const g = V.whcCodeGruppiert(code);
  assert.match(g, /^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/, 'sieben Vierergruppen');
  assert.equal(V.whcCodeLesen(g.toLowerCase().replace(/-/g, ' ')), code.slice(0, V.WHC_STELLEN));
  let erkannt = 0;
  for (let i = 0; i < code.length; i++) {
    const anders = V.WHC_ALPHABET[(V.WHC_ALPHABET.indexOf(code[i]) + 1) % 32];
    if (V.whcCodeLesen(code.slice(0, i) + anders + code.slice(i + 1)) === null) erkannt++;
  }
  assert.equal(erkannt, code.length, 'jede einzelne falsche Stelle');
  assert.equal(V.whcCodeLesen(code.slice(0, -1)), null, 'zu kurz');
});

// ── #10 Rundlauf, und der Code gilt nach dem neuen Passwort weiter ──────────────────────────────
test('[WHC·#10] der Code öffnet, was mit dem Passwort verschlüsselt wurde — mit neuem Passwort, und der Code gilt weiter', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  const datei = kopie(await V.depotSerialisieren());
  assert.ok(V.WHC_FELD in datei, 'die Datei trägt die Hülle');

  const W = ladeKern().V;
  const obj = await W.depotMitCodeLaden(kopie(datei), code, PW_NEU);
  assert.equal(obj.sektoren.health.bloodType, 'A+', 'der Inhalt ist derselbe');
  const neu = kopie(await W.depotSerialisieren());
  assert.notEqual(neu.pbkdf2.salt, datei.pbkdf2.salt, 'frisches Passwort-Salz');
  assert.notEqual(neu[W.WHC_FELD].salz, datei[W.WHC_FELD].salz, 'die Hülle ist neu gewickelt');

  const X = ladeKern().V;
  assert.equal((await X.depotLaden(kopie(neu), PW_NEU)).sektoren.health.bloodType, 'A+', 'das neue Passwort öffnet');
  await assert.rejects(() => ladeKern().V.depotLaden(kopie(neu), PW), 'das alte Passwort öffnet die neue Datei nicht');
  const Y = ladeKern().V;
  assert.equal((await Y.depotMitCodeLaden(kopie(neu), code, 'noch-ein-passwort-2026')).sektoren.health.bloodType, 'A+',
    'derselbe Code öffnet auch die neue Datei');
});

test('[Negativprobe] [WHC·#10·Rot-Beweis] falscher Code, gekipptes Byte der Hülle, falsch abgeschrieben, Datei ohne Hülle — nichts öffnet', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  const datei = kopie(await V.depotSerialisieren());
  const grund = async (u, c) => { try { await ladeKern().V.depotMitCodeLaden(kopie(u), c, PW_NEU); return 'geöffnet'; } catch (e) { return e.whc; } };
  assert.equal(await grund(datei, V.whcCodeGruppiert(V.whcCodeErzeugen())), 'passt-nicht');
  const gekippt = kopie(datei);
  const h = Buffer.from(gekippt[V.WHC_FELD].huelle, 'base64'); h[5] ^= 1;
  gekippt[V.WHC_FELD].huelle = h.toString('base64');
  assert.equal(await grund(gekippt, code), 'passt-nicht');
  assert.equal(await grund(datei, code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')), 'abgeschrieben');
  const ohne = kopie(datei); delete ohne[V.WHC_FELD];
  assert.equal(await grund(ohne, code), 'keine-huelle');
  assert.equal(await grund(datei, code), 'geöffnet', 'Gegenprobe: derselbe Aufruf mit dem richtigen Code öffnet');
});

// ── #17 Beim Öffnen liegen die Master-Bits nie als Bytes vor ────────────────────────────────────
test('[WHC·#17] ausgepackt wird ein HKDF-Schlüssel, nicht exportierbar; der Öffnen-Weg hat kein decrypt und kein importKey auf der Hülle', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  const datei = kopie(await V.depotSerialisieren());
  const k = await V._whcAuspacken(datei[V.WHC_FELD], V.whcCodeLesen(code), datei.depotUUID, datei.kryptoVersion);
  assert.equal(k.algorithm.name, 'HKDF');
  assert.equal(k.extractable, false);
  await assert.rejects(() => webcrypto.subtle.exportKey('raw', k), 'exportKey wird verweigert');
  assert.deepEqual(oeffnenWegFunde(KERN), [], 'der Öffnen-Weg im Quelltext');
  const t = funktionsText(KERN, '_whcAuspacken');
  const rot = oeffnenWegFunde(KERN.replace(t, t.replace("'HKDF', false,", "'HKDF', true,")));
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: ein exportierbares unwrapKey würde gefunden');
});

function oeffnenWegFunde(quelle) {
  const funde = [];
  for (const name of ['_whcAuspacken', 'depotMitCodeLaden']) {
    const t = funktionsText(quelle, name);
    if (/\.decrypt\(/.test(t)) funde.push(name + ': decrypt');
    if (/\.importKey\(\s*'raw'/.test(t)) funde.push(name + ': importKey raw');
    if (/'HKDF',\s*true/.test(t)) funde.push(name + ': exportierbar');
  }
  return funde;
}

test('[WHC·#17·Rot-Beweis] ein gepflanzter Weg decrypt(Hülle) → importKey(raw) und ein exportierbares unwrapKey werden gefunden', () => {
  const t = funktionsText(KERN, '_whcAuspacken');
  const gepflanzt = KERN.replace(t, t.replace("'HKDF', false,", "'HKDF', true,")
    .replace('return crypto.subtle.unwrapKey(', "const b = await crypto.subtle.decrypt(x, y, z); await crypto.subtle.importKey('raw', b, 'HKDF', false, []);\n  return crypto.subtle.unwrapKey("));
  const f = oeffnenWegFunde(gepflanzt);
  assert.ok(f.includes('_whcAuspacken: decrypt') && f.includes('_whcAuspacken: importKey raw') && f.includes('_whcAuspacken: exportierbar'), f.join(', '));
});

// ── #18 Nullung im finally, auch wenn das Einwickeln wirft ──────────────────────────────────────
test('[WHC·#18] nach dem Einwickeln stehen in Master- und Code-Bits nur Nullen — auch wenn encrypt wirft', async () => {
  const { V } = ladeKern();
  const lauf = async (ops) => {
    const m = webcrypto.getRandomValues(new Uint8Array(32)).buffer;
    const c = webcrypto.getRandomValues(new Uint8Array(32)).buffer;
    try { await V._whcEinwickeln(m, c, new Uint8Array(12), new Uint8Array(1), ops); } catch (e) { /* der Wurf-Fall */ }
    return new Uint8Array(m).every((b) => b === 0) && new Uint8Array(c).every((b) => b === 0);
  };
  assert.ok(await lauf(webcrypto.subtle), 'Erfolgsweg');
  const wirft = { importKey: (...a) => webcrypto.subtle.importKey(...a), encrypt: async () => { throw new Error('gepflanzt'); } };
  assert.ok(await lauf(wirft), 'Wurf-Weg');
  const t = funktionsText(KERN, '_whcEinwickeln');
  assert.match(t, /finally \{\s*new Uint8Array\(masterBits\)\.fill\(0\);\s*new Uint8Array\(codeBits\)\.fill\(0\);/);
});

test('[WHC·#18·Rot-Beweis] eine Fassung mit der Nullung nur auf dem Erfolgsweg lässt im Wurf-Fall Bytes stehen', async () => {
  const t = funktionsText(KERN, '_whcEinwickeln');
  const ohneFinally = t.replace(/try \{([\s\S]*?)\} finally \{([\s\S]*?)\}\n\}/, (_, a, b) => a.replace('return ', 'const r = ') + b + '  return r;\n}');
  assert.notEqual(ohneFinally, t, 'Vorbedingung: der Eingriff greift');
  const { V } = ladeKern();
  const f = new Function('_whcCodeSchluessel', 'crypto', 'return ' + ohneFinally.replace('async function _whcEinwickeln', 'async function'))(V._whcCodeSchluessel, { subtle: webcrypto.subtle });
  const m = webcrypto.getRandomValues(new Uint8Array(32)).buffer;
  const c = webcrypto.getRandomValues(new Uint8Array(32)).buffer;
  await assert.rejects(() => f(m, c, new Uint8Array(12), new Uint8Array(1), { importKey: (...a) => webcrypto.subtle.importKey(...a), encrypt: async () => { throw new Error('x'); } }));
  assert.ok(!new Uint8Array(m).every((b) => b === 0), 'die Master-Bits stehen noch — die Probe oben hätte angeschlagen');
});

// ── #19 frischer IV je Wickeln, #21 eigenes Salz ────────────────────────────────────────────────
test('[WHC·#19 #21] zweimal mit demselben Code gewickelt: verschiedene IVs (12 Byte), Salze (32 Byte) und Chiffrate; das Salz ist nie das Passwort-Salz', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const stellen = V.whcCodeErzeugen().slice(0, V.WHC_STELLEN);
  await V.whcHuelleWickeln(PW, stellen);
  const a = kopie(await V.depotSerialisieren());
  await V.whcHuelleWickeln(PW, stellen);
  const b = kopie(await V.depotSerialisieren());
  const [fa, fb] = [a[V.WHC_FELD], b[V.WHC_FELD]];
  assert.equal(Buffer.from(fa.iv, 'base64').length, 12);
  assert.equal(Buffer.from(fa.salz, 'base64').length, 32);
  assert.notEqual(fa.iv, fb.iv); assert.notEqual(fa.salz, fb.salz); assert.notEqual(fa.huelle, fb.huelle);
  assert.notEqual(fa.salz, a.pbkdf2.salt);
  assert.deepEqual(Object.keys(fa).sort(), ['form', 'huelle', 'iv', 'salz'], 'keine eigene Iterationszahl im Feld');
  const ivs = new Set(Array.from({ length: 1000 }, () => V._whcFrisch().iv.join(',')));
  assert.equal(ivs.size, 1000, '1 000 IVs ohne Wiederholung');
  assert.match(funktionsText(KERN, 'whcHuelleWickeln'), /_whcFrisch\(\)/, 'der Wickelweg nimmt die frischen Werte');
});

test('[WHC·#19·Rot-Beweis] ein fester IV liefert zwei gleiche IVs, ein wiederverwendetes Passwort-Salz wird erkannt', () => {
  const fest = () => ({ iv: new Uint8Array(12), salz: new Uint8Array(32) });
  assert.equal(new Set([fest().iv.join(','), fest().iv.join(',')]).size, 1, 'die Mengenprobe oben schlüge an');
  const u = { pbkdf2: { salt: 'QUJD' } };
  assert.equal({ salz: u.pbkdf2.salt }.salz, u.pbkdf2.salt, 'der Vergleich oben schlüge an');
});

// ── #20 AAD bindet an Depot und Krypto-Version ──────────────────────────────────────────────────
test('[WHC·#20] die Hülle aus Depot A öffnet im Umschlag von Depot B nichts; eine andere kryptoVersion auch nicht', async () => {
  const A = ladeKern().V; await depotMitInhalt(A);
  const code = await mitHuelle(A);
  const da = kopie(await A.depotSerialisieren());
  const B = ladeKern().V; await depotMitInhalt(B);
  const db = kopie(await B.depotSerialisieren());
  db[B.WHC_FELD] = kopie(da[A.WHC_FELD]);
  await assert.rejects(() => ladeKern().V.depotMitCodeLaden(db, code, PW_NEU), (e) => e.whc === 'passt-nicht');
  const stellen = A.whcCodeLesen(code);
  await assert.rejects(() => A._whcAuspacken(da[A.WHC_FELD], stellen, da.depotUUID, 3), 'andere kryptoVersion');
  await assert.rejects(() => A._whcAuspacken(da[A.WHC_FELD], stellen, db.depotUUID, da.kryptoVersion), 'fremde Depot-UUID');
  await A._whcAuspacken(da[A.WHC_FELD], stellen, da.depotUUID, da.kryptoVersion);   // Gegenprobe: das eigene Depot öffnet
});

// ── #5 Ablehnen erzeugt kein Feld; #11 Entfernen, nachträglich einrichten ───────────────────────
test('[WHC·#5] ohne Einrichten trägt die geschriebene Datei kein Feld — dieselben Schlüssel wie ohne die Hülle', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const u = kopie(await V.depotSerialisieren());
  assert.equal(Object.prototype.hasOwnProperty.call(u, V.WHC_FELD), false);
  const fremde = (x) => Object.keys(x).filter((k) => !V.UMSCHLAG_FELDER_BEKANNT.includes(k) && k !== 'gespeichert_am');
  assert.deepEqual(fremde(u), [], 'kein fremdes Feld');
  const rot = fremde({ ...u, fremd: 1 });
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: ein zusätzliches Feld würde gefunden');
  assert.equal(V.whcHuelleVorhanden(), false);
});

test('[WHC·#5·Rot-Beweis] ein Feld mit leerem Wert wäre ein Feld', () => {
  const u = { wiederherstellung: null };
  assert.equal(Object.prototype.hasOwnProperty.call(u, 'wiederherstellung'), true, 'die Probe oben prüft das Dasein, nicht den Wert');
});

test('[WHC·#11] Entfernen schreibt eine Datei ohne Feld; die vorherige Datei öffnet mit dem Code weiter; das Passwort öffnet beide', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const code = await mitHuelle(V);                                    // nachträglich eingerichtet — das Depot entstand ohne
  const datei1 = kopie(await V.depotSerialisieren());
  V.whcHuelleEntfernen();
  const datei2 = kopie(await V.depotSerialisieren());
  assert.equal(V.WHC_FELD in datei2, false, 'Datei 2 trägt kein Feld');
  await assert.rejects(() => ladeKern().V.depotMitCodeLaden(kopie(datei2), code, PW_NEU), (e) => e.whc === 'keine-huelle');
  await ladeKern().V.depotMitCodeLaden(kopie(datei1), code, PW_NEU);   // Rot-Beweis: der Code war gültig, die Abwahl ist die Ursache
  await ladeKern().V.depotLaden(kopie(datei2), PW);
});

test('[WHC·Speichern] eine Datei mit Hülle behält sie nach Öffnen mit dem Passwort und Speichern — und das Entfernen holt sie nicht als Fremdfeld zurück', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  const datei = kopie(await V.depotSerialisieren());
  const W = ladeKern().V;
  await W.depotLaden(kopie(datei), PW);
  assert.equal(W.whcHuelleVorhanden(), true, 'der Zustand ist sichtbar');
  const wieder = kopie(await W.depotSerialisieren());
  assert.deepEqual(wieder[W.WHC_FELD], datei[V.WHC_FELD]);
  W.whcHuelleEntfernen();
  assert.equal(W.WHC_FELD in kopie(await W.depotSerialisieren()), false);
  await ladeKern().V.depotMitCodeLaden(kopie(wieder), code, PW_NEU);
});

// ── Frage B: Passwortwechsel ────────────────────────────────────────────────────────────────────
test('[WHC·B] Passwortwechsel mit Code: die neue Datei öffnet mit demselben Code; ohne Code fällt die Hülle weg', async () => {
  const geschrieben = [];
  function FakeBlob(t) { this._text = String((t && t[0]) || ''); }
  const handle = { name: 't.vivodepot', createWritable: async () => ({ write: async (b) => { geschrieben.push(b._text); }, close: async () => {} }) };
  const { V } = ladeKern({ Blob: FakeBlob, showSaveFilePicker: async () => handle });
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  assert.equal(await V.whcCodePasst(V.whcCodeLesen(code)), true);
  assert.equal(await V.whcCodePasst(V.whcCodeErzeugen().slice(0, V.WHC_STELLEN)), false);
  assert.equal(await V.passwortWechselDurchfuehren(PW, PW_NEU, { whcStellen: V.whcCodeLesen(code) }), 'gewechselt');
  const aus = (t) => JSON.parse(t.startsWith('VIVODEPOT') ? t.slice('VIVODEPOT'.length + 1) : t);
  const u1 = aus(geschrieben[geschrieben.length - 1]);
  assert.equal((await ladeKern().V.depotMitCodeLaden(kopie(u1), code, 'drittes-passwort-2026')).sektoren.health.bloodType, 'A+');
  assert.equal(await V.passwortWechselDurchfuehren(PW_NEU, PW, {}), 'gewechselt');
  const u2 = aus(geschrieben[geschrieben.length - 1]);
  assert.equal(V.WHC_FELD in u2, false, 'ohne Code: keine Hülle in der neuen Datei — nie eine Hülle um das alte Passwort');
  assert.equal(V.whcHuelleVorhanden(), false);
});

// ── #14 Frage C: die Kopie trägt keine Hülle ───────────────────────────────────────────────────
test('[WHC·#14] der Blackbox-Export einer Datei mit Hülle trägt die Hülle nicht (entschieden: reist nicht mit)', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  await mitHuelle(V);
  const u = kopie(await V.depotSerialisieren());
  assert.ok(V.WHC_FELD in u, 'Vorbedingung');
  const k = V.blackboxDateiAusUmschlag(u);
  assert.equal(V.WHC_FELD in (k.umschlag || k), false);
});

// ── #3 Prüfstein gegen eine wirklich ältere Fassung ─────────────────────────────────────────────
/* GERÜST-TEST: nur diese Probe lädt einen Kern roh — den von VOR dem Bau, so wie er ausgeliefert wurde, als nacktes Gerüst
   (`ladeKern({ blank: true })`). Gemessen wird allein der Leseweg `depotLaden`; der braucht kein Produkt. */
test('[WHC·#3] der Kern von vor dem Bau öffnet eine Datei mit Hülle mit dem Passwort; eine Datei mit kaputtem Pflichtfeld nicht', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  await mitHuelle(V);
  const datei = kopie(await V.depotSerialisieren());
  const ziel = path.join(os.tmpdir(), 'vivodepot-vor-whc-' + process.pid + '.html');
  fs.writeFileSync(ziel, execFileSync('git', ['show', KANON_VOR_DEM_BAU + ':vivodepot.html'],
    { cwd: path.join(__dirname, '..'), env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 }));
  const zuvor = process.env.KERN_HTML_PATH;
  try {
    process.env.KERN_HTML_PATH = ziel;
    delete require.cache[require.resolve('./load-kern.js')];
    const alt = require('./load-kern.js').ladeKern({ blank: true }).V;
    assert.equal(typeof alt.depotMitCodeLaden, 'undefined', 'Vorbedingung: der alte Kern kennt die Hülle nicht');
    assert.equal((await alt.depotLaden(kopie(datei), PW)).sektoren.health.bloodType, 'A+');
    const kaputt = kopie(datei); delete kaputt.depotSalt;
    delete require.cache[require.resolve('./load-kern.js')];
    await assert.rejects(() => require('./load-kern.js').ladeKern({ blank: true }).V.depotLaden(kaputt, PW), 'Rot-Beweis: ein kaputtes Pflichtfeld öffnet nicht');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(ziel);
  }
});

// ── #22 Blätter getrennt, #23 der Code in keiner Ausgabe ────────────────────────────────────────
function blattFunde(V, codeblatt, notfallblatt) {
  const f = [];
  if (codeblatt.includes(V.STRINGS.nfbFeldPasswort)) f.push('Code-Blatt: Passwortfeld');
  if (notfallblatt.includes(V.STRINGS.whcBlattFeldCode)) f.push('Notfall-Blatt: Codefeld');
  return f;
}

test('[WHC·#22] das Code-Blatt hat kein Passwortfeld, das Notfall-Blatt kein Codefeld; das Code-Blatt trägt das Codefeld leer', () => {
  const { V } = ladeKern();
  const cb = V.codeblattHTML(); const nb = V.notfallblattHTML();
  assert.deepEqual(blattFunde(V, cb, nb), []);
  const rot = blattFunde(V, cb + V._nfbLinie(V.STRINGS.nfbFeldPasswort, ''), nb);
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: eine Passwortzeile im Code-Blatt würde gefunden');
  assert.ok(cb.includes(V.STRINGS.whcBlattFeldCode) && cb.includes('<p class="nfb-linie">&nbsp;</p>'), 'leere Linie unter dem Codefeld');
  assert.ok(cb.includes(V.STRINGS.whcNichtZumPasswort));
});

test('[WHC·#22·Rot-Beweis] eine gepflanzte Passwortzeile im Code-Blatt und eine Codezeile im Notfall-Blatt werden gefunden', () => {
  const { V } = ladeKern();
  const f = blattFunde(V, V.codeblattHTML() + V._nfbLinie(V.STRINGS.nfbFeldPasswort, ''), V.notfallblattHTML() + V._nfbLinie(V.STRINGS.whcBlattFeldCode, ''));
  assert.equal(f.length, 2, f.join(', '));
});

function codeFunde(code, ausgaben) {
  const roh = code.replace(/-/g, '');
  const f = [];
  for (const [name, text] of Object.entries(ausgaben)) {
    const t = String(text).toUpperCase();
    if (t.includes(roh) || t.includes(code) || t.includes(roh.slice(0, -1))) f.push(name);
  }
  return f;
}

test('[WHC·#23 #8] nach dem Einrichten steht der Code in keiner Ausgabe: Blätter, Datei, Voll-Export, Depot-Inhalt, Speicher', async () => {
  const speicher = {};
  const ls = { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => { speicher[k] = String(v); }, removeItem: (k) => { delete speicher[k]; } };
  const { V } = ladeKern({ localStorage: ls });
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  const ausgaben = {
    codeblatt: V.codeblattHTML(),
    notfallblatt: V.notfallblattHTML(),
    datei: JSON.stringify(await V.depotSerialisieren()),
    vollExport: JSON.stringify(V.vollExportJSON({ sensibel: true })),
    depotInhalt: JSON.stringify(V.getData()),
    localStorage: JSON.stringify(speicher),
  };
  assert.deepEqual(codeFunde(code, ausgaben), []);
  const rot = codeFunde(code, { gepflanzt: ausgaben.codeblatt + code });
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: ein Code im Blatt würde gefunden');
});

test('[WHC·#23·Rot-Beweis] ein Blatt mit hineingeschmuggeltem Code fällt durch — gruppiert und ohne Trenner', () => {
  const { V } = ladeKern();
  const code = V.whcCodeGruppiert(V.whcCodeErzeugen());
  assert.deepEqual(codeFunde(code, { a: V.codeblattHTML() + code, b: V.codeblattHTML() + code.replace(/-/g, '').toLowerCase() }), ['a', 'b']);
});

// ── #4 keine eigene Iterationszahl: ein Feld anderer Form ist keine Hülle dieser Fassung ────────────
test('[WHC·#4] eine Hülle mit eigenem Iterationsfeld wird nicht geöffnet — der Code-Weg liest PBKDF2_ITERATIONS, nie die Datei', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const code = await mitHuelle(V);
  const datei = kopie(await V.depotSerialisieren());
  const mitIter = kopie(datei); mitIter[V.WHC_FELD].iterationen = 1000;
  await assert.rejects(() => ladeKern().V.depotMitCodeLaden(mitIter, code, PW_NEU), (e) => e.whc === 'keine-huelle');
  await ladeKern().V.depotMitCodeLaden(kopie(datei), code, PW_NEU);   // Rot-Beweis: ohne das Feld öffnet dieselbe Hülle
  assert.doesNotMatch(funktionsText(KERN, '_whcCodeBits'), /iterationen|iterations/, 'die Ableitung nimmt keine Zahl aus dem Feld');
});

// ── #12 Zustand sichtbar, mit dem Satz ──────────────────────────────────────────────────────────
test('[WHC·#12] die Einstellungen sagen in einem Satz, ob ein Code besteht; Entfernen nennt die älteren Kopien', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  assert.ok(V.whcAbschnittHTML().includes(V.STRINGS.whcStatusFehlt), 'ohne Code');
  await mitHuelle(V);
  const h = V.whcAbschnittHTML();
  assert.ok(h.includes(V.STRINGS.whcStatusEingerichtet) && h.includes('einst-whc-entfernen'), 'mit Code');
  assert.match(V.STRINGS.whcEntfernenText, /Ältere Kopien/);
  assert.notEqual(V.STRINGS.whcStatusEingerichtet, V.STRINGS.whcStatusFehlt, 'Rot-Beweis: die beiden Zustände sind unterscheidbar');
});

// ── #15 Außentexte: kein „kein Weg zurück" ohne den Zusatz ──────────────────────────────────────
const KEIN_WEG = /nicht mehr (zu )?öffnen|kein(en)? Weg zurück|Kein Rückweg|no way back|can no longer be opened|cannot be opened again/i;
const MIT_ZUSATZ = /Wiederherstellungs-Code|recovery code/i;

function aussentextFunde(texte) {
  return Object.entries(texte).filter(([, v]) => KEIN_WEG.test(String(v)) && !MIT_ZUSATZ.test(String(v))).map(([k]) => k);
}

test('[WHC·#15] kein Text der beiden Sprachmodule sagt „kein Weg zurück", ohne den Wiederherstellungs-Code zu nennen', () => {
  const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  assert.deepEqual(aussentextFunde(de), []);
  const rot = aussentextFunde({ probe: 'Ihr Depot ist sonst nicht mehr zu öffnen.' });
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: der alte Satz würde gefunden');
  assert.deepEqual(aussentextFunde(en), []);
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8').split(/\n\s*\n/);
  assert.deepEqual(aussentextFunde(Object.fromEntries(readme.map((a, i) => ['README#' + i, a]))), []);
});

test('[WHC·#15·Rot-Beweis] der alte Satz des Notfall-Blatt-Angebots wird gefunden, der neue nicht', () => {
  const alt = 'Wenn Sie Ihr Passwort vergessen, ist Ihr Depot sonst nicht mehr zu öffnen — auch nicht von uns.';
  assert.deepEqual(aussentextFunde({ alt, neu: alt.replace('nicht mehr zu öffnen', 'nur noch mit einem Wiederherstellungs-Code zu öffnen') }), ['alt']);
});
