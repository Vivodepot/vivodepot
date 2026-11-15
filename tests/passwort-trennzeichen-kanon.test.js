'use strict';
/* ════════════════════════════════════════════════════════════════════════
   PASSWORT-TRENNZEICHEN (HOCH, 11.11.2026) — die sechs Wörter öffnen so, wie sie angezeigt sind
   ────────────────────────────────────────────────────────────────────────
   Das Raster beim Anlegen zeigt die sechs vorgeschlagenen Wörter ohne Bindestrich; abgeleitet wird aus der Kanonform (klein, mit
   Bindestrichen). Probe und Öffnen nahmen nur die Kanonform an. Jetzt (K9 Variante B): eine Quelle für die Kanonform
   (pwWoerterKanon), die Probe zählt Trenner und Schreibung nicht, und JEDER Einlass des Depot-Passworts versucht nach einem
   Fehlschlag genau einmal die Kanonform. Keine neue Ableitung: ein Depot aus einem Vorschlag liegt unter der Kanonform, jedes
   andere öffnet weiter mit dem ersten Versuch.

   Teil 1: die Funktionen. Teil 2: die Einlässe im Kern und in der Lese-App, mit gezählten Ableitungen. Teil 3: der Wächter über
   die Ableitungs-Senken (VdCrypto.setupSession, depotMasterHkdfKey): jede Funktion, die sie ruft, ist entweder ein Einlass mit dem
   Rückfall, setzt ein NEUES Passwort, oder bekommt das Passwort von einem Einlass durchgereicht. Ein neuer Aufrufer ohne
   Einordnung fällt. Rot-Beweise je Teil. Die E2E-Probe: tests/e2e/passwort-woerter-wie-angezeigt.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8');
const KANON = 'tinte-wolke-hafen-apfel-geige-birke';
const WIE_ANGEZEIGT = 'tinte wolke hafen apfel geige birke';
const LISTE = ['tinte', 'wolke', 'hafen', 'apfel', 'geige', 'birke', 'kanne'];

/* Zählt die PBKDF2-Ableitungen während `lauf` (wie tests/passwort-nfc-klasse.test.js). */
async function pbkdf2Zaehlen(lauf) {
  const proto = Object.getPrototypeOf(webcrypto.subtle);
  const echt = proto.deriveBits;
  let n = 0;
  proto.deriveBits = function (alg, ...rest) { if (alg && alg.name === 'PBKDF2') n++; return echt.call(this, alg, ...rest); };
  try { await lauf(); } finally { proto.deriveBits = echt; }
  return n;
}
const kopie = (o) => JSON.parse(JSON.stringify(o));

/* ══ Teil 1: die Funktionen ═══════════════════════════════════════════════ */

test('[Trennzeichen·Kanon] Leerraum, Satzzeichen und Schreibung fallen auf die Kanonform; sonst null', () => {
  const { V } = ladeKern();
  const k = V.pwWoerterKanon;
  assert.equal(typeof k, 'function');
  assert.equal(k(WIE_ANGEZEIGT), KANON);
  assert.equal(k('Tinte Wolke Hafen Apfel Geige Birke'), KANON);
  assert.equal(k(' tinte\nwolke\thafen  apfel, geige; birke '), KANON);
  assert.equal(k('TINTE-wolke_hafen.apfel/geige birke'), KANON);
  assert.equal(k(KANON), KANON);
  assert.equal(k('tinte wolke hafen apfel geige'), null, 'fünf Wörter');
  assert.equal(k('tinte wolke hafen apfel geige birke kanne'), null, 'sieben Wörter');
  assert.equal(k('tinte wolke hafen apfel geige birke2'), null, 'Ziffer');
  assert.equal(k('tinte wolke hafen äpfel geige birke'), null, 'Umlaut: keine Listenwortform');
  assert.equal(k(''), null);
  assert.equal(k(null), null);
});

test('[Trennzeichen·Probe] die Wörter, wie angezeigt, sind gleich; ein falsches Wort bleibt benannt; ein eigenes Passwort zeichengenau', () => {
  const { V } = ladeKern();
  const f = V.pwProbeVergleich;
  assert.deepEqual(f(KANON, WIE_ANGEZEIGT, LISTE), { art: 'gleich', wort: -1 });
  assert.deepEqual(f(KANON, 'Tinte Wolke Hafen Apfel Geige Birke', LISTE), { art: 'gleich', wort: -1 });
  assert.deepEqual(f(KANON, 'tinte wolke hofen apfel geige birke', LISTE), { art: 'wort', wort: 2 });
  assert.deepEqual(f('mein-eigenes-passwort', 'Mein-eigenes-passwort', LISTE), { art: 'ungleich', wort: -1 });
  assert.ok(!/\bart:\s*'form'/.test(KERN), 'die Art „form“ gibt es nicht mehr');
});

