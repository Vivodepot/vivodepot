'use strict';
/* U2-ADR-307 — die Rechtsraum-Überlagerung für Feld-Fristen.

   Eine Frist steht heute IM FELD, also ist der Fristhinweis so rechtsraum-blind wie das
   Feld. Das trägt, solange es einen Rechtsraum gibt. Das Produktmodell sieht zwei vor —
   und ein Rechtsraum-Modul, das keine Frist ändern kann, wäre dekorativ.

   DIE AUFLAGE, DIE DIESE PROBEN HALTEN: ohne geladenes Modul gilt die Feldregel
   unverändert, Byte für Byte wie heute. Additiv, nie ersetzend im Leerfall. */
const { test } = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

/* Das Feld, an dem gemessen wird: § 4 Satz 1 KSchG, drei Wochen ab Kündigungsdatum. */
const KENNUNG = 'socialInsurance.terminationDate';
const HEUTE = new Date('2026-09-05T12:00:00Z');

function feldHolen(V, sektorId, feldId) {
  const s = V.SEKTOREN.find((x) => x.id === sektorId);
  for (const sek of (s.sektionen || [])) {
    const f = (sek.felder || []).find((x) => x.id === feldId);
    if (f) return f;
  }
  return null;
}

test('[Rechtsraum·LEERFALL] ohne Modul ist der Hinweis identisch zu dem ohne Kennung', () => {
  const { V } = ladeKern();
  const feld = feldHolen(V, 'socialInsurance', 'terminationDate');
  assert.ok(feld && feld.fristRegel, 'das Messfeld trägt keine fristRegel mehr — die Probe läuft ins Leere');
  const daten = { terminationDate: '2026-08-20' };

  const ohneKennung = V._fristHinweisFuerFeld(feld, null, daten, HEUTE);
  const mitKennung = V._fristHinweisFuerFeld(feld, null, daten, HEUTE, KENNUNG);
  assert.equal(mitKennung, ohneKennung,
    'die Kennung allein verändert den Hinweis — die Überlagerung ist NICHT additiv, und ein Depot '
    + 'ohne Rechtsraum-Modul sähe etwas anderes als heute');
  assert.ok(ohneKennung.length > 0, 'der eingebaute Weg liefert gar keinen Hinweis — dann misst der Vergleich nichts');
});

test('[Rechtsraum·Slot] der Slot ist im Kanon leer — der Kern fährt seinen eingebauten Stand', () => {
  const { V } = ladeKern();
  assert.equal(V._rechtsraumFristRegel(KENNUNG), null,
    'es liegt eine Überlagerung im Kanon. Das Modul entsteht in einem eigenen Zug; steht hier '
    + 'schon eine, ist sie nie durch einen Einlassweg gegangen');
});

test('[Rechtsraum·Überlagerung] ein geladenes Modul ändert die Frist', () => {
  const { V } = ladeKern();
  const feld = feldHolen(V, 'socialInsurance', 'terminationDate');
  const daten = { terminationDate: '2026-08-20' };
  const vorher = V._fristHinweisFuerFeld(feld, null, daten, HEUTE, KENNUNG);

  const r = V.rechtsraumFristUeberlagerungSetzen({
    rechtsraum: 'XX', moduleVersion: 1,
    felder: { [KENNUNG]: { fristRegel: { dauer: 'P6W', quelle: '§ Prüf-Norm' } } },
  });
  assert.equal(r.gesetzt, true);
  assert.equal(r.felder, 1);

  const nachher = V._fristHinweisFuerFeld(feld, null, daten, HEUTE, KENNUNG);
  assert.notEqual(nachher, vorher,
    'die Überlagerung greift nicht — dann ist die Achse dekorativ und ein zweiter Rechtsraum '
    + 'zeigte weiter die deutsche Frist');
  assert.ok(nachher.length > 0, 'die Überlagerung liefert einen leeren Hinweis statt eines anderen');
});

