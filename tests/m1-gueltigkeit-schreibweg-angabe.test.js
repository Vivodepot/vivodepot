'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A320 / N1 — die Gültigkeits-EINGABE nur dort, wo der Schreibweg sie erreicht
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (A317, Nebenbefund N1): am Situationsblatt stand eine
   Gültigkeits-Eingabe, die nichts speicherte. `verdrahteSektorEingaben` ist
   container-gebunden und greift nur, wo sie gerufen wird; der Renderer zeigte
   die Zeile trotzdem an jedem Datumsfeld.

   Die Produktentscheidung vom 18.08.2026 verlangt ausdrücklich eine
   ALLGEMEINE Regel und keine Ausnahme für den Situations-Pfad — sonst wäre der
   Sonderfall behoben und die Ursache stehengeblieben.

   Was hier geprüft wird, ist die BEHAUPTUNG des Aufrufers: ohne sie keine
   Eingabe (Voreinstellung `false`), mit ihr eine. Dass die Behauptung im echten
   Browser auch stimmt, prüft die E2E-Probe — im Node-Harnisch liefert
   `querySelectorAll` unbedingt `[]`, eine Verdrahtungs-Aussage wäre hier ein
   Phantom.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `identitaet.ausweis_gueltig` ist mit diesem
// Glied in die Liste `ausweis` gewandert und trägt darum kein `laeuftAb`-Bereichsfeld mehr (s.
// `m1-gueltigkeit-ausweisdokumente.test.js`). Diese Datei prüft den ALLGEMEINEN Schreibweg-
// Mechanismus, nicht den Ausweis speziell — als Beispielfeld tritt `mobility.passportValidUntil`
// an seine Stelle, ein unverändertes Bereichsfeld mit derselben Marke.
function feldDef(V) { return V.feldDefFuer('mobility', 'passportValidUntil'); }

test('[A320] ohne Schreibweg-Angabe entsteht KEINE Eingabe — auch am markierten Feld', () => {
  const { V } = ladeKern();
  const h = V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil', feldDef(V), true);
  assert.equal(h, '', 'die Voreinstellung muss stumm sein, nicht stumm-sichtbar');
});

test('[A320] mit Schreibweg-Angabe entsteht die Eingabe', () => {
  const { V } = ladeKern();
  const h = V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil', feldDef(V), true, true);
  assert.ok(h.includes('data-gueltig-von="mobility.passportValidUntil"'), 'von-Eingabe fehlt');
  /* M1 Zug 5/Zug 1 (der Umzug): wo die Marke sitzt, gibt es KEIN zweites `bis` — das Feld
     selbst ist seit dem Umzug der Träger des `bis` (`feldRohwertSetzen`). Ein zweites
     Eingabefeld daneben zeigte denselben Wert doppelt. */
  assert.equal(h.includes('data-gueltig-bis="mobility.passportValidUntil"'), false,
    'kein zweites bis-Eingabefeld an einem markierten Feld');
});

test('[A320] eine GESETZTE Gültigkeit bleibt sichtbar, auch ohne Schreibweg — als Text, nicht als Eingabe', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  /* M1 Zug 5/Zug 1: geprüft an einem Feld OHNE Marke. An einem markierten Feld zeigt seit dem
     Umzug das Feld selbst das `bis`; hier geht es um die Zusicherung „gesetzt bleibt sichtbar,
     auch ohne Schreibweg", und die gilt unverändert. */
  V.feldGueltigkeitSetzen('identity', 'birthDate', null, '2030-03-02');
  const h = V.feldGueltigkeitZeileHTML('identity', 'birthDate',
    V.feldDefFuer('identity', 'birthDate'), true);
  assert.ok(h.includes('2030-03-02'), 'die Aussage muss stehen — sie zu verstecken wäre schlimmer');
  assert.equal(h.includes('<input'), false, 'aber kein Bedienelement, das nichts speichert');
  assert.equal(h.includes('data-gueltig-'), false, 'und kein Schreibweg-Anker');
});

