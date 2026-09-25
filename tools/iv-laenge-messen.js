'use strict';
/* ════════════════════════════════════════════════════════════════════════
   iv-laenge-messen.js — die IV-Länge auf dem LESE-Weg, am echten Browser
   ────────────────────────────────────────────────────────────────────────
   ANLASS (19.08.2026, A341 → „IV-Länge Lesepfad"): `encryptData`
   erzeugt zwölf Byte IV. `decryptData` liest `stored.iv` aus der DATEI und
   prüft die Länge NICHT — eine fremde Datei kann jede Länge mitbringen.

   DIE FRAGE, und sie ist nicht rhetorisch: scheitert jeder Fall am AUTH-TAG
   (dann ist die fehlende Prüfung folgenlos, weil AES-GCM die IV in die
   Tag-Berechnung nimmt), oder verhält sich einer anders — kein Wurf, ein
   anderer Fehlertyp, ein ABSTURZ statt einer Ausnahme, ein spürbarer
   Laufzeitunterschied?

   WARUM AM BROWSER UND NICHT IM NODE-HARNISCH: der Gegenstand ist das
   Verhalten der WebCrypto-Implementierung des AUSLIEFERUNGS-Browsers bei
   einer IV-Länge, die die Spezifikation zwar zulässt (GCM erlaubt jede
   IV-Länge), die das Produkt aber nie erzeugt. Node-OpenSSL kann sich hier
   anders verhalten als Chromium; eine Messung an Node beantwortete die Frage
   der Bürgerin nicht.

   ZWEI EBENEN, weil sie verschiedene Dinge beantworten:
     1 · die PRIMITIVE  (`decryptData`) — was tut WebCrypto?
     2 · der ECHTE WEG  (`depotLaden`)  — was sieht die Bürgerin?

   Diese Datei MISST und ändert nichts. Der geprüfte Kern ist über
   `KERN_HTML_PATH` umlenkbar (wie `tests/load-kern.js`).

   Aufruf:
     node tools/iv-laenge-messen.js
     node tools/iv-laenge-messen.js --json
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const ALS_JSON = process.argv.includes('--json');

/* Die geprüften Längen. 12 ist der Anker („so soll es aussehen"), alles
   andere ist eine Datei, die das Produkt nie geschrieben haben kann. */
const FAELLE = [
  { name: 'IV 0 Byte', laenge: 0 },
  { name: 'IV 8 Byte', laenge: 8 },
  { name: 'IV 12 Byte, falscher Inhalt (ANKER)', laenge: 12, anker: true },
  { name: 'IV 16 Byte', laenge: 16 },
  { name: 'IV 64 Byte', laenge: 64 },
  { name: 'IV 1024 Byte', laenge: 1024 },
];

