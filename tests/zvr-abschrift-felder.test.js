'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Abschrift im Register hinterlegt": drei Felder vor dem Einfrieren
   @rechtslage zvr-elektronische-abschrift

   ANLASS: im Zentralen Vorsorgeregister kann seit 01.10.2026 zur Registrierung
   auch eine elektronische Abschrift der Vorsorgeverfügung liegen.
   RECHTSLAGE (am BGBl.-Text geprüft, Stand 03.10.2026):
   - § 78a Abs. 2 Satz 2 BNotO i. d. F. von Art. 3 des Gesetzes vom 16.07.2026,
     BGBl. 2026 I Nr. 212 (in Kraft 01.10.2026): die Abschrift „darf auch“
     aufgenommen werden.
   - VRegV i. d. F. der Ersten Änderungsverordnung vom 17.08.2026, BGBl. 2026 I
     Nr. 238 (in Kraft 01.10.2026): § 1 Abs. 5 (auf Antrag, PDF/A oder TIFF),
     § 2 Abs. 1 und § 3 Abs. 2 (Antrag nur durch institutionelle Nutzer),
     § 5 Abs. 3 (Zugriff), § 3 Abs. 4 Satz 3.
   - § 78b Abs. 1 BNotO: Auskunft an Gerichte, an Ärzte nur für eine dringende
     medizinische Behandlung.
   Der Hinweis nennt genau das, s. den Wächter unten.

   Damit ist „ich habe eingetragen" (`zvr_nummer`) nicht mehr dasselbe wie
   „dort liegt mein Text". Hinterlegen dürfen NUR institutionelle Nutzer —
   Betreuungsbehörden, Betreuungsvereine, Anwältinnen, Notare. Die Bürgerin
   selbst kann es nicht. Das Feld hält darum fest, ob es jemand FÜR sie
   getan hat, wann, und wer — dieselbe Sorte Feld wie `bankvollmacht`.
   (Wer hinterlegen darf: § 3 Abs. 2 i. V. m. § 2 Abs. 1 VRegV; Notare bedürfen keiner Zulassung.)

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

/* Der Hinweis nennt die Rechtslage (03.10.2026), Fundstellen im Kopf dieser Datei.
   Vorgeschichte: bis v811 behauptete er, „seit dem 01.10.2026“ könne das Register den Text halten und
   „behandelnde Ärztinnen“ könnten ihn lesen; § 78b Abs. 1 BNotO lässt Ärzte aber nur für eine dringende
   Behandlung zu. Am 27.09.2026 galt die Regelung als nicht belegt, weil der konsolidierte Volltext
   (gesetze-im-internet.de) sie noch nicht zeigte; beide Änderungsakte standen da schon im BGBl.
   (22.07. und 25.08.2026) und traten am 01.10.2026 in Kraft. Eine konsolidierte Fassung belegt kein
   Fehlen, solange ein verkündeter Änderungsakt noch nicht in Kraft ist.

   Der Wächter verlangt, was belegt ist, und verbietet, was es nicht ist:
   PFLICHT — Notariat und zugelassene Stelle (§ 2 Abs. 1, § 3 Abs. 2 VRegV), nicht die Person selbst,
     Ärzte nur bei dringender Behandlung (§ 78b Abs. 1 BNotO) und der Satz, dass das Register die
     Gültigkeit nicht zeigt (§ 3 Abs. 4 Satz 3 VRegV). Das Format (PDF/A oder TIFF, § 1 Abs. 5 VRegV) nennt
     der Hinweis nicht: „PDF/A“ ist ein geschützter Standardname (tests/standardnamen-schutz.test.js).
   VERBOT — eine Zeitbindung, Ärztin/Arzt/doctor ohne „dringend“/„urgent“ im selben Satz, eine positive
     Gültigkeitsaussage („zeigt“/„shows“ mit „gilt“/„gültig“/„valid“ ohne „nicht“/„not“ im selben Satz)
     und das Notariat als zugelassene Stelle (Notare bedürfen keiner Zulassung). */
const PFLICHT = {
  DE: [/Notariat/, /zugelassene Stelle/, /nicht Sie selbst/, /dringende Behandlung/, /zeigt das Register nicht/],
  EN: [/notary/, /approved/, /not you yourself/, /urgent treatment/, /does not show whether/],
};
const ZEITBINDUNG = /seit dem|ab dem|\bsince\b|from 1 October/i;
const NOTARIAT_ALS_ZUGELASSEN = /zugelassene Stelle wie ein Notariat|approved body such as a notary/i;

function saetze(text) {
  return String(text).split(/(?<=[.?!])\s+/).filter((x) => x.trim());
}

/* Liefert die Verstöße eines Hinweises als Liste von Kennworten; leer heißt: trägt. */
function verstoesse(text, sprache) {
  const h = String(text || '');
  const v = [];
  for (const r of PFLICHT[sprache]) if (!r.test(h)) v.push('pflicht:' + r.source);
  if (ZEITBINDUNG.test(h)) v.push('zeitbindung');
  if (NOTARIAT_ALS_ZUGELASSEN.test(h)) v.push('notariat-als-zugelassen');
  for (const s of saetze(h)) {
    if (/Ärzt|Arzt|doctor/i.test(s) && !/dringend|urgent/i.test(s)) v.push('arzt-ohne-dringend');
    if (/zeigt|\bshows?\b/i.test(s) && /gilt|gültig|valid/i.test(s) && !/\bnicht\b|\bnot\b/i.test(s)) v.push('gueltigkeit-positiv');
  }
  return v;
}

