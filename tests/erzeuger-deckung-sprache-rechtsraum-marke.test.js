'use strict';
/* U2-ADR-318 — die Deckung der drei übrigen Achsen des Bündel-Erzeugers: Sprache,
   Rechtsraum, Marke. Vorbild und Fortsetzung von U2-ADR-317 (Struktur-Achse:
   tests/erzeuger-deckung-wizards-katalog.test.js).

   DIE VIER ACHSEN (U2-ADR-291): Struktur ∪ Sprache ∪ Recht ∪ Marke = nativer Bestand.
   Vier Dateien, EIN Erzeuger (`tools/buergermodul-schnitt.js`), aus EINEM Lauf:
     tools/buergermodul/vd-de-sprache.json    (modulTyp:'textsatz')
     tools/buergermodul/vd-de-rechtsraum.json (modulTyp:'rechtsraum')
     tools/buergermodul/vd-branding.json      (modulTyp:'branding')

   WAS HIER GEPRÜFT WIRD, WIE BEI ADR-317: nicht, ob der Erzeuger richtig schneidet
   (das prüft tests/buergermodul-schnitt.test.js) — sondern ob jeder Verweis, den eine
   EINGEFRORENE Bündel-Datei enthält, gegen den LEBENDEN Kern noch auflöst. Die
   Regenerierung bleibt aus (wie bei ADR-317 verlangt); die Deckung kommt aus dem
   Vergleich zwischen eingefrorener Datei und lebendem Kern, nicht aus einem neuen Lauf
   des Erzeugers.

   DIE DREI KLASSEN, aus ADR-317 übernommen und hier an echten Konsumenten gemessen,
   nicht nur strukturell verglichen:
     wirft laut       -> fällt beim Einlass/Boot auf
     wirft NICHT      -> die gefährliche Sorte: still falsch statt sichtbar kaputt
     liefert weniger  -> die leiseste: ein Vorschlag bleibt leer, niemand zählt nach

   JEDE PROBE PRÜFT ZUERST IHRE EIGENE AUSBEUTE — dieselbe Vorkehrung wie ADR-317: eine
   Probe, die nichts findet, ist sonst nicht von einer zu unterscheiden, die nichts zu
   finden hat. Und die Listen kommen aus den eingefrorenen Dateien selbst (Object.keys),
   nicht aus einer hier gepflegten Aufzählung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { schneiden } = require('../tools/buergermodul-schnitt.js');

const REPO = path.join(__dirname, '..');
const SPRACHE = require(path.join(REPO, 'tools', 'buergermodul', 'vd-de-sprache.json'));
const RECHTSRAUM = require(path.join(REPO, 'tools', 'buergermodul', 'vd-de-rechtsraum.json'));
const MARKE = require(path.join(REPO, 'tools', 'buergermodul', 'vd-branding.json'));

/* ════════════════════════════════════════════════════════════════════════
   SPRACHE-ACHSE — der reale Einlassweg ist `textsatzModulPruefen`
   (EINLASS_REGISTER, typ:'textsatz'). `sprache:'de'` ist dort reserviert
   (TEXTSATZ_SPRACHE_EINGEBAUT) — für die Messung selbst unerheblich: geprüft
   wird die KENNUNGS-AUFLÖSUNG in `_textsatzTexteUebernehmen`, die vor der
   Sprachprüfung läuft und ihr eigenes Urteil unabhängig davon fällt.
   ════════════════════════════════════════════════════════════════════════ */

/* U2-ADR-399 (06.09.2026, Rebase-Landung 10.09.2026): der EINE Fund dieser Datei ist
   behoben, nicht entfernt — eine leere RATSCHE bleibt der Wächter dafür, dass sie nicht
   wieder wächst, ohne dass es auffällt (dieselbe Bauart wie `BEKANNTE_LUECKEN` in
   tests/buergermodul-schnitt.test.js). `feld.art.vorschlaege` trug die Mehrdeutigkeit
   zweier katalogweit doppelt vergebener UnterFeld-IDs (meine-menschen/unterhalt/art,
   finanzen/konten/art) — aufgelöst durch die Trägerkette (`feld.<traeger>/<feldId>.
   vorschlaege`, s. `_vorschlaegeTextsatz` in vivodepot.html und
   `vorschlaegeKennungenZuweisen` in tools/buergermodul-schnitt.js). */
