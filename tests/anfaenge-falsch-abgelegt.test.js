'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   TEIL B, NACHTRAG — alle falsch abgelegten Anfänge, vor der Migrationsstufe
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Punkt 4 des A445-Berichts — CC hatte EINEN Fall gemeldet und nicht
   nach weiteren gesucht. Der Auftrag nennt das „den Punkt, an dem der ganze
   Schnitt scheitern kann": ein zweites falsch abgelegtes Feld, das erst nach der
   Migration auffällt, ist eine ZWEITE Umstellung über Dateien, die niemand
   einsammeln kann.

   GEMESSEN am 21.08.2026 mit `tools/anfaenge-falsch-abgelegt-erheben.js`:

     Gegenstand: 42 Felder (Datumsfelder + markierte), davon 16 mit `laeuftAb`
                  — die Rohzahl von SP Bau ist damit exakt bestätigt
     Funde: 9 — sieben Anfänge und zwei, deren Beschriftung BEIDES nennt

   DER STÄRKSTE FUND STAND IN KEINER ROHLISTE: die drei `…_ausgestellt`-Felder.
   Das Ausstellungsdatum IST der Beginn der Gültigkeit, und sein Gegenstück
   (`…_gueltig`) trägt bereits `laeuftAb`. **Die zwei Hälften desselben Zeitraums
   liegen in zwei Feldern — eine markiert, eine nicht.**

   KEIN UMMARKEN. Die Liste wird erhoben, nicht ausgeführt; ausgeführt wird sie
   mit der Migrationsstufe, wenn die Produktentscheidung sie freigibt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/anfaenge-falsch-abgelegt-erheben.js');

function mess() {
  const { V } = ladeKern();
  return M.messen(V);
}

test('[Anfänge·Positivkontrolle] der Sucher findet einen gepflanzten Anfang und lässt ein Ende stehen', () => {
  /* BEIM ERSTEN LAUF WAR DIESE PROBE ROT, und der Grund steht im Werkzeug: das Muster trug
     `\bbeginn\b`, und im Deutschen ist der Anfang meist ein Kompositum — „Mietbeginn",
     „Rentenbeginn". Ein Erkenner, der zu kurz greift, meldet still zu wenig; genau dafür ist
     die gepflanzte Probe da. */
  const m = mess();
  assert.equal(m.selbstpruefung.probeAnfangGefunden, true,
    'der gepflanzte Anfang wird nicht gefunden — der Sucher greift zu kurz');
  assert.equal(m.selbstpruefung.probeEndeGefunden, false,
    'das gepflanzte Ende wird gefunden — der Sucher greift zu weit');
});

test('[Anfänge·Selbstprüfung] jedes Feld im Gegenstand trägt eine Entscheidungszeile', () => {
  const m = mess();
  assert.deepEqual(m.selbstpruefung.ohneZeile, [],
    'diese Felder sind im Gegenstand und ungeprüft — ein Feld ohne Zeile ist nicht „kein Fall", '
    + 'sondern eine ungestellte Frage:\n' + m.selbstpruefung.ohneZeile.join(', '));
  assert.deepEqual(m.selbstpruefung.verwaist, [],
    'diese Zeilen zeigen auf Felder, die es nicht (mehr) gibt:\n' + m.selbstpruefung.verwaist.join(', '));
});

test('[Anfänge·Zug 2] die Rohzahl ist erklärt: 10 nach der Feld-Remarkierung', () => {
  /* Prüfstein, nicht Vorgabe — der Auftrag verlangt, eine Abweichung an den FÄLLEN zu
     erklären. 16 → 11 (Schnitt Glied 3, s. u.) → 10 (Auftrag „Die Feld-Remarkierung",
     23.08.2026): `finance.companyPensionAgreedStartDate` trägt jetzt `giltAb` statt `laeuftAb` — die hier
     erhobene R1-Verwechslung ist behoben, s. Test „R1" unten.

     Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): 16 → 11. Fünf `laeuftAb`-Felder
     (`identitaet.ausweis_gueltig`, `identitaet.aufenthaltstitel_gueltig`,
     `mobilitaet.elefand_gueltig`, `gesundheit.krankenkassenkarte_gueltig`,
     `sozialversicherung.schwerbehindertenausweis_gueltig`) sind zu Listen-Unterfeldern
     geworden und tragen als solche GAR KEINE Marke mehr (Unterfelder ohne `marken` im Kern,
     s. `korb1-mehrwertig-pruefermine.test.js`) — echter Wegfall, keine Umbenennung wie bei
     den Anfängen oben. */
  const m = mess();
  assert.equal(m.gegenstand.mitLaeuftAb, 10,
    'die Zahl weicht ab — dann gehört der Unterschied an den Fällen erklärt, nicht an der Zahl');
});

