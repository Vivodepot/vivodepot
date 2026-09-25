#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 3 · DER MENSCH OHNE PAPIERE
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 3.
   Grundlage: interner Ableitungsentwurf „Einwanderung" vom 18.08.2026.
   **Zielgruppe, nicht Exotik.**

   Geflüchtet. Kein Ausweis, kein Meldeschein, Geburtsdatum geschätzt, Name in
   zwei Schreibweisen.

   DIE FRAGE: **Verlangt die Anwendung irgendwo etwas, das es nicht gibt?** Ein
   Pflichtfeld, eine Prüfziffer, ein Datum, das nicht leer bleiben darf, ein
   Wächter, der ohne Ausweis anschlägt.

   DIE ANTWORT IST ZWEIGETEILT, und die Teilung ist der Befund:
   **Das Datenmodell verlangt fast nichts** — zwei Pflicht-Unterfelder im ganzen
   eingebauten Katalog, beide in einer Liste, die man nicht anlegen muss; keine
   Prüfziffer sperrt; kein Prüfstein schlägt ohne Ausweis an.
   **Die EINGABEMASKE verlangt sehr wohl etwas, das es nicht gibt:** ein
   `datum`-Feld wird als `<input type="date">` gezeichnet und nimmt nur ein
   vollständiges, gültiges Datum. **Ein geschätztes Geburtsjahr läßt sich nicht
   eintragen** — und ein von anderswo mitgebrachter ungenauer Wert steht zwar
   im Depot, die Maske zeigt ihn aber LEER an.

   Das ist die scharfe Klasse: nicht „das Modell verbietet es", sondern „das
   Modell erlaubt es und die Oberfläche kann es nicht zeigen".
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const UNGENAUE_DATEN = Object.freeze(['1990', 'ca. 1990', '1990-00-00', 'um 1990 herum']);
const NAME_SCHREIBWEISE_A = 'Amina Cheikh';
const NAME_SCHREIBWEISE_B = 'Amine Shaikh';   // dieselbe Person, andere Transkription

function messen(V) {
  const raus = {};

  /* ══ 1 · WAS VERLANGT DAS MODELL? ═════════════════════════════════════════ */
  const pflicht = [];
  for (const s of (V.bereicheAlle())) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.pflicht) pflicht.push(s.id + '/' + f.id);
        for (const u of (f.unterFelder || [])) {
          if (u.pflicht) pflicht.push(s.id + '/' + f.id + '/' + u.id);
        }
      }
    }
  }
  raus.pflichtfelder = pflicht;

  /* ══ 2 · DAS GESCHÄTZTE GEBURTSDATUM ══════════════════════════════════════ */
  const feld = { id: 'birthDate', typ: 'datum', keineZukunft: true, datumJahrMin: 1900 };
  raus.datum = { imModell: [], maske: null, maskeGut: null };
  for (const w of UNGENAUE_DATEN) {
    let angenommen = true, meldung = null;
    try { V.sektorFeldSetzen('identity', 'birthDate', w); }
    catch (e) { angenommen = false; meldung = e.message; }
    raus.datum.imModell.push({ wert: w, angenommen,
      gespeichert: V.getData().sektoren.identity.birthDate, meldung });
  }
  /* DIE MASKE, gemessen am gerenderten HTML — nicht am Element-Objekt. */
  raus.datum.maske = V.feldInputHTML(feld, 'ca. 1990');
  raus.datum.maskeGut = V.feldInputHTML(feld, '1990-01-01');
  raus.datum.istDateInput = /type="date"/.test(raus.datum.maske);
  /* Und die Aussage, die der Browser dazu macht (dort gemessen, hier nur
     festgehalten): `<input type="date" value="ca. 1990">` zeigt LEER, ein
     gültiges Datum zeigt sich. Die Positivkontrolle ist das zweite HTML. */

  /* ══ 3 · DER NAME IN ZWEI SCHREIBWEISEN ═══════════════════════════════════ */
  const identSektor = (V.bereicheAlle()).find((s) => s.id === 'identity');
  const fn = (identSektor.sektionen || []).flatMap((k) => k.felder || [])
    .find((f) => f.id === 'formerNames');
  const anlass = (fn.unterFelder || []).find((u) => u.id === 'reason');
  V.sektorFeldSetzen('identity', 'familyName', NAME_SCHREIBWEISE_A);
  /* Listen werden über `listenEintragHinzufuegen` geschrieben, nicht über
     `sektorFeldSetzen` — U2-ADR-104, und der Kern sagt es beim Versuch deutlich.
     (Der erste Anlauf schrieb direkt und bekam die Meldung. Gut so: das ist
     genau die Auffälligkeit, die diese Werkzeuge brauchen.) */
  V.listenEintragHinzufuegen('identity', 'formerNames',
    { name: NAME_SCHREIBWEISE_B, reason: 'sonstiges',
      proofStorageLocation: 'so steht es auf dem Zeugnis aus dem Herkunftsland' });
  raus.name = {
    listeVorhanden: !!fn,
    unterfelder: (fn.unterFelder || []).map((u) => u.id),
    anlassOptionen: (anlass.optionen || []).map((o) => o.wert),
    kenntTranskription: (anlass.optionen || []).some((o) => /transkript|schreibweise|umschrift/.test(o.wert)),
    gespeichert: V.getData().sektoren.identity.formerNames,
    gefuehrtBisPflicht: !!(fn.unterFelder || []).find((u) => u.id === 'usedUntil' && u.pflicht),
  };

  /* ══ 4 · PRÜFZIFFERN — sagen sie oder sperren sie? ════════════════════════ */
  raus.pruefziffer = {
    unsinn: V.pruefzifferHinweis('finance', 'accounts', 'DE00 0000 0000 0000 0000 00', 'iban'),
    /* POSITIVKONTROLLE: eine formal richtige IBAN erzeugt KEINEN Hinweis —
       sonst meldete der Prüfer immer und sagte nichts. */
    gut: V.pruefzifferHinweis('finance', 'accounts', 'DE89 3704 0044 0532 0130 00', 'iban'),
  };

  /* ══ 5 · SCHLÄGT EIN PRÜFSTEIN OHNE AUSWEIS AN? ══════════════════════════ */
  raus.pruefsteine = (identSektor.standardDokumente || []).map((p) => ({
    typ: p.typ,
    haengtAn: (p.felder || []).map((f) => f.feldId),
    rhythmusMonate: p.empfRhythmusMonate,
    /* Aus der Grundlage, Abschnitt 3a: kennt das Prüfblatt einen VORLAUF —
       „drei Monate vor Ablauf verlängern" — oder nur den Ablauftag? */
    kenntVorlauf: Object.keys(p).some((k) => /vorlauf/i.test(k)),
  }));

  /* ══ 6 · EIN DEPOT GANZ OHNE PAPIERE — trägt es? ═════════════════════════ */
  const leer = V.getData();
  raus.ohnePapiere = {
    ausweisFelderLeer: ['idDocuments', 'residencePermit', 'residencePermitType']
      .every((id) => leer.sektoren.identity[id] === undefined),
    datensatzEntsteht: !!V.vollExportJSON(),
    papierEntsteht: (V.docxBereichModell('identity').zeilen || []).length > 0,
  };

  return raus;
}

