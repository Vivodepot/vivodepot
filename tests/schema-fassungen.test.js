'use strict';
/* Schema-Adressen: jede `$id` löst auf, jede Fassung bleibt (U2-ADR-488, Befund SCHEMA-ID-NICHT-AUFLOESBAR, 06.10.2026).
   Werkzeug: tools/schema-fassungen.js. Die Fassung steht im Verzeichnis docs/schema-fassungen.json, nicht im Schema. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // GIT: ältere Fassungen liegen als Blobs in der privaten Geschichte
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const S = require('../tools/schema-fassungen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const VERZ = () => S.verzeichnisLesen(fs.readFileSync(path.join(REPO, S.VERZEICHNIS), 'utf8'));
const kopie = (o) => JSON.parse(JSON.stringify(o));

/* Das Verzeichnis am eigenen Ursprung: am gemeinsamen Vorfahren von HEAD und origin/u2-kanon (19.10.2026). „Nur anhängen“ gilt
   gegenüber dem Stand, aus dem ein Zweig kommt. Gegen die Kanon-Spitze verglichen, war ein Zweig rot, der nur HINTER dem Kanon
   lag — so der Quell-Zweig einer Auslieferung auf ihrem Kern, während der Kanon schon Fassungen angehängt hatte. Beim Push des
   Zugkopfs ist der Vorfahr der Kanon selbst; die Strenge am Gate bleibt gleich. Im öffentlichen Zuschnitt fehlt origin/u2-kanon:
   dann gilt der Arbeitsstand. */
