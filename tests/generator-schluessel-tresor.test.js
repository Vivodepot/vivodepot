'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   GEN1 — Der Schlüssel-Tresor des Template-Generators: die Zusicherungen (a) bis (c) und ihr Rot-Beweis
   ──────────────────────────────────────────────────────────────────────────
   Der private Signaturschlüssel bleibt nach dem Umbau bis zum Signieren im Speicher. Gehalten wird:

     (a) was dauerhaft im Speicher liegt, ist ein CryptoKey mit extractable:false; dazu nur die VERSCHLÜSSELTE
         Schlüsseldatei (.vdkey) bis „beide Dateien gesichert, weiter“ — ein Klartext-JWK hält niemand;
     (b) kein Name der obersten Ebene und nichts in STATE trägt den Schlüssel oder sein Material; die
         Hülle gibt keinen Schlüssel heraus; und sie signiert nur auf einen echten frischen Klick am
         Knopf „Paket erzeugen“ (extractable:false schützt die Bytes, nicht die Nutzung);
     (c) verworfen wird nach dem Signieren (einmal, gleich wie es ausgeht), beim Verlassen (pagehide)
         und nach dem Zeitlimit.

   ROT-BEWEIS JE ZUSICHERUNG: dieselbe Messung (`verletzungen`) läuft gegen die echte Fassung — leer — und
   gegen je eine absichtlich verschlechterte; jede muss ihre Kennung melden. Eine Probe, die auch an
   der verschlechterten Fassung grün bliebe, wäre eine Zusage.
   ══════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
/* Das Passwort der Schlüsseldatei in den Proben (frei erfunden, nur hier). */
const PW = 'probe-passwort-tresor';
const klick = (extra) => Object.assign({ isTrusted: true, currentTarget: { id: 'pr-submit' }, timeStamp: performance.now() }, extra || {});

/* Sucht in einem Objektgraphen nach dem Material eines Schlüssels: dem Wert `d` (privater Anteil), einem
   CryptoKey (Art „private“) oder einem Objekt, das `d` und `x` trägt. */
function findeSchluessel(wurzel, dWert) {
  const funde = []; const gesehen = new Set();
  (function geh(x, weg) {
    if (x === null || (typeof x !== 'object' && typeof x !== 'function')) {
      if (typeof x === 'string' && dWert && x.indexOf(dWert) >= 0) funde.push(weg + ' trägt den privaten Anteil');
      return;
    }
    if (gesehen.has(x)) return; gesehen.add(x);
    if (typeof x === 'function') return;
    if (x.type === 'private' && x.algorithm) funde.push(weg + ' ist ein privater CryptoKey');
    if (typeof x.d === 'string' && x.d === dWert) funde.push(weg + ' trägt ein Material mit d');
    for (const k of Object.getOwnPropertyNames(x)) { let v; try { v = x[k]; } catch (e) { continue; } geh(v, weg + '.' + k); }
  })(wurzel, 'wurzel');
  return funde;
}

