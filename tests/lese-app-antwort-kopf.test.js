'use strict';
/* Der Kopf der Antwort in der Lese-App (26.09.2026, aus dem Durchklicken der Klinikaufnahme-Demo):
   - „Von: Kliniksozialdienst" nannte die anfragende Stelle als Absenderin ihrer eigenen Antwort. Jetzt sagt die Überschrift,
     wer antwortet (U2-ADR-437, Proben in tests/anfrage-antwort-absender.test.js); der Vorgang steht darunter.
   - Die Antwort sagte nirgends, wessen Angaben sie trägt. Jetzt: „Angaben zu <Vorname Nachname>, geb. <Datum>" unter der
     Überschrift — nur, wenn der Name in der Antwort steht; sonst erfindet der Kopf nichts.
   - Die Feldnamen des Depots sind für die Person geschrieben, die einträgt („Bevollmächtigte Person(en)"). Beim Empfänger
     steht je Kennung eine eigene Beschriftung (STRINGS.antwortBeschriftung), sonst die aus dem Datensatz.
   Beides in beiden Sprachen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const EPA = 'advanceCare.provisionInstruments[enduring-power-of-attorney].';
const ANFRAGE = { von: 'Kliniksozialdienst', zweck: 'Aufnahme', grundlage: 'Behandlungsvertrag', vorgang: 'SD-1' };
const datensatz = (felder) => ({ felder, fehlend: [{ kennung: EPA + 'storageLocation', label: 'Ablageort', pflicht: true }], anfrage: ANFRAGE, vollstaendig: false });
const NAME = [
  { kennung: 'identity.givenName', label: 'Vorname', wert: 'Erna' },
  { kennung: 'identity.familyName', label: 'Nachname', wert: 'Mustermann' },
  { kennung: 'identity.birthDate', label: 'Geburtsdatum', wert: '01.02.1940' },
];
const VOLLMACHT = { kennung: EPA + 'authorizedPersons', label: 'Bevollmächtigte Person(en)', wert: 'Kai Mustermann' };
const FREMD = { kennung: 'health.bloodType', label: 'Blutgruppe', wert: 'A+' };

test('[Lese-App·Kopf] wessen Angaben das sind, vor dem Vorgang', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz(NAME.concat([VOLLMACHT])), { vorgang: 'SD-1' });
  const html = document.getElementById('app').innerHTML;
  assert.equal(V.STRINGS.antwortVon, undefined, '„Von:"/„Ihre Anfrage:" ist fort — die Stelle steht in der Überschrift');
  assert.match(html, /id="antwort-meta">Ihr Aktenzeichen: SD-1</, 'das Zeichen der Stelle, nicht „Vorgang"');
  assert.match(html, /id="antwort-person">Angaben zu Erna Mustermann, geb\. 01\.02\.1940</);
  assert.ok(html.indexOf('id="antwort-person"') < html.indexOf('id="antwort-meta"'), 'wessen Angaben steht vor der Anfrage');
});

test('[Lese-App·Kopf·Gegenprobe] ohne Namen in der Antwort sagt der Kopf nichts darüber, wessen Angaben es sind', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([VOLLMACHT]), { vorgang: 'SD-1' });
  assert.ok(!document.getElementById('app').innerHTML.includes('antwort-person'));
  const nurVorname = V.antwortAnzeigeModell(datensatz([NAME[0]]), {});
  assert.equal(JSON.stringify(nurVorname.person), JSON.stringify({ name: 'Erna', geboren: '' }));
});

test('[Lese-App·Beschriftung] beim Empfänger steht die eigene Beschriftung je Kennung, sonst die aus dem Datensatz — auch bei „fehlt"', () => {
  const { V } = ladeLesen();
  const m = V.antwortAnzeigeModell(datensatz([VOLLMACHT, FREMD]), {});
  assert.equal(m.felder[0].label, 'Bevollmächtigt');
  assert.equal(m.felder[1].label, 'Blutgruppe', 'ohne eigene Beschriftung gilt die aus dem Datensatz');
  assert.equal(m.fehlend[0].label, 'Original der Vollmacht liegt');
});

test('[Lese-App·Beschriftung] Deutsch und Englisch tragen dieselben Kennungen, keine leer', () => {
  const { V } = ladeLesen();
  const schluessel = Object.values(V.ANTWORT_BESCHRIFTUNG);
  assert.ok(schluessel.length >= 7, 'Zuordnung erreichbar');
  for (const s of schluessel) {
    assert.ok(typeof V.STRINGS[s] === 'string' && V.STRINGS[s].trim(), 'Deutsch fehlt: ' + s);
    assert.ok(typeof V.LESE_TEXTE_EN[s] === 'string' && V.LESE_TEXTE_EN[s].trim(), 'Englisch fehlt: ' + s);
  }
  for (const k of ['antwortAngabenZu', 'antwortGeboren']) assert.ok(V.LESE_TEXTE_EN[k], 'Englisch fehlt: ' + k);
});

/* Aus dem Kalt-Lesetest der Klinikaufnahme-Demo (26.09.2026): die Antwort stand hinter drei Erklärblöcken, „abgelehnt: ja" war eine
   doppelte Verneinung, und im Fokus der Demo fehlte der Vermerk, dass die Angaben von der Person stammen — sie las sich als geprüft. */
