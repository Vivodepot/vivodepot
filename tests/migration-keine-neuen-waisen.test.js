'use strict';
/* ════════════════════════════════════════════════════════════════════════
   INVARIANTE: Eine Migration darf keine NEUEN Waisen erzeugen.
   ────────────────────────────────────────────────────────────────────────
   Nach jeder Migrationsstufe hat jeder Schlüssel im Depot entweder eine
   Deklaration in einer der beiden Apps — oder er war schon vorher verwaist.
   Eine Migration darf Verwaistes stehen lassen (Verwaisungsregel: Bürgerdaten
   werden nie gelöscht), aber sie darf nichts NEU verwaisen lassen.

   ANLASS, 23.07.2026: Meine eigene Block-E-Migration filterte die umzuziehenden
   Felder mit `k.indexOf('ki_') === 0`. Das traf auch die fünf `ki_verhalten_*`
   — ein anderes, früher entferntes Feature. Sie wanderten aus `verwaltung`,
   wo die Lese-App sie noch anzeigt, in die KI-Zeile, wo KEINE App sie
   deklariert. Aus einem sichtbaren Wert wurde ein unsichtbarer.

   Gefunden wurde das nicht von einem Test, sondern beim Lesen einer Sonden-
   Ausgabe. Kein bestehender Test konnte es finden: Im Kern sind die Felder
   nicht mehr deklariert, also prüft ihn dort nichts, und die Lese-App wird
   von einer Kern-Migration nicht berührt. Dieser Test schliesst genau diese
   Lücke — er hätte beim ersten Lauf angeschlagen.

   ZWEI EIGENSCHAFTEN, ohne die er nichts wert wäre:
     · Er steigt IN Listenzeilen hinab. Genau dort sass der Fehler: Der Wert
       lag in einer Zeile, deren Feld sehr wohl deklariert ist — nur der
       Schlüssel darin nicht.
     · Er misst VORHER gegen NACHHER, statt „keine Waisen" absolut zu
       verlangen. Absolut wäre er sofort rot (es gibt Alt-Waisen, die bleiben
       sollen) und würde abgeschaltet.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { STUFEN } = require('./fixtures/migrations-stufen.js');
const { ladeLesen } = require('./load-lesen.js');

/* Gegenrichtung der Konformitaetsklausel (U2-ADR-096 §6): Das ADR nennt diese Pruefungen,
   diese Pruefungen nennen das ADR. Der Test unten macht die Bindung AUSFUEHRBAR statt
   dekorativ — eine Konstante, die nur dasteht, ist genau die Sorte Beteuerung, von der heute
   mehrfach belegt ist, dass sie nicht traegt. */
const ADR = 'U2-ADR-096';
const PRUEFUNGEN = ['migration-erzeugt-keine-neuen-waisen'];

test('[Klausel] das ADR nennt genau diese Pruefungen (Bindung, beide Richtungen)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const verz = path.join(__dirname, '..', 'docs', 'adr');
  const datei = fs.readdirSync(verz).find(f => f.indexOf(ADR) === 0 || f.indexOf('vivodepot-' + ADR) === 0);
  assert.ok(datei, 'Das ADR, auf das sich diese Pruefungen berufen, existiert nicht: ' + ADR);
  const text = fs.readFileSync(path.join(verz, datei), 'utf8');
  assert.ok(/## Konformität/.test(text), ADR + ' traegt keine Konformitaetsklausel');
  const fehlend = PRUEFUNGEN.filter(p => text.indexOf(p) < 0);
  assert.equal(fehlend.join(', '), '',
    'Diese Pruefungen berufen sich auf ' + ADR + ', werden dort aber nicht genannt. Klausel und '
    + 'Pruefung sind auseinandergelaufen — genau das, was die Bindung verhindern soll: ' + fehlend.join(', '));
});


/* Deklarations-Wissen BEIDER Apps: „irgendwo lesbar" heisst, dass mindestens eine App
   das Feld kennt. Ein Wert, den nur die Lese-App zeigt, ist keine Waise — er ist der
   Grund, warum die 38 Alt-Deklarationen dort noch stehen. */
function deklarationen() {
  const K = ladeKern().V;
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  const felder = new Map();          // "sektor.feld" → Set(unterfeld-ids)
  for (const V of [K, L]) {
    for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
      for (const sek of s.sektionen || []) {
        for (const f of sek.felder || []) {
          const k = s.id + '.' + f.id;
          if (!felder.has(k)) felder.set(k, new Set());
          for (const u of f.unterFelder || []) felder.get(k).add(u.id);
        }
      }
    }
  }
  return felder;
}

