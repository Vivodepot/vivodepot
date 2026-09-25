'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Sensibel ist eine Voreinstellung, keine Sperre"
   (11.08.2026), Zug 2: der Herausgabedialog kennt keine unerreichbare
   Gruppe mehr. `schemaFest` entfällt als eigene, nicht ankreuzbare Liste —
   die Felder stehen bei den Kandidaten, sichtbar und erreichbar, nie in
   einer stummen Sperr-Liste.

   NACHGEZOGEN 12.08.2026 („Die Herausgabe kommt ohne Kästchen aus"): bei
   GESETZTER sektorId ist der Dialog seither Opt-out statt Opt-in (ADR-024-Nachtrag) — kein
   Kästchen, kein `export-schema-badge` mehr. Die TRAGENDE Zusage von Zug 2 bleibt trotzdem
   wahr, nur die Mechanik wechselt: ein schema-sensibles Feld steht sichtbar, mit Namen, in der
   „Nicht mitgeschickt"-Box (nicht in einer stummen, unerreichbaren Liste) — und bleibt über
   den Rückhalte-Weg („Doch mitgeben") erreichbar. `sektorId:null` (Gesamt-PDF/JSON) bleibt
   unverändert Opt-in mit Kästchen und Badge — dort testet weiterhin die alte Mechanik.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function offenesDepotMitSchemaSensiblemFeld() {
  const { V } = ladeKern();
  await V.depotAnlegen('sicherung-2026');
  V.akteurSelbstErklaeren('Tester');
  let ziel = null;
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.sensibel === true && f.typ === 'text') { ziel = { sektorId: s.id, feldId: f.id, label: f.label }; break; }
      }
      if (ziel) break;
    }
    if (ziel) break;
  }
  if (!ziel) throw new Error('kein schema-sensibles Textfeld gefunden — Vorbedingung nicht erfüllt');
  V.sektorFeldSetzen(ziel.sektorId, ziel.feldId, 'Testwert');
  return { V, ziel };
}

test('[Sensibel-Freigabe·Zug2] ein schema-sensibles Feld steht sichtbar mit Namen in „Nicht mitgeschickt", nicht in einer stummen Sperr-Liste', async () => {
  const { V, ziel } = await offenesDepotMitSchemaSensiblemFeld();
  let gesehenesModal = null;
  const echtesModal = V.ui.modal;
  V.ui.modal = (opt) => { gesehenesModal = opt; return () => {}; };
  try {
    V.flowExportUebersicht({ sektorId: ziel.sektorId, titel: 'Test', aufFortfahren: () => {} });
  } finally {
    V.ui.modal = echtesModal;
  }
  assert.ok(gesehenesModal, 'Modal wurde aufgerufen');
  const html = gesehenesModal.koerperHTML;
  assert.ok(html.includes(ziel.label), 'das schema-sensible Feld wird BEIM NAMEN genannt, nicht stillschweigend versteckt');
  assert.ok(html.includes('export-nicht-box'), 'es steht in der „Nicht mitgeschickt"-Box, sichtbar erklärt');
  assert.equal(html.includes('export-schemafest'), false, 'die alte, nicht-ankreuzbare Sperr-Liste entfällt');
  assert.equal(html.includes('grundsätzlich außen vor'), false, 'die falsche Ansage steht nicht mehr im Dialog');
});

test('[Sensibel-Freigabe·Zug2] das schema-sensible Feld trägt seinen Grund als Satz — „besonders geschützt", nicht stumm', async () => {
  const { V, ziel } = await offenesDepotMitSchemaSensiblemFeld();
  let gesehenesModal = null;
  const echtesModal = V.ui.modal;
  V.ui.modal = (opt) => { gesehenesModal = opt; return () => {}; };
  try {
    V.flowExportUebersicht({ sektorId: ziel.sektorId, titel: 'Test', aufFortfahren: () => {} });
  } finally {
    V.ui.modal = echtesModal;
  }
  assert.match(gesehenesModal.koerperHTML, /besonders geschützt/, 'der Grund steht als Satz bei der Angabe');
});

test('[Sensibel-Freigabe·Zug2] Opt-out bei gesetzter sektorId (ADR-024-Nachtrag 12.08.2026): ein schema-sensibles Feld startet ZURÜCKGEHALTEN, nicht in der Geht-mit-Liste', async () => {
  const { V, ziel } = await offenesDepotMitSchemaSensiblemFeld();
  let gesehenesModal = null;
  const echtesModal = V.ui.modal;
  V.ui.modal = (opt) => { gesehenesModal = opt; return () => {}; };
  try {
    V.flowExportUebersicht({ sektorId: ziel.sektorId, titel: 'Test', aufFortfahren: () => {} });
  } finally {
    V.ui.modal = echtesModal;
  }
  const html = gesehenesModal.koerperHTML;
  assert.ok(!new RegExp('<li[^>]*data-feld="' + ziel.feldId + '"').test(html),
    'startet NICHT in der Geht-mit-Liste — dieselbe Datensparsamkeit wie zuvor, nur die Richtung ist Opt-out statt Opt-in (s. ADR-024-Nachtrag)');
});

test('[Sensibel-Freigabe·Zug2] echter Rundlauf: wird das schema-sensible Feld angekreuzt, landet es im Export — sonst nicht', async () => {
  const { V, ziel } = await offenesDepotMitSchemaSensiblemFeld();
  const kandidat = { sektor: ziel.sektorId, feld: ziel.feldId, label: ziel.label };

  // Die ephemere Markierung gilt NUR während aufFortfahren läuft — der Export-Modell-Aufbau
  // muss darum INNERHALB des Callbacks passieren, nicht danach (exportAuswahlEphemerAnwenden
  // stellt die persistente Markierung im finally-Block sofort wieder her).
  let werteOhne = '', werteMit = '';
  await V.exportAuswahlEphemerAnwenden([kandidat], new Set(), (opt) => {
    const modell = V.vollDepotModell(opt);
    werteOhne = JSON.stringify(modell.bereiche.find((b) => b.id === ziel.sektorId));
  });
  assert.equal(werteOhne.includes('Testwert'), false, 'ohne Ankreuzen bleibt der Wert draußen');

  await V.exportAuswahlEphemerAnwenden([kandidat], new Set([ziel.sektorId + '/' + ziel.feldId]), (opt) => {
    const modell = V.vollDepotModell(opt);
    werteMit = JSON.stringify(modell.bereiche.find((b) => b.id === ziel.sektorId));
  });
  assert.ok(werteMit.includes('Testwert'), 'angekreuzt: der Wert landet im Export');

  // Ephemer: nach beiden Aufrufen ist die persistente Markierung wieder wie zuvor (leer).
  assert.deepEqual(V.getData().sensibelFelder, {}, 'die Auswahl persistiert nicht — jeder Export beginnt bei null');
});