test('[Anfänge·R1·BEHOBEN 23.08.2026] der gemeldete Fall ist korrigiert, der zweite Verdacht bleibt unentschieden', () => {
  /* NACHTRAG (Auftrag „Die Feld-Remarkierung"): `bav_rentenbeginn` trägt jetzt `giltAb` (mit
     Migration, Schema 74→75, s. `tests/feld-remarkierung-bav-rentenbeginn.test.js`). Er bleibt
     ein `funde`-Eintrag (die statische ENTSCHEIDUNG-Tabelle klassifiziert ihn weiterhin als
     ANFANG — das ist weiterhin sachlich richtig, nur die MARKE war falsch), aber `richtung`
     ist NICHT mehr R1: dieser Erkenner prüft nur auf `laeuftAb`, kein R1 mehr heißt „nicht mehr
     falsch markiert" (auch wenn die Bezeichnung „R2" hier eine Ungenauigkeit des Werkzeugs ist,
     s. Kommentar im Werkzeug — es unterscheidet „unmarkiert" nicht von „korrekt giltAb"). */
  const m = mess();
  const bav = m.funde.find((f) => f.schluessel === 'finance.companyPensionAgreedStartDate');
  assert.ok(bav, '`bav_rentenbeginn` fehlt in der Liste');
  assert.equal(bav.einordnung, M.ANFANG);
  assert.ok(!bav.richtung.startsWith('R1'), 'er sollte nicht mehr als falsch markiert (R1) gelten: ' + bav.richtung);

  const priv = m.funde.find((f) => f.schluessel === 'finance.privatePensionProvisionAgreed');
  assert.ok(priv, '`private_av_ablauf` fehlt in der Liste');
  assert.equal(priv.einordnung, M.BEIDES,
    'die Beschriftung nennt „Ablauf/Rentenbeginn" — wer das entscheidet, statt es zu benennen, '
    + 'rät an einer Stelle, die nach einer Migration nicht mehr billig zu ändern ist');
});

test('[Anfänge·R2·BEHOBEN 22.08.2026] das verbleibende Ausstellungsdatum trägt `giltAb`, sein `_gueltig`-Zwilling bleibt `laeuftAb`', () => {
  /* Dieser Fund stand in keiner Rohliste. Er war der teuerste, weil er ohne Marke nichts
     verlor — und beim Markieren umzieht. Schnitt Glied 1 (22.08.2026, A445) hat genau das
     additiv nachgezogen: KEIN Bestandswert bewegt sich (der Lesepfad fällt zurück, solange
     `feldGueltigkeit` für dieses Feld leer ist). Zwei Felder DERSELBEN Sache tragen jetzt
     bewusst verschiedene Marken — das ist keine Kollision, es sind zwei unterschiedliche Werte
     (Ausstellung = Anfang, Gültigkeit = Ende).

     Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): zwei der drei Paare — identitaet.ausweis_*
     und identitaet.aufenthaltstitel_* — sind seither Listen-Unterfelder (`ausweis`/
     `aufenthaltstitel`, unterFelder `ausgestellt`/`gueltig`, Schlüssel jetzt mit `/` statt `_`).
     Sie bleiben als ANFANG-Fund stehen (nur der Schlüssel ändert sich, s. ENTSCHEIDUNG-Tabelle
     im Werkzeug) — tragen aber als Unterfeld GAR KEINE Marke mehr (Unterfelder werden hier
     nicht markiert — dieselbe Grenze wie beim Wegfall von `laeuftAb`, s.
     m1-umzug-gueltigkeit.test.js). Kein Ummarken nachgezogen, dokumentierter Gap: nur das
     dritte Paar (`mobilitaet.reisepass_*`) blieb Flachfeld und belegt die Behebung noch. */
  const { V } = ladeKern();
  const m = M.messen(V);
  const felder = M.felderSammeln(V);
  for (const paar of [['mobility.passportIssuedOn', 'mobility.passportValidUntil']]) {
    const [anfang, ende] = paar;
    const f = m.funde.find((x) => x.schluessel === anfang);
    assert.ok(f && f.einordnung === M.ANFANG, anfang + ' steht nicht als Anfang in der Liste');
    assert.deepEqual((felder.find((x) => x.schluessel === anfang) || {}).marken, ['giltAb'],
      anfang + ' trägt nicht (mehr) genau `giltAb`');
    assert.ok(((felder.find((x) => x.schluessel === ende) || {}).marken || []).includes('laeuftAb'),
      ende + ' trägt `laeuftAb` nicht mehr — der Befund ist dann neu zu messen');
  }
  for (const umbenannt of ['identity.idDocuments/issuedOn', 'identity.residencePermit/issuedOn']) {
    const f = m.funde.find((x) => x.schluessel === umbenannt);
    assert.ok(f && f.einordnung === M.ANFANG, umbenannt + ' steht nicht mehr als Anfang in der Liste');
    assert.deepEqual((felder.find((x) => x.schluessel === umbenannt) || {}).marken, [],
      umbenannt + ' ist ein Listen-Unterfeld und trägt keine eigene Marke');
  }
});

