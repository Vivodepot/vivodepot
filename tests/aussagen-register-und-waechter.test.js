'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Das Aussagen-Register und der Wächter, der es nachzieht
   (vom 20.08.2026, Züge 3 und 6)
   ────────────────────────────────────────────────────────────────────────
   Dreimal an EINEM Tag ist derselbe Fall aufgetreten: etwas ist gebaut, und
   ein Dokument nach aussen sagt etwas anderes. Alle drei fand ein Mensch von
   Hand. Diese Proben halten die zwei Prüfer an dem fest, was sie können —
   und, ebenso wichtig, an dem, was sie NICHT melden dürfen.

   DER SUCHRAUM steht in der Ausgabe der Prüfer selbst und wird hier
   mitgeprüft: „nichts gefunden" ohne Angabe, wo gesucht wurde, gilt nicht.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const A = require('../tools/aussagen-abgleich-pruefen.js');
const W = require('../tools/webseite-stand-pruefen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

/* ══ Zug 3 — der Aussagen-Prüfer ══════════════════════════════════════════ */

test('[W-aussagen] die Träger werden GEFUNDEN, nicht aufgezählt — auch die Anwendungen', () => {
  const t = A.traegerFinden(REPO);
  // Klasse 1: die mitgelieferten Dokumente.
  for (const d of ['STANDARDS.md', 'INTEROPERABILITY.md', 'README.md', 'SECURITY.md', 'FAQ.md']) {
    assert.ok(t.includes(d), d + ' fehlt im Suchraum');
  }
  // Klasse 2: die Anwendungen — „wird am leichtesten vergessen, weil sie nicht wie ein
  // Dokument aussieht". Genau darum steht sie hier namentlich in der Probe.
  for (const a of ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-template-generator.html',
                   'vivodepot-vc-issuer.html', 'pages/README.md']) {
    assert.ok(t.includes(a), a + ' fehlt im Suchraum — die Klasse fällt sonst lautlos aus');
  }
  assert.ok(t.length >= 25, 'der Suchraum ist nicht still geschrumpft (' + t.length + ')');
});

test('[W-aussagen] die Vergangenheit wird NICHT nachgezogen — ADRs und Register sind aussen vor', () => {
  const t = A.traegerFinden(REPO);
  assert.ok(!t.some((x) => x.startsWith('docs/adr/')), 'eine ADR nachzuziehen hiesse, die Historie zu fälschen');
  assert.ok(!t.includes('docs/ARBEITSLISTE-v1.md'));
  assert.ok(!t.includes('docs/faktenbasis.md'), 'sie ist erzeugt und hat ihr eigenes Gate');
});

/* ══ Rot-Beweis (10.09.2026, „Prüfer lesen die Platte statt git") ═══════════
   `traegerFinden()` las bis hierher `fs.readdirSync(docs)` — die PLATTE, nicht den Git-Index.
   Derselbe Commit lief darum im Hauptbaum (wo `docs/ARBEITSLISTE-v1.md` lokal, gitignored,
   liegt) ROT und in einem frischen Arbeitsbaum (Datei strukturell nicht vorhanden) GRÜN.

   Ein Wächter, der nur den JETZIGEN Suchraum abfragt, fängt das nicht — er wäre in beiden
   Bäumen grün gewesen, jeder gegen seinen eigenen, verschiedenen Ist-Zustand. Die Probe
   unten baut darum ein throwaway-Git-Repo (Bauart wie `tests/suite-dateien-kern.test.js`),
   misst den Suchraum, LEGT DANACH eine ignorierte Datei an und misst erneut: das Ergebnis
   muss GLEICH BLEIBEN. Das ist der einzige Beweis, den ein platten-lesender Prüfer nicht
   bestehen kann. */
