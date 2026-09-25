'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A446 · Der Papierweg eines angedockten Bereichs — gemessen, dann repariert
   ────────────────────────────────────────────────────────────────────────────
   ZUG 0 IST DER GRUND, WARUM DIESE DATEI SO AUSSIEHT. Der Auftrag („Der grosse
   Zug", Teil A) verlangte, den leeren Weg VOR dem Bau festzuhalten, getrennt
   für PDF, DOCX und Export, jeweils mit Positivkontrolle. Gemessen am
   21.08.2026 mit `tools/andock-papierweg-messen.js`:

     PDF          [vollDepotModell  → _bereichSektionenModell] : TRÄGT (3) · Kontrolle GRÜN
     Bereichs-PDF [bereichVollModell → _bereichSektionenModell] : TRÄGT (3) · Kontrolle GRÜN
     DOCX         [docxBereichModell]                           : LEER      · Kontrolle GRÜN
     Export       [vollExportJSON]                              : TRÄGT (3) · Kontrolle GRÜN

   Der zweite Aufrufer (`bereichVollModell`, das Pro-Bereich-PDF) ist mitgemessen,
   weil der Auftrag ihn ausdrücklich zu messen und zu berichten aufgibt. Er ruft
   dieselbe Funktion und trägt darum dasselbe — gemessen, nicht geschlossen.

   DAMIT IST DIE GRUNDLAGE DES AUFTRAGS ZUR HÄLFTE WIDERLEGT, und das gehört
   hierher und nicht nur in einen Bericht: der Auftrag nennt als Ursache
   `_bereichSektionenModell`, das „über `s.sektionen[].felder` läuft und
   `data.feldDefinitionen` nicht liest". Das war am 20.08. richtig und ist es
   seit A389 Zug 3 nicht mehr — die Funktion trägt seither einen zweiten
   Durchgang über `_templateAbschnitte`. Wer den Auftrag ohne diese Messung
   abgearbeitet hätte, hätte eine funktionierende Stelle „repariert" und die
   kaputte nicht gefunden.

   DIE KAPUTTE WAR DAS DOCX. Ein angedockter Bereich lieferte ein Word-Dokument
   mit Überschrift und ohne eine einzige Zeile — im Kammerfall die leere Seite
   auf dem Schreibtisch, von der der Laufzettel spricht.

   ROT-BEWEIS: Wird der Abschnitts-Durchgang am Ende von `docxBereichModell`
   entfernt, fällt „das angedockte Feld steht im Word-Dokument" — und die
   Positivkontrolle daneben bleibt grün. Genau dieses Paar unterscheidet „das
   Blatt ist leer" von „der Messweg läuft nicht".
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/andock-papierweg-messen.js');

function gemessen() {
  const { V } = ladeKern();
  return { V, mess: M.messen(V) };
}

test('[A446·Zug 0] jeder der drei Messpunkte hat eine GRÜNE Positivkontrolle', () => {
  const { mess } = gemessen();
  for (const e of mess.ergebnis) {
    assert.equal(e.kontrolleGefunden, true,
      e.ausgabe + ': das eingebaute Kontrollfeld kommt nicht an. Damit ist JEDE Aussage dieser '
      + 'Datei über den angedockten Weg wertlos — sie misst dann den Messweg, nicht den Gegenstand.');
  }
});

test('[A446·Zug 0] das Kontrollfeld wird gesucht, nicht genannt — und ist nicht sensibel', () => {
  /* Beim ersten Lauf am 21.08. war die Kontrolle selbst rot: als Kontrollfeld war eines aus
     `gesundheit` gewählt, und dort trägt JEDES Feld `sensibel: true`. Ohne Opt-in hält der Kern
     es zurück — die Messung hätte „auch der eingebaute Bereich ist leer" gemeldet und den
     ganzen Befund umgedreht. Diese Probe hält fest, dass die Wahl eine Suche bleibt. */
  const { V } = ladeKern();
  const k = M.kontrollfeldSuchen(V);
  assert.ok(k, 'kein Kontrollfeld gefunden');
  const sek = V.SEKTOREN.find((s) => s.id === k.sektorId);
  const feld = (sek.sektionen || []).flatMap((x) => x.felder || []).find((f) => f.id === k.feldId);
  assert.equal(!!feld.sensibel, false, 'ein sensibles Kontrollfeld misst die Zurückhaltung, nicht den Weg');
  assert.equal(!!feld.sichtbarWenn, false, 'ein bedingtes Kontrollfeld kann aus einem zweiten Grund fehlen');
});

test('[A446·Rot-Beweis] das angedockte Feld steht im Word-Dokument', () => {
  const { mess } = gemessen();
  const docx = mess.ergebnis.find((e) => e.ausgabe === 'DOCX');
  assert.equal(docx.angedockt.length, M.DEFS.length,
    'DOCX trägt nicht alle angedockten Felder — vor A446 waren es NULL: ' + JSON.stringify(docx.angedockt));
  for (const wert of Object.values(M.WERTE)) {
    assert.ok(docx.angedockt.some((z) => z.includes(wert)),
      'dieser Wert fehlt im Word-Dokument: ' + wert);
  }
});

test('[A446] PDF und Export trugen den angedockten Weg schon vorher — und tragen ihn weiter', () => {
  /* Kein Nachziehen einer Zahl: diese Probe hält fest, dass der Bau am DOCX die beiden
     bereits tragenden Wege nicht angefasst hat. */
  const { mess } = gemessen();
  for (const name of ['PDF', 'Bereichs-PDF', 'Export (JSON-Vollexport)']) {
    const e = mess.ergebnis.find((x) => x.ausgabe === name);
    assert.equal(e.angedockt.length, M.DEFS.length, name + ' trägt nicht mehr alle angedockten Felder');
  }
});

test('[A446] die Sensibel-Zurückhaltung gilt im DOCX für ein angedocktes Feld wie für ein eingebautes', () => {
  /* Die Auflage des Auftrags, und der Grund, warum die Zeilenregel herausgezogen und nicht
     kopiert wurde: ein zweiter Pfad wäre eine zweite Stelle, an der die Sensibel-Prüfung
     anders ausfallen kann. */
  const { V } = ladeKern();
  const k = M.kontrollfeldSuchen(V);
  const d = M.depotBauen(V, k);
  d.feldDefinitionen = d.feldDefinitionen.map((x) =>
    (x.feldId === 'tpl_lagerort' ? Object.assign({}, x, { sensibel: true }) : x));
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(d);

  const ohneZeilen = V.docxBereichModell('obhut', { sensibel: false }).zeilen;
  const ohne = ohneZeilen.map((z) => z.label);
  // Zurückgehalten heißt: der Wert fehlt, die Zeile sagt „hinterlegt, nur mit Freigabe sichtbar" (19.09.2026).
  const lager = ohneZeilen.find((z) => z.label === 'Lagerort');
  assert.ok(!lager || lager.wert === V.STRINGS.zurueckgehaltenVorhanden, 'das sensibel markierte angedockte Feld wird zurückgehalten: kein Wert, höchstens der Freigabe-Satz');
  assert.ok(ohne.includes('Archivdienstleister'), 'die anderen bleiben — sonst misst die Probe die Zurückhaltung nicht, sondern einen Ausfall');

  const mit = V.docxBereichModell('obhut', { sensibel: true }).zeilen.map((z) => z.label);
  assert.ok(mit.includes('Lagerort'), 'mit Opt-in reist es mit — dieselbe EINE Regel');
});

test('[A446] ein angedocktes Feld wird im DOCX genauso dargestellt wie ein eingebautes', () => {
  /* GEMESSEN, nicht angenommen: das DOCX gibt ein Datum als `2031-12-31` aus, das PDF als
     `31.12.2031`. Der Unterschied liegt an der Ausgabe, nicht am angedockten Weg — ein
     EINGEBAUTES Datumsfeld verhält sich im DOCX genauso. Diese Probe nagelt fest, dass der
     angedockte Weg keine eigene Darstellung mitbringt; änderte jemand die DOCX-Darstellung,
     müsste sie sich für beide zugleich ändern. */
  const { V } = ladeKern();
  const k = M.kontrollfeldSuchen(V);
  let eingebaut = null;
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (!eingebaut && f.typ === 'datum' && !f.sensibel && !f.sichtbarWenn) eingebaut = { sektorId: s.id, f };
      }
    }
  }
  assert.ok(eingebaut, 'kein eingebautes, nicht-sensibles Datumsfeld gefunden');
  const d = M.depotBauen(V, k);
  d.sektoren[eingebaut.sektorId] = Object.assign({}, d.sektoren[eingebaut.sektorId] || {},
    { [eingebaut.f.id]: M.WERTE.tpl_fristenende });
  V.setData(d);
  const dxEingebaut = V.docxBereichModell(eingebaut.sektorId, { sensibel: false })
    .zeilen.find((z) => z.label === eingebaut.f.label);
  const dxAngedockt = V.docxBereichModell('obhut', { sensibel: false })
    .zeilen.find((z) => z.label === 'Fristenende');
  assert.equal(dxAngedockt.wert, dxEingebaut.wert,
    'dasselbe Datum, zwei Darstellungen — dann läuft der angedockte Weg NICHT durch dieselbe Regel');
});
