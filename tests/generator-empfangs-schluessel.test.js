'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   GEN2 — Das Empfangs-Schlüsselpaar der Anfrage: kein privater Schlüssel im Klartext in STATE, in keiner Datei
   ──────────────────────────────────────────────────────────────────────────
   GEMESSEN (19.09.2026): Der private Teil (ECDH P-256) öffnet später die Antworten. Der Generator öffnet nichts;
   der Teil hat hier genau einen Zweck — die Datei zum Herunterladen. Er lebt nur in der Sitzung: kein Browser-
   Speicher, nicht im Entwurf, nicht in der Anfrage. Er lag aber als Klartext-JWK in `STATE.anfrage`, und STATE
   ist von jedem Skript der Seite lesbar. Jetzt liegt er in `EMPFANGS_TRESOR` (Hülle) und wird verworfen, wenn die
   Institution die Sicherung bestätigt, beim Verlassen, nach dem Zeitlimit und wenn ein neues Paar entsteht.

   GEHALTEN WIRD, mit Rot-Beweis (dieselbe Messung gegen die echte Fassung — leer — und gegen verschlechterte):
     · in STATE und in keinem anderen Namen der obersten Ebene steht ein Objekt mit `kty` und `d` (die KLASSE, nicht
       nur dieser Schlüssel: jeder private JWK);
     · keine Datei, die der Generator schreibt (Entwurf, Anfrage, öffentlicher Teil), trägt ein `d`;
     · nur die beiden Erzeuger dürfen einen privaten Schlüssel als JWK herausholen — jeder dritte Ort ist ein Fund;
     · die Hülle wirft den Teil weg, wo sie es zusagt.
   ══════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const HUELLEN = ['SCHLUESSEL_TRESOR', 'EMPFANGS_TRESOR'];

/* Die Klasse: ein Objekt, das ein JWK ist (kty) UND einen privaten Anteil (d) trägt — an beliebiger Stelle des Graphen. */
function jwkMitD(wurzel) {
  const funde = []; const gesehen = new Set();
  (function geh(x, weg) {
    if (x === null || (typeof x !== 'object')) return;
    if (gesehen.has(x)) return; gesehen.add(x);
    if (typeof x.kty === 'string' && typeof x.d === 'string') funde.push(weg + ' ist ein JWK mit privatem Anteil');
    if (x.type === 'private' && x.algorithm) funde.push(weg + ' ist ein privater CryptoKey');
    for (const k of Object.getOwnPropertyNames(x)) { let v; try { v = x[k]; } catch (e) { continue; } geh(v, weg + '.' + k); }
  })(wurzel, 'wurzel');
  return funde;
}
function ausserhalbDerHuellen(V, sandbox) {
  const g = { STATE: V.STATE, exporte: Object.assign({}, V), globals: {} };
  for (const h of HUELLEN) delete g.exporte[h];
  for (const k of Object.getOwnPropertyNames(sandbox)) if (!['crypto', 'console', 'document', 'window', 'globalThis', '__GEN__', 'performance'].includes(k)) g.globals[k] = sandbox[k];
  return g;
}
/* Wer holt einen privaten Schlüssel als JWK heraus? Der Name der Funktion, in der `exportKey('jwk', … .privateKey)` steht. */
function privateExporteure(html) {
  const a = html.indexOf('<script>', html.indexOf('</script>')); const q = html.slice(a);
  const namen = [];
  const re = /exportKey\('jwk',\s*[A-Za-z_.]*privateKey\)/g; let m;
  while ((m = re.exec(q))) {
    const davor = q.slice(0, m.index);
    const f = [...davor.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g)].pop();
    namen.push(f ? f[1] : '(ohne Funktion)');
  }
  return namen;
}
/* Das Passwort der Schlüsseldatei in den Proben (frei erfunden, nur hier); über die beiden Felder der Seite. */
const PW = 'probe-passwort-empfang';
function passwortEintragen(document) { document.getElementById('anf-pw1').value = PW; document.getElementById('anf-pw2').value = PW; }
async function privatAusHuelle(V, text) { return V.entschluesseleSchluesselJwk(JSON.parse(text), PW); }
const ERLAUBTE_EXPORTEURE = ['erzeugeSchluesselpaarRoh', 'erzeugeEmpfangsSchluesselpaar'];