function gitProbe(args, cwd) {
  require('node:child_process').execFileSync('git', args, { cwd, env: ohneGitUmgebung() });
}
function mitFrischemTraegerRepo(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aussagen-traeger-rotbeweis-'));
  try {
    gitProbe(['init', '--quiet'], tmp);
    gitProbe(['config', 'user.email', 'probe@example.invalid'], tmp);
    gitProbe(['config', 'user.name', 'Probe'], tmp);
    fs.mkdirSync(path.join(tmp, 'docs'));
    fs.writeFileSync(path.join(tmp, 'README.md'), '# Probe', 'utf8');
    fs.writeFileSync(path.join(tmp, 'docs', 'echt.md'), 'echt', 'utf8');
    gitProbe(['add', 'README.md', 'docs/echt.md'], tmp);
    gitProbe(['commit', '--quiet', '-m', 'a'], tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('[W-aussagen · Rot-Beweis] eine ignorierte Platten-Datei in docs/ verändert den Suchraum NICHT — der Fehler aus dem Hauptbaum, nachgebaut', () => {
  mitFrischemTraegerRepo((tmp) => {
    const vorher = A.traegerFinden(tmp);
    assert.deepEqual(vorher, ['README.md', 'docs/echt.md'], 'Vorbedingung: nur die getrackten zwei');

    // Genau die Lage von `docs/ARBEITSLISTE-v1.md`: auf der Platte vorhanden, NICHT `git add`.
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'docs/ignoriert.md\n', 'utf8');
    fs.writeFileSync(path.join(tmp, 'docs', 'ignoriert.md'), 'x'.repeat(1000), 'utf8');

    const nachher = A.traegerFinden(tmp);
    assert.deepEqual(nachher, vorher,
      'eine ignorierte Datei im Arbeitsbaum darf den Suchraum nicht verändern — sonst hängt das Ergebnis am Baum');
    assert.ok(!nachher.includes('docs/ignoriert.md'), 'die ignorierte Datei selbst darf nie im Suchraum auftauchen');
  });
});

test('[W-aussagen · Rot-Beweis] eine NUR gestagte (nicht committete) docs/-Datei wird trotzdem gefunden — git ls-files sieht den Index, nicht erst HEAD', () => {
  mitFrischemTraegerRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'docs', 'gestagt.md'), 'x', 'utf8');
    gitProbe(['add', 'docs/gestagt.md'], tmp);
    const t = A.traegerFinden(tmp);
    assert.ok(t.includes('docs/gestagt.md'), 'gestagt zählt wie committet — dieselbe Regel wie in suite-dateien-kern.js');
  });
});

test('[W-aussagen · Positivkontrolle] gegen den echten Bestand: docs/ARBEITSLISTE-v1.md bleibt aussen — auch wenn sie lokal auf der Platte liegt', () => {
  const arbeitsliste = path.join(REPO, 'docs', 'ARBEITSLISTE-v1.md');
  if (!fs.existsSync(arbeitsliste)) return; // nicht jede Maschine hat die lokale Datei — kein Fund, keine Aussage
  const t = A.traegerFinden(REPO);
  assert.ok(!t.includes('docs/ARBEITSLISTE-v1.md'),
    'die Datei liegt lokal (' + fs.statSync(arbeitsliste).size + ' Byte), git ls-files kennt sie trotzdem nicht');
});

/* Nachtrag 29.08.2026 („GitHub-Dokumente — die zwei bekannten Aussagen-Abweichungen
   schließen"): die beiden Funde, die diese zwei Proben ursprünglich gegen die LIVE-Dokumente
   maßen (STANDARDS.md ohne VC-Familie, INTEROPERABILITY.md mit „kein Lese-Pfad"), sind jetzt
   behoben — `node tools/aussagen-abgleich-pruefen.js` meldet 0 Abweichungen (Grundlinie
   entsprechend auf 0 zurückgeschrieben). Ein Test, der einen ECHTEN, inzwischen behobenen Fund
   als Fixture braucht, hat den Fund selbst zur Bedingung gemacht — genau die Zerbrechlichkeit,
   die er nicht haben sollte. Beide Proben laufen jetzt gegen eine EIGENE, isolierte Fixture
   (wie die Rot-Beweis-Probe unten es für Zahlen bereits tut) und prüfen den MECHANISMUS, nicht
   den Zufall eines gerade offenen Bugs. */

