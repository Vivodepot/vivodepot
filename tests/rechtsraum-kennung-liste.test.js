'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-477 — der Geltungsbereich eines Moduls als Liste, und „UK" als Alias für „GB"
   ────────────────────────────────────────────────────────────────────────
   Das Recht der Lasting Power of Attorney gilt für England und Wales (Mental Capacity Act 2005
   s. 68(4)). Einen gemeinsamen Code gibt es nicht; das Modul nennt beide, ["GB-ENG","GB-WLS"].
   Der Kern bildet daraus EINEN Registry-Schlüssel (`rechtsraumKennung`): je Eintrag normalisiert,
   sortiert, mit Komma verbunden. Ein String bleibt, was er war — außer „UK", das als „GB" gelesen
   wird (ISO 3166-1/RFC 5646). Gelesen, nie geschrieben: ein Depot, ein Auszug oder ein signiertes
   Modul mit „UK" bleibt Byte für Byte, wie es ist.

   Die Rot-Beweise laufen gegen eine verdorbene Kopie des Kerns (ladeKern mit htmlPfad), nicht gegen
   eine nachgebaute Funktion: genau die Zeile, die die Zusicherung trägt, wird verändert, und die
   Probe muss es merken.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rechtsraum-kennung-liste-'));
after(() => { fs.rmSync(TEMP, { recursive: true, force: true }); });

const GB_LISTE = Object.freeze(['GB-ENG', 'GB-WLS']);
const TYPEN = Object.freeze({ 'enduring-power-of-attorney': { katalogVersion: 1, fristenVorrang: { auswahlform: 'alle' } } });
function modul(rechtsraum, extra) {
  return Object.assign({ modulTyp: 'rechtsraum', rechtsraum, moduleVersion: 1, typen: TYPEN }, extra || {});
}

/* Ein verdorbener Kern: genau eine Zeile ausgetauscht. Wirft, wenn die Zeile nicht (mehr) da ist —
   sonst prüfte der Rot-Beweis einen unveränderten Kern und bewiese nichts. */
function verdorbenerKern(name, alt, neu) {
  const html = fs.readFileSync(KERN_PFAD, 'utf8');
  assert.equal(html.split(alt).length - 1, 1, 'Rot-Beweis „' + name + '": die Zeile steht nicht genau einmal im Kern');
  const ziel = path.join(TEMP, name + '.html');
  fs.writeFileSync(ziel, html.replace(alt, neu));
  return ladeKern({ htmlPfad: ziel, backen: true }).V;
}

/* ── Die Proben als Funktionen: der Normalfall verlangt true, der Rot-Beweis false ── */
function probeListeAngenommenUndSchluessel(V) {
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify(modul(GB_LISTE.slice())), d);
  if (!r.angenommen || r.kennung !== 'GB-ENG,GB-WLS') return false;
  V._rechtsraumModuleAusDepotAnmelden(d);
  return !!V.getRechtsraumModulRegistry()['GB-ENG,GB-WLS'];
}
function probeReihenfolgeUndSchreibungGleich(V) {
  return V.rechtsraumKennung(['GB-WLS', 'gb-eng']) === 'GB-ENG,GB-WLS'
    && V.rechtsraumKennung([' gb-wls ', 'GB-ENG']) === 'GB-ENG,GB-WLS';
}
function probeDeInListeAbgewiesen(V) {
  const d = V.leeresDepot();
  return V.modulEinlassen(JSON.stringify(modul(['DE'])), d).angenommen === false
    && V.modulEinlassen(JSON.stringify(modul(['GB-ENG', 'DE'])), d).angenommen === false
    && V.modulEinlassen(JSON.stringify(modul(['gb-eng', ' de '])), d).angenommen === false;
}
function probeUkAlsGb(V) {
  return V.rechtsraumKennung('UK') === 'GB' && V.rechtsraumKennung(' uk ') === 'GB';
}

