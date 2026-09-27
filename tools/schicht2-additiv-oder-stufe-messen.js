#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 2 · DIE VIER SCHICHT-2-BEFUNDE — additiv oder Migrationsstufe?
   ────────────────────────────────────────────────────────────────────────────
   „Die elf Befunde bekommen Zeilen — und die Schicht-2-Frage wird
   gemessen" (21.08.2026), Zug 2. Betrifft A460–A463.

   **DIE FRAGE, für alle vier dieselbe:** Braucht der Befund eine
   Migrationsstufe, oder geht er additiv — **ohne dass ein einziger
   Bestandswert umzieht?**

   **WARUM SIE ZÄHLT:** Nur was eine Stufe braucht, gehört in den laufenden
   Schnitt. Alles Additive kann jederzeit gebaut werden und muss die
   Produktentscheidung nicht abwarten.

   **KEIN BAU.** Gemessen wird, ob der Weg besteht, nicht gegangen.

   **UND DIE EHRLICHE GEGENANTWORT GEHÖRT DAZU:** Wo Aufwärtskompatibilität nur
   über einen ZWEITEN LESEPFAD zu haben wäre, ist sie keine — dann lautet die
   Meldung „braucht eine Stufe".

   Positivkontrolle je Fall: ein gepflanzter Bestandswert alter Form muss
   unverändert gelesen werden.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');

