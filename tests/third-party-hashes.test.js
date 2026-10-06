'use strict';
/* Jede SHA-256 in THIRD_PARTY_LICENSES passt zu ihrem Gegenstand (Befund THIRD-PARTY-HASHES-VERALTET, 03.10.2026).
   Werkzeug: tools/third-party-hashes-pruefen.js. Rot-Beweis: ein Hash um ein Zeichen verändert. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pruefen, gitShowAusRepo } = require('../tools/third-party-hashes-pruefen.js');

const REPO = path.join(__dirname, '..');
const TEXT = fs.readFileSync(path.join(REPO, 'THIRD_PARTY_LICENSES'), 'utf8');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

test('jede SHA-256 in THIRD_PARTY_LICENSES stimmt (inline-Blöcke, Schriftdateien, Quelle in der Git-Historie)', () => {
  const r = pruefen({ text: TEXT, kern: KERN, gitShow: gitShowAusRepo });
  assert.deepEqual(r.befunde, []);
  // Gezählt wird, was gefunden ist: geprüft oder „ohne Historie“ (Quelle v1.0.919, 06.10.2026). Im öffentlichen Zuschnitt fehlen
  // die Bytes von Eintrag 4 (WOFF2 vor dem Zuschnitt, nur in der Historie des Arbeits-Repos); dort wurden die vier Werte gemessen.
  assert.ok(r.geprueft.length + r.ohneHistorie.length >= 8,
    'Vorbedingung: die Prüfsummen werden gefunden (' + r.geprueft.length + ' geprüft, ' + r.ohneHistorie.length + ' ohne Historie)');
  assert.equal(r.extern.length, 2, 'genau die zwei Wortlisten-Rohdateien sind extern');
  // Welcher Ort ist das? Erkannt daran, ob der Quell-Commit von Eintrag 4 im Objektspeicher liegt — eine eigene git-Abfrage,
  // nicht das Ergebnis des Werkzeugs (sonst prüfte der Test sich selbst):
  //  · Commit da (Arbeits-Repo, voller Klon) → 0 Zeilen „ohne Historie“, Eintrag 4 wird gerechnet;
  //  · Commit fehlt (öffentlicher Zuschnitt mit eigener Historie, flacher Klon) → die 4 Zeilen von Eintrag 4 stehen als „ohne Historie“.
  const { execFileSync } = require('node:child_process');
  const gitEnv = require('../tools/lib/ohne-git-umgebung.js').ohneGitUmgebung();
  let flach = false;
  try { flach = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: REPO, env: gitEnv, encoding: 'utf8' }).trim() === 'true'; } catch (_) { flach = false; }
  let quelleDa = false;
  try { execFileSync('git', ['cat-file', '-e', 'a1d5660d4^{commit}'], { cwd: REPO, env: gitEnv, stdio: 'ignore' }); quelleDa = true; } catch (_) { quelleDa = false; }
  const arbeitsRepo = quelleDa;
  if (flach) console.log('# Hinweis: flacher Klon — Eintrag 4 (Git-Fassung a1d5660d4^) bleibt ungeprüft (' + r.ohneHistorie.length + ' Zeilen).');
  assert.equal(r.ohneHistorie.length, (arbeitsRepo && !flach) ? 0 : 4,
    (arbeitsRepo && !flach) ? 'Arbeits-Repo, voll: Eintrag 4 muss gerechnet werden — die Fassung a1d5660d4^ fehlt?' : 'Zuschnitt oder flacher Klon: die vier Zeilen von Eintrag 4 stehen als „ohne Historie“');
});

test('ohne Git-Historie: Eintrag 4 steht als „ohne Historie“, wird nicht als Abweichung gemeldet und nicht still übergangen', () => {
  const r = pruefen({ text: TEXT, kern: KERN, gitShow: () => { throw new Error('keine Historie'); } });
  assert.deepEqual(r.befunde, []);
  assert.equal(r.ohneHistorie.length, 4);
});

// Ob die Bytes von Eintrag 4 hier liegen: dieselbe eigene git-Abfrage wie oben, nicht das Ergebnis des Werkzeugs.
function historieVonEintrag4Da() {
  const { execFileSync } = require('node:child_process');
  const gitEnv = require('../tools/lib/ohne-git-umgebung.js').ohneGitUmgebung();
  try { if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: REPO, env: gitEnv, encoding: 'utf8' }).trim() === 'true') return false; } catch (_) { /* weiter */ }
  try { execFileSync('git', ['cat-file', '-e', 'a1d5660d4^{commit}'], { cwd: REPO, env: gitEnv, stdio: 'ignore' }); return true; } catch (_) { return false; }
}