test('[U2-ADR-477·Liste] ein Modul mit der Liste GB-ENG und GB-WLS wird angenommen, Schlüssel GB-ENG,GB-WLS', () => {
  const { V } = ladeKern();
  assert.equal(probeListeAngenommenUndSchluessel(V), true);
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'GB-ENG,GB-WLS', 'fristenVorrang', 'auswahlform'), 'alle',
    'der Lese-Weg des Kontrollflusses findet das Modul unter dem Schlüssel');
  /* U2-ADR-504 § 3 (Selbst-Einlass-Sperre): ein eingelassenes Modul schlägt nichts vor — der Vorschlag bleibt der Rechtsraum
     der Zusammenstellung (im DE-Produkt „DE“). */
  assert.equal(V._rechtsraumVorschlagswert(), V._rechtsraumDerZusammenstellung());
  assert.equal(V._rechtsraumDerZusammenstellung(), 'DE');
});

test('[U2-ADR-477·Liste] die Liste GB-WLS und gb-eng ergibt denselben Schlüssel — gleich in jeder Reihenfolge und Schreibung', () => {
  const { V } = ladeKern();
  assert.equal(probeReihenfolgeUndSchreibungGleich(V), true);
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify(modul(['GB-WLS', 'gb-eng'])), d);
  assert.equal(r.angenommen, true, r.grund || '');
  assert.equal(r.kennung, 'GB-ENG,GB-WLS');
  assert.deepEqual(d.rechtsraumModule[0].rechtsraum, ['GB-WLS', 'gb-eng'], 'gespeichert wird die Liste, wie sie kam');
  /* Eine zweite Fassung derselben Liste in anderer Reihenfolge ersetzt die erste, statt danebenzuliegen:
     das Einbetten vergleicht Schlüssel, nicht Rohwerte. */
  const r2 = V.modulEinlassen(JSON.stringify(modul(['GB-ENG', 'GB-WLS'], { moduleVersion: 2 })), d);
  assert.equal(r2.fassung, 'aktualisiert');
  assert.equal(d.rechtsraumModule.length, 1);
});

/* Je Abweisungsgrund ein eigener Test: der Einlass weist ab (Grund `rechtsraum`), und die Normalform ist leer. */
function abgewiesen(V, roh) {
  const r = V.modulEinlassen(JSON.stringify(modul(roh)), V.leeresDepot());
  return r.angenommen === false && r.grund === 'rechtsraum' && V.rechtsraumKennung(roh) === '';
}

test('[U2-ADR-477·Liste·Abweisung] ein Listeneintrag, der kein String ist, macht die Liste ungültig', () => {
  const { V } = ladeKern();
  assert.equal(abgewiesen(V, [1]), true);
  assert.equal(abgewiesen(V, ['GB-ENG', null]), true);
  assert.equal(abgewiesen(V, ['GB-ENG', ['GB-WLS']]), true);
});

test('[U2-ADR-477·Liste·Abweisung] die leere Liste ist ungültig', () => {
  const { V } = ladeKern();
  assert.equal(abgewiesen(V, []), true);
});

test('[U2-ADR-477·Liste·Abweisung] ein doppelter Eintrag, auch erst nach der Normalisierung, ist ungültig', () => {
  const { V } = ladeKern();
  assert.equal(abgewiesen(V, ['GB-ENG', 'GB-ENG']), true);
  assert.equal(abgewiesen(V, ['gb-eng', ' GB-ENG ']), true);
  assert.equal(abgewiesen(V, ['UK', 'GB']), true, '„UK“ wird als „GB“ gelesen, also doppelt');
});

test('[U2-ADR-477·Liste·Abweisung] ein Eintrag in falscher Form ist ungültig', () => {
  const { V } = ladeKern();
  for (const roh of [['England'], ['G'], ['GB-'], ['GB-ENGL'], ['GB_ENG'], ['GB-ENG,GB-WLS']]) {
    assert.equal(abgewiesen(V, roh), true, JSON.stringify(roh));
  }
  assert.equal(V.rechtsraumKennung(['GB-ENG', 'GB-WLS']), 'GB-ENG,GB-WLS', 'Gegenprobe: die richtige Form geht durch');
});

