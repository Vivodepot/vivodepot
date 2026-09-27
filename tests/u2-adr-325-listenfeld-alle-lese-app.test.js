'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-325 — `listenfeldAlle` erreicht den Empfänger, und die
   Sensibel-Zurückhaltung gilt JE ZEILE
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND (06.09.2026, gemessen):

     Kern    LOGIK_DATEN_TYPEN        6 Typen, darunter listenfeldAlle
     Lesen   LOGIK_DATEN_TYPEN_LESEN  5 Typen — listenfeldAlle fehlte

     Notar-Kanzleivertretung (U2-ADR-287)   feld x4, listenfeldAlle x5
     Geschaeftsfuehrerin     (U2-ADR-295)   feld x6, listenfeldAlle x5
     Erbschein               (U2-ADR-288)   ohne listenfeldAlle

   Ein unbekannter Typ im datenSchema weist das GANZE Bundle ab. Beide
   eingelassenen Pro-Templates waren beim Empfaenger darum nicht vorhanden,
   obwohl der Kern sie zeigt — das Notar-Template hatte am Vortag einen
   DoD-Posten erfuellt.

   DIE SCHARFE STELLE IST NICHT DER TYP, SONDERN SEINE SENSIBEL-PRUEFUNG.
   `unterfeldIstSensibel(sektorId, listeId, ZEILE, unterfeldDef)` nimmt die
   ZEILE — der Schluessel traegt deren `typ`. Dieselbe Spalte kann in einer
   Zeile zurueckgehalten sein und in der naechsten nicht. Eine Pruefung, die
   einmal fuer die ganze Liste entschiede, waere in BEIDE Richtungen falsch:

     zu wenig  ein zurueckgehaltenes Unterfeld erscheint beim Empfaenger
     zu viel   die unverdaechtigen Zeilen verschwinden mit, und das faellt
               niemandem auf — es sieht aus wie Datenschutz. Der Empfaenger
               sieht ein Dokument mit Loechern und weiss nicht, dass sie da sind.

   Die Proben unten pruefen beide Richtungen, und die dritte Zeile der
   Rot-Probe ist die gegen „zu viel".
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeLesen } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const SEKTOR = 'advanceCare';
const LISTE = 'provisionInstruments';
const UNTERFELD = 'certifyingBody';   // schema-UNsensibel — die Sensibilitaet kommt hier je Zeile dazu

function basisDepot(extra) {
  return Object.assign({
    schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [],
    sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [],
  }, extra || {});
}

/* Drei Zeilen, die sich nur im `instrument` unterscheiden — der Schluessel, ueber den
   die Sensibel-Ueberschreibung je Zeile greift. */
function depotMitDreiZeilen(sensiblerTyp) {
  const d = basisDepot({
    sektoren: { [SEKTOR]: { [LISTE]: [
      { id: 'z1', instrument: 'offen',   [UNTERFELD]: 'ZEILE-EINS' },
      { id: 'z2', instrument: 'geheim',  [UNTERFELD]: 'ZEILE-ZWEI' },
      { id: 'z3', instrument: 'offen',   [UNTERFELD]: 'ZEILE-DREI' },
    ] } },
  });
  if (sensiblerTyp) {
    // Der Schluesselraum kommt aus derselben Instanz wie das Produkt, nicht abgeschrieben.
    const { V } = ladeLesen();
    const schluessel = V.LISTEN_UNTERFELD_PRAEFIX + LISTE + ':' + sensiblerTyp + ':' + UNTERFELD;
    d.sensibelFelder = { [SEKTOR]: { [schluessel]: true } };
  }
  return d;
}
function alleZeilen(V, depot) {
  V.setData(depot);
  return V._datenPrimitivLesenLesen({ typ: 'listenfeldAlle', sektor: SEKTOR, feld: LISTE, unterfeld: UNTERFELD });
}

