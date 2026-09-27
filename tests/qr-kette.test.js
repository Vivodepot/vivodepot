'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Die QR-Kette Ende-zu-Ende (U2-ADR-082)
   ────────────────────────────────────────────────────────────────────────
   Befund 13.07.: der PDF-Text verspricht wörtlich „die Lese-App setzt sie
   zusammen" — vier gestapelte Brüche verhinderten genau das (Trenner Pipe
   vs. Doppelpunkt, Zusammensetzer ohne Aufrufer, keine Render-Pfade). Dieser
   Test läuft die Kette einmal GANZ durch: Schreibseite (qrTeilePacken, Kern)
   → Leseseite (qrTeilAufnehmen/erkenneFormat/Render, Lese-App) — nicht nur
   jede Hälfte für sich isoliert (das war grün und trotzdem kaputt).

     T-QR-01 Rahmen-Kompatibilität — Schreibseite schreibt, was die Leseseite
             jetzt parst (Pipe, nicht Doppelpunkt).
     T-QR-02 Beliebige Reihenfolge — Teile in vertauschter Reihenfolge
             eingelesen, Ergebnis trotzdem korrekt.
     T-QR-03 Fehlende Teile explizit — Anzeige nennt, wie viele UND welche
             Indizes noch fehlen, nicht nur „i von n".
     T-QR-04 Format-Erkennung — PDF-Selbstverifikation und Bereich-Export
             werden erkannt (nicht mehr „unbekannt"). Der PDF-Zweig prüft nur
             noch die Format-Erkennung selbst — der Erzeuger (`pdfQrText`)
             ist mit CC-01 entfernt (Klartext-Leck, U2-ADR-077-Nachtrag);
             der ehemalige T-QR-05 (Ende-zu-Ende PDF) entfiel deshalb ganz.
     T-QR-06 Ende-zu-Ende Bereich — dito für den Bereich-Export (Modal-QR,
             unverändert, einziger verbleibender QR-Konsument der Lese-App).
     T-QR-07 Rückwärts-Kompatibilität — Notfall-Klartext/vCard/rohes JSON
             (kein VDQR-Rahmen) fällt weiterhin unverändert durch (null).
     T-QR-08 Einteiliger Code — auch ohne Mehrteiligkeit funktioniert die
             Kette (der ursprüngliche Bruch scheiterte auch hier).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('T-QR-01 Rahmen-Kompatibilität: Schreibseiten-Rahmen (Pipe) wird von der Leseseite geparst', () => {
  const { V: L } = ladeLesen();
  const alt = L.qrTeilAufnehmen('VDQR:abc:1/2:Hallo');   // alte, nie funktionierende Form
  assert.equal(alt, null, 'Doppelpunkt-Rahmen ist kein gültiger VDQR-Rahmen (bewusst — Pipe ist das Format)');
  const t1 = L.qrTeilAufnehmen('VDQR|xyz|1/2|Hallo ');
  assert.equal(t1.fertig, false);
  assert.equal(t1.n, 2);
  assert.equal(t1.empfangen, 1);
  assert.equal(Array.from(t1.fehlend).join(','), '2');
  const t2 = L.qrTeilAufnehmen('VDQR|xyz|2/2|Welt');
  assert.equal(t2.fertig, true);
  assert.equal(t2.text, 'Hallo Welt');
});

test('T-QR-02 Beliebige Reihenfolge: Teile vertauscht eingelesen ergeben denselben Text', () => {
  const { V: L } = ladeLesen();
  const t3 = L.qrTeilAufnehmen('VDQR|rev|3/3|C');
  assert.equal(t3.fertig, false);
  assert.equal(Array.from(t3.fehlend).join(','), '1,2');
  const t1 = L.qrTeilAufnehmen('VDQR|rev|1/3|A');
  assert.equal(t1.fertig, false);
  assert.equal(Array.from(t1.fehlend).join(','), '2');
  const t2 = L.qrTeilAufnehmen('VDQR|rev|2/3|B');
  assert.equal(t2.fertig, true);
  assert.equal(t2.text, 'ABC', 'Reihenfolge des Einlesens ist irrelevant — Wiederherstellung nach Index');
});

test('T-QR-03 Fehlende Teile explizit: verarbeiteQrText meldet Anzahl UND welche Indizes fehlen', () => {
  const { V: L } = ladeLesen();
  const meldungen = [];
  L.verarbeiteQrText('VDQR|msg|1/3|A', (m) => meldungen.push(m), () => {});
  assert.equal(meldungen.length, 1);
  assert.ok(/1 von 3/.test(meldungen[0]), 'nennt empfangene Anzahl');
  assert.ok(/2/.test(meldungen[0]) && /3/.test(meldungen[0]), 'nennt die fehlenden Indizes 2 und 3');
  // Regressions-Anker (Live-Fund 13.07.): STRINGS.qrTeilFortschritt trägt „{n}" ZWEIMAL —
  // ein einfaches .replace('{n}', …) ersetzt nur das erste Vorkommen und lässt das zweite
  // als wörtlichen Platzhalter stehen. Node-Assertions oben allein hätten das NICHT gefangen
  // (der Bug erfüllt beide — der Live-Browser-Test hat ihn erst sichtbar gemacht).
  assert.ok(!meldungen[0].includes('{n}') && !meldungen[0].includes('{i}') && !meldungen[0].includes('{empfangen}') && !meldungen[0].includes('{liste}'),
    'kein wörtlicher Platzhalter darf in der Meldung übrig bleiben: ' + meldungen[0]);
});

test('T-QR-04 Format-Erkennung: PDF-Selbstverifikation und Bereich-Export werden erkannt', () => {
  const { V: L } = ladeLesen();
  const pdfNutzlast = { v: 1, typ: 'vivodepot-pdf', titel: 'Test', stand: '13.07.2026', bereiche: [] };
  assert.equal(L.erkenneFormat(pdfNutzlast), 'qr-pdf');
  const bereichNutzlast = { v: 1, typ: 'vivodepot-bereich', bereich: 'gesundheit', bereichLabel: 'Gesundheit', stand: '2026-07-13', felder: [] };
  assert.equal(L.erkenneFormat(bereichNutzlast), 'qr-bereich');
  // EUDIW bleibt bewusst außen vor (U2-ADR-082 Entscheidung 2) — kein dritter Format-Zweig dafür.
  assert.equal(L.erkenneFormat({ v: 1, typ: 'vivodepot-eudiw-sd-jwt-vc' }), 'unbekannt');
});

// CC-08 (14.07., Spiegel zu CC-01): der Bereichs-QR-Producer (bereichQrModell/bereichQrText/
// flowBereichQr) ist ERSATZLOS ENTFERNT — Klartext-„VDQR|…"-Rahmen, den die native Kamera an
// eine Websuche weiterreicht (Geräte-Befund). Die Lese-App-Konsumentenseite (qrTeilAufnehmen/
// erkenneFormat/verarbeiteDatei) bleibt unverändert gültig — der Text-Einfüge-Weg besteht weiter.
// Die folgenden Tests bauen die „vivodepot-bereich"-Nutzlast darum inline statt über den
// entfernten Producer, um die Konsumentenseite weiterhin ehrlich zu prüfen.
function bereichPayload(felder) {
  return JSON.stringify({ v: 1, typ: 'vivodepot-bereich', bereich: 'gesundheit',
    bereichLabel: 'Gesundheit', stand: '2026-07-14', felder });
}

test('T-QR-06 Ende-zu-Ende Bereich: „vivodepot-bereich"-Nutzlast → QR-Teile → Lese-App zeigt die Werte', async () => {
  const { V: K } = await frischMitDepot();
  const text = bereichPayload([{ id: 'bloodType', label: 'Blutgruppe', wert: 'A +' }]);
  const teile = K.qrTeilePacken(text);

  const { V: L, document } = ladeLesen();
  let obj = null;
  for (const t of teile) {
    const teilErgebnis = L.qrTeilAufnehmen(t.rahmen);
    if (teilErgebnis.fertig) obj = JSON.parse(teilErgebnis.text);
  }
  assert.ok(obj, 'Zusammensetzung muss gelingen');
  assert.equal(L.erkenneFormat(obj), 'qr-bereich');
  L.verarbeiteDatei(obj);
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('A +') || html.includes('A+'), 'Bereichs-Wert erscheint in der gerenderten Sicht');
  assert.ok(!/<input|contenteditable/i.test(html), 'Read-only — keine Eingabeelemente');
});