const SPRACHE_BEKANNTE_LUECKEN = Object.freeze([]);

test('[Sprache-Deckung] die texte-Verweise kommen aus der eingefrorenen Datei selbst, nicht aus einer gepflegten Liste', () => {
  const kennungen = Object.keys(SPRACHE.texte);
  assert.ok(kennungen.length >= 1000,
    'nur ' + kennungen.length + ' texte-Kennungen gefunden — erwartet mindestens 1000. '
    + 'Findet das Muster weniger, prüft alles darunter ins Leere');
});

test('[Sprache-Deckung] JEDER texte-Verweis läuft durch den echten Einlassweg — akzeptiert oder als BEKANNTER Fund benannt, nie ein NEUER', () => {
  const { V } = ladeKern();
  // sprache:'de' umbenannt, um an der Reserviert-Prüfung vorbeizukommen — die hier
  // gemessene Kennungs-Auflösung läuft in `_textsatzTexteUebernehmen` VOR dieser Prüfung
  // und ist von ihr unabhängig.
  const modul = Object.assign({}, SPRACHE, { sprache: 'de-privat-messung-a318' });
  const r = V.textsatzModulPruefen(modul);
  assert.equal(r.gueltig, true, 'das Modul selbst müsste gültig sein — sonst prüft dieser Lauf gar nichts: ' + r.grund);
  const verworfeneKennungen = r.verworfene.filter((v) => v.grund === 'unbekannt').map((v) => v.kennung).sort();
  const neu = verworfeneKennungen.filter((k) => !SPRACHE_BEKANNTE_LUECKEN.includes(k));
  assert.deepEqual(neu, [],
    'diese texte-Kennungen lösen NICHT mehr auf und sind NEU (nicht in SPRACHE_BEKANNTE_LUECKEN): '
    + neu.join(', ') + '. Der Einlassweg verwirft sie STILL (kein Wurf) — ein Feld verliert seinen '
    + 'Text, ohne dass irgendetwas anschlägt.');
  assert.deepEqual(verworfeneKennungen, [...SPRACHE_BEKANNTE_LUECKEN],
    'die bekannte Lücke ist entweder behoben (dann SPRACHE_BEKANNTE_LUECKEN nachziehen) oder es '
    + 'gibt eine zweite, hier noch nicht benannte — beides ist ein Befund, kein Testfehler.');
});

test('[Sprache-Deckung·ROT] eine gepflanzte, nicht existente Kennung wird verworfen — nie fälschlich akzeptiert', () => {
  const { V } = ladeKern();
  const modul = Object.assign({}, SPRACHE, {
    sprache: 'de-privat-messung-a318',
    texte: Object.assign({}, SPRACHE.texte, { 'identity.gibtsnicht_a318.label': 'Erfundenes Feld' }),
  });
  const r = V.textsatzModulPruefen(modul);
  const treffer = r.verworfene.find((v) => v.kennung === 'identity.gibtsnicht_a318.label');
  assert.ok(treffer, 'die gepflanzte Kennung wurde nicht verworfen — dann misst die Probe oben nichts');
  assert.equal(treffer.grund, 'unbekannt');
});

test('[Sprache-Deckung·Positivkontrolle] eine echte, unveränderte Kennung wird akzeptiert', () => {
  const { V } = ladeKern();
  const modul = Object.assign({}, SPRACHE, { sprache: 'de-privat-messung-a318' });
  const r = V.textsatzModulPruefen(modul);
  assert.equal(r.texte['identity.givenName.label'], 'Vorname',
    'am unveränderten Bündel muss eine echte Kennung ankommen — sonst wäre "verworfen" oben '
    + 'kein Befund, sondern eine Prüfung, die nichts durchlässt');
});

/* ════════════════════════════════════════════════════════════════════════
   RECHTSRAUM-ACHSE — der reale Einlassweg ist `rechtsraumFristUeberlagerungSetzen`
   + `_rechtsraumFristRegel`/`_rechtsraumGueltigkeitVorschlag` (U2-ADR-307/314).
   ZWEI Kennungsformen (kein Freifahrtschein über feldId allein, s. Kommentar am
   Kern): `<sektorId>.<feldId>` und `situation:<sitId>.<feldId>`.
   ════════════════════════════════════════════════════════════════════════ */

