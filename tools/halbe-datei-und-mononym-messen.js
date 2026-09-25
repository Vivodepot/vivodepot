#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 5 UND 6 · Die halb geschriebene Datei · Der Mononym
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 5 und 6.
   **Keine Behebung** — beide messen, was ist.

   ══ POSTEN 5 · DIE HALB GESCHRIEBENE DATEI ══════════════════════════════════
   *„Was findet die Bürgerin beim nächsten Öffnen — die alte Fassung, eine
   unbrauchbare, oder eine, die aussieht wie brauchbar? Der dritte Fall ist der
   gefährliche."* Kein Theoriefall: am 29.07. gab es einen Beinah-Datenverlust.

   **DER DRITTE FALL EXISTIERT NICHT.** Der Umschlag zerfällt in einzeln
   verschlüsselte Einheiten, und JEDE Verstümmelung wird laut abgewiesen:
     · eine Einheit fehlt      → „zu einer Adresse dieses Fachs fehlt die Einheit"
     · die Hälfte fehlt        → dieselbe Meldung
     · eine Einheit verfälscht → AES-GCM verweigert die Entschlüsselung
     · der Text abgeschnitten  → `JSON.parse` wirft
   Es gibt keinen Zustand „öffnet und ist heimlich unvollständig".

   **UND DIE ERSTE ANTWORT: die alte Fassung.** Der Kern schreibt über
   `createWritable()` OHNE `keepExistingData` — Chromium legt dafür eine
   Swap-Datei an und ersetzt das Original erst bei `close()`. An der Plattform
   gemessen (nicht aus der Dokumentation geschlossen): während des Schreibens
   und nach einem Abbruch liest die Datei unverändert die alte Fassung.
   Verloren geht die ungespeicherte Sitzung, nicht die Datei.

   ══ POSTEN 6 · DER MONONYM ══════════════════════════════════════════════════
   *„Bricht `vorname` plus `nachname` härter als zwei Nachnamen — hier fehlt
   einer, statt dass einer zu viel ist."*

   **GEMESSEN: NEIN, ES BRICHT WENIGER.** Jeder Weg filtert leere Teile:
   die vCard baut `FN` über `filter(Boolean).join(' ')` (kein führendes
   Leerzeichen), der VC-Datensatz liefert nur den vorhandenen Claim ohne
   erfundenen zweiten, das Papierblatt zeigt eine Zeile statt zwei, und der
   Dateiname hängt gar nicht am Namen. **Die Auftragsvermutung ist widerlegt.**

   **Die eigentliche Frage des Auftrags — ein Feld oder eine Struktur? — hat
   damit ihre Antwort:** der Name ist heute **zwei Felder mit festen Rollen**.
   Beide Randfälle, der eine Name und die drei Namen, werden durch HINEINDRÜCKEN
   gelöst, nicht durch Struktur. Der Mononym drückt sich schadlos hinein, der
   Doppelnachname verliert dabei die Information, dass es zwei sind (P19/P20).
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const PASSWORT = 'stresstest-5-6-pw';

