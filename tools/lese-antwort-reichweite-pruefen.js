#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-antwort-reichweite — die Lese-App zeigt nicht mehr und nicht weniger
   ────────────────────────────────────────────────────────────────────────────
   Kette, Auftrag 8, Zug 3 (20.08.2026). Der Auftrag sagt: „die Lese-App liest
   und zeigt an. Braucht es einen Wächter, damit sie nicht mehr oder weniger
   zeigt als vorgesehen, wird er gebaut."

   ER WIRD GEBRAUCHT, und der Grund steht in beiden Richtungen:

   MEHR wäre eine Erfindung. Hinter der Lese-App liegt kein Depot — nur der
   Datensatz, den die Bürgerin herausgegeben hat. Ein Blatt, das eine Angabe
   zeigt, die nicht darin steht, behauptet etwas über einen Menschen.

   WENIGER ist die teurere Hälfte, und sie ist der eigentliche Anlass: der
   Datensatz sagt über sich selbst, dass er eine TEILANTWORT ist (`fehlend`,
   `unbekannt`, `vollstaendig`). Fällt eine dieser Aussagen vom Blatt, hält
   der Empfänger fünf von neun Angaben für eine vollständige Auskunft — genau
   der Fehlschlag, gegen den Auftrag 7 gebaut ist, nur eine Anwendung weiter.

   MESSWEG, und seine Grenze steht hier und nicht im Bericht: geprüft wird am
   GERENDERTEN HTML von `renderAntwort`, über den echten Lade-Weg der
   Lese-App (`tests/load-lesen.js`) mit einem gestellten Datensatz. Der Wächter
   sieht damit, was im HTML steht — nicht, was ein Browser daraus malt. Eine
   Angabe, die per CSS unsichtbar gemacht würde, fände er nicht; dafür ist die
   Browser-Abnahme da.

   Aufruf:
     node tools/lese-antwort-reichweite-pruefen.js            → Bericht, Exit 0/1
     node tools/lese-antwort-reichweite-pruefen.js --lesen <pfad>
         → gegen EINE Kopie (Rot-Beleg, ohne die Auslieferungsdatei zu verbiegen)
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Der Prüfstoff: eine Teilantwort. Fünf gefragte Angaben, drei da, eine fehlt,
   eine unbekannt — jede der drei Selbstaussagen des Datensatzes ist damit
   belegt und nicht nur behauptet. */
function pruefDatensatz() {
  return {
    format: 'vivodepot-anlass',
    erstelltAm: '2026-08-20T10:00:00.000Z',
    anfrage: {
      von: 'Pflegeheim Sonnenhof gGmbH',
      anbieterId: 'heim/sonnenhof',
      zweck: 'Aufnahme in die vollstationäre Pflege',
      grundlage: '§ 630f BGB und der unterzeichnete Heimvertrag',
      vorgang: 'AUF-2026-0815',
      gueltigBis: '2026-09-30',
    },
    // Code-Review 16.09.2026, A5: kennung/bereich/feld trugen die alten (deutschen) Kennungen aus
    // der Zeit vor dem Umbau. renderAntwort liest nur f.label (löst die Kennung nicht auf), darum
    // war das inert, nicht falsch — aber ein heutiger Anbieter fragt keine Kennungen mehr ab, die
    // es im Modell nicht mehr gibt. Auf den echten Bestand gezogen (bereiche/feldkatalog.json).
    felder: [
      { kennung: 'identity.givenName', bereich: 'identity', feld: 'givenName', label: 'Vorname', wert: 'Hedwig', zweck: 'Anrede im Aufnahmebogen' },
      { kennung: 'identity.familyName', bereich: 'identity', feld: 'familyName', label: 'Nachname', wert: 'Brandt', zweck: 'Anrede im Aufnahmebogen' },
      { kennung: 'health.insuranceNumber', bereich: 'health', feld: 'insuranceNumber', label: 'Versichertennummer', wert: 'A123456780', zweck: 'Abrechnung mit der Kasse' },
    ],
    fehlend: [{ kennung: 'socialInsurance.careLevel', bereich: 'socialInsurance', feld: 'careLevel', label: 'Pflegegrad', pflicht: true }],
    unbekannt: [{ kennung: 'health.lieblingsfarbe', grund: 'unbekannt' }],
    zurueckgehalten: { sensibel: 1 },
    vollstaendig: false,
  };
}
function pruefUmschlag() {
  return { dateiTyp: 'vivodepot-antwort', v: 1, verfahren: 'einmalpasswort',
    vorgang: 'AUF-2026-0815', anbieterId: 'heim/sonnenhof', erstelltAm: '2026-08-20T10:00:00.000Z' };
}

