'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein erkanntes Format ohne übernehmbare Angaben sagt es — Posten 19
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (27.07.2026). `elster` beanspruchte per Volltext-Wortsuche
   fremde Dateien: die volle Depot-Sicherung, den XÖV- und den FIM-Export.
   Gemessen kam dabei ein Plan mit `ungueltig:false` und NULL Zeilen zurück.
   Die Vorschau ging auf, zeigte nichts, das Depot blieb unverändert — und
   NIEMAND sagte das. Die Bürgerin liest „Elster-Steuerdatei erkannt" und
   bekommt nichts übernommen. Vertrauensschaden ohne Fehlermeldung.

   ZWEI ZÜGE, UND NUR EINER IST DIESER. Die Schärfung der Erkenner (siehe
   `import-ambiguitaet.test.js`) repariert die zwei bekannten Fälle. DIESE
   Prüfung fängt jeden künftigen: greift eine Erkennung und findet der Mapper
   nichts, sagt die App es — ohne dass jemand daran denken muss.
   Das ist §3.5e in Produktform: ein Ergebnis kann gültig und wirkungslos
   sein, und die Bürgerin hat ein Recht darauf, das zu erfahren.

   EIGENER ZUSTAND, NICHT `ungueltig`. „Diese Art von Datei kann Vivodepot
   nicht lesen" und „gelesen, aber es steht nichts drin" sind verschiedene
   Auskünfte mit verschiedenen nächsten Schritten. Sie zusammenzulegen würde
   eine davon unbrauchbar machen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PLAN = (z, l, r, ungueltig) => ({ zeilen: z, listen: l, register: r, ungueltig: !!ungueltig });

test('[Leerer Plan] ein Plan ohne jede übernehmbare Angabe wird als solcher erkannt', () => {
  const { V } = ladeKern();
  assert.equal(V.planOhneUebernahme(PLAN([], [], [])), true);
});

/* ── NEGATIVKONTROLLEN (§3.5d) — der Detektor muss UNTERSCHEIDEN ────────── */
test('[Leerer Plan·Negativkontrolle] jede einzelne Fundart genügt, damit der Plan NICHT leer ist', () => {
  const { V } = ladeKern();
  // Ohne diese drei belegte der Test nur, dass der Detektor feuert — nicht,
  // dass er trifft. Ein Prädikat, das immer `true` sagt, wäre oben ebenso grün.
  assert.equal(V.planOhneUebernahme(PLAN([{ feld: 'x' }], [], [])), false, 'eine Zeile genügt');
  assert.equal(V.planOhneUebernahme(PLAN([], [{ id: 'l' }], [])), false, 'eine Liste genügt');
  assert.equal(V.planOhneUebernahme(PLAN([], [], [{ id: 'p' }])), false, 'ein Register-Eintrag genügt');
});

test('[Leerer Plan·Negativkontrolle] ein UNGÜLTIGER Plan ist nicht „leer" — das ist der andere Fall', () => {
  const { V } = ladeKern();
  // Fall B hat einen eigenen Text und einen anderen nächsten Schritt. Fielen die
  // beiden zusammen, bekäme die Bürgerin bei einer unlesbaren Datei den Rat,
  // einen neuen Export anzufordern — für ein Format, das gar nicht gelesen wurde.
  assert.equal(V.planOhneUebernahme(PLAN([], [], [], true)), false);
  assert.equal(V.planOhneUebernahme(null), false);
});

/* ── DER ECHTE WEG: über importPlan, nicht über ein gebautes Objekt ─────── */
test('[Leerer Plan] DER KERNFALL, end-to-end: erkannt, geparst, nichts drin', () => {
  const { V } = ladeKern();
  // Struktur-Anker vorhanden (`veranlagung` ist einer der Wurzelschlüssel, die
  // `_elsterFelder` liest) — aber kein einziges befülltes Feld darunter.
  // Genau die Klasse, die die App künftig benennen muss.
  const text = JSON.stringify({ veranlagung: {} });
  assert.equal(V.importFormatErkennen(text), 'elster',
    'die Datei wird erkannt — sonst prüft dieser Test den falschen Fall');
  const plan = V.importPlan('elster', text);
  assert.equal(plan.ungueltig, false, 'sie ist LESBAR — das ist nicht Fall B');
  assert.equal(V.planOhneUebernahme(plan), true,
    'und sie trägt trotzdem nichts Übernehmbares — Fall A');
});

/* ── Die Texte: Feststellung, Depot-Zusicherung, kein Platzhalter-Rest ──── */
test('[Leerer Plan] beide Texte sagen ausdrücklich, dass das Depot unverändert ist', () => {
  const { V } = ladeKern();
  for (const key of ['importOhneAngaben', 'importNichtErkannt']) {
    const t = V.STRINGS[key];
    assert.ok(t, `${key} vorhanden`);
    assert.match(t, /Depot ist unverändert/,
      `${key} muss die Bürgerin über den Zustand ihres Depots beruhigen — das ist die ` +
      'eigentliche Auskunft, nicht die Fehlermeldung');
  }
});

test('[Leerer Plan] der Platzhalter {quelle} bleibt nach der Ersetzung NICHT stehen', () => {
  const { V } = ladeKern();
  // Die Lehre aus dem doppelten {n}-Platzhalter: eine lockere Prüfung ließ ein
  // zweites Vorkommen stehen, und erst der Browser zeigte es. Darum beides:
  // der Wert steht drin UND das Literal ist weg.
  const fertig = V.STRINGS.importOhneAngaben.replaceAll('{quelle}', 'Elster-Steuerdaten');
  assert.ok(fertig.includes('Elster-Steuerdaten'), 'das Label steht im Text');
  assert.ok(!fertig.includes('{quelle}'), 'und KEIN Rest des Platzhalters');
});

test('[Leerer Plan] Fall B ist eine Feststellung, keine Aufforderung an die Bürgerin', () => {
  const { V } = ladeKern();
  // Vorher: „Bitte wählen Sie oben ein passendes Format." — das schob die Arbeit
  // an die Bürgerin zurück für etwas, das sie nicht entscheiden kann.
  assert.doesNotMatch(V.STRINGS.importNichtErkannt, /Bitte wählen|Bitte prüfen/);
});
