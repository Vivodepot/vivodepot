'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Wächter auf `PBKDF2_ITERATIONEN_JE_KRYPTOVERSION` (U2-ADR-271, 04.09.2026,
   nachgetragen 28.09.2026 — Entscheidung vom 04.09., nie gelandet)
   ────────────────────────────────────────────────────────────────────────────
   Die Auflage zur Bestätigung von U2-ADR-230s eingefrorenem Wert (600000): „muss aber
   ‚aufrüstbar' sein in Zukunft". Dieser Wächter baut den Mechanismus, nicht den künftigen
   zweiten Wert — die Zuordnung (`vivodepot.html`, direkt hinter dem gepinnten Krypto-Block)
   trägt heute genau einen Eintrag.

   WAS DIE KOPPLUNG TRÄGT UND WAS SIE NICHT TUT: `PBKDF2_ITERATIONEN_JE_KRYPTOVERSION` ist EIN
   Eintrag je Kryptoversion, die die Konstante tatsächlich verwendet — der Schlüssel ist die
   Kryptoversion, nicht irgendeine Zählung. Ein Eintrag mit einem Schlüssel, den
   `KRYPTO_VERSION_ALLOWLIST` nicht führt, wäre ein zweiter Iterationswert OHNE Kryptoversions-
   Sprung — genau das, wogegen U2-ADR-230 steht. Diese Probe prüft die Kopplung mit einem
   erzwungenen Rot-Beweis, nicht nur behauptet: derselbe Prüf-Weg, mit einem künstlich
   angehängten Schlüssel, der in `KRYPTO_VERSION_ALLOWLIST` nicht vorkommt, wirft real. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

// Derselbe Prüf-Weg, den auch das Produkt bräuchte, wenn es die Kopplung selbst durchsetzen
// wollte — hier als reine Test-Funktion, damit der Rot-Beweis (unten) sie gegen eine
// künstlich verletzte Kopie laufen lassen kann, ohne den Kern zu berühren.
function kopplungPruefen(jeVersion, versionAllowlist) {
  for (const schluessel of Object.keys(jeVersion)) {
    const version = Number(schluessel);
    assert.ok(versionAllowlist.includes(version),
      'PBKDF2_ITERATIONEN_JE_KRYPTOVERSION trägt einen Eintrag für Kryptoversion ' + schluessel
      + ', die KRYPTO_VERSION_ALLOWLIST nicht führt — ein Iterationswert ohne Kryptoversions-'
      + 'Sprung. Nach U2-ADR-230 ist das nicht erlaubt: eine neue Iterationszahl braucht einen '
      + 'echten Sprung der kryptoVersion, keinen zusätzlichen Eintrag hier allein.');
  }
  // Die Gegenrichtung (29.09.2026): jede erlaubte Kryptoversion hat ihren Eintrag — sonst sagt die Tabelle
  // über einen erlaubten Öffnungsweg nichts oder Unvollständiges.
  for (const version of versionAllowlist) {
    assert.ok(Object.prototype.hasOwnProperty.call(jeVersion, String(version)),
      'KRYPTO_VERSION_ALLOWLIST erlaubt Kryptoversion ' + version + ', PBKDF2_ITERATIONEN_JE_KRYPTOVERSION '
      + 'nennt ihre Iterationszahl aber nicht.');
  }
}

test('[PBKDF2-Allowlist·Wächter] je erlaubte Kryptoversion ein Eintrag, alle mit der lebenden Zahl', () => {
  const { V } = ladeKern();
  const je = V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION;

  assert.equal(typeof je, 'object', 'PBKDF2_ITERATIONEN_JE_KRYPTOVERSION fehlt oder ist kein Objekt');
  assert.equal(Object.isFrozen(je), true, 'die Zuordnung muss eingefroren sein — sonst ist sie kein Wächter, nur eine Notiz');
  assert.deepEqual(Object.keys(je).map(Number).sort(), [...V.KRYPTO_VERSION_ALLOWLIST].sort(),
    'die Schlüssel sind genau die erlaubten Kryptoversionen (heute 3 und 4)');
  for (const [schluessel, wert] of Object.entries(je)) {
    assert.equal(wert, V.PBKDF2_ITERATIONS,
      'Kryptoversion ' + schluessel + ': deriveMasterBits leitet versionsunabhängig mit PBKDF2_ITERATIONS ab — '
      + 'eine andere Zahl hier wäre eine Vor-Ort-Änderung ohne Versionssprung, zwei Literale für dieselbe Zahl eine Falle');
  }
  assert.equal(new Set(Object.values(je)).size, 1, 'heute genau eine Iterationszahl — eine zweite ist eine eigene Entscheidung');
});