/* Was auf dem Blatt STEHEN MUSS. Je Zeile: was gesucht wird und warum es dort
   gehört — eine Zusicherung ohne Grund ist beim nächsten Mal Verhandlungsmasse. */
const MUSS = [
  { was: 'Hedwig', grund: 'ein Wert, den die Bürgerin herausgegeben hat' },
  { was: 'Brandt', grund: 'derselbe, zweite Angabe' },
  { was: 'A123456780', grund: 'derselbe, dritte Angabe' },
  { was: 'Pflegeheim Sonnenhof', grund: 'WER gefragt hat' },
  { was: 'AUF-2026-0815', grund: 'WORAUF das die Antwort ist' },
  { was: '§ 630f BGB', grund: 'AUF WELCHER GRUNDLAGE gefragt wurde — sie reist mit und bleibt nachweisbar' },
  { was: 'Abrechnung mit der Kasse', grund: 'der Zweck JE FELD, nicht nur einmal am Kopf' },
  { was: 'Pflegegrad', grund: 'was FEHLT, namentlich — nicht bloss gezählt' },
  { was: 'health.lieblingsfarbe', grund: 'eine Kennung, die es nicht gibt, wird BENANNT' },
  { was: 'TEILANTWORT', grund: 'der Datensatz sagt über sich, dass er keine ganze Auskunft ist' },
];
/* Was auf dem Blatt NICHT stehen darf. Der Datensatz trägt es nicht — also
   darf es auch das Blatt nicht tragen, egal woher es käme. */
const DARF_NICHT = [
  { was: 'Metformin', grund: 'eine Angabe, nach der niemand gefragt hat' },
  { was: 'Penicillin', grund: 'dieselbe Klasse' },
];

function blattHtml(lesenPfad) {
  const zuvor = process.env.LESEN_HTML_PATH;
  if (lesenPfad) process.env.LESEN_HTML_PATH = lesenPfad;
  try {
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-lesen.js'))];
    const { ladeLesen } = require(path.join(REPO, 'tests', 'load-lesen.js'));
    const geladen = ladeLesen();
    geladen.V.renderAntwort(pruefDatensatz(), pruefUmschlag());
    const app = geladen.document.getElementById('app');
    return String((app && app.innerHTML) || '');
  } finally {
    if (zuvor === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = zuvor;
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-lesen.js'))];
  }
}

function pruefen(lesenPfad) {
  const html = blattHtml(lesenPfad);
  const fehlend = MUSS.filter((m) => html.indexOf(m.was) < 0);
  const zuviel = DARF_NICHT.filter((m) => html.indexOf(m.was) >= 0);
  return { html, fehlend, zuviel, ok: !fehlend.length && !zuviel.length };
}

function main() {
  const i = process.argv.indexOf('--lesen');
  const lesenPfad = i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null;
  let r;
  try { r = pruefen(lesenPfad); }
  catch (e) {
    console.error('lese-antwort-reichweite: das Antwort-Blatt liess sich nicht rendern — ' + (e && e.message));
    process.exit(1);
  }
  if (r.ok) {
    console.log('lese-antwort-reichweite: OK — ' + MUSS.length + ' Zusicherungen erfüllt, '
      + DARF_NICHT.length + ' Ausschlüsse gehalten. Suchraum: das gerenderte HTML von renderAntwort.');
    return;
  }
  for (const f of r.fehlend) console.error('  FEHLT auf dem Blatt: „' + f.was + '" — ' + f.grund);
  for (const z of r.zuviel) console.error('  ZUVIEL auf dem Blatt: „' + z.was + '" — ' + z.grund);
  console.error('lese-antwort-reichweite: DRIFT — die Lese-App zeigt '
    + (r.fehlend.length ? 'weniger' : '') + (r.fehlend.length && r.zuviel.length ? ' und ' : '')
    + (r.zuviel.length ? 'mehr' : '') + ', als der Datensatz hergibt.');
  process.exit(1);
}

if (require.main === module) main();
module.exports = { pruefen, blattHtml, pruefDatensatz, pruefUmschlag, MUSS, DARF_NICHT };
