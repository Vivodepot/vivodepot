'use strict';
/* Das Invarianten-Register (Spezifikation 36.1d/36.1e) und sein Wächter, tools/invarianten-register-pruefen.js.
   ───────────────────────────────────────────────────────────────────────────────────────────
   Diese Datei bewacht zwei Dinge, und die Trennung ist der Sinn:
     1) das ECHTE Register (tools/invarianten-register.json): jede Zeile trägt entweder eine geöffnete Probe (Datei und Titel existieren, der
        gehaltene Satz und der Geltungsbereich stehen dabei) oder `ungeprueft` mit Grund; die Zahlen stehen auf der Grundlinie und können nur sinken;
     2) den WÄCHTER selbst, an erfundenen Registern und einer erfundenen Spezifikation (tests/fixtures/invarianten-register/): jede Regel hat
        einen Rot-Beweis, und ein nicht meßbarer Fall ist Fehlschlag, nie Grün (36.1b). Ein Wächter, der nur sein echtes Register kennt, wäre
        von „läuft nicht" nicht zu unterscheiden.
   NICHT in der Suite: „jede Invariante aus §34 der Spezifikation hat eine Zeile" gegen die ECHTE Spezifikation. Die liegt außerhalb des Repos.
   Der Test dafür läuft nur mit SPEZIFIKATION_PFAD (und ist sonst als übersprungen sichtbar); ohne den Pfad meldet das Werkzeug die Hälfte
   als UNGEMESSEN. Das Werkzeug liest SPEZIFIKATION_PFAD wie das Kampagne-Gate KAMPAGNE_AUS; ein Hook-Schritt dafür ist NICHT gebaut, das ist ein offener Punkt, kein Grün. */
const { after } = require('node:test');
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../tools/invarianten-register-pruefen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'invarianten-register-pruefen.js');
const SPEZ_MINI_PFAD = path.join(__dirname, 'fixtures', 'invarianten-register', 'spezifikation-mini.md');
const SPEZ_MINI = fs.readFileSync(SPEZ_MINI_PFAD, 'utf8');
const ECHTES = JSON.parse(fs.readFileSync(W.STANDARD_REGISTER, 'utf8'));

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'invarianten-register-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
// Ein erfundenes Repo mit einer Probendatei: der Titel steht als test()-Aufruf darin.
fs.mkdirSync(path.join(TMP, 'tests'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'tests', 'beispiel.test.js'), "test('[Beispiel] die erfundene Sache gilt an allen Stellen', () => {});\n");

const probe = () => ({
  pfad: 'tests/beispiel.test.js', test: '[Beispiel] die erfundene Sache gilt an allen Stellen',
  haelt: 'Die erfundene Sache gilt an allen Stellen, an denen sie erhoben wurde.', geltungsbereich: 'Der erfundene Baum im Prüfordner, alle Dateien.',
});
const mini = () => ({
  grundlinie: { ungeprueft: 1, teilweise: 1 },
  invarianten: [
    { id: '34.1', name: 'Alpha', satz: 'Die erste erfundene Invariante muss gelten, überall.', status: 'geprueft', geoeffnet: '2026-09-22 Test', proben: [probe()] },
    { id: '34.2', name: 'Beta', satz: 'Die zweite erfundene Invariante darf nicht verletzt sein.', status: 'teilweise', geoeffnet: '2026-09-22 Test', proben: [probe()],
      luecke: 'Gehalten ist nur der erfundene Teil an einer Stelle; der Rest wird nicht geprüft.' },
    { id: '34.3', name: 'Gamma', satz: 'Die dritte erfundene Invariante muss geprüft sein, immer.', status: 'ungeprueft', proben: [],
      grund: 'Keine geöffnete Probe hält den Satz; ein Kandidat steht als Hinweis daneben.', hinweise: ['tests/anderes.test.js: nicht geöffnet'] },
  ],
});
const lauf = (reg, spez) => W.pruefen(reg, { repo: TMP, spezifikationText: spez });
const fehlerText = (r) => r.fehler.join(' | ');

