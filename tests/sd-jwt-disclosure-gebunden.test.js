'use strict';
/* Befund SD-JWT-DISCLOSURE-UNGEBUNDEN (20.11.2026, HOCH)
   ───────────────────────────────────────────────────────
   Die Selbst-Signatur der kompakten SD-JWT-Form deckt nur den JWT-Teil (Kopf.Nutzlast). Die Werte stehen in den
   Offenlegungen hinter „~“; gebunden sind sie nur über ihren SHA-256 im `_sd` der Nutzlast (RFC 9901 §7.1, Schritt 3:
   jede Offenlegung, deren Digest nicht in `_sd` steht, macht die Präsentation ungültig). Am Kanon 8784124ee prüfte die
   Selbst-Signatur nur den JWT-Teil, und `sdJwtKompaktLesen` übernahm jede Offenlegung als Angabe. Eine in der Datei
   geänderte Offenlegung kam darum als „unverändert“ herein (U2-ADR-457).
   Diese Probe hält fest: Eine ausgetauschte, eine hinzugefügte und eine doppelte Offenlegung ergeben „ungültig“, an der
   Selbst-Signatur-Prüfung und am Einleseweg; die unveränderte Ausgabe bleibt gültig. Rot am Kanon 8784124ee. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const b64u = (s) => Buffer.from(s, 'utf8').toString('base64url');
const vonB64u = (t) => Buffer.from(t, 'base64url').toString('utf8');

async function ausgabe() {
  const { V } = ladeKern();
  await V.depotAnlegen('probe-passwort-sdjwt-1');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
  const ser = (await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung;
  return { V, ser };
}
// Tauscht den Wert der Offenlegung `name` aus; Salz und Name bleiben, die Signatur bleibt unberührt.
function wertTauschen(ser, name, neu) {
  const teile = ser.split('~');
  let getroffen = false;
  for (let i = 1; i < teile.length; i++) {
    if (!teile[i]) continue;
    const a = JSON.parse(vonB64u(teile[i]));
    if (a[1] === name) { a[2] = neu; teile[i] = b64u(JSON.stringify(a)); getroffen = true; }
  }
  assert.ok(getroffen, 'Offenlegung ' + name + ' nicht gefunden');
  return teile.join('~');
}

test('[SD-JWT·gebunden] die unveränderte Ausgabe bleibt gültig', async () => {
  const { V, ser } = await ausgabe();
  assert.equal((await V.sdJwtSelbstSignaturPruefen(ser)).gueltig, true);
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.ok(!plan.ungueltig, plan.grund);
  assert.ok(plan.zeilen.some((z) => z.feldId === 'givenName' && z.neuWert === 'Erika'));
});

test('[SD-JWT·gebunden] eine ausgetauschte Offenlegung ergibt ungültig', async () => {
  const { V, ser } = await ausgabe();
  const kaputt = wertTauschen(ser, 'given_name', 'Mallory');
  assert.equal((await V.sdJwtSelbstSignaturPruefen(kaputt)).gueltig, false, 'Selbst-Signatur-Prüfung');
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', kaputt);
  assert.equal(plan.ungueltig, true, 'Einleseweg übernahm ' + JSON.stringify((plan.zeilen || []).map((z) => z.neuWert)));
});

test('[SD-JWT·gebunden] eine hinzugefügte Offenlegung ergibt ungültig', async () => {
  const { V, ser } = await ausgabe();
  const fremd = b64u(JSON.stringify(['salzsalzsalzsalz', 'nationalities', ['XX']]));
  const kaputt = ser.replace(/~$/, '~' + fremd + '~');
  assert.equal((await V.sdJwtSelbstSignaturPruefen(kaputt)).gueltig, false);
  assert.equal((await V.importPlanGeprueft('sd-jwt-vc-identitaet', kaputt)).ungueltig, true);
});

test('[SD-JWT·gebunden] eine doppelte Offenlegung ergibt ungültig (RFC 9901 §7.1)', async () => {
  const { V, ser } = await ausgabe();
  const erste = ser.split('~')[1];
  const kaputt = ser.replace(/~$/, '~' + erste + '~');
  assert.equal((await V.sdJwtSelbstSignaturPruefen(kaputt)).gueltig, false);
  assert.equal((await V.importPlanGeprueft('sd-jwt-vc-identitaet', kaputt)).ungueltig, true);
});

/* WÄCHTER GEGEN DIE KLASSE. Zwei Seiten:
   (1) Kein Einleseformat übernimmt eine kompakte Form mit ungebundener Offenlegung: die Prüfung in importPlanGeprueft läuft
       vor dem Format, für jedes Format aus IMPORT_FORMATE — ein neues Format ist damit ohne eigenen Handgriff geschützt.
   (2) Die kompakte Form wird im Kern und in der Lese-App nur an den bekannten Stellen zerlegt (`.split('~')`). Eine neue
       Lesestelle fällt hier auf und muss die Bindung über sdJwtOffenlegungenGebunden prüfen, bevor sie in die Liste kommt. */
