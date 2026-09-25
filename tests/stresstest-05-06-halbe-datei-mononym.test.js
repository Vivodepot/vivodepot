'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 5 UND 6 · Die halb geschriebene Datei · Der Mononym
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 5 und 6.
   Messwerkzeug: `tools/halbe-datei-und-mononym-messen.js` (dort steht der Befund).
   **Keine Behebung** — beide Posten messen, was ist.

   POSTEN 5, in einem Satz: **der gefährliche dritte Fall existiert nicht.** Es
   gibt keinen Zustand „öffnet und ist heimlich unvollständig" — jede
   Verstümmelung wird laut abgewiesen. Diese Proben halten das fest, damit ein
   späterer Umbau, der eine fehlende Einheit stillschweigend überginge, ROT wird.

   POSTEN 6, in einem Satz: **der Mononym bricht nicht härter, sondern weniger.**
   Die Auftragsvermutung ist gemessen und widerlegt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/halbe-datei-und-mononym-messen.js');

let _gemessen = null;
async function gemessen() {
  if (!_gemessen) _gemessen = await M.messen(ladeKern().V, ladeKern);
  return _gemessen;
}

/* ══ POSTEN 5 ══════════════════════════════════════════════════════════════ */

test('[S5·POSITIVKONTROLLE] der intakte Umschlag öffnet vollständig', async () => {
  /* Ohne sie ist „alles wird abgewiesen" nicht von „nichts öffnet je" zu
     unterscheiden — und dann prüften die vier Proben darunter nichts. */
  const m = await gemessen();
  assert.equal(m.halbeDatei.kontrolleIntakt.geoeffnet, true);
  assert.equal(m.halbeDatei.kontrolleIntakt.vorname, 'Vorher');
  assert.equal(m.halbeDatei.kontrolleIntakt.menschen, 2);
});

test('[S5·DER FALL, DER NICHT EXISTIERT] eine fehlende Einheit wird BENANNT abgewiesen', async () => {
  const m = await gemessen();
  assert.equal(m.halbeDatei.eineEinheitFehlt.geoeffnet, false,
    'kein halb geöffnetes Depot — die Datei geht gar nicht auf');
  assert.match(m.halbeDatei.eineEinheitFehlt.meldung, /fehlt die Einheit/,
    'und die Meldung sagt, WAS fehlt — nicht nur, dass etwas nicht ging');
});

test('[S5] auch die halbe Datei öffnet nicht — dieselbe Meldung, kein Sonderweg', async () => {
  const m = await gemessen();
  assert.equal(m.halbeDatei.haelfteFehlt.geoeffnet, false);
  assert.equal(m.halbeDatei.haelfteFehlt.meldung, m.halbeDatei.eineEinheitFehlt.meldung,
    'eine fehlende Einheit und zwanzig fehlende sind derselbe Fall — es gibt keine Schwelle, ab der es doch geht');
});

test('[S5] eine verfälschte Einheit scheitert an der Entschlüsselung, nicht an einer Prüfsumme', async () => {
  /* AES-GCM authentifiziert selbst. Es braucht keinen zweiten Prüfpfad daneben
     — und genau darum gibt es hier keinen. */
  const m = await gemessen();
  assert.equal(m.halbeDatei.verfaelscht.geoeffnet, false);
});

test('[S5] ein abgeschnittener Text parst nicht — auf keiner Länge', async () => {
  const m = await gemessen();
  for (const g of m.halbeDatei.textGekuerzt) {
    assert.equal(g.parseWirft, true, 'bei ' + (g.anteil * 100) + ' Prozent');
  }
});

