'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   KI-Andockpunkt (U2-ADR-516, 29.10.2026) — das sechzehnte Einlass-Register `lokalesModell`.
   Entschieden 04.09.2026 („KI-Andockpunkt rein“), Form 29.10.2026 (eigene Modulart). Das Register trägt
   einen signierten Verweis auf eine lokale Modelldatei, sonst nichts: keine Modell-Bytes, keine Adresse,
   keinen Code, und beim Einlass wird nie eine Datei gelesen.
   Die Feldliste ist hier gepinnt (Ratsche): ein neues Feld verlangt eine bewusste Änderung dieser Datei.
   Auflagen VD Krypto (29.10.2026): nur signiert; `pruefstufe` und `anbieterId` kommen allein aus der Signaturprüfung,
   nie vom Autor; `modellHash` steht in den signierten Bytes, Form `sha256:` + 64 Hex (U2-ADR-486 Punkt 7). Die Proben
   dazu laufen über den echten Weg `modulEinlassenGeprueft`, mit Wegwerf-Schlüsseln, die erst hier erzeugt werden.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const HASH = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const VERWEIS = { modulTyp: 'lokalesModell', moduleVersion: 1, id: 'zz-probe', label: 'Probe-Modell', sprache: 'de', modellHash: HASH, herkunft: 'probe' };
// Was der Autor liefern darf; alles Weitere setzt der Einlass (`_EINLASS_META_FELDER` plus `appVersion`).
const AUTOR = ['modulTyp', 'moduleVersion', 'id', 'label', 'sprache', 'modellHash', 'herkunft'];
const VOM_EINLASS = ['appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft', 'pruefstufe', 'beleg', 'abWerk'];
const GEPINNT = AUTOR.concat(VOM_EINLASS);
// Namen, die als Adresse, Pfad oder Modelldaten taugen würden — keiner darf je auf die Liste.
const VERBOTEN = /url|uri|href|pfad|path|datei|file|bytes|daten|data|quelle|source|download|endpoint|host/i;

function funktionsKoerper(name) {
  const start = KERN.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'Vorbedingung: ' + name + ' gefunden');
  const ende = KERN.indexOf('\nfunction ', start + 1);
  return KERN.slice(start, ende);
}

test('[KI-Andock] das Register steht als lokalesModell/lokaleModelle in EINLASS_REGISTER, nur signiert', () => {
  const { V } = ladeKern();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'lokalesModell');
  assert.ok(reg, 'Register lokalesModell fehlt');
  assert.equal(reg.slot, 'lokaleModelle');
  assert.equal(reg.nurGeprueft, true);
  assert.equal(reg.kennung(VERWEIS), 'zz-probe');
});

test('[KI-Andock] ein signierter Verweis wird eingelassen, landet im Slot und steht mit Name und Wirkung in der Modulliste', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify(VERWEIS), d, 'geprüfte-probe');
  assert.equal(r.angenommen, true, 'Grund: ' + r.grund);
  assert.equal(d.lokaleModelle.length, 1);
  assert.equal(d.lokaleModelle[0].modellHash, HASH);
  const zeile = V.eingelasseneModule(d).find((m) => m.typ === 'lokalesModell');
  assert.ok(zeile && !zeile.ausgefallen, 'der Verweis steht in der Modulliste');
  assert.match(zeile.name, /Probe-Modell/);
  assert.ok(String(V._modulWirkung('lokalesModell') || '').trim(), 'die Wirkung ist benannt');
});

test('[KI-Andock·Rot-Beweis] ein unsignierter Verweis wird abgewiesen, nichts landet im Depot', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify(VERWEIS), d);
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'nur-signiert-erlaubt');
  assert.equal((d.lokaleModelle || []).length, 0);
});

