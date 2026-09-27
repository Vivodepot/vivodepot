/* Eine Angehörigen-Vorlage kann ein Blatt anbieten, aber KEIN Feld für die Angehörigen-Sicht
   freischalten: was ein Angehöriger ohne Depot-Passwort sieht, bestimmt allein die Kern-feste
   Liste `_ANG_CACHE_ERLAUBT` (Schlüssel `blatt|quelle|feld`). Ein Blatt-Feld-Paar, das dort nicht
   steht, bleibt draußen — gleich, wie die Vorlage es nennt. (ANG1 Stufe b, Bedingung 2.) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');

const HTML = path.join(__dirname, '..', 'vivodepot.html');

const NEUES_BLATT = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-berufs-vorlage',
  sprache: 'de', berufsstand: 'notar',
  situationen: {
    'mein-neues-blatt': {
      titel: 'Neues Blatt', icon: 'star',
      bloecke: [{ id: 'alles', titel: 'Alles', eintraege: [
        { quelle: 'identity', feld: 'birthDate' },
      ] }],
    },
  },
};
const DOPPELT = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-doppelt',
  sprache: 'de', rechtsraum: 'AT',
  situationen: {
    pflegeheimakut: {
      titel: 'Ueberschrieben', icon: 'star',
      bloecke: [{ id: 'x', titel: 'X', eintraege: [{ quelle: 'identity', feld: 'birthDate' }] }],
    },
  },
};

async function depotMitWerten(V) {
  await V.depotAnlegen('pw-ang-allow');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  V.sektorFeldSetzen('identity', 'birthDate', '1940-03-02');
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456789');
  return V;
}

test('[Vorlage ≠ Freischaltung] ein neues Blatt mit einem nicht freigegebenen Feld wird angeboten, sein Inhalt kommt NICHT in den Angehörigen-Cache', async () => {
  const { V } = ladeKern();
  await depotMitWerten(V);
  V._angehoerigenVorlagenAusDepotAnmelden({ angehoerigenVorlagenModule: [NEUES_BLATT] });
  assert.ok(V.angehoerigenSituationenAlle().some((s) => s.id === 'mein-neues-blatt'), 'Vorbedingung: das Blatt ist angemeldet');
  const cache = V.angehoerigenCacheModell();
  assert.equal((cache.sektoren.identity || {}).birthDate, undefined);
  assert.equal((cache.sektoren.identity || {}).givenName, 'Hedwig', 'Gegenprobe: der Cache ist nicht leer');
});

test('[Vorlage ≠ Freischaltung] eine Vorlage mit der ID eines ab-Werk-Blatts überschreibt es nicht — sie wird benannt verworfen', () => {
  const { V } = ladeKern();
  V._angehoerigenVorlagenAusDepotAnmelden({ angehoerigenVorlagenModule: [DOPPELT] });
  const pflege = V.angehoerigenSituationenAlle().filter((s) => s.id === 'pflegeheimakut');
  assert.equal(pflege.length, 1);
  assert.notEqual(pflege[0].titel, 'Ueberschrieben');
  assert.ok(V.ANGEHOERIGEN_VORLAGEN_MODUL_VERWORFEN.some((v) => v.id === 'pflegeheimakut' && v.grund === 'doppelt'));
});

test('[Vorlage ≠ Freischaltung · Rot-Beweis] ohne die Kern-Liste kommt der Inhalt des neuen Blatts in den Cache', async () => {
  const original = fs.readFileSync(HTML, 'utf8');
  const anker = "        if (!_ANG_CACHE_ERLAUBT.has(s.id + '|' + e.quelle + '|' + e.feld)) continue;\n";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: die Filterzeile steht genau einmal');
  const tmp = path.join(os.tmpdir(), 'ang-allow-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ''));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern({ backen: true });   // die umgelenkte Kopie wird zum Produkt gebacken
    await depotMitWerten(V);
    V._angehoerigenVorlagenAusDepotAnmelden({ angehoerigenVorlagenModule: [NEUES_BLATT] });
    const cache = V.angehoerigenCacheModell();
    assert.equal((cache.sektoren.identity || {}).birthDate, '1940-03-02', 'ohne die Liste schaltet die Vorlage frei — das ist der Beweis, dass die Liste wirkt');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML, 'utf8'), original);
});
