'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Abgelöste Farbwerte in den ausgelieferten Anwendungen — „Die abgelöste Farbe, und SITUATIONEN zu Ende" (17.08.2026), Zug 1a.
   ────────────────────────────────────────────────────────────────────────────
   DIESER FUND IST GENAU DESHALB ENTSTANDEN, WEIL NIEMAND DANACH GESUCHT HAT.
   `vivodepot-lesen.html` trug elf Tage lang `--akzent: #3d5a2a` — bitgenau den
   abgelösten `--forest`-Wert. Der Kern führte ihn da längst null Mal. Gefunden
   wurde er erst, als jemand nach dem WERT statt nach dem NAMEN suchte.

   Die Probe hängt darum in `npm test` und läuft über alle ausgelieferten
   Anwendungen — Kern, Lese-App, Template-Generator, VC-Issuer. (Die Startseite
   war die fünfte; sie ist am 17.08.2026 entfallen, s. Zug 1b.)
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pruefen, ohneGegenstueck, tokenWerte, ABGELOEST, ANWENDUNGEN, AUSNAHMEN, GEGENSTUECK_GRUNDLINIE } = require('../tools/abgeloeste-farben-pruefen.js');
const { _maskiereKommentare } = require('../tools/textsatz-umstellen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools/abgeloeste-farben-pruefen.js');

test('[Farbe] keine abgelöste Farbe im Code der ausgelieferten Anwendungen', () => {
  const { funde } = pruefen();
  const echt = funde.filter((f) => !f.ausgenommen)
    .map((f) => `${f.datei}: ${f.wert} (war ${f.war}, heute ${f.heute})`);
  assert.deepEqual(echt, [], 'ein abgelöster Farbwert lebt unter anderem Namen weiter');
});