const fs = require('node:fs');
const path = require('node:path');
const ZERLEGT_ERLAUBT = Object.freeze({
  'sdJwtKompaktLesen': { anzahl: 1, grund: 'reines Lesen; die Übernahme läuft über importPlanGeprueft (Bindung vorher)' },
  'sdJwtSelbstSignaturPruefen': { anzahl: 1, grund: 'prüft Signatur und ruft sdJwtOffenlegungenGebunden' },
  'sdJwtOffenlegungenGebunden': { anzahl: 1, grund: 'die Bindungsprüfung selbst' },
  'anfrageAusKompakt': { anzahl: 1, grund: 'Anfrage-Transport JWS~Zertifikat, keine SD-JWT-Offenlegungen' },
});
/* Jede Zerlegung an „~“, in jeder Schreibweise: split('~'), split("~"), split(`~`), split('~', n), split(/~/). Gezählt je
   Definition oberster Ebene (Funktion oder Konstante, auch eine Pfeilfunktion `const x = (…) =>`); eine zweite Stelle in einer
   erlaubten Funktion fällt über die Anzahl auf (Gegenlesung Prüfregeln 20.11.2026, M1). */
const ZERLEGUNG = /\.split\(\s*(?:(['"`])~\1|\/~\/[a-z]*)\s*[,)]/;
const DEFINITION = /^(?:async\s+)?function\s*\*?\s*([\w$]+)|^(?:const|let|var)\s+([\w$]+)/;
function zerlegStellen(quelltext) {
  const aus = {};
  let ort = '(oben)';
  for (const z of quelltext.split('\n')) {
    const m = DEFINITION.exec(z);
    if (m) ort = m[1] || m[2];
    if (ZERLEGUNG.test(z)) aus[ort] = (aus[ort] || 0) + 1;
  }
  return aus;
}
function zerlegAbweichungen(stellen) {
  const aus = [];
  for (const [ort, n] of Object.entries(stellen)) {
    const e = Object.prototype.hasOwnProperty.call(ZERLEGT_ERLAUBT, ort) ? ZERLEGT_ERLAUBT[ort] : null;
    if (!e) aus.push(ort + ': nicht in der Liste (' + n + ')');
    else if (e.anzahl !== n) aus.push(ort + ': ' + n + ' Stellen statt ' + e.anzahl);
  }
  return aus;
}

test('[SD-JWT·gebunden·Klasse] kein Einleseformat übernimmt eine ungebundene Offenlegung', async () => {
  const { V, ser } = await ausgabe();
  const kaputt = wertTauschen(ser, 'given_name', 'Mallory');
  const durch = [];
  for (const f of V.IMPORT_FORMATE) {
    let plan;
    try { plan = await V.importPlanGeprueft(f.id, kaputt); } catch (e) { continue; }   // ein Format, das wirft, übernimmt nichts
    if (!plan || !plan.ungueltig) durch.push(f.id);
  }
  assert.deepEqual(durch, [], 'Formate übernehmen eine ungebundene Offenlegung');
});

test('[SD-JWT·gebunden·Klasse] die kompakte Form wird nur an bekannten Stellen zerlegt', () => {
  const wurzel = path.join(__dirname, '..');
  const gesamt = {};
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const stellen = zerlegStellen(fs.readFileSync(path.join(wurzel, datei), 'utf8'));
    for (const [ort, n] of Object.entries(stellen)) gesamt[ort] = (gesamt[ort] || 0) + n;
  }
  assert.deepEqual(zerlegAbweichungen(gesamt), [], 'Zerlegestelle der kompakten Form ohne Bindungsprüfung oder mit anderer Anzahl');
  // Die Liste ist ausgeschöpft: jede erlaubte Funktion zerlegt wirklich, sonst steht ein Eintrag als Luft da.
  assert.deepEqual(Object.keys(ZERLEGT_ERLAUBT).filter((f) => !gesamt[f]), [], 'Eintrag ohne Stelle');
});

test('[SD-JWT·gebunden·Klasse·Rot-Beweis] jede Schreibweise und jede zweite Stelle wird gefunden', () => {
  const faelle = [
    ['function neuerLeser(t) {\n  const teile = t.split(\'~\');\n}\n', 'neuerLeser: nicht in der Liste (1)'],
    ['function neuerLeser(t) {\n  return t.split("~");\n}\n', 'neuerLeser: nicht in der Liste (1)'],
    ['function neuerLeser(t) {\n  return t.split(`~`);\n}\n', 'neuerLeser: nicht in der Liste (1)'],
    ['function neuerLeser(t) {\n  return t.split(/~/);\n}\n', 'neuerLeser: nicht in der Liste (1)'],
    ['function neuerLeser(t) {\n  return t.split(\'~\', 2);\n}\n', 'neuerLeser: nicht in der Liste (1)'],
    ['const neuerLeser = (t) => t.split(\'~\');\n', 'neuerLeser: nicht in der Liste (1)'],
    ['function sdJwtKompaktLesen(t) {\n  const a = t.split(\'~\');\n  const b = t.split(/~/);\n}\n', 'sdJwtKompaktLesen: 2 Stellen statt 1'],
  ];
  for (const [quelle, erwartet] of faelle) assert.deepEqual(zerlegAbweichungen(zerlegStellen(quelle)), [erwartet], quelle);
  assert.deepEqual(zerlegAbweichungen(zerlegStellen('function x(t) {\n  return t.split(\'.\');\n}\n')), [], 'anderes Trennzeichen zählt nicht');
});

/* GEGENLESUNG 23.11.2026 (RFC 9901 §7.1, ohne stilles Behandeln). Gebunden wird an die oberste Ebene, weil sdJwtKompaktLesen
   jede Offenlegung als oberste Angabe ablegt. Eine verschachtelte Offenlegung (Digest in einem inneren `_sd` oder als
   Array-Element {"...": d}) wird mit eigenem Grund und eigener Meldung abgelehnt; Köder-Digests bleiben erlaubt; ein doppelter
   Digest, ein doppelter Name, die Namen „_sd“ und „...“, ein `_sd`, das kein Array ist, und ein fremdes `_sd_alg` werden
   abgelehnt. Gebaut wird je Fall eine unsignierte kompakte Form (alg none), deren Nutzlast die Probe selbst bestimmt. */
const crypto = require('node:crypto');
const digest = (d) => crypto.createHash('sha256').update(d, 'ascii').digest('base64url');
const offenlegung = (...a) => b64u(JSON.stringify(['salz-' + crypto.randomBytes(8).toString('hex')].concat(a)));
async function vctIdentitaet() {
  const { V, ser } = await ausgabe();
  return { V, vct: JSON.parse(vonB64u(ser.split('~')[0].split('.')[1])).vct };
}
const unsigniert = (nutzlast, offen) => b64u(JSON.stringify({ alg: 'none', typ: 'vc+sd-jwt' })) + '.' + b64u(JSON.stringify(nutzlast)) + '.~' + offen.map((o) => o + '~').join('');

test('[SD-JWT·gebunden·§7.1] verschachtelte Offenlegung in innerem _sd: eigener Grund und eigene Meldung', async () => {
  const { V, vct } = await vctIdentitaet();
  const g = offenlegung('given_name', 'Erika');
  const innen = offenlegung('street_address', 'Musterweg 1');
  const ser = unsigniert({ vct, iss: 'urn:probe', _sd: [digest(g)], address: { _sd: [digest(innen)] } }, [g, innen]);
  assert.deepEqual(await V.sdJwtOffenlegungenGebunden(ser), { gebunden: false, grund: 'offenlegung-verschachtelt' });
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.equal(plan.ungueltig, true);
  assert.equal(plan.grund, 'offenlegung-verschachtelt');
  assert.equal(V.importUngueltigNachricht(plan), V.STRINGS.importSdJwtVerschachtelt);
  assert.ok(V.STRINGS.importSdJwtVerschachtelt && V.STRINGS.importSdJwtVerschachtelt !== V.STRINGS.importUngueltig, 'eigener Satz');
  const en = require('../tools/textsatz-en-modul.json').texte['strings:importSdJwtVerschachtelt.text'];
  assert.ok(typeof en === 'string' && /nested/.test(en), 'englischer Satz im Sprachmodul');
});

test('[SD-JWT·gebunden·§7.1] verschachtelte Offenlegung als Array-Element {"...": d}: eigener Grund', async () => {
  const { V, vct } = await vctIdentitaet();
  const el = offenlegung('DE');
  const ser = unsigniert({ vct, iss: 'urn:probe', nationalities: [{ '...': digest(el) }] }, [el]);
  assert.deepEqual(await V.sdJwtOffenlegungenGebunden(ser), { gebunden: false, grund: 'offenlegung-verschachtelt' });
  assert.equal((await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser)).grund, 'offenlegung-verschachtelt');
});

test('[SD-JWT·gebunden·§7.1] Köder-Digests in _sd sind erlaubt, der Wert kommt herein', async () => {
  const { V, vct } = await vctIdentitaet();
  const g = offenlegung('given_name', 'Erika');
  const koeder = [digest('koeder-1'), digest('koeder-2')];
  const ser = unsigniert({ vct, iss: 'urn:probe', _sd: [koeder[0], digest(g), koeder[1]], address: { _sd: [digest('koeder-3')] } }, [g]);
  assert.deepEqual(await V.sdJwtOffenlegungenGebunden(ser), { gebunden: true, grund: null });
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.ok(!plan.ungueltig, plan.grund);
  assert.ok(plan.zeilen.some((z) => z.feldId === 'givenName' && z.neuWert === 'Erika'));
});

test('[SD-JWT·gebunden·§7.1] doppelter Digest, doppelter Name, Name _sd/..., _sd kein Array, fremdes _sd_alg: abgelehnt', async () => {
  const { V, vct } = await vctIdentitaet();
  const g = offenlegung('given_name', 'Erika');
  const g2 = offenlegung('given_name', 'Mallory');
  const sd = offenlegung('_sd', ['x']);
  const pkt = offenlegung('...', 'x');
  const faelle = [
    ['sd-digest-doppelt', unsigniert({ vct, _sd: [digest(g), digest(g)] }, [g])],
    ['sd-digest-doppelt', unsigniert({ vct, _sd: [digest(g)], address: { _sd: [digest(g)] } }, [g])],
    ['offenlegung-name-doppelt', unsigniert({ vct, _sd: [digest(g), digest(g2)] }, [g, g2])],
    ['offenlegung-name-doppelt', unsigniert({ vct, given_name: 'Offen', _sd: [digest(g)] }, [g])],
    ['offenlegung-name-unzulaessig', unsigniert({ vct, _sd: [digest(sd)] }, [sd])],
    ['offenlegung-name-unzulaessig', unsigniert({ vct, _sd: [digest(pkt)] }, [pkt])],
    ['sd-keine-liste', unsigniert({ vct, _sd: digest(g) }, [g])],
    ['sd-keine-liste', unsigniert({ vct, _sd: [digest(g)], address: { _sd: 'x' } }, [g])],
    ['sd-alg-unbekannt', unsigniert({ vct, _sd_alg: 'sha-512', _sd: [digest(g)] }, [g])],
  ];
  for (const [grund, ser] of faelle) {
    assert.deepEqual(await V.sdJwtOffenlegungenGebunden(ser), { gebunden: false, grund }, grund);
    const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
    assert.equal(plan.ungueltig, true, grund + ': Einleseweg');
    assert.deepEqual(plan.zeilen, [], grund + ': nichts übernommen');
  }
});

test('[SD-JWT·gebunden·§7.1] KB-JWT am Ende zählt nicht als Offenlegung; die Form bleibt mit ihrer eigenen Meldung abgewiesen', async () => {
  const { V, ser } = await ausgabe();
  const kb = b64u(JSON.stringify({ alg: 'ES256', typ: 'kb+jwt' })) + '.' + b64u(JSON.stringify({ nonce: 'n' })) + '.c2ln';
  const mitKb = ser + kb;
  assert.deepEqual(await V.sdJwtOffenlegungenGebunden(mitKb), { gebunden: true, grund: null }, 'KB-JWT ist keine Offenlegung');
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', mitKb);
  assert.equal(plan.ungueltig, true);
  assert.equal(plan.grund, 'signiert-pruefung-fehlt');
  assert.equal(V.importUngueltigNachricht(plan), V.STRINGS.importSignierterNachweisPruefungFehlt);
});

test('[SD-JWT·gebunden·§7.1] fremd signiert mit verschachtelter Offenlegung behält die Meldung „signiert-pruefung-fehlt“', async () => {
  const { V, vct } = await vctIdentitaet();
  const innen = offenlegung('street_address', 'Musterweg 1');
  const kopf = b64u(JSON.stringify({ alg: 'ES256', typ: 'dc+sd-jwt' }));
  const ser = kopf + '.' + b64u(JSON.stringify({ vct, iss: 'https://aussteller.example', address: { _sd: [digest(innen)] } })) + '.c2lnbmF0dXI~' + innen + '~';
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.equal(plan.grund, 'signiert-pruefung-fehlt');
  assert.equal(V.importUngueltigNachricht(plan), V.STRINGS.importSignierterNachweisPruefungFehlt);
});
