#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   TEIL C · PRÜFSTEIN 3 UND 5 — vor dem Bau gemessen, nicht angenommen
   ────────────────────────────────────────────────────────────────────────────
   Auftrag „Der grosse Zug", Teil C (21.08.2026), entschieden.
   Beide Prüfsteine tragen einen ABBRUCH: sie werden gemessen und vorgelegt, der
   Bau entscheidet sie nicht.

   PRÜFSTEIN 3 — „Ein Mensch trägt zwei Länder gleichzeitig."
   Doppelstaatler, Grenzgänger, Zugezogene mit behaltener alter Nummer. Zwei
   Nummern derselben Art müssen nebeneinander bestehen können. **Der Auftrag:
   „Dieser Punkt entscheidet, ob das Feld einen Wert trägt oder mehrere, und er
   ist nach der Migrationsstufe nicht mehr billig zu ändern."**

   PRÜFSTEIN 5 — „Eine Sprache, zwei Rechtsräume." Spanisch in Spanien und in
   Ecuador; dasselbe trifft Deutsch in DE, AT und CH und ist damit näher.
   **Der Abbruch, den der Auftrag den wichtigsten nennt:** zeigt die Messung,
   dass der Schlüssel der Textsatz-Registry um den Rechtsraum erweitert werden
   muss, hält der Bau an — der Schlüssel steckt im Depot-Format.

   POSITIVKONTROLLE JE MESSUNG. Ohne sie ist „es nimmt den falschen" nicht von
   „der Weg läuft nicht" zu unterscheiden.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

/* Die zwanzig aus Korb 1 — WÖRTLICH aus dem Bericht übernommen, nicht neu erhoben
   (Auflage des Auftrags: „Die Liste steht namentlich im Bericht und wird von dort
   übernommen"). */
const KORB1 = Object.freeze([
  'ausweis_nr', 'ausweis_ausgestellt', 'ausweis_gueltig',
  'aufenthaltstitel_nr', 'aufenthaltstitel_ausgestellt', 'aufenthaltstitel_gueltig',
  'aufenthaltstitel_aktenzeichen', 'aufenthaltstitel_behoerde',
  'elefand_nr', 'elefand_laender', 'elefand_gueltig',
  'taxIdsTaxNumbers', 'krankenkassenkarte_ort', 'krankenkassenkarte_gueltig',
  'rentenversicherungsnummer', 'pflegekasse_nr',
  'schwerbehindertenausweis_ort', 'schwerbehindertenausweis_gueltig',
  'bundid_email', 'bundid_ort',
]);

/* Feldarten, die MEHRERE Werte tragen können — gemessen am Kern, nicht behauptet. */
const MEHRWERTIG = Object.freeze(['liste', 'refMehrfach', 'mehrfachauswahl']);

function pruefstein3(V) {
  const gefunden = {};
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (KORB1.includes(f.id)) {
          gefunden[f.id] = { bereich: s.id, typ: f.typ,
            mehrwertig: MEHRWERTIG.includes(f.typ) || Array.isArray(f.unterFelder) };
        }
      }
    }
  }
  const fehlend = KORB1.filter((k) => !gefunden[k]);
  const mehrwertige = Object.keys(gefunden).filter((k) => gefunden[k].mehrwertig);
  /* POSITIVKONTROLLE: die Messung MUSS mehrwertige Felder erkennen können. Gibt es im Kern
     überhaupt welche? Wenn nicht, misst sie nichts und ihr „null" sagt nichts. */
  let mehrwertigImKern = 0;
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) if (MEHRWERTIG.includes(f.typ)) mehrwertigImKern++;
    }
  }
  return { gefunden, fehlend, mehrwertige, mehrwertigImKern, arten: [...new Set(Object.values(gefunden).map((g) => g.typ))] };
}

