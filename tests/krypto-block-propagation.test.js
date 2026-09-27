'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-krypto-propagation — Proben für `tools/krypto-block-propagation-pruefen.js`
   ────────────────────────────────────────────────────────────────────────
   Der Prüfer bewacht eine EINBAHNSTRASSE: ein halb propagierter Krypto-Block
   geht in die Auslieferung, und nach dem Push ist er nicht mehr einzufangen.
   Darum steht hier neben der Positivkontrolle am echten Repo für JEDE der drei
   Prüfungen eine Rotprobe an einem ERFUNDENEN Fixture — und zwei
   Gegenkontrollen, ohne die „findet den Fehler" von „findet alles" nicht zu
   unterscheiden wäre.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pruefe, pruefeHuelle, traegerzahlPruefen, TRAEGER_MINDESTZAHL } = require('../tools/krypto-block-propagation-pruefen.js');

/* Ein erfundener Block — kurz, aber mit der Signatur, an der der Prüfer Träger
   erkennt. Kein Byte davon stammt aus dem Produkt. */
const BLOCK = [
  '// Erfundener Block — nur für die Probe.',
  'function tuNichts() { return 1; }',
  'const VdCrypto = Object.freeze({ tuNichts });',
  '',
].join('\n');
const BLOCK_HASH = crypto.createHash('sha256').update(BLOCK, 'utf8').digest('hex');
const KURZ = BLOCK_HASH.slice(0, 8);
const FREMD = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

function fixture(zusatz = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'krypto-prop-'));
  fs.writeFileSync(path.join(dir, 'vivodepot-krypto-kern-PORT-VERBATIM.js'), BLOCK);
  fs.writeFileSync(path.join(dir, 'app.html'), '<html><script>\n' + BLOCK + '</script><body></body></html>');
  for (const [rel, inhalt] of Object.entries(zusatz)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, inhalt);
  }
  return dir;
}
const arten = (r) => r.fehler.map((f) => f.split(' ')[0]);

test('[Klasse-A] W-krypto-propagation Positivkontrolle: stimmiges Fixture ergibt 0 Befunde', () => {
  const r = pruefe(fixture());
  assert.deepEqual(r.fehler, [], 'ein stimmiges Fixture darf keinen Befund erzeugen');
  assert.equal(r.traeger.length, 2, 'kanonische Quelle + eine App müssen als Träger erkannt sein');
  assert.equal(r.aktuell, BLOCK_HASH);
});

test('[Klasse-A] W-krypto-propagation Rot 1: ein Träger, der nicht mitgezogen wurde', () => {
  const dir = fixture();
  // Genau der Zustand, gegen den der Block-Vertrag steht: eine App trägt eine
  // andere Fassung als die kanonische Quelle.
  fs.writeFileSync(path.join(dir, 'app.html'), '<html><script>\n' + BLOCK.replace('return 1', 'return 2') + '</script></html>');
  const r = pruefe(dir);
  assert.ok(arten(r).includes('TRÄGER'), 'ein driftender Träger muss rot machen, Befunde: ' + JSON.stringify(r.fehler));
});

test('[Klasse-A] W-krypto-propagation Rot 2: eine vergessene Voll-Pin-Stelle', () => {
  const r = pruefe(fixture({
    'tests/load-irgendwas.js': `const BLOCK_HASH_ERWARTET = '${FREMD}';\n`,
  }));
  assert.ok(arten(r).includes('VOLL-PIN'), 'ein Pin auf einem fremden Hash muss rot machen, Befunde: ' + JSON.stringify(r.fehler));
});

test('[Klasse-A] W-krypto-propagation Rot 3: eine vergessene Kurz-Pin-Stelle', () => {
  const r = pruefe(fixture({
    'docs/irgendwas/README.md': 'Der VdCrypto-Block hat den Hash `deadbeef…`.\n',
  }));
  assert.ok(arten(r).includes('KURZ-PIN'), 'eine Kurzform auf einem fremden Hash muss rot machen, Befunde: ' + JSON.stringify(r.fehler));
});

