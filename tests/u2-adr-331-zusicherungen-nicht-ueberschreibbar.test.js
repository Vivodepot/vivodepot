'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-331 — ein Satz, mit dem die Anwendung über ihren eigenen Zustand
   spricht, ist kein Inhalt
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND (06.09.2026, am Kanon gemessen): ein fremdes
   Textsatz-Modul mit `sprache: 'en'` setzte in der Lese-App

     strings:klartextHinweis.text       -> "This file is securely encrypted."
     strings:herkunftSatzTeilweise.text -> "All entries come from verified sources."

   Beide wurden uebernommen. Der englischsprachige Empfaenger las danach, die
   Datei sei verschluesselt — ueber einer unverschluesselten Datei — und alle
   Angaben seien geprueft, ueber ungeprueften Erweiterungen. ER HAT KEIN
   ORIGINAL, GEGEN DAS ER DAS HALTEN KOENNTE.

   Der bestehende Riegel trug nur die halbe Strecke: `sprache === 'de'` wird
   als `reserviert` abgewiesen. Fuer jede ANDERE Sprache galt er nicht — also
   fuer genau die, um die es bei einer offenen Sprachachse geht.

   DIE GRENZE, aus der die Entscheidung folgt: das Modul liefert Werte und
   Bedeutung, das Geruest besitzt Rollen und Verhalten. Eine Aussage ueber den
   eigenen Zustand ist Verhalten.

   DIE SPERRLISTE IST ERZEUGT, nicht gepflegt — `tools/zusicherungs-schluessel-
   erheben.js` leitet sie aus den Zustands-Klassen im Markup ab. Beim ersten
   Lauf standen sechs `vorlage*`-Schluessel darin, an die niemand gedacht
   hatte; eine Handliste haette zwoelf gehabt und sich vollstaendig angefuehlt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');
// S1 (20.09.2026, U2-ADR-426): gemessen wird bei aktivem Englisch — das Gerüst trägt keinen englischen Satz mehr, darum das englische Standardprodukt; Assertions unverändert.
process.env.VD_TEST_PRODUKT = 'privat-en';
const { ladeKern } = require('./load-kern.js');
const E = require('../tools/zusicherungs-schluessel-erheben.js');

const REPO = path.join(__dirname, '..');
/* Die Sprachen, um die es geht — nicht nur Englisch. Die Sprachachse ist offen. */
const SPRACHEN = ['en', 'ar', 'ka', 'zh', 'sw'];

function modulMit(texte, sprache) {
  return { modulTyp: 'textsatz', moduleVersion: 1, sprache: sprache || 'en', texte };
}
function depotMit(modul, sprache) {
  return {
    schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [], sektoren: {},
    feldDefinitionen: [], sensibelFelder: {}, logikModule: [],
    textsatzModule: [modul], textsprache: sprache || 'en',
  };
}

test('[U2-ADR-331·Ausbeute] die Erhebung findet überhaupt Zustands-Blöcke und Schlüssel', () => {
  const quelle = require('node:fs').readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  const r = E.erheben(quelle);
  assert.ok(r.treffer.length >= 4,
    'ohne Fundstellen erhebt sie nichts und die Sperre wäre leer — gefunden: ' + r.treffer.length);
  assert.ok(r.schluessel.length > 10, 'erhobene Schlüssel: ' + r.schluessel.length);
  assert.ok(r.schluessel.includes('klartextHinweis'));
  assert.ok(r.schluessel.some((k) => k.startsWith('vorlage')),
    'die vorlage*-Sätze sagen dem Empfänger, ob eine Herkunft geprüft ist — dieselbe Art Aussage');
});

test('[U2-ADR-331·Anker] jede Klasse mit den Warn-Farben steht im Anker der Erhebung', () => {
  /* Der Anker ist bewacht, nicht geglaubt. Eine neue Zustands-Klasse fände die Erhebung nicht
     von selbst — diese Gegenprobe ist der Ersatz dafür. */
  const quelle = require('node:fs').readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  assert.deepEqual(E.gegenprobe(quelle).join(','), '',
    'eine Klasse trägt die Warn-Farben, steht aber nicht in ZUSTAND_KLASSEN — der Anker ist unvollständig');
});

