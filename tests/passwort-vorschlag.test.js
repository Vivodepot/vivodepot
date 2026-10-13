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

/* ── Vorbelegt (07.10.2026) ──────────────────────────────────────────────────────────────────────────────────────
   Beim Öffnen steht der Vorschlag schon im Feld und sichtbar darüber. Bedingungen der Krypto-Gegenlesung:
   (1) der Vorschlag lebt nur im Feld und in der Anzeige, je Öffnen neu, nie derselbe für zwei Felder;
   (2) selbst getippt ersetzt ihn ganz; (3) die Bestätigung bleibt leer; (4) vorbelegt heißt sichtbar.
   Die Funktionen kommen als Text aus dem ausgelieferten Kern; das Dokument ist ein kleines Modell mit genau den
   Elementen, die pwVorschlagHTML erzeugt. Der Rot-Beweis nimmt die Vorbelegung aus dem Text. */
function funktionsText(quelle, name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(quelle);
  assert.ok(m, 'Vorbedingung: ' + name + ' steht im Kern');
  return quelle.slice(m.index, quelle.indexOf('\n}\n', m.index) + 2);
}
function konstText(quelle, name) {
  const m = new RegExp('^const ' + name + ' = [^\\n]*$', 'm').exec(quelle);
  assert.ok(m, 'Vorbedingung: ' + name + ' steht im Kern');
  return m[0];
}
const VORSCHLAG_FUNKTIONEN = ['passwortWortliste', '_pwZufallsIndex', 'passwortVorschlag', 'pwVorschlagVerdrahten', 'escapeHTML'];
const VORBELEGUNG = '  if (!feld.value) neu();';

function element(hidden) {
  const hoerer = {};
  return {
    value: '', hidden: !!hidden, innerHTML: '',
    addEventListener(typ, f) { (hoerer[typ] = hoerer[typ] || []).push(f); },
    dispatchEvent(e) { for (const f of hoerer[e.type] || []) f(e); },
  };
}
// Ein Dialog mit einem Passwortfeld `id` und seiner Bestätigung `id + '2'`, so wie pwVorschlagHTML ihn anlegt.
function dialog(id) {
  const els = {
    [id]: element(false), [id + '2']: element(false),
    [id + '-vorschlag-knopf']: element(false), [id + '-vorschlag-anzeige']: element(true),
    [id + '-vorschlag-woerter']: element(false), [id + '-eigen']: element(true),
    [id + '-vorschlag-anderer']: element(false), [id + '-vorschlag-vorlesen']: element(false),
  };
  return els;
}
function bauen(quelle, ohneVorbelegung) {
  let teile = ['PW_VORSCHLAG_WOERTER', 'PW_WORTLISTE_TRENNER'].map((k) => konstText(quelle, k))
    .concat(VORSCHLAG_FUNKTIONEN.map((f) => funktionsText(quelle, f))).join('\n');
  if (ohneVorbelegung) {
    assert.ok(teile.includes(VORBELEGUNG), 'Vorbedingung Rot-Beweis: die Vorbelegung steht im Text');
    teile = teile.replace(VORBELEGUNG, '');
  }
  return (els, woerter) => {
    const document = { getElementById: (id) => els[id] || null, documentElement: { lang: 'de' } };
    const STRINGS = { passwortWortliste: woerter.join(' ') };
    class Event { constructor(type) { this.type = type; } }
    return new Function('document', 'STRINGS', 'crypto', 'Event', teile + '\nreturn { pwVorschlagVerdrahten };')(
      document, STRINGS, require('node:crypto').webcrypto, Event);
  };
}
const WOERTER = liste(DE);

test('[PW-Vorschlag·vorbelegt] beim Öffnen steht der Vorschlag im Feld und sichtbar, die Bestätigung bleibt leer', () => {
  const els = dialog('id-pw');
  bauen(KERN)(els, WOERTER).pwVorschlagVerdrahten('id-pw');
  const wert = els['id-pw'].value;
  assert.equal(wert.split('-').length, 6, 'sechs Wörter: ' + wert);
  assert.ok(wert.split('-').every((w) => WOERTER.includes(w)));
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, false, 'vorbelegt heißt sichtbar');
  for (const w of wert.split('-')) assert.ok(els['id-pw-vorschlag-woerter'].innerHTML.includes(w), 'Wort angezeigt: ' + w);
  assert.equal(els['id-pw-eigen'].hidden, true, 'kein Hinweis zum eigenen Passwort');
  assert.equal(els['id-pw2'].value, '', 'die Bestätigung bleibt leer');
});