test('[Klasse-A] W-krypto-propagation Rot 4: ein voll ausgeschriebener Hash in Prosa', () => {
  const r = pruefe(fixture({
    'docs/irgendwas/README.md': `Der VdCrypto-Block ist byte-identisch (SHA-256 \`${FREMD}\`).\n`,
  }));
  assert.ok(r.fehler.some((f) => f.startsWith('VOLL-PIN (Prosa)')),
    'ein Prosa-Hash auf einem fremden Wert muss rot machen, Befunde: ' + JSON.stringify(r.fehler));
});

/* Am WERT erkannt (23.09.2026): „SHA-256" allein ist kein Blockbezug mehr; ein Block-Pin wird am Wert erkannt — ein früherer
   Block-Hash ist rot, ganz ohne Kontextwort, der aktuelle ist ein erkannter Pin. */
const ALT = crypto.createHash('sha256').update(BLOCK + '// alte Fassung\n', 'utf8').digest('hex');

test('[Klasse-A] W-krypto-propagation Rot 5: ein früherer Block-Hash in Prosa ist rot, ohne jedes Kontextwort', () => {
  const r = pruefe(fixture({ 'docs/irgendwas/NOTIZ.md': `Siehe \`${ALT}\`.\n` }), { geschichte: new Set([ALT]) });
  assert.ok(r.fehler.some((f) => f.startsWith('VOLL-PIN (Wert)')), 'Befunde: ' + JSON.stringify(r.fehler));
});

test('[Klasse-A] W-krypto-propagation: der aktuelle Block-Hash in Prosa ohne Kontextwort ergibt dasselbe wie mit Kontextwort', () => {
  const ohne = pruefe(fixture({ 'docs/irgendwas/NOTIZ.md': `Siehe \`${BLOCK_HASH}\`.\n` }), { geschichte: new Set([ALT]) });
  const mit = pruefe(fixture({ 'docs/irgendwas/NOTIZ.md': `Der VdCrypto-Block: \`${BLOCK_HASH}\`.\n` }), { geschichte: new Set([ALT]) });
  assert.deepEqual(ohne.fehler, mit.fehler);
  assert.deepEqual(ohne.vollPins.map((p) => [p.datei, p.name, p.wert]), mit.vollPins.map((p) => [p.datei, p.name, p.wert]));
  assert.ok(ohne.vollPins.some((p) => p.wert === BLOCK_HASH), 'die Zeile gilt als Pin');
});

test('[Klasse-A] W-krypto-propagation Gegenprobe: die SHA-256 einer Datei (Inter-ZIP in NOTICE) ist kein Block-Pin', () => {
  const r = pruefe(fixture({ 'NOTICE.md': 'Quelle: Release v4.1, `Inter-4.1.zip` (SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`).\n' }), { geschichte: new Set([ALT]) });
  assert.deepEqual(r.fehler, []);
});

test('[Klasse-A] W-krypto-propagation Gegenkontrolle: historische Dokumente bleiben unangetastet', () => {
  // Ohne diese Probe wäre der Prüfer ein Werkzeug, das ADRs zwingt, ihre eigene
  // Vergangenheit zu fälschen.
  const r = pruefe(fixture({
    'docs/adr/vivodepot-U2-ADR-999-erfunden.md': 'Krypto unberührt: VdCrypto-Block-Pin `deadbeef…` unverändert.\n',
    'docs/ARBEITSLISTE-v1.md': '| A999 | Block-Pin `deadbeef…` byte-identisch. |\n',
  }));
  assert.deepEqual(r.fehler, [], 'ADR und ARBEITSLISTE halten Vergangenheit fest und dürfen nicht rot machen');
});

test('[Klasse-A] W-krypto-propagation Gegenkontrolle: eine Pin-KETTE ist keine stale Angabe', () => {
  const r = pruefe(fixture({
    'tests/gate.test.js': `// Pin-Kette: ${KURZ}…, davor \`deadbeef…\`, davor \`cafebabe…\`\n`,
    'docs/kette.md': `Der Block-Pin wechselte: \`deadbeef…\` → \`${KURZ}…\`.\n`,
  }));
  assert.deepEqual(r.fehler, [], 'eine ausgewiesene Historien-Kette darf nicht rot machen');
});

