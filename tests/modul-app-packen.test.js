'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/modul-app-packen.js („Modul-Apps automatisiert
   packen", 30.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Wie tests/testfassung-legen.test.js: nur die reinen Funktionen (Slug-
   Prüfung, Bündel-Validierung, Dateisatz, Vermerk-Text) ohne Git/Netzwerk —
   die Vorbedingungen selbst sind Seiteneffekte auf einem fremden Klon und
   gehören nicht in die Suite.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  DATEISATZ, slugGueltig, buendelListeAusDatei, vermerkInhalt, _addPfadeFuerSlug,
  dateisatzUndIndexAblegen,
} = require('../tools/modul-app-packen.js');

const REPO = path.join(__dirname, '..');

function gueltigeJws() {
  // Form genügt (drei Punkt-getrennte Teile) — dieses Werkzeug prüft NUR die Struktur,
  // es verifiziert keine Signatur (das tut modulEinlassenGeprueft beim Import im Browser).
  return 'eyJhbGciOiJFZERTQSJ9.eyJhIjoxfQ.c2ln';
}

function mitTmpDatei(inhalt, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-app-packen-'));
  const p = path.join(tmp, 'bundle.json');
  fs.writeFileSync(p, inhalt, 'utf8');
  try { return fn(p); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

test('[Modul-App-Packen] DATEISATZ ist genau der Drei-Dateien-Satz, testfassung-lesen.html NICHT dabei', () => {
  assert.deepEqual(DATEISATZ, ['vivodepot.html', 'sw.js', 'manifest.webmanifest']);
});

test('[Modul-App-Packen] slugGueltig akzeptiert Kleinbuchstaben/Ziffern/Bindestrich', () => {
  assert.equal(slugGueltig('englisch'), true);
  assert.equal(slugGueltig('erbschein'), true);
  assert.equal(slugGueltig('vereinsamt-demo'), true);
  assert.equal(slugGueltig('a1-b2'), true);
});

test('[Modul-App-Packen] slugGueltig lehnt Pfad-Traversal und Sonderzeichen ab', () => {
  assert.equal(slugGueltig('../etwas'), false);
  assert.equal(slugGueltig('..'), false);
  assert.equal(slugGueltig('a/b'), false);
  assert.equal(slugGueltig(''), false);
  assert.equal(slugGueltig(null), false);
  assert.equal(slugGueltig('Englisch'), false, 'Großbuchstaben nicht erlaubt — ein Slug ist eine URL-Pfadkomponente');
  assert.equal(slugGueltig('-fuehrend'), false, 'führender/schließender Bindestrich nicht erlaubt');
  assert.equal(slugGueltig('doppel--strich'), false);
});

test('[Modul-App-Packen] buendelListeAusDatei akzeptiert ein einzelnes Bündel-Objekt und normalisiert zu einer Liste', () => {
  mitTmpDatei(JSON.stringify({ providerCredentialJws: gueltigeJws(), modulSignaturJws: gueltigeJws() }), (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, true);
    assert.equal(r.liste.length, 1);
  });
});

test('[Modul-App-Packen] buendelListeAusDatei akzeptiert eine Liste mehrerer Bündel', () => {
  mitTmpDatei(JSON.stringify([
    { providerCredentialJws: gueltigeJws(), modulSignaturJws: gueltigeJws() },
    { providerCredentialJws: gueltigeJws(), modulSignaturJws: gueltigeJws(), ausstellerZertifikatJws: gueltigeJws() },
  ]), (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, true);
    assert.equal(r.liste.length, 2);
  });
});

test('[Modul-App-Packen·Rot-Beweis] kein gültiges JSON wird gefangen, nicht geworfen', () => {
  mitTmpDatei('{ kaputt', (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, false);
    assert.match(r.fehler, /JSON/);
  });
});

test('[Modul-App-Packen·Rot-Beweis] fehlendes providerCredentialJws wird gefangen', () => {
  mitTmpDatei(JSON.stringify({ modulSignaturJws: gueltigeJws() }), (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, false);
    assert.match(r.fehler, /providerCredentialJws/);
  });
});

test('[Modul-App-Packen·Rot-Beweis] fehlendes modulSignaturJws wird gefangen', () => {
  mitTmpDatei(JSON.stringify({ providerCredentialJws: gueltigeJws() }), (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, false);
    assert.match(r.fehler, /modulSignaturJws/);
  });
});

