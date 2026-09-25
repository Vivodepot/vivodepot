'use strict';
/* U2-ADR-309 — der A/B-Beweis für die Rechtsraum-Achse.

   U2-ADR-307 baute die Überlagerung und musste offenlassen, ob sie trägt: es gab keine
   B-Seite. Diese Proben liefern sie — als ausdrücklich benannte PRÜF-FIXTURE, nicht als
   Rechtsaussage:

     A   kein Rechtsraum-Modul     Fristen wie im eingebauten Bestand
     B   Prüf-Fixture geladen      dieselben Felder, ANDERE Fristen
         beide Kennungsformen      <sektorId>.<feldId> und situation:<sitId>.<feldId>

   WARUM EINE FIXTURE UND KEIN ECHTES UK-MODUL: für britisches Fristenrecht fehlt in dieser
   Sitzung jede belegbare Quelle — kein Netz, keine Rechtsdatenbank. Die Hausregel dazu ist
   dreifach im Kern dokumentiert („ein erfundener Text wäre eine Empfehlung Vivodepots —
   ersatzlos entfernt statt erfunden"), und eine erfundene FRIST wäre schlimmer als ein
   erfundener Hinweis: die Bürgerin verlässt sich darauf und versäumt sie.

   Die Fixture trägt die Warnung darum im DATEINAMEN, nicht nur im Kommentar. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FIXTURE_PFAD = path.join(__dirname, 'fixtures', 'rechtsraum-PRUEFFIXTURE-keine-rechtsaussage.json');
const HEUTE = new Date('2026-09-05T12:00:00Z');

function fixture() {
  return JSON.parse(fs.readFileSync(FIXTURE_PFAD, 'utf8'));
}

/* Sammelt alle Felder des Bestands, die eine `fristRegel` tragen, mit ihrer Kennung —
   generisch über SEKTOREN und SITUATIONEN, nicht aus einer Liste. Ein Feld, das später
   dazukommt, ist damit automatisch Teil des Beweises. */
function fristFelderSammeln(V) {
  const treffer = [];
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.fristRegel) treffer.push({ kennung: s.id + '.' + f.id, feld: f, situativ: false });
      }
    }
  }
  for (const sit of (V.SITUATIONEN || [])) {
    for (const blk of (sit.bloecke || [])) {
      for (const e of (blk.eintraege || [])) {
        if (e.feld && e.feld.fristRegel) {
          treffer.push({ kennung: 'situation:' + sit.id + '.' + e.feld.id, feld: e.feld, situativ: true });
        }
      }
    }
  }
  return treffer;
}

function hinweisFuer(V, t) {
  /* Ein Datum in das Feld legen, von dem die Regel rechnet — sonst liefert jede Seite leer,
     und der Vergleich wäre zwischen zwei Nichtsen. */
  const quellFeld = t.feld.fristRegel.abFeld || t.feld.id;
  const daten = {}; daten[quellFeld] = '2026-08-01';
  return V._fristHinweisFuerFeld(t.feld, daten, daten, HEUTE, t.kennung);
}

test('[A/B·Fixture] die Prüf-Fixture nennt sich selbst als solche — im Dateinamen und im Inhalt', () => {
  assert.ok(/PRUEFFIXTURE/.test(path.basename(FIXTURE_PFAD)),
    'die Fixture heißt nicht erkennbar Fixture. Ein Rechtsraum-Modul, das man für echt halten '
    + 'kann, ist genau das Risiko, gegen das diese Datei gebaut ist');
  const f = fixture();
  assert.ok(/KEINE RECHTSAUSSAGE/.test(f._WARNUNG || ''), 'die Warnung im Inhalt fehlt');
  /* U2-ADR-314: ein Eintrag traegt `fristRegel` ODER `gueltigkeitVorschlag` — beide
     verlangen eine Quelle, und beide muessen sich als Fixture zu erkennen geben. */
  for (const [k, v] of Object.entries(f.felder)) {
    const quellen = [v.fristRegel && v.fristRegel.quelle, v.gueltigkeitVorschlag && v.gueltigkeitVorschlag.quelle]
      .filter((q) => typeof q === 'string');
    assert.ok(quellen.length > 0, 'der Eintrag `' + k + '` traegt weder fristRegel noch gueltigkeitVorschlag');
    for (const q of quellen) {
      assert.ok(/PRÜF-FIXTURE/.test(q), 'die Quelle zu `' + k + '` sieht aus wie eine echte Norm: ' + q);
    }
  }
});