const KERN = () => fs.readFileSync(process.env.KERN_HTML_PATH
  || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

async function messen(V, ladeKern) {
  const raus = {};

  /* ══ A461 · DAS UNGENAUE DATUM ═════════════════════════════════════════════
     Der Anhalt von SP Bau: vermutlich KEIN Datenmodell-Fall — das Modell nimmt
     den Wert bereits an, nur die Eingabemaske zeigt ihn nicht. Zu messen: Was
     tut ein bestehender ungenauer Wert nach einer Umstellung des Feldtyps? Und
     gibt es heute überhaupt einen im Bestand? */
  await V.depotAnlegen('zug2-pw');
  V.akteurSelbstErklaeren('Prüfung');
  V.sektorFeldSetzen('identity', 'birthDate', 'ca. 1990');
  V.sektorFeldSetzen('identity', 'givenName', 'Kontrolle');

  const nachMigration = V.depotNormalisieren(V.getData());
  const umschlag = await V.depotSerialisieren();
  const { V: W } = ladeKern();
  await W.depotLaden(umschlag, 'zug2-pw');

  /* Die Umstellung selbst, an einem MUTIERTEN BEREICHS-TEMPLATE: `birthDate` wird `text`.
     Ein Bestandswert alter Form muss danach unverändert gelesen werden.
     U2-ADR-417-Nachtrag (Schnitt, 19.09.2026) — DIE PFLANZSTELLE IST WEITERGEWANDERT, ins
     eigene Bereichs-Template. Seit dem additiven Umbau (U2-ADR-417) steht `identity` nicht
     mehr im Kern-Rohtext (weder als JS-Literal noch als eingebettetes Bündel-JSON, U2-ADR-320s
     Fall) — beide dortigen Substitutionen fänden heute nichts mehr, `umgestellt` bliebe falsch,
     ohne dass der Gegenstand unverändert wäre: die Probe misst dann nur ihre eigene
     Meßvorrichtung. Die Datei selbst (`tools/bereich-templates/vivodepot-identity.json`) wird
     darum in eine Wegwerf-Kopie kopiert, dort das `birthDate`-Feld auf `typ:'text'` gesetzt, und
     `ladeKern({ bereichTemplateVerzeichnis })` (18.09.2026, bisher von keinem Aufrufer genutzt)
     lädt den Kern mit GENAU dieser einen Datei ausgetauscht — derselbe Weg, den ein echtes
     Produkt geht (modulDateienFuer), keine Kern-Rohtext-Abkürzung. */
  const { BEREICH_TEMPLATE_VERZEICHNIS } = require('./lib/vier-produkte.js');
  const tmpBereichDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vd-zug2-bereich-'));
  for (const datei of fs.readdirSync(BEREICH_TEMPLATE_VERZEICHNIS)) {
    fs.copyFileSync(path.join(BEREICH_TEMPLATE_VERZEICHNIS, datei), path.join(tmpBereichDir, datei));
  }
  const identityPfad = path.join(tmpBereichDir, 'vivodepot-identity.json');
  const identityInhalt = JSON.parse(fs.readFileSync(identityPfad, 'utf8'));
  let umgestellt = false;
  for (const bereich of Object.values(identityInhalt.bereiche)) {
    for (const sektion of bereich.sektionen || []) {
      for (const feld of sektion.felder || []) {
        if (feld.id === 'birthDate' && feld.typ === 'datum') {
          feld.typ = 'text';
          delete feld.keineZukunft;
          delete feld.datumJahrMin;
          umgestellt = true;
        }
      }
    }
  }
  fs.writeFileSync(identityPfad, JSON.stringify(identityInhalt, null, 2) + '\n');
  let nachUmstellung = null;
  if (umgestellt) {
    delete require.cache[require.resolve(path.join(__dirname, '..', 'tests', 'load-kern.js'))];
    const { ladeKern: ladeMutiert } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
    const { V: M } = ladeMutiert({ bereichTemplateVerzeichnis: tmpBereichDir });
    await M.depotLaden(umschlag, 'zug2-pw');
    nachUmstellung = {
      wert: M.getData().sektoren.identity.birthDate,
      kontrolle: M.getData().sektoren.identity.givenName,
      maske: M.feldInputHTML({ id: 'birthDate', typ: 'text' }, 'ca. 1990'),
    };
    delete require.cache[require.resolve(path.join(__dirname, '..', 'tests', 'load-kern.js'))];
  }
  fs.rmSync(tmpBereichDir, { recursive: true, force: true });

  /* Gibt es einen ungenauen Wert im BESTAND? Gemessen an dem, was das Repo an
     Prüfstoff führt — ein echtes Bürgerdepot kennt CC nicht und soll es nicht. */
  const fixtureDir = path.join(__dirname, '..', 'tests', 'fixtures');
  const ungenaueImBestand = [];
  for (const datei of fs.readdirSync(fixtureDir)) {
    if (!/\.js$/.test(datei)) continue;
    const t = fs.readFileSync(path.join(fixtureDir, datei), 'utf8');
    const m = t.match(/(?:birthDate|geburtsdatum):\s*'([^']*)'/g) || [];
    for (const treffer of m) {
      const wert = treffer.split("'")[1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) ungenaueImBestand.push(datei + ': ' + wert);
    }
  }

  raus.datum = {
    modellNimmtAn: V.getData().sektoren.identity.birthDate === 'ca. 1990',
    ueberlebtMigration: nachMigration.sektoren.identity.birthDate === 'ca. 1990',
    ueberlebtSpeichernUndLaden: W.getData().sektoren.identity.birthDate === 'ca. 1990',
    umgestellt, nachUmstellung,
    ungenaueImBestand,
  };

  /* ══ A462 · DER TRANSKRIPTIONS-ANLASS ══════════════════════════════════════
     Zu messen: Prüft irgendetwas die Anlassliste gegen eine GESCHLOSSENE Menge,
     die eine Migration auslösen würde? */
  const kern = KERN();
  const lese = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const anlassOptionen = (V.bereicheAlle().find((s) => s.id === 'identity').sektionen
    .flatMap((k) => k.felder || []).find((f) => f.id === 'formerNames').unterFelder || [])
    .find((u) => u.id === 'reason').optionen.map((o) => o.wert);
  /* Wird ein UNBEKANNTER Auswahlwert beim Schreiben abgewiesen? Das ist die
     Stelle, an der aus additiv eine Stufe würde. */
  let unbekannterAngenommen = null, meldung = null;
  try {
    V.listenEintragHinzufuegen('identity', 'formerNames',
      { name: 'Amine Shaikh', reason: 'transkription' });
    const zeile = (V.getData().sektoren.identity.formerNames || [])
      .find((z) => z.name === 'Amine Shaikh');
    unbekannterAngenommen = !!zeile && zeile.reason === 'transkription';
  } catch (e) { unbekannterAngenommen = false; meldung = String(e.message).slice(0, 80); }
  raus.anlass = {
    optionen: anlassOptionen,
    /* Die Liste steht ZWEIMAL: im Kern und in der Lese-App. Ein neuer Wert muss
       an beiden Stellen entstehen — das ist Pflege, keine Migration. */
    auchInLeseApp: anlassOptionen.every((w) => lese.includes("wert: '" + w + "'")
      || lese.includes('"' + w + '"') || lese.includes("'" + w + "'")),
    unbekannterAngenommen, meldung,
    /* Wird der Wert irgendwo gegen eine feste Liste geprüft? */
    festeListenImKern: (kern.match(/ANLASS_[A-Z_]*\s*=/g) || []),
  };

  /* ══ A463 · DER VORLAUF AM PRÜFBLATT ═══════════════════════════════════════
     Zu messen: Wo entstünde der Wert, und wo würde er abgelegt? */
  const identSektor = V.bereicheAlle().find((s) => s.id === 'identity');
  const stdDok = identSektor.standardDokumente || [];
  raus.vorlauf = {
    /* Ein Prüfstein ist eine Eigenschaft des KATALOGS, nicht des Depots — er
       steht in `SEKTOREN`, nicht in `data`. Ein Schlüssel mehr dort zieht keinen
       Bestandswert um. */
    stehtImKatalog: stdDok.length > 0,
    schluessel: stdDok.length ? Object.keys(stdDok[0]) : [],
    imDepotAbgelegt: Object.keys(V.leeresDepot()).includes('standardDokumente'),
    /* Die andere Bauart — ein Vorlauf JE DOKUMENT der Bürgerin — wäre ein
       Depotwert. Trägt ein Dokument heute schon eigene Fristangaben? */
    dokumentSchluessel: (() => {
      V.dokumentAnlegen({ typ: 'sonstiges', name: 'Probe', sektorId: 'identity', gueltigAb: '2020-01-01' });
      return Object.keys((V.getData().dokumente || [])[0] || {});
    })(),
  };

  /* ══ A460 · DER ZWEITE NACHNAME ════════════════════════════════════════════
     Zu messen: derselbe aufwärtskompatible Weg wie bei den drei Schlüsseln —
     nimmt der Schlüssel BEIDES an, einen Wert oder eine Liste, ohne dass ein
     Bestandswert umzieht? */
  const { V: N } = ladeKern();
  await N.depotAnlegen('zug2-name-pw');
  N.akteurSelbstErklaeren('Prüfung');
  /* Der GEPFLANZTE BESTANDSWERT alter Form — er muss unverändert gelesen werden. */
  N.sektorFeldSetzen('identity', 'familyName', 'Silva');
  const altGelesen = {
    roh: N.feldRohwert ? N.feldRohwert('identity', 'familyName') : N.getData().sektoren.identity.familyName,
    papier: (N.docxBereichModell('identity').zeilen || [])
      .filter((z) => /Nachname/.test(z.label)).map((z) => z.wert),
    vcard: (String(N.vcardIdentitaet()).split('\n').find((z) => z.startsWith('FN:')) || '')
      .slice(3).replace(/\r$/, ''),
    claims: N.sdJwtVcIdentitaet().claims,
  };
  /* Und jetzt die neue Form: eine LISTE im selben Schlüssel. */
  let listeAngenommen = null, listeMeldung = null;
  try {
    N.sektorFeldSetzen('identity', 'familyName', ['Vaca', 'Espinoza']);
    listeAngenommen = true;
  } catch (e) { listeAngenommen = false; listeMeldung = String(e.message).slice(0, 100); }
  const neuGelesen = listeAngenommen ? {
    roh: N.getData().sektoren.identity.familyName,
    papier: (N.docxBereichModell('identity').zeilen || [])
      .filter((z) => /Nachname/.test(z.label)).map((z) => z.wert),
    vcard: (String(N.vcardIdentitaet()).split('\n').find((z) => z.startsWith('FN:')) || '')
      .slice(3).replace(/\r$/, ''),
    claims: N.sdJwtVcIdentitaet().claims,
  } : null;
  /* Wie viele Lesestellen gäbe es? Die Zahl entscheidet, ob „ein Schlüssel, zwei
     Formen" ein zweiter Lesepfad wäre. */
  const leseStellen = (kern.match(/\.familyName\b/g) || []).length;
  raus.nachname = {
    altGelesen, listeAngenommen, listeMeldung, neuGelesen, leseStellen,
    /* Der Kern führt bereits mehrwertige Felder — ihre Bauart ist der Anhalt. */
    mehrwertigeFeldarten: ['mehrfachauswahl', 'refMehrfach', 'liste'],
  };

  return raus;
}

