'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-2 — Betrag ohne Einheit („Die vier übrigen Wächter",
   09.08.2026, Zug 2)
   ────────────────────────────────────────────────────────────────────────
   Prüft: jedes Betragsfeld hat Währung UND Frequenz als eigenes Feld, nicht
   im Platzhalter. Träger-Erkennung identisch zu W-1 (dieselbe Definition
   eines „Betragsfelds": Ziffernfolge unmittelbar neben EUR/€ im Beispiel) —
   W-1 und W-2 sind zwei Achsen über derselben Grundmenge (Zahl-Typ fehlt vs.
   Einheiten fehlen), Auftragswortlaut: „sauber trennen, welches Feld in
   welcher Liste steht und welche in beiden".

   Bis F5 Posten 1 („F4 und F5", 09.08.2026): ein Betragsfeld galt
   als versehen, wenn IRGENDWO im Schema ein Einheitenfeld existierte —
   gemessen: keines, also waren alle zehn Funde. Seit F5 Posten 1 (drei
   Betragsfelder bekamen ein eigenes Währungs-/Frequenzfeld DANEBEN) reicht
   die Existenz-Prüfung nicht mehr — sonst würde ein einziges neues
   Einheitenfeld irgendwo im Schema ALLE übrigen Betragsfelder fälschlich
   als „versehen" durchwinken. PRO-NACHBARSCHAFT jetzt: ein Betragsfeld gilt
   als versehen, wenn EIN GESCHWISTERFELD in DERSELBEN Liste (Listen-
   Unterfeld) bzw. DERSELBEN Sektion (Sektorfeld) ein Einheitenfeld ist —
   nicht irgendwo im ganzen Schema.
   REICHWEITE (A443, 21.08.2026): wie W-1 — dieser Waechter misst den EINGEBAUTEN Katalog. Die
   Regel selbst greift auch am angedockten Feld: die „Nachbarschaft" ist dort das Modul, seine
   Felder stehen in einer Reihenfolge. Belegt in `tools/andock-regeln-pruefen.js`.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { betragFunde } = require('./w1-betrag-ohne-zahl-pruefen.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w2-betrag-ohne-einheit-grundlinie.json');

// GEMESSEN: eine reine Teilstring-Suche traf falsch-positiv auf „Heilungs-
// BEWÄHRUNG" (enthält „währung" als Teilstring) — Wortgrenzen-Suche (\b)
// hilft bei deutschen Komposita nicht, weil „währung" dort MITTEN im
// zusammengesetzten Wort steht, keine echte Wortgrenze davor liegt. Der
// Vergleich prüft darum auf Wort-ANFANG/-ENDE der Kandidaten-Wörter aus
// id+Label, nicht auf einen Teilstring-Treffer irgendwo im Fließtext.
const EINHEITENFELD_WOERTER = /^(waehrung|währung|currency|frequenz|intervall|turnus|rhythmus)$/i;

function istEinheitenfeld(id, label) {
  const woerter = (id + ' ' + (label || '')).split(/[^a-zA-ZäöüÄÖÜß]+/).filter(Boolean);
  return woerter.some((w) => EINHEITENFELD_WOERTER.test(w));
}

// Rückwärtskompatibel gehalten (Name + Signatur), jetzt eine Existenzfrage über das
// GANZE Schema — nur noch für die Selbsttest-Positivkontrolle genutzt, nicht mehr
// für das Gate selbst (das prüft seit F5 Posten 1 pro Nachbarschaft, s. u.).
function schemaHatEinheitenfeld(V) {
  for (const s of V.bereicheAlle()) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        if (istEinheitenfeld(f.id, f.label)) return true;
        for (const u of f.unterFelder || []) {
          if (istEinheitenfeld(u.id, u.label)) return true;
        }
      }
    }
  }
  return false;
}