test('[A/B·A-Seite] ohne Modul liefert jedes Fristfeld den eingebauten Stand', () => {
  const { V } = ladeKern();
  V.rechtsraumFristUeberlagerungSetzen(null);
  const felder = fristFelderSammeln(V);
  assert.ok(felder.length >= 5, 'nur ' + felder.length + ' Fristfelder gefunden — erwartet mindestens fünf');
  for (const t of felder) {
    assert.ok(hinweisFuer(V, t).length > 0,
      'das Feld `' + t.kennung + '` liefert ohne Modul gar keinen Hinweis — dann misst der '
      + 'Vergleich unten für dieses Feld nichts');
  }
});

test('[A/B·B-Seite] mit geladener Fixture ändert sich JEDE überlagerte Frist', () => {
  const { V } = ladeKern();
  const felder = fristFelderSammeln(V);
  V.rechtsraumFristUeberlagerungSetzen(null);
  const a = felder.map((t) => hinweisFuer(V, t));

  const f = fixture();
  const r = V.rechtsraumFristUeberlagerungSetzen(f);
  assert.equal(r.gesetzt, true);
  const b = felder.map((t) => hinweisFuer(V, t));

  const ueberlagert = felder.filter((t) => f.felder[t.kennung] && f.felder[t.kennung].fristRegel);
  assert.ok(ueberlagert.length >= 5,
    'die Fixture deckt nur ' + ueberlagert.length + ' der ' + felder.length + ' Fristfelder ab — '
    + 'kommt ein Feld im Bestand dazu, gehört es hier aufgenommen oder benannt ausgelassen');

  const gleich = [];
  felder.forEach((t, i) => {
    if (!(f.felder[t.kennung] && f.felder[t.kennung].fristRegel)) return;
    if (a[i] === b[i]) gleich.push(t.kennung);
  });
  assert.deepEqual(gleich, [],
    'diese Felder zeigen mit und ohne Rechtsraum-Modul DASSELBE — die Überlagerung greift dort '
    + 'nicht, und ein zweiter Rechtsraum wäre für sie wirkungslos:\n  ' + gleich.join('\n  '));
});

test('[A/B·Beide-Formen] Sektor-Kennung und Situations-Kennung greifen beide', () => {
  const { V } = ladeKern();
  const felder = fristFelderSammeln(V);
  const f = fixture();
  const sektor = felder.filter((t) => !t.situativ && f.felder[t.kennung] && f.felder[t.kennung].fristRegel);
  const situativ = felder.filter((t) => t.situativ && f.felder[t.kennung] && f.felder[t.kennung].fristRegel);
  assert.ok(sektor.length > 0, 'die Fixture überlagert kein Sektor-Feld — eine der zwei Formen bleibt unbewiesen');
  assert.ok(situativ.length > 0, 'die Fixture überlagert kein Situations-Feld — die zweite Form bleibt unbewiesen');

  for (const gruppe of [sektor, situativ]) {
    V.rechtsraumFristUeberlagerungSetzen(null);
    const vorher = gruppe.map((t) => hinweisFuer(V, t));
    V.rechtsraumFristUeberlagerungSetzen(f);
    const nachher = gruppe.map((t) => hinweisFuer(V, t));
    assert.notDeepEqual(nachher, vorher,
      'eine der beiden Kennungsformen greift nicht — dann bleiben die Regeln jener Seite blind');
  }
});

test('[A/B·Rückweg] nach dem Entladen gilt wieder der eingebaute Stand, Byte für Byte', () => {
  const { V } = ladeKern();
  const felder = fristFelderSammeln(V);
  V.rechtsraumFristUeberlagerungSetzen(null);
  const vorher = felder.map((t) => hinweisFuer(V, t));
  V.rechtsraumFristUeberlagerungSetzen(fixture());
  V.rechtsraumFristUeberlagerungSetzen(null);
  const nachher = felder.map((t) => hinweisFuer(V, t));
  assert.deepEqual(nachher, vorher,
    'nach dem Entladen bleibt etwas vom Modul stehen. Ein Rechtsraum muss sich vollständig '
    + 'zurücknehmen lassen — sonst trägt die Bürgerin einen Rest, den niemand mehr sieht');
});

