'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Manifest — D2-Wächter: Abnahme, nicht Behauptung (Block D, U2-ADR-419)
   ────────────────────────────────────────────────────────────────────────
   Beantwortet Abschnitt VII Zeile 9 des Baukasten-Konzepts: „zweimal konfektioniert,
   byte-gleiches Ergebnis". Die Negativkontrolle ist die andere Hälfte davon — ein
   Manifest, das stillschweigend die „aktuelle" Fassung eines Moduls zieht statt einer
   gepinnten, ist keine Zusicherung, sondern eine Momentaufnahme (Entwurf, Punkt 3).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  kanonischesJSON, sha256Hex, achsenErlaubnisPruefen, modulAufloesen,
  konfektionierenAusManifest, manifestDiff,
} = require('../tools/lib/manifest-konfektionieren');
const { ACHSEN_ERLAUBNIS_V1 } = require('../tools/lib/manifest-achsen-erlaubnis');

/* Ein synthetischer Modul-Bestand + sein Register — steht hier für das, was eine echte
   Signier-Zeremonie später liefern würde (Entwurf, „was diese Datei nicht tut"). Der
   Registrierungs-Schlüssel ist bewusst wörtlich hier aufgebaut, nicht über eine Hilfsfunktion
   aus der geprüften Bibliothek selbst — sonst prüfte der Wächter nur sich selbst. */
function registrieren(register, bestand, typ, herkunft, moduleVersion, inhalt) {
  const schluessel = typ + '::' + herkunft + '::' + moduleVersion;
  register[schluessel] = sha256Hex(kanonischesJSON(inhalt));
  bestand[schluessel] = inhalt;
}

function beispielAufbau() {
  const modulRegister = {};
  const modulBestand = {};
  registrieren(modulRegister, modulBestand, 'bereich', 'vivodepot', 1, { id: 'gesundheit', felder: ['a', 'b'] });
  registrieren(modulRegister, modulBestand, 'rechtsraum', 'vivodepot', 1, { id: 'DE', textbausteine: ['x'] });
  registrieren(modulRegister, modulBestand, 'template', 'notarkammer-bayern', 3, { herkunft: 'notarkammer-bayern', felder: ['erbschein'] });
  const manifest = {
    manifestVersion: 1,
    manifestId: 'test-manifest-1',
    achsen: {
      bereich: { herkunft: 'vivodepot', moduleVersion: 1 },
      rechtsraum: { herkunft: 'vivodepot', moduleVersion: 1 },
    },
    templates: [{ herkunft: 'notarkammer-bayern', moduleVersion: 3 }],
  };
  return { manifest, modulBestand, modulRegister, achsenErlaubnis: ACHSEN_ERLAUBNIS_V1 };
}

test('[Manifest·D2·Positivkontrolle] zweimal konfektioniert aus demselben Manifest + Bestand — byte-gleich', () => {
  const kontext = beispielAufbau();
  const erg1 = konfektionierenAusManifest(kontext.manifest, kontext);
  const erg2 = konfektionierenAusManifest(kontext.manifest, kontext);
  assert.equal(erg1.sha256, erg2.sha256, 'zwei Läufe aus derselben Eingabe müssen denselben Hash liefern');
  assert.equal(erg1.json, erg2.json, 'auch der Roh-JSON-Text muss byte-gleich sein, nicht nur der Hash');
});

test('[Manifest·D2·Negativkontrolle] ein verändertes Modul-Byte OHNE moduleVersion-Sprung bricht den Bau ab', () => {
  const kontext = beispielAufbau();
  const erg1 = konfektionierenAusManifest(kontext.manifest, kontext);
  // Der Modul-INHALT ändert sich (ein Feld kommt dazu) — der REGISTRIERTE Hash bleibt der alte,
  // weil in der Realität niemand die moduleVersion hochgezählt und neu signiert hat. Genau der
  // Fall, den Abschnitt 3 Punkt 3 verlangt: das darf NICHT klammheimlich durchlaufen.
  kontext.modulBestand['bereich::vivodepot::1'] = { id: 'gesundheit', felder: ['a', 'b', 'HEIMLICH NEU'] };
  assert.throws(
    () => konfektionierenAusManifest(kontext.manifest, kontext),
    /Inhalt weicht vom registrierten Hash ab/,
    'eine Bestandsänderung ohne Versions-Sprung muss werfen, nicht die neue Fassung ziehen',
  );
  // Gegenprobe: der ERSTE Lauf (vor der Verfälschung) bleibt ein gültiger Beleg — der Wächter
  // wirft nur beim WIDERSPRUCH zwischen Register und Bestand, nicht grundsätzlich beim zweiten Aufruf.
  assert.ok(erg1.sha256, 'der unverfälschte erste Lauf hatte einen gültigen Hash');
});