test('[U2-ADR-325·Ausbeute] ohne Zurückhaltung liefert listenfeldAlle JEDE Zeile', () => {
  const { V } = ladeLesen();
  // Die Ausbeute zuerst: liefert der Typ ueberhaupt etwas, sagt eine spaetere Null etwas.
  assert.equal(typeof V._datenPrimitivLesenLesen, 'function');
  assert.deepEqual(alleZeilen(V, depotMitDreiZeilen(null)).join('|'),
    ['ZEILE-EINS', 'ZEILE-ZWEI', 'ZEILE-DREI'].join('|'));
});

test('[U2-ADR-325·Rot-Beweis·Sicherheit] die sensible Zeile fällt weg — und NUR sie', () => {
  const { V } = ladeLesen();
  const raus = alleZeilen(V, depotMitDreiZeilen('geheim'));

  // 1 · zu wenig zurückgehalten wäre eine Offenlegung
  assert.ok(!raus.includes('ZEILE-ZWEI'),
    'das zurückgehaltene Unterfeld darf beim Empfänger nicht erscheinen — ein Bundle darf die '
    + 'Sensibel-Zurückhaltung nicht über einen neuen Typ umgehen');

  // 2 · die Nachbarzeilen sind da
  assert.ok(raus.includes('ZEILE-EINS'));
  assert.ok(raus.includes('ZEILE-DREI'));

  // 3 · und sie sind VOLLSTÄNDIG, nicht auf eine verkürzt. Ohne diese Zeile bestünde die Probe
  //     auch dann, wenn der Filter aus Vorsicht zu viel wegnimmt — und „zu viel weggenommen"
  //     fällt niemandem auf, weil es aussieht wie Datenschutz.
  assert.equal(raus.length, 2, 'genau die beiden unverdächtigen Zeilen, keine weniger');
  assert.equal(raus.join('|'), 'ZEILE-EINS|ZEILE-DREI', 'in der Reihenfolge der Liste');
});

test('[U2-ADR-325·Rot-Beweis Gegenrichtung] ohne Überschreibung wird keine Zeile zurückgehalten', () => {
  const { V } = ladeLesen();
  assert.equal(alleZeilen(V, depotMitDreiZeilen(null)).length, 3,
    'sonst prüfte die Probe oben nur, dass überhaupt etwas wegfällt');
});

test('[U2-ADR-325] ein schema-sensibles Unterfeld bleibt in JEDER Zeile zurückgehalten', () => {
  const { V } = ladeLesen();
  // `storageLocation` trägt `sensibel` schon im Schema — dann gilt es zeilenunabhängig.
  const d = basisDepot({
    sektoren: { [SEKTOR]: { [LISTE]: [
      { id: 'z1', instrument: 'offen', storageLocation: 'ORT-EINS' },
      { id: 'z2', instrument: 'geheim', storageLocation: 'ORT-ZWEI' },
    ] } },
  });
  V.setData(d);
  const raus = V._datenPrimitivLesenLesen({ typ: 'listenfeldAlle', sektor: SEKTOR, feld: LISTE, unterfeld: 'storageLocation' });
  assert.deepEqual(raus.join('|'), '', 'kein Ort erscheint — die Schema-Sensibilität gilt für alle Zeilen');
});

