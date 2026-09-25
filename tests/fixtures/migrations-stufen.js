'use strict';
/* ════════════════════════════════════════════════════════════════════════
   migrations-stufen.js — je Schema-Sprung ein Eintrag, EIN Gerüst für alle
   ────────────────────────────────────────────────────────────────────────
   WARUM DIESE DATEI (26.07.2026): Die Kette 24 → 41 ist achtzehn Stufen lang, und
   die Mehrzahl war ungeprüft — ein Depot migrierte über zehn Stufen, ohne dass eine
   Probe den Weg belegte. Achtzehn einzeln geschriebene Tests hätten achtzehnmal
   dasselbe Gerüst getragen und die neunzehnte Stufe wieder teuer gemacht.

   DIE GEKOPPELTE KONTROLLE STECKT IN DER FORM, nicht in einem Zusatz-Test: jeder
   Eintrag nennt `vorher` UND `nachher`. `vorher` muss auf dem konstruierten Alt-Depot
   WAHR sein (der Alt-Zustand liegt wirklich vor) und `nachher` FALSCH — nach der
   Migration umgekehrt. Fiele die Stufe aus, wäre der Zustand danach derselbe wie
   davor, und die Probe würde rot. Ein Eintrag, dessen `vorher` schon auf dem
   Alt-Depot falsch ist, prüft nichts und fällt selbst auf (Vakuum-Wächter unten).

   `geprueftIn` statt `baue`: die Stufe hat bereits eine eigene, ausführliche
   Testdatei. Der Eintrag hält die Deckung sichtbar, ohne sie zu verdoppeln.

   ALLE DEPOTS SIND KONSTRUIERT. Reale Alt-Depots gibt es nicht (migrationsfreies
   Fenster, U2-ADR-100 §8) — was hier läuft, ist die Migration gegen gebaute Fälle,
   nicht gegen Bestand. Das ist die Grenze dieser Prüfung und steht so auch im Bericht.
   ════════════════════════════════════════════════════════════════════════ */

// Minimales, gültiges Depot auf einer Ausgangsversion. Alles Weitere setzt der Eintrag.
function basis(version, sektoren, extra) {
  return Object.assign({
    schemaVersion: version,
    sektoren: sektoren || {},
    menschen: [{ id: 'p1', name: 'Maria Mustermann' }],
    verwalteteDepots: [],
  }, extra || {});
}
const sek = (id, felder) => ({ [id]: felder });
/* Loest einen Institutions-Verweis auf seinen Anzeigenamen auf — dieselbe Reihenfolge wie
   `institutionName` im Kern (override > Register-Eintrag), nur ohne Modul-Zustand, weil die
   Proben hier auf blanken Datenobjekten laufen. Gebraucht seit Stufe 43 (C10). */
const instName = (d, r) => {
  if (r == null) return undefined;
  if (typeof r === 'string') return r;
  if (typeof r.override === 'string' && r.override) return r.override;
  return ((d.institutionen || []).find((i) => i.id === r.ref) || {}).name;
};