function rechtsraumKennungOrt(kennung) {
  if (kennung.startsWith('situation:')) {
    const rest = kennung.slice('situation:'.length);
    const punkt = rest.indexOf('.');
    return { art: 'situation', id: rest.slice(0, punkt), feldId: rest.slice(punkt + 1) };
  }
  const punkt = kennung.indexOf('.');
  return { art: 'sektor', id: kennung.slice(0, punkt), feldId: kennung.slice(punkt + 1) };
}

function feldExistiertInSituation(V, sitId, feldId) {
  const sit = (V.SITUATIONEN || []).find((s) => s.id === sitId);
  if (!sit) return false;
  for (const blk of (sit.bloecke || [])) {
    for (const e of (blk.eintraege || [])) {
      if (e && e.feld && e.feld.id === feldId) return true;
    }
  }
  return false;
}

function rechtsraumOuterKennungLoest(V, kennung) {
  const ort = rechtsraumKennungOrt(kennung);
  return ort.art === 'situation' ? feldExistiertInSituation(V, ort.id, ort.feldId) : !!V.feldDefFuer(ort.id, ort.feldId);
}

/* Innere Verweise: `gueltigkeitVorschlag.ausFeld` / `fristRegel.abFeld` — ein
   Geschwisterfeld IM SELBEN Sektor/derselben Situation, keine sektorId im Wert
   (dieselbe Kette wie beim Träger-Feld selbst). */
function rechtsraumInnereVerweise(eintrag) {
  const raus = [];
  if (eintrag.gueltigkeitVorschlag && typeof eintrag.gueltigkeitVorschlag.ausFeld === 'string') {
    raus.push({ art: 'ausFeld', ziel: eintrag.gueltigkeitVorschlag.ausFeld });
  }
  if (eintrag.fristRegel && typeof eintrag.fristRegel.abFeld === 'string') {
    raus.push({ art: 'abFeld', ziel: eintrag.fristRegel.abFeld });
  }
  return raus;
}

function rechtsraumInnererVerweisLoest(V, kennung, ziel) {
  const ort = rechtsraumKennungOrt(kennung);
  return ort.art === 'situation' ? feldExistiertInSituation(V, ort.id, ziel) : !!V.feldDefFuer(ort.id, ziel);
}

test('[Rechtsraum-Deckung] die felder-Verweise kommen aus der eingefrorenen Datei selbst', () => {
  const kennungen = Object.keys(RECHTSRAUM.felder);
  assert.ok(kennungen.length >= 5,
    'nur ' + kennungen.length + ' Rechtsraum-Verweise gefunden — erwartet mindestens fünf');
  const situationsform = kennungen.filter((k) => k.startsWith('situation:'));
  const sektorform = kennungen.filter((k) => !k.startsWith('situation:'));
  assert.ok(sektorform.length >= 2, 'zu wenige Sektor-Kennungen gefunden — Muster geprüft?');
  assert.ok(situationsform.length >= 2, 'zu wenige Situations-Kennungen gefunden — Muster geprüft?');
});

test('[Rechtsraum-Deckung] JEDER äußere Verweis (Träger-Feld) löst gegen den lebenden Kern auf', () => {
  const { V } = ladeKern();
  const tot = Object.keys(RECHTSRAUM.felder).filter((k) => !rechtsraumOuterKennungLoest(V, k));
  assert.deepEqual(tot, [],
    'diese Rechtsraum-Kennungen zeigen auf kein Feld im lebenden Kern mehr — der Eintrag wird '
    + 'dann NIE gelesen (der Kern fragt nur nach echten, gerenderten Feldern), also weder laut '
    + 'noch still bemerkt: er liegt tot im Modul:\n  ' + tot.join('\n  '));
});

