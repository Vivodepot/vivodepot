'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Lese-App wird nirgends mitgemessen" (12./13.08.2026), Befund 2 —
   der Kern des Auftrags.
   ────────────────────────────────────────────────────────────────────────
   vivodepot-lesen.html führt eigene Kopien der Wertformatierer (`feldWertText`,
   `listenEintragZusammenfassung`, `sektorHTML`, `situationModell`). Vor diesem Zug prüfte
   KEINE dieser Kopien `sensibel` — weder das Schema-Flag noch die Bürger-Überschreibung
   (`data.sensibelFelder`). Wer ein fremdes Depot in der Lese-App öffnet, sah jedes Feld,
   das der Kern in seinen eigenen Exportwegen zurückhält — genau in dem Moment, in dem eine
   dritte Person liest, für den die Zurückhaltung gedacht ist.

   Die Schema-Paritaet des `sensibel`-Flags (165 fehlende Flags, jetzt nachgezogen) steht als
   Invariante 6 in tests/paritaet-kern-lese.test.js. DIESE Datei prüft die zweite Hälfte des
   Befunds: dass die Lese-App das Flag, wo es gesetzt ist, auch wirklich BEACHTET — mit echten
   Mutationsproben, nicht nur Bestandsverhalten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

function findeUnterfeld(V, sektorId, feldId, unterfeldId) {
  const sek = V.SEKTOR_BY_ID[sektorId];
  for (const sektion of sek.sektionen) {
    const f = (sektion.felder || []).find(x => x.id === feldId);
    if (f) return (f.unterFelder || []).find(u => u.id === unterfeldId);
  }
  return null;
}
function findeFeld(V, sektorId, feldId) {
  const sek = V.SEKTOR_BY_ID[sektorId];
  for (const sektion of sek.sektionen) {
    const f = (sektion.felder || []).find(x => x.id === feldId);
    if (f) return f;
  }
  return null;
}

/* ── Rot⇄grün, Listen-Unterfeld — der im Auftrag genannte Beispielfall ───────────────────── */
test('[Befund 2 · rot⇄grün] konten.iban: sensibel=false zeigt die IBAN, sensibel=true hält sie zurück', () => {
  const { V } = ladeLesen();
  const iban = findeUnterfeld(V, 'finance', 'accounts', 'iban');
  assert.ok(iban, 'Test-Voraussetzung: finance.accounts.iban muss existieren');
  const original = iban.sensibel;
  assert.equal(original, true, 'Schema-Stand: iban ist heute als sensibel deklariert (Invariante 6)');

  V.setData({ sektoren: { finance: { accounts: [
    { institution: 'Sparkasse Test', accountType: 'Girokonto', iban: 'DE89 3704 0044 0532 0130 00', note: 'Testkonto' },
  ] } } });

  try {
    iban.sensibel = false;
    const rot = V.sektorHTML('finance');
    assert.match(rot, /DE89/, 'ROT: ohne Sensibel-Flag muss die IBAN erscheinen — sonst prüft die Probe nichts');

    iban.sensibel = true;
    const gruen = V.sektorHTML('finance');
    assert.doesNotMatch(gruen, /DE89/, 'GRÜN: mit Sensibel-Flag darf die IBAN nicht erscheinen');
    assert.match(gruen, /Sparkasse Test/, 'die übrigen, nicht-sensiblen Unterfelder bleiben sichtbar');
    assert.match(gruen, /Girokonto/);
    assert.match(gruen, /Testkonto/);
  } finally {
    iban.sensibel = original;
  }
});

/* ── Rot⇄grün, Top-Level-Feld ─────────────────────────────────────────────────────────────── */
test('[Befund 2 · rot⇄grün] ein sensibles Top-Level-Feld verschwindet aus sektorHTML', () => {
  const { V } = ladeLesen();
  const allergien = findeFeld(V, 'health', 'allergiesMedicationFoodOther');
  assert.ok(allergien, 'Test-Voraussetzung: health.allergiesMedicationFoodOther muss existieren');
  const original = allergien.sensibel;
  assert.equal(original, true, 'Schema-Stand: allergien ist heute als sensibel deklariert (Invariante 6)');

  // allergien trägt eine codeListe (snomedAllergen) — der Wert ist ein Chip-Array, kein
  // roher String (tests/import-formate.test.js:173 zeigt dieselbe Form).
  V.setData({ sektoren: { health: { allergiesMedicationFoodOther: [{ text: 'Penicillin' }, { text: 'Erdnüsse' }] } } });

  try {
    allergien.sensibel = false;
    assert.match(V.sektorHTML('health'), /Penicillin/, 'ROT: ohne Flag sichtbar');

    allergien.sensibel = true;
    assert.doesNotMatch(V.sektorHTML('health'), /Penicillin/, 'GRÜN: mit Flag zurückgehalten');
  } finally {
    allergien.sensibel = original;
  }
});

