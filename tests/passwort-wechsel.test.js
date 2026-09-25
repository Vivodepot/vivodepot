'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test (Klasse A) — U2-ADR-095: Passwort-Wechsel + Notfall-Blatt
   ────────────────────────────────────────────────────────────────────────
   Prüfgegenstand ist der WECHSEL-PFAD, nicht der Krypto-Block: kryptoVersion,
   AAD-Konstanten und Iterationszahl bleiben unverändert, gewechselt werden die
   beiden Salts. Gemessen wird an der TATSÄCHLICH GESCHRIEBENEN DATEI — der Blob,
   den `_depotBlobSpeichern` in das (gefälschte) File-System-Access-Handle legt.
   Ein Test, der nur den RAM-Zustand prüft, würde den Punkt verfehlen: die Frage
   ist, womit sich die Datei danach öffnen lässt.

   ABGRENZUNG (Regel „Node-grün ≠ am-Gerät-bewiesen"): Diese Suite kann NICHT
   zeigen, ob die Plattform die alte Datei ersetzt oder eine zweite daneben legt.
   Genau das ist der Punkt, den der Abschluss-Bildschirm anspricht und den nur der
   Gerätecheck beantwortet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const PW_ALT = 'altes-passwort-12345';     // ASCII → NFC===roh → genau eine Ableitung je Schritt
const PW_NEU = 'neues-passwort-67890';

// Kern mit gefälschtem FSA-Picker: jeder Save landet als Text in `geschrieben`.
// Das ist der Chromium-In-place-Pfad; der Nicht-FSA-Pfad ist plattformgebunden
// und im Node-Kontext nicht ehrlich messbar.
function kernMitDatei(pickerFehler) {
  const geschrieben = [];
  function FakeBlob(teile) { this._text = String((teile && teile[0]) || ''); }
  const handle = {
    name: 'test.vivodepot',
    createWritable: async () => ({
      write: async (b) => { geschrieben.push(b._text); },
      close: async () => {},
    }),
  };
  const k = ladeKern({
    Blob: FakeBlob,
    showSaveFilePicker: async () => {
      if (pickerFehler) { const e = new Error('abgebrochen'); e.name = 'AbortError'; throw e; }
      return handle;
    },
  });
  return { V: k.V, geschrieben };
}

// Die geschriebene Datei → Umschlag (Magic-Bytes-Präfix abstreifen).
function umschlagAusDatei(text) {
  const MAGIC = 'VIVODEPOT';
  const json = text.startsWith(MAGIC) ? text.slice(MAGIC.length + 1) : text;
  return JSON.parse(json);
}

async function depotMitInhalt(V) {
  await V.depotAnlegen(PW_ALT);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  return V;
}

test('[Klasse-A][ADR-095] Roundtrip: die neue Datei öffnet mit dem neuen Passwort, Inhalt unverändert', async () => {
  const { V, geschrieben } = kernMitDatei();
  await depotMitInhalt(V);
  const ergebnis = await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  assert.equal(ergebnis, 'gewechselt');
  assert.equal(geschrieben.length, 1, 'genau eine Datei geschrieben');

  const u = umschlagAusDatei(geschrieben[0]);
  /* 19.08.2026 (A345): der Schreibweg steht auf Generation 4. Was diese Zusicherung
     bewacht, ist unverändert — ein PASSWORT-Wechsel migriert keine Version; er
     schreibt in derselben Form, in der der Kern ohnehin schreibt. Darum gegen
     `CRYPTO_VERSION_ZERFALL` statt gegen eine Literalzahl: die Zusicherung soll beim
     nächsten Generationswechsel klemmen, wo sie es soll, und nicht hier. */
  assert.equal(u.kryptoVersion, V.CRYPTO_VERSION_ZERFALL,
    'kryptoVersion ist die des Schreibwegs (keine Versions-Migration durch den Passwort-Wechsel)');
  // Frischer Kontext: der Beweis muss ohne die offene Session tragen.
  const frisch = ladeKern().V;
  const inhalt = await frisch.depotLaden(u, PW_NEU);
  assert.equal(inhalt.sektoren.identity.givenName, 'Maria', 'Inhalt vollständig erhalten');
});

test('[Klasse-A][ADR-095] Das alte Passwort öffnet die neue Datei NICHT', async () => {
  const { V, geschrieben } = kernMitDatei();
  await depotMitInhalt(V);
  await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  const u = umschlagAusDatei(geschrieben[0]);
  const frisch = ladeKern().V;
  await assert.rejects(() => frisch.depotLaden(u, PW_ALT),
    'die neue Datei darf sich mit dem alten Passwort nicht öffnen lassen');
});

test('[Klasse-A][ADR-095] Beide Salts der neuen Datei unterscheiden sich von den alten', async () => {
  const { V, geschrieben } = kernMitDatei();
  await depotMitInhalt(V);
  const vorher = await V.depotSerialisieren();
  await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  const u = umschlagAusDatei(geschrieben[0]);
  assert.notEqual(u.pbkdf2.salt, vorher.pbkdf2.salt, 'neuer 16-Byte-PBKDF2-Salt');
  assert.notEqual(u.depotSalt, vorher.depotSalt, 'neuer 32-Byte-depotSalt');
  assert.equal(u.depotUUID, vorher.depotUUID, 'depotUUID bleibt — sie ist Identität, kein Geheimnis');
  // Längen wie im Vertrag (16 / 32 Byte), nicht nur „irgendwie anders".
  assert.equal(Buffer.from(u.pbkdf2.salt, 'base64').length, 16);
  assert.equal(Buffer.from(u.depotSalt, 'base64').length, 32);
});

test('[Klasse-A][ADR-095] Falsches aktuelles Passwort: Abbruch, keine Datei, Session unverändert', async () => {
  const { V, geschrieben } = kernMitDatei();
  await depotMitInhalt(V);
  const vorher = await V.depotSerialisieren();

  await assert.rejects(() => V.passwortWechselDurchfuehren('falsches-passwort', PW_NEU),
    'ein falsches aktuelles Passwort muss den Wechsel abbrechen');
  assert.equal(geschrieben.length, 0, 'es wurde NICHTS geschrieben');

  // Die Session muss weiter dem ALTEN Passwort gehören: derselbe Salt, und ein frisch
  // serialisierter Umschlag öffnet mit PW_ALT.
  const nachher = await V.depotSerialisieren();
  assert.equal(nachher.pbkdf2.salt, vorher.pbkdf2.salt, 'Salts unangetastet');
  assert.equal(nachher.depotSalt, vorher.depotSalt, 'depotSalt unangetastet');
  const frisch = ladeKern().V;
  const inhalt = await frisch.depotLaden(nachher, PW_ALT);
  assert.equal(inhalt.sektoren.identity.givenName, 'Maria', 'Depot weiterhin mit dem alten Passwort lesbar');
});

test('[Klasse-A][ADR-095] Abgebrochener Speicherdialog dreht die Session auf das alte Passwort zurück', async () => {
  const { V, geschrieben } = kernMitDatei(true);   // Picker wirft AbortError
  await depotMitInhalt(V);
  const vorher = await V.depotSerialisieren();
  const ergebnis = await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  assert.equal(ergebnis, 'abgebrochen');
  assert.equal(geschrieben.length, 0, 'keine Datei geschrieben');

  const nachher = await V.depotSerialisieren();
  assert.equal(nachher.pbkdf2.salt, vorher.pbkdf2.salt, 'Salt zurückgedreht');
  assert.equal(nachher.depotSalt, vorher.depotSalt, 'depotSalt zurückgedreht');
  const frisch = ladeKern().V;
  await frisch.depotLaden(nachher, PW_ALT);   // wirft, wenn die Session noch am neuen Passwort hinge
});

/* Zeroing (ADR A.1 Punkt 5): BEIDE Ableitungen des Wechsel-Pfads müssen ihre
   PBKDF2-Master-Bits nullen — die Prüfung des alten Passworts (depotMasterHkdfKey)
   und die Ableitung des neuen (setupMasterSession). Messbar, weil deriveMasterBits
   den deriveBits-Puffer DIREKT zurückgibt (keine Kopie): der Spy hält genau die
   Referenz, die das Zeroing trifft. */
test('[Klasse-A][ADR-095] Master-Bits beider Ableitungen im Wechsel-Pfad sind genullt', async () => {
  const { V } = kernMitDatei();
  await depotMitInhalt(V);
  const orig = webcrypto.subtle.deriveBits;
  const gesehen = [];
  webcrypto.subtle.deriveBits = async function (...a) {
    const b = await orig.apply(this, a);
    if (b && b.byteLength === 32) gesehen.push(b);   // nur die PBKDF2-Master-Bits, nicht HKDF-Zwischenschritte
    return b;
  };
  try {
    await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  } finally {
    webcrypto.subtle.deriveBits = orig;
  }
  assert.equal(gesehen.length, 2, 'genau zwei Master-Ableitungen: altes prüfen, neues setzen');
  for (let i = 0; i < gesehen.length; i++) {
    const bits = new Uint8Array(gesehen[i]);
    assert.ok(bits.every(b => b === 0), 'Master-Bits der Ableitung ' + (i + 1) + ' sind genullt');
  }
  // Kontrolle: dasselbe Material bleibt ohne Zeroing-Pfad ungenullt — die Nullen
  // stammen aus der Disziplin, nicht aus der Ableitung selbst.
  const roh = new Uint8Array(await V.deriveMasterBits(PW_ALT, new Uint8Array(16)));
  assert.ok(roh.some(b => b !== 0), 'Kontrolle: frisch abgeleitete Bits sind nicht null');
});

/* Auflage 1 aus der Stufe-1-Klärung: der zweite Zugang hängt an SEINEM eigenen Passwort, nicht am
   Anker-Passwort. Ein handgebauter Umschlag hätte ihn still gelöscht — dieser Test würde das sehen.
   F5 Zug 2 (21.08.2026): der zweite Zugang ist nicht mehr die Abschrift neben `ct`, sondern das
   FACH eines Empfängerkreises in der Umschlagstabelle. Die Zusage ist dieselbe, und sie ist jetzt
   stärker belegt: geprüft wird nicht die Anwesenheit eines Feldes, sondern dass sich die Datei mit
   dem Fach-Passwort wirklich öffnet. */
test('[Klasse-A][ADR-095] der zweite Zugang überlebt den Wechsel und bleibt mit seinem eigenen Passwort nutzbar', async () => {
  const FACH_PW = 'fach-passwort-der-tante-42';
  const { V, geschrieben } = kernMitDatei();
  await depotMitInhalt(V);
  await V.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, 'Tresor');
  assert.ok(V.empfaengerkreisHatFach(V.empfaengerkreiseListe()[0]), 'Vorbedingung: Fach eingerichtet');

  await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  const u = umschlagAusDatei(geschrieben[geschrieben.length - 1]);
  assert.equal(u.umschlagTabelle.length, 2, 'Anker + Fach sind in der neuen Datei');

  const frisch = ladeKern().V;
  const inhalt = await frisch.depotLaden(u, FACH_PW);
  assert.ok(inhalt, 'das Fach-Passwort öffnet unverändert (hängt nicht am Anker-Passwort)');
});

