'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Trägt der Template-Träger ALLES, was einen Bereich ausmacht? (08.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIESE PROBE STEHT VOR DEM BAU, NICHT NEBEN IHM. Sie ist am Tag ihrer Entstehung ROT, und
   das ist ihr Zweck: eine Messung, die man baut, während man das Gebaute misst, kann nicht
   mehr falsifizieren — sie wächst mit dem, was sie prüfen soll.

   WARUM ES SIE GIBT — und der Anlass ist eine eigene falsche Zahl. Stufe 1 meldete „0
   unerklärte Abweichungen über alle dreizehn Bereiche, 454 Definitionen Wort für Wort".
   Die Zahl war WAHR für das, was sie maß: Rubrik, Icon, Sektions-IDs, Sektions-Labels und
   die abgeflachten Feld-Definitionen. Als Satz über das Produkt war sie FALSCH — verglichen
   wurde die Template-Form, nicht das Laufzeit-Objekt, das die App rendert.

   Stufe 2 lief hinein: `wohnen` zog auf den Träger um und verlor dabei `format`, seine
   Wizards, seinen Einführungstext und die Sektions-Hinweise. 110 Proben fielen — Golden-
   Master, Exportkanäle, PDF-Modelle, Paritäts- und Rendering-Proben.

   DIE LEHRE, die diese Datei festhält: **eine Messung, deren Grundgesamtheit enger ist als
   die Behauptung, die auf ihr steht, ist keine Deckung.** Hier wird darum das VOLLSTÄNDIGE
   Laufzeit-Objekt verglichen, Schlüssel für Schlüssel — nicht eine Auswahl davon.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('../load-kern.js');
const { rohQuelleFuer } = require('../helfer/bereichs-rohquelle.js');

/* Schlüssel, die der Träger selbst setzt und die im Bündel nichts zu suchen haben. */
const TRAEGER_EIGEN = new Set([
  'angedockt', 'herkunft',
  // „Bereichsschnitt und Unterzeilen" (09.09.2026): `navUnterzeile` ist ein
  // zwölfter TEXTSATZ_ARTEN-Slot, den `_textsatzAufSektorenAnwenden` NACH dem Träger-Weg auf
  // JEDEN Sektor in SEKTOREN füllt (native wie bündel-sourced, uniform) — kein Bündel-Inhalt,
  // den `bereichsModulPruefen` prüfen oder durchreichen müsste. Anders als `label`/
  // `einfuehrungstext` trägt der rohe Bündel-Eintrag selbst nie einen `navUnterzeile`-Wert;
  // seine Abwesenheit im Träger-Ausgang ist darum kein Verlust, sondern der erwartete Zustand
  // vor dem Textsatz-Lauf.
  'navUnterzeile',
]);

describe('[Träger·Vollständigkeit] ein Template trägt alles, was seinen Bereich ausmacht', () => {
  test('kein Bereichs-Schlüssel geht auf dem Träger-Weg verloren', () => {
    const { V } = ladeKern();
    const fehlen = new Map();

    for (const b of V.bereicheAlle()) {
      const roh = rohQuelleFuer(V, b.id);
      if (!roh) continue;                          // kommt schon vom Träger — nicht Gegenstand
      const g = V.bereichsModulPruefen({
        modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de',
        kennung: 'vivodepot/' + b.id, fassung: 1, bereiche: { [b.id]: roh },
      }, { abWerk: true });
      assert.equal(g.gueltig, true, b.id + ' passiert den Träger nicht: ' + g.grund);
      const ueber = g.bereiche[0];

      for (const k of Object.keys(b)) {
        if (TRAEGER_EIGEN.has(k)) continue;
        if (ueber[k] === undefined && b[k] !== undefined) {
          if (!fehlen.has(k)) fehlen.set(k, []);
          fehlen.get(k).push(b.id);
        }
      }
    }

    assert.deepEqual([...fehlen.keys()].sort(), [],
      'DER TRÄGER VERLIERT SCHLÜSSEL. Was ihn nicht passiert, hat der Bereich nach dem Umzug '
      + 'nicht mehr — und keine Feld-Messung zeigt das, weil es keine Felder sind:\n  '
      + [...fehlen.entries()].map(([k, ids]) => k + ' (' + ids.length + ' Bereiche: '
          + ids.slice(0, 3).join(', ') + (ids.length > 3 ? ' …' : '') + ')').join('\n  '));
  });

  test('kein Sektions-Schlüssel geht verloren', () => {
    const { V } = ladeKern();
    const fehlen = new Map();

    for (const b of V.bereicheAlle()) {
      const roh = rohQuelleFuer(V, b.id);
      if (!roh) continue;
      const g = V.bereichsModulPruefen({
        modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de',
        kennung: 'vivodepot/' + b.id, fassung: 1, bereiche: { [b.id]: roh },
      }, { abWerk: true });
      const ueber = g.bereiche[0];

      for (let i = 0; i < (b.sektionen || []).length; i++) {
        const alt = b.sektionen[i], neu = (ueber.sektionen || [])[i];
        if (!neu) continue;
        for (const k of Object.keys(alt)) {
          if (neu[k] === undefined && alt[k] !== undefined) {
            if (!fehlen.has(k)) fehlen.set(k, new Set());
            fehlen.get(k).add(b.id);
          }
        }
      }
    }

    assert.deepEqual([...fehlen.keys()].sort(), [],
      'Sektions-Schlüssel gehen verloren: '
      + [...fehlen.entries()].map(([k, ids]) => k + ' (' + ids.size + ' Bereiche)').join(', '));
  });

  test('[Positivkontrolle] die Messung misst überhaupt etwas — dreizehn Bereiche, jeder mit Schlüsseln', () => {
    /* Ohne sie wäre ein grünes Ergebnis von „keine Bereiche gefunden" nicht zu unterscheiden.
       Genau der Fehler, den die Zahl aus Stufe 1 gemacht hat: sie war grün für eine Auswahl. */
    const { V } = ladeKern();
    const ausBuendel = V.bereicheAlle().filter((b) => rohQuelleFuer(V, b.id));
    assert.ok(ausBuendel.length >= 12, 'gemessene Bereiche: ' + ausBuendel.length);
    const schluessel = new Set();
    for (const b of ausBuendel) Object.keys(b).forEach((k) => schluessel.add(k));
    assert.ok(schluessel.size >= 8,
      'die Messung muss die volle Schlüsselbreite sehen, gefunden: ' + [...schluessel].sort().join(', '));
  });
});

