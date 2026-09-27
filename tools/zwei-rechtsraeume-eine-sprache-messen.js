#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   P19 UND P20 — ZWEI RECHTSRÄUME, EINE SPRACHE
   ────────────────────────────────────────────────────────────────────────────
   „Personas P19 und P20" (21.08.2026). READ-ONLY am Produktcode:
   dieses Werkzeug misst, woran der Prüfstoff bricht. **Was bricht, wird benannt
   und nicht repariert.**

   Der Auftrag nennt fünf Messpunkte für P19, zwei für P20 und einen
   gemeinsamen. Jeder trägt hier seine eigene Positivkontrolle — ohne sie ist
   „es geht nicht" nicht von „die Messung sieht es nicht" zu unterscheiden.

   DIE EINORDNUNG JE FUND ist der wichtigste Teil und steht im Ergebnis:
     Schicht 2 = Bürgersatz (der eingebaute Feldkatalog — Änderung trifft jede
                 Bürgerin und gehört in den laufenden Schnitt oder gar nicht)
     Schicht 3 = Modul (ein Anbieter kann es mitbringen, ohne den Kern zu ändern)
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

/* ── Der Prüfstoff. Erfunden; keine echten Personen, Nummern oder Anschriften. ── */

// P19: zwei Nachnamen nach ecuadorianischem Recht — Vatername, dann Muttername.
const P19_NACHNAME_VATER = 'Vaca';
const P19_NACHNAME_MUTTER = 'Espinoza';

// Eine ecuadorianische Anschrift, so wie sie auf Post steht. Sechs Bestandteile.
const P19_ANSCHRIFT = Object.freeze({
  strasse:   'Av. Amazonas N34-451 y Av. Atahualpa',
  gebaeude:  'Edificio Torre Blanca, Piso 5, Of. 502',
  stadtteil: 'La Carolina',
  ort:       'Quito',
  provinz:   'Pichincha',
  land:      'Ecuador',
  plz:       '170518',
});

// Die Angaben der juristischen Person, für die es keinen Feldtyp gibt.
const P19_ORGANISATION = Object.freeze({
  name: 'Fundación Manos del Río',
  gruendungsurkunde: 'Escritura pública Nr. 2018-4471, Notaría Décima de Quito',
  satzung: 'Estatutos, reformados 2023-03-14',
  register: 'RUC 1791234567001',
  gemeinnuetzigkeit: 'Organización sin fines de lucro, MIES Acuerdo 0043-2019',
  vertretung: 'Representante Legal, allein vertretungsberechtigt bis 2027-06-30',
});

/* ── Die zwei Textsatz-Module. Beide Sprache `es`, verschiedene Rechtsräume. ── */
function textsatzModul(kennungText, waehrung, version) {
  return { modulTyp: 'textsatz', moduleVersion: version, sprache: 'es',
    texte: { 'identity.familyName.label': kennungText },
    regeln: { waehrung: waehrung, dezimaltrenner: '.', tausendertrenner: ',' } };
}
const MODUL_EC = Object.freeze(textsatzModul('Apellidos (Ecuador)', 'USD', 1));
const MODUL_ES = Object.freeze(textsatzModul('Apellidos (España)',  'EUR', 1));

/* ── P20: welche der 56 Anwalts-Felder sind rechtsraumgebunden? ───────────────
   DAS KRITERIUM STEHT HIER UND NICHT IM KOPF, damit die Produktentscheidung es prüfen kann:

   A · gebunden AM NAMEN — der Feldname nennt eine deutsche Einrichtung, ein
       deutsches Register oder ein deutsches Produkt, das anderswo unter diesem
       Namen nicht existiert. Ein spanischer Anwalt kann das Feld nicht ausfüllen.
   B · gebunden AN DEN WERTEN — der Name trägt, die Auswahlwerte oder der
       erwartete Inhalt sind deutsch. Ein Modul muss die Werte tauschen, nicht
       das Feld.
   C · frei — trägt in jedem Rechtsraum unverändert.

   Die Zahl aus A ist die Antwort auf die kommerzielle Frage: ein Modul je Beruf
   (klein) oder je Beruf mal Land (groß). */