async function verletzungen(html) {
  const v = [];
  const { V, sandbox, windowStub, document } = ladeGenerator({ html });
  V.SCHLUESSEL_TRESOR.beimVerwerfen(() => {});
  /* über den echten Aufruf der Seite: das Paar der Anfrage entsteht, mit dem Passwort aus den beiden Feldern */
  passwortEintragen(document);
  await V.anfrageSchluesselErzeugen();
  if (document.getElementById('anf-pw1').value !== '' || document.getElementById('anf-pw2').value !== '') v.push('gen2-passwortfeld-nicht-geleert');
  await V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW });
  let huelle = ''; V.EMPFANGS_TRESOR.privatHerunterladen((t) => { huelle = t; });
  if (huelle && /"d"\s*:/.test(huelle)) v.push('gen2-download-traegt-klartext-d');
  let d = '';
  try { d = huelle ? (await privatAusHuelle(V, huelle)).d : ''; } catch (e) { v.push('gen2-huelle-oeffnet-nicht'); }
  if (!d) v.push('gen2-kein-privates-material-da');

  /* die Klasse: kein JWK mit d und kein privater CryptoKey außerhalb der Hüllen */
  if (jwkMitD(ausserhalbDerHuellen(V, sandbox)).length) v.push('gen2-jwk-mit-d-ausserhalb-der-huellen');
  if (Object.keys(V.STATE.anfrage).some((k) => /priv/i.test(k))) v.push('gen2-state-anfrage-hat-privatfeld');
  if (/empfangPrivateJwk/.test(html)) v.push('gen2-alter-name-lebt');
  /* die Dateien, die der Generator schreibt */
  const entwurf = JSON.stringify(V.entwurfBauen());
  const anfrage = JSON.stringify(V.baueAnfrage({ anfrage: Object.assign({}, V.STATE.anfrage, { antwortArt: 'schluesselpaar' }), anbieter: null }));
  const oeffentlich = JSON.stringify(V.STATE.anfrage.empfangPublicJwk);
  for (const [name, text] of [['entwurf', entwurf], ['anfrage', anfrage], ['oeffentlicher-teil', oeffentlich]]) {
    if (new RegExp('"d"\\s*:').test(text) || text.indexOf(d) >= 0) v.push('gen2-datei-traegt-privaten-anteil-' + name);
  }
  if (!JSON.parse(anfrage).antwort || !JSON.parse(anfrage).antwort.publicKeyJwk) v.push('gen2-anfrage-traegt-den-oeffentlichen-teil-nicht');
  /* nur die zwei Erzeuger holen einen privaten Schlüssel heraus */
  const fremd = privateExporteure(html).filter((n) => !ERLAUBTE_EXPORTEURE.includes(n));
  if (fremd.length) v.push('gen2-dritter-ort-holt-privaten-schluessel-heraus:' + fremd.join(','));

  /* die Hülle verwirft */
  const E = V.EMPFANGS_TRESOR;
  if (Object.keys(E).sort().join() !== ['beimVerwerfen', 'erzeugen', 'privatHerunterladen', 'verwerfen', 'vorhanden', 'zustand'].sort().join()) v.push('gen2-huelle-hat-neue-flaeche');
  E.verwerfen('bestaetigt');
  if (E.vorhanden() || E.privatHerunterladen(() => {}) !== false) v.push('gen2-bestaetigen-verwirft-nicht');
  await E.erzeugen({ passwort: PW }); await E.erzeugen({ passwort: PW });
  let ersetzt = 0; E.beimVerwerfen((g) => { if (g === 'ersetzt') ersetzt++; });
  await E.erzeugen({ passwort: PW });
  if (ersetzt !== 1) v.push('gen2-neues-paar-verwirft-das-alte-nicht');
  const reg = {}; windowStub.addEventListener = (a, f) => { reg[a] = f; };
  sandbox.__GEN__.gen1Binden();
  V.SCHLUESSEL_TRESOR.beimVerwerfen(() => {});
  E.beimVerwerfen(() => {});
  await E.erzeugen({ passwort: PW });
  if (typeof reg.pagehide !== 'function') v.push('gen2-kein-pagehide');
  else { reg.pagehide(); if (E.vorhanden()) v.push('gen2-verlassen-verwirft-nicht'); }
  let g = null; E.beimVerwerfen((x) => { g = x; });
  await E.erzeugen({ limitMs: 40, passwort: PW });
  await warte(140);
  if (E.vorhanden() || g !== 'zeitlimit') v.push('gen2-zeitlimit-verwirft-nicht');
  return v;
}

test('[Empfangs-Schlüssel] die echte Fassung hält: kein privates JWK in STATE, in keiner Datei, nur zwei Erzeuger, Hülle verwirft', async () => {
  assert.deepEqual(await verletzungen(HTML), []);
});