test('[W-aussagen · Richtung B] der Mechanismus: eine Standard-Übersicht ohne VC-Familie wird gefunden', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aussagen-richtung-b-'));
  try {
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'),
      "const x = { type: ['VerifiableCredential', 'FingierteTestCredential'] };");
    fs.writeFileSync(path.join(tmp, 'STANDARDS.md'), '# Standards\n\nKein Hinweis auf die Familie.\n');
    const stand = { kanaele: new Map([['fingierter-kanal', { signiert: true }]]) };
    const funde = A.standardFamilienPruefen(tmp, stand);
    assert.equal(funde.length, 1, 'genau ein Familien-Fund');
    assert.match(funde[0].anker, /Credential/, 'er benennt den Typ, den der Code prüft');
    assert.equal(funde[0].richtung, 'B');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[W-aussagen · Richtung B·Gegenprobe] dieselbe Übersicht MIT „W3C" genannt bleibt stumm', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aussagen-richtung-b-gegen-'));
  try {
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'),
      "const x = { type: ['VerifiableCredential', 'FingierteTestCredential'] };");
    fs.writeFileSync(path.join(tmp, 'STANDARDS.md'), '# Standards\n\nBasiert auf W3C Verifiable Credentials.\n');
    const stand = { kanaele: new Map([['fingierter-kanal', { signiert: true }]]) };
    assert.deepEqual(A.standardFamilienPruefen(tmp, stand), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[W-aussagen · Richtung C] der Mechanismus: „kein ausführbarer Lese-Pfad" gegen einen Kanal MIT Lese-Pfad wird gefunden', () => {
  const stand = { kanaele: new Map([['provider-credential', { hatLesePfad: true, flags: new Set() }]]) };
  const zeile = 'Der Kanal `provider-credential` trägt keinen hinterlegten Parser.';
  const funde = A.ankerLesen('fingierte-datei.md', zeile, stand);
  const l = funde.find((f) => f.art === 'lesepfad');
  assert.ok(l, 'der Lesepfad-Fall wird gefunden');
  assert.equal(l.anker, 'provider-credential');
  assert.equal(l.gemessen, 'liest über felderAusClaims/importPlanGeprueft');
});

test('[W-aussagen · Richtung C·Gegenprobe] derselbe Satz gegen einen Kanal OHNE Lese-Pfad bleibt stumm', () => {
  const stand = { kanaele: new Map([['fhir-lab', { hatLesePfad: false, flags: new Set() }]]) };
  const zeile = 'Der Kanal `fhir-lab` trägt keinen hinterlegten Parser.';
  const funde = A.ankerLesen('fingierte-datei.md', zeile, stand);
  assert.ok(!funde.some((f) => f.art === 'lesepfad'), 'ohne echten Lese-Pfad ist die Aussage korrekt');
});

test('[W-aussagen · Richtung B/C] die echten Dokumente sind heute frei von diesen zwei Funden', () => {
  const r = A.pruefen(REPO);
  assert.equal(r.funde.filter((f) => f.richtung === 'B').length, 0,
    'STANDARDS.md nennt die VC-Familie jetzt — s. „GitHub-Dokumente" (29.08.2026)');
  assert.ok(!r.funde.some((f) => f.art === 'lesepfad'),
    'INTEROPERABILITY.md/STANDARDS.md behaupten keinen fehlenden Lese-Pfad mehr');
});

test('[W-aussagen · Falschmeldungen] die vier Fälle des ersten Laufs bleiben stumm', () => {
  const r = A.pruefen(REPO);
  const orte = r.funde.map((f) => f.ort + ' ' + f.anker);
  // 1 · Backtick-Bezeichner ohne Kanal-Kontext (Repo-Name, Schlüssel-kid, Code-Liste)
  for (const x of ['vivodepot-cleanslate', 'vivodepot-trust-authority-v1-11052026', 'xoev-rollencode']) {
    assert.ok(!orte.some((o) => o.includes(x)), x + ' ist kein Kanal — darf nicht gemeldet werden');
  }
  // 2 · ein datierter Abschnitt erzählt einen vergangenen Tag
  assert.ok(!orte.some((o) => o.startsWith('docs/pruefebene.md')),
    'docs/pruefebene.md trägt „**Stand:** 14.08.2026" — das war richtig und bleibt es');
  // 3 · die Zahl der sensiblen Felder ist aus FAQ.md/SOVEREIGNTY.md raus (Ansage „ganz raus, denn
  // sie können durch die Modularität nicht fix sein", Nachtlauf 11.09.2026) — kein Anker mehr, also
  // auch keine Meldung mehr möglich; die Positivkontrolle W-3 lebt jetzt an der Sektorenzahl (s. u.).
  assert.ok(!orte.some((o) => o.startsWith('FAQ.md')), 'FAQ.md nennt keine sensible Feldzahl mehr');
  // 4 · Bestandszahlen in Quelltext-Kommentaren sind keine Bestandsbehauptungen
  assert.ok(!orte.some((o) => /^vivodepot[^ ]*\.html/.test(o) && o.includes('Felder')),
    '„die zwölf Felder dieses Blatts" ist keine Katalogzahl');
});