test('[Trennzeichen·Kopie] die Lese-App trägt dieselbe pwWoerterKanon wie der Kern', () => {
  const koerper = (t) => {
    const i = t.indexOf('function pwWoerterKanon(');
    assert.ok(i >= 0);
    return t.slice(i, t.indexOf('\n}\n', i) + 2);
  };
  assert.equal(koerper(LESEN), koerper(KERN));
  assert.equal(ladeLesen().V.pwWoerterKanon(WIE_ANGEZEIGT), KANON);
});

/* ══ Teil 2: die Einlässe ═════════════════════════════════════════════════ */

const inhalt = (V, marker) => Object.assign(V.leeresDepot(), { _marker: marker });

test('[Trennzeichen·Kern·depotLaden] ein Depot unter der Kanonform öffnet mit den Wörtern, wie angezeigt; ein falsches mit zwei Versuchen zu', async () => {
  const { V: A } = ladeKern();
  await A.depotAnlegen(KANON);
  A.getData()._marker = 'kanon-depot';
  const u = await A.depotSerialisieren();
  for (const eingabe of [KANON, WIE_ANGEZEIGT, 'Tinte Wolke Hafen Apfel Geige Birke']) {
    const { V } = ladeKern();
    assert.equal((await V.depotLaden(kopie(u), eingabe))._marker, 'kanon-depot', eingabe);
  }
  // Die Kanonform selbst: genau ein Versuch.
  assert.equal(await pbkdf2Zaehlen(() => ladeKern().V.depotLaden(kopie(u), KANON)), 1);
  // Ein Versuch mit falschem Passwort kostet mehrere Ableitungen (Anker und Fach-Türen). Gezählt wird darum im Verhältnis:
  // ohne andere Kanonform ein Versuch, mit falschen Wörtern genau zwei (die Eingabe und die Kanonform).
  const einVersuch = await pbkdf2Zaehlen(() => assert.rejects(() => ladeKern().V.depotLaden(kopie(u), 'falsch-ascii-2026')));
  assert.ok(einVersuch >= 1);
  const n = await pbkdf2Zaehlen(() => assert.rejects(() => ladeKern().V.depotLaden(kopie(u), 'tinte wolke hafen apfel geige kanne')));
  assert.equal(n, 2 * einVersuch, 'falsche Wörter: genau ein weiterer Versuch');
  const kanonFalsch = await pbkdf2Zaehlen(() => assert.rejects(() => ladeKern().V.depotLaden(kopie(u), 'tinte-wolke-hafen-apfel-geige-kanne')));
  assert.equal(kanonFalsch, einVersuch, 'schon in Kanonform: kein weiterer Versuch');
});

test('[Trennzeichen·Kern·Bestand] ein eigenes Passwort aus sechs Wörtern mit Leerzeichen öffnet nur mit sich selbst', async () => {
  const eigen = 'mein eigenes passwort mit sechs worten';
  const { V: A } = ladeKern();
  await A.depotAnlegen(eigen);
  A.getData()._marker = 'eigen-depot';
  const u = await A.depotSerialisieren();
  assert.equal((await ladeKern().V.depotLaden(kopie(u), eigen))._marker, 'eigen-depot');
  await assert.rejects(() => ladeKern().V.depotLaden(kopie(u), 'mein-eigenes-passwort-mit-sechs-worten'));
});

test('[Trennzeichen·Kern·Sub] subDepotEntsiegeln öffnet ein Sub unter der Kanonform mit den Wörtern, wie angezeigt', async () => {
  const { V: A } = ladeKern();
  await A.depotAnlegen('anker-passwort-trennzeichen');
  const sub = A.depotDateiAusUmschlag(await A.subDepotVersiegeln(Object.assign(inhalt(A, 'kanon-sub'), { verwaltungsTyp: 'verwaltet' }), KANON));
  const r = await A.subDepotEntsiegeln(kopie(sub), WIE_ANGEZEIGT);
  assert.equal(r.inhalt._marker, 'kanon-sub');
  await assert.rejects(() => A.subDepotEntsiegeln(kopie(sub), 'tinte wolke hafen apfel geige kanne'));
});

