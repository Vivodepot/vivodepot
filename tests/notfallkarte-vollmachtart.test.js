'use strict';
/* Befund NOTFALLKARTE-VOLLMACHTART (17.10.2026, Fund im Code, Bericht produktfakten-vollmacht-organspende-2026-10-17.md):
   Die Notfallkarte zeigt „Bevollmächtigte Person“ aus `liste:provisionInstruments:enduring-power-of-attorney:authorizedPersons`
   und wählt im Notfall-Pfad GENAU EINE Zeile (`genauEine`, U2-ADR-096 §5a): die jüngste, ohne Datum die erste. Eine Bankvollmacht
   ist derselbe Instrumenttyp, sie unterscheidet sich nur in `typeOfPowerOfAttorney` (vorsorge | bank | betreuung). Wer eine
   Vorsorge- und eine Bankvollmacht hat, dem zeigt die Karte darum die Bankbevollmächtigte als die Person, die im Notfall
   entscheidet — wenn die Bankvollmacht jünger ist oder zuerst steht.
   Diese Probe hält: die Karte nennt die Bevollmächtigte der Vorsorgevollmacht, nie die einer Bankvollmacht — gleich, welche jünger
   ist und welche zuerst steht. Dasselbe für den Ablageort der Vollmacht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function depot(V, { bankJuenger = true, bankZuerst = true, datiert = true } = {}) {
  const bank = { id: 'b1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank',
    authorizedPersons: [{ ref: '', override: 'Bettina Bank' }], storageLocation: 'Bankschließfach' };
  const vorsorge = { id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge',
    authorizedPersons: [{ ref: '', override: 'Vera Vorsorge' }], storageLocation: 'Ordner Vorsorge, Regal' };
  if (datiert) {
    bank.dateOfLastChange = bankJuenger ? '2026-05-01' : '2024-05-01';
    vorsorge.dateOfLastChange = bankJuenger ? '2024-05-01' : '2026-05-01';
  }
  V.setData({ sektoren: { advanceCare: { provisionInstruments: bankZuerst ? [bank, vorsorge] : [vorsorge, bank] } } });
}
const kartenText = (V) => V.notfallKernModell().map((z) => String(z.label) + ': ' + String(z.wert)).join('\n');

for (const fall of [
  { name: 'Bankvollmacht jünger', opt: { bankJuenger: true, bankZuerst: false } },
  { name: 'Bankvollmacht zuerst, ohne Datum', opt: { datiert: false, bankZuerst: true } },
  { name: 'Bankvollmacht älter (Positivkontrolle der heutigen Auswahl)', opt: { bankJuenger: false, bankZuerst: true } },
]) {
  test('[Notfallkarte·Vollmachtart] ' + fall.name + ': die Karte nennt die Vorsorgebevollmächtigte, nie die der Bank', () => {
    const { V } = ladeKern();
    depot(V, fall.opt);
    const t = kartenText(V);
    assert.ok(t.includes('Vera Vorsorge'), 'die Vorsorgebevollmächtigte steht auf der Karte:\n' + t);
    assert.ok(!t.includes('Bettina Bank'), 'die Bankbevollmächtigte steht nicht auf der Karte:\n' + t);
    assert.ok(!t.includes('Bankschließfach'), 'und nicht der Ablageort der Bankvollmacht');
  });
}

test('[Notfallkarte·Vollmachtart] nur eine Bankvollmacht: keine bevollmächtigte Person und kein Ablageort auf der Karte', () => {
  const { V } = ladeKern();
  V.setData({ sektoren: { advanceCare: { provisionInstruments: [
    { id: 'b1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank',
      authorizedPersons: [{ ref: '', override: 'Bettina Bank' }], storageLocation: 'Bankschließfach', dateOfLastChange: '2026-05-01' },
  ] } } });
  const t = kartenText(V);
  assert.ok(!t.includes('Bettina Bank') && !t.includes('Bankschließfach'), t);
});

test('[Notfallkarte·Vollmachtart·Format] die Vertreterin für Format-Ausgaben ist nie die Person einer Bankvollmacht', () => {
  const { V } = ladeKern();
  const mensch = (id, name) => ({ id, name, vorname: name.split(' ')[0], nachname: name.split(' ')[1] });
  V.setData({ menschen: [mensch('m-bank', 'Bettina Bank'), mensch('m-vors', 'Vera Vorsorge')], sektoren: { advanceCare: { provisionInstruments: [
    { id: 'b1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: 'm-bank' }] },
    { id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: 'm-vors' }] },
  ] } } });
  const r = V.formatVertreterAufloesen();
  assert.equal(r.person && r.person.id, 'm-vors', 'die Vorsorgebevollmächtigte, nicht „vertreter-mehrere“: ' + JSON.stringify(r));
  V.setData({ menschen: [mensch('m-bank', 'Bettina Bank')], sektoren: { advanceCare: { provisionInstruments: [
    { id: 'b1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: 'm-bank' }] },
  ] } } });
  assert.equal(V.formatVertreterAufloesen().grund, 'vertreter-fehlt', 'nur Bankvollmacht: keine Vertreterin');
});

test('[Notfallkarte·Vollmachtart·Blatt] die Zeile „Vorsorgevollmacht“ sagt bei nur einer Bankvollmacht nicht „ja“', () => {
  const { V } = ladeKern();
  const nurBank = [{ id: 'b1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: '', override: 'Bettina Bank' }] }];
  V.setData({ sektoren: { advanceCare: { provisionInstruments: nurBank } } });
  assert.equal(V.instrumentZeileModell('enduring-power-of-attorney').roh, undefined, 'nur Bank: keine Aussage');
  V.setData({ sektoren: { advanceCare: { provisionInstruments: nurBank.concat([{ id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' }]) } } });
  assert.equal(V.instrumentZeileModell('enduring-power-of-attorney').roh, 'ja', 'mit Vorsorgevollmacht: ja');
});

/* Klassenwächter: jede Stelle im Kern, die eine Zeile über `instrument === 'enduring-power-of-attorney'` wählt, nimmt entweder das
   gemeinsame Kriterium (vollmachtFuerBehandlung bzw. IPS_VORSORGE_ARTEN_AUSGENOMMEN), fragt ausdrücklich nach der Art, oder steht
   unten mit Grund. Eine neue Stelle, die eine Vollmacht nur nach dem Typ wählt, ist rot. */
