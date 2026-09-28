'use strict';
/* Die Texte der Festlegungen der Patientenverfügung als Feld-Kennungen (U2-ADR-440, 27.09.2026).
   Seit U2-ADR-440 sind die Schritte des Assistenten zur Patientenverfügung auch Felder im Bereich Vorsorge
   (`advanceCare.<id>`). Ihr Wortlaut steht aber schon im Satz des Assistenten (`wizard:pvwiz.<id>.label`,
   `wizard:pvwiz.<id>/<wert>.label`), bei den Optionen als amtlicher Wortlaut des BMJ.
   Diese Funktion ERFINDET KEINEN TEXT: sie liest je Sprachmodul die Kennung des Assistenten und legt denselben
   Wortlaut unter die Feld-Kennung. Beide Erzeuger (tools/textsatz-de-modul-erzeugen.js,
   tools/textsatz-en-modul-erzeugen.js) rufen sie auf; so gibt es weiter nur eine gepflegte Fassung.
   Probe: tests/pv-festlegungen-kennungen.test.js "[PV·Textsatz]". */

function pvFestlegungenTexte(texte, pvIds) {
  const raus = {};
  const fehlend = [];
  for (const id of pvIds) {
    const quelle = 'wizard:pvwiz.' + id + '.label';
    if (typeof texte[quelle] !== 'string') { fehlend.push(quelle); continue; }
    raus['advanceCare.' + id + '.label'] = texte[quelle];
    const praefix = 'wizard:pvwiz.' + id + '/';
    for (const k of Object.keys(texte)) {
      if (!k.startsWith(praefix) || !k.endsWith('.label')) continue;
      const wert = k.slice(praefix.length, -'.label'.length);
      if (!wert || wert.includes('.') || wert.includes('/')) continue;
      raus['advanceCare.' + id + '/' + wert + '.label'] = texte[k];
    }
  }
  if (fehlend.length) {
    throw new Error('pv-festlegungen-textsatz: dem Sprachmodul fehlt der Wortlaut des Assistenten für '
      + fehlend.length + ' Festlegung(en) — nicht raten: ' + fehlend.slice(0, 5).join(', '));
  }
  return raus;
}

/* Die Ids der Festlegungen, aus dem Kern gelesen (PV_BMJ.steps) — keine eigene Liste. */
function pvFestlegungenIds(V) {
  return V.PV_BMJ.steps.map((st) => st && st.feld && st.feld.id).filter((id) => typeof id === 'string');
}

/* Weicht ein Modul ab? Liefert die Kennungen, deren Wert nicht dem Wortlaut des Assistenten entspricht oder fehlt. */
function pvFestlegungenAbweichungen(texte, pvIds) {
  const soll = pvFestlegungenTexte(texte, pvIds);
  return Object.keys(soll).filter((k) => texte[k] !== soll[k]);
}

/* Ein laufender Bereich ohne die Sektionen, die der Kern selbst ableitet (jedes Feld trägt das nicht aufzählbare Merkmal
   `pvBmjAbgeleitet`). Für Vergleiche „deklarierte Moduldatei gegen laufenden Bereich": die Datei trägt die abgeleitete Sektion
   nie, der Kern fügt sie beim Start hinzu. Erkannt am Merkmal, nicht am Namen — eine von Hand eingefügte Sektion bleibt stehen. */
function ohneAbgeleiteteSektionen(sektor) {
  if (!sektor || !Array.isArray(sektor.sektionen)) return sektor;
  const abgeleitet = (sek) => Array.isArray(sek && sek.felder) && sek.felder.length > 0
    && sek.felder.every((f) => { const d = Object.getOwnPropertyDescriptor(f, 'pvBmjAbgeleitet'); return !!d && d.value === true; });
  if (!sektor.sektionen.some(abgeleitet)) return sektor;
  // Flache Kopie mit ausgewerteten Gettern (Beschriftungen): Bereiche aus Modulen tragen eingefrorene, nicht umdefinierbare Eigenschaften.
  return Object.assign({}, sektor, { sektionen: sektor.sektionen.filter((sek) => !abgeleitet(sek)) });
}

module.exports = { pvFestlegungenTexte, pvFestlegungenIds, pvFestlegungenAbweichungen, ohneAbgeleiteteSektionen };
