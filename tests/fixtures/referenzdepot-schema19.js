'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Referenzdepot Schema 19 — das vollständig befüllte Alt-Depot für die Ganzketten-Probe
   (Auftrag, 03.09.2026, Zug 1 nach der Zug-0-Messung)
   ────────────────────────────────────────────────────────────────────────
   GEGENSTÜCK zu `referenzdepot.js` (dort: vollständig befüllt am AKTUELLEN Schema, für
   Einzelstufen-Rückweg-Proben) — hier: vollständig befüllt am ÄLTESTEN belegten Schema
   (19, `schema-governance-guard.test.js`, `ERSTES_BELEGTES`), für die GANZE Kette in
   einem Durchlauf.

   HERKUNFT JEDES ALT-FELDS: aus `depotNormalisieren()` (vivodepot.html:33332-34713) und
   `tests/fixtures/migrations-stufen.js` rekonstruiert, NICHT erfunden. Wo ein Feld heute
   unverändert ist (kein Migrations-Kommentar berührt es), trägt es denselben Namen wie
   referenzdepot.js. Wo eine Stufe es umformt, trägt es die ALTE Form — Feldname und Typ,
   wie der jeweilige Migrations-Block sie VOR seinem eigenen Lauf erwartet.

   WERTE SIND SENTINELS, KEINE PERSONA: anders als referenzdepot.js (das für UI-Proben
   realistisch aussehen muss) sind die Werte hier bewusst als `V19_<sektor>_<feld>` bzw.
   `V19ALT_<...>` codiert — jeder Wert muss nach der Migration EINZELN wiederfindbar sein
   (Verwaisungs-Regel: „jeder Wert überlebt irgendwo"). Ein realistischer Name wäre dafür
   schlechter geeignet als ein grep-barer Sentinel.

   AUSGENOMMEN, EXPLIZIT (nicht geraten):
   · Sektor `vermoegen` — existierte bei V19 nicht (ganzer Sektor erst 30.08.2026, außerhalb
     der 24→75-Kette).
   · `krisenvorsorge` als EIGENER Sektor — existierte bei V19 nicht (erst Stufe 50); seine
     24 Kernfelder liegen hier stattdessen unter `verwaltung` (ihrem V19-Ort), mit
     denselben Feldnamen. Die 6 BBK-Zusatzfelder (24.08.2026) fehlen ganz — echt neu.
   · `testament_vorhanden`/`testament_ort`/`testament_datum` — zwei sich widersprechende
     Kommentare gefunden (Stufe 39: „die anderen fünf Instrumente [inkl. Testament] werden
     NICHT migriert"; Stufe 52: „testament ist bereits mit Schema 39 migriert... hier
     ausgenommen"). Keiner der 52 `schemaVersion<N`-Blöcke transformiert diese drei Felder
     tatsächlich (grep-geprüft) — die Abschaffung lief über U2-ADR-096, außerhalb der
     nummerierten Kette. GEMELDET, NICHT GERATEN: hier bewusst ausgelassen, kostet keine
     Stufen-Deckung (keine der 52 Stufen hängt an diesen drei Feldern).
   ════════════════════════════════════════════════════════════════════════ */

const S = 'V19_';       // unveraendert seit V19 — Sentinel-Präfix
const A = 'V19ALT_';    // Alt-Form, wird von einer Stufe umgeformt — Sentinel-Präfix

function baueSektorenSchema19() {
  return {
    // ── identitaet (existierte bei V19) ─────────────────────────────────
    identitaet: {
      vorname: S + 'identitaet_vorname', nachname: S + 'identitaet_nachname',
      geburtsdatum: '1955-03-14', telefon: S + 'identitaet_telefon',
      strasse: S + 'identitaet_strasse', plz_ort: S + 'identitaet_plz_ort',
      email: S + 'identitaet_email', nationalitaet: S + 'identitaet_nationalitaet',
      geburtsname: S + 'identitaet_geburtsname', geburtsort: S + 'identitaet_geburtsort',
      geschlecht: S + 'identitaet_geschlecht', familienstand: S + 'identitaet_familienstand',
      gueterstand: S + 'identitaet_gueterstand', trennungsdatum: '1998-06-01',
      // Stufe 73→74 (Korb 1): ausweis wurde aus drei Flachfeldern gefaltet.
      ausweis_nr: A + 'identitaet_ausweis_nr',
      ausweis_ausgestellt: A + 'identitaet_ausweis_ausgestellt',
      ausweis_gueltig: A + 'identitaet_ausweis_gueltig',
      profilfoto: S + 'identitaet_profilfoto', notizen_start: S + 'identitaet_notizen_start',
      // Stufe 58: heirat_namenswahl war Freitext.
      heirat_namenswahl: A + 'identitaet_heirat_namenswahl_ALT_FREITEXT',
      umzug_ummeldung: S + 'identitaet_umzug_ummeldung',
      // Stufe 35: haustiere waren fuenf Flachfelder fuer EIN Tier.
      tier_name: A + 'identitaet_tier_name', tier_betreuung: A + 'identitaet_tier_betreuung',
      tier_tierarzt: A + 'identitaet_tier_tierarzt', tier_futter: A + 'identitaet_tier_futter',
      tier_sonstiges: A + 'identitaet_tier_sonstiges',
      // aufenthaltstitel(_art), nachname2, geburtsjahr, fruehere_namen: alle NACH V19 (Stufe 54 bzw. additiv) — ausgelassen.
    },

    // ── meine-menschen (existierte bei V19) ─────────────────────────────
    'meine-menschen': {
      pflege_hauptperson: S + 'mm_pflege_hauptperson', pflegezeit: S + 'mm_pflegezeit',
      ehepartner: S + 'mm_ehepartner',
      // Stufe 42: kinder-Unterfelder hiessen kind/kind_beziehung; plus ein separates
      // Freitextfeld `schutzbefohlene`, das als eigene Zeile eingefaltet wurde.
      kinder: [
        { kind: A + 'mm_kind_1_name', kind_beziehung: A + 'mm_kind_1_beziehung' },
        { kind: A + 'mm_kind_2_name', kind_beziehung: A + 'mm_kind_2_beziehung' },
      ],
      schutzbefohlene: A + 'mm_schutzbefohlene_ALT_FREITEXT',
      unterhalt: [{ richtung: S + 'mm_unterhalt_richtung' }],
      // gebwiz_kind_*: additiv, NACH V19 — ausgelassen.
    },

    // ── mobilitaet (existierte bei V19) ──────────────────────────────────
    mobilitaet: {
      // Stufe 57 (F4 Zug 3): fuehrerschein/studium waren Freitext.
      fuehrerschein: A + 'mobil_fuehrerschein_ALT_FREITEXT',
      fuehrerschein_gueltig: '2030-01-01',
      // Stufe 43 (C10): kfz_versicherung war Freitext.
      kfz_versicherung: A + 'mobil_kfz_versicherung_ALT_FREITEXT',
      kfz_versicherung_nr: S + 'mobil_kfz_versicherung_nr',
      d_ticket: S + 'mobil_d_ticket', reisepass_nr: S + 'mobil_reisepass_nr',
      reisepass_ausgestellt: '2015-01-01', reisepass_gueltig: '2030-01-01',
      // Stufe 73→74 (Korb 1): elefand war drei Flachfelder.
      elefand_nr: A + 'mobil_elefand_nr', elefand_laender: A + 'mobil_elefand_laender',
      elefand_gueltig: A + 'mobil_elefand_gueltig',
      // Stufe 56 (F4 Zug 2): botschaft war Freitext.
      botschaft: A + 'mobil_botschaft_ALT_FREITEXT',
      // Stufe 35: fahrzeuge waren vier Flachfelder fuer ZWEI Fahrzeuge.
      auto1: A + 'mobil_auto1', auto1_ausweis: A + 'mobil_auto1_ausweis',
      auto2: A + 'mobil_auto2', auto2_leasing: A + 'mobil_auto2_leasing',
    },

    // ── finanzen (existierte bei V19) ────────────────────────────────────
    finanzen: {
      // Stufe 73→74 (Korb 1): steuerid selbstreferenziell (Skalar -> Skalar, nur Korb-Faltung).
      steuerid: A + 'fin_steuerid',
      bav_name: S + 'fin_bav_name', bav_nr: S + 'fin_bav_nr',
      // Stufe 75: bav_rentenbeginn lag unter feldGueltigkeit....bis, nicht .von.
      bav_rentenbeginn: '2025-01-01',
      private_av_institut: S + 'fin_private_av_institut', private_av_nr: S + 'fin_private_av_nr',
      private_av_ablauf: '2028-01-01',
      steuerberater: S + 'fin_steuerberater', steuerberater_tel: S + 'fin_steuerberater_tel',
      steuer_ablage: S + 'fin_steuer_ablage', steuer_software: S + 'fin_steuer_software',
      steuer_besonders: S + 'fin_steuer_besonders', finanzberater: S + 'fin_finanzberater',
      schulden: S + 'fin_schulden', wertgegenstaende: S + 'fin_wertgegenstaende',
      digitale_guthaben: S + 'fin_digitale_guthaben', forderungen: S + 'fin_forderungen',
      // Stufe 41: nachlass_vermoegen war EIN Freitextfeld mit vier Werten gemischt (U2-ADR-104).
      nachlass_vermoegen: A + 'fin_nachlass_vermoegen_ALT_FREITEXT_VIER_WERTE',
      // Stufe 37 (dann 43, bank->ref): konten waren zwei Flachfelder.
      konto_haupt_bank: A + 'fin_konto_haupt_bank', konto_haupt_iban: A + 'fin_konto_haupt_iban',
      // Stufe 35: kreditkarten waren zwei Flachfelder.
      kreditkarte1: A + 'fin_kreditkarte1', kreditkarte2: A + 'fin_kreditkarte2',
      // Vor V19 schon abgeschafft laut Stufe 63 -> hier als V19-only-Feld, geht bei 63 in
      // sozialversicherung.rentenversicherungsnummer auf, falls dort abweichend befuellt.
      dt_rentenversicherungsnr: A + 'fin_dt_rentenversicherungsnr',
      // bav_durchfuehrungsweg: additiv, NACH V19 — ausgelassen.
    },

    // ── gesundheit (existierte bei V19) ──────────────────────────────────
    gesundheit: {
      hausarzt: S + 'ges_hausarzt', behandlung_aktuell: S + 'ges_behandlung_aktuell',
      blutgruppe: S + 'ges_blutgruppe',
      // Stufe 38: allergien/krankheiten/medikamente waren Skalar (Freitext oder codiert).
      allergien: A + 'ges_allergien_ALT_SKALAR', krankheiten: A + 'ges_krankheiten_ALT_SKALAR',
      medikamente: A + 'ges_medikamente_ALT_SKALAR',
      // Stufe 43 (C10): kv_art war Freitext.
      kv_art: A + 'ges_kv_art_ALT_FREITEXT', kv_nummer: S + 'ges_kv_nummer',
      // Stufe 25 (die ERSTE feldspezifische Migration der Kette): impfungen/implantate
      // waren codierte Werte {anzeigeName, system, code}. system/code faellt ABSICHTLICH
      // weg (erlaubterVerlust, migrations-stufen.js:66) — nur der Anzeigename ueberlebt.
      impfungen: { anzeigeName: A + 'ges_impfungen_ANZEIGENAME', system: 'http://x', code: 'IMPF1' },
      implantate: { anzeigeName: A + 'ges_implantate_ANZEIGENAME', system: 'http://x', code: 'IMPL1' },
      koerpergroesse: S + 'ges_koerpergroesse', koerpergewicht: S + 'ges_koerpergewicht',
      impfbuch_ort: S + 'ges_impfbuch_ort',
      // Stufe 33: hauptpflegeperson war Einzel-Ref {ref,override} oder String.
      hauptpflegeperson: A + 'ges_hauptpflegeperson_ALT_NAME',
      kv_versicherter: S + 'ges_kv_versicherter', kv_zusatz: S + 'ges_kv_zusatz',
      // Stufe 73->74 (Korb 1): krankenkassenkarte war zwei Flachfelder.
      krankenkassenkarte_ort: A + 'ges_krankenkassenkarte_ort',
      krankenkassenkarte_gueltig: A + 'ges_krankenkassenkarte_gueltig',
      notfallkarte_ort: S + 'ges_notfallkarte_ort', rauchen: S + 'ges_rauchen',
      alkohol: S + 'ges_alkohol', arztberichte_stick: S + 'ges_arztberichte_stick',
      vorsorge_uebersicht: S + 'ges_vorsorge_uebersicht', zahnarzt: S + 'ges_zahnarzt',
      bonusheft_ort: S + 'ges_bonusheft_ort', ehic_nr: S + 'ges_ehic_nr',
      // Stufe 41: voroperationen/familienanamnese waren EIN Freitextfeld mit ";"-Eintraegen.
      voroperationen: A + 'ges_voroperationen_ALT_FREITEXT_SEMIKOLON',
      familienanamnese: A + 'ges_familienanamnese_ALT_FREITEXT_SEMIKOLON',
      // Stufe 34: fachaerzte waren drei Flachfelder.
      facharzt_1: A + 'ges_facharzt_1', facharzt_2: A + 'ges_facharzt_2', facharzt_3: A + 'ges_facharzt_3',
    },

    // ── bildung (existierte bei V19) ─────────────────────────────────────
    bildung: {
      // Stufe 57: schulabschluss/studium waren Freitext.
      schulabschluss: A + 'bild_schulabschluss_ALT_FREITEXT',
      schulabschluss_jahr: S + 'bild_schulabschluss_jahr', schule_name: S + 'bild_schule_name',
      // Stufe 60: ausbildung war Freitext.
      ausbildung: A + 'bild_ausbildung_ALT_FREITEXT',
      studium: A + 'bild_studium_ALT_FREITEXT',
      studium_fach: S + 'bild_studium_fach', studium_hochschule: S + 'bild_studium_hochschule',
      studium_jahr: S + 'bild_studium_jahr', dok_abschluss: S + 'bild_dok_abschluss',
      beruf: S + 'bild_beruf', arbeitgeber: S + 'bild_arbeitgeber',
      arbeitsvertrag_befristet_bis: '2027-01-01', arbeitgeber_adresse: S + 'bild_arbeitgeber_adresse',
      letzter_arbeitgeber: S + 'bild_letzter_arbeitgeber',
      // Stufe 55 (F4 Zug 1): einkommensart war Freitext (kommagetrennt).
      einkommensart: A + 'bild_einkommensart_ALT_FREITEXT_KOMMA',
      brutto_monat: S + 'bild_brutto_monat', netto_monat: S + 'bild_netto_monat',
      gehaltsnachweis_ort: S + 'bild_gehaltsnachweis_ort', qualifikationen: S + 'bild_qualifikationen',
      ehrenamt: S + 'bild_ehrenamt', zeugnis_schule_ort: S + 'bild_zeugnis_schule_ort',
      zeugnis_ausbildung_ort: S + 'bild_zeugnis_ausbildung_ort',
      zeugnis_studium_ort: S + 'bild_zeugnis_studium_ort', zeugnis_arbeit_ort: S + 'bild_zeugnis_arbeit_ort',
    },

    // ── sozialversicherung (existierte bei V19) ──────────────────────────
    sozialversicherung: {
      // Stufe 73->74 (Korb 1): rentenversicherung war rentenversicherungsnummer (Skalar).
      rentenversicherungsnummer: A + 'sv_rentenversicherungsnummer',
      // Stufe 43 (C10): pflegekasse war Freitext.
      pflegekasse: A + 'sv_pflegekasse_ALT_FREITEXT',
      // Stufe 73->74 (Korb 1): pflegekasse_nummer war pflegekasse_nr.
      pflegekasse_nr: A + 'sv_pflegekasse_nr',
      pflegekasse_tel: S + 'sv_pflegekasse_tel', pflegegrad: S + 'sv_pflegegrad',
      pflegegrad_seit: '2020-01-01', pflegegrad_befristet_bis: '2027-01-01',
      pflegegrad_bescheid_vom: '2020-02-01',
      pflegedienst: S + 'sv_pflegedienst',
      // Stufe 57: pflegegeld war Freitext.
      pflegegeld: A + 'sv_pflegegeld_ALT_FREITEXT',
      pflegegeld_betrag: S + 'sv_pflegegeld_betrag',
      gdb: S + 'sv_gdb',
      // Stufe 49: gdb_merkmale war komma-getrennter Skalar-String.
      gdb_merkmale: A + 'sv_gdb_merkmale_ALT_KOMMA',
      gdb_nachpruefung: '2026-01-01',
      // Stufe 73->74 (Korb 1): schwerbehindertenausweis war zwei Flachfelder.
      schwerbehindertenausweis_ort: A + 'sv_schwerbehindertenausweis_ort',
      schwerbehindertenausweis_gueltig: A + 'sv_schwerbehindertenausweis_gueltig',
      pflegeheim: S + 'sv_pflegeheim', pflegevertrag_ort: S + 'sv_pflegevertrag_ort',
      kuendigungsdatum: '2026-01-01', meldung_arbeitsuchend_am: '2026-01-01',
      arbeitslosmeldung_am: '2026-01-01', bescheid_agentur: S + 'sv_bescheid_agentur',
    },

    // ── vorsorge (existierte bei V19; komplexeste Kette im ganzen Modell) ─
    vorsorge: {
      pflege_vorsorge_geprueft: S + 'vor_pflege_vorsorge_geprueft',
      // Stufe 31: erben war Einzel-Ref {ref,override} oder String.
      erben: A + 'vor_erben_ALT_NAME',
      pflegewuensche_koerper: S + 'vor_pflegewuensche_koerper',
      pflegewuensche_ernaehrung: S + 'vor_pflegewuensche_ernaehrung',
      pflegewuensche_alltag: S + 'vor_pflegewuensche_alltag',
      pflegewuensche_sonstiges: S + 'vor_pflegewuensche_sonstiges',
      hilfsmittel: S + 'vor_hilfsmittel',
      /* vorsorge_instrumente — Rekonstruktion aus vier Stufen (29,39,40,52), direkt am Code
         gegengelesen (nicht nur aus der Tabelle uebernommen):
         · Stufe 28->29 (U2-ADR-064): vollmacht_person, vollmachtsGrundlage (SKALAR-STRING,
           noch nicht Array — das kommt erst 27->28, das selbst schon NACH V19 liegt, aber
           hier trotzdem als Alt-Form vor 29 gebraucht), vollmachtsTyp, vollmacht_ort,
           gesundheitsvollmacht_person, gesundheitsvollmacht_ort — sechs Flachfelder.
         · Stufe 40 (U2-ADR-096 Block E): zwoelf ki_*-Flachfelder unter verwaltung (Zeilen
           12170-12228 im Kern, dort als Unterfelder-Katalog deklariert).
         · Stufe 51->52 ("Tote Leitfelder"): vollmacht_vorhanden, patientenverf_vorhanden(+
           _ort/_arzt/organspende ueber B16_INSTRUMENT_IMPORT), betreuungsverfuegung.
           `testament` dort AUSDRUECKLICH ausgenommen (Kommentarwiderspruch, s. Kopf dieser
           Datei) — testament_* darum hier nicht gesetzt.
         Stufe 39 selbst transformiert kein Feld (reiner Rename vollmachten->vorsorge_instrumente,
         wirkt erst NACH Stufe 29 auf das, was Stufe 29 bereits angelegt hat). */
      vollmacht_person: A + 'vor_vollmacht_person_ALT_NAME',
      vollmachtsGrundlage: A + 'vor_vollmachtsGrundlage_ALT_SKALAR',
      vollmachtsTyp: A + 'vor_vollmachtsTyp_ALT',
      vollmacht_ort: A + 'vor_vollmacht_ort_ALT',
      gesundheitsvollmacht_person: A + 'vor_gesundheitsvollmacht_person_ALT_NAME',
      gesundheitsvollmacht_ort: A + 'vor_gesundheitsvollmacht_ort_ALT',
      vollmacht_vorhanden: 'ja',
      patientenverf_vorhanden: 'ja',
      patientenverf_ort: A + 'vor_patientenverf_ort_ALT',
      patientenverf_arzt: A + 'vor_patientenverf_arzt_ALT',
      organspende: A + 'vor_organspende_ALT',
      betreuungsverfuegung: 'ja',
    },

    // ── verwaltung (existierte bei V19; traegt hier zusaetzlich die
    //    krisenvorsorge-Kernfelder, die erst Stufe 50 in einen eigenen Sektor zog) ─
    verwaltung: {
      // Stufe 73->74 (Korb 1): bundid war zwei Flachfelder.
      bundid_email: A + 'verw_bundid_email', bundid_ort: A + 'verw_bundid_ort',
      // Stufe 55 (F4 Zug 1): bundid_status war Freitext.
      bundid_status: A + 'verw_bundid_status_ALT_FREITEXT',
      pw_manager: S + 'verw_pw_manager', pw_masterkey_ort: S + 'verw_pw_masterkey_ort',
      pw_backup_ort: S + 'verw_pw_backup_ort', computer_pw_ort: S + 'verw_computer_pw_ort',
      smartphone_pin_ort: S + 'verw_smartphone_pin_ort', computer: S + 'verw_computer',
      smartphone: S + 'verw_smartphone', cloud_dienst: S + 'verw_cloud_dienst',
      proton_email: S + 'verw_proton_email', social_media: S + 'verw_social_media',
      alarm_code_ort: S + 'verw_alarm_code_ort', umzug_versorger: S + 'verw_umzug_versorger',
      tresor_ort: S + 'verw_tresor_ort', tresor_code_ort: S + 'verw_tresor_code_ort',
      schliessf_ort: S + 'verw_schliessf_ort', schliessf_schluessel: S + 'verw_schliessf_schluessel',
      // Stufe 41: wohnungsschluessel_ort war EIN Freitextfeld (Namen + Ort gemischt).
      wohnungsschluessel_ort: A + 'verw_wohnungsschluessel_ort_ALT_FREITEXT',
      email_haupt: S + 'verw_email_haupt', email2: S + 'verw_email2',
      krypto: S + 'verw_krypto', krypto_seed_ort: S + 'verw_krypto_seed_ort',
      krypto_hardware: S + 'verw_krypto_hardware', krypto_legacy: S + 'verw_krypto_legacy',
      // ki_*: zwoelf Flachfelder, zieht bei Stufe 40 kollektiv nach vorsorge.vorsorge_instrumente um.
      ki_grundentscheidung: A + 'ki_grundentscheidung', ki_zweck: A + 'ki_zweck',
      ki_berechtigte: A + 'ki_berechtigte', ki_berechtigte_personen: A + 'ki_berechtigte_personen_NAME',
      ki_raum: A + 'ki_raum', ki_datenarten: A + 'ki_datenarten',
      ki_befristung: A + 'ki_befristung', ki_befristung_jahre: A + 'ki_befristung_jahre',
      ki_befristung_zeitpunkt: A + 'ki_befristung_zeitpunkt', ki_verhaltensgrenze: A + 'ki_verhaltensgrenze',
      ki_nachlassverwaltung: A + 'ki_nachlassverwaltung', ki_nachlassverwalter: A + 'ki_nachlassverwalter_NAME',
      // ── krisenvorsorge-Kernfelder, V19-Ort: unter verwaltung (Stufe 50 zieht sie erst um) ──
      ks_wasser_liter: A + 'ks_wasser_liter', ks_wasser_ort: A + 'ks_wasser_ort',
      ks_wasser_haltbar: '2027-01-01',
      ks_lebensmittel_was: A + 'ks_lebensmittel_was', ks_lebensmittel_ort: A + 'ks_lebensmittel_ort',
      ks_lebensmittel_haltbar: '2027-01-01',
      ks_taschenlampe: A + 'ks_taschenlampe', ks_kerzen: A + 'ks_kerzen',
      ks_batterien: A + 'ks_batterien', ks_radio: A + 'ks_radio', ks_powerbank: A + 'ks_powerbank',
      ks_heizung_notfall: A + 'ks_heizung_notfall', ks_erstehilfe_ort: A + 'ks_erstehilfe_ort',
      ks_erstehilfe_datum: '2026-01-01', ks_medikamente_vorrat: A + 'ks_medikamente_vorrat',
      ks_rucksack_vorhanden: A + 'ks_rucksack_vorhanden', ks_rucksack_ort: A + 'ks_rucksack_ort',
      ks_rucksack_liste: A + 'ks_rucksack_liste', ks_sammelplatz: A + 'ks_sammelplatz',
      ks_fluchtweg: A + 'ks_fluchtweg', ks_ausweichort_2: A + 'ks_ausweichort_2',
      ks_nachbar: A + 'ks_nachbar_NAME', ks_besondere_situation: A + 'ks_besondere_situation',
      ks_feuerwehr_notiz: A + 'ks_feuerwehr_notiz',
      // verwaltung_vorgaenge: additiv, NACH V19 — ausgelassen.
    },

    // ── wohnen (existierte bei V19) ──────────────────────────────────────
    wohnen: {
      wohnung_typ: S + 'wohn_wohnung_typ', vermieter: S + 'wohn_vermieter',
      // Stufe 41: vermieter_tel war EIN Feld mit Telefon UND E-Mail gemischt.
      vermieter_tel: A + 'wohn_vermieter_tel_ALT_TEL_UND_EMAIL',
      miete: S + 'wohn_miete', kaution: S + 'wohn_kaution',
      mietvertrag_ort: S + 'wohn_mietvertrag_ort', mietvertrag_befristet_bis: '2027-01-01',
      wohnsituation_bem: S + 'wohn_wohnsituation_bem', umzug_mietverhaeltnis: S + 'wohn_umzug_mietverhaeltnis',
      // Stufe 35: weitere_wohnungen waren neun Flachfelder fuer EINE Zweitwohnung.
      zw_strasse: A + 'wohn_zw_strasse', zw_plz_ort: A + 'wohn_zw_plz_ort',
      zw_typ: A + 'wohn_zw_typ', zw_vermieter: A + 'wohn_zw_vermieter',
      zw_vermieter_tel: A + 'wohn_zw_vermieter_tel', zw_miete: A + 'wohn_zw_miete',
      zw_kaution: A + 'wohn_zw_kaution', zw_mietvertrag_ort: A + 'wohn_zw_mietvertrag_ort',
      zw_wohnsituation_bem: A + 'wohn_zw_wohnsituation_bem',
      // miete_waehrung, umzug_kuendigung/_auszug/_uebergabe: additiv, NACH V19 — ausgelassen.
    },

    // ── persoenliches (existierte bei V19) ───────────────────────────────
    persoenliches: {
      fotos_physisch: S + 'pers_fotos_physisch', fotos_digital: S + 'pers_fotos_digital',
      erinnerungen_sonstiges: S + 'pers_erinnerungen_sonstiges',
      gegenstaende_wuensche: S + 'pers_gegenstaende_wuensche', haushalt_spenden: S + 'pers_haushalt_spenden',
      konflikte_hinweise: S + 'pers_konflikte_hinweise', religion: S + 'pers_religion',
      seelsorger: S + 'pers_seelsorger', spirituelle_wuensche: S + 'pers_spirituelle_wuensche',
      brief_notarzt: S + 'pers_brief_notarzt', brief_krankenhaus: S + 'pers_brief_krankenhaus',
      brief_pflegeheim: S + 'pers_brief_pflegeheim', brief_todesfall: S + 'pers_brief_todesfall',
      briefe_ablage: S + 'pers_briefe_ablage', sonstiges_persoenlich: S + 'pers_sonstiges_persoenlich',
      // Stufe 36: abhaengige_personen war EIN Freitextfeld.
      abhaengige_personen: A + 'pers_abhaengige_personen_ALT_FREITEXT',
      // Stufe 35: persoenliche_briefe waren drei Flachfelder.
      brief_1: A + 'pers_brief_1', brief_2: A + 'pers_brief_2', brief_3: A + 'pers_brief_3',
      bestattung_art: S + 'pers_bestattung_art', bestattung_voraus: S + 'pers_bestattung_voraus',
      bestattung_unternehmen: S + 'pers_bestattung_unternehmen', bestattung_ort: S + 'pers_bestattung_ort',
      bestattung_vorsorge_nachweis: S + 'pers_bestattung_vorsorge_nachweis',
    },
  };
}

function baueDepotSchema19() {
  return {
    schemaVersion: 19,
    menschen: [
      { id: 'v19-p1', name: 'V19_MENSCH_EINS' },
      { id: 'v19-p2', name: 'V19_MENSCH_ZWEI' },
    ],
    mappe: [],
    sektoren: baueSektorenSchema19(),
  };
}

module.exports = { baueSektorenSchema19, baueDepotSchema19 };