test('[Rechtsraum-Deckung] JEDER innere Verweis (ausFeld/abFeld) löst als Geschwisterfeld auf', () => {
  const { V } = ladeKern();
  let mitInnerem = 0;
  const tot = [];
  for (const [k, eintrag] of Object.entries(RECHTSRAUM.felder)) {
    for (const v of rechtsraumInnereVerweise(eintrag)) {
      mitInnerem++;
      if (!rechtsraumInnererVerweisLoest(V, k, v.ziel)) tot.push(k + '.' + v.art + ' → ' + v.ziel);
    }
  }
  assert.ok(mitInnerem >= 2,
    'nur ' + mitInnerem + ' innere Verweise (ausFeld/abFeld) gefunden — erwartet mindestens zwei. '
    + 'Findet der Sammler weniger, prüft er ins Leere');
  assert.deepEqual(tot, [],
    'diese ausFeld/abFeld-Verweise zeigen auf kein Geschwisterfeld mehr. Der echte Konsument wirft '
    + 'NICHT (feldGueltigkeitVorschlag/_fristHinweisFuerFeld sind try/catch-umschlossen bzw. lesen '
    + 'nur eine Objekteigenschaft) — der Vorschlag/Fristhinweis bleibt einfach leer:\n  ' + tot.join('\n  '));
});

test('[Rechtsraum-Deckung·still] JEDER Eintrag besteht auch die REGEL-Form-Prüfung des echten Konsumenten — nicht nur die Feld-Existenz', () => {
  /* Der leiseste der drei Rechtsraum-Fälle: ein Eintrag kann ein reales Feld UND ein
     reales ausFeld/abFeld tragen und trotzdem NIE wirken, weil sein eigener Regel-Kopf
     die geschlossene Form nicht erfüllt (feldFristRegelPruefen/feldGueltigkeitVorschlagPruefen)
     — dann verwirft ihn der Kern beim Nachschlagen und fällt auf die eingebaute Regel
     zurück (falls eine da ist) oder auf gar keinen Hinweis. */
  const { V } = ladeKern();
  const ungueltig = [];
  for (const [k, eintrag] of Object.entries(RECHTSRAUM.felder)) {
    if (eintrag.fristRegel) {
      const g = V.feldFristRegelPruefen(eintrag.fristRegel);
      if (!g.regel) ungueltig.push(k + '.fristRegel → verworfen (' + g.verworfen + ')');
    }
    if (eintrag.gueltigkeitVorschlag) {
      const g = V.feldGueltigkeitVorschlagPruefen(eintrag.gueltigkeitVorschlag);
      if (!g.regel) ungueltig.push(k + '.gueltigkeitVorschlag → verworfen (' + g.verworfen + ')');
    }
  }
  /* Ein bekannter, gemessener Fund: `mobility.passportValidUntil` trägt im nativen
     Bestand die ALTE, geschlossene Regel-Kennung (`regel:'ausweisdauer'`) — die
     Struktur-Achse belässt diese Regel bewusst im Kern (s. Kommentar an
     `feldGueltigkeitVorschlagPruefen`, ADR-314: „Die eingebaute Regel bleibt darum, wo
     sie ist; sie wandert NICHT nach vd-de-rechtsraum.json"). Der Schnitt exportiert die
     Rohwerte trotzdem (er kennt nur `RECHTS_EIGENSCHAFTEN`, keine Formprüfung) — der
     Eintrag ist damit von Geburt an ein Nicht-Überlagerer: harmlos hier, weil der native
     Fallback dieselbe Regel ohnehin trägt, aber ein Leser der Datei, der `monate`
     erwartet, würde sich täuschen. */
  const RECHTSRAUM_BEKANNTE_FORM_LUECKEN = ['mobility.passportValidUntil.gueltigkeitVorschlag → verworfen ((ohne monate))'];
  const neu = ungueltig.filter((u) => !RECHTSRAUM_BEKANNTE_FORM_LUECKEN.includes(u));
  assert.deepEqual(neu, [], 'neue, bisher nicht benannte Regel-Form-Lücken: ' + neu.join(', '));
  assert.deepEqual(ungueltig, RECHTSRAUM_BEKANNTE_FORM_LUECKEN,
    'die bekannte Form-Lücke ist entweder behoben oder es gibt eine andere als die benannte');
});