/* Kein fester Code (U2-ADR-504 § 3): reserviert ist der Code eines Ab-Werk-Moduls, als String und als Listeneintrag. */
function reserviert(V, roh) {
  const r = V.modulEinlassen(JSON.stringify(modul(roh)), V.leeresDepot());
  return r.angenommen === false && r.grund === 'reserviert';
}
test('[U2-ADR-477·Liste·Abweisung] der Ab-Werk-Code ist auch als Listeneintrag reserviert: DE im DE-Produkt, im nackten Gerüst nicht', () => {
  const { V } = ladeKern();
  for (const roh of [['DE'], ['de'], [' De '], ['GB-ENG', 'DE']]) assert.equal(reserviert(V, roh), true, JSON.stringify(roh));
  const nackt = ladeKern({ blank: true }).V;
  assert.equal(reserviert(nackt, ['GB-ENG', 'DE']), false, 'im nackten Gerüst ist kein Code reserviert');
});

test('[U2-ADR-477·Liste] abgewiesen: die leere Liste, DE allein und neben anderem, doppelte Einträge, eine Zahl', () => {
  /* DE allein und neben anderem: im DE-Produkt mit Grund `reserviert` (probeDeInListeAbgewiesen), die übrigen mit `rechtsraum`. */
  const { V } = ladeKern();
  for (const roh of [[], ['GB-ENG', 'GB-ENG'], [1], ['gb-eng', 'GB-ENG'], ['England'], ['UK', 'GB']]) {
    const d = V.leeresDepot();
    const r = V.modulEinlassen(JSON.stringify(modul(roh)), d);
    assert.equal(r.angenommen, false, JSON.stringify(roh) + ' wurde angenommen');
    assert.equal(r.grund, 'rechtsraum', JSON.stringify(roh) + ': Grund ' + r.grund);
    assert.equal(V.rechtsraumKennung(roh), '', JSON.stringify(roh));
  }
  assert.equal(probeDeInListeAbgewiesen(V), true);
  /* Auch die Registry-Anmeldung eines Depots, das so ein Modul an der Prüfung vorbei trägt, legt kein Fach an — die Liste nennt
     den Ab-Werk-Code DE (_rechtsraumCodeAbWerk prüft jeden Eintrag). */
  const d = V.leeresDepot();
  d.rechtsraumModule = [modul(['GB-ENG', 'DE'])];
  V._rechtsraumModuleAusDepotAnmelden(d);
  assert.deepEqual(Object.keys(V.getRechtsraumModulRegistry()).filter((k) => k !== 'DE'), []);
});

function bestandAbweichungen(V) {
  const werte = new Set();
  const sammeln = (o) => {
    if (Array.isArray(o)) { o.forEach(sammeln); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.rechtsraum === 'string') werte.add(o.rechtsraum);
    Object.values(o).forEach(sammeln);
  };
  const jsonDateien = (wurzel) => fs.readdirSync(wurzel, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(wurzel, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : jsonDateien(p);
    return e.name.endsWith('.json') ? [p] : [];
  });
  for (const datei of jsonDateien(path.join(REPO, 'tools')).concat(jsonDateien(path.join(REPO, 'tests', 'fixtures')))) {
    try { sammeln(JSON.parse(fs.readFileSync(datei, 'utf8'))); } catch (_) { /* kein JSON-Modul */ }
  }
  for (const datei of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.js'))) {
    const text = fs.readFileSync(path.join(__dirname, datei), 'utf8');
    for (const m of text.matchAll(/rechtsraum:\s*'([^'\n]*)'/g)) werte.add(m[1]);
  }
  /* Positivkontrolle: der Bestand ist gefunden worden, und die bekannten Codes sind dabei. */
  if (werte.size < 10 || !werte.has('UK') || !werte.has('DE') || !werte.has('FR')) return ['Bestand nicht gefunden (' + werte.size + ')'];
  const abweichend = [];
  for (const w of werte) {
    const vorher = V.rechtsraumCodeNormalisieren(w);
    const erwartet = vorher === 'UK' ? 'GB' : vorher;
    if (V.rechtsraumKennung(w) !== erwartet) abweichend.push(w);
  }
  return abweichend;
}

