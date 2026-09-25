#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 7 · DIE NAMENSÄNDERUNG — und was `fruehere_namen` wirklich tut
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 7.
   Heirat, Scheidung, geänderter Geschlechtseintrag. **Die alten Dokumente
   tragen den alten Namen.**

   DER AUFTRAG VERLANGT AUSDRÜCKLICH: *„Was tun `geburtsname` und
   `fruehere_namen` dabei tatsächlich — gemessen, nicht aus ihrer Benennung
   geschlossen."*

   ══ WAS SIE TATSÄCHLICH TUN ═══════════════════════════════════════════════
   **Beide sind ZURÜCKHALTUNGS-Felder: sie speichern, aber sie geben nicht
   heraus.** `geburtsname` ist `sensibel: true`; bei `fruehere_namen` sind ALLE
   inhaltstragenden Unterfelder sensibel (`name`, `gefuehrt_bis`, `anlass`,
   `nachweis_ort`). Im Datensatz erscheint die Liste darum als **nackte
   Kennungen** — `[{"id":"…"}]` —, auf dem Papier als **leere Zeile**.

   **DAS IST ABSICHT UND RICHTIG.** Die Liste entstand am 11.08.2026 mit § 13
   SBGG im Blick: ein geänderter Geschlechtseintrag darf nicht offenbart werden.
   Die Voreinstellung ist die geschützte.

   **UND DIE TÜR IST DA:** eine bewusste Freigabe über `sensibelFeldSetzen`
   (Schema-Flag als Voreinstellung, Bürger-Entscheidung gewinnt — A161) bringt
   beide in den Datensatz. Gemessen, nicht angenommen.

   ══ DER FUND, der über die Namen hinausgeht ═══════════════════════════════
   **Die Übersicht „Das wird herausgegeben" ist blind für sensible
   Listen-UNTERFELDER.** `exportUebersichtModell` (`vivodepot.html:38205`)
   läuft im Bereichs-Zweig über `sek.felder` (`:38245`) und steigt **nie** in
   `f.unterFelder` hinab. Folge: die Liste steht unter **„enthalten"**, während
   ihr Inhalt still herausgefiltert wird.

   **Dieselbe Stelle trägt vier Zeilen darüber die Zusicherung**, die hier eine
   Ebene tiefer bricht: *„die Zusicherung ‚das wird herausgegeben' darf ein Feld
   nicht verschweigen, nur weil sein Wert am Zielort liegt."*

   **Es ist nicht namensspezifisch** — die Gegenprobe an `finance.accounts`
   (Unterfeld `iban`, sensibel) zeigt dasselbe. **Der Anlass-Weg über eine
   Kennungs-Liste ist NICHT betroffen:** dort löst der Code Listen-Selektoren
   ausdrücklich auf. Die Lücke sitzt allein im Bereichs-Zweig.

   **KEINE BEHEBUNG — so beauftragt.**
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

async function messen(V) {
  const raus = {};
  await V.depotAnlegen('namensaenderung-pw');
  V.akteurSelbstErklaeren('Kim');

  V.sektorFeldSetzen('identity', 'givenName', 'Kim');
  V.sektorFeldSetzen('identity', 'familyName', 'Hartmann');
  V.sektorFeldSetzen('identity', 'birthName', 'Vogel');
  V.listenEintragHinzufuegen('identity', 'formerNames',
    { name: 'Kim Vogel', reason: 'heirat', usedUntil: '2005-06-11' });
  V.listenEintragHinzufuegen('identity', 'formerNames',
    { name: 'Karsten Vogel', reason: 'personenstand', usedUntil: '2019-03-02' });
  /* Das Zeugnis von 2005 — es lautet auf den damaligen Namen. */
  V.dokumentAnlegen({ typ: 'sonstiges', name: 'Abiturzeugnis 2005 (lautet auf Karsten Vogel)',
    sektorId: 'education', gueltigAb: '2005-06-20' });

  /* ══ 1 · Was steht im Feldkatalog? ════════════════════════════════════════ */
  const identSektor = (V.bereicheAlle()).find((s) => s.id === 'identity');
  const alle = (identSektor.sektionen || []).flatMap((k) => k.felder || []);
  const fn = alle.find((f) => f.id === 'formerNames');
  raus.katalog = {
    geburtsnameSensibel: !!alle.find((f) => f.id === 'birthName').sensibel,
    listeSelbstSensibel: !!fn.sensibel,
    unterfelder: (fn.unterFelder || []).map((u) => ({ id: u.id, sensibel: !!u.sensibel, typ: u.typ })),
  };

  /* ══ 2 · Was kommt tatsächlich heraus? ════════════════════════════════════ */
  const vorher = V.vollExportJSON().depot.sektoren.identity;
  raus.ausgabeVorFreigabe = {
    geburtsname: Object.prototype.hasOwnProperty.call(vorher, 'birthName')
      ? vorher.birthName : '(nicht im Datensatz)',
    fruehereNamen: vorher.formerNames,
    /* Trägt ein Eintrag noch IRGENDEINEN Inhalt, oder nur seine Kennung? */
    nurKennungen: Array.isArray(vorher.formerNames)
      && vorher.formerNames.every((z) => Object.keys(z).join(',') === 'id'),
    papier: (V.docxBereichModell('identity').zeilen || [])
      .map((z) => z.label + '=' + z.wert).filter((z) => /Name/i.test(z)),
    vcard: String(V.vcardIdentitaet()).split(/\r?\n/)
      .filter((z) => z && !/^(BEGIN|VERSION|END)/.test(z)),
  };

  /* ══ 3 · Die Übersicht „Das wird herausgegeben" ═══════════════════════════ */
  const u = V.exportUebersichtModell('identity');
  raus.uebersicht = {
    enthalten: u.enthalten.map((e) => e.feld),
    zurueckgehalten: u.zurueckgehalten.map((e) => e.feld),
    /* BEHOBEN (A473, 22.08.2026): die Liste steht jetzt korrekt unter „zurückgehalten" —
     * alle vier Unterfelder sind sensibel, sie ginge sonst als leere Hülle heraus. */
    listeGiltAlsEnthalten: u.enthalten.some((e) => e.feld === 'formerNames'),
    unterfeldGenannt: JSON.stringify(u).includes('liste:formerNames'),
  };

  /* ══ 4 · GEGENPROBE: ist es namensspezifisch? ═════════════════════════════ */
  V.listenEintragHinzufuegen('finance', 'accounts',
    { institution: { override: 'Sparkasse' }, iban: 'DE89370400440532013000' });
  const uf = V.exportUebersichtModell('finance');
  raus.gegenprobeKonten = {
    enthalten: uf.enthalten.map((e) => e.feld),
    zurueckgehalten: uf.zurueckgehalten.map((e) => e.feld),
    imDatensatz: V.vollExportJSON().depot.sektoren.finance.accounts,
  };

  /* ══ 5 · DIE TÜR: eine bewusste Freigabe ═════════════════════════════════ */
  V.sensibelFeldSetzen('identity', 'birthName', false);
  V.sensibelFeldSetzen('identity', 'liste:formerNames:*:name', false);
  const nachher = V.vollExportJSON().depot.sektoren.identity;
  raus.ausgabeNachFreigabe = {
    geburtsname: nachher.birthName,
    fruehereNamen: nachher.formerNames,
  };

  /* ══ 6 · Ist das Zeugnis der Person zuordenbar? ═══════════════════════════ */
  const dok = (V.getData().dokumente || [])[0] || {};
  raus.dokument = {
    schluessel: Object.keys(dok),
    /* Gibt es einen STRUKTURELLEN Bezug zu einem früheren Namen — oder steht der
       alte Name nur im Freitext des Dokumentnamens? */
    bezugAufFrueherenNamen: Object.keys(dok).some((k) => /frueher|namensbezug|lautetAuf/i.test(k)),
    name: dok.name,
  };

  return raus;
}