test('[Trennzeichen·Kern·Probe-Roundtrip] das alte Passwort, wie angezeigt, besteht und liefert die Kanonform', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(KANON);
  assert.equal(await V._passwortProbeMitKanon(WIE_ANGEZEIGT), KANON);
  assert.equal(await V._passwortProbeMitKanon(KANON), KANON);
  await assert.rejects(() => V._passwortProbeMitKanon('tinte wolke hafen apfel geige kanne'));
});

test('[Trennzeichen·Lese-App] ein Depot unter der Kanonform öffnet in der Lese-App mit den Wörtern, wie angezeigt', async () => {
  const { V: A } = ladeKern();
  await A.depotAnlegen(KANON);
  A.getData()._marker = 'kanon-lesen';
  const u = await A.depotSerialisieren();
  assert.equal((await ladeLesen().V.leseDepotUmschlag(kopie(u), WIE_ANGEZEIGT))._marker, 'kanon-lesen');
  await assert.rejects(() => ladeLesen().V.leseDepotUmschlag(kopie(u), 'tinte wolke hafen apfel geige kanne'));
});

/* ══ Teil 3: der Wächter über die Ableitungs-Senken ═══════════════════════ */

// deriveMasterBits dazu (Draufblick Review 11.11.2026): whcHuelleWickeln leitet daran vorbei ab.
const SENKE = /(VdCrypto\.setupSession|(?<![\w.$])depotMasterHkdfKey|(?<![\w.$])deriveMasterBits)\(/g;

/* Jede Funktion, die eine Senke ruft, mit ihrer Einordnung. Näherung: die umschließende Funktion ist die letzte Deklaration
   `function NAME(` davor (Pfeilfunktionen wie entschluessleMit liegen darin). Kommentarzeilen und die Deklaration der Senke
   selbst zählen nicht. */
function senkenAufrufer(text) {
  const zeilen = text.split('\n');
  const aus = new Map();
  let m;
  SENKE.lastIndex = 0;
  while ((m = SENKE.exec(text))) {
    const vor = text.slice(0, m.index);
    const zeile = zeilen[vor.split('\n').length - 1];
    if (/^\s*(\/\/|\*|\/\*)/.test(zeile) || /function\s+(depotMasterHkdfKey|deriveMasterBits)\s*\(/.test(zeile) || /->\s*Promise/.test(zeile)) continue;
    const d = [...vor.matchAll(/function\s+([\w$]+)\s*\(/g)].pop();
    aus.set(d ? d[1] : '?', true);
  }
  return [...aus.keys()].sort();
}
function funktionsKoerper(text, name) {
  const i = text.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' fehlt');
  const j = text.indexOf('\n}\n', i);
  return text.slice(i, j + 2);
}

/* Einlass: liest ein vorhandenes Depot-Passwort, muss den Kanon-Rückfall tragen. */
const EINLASS = Object.freeze({
  'vivodepot.html': { depotLaden: /_pwKanonRueckfall\(/, subDepotEntsiegeln: /_pwKanonRueckfall\(/, whcHuelleWickeln: /_passwortProbeMitKanon\(/ },
  'vivodepot-lesen.html': { leseDepotUmschlag: /_mitNfcDannNfd\(/ },
});
/* Setzt ein NEUES Passwort (Anlegen, Wechsel, Wiederherstellen) oder bekommt es vom Einlass: kein Rückfall. */
const KEIN_EINLASS = Object.freeze({
  'vivodepot.html': {
    depotAnlegen: 'Neuanlage: das Passwort wird gesetzt, nicht gelesen.',
    empfaengerDateiErzeugen: 'Neuanlage einer Empfängerdatei mit einem neuen Passwort.',
    depotMitCodeLaden: 'Wiederherstellen mit dem Code: das neue Passwort wird gesetzt.',
    subDepotVersiegeln: 'Neuanlage oder Neuversiegeln eines Subs mit dem gesetzten Passwort.',
    _passwortWechselKern: 'Das neue Passwort beim Wechsel.',
    _passwortSessionZurueckdrehen: 'Bekommt die Form, die _passwortProbeMitKanon geliefert hat.',
    _passwortProbeRoundtrip: 'Wird nur über _passwortProbeMitKanon gerufen (eigene Prüfung unten).',
    _fachTuerSchluessel: 'Bekommt das Passwort vom Einlass durchgereicht (depotLaden, subDepotEntsiegeln: Versuch mit der Kanonform).',
    deriveKey: 'Baustein im Krypto-Block; Passwort kommt von einem eingeordneten Aufrufer.',
    setupMasterSession: 'Ist VdCrypto.setupSession (Krypto-Block).',
    depotMasterHkdfKey: 'Selbst Senke; ihre Aufrufer sind eingeordnet.',
    _whcCodeBits: 'Wiederherstellungs-Code, kein Passwort.',
  },
  'vivodepot-lesen.html': {
    _fachTuerSchluessel: 'Bekommt das Passwort von leseDepotUmschlag durchgereicht.',
    deriveKey: 'Baustein im Krypto-Block.',
    setupMasterSession: 'Ist VdCrypto.setupSession (Krypto-Block).',
    depotMasterHkdfKey: 'Selbst Senke; ihre Aufrufer sind eingeordnet.',
  },
});

/* Aufrufer von whcHuelleWickeln (Draufblick Review 11.11.2026): mit geprueft:true nur ein eben gesetztes Passwort. */
const WHC_AUFRUFER = Object.freeze({
  depotMitCodeLaden: 'geprueft:true mit dem eben gesetzten neuen Passwort (pwNfc aus pwNeu).',
  passwortWechselDurchfuehren: 'geprueft:true mit neuNfc, dem eben gesetzten neuen Passwort.',
  _whcKontrolleEinrichten: 'reicht geprueft durch: true nur aus anlegenCodeSchritt (eben gesetzt, eigene Prüfung), mit getipptem Passwort false.',
});

function waechterFunde(dateien) {
  const funde = [];
  for (const [datei, text] of Object.entries(dateien)) {
    const einlass = EINLASS[datei] || {};
    const kein = KEIN_EINLASS[datei] || {};
    for (const f of senkenAufrufer(text)) {
      if (einlass[f]) {
        if (!einlass[f].test(funktionsKoerper(text, f))) funde.push(datei + '|' + f + ': Einlass ohne Kanon-Rückfall');
      } else if (!kein[f]) {
        funde.push(datei + '|' + f + ': ruft eine Ableitung und ist nicht eingeordnet');
      }
    }
    for (const f of Object.keys(einlass)) if (!senkenAufrufer(text).includes(f)) funde.push(datei + '|' + f + ': Einlass nicht mehr gefunden (Wächter blind?)');
  }
  // Die Lese-App: der Rückfall liegt in _mitNfcDannNfd.
  if (dateien['vivodepot-lesen.html'] && !/pwWoerterKanon\(/.test(funktionsKoerper(dateien['vivodepot-lesen.html'], '_mitNfcDannNfd'))) {
    funde.push('vivodepot-lesen.html|_mitNfcDannNfd: ohne Kanon-Rückfall');
  }
  // whcHuelleWickeln überspringt mit `geprueft` den Rückfall: jeder Aufrufer ist eingeordnet, ein neuer fällt.
  if (dateien['vivodepot.html']) {
    const t = dateien['vivodepot.html'];
    for (const m of t.matchAll(/(?<!function\s)whcHuelleWickeln\(/g)) {
      const d = [...t.slice(0, m.index).matchAll(/function\s+([\w$]+)\s*\(/g)].pop();
      const wer = d ? d[1] : '?';
      if (!WHC_AUFRUFER[wer]) funde.push('vivodepot.html|' + wer + ': ruft whcHuelleWickeln und ist nicht eingeordnet');
    }
    for (const m of t.matchAll(/_whcKontrolleEinrichten\([^)]*?,\s*true\s*,/g)) {
      const d = [...t.slice(0, m.index).matchAll(/function\s+([\w$]+)\s*\(/g)].pop();
      if (!d || d[1] !== 'anlegenCodeSchritt') funde.push('vivodepot.html|' + (d ? d[1] : '?') + ': _whcKontrolleEinrichten mit geprueft=true außerhalb des Anlege-Schritts');
    }
  }
  // _passwortProbeRoundtrip nur über die Hülle mit dem Rückfall.
  const k = dateien['vivodepot.html'];
  if (k) {
    const rufe = [...k.matchAll(/(?<!function\s)_passwortProbeRoundtrip\(/g)].map((m) => {
      const d = [...k.slice(0, m.index).matchAll(/function\s+([\w$]+)\s*\(/g)].pop();
      return d ? d[1] : '?';
    });
    for (const r of rufe) if (r !== '_passwortProbeMitKanon') funde.push('vivodepot.html|' + r + ': ruft _passwortProbeRoundtrip ohne den Rückfall');
  }
  return funde;
}

test('[Trennzeichen·Wächter] jede Funktion, die ein Depot-Passwort ableitet, ist eingeordnet; jeder Einlass trägt den Kanon-Rückfall', () => {
  assert.deepEqual(waechterFunde({ 'vivodepot.html': KERN, 'vivodepot-lesen.html': LESEN }), []);
});

test('[Trennzeichen·Wächter·Rot-Beweis] ein Einlass ohne Rückfall, ein neuer Aufrufer und ein Roundtrip ohne Hülle fallen', () => {
  const ohneRueckfall = KERN.replace('obj = await _pwKanonRueckfall(nfc, e1, entschluessleMit);', 'throw e1;');
  assert.notEqual(ohneRueckfall, KERN);
  assert.ok(waechterFunde({ 'vivodepot.html': ohneRueckfall }).some((f) => /depotLaden: Einlass ohne/.test(f)));

  const neuerAufrufer = KERN + '\nasync function neuerEinlassProbe(pw, s) {\n  await VdCrypto.setupSession(pw, s);\n}\n';
  assert.ok(waechterFunde({ 'vivodepot.html': neuerAufrufer }).some((f) => /neuerEinlassProbe: ruft eine Ableitung/.test(f)));

  const ohneHuelle = KERN.replace('const altNfc = await _passwortProbeMitKanon(normalizePassword(pwAlt));',
    'const altNfc = normalizePassword(pwAlt); await _passwortProbeRoundtrip(altNfc);');
  assert.notEqual(ohneHuelle, KERN);
  assert.ok(waechterFunde({ 'vivodepot.html': ohneHuelle }).some((f) => /passwortWechselDurchfuehren: ruft _passwortProbeRoundtrip ohne/.test(f)));

  const neuerWhc = KERN + '\nasync function neuerWhcProbe(pw, st) {\n  await whcHuelleWickeln(pw, st, { geprueft: true });\n}\n';
  assert.ok(waechterFunde({ 'vivodepot.html': neuerWhc }).some((f) => /neuerWhcProbe: ruft whcHuelleWickeln/.test(f)));

  const leseOhne = LESEN.replace('const kanon = pwWoerterKanon(nfc);', 'const kanon = null;');
  assert.notEqual(leseOhne, LESEN);
  assert.ok(waechterFunde({ 'vivodepot-lesen.html': leseOhne }).some((f) => /_mitNfcDannNfd: ohne Kanon-Rückfall/.test(f)));
});

/* Ein Kern ohne den Rückfall in depotLaden (wie vor dem Fix), geladen wie in tests/passwort-nfc-klasse.test.js. */
function kernOhneRueckfall() {
  const von = 'obj = await _pwKanonRueckfall(nfc, e1, entschluessleMit);';
  assert.equal(KERN.split(von).length, 2, 'Vorbedingung Rot-Beweis: die Zeile steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-trennzeichen-'));
  try {
    const datei = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(datei, KERN.split(von).join('throw e1;'));
    return ladeKern({ htmlPfad: datei, backen: true }).V;
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}

test('[Trennzeichen·Kern·Rot-Beweis] ohne den Rückfall bleibt ein Depot unter der Kanonform mit den Wörtern, wie angezeigt, zu', async () => {
  const { V: A } = ladeKern();
  await A.depotAnlegen(KANON);
  A.getData()._marker = 'rot-beweis';
  const u = await A.depotSerialisieren();
  const alt = kernOhneRueckfall();
  await assert.rejects(() => alt.depotLaden(kopie(u), WIE_ANGEZEIGT), 'ohne Rückfall: zu');
  assert.equal((await alt.depotLaden(kopie(u), KANON))._marker, 'rot-beweis', 'die Kanonform öffnet auch ohne Rückfall');
  // Die Grenzen des Rückfalls selbst.
  const V = ladeKern().V;
  await assert.rejects(() => V._pwKanonRueckfall('tinte wolke', new Error('erst'), async () => 'nie'), /erst/);
  await assert.rejects(() => V._pwKanonRueckfall(KANON, new Error('gleich'), async () => 'nie'), /gleich/, 'Kanonform gleich der Eingabe: kein Versuch');
  const abgelaufen = Object.assign(new Error('fach'), { code: 'fach-abgelaufen' });
  await assert.rejects(() => V._pwKanonRueckfall(WIE_ANGEZEIGT, abgelaufen, async () => 'nie'), /fach/, 'abgelaufene Fach-Tür: kein Versuch');
  assert.equal(await V._pwKanonRueckfall(WIE_ANGEZEIGT, new Error('x'), async (k) => k), KANON);
});