function vergleichsStand(cwd = REPO) {
  const r = spawnSync('git', ['merge-base', 'HEAD', 'origin/u2-kanon'], { cwd, env: ohneGitUmgebung(), encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}
function verzeichnisAmUrsprung(cwd = REPO, stand = vergleichsStand(cwd)) {
  if (!stand) return null;
  const r = spawnSync('git', ['show', stand + ':' + S.VERZEICHNIS], { cwd, env: ohneGitUmgebung(), encoding: 'utf8' });
  return r.status === 0 ? S.verzeichnisLesen(r.stdout) : null;
}

test('[Schema-Fassungen] jedes Schema mit $id unter vivodepot.de/schemas ist verzeichnet, jede Fassung wiederherstellbar', () => {
  assert.ok(S.schemasFinden().length >= 19, 'Nicht-leer-Wache: die Schemas werden gefunden');
  assert.deepEqual(S.pruefen({ verzeichnis: VERZ(), vorher: verzeichnisAmUrsprung() }), []);
});

/* Ein Wegwerf-Repo: Basis mit einem Eintrag; der Kanon hängt danach eine Fassung an. Zweig A liegt nur dahinter, Zweig B ändert
   einen Eintrag seiner Basis. Verglichen wird das Verzeichnis selbst über S.pruefen — die Schemas des echten Repos spielen keine Rolle. */
function ursprungsRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-ursprung-'));
  process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => { const r = spawnSync('git', a, { cwd: dir, env: ohneGitUmgebung(), encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  const schreibe = (v) => { fs.mkdirSync(path.dirname(path.join(dir, S.VERZEICHNIS)), { recursive: true }); fs.writeFileSync(path.join(dir, S.VERZEICHNIS), JSON.stringify(v)); };
  const commit = (m) => { g('add', '-A'); g('-c', 'user.name=Probe', '-c', 'user.email=probe@example.org', 'commit', '-q', '-m', m); return g('rev-parse', 'HEAD'); };
  g('init', '-q');
  const basis = kopie(VERZ());
  const name = Object.keys(basis.schemas)[0];
  schreibe(basis); const b = commit('basis');
  const kanon = kopie(basis); kanon.schemas[name].fassungen.push({ n: 99 }); schreibe(kanon); const k = commit('kanon haengt an');
  g('update-ref', 'refs/remotes/origin/u2-kanon', k);
  g('checkout', '-q', '-b', 'zweig-a', b);
  const zweigB = kopie(basis); zweigB.schemas[name].fassungen[0].blob = 'f'.repeat(40);
  return { dir, name, basis, zweigB, b, k, schreibe, commit };
}

test('[Schema-Fassungen·Ursprung] ein Zweig hinter dem Kanon ist grün; ein Zweig, der einen Eintrag seiner Basis ändert, bleibt rot', () => {
  const r = ursprungsRepo();
  assert.equal(vergleichsStand(r.dir), r.b, 'Vergleich am gemeinsamen Vorfahren, nicht an der Kanon-Spitze');
  const nurAnhaengen = (v) => S.pruefen({ verzeichnis: v, vorher: verzeichnisAmUrsprung(r.dir) }).filter((x) => x.includes('nur anhängen'));
  assert.deepEqual(nurAnhaengen(r.basis), [], 'hinter dem Kanon, nichts geändert: grün');
  r.schreibe(r.zweigB); r.commit('b aendert die Basis');
  assert.ok(nurAnhaengen(r.zweigB).some((x) => x === `${r.name}/1: alter Eintrag geändert oder gelöscht (nur anhängen)`), 'Basis-Eintrag geändert: rot');
});

test('[Schema-Fassungen·Ursprung·Rot-Beweis] gegen die Kanon-Spitze verglichen, wäre der Zweig hinter dem Kanon rot', () => {
  const r = ursprungsRepo();
  const spitze = verzeichnisAmUrsprung(r.dir, r.k);
  assert.ok(S.pruefen({ verzeichnis: r.basis, vorher: spitze }).some((x) => x.includes('nur anhängen')),
    'der frühere Vergleich meldete einen Zweig, der nur hinter dem Kanon liegt');
});

test('[Schema-Fassungen·Rot-Beweis] eine Byte-Änderung ohne neue Fassung ist rot', () => {
  const v = kopie(VERZ());
  const name = Object.keys(v.schemas)[0];
  v.schemas[name].fassungen[v.schemas[name].fassungen.length - 1].shaKanon = '0'.repeat(64);
  assert.ok(S.pruefen({ verzeichnis: v }).some((b) => b.startsWith(name + ': Bytes geändert ohne neue Fassung')));
});

test('[Schema-Fassungen·Rot-Beweis] ein neues Schema ohne Eintrag ist rot (Klassenwächter)', () => {
  const v = kopie(VERZ());
  const name = Object.keys(v.schemas)[0];
  delete v.schemas[name];
  assert.ok(S.pruefen({ verzeichnis: v }).some((b) => b === name + ': kein Eintrag im Verzeichnis (neues Schema ohne Fassung)'));
});

test('[Schema-Fassungen·nur anhängen·Rot-Beweis] ein geänderter oder gelöschter alter Eintrag ist rot', () => {
  const vorher = VERZ();
  const name = Object.keys(vorher.schemas)[0];
  const geaendert = kopie(vorher); geaendert.schemas[name].fassungen[0].blob = 'f'.repeat(40);
  assert.ok(S.pruefen({ verzeichnis: geaendert, vorher }).some((b) => b === `${name}/1: alter Eintrag geändert oder gelöscht (nur anhängen)`));
  const geloescht = kopie(vorher); delete geloescht.schemas[name];
  assert.ok(S.pruefen({ verzeichnis: geloescht, vorher }).some((b) => b === `${name}: Eintrag gelöscht (nur anhängen)`));
  // Gegenprobe: eine angehängte Fassung ist erlaubt.
  const angehaengt = kopie(vorher); angehaengt.schemas[name].fassungen.push({ n: 2 });
  assert.ok(!S.pruefen({ verzeichnis: angehaengt, vorher }).some((b) => b.includes('nur anhängen')));
});

test('[Schema-Fassungen] die ausgelieferte Fassung weicht vom Kanon nur im $id ab, mit eigener Adresse', () => {
  const v = VERZ();
  const inhalt = S.ordnerInhalt({ verzeichnis: v });
  for (const [name, e] of Object.entries(v.schemas)) {
    for (const f of e.fassungen) {
      const aus = inhalt[`schemas/${name}/${f.n}.json`];
      assert.ok(aus, `${name}/${f.n} fehlt im Ordner`);
      assert.equal(S.sha256(aus), f.shaAusgeliefert);
      assert.equal(JSON.parse(aus).$id, `${S.BASIS}${name}/${f.n}.json`);
    }
    const geltend = inhalt[`schemas/${name}-schema.json`];
    const pfad = S.schemasFinden().find((x) => x.name === name).pfad;
    assert.equal(geltend.toString('utf8'), fs.readFileSync(path.join(REPO, pfad), 'utf8'), `${name}: geltende Fassung byte-gleich mit dem Repo`);
  }
});

test('[Schema-Fassungen·Rot-Beweis] eine Abweichung außer im $id fällt auf', () => {
  const k = Buffer.from(JSON.stringify({ $id: S.BASIS + 'x-schema.json', type: 'object' }));
  assert.equal(S.nurIdVerschieden(k, S.versioniert(k, 'x', 1)), true);
  assert.equal(S.nurIdVerschieden(k, Buffer.from(JSON.stringify({ $id: S.BASIS + 'x/1.json', type: 'array' }))), false);
});

test('[Schema-Fassungen] index.json nennt nur Name, Fassung, Adresse und Prüfsumme', () => {
  const index = JSON.parse(S.ordnerInhalt({ verzeichnis: VERZ() })['schemas/index.json']);
  assert.deepEqual(Object.keys(index), ['schemas']);
  for (const z of index.schemas) assert.deepEqual(Object.keys(z).sort(), ['adresse', 'fassung', 'name', 'sha256']);
});

test('[Schema-Fassungen] eingebettete Kopien (Studio, VC-Issuer) nennen nur verzeichnete Adressen', () => {
  const ids = new Set(S.schemasFinden().map((s) => s.id));
  for (const datei of ['vivodepot-studio.html', 'vivodepot-vc-issuer.html']) {
    const text = fs.readFileSync(path.join(REPO, datei), 'utf8');
    for (const m of text.matchAll(/"\$id":\s*"(https:\/\/vivodepot\.de\/schemas\/[^"]+)"/g)) assert.ok(ids.has(m[1]), `${datei}: ${m[1]}`);
  }
});

test('[Schema-Fassungen] --ordner schreibt genau den geprüften Inhalt', () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-fassungen-'));
  try {
    const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'schema-fassungen.js'), '--ordner', ziel], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const soll = S.ordnerInhalt({ verzeichnis: VERZ() });
    for (const [rel, inhalt] of Object.entries(soll)) assert.ok(fs.readFileSync(path.join(ziel, rel)).equals(inhalt), rel);
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Schema-Fassungen·hinaus] das Verzeichnis trägt nur Name, Fassung, Adresse und Prüfsummen — keine Pfade, keine Werkzeugnamen', () => {
  assert.deepEqual(S.inhaltPruefen(VERZ()), []);
  const text = fs.readFileSync(path.join(REPO, S.VERZEICHNIS), 'utf8');
  assert.ok(!/docs\/|tools\/|\.js\b/.test(text), 'kein Repository-Pfad und kein Werkzeugname im Text');
});

test('[Schema-Fassungen·hinaus·Rot-Beweis] ein Pfad- oder Hinweisfeld fällt auf', () => {
  const v = kopie(VERZ()); const name = Object.keys(v.schemas)[0];
  v.schemas[name].pfad = 'x';
  assert.ok(S.inhaltPruefen(v).some((b) => b.startsWith(name + ': Felder außer')));
  const w = kopie(VERZ()); w.hinweis = 'x';
  assert.ok(S.inhaltPruefen(w).includes('Verzeichnis: Felder außer „schemas“'));
});
