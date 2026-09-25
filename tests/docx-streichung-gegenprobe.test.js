'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 3.1 · DIE GEGENPROBE, DIE ZÄHLT — kein Feld verschwindet mit dem toten Weg
   ────────────────────────────────────────────────────────────────────────────
   Der Auftrag verlangt zweierlei, und beides steht hier:

     · ROT-BELEG: eine Probe, die festhält, dass kein Ausgabeweg mehr auf
       `window.docx` verweist — **und die vor dem Streichen rot ist.** Sie steht
       in `compliance.test.js` (Proben 2 und 3, umgedreht statt gelöscht); gegen
       den Stand vor der Streichung (`3df1b23`) fallen beide, gegen den heutigen
       laufen sie durch. Diese Datei hier führt den Beleg zusätzlich AM
       GEGENSTAND, nicht nur am Text.

     · DIE GEGENPROBE: **PDF, Datensatz und QR tragen nach dem Streichen
       unverändert.** Gemessen wird nicht „es kommt irgendetwas", sondern der
       Vergleich ZWEIER KERNE — der vor der Streichung und der heutige — an
       demselben befüllten Depot. Ohne den Vergleich wäre „trägt" eine Aussage
       ohne Maßstab.

   WARUM DER VERGLEICH ZWEIER KERNE UND NICHT EIN FESTGENAGELTER ERWARTUNGSWERT:
   ein Erwartungswert im Test wäre eine dritte Fassung derselben Wahrheit, die
   beim nächsten Feld veraltet. Der alte Kern IST der Maßstab.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const VOR_DER_STREICHUNG = '3df1b23';   // der letzte Commit, der den Word-Weg noch trug

// Die 13-Bereiche-Abbildung der Umbenennungskampagne "Englisch vor v1" (U2-ADR-409/411,
// docs/umbau-englisch-vor-v1/kennung-mapping.json) — nur die vier hier gebrauchten Bereiche,
// vollständig wäre unbenutzter Ballast in dieser Datei.
const BEREICH_ALT_NEU = {
  identitaet: 'identity',
  verwaltung: 'administration',
  gesundheit: 'health',
  wohnen: 'housing',
};

