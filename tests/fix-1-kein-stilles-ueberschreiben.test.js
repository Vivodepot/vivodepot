'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fixliste Nr. 1 — zwei Fenster überschreiben sich still
   ────────────────────────────────────────────────────────────────────────
   Dasselbe Depot in zwei Fenstern, beide bearbeitet, beide gespeichert: die
   Eingaben des ersten waren fort, ohne jede Rückmeldung. Ohne Server-Kopie
   ist der Verlust endgültig.

   ZWEI SENKEN, je eine eigene Prüfung — die zweite ist die, die JEDE Bürgerin
   trifft, nicht nur Chromium:
     Senke 1  Datei (FSA): `_dateiHandle.createWritable()` schreibt in place.
     Senke 2  interner Stand: `VdStore.setzen({id: depotUUID})` überschreibt
              den Record per Schlüssel — auf allen Plattformen.

   NICHT geprüft, weil es den Defekt nicht gibt: der Download-/Teilen-Pfad.
   Dort vergibt das Betriebssystem den Namen, es entsteht eine neue Datei.

   Jede Senke bringt mit (§3.5b/§3.5d):
     · den Kernfall            — der zweite Schreibvorgang schreibt NICHT
     · eine POSITIVKONTROLLE   — mit `{ueberschreiben:true}` schreibt er sehr wohl.
       Sie ist der eigentliche Wert: sie zeigt, dass der Unterschied an der
       ERKENNUNG hängt und nicht daran, dass hier ohnehin nie geschrieben wird.
     · eine NEGATIVKONTROLLE   — ein einzelnes Fenster speichert weiter ohne Rückfrage.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'zwei-fenster-passwort-777';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const hosted = () => ladeKern({ indexedDB: createIdbMock(), location: HOSTED });

/* ── 1 · DAS MODELL (sync, ohne Browser) ──────────────────────────────── */

test('[Nr1·Modell] erstes Speichern und leeres Ziel sind KEIN Konflikt', () => {
  const { V } = hosted();
  assert.equal(V.speicherKonfliktModell(null, { gespeichert_am: 'x' }).konflikt, false,
    'wer noch nie geschrieben hat, kann nichts von sich überschreiben');
  assert.equal(V.speicherKonfliktModell('2026-07-28T00:00:00.000Z', null).konflikt, false,
    'am Ziel liegt nichts — nichts zu verlieren');
});

test('[Nr1·Modell] dieselbe Marke → kein Konflikt; fremde Marke → Konflikt mit beiden Zeiten', () => {
  const { V } = hosted();
  const meine = '2026-07-28T01:00:00.000Z';
  const fremde = '2026-07-28T02:30:00.000Z';
  assert.equal(V.speicherKonfliktModell(meine, { gespeichert_am: meine }).grund, 'gleich');

  const km = V.speicherKonfliktModell(meine, { gespeichert_am: fremde });
  assert.equal(km.konflikt, true, 'fremde Marke am Ziel = ein anderes Fenster war da');
  assert.equal(km.amZiel, fremde);
  assert.equal(km.erwartet, meine);
  // Lesbar und LOKAL, nicht UTC — der Dialog ist der Ort, an dem zwei Stände
  // nach der Uhrzeit verglichen werden, um einen zu verwerfen (Posten 21).
  assert.equal(km.zielLesbar, V._konfliktZeitLesbar(fremde));
  assert.equal(km.erwartetLesbar, V._konfliktZeitLesbar(meine));
});

test('[Nr1·Modell] Ziel OHNE Marke ist ein Konflikt, nicht ein Freibrief', () => {
  const { V } = hosted();
  const km = V.speicherKonfliktModell('2026-07-28T01:00:00.000Z', { irgendwas: true });
  assert.equal(km.konflikt, true,
    'eine fremde Datei am Zielort ist der gefährlichere Fall, nicht der harmlosere');
  assert.equal(km.zielLesbar, null, 'kein Datum → der Dialog zeigt „unbekannt"');
});

/* ── 2 · SENKE 2 — der interne Stand (alle Plattformen) ───────────────── */