/* Jeder Wächter für eine Klausel von U2-ADR-516 ruft eine Funktion, die die Verstöße als Liste liefert, und verlangt die leere Liste. */
function feldlisteVerstoesse(liste) {
  const v = [];
  if (JSON.stringify(liste) !== JSON.stringify(GEPINNT)) v.push('Feldliste weicht von der gepinnten ab: ' + JSON.stringify(liste));
  for (const k of liste) if (VERBOTEN.test(k)) v.push('Feld taugt als Adresse, Pfad oder Modelldaten: ' + k);
  return v;
}
const VERBOTENE_ZUGRIFFE = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|FileReader|showOpenFilePicker|getFile|import\s*\(|await|async)\b/;
function zugriffVerstoesse(koerper) {
  const v = [];
  for (const [name, text] of Object.entries(koerper)) {
    const m = text.match(VERBOTENE_ZUGRIFFE);
    if (m) v.push(name + ': ' + m[0]);
  }
  return v;
}
const KOPPLUNG = { PROBEN: [
  { fuer: '[KI-Andock·Einlass] ein signierter Verweis kommt über den gemeinsamen Einlassweg in lokaleModelle, ein unsignierter nicht', diskriminante: einlassVerstoesse },
  { fuer: '[KI-Andock·Ratsche] die Feldliste ist genau die gepinnte, und kein Feld taugt als Adresse, Pfad oder Modelldaten', diskriminante: feldlisteVerstoesse },
  { fuer: '[KI-Andock] Prüfung und Einbettung lesen keine Datei und rufen kein Netz', diskriminante: zugriffVerstoesse },
] };
void KOPPLUNG;

test('[KI-Andock·Ratsche] die Feldliste ist genau die gepinnte, und kein Feld taugt als Adresse, Pfad oder Modelldaten', () => {
  const { V } = ladeKern();
  assert.deepEqual(feldlisteVerstoesse([...V._LOKALES_MODELL_SCHLUESSEL]), []);
});

test('[KI-Andock·Ratsche] was nicht vom Autor kommt, ist ein Einlass-Feld; modellHash ist nie eines', () => {
  const { V } = ladeKern();
  const meta = new Set([...V._EINLASS_META_FELDER, 'appVersion']);
  assert.deepEqual(VOM_EINLASS.filter((k) => !meta.has(k)), []);
  assert.deepEqual(AUTOR.filter((k) => meta.has(k)), []);
  assert.ok(!V._EINLASS_META_FELDER.includes('modellHash'), 'modellHash muss in den signierten Bytes bleiben');
});

test('[KI-Andock·Ratsche·Rot-Beweis] ein Adressfeld auf der Liste fällt am Namensmuster auf', () => {
  const v = feldlisteVerstoesse(GEPINNT.concat(['downloadUrl']));
  assert.ok(v.includes('Feld taugt als Adresse, Pfad oder Modelldaten: downloadUrl'), JSON.stringify(v));
});

test('[KI-Andock] ein unbekanntes Feld weist den Verweis ab, statt nur benannt zu werden', () => {
  const { V } = ladeKern();
  for (const k of ['downloadUrl', 'url', 'pfad', 'bytes']) {
    const g = V.lokalesModellModulPruefen({ ...VERWEIS, [k]: 'x' });
    assert.equal(g.gueltig, false, k);
    assert.equal(g.grund, 'unbekannter-schluessel', k);
    assert.deepEqual(g.verworfene, [{ schluessel: k, grund: 'unbekannt' }]);
  }
  assert.deepEqual(V.lokalesModellModulPruefen(VERWEIS), { gueltig: true, grund: null, verworfene: [] });
});

test('[KI-Andock] die Prüfsumme hat genau die Form sha256: und 64 Hex-Zeichen in Kleinbuchstaben', () => {
  const { V } = ladeKern();
  const hex = HASH.slice('sha256:'.length);
  assert.equal(V.lokalesModellModulPruefen(VERWEIS).gueltig, true, 'Positivkontrolle');
  for (const h of ['', 'abc', hex, 'SHA256:' + hex, 'sha256:' + hex.toUpperCase(), HASH + '0', HASH.slice(0, -1),
    'sha384:' + hex, 'sha256-ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=', 'sha256:' + hex.slice(1) + 'g']) {
    assert.equal(V.lokalesModellModulPruefen({ ...VERWEIS, modellHash: h }).grund, 'modellHash', JSON.stringify(h));
  }
});