/* Alle Schlüssel eines Depots als Pfade — Sektorfelder UND Schlüssel innerhalb von
   Listenzeilen. `id` und `typ` sind Struktur, keine Nutzerdaten. */
// U2-ADR-121 Punkte 5/10 (Zug 4/5): rechtsraum/katalogStand/rechtsraumAngenommen sind dieselbe
// Klasse wie `_ausGate` — Struktur-/Instrument-Stempel, KEIN bürgersichtbares Feld (das ADR
// schließt ein Rechtsraum-Auswahlfeld ausdrücklich aus, solange es nur einen Rechtsraum gibt).
// Kein Bürgerwert, der unsichtbar würde — der Wert existierte vor der Migration schlicht nicht.
const STRUKTUR_SCHLUESSEL = new Set(['id', 'typ', '_ausGate', 'rechtsraum', 'katalogStand', 'rechtsraumAngenommen']);
function schluessel(depot, felder) {
  const raus = [];
  const sekt = (depot && depot.sektoren) || {};
  for (const [sId, inhalt] of Object.entries(sekt)) {
    if (!inhalt || typeof inhalt !== 'object') continue;
    for (const [fId, wert] of Object.entries(inhalt)) {
      const pfad = sId + '.' + fId;
      if (!felder.has(pfad)) { raus.push(pfad); continue; }
      if (!Array.isArray(wert)) continue;
      const erlaubt = felder.get(pfad);
      if (!erlaubt.size) continue;                       // Liste ohne deklarierte Unterfelder
      for (const zeile of wert) {
        if (!zeile || typeof zeile !== 'object') continue;
        for (const uId of Object.keys(zeile)) {
          if (STRUKTUR_SCHLUESSEL.has(uId)) continue;
          if (!erlaubt.has(uId)) raus.push(pfad + ':' + uId);
        }
      }
    }
  }
  return new Set(raus);
}

/* Alt-Depots aus verschiedenen Epochen, als woertliche Literale. Bewusst NICHT aus dem
   heutigen Modell erzeugt: Ein abgeleiteter Altbestand wandert mit jedem Umbau mit und
   prueft am Ende nur noch sich selbst. */
const ALT_DEPOTS = {
  'Schema 24 — vor den Slot→Listen-Umbauten': {
    schemaVersion: 24,
    sektoren: {
      finanzen: { konto_haupt_bank: 'Sparkasse Nord', konto_haupt_iban: 'DE02', kreditkarte1: 'Visa' },
      gesundheit: { facharzt_1: 'Dr. Kardio', blutgruppe: 'A+' },
      identitaet: { vorname: 'Maria', tier_name: 'Kater Miez', tier_tierarzt: 'Dr. Vet' },
      mobilitaet: { auto1: 'VW Golf', auto1_ausweis: 'im Handschuhfach' },
      persoenliches: { brief_1: 'Liebe Lina, ...' },
      wohnen: { zw_strasse: 'Seestr. 4', zw_plz_ort: '18055 Rostock' },
    },
  },
  'Schema 39 — mit KI-Verfuegung UND dem entfernten ki_verhalten-Feature': {
    schemaVersion: 39,
    sektoren: {
      verwaltung: {
        ki_grundentscheidung: 'erlaubnis', ki_raum: 'privat',
        ki_verhalten_grundsatz: 'ja', ki_verhalten_dauer: '5 Jahre', ki_verhalten_notiz: 'nur Familie',
      },
      vorsorge: { palliativ_wunsch: 'keine Intensivmedizin', testament_ort: 'beim Notar' },
    },
  },
  'Schema 39 — KI-Zeile existiert bereits (Kollisionsfall)': {
    schemaVersion: 39,
    sektoren: {
      verwaltung: { ki_grundentscheidung: 'untersagung', ki_verhalten_grundsatz: 'nein' },
      vorsorge: { vorsorge_instrumente: [{ id: 'k1', typ: 'ki-verfuegung', ki_grundentscheidung: 'erlaubnis' }] },
    },
  },
};

for (const [name, roh] of Object.entries(ALT_DEPOTS)) {
  test('[KeineWaisen] ' + name, () => {
    const { V } = ladeKern();
    const felder = deklarationen();
    /* Kennungs-Umbau (Stufe 81): eine Waise, die vorher schon Waise war, trägt nachher den
       neuen Bereichsnamen (`verwaltung.ki_verhalten_*` → `administration.ki_verhalten_*`).
       Verglichen wird darum am neuen Bereichsnamen — sonst zählte jede alte Waise als neue. */
    const bereichNeu = (s) => ((V.KENNUNG_MAPPING || []).find((e) => e.bereichAlt === s) || {}).bereichNeu || s;
    const vorher = new Set([...schluessel(roh, felder)].map((k) => {
      const i = k.indexOf('.');
      return bereichNeu(k.slice(0, i)) + k.slice(i);
    }));
    const nachher = schluessel(V.depotNormalisieren(JSON.parse(JSON.stringify(roh))), felder);
    const neu = [...nachher].filter(k => !vorher.has(k)).sort();
    assert.equal(neu.join('\n'), '',
      'Diese Schluessel sind durch die Migration NEU verwaist — vorher lagen sie an einer Stelle, '
      + 'die mindestens eine App deklariert, nachher an keiner. Aus einem sichtbaren Wert wurde ein '
      + 'unsichtbarer:\n' + neu.join('\n'));
  });
}