test('[U2-ADR-331·Sperre] die erzeugte Liste in der Lese-App ist die erhobene', () => {
  const { V } = ladeLesen();
  const quelle = require('node:fs').readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  assert.equal(V.ZUSICHERUNGS_SCHLUESSEL_LESEN.join('|'), E.erheben(quelle).schluessel.join('|'),
    'Sperrliste und Erhebung müssen dieselbe Menge sein — sonst ist die Liste wieder gepflegt');
});

test('[U2-ADR-331·Rot-Beweis] ein Zusicherungs-Satz wird in JEDER Sprache benannt verworfen', () => {
  const { V } = ladeLesen();
  for (const sprache of SPRACHEN) {
    for (const schluessel of V.ZUSICHERUNGS_SCHLUESSEL_LESEN) {
      const kennung = 'strings:' + schluessel + '.text';
      const g = V.textsatzModulPruefen(modulMit({ [kennung]: 'übernommen?' }, sprache));
      assert.ok(!g.texte || !Object.prototype.hasOwnProperty.call(g.texte, kennung),
        sprache + ': ' + kennung + ' darf nicht übernommen werden');
      const grund = (g.verworfene || []).find((v) => v.kennung === kennung);
      assert.equal(grund && grund.grund, 'zusicherung',
        sprache + ': der Grund muss sagen WARUM — „unbekannt" hiesse „die kenne ich nicht", '
        + 'aber sie ist bekannt und trotzdem tabu');
    }
  }
});

test('[U2-ADR-331·Rot-Beweis Gegenrichtung] ein gewöhnlicher Text kommt weiter durch', () => {
  const { V } = ladeLesen();
  for (const sprache of SPRACHEN) {
    const g = V.textsatzModulPruefen(modulMit({ 'strings:sichtVoll.text': 'Depot view' }, sprache));
    assert.equal(g.gueltig, true);
    assert.equal(g.texte['strings:sichtVoll.text'], 'Depot view',
      sprache + ': eine Beschriftung ist Inhalt und bleibt anpassbar — sonst hätte die Sperre '
      + 'den Textsatz insgesamt abgeschaltet statt eine Klasse von Sätzen zu schützen');
  }
});

test('[U2-ADR-331·Ende-zu-Ende] der Wortlaut der App steht beim Empfänger — ein Modul ändert ihn nicht', () => {
  const { V } = ladeLesen();
  const unberuehrt = V.STRINGS.klartextHinweis;
  const fremd = {
    'strings:klartextHinweis.text': 'This file is securely encrypted.',
    'strings:herkunftSatzTeilweise.text': 'All entries come from verified sources.',
  };
  /* Englisch: die App trägt seit ZS2-Nachtrag (19.09.2026) ihre EIGENE englische Fassung
     (ZUSICHERUNG_TEXTE_EN) — nicht das Modul, nicht mehr der deutsche Rückfall. */
  const depotEn = depotMit(modulMit(fremd, 'en'), 'en');
  V.setData(depotEn);
  V._foldVollmachtenLesen(depotEn);
  assert.equal(V.STRINGS.klartextHinweis, V.ZUSICHERUNG_TEXTE_EN.klartextHinweis,
    'genau der Satz, den der Empfänger braucht, um die Datei einzuordnen — aus der App, nicht aus dem Modul');
  assert.ok(!V.STRINGS.herkunftSatzTeilweise.includes('verified sources'));
  /* Eine Sprache ohne eigene Fassung der App zeigt den englischen Satz der App, sichtbar gekennzeichnet (Rückfall-Reihenfolge 19.09.2026: richtige Aussage, falsche Sprache, aber nicht mehr still). */
  const depotFr = depotMit(modulMit(fremd, 'fr'), 'fr');
  V.setData(depotFr);
  V._foldVollmachtenLesen(depotFr);
  assert.equal(V.STRINGS.klartextHinweis, V.ZUSICHERUNG_TEXTE_EN.klartextHinweis + ' [English]');
  assert.ok(!V.STRINGS.herkunftSatzTeilweise.includes('verified sources'));
  assert.equal(typeof unberuehrt, 'string');
});