/* ── Bürger-Überschreibung (data.sensibelFelder) wirkt genauso wie im Kern ───────────────── */
test('[Befund 2] eine Bürger-Überschreibung schaltet ein Sensibel-Feld frei — Schema-Flag bleibt unberührt', () => {
  const { V } = ladeLesen();
  const allergien = findeFeld(V, 'health', 'allergiesMedicationFoodOther');
  const original = allergien.sensibel;
  assert.equal(original, true);

  V.setData({
    sektoren: { health: { allergiesMedicationFoodOther: [{ text: 'Penicillin' }] } },
    sensibelFelder: { health: { allergiesMedicationFoodOther: false } },   // explizite Bürger-Entscheidung: zeigen
  });
  assert.match(V.sektorHTML('health'), /Penicillin/,
    'die explizite Freigabe der Bürgerin gewinnt gegen das Schema-Flag — wortgleich zum Kern');
});

test('[Befund 2] eine Bürger-Überschreibung kann ein NICHT-sensibles Feld zusätzlich zurückhalten', () => {
  const { V } = ladeLesen();
  const notfallkontakt = findeFeld(V, 'health', 'emergencyContacts');
  assert.ok(notfallkontakt);
  assert.notEqual(notfallkontakt.sensibel, true, 'Test-Voraussetzung: heute nicht schema-sensibel');

  V.setData({
    sektoren: { health: { bloodType: 'A+' } },
    sensibelFelder: { health: { bloodType: true } },   // explizite Bürger-Entscheidung: zurückhalten
  });
  assert.doesNotMatch(V.sektorHTML('health'), /A\+/,
    'die explizite Zurückhaltung der Bürgerin gewinnt auch ohne Schema-Flag');
});

/* ── Situationsblatt-Sicht: echtes Sektorfeld über eine Cross-Referenz ───────────────────── */
test('[Befund 2 · rot⇄grün] situationModell hält ein sensibles Sektorfeld zurück, das über eine Situation gezogen wird', () => {
  const { V } = ladeLesen();
  // U2-ADR-089/096: eine Situation zieht ein echtes Sektorfeld über {quelle, feld}. health.generalPractitioner
  // ist unten im Notfallkarten-Kern zwar bewusst ungefiltert (dort gilt die Notfallkarte als eigene
  // Vertrauensgrenze) — situationModell ist ein ANDERER Weg mit einer eigenen Prüfpflicht (Zug 2 der
  // Sensibel-Architektur, 09.08.2026). Wir bauen die Probe direkt gegen ein bekanntes sensibles Feld.
  const hausarzt = findeFeld(V, 'health', 'generalPractitioner');
  assert.ok(hausarzt);
  const original = hausarzt.sensibel;

  // Eine minimale Situation mit genau einem Cross-Ref-Eintrag auf health.generalPractitioner.
  const situation = {
    id: 'test-sit-befund2',
    titel: 'Testblatt',
    einfuehrung: '',
    bloecke: [{ titel: 'Block', eintraege: [{ quelle: 'health', feld: 'generalPractitioner' }] }],
  };
  V.setData({ sektoren: { health: { generalPractitioner: 'Dr. Beispiel' } } });

  try {
    hausarzt.sensibel = false;
    const rot = V.situationModell(situation);
    const textRot = rot.bloecke.flatMap(b => b.zeilen).map(z => z.wert).join(' | ');
    assert.match(textRot, /Dr\. Beispiel/, 'ROT: ohne Flag zieht die Situation den Wert');

    hausarzt.sensibel = true;
    const gruen = V.situationModell(situation);
    // Seit der Entscheidung „hinterlegt, nur mit Freigabe sichtbar“ (19.09.2026): ein gefülltes zurückgehaltenes Feld erscheint mit Namen
    // und dem Freigabe-Satz — nie mit dem Wert, nie als „nicht hinterlegt“.
    const textGruen = JSON.stringify(gruen);
    assert.ok(!textGruen.includes('Dr. Beispiel'), 'GRÜN: der Wert des sensiblen Felds steht nirgends im Modell');
    assert.ok(textGruen.includes(V.STRINGS.zurueckgehaltenVorhanden), 'GRÜN: das gefüllte zurückgehaltene Feld sagt den Freigabe-Satz');
  } finally {
    hausarzt.sensibel = original;
  }
});