test('[Manifest·Rot-Beweis] eine unbekannte Achse wird benannt verworfen, das ganze Manifest fällt', () => {
  const kontext = beispielAufbau();
  kontext.manifest.achsen.frei_erfunden = { herkunft: 'vivodepot', moduleVersion: 1 };
  assert.throws(
    () => konfektionierenAusManifest(kontext.manifest, kontext),
    /unbekannte Achse "frei_erfunden"/,
  );
});

test('[Manifest·Rot-Beweis] eine unregistrierte (typ,herkunft,moduleVersion)-Kombination wird abgewiesen', () => {
  const kontext = beispielAufbau();
  kontext.manifest.achsen.bereich.moduleVersion = 99;
  assert.throws(
    () => konfektionierenAusManifest(kontext.manifest, kontext),
    /steht nicht im Modul-Register/,
  );
});

test('[Manifest·Rot-Beweis] ein Manifest-Eintrag ohne herkunft/moduleVersion ist kein gültiger Zeiger', () => {
  assert.throws(() => modulAufloesen('bereich', { herkunft: 'vivodepot' }, {}, {}), /kein gültiger Manifest-Zeiger/);
  assert.throws(() => modulAufloesen('bereich', { moduleVersion: 1 }, {}, {}), /kein gültiger Manifest-Zeiger/);
});

test('[Manifest·kanonisch] Objekt-Schlüssel-Reihenfolge im Modul-Inhalt ändert den Hash nicht', () => {
  const a = { x: 1, y: { b: 2, a: 1 } };
  const b = { y: { a: 1, b: 2 }, x: 1 };
  assert.equal(kanonischesJSON(a), kanonischesJSON(b), 'inhaltsgleich, nur anders eingefügt — muss denselben kanonischen Text ergeben');
  assert.equal(sha256Hex(kanonischesJSON(a)), sha256Hex(kanonischesJSON(b)));
});

test('[Manifest·kanonisch·Gegenprobe] ein wirklich anderer Inhalt ergibt einen anderen Hash', () => {
  const a = kanonischesJSON({ x: 1 });
  const b = kanonischesJSON({ x: 2 });
  assert.notEqual(sha256Hex(a), sha256Hex(b));
});

test('[Manifest·Diff] vergleicht Achsen-Zeiger ohne die referenzierten Module zu laden', () => {
  const m1 = { achsen: { bereich: { herkunft: 'vivodepot', moduleVersion: 1 }, rechtsraum: { herkunft: 'vivodepot', moduleVersion: 1 } }, templates: [] };
  const m2 = { achsen: { bereich: { herkunft: 'vivodepot', moduleVersion: 2 }, rechtsraum: { herkunft: 'vivodepot', moduleVersion: 1 } }, templates: [] };
  const diff = manifestDiff(m1, m2);
  assert.equal(diff.length, 1, 'nur die geänderte Achse taucht auf');
  assert.equal(diff[0].achse, 'bereich');
  assert.equal(diff[0].von.moduleVersion, 1);
  assert.equal(diff[0].nach.moduleVersion, 2);
});

test('[Manifest·Diff·Gegenprobe] zwei identische Manifeste ergeben einen leeren Diff', () => {
  const kontext = beispielAufbau();
  const diff = manifestDiff(kontext.manifest, JSON.parse(JSON.stringify(kontext.manifest)));
  assert.deepEqual(diff, []);
});

test('[Manifest·Diff] eine neu hinzugekommene Achse taucht im Diff auf', () => {
  const m1 = { achsen: { bereich: { herkunft: 'vivodepot', moduleVersion: 1 } } };
  const m2 = { achsen: { bereich: { herkunft: 'vivodepot', moduleVersion: 1 }, rechtsraum: { herkunft: 'vivodepot', moduleVersion: 1 } } };
  const diff = manifestDiff(m1, m2);
  assert.equal(diff.length, 1);
  assert.equal(diff[0].achse, 'rechtsraum');
  assert.equal(diff[0].von, null);
});

test('[Manifest·achsenErlaubnisPruefen] direkt aufgerufen, unabhängig von konfektionierenAusManifest', () => {
  assert.doesNotThrow(() => achsenErlaubnisPruefen({ achsen: { bereich: {} } }, ACHSEN_ERLAUBNIS_V1));
  assert.throws(() => achsenErlaubnisPruefen({ achsen: { unbekannt: {} } }, ACHSEN_ERLAUBNIS_V1), /unbekannte Achse/);
});
