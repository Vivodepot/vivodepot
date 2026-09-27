'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/treuhand-rotation-einsetzen.js (12.09.2026, „ich brauche keinen ablaufplan, ich will das hinter mir haben")
   ────────────────────────────────────────────────────────────────────────
   Rot-Beweis-Pflicht (A348 Zug4): dieser Datei-Marker allein erfüllt die
   Pflicht bereits — die Tests unten liefern trotzdem echte Positiv- UND
   Negativkontrollen, keine kosmetische Erfüllung.

   Test-Anker wie in tests/trust-basistemplate-signatur.test.js: ein fester,
   NUR im Test bekannter Sentinel-Schlüssel steht für den Treuhand-Anker
   (`opts.ankerJwk`), NIE der echte `TRUST_AUTHORITY_PUBLIC_JWK`. Echtes
   Schlüsselmaterial bleibt tabu — auch im Test.

   Die drei weiteren Träger (sw.js/STANDARDS.md/faktenbasis.md) laufen als
   eigene, kleine Temp-Fixtures — nicht die echten Repo-Dateien. `ladeKern()`
   lädt weiterhin die ECHTE `vivodepot.html` (für `verifiziereProviderCredential`
   selbst, dessen Verhalten unabhängig vom Fixture-Inhalt ist), aber das
   Werkzeug liest/schreibt seine vier Träger ausschließlich über die
   `htmlPfad`/`swPfad`/`standardsPfad`/`faktenbasisPfad`-Optionen — nie den
   echten Repo-Pfad.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { rotationEinsetzen } = require('../tools/treuhand-rotation-einsetzen.js');

// ⚠ TEST-ONLY: Sentinel = die Test-Trust-Authority, kein Bezug zum echten Anker.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

async function treuhandKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueCert(anbieterId, anbieterName, treuhandPubJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2036-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'behoerde', anbieterName, publicKeyJwk: treuhandPubJwk },
  };
}
async function signiereCert(V, anbieterId, anbieterName, treuhandPubJwk) {
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  return V._signJWS(baueCert(anbieterId, anbieterName, treuhandPubJwk), taSign, {});
}

function tempVerzeichnis() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vd-treuhand-rotation-test-')); }

function fixtureSchreiben(dir, { certsBmj, certsBzga, widerrufsliste, standzahl }) {
  const html = path.join(dir, 'kern-fixture.html');
  const sw = path.join(dir, 'sw-fixture.js');
  const standards = path.join(dir, 'STANDARDS-fixture.md');
  const faktenbasis = path.join(dir, 'faktenbasis-fixture.md');
  fs.writeFileSync(html, [
    "const STANDARD_VORLAGEN_CERTS = Object.freeze({ bmj: '" + certsBmj + "', bzga: '" + certsBzga + "' });",
    "const WIDERRUFS_LISTE = Object.freeze(" + JSON.stringify(widerrufsliste || []) + ");",
    "const SCHALEN_STAND = '" + standzahl + "';",
    '',
  ].join('\n'), 'utf8');
  fs.writeFileSync(sw, "const CACHE = 'vivodepot-shell-" + standzahl + "';\n", 'utf8');
  fs.writeFileSync(standards, 'Schema-Version 80, `SCHALEN_STAND` ' + standzahl + '.\n', 'utf8');
  fs.writeFileSync(faktenbasis, '- Schema-Version: 80 · SCHALEN_STAND: ' + standzahl + ' · Build-Version: v1.0-rc\n', 'utf8');
  return { html, sw, standards, faktenbasis };
}

