'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ANG1 Stufe e — eine Angehörigen-Vorlage lässt sich EINLESEN (jeder Ausgang braucht einen Eingang).
   Dieselben Vertrauensregeln wie für die übrigen Module:
     · der unsignierte Weg ist offen; die Vorlage trägt dann `ungeprueft` (sichtbar am Blatt) und kann
       kein ab-Werk-Blatt ersetzen (wie bei der Beschriftung eines eingebauten Bereichs, U2-ADR-331);
       eine verifizierte Signatur (`ungeprueft: false`) darf es,
     · die Cache-Allowlist bleibt Kern-fest — eine eingelesene Vorlage schaltet nichts frei,
     · Rundlauf: einlesen → speichern → wieder öffnen → in der Lese-App angezeigt, mit Rot-Beweis.
   (Die Signatur-Prüfung selbst — modulEinlassenGeprueft, anbieterIdGeprueft — deckt a467; hier wird nur
   der Zustand `ungeprueft: false` gesetzt, den sie liefert.)
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'pw-ang-einlass';
const HTML = path.join(__dirname, '..', 'vivodepot.html');

const blatt = (titel, eintraege) => ({ titel, icon: 'users', bloecke: [{ id: 'b1', titel: 'Block ' + titel, eintraege }] });
const HEBAMME = () => ({
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-hebammenverband', sprache: 'de',
  berufsstand: 'hebamme', berufsstandName: 'Hebammen',
  situationen: { 'geburtsbeleg-hebamme': blatt('Geburtsbeleg der Hebamme', [{ quelle: 'identity', feld: 'givenName' }]) },
});
const AB_WERK_IDS = ['beerdigung', 'behoerden_nachlass', 'krankenhausakut', 'meine_menschen', 'pflegeheimakut'];

async function kernMitDepot() {
  const K = ladeKern();
  await K.V.depotAnlegen(PW);
  K.V.akteurSelbstErklaeren('Tester');
  K.V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  K.V.sektorFeldSetzen('identity', 'birthDate', '1940-03-02');
  K.V.betreteApp();
  return K;
}
const ids = (V) => V.angehoerigenSituationenAlle().map((s) => s.id).sort();

test('[Einlass] das Register kennt den Typ: eine Vorlage wird angenommen und liegt im Depot-Register', async () => {
  const { V } = await kernMitDepot();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'angehoerigenVorlage');
  assert.ok(reg, 'EINLASS_REGISTER trägt den Eintrag angehoerigenVorlage');
  assert.equal(reg.slot, 'angehoerigenVorlagenModule');
  const r = V.modulEinlassen(JSON.stringify(HEBAMME()));
  assert.equal(r.angenommen, true, 'Grund: ' + r.grund);
  assert.equal(r.typ, 'angehoerigenVorlage');
  assert.equal(r.kennung, 'test-hebammenverband');
  assert.equal(V.getData().angehoerigenVorlagenModule.length, 1);
});