// Das zweite Fenster wird durch einen direkten Store-Schreibvorgang dargestellt —
// genau das tut dort `depotInIdbSichern`. Beide Fenster teilen sich dieselbe
// IndexedDB, weil sie denselben Ursprung haben; das ist der echte Fall.
async function ankerMitFremdemStand() {
  const k = hosted();
  await k.V.depotAnlegen(PW);
  await k.V.depotInternSichern();                       // unser Stand M1
  const [meiner] = await k.V.VdStore.liste();
  const fremdeMarke = new Date(Date.parse(meiner.gespeichert_am) + 60000).toISOString();
  await k.V.VdStore.setzen({ ...meiner, gespeichert_am: fremdeMarke });   // „das andere Fenster"
  return { k, fremdeMarke };
}

test('[Nr1·intern] das zweite Fenster schreibt NICHT über den fremden Stand', async () => {
  const { k, fremdeMarke } = await ankerMitFremdemStand();
  const weg = await k.V.depotInternSichern();
  assert.equal(weg, 'konflikt', 'gemeldet, nicht geschrieben');
  const [danach] = await k.V.VdStore.liste();
  assert.equal(danach.gespeichert_am, fremdeMarke,
    'der Stand des anderen Fensters steht unverändert da — genau das ging bisher verloren');
});

test('[Nr1·intern·Positivkontrolle] mit ausdrücklichem Überschreiben schreibt dasselbe Fenster sehr wohl', async () => {
  const { k, fremdeMarke } = await ankerMitFremdemStand();
  const weg = await k.V.depotInternSichern({ ueberschreiben: true });
  assert.equal(weg, 'intern', 'die bewusste Wahl der Bürgerin kommt durch');
  const [danach] = await k.V.VdStore.liste();
  assert.notEqual(danach.gespeichert_am, fremdeMarke,
    'ohne diese Kontrolle wäre nicht zu unterscheiden, ob die Sperre wirkt oder ob hier nie geschrieben wird');
});

test('[Nr1·intern·Negativkontrolle] ein einzelnes Fenster speichert weiter ohne Rückfrage', async () => {
  const k = hosted();
  await k.V.depotAnlegen(PW);
  assert.equal(await k.V.depotInternSichern(), 'intern', 'erstes Speichern');
  k.V.getData().sektoren.identity = { givenName: 'Zweiter Zug' };
  assert.equal(await k.V.depotInternSichern(), 'intern',
    'derselbe Stand, dasselbe Fenster — hier darf nichts fragen');
  assert.equal((await k.V.VdStore.liste()).length, 1, 'weiterhin genau ein Anker-Record');
});

/* ── 3 · SENKE 1 — die Datei (FSA-Pfad) ───────────────────────────────── */

/* Ein Handle auf eine Datei, die als Kiste im Speicher liegt. `inhalt` ist genau
   das, was auf dem Datenträger stünde — ein zweites Fenster verändert sie, indem
   es in dieselbe Kiste schreibt.

   ACHTUNG, Falle: der Sandkasten stellt `Blob` als leeren Konstruktor bereit
   (load-kern.js: `Blob: opts.Blob || function () {}`). Ohne einen ECHTEN Blob
   wirft `blob.text()` im Schreiber, `_depotBlobSpeichern` fängt das, verwirft das
   Handle und fällt auf den Download-Pfad zurück — die Kiste bliebe leer und der
   FSA-Pfad wäre nie gelaufen. Darum `ladeKern({ …, Blob })`. Gefunden hat das die
   Vorprüfung „es wurde überhaupt eine Datei geschrieben"; ohne sie wären die drei
   Datei-Prüfungen an einem Pfad grün geworden, den sie gar nicht befahren. */
// Die Datei trägt die Magic-Kennung vor dem JSON (dateiMitMagic). Der Test liest und
// schreibt in genau diesem Format — sonst prüfte er gegen eine Datei, die es nicht gibt.
const DATEI_MAGIC = 'VIVODEPOT';
const MAGIC_PREFIX = DATEI_MAGIC + String.fromCharCode(1);
const ausKiste = (s) => JSON.parse(String(s).startsWith(DATEI_MAGIC) ? String(s).slice(DATEI_MAGIC.length + 1) : String(s));
const inKiste = (obj) => MAGIC_PREFIX + JSON.stringify(obj, null, 2);

