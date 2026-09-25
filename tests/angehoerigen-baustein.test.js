'use strict';
/* ANG1 Stufe f — der Empfänger-Baustein kommt aus der Vorlage: ein Blatt erklärt seinen Empfängerkreis
   selbst, das Gerüst hält nur den Mechanismus (kein Blatt-ID-Literal mehr im Kern). Ein „weiter" Baustein
   gibt auch sensible Felder frei — das darf nur ein Blatt vom Produkt oder mit verifizierter Signatur. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { gebackenLaden } = require('./lib/gebackenes-produkt-laden.js');

const vorlage = (sprache) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-' + sprache + '.json'), 'utf8'));
const NEU = (extra) => Object.assign({
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-hebammen', sprache: 'de', berufsstand: 'hebamme', berufsstandName: 'Hebammen',
  situationen: { 'geburtsbeleg': { titel: 'Geburtsbeleg', icon: 'users',
    baustein: { id: 'geburt', label: 'Bei der Geburt', hint: 'Name und Geburtsdatum.', weit: false },
    bloecke: [{ id: 'b', titel: 'B', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] } },
}, extra || {});

test('[Baustein] beide Ab-Werk-Vorlagen erklären dieselben vier Bausteine; nur „erbe" ist weit', () => {
  for (const sprache of ['de', 'en']) {
    const v = vorlage(sprache);
    const b = Object.values(v.situationen).map((s) => s.baustein).filter(Boolean);
    assert.deepEqual(b.map((x) => x.id).sort(), ['bestattung', 'erbe', 'notfall', 'pflege'], sprache);
    assert.deepEqual(b.filter((x) => x.weit).map((x) => x.id), ['erbe'], sprache + ': nur der Erbe-Baustein ist weit');
    for (const x of b) assert.ok(x.label.trim() && x.hint.trim(), sprache + ':' + x.id + ' trägt Beschriftung und Hinweis');
  }
  assert.equal(vorlage('de').situationen.meine_menschen.baustein, undefined, 'das fünfte Blatt ist kein Baustein');
});

for (const [slug, notfallLabel] of [['privat-de', 'Im Notfall (Krankenhaus)'], ['privat-en', 'In an emergency (hospital)']]) {
  test('[Baustein · ' + slug + '] die Bausteine kommen aus der Vorlage des Produkts, in ihrer Sprache', async () => {
    const { V } = await gebackenLaden(slug);
    V._angehoerigenVorlagenAusDepotAnmelden({});
    const b = V.empfaengerBausteineAlle().filter((x) => !x.bereich);   // Blatt-Bausteine; die Bereichsbausteine: tests/empfaenger-bereichsbausteine.test.js
    assert.deepEqual(b.map((x) => x.id).sort(), ['bestattung', 'erbe', 'notfall', 'pflege']);
    assert.equal(b.find((x) => x.id === 'notfall').label, notfallLabel);
    assert.equal(b.find((x) => x.id === 'notfall').blatt, 'krankenhausakut');
    assert.equal(b.find((x) => x.id === 'erbe').weit, true);
    assert.ok(b.every((x) => x.ungeprueft === false));
  });
}

test('[Baustein] die Kreis-Zeile zeigt Beschriftung und Hinweis der Vorlage', () => {
  const { V } = ladeKern();
  V._angehoerigenVorlagenAusDepotAnmelden({});
  const html = V._kreisBausteinZeileHTML('bestattung', true);
  assert.match(html, /Für die Bestattung/);
  assert.match(html, /Bestattungsart, Bestatter/);
  assert.match(V._kreisZeileHTML({ id: 'k', name: 'X', bausteine: ['notfall'] }), /Im Notfall \(Krankenhaus\)/);
});

test('[Baustein] eine eingelesene Vorlage bringt einen NEUEN Baustein mit; ein Kreis damit zieht genau die Felder ihres Blatts', async () => {
  const K = ladeKern();
  const { V } = K;
  await V.depotAnlegen('pw-baustein');
  V.akteurSelbstErklaeren('T');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  assert.equal(V.modulEinlassen(JSON.stringify(NEU())).angenommen, true);
  V._angehoerigenVorlagenAusDepotAnmelden(V.getData());
  const geburt = V.empfaengerBausteineAlle().find((b) => b.id === 'geburt');
  assert.ok(geburt && geburt.ungeprueft === true && geburt.label === 'Bei der Geburt');
  assert.match(V._kreisBausteinZeileHTML('geburt', false), /Nicht geprüfte Vorlage/, 'die Zeile sagt, dass die Vorlage ungeprüft ist');
  const subset = V.empfaengerZuschnittModell({ id: 'k', name: 'Hebamme', bausteine: ['geburt'], ausnahmen: [] });
  assert.equal(subset.sektoren.identity.givenName, 'Hedwig');
  assert.equal((subset.sektoren.health || {}).bloodType, undefined, 'nur, was das Blatt nennt');
});

test('[Baustein · Vertrauen · Rot-Beweis] eine UNGEPRÜFTE Vorlage kann keinen weiten Baustein erklären — verifizierte darf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw-baustein');
  const weit = (extra) => { const m = NEU(extra); m.situationen.geburtsbeleg.baustein.weit = true; return m; };
  const d = V.getData();
  d.angehoerigenVorlagenModule = [weit()];
  V._angehoerigenVorlagenAusDepotAnmelden(d);
  assert.equal(V.empfaengerBausteineAlle().find((b) => b.id === 'geburt').weit, false, 'unsigniert: weit wird zurückgenommen');
  d.angehoerigenVorlagenModule = [weit({ ungeprueft: false })];
  V._angehoerigenVorlagenAusDepotAnmelden(d);
  assert.equal(V.empfaengerBausteineAlle().find((b) => b.id === 'geburt').weit, true, 'verifiziert: weit bleibt');
  assert.equal(V.empfaengerBausteineAlle().find((b) => b.id === 'erbe').weit, true, 'ab Werk unverändert');
});

test('[Baustein] gleiche Baustein-ID: der ab-Werk-Baustein gewinnt; eine unbekannte ID gibt nichts frei', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw-baustein');
  const m = NEU(); m.situationen.geburtsbeleg.baustein = { id: 'notfall', label: 'Überschrieben', weit: false };
  const d = V.getData(); d.angehoerigenVorlagenModule = [m];
  V._angehoerigenVorlagenAusDepotAnmelden(d);
  assert.equal(V.empfaengerBausteineAlle().find((b) => b.id === 'notfall').blatt, 'krankenhausakut');
  assert.deepEqual(V.empfaengerBausteinTripel('gibt-es-nicht'), []);
  assert.equal(V.empfaengerZuschnittModell({ id: 'k', name: 'X', bausteine: ['gibt-es-nicht'], ausnahmen: [] }).sektoren.identity, undefined);
});

test('[Baustein · Prüfer · Rot-Beweis] ein ungültiger Baustein verwirft das Blatt benannt, die übrigen bleiben', () => {
  const { V } = ladeKern({ blank: true });
  const m = NEU();
  m.situationen.schlecht = { titel: 'S', icon: 'users', baustein: { id: 'X!', label: '' }, bloecke: [] };
  m.situationen.leer = { titel: 'L', icon: 'users', baustein: 'nein', bloecke: [] };
  const r = V.angehoerigenVorlagePruefen(m);
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.situationen.map((s) => s.id), ['geburtsbeleg']);
  assert.deepEqual(r.verworfene.filter((v) => v.grund === 'baustein').map((v) => v.id).sort(), ['leer', 'schlecht']);
  assert.equal(r.situationen[0].baustein.id, 'geburt');
});

test('[Baustein · Rundlauf] gespeicherte Kreise behalten ihre Baustein-IDs über Speichern und Öffnen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw-baustein');
  V.akteurSelbstErklaeren('T');
  await V.empfaengerkreisSetzen({ id: null, name: 'Tante', bausteine: ['notfall', 'gibt-es-nicht'], ausnahmen: [] });
  await V.depotLaden(await V.depotSerialisieren(), 'pw-baustein');
  const k = V.getData().empfaengerkreise;
  assert.equal(k.length, 1);
  assert.deepEqual(k[0].bausteine, ['notfall'], 'die unbekannte ID wird beim Setzen verworfen, die bekannte überlebt');
});
