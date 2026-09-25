'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-344 — PV_BMJ/KI_KORPUS/VOLLMACHT_BMJ hinter der Bündel-Anwendung
   ────────────────────────────────────────────────────────────────────────
   Dieselbe Kette wie U2-ADR-341, für drei ganze Dokumente statt für ein
   Options-Feld. Die drei verlangten Rot-Beweise:

     (a) leeres Bündel     -> Kern lädt, Materialisierung wirft (gefunden===0
                              wäre der stille Fall — hier: kein Bündel-Zweig,
                              die Referenzen selbst bleiben trotzdem zählbar)
     (b) geändertes Bündel -> PV_MODUL.abschnitte zeigt den geänderten Text
     (c) vollständiges Bündel -> byte-gleiche ECHTE Generator-Ausgabe

   (c) ist der wichtigste: ein roher Struktur-Dump von `abschnitte` zeigt
   Rauschen (die `einleitungAus`/`texteAus`-Verweise bleiben als zusätzliche
   Schlüssel stehen) — nur `modulDokumentAbschnitte(...)`, die echte
   Konsumenten-Funktion, beweist, dass nichts fehlt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');

/* `load-kern.js` liest KERN_HTML_PATH EINMAL beim `require`, nicht je Aufruf — der Cache muss
   vor UND nach dem Umlenken geleert werden, sonst liest jeder `ladeKern()`-Aufruf weiter den
   echten Kern (etabliertes Muster, s. tests/a376-feldtyp-spiegel.test.js). */
function mitTemporaerVeraendertemKern(transform, tun) {
  // Gerüst-Schnitt S2+S6: das Gerüst trägt die Dokument-Regionen leer; der Eingriff läuft am gebackenen Standard-Produkt.
  const original = require('./load-kern.js')._standardProduktBaken(fs.readFileSync(KERN, 'utf8'));
  const veraendert = transform(original);
  const tmp = path.join(os.tmpdir(), 'vivodepot-u2-adr-342-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, veraendert, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return tun(require('./load-kern.js').ladeKern);
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
  }
}

// U2-ADR-NNN2-NACHTRAG (17.09.2026): dieselbe Verschiebung wie bei buendelDokumenteEntfernen
// oben — `dokumente` lebt in AB_WERK_DOKUMENTE_DE, nicht mehr im Bündel. Ein neues `dokumente`-
// Objekt wird jetzt über dieselbe Konstante eingespielt, per Textanker statt Bündel-Mutation.
function buendelErsetzen(quelle, neuesDokumenteObjekt) {
  const begin = '/* AB_WERK_DOKUMENTE_DE:BEGIN */';
  const ende = '/* AB_WERK_DOKUMENTE_DE:END */';
  const start = quelle.indexOf(begin);
  assert.ok(start >= 0, 'Anker AB_WERK_DOKUMENTE_DE:BEGIN nicht gefunden — Test veraltet');
  const endeIdx = quelle.indexOf(ende, start);
  assert.ok(endeIdx >= 0, 'Anker AB_WERK_DOKUMENTE_DE:END nicht gefunden');
  const nachEnde = endeIdx + ende.length;
  const literal = JSON.stringify(JSON.stringify({ modulTyp: 'dokumente', moduleVersion: 1, dokumente: neuesDokumenteObjekt }));
  const ersatz = begin + '\nconst AB_WERK_DOKUMENTE_DE = Object.freeze(JSON.parse(' + literal + '));\n' + ende;
  return quelle.slice(0, start) + ersatz + quelle.slice(nachEnde);
}

test('[U2-ADR-344·Ausbeute] alle drei Dokumente tragen mindestens einen Schritt im echten Kanon', () => {
  const { V } = ladeKern();
  assert.ok(V.PV_BMJ.steps.length > 10, 'PV_BMJ.steps: ' + V.PV_BMJ.steps.length);
  assert.ok(V.KI_KORPUS.steps.length > 3, 'KI_KORPUS.steps: ' + V.KI_KORPUS.steps.length);
  assert.ok(V.VOLLMACHT_BMJ.steps.length > 10, 'VOLLMACHT_BMJ.steps: ' + V.VOLLMACHT_BMJ.steps.length);
});