test('[PBKDF2-Allowlist·Wächter] Kopplung an KRYPTO_VERSION_ALLOWLIST hält — Rot-Beweis erzwungen', () => {
  const { V } = ladeKern();

  // GRÜN: die echte Zuordnung gegen die echte Allowlist.
  kopplungPruefen(V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION, V.KRYPTO_VERSION_ALLOWLIST);

  // ROT-BEWEIS, ERZWUNGEN: ein zweiter Iterationswert, angehängt unter einer Kryptoversion,
  // die KRYPTO_VERSION_ALLOWLIST NICHT führt (99 kommt in [3, 4] nicht vor) — genau der Fall
  // „ein Wert hinzugefügt, ohne dass die Kryptoversion mitzieht". Muss real durchfallen, nicht
  // nur behauptet sein.
  const verletzt = Object.assign({}, V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION, { 99: 700000 });
  assert.throws(() => kopplungPruefen(verletzt, V.KRYPTO_VERSION_ALLOWLIST), /AssertionError/,
    'ROT VOR DER PROBE-ABNAHME: ein Iterationswert ohne echten Kryptoversions-Sprung muss hier anschlagen');

  // ROT-BEWEIS, Gegenrichtung (29.09.2026): fehlt der Eintrag einer erlaubten Version (hier 3, der Rückweg),
  // schlägt die Prüfung an — so stand die Zuordnung vor dieser Ergänzung.
  const ohneRueckweg = Object.fromEntries(Object.entries(V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION).filter(([k]) => Number(k) !== V.CRYPTO_VERSION_AKTUELL));
  assert.throws(() => kopplungPruefen(ohneRueckweg, V.KRYPTO_VERSION_ALLOWLIST), /Kryptoversion 3/,
    'ROT: eine erlaubte Kryptoversion ohne Eintrag muss anschlagen');

  // Gegenprobe: derselbe künstliche Fall, aber unter einer Version, die die Allowlist WIRKLICH
  // führt (3, CRYPTO_VERSION_AKTUELL) — bleibt grün. Zeigt, dass die Probe die richtige Bedingung prüft (echte Kryptoversion vs.
  // erfundene), nicht bloß "irgendein zweiter Schlüssel".
  const echterSprung = Object.assign({}, V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION, { 3: 700000 });
  kopplungPruefen(echterSprung, V.KRYPTO_VERSION_ALLOWLIST);
});

test('[PBKDF2-Allowlist·Regression] ein mit dem heutigen (einzigen) Wert verschlüsseltes Depot öffnet unverändert', async () => {
  const { V } = ladeKern();
  const passwort = 'adr271-regressionsprobe-1';

  await V.depotAnlegen(passwort);
  V.akteurSelbstErklaeren('Proband');
  V.sektorFeldSetzen('identity', 'givenName', 'ADR271');
  const umschlag = await V.depotSerialisieren();

  assert.equal(umschlag.kryptoVersion, V.CRYPTO_VERSION_ZERFALL,
    'Vorbedingung: die Probe verschlüsselt wirklich unter der Version, die PBKDF2_ITERATIONEN_JE_KRYPTOVERSION trägt');

  // Frischer Kern, wie ein echtes Wieder-Öffnen — kein Kurzschluss über denselben Prozess-Zustand.
  const { V: V2 } = ladeKern();
  await V2.depotLaden(umschlag, passwort);
  const wieder = V2.getData();

  assert.equal(wieder.sektoren.identity.givenName, 'ADR271',
    'PBKDF2_ITERATIONEN_JE_KRYPTOVERSION ist rein additiv, außerhalb des gepinnten Blocks — ein '
    + 'mit dem heutigen (einzigen) Wert angelegtes Depot muss exakt so wieder aufgehen wie vorher');
});

/* Die Gegenseite der Zuordnung: ein Depot, das mit einer NICHT gelisteten Iterationszahl abgeleitet wurde, wird beim
   Öffnen abgewiesen, nicht still angenommen. Der Kern liest die Zahl nie aus der Datei (U2-ADR-230) — er leitet mit
   der Zahl seiner Kryptoversion ab; ein fremd abgeleiteter Schlüssel besteht die AES-GCM-Prüfung nicht. Hergestellt
   wird das fremde Depot mit einer Kopie des Kerns unter os.tmpdir, deren Konstante auf 100000 steht. */
test('[PBKDF2-Allowlist·Rot-Beweis] ein Depot mit einer nicht gelisteten Iterationszahl wird beim Öffnen abgewiesen', async () => {
  const passwort = 'adr271-fremde-iterationen-1';
  const echt = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const alt = 'const PBKDF2_ITERATIONS = 600000;';
  assert.equal(echt.split(alt).length, 2, 'Vorbedingung: die Konstante steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'pbkdf2-fremd-' + process.pid + '.html');
  fs.writeFileSync(tmp, echt.replace(alt, 'const PBKDF2_ITERATIONS = 100000;'));
  const zuvor = process.env.KERN_HTML_PATH;
  let umschlag;
  try {
    process.env.KERN_HTML_PATH = tmp;
    delete require.cache[require.resolve('./load-kern.js')];
    // backen: true — die Kopie wird wie der echte Kern über _standardProduktBaken zum Produkt gebacken, nicht roh geladen.
    const { V: F } = require('./load-kern.js').ladeKern({ backen: true });
    assert.equal(F.PBKDF2_ITERATIONS, 100000, 'Vorbedingung: die Kopie leitet wirklich mit 100000 ab');
    await F.depotAnlegen(passwort);
    F.akteurSelbstErklaeren('Proband');
    F.sektorFeldSetzen('identity', 'givenName', 'FREMD');
    umschlag = await F.depotSerialisieren();
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.ok(!Object.values(ladeKern().V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION).includes(100000), 'Vorbedingung: 100000 ist nicht gelistet');
  const { V } = require('./load-kern.js').ladeKern();
  await assert.rejects(() => V.depotLaden(umschlag, passwort), 'mit dem richtigen Passwort, aber fremder Iterationszahl: abgewiesen');
  assert.notEqual((V.getData() && V.getData().sektoren && V.getData().sektoren.identity || {}).givenName, 'FREMD', 'nichts vom fremden Depot ist geladen');
});