test('[Anfänge] die `frist`-Felder sind kein Fall — und das steht bei ihnen', () => {
  /* Eine Frist NIMMT ETWAS WEG, wenn sie verstreicht; eine Gültigkeit erneuert man. Der Wert
     bleibt darum im Bereich und wandert nicht nach `feldGueltigkeit` (A419). Sie hier
     mitzuzählen hiesse, zwei verschiedene Sachen in eine Migration zu werfen. */
  const m = mess();
  for (const k of ['socialInsurance.registeredAsJobSeekingOn', 'housing.moveOutDate']) {
    assert.equal(M.ENTSCHEIDUNG[k][0], M.KEIN_FALL, k + ' ist kein `frist`-Fall mehr');
    assert.ok(!m.funde.some((f) => f.schluessel === k), k + ' steht fälschlich in der Liste');
  }
});

test('[Anfänge·Schnitt Glied1+Feld-Remarkierung] alle sieben Anfänge sind ausgeführt — die zwei doppeldeutigen bleiben unangetastet', () => {
  /* Ursprünglicher Auftrag (21.08.): „Kein Ummarken in diesem Zug." Schnitt Glied 1 (22.08.)
     führte den additiven Teil aus: sechs der sieben erhobenen Anfänge waren GAR NICHT markiert
     und trugen `giltAb`. `finance.companyPensionAgreedStartDate` (siebter Anfang, bereits `laeuftAb` mit
     echten Bestandswerten) blieb bewusst stehen — das Flippen war eine Migration.

     NACHTRAG 23.08.2026 (Auftrag „Die Feld-Remarkierung"): genau diese Migration ist jetzt
     gefahren (Schema 74→75) — alle SIEBEN ursprünglich erhobenen Anfänge tragen `giltAb`. Die
     zwei doppeldeutigen Fälle (`finance.privatePensionProvisionAgreed`, `verwaltung.verwaltung_vorgaenge/
     datum`) bleiben unentschieden und unangetastet — Wahl, keine Korrektur.

     Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): zwei der sieben Felder
     (`identitaet.ausweis_ausgestellt`, `identitaet.aufenthaltstitel_ausgestellt`) sind seither
     Listen-Unterfelder — sie tragen darum gar keine Marke mehr (Unterfelder bleiben hier
     unerfasst, dokumentierter Gap, s. Test oben). Von sieben auf fünf bleiben. */
  const { V } = ladeKern();
  const mitGiltAb = M.felderSammeln(V).filter((f) => (f.marken || []).includes('giltAb'));
  const erwartet = [
    'finance.companyPensionAgreedStartDate', 'mobility.passportIssuedOn', 'people.childrenAndDependants/validSince',
    'people.maintenanceObligationsAnd/start', 'advanceCare.provisionInstruments/appointedSince',
  ];
  assert.deepEqual(mitGiltAb.map((f) => f.schluessel).sort(), erwartet.slice().sort());
  const mitLaeuftAb = M.felderSammeln(V).filter((f) => (f.marken || []).includes('laeuftAb'));
  assert.ok(!mitLaeuftAb.some((f) => f.schluessel === 'finance.companyPensionAgreedStartDate'),
    'bav_rentenbeginn ist migriert — sollte nicht mehr bei laeuftAb stehen');
});

test('[Anfänge·Grenzwächter] wächst oder schrumpft die Liste, ist das ein BEFUND', () => {
  /* KEIN NACHZIEHEN DIESER ZAHL. An dieser Liste hängt der Umfang der Migrationsstufe; ändert
     sie sich, gehört das gemeldet, bevor die Zahl angefasst wird.

     Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): die Zahl bleibt 9 — `identitaet.
     ausweis_ausgestellt`/`aufenthaltstitel_ausgestellt` sind zu Listen-Unterfeldern geworden
     (Schlüssel jetzt `identity.idDocuments/issuedOn` u. ä., s. `felderSammeln`), bleiben aber
     als Fund/ANFANG stehen — das ist eine Umbenennung des Schlüssels, kein Verschwinden des
     Falls (anders als bei `giltAb`/`laeuftAb` selbst, s. Test „Schnitt Glied1" oben, wo die
     Marke tatsächlich entfällt). Der ENTSCHEIDUNG-Registrierungseintrag in
     `tools/anfaenge-falsch-abgelegt-erheben.js` wurde entsprechend umbenannt. */
  const m = mess();
  assert.equal(m.funde.length, 9,
    'die Liste hat sich verändert. Sie ist der Umfang der Migrationsstufe — die Änderung gehört '
    + 'in einen Bericht, bevor diese Zahl angefasst wird.');
  assert.equal(m.funde.filter((f) => f.einordnung === M.ANFANG).length, 7);
  assert.equal(m.funde.filter((f) => f.einordnung === M.BEIDES).length, 2);
});
