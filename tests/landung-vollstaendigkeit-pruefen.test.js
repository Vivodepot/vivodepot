'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   LS1 (19.09.2026): tools/landung-vollstaendigkeit-pruefen.js — ist jeder Fix der Quellzweige im
   Landestand? Rot-Beweis: ein Fix, der auf einem Quellzweig liegt und im Landestand fehlt, macht den
   Lauf rot; derselbe Fix als Cherry-pick, als angepasste Fassung und als weiterentwickelte Fassung
   ist grün. Alles gegen ein Wegwerf-Repo, nie gegen das echte.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const {
  einordnen, KANDIDAT_MUSTER, schnappschussSchreiben, schnappschussLesen, zukunftsZweigeLesen,
} = require('../tools/landung-vollstaendigkeit-pruefen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const CLI = path.join(__dirname, '..', 'tools', 'landung-vollstaendigkeit-pruefen.js');
const env = ohneGitUmgebung();

const zeilen = (n, ...ersetze) => {
  const a = Array.from({ length: n }, (_, i) => 'zeile ' + (i + 1));
  for (const [i, t] of ersetze) a[i - 1] = t;
  return a.join('\n') + '\n';
};

function aufbau() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landung-voll-'));
  const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, env, encoding: 'utf8' }).trim();
  // Cherry-pick mit anderem Commit-Zeitpunkt: sonst entsteht in derselben Sekunde derselbe Hash, und der Commit wäre ein Vorfahr statt einer Kopie.
  const pick = (c) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'cherry-pick', c], { cwd: dir, env: { ...env, GIT_COMMITTER_DATE: '2030-01-01T00:00:00' }, encoding: 'utf8' });
  const schreibe = (f, t) => fs.writeFileSync(path.join(dir, f), t);
  const commit = (msg) => { g('add', '-A'); g('commit', '-q', '-m', msg); return g('rev-parse', 'HEAD'); };
  g('init', '-q', '-b', 'main');
  for (const f of ['a', 'b', 'c', 'd']) schreibe(f, zeilen(30));
  commit('basis');
  // Quellzweig: vier Fixes und ein feat
  g('checkout', '-q', '-b', 'quelle');
  schreibe('a', zeilen(30, [5, 'FIX-A'])); const fixA = commit('fix(a): eins');
  schreibe('b', zeilen(30, [5, 'FIX-B'])); const fixB = commit('fix(b): zwei');
  schreibe('c', zeilen(30, [5, 'FIX-C'])); const fixC = commit('fix(c): drei');
  schreibe('d', zeilen(30, [5, 'FIX-D'])); const fixD = commit('fix(d): vier');
  schreibe('d', zeilen(30, [5, 'FIX-D'], [20, 'FEAT'])); const feat = commit('feat: nur ein feat');
  // Landestand: A per Cherry-pick, B angepasst (Zusatzzeile weit weg), C weiterentwickelt (Kontext geändert), D fehlt
  g('checkout', '-q', 'main');
  g('checkout', '-q', '-b', 'landung');
  pick(fixA);
  schreibe('b', zeilen(30, [5, 'FIX-B'], [25, 'ZUSATZ'])); commit('landung: b angepasst');
  schreibe('c', zeilen(30, [5, 'FIX-C'], [4, 'zeile 4 ueberarbeitet'], [6, 'zeile 6 ueberarbeitet'], [3, 'zeile 3 ueberarbeitet'], [7, 'zeile 7 ueberarbeitet'])); commit('landung: c weiterentwickelt');
  g('checkout', '-q', 'quelle');
  return { dir, g, pick, fixA, fixB, fixC, fixD, feat, schreibe, commit };
}

