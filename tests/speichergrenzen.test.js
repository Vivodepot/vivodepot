'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Speichergrenzen" (12.08.2026): Gesamt-Depot-Obergrenze
   mit Warnschwelle, statt nur je Mappen-Ablage (MAPPE_MAX_BYTES, „Erfolg ohne
   Wirkung", 08.08.2026).
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN (Zug 0, s. Bericht): `_bytesAlsBinaerstring`/die Serialisierung
   scheitern real ab ~510–520 MB in Chromium (V8-String-Limit ≈ 2^29 Zeichen),
   erst deutlich später in Firefox. MAPPE_GESAMT_HARTE_GRENZE_BYTES (200 MB)
   und MAPPE_GESAMT_WARNSCHWELLE_BYTES (150 MB, 75 % davon) sind aus dieser
   Messung abgeleitet, keine erfundenen Zahlen — die Konstanten selbst tragen
   die Begründung (vivodepot.html, bei MAPPE_MAX_BYTES).

   Regel 18: die harte Grenze wird hier mit ECHTEM Inhalt (nicht nur einer
   behaupteten `.groesse`-Zahl) real über- und unterschritten — sonst bliebe
   offen, ob depotGroesseBytes() (misst den TATSÄCHLICH serialisierten
   Umfang) und die harte Grenze zusammenpassen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'speichergrenzen-pw';

function grosserDataUrlInhalt(bytes) {
  // Eine simple, aber echte Base64-taugliche Zeichenkette der gewünschten Rohgröße —
  // depotGroesseBytes() misst JSON.stringify(data), also den tatsächlichen String, nicht
  // eine behauptete Zahl.
  return 'data:application/octet-stream;base64,' + 'A'.repeat(bytes);
}

test('[Speichergrenzen] unterhalb beider Schwellen: kein Wurf, keine Warnbedingung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ dateiname: 'klein.pdf', groesse: 10 * 1024, inhalt: grosserDataUrlInhalt(10 * 1024) });
  assert.ok(V.mappeEintrag(id), 'Eintrag wurde angelegt');
  assert.ok(V.depotGroesseBytes() < V.MAPPE_GESAMT_WARNSCHWELLE_BYTES, 'weit unter der Warnschwelle');
});

test('[Speichergrenzen · Rotmachbarkeit] Warnschwelle: ein Depot über 150 MB löst die Warnbedingung real aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const bytes = 160 * 1024 * 1024;
  const id = V.mappeEintragHinzufuegen({ dateiname: 'gross.pdf', groesse: bytes, inhalt: grosserDataUrlInhalt(bytes) });
  assert.ok(V.mappeEintrag(id), 'Eintrag unter der harten Grenze wird angenommen');
  const groesse = V.depotGroesseBytes();
  assert.ok(groesse >= V.MAPPE_GESAMT_WARNSCHWELLE_BYTES, `Depot (${groesse} Bytes) sollte über der Warnschwelle liegen`);
  assert.ok(groesse < V.MAPPE_GESAMT_HARTE_GRENZE_BYTES, `Depot (${groesse} Bytes) sollte noch unter der harten Grenze liegen`);
});

test('[Speichergrenzen · Rotmachbarkeit] harte Grenze: eine Ablage darüber wird verweigert, nichts Bestehendes geht verloren', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // Erst ein Eintrag deutlich unter der Grenze — muss NACH dem Fehlschlag noch da sein.
  const bytes1 = 50 * 1024 * 1024;
  const id1 = V.mappeEintragHinzufuegen({ dateiname: 'erste.pdf', groesse: bytes1, inhalt: grosserDataUrlInhalt(bytes1) });
  assert.ok(V.mappeEintrag(id1));

  const bytes2 = 200 * 1024 * 1024;   // zusammen mit dem ersten Eintrag + JSON-Hülle über 200 MB
  assert.throws(
    () => V.mappeEintragHinzufuegen({ dateiname: 'zweite.pdf', groesse: bytes2, inhalt: grosserDataUrlInhalt(bytes2) }),
    (e) => e && e.vdDepotZuGross === true,
    'die harte Grenze sollte anschlagen und .vdDepotZuGross tragen'
  );
  // Nichts Bestehendes verloren: der erste Eintrag ist unverändert da, kein zweiter angehängt.
  assert.ok(V.mappeEintrag(id1), 'der erste, bereits abgelegte Eintrag bleibt erhalten');
  const d = V.getData();
  assert.equal(d.mappe.length, 1, 'kein zweiter (fehlgeschlagener) Eintrag wurde trotzdem angehängt');
});

test('[Speichergrenzen] die drei Aufrufer von mappeEintragHinzufuegen teilen sich EINE Prüfung', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const treffer = [...quelle.matchAll(/mappeEintragHinzufuegen\(/g)];
  // 1x Funktionsdefinition + 3 Aufrufer = 4 Vorkommen des Bezeichners gefolgt von „(".
  assert.equal(treffer.length, 4, 'unerwartete Zahl an mappeEintragHinzufuegen-Vorkommen — Prüfung ggf. umgangen worden');
  const projizierteGroesse = quelle.match(/projizierteGroesse = depotGroesseBytes\(\) \+/g) || [];
  assert.equal(projizierteGroesse.length, 1, 'die harte-Grenze-Prüfung sollte genau EINMAL im Quelltext stehen (ein Prüfpunkt, keine drei)');
});
