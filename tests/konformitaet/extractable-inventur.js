'use strict';
/* ════════════════════════════════════════════════════════════════════════
   extractable-inventur.js — V1 Runtime-Gate: jeder geheime/private CryptoKey
   ist NICHT extrahierbar (extractable:false)
   ────────────────────────────────────────────────────────────────────────
   Ersetzt die B16-„19/19"-HAND-Zählung (deklariert „automatisch", war aber eine
   datierte Hand-Inventur, 29.05.) durch einen ECHTEN automatischen Gate: wir
   wrappen webcrypto.subtle und protokollieren JEDEN tatsächlich erzeugten
   CryptoKey beim Durchlaufen der V1-Krypto-Pfade (Anker-Anlage, Serialisierung,
   Sub-Depot, JWS). Sicherheits-Invariante: type 'secret'/'private' MUSS
   extractable:false sein. Öffentliche Schlüssel (type 'public') dürfen
   extrahierbar sein (Export des öffentlichen Teils ist legitim).

   Ausführen: node --test tests/konformitaet/extractable-inventur.js
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('../load-kern.js');

// webcrypto.subtle wrappen — own-property-Shadow über die Prototyp-Methoden.
const protokoll = [];
// A26 (08.08.2026): EIN Marker im Protokoll statt einer zweiten Messvorrichtung — der Wächter
// selbst zählt Produkt- und Gerüstphase getrennt. `phase` wird vom aufrufenden Test gesetzt
// (siehe unten), Default 'geruest' — wer den Marker vergisst, zählt sicher als Gerüst, nie
// versehentlich als Produkt.
let phase = 'geruest';
const subtle = webcrypto.subtle;
const verpackt = ['importKey', 'generateKey', 'deriveKey', 'unwrapKey'];
const original = {};
for (const m of verpackt) {
  original[m] = subtle[m].bind(subtle);
  const orig = original[m];
  Object.defineProperty(subtle, m, {
    configurable: true, writable: true,
    value: async function (...args) {
      const res = await orig(...args);
      const keys = !res ? []
        : (res.type ? [res]
        : (res.privateKey ? [res.privateKey, res.publicKey] : []));
      for (const k of keys) protokoll.push({ method: m, type: k.type, alg: k.algorithm && k.algorithm.name, extractable: k.extractable, phase });
      return res;
    },
  });
}
function entpacke() { for (const m of verpackt) Object.defineProperty(subtle, m, { configurable: true, writable: true, value: original[m] }); }

/* ── Diskriminante (B-1, 26.07.): die Verletzungs-Auswahl als EINE Stelle, von Wächter UND
   Negativprobe genutzt. Vorher lag sie inline im Wächter — ohne Probe war ungemessen, ob sie
   feuert (Sweep 26.07. hatte das als „andere Prüfklasse" ausgewiesen; die Ausweisung war falsch,
   die Mutation ist trivial: einen geheimen Schlüssel mit extractable=true erzeugen). */
function schluesselVerletzungen(protokollZeilen) {
  return (protokollZeilen || [])
    .filter(r => r.type === 'secret' || r.type === 'private')
    .filter(r => r.extractable !== false);
}

test('[Negativprobe] die extractable-Inventur feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', async () => {
  // (1) Ein GEHEIMER Schlüssel mit extractable=true — echt erzeugt, nicht simuliert.
  const boese = await original.importKey('raw', new Uint8Array(32), { name: 'AES-GCM' }, true, ['encrypt']);
  const rot = schluesselVerletzungen([{ type: boese.type, extractable: boese.extractable }]);
  assert.equal(rot.length, 1, 'blind: extrahierbarer Geheim-Schlüssel wurde NICHT als Verletzung erkannt');
  // (2) Derselbe Schlüssel mit extractable=false → wieder grün.
  const gut = await original.importKey('raw', new Uint8Array(32), { name: 'AES-GCM' }, false, ['encrypt']);
  assert.deepEqual(schluesselVerletzungen([{ type: gut.type, extractable: gut.extractable }]), [],
    'nach Rücknahme der Mutation nicht wieder grün');
  // Gegenrichtung: ein ÖFFENTLICHER Schlüssel darf extrahierbar sein.
  const paar = await original.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  assert.deepEqual(schluesselVerletzungen([{ type: paar.publicKey.type, extractable: true }]), [],
    'öffentlicher Schlüssel fälschlich als Verletzung gewertet');
});

test('[A26] der Phase-Marker trennt echte Erzeugungen korrekt — nicht nur zwei leere Buckets', async () => {
  const vor = protokoll.length;
  phase = 'produkt';
  await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);   // durch den WRAPPER, nicht `original` — der Marker sitzt im Wrapper
  phase = 'geruest';
  await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
  const neu = protokoll.slice(vor);
  assert.equal(neu.filter(r => r.phase === 'produkt').length, 2, 'Ed25519 erzeugt zwei Schlüssel (privat+öffentlich), beide während phase=produkt markiert');
  assert.equal(neu.filter(r => r.phase === 'geruest').length, 2, 'derselbe Aufruf danach unter phase=geruest markiert — der Marker wechselt wirklich, ist kein Fixwert');
});

