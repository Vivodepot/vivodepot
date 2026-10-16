'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-limbo.test.js — der X.509-Leser des Kerns gegen die gepinnte x509-limbo-Auswahl (Entscheidung 15.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Fremdvektoren: C2SP/x509-limbo, Apache License 2.0, Commit 554528a9b0c0d95e071f55de018326f0b65a8364, Auswahl in
   tests/konformitaet/vectors/x509-limbo/ (README dort: Abruf, Umfang, Zahlen, Prüfsummen). Eingeteilt hat
   tools/x509-limbo-umfang-erzeugen.js mit openssl, VOR jedem Lauf des Lesers.

   SCHWELLE, festgelegt vor dem ersten Lauf:
   · ein angenommener FAILURE-Fall im Umfang ist ein Befund (die Probe fällt mit „Befund"), außer er steht in
     bewusst-anders.json (vier Regeln, gedeckelt, vor dem Lauf festgelegt) oder erwartet-angenommen.json (entschiedene Regel);
     ein Eintrag dort ohne Wirkung ist ebenfalls rot; befund-offen.json duldet einen Fall, der als offener Befund geführt
     wird (ob der Befund offen ist, prüft eine interne Kopplungsprobe);
   · mehr als drei abgewiesene SUCCESS-Fälle im Umfang heißen Umkehr zu pkijs (die Probe fällt mit „Umkehr zu pkijs");
     bis zu drei werden mit Kennung und Grund gelistet;
   · ein Fall mit Produktregel-Grund (nameConstraints, Richtlinie, unbekannte kritische Erweiterung, kein v3 — am Blatt oder
     an einem Anker; keyUsage oder fremde EKU am Blatt; ein Anker ohne keyCertSign) muss abgewiesen werden, gleich welches
     Ergebnis limbo erwartet;
   · ein angenommener FAILURE-Fall außerhalb des Umfangs ohne Produktregel wird mit seinem Grund gelistet, nicht still
     übergangen; SUCCESS-Fälle außerhalb ebenso.
   Gefahren wird jeder Fall über tests/lib/x509-limbo-lauf.js (dieselbe Lesart wie tools/x509-gegenprobe.js --mit-leser).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const L = require('./lib/x509-limbo-lauf.js');

const NAMEN = ['_x509Lesen', '_x509KettePruefen', '_x509ClientIdBinden'];
let _K = null;
const K = () => (_K = _K || ladeKern({ zusatzBindungen: NAMEN }).V.__zusatz);

// Gepinnt: Prüfsumme und Zahl der Fälle je Datei (README in tests/konformitaet/vectors/x509-limbo/).
const DATEIEN = {
  'umfang.json': { sha256: 'fc66b0f6565c979284e14487126f6ac4613030c8f375c10525dac2d2025c3232', faelle: 71 },
  'ausserhalb.json': { sha256: 'bf29ab6c448d58b1b707452bc29f595478e0fddaeb2a4cf7b4bd889b764821cc', faelle: 517 },
  'nur-gelistet.json': { sha256: '54b04d3d3a6e4a951a76b8b697d99857b264778d2b03372cf51440ad0bf175cf', faelle: 9214 },
};
const LIZENZ_SHA256 = 'aac73b3148f6d1d7111dbca32099f68d26c644c6813ae1e4f05f6579aa2663fe';
const SCHWELLE_SUCCESS = 3;

const lesen = (datei) => L.auswahlLesen(datei).daten;
let _ergebnisse = null;
/* Jeden Fall mit Daten einmal fahren; die Proben unten werten dieselben Ergebnisse aus. */
function ergebnisse() {
  _ergebnisse = _ergebnisse || (async () => {
    const aus = [];
    for (const datei of ['umfang.json', 'ausserhalb.json']) {
      const d = lesen(datei);
      for (const fall of d.faelle) aus.push(Object.assign({ fall }, await L.fallFahren(K(), d.zertifikate, fall)));
    }
    return aus;
  })();
  return _ergebnisse;
}
const zeile = (e) => e.fall.id + ' — erwartet ' + e.fall.erwartet + ', Leser ' + (e.angenommen ? 'nimmt an' : 'weist ab (' + e.grund + ')')
  + (e.fall.gruende.length ? '; außerhalb: ' + e.fall.gruende.join('; ') : '');

test('[X509·limbo·Auswahl] Dateien unverändert, Zahlen wie gepinnt, jeder der 9 802 Fälle genau einmal', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const ids = new Set();
  for (const [datei, soll] of Object.entries(DATEIEN)) {
    const { roh, daten } = L.auswahlLesen(datei);
    assert.equal(crypto.createHash('sha256').update(roh).digest('hex'), soll.sha256, datei + ' unverändert');
    assert.equal(daten.commit, '554528a9b0c0d95e071f55de018326f0b65a8364');
    assert.equal(daten.faelle.length, soll.faelle, datei);
    for (const f of daten.faelle) {
      const id = Array.isArray(f) ? f[0] : f.id;
      assert.ok(!ids.has(id), 'doppelt: ' + id);
      ids.add(id);
    }
  }
  assert.equal(ids.size, 9802, 'alle Fälle von limbo.json sind eingeteilt');
  const lizenz = fs.readFileSync(path.join(L.ORDNER, 'LICENSE'));
  assert.equal(crypto.createHash('sha256').update(lizenz).digest('hex'), LIZENZ_SHA256, 'Lizenztext unverändert');
  for (const f of lesen('umfang.json').faelle) assert.deepEqual(f.gruende, [], f.id + ': im Umfang heißt ohne Grund');
  for (const f of lesen('ausserhalb.json').faelle) assert.ok(f.gruende.length > 0, f.id + ': außerhalb nur mit Grund');
});

/* „Bewusst anders" (tests/konformitaet/vectors/x509-limbo/bewusst-anders.json, festgelegt vor jedem Lauf, Wort der Gegenlesung
   15.10.2026): FAILURE-Fälle im Umfang, die allein an fehlendem AKI/SKI, an Seriennummer 0, an einer fehlenden bzw. any-EKU des
   Blatts oder am AKI-Inhalt der Wurzel hängen. Nur diese vier Regeln; der Deckel ist die Zahl beim Festlegen und kann nur sinken;
   ein Eintrag ohne Wirkung ist rot.
   „Erwartet angenommen" (erwartet-angenommen.json): FAILURE-Fälle, die eine entschiedene eigene Regel annimmt; jeder Eintrag nennt
   die Konstante im Kern, die Liste ist exakt gepinnt. */
const BEWUSST_DECKEL = 13;
const BEWUSST_REGELN = ['aki-ski-fehlt', 'seriennummer-null', 'blatt-eku-fehlt-oder-any', 'aki-an-wurzel'];
const bewusst = () => lesen('bewusst-anders.json');
const ERWARTET_ANGENOMMEN = ['rfc5280::eku::ee-wrong-eku'];
const erwartet = () => lesen('erwartet-angenommen.json');

/* „Befund offen" (befund-offen.json, 15.10.2026): ein angenommener FAILURE-Fall im Umfang, der als offener Befund geführt wird.
   Hier geduldet, solange der Leser ihn annimmt; weist er ihn ab, ist die Zeile rot (Befund schließen, Zeile entfernen). Dass der
   Befund mit dieser Kennung wirklich offen ist, prüft eine interne Kopplungsprobe gegen die Befund-Ratsche. */
const befundOffen = () => lesen('befund-offen.json');

test('[X509·limbo·Befund offen] jede Zeile ein FAILURE im Umfang mit Kennung, nicht zugleich in einer anderen Liste', () => {
  const umfang = new Map(lesen('umfang.json').faelle.map((x) => [x.id, x]));
  const andere = new Set([...bewusst().faelle, ...erwartet().faelle].map((x) => x.id));
  for (const e of befundOffen().faelle) {
    assert.equal((umfang.get(e.id) || {}).erwartet, 'FAILURE', e.id + ': ein FAILURE-Fall im Umfang');
    assert.match(e.kennung, /^[A-Z0-9-]+$/, e.id);
    assert.ok(!andere.has(e.id), e.id + ': nicht zugleich bewusst anders oder erwartet angenommen');
  }
});

test('[X509·limbo·bewusst anders] nur vier Regeln, geschlossener Ankersatz, Deckel gehalten, jeder Eintrag ein FAILURE im Umfang', () => {
  const b = bewusst();
  assert.equal(b.geltungsbereich, 'Ankersatz Zugang (geschlossen)');
  assert.match(b.hinweis, /neuer Ankersatz/);
  assert.deepEqual(Object.keys(b.regeln).sort(), [...BEWUSST_REGELN].sort());
  assert.ok(b.faelle.length <= BEWUSST_DECKEL, 'der Deckel kann nur sinken: ' + b.faelle.length + ' > ' + BEWUSST_DECKEL);
  assert.equal(b.deckel, b.faelle.length, 'deckel in der Datei = Zahl der Einträge');
  const umfang = new Map(lesen('umfang.json').faelle.map((f) => [f.id, f]));
  for (const e of b.faelle) {
    assert.ok(BEWUSST_REGELN.includes(e.regel), e.id + ': Regel „' + e.regel + '" ist keine der vier');
    assert.ok(typeof e.grund === 'string' && e.grund.length > 5, e.id);
    assert.ok(umfang.has(e.id), e.id + ': Eintrag ohne Wirkung — der Fall steht nicht mehr im Umfang, Eintrag entfernen');
    assert.equal(umfang.get(e.id).erwartet, 'FAILURE', e.id);
  }
  assert.equal(new Set(b.faelle.map((e) => e.id)).size, b.faelle.length, 'kein Fall doppelt');
});

test('[X509·limbo·FAILURE im Umfang] kein Fall wird angenommen außer den bewusst anderen und erwartet angenommenen — jeder andere ist ein Befund', async (t) => {
  const failure = (await ergebnisse()).filter((e) => e.fall.art === 'im-umfang' && e.fall.erwartet === 'FAILURE');
  const offenListe = new Set(befundOffen().faelle.map((e) => e.id));
  const offenAbgewiesen = failure.filter((e) => !e.angenommen && offenListe.has(e.fall.id));
  assert.deepEqual(offenAbgewiesen.map(zeile), [], 'befund-offen.json: der Leser weist den Fall ab — Befund schließen, Zeile entfernen');
  const liste = new Set([...bewusst().faelle, ...erwartet().faelle].map((e) => e.id).concat([...offenListe]));
  const befunde = failure.filter((e) => e.angenommen && !liste.has(e.fall.id));
  for (const e of failure.filter((x) => x.angenommen && liste.has(x.fall.id))) t.diagnostic('gelistet (bewusst anders / erwartet angenommen), angenommen: ' + zeile(e));
  const ohneWirkung = failure.filter((e) => !e.angenommen && liste.has(e.fall.id));
  assert.deepEqual(befunde.map(zeile), [], 'Befund: der Leser nimmt einen FAILURE-Fall im Umfang an (Ratsche +1 je Fall, Einzelwort)');
  assert.deepEqual(ohneWirkung.map(zeile), [], 'Eintrag ohne Wirkung in bewusst-anders.json bzw. erwartet-angenommen.json: der Leser weist den Fall ab — Eintrag entfernen, Deckel senken');
});

test('[X509·limbo·SUCCESS im Umfang] angenommen; mehr als drei abgewiesene heißen Umkehr zu pkijs', async (t) => {
  const r = (await ergebnisse()).filter((e) => e.fall.art === 'im-umfang' && e.fall.erwartet === 'SUCCESS');
  assert.equal(r.length, 14, 'Vorbedingung: 14 SUCCESS-Fälle im Umfang');
  const abgewiesen = r.filter((e) => !e.angenommen);
  for (const e of abgewiesen) t.diagnostic('SUCCESS im Umfang abgewiesen: ' + zeile(e));
  assert.ok(abgewiesen.length <= SCHWELLE_SUCCESS, 'Umkehr zu pkijs: ' + abgewiesen.length + ' abgewiesene SUCCESS-Fälle im Umfang (Schwelle '
    + SCHWELLE_SUCCESS + '):\n  ' + abgewiesen.map(zeile).join('\n  '));
});

test('[X509·limbo·Produktregel] jeder Fall mit Produktregel-Grund wird abgewiesen, gleich was limbo erwartet', async () => {
  const r = (await ergebnisse()).filter((e) => e.fall.produktregel);
  assert.equal(r.length, 55, 'Vorbedingung: die 55 Produktregel-Fälle mit Daten sind da');
  assert.deepEqual(r.filter((e) => e.angenommen).map(zeile), [], 'Befund: ein Fall, den eine Produktregel abweisen muss, wird angenommen');
});

test('[X509·limbo·außerhalb] angenommene FAILURE- und alle SUCCESS-Fälle außerhalb stehen mit Grund in der Ausgabe', async (t) => {
  const r = (await ergebnisse()).filter((e) => e.fall.art === 'ausserhalb' && !e.fall.produktregel);
  const failureAngenommen = r.filter((e) => e.fall.erwartet === 'FAILURE' && e.angenommen);
  for (const e of failureAngenommen) t.diagnostic('FAILURE außerhalb angenommen (einzeln zu bewerten): ' + zeile(e));
  for (const e of r.filter((x) => x.fall.erwartet === 'SUCCESS')) t.diagnostic('SUCCESS außerhalb: ' + zeile(e));
  const g = lesen('nur-gelistet.json');
  const je = {};
  for (const [, , n] of g.faelle) je[g.gruende[n]] = (je[g.gruende[n]] || 0) + 1;
  for (const [grund, zahl] of Object.entries(je)) t.diagnostic('nur gelistet, ohne Daten: ' + zahl + ' Fälle — ' + grund);
  assert.equal(Object.values(je).reduce((a, b) => a + b, 0), DATEIEN['nur-gelistet.json'].faelle);
  // Kein Fall verschwindet still: jeder gefahrene Fall hat ein Ergebnis mit Grund oder ist angenommen.
  for (const e of await ergebnisse()) assert.ok(e.angenommen || typeof e.grund === 'string', e.fall.id);
});
