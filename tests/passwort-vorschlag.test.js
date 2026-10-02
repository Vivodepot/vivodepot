'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Passwort-Vorschlag aus sechs zufälligen Wörtern (U2-ADR-463, Ablage ohne Netz, Teil 1)
   ───────────────────────────────────────────────────────────────────────────
   Ein selbst gewähltes Passwort hält einer Kopie der Datei wenig stand; sechs Wörter aus der Liste der Produktsprache
   tragen gut 61 Bit. Die Listen stehen im Sprachmodul (`passwortWortliste`): Deutsch aus dys2p `de-1296-v1`
   (CC0/Unlicense/BSD-3), Englisch aus der EFF-Kurzliste 1 (CC BY 4.0), beide von Hand um Wörter erleichtert, die
   beim Vorlesen erschrecken oder kränken. Die Bits rechnet dieser Test an der Liste selbst nach.

   DIE KLASSE, gegen die dieser Wächter steht: ein Feld für ein neues Passwort, das den Vorschlag nicht anbietet —
   dann wählt die Bürgerin dort wieder selbst. Jedes Feld mit autocomplete="new-password" (außer der Bestätigung)
   trägt den Baustein und ist verdrahtet.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PRODUKT = require('./produkt-html-erzeugen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8'));
const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'));
const KENNUNG = 'strings:passwortWortliste.text';

function texteAus(modul) {
  return modul.texte || (modul.saetze && modul.saetze['']) || modul;
}
function liste(modul) {
  const t = texteAus(modul)[KENNUNG];
  assert.equal(typeof t, 'string', 'Vorbedingung: die Wortliste steht im Modul');
  return t.trim().split(/\s+/);
}

test('[PW-Vorschlag·Liste] beide Listen: nur a–z, ohne Doppel, sechs Wörter tragen mindestens 60 Bit', () => {
  const unsauber = (l) => l.filter((x) => !/^[a-z]{3,}$/.test(x));
  const rotFunde = unsauber(['apfel', 'Äpfel', 'ab']);
  assert.equal(rotFunde.length, 2, 'Rot-Beweis im Test: Großbuchstabe, Umlaut und zu kurze Wörter fallen auf');
  for (const [name, modul] of [['de', DE], ['en', EN]]) {
    const w = liste(modul);
    assert.deepEqual(unsauber(w), [], name + ': nur Kleinbuchstaben a–z, mindestens drei');
    assert.equal(new Set(w).size, w.length, name + ': kein Wort doppelt');
    const bit = 6 * Math.log2(w.length);
    assert.ok(bit >= 60, name + ': ' + w.length + ' Wörter, ' + bit.toFixed(1) + ' Bit');
  }
  // Stichprobe der Durchsicht: Wörter, die beim Vorlesen erschrecken, sind draußen.
  for (const raus of ['krebs', 'bombe', 'grab', 'virus']) assert.ok(!liste(DE).includes(raus), 'de ohne ' + raus);
  for (const raus of ['coma', 'grave', 'virus', 'arson']) assert.ok(!liste(EN).includes(raus), 'en ohne ' + raus);
});

test('[PW-Vorschlag·Zufall] Verwerfen statt Modulo: der Rest oberhalb des größten Vielfachen wird nie benutzt', () => {
  const { V } = PRODUKT.kernAus(PRODUKT.produktHtml('privat-de'));
  const n = 1251;
  const grenze = Math.floor(0x100000000 / n) * n;
  const folge = (werte) => { let i = 0; const f = (a) => { a[0] = werte[i++]; }; f.zahl = () => i; return f; };
  const f = folge([grenze, 0xFFFFFFFF, grenze - 1]);
  assert.equal(V._pwZufallsIndex(n, f), (grenze - 1) % n, 'die beiden Werte ab der Grenze werden verworfen');
  assert.equal(f.zahl(), 3);
  // Rot-Beweis im Test: Modulo ohne Verwerfen nähme den ersten Wert und bevorzugte die kleinen Indizes.
  const modulo = (m, g) => { const a = new Uint32Array(1); g(a); return a[0] % m; };
  assert.notEqual(modulo(n, folge([grenze, 0, 0])), V._pwZufallsIndex(n, folge([grenze, 5, 0])));
});

test('[PW-Vorschlag·Form] sechs Wörter aus der Liste der Produktsprache, die Stärke-Anzeige sagt „stark"', () => {
  for (const [slug, modul] of [['privat-de', DE], ['privat-en', EN]]) {
    const { V } = PRODUKT.kernAus(PRODUKT.produktHtml(slug));
    const w = liste(modul);
    assert.deepEqual(V.passwortWortliste(), w, slug + ': der Kern liest die Liste seines Produkts');
    const v = V.passwortVorschlag();
    const teile = v.split('-');
    assert.equal(teile.length, 6, slug + ': ' + v);
    assert.ok(teile.every((x) => w.includes(x)));
    assert.ok(V._pwIstVorschlagForm(v));
    assert.equal(V.passwortStaerke(v).stufe, 'stark');
    assert.equal(V._pwIstVorschlagForm('sonne-mond-sterne'), false);
  }
});

// Die Felder für ein neues Passwort: jedes, dessen id nicht auf 2 endet (die Bestätigung).
function neuFelder(quelle) {
  return [...quelle.matchAll(/<input id="([a-z-]+)" type="password" autocomplete="new-password"/g)].map((m) => m[1]).filter((id) => !/2$/.test(id));
}
function ohneVorschlag(quelle) {
  return neuFelder(quelle).filter((id) => !quelle.includes("pwVorschlagHTML('" + id + "'") || !quelle.includes("pwVorschlagVerdrahten('" + id + "'"));
}

test('[PW-Vorschlag·Wächter] jedes Feld für ein neues Passwort bietet den Vorschlag an und ist verdrahtet', () => {
  const felder = neuFelder(KERN);
  assert.ok(felder.length >= 8, 'Ausbeute: die Felder werden gefunden (' + felder.join(', ') + ')');
  assert.deepEqual(ohneVorschlag(KERN), []);
  const rot = KERN + '\n\'<input id="neues-feld" type="password" autocomplete="new-password">\'\n';
  const rotFunde = ohneVorschlag(rot);
  assert.equal(rotFunde.length, 1, 'Rot-Beweis im Test: ein Feld ohne Baustein fällt auf');
  assert.deepEqual(rotFunde, ['neues-feld']);
});

test('[PW-Vorschlag·Texte] Knopf, Erklärung und der Hinweis zum eigenen Passwort stehen in beiden Sprachen', () => {
  for (const [name, modul] of [['de', DE], ['en', EN]]) {
    const t = texteAus(modul);
    for (const k of ['pwVorschlagKnopf', 'pwVorschlagErklaerung', 'pwVorschlagAnderer', 'pwVorschlagVorlesen', 'pwEigenesHinweis']) {
      assert.ok(typeof t['strings:' + k + '.text'] === 'string' && t['strings:' + k + '.text'].trim(), name + ': ' + k);
    }
  }
  const { V } = PRODUKT.kernAus(PRODUKT.produktHtml('privat-de'));
  const html = V.pwVorschlagHTML('probe');
  assert.match(html, /id="probe-eigen" role="note" hidden=""/, 'der Hinweis ist zu Beginn verborgen');
  assert.match(html, /aria-live="polite"/, 'ein neuer Vorschlag wird angesagt');
});