function dateiKiste() {
  const kiste = { inhalt: null };
  const handle = {
    name: 'Mein-Vivodepot.vivodepot',
    getFile: async () => ({ text: async () => kiste.inhalt }),
    createWritable: async () => ({
      write: async (blob) => { kiste.inhalt = typeof blob === 'string' ? blob : await blob.text(); },
      close: async () => {},
    }),
  };
  return { kiste, picker: async () => handle };
}

async function dateiDepotMitFremdemStand() {
  const { kiste, picker } = dateiKiste();
  const k = ladeKern({ showSaveFilePicker: picker, Blob });
  await k.V.depotAnlegen(PW);
  await k.V.depotInDateiSichern();                       // legt die Bindung an, schreibt M1
  assert.ok(kiste.inhalt, 'Vorprüfung: es wurde überhaupt eine Datei geschrieben');
  const umschlag = ausKiste(kiste.inhalt);
  assert.equal(typeof umschlag.gespeichert_am, 'string', 'Vorprüfung: die Datei trägt die Klartext-Marke');
  const fremdeMarke = new Date(Date.parse(umschlag.gespeichert_am) + 60000).toISOString();
  kiste.inhalt = inKiste({ ...umschlag, gespeichert_am: fremdeMarke });   // „das andere Fenster"
  return { k, kiste, fremdeMarke };
}

test('[Nr1·Datei] das zweite Fenster überschreibt die veränderte Datei NICHT', async () => {
  const { k, kiste, fremdeMarke } = await dateiDepotMitFremdemStand();
  const weg = await k.V.depotInDateiSichern();
  assert.equal(weg, 'konflikt', 'gemeldet, nicht geschrieben');
  assert.equal(ausKiste(kiste.inhalt).gespeichert_am, fremdeMarke,
    'die Datei auf dem Datenträger ist unangetastet');
});

test('[Nr1·Datei·Positivkontrolle] mit ausdrücklichem Überschreiben schreibt es sehr wohl', async () => {
  const { k, kiste, fremdeMarke } = await dateiDepotMitFremdemStand();
  await k.V.depotInDateiSichern({ ueberschreiben: true });
  assert.notEqual(ausKiste(kiste.inhalt).gespeichert_am, fremdeMarke,
    'die bewusste Wahl kommt durch — die Sperre ist eine Sperre, keine Sackgasse');
});

test('[Nr1·Datei·Negativkontrolle] unveränderte Datei → zweites Speichern fragt nicht', async () => {
  const { kiste, picker } = dateiKiste();
  const k = ladeKern({ showSaveFilePicker: picker, Blob });
  await k.V.depotAnlegen(PW);
  await k.V.depotInDateiSichern();
  const erste = ausKiste(kiste.inhalt).gespeichert_am;
  const weg = await k.V.depotInDateiSichern();
  assert.notEqual(weg, 'konflikt', 'niemand sonst war an der Datei — hier darf nichts fragen');
  assert.ok(kiste.inhalt, 'und geschrieben wurde auch');
  assert.equal(typeof erste, 'string');
});

test('[Nr1·Datei] gelöschte oder unlesbare Datei blockiert das Speichern nicht', async () => {
  const { kiste, picker } = dateiKiste();
  const k = ladeKern({ showSaveFilePicker: picker, Blob });
  await k.V.depotAnlegen(PW);
  await k.V.depotInDateiSichern();
  kiste.inhalt = 'kein JSON, sondern Bruch';              // Datei fremd überschrieben/beschädigt
  assert.equal(await k.V.zielStandDatei(), null,
    'was sich nicht lesen lässt, meldet keinen Stand — und blockiert darum nicht');
});

test('[Nr1·Datei] ohne Bindung gibt es nichts zu überschreiben', async () => {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  assert.equal(await k.V.zielStandDatei(), null, 'kein Handle → kein Ziel');
});