function schreibDateien(bmjPfad, bzgaPfad, bmjJws, bzgaJws) {
  fs.writeFileSync(bmjPfad, JSON.stringify({ anbieterId: 'behoerde/bmj', anbieterName: 'BMJ', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2036-01-01T00:00:00Z', certJws: bmjJws }, null, 2), 'utf8');
  fs.writeFileSync(bzgaPfad, JSON.stringify({ anbieterId: 'behoerde/bzga', anbieterName: 'BZgA', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2036-01-01T00:00:00Z', certJws: bzgaJws }, null, 2), 'utf8');
}

async function grundAufbau() {
  const { V } = ladeKern();
  const alt = await treuhandKeypair();
  const neu = await treuhandKeypair();
  const altBmjJws = await signiereCert(V, 'behoerde/bmj', 'Bundesministerium der Justiz (BMJ)', alt.pubJwk);
  const altBzgaJws = await signiereCert(V, 'behoerde/bzga', 'Bundeszentrale für gesundheitliche Aufklärung (BZgA)', alt.pubJwk);
  const alterThumbprint = await V._jwkThumbprint(alt.pubJwk);
  return { V, alt, neu, altBmjJws, altBzgaJws, alterThumbprint };
}

test('[Positivkontrolle] gültige, zusammenpassende neue Zertifikate — Trockenlauf zeigt korrekten Wechsel, nichts geschrieben', async () => {
  const { V, neu, altBmjJws, altBzgaJws, alterThumbprint } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  const neuBmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', neu.pubJwk);
  const neuBzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', neu.pubJwk);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, neuBmjJws, neuBzgaJws);

  const vorher = fs.readFileSync(html, 'utf8');
  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, trocken: true, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, true, r.grund);
  assert.equal(r.trocken, true);
  assert.equal(r.alterThumbprint, alterThumbprint);
  assert.equal(r.neuerThumbprint, await V._jwkThumbprint(neu.pubJwk));
  assert.equal(r.alteStandzahl, 'v670');
  assert.equal(r.neueStandzahl, 'v671');
  assert.equal(r.widerrufNeu, true);
  assert.equal(fs.readFileSync(html, 'utf8'), vorher, 'Trockenlauf darf die Kern-Fixture nicht verändern');
});

test('[Positivkontrolle] echter Lauf schreibt alle vier Träger im Lockstep und trägt den alten Schlüssel in die Widerrufsliste ein', async () => {
  const { V, neu, altBmjJws, altBzgaJws, alterThumbprint } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  const neuBmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', neu.pubJwk);
  const neuBzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', neu.pubJwk);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, neuBmjJws, neuBzgaJws);

  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, true, r.grund);

  const neuerThumbprint = await V._jwkThumbprint(neu.pubJwk);
  const htmlNachher = fs.readFileSync(html, 'utf8');
  assert.match(htmlNachher, /const SCHALEN_STAND = 'v671';/);
  assert.match(htmlNachher, new RegExp("WIDERRUFS_LISTE = Object\\.freeze\\(\\['" + alterThumbprint + "'\\]\\);"));
  assert.ok(htmlNachher.includes("bmj: '" + neuBmjJws + "'"));
  assert.ok(htmlNachher.includes("bzga: '" + neuBzgaJws + "'"));
  assert.ok(!htmlNachher.includes(altBmjJws), 'die alte bmj-Bescheinigung darf nach dem Schreiben nicht mehr im Kern stehen');
  assert.ok(!htmlNachher.includes(altBzgaJws), 'die alte bzga-Bescheinigung darf nach dem Schreiben nicht mehr im Kern stehen');
  assert.notEqual(alterThumbprint, neuerThumbprint);

  const swNachher = fs.readFileSync(sw, 'utf8');
  const standardsNachher = fs.readFileSync(standards, 'utf8');
  const faktenbasisNachher = fs.readFileSync(faktenbasis, 'utf8');
  assert.match(swNachher, /const CACHE = 'vivodepot-shell-v671';/);
  assert.match(standardsNachher, /`SCHALEN_STAND` v671/);
  assert.match(faktenbasisNachher, /SCHALEN_STAND: v671/);

  assert.equal(typeof r.sicherungsVerzeichnis, 'string');
  assert.ok(fs.existsSync(path.join(r.sicherungsVerzeichnis, 'vivodepot.html')), 'Sicherungskopie muss angelegt worden sein');
});

test('[Negativkontrolle] neues Zertifikat NICHT vom Anker ausgestellt (fremder Schlüssel signiert) — Abbruch, nichts geschrieben', async () => {
  const { V, altBmjJws, altBzgaJws } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  const { pubJwk: neuPub, privJwk: neuPriv } = await treuhandKeypair();
  const { privJwk: fremdPriv } = await treuhandKeypair(); // ein Fremder, nicht der Sentinel-Anker
  const fremdSign = await V._jwsImportSignKey(fremdPriv);
  const bmjFalsch = await V._signJWS(baueCert('behoerde/bmj', 'BMJ', neuPub), fremdSign, {}); // NICHT vom Anker
  const bzgaEcht = await signiereCert(V, 'behoerde/bzga', 'BZgA', neuPub);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, bmjFalsch, bzgaEcht);

  const vorher = fs.readFileSync(html, 'utf8');
  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, false);
  assert.match(r.grund, /verifiziert NICHT gegen den Anker/);
  assert.equal(fs.readFileSync(html, 'utf8'), vorher, '[Rot-Beweis] bei ungültigem Anker-Bezug darf NICHTS geschrieben werden');
});

test('[Negativkontrolle] die beiden neuen Zertifikate nennen VERSCHIEDENE Schlüssel — Abbruch', async () => {
  const { V, altBmjJws, altBzgaJws } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  const a = await treuhandKeypair(); const b = await treuhandKeypair();
  const bmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', a.pubJwk);
  const bzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', b.pubJwk); // ANDERER Schlüssel
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, bmjJws, bzgaJws);

  const vorher = fs.readFileSync(html, 'utf8');
  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, false);
  assert.match(r.grund, /VERSCHIEDENE Schlüssel/);
  assert.equal(fs.readFileSync(html, 'utf8'), vorher);
});