function bericht(m) {
  const z = [];
  z.push('══ 1 · WAS VERLANGT DAS MODELL?');
  z.push('   Pflichtfelder im ganzen eingebauten Katalog: ' + m.pflichtfelder.length);
  for (const p of m.pflichtfelder) z.push('       ' + p);

  z.push('');
  z.push('══ 2 · DAS GESCHÄTZTE GEBURTSDATUM');
  for (const d of m.datum.imModell) {
    z.push('   Modell nimmt ' + JSON.stringify(d.wert).padEnd(18) + ' → gespeichert '
      + JSON.stringify(d.gespeichert) + (d.meldung ? '  WARF: ' + d.meldung : ''));
  }
  z.push('   Die Maske ist ein `type="date"`: ' + m.datum.istDateInput);
  z.push('       ' + m.datum.maske);
  z.push('   POSITIVKONTROLLE, gültiges Datum:');
  z.push('       ' + m.datum.maskeGut);

  z.push('');
  z.push('══ 3 · DER NAME IN ZWEI SCHREIBWEISEN');
  z.push('   Liste `fruehere_namen` vorhanden: ' + m.name.listeVorhanden
    + ' · Unterfelder: ' + JSON.stringify(m.name.unterfelder));
  z.push('   Anlässe: ' + JSON.stringify(m.name.anlassOptionen));
  z.push('   kennt eine Transkription/Schreibweise: ' + m.name.kenntTranskription);
  z.push('   `gefuehrt_bis` ist Pflicht: ' + m.name.gefuehrtBisPflicht);
  z.push('   eingetragen: ' + JSON.stringify(m.name.gespeichert));

  z.push('');
  z.push('══ 4 · PRÜFZIFFERN');
  z.push('   Unsinns-IBAN → ' + JSON.stringify(m.pruefziffer.unsinn));
  z.push('   POSITIVKONTROLLE, gültige IBAN → ' + JSON.stringify(m.pruefziffer.gut));

  z.push('');
  z.push('══ 5 · PRÜFSTEINE OHNE AUSWEIS');
  for (const p of m.pruefsteine) {
    z.push('   ' + p.typ.padEnd(18) + ' hängt an ' + JSON.stringify(p.haengtAn)
      + ' · Rhythmus: ' + p.rhythmusMonate + ' · kennt Vorlauf: ' + p.kenntVorlauf);
  }

  z.push('');
  z.push('══ 6 · EIN DEPOT GANZ OHNE PAPIERE');
  z.push('   alle Ausweisfelder leer: ' + m.ohnePapiere.ausweisFelderLeer);
  z.push('   Datensatz entsteht     : ' + m.ohnePapiere.datensatzEntsteht);
  z.push('   Papierblatt entsteht   : ' + m.ohnePapiere.papierEntsteht);
  return z.join('\n');
}

async function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  await V.depotAnlegen('mensch-ohne-papiere-pw');
  V.akteurSelbstErklaeren('Amina');
  return messen(V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  laufen(i > -1 ? process.argv[i + 1] : null).then((m) => {
    console.log(bericht(m));
    if (m.pruefziffer.gut !== null || !/value="1990-01-01"/.test(m.datum.maskeGut)) {
      console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen, UNGENAUE_DATEN, NAME_SCHREIBWEISE_A, NAME_SCHREIBWEISE_B };