/* Die Messung. Liefert die Kennungen der verletzten Zusicherungen. */
async function verletzungen(html) {
  const v = [];
  const { V, sandbox, windowStub } = ladeGenerator({ html });
  const T = V.SCHLUESSEL_TRESOR;

  /* (a) extractable:false, Material nur bis „weiter“ */
  await T.erzeugen({ passwort: PW });
  const z = T.zustand();
  if (z.extractable !== false || z.algorithmus !== 'Ed25519' || z.nutzung.join() !== 'sign') v.push('a-schluessel-ist-herausholbar');
  if (z.huelleDa !== true) v.push('a-material-fehlt-vor-dem-download');
  let jwkText = '';
  T.privatHerunterladen((t) => { jwkText = t; });
  const datei = jwkText ? JSON.parse(jwkText) : {};
  if (!V.istGeschuetzteSchluesseldatei(datei) || typeof datei.d !== 'undefined') v.push('a-download-ist-nicht-verschluesselt');
  const jwk = V.istGeschuetzteSchluesseldatei(datei) ? await V.entschluesseleSchluesselJwk(datei, PW) : datei;
  T.huelleVerwerfen();
  if (T.zustand().huelleDa !== false || T.privatHerunterladen(() => {}) !== false) v.push('a-material-bleibt-nach-weiter');
  if (!T.zustand().vorhanden) v.push('a-schluessel-fehlt-nach-weiter');

  /* (b) kein Griff von außen */
  const alsGraph = { STATE: V.STATE, globals: {} };
  for (const k of Object.getOwnPropertyNames(sandbox)) if (!['crypto', 'console', 'document', 'window', 'globalThis', '__GEN__', 'performance'].includes(k)) alsGraph.globals[k] = sandbox[k];
  alsGraph.exporte = Object.assign({}, V); delete alsGraph.exporte.SCHLUESSEL_TRESOR;
  if (findeSchluessel(alsGraph, jwk.d).length) v.push('b-material-erreichbar-ausserhalb-der-huelle');
  if (findeSchluessel({ zustand: T.zustand(), vorhanden: T.vorhanden() }, jwk.d).length) v.push('b-huelle-gibt-schluessel-heraus');
  if (Object.keys(T).sort().join() !== ['ausDatei', 'beimVerwerfen', 'erzeugen', 'privatHerunterladen', 'huelleVerwerfen', 'signiereEinmal', 'verwerfen', 'vorhanden', 'zustand'].sort().join()) v.push('b-huelle-hat-neue-flaeche');
  if (!Object.isFrozen(T)) v.push('b-huelle-nicht-eingefroren');
  if (/STATE\.(privateJwk|cryptoKeyPair)\s*=/.test(html)) v.push('b-state-bekommt-privates-material');

  /* (b) nur ein echter frischer Klick am Knopf signiert */
  const abweisungen = [
    ['b-unechter-klick-signiert', klick({ isTrusted: false })],
    ['b-falscher-knopf-signiert', klick({ currentTarget: { id: 'irgendwas' } })],
    ['b-alter-klick-signiert', klick({ timeStamp: performance.now() - 5000 })],
  ];
  for (const [kennung, ev] of abweisungen) {
    let lief = false;
    try { await T.signiereEinmal(ev, async () => { lief = true; }); } catch (e) { /* abgewiesen: richtig */ }
    if (lief) v.push(kennung);
    if (!T.zustand().vorhanden && !lief) v.push('b-abweisung-verbraucht-den-schluessel');
    if (!T.zustand().vorhanden) await T.erzeugen({ passwort: PW });
  }

  /* (c) nach dem Signieren, gleich wie es ausgeht */
  await T.erzeugen({ passwort: PW });
  let signiert = false;
  await T.signiereEinmal(klick(), async (k) => { signiert = !!k; });
  if (!signiert) v.push('c-signieren-lief-nicht');
  if (T.zustand().vorhanden) v.push('c-nach-dem-signieren-nicht-verworfen');
  await T.erzeugen({ passwort: PW });
  try { await T.signiereEinmal(klick(), async () => { throw new Error('Fehlschlag'); }); } catch (e) { /* erwartet */ }
  if (T.zustand().vorhanden) v.push('c-nach-fehlgeschlagenem-signieren-nicht-verworfen');

  /* (c) beim Verlassen */
  const registriert = {};
  windowStub.addEventListener = (art, fn) => { registriert[art] = fn; };
  sandbox.__GEN__.gen1Binden();
  T.beimVerwerfen(() => {});   // die Anzeige-Rückmeldung der Seite läuft im DOM-Stub nicht (dessen leeren() hat kein Ende); gemessen wird das Verwerfen
  await T.erzeugen({ passwort: PW });
  if (typeof registriert.pagehide !== 'function') v.push('c-kein-pagehide');
  else { registriert.pagehide(); if (T.zustand().vorhanden) v.push('c-beim-verlassen-nicht-verworfen'); }

  /* (c) nach dem Zeitlimit: die Konstante, und das Verhalten an einem kurzen Limit */
  if (!(V.SCHLUESSEL_LIMIT_MS > 0 && V.SCHLUESSEL_LIMIT_MS <= 30 * 60 * 1000)) v.push('c-zeitlimit-fehlt-oder-zu-lang');
  await T.erzeugen({ passwort: PW });
  if (T.zustand().limitMs !== V.SCHLUESSEL_LIMIT_MS) v.push('c-standardlimit-nicht-gesetzt');
  let gemeldet = null;
  T.beimVerwerfen((g) => { gemeldet = g; });
  await T.erzeugen({ limitMs: 40, passwort: PW });
  await warte(140);
  if (T.zustand().vorhanden) v.push('c-zeitlimit-verwirft-nicht');
  if (gemeldet !== 'zeitlimit') v.push('c-zeitlimit-meldet-nicht');
  return v;
}