test('[Rechtsraum-Deckung·ROT] ein äußerer Verweis auf ein nicht existierendes Feld wird gefunden', () => {
  const { V } = ladeKern();
  assert.equal(rechtsraumOuterKennungLoest(V, 'identitaet.gibtsnicht_a318'), false);
  assert.equal(rechtsraumOuterKennungLoest(V, 'situation:geburt.gibtsnicht_a318'), false);
});

test('[Rechtsraum-Deckung·ROT] der echte Konsument liefert LEER (kein Wurf), wenn abFeld ins Leere zeigt', () => {
  const { V } = ladeKern();
  const KENNUNG = 'socialInsurance.noticeDated';
  try {
    V.rechtsraumFristUeberlagerungSetzen({
      felder: { [KENNUNG]: { fristRegel: { abFeld: 'gibtsnicht_a318', dauer: 'P1M', quelle: 'Test A318' } } },
    });
    let geworfen = false;
    let ergebnis;
    try {
      ergebnis = V._fristHinweisFuerFeld({ id: 'noticeDated' }, {}, {}, new Date('2026-09-06'), KENNUNG);
    } catch (e) { geworfen = true; }
    assert.equal(geworfen, false, 'der Konsument hat geworfen — das widerspricht der still-Klasse');
    assert.equal(ergebnis, '', 'erwartet leer (kein Hinweis), nicht irgendein anderer stiller Fallback');
  } finally {
    V.rechtsraumFristUeberlagerungSetzen(null);
  }
});

test('[Rechtsraum-Deckung·Positivkontrolle] am echten, unveränderten Bündel liefert derselbe Konsument einen ECHTEN Hinweis', () => {
  const { V } = ladeKern();
  const KENNUNG = 'situation:geburt.geburt_kind_kv';
  try {
    V.rechtsraumFristUeberlagerungSetzen(RECHTSRAUM);
    const ergebnis = V._fristHinweisFuerFeld(
      { id: 'geburt_kind_kv' }, { geburt_datum: '2026-01-01' }, { geburt_datum: '2026-01-01' },
      new Date('2026-09-06'), KENNUNG,
    );
    assert.notEqual(ergebnis, '',
      'am echten Bündel muss ein Fristhinweis herauskommen — sonst wäre "leer" oben kein '
      + 'Befund, sondern das Verhalten des Konsumenten an sich');
  } finally {
    V.rechtsraumFristUeberlagerungSetzen(null);
  }
});

/* ════════════════════════════════════════════════════════════════════════
   MARKE-ACHSE — die kleinste der vier. Der Schnitt (tools/buergermodul-
   schnitt.js, Zeile ~237) füllt `marke` an GENAU EINER Stelle: dem Namen aus
   dem Dokument-Katalog. Alles andere (Farben/Logo/Schriftart) ist BENANNT
   nicht geschnitten (BRANDING_NICHT_GESCHNITTEN) — dieselbe Ehrlichkeit wie
   bei den anderen Achsen: eine Achse ohne Verweis ist ein Befund, keine Lücke
   in der Probe. */
test('[Marke-Deckung] das Branding-Modul trägt heute KEINEN feldbezogenen Verweis — aus der Quelle bestätigt, nicht angenommen', () => {
  const { V } = ladeKern();
  const frisch = schneiden(V).marke;
  assert.deepEqual(Object.keys(frisch).sort(), ['name'],
    'der Erzeuger selbst füllt heute nur `marke.name` — ändert sich das, muss diese Probe '
    + 'neue Verweisarten aufnehmen, nicht stillschweigend an ihnen vorbeisehen');
  assert.equal(typeof MARKE.name, 'string', 'die eingefrorene Datei muss denselben Schlüssel tragen');
  assert.ok(MARKE.name.length > 0, 'ein leerer Markenname wäre selbst schon der Befund');
});

test('[Marke-Deckung] die eingefrorene Datei stimmt mit dem frischen Schnitt überein — kein Drift ohne Meldung', () => {
  const { V } = ladeKern();
  const frisch = schneiden(V).marke;
  assert.equal(MARKE.name, frisch.name,
    'der eingefrorene Markenname weicht vom lebenden Kern ab — der Dokument-Katalog-Eintrag '
    + '(persoenliches.standardDokumente[].typ===\'vivodepot\') hat sich geändert, ohne dass '
    + 'vd-branding.json nachgezogen wurde');
});
