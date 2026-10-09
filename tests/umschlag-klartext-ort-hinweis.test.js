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

async function depotMitFachUndOrt(V, ort = ORT) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, ort);
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

/* Befund KLARTEXT-ORTSHINWEIS-ZUSICHERUNG (MITTEL, 07.10.2026). SOVEREIGNTY.md sagte „Die geschriebene Datei trägt kein
   Klartext-Personendatum“, der U2-ADR-062-Nachtrag „kein Personendatum“. Der Ortshinweis ist aber Text der Halterin und kann eines
   tragen. Die Gegenprobe zeigt das am geschriebenen Umschlag; die Doku-Wache hält, dass keine Zusage es wieder bestreitet und dass
   SECURITY.md die Klartext-Teile nennt. */
const PERSONENDATUM_ORT = 'bei Tante Erna, Hauptstr. 5';
test('[Ort-Hinweis·Personendatum] ein Ortshinweis mit einem Personendatum steht wörtlich und ohne Passwort lesbar in der Datei', async () => {
  const { V } = ladeKern();
  const umschlag = await depotMitFachUndOrt(V, PERSONENDATUM_ORT);
  assert.ok(JSON.stringify(umschlag).includes(PERSONENDATUM_ORT), 'der Text der Halterin steht im Klartext der Hülle');
  assert.equal(V.angehoerigenOrtAusUmschlag(umschlag), PERSONENDATUM_ORT, 'und wird vor dem Passwort gelesen');
});

const DOKU_ZUSAGEN = ['SOVEREIGNTY.md', 'SECURITY.md', 'README.md'];
const BESTREITET = /kein(?:e)? (?:Klartext-)?Personendat(?:um|en)/i;
function dokuFunde(lesen) {
  const raus = [];
  for (const f of DOKU_ZUSAGEN) if (BESTREITET.test(lesen(f) || '')) raus.push(f);
  const adr = path.join(REPO, 'docs', 'adr');
  for (const f of fs.readdirSync(adr).filter((n) => n.endsWith('.md'))) {
    const t = lesen(path.join('docs', 'adr', f)) || '';
    if (/Ort-Hinweis|Ortshinweis|angehoerigenOrt/i.test(t) && BESTREITET.test(t) && !/Berichtigung 07\.10\.2026/.test(t)) raus.push(f);
  }
  return raus;
}
const leseRepo = (f) => { try { return fs.readFileSync(path.join(REPO, f), 'utf8'); } catch (_) { return null; } };
test('[Ort-Hinweis·Doku] keine Zusage bestreitet, dass die Datei Personendaten im Klartext tragen kann; SECURITY.md nennt die Klartext-Teile', () => {
  assert.deepEqual(dokuFunde(leseRepo), []);
  const sec = leseRepo('SECURITY.md');
  for (const feld of KLARTEXT_DER_BUERGERIN) assert.ok(sec.includes('`' + feld + '`'), 'SECURITY.md nennt ' + feld);
  assert.ok(sec.includes('VIVODEPOT') && sec.includes('DATEI_MAGIC_PREFIX'), 'und den Dateikopf');
});
test('[Ort-Hinweis·Doku·Rot-Beweis] der alte Satz in SOVEREIGNTY.md und ein ADR ohne Berichtigung würden gefunden', () => {
  const alt = (f) => f === 'SOVEREIGNTY.md' ? 'Die geschriebene Datei trägt kein Klartext-Personendatum.' : leseRepo(f);
  assert.deepEqual(dokuFunde(alt), ['SOVEREIGNTY.md']);
  const adrOhne = (f) => f.endsWith('ort-hinweis-passwort-schranke-2026-07-21.md') ? 'Ort-Hinweis … ein frei gewählter Hinweistext, kein Personendatum.' : leseRepo(f);
  assert.ok(dokuFunde(adrOhne).some((f) => f.includes('ort-hinweis-passwort-schranke')));
});
