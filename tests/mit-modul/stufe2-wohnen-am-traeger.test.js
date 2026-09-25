'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Stufe 2 — `wohnen` verlässt das Bündel und kommt über eine EINGEBAUTE Quelle
   (Auftrag, 09.09.2026, zweiter Anlauf)
   ────────────────────────────────────────────────────────────────────────────
   DER ERSTE ANLAUF WURDE VERWORFEN, und der Grund gehört an den Anfang: er zog `wohnen` nach
   `AB_WERK_BEREICH_QUELLEN` — eine BACK-REGION. `produkt-konfektionieren.js` ersetzt sie
   beim Bauen GANZ (`_regionNutzlastSetzen`), und `gerüstByteGleich()` normiert sie auf
   beiden Vergleichsseiten auf `Object.freeze([])` zurück (`_ohneAbWerkNutzlast`). Beides
   zusammen: was dort liegt, ist von jedem Produkt mit eigenem `bereich`-Modul überschreibbar
   UND für den Byte-Gleich-Wächter unsichtbar. Ein Produkt, das `wohnen` dadurch verlöre,
   käme byte-gleich heraus.

   `BEREICH_QUELLEN_EINGEBAUT` steht darum AUSSERHALB jeder Marker-Region — und damit
   INNERHALB der Byte-Gleich-Zusage. Kein `AB_WERK_`-Präfix, weil es keine Ab-Werk-Saat eines
   Produkts ist, sondern der eingebaute Bestand dieses Gerüsts.

   DIE RANGFOLGE (Auftrag, 09.09.2026):

       eingebaut  ->  Produkt  ->  Mitschrift        erste ID gewinnt

   Eingebaut steht VOR Produkt, damit ein Produkt einen eingebauten Bereich nicht STILL
   ersetzen kann. Dafür gibt es `bereichsErsatz` (U2-ADR-348) — ausdrücklich, geprüft, mit
   Identitäts-Riegel. Ein zweiter, leiser Weg zum selben Ergebnis wäre die Naht, gegen die
   dieser Umbau gebaut ist.

   NACHTRAG (18.09.2026) — STUFE 2 IST VOM SCHNITT ABGELÖST, DIESE DATEI BLEIBT ALS PROTOKOLL.
   `BEREICH_QUELLEN_EINGEBAUT` existiert nicht mehr — ersatzlos entfernt, wörtlich im Kern
   vermerkt: `vivodepot.html:4208`, „Der eigentliche Schnitt (BUERGERMODUL_BUENDEL/
   BEREICH_QUELLEN_EINGEBAUT entfernt) trägt v735." `wohnen` kommt seither wie alle dreizehn
   eingebauten Bereiche direkt aus der Backpipeline (`tools/bereich-templates/*.json` +
   `_standardProduktBaken`), keine eigene Zwischenkonstante mehr. Die drei Proben, die
   `BEREICH_QUELLEN_EINGEBAUT` als eigenständiges Artefakt prüften, sind darum ENTFERNT — nicht
   umgeschrieben, weil ein Umschreiben eine vierte, im Produkt nicht existierende Zwischenstufe
   simuliert hätte. Die Zusicherung, die sie hielten („wohnen kommt eingebaut, nicht aus dem
   toten Bündel, an seinem kanonischen Platz"), ist anderswo bereits gedeckt und unverändert
   grün geblieben: der Test „wohnen bleibt in BEREICH_IDS_EINGEBAUT" unten in diesem Block, sowie
   die vollständigen Blöcke „[Stufe 2·Reihenfolge]" und „[Stufe 2·Rangfolge]" weiter unten.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('../load-kern.js');

const REPO = path.join(__dirname, '..', '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const quelle = () => fs.readFileSync(KERN_PFAD, 'utf8');

function ladeKernAusText(text) {
  // Seit dem Schnitt bäckt ladeKern() NUR beim Standard-Pfad (s. _standardProduktBaken-Kopf in
  // tests/load-kern.js) — ein eigener KERN_HTML_PATH (hier nötig, um genau DIESEN mutierten Text
  // zu laden) schaltet das automatische Backen sonst ab, und bereicheAlle() liefert 0 statt 13.
  // Fund und Fix wie bei tools/vd-privat-struktur-bundle-erzeugen.js#ladeKernMitBestand: selbst
  // backen (auf dem bereits mutierten Text — die Mutation trifft den Boot-Aufrufer, keine
  // Ab-Werk-Marker-Region, also unabhängig von der Reihenfolge), dann die gebackene UND mutierte
  // Fassung unter dem eigenen Pfad laden.
  const { _standardProduktBaken } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const gebacken = _standardProduktBaken(text);
  const datei = path.join(os.tmpdir(), 's2-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(datei, gebacken, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = datei;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  try {
    return require(path.join(REPO, 'tests', 'load-kern.js')).ladeKern();
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
    fs.rmSync(datei, { force: true });
  }
}

/* ── 1 · Der Umzug ─────────────────────────────────────────────────────────── */

describe('[Stufe 2] `wohnen` kommt aus der eingebauten Quelle', () => {
  // Drei Proben (Bündel-Abwesenheit, BEREICH_QUELLEN_EINGEBAUT als Träger, Lage außerhalb der
  // Ab-Werk-Marker) am 18.09.2026 entfernt — s. Nachtrag im Kopf-Kommentar dieser Datei.

  test('`wohnen` bleibt in `BEREICH_IDS_EINGEBAUT` — anderer Weg, nicht anderer Rang', () => {
    const { V } = ladeKern();
    assert.ok(V.BEREICH_IDS_EINGEBAUT.includes('housing'));
  });
});

/* ── 2 · Dreizehn vor jedem Depot ──────────────────────────────────────────── */

describe('[Stufe 2·Boot] dreizehn Bereiche, bevor je ein Depot geöffnet wurde', () => {
  test('bereicheAlle() liefert dreizehn ohne Depot, mit `wohnen`', () => {
    const { V } = ladeKern();
    const ids = V.bereicheAlle().map((b) => b.id);
    assert.equal(ids.length, 13, 'gefunden: ' + ids.join(' '));
    assert.ok(ids.includes('housing'));
  });

  test('[Rot-Beweis] ohne den Boot-Aufrufer bleibt der eingebaute Bestand leer', () => {
    /* NACHTRAG (18.09.2026) — dieselbe Ablösung wie bei den drei entfernten Proben oben: der
       Aufruf bootstrapt heute ALLE eingebauten Bereiche, nicht mehr `wohnen` im besonderen
       (Stufe 2, 09.09.2026, ist vom Schnitt abgelöst). Die Zahl „zwölf" war nie die Zusicherung,
       sondern ihre Ausprägung an genau jenem Tag — gemessen 18.09.2026: ohne den Aufrufer sind es
       null, nicht zwölf. Die Zusicherung selbst bleibt gültig und lohnt, gehalten zu werden: OHNE
       den Boot-Aufruf fehlt der eingebaute Bestand GANZ (leer, eine Eigenschaft), MIT ihm ist er
       VOLLSTÄNDIG (an `BEREICH_IDS_EINGEBAUT.length` gemessen, nicht getippt — wächst mit, wenn
       ein vierzehnter Bereich dazukommt). */
    const text = quelle();
    const anker = '_bereichsModuleAusDepotAnmelden(null);';
    assert.ok(text.includes(anker), 'ANKER VERFEHLT: der Boot-Aufrufer heisst nicht mehr so.');
    const { V: vollstaendig } = ladeKern();
    const erwarteteVollzahl = vollstaendig.BEREICH_IDS_EINGEBAUT.length;
    const { V } = ladeKernAusText(text.replace(anker, '/* für den Rot-Beweis entfernt */'));
    const ids = V.bereicheAlle().map((b) => b.id);
    assert.equal(ids.length, 0,
      'ROT ERWARTET: ohne den Boot-Aufrufer kommt kein eingebauter Bereich mehr durch — leer, '
      + 'nicht nur ohne `wohnen`. Gefunden: ' + ids.join(' '));
    assert.ok(erwarteteVollzahl >= 13,
      'Vorbedingung: BEREICH_IDS_EINGEBAUT trägt weiterhin mindestens die dreizehn nativen '
      + 'Bereiche, gefunden: ' + erwarteteVollzahl);
  });
});

/* ── 3 · Die Reihenfolge ───────────────────────────────────────────────────── */

describe('[Stufe 2·Reihenfolge] der gesäte Bereich steht an seinem kanonischen Platz', () => {
  test('bereicheAlle() ist Zeichen für Zeichen BEREICH_IDS_EINGEBAUT', () => {
    const { V } = ladeKern();
    assert.deepEqual(V.bereicheAlle().map((b) => b.id), [...V.BEREICH_IDS_EINGEBAUT],
      'ROT ERWARTET, wenn die Registry hinten angehängt wird: `wohnen` stünde nach '
      + '`persoenliches`, dem laut U2-ADR-041 letzten Bereich. Für die Bürgerin sichtbar.');
  });

  test('[Gegenprobe] ein FREMDES Modul wird weiterhin hinten angehängt', () => {
    const { V } = ladeKern();
    V.setData(V.leeresDepot());
    const d = V.getData();
    d.bereichsModule = [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremd-anbieter', sprache: 'de',
      kennung: 'fremd-anbieter/zzz', fassung: 1,
      bereiche: { 'zzz-fremder-bereich': { label: 'Fremd', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'zzz_a', label: 'A', typ: 'text' }] }] } },
    }];
    V._bereichsModuleAusDepotAnmelden(d);
    const ids = V.bereicheAlle().map((b) => b.id);
    assert.equal(ids[ids.length - 1], 'zzz-fremder-bereich',
      'ein fremder Bereich gehört ans Ende: ' + ids.join(' '));
    assert.deepEqual(ids.slice(0, 13), [...V.BEREICH_IDS_EINGEBAUT]);
  });

  test('[Warum nicht an der Anzeige] die Cluster-Ansicht ist bei `wohnen` nur noch TEILWEISE blind (Bereichsschnitt 09.09.2026)', () => {
    /* Gemessen über alle dreizehn, ursprünglich (vor dem „Bereichsschnitt und
       Unterzeilen", 09.09.2026): hängt man `wohnen` hinten an, ändert das GAR KEINE der fünf
       Cluster-Gruppierungen — `wohnen` war der einzige Schlusslicht seines Clusters
       (`alltag` = [mobilitaet, wohnen]). Eine Reihenfolge-Probe gegen die Seitenleiste wäre
       grün gewesen, während die flache Reihenfolge falsch war.

       DAS IST SEIT DEM BEREICHSSCHNITT NICHT MEHR VOLLSTÄNDIG WAHR, GENAU WIE DIESE PROBE ES
       VORHERGESAGT HAT (s. ihre alte Fassung, Git-Historie): `krisenvorsorge` zog nach
       `alltag` und liegt DAVOR (Rang 12 in BEREICH_IDS_EINGEBAUT, `wohnen` Rang 11) — `wohnen`
       ist darum NICHT MEHR der Schlusslicht seines eigenen Clusters, `krisenvorsorge` ist es.
       Hängt man `wohnen` ganz nach hinten, ändert sich darum GENAU der Cluster `alltag`
       (dessen interne Reihenfolge kippt von [mobilitaet, wohnen, krisenvorsorge] auf
       [mobilitaet, krisenvorsorge, wohnen]) — die ÜBRIGEN VIER Cluster bleiben unberührt,
       weil die Gruppierung selbst über die ID läuft (`Z[s.id]`), nicht über die Position. */
    const { V } = ladeKern();
    const Z = V.BEREICH_CLUSTER_ZUORDNUNG, R = V.BEREICH_CLUSTER_REIHENFOLGE;
    const gruppieren = (liste) => {
      const nach = {};
      for (const s of liste) (nach[Z[s.id] || 'module'] ||= []).push(s.id);
      return R.map((c) => ({ c, ids: nach[c] || [] })).filter((g) => g.ids.length);
    };
    const heute = V.bereicheAlle();
    const hintenAn = heute.filter((s) => s.id !== 'housing').concat(heute.filter((s) => s.id === 'housing'));
    assert.notDeepEqual(hintenAn.map((s) => s.id), heute.map((s) => s.id));

    const gHeute = gruppieren(heute), gHintenAn = gruppieren(hintenAn);
    for (const cluster of ['ich-mensch', 'geld-absicherung', 'gesundheit-krisen', 'bildung-verwaltung']) {
      assert.deepEqual(gHintenAn.find((g) => g.c === cluster), gHeute.find((g) => g.c === cluster),
        `Cluster "${cluster}" darf von der wohnen-Umhängung unberührt bleiben — trägt kein wohnen, kein krisenvorsorge`);
    }
    const alltagHeute = gHeute.find((g) => g.c === 'alltag').ids;
    const alltagHintenAn = gHintenAn.find((g) => g.c === 'alltag').ids;
    assert.deepEqual(alltagHeute, ['mobility', 'housing', 'emergencyPreparedness'],
      'natürliche Reihenfolge: wohnen (Rang 11) vor krisenvorsorge (Rang 12)');
    assert.deepEqual(alltagHintenAn, ['mobility', 'emergencyPreparedness', 'housing'],
      'mit wohnen an letzter Stelle der Gesamtliste kippt NUR die interne Reihenfolge von alltag — '
      + 'krisenvorsorge ist seit dem Bereichsschnitt der tatsächliche Cluster-Schlusslicht, nicht mehr wohnen');
  });
});

