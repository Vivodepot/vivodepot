'use strict';
/* Herkunft je Angabe in der Lese-App (Custody-Bauplan Punkt 1, 26.09.2026): die Klinik soll sehen, welche Angabe die Person selbst
   gemacht hat und welche aus einem geprüften Nachweis stammt. Seit dem Befund ANTWORT-VERIFIZIERT-SELBSTAUSKUNFT (05.10.2026) kommt
   „geprüft“ nie aus der Datei — auch nicht aus `verifiziert: true` —, sondern erst aus einem mitgelieferten Nachweis, den die Lese-App
   selbst nachprüft (antwortAngabeHerkunft). Bis dahin ist jede Angabe „von der Person angegeben“.
   Seit dem Kalt-Lesetest der Klinikaufnahme-Demo (26.09.2026) steht die Aussage als EINE Zeile über der Liste statt als Vermerk an
   jeder Zeile — zehnmal derselbe Vermerk wird nicht gelesen. Einen Vermerk trägt nur die Angabe, die von der Mehrheit abweicht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const ANFRAGE = { von: 'Klinik', zweck: 'Aufnahme', grundlage: 'Behandlungsvertrag', vorgang: 'V-1' };
function datensatz(felder) {
  return { felder, fehlend: [], anfrage: ANFRAGE, vollstaendig: true };
}
const GEPRUEFT = { kennung: 'health.bloodType', label: 'Blutgruppe', wert: 'A+', herkunft: { verifiziert: true } };
const EINGETRAGEN = { kennung: 'identity.familyName', label: 'Nachname', wert: 'Muster', herkunft: { eingabeArt: 'hand' } };
const OHNE = { kennung: 'identity.givenName', label: 'Vorname', wert: 'Erika' };
const FREMD = { kennung: 'health.allergies', label: 'Allergien', wert: 'keine', herkunft: { verifiziert: 'ja' } };

// Welcher Vermerk steht an welcher Zeile — gelesen aus dem gezeichneten HTML.
function vermerke(html, attr) {
  const aus = {};
  const re = new RegExp('<li ' + attr + '="([^"]*)">[\\s\\S]*?</li>', 'g');
  let m;
  while ((m = re.exec(html))) {
    const h = /data-herkunft="(geprueft|eingetragen)"/.exec(m[0]);
    aus[m[1]] = h ? h[1] : null;
  }
  return aus;
}

const zeileVor = (html, liste) => {
  const z = html.indexOf('class="antwort-herkunft-zeile"'); const l = html.indexOf(liste);
  assert.ok(z >= 0 && l >= 0, 'Zeile und Liste gefunden'); return z < l;
};

/* Befund ANTWORT-VERIFIZIERT-SELBSTAUSKUNFT (05.10.2026): die Antwort ist verschlüsselt, aber nicht signiert. Wer den öffentlichen
   Schlüssel der Anfrage hat, baut eine Antwort mit jedem `herkunft.verifiziert`. Bis die Antwort einen Nachweis mitbringt, den die
   Lese-App selbst nachprüft, ist jede Angabe „von der Person angegeben“ — auch mit `verifiziert: true`. */
test('[Herkunft·Antwort·Befund] verifiziert:true in der Datei macht keine Angabe geprüft; EINE Zeile sagt es, kein Vermerk an den Zeilen', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([GEPRUEFT, EINGETRAGEN, OHNE, FREMD]), { vorgang: 'V-1' });
  const html = document.getElementById('app').innerHTML;
  assert.deepEqual(vermerke(html, 'data-antwort-feld'), { Blutgruppe: null, Nachname: null, Vorname: null, Allergien: null });
  assert.ok(html.includes(V.STRINGS.antwortHerkunftAlleEingetragen), 'die Zeile sagt: von der Person angegeben');
  assert.ok(!html.includes(V.STRINGS.antwortHerkunftGeprueft), 'nirgends „geprüft“');
  assert.ok(zeileVor(html, 'id="antwort-felder"'), 'die Zeile steht über der Liste');
});

test('[Herkunft·keine geprüft] ist keine Angabe geprüft, sagt EINE Zeile das — kein Vermerk an den Zeilen, nicht „0 von n“', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([EINGETRAGEN, OHNE]), { vorgang: 'V-1' });
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes(V.STRINGS.antwortHerkunftAlleEingetragen), '„Alle Angaben: von der Person selbst gemacht, keine geprüft.“');
  assert.deepEqual(vermerke(html, 'data-antwort-feld'), { Nachname: null, Vorname: null });
  assert.ok(!html.includes(V.STRINGS.antwortHerkunftZaehlung.replace('{n}', '0').replace('{m}', '2')), 'nicht „0 von 2“');
});

