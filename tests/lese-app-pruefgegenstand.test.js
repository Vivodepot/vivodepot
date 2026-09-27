'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A318 Zug 2 — die Lese-App soll Zertifikate prüfen. Sie hat nichts zu prüfen.
   ────────────────────────────────────────────────────────────────────────────
   ENTSCHIEDEN (E6 der Pro-Übergabe, 18.08.2026): „Die Lese-App prüft Zertifikate
   — vor v1, nicht danach."

   GEMESSEN VOR DEM BAU, wie der Auftrag es ausdrücklich verlangt („Vorher zu
   messen und zu melden, nicht zu improvisieren"): **Es gibt in der Lese-App
   keinen Prüfgegenstand.** Nicht, weil die Prüffunktion fehlt — sie ist da —,
   sondern weil das, was sie prüfen müsste, das Depot nie erreicht:

     · Die vier amtlichen Basis-Vorlagen tragen ihr `templateJws` im KERN
       (`BASIS_VORLAGEN`), nicht im Depot. Der Empfänger sieht sie nie.
     · `data.importierteVorlagen[]` — der einzige Vorlagen-Rest, der in einem
       Depot landet — trägt `wortlaut`, `wortlautQuelle` und `anbieterName`.
       **Kein `templateJws`, kein Anbieter-Zertifikat.** Der Kern prüft die
       Signatur beim IMPORT und legt danach nur das Ergebnis ab.
     · Kein einziger Schlüssel des Depot-Grundgerüsts trägt ein Zertifikat.

   WAS DAS BEDEUTET: Ein Anker in der Lese-App wäre gebaut und würde nie
   gerufen; ein Aufruf hätte keine Eingabe; eine Anzeige („geprüft und gültig")
   behauptete eine Prüfung, die nicht stattfindet. **Das wäre schlimmer als
   keine Prüfung** — es ist genau die Klasse Aussage, gegen die die
   Wahrhaftigkeits-Achse steht.

   WAS FEHLT, IST EIN FORMATANTEIL: das Zertifikat müsste im Depot mitreisen.
   Das ist ein neuer Schlüssel und damit eine Migrationsstufe — und die ist eine Produktentscheidung, nicht dem Bau.

   WARUM DIESE PROBE ÜBERHAUPT STAND: damit die Grenze nicht unbemerkt
   verschoben wird. Sobald ein Zertifikat den Weg ins Depot findet, wird sie rot
   — und dann ist Zug 2 baubar, nicht vorher. Dieselbe Bauart wie die
   Blocktext-Grenze aus A262.

   ── NACHTRAG 20.08.2026: DIE GRENZE IST GEFALLEN, UND ZWAR IN ZWEI SCHRITTEN ──
   Schema 66 (A337/A345, 19.08.) liess den Beleg mitreisen —
   `importierteVorlagen[].beleg = { templateJws, providerCredentialJws }`. Damit
   war der Prüfgegenstand da, den diese Datei als fehlend gemessen hat. A318 Zug 2
   (heute) hat die Schicht scharfgeschaltet: Produktiv-Anker, Prüfkette, vier
   angezeigte Zustände (`tests/lese-app-zertifikate.test.js`).

   DIESE DATEI BLEIBT — als Protokoll und als Messung dessen, was WEITER GILT:
   die vier amtlichen Vorlagen wohnen im Kern und erreichen kein Depot, und der
   Eintrag selbst trägt nach wie vor kein nacktes `templateJws`, sondern den
   Beleg unter seinem eigenen Schlüssel. **Die zwei Proben, die den alten Zustand
   festhielten (kein Anker, kein Aufrufer), sind ERSETZT statt gelöscht** — an
   ihrer Stelle steht die Gegenprobe, dass beides jetzt da ist. Eine gelöschte
   Probe hinterlässt keine Spur; eine umgedrehte sagt, wann sich was geändert hat.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');

test('[A318·Zug2·Messung] das Grundgerüst trägt weiterhin kein Zertifikat — der Beleg hängt am Eintrag', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const verdaechtig = Object.keys(d).filter(k => /jws|zertifikat|cert|signatur/i.test(k));
  assert.deepEqual(verdaechtig, [],
    'der Beleg wohnt am Vorlagen-Eintrag (`importierteVorlagen[].beleg`), nicht als eigener Depot-Schlüssel — '
    + 'ein zweiter Ort für dieselbe Sache wäre die Doppelquelle, gegen die A337 gebaut ist');
});

test('[A318·Zug2·Messung] ein importierter Vorlagen-Eintrag trägt kein `templateJws`', () => {
  const q = fs.readFileSync(KERN, 'utf8');
  // U2-ADR-404 (12.09.2026): die Schreibstelle wurde aus importAnwenden in eine eigene,
  // ziel-parameterisierte Funktion ausgelagert (_vorlagenZertifikatPlanAnwenden) — `data.push`
  // heißt seither `ziel.push`, wörtlich sonst unverändert (Regressionsbeweis: alle bestehenden
  // K9-Tests bleiben grün). Derselbe, weiterhin einzige Anlege-Weg, neuer Bezeichner.
  const i = q.indexOf('ziel.importierteVorlagen.push({');
  assert.ok(i > 0, 'der einzige Anlege-Weg eines Vorlagen-Eintrags');
  const rumpf = q.slice(i, q.indexOf('});', i));
  for (const feld of ['templateJws', 'zertifikat', 'jws']) {
    assert.equal(rumpf.includes(feld), false,
      'der Eintrag trägt „' + feld + '" — dann hätte die Lese-App einen Prüfgegenstand');
  }
  // Was er STATTDESSEN trägt: das Ergebnis der Prüfung, nicht ihre Eingabe.
  for (const feld of ['wortlaut', 'wortlautQuelle', 'anbieterName']) {
    assert.ok(rumpf.includes(feld), 'erwartet: ' + feld);
  }
});

test('[A318·Zug2·Messung] die vier amtlichen Vorlagen tragen ihr JWS im KERN, nicht im Depot', () => {
  // NACHTRAG (U2-ADR-345, A4, 07.09.2026): ursprünglich am Quelltext gezählt (ein Export nur
  // für diese Probe wäre unverdrahteter Code, A253, gewesen). Seit A4 stehen die vier Vorlagen
  // im eingebetteten Bündel, nicht mehr als natives Array-Literal — ein Quelltext-Regex fände
  // 1 statt 4 Treffer (der Rest liegt als JSON-Text in einem einzigen escapten String-Literal).
  // `STANDARD_VORLAGEN` ist bereits über `load-kern.js` exportiert — für andere Konsumenten
  // (u. a. `tools/dokumentmodule-ins-buendel-schreiben.js`, `tests/dokumentmodule-motor-tabellen-a4.test.js`),
  // nicht neu für diese Probe — die Messung darf sich darum jetzt auf die API stützen, ohne
  // selbst unverdrahteten Code zu erzeugen.
  const { V } = ladeKern();
  assert.equal(V.STANDARD_VORLAGEN.length, 4, 'vier signierte Basis-Vorlagen, eingebettet im Kern');
  assert.equal(V.STANDARD_VORLAGEN.filter((v) => typeof v.templateJws === 'string' && v.templateJws.length > 0).length, 4,
    'alle vier tragen ihr JWS');
  const l = fs.readFileSync(LESEN, 'utf8');
  assert.equal(l.includes('const STANDARD_VORLAGEN'), false,
    'die Lese-App kennt sie nicht — sie sind nie in einem Depot');
});

/* Die zwei umgedrehten Proben. Sie standen hier als Messung des alten Zustands; heute
   messen sie denselben Gegenstand in der anderen Richtung. Wer die Datei liest, sieht am
   Namen, dass sich etwas bewegt hat — und im Kopf, wann und warum. */
test('[A318·Zug2·Gegenprobe] die Prüffunktion hat jetzt einen Aufrufer', () => {
  const q = fs.readFileSync(LESEN, 'utf8');
  assert.ok(q.includes('function vorlagenPruefstandBerechnen'),
    'der Prüfstand ist die Stelle, an der die Kette gerufen wird');
  const aufrufe = (q.match(/vorlagenPruefstandBerechnen\s*\(/g) || []).length;
  assert.ok(aufrufe >= 2, 'Deklaration UND mindestens ein Aufrufer (gefunden: ' + aufrufe + ')');
  const kette = (q.match(/verifiziereTemplateKette\s*\(/g) || []).length;
  assert.ok(kette >= 2, 'auch die zweistufige Kette wird gerufen, nicht nur erklärt');
});

test('[A318·Zug2·Gegenprobe] der Produktiv-Anker steht in der Lese-App — statisch, ohne Verbindung', () => {
  const q = fs.readFileSync(LESEN, 'utf8');
  assert.ok(q.includes('TEST_SENTINEL_PUBLIC_JWK'), 'der Sentinel bleibt daneben — Test-Injektion');
  assert.ok(/const\s+TRUST_AUTHORITY_PUBLIC_JWK/.test(q),
    'der Anker ist eine Deklaration, keine Absichtserklärung im Kommentar');
  // Keine Online-Auflösung: der Anker wird nicht geholt, er liegt da.
  assert.equal(/fetch\s*\(/.test(q), false, 'die Lese-App holt nichts aus dem Netz — auch keinen Anker');
});