test('[KI-Andock] Prüfung und Einbettung lesen keine Datei und rufen kein Netz', () => {
  assert.deepEqual(zugriffVerstoesse({
    lokalesModellModulPruefen: funktionsKoerper('lokalesModellModulPruefen'),
    lokalesModellModulEinbetten: funktionsKoerper('lokalesModellModulEinbetten'),
  }), []);
});

test('[KI-Andock·Rot-Beweis] ein Dateizugriff im Prüfer fiele an der Quelltextprobe auf', () => {
  const verfaelscht = funktionsKoerper('lokalesModellModulPruefen').replace('const verworfene = [];', 'const verworfene = []; new FileReader();');
  assert.deepEqual(zugriffVerstoesse({ lokalesModellModulPruefen: verfaelscht }), ['lokalesModellModulPruefen: FileReader']);
});

/* ── Der echte signierte Weg (Auflagen VD Krypto, 29.10.2026) ─────────────────────────────── */
const JETZT = '2026-10-29T12:00:00Z';
async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function signieren(V, nutzlast, privJwk) {
  return V._signJWS(nutzlast, await V._jwsImportSignKey(privJwk), {});
}
async function kette(V) {
  const anker = await wegwerfKeypair();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/probe-anbieter', anbieterTyp: 'institution/test', anbieterName: 'Probe-Anbieter', publicKeyJwk: anbieter.pubJwk },
  }, anker.privJwk);
  const opts = { ankerJwk: Object.assign({}, anker.pubJwk, { key_ops: undefined }), jetzt: JETZT };
  return { anbieter, providerCredentialJws, opts };
}
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

async function einlassVerstoesse(V) {
  const v = [];
  const k = await kette(V);
  const modulSignaturJws = await signieren(V, VERWEIS, k.anbieter.privJwk);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws: k.providerCredentialJws, modulSignaturJws }), d, k.opts);
  if (r.angenommen !== true) v.push('signierter Verweis abgewiesen: ' + r.grund);
  if (!Array.isArray(d.lokaleModelle) || d.lokaleModelle.length !== 1) v.push('signierter Verweis nicht im Slot lokaleModelle');
  const d2 = V.leeresDepot();
  const u = V.modulEinlassen(JSON.stringify(VERWEIS), d2);
  if (u.angenommen !== false || u.grund !== 'nur-signiert-erlaubt') v.push('unsignierter Verweis nicht mit nur-signiert-erlaubt abgewiesen: ' + u.grund);
  if ((d2.lokaleModelle || []).length) v.push('unsignierter Verweis liegt im Slot');
  return v;
}

test('[KI-Andock·Einlass] ein signierter Verweis kommt über den gemeinsamen Einlassweg in lokaleModelle, ein unsignierter nicht', async () => {
  const { V } = ladeKern();
  assert.deepEqual(await einlassVerstoesse(V), []);
});

test('[KI-Andock·Signatur] ein signierter Verweis kommt über modulEinlassenGeprueft an; pruefstufe und anbieterId stammen aus der Prüfung', async () => {
  const { V } = ladeKern();
  const k = await kette(V);
  const modulSignaturJws = await signieren(V, Object.assign({}, VERWEIS, { pruefstufe: 'intern', anbieterId: 'behauptet-sich-selbst' }), k.anbieter.privJwk);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws: k.providerCredentialJws, modulSignaturJws }), d, k.opts);
  assert.equal(r.angenommen, true, 'Grund: ' + r.grund);
  const m = d.lokaleModelle[0];
  assert.equal(m.modellHash, HASH);
  assert.equal(m.anbieterId, 'institution/probe-anbieter', 'die Kennung kommt aus dem Zertifikat, nicht vom Autor');
  assert.notEqual(m.pruefstufe, 'intern', 'die Prüfstufe kommt aus der Kette, nicht vom Autor');
  assert.equal(m.pruefstufe, 'extern-ungeprueft');
});

