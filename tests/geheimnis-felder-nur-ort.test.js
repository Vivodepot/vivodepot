'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Wächter: Felder zu Geheimnissen nennen nur den Ort (Befund 01.11.2026, HOCH)
   ───────────────────────────────────────────────────────────────────────────
   Der Befund: das ⓘ am Feld „Seed-Phrase — Ablageort“ nannte nur Beispiele für Orte
   („Zum Beispiel: Tresor, …“) und sagte nicht, dass die Wörter selbst nicht hineingehören.
   Das Depot speichert zu Seed-Phrasen, Wiederherstellungscodes, zweitem Faktor, PINs,
   Passwörtern und Codes nie den Wert, nur wo er liegt.

   DIE KLASSE: jedes Feld, dessen Beschriftung ein solches Geheimnis nennt, in Deutsch und
   Englisch, auch künftige Felder (zweiter Faktor, Wiederherstellungsschlüssel):
   (1) die Beschriftung sagt „Ablageort“/„Ort“ bzw. „storage location“/„location“;
   (2) das ⓘ fragt nach dem Ort („wo“, „Ablageort“ / „where“, „kept“);
   (3) kein ⓘ fordert dazu auf, den Wert einzutragen (auch im Infinitiv: „hier eintragen“), es sei
       denn, derselbe Satz verneint es; „nur“ zählt nicht als Verneinung („Tragen Sie nur die PIN ein“);
   (4) bei Seed-Phrase, Passphrase, Wiederherstellung, zweitem Faktor und Schlüsseldatei sagt das ⓘ
       ausdrücklich, dass der Wert selbst nicht hineingehört; das „nie“ muss am Wert hängen
       („nie die Wörter selbst“), ein „Gerät nie verleihen“ reicht nicht.
   Gruppenüberschriften (feldgruppe.*) sind keine Felder und fallen nicht darunter.
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const lade = (datei) => JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', datei), 'utf8')).texte;

const GEHEIMNIS_DE = /(Seed|\bPIN\b|-PIN\b|\bPUK\b|-PUK\b|Passwort(?!-Manager\b)|Passwörter|Passphrase|Zugangscode|\bCode\b|-Code\b|Wiederherstellung|Recovery|[Zz]weite[rn]? Faktor|[Pp]rivate[rn]? Schlüssel|Schlüsseldatei|Sicherheitsfrage|Sicherheitsantwort|\bTAN\b|Kennwort)/;
const HOECHSTES_RISIKO = /(Seed|Passphrase|Wiederherstellung|Recovery|[Zz]weite[rn]? Faktor|[Pp]rivate[rn]? Schlüssel|Schlüsseldatei)/;

const SPRACHE = {
  de: {
    ortImLabel: /Ablageort|\bOrt\b/,
    ortImHinweis: /\b[Ww]o\b|Ablageort|\bOrt\b|aufbewahrt|hinterlegt|aufgeschrieben/,
    aufforderung: /\b(tragen|geben|notieren|schreiben|fügen) Sie\b[^.]*\b(ein|an|auf)\b|\b(eintragen|eingeben|einfügen|notieren|aufschreiben)\b/i,
    verneinung: /\b(nie|niemals|nicht|kein|keine)\b/i,
    selbstVerneint: /\b(nie|niemals)\b[^.]*\b(Wörter|Wort|Wert|Code|PIN|Passwort|Phrase|Passphrase|Schlüssel|selbst)\b|\bnicht\b[^.]*\bselbst\b/i,
  },
  en: {
    ortImLabel: /storage location|\blocation\b/i,
    ortImHinweis: /\bwhere\b|\blocation\b|\bkept\b|\bstored\b|written down/i,
    aufforderung: /\b(enter|type|write|paste|add|input|note)\b[^.]*\b(seed|phrase|passphrase|code|pin|puk|password|words|answer|key)\b/i,
    verneinung: /\b(never|not|no)\b/i,
    selbstVerneint: /\bnever\b[^.]*\b(words?|value|code|pin|password|phrase|passphrase|key|itself|themselves)\b|\bnot\b[^.]*\b(itself|themselves)\b/i,
  },
};

