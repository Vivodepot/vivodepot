'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Eigene Einlassgrenze für Sprachmodule (U2-ADR-513, 22.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   `modulEinlassen` wählt die Byte-Grenze nach dem Modultyp: textsatz 1 MiB, jedes andere Register 512 KB.
   Geprüft am echten Einlass:
   (1) ein Sprachmodul knapp unter 1 MiB geht durch, eines knapp darüber wird mit `zu-gross` abgewiesen;
   (2) jedes andere Register bleibt bei 512 KB: ein Bereichsmodul und ein Modul unbekannten Typs über 512 KB werden mit
       `zu-gross` abgewiesen, vor jeder Prüfung des Typs;
   (3) Rot-Beweis: mit der gemeinsamen Grenze von 512 KB fiele dasselbe Sprachmodul aus (1) durch — ohne die Weiche
       nach Typ wäre (1) rot.
   Die vollständige Übersetzung prüft tests/textsatz-lauf-mit-angedocktem-modul.test.js (jeder Text mit „‹fr›“).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const KIB = 1024;
async function kern() {
  const { V } = ladeKern();
  await V.depotAnlegen('einlassgrenze-sprachmodul-2026');
  return V;
}
/* Ein Sprachmodul mit einer bekannten Kennung, deren Text die Größe trägt; `bytes` ist die Größe des ganzen Moduls als JSON. */
function sprachmodul(bytes, sprache) {
  const leer = { modulTyp: 'textsatz', moduleVersion: 1, sprache, texte: { 'identity.familyName.label': '' } };
  const rest = bytes - Buffer.byteLength(JSON.stringify(leer));
  leer.texte['identity.familyName.label'] = 'x'.repeat(rest);
  assert.equal(Buffer.byteLength(JSON.stringify(leer)), bytes, 'Vorbedingung: das Modul hat genau die verlangte Größe');
  return leer;
}

/* Jeder Wächter unten ruft eine Funktion, die die Verstöße als Liste liefert, und verlangt die leere Liste. */
async function sprachmodulVerstoesse(V) {
  const v = [];
  if (V._TEXTSATZ_MODUL_MAX_BYTES !== 1024 * KIB) v.push('Grenze für Sprachmodule ist ' + V._TEXTSATZ_MODUL_MAX_BYTES + ', nicht 1 MiB');
  const drunter = V.modulEinlassen(JSON.stringify(sprachmodul(1024 * KIB - 16, 'gu')), V.getData());
  if (drunter.angenommen !== true) v.push('knapp unter 1 MiB abgewiesen: ' + drunter.grund);
  const drueber = V.modulEinlassen(JSON.stringify(sprachmodul(1024 * KIB + 16, 'go')), V.getData());
  if (drueber.angenommen !== false || drueber.grund !== 'zu-gross') v.push('knapp über 1 MiB nicht mit zu-gross abgewiesen: ' + drueber.grund);
  return v;
}
function andereTypenVerstoesse(V) {
  const v = [];
  if (V._MODUL_EINLASS_MAX_BYTES !== 512 * KIB) v.push('gemeinsame Grenze ist ' + V._MODUL_EINLASS_MAX_BYTES + ', nicht 512 KB');
  for (const modulTyp of ['bereich', 'logikModul', 'kein-register']) {
    const m = { modulTyp, moduleVersion: 1, nutzlast: 'x'.repeat(600 * KIB) };
    const r = V.modulEinlassen(JSON.stringify(m), V.getData());
    if (r.angenommen !== false || r.grund !== 'zu-gross') v.push(modulTyp + ': nicht an der Größe abgewiesen (' + r.grund + ')');
  }
  if (V._modulEinlassMaxBytes({ modulTyp: 'bereich' }) !== 512 * KIB) v.push('bereich: nicht 512 KB');
  if (V._modulEinlassMaxBytes({ modulTyp: 'textsatz' }) !== 1024 * KIB) v.push('textsatz: nicht 1 MiB');
  if (V._modulEinlassMaxBytes(null) !== 512 * KIB) v.push('ohne Modul: nicht die engere Grenze');
  return v;
}
function weicheVerstoesse(V) {
  const v = [];
  const m = sprachmodul(1024 * KIB - 16, 'gr');
  const gemeinsam = V._modulGroesseTiefePruefen(m, { maxBytes: V._MODUL_EINLASS_MAX_BYTES, maxTiefe: 40 });
  if (gemeinsam.grund !== 'zu-gross') v.push('an der gemeinsamen Grenze fiele das Sprachmodul nicht durch — die Probe oben bewiese nichts');
  if (V._modulGroesseTiefePruefen(m, { maxBytes: V._modulEinlassMaxBytes(m), maxTiefe: 40 }).ok !== true) v.push('an der eigenen Grenze geht das Sprachmodul nicht durch');
  return v;
}
const KOPPLUNG = { PROBEN: [
  { fuer: '[Grenze·Sprachmodul] knapp unter 1 MiB geht durch, knapp darüber wird abgewiesen', diskriminante: sprachmodulVerstoesse },
  { fuer: '[Grenze·andere Typen] Bereich und unbekannter Typ bleiben bei 512 KB', diskriminante: andereTypenVerstoesse },
  { fuer: '[Grenze·Rot-Beweis] mit der gemeinsamen Grenze von 512 KB fiele das Sprachmodul knapp unter 1 MiB durch', diskriminante: weicheVerstoesse },
] };
void KOPPLUNG;

test('[Grenze·Sprachmodul] knapp unter 1 MiB geht durch, knapp darüber wird abgewiesen', async () => {
  assert.deepEqual(await sprachmodulVerstoesse(await kern()), []);
});

test('[Grenze·andere Typen] Bereich und unbekannter Typ bleiben bei 512 KB', async () => {
  assert.deepEqual(andereTypenVerstoesse(await kern()), []);
});

test('[Grenze·Rot-Beweis] mit der gemeinsamen Grenze von 512 KB fiele das Sprachmodul knapp unter 1 MiB durch', async () => {
  assert.deepEqual(weicheVerstoesse(await kern()), [], 'ohne die Weiche nach Typ wäre die Probe oben rot');
});