test('[Rechtsraum·Zwei-Formen] die Situations-Kennung greift genauso wie die Sektor-Kennung', () => {
  const { V } = ladeKern();
  /* Der eigene Kennungsraum der Situationen — dieselbe Form, die der Textsatz führt
     (`situation:erbfall.…`). Eine Form allein über `feldId` fiele aus: 17 UnterFeld-IDs
     sind doppelt vergeben, gemessen am 05.09.2026. */
  const sit = V.SITUATIONEN.find((s) => s.id === 'erbfall');
  assert.ok(sit, 'die Situation `erbfall` fehlt — dort hängt § 1944 BGB');
  let feld = null;
  for (const blk of (sit.bloecke || [])) {
    for (const e of (blk.eintraege || [])) if (e.feld && e.feld.fristRegel) { feld = e.feld; break; }
    if (feld) break;
  }
  assert.ok(feld, 'kein Situations-Feld mit fristRegel gefunden');

  const kennung = 'situation:' + sit.id + '.' + feld.id;
  const daten = {};
  daten[feld.fristRegel.abFeld || feld.id] = '2026-08-01';

  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [kennung]: { fristRegel: { dauer: 'P1M', quelle: '§ Prüf-Norm' } } },
  });
  const mit = V._fristHinweisFuerFeld(feld, daten, null, HEUTE, kennung);
  V.rechtsraumFristUeberlagerungSetzen(null);
  const ohne = V._fristHinweisFuerFeld(feld, daten, null, HEUTE, kennung);
  assert.notEqual(mit, ohne, 'die Situations-Kennung greift nicht — dann bleiben drei der sechs Regeln blind');
});

test('[Rechtsraum·ROT] eine ungültige Dauer wird verworfen, nicht angezeigt', () => {
  const { V } = ladeKern();
  const feld = feldHolen(V, 'socialInsurance', 'terminationDate');
  const daten = { terminationDate: '2026-08-20' };
  const eingebaut = V._fristHinweisFuerFeld(feld, null, daten, HEUTE, KENNUNG);

  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [KENNUNG]: { fristRegel: { dauer: 'P99JAHRHUNDERTE', quelle: '§ Unsinn' } } },
  });
  const nachher = V._fristHinweisFuerFeld(feld, null, daten, HEUTE, KENNUNG);
  assert.equal(nachher, eingebaut,
    'eine unbekannte Dauer hat den Hinweis verändert. Sie muss durch denselben Prüfer fallen wie '
    + 'eine eingebaute (feldFristRegelPruefen) und den eingebauten Stand stehen lassen — sonst '
    + 'zeigt ein Modul mit einem Tippfehler eine falsche oder gar keine Frist. Eine falsche Frist '
    + 'ist schlimmer als eine fehlende: die Bürgerin verlässt sich darauf.');
});

test('[Rechtsraum·ROT] ein ungültiges Modul setzt zurück, statt den alten Stand weiterwirken zu lassen', () => {
  const { V } = ladeKern();
  V.rechtsraumFristUeberlagerungSetzen({ felder: { [KENNUNG]: { fristRegel: { dauer: 'P6W', quelle: '§ X' } } } });
  assert.ok(V._rechtsraumFristRegel(KENNUNG), 'die Vorbedingung greift nicht');
  const r = V.rechtsraumFristUeberlagerungSetzen({ kaputt: true });
  assert.equal(r.gesetzt, false);
  assert.equal(V._rechtsraumFristRegel(KENNUNG), null,
    'nach einem ungültigen Modul wirkt die vorige Überlagerung weiter — ein halber Stand ist '
    + 'schlimmer als keiner, weil niemand sieht, welcher gilt');
});

test('[Rechtsraum·Positivkontrolle] die Leerfall-Probe erkennt eine unbeabsichtigte Änderung', () => {
  const { V } = ladeKern();
  const feld = feldHolen(V, 'socialInsurance', 'terminationDate');
  const daten = { terminationDate: '2026-08-20' };
  /* Eine Überlagerung setzen und prüfen, dass der Leerfall-Vergleich sie SIEHT — sonst
     wäre die erste Probe oben grün, ohne etwas zu messen. */
  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [KENNUNG]: { fristRegel: { dauer: 'P6W', quelle: '§ Prüf-Norm' } } },
  });
  const ohneKennung = V._fristHinweisFuerFeld(feld, null, daten, HEUTE);
  const mitKennung = V._fristHinweisFuerFeld(feld, null, daten, HEUTE, KENNUNG);
  assert.notEqual(mitKennung, ohneKennung,
    'mit geladener Überlagerung müssen sich die beiden Wege unterscheiden — tun sie es nicht, '
    + 'vergleicht die Leerfall-Probe oben zwei identische Nichtse');
});