test('[Modul-App-Packen·Rot-Beweis] eine JWS-Behauptung ohne drei Punkt-Teile wird gefangen', () => {
  mitTmpDatei(JSON.stringify({ providerCredentialJws: 'kein-jws', modulSignaturJws: gueltigeJws() }), (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, false);
  });
});

test('[Modul-App-Packen·Rot-Beweis] eine leere Liste wird gefangen', () => {
  mitTmpDatei('[]', (p) => {
    const r = buendelListeAusDatei(p);
    assert.equal(r.ok, false);
    assert.match(r.fehler, /leer/);
  });
});

test('[Modul-App-Packen] vermerkInhalt nennt Slug, Ziel-Pfad und Quell-Commit; ungepusht ohne Ziel-Hash (ERZEUGNIS-STEMPEL-ARBEITSSTAND)', () => {
  const text = vermerkInhalt({ slug: 'vereinsamt-demo', zielPfad: 'module-apps/vereinsamt-demo', zielCommit: 'abc1234', quellCommit: 'def5678', anzahlBuendel: 1, gepusht: false });
  assert.match(text, /vereinsamt-demo/);
  assert.match(text, /module-apps\/vereinsamt-demo/);
  assert.doesNotMatch(text, /abc1234/, 'ein ungepushter Ziel-Commit wird nicht gestempelt');
  assert.match(text, /def5678/);
  assert.match(text, /lokal, ohne Hash/);
  assert.doesNotMatch(text, /noch nicht gepusht/);
});

test('[Modul-App-Packen] vermerkInhalt zeigt "gepusht", wenn gepusht:true', () => {
  const text = vermerkInhalt({ slug: 'x', zielPfad: 'module-apps/x', zielCommit: 'a', quellCommit: 'b', anzahlBuendel: 1, gepusht: true });
  assert.match(text, /\(gepusht\)/);
});

test('[Modul-App-Packen·Rot-Beweis] _addPfadeFuerSlug baut echte Datei-Pfade, nicht das "add"-Literal mit-gemappt', () => {
  const pfade = _addPfadeFuerSlug('englisch', [...DATEISATZ, 'vorabkonfiguration.js']);
  assert.deepEqual(pfade, [
    'module-apps/englisch/vivodepot.html',
    'module-apps/englisch/sw.js',
    'module-apps/englisch/manifest.webmanifest',
    'module-apps/englisch/vorabkonfiguration.js',
  ]);
  assert.ok(!pfade.some((p) => p.endsWith('/add')), 'Regression: "add" darf nie als Dateiname im Pfad landen');
});

test('[Modul-App-Packen·Rot-Beweis] die echte Aufrufstelle übergibt beide Argumente an _addPfadeFuerSlug', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'modul-app-packen.js'), 'utf8');
  const aufruf = quelle.match(/execFileSync\('git', \['add', \.\.\._addPfadeFuerSlug\(([^)]*)\)\]/);
  assert.ok(aufruf, 'die execFileSync-add-Aufrufstelle muss gefunden werden');
  assert.match(aufruf[1], /,/, 'Regression: die Aufrufstelle rief _addPfadeFuerSlug(slug) ohne zweites Argument auf — dateien war undefined, crashte erst beim echten Lauf (nicht im Dry-Run)');
});

// U2-ADR-194 (01.09.2026): JEDE Modul-App bekommt ihre EIGENE
// index.html, die auf ihr eigenes vivodepot.html zeigt — nicht eine gemeinsame Datei.
test('[Modul-App-Packen] dateisatzUndIndexAblegen legt DATEISATZ plus eine EIGENE index.html je Ordner ab', () => {
  const zielOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-app-packen-index-'));
  try {
    dateisatzUndIndexAblegen(zielOrdner);
    for (const d of DATEISATZ) {
      assert.ok(fs.existsSync(path.join(zielOrdner, d)), d + ' muss abgelegt sein');
    }
    const index = fs.readFileSync(path.join(zielOrdner, 'index.html'), 'utf8');
    assert.match(index, /url=\.\/vivodepot\.html/, 'muss auf das vivodepot.html DESSELBEN Verzeichnisses zeigen');
  } finally { fs.rmSync(zielOrdner, { recursive: true, force: true }); }
});

test('[Modul-App-Packen] index.html gehört NICHT zu DATEISATZ — dessen Drei-Dateien-Vertrag bleibt unverändert', () => {
  assert.ok(!DATEISATZ.includes('index.html'));
});

