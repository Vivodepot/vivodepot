'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-182 Task 1 (Weg B, Korrektur 28.08.2026): Vor-Depot-Konfiguration,
   leeres Grundgerüst + Ladeweg über <script>-Tag
   ────────────────────────────────────────────────────────────────────────
   ZWEI Kanäle vorher verworfen, nicht angenommen: localStorage verletzt den
   Klasse-A-Wächter tests/nicht-persistenz.test.js; fetch() verletzt die CSP
   `connect-src 'none'` (jeder fetch-Aufruf wird vom Browser selbst geblockt —
   gemessen im echten E2E-Lauf, nicht vermutet). Weg B: ein dynamisch
   eingefügtes `<script src="./vorabkonfiguration.js">` — script-src 'self'
   ist in der CSP bereits erlaubt. Die Datei liefert ein Array roher
   Signatur-Bündel an `window.__vorDepotKonfiguration`, KEIN bereits
   eingebettetes Modul — modulEinlassenGeprueft (volle Zertifikatskette)
   entscheidet einzeln je Bündel, s. tests/vor-depot-konfiguration-anwenden.test.js.
   Schlüssel des leeren Grundgerüsts sind `reg.slot` (z. B. "brandingModule"),
   NICHT `reg.typ` ("branding") — dieselbe Slot-Struktur wie im Depot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function kern() { return ladeKern().V; }

function EINLASS_REGISTER_SLOTS_SORTIERT() {
  // U2-ADR-246 (04.09.2026): 'situationsModule' ergänzt — das achte Register (situation).
  // U2-ADR-250 (04.09.2026): 'wizardsModule' ergänzt — das neunte Register (wizard).
  // U2-ADR-251 (04.09.2026): 'ereignisAchseModule' ergänzt — das zehnte Register (ereignisAchse).
  // U2-ADR-284 (05.09.2026): 'stellensatzModule' ergänzt — das elfte Register (stellensatz).
  // U2-ADR-351 Zug 2 (07.09.2026): 'erscheinungsModule' ergänzt — das zwölfte Register (erscheinung).
  // Auftrag „blattformat" (07.09.2026): 'blattformatModule' ergänzt — das dreizehnte Register.
  return ['textsatzModule', 'rechtsraumModule', 'institutionsArten', 'formatModule',
    'bereichsModule', 'brandingModule', 'logikModule', 'situationsModule', 'wizardsModule',
    'ereignisAchseModule', 'stellensatzModule', 'erscheinungsModule', 'blattformatModule', 'bedingungskatalogModule', 'angehoerigenVorlagenModule'].sort();
}

test('[VDK-Speicher] vorDepotKonfigurationLeer() liefert ein leeres, aber gültiges Grundgerüst — Schlüssel sind Slot-Namen', () => {
  const V = kern();
  const leer = V.vorDepotKonfigurationLeer();
  assert.deepEqual(Object.keys(leer).sort(), EINLASS_REGISTER_SLOTS_SORTIERT());
  for (const slot of Object.keys(leer)) assert.deepEqual(leer[slot], []);
});

test('[VDK-Speicher] vorDepotKonfigurationLaden() ohne Provisionierungs-Datei liefert ein leeres Array, wirft nie', async () => {
  const V = kern();
  const g = await V.vorDepotKonfigurationLaden(async () => undefined);
  assert.deepEqual(g, []);
});

test('[VDK-Speicher] vorDepotKonfigurationLaden() mit unerwartetem (Nicht-Array-)Inhalt liefert ein leeres Array, wirft nie', async () => {
  const V = kern();
  const g = await V.vorDepotKonfigurationLaden(async () => ({ kein: 'array' }));
  assert.deepEqual(g, []);
});

test('[VDK-Speicher] vorDepotKonfigurationLaden() wirft nie, selbst wenn der Lader selbst wirft', async () => {
  const V = kern();
  const wirftImmer = async () => { throw new Error('Skript-Ladefehler'); };
  const g = await V.vorDepotKonfigurationLaden(wirftImmer);
  assert.deepEqual(g, []);
});

test('[VDK-Speicher·Positivkontrolle] vorDepotKonfigurationLaden() reicht ein echtes Array roher Bündel unverändert durch', async () => {
  const V = kern();
  const buendel = [{ providerCredentialJws: 'x', modulSignaturJws: 'y' }];
  const g = await V.vorDepotKonfigurationLaden(async () => buendel);
  assert.deepEqual(g, buendel,
    'ein Fehler, der Laden() immer auf [] zurückfallen ließe, würde dieser Test fangen, die defensiven Tests oben nicht');
});

test('[VDK-Speicher] vorDepotKonfigurationLaden() reicht pfad und globalName an den injizierten Lader weiter', async () => {
  const V = kern();
  let gesehenerPfad = null, gesehenerGlobal = null;
  await V.vorDepotKonfigurationLaden((pfad, globalName) => { gesehenerPfad = pfad; gesehenerGlobal = globalName; return []; });
  assert.equal(gesehenerPfad, './vorabkonfiguration.js');
  assert.equal(gesehenerGlobal, '__vorDepotKonfiguration');
});
