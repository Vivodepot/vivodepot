#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A443 (21.08.2026) — die Feld-Regeln des Hauses auf dem ANGEDOCKTEN Weg.
   ────────────────────────────────────────────────────────────────────────────
   ERHOBEN VOR DEM BAU (`tools/allaussage-ohne-andock-messen.js`, Bericht
   `Allaussagen_ohne_Andock`): 127 Dateien durchlaufen den Feld-Katalog und
   sichern etwas zu; 119 erwähnen den angedockten Weg mit keinem Wort. Darunter
   neun der W-Wächter des Hauses. Sie sagen „jedes Feld" und meinen den
   eingebauten Katalog.

   WARUM DIE NEUN SICH NICHT EINFACH ERWEITERN LASSEN — und das ist der Befund,
   den dieser Wächter trägt: sie laufen zur BAUZEIT gegen `SEKTOREN`. Zu diesem
   Zeitpunkt gibt es kein einziges angedocktes Feld. Ein Modul-Feld entsteht erst
   auf dem Gerät der Bürgerin, wenn ein signiertes Bündel andockt. Ein Wächter,
   der „auch `data.feldDefinitionen`" liest, fände dort immer die leere Liste —
   er wäre grün, ohne je etwas geprüft zu haben. Das ist die stumme Sorte.

   WAS STATTDESSEN PRÜFBAR IST, und was dieser Wächter prüft: dass die REGEL den
   angedockten Weg erreicht. Er dockt ein Fixture-Modul an, das jede Regel einmal
   VERLETZT, und verlangt, dass jede Regel es findet. Findet eine Regel ihren
   Verstoß nicht, ist sie auf diesem Weg blind — genau die Aussage, die A443
   gemessen und die Produktentscheidung zu schliessen entschieden hat.

   DIE POSITIVKONTROLLE IST DER GEGENSTAND, nicht eine Beigabe: „der Wächter
   findet nichts" ist ohne sie nicht von „der Wächter läuft nicht" zu
   unterscheiden (Laufzettel „Nach den dreizehn", Posten 3).

   JE REGEL EINE ENTSCHEIDUNG, kein pauschaler Zug. Drei der neun stehen hier
   NICHT, und der Grund steht bei ihnen:
     W5 — misst Wizard-Schritte gegen Vorsorge-Instrumente. Ein Modul bringt
           keinen Wizard mit; die Regel hat auf diesem Weg keinen Gegenstand.
     W10 — misst deklarative Export-Mappings (`*_MAPPING`). Ein Modul-Feld hat
           kein Mapping und soll keines haben (A173: der Export gibt angedockte
           Felder bewusst nicht mit). Kein Gegenstand.
     W11 — misst allein `beispiel`. Gemessen an `_templateDefAlsFeld`: `beispiel`
           reist NIE mit. Die Regel läuft auf diesem Weg strukturell ins Leere —
           ihre Auslassung ist folgerichtig, keine Lücke.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

/* Das Fixture-Modul. Jedes Feld verletzt GENAU EINE Regel — sonst sagte ein Fund nicht,
   welche Regel gegriffen hat. Die Form ist die eines echten Bündels
   (`data.feldDefinitionen[]`), nicht eine erfundene. */
const FIXTURE_DEFS = [
  // W1/W2 — ein Betragsfeld als `text`, mit Geldwert im Label, ohne Einheiten-Nachbarn.
  { sektorId: 'finance', feldId: 'tpl_kammer_beitrag', typ: 'text',
    label: 'Kammerbeitrag 250 EUR pro Jahr' },
  // W3 — ein Feld, das nach seinem Namen sensibel ist und die Markierung nicht trägt.
  { sektorId: 'health', feldId: 'tpl_kammer_diagnose', typ: 'text',
    label: 'Diagnose der Amtsärztin' },
  // W8 — ein Label, das ein eingebautes Feld doppelt.
  { sektorId: 'finance', feldId: 'tpl_kammer_steuerid', typ: 'text',
    label: 'Steuer-ID / Steuernummer' },
  // W12 — ein Ausweisfeld ohne Ablaufdatum daneben.
  { sektorId: 'administration', feldId: 'tpl_kammer_ausweis', typ: 'text',
    label: 'Kammerausweis — Nummer' },
  /* W15 — eine mitgebrachte Bereichsliste, also eine zweite Quelle neben der einen.
     DIE LISTE STEHT HIER NICHT AUSGESCHRIEBEN, und das ist kein Stil: W-15 hat die erste Fassung
     dieses Fixtures gefangen — zwölf hingeschriebene Bereichs-Kennungen in einer Werkzeugdatei
     sind genau die Handkopie, gegen die W-15 gebaut ist. Der Marker wird beim Bauen aus
     `V.SEKTOREN` gefüllt; damit gibt es weiterhin eine Quelle. */
  { sektorId: 'administration', feldId: 'tpl_kammer_bereiche', typ: 'auswahl',
    label: 'Zuständiger Bereich', optionen: '__BEREICHE_AUS_DEM_KERN__' },
];

/* Die angedockten Felder in der Form, die der Kern selbst benutzt. `_templateDefAlsFeld` ist
   die EINE Übersetzung — sie hier zu fahren statt die Rohform zu lesen ist die Zusage, dass
   Regel und Anzeige dasselbe Feld sehen. */
function angedockteFelder(V, defs) {
  const raus = [];
  for (const roh of (defs || FIXTURE_DEFS)) {
    const def = (roh.optionen === '__BEREICHE_AUS_DEM_KERN__')
      ? Object.assign({}, roh, { optionen: V.bereicheAlle().map((s) => ({ wert: s.id, label: s.id })) })
      : roh;
    let feld = null;
    try { feld = V._templateDefAlsFeld(def); } catch (e) { feld = null; }
    if (feld) raus.push({ sektorId: def.sektorId, feld });
  }
  return raus;
}

// ── Die fünf Regeln, je eine reine Funktion über EIN angedocktes Feld ───────────────────
const GELDWERT_MUSTER = /\d[\d.,]*\s?(EUR|€)|\b(EUR|€)\s?\d/;
const EINHEITENFELD_WOERTER = /^(waehrung|währung|einheit|frequenz|turnus|intervall|periode)$/i;
const AUSWEIS_STICHWORTE = /ausweis|pass|karte|vertrag|lizenz|zulassung|bescheinigung/i;
const SENSIBEL_STICHWORTE = /diagnose|blutgruppe|medikament|allerg|therapie|behandlung|befund|konfession|religion|gewerkschaft|sexual|biometr/i;

const REGELN = [
  {
    id: 'W1', was: 'kein Betragsfeld als typ:text',
    /* W1 liest `label` UND `beispiel`. `beispiel` reist nicht mit — `label` schon, und darüber
       ist die Regel auf diesem Weg erreichbar. (Der Erhebungsbericht nannte W1 „beispielgetrieben";
       am Code gemessen liest die Trägererkennung beides. Hier steht der Code, nicht der Bericht.) */
    trifft: (e) => e.feld.typ === 'text' && GELDWERT_MUSTER.test(String(e.feld.label || '')),
  },
  {
    id: 'W2', was: 'kein Betragsfeld ohne Einheiten-Nachbarn',
    trifft: (e, alle) => {
      if (!(e.feld.typ === 'text' && GELDWERT_MUSTER.test(String(e.feld.label || '')))) return false;
      /* „Nachbarschaft" ist beim Modul das MODUL: seine Felder stehen in einer Reihenfolge,
         und ein Einheitenfeld müsste unmittelbar daneben stehen — dieselbe Regel wie im
         Kern (Fenster 2 über das Feld-Array), nur über die Felder desselben Bündels. */
      const i = alle.indexOf(e);
      for (let k = i + 1; k <= i + 2 && k < alle.length; k++) {
        const woerter = String(alle[k].feld.id + ' ' + (alle[k].feld.label || '')).split(/[^a-zA-ZäöüÄÖÜß]+/).filter(Boolean);
        if (woerter.some((w) => EINHEITENFELD_WOERTER.test(w))) return false;
      }
      return true;
    },
  },
  {
    id: 'W3', was: 'kein sensibel-verdächtiges Feld ohne sensibel-Markierung',
    /* `sensibel` reist seit der Kette (Auftrag 5, Zug 2) mit — die Eigenschaft ist da, geprüft
       wurde sie am angedockten Weg nie. A398 hat die Sensibel-ZUORDNUNG auf angedockte Felder
       erstreckt; der Wächter, der sie prüft, ist damals nicht mitgewachsen. */
    trifft: (e) => SENSIBEL_STICHWORTE.test(String(e.feld.label || '') + ' ' + e.feld.id) && e.feld.sensibel !== true,
  },
  {
    id: 'W8', was: 'kein Modul-Feld mit dem Label eines eingebauten',
    trifft: (e, alle, V) => {
      const norm = (t) => String(t || '').toLowerCase().replace(/[^a-zäöüß0-9]+/g, '');
      const meins = norm(e.feld.label);
      if (!meins) return false;
      for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
        if (norm(f.label) === meins) return true;
        for (const u of (f.unterFelder || [])) if (norm(u.label) === meins) return true;
      }
      return false;
    },
  },
  {
    id: 'W12', was: 'kein Ausweis-/Karten-/Vertragsfeld ohne Ablaufdatum daneben',
    trifft: (e, alle) => {
      const hay = String(e.feld.id + ' ' + (e.feld.label || '')).toLowerCase();
      if (!AUSWEIS_STICHWORTE.test(hay)) return false;
      if (e.feld.typ === 'datum') return false;
      const stamm = String(e.feld.id).split('_').slice(0, 3).join('_');
      return !alle.some((x) => x !== e && x.feld.typ === 'datum' && String(x.feld.id).startsWith(stamm));
    },
  },
  {
    id: 'W15', was: 'keine zweite Bereichsliste im Modul',
    /* W15 („eine Quelle statt Kopien") misst strukturell, nicht über eine Namensliste. Auf dem
       angedockten Weg ist die tragende Form dieselbe: ein Modul, das die zwölf Bereiche als
       eigene Auswahl mitbringt, führt eine zweite Liste neben `bereiche.json`. */
    trifft: (e, alle, V) => {
      const optionen = Array.isArray(e.feld.optionen) ? e.feld.optionen : [];
      if (optionen.length < 8) return false;
      const werte = new Set(optionen.map((o) => String((o && o.wert) || o)));
      const bereiche = V.bereicheAlle().map((s) => s.id);
      const treffer = bereiche.filter((b) => werte.has(b)).length;
      return treffer >= Math.ceil(bereiche.length * 0.75);
    },
  },
];