test('[S5] der Kern schreibt ohne `keepExistingData` — die alte Fassung steht bis zum Schließen', async () => {
  /* DIE ERSTE ANTWORT DES AUFTRAGS, und sie hängt an EINER Code-Eigenschaft:
     `createWritable()` ohne `keepExistingData` läßt Chromium in eine Swap-Datei
     schreiben und das Original erst bei `close()` ersetzen. An der Plattform
     nachgemessen (21.08.2026, Chromium/OPFS): während des Schreibens UND nach
     einem Abbruch liest die Datei unverändert die alte Fassung.

     Hier steht nur die Code-Seite, denn nur die kann eine Node-Probe halten —
     die Plattform-Seite steht im Bericht, wo sie gemessen wurde. Setzt jemand
     `keepExistingData: true`, wird diese Probe rot, und das ist ihr Zweck. */
  const fs = require('node:fs');
  const path = require('node:path');
  const kern = fs.readFileSync(process.env.KERN_HTML_PATH
    || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.equal(kern.includes('keepExistingData'), false,
    'kein Schreibweg fordert die alten Daten in die Swap-Datei zurück');
  assert.ok(kern.includes('createWritable()'), 'Positivkontrolle: der Schreibweg existiert überhaupt');
});

/* ══ POSTEN 6 ══════════════════════════════════════════════════════════════ */

test('[S6·DIE VERMUTUNG DES AUFTRAGS IST WIDERLEGT] der Mononym bricht weniger, nicht härter', async () => {
  const m = await gemessen();
  for (const [fall, f] of Object.entries(m.mononym)) {
    assert.equal(f.fnHatLeerstelle, false,
      fall + ': kein führendes, doppeltes oder nachlaufendes Leerzeichen im vCard-Namen');
  }
  assert.equal(m.mononym.nurNachname.vcardFN, 'Sukarno', 'ein Name bleibt ein Name');
  assert.equal(m.mononym.beide.vcardFN, 'Ana Silva', 'Positivkontrolle: zwei Namen werden verbunden');
  assert.equal(m.mononym.garKeiner.vcardFN, 'Vivodepot-Kontakt',
    'und ohne jeden Namen steht ein Ersatz, kein leeres Feld');
});

test('[S6] der Datensatz erfindet keinen zweiten Namen', async () => {
  const m = await gemessen();
  assert.deepEqual(m.mononym.nurNachname.claims, { family_name: 'Sukarno' });
  assert.deepEqual(m.mononym.nurVorname.claims, { given_name: 'Sukarno' });
  assert.deepEqual(m.mononym.garKeiner.claims, {},
    'kein Platzhalter, kein Leerstring — der Claim fehlt einfach');
  assert.deepEqual(m.mononym.beide.claims, { given_name: 'Ana', family_name: 'Silva' },
    'Positivkontrolle');
});

test('[S6] das Papierblatt zeigt eine Zeile statt zwei — keine leere Zeile', async () => {
  const m = await gemessen();
  assert.equal(m.mononym.nurNachname.papierZeilen.length, 1);
  assert.equal(m.mononym.beide.papierZeilen.length, 2, 'Positivkontrolle');
  assert.deepEqual(m.mononym.garKeiner.papierZeilen, []);
});

test('[S6·DIE ANTWORT AUF DIE EIGENTLICHE FRAGE] der Name ist Felder mit festen Rollen, kein rollenfreies Feld', async () => {
  /* *„Ist der Name im Bürgersatz ein Feld oder eine Struktur?"* — gemessen:
     alle Namensfelder sind rollengebunden, und KEINES ist für den Namen, wie er
     geschrieben wird. Der Mononym-Randfall wird weiter durch Hineindrücken gelöst
     (schadlos). Der Doppelnachname-Randfall (P19/P20) ist seit A460 (22.08.2026)
     NICHT mehr verlustbehaftet — `secondLastName` gibt ihm einen eigenen, nicht-sensiblen
     Ort statt des zweckentfremdeten `birthName`. Die eigentliche Antwort — ein
     rollenfreies Namensfeld gibt es nicht — bleibt unverändert die. */
  const m = await gemessen();
  assert.deepEqual(m.struktur.namensfelder, ['givenName', 'familyName', 'secondLastName', 'birthName']);
  assert.equal(m.struktur.kenntVollenNamen, false,
    'es gibt kein rollenfreies Namensfeld — das ist die Antwort, nicht ein Versäumnis dieser Probe');
});
