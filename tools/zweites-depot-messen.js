#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ERHEBUNG 13 — DAS ZWEITE DEPOT DERSELBEN PERSON
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (Laufzettel „Nach den dreizehn", Posten 13): Das Produktmodell sieht ein
   privates und ein professionelles Depot vor — getrennt betreibbar, ineinander
   einhängbar, aushängbar. Die Mechanik ist gebaut. **Gemessen ist damit die
   Existenz, nicht das Verhalten.**

   DREI MESSPUNKTE, jeder mit Positivkontrolle:
     1 Bleibt ein eingehängtes Depot VERSIEGELT, während das einhängende offen ist?
       Am echten `depotLaden` gemessen, nicht an der Absicht. Trägt das nicht, trägt
       die Berufsgeheimnis-Begründung des ganzen Modells nicht.
     2 Was bleibt beim AUSHÄNGEN zurück? Byte-Vergleich vor und nach — beide
       Absichten getrennt (beiseitelegen · abgeben).
     3 Was schaltet der ABLAUF eines Anbieter-Zertifikats tatsächlich ab? Nur die
       geprüfte Herkunft, oder auch die Felder? Am 19.08. wurde berichtet, es
       verschwinde nichts; das ist zu BESTÄTIGEN, nicht zu übernehmen.

   MESSEN, NICHT BAUEN. Keine Umbenennung, keine Vorauswahl — dass das Sub-Depot
   heute als Depot für anvertraute Personen beschrieben ist, während der Pro-Fall
   das zweite Depot DERSELBEN Person meint, ist eine Frage der Bedeutung und der
   Bedienung; sie ist eine Produktentscheidung und wird hier nur benannt.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const ANKER_PW = 'anker-der-privaten-seite-2026';
const SUB_PW = 'zweites-depot-eigenes-passwort-2026';
const GEHEIMNIS = 'MANDANT-SCHWARZ-AKTENZEICHEN-4711';   // muss im Klartext auffindbar sein, wenn er da ist

function ladeFrisch() {
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return ladeKern().V;
}

/* ── Messpunkt 1 ─────────────────────────────────────────────────────────────
   Der Klartext wird im SERIALISIERTEN Anker gesucht UND im geladenen `data`.
   Beides, weil „versiegelt" zwei Dinge heißen kann: nicht in der Datei und nicht
   im Speicher der offenen Sitzung. */
async function messeVersiegelung() {
  const V = ladeFrisch();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Inhaberin');
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Kanzlei-Depot', inhaberin: 'dieselbe Person', verwaltungsTyp: 'verwaltet' }, SUB_PW);

  /* Der Geheimtext wird IN das Sub-Depot geschrieben — über denselben Weg, den die
     Anwendung nimmt: entsiegeln, eintragen, neu versiegeln. */
  /* 23.09.2026 (U2-ADR-002, S1): vorher baute dieses Werkzeug den Neuversiegel-Schritt selbst nach — `iv/ct` auf den
     gelesenen Umschlag. Seit ein Sub-Depot V4 ist wie jedes Depot, lag der Geheimtext damit tot neben den Einheiten (das
     Fehlermuster, das SUB-V4-NEUVERSIEGELN-VERLUST im Kern schloss). Jetzt der Weg der Anwendung selbst. */
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  V.subKontextBetreten(eintrag.depotUUID);
  V.akteurSelbstErklaeren('Inhaberin');
  const d = V.getData();
  d.sektoren = d.sektoren || {};
  d.sektoren.administration = Object.assign({}, d.sektoren.administration || {}, { bundid_email: GEHEIMNIS });
  await V.subKontextVerlassen();

  const ankerUmschlag = await V.depotSerialisieren();
  const ankerText = JSON.stringify(ankerUmschlag);

  /* Jetzt der echte Weg: eine FRISCHE Anwendung öffnet den Anker mit dem ANKER-Passwort. */
  const W = ladeFrisch();
  const geladen = await W.depotLaden(ankerUmschlag, ANKER_PW);
  const dataText = JSON.stringify(W.getData());

  /* POSITIVKONTROLLE: mit dem SUB-Passwort muss der Geheimtext sehr wohl erscheinen —
     sonst misst diese Probe nur, dass der Geheimtext nirgends steht. */
  const subEintrag = geladen.verwalteteDepots.find((x) => x.depotUUID === eintrag.depotUUID);
  const entsiegelt = await W.subDepotEntsiegeln(subEintrag.umschlag, SUB_PW);
  const kontrolleSichtbar = JSON.stringify(entsiegelt.inhalt).includes(GEHEIMNIS);

  return {
    imAnkerUmschlag: ankerText.includes(GEHEIMNIS),
    imGeladenenData: dataText.includes(GEHEIMNIS),
    kontrolleSichtbar,
    ankerBytes: ankerText.length,
  };
}

/* ── Messpunkt 2 ─────────────────────────────────────────────────────────────── */
async function messeAushaengen(absicht) {
  const V = ladeFrisch();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Inhaberin');
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Kanzlei-Depot', inhaberin: 'dieselbe Person', verwaltungsTyp: 'verwaltet' }, SUB_PW);

  const vorher = JSON.parse(JSON.stringify(V.getData().verwalteteDepots.find((x) => x.depotUUID === eintrag.depotUUID)));
  V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'dieselbe Person', absicht });
  const nachher = V.getData().verwalteteDepots.find((x) => x.depotUUID === eintrag.depotUUID);

  const wegGefallen = Object.keys(vorher).filter((k) => !(k in (nachher || {})));
  const dazu = Object.keys(nachher || {}).filter((k) => !(k in vorher));
  return {
    absicht,
    eintragBleibt: !!nachher,
    wegGefallen, dazu,
    status: nachher && nachher.status,
    umschlagBleibt: !!(nachher && nachher.umschlag),
    zurueckbleibendeAngaben: Object.keys(nachher || {}).filter((k) => k !== 'umschlag'),
  };
}