/* NACHTRAG (18.09.2026, Krypto-Kapselung Weg A): ein einzelner
   Träger-Signatur-String hätte diesen Prüfer für GENAU DIE ÄNDERUNG blind gemacht, die
   er sehen soll — gemessen: nach der Kapselung von vivodepot.html allein (IIFE statt
   direktem `Object.freeze`) fiel der Kern lautlos aus der Trägerliste, und ein Lauf mit
   den übrigen (noch alten) Trägern meldete trotzdem „✓ vollständig". Zwei Proben dagegen:
   die neue Form wird ebenso erkannt wie die alte, UND eine zu kleine Trägerzahl ist
   selbst ein Befund — unabhängig davon, ob die gefundenen Träger untereinander stimmen. */
const BLOCK_NEUE_FORM = [
  '// Erfundener Block, neue (IIFE-)Form — nur für die Probe.',
  'const VdCrypto = (function () {',
  '  function tuNichts() { return 1; }',
  '  return Object.freeze({ tuNichts });',
  '})();',
  '',
].join('\n');

test('[Klasse-A] W-krypto-propagation: die neue (IIFE-)Bauform wird ebenso als Träger erkannt wie die alte', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'krypto-prop-neu-'));
  fs.writeFileSync(path.join(dir, 'vivodepot-krypto-kern-PORT-VERBATIM.js'), BLOCK_NEUE_FORM);
  fs.writeFileSync(path.join(dir, 'app.html'), '<html><script>\n' + BLOCK_NEUE_FORM + '</script><body></body></html>');
  const r = pruefe(dir);
  assert.equal(r.traeger.length, 2, 'beide Träger (alt benannt, neu gebaut) müssen gefunden werden — Befunde: ' + JSON.stringify(r.fehler));
  assert.deepEqual(r.fehler, [], 'byte-identische Träger in der neuen Form dürfen nicht rot machen');
});

test('[Klasse-A] W-krypto-propagation·Rot-Beweis: eine zu kleine Trägerzahl ist selbst ein Befund', () => {
  // Nicht über pruefe() (die bleibt fixture-neutral, s. Kommentar an traegerzahlPruefen) —
  // die Mindestzahl gilt nur für den echten Baum, geprüft direkt an der Funktion.
  assert.equal(traegerzahlPruefen(TRAEGER_MINDESTZAHL), null, 'die erwartete Zahl selbst darf nicht rot machen');
  assert.equal(traegerzahlPruefen(TRAEGER_MINDESTZAHL + 1), null, 'mehr als erwartet darf nicht rot machen');
  const befund = traegerzahlPruefen(TRAEGER_MINDESTZAHL - 1);
  assert.ok(befund && befund.startsWith('TRÄGERZAHL'), 'eine Datei weniger als erwartet muss einen TRÄGERZAHL-Befund erzeugen');
});

/* Fund 18.09.2026, Merge Schnitt×Verschluss: `ersterScriptBlock()` findet seinen Gegenstand
   über die POSITION (der erste namenlose Skript-Tag im Dokument), nicht über die SACHE selbst
   (etwa die `VdCrypto`-Signatur). Ein Träger, der VOR dem echten Block ein weiteres, ebenso
   namenloses Skript-Element bekommt — real getroffen beim Einbau des Rahmen-Schutzes in
   vivodepot.html/vivodepot-lesen.html —, lässt den Prüfer den FALSCHEN Block hashen: er meldet
   „nicht byte-identisch" über einen Träger, der am eigentlichen Krypto-Block gar nichts
   geändert hat. Zwei Fallen an derselben Stelle, beide hier nachgestellt: (a) ein zusätzliches
   namenloses Element vor dem echten Block, (b) ein SPÄTERES Vorkommen der Zeichenfolge
   `<script>` — etwa in einem Kommentar, der den eigenen Fund beschreibt — trifft dieselbe
   naive Textsuche nicht (sie stoppt beim ERSTEN Treffer), zeigt aber, dass die Suche keine
   echte HTML-Auswertung ist. Repariert wird der Anker hier NICHT (eigener, größerer Zuschnitt
   — s. Bericht `rahmen-schutz-krypto-block-anker-fund-2026-09-18.md`); diese Probe hält nur
   fest, DASS die Zerbrechlichkeit besteht, damit sie beim nächsten Mal nicht neu entdeckt,
   sondern nur wiedererkannt werden muss.

   WICHTIG FÜR WEN AUCH IMMER DIESE PROBE EINES TAGES ROT SIEHT: eine bekannte Lücke
   festzuhalten heißt, dass eine ordentliche REPARATUR DIESES BEFUNDS diese Probe zu Recht rot
   macht — die Probe hält den DEFEKTEN Zustand fest, nicht den gewünschten. Wird `ersterScriptBlock`
   künftig über `TRAEGER_SIGNATUREN` statt über die Position verankert (der im Bericht genannte
   Weg), WIRD DIESE PROBE ROT, UND DAS IST DANN RICHTIG SO: nicht den Fix zurücknehmen, sondern
   DIESE Probe ersatzlos LÖSCHEN, weil ihr Gegenstand — die Zerbrechlichkeit — nicht mehr
   besteht. Sie ist absichtlich keine Zusicherung „so bleibt es", sondern ein Gedächtnis „so ist
   es heute". */
