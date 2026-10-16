'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Sicherbarkeit — Fehlerfälle beim Speichern und Wiederherstellen (13.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Bestandsaufnahme je Fehlerfall gegen die vorhandenen Proben; diese Datei
   trägt die Lücken, die sich im Kern ohne Browser prüfen lassen. Die
   Browser-Hälfte steht in der gleichnamigen Browser-Probe.

   Vorhanden und hier NICHT wiederholt: die G4-Proben zum Schreibabbruch
   (write/close scheitert → kein „datei"-Erfolg), die Proben zum Zustandsmodell
   gespeichert/ungespeichert, SF-4 (Warntext im Anlege-Dialog) und die S5-Proben
   zur halben Datei (abgeschnittene/verfälschte Datei öffnet nicht).

   Die Lücken:
   1. Scheitert schon die ERSTE Datei-Sicherung am Schreiben (voller Datenträger),
      fiel der Kern still auf einen Download zurück. Die Nutzerin hatte einen Ort
      gewählt und erfuhr nicht, dass dort nichts liegt (Befund
      ERSTE-DATEISICHERUNG-SCHEITERT-STILL; seither die Ansage _schreibfehlerAnsagen).
   2. Ein gescheitertes Öffnen einer zweiten Datei bei offenem Depot: bleiben
      Daten und Sitzung unverändert?
   3. Scheitert ein späterer Schreibvorgang auf dieselbe Datei, bleibt die
      vorherige Fassung lesbar und der Zustand behauptet keine Sicherung.
   4. Der Weg „Passwort setzen" aus der Vorschau zeigt den Hinweis, dass ohne
      Passwort kein Weg zurückführt — SF-4 prüft nur den Anlege-Dialog.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'sicherbarkeit-fehlerfall-pw-731';
const PW_ANDERES = 'sicherbarkeit-anderes-depot-pw-482';

function fehler(name, text) { const e = new Error(text); e.name = name; return e; }

// Eine Datei-Attrappe mit der Semantik der File System Access API: write() schreibt in eine
// Zwischenablage, erst close() übernimmt sie in die Datei. Scheitert close(), bleibt die
// vorherige Fassung stehen (so beschreibt es die Spezifikation für createWritable ohne
// keepExistingData). `scheitern` ist eine Liste je Aufruf: null, 'write' oder 'close'.
function dateiMitFassungen(scheitern) {
  const datei = { inhalt: null, aufrufe: 0 };
  const handle = {
    name: 'sicherbarkeit-fehlerfall.vivodepot',
    createWritable: async () => {
      const nr = datei.aufrufe++;
      const art = scheitern[nr] || null;
      let zwischen = null;
      return {
        write: async (blob) => {
          if (art === 'write') throw fehler('QuotaExceededError', 'simulierter voller Datenträger');
          zwischen = typeof blob === 'string' ? blob : await blob.text();
        },
        close: async () => {
          if (art === 'close') throw fehler('QuotaExceededError', 'simulierter Abbruch vor der Ablage');
          datei.inhalt = zwischen;
        },
      };
    },
  };
  return { datei, handle };
}

function umschlagAusDatei(text, V) {
  return JSON.parse(V.magicStrippen(text).json);
}

function sichtbarerHinweis(document) {
  const modal = document.getElementById('modal-inhalt');
  const toast = document.getElementById('toast-host');
  return ((modal && modal.innerHTML) || '') + ' ' + ((toast && toast.innerHTML) || '');
}

// Befund ERSTE-DATEISICHERUNG-SCHEITERT-STILL (HOCH, 13.10.2026): rot bis zur Ansage _schreibfehlerAnsagen.
test('[Sicherbarkeit·Schreibfehler] scheitert die erste Datei-Sicherung am Schreiben, erfährt die Nutzerin es', async () => {
  const { handle } = dateiMitFassungen(['write']);
  const { V, document } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();
  const weg = await V.depotHerunterladen();
  assert.notEqual(weg, 'datei', 'Vorbedingung (wie G4): kein bestätigter Erfolg');
  assert.notEqual(V.saveStatusModell().zustand, 'als-datei', 'kein Häkchen für eine Datei, die nicht geschrieben wurde');
  // Der still nachgeschobene Download ist eine andere Datei an einem anderen Ort. Gefordert ist,
  // dass die Nutzerin es erfährt: als Ansage, dass die gewählte Datei nicht geschrieben wurde.
  assert.ok(sichtbarerHinweis(document).includes(V.escapeHTML(V.STRINGS.schreibfehlerTitel)),
    'nach einem gescheiterten Schreiben in die gewählte Datei steht die Ansage da (Zustand: „' + V.saveStatusModell().zustand + '“)');
  assert.equal(weg, 'zielverlust', 'der Weg meldet, dass die Sicherung woanders liegt — wie beim verlorenen Ziel');
});

test('[Sicherbarkeit·Schreibfehler·Rot-Beweis] gelingt das erste Schreiben, steht keine Ansage da', async () => {
  const { datei, handle } = dateiMitFassungen([null]);
  const { V, document } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();
  assert.equal(await V.depotHerunterladen(), 'datei');
  assert.ok(datei.inhalt, 'die Datei ist geschrieben');
  assert.ok(!sichtbarerHinweis(document).includes(V.escapeHTML(V.STRINGS.schreibfehlerTitel)), 'keine Schreibfehler-Ansage nach einem Erfolg');
});

test('[Sicherbarkeit·Schreibfehler·Gegenprobe] scheitert schon der Picker, wurde keine Datei gewählt — keine Schreibfehler-Ansage', async () => {
  const { V, document } = ladeKern({ showSaveFilePicker: async () => { throw fehler('SecurityError', 'simulierter Picker-Fehler'); }, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();
  const weg = await V.depotHerunterladen();
  assert.notEqual(weg, 'datei');
  assert.ok(!sichtbarerHinweis(document).includes(V.escapeHTML(V.STRINGS.schreibfehlerTitel)), 'ohne gewählte Datei bleibt der stille Download (S11)');
});

test('[Sicherbarkeit·Falsches Passwort] scheitert das Öffnen einer zweiten Datei, bleiben Daten und Sitzung unverändert', async () => {
  // Datei B: ein anderes Depot, als Umschlag serialisiert.
  const b = ladeKern();
  await b.V.depotAnlegen(PW_ANDERES);
  b.V.akteurSelbstErklaeren('Bea');
  const umschlagB = await b.V.depotSerialisieren();

  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Anna');
  V.getData().sektoren.identity = Object.assign({}, V.getData().sektoren.identity, { city: 'Probestadt-A' });
  const vorher = JSON.stringify(V.getData());
  const uuidVorher = V._aktuelleDepotUUID();

  await assert.rejects(() => V.depotLaden(umschlagB, 'falsches-passwort-xyz'), 'mit falschem Passwort geht B nicht auf');
  assert.equal(JSON.stringify(V.getData()), vorher, 'die Daten des offenen Depots sind unverändert');
  assert.equal(V.VdCrypto.sitzungOffen(), true, 'die Sitzung des offenen Depots bleibt offen');
  assert.equal(V._aktuelleDepotUUID(), uuidVorher, 'die Kennung des offenen Depots bleibt');
});

test('[Sicherbarkeit·Falsches Passwort·Rot-Beweis] mit dem richtigen Passwort ändert sich der Stand — der Vergleich oben sieht eine Änderung', async () => {
  const b = ladeKern();
  await b.V.depotAnlegen(PW_ANDERES);
  b.V.akteurSelbstErklaeren('Bea');
  const umschlagB = await b.V.depotSerialisieren();

  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Anna');
  V.getData().sektoren.identity = Object.assign({}, V.getData().sektoren.identity, { city: 'Probestadt-A' });
  const vorher = JSON.stringify(V.getData());
  const uuidVorher = V._aktuelleDepotUUID();

  await V.depotLaden(umschlagB, PW_ANDERES);
  assert.notEqual(JSON.stringify(V.getData()), vorher, 'ein gelungenes Öffnen ersetzt die Daten — sonst prüfte die Probe oben nichts');
  assert.notEqual(V._aktuelleDepotUUID(), uuidVorher, 'und die Kennung wechselt');
});

test('[Sicherbarkeit·Unterbrochen] scheitert ein späterer Schreibvorgang, bleibt die vorige Fassung lesbar und nichts behauptet eine Sicherung', async () => {
  const { datei, handle } = dateiMitFassungen([null, 'close']);
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Anna');
  V.getData().sektoren.identity = Object.assign({}, V.getData().sektoren.identity, { city: 'Fassung-Eins' });
  V.markiereUngespeichert();
  assert.equal(await V.depotHerunterladen(), 'datei', 'erste Fassung geschrieben');
  const ersteFassung = datei.inhalt;
  assert.ok(ersteFassung, 'die erste Fassung liegt in der Datei');

  V.getData().sektoren.identity.city = 'Fassung-Zwei';
  V.markiereUngespeichert();
  const weg = await V.depotHerunterladen();
  assert.notEqual(weg, 'datei', 'der abgebrochene zweite Schreibvorgang zählt nicht als Erfolg');
  assert.equal(datei.inhalt, ersteFassung, 'die Datei trägt weiter die erste Fassung');
  assert.notEqual(V.saveStatusModell().zustand, 'als-datei', 'der Zustand behauptet keine aktuelle Sicherung');
  assert.equal(V.schliessenWarnungNoetig(), true, 'das Schließen warnt');

  // Die stehengebliebene Fassung öffnet in einem frischen Kern mit ihrem Inhalt.
  const frisch = ladeKern();
  await frisch.V.depotLaden(umschlagAusDatei(ersteFassung, frisch.V), PW);
  assert.equal(frisch.V.getData().sektoren.identity.city, 'Fassung-Eins', 'die erste Fassung ist vollständig lesbar');
});

test('[Sicherbarkeit·Hinweis] „Passwort setzen" aus der Vorschau sagt vor dem Feld, dass niemand das Passwort zurücksetzen kann', () => {
  const { V, document } = ladeKern();
  V.flowVorschauBetreten();
  V.flowPasswortSetzen();
  const html = document.getElementById('modal-inhalt').innerHTML;
  const iWarn = html.indexOf('modal-warnung');
  const iPw = html.indexOf('id="pw-neu"');
  assert.ok(iWarn > -1, 'der Warnblock steht im Dialog');
  assert.ok(iPw > -1, 'das Passwort-Feld steht im Dialog');
  assert.ok(iWarn < iPw, 'Reihenfolge: Warnung vor dem Passwort-Feld');
  // Der Testkern hat kein echtes DOM; der Wortlaut steht maskiert im HTML.
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.modalAnlegenPwWarnung)), 'der freigegebene Wortlaut steht wörtlich da');
});