// PRO NACHBARSCHAFT (seit F5 Posten 1): ein Betragsfeld ist versehen, wenn eines der
// UNMITTELBAR FOLGENDEN Felder (Array-Adjazenz, Fenster 2 — Währung UND Frequenz
// können beide direkt danach stehen) ein Einheitenfeld ist. NICHT „irgendwo in
// derselben Sektion/Liste" — dasträfe bei `wohnen` z. B. `kaution` fälschlich mit,
// nur weil `miete_waehrung` als Nachbar von `miete` (nicht von `kaution`) im selben
// Feld-Array steht (gemessen: genau dieser Fall, vor dem Schreiben der Grundlinie
// gefangen).
const NACHBAR_FENSTER = 2;
function hatEinheitNachbarn(arr, index) {
  for (let i = index + 1; i <= index + NACHBAR_FENSTER && i < arr.length; i++) {
    if (istEinheitenfeld(arr[i].id, arr[i].label)) return true;
  }
  return false;
}
function einheitFunde(V) {
  const alleBetraege = betragFunde(V);
  const funde = [];
  for (const s of V.bereicheAlle()) {
    for (const sek of s.sektionen || []) {
      const felder = sek.felder || [];
      felder.forEach((f, i) => {
        const eigenerFund = alleBetraege.find((b) => b.carrier === 'Sektorfeld' && b.ort === s.id && b.id === f.id);
        if (eigenerFund && !hatEinheitNachbarn(felder, i)) funde.push(eigenerFund);
        const unterFelder = f.unterFelder || [];
        unterFelder.forEach((u, j) => {
          const listenFund = alleBetraege.find((b) => b.carrier === 'Listen-Unterfeld' && b.ort === s.id + '.' + f.id && b.id === u.id);
          if (listenFund && !hatEinheitNachbarn(unterFelder, j)) funde.push(listenFund);
        });
      });
    }
  }
  return funde;
}

function schluesselFund(f) { return f.carrier + '|' + f.ort + '|' + f.id; }
function ladeGrundlinie() { return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')); }
function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map(schluesselFund));
  const neu = funde.filter((f) => !bekannt.has(schluesselFund(f)));
  return { neu, rot: neu.length > 0 };
}
function ermittleFunde(V) { return einheitFunde(V); }

if (require.main === module) {
  const { ladeKern } = require('../tests/load-kern.js');
  const args = process.argv.slice(2);
  const { V } = ladeKern();
  const funde = ermittleFunde(V);
  if (args.includes('--grundlinie-schreiben')) {
    const vorhandene = fs.existsSync(GRUNDLINIE) ? ladeGrundlinie() : [];
    const bekannt = new Map(vorhandene.map((f) => [schluesselFund(f), f]));
    const ausgabe = funde.map((f) => bekannt.get(schluesselFund(f)) || Object.assign({}, f, {
      vermerk: 'Entscheidung offen', begruendung: 'automatisch übernommen — noch nicht klassifiziert',
    }));
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(ausgabe, null, 2) + '\n');
    console.log('Grundlinie geschrieben:', ausgabe.length, 'Einträge');
  } else if (args.includes('--json')) {
    console.log(JSON.stringify(funde, null, 2));
  } else if (args.includes('--gate')) {
    const grundlinie = ladeGrundlinie();
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (rot) {
      console.log('GATE ROT —', neu.length, 'neue(r) Fund(e) gegen die Grundlinie:');
      for (const f of neu) console.log(' ', schluesselFund(f));
      process.exitCode = 1;
    } else {
      console.log('GATE grün — kein neuer Fund gegen die Grundlinie (' + grundlinie.length + ' bekannt).');
    }
  } else {
    console.log(funde.length, 'Funde,', funde.length, 'gegen Grundlinie zu prüfen (--gate) oder --json/--grundlinie-schreiben');
  }
}

module.exports = { einheitFunde, schemaHatEinheitenfeld, schluesselFund, ladeGrundlinie, gateBewerten, ermittleFunde, EINHEITENFELD_WOERTER };