test('[KI-Andock·Signatur·Rot-Beweis] am Kurzweg ohne Prüfstufe überlebte die Prüfstufe des Autors — die Probe darüber sähe das', () => {
  // Seit dem Ordnungsposten vom 30.10.2026 verwirft auch der Kurzweg eine selbst mitgebrachte Prüfstufe; der Rot-Beweis
  // läuft darum an einer Kopie des Kerns ohne diese eine Zeile.
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(JSON.stringify(Object.assign({}, VERWEIS, { pruefstufe: 'intern' })), d, 'probe');
  assert.notEqual(d.lokaleModelle[0].pruefstufe, 'intern', 'der Kurzweg trägt die Selbstauskunft nicht weiter');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const ohne = kern.replace('    delete markiert.pruefstufe;\n', '');
  assert.notEqual(ohne, kern, 'Vorbedingung: die Zeile steht so im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ki-andock-rot-'));
  try {
    const pfad = path.join(dir, 'kern.html');
    fs.writeFileSync(pfad, ohne);
    const { V: W } = ladeKern({ htmlPfad: pfad, backen: true });
    const d2 = W.leeresDepot();
    W.modulEinlassen(JSON.stringify(Object.assign({}, VERWEIS, { pruefstufe: 'intern' })), d2, 'probe');
    assert.equal(d2.lokaleModelle[0].pruefstufe, 'intern', 'ohne die Zeile bliebe die Selbstauskunft stehen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[KI-Andock·Signatur] ein signierter Verweis mit nachträglich verändertem modellHash fällt an der Signatur', async () => {
  const { V } = ladeKern();
  const k = await kette(V);
  const echt = await signieren(V, VERWEIS, k.anbieter.privJwk);
  const [kopf, , sig] = echt.split('.');
  const verfaelscht = [kopf, b64url(Object.assign({}, VERWEIS, { modellHash: 'sha256:' + 'f'.repeat(64) })), sig].join('.');
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws: k.providerCredentialJws, modulSignaturJws: verfaelscht }), d, k.opts);
  assert.equal(r.angenommen, false);
  assert.equal((d.lokaleModelle || []).length, 0);
  // Rot-Beweis: dieselbe Kette mit der unveränderten Signatur nimmt an — es fiel also die Signatur, nicht die Kette.
  const d2 = V.leeresDepot();
  const r2 = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws: k.providerCredentialJws, modulSignaturJws: echt }), d2, k.opts);
  assert.equal(r2.angenommen, true, 'Grund: ' + r2.grund);
});

test('[KI-Andock·Signatur] ohne signiertes Bündel kommt kein Verweis an', async () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify(VERWEIS), d, { jetzt: JETZT });
  assert.equal(r.angenommen, false);
  assert.equal((d.lokaleModelle || []).length, 0);
});

