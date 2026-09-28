'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Abschrift im Register hinterlegt": drei Felder vor dem Einfrieren

   ANLASS: die angekündigte Möglichkeit, im Zentralen Vorsorgeregister nicht
   nur den Hinweis, sondern eine elektronische Abschrift zu hinterlegen.
   Stand 27.09.2026: im Volltext der Vorsorgeregister-Verordnung und von
   §§ 78a/78b BNotO nicht geregelt (die Mitteilung der Bundesnotarkammer
   beschreibt Entwürfe). Der Hinweis macht darum keine Rechtsaussage, s. unten.

   Damit ist „ich habe eingetragen" (`zvr_nummer`) nicht mehr dasselbe wie
   „dort liegt mein Text". Hinterlegen dürfen NUR institutionelle Nutzer —
   Betreuungsbehörden, Betreuungsvereine, Anwältinnen, Notare. Die Bürgerin
   selbst kann es nicht. Das Feld hält darum fest, ob es jemand FÜR sie
   getan hat, wann, und wer — dieselbe Sorte Feld wie `bankvollmacht`.
   (Wer hinterlegen darf, steht bisher nur in der Ankündigung, nicht in der Verordnung.)

   WARUM VOR DEM EINFRIEREN, und das ist der eigentliche Grund für diese
   Datei: ein Modul ERFINDET KEIN FELD (Abweisung `grund: 'feld-unbekannt'`).
   Ein Bereichsmodul kann Felder nur über `bereichsErsatz` bringen, und das
   TAUSCHT den ganzen Bereich aus (U2-ADR-348). Nach dem Einfrieren müsste
   also der ganze Vorsorge-Bereich ersetzt werden, um drei Felder zu
   ergänzen.

   DREI DOKUMENTTYPEN, NICHT EINER. `zvr_nummer` hängt allein an der
   Vorsorgevollmacht — eine Registrierung, eine Nummer. Die ABSCHRIFT
   dagegen nimmt das Register für drei Typen: Vorsorgevollmacht,
   Betreuungsverfügung, Patientenverfügung. Wer nur eine Patientenverfügung
   hat, muss sie eintragen können. Die Sichtbarkeit ist darum weiter als
   die der Nummer — gemessen an der Grenze, die das Register selbst zieht,
   nicht großzügig geschätzt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const DREI_TYPEN = ['enduring-power-of-attorney', 'custodianship-declaration', 'living-will'];

function unterFelder() {
  // Seit dem Schnitt liefert bereicheAlle() denselben Bestand, den BUERGERMODUL_BUENDEL
  // (jetzt null) früher trug — dieselbe Quelle wie in tools/vd-privat-struktur-bundle-erzeugen.js.
  const { V } = ladeKern();
  const bereich = V.bereicheAlle().find((b) => b.id === 'advanceCare');
  for (const sek of bereich.sektionen) {
    for (const f of sek.felder) if (f.id === 'provisionInstruments') return f.unterFelder;
  }
  throw new Error('vorsorge_instrumente nicht gefunden — Testaufbau kaputt, nicht das Produkt');
}
function feld(id) {
  const u = unterFelder().find((x) => x.id === id);
  assert.ok(u, 'Feld ' + id + ' fehlt im Bündel');
  return u;
}

test('[ZVR-Abschrift] die drei Felder stehen im Bürgermodul, mit ihren Typen', () => {
  assert.equal(feld('copyDepositedInTheRegister').typ, 'auswahl');
  assert.equal(feld('copyDepositedOn').typ, 'datum');
  assert.equal(feld('depositedBy').typ, 'ref');
  assert.equal(feld('depositedBy').entitaet, 'institution',
    'hinterlegt hat eine STELLE, keine Privatperson — nur institutionelle Nutzer dürfen es');
});

test('[ZVR-Abschrift] alle drei sind als sensibel geführt', () => {
  for (const id of ['copyDepositedInTheRegister', 'copyDepositedOn', 'depositedBy']) {
    assert.equal(feld(id).sensibel, true, id + ' muss sensibel sein wie zvr_nummer daneben');
  }
});

test('[ZVR-Abschrift] die Abschrift gilt für DREI Dokumenttypen, die Nummer für einen', () => {
  const sicht = feld('copyDepositedInTheRegister').sichtbarWenn;
  assert.equal(sicht.feld, 'instrument');
  assert.deepEqual([...sicht.wert].sort(), [...DREI_TYPEN].sort(),
    'genau die drei Typen, die das Register ab 01.10.2026 als Abschrift nimmt');
  assert.equal(feld('centralRegisterOfPowersOf').sichtbarWenn.wert, 'enduring-power-of-attorney',
    'die Eintragungsnummer bleibt bei der Vollmacht — eine Registrierung, eine Nummer');
});

test('[ZVR-Abschrift] Datum und Stelle hängen an der Antwort, nicht am Dokumenttyp', () => {
  for (const id of ['copyDepositedOn', 'depositedBy']) {
    assert.deepEqual(feld(id).sichtbarWenn, { feld: 'copyDepositedInTheRegister', wert: 'ja' },
      id + ' darf nur erscheinen, wenn wirklich hinterlegt wurde — sonst fragt das Blatt ins Leere');
  }
});