function bericht(m) {
  const z = [];
  z.push('══ 1 · WAS DER FELDKATALOG SAGT');
  z.push('   `geburtsname` sensibel      : ' + m.katalog.geburtsnameSensibel);
  z.push('   Liste selbst sensibel       : ' + m.katalog.listeSelbstSensibel);
  for (const u of m.katalog.unterfelder) {
    z.push('       ' + u.id.padEnd(30) + ' sensibel=' + u.sensibel + ' typ=' + u.typ);
  }

  z.push('');
  z.push('══ 2 · WAS TATSÄCHLICH HERAUSKOMMT (Voreinstellung)');
  z.push('   Datensatz `geburtsname`     : ' + JSON.stringify(m.ausgabeVorFreigabe.geburtsname));
  z.push('   Datensatz `fruehere_namen`  : ' + JSON.stringify(m.ausgabeVorFreigabe.fruehereNamen));
  z.push('   nur noch Kennungen          : ' + m.ausgabeVorFreigabe.nurKennungen);
  z.push('   Papier                      : ' + JSON.stringify(m.ausgabeVorFreigabe.papier));
  z.push('   vCard                       : ' + JSON.stringify(m.ausgabeVorFreigabe.vcard));

  z.push('');
  z.push('══ 3 · DIE ÜBERSICHT „DAS WIRD HERAUSGEGEBEN"');
  z.push('   enthalten                   : ' + JSON.stringify(m.uebersicht.enthalten));
  z.push('   zurückgehalten              : ' + JSON.stringify(m.uebersicht.zurueckgehalten));
  z.push('   Liste gilt als ENTHALTEN    : ' + m.uebersicht.listeGiltAlsEnthalten
    + '   ← der Fund: ihr Inhalt geht nicht mit');
  z.push('   ein Unterfeld wird genannt  : ' + m.uebersicht.unterfeldGenannt);

  z.push('');
  z.push('══ 4 · GEGENPROBE `finance.accounts` — nicht namensspezifisch');
  z.push('   enthalten                   : ' + JSON.stringify(m.gegenprobeKonten.enthalten));
  z.push('   zurückgehalten              : ' + JSON.stringify(m.gegenprobeKonten.zurueckgehalten));
  z.push('   im Datensatz                : ' + JSON.stringify(m.gegenprobeKonten.imDatensatz));

  z.push('');
  z.push('══ 5 · DIE TÜR — nach bewusster Freigabe (POSITIVKONTROLLE)');
  z.push('   Datensatz `geburtsname`     : ' + JSON.stringify(m.ausgabeNachFreigabe.geburtsname));
  z.push('   Datensatz `fruehere_namen`  : ' + JSON.stringify(m.ausgabeNachFreigabe.fruehereNamen));

  z.push('');
  z.push('══ 6 · DAS ZEUGNIS VON 2005');
  z.push('   Dokument-Schlüssel          : ' + JSON.stringify(m.dokument.schluessel));
  z.push('   struktureller Bezug         : ' + m.dokument.bezugAufFrueherenNamen);
  z.push('   Name                        : ' + JSON.stringify(m.dokument.name));
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
    if (m.ausgabeNachFreigabe.geburtsname !== 'Vogel') {
      console.error('\nABBRUCH: die Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen };
