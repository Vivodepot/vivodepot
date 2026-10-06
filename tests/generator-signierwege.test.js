'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   GEN2b — Alle Signierwege des Generators laufen über den Schlüssel-Tresor
   ──────────────────────────────────────────────────────────────────────────
   Vorher lasen die Modul-Ausgabearten (Anfrage, Angebots-Antwort, Institutions-Art, Bereich, Rechtsraum, Format,
   Erscheinungsbild) den Signaturschlüssel jede für sich aus der Schlüsseldatei — am Tresor vorbei, ohne seine
   Regeln. Jetzt lädt EIN Weg die Datei (in den Tresor), und jeder Signierweg der Oberfläche signiert über
   `signiereMitTresor`/`signiereEinmal`: einmal, nur auf einen echten Klick, verworfen danach.

   BEWIESEN wird an der Quelle, was am Verhalten nicht zu messen ist — dass es keinen dritten Weg gibt:
     · das Feld der Schlüsseldatei wird nur in `schluesselDateiGewaehlt` gelesen, und nur dort in den Tresor;
     · keine Datei wird sonst als Schlüssel gelesen (`datei.text()`);
     · jeder Aufruf eines `bau…Signiert` aus der Oberfläche steht in `signiereMitTresor`/`signiereEinmal`;
     · nur die Tresor-Hülle, ihre Hilfen und die eine ungebundene Treuhand-Funktion importieren einen Schlüssel zum Signieren;
     · jeder Signier-Handler der Oberfläche ruft den Tresor.
   Und am Verhalten: die Ausgabearten signieren mit dem Tresor-Schlüssel, jede erlaubte Taste, keine andere; ein
   unechter Klick fällt nicht auf „unsigniert“ zurück.
   ROT-BEWEIS: jede dieser Messungen läuft gegen eine absichtlich verschlechterte Fassung und muss anschlagen.
   ══════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const klick = (id) => ({ isTrusted: true, currentTarget: { id }, timeStamp: performance.now() });
const KNOEPFE = ['pr-submit', 'anf-erzeugen', 'vb-annehmen', 'vb-ablehnen', 'ia-erzeugen', 'bm-erzeugen', 'rr-erzeugen', 'fm-erzeugen', 'bd-erzeugen', 'ab-erzeugen', 'wm-erzeugen', 'lm-erzeugen', 'ts-erzeugen'];
const SIGNIER_HANDLER = ['submissionErzeugen', 'anfrageErzeugen', 'institutionsArtErzeugen', 'bereichErzeugen', 'rechtsraumErzeugen', 'formatErzeugen', 'brandingErzeugen', 'vereinbarungBeantworten', 'blattErzeugen', 'wizardErzeugen', 'logikmodulErzeugen', 'sprachmodulErzeugen'];
const IMPORTEURE = ['_jwsImportSignKey', '_signSchluessel', 'halteAusJwk', 'templateJwsErzeugen', 'basistemplateTreuhandSignieren'];

/* Die eine Stelle, die die Schlüsseldatei liest (Laden und Neu-Speichern gehen beide über sie). */
const DATEI_LESER = '_schluesselDateiLesen';
/* Das Passwort der Schlüsseldatei in den Proben (frei erfunden, nur hier). */
const PW = 'probe-passwort-signierwege';
function skript(html) { const a = html.indexOf('<script>', html.indexOf('</script>')); return html.slice(a); }
function funktionVor(q, index) {
  const f = [...q.slice(0, index).matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g)].pop();
  return f ? f[1] : '(ohne Funktion)';
}
function rumpf(q, name) {
  const a = q.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (a < 0) return '';
  const e = q.indexOf('\n}\n', a);
  return q.slice(a, e < 0 ? undefined : e);
}