test('[Lese-App·Reihenfolge] die Angaben vor Zweck und Grundlage der Anfrage; davor steht nur die Herkunft (U2-ADR-258)', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz(NAME.concat([VOLLMACHT])), { vorgang: 'SD-1' });
  const html = document.getElementById('app').innerHTML;
  const i = (x) => { const n = html.indexOf(x); assert.ok(n >= 0, 'fehlt: ' + x); return n; };
  assert.ok(i('id="herkunft-marke"') < i('id="antwort-felder"'), 'die Herkunft vor den Angaben (U2-ADR-258)');
  assert.ok(i('id="antwort-felder"') < i('id="antwort-zweck"'), 'die Angaben vor dem Zweck der Anfrage');
  assert.ok(i('<details class="antwort-anfrage" id="antwort-anfrage">') < i('id="antwort-zweck"'), 'Zweck und Grundlage eingeklappt');
  assert.ok(i('id="antwort-grundlage"') < i('class="sheet-aktionen"'));
});

test('[Lese-App·Wert] „Notvertretung durch den Ehegatten: abgelehnt" statt „… abgelehnt: ja"; ein anderer Rohwert bleibt, wie er ist', () => {
  const { V } = ladeLesen();
  const f = (wert) => V.antwortAnzeigeModell(datensatz([{ kennung: 'advanceCare.spousalRepresentationObjection', label: 'Ich lehne … ab', wert }]), {}).felder[0];
  assert.equal(f('ja').label, 'Notvertretung durch den Ehegatten');
  assert.equal(f('ja').wert, 'abgelehnt');
  assert.equal(f('nein').wert, 'nicht abgelehnt');
  assert.equal(f('vielleicht').wert, 'vielleicht', 'Rot-Beweis: kein erfundener Wert');
  assert.equal(V.LESE_TEXTE_EN.antwortWertAbgelehnt, 'refused');
  assert.equal(V.LESE_TEXTE_EN.antwortVorgang, 'Your reference:');
});

test('[Lese-App·Fokus] im Fokus der Demo bleibt „von der Person angegeben" je Angabe und die Zählung sichtbar', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const regel = (LESEN.match(/([^{}]*vorfuehrung-fokus[^{}]*)\{\s*display:\s*none;\s*\}/g) || []).join('\n');
  assert.ok(regel.includes('.sheet-aktionen'), 'die Regel, die im Fokus ausblendet, ist gefunden');
  assert.doesNotMatch(regel, /vorfuehrung-fokus \.antwort-herkunft\b/, 'der Herkunftsvermerk wird nicht ausgeblendet');
  assert.doesNotMatch(regel, /#antwort-herkunft-zaehlung/, 'die Zählung wird nicht ausgeblendet');
  assert.match(regel, /\.weg-hint:not\(\.antwort-herkunft\)/, 'nur die übrigen Hinweise je Angabe fallen weg');
});