async function messen(V, ladeKern) {
  const raus = {};

  /* ══ POSTEN 5 ═════════════════════════════════════════════════════════════ */
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Prüfung');
  V.sektorFeldSetzen('identity', 'givenName', 'Vorher');
  V.sektorFeldSetzen('health', 'bloodType', '0+');
  V.personHinzufuegen({ name: 'Mensch A', beziehung: 'X' });
  const umschlag = await V.depotSerialisieren();
  const kennungen = Object.keys(umschlag.einheiten || {});

  const oeffnen = async (um) => {
    const { V: W } = ladeKern();
    try {
      await W.depotLaden(um, PASSWORT);
      const d = W.getData();
      return { geoeffnet: true, vorname: (d.sektoren.identity || {}).givenName,
        menschen: (d.menschen || []).length };
    } catch (e) { return { geoeffnet: false, meldung: String(e && e.message).slice(0, 90) }; }
  };
  const kopie = (o) => JSON.parse(JSON.stringify(o));

  const eineFehlt = kopie(umschlag); delete eineFehlt.einheiten[kennungen[5]];
  const haelfteFehlt = kopie(umschlag);
  for (const k of kennungen.slice(0, Math.floor(kennungen.length / 2))) delete haelfteFehlt.einheiten[k];
  const verfaelscht = kopie(umschlag);
  verfaelscht.einheiten[kennungen[5]].ct = 'AAAA' + verfaelscht.einheiten[kennungen[5]].ct.slice(4);

  const text = JSON.stringify(umschlag);
  const gekuerzt = [];
  for (const anteil of [0.5, 0.9, 0.99]) {
    let meldung = null;
    try { JSON.parse(text.slice(0, Math.floor(text.length * anteil))); }
    catch (e) { meldung = String(e.message).slice(0, 50); }
    gekuerzt.push({ anteil, parseWirft: meldung !== null, meldung });
  }

  raus.halbeDatei = {
    einheiten: kennungen.length,
    /* POSITIVKONTROLLE ZUERST: der intakte Umschlag öffnet vollständig. Ohne sie
       ist „alles wird abgewiesen" nicht von „nichts öffnet je" zu unterscheiden. */
    kontrolleIntakt: await oeffnen(umschlag),
    eineEinheitFehlt: await oeffnen(eineFehlt),
    haelfteFehlt: await oeffnen(haelfteFehlt),
    verfaelscht: await oeffnen(verfaelscht),
    textGekuerzt: gekuerzt,
  };

  /* ══ POSTEN 6 ═════════════════════════════════════════════════════════════ */
  const nameFall = async (felder) => {
    const { V: W } = ladeKern();
    await W.depotAnlegen(PASSWORT);
    W.akteurSelbstErklaeren('Prüfung');
    for (const [k, v] of Object.entries(felder)) W.sektorFeldSetzen('identity', k, v);
    const vcard = W.vcardIdentitaet();
    /* Das `\r` der vCard-Zeilenenden gehört zum Format, nicht zum Namen — ohne
       das Abschneiden meldet die Leerstellen-Prüfung unten IMMER einen Treffer,
       auch im Normalfall. Genau das tat der erste Lauf. */
    const fn = (String(vcard).split('\n').find((z) => z.startsWith('FN:')) || '')
      .slice(3).replace(/\r$/, '');
    return {
      claims: W.sdJwtVcIdentitaet().claims,
      vcardFN: fn,
      /* Das Merkmal, an dem ein Mononym normalerweise kenntlich wird: ein
         führendes oder doppeltes Leerzeichen aus einer leeren Hälfte. */
      fnHatLeerstelle: /^\s|\s\s|\s$/.test(fn),
      papierZeilen: (W.docxBereichModell('identity').zeilen || [])
        .map((z) => z.label + '=' + z.wert).filter((z) => /Name/i.test(z)),
      dateiname: W.depotDateiname(),
    };
  };
  raus.mononym = {
    beide: await nameFall({ givenName: 'Ana', familyName: 'Silva' }),
    nurNachname: await nameFall({ familyName: 'Sukarno' }),
    nurVorname: await nameFall({ givenName: 'Sukarno' }),
    garKeiner: await nameFall({}),
  };

  /* Und der Strukturbefund, gemessen statt behauptet: wie viele Namensfelder
     führt `identity`, und trägt eines davon eine Rolle-freie Form? */
  const identSektor = (V.bereicheAlle()).find((s) => s.id === 'identity');
  const alle = (identSektor.sektionen || []).flatMap((k) => k.felder || []);
  raus.struktur = {
    namensfelder: alle.filter((f) => /^(givenName|familyName|secondLastName|birthName)$/.test(f.id)).map((f) => f.id),
    /* Ein Feld ohne Rollenbindung — „der Name, wie er geschrieben wird" — gibt
       es nicht. Das ist die Antwort auf „Feld oder Struktur". */
    kenntVollenNamen: alle.some((f) => /^(name|fullName|nameLine)$/.test(f.id)),
  };

  return raus;
}

function bericht(m) {
  const z = [];
  z.push('══ POSTEN 5 · DIE HALB GESCHRIEBENE DATEI');
  z.push('   Einheiten im Umschlag: ' + m.halbeDatei.einheiten);
  z.push('   POSITIVKONTROLLE intakt : ' + JSON.stringify(m.halbeDatei.kontrolleIntakt));
  z.push('   eine Einheit fehlt      : ' + JSON.stringify(m.halbeDatei.eineEinheitFehlt));
  z.push('   die Hälfte fehlt        : ' + JSON.stringify(m.halbeDatei.haelfteFehlt));
  z.push('   eine Einheit verfälscht : ' + JSON.stringify(m.halbeDatei.verfaelscht));
  for (const g of m.halbeDatei.textGekuerzt) {
    z.push('   Text auf ' + (g.anteil * 100) + '% gekürzt: JSON.parse wirft = ' + g.parseWirft
      + (g.meldung ? ' · ' + g.meldung : ''));
  }

  z.push('');
  z.push('══ POSTEN 6 · DER MONONYM');
  for (const [name, f] of Object.entries(m.mononym)) {
    z.push('   ' + name.padEnd(13) + ' claims=' + JSON.stringify(f.claims));
    z.push('   ' + ''.padEnd(13) + ' FN=' + JSON.stringify(f.vcardFN)
      + ' · Leerstelle: ' + f.fnHatLeerstelle
      + ' · Papier=' + JSON.stringify(f.papierZeilen));
  }
  z.push('');
  z.push('   Namensfelder in `identity`: ' + JSON.stringify(m.struktur.namensfelder));
  z.push('   ein rollenfreies Namensfeld : ' + m.struktur.kenntVollenNamen);
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
    if (!m.halbeDatei.kontrolleIntakt.geoeffnet
      || m.halbeDatei.kontrolleIntakt.vorname !== 'Vorher') {
      console.error('\nABBRUCH: die Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen, PASSWORT };
