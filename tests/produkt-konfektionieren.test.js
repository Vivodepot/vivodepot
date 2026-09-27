'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/produkt-konfektionieren.js (07.09.2026)
   ────────────────────────────────────────────────────────────────────────
   „VD = VD Privat D/E und VD Pro D/E — also 4 Produkte, testbar und
   potentiell buchbar." Diese Datei belegt den WEG: dasselbe Gerüst
   (vivodepot.html — seit „Produkt ist eine Datei",
   10.09.2026, die EINZIGE ausgelieferte Datei) byte-identisch AUSSERHALB
   der Ab-Werk-Marker-Regionen über beliebig viele Konfektionen hinweg; die
   Vor-Depot-Konfiguration (früher `vorabkonfiguration.js` als eigene
   Begleitdatei) ist seitdem eine dieser Regionen — ein eingebackenes
   `<script id="vor-depot-konfiguration">`, keine zweite Datei mehr.

   Fixtures liegen in tests/fixtures/produkt-konfektionieren/ (roher,
   UNSIGNIERTER Modul-Inhalt) — signiert wird ephemer zur Testzeit mit
   einem Wegwerf-Schlüsselpaar, wörtlich derselbe Weg wie in
   tests/vor-depot-konfiguration-alle-register.test.js. Kein Schlüssel
   verlässt den Testlauf, keiner liegt im Repo.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeIssuer } = require('./load-issuer.js');
const {
  modulauswahlLesen, vorbedingungenPruefen, konfektionieren, gerüstByteGleich, produktTextErzeugen,
  PRODUKT_DATEISATZ, _ohneAbWerkNutzlast,
} = require('../tools/produkt-konfektionieren.js');
const { _entwicklerleisteSchneiden } = require('../tools/lib/produkt-text-erzeugen.js');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'produkt-konfektionieren');

function tmpOrdner(praefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), praefix + '-'));
}

// Liest die gebackene Vor-Depot-Konfiguration aus einem konfektionierten vivodepot.html
// zurück — das Gegenstück zum früheren `fs.readFileSync(.../vorabkonfiguration.js)`.
function gebackeneVorDepotKonfiguration(kernOrdner) {
  const quelle = fs.readFileSync(path.join(kernOrdner, 'vivodepot.html'), 'utf8');
  const m = /<script id="vor-depot-konfiguration">window\.__vorDepotKonfiguration = ([\s\S]*?);<\/script>/.exec(quelle);
  if (!m) throw new Error('vor-depot-konfiguration-Region nicht gefunden in ' + kernOrdner);
  return JSON.parse(m[1]);
}

// (12.09.2026): liest die gebackene AB_WERK_SERVICE_WORKER_VORHANDEN-Region
// zurück — dasselbe Muster wie gebackeneVorDepotKonfiguration() oben.
function gebackenerServiceWorkerVorhanden(kernOrdner) {
  const quelle = fs.readFileSync(path.join(kernOrdner, 'vivodepot.html'), 'utf8');
  const m = /<script id="ab-werk-service-worker-vorhanden">window\.__abWerkServiceWorkerVorhanden = ([\s\S]*?);<\/script>/.exec(quelle);
  if (!m) throw new Error('ab-werk-service-worker-vorhanden-Region nicht gefunden in ' + kernOrdner);
  return JSON.parse(m[1]);
}