test('[Klasse-A] W-krypto-propagation·Rot-Beweis: ein zusätzliches namenloses Skript-Element VOR dem echten Block lässt den Prüfer den falschen Block hashen (BEKANNTE LÜCKE, s. Kopf-Kommentar — wird sie rot, weil der Anker repariert wurde: löschen, nicht den Fix zurücknehmen)', () => {
  const dir = fixture();
  const echt = fs.readFileSync(path.join(dir, 'app.html'), 'utf8');
  // Genau der real getroffene Fall: ein weiteres <script>-Element ohne Kennung, VOR dem
  // eigentlichen VdCrypto-Block, harmlos für sich (tut nichts Kryptografisches).
  const mutiert = echt.replace('<script>\n' + BLOCK, '<script>\nfunction harmlos() {}\n</script>\n<script>\n' + BLOCK);
  assert.notEqual(mutiert, echt, 'Ersetzung griff nicht — die Probe ist veraltet');
  fs.writeFileSync(path.join(dir, 'app.html'), mutiert);

  const r = pruefe(dir);
  const traeger = r.traeger.find((t) => t.datei === 'app.html');
  assert.ok(traeger, 'app.html muss weiterhin als Träger erkannt werden — die Signatur-Suche selbst ist nicht betroffen');
  assert.notEqual(traeger.hash, BLOCK_HASH,
    'ROT ERWARTET, UND DAS IST DER FUND: der Prüfer hasht das zusätzliche, harmlose Element statt des echten Blocks — '
    + 'ein Träger, der am Krypto-Block nichts geändert hat, wird trotzdem als abweichend gemeldet. '
    + 'WIRD DIESE ZEILE HIER SELBST ROT (assert.notEqual schlägt fehl, weil der Hash jetzt DOCH stimmt): '
    + 'das ist die gute Nachricht, der Anker wurde repariert — dann diese Probe löschen, keinen Fix zurücknehmen.');
});

test('[Klasse-A] W-krypto-propagation: das echte Repo ist vollständig propagiert', () => {
  const r = pruefe(path.join(__dirname, '..'));
  assert.deepEqual(r.fehler, [],
    'Block-Propagation im Repo unvollständig:\n' + r.fehler.join('\n'));
  assert.ok(r.traeger.length >= 5, 'es müssen mindestens fünf Träger gefunden werden (4 Anwendungen + kanonische Quelle)');
  assert.ok(r.vollPins.length >= 7, 'es müssen mindestens sieben Voll-Pin-Stellen gefunden werden');
});

/* ════════════════════════════════════════════════════════════════════════
   ANHANG — Die `.vdkey`-Hüllenschicht (U2-ADR-218)
   ────────────────────────────────────────────────────────────────────────
   Derselbe Beweis-Anspruch wie oben, für den eigenen Abschnitt `pruefeHuelle`:
   Positivkontrolle an einem erfundenen Fixture, eine echte Rotprobe (eine
   Kopie weicht ab), eine Gegenkontrolle (ein Stück mit nur EINEM Träger ist
   kein Fehlalarm — der Teiler hat `entschluesseleSchluesselJwk` bewusst
   nicht), und die Positivkontrolle am echten Repo.
   ════════════════════════════════════════════════════════════════════════ */
