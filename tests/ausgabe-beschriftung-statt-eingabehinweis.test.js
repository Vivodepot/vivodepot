'use strict';
/* Beschriftung in Ausgaben statt Eingabehinweis (09.10.2026).
   „Name im Depot“ ist die Beschriftung der Eingabe im Menschen-Register: sie sagt, wozu das Feld neben Familienname und Vornamen da ist.
   In einem Dokument (Notfallblatt, PDF, Lese-App, Zusammenfassung, Prüftermine) ist das ein Hinweis zur Eingabe, kein Feldname. Darum
   trägt ein Feld dort seine Ausgabe-Beschriftung aus dem Textsatz (Art `ausgabeLabel`), sonst die Eingabe-Beschriftung, und die
   Ausgabewege lesen sie über `feldAusgabeBeschriftung()`, nie direkt vom Feld.
   Gemessen am geladenen Kern, mit Rot-Beweis je Aussage. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
/* Die Ausgabewege, die Unterfeld-Beschriftungen in ein Dokument, einen Export oder den Depot-Inhalt schreiben. */
const AUSGABEWEGE = ['listenEintragZusammenfassung', '_verweisListenEintragZusammenfassung', 'prueftermineZeilen', 'depotNormalisieren'];
/* Die Stellen, die die Beschriftung eines Unterfelds direkt lesen, sind Eingabe: sie nennen das Feld so, wie es im Formular steht.
   Jede andere Funktion, die das tut, fällt auf, und muss entweder hierher (mit Grund) oder auf feldAusgabeBeschriftung(). */