test('[Schlüssel-Tresor] die echte Fassung hält (a), (b) und (c)', async () => {
  assert.deepEqual(await verletzungen(HTML), []);
});

test('[Schlüssel-Tresor·a] der gehaltene Schlüssel ist nicht herausholbar, das Material nur bis „weiter“', async () => {
  const { V } = ladeGenerator();
  await V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW });
  const z = V.SCHLUESSEL_TRESOR.zustand();
  assert.equal(z.extractable, false);
  assert.equal(z.algorithmus, 'Ed25519');
  assert.equal(z.huelleDa, true);
  V.SCHLUESSEL_TRESOR.huelleVerwerfen();
  assert.equal(V.SCHLUESSEL_TRESOR.zustand().huelleDa, false);
  assert.equal(V.SCHLUESSEL_TRESOR.zustand().vorhanden, true);
});

test('[Schlüssel-Tresor·a] ein Schlüssel aus einer Datei wird sofort als nicht herausholbarer importiert', async () => {
  const { V } = ladeGenerator();
  const r = await V.erzeugeSchluesselpaarRoh();
  const datei = await V.schuetzeSchluesselJwk(r.privateJwk, PW);
  const erg = await V.SCHLUESSEL_TRESOR.ausDatei(datei, PW);
  assert.equal(erg.publicJwk.x, r.publicJwk.x);
  const z = V.SCHLUESSEL_TRESOR.zustand();
  assert.equal(z.extractable, false);
  assert.equal(z.huelleDa, false);   // aus der Datei kommt keine Hülle in den Tresor
  await assert.rejects(() => V.SCHLUESSEL_TRESOR.ausDatei({ kty: 'OKP', x: 'abc' }, PW));   // ohne privaten Anteil: kein Schlüssel
  await assert.rejects(() => V.SCHLUESSEL_TRESOR.ausDatei(datei, 'falsches-passwort'));   // falsches Passwort: nichts geladen
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), false);
  await assert.rejects(() => V.SCHLUESSEL_TRESOR.ausDatei(r.privateJwk, PW), /klartext/);   // Klartext wird nicht still übernommen
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), false);
});

test('[Schlüssel-Tresor·a·Rot-Beweis] ein herausholbarer Schlüssel und ein Material, das nach „weiter“ bleibt, werden gemeldet', async () => {
  const m1 = HTML.replace('signKey = await _jwsImportSignKey(jwk);', "signKey = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, true, ['sign']);");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  assert.ok((await verletzungen(m1)).includes('a-schluessel-ist-herausholbar'));
  const m2 = HTML.replace('huelleVerwerfen() { const war = !!huelleText; huelleText = null; return war; }', 'huelleVerwerfen() { return !!huelleText; }');
  assert.notEqual(m2, HTML);
  assert.ok((await verletzungen(m2)).includes('a-material-bleibt-nach-weiter'));
});