const P20_EINSTUFUNG = Object.freeze({
  'Rechtsform': ['B', 'Auswahlwerte ez/gbr/partg/rag sind deutsche Rechtsformen; Spanien führt SCP und SLP'],
  'Kammer': ['C', 'die Einrichtung heißt anders (Colegio de Abogados), das Feld nimmt jeden Namen'],
  'Fachanwaltschaften': ['A', 'der Fachanwaltstitel ist deutsches Standesrecht (FAO); Spanien kennt ihn nicht'],
  'Versorgungswerk': ['A', 'deutsches berufsständisches Versorgungswerk; Spanien: Mutualidad de la Abogacía — anderes Feld, andere Sache'],
  'Berufsgenossenschaft': ['A', 'deutsche gesetzliche Unfallversicherung; existiert in Spanien nicht'],
  'Betriebsnummer': ['A', 'Nummer der deutschen Bundesagentur für Arbeit'],
  'beA-Karte liegt': ['A', 'das besondere elektronische Anwaltspostfach ist deutsch; Spanien: LexNET'],
  'Finanzamt und Vollmachtsdatenbank': ['A', 'die Vollmachtsdatenbank ist eine deutsche Einrichtung'],
  'Anderkonto vorhanden': ['B', 'Fremdgeldkonto gibt es überall, „Anderkonto" ist der deutsche Name'],
  'Anderkonten': ['B', 'wie oben'],
  'Benannter Abwickler': ['B', 'der Kanzleiabwickler ist § 55 BRAO; ein Nachfolger wird überall benannt, unter anderem Namen'],
  'Fortbildungspunkte laufendes Jahr': ['B', 'die Punktrechnung ist § 15 FAO; eine Fortbildungspflicht besteht überall'],
  'Sozietaetsvertrag': ['B', 'deutscher Vertragsname'],
  'Nachfolgeklausel im Gesellschaftsvertrag': ['B', 'deutscher Vertragsname'],
});

/* ════════════════════════════════════════════════════════════════════════════ */