test('[U2-ADR-477·Bestand] jeder String-Rechtsraum im Repo ergibt denselben Schlüssel wie vorher — außer „UK“, das „GB“ wird', () => {
  const { V } = ladeKern();
  assert.deepEqual(bestandAbweichungen(V), [], 'ein bestehendes String-Modul bekäme einen anderen Schlüssel');
});

test('[U2-ADR-477·UK] der String „UK“ wird als „GB“ gelesen — nicht als England und Wales', () => {
  const { V } = ladeKern();
  assert.equal(probeUkAlsGb(V), true);
  assert.notEqual(V.rechtsraumKennung('UK'), 'GB-ENG,GB-WLS');
  const d = V.leeresDepot();
  assert.equal(V.modulEinlassen(JSON.stringify(modul('UK')), d).angenommen, true);
  V._rechtsraumModuleAusDepotAnmelden(d);
  assert.ok(V.getRechtsraumModulRegistry().GB, 'ausgelegt als GB');
  assert.equal(V.getRechtsraumModulRegistry().UK, undefined);
  assert.equal(V.getRechtsraumModulRegistry()['GB-ENG,GB-WLS'], undefined, 'UK ist nicht England und Wales');
  assert.equal(d.rechtsraumModule[0].rechtsraum, 'UK', 'der gespeicherte Wert bleibt');
  /* Ein Instrument-Stempel „UK" in einem Altdepot findet über denselben Leseweg das GB-Fach. */
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'UK', 'fristenVorrang', 'auswahlform'), 'alle');
});

/* ── Altbestand mit „UK": laden, ohne Bearbeiten speichern, byte-gleich ── */
const PW = 'Rechtsraum-UK-Altbestand-2026!';
function ukAusschnitt(daten) {
  return JSON.stringify({ rechtsraum: daten.rechtsraum, rechtsraumModule: daten.rechtsraumModule });
}
/* Ein Rundlauf: anlegen mit UK-Altbestand, sichern, frisch laden, OHNE Bearbeiten erneut sichern, frisch laden.
   `eingriff` ist der Haken des Rot-Beweises: er läuft zwischen Laden und zweitem Sichern. */
async function altbestandRundlauf(eingriff) {
  const a = ladeKern().V;
  await a.depotAnlegen(PW);
  const r = a.modulEinlassen(JSON.stringify(modul('UK', { sprache: 'en' })), a.getData());
  assert.equal(r.angenommen, true, r.grund || '');
  a.getData().rechtsraum = 'UK';
  const vorher = ukAusschnitt(a.getData());
  const umschlag1 = await a.depotSerialisieren();
  const b = ladeKern().V;
  await b.depotLaden(umschlag1, PW);
  /* Ein unsigniertes Modul ist nach dem Öffnen nicht gewählt (Wahl statt Schalter, 17.10.2026); die Person wählt es,
     wie in der Wahl beim Öffnen. Die Wahl gilt nur im Arbeitsspeicher und ändert keine Bytes der Datei. */
  b.depotModuleWaehlen(b.nichtGewaehlteDepotModule().map((g) => g.modul));
  assert.ok(b.getRechtsraumModulRegistry().GB, 'nach der Wahl als GB angemeldet');
  if (eingriff) eingriff(b);
  const umschlag2 = await b.depotSerialisieren();
  const c = ladeKern().V;
  await c.depotLaden(umschlag2, PW);
  return { vorher, nachher: ukAusschnitt(c.getData()) };
}

