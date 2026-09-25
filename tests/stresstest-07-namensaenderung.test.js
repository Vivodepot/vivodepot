'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 7 · Die Namensänderung — und der Fund, der darüber hinausgeht
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 7.
   Messwerkzeug: `tools/namensaenderung-messen.js` (dort steht der Befund).
   **Keine Behebung** — so beauftragt.

   WAS `birthName` UND `formerNames` TATSÄCHLICH TUN — gemessen, nicht aus
   ihrer Benennung geschlossen: **beide speichern, aber geben nicht heraus.**
   Das ist Absicht (§ 13 SBGG, A159), und die Tür für eine bewusste Freigabe ist
   da und trägt.

   DER FUND WAR EIN ANDERER, und er war nicht namensspezifisch: **die Übersicht
   „Das wird herausgegeben" war blind für sensible Listen-UNTERFELDER.** Sie
   nannte das Trägerfeld unter „enthalten" und schwieg über den Inhalt, der
   still herausgefiltert wurde. BEHOBEN 22.08.2026 (A473, Laufzettel „Die
   Vierunddreissig" Posten 15).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/namensaenderung-messen.js');

let _m = null;
async function gemessen() {
  if (!_m) _m = await M.messen(ladeKern().V);
  return _m;
}

test('[S7] `birthName` und JEDES inhaltstragende Unterfeld von `formerNames` sind sensibel', async () => {
  /* Das ist die Voreinstellung und sie ist die richtige — § 13 SBGG verbietet,
     einen geänderten Geschlechtseintrag zu offenbaren. Diese Probe hält sie
     fest, damit niemand sie versehentlich aufhebt. */
  const m = await gemessen();
  assert.equal(m.katalog.geburtsnameSensibel, true);
  const inhalt = m.katalog.unterfelder.filter((u) => u.typ !== 'hinweis');
  assert.ok(inhalt.length >= 4, 'die Liste trägt Inhalt: ' + inhalt.length + ' Unterfelder');
  for (const u of inhalt) assert.equal(u.sensibel, true, u.id + ' muss sensibel sein');
});

test('[S7·DIE ANTWORT] die frühere-Namen-Liste kommt als NACKTE KENNUNGEN heraus', async () => {
  const m = await gemessen();
  assert.equal(m.ausgabeVorFreigabe.geburtsname, '(nicht im Datensatz)');
  assert.equal(m.ausgabeVorFreigabe.nurKennungen, true,
    'jede Zeile trägt nur noch ihre `id` — Name, Anlass, Datum und Nachweisort sind fort');
  assert.deepEqual(m.ausgabeVorFreigabe.papier.filter((z) => /Frühere/.test(z)),
    ['Frühere Namen='], 'auf dem Papier bleibt die Zeile leer stehen');
  assert.equal(m.ausgabeVorFreigabe.vcard.some((z) => /Vogel/.test(z)), false,
    'und die vCard nennt keinen früheren Namen');
});

test('[S7·POSITIVKONTROLLE] eine bewusste Freigabe bringt beide in den Datensatz', async () => {
  /* Ohne sie wäre „es kommt nichts heraus" nicht von „der Weg ist zu" zu
     unterscheiden. Der Weg ist offen — er ist nur nicht die Voreinstellung. */
  const m = await gemessen();
  assert.equal(m.ausgabeNachFreigabe.geburtsname, 'Vogel');
  assert.deepEqual(m.ausgabeNachFreigabe.fruehereNamen.map((z) => z.name),
    ['Kim Vogel', 'Karsten Vogel']);
});

test('[S7·DER FUND — BEHOBEN 22.08.2026] die Übersicht nennt fruehere_namen jetzt korrekt als zurückgehalten', async () => {
  /* URSPRÜNGLICHER BEFUND (21.08.2026): `exportUebersichtModell` lief im Bereichs-Zweig
     über `sek.felder` und stieg nie in `f.unterFelder` hinab — die Zusicherung „das wird
     herausgegeben darf ein Feld nicht verschweigen, nur weil sein Wert am Zielort liegt"
     brach eine Ebene tiefer. BEHOBEN (A473): dieselbe Sensibel-Architektur wie am realen
     Export (`unterfeldIstSensibel`) entscheidet jetzt auch hier — ist ALLES eingetragene
     Unterfeld-Material sensibel, steht das Trägerfeld unter „zurückgehalten". */
  const m = await gemessen();
  assert.equal(m.uebersicht.listeGiltAlsEnthalten, false,
    '`formerNames` steht NICHT mehr unter „enthalten"');
  assert.deepEqual(m.uebersicht.zurueckgehalten.sort(), ['birthName', 'formerNames'],
    'beide gehören jetzt korrekt zu zurückgehalten');
});

test('[S7·GEGENPROBE] `finance.accounts` bleibt zu Recht enthalten — nur `iban` ist sensibel, nicht die ganze Zeile', async () => {
  const m = await gemessen();
  assert.deepEqual(m.gegenprobeKonten.enthalten, ['accounts'],
    'konten bleibt zu Recht enthalten — bank wird ja herausgegeben');
  assert.deepEqual(m.gegenprobeKonten.zurueckgehalten, []);
  const zeile = m.gegenprobeKonten.imDatensatz[0];
  assert.equal(Object.prototype.hasOwnProperty.call(zeile, 'iban'), false,
    'die IBAN ist still herausgefiltert');
  assert.ok(zeile.institution, 'Positivkontrolle: die nicht-sensible Bank ist sehr wohl da');
});

test('[S7] das Zeugnis von 2005 hat KEINEN strukturellen Bezug auf einen früheren Namen', async () => {
  const m = await gemessen();
  assert.equal(m.dokument.bezugAufFrueherenNamen, false,
    'ein Dokument trägt keinen Schlüssel, der auf einen früheren Namen zeigt');
  assert.match(m.dokument.name, /Karsten Vogel/,
    'der alte Name steht allein im Freitext des Dokumentnamens — als Notiz, nicht als Bezug');
});