test('[A320] feldZeileHTML reicht die Angabe durch — ohne sie keine Eingabe in der ganzen Zeile', () => {
  const { V } = ladeKern();
  const f = feldDef(V);
  const ohne = V.feldZeileHTML(f, undefined, 'mobility', true);
  const mit = V.feldZeileHTML(f, undefined, 'mobility', true, true);
  assert.equal(ohne.includes('data-gueltig-'), false, 'ohne Angabe darf nichts Gültigkeits-Bezogenes im HTML stehen');
  /* M1 Zug 5/Zug 1 (der Umzug): wo die Marke sitzt, gibt es KEIN zweites `bis` — das Feld
     selbst ist seit dem Umzug der Träger des `bis` (`feldRohwertSetzen`). Ein zweites
     Eingabefeld daneben zeigte denselben Wert doppelt. */
  assert.ok(mit.includes('data-gueltig-von='), 'mit Angabe muss die Eingabe stehen');
});

test('[A320·Rot] genau die Stelle, die den Fehler trug: der Situations-Pfad gibt `false`', () => {
  const fs = require('node:fs'), path = require('node:path');
  const q = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  // Der eigene-Felder-Aufruf in renderSituation. Steht dort wieder eine Zeile ohne fünftes
  // Argument, ist der Fehler zurück — und diese Probe fängt ihn am Quelltext, weil der
  // Node-Harnisch den gerenderten Situations-Schirm nicht stellt.
  const anker = "let zeile = feldZeileHTML(f, eigeneDaten[f.id], druck ? null : _sitNs(sitId), darf && !druck, false)";
  assert.ok(q.includes(anker), 'der Situations-Pfad behauptet keinen Schreibweg mehr — Anker: ' + anker);
});

/* NACHGEZOGEN am 21.08.2026 (Kreise-Laufzettel Posten 5). Die zwei Marken sind ZURÜCK — und
   die Zusicherung dieser Probe bleibt dieselbe: **deklariert und wirksam sind deckungsgleich.**

   AM 18.08. FIELEN SIE, WEIL SIE NICHTS BEWIRKTEN: `data.feldGueltigkeit` ist flach, für
   beliebig viele Karten gäbe es einen Schlüssel. Heute bewirken sie etwas — nur woanders: die
   Zeile trägt ihr Datum selbst, und `prueftermineZeilen` liest den Termin DORT. Der flache
   Schlüsselraum wird gar nicht mehr betreten.

   DIE PROBE ZÄHLT DARUM ZWEI WIRKUNGEN, nicht eine: ein BEREICHSFELD wirkt über
   `feldHatMarke`/`feldGueltigkeit`, ein LISTEN-UNTERFELD über den Zeilen-Prüftermin. Eine Marke
   ohne eine der beiden Wirkungen ist weiterhin eine Zusicherung ohne Deckung. */
test('[A320] deklarierte und wirksame Marken sind deckungsgleich — auch die zwei in den Listen', async () => {
  const { V } = ladeKern();
  let deklariertFeld = 0, wirksamFeld = 0, deklariertZeile = 0;
  const listenMitMarke = [];
  for (const sek of Object.values(V.SEKTOR_BY_ID)) {
    for (const s of (sek.sektionen || [])) {
      for (const f of (s.felder || [])) {
        if ((f.marken || []).includes('laeuftAb')) {
          deklariertFeld++;
          if (V.feldHatMarke(sek.id, f.id, 'laeuftAb')) wirksamFeld++;
        }
        for (const u of (f.unterFelder || [])) {
          if ((u.marken || []).includes('laeuftAb')) { deklariertZeile++; listenMitMarke.push([sek.id, f.id, u.id]); }
        }
      }
    }
  }
  assert.equal(deklariertFeld, wirksamFeld, 'jede Marke an einem Bereichsfeld wirkt auch');
  assert.equal(deklariertZeile, 2, 'die zwei Listen-Unterfelder aus Posten 5');

  // Und die WIRKUNG der zwei, am echten Prüfblatt gemessen statt behauptet.
  await V.depotAnlegen('a320-probe-2026');
  V.akteurSelbstErklaeren('Tester');
  for (const [sekId, feldId, ufId] of listenMitMarke) {
    V.listenEintragHinzufuegen(sekId, feldId, { [ufId]: '2027-01-01' });
  }
  const termine = V.prueftermineZeilen(new Date('2026-08-21T00:00:00Z'));
  assert.equal(termine.length, deklariertZeile,
    'jede Marke in einer Listenzeile erzeugt ihren Prüftermin — sonst wäre sie wieder tot');
});