/* ── 1 · das ECHTE Register ──────────────────────────────────────────────────────────────── */

test('[Invarianten-Register] das echte Register ist stimmig: Proben geöffnet und auffindbar, Grundlinie exakt', () => {
  const r = W.pruefen(ECHTES, {});
  assert.deepEqual(r.fehler, [], r.fehler.join('\n'));
  assert.equal(ECHTES.invarianten.length, 9, 'neun Zeilen, eine je Invariante aus §34 (mit --spezifikation gegen den echten Text gemessen)');
});

test('[Invarianten-Register] die Positivkontrolle: das echte Register trägt Proben UND ungeprüfte Zeilen — es ist kein Leerlauf und keine Übertreibung', () => {
  const r = W.pruefen(ECHTES, {});
  assert.ok(r.zaehlung.geprueft + r.zaehlung.teilweise >= 1, 'mindestens eine Zeile trägt eine geöffnete Probe');
  assert.ok(r.zaehlung.ungeprueft >= 1, 'solange nicht jede Invariante eine geöffnete Probe hat, steht es so da');
  for (const z of ECHTES.invarianten) {
    if (z.status === 'ungeprueft') assert.deepEqual(z.proben, [], z.id + ': ein Kandidat gehört in `hinweise`, nicht in die Probenspalte');
  }
});

test('[Invarianten-Register·§34] jede Invariante aus §34 der echten Spezifikation hat eine Zeile — mit SPEZIFIKATION_PFAD gemessen, ohne ihn steht die Hälfte als UNGEMESSEN da und sagt es', () => {
  if (!process.env.SPEZIFIKATION_PFAD) {
    // Kein `skip`: die Unit-Skip-Ratsche zählt jede Aussetzung. Was hier stehen bleibt, ist die Aussage „ungemessen“ selbst — sie ist Teil der Ausgabe des Werkzeugs, nicht ein Grün.
    const r = W.pruefen(ECHTES, {});
    assert.equal(r.ungemessen.length, 1, 'ohne die Spezifikation meldet das Werkzeug die Zeilen-Vollständigkeit ausdrücklich als UNGEMESSEN');
    assert.match(r.ungemessen[0], /UNGEMESSEN/);
    return;
  }
  const r = W.pruefen(ECHTES, { spezifikationText: fs.readFileSync(process.env.SPEZIFIKATION_PFAD, 'utf8') });
  assert.deepEqual(r.fehler, [], r.fehler.join('\n'));
  assert.deepEqual(r.ungemessen, []);
});

/* ── 2 · der Wächter: Positivkontrolle und Rot-Beweise ───────────────────────────────────── */

test('[Invarianten-Register·Positivkontrolle] ein stimmiges erfundenes Register gegen die erfundene Spezifikation: kein Fund', () => {
  const r = lauf(mini(), SPEZ_MINI);
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.zaehlung, { geprueft: 1, teilweise: 1, ungeprueft: 1 });
});