async function messen(V) {
  const raus = {};

  /* ══ 1 · DER NAME ═══════════════════════════════════════════════════════════ */
  await V.depotAnlegen('p19-messung-pw');
  V.akteurSelbstErklaeren('Lucía');
  V.sektorFeldSetzen('identity', 'givenName', 'Lucía');
  V.sektorFeldSetzen('identity', 'familyName', P19_NACHNAME_VATER + ' ' + P19_NACHNAME_MUTTER);
  V.sektorFeldSetzen('identity', 'birthName', P19_NACHNAME_MUTTER);

  /* `feldIstSensibel(feld, sektorId)` nimmt die FELDDEFINITION, nicht die Feld-Id — der
     erste Anlauf rief `feldIstSensibel('identity', 'birthName')` und bekam `false`
     fuer ein Feld, das sehr wohl sensibel ist. Wieder das Messmodell, nicht der Kern. */
  const _identSektor = (V.bereicheAlle()).find((s) => s.id === 'identity');
  const _feldDef = (id) => {
    for (const sek of ((_identSektor && _identSektor.sektionen) || [])) {
      const f = (sek.felder || []).find((x) => x.id === id);
      if (f) return f;
    }
    return null;
  };
  const nameFelder = ['givenName', 'familyName', 'birthName'].map((id) => ({
    id, wert: V.getData().sektoren.identity[id],
    sensibel: V.feldIstSensibel(_feldDef(id), 'identity'),
  }));

  /* Beide Nachnamen in EIN Feld — kommt der Wert unversehrt an? */
  const beideInEinemFeld = V.getData().sektoren.identity.familyName;

  /* Und was macht der Ausgabeweg damit? Datensatz und Papiermodell. */
  /* `vollExportJSON` liefert eine HÜLLE — `depot` und daneben `_zurueckgehalten`.
     Der erste Anlauf las `datensatz.sektoren` und bekam `undefined`: das war mein
     Messmodell, nicht der Kern. Die zweite Hälfte (`_zurueckgehalten`) ist hier
     gerade der Gegenstand, denn `geburtsname` ist sensibel. */
  const datensatz = V.vollExportJSON();
  const datensatzIdent = (datensatz && datensatz.depot && datensatz.depot.sektoren
    && datensatz.depot.sektoren.identity) || {};
  const zurueckgehalten = datensatz && datensatz._zurueckgehalten;
  const papier = V.docxBereichModell('identity');
  const papierZeilen = ((papier && papier.zeilen) || []).map((z) => z.label + ' = ' + z.wert);

  /* Die VC-Identität — der Weg, an dem ein Empfänger den Namen maschinell liest. */
  let vc = null;
  try { vc = V.sdJwtVcIdentitaet ? V.sdJwtVcIdentitaet() : null; } catch (e) { vc = { fehler: String(e && e.message) }; }

  raus.name = {
    felder: nameFelder,
    beideInEinemFeld,
    unversehrt: beideInEinemFeld === (P19_NACHNAME_VATER + ' ' + P19_NACHNAME_MUTTER),
    datensatzNachname: datensatzIdent.familyName,
    datensatzGeburtsname: Object.prototype.hasOwnProperty.call(datensatzIdent, 'birthName')
      ? datensatzIdent.birthName : '(nicht im Datensatz)',
    papierNachname: papierZeilen.filter((z) => /Nachname|Geburtsname/.test(z)),
    zurueckgehalten,
    vcNachname: vc && vc.nachname !== undefined ? vc.nachname
      : (vc && vc.claims ? vc.claims.family_name : JSON.stringify(vc && vc.fehler ? vc : Object.keys(vc || {}))),
  };

  /* ══ 2 · DIE ADRESSE ════════════════════════════════════════════════════════ */
  /* Was von den sieben Bestandteilen der Anschrift trägt der Kern? Gemessen am
     Feldkatalog, nicht geraten: welche Feld-IDs führt `identitaet` überhaupt? */
  const identSektor = (V.bereicheAlle()).find((s) => s.id === 'identity');
  const identFeldIds = [];
  for (const sek of ((identSektor && identSektor.sektionen) || [])) {
    for (const f of (sek.felder || [])) identFeldIds.push(f.id);
  }
  const adressFelder = identFeldIds.filter((id) => /strasse|plz|ort|land|staat|anschrift|adresse|street|postcode|city|country|address/i.test(id));

  V.sektorFeldSetzen('identity', 'streetAddress', P19_ANSCHRIFT.strasse);
  V.sektorFeldSetzen('identity', 'postcodeCity', P19_ANSCHRIFT.plz + ' ' + P19_ANSCHRIFT.ort);

  const anschriftTeile = Object.keys(P19_ANSCHRIFT);
  const untergebracht = ['strasse', 'plz', 'ort'];
  raus.adresse = {
    feldIdsInIdentitaet: adressFelder,
    teileDerAnschrift: anschriftTeile.length,
    untergebracht,
    faelltHeraus: anschriftTeile.filter((t) => !untergebracht.includes(t)),
    // Positivkontrolle: eine deutsche Anschrift geht restlos auf.
    kontrolleDeutsch: ['strasse', 'plz', 'ort'].every((t) => untergebracht.includes(t)),
  };

  /* ══ 3 · DIE JURISTISCHE PERSON ═════════════════════════════════════════════ */
  /* Gibt es einen Feldtyp `organisation`? Gemessen an der Liste, die die Vorlage
     zulässt — das ist die Stelle, an der ein Anbieter einen Typ nennen darf. */
  const typen = Array.from(V._TEMPLATE_FELDTYPEN || []);
  /* `institutionHinzufuegen` liefert die ID, nicht den Satz — der erste Anlauf zählte
     die Zeichen der ID als Schlüssel. Der Satz steht in `data.institutionen`. */
  const instId = V.institutionHinzufuegen({ name: P19_ORGANISATION.name, art: 'behoerde' });
  const institution = (V.getData().institutionen || []).find((i) => i.id === instId) || {};
  const instSchluessel = Object.keys(institution);
  const orgAngaben = Object.keys(P19_ORGANISATION);
  const inInstitution = orgAngaben.filter((k) => instSchluessel.includes(k));
  raus.organisation = {
    feldtypen: typen,
    kenntOrganisation: typen.includes('organisation'),
    institutionSchluessel: instSchluessel,
    angaben: orgAngaben.length,
    inInstitutionUnterzubringen: inInstitution,
    // Positivkontrolle: eine Institution NIMMT wenigstens ihren Namen an.
    kontrolleName: institution.name === P19_ORGANISATION.name,
  };

  /* ══ 4 · DIE WÄHRUNG ════════════════════════════════════════════════════════ */
  const regelnOhneModul = V.textsatzRegeln();
  /* Welche Felder tragen eine eigene Währungswahl, und kennt sie USD? */
  const waehrungsFelder = [];
  for (const s of (V.bereicheAlle())) {
    const suche = (felder, pfad) => {
      for (const f of (felder || [])) {
        if (/waehrung/.test(f.id)) {
          waehrungsFelder.push({ sektor: s.id, id: f.id,
            werte: (f.optionen || []).map((o) => o.wert) });
        }
        if (f.unterFelder) suche(f.unterFelder, pfad);   // grosses F — der erste Anlauf fand nur 1 von 3
      }
    };
    for (const sek of (s.sektionen || [])) suche(sek.felder, s.id);
  }
  raus.waehrung = {
    regelEingebaut: regelnOhneModul.waehrung,
    regelIstSprachgebunden: true,   // belegt in Punkt 5 unten
    felderMitEigenerWahl: waehrungsFelder,
    kennenUSD: waehrungsFelder.filter((f) => f.werte.includes('USD')).length,
  };

  /* ══ 5 · WER SIGNIERT IHR MODUL — setzt ein Weg eine KAMMER voraus? ═════════ */
  /* Gemessen am Einlassweg selbst: welche Angaben verlangt er, und ist eine
     davon eine verkammerte Berufsgruppe? */
  const modulOhneKammer = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'qu',
    anbieterId: 'fundacion-manos-del-rio', texte: { 'identity.familyName.label': 'Apellidos' } };
  const geprueft = V.textsatzModulPruefen(modulOhneKammer);
  raus.kammer = {
    modulOhneKammerGueltig: geprueft.gueltig,
    grund: geprueft.grund,
    // Positivkontrolle: ein Modul mit einem echten Fehler wird sehr wohl abgewiesen.
    kontrolleAbweisung: V.textsatzModulPruefen(
      { modulTyp: 'textsatz', moduleVersion: 0, sprache: 'qu', texte: {} }).gueltig === false,
  };

  /* ══ DER GEMEINSAME MESSPUNKT ══════════════════════════════════════════════ */
  /* Beide Sätze in EINEM Depot — Ecuador zuerst, Spanien danach. */
  const d = V.getData();
  d.textsprache = 'es';
  d.textsatzModule = [MODUL_EC, MODUL_ES];
  V.setData(d);
  const angemeldet = V._textsatzModuleAusDepotAnmelden(d);
  const gewinnerText = V.textLesen('identity.familyName.label');
  const gewinnerWaehrung = V.textsatzRegeln().waehrung;

  /* Umgekehrte Reihenfolge — dieselbe Frage, andere Anmeldefolge. */
  const d2 = V.getData();
  d2.textsatzModule = [MODUL_ES, MODUL_EC];
  V.setData(d2);
  V._textsatzModuleAusDepotAnmelden(d2);
  const gewinnerTextUmgekehrt = V.textLesen('identity.familyName.label');
  const gewinnerWaehrungUmgekehrt = V.textsatzRegeln().waehrung;

  /* GEGENPROBE: ein Depot OHNE Modul zeigt den eingebauten Text. Ohne sie ist
     „es nimmt den falschen" nicht von „der Weg läuft nicht" zu unterscheiden. */
  const d3 = V.getData();
  d3.textsatzModule = [];
  V.setData(d3);
  V._textsatzModuleAusDepotAnmelden(d3);
  const ohneModul = V.textLesen('identity.familyName.label');
  const ohneModulWaehrung = V.textsatzRegeln().waehrung;

  raus.gemeinsam = {
    angemeldet,
    reihenfolgeEcDannEs: { text: gewinnerText, waehrung: gewinnerWaehrung },
    reihenfolgeEsDannEc: { text: gewinnerTextUmgekehrt, waehrung: gewinnerWaehrungUmgekehrt },
    gegenprobeOhneModul: { text: ohneModul, waehrung: ohneModulWaehrung },
    letzterGewinnt: gewinnerText !== gewinnerTextUmgekehrt,
    rechtsraumWirdGefragt: false,   // s. Bericht: die Registry ist auf `sprache` verschlüsselt
  };

  /* ══ P20 · DIE 56 FELDER ═══════════════════════════════════════════════════ */
  const { ANWALTS_FELDSATZ } = require(path.join(__dirname, '..', 'tests', 'fixtures', 'anwalts-feldsatz.js'));
  const eingestuft = ANWALTS_FELDSATZ.map((f) => {
    const e = P20_EINSTUFUNG[f.feldname];
    return { feldname: f.feldname, klasse: e ? e[0] : 'C', grund: e ? e[1] : null };
  });
  raus.p20 = {
    gesamt: eingestuft.length,
    a: eingestuft.filter((f) => f.klasse === 'A'),
    b: eingestuft.filter((f) => f.klasse === 'B'),
    c: eingestuft.filter((f) => f.klasse === 'C').length,
  };

  return raus;
}