const EINGABE = {
  listenEintragInputsHTML: 'die Eingabemaske selbst',
  _pruefzifferEintragMelden: 'Meldung zur Prüfziffer an der Eingabe',
  _unstimmigFundText: 'Hinweis vor dem Herausgeben, nennt das Feld im Formular',
  _referenzStellen: '„Wird verwendet in“ im Bearbeiten-Dialog',
  institutionReferenzStellen: '„Wird verwendet in“ im Bearbeiten-Dialog',
  wechselmomentText: 'Hinweis in der App, welche Formularfelder bei einer Art nicht erscheinen',
  zeileVerwaisteFelder: 'sammelt die Formularfelder für denselben Hinweis (wechselmomentText)',
  _templateFeldZuModell: 'Vorlagen-Einlass, baut das Feldmodell (keine Ausgabe)',
};
/* Funktionen im Kern, die über Unterfelder laufen und deren Beschriftung direkt lesen (Optionsbeschriftungen `o.label` zählen nicht). */
function direktLeser(text) {
  const re = /^(?:async )?function ([A-Za-z0-9_$]+)\s*\(/gm;
  const fns = []; let m;
  while ((m = re.exec(text))) fns.push([m[1], m.index]);
  fns.push(['', text.length]);
  const raus = new Set();
  for (let i = 0; i < fns.length - 1; i++) {
    const b = text.slice(fns[i][1], fns[i + 1][1]);
    if (!/unterFelder|_listenUnterfeldDef/.test(b)) continue;
    const vars = new Set(['uf', '_uf', 'u', 'us', 'v', 'unterfeld', 'unterFeld']);
    if ([...b.matchAll(/\b([A-Za-z_$][\w$]*)\.label\b/g)].some((x) => vars.has(x[1]))) raus.add(fns[i][0]);
  }
  return raus;
}

function rumpf(text, name) {
  const i = text.indexOf('function ' + name + '(');
  assert.ok(i >= 0, 'Voraussetzung: ' + name + ' steht im Kern');
  const j = text.indexOf('\n}\n', i);
  return text.slice(i, j);
}
/* Eine Feld-Beschriftung, die eine Ausgabe direkt vom Feldobjekt liest, statt über feldAusgabeBeschriftung(). */
const direkteBeschriftung = (r) => (r.match(/\b(?:uf|_uf|unterfeld|u)\.label\b/g) || []);

test('[Ausgabe-Beschriftung] die Ausgabewege lesen die Beschriftung eines Unterfelds nur über feldAusgabeBeschriftung()', () => {
  for (const name of AUSGABEWEGE) {
    const r = rumpf(KERN, name);
    assert.deepEqual(direkteBeschriftung(r), [], name + ' liest die Beschriftung direkt vom Feld');
    assert.match(r, /feldAusgabeBeschriftung\(/, name + ' nutzt feldAusgabeBeschriftung');
  }
});

test('[Ausgabe-Beschriftung·Klasse] wer die Beschriftung eines Unterfelds direkt liest, ist benannte Eingabe; jede Ausgabe geht über feldAusgabeBeschriftung()', () => {
  const leser = [...direktLeser(KERN)];
  assert.deepEqual(leser.filter((f) => !EINGABE[f]).sort(), [], 'direkt gelesen, aber nicht als Eingabe benannt');
  assert.deepEqual(Object.keys(EINGABE).filter((f) => !leser.includes(f)).sort(), [], 'als Eingabe benannt, liest aber nicht mehr direkt (Liste nachziehen)');
  for (const f of AUSGABEWEGE) assert.ok(!EINGABE[f], f + ' ist Ausgabe');
});

test('[Ausgabe-Beschriftung·Klasse·Rot-Beweis] eine neue Funktion, die die Beschriftung direkt in eine Ausgabe setzt, fällt auf', () => {
  const gepflanzt = KERN + '\nfunction pdfProbeZeile(feld, e) { return (feld.unterFelder || []).map((uf) => uf.label + ": " + e[uf.id]).join(" · "); }\n';
  assert.deepEqual([...direktLeser(gepflanzt)].filter((f) => !EINGABE[f]), ['pdfProbeZeile']);
});

test('[Ausgabe-Beschriftung·Rot-Beweis] ein Ausgabeweg, der uf.label direkt setzt, fällt auf', () => {
  // Seit LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG (09.10.2026) beschriftet die Zusammenfassung jedes Unterfeld über
  // feldAusgabeBeschriftung; der Rot-Beweis setzt genau diese Stelle auf uf.label zurück. Greift der Austausch nicht,
  // wäre der Beweis leer — darum zuerst die Vorbedingung.
  const vorher = rumpf(KERN, 'listenEintragZusammenfassung');
  const r = vorher.replace('(feldAusgabeBeschriftung(uf) || \'\')', '(uf.label || \'\')');
  assert.notEqual(r, vorher, 'Vorbedingung: die Stelle, die gepflanzt wird, steht im Kern');
  assert.equal(direkteBeschriftung(r).length, 1);
});

test('[Ausgabe-Beschriftung] die Person im Dokument heißt „Name“, nicht „Name im Depot“; die Eingabe behält ihren Hinweis', () => {
  const { V } = ladeKern();
  const name = V.MENSCHEN_REGISTER_FELD.unterFelder.find((u) => u.id === 'name');
  assert.equal(name.label, 'Name im Depot', 'Voraussetzung: die Eingabe trägt ihren Hinweis');
  assert.equal(V.feldAusgabeBeschriftung(name), 'Name');
  // Wie eine Ausgabe, die jedes Unterfeld beschriftet („Beschriftung: Wert“), den Eintrag einer Person setzen würde:
  const eintrag = { name: 'Julia Reindl', familyName: 'Reindl', givenName: 'Julia' };
  const zeile = (beschriftung) => V.MENSCHEN_REGISTER_FELD.unterFelder.filter((u) => eintrag[u.id]).map((u) => beschriftung(u) + ': ' + eintrag[u.id]).join(' · ');
  const text = zeile((u) => V.feldAusgabeBeschriftung(u));
  assert.ok(!text.includes('Name im Depot'), text);
  assert.match(text, /^Name: Julia Reindl/);
  // Rot-Beweis: mit der Eingabe-Beschriftung stünde der Hinweis im Dokument.
  assert.ok(zeile((u) => u.label).includes('Name im Depot: Julia Reindl'));
  // Und die heutige Zusammenfassung des Eintrags trägt den Hinweis ebenfalls nicht.
  assert.ok(!V.listenEintragZusammenfassung(V.MENSCHEN_REGISTER_FELD, eintrag).includes('Name im Depot'));
});

test('[Ausgabe-Beschriftung] eine Ausgabe-Beschriftung geht der Eingabe-Beschriftung vor, fehlt sie, gilt die Eingabe-Beschriftung', () => {
  const { V } = ladeKern();
  const feld = { id: 'probe', unterFelder: [{ id: 'd', typ: 'datum', label: 'Eingabehinweis', ausgabeLabel: 'Ausgabe' }] };
  const mit = V.listenEintragZusammenfassung(feld, { d: '2026-10-09' });
  assert.ok(mit.includes('Ausgabe') && !mit.includes('Eingabehinweis'), mit);
  const ohne = V.listenEintragZusammenfassung({ id: 'probe', unterFelder: [{ id: 'd', typ: 'datum', label: 'Eingabehinweis' }] }, { d: '2026-10-09' });
  assert.ok(ohne.includes('Eingabehinweis'), ohne);
});

test('[Ausgabe-Beschriftung] DE und EN tragen die Ausgabe-Beschriftung aus dem Textsatz', () => {
  const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  assert.equal(de['menschenRegister/name.ausgabeLabel'], 'Name');
  assert.equal(en['menschenRegister/name.ausgabeLabel'], 'Name');
  assert.notEqual(de['menschenRegister/name.label'], de['menschenRegister/name.ausgabeLabel'], 'Eingabe und Ausgabe sind getrennt');
  assert.notEqual(en['menschenRegister/name.label'], en['menschenRegister/name.ausgabeLabel'], 'Eingabe und Ausgabe sind getrennt (EN)');
});