test('[W-aussagen · Gate] Grundlinie statt Nulltoleranz — und ein UNGEMESSENER Slot gilt nicht als grün', () => {
  const gl = A.grundlinieLesen();
  const r = A.pruefen(REPO);
  assert.equal(r.funde.length, gl.anzahl,
    'der heutige Abstand ist die Grundlinie — wächst er, schlägt das Gate an');
  assert.ok(gl.hinweis.includes('WÄCHST'), 'die Grundlinie sagt selbst, was sie ist');
  // Ohne `--mit-suite` bleibt die Testzahl ungemessen. Sie wird ausgewiesen, nicht geraten.
  assert.equal(r.stand.zahlen['Tests'], null, 'ungemessen heisst ungemessen, nicht „passt"');
});

test('[W-aussagen · Rot-Beweis] eine weitergewanderte Zahl lässt das Gate anschlagen', () => {
  // Anker bis 11.09.2026 in STANDARDS.md (Block „Umfang der Erhebung") — mit dem Block
  // entfallen („Standzahlen raus"). docs/konformitaet-quellen.md:29 nennt
  // „13 Sektoren" weiterhin, als Teil der Liste gescannter Sichten, und trägt den Anker seither.
  const QUELLDATEI = path.join(REPO, 'docs', 'konformitaet-quellen.md');
  const original = fs.readFileSync(QUELLDATEI, 'utf8');
  const anker = '13 Sektoren';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'aussagen-probe-' + process.pid + '-konformitaet-quellen.md');
  fs.writeFileSync(tmp, original.replace(anker, '9 Sektoren'));
  try {
    const r = A.pruefen(REPO, { dokument: tmp });
    assert.ok(r.funde.length > A.grundlinieLesen().anzahl,
      'der Abstand wächst — genau das meldet das Gate');
    assert.ok(r.funde.some((f) => f.anker === 'Sektoren' && f.gesagt === '9'));
  } finally { fs.rmSync(tmp, { force: true }); }
  assert.equal(fs.readFileSync(QUELLDATEI, 'utf8'), original,
    'die Probe darf die echte docs/konformitaet-quellen.md nicht verändern');
});

/* ══ Zug 7 — Standzahlen raus aus FAQ.md/SOVEREIGNTY.md ═══════════════════════
   „Standzahlen raus" (11.09.2026, Ansage: „wir nehmen die
   Zahlen ganz raus, denn sie können durch die Modularität nicht fix sein."). Der
   Laufzettel verlangt einen eigenen Rot-Beweis: eine feste Feldzahl neben „sensibel" muss
   werfen, eine zusammensetzungs-unabhängige Aussage darf durchgehen — unabhängig davon, ob
   die Zahl gerade zufällig zur Messung passt. `A.pruefen()` allein reicht dafür NICHT: es
   meldet nur eine FALSCHE Zahl, keine an sich verbotene. Diese Probe prüft direkt am Text. */
function feldzahlNebenSensibel(pfad) {
  const zeilen = fs.readFileSync(pfad, 'utf8').split('\n');
  const funde = [];
  for (let i = 0; i < zeilen.length; i++) {
    if (!/\d+\s+Felder/.test(zeilen[i])) continue;
    const absatz = zeilen.slice(Math.max(0, i - 3), i + 1).join(' ');
    if (/sensib/i.test(absatz)) funde.push({ zeile: i + 1, text: zeilen[i] });
  }
  return funde;
}

test('[Standzahl-frei] FAQ.md/SOVEREIGNTY.md nennen keine feste Feldzahl mehr bei „sensibel"', () => {
  for (const datei of ['FAQ.md', 'SOVEREIGNTY.md']) {
    assert.deepEqual(feldzahlNebenSensibel(path.join(REPO, datei)), [],
      datei + ' nennt wieder eine feste Feldzahl neben „sensibel" — die Ansage vom '
      + '11.09.2026 verlangt eine zusammensetzungs-unabhängige Aussage, keine neue Zahl.');
  }
});