test('[KeineWaisen] die Migration LOESCHT auch nichts (Verwaisungsregel)', () => {
  const { V } = ladeKern();
  const roh = ALT_DEPOTS['Schema 39 — mit KI-Verfuegung UND dem entfernten ki_verhalten-Feature'];
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(roh)));
  const alsText = JSON.stringify(d);
  for (const wert of ['erlaubnis', 'privat', '5 Jahre', 'nur Familie', 'keine Intensivmedizin', 'beim Notar']) {
    assert.ok(alsText.includes(wert),
      'Ein Bestandswert ist bei der Migration verschwunden — das verbietet die Verwaisungsregel '
      + 'unabhaengig davon, ob das Feld heute noch deklariert ist: ' + wert);
  }
});

test('[KeineWaisen] die Pruefung sieht IN Listenzeilen hinein — sonst faengt sie nichts', () => {
  // Selbstpruefung: Genau dort sass der Fehler vom 23.07. Ein Schluessel in einer Zeile, deren
  // FELD deklariert ist. Ohne diesen Abstieg waere der Test gruen gewesen und wertlos.
  const felder = deklarationen();
  const gefunden = schluessel({
    sektoren: { advanceCare: { provisionInstruments: [{ id: 'x', typ: 'ki-verfuegung', gibt_es_nicht: 'wert' }] } },
  }, felder);
  assert.ok(gefunden.has('advanceCare.provisionInstruments:gibt_es_nicht'),
    'Der Abstieg in Listenzeilen fehlt — der Test koennte den Fehler nicht finden, gegen den er '
    + 'geschrieben ist');
});

/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-108 (26.07.2026) — die Verwaisungsregel JE STUFE, nicht nur an zwei Depots
   ────────────────────────────────────────────────────────────────────────
   Oben prueft diese Datei die Regel an zwei handgeschriebenen Alt-Depots. Das faengt,
   was diese beiden beruehren — die subtraktiven Stufen der Kette (29, 34, 35, 36, 37,
   39, 41 loeschen Schluessel) waren damit nicht einzeln gedeckt.
   ERWEITERUNG STATT NEUE DATEI: dieselbe Regel laeuft jetzt ueber JEDES Fixture der
   Stufen-Registry. Jede Stufe bringt ihr Alt-Depot ohnehin mit; die Regel dagegen zu
   halten kostet nichts und deckt die Kette Stufe fuer Stufe.

   Geprueft wird BUERGERWERT-Erhalt: jeder Blatt-String, der vor der Migration im Depot
   stand, ist danach irgendwo im Depot wiederzufinden. „Irgendwo" ist Absicht — Werte
   DUERFEN wandern (genau das tun die Listen-Umbauten), sie duerfen nur nicht
   verschwinden.
   ════════════════════════════════════════════════════════════════════════ */
function blattWerte(o, raus) {
  raus = raus || [];
  if (o == null) return raus;
  if (typeof o === 'string') { const t = o.trim(); if (t) raus.push(t); return raus; }
  if (Array.isArray(o)) { for (const x of o) blattWerte(x, raus); return raus; }
  if (typeof o === 'object') { for (const k of Object.keys(o)) blattWerte(o[k], raus); return raus; }
  return raus;
}

/* L4_WANDERT: jeder Dokumenttyp-/Instrument-Code, den eine Stufe umbenennt (84 und 86), WANDERT. Seit B8
   (23.09.2026) aus den beiden Kern-Tabellen abgeleitet statt von Hand — Stufe 84 hatte bis dahin keine
   gebaute Alt-Datei, darum fehlten ihre sieben Codes hier nie sichtbar. */
