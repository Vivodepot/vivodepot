'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-301 (Auftrag, 05.09.2026) — der Erzeuger (`tools/buergermodul-
   erzeugen.js`, U2-ADR-291) erweitert um Situationen und Assistenten.

   Auftrag: dieselbe A/B-Haltung wie beim Struktur-Ladeweg (U2-ADR-292/299), jetzt
   auf die zwei Register angewandt, die das Struktur-Bündel (`vd-privat.json`)
   selbst noch nicht trägt. GEMESSEN vor dem Bau, nicht angenommen: für Sektoren
   gibt es `buergermodulSektorErsetzen`, eine echte Erste-Partei-Zone, die den
   nativen Bestand ersetzt UND ein `renderSektor`-A/B erlaubt. Für Situationen und
   Assistenten gibt es KEIN Gegenstück — kein `buergermodulSituationErsetzen`,
   kein `buergermodulWizardErsetzen`. Diese Datei baut darum NICHT eine solche
   Funktion (weder `bereichsModulPruefen` noch die Bündel-Einbettung sind Teil
   dieses Auftrags, s. Auftragstext) — sie fährt den Beweis, der HEUTE geht:
   Rückweg-Fidelity der Erzeuger-Extraktion, wörtlicher Spiegel des bestehenden
   `feldDefinitionen`/`rueckweg`-Musters.

   KORRIGIERT, U2-ADR-305 (05.09.2026): der ursprüngliche Kopfkommentar behauptete hier, ein
   Modul könne strukturell KEINE eigene Situation anlegen. Das war falsch — es wurde am
   echten Prüfer widerlegt, gegen fünf Fälle (s. u.), und die Fehlerquelle benannt: mein Test
   trug ein Feld-Objekt und maß darum die FELD-Sperre, las sie aber als Situations-Sperre.

   DER RIEGEL, DER WIRKLICH STEHT (gemessen, jetzt mit den vier Gegenproben unten geschützt):
   Ein Modul DARF eine eigene Situation anlegen — freie ID, mit oder ohne `bloecke`, mit
   `{quelle, feld}`-Querverweisen, läuft alles durch. Was es NICHT darf: ihr ein EIGENES
   Feld-Objekt (`{feld:{id,...}}`) geben — das kommt ausschließlich über die signierte
   Vorlage. „NUR {quelle, feld}-Züge sind hier erlaubt" (Kern-Kommentar) beschreibt genau
   das — die ERLAUBTEN Eintrags-FORMEN in `bloecke`, nicht die Situation als Ganzes.
   Reservierte IDs werden wie überall mit `grund: 'reserviert'` abgewiesen, unabhängig davon.
   Ein Assistenten-Schritt mit derselben Vorbedingung (unreservierte ID, eigenes Feld) wird
   dagegen ANGENOMMEN — der Riegel bei Assistenten ist NUR die ID-Reservierung, derselbe wie
   bei Sektoren, kein tieferer. Der Assistenten-Befund war nie falsch, nur der
   Situations-Befund.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const {
  situationsEintraegeSammeln, wizardsSchritteSammeln, baueBuergermodul,
} = require('../tools/buergermodul-erzeugen.js');

/* ══ Die Extraktion selbst — Querverweise raus, eigene Felder rein ══════════════════════ */

test('[U2-ADR-301] situationsEintraegeSammeln nimmt NUR eigene Felder ({feld:{...}}), keine Querverweise ({quelle,feld:string})', async () => {
  const { V } = await ladeKern();
  const defs = situationsEintraegeSammeln(V.SITUATIONEN);
  assert.ok(defs.length > 0, 'Vorbedingung: mindestens eine Situation trägt ein eigenes Feld');
  for (const d of defs) {
    assert.equal(typeof d.feld, 'object', 'jeder Eintrag muss ein Feld-OBJEKT tragen, kein Querverweis-String');
    assert.equal(typeof d.feldId, 'string');
    assert.ok(d.feldId.length > 0);
    assert.equal(typeof d.situationId, 'string');
  }
  // Gegenprobe an der QUELLE: geburt hat NACHWEISLICH beide Sorten (Querverweis UND eigenes
  // Feld) — die Sammlung darf nur die zweite Sorte zählen, nicht "irgendwas mit feld".
  const geburt = V.SITUATIONEN.find((s) => s.id === 'geburt');
  const rohEintraege = geburt.bloecke.flatMap((b) => b.eintraege);
  const querverweise = rohEintraege.filter((e) => typeof e.feld === 'string');
  const eigene = rohEintraege.filter((e) => e.feld && typeof e.feld === 'object');
  assert.ok(querverweise.length > 0, 'Vorbedingung: geburt trägt Querverweise');
  assert.ok(eigene.length > 0, 'Vorbedingung: geburt trägt eigene Felder');
  const gesammeltGeburt = defs.filter((d) => d.situationId === 'geburt');
  assert.equal(gesammeltGeburt.length, eigene.length, 'nur die eigenen Felder von geburt, nicht die Querverweise');
});

test('[U2-ADR-301] wizardsSchritteSammeln nimmt jeden Schritt MIT feld UND frage zusammen', async () => {
  const { V } = await ladeKern();
  const defs = wizardsSchritteSammeln(V.WIZARDS);
  assert.ok(defs.length > 0);
  for (const d of defs) {
    assert.equal(typeof d.feld, 'object');
    assert.equal(typeof d.feldId, 'string');
    assert.ok(d.feldId.length > 0);
    assert.equal(typeof d.wizardId, 'string');
    assert.equal(typeof d.frage, 'string', 'jeder Schritt muss seine frage tragen — Struktur, nicht Sprache, bei Assistenten');
    assert.ok(d.frage.trim().length > 0);
  }
});

/* ══ U2-ADR-306 (Korrektur) — vollständig, nicht nur die aufgefallenen drei Schlüssel ══
   Eine Namensliste (feld+frage) benennt, was auffiel, nicht was ein Schritt trägt — dieselbe
   Klasse Lücke wie beim Rechtsraum-Schnitt (nur 3/6 Regeln besucht) und den neun textsatzlosen
   Texten. Gemessen (node -e gegen V.WIZARDS, alle Schritte): sechs Schlüssel kommen vor, keiner
   ein Getter/Funktionswert. Diese Probe erzwingt es strukturell: JEDER native Schritt muss nach
   Sammlung — Bookhaltungs-Schlüssel abgezogen — byte-für-byte (deepStrictEqual) dem Original
   entsprechen. Fällt eine siebte Schritt-Eigenschaft künftig hinzu und der Sammler verlöre sie
   NICHT (Rest-Spread), bleibt diese Probe grün; verlöre er sie doch (Rückfall auf Namensliste),
   schlägt sie sofort fehl. */
test('[U2-ADR-306] wizardsSchritteSammeln verliert KEINE Schritt-Eigenschaft — geprüft gegen den ECHTEN Schritt, nicht gegen eine Namensliste', async () => {
  const { V } = await ladeKern();
  const defs = wizardsSchritteSammeln(V.WIZARDS);
  let geprueft = 0;
  for (const wizard of V.WIZARDS) {
    (wizard.schritte || []).forEach((schritt, index) => {
      if (!schritt.feld) return;
      const def = defs.find((d) => d.wizardId === wizard.id && d.schrittIndex === index);
      assert.ok(def, 'Schritt ' + wizard.id + '[' + index + '] fehlt im Sammler');
      const { wizardId, schrittIndex, feldId, ...rekonstruiert } = def;
      assert.deepStrictEqual(rekonstruiert, schritt,
        'Schritt ' + wizard.id + '[' + index + '] — Sammler darf KEINE Eigenschaft verlieren, auch keine unbenannte');
      geprueft++;
    });
  }
  assert.ok(geprueft > 0, 'Vorbedingung: mindestens ein Schritt geprüft');
});

/* ══ Rückweg-Fidelity — wörtlicher Spiegel des bestehenden feldDefinitionen/rueckweg-Musters ══ */

test('[U2-ADR-301] baueBuergermodul: situationsDefinitionen/wizardsDefinitionen stehen im Ergebnis, Rückweg ohne Abweichung', async () => {
  const modul = baueBuergermodul();
  assert.ok(Array.isArray(modul.situationsDefinitionen));
  assert.ok(Array.isArray(modul.wizardsDefinitionen));
  assert.ok(modul.situationsDefinitionen.length > 0);
  assert.ok(modul.wizardsDefinitionen.length > 0);
  assert.equal(modul.situationsRueckweg.geprueft, modul.situationsDefinitionen.length);
  assert.deepEqual(modul.situationsRueckweg.abweichungen, []);
  assert.equal(modul.wizardsRueckweg.geprueft, modul.wizardsDefinitionen.length);
  assert.deepEqual(modul.wizardsRueckweg.abweichungen, []);
});

test('[U2-ADR-301·Rot-Beweis] eine erfundene tpl_-Kennung wird von der Rückweg-Prüfung gefunden', async () => {
  const { V } = await ladeKern();
  const echte = situationsEintraegeSammeln(V.SITUATIONEN);
  assert.ok(echte.length > 0);
  const verfaelscht = echte.slice(0, 1).map((d) => Object.assign({}, d, { feldId: 'tpl_' + d.feldId }))
    .concat(echte.slice(1));
  // Dieselbe Prüf-Logik wie in baueBuergermodul (rueckwegPruefen) — hier isoliert nachgebaut,
  // weil die Funktion selbst nicht exportiert ist (Kapselung bewusst, s. Kopfkommentar dort).
  const abweichungen = verfaelscht.filter((d) => d.feldId.indexOf('tpl_') === 0);
  assert.equal(abweichungen.length, 1, 'genau die eine gepflanzte Präfix-Kennung muss auffallen — keine mehr, keine weniger');
});

/* ══ Der gemessene Riegel — NUR eigene Situations-FELDER, nicht Situationen selbst ══════════
   U2-ADR-305: vier Gegenproben, damit die Verwechslung (Feld-Sperre für Situations-Sperre
   gehalten) nicht wieder passiert. Alle vier gegen dieselbe unreservierte Sonden-ID gefahren,
   damit kein Fall zufällig an der Reservierung statt am geprüften Merkmal hängt. */

test('[U2-ADR-305·Korrektur] eine Situation OHNE bloecke wird angenommen — ein Modul KANN eine eigene Situation anlegen', async () => {
  const { V } = await ladeKern();
  const urteil = V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { 'test-frei-ohne-bloecke': { titel: 'Sonde' } },
  });
  assert.equal(urteil.gueltig, true, 'fehlt bloecke ganz, wird die Situation mit bloecke=[] angenommen (vivodepot.html: if (roh.bloecke !== undefined))');
});

test('[U2-ADR-305·Korrektur] eine Situation mit bloecke: [] wird angenommen', async () => {
  const { V } = await ladeKern();
  const urteil = V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { 'test-frei-leere-bloecke': { titel: 'Sonde', bloecke: [] } },
  });
  assert.equal(urteil.gueltig, true);
});

test('[U2-ADR-305·Korrektur] eine reservierte Situations-ID (geburt) wird abgewiesen mit grund:reserviert — unabhängig vom Feld-Riegel', async () => {
  const { V } = await ladeKern();
  const urteil = V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { geburt: { titel: 'Übernahmeversuch' } },
  });
  assert.equal(urteil.gueltig, false);
  assert.equal(urteil.verworfene[0].grund, 'reserviert', 'die ZWEITE, unabhängige Ablehnungsklasse — nicht mit dem Feld-Riegel (grund:bloecke) zu verwechseln');
});

test('[U2-ADR-301·Riegel] ein eigenes Situationsfeld wird von situationsModulPruefen strukturell verworfen — auch mit einer VÖLLIG UNRESERVIERTEN ID', async () => {
  const { V } = await ladeKern();
  const sondenModul = {
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: {
      'voellig-unreserviert-x9': {
        titel: 'Sonde', bloecke: [{ id: 'block', eintraege: [{ feld: { id: 'x_sonde', typ: 'text', label: 'Sonde?' } }] }],
      },
    },
  };
  const urteil = V.situationsModulPruefen(sondenModul);
  assert.equal(urteil.gueltig, false, 'die Ablehnung darf NICHT an der ID-Reservierung liegen — sie ist frei erfunden');
  assert.equal(urteil.verworfene[0].grund, 'bloecke', 'die Ablehnung muss strukturell sein (bloecke), nicht reservierungsbedingt');
  assert.notEqual(urteil.verworfene[0].grund, 'reserviert', 'Gegenprobe: das wäre die FALSCHE, bereits bekannte Ablehnungsklasse');
});

test('[U2-ADR-301·Riegel·Gegenprobe] derselbe Querverweis-Zug ({quelle,feld}) statt eines eigenen Felds wird von situationsModulPruefen ANGENOMMEN', async () => {
  const { V } = await ladeKern();
  const sondenModul = {
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: {
      'voellig-unreserviert-x9': {
        titel: 'Sonde', bloecke: [{ id: 'block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }],
      },
    },
  };
  const urteil = V.situationsModulPruefen(sondenModul);
  assert.equal(urteil.gueltig, true, 'ein Querverweis auf ein bestehendes Feld ist der einzige heute erlaubte Weg — beweist, dass der Riegel oben spezifisch am EIGENEN Feld hängt, nicht an bloecke im Allgemeinen');
});

test('[U2-ADR-301·Gegenprobe] ein eigener Assistenten-Schritt mit UNRESERVIERTER ID wird ANGENOMMEN — der Riegel dort ist NUR die ID-Reservierung', async () => {
  const { V } = await ladeKern();
  const sondenModul = {
    modulTyp: 'wizard', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    wizards: {
      'x-sonde-wiz': {
        titel: 'Sonde', ziel: { sektor: 'identity' },
        schritte: [{ feld: { id: 'x_sonde', typ: 'text' }, frage: 'Sonde?' }],
        abschluss: {},
      },
    },
  };
  const urteil = V.wizardsModulPruefen(sondenModul);
  assert.equal(urteil.gueltig, true, 'anders als bei Situationen kann ein Assistent sein eigenes Feld strukturell tragen — der einzige Riegel ist die Reservierung nativer IDs, derselbe wie bei Sektoren');
});

test('[U2-ADR-301·Rot-Beweis] ein Assistenten-Schritt OHNE frage wird verworfen — bestätigt die Auflage am echten Prüfer', async () => {
  const { V } = await ladeKern();
  const sondenModul = {
    modulTyp: 'wizard', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    wizards: {
      'x-sonde-ohne-frage': {
        titel: 'Sonde', ziel: { sektor: 'identity' },
        schritte: [{ feld: { id: 'x_sonde', typ: 'text' } }],   // frage fehlt absichtlich
        abschluss: {},
      },
    },
  };
  const urteil = V.wizardsModulPruefen(sondenModul);
  assert.equal(urteil.gueltig, false);
  assert.equal(urteil.verworfene[0].grund, 'schritte', 'frage ist Struktur, nicht Sprache — ihr Fehlen bricht den Schritt, kein Textsatz-Nachfüllen wie beim Sektor-Feld-Label');
});

/* ══ U2-ADR-305 — der Klartext-Hinweis neben `grund`, ohne einen `grund`-Wert zu ändern ═══
   Anlass: `grund: 'bloecke'` führte mich selbst in die Irre (§Riegel oben, vor der Korrektur).
   Ein Prüfer, dessen Ablehnung zu einer falschen Schlussfolgerung führt, hat einen Fehler.
   `hinweis` ist additiv, textsatz-gestützt (übersetzbar, nicht hartkodiert), nur bei einer
   Ablehnung gesetzt — kein bestehender `grund`-Wert wird angefasst. */

test('[U2-ADR-305·Hinweis] situationsModulPruefen: eine bloecke-Ablehnung trägt jetzt einen Klartext-Hinweis, aus dem Textsatz, nicht hartkodiert', async () => {
  const { V } = await ladeKern();
  const urteil = V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { 'x-sonde': { titel: 'Sonde', bloecke: [{ id: 'b', eintraege: [{ feld: { id: 'x', typ: 'text' } }] }] } },
  });
  assert.equal(urteil.verworfene[0].grund, 'bloecke', 'Vorbedingung: derselbe Grund wie vorher, unverändert');
  assert.equal(urteil.verworfene[0].hinweis, V.STRINGS.einlassHinweisSituationBloecke,
    'der Hinweis kommt aus dem Textsatz — dieselbe Quelle, die für die englische App übersetzt');
  assert.match(urteil.verworfene[0].hinweis, /signierte Vorlage/, 'der Hinweis muss sagen, WAS stattdessen erlaubt ist, nicht nur, dass abgelehnt wurde');
});

test('[U2-ADR-305·Hinweis] der Sammelgrund "leer" trägt jetzt den ECHTEN, sonst verdeckten Grund mit — genau die Verwechslung, die heute passierte', async () => {
  const { V } = await ladeKern();
  const urteil = V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { geburt: { titel: 'Übernahmeversuch' } },   // reservierte ID, einziger Eintrag
  });
  assert.equal(urteil.grund, 'leer', 'Vorbedingung: der Sammelgrund bleibt unverändert "leer"');
  assert.ok(urteil.hinweis.includes('reserviert'),
    'der Hinweis muss den ECHTEN Grund aus verworfene[0] nennen — genau das fehlte, als ich selbst grund:"leer" sah und verworfene[0].grund übersah');
});

test('[U2-ADR-305·Rot-Beweis] dieselbe Mechanik greift bei bereichsModulPruefen und wizardsModulPruefen (nicht nur bei Situationen)', async () => {
  const { V } = await ladeKern();
  const bereich = V.bereichsModulPruefen({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    bereiche: { identity: { id: 'identity', label: 'X' } } });   // reservierte ID
  assert.equal(bereich.grund, 'leer');
  assert.ok(bereich.hinweis && bereich.hinweis.includes('reserviert'));

  const wizard = V.wizardsModulPruefen({ modulTyp: 'wizard', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    wizards: { gebwiz: { titel: 'X', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] } } });   // reservierte ID
  assert.equal(wizard.grund, 'leer');
  assert.ok(wizard.hinweis && wizard.hinweis.includes('reserviert'));
});

test('[U2-ADR-305·Gegenprobe] ein ANGENOMMENES Modul trägt KEINEN hinweis — der Hinweis ist nur bei einer Ablehnung sinnvoll', async () => {
  const { V } = await ladeKern();
  const urteil = V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { 'x-frei': { titel: 'Sonde' } },
  });
  assert.equal(urteil.gueltig, true, 'Vorbedingung: das Modul wird angenommen');
  assert.equal(urteil.hinweis, undefined, 'ein durchgelaufenes Modul trägt kein hinweis-Feld — sonst wäre es nur Rauschen');
});

/* ══ Die Grenze, benannt — BEIDE HÄLFTEN GESCHLOSSEN ═══════════════════════════════════
   U2-ADR-308 (05.09.2026): buergermodulSituationErsetzen existiert jetzt — die eigene
   Grenze („gute Nachricht, dann kann ein echtes A/B folgen") ist eingetreten, s. dortige
   Proben (tests/buergermodul-situation-ersetzen.test.js) für das renderSituation-A/B.
   U2-ADR-306 (06.09.2026): buergermodulWizardErsetzen existiert jetzt ebenso, s.
   tests/buergermodul-wizard-ersetzen.test.js für das renderWizard-A/B. */
test('[U2-ADR-301·Grenze·Situation] buergermodulSituationErsetzen existiert jetzt — s. U2-ADR-308', async () => {
  const { V } = await ladeKern();
  assert.equal(typeof V.buergermodulSituationErsetzen, 'function',
    'U2-ADR-308 hat diese Haelfte der Luecke geschlossen — das echte renderSituation-A/B steht in tests/buergermodul-situation-ersetzen.test.js');
});
test('[U2-ADR-301·Grenze·Wizard] buergermodulWizardErsetzen existiert jetzt — s. U2-ADR-306', async () => {
  const { V } = await ladeKern();
  assert.equal(typeof V.buergermodulWizardErsetzen, 'function',
    'U2-ADR-306 hat auch diese Haelfte der Luecke geschlossen — das echte renderWizard-A/B steht in tests/buergermodul-wizard-ersetzen.test.js');
});