/* ── Messpunkt 3 ─────────────────────────────────────────────────────────────
   Der Ablauf betrifft die PRÜFUNG. Gemessen wird, ob eine bereits eingetroffene
   Definition und ihr Wert einen Neustart überleben — an der echten Datei, nicht
   an der Absicht. Die Positivkontrolle ist ein Wert, der nachweislich ankommt. */
async function messeZertifikatsablauf() {
  const V = ladeFrisch();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Inhaberin');
  const d = V.getData();
  d.feldDefinitionen = [{ sektorId: 'administration', feldId: 'tpl_aktenzeichen', label: 'Aktenzeichen',
    typ: 'text', abschnitt: 'Kanzlei' }];
  d.sektoren.administration = Object.assign({}, d.sektoren.administration || {}, { tpl_aktenzeichen: GEHEIMNIS });
  V.setData(d);
  const umschlag = await V.depotSerialisieren();

  const W = ladeFrisch();
  const geladen = await W.depotLaden(umschlag, ANKER_PW);
  const defDa = (geladen.feldDefinitionen || []).some((x) => x.feldId === 'tpl_aktenzeichen');
  const wertDa = ((geladen.sektoren || {}).administration || {}).tpl_aktenzeichen === GEHEIMNIS;
  const aufDemBlatt = W.vollDepotModell({ sensibel: false }).bereiche
    .find((b) => b.id === 'administration');
  const zeileDa = !!(aufDemBlatt && aufDemBlatt.sektionen.flatMap((s) => s.zeilen)
    .some((z) => z.wert === GEHEIMNIS));
  return { defDa, wertDa, zeileDa };
}

async function messen() {
  const versiegelung = await messeVersiegelung();
  const beiseite = await messeAushaengen('beiseitelegen');
  const abgeben = await messeAushaengen('abgeben');
  const ablauf = await messeZertifikatsablauf();
  return { versiegelung, beiseite, abgeben, ablauf };
}

function bericht(m) {
  const z = [];
  z.push('1 · Bleibt das eingehängte Depot versiegelt, während der Anker offen ist?');
  z.push('    Geheimtext im serialisierten Anker (verschlüsselt) : ' + (m.versiegelung.imAnkerUmschlag ? 'GEFUNDEN — im Klartext!' : 'nicht auffindbar'));
  z.push('    Geheimtext im geladenen `data` der offenen Sitzung : ' + (m.versiegelung.imGeladenenData ? 'GEFUNDEN — mitgeöffnet!' : 'nicht auffindbar'));
  z.push('    POSITIVKONTROLLE (mit dem Sub-Passwort entsiegelt) : ' + (m.versiegelung.kontrolleSichtbar ? 'sichtbar — die Probe KANN Klartext sehen' : 'ROT: auch mit Passwort nichts — die Messung taugt nicht'));
  z.push('');
  for (const a of [m.beiseite, m.abgeben]) {
    z.push('2 · Was bleibt beim Aushängen zurück — Absicht „' + a.absicht + '"?');
    z.push('    Eintrag bleibt       : ' + (a.eintragBleibt ? 'ja' : 'nein') + ' · Status: ' + a.status);
    z.push('    Umschlag bleibt      : ' + (a.umschlagBleibt ? 'ja' : 'nein'));
    z.push('    weggefallen          : ' + (a.wegGefallen.length ? a.wegGefallen.join(', ') : '(nichts)'));
    z.push('    hinzugekommen        : ' + (a.dazu.length ? a.dazu.join(', ') : '(nichts)'));
    z.push('    was zurückbleibt     : ' + a.zurueckbleibendeAngaben.join(', '));
    z.push('');
  }
  z.push('3 · Was überlebt einen Neustart, wenn die geprüfte Herkunft wegfällt?');
  z.push('    Felddefinition nach `depotLaden` : ' + (m.ablauf.defDa ? 'da' : 'WEG'));
  z.push('    eingetragener Wert               : ' + (m.ablauf.wertDa ? 'da' : 'WEG'));
  z.push('    Zeile auf dem Blatt              : ' + (m.ablauf.zeileDa ? 'da' : 'WEG'));
  return z.join('\n');
}

async function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  return messen();
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  laufen(i > -1 ? process.argv[i + 1] : null).then((m) => {
    console.log(bericht(m));
    if (!m.versiegelung.kontrolleSichtbar) {
      console.error('\nABBRUCH: die Positivkontrolle sieht auch mit dem Sub-Passwort keinen Klartext — '
        + 'dieser Lauf misst den Messweg, nicht den Gegenstand.');
      process.exit(2);
    }
  }).catch((e) => { console.error('FEHLER: ' + e.message); process.exit(1); });
}

module.exports = { messen, bericht, laufen, messeVersiegelung, messeAushaengen, messeZertifikatsablauf,
  ANKER_PW, SUB_PW, GEHEIMNIS };
