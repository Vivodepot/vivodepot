'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Ein Datum in einer Listen-Zusammenfassung trägt seine Beschriftung und steht deutsch (Befund 28.09.2026)
   ───────────────────────────────────────────────────────────────────────────
   Die Demo-Prüfung fand im Bereich Verwaltung „Versorgungsamt … · Antrag … · 2026-08-10 · 2026-10-15“: zwei Daten ohne
   Beschriftung, als ISO. Welches ist die Frist? Die Zeile sagte es nicht. Behoben an allen drei Zusammenfassungen:
   Kern-Ansicht (listenEintragZusammenfassung), docx-Export (_verweisListenEintragZusammenfassung), Lese-App.

   DIE KLASSE: jedes Datums-Unterfeld jeder Liste in jedem Bereich — nicht nur die eine Frist. Der Wächter geht den
   ganzen Katalog von Kern und Lese-App durch und verlangt „Beschriftung: TT.MM.JJJJ“, nie ein ISO-Datum.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const ISO = /\b\d{4}-\d{2}-\d{2}\b/;

function datumsUnterfelder(V) {
  const aus = [];
  for (const sek of Object.values(V.SEKTOR_BY_ID)) {
    for (const sektion of (sek.sektionen || [])) {
      for (const f of (sektion.felder || [])) {
        // Eine Positivliste (zusammenfassungFelder, nur im Kern) oder eine Bedingung (verborgenWenn) nimmt ein Unterfeld
        // bewusst aus der Zusammenfassung — was dort nicht steht, kann nicht roh stehen.
        const zeigt = (uf) => !(Array.isArray(f.zusammenfassungFelder) && !f.zusammenfassungFelder.includes(uf.id)) && !uf.verborgenWenn;
        for (const uf of (f.unterFelder || [])) if (uf.typ === 'datum' && zeigt(uf)) aus.push({ sektorId: sek.id, feld: f, uf });
      }
    }
  }
  return aus;
}

// Gibt je Datums-Unterfeld den Fund zurück, wenn die Zusammenfassung das Datum nicht beschriftet und deutsch zeigt.
function funde(stellen, zusammenfassen, labelVon) {
  const raus = [];
  for (const { sektorId, feld, uf } of stellen) {
    const z = zusammenfassen(sektorId, feld, { [uf.id]: '2026-10-15' });
    const soll = labelVon(sektorId, feld, uf) + ': 15.10.2026';
    if (ISO.test(z) || !z.includes(soll)) raus.push(sektorId + '.' + feld.id + '/' + uf.id + ' → „' + z + '“');
  }
  return raus;
}

test('[Liste·Datum] Kern: jedes Datums-Unterfeld steht beschriftet und deutsch — Ansicht und docx-Export', () => {
  const { V } = ladeKern();
  const stellen = datumsUnterfelder(V);
  assert.ok(stellen.length >= 10, 'Ausbeute: der Katalog trägt Datums-Unterfelder (' + stellen.length + ')');
  assert.ok(stellen.some((s) => s.feld.id === 'ongoingAdministrativeCases' && s.uf.id === 'deadline'), 'der Anlassfall ist dabei');
  const label = (_s, _f, uf) => uf.label;
  assert.deepEqual(funde(stellen, (_s, f, e) => V.listenEintragZusammenfassung(f, e), label), []);
  assert.deepEqual(funde(stellen, (_s, f, e) => V._verweisListenEintragZusammenfassung(f, e), label), []);
  const rot = funde(stellen, (_s, f, e) => Object.values(e).join(' · '), label);
  assert.equal(rot.length, stellen.length, 'Rot-Beweis im Test: die alte Form („2026-10-15“) fällt an jeder Stelle');
});

test('[Liste·Datum] Lese-App: jedes Datums-Unterfeld steht beschriftet und deutsch', () => {
  const { V } = ladeLesen();
  // Sensible Unterfelder zeigt die Lese-App in der Zusammenfassung nie (Befund 2, 12./13.08.2026) — dort steht kein Datum.
  const stellen = datumsUnterfelder(V).filter((st) => !V.unterfeldIstSensibel(st.sektorId, st.feld.id, {}, st.uf));
  assert.ok(stellen.length >= 10, 'Ausbeute: der Katalog der Lese-App trägt Datums-Unterfelder (' + stellen.length + ')');
  const label = (s, f, uf) => V._unterfeldLabelLesen(s, f.id, uf);
  assert.deepEqual(funde(stellen, (s, f, e) => V.listenEintragZusammenfassung(f, e, s), label), []);
  const rot = funde(stellen, (_s, _f, e) => Object.values(e).join(' · '), label);
  assert.equal(rot.length, stellen.length, 'Rot-Beweis im Test: die alte Form fällt an jeder Stelle');
});

/* „Sub-Depot“, nie „Unterdepot“ (Entscheidung vom 29.09.2026). Die Hilfe sagte „im Alltag auch Unterdepot“; aus ihr
   entsteht auch die Hilfe der Website. Geprüft: jeder Text des Kerns (STRINGS) und beide Sprachmodule — dort stehen die
   Hilfe-Texte, aus denen der Website-Export erzeugt wird. */
test('[Sub-Depot] kein „Unterdepot“ in den Texten, den Sprachmodulen und der Hilfe', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { V } = ladeKern();
  const WORT = /unter-?depot/i;
  const treffer = Object.entries(V.STRINGS).filter(([, t]) => typeof t === 'string' && WORT.test(t)).map(([k]) => 'STRINGS.' + k);
  for (const rel of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json']) {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    if (WORT.test(text)) treffer.push(rel);
  }
  assert.deepEqual(treffer, []);
  assert.ok(Object.keys(V.STRINGS).length > 1000, 'Ausbeute: die Texte des Kerns sind geladen');
  const einleitung = (rel) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).texte['hilfe:sub-depot.einleitung'];
  /* „Sub-Depots“ ist der geltende Name, nicht ein neuer: App und Hilfe kehren am 05.10.2026 zu ihm zurück, nachdem zwischenzeitlich
     „Verwaltete Depots“ / „Depots, die ich aufbewahre“ darin stand. Der Wächter gegen „Unterdepot“ oben bleibt unverändert. */
  assert.match(einleitung('tools/textsatz-de-modul.json'), /Sub-Depots/, 'Ausbeute: die Hilfe nennt den Begriff der App');
  assert.match(einleitung('tools/textsatz-en-modul.json'), /Sub-depots/, 'Ausbeute: die englische Hilfe nennt den Begriff der App');
  assert.doesNotMatch(einleitung('tools/textsatz-de-modul.json') + einleitung('tools/textsatz-en-modul.json'), /Verwaltete Depots|Managed depots/i, 'kein Zwischenname mehr in der Hilfe (Rückkehr zu „Sub-Depots“, 05.10.2026)');
  assert.ok(WORT.test('im Alltag auch Unterdepot'), 'Rot-Beweis im Test: der alte Satz würde gefunden');
});