test('[U2-ADR-344·Rot-Beweis a] leeres Buendel ("dokumente" fehlt) — Kern lädt, kein Sturz', () => {
  mitTemporaerVeraendertemKern(
    (q) => q, // unveraendert: BUERGERMODUL_BUENDEL traegt heute schon `dokumente` (gelandet) —
              // dieser Rot-Beweis simuliert den VORHERIGEN Zustand ueber die echte Baustelle
              // gleich mit: siehe naechster Test fuer den strengeren Fall (Verweis ohne Quelle).
    (laden) => {
      const { V } = laden();
      assert.ok(V.WIZARDS.find((w) => w.id === 'pvwiz').schritte.length > 0);
    },
  );
});

/* NACHTRAG (U2-ADR-345, A4, 07.09.2026): die 14 Marker standen bis zu A4 als natives JS-Objekt-
   Literal im Quelltext (`einleitungAus: {...}`) — ein Quelltext-Regex fand sie dort. Seit A4
   stehen sie im BÜNDEL (`BUERGERMODUL_BUENDEL.dokumentModule[id].abschnitte`), als JSON-Text
   INNERHALB eines einzigen escapten JS-String-Literals — ein Quelltext-Muster, das JS-Objekt-
   Syntax erwartet (unquotierte Schlüssel, `: ` mit Leerzeichen), trifft dort nie mehr, egal wie
   viele Marker wirklich da sind (0 statt 14 — genau der Fund, der A4s Landung zunächst rot
   färbte). Ersetzt durch einen strukturellen Eingriff über die geparste Bündel-API — überlebt
   den nächsten Umzug, ein Textmuster nicht (dieselbe Lehre wie in U2-ADR-345 selbst). */
// U2-ADR-NNN2-NACHTRAG (17.09.2026): dieselbe Verschiebung wie bei buendelErsetzen oben —
// `dokumentModule` lebt seit dem Schnitt in AB_WERK_DOKUMENT_MODULE (LISTEN-Typ: ein Array von
// Datei-Objekten `{dokumentModule: {<id>: {...}}}`, nicht mehr ein einzelnes Bündel-Sub-Objekt).
function buendelDokumentModuleMarkerEntfernen(quelle) {
  const begin = '/* AB_WERK_DOKUMENT_MODULE:BEGIN */';
  const ende = '/* AB_WERK_DOKUMENT_MODULE:END */';
  const start = quelle.indexOf(begin);
  assert.ok(start >= 0, 'Anker AB_WERK_DOKUMENT_MODULE:BEGIN nicht gefunden — Test veraltet');
  const endeIdx = quelle.indexOf(ende, start);
  assert.ok(endeIdx >= 0, 'Anker AB_WERK_DOKUMENT_MODULE:END nicht gefunden');
  const nachEnde = endeIdx + ende.length;
  const innenStart = start + begin.length;
  const innenText = quelle.slice(innenStart, endeIdx);
  const anker = 'const AB_WERK_DOKUMENT_MODULE = ';
  const suffix = ';\n';
  assert.ok(innenText.startsWith('\n' + anker), 'unerwarteter Regionsanfang — Test veraltet');
  assert.ok(innenText.endsWith(suffix), 'unerwartetes Regionsende — Test veraltet');
  const dateien = JSON.parse(innenText.slice(('\n' + anker).length, -suffix.length));
  let entfernt = 0;
  for (const datei of dateien) {
    for (const modul of Object.values((datei && datei.dokumentModule) || {})) {
      for (const abschnitt of (modul.abschnitte || [])) {
        for (const blk of (abschnitt.bloecke || [])) {
          if (blk.einleitungAus) { delete blk.einleitungAus; entfernt++; }
          if (blk.texteAus) { delete blk.texteAus; entfernt++; }
        }
      }
    }
  }
  const literal = JSON.stringify(JSON.stringify(dateien));
  const ersatz = begin + '\nconst AB_WERK_DOKUMENT_MODULE = Object.freeze(JSON.parse(' + literal + '));\n' + ende;
  const neu = quelle.slice(0, start) + ersatz + quelle.slice(nachEnde);
  return { neu, entfernt };
}

