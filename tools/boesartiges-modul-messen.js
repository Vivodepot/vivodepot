#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 1 · DAS BÖSARTIGE MODUL — nicht defekt, absichtlich schädlich
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 1. Prüfstoff für die
   EIGENE Anwendung, kein Angriff auf ein fremdes System.

   DIE FRAGE DAHINTER: Die Zusage lautet „Module tragen keinen Code". Sie
   schützt vor Codeausführung — **schützt sie auch vor Daten, die Schaden
   anrichten?**

   DIE ANTWORT, gemessen: **auf der Ebene der Kennungen ja, auf der Ebene des
   Umfangs — seit 23.08.2026 (Posten 2, „Modulprüfung schließen") — auch.**
   Reservierte Kennungen halten in allen fünf Registern, kein Prototyp wird
   vergiftet, kein Label kommt unmaskiert in die Anzeige, ein Modul kann nicht
   über sich selbst lügen, wo es zählt — und 512 KB/Tiefe 40 sind jetzt eine
   verdrahtete Grenze, keine offene Messung mehr. 32 MB und 50 000 Ebenen
   GINGEN durch, im Browser ohne Fehler; heute weist `modulEinlassen` beide ab,
   bevor der gefährliche `JSON.stringify`-Pfad überhaupt erreicht wird.

   SONDERAUFLAGE DES LAUFZETTELS, und warum diese Datei trotzdem im Repo steht:
   Ein ausnutzbarer Fund dürfte hier nicht stehen. Es gibt keinen. Der eine
   Kandidat — ein Absturz beim Speichern ab ~8 000 Schachtelungsebenen — ist ein
   **Artefakt des Node-Harnischs**: dort ist `JSON.stringify` rekursiv und der
   Stapel klein. Im ausgelieferten Kern, im echten Chromium gemessen, tragen
   50 000 Ebenen und 32 MB ohne Fehler. **Das Produkt ist der Browser, nicht der
   Harnisch** — dieselbe Klasse wie die mutierten Stubs vom 16.08.

   DIE POSITIVKONTROLLE STEHT AN JEDER PROBE. Ein Stresstest, der nichts findet,
   ist ohne Gegenprobe nicht von einem zu unterscheiden, der nicht läuft.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

/* Ein gültiges Format-Modul als Grundform — ohne sie misst der ganze Block
   nichts. Der erste Anlauf verwendete `richtung: 'rein'` und eine `akzeptiert`-
   Liste statt einer Zeichenkette; alle fünf Format-Proben scheiterten dann an
   der Form und nicht am Gegenstand. */
const FORMAT_BASIS = Object.freeze({
  modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'x', richtung: 'import',
  sektor: 'identity', label: 'L', akzeptiert: '.json,application/json',
  leser: 'json', quelle: 'nachweis',
  erkennen: [{ pfad: 'doctype', gleich: 'urn:x' }],
  zuordnung: [{ feld: 'givenName', ziel: 'vn' }],
});
const NUTZLAST_HTML = '<img src=x onerror="window.__GEKAPERT=1">';

function messen(V, d) {
  const ein = (m) => V.modulEinlassen(JSON.stringify(m), d);
  const raus = {};

  /* ══ 1 · EINE EINGEBAUTE KERNKENNUNG NEU BELEGEN ═══════════════════════════ */
  raus.kennungen = {
    bereich: ein({ modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'boese',
      bereiche: { health: { label: 'UEBERNOMMEN' } } }),
    textsatz: ein({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'de', texte: {} }),
    rechtsraum: ein({ modulTyp: 'rechtsraum', sprache: 'de', moduleVersion: 1, rechtsraum: 'DE',
      typen: { 'enduring-power-of-attorney': { label: 'UEBERNOMMEN' } } }),
    institutionsArt: ein({ modulTyp: 'institutionsArt', sprache: 'de', moduleVersion: 1, herkunft: 'boese1',
      arten: { bank: 'UEBERNOMMEN', eigene_art: 'Eigene Art' } }),
    format: ein(Object.assign({}, FORMAT_BASIS, { format: 'json' })),
  };
  /* POSITIVKONTROLLEN: dieselbe Form mit EIGENER Kennung muss durchgehen. */
  raus.kennungenKontrolle = {
    /* BINDESTRICH, NICHT UNTERSTRICH: `_BEREICH_ID_FORM` ist /^[a-z][a-z0-9-]{1,39}$/.
       Der erste Anlauf schrieb `eigene_rubrik` und bekam `grund: 'id'` — die
       Positivkontrolle war falsch, nicht der Kern. (Die Institutions-Art nimmt den
       Unterstrich sehr wohl: die zwei Register haben verschieden strenge Formen.) */
    bereich: ein({ modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'gut1',
      bereiche: { 'eigene-rubrik': { label: 'Eigene Rubrik' } } }).angenommen,
    textsatz: ein({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr',
      texte: { 'identity.familyName.label': 'Nom' } }).angenommen,
    format: ein(Object.assign({}, FORMAT_BASIS, { format: 'eigenes-format' })).angenommen,
  };
  /* Und die Wirkung, nicht nur die Antwort: das eingebaute Label steht noch. */
  V._institutionsArtenAusDepotAnmelden(d);
  raus.eingebautesLabelHaelt = V.institutionsArtLabel('bank');
  raus.eigeneArtKamAn = V.institutionsArtLabel('eigene_art');

  /* ══ 2 · NUTZLAST AN UND ÜBER DER GRÖSSENGRENZE ════════════════════════════
     23.08.2026 (Posten 2, „Modulprüfung schließen"): die Grenze ist verdrahtet, 512 KB. Die
     drei Angriffswerte (1/8/32 MB) liegen alle darüber und dienen jetzt als Zusage, nicht mehr
     als offene Messung; `0.1` MB (~100 KB) ist die Positivkontrolle darunter. */
  raus.groesse = [];
  for (const mb of [0.1, 1, 8, 32]) {
    const r = ein({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'g' + mb,
      texte: { 'identity.familyName.label': 'x'.repeat(Math.round(mb * 1024 * 1024)) } });
    raus.groesse.push({ mb, angenommen: r.angenommen, grund: r.grund });
  }

  /* ══ 3 · TIEF VERSCHACHTELT ════════════════════════════════════════════════
     Dieselbe Umkehrung: Tiefe 40 ist verdrahtet. `10` Ebenen ist die Positivkontrolle darunter,
     `1000`/`50000` liegen weit darüber. */
  raus.tiefe = [];
  for (const t of [10, 1000, 50000]) {
    const text = '{"modulTyp":"textsatz","moduleVersion":1,"sprache":"t' + t
      + '","texte":{},"regeln":' + '['.repeat(t) + ']'.repeat(t) + '}';
    const r = V.modulEinlassen(text, d);
    raus.tiefe.push({ t, angenommen: r.angenommen, grund: r.grund });
  }

  /* ══ 4 · WERTE, DIE ANDERE FELDER ÜBERSCHREIBEN ════════════════════════════ */
  const vorherNachname = (d.sektoren.identity || {}).familyName;
  V.modulEinlassen('{"modulTyp":"textsatz","moduleVersion":1,"sprache":"pp","texte":{},'
    + '"__proto__":{"vergiftet":"JA"}}', d);
  V.modulEinlassen('{"modulTyp":"textsatz","moduleVersion":1,"sprache":"pq",'
    + '"texte":{"__proto__":{"vergiftet2":"JA"}}}', d);
  V.modulEinlassen('{"modulTyp":"textsatz","moduleVersion":1,"sprache":"pr","texte":{},'
    + '"regeln":{"constructor":{"prototype":{"vergiftet3":"JA"}}}}', d);
  const fremd = ein({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fs', texte: {},
    sektoren: { identity: { familyName: 'GEKAPERT' } }, personen: [{ name: 'Fremd' }] });
  const imSlot = (d.textsatzModule || []).find((m) => m.sprache === 'fs') || {};
  const formatFremd = ein(Object.assign({}, FORMAT_BASIS,
    { format: 'ff', boeserSchluessel: { a: 1 } }));
  raus.ueberschreiben = {
    /* Explizit als Text, nicht als Array: `JSON.stringify` macht aus `undefined`
       in einem Array ein `null`, und „null" liest sich wie ein gesetzter Wert. */
    prototypVergiftet: [({}).vergiftet, ({}).vergiftet2, ({}).vergiftet3]
      .map((v) => (v === undefined ? 'unberührt' : 'VERGIFTET: ' + String(v))),
    depotNachnameVorher: vorherNachname,
    depotNachnameNachher: (d.sektoren.identity || {}).familyName,
    fremdAngenommen: fremd.angenommen,
    fremdImSlot: Object.keys(imSlot).filter((k) => ['sektoren', 'personen'].includes(k)),
    fremdBenannt: fremd.verworfene,
    formatBenennt: formatFremd.verworfene,
  };

  /* ══ 5 · HERKUNFT ZEIGT AUF EINE FREMDE INSTITUTION ════════════════════════ */
  const fremdeHerkunft = ein({ modulTyp: 'institutionsArt', sprache: 'de', moduleVersion: 1,
    herkunft: 'https://www.bundesaerztekammer.de/', anbieterId: 'bundesaerztekammer',
    arten: { fremde_art: 'Von der Bundesärztekammer geprüft' } });
  const fhSlot = (d.institutionsArten || []).find((m) => /bundesaerzte/.test(String(m.herkunft))) || {};
  raus.herkunft = {
    angenommen: fremdeHerkunft.angenommen,
    anbieterId: fremdeHerkunft.anbieterId,
    ungeprueftErzwungen: fhSlot.ungeprueft,
  };

  /* ══ 6 · GÜLTIGE FORM, WIDERSPRÜCHLICHER INHALT ═══════════════════════════ */
  const luegt = ein({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'wd',
    texte: { 'identity.familyName.label': 'Nom' },
    ungeprueft: false, eingelassenAm: '1999-01-01',
    anbieterId: 'vivodepot-gmbh', anbieterIdGeprueft: true });
  const lSlot = (d.textsatzModule || []).find((m) => m.sprache === 'wd') || {};
  raus.luegen = {
    angenommen: luegt.angenommen,
    ungeprueftImSlot: lSlot.ungeprueft,
    eingelassenAmImSlot: lSlot.eingelassenAm,
    anbieterIdGeprueftImSlot: lSlot.anbieterIdGeprueft,
  };

  /* ══ ANZEIGE · kommt ein feindliches Label unmaskiert in die Oberfläche? ═══
     GEMESSEN AM GERENDERTEN HTML-STRING, nicht am Element-Objekt. */
  const html = V.feldInputHTML(
    { id: 'art', typ: 'auswahl', optionen: [
      { wert: 'gut', label: 'Gutartig' }, { wert: 'boese', label: NUTZLAST_HTML }] }, 'gut');
  const htmlKennung = V.feldInputHTML(
    { id: 'art', typ: 'auswahl', optionen: [{ wert: 'x" onfocus=alert(1) y="', label: 'L' }] }, '');
  raus.anzeige = {
    /* `<` und `>` maskiert — das entscheidet, nicht ob die Zeichenkette `onerror`
       im Text vorkommt. Der erste Anlauf prüfte auf `onerror="` und bekam einen
       Treffer im INERTEN Text: die Prüfzeichenkette war falsch, nicht der Code. */
    spitzeKlammernMaskiert: html.includes('&lt;img') && !html.includes('<img'),
    kennungBrichtAusAttributAus: /onfocus=alert\(1\)/.test(htmlKennung.replace(/&quot;/g, '')) === true
      && !htmlKennung.includes('&quot;'),
    ausschnitt: (html.match(/<option value="boese">[^<]*/) || [''])[0],
  };

  return raus;
}

function bericht(m) {
  const z = [];
  const ja = (b) => (b ? 'JA' : 'nein');
  z.push('══ 1 · EINE EINGEBAUTE KERNKENNUNG NEU BELEGEN');
  for (const [k, r] of Object.entries(m.kennungen)) {
    z.push('   ' + k.padEnd(16) + ' angenommen=' + r.angenommen + ' grund=' + r.grund
      + (r.verworfene.length ? ' verworfene=' + JSON.stringify(r.verworfene) : ''));
  }
  z.push('   POSITIVKONTROLLEN (eigene Kennung): ' + JSON.stringify(m.kennungenKontrolle));
  z.push('   das eingebaute Label `bank` steht noch: ' + JSON.stringify(m.eingebautesLabelHaelt));
  z.push('   die eigene Art kam an                : ' + JSON.stringify(m.eigeneArtKamAn));

  z.push('');
  z.push('══ 2 · GRÖSSE — Grenze 512 KB (verdrahtet 23.08.2026)');
  for (const g of m.groesse) z.push('   ' + String(g.mb).padStart(4) + ' MB  angenommen=' + g.angenommen + ' grund=' + g.grund);

  z.push('');
  z.push('══ 3 · SCHACHTELUNGSTIEFE — Grenze 40 (verdrahtet 23.08.2026)');
  for (const t of m.tiefe) z.push('   ' + String(t.t).padStart(6) + ' Ebenen  angenommen=' + t.angenommen + ' grund=' + t.grund);

  z.push('');
  z.push('══ 4 · WERTE, DIE ANDERE FELDER ÜBERSCHREIBEN');
  z.push('   Object.prototype vergiftet: ' + JSON.stringify(m.ueberschreiben.prototypVergiftet));
  z.push('   Depot-Nachname vorher/nachher: ' + JSON.stringify(m.ueberschreiben.depotNachnameVorher)
    + ' / ' + JSON.stringify(m.ueberschreiben.depotNachnameNachher));
  z.push('   Fremdschlüssel am TEXTSATZ-Modul: angenommen=' + m.ueberschreiben.fremdAngenommen
    + ' · reisen mit: ' + JSON.stringify(m.ueberschreiben.fremdImSlot)
    + ' · benannt: ' + JSON.stringify(m.ueberschreiben.fremdBenannt));
  z.push('   dieselben am FORMAT-Modul       : benannt: ' + JSON.stringify(m.ueberschreiben.formatBenennt));

  z.push('');
  z.push('══ 5 · HERKUNFT ZEIGT AUF EINE FREMDE INSTITUTION');
  z.push('   angenommen=' + m.herkunft.angenommen + ' · anbieterId=' + JSON.stringify(m.herkunft.anbieterId)
    + ' · `ungeprueft` erzwungen: ' + JSON.stringify(m.herkunft.ungeprueftErzwungen));

  z.push('');
  z.push('══ 6 · DAS MODUL LÜGT ÜBER SICH SELBST');
  z.push('   angenommen=' + m.luegen.angenommen
    + ' · ungeprueft im Slot=' + JSON.stringify(m.luegen.ungeprueftImSlot)
    + ' · eingelassenAm=' + JSON.stringify(m.luegen.eingelassenAmImSlot));
  z.push('   anbieterIdGeprueft im Slot: ' + JSON.stringify(m.luegen.anbieterIdGeprueftImSlot)
    + '   (heute liest diesen Schlüssel NICHTS)');

  z.push('');
  z.push('══ ANZEIGE — kommt ein feindliches Label unmaskiert an?');
  z.push('   spitze Klammern maskiert     : ' + ja(m.anzeige.spitzeKlammernMaskiert));
  z.push('   Kennung bricht aus Attribut  : ' + ja(m.anzeige.kennungBrichtAusAttributAus));
  z.push('   Ausschnitt: ' + m.anzeige.ausschnitt);
  return z.join('\n');
}

async function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  await V.depotAnlegen('boesartiges-modul-messen-pw');
  V.akteurSelbstErklaeren('Prüfung');
  return messen(V, V.getData());
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  laufen(i > -1 ? process.argv[i + 1] : null).then((m) => {
    console.log(bericht(m));
    const kontrollen = Object.values(m.kennungenKontrolle);
    if (kontrollen.some((k) => k !== true)) {
      console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen, FORMAT_BASIS, NUTZLAST_HTML };