(async () => {
  const { neueBrowserSitzung } = await import(
    path.join(__dirname, '..', 'tests', 'konformitaet', 'krypto-browser-sitzung.mjs').replace(/\\/g, '/')
  );
  const { browser, page } = await neueBrowserSitzung();

  /* Ein Absturz ist der Fund, auf den der Auftrag ausdrücklich zeigt — er
     muss darum beobachtet werden, nicht erschlossen. */
  const abstuerze = [];
  page.on('pageerror', (e) => abstuerze.push('pageerror: ' + e.message));
  page.on('crash', () => abstuerze.push('SEITE ABGESTÜRZT'));

  try {
    const ergebnis = await page.evaluate(async (faelle) => {
      const b64 = (u8) => btoa(String.fromCharCode(...u8));
      const raus = { primitive: [], echterWeg: [], anker: {} };

      // ── Vorbereitung: ein echtes Depot, echte Schlüssel, echter Umschlag ──
      // `data` ist im Kern eine Modul-Variable ohne Zugriffsfunktion — der
      // Seitenkontext erreicht sie direkt, anders als der Node-Harnisch, der
      // sich dafür `getData`/`setData` in `tests/load-kern.js` baut.
      const pw = 'MessungIVLaenge-2026!';
      await window.__vdOeffentlich.depotAnlegen(pw);
      // Code-Review 16.09.2026, A5: schrieb bis dahin unter einer alten deutschen Kennung — die
      // Sonde unten liest bereits sektoren.identity.givenName und fand darum nie einen Referenten.
      window.__vdOeffentlich.ankerDaten().sektoren.identity = { givenName: 'Mess', familyName: 'Probe' };
      const umschlag = await window.__vdOeffentlich.depotSerialisieren();
      raus.anker.ivLaengeImUmschlag = atob(umschlag.iv).length;

      /* Der Schlüssel, mit dem der Umschlag geschrieben wurde — für Ebene 1.
         Fund 18.09.2026, Krypto-Kapselung Weg A: rief bis heute deriveDepotKeyV2(sessionHkdfKey, ...)
         direkt — sessionHkdfKey liegt seit der Kapselung closure-privat in VdCrypto, dieser
         bare-Zugriff hätte ReferenceError geworfen (kein neuer Zugriff hier gebaut, nur auf die
         vorhandene Hülle umgestellt — dieselbe Form wie an jeder anderen Session-Ableitungsstelle
         im Kern). VdCrypto.setupSession() lief bereits über depotAnlegen(pw) oben. */
      const subKey = await VdCrypto.depotSchluessel(
        base64ToBytes(umschlag.depotSalt), umschlag.depotUUID);

      // Gegenprobe: mit der ECHTEN IV geht es auf. Ohne sie wäre „wirft immer"
      // von „geht nie" nicht zu unterscheiden.
      let anker = null;
      try {
        const klar = await decryptData({ iv: umschlag.iv, ct: umschlag.ct }, subKey, _AAD_DEPOT_V2);
        anker = { geoeffnet: true, vorname: klar && klar.sektoren && klar.sektoren.identity
          ? klar.sektoren.identity.givenName : null };
      } catch (e) { anker = { geoeffnet: false, fehler: e.name + ': ' + e.message }; }
      raus.anker.echteIvOeffnet = anker;

      // ── Ebene 1: die Primitive ──────────────────────────────────────────
      for (const f of faelle) {
        const iv = new Uint8Array(f.laenge);
        crypto.getRandomValues(iv);
        const t0 = performance.now();
        let wurf = null, ergebnisTyp = 'KEIN WURF — geöffnet';
        try {
          await decryptData({ iv: b64(iv), ct: umschlag.ct }, subKey, _AAD_DEPOT_V2);
        } catch (e) {
          wurf = { name: e.name, meldung: String(e.message).slice(0, 120) };
          ergebnisTyp = 'wirft';
        }
        raus.primitive.push({ fall: f.name, laenge: f.laenge, ergebnisTyp, wurf,
          dauerMs: Math.round((performance.now() - t0) * 100) / 100 });
      }

      // ── Ebene 2: der echte Weg, den die Bürgerin geht ───────────────────
      for (const f of faelle) {
        const iv = new Uint8Array(f.laenge);
        crypto.getRandomValues(iv);
        const kaputt = JSON.parse(JSON.stringify(umschlag));
        kaputt.iv = b64(iv);
        const t0 = performance.now();
        let wurf = null, ergebnisTyp = 'KEIN WURF — Depot geladen';
        try {
          await window.__vdOeffentlich.depotLaden(kaputt, pw);
        } catch (e) {
          wurf = { name: e.name, meldung: String(e.message).slice(0, 160) };
          ergebnisTyp = 'wirft';
        }
        raus.echterWeg.push({ fall: f.name, laenge: f.laenge, ergebnisTyp, wurf,
          dauerMs: Math.round((performance.now() - t0) * 100) / 100 });
      }

      /* ── Ebene 3: scheitert es am TAG oder schon an der PARAMETERPRÜFUNG? ──
         Von aussen sehen beide gleich aus (`OperationError`). Die Trennung
         gelingt nur über die Gegenrichtung: verschlüsselt WebCrypto mit
         derselben abweichenden IV-Länge überhaupt, und öffnet der Container
         dann mit genau dieser IV wieder? Ja heisst: die Länge ist zulässig,
         und der Fehlschlag oben lag am Auth-Tag. Nein heisst: die Länge wird
         gar nicht erst angenommen — dann ist die fehlende Längenprüfung erst
         recht folgenlos, weil WebCrypto sie selbst vornimmt. */
      for (const f of faelle) {
        const iv = new Uint8Array(f.laenge);
        crypto.getRandomValues(iv);
        let schreibt = null, liest = null;
        try {
          const enc = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, subKey, new TextEncoder().encode('probe'));
          schreibt = 'ja';
          try {
            const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, subKey, enc);
            liest = new TextDecoder().decode(dec) === 'probe' ? 'ja' : 'anderer Inhalt';
          } catch (e) { liest = 'nein (' + e.name + ')'; }
        } catch (e) { schreibt = 'nein (' + e.name + ')'; liest = '—'; }
        raus.gegenrichtung = raus.gegenrichtung || [];
        raus.gegenrichtung.push({ fall: f.name, laenge: f.laenge, verschluesselt: schreibt, rundlauf: liest });
      }

      /* ── Ebene 4: derselbe Fall nach dem ZERFALL ────────────────────────
         `depotLaden` verzweigt seit A339 bei `kryptoVersion === 4` nach
         `_zerfallLesen` — der Pfad ist HEUTE erreichbar, nicht erst später.
         Dort trägt jede Einheit ZWEI Angaben aus der Datei, die eine IV
         mitbringen: den gewickelten Inhaltsschlüssel und die Einheit selbst.
         Gemessen wird, ob sich der Fall dort anders verhält. */
      try {
        const v4 = await window.__vdOeffentlich.depotSerialisierenV4();
        raus.zerfall = { erzeugt: true, kryptoVersion: v4.kryptoVersion,
          einheiten: Object.keys(v4.einheiten || {}).length,
          umschlaege: Object.keys(((v4.umschlagTabelle || [])[0] || {}).umschlaege || {}).length };

        // Gegenprobe: unverändert öffnet er.
        try { await window.__vdOeffentlich.depotLaden(JSON.parse(JSON.stringify(v4)), pw); raus.zerfall.unveraendertOeffnet = 'ja'; }
        catch (e) { raus.zerfall.unveraendertOeffnet = 'NEIN — ' + e.name + ': ' + e.message.slice(0, 90); }

        raus.zerfall.faelle = [];
        for (const f of faelle) {
          for (const ziel of ['einheit', 'schluesselumschlag']) {
            const iv = new Uint8Array(f.laenge);
            crypto.getRandomValues(iv);
            const kaputt = JSON.parse(JSON.stringify(v4));
            const adr = Object.keys(kaputt.umschlagTabelle[0].umschlaege)[0];
            if (ziel === 'einheit') kaputt.einheiten[adr].iv = b64(iv);
            else kaputt.umschlagTabelle[0].umschlaege[adr].iv = b64(iv);
            let ergebnisTyp = 'KEIN WURF — Depot geladen', wurf = null;
            try { await window.__vdOeffentlich.depotLaden(kaputt, pw); }
            catch (e) { ergebnisTyp = 'wirft'; wurf = { name: e.name, meldung: String(e.message).slice(0, 90) }; }
            raus.zerfall.faelle.push({ fall: f.name, ziel, ergebnisTyp, wurf });
          }
        }
      } catch (e) {
        raus.zerfall = { erzeugt: false, grund: e.name + ': ' + String(e.message).slice(0, 140) };
      }

      // Lebt die Seite noch?
      raus.seiteLebtNoch = (1 + 1 === 2);
      return raus;
    }, FAELLE);

    // Zweite, unabhängige Lebendprobe NACH dem evaluate.
    let lebt = false;
    try { lebt = await page.evaluate(() => typeof decryptData === 'function'); } catch (_) { lebt = false; }
    ergebnis.seiteNachLaufAnsprechbar = lebt;
    ergebnis.abstuerze = abstuerze;

    if (ALS_JSON) { console.log(JSON.stringify(ergebnis, null, 2)); return; }

    console.log('IV-Länge auf dem Lese-Weg — gemessen am echten Chromium\n');
    console.log('Anker: der geschriebene Umschlag trägt ' + ergebnis.anker.ivLaengeImUmschlag + ' Byte IV.');
    console.log('Anker: mit der ECHTEN IV öffnet das Depot: '
      + (ergebnis.anker.echteIvOeffnet.geoeffnet
        ? 'ja (vorname=' + ergebnis.anker.echteIvOeffnet.vorname + ')'
        : 'NEIN — ' + ergebnis.anker.echteIvOeffnet.fehler));

    for (const [titel, liste] of [['1 · Primitive (decryptData)', ergebnis.primitive],
                                  ['2 · Echter Weg (depotLaden)', ergebnis.echterWeg]]) {
      console.log('\n── ' + titel + ' ──');
      for (const r of liste) {
        console.log('  ' + r.fall.padEnd(38) + r.ergebnisTyp.padEnd(26)
          + (r.wurf ? r.wurf.name + ': ' + r.wurf.meldung : '') + '   [' + r.dauerMs + ' ms]');
      }
    }
    console.log('\n── 3 · Gegenrichtung: nimmt WebCrypto die Länge überhaupt an? ──');
    for (const r of (ergebnis.gegenrichtung || [])) {
      console.log('  ' + r.fall.padEnd(38) + 'verschlüsselt: ' + String(r.verschluesselt).padEnd(22)
        + 'Rundlauf mit derselben IV: ' + r.rundlauf);
    }
    console.log('\n── 4 · Nach dem Zerfall (kryptoVersion 4, Pfad _zerfallLesen) ──');
    const z = ergebnis.zerfall || {};
    if (!z.erzeugt) {
      console.log('  v4-Umschlag nicht erzeugbar: ' + z.grund);
    } else {
      console.log('  v4-Umschlag: ' + z.einheiten + ' Einheiten, ' + z.umschlaege
        + ' Schlüsselumschläge · unverändert öffnet: ' + z.unveraendertOeffnet);
      for (const r of z.faelle) {
        console.log('  ' + r.fall.padEnd(38) + ('IV in ' + r.ziel).padEnd(28) + r.ergebnisTyp
          + (r.wurf ? '  (' + r.wurf.name + ')' : ''));
      }
    }
    console.log('\nSeite nach dem Lauf ansprechbar: ' + (ergebnis.seiteNachLaufAnsprechbar ? 'ja' : 'NEIN'));
    console.log('Abstürze/Seitenfehler beobachtet: '
      + (ergebnis.abstuerze.length ? ergebnis.abstuerze.join(' · ') : 'keine'));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('MESSUNG ABGEBROCHEN:', e); process.exit(2); });