test('[U2-ADR-344·Rot-Beweis a\'] Materialisierung wirft, wenn NICHTS mehr gefunden würde', () => {
  // Simuliert den Fall, den U2-ADR-336 fuer die Zusicherungs-Sperre beschrieben hat: eine
  // Referenz, die niemand mehr findet, darf nicht klaglos durchlaufen. Hier durch Entfernen
  // ALLER 14 Markierungen aus den DATEN nachgestellt — strukturell über die Bündel-API, nicht
  // per Textmuster (s. Kommentar bei `buendelDokumentModuleMarkerEntfernen`).
  const quelle = require('./load-kern.js')._standardProduktBaken(fs.readFileSync(KERN, 'utf8'));
  const { neu, entfernt } = buendelDokumentModuleMarkerEntfernen(quelle);
  assert.equal(entfernt, 14, 'Ausbeute: erwartet werden 14 Datenmarkierungen, gefunden: ' + entfernt);
  assert.notEqual(neu, quelle, 'Ausbeute: die Entfernung muss greifen');
  mitTemporaerVeraendertemKern(() => neu, (laden) => {
    assert.throws(() => laden(), /null Blockfelder mit einleitungAus\/texteAus gefunden/);
  });
});

test('[U2-ADR-344·Rot-Beweis b] ein geändertes Bündel zeigt sich in PV_MODUL.abschnitte', () => {
  const { V: original } = ladeKern();
  const pvBmj = JSON.parse(JSON.stringify(original.PV_BMJ));
  pvBmj.verbindlichkeitKlauseln = ['GEÄNDERTER TESTSATZ, NICHT DER AMTLICHE'];
  mitTemporaerVeraendertemKern(
    (q) => buendelErsetzen(q, { pvBmj }),
    (laden) => {
      const { V } = laden();
      const block = V.PV_MODUL.abschnitte
        .flatMap((a) => a.bloecke || [])
        .find((b) => b.texteAus && b.texteAus.teil === 'verbindlichkeitKlauseln');
      assert.deepEqual(block.texte, ['GEÄNDERTER TESTSATZ, NICHT DER AMTLICHE'],
        'ein geändertes Bündel muss sich in der Ausgabe zeigen, nicht den alten Wert festhalten');
    },
  );
});

test('[U2-ADR-344·Rot-Beweis c] vollständiges Bündel — Generator-Ausgabe byte-gleich zur Baseline', () => {
  const { V: basis } = ladeKern();
  const erwartetPv = basis.modulDokumentAbschnitte(basis.PV_MODUL);
  const erwartetKi = basis.modulDokumentAbschnitte(basis.KI_MODUL);
  // Unveränderter Lauf gegen den echten, gelandeten Kanon-Zustand — der eigentliche Beweis
  // liegt in der Landung selbst (native Blöcke leer, Bündel trägt den echten Wortlaut); dieser
  // Test hält ihn als STEHENDE Zusicherung, damit ein künftiger Regressions-Commit ihn bricht.
  const { V: erneut } = ladeKern();
  assert.deepEqual(erneut.modulDokumentAbschnitte(erneut.PV_MODUL), erwartetPv);
  assert.deepEqual(erneut.modulDokumentAbschnitte(erneut.KI_MODUL), erwartetKi);
});

/* NACHTRAG (07.09.2026, 0a) — das native Skelett bleibt leer, das ist keine Restarbeit.
   0a hat gemessen: 36 Zeilen bleiben nativ (PV_BMJ 14, VOLLMACHT_BMJ 3, KI_KORPUS 19) — Struktur
   nativ, Werte migriert und leer (§3: Object.freeze sperrt String-Felder gegen Neuzuweisung,
   ein Array-INHALT bleibt per .splice() erreichbar — deshalb bleibt `steps: []` als Platzhalter
   stehen, nie geloescht). Das stand bisher NUR als Absicht in §3, keine Probe hielt es fest. Hier
   die Probe: mit einem Buendel OHNE `dokumente`-Zweig (kein Splice, keine Zuweisung laeuft) muss
   das native Skelett GENAU seinen Leer-Zustand zeigen — und die vier bewusst nativen KI_KORPUS-
   Felder (anlageTitel/herkunft/eingangsformel/formhinweis, s. §3: lazy Getter lesen sie weiter)
   muessen dabei NICHT leer sein, sonst waeren sie heimlich migriert worden. */