/* ── 4 · Die Rangfolge ─────────────────────────────────────────────────────── */

describe('[Stufe 2·Rangfolge] eingebaut vor Produkt vor Mitschrift', () => {
  test('eine widersprechende Mitschrift gewinnt nicht gegen die eingebaute Quelle', () => {
    const { V } = ladeKern();
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'angreifer', sprache: 'de',
      kennung: 'angreifer/kaperung', fassung: 99,
      bereiche: { housing: { label: 'FALSCH AUS DER MITSCHRIFT', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'w_a', label: 'A', typ: 'text' }] }] } },
    }] };
    const treffer = V._bereichModulAbWerkSeed(d).find((b) => b.id === 'housing');
    assert.ok(treffer, 'ROT ERWARTET: `wohnen` erscheint gar nicht in der Saat');
    assert.notEqual(treffer.label, 'FALSCH AUS DER MITSCHRIFT',
      'die eingebaute Quelle muss gewinnen — sonst überschriebe eine Depot-Datei den '
      + 'eingebauten Wortlaut und die Korrektur des Programms käme nie an');
  });

  test('der abgewiesene Kaperungsversuch wird BENANNT', () => {
    const { V } = ladeKern();
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'angreifer', sprache: 'de',
      kennung: 'angreifer/kaperung', fassung: 99,
      bereiche: { housing: { label: 'Kaperung', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'w_a', label: 'A', typ: 'text' }] }] } },
    }] };
    V._bereichModulAbWerkSeed(d);
    /* DER GRUND IST `reserviert`, NICHT `doppelt-ab-werk` — gemessen, nicht erwartet.
       Ein Mitschrift-Eintrag läuft mit `abWerk: false`; für ihn ist `wohnen` eine RESERVIERTE
       ID, und `bereichsModulPruefen` weist das ganze Modul ab, bevor der `gesehen`-Riegel
       überhaupt erreicht wird. Die erste Fassung dieser Probe erwartete den schwächeren
       Grund — die Abweisung ist strenger als angenommen.

       GEFUNDEN HAT DAS DIE PROBE, und der Befund dahinter ist grösser als der Kaperungsfall:
       die Saat warf das Prüfergebnis weg und hinterliess KEINE Zeile. U2-ADR-186 hatte genau
       das im Registry-Weg behoben; die Saat hatte die Korrektur nie bekommen. */
    assert.ok(V.BEREICHS_MODUL_VERWORFEN.some((v) => v.id === 'housing' && v.grund === 'reserviert'),
      'ein Kaperungsversuch soll eine Spur hinterlassen: ' + JSON.stringify(V.BEREICHS_MODUL_VERWORFEN));
  });

  test('die Mitschrift bleibt für FREMDE Bereiche erreichbar', () => {
    /* Die Zusicherung aus U2-ADR-398: eine Pro-Datei behält im nativen Programm ihre
       mitgebrachte Struktur — auch jetzt, wo die eingebaute Quelle nicht mehr leer ist. */
    const { V } = ladeKern();
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'pro-anbieter', sprache: 'de',
      kennung: 'pro-anbieter/notfallmappe', fassung: 1,
      bereiche: { 'pro-eigener-bereich': { label: 'Aus der Datei', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'p_a', label: 'A', typ: 'text' }] }] } },
    }] };
    const ids = V._bereichModulAbWerkSeed(d).map((b) => b.id);
    assert.ok(ids.includes('housing'), 'die eingebaute Quelle wird weiter gesät');
    assert.ok(ids.includes('pro-eigener-bereich'),
      'ROT ERWARTET, wenn die Vereinigung nicht dreistufig ist: die Mitschrift wäre '
      + 'unerreichbar, sobald die eingebaute Quelle etwas trägt. Gefunden: ' + ids.join(' '));
  });

  test('[Sicherheitsgrenze] die Mitschrift läuft weiter mit `abWerk: false`', () => {
    const { V } = ladeKern();
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'pro-anbieter', sprache: 'de',
      kennung: 'pro-anbieter/ohne-label', fassung: 1,
      bereiche: { 'pro-ohne-label': { icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'q_a', label: 'A', typ: 'text' }] }] } },
    }] };
    const ids = V._bereichModulAbWerkSeed(d).map((b) => b.id);
    assert.ok(!ids.includes('pro-ohne-label'),
      'ROT ERWARTET: ein Mitschrift-Eintrag ohne Label darf nicht durchkommen — sonst liefe '
      + 'die Mitschrift mit `abWerk: true` und die Grenze aus Stufe 1 wäre offen');
  });
});