/* ── Die achtzehn Stufen ──────────────────────────────────────────────────── */
const STUFEN = [
  { nach: 24, was: 'feldDefinitionen[] wird angelegt; mappe-Einträge bekommen autoritativ=false',
    baue: () => basis(23, {}, { mappe: [{ id: 'm1', titel: 'Testament' }] }),
    vorher:  (d) => !Array.isArray(d.feldDefinitionen) && d.mappe[0].autoritativ === undefined,
    nachher: (d) => Array.isArray(d.feldDefinitionen) && d.mappe[0].autoritativ === false },

  { nach: 25, was: 'impfungen/implantate: codierter Wert → reiner Anzeigename (Stub-Slots entfielen)',
    baue: () => basis(24, sek('gesundheit', {
      impfungen:  { anzeigeName: 'Tetanus 2022', system: 'http://x', code: 'T1' },
      implantate: { anzeigeName: 'Hüft-TEP', system: 'http://x', code: 'H1' },
    })),
    vorher:  (d) => typeof d.sektoren.gesundheit.impfungen === 'object',
    nachher: (d) => d.sektoren.health.vaccinations === 'Tetanus 2022'
                 && d.sektoren.health.implantsProsthesesPacemakers === 'Hüft-TEP',
    /* BENANNTER, GEZAEHLTER VERLUST — die einzige Stufe der Kette, die etwas fallen laesst.
       Der ANZEIGENAME ueberlebt (das ist der Buergerwert); `system`/`code` fallen weg, weil
       genau das die Aufgabe dieser Stufe ist: die Stub-Code-Slots von impfungen/implantate
       entfielen mit E1–E3. Ein Terminologie-Code an einem Slot, den es nicht mehr gibt, ist
       kein Buergerwert. Ohne diese Ausnahme waere die Verwaisungs-Pruefung hier dauerhaft rot
       — MIT ihr bleibt sie fuer jede andere Stufe scharf. */
    erlaubterVerlust: { werte: ['http://x', 'T1', 'H1'],
      grund: 'Stub-Code-Slots (system/code) entfielen mit E1–E3; der Anzeigename bleibt' } },

  { nach: 26, was: 'data.codeListen[] wird angelegt (mitgereiste Template-Code-Listen)',
    baue: () => basis(25),
    vorher:  (d) => !Array.isArray(d.codeListen),
    nachher: (d) => Array.isArray(d.codeListen) },

  /* F5 Zug 2 (21.08.2026): die Stufe defaultete bis dahin ZWEI Felder. `angehoerigenCache` ist
     mit der Abschrift entfallen — und zwar HIER und nicht nur in Stufe 73: die Messung vom
     21.08. hat gezeigt, dass diese Stufe das Feld bei jedem Laden sofort wieder anlegte, ein
     Weglassen im Grundgeruest allein also wirkungslos gewesen waere. Der Ort-Hinweis bleibt. */
  { nach: 27, was: 'angehoerigen_passwort_ort defaultet',
    baue: () => basis(26),
    vorher:  (d) => typeof d.angehoerigen_passwort_ort !== 'string',
    nachher: (d) => d.angehoerigen_passwort_ort === '' },

  /* UEBERFLUESSIG — gemessen, nicht vermutet (26.07.2026, Unterscheidung).
     „Nicht eigenstaendig beobachtbar" zerfaellt in ZWEI Faelle, und nur einer ist harmlos:
     entweder ist die Stufe UEBERFLUESSIG (die Folgestufe taete dasselbe), oder sie ist
     TRAGEND ABER UNGESCHUETZT (die Folgestufe SETZT VORAUS, dass sie lief) — der zweite Fall
     waere gefaehrlich: etwas, das traegt, das aber niemand rot macht, wenn es kaputtgeht.

     GEMESSEN, mit Positivkontrolle: ein Depot, das als Schema 28 deklariert ist, aber noch die
     VOR-28-Form traegt (String), laeuft an Stufe 28 vorbei — Stufe 29 bekommt den String direkt.
     Ergebnis identisch zum Lauf ab 27. Stufe 29 traegt den String→Array-Zweig selbst:
       `Array.isArray(vollmachtsGrundlage) ? … : (String → [String])`
     Also: UEBERFLUESSIG, der harmlose Fall. Kein Handlungsbedarf, aber auch keine Schuld.
     Die Unterscheidung ist als PROBE festgenagelt (`vorbeiAnStufe`), nicht als Kommentar:
     macht jemand Stufe 29 spaeter von 28 abhaengig, wird sie rot. */
  { nach: 28, was: 'vorsorge/vollmachtsGrundlage: String → Array (mehrfachauswahl)',
    nichtPruefbar: 'UEBERFLUESSIG (gemessen): Stufe 29 traegt denselben String→Array-Zweig selbst '
                 + 'und loescht das Feld. Ein Depot, das an Stufe 28 vorbeilaeuft, kommt am selben '
                 + 'Ergebnis an — belegt durch die Probe `vorbeiAnStufe` unten.',
    vorbeiAnStufe: {
      // Derselbe Ausgangszustand, einmal VOR und einmal AB der Stufe deklariert.
      mit:  () => basis(27, sek('vorsorge', { vollmachtsGrundlage: 'Vorsorgevollmacht',
              vollmacht_person: { ref: 'p1', override: '' }, vollmacht_ort: 'Ordner Vorsorge' })),
      ohne: () => basis(28, sek('vorsorge', { vollmachtsGrundlage: 'Vorsorgevollmacht',
              vollmacht_person: { ref: 'p1', override: '' }, vollmacht_ort: 'Ordner Vorsorge' })),
    } },

  { nach: 29, was: 'Vollmacht-Flachfelder → liste-Record vorsorge/vollmachten',
    baue: () => basis(28, sek('vorsorge', {
      vollmachtsGrundlage: ['Vorsorgevollmacht'],
      vollmacht_person: { ref: 'p1', override: '' },
      vollmacht_ort: 'Ordner Vorsorge',
    })),
    vorher:  (d) => !Array.isArray(d.sektoren.vorsorge.vollmachten) && d.sektoren.vorsorge.vollmacht_ort === 'Ordner Vorsorge',
    nachher: (d) => Array.isArray(d.sektoren.advanceCare.provisionInstruments)   // Stufe 39 zieht weiter
                 && d.sektoren.advanceCare.provisionInstruments.some(r => r.storageLocation === 'Ordner Vorsorge')
                 && d.sektoren.advanceCare.vollmacht_ort === undefined },

  { nach: 30, was: 'bevollmaechtigter im Vollmacht-Record → refMehrfach (Array)',
    baue: () => basis(29, sek('vorsorge', {
      vollmachten: [{ art: 'Vorsorgevollmacht', bevollmaechtigter: { ref: 'p1', override: '' } }],
    })),
    vorher:  (d) => !Array.isArray(d.sektoren.vorsorge.vollmachten[0].bevollmaechtigter),
    nachher: (d) => Array.isArray(d.sektoren.advanceCare.provisionInstruments[0].authorizedPersons)
                 && d.sektoren.advanceCare.provisionInstruments[0].authorizedPersons[0].ref === 'p1' },

  { nach: 31, was: 'vorsorge/erben wird refMehrfach (Array {ref,override})',
    baue: () => basis(30, sek('vorsorge', { erben: { ref: 'p1', override: '' } })),
    vorher:  (d) => !Array.isArray(d.sektoren.vorsorge.erben),
    nachher: (d) => Array.isArray(d.sektoren.advanceCare.heirsBriefOverview) && d.sektoren.advanceCare.heirsBriefOverview[0].ref === 'p1' },

  { nach: 32, was: 'jeder Vollmacht-Record bekommt eine stabile id',
    baue: () => basis(31, sek('vorsorge', { vollmachten: [{ art: 'Vorsorgevollmacht', ort: 'Tresor' }] })),
    vorher:  (d) => !d.sektoren.vorsorge.vollmachten[0].id,
    nachher: (d) => {
      const r = d.sektoren.advanceCare.provisionInstruments.find(x => x.storageLocation === 'Tresor');
      return !!(r && typeof r.id === 'string' && r.id.length > 10);
    } },

  { nach: 33, was: 'gesundheit/hauptpflegeperson ref → refMehrfach',
    baue: () => basis(32, sek('gesundheit', { hauptpflegeperson: { ref: 'p1', override: '' } })),
    vorher:  (d) => !Array.isArray(d.sektoren.gesundheit.hauptpflegeperson),
    nachher: (d) => Array.isArray(d.sektoren.health.emergencyContacts)
                 && d.sektoren.health.emergencyContacts[0].ref === 'p1' },

  { nach: 34, was: 'facharzt_1/2/3 (drei Skalar-Slots) → EINE fachaerzte-Liste',
    baue: () => basis(33, sek('gesundheit', {
      facharzt_1: { ref: '', override: 'Dr. Meier' },
      facharzt_3: { ref: '', override: 'Dr. Schulz' },
    })),
    vorher:  (d) => !Array.isArray(d.sektoren.gesundheit.fachaerzte) && 'facharzt_1' in d.sektoren.gesundheit,
    nachher: (d) => Array.isArray(d.sektoren.health.specialistDoctors)
                 && d.sektoren.health.specialistDoctors.length === 2
                 && !('facharzt_1' in d.sektoren.health) },

  { nach: 35, was: 'fünf Slot-Gruppen → je eine liste (fahrzeuge, kreditkarten, haustiere, briefe, weitere_wohnungen)',
    baue: () => basis(34, {
      mobilitaet:    { auto1: 'VW Golf', auto1_ausweis: 'Handschuhfach' },
      finanzen:      { kreditkarte1: 'Visa Sparkasse' },
      identitaet:    { tier_name: 'Felix, Katze', tier_tierarzt: 'Dr. Vet' },
      persoenliches: { brief_1: 'Liebe Anna, …' },
      wohnen:        { zw_strasse: 'Seestraße 12', zw_plz_ort: '83209 Prien' },
    }),
    vorher:  (d) => 'auto1' in d.sektoren.mobilitaet && !Array.isArray(d.sektoren.mobilitaet.fahrzeuge),
    nachher: (d) => d.sektoren.mobility.vehicles[0].registrationPlate === 'VW Golf'
                 && !('auto1' in d.sektoren.mobility)
                 && d.sektoren.finance.creditCards[0].providerLast4Digits === 'Visa Sparkasse'
                 && d.sektoren.identity.pets[0].petNameSpecies === 'Felix, Katze'
                 && d.sektoren.personal.personalLettersWordsToPeople[0].words === 'Liebe Anna, …'
                 && d.sektoren.housing.furtherHomes[0].streetHouseNumber === 'Seestraße 12' },

  { nach: 36, was: 'persoenliches/abhaengige_personen: Freitext → ein Listen-Eintrag {wer}',
    baue: () => basis(35, sek('persoenliches', { abhaengige_personen: 'meine Mutter, 84' })),
    vorher:  (d) => typeof d.sektoren.persoenliches.abhaengige_personen === 'string',
    nachher: (d) => Array.isArray(d.sektoren.personal.whoDependsOnMe)
                 && d.sektoren.personal.whoDependsOnMe[0].whoDependsOnYou === 'meine Mutter, 84' },

  { nach: 37, was: 'konto_haupt_bank/-iban (zwei Skalare) → ein konten-Listen-Eintrag',
    baue: () => basis(36, sek('finanzen', { konto_haupt_bank: 'Sparkasse', konto_haupt_iban: 'DE89 3704 0044 0532 0130 00' })),
    vorher:  (d) => !Array.isArray(d.sektoren.finanzen.konten) && 'konto_haupt_bank' in d.sektoren.finanzen,
    /* C10 (29.07.2026): `bank` ist seit Stufe 43 eine Institutions-Referenz. Diese Zusage wird
       am ENDE der Kette geprueft, nicht direkt nach Stufe 37 — ein Depot aus 36 laeuft durch
       beide Stufen. Sie lautet darum „der Wert ist auffindbar", nicht „der String steht da";
       `iban` bleibt Freitext und bleibt woertlich. */
    nachher: (d) => instName(d, d.sektoren.finance.accounts[0].institution) === 'Sparkasse'
                 && d.sektoren.finance.accounts[0].iban === 'DE89 3704 0044 0532 0130 00'
                 && !('konto_haupt_bank' in d.sektoren.finance) },

  { nach: 38, was: 'allergien/medikamente/krankheiten: Skalar → Chip-Array',
    baue: () => basis(37, sek('gesundheit', {
      allergien: 'Penicillin',
      krankheiten: { anzeigeName: 'Diabetes Typ 2', system: 'http://icd10', code: 'E11' },
    })),
    vorher:  (d) => typeof d.sektoren.gesundheit.allergien === 'string',
    nachher: (d) => Array.isArray(d.sektoren.health.allergiesMedicationFoodOther)
                 && d.sektoren.health.allergiesMedicationFoodOther[0].text === 'Penicillin'
                 && d.sektoren.health.chronicConditionsDiagnoses[0].code.code === 'E11' },

  { nach: 39, was: 'vollmachten → vorsorge_instrumente mit typ=vorsorgevollmacht',
    baue: () => basis(38, sek('vorsorge', {
      vollmachten: [{ id: 'v1', art: 'Vorsorgevollmacht', ort: 'Tresor' }],
    })),
    vorher:  (d) => Array.isArray(d.sektoren.vorsorge.vollmachten) && !d.sektoren.vorsorge.vorsorge_instrumente,
    nachher: (d) => !d.sektoren.advanceCare.vollmachten
                 && d.sektoren.advanceCare.provisionInstruments[0].instrument === 'enduring-power-of-attorney'
                 && d.sektoren.advanceCare.provisionInstruments[0].storageLocation === 'Tresor' },

  { nach: 40, was: 'ki_*-Flachfelder aus verwaltung → Instrument-Zeile ki-verfuegung (mit Kollisions-Notiz)',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/migration-40-ki-ort.test.js. */
    baue: () => basis(39, { verwaltung: { bundid_status: 'hoch', ki_grundentscheidung: 'erlaubnis',
      ki_zweck: ['erinnerung', 'trauer'], ki_raum: 'privat', ki_nachlassverwaltung: 'ja' }, vorsorge: {} }),
    vorher:  (d) => d.sektoren.verwaltung.ki_grundentscheidung === 'erlaubnis',
    nachher: (d) => {
      const z = ((d.sektoren.advanceCare || {}).provisionInstruments || []).find((e) => e && e.basicDecision === 'erlaubnis');
      return !!z && z.scope === 'privat' && !Object.keys(d.sektoren.administration || {}).some((k) => k.startsWith('ki_'));
    } },

  { nach: 41, was: 'vier Skalarfelder werden Listen; vermieter_tel wird zwei Felder (U2-ADR-104)',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/datenmodell-block-41.test.js. */
    baue: () => basis(40, {
      gesundheit: { voroperationen: 'Blinddarm 2008', familienanamnese: 'Vater Herzinfarkt' },
      finanzen:   { nachlass_vermoegen: 'Bausparvertrag Sparkasse' },
      verwaltung: { wohnungsschluessel_ort: 'Nachbarin Sarah' },
      wohnen:     { vermieter_tel: '0211 123456', weitere_wohnungen: [] },   // ohne E-Mail: die Stufe zerlegt sonst den Wert (Waisen-Probe prüft wörtlich)
    }),
    vorher:  (d) => typeof d.sektoren.gesundheit.voroperationen === 'string',
    nachher: (d) => {
      const s = d.sektoren;
      return Array.isArray(s.health.operationsProcedures) && s.health.operationsProcedures[0].procedure === 'Blinddarm 2008'
          && s.health.familyMedicalHistory[0].condition === 'Vater Herzinfarkt'
          && s.finance.assetsForTheEstate[0].asset === 'Bausparvertrag Sparkasse'
          && s.administration.homeKeyWhoHoldsOne[0].note === 'Nachbarin Sarah';
    } },

  /* Der erste Sprung, der von Anfang an mit seiner Probe geboren wurde: der Governance-Waechter
     haette ihn sonst rot gemacht. Genau dafuer war U2-ADR-108 da — nicht fuer achtzehn Tests,
     sondern dafuer, dass der neunzehnte nicht mehr vergessen werden kann. */
  { nach: 42, was: 'kinder + schutzbefohlene werden EINE Liste; kind→person, kind_beziehung→art, '
                 + 'Alt-Freitext als eigene Zeile mit LEERER art (U2-ADR-109)',
    baue: () => basis(41, { 'meine-menschen': {
      kinder: [{ id: 'k1', kind: { ref: 'p1', override: '' }, kind_beziehung: 'muendel',
                 sorgerecht_kind: 'vormund', geburtsurkunde_ort: 'Ordner Wichtiges' }],
      schutzbefohlene: 'Anna (12) und Lukas (9); Pflegekind Mia (7)',
    } }, { verwalteteDepots: [{ depotUUID: 'd1', kindRegisterId: 'p1' }] }),
    vorher:  (d) => d.sektoren['meine-menschen'].kinder[0].kind !== undefined
                 && typeof d.sektoren['meine-menschen'].schutzbefohlene === 'string'
                 && d.verwalteteDepots[0].kindRegisterId === 'p1',
    nachher: (d) => {
      const mm = d.sektoren.people;
      const z0 = mm.childrenAndDependants[0], z1 = mm.childrenAndDependants[1];
      return z0.person && z0.person.ref === 'p1' && z0.kind === undefined
          && z0.type === 'muendel' && z0.kind_beziehung === undefined
          && z0.birthCertificateStorage === 'Ordner Wichtiges'      // Rest unberuehrt
          && mm.schutzbefohlene === undefined
          && !!z1 && z1.type === undefined                      // BEWUSST leer, nicht geraten
          && z1.note === 'Anna (12) und Lukas (9); Pflegekind Mia (7)'
          && d.verwalteteDepots[0].vertreteneRegisterId === 'p1'
          && d.verwalteteDepots[0].kindRegisterId === undefined;
    } },

  /* ── C10 · Stufe 43 (U2-ADR-116, 29.07.2026) ───────────────────────────────────
     Vier Freitextfelder werden Institutions-Referenzen. Die Probe haelt nicht nur die
     Mechanik fest, sondern die ENTSCHEIDUNG dahinter: aus dem Alt-Text entsteht ein NEUER
     Eintrag, und es wird NIE gegen einen bestehenden gematcht.

     DARUM TRAEGT DAS ALT-DEPOT SCHON EINE INSTITUTION mit exakt dem Namen, den `kv_art`
     als Freitext fuehrt. Matchte die Migration, bliebe die Zahl der Eintraege bei vier
     statt fuenf und `kv_art.ref` zeigte auf `i-alt` — beides macht diese Probe rot. Die
     Abgrenzung zu U2-ADR-104 steht damit als Waechter da, nicht nur als Absatz im ADR. */
  { nach: 43, was: 'kv_art · konten[].bank · kfz_versicherung · pflegekasse: Freitext → '
                 + 'Referenz auf einen NEUEN Institutions-Eintrag, nie gegen bestehende gematcht',
    baue: () => basis(42, {
      gesundheit:         { kv_art: 'AOK Bayern' },
      finanzen:           { konten: [{ id: 'k1', bank: 'Sparkasse München', iban: 'DE89' }] },
      mobilitaet:         { kfz_versicherung: 'HUK24, Vertrag 4711-0815' },
      sozialversicherung: { pflegekasse: 'AOK Bayern — Pflegekasse' },
    }, { institutionen: [{ id: 'i-alt', name: 'AOK Bayern', art: 'krankenkasse' }] }),
    vorher:  (d) => typeof d.sektoren.gesundheit.kv_art === 'string'
                 && typeof d.sektoren.finanzen.konten[0].bank === 'string'
                 && typeof d.sektoren.mobilitaet.kfz_versicherung === 'string'
                 && typeof d.sektoren.sozialversicherung.pflegekasse === 'string'
                 && d.institutionen.length === 1,
    nachher: (d) => {
      const vier = [d.sektoren.health.healthInsurance, d.sektoren.finance.accounts[0].institution,
        d.sektoren.mobility.carInsurance, d.sektoren.socialInsurance.longTermCareFund];
      const neue = d.institutionen.filter((i) => i.id !== 'i-alt');
      return vier.every((r) => r && typeof r.ref === 'string' && r.ref)
          // (a) jeder Alt-Text ist verlustfrei auffindbar
          && instName(d, vier[0]) === 'AOK Bayern'
          && instName(d, vier[1]) === 'Sparkasse München'
          && instName(d, vier[2]) === 'HUK24, Vertrag 4711-0815'
          && instName(d, vier[3]) === 'AOK Bayern — Pflegekasse'
          // (b) als VIER NEUE Eintraege NEBEN dem bestehenden — kein Match, auch bei
          //     namensgleichem Bestand (das ist die Zusage, nicht ein Nebeneffekt)
          && d.institutionen.length === 5 && vier[0].ref !== 'i-alt'
          // (c) `art` bleibt leer: aus „AOK Bayern" auf `krankenkasse` zu schliessen waere
          //     dasselbe Raten, nur eine Ebene tiefer — die Buergerin ordnet zu
          && neue.every((i) => i.art === undefined);
    } },

  /* ── U2-ADR-116 §7 · Stufe 44 ──────────────────────────────────────────────────
     `pflegedienst_kontakt` geht in `pflegedienst` auf. Die Probe prüft BEIDE Richtungen
     in einem Depot, weil nur ihr Zusammenspiel die Zusage trägt:
       · Zielfeld leer  → der Alt-Wert zieht um, der Alt-Schlüssel ist weg
       · Zielfeld belegt → der Zielwert bleibt, und der Alt-Wert wird NICHT verworfen
     Die zweite Hälfte ist die eigentliche: zwei verschiedene Dienste zu einem zusammen-
     zuziehen wäre dasselbe Raten, gegen das U2-ADR-104 entschieden hat, und eine Migration
     löscht keine Bürgerdaten. Ohne diesen Fall wäre „zieht um" von „überschreibt" nicht
     zu unterscheiden. */
  { nach: 44, was: 'pflegedienst_kontakt geht in pflegedienst auf; belegtes Ziel bleibt und der '
                 + 'Alt-Wert wird nicht verworfen (U2-ADR-116 §7)',
    baue: () => basis(43, {
      sozialversicherung: { pflegedienst_kontakt: { ref: 'i-alt-dienst' } },
      gesundheit: {},
    }, { institutionen: [{ id: 'i-alt-dienst', name: 'Sozialstation St. Anna' },
                         { id: 'i-schon-da',   name: 'Diakoniestation Nord' }] }),
    vorher:  (d) => d.sektoren.sozialversicherung.pflegedienst_kontakt !== undefined
                 && d.sektoren.sozialversicherung.pflegedienst === undefined,
    nachher: (d) => {
      const sv = d.sektoren.socialInsurance;
      return sv.homeCareServiceNameContact && sv.homeCareServiceNameContact.ref === 'i-alt-dienst'
          && sv.pflegedienst_kontakt === undefined
          && instName(d, sv.homeCareServiceNameContact) === 'Sozialstation St. Anna';
    } },

  /* ── U2-ADR-120 · Stufe 45 ─────────────────────────────────────────────────
     data.uebergabeProtokoll[] wird additiv angelegt — leer, wie feldDefinitionen (24)
     und codeListen (26). EIGENSTÄNDIG neben delegationsGeschichte (verwalteteDepots bleibt
     unberührt, s. Zug 1 des Bau-Auftrags). */
  { nach: 45, was: 'data.uebergabeProtokoll[] wird angelegt — additiv, leer (U2-ADR-120)',
    baue: () => basis(44, {}),
    vorher:  (d) => !Array.isArray(d.uebergabeProtokoll),
    nachher: (d) => Array.isArray(d.uebergabeProtokoll) && d.uebergabeProtokoll.length === 0 },

  { nach: 46, was: 'vorsorge_instrumente-Backfill: rechtsraum/katalogStand/rechtsraumAngenommen '
                 + '(U2-ADR-121 Zug 4/5)',
    geprueftIn: 'tests/rechtsraum-katalog-instrument-stempel.test.js' },

  { nach: 47, was: 'data.rechtsraumModule[] wird angelegt — additiv, leer (U2-ADR-121 Posten 8, Zug 6)',
    baue: () => basis(46, {}),
    vorher:  (d) => !Array.isArray(d.rechtsraumModule),
    nachher: (d) => Array.isArray(d.rechtsraumModule) && d.rechtsraumModule.length === 0 },

  { nach: 48, was: 'vorsorge_instrumente.art gesundheit/general → vorsorge + gesetzte vm_*-Kästchen; '
                 + 'betreuung bleibt unverändert („F3", 09.08.2026)',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/f3-art-migration.test.js. */
    baue: () => basis(47, { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'vorsorgevollmacht', art: 'gesundheit', ort: 'Ordner Vorsorge' }] } }),
    vorher:  (d) => d.sektoren.vorsorge.vorsorge_instrumente[0].art === 'gesundheit',
    nachher: (d) => {
      const e = d.sektoren.advanceCare.provisionInstruments[0];
      return e.typeOfPowerOfAttorney === 'vorsorge' && e.healthCareGeneralDecision === 'ja';
    } },

  { nach: 49, was: 'sozialversicherung.gdb_merkmale: Alt-String (Komma-Liste) → mehrfachauswahl-Array '
                 + 'über _wertAusText, unzugeordneter Rest bleibt als Freitext-Eintrag stehen '
                 + '(„F4 und F5", Zug 2/4, 09.08.2026)',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/f4-gdb-merkmale-migration.test.js. */
    // Ein Merkzeichen, keine Komma-Liste: die Zerlegung prüft tests/f4-gdb-merkmale-migration.test.js, die
    // Waisen-Probe (tests/migration-keine-neuen-waisen.test.js) verlangt den Wert wörtlich wieder.
    baue: () => basis(48, { sozialversicherung: { gdb_merkmale: 'G' } }),
    vorher:  (d) => d.sektoren.sozialversicherung.gdb_merkmale === 'G',
    nachher: (d) => JSON.stringify(d.sektoren.socialInsurance.markers) === JSON.stringify(['G']) },

  /* ── „F6" Zug 2 · Stufe 50 (10.08.2026) ─────────────────────────
     Die 24 `ks_*`-Felder ziehen von `verwaltung` nach `krisenvorsorge` um — U2-ADR-050
     (Verschieben, kein Löschen). Zwei Richtungen in einer Probe: die gesetzten `ks_*`-Werte
     müssen am neuen Schlüssel ankommen UND am alten verschwinden; ein NICHT-`ks_*`-Feld
     desselben Sektors (`bundid_status`) muss unberührt bleiben — sonst prüfte die Probe nur
     „verwaltung wird geleert", nicht „genau die 24 ziehen um".
     Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): der Kontrollwert war `bundid_email` — das
     Feld ist inzwischen selbst Ziel einer SPÄTEREN Migrationsstufe (Korb 1, mehrwertig: zieht
     nach `bundid`, einer Liste) und verschwindet darum bis zur aktuellen Schema-Version zu
     Recht aus `verwaltung`. Das ist kein Fehler dieser Stufe 50, sondern ein falscher Zeuge —
     `bundid_status` bleibt über die ganze Kette hinweg ein unangetastetes Flachfeld. */
  { nach: 50, was: 'verwaltung.ks_* zieht nach krisenvorsorge.ks_* um, andere verwaltung-Felder '
                 + 'bleiben unberührt („F6", Zug 2, 10.08.2026)',
    baue: () => basis(49, {
      verwaltung: { ks_wasser_liter: '20 Liter', ks_nachbar: { ref: 'p1', override: '' },
        bundid_status: 'hoch' },
    }),
    vorher:  (d) => d.sektoren.verwaltung.ks_wasser_liter === '20 Liter'
                 && d.sektoren.krisenvorsorge === undefined,
    nachher: (d) => {
      const v = d.sektoren.administration, k = d.sektoren.emergencyPreparedness;
      return k && k.drinkingWaterSupplyAmount === '20 Liter' && k.neighbourForEmergencies && k.neighbourForEmergencies.ref === 'p1'
          && v.ks_wasser_liter === undefined && v.ks_nachbar === undefined
          && v.bundidVerificationLevel === 'hoch';
    } },

  /* ── „F6" Zug 3 · Stufe 51 (10.08.2026) ─────────────────────────
     `ks_wasser_haltbar`/`ks_lebensmittel_haltbar` werden `typ:'datum'`. Ein Alt-Wert wie
     „wird alle 6 Monate erneuert" ist kein Datum — er zieht ins Rettungsfeld `_frueher` um,
     das Original wird geleert (U2-ADR-050: gerettet, nicht verworfen). Ein Alt-Wert, der schon
     ISO-datumsförmig ist, bleibt unverändert — dort gibt es nichts zu retten. Beide Fälle in
     einer Probe, an je einem der zwei Felder, damit keiner der beiden Zweige unbelegt bliebe. */
  { nach: 51, was: 'ks_wasser_haltbar/ks_lebensmittel_haltbar: Nicht-Datums-Alttext zieht ins '
                 + 'Rettungsfeld um, ein bereits ISO-datumsförmiger Alt-Wert bleibt stehen '
                 + '(„F6", Zug 3, 10.08.2026)',
    baue: () => basis(50, {
      krisenvorsorge: { ks_wasser_haltbar: 'wird alle 6 Monate erneuert', ks_lebensmittel_haltbar: '2026-12-01' },
    }),
    vorher:  (d) => d.sektoren.krisenvorsorge.ks_wasser_haltbar === 'wird alle 6 Monate erneuert'
                 && d.sektoren.krisenvorsorge.ks_wasser_haltbar_frueher === undefined,
    /* NACHGEZOGEN AM 18.08.2026 (M1 Zug 5/Zug 2), und der Grund gehört hierher: Die Zusage
       dieser Stufe ist unverändert wahr — der Alttext zieht ins Rettungsfeld, der ISO-Wert
       bleibt stehen. Nur BLEIBT er nicht mehr bis zum Ende der Kette dort: Stufe 65 holt ihn
       weiter nach `feldGueltigkeit`, weil `ks_lebensmittel_haltbar` die Marke `laeuftAb`
       trägt. Das Gerüst hier prüft den Zustand NACH der ganzen Kette; die Zusage wird darum
       an ihrem heutigen Ort geprüft, nicht an ihrem damaligen. */
    nachher: (d) => {
      const k = d.sektoren.emergencyPreparedness;
      const g = (d.feldGueltigkeit && d.feldGueltigkeit.emergencyPreparedness) || {};
      // Auch der geleerte Platz wird von Stufe 65 geräumt — „immer", nicht „wenn belegt":
      // ein zurückbleibendes `''` wäre der zweite Wert-Slot, gegen den U2-ADR-144 §1 steht.
      return !('ks_wasser_haltbar' in k) && k.drinkingWaterSupplyEarlierNote === 'wird alle 6 Monate erneuert'
          && !(g.ks_wasser_haltbar)
          && !('ks_lebensmittel_haltbar' in k)
          && g.foodSuppliesCheckShelfLifeBy && g.foodSuppliesCheckShelfLifeBy.bis === '2026-12-01'
          && k.foodSuppliesEarlierNoteOnShelf === undefined;
    } },

  /* ── „Tote Leitfelder" · Stufe 52 (11.08.2026) ──────────────────
     vollmacht_vorhanden/patientenverf_vorhanden/betreuungsverfuegung sind seit U2-ADR-100 tote
     Flachfeld-Gates — kein Wizard schreibt sie mehr, kein Nachbauweg existiert. Entscheidung (Vorlage „Weg 2 mit Migration"): 'ja' zieht als echte Instrument-Zeile um,
     DIESELBE Regel wie beim b16-Import (_b16InstrumentZeilen — eine Regel, nicht zwei), inklusive
     ihrer Detailfelder. Ein Wert, der nicht 'ja' ist (hier: 'nein'), ist im Zeilen-Modell nicht
     eindeutig abbildbar und zieht ins Rettungsfeld (U2-ADR-050). Eine Probe deckt beide Zweige:
     patientenverfuegung mit 'ja' + zwei Detailfeldern (Zeile inkl. Details, Gate+Details leer),
     vorsorgevollmacht mit 'nein' (kein Zeile, Rettungsfeld). */
  { nach: 52, was: 'vollmacht_vorhanden/patientenverf_vorhanden/betreuungsverfuegung: \'ja\' wird '
                 + 'Instrument-Zeile (mit Detailfeldern, dieselbe Regel wie b16-Import), \'nein\' '
                 + 'zieht ins Rettungsfeld („Tote Leitfelder", 11.08.2026)',
    baue: () => basis(51, {
      vorsorge: {
        vollmacht_vorhanden: 'nein',
        patientenverf_vorhanden: 'ja', patientenverf_ort: 'Tresor zuhause', organspende: 'ja',
      },
    }),
    vorher:  (d) => d.sektoren.vorsorge.patientenverf_vorhanden === 'ja'
                 && d.sektoren.vorsorge.vollmacht_vorhanden === 'nein'
                 && !(Array.isArray(d.sektoren.vorsorge.vorsorge_instrumente)
                      && d.sektoren.vorsorge.vorsorge_instrumente.some((r) => r && r.typ === 'patientenverfuegung')),
    nachher: (d) => {
      const v = d.sektoren.advanceCare;
      const liste = Array.isArray(v.provisionInstruments) ? v.provisionInstruments : [];
      const pv = liste.find((r) => r && r.instrument === 'living-will');
      return pv && pv.storageLocation === 'Tresor zuhause' && pv.organDonation === 'ja'
          && !liste.some((r) => r && r.instrument === 'enduring-power-of-attorney')
          && v.patientenverf_vorhanden === undefined && v.patientenverf_ort === undefined
          && v.organspende === undefined
          && v.vollmacht_vorhanden === undefined && v.vollmacht_vorhanden_frueher === 'nein';
    } },

  /* ── „Tote Leitfelder", erweitert · Stufe 52 (19.09.2026, dod-stand#B8/UMBAU_RUECKSTAND,
 nach Messung) ──────────────────────────────────────
     GEMESSEN, NICHT VERMUTET (19.09.2026): ein konstruiertes Alt-Depot mit allen 23
     UMBAU_RUECKSTAND-Flachfeldern gefüllt verlor vor dieser Stufe 18 von 23 Werten
     spurlos beim Normalisieren — testament_ort/-datum/-vorhanden, erbfolge_hinweis,
     vermaechtnisse, zvr_nummer, alle fünf sorgerechtsverfuegung_*-Felder und alle fünf
     betreuung_*-Felder hatten keinen Migrationsweg (leere `felder`-Map bei
     betreuungsverfuegung, `sorgerechtsverfuegung` fehlte als Typ in B16_INSTRUMENT_IMPORT
     komplett, `testament` war mit einer FALSCHEN Begründung ausdrücklich ausgenommen —
     „bereits mit Schema 39 migriert" stimmte nicht, Schema 38→39 migriert nur die alte
     `vollmachten`-Liste). Diese Probe deckt testament (Gate + zwei neue Detailfelder) und
     sorgerechtsverfuegung (neues Gate, vorher unbekannt) ab; betreuungsverfuegung und
     vorsorgevollmacht/patientenverf_* sind strukturell derselbe Weg (B16_INSTRUMENT_IMPORT-
     Eintrag mit `felder`-Map), hier nicht doppelt geprüft. */
  { nach: 52, was: 'testament_vorhanden/sorgerechtsverfuegung: \'ja\' wird Instrument-Zeile mit '
                 + 'Detailfeldern (dieselbe Regel wie b16-Import) — vorher: testament ausgenommen, '
                 + 'sorgerechtsverfuegung ohne Migrationsweg (dod-stand#B8, 19.09.2026)',
    baue: () => basis(51, {
      vorsorge: {
        testament_vorhanden: 'ja', testament_ort: 'Notariat Dr. Beispiel', testament_datum: '2021-09-12',
        erbfolge_hinweis: 'abweichend', vermaechtnisse: 'Ring an Mia',
        sorgerechtsverfuegung: 'ja', sorgerechtsverfuegung_ort: 'Ordner Vorsorge',
        sorgerechtsverfuegung_wuensche: 'Mia soll in der gewohnten Schule bleiben',
      },
    }),
    vorher:  (d) => d.sektoren.vorsorge.testament_vorhanden === 'ja'
                 && d.sektoren.vorsorge.sorgerechtsverfuegung === 'ja'
                 && !(Array.isArray(d.sektoren.vorsorge.vorsorge_instrumente)
                      && d.sektoren.vorsorge.vorsorge_instrumente.some((r) => r && (r.typ === 'testament' || r.typ === 'sorgerechtsverfuegung'))),
    nachher: (d) => {
      const v = d.sektoren.advanceCare;
      const liste = Array.isArray(v.provisionInstruments) ? v.provisionInstruments : [];
      // L4 (20.09.2026): `nachher` liest das Ende der GANZEN Kette — dort steht der Typ seit Stufe 84->85
      // als 'will'. `vorher` oben bleibt bei der Form vor der Umbenennung.
      const tm = liste.find((r) => r && r.instrument === 'will');
      const sr = liste.find((r) => r && r.instrument === 'guardian-nomination');
      return tm && tm.storageLocation === 'Notariat Dr. Beispiel' && tm.dateOfLastChange === '2021-09-12'
          && tm.statutorySuccessionOr === 'abweichend' && tm.personalNotesOnThis === 'Ring an Mia'
          && sr && sr.storageLocation === 'Ordner Vorsorge'
          && sr.wishesForUpbringingCare === 'Mia soll in der gewohnten Schule bleiben'
          && v.testament_vorhanden === undefined && v.testament_ort === undefined
          && v.testament_datum === undefined && v.erbfolge_hinweis === undefined
          && v.vermaechtnisse === undefined && v.sorgerechtsverfuegung === undefined
          && v.sorgerechtsverfuegung_ort === undefined && v.sorgerechtsverfuegung_wuensche === undefined;
    },
    /* BENANNTER, GEZAEHLTER VERLUST — wie bei Stufe 24→25: das GATE „ja" selbst ist kein
       Buergerwert, sondern eine Existenzfrage. Nach der Migration steht die Antwort NICHT
       mehr als Zeichenkette „ja", sondern als die EXISTENZ der Instrument-Zeile selbst — die
       Information bleibt vollstaendig erhalten, nur anders codiert. Ohne diese Ausnahme waere
       die Verwaisungs-Pruefung hier faelschlich rot, obwohl nichts verlorenging. */
    erlaubterVerlust: { werte: ['ja'],
      grund: 'die Gates testament_vorhanden/sorgerechtsverfuegung werden zur Existenz der Instrument-Zeile — dieselbe Information, anders codiert, kein Buergerwert-Verlust' } },

  /* ── „Nachlese F8/M1" · Stufe 53 (11.08.2026) ────────────────────
     vm_gesundheit_freiheitsentzug war das einzige mehrfachauswahl-Kästchen unter 20
     Vollmacht-Ja/Nein-Punkten — eine Bürgerin, die nichts wählt, sah nicht "nein" statt
     "nicht ja". Vier eigene ☐ja/☐nein-Felder ersetzen das Array (Weg 1 aus dem Auftrag).
     Migration additiv: jeder Alt-Wert im Array wird 'ja' im passenden neuen Feld, danach
     entfällt das Array-Feld. Probe deckt Teilmenge (nicht alle vier gewählt) ab. */
  { nach: 53, was: 'vm_gesundheit_freiheitsentzug (Array) wird auf vier eigene ☐ja/☐nein-Felder '
                 + 'verteilt („Nachlese F8/M1", Zug 1, 11.08.2026)',
    baue: () => basis(52, {
      vorsorge: { vorsorge_instrumente: [
        { id: 'v1', typ: 'vorsorgevollmacht', vm_gesundheit_freiheitsentzug: ['unterbringung', 'krankenhaus'] },
      ] },
    }),
    vorher:  (d) => {
      const r = d.sektoren.vorsorge.vorsorge_instrumente[0];
      return Array.isArray(r.vm_gesundheit_freiheitsentzug)
          && r.vm_freiheitsentzug_unterbringung === undefined;
    },
    nachher: (d) => {
      const r = d.sektoren.advanceCare.provisionInstruments[0];
      return r.vm_gesundheit_freiheitsentzug === undefined
          && r.healthCarePlacementDepriving === 'ja'
          && r.healthCareAdmissionToHospital === 'ja'
          && r.healthCareMeasuresDepriving === undefined
          && r.healthCareCompulsoryMedical === undefined;
    } },

  /* ── „Aufenthaltstitel" · Stufe 54 (11.08.2026) ──────────────────
     Rein additiv: sechs neue identitaet-Felder (aufenthaltstitel_*), kein Alt-Feld, kein
     Wertumbau (U2-ADR-100 §8). Die Probe ist ehrlich das, was diese Stufe wirklich ist — ein
     reiner Versionssprung, geprüft an genau dem einen Wert, der sich bewegt. */
  { nach: 54, was: 'sechs neue additive identitaet-Felder (aufenthaltstitel_*), reiner '
                 + 'Versionssprung ohne Wertumbau („Aufenthaltstitel", 11.08.2026)',
    baue: () => basis(53, { identitaet: { vorname: 'Maria', nachname: 'Mustermann' } }),
    vorher:  (d) => d.schemaVersion === 53,
    // >= statt === (11.08.2026, F4 Zug 1): die Kette läuft immer bis zur aktuellen Version durch —
    // ein exakter Vergleich bräche bei jeder späteren Stufe erneut (Regel 18 deckte das real auf).
    nachher: (d) => d.schemaVersion >= 54 },

  /* ── „F4 — die siebzehn verbliebenen Katalogfelder" · Stufe 55 (11.08.2026),
     Zug 1 ──────────────────────────────────────────────────────────────────
     Sechs Freitextfelder werden Kataloge. Ein exakter Treffer (wert/label, case-insensitiv)
     zieht um; alles andere landet vollständig im `_frueher`-Rettungsfeld. Probe deckt beide
     Zweige an drei Feldern: steuerklasse (Sektorfeld, Treffer), bundid_status (Sektorfeld,
     kein Treffer → Rettung), erb_erbschein (Situationsfeld, kein Treffer → Rettung). */
  { nach: 55, was: 'steuerklasse/einkommensart/erb_erbschein/vj_krankenversicherung/'
                 + 'geburt_kind_kv/bundid_status: Freitext → Katalog, Nicht-Treffer zieht ins '
                 + 'Rettungsfeld („F4", Zug 1, 11.08.2026)',
    baue: () => basis(54, {
      identitaet: { steuerklasse: 'IV' },
      verwaltung: { bundid_status: 'Niveau hoch (mit eID-Funktion)' },
    }, {
      situationen: { erbfall: { erb_erbschein: 'Bankvollmacht vorhanden → Erbschein evtl. entbehrlich' } },
    }),
    vorher:  (d) => d.sektoren.identitaet.steuerklasse === 'IV'
                 && d.sektoren.verwaltung.bundid_status === 'Niveau hoch (mit eID-Funktion)'
                 && d.situationen.erbfall.erb_erbschein === 'Bankvollmacht vorhanden → Erbschein evtl. entbehrlich'
                 && d.sektoren.verwaltung.bundid_status_frueher === undefined,
    nachher: (d) => d.sektoren.identity.taxClass === 'IV'                              // exakter Treffer bleibt
                 && d.sektoren.identity.taxClassEarlierEntry === undefined
                 && d.sektoren.administration.bundidVerificationLevel === ''                               // kein Treffer → leer
                 && d.sektoren.administration.bundidVerificationLevelEarlier === 'Niveau hoch (mit eID-Funktion)'
                 && d.situationen.erbfall.erb_erbschein === ''
                 && d.situationen.erbfall.erb_erbschein_frueher === 'Bankvollmacht vorhanden → Erbschein evtl. entbehrlich' },

  /* ── „F4" · Stufe 56 (11.08.2026), Zug 2 ─────────────────────────
     `botschaft` wird ein Institutions-Verweis (C10-Muster). KEIN Komma-Split — der ganze
     Alt-Text wird EIN `institutionen[].name` (U2-ADR-104). */
  { nach: 56, was: 'botschaft: Freitext → Institutions-Verweis, kein Komma-Split '
                 + '(„F4", Zug 2, 11.08.2026)',
    baue: () => basis(55, { mobilitaet: { botschaft: 'Deutsche Botschaft Neu-Delhi, +91 11 4419-9199' } }),
    vorher:  (d) => d.sektoren.mobilitaet.botschaft === 'Deutsche Botschaft Neu-Delhi, +91 11 4419-9199',
    nachher: (d) => {
      const ref = d.sektoren.mobility.embassyContact;
      if (!ref || typeof ref !== 'object' || !ref.ref) return false;
      const inst = (d.institutionen || []).find((i) => i.id === ref.ref);
      return !!inst && inst.name === 'Deutsche Botschaft Neu-Delhi, +91 11 4419-9199';
    } },

  /* ── „F4" · Stufe 57 (11.08.2026), Zug 3 ─────────────────────────
     Fünf gemischte Freitextfelder trennen sich. Anders als Stufe 55: KEIN Versuch, den
     Alt-Wert zu trennen — der GANZE Wert zieht ins Rettungsfeld (Auftrag: "es wird nicht
     geraten, welcher Teil welcher ist"). heirat_ehevertrag (Nachtrag 1): kein Schreiben nach
     identitaet.gueterstand, auch wenn der Alt-Wert einen Güterstand nennt. */
  { nach: 57, was: 'fuehrerschein/schulabschluss/studium/pflegegeld/heirat_ehevertrag: '
                 + 'gemischter Alt-Wert zieht komplett ins Rettungsfeld, nichts geraten '
                 + '(„F4", Zug 3, 11.08.2026, amendiert durch Nachtrag 1)',
    baue: () => basis(56, {
      mobilitaet: { fuehrerschein: 'B, BE — Klasse, Ablageort Geldbeutel' },
      sozialversicherung: { pflegegeld: 'Pflegegeld Pflegegrad 3, 599 EUR/Monat; Kombinationsleistung' },
    }, {
      situationen: { hauskauf: { heirat_ehevertrag: 'kein Ehevertrag → Zugewinngemeinschaft; sonst Ablageort notieren' } },
    }),
    vorher:  (d) => d.sektoren.mobilitaet.fuehrerschein === 'B, BE — Klasse, Ablageort Geldbeutel'
                 && d.sektoren.sozialversicherung.pflegegeld === 'Pflegegeld Pflegegrad 3, 599 EUR/Monat; Kombinationsleistung'
                 && d.situationen.hauskauf.heirat_ehevertrag === 'kein Ehevertrag → Zugewinngemeinschaft; sonst Ablageort notieren',
    nachher: (d) => Array.isArray(d.sektoren.mobility.drivingLicenceClasses) && d.sektoren.mobility.drivingLicenceClasses.length === 0
                 && d.sektoren.mobility.drivingLicenceEarlierEntry === 'B, BE — Klasse, Ablageort Geldbeutel'
                 && d.sektoren.socialInsurance.longTermCareAllowanceTypeOf === ''
                 && d.sektoren.socialInsurance.longTermCareAllowanceEarlier === 'Pflegegeld Pflegegrad 3, 599 EUR/Monat; Kombinationsleistung'
                 && d.situationen.hauskauf.heirat_ehevertrag === undefined
                 && d.situationen.hauskauf.heirat_ehevertrag_vorhanden === ''
                 && d.situationen.hauskauf.heirat_ehevertrag_frueher === 'kein Ehevertrag → Zugewinngemeinschaft; sonst Ablageort notieren'
                 && d.sektoren.identity === undefined },

  /* ── „F4" · Stufe 58 (11.08.2026), Zug 4 ─────────────────────────
     „Name ist Name" — zwei Felder für dieselbe Namenswahl werden eins. heirat_namenswahl
     (identitaet) bleibt Katalog, heirat_name (Situationsblatt) entfällt in ein EIGENES
     Rettungsfeld, ohne Zusammenführung. */
  { nach: 58, was: 'heirat_namenswahl bleibt Katalog, heirat_name entfällt in ein eigenes '
                 + 'Rettungsfeld, keine Zusammenführung („F4", Zug 4, 11.08.2026)',
    baue: () => basis(57, {
      identitaet: { heirat_namenswahl: 'gemeinsamer Ehename Mustermann; Geburtsname als Begleitname' },
    }, {
      situationen: { hauskauf: { heirat_name: 'gemeinsamer Ehename; Geburtsname als Begleitname' } },
    }),
    vorher:  (d) => d.sektoren.identitaet.heirat_namenswahl === 'gemeinsamer Ehename Mustermann; Geburtsname als Begleitname'
                 && d.situationen.hauskauf.heirat_name === 'gemeinsamer Ehename; Geburtsname als Begleitname',
    nachher: (d) => d.sektoren.identity.choiceOfNameAfterMarriage === ''
                 && d.sektoren.identity.choiceOfNameAfterMarriage2 === 'gemeinsamer Ehename Mustermann; Geburtsname als Begleitname'
                 && d.situationen.hauskauf.heirat_name === undefined
                 && d.situationen.hauskauf.heirat_name_frueher === 'gemeinsamer Ehename; Geburtsname als Begleitname' },

  /* ── „M3 Eintrag-Bezug" (Weg B, 11.08.2026), Zug 1 ────────────────────
     dokument.felder[]-Referenzen auf ein Listenfeld bekommen, wo eindeutig auflösbar
     (Diskriminant-Treffer ODER genau eine Zeile), eine zeilenId statt nur sektorId/
     feldId. Acht dedizierte Fälle (Diskriminant, Einzeiler, Mehrzeiler-ohne-Raten,
     Fremd-Liste, Idempotenz, Doppellauf, Leerliste, Bankvollmacht-Sonderfall) —
     ausführlicher als das vorher/nachher-Gerüst hier leisten könnte. */
  { nach: 59, was: 'dokument.felder[]-Referenz auf ein Listenfeld bekommt zeilenId, wo '
                 + 'eindeutig auflösbar (Diskriminant oder genau eine Zeile) — sonst Rettungsfeld, kein Raten '
                 + '(„M3 Eintrag-Bezug", Zug 1, 11.08.2026)',
    geprueftIn: 'tests/m3-eintrag-bezug-zug1.test.js' },

  /* ── „Ausbildung und Betreuerbestellung" (12.08.2026), Zug 1 ─────────
     bildung.ausbildung — dieselbe Trennung wie schulabschluss/studium/pflegegeld (Stufe 57):
     Abschlussart wird Katalog, Beruf/Betrieb/Jahr eigene Felder, Alt-Text ins Rettungsfeld. */
  { nach: 60, was: 'bildung.ausbildung wird Katalog (Abschlussart), Beruf/Betrieb/Jahr eigene '
                 + 'Felder, Alt-Text ins Rettungsfeld ausbildung_frueher (Auftrag '
                 + '„Ausbildung und Betreuerbestellung", Zug 1, 12.08.2026)',
    baue: () => basis(59, sek('bildung', { ausbildung: 'Bankkauffrau, IHK München, 1988' })),
    vorher:  (d) => d.sektoren.bildung.ausbildung === 'Bankkauffrau, IHK München, 1988',
    nachher: (d) => d.sektoren.education.vocationalTraining === ''
                 && d.sektoren.education.vocationalTrainingEarlierEntry === 'Bankkauffrau, IHK München, 1988'
                 && d.sektoren.education.vocationalTrainingTrained === ''
                 && d.sektoren.education.vocationalTrainingCompany === ''
                 && d.sektoren.education.vocationalTrainingYear === '' },

  /* ── „Ausdrücklich keine" (12.08.2026), Zug 4 ────────────────────────
     Neuer, rein additiver Namensraum data.ausdruecklichKeine — ein Bestandsdepot ohne ihn
     bekommt nur den leeren Namensraum, KEIN Feld wird zu „ausdrücklich keine" migriert
     (Leere bleibt Leere = „noch nicht beantwortet", Auftrag Zug 4 — der schlimmstmögliche
     Ausgang wäre das Gegenteil). Weitere, direktere Proben (Setzen/Auto-Löschen/Export/PDF):
     tests/ausdruecklich-keine.test.js. */
  { nach: 61, was: 'data.ausdruecklichKeine wird als leerer Namensraum angelegt — kein '
                 + 'Feld wird zu „ausdrücklich keine" migriert (Auftrag '
                 + '„Ausdrücklich keine", Zug 4, 12.08.2026)',
    baue: () => basis(60, sek('gesundheit', {})),
    vorher:  (d) => d.ausdruecklichKeine === undefined,
    nachher: (d) => d.ausdruecklichKeine && typeof d.ausdruecklichKeine === 'object'
                 && Object.keys(d.ausdruecklichKeine).length === 0 },

  /* ── „Die Ereignis-Achse" (13.08.2026), Zug 1 ────────────────────────
     Neues, rein additives Feld `ereignisAnlaesse` an data.dokumente[]-Einträgen. Diese Stufe
     setzt es NIRGENDS — ein Bestandsdokument bekommt KEINEN rückwirkenden Ereignis-Anlass
     (Familienstandswechsel/Tod/Betreuungsbeginn, den es nie gab, wäre erfunden). Anders als
     bei Stufe 61 (neuer Namensraum) gibt es hier keinen neu angelegten Wert zu prüfen — die
     Probe ist darum die Abwesenheit: ein Bestandsdokument bleibt nach der Migration exakt so
     unbeschrieben wie vorher. Weitere Proben (Markieren/Schließen/Wächter):
     tests/ereignis-achse-zug1.test.js. */
  { nach: 62, was: 'data.dokumente[].ereignisAnlaesse — rein additives Feld, KEIN Bestands-'
                 + 'dokument bekommt einen rückwirkenden Ereignis-Anlass (Auftrag '
                 + '„Die Ereignis-Achse", Zug 1, 13.08.2026)',
    baue: () => basis(61, sek('vorsorge', {}), { dokumente: [
      { id: 'dok-1', typ: 'vorsorgevollmacht', sektorId: 'vorsorge', gueltigAb: '2020-01-01',
        aktualisiertAm: '2020-01-01', erstelltAm: '2020-01-01', felder: [], mappeRef: null,
        istStandard: false, quelle: 'eigen', sensibel: false, adresse: '', partei: '' },
    ] }),
    vorher:  (d) => d.schemaVersion === 61,
    // schemaVersion NICHT mehr hart auf 62 geprüft (`>= 62` statt `=== 62`) — die Kette läuft
    // immer bis zur aktuellen Version durch (s. Testkopf), eine hart verdrahtete Zwischenversion
    // wird bei jeder weiteren angehängten Stufe stillschweigend falsch. `>= 62` bleibt als
    // Vakuum-Wächter nötig: ohne jeden Versions-Bezug wäre die Abwesenheits-Prüfung schon auf dem
    // unmigrierten Alt-Depot (Version 61) wahr. Gefunden, als Stufe 63 angehängt wurde
    // („Die Rentenversicherungsnummer wird aufgelöst", 14.08.2026).
    nachher: (d) => d.schemaVersion >= 62
                 && Array.isArray(d.dokumente)
                 && d.dokumente.every((doc) => !doc.ereignisAnlaesse || doc.ereignisAnlaesse.length === 0) },

  /* ── „Die Rentenversicherungsnummer wird aufgelöst" (14.08.2026) ─────────
     finanzen.dt_rentenversicherungsnr und sozialversicherung.rentenversicherungsnummer waren
     zwei Felder für denselben Sachverhalt. Vier Fälle (nur finanzen, nur sozialversicherung,
     beide gleich, beide verschieden mit Rettungsfeld) — ausführlicher als das vorher/nachher-
     Gerüst hier leisten könnte, wie schon bei Stufe 59 (M3 Eintrag-Bezug). */
  { nach: 63, was: 'finanzen.dt_rentenversicherungsnr entfällt als eigenes Feld, geht in '
                 + 'sozialversicherung.rentenversicherungsnummer auf; abweichende Altwerte ins '
                 + 'Rettungsfeld dt_rentenversicherungsnr_frueher („Die Rentenver'
                 + 'sicherungsnummer wird aufgelöst", 14.08.2026)',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/rv-nummer-vereinheitlichung.test.js. */
    baue: () => basis(62, { finanzen: { dt_rentenversicherungsnr: '12 345678 A 123' } }),
    vorher:  (d) => d.sektoren.finanzen.dt_rentenversicherungsnr === '12 345678 A 123',
    nachher: (d) => {
      const l = (d.sektoren.socialInsurance || {}).pensionInsuranceNumbers;
      return Array.isArray(l) && !!l[0] && l[0].pensionInsuranceNumber === '12 345678 A 123'
          && !(d.sektoren.finance && d.sektoren.finance.dt_rentenversicherungsnr);
    } },

  /* ── Auftrag „Die Bereichsliste wird ein andockbares Register" (Zug 3) plus Nachtrag
     „M1-generisch wird mitgebaut" (17.08.2026) ────────────────────────────────────────
     EINE Stufe für ZWEI Umbauten, und der gemeinsame Schnitt IST die Begründung: getrennt
     wären es zwei Stufen und 29 Stellen, gemeinsam eine Stufe und 15 (A286 §2e/§2f). Jede
     Stufe bleibt dauerhaft in der Kette jedes Bürgerdepots — eine gesparte Stufe ist keine
     Bequemlichkeit, sondern eine Zusicherung weniger, die für immer gehalten werden muss.

     Beide Teile sind ADDITIV: sie legen zwei leere Slots an und fassen keinen Bestandswert
     an. Das vorher/nachher-Gerüst hier prüft genau das; die Wirkung selbst (Rettung hinaus
     und zurück, Gültigkeit an einem angedockten Feld) steht in der eigenen Probe, wie schon
     bei den Stufen 59 und 63. */
  { nach: 64, was: 'zwei leere Slots kommen hinzu: data.bereicheVerwaist (Bereichsdaten, deren '
                 + 'Bereich die laufende Liste nicht kennt — Umzug statt Löschung, U2-ADR-050) '
                 + 'und data.feldGueltigkeit (Gültigkeit je Feldwert, M1 generisch als MARKE, '
                 + 'ohne Überführung der 19 bestehenden Datumsfelder)',
    basis: () => Object.assign(basis(), { schemaVersion: 63,
      sektoren: { 'ein-abgelaufenes-modul': { wichtiger_wert: 'darf nicht verschwinden' } } }),
    vorher:  (d) => d.schemaVersion === 63 && !d.bereicheVerwaist && !d.feldGueltigkeit,
    nachher: (d) => d.schemaVersion >= 64
                 && d.feldGueltigkeit && Object.keys(d.feldGueltigkeit).length === 0
                 && d.bereicheVerwaist
                 && d.bereicheVerwaist['ein-abgelaufenes-modul']
                 && d.bereicheVerwaist['ein-abgelaufenes-modul'].wichtiger_wert === 'darf nicht verschwinden'
                 && !d.sektoren['ein-abgelaufenes-modul'],
    geprueftIn: 'tests/bereiche-verwaist-und-gueltigkeit.test.js' },

  /* ── M1 Zug 5 / Zug 2 — DER UMZUG (18.08.2026) ──────────────────────────────────────
     Die Überführung, die 63→64 ausdrücklich NICHT vorgenommen hat (U2-ADR-144 §4: „gebaut
     wird die MARKE, nicht die ÜBERFÜHRUNG"). Die Produktentscheidung hat sie am 18.08.2026 entschieden;
     vierzehn Ablauf-Felder ziehen von `data.sektoren[<bereich>][<feld>]` nach
     `data.feldGueltigkeit[<bereich>][<feld>].bis`.

     WARUM EINE EIGENE STUFE UND KEINE ERWEITERUNG VON 64: 64 ist ausgeliefert. Eine Stufe
     nachträglich zu verändern hiesse, dass zwei Depots mit derselben Schemaversion nicht
     dasselbe durchlaufen haben — und genau darauf verlässt sich die ganze Kette.

     Konfliktfall, Rettungsfeld und Idempotenz stehen in der eigenen Probe; das
     vorher/nachher-Gerüst hier hält den Regelfall fest. */
  { nach: 65, was: 'die vierzehn Felder mit der Marke `laeuftAb` ziehen aus data.sektoren nach '
                 + 'data.feldGueltigkeit[<bereich>][<feld>].bis um; ein widersprechender '
                 + 'Bestandswert geht ins Rettungsfeld data.feldGueltigkeitGerettet '
                 + '(U2-ADR-050) — M1 Zug 5/Zug 2, 18.08.2026',
    basis: () => Object.assign(basis(), { schemaVersion: 64,
      sektoren: { identitaet: { ausweis_gueltig: '2029-05-04', geburtsdatum: '1990-05-04' } } }),
    vorher:  (d) => d.schemaVersion === 64 && d.sektoren.identitaet.ausweis_gueltig === '2029-05-04',
    nachher: (d) => d.schemaVersion >= 65
                 && !('ausweis_gueltig' in d.sektoren.identitaet)
                 && d.feldGueltigkeit.identitaet
                 && d.feldGueltigkeit.identitaet.ausweis_gueltig
                 && d.feldGueltigkeit.identitaet.ausweis_gueltig.bis === '2029-05-04'
                 && d.sektoren.identitaet.geburtsdatum === '1990-05-04',
    geprueftIn: 'tests/m1-umzug-gueltigkeit.test.js' },

  /* ── Der Zertifikat-Slot (A337/A345, 19.08.2026) ────────────────────────────────────
     Entschieden am 19.08.2026: der signierte Beleg reist im Depot mit, damit ein
     Empfänger ihn nachprüfen kann. `importierteVorlagen[]` trug bis dahin nur das
     ERGEBNIS der Prüfung — die Lese-App hatte nichts zu prüfen.

     DIESE STUFE ERFINDET KEINEN BELEG. Bestandseinträge tragen `beleg: null`, und zwar
     ausdrücklich: „kein Beleg vorhanden" ist eine Aussage, ein fehlendes Feld ist keine.
     Ein nachträglich zusammengesetzter Beleg wäre eine Fälschung.

     SIE FÄHRT MIT DEM ZERFALL IN EINEM SCHNITT. Wäre der Slot nachgereicht worden,
     bliebe er für immer als zweite Stufe in der Kette jedes Depots — das ist der Grund,
     aus dem A337 vor der Stufe entschieden werden musste. */
  { nach: 66, was: 'jeder Eintrag in data.importierteVorlagen[] bekommt den Slot `beleg`; '
                 + 'Bestandseinträge tragen ihn ausdrücklich als null, weil ein nachträglich '
                 + 'erfundener Beleg eine Fälschung wäre — A337/A345, 19.08.2026',
    basis: () => Object.assign(basis(), { schemaVersion: 65,
      importierteVorlagen: [{ id: 'alt-1', sektorId: 'bildung', feldIds: ['tpl_x'],
        wortlaut: 'Muster', wortlautQuelle: { behoerde: 'B', titel: 'T', lizenz: 'L' },
        anbieterName: 'A', angelegtAm: '2026-08-01' }] }),
    vorher:  (d) => d.schemaVersion === 65
                 && Array.isArray(d.importierteVorlagen)
                 && !('beleg' in d.importierteVorlagen[0]),
    nachher: (d) => d.schemaVersion >= 66
                 && Object.prototype.hasOwnProperty.call(d.importierteVorlagen[0], 'beleg')
                 && d.importierteVorlagen[0].beleg === null
                 && d.importierteVorlagen[0].wortlaut === 'Muster',
    geprueftIn: 'tests/zertifikat-slot-stufe66.test.js' },
  /* ── Die eine Migrationsstufe der Kette (Auftrag 2, 20.08.2026) ─────────────────────
     Vier Änderungen an gespeicherten Dateien in EINER Stufe — vier Stufen wären vier
     Rückweg-Proben am Bestandsdepot, und die Depot-Datei liegt allein beim Bürger.

     Sie legt den Schlüssel für behaltene Zusammenstellungen an (Auftrag 4 füllt ihn),
     versioniert die Format-Kennungen im Übergabe-Protokoll (F2) und MERKT den Umzug der
     Vertretungsgrundlage hinter das Sub-Passwort VOR (E1) — vollziehen kann sie ihn nicht:
     sie läuft mit dem Anker-Passwort, der Inhalt hängt am Sub-Passwort. Sie löscht darum
     nichts; `subDepotVertrauenOeffnen` zieht nach, sobald beide vorliegen. */
  { nach: 67, was: 'zusammenstellungen[] entsteht; export:<id> im Übergabe-Protokoll wird '
                 + 'export:<id>@<version> (F2); eine gesetzte vertretungsGrundlage wird für den '
                 + 'Umzug hinter das Sub-Passwort vorgemerkt, nicht gelöscht (E1) — Kette Auftrag 2',
    basis: () => Object.assign(basis(), { schemaVersion: 66,
      uebergabeProtokoll: [{ kennung: 'u-1', empfaenger: 'E', zweck: 'Z', umfang: 'U',
        zeitpunkt: '2026-08-01T00:00:00.000Z', herkunft: 'export:json' }],
      verwalteteDepots: [{ depotUUID: 'sub-1', bezeichnung: 'M', vertretungsGrundlage: 'betreuung' }] }),
    vorher:  (d) => d.schemaVersion === 66
                 && !Array.isArray(d.zusammenstellungen)
                 && d.uebergabeProtokoll[0].herkunft === 'export:json'
                 && d.verwalteteDepots[0].vertretungsGrundlage === 'betreuung'
                 && !d.verwalteteDepots[0].vertretungsGrundlageUmzugOffen,
    nachher: (d) => d.schemaVersion >= 67
                 && Array.isArray(d.zusammenstellungen) && d.zusammenstellungen.length === 0
                 && d.uebergabeProtokoll[0].herkunft === 'export:json@1'
                 && d.verwalteteDepots[0].vertretungsGrundlage === 'betreuung'
                 && d.verwalteteDepots[0].vertretungsGrundlageUmzugOffen === true,
    geprueftIn: 'tests/kette-02-migrationsstufe-67.test.js' },
  /* ── Der Ort für Anfragen (Kette, Auftrag 7, Zug 6 — 20.08.2026) ────────────────────
     Auftrag 4 hat den Bereich „Wer hat Sie gefragt" gebaut und ausdrücklich KEINEN
     Depot-Schlüssel angelegt; die Entscheidung, ob eine Anfrage überhaupt behalten werden
     muss, lag bei Auftrag 7. Sie ist gefallen: ja — „offen · beantwortet · abgelaufen"
     sind Aussagen über die Zeit, und was beim Schliessen verschwindet, kann nie
     beantwortet gewesen sein.

     EINE Stufe für Auftrag 7 UND 8: der Rückweg (Auftrag 8) schreibt in EINTRÄGE dieses
     Arrays, nicht in einen weiteren Depot-Schlüssel.

     Sie schreibt NICHTS um — vor ihr konnte keine Anfrage im Depot landen. */
  { nach: 68, was: 'anfragen[] entsteht — der Ort aus Auftrag 4 bekommt seinen Schlüssel; '
                 + 'die drei Zustände sind Aussagen über die Zeit und brauchen Dauer (Kette Auftrag 7)',
    basis: () => Object.assign(basis(), { schemaVersion: 67, zusammenstellungen: [] }),
    vorher:  (d) => d.schemaVersion === 67 && !Array.isArray(d.anfragen),
    nachher: (d) => d.schemaVersion >= 68
                 && Array.isArray(d.anfragen) && d.anfragen.length === 0,
    geprueftIn: 'tests/kette-07-die-anfrage.test.js' },

  /* ── 68 → 69 · der Slot für angedockte Bereiche (A389, Zug 2) ─────────────────────
     Das fünfte Einlass-Register braucht seinen Platz im Depot, wie `anfragen` ihn in
     der Stufe davor bekam. Mehr tut sie nicht.

     UND DAS IST DIE AUSSAGE, NICHT DIE BEQUEMLICHKEIT: der Fall, um den es bei einer
     austauschbaren Bereichsschicht geht — Schlüssel in `data.sektoren[<id>]`, die die
     laufende Bereichsliste nicht kennt —, hat seine Stufe schon (63→64, U2-ADR-144,
     Rettungsfeld-Muster U2-ADR-050), und die Rettung selbst läuft seither bei JEDEM
     Öffnen. Eine zweite Stufe für dieselbe Zusicherung wäre die zweite Migration, die
     die Regel „eine Stufe, nicht zwei" verbietet — und sie hätte nichts zu tun. */
  { nach: 69, was: 'bereichsModule[] entsteht — das fünfte Einlass-Register bekommt seinen Slot; '
                 + 'die Rettung unbekannter Bereichsschlüssel bleibt bei Stufe 63→64 (A389)',
    basis: () => Object.assign(basis(), { schemaVersion: 68, zusammenstellungen: [], anfragen: [] }),
    vorher:  (d) => d.schemaVersion === 68 && !Array.isArray(d.bereichsModule),
    nachher: (d) => d.schemaVersion >= 69
                 && Array.isArray(d.bereichsModule) && d.bereichsModule.length === 0,
    geprueftIn: 'tests/bereichs-module-einlass.test.js' },

  /* ── 69 → 70 · die Leser-Kennung wird versioniert (F1) ────────────────────────────
     Die Auflage aus U2-ADR-151 wird mit dem dritten und vierten Leser faellig: `json` und
     `vcard-erste` heissen ab jetzt `json@1`/`vcard-erste@1`, und die gespeicherten Module
     ziehen nach.

     SIE IST HEUTE LEER, UND DARUM LAEUFT SIE JETZT: kein Modul ist ausgeliefert. Nach dem
     ersten traegt dieselbe Stufe echte Buergerdaten um. Eine unbekannte Kennung bleibt
     unveraendert — sie ist ein Befund fuer den Einlassweg, kein Anlass zum Ueberschreiben. */
  { nach: 70, was: 'formatModule[].leser traegt die versionierte Kennung (json@1, vcard-erste@1); '
                 + 'eine unbekannte Kennung bleibt stehen (F1, U2-ADR-155)',
    basis: () => Object.assign(basis(), { schemaVersion: 69, zusammenstellungen: [], anfragen: [],
      bereichsModule: [], formatModule: [{ format: 'a', leser: 'json' }] }),
    vorher:  (d) => d.schemaVersion === 69 && d.formatModule[0].leser === 'json',
    nachher: (d) => d.schemaVersion >= 70 && d.formatModule[0].leser === 'json@1',
    geprueftIn: 'tests/leser-kennung-versioniert.test.js' },

  /* ── 70 → 71 · die Empfaengerkreise bekommen ihren Platz (U2-ADR-156) ─────────────
     Ein Kreis ist ein EMPFAENGER, kein Anlass; die Liste haelt fest, wer etwas bekommt und
     mit welchem Zuschnitt. Die Stufe legt nur den Schluessel an — rein additiv, kein Wert
     wird umgeschrieben und keiner gelesen.

     WARUM UEBERHAUPT EINE STUFE, wo ein Default gereicht haette: der Schluessel traegt
     kuenftig, WER etwas bekommt. Eine Stufe macht im Depot sichtbar, ab wann die Liste
     gefuehrt wird — ein stillschweigend aufgetauchter Schluessel liesse offen, ob „leer"
     nie eingerichtet oder verloren heisst. */
  { nach: 71, was: 'empfaengerkreise[] entsteht — die Liste der Menschen, die einen Ausschnitt '
                 + 'bekommen (U2-ADR-142)',
    basis: () => Object.assign(basis(), { schemaVersion: 70, zusammenstellungen: [], anfragen: [],
      bereichsModule: [], formatModule: [] }),
    vorher:  (d) => d.schemaVersion === 70 && !Array.isArray(d.empfaengerkreise),
    nachher: (d) => d.schemaVersion >= 71
                 && Array.isArray(d.empfaengerkreise) && d.empfaengerkreise.length === 0,
    geprueftIn: 'tests/empfaengerkreise-zuschnitt.test.js' },

  /* ── 71 → 72 · die Tafel der gehobenen Blatt-Felder (U2-ADR-157) ──────────────────
     Ein Modul schlaegt vor, die Buergerin hebt. Die Stufe legt nur die Tafel an — rein
     additiv, kein Wert wird umgeschrieben.

     WARUM EIN EIGENER SCHLUESSEL und nicht eine Marke an der Modul-Definition: die
     Definition gehoert dem MODUL, das Heben der BUERGERIN. Stuenden beide an derselben
     Stelle, ueberschriebe die naechste Lieferung des Anbieters ihre Entscheidung. */
  { nach: 72, was: 'blattFelder{} entsteht — was die Buergerin selbst auf ein Angehoerigen-Blatt '
                 + 'gehoben hat (U2-ADR-157)',
    basis: () => Object.assign(basis(), { schemaVersion: 71, zusammenstellungen: [], anfragen: [],
      bereichsModule: [], formatModule: [], empfaengerkreise: [] }),
    vorher:  (d) => d.schemaVersion === 71 && !d.blattFelder,
    nachher: (d) => d.schemaVersion >= 72 && d.blattFelder && typeof d.blattFelder === 'object'
                 && Object.keys(d.blattFelder).length === 0,
    geprueftIn: 'tests/blatt-vorschlag-und-heben.test.js' },

  /* ── 72 → 73 · die Angehoerigen-Abschrift wird GETILGT (F5 Zug 2) ─────────────────
     `data.angehoerigenCache` war ein verschluesselter Schnappschuss der fuenf Blaetter. Er
     ist entfallen; die Empfaengerkreise geben statt einer Kopie einen Schluessel.

     ES IST EIN ECHTES LOESCHEN, und das ist hier richtig: der Wert ist mit einem Passwort
     verschluesselt, fuer das es keinen Eingang mehr gibt. Ihn zu behalten hiesse, Buergerdaten
     in einer Form aufzubewahren, die niemand mehr lesen kann. Die Daten selbst standen ohnehin
     im Depot — die Abschrift war eine Kopie, kein Original. */
  { nach: 73, was: 'angehoerigenCache wird getilgt — die Angehoerigen-Abschrift faellt (F5 Zug 2)',
    basis: () => Object.assign(basis(), { schemaVersion: 72, zusammenstellungen: [], anfragen: [],
      bereichsModule: [], formatModule: [], empfaengerkreise: [], blattFelder: {},
      angehoerigenCache: { v: 2, salt: 'x', iv: 'y', ct: 'z', stand: '2026-07-01T00:00:00.000Z' } }),
    vorher:  (d) => d.schemaVersion === 72 && typeof d.angehoerigenCache !== 'undefined',
    nachher: (d) => d.schemaVersion >= 73 && !('angehoerigenCache' in d),
    geprueftIn: 'tests/f5-zug2-abschrift-entfaellt.test.js' },

  /* ── 73 → 74 · DER GEMEINSAME BUMP AM ENDE DES SCHNITTS (Laufzettel „Der Schnitt", A492) ──
     Keine eigene Reformierung an dieser Stufe selbst: alle sechs Glieder (Gueltigkeitsbeginn,
     Bereichsschicht, Korb-1 mehrwertig, Rechtsraum im Textsatz-Schluessel, Bereiche-Objektform,
     Modul-Beschriftungen je Sprache) liefen als UNBEDINGTE, additive Funktionen ohne eigenes
     Schema-Gate — ein Depot aus Schema 73 verhaelt sich nach dieser Zeile zeichengleich wie
     vorher, nur die Zahl steigt. Die einzelnen Umbauten sind je in ihrer eigenen Testdatei
     belegt (schnitt-glied3-fuenf-pruefsteine, persona-p19-p20, beispielbuendel,
     schnitt-glied6-modul-beschriftungen); dieser Eintrag belegt nur den Sprung selbst. */
  { nach: 74, was: 'der gemeinsame Schema-Bump der Schnitt-Kampagne — keine eigene Reformierung, nur die Zahl steigt',
    basis: () => Object.assign(basis(), { schemaVersion: 73, zusammenstellungen: [], anfragen: [],
      bereichsModule: [], formatModule: [], empfaengerkreise: [], blattFelder: {} }),
    vorher:  (d) => d.schemaVersion === 73,
    nachher: (d) => d.schemaVersion >= 74,
    geprueftIn: 'tests/schnitt-glied6-modul-beschriftungen.test.js' },

  /* ── 74 → 75 · Feld-Remarkierung: `finanzen.bav_rentenbeginn` von `laeuftAb` auf `giltAb` ──
     Ein Rentenbeginn ist ein Beginn, keine endende Gültigkeit — die Marke war seit dem
     allerersten Commit dieses Feldes falsch. Beide Marken schreiben den Rohwert nicht in den
     Sektor, sondern nach `data.feldGueltigkeit[…]` — `laeuftAb` nach `.bis`, `giltAb` nach
     `.von`. Ein Bestandswert unter `.bis` wandert darum physisch nach `.von`, sonst würde er
     für den jetzt erwarteten Lesepfad unsichtbar. */
  { nach: 75, was: 'finanzen.bav_rentenbeginn wechselt von laeuftAb auf giltAb — Bestandswert wandert .bis → .von',
    basis: () => Object.assign(basis(), { schemaVersion: 74, zusammenstellungen: [], anfragen: [],
      bereichsModule: [], formatModule: [], empfaengerkreise: [], blattFelder: {},
      feldGueltigkeit: { finanzen: { bav_rentenbeginn: { bis: '2035-01-01' } } } }),
    vorher:  (d) => d.schemaVersion === 74 && d.feldGueltigkeit.finanzen.bav_rentenbeginn.bis === '2035-01-01'
      && d.feldGueltigkeit.finanzen.bav_rentenbeginn.von == null,
    nachher: (d) => d.schemaVersion >= 75 && d.feldGueltigkeit.finanzen.bav_rentenbeginn.von === '2035-01-01'
      && d.feldGueltigkeit.finanzen.bav_rentenbeginn.bis == null,
    geprueftIn: 'tests/feld-remarkierung-bav-rentenbeginn.test.js' },

  /* ── 75 → 76 · situationsModule[]/situationFeldDefinitionen[] entstehen (U2-ADR-246) ──────
     Wörtlicher Spiegel der Stufe 68→69 oben (bereichsModule): das achte Einlass-Register
     (`situation`) bekommt seine zwei Slots — das Modul-Array selbst und die daraus
     übersetzten, situationseigenen Feld-Definitionen. Additiv wie dort: ein Alt-Depot
     erhält zwei leere Listen, nichts geht verloren. */
  { nach: 76, was: 'situationsModule[]/situationFeldDefinitionen[] entstehen — das achte Einlass-Register '
                 + '(situation) bekommt seine Slots (U2-ADR-246)',
    basis: () => Object.assign(basis(), { schemaVersion: 75, zusammenstellungen: [], anfragen: [] }),
    vorher:  (d) => d.schemaVersion === 75 && !Array.isArray(d.situationsModule) && !Array.isArray(d.situationFeldDefinitionen),
    nachher: (d) => d.schemaVersion >= 76
                 && Array.isArray(d.situationsModule) && d.situationsModule.length === 0
                 && Array.isArray(d.situationFeldDefinitionen) && d.situationFeldDefinitionen.length === 0,
    geprueftIn: 'tests/situations-modul-andockbar.test.js' },
  { nach: 77, was: 'wizardsModule[] entsteht — das neunte Einlass-Register (wizard) bekommt '
                 + 'seinen Slot (U2-ADR-250). Kein zweiter Slot (anders als bei situation): ein '
                 + 'Assistenten-Schritt trägt sein Feld immer inline, keine externe Vorlagen-Übersetzung.',
    basis: () => Object.assign(basis(), { schemaVersion: 76, situationsModule: [], situationFeldDefinitionen: [] }),
    vorher:  (d) => d.schemaVersion === 76 && !Array.isArray(d.wizardsModule),
    nachher: (d) => d.schemaVersion >= 77
                 && Array.isArray(d.wizardsModule) && d.wizardsModule.length === 0,
    geprueftIn: 'tests/wizards-modul-andockbar.test.js' },
  { nach: 78, was: 'ereignisAchseModule[] entsteht — das zehnte Einlass-Register (ereignisAchse) '
                 + 'bekommt seinen Slot (U2-ADR-251). Kein zweiter Slot — ein Ereignis-Achse-Eintrag '
                 + 'trägt nie externen Vorlagen-Inhalt.',
    basis: () => Object.assign(basis(), { schemaVersion: 77, wizardsModule: [] }),
    vorher:  (d) => d.schemaVersion === 77 && !Array.isArray(d.ereignisAchseModule),
    nachher: (d) => d.schemaVersion >= 78
                 && Array.isArray(d.ereignisAchseModule) && d.ereignisAchseModule.length === 0,
    geprueftIn: 'tests/ereignis-achse-modul-andockbar.test.js' },
  { nach: 79, was: 'Erbschein-Vorbereitungsauszug wird ab Werk selbst eingelassen (U2-ADR-288) — '
                 + 'schliesst die seit dem Siebtes-Register-Umbau (27.08.2026) ausgelieferte '
                 + 'Regression: kein Weg erreichte ein reales Depot. EINMALIG, an den '
                 + 'Versionssprung selbst gebunden (nicht bei jedem Laden) — eine Buergerin, die '
                 + 'das Modul spaeter selbst entfernt, bleibt danach unberuehrt.',
    basis: () => Object.assign(basis(), { schemaVersion: 78, ereignisAchseModule: [] }),
    vorher:  (d) => d.schemaVersion === 78
                 && !(Array.isArray(d.logikModule) && d.logikModule.some((m) => m && m.id === 'erbschein-vorbereitung')),
    nachher: (d) => d.schemaVersion >= 79
                 && Array.isArray(d.logikModule) && d.logikModule.some((m) => m && m.id === 'erbschein-vorbereitung'),
    geprueftIn: 'tests/erbschein-ab-werk-einlass.test.js' },
  { nach: 80, was: 'Beratungshilfe-Vorbereitungsauszug wird ab Werk selbst eingelassen '
                 + '(U2-ADR-326) — zweiter Zweck der Template-Familie zugang-zum-recht, gleiche '
                 + 'Bauart wie Stufe 79. Der Filter nennt AUSDRUECKLICH nur die neue Kennung: '
                 + 'liefe die Stufe ueber alle Ab-Werk-Buendel, bekaeme eine Buergerin, die '
                 + 'einen frueher nachgelieferten Auszug selbst entfernt hat, ihn wieder.',
    basis: () => Object.assign(basis(), { schemaVersion: 79, ereignisAchseModule: [] }),
    vorher:  (d) => d.schemaVersion === 79
                 && !(Array.isArray(d.logikModule) && d.logikModule.some((m) => m && m.id === 'zugang-zum-recht-beratungshilfe')),
    nachher: (d) => d.schemaVersion >= 80
                 && Array.isArray(d.logikModule) && d.logikModule.some((m) => m && m.id === 'zugang-zum-recht-beratungshilfe'),
    geprueftIn: 'tests/zugang-zum-recht-ab-werk-einlass.test.js' },
  { nach: 81, was: 'Kennungs-Umbau „Englisch vor v1": Bereichs-, Feld- und Unterfeld-Kennungen '
                 + 'wandern nach docs/umbau-englisch-vor-v1/kennung-mapping.json '
                 + '(_sektorenKennungenUmschreiben). Nur die Schluessel wandern, die Werte bleiben.',
    basis: () => basis(80, { identitaet: { vorname: 'Maria' } }, { ereignisAchseModule: [] }),
    vorher:  (d) => d.schemaVersion === 80
                 && !!d.sektoren.identitaet && d.sektoren.identitaet.vorname === 'Maria',
    nachher: (d) => d.schemaVersion >= 81 && !d.sektoren.identitaet
                 && !!d.sektoren.identity && d.sektoren.identity.givenName === 'Maria',
    geprueftIn: 'tests/schema-81-kennungen-migration.test.js' },
  { nach: 82, was: 'Vereinbarung am Uebergabe-Eintrag und Festlegung der Person (MyTerms v1-Schnitt, '
                 + 'Teile A und D): beide optional und additiv; die Stufe bereinigt nur, was schon da ist — '
                 + 'eine Vereinbarung oder Festlegung, die die Pruefung nicht besteht, wird entfernt.',
    basis: () => basis(81, {}, { ereignisAchseModule: [], uebergabeProtokoll: [
      { kennung: 'k1', empfaenger: 'A', zweck: 'B', umfang: 'C', zeitpunkt: '2026-01-01T00:00:00Z', herkunft: 'manuell',
        vereinbarung: { status: 'angenommen' } }] }),
    vorher:  (d) => d.schemaVersion === 81 && 'vereinbarung' in d.uebergabeProtokoll[0],
    nachher: (d) => d.schemaVersion >= 82 && !('vereinbarung' in d.uebergabeProtokoll[0])
                 && d.uebergabeProtokoll[0].empfaenger === 'A',
    geprueftIn: 'tests/uebergabe-bedingung-annahme.test.js' },
  { nach: 83, was: 'Von der Datei mitgebrachte Angehoerigen-Vorlagen (Angehoerigen-Blaetter sind Template, '
                 + 'kein Geruest): data.angehoerigenVorlagenModule[], wortgleicher Spiegel von '
                 + 'situationsModule. Additiv und rueckwaerts-tolerant: ein Alt-Depot bekommt eine leere '
                 + 'Liste, ein vorhandener Inhalt bleibt.',
    basis: () => basis(82, {}, { ereignisAchseModule: [], situationsModule: [] }),
    vorher:  (d) => d.schemaVersion === 82 && !('angehoerigenVorlagenModule' in d),
    nachher: (d) => d.schemaVersion >= 83
                 && Array.isArray(d.angehoerigenVorlagenModule) && d.angehoerigenVorlagenModule.length === 0,
    geprueftIn: 'tests/angehoerigen-vorlagen-modul.test.js' },
  { nach: 84, was: 'Dokumenttyp-Codes umbenannt (Englisch vor v1, DoD-Punkt 2, ERSTE von ZWEI Stufen, '
                 + '20.09.2026): NUR die sieben einfachen Codes ohne eigenen Generator '
                 + '(personalausweis->national-id-card, reisepass->passport, fuehrerschein->driving-licence, '
                 + 'krankenkassenkarte->health-insurance-card, schwerbehindertenausweis->severe-disability-card, '
                 + 'aufenthaltstitel->residence-permit; elefand bleibt Eigenname). Die sechs komplexen Typen mit '
                 + 'eigenem Generator wandern erst in einer eigenen L4-Stufe (Daten und Kern-Code zusammen) - kein '
                 + 'doppelter Serialisierungs-Kontrollpunkt fuer eine Uebersetzungsschicht. Fuellt zusaetzlich die '
                 + 'Mitschrift-Faecher situationen/angehoerigen aus dem lebenden Template nach (Zuarbeit -cf).',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/schema-84-kennungen-migration.test.js. */
    baue: () => basis(83, {}, { dokumente: [{ id: 'd84', typ: 'personalausweis', name: 'Personalausweis Maria' }] }),
    vorher:  (d) => d.dokumente[0].typ === 'personalausweis',
    nachher: (d) => d.dokumente[0].typ === 'national-id-card' && d.dokumente[0].name === 'Personalausweis Maria' },
  { nach: 85, was: 'Finanzen: der Freitext vj_versicherungen der Situation Volljaehrigkeit wandert einmalig als '
                 + 'ein Eintrag (Feld note) nach finance.privateInsurancePolicies (U2-ADR-424, 20.09.2026); '
                 + 'der alte Rohwert bleibt im Depot stehen, die Migration ist ueber einen Inhalts-Check idempotent.',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/finanzen-versicherungen-und-p-konto.test.js. */
    baue: () => basis(83, {}, { urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {},
      situationen: { volljaehrig: { vj_versicherungen: 'Privathaftpflicht eigener Vertrag; Hausrat für die Wohnung' } } }),
    vorher:  (d) => !(d.sektoren.finance && d.sektoren.finance.privateInsurancePolicies),
    nachher: (d) => {
      const l = d.sektoren.finance && d.sektoren.finance.privateInsurancePolicies;
      return Array.isArray(l) && l.length === 1 && l[0].note === 'Privathaftpflicht eigener Vertrag; Hausrat für die Wohnung';
    } },
  { nach: 86, was: 'Dokumenttyp-Codes umbenannt (Englisch vor v1, DoD-Punkt 2, ZWEITE von ZWEI '
                 + 'Stufen, L4, Entscheidung 20.09.2026): die sechs komplexen Dokumenttyp-Codes '
                 + 'mit eigenem Generator/Wizard, Daten UND Kern-Code je Code im selben Commit - waechst '
                 + 'Code fuer Code (bisher: bankvollmacht->bank-power-of-attorney, 20.09.2026), nie Daten '
                 + 'ohne den passenden Dispatch. DOKUMENTTYP_ALT_ZU_NEU_L4 im Kern fuehrt den '
                 + 'Baufortschritt.',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/schema-86-l4-kennungen-migration.test.js. */
    baue: () => basis(85, { advanceCare: { provisionInstruments: [{ instrument: 'testament', storageLocation: 'Schreibtisch oben links' }] } },
      { dokumente: [{ id: 'd86', typ: 'testament', name: 'Testament Maria' }] }),
    vorher:  (d) => d.dokumente[0].typ === 'testament' && d.sektoren.advanceCare.provisionInstruments[0].instrument === 'testament',
    nachher: (d) => d.dokumente[0].typ === 'will'
                 && d.sektoren.advanceCare.provisionInstruments[0].instrument === 'will'
                 && d.sektoren.advanceCare.provisionInstruments[0].storageLocation === 'Schreibtisch oben links' },
  { nach: 87, was: 'Erbschein-Vorbereitungsauszug ist Template im Rezept (Gerüst-Schnitt S5-Rest, 21.09.2026): eine Kopie, '
                 + 'die die Stufen 79/81 in das Depot schrieben, wird entfernt, wenn das öffnende Produkt das Modul '
                 + 'selbst trägt (sie würde es sonst verdecken); trägt es das Produkt nicht, bleibt die Kopie stehen.',
    geprueftIn: 'tests/schema-87-erbschein-template.test.js' },
  { nach: 88, was: 'Personenregister englisch (DoD-Punkt 2, 23.09.2026): data.menschen[] traegt Geburtsdatum, '
                 + 'Geburtsjahr und Geburtsort als birthDate, yearOfBirthIfTheExactDayIs, birthPlace - dieselben '
                 + 'Namen wie der Bereich identity. Steht der neue Name schon, gewinnt er; der alte wird entfernt.',
    /* B8 (23.09.2026): gebaute Alt-Datei statt `geprueftIn`, damit tests/lese-app-migrations-paritaet.test.js
       diese Stufe auch durch die Lese-App schickt. Die ausführliche Probe bleibt tests/schema-88-personenregister-englisch.test.js. */
    baue: () => basis(87, {}, { menschen: [{ id: 'p1', name: 'Maria Mustermann', geburtsdatum: '1950-01-02',
      geburtsjahr: '1950', geburtsort: 'Köln-Ehrenfeld' }] }),
    vorher:  (d) => d.menschen[0].geburtsort === 'Köln-Ehrenfeld' && d.menschen[0].birthPlace === undefined,
    nachher: (d) => d.menschen[0].birthPlace === 'Köln-Ehrenfeld' && d.menschen[0].birthDate === '1950-01-02'
                 && d.menschen[0].yearOfBirthIfTheExactDayIs === '1950' && d.menschen[0].geburtsort === undefined },
];

module.exports = { STUFEN, basis };