test('[A/B·Vollständigkeit] die Fixture überlagert keine Kennung, die es im Bestand nicht gibt', () => {
  const { V } = ladeKern();
  const bekannt = new Set(fristFelderSammeln(V).map((t) => t.kennung));
  const f = fixture();
  /* Nur die fristRegel-Eintraege gehoeren gegen die Fristfelder geprueft — ein
     `gueltigkeitVorschlag`-Eintrag zeigt auf ein Vorschlagsfeld, nicht auf ein Fristfeld
     (U2-ADR-314). Ihn hier mitzuzaehlen hiesse, zwei verschiedene Kataloge gegeneinander
     zu halten. */
  const unbekannt = Object.keys(f.felder)
    .filter((k) => f.felder[k].fristRegel)
    .filter((k) => !bekannt.has(k));
  assert.deepEqual(unbekannt, [],
    'die Fixture nennt Kennungen, die kein Fristfeld des Bestands sind. Eine Überlagerung ins '
    + 'Leere fällt nirgends auf und täuscht Deckung vor:\n  ' + unbekannt.join('\n  '));
});

test('[A/B·Gegenprobe] eine Überlagerung unter der FALSCHEN Kennungsform greift nicht', () => {
  /* Der eigentliche Rot-Beweis dieser Datei. Die A/B-Proben oben zeigen, dass sich etwas
     ändert — sie zeigen nicht, dass sich das RICHTIGE ändert. Wäre der Leser gegenüber der
     Kennung gleichgültig (etwa weil er über `feldId` allein aufloest), gingen sie trotzdem
     grün durch, und die 17 doppelt vergebenen UnterFeld-IDs träfen einander gegenseitig.

     Hier wird darum eine Überlagerung unter der BLOSSEN `feldId` gesetzt — die Form, die
     `feld.art.vorschlaege` schon einmal mehrdeutig gemacht hat. Sie DARF nicht greifen. */
  const { V } = ladeKern();
  const felder = fristFelderSammeln(V);
  const ziel = felder.find((t) => !t.situativ);
  assert.ok(ziel, 'kein Sektor-Fristfeld gefunden');

  V.rechtsraumFristUeberlagerungSetzen(null);
  const eingebaut = hinweisFuer(V, ziel);

  const nurFeldId = ziel.kennung.slice(ziel.kennung.indexOf('.') + 1);
  assert.notEqual(nurFeldId, ziel.kennung, 'die verkürzte Kennung ist mit der vollen identisch');
  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [nurFeldId]: { fristRegel: { dauer: 'P6W', quelle: 'PRÜF-FIXTURE — darf nicht greifen' } } },
  });
  const nachher = hinweisFuer(V, ziel);
  V.rechtsraumFristUeberlagerungSetzen(null);

  assert.equal(nachher, eingebaut,
    'eine Überlagerung unter der bloßen `feldId` hat gegriffen. Dann ist die Kennungsform '
    + 'wirkungslos, und zwei Felder gleichen Namens überschreiben einander — bei 17 doppelt '
    + 'vergebenen UnterFeld-IDs ist das kein Randfall, sondern der Normalfall');
});

test('[A/B·Positivkontrolle] eine zahnlose Fixture würde als „keine Änderung" auffallen', () => {
  /* Die B-Seiten-Probe oben behauptet, jede überlagerte Frist ändere sich. Diese hier prüft,
     dass jene Behauptung überhaupt scheitern KANN: eine Überlagerung mit DERSELBEN Dauer wie
     der eingebaute Bestand muss als „keine Änderung" sichtbar werden. Sonst wäre die
     B-Seiten-Probe grün, egal was in der Fixture steht. */
  const { V } = ladeKern();
  const ziel = fristFelderSammeln(V).find((t) => !t.situativ);
  V.rechtsraumFristUeberlagerungSetzen(null);
  const eingebaut = hinweisFuer(V, ziel);

  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [ziel.kennung]: { fristRegel: Object.assign({}, ziel.feld.fristRegel, { quelle: 'PRÜF-FIXTURE — gleiche Dauer' }) } },
  });
  const gleich = hinweisFuer(V, ziel);
  V.rechtsraumFristUeberlagerungSetzen(null);

  assert.equal(gleich, eingebaut,
    'dieselbe Dauer liefert einen anderen Hinweis — dann misst der A/B-Vergleich nicht die '
    + 'Dauer, sondern irgendetwas anderes');
});