/* Auflage aus 1.1: Sub-Depots tragen eigene Salts, eigene UUID und einen allein aus
   dem Sub-Passwort abgeleiteten Schlüssel — der Anker-Wechsel darf sie nicht berühren. */
test('[Klasse-A][ADR-095] Sub-Depot bleibt nach dem Anker-Wechsel mit unverändertem Sub-Passwort entsiegelbar', async () => {
  const SUB_PW = 'sub-passwort-4711';
  const { V, geschrieben } = kernMitDatei();
  await depotMitInhalt(V);
  await V.subDepotAnlegen({ vorname: 'Emil', nachname: 'Klein' }, SUB_PW);

  await V.passwortWechselDurchfuehren(PW_ALT, PW_NEU);
  const u = umschlagAusDatei(geschrieben[0]);
  const frisch = ladeKern().V;
  const inhalt = await frisch.depotLaden(u, PW_NEU);
  const eintrag = (inhalt.verwalteteDepots || [])[0];
  assert.ok(eintrag && eintrag.umschlag, 'Sub-Eintrag ist mitgewandert');
  const auf = await frisch.subDepotEntsiegeln(eintrag.umschlag, SUB_PW);
  assert.ok(auf && auf.inhalt, 'Sub-Depot öffnet mit unverändertem Sub-Passwort');
});