/* Die Messung: welche Signierwege gehen am Tresor vorbei? */
function signierwegFunde(html) {
  const q = skript(html); const f = [];
  for (const m of q.matchAll(/\$\('pr-privkey'\)/g)) { const fn = funktionVor(q, m.index); if (fn !== DATEI_LESER) f.push('schluesselfeld-gelesen-in:' + fn); }
  for (const m of q.matchAll(/\bdatei\.text\(\)/g)) { const fn = funktionVor(q, m.index); if (fn !== DATEI_LESER) f.push('datei-als-schluessel-gelesen-in:' + fn); }
  for (const m of q.matchAll(/await (baue\w+Signiert)\(/g)) {
    const zeile = q.slice(q.lastIndexOf('\n', m.index) + 1, q.indexOf('\n', m.index));
    if (!/signiereMitTresor\(|signiereEinmal\(/.test(zeile)) f.push('signierer-am-tresor-vorbei:' + m[1] + ' in ' + funktionVor(q, m.index));
  }
  for (const m of q.matchAll(/(?<!function )_jwsImportSignKey\(/g)) {
    const fn = funktionVor(q, m.index);
    if (!IMPORTEURE.includes(fn)) f.push('schluessel-import-ausserhalb:' + fn);
  }
  for (const h of SIGNIER_HANDLER) if (!/signiereMitTresor\(|signiereEinmal\(/.test(rumpf(q, h))) f.push('handler-ohne-tresor:' + h);
  return f;
}

test('[Signierwege] kein Signierweg der Oberfläche liest am Tresor vorbei', () => {
  assert.deepEqual(signierwegFunde(HTML), []);
});

test('[Signierwege·Rot-Beweis] ein gelesenes Schlüsselfeld, ein Signierer am Tresor vorbei, ein neuer Import und ein Handler ohne Tresor werden gemeldet', () => {
  const m1 = HTML.replace('async function bereichErzeugen(ev) {', "async function bereichErzeugen(ev) {\n  const heimlich = $('pr-privkey') && $('pr-privkey').files[0];");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  assert.ok(signierwegFunde(m1).includes('schluesselfeld-gelesen-in:bereichErzeugen'));
  const m2 = HTML.replace('umschlag = await signiereMitTresor(ev, (k) => baueRechtsraumSigniert(state, k), () => baueRechtsraumSigniert(state, null));', 'umschlag = await baueRechtsraumSigniert(state, privJwk);');
  assert.notEqual(m2, HTML);
  const f2 = signierwegFunde(m2);
  assert.ok(f2.includes('signierer-am-tresor-vorbei:baueRechtsraumSigniert in rechtsraumErzeugen') && f2.includes('handler-ohne-tresor:rechtsraumErzeugen'), f2.join());
  const m3 = HTML.replace('async function _signSchluessel(x) {', "async function heimlichSignieren(jwk) { return _jwsImportSignKey(jwk); }\nasync function _signSchluessel(x) {");
  assert.notEqual(m3, HTML);
  assert.ok(signierwegFunde(m3).includes('schluessel-import-ausserhalb:heimlichSignieren'));
  const m4 = HTML.replace('    const r = await SCHLUESSEL_TRESOR.ausDatei(inhalt, passwort);', '    const r = await SCHLUESSEL_TRESOR.ausDatei(inhalt, passwort);');
  const m5 = HTML.replace('async function formatErzeugen(ev) {', "async function formatErzeugen(ev) {\n  const z = await ev.target.files[0].text(); const datei = { text: async () => z }; await datei.text();");
  assert.notEqual(m5, HTML);
  assert.ok(signierwegFunde(m5).some((x) => x.startsWith('datei-als-schluessel-gelesen-in:formatErzeugen')));
  assert.equal(m4, HTML);   // (Kontrolle: der erlaubte Weg selbst ist unverändert und bleibt ohne Fund)
  assert.ok(HTML.includes('    const r = await SCHLUESSEL_TRESOR.ausDatei(inhalt, passwort);'), 'der erlaubte Weg steht im Studio');
});

test('[Signierwege] jede Modul-Ausgabeart signiert mit dem Tresor-Schlüssel — auf ihren Knopf, auf keinen anderen', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  const paar = await V.erzeugeSchluesselpaarRoh();
  const datei = await V.schuetzeSchluesselJwk(paar.privateJwk, PW);
  for (const id of KNOEPFE) {
    await T.ausDatei(datei, PW);
    const gesehen = await V.signiereMitTresor(klick(id), async (k) => { assert.equal(V._istSignierSchluessel(k), true); return 'signiert'; }, async () => 'unsigniert');
    assert.equal(gesehen, 'signiert', id);
    assert.equal(T.vorhanden(), false, id + ': einmal, dann fort');
  }
  await T.ausDatei(datei, PW);
  await assert.rejects(() => V.signiereMitTresor(klick('anderer-knopf'), async () => 'signiert', async () => 'unsigniert'));
  assert.equal(T.vorhanden(), true, 'eine Abweisung verbraucht nicht');
  T.verwerfen('manuell');
});

test('[Signierwege] ein unechter Klick fällt bei vorhandenem Schlüssel NICHT auf „unsigniert“ zurück; ohne Schlüssel gilt der unsignierte Weg', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  await T.erzeugen({ passwort: PW });
  let unsigniert = false;
  await assert.rejects(() => V.signiereMitTresor(Object.assign(klick('bm-erzeugen'), { isTrusted: false }), async () => 'signiert', async () => { unsigniert = true; return 'u'; }));
  assert.equal(unsigniert, false);
  T.verwerfen('manuell');
  assert.equal(await V.signiereMitTresor(klick('bm-erzeugen'), async () => 'signiert', async () => 'unsigniert'), 'unsigniert');
});

test('[Signierwege] die Bündel-Bauer signieren mit dem Tresor-Schlüssel, und die Signatur verifiziert', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  const paar = await V.erzeugeSchluesselpaarRoh();
  await T.ausDatei(await V.schuetzeSchluesselJwk(paar.privateJwk, PW), PW);
  const state = { publicKeyJwk: paar.publicJwk, institutionsArt: { moduleVersion: 1, sprache: 'de', herkunft: 'x', arten: [{ kennung: 'notaire', label: 'Notariat' }] } };
  const umschlag = await V.signiereMitTresor(klick('ia-erzeugen'), (k) => V.baueInstitutionsArtSigniert(state, k), () => V.baueInstitutionsArtSigniert(state, null));
  assert.ok(umschlag.modulSignaturJws, 'eine Signatur entsteht');
  const pruef = await V._verifyJWS(umschlag.modulSignaturJws, await V._jwsImportVerifyKey(paar.publicJwk), {});
  assert.equal(pruef.gueltig, true);
  assert.equal(T.vorhanden(), false);
});
