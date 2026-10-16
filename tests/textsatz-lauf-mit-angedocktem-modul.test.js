'use strict';
/* ═══════════════════════════════════════════════════════════
   Der Textsatz-Lauf bricht an keinem angedockten Modul ab (13.10.2026, Befund TEXTSATZ-LAUF-BRICHT-AN-ANGEDOCKTER-SITUATION).

   Fund: situationsModulPruefen friert jede angedockte Situation ein; _textsatzAufSituationenAnwenden legte danach mit
   defineProperty eine Eigenschaft auf sie. Das warf („object is not extensible“), und weil der Textsatz-Lauf für ALLE
   Beschriftungen in einem Stück läuft, brach er bei jedem Depot-Übergang ab — die Wiederherstellung ging über dieselbe
   Situationsliste und scheiterte ebenso. Folge: nach dem Anmelden eines Situationsmoduls blieben Beschriftungen der
   ganzen Anwendung halb zurückgenommen, nicht nur die der einen Situation.

   Die Klasse („in ein eingefrorenes Modul schreiben“): je Einlass-Register ein angedocktes Modul, dann der Lauf, den jeder
   Depot-Übergang fährt, zweimal hintereinander und nach einem Sprachwechsel. Kein Fehler im Textsatz-Lauf, und die
   Beschriftungen tragen die gewählte Sprache.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANBIETER = 'institution/textsatz-lauf-probe';
const FREMDSPRACHE = 'fr';
const MARKE = ' ‹fr›';
const PRUEFREGELN = path.join(__dirname, 'fixtures', 'pruefregeln');
const DATEI = {
  stellensatz: 'stellensatz.json', rechtsraum: 'rechtsraum.json', institutionsArt: 'institutions-art.json', blattformat: 'blattformat.json',
  bedingungskatalog: 'bedingungskatalog.json', format: 'format.json', bereich: 'bereich.json', situation: 'situation.json',
  wizard: 'wizard.json', ereignisAchse: 'ereignis-achse.json', angehoerigenVorlage: 'angehoerigen-vorlage.json',
  branding: 'branding.json', logikModul: 'logik.json', erscheinung: 'erscheinung.json',
};
// Jeder gültige Fall des Registers, der reichste zuerst; angedockt wird der erste, den der Einlass annimmt.
function gueltigeFaelle(datei) {
  const f = JSON.parse(fs.readFileSync(path.join(PRUEFREGELN, datei), 'utf8'));
  const groesse = (o) => JSON.stringify(o).length;
  return f.faelle.filter((c) => c.urteil === 'bestanden' && c.dokument).map((c) => c.dokument).sort((a, b) => groesse(b) - groesse(a));
}

async function kernMitSprache() {
  const { V } = await ladeKern();
  await V.depotAnlegen('textsatz-lauf-pw-1');
  const texte = {};
  for (const [k, v] of Object.entries((V.AB_WERK_SPRACHE_PRODUKT || {}).texte || {})) texte[k] = (typeof v === 'string') ? v + MARKE : v;
  const e = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', moduleVersion: 1, sprache: FREMDSPRACHE, texte }), V.getData(), ANBIETER, 'geprueft');
  assert.equal(e.angenommen, true, 'Vorbedingung: das Sprachmodul wird eingelassen (' + e.grund + ')');
  return V;
}

function andocken(V, typ) {
  for (const dok of gueltigeFaelle(DATEI[typ])) {
    if (typ === 'logikModul') V.getData().logikModule = [];
    const e = V.modulEinlassen(JSON.stringify(dok), V.getData(), ANBIETER, 'geprueft');
    if (e.angenommen) return dok;
  }
  return null;
}

// Der Lauf, den jeder Depot-Übergang fährt, mit mitgeschnittenen Fehlern.
function laufMitFehlern(V, schritte) {
  const fehler = [];
  const alt = console.error;
  console.error = (...a) => { fehler.push(String(a[0]).slice(0, 160) + (a[1] && a[1].message ? ' — ' + a[1].message : '')); };
  try { for (const s of schritte) s(); } finally { console.error = alt; }
  return fehler;
}

test('[Textsatz-Lauf·Situation·Rot-Beweis] eine angedockte Situation bricht den Lauf nicht ab, die Beschriftungen tragen die Sprache', async () => {
  const V = await kernMitSprache();
  assert.ok(andocken(V, 'situation'), 'Vorbedingung: eine Situation wird angedockt');
  const fehler = laufMitFehlern(V, [
    () => V._alleModulRegisterAusDepotAnmelden(V.getData()),
    () => V.textsatzSpracheWaehlen(FREMDSPRACHE),
    () => V._alleModulRegisterAusDepotAnmelden(V.getData()),
  ]);
  assert.deepEqual(fehler, [], 'Fehler im Textsatz-Lauf');
  const eingebaut = V.situationenAlle().filter((s) => !s.angedockt);
  assert.ok(eingebaut.length > 0, 'Vorbedingung: eingebaute Situationen');
  assert.deepEqual(eingebaut.filter((s) => !String(s.titel).endsWith(MARKE)).map((s) => s.id), [], 'eingebaute Situationen ohne die gewählte Sprache');
  const angedockt = V.situationenAlle().find((s) => s.angedockt);
  assert.ok(angedockt && angedockt.titel, 'die angedockte Situation behält einen Titel');
});

for (const typ of Object.keys(DATEI)) {
  test('[Textsatz-Lauf·Klasse·' + typ + '] ein angedocktes Modul bricht den Textsatz-Lauf nicht ab', async () => {
    const V = await kernMitSprache();
    assert.ok(andocken(V, typ), 'Vorbedingung: ein Modul dieses Registers wird angedockt');
    const fehler = laufMitFehlern(V, [
      () => V._alleModulRegisterAusDepotAnmelden(V.getData()),
      () => V.textsatzSpracheWaehlen(FREMDSPRACHE),
      () => V._alleModulRegisterAusDepotAnmelden(V.getData()),
    ]);
    assert.deepEqual(fehler, [], typ + ': Fehler im Textsatz-Lauf');
  });
}

// Ein neues Register ohne Fall wäre still nicht erfasst; darum gegen die Register des Kerns, zur Laufzeit gelesen.
// textsatz selbst ist das Sprachmodul jeder Probe hier.
test('[Textsatz-Lauf·Klasse·Vollständigkeit] jedes Einlass-Register außer textsatz hat einen Fall', async () => {
  const { V } = await ladeKern();
  const register = V.EINLASS_REGISTER.map((r) => r.typ).filter((t) => t !== 'textsatz');
  assert.ok(register.length >= 14, 'Positivkontrolle: die Register sind lesbar');
  assert.deepEqual(register.filter((t) => !DATEI[t]), [], 'Register ohne Fall');
});