/* Liefert die Geheimnis-Felder: Kennungsstamm → { label, hint } je Sprache. Die Klasse wird am
   deutschen Label erkannt; das englische Feld gehört über dieselbe Kennung dazu. */
function geheimnisFelder(de, en) {
  const felder = [];
  for (const [k, v] of Object.entries(de)) {
    if (!k.endsWith('.label') || k.startsWith('feldgruppe.')) continue;
    if (!GEHEIMNIS_DE.test(String(v))) continue;
    const stamm = k.slice(0, -'.label'.length);
    felder.push({
      stamm,
      risiko: HOECHSTES_RISIKO.test(String(v)),
      de: { label: v, hint: de[stamm + '.hint'] },
      en: { label: en[stamm + '.label'], hint: en[stamm + '.hint'] },
    });
  }
  return felder;
}

function verstoesse(felder) {
  const raus = [];
  for (const f of felder) {
    for (const [lang, r] of Object.entries(SPRACHE)) {
      const { label, hint } = f[lang];
      if (label === undefined) { raus.push(`${f.stamm} [${lang}]: Beschriftung fehlt`); continue; }
      if (!r.ortImLabel.test(label)) raus.push(`${f.stamm} [${lang}]: Beschriftung nennt den Ort nicht: „${label}“`);
      if (hint === undefined) { if (f.risiko) raus.push(`${f.stamm} [${lang}]: ⓘ fehlt`); continue; }
      if (!r.ortImHinweis.test(hint)) raus.push(`${f.stamm} [${lang}]: ⓘ fragt nicht nach dem Ort: „${hint}“`);
      for (const satz of String(hint).split(/(?<=[.!?])\s+/)) {
        if (r.aufforderung.test(satz) && !r.verneinung.test(satz)) raus.push(`${f.stamm} [${lang}]: ⓘ fordert zur Eingabe auf: „${satz}“`);
      }
      if (f.risiko && !r.selbstVerneint.test(hint)) raus.push(`${f.stamm} [${lang}]: ⓘ sagt nicht, dass der Wert selbst nicht hineingehört: „${hint}“`);
    }
  }
  return raus;
}

for (const [de, en] of [['textsatz-de-modul.json', 'textsatz-en-modul.json'], ['textsatz-de-pro-modul.json', 'textsatz-en-pro-modul.json']]) {
  test(`Geheimnis-Felder nennen nur den Ort (${de} / ${en})`, () => {
    const felder = geheimnisFelder(lade(de), lade(en));
    assert.ok(felder.length >= 7, `die Klasse ist zu klein (${felder.length}); erkennt GEHEIMNIS_DE die Felder noch?`);
    assert.deepEqual(verstoesse(felder), []);
  });
}

test('Seed-Phrase: das ⓘ sagt „nie die Wörter selbst“ (Befund 01.11.2026)', () => {
  for (const datei of ['textsatz-de-modul.json', 'textsatz-de-pro-modul.json']) {
    assert.match(lade(datei)['administration.seedPhraseStorageLocation.hint'], /Nie die Wörter selbst/, datei);
  }
  for (const datei of ['textsatz-en-modul.json', 'textsatz-en-pro-modul.json']) {
    assert.match(lade(datei)['administration.seedPhraseStorageLocation.hint'], /Never the words themselves/, datei);
  }
});

test('Rot-Beweis: der Wächter fällt auf alle vier Regeln', () => {
  const de = {
    'a.seed.label': 'Seed-Phrase', 'a.seed.hint': 'Zum Beispiel: Tresor.',
    'a.pin.label': 'Smartphone-PIN (Ablageort)', 'a.pin.hint': 'Tragen Sie hier die PIN ein.',
    'a.zweit.label': 'Zweiter Faktor — Ablageort', 'a.zweit.hint': 'Wo liegt das Gerät?',
    'feldgruppe.x.label': 'Passwörter & Zugangscodes',
  };
  const en = {
    'a.seed.label': 'Seed phrase', 'a.seed.hint': 'For example: a safe.',
    'a.pin.label': 'Smartphone PIN (storage location)', 'a.pin.hint': 'Enter the PIN here.',
    'a.zweit.label': 'Second factor — storage location', 'a.zweit.hint': 'Where is the device kept?',
  };
  const felder = geheimnisFelder(de, en);
  assert.equal(felder.length, 3, 'Gruppenüberschrift zählt nicht');
  const v = verstoesse(felder).join('\n');
  assert.match(v, /a\.seed \[de\]: Beschriftung nennt den Ort nicht/);
  assert.match(v, /a\.seed \[de\]: ⓘ fragt nicht nach dem Ort/);
  assert.match(v, /a\.pin \[de\]: ⓘ fordert zur Eingabe auf/);
  assert.match(v, /a\.pin \[en\]: ⓘ fordert zur Eingabe auf/);
  assert.match(v, /a\.zweit \[de\]: ⓘ sagt nicht, dass der Wert selbst nicht hineingehört/);
  assert.match(v, /a\.zweit \[en\]: ⓘ sagt nicht, dass der Wert selbst nicht hineingehört/);
});

