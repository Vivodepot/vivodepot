'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Befund U1 (24.11.2026): „Erst umsehen“ zeigt ein gefülltes, erfundenes Beispiel
   ─────────────────────────────────────────────────────────────────────────────
   „Erst umsehen, ohne zu speichern“ führte auf leere Bereiche mit „Ihre Angaben fehlen noch“. Entschieden ist ein gefülltes,
   als erfunden gekennzeichnetes Beispiel über alle Bereiche, Speichern gesperrt, nichts davon übernehmbar. Die Angaben sind
   die Beispielwerte der Felder (Template bzw. Sprachmodul des Produkts); der Kern nennt keinen Bereich und kein Feld.

   Gebaut nach Variante A (P01): das Beispiel ist schreibgeschützt, ein Hauptknopf „Eigenes Depot anlegen“, Anlegen verwirft
   die Vorschau ganz und beginnt leer mit allen Bereichen.

   Am gebauten Produkt, für alle vier (privat-de, privat-en, pro-de, pro-en):
     · Gefüllt     — jeder Bereich des Produkts trägt nach „Erst umsehen“ mindestens eine Angabe, in der Sprache des Produkts.
     · Gekennzeichnet — über der Ansicht steht der Streifen „erfundenes Beispiel“ mit dem einen Hauptknopf; kein Schreibrecht.
     · Schreibgeschützt — kein Feld des Beispiels ist eine Eintragen-Schaltfläche, keine leere Anlege-Karte.
     · Nicht übernehmbar — das Beispiel zählt nicht als Inhalt der Person, die Übernahme in ein Depot setzt nichts davon.
   Rot-Beweise: ohne Einsetzen bleibt die Vorschau leer; ein Bereich ohne Beispielzeile fällt auf; ohne die Marke ginge das
   Beispiel beim Anlegen mit; außerhalb des Beispiels ist der Feldwert wieder die Umschau-Schaltfläche.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const PRODUKT = require('./produkt-html-erzeugen.js');

// Alle Produkte, die dieser Stand baut (öffentlich nur Privat; Pro fehlt dort von selbst).
const PRODUKTE = require('../tools/lib/vier-produkte.js').PRODUKTE.map((p) => p.slug);
const gefuellt = (w) => (typeof w === 'string' ? w.trim() !== ''
  : Array.isArray(w) ? w.some(gefuellt)
    : (w && typeof w === 'object') ? Object.entries(w).some(([k, v]) => k !== 'id' && gefuellt(v))
      : (w !== undefined && w !== null && w !== false));

// Die Bereiche des Produkts, die nach dem Umsehen keine Angabe tragen.
function leereBereiche(V) {
  const d = V.getData();
  return V.bereicheAlle().map((b) => b.id).filter((id) => !gefuellt((d.sektoren || {})[id] || {}));
}

const geladen = new Map();
function umsehen(slug) {
  if (!geladen.has(slug)) geladen.set(slug, PRODUKT.kernAus(PRODUKT.produktHtml(slug)));
  const k = geladen.get(slug);
  k.V.flowVorschauBetreten();
  k.V.renderContent();
  return k;
}

