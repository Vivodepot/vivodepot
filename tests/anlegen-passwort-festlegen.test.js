'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Anlegen: das eigene Passwort ist der Standard, die sechs Wörter sind das Angebot (Entscheidung 24.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Schritt 1 heißt nach der Sache („Passwort festlegen“) und zeigt ein gewöhnliches Feld mit Wiederholung, die Mindestlänge am
   Feld. Darunter steht „Oder lassen Sie sich ein Passwort vorschlagen“; erst wer es nimmt, sieht die sechs Wörter mit Probe. „Lieber ein
   eigenes Passwort“ führt zurück. Unverändert: mindestens zwölf Zeichen (pwGrundFehler), Probe und Kanon der Wörter.
   Rot-Beweis: eine Kernkopie ohne `ohneVorbelegung` legt die Wörter wieder vorab ins Feld.
   Nachtrag 26.11.2026 (U2-ADR-027, U2-ADR-463): kein Ratschlag zur Stärke und kein Platzhalter am Feld; es bleiben „mindestens
   12 Zeichen“ und beim Tippen die Stufe ([Festlegen·Kein Tipp·Texte], [Festlegen·Kein Tipp]).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const { istOeffentlich } = require('./helfer/nur-privat.js');   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const SCHALTER = "schlicht: true, ohneVorbelegung: true, probeId: 'id-pw2',";

// Der Kern-Stub kennt nur IDs, die fest im HTML stehen; die Bausteine des Vorschlags tragen zusammengesetzte IDs. Die Probe hängt
// für sie Elemente mit Ereignissen ein, damit die Verdrahtung des Dialogs wirklich läuft (wie tests/passwort-zwei-schritte.test.js).
function element(hidden) {
  const hoerer = {};
  return {
    value: '', hidden: !!hidden, innerHTML: '', textContent: '', type: 'password',
    appendChild(k) { return k; },
    querySelectorAll() { return []; },
    addEventListener(typ, f) { (hoerer[typ] = hoerer[typ] || []).push(f); },
    dispatchEvent(e) { for (const f of hoerer[e.type] || []) f(e); },
  };
}
function schritt1(opts) {
  const { V, document } = ladeKern(opts);
  const els = {};
  for (const id of ['id-pw', 'id-pw2', 'id-pw2-label', 'id-pw-staerke', 'id-pw-vorschlag-knopf', 'id-pw-vorschlag-anzeige',
    'id-pw-vorschlag-woerter', 'id-pw-vorschlag-anderer', 'id-pw-vorschlag-vorlesen', 'id-pw-eigen', 'id-pw-feld',
    'id-pw-woerter-titel', 'id-pw-eigen-weg']) els[id] = element(id === 'id-pw-vorschlag-anzeige');
  const stub = document.getElementById;
  document.getElementById = (id) => els[id] || stub(id);
  V.flowDepotAnlegen();
  const html = document.getElementById('modal-inhalt').innerHTML;
  return { V, els, html };
}

test('[Festlegen·Standard] Schritt 1 zeigt das eigene Passwort: leeres Feld, Wiederholung, Mindestlänge am Feld, das Angebot darunter', () => {
  const { V, els, html } = schritt1();
  assert.equal(els['id-pw'].value, '', 'kein Vorschlag im Feld');
  assert.equal(els['id-pw-feld'].hidden, false, 'das Passwort-Feld steht da');
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, true, 'keine Wörter auf dem Schirm');
  assert.equal(els['id-pw-vorschlag-knopf'].hidden, false, 'das Angebot steht da');
  assert.equal(els['id-pw-eigen-weg'].hidden, true, 'kein Weg zurück, solange nichts vorgeschlagen ist');
  assert.equal(els['id-pw-woerter-titel'].textContent, V.STRINGS.anlegenPwFestlegenTitel);
  assert.equal(els['id-pw2-label'].textContent, V.STRINGS.anlegenPwProbeLabelEigen);
  assert.ok(html.includes('id="id-pw-woerter-titel">' + V.escapeHTML(V.STRINGS.anlegenPwFestlegenTitel) + '<'), 'die Überschrift nennt den Schritt');
  assert.match(html, /id="id-pw" type="password" autocomplete="new-password" aria-describedby="id-pw-min"/);
  assert.ok(html.includes('id="id-pw-min">' + V.escapeHTML(V.STRINGS.pwMinHinweis) + '<'), 'die Mindestlänge steht am Feld');
  // Das Angebot steht im Körper unter dem eigenen Passwort, nicht in der Fußleiste.
  const iKnopf = html.indexOf('id="id-pw-vorschlag-knopf"');
  assert.ok(iKnopf > html.indexOf('id="id-pw2"'), 'das Angebot folgt auf die Wiederholung');
  assert.ok(html.slice(iKnopf).startsWith('id="id-pw-vorschlag-knopf">' + V.escapeHTML(V.STRINGS.anlegenPwVorschlagAngebot) + '<'));
  assert.ok(iKnopf < html.indexOf('id="m-ok"'), 'nicht in der Fußleiste');
});