function kernVonCommit(commit) {
  const ziel = path.join(os.tmpdir(), 'vivodepot-vor-docx-' + process.pid + '.html');
  const inhalt = execFileSync('git', ['show', commit + ':vivodepot.html'],
    { cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(ziel, inhalt);
  return ziel;
}

/* Beide Kerne frisch laden — der Cache muss dazwischen fallen, sonst misst der zweite Lauf
   den ersten. */
function ladeMit(pfad) {
  const zuvor = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve('./load-kern.js')];
  const { V } = require('./load-kern.js').ladeKern();
  if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
  return V;
}

/* Dasselbe Depot in beiden Kernen, und daraus die drei Wege als reine Inventare —
   keine UUIDs, keine Zeitstempel, nur was die Bürgerin sähe.

   `istAlterKern` unterscheidet den Wortlaut der Bereichs-/Feld-Kennungen: der
   Vergleichsstand (3df1b23) trägt noch die deutschen Kennungen aus der Zeit vor der
   Umbenennungskampagne "Englisch vor v1", der heutige Kern die englischen
   (U2-ADR-409/411, docs/umbau-englisch-vor-v1/kennung-mapping.json). Ein gemeinsamer
   Aufruf mit EINER Kennungsliste für beide Kerne kann es seit der Umbenennung nicht mehr
   geben — der heutige Kern würfe sonst still auf unbekannte Kennungen und der Datensatz
   bliebe leer (genau das brach diese Probe). */
async function dieDreiWege(V, istAlterKern) {
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  if (istAlterKern) {
    V.sektorFeldSetzen('identitaet', 'vorname', 'Maria');
    V.sektorFeldSetzen('identitaet', 'nachname', 'Beispiel');
    // Schnitt Glied 3 (22.08.2026, U2-ADR-161): bundid_email ist im HEUTIGEN Kern ein
    // Listen-Unterfeld (sektorFeldSetzen würfe). Der Vergleichsstand (3df1b23) kennt diese
    // Umstellung noch nicht — ein gemeinsamer Aufruf für BEIDE Kerne braucht darum ein Feld,
    // das in beiden Ständen ein unverändertes Flachfeld ist. bundid_status ist das (Schnitt
    // Glied 3 fasste nur email/ort an, nicht status) und bleibt derselbe Feldtyp wie 3df1b23.
    V.sektorFeldSetzen('verwaltung', 'bundid_status', 'substanziell');
    V.sektorFeldSetzen('gesundheit', 'blutgruppe', 'A+');
    /* `vermieter` ist ein VERWEIS-Feld — es nimmt `{ref}` oder `{override}`, keinen rohen
       String (A43/U2-ADR-116). Genau darum steht es hier: es ist der Feldtyp, an dem die
       Verweis-Anreicherung haengt, um die es beim DOCX-Modell geht.
       CW-8 (24.08.2026): vermieter ist jetzt an wohnung_typ='miete' gebunden
       (sichtbarWenn) — ohne diese Angabe waere es unsichtbar und faellt aus dem Modell. */
    V.sektorFeldSetzen('wohnen', 'wohnung_typ', 'miete');
    V.sektorFeldSetzen('wohnen', 'vermieter', { override: 'Hausverwaltung Nord' });
  } else {
    // Englische Kennungen (kennung-mapping.json): identitaet.vorname→identity.givenName,
    // identitaet.nachname→identity.familyName, verwaltung.bundid_status→
    // administration.bundidVerificationLevel, gesundheit.blutgruppe→health.bloodType,
    // wohnen.wohnung_typ→housing.ownedOrRented, wohnen.vermieter→
    // housing.landlordPropertyManagement — live gegen SEKTOR_BY_ID geprüft.
    V.sektorFeldSetzen('identity', 'givenName', 'Maria');
    V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
    V.sektorFeldSetzen('administration', 'bundidVerificationLevel', 'substanziell');
    V.sektorFeldSetzen('health', 'bloodType', 'A+');
    V.sektorFeldSetzen('housing', 'ownedOrRented', 'miete');
    V.sektorFeldSetzen('housing', 'landlordPropertyManagement', { override: 'Hausverwaltung Nord' });
  }

  // Die Bereichs-KENNUNG selbst ist Teil der Umbenennung (identitaet→identity, gesundheit→
  // health, verwaltung→administration, wohnen→housing — BEREICH_ALT_NEU unten) — die LABELS
  // (z.label, z.B. "Vorname") sind davon unberührt und bleiben deutsch in beiden Ständen.
  // Ohne diese Abbildung liefe der Vergleich unten auf zwei strukturell gleiche, aber am
  // Bereichs-Präfix verschiedene Listen ("identitaet·…" vs. "identity·…") und wäre am
  // Präfix, nicht am Inhalt, rot.
  const bereichAbbilden = (id) => (istAlterKern && BEREICH_ALT_NEU[id]) || id;
  const pdf = V.vollDepotModell({ sensibel: true }).bereiche
    .flatMap((b) => b.sektionen.flatMap((s) => s.zeilen.map((z) => bereichAbbilden(b.id) + '·' + z.label + '=' + z.wert)))
    .sort();
  const datensatz = Object.keys(JSON.parse(
    typeof V.vollExportJSON({ sensibel: true }) === 'string'
      ? V.vollExportJSON({ sensibel: true })
      : JSON.stringify(V.vollExportJSON({ sensibel: true })))).sort();
  const qr = (V.notfallKernModell ? V.notfallKernModell() : [])
    .map((z) => String(z.label || '') + '=' + String(z.wert || '')).sort();
  /* Der Kern-Stand selbst reist mit: nur so ist belegt, dass hier zwei VERSCHIEDENE Kerne
     verglichen werden. Ohne ihn wäre „die drei Wege sind gleich" auch dann grün, wenn die
     Umlenkung gar nicht gegriffen hätte und beide Male derselbe Kern lief. */
  return { pdf, datensatz, qr, wortlautDocx: V.STRINGS.exportDocxLabel };
}

test('[Zug3.1·Rot-Beleg am Gegenstand] der Kern VOR der Streichung liest window.docx, der heutige nicht', () => {
  const alt = fs.readFileSync(kernVonCommit(VOR_DER_STREICHUNG), 'utf8');
  const heute = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const ohneKommentare = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(/window\.docx/.test(ohneKommentare(alt)),
    'der Vergleichsstand trägt gar kein `window.docx` — dann ist er der falsche, und der '
    + 'Rot-Beleg misst nichts');
  assert.ok(!/window\.docx/.test(ohneKommentare(heute)),
    'der heutige Kern liest wieder `window.docx` — der gestrichene Weg ist zurück');
});

test('[Zug3.1·DIE GEGENPROBE] PDF, Datensatz und QR tragen unverändert — kein Feld verschwindet', async () => {
  const alt = await dieDreiWege(ladeMit(kernVonCommit(VOR_DER_STREICHUNG)), true);
  const neu = await dieDreiWege(ladeMit(null), false);

  /* POSITIVKONTROLLE ZUERST: die Wege müssen überhaupt etwas tragen. Zwei leere Listen wären
     sonst „gleich" und die Probe grün, ohne etwas gemessen zu haben. */
  assert.ok(alt.pdf.length > 3, 'der Vergleichsstand trägt kaum PDF-Zeilen: ' + alt.pdf.length);
  assert.ok(alt.datensatz.length > 3, 'der Vergleichsstand trägt kaum Datensatz-Schlüssel');
  assert.ok(alt.qr.length > 0, 'der QR-Notfallkern des Vergleichsstands ist leer — dann vergleicht '
    + 'die dritte Zeile unten zwei leere Listen und sagt nichts');

  /* DER BELEG, DASS ZWEI VERSCHIEDENE KERNE LAUFEN. Ohne ihn misst diese Probe womöglich
     zweimal denselben. */
  /* Der Marker ist der WORTLAUT, nicht die Funktion: `flowDocxExport` wäre in beiden Läufen
     `undefined`, weil der Export-Haken von `load-kern.js` heute gilt — für BEIDE Kerne. Das ist
     genau die Falle, die dieser Beleg fangen soll, und sie ist beim ersten Versuch zugeschnappt.
     Der Wortlaut dagegen steht IM Kern (`AB_WERK_TEXTSATZ_DE`) und unterscheidet die Stände. */
  assert.equal(alt.wortlautDocx, 'Als Word-Datei (für Behörden/Notar)',
    'der Vergleichsstand trägt den Word-Wortlaut nicht — die Umlenkung hat nicht gegriffen, und '
    + 'der Vergleich ist wertlos');
  assert.equal(neu.wortlautDocx, undefined, 'der heutige Kern trägt den Word-Wortlaut noch');

  assert.deepEqual(neu.pdf, alt.pdf, 'das PDF trägt nach der Streichung andere Zeilen');
  /* Klärung 17.09.2026 — unrelated zur Streichung: `_zurueckgehalten` ist ein NEUER
     Top-Level-Umschlag-Schlüssel, seit vollExportJSON() alle sieben Ab-Werk-Mitschrift-Fächer
     ehrlich zählt statt drei davon zu übersehen (Migrationsbeleg-Klärung, U2-ADR-NNN3) — ein
     reiner Umschlag-Zuwachs seit dem Vergleichsstand VOR_DER_STREICHUNG, kein durch die
     docx-Streichung verschwundenes oder verändertes Feld. Am Vergleichsstand nachgetragen, damit
     diese Probe weiterhin genau das prüft, wofür sie gebaut ist (kein Feldverlust durch die
     Streichung) und nicht an einem unabhängigen, späteren Umschlag-Zuwachs bricht. */
  const altDatensatzMitZuwachs = alt.datensatz.concat('_zurueckgehalten').sort();
  assert.deepEqual(neu.datensatz, altDatensatzMitZuwachs, 'der Datensatz trägt andere Schlüssel');
  assert.deepEqual(neu.qr, alt.qr, 'der QR-Notfallkern trägt andere Zeilen');
});