test('[Empfangs-Schlüssel·Klasse] der Sucher findet ein JWK mit d überall im Graphen — und nur dort', () => {
  assert.equal(jwkMitD({ STATE: { a: { b: { kty: 'EC', d: 'geheim', x: 'x' } } } }).length, 1);
  assert.equal(jwkMitD({ STATE: { a: { kty: 'EC', x: 'x', y: 'y' } } }).length, 0, 'ein öffentlicher JWK ist kein Fund');
  assert.equal(jwkMitD({ STATE: { d: 'kein jwk' } }).length, 0);
});

test('[Empfangs-Schlüssel·Klasse] der Bestand der Erzeuger: genau zwei Stellen holen einen privaten Schlüssel heraus', () => {
  assert.deepEqual(privateExporteure(HTML).sort(), ERLAUBTE_EXPORTEURE.slice().sort());
});

test('[Empfangs-Schlüssel·Rot-Beweis] ein Klartext-JWK in STATE, eine Datei mit d und ein dritter Exporteur werden gemeldet', async () => {
  const m1 = HTML.replace("        empfangKey = await crypto.subtle.importKey('jwk', r.privateJwk, ", "        STATE.anfrage.empfangPrivateJwk = r.privateJwk;\n        empfangKey = await crypto.subtle.importKey('jwk', r.privateJwk, ");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const f1 = await verletzungen(m1);
  assert.ok(f1.includes('gen2-jwk-mit-d-ausserhalb-der-huellen') && f1.includes('gen2-state-anfrage-hat-privatfeld') && f1.includes('gen2-alter-name-lebt'), f1.join());
  const m2 = HTML.replace("    anbieter: STATE.anbieter || null };\n}", "    anbieter: STATE.anbieter || null, schluessel: (STATE.anfrage.empfangPublicJwk ? Object.assign({ d: 'x' }, STATE.anfrage.empfangPublicJwk) : null) };\n}");
  assert.notEqual(m2, HTML);
  assert.ok((await verletzungen(m2)).some((x) => x.startsWith('gen2-datei-traegt-privaten-anteil-entwurf')));
  const m3 = HTML.replace("async function erzeugeEmpfangsSchluesselpaar() {", "async function heimlicherExport(paar) { return crypto.subtle.exportKey('jwk', paar.privateKey); }\nasync function erzeugeEmpfangsSchluesselpaar() {");
  assert.notEqual(m3, HTML);
  assert.ok((await verletzungen(m3)).some((x) => x.startsWith('gen2-dritter-ort-holt-privaten-schluessel-heraus:heimlicherExport')));
});

test('[Empfangs-Schlüssel·Rot-Beweis] ohne Verwerfen bei Bestätigung, beim Verlassen, nach dem Zeitlimit und beim neuen Paar wird es gemeldet', async () => {
  const m1 = HTML.replace("    if (uhr) { clearTimeout(uhr); uhr = null; }\n    if (hatteEtwas && melder) melder(grund || 'manuell');\n    return hatteEtwas;\n  }\n  return Object.freeze({\n    /* Neues Paar, mit dem Passwort der Schlüsseldatei.", "    if (uhr) { clearTimeout(uhr); uhr = null; }\n    return hatteEtwas;\n  }\n  return Object.freeze({\n    /* Neues Paar, mit dem Passwort der Schlüsseldatei.");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const f1 = await verletzungen(m1);
  assert.ok(f1.includes('gen2-neues-paar-verwirft-das-alte-nicht'), f1.join());
  const m2 = HTML.replace("EMPFANGS_TRESOR.verwerfen('verlassen'); });", '});');
  assert.notEqual(m2, HTML);
  assert.ok((await verletzungen(m2)).includes('gen2-verlassen-verwirft-nicht'));
  const m3 = HTML.replace("        uhr = setTimeout(() => verwerfen('zeitlimit'), limitMs);\n        if (uhr && typeof uhr.unref === 'function') uhr.unref();\n        return { publicJwk: r.publicJwk };", "        return { publicJwk: r.publicJwk };");
  assert.notEqual(m3, HTML);
  assert.ok((await verletzungen(m3)).includes('gen2-zeitlimit-verwirft-nicht'));
});

test('[Empfangs-Schlüssel] der Rückweg trägt: der öffentliche Teil steht in der Anfrage, mit dem privaten Teil aus der Hülle entschlüsselt sich, was daran verschlüsselt wurde', async () => {
  const { V, document } = ladeGenerator();
  passwortEintragen(document);
  await V.anfrageSchluesselErzeugen();
  let text = ''; V.EMPFANGS_TRESOR.privatHerunterladen((t) => { text = t; });
  const priv = await crypto.subtle.importKey('jwk', await privatAusHuelle(V, text), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pub = await crypto.subtle.importKey('jwk', V.STATE.anfrage.empfangPublicJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const a = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, eph.privateKey, 256));
  const b = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: eph.publicKey }, priv, 256));
  assert.equal(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
});