test('Rot-Beweis: ein Hash um ein Zeichen verändert wird gefunden — je Art (inline-Block, Datei, Git-Historie)', () => {
  for (const muster of [/(SHA-256 \(inline-Block\): )([0-9a-f])/, /(Inter-Bold-pdf-subset\.ttf\s+)([0-9a-f])/]) {
    const t = TEXT.replace(muster, (_, a, c) => a + (c === '0' ? '1' : '0'));
    assert.notEqual(t, TEXT, String(muster));
    assert.equal(pruefen({ text: t, kern: KERN, gitShow: gitShowAusRepo }).befunde.length, 1, String(muster));
  }
  // Git-Historie: wo die Bytes liegen, ist der veränderte Wert ein Befund. Wo sie fehlen (öffentlicher Zuschnitt), kann ihn keine
  // Probe erkennen; dann bleibt die Zeile „ohne Historie“ und wird nicht still übergangen.
  const muster = /(InterDisplay-Regular\.woff2\s+)([0-9a-f])/;
  const t = TEXT.replace(muster, (_, a, c) => a + (c === '0' ? '1' : '0'));
  assert.notEqual(t, TEXT, String(muster));
  const r = pruefen({ text: t, kern: KERN, gitShow: gitShowAusRepo });
  if (historieVonEintrag4Da()) assert.equal(r.befunde.length, 1, String(muster));
  else { assert.deepEqual(r.befunde, []); assert.equal(r.ohneHistorie.length, 4); }
});

test('Rot-Beweis Arbeits-Repo: wo der Commit a1d5660d4 erreichbar ist, macht eine Zeile „ohne Historie“ die Probe oben rot', () => {
  // Die Weiche ist eine Messung (git cat-file -e a1d5660d4^{commit}, s. historieVonEintrag4Da), kein Schalter.
  const r = pruefen({ text: TEXT, kern: KERN, gitShow: () => { throw new Error('keine Historie'); } });
  assert.equal(r.ohneHistorie.length, 4, 'Vorbedingung: ohne Historie stehen die vier Zeilen offen');
  // Erwartung der Probe oben, je Ort: im Arbeits-Repo 0 (dann wäre dieses Ergebnis rot), im Zuschnitt 4.
  const erwartet = historieVonEintrag4Da() ? 0 : 4;
  if (erwartet === 0) assert.throws(() => assert.equal(r.ohneHistorie.length, erwartet));
  else assert.equal(r.ohneHistorie.length, erwartet);
});

test('Rot-Beweis ohne Historie: eine weitere Zeile unter Eintrag 4 ist eine fünfte „ohne Historie“ — die Probe oben verlangt genau vier', () => {
  const zeile = '     700 Inter-Bold.woff2            98c66e49c299c5675426bf5562b1876c2b6b9bd8dc90a8922a49703ed4848813\n';
  assert.ok(TEXT.includes(zeile), 'Vorbedingung: die Zeile steht unter Eintrag 4');
  const t = TEXT.replace(zeile, zeile + zeile.replace('700 Inter-Bold', '800 Inter-Black'));
  const r = pruefen({ text: t, kern: KERN, gitShow: () => { throw new Error('keine Historie'); } });
  assert.equal(r.ohneHistorie.length, 5);
});

test('Rot-Beweis noble-ed25519: beide Prüfsummen hängen am eingebetteten Text — ein Zeichen mehr in der Bibliothek trifft beide', () => {
  const anfang = '// noble-ed25519 fa14496 — Anfang der eingebetteten Bibliothek\n';
  assert.ok(KERN.includes(anfang), 'Vorbedingung: Markierung im Kern');
  const kern = KERN.replace(anfang, anfang + ' ');
  const b = pruefen({ text: TEXT, kern, gitShow: gitShowAusRepo }).befunde;
  assert.equal(b.filter((x) => /noble-ed25519, eingebettet/.test(x)).length, 1);
  assert.equal(b.filter((x) => /noble-ed25519, Upstream-Build/.test(x)).length, 1);
});

test('Rot-Beweis: eine Prüfsumme ohne zuordenbaren Gegenstand ist rot', () => {
  const t = TEXT + '\nFREIER ABSCHNITT\n   irgendwas ' + 'a'.repeat(64) + '\n';
  assert.ok(pruefen({ text: t, kern: KERN, gitShow: gitShowAusRepo }).befunde.some((b) => /ohne zuordenbaren Gegenstand/.test(b)));
});
// Das Merkmal „Arbeits-Repo“ (eine zurückgehaltene ADR-Datei) prüft eine eigene, interne Probe; diese Datei geht hinaus.