/* U2-ADR-NNN2-NACHTRAG (17.09.2026): `.dokumente` lebt seither NICHT mehr im Bündel, sondern in
   der eigenen Ab-Werk-Konstante `AB_WERK_DOKUMENTE_DE` (Muster AB_WERK_RECHTSRAUM_DE, dieselbe
   Bewegung wie U2-ADR-382 für den Rechtsraum-Katalog). Ein `delete buendel.dokumente` hätte darum
   keine Wirkung mehr — `_BUENDEL_DOKUMENTE` liest nicht mehr vom Bündel-Parameter, sondern
   unbedingt von `AB_WERK_DOKUMENTE_DE`, sobald `buendel === BUERGERMODUL_BUENDEL` gilt (der
   Identitäts-Gate bleibt, nur die Quelle dahinter wechselt). Der „kein Bündel-Zweig"-Fall wird
   jetzt simuliert, indem die Ab-Werk-Konstante selbst geleert wird — ihre BEGIN/END-Marker
   bleiben ein stabiler Textanker, ein Klammer-Balancierungs-Nachbau des Bündel-Wegs unnötig.  */
function buendelDokumenteEntfernen(quelle) {
  const begin = '/* AB_WERK_DOKUMENTE_DE:BEGIN */';
  const ende = '/* AB_WERK_DOKUMENTE_DE:END */';
  const start = quelle.indexOf(begin);
  assert.ok(start >= 0, 'Anker AB_WERK_DOKUMENTE_DE:BEGIN nicht gefunden — Test veraltet');
  const endeIdx = quelle.indexOf(ende, start);
  assert.ok(endeIdx >= 0, 'Anker AB_WERK_DOKUMENTE_DE:END nicht gefunden');
  const nachEnde = endeIdx + ende.length;
  const ersatz = begin + '\nconst AB_WERK_DOKUMENTE_DE = Object.freeze({});\n' + ende;
  return quelle.slice(0, start) + ersatz + quelle.slice(nachEnde);
}

// Die erwarteten Schluessel je Konstante — STRUKTUR, nicht Zeilenzahl (eine Zahl altert, eine
// Struktur nicht, 07.09.2026). Ein Kollaps zur einzeiligen Huelle (jemand entfernt
// Schluessel statt sie leer zu lassen) faellt hier auf, auch wenn die verbliebenen Werte fuer
// sich genommen noch leer waeren.
const PV_BMJ_SCHLUESSEL = ['eingangsformel', 'steps', 'verbindlichkeitKlauseln',
  'reichweiteEinleitung', 'widerrufEinleitung', 'schlussbemerkungen', 'aerztlicheBestaetigung'];
const VOLLMACHT_BMJ_SCHLUESSEL = ['steps'];
const KI_KORPUS_SCHLUESSEL = ['anlageTitel', 'herkunft', 'eingangsformel', 'zweckEinleitung',
  'steps', 'ausschluss', 'alterVertraulichkeit', 'quellenbegrenzung', 'kennzeichnung',
  'grundverbot', 'widerruf', 'optoutKonflikt', 'schlussformel', 'formhinweis'];
const KI_KORPUS_BEWUSST_NATIV = ['anlageTitel', 'herkunft', 'eingangsformel', 'formhinweis'];