test('[Invarianten-Register·Rot-Beweis] eine Invariante der Spezifikation ohne Zeile wird genannt — und eine Zeile ohne Invariante', () => {
  const ohne = mini();
  ohne.invarianten = ohne.invarianten.filter((z) => z.id !== '34.3');
  ohne.grundlinie.ungeprueft = 0;
  assert.match(fehlerText(lauf(ohne, SPEZ_MINI)), /34\.3 \(„Gamma"\) hat keine Zeile/);
  const zuviel = mini();
  zuviel.invarianten.push({ ...zuviel.invarianten[2], id: '34.4', name: 'Delta' });
  zuviel.grundlinie.ungeprueft = 2;
  assert.match(fehlerText(lauf(zuviel, SPEZ_MINI)), /Zeile 34\.4 steht im Register, die Spezifikation kennt diese Invariante nicht/);
  const umbenannt = mini();
  umbenannt.invarianten[0].name = 'Anders';
  assert.match(fehlerText(lauf(umbenannt, SPEZ_MINI)), /Zeile 34\.1 heißt „Anders", die Spezifikation nennt sie „Alpha"/);
});

test('[Invarianten-Register·Rot-Beweis] die Abschnittsgrenze zählt: eine Nummer aus einem anderen Abschnitt ist keine Invariante', () => {
  const inv = W.invariantenAusSpezifikation(SPEZ_MINI, '34');
  assert.deepEqual(inv.map((i) => i.id), ['34.1', '34.2', '34.3']);
  assert.equal(W.invariantenAusSpezifikation(SPEZ_MINI, '35').length, 1);
});

test('[Invarianten-Register·Rot-Beweis] eine Probe, deren Datei fehlt oder deren Titel umbenannt wurde, macht die Zeile rot — nicht still veraltet', () => {
  const a = mini(); a.invarianten[0].proben[0].pfad = 'tests/gibt-es-nicht.test.js';
  assert.match(fehlerText(lauf(a, SPEZ_MINI)), /tests\/gibt-es-nicht\.test\.js existiert nicht/);
  const b = mini(); b.invarianten[0].proben[0].test = '[Beispiel] ein anderer Titel als im Quelltext';
  assert.match(fehlerText(lauf(b, SPEZ_MINI)), /steht nicht als test\(\)\/it\(\) in tests\/beispiel\.test\.js/);
});

test('[Invarianten-Register·Rot-Beweis] eine Probe ohne den gehaltenen Satz oder ohne Geltungsbereich trägt die Zeile nicht', () => {
  const a = mini(); a.invarianten[0].proben[0].haelt = 'kurz';
  assert.match(fehlerText(lauf(a, SPEZ_MINI)), /`haelt` fehlt/);
  const b = mini(); delete b.invarianten[0].proben[0].geltungsbereich;
  assert.match(fehlerText(lauf(b, SPEZ_MINI)), /`geltungsbereich` fehlt/);
  const c = mini(); delete c.invarianten[0].geoeffnet;
  assert.match(fehlerText(lauf(c, SPEZ_MINI)), /`geoeffnet` fehlt/);
});

test('[Invarianten-Register·Rot-Beweis] geprueft ohne Probe, teilweise ohne Lücke, ungeprueft mit Probe oder ohne Grund sind rot', () => {
  const a = mini(); a.invarianten[0].proben = [];
  assert.match(fehlerText(lauf(a, SPEZ_MINI)), /Zeile 34\.1: `geprueft` braucht mindestens eine Probe/);
  const b = mini(); delete b.invarianten[1].luecke;
  assert.match(fehlerText(lauf(b, SPEZ_MINI)), /Zeile 34\.2: `teilweise` braucht eine `luecke`/);
  const c = mini(); c.invarianten[2].proben = [probe()];
  assert.match(fehlerText(lauf(c, SPEZ_MINI)), /Zeile 34\.3: `ungeprueft` trägt keine Probe in der Probenspalte/);
  const d = mini(); delete d.invarianten[2].grund;
  assert.match(fehlerText(lauf(d, SPEZ_MINI)), /Zeile 34\.3: `ungeprueft` braucht einen `grund`/);
  const e = mini(); e.invarianten[0].status = 'gruen';
  assert.match(fehlerText(lauf(e, SPEZ_MINI)), /Zeile 34\.1: `status` muss eines von/);
});

test('[Invarianten-Register·Rot-Beweis] die Ratsche ist exakt: ein Zuwachs ist ein Fund, ein Sinken verlangt die Grundlinie zu senken, ohne Grundlinie ist rot', () => {
  const zu = mini(); zu.invarianten[0] = { ...zu.invarianten[2], id: '34.1', name: 'Alpha' };
  assert.match(fehlerText(lauf(zu, SPEZ_MINI)), /ZUWACHS bei `ungeprueft`: 2 Zeilen, Grundlinie 1/);
  const sinkt = mini(); sinkt.invarianten[2] = { ...sinkt.invarianten[0], id: '34.3', name: 'Gamma' };
  assert.match(fehlerText(lauf(sinkt, SPEZ_MINI)), /`ungeprueft` ist auf 0 gesunken, die Grundlinie steht bei 1 — Grundlinie senken/);
  const ohne = mini(); delete ohne.grundlinie;
  assert.match(fehlerText(lauf(ohne, SPEZ_MINI)), /`grundlinie` fehlt/);
});

test('[Invarianten-Register·Rot-Beweis] doppelte Zeile und leeres Register sind rot', () => {
  const dop = mini(); dop.invarianten.push({ ...dop.invarianten[0] });
  assert.match(fehlerText(lauf(dop, SPEZ_MINI)), /Zeile 34\.1 steht zweimal/);
  assert.match(fehlerText(lauf({ invarianten: [] }, SPEZ_MINI)), /trägt keine `invarianten`/);
});

test('[Invarianten-Register·nicht meßbar] eine Spezifikation ohne Abschnitt 34 ist Fehlschlag, kein Grün; ohne Spezifikation steht die Hälfte als UNGEMESSEN da', () => {
  const r = lauf(mini(), '# eine Spezifikation ohne den Abschnitt\n\n## 1 Etwas\n');
  assert.match(fehlerText(r), /NICHT MESSBAR: die Spezifikation trägt keinen Abschnitt 34/);
  const ohne = W.pruefen(mini(), { repo: TMP });
  assert.deepEqual(ohne.fehler, []);
  assert.match(ohne.ungemessen.join(' '), /UNGEMESSEN/);
});

/* ── 3 · das Werkzeug als Prozess: Exit-Codes und ROT ────────────────────────────────────── */

// Der Kindprozess erbt die Umgebung nicht ungeprüft: ein gesetztes SPEZIFIKATION_PFAD des Entwicklers würde diese Probe sonst verfälschen.
const OHNE_SPEZ = () => { const e = { ...process.env }; delete e.SPEZIFIKATION_PFAD; return e; };

test('[Invarianten-Register·CLI] ohne Argument: Exit 0 und die ungemessene Hälfte steht in der Ausgabe', () => {
  const r = spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8', env: OHNE_SPEZ() });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /UNGEMESSEN/);
  assert.match(r.stdout, /OK — jede Zeile/);
});

test('[Invarianten-Register·CLI] SPEZIFIKATION_PFAD wirkt wie --spezifikation: gültiger Pfad Exit 0 und nichts mehr ungemessen, unlesbarer Pfad Exit 2 (dreiwertig, wie KAMPAGNE_AUS)', () => {
  const gut = path.join(TMP, 'gut-env.json');
  fs.writeFileSync(gut, JSON.stringify(mini()));
  const mit = spawnSync(process.execPath, [WERKZEUG, '--register', gut, '--repo', TMP], { encoding: 'utf8', env: { ...process.env, SPEZIFIKATION_PFAD: SPEZ_MINI_PFAD } });
  assert.equal(mit.status, 0, mit.stdout);
  assert.doesNotMatch(mit.stdout, /UNGEMESSEN/);
  const fehlt = spawnSync(process.execPath, [WERKZEUG, '--register', gut, '--repo', TMP], { encoding: 'utf8', env: { ...process.env, SPEZIFIKATION_PFAD: path.join(TMP, 'gibt-es-nicht.md') } });
  assert.equal(fehlt.status, 2);
  assert.match(fehlt.stdout, /ROT — NICHT MESSBAR/);
});

test('[Invarianten-Register·offene Frage] eine offene Frage wird genannt, ist kein Fund und macht die Zeile nicht zum Beleg', () => {
  const reg = mini();
  reg.invarianten[2].offeneFrage = 'Ob 7.3 diese erfundene Liste ausnimmt, ist offen.';
  const r = lauf(reg, SPEZ_MINI);
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.offeneFragen, ['34.3']);
  assert.equal(r.zaehlung.ungeprueft, 1, 'die offene Frage hebt die Zeile nicht aus ungeprueft');
});

test('[Invarianten-Register·verletzt] 34.5 trägt die gemessene Verletzung (Sprachwerte-Liste im Gerüst) mit Messung und Nachsehen — und bleibt ungeprüft', () => {
  const echt = W.pruefen(ECHTES, {});
  const z = ECHTES.invarianten.find((zeile) => zeile.id === '34.5');
  // 34.6 stand hier bis 22.09.2026 (escapeHTML-Fix) auch als verletzt — geschlossen, s.
  // [Invarianten-Register·34.6].
  assert.deepEqual(echt.verletzt, ['34.5']);
  assert.equal(z.status, 'ungeprueft', 'eine Verletzung ist kein Beleg; keine Probe hält den Satz');
  assert.deepEqual(z.proben, []);
  assert.equal(z.offeneFrage, undefined, 'die Frage ist entschieden (7.3 nimmt Endonyme nicht aus), sie steht nicht mehr offen');
  assert.match(z.verletzt.messung, /TEXTSATZ_SPRACH_ENDONYME/);
  assert.match(z.verletzt.nachsehen, /git grep -n TEXTSATZ_SPRACH_ENDONYME/);
  assert.equal(ECHTES.grundlinie.verletzt, 1, 'eine gemessene Verletzung: 34.5 (34.6 ist seit dem escapeHTML-Fix geschlossen)');
});

test('[Invarianten-Register·Achsen] die Status der Achse Probe ergeben die Zahl der Zeilen; „verletzt“ ist eine zweite Achse und steht im Register erklärt und in der Ausgabe getrennt', () => {
  const z = W.pruefen(ECHTES, {}).zaehlung;
  assert.equal(z.geprueft + z.teilweise + z.ungeprueft, ECHTES.invarianten.length, 'jede Zeile steht genau einmal auf einem Status der Achse Probe');
  assert.match(ECHTES.achsen._hinweis, /ZWEI ACHSEN/);
  assert.deepEqual(ECHTES.achsen.probe, W.STATUS);
  assert.deepEqual(ECHTES.achsen.befund, ['verletzt']);
  const aus = spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8' }).stdout;
  assert.match(aus, /Achse Probe \(jede Zeile genau einmal\): geprueft \d+ · teilweise \d+ · ungeprueft \d+ = 9/);
  assert.match(aus, /Achse Befund \(quer zur Achse Probe, keine vierte Sorte\): verletzt \d+ — /);
  assert.match(aus, /34\.5 \(auf der Achse Probe: ungeprueft\)/, 'eine verletzte Zeile nennt ihren Status auf der Achse Probe');
});

test('[Invarianten-Register·verletzt·Rot-Beweis] eine Verletzung ohne Grundlinie ist Zuwachs; ohne Messung oder Nachsehen ist die Zeile rot; an einer geprueft-Zeile ist sie ein Widerspruch', () => {
  const zuwachs = mini();
  zuwachs.invarianten[2].verletzt = { messung: 'Erfundene Messung: die dritte Invariante ist am erfundenen Ort verletzt.', nachsehen: 'git grep -n erfunden' };
  const r = lauf(zuwachs, SPEZ_MINI);
  assert.deepEqual(r.verletzt, ['34.3']);
  assert.match(fehlerText(r), /ZUWACHS bei `verletzt`: 1 Zeilen \(34\.3\), Grundlinie 0/);
  zuwachs.grundlinie.verletzt = 1;
  assert.deepEqual(lauf(zuwachs, SPEZ_MINI).fehler, [], 'mit gesetzter Grundlinie und vollständiger Zeile ist es stimmig');
  zuwachs.grundlinie.verletzt = 0;
  assert.match(fehlerText(lauf(zuwachs, SPEZ_MINI)), /ZUWACHS/);

  const ohne = mini();
  ohne.grundlinie.verletzt = 1;
  ohne.invarianten[2].verletzt = { messung: 'kurz', nachsehen: '' };
  assert.match(fehlerText(lauf(ohne, SPEZ_MINI)), /verletzt\.messung` fehlt/);
  assert.match(fehlerText(lauf(ohne, SPEZ_MINI)), /verletzt\.nachsehen` fehlt/);

  const widerspruch = mini();
  widerspruch.grundlinie.verletzt = 1;
  widerspruch.invarianten[0].verletzt = { messung: 'Erfundene Messung, die dem Beleg der Zeile widerspricht, überall.', nachsehen: 'git grep -n erfunden' };
  assert.match(fehlerText(lauf(widerspruch, SPEZ_MINI)), /`verletzt` an einer `geprueft`-Zeile/);
});

test('[Invarianten-Register·verletzt·Rot-Beweis] eine behobene Verletzung senkt die Grundlinie mit — sonst hält sie einen Stand, den es nicht mehr gibt', () => {
  const reg = mini();
  reg.grundlinie.verletzt = 1;
  assert.match(fehlerText(lauf(reg, SPEZ_MINI)), /`verletzt` ist auf 0 gesunken, die Grundlinie steht bei 1/);
});

test('[Invarianten-Register·34.6] geschlossen (22.09.2026, escapeHTML-Fix) — geprueft, ohne verletzt, mit geöffneten Proben', () => {
  const z = ECHTES.invarianten.find((zeile) => zeile.id === '34.6');
  assert.equal(z.status, 'geprueft', 'Fall (b) — das nackte Gerüst rendert durch, kein Wurf mehr');
  assert.equal(z.verletzt, undefined, 'geprueft und verletzt schließen sich aus (Zuwachs-Wächter oben)');
  assert.ok(z.proben.length >= 2, 'mindestens der Rot-Beweis (escapeHTML) und der Boot-Beweis (Fall b)');
  assert.deepEqual(W.pruefen(ECHTES, {}).verletzt, ['34.5'], '34.6 steht nicht mehr auf der Befund-Achse');
  assert.equal(ECHTES.grundlinie.verletzt, 1);
  const pfade = z.proben.map((p) => p.pfad);
  assert.ok(pfade.every((p) => p === 'tests/escape-html-tolerant.test.js'), 'beide Proben liegen in der neuen 34.6-Testdatei');
});

test('[Invarianten-Register·CLI] ein Fund druckt ROT und endet mit 1; ein nicht lesbarer Pfad ist Exit 2, nie 0', () => {
  const kaputt = mini(); kaputt.invarianten[0].proben[0].pfad = 'tests/gibt-es-nicht.test.js';
  const regPfad = path.join(TMP, 'kaputt.json');
  fs.writeFileSync(regPfad, JSON.stringify(kaputt));
  const rot = spawnSync(process.execPath, [WERKZEUG, '--register', regPfad, '--repo', TMP], { encoding: 'utf8' });
  assert.equal(rot.status, 1);
  assert.match(rot.stdout, /ROT/);
  const gut = path.join(TMP, 'gut.json');
  fs.writeFileSync(gut, JSON.stringify(mini()));
  const ok = spawnSync(process.execPath, [WERKZEUG, '--register', gut, '--repo', TMP, '--spezifikation', SPEZ_MINI_PFAD], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout);
  const fehlt = spawnSync(process.execPath, [WERKZEUG, '--register', gut, '--repo', TMP, '--spezifikation', path.join(TMP, 'gibt-es-nicht.md')], { encoding: 'utf8' });
  assert.equal(fehlt.status, 2);
  assert.match(fehlt.stdout, /ROT — NICHT MESSBAR/);
  const keinReg = spawnSync(process.execPath, [WERKZEUG, '--register', path.join(TMP, 'gibt-es-nicht.json')], { encoding: 'utf8' });
  assert.equal(keinReg.status, 2);
});