test('[Schlüssel-Tresor·b] nichts außerhalb der Hülle trägt den Schlüssel oder sein Material', async () => {
  const { V, sandbox } = ladeGenerator();
  await V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW });
  let text = ''; V.SCHLUESSEL_TRESOR.privatHerunterladen((t) => { text = t; });
  assert.equal(JSON.parse(text).d, undefined, 'die Datei trägt kein Klartext-d');
  const d = (await V.entschluesseleSchluesselJwk(JSON.parse(text), PW)).d;
  assert.ok(d && d.length > 20, 'Vorbedingung: ein echtes Material');
  const graph = { STATE: V.STATE, exporte: Object.assign({}, V) }; delete graph.exporte.SCHLUESSEL_TRESOR;
  for (const k of Object.getOwnPropertyNames(sandbox)) if (!['crypto', 'console', 'document', 'window', 'globalThis', '__GEN__', 'performance'].includes(k)) graph[k] = sandbox[k];
  assert.deepEqual(findeSchluessel(graph, d), []);
  assert.equal(typeof V.STATE.privateJwk, 'undefined');
  assert.equal(typeof V.STATE.cryptoKeyPair, 'undefined');
  // Positivkontrolle: der Sucher findet Material, wenn es dort läge
  assert.ok(findeSchluessel({ STATE: { privateJwk: { d, x: 'x' } } }, d).length > 0);
});

test('[Schlüssel-Tresor·b] die Hülle signiert nur auf einen echten frischen Klick am Knopf „Paket erzeugen“', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  await T.erzeugen({ passwort: PW });
  for (const ev of [null, klick({ isTrusted: false }), klick({ currentTarget: { id: 'x' } }), klick({ timeStamp: performance.now() - 5000 })]) {
    await assert.rejects(() => T.signiereEinmal(ev, async () => 'signiert'));
    assert.equal(T.vorhanden(), true, 'eine Abweisung verbraucht den Schlüssel nicht');
  }
  assert.equal(await T.signiereEinmal(klick(), async () => 'signiert'), 'signiert');
  assert.equal(T.vorhanden(), false);
  await assert.rejects(() => T.signiereEinmal(klick(), async () => 'nochmal'), /Kein Schlüssel/);
});

test('[Schlüssel-Tresor·b·Rot-Beweis] ein Griff in STATE, eine herausgegebene Fläche und ein unechter Klick werden gemeldet', async () => {
  const m1 = HTML.replace("        await halteAusJwk(r.privateJwk);\n", "        await halteAusJwk(r.privateJwk); STATE.privateJwk = r.privateJwk;\n");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const f1 = await verletzungen(m1);
  assert.ok(f1.includes('b-material-erreichbar-ausserhalb-der-huelle') && f1.includes('b-state-bekommt-privates-material'), f1.join());
  const m2 = HTML.replace("    vorhanden() { return !!signKey; },", "    vorhanden() { return !!signKey; },\n    schluessel() { return signKey; },");
  assert.notEqual(m2, HTML);
  assert.ok((await verletzungen(m2)).includes('b-huelle-hat-neue-flaeche'));
  const m3 = HTML.replace('ereignis.isTrusted !== true', 'false');
  assert.notEqual(m3, HTML);
  assert.ok((await verletzungen(m3)).includes('b-unechter-klick-signiert'));
  const m4 = HTML.replace('SCHLUESSEL_ERLAUBTE_KNOEPFE.indexOf(ziel.id) < 0', 'false');
  assert.notEqual(m4, HTML);
  assert.ok((await verletzungen(m4)).includes('b-falscher-knopf-signiert'));
  const m5 = HTML.replace('jetzt - ereignis.timeStamp > SCHLUESSEL_KLICK_FRIST_MS', 'false');
  assert.notEqual(m5, HTML);
  assert.ok((await verletzungen(m5)).includes('b-alter-klick-signiert'));
});

test('[Schlüssel-Tresor·c] der Schlüssel ist nach dem Signieren fort, gleich wie es ausgeht', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  await T.erzeugen({ passwort: PW }); await T.signiereEinmal(klick(), async () => 1);
  assert.equal(T.vorhanden(), false);
  await T.erzeugen({ passwort: PW });
  await assert.rejects(() => T.signiereEinmal(klick(), async () => { throw new Error('x'); }));
  assert.equal(T.vorhanden(), false);
});