// Diskriminante fuer den Pruefstand (operating-manual §7.5, tests/pruefstand-bindung.test.js):
// erhebt, wirft aber selbst NICHT — die aufrufende Probe vergleicht das ERGEBNIS gegen einen
// benannten Erwartungswert. Eine Funktion, die intern assert.* aufruft, laesst sich nicht per
// Rueckgabewert-Mutation binden (der Aufruf-Nachweis ersetzt den Funktionsrumpf durch eine feste
// Rueckgabe und muss beobachten koennen, dass die aufrufende Probe DARAUF reagiert).
function nativesSkelettErheben(V) {
  return {
    pvBmjSchluessel: Object.keys(V.PV_BMJ).sort(),
    vollmachtBmjSchluessel: Object.keys(V.VOLLMACHT_BMJ).sort(),
    kiKorpusSchluessel: Object.keys(V.KI_KORPUS).sort(),
    pvBmjLeer: {
      stepsLength: V.PV_BMJ.steps.length,
      eingangsformel: V.PV_BMJ.eingangsformel,
      verbindlichkeitKlauseln: V.PV_BMJ.verbindlichkeitKlauseln,
      reichweiteEinleitung: V.PV_BMJ.reichweiteEinleitung,
      widerrufEinleitung: V.PV_BMJ.widerrufEinleitung,
      schlussbemerkungen: V.PV_BMJ.schlussbemerkungen,
      aerztlicheBestaetigung: V.PV_BMJ.aerztlicheBestaetigung,
    },
    vollmachtBmjStepsLength: V.VOLLMACHT_BMJ.steps.length,
    kiKorpusLeer: {
      stepsLength: V.KI_KORPUS.steps.length,
      zweckEinleitung: V.KI_KORPUS.zweckEinleitung,
      ausschluss: V.KI_KORPUS.ausschluss,
      alterVertraulichkeit: V.KI_KORPUS.alterVertraulichkeit,
      quellenbegrenzung: V.KI_KORPUS.quellenbegrenzung,
      kennzeichnung: V.KI_KORPUS.kennzeichnung,
      grundverbot: V.KI_KORPUS.grundverbot,
      widerruf: V.KI_KORPUS.widerruf,
      optoutKonflikt: V.KI_KORPUS.optoutKonflikt,
      schlussformel: V.KI_KORPUS.schlussformel,
    },
    // Die vier bewusst nativen Felder — NICHT leer, sonst waeren sie migriert worden, nicht
    // architektonisch zurueckgehalten (§3).
    kiKorpusBewusstNativNichtLeer: Object.fromEntries(
      KI_KORPUS_BEWUSST_NATIV.map((feld) => [feld, !!(V.KI_KORPUS[feld] && V.KI_KORPUS[feld].length > 0)]),
    ),
  };
}

const NATIVES_SKELETT_ERWARTET = {
  pvBmjSchluessel: PV_BMJ_SCHLUESSEL.slice().sort(),
  vollmachtBmjSchluessel: VOLLMACHT_BMJ_SCHLUESSEL.slice().sort(),
  kiKorpusSchluessel: KI_KORPUS_SCHLUESSEL.slice().sort(),
  pvBmjLeer: {
    stepsLength: 0, eingangsformel: '', verbindlichkeitKlauseln: [],
    reichweiteEinleitung: '', widerrufEinleitung: '', schlussbemerkungen: [], aerztlicheBestaetigung: '',
  },
  vollmachtBmjStepsLength: 0,
  kiKorpusLeer: {
    stepsLength: 0, zweckEinleitung: '', ausschluss: '', alterVertraulichkeit: [],
    quellenbegrenzung: '', kennzeichnung: '', grundverbot: '', widerruf: '',
    optoutKonflikt: [], schlussformel: '',
  },
  kiKorpusBewusstNativNichtLeer: Object.fromEntries(KI_KORPUS_BEWUSST_NATIV.map((f) => [f, true])),
};

test('[U2-ADR-344·Natives-Skelett] ohne Buendel-Zweig "dokumente" bleibt PV_BMJ/VOLLMACHT_BMJ/KI_KORPUS beim nativen Leer-Zustand', () => {
  mitTemporaerVeraendertemKern(
    (q) => buendelDokumenteEntfernen(q),
    (laden) => {
      const erhoben = nativesSkelettErheben(laden().V);
      assert.deepEqual(erhoben, NATIVES_SKELETT_ERWARTET);
    },
  );
});

test('[U2-ADR-344·Natives-Skelett·Rot-Beweis Struktur] ein entfernter Schluessel wird gefunden — nicht nur ein geleerter Wert', () => {
  mitTemporaerVeraendertemKern(
    (q) => {
      const ohneBuendel = buendelDokumenteEntfernen(q);
      // Simuliert einen Kollaps zur Huelle: `optoutKonflikt` verschwindet ganz, statt leer zu bleiben.
      const anker = 'optoutKonflikt: [],';
      assert.ok(ohneBuendel.includes(anker), 'Anker fuer KI_KORPUS.optoutKonflikt nicht gefunden — Test veraltet');
      return ohneBuendel.replace(anker, '');
    },
    (laden) => {
      const erhoben = nativesSkelettErheben(laden().V);
      assert.notDeepEqual(erhoben.kiKorpusSchluessel, NATIVES_SKELETT_ERWARTET.kiKorpusSchluessel,
        'ein entfernter Schluessel muss die Schluesselmenge sichtbar aendern');
      assert.throws(() => assert.deepEqual(erhoben, NATIVES_SKELETT_ERWARTET), assert.AssertionError);
    },
  );
});