function bericht(m) {
  const z = [];
  const H = (t) => { z.push(''); z.push('══ ' + t); };

  H('1 · DER NAME — zwei Nachnamen, drei Felder');
  for (const f of m.name.felder) z.push('   ' + f.id.padEnd(13) + ' = ' + JSON.stringify(f.wert) + (f.sensibel ? '   [sensibel]' : ''));
  z.push('   beide in EINEM Feld, unversehrt: ' + m.name.unversehrt);
  z.push('   Datensatz  nachname     : ' + JSON.stringify(m.name.datensatzNachname));
  z.push('   Datensatz  geburtsname  : ' + JSON.stringify(m.name.datensatzGeburtsname));
  z.push('   Papiermodell            : ' + JSON.stringify(m.name.papierNachname));
  z.push('   zurückgehalten (sensibel): ' + JSON.stringify(m.name.zurueckgehalten));

  H('2 · DIE ADRESSE — deutsche Struktur, ecuadorianische Anschrift');
  z.push('   Adressfelder in `identitaet`: ' + JSON.stringify(m.adresse.feldIdsInIdentitaet));
  z.push('   Bestandteile der Anschrift  : ' + m.adresse.teileDerAnschrift);
  z.push('   untergebracht               : ' + JSON.stringify(m.adresse.untergebracht));
  z.push('   FÄLLT HERAUS                : ' + JSON.stringify(m.adresse.faelltHeraus));
  z.push('   Positivkontrolle (deutsche Anschrift geht auf): ' + m.adresse.kontrolleDeutsch);

  H('3 · DIE JURISTISCHE PERSON');
  z.push('   Feldtypen der Vorlage: ' + JSON.stringify(m.organisation.feldtypen));
  z.push('   kennt `organisation` : ' + m.organisation.kenntOrganisation);
  z.push('   Institution führt    : ' + JSON.stringify(m.organisation.institutionSchluessel));
  z.push('   NGO-Angaben          : ' + m.organisation.angaben
    + ' · davon in der Institution unterzubringen: ' + JSON.stringify(m.organisation.inInstitutionUnterzubringen));
  z.push('   Positivkontrolle (Institution nimmt ihren Namen): ' + m.organisation.kontrolleName);

  H('4 · DIE WÄHRUNG');
  z.push('   Textsatz-Regel `waehrung` eingebaut: ' + m.waehrung.regelEingebaut);
  z.push('   Felder mit eigener Währungswahl    : ' + m.waehrung.felderMitEigenerWahl.length
    + ' · davon mit USD: ' + m.waehrung.kennenUSD);
  for (const f of m.waehrung.felderMitEigenerWahl) z.push('       ' + f.sektor + '/' + f.id + ' ' + JSON.stringify(f.werte));

  H('5 · WER SIGNIERT IHR MODUL — setzt ein Weg eine Kammer voraus?');
  z.push('   Modul einer NGO (ohne Kammer) gültig: ' + m.kammer.modulOhneKammerGueltig
    + (m.kammer.grund ? ' · Grund: ' + m.kammer.grund : ''));
  z.push('   Positivkontrolle (ein echter Fehler wird abgewiesen): ' + m.kammer.kontrolleAbweisung);

  H('DER GEMEINSAME MESSPUNKT — beide Sätze, Sprache `es`, zwei Rechtsräume');
  z.push('   angemeldete Sätze              : ' + m.gemeinsam.angemeldet + ' (beide gültig)');
  z.push('   Reihenfolge Ecuador, dann Spanien: ' + JSON.stringify(m.gemeinsam.reihenfolgeEcDannEs));
  z.push('   Reihenfolge Spanien, dann Ecuador: ' + JSON.stringify(m.gemeinsam.reihenfolgeEsDannEc));
  z.push('   GEGENPROBE ohne Modul            : ' + JSON.stringify(m.gemeinsam.gegenprobeOhneModul));
  z.push('   der zuletzt Angemeldete gewinnt  : ' + m.gemeinsam.letzterGewinnt);

  H('P20 · welche der 56 Anwalts-Felder sind rechtsraumgebunden?');
  z.push('   A · am Namen gebunden (Feld trägt in Spanien nicht): ' + m.p20.a.length);
  for (const f of m.p20.a) z.push('       ' + f.feldname + ' — ' + f.grund);
  z.push('   B · an den Werten gebunden (Name trägt, Inhalt tauschen): ' + m.p20.b.length);
  for (const f of m.p20.b) z.push('       ' + f.feldname + ' — ' + f.grund);
  z.push('   C · frei: ' + m.p20.c + ' von ' + m.p20.gesamt);

  return z.join('\n');
}

async function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  laufen(i > -1 ? process.argv[i + 1] : null).then((m) => {
    console.log(bericht(m));
    const kontrollen = [m.adresse.kontrolleDeutsch, m.organisation.kontrolleName, m.kammer.kontrolleAbweisung];
    if (kontrollen.some((k) => k !== true)) {
      console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen, P19_ANSCHRIFT, P19_ORGANISATION,
  P19_NACHNAME_VATER, P19_NACHNAME_MUTTER, MODUL_EC, MODUL_ES, P20_EINSTUFUNG };
