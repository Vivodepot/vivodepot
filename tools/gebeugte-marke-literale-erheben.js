'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   gebeugte-marke-literale-erheben.js — Bestands-Wächter statt Muster-Wächter
   (U2-ADR-374, Nachtrag zu U2-ADR-371)
   ────────────────────────────────────────────────────────────────────────────
   U2-ADR-371 fand zwei Bürgerin-facing Sätze, die „Vivodepot" gebeugt trugen
   („Ihres Vivodepots", Genitiv) und unter fremdem Branding falsch geblieben
   wären. Ein WÄCHTER GEGEN DAS MUSTER (jedes `Vivodepot[a-zäöü]+` im Bestand)
   wurde geprüft und verworfen (ADR-371 Abschnitt 6): er träfe legitime
   Code-Kommentare und technische Bezeichner ebenso wie echte Bürgerin-Prosa —
   eine Erlaubnisliste wäre nötig, und genau die macht den Wächter blind für
   neue Fälle, die er stumm mitschleppt.

   DIESES WERKZEUG FRIERT STATTDESSEN DIE MENGE EIN, NICHT DAS MUSTER. Es
   erhebt jede heutige Fundstelle. Ändert sich die Menge — ein Treffer kommt
   hinzu, einer verschwindet —, meldet der zugehörige Test das als Fund, nicht
   als Fehlschlag: jeder Zuwachs ist zu prüfen (meistens ein harmloser
   Kommentar, manchmal ein echter Rückfall wie in ADR-371), jeder Verlust ist
   zu bestätigen (ein Fix wie ADR-371, oder eine gelöschte Code-Zeile).

   IDENTITÄT EINES TREFFERS (Korrektur, 08.09.2026 — Fund gegen den
   ersten Entwurf): Datei + GETROFFENE ZEICHENKETTE — NICHT Datei + Kontext.
   Der erste Entwurf nahm ein 60-Zeichen-Fenster um den Treffer als Identität.
   Das brach beim ALLERERSTEN Konvoi danach: Konvoi 8 fügte Text VOR der
   Fundstelle in der `SCHALEN_STAND`-Zeile ein (jeder Schalen-Bump tut das,
   per Konvention immer am Ende derselben Zeile — und diese eine Fundstelle
   sitzt in genau dieser Zeile), das Fenster verschob sich, und derselbe,
   unveränderte Kommentar wäre als Zuwachs UND Verlust gemeldet worden — ein
   Fehlalarm bei JEDEM künftigen Bump. Ein Wächter, der ohne Grund ruft, wird
   nach dem dritten Mal weggeklickt — und dann fängt er den echten Fall auch
   nicht mehr. Die Zeichenkette selbst (`Vivodepots`, bisher die einzige
   auftretende Form) ist stabil gegen jede Positionsverschiebung; der
   Kontext bleibt erhalten, aber nur noch als BESCHREIBUNG für die
   Fehlermeldung, nicht als Teil der Identität. Verloren geht dadurch
   bewusst: eine Verschiebung DERSELBEN Fundstelle innerhalb derselben Datei
   fällt nicht mehr auf — richtig so, das ist kein Befund. Ein echtes neues
   oder verschwundenes Vorkommen bleibt gefangen (s. Rot-Beweise im Testfile).

   Aufruf:  node tools/gebeugte-marke-literale-erheben.js [--json]
   Ohne Argument: menschenlesbarer Bericht. Mit `--json`: die reine Liste,
   für Tests und für das Neuschreiben der eingefrorenen Fixture.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Dieselbe Dateimenge wie die manuelle Prüfung in ADR-371 Abschnitt 5: die drei
   Oberflächen, auf denen „Vivodepot" je als Literal stehen könnte. */
const DATEIEN = Object.freeze([
  'vivodepot.html',
  'vivodepot-lesen.html',
  'vivodepot-template-generator.html',
]);

const MUSTER = /Vivodepot[a-zäöüß]+/g;
const KONTEXT_BREITE = 60;

function kontextAusschnitt(zeile, treffer) {
  const start = Math.max(0, treffer.index - KONTEXT_BREITE);
  const ende = Math.min(zeile.length, treffer.index + treffer[0].length + KONTEXT_BREITE);
  return zeile.slice(start, ende).trim();
}

/* Die Identität EINES Treffers — Datei + die getroffene Zeichenkette selbst (z. B.
   „Vivodepots"), NICHT der Kontext (nur Beschreibung, s. Kopf-Kommentar) und NICHT die
   Zeilennummer (verschiebt sich bei jeder Zeileneinfügung). Zwei Treffer mit derselben
   Zeichenkette in derselben Datei sind KEIN Widerspruch — `vivodepot.html` trägt
   „Vivodepots" neunfach (Erbschein-Wortlaut dreifach an drei Orten, sechs weitere
   Kommentare). Der Vergleich unten zählt darum mit Vielfachheit (`alsZaehlkarte`), statt
   sie in einer Menge stillschweigend zu verschmelzen. */
function schluessel(eintrag) {
  return eintrag.datei + ' ' + eintrag.treffer;
}

function erheben(dateien = DATEIEN) {
  const funde = [];
  for (const rel of dateien) {
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) continue;
    const zeilen = fs.readFileSync(abs, 'utf8').split('\n');
    zeilen.forEach((zeile, i) => {
      MUSTER.lastIndex = 0;
      let treffer;
      while ((treffer = MUSTER.exec(zeile))) {
        funde.push({
          datei: rel,
          treffer: treffer[0],
          zeilennummer: i + 1,   // NUR fürs Menschenlesen im Bericht — nicht Teil der Identität
          kontext: kontextAusschnitt(zeile, treffer),   // NUR Beschreibung — nicht Teil der Identität
        });
      }
    });
  }
  // Deterministische Reihenfolge, unabhängig von Dateisystem-Details.
  funde.sort((a, b) => schluessel(a).localeCompare(schluessel(b)) || a.kontext.localeCompare(b.kontext));
  return funde;
}

