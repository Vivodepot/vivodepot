'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Eigenes Passwort: mindestens 12 Zeichen beim Setzen und Ändern (08.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Entscheidung der Geschäftsführung vom 08.10.2026: Der Vorschlag mit sechs Wörtern ist
   vorbelegt; wer ein eigenes Passwort wählt, braucht mindestens 12 Zeichen statt 8.
   Die Regel gilt NUR beim Setzen und Ändern (pwGrundFehler). Ein Depot, dessen Passwort aus
   einer früheren Fassung kürzer ist, öffnet weiter — das Öffnen prüft keine Länge.

   Drei Teile:
   (1) die Schranke selbst: 11 Zeichen abgewiesen, 12 angenommen;
   (2) die Klasse: jede Funktion, die den Wert eines Felds für ein NEUES eigenes Passwort liest,
       ruft pwGrundFehler — kein Setz-Weg an der Schranke vorbei; die fünf bekannten Setz-Wege
       stehen namentlich fest, ein neuer fällt als Abweichung auf;
   (3) das Öffnen: ein Depot mit 8-Zeichen-Passwort lädt in einer frischen Kern-Instanz.
   Empfänger-Passwörter (Datei, QR, Fach) haben ihre eigene Untergrenze, EMPFAENGER_PW_MIN.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Felder, in die das EIGENE neue Passwort getippt wird (nicht die Bestätigungsfelder, nicht das alte Passwort).
const FELDER_NEUES_EIGENES_PW = ['id-pw', 'pw-neu', 'pw-wechsel-neu', 'whc-pw-neu', 'ssb-neu'];
const SETZ_WEGE = [
  '_depotIdentitaetUndPasswortAbfragen', '_subSelbstPasswortAendernZeigen', 'codeOverlayOeffnen',
  'flowPasswortSetzen', 'flowPasswortWechseln',
];

/* Liefert je Top-Level-Funktion, ob sie den WERT eines der Felder liest (document.getElementById(…) oder der
   lokale Leser wert(…)) und ob sie pwGrundFehler ruft. Anzeige-Helfer (Vorschlag, Stärke, Fehlerrahmen) lesen
   keinen Wert und zählen darum nicht. */
function setzWegeMessen(quelltext) {
  const zeilen = quelltext.split('\n');
  const leser = new RegExp('(?:document\\.getElementById|\\bwert)\\(\\s*[\'"](' + FELDER_NEUES_EIGENES_PW.join('|') + ')[\'"]');
  const funktionen = [];
  let aktuell = null;
  for (const z of zeilen) {
    const m = z.match(/^(?:async )?function ([\w$]+)/);
    if (m) { aktuell = { name: m[1], liest: false, schranke: false }; funktionen.push(aktuell); }
    if (!aktuell) continue;
    if (leser.test(z)) aktuell.liest = true;
    if (z.includes('pwGrundFehler(') && !/^(?:async )?function pwGrundFehler\b/.test(z)) aktuell.schranke = true;
  }
  const lesende = funktionen.filter((f) => f.liest);
  return { lesende: lesende.map((f) => f.name).sort(), ohneSchranke: lesende.filter((f) => !f.schranke).map((f) => f.name) };
}

/* Diskriminante fürs Öffnen: öffnet dieses Passwort den Umschlag in diesem Kern? Der Prüfstand (U2-ADR-099) tauscht
   sie gegen eine, die immer verletzt, und erwartet die beiden Öffnen-Proben rot (PROBEN unten). */
async function oeffnetMitPasswort(V, umschlag, passwort) {
  try { await V.depotLaden(umschlag, passwort); return true; } catch (_) { return false; }
}

test('[PW-12] die Schranke: 11 Zeichen abgewiesen, 12 angenommen, leer eigene Meldung', () => {
  const { V } = ladeKern();
  assert.equal(V.pwGrundFehler('elf-zeichen'), 'pwMinFehler', '11 Zeichen → abgewiesen');
  assert.equal(V.pwGrundFehler('zwoelf-zeich'), null, '12 Zeichen → angenommen');
  assert.equal(V.pwGrundFehler(''), 'pwSetzenLeer', 'leer → eigene Meldung');
  assert.equal(V.passwortStaerke('Ab3$efgh9!k').stufe, 'schwach', '11 Zeichen mit allen Klassen → die Anzeige sagt nie mehr als schwach');
  assert.ok(/mindestens 12 Zeichen/.test(V.STRINGS.pwMinFehler), 'der Fehlertext nennt 12: ' + V.STRINGS.pwMinFehler);
  assert.ok(/12/.test(V.STRINGS.pwMinHinweis), 'der Hinweis nennt 12: ' + V.STRINGS.pwMinHinweis);
});

test('[PW-12·Klasse] jeder Weg, der ein neues eigenes Passwort liest, geht durch pwGrundFehler', () => {
  const r = setzWegeMessen(KERN);
  assert.deepEqual(r.ohneSchranke, [], 'Setz-Wege ohne pwGrundFehler: ' + r.ohneSchranke.join(', '));
  assert.deepEqual(r.lesende, [...SETZ_WEGE].sort(),
    'die Setz-Wege sind genau die bekannten fünf — ein neuer gehört bewusst in SETZ_WEGE, nachdem er die Schranke ruft');
});