/* Beschluss B: Das Blatt kommt LEER aus dem Drucker. Der Test prüft nicht nur die
   Abwesenheit des Passworts (das könnte auch zufällig fehlen), sondern zusätzlich,
   dass das Blatt überhaupt gerendert wurde und keine Eingabefelder trägt — ein
   <input> wäre der Weg, auf dem ein Passwort doch noch ins Artefakt käme. */
test('[Klasse-A][ADR-095] Notfall-Blatt enthält kein Passwort und keine Eingabefelder', async () => {
  const { V } = kernMitDatei();
  await depotMitInhalt(V);
  await V.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], 'fach-passwort-der-tante-42', 'Tresor');
  const blatt = V.notfallblattHTML();

  assert.ok(blatt.length > 200, 'Vorbedingung: das Blatt wurde tatsächlich gerendert');
  assert.ok(/Notfall-Blatt/.test(blatt), 'Vorbedingung: es ist das Notfall-Blatt');
  for (const geheim of [PW_ALT, PW_NEU, 'fach-passwort-der-tante-42']) {
    assert.ok(!blatt.includes(geheim), 'kein Passwort im Blatt: ' + geheim);
  }
  assert.ok(!/<input/i.test(blatt), 'keine Eingabefelder — das Blatt wird auf Papier ausgefüllt');
  assert.ok(!/<textarea/i.test(blatt), 'kein Textfeld im Blatt');
});