test('[Festlegen·Angebot] das Angebot legt sechs Wörter vor; „Lieber ein eigenes Passwort“ führt zum leeren Feld zurück', () => {
  const { V, els } = schritt1();
  els['id-pw-vorschlag-knopf'].dispatchEvent({ type: 'click' });
  assert.equal(els['id-pw'].value.split('-').length, 6, 'sechs Wörter im Feld');
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, false, 'die Wörter stehen da');
  assert.equal(els['id-pw-feld'].hidden, true, 'das Feld trägt sie verdeckt');
  assert.equal(els['id-pw-vorschlag-knopf'].hidden, true, 'das Angebot ist genommen');
  assert.equal(els['id-pw-eigen-weg'].hidden, false, 'der Weg zurück steht da');
  assert.equal(els['id-pw-woerter-titel'].textContent, V.STRINGS.anlegenWoerterTitel);
  assert.equal(els['id-pw2-label'].textContent, V.STRINGS.anlegenPwProbeLabel);
  els['id-pw2'].value = 'angefangen';
  els['id-pw-eigen-weg'].onclick();
  assert.equal(els['id-pw'].value, '', 'das Feld ist wieder leer');
  assert.equal(els['id-pw2'].value, '', 'die Wiederholung ist wieder leer');
  assert.equal(els['id-pw-feld'].hidden, false);
  assert.equal(els['id-pw-vorschlag-knopf'].hidden, false, 'das Angebot steht wieder da');
  assert.equal(els['id-pw-woerter-titel'].textContent, V.STRINGS.anlegenPwFestlegenTitel);
});

test('[Festlegen·Regeln] die Schranke bleibt: ein eigenes Passwort unter zwölf Zeichen fällt, eines mit zwölf besteht', () => {
  const { V } = ladeKern();
  assert.equal(V.pwGrundFehler('elf-zeichen'), 'pwMinFehler');
  assert.equal(V.pwGrundFehler('zwoelf-zeich'), null);
});

test('[Festlegen·Texte] Überschrift und Angebot stehen in allen vier Textsätzen; niemand muss ein Passwort mitbringen', () => {
  for (const [datei, titel, angebot] of [
    ['textsatz-de-modul.json', 'Passwort festlegen', 'Oder lassen Sie sich ein Passwort vorschlagen'],
    ['textsatz-de-pro-modul.json', 'Passwort festlegen', 'Oder lassen Sie sich ein Passwort vorschlagen'],
    ['textsatz-en-modul.json', 'Set a password', 'Or let us suggest a password'],
    ['textsatz-en-pro-modul.json', 'Set a password', 'Or let us suggest a password'],
  ].filter(([datei]) => !(istOeffentlich() && datei.includes('-pro-')))) {
    // Öffentlich (Kennzeichen „läuft nur im privaten Repo“, tests/helfer/nur-privat.js) fehlen die Pro-Textsätze; privat bleiben alle vier Pflicht.
    const t = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8')).texte;
    assert.equal(t['strings:anlegenPwFestlegenTitel.text'], titel, datei);
    assert.equal(t['strings:anlegenPwVorschlagAngebot.text'], angebot, datei);
  }
});

test('[Festlegen·Rot-Beweis] ohne `ohneVorbelegung` stünden die Wörter wieder vorab im Feld', () => {
  assert.ok(KERN.includes(SCHALTER), 'Vorbedingung: der Schalter steht im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'passwort-festlegen-rot-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, KERN.replace(SCHALTER, "schlicht: true, probeId: 'id-pw2',"));
  try {
    const { els } = schritt1({ htmlPfad: kopie, backen: true });
    assert.equal(els['id-pw'].value.split('-').length, 6, 'die alte Fassung legt die Wörter vor');
    assert.notEqual(els['id-pw'].value, '', 'darum fiele [Festlegen·Standard] durch');
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

// Kein Ratschlag zur Stärke (Nachtrag 26.11.2026, U2-ADR-027): an allen Feldern bleibt die Stufe, kein Tipp, kein Platzhalter.
test('[Festlegen·Kein Tipp·Texte] kein Textsatz trägt einen Ratschlag zur Stärke oder ein Beispiel als Platzhalter', () => {
  // Die Pro-Textsätze bleiben im öffentlichen Zuschnitt zurück; dort werden nur die zwei Privat-Sätze gelesen, privat alle vier.
  const saetze = ['textsatz-de-modul.json', 'textsatz-en-modul.json'];
  if (!istOeffentlich()) saetze.push('textsatz-de-pro-modul.json', 'textsatz-en-pro-modul.json');
  for (const datei of saetze) {
    const t = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8')).texte;
    for (const k of ['pwStaerkeTipp', 'pwStaerkeTippVorschlag', 'anlegenPwBeispiel', 'pwBeispielFehler']) {
      assert.equal(t['strings:' + k + '.text'], undefined, datei + ': ' + k);
    }
    assert.ok(t['strings:pwMinHinweis.text'], datei + ': die Mindestlänge bleibt');
  }
  assert.ok(!KERN.includes('STRINGS.pwStaerkeTipp'), 'der Kern liest keinen Ratschlag mehr');
  assert.ok(!KERN.includes('_beispielPlatzhalter(STRINGS.anlegenPwBeispiel)'), 'kein Platzhalter am Passwort-Feld');
});

test('[Festlegen·Kein Tipp] beim Tippen steht nur „Passwort-Stärke: <Stufe>“, ohne Zusatz', () => {
  for (const pw of ['gartenhausweg', 'Gartenhaus-Weg-2026']) {
    const { V, document } = ladeKern();
    const s = V.passwortStaerke(pw);
    assert.ok(!s.bekannt, 'Vorbedingung: kein verbreitetes Passwort');
    document.getElementById('id-pw').value = pw;
    V.pwStaerkeAnzeigeVerdrahten('id-pw', 'id-pw-staerke');
    const wort = s.stufe === 'stark' ? V.STRINGS.pwStaerkeStark : s.stufe === 'mittel' ? V.STRINGS.pwStaerkeMittel : V.STRINGS.pwStaerkeSchwach;
    const text = document.getElementById('id-pw-staerke').innerHTML.replace(/<[^>]*>/g, '');
    assert.equal(text, V.STRINGS.pwStaerkeLabel + ' ' + wort, pw + ' → ' + text);
  }
});