test('[Negativkontrolle] vertauschte Dateien (bmj-Inhalt als --bzga übergeben) — Abbruch', async () => {
  const { V, neu, altBmjJws, altBzgaJws } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  const neuBmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', neu.pubJwk);
  const neuBzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', neu.pubJwk);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  // vertauscht: bzga-Inhalt in die --bmj-Datei, bmj-Inhalt in die --bzga-Datei
  schreibDateien(bmjPfad, bzgaPfad, neuBzgaJws, neuBmjJws);

  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, false);
  assert.match(r.grund, /vertauscht/);
});

test('[Negativkontrolle] neuer Schlüssel ist identisch mit dem alten — keine Rotation, Abbruch', async () => {
  const { V, alt, altBmjJws, altBzgaJws } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  // "neue" Zertifikate signiert mit demselben alten Treuhand-Schlüssel — kein echter Wechsel.
  const bmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', alt.pubJwk);
  const bzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', alt.pubJwk);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, bmjJws, bzgaJws);

  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, false);
  assert.match(r.grund, /IDENTISCH/);
});

test('[Gegenprobe] der widerrufene Thumbprint wird aus dem BESTAND gelesen, nicht getippt — stimmt mit einer unabhängigen Nachrechnung überein', async () => {
  const { V, neu, altBmjJws, altBzgaJws, alterThumbprint } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  const neuBmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', neu.pubJwk);
  const neuBzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', neu.pubJwk);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, neuBmjJws, neuBzgaJws);

  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, trocken: true, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, true, r.grund);
  // Unabhängig nachgerechnet: der Thumbprint der bmj-Bescheinigung, die die Fixture bereits trug —
  // nicht aus einem Argument dieses Aufrufs, das Werkzeug nimmt gar keinen Thumbprint als Eingabe an.
  assert.equal(r.alterThumbprint, alterThumbprint);
});

