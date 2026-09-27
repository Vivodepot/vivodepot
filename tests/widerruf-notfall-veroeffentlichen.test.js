'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Test — Notfall-Widerruf veröffentlichen (U2-ADR-173)
   ────────────────────────────────────────────────────────────────────────────
   Läuft auf einer Kopie von vivodepot.html/sw.js/vivodepot-lesen.html, nie im
   echten Arbeitsbaum — derselbe Grund wie bei jedem Werkzeug, das Dateien
   schreibt: eine Mutation im echten Repo träfe parallel laufende Tests, die
   denselben Baum lesen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { lauf, THUMBPRINT_FORM, naechsteVersion } = require('../tools/widerruf-notfall-veroeffentlichen.js');
const B = require('../tools/build-widerrufsliste.js');

const REPO = path.join(__dirname, '..');
const IMMER_JA = async () => true;
const IMMER_NEIN = async () => false;

// Ein echter RFC-7638-Thumbprint (43 Zeichen, base64url) — Wegwerf-Beispielwert, kein Bezug zu
// irgendeinem realen Schlüssel.
const TP1 = '7ocdRc0p1lLTg5ZkPVgIXiKAfYQScmej6vxWByHTkOA';
const TP2 = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';

function mitKopie(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'widerruf-notfall-'));
  const kernPfad = path.join(tmp, 'vivodepot.html');
  const swPfad = path.join(tmp, 'sw.js');
  const lesenPfad = path.join(tmp, 'vivodepot-lesen.html');
  fs.copyFileSync(path.join(REPO, 'vivodepot.html'), kernPfad);
  fs.copyFileSync(path.join(REPO, 'sw.js'), swPfad);
  fs.copyFileSync(path.join(REPO, 'vivodepot-lesen.html'), lesenPfad);
  return Promise.resolve(fn({ kernPfad, swPfad, lesenPfad })).finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
}

test('[Notfall-Widerruf] Thumbprint-Form: 43 Zeichen base64url, sonst abgelehnt', () => {
  assert.ok(THUMBPRINT_FORM.test(TP1));
  assert.ok(!THUMBPRINT_FORM.test('zu-kurz'));
  assert.ok(!THUMBPRINT_FORM.test(TP1 + '!'));
  assert.ok(!THUMBPRINT_FORM.test(TP1 + 'X'));   // 44 Zeichen — zu lang
});

test('[Notfall-Widerruf] naechsteVersion zählt hoch, lehnt unbekanntes Format ab', () => {
  assert.equal(naechsteVersion('v390'), 'v391');
  assert.throws(() => naechsteVersion('390'));
});

test('[Notfall-Widerruf·Rot-Beweis] ungültiger Thumbprint bricht ab, schreibt nichts', async () => {
  await mitKopie(async ({ kernPfad, swPfad, lesenPfad }) => {
    const vorher = fs.readFileSync(kernPfad, 'utf8');
    const ok = await lauf({ thumbprints: ['zu-kurz'], kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_JA });
    assert.equal(ok, false);
    assert.equal(fs.readFileSync(kernPfad, 'utf8'), vorher, 'Kern unverändert bei ungültigem Thumbprint');
  });
});

test('[Notfall-Widerruf·Gegenprobe] Ablehnung bei der Bestätigung schreibt nichts', async () => {
  await mitKopie(async ({ kernPfad, swPfad, lesenPfad }) => {
    const vorher = fs.readFileSync(kernPfad, 'utf8');
    const ok = await lauf({ thumbprints: [TP1], kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_NEIN });
    assert.equal(ok, false);
    assert.equal(fs.readFileSync(kernPfad, 'utf8'), vorher, 'Kern unverändert bei Ablehnung');
  });
});

test('[Notfall-Widerruf] Beleg: trägt genau den Thumbprint ein, hebt SCHALEN_STAND/CACHE im Lockstep, spiegelt die Lese-App', async () => {
  await mitKopie(async ({ kernPfad, swPfad, lesenPfad }) => {
    const kernVorher = fs.readFileSync(kernPfad, 'utf8');
    const standVorher = /^const SCHALEN_STAND = 'v(\d+)';/m.exec(kernVorher)[1];
    const swVorher = fs.readFileSync(swPfad, 'utf8');

    const ok = await lauf({ thumbprints: [TP1], anbieterHinweis: 'Test-Anlass', kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_JA });
    assert.equal(ok, true);

    const kernNachher = fs.readFileSync(kernPfad, 'utf8');
    assert.ok(kernNachher.includes("'" + TP1 + "'"), 'Thumbprint steht in der Kern-Sperrliste');
    const standNachher = /^const SCHALEN_STAND = 'v(\d+)';/m.exec(kernNachher)[1];
    assert.equal(Number(standNachher), Number(standVorher) + 1, 'SCHALEN_STAND genau um eins erhöht');

    const swNachher = fs.readFileSync(swPfad, 'utf8');
    assert.ok(swNachher.includes("vivodepot-shell-v" + standNachher), 'sw.js CACHE folgt demselben Stand — Lockstep');
    assert.notEqual(swNachher, swVorher);

    // A405-Gate: die Lese-App-Region muss jetzt dieselbe Liste tragen wie der Kern — derselbe
    // Vergleich wie tools/build-widerrufsliste.js --check.
    const ausKern = B.region(B.listeAusKern(kernNachher));
    const lesenNachher = fs.readFileSync(lesenPfad, 'utf8');
    assert.ok(lesenNachher.includes(ausKern), 'Lese-App-Region driftet nicht vom Kern');

    // Nur DIESE eine Änderung — kein sonstiger Text im Kern angerührt (Diff auf Zeilenebene).
    const zeilenVorher = kernVorher.split('\n');
    const zeilenNachher = kernNachher.split('\n');
    assert.equal(zeilenVorher.length, zeilenNachher.length, 'keine Zeile hinzugefügt/entfernt');
    const geaenderteZeilen = zeilenVorher.filter((z, i) => z !== zeilenNachher[i]);
    assert.equal(geaenderteZeilen.length, 2, 'genau zwei Zeilen geändert: WIDERRUFS_LISTE und SCHALEN_STAND');
  });
});

test('[Notfall-Widerruf] Idempotent: ein bereits eingetragener Thumbprint wird nicht doppelt aufgenommen', async () => {
  await mitKopie(async ({ kernPfad, swPfad, lesenPfad }) => {
    await lauf({ thumbprints: [TP1], kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_JA });
    const nachErstemLauf = fs.readFileSync(kernPfad, 'utf8');

    const ok = await lauf({ thumbprints: [TP1], kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_JA });
    assert.equal(ok, true);
    assert.equal(fs.readFileSync(kernPfad, 'utf8'), nachErstemLauf, 'zweiter Lauf mit demselben Thumbprint ändert nichts mehr');
  });
});

test('[Notfall-Widerruf] Gemischt: neuer und bereits vorhandener Thumbprint — nur der neue wird ergänzt, keine Duplikate', async () => {
  await mitKopie(async ({ kernPfad, swPfad, lesenPfad }) => {
    await lauf({ thumbprints: [TP1], kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_JA });
    await lauf({ thumbprints: [TP1, TP2], kernPfad, swPfad, lesenPfad, bestaetigen: IMMER_JA });

    const kernNachher = fs.readFileSync(kernPfad, 'utf8');
    const liste = JSON.parse(B.listeAusKern(kernNachher).replace(/'/g, '"'));
    assert.deepEqual(liste.sort(), [TP1, TP2].sort());
    assert.equal(liste.filter((t) => t === TP1).length, 1, 'kein Duplikat von TP1');
  });
});