function rundlaufAbweichung(r) {
  if (!r.vorher.includes('"rechtsraum":"UK"')) return ['Positivkontrolle: der Altbestand trägt kein UK'];
  return r.nachher === r.vorher ? [] : ['vorher ' + r.vorher + ' / nachher ' + r.nachher];
}

test('[U2-ADR-477·UK-Altbestand] ein Depot mit „UK“ laden und ohne Bearbeiten speichern: byte-gleich', async () => {
  assert.deepEqual(rundlaufAbweichung(await altbestandRundlauf(null)), []);
});

test('[U2-ADR-477·UK-Altbestand·Rot-Beweis] ein Speicherweg, der UK→GB umschreibt, macht den Rundlauf rot', async () => {
  const { vorher, nachher } = await altbestandRundlauf((V) => {
    const d = V.getData();
    d.rechtsraum = V.rechtsraumKennung(d.rechtsraum);
    for (const m of d.rechtsraumModule) m.rechtsraum = V.rechtsraumKennung(m.rechtsraum);
  });
  assert.notEqual(nachher, vorher, 'die Probe hat das Umschreiben nicht bemerkt');
  assert.equal(rundlaufAbweichung({ vorher, nachher }).length, 1);
  assert.ok(nachher.includes('"rechtsraum":"GB"'));
});

/* ── Ein signiertes Modul mit „UK": Signatur geprüft, Bytes unverändert, ausgelegt als GB ──
   Muster: tests/modul-einlassen-geprueft.test.js — Wegwerf-Anker und Wegwerf-Anbieterschlüssel, im Test
   erzeugt. Kein Produktschlüssel, keine Zeremonie, der Krypto-Block bleibt unberührt. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-10-03T12:00:00Z';
async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}

/* Die Befunde des signierten Rundlaufs als Liste — leer heißt: gültig, geprüft, byte-gleich, als GB ausgelegt. */
function signiertBefund(f) {
  const raus = [];
  if (f.bytesNachher !== f.bytesVorher) raus.push('Bytes des signierten Moduls verändert');
  if (!f.certGueltig) raus.push('Anbieter-Zertifikat nach dem Laden ungültig');
  if (!f.sigGueltig) raus.push('Modul-Signatur nach dem Laden ungültig');
  if (f.nutzlastRechtsraum !== 'UK') raus.push('signierte Nutzlast trägt nicht UK');
  if (!f.registryHatGb || f.registryHatUk) raus.push('nicht als GB ausgelegt');
  return raus;
}

test('[U2-ADR-477·UK-signiert] signiertes Modul mit „UK“: nach dem Laden gültig, Signatur geprüft, Bytes unverändert, ausgelegt als GB', async () => {
  const a = ladeKern().V;
  await a.depotAnlegen(PW);
  const anbieter = await wegwerfKeypair();
  const nutzlast = modul('UK', { sprache: 'en' });
  const providerCredentialJws = await signieren(a, anbieterCertRohling('institution/test-uk', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(a, nutzlast, anbieter.privJwk);
  const opts = { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT };
  const r = await a.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws, modulSignaturJws }), a.getData(), opts);
  assert.equal(r.angenommen, true, r.grund || '');
  const vorher = JSON.stringify(a.getData().rechtsraumModule);
  assert.equal(a.getData().rechtsraumModule[0].rechtsraum, 'UK');
  assert.equal(a.getData().rechtsraumModule[0].ungeprueft, false, 'Positivkontrolle: über die Signaturkette eingelassen');

  const b = ladeKern().V;
  await b.depotLaden(await a.depotSerialisieren(), PW);
  /* Der Wegwerf-Anker ist beim Öffnen nicht bekannt: das Modul ist nicht gewählt, bis die Person es wählt (wie oben). */
  b.depotModuleWaehlen(b.nichtGewaehlteDepotModule().map((g) => g.modul));
  const geladen = b.getData().rechtsraumModule[0];
  /* Die Signatur des geladenen Belegs erneut prüfen — mit denselben Kern-Funktionen wie beim Einlass. */
  const cert = await b.verifiziereProviderCredential(geladen.beleg.providerCredentialJws, opts);
  const sig = cert.gueltig ? await b._verifiziereTemplateSignatur(cert.nutzlast, geladen.beleg.modulSignaturJws, opts) : { gueltig: false };
  assert.deepEqual(signiertBefund({
    bytesVorher: vorher, bytesNachher: JSON.stringify(b.getData().rechtsraumModule),
    certGueltig: cert.gueltig === true, sigGueltig: sig.gueltig === true,
    nutzlastRechtsraum: sig.nutzlast && sig.nutzlast.rechtsraum,
    registryHatGb: !!b.getRechtsraumModulRegistry().GB, registryHatUk: !!b.getRechtsraumModulRegistry().UK,
  }), []);
});

