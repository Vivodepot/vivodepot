#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ERHEBUNG 12 — WAS SAGT EIN BÜNDEL ÜBER DIE KERNSTÄNDE, MIT DENEN ES LÄUFT?
   ────────────────────────────────────────────────────────────────────────────
   ANGEORDNET am 21.08.2026 (Laufzettel „Nach den dreizehn",
   Posten 12). Herkunft: die Marktplatz-Konvention. Üblich sind vier Angaben je
   Eintrag — Herausgeber, Version, Signatur und ERKLÄRTE VERTRÄGLICHKEIT. Die
   ersten drei stehen; die vierte ist der Gegenstand.

   WARUM SIE ZÄHLT: Eine Institution kauft die Zusage, dass ihr Bündel in einem
   Jahr noch lädt. Prüft nur der Kern einseitig, kann sie das vorher nicht wissen —
   sie erfährt es, wenn ein Mitglied anruft.

   MESSEN, NICHT BAUEN. Und mit Positivkontrolle: „wird akzeptiert" ist ohne sie
   nicht von „wird ignoriert" zu unterscheiden. Eine GEPFLANZTE unmögliche Angabe
   muss darum eine Ablehnung erzeugen — tut sie es nicht, ist das der Befund.

   APP_VERSION WIRD NICHT ABGESCHRIEBEN, SONDERN GESUCHT: das Werkzeug tastet die
   Grenze ab, bis die Ablehnung kommt. Eine aus dem Quelltext abgelesene Zahl wäre
   eine zweite Fassung derselben Angabe.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');

/* ALLE FÜNF Register, jedes mit einem Modul, das OHNE die Versionsangabe wirklich durchgeht.
   Ein Fixture, das aus einem ZWEITEN Grund scheitert, macht die Positivkontrolle stumm: dann
   sagt „abgelehnt" nichts mehr über die Versionsangabe. Beim ersten Lauf am 21.08. war genau
   das der Fall — das Rechtsraum-Modul fiel mit `grund: 'typen'` durch, weil ihm die
   `katalogVersion` fehlte, und nicht wegen einer Zahl. */
const MODULE = Object.freeze({
  textsatz: { modulTyp: 'textsatz', moduleVersion: 1, herkunft: 'x', sprache: 'hu', texte: {} },
  rechtsraum: { modulTyp: 'rechtsraum', sprache: 'de', moduleVersion: 1, herkunft: 'x', rechtsraum: 'AT',
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: 'Vorsorgevollmacht (AT)' } } },
  institutionsArt: { modulTyp: 'institutionsArt', sprache: 'de', moduleVersion: 1, herkunft: 'rak-koeln',
    arten: { anwaltskammer: 'Rechtsanwaltskammer' } },
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `bundid_email` ist Unterfeld der Liste
  // `bundid` geworden — `feldDefFuer('verwaltung', 'bundid_email')` findet es darum nicht mehr,
  // `zuordnung` verlöre ihren einzigen Eintrag und das Modul fiele mit `zuordnung-leer` durch
  // (falscher Grund für DIESE Erhebung, die appVersion misst). `email_haupt` bleibt Flachfeld
  // und ersetzt das Beispiel — der gemappte Feldname selbst ist für Erhebung 12 beliebig.
  format: { modulTyp: 'format', sprache: 'de', moduleVersion: 1, herkunft: 'rak-koeln',
    format: 'rak-aktenverzeichnis', richtung: 'import', sektor: 'administration',
    label: 'Aktenverzeichnis der Kammer', leser: 'csv@1',
    zuordnung: [{ feld: 'mainEmailAddress', ziel: 'email' }] },
  bereich: { modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'rak-koeln',
    bereiche: { obhut: { label: 'Fremde Daten in meiner Obhut' } } },
});

/* Die Grenze wird abgetastet, nicht abgelesen. Gesucht ist die kleinste Zahl, die eine
   Ablehnung erzeugt; die Anwendung versteht damit alles darunter. */
function appVersionAbtasten(V, d) {
  for (let n = 1; n <= 64; n++) {
    const r = V.modulEinlassen(JSON.stringify(Object.assign({}, MODULE.bereich, { appVersion: n })), d);
    if (!r.angenommen && r.grund === 'app-zu-alt') return { grenze: n - 1, abgelehntBei: n, meldung: r };
  }
  return { grenze: null, abgelehntBei: null, meldung: null };
}

function frischesDepot(V) {
  const d = V.leeresDepot();
  V.setData(d);
  return d;
}

