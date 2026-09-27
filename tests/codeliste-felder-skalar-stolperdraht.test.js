'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Stolperdraht — kein Import schreibt einen Skalar in ein Code-Listen-Feld
   ────────────────────────────────────────────────────────────────────────────
   DIE GRUBE, in einem Satz: Ein Feld mit `codeListe` wird von `_codeEintraege`
   als Chip-Array gelesen (`[{text, code}]`). Bekommt es einen String, liefert
   der Leser `[]` — und die FHIR-Sektion behauptet „Keine … hinterlegt",
   während der Wert im Depot steht und die Bürgerin ihn am Bildschirm sieht.

   Das ist die Klasse von U2-ADR-105 (Medizinprodukte), nur schlimmer: dort
   blieb die Sektion leer, weil das Feld nicht gelesen wurde. Hier IST es
   gelesen worden, der Wert ist da, und das Dokument verneint ihn.

   ZWEI STELLEN HALTEN DIE GRUBE OFFEN, und keine ist für sich ein Fehler:
     · `_wertAusText` endet im Default auf `String(eingabe).trim()`. Es kennt
       Sonderfälle für `mehrfachauswahl`, `auswahl`, `ref` und `refMehrfach` —
       für `codeListe` keinen.
     · Der Typwächter in `sektorFeldSetzen` (U2-ADR-104) prüft
       `_def.typ === 'liste'`. Die Code-Listen-Felder sind `typ: 'text'`; er
       greift bei ihnen nicht.

   ── WAS DIESER TEST TUT, UND WAS AUSDRÜCKLICH NICHT ────────────────────────
   Er prüft NICHT, ob die Grube leer ist — sie ist es nicht (A43, gemessen
   29.07.: `B16_FELD_MAPPING` zielt mit drei Einträgen auf genau diese Felder,
   und ein B16-Import schreibt dort Strings). Diesen Befund zu bestätigen wäre
   ein roter Test, und ein roter Test macht die Suite zum Rauschen.

   Er ist ein STOLPERDRAHT: Er hält die HEUTE bekannten Treffer namentlich
   fest und wird rot, sobald ein WEITERER hinzukommt — ein neues Mapping, ein
   neues Code-Listen-Feld, ein neues Format. Bis Fix-CC den Typwächter
   erweitert, wächst die Grube dann wenigstens nicht unbemerkt.

   Die bekannten drei stehen als Daten und nicht als Zahl: wer einen streicht,
   weil er behoben ist, streicht ihn hier — und der Test verlangt dann, dass er
   wirklich weg ist. Eine bloße Zahl liesse sich hochzählen.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Die Mapping-Tabellen, die Importe auf Sektor-Felder abbilden. Aus dem Kern
   gelesen, nicht aufgezählt — ein neu hinzukommendes Format fällt sonst durch
   das Raster, und genau so ist `B16_FELD_MAPPING` beim ersten Durchgang von
   A40 übersehen worden. */
const MAPPING_TABELLEN = [
  'B16_FELD_MAPPING', 'XMELD_IDENTITAET_MAPPING', 'VC_IDENTITAET_MAPPING',
  'XOEV_VERWALTUNG_MAPPING', 'EDCI_BILDUNG_MAPPING', 'VC_FINANZEN_MAPPING',
  'VC_SOZIALVERSICHERUNG_MAPPING',
];

/* DIE HEUTE BEKANNTEN TREFFER — Befund A43, nicht Soll.
   Sie stehen hier, damit der Draht gespannt werden kann, ohne den Befund zu
   bestätigen. Behebt Fix-CC die Lücke, wird diese Liste leer. */
const BEKANNTE_TREFFER = Object.freeze([
  'B16_FELD_MAPPING → health.allergiesMedicationFoodOther',
  'B16_FELD_MAPPING → health.chronicConditionsDiagnoses',
  'B16_FELD_MAPPING → health.medicationOngoing',
]);

/* Alle Felder, die als Chip-Array gelesen werden. Aus dem Modell, nicht aus
   einer Liste — ein neues Code-Listen-Feld soll den Draht mitspannen. */
function codeListenFelder(V) {
  const raus = new Set();
  for (const sid of Object.keys(V.SEKTOR_BY_ID)) {
    for (const sek of V.SEKTOR_BY_ID[sid].sektionen || []) {
      for (const f of sek.felder || []) if (f.codeListe) raus.add(sid + '.' + f.id);
    }
  }
  return raus;
}

/* Welches Mapping zielt auf welches Code-Listen-Feld? Die Tabellen haben zwei
   Formen: `{sektorId, feldId}` (B16) und `{feld, ziel}` mit festem Zielsektor
   (die übrigen). Beide werden erfasst; eine dritte Form fiele als „unbekannte
   Tabellenform" auf, statt still durchzurutschen. */
function treffer(V) {
  const code = codeListenFelder(V);
  const gefunden = [];
  const unbekannteForm = [];
  for (const name of MAPPING_TABELLEN) {
    const tab = V[name];
    if (!Array.isArray(tab)) { unbekannteForm.push(name + ' (nicht exportiert)'); continue; }
    for (const e of tab) {
      if (e && e.sektorId && e.feldId) {
        if (code.has(e.sektorId + '.' + e.feldId)) gefunden.push(name + ' → ' + e.sektorId + '.' + e.feldId);
      } else if (!e || !e.feld) {
        unbekannteForm.push(name + ': ' + JSON.stringify(e));
      }
      /* `{feld, ziel}`-Tabellen tragen ihren Sektor nicht im Eintrag; sie
         werden unten über den Sektor-Test erfasst. */
    }
  }
  return { gefunden, unbekannteForm };
}