for (const slug of PRODUKTE) {
  test('[Umsehen·Gefüllt] ' + slug + ': nach „Erst umsehen“ trägt jeder Bereich eine erfundene Angabe', () => {
    const { V } = umsehen(slug);
    assert.ok(V.imVorschau(), 'die Vorschau ist offen');
    assert.ok(V.imBeispiel(), 'das Beispiel ist gesetzt');
    assert.ok(V.bereicheAlle().length >= 7, 'Positivkontrolle: das Produkt trägt seine Bereiche (' + V.bereicheAlle().length + ')');
    assert.deepEqual(leereBereiche(V), [], 'jeder Bereich trägt eine Angabe');
    const feld = V.bereichFelder('identity').find((f) => f.id === 'familyName');
    assert.equal(V.getData().sektoren.identity.familyName, feld.beispiel, 'die Angabe ist der Beispielwert des Felds in der Sprache des Produkts');
    for (const [sektor, id, wert, eintrag] of V.beispielAngaben()) {
      const w = V.getData().sektoren[sektor][id];
      if (eintrag) assert.deepEqual(Object.assign({}, w[0], { id: undefined }), Object.assign({ id: undefined }, eintrag), sektor + '.' + id);
      else assert.equal(w, wert, sektor + '.' + id);
    }
    // Was ein leeres Depot nicht zeigt (Auffangfelder „frühere Angabe“, abgelöste Anschriftzeilen), zeigt auch das Beispiel nicht.
    const verborgen = V.beispielAngaben().filter(([s, id]) => { const fd = V.bereichFelder(s).find((x) => x.id === id); return fd && (fd.nurAnzeige === true || V.feldNurMitWertUndLeer(fd, undefined)); }).map(([s, id]) => s + '.' + id);
    assert.deepEqual(verborgen, [], 'das Beispiel zeigt kein Feld, das ein leeres Depot verbirgt');
  });

  test('[Umsehen·Gekennzeichnet] ' + slug + ': der Streifen sagt, dass das Beispiel erfunden ist, und trägt den einen Hauptknopf', () => {
    const { V } = umsehen(slug);
    assert.ok(V.beispielStreifenStellen(), 'Streifen über der Ansicht');
    const t = V.beispielStreifenTeile(false);
    assert.equal(t.text, V.STRINGS.beispielStreifen, 'der Satz aus dem Sprachmodul des Produkts');
    assert.match(t.text, slug.endsWith('-en') ? /made-up/i : /erfunden/i);
    assert.ok(t.knopf, 'genau ein Knopf: der Hauptknopf');
    assert.equal(t.knopf.text, V.STRINGS.beispielAnlegenKnopf);
    assert.match(t.knopf.text, slug.endsWith('-en') ? /own depot/i : /Eigenes Depot/);
    assert.ok(t.knopf.sektor, 'zurück in den offenen Bereich');
    assert.equal(V.Modus.darfBearbeiten(), false, 'im Beispiel wird nichts eingetragen');
    // Stellt die Ansicht selbst schon einen Weg hin („Sub-Depots“), bleibt es beim Satz: je Ansicht genau ein Weg.
    assert.equal(V.beispielStreifenTeile(true).knopf, null);
  });

  test('[Umsehen·Schreibgeschützt] ' + slug + ': kein Feld des Beispiels ist eine Eintragen-Schaltfläche', () => {
    const { V } = umsehen(slug);
    let felder = 0;
    for (const b of V.bereicheAlle()) {
      for (const f of V.bereichFelder(b)) {
        const roh = (V.getData().sektoren[b.id] || {})[f.id];
        const h = V.feldZeileHTML(f, roh, b.id, false);
        assert.ok(!/data-umschau-eintragen/.test(h), b.id + '.' + f.id);
        felder++;
      }
    }
    assert.ok(felder > 20, 'Positivkontrolle: Felder gesehen (' + felder + ')');
  });

  test('[Umsehen·Nicht übernehmbar] ' + slug + ': das Beispiel zählt nicht als Inhalt und geht beim Anlegen nicht mit', () => {
    const { V } = umsehen(slug);
    const beispiel = V.getData();
    assert.equal(V.vorschauHatDaten(beispiel), false);
    V.vorschauDepotErzeugen();
    V.vorschauDatenUebernehmen(beispiel);
    assert.deepEqual(leereBereiche(V).length, V.bereicheAlle().length, 'das frische Depot bleibt leer');
  });
}

test('[Umsehen·Verwirft ganz] Anlegen aus dem Beispiel nimmt nichts mit, auch nicht, was darin verändert wurde', () => {
  const { V } = umsehen('privat-de');
  const d = V.getData();
  d.sektoren.health = { bloodType: 'A+' };
  d.sektoren.identity.givenName = 'Anna';
  d.menschen.push({ id: 'p-eigen', vorname: 'Eigen' });
  assert.equal(V.vorschauHatDaten(d), false, 'die Vorschau des Beispiels hat keine Daten der Person');
  V.vorschauDepotErzeugen();
  V.vorschauDatenUebernehmen(d);
  assert.equal(leereBereiche(V).length, V.bereicheAlle().length, 'leer, mit allen Bereichen');
  assert.ok(!V.getData().menschen.some((m) => m.id === 'p-eigen'));
  assert.equal(V.getData()._beispiel, undefined);
});

