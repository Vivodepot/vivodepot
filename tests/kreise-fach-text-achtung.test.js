'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fach einrichten: der freigegebene Wortlaut mit Achtung-Satz (Entscheidung 23.08.2026, „wortgleich zu übernehmen“;
   Zahl der Zeichen nach der Passwortregel vom 08.10.2026, PW_MIN_EIGEN = 12)
   ────────────────────────────────────────────────────────────────────────
   Die Bürgerin erfährt beim Geben, dass sie eine weitergegebene Datei nicht zurückholen kann (Entscheidung 22.08.2026,
   Zugang und Herausgabe), nicht erst beim Entfernen. Der Text steht im deutschen Modul als Quelle und im englischen
   Zwilling.

   ROT-BEWEIS, GEMESSEN (22.10.2026, u2-kanon a8243ba7e): kreiseFachText trug die frühere Fassung („Ihre eigene … genau
   das …“) ohne Achtung-Satz; beide Proben unten waren rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8'));
const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'));
const KENNUNG = 'strings:kreiseFachText.text';

const FREIGEGEBEN = 'Diese Person kann Ihre {marke}-Datei öffnen und sieht die Bausteine, die Sie angekreuzt haben. '
  + 'Vergeben Sie ein Passwort für sie, mindestens 12 Zeichen. Es wird mit dem nächsten Speichern wirksam. '
  + 'Achtung: Eine Datei, die Sie einmal weitergegeben haben, können Sie nicht zurückholen.';

test('[Fach·Achtung] der deutsche Text ist der freigegebene Wortlaut, wortgleich', () => {
  assert.equal(DE.texte[KENNUNG], FREIGEGEBEN);
});

test('[Fach·Achtung] der englische Zwilling trägt den Achtung-Satz und dieselbe Zeichenzahl', () => {
  const en = EN.texte[KENNUNG];
  assert.match(en, /cannot get it back/);
  assert.match(en, /at least 12 characters/);
});