/* ── Sichtbar, nicht ausführbar (U2-ADR-516 Punkt 4) ──────────────────────────────────────── */
// Die Liste in den Einstellungen: der Ausschnitt zwischen ihrer Kennung und ihrem Ende trägt keinen Knopf und keinen Auslöser.
function anzeigeVerstoesse(kern) {
  const start = kern.indexOf('id="einst-lokale-modelle"');
  if (start < 0) return ['die Liste einst-lokale-modelle fehlt in den Einstellungen'];
  const ende = kern.indexOf("'</ul>'", start);
  const stueck = kern.slice(start, ende);
  const v = [];
  for (const [name, re] of [['Knopf', /<button/], ['Auslöser', /data-[a-z-]+=|onclick/i], ['Dateiwahl', /type="file"|showOpenFilePicker|FileReader/], ['Netz', /fetch\(|XMLHttpRequest|WebSocket|import\(/]]) {
    if (re.test(stueck)) v.push('die Liste lokaler Modelle trägt ' + name);
  }
  return v;
}

test('[KI-Andock·Anzeige] die Liste lokaler Modelle steht in den Einstellungen, schreibgeschützt und ohne Knopf', () => {
  assert.deepEqual(anzeigeVerstoesse(KERN), []);
  assert.deepEqual(zugriffVerstoesse({ lokaleModelleUebersicht: funktionsKoerper('lokaleModelleUebersicht') }), []);
});

test('[KI-Andock·Anzeige·Rot-Beweis] ein Knopf in der Liste fiele auf', () => {
  const verfaelscht = KERN.replace('id="einst-lokale-modelle">\'', 'id="einst-lokale-modelle">\' + \'<button type="button">');
  assert.notEqual(verfaelscht, KERN, 'Vorbedingung: Anker gefunden');
  assert.deepEqual(anzeigeVerstoesse(verfaelscht), ['die Liste lokaler Modelle trägt Knopf']);
});

test('[KI-Andock·Anzeige] ein eingelassener Verweis erscheint mit Namen und Herkunftsangabe, die Prüfstufe nie aus der Datei', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  assert.equal(V.modulEinlassen(JSON.stringify(VERWEIS), d, 'geprüfte-probe').angenommen, true);
  d.lokaleModelle[0].pruefstufe = 'intern';   // Selbstauskunft — darf an der Anzeige nichts heben
  const liste = V.lokaleModelleUebersicht(d);
  assert.equal(liste.length, 1);
  assert.match(liste[0].name, /Probe-Modell/);
  assert.equal(liste[0].angabe, 'probe');
  assert.equal(liste[0].stufe, null, 'ohne nachgeprüften Beleg keine Prüfstufe, gleich was die Datei sagt');
  assert.ok(String(V.STRINGS.lokalesModellHerkunftZusatz || '').includes('{herkunft}'), 'Text der Herkunftsangabe');
});

test('[KI-Andock·Anzeige] ein ungültiger Verweis im Slot erscheint nicht als Modell', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.lokaleModelle = [Object.assign({}, VERWEIS, { downloadUrl: 'x' })];
  assert.deepEqual(V.lokaleModelleUebersicht(d), []);
  // Die Spur steht in der allgemeinen Modulliste: dort bleibt der Verweis als ausgefallen, mit Grund (Ausnahme in der
  // Grundlinie der stummen Zurückweisungen, Ort lokaleModelleUebersicht).
  const zeile = V.eingelasseneModule(d).find((m) => m.typ === 'lokalesModell');
  assert.ok(zeile && zeile.ausgefallen === true && !!zeile.grund, 'der ungültige Verweis steht in der Modulliste als ausgefallen');
});

// Bedingung der Positivliste (30.10.2026): `herkunft` nur als Text, die Prüfstufe allein aus modulBelegGeprueft.
function angabeVerstoesse(koerper, kern) {
  const v = [];
  if (!/const beleg = modulBelegGeprueft\(m\);/.test(koerper)) v.push('Beleg nicht aus modulBelegGeprueft');
  if (!/stufe: beleg \? beleg\.stufe : null/.test(koerper)) v.push('Prüfstufe nicht allein aus dem Beleg');
  if (/\.(pruefstufe|ungeprueft|anbieterIdGeprueft|abWerk)\b/.test(koerper)) v.push('liest ein Vertrauensfeld der Datei');
  if (!/escapeHTML\(String\(STRINGS\.lokalesModellHerkunftZusatz\)\.replace\('\{herkunft\}', lm\.angabe\)\)/.test(kern)) v.push('Herkunftsangabe nicht als escapeter Text');
  return v;
}

test('[KI-Andock·Anzeige] die Herkunftsangabe ist nur Text, die Prüfstufe stammt allein aus modulBelegGeprueft', () => {
  assert.deepEqual(angabeVerstoesse(funktionsKoerper('lokaleModelleUebersicht'), KERN), []);
});

test('[KI-Andock·Anzeige·Rot-Beweis] eine Prüfstufe aus dem Feld der Datei fiele auf', () => {
  const verfaelscht = funktionsKoerper('lokaleModelleUebersicht').replace('stufe: beleg ? beleg.stufe : null', 'stufe: m.pruefstufe || null');
  assert.deepEqual(angabeVerstoesse(verfaelscht, KERN), ['Prüfstufe nicht allein aus dem Beleg', 'liest ein Vertrauensfeld der Datei']);
});