function hinweiseImProdukt() {
  const V = ladeKern().V;
  const de = String(V.textLesen('advanceCare.provisionInstruments/copyDepositedInTheRegister.hint') || '');
  const enModul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const en = String((enModul.texte || enModul)['advanceCare.provisionInstruments/copyDepositedInTheRegister.hint'] || '');
  return { DE: de, EN: en };
}

test('[ZVR-Abschrift·Wächter] der Hinweis nennt die Rechtslage und nichts Unbelegtes — DE und EN', () => {
  const h = hinweiseImProdukt();
  for (const sprache of ['DE', 'EN']) {
    assert.ok(h[sprache].trim(), 'Vorbedingung: ' + sprache + '-Hinweis vorhanden');
    assert.deepEqual(verstoesse(h[sprache], sprache), [], sprache + '-Hinweis: ' + h[sprache]);
  }
});

const BIS_V811 = {
  DE: 'Seit dem 01.10.2026 kann im Zentralen Vorsorgeregister nicht nur der Hinweis stehen, sondern der Text selbst — behandelnde Ärztinnen können ihn dann lesen.',
  EN: 'Since 1 October 2026 the Central Register of Lasting Powers of Attorney can hold the text itself, not just a pointer to it — treating doctors can then read it.',
};
const VOM_28_09 = {
  DE: 'Hat eine Stelle, etwa ein Notariat, eine Anwaltskanzlei oder ein Betreuungsverein, eine elektronische Abschrift Ihrer Vorsorgedokumente beim Zentralen Vorsorgeregister hinterlegt? Dann tragen Sie es hier ein.',
  EN: 'Has an office such as a notary, a law firm or a care association deposited an electronic copy of your advance directives with the Central Register of Lasting Powers of Attorney? If so, note it here.',
};
const ERSTE_FASSUNG_03_10 = {
  DE: 'Das Zentrale Vorsorgeregister kann zu Ihrer Registrierung auch eine elektronische Abschrift Ihrer Vorsorgevollmacht, Betreuungsverfügung oder Patientenverfügung aufnehmen, als PDF/A- oder TIFF-Datei. Einreichen kann sie nur eine zugelassene Stelle wie ein Notariat, eine Anwaltskanzlei, ein Betreuungsverein oder eine Betreuungsbehörde, nicht Sie selbst. Abrufen können sie Gerichte sowie Ärztinnen und Ärzte, die über eine dringende Behandlung entscheiden müssen. Hat eine Stelle eine Abschrift für Sie hinterlegt? Dann tragen Sie es hier ein.',
  EN: 'The Central Register of Lasting Powers of Attorney can also hold an electronic copy of your power of attorney (advance care), care directive or advance directive alongside your registration, as a PDF/A or TIFF file. Only an approved body such as a notary\'s office, a law firm, a care association or a care authority can submit it, not you yourself. Courts can retrieve it, and so can doctors who have to decide on urgent treatment. Has a body deposited a copy for you? If so, note it here.',
};

test('[ZVR-Abschrift·Wächter·Rot-Beweis] der ausgelieferte Hinweis bis v811 fällt: Zeitbindung, Ärzte ohne „dringend“', () => {
  for (const sprache of ['DE', 'EN']) {
    const v = verstoesse(BIS_V811[sprache], sprache);
    assert.ok(v.includes('zeitbindung'), sprache + ': ' + v.join(', '));
    assert.ok(v.includes('arzt-ohne-dringend'), sprache + ': ' + v.join(', '));
  }
});

test('[ZVR-Abschrift·Wächter·Rot-Beweis] der Hinweis vom 28.09.2026 fällt: ohne Ausschluss der Person, Ärzte-Einschränkung und Gültigkeitssatz', () => {
  for (const sprache of ['DE', 'EN']) {
    const v = verstoesse(VOM_28_09[sprache], sprache);
    for (const r of [PFLICHT[sprache][2], PFLICHT[sprache][3], PFLICHT[sprache][4]]) { // Ausschluss, dringend, Gültigkeit
      assert.ok(v.includes('pflicht:' + r.source), sprache + ' müsste an ' + r.source + ' fallen: ' + v.join(', '));
    }
  }
});

test('[ZVR-Abschrift·Wächter·Rot-Beweis] die erste Fassung vom 03.10.2026 fällt: ohne Gültigkeitssatz, Notariat als zugelassene Stelle', () => {
  for (const sprache of ['DE', 'EN']) {
    const v = verstoesse(ERSTE_FASSUNG_03_10[sprache], sprache);
    assert.ok(v.includes('pflicht:' + PFLICHT[sprache][4].source), sprache + ': ' + v.join(', '));
    assert.ok(v.includes('notariat-als-zugelassen'), sprache + ': ' + v.join(', '));
  }
});

test('[ZVR-Abschrift·Wächter·Rot-Beweis] ein Satz, das Register zeige die Gültigkeit, fällt', () => {
  const h = hinweiseImProdukt();
  const zusatz = { DE: ' Das Register zeigt, ob die Vollmacht gilt.', EN: ' The register shows whether the power of attorney is valid.' };
  for (const sprache of ['DE', 'EN']) {
    assert.deepEqual(verstoesse(h[sprache], sprache), [], 'Vorbedingung: der Hinweis selbst trägt');
    assert.deepEqual(verstoesse(h[sprache] + zusatz[sprache], sprache), ['gueltigkeit-positiv'], sprache);
  }
});