/* MULTIMENGE, nicht Menge — s. Kopf-Kommentar zu `schluessel`. */
function alsZaehlkarte(funde) {
  const karte = new Map();
  for (const f of funde) {
    const k = schluessel(f);
    karte.set(k, (karte.get(k) || 0) + 1);
  }
  return karte;
}

/* Vergleicht eine LIVE-Erhebung gegen eine eingefrorene Liste (aus der Fixture), inklusive
   Vielfachheit. Gibt benannte Zuwächse und Verluste zurück — nie nur "gleich/ungleich". */
function vergleichen(live, eingefroren) {
  const liveKarte = alsZaehlkarte(live);
  const eingefrorenKarte = alsZaehlkarte(eingefroren);
  const alleSchluessel = new Set([...liveKarte.keys(), ...eingefrorenKarte.keys()]);
  const zuwachs = [];
  const verlust = [];
  for (const k of alleSchluessel) {
    const liveAnzahl = liveKarte.get(k) || 0;
    const eingefrorenAnzahl = eingefrorenKarte.get(k) || 0;
    if (liveAnzahl > eingefrorenAnzahl) {
      const beispiel = live.find((f) => schluessel(f) === k);
      for (let i = 0; i < liveAnzahl - eingefrorenAnzahl; i += 1) zuwachs.push(beispiel);
    } else if (eingefrorenAnzahl > liveAnzahl) {
      const beispiel = eingefroren.find((f) => schluessel(f) === k);
      for (let i = 0; i < eingefrorenAnzahl - liveAnzahl; i += 1) verlust.push(beispiel);
    }
  }
  return { zuwachs, verlust, unveraendert: live.length - zuwachs.length };
}

function main() {
  const funde = erheben();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(funde, null, 2) + '\n');
    return;
  }
  console.log('gebeugte-marke-literale-erheben: ' + funde.length + ' Fundstellen über '
    + DATEIEN.join(', '));
  for (const f of funde) {
    console.log('  ' + f.datei + ':' + f.zeilennummer + '  ' + f.kontext);
  }
}

if (require.main === module) main();

module.exports = { erheben, vergleichen, schluessel, DATEIEN, MUSTER };