/* ── Rot-Beweise am verdorbenen Kern ── */
test('[U2-ADR-477·Rot-Beweis] eine Normalform ohne Sortierung macht die Reihenfolge-Probe rot', () => {
  const V = verdorbenerKern('ohne-sortierung', "  return teile.sort().join(',');", "  return teile.join(',');");
  assert.equal(probeReihenfolgeUndSchreibungGleich(V), false);
});

test('[U2-ADR-477·Rot-Beweis] eine Reservierung, die Listeneinträge nicht ansieht, macht die Abweis-Probe rot', () => {
  const V = verdorbenerKern('de-durchgelassen',
    "  return code.split(',').some((teil) => belegt.indexOf(teil) >= 0);",
    '  return false;');
  assert.equal(probeDeInListeAbgewiesen(V), false);
});

test('[U2-ADR-477·Rot-Beweis] ein Alias von „UK“ auf England und Wales macht die Probe rot, die die Auslegung GB verlangt', () => {
  const V = verdorbenerKern('alias-england-wales', "const RECHTSRAUM_ALIAS = Object.freeze({ UK: 'GB' });",
    "const RECHTSRAUM_ALIAS = Object.freeze({ UK: 'GB-ENG,GB-WLS' });");
  assert.equal(probeUkAlsGb(V), false);
});

/* Proben-Kopplung (Prüfstand U2-ADR-099): jede Klausel-Probe nennt die Funktion, die ihr Urteil trägt. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-477·Liste] ein Modul mit der Liste GB-ENG und GB-WLS wird angenommen, Schlüssel GB-ENG,GB-WLS', diskriminante: probeListeAngenommenUndSchluessel },
    { fuer: '[U2-ADR-477·Liste] die Liste GB-WLS und gb-eng ergibt denselben Schlüssel — gleich in jeder Reihenfolge und Schreibung', diskriminante: probeReihenfolgeUndSchreibungGleich },
    { fuer: '[U2-ADR-477·Liste] abgewiesen: die leere Liste, DE allein und neben anderem, doppelte Einträge, eine Zahl', diskriminante: probeDeInListeAbgewiesen },
    { fuer: '[U2-ADR-477·Liste·Abweisung] der Ab-Werk-Code ist auch als Listeneintrag reserviert: DE im DE-Produkt, im nackten Gerüst nicht', diskriminante: reserviert },
    { fuer: '[U2-ADR-477·Bestand] jeder String-Rechtsraum im Repo ergibt denselben Schlüssel wie vorher — außer „UK“, das „GB“ wird', diskriminante: bestandAbweichungen },
    { fuer: '[U2-ADR-477·UK] der String „UK“ wird als „GB“ gelesen — nicht als England und Wales', diskriminante: probeUkAlsGb },
    { fuer: '[U2-ADR-477·UK-Altbestand] ein Depot mit „UK“ laden und ohne Bearbeiten speichern: byte-gleich', diskriminante: rundlaufAbweichung },
    { fuer: '[U2-ADR-477·UK-signiert] signiertes Modul mit „UK“: nach dem Laden gültig, Signatur geprüft, Bytes unverändert, ausgelegt als GB', diskriminante: signiertBefund },
  ],
};