// Ohne eigene Ausnahmeliste eine, die es nicht gibt: die echte tools/landung-bewusst-draussen.json nennt Commits des echten Repos.
const lauf = (dir, extra = []) => spawnSync('node', [CLI, '--landestand', 'landung', '--basis', 'main', '--quellen', 'refs/heads/quelle', ...(extra.includes('--ausnahmen') ? [] : ['--ausnahmen', path.join(dir, 'keine-ausnahmen.json')]), ...extra, '--json'], { cwd: dir, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

test('[Einordnung] reine Entscheidung: patch-id, inhalt, überarbeitet, teilweise, fehlt', () => {
  assert.equal(einordnen({ gleichePatchId: true, dateienGesamt: 3, dateienRueckwaerts: 0 }), 'patch-id');
  assert.equal(einordnen({ gleichePatchId: false, dateienGesamt: 3, dateienRueckwaerts: 3 }), 'inhalt');
  assert.equal(einordnen({ gleichePatchId: false, dateienGesamt: 3, dateienRueckwaerts: 0, zeilenGesamt: 10, zeilenDa: 10 }), 'ueberarbeitet');
  assert.equal(einordnen({ gleichePatchId: false, dateienGesamt: 3, dateienRueckwaerts: 1, zeilenGesamt: 10, zeilenDa: 2 }), 'teilweise');
  assert.equal(einordnen({ gleichePatchId: false, dateienGesamt: 3, dateienRueckwaerts: 0, zeilenGesamt: 10, zeilenDa: 0 }), 'fehlt');
});

test('[Wegwerf-Repo·Rot-Beweis] ein Fix, der im Landestand fehlt, macht den Lauf rot; Cherry-pick, angepasste und weiterentwickelte Fassung sind grün', () => {
  const { dir, fixA, fixB, fixC, fixD, feat } = aufbau();
  try {
    const r = lauf(dir);
    assert.equal(r.status, 1, 'ROT ERWARTET: fix(d) fehlt im Landestand. ' + r.stderr);
    const erg = JSON.parse(r.stdout).ergebnis;
    const urteil = (h) => erg.find((e) => e.hash === h).urteil;
    assert.equal(urteil(fixA), 'patch-id', 'ein Cherry-pick trägt dieselbe patch-id');
    assert.equal(urteil(fixB), 'inhalt', 'eine angepasste Fassung lässt sich rückwärts anwenden');
    assert.equal(urteil(fixC), 'ueberarbeitet', 'eine weiterentwickelte Fassung: Zeilen da, Kontext verändert');
    assert.equal(urteil(fixD), 'fehlt');
    // LS2: der Kandidatenkreis umfasst jetzt auch feat/test, nicht mehr nur fix — das feat zaehlt
    // darum schon OHNE --alle-commits mit (und fehlt hier ebenfalls, es steht auf keinem Landestand).
    assert.equal(urteil(feat), 'fehlt');
    assert.equal(erg.length, 5, 'LS2: vier fix-Commits plus das eine feat, ohne --alle-commits');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Wegwerf-Repo·Gegenprobe] stehen fix UND feat in einem weiteren Landestand (--auch), ist der Lauf grün; --alle-commits nimmt zusaetzlich ein chore mit', () => {
  const { dir, g, pick, fixD, feat } = aufbau();
  try {
    g('checkout', '-q', 'main');
    g('checkout', '-q', '-b', 'l2');
    pick(fixD);
    pick(feat);
    g('checkout', '-q', 'quelle');
    // LS2: feat zaehlt jetzt standardmaessig mit — darum muss l2 (--auch) BEIDES tragen, damit der
    // Standardlauf gruen wird. Ein chore bleibt auch mit LS2 aussen vor, ausser mit --alle-commits.
    const chore = (() => { fs.writeFileSync(path.join(dir, 'd'), zeilen(30, [5, 'FIX-D'], [20, 'FEAT'], [10, 'CHORE'])); g('add', '-A'); g('commit', '-q', '-m', 'chore: aufraeumen'); return g('rev-parse', 'HEAD'); })();
    const gruen = lauf(dir, ['--auch', 'l2']);
    assert.equal(gruen.status, 0, 'mit fix UND feat im L2-Stapel ist nichts mehr offen: ' + gruen.stdout.slice(0, 400));
    assert.ok(!JSON.parse(gruen.stdout).ergebnis.some((e) => e.hash === chore), 'ein chore ist ohne --alle-commits kein Kandidat');
    const alle = lauf(dir, ['--auch', 'l2', '--alle-commits']);
    const erg = JSON.parse(alle.stdout).ergebnis;
    assert.equal(erg.length, 6, '--alle-commits prüft zusaetzlich das chore');
    assert.equal(alle.status, 1, 'das chore ist in keinem Landestand — rot');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Ausnahmeliste·Rot-Beweis] ein fehlender Fix ist rot, mit Eintrag samt Grund in der Positivliste grün; ein Eintrag ohne Grund oder ohne Commit ist selbst rot', () => {
  const { dir, fixD, feat } = aufbau();
  try {
    const liste = path.join(dir, 'draussen.json');
    const mit = (eintraege) => { fs.writeFileSync(liste, JSON.stringify({ eintraege })); return lauf(dir, ['--ausnahmen', liste]); };
    assert.equal(mit([]).status, 1, 'ohne Ausnahme fehlt fix(d) und macht den Lauf rot');
    // LS2: feat zaehlt jetzt ebenfalls als Kandidat und fehlt hier auch — fuer den gruenen Fall
    // braucht die Positivliste darum einen Eintrag je Kandidat, nicht nur fuer fixD.
    const gruen = mit([
      { commit: fixD, grund: 'bewusst nicht gelandet: Testfall' },
      { commit: feat, grund: 'bewusst nicht gelandet: Testfall' },
    ]);
    assert.equal(gruen.status, 0, 'mit Grund steht der Fix als bewusst draußen: ' + gruen.stdout.slice(0, 300));
    assert.equal(JSON.parse(gruen.stdout).ergebnis.find((e) => e.hash === fixD).urteil, 'bewusst-draussen');
    const ohneGrund = mit([{ commit: fixD, grund: '' }]);
    assert.equal(ohneGrund.status, 1, 'ROT ERWARTET: eine Ausnahme ohne Grund darf nichts freistellen');
    assert.match(ohneGrund.stderr, /ohne Grund/);
    const tot = mit([{ commit: 'deadbeef', grund: 'x' }]);
    assert.equal(tot.status, 1);
    assert.match(tot.stderr, /keinen Commit/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[--nur-fehlt] ein teilweise gelandeter Fix blockiert nicht, ein fehlender schon; --seit-basisdatum lässt ältere Commits weg', () => {
  const { dir, fixD } = aufbau();
  try {
    const nurFehlt = lauf(dir, ['--nur-fehlt']);
    const erg = JSON.parse(nurFehlt.stdout).ergebnis;
    assert.equal(nurFehlt.status, 1, 'fix(d) fehlt und blockiert auch mit --nur-fehlt');
    assert.equal(erg.find((e) => e.hash === fixD).urteil, 'fehlt');
    // Basis-Datum: alle Commits des Quellzweigs entstanden im selben Test in derselben Sekunde wie die Basis oder danach;
    // mit einer Basis, die NACH den Fixes liegt, bleibt nichts übrig.
    const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, env, encoding: 'utf8' }).trim();
    g('checkout', '-q', 'main');
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'spaeter'], { cwd: dir, env: { ...env, GIT_COMMITTER_DATE: '2031-01-01T00:00:00' } });
    const spaet = lauf(dir, ['--seit-basisdatum']);
    assert.equal(JSON.parse(spaet.stdout).geprueft, 0, 'die Fixes sind älter als die Basis und zählen nicht');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ══ LS2 (20.09.2026, Klassenbefund nach zwei abgebrochenen L2-Pushes) ═══════════════════════ */

test('[LS2·KANDIDAT_MUSTER] fix/feat/test zaehlen als Kandidat, alles andere nicht', () => {
  for (const gut of ['fix: x', 'fix(a): x', 'fix x', 'feat: x', 'feat(a): x', 'test: x', 'test(a): x', 'FIX: gross']) {
    assert.ok(KANDIDAT_MUSTER.test(gut), gut + ' sollte als Kandidat zaehlen');
  }
  for (const schlecht of ['chore: x', 'docs: x', 'fixup: x', 'refactor: x', 'testament: x']) {
    assert.ok(!KANDIDAT_MUSTER.test(schlecht), schlecht + ' sollte NICHT als Kandidat zaehlen');
  }
});

test('[LS2·Rot-Beweis] ein feat, das im Landestand fehlt, macht den Lauf jetzt rot (LS1 liess es noch aussen vor)', () => {
  const { dir, feat } = aufbau();
  try {
    const r = lauf(dir);
    const erg = JSON.parse(r.stdout).ergebnis;
    assert.ok(erg.some((e) => e.hash === feat), 'das feat muss jetzt als Kandidat auftauchen, ohne --alle-commits');
    assert.equal(erg.find((e) => e.hash === feat).urteil, 'fehlt');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[LS2·Schnappschuss] schreibt die aktuellen Zweigspitzen, liest sie unveraendert zurueck', () => {
  const { dir } = aufbau();
  try {
    const datei = path.join(dir, 'schnappschuss.json');
    const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, env, encoding: 'utf8' }).trim();
    const spitzeVorher = g('rev-parse', 'quelle');
    const daten = schnappschussSchreiben(datei, ['refs/heads/quelle'], dir);
    assert.equal(daten.refs['refs/heads/quelle'], spitzeVorher);
    const zurueckgelesen = schnappschussLesen(datei);
    assert.deepEqual(zurueckgelesen.refs, daten.refs);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[LS2·Schnappschuss·Rot-Beweis] genau der Fund vom 19.09.: ein Commit NACH dem Schnappschuss reisst den Lauf nicht mehr ab', () => {
  // Eigener, minimaler Aufbau statt aufbau() — der Punkt hier ist die ZEITLICHE Reihenfolge
  // (Schnappschuss, DANACH ein neuer Commit), nicht die Einordnungs-Faelle der anderen Proben.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landung-schnappschuss-'));
  try {
    const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, env, encoding: 'utf8' }).trim();
    const schreibe = (f, t) => fs.writeFileSync(path.join(dir, f), t);
    const commit = (msg) => { g('add', '-A'); g('commit', '-q', '-m', msg); return g('rev-parse', 'HEAD'); };
    const datei = path.join(dir, 'schnappschuss.json');

    g('init', '-q', '-b', 'main');
    schreibe('a', 'basis\n'); commit('basis');
    g('checkout', '-q', '-b', 'quelle');
    g('checkout', '-q', 'main');
    g('checkout', '-q', '-b', 'landung');
    g('checkout', '-q', 'quelle');

    // Gate-Beginn: 'quelle' und 'landung' sind gleichauf, der Lauf ist gruen. Schnappschuss JETZT.
    schnappschussSchreiben(datei, ['refs/heads/quelle'], dir);
    const vorher = lauf(dir, ['--schnappschuss', datei]);
    assert.equal(vorher.status, 0, 'vor dem neuen Commit muss der Lauf gruen sein: ' + vorher.stdout);

    // WAEHREND des Sammelns/Gates: eine ANDERE Sitzung legt einen neuen fix auf 'quelle' an —
    // genau der Fund vom 19.09. Ohne Schnappschuss (live) reisst das den Lauf ab.
    schreibe('b', 'neu\n');
    const neuHash = commit('fix(b): waehrend des gate entstanden');

    const live = lauf(dir);
    assert.ok(JSON.parse(live.stdout).ergebnis.some((e) => e.hash === neuHash),
      'Vorbedingung: OHNE Schnappschuss sieht der Lauf den neuen Commit als Kandidat');
    assert.equal(live.status, 1, 'Vorbedingung: OHNE Schnappschuss reisst der neue Commit den Lauf ab — genau der Fund vom 19.09.');

    const mitSchnappschuss = lauf(dir, ['--schnappschuss', datei]);
    assert.equal(mitSchnappschuss.status, 0,
      'ROT WAERE FALSCH: mit dem eingefrorenen Schnappschuss gehoert der neue Commit zur naechsten Landung, nicht zu dieser: '
      + mitSchnappschuss.stdout);
    assert.ok(!JSON.parse(mitSchnappschuss.stdout).ergebnis.some((e) => e.hash === neuHash),
      'der nach dem Schnappschuss entstandene Commit darf gar nicht erst als Kandidat auftauchen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[LS2·Zukunftszweige] ein Kandidat NUR auf einem gefuehrten Zukunfts-Zweig-Muster zaehlt nicht', () => {
  const { dir, g, fixD } = aufbau();
  try {
    g('branch', '-m', 'quelle', 'l4-irgendwas-2026-09-20');
    const musterDatei = path.join(dir, 'zukunft.json');
    fs.writeFileSync(musterDatei, JSON.stringify({ muster: [{ regex: '^l4-', grund: 'Testfall' }] }));
    const r = spawnSync('node', [CLI, '--landestand', 'landung', '--basis', 'main',
      '--quellen', 'refs/heads/l4-irgendwas-2026-09-20',
      '--ausnahmen', path.join(dir, 'keine-ausnahmen.json'),
      '--zukunftszweige', musterDatei, '--json'], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(r.status, 0, 'fix(d) liegt nur auf einem Zukunfts-Zweig-Muster — kein Befund: ' + r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).ergebnis.some((e) => e.hash === fixD), 'der Commit steht weiterhin im Ergebnis, nur nicht blockierend');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[LS2·Zukunftszweige·Gegenprobe] dasselbe Muster OHNE passenden Zweig bleibt rot', () => {
  const { dir } = aufbau();
  try {
    const musterDatei = path.join(dir, 'zukunft.json');
    fs.writeFileSync(musterDatei, JSON.stringify({ muster: [{ regex: '^l4-', grund: 'Testfall' }] }));
    const r = lauf(dir, ['--zukunftszweige', musterDatei]);
    assert.equal(r.status, 1, 'der Quellzweig heisst nicht l4-… — das Muster darf hier nichts freistellen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[LS2·Zukunftszweige] ein Muster ohne Grund oder mit ungueltigem Regex ist ein Fehler, macht den Lauf rot', () => {
  assert.deepEqual(zukunftsZweigeLesen(null), { muster: [], fehler: [] });
  assert.deepEqual(zukunftsZweigeLesen(undefined), { muster: [], fehler: [] });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zukunft-muster-'));
  try {
    const datei = path.join(dir, 'zukunft.json');
    fs.writeFileSync(datei, JSON.stringify({ muster: [{ regex: '^l4-', grund: '' }, { regex: '(', grund: 'kaputt' }] }));
    const { muster, fehler } = zukunftsZweigeLesen(datei);
    assert.deepEqual(muster, []);
    assert.equal(fehler.length, 2);
    assert.match(fehler[0], /ohne Grund/);
    assert.match(fehler[1], /kein gueltiger regulaerer Ausdruck/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ══ Ausgabe-Zusicherung (21.09.2026): die Zahlen im Kopf sind die Zahlen der gedruckten Zeilen ══════════════════
   Anlass: der Kopf meldete „fehlt 3", gedruckt wurde eine Zeile; zwei der drei lagen nur auf Sicherungs-/Zukunftszweigen und
   waren namenlos in „2 weitere" zusammengefasst, teilweise und fehlt in einer Zahl. Nach dem Ausschluss zählen, jedes Urteil
   nennen, Ausgeschlossene mit Hash und Urteil, teilweise und fehlt getrennt. */
{
  const { ausgabeZeilen, URTEILE } = require('../tools/landung-vollstaendigkeit-pruefen.js');
  const eintrag = (urteil, hash, zweig) => ({ hash: hash.padEnd(40, '0'), betreff: 'x ' + urteil, urteil, datum: '2026-09-21', dateien: 4, dateienImLandestand: 1, zeilen: 10, zeilenImLandestand: 1, zweige: [zweig] });
  const fingiert = () => ({
    landestand: 'a'.repeat(40), basis: 'b'.repeat(40),
    ergebnis: [
      eintrag('patch-id', '01', 'q1'), eintrag('inhalt', '02', 'q2'), eintrag('ueberarbeitet', '03', 'q3'), eintrag('leer', '04', 'q4'),
      eintrag('bewusst-draussen', '05', 'q5'), eintrag('teilweise', '06', 'q6'), eintrag('fehlt', '07', 'q7'),
      eintrag('fehlt', '08', 'sicherung-x'), eintrag('fehlt', '09', 'zukunft-y'), eintrag('teilweise', '0a', 'sicherung-z'),
    ],
  });
  const nurAusgenommen = (e) => e.zweige.every((z) => /^sicherung-|^zukunft-/.test(z));
  // Die Probe selbst: liest den Kopf zurück und hält ihn gegen die gedruckten Zeilen.
  const kopfStimmt = (zeilen) => {
    const m = zeilen[0].match(/(\d+) Commits gezählt, (\d+) ausgeschlossen — (.*)$/);
    if (!m) return 'Kopf nicht lesbar';
    const proUrteil = Object.fromEntries(m[3].split(', ').map((p) => { const i = p.lastIndexOf(' '); return [p.slice(0, i), Number(p.slice(i + 1))]; }));
    const summe = Object.values(proUrteil).reduce((a, b) => a + b, 0);
    if (summe !== Number(m[1])) return 'Summe der Urteile ' + summe + ' ≠ gezählt ' + m[1];
    if (proUrteil.fehlt !== zeilen.filter((z) => z.startsWith('FEHLT ')).length) return 'fehlt im Kopf ≠ gedruckte FEHLT-Zeilen';
    if (proUrteil.teilweise !== zeilen.filter((z) => z.startsWith('TEILWEISE ')).length) return 'teilweise im Kopf ≠ gedruckte TEILWEISE-Zeilen';
    if (Number(m[2]) !== zeilen.filter((z) => z.startsWith('AUSGESCHLOSSEN ')).length) return 'ausgeschlossen im Kopf ≠ gedruckte AUSGESCHLOSSEN-Zeilen';
    return null;
  };

  test('[Ausgabe] der Kopf zählt nach dem Ausschluss, und jede gezählte und jede ausgeschlossene Zeile steht da', () => {
    for (const nurFehlt of [true, false]) {
      const { zeilen, fehlend } = ausgabeZeilen(fingiert(), { nurFehlt, nurAusgenommen });
      assert.equal(kopfStimmt(zeilen), null, zeilen.join('\n'));
      assert.match(zeilen[0], /7 Commits gezählt, 3 ausgeschlossen/);
      assert.match(zeilen[0], /teilweise 1, fehlt 1$/, 'teilweise und fehlt getrennt, nach dem Ausschluss');
      const draussen = zeilen.filter((z) => z.startsWith('AUSGESCHLOSSEN '));
      assert.ok(draussen.some((z) => z.includes('AUSGESCHLOSSEN fehlt 08000000')) && draussen.some((z) => z.includes('AUSGESCHLOSSEN fehlt 09000000'))
        && draussen.some((z) => z.includes('AUSGESCHLOSSEN teilweise 0a000000')), 'Hash und Urteil je Ausgeschlossenem: ' + draussen.join(' | '));
      assert.equal(fehlend.length, nurFehlt ? 1 : 2, 'blockierend: fehlt immer, teilweise nur ohne --nur-fehlt');
    }
  });

  test('[Ausgabe·Rot-Beweis] ein Kopf, der VOR dem Ausschluss zählt und die Urteile zusammenwirft, fällt durch die Probe', () => {
    const alt = ['landung-vollstaendigkeit: Landestand aaaaaaaa, Basis bbbbbbbb, 10 Commits gezählt, 3 ausgeschlossen — patch-id 1, inhalt 1, ueberarbeitet 1, leer 1, bewusst-draussen 1, teilweise 2, fehlt 3',
      'FEHLT     07000000 2026-09-21 x fehlt  [1/4 Dateien, 1/10 Zeilen; q7]'];
    assert.match(kopfStimmt(alt), /fehlt im Kopf|Summe|teilweise im Kopf|ausgeschlossen im Kopf/);
  });

  test('[Ausgabe·Rot-Beweis] ein Urteil, das der Kopf nicht kennt, macht die Ausgabe laut statt still', () => {
    const r = fingiert();
    r.ergebnis.push(eintrag('neuesUrteil', '0b', 'q8'));
    assert.throws(() => ausgabeZeilen(r, { nurFehlt: true, nurAusgenommen }), /unbekanntes Urteil neuesUrteil/);
    assert.ok(URTEILE.includes('fehlt') && URTEILE.includes('teilweise'));
  });
}

/* ── Die Meldung nennt die URSACHE, nicht nur den Commit (22.09.2026) ───────────────────────────────────
   Der Fund: ein Zweig für eine SPÄTERE Landung ohne `-l4-` im Namen (und nicht in tools/landung-zukunftszweige.json) gilt als Quelle der Landung davor; die Meldung lautete „Commit … fehlt im
   Landestand“ und nannte den Zweig nicht. Die Konvention steht im Kopf des Werkzeugs, wer den Zweig anlegt, sieht sie nicht, und der Fehler zeigt sich beim Push einer ANDEREN Sitzung. */
const textLauf = (dir, zweig) => spawnSync('node', [CLI, '--landestand', 'landung', '--basis', 'main', '--quellen', 'refs/heads/' + zweig,
  '--ausnahmen', path.join(dir, 'keine-ausnahmen.json')], { cwd: dir, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

test('[Ursache·Rot-Beweis] fehlt ein Fix auf einem Zweig ohne -l4-, nennt die Meldung den ZWEIG und beide Auswege', () => {
  const { dir, g, fixD } = aufbau();
  try {
    g('branch', '-m', 'quelle', 'vdsx-paragraphen-quellen-2026-09-22');
    const r = textLauf(dir, 'vdsx-paragraphen-quellen-2026-09-22');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp('FEHLT +' + fixD.slice(0, 8)), 'der Commit steht weiter da');
    assert.match(r.stdout, /Zweig vdsx-paragraphen-quellen-2026-09-22 gilt als Quelle DIESER Landung/, 'die Meldung nennt den Zweig als Ursache');
    assert.match(r.stdout, /„-l4-“ im Namen umbenennen/, 'Ausweg 1: umbenennen');
    assert.match(r.stdout, /tools\/landung-zukunftszweige\.json eintragen/, 'Ausweg 1b: eintragen');
    assert.match(r.stdout, /aufnehmen, oder mit Grund in tools\/landung-bewusst-draussen\.json eintragen/, 'Ausweg 2: der Commit gehört in diese Landung');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Ursache·Gegenprobe] derselbe Zweig MIT -l4- im Namen ist kein Befund und trägt keine Ursachen-Zeile', () => {
  const { dir, g } = aufbau();
  try {
    g('branch', '-m', 'quelle', 'vdsx-l4-paragraphen-quellen-2026-09-22');
    const r = textLauf(dir, 'vdsx-l4-paragraphen-quellen-2026-09-22');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /Ursache prüfen/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Ursache] ein Aufrufer ohne Zweigprädikat (älterer Aufruf von ausgabeZeilen) bekommt keine Ursachen-Zeile, nichts bricht', () => {
  const { ursachenZeile } = require('../tools/landung-vollstaendigkeit-pruefen.js');
  assert.equal(ursachenZeile({ zweige: ['irgendwas'] }), null);
  assert.equal(ursachenZeile({ zweige: ['sicherung-x'] }, (z) => /^sicherung-/.test(z)), null, 'nur ausgenommene Zweige: nichts zu nennen');
});