describe('[Träger·exporte] ein Template darf sich keinen Ausgabeweg erfinden', () => {
  /* DIE BAUFORM, aus der diese zwei Proben kommen — gemessen im Chooser:

         const def = exportFormatFuerId(ex.format);
         if (imSubKontext() && def && def.nurAnker)                 return false;
         if (def && def.rechtsraum != null && def.rechtsraum !== …) return false;
         return true;

     **Beide Einschränkungen hängen an `def`.** Ist das Format unbekannt, ist `def`
     `undefined` — und keine greift. Je unbekannter der Eintrag, desto weniger Regeln gelten;
     genau verkehrt herum. Solange `exporte` nur aus dem eingebetteten Bündel kam, war das
     folgenlos. Seit ein TEMPLATE es tragen darf, ist es eine Tür.

     Darum fail-closed an der Tür. Und darum ZWEI Proben: die eine schließt die Tür, die
     andere hält fest, dass dabei das Schloss nicht ausgebaut wurde. */

  const templateMit = (exporte) => ({
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremd', sprache: 'de',
    kennung: 'fremd/x', fassung: 1,
    bereiche: { 'fremd-bereich': { label: 'Fremd', icon: 'folder', exporte,
      sektionen: [{ id: 's', felder: [{ id: 'tpl_a' }] }] } },
  });

  test('[Rot-Beweis 1] ein ERFUNDENES Format wird namentlich verworfen', () => {
    const { V } = ladeKern();
    const g = V.bereichsModulPruefen(templateMit([{ format: 'erfunden-kanal-x', label: 'Meins' }]));
    assert.equal(g.gueltig, true, 'der Bereich selbst bleibt gültig — nur der Kanal fällt');
    assert.ok(g.verworfene.some((v) => v.grund === 'export-format-unbekannt' && v.was === 'erfunden-kanal-x'),
      'ROT ERWARTET, wenn falsch: ein fremdes Template gibt sich einen Ausgabeweg, und die '
      + 'Einschränkungen im Chooser greifen für ein unbekanntes Format gerade NICHT. '
      + 'Verworfen: ' + JSON.stringify(g.verworfene));
    assert.deepEqual(g.bereiche[0].exporte, [], 'der erfundene Kanal darf nicht mitreisen');
  });

  test('[Rot-Beweis 2] ein BEKANNTES Format kommt durch — sonst wäre die Tür zu und das Schloss ausgebaut', () => {
    /* Ohne diese Probe wäre Nummer 1 auch dann grün, wenn `exporte` schlicht immer leer
       bliebe. Dann misst der Lauf, dass alles verboten ist, und nicht, wo die Grenze liegt. */
    const { V } = ladeKern();
    const bekannt = V.EXPORT_FORMATE[0].id;
    const g = V.bereichsModulPruefen(templateMit([{ format: bekannt, label: 'Erlaubt' }]));
    assert.equal(g.gueltig, true);
    assert.deepEqual((g.bereiche[0].exporte || []).map((e) => e.format), [bekannt],
      'ROT ERWARTET, wenn falsch: ein bekanntes Format muss den Träger passieren — sonst ' +
      'verlöre jeder migrierte Bereich seine Ausgabewege');
    assert.ok(!g.verworfene.some((v) => v.grund === 'export-format-unbekannt'),
      'und es darf nicht als unbekannt gemeldet werden');
  });

  test('die eingebauten Bereiche behalten ihre Ausgabewege — an der echten Sache gemessen', () => {
    const { V } = ladeKern();
    // Seit dem Schnitt liefert bereicheAlle() denselben Bestand, den BUERGERMODUL_BUENDEL
    // (jetzt null) früher trug — dieselbe Quelle, die bundleBauen() in
    // tools/vd-privat-struktur-bundle-erzeugen.js für denselben Zweck nutzt.
    const roh = V.bereicheAlle().find((b) => b.id === 'identity');
    const g = V.bereichsModulPruefen({ modulTyp: 'bereich', moduleVersion: 1,
      herkunft: 'vivodepot', sprache: 'de', kennung: 'vivodepot/identity', fassung: 1,
      bereiche: { identity: roh } }, { abWerk: true });
    assert.deepEqual((g.bereiche[0].exporte || []).map((e) => e.format),
      (roh.exporte || []).map((e) => e.format),
      'identitaet trägt zwei Ausgabewege; sie müssen den Träger unverändert passieren');
  });
});
