'use strict';
/* ═══════════════════════════════════════════════════════════
   Was die Hülle einer Depotdatei im Klartext trägt, und was der Dialog darüber sagt (01.10.2026)
   ───────────────────────────────────────────────────────────
   Befund ORT-HINWEIS-UNTERTREIBT (interne Prüfung, Teil 9 §6a: die Datei liegt bei einem fremden Anbieter):
   `angehoerigenOrt` steht absichtlich unverschlüsselt in der Hülle (U2-ADR-062, Nachtrag §2, Beschluss A —
   „Bewusst getragene Offenlegung"). Das bleibt so. Der Dialog sagte aber nur, wer die Datei ÖFFNET, sehe den
   Hinweis. Lesen kann ihn jeder, der die Datei HAT — ohne Passwort und ohne die App, etwa ein Cloud-Anbieter. Und er
   riet nicht, die Angabe unpräzise zu halten.

   Die Klasse dahinter: ein Feld im Klartext der Hülle, das niemand bewusst dort hat. Die Positivliste
   UMSCHLAG_FELDER_BEKANNT nennt jedes Feld der Hülle; diese Probe hält sie fest (ein neues Feld ist rot, bis es hier mit
   Grund steht) und verlangt, dass die geschriebene Hülle kein Feld außerhalb trägt und als Klartext-Angabe der
   Bürgerin nur den Ort-Hinweis.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const PW = 'umschlag-klartext-pw-1';
const FACH_PW = 'fach-klartext-pw-12';
const ORT = 'Bei den Unterlagen, die Anja kennt';

/* Jedes Feld der Hülle, mit Grund. Ein neues Feld in UMSCHLAG_FELDER_BEKANNT ist hier rot, bis es mit Grund steht. */
const HUELLE_ERWARTET = {
  kryptoVersion: 'Verfahren — nötig zum Lesen',
  depotUUID: 'Kennung des Depots — Teil der AAD (Befund HUELLEN-METADATEN: verknüpft Kopien)',
  pbkdf2: 'Salz und Iterationszahl — nötig zum Entschlüsseln, kein Geheimnis',
  depotSalt: 'nötig zum Entschlüsseln, kein Geheimnis',
  iv: 'Initialisierungsvektor des Ankers',
  ct: 'Chiffrat',
  einheiten: 'verschlüsselte Einheiten (Befund HUELLEN-METADATEN: Kennungen und Längen sichtbar)',
  umschlagTabelle: 'je Fach die verschlüsselte Tür',
  angehoerigenOrt: 'Klartext-Hinweis der Bürgerin, wo das Fach-Passwort liegt — bewusst passwortlos lesbar (U2-ADR-062, Beschluss A)',
  wiederherstellung: 'verschlüsselte Wiederherstellungs-Hülle, nur wenn eingerichtet',
};
// Felder, deren INHALT eine Angabe der Bürgerin im Klartext ist (alles Übrige ist Verfahren oder Chiffrat).
const KLARTEXT_DER_BUERGERIN = ['angehoerigenOrt'];

async function depotMitFachUndOrt(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, ORT);
  return V.depotSerialisieren();
}

test('[Hülle] die Positivliste ist genau die bekannte — ein neues Feld braucht hier einen Grund', () => {
  const { V } = ladeKern();
  assert.deepEqual([...V.UMSCHLAG_FELDER_BEKANNT].sort(), Object.keys(HUELLE_ERWARTET).sort());
});

test('[Hülle] die geschriebene Hülle trägt nur Felder der Positivliste; Klartext der Bürgerin nur der Ort-Hinweis', async () => {
  const { V } = ladeKern();
  const umschlag = await depotMitFachUndOrt(V);
  const felder = Object.keys(umschlag);
  assert.deepEqual(felder.filter((k) => !V.UMSCHLAG_FELDER_BEKANNT.includes(k)), [], 'Feld außerhalb der Positivliste');
  assert.equal(umschlag.angehoerigenOrt, ORT, 'Vorbedingung: der Ort-Hinweis steht (bewusst) im Klartext');
  const roh = JSON.stringify(umschlag);
  assert.ok(!roh.includes('Maria'), 'kein Name im Klartext');
  for (const k of felder.filter((f) => !KLARTEXT_DER_BUERGERIN.includes(f))) {
    assert.ok(!JSON.stringify(umschlag[k]).includes(ORT.slice(0, 12)), k + ' trägt den Ort-Hinweis');
  }
});

test('[Hülle·Rot-Beweis] ein zusätzliches Klartext-Feld wird gesehen', async () => {
  const { V } = ladeKern();
  const umschlag = Object.assign({}, await depotMitFachUndOrt(V), { notiz: 'Maria' });
  assert.deepEqual(Object.keys(umschlag).filter((k) => !V.UMSCHLAG_FELDER_BEKANNT.includes(k)), ['notiz']);
});

/* Der Wortlaut des Dialogs (DE und EN): jeder MIT der Datei liest den Hinweis OHNE Passwort; Rat zu einer unpräzisen
   Angabe; nie das Passwort selbst. Gelesen aus den Sprachmodulen, die die Anwendung trägt. */
function satz(modul) {
  const j = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', modul), 'utf8'));
  const texte = j.texte || (j.modul && j.modul.texte) || j;
  const suche = (o) => {
    if (!o || typeof o !== 'object') return null;
    if (typeof o['strings:ortHinweisSichtbarkeitKreis.text'] === 'string') return o['strings:ortHinweisSichtbarkeitKreis.text'];
    for (const v of Object.values(o)) { const r = suche(v); if (r) return r; }
    return null;
  };
  return suche(texte);
}

test('[Ort-Hinweis·Wortlaut·DE] jeder mit der Datei liest ihn ohne Passwort; Rat zu einer unpräzisen Angabe', () => {
  const s = satz('textsatz-de-modul.json');
  assert.ok(s, 'Vorbedingung: der Satz steht im deutschen Modul');
  assert.match(s, /jeder lesen, der die Datei hat/);
  assert.match(s, /ohne Passwort/);
  assert.match(s, /unpräzise/);
  assert.match(s, /nie das Passwort selbst/);
});

test('[Ort-Hinweis·Wortlaut·EN] anyone with the file reads it without the password; advice to keep it vague', () => {
  const s = satz('textsatz-en-modul.json');
  assert.ok(s, 'Vorbedingung: der Satz steht im englischen Modul');
  assert.match(s, /Anyone who has the file can read this note/);
  assert.match(s, /without the password/);
  assert.match(s, /vague/);
  assert.match(s, /never state the password itself/);
});

test('[Ort-Hinweis] der Satz steht im Dialog, an der Stelle, an der der Hinweis geschrieben wird', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const i = kern.indexOf('id="kreis-fach-ort"');
  assert.ok(i > 0);
  assert.ok(kern.slice(i, i + 600).includes('STRINGS.ortHinweisSichtbarkeitKreis'));
});