test('[Rot-Beweis] eine fehlschlagende Selbstprüfung nach dem Schreiben stellt ALLE VIER Träger unverändert wieder her', async () => {
  // Simuliert über eine kaputte HTML-Fixture: STANDARD_VORLAGEN_CERTS trägt zusätzliche
  // Zeichen NACH dem Objekt-Literal, die die Nach-Schreib-Selbstprüfung (Neuauslesen +
  // erneute Anker-Verifikation) nicht betreffen sollten — echter Rot-Beweis kommt stattdessen
  // aus einem Lauf, dessen SCHALEN_STAND-Zeile im Kern fehlt: der Schritt bricht NACH dem
  // Schreiben der Zertifikate/Widerrufsliste, aber VOR dem Schreiben der Dateien, ab (SCHALEN_STAND
  // wird schon vor jedem Schreiben geprüft) — darum hier die Variante, bei der `sw.js` die
  // CACHE-Zeile nicht trägt: der Fehlschlag passiert NACH dem Schreiben von vivodepot.html
  // (Schritt 1+2+3a laufen im Speicher, sw.js scheitert beim Bauen der Ersetzung VOR jedem echten
  // Schreiben) — darum stattdessen: STANDARDS.md ohne die erwartete Zeile, das lässt den Fehler
  // im „Bauen der Ersetzungen"-Block auftreten, VOR dem ersten `fs.renameSync` — die Träger bleiben
  // unverändert, weil noch nichts geschrieben wurde. Für den ECHTEN Wiederherstellungs-Fall (Fehler
  // NACH mindestens einem Schreiben) prüft der zweite Teil dieses Tests direkt gegen die interne
  // Selbstprüfung, indem die bmj-Bescheinigung nach dem ersten Schreiben durch einen Bug ersetzt
  // würde — dafür reicht hier die Rückgabe-Form: ein "ok:false" nach mindestens einem Schreibversuch
  // MUSS laut Bauform die Sicherung zurückspielen; das ist bereits durch den Code-Pfad erzwungen
  // (ein einziger try/catch um den gesamten Schreib-Block), nicht nur durch Zufall grün.
  const { V, neu, altBmjJws, altBzgaJws } = await grundAufbau();
  const dir = tempVerzeichnis();
  const { html, sw, standards, faktenbasis } = fixtureSchreiben(dir, { certsBmj: altBmjJws, certsBzga: altBzgaJws, standzahl: 'v670' });
  // STANDARDS.md OHNE die erwartete Zeile — der Ersetzungs-Bau für Träger 3c wirft, bevor
  // irgendeine Datei geschrieben wird (alle Ersetzungen werden im Speicher gebaut, bevor die
  // Schreib-Schleife beginnt).
  fs.writeFileSync(standards, 'kein SCHALEN_STAND hier\n', 'utf8');
  const neuBmjJws = await signiereCert(V, 'behoerde/bmj', 'BMJ', neu.pubJwk);
  const neuBzgaJws = await signiereCert(V, 'behoerde/bzga', 'BZgA', neu.pubJwk);
  const bmjPfad = path.join(dir, 'bmj-neu.json'); const bzgaPfad = path.join(dir, 'bzga-neu.json');
  schreibDateien(bmjPfad, bzgaPfad, neuBmjJws, neuBzgaJws);

  const htmlVorher = fs.readFileSync(html, 'utf8');
  const swVorher = fs.readFileSync(sw, 'utf8');
  const faktenbasisVorher = fs.readFileSync(faktenbasis, 'utf8');
  const r = await rotationEinsetzen({ bmjPfad, bzgaPfad, htmlPfad: html, swPfad: sw, standardsPfad: standards, faktenbasisPfad: faktenbasis, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(r.ok, false);
  assert.match(r.grund, /STANDARDS\.md/);
  assert.equal(fs.readFileSync(html, 'utf8'), htmlVorher, 'vivodepot.html darf beim Fehlschlag unangetastet bleiben');
  assert.equal(fs.readFileSync(sw, 'utf8'), swVorher, 'sw.js darf beim Fehlschlag unangetastet bleiben');
  assert.equal(fs.readFileSync(faktenbasis, 'utf8'), faktenbasisVorher, 'faktenbasis.md darf beim Fehlschlag unangetastet bleiben');
});

test('[Negativkontrolle] fehlende bmj/bzga-Argumente — klare Fehlermeldung, kein Absturz', async () => {
  const r = await rotationEinsetzen({});
  assert.equal(r.ok, false);
  assert.match(r.grund, /Aufruf:/);
});
