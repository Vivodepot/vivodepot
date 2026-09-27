'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klassenwache Modul-Schemas (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Jeder Modultyp, den der Kern kennt — jeder EINLASS_REGISTER-Eintrag und jede
   `function …ModulPruefen(` (tools/modul-schemas-messen.js, `modulTypen`) —, hat
     1. ein öffentliches Schema   docs/<typ>-modul/<typ>-modul-schema.json,
     2. eine Gleichlauf-Probe     tests/mit-modul/modul-schema-<typ>.test.js, die gleichlaufProben({ typ }) ruft,
     3. einen Eintrag unter `oeffentlich` in tools/lib/oeffentliche-positivliste.json.
   Ein neuer Modultyp ohne diese drei fällt hier.

   Und: ajv ist Prüfwerkzeug, nie Produkt. Kern und Lese-App laden es nicht. Gesucht wird das Wort
   `ajv` außerhalb von Base64 — die eingebetteten Schriften tragen die Buchstabenfolge zufällig.
   ════════════════════════════════════════════════════════════════════════ */
// nur-privat: der Positivlisten-Teil liest tools/lib/oeffentliche-positivliste.json, die drinnen bleibt (sie nennt die
// zurückgehaltenen Dateien mit Grund). Öffentlich laufen Schema, Gleichlauf-Probe und ajv-Freiheit — das Versprechen an Dritte.
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../tools/modul-schemas-messen.js');

const WURZEL = path.join(__dirname, '..');
const lies = (rel) => fs.readFileSync(path.join(WURZEL, rel), 'utf8');
const da = (rel) => fs.existsSync(path.join(WURZEL, rel));

// positivliste = null: nur Schema und Probe (öffentlich); sonst zusätzlich der Positivlisten-Eintrag (privat).
function befunde(kern, positivliste, dateiDa, dateiLesen) {
  const aus = [];
  for (const t of M.modulTypen(kern)) {
    if (!dateiDa(t.schema)) aus.push(`${t.typ}: Schema fehlt (${t.schema})`);
    if (!dateiDa(t.probe)) aus.push(`${t.typ}: Probe fehlt (${t.probe})`);
    else if (!new RegExp("gleichlaufProben\\(\\{\\s*typ: '" + t.typ + "'").test(dateiLesen(t.probe))) {
      aus.push(`${t.typ}: ${t.probe} ruft gleichlaufProben({ typ: '${t.typ}' }) nicht`);
    }
    if (positivliste && !Object.prototype.hasOwnProperty.call(positivliste.docs.oeffentlich, t.schema)) aus.push(`${t.typ}: ${t.schema} nicht in der Positivliste`);
  }
  return aus;
}
const AJV = /(^|[^A-Za-z0-9+/])ajv(?![A-Za-z0-9+/=])/i;
function ajvFunde(dateien) {
  return dateien.filter(([, text]) => AJV.test(text)).map(([name]) => name + ' lädt oder nennt ajv');
}

const KERN = lies('vivodepot.html');
const positivliste = () => JSON.parse(lies('tools/lib/oeffentliche-positivliste.json'));   // zuschnitt-privat: nur im nur-privat-Test gelesen

test('[Modul-Schemas·Klasse] jeder Modultyp hat Schema und Gleichlauf-Probe', () => {
  const typen = M.modulTypen(KERN);
  assert.ok(typen.length >= 16, 'Vorbedingung: die Messung findet die Modultypen');
  assert.ok(typen.some((t) => !t.register), 'Vorbedingung: auch ein Prüfer ohne Register wird gefunden');
  assert.deepEqual(befunde(KERN, null, da, lies), []);
});

test('[Modul-Schemas·Klasse·Positivliste] jedes Modul-Schema steht auf der Positivliste des Zuschnitts', () => {
  assert.deepEqual(befunde(KERN, positivliste(), da, lies), []);
});

test('[Modul-Schemas·Klasse·Rot-Beweis] ein neuer Registertyp und ein neuer Prüfer ohne Schema fallen', () => {
  const neu = KERN.replace('const EINLASS_REGISTER = Object.freeze([',
    "const EINLASS_REGISTER = Object.freeze([\n  Object.freeze({ typ: 'zzNeu', slot: 'zzNeuModule', pruefen: (m) => zzNeuModulPruefen(m), kennung: (m) => null }),")
    + '\nfunction zzOhneRegisterModulPruefen(modul) { return { gueltig: false, grund: \'x\' }; }\n';
  const f = befunde(neu, null, da, lies);
  assert.ok(f.some((x) => x.startsWith('zzNeu: Schema fehlt')), 'Registertyp ohne Schema schlägt nicht an');
  assert.ok(f.some((x) => x.startsWith('zzOhneRegister: Schema fehlt')), 'Prüfer ohne Register schlägt nicht an');
  const ohneListe = { docs: { oeffentlich: {} } };
  assert.ok(befunde(KERN, ohneListe, da, lies).some((x) => x.includes('nicht in der Positivliste')), 'fehlender Positivlisten-Eintrag schlägt nicht an');
});

test('[Modul-Schemas·Klasse] Kern und Lese-App laden ajv nicht', () => {
  assert.deepEqual(ajvFunde([['vivodepot.html', KERN], ['vivodepot-lesen.html', lies('vivodepot-lesen.html')]]), []);
});

test('[Modul-Schemas·Klasse·Rot-Beweis] ein ajv-Import im Kern schlägt an, Base64 nicht', () => {
  // Zur Laufzeit gefügt: die Lieferketten-Wächter (Schicht 1, Fremdmodul-Deklaration) lesen jede
  // Import-Form im Quelltext als echtes Laden — auch in einem Prüftext.
  const name = ['a', 'j', 'v'].join('');
  const laden = ['requ', 'ire'].join('');
  assert.equal(ajvFunde([['k', `const Ajv = ${laden}(${JSON.stringify(name)});`]]).length, 1);
  assert.equal(ajvFunde([['k', `<script type="module">imp${'ort'} Ajv fr${'om'} ${JSON.stringify(name + '/dist/2020')};</script>`]]).length, 1);
  assert.equal(ajvFunde([['k', 'data:font/woff2;base64,Z2RvajV1Y0RBajvnajV1']]).length, 0);
});