/* Die Darstellung für geprüfte Angaben bleibt für den Tag, an dem ein Nachweis nachgeprüft wird — geprobt am Anzeigemodell, nicht an
   einer Datei (aus einer Datei kommt heute kein „geprüft“). */
test('[Herkunft·Darstellung] alle geprüft: eine Zeile; überwiegend geprüft: vermerkt ist die selbst gemachte; gemischt: Zählung', () => {
  const { V } = ladeLesen();
  const g = { herkunft: 'geprueft' }; const e = { herkunft: 'eingetragen' };
  assert.equal(V.antwortHerkunftAbweichung([g, g]), null);
  assert.equal(V.antwortHerkunftAbweichung([g, g, e]), 'eingetragen');
  assert.equal(V.antwortHerkunftAbweichung([g, e, e]), 'geprueft');
  assert.ok(V.antwortHerkunftZeileHTML([g, g], 'z').includes(V.STRINGS.antwortHerkunftAlleGeprueft));
  assert.ok(V.antwortHerkunftZeileHTML([g, e, e, e], 'z').includes(V.STRINGS.antwortHerkunftZaehlung.replace('{n}', '1').replace('{m}', '4')));
});

test('[Herkunft·Anlass] ein Datensatz ohne Anfrage folgt derselben Regel', () => {
  const { V, document } = ladeLesen();
  V.renderAnlass({ felder: [GEPRUEFT, EINGETRAGEN], fehlend: [], anlass: { titel: 'Aufnahme' } });
  const html = document.getElementById('app').innerHTML;
  assert.deepEqual(vermerke(html, 'data-anlass-feld'), { Blutgruppe: null, Nachname: null });
  assert.ok(html.includes('id="anlass-herkunft-zaehlung"') && zeileVor(html, 'id="anlass-felder"'));
});

test('[Herkunft·leer] eine Antwort ohne Angaben zeigt keine Herkunftszeile', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([]), { vorgang: 'V-1' });
  assert.ok(!document.getElementById('app').innerHTML.includes('antwort-herkunft-zaehlung'));
});

test('[Herkunft·DE/EN] beide Sprachen führen die Texte, die Zählung mit beiden Platzhaltern', () => {
  const { html } = ladeLesen();
  for (const k of ['antwortHerkunftGeprueft', 'antwortHerkunftEingetragen', 'antwortHerkunftZaehlung', 'antwortHerkunftAlleEingetragen', 'antwortHerkunftAlleGeprueft']) {
    assert.equal((html.match(new RegExp('\\n  ' + k + ': ', 'g')) || []).length, 2, k + ' steht in DE und EN');
  }
  const zeilen = html.split('\n').filter((z) => z.startsWith('  antwortHerkunftZaehlung: '));
  for (const z of zeilen) assert.ok(z.includes('{n}') && z.includes('{m}'), z);
});

test('[Herkunft·Rot-Beweis] eine Anzeige, die alles als geprüft ausgibt, fällt an der Probe „keine geprüft“ durch', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([GEPRUEFT, EINGETRAGEN, OHNE, FREMD]), { vorgang: 'V-1' });
  const echt = document.getElementById('app').innerHTML;
  const gefaelscht = echt.replace(V.STRINGS.antwortHerkunftAlleEingetragen, V.STRINGS.antwortHerkunftAlleGeprueft);
  assert.ok(echt.includes(V.STRINGS.antwortHerkunftAlleEingetragen), 'echt: keine geprüft');
  assert.ok(!gefaelscht.includes(V.STRINGS.antwortHerkunftAlleEingetragen), 'die Fälschung fiele an derselben Prüfung auf');
  const m = V.antwortAnzeigeModell(datensatz([GEPRUEFT, EINGETRAGEN, OHNE, FREMD]), {});
  assert.deepEqual(m.felder.map((f) => f.herkunft), ['eingetragen', 'eingetragen', 'eingetragen', 'eingetragen'], 'verifiziert true, fehlend, falsch oder "ja": nie geprüft');
});

test('[Herkunft·Befund·Rot-Beweis] der alte Stand, der `verifiziert: true` aus der Datei glaubte, wird erkannt', () => {
  const fs = require('node:fs');
  const { LESEN_PATH } = require('./load-lesen.js');
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const a = "      herkunft: antwortAngabeHerkunft(),";
  assert.equal(html.split(a).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const alt = html.replace(a, "      herkunft: (f.herkunft && f.herkunft.verifiziert === true) ? 'geprueft' : 'eingetragen',");
  const { V } = ladeLesen({ html: alt });
  const m = V.antwortAnzeigeModell(datensatz([GEPRUEFT]), {});
  assert.equal(m.felder[0].herkunft, 'geprueft', 'der alte Stand macht die Angabe geprüft — genau das fängt die Probe oben');
});