test('[Einlass] die eingelesene Vorlage wirkt: Blatt in der Registry, im Kern zu öffnen, „ungeprüft" sichtbar, Herkunftszeile', async () => {
  const K = await kernMitDepot();
  const { V, document } = K;
  V.modulEinlassen(JSON.stringify(HEBAMME()));
  V._angehoerigenVorlagenAusDepotAnmelden(V.getData());
  assert.deepEqual(ids(V), ['geburtsbeleg-hebamme'].concat(AB_WERK_IDS).sort());
  const blattObjekt = V._angSituationById('geburtsbeleg-hebamme');
  assert.equal(blattObjekt.ungeprueft, true, 'ohne verifizierte Signatur: ungeprüft');
  assert.equal(V._angSituationById('krankenhausakut').ungeprueft, false, 'ab Werk: vom Produkt');
  assert.equal(V.oeffneAngehoerigenBlatt('geburtsbeleg-hebamme'), true);
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /Geburtsbeleg der Hebamme/);
  assert.match(html, /Hedwig/, 'der Wert aus dem Depot steht auf dem Blatt');
  assert.match(html, /ang-herkunft">Gilt für: Hebammen</);
  assert.match(html, /ang-ungeprueft">Nicht geprüfte Vorlage/);
  // Ein ab-Werk-Blatt trägt die Marke nicht.
  V.oeffneAngehoerigenBlatt('krankenhausakut');
  assert.doesNotMatch(document.getElementById('content').innerHTML, /Nicht geprüfte Vorlage/);
  // Über die Suche erreichbar, mit eigener Quelle.
  assert.ok(V._sucheKatalogAufbauen().some((e) => e.quelle === 'angehoerigenBlatt' && e.label === 'Geburtsbeleg der Hebamme'));
});

test('[Einlass · Rundlauf] einlesen → speichern → wieder öffnen → in der Lese-App angezeigt', async () => {
  const { V } = await kernMitDepot();
  assert.equal(V.modulEinlassen(JSON.stringify(HEBAMME())).angenommen, true);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();
  assert.equal(d.angehoerigenVorlagenModule.length, 1, 'die Vorlage steht nach dem Öffnen im Depot');
  assert.ok(ids(V).includes('geburtsbeleg-hebamme'), 'das Blatt ist nach dem Öffnen in der Registry');

  const { V: L } = ladeLesen();
  const obj = JSON.parse(JSON.stringify(d));
  L._foldVollmachtenLesen(obj); L.setData(obj);
  const navIds = [...L.sidebarHTML().matchAll(/data-angblatt="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(navIds, ['geburtsbeleg-hebamme'].concat(AB_WERK_IDS).sort(), 'die Lese-App zeigt die Blätter des Produkts UND das eingelesene');
  const html = L.angehoerigenBlattHTML('geburtsbeleg-hebamme');
  assert.match(html, /Geburtsbeleg der Hebamme/);
  assert.match(html, /Hedwig/);
  assert.match(html, /angehoerigen-herkunft">Gilt für: Hebammen</);
  assert.match(html, /angehoerigen-ungeprueft">Nicht geprüfte Vorlage/);
});

test('[Einlass · Rot-Beweis] ohne den Register-Eintrag wird dieselbe Vorlage abgewiesen', async () => {
  const original = fs.readFileSync(HTML, 'utf8');
  const anker = "typ: 'angehoerigenVorlage', slot: 'angehoerigenVorlagenModule',";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Eintrag steht genau einmal');
  const tmp = path.join(os.tmpdir(), 'ang-einlass-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, "typ: 'nicht-mehr-da', slot: 'angehoerigenVorlagenModule',"));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern({ backen: true });   // die umgelenkte Kopie wird zum Produkt gebacken
    await V.depotAnlegen(PW);
    const r = V.modulEinlassen(JSON.stringify(HEBAMME()));
    assert.equal(r.angenommen, false);
    assert.equal(r.grund, 'unbekannter-typ', 'ohne den Eintrag kennt der Einlass den Typ nicht — das ist der Beweis, dass er wirkt');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
});

test('[Einlass] Schrott wird benannt abgewiesen und verändert das Depot nicht', async () => {
  const { V } = await kernMitDepot();
  const vorher = JSON.stringify(V.getData().angehoerigenVorlagenModule);
  assert.equal(V.modulEinlassen('kein json').grund, 'kein-json');
  assert.equal(V.modulEinlassen(JSON.stringify({ modulTyp: 'angehoerigenVorlage' })).grund, 'moduleVersion');
  assert.equal(V.modulEinlassen(JSON.stringify(Object.assign(HEBAMME(), { modulTyp: 'angehoerigen-vorlage' }))).grund, 'unbekannter-typ');
  const markup = HEBAMME(); markup.situationen['geburtsbeleg-hebamme'].titel = '<img src=x onerror=alert(1)>';
  const r = V.modulEinlassen(JSON.stringify(markup));
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'kein-reiner-text');
  assert.equal(JSON.stringify(V.getData().angehoerigenVorlagenModule), vorher);
});

test('[Einlass · Vertrauen] eine unsignierte Vorlage ersetzt kein ab-Werk-Blatt — die zweite ID wird benannt verworfen', async () => {
  const { V } = await kernMitDepot();
  const fremd = Object.assign(HEBAMME(), { situationen: { krankenhausakut: blatt('Überschrieben', [{ quelle: 'identity', feld: 'givenName' }]) } });
  assert.equal(V.modulEinlassen(JSON.stringify(fremd)).angenommen, true);
  V._angehoerigenVorlagenAusDepotAnmelden(V.getData());
  const kh = V._angSituationById('krankenhausakut');
  assert.equal(kh.titel, 'Krankenhaus', 'der ab-Werk-Wortlaut bleibt');
  assert.equal(kh.ungeprueft, false);
  assert.ok(V.ANGEHOERIGEN_VORLAGEN_MODUL_VERWORFEN.some((v) => v.id === 'krankenhausakut' && v.grund === 'doppelt'));
});

test('[Einlass · Vertrauen] eine VERIFIZIERTE Vorlage (ungeprueft: false) darf ein ab-Werk-Blatt ersetzen, und nur dieses', async () => {
  const { V } = await kernMitDepot();
  const geprueft = Object.assign(HEBAMME(), { ungeprueft: false, anbieterId: 'test-anbieter', anbieterIdGeprueft: true,
    situationen: { krankenhausakut: blatt('Krankenhaus (geprüfte Fassung)', [{ quelle: 'identity', feld: 'givenName' }]),
      pflegeheimakut: blatt('Pflegeheim (geprüft)', []) } });
  const d = V.getData();
  d.angehoerigenVorlagenModule = [geprueft];
  V._angehoerigenVorlagenAusDepotAnmelden(d);
  const kh = V._angSituationById('krankenhausakut');
  assert.equal(kh.titel, 'Krankenhaus (geprüfte Fassung)');
  assert.equal(kh.ungeprueft, false, 'ein verifiziertes Blatt trägt die Marke nicht');
  assert.equal(ids(V).length, 5, 'ersetzt, nicht zusätzlich angelegt');
  assert.equal(V._angSituationById('beerdigung').titel, 'Beerdigung und Nachlass', 'unberührte ab-Werk-Blätter bleiben');
});

test('[Einlass · Allowlist] eine eingelesene Vorlage schaltet kein Feld für die Angehörigen-Sicht frei', async () => {
  const { V } = await kernMitDepot();
  const m = HEBAMME();
  m.situationen['geburtsbeleg-hebamme'] = blatt('Alles', [{ quelle: 'identity', feld: 'birthDate' }, { quelle: 'identity', feld: 'givenName' }]);
  assert.equal(V.modulEinlassen(JSON.stringify(m)).angenommen, true);
  V._angehoerigenVorlagenAusDepotAnmelden(V.getData());
  const cache = V.angehoerigenCacheModell();
  assert.equal((cache.sektoren.identity || {}).birthDate, undefined, 'birthDate steht in keiner Kern-Allowlist — die Vorlage ändert daran nichts');
  assert.equal((cache.sektoren.identity || {}).givenName, 'Hedwig', 'Gegenprobe: der Cache ist nicht leer');
});

test('[Einlass] dieselbe Herkunft, neuere Fassung: die Vorlage wird aktualisiert, nicht verdoppelt', async () => {
  const { V } = await kernMitDepot();
  V.modulEinlassen(JSON.stringify(HEBAMME()));
  const neu = HEBAMME(); neu.moduleVersion = 2; neu.situationen['geburtsbeleg-hebamme'].titel = 'Geburtsbeleg (neu)';
  const r = V.modulEinlassen(JSON.stringify(neu));
  assert.equal(r.angenommen, true);
  assert.equal(V.getData().angehoerigenVorlagenModule.length, 1);
  V._angehoerigenVorlagenAusDepotAnmelden(V.getData());
  assert.equal(V._angSituationById('geburtsbeleg-hebamme').titel, 'Geburtsbeleg (neu)');
});