test('[Klasse-A] W-Hüllenschicht Positivkontrolle: zwei Träger mit identischem Stück ergeben 0 Befunde', () => {
  const dir = fixture({
    'a.html': 'async function schuetzeSchluesselJwk(jwk, pw) { return { jwk, pw }; }\n',
    'b.html': 'async function schuetzeSchluesselJwk(jwk, pw) { return { jwk, pw }; }\n',
  });
  const h = pruefeHuelle(dir);
  assert.deepEqual(h.fehler, [], 'zwei byte-identische Träger dürfen keinen Befund erzeugen');
  assert.equal(h.funde.schuetzeSchluesselJwk.length, 2);
});

test('[Negativprobe][Klasse-A] W-Hüllenschicht: eine Kopie weicht vom anderen Träger ab', () => {
  // Genau der Fund der Erhebung vom 02.09.2026: „beide funktionieren noch,
  // sind aber im Detail auseinandergelaufen" — der bisherige Rundlauf-Test
  // (teiler-geschuetzt-sichern.test.js) sähe diesen Fall nur, wenn die
  // Abweichung den Rundlauf selbst bricht. Dieser Wächter sieht ihn immer.
  const dir = fixture({
    'a.html': 'async function schuetzeSchluesselJwk(jwk, pw) { return { jwk, pw }; }\n',
    'b.html': 'async function schuetzeSchluesselJwk(jwk, pw) { return { jwk, pw, extra: 1 }; }\n',
  });
  const h = pruefeHuelle(dir);
  assert.ok(h.fehler.some((f) => f.startsWith('HÜLLE schuetzeSchluesselJwk')),
    'zwei auseinandergelaufene Träger müssen rot machen, Befunde: ' + JSON.stringify(h.fehler));
});

test('[Klasse-A] W-Hüllenschicht Gegenkontrolle: ein Stück mit nur einem Träger ist kein Fehlalarm', () => {
  // Der Teiler kann nur schützen, nicht öffnen — `entschluesseleSchluesselJwk`
  // hat im echten Repo genau einen Träger (den Zertifikator). Ein Wächter,
  // der „muss mindestens zweimal vorkommen" verlangte, würde das rot machen.
  const dir = fixture({
    'a.html': 'async function entschluesseleSchluesselJwk(w, pw) { return w; }\n',
  });
  const h = pruefeHuelle(dir);
  assert.deepEqual(h.fehler, [], 'ein einzelner Träger ist per Definition identisch mit sich selbst');
  assert.equal(h.funde.entschluesseleSchluesselJwk.length, 1);
});

test('[Klasse-A] W-Hüllenschicht Gegenkontrolle: eine abweichende Konstante macht rot, eine gleiche nicht', () => {
  const gruen = pruefeHuelle(fixture({
    'a.html': 'const PROTECTED_KEY_MARKER_VERSION = 1;\n',
    'b.html': 'const PROTECTED_KEY_MARKER_VERSION = 1;\n',
  }));
  assert.deepEqual(gruen.fehler, []);

  const rot = pruefeHuelle(fixture({
    'a.html': 'const PROTECTED_KEY_MARKER_VERSION = 1;\n',
    'b.html': 'const PROTECTED_KEY_MARKER_VERSION = 2;\n',
  }));
  assert.ok(rot.fehler.some((f) => f.startsWith('HÜLLE PROTECTED_KEY_MARKER_VERSION')),
    'eine abweichende Konstante muss rot machen, Befunde: ' + JSON.stringify(rot.fehler));
});