test('[PW-12·Klasse·Rot-Beweis] ein Setz-Weg ohne Schranke wird gefunden', () => {
  const kopie = KERN + '\nfunction _probeSetzWegOhneSchranke() {\n  const pw = document.getElementById(\'pw-neu\').value;\n  return pw;\n}\n';
  const r = setzWegeMessen(kopie);
  assert.deepEqual(r.ohneSchranke, ['_probeSetzWegOhneSchranke']);
});

test('[PW-12·Rot-Beweis] eine auf 8 zurückgesetzte Schranke fällt auf', () => {
  const { V } = kernKopieLaden(KERN.replace('const PW_MIN_EIGEN = 12;', 'const PW_MIN_EIGEN = 8;'));
  assert.equal(V.pwGrundFehler('elf-zeichen'), null, 'mit 8 ließe die Schranke 11 Zeichen durch — die erste Probe würde rot');
});

test('[PW-12·Öffnen] ein Depot mit 8-Zeichen-Passwort aus einer früheren Fassung öffnet weiter', async () => {
  const ALT = 'acht-zch';
  assert.equal(ALT.length, 8);
  const { V: alt } = ladeKern();
  await alt.depotAnlegen(ALT);   // der Anlege-Kern ohne Dialog: so lag ein 8-Zeichen-Passwort früher in der Datei
  alt.getData().menschen.push({ id: 'p-alt', vorname: 'Alt' });
  const umschlag = await alt.depotSerialisieren();

  const { V: neu } = ladeKern();
  assert.equal(await oeffnetMitPasswort(neu, umschlag, ALT), true, 'das alte 8-Zeichen-Passwort öffnet im heutigen Kern');
  assert.ok((neu.getData().menschen || []).some((p) => p.vorname === 'Alt'), 'das alte Depot ist geöffnet, sein Inhalt da');
});

test('[PW-12·Öffnen·Klasse] kein Lade-Weg prüft die Passwortlänge', () => {
  const lade = KERN.match(/\n(?:async )?function depotLaden\b[\s\S]*?\n}\n/);
  assert.ok(lade, 'Voraussetzung: depotLaden steht im Kern');
  assert.ok(!/pwGrundFehler|PW_MIN_EIGEN|\.length\s*<\s*\d/.test(lade[0]), 'depotLaden darf keine Mindestlänge prüfen');
});

/* Das Fach-Passwort (Kreis-Fachzugang) öffnet einen weiteren Schlüssel in DERSELBEN Datei. Seit 08.10.2026 gilt
   dafür dieselbe Untergrenze; ein Fach aus einer früheren Fassung mit kürzerem Passwort öffnet weiter. */
const FACH_ALT = 'acht-zch';

/* Eine frühere Fassung nachstellen: eine Kopie des Kerns mit geänderter Untergrenze, gebacken wie das Standard-Produkt
   (ladeKern({ htmlPfad, backen: true }) — die Absicht steht im Aufruf, keine Umgebungsvariable). */
function kernKopieLaden(quelltext) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-min-kopie-'));
  try {
    const datei = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(datei, quelltext);
    return ladeKern({ htmlPfad: datei, backen: true });
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}

test('[PW-12·Fach] ein Fach-Passwort unter 12 Zeichen wird beim Einrichten abgewiesen, 12 angenommen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-passwort-fach-12');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: [] });
  const k = V.empfaengerkreiseListe()[0];
  await assert.rejects(() => V.empfaengerkreisFachEinrichten(k, 'elf-zeichen'), /mindestens 12 Zeichen/);
  await V.empfaengerkreisFachEinrichten(k, 'zwoelf-zeich');
  assert.equal(V.empfaengerkreisHatFach(V.empfaengerkreiseListe()[0]), true, '12 Zeichen → Fach eingerichtet');
});

test('[PW-12·Fach·Öffnen] ein Fach mit 8-Zeichen-Passwort aus einer früheren Fassung öffnet weiter', async () => {
  const alt = kernKopieLaden(KERN.replace('const PW_MIN_EIGEN = 12;', 'const PW_MIN_EIGEN = 8;')).V;
  await alt.depotAnlegen('anker-passwort-fach-alt');
  await alt.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await alt.empfaengerkreisFachEinrichten(alt.empfaengerkreiseListe()[0], FACH_ALT);
  const umschlag = await alt.depotSerialisieren();
  assert.equal(await oeffnetMitPasswort(ladeKern().V, umschlag, FACH_ALT), true, 'das Fach mit dem kurzen Passwort öffnet im heutigen Kern');
});

/* Prüfstand (U2-ADR-099): Deklaration per Referenz — je Klausel-Probe die Diskriminante, die sie wirklich benutzt. */
module.exports = {
  PROBEN: [
    { fuer: '[PW-12·Klasse] jeder Weg, der ein neues eigenes Passwort liest, geht durch pwGrundFehler', diskriminante: setzWegeMessen },
    { fuer: '[PW-12·Öffnen] ein Depot mit 8-Zeichen-Passwort aus einer früheren Fassung öffnet weiter', diskriminante: oeffnetMitPasswort },
    { fuer: '[PW-12·Fach·Öffnen] ein Fach mit 8-Zeichen-Passwort aus einer früheren Fassung öffnet weiter', diskriminante: oeffnetMitPasswort },
  ],
};