function pruefstein5(V) {
  /* FESTE Kennung, kein `find()` (Fund/Auflage 18.09.2026): ein `.find()` über
     `.label`-Kennungen trifft irgendwann eine, die einem NATIVEN Bereich gehört — und die ist
     seit heute geschützt (`_eingebauteBereichsBeschriftungVerwerfen`, Kaperungs-Sperre gegen
     Depot-Module, die eine eingebaute Bereichs-Beschriftung überschreiben wollen). Gemessen:
     mit `.find(k => k.endsWith('.label'))` traf dieser Prüfstein „mobility.label" — beide
     gepflanzten Sätze wurden zurückgesetzt, ohne dass dieser Prüfstein je eine Bereichs-
     Beschriftung prüfen wollte (sein Gegenstand ist die Registry-Auswahl bei zwei Anbietern
     derselben Sprache). `mobility.einfuehrungstext` ist KEINE Bereichs-Beschriftung (Suffix
     `einfuehrungstext`, nicht in `_BEREICH_ARTEN_OHNE_MODUL` = ['label', 'navUnterzeile']) —
     die Sperre kann sie kategorisch nie greifen. Die Kennung ist hier das FAHRZEUG, nicht der
     Gegenstand. Rot-Beweis geführt (s. Testdatei): mit ausgesetztem Registry-Rebuild bleibt
     der erste Satz stehen statt des zweiten, die Probe wird rot. */
  const kennung = 'mobility.einfuehrungstext';
  // A466 (23.08.2026): `herkunft` entfernt -- kein Textsatz-Modul kennt diesen Schlüssel
  // (der gehört zu bereich/institutionsArt), er lag hier als Kopie aus jener Fixture-Form
  // und wurde erst mit `TEXTSATZ_MODUL_SCHLUESSEL` sichtbar (verworfene wuchs von 0 auf 1).
  const satz = (anbieterId, text) => ({ modulTyp: 'textsatz', moduleVersion: 1,
    anbieterId, sprache: 'es', texte: { [kennung]: text } });
  const ES = 'ES: Documento Nacional de Identidad';
  const EC = 'EC: Cedula de Identidad';

  const d = V.leeresDepot();
  V.setData(d);
  d.textsatzModule = V.textsatzModulEinbetten([], satz('es-es', ES));
  d.textsatzModule = V.textsatzModulEinbetten(d.textsatzModule, satz('ec-ec', EC));
  d.textsprache = 'es';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  const angezeigt = V.textLesen(kennung);

  /* POSITIVKONTROLLE: ohne angedockten Satz muss der EINGEBAUTE Text erscheinen — sonst misst
     dieser Lauf den Leseweg und nicht die Auswahl zwischen zwei Sätzen. */
  const e = V.leeresDepot();
  V.setData(e);
  V._textsatzModuleAusDepotAnmelden(e);
  const eingebaut = V.textLesen(kennung);

  /* Wird ein `rechtsraum` am Textsatz überhaupt bemerkt? */
  const mitRechtsraum = V.textsatzModulPruefen(Object.assign(satz('x', 'y'), { rechtsraum: 'ES' }));

  return {
    kennung, abgelegt: d.textsatzModule.length,
    anbieter: d.textsatzModule.map((m) => m.anbieterId),
    angezeigt, erwartetesPaar: [ES, EC], eingebaut,
    rechtsraumAngenommen: mitRechtsraum.gueltig,
    rechtsraumVerworfen: (mitRechtsraum.verworfene || []).length,
  };
}

function messen(V) { return { p3: pruefstein3(V), p5: pruefstein5(V) }; }

function bericht(m) {
  const z = [];
  z.push('PRÜFSTEIN 3 · Trägt ein Feld einen Wert oder mehrere?');
  z.push('    Korb-1-Felder im Kern gefunden : ' + Object.keys(m.p3.gefunden).length + ' von ' + KORB1.length
    + (m.p3.fehlend.length ? ' — FEHLEND: ' + m.p3.fehlend.join(', ') : ''));
  z.push('    Feldarten                      : ' + m.p3.arten.join(', '));
  z.push('    davon MEHRWERTIG               : ' + (m.p3.mehrwertige.length ? m.p3.mehrwertige.join(', ') : 'KEINES'));
  z.push('    Positivkontrolle               : ' + m.p3.mehrwertigImKern + ' mehrwertige Felder im Kern insgesamt — '
    + (m.p3.mehrwertigImKern > 0 ? 'die Messung KANN mehrwertige erkennen' : 'ROT: sie erkennt gar keine'));
  z.push('');
  z.push('PRÜFSTEIN 5 · Eine Sprache, zwei Rechtsräume');
  z.push('    Versuchskennung                : ' + m.p5.kennung);
  z.push('    im Depot abgelegt              : ' + m.p5.abgelegt + ' Modul(e) — ' + m.p5.anbieter.join(' + '));
  z.push('    angezeigt wird                 : ' + JSON.stringify(m.p5.angezeigt));
  z.push('    Positivkontrolle (ohne Satz)   : ' + JSON.stringify(m.p5.eingebaut)
    + (m.p5.eingebaut && m.p5.eingebaut !== m.p5.angezeigt ? ' — der eingebaute Text, der Weg läuft' : ' — ROT'));
  z.push('    Satz MIT `rechtsraum`-Feld     : ' + (m.p5.rechtsraumAngenommen ? 'ANGENOMMEN' : 'abgelehnt')
    + ', verworfene Kennungen: ' + m.p5.rechtsraumVerworfen);
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  if (!m.p3.mehrwertigImKern || !m.p5.eingebaut) {
    console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung oben ist nicht belastbar.');
    process.exit(2);
  }
}

module.exports = { messen, bericht, laufen, KORB1, MEHRWERTIG, pruefstein3, pruefstein5 };