test('[Modul-App-Packen·Rot-Beweis] packeEinzeln UND packeAlle nutzen beide dateisatzUndIndexAblegen, keine eigene Kopier-Schleife mehr', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'tools', 'modul-app-packen.js'), 'utf8');
  const treffer = quelle.match(/\bdateisatzUndIndexAblegen\(/g) || [];
  assert.equal(treffer.length, 3,
    '1× Definition + 2× Aufruf (packeEinzeln, packeAlle) erwartet — sonst kopiert eine der beiden Stellen wieder ohne index.html');
  assert.match(quelle, /_addPfadeFuerSlug\(slug, \[\.\.\.DATEISATZ, 'vorabkonfiguration\.js', 'index\.html'\]\)/,
    'packeEinzeln muss index.html mit ins git add aufnehmen');
  assert.match(quelle, /_addPfadeFuerSlug\(slug, \[\.\.\.DATEISATZ, 'index\.html'\]\)/,
    'packeAlle muss index.html mit ins git add aufnehmen');
});

/* U2-ADR-232 an der schärfsten Stelle (16.09.2026): dieses Werkzeug committet und PUSHT in ein
   FREMDES Repo. Erbt ein git-Kindprozess GIT_DIR/GIT_INDEX_FILE (Hook, oder eine Sitzung mit
   gesetzter Umgebung), schreibt er in den falschen Baum — `cwd` allein schützt nicht. Die Probe
   liest die echten Aufrufstellen, statt das Verhalten nachzubauen: ein Push-Versuch im Test wäre
   der Fehler, den sie verhindern soll. */
test('[Modul-App-Packen·Rot-Beweis] jede git-Aufrufstelle übergibt eine von GIT_* bereinigte Umgebung', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'modul-app-packen.js'), 'utf8');
  const stellen = quelle.match(/execFileSync\('git',[\s\S]*?\}\)/g) || [];
  assert.ok(stellen.length >= 6, 'Testaufbau: die git-Aufrufstellen müssen gefunden werden, gefunden: ' + stellen.length);
  const ohne = stellen.filter((s) => !/env:\s*ohneGitEnv\(\)/.test(s));
  assert.deepEqual(ohne, [], 'diese git-Aufrufstelle(n) nehmen die geerbte Git-Umgebung mit');
});

/* GÜTE, nicht Anwesenheit (16.09.2026, Hinweis): die Probe darüber und die Ratsche in
   tools/git-umgebung-pruefen.js halten nur fest, DASS `env: ohneGitEnv()` an jeder Aufrufstelle
   steht. Eine ohneGitEnv(), die nichts streift, wäre dort grün — dieselbe Familie wie die blinden
   Prüfer vom 15./16.09. Diese Probe fragt den Kindprozess selbst, denn dort wirkt es. */
test('[Modul-App-Packen·U2-ADR-232·Güte] im Kindprozess fehlen GIT_DIR und GIT_WORK_TREE, PATH bleibt', () => {
  const { ohneGitEnv } = require('../tools/modul-app-packen.js');
  const { execFileSync } = require('node:child_process');
  const vorher = { GIT_DIR: process.env.GIT_DIR, GIT_WORK_TREE: process.env.GIT_WORK_TREE, VD_PROBE: process.env.VD_PROBE };
  process.env.GIT_DIR = '/fremdes/repo/.git';
  process.env.GIT_WORK_TREE = '/fremdes/repo';
  process.env.VD_PROBE = 'bleibt';
  try {
    const imKind = JSON.parse(execFileSync(process.execPath,
      ['-e', 'process.stdout.write(JSON.stringify({ d: process.env.GIT_DIR || null, w: process.env.GIT_WORK_TREE || null, p: !!process.env.PATH, v: process.env.VD_PROBE || null }))'],
      { env: ohneGitEnv(), encoding: 'utf8' }));
    assert.equal(imKind.d, null, 'GIT_DIR kommt im Kindprozess an — ein git-Aufruf landete im Repo des Hooks');
    assert.equal(imKind.w, null, 'GIT_WORK_TREE kommt im Kindprozess an');
    assert.equal(imKind.p, true, 'PATH fehlt — die Funktion streift zu viel, git würde gar nicht gefunden');
    assert.equal(imKind.v, 'bleibt', 'eine Nicht-GIT-Variable fehlt — die Funktion streift zu viel');
  } finally {
    for (const [k, v] of Object.entries(vorher)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