function pruefen(V, defs) {
  const alle = angedockteFelder(V, defs);
  const ergebnis = [];
  for (const r of REGELN) {
    const funde = alle.filter((e) => { try { return !!r.trifft(e, alle, V); } catch (err) { return false; } })
      .map((e) => ({ sektorId: e.sektorId, feldId: e.feld.id, label: e.feld.label }));
    ergebnis.push({ id: r.id, was: r.was, funde });
  }
  return { ergebnis, gepruefteFelder: alle.length };
}

/* Die Positivkontrolle: dasselbe Modul, aber jeder Verstoss ist behoben. Findet eine Regel
   HIER etwas, misst sie nicht, was sie zu messen vorgibt. */
const FIXTURE_SAUBER = [
  { sektorId: 'finance', feldId: 'tpl_kammer_beitrag', typ: 'zahl', label: 'Kammerbeitrag' },
  /* „Währung" allein waere selbst ein W8-Fund: der eingebaute Katalog fuehrt ein Feld mit genau
     diesem Label. Gefunden von der Positivkontrolle beim ersten Lauf — das ist ihr Zweck. */
  { sektorId: 'finance', feldId: 'tpl_kammer_beitrag_waehrung', typ: 'text', label: 'Kammerbeitrag — Währung' },
  { sektorId: 'health', feldId: 'tpl_kammer_diagnose', typ: 'text', label: 'Diagnose der Amtsärztin', sensibel: true },
  { sektorId: 'finance', feldId: 'tpl_kammer_mitgliedsnummer', typ: 'text', label: 'Mitgliedsnummer der Kammer' },
  { sektorId: 'administration', feldId: 'tpl_kammer_ausweis', typ: 'text', label: 'Kammerausweis — Nummer' },
  { sektorId: 'administration', feldId: 'tpl_kammer_ausweis_gueltig', typ: 'datum', label: 'Kammerausweis — gültig bis' },
  { sektorId: 'administration', feldId: 'tpl_kammer_referat', typ: 'auswahl', label: 'Zuständiges Referat',
    optionen: [{ wert: 'a', label: 'A' }, { wert: 'b', label: 'B' }] },
];