/* Ephemeres Wegwerf-Schlüsselpaar + Sentinel-Anker — wörtlich derselbe Aufbau wie
   tests/vor-depot-konfiguration-alle-register.test.js, hier eigens, weil Zweck und
   Lebensdauer andere sind (ein Produkt-Zusatzmodul, keine Register-Ausbeute). */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-09-07T09:00:00Z';
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
async function signiertesBuendel(V, modul) {
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/produkt-konfektionieren-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

/* ── modulauswahlLesen ─────────────────────────────────────────────────── */

test('[Produkt-Konfektionieren] eine leere Auswahl (`[]`) ist GÜLTIG — anders als beim Modul-App-Packen', () => {
  const r = modulauswahlLesen(path.join(FIXTURES, 'leer.json'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.liste, []);
});

test('[Produkt-Konfektionieren] eine nicht-leere Auswahl läuft durch dieselbe Strukturprüfung wie modul-app-packen.js', () => {
  const tmp = tmpOrdner('produkt-konfektionieren-bundle');
  try {
    const pfad = path.join(tmp, 'bundle.json');
    fs.writeFileSync(pfad, JSON.stringify([{ providerCredentialJws: 'a.b.c', modulSignaturJws: 'd.e.f' }]));
    const r = modulauswahlLesen(pfad);
    assert.equal(r.ok, true);
    assert.equal(r.liste.length, 1);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren·Rot-Beweis] kein Array wird benannt abgelehnt', () => {
  const tmp = tmpOrdner('produkt-konfektionieren-bundle');
  try {
    const pfad = path.join(tmp, 'bundle.json');
    fs.writeFileSync(pfad, JSON.stringify({ providerCredentialJws: 'a.b.c', modulSignaturJws: 'd.e.f' }));
    const r = modulauswahlLesen(pfad);
    assert.equal(r.ok, false);
    assert.match(r.fehler, /muss ein Array sein/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren·Rot-Beweis] eine ungültige JWS-Form in einer nicht-leeren Auswahl wird gefangen', () => {
  const tmp = tmpOrdner('produkt-konfektionieren-bundle');
  try {
    const pfad = path.join(tmp, 'bundle.json');
    fs.writeFileSync(pfad, JSON.stringify([{ providerCredentialJws: 'kaputt', modulSignaturJws: 'd.e.f' }]));
    const r = modulauswahlLesen(pfad);
    assert.equal(r.ok, false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ── vorbedingungenPruefen ─────────────────────────────────────────────── */

test('[Produkt-Konfektionieren] ungültiger Slug wird benannt abgelehnt', () => {
  const { funde } = vorbedingungenPruefen({ slug: 'VD Privat', bundlePfad: path.join(FIXTURES, 'leer.json') });
  assert.ok(funde.some((f) => f.includes('Ungültiger Slug')));
});

test('[Produkt-Konfektionieren] fehlendes --bundle wird benannt abgelehnt', () => {
  const { funde } = vorbedingungenPruefen({ slug: 'privat-de', bundlePfad: null });
  assert.ok(funde.some((f) => f.includes('--bundle fehlt')));
});

test('[Produkt-Konfektionieren] gültige Vorbedingungen liefern keine Funde', () => {
  const { funde, modulauswahl } = vorbedingungenPruefen({ slug: 'privat-de', bundlePfad: path.join(FIXTURES, 'leer.json') });
  assert.deepEqual(funde, []);
  assert.deepEqual(modulauswahl, []);
});

/* (10.09.2026), gemessen am laufenden Bestand: `node
   tools/produkt-konfektionieren.js --slug <privat-de|privat-en|pro-de|pro-en> --bundle
   <leer.json> --ziel <ordner>` lief für alle vier Slugs durch und schrieb `diff -rq`-
   identische Ordner — `unsignierteModulDateien` wurde nie aus PRODUKTE (tools/lib/
   vier-produkte.js) aufgelöst, obwohl konfektionieren() den Parameter längst kennt. */
test('[Produkt-Konfektionieren·Rot-Beweis] vorbedingungenPruefen() liefert das PRODUKTE-Objekt für einen bekannten Slug', () => {
  const { funde, produkt } = vorbedingungenPruefen({ slug: 'pro-en', bundlePfad: path.join(FIXTURES, 'leer.json') });
  assert.deepEqual(funde, []);
  assert.equal(produkt.slug, 'pro-en');
  assert.ok(produkt.proModulPfad, 'pro-en muss ein proModulPfad aus PRODUKTE tragen');
});

test('[Produkt-Konfektionieren·Rot-Beweis] ein formal gültiger, aber unbekannter Slug wird benannt abgelehnt', () => {
  const { funde, produkt } = vorbedingungenPruefen({ slug: 'unbekannt-de', bundlePfad: path.join(FIXTURES, 'leer.json') });
  assert.ok(funde.some((f) => f.includes('Unbekannter Slug')), 'Funde: ' + JSON.stringify(funde));
  assert.equal(produkt, null);
});

/* ── konfektionieren() — reine Datei-Schreib-Funktion, injizierte vorDepotKonfigurationInhaltFn ── */

test('[Produkt-Konfektionieren] konfektionieren() legt NUR vivodepot.html ab, Vor-Depot-Konfiguration gebacken', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-ziel');
  try {
    const r = konfektionieren({
      ziel, slug: 'privat-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: (liste) => 'window.__vorDepotKonfiguration = ' + JSON.stringify(liste) + ';\n',
    });
    assert.deepEqual(fs.readdirSync(r.ordner), PRODUKT_DATEISATZ,
      'der Ordner darf NUR ' + PRODUKT_DATEISATZ.join(', ') + ' enthalten — kein index.html/sw.js/manifest.webmanifest/vorabkonfiguration.js mehr');
    assert.deepEqual(gebackeneVorDepotKonfiguration(r.ordner), []);
    assert.equal(r.anzahlModule, 0);
    assert.equal(gebackenerServiceWorkerVorhanden(r.ordner), false,
      'PRODUKT_DATEISATZ trägt kein sw.js — die Region muss "false" backen, sonst der echte 404 (Fund 12.09.2026). '
      + 'Dass "false" die Registrierung tatsächlich unterdrückt, prüft tests/d43-etappe8-serviceworker.test.js gegen '
      + '_swRegistrierenErlaubt() direkt.');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren] die Kopie ist byte-identisch zur Quelle AUSSERHALB der Ab-Werk-Regionen und der Entwicklerleiste', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-ziel');
  try {
    const r = konfektionieren({
      ziel, slug: 'privat-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    });
    const quelle = _ohneAbWerkNutzlast(_entwicklerleisteSchneiden(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'), 'vivodepot.html'), 'vivodepot.html');
    const kopie = _ohneAbWerkNutzlast(fs.readFileSync(path.join(r.ordner, 'vivodepot.html'), 'utf8'), 'vivodepot.html');
    assert.equal(kopie, quelle, 'Gerüst-Kopie weicht AUSSERHALB der Marker-Regionen vom Quell-vivodepot.html ab');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── gerüstByteGleich() — der Wächter selbst, gegen gepflanzte Abweichungen ── */

test('[Produkt-Konfektionieren·Wächter] zwei Konfektionen mit VERSCHIEDENER Modulauswahl bleiben im Gerüst byte-gleich', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-ziel');
  try {
    const a = konfektionieren({
      ziel, slug: 'privat-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: (liste) => 'window.__vorDepotKonfiguration = ' + JSON.stringify(liste) + ';\n',
    });
    const b = konfektionieren({
      ziel, slug: 'pro-de', modulauswahl: [{ providerCredentialJws: 'a.b.c', modulSignaturJws: 'd.e.f' }],
      vorDepotKonfigurationInhaltFn: (liste) => 'window.__vorDepotKonfiguration = ' + JSON.stringify(liste) + ';\n',
    });
    const w = gerüstByteGleich(a.ordner, b.ordner);
    assert.equal(w.gleich, true, 'Gerüst muss trotz unterschiedlicher Modulauswahl byte-gleich bleiben: ' + w.abweichungen.join(','));
    const inhaltA = gebackeneVorDepotKonfiguration(a.ordner);
    const inhaltB = gebackeneVorDepotKonfiguration(b.ordner);
    assert.notDeepEqual(inhaltA, inhaltB, 'die gebackene Vor-Depot-Konfiguration MUSS sich unterscheiden — sonst prüft der Wächter nichts');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren·Wächter·ROT-BEWEIS] eine einzelne Gerüst-Zeile, die nur in EINER Konfektion steht, wird gefunden', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-ziel');
  try {
    const a = konfektionieren({
      ziel, slug: 'privat-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    });
    const b = konfektionieren({
      ziel, slug: 'pro-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    });
    // Vorbedingung: unangetastet sind sie gleich.
    assert.equal(gerüstByteGleich(a.ordner, b.ordner).gleich, true);
    // Die gepflanzte Abweichung: eine Zeile ins Gerüst EINER Konfektion, AUSSERHALB jeder
    // Marker-Region — genau der Fall, den die Produktentscheidung als Rot-Beweis verlangt hat. Seit
    // „Produkt ist eine Datei" gibt es nur noch vivodepot.html, die Abweichung landet also
    // dort statt in sw.js.
    const pfadB = path.join(b.ordner, 'vivodepot.html');
    fs.appendFileSync(pfadB, '\n<!-- PRO-DE-EIGENE ZEILE — DARF NICHT VOM SELBEN GERÜST BEHAUPTET WERDEN -->\n');
    const w = gerüstByteGleich(a.ordner, b.ordner);
    assert.equal(w.gleich, false, 'die gepflanzte Abweichung MUSS gefunden werden — sonst rutscht sie durch');
    assert.deepEqual(w.abweichungen, ['vivodepot.html'], 'die abweichende Datei muss BENANNT werden, nicht nur "ungleich"');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren·Wächter·Gegenprobe] zwei UNANGETASTETE Konfektionen bleiben in der einen Gerüst-Datei gleich', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-ziel');
  try {
    const a = konfektionieren({ ziel, slug: 'x1', modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n' });
    const b = konfektionieren({ ziel, slug: 'x2', modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n' });
    assert.deepEqual(gerüstByteGleich(a.ordner, b.ordner), { gleich: true, abweichungen: [] });
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── Ende-zu-Ende: die vier Produkte, mit der ECHTEN Issuer-Sandbox ─────── */

test('[Produkt-Konfektionieren·Ende-zu-Ende] vier Konfektionen (privat-de/privat-en/pro-de/pro-en) — byte-gleiches Gerüst, echtes signiertes Zusatzmodul nur bei Pro', async () => {
  const { V: KERN } = ladeKern();
  const ISSUER = ladeIssuer().V;
  const roh = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pro-zusatzmodul-roh.json'), 'utf8'));
  const proBuendel = await signiertesBuendel(ISSUER, roh);

  const ziel = tmpOrdner('produkt-konfektionieren-vier');
  try {
    const slugsUndAuswahl = [
      ['privat-de', []],
      ['privat-en', []],   // heute identisch zu privat-de — kein Sprachmodul, s. Kopf-Kommentar
      ['pro-de', [proBuendel]],
      ['pro-en', [proBuendel]],
    ];
    const ergebnisse = {};
    for (const [slug, modulauswahl] of slugsUndAuswahl) {
      ergebnisse[slug] = konfektionieren({
        ziel, slug, modulauswahl,
        vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
      });
    }
    // Alle sechs Paare byte-gleich im Gerüst.
    const namen = Object.keys(ergebnisse);
    for (let i = 0; i < namen.length; i++) {
      for (let j = i + 1; j < namen.length; j++) {
        const w = gerüstByteGleich(ergebnisse[namen[i]].ordner, ergebnisse[namen[j]].ordner);
        assert.equal(w.gleich, true, namen[i] + ' vs ' + namen[j] + ': ' + w.abweichungen.join(','));
      }
    }
    // Privat: kein Zusatzmodul.
    assert.equal(ergebnisse['privat-de'].anzahlModule, 0);
    assert.equal(ergebnisse['privat-en'].anzahlModule, 0);
    // Pro: das echte, signierte Zusatzmodul.
    assert.equal(ergebnisse['pro-de'].anzahlModule, 1);
    assert.equal(ergebnisse['pro-en'].anzahlModule, 1);

    // Ende-zu-Ende, nicht nur Datei-Existenz: die eingebackene Vor-Depot-Konfiguration liest
    // sich zurück zu genau dem Bündel-Array, das hineinging — UND landet über den echten
    // Vor-Depot-Weg tatsächlich im richtigen Slot (derselbe Weg wie
    // tests/vor-depot-konfiguration-anwenden.test.js).
    const zurueckgelesen = gebackeneVorDepotKonfiguration(ergebnisse['pro-de'].ordner);
    assert.deepEqual(zurueckgelesen, [proBuendel]);

    const zielDepot = await KERN.vorDepotKonfigurationAnwenden(zurueckgelesen, null, OPTS);
    assert.equal(zielDepot.brandingModule.length, 1, 'das Pro-Zusatzmodul muss über den echten Weg landen');
    assert.equal(zielDepot.brandingModule[0].herkunft, 'vd-pro-demo');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── CLI-Ende-zu-Ende (10.09.2026) — DER EIGENTLICHE ROT-BEWEIS ──────────
   Das Ende-zu-Ende oben ruft `konfektionieren()` direkt als Bibliothek und kam am Fund
   VORBEI, weil es genau das tut, was die echte Ladenautomatik NICHT tut: `unsignierteModulDateien`
   von Hand mitgeben. Der Fund lag in `main()` selbst — dem `--slug`-CLI-Einstieg. Baut darum
   über den ECHTEN Prozess (execFileSync gegen `node tools/produkt-konfektionieren.js`), nicht
   über die Bibliotheksfunktion. Beide Richtungen im selben Test, wie verlangt hat:
   der Kern bleibt außerhalb der AB_WERK-Regionen byte-gleich (gerüstByteGleich, derselbe
   Wächter wie oben) UND die vier Ergebnisse unterscheiden sich TATSÄCHLICH (`diff -rq`,
   nicht nur eine Zusicherung). */
test('[Produkt-Konfektionieren·CLI·Rot-Beweis] vier `--slug`-Aufrufe über die echte CLI: Kern bleibt gleich, Ergebnis unterscheidet sich tatsächlich', () => {
  const { execFileSync } = require('node:child_process');
  const ziel = tmpOrdner('produkt-konfektionieren-cli-vier');
  const bundlePfad = path.join(ziel, 'leer.json');
  fs.writeFileSync(bundlePfad, '[]\n', 'utf8');
  try {
    const slugs = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];
    for (const slug of slugs) {
      execFileSync('node',
        ['tools/produkt-konfektionieren.js', '--slug', slug, '--bundle', bundlePfad, '--ziel', ziel],
        { cwd: REPO, stdio: 'pipe' });
    }

    // Richtung 1 — der Kern (DATEISATZ, außerhalb der AB_WERK-Regionen) bleibt über alle
    // sechs Paare byte-gleich. Das ist die Zusage, kein Nebeneffekt (: "prüf, welcher
    // Wächter das ist" — es ist derselbe gerüstByteGleich() wie im Ende-zu-Ende oben).
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const w = gerüstByteGleich(path.join(ziel, slugs[i]), path.join(ziel, slugs[j]));
        assert.equal(w.gleich, true,
          slugs[i] + ' vs ' + slugs[j] + ' (Gerüst außerhalb AB_WERK muss gleich bleiben): ' + w.abweichungen.join(','));
      }
    }

    // Richtung 2 — die vier Ergebnisordner unterscheiden sich TATSÄCHLICH. `diff -rq`, nicht
    // eine Zusicherung: das ist der Fund, den dieser ganze Auftrag behebt. VORHER (ohne die
    // PRODUKTE-Auflösung in main()) waren alle sechs Paare hier identisch.
    const ungleichePaare = [];
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        try {
          execFileSync('diff', ['-rq', path.join(ziel, slugs[i]), path.join(ziel, slugs[j])], { stdio: 'pipe' });
        } catch (_) { ungleichePaare.push(slugs[i] + '/' + slugs[j]); }
      }
    }
    assert.equal(ungleichePaare.length, 6,
      'alle sechs Paare müssen sich unterscheiden (`diff -rq` meldet einen Unterschied) — '
      + 'gefunden: ' + ungleichePaare.length + ' von 6 (' + ungleichePaare.join(', ') + ')');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren·CLI·Gegenprobe] ein formal gültiger, aber unbekannter Slug wird über die CLI abgelehnt — kein Ordner entsteht', () => {
  const { execFileSync } = require('node:child_process');
  const ziel = tmpOrdner('produkt-konfektionieren-cli-unbekannt');
  const bundlePfad = path.join(ziel, 'leer.json');
  fs.writeFileSync(bundlePfad, '[]\n', 'utf8');
  try {
    assert.throws(() => {
      execFileSync('node',
        ['tools/produkt-konfektionieren.js', '--slug', 'unbekannt-de', '--bundle', bundlePfad, '--ziel', ziel],
        { cwd: REPO, stdio: 'pipe', encoding: 'utf8' });
    }, (e) => {
      assert.equal(e.status, 1, 'ein unbekannter Slug muss den Prozess mit Exit 1 beenden');
      assert.match(e.stderr, /Unbekannter Slug/);
      return true;
    });
    assert.equal(fs.existsSync(path.join(ziel, 'unbekannt-de')), false,
      'bei abgelehnter Vorbedingung darf NICHTS geschrieben werden — kein leerer Ordner');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── produktTextErzeugen() — der Backschritt OHNE Dateisystem ────────────────────────────
   „dynamischer Bau bei Bestellung" (12.09.2026): Voraussetzung für einen
   Worker (kein node:fs dort). Nimmt Kern-TEXT + bereits geparste Modul-Objekte, gibt
   Produkt-TEXT zurück — kein Pfad, kein readFileSync/writeFileSync. `konfektionieren()`
   ist seitdem eine dünne Hülle darüber (s. Kopf-Kommentar dort). Die erste, wichtigste
   Probe ist nicht "tut sie das Richtige", sondern "rührt sie fs überhaupt nicht an" —
   sonst behauptet die Funktion Fähigkeiten, die sie nicht hat. */
test('[produktTextErzeugen·Kein-fs] rührt weder readFileSync noch writeFileSync an', () => {
  const echtesRead = fs.readFileSync;
  const echtesWrite = fs.writeFileSync;
  fs.readFileSync = () => { throw new Error('produktTextErzeugen darf fs.readFileSync nie aufrufen'); };
  fs.writeFileSync = () => { throw new Error('produktTextErzeugen darf fs.writeFileSync nie aufrufen'); };
  try {
    const kernText = '<html>vor'
      + '<!-- AB_WERK_VOR_DEPOT_KONFIGURATION:BEGIN --><!-- AB_WERK_VOR_DEPOT_KONFIGURATION:END -->'
      + '<!-- AB_WERK_SERVICE_WORKER_VORHANDEN:BEGIN --><!-- AB_WERK_SERVICE_WORKER_VORHANDEN:END -->'
      + '/* AB_WERK_SPRACHE_PRODUKT:BEGIN */const AB_WERK_SPRACHE_PRODUKT = null;/* AB_WERK_SPRACHE_PRODUKT:END */'
      + '/* AB_WERK_BEREICH_QUELLEN:BEGIN */const AB_WERK_BEREICH_QUELLEN = Object.freeze([]);/* AB_WERK_BEREICH_QUELLEN:END */'
      + '/* AB_WERK_LOGIK_MODUL_QUELLEN:BEGIN */const AB_WERK_LOGIK_MODUL_QUELLEN = Object.freeze([]);/* AB_WERK_LOGIK_MODUL_QUELLEN:END */'
      + '/* AB_WERK_BEREICHS_ERSATZ:BEGIN */BUERGERMODUL_BUENDEL.bereichsErsatz = null;/* AB_WERK_BEREICHS_ERSATZ:END */'
      + '/* AB_WERK_VORLAGEN_QUELLEN:BEGIN */const AB_WERK_VORLAGEN_QUELLEN = Object.freeze([]);/* AB_WERK_VORLAGEN_QUELLEN:END */'
      + '/* AB_WERK_BRANDING_PRODUKT:BEGIN */const AB_WERK_BRANDING_PRODUKT = null;/* AB_WERK_BRANDING_PRODUKT:END */'
      + '/* AB_WERK_RECHTSRAUM_PRODUKT:BEGIN */const AB_WERK_RECHTSRAUM_PRODUKT = null;/* AB_WERK_RECHTSRAUM_PRODUKT:END */'
      + 'nach</html>';
    const r = produktTextErzeugen(kernText, {
      modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModule: [{ roh: { modulTyp: 'textsatz', sprache: 'en' }, basisname: 'fingiert.json' }],
    });
    assert.match(r.text, /window\.__vorDepotKonfiguration = \[\];/);
    assert.match(r.text, /const AB_WERK_SPRACHE_PRODUKT = \{"modulTyp":"textsatz","sprache":"en"\};/);
    assert.deepEqual(r.module, ['fingiert.json']);
  } finally { fs.readFileSync = echtesRead; fs.writeFileSync = echtesWrite; }
});

test('[produktTextErzeugen] unbekannter modulTyp wird benannt abgelehnt, keine Region geraten', () => {
  const kernText = '<!-- AB_WERK_VOR_DEPOT_KONFIGURATION:BEGIN --><!-- AB_WERK_VOR_DEPOT_KONFIGURATION:END -->'
    + '<!-- AB_WERK_SERVICE_WORKER_VORHANDEN:BEGIN --><!-- AB_WERK_SERVICE_WORKER_VORHANDEN:END -->';
  assert.throws(() => produktTextErzeugen(kernText, {
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModule: [{ roh: { modulTyp: 'nichtvorhanden' }, basisname: 'x.json' }],
  }), /Unbekannter modulTyp „nichtvorhanden"/);
});

test('[produktTextErzeugen·Gleichheit] liefert byte-für-byte denselben Text wie konfektionieren() für dieselben Eingaben', () => {
  const ziel = tmpOrdner('produkt-text-erzeugen-gleichheit');
  try {
    const modulauswahl = [{ providerCredentialJws: 'a.b.c', modulSignaturJws: 'd.e.f' }];
    const vorDepotKonfigurationInhaltFn = (liste) => 'window.__vorDepotKonfiguration = ' + JSON.stringify(liste) + ';\n';
    const rEcht = konfektionieren({ ziel, slug: 'privat-de', modulauswahl, vorDepotKonfigurationInhaltFn });

    const kernText = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
    const rPur = produktTextErzeugen(kernText, { modulauswahl, vorDepotKonfigurationInhaltFn, unsignierteModule: [] });

    const geschrieben = fs.readFileSync(path.join(rEcht.ordner, 'vivodepot.html'), 'utf8');
    assert.equal(rPur.text, geschrieben,
      'produktTextErzeugen() muss byte-für-byte denselben Text liefern, den konfektionieren() auf die Platte schreibt');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── Marke-Achse-Plan §2b/§6 Schritt 5 (14.09.2026) — Partner-Font-Parameter ──
   Kein zweiter, echter Partner-Font im Repo verfügbar (nur Inter ist committet) — die Probe
   nutzt darum Inters eigene, bereits zugeschnittene Bytes unter einem ANDEREN Slug/Familiennamen
   als Stellvertreter. Das beweist die VERDRAHTUNG (Vendoring + Vertrauensliste + _PDF_MARKE_
   SCHRIFT-Auflösung), nicht die Zeichendeckung eines echten, andersartigen Partner-Fonts —
   Letzteres bleibt, wie in §7 offen benannt, ein Punkt vor dem ersten echten Partner-Bau. */
const { REGULAR_PFAD: INTER_REGULAR_PFAD } = require('../tools/build-pdf-inter-einbetten.js');

test('[Produkt-Konfektionieren·Partner-Font] ohne partnerFont bleibt die Vertrauensliste leer — alle vier heutigen Produkte unverändert', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-partnerfont-ohne');
  try {
    const r = konfektionieren({ ziel, slug: 'privat-de', modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n' });
    assert.equal(r.partnerFont, null);
    const kernText = fs.readFileSync(path.join(r.ordner, 'vivodepot.html'), 'utf8');
    assert.match(kernText, /_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH = Object\.freeze\(\[\]\);/, 'Vertrauensliste muss leer bleiben, wenn kein partnerFont übergeben wird');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Produkt-Konfektionieren·Partner-Font] mit partnerFont wird der Block vendort UND in die Vertrauensliste eingetragen — _PDF_MARKE_SCHRIFT löst ihn auf, sobald das Branding-Modul dieselbe Familie nennt', () => {
  const ziel = tmpOrdner('produkt-konfektionieren-partnerfont-mit');
  try {
    const partnerFont = {
      slug: 'partnerprobe', familie: 'Partnerprobe', regularPfad: INTER_REGULAR_PFAD,
      version: 'probe-1', lizenz: 'OFL-1.1', spdx: 'OFL-1.1', hinweis: 'Schritt-5-Integrationsprobe (Inter-Bytes als Stellvertreter)',
    };
    const r = konfektionieren({ ziel, slug: 'privat-de', modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n', partnerFont });
    assert.equal(r.partnerFont, 'Partnerprobe');
    const kernZiel = path.join(r.ordner, 'vivodepot.html');
    const kernText = fs.readFileSync(kernZiel, 'utf8');
    assert.match(kernText, /@vd-lib name="partnerprobe-pdf-font"/, 'der vendorte Block muss im Produkt-Exemplar stehen');
    assert.match(kernText, /_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH = Object\.freeze\(\['Partnerprobe'\]\);/, 'die Familie muss in der Vertrauensliste stehen');

    // Ende-zu-Ende: setzt zusätzlich AB_WERK_BRANDING_PRODUKT mit passender schriftart —
    // dieselbe Probe wie eine echte Branding-Modul-Einbackung, nur ohne den vollen
    // _unsigniertesModulKlassifizieren-Umweg (der ist bereits anderswo getestet).
    const mitBranding = kernText.replace(
      /const AB_WERK_BRANDING_PRODUKT = null;/,
      "const AB_WERK_BRANDING_PRODUKT = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'partnerprobe', name: 'Partner AG', farbePrimaer: '#112233', schriftart: 'Partnerprobe' };",
    );
    assert.notEqual(mitBranding, kernText, 'Testaufbau: AB_WERK_BRANDING_PRODUKT-Marker muss im geschriebenen Kern vorkommen');
    fs.writeFileSync(kernZiel, mitBranding, 'utf8');
    const vorher = process.env.KERN_HTML_PATH;
    process.env.KERN_HTML_PATH = kernZiel;
    delete require.cache[require.resolve('./load-kern.js')];
    try {
      const { ladeKern: ladeKernFrisch } = require('./load-kern.js');
      const { V } = ladeKernFrisch();
      assert.equal(V._PDF_MARKE_SCHRIFT, 'Partnerprobe', '_PDF_MARKE_SCHRIFT muss den Partner-Font auflösen, wenn Vendoring+Vertrauensliste+Branding zusammenspielen');
    } finally {
      if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
      delete require.cache[require.resolve('./load-kern.js')];
    }
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});
