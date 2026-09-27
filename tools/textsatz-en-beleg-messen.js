'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-en-beleg-messen — dieselbe Probe wie mitschalt-beleg-messen.js,
   jetzt mit dem ECHTEN englischen Bürgersatz statt des Prüfstoffs `zz`
   ────────────────────────────────────────────────────────────────────────────
   „Englischer Bürgersatz und ein Pro-Modul als Andock-Demo"
   (25.08.2026), Abschnitt „Wie belegt wird": „Positivkontrolle ... und
   Rot-Beleg ... sind vorhanden und unverändert gültig — sie werden nicht neu
   gebaut, nur mit dem echten en-Satz erneut gefahren." Genau das tut dieses
   Werkzeug: derselbe Weg-Katalog, dieselben zwei Urteile (Positivkontrolle,
   Rot-Beleg), aber `sprache:'en'` und Texte aus `tools/textsatz-en-daten.js`
   statt der ZZ-Markierungstexte.

   Der Kern-Kennung (Positivkontrolle) und die zwei Wege-Messungen sind
   wortgleich aus `tools/mitschalt-beleg-messen.js` übernommen — nur die
   Erwartung wechselt von „ZZ-<kennung>" auf den echten englischen Text.

   Das Modulfeld bleibt dasselbe Prüfstoff-Feld (`tpl_pruefstoff_frist`) wie im
   Original — es steht für JEDES angedockte Modulfeld, nicht speziell für das
   Pro-Modul aus Ziel 2 dieses Auftrags (das ist eine eigene, echte Andock-
   Demo, kein Ersatz für diese Mechanik-Probe).

   Aufruf:  node tools/textsatz-en-beleg-messen.js [--json]
   ════════════════════════════════════════════════════════════════════════════ */
const { TEXTSATZ_EN_TEXTE } = require('./textsatz-en-daten.js');

const SPRACHE = 'en';
const KERN_SEKTOR = 'identitaet';
const KERN_FELD = 'vorname';
const KERN_KENNUNG = KERN_SEKTOR + '.' + KERN_FELD + '.label';
const KERN_ERWARTET = TEXTSATZ_EN_TEXTE[KERN_KENNUNG];   // "First name" — aus dem echten Satz, nicht hier erfunden

const MODUL_FELD_ID = 'tpl_pruefstoff_frist';
const MODUL_FELD_LABEL = 'Fristensystem';
const MODUL_KENNUNG = KERN_SEKTOR + '.' + MODUL_FELD_ID + '.label';
const MODUL_ERWARTET = 'Deadline system';   // eigens für dieses Prüfstoff-Feld, kein AB_WERK_TEXTSATZ_DE-Gegenstück

function echterSatz() {
  return {
    modulTyp: 'textsatz', sprache: SPRACHE, moduleVersion: 1, anbieterId: 'vivodepot',
    texte: Object.assign({}, TEXTSATZ_EN_TEXTE, {
      [MODUL_KENNUNG]: MODUL_ERWARTET,
    }),
  };
}

function depotMitModulfeld(V) {
  const d = V.leeresDepot();
  d.feldDefinitionen = [{
    sektorId: KERN_SEKTOR, feldId: MODUL_FELD_ID, typ: 'text',
    label: MODUL_FELD_LABEL, gruppe: 'Prüfstoff',
  }];
  d.sektoren = d.sektoren || {};
  d.sektoren[KERN_SEKTOR] = Object.assign({}, d.sektoren[KERN_SEKTOR], {
    [KERN_FELD]: 'Prüfwert Kern',
    [MODUL_FELD_ID]: 'Prüfwert Modulfeld',
  });
  return d;
}

function urteil(text, erwartet, deutsch) {
  if (text == null) return 'weg-lief-nicht';
  if (String(text).includes(erwartet)) return 'schaltet-mit';
  if (String(text).includes(deutsch)) return 'schaltet-nicht-mit';
  return 'weg-lief-nicht';
}