module.exports = { REGELN, FIXTURE_DEFS, FIXTURE_SAUBER, angedockteFelder, pruefen };

if (require.main === module) {
  const { ladeKern } = require(path.resolve(__dirname, '../tests/load-kern.js'));
  const { V } = ladeKern();
  const args = process.argv.slice(2);
  const sauber = args.includes('--positivkontrolle');
  const { ergebnis, gepruefteFelder } = pruefen(V, sauber ? FIXTURE_SAUBER : FIXTURE_DEFS);
  console.log('andock-regeln: ' + REGELN.length + ' Regeln über ' + gepruefteFelder
    + ' angedockte Felder (' + (sauber ? 'Positivkontrolle, sauberes Modul' : 'Fixture mit je einem Verstoss') + ')');
  let blind = 0;
  for (const r of ergebnis) {
    const zeile = '  ' + r.id.padEnd(4) + r.was.padEnd(52) + ' → ' + (r.funde.length ? r.funde.map((f) => f.feldId).join(', ') : '—');
    console.log(zeile);
    if (!sauber && !r.funde.length) blind++;
  }
  if (sauber) {
    const falsch = ergebnis.filter((r) => r.funde.length);
    if (falsch.length) { console.error('POSITIVKONTROLLE ROT: ' + falsch.map((r) => r.id).join(', ') + ' melden an einem sauberen Modul.'); process.exit(1); }
    console.log('Positivkontrolle grün — kein Fund an einem sauberen Modul.');
  } else if (blind) {
    console.error('GATE ROT: ' + blind + ' Regel(n) finden ihren eigenen gepflanzten Verstoss nicht — auf dem angedockten Weg blind.');
    process.exit(1);
  } else {
    console.log('Alle Regeln greifen auf dem angedockten Weg.');
  }
}