test('[Konformität] Runtime: alle geheimen/privaten CryptoKeys sind extractable:false', async (t) => {
  try {
    const { V } = ladeKern();
    // V1-Krypto-Pfade durchlaufen, damit jede Schlüsselstelle einmal feuert.
    // A26: nur der reine Produktpfad (EIN depotAnlegen) zählt als 'produkt' — alles danach
    // (Akteur/Feld/Serialisierung/Sub-Depot/JWS) ist Test-Gerüst, das den Pfad erst befährt,
    // nicht Teil dessen, was „ein Depot anlegen" an Schlüsseln braucht.
    phase = 'produkt';
    await V.depotAnlegen('pw');                                  // Master: HKDF-Import, AES-Schlüssel, deriveKey
    phase = 'geruest';
    V.akteurSelbstErklaeren('B');
    V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
    await V.depotSerialisieren('pw');                            // Verschlüsselungs-Schlüssel
    // Sub-Depot anlegen + öffnen (eigene Schlüssel-Ableitung)
    const e = await V.subDepotAnlegen({ bezeichnung: 'S', inhaberin: 'I', verwaltungsTyp: 'verwaltet', akzent: 'sand' }, 'pw');
    await V.subDepotVertrauenOeffnen(e.depotUUID, 'pw');
    // JWS-Roundtrip (Ed25519/ES256 — privat + öffentlich), falls Schlüsselmaterial erzeugbar
    try {
      const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
      await V._signJWS({ t: 1 }, kp.privateKey, V.JWS_ALG_PRIMAER || 'EdDSA');
    } catch (_) { /* JWS-Pfad optional; Hauptpfade oben decken die Schlüsselstellen */ }

    const geheim = protokoll.filter(r => r.type === 'secret' || r.type === 'private');
    const oeffentlich = protokoll.filter(r => r.type === 'public');
    const verletzungen = schluesselVerletzungen(protokoll);
    // A26: Produkt- und Gerüstphase getrennt ausgeben — „19 Schlüssel, 10 geheim/privat" ist
    // sonst keine Produktaussage, wird aber so gelesen, sobald sie irgendwo neben der App steht.
    const produkt = protokoll.filter(r => r.phase === 'produkt');
    const produktGeheim = produkt.filter(r => r.type === 'secret' || r.type === 'private');
    const geruest = protokoll.filter(r => r.phase === 'geruest');
    const geruestGeheim = geruest.filter(r => r.type === 'secret' || r.type === 'private');

    t.diagnostic(`Erzeugte Schlüssel gesamt: ${protokoll.length} (geheim/privat: ${geheim.length}, öffentlich: ${oeffentlich.length})`);
    t.diagnostic(`  davon Produktphase (depotAnlegen allein): ${produkt.length} (geheim/privat: ${produktGeheim.length})`);
    t.diagnostic(`  davon Gerüstphase (Test-Aufbau danach): ${geruest.length} (geheim/privat: ${geruestGeheim.length})`);
    t.diagnostic('Algorithmen (geheim/privat): ' + JSON.stringify([...new Set(geheim.map(r => r.alg))]));
    t.diagnostic('Algorithmen (geheim/privat, Produktphase): ' + JSON.stringify([...new Set(produktGeheim.map(r => r.alg))]));

    assert.ok(geheim.length > 0, 'mindestens ein geheimer/privater Schlüssel wurde erzeugt (Pfade liefen)');
    assert.ok(produkt.length > 0, 'Produktphase (depotAnlegen) hat mindestens einen Schlüssel erzeugt — der Marker feuert wirklich');
    assert.deepEqual(verletzungen, [],
      `${verletzungen.length} geheime/private Schlüssel sind EXTRAHIERBAR (Sicherheits-Verletzung):\n` +
      verletzungen.map(r => `  ${r.method} ${r.alg} (${r.type}) extractable=${r.extractable}`).join('\n'));
  } finally { entpacke(); }
});

/* ── ENTFERNT 25.07.2026: „[Konformität] Statik: keine extractable:true-Literale im Kern" ──
   Der Test suchte `/extractable:\s*true/` im Kern und war IMMER grün — nicht weil der Kern sauber
   ist, sondern weil das Muster dort NIE entstehen kann: `extractable` ist in der Web-Crypto-API
   ein POSITIONALES Argument, kein benanntes Feld —
     importKey(format, data, algorithm, EXTRACTABLE, usages)
     generateKey(algorithm, EXTRACTABLE, usages) · deriveKey(…, EXTRACTABLE, usages)
   Gemessen (Stufe 6, 25.07.): im Kern existiert kein einziges `extractable:`-Literal (0 Treffer).
   Eine Prüfung, von der man weiß, dass sie nicht anschlagen kann, ist schlechter als keine — sie
   signalisiert Sicherheit, wo nichts gemessen wird, und das im Krypto-Bereich.

   NICHT „reparierend" wieder einbauen. Die statische Seite ist real abgedeckt durch
   `tests/krypto-verbote.test.js#u2-062-geheime-schluessel-nie-extrahierbar` (prüft die echte Form:
   Argument-Position + `usages` — geheim/privat muss `false` tragen, nur reine `verify`-Schlüssel
   dürfen `true`). Die Laufzeit-Seite deckt der Runtime-Test oben ab. Beide sind gebunden in
   U2-ADR-026 (Konformitätsklausel „U2-062 (Schlüssel-Hälfte) / §A2"). */