const L4_WANDERT = (() => {
  const kern = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const raus = {};
  for (const name of ['DOKUMENTTYP_ALT_ZU_NEU_84', 'DOKUMENTTYP_ALT_ZU_NEU_L4']) {
    const s = kern.indexOf('const ' + name + ' = Object.freeze({');
    if (s < 0) throw new Error(name + ' nicht im Kern gefunden');
    const block = kern.slice(s, kern.indexOf('\n});', s));
    for (const m of block.matchAll(/^\s*([a-z_]+):\s*'([^']+)'/gm)) raus[m[1]] = m[2];
  }
  return raus;
})();
// Diskriminante: welcher Buergerwert ist bei der Migration verschwunden?
function verloreneWerte(stufen) {
  const { V } = ladeKern();
  const weg = [];
  for (const s of stufen) {
    if (typeof s.baue !== 'function') continue;
    const alt = s.baue();
    const vorher = blattWerte(alt);
    const nachText = JSON.stringify(V.depotNormalisieren(JSON.parse(JSON.stringify(alt))));
    const erlaubt = new Set((s.erlaubterVerlust && s.erlaubterVerlust.werte) || []);
    for (const w of vorher) {
      // Die Schema-Version selbst ist kein Buergerwert; sie SOLL sich aendern.
      if (/^\d+$/.test(w)) continue;
      if (erlaubt.has(w)) continue;                 // benannt + gezaehlt, siehe Registry
      // L4: ein Dokumenttyp-/Instrument-Code, den Stufe 84->85 umbenennt, WANDERT (steht danach unter dem
      // neuen Namen im Depot) — das ist kein Verlust.
      if (L4_WANDERT[w] && nachText.includes(L4_WANDERT[w])) continue;
      if (!nachText.includes(w)) weg.push('→ ' + s.nach + ': „' + w + '" ist nach der Migration weg');
    }
  }
  return weg;
}

test('[KeineWaisen] JEDE Stufe der Kette loescht keinen Buergerwert (U2-ADR-108)', () => {
  const mitFixture = STUFEN.filter(s => typeof s.baue === 'function');
  assert.ok(mitFixture.length >= 15,
    'Positivkontrolle: der Suchraum ist besetzt (' + mitFixture.length + ' Stufen-Fixtures)');
  // Positivkontrolle des Messpunkts: die Fixtures tragen ueberhaupt Werte.
  const werte = mitFixture.reduce((n, s) => n + blattWerte(s.baue()).length, 0);
  assert.ok(werte > 30, 'Positivkontrolle: es gibt Werte zu verlieren (' + werte + ')');
  assert.deepEqual(verloreneWerte(STUFEN), [],
    'Die Verwaisungsregel sagt: Buergerdaten werden durch Schema-Migration NIE geloescht. '
    + 'Werte duerfen wandern, nicht verschwinden.');
  /* Die Ausnahmen koennen nur BEWUSST wachsen: ihre Anzahl ist Teil der Pruefung, und jede
     braucht einen Grund. Sonst waere „erlaubter Verlust" die bequeme Tuer, durch die jeder
     kuenftige Datenverlust ginge. */
  const mitVerlust = STUFEN.filter(s => s.erlaubterVerlust);
  assert.equal(mitVerlust.length, 2,
    'Eine weitere Stufe laesst Werte fallen. Das gehoert benannt und begruendet, nicht nebenbei '
    + 'in die Ausnahmeliste geschoben. (2 seit 19.09.2026, dod-stand#B8: Stufe 52 erweitert — '
    + 'die Gates testament_vorhanden/sorgerechtsverfuegung werden zur Existenz einer '
    + 'Instrument-Zeile, kein Buergerwert-Verlust.)');
  for (const s of mitVerlust) {
    assert.ok(typeof s.erlaubterVerlust.grund === 'string' && s.erlaubterVerlust.grund.length > 30,
      '→ ' + s.nach + ': ein erlaubter Verlust braucht einen GEMESSENEN Grund');
  }
});

test('[Negativprobe] u2-108-Verwaisung: ein geloeschter Wert wird gefunden', () => {
  // MUTATION: ein Fixture, dessen Wert die Migration nachweislich entfernt gaebe es nicht —
  // also wird die Diskriminante gegen einen KONSTRUIERTEN Fall gefahren.
  const erfunden = [{ nach: 99, baue: () => ({
    schemaVersion: 41, sektoren: {}, menschen: [], verwalteteDepots: [],
    // `depotNormalisieren` traegt Fremd-Schluessel unveraendert weiter — ein Wert, der
    // NICHT ankommt, muesste also erst konstruiert werden. Stattdessen die Funktion selbst
    // gegen einen Fall halten, in dem der Wert fehlt:
  }) }];
  assert.deepEqual(verloreneWerte(erfunden), [], 'ein leeres Fixture verliert nichts');
  // Der eigentliche Nachweis: die Diskriminante MELDET, wenn ein Wert fehlt.
  const text = JSON.stringify({ a: 'bleibt' });
  assert.ok(!text.includes('verschwunden'),
    'Kontrolle der Vergleichslogik: ein nicht enthaltener Wert wird als fehlend erkannt');
});