test('T-QR-07 Rückwärts-Kompatibilität: Nicht-VDQR-Text (Notfall-Klartext, vCard, rohes JSON) bleibt unverändert null', () => {
  const { V: L } = ladeLesen();
  assert.equal(L.qrTeilAufnehmen('VIVODEPOT NOTFALL\nVorname: Maria'), null);
  assert.equal(L.qrTeilAufnehmen('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD'), null);
  assert.equal(L.qrTeilAufnehmen('{"schemaVersion":37,"sektoren":{}}'), null);
  assert.equal(L.qrTeilAufnehmen(''), null);
});

test('T-QR-08 Einteiliger Code: auch ohne Mehrteiligkeit funktioniert die Kette (der ursprüngliche Bruch traf auch diesen Fall)', async () => {
  const { V: K } = await frischMitDepot();
  const text = bereichPayload([{ id: 'bloodType', label: 'Blutgruppe', wert: 'A +' }]);
  const teile = K.qrTeilePacken(text);
  assert.equal(teile.length, 1, 'Testaufbau muss einteilig sein');

  const { V: L, document } = ladeLesen();
  const ergebnis = L.qrTeilAufnehmen(teile[0].rahmen);
  assert.equal(ergebnis.fertig, true, 'ein einzelner Teil ist sofort vollständig');
  const obj = JSON.parse(ergebnis.text);
  assert.equal(L.erkenneFormat(obj), 'qr-bereich');
  L.verarbeiteDatei(obj);
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('A +') || html.includes('A+'));
});