const fs = require('node:fs');
const path = require('node:path');
const MIT_GRUND = {
  _ipsVorsorgeEintraege: 'die Schleife überspringt ausgenommene Arten zwei Zeilen davor (IPS_VORSORGE_ARTEN_AUSGENOMMEN)',
  _isikUrschrift: 'wählt ein Dokument aus „Meine Dokumente“, keine Vollmacht-Zeile; die Person bestätigt die Urschrift beim Export',
  _vmZeile: 'wählt eine Zeile über ihre id, die der Aufrufer schon kennt',
  _instrumentZeileVorhanden: 'die Weiche selbst: nur der Typ wird hier unterschieden, die Auswahl geht über vollmachtFuerBehandlung',
  feldInputHTML: 'Eingabemaske: zeigt jede Vollmacht-Zeile zum Bearbeiten, gibt nichts heraus',
};
function stellenErheben(kern) {
  const stellen = [];
  let fn = null;
  kern.split('\n').forEach((z, i) => {
    const m = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(z);
    if (m) fn = m[1];
    if (/^\s*\/\//.test(z) || !/[=!]==\s*'enduring-power-of-attorney'/.test(z)) return;
    const geprueft = /vollmachtFuerBehandlung|IPS_VORSORGE_ARTEN_AUSGENOMMEN|typeOfPowerOfAttorney\s*===/.test(z) || fn === 'vollmachtFuerBehandlung';
    stellen.push({ zeile: i + 1, fn, geprueft });
  });
  return stellen;
}
const ungeklaert = (kern) => stellenErheben(kern).filter((s) => !s.geprueft && !MIT_GRUND[s.fn]).map((s) => s.fn + ':' + s.zeile);

test('[Notfallkarte·Vollmachtart·Klasse] jede Wahl einer Vollmacht-Zeile im Kern fragt nach der Art oder steht mit Grund', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(stellenErheben(kern).length >= 8, 'Positivkontrolle: die Erhebung findet die Stellen');
  assert.deepEqual(ungeklaert(kern), []);
  for (const fn of Object.keys(MIT_GRUND)) assert.ok(stellenErheben(kern).some((s) => s.fn === fn), fn + ' steht noch im Kern (sonst Eintrag streichen)');
});

test('[Notfallkarte·Vollmachtart·Klasse·Rot-Beweis] eine neue Stelle, die nur nach dem Typ wählt, ist rot', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8')
    + "\nfunction neueAusgabeVollmacht(liste) {\n  return liste.find((z) => z.instrument === 'enduring-power-of-attorney');\n}\n";
  assert.deepEqual(ungeklaert(kern).map((s) => s.split(':')[0]), ['neueAusgabeVollmacht']);
});

/* Die Lese-App zeigt dieselbe Notfallkarte aus ihrer Handkopie von NOTFALL_KERN_FELDER (U2-ADR-262) und wählt die Zeile mit ihrem
   eigenen listenZeilenWaehlen. Ohne den Filter dort zeigte sie die Bankbevollmächtigte weiter, auch wenn der Kern es nicht mehr tut. */
for (const fall of [
  { name: 'Bankvollmacht jünger', opt: { bankJuenger: true, bankZuerst: false } },
  { name: 'Bankvollmacht zuerst, ohne Datum', opt: { datiert: false, bankZuerst: true } },
]) {
  test('[Notfallkarte·Vollmachtart·Lese-App] ' + fall.name + ': die Karte nennt die Vorsorgebevollmächtigte, nie die der Bank', () => {
    const { ladeLesen } = require('./load-lesen.js');
    const { V } = ladeLesen({ ohneSaat: true });
    depot(V, fall.opt);
    const t = kartenText(V);
    assert.ok(t.includes('Vera Vorsorge'), 'die Vorsorgebevollmächtigte steht auf der Karte der Lese-App:\n' + t);
    assert.ok(!t.includes('Bettina Bank') && !t.includes('Bankschließfach'), 'nichts aus der Bankvollmacht:\n' + t);
  });
}
