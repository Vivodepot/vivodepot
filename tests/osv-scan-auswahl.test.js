'use strict';
/* Jeder Eintrag der Stückliste ist im Schwachstellen-Scan oder benannt ausgenommen (Befund OSV-SCAN-FRAGT-INS-LEERE, 11.10.2026).
   Bis dahin fiel ein unbekannter purl-Typ still auf npm zurück, und abgefragt wurde mit Name und Fassung des
   Stücklisten-Eintrags. Für die eingebettete Krypto-Bibliothek hieß das: eine Abfrage, die nichts treffen kann, und
   deren leere Antwort als „kein Fund“ zählte.

   Diese Probe ruft die Aufteilung des Scans (`--auswahl`), ohne Netz. Ob die Datenbank antwortet, prüft der Scan selbst
   in seinem Lauf (Kontroll-Abfrage), nicht die Suite.

   ROT-BEWEIS, GEMESSEN (11.10.2026): gegen den Scan vor dieser Änderung gibt es `--auswahl` nicht; seine Auswahl-Funktion
   fragte noble-ed25519 als npm · „noble-ed25519“ · „fa14496“ und führte die dreizehn Einträge ohne purl nirgends. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const SCAN = path.join(REPO, 'scripts', 'osv-scan.py');
const SBOM = path.join(REPO, 'vivodepot.sbom.cdx.json');

function auswahl(sbomPfad) {
  const r = spawnSync('python3', [SCAN, '--auswahl', '--sbom', sbomPfad], { encoding: 'utf8' });
  assert.equal(r.error, undefined, 'python3 ist aufrufbar (der pre-commit fährt den Scan damit)');
  return { status: r.status, ...JSON.parse(r.stdout) };
}
/* Eine erfundene Stückliste in einem Wegwerf-Verzeichnis. */
function mitStueckliste(components, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-osv-auswahl-'));
  try {
    const datei = path.join(dir, 'sbom.json');
    fs.writeFileSync(datei, JSON.stringify({ components }));
    return fn(auswahl(datei));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[OSV-Auswahl·Bestand] jeder Eintrag der Stückliste ist abgefragt oder benannt ausgenommen, keiner weder noch', () => {
  const eintraege = JSON.parse(fs.readFileSync(SBOM, 'utf8')).components.map((c) => c.name).sort();
  const a = auswahl(SBOM);
  assert.deepEqual(a.fehler, [], 'weder abgefragt noch ausgenommen');
  assert.equal(a.status, 0);
  const gedeckt = a.abfragen.map((x) => x.eintrag).concat(a.ausgenommen.map((x) => x.eintrag)).sort();
  assert.deepEqual(gedeckt, eintraege, 'die Aufteilung nennt genau die Einträge der Stückliste, jeden einmal');
  for (const x of a.ausgenommen) assert.ok(x.grund && x.grund.length >= 4, x.eintrag + ' ist mit Grund ausgenommen');
});

test('[OSV-Auswahl·Bestand] die Krypto-Bibliothek wird unter ihrem Paketnamen abgefragt, ohne Fassung', () => {
  const n = auswahl(SBOM).abfragen.find((x) => x.eintrag === 'noble-ed25519');
  assert.ok(n, 'noble-ed25519 steht unter den abgefragten Einträgen');
  assert.deepEqual([n.ecosystem, n.name, n.version], ['npm', '@noble/ed25519', null]);
});

test('[OSV-Auswahl·Bestand] ein Paket mit Fassung wird mit Paket und Fassung aus der purl abgefragt', () => {
  const j = auswahl(SBOM).abfragen.find((x) => x.eintrag === 'jspdf');
  const purl = JSON.parse(fs.readFileSync(SBOM, 'utf8')).components.find((c) => c.name === 'jspdf').purl;
  assert.equal('pkg:npm/' + j.name + '@' + j.version, purl);
});

test('[OSV-Auswahl·Rot-Beweis] ein purl-Typ ohne Zuordnung ist ein Fehler, kein Rückfall auf npm', () => {
  mitStueckliste([{ name: 'fremd', version: 'abc1234', purl: 'pkg:github/jemand/fremd@abc1234' }], (a) => {
    assert.equal(a.status, 2);
    assert.deepEqual(a.abfragen, []);
    assert.equal(a.fehler.length, 1);
    assert.match(a.fehler[0].warum, /purl-Typ „github“ ohne ZUORDNUNG/);
  });
});

test('[OSV-Auswahl·Rot-Beweis] eine npm-purl ohne Fassung und ohne Zuordnung ist ein Fehler', () => {
  mitStueckliste([{ name: 'irgendwas', version: 'auswahl', purl: 'pkg:npm/irgendwas' }], (a) => {
    assert.equal(a.status, 2);
    assert.match(a.fehler[0].warum, /purl ohne Fassung/);
  });
});

test('[OSV-Auswahl·Rot-Beweis] ein neuer Eintrag ohne purl, der nicht ausgenommen ist, ist ein Fehler', () => {
  mitStueckliste([{ name: 'neue-bibliothek', version: '1.0.0' }, { name: 'font-inter', version: 'x' }], (a) => {
    assert.equal(a.status, 2);
    assert.deepEqual(a.fehler.map((f) => f.eintrag), ['neue-bibliothek']);
    assert.deepEqual(a.ausgenommen.map((x) => x.eintrag), ['font-inter'], 'der benannte bleibt ausgenommen');
  });
});

test('[OSV-Auswahl] die Fassung kommt aus der purl, nicht aus dem Feld version des Eintrags; ein Namensraum bleibt erhalten', () => {
  mitStueckliste([{ name: 'anzeigename', version: 'falsch', purl: 'pkg:npm/%40bereich/paket@2.3.4' }], (a) => {
    assert.equal(a.status, 0);
    assert.deepEqual([a.abfragen[0].name, a.abfragen[0].version], ['@bereich/paket', '2.3.4']);
  });
});