test('[PW-Vorschlag·vorbelegt·Rot-Beweis] ohne die Vorbelegung bleibt das Feld leer und die Anzeige verborgen', () => {
  const els = dialog('id-pw');
  bauen(KERN, true)(els, WOERTER).pwVorschlagVerdrahten('id-pw');
  assert.equal(els['id-pw'].value, '');
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, true);
});

test('[PW-Vorschlag·vorbelegt] je Öffnen neu, nie derselbe für zwei Felder; ein gefülltes Feld wird nicht überschrieben', () => {
  const b = bauen(KERN);
  const werte = new Set();
  for (let i = 0; i < 20; i++) {
    const els = Object.assign(dialog('pw-neu'), dialog('kreis-pw'));
    const V = b(els, WOERTER);
    V.pwVorschlagVerdrahten('pw-neu');
    V.pwVorschlagVerdrahten('kreis-pw');
    assert.notEqual(els['pw-neu'].value, els['kreis-pw'].value, 'zwei Felder im selben Lauf');
    werte.add(els['pw-neu'].value); werte.add(els['kreis-pw'].value);
  }
  assert.equal(werte.size, 40, 'kein Vorschlag wiederholt sich über 20 Öffnungen');
  const voll = dialog('ssb-neu');
  voll['ssb-neu'].value = 'schon-da';
  b(voll, WOERTER).pwVorschlagVerdrahten('ssb-neu');
  assert.equal(voll['ssb-neu'].value, 'schon-da');
});

test('[PW-Vorschlag·vorbelegt] selbst getippt ersetzt den Vorschlag ganz', () => {
  const els = dialog('id-pw');
  bauen(KERN)(els, WOERTER).pwVorschlagVerdrahten('id-pw');
  const vorschlag = els['id-pw'].value;
  els['id-pw'].value = 'sommer2026!';
  els['id-pw'].dispatchEvent({ type: 'input' });
  assert.equal(els['id-pw'].value, 'sommer2026!');
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, true, 'der alte Vorschlag verschwindet');
  assert.equal(els['id-pw-eigen'].hidden, false, 'der Hinweis zum eigenen Passwort erscheint');
  assert.ok(!els['id-pw-vorschlag-woerter'].innerHTML.includes('sommer2026'));
  assert.notEqual(vorschlag, 'sommer2026!');
});

test('[PW-Vorschlag·vorbelegt] der Vorschlag lebt nur im Feld und in der Anzeige: kein Speicher, kein Zustand, keine Meldung', () => {
  const verboten = /localStorage|sessionStorage|indexedDB|console\.|toast|kernAPI|\bdata\.|setData|_state\b/;
  const text = VORSCHLAG_FUNKTIONEN.map((f) => funktionsText(KERN, f)).join('\n');
  assert.equal(verboten.test(text), false, 'die Vorschlags-Funktionen greifen auf nichts außerhalb von Feld und Anzeige zu');
  assert.ok(verboten.test(text.replace('anzeige.hidden = false;', 'anzeige.hidden = false; localStorage.setItem("v", letzter);')),
    'Rot-Beweis: ein Speichern fällt auf');
  // Die Bestätigung kommt in den Funktionen gar nicht vor: nichts kopiert den Vorschlag dorthin.
  assert.equal(/'2'|pw2|\+ '2'/.test(funktionsText(KERN, 'pwVorschlagVerdrahten')), false);
});

test('[PW-Vorschlag·vorbelegt] beide Übergabe-Wege an Empfänger (Datei und QR) und das Fach tragen den vorbelegten Baustein', () => {
  const felder = neuFelder(KERN);
  for (const id of ['kreis-pw', 'kreis-qr-pw', 'kreis-fach-pw']) {
    assert.ok(felder.includes(id), id + ' ist ein Feld für ein neues Passwort');
    assert.ok(KERN.includes("pwVorschlagVerdrahten('" + id + "'"), id + ' ist verdrahtet und damit vorbelegt');
  }
});