test('[Klasse-A] W-Hüllenschicht: das echte Repo ist vollständig propagiert', () => {
  const h = pruefeHuelle(path.join(__dirname, '..'));
  assert.deepEqual(h.fehler, [],
    'Hüllenschicht im Repo auseinandergelaufen:\n' + h.fehler.join('\n'));
  assert.equal(h.funde.schuetzeSchluesselJwk.length, 2, 'Teiler + Zertifikator');
  assert.equal(h.funde.entschluesseleSchluesselJwk.length, 1, 'nur der Zertifikator — der Teiler kann nur schützen');
  assert.equal(h.funde._aadFuerSchluesselhuelle.length, 2, 'Teiler + Zertifikator');
  assert.equal(h.funde.PROTECTED_KEY_MARKER_VERSION.length, 2, 'Teiler + Zertifikator');
  // NACHTRAG 04.09.2026 (U2-ADR-249, Zuschnitt Sperrposten 1): istGeschuetzteSchluesseldatei
  // stand als einziges Hüllen-Stück bisher NICHT unter diesem Wächter — jetzt aufgenommen,
  // zusammen mit der neuen Allowlist-Konstante, die an die Stelle der strikten Gleichheit tritt.
  assert.equal(h.funde.istGeschuetzteSchluesseldatei.length, 2, 'Teiler + Zertifikator');
  assert.equal(h.funde.PROTECTED_KEY_VERSION_ALLOWLIST.length, 2, 'Teiler + Zertifikator');
  // NACHTRAG 03.09.2026 (Auftrag, Zug 1 der Signierungs-Automatisierung): vier
  // Anwendungen tragen _signJWS — der Teiler bewusst NICHT (Isolations-Entscheidung
  // 23.08.2026, „der JWS-Block bleibt draußen", vivodepot-schluessel-teilen.html:29).
  assert.equal(h.funde._signJWS.length, 4,
    'vc-issuer + template-generator + vivodepot + vivodepot-lesen — der Teiler trägt den JWS-Block absichtlich nicht');
});

test('[Negativprobe][Klasse-A] W-Hüllenschicht: _signJWS-Drift zwischen zwei Trägern wird erkannt', () => {
  // NACHTRAG 03.09.2026 (Auftrag): dieselbe Rot-Beweis-Form wie bei
  // schuetzeSchluesselJwk oben, aber NAMENTLICH für die Signatur-Operation selbst —
  // sie ist der Punkt, an dem eine künftige HSM-Anbindung ansetzt, Drift hier ist die
  // teuerste Sorte. Ein generischer Mechanismus-Beleg (oben) beweist nicht, dass GENAU
  // dieser Name auch wirklich in der Liste steht.
  const dir = fixture({
    'a.html': 'async function _signJWS(payload, privateKey, opts) { return "eins"; }\n',
    'b.html': 'async function _signJWS(payload, privateKey, opts) { return "zwei"; }\n',
  });
  const h = pruefeHuelle(dir);
  assert.ok(h.fehler.some((f) => f.startsWith('HÜLLE _signJWS')),
    'zwei auseinandergelaufene _signJWS-Kopien müssen rot machen, Befunde: ' + JSON.stringify(h.fehler));
});

test('[Negativprobe][Klasse-A] W-Hüllenschicht: istGeschuetzteSchluesseldatei-Drift zwischen zwei Trägern wird erkannt', () => {
  // NACHTRAG 04.09.2026 (U2-ADR-249): dieselbe Rot-Beweis-Form wie bei _signJWS oben, jetzt
  // für die Erkennungsfunktion selbst — genau die Stelle, deren Versionsprüfung von strikter
  // Gleichheit auf eine Allowlist umgestellt wurde. Ein generischer Mechanismus-Beleg (oben beim
  // Konstanten-Test) beweist nicht, dass GENAU dieser Funktionsname auch wirklich in der Liste
  // steht — das war vor diesem Zuschnitt der Fall (Nebenbefund der Ermittlung vom 04.09.2026).
  const dir = fixture({
    'a.html': 'function istGeschuetzteSchluesseldatei(geparst) { return !!(geparst && geparst.vivodepotProtectedKey === 1); }\n',
    'b.html': 'function istGeschuetzteSchluesseldatei(geparst) { return !!(geparst && [1].includes(geparst.vivodepotProtectedKey)); }\n',
  });
  const h = pruefeHuelle(dir);
  assert.ok(h.fehler.some((f) => f.startsWith('HÜLLE istGeschuetzteSchluesseldatei')),
    'zwei auseinandergelaufene istGeschuetzteSchluesseldatei-Kopien müssen rot machen, Befunde: ' + JSON.stringify(h.fehler));
});