test('[U2-ADR-325] die beiden Pro-Templates werden jetzt angenommen und gerendert', () => {
  const { V } = ladeLesen();
  // U2-ADR-421-Nachtrag (08.09.2026): das ausgelieferte Bereichs-Modul-Artefakt
  // (tests/fixtures/…-bereich.json, U2-ADR-379) statt tools/pruefstoff-betriebsuebergabe-
  // bereichsmodul-bauen.js — dessen MODUL ist bewusst der ältere, unveränderte
  // signierte Sechs-Bereiche-Betriebssatz-Weg (s. Kopf-Kommentar an
  // tools/betriebssatz-inhalte.js) und kennt pro-identitaet nicht. Das
  // Geschäftsführerin-Logikmodul referenziert seit dem Nachtrag genau diesen Sektor
  // (kontakt_telefon/kontakt_email) — ohne ihn im gedockten Bereich fällt die
  // Strukturprüfung mit grund:'blockstruktur'. pro-notar bleibt unberührt: es
  // referenziert weiterhin den nativen identitaet-Sektor, den dieser additive
  // (nicht-bereichsErsatz) Testkontext unverändert mitführt.
  const bereichsModul = JSON.parse(fs.readFileSync(
    path.join(REPO, 'tests', 'fixtures', 'pro-bereich-testschablone.json'), 'utf8'));
  for (const name of ['pro-logikmodul-testschablone-zwei-de', 'pro-logikmodul-testschablone-de']) {
    const bundle = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', name + '.json'), 'utf8'));
    const depot = basisDepot({ logikModule: [bundle], bereichsModule: [bereichsModul] });
    V.setData(depot);
    V._foldVollmachtenLesen(depot);
    assert.equal(V.logikModulPruefenLesen(bundle).gueltig, true,
      name + ' muss die Strukturprüfung bestehen — vor U2-ADR-325 fiel sie am unbekannten Typ');
    const html = V.sektorHTML(bundle.sektor);
    assert.ok(html.length > 500, name + ' muss beim Empfänger etwas rendern, nicht nur den Bereichskopf');
    assert.ok(html.includes(bundle.dokAusgabe.h1), 'die Überschrift des Bundles muss erscheinen');
  }
});

test('[U2-ADR-325·eine Quelle] die Typliste der Lese-App ist die des Kerns', () => {
  const { V: L } = ladeLesen();
  const { V: K } = ladeKern();
  assert.deepEqual(L.LOGIK_DATEN_TYPEN_LESEN.join('|'), K.LOGIK_DATEN_TYPEN.join('|'),
    'zwei Aufzählungen derselben Sache liefen auseinander — sie kommen jetzt aus einer Quelle');
});

test('[U2-ADR-325·Erzeuger] --check ist grün gegen den echten Bestand', () => {
  const r = execFileSync(process.execPath, [path.join(REPO, 'tools', 'build-logik-typen.js'), '--check'],
    { cwd: REPO, encoding: 'utf8' });
  assert.match(r, /nichts zu tun/);
});

test('[U2-ADR-325·Erzeuger·Rot] ein Kern-Typ ohne Lese-Fall lässt den Erzeuger scheitern', () => {
  /* DER PUNKT DIESES ERZEUGERS. Eine bloß abgeschriebene Typliste wäre SCHLIMMER als der alte
     Zustand: heute weist die Lese-App ein Bundle mit unbekanntem Typ ab — laut und ganz. Stünde
     der Name in der Liste ohne `case`, nähme sie es an und ließe das Feld still leer. */
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'u2-adr-325-'));
  try {
    const kopie = path.join(tmp, 'lesen.html');
    const quelle = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
    const verstuemmelt = quelle.replace("case 'listenfeldAlle': {", "case 'gibtEsNicht': {");
    assert.notEqual(verstuemmelt, quelle, 'der Anker für die Rot-Probe muss treffen — sonst prüft sie nichts');
    fs.writeFileSync(kopie, verstuemmelt, 'utf8');

    let geworfen = null;
    try {
      execFileSync(process.execPath,
        [path.join(REPO, 'tools', 'build-logik-typen.js'), '--check', '--lese', kopie],
        { cwd: REPO, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) { geworfen = e; }
    assert.ok(geworfen, 'der Erzeuger muss mit Exit 1 scheitern, nicht still durchlaufen');
    assert.equal(geworfen.status, 1);
    assert.match(String(geworfen.stderr), /keinen Fall hat: listenfeldAlle/);
    assert.match(String(geworfen.stderr), /NICHT einfach nachziehen/,
      'die Meldung muss sagen, was zu tun ist — zuerst den Lese-Fall bauen, dann erzeugen');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