function wegeMessen(V) {
  const wege = [];
  const nimm = (name, stelle, fn) => {
    let text = null, fehler = null;
    try { text = fn(); } catch (e) { fehler = String(e && e.message).slice(0, 120); }
    wege.push({ name, stelle, text, fehler });
  };
  const J = (x) => (x == null ? null : JSON.stringify(x));

  nimm('Eingabemaske · Kern-Feld', 'SEKTOREN-Katalogknoten (Quelle von feldZeileHTML)', () => {
    const sek = V.bereicheAlle().find((x) => x.id === KERN_SEKTOR);
    const treffer = [];
    (function geh(n) {
      if (!n) return;
      if (Array.isArray(n)) return n.forEach(geh);
      if (n.id === KERN_FELD) treffer.push(String(n.label));
      if (n.felder) n.felder.forEach(geh);
      if (n.sektionen) n.sektionen.forEach(geh);
    })(sek && sek.sektionen);
    return treffer.join(' | ') || null;
  });

  nimm('Eingabemaske · Modulfeld', 'templateAbschnitteHTML / _templateDefAlsFeld', () =>
    V.templateAbschnitteHTML(V._templateAbschnitte(KERN_SEKTOR), KERN_SEKTOR, true, false));

  nimm('Gesamt-PDF (Modell)', 'vollDepotModell', () => J(V.vollDepotModell({ sensibel: true })));

  nimm('Bereichs-PDF (Modell)', 'bereichVollModell', () => J(V.bereichVollModell(KERN_SEKTOR)));

  nimm('Herausgabe-Uebersicht', 'exportUebersichtModell', () => J(V.exportUebersichtModell()));

  return wege;
}

function einSatzLauf(V, mitSatz) {
  const d = depotMitModulfeld(V);
  if (mitSatz) {
    d.textsatzModule = [echterSatz()];
    d.textsprache = SPRACHE;
  }
  V.setData(d);
  const angemeldet = V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  const wege = wegeMessen(V);
  return { angemeldet, aktiveSprache: V.textsatzSpracheAktiv(), wege };
}

function messen(V) {
  const geprueft = V.textsatzModulPruefen(echterSatz());
  const angenommeneKennungenAnzahl = Object.keys(geprueft.texte || {}).length;
  const verworfene = (geprueft.verworfene || []).map((v) => v.kennung + ' (' + v.grund + ')');

  const mit = einSatzLauf(V, true);
  const ohne = einSatzLauf(V, false);

  const zeilen = mit.wege.map((w, i) => ({
    weg: w.name, stelle: w.stelle,
    kern: urteil(w.text, KERN_ERWARTET, 'Vorname'),
    modulfeld: urteil(w.text, MODUL_ERWARTET, MODUL_FELD_LABEL),
    rotBeleg: urteil(ohne.wege[i].text, KERN_ERWARTET, 'Vorname'),
    fehler: w.fehler,
  }));

  const gemessen = zeilen.filter((z) => z.kern !== 'weg-lief-nicht');
  return {
    sprache: SPRACHE,
    angemeldeteSaetze: mit.angemeldet,
    aktiveSprache: mit.aktiveSprache,
    angenommeneKennungenAnzahl, verworfene,
    wegeGesamt: zeilen.length,
    wegeGemessen: gemessen.length,
    zeilen,
    positivkontrolle: gemessen.length > 0 && gemessen.every((z) => z.kern === 'schaltet-mit'),
    rotBelegSauber: zeilen.every((z) => z.rotBeleg !== 'schaltet-mit'),
    modulfeldSchaltetMit: gemessen.some((z) => z.modulfeld === 'schaltet-mit'),
  };
}

function bericht(m) {
  const z = [];
  z.push('Echter Satz: Sprache `' + m.sprache + '` · angemeldet: ' + m.angemeldeteSaetze
    + ' · aktive Sprache im Lauf: ' + m.aktiveSprache);
  z.push('Vom Satz-Prüfer angenommene Kennungen: ' + m.angenommeneKennungenAnzahl);
  z.push('Vom Satz-Prüfer VERWORFEN: ' + (m.verworfene.join(', ') || '(keine)'));
  z.push('');
  z.push('Wege gesamt: ' + m.wegeGesamt + ' · davon gemessen: ' + m.wegeGemessen);
  for (const r of m.zeilen) {
    z.push('  ' + r.weg.padEnd(28) + ' Kern: ' + r.kern.padEnd(18)
      + ' Modulfeld: ' + r.modulfeld.padEnd(18) + ' Rot-Beleg: ' + r.rotBeleg
      + (r.fehler ? '  [' + r.fehler + ']' : ''));
  }
  z.push('');
  z.push('POSITIVKONTROLLE (Kern schaltet auf JEDEM gemessenen Weg um): ' + (m.positivkontrolle ? 'JA' : 'NEIN'));
  z.push('ROT-BELEG (ohne Satz zeigt kein Weg den englischen Text): ' + (m.rotBelegSauber ? 'JA' : 'NEIN'));
  z.push('DIE ANTWORT — schaltet das angedockte Modulfeld mit dem echten Satz mit? ' + (m.modulfeldSchaltetMit ? 'JA' : 'NEIN'));
  return z.join('\n');
}

if (require.main === module) {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const m = messen(V);
  console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 2) : bericht(m));
}
module.exports = { messen, bericht, echterSatz, depotMitModulfeld, SPRACHE, KERN_KENNUNG, MODUL_KENNUNG };