test('[U2-ADR-331·Wache·Kern] ein Fremdmodul kann die Beschriftung eines EINGEBAUTEN Bereichs nicht ändern', () => {
  /* DIESE PROBE IST HEUTE GRÜN UND SOLL ES BLEIBEN — sie ist keine Reparatur, sondern ein
     Stolperdraht. NICHT ENTFERNEN, auch wenn sie redundant aussieht.

     GEMESSEN am 06.09.2026: `identitaet.label` wird vom Schreib-Gate des Kerns ANGENOMMEN.
     Nicht über `_istBereichLabelKennung` — die weist eingebaute Kennungen korrekt ab —, sondern
     über `_istModulfeldKennung`: Feld- und Bereichs-Kennungen teilen sich dieselbe Form
     `<id>.<art>`, und `label` steht in TEXTSATZ_ARTEN_FELD.

     Dass trotzdem nichts gekapert wird, liegt an der LESE-Seite: die eingebauten Bereiche tragen
     ihre Beschriftung als schlichte Zeichenkette, nur angedockte laufen über `_bereichLabelText`.

     Der Riegel sitzt damit nicht dort, wo er aussieht. Er hält, solange eingebaute Beschriftungen
     keine Getter sind — und genau das ändert sich, während die Bereiche ins Bündel wandern
     (U2-ADR-320, gelandet am 06.09.2026). Wer als Nächster an `_bereichLabelText` arbeitet, macht
     aus einer latenten eine scharfe Lücke. Diese Probe wird in dem Moment rot. */
  /* NACHGEZOGEN AM 18.09.2026, NACHDEM DIE LÜCKE SCHARF WURDE UND GESCHLOSSEN IST.

     Die Zusicherung lautete bis hierher „identisch mit der Beschriftung VOR dem Modul" — also
     gegen die deutsche, weil eingebaute Beschriftungen am 06.09.2026 sprachunabhängige
     Zeichenketten waren. Seit dem Schnitt sind sie sprachabhängig, und DAS IST GEWOLLT: die
     amtlichen englischen Fassungen der dreizehn eingebauten Bereiche sollen greifen, sobald das
     Depot auf Englisch steht. Die alte Fassung hätte diese Übersetzung als Kaperung gemeldet.

     DIE NEUE FASSUNG IST STRENGER, NICHT SCHWÄCHER: sie hält das Ergebnis gegen DASSELBE Depot
     OHNE das Angriffsmodul. Damit fängt sie zusätzlich die LÖSCHUNG, die die alte Fassung
     durchgelassen hätte — ein Depot-Modul ersetzt das Fach seiner Sprache vollständig, ein
     Angreifer hätte statt „GEKAPERT" auch alle dreizehn Beschriftungen leeren können, und gegen
     die deutsche verglichen wäre das genauso rot gewesen wie die korrekte Übersetzung. Wer das
     hier für eine Aufweichung hält, vergleiche die beiden Fehlermeldungen: die alte Fassung
     konnte Kaperung und Übersetzung nicht unterscheiden, diese kann es. */
  const messung = (mitAngriff) => {
    const { V } = ladeKern();
    const eingebaut = V.BEREICH_IDS_EINGEBAUT[0];
    const d = V.leeresDepot();
    d.textsprache = 'en';
    if (mitAngriff) d.textsatzModule = [modulMit({ [eingebaut + '.label']: 'GEKAPERT' }, 'en')];
    V.setData(d);
    V._textsatzModuleAusDepotAnmelden(d);
    return V.SEKTOR_BY_ID[eingebaut].label;
  };

  const ohneAngriff = messung(false);
  assert.ok(typeof ohneAngriff === 'string' && ohneAngriff.length > 2,
    'Ausbeute: der eingebaute Bereich hat auch auf Englisch eine Beschriftung — sonst prüft der '
    + 'Vergleich unten zwei leere Zeichenketten gegeneinander und wäre immer grün');

  assert.equal(messung(true), ohneAngriff,
    'ein Modul aus einer Depot-Datei darf die Beschriftung eines eingebauten Bereichs weder '
    + 'überschreiben noch löschen — wird diese Probe rot, ist die Lücke wieder offen und gehört '
    + 'geschlossen, nicht angepasst');
});