test('[Standzahl-frei · Rot-Beweis] eine gepflanzte feste Feldzahl wird gefunden, auch wenn sie zufällig stimmt', () => {
  const original = fs.readFileSync(path.join(REPO, 'FAQ.md'), 'utf8');
  const anker = 'Wie viele Felder das betrifft, hängt von Ihrer Zusammensetzung ab, nicht von einer\nfesten Zahl.';
  assert.ok(original.includes(anker), 'Vorbedingung: die ersetzte, zahlenfreie Aussage steht wortgleich in FAQ.md');
  const tmp = path.join(os.tmpdir(), 'standzahl-frei-probe-' + process.pid + '-FAQ.md');
  fs.writeFileSync(tmp, original.replace(anker, 'Heute betrifft das 204 Felder.'));
  try {
    const funde = feldzahlNebenSensibel(tmp);
    assert.equal(funde.length, 1, 'ROT ERWARTET: eine gepflanzte feste Zahl neben „sensibel" muss anschlagen — auch 204, obwohl das heute die reale Zahl sein könnte');
  } finally { fs.rmSync(tmp, { force: true }); }
});

/* ══ Zug 6 — der Webseiten-Prüfer ═════════════════════════════════════════ */

test('[W-webseite-stand] er läuft OHNE die Webseite — gegen die Fixture im Repo', () => {
  const r = W.pruefen();
  assert.ok(fs.existsSync(W.FIXTUR), 'die Fixture liegt im Repo, die Webseite nicht');
  assert.equal(r.live, '13092026', 'die Fixture bildet die Form der echten STAND.txt nach');
  assert.equal(r.bestand.ordner.length, 2);
});

test('[W-webseite-stand · A] ein neuerer Ordner als der als live benannte wird gemeldet', () => {
  const r = W.pruefen();
  const a = r.funde.filter((f) => f.pruefung === 'A');
  assert.equal(a.length, 1, 'die Fixture trägt genau diesen Fall — den Rot-Beweis des Auftrags');
  assert.equal(a[0].ort, '14092026');
  // Der Satz ist der halbe Wert: er behauptet NICHT, STAND.txt lüge.
  assert.match(a[0].satz, /dritten Zustand/,
    'der Befund ist „die Datei kennt keinen dritten Zustand", nicht „sie lügt"');
});