test('[Umsehen·Streifen] renderContent stellt den Streifen; außerhalb des Beispiels gibt es keinen', () => {
  const KERN = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(KERN, /try \{ _pwHinweisStellen\(\); \} catch \(_\) \{\}[^\n]*\n\s*beispielStreifenStellen\(_anlegenKarteImInhalt\);/);
  const bau = KERN.slice(KERN.indexOf('function beispielStreifenStellen('), KERN.indexOf('return el;', KERN.indexOf('function beispielStreifenStellen(')));
  assert.doesNotMatch(bau, /innerHTML/, 'der Streifen setzt kein HTML aus Zeichenketten');
  assert.match(bau, /knopf\.className = 'btn';[\s\S]*knopf\.setAttribute\('data-anlegen-weg', ''\)/, 'Hauptknopf und Anlege-Weg');
  const { V } = umsehen('privat-de');
  V.vorschauDepotErzeugen();
  assert.equal(V.beispielStreifenStellen(), null);
  // Rot-Beweis zum Schreibschutz: außerhalb des Beispiels ist der Feldwert wieder die Umschau-Schaltfläche.
  const f = V.bereichFelder('identity').find((x) => x.id === 'familyName');
  assert.match(V.feldZeileHTML(f, undefined, 'identity', false), /data-umschau-eintragen/);
});

test('[Umsehen·Rot-Beweis] ohne Einsetzen leer, ein Bereich ohne Zeile fällt auf, ohne Marke ginge das Beispiel mit', () => {
  const { V } = umsehen('privat-de');
  // 1 · ohne Einsetzen: Vorschau leer wie vorher, keine Marke.
  V.vorschauDepotErzeugen();
  assert.equal(V.getData()._beispiel, undefined);
  assert.equal(leereBereiche(V).length, V.bereicheAlle().length, 'ohne Einsetzen ist jeder Bereich leer');
  // 2 · ein Bereich ohne Beispielzeile: die Probe meldet ihn.
  V.flowVorschauBetreten();
  delete V.getData().sektoren.pets;
  assert.deepEqual(leereBereiche(V), ['pets']);
  // 3 · ohne die Marke zählte das Beispiel als Inhalt der Person und ginge beim Anlegen mit.
  V.flowVorschauBetreten();
  const ohneMarke = V.getData();
  delete ohneMarke._beispiel;
  assert.equal(V.vorschauHatDaten(ohneMarke), true);
  // 4 · Positivkontrolle zur Sichtbarkeit: es gibt verborgene Felder mit Beispielwert; das Beispiel lässt sie aus.
  const versteckt = V.bereicheAlle().flatMap((bb) => V.bereichFelder(bb.id).filter((fd) => (fd.nurAnzeige === true || V.feldNurMitWertUndLeer(fd, undefined)) && typeof fd.beispiel === 'string' && fd.beispiel.trim()).map((fd) => bb.id + '.' + fd.id));
  assert.ok(versteckt.length > 0, 'Positivkontrolle: verborgene Felder mit Beispielwert (' + versteckt.length + ')');
  const gezeigt = new Set(V.beispielAngaben().map(([s, id]) => s + '.' + id));
  assert.deepEqual(versteckt.filter((k) => gezeigt.has(k)), [], 'keines davon steht im Beispiel');
});

test('[Umsehen·Sprache] privat und Pro zeigen ihr Beispiel in ihrer Sprache: die Werte im englischen Produkt sind englisch', () => {
  const paare = PRODUKTE.filter((p) => p.endsWith('-de') && PRODUKTE.includes(p.replace(/-de$/, '-en'))).map((p) => [p, p.replace(/-de$/, '-en')]);
  assert.ok(paare.length >= 1, 'Positivkontrolle: mindestens ein Sprachpaar');
  for (const [de, en] of paare) {
    const wertDe = new Map(umsehen(de).V.beispielAngaben().map((z) => [z[0] + '.' + z[1], JSON.stringify(z.slice(2))]));
    const zeilenEn = umsehen(en).V.beispielAngaben();
    const anders = zeilenEn.filter((z) => wertDe.has(z[0] + '.' + z[1]) && wertDe.get(z[0] + '.' + z[1]) !== JSON.stringify(z.slice(2)));
    assert.ok(anders.length >= zeilenEn.length / 2, en + ': die Mehrzahl der Werte unterscheidet sich vom deutschen Produkt (' + anders.length + '/' + zeilenEn.length + ')');
  }
  // Ein Bereich aus einem Template bringt sein Beispiel über seine Feldquelle mit (wo das Produkt ihn trägt).
  for (const slug of PRODUKTE) {
    const { V } = umsehen(slug);
    if (!V.bereicheAlle().some((b) => b.id === 'pro-aufbewahrung-ordnung')) continue;
    assert.equal(V.getData().sektoren['pro-aufbewahrung-ordnung'].tpl_tax_audit_contact, slug.endsWith('-en') ? 'Example tax advisers' : 'Steuerberatung Beispiel', slug);
  }
});