test('[Schlüssel-Tresor·c] beim Verlassen der Seite (pagehide) wird der Schlüssel verworfen', async () => {
  const { V, windowStub, sandbox } = ladeGenerator();
  const reg = {}; windowStub.addEventListener = (a, f) => { reg[a] = f; };
  sandbox.__GEN__.gen1Binden();
  V.SCHLUESSEL_TRESOR.beimVerwerfen(() => {});   // wie oben: die Anzeige-Rückmeldung läuft im DOM-Stub nicht
  await V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW });
  assert.equal(typeof reg.pagehide, 'function');
  reg.pagehide();
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), false);
});

test('[Schlüssel-Tresor·c] nach dem Zeitlimit wird der Schlüssel verworfen und gemeldet', async () => {
  const { V } = ladeGenerator();
  assert.ok(V.SCHLUESSEL_LIMIT_MS > 0 && V.SCHLUESSEL_LIMIT_MS <= 30 * 60 * 1000, 'das Standardlimit steht und ist kurz');
  const T = V.SCHLUESSEL_TRESOR;
  let g = null; T.beimVerwerfen((x) => { g = x; });
  await T.erzeugen({ limitMs: 40, passwort: PW });
  assert.equal(T.zustand().limitMs, 40);
  await warte(140);
  assert.equal(T.vorhanden(), false);
  assert.equal(g, 'zeitlimit');
  await T.erzeugen({ passwort: PW });
  assert.equal(T.zustand().limitMs, V.SCHLUESSEL_LIMIT_MS);
  T.verwerfen('manuell');
});

test('[Schlüssel-Tresor·c·Rot-Beweis] ohne Verwerfen nach dem Signieren, ohne pagehide, ohne Zeitlimit wird es gemeldet', async () => {
  const m1 = HTML.replace("      verwerfen('signiert');   // verbraucht", "      // verwerfen('signiert');   // verbraucht");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const f1 = await verletzungen(m1);
  assert.ok(f1.includes('c-nach-dem-signieren-nicht-verworfen') && f1.includes('c-nach-fehlgeschlagenem-signieren-nicht-verworfen'), f1.join());
  const m2 = HTML.replace("window.addEventListener('pagehide', () => { SCHLUESSEL_TRESOR.verwerfen('verlassen'); EMPFANGS_TRESOR.verwerfen('verlassen'); });", '');
  assert.notEqual(m2, HTML);
  assert.ok((await verletzungen(m2)).includes('c-kein-pagehide'));
  const m3 = HTML.replace("    uhr = setTimeout(() => verwerfen('zeitlimit'), limitMs);\n", '');
  assert.notEqual(m3, HTML);
  assert.ok((await verletzungen(m3)).includes('c-zeitlimit-verwirft-nicht'));
  const m4 = HTML.replace('const SCHLUESSEL_LIMIT_MS = 15 * 60 * 1000;', 'const SCHLUESSEL_LIMIT_MS = 24 * 60 * 60 * 1000;');
  assert.notEqual(m4, HTML);
  assert.ok((await verletzungen(m4)).includes('c-zeitlimit-fehlt-oder-zu-lang'));
});

test('[Schlüssel-Tresor] ein mit dem gehaltenen Schlüssel signiertes Paket verifiziert gegen den Public-Key (der Weg trägt)', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  const r = await T.erzeugen({ passwort: PW });
  const stamm = { anbieter: V.baueAnbieter({ anbieterName: 'Testheim e.V.', rechtsform: 'e.V.', strasse: 'Weg 1', plz: '10115', ort: 'Berlin', land: 'Deutschland',
    kontaktName: 'A B', kontaktFunktion: 'Leitung', kontaktEmail: 'a@b.example.de', kontaktTelefon: '030123', bereich: 'identity', useCase: 'x'.repeat(60) }),
  publicKeyJwk: r.publicJwk, felder: [{ feldname: 'Vorname', feldtyp: 'text', pflicht: true, bereich: 'identity', provenienzPflichtig: true }] };
  const paket = await T.signiereEinmal(klick(), (k) => V.baueSammelSubmissionSigniert([stamm], stamm, k));
  assert.equal(paket.templatesJws.length, 1);
  assert.equal(V.validiereSubmission(paket).length, 0);
});
