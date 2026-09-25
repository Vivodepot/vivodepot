'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Ratsche für `test.skip`/`test.todo`/`{skip:…}`/`t.skip(…)` außerhalb tests/e2e/
   (Schnitt Gerüst/Templates/Module, 18.09.2026) — dieselbe Konstruktion wie
   tests/e2e-fixme-ratsche.test.js, für die node:test-Suite statt Playwright.

   DER FUND, DER DIESE RATSCHE NÖTIG MACHT: die e2e-Ratsche zählt `test.fixme`/
   `test.skip` in tests/e2e/*.spec.js seit dem 06.09.2026 — für jede *.test.js-Datei
   unter tests/ und tools/ (rekursiv, außer tests/e2e/) gab es dasselbe Werkzeug
   (t.skip('Grund')/{skip:'Grund'}),
   aber KEINEN Zähler. Ohne Ratsche wäre eine zweite, dritte, stille Aussetzung in
   der Unit-Suite unsichtbar geblieben — genau die Lücke, die die e2e-Ratsche für
   Playwright schon geschlossen hat.

   GEMESSEN (18.09.2026, vor dieser Datei): ELF Stellen, alle mit Grund am Test
   selbst — sieben umgebungsbedingt (python3 fehlt: passphrase-eingabe-pty.test.js
   ×2; verapdf fehlt: verapdf-pdfa-pruefen.test.js ×2; GAZELLE_MUSTER_PFAD nicht
   gesetzt: fhir-narrative-render.test.js ×4; tools/bereich-templates/ fehlt in
   diesem Arbeitsbaum: bereich-umzug-rundlauf-pruefen.test.js ×1) und ZWEI aus
   unfertiger Migration (Schnitt Gerüst/Templates/Module: schnitt-glied3-fuenf-
   pruefsteine.test.js ×2 — Prüfstein 5 wählt seine Test-Kennung über die erste
   `.label`-Kennung, seit dem Schnitt zufällig auch ein Bereichs-Label, das Glied 4
   noch nicht rechtsraumfähig macht; kein Rückfall, s. Kommentar dort).

   Obergrenze auf die gemessene Zahl gesetzt, nicht großzügig — wie bei der
   e2e-Ratsche gilt: sie verhindert nicht das Aussetzen, sie verhindert das STILLE
   Aussetzen. Jede neue Stelle braucht einen Grund UND eine Rückkehr-Bedingung am
   Test selbst, dann einen bewussten Nachtrag hier — und die Obergrenze darf auch
   wieder sinken, wenn eine Stelle behoben ist (gelebte Praxis bei der e2e-Ratsche).

   NACHTRAG (19.09.2026): Obergrenze 11 → 12, BEWUSST. Zwölfte Stelle:
   tests/generator-angehoerigen-blatt.test.js, „Parität mit dem Prüfer des Kerns" — hängt an ANG1 (der
   Kern trägt `angehoerigenVorlagePruefen` erst mit ANG1). Rückkehr-Bedingung: ANG1 im Kanon; dann läuft
   der Fall von selbst, und diese Stelle sowie die Obergrenze fallen (12 → 11).

   NACHTRAG (19.09.2026, L2): Obergrenze 12 → 14, BEWUSST. Zwei Stellen in tests/adr-namen-waechter.test.js
   (`t.skip('kein Git verfügbar — …')`): ein Auszug ohne `.git` (git archive, kein Klon) kann die
   Namen-Prüfung nicht fahren und meldet „ungemessen" statt „durchgefallen" — Grund steht im Testtext.
   Rückkehr-Bedingung: keine (bedingter Skip der Umgebung, kein Defekt).
   Obergrenze 14 → 15: tests/produkt-text-erzeugen-cross-repo-abgleich.test.js — `t.skip('UNGEMESSEN — Schwesterrepo nicht
   lokal vorhanden …')`: ohne das Gateway-Repo bleibt der Befund ungemessen statt still grün; Umgebungs-Skip, keine Rückkehr-Bedingung.

   NACHTRAG (20.09.2026, L3, Entscheidung): Obergrenze 15 → 16. tests/lokalisierbarkeit-
   reichweite.test.js „die gewählte Form ist kein neuer Mechanismus" — SIT2 hat 233 Texte aus dem
   generierten Kern-Register in die Template-/Mitschrift-Quelle verschoben (gewollte Richtung),
   der Definitions-Layer-Anteil fiel dadurch unter 50 % (51,2 % → 49,78 %). Kein Defekt — die
   Probe misst eine durch SIT2 überholte Annahme, s. Kommentar am Test. Eigentümer: der SIT2-Strang,
   Rückkehr-Bedingung/Abnahme in L4: die Probe wird auf „genau einer der zwei benannten Wege"
   umgestellt statt auf den Anteil; dann fällt diese Stelle samt Obergrenze (16 → 15).

   ERLEDIGT (20.09.2026, L4): die Rückkehr-Bedingung oben ist eingetreten — die Probe misst jetzt
   „genau einer der zwei benannten Wege" (neuer Kanal `vorlageSchicht()` in
   tools/lokalisierbarkeit-erheben.js, Rot-Beweis für einen dritten Weg am Test selbst). Der Skip
   ist weg, Obergrenze 16 → 15.

   NACHTRAG (20.09.2026, Rezepte-Zeremonie-Sitzung): Obergrenze 15 → 16.
   tests/oeffentlicher-zuschnitt-spuren-pruefen.test.js „nurWortlaut schützt nur die genannte
   Zeile" — Befund-Ratsche NURWORTLAUT-DOPPELUNG (offener-punkt-nurwortlaut-vs-volle-ausnahme-
   widerspruch-2026-09-20.md): tests/oeffentlicher-zuschnitt-bauen.test.js trägt seit
   ZURUECK_SELBSTTEST_FIXTURE zusätzlich eine volle Datei-Ausnahme, die die engere nurWortlaut-
   Ausnahme vom 17.09. unbeobachtbar macht. Kein Defekt der Probe — Rückkehr-Bedingung:
   selbsttest() in tools/oeffentlicher-zuschnitt-bauen.js erzeugt seine Fixture temporär statt
   von der Platte zu lesen; dann fällt diese Stelle samt Obergrenze (16 → 15).

   NACHTRAG (23.09.2026): Obergrenze 16 → 17, BEWUSST. tests/schwester-repo-pfad.test.js —
   `t.skip('UNGEMESSEN …')`, NUR wenn auf der Maschine kein Gateway neben dem Haupt-Repo liegt; aus
   Arbeitsbäumen misst die Probe seit tools/lib/schwester-repo.js. (Die zwischenzeitliche todo-Probe zum
   Befund E2E-ARTEFAKT ist mit dem Fix ein gewöhnlicher Test geworden und zählt nicht mehr.)
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const OBERGRENZE = 17;
const MUSTER = /^\s*(?:test|it)\.(skip|todo)\(|,\s*\{\s*skip\s*:|\bt\.skip\(/gm;

const EIGENE_DATEI = path.resolve(__filename);

function testDateien(dir) {
  let out = [];
  for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
    if (eintrag.name === 'e2e') continue;
    const p = path.join(dir, eintrag.name);
    if (eintrag.isDirectory()) out = out.concat(testDateien(p));
    else if (eintrag.name.endsWith('.test.js') && path.resolve(p) !== EIGENE_DATEI) out.push(p);
  }
  return out;
}

function skipStellen() {
  const treffer = [];
  const dateien = testDateien(path.join(REPO, 'tests')).concat(testDateien(path.join(REPO, 'tools')));
  for (const datei of dateien) {
    const text = fs.readFileSync(datei, 'utf8');
    for (const m of text.matchAll(MUSTER)) {
      const zeile = text.slice(0, m.index).split('\n').length;
      treffer.push(path.relative(REPO, datei) + ':' + zeile);
    }
  }
  return treffer.sort();
}

test('[Unit-Skip-Ratsche] nicht mehr als die gemessene Zahl benannter, dokumentierter Aussetzungen', () => {
  const stellen = skipStellen();
  assert.ok(stellen.length <= OBERGRENZE,
    stellen.length + ' `test.skip`/`test.todo`/`{skip:…}`/`t.skip(…)`-Stellen außerhalb tests/e2e/ '
    + '(Obergrenze ' + OBERGRENZE + ') — jede neue braucht einen dokumentierten Grund IM Testtext '
    + 'selbst und, wenn es ein Defekt ist, eine Rückkehr-Bedingung. Nicht die Obergrenze '
    + 'stillschweigend anheben, die neue Stelle im Kopf-Kommentar dieser Datei benennen. Gefunden:\n'
    + stellen.join('\n'));
});

test('[Unit-Skip-Ratsche·Positivkontrolle] die Erkennung selbst findet einen fingierten Fall in allen vier Formen', () => {
  const fixture = "test.skip('a', () => {});\ntest.todo('b', () => {});\n"
    + "test('c', { skip: 'x' }, () => {});\ntest('d', () => { t.skip('y'); });\n"
    + "test('e', () => {});";
  const treffer = [...fixture.matchAll(MUSTER)];
  assert.equal(treffer.length, 4,
    'die Erkennung muss test.skip, test.todo, {skip:…} UND t.skip(…) finden, und NUR die vier — '
    + 'nicht das normale test(...) daneben');
});