function messen(V) {
  const ergebnis = [];

  /* ── 1 · Die UNTERGRENZE am Modul-Weg, mit Positivkontrolle ────────────────── */
  const abtast = appVersionAbtasten(V, frischesDepot(V));
  const ohneAngabe = V.modulEinlassen(JSON.stringify(MODULE.bereich), frischesDepot(V));
  ergebnis.push({
    punkt: '1 · Untergrenze (`appVersion`) am Modul-Weg',
    gemessen: abtast.grenze === null ? 'KEINE Ablehnung bis 64 — die Angabe wirkt nicht'
      : ('die Anwendung versteht bis ' + abtast.grenze + '; ab ' + abtast.abgelehntBei + ' lehnt sie ab'),
    positivkontrolle: ohneAngabe.angenommen
      ? 'ein Modul OHNE die Angabe wird angenommen — die Ablehnung kommt von der Zahl, nicht vom Modul'
      : 'ROT: schon ohne die Angabe wird nichts angenommen (Grund: ' + ohneAngabe.grund + ')',
    brauchbar: !!ohneAngabe.angenommen,
    anmerkung: abtast.meldung
      ? ('benannt abgelehnt: grund=' + abtast.meldung.grund + ', verlangt=' + abtast.meldung.verlangtAppVersion
         + ', vorhanden=' + abtast.meldung.appVersion)
      : '',
  });

  /* ── 2 · Gilt das für ALLE Register — auch für den angedockten BEREICH? ────── */
  const proTyp = [];
  for (const [name, modul] of Object.entries(MODULE)) {
    const zuNeu = V.modulEinlassen(JSON.stringify(Object.assign({}, modul, { appVersion: (abtast.grenze || 1) + 1 })), frischesDepot(V));
    const passend = V.modulEinlassen(JSON.stringify(Object.assign({}, modul, { appVersion: (abtast.grenze || 1) })), frischesDepot(V));
    proTyp.push(name + ': zu neu → ' + (zuNeu.angenommen ? 'ANGENOMMEN' : zuNeu.grund)
      + ' · passend → ' + (passend.angenommen ? 'angenommen' : passend.grund));
  }
  ergebnis.push({
    punkt: '2 · dieselbe Prüfung über ALLE FÜNF Register',
    gemessen: proTyp.join('\n                 '),
    positivkontrolle: 'je Register wird BEIDES gefahren — die passende Zahl muss durchgehen',
    brauchbar: true,
    anmerkung: 'die Prüfung steht im EINEN Einlassweg, nicht in den Prüfern — darum gilt sie für alle gleich',
  });

  /* ── 3 · Die OBERGRENZE — gibt es sie? ─────────────────────────────────────── */
  const alt = V.modulEinlassen(JSON.stringify(Object.assign({}, MODULE.bereich, { appVersion: 1 })), frischesDepot(V));
  ergebnis.push({
    punkt: '3 · Obergrenze („gebaut für einen ÄLTEREN Kern")',
    gemessen: alt.angenommen
      ? 'ein Bündel für Stand 1 wird von einer neueren Anwendung ANGENOMMEN — es gibt keine Obergrenze'
      : ('abgelehnt: ' + alt.grund),
    positivkontrolle: 'derselbe Aufruf wie in Punkt 1, nur mit der kleinsten Zahl',
    brauchbar: true,
    anmerkung: 'die Angabe ist eine Untergrenze; eine zweite Zahl („höchstens bis") gibt es im Vertrag nicht',
  });

  /* ── 4 · Die VORLAGE — kann sie überhaupt etwas sagen? ─────────────────────── */
  const felder = [{ feldname: 'X', feldtyp: 'text', bereich: 'verwaltung' }];
  const mitAngabe = V.validateTemplate({ felder, appVersion: 9999 });
  const mitUnsinn = V.validateTemplate({ felder, dieseAngabeGibtEsNicht: true });
  const schema = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'docs', 'template-generator', 'submission-schema.json'), 'utf8'));
  const tplProps = Object.keys(schema.properties.template.properties || {});
  ergebnis.push({
    punkt: '4 · die VORLAGE — was kann sie über Kernstände sagen?',
    gemessen: 'Schema `template`: ' + tplProps.join(', ')
      + '\n                 → `appVersion` steht NICHT darin (additionalProperties: '
      + String(schema.properties.template.additionalProperties) + ')'
      + '\n                 → `validateTemplate` mit appVersion: ' + (mitAngabe || 'GÜLTIG — angenommen und wirkungslos')
      + '\n                 → `validateTemplate` mit erfundener Angabe: ' + (mitUnsinn || 'GÜLTIG — auch die'),
    positivkontrolle: 'die gepflanzte unmögliche Angabe (appVersion 9999) MUSS eine Ablehnung erzeugen, '
      + 'sonst ist „wird akzeptiert" nicht von „wird ignoriert" zu unterscheiden',
    brauchbar: true,
    anmerkung: (mitAngabe === null)
      ? 'BEFUND: sie erzeugt KEINE — die Prüfung ist ein Torwächter über bekannte Schlüssel, nicht über den Umfang'
      : 'sie erzeugt eine Ablehnung',
  });

  /* ── 5 · Die Lese-App — die zweite Anwendung, und sie veröffentlicht ───────── */
  const lese = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const treffer = ['APP_VERSION', 'appVersion', 'anfrageVersion', 'moduleVersion']
    .map((w) => w + ': ' + (lese.split(w).length - 1));
  ergebnis.push({
    punkt: '5 · die Lese-App',
    gemessen: 'Vorkommen in `vivodepot-lesen.html` — ' + treffer.join(' · '),
    positivkontrolle: 'mechanisch gezählt an der Datei, nicht am Eindruck',
    brauchbar: true,
    anmerkung: 'sie ist die zweite Anwendung und veröffentlicht',
  });

  return { appVersionGrenze: abtast.grenze, ergebnis };
}

function bericht(m) {
  const z = ['Abgetastete Verständnis-Grenze der Anwendung (`APP_VERSION`): ' + String(m.appVersionGrenze), ''];
  for (const e of m.ergebnis) {
    z.push(e.punkt);
    z.push('    gemessen       : ' + e.gemessen);
    z.push('    Positivkontroll: ' + e.positivkontrolle);
    if (e.anmerkung) z.push('    Anmerkung      : ' + e.anmerkung);
    z.push('');
  }
  const kaputt = m.ergebnis.filter((e) => !e.brauchbar);
  if (kaputt.length) z.push('ABBRUCH: ' + kaputt.length + ' Messpunkt(e) ohne tragende Positivkontrolle.');
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  if (m.ergebnis.some((e) => !e.brauchbar)) process.exit(2);
}

module.exports = { messen, bericht, laufen, MODULE, appVersionAbtasten };
