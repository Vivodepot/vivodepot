'use strict';
/* ════════════════════════════════════════════════════════════════════════
   sbom-pflegen — die SBOM wird erzeugt, nicht geschrieben (A2/SBOM 30.07.2026;
   erweitert „SBOM-Pflichtfelder" 12.08.2026, BSI TR-03183 Teil 2)
   ────────────────────────────────────────────────────────────────────────
   Die SBOM entsteht komplett aus Quellen (vivodepot.html-Marker, code-listen/*.json,
   eine kleine Referenztabelle im Werkzeug) — nicht mehr aus gezielten Textersetzungen an
   einer von Hand gepflegten Datei. Diese Suite prüft: (1) die echten Repo-Dateien erzeugen
   HEUTE keine Drift, (2) eine gepflanzte Versions-Drift wird gefunden, (3) die sechs
   TR-03183-Pflichtfelder sind im erzeugten Ergebnis vollständig, (4) Rotmachbarkeit für ein
   entferntes Pflichtfeld — ohne diese Probe ist nicht belegt, dass `sbom:check` bei einer
   fehlenden Angabe wirklich anschlägt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { vdLibsInline, ersetzeEindeutig, ersetzeAlle, erzeugeSBOM } = require('../tools/sbom-pflegen.js');
const REPO = path.join(__dirname, '..');
const ECHTE_SBOM = path.join(REPO, 'vivodepot.sbom.cdx.json');
const ECHTE_HTML = path.join(REPO, 'vivodepot.html');

function tempDatei(inhalt, endung) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-sbom-test-')), 'x' + endung);
  fs.writeFileSync(p, inhalt);
  return p;
}

const HTML_SAUBER = `<!-- @vd-lib name="jspdf" version="4.2.1" license="MIT" spdx="MIT" purl="pkg:npm/jspdf@4.2.1"
     sha256="6b0863aff1f684280850cf3da6c34a43cc220f200a268e9f8050aa770bec47df" status="inline" -->
<script>/* fixture: jspdf-Platzhalterinhalt */</script>
<!-- @vd-lib name="qrcode-generator" version="1.4.4" license="MIT" spdx="MIT" purl="pkg:npm/qrcode-generator@1.4.4" status="inline" -->
<script>/* fixture: qrcode-generator-Platzhalterinhalt */</script>
<!-- @vd-lib name="docx" version="8.5.0" license="MIT" spdx="MIT" purl="pkg:npm/docx@8.5.0" status="pending-inline" -->`;

test('[SBOM-Pflege] vdLibsInline liest nur status="inline" — pending-inline (docx) bleibt aussen vor', () => {
  const libs = vdLibsInline(HTML_SAUBER);
  const namen = libs.map((l) => l.name).sort();
  assert.deepEqual(namen, ['jspdf', 'qrcode-generator'], 'docx (pending-inline) gehört nicht in die SBOM-Pflicht');
});

test('[SBOM-Pflege] echte vivodepot.html + echte SBOM: keine Drift (Positivkontrolle des Ist-Zustands)', () => {
  delete require.cache[require.resolve('../tools/sbom-pflegen.js')];
  process.argv = process.argv.filter((a) => !a.startsWith('--html') && !a.startsWith('--sbom') && !a.startsWith('--codelisten'));
  const frisch = require('../tools/sbom-pflegen.js');
  const { drift } = frisch.pruefeUndPflege();
  assert.deepEqual(drift, [], 'die echten Repo-Dateien sollen HEUTE übereinstimmen — sonst ist das ein echter Befund, kein Testfehler');
});

test('[TR-03183] die erzeugte SBOM trägt alle sechs Pflichtfelder', () => {
  const html = fs.readFileSync(ECHTE_HTML, 'utf8');
  const bisherig = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  const neu = erzeugeSBOM(html, bisherig);

  // 1. Ersteller der SBOM
  assert.ok(neu.metadata.authors && neu.metadata.authors.length, 'metadata.authors fehlt');
  assert.ok(neu.metadata.supplier && neu.metadata.supplier.name, 'metadata.supplier fehlt');

  // 4. dependencies auf oberster Ebene, jede Komponente erreichbar von "vivodepot"
  assert.ok(Array.isArray(neu.dependencies) && neu.dependencies.length, 'dependencies fehlt');
  const wurzel = neu.dependencies.find((d) => d.ref === 'vivodepot');
  assert.ok(wurzel, 'kein dependencies-Eintrag für die Wurzelkomponente "vivodepot"');
  for (const k of neu.components) {
    assert.ok(wurzel.dependsOn.includes(k.name), `${k.name} fehlt in dependsOn der Wurzel`);
    assert.ok(neu.dependencies.some((d) => d.ref === k.name), `${k.name} hat keinen eigenen dependencies-Eintrag`);
  }

  for (const k of neu.components) {
    // 2. Ersteller je Komponente
    assert.ok(k.author || k.supplier, `${k.name}: weder author noch supplier gesetzt`);
    // 3. Dateiname
    assert.ok(k.properties.some((p) => p.name === 'bsi:component:filename'), `${k.name}: kein bsi:component:filename`);
    // 5. SHA-512 zusätzlich zu SHA-256
    const algs = k.hashes.map((h) => h.alg);
    assert.ok(algs.includes('SHA-256'), `${k.name}: kein SHA-256`);
    assert.ok(algs.includes('SHA-512'), `${k.name}: kein SHA-512`);
    // 6. Executable/Archive/Structured
    for (const key of ['bsi:component:executable', 'bsi:component:archive', 'bsi:component:structured']) {
      assert.ok(k.properties.some((p) => p.name === key), `${k.name}: ${key} fehlt`);
    }
  }
});

test('[Negativprobe / Rotmachbarkeit] eine gepflanzte Versions-Drift wird gefunden', () => {
  // Volle echte HTML als Grundlage (nicht die Mini-Fixture) — font-face/Code-Listen müssen
  // vorhanden sein, damit erzeugeSBOM() durchläuft; nur die jspdf-Marker-Version wird gekippt.
  const echtesHtml = fs.readFileSync(ECHTE_HTML, 'utf8');
  const gekippt = ersetzeEindeutig(echtesHtml,
    '@vd-lib name="jspdf" version="4.2.1"', '@vd-lib name="jspdf" version="4.2.2"', 'jspdf#version-Marker')
    .split('pkg:npm/jspdf@4.2.1').join('pkg:npm/jspdf@4.2.2');
  const htmlPfad = tempDatei(gekippt, '.html');
  const sbomPfad = tempDatei(fs.readFileSync(ECHTE_SBOM, 'utf8'), '.json');

  const alteArgv = process.argv;
  process.argv = [...alteArgv.slice(0, 2), '--html', htmlPfad, '--sbom', sbomPfad];
  delete require.cache[require.resolve('../tools/sbom-pflegen.js')];
  const mit = require('../tools/sbom-pflegen.js');
  const { drift } = mit.pruefeUndPflege();
  process.argv = alteArgv;

  assert.ok(drift.some((d) => /jspdf.*Version 4\.2\.1.*4\.2\.2/.test(d)), `Drift nicht gefunden — Meldungen: ${JSON.stringify(drift)}`);

  fs.rmSync(path.dirname(htmlPfad), { recursive: true, force: true });
  fs.rmSync(path.dirname(sbomPfad), { recursive: true, force: true });
});

test('[Rotmachbarkeit] ein fehlendes Pflichtfeld im BISHERIGEN Stand wird als Drift erkannt', () => {
  const html = fs.readFileSync(ECHTE_HTML, 'utf8');
  const bisherig = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  const neu = erzeugeSBOM(html, bisherig);

  // Fixture: eine bereits vollständige SBOM, der genau EIN Feld wieder entzogen wird —
  // die eigentliche Probe für "sbom:check schlägt an, wenn ein Pflichtfeld verschwindet".
  const verletzt = JSON.parse(JSON.stringify(neu));
  delete verletzt.metadata.authors;
  const htmlPfad = tempDatei(html, '.html');
  const sbomPfad = tempDatei(JSON.stringify(verletzt, null, 2), '.json');
  fs.writeFileSync(sbomPfad, JSON.stringify(verletzt, null, 2));

  const alteArgv = process.argv;
  process.argv = [...alteArgv.slice(0, 2), '--html', htmlPfad, '--sbom', sbomPfad];
  delete require.cache[require.resolve('../tools/sbom-pflegen.js')];
  const mit = require('../tools/sbom-pflegen.js');
  const { drift } = mit.pruefeUndPflege();
  process.argv = alteArgv;

  assert.ok(drift.some((d) => /metadata\.authors ergänzt/.test(d)), `fehlendes metadata.authors wurde nicht als Drift erkannt — Meldungen: ${JSON.stringify(drift)}`);

  fs.rmSync(path.dirname(htmlPfad), { recursive: true, force: true });
  fs.rmSync(path.dirname(sbomPfad), { recursive: true, force: true });
});

test('[SBOM-Pflege] ersetzeEindeutig bricht ab, wenn die Fundstelle nicht eindeutig ist', () => {
  assert.throws(() => ersetzeEindeutig('a-X-b-X-c', 'X', 'Y', 'test'), /nicht eindeutig/);
  assert.throws(() => ersetzeEindeutig('a-b-c', 'X', 'Y', 'test'), /nicht gefunden/);
  assert.equal(ersetzeEindeutig('a-X-b', 'X', 'Y', 'test'), 'a-Y-b');
});

test('[SBOM-Pflege] ersetzeAlle ersetzt JEDES Vorkommen (freier Beschreibungstext, kein Struktur-Feld)', () => {
  assert.equal(ersetzeAlle('X und X und X', 'X', 'Y', 'test'), 'Y und Y und Y');
});

/* ── Von Hand gepflegte Komponenten (15.09.2026): erhalten, und --check meldet eine fehlende ── */

function mitSbomArgs(sbomObjekt, fn) {
  const html = fs.readFileSync(ECHTE_HTML, 'utf8');
  const htmlPfad = tempDatei(html, '.html');
  const sbomPfad = tempDatei(JSON.stringify(sbomObjekt, null, 2) + '\n', '.json');
  const alteArgv = process.argv;
  process.argv = [...alteArgv.slice(0, 2), '--html', htmlPfad, '--sbom', sbomPfad];
  delete require.cache[require.resolve('../tools/sbom-pflegen.js')];
  try {
    return fn(require('../tools/sbom-pflegen.js'), { htmlPfad, sbomPfad });
  } finally {
    process.argv = alteArgv;
    delete require.cache[require.resolve('../tools/sbom-pflegen.js')];
    fs.rmSync(path.dirname(htmlPfad), { recursive: true, force: true });
    fs.rmSync(path.dirname(sbomPfad), { recursive: true, force: true });
  }
}

test('[SBOM-Pflege·Handgepflegt] font-inter-pdf ist registriert und steht in der echten SBOM', () => {
  const { HANDGEPFLEGT } = require('../tools/sbom-pflegen.js');
  assert.ok(HANDGEPFLEGT.includes('font-inter-pdf'));
  const echt = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  assert.ok(echt.components.some((c) => c.name === 'font-inter-pdf'));
  assert.ok(echt.dependencies[0].dependsOn.includes('font-inter-pdf'));
});

test('[SBOM-Pflege·Handgepflegt] beim Neuschreiben bleibt eine nicht erzeugte Komponente an ihrer Stelle erhalten', () => {
  const html = fs.readFileSync(ECHTE_HTML, 'utf8');
  const bisherig = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  const neu = erzeugeSBOM(html, bisherig);
  assert.deepEqual(neu.components.map((c) => c.name), bisherig.components.map((c) => c.name), 'dieselben Komponenten in derselben Reihenfolge');
  const pdf = neu.components.find((c) => c.name === 'font-inter-pdf');
  assert.deepEqual(pdf, bisherig.components.find((c) => c.name === 'font-inter-pdf'), 'unverändert, die Hashes stimmen mit den Dateien');
  assert.ok(neu.dependencies[0].dependsOn.includes('font-inter-pdf'));
});

test('[SBOM-Pflege·Handgepflegt·Rot-Beweis] font-inter-pdf aus der SBOM entfernt: Drift „FEHLT“, und --check endet rot', () => {
  const ohne = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  ohne.components = ohne.components.filter((c) => c.name !== 'font-inter-pdf');
  ohne.dependencies = ohne.dependencies.filter((d) => d.ref !== 'font-inter-pdf')
    .map((d) => (d.ref === 'vivodepot' ? { ...d, dependsOn: d.dependsOn.filter((n) => n !== 'font-inter-pdf') } : d));
  mitSbomArgs(ohne, (mod, { htmlPfad, sbomPfad }) => {
    const { drift } = mod.pruefeUndPflege();
    assert.ok(drift.some((d) => /font-inter-pdf: von Hand gepflegte Komponente FEHLT/.test(d)), JSON.stringify(drift));
    const { spawnSync } = require('node:child_process');
    const lauf = spawnSync(process.execPath, [path.join(REPO, 'tools', 'sbom-pflegen.js'), '--check', '--html', htmlPfad, '--sbom', sbomPfad], { encoding: 'utf8' });
    assert.equal(lauf.status, 1, lauf.stdout + lauf.stderr);
    assert.match(lauf.stdout, /FEHLT/);
    const vorher = fs.readFileSync(sbomPfad, 'utf8');
    const schreiben = spawnSync(process.execPath, [path.join(REPO, 'tools', 'sbom-pflegen.js'), '--html', htmlPfad, '--sbom', sbomPfad], { encoding: 'utf8' });
    assert.equal(schreiben.status, 1, 'auch ohne --check wird nicht geschrieben');
    assert.equal(fs.readFileSync(sbomPfad, 'utf8'), vorher);
  });
});

test('[SBOM-Pflege·Handgepflegt·Rot-Beweis] ein falscher Hash an font-inter-pdf wird gegen die Datei erkannt', () => {
  const kaputt = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  kaputt.components.find((c) => c.name === 'font-inter-pdf').hashes[0].content = '0'.repeat(64);
  mitSbomArgs(kaputt, (mod) => {
    const { drift } = mod.pruefeUndPflege();
    assert.ok(drift.some((d) => /font-inter-pdf: Hashes weichen ab/.test(d)), JSON.stringify(drift));
  });
});

/* ── pako und xShare-Zeichen (23.09.2026) ─────────────────────────────────────────────────────────
   Beide waren eingebettet und fehlten in der SBOM. pako steckt im jsPDF-Bundle und wird dort als
   Unterkomponente geführt; die drei xShare-Zeichen sind data:-PNG im Kern. */
test('[SBOM-Pflege·pako] die echte SBOM führt pako als Unterkomponente von jspdf, Version und Lizenz aus der Kopfzeile', () => {
  const echt = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  const jspdf = echt.components.find((c) => c.name === 'jspdf');
  const pako = (jspdf.components || []).find((c) => c.name === 'pako');
  assert.ok(pako, 'pako fehlt unter jspdf');
  assert.equal(pako.version, '2.1.0');
  assert.equal(pako.licenses[0].expression, 'MIT AND Zlib');
  assert.deepEqual(echt.dependencies.find((d) => d.ref === 'jspdf').dependsOn, ['pako']);
});

test('[SBOM-Pflege·xShare] die echte SBOM führt die drei Zeichen mit SHA-256 und SHA-512 je PNG', () => {
  const echt = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  const yb = echt.components.find((c) => c.name === 'xshare-yellow-button');
  assert.ok(yb, 'xshare-yellow-button fehlt');
  assert.equal(yb.hashes.filter((h) => h.alg === 'SHA-256').length, 3);
  assert.equal(yb.hashes.filter((h) => h.alg === 'SHA-512').length, 3);
});

test('[SBOM-Pflege·pako·Rot-Beweis] ohne pako-Kopfzeile im Bundle entfällt die Unterkomponente — die Drift zeigt es', () => {
  const html = fs.readFileSync(ECHTE_HTML, 'utf8').replace('/*! pako 2.1.0', '/*! pakx 2.1.0');
  const bisherig = JSON.parse(fs.readFileSync(ECHTE_SBOM, 'utf8'));
  const neu = erzeugeSBOM(html, bisherig);
  assert.equal(neu.components.find((c) => c.name === 'jspdf').components, undefined);
});