test('[W-webseite-stand · A · Gegenprobe] ein ausdrücklich als wartend geführter Ordner ist KEIN Befund', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webseite-probe-'));
  try {
    for (const o of ['13092026', '14092026']) {
      fs.mkdirSync(path.join(tmp, o));
      fs.writeFileSync(path.join(tmp, o, 'HOCHLADEANWEISUNG.txt'), 'Fixture');
      fs.writeFileSync(path.join(tmp, o, 'index.html'), '<!doctype html>');
    }
    fs.writeFileSync(path.join(tmp, 'STAND.txt'),
      'AKTUELL LIVE: 13092026\n\nERZEUGT, WARTET AUF UPLOAD: 14092026\n');
    const r = W.pruefen(tmp);
    assert.deepEqual(r.funde.filter((f) => f.pruefung === 'A'), [],
      'wer den dritten Zustand einführt, macht die Prüfung nicht falsch — er gibt ihr etwas zu lesen');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[W-webseite-stand · B] ein unvollständiger neuerer Ordner wird gemeldet — dauerhafte Dateien nicht', () => {
  // Die Fixture selbst ist VOLLSTÄNDIG (der Negativfall der Selbstprobe verlangt das) —
  // der Mangel wird darum gestellt, nicht im Repo abgelegt.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webseite-b-'));
  try {
    for (const o of ['13092026', '14092026']) {
      fs.mkdirSync(path.join(tmp, o));
      fs.writeFileSync(path.join(tmp, o, 'HOCHLADEANWEISUNG.txt'), 'Fixture');
      fs.writeFileSync(path.join(tmp, o, 'index.html'), '<!doctype html>');
    }
    fs.writeFileSync(path.join(tmp, '13092026', 'institutionen.html'), '<!doctype html>');
    fs.writeFileSync(path.join(tmp, 'STAND.txt'), 'AKTUELL LIVE: 13092026\n');
    const b = W.pruefen(tmp).funde.filter((f) => f.pruefung === 'B');
    assert.equal(b.length, 1);
    assert.match(b[0].ort, /institutionen\.html$/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  // Die Regel sagt ausdrücklich: fehlende Server-Dateien sind KEIN Befund.
  for (const d of ['style.css', 'logo.png', 'img-care.jpg', 'Inter-Regular.woff2']) {
    assert.ok(W.DAUERHAFT.test(d), d + ' muss als dauerhafte Server-Datei gelten');
  }
  assert.ok(!W.DAUERHAFT.test('institutionen.html'), 'eine HTML-Datei ist keine dauerhafte Datei');
});

test('[W-webseite-stand · B] die Regel gilt NICHT rückwirkend', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webseite-alt-'));
  try {
    fs.mkdirSync(path.join(tmp, '21072026'));                       // vor dem 12.08.2026
    fs.writeFileSync(path.join(tmp, '21072026', 'index.html'), '<!doctype html>');
    fs.mkdirSync(path.join(tmp, '20082026'));                       // danach
    fs.writeFileSync(path.join(tmp, '20082026', 'index.html'), '<!doctype html>');
    fs.writeFileSync(path.join(tmp, 'STAND.txt'), 'AKTUELL LIVE: 20082026\n');
    const r = W.pruefen(tmp);
    const ohneAnweisung = r.funde.filter((f) => f.art === 'ohne-anweisung').map((f) => f.ort);
    assert.deepEqual(ohneAnweisung, ['20082026'],
      'der Juli-Ordner ist älter als die Regel — ihn zu bemängeln misst die Zeit vor ihr');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[W-webseite-stand · C] „zu wenig gesagt" wird am CODE gemessen, nicht an einer Wortliste', () => {
  const lesen = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  assert.ok(lesen.includes('function qrTeileZusammensetzen'),
    'Vorbedingung: die Fähigkeit gibt es — sonst misst Prüfung C nichts');
  assert.ok(lesen.includes('function renderKamera'), 'Vorbedingung: der Kamera-Weg auch');
  // Der Fall selbst: eine Seite, die nur „eingefügten QR-Text" nennt, ist ZU KLEIN.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webseite-c-'));
  try {
    fs.mkdirSync(path.join(tmp, '20082026'));
    fs.writeFileSync(path.join(tmp, '20082026', 'HOCHLADEANWEISUNG.txt'), 'Fixture');
    fs.writeFileSync(path.join(tmp, '20082026', 'institutionen.html'),
      '<p>Eine kleine Lese-Begleitdatei (<code>vivodepot-lesen.html</code>) liest übergebene '
      + 'Dateien und eingefügten QR-Text.</p>');
    fs.writeFileSync(path.join(tmp, 'STAND.txt'), 'AKTUELL LIVE: 20082026\n');
    const funde = W.pruefen(tmp).funde.filter((f) => f.pruefung === 'C');
    assert.equal(funde.length, 2, 'beide Fähigkeiten fehlen in der Aussage');
    assert.ok(funde.every((f) => /Nicht falsch — zu klein/.test(f.satz)),
      'die Aussage ist nicht falsch, sie ist zu klein — und der Prüfer sagt genau das');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[W-webseite-stand · C · Gegenprobe] eine Seite, die es SAGT, ist kein Befund', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webseite-c2-'));
  try {
    fs.mkdirSync(path.join(tmp, '20082026'));
    fs.writeFileSync(path.join(tmp, '20082026', 'HOCHLADEANWEISUNG.txt'), 'Fixture');
    fs.writeFileSync(path.join(tmp, '20082026', 'institutionen.html'),
      '<p>Die Lese-Begleitdatei (<code>vivodepot-lesen.html</code>) liest übergebene Dateien, '
      + 'eingefügten QR-Text und setzt mehrteilige Serien zusammen; sie kann den QR auch mit der '
      + 'Kamera scannen.</p>');
    fs.writeFileSync(path.join(tmp, 'STAND.txt'), 'AKTUELL LIVE: 20082026\n');
    assert.deepEqual(W.pruefen(tmp).funde.filter((f) => f.pruefung === 'C'), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