test('[Farbe] die Lese-App trägt den Salbei-Wert, nicht mehr den Forest-Wert', () => {
  // Der konkrete Fund, aus dem die Probe entstand — beide Fundstellen, CSS und JavaScript.
  const code = _maskiereKommentare(fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8'));
  assert.ok(!code.toLowerCase().includes('#3d5a2a'), 'der abgelöste Forest-Wert steht nicht mehr im Code');
  assert.match(code, /--akzent:\s*#4F6539/i, 'das CSS-Token trägt den Salbei-Wert');
  assert.match(code, /anker:\s*'#4F6539'/i, 'die JS-Modusfarbe trägt ihn ebenfalls');
});

test('[Farbe] jeder abgelöste Wert nennt seine Entscheidung UND seinen Nachfolger', () => {
  // Eine Liste abgelöster Werte ohne Nachfolger wäre eine Verbotsliste, keine Regel:
  // wer den Fund behebt, muss wissen, wodurch er ersetzt wird.
  for (const a of ABGELOEST) {
    assert.match(a.wert, /^#[0-9a-fA-F]{6}$/, a.wert);
    assert.ok(a.war && a.war.length > 2, 'Herkunftsname fehlt: ' + a.wert);
    assert.ok(a.heute && a.heute.includes('#'), 'Nachfolger fehlt: ' + a.wert);
    assert.ok(a.quelle && /\d{2}\.\d{2}\.\d{4}/.test(a.quelle), 'datierte Quelle fehlt: ' + a.wert);
  }
});

test('[Farbe] jede Ausnahme ist benannt, datiert und trägt ihre Ablaufbedingung', () => {
  // Eine Ausnahme ohne Ablaufbedingung ist eine stille Auslassung mit Etikett.
  // HEUTE IST DIE LISTE LEER, und das ist ein Ergebnis: die einzige Ausnahme galt der
  // Startseite und nannte ihr Ende im Text („ENTFÄLLT MIT ZUG 1b"). Zug 1b ist gelaufen.
  // Die Zahl steht hier, damit eine NEUE Ausnahme nicht unbemerkt dazukommt — wer eine
  // einträgt, fasst diese Probe mit an und begründet sie dabei.
  assert.equal(AUSNAHMEN.length, 0, 'eine neue Ausnahme gehört hier begründet, nicht still eingetragen');
  for (const a of AUSNAHMEN) {
    assert.ok(ANWENDUNGEN.includes(a.datei), 'Ausnahme auf eine Datei, die gar nicht geprüft wird: ' + a.datei);
    assert.match(a.seit, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(a.grund, /ENTFÄLLT MIT/, 'die Ausnahme sagt nicht, wann sie endet');
  }
});

test('[Farbe·Rot] ein gepflanzter abgelöster Wert macht das Gate rot — an einer verworfenen Kopie', () => {
  // Gepflanzt wird in der KERN-Kopie — die Datei, die am wenigsten unbemerkt zurückfallen
  // dürfte. (Bis 17.08. war die Startseite die naheliegende Kandidatin; sie trug damals
  // eine Ausnahme, und eine Rotprobe gegen eine ausgenommene Datei bewiese nichts.)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abgeloeste-farben-'));
  const kopieRepo = path.join(tmp, 'repo');
  try {
    fs.mkdirSync(path.join(kopieRepo, 'tools'), { recursive: true });
    for (const d of ANWENDUNGEN) {
      const q = path.join(REPO, d);
      if (fs.existsSync(q)) fs.copyFileSync(q, path.join(kopieRepo, d));
    }
    fs.copyFileSync(WERKZEUG, path.join(kopieRepo, 'tools', 'abgeloeste-farben-pruefen.js'));
    fs.copyFileSync(path.join(REPO, 'tools/textsatz-umstellen.js'), path.join(kopieRepo, 'tools', 'textsatz-umstellen.js'));
    // textsatz-umstellen liest den deutschen Satz seit S8 über tools/lib/textsatz-de-quelle.js (Sprachmodul-Datei) — die Kopie trägt die Bibliothek und das Modul mit.
    fs.cpSync(path.join(REPO, 'tools', 'lib'), path.join(kopieRepo, 'tools', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), path.join(kopieRepo, 'tools', 'textsatz-de-modul.json'));
    // Der gepflanzte Rückfall: irgendwo im Kern steht wieder der Forest-Wert.
    const kern = path.join(kopieRepo, 'vivodepot.html');
    fs.writeFileSync(kern, fs.readFileSync(kern, 'utf8').replace('--salbei-dunkel: #4F6539;', '--salbei-dunkel: #3d5a2a;'), 'utf8');

    let code = 0, ausgabe = '';
    try {
      ausgabe = execFileSync(process.execPath, [path.join(kopieRepo, 'tools', 'abgeloeste-farben-pruefen.js'), '--gate'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { code = e.status; ausgabe = String(e.stdout || '') + String(e.stderr || ''); }
    assert.equal(code, 1, 'das Gate muss anschlagen:\n' + ausgabe);
    assert.match(ausgabe, /vivodepot\.html: #3d5a2a/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ══ DIE GEGENRICHTUNG (Zug 4) ═════════════════════════════════════════════
   Die Prüfung oben fängt den Rückfall auf einen abgelösten Wert. Sie fängt NICHT
   den Neuzugang: ein frei erfundener Farbwert war nie abgelöst und ist ihr darum
   gleichgültig. Genau so ist `--akzent: #3d5a2a` in die Lese-App gekommen — nicht
   als Rückfall, sondern als Handgriff. */

test('[Farbe·Gegenstück] die Gegenrichtung ist gemessen und hat ihre Grundlinie', () => {
  const g = ohneGegenstueck();
  const basis = JSON.parse(fs.readFileSync(GEGENSTUECK_GRUNDLINIE, 'utf8'));
  assert.equal(g.summe, basis.summe, 'der Stand ist unverändert zur Grundlinie');
  assert.ok(basis.gegenstand && basis.gegenstand.length > 40,
    'die Grundlinie nennt, WAS sie zählt — sonst liest ein späterer Leser die Zahl falsch');
  assert.ok(g.tokenAnzahl > 40, 'die Token-Menge ist gefunden worden (kein leerer Vergleichsmassstab)');
});

test('[Farbe·Gegenstück·Rot] eine gepflanzte Farbe ohne Token-Gegenstück wird gezählt', () => {
  /* Rot ohne Datei-Mutation: derselbe Zähler über eine Kopie mit einer zusätzlichen
     Regel. Ohne diese Probe wäre nicht belegt, dass der Zähler überhaupt etwas sieht. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'farben-gegenstueck-'));
  const kopieRepo = path.join(tmp, 'repo');
  try {
    fs.mkdirSync(path.join(kopieRepo, 'tools'), { recursive: true });
    for (const d of ANWENDUNGEN) {
      const q = path.join(REPO, d);
      if (fs.existsSync(q)) fs.copyFileSync(q, path.join(kopieRepo, d));
    }
    fs.copyFileSync(WERKZEUG, path.join(kopieRepo, 'tools', 'abgeloeste-farben-pruefen.js'));
    fs.copyFileSync(path.join(REPO, 'tools/textsatz-umstellen.js'), path.join(kopieRepo, 'tools', 'textsatz-umstellen.js'));
    // textsatz-umstellen liest den deutschen Satz seit S8 über tools/lib/textsatz-de-quelle.js (Sprachmodul-Datei) — die Kopie trägt die Bibliothek und das Modul mit.
    fs.cpSync(path.join(REPO, 'tools', 'lib'), path.join(kopieRepo, 'tools', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), path.join(kopieRepo, 'tools', 'textsatz-de-modul.json'));
    fs.copyFileSync(GEGENSTUECK_GRUNDLINIE, path.join(kopieRepo, 'tools', 'farben-ohne-gegenstueck-grundlinie.json'));

    const lesen = path.join(kopieRepo, 'vivodepot-lesen.html');
    fs.writeFileSync(lesen, fs.readFileSync(lesen, 'utf8')
      .replace('</style>', '.farben-probe { color: #c0ffee; }\n</style>'), 'utf8');

    let code = 0, ausgabe = '';
    try {
      ausgabe = execFileSync(process.execPath, [path.join(kopieRepo, 'tools', 'abgeloeste-farben-pruefen.js'), '--gate'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { code = e.status; ausgabe = String(e.stdout || '') + String(e.stderr || ''); }
    assert.equal(code, 1, 'die Ratsche muss anschlagen:\n' + ausgabe);
    assert.match(ausgabe, /CSS-Farbwerte ohne Gegenstück/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Farbe·Gegenstück·Negativkontrolle] eine Farbe MIT Token-Gegenstück zählt nicht', () => {
  /* Der Unterschied, auf den es ankommt: dieselbe Zeile, aber mit einem Wert, den das
     System führt. Ohne diese Probe wäre der Zähler von „zählt alles" nicht zu
     unterscheiden — und ein Prüfer, der alles zählt, wird abgeschaltet. */
  const werte = tokenWerte();
  assert.ok(werte.has('#4f6539'), 'der Salbei-Wert ist ein Token-Wert');
  assert.ok(!werte.has('#c0ffee'), 'der Probenwert ist keiner');
});

test('[Farbe·Negativkontrolle] ein abgelöster Wert IM KOMMENTAR bleibt grün', () => {
  // Ohne diese Probe wäre die Regel nicht benutzbar: wer den Fund behebt, schreibt
  // in den Kommentar, was vorher dastand — und würde damit sein eigenes Gate rot machen.
  const q = "/* trug bis 17.08. #3d5a2a */\n:root { --akzent: #4F6539; }";
  const maskiert = _maskiereKommentare(q).toLowerCase();
  assert.ok(!maskiert.includes('#3d5a2a'), 'der Wert im Kommentar ist maskiert');
  assert.ok(maskiert.includes('#4f6539'), 'der Wert im Code bleibt sichtbar');
});