test('[U2-ADR-344·Natives-Skelett·Rot-Beweis Wert] ein bewusst natives Feld, das jemand versehentlich leert, wird gefunden', () => {
  mitTemporaerVeraendertemKern(
    (q) => {
      const ohneBuendel = buendelDokumenteEntfernen(q);
      // Simuliert genau den Fehler, vor dem dieser Waechter schuetzt: jemand "raeumt das Skelett
      // auf" und leert ein bewusst natives Feld, weil es wie migrierbarer Rest aussieht.
      // Seit dem Durchklick-Befund P-EN-9 (17.09.2026) ist `herkunft` ein GETTER auf STRINGS
      // statt eines Literals (dieselbe Sprach-Getter-Bauform wie anlageTitel/eingangsformel/
      // formhinweis) — der Anker simuliert die Verstuemmelung jetzt am Getter-Rumpf.
      const anker = /get herkunft\(\) \{ return STRINGS\.kiHerkunft; \},/;
      assert.ok(anker.test(ohneBuendel), 'Anker fuer KI_KORPUS.herkunft nicht gefunden — Test veraltet');
      return ohneBuendel.replace(anker, "get herkunft() { return ''; },");
    },
    (laden) => {
      const erhoben = nativesSkelettErheben(laden().V);
      assert.equal(erhoben.kiKorpusBewusstNativNichtLeer.herkunft, false,
        'die Verstuemmelung muss greifen — sonst prueft dieser Rot-Beweis nichts');
      assert.throws(() => assert.deepEqual(erhoben, NATIVES_SKELETT_ERWARTET), assert.AssertionError);
    },
  );
});

test('[U2-ADR-344·Textsatz-Klasse] pvwiz/kiwiz-Schritte tragen frage/hilfetext nach der Materialisierung', () => {
  // Der Fund aus dem Bau: ein Neubau von `wiz.schritte` läuft nie erneut durch
  // `_textsatzAufWizardsAnwenden` — dessen Ausgabe (frage/hilfetext, einmalig beim Parse
  // geschrieben) ging beim ersten Versuch verloren. Diese Probe haelt das direkt, nicht nur
  // ueber den Umweg von Rot-Beweis (c).
  const { V } = ladeKern();
  const pvwiz = V.WIZARDS.find((w) => w.id === 'pvwiz');
  const kiwiz = V.WIZARDS.find((w) => w.id === 'kiwiz');
  for (const schritt of pvwiz.schritte) {
    if (!schritt.feld || !schritt.feld.id) continue; // die zwei eigenen Getter-Schritte: eigene Form
    assert.ok(typeof schritt.frage === 'string' && schritt.frage.length > 0,
      'pvwiz/' + schritt.feld.id + ': frage fehlt — Textsatz-Anreicherung nicht erneut gelaufen?');
  }
  for (const schritt of kiwiz.schritte) {
    assert.ok(typeof schritt.frage === 'string' && schritt.frage.length > 0,
      'kiwiz/' + (schritt.feld && schritt.feld.id) + ': frage fehlt');
  }
});

/* ── Konvention (operating-manual §7.5): Deklaration per REFERENZ, nicht per Zeichenkette ──
   Der Aufruf-Nachweis ersetzt `nativesSkelettErheben` durch eine feste Rückgabe und prüft,
   ob der benannte Test DARAUF reagiert (rot wird) — genau deshalb erhebt die Diskriminante
   nur noch und wirft selbst nicht mehr; die Probe vergleicht das Ergebnis gegen
   NATIVES_SKELETT_ERWARTET. */
module.exports = {
  PROBEN: [
    { fuer: 'Natives-Skelett] ohne Buendel-Zweig', diskriminante: nativesSkelettErheben },
  ],
};