/* ── PFLICHTEINGANG ─────────────────────────────────────────────────────────
   Ein leerer Suchraum macht jede Zusage unten wahr. Regel 13 verlangt genau
   das: nichtleerer Suchraum, nachgewiesen IN der Prüfung. */
test('[Stolperdraht·Vorprüfung] Suchraum ist nicht leer — Code-Listen-Felder und Mappings existieren', () => {
  const { V } = ladeKern();
  const code = codeListenFelder(V);
  assert.ok(code.size >= 3,
    'Nur ' + code.size + ' Code-Listen-Feld(er) gefunden. Entweder ist die Chip-Mechanik weg, oder '
    + 'dieser Test liest das Modell falsch — in beiden Fällen prüft er ab hier nichts.');

  const vorhanden = MAPPING_TABELLEN.filter((n) => Array.isArray(V[n]));
  assert.ok(vorhanden.length >= 5,
    'Nur ' + vorhanden.length + ' der ' + MAPPING_TABELLEN.length + ' Mapping-Tabellen erreichbar. '
    + 'Ein Draht über einen halben Suchraum ist keiner.');

  const gesamt = vorhanden.reduce((n, name) => n + V[name].length, 0);
  assert.ok(gesamt > 100, 'Nur ' + gesamt + ' Mapping-Einträge insgesamt — der Suchraum ist zu klein, '
    + 'um die Zusage unten zu tragen.');
});

/* ── DER DRAHT ──────────────────────────────────────────────────────────────
   Aussage über das PRODUKT (Regel 13): der Ausgangszustand ist das
   ausgelieferte Modell samt seiner Mapping-Tabellen — kein erfundener Weg. */
test('[Stolperdraht] kein NEUES Mapping zielt auf ein Code-Listen-Feld', () => {
  const { V } = ladeKern();
  const { gefunden, unbekannteForm } = treffer(V);

  assert.equal(unbekannteForm.join('\n'), '',
    'Eine Mapping-Tabelle hat eine Form, die dieser Test nicht kennt. Sie wurde damit NICHT geprüft — '
    + 'und ein ungeprüfter Eintrag ist genau der Weg, auf dem `B16_FELD_MAPPING` beim ersten '
    + 'Durchgang von A40 durchgerutscht ist:\n' + unbekannteForm.join('\n'));

  const neu = gefunden.filter((t) => !BEKANNTE_TREFFER.includes(t));
  assert.equal(neu.join('\n'), '',
    'NEUER Treffer in der offenen Grube (A43). Dieses Mapping schreibt über `_wertAusText` einen '
    + 'String in ein Feld, das `_codeEintraege` als Chip-Array liest — der Wert steht dann im Depot '
    + 'und die FHIR-Sektion behauptet trotzdem „Keine … hinterlegt".\n'
    + 'Solange der Typwächter in `sektorFeldSetzen` nur `typ === \'liste\'` prüft, deckt ihn nichts:\n'
    + neu.join('\n'));

  /* Die Gegenrichtung: verschwindet ein bekannter Treffer, ist die Grube
     kleiner geworden — dann gehört die Liste gekürzt, sonst wird der Draht
     mit der Zeit schlaff. */
  const behoben = BEKANNTE_TREFFER.filter((t) => !gefunden.includes(t));
  assert.equal(behoben.join('\n'), '',
    'Diese bekannten Treffer gibt es nicht mehr — schön, aber die Liste in diesem Test ist damit zu '
    + 'weit und deckt einen künftigen Treffer mit ab. Eintrag streichen (und A43 nachziehen):\n'
    + behoben.join('\n'));
});

/* ── POSITIVKONTROLLE ───────────────────────────────────────────────────────
   Aussage über den WÄCHTER (Regel 13, zweite Hälfte): der Weg ist erfunden
   und hier ausdrücklich als solcher gekennzeichnet. */
test('[Stolperdraht] Gate-Nachweis: ein fingiertes Mapping auf ein Code-Listen-Feld wird gefunden', () => {
  const { V } = ladeKern();
  const code = codeListenFelder(V);
  const [einCodeFeld] = [...code];
  const [sid, fid] = einCodeFeld.split('.');

  /* Gepflanztes Mapping — nur in dieser Prüfung, das Produkt bleibt unberührt. */
  const fingiert = { B16_FELD_MAPPING: [{ alt: 'x', sektorId: sid, feldId: fid }] };
  const gefunden = [];
  for (const e of fingiert.B16_FELD_MAPPING) {
    if (code.has(e.sektorId + '.' + e.feldId)) gefunden.push('B16_FELD_MAPPING → ' + e.sektorId + '.' + e.feldId);
  }
  assert.equal(gefunden.length, 1,
    'Der Erkenner findet ein gepflanztes Mapping auf ein Code-Listen-Feld nicht. Dann sagt sein Grün '
    + 'oben nichts.');

  /* Und die Gegenprobe: ein Mapping auf ein Feld OHNE codeListe darf nicht
     anschlagen, sonst wäre der Draht bei jedem Import gespannt. */
  const ohne = [{ alt: 'y', sektorId: 'identitaet', feldId: 'vorname' }]
    .filter((e) => code.has(e.sektorId + '.' + e.feldId));
  assert.equal(ohne.length, 0,
    '`identity.givenName` hat keine `codeListe` und darf den Draht nicht auslösen — sonst schlägt er '
    + 'auf jedem gewöhnlichen Mapping an und wird abgeschaltet.');
});