test('[ZVR-Abschrift·Rot-Beweis] ohne das sichtbarWenn-Gate stünde Datum/Stelle ungefragt auf dem Blatt', () => {
  // A348 Zug 4: eine Struktur-Zusicherung ohne Rot-Beweis ist eine Zusage, keine Messung —
  // dieselbe Lehre wie A336/A338/A345. Der obige Test prüft nur, DASS das Gate steht; dieser
  // beweist, dass sein Fehlen tatsächlich etwas ändert (V.feldSichtbar entscheidet real).
  const V = ladeKern().V;
  const datumFeld = feld('copyDepositedOn');
  const antwortNein = { instrument: 'enduring-power-of-attorney', copyDepositedInTheRegister: 'nein' };
  assert.equal(V.feldSichtbar(datumFeld, antwortNein), false,
    'Voraussetzung: MIT dem echten Gate bleibt das Feld bei "nein" verborgen');
  const ohneGate = { ...datumFeld, sichtbarWenn: undefined };
  assert.equal(V.feldSichtbar(ohneGate, antwortNein), true,
    'mutiert: OHNE das Gate wäre dasselbe Feld bei "nein" sichtbar — das Gate ist es, was verbirgt, nicht Zufall');
});

test('[ZVR-Abschrift] ja/nein, keine dritte Antwort', () => {
  assert.deepEqual(feld('copyDepositedInTheRegister').optionen.map((o) => o.wert), ['ja', 'nein']);
});

test('[ZVR-Abschrift] jedes Feld trägt deutschen Text, keine rohe Kennung', () => {
  const V = ladeKern().V;
  for (const k of ['copyDepositedInTheRegister.label', 'copyDepositedInTheRegister.hint', 'copyDepositedOn.label',
    'depositedBy.label', 'depositedBy.hint',
    'copyDepositedInTheRegister/ja.label', 'copyDepositedInTheRegister/nein.label']) {
    const t = V.textLesen('advanceCare.provisionInstruments/' + k);
    assert.ok(typeof t === 'string' && t.trim() && t !== k, 'ohne Text für ' + k + ' steht die rohe Kennung am Bildschirm');
  }
});

test('[ZVR-Abschrift] derselbe Satz existiert auf Englisch — sonst ist das EN-Produkt lückenhaft', () => {
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const texte = en.texte || en;
  for (const k of ['copyDepositedInTheRegister.label', 'copyDepositedInTheRegister.hint', 'copyDepositedOn.label',
    'depositedBy.label', 'depositedBy.hint',
    'copyDepositedInTheRegister/ja.label', 'copyDepositedInTheRegister/nein.label']) {
    const voll = 'advanceCare.provisionInstruments/' + k;
    assert.ok(texte[voll] && String(texte[voll]).trim(), 'EN fehlt: ' + voll);
  }
});

/* Der Hinweis trägt keine Rechts- und keine Zukunftsaussage (27.09.2026). Bis dahin behauptete er, ab bzw. „seit dem“
   01.10.2026 könne das Register den Text selbst halten und behandelnde Ärztinnen könnten ihn lesen. Nach dem Volltext der
   Vorsorgeregister-Verordnung (Fassung vom 27.09.2026) und von §§ 78a/78b BNotO ist das nicht geregelt; die
   Mitteilung der Bundesnotarkammer beschreibt Entwürfe. Der Hinweis fragt jetzt nur, ob eine Stelle eine Abschrift
   hinterlegt hat. Ein genauerer Satz kommt, sobald die Regelung belegt ist. */
const UNBELEGT = [/Ärztin|Arzt|doctor/i, /seit dem|since/i, /ab dem 01\.10\.2026|from 1 October 2026|01\.10\.2026|1 October 2026/i];

test('[ZVR-Abschrift·Wächter] der Hinweis behauptet keine Regelung, die nicht belegt ist — DE und EN', () => {
  const V = ladeKern().V;
  const de = String(V.textLesen('advanceCare.provisionInstruments/copyDepositedInTheRegister.hint') || '');
  const enModul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const en = String((enModul.texte || enModul)['advanceCare.provisionInstruments/copyDepositedInTheRegister.hint'] || '');
  for (const [wo, h] of [['DE', de], ['EN', en]]) {
    assert.ok(h.trim(), 'Vorbedingung: ' + wo + '-Hinweis vorhanden');
    for (const r of UNBELEGT) assert.doesNotMatch(h, r, wo + ': unbelegte Aussage im Hinweis: ' + r);
  }
  assert.match(de, /hinterlegt/, 'der Hinweis fragt, ob eine Stelle hinterlegt hat');
});

test('[ZVR-Abschrift·Wächter·Rot-Beweis] der ausgelieferte Hinweis bis v811 fällt', () => {
  const alt = 'Seit dem 01.10.2026 kann im Zentralen Vorsorgeregister nicht nur der Hinweis stehen, sondern der Text selbst — behandelnde Ärztinnen können ihn dann lesen.';
  const altEn = 'Since 1 October 2026 the Central Register of Lasting Powers of Attorney can hold the text itself, not just a pointer to it — treating doctors can then read it.';
  for (const h of [alt, altEn]) assert.ok(UNBELEGT.filter((r) => r.test(h)).length >= 2, 'Rot-Beweis: ' + h);
  assert.ok(UNBELEGT.some((r) => r.test('Ab dem 01.10.2026 kann im Zentralen Vorsorgeregister der Text selbst stehen.')), 'auch die Fassung mit „ab“ fällt');
});