test('Rot-Beweis: die Lücken aus der Gegenlesung vom 01.11.2026 sind geschlossen', () => {
  const de = {
    'b.pin.label': 'Smartphone-PIN (Ablageort)', 'b.pin.hint': 'Wo liegt sie? Tragen Sie nur die PIN ein.',
    'b.wh.label': 'Wiederherstellungscode — Ablageort', 'b.wh.hint': 'Wo liegt das Gerät? Das Gerät nie verleihen.',
    'b.inf.label': 'Tresor-Code — Ablageort', 'b.inf.hint': 'Wo liegt er? Code hier eintragen.',
    'b.puk.label': 'SIM-PUK',
    'b.pass.label': 'Passphrase — Ablageort', 'b.pass.hint': 'Wo ist sie notiert?',
    'b.frage.label': 'Sicherheitsfrage',
    'b.datei.label': 'Schlüsseldatei — Ablageort',
  };
  const en = {
    'b.pin.label': 'Smartphone PIN (storage location)', 'b.pin.hint': 'Where is it kept? Only enter the PIN.',
    'b.wh.label': 'Recovery code — storage location', 'b.wh.hint': 'Where is the device kept? Never lend the device.',
    'b.inf.label': 'Safe code — storage location', 'b.inf.hint': 'Where is it kept? Paste your code here.',
    'b.pass.label': 'Passphrase — storage location', 'b.pass.hint': 'Where is it written down?',
  };
  const felder = geheimnisFelder(de, en);
  assert.deepEqual(felder.map((f) => f.stamm).sort(), ['b.datei', 'b.frage', 'b.inf', 'b.pass', 'b.pin', 'b.puk', 'b.wh'],
    'PUK, Passphrase, Sicherheitsfrage und Schlüsseldatei gehören zur Klasse');
  const v = verstoesse(felder).join('\n');
  assert.match(v, /b\.pin \[de\]: ⓘ fordert zur Eingabe auf/, '„nur“ ist keine Verneinung');
  assert.match(v, /b\.pin \[en\]: ⓘ fordert zur Eingabe auf/, '„only“ ist keine Verneinung');
  assert.match(v, /b\.wh \[de\]: ⓘ sagt nicht, dass der Wert selbst nicht hineingehört/, '„Gerät nie verleihen“ reicht nicht');
  assert.match(v, /b\.wh \[en\]: ⓘ sagt nicht, dass der Wert selbst nicht hineingehört/, '„never lend the device“ reicht nicht');
  assert.match(v, /b\.inf \[de\]: ⓘ fordert zur Eingabe auf/, 'der Infinitiv „hier eintragen“ zählt');
  assert.match(v, /b\.inf \[en\]: ⓘ fordert zur Eingabe auf/, '„paste your …“ zählt');
  assert.match(v, /b\.puk \[de\]: Beschriftung nennt den Ort nicht/);
  assert.match(v, /b\.pass \[de\]: ⓘ sagt nicht, dass der Wert selbst nicht hineingehört/, 'Passphrase ist höchstes Risiko');
  assert.match(v, /b\.frage \[de\]: Beschriftung nennt den Ort nicht/);
  assert.match(v, /b\.datei \[de\]: ⓘ fehlt/, 'Schlüsseldatei ist höchstes Risiko');
});
