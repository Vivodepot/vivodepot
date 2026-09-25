'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pro-felder-aus-vorlage.js — leitet Feld-/UnterFeld-/Sektions-Kennungen aus
   den 56 Pro-Vorlagen-Feldern ab („Die 56 Pro-Felder in die
   sieben Pro-Bereiche", 10.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   EINE QUELLE FÜR DIE ABLEITUNG, ZWEI VERBRAUCHER: `tools/pro-bereichsersatz-
   erzeugen.js` (baut die Struktur, deutsche Literale) und
   `tools/textsatz-en-pro-felder-daten.js` (baut die englischen Textsatz-
   Kennungen für dieselbe Struktur) — dieselbe Ableitungslogik, kein zweiter,
   still abweichender Nachbau (Regel „ZIEHT, ABSCHREIBT NICHT").

   FELD-KENNUNGEN ABGELEITET, NICHT ERFUNDEN: `tpl_` + Slug des `feldname` —
   dieselbe Form, gegen neun bereits bestehende Pro-Feldkennungen geprüft
   (`tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul(-en).json`,
   `tools/templates/vivodepot-pro-notar-kanzleivertretung-logikmodul.json`), z. B.
   `tpl_prokura`, `tpl_nachfolgeklausel_im_gesellschaftsvertrag_vorhanden`,
   `tpl_patientenverfuegung_ablageort`, `tpl_e_mail` — alle neun exakt
   reproduziert (s. Testdatei).

   `_MODULFELD_KENNUNG` im Kern (vivodepot.html) VERLANGT den `tpl_`-Präfix
   hart — kein Freifahrtschein für einen zweiten Kennungsraum.

   UNTERFELD jaNein → `checkbox`, NICHT `auswahl`+ja/nein: eine Options-
   Kennung AM UnterFeld bräuchte eine DRITTE Kennungs-Ebene
   (`<bereich>.<feld>/<unterfeld>/<wert>`), die der Kern (Stand 10.09.2026)
   nicht kennt. `checkbox` ist ein gültiger, einfacherer nativer Typ
   (`identitaet.person.familienname_zuerst`) und passt semantisch (eine
   Ja/Nein-Unterfrage in einer Listenzeile). TOP-LEVEL `jaNein` bleibt
   `auswahl`+ja/nein — dieselbe Konvention wie `_templateFeldZuModell` im
   Kern für die VORLAGE-Anwendung selbst schon verwendet (zwei-stufige
   Kennung, bereits unterstützt).
   ════════════════════════════════════════════════════════════════════════════ */

const UMLAUTE = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };

function _translit(s) {
  let t = s.toLowerCase();
  for (const [k, v] of Object.entries(UMLAUTE)) t = t.split(k).join(v);
  return t;
}

// tpl_-Feldkennung aus einem Feldnamen — s. Kopf-Kommentar, gegen neun
// bestehende Kennungen geprüft.
function feldId(feldname) {
  const slug = _translit(feldname).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  return 'tpl_' + slug;
}

// Sektions-Kennung aus einer Gruppen-Überschrift — kein tpl_-Präfix, dieselbe
// Zeichenmenge wie eine Bereichs-ID (klein, Ziffern, Bindestrich). „Block N —
// …" wird auf `block-N` verkürzt (die Kennung ist unsichtbar, nur ihr Text
// kommt aus dem Textsatz — ein voll ausgeschriebener Slug wäre nur länger,
// nicht klarer).
function sektionId(gruppe) {
  if (gruppe.startsWith('Block ')) return 'block-' + gruppe.split(' ')[1];
  const slug = _translit(gruppe).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  return slug.slice(0, 40);
}

function mapTyp(feldtyp) {
  if (feldtyp === 'jaNein') return 'auswahl';
  if (feldtyp === 'auswahl') return 'auswahl';
  if (feldtyp === 'liste' || feldtyp === 'text' || feldtyp === 'datum') return feldtyp;
  throw new Error('unbekannter Vorlagen-Feldtyp: ' + feldtyp);
}

/* Baut aus den 56 DE+EN-Vorlagenfeldern (parallel, gleicher Index) die
   gruppierte Sektionsstruktur — deutsche Literale (Struktur) + Textsatz-
   Kennungen in der Sprache von `vorlageFelderEn`, in einem Durchlauf, damit
   beide Seiten garantiert dieselbe ID-Ableitung teilen.

   `jaNeinLabels` (17.09.2026, Strang C, DE-Pro-Erzeuger): der EINE Fall, den
   diese Funktion NICHT aus `vorlageFelderEn` ableitet — jaNein-Optionen
   tragen keinen codeWerte-Eintrag in der Vorlage, darum waren "Yes"/"No"
   fest verdrahtet. Default bewusst unveraendert (EN-Erzeuger ruft ohne
   dritten Parameter, exakt dasselbe Verhalten wie vorher) — ein DE-Aufruf
   (baueSektionen(vorlageDe, vorlageDe, {ja:'Ja', nein:'Nein'})) braucht die
   deutschen Werte statt der hart codierten englischen. */
function baueSektionen(vorlageFelderDe, vorlageFelderEn, jaNeinLabels) {
  jaNeinLabels = jaNeinLabels || { ja: 'Yes', nein: 'No' };
  if (vorlageFelderDe.length !== vorlageFelderEn.length) {
    throw new Error('DE/EN-Vorlage haben unterschiedliche Feldzahl: ' + vorlageFelderDe.length + ' vs ' + vorlageFelderEn.length);
  }
  const bereichSektionen = new Map();   // bereich -> Map(sektionId -> {de, en})
  const bereichSektionFelder = new Map(); // bereich -> Map(sektionId -> [{feld, enTexte}])
  const idGesehen = new Map(); // 'bereich.feldId' -> feldname (Kollisionsprüfung)
  const enTexte = {};

  for (let i = 0; i < vorlageFelderDe.length; i++) {
    const fd = vorlageFelderDe[i], fe = vorlageFelderEn[i];
    const bereich = fd.bereich;
    const sekId = sektionId(fd.gruppe);
    if (!bereichSektionen.has(bereich)) bereichSektionen.set(bereich, new Map());
    if (!bereichSektionen.get(bereich).has(sekId)) {
      bereichSektionen.get(bereich).set(sekId, { de: fd.gruppe, en: fe.gruppe });
      enTexte[bereich + '#' + sekId + '.label'] = fe.gruppe;
    }
    if (!bereichSektionFelder.has(bereich)) bereichSektionFelder.set(bereich, new Map());
    if (!bereichSektionFelder.get(bereich).has(sekId)) bereichSektionFelder.get(bereich).set(sekId, []);

    const fId = feldId(fd.feldname);
    const kollisionsSchluessel = bereich + '.' + fId;
    if (idGesehen.has(kollisionsSchluessel) && idGesehen.get(kollisionsSchluessel) !== fd.feldname) {
      throw new Error('Feld-ID-Kollision in ' + bereich + ': ' + fId + ' ("' + idGesehen.get(kollisionsSchluessel) + '" vs. "' + fd.feldname + '")');
    }
    idGesehen.set(kollisionsSchluessel, fd.feldname);

    const typ = mapTyp(fd.feldtyp);
    const feld = { id: fId, typ, label: fd.feldname };
    enTexte[bereich + '.' + fId + '.label'] = fe.feldname;

    if (fd.feldtyp === 'jaNein') {
      feld.optionen = [{ wert: 'ja', label: 'Ja' }, { wert: 'nein', label: 'Nein' }];
      enTexte[bereich + '.' + fId + '/ja.label'] = jaNeinLabels.ja;
      enTexte[bereich + '.' + fId + '/nein.label'] = jaNeinLabels.nein;
    } else if (fd.feldtyp === 'auswahl') {
      feld.optionen = fd.codeWerte.map((o) => ({ wert: o.code, label: o.anzeige }));
      fd.codeWerte.forEach((od, j) => {
        enTexte[bereich + '.' + fId + '/' + od.code + '.label'] = fe.codeWerte[j].anzeige;
      });
    } else if (fd.feldtyp === 'liste') {
      const ufIdGesehen = new Set();
      feld.unterFelder = fd.unterFelder.map((ud, j) => {
        const ue = fe.unterFelder[j];
        const ufId = feldId(ud.feldname);
        if (ufIdGesehen.has(ufId)) {
          throw new Error('UnterFeld-ID-Kollision in ' + bereich + '.' + fId + ': ' + ufId);
        }
        ufIdGesehen.add(ufId);
        const ufTyp = (ud.feldtyp === 'jaNein') ? 'checkbox' : mapTyp(ud.feldtyp);
        enTexte[bereich + '.' + fId + '/' + ufId + '.label'] = ue.feldname;
        return { id: ufId, typ: ufTyp, label: ud.feldname };
      });
    }
    if (fd.pflicht) feld.pflicht = true;

    bereichSektionFelder.get(bereich).get(sekId).push(feld);
  }

  const bereiche = {};
  for (const [bereich, sekMap] of bereichSektionen) {
    bereiche[bereich] = [...sekMap.keys()].map((sekId) => ({
      id: sekId,
      // Deutsches Literal als Rückfall — dieselbe Reihenfolge wie beim Bereich selbst
      // (Satz zuerst, Literal zuletzt), s. `_bereichAusBuendelErzeugen`/
      // `_bereichsErsatzFelderLebendigMachen` im Kern.
      label: sekMap.get(sekId).de,
      felder: bereichSektionFelder.get(bereich).get(sekId),
    }));
  }
  return { bereiche, enTexte };
}

module.exports = { feldId, sektionId, mapTyp, baueSektionen };
