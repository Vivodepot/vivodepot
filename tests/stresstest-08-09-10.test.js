'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 8, 9 UND 10
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 8, 9 und 10.
   Messwerkzeug: `tools/gbr-fassungen-modulumfang-messen.js`.
   **Keine Behebung** — so beauftragt.

   MEHRERE DIESER PROBEN HALTEN EINE LÜCKE FEST, keine Zusage. Sie stehen mit
   dem Vermerk da, dass sie UMZUDREHEN sind, sobald die Produktentscheidung entscheidet —
   eine Probe, die eine Lücke festschreibt, ohne es zu sagen, wäre eine
   Zusicherung des Gegenteils.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/gbr-fassungen-modulumfang-messen.js');

let _m = null;
async function gemessen() {
  if (!_m) _m = await M.messen(ladeKern().V, ladeKern);
  return _m;
}

/* ══ POSTEN 8 ══════════════════════════════════════════════════════════════ */

test('[S8·DIE ANTWORT] ein Depot gehört genau einem — es gibt keinen Schlüssel für geteiltes Eigentum', async () => {
  /* MESSUNG, KEINE ZUSAGE. `verwaltungsTyp` kennt `eigen`, `delegiert`,
     `verwaltet` — jeder Wert beschreibt eine Beziehung zu EINER Person. Drei
     Gesellschafter müßten sich auf einen einigen, in dessen Depot der Betrieb
     liegt; die anderen zwei haben keinen Zugang, der aus dem Modell folgt.
     Dieselbe Lücke wie bei P19 (kein Feldtyp für eine juristische Person),
     aber von der Seite der Vertretung. */
  const m = await gemessen();
  assert.equal(m.gbr.verwaltungsTyp, 'eigen');
  assert.deepEqual(m.gbr.schluesselFuerGeteiltesEigentum, [],
    'kein Schlüssel für geteiltes Eigentum, und es ist auch keiner vorgesehen');
  assert.equal(m.gbr.gesellschafter, 2,
    'Positivkontrolle: die Mitgesellschafter sind als MENSCHEN anlegbar — nur nicht als Miteigentümer');
});

/* ══ POSTEN 9 ══════════════════════════════════════════════════════════════ */

test('[S9·DIE ANTWORT] die Anwendung merkt zwei Fassungen NICHT', async () => {
  const m = await gemessen();
  assert.deepEqual(m.fassungen.zeitmarkeImUmschlag, [],
    'der Umschlag trägt keine Zeitmarke, keinen Zähler, keine Fassungsnummer');
  assert.equal(m.fassungen.uuidGleich, true,
    'Positivkontrolle: beide Dateien stammen nachweislich aus demselben Ursprung');
  assert.equal(m.fassungen.zweiteUeberDieErste, 'ohne ein Wort geladen',
    'die zweite Fassung überschreibt die erste kommentarlos');
  assert.equal(m.fassungen.wertNachZweitem, 'anna@example.org',
    'und die Änderung der ersten ist damit aus der Sitzung verschwunden');
});

test('[S9·WORAN SIE ES MERKEN KÖNNTE] die Gabelung ist feldweise erkennbar — das Material liegt in der Datei', async () => {
  /* Der Auftrag verlangt genau diesen zweiten Schritt: „Wenn nein, ist das der
     Befund — und dann die Frage, woran sie es merken könnte."
     GERECHNET, NICHT EINGEBAUT: `depotUUID` sagt „derselbe Ursprung",
     `urheberschaft[bereich][feld][].zeitpunkt` trägt je Feld die letzte
     Änderung. Zwei Dateien mit gleicher UUID und auseinanderlaufenden
     Feld-Zeitpunkten sind eine erkennbare Gabelung — feldweise, nicht nur als
     Ganzes. Damit wäre sogar eine Zusammenführung denkbar statt einer
     Entweder-Oder-Frage. Das zu bauen ist NICHT Gegenstand. */
  const m = await gemessen();
  assert.equal(m.fassungen.gabelungFeldweiseErkennbar, true);
  assert.deepEqual(m.fassungen.nurAufStick, ['telephone']);
  assert.deepEqual(m.fassungen.nurAufPlatte, ['email'],
    'die zwei Fassungen unterscheiden sich in VERSCHIEDENEN Feldern — kein Konflikt, eine Gabelung');
});

/* ══ POSTEN 10 ═════════════════════════════════════════════════════════════ */

test('[S10·DIE AUSWEITUNG · VOLLSTÄNDIG GELÖST 23.08.2026, A466+A476] alle fünf Register benennen einen Schlüssel, den sie nicht lesen', async () => {
  /* Der Befund vom 21.08. — ein Textsatz mit `rechtsraum` wird angenommen und
     die Angabe stillschweigend ignoriert — galt für VIER der fünf Register.
     Laufzettel Nacht 22./23.08.2026: Posten 12 (A466) hat `textsatz` benannt
     gemacht, Posten 15 (A476) dieselbe Ausweitung auf die drei übrigen
     stummen Register vollzogen — `BEREICH_MODUL_SCHLUESSEL`,
     `INSTITUTIONSART_MODUL_SCHLUESSEL`, `_RECHTSRAUM_MODUL_SCHLUESSEL`,
     jeweils wörtlicher Spiegel von `FORMAT_MODUL_SCHLUESSEL`. Alle fünf
     Register wachen jetzt über dieselbe Klasse: der Prüfer wacht über die
     KENNUNGEN, nicht über den UMFANG — dieselbe wie bei `appVersion`. Ein
     Anbieter, der etwas erklärt und „angenommen" zurückbekommt, hat nichts
     erklärt — das gilt jetzt für keines der fünf Register mehr. */
  const m = await gemessen();
  for (const [typ, r] of Object.entries(m.modulumfang)) {
    assert.equal(r.kontrolleOhneFremdschluessel, true,
      'POSITIVKONTROLLE ' + typ + ': die Grundform ohne Fremdschlüssel geht durch');
    assert.equal(r.angenommen, true, typ + ': das Modul wird angenommen');
    assert.equal(r.reistMit, true, typ + ': der Fremdschlüssel liegt danach im gespeicherten Modul');
    assert.equal(r.benannt, true, typ + ': der Fremdschlüssel wird nicht mehr stillschweigend übernommen');
  }
});