function bericht(m) {
  const z = [];
  z.push('══ A461 · DAS UNGENAUE DATUM');
  z.push('   Modell nimmt "ca. 1990" an          : ' + m.datum.modellNimmtAn);
  z.push('   überlebt die Migrationskette        : ' + m.datum.ueberlebtMigration);
  z.push('   überlebt Speichern und Laden        : ' + m.datum.ueberlebtSpeichernUndLaden);
  z.push('   Feldtyp umgestellt (mutierter Kern) : ' + m.datum.umgestellt);
  if (m.datum.nachUmstellung) {
    z.push('       Bestandswert danach : ' + JSON.stringify(m.datum.nachUmstellung.wert));
    z.push('       Positivkontrolle    : ' + JSON.stringify(m.datum.nachUmstellung.kontrolle));
    z.push('       Maske danach        : ' + m.datum.nachUmstellung.maske);
  }
  z.push('   ungenaue Werte im Prüfstoff-Bestand : ' + JSON.stringify(m.datum.ungenaueImBestand));

  z.push('');
  z.push('══ A462 · DER TRANSKRIPTIONS-ANLASS');
  z.push('   Optionen                    : ' + JSON.stringify(m.anlass.optionen));
  z.push('   Liste steht auch in der Lese-App: ' + m.anlass.auchInLeseApp);
  z.push('   unbekannter Wert angenommen : ' + m.anlass.unbekannterAngenommen
    + (m.anlass.meldung ? ' · ' + m.anlass.meldung : ''));
  z.push('   feste Anlass-Listen im Kern : ' + JSON.stringify(m.anlass.festeListenImKern));

  z.push('');
  z.push('══ A463 · DER VORLAUF AM PRÜFBLATT');
  z.push('   Prüfsteine stehen im Katalog: ' + m.vorlauf.stehtImKatalog
    + ' · Schlüssel: ' + JSON.stringify(m.vorlauf.schluessel));
  z.push('   im Depot abgelegt           : ' + m.vorlauf.imDepotAbgelegt);
  z.push('   Schlüssel eines Dokuments   : ' + JSON.stringify(m.vorlauf.dokumentSchluessel));

  z.push('');
  z.push('══ A460 · DER ZWEITE NACHNAME');
  z.push('   Bestandswert alter Form gelesen: ' + JSON.stringify(m.nachname.altGelesen));
  z.push('   Liste im selben Schlüssel angenommen: ' + m.nachname.listeAngenommen
    + (m.nachname.listeMeldung ? ' · ' + m.nachname.listeMeldung : ''));
  if (m.nachname.neuGelesen) z.push('   danach gelesen: ' + JSON.stringify(m.nachname.neuGelesen));
  z.push('   Lesestellen `.nachname` im Kern: ' + m.nachname.leseStellen);
  return z.join('\n');
}

async function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V, ladeKern);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  laufen(i > -1 ? process.argv[i + 1] : null).then((m) => {
    console.log(bericht(m));
    if (!m.datum.modellNimmtAn || m.nachname.altGelesen.vcard !== 'Silva') {
      console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen };
