'use strict';
/* Ein Personen-Wähler für alle Personenfelder (30.10.2026, Befund UX-PERSONENWAEHLER-DREIFACH, HOCH)
   Usability-Durchlauf v963: Hausarzt, Notfallkontakte und „Personen, die etwas sehen dürfen“ wählten Personen je anders. In den
   Notfallkontakten schlug das Feld nichts vor; Enter auf „Sabine“ legte eine zweite Person „Sabine“ ohne Telefon an, „Sabine
   Musterfrau“ mit Telefon blieb unverknüpft. Die Notfallkarte zeigte den Namen ohne Nummer. Der Dialog „Neue Person“ fragte nur
   den Namen.

   Geprüft wird am Verhalten, wo der Kern es ohne Browser zeigt (Auflösung des Namens, Dialoge über ui.modal, Karte), und an der
   Form des Quelltexts, wo die Verdrahtung im DOM liegt (der DOM-Stub hält keinen Baum; Bilder für die Gestaltungsleitung). Die
   Klassenprobe am Ende hält jede Neuanlage aus einem Personenfeld an der einen Maske mit Telefon. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'personenwaehler-inhaberin-pw';
const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

async function depot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Erika Beispiel');
  return k;
}
// Fängt jeden ui.modal-Aufruf; `schliessen` ist ein leerer Rückruf wie im echten Modal.
function modalsFangen(V) {
  const modals = [];
  V.ui.modal = (opt) => { modals.push(opt); };
  V.ui.toast = () => {};
  return modals;
}
function funktionsBlock(kopf, naechster) {
  const a = HTML.indexOf(kopf);
  assert.ok(a > -1, kopf + ' gefunden');
  const e = HTML.indexOf(naechster, a + kopf.length);
  assert.ok(e > a, 'Ende von ' + kopf + ' gefunden');
  return HTML.slice(a, e);
}

test('[Personenwähler] „Sabine“ findet „Sabine Musterfrau“, statt eine zweite Sabine anzulegen', async () => {
  const { V } = await depot();
  const sabine = V.personHinzufuegen({ name: 'Sabine Musterfrau', tel: '0170 333 4444' });
  V.personHinzufuegen({ name: 'Dr. Klaus Hausarzt' });
  assert.equal(V.personAusEingabeFinden('Sabine'), sabine, 'der Anfang des Namens trifft genau eine Person');
  assert.equal(V.personAusEingabeFinden('musterfrau'), sabine, 'auch ein späterer Namensteil, ohne Groß-/Kleinschreibung');
  assert.equal(V.personAusEingabeFinden('Sabine Musterfrau'), sabine, 'der volle Name');
  assert.equal(V.getData().menschen.length, 3, 'nichts angelegt (Erika, Sabine, Klaus)');
});

test('[Personenwähler] zwei Treffer oder keiner: keine Wahl im Namen der Nutzerin', async () => {
  const { V } = await depot();
  V.personHinzufuegen({ name: 'Sabine Musterfrau' });
  V.personHinzufuegen({ name: 'Sabine Beispiel' });
  assert.equal(V.personAusEingabeFinden('Sabine'), '', 'zwei Sabinen — die Liste bleibt zur Wahl offen');
  assert.equal(V.personAusEingabeFinden('Jonas'), '', 'kein Treffer — dann die Maske mit Telefon');
  assert.equal(V.personAusEingabeFinden('bine'), '', 'ein Treffer mitten im Wort zählt nicht als eindeutig');
});

test('[Personenwähler] „+ Neue Person“ fragt Name und Telefon in einem Dialog', async () => {
  const k = await depot();
  const modals = modalsFangen(k.V);
  let angelegt = null;
  k.V.flowRefNeueEntitaet({ entitaet: 'person' }, (id) => { angelegt = id; });
  assert.equal(modals.length, 1);
  assert.match(modals[0].koerperHTML, /id="ref-neu-name"/);
  assert.match(modals[0].koerperHTML, /id="ref-neu-tel"/, 'das Telefon steht im selben Dialog');
  assert.ok(modals[0].koerperHTML.includes(k.V.STRINGS.refNeuePersonTel));
  k.document.getElementById('ref-neu-name').value = 'Jonas Nachbar';
  k.document.getElementById('ref-neu-tel').value = '0151 222 3333';
  modals[0].onPrimaer(() => {});
  const p = k.V.getData().menschen.find((m) => m.id === angelegt);
  assert.ok(p, 'die Person ist angelegt');
  assert.equal(p.name, 'Jonas Nachbar');
  assert.equal(p.tel, '0151 222 3333');
});

test('[Personenwähler] gibt es den Namen schon, bietet der Dialog die Person an — keine Dublette', async () => {
  const k = await depot();
  const sabine = k.V.personHinzufuegen({ name: 'Sabine Musterfrau' });
  const modals = modalsFangen(k.V);
  let gewaehlt = null;
  k.V.flowRefNeueEntitaet({ entitaet: 'person' }, (id) => { gewaehlt = id; });
  k.document.getElementById('ref-neu-name').value = 'sabine musterfrau';
  k.document.getElementById('ref-neu-tel').value = '0170 333 4444';
  modals[0].onPrimaer(() => {});
  assert.equal(modals.length, 2, 'ein zweiter Dialog fragt nach');
  assert.equal(modals[1].titel, k.V.STRINGS.refPersonGefundenTitel);
  assert.ok(modals[1].zweitAktion, '„Trotzdem neu anlegen“ bleibt möglich');
  modals[1].onPrimaer(() => {});
  assert.equal(gewaehlt, sabine, 'die bestehende Person ist gewählt');
  const sabinen = k.V.getData().menschen.filter((m) => /sabine/i.test(m.name));
  assert.equal(sabinen.length, 1, 'keine zweite Sabine');
  assert.equal(sabinen[0].tel, '0170 333 4444', 'die eben getippte Nummer ist nicht verloren');
});

test('[Personenwähler] jede Maske der Neuanlage trägt das Telefon, und die Neuanlage nimmt es mit', async () => {
  const { V } = await depot();
  assert.match(V._personNeuMaskeHTML('f1', 'Sabine', false), /data-neu-tel="f1"/);
  assert.match(V._personNeuMaskeHTML('f1', 'Sabine', false), /data-neu-name="f1" value="Sabine"/, 'der getippte Name steht schon drin');
  const maske = V._personNeuMaskeHTML('f1', '', false);
  assert.match(maske, /<label><span>Name<\/span><input type="text" data-neu-name/, 'Beschriftung „Name“ über dem Feld');
  assert.match(maske, /<label><span>Telefon<\/span><input type="tel"/, 'Beschriftung „Telefon“ über dem Feld');
  assert.match(maske, /class="btn btn-klein" data-neu-anlegen/, '„Hinzufügen“ ist der Hauptknopf');
  assert.match(maske, /class="btn-dezent" data-neu-abbr/, '„Verwerfen“ ist ein Textknopf');
  assert.equal(V.personPatchAusInlineNeuanlage('Sabine', '', '', ' 0170 1 ').tel, '0170 1');
  assert.equal('tel' in V.personPatchAusInlineNeuanlage('Sabine', '', '', ''), false, 'leer bleibt leer');
});

test('[Personenwähler] das Mehrfach-Feld (Notfallkontakte) schlägt beim Antippen vor und legt nie still an', () => {
  const block = funktionsBlock('function _refMehrfachVerdrahten(', '\nfunction ');
  const bestaetige = block.slice(block.indexOf('const bestaetige = () => {'), block.indexOf('const neuMaskeZeigen = '));
  const personTeil = bestaetige.slice(bestaetige.indexOf("if (entitaet === 'institution') {"));
  const nachInstitution = personTeil.slice(personTeil.indexOf('return;\n        }') + 1);
  assert.match(nachInstitution, /personAusEingabeFinden\(nm, feld\.selbstbezug\)/, 'ein eindeutiger Treffer wird verknüpft');
  assert.doesNotMatch(nachInstitution, /personFindenOderAnlegen\(/, 'kein stilles Anlegen ohne Telefon');
  assert.match(nachInstitution, /neuMaskeZeigen\(nm\)/, 'sonst die Maske mit Telefon');
  assert.match(block, /_personNeuMaskeHTML\(fid, nm, false\)/);
  assert.match(block, /eingabe\.onfocus = \(\) => \{ schmutzig = false; if \(!refFeld\.value\) zeigen\(\); \};/, 'Antippen öffnet die Liste');
  assert.match(block, /if \(!t\) return \(entitaet === 'institution'\) \? \[\] : alle\.slice\(0, 8\);/, 'ein leeres Feld zeigt „Meine Menschen“');
  // Gestaltungsleitung 31.10.2026: unter jedem Namen die Nummer oder „keine Telefonnummer“; gewählt wird der Name, nicht der Zeilentext
  assert.match(block, /m\.tel \|\| STRINGS\.refmKeinTelefon/, 'die Vorschläge nennen die Telefonnummer oder ihr Fehlen');
  assert.match(block, /li\.getAttribute\('data-name'\) \|\| li\.textContent/, 'die Wahl übernimmt den Namen ohne die Nummer');
});

test('[Personenwähler] die Inline-Anlage im Eintrags-Dialog nutzt dieselbe Maske mit Telefon', () => {
  const block = funktionsBlock('function _refSubPickerVerdrahten(feld)', '\nfunction _refMehrfachVerdrahten(');
  const personTeil = block.slice(block.indexOf('Ab hier nur noch Personen'));
  assert.match(personTeil, /inline\.innerHTML = _personNeuMaskeHTML\(fid, '', mitGeburt\);/);
  assert.match(personTeil, /personPatchAusInlineNeuanlage\(name, gd && gd\.value, gj && gj\.value, telInp && telInp\.value\)/);
});

test('[Personenwähler] „Personen, die etwas sehen dürfen“ wählt aus „Meine Menschen“', async () => {
  const k = await depot();
  k.V.personHinzufuegen({ name: 'Sabine Musterfrau', tel: '0170 333 4444' });
  const modals = modalsFangen(k.V);
  k.V.flowEmpfaengerkreisBearbeiten();
  assert.equal(modals.length, 1);
  const html = modals[0].koerperHTML;
  assert.match(html, /<select id="kreis-person">/);
  // Die Personen setzt die Verdrahtung als DOM-Knoten ein (textContent, 31.10.2026), nicht als HTML-Zeichenkette.
  assert.doesNotMatch(html, /Sabine Musterfrau/, 'kein Name als HTML im Dialogtext');
  const einsetzen = funktionsBlock('function _kreisPersonAuswahlVerdrahten()', '\n  sel.onchange = ');
  assert.match(einsetzen, /personenVorschlag\(false\)[^\n]*sel\.insertBefore\(option\(p\.id, p\.name\), neuOption\)/, 'die Person steht zur Wahl, vor „+ Neue Person“');
  assert.match(einsetzen, /o\.textContent = name/, 'der Name geht als Text in die Option');
  assert.ok(html.includes(k.V.STRINGS.kreisePersonNeu), '„+ Neue Person“');
  // Bild 30.10.2026: ein leerer Kasten .inline-neu mit `hidden` blieb sichtbar — die Maske entsteht erst mit „+ Neue Person“
  assert.doesNotMatch(html, /class="inline-neu"/, 'kein vorab gesetzter Maskenkasten im Kreisdialog');
  assert.match(html, /<select id="kreis-person"><option value="">— bitte wählen —<\/option>/, 'erste Zeile wie bei jeder Auswahl');
  assert.match(html, /<div id="kreis-name-zeile">/, 'das Namensfeld steht in einer eigenen Zeile');
  const verdrahtenGanz = funktionsBlock('function _kreisPersonAuswahlVerdrahten()', '\nfunction ');
  assert.match(verdrahtenGanz, /nameZeile\.hidden = !!sel\.value;/, 'ist eine Person gewählt oder die Maske offen, entfällt das Namensfeld');
  assert.match(verdrahtenGanz, /insertAdjacentElement\('afterend', maske\);\s*nameZeileZeigen\(\);/, 'mit der offenen Maske entfällt das Namensfeld sofort, nicht erst nach „Hinzufügen“');
  const verdrahten = funktionsBlock('function _kreisPersonAuswahlVerdrahten()', '\n  sel.onchange = ');
  assert.match(verdrahten, /personFindenNachName\(nameInp\.value\)[\s\S]*sel\.value = vorhanden\.id/, 'ein bestehender Kreis zeigt seine Person');
});

test('[Personenwähler] vor dem Druck der Notfallkarte: „Für Sabine ist keine Telefonnummer hinterlegt.“', async () => {
  const k = await depot();
  const sabine = k.V.personHinzufuegen({ name: 'Sabine' });
  k.V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin', code: '' }]);
  k.V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: sabine, override: '' }]);
  assert.deepEqual(k.V.notfallkarteOhneTelefon(), [{ id: sabine, name: 'Sabine' }]);
  const modals = modalsFangen(k.V);
  k.V.flowNotfallkartePdf();
  assert.equal(modals.length, 1, 'die Anwendung fragt vor dem Druck');
  assert.equal(modals[0].titel, k.V.STRINGS.notfallkarteTelFehltTitel);
  assert.ok(modals[0].koerperHTML.includes('Für Sabine ist keine Telefonnummer hinterlegt. Auf der Karte steht dann nur der Name.'));
  assert.equal(modals[0].primaerLabel, k.V.STRINGS.notfallkarteTelErgaenzen);
  assert.equal(modals[0].zweitAktion.label, k.V.STRINGS.notfallkarteTrotzdemDrucken);
  modals.length = 0;
  k.V.flowNotfallkartePdf({ trotzdem: true });
  assert.equal(modals.length, 0, '„Trotzdem drucken“ fragt nicht noch einmal');
});

test('[Personenwähler] mit Nummer fragt die Karte nicht und zeigt die Nummer neben dem Namen', async () => {
  const k = await depot();
  const sabine = k.V.personHinzufuegen({ name: 'Sabine Musterfrau', tel: '0170 333 4444' });
  k.V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: sabine, override: '' }]);
  assert.deepEqual(k.V.notfallkarteOhneTelefon(), []);
  const zeile = k.V.notfallKernModell().find((z) => z.feld === 'emergencyContacts');
  assert.ok(zeile && zeile.wert.includes('Sabine Musterfrau') && zeile.wert.includes('0170 333 4444'), 'Name und Nummer auf der Karte');
});

/* Klassenprobe: aus einem Personenfeld entsteht eine Person nur über die eine Maske (Name und Telefon). Gezählt werden die Stellen im
   Kern, die personHinzufuegen mit einem nackten Namen rufen — dort entstand die Sabine ohne Nummer. */
test('[Personenwähler·Klasse] kein Personenfeld legt eine Person mit nichts als dem Namen an', () => {
  const nackt = HTML.match(/personHinzufuegen\(\{ name(?:: [a-zA-Z]+)? \}\)/g) || [];
  // Erlaubt bleibt allein personFindenOderAnlegen: es ist der Weg für Institutions-Felder und Einlese-Pfade, kein Personenfeld.
  const stellen = nackt.length;
  const imErlaubten = (funktionsBlock('function personFindenOderAnlegen(name)', '\n}').match(/personHinzufuegen\(\{ name: n \}\)/g) || []).length;
  assert.equal(stellen - imErlaubten, 0, 'eine Neuanlage ohne Telefon-Maske: ' + nackt.join(', '));
});

test('[Personenwähler·Klasse·Rot-Beweis] die Klassenprobe findet den alten Dialog', () => {
  const alt = "const id = personHinzufuegen({ name });   // A1";
  const nackt = alt.match(/personHinzufuegen\(\{ name(?:: [a-zA-Z]+)? \}\)/g) || [];
  assert.equal(nackt.length, 1, 'das Muster trifft die alte Zeile aus flowRefNeueEntitaet');
});
